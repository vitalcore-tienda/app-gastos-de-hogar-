// Operaciones pendientes, aisladas por proyecto, usuario y hogar.
class SaveStatus {
  constructor() {
    this.running = false;
    this.revision = 0;
    this.confirmed = false;
    this.error = false;
    this.methods = {};
    for (const name of ['upsertService', 'deleteService', 'upsertPayment', 'deletePayment',
      'upsertExpense', 'deleteExpense', 'upsertCard', 'deleteCard',
      'upsertCardPayment', 'deleteCardPayment', 'upsertBudget']) {
      this.methods[name] = window.supabaseService[name].bind(window.supabaseService);
      window.supabaseService[name] = (...args) => this.enqueue(name, args);
    }
    window.addEventListener('online', () => this.flush());
    window.addEventListener('offline', () => this.render());
    document.getElementById('retrySaveBtn').addEventListener('click', () => this.flush());
    this.render();
  }
  scope() {
    const s = window.supabaseService;
    return s.currentUser && s.currentHousehold && !s.isLocalMode
      ? [window.SUPABASE_CONFIG.URL, s.currentUser.id, s.currentHousehold.id].join(':') : null;
  }
  read(scope = this.scope()) {
    if (!scope) return [];
    try { return JSON.parse(localStorage.getItem('mihogar_queue:' + scope) || '[]'); }
    catch { this.error = true; return []; }
  }
  write(scope, queue) {
    localStorage.setItem('mihogar_queue:' + scope, JSON.stringify(queue));
  }
  enqueue(method, args) {
    const scope = this.scope();
    if (!scope) { this.render(); return; }
    try {
      const queue = this.read(scope);
      queue.push({ id: crypto.randomUUID(), method, args: JSON.parse(JSON.stringify(args)) });
      this.write(scope, queue);
      this.revision++;
      this.confirmed = false;
      void this.flush();
    } catch {
      this.error = true;
      this.render();
      window.app?.showToast('No se pudo conservar el cambio pendiente. Exportá un respaldo.', 'danger');
    }
  }
  async flush() {
    if (this.running) return;
    const scope = this.scope();
    if (!scope) { this.confirmed = false; this.render(); return; }
    if (this.activeScope !== scope) {
      this.confirmed = false;
      this.activeScope = scope;
    }
    this.error = false;
    this.running = true;
    this.render();
    try {
      while (scope === this.scope()) {
        const operation = this.read(scope)[0];
        if (!operation || !navigator.onLine) break;
        if (!this.methods[operation.method]) throw new Error('Operación desconocida');
        await this.methods[operation.method](...operation.args);
        this.write(scope, this.read(scope).filter(item => item.id !== operation.id));
        this.confirmed = true;
      }
    } catch (error) {
      this.error = true;
      console.error('Cambio pendiente de guardar:', error);
    } finally {
      this.running = false;
      this.render();
    }
    if (scope === this.scope() && !this.read().length && !this.error) {
      await window.store?.syncWithSupabase(window.supabaseService.currentHousehold.id);
      window.app?.refreshAll();
    }
  }
  render() {
    const element = document.getElementById('saveStatus');
    const retry = document.getElementById('retrySaveBtn');
    if (!element) return;
    const count = this.read().length;
    element.textContent = !this.scope() ? 'Solo en este dispositivo'
      : this.running && count ? 'Guardando en la nube…'
      : count ? count + ' cambio(s) pendiente(s)' + (navigator.onLine ? '' : ' · Sin conexión')
      : this.error ? 'No se pudo confirmar el guardado'
      : this.confirmed ? 'Guardado en la nube' : 'Conectado al hogar';
    retry.hidden = !count && !this.error;
    retry.disabled = this.running || !navigator.onLine;
  }
}
window.saveStatus = new SaveStatus();
