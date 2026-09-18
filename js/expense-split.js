// Todos los cálculos monetarios se realizan en centavos.
window.expenseSplit = {
  build(amount, mode, rows) {
    const total = Math.round(Number(amount) * 100);
    if (!Number.isSafeInteger(total) || total <= 0) throw Error('Ingresá un importe mayor que cero.');
    if (!['equal', 'percent', 'amount'].includes(mode)) throw Error('Elegí cómo repartir el gasto.');
    const participants = rows.filter(row => row.selected).map(row => ({
      name: String(row.name || '').trim(),
      value: mode === 'equal' ? 1 : Number(row.value)
    }));
    if (!participants.length) throw Error('Elegí al menos una persona para el reparto.');
    const names = participants.map(row => row.name.toLowerCase());
    if (participants.some(row => !row.name) || new Set(names).size !== names.length)
      throw Error('Cada participante debe tener un nombre diferente.');
    if (participants.some(row => !Number.isFinite(row.value) || row.value < 0))
      throw Error('Los valores del reparto deben ser números positivos o cero.');
    const weights = participants.map(row => mode === 'equal' ? 1 : Math.round(row.value * 100));
    const sum = weights.reduce((a, b) => a + b, 0);
    if (mode === 'amount' && sum !== total) throw Error('Los montos deben sumar exactamente el total del gasto.');
    if (mode === 'percent' && sum !== 10000) throw Error('Los porcentajes deben sumar 100%.');
    const exact = weights.map(weight => total * weight / sum);
    const cents = mode === 'amount' ? weights : exact.map(Math.floor);
    if (mode !== 'amount') {
      const order = exact.map((value, index) => ({ index, remainder: value - cents[index] }))
        .sort((a, b) => b.remainder - a.remainder || a.index - b.index);
      const remaining = total - cents.reduce((a, b) => a + b, 0);
      for (let i = 0; i < remaining; i++) cents[order[i].index]++;
    }
    return { version: 1, mode, participants: participants.map((row, i) => ({ ...row, cents: cents[i] })) };
  },

  open(saved = null) {
    const mode = document.getElementById('expenseSplitMode');
    const list = document.getElementById('expenseSplitRows');
    mode.value = saved?.mode || 'equal';
    list.replaceChildren();
    const options = [...document.getElementById('expensePaidBySelect').options]
      .filter(option => option.value !== 'custom').map(option => option.value);
    const names = [...new Set([...options, ...(saved?.participants || []).map(row => row.name)])];
    for (const name of names) {
      const old = saved?.participants.find(row => row.name === name);
      this.addRow(name, old ? old.value : '', saved ? Boolean(old) : true);
    }
    mode.onchange = () => this.preview();
    document.getElementById('expenseAmount').addEventListener('input', this.preview);
    document.getElementById('addSplitPerson').onclick = () => {
      const input = document.getElementById('splitPersonName');
      const name = input.value.trim();
      if (!name) return;
      const existing = [...list.querySelectorAll('[data-name]')].some(row => row.dataset.name.toLowerCase() === name.toLowerCase());
      if (!existing) this.addRow(name, '', true);
      input.value = '';
      this.preview();
    };
    this.preview();
  },

  addRow(name, value, selected) {
    const row = document.createElement('div');
    row.className = 'split-person';
    row.dataset.name = name;
    const label = document.createElement('label');
    const check = document.createElement('input');
    check.type = 'checkbox';
    check.checked = selected;
    check.addEventListener('change', this.preview);
    label.append(check, document.createTextNode(name));
    const input = document.createElement('input');
    input.type = 'number';
    input.min = '0';
    input.step = '0.01';
    input.value = value;
    input.setAttribute('aria-label', 'Parte de ' + name);
    input.addEventListener('input', this.preview);
    row.append(label, input);
    document.getElementById('expenseSplitRows').append(row);
  },

  read() {
    return this.build(document.getElementById('expenseAmount').value,
      document.getElementById('expenseSplitMode').value,
      [...document.querySelectorAll('#expenseSplitRows .split-person')].map(row => ({
        name: row.dataset.name, selected: row.querySelector('[type=checkbox]').checked,
        value: row.querySelector('[type=number]').value
      })));
  },

  preview() {
    const mode = document.getElementById('expenseSplitMode').value;
    document.querySelectorAll('#expenseSplitRows .split-person').forEach(row => {
      const input = row.querySelector('[type=number]');
      input.hidden = mode === 'equal';
      input.disabled = !row.querySelector('[type=checkbox]').checked || mode === 'equal';
      input.placeholder = mode === 'percent' ? '%' : '$';
    });
    const output = document.getElementById('expenseSplitPreview');
    try {
      const split = window.expenseSplit.read();
      output.textContent = split.participants.map(p => p.name + ': $' + (p.cents / 100).toLocaleString('es-AR')).join(' · ');
    } catch (error) { output.textContent = error.message; }
  }
};
