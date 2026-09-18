const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const values = new Map();
const elements = new Map();
let fail = true;
const calls = [];
const service = { currentUser: { id: 'u1' }, currentHousehold: { id: 'h1' } };
for (const name of ['upsertService', 'deleteService', 'upsertPayment', 'deletePayment',
  'upsertExpense', 'deleteExpense', 'upsertCard', 'deleteCard', 'upsertCardPayment', 'deleteCardPayment', 'upsertBudget']) {
  service[name] = async (...args) => {
    if (fail) throw Error('network');
    calls.push([name, args]);
  };
}
const context = {
  console: { ...console, error() {} }, crypto: require('node:crypto'),
  navigator: { onLine: false },
  localStorage: { getItem: k => values.get(k) || null, setItem: (k,v) => values.set(k,v) },
  document: { getElementById(id) {
    if (!elements.has(id)) elements.set(id, { addEventListener() {} });
    return elements.get(id);
  } },
  window: { supabaseService: service, SUPABASE_CONFIG: { URL: 'project1' }, addEventListener() {} }
};
vm.createContext(context);
vm.runInContext(readFileSync('js/store.js', 'utf8'), context);
context.window.store.syncWithSupabase = async () => true;
vm.runInContext(readFileSync('js/save-status.js', 'utf8'), context);
(async () => {
  const status = context.window.saveStatus;
  const store = context.window.store;
  const original = { id: 'test', title: 'Comida', amount: 42, date: '2026-09-18', paidBy: 'Uno' };
  store.expenses = [original];
  assert.equal(store.deleteExpense('test'), true);
  assert.equal(store.expenses.length, 0);
  assert.equal(store.getExpenseTrash().length, 1);
  assert.equal(store.restoreExpense('test'), true);
  assert.equal(store.expenses[0].amount, 42);
  assert.equal(store.expenses[0].date, '2026-09-18');
  assert.equal(store.getExpenseTrash().length, 0);
  assert.equal(status.read().length, 2);
  context.navigator.onLine = true;
  await status.flush();
  assert.equal(status.read().length, 2, 'fallo conserva las operaciones');
  assert.equal(status.error, true);
  fail = false;
  await status.flush();
  assert.equal(status.read().length, 0);
  assert.deepEqual(calls.map(c => c[0]), ['deleteExpense', 'upsertExpense']);
  assert.equal(elements.get('saveStatus').textContent, 'Guardado en la nube');
  context.navigator.onLine = false;
  service.upsertExpense(original);
  service.currentHousehold = { id: 'h2' };
  assert.equal(status.read().length, 0, 'aislamiento entre hogares');
  service.currentHousehold = { id: 'h1' };
  vm.runInContext(readFileSync('js/save-status.js', 'utf8').replace('class SaveStatus', 'class ReloadedStatus').replace('new SaveStatus()', 'new ReloadedStatus()'), context);
  assert.equal(context.window.saveStatus.read().length, 1, 'pendientes sobreviven recarga');
  console.log('OK: fallo, reintento, orden borrar/restaurar, persistencia y aislamiento.');
})().catch(error => { console.error(error); process.exitCode = 1; });
