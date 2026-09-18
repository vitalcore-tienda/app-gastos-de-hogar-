/**
 * STORE.JS - Capa de almacenamiento y gestión de estado (LocalStorage)
 */

const STORAGE_KEYS = {
  SERVICES: 'mihogar_services_v1',
  PAYMENTS: 'mihogar_payments_v1',
  EXPENSES: 'mihogar_expenses_v1',
  CARDS: 'mihogar_cards_v1',
  CARD_PAYMENTS: 'mihogar_card_payments_v1',
  BUDGETS: 'mihogar_budgets_v1',
  SETTINGS: 'mihogar_settings_v1'
};

// Datos de ejemplo para primera carga
const DEFAULT_SAMPLE_SERVICES = [
  {
    id: 'srv_1',
    name: 'Luz (Electricidad)',
    category: 'Luz',
    provider: 'Edesur / Edenor',
    dueDay: 10,
    defaultAmount: 18500,
    clientCode: '94820192',
    notes: 'Código de pago electrónico en Link / Banelco',
    autoDebit: false
  },
  {
    id: 'srv_2',
    name: 'Gas Natural',
    category: 'Gas',
    provider: 'Metrogas / Naturgy',
    dueDay: 14,
    defaultAmount: 9200,
    clientCode: '30291048',
    notes: 'Pagar con débito en la web de la empresa o PagoFácil',
    autoDebit: false
  },
  {
    id: 'srv_3',
    name: 'Agua Corriente',
    category: 'Agua',
    provider: 'AySA',
    dueDay: 18,
    defaultAmount: 6800,
    clientCode: '5829104',
    notes: 'Bimestral / Mensual',
    autoDebit: false
  },
  {
    id: 'srv_4',
    name: 'Internet + TV Cable',
    category: 'Internet',
    provider: 'Personal Flow / Movistar',
    dueDay: 8,
    defaultAmount: 26500,
    clientCode: '10928419',
    notes: 'Adherido a débito automático en tarjeta Visa',
    autoDebit: true
  },
  {
    id: 'srv_5',
    name: 'Teléfono Celular',
    category: 'Celular',
    provider: 'Personal / Claro / Movistar',
    dueDay: 20,
    defaultAmount: 12000,
    clientCode: '1154920192',
    notes: 'Línea de papá y mamá',
    autoDebit: false
  },
  {
    id: 'srv_6',
    name: 'Expensas / ABL Municipal',
    category: 'Expensas',
    provider: 'Administración Edificio',
    dueDay: 12,
    defaultAmount: 38000,
    clientCode: 'Dpto 3ºB',
    notes: 'Transferir a la cuenta de la administración',
    autoDebit: false
  },
  {
    id: 'srv_7',
    name: 'Seguro de Casa y Auto',
    category: 'Seguros',
    provider: 'La Caja / San Cristóbal',
    dueDay: 5,
    defaultAmount: 14500,
    clientCode: 'Póliza #8291048',
    notes: 'Débito automático en cuenta bancaria',
    autoDebit: true
  }
];

const DEFAULT_SAMPLE_CARDS = [
  {
    id: 'crd_1',
    cardName: 'Visa Galicia',
    cardBrand: 'Visa',
    description: 'Heladera No Frost Samsung',
    totalAmount: 360000,
    installmentAmount: 30000,
    totalInstallments: 12,
    startYearMonth: '2026-05',
    dueDay: 7,
    category: 'Electrodomésticos',
    notes: 'Comprado en 12 cuotas fijas'
  },
  {
    id: 'crd_2',
    cardName: 'Mastercard BBVA',
    cardBrand: 'Mastercard',
    description: 'Zapatillas deportivas para los chicos',
    totalAmount: 75000,
    installmentAmount: 25000,
    totalInstallments: 3,
    startYearMonth: '2026-07',
    dueDay: 15,
    category: 'Indumentaria',
    notes: 'Promo Banco 3 cuotas sin interés'
  },
  {
    id: 'crd_3',
    cardName: 'Naranja X',
    cardBrand: 'Naranja',
    description: 'Pintura y arreglos para la casa',
    totalAmount: 120000,
    installmentAmount: 20000,
    totalInstallments: 6,
    startYearMonth: '2026-06',
    dueDay: 10,
    category: 'Hogar',
    notes: 'Plan Z / 6 cuotas'
  }
];

class AppStore {
  constructor() {
    this.services = this.load(STORAGE_KEYS.SERVICES, null);
    this.payments = this.load(STORAGE_KEYS.PAYMENTS, {});
    this.expenses = this.load(STORAGE_KEYS.EXPENSES, []);
    this.cards = this.load(STORAGE_KEYS.CARDS, null);
    this.cardPayments = this.load(STORAGE_KEYS.CARD_PAYMENTS, {});
    this.budgets = this.load(STORAGE_KEYS.BUDGETS, { defaultMonthly: 450000 });
    this.settings = this.load(STORAGE_KEYS.SETTINGS, { theme: 'light' });

    // Si es la primera vez que abre la app, precargar datos de ejemplo
    if (!this.services) {
      this.loadSampleData();
    }
  }

  load(key, defaultValue) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch (e) {
      console.error('Error cargando clave:', key, e);
      return defaultValue;
    }
  }

  save(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('Error guardando clave:', key, e);
      return false;
    }
  }

  loadSampleData() {
    this.services = [...DEFAULT_SAMPLE_SERVICES];
    this.save(STORAGE_KEYS.SERVICES, this.services);
    
    this.cards = [...DEFAULT_SAMPLE_CARDS];
    this.save(STORAGE_KEYS.CARDS, this.cards);
    
    // Gastos de ejemplo para el mes actual
    const today = new Date();
    const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    
    this.expenses = [
      {
        id: 'exp_1',
        title: 'Compra semanal supermercado',
        category: 'Supermercado',
        amount: 34500,
        date: `${currentMonthKey}-03`,
        notes: 'Verdulería, carnicería y almacén',
        paidBy: 'Papá',
        yearMonth: currentMonthKey
      },
      {
        id: 'exp_2',
        title: 'Medicamentos y farmacia',
        category: 'Farmacia',
        amount: 12800,
        date: `${currentMonthKey}-06`,
        notes: 'Remedios con descuento PAMI/Obra Social',
        paidBy: 'Mamá',
        yearMonth: currentMonthKey
      },
      {
        id: 'exp_3',
        title: 'Reparación cerrajería / puerta',
        category: 'Mantenimiento',
        amount: 9500,
        date: `${currentMonthKey}-11`,
        notes: 'Cambio de cerradura principal',
        paidBy: 'Yo',
        yearMonth: currentMonthKey
      }
    ];
    this.save(STORAGE_KEYS.EXPENSES, this.expenses);

    // Marcar algunos servicios como pagados para demostración
    this.payments[`srv_7_${currentMonthKey}`] = {
      paid: true,
      paidAmount: 14500,
      paidDate: `${currentMonthKey}-05`,
      method: 'Débito Automático',
      receiptNote: 'Debitado automáticamente'
    };
    this.payments[`srv_4_${currentMonthKey}`] = {
      paid: true,
      paidAmount: 26500,
      paidDate: `${currentMonthKey}-08`,
      method: 'Débito Automático',
      receiptNote: 'Debitado automáticamente'
    };
    this.save(STORAGE_KEYS.PAYMENTS, this.payments);

    // Marcar pago de una tarjeta en el mes actual para demo
    this.cardPayments[`crd_1_${currentMonthKey}`] = {
      paid: true,
      paidAmount: 30000,
      paidDate: `${currentMonthKey}-07`,
      method: 'Débito en Cuenta Bancaria',
      receiptNote: 'Pago de resumen Galicia'
    };
    this.save(STORAGE_KEYS.CARD_PAYMENTS, this.cardPayments);
  }

  // ==================== SERVICIOS ====================

  getServices() {
    return [...this.services];
  }

  getServiceById(id) {
    return this.services.find(s => s.id === id);
  }

  saveService(serviceData) {
    if (serviceData.id) {
      const idx = this.services.findIndex(s => s.id === serviceData.id);
      if (idx !== -1) {
        this.services[idx] = { ...this.services[idx], ...serviceData };
      }
    } else {
      const newService = {
        id: 'srv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        ...serviceData
      };
      this.services.push(newService);
    }
    this.save(STORAGE_KEYS.SERVICES, this.services);
    if (window.supabaseService) {
      const srv = serviceData.id ? this.getServiceById(serviceData.id) : this.services[this.services.length - 1];
      if (srv) window.supabaseService.upsertService(srv);
    }
    return true;
  }

  deleteService(id) {
    this.services = this.services.filter(s => s.id !== id);
    this.save(STORAGE_KEYS.SERVICES, this.services);
    if (window.supabaseService) {
      window.supabaseService.deleteService(id);
    }
    return true;
  }

  // ==================== PAGOS DE SERVICIOS ====================

  getPaymentKey(serviceId, yearMonth) {
    return `${serviceId}_${yearMonth}`;
  }

  getPayment(serviceId, yearMonth) {
    const key = this.getPaymentKey(serviceId, yearMonth);
    return this.payments[key] || null;
  }

  recordPayment(serviceId, yearMonth, paymentDetails) {
    const key = this.getPaymentKey(serviceId, yearMonth);
    this.payments[key] = {
      paid: true,
      paidAmount: Number(paymentDetails.paidAmount),
      paidDate: paymentDetails.paidDate,
      method: paymentDetails.method || 'Transferencia',
      receiptNote: paymentDetails.receiptNote || ''
    };
    this.save(STORAGE_KEYS.PAYMENTS, this.payments);
    if (window.supabaseService) {
      window.supabaseService.upsertPayment(serviceId, yearMonth, this.payments[key]);
    }
  }

  removePayment(serviceId, yearMonth) {
    const key = this.getPaymentKey(serviceId, yearMonth);
    if (this.payments[key]) {
      delete this.payments[key];
      this.save(STORAGE_KEYS.PAYMENTS, this.payments);
      if (window.supabaseService) {
        window.supabaseService.deletePayment(serviceId, yearMonth);
      }
    }
  }

  // ==================== GASTOS COTIDIANOS ====================

  getExpenses(yearMonth = null) {
    if (yearMonth) {
      return this.expenses.filter(e => e.yearMonth === yearMonth || e.date.startsWith(yearMonth));
    }
    return [...this.expenses];
  }

  saveExpense(expenseData) {
    const dateObj = new Date(expenseData.date);
    const yearMonth = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
    const paidBy = expenseData.paidBy || 'Yo';

    if (expenseData.id) {
      const idx = this.expenses.findIndex(e => e.id === expenseData.id);
      if (idx !== -1) {
        this.expenses[idx] = {
          ...this.expenses[idx],
          ...expenseData,
          amount: Number(expenseData.amount),
          paidBy,
          yearMonth
        };
      }
    } else {
      const newExpense = {
        id: 'exp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        ...expenseData,
        amount: Number(expenseData.amount),
        paidBy,
        yearMonth
      };
      this.expenses.unshift(newExpense);
    }
    this.save(STORAGE_KEYS.EXPENSES, this.expenses);
    if (window.supabaseService) {
      const exp = expenseData.id ? this.expenses.find(e => e.id === expenseData.id) : this.expenses[0];
      if (exp) window.supabaseService.upsertExpense(exp);
    }
    return true;
  }

  deleteExpense(id) {
    const expense = this.expenses.find(e => e.id === id);
    if (!expense) return false;
    try {
      const trash = this.getExpenseTrash().filter(item => item.expense.id !== id);
      localStorage.setItem(this.expenseTrashKey(), JSON.stringify([{ expense, deletedAt: new Date().toISOString() }, ...trash]));
    } catch {
      window.app?.showToast('No se pudo guardar una copia recuperable. El gasto no se eliminó.', 'danger');
      return false;
    }
    this.expenses = this.expenses.filter(e => e.id !== id);
    this.save(STORAGE_KEYS.EXPENSES, this.expenses);
    if (window.supabaseService) {
      window.supabaseService.deleteExpense(id);
    }
    return true;
  }

  getExpensesByMember(yearMonth = null) {
    const expenses = this.getExpenses(yearMonth);
    const memberMap = {};
    let total = 0;

    expenses.forEach(e => {
      const member = (e.paidBy && e.paidBy.trim()) || 'No asignado';
      const amt = Number(e.amount || 0);
      total += amt;
      if (!memberMap[member]) {
        memberMap[member] = { name: member, total: 0, count: 0 };
      }
      memberMap[member].total += amt;
      memberMap[member].count += 1;
    });

    const list = Object.values(memberMap).sort((a, b) => b.total - a.total);
    return {
      members: list,
      grandTotal: total
    };
  }

  // ==================== TARJETAS DE CRÉDITO Y CUOTAS ====================

  getCards() {
    return [...(this.cards || [])];
  }

  getCardById(id) {
    return (this.cards || []).find(c => c.id === id);
  }

  saveCard(cardData) {
    if (!this.cards) this.cards = [];

    const totalAmount = Number(cardData.totalAmount || 0);
    const totalInstallments = Number(cardData.totalInstallments || 1);
    const installmentAmount = Number(cardData.installmentAmount || (totalAmount / totalInstallments));

    const processedData = {
      ...cardData,
      totalAmount,
      totalInstallments,
      installmentAmount,
      dueDay: Number(cardData.dueDay || 10)
    };

    if (processedData.id) {
      const idx = this.cards.findIndex(c => c.id === processedData.id);
      if (idx !== -1) {
        this.cards[idx] = { ...this.cards[idx], ...processedData };
      }
    } else {
      const newCard = {
        id: 'crd_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        ...processedData
      };
      this.cards.unshift(newCard);
    }
    this.save(STORAGE_KEYS.CARDS, this.cards);
    if (window.supabaseService) {
      const crd = cardData.id ? this.getCardById(cardData.id) : this.cards[0];
      if (crd) window.supabaseService.upsertCard(crd);
    }
    return true;
  }

  deleteCard(id) {
    this.cards = (this.cards || []).filter(c => c.id !== id);
    this.save(STORAGE_KEYS.CARDS, this.cards);

    // Limpiar pagos asociados
    if (this.cardPayments) {
      Object.keys(this.cardPayments).forEach(k => {
        if (k.startsWith(`${id}_`)) {
          delete this.cardPayments[k];
        }
      });
      this.save(STORAGE_KEYS.CARD_PAYMENTS, this.cardPayments);
    }
    if (window.supabaseService) {
      window.supabaseService.deleteCard(id);
    }
    return true;
  }

  getCardPaymentKey(cardId, yearMonth) {
    return `${cardId}_${yearMonth}`;
  }

  getCardPayment(cardId, yearMonth) {
    const key = this.getCardPaymentKey(cardId, yearMonth);
    return (this.cardPayments && this.cardPayments[key]) ? this.cardPayments[key] : null;
  }

  recordCardPayment(cardId, yearMonth, paymentDetails) {
    if (!this.cardPayments) this.cardPayments = {};
    const key = this.getCardPaymentKey(cardId, yearMonth);
    this.cardPayments[key] = {
      paid: true,
      paidAmount: Number(paymentDetails.paidAmount),
      paidDate: paymentDetails.paidDate,
      method: paymentDetails.method || 'Tarjeta / Débito en Cuenta',
      receiptNote: paymentDetails.receiptNote || ''
    };
    this.save(STORAGE_KEYS.CARD_PAYMENTS, this.cardPayments);
    if (window.supabaseService) {
      window.supabaseService.upsertCardPayment(cardId, yearMonth, this.cardPayments[key]);
    }
  }

  removeCardPayment(cardId, yearMonth) {
    if (!this.cardPayments) return;
    const key = this.getCardPaymentKey(cardId, yearMonth);
    if (this.cardPayments[key]) {
      delete this.cardPayments[key];
      this.save(STORAGE_KEYS.CARD_PAYMENTS, this.cardPayments);
      if (window.supabaseService) {
        window.supabaseService.deleteCardPayment(cardId, yearMonth);
      }
    }
  }

  getCardInstallmentInfo(card, yearMonth) {
    if (!card || !card.startYearMonth) {
      return {
        status: 'unknown',
        currentNumber: 1,
        total: 1,
        amount: Number(card.installmentAmount || 0),
        isPaid: false
      };
    }

    const [startYear, startMonth] = card.startYearMonth.split('-').map(Number);
    const [currYear, currMonth] = yearMonth.split('-').map(Number);
    const monthDiff = (currYear - startYear) * 12 + (currMonth - startMonth);
    const totalInst = Number(card.totalInstallments || 1);
    const instAmt = Number(card.installmentAmount || (card.totalAmount / totalInst));

    const payment = this.getCardPayment(card.id, yearMonth);
    const isPaid = !!(payment && payment.paid);

    if (monthDiff < 0) {
      return {
        status: 'future',
        statusLabel: `Inicia en ${Math.abs(monthDiff)} mes(es)`,
        currentNumber: 0,
        total: totalInst,
        amount: instAmt,
        isPaid: false,
        payment: null,
        progressPct: 0,
        remainingInstallments: totalInst
      };
    } else if (monthDiff >= totalInst) {
      return {
        status: 'finished',
        statusLabel: 'Finalizada (Completada)',
        currentNumber: totalInst,
        total: totalInst,
        amount: instAmt,
        isPaid: true,
        payment: null,
        progressPct: 100,
        remainingInstallments: 0
      };
    } else {
      const currentNumber = monthDiff + 1;
      const progressPct = Math.round((currentNumber / totalInst) * 100);
      const remainingInstallments = totalInst - currentNumber;

      return {
        status: 'active',
        statusLabel: `Cuota ${currentNumber} de ${totalInst}`,
        currentNumber,
        total: totalInst,
        amount: instAmt,
        isPaid,
        payment,
        progressPct,
        remainingInstallments
      };
    }
  }

  getCardsForMonth(yearMonth) {
    const allCards = this.getCards();
    return allCards.map(card => {
      const info = this.getCardInstallmentInfo(card, yearMonth);
      return {
        ...card,
        installmentInfo: info
      };
    });
  }

  getCardsSummary(yearMonth) {
    const cardsForMonth = this.getCardsForMonth(yearMonth);
    const activeThisMonth = cardsForMonth.filter(c => c.installmentInfo.status === 'active');

    let totalMonthAmount = 0;
    let paidAmount = 0;
    let pendingAmount = 0;
    let paidCount = 0;
    let pendingCount = 0;

    activeThisMonth.forEach(c => {
      const amt = c.installmentInfo.amount;
      totalMonthAmount += amt;
      if (c.installmentInfo.isPaid) {
        paidAmount += amt;
        paidCount++;
      } else {
        pendingAmount += amt;
        pendingCount++;
      }
    });

    // Calcular deuda futura restante de todas las compras activas
    let totalFutureDebt = 0;
    cardsForMonth.forEach(c => {
      if (c.installmentInfo.status === 'active') {
        const remaining = c.installmentInfo.remainingInstallments;
        // Si la cuota actual está impaga, se suma también
        const pendingCurrent = c.installmentInfo.isPaid ? 0 : 1;
        totalFutureDebt += (remaining + pendingCurrent) * c.installmentInfo.amount;
      } else if (c.installmentInfo.status === 'future') {
        totalFutureDebt += c.totalAmount;
      }
    });

    return {
      activeCards: activeThisMonth,
      allCards: cardsForMonth,
      totalMonthAmount,
      paidAmount,
      pendingAmount,
      paidCount,
      pendingCount,
      activeCount: activeThisMonth.length,
      totalFutureDebt
    };
  }

  // ==================== PRESUPUESTO MENSUAL ====================

  getBudget(yearMonth) {
    if (!this.budgets) this.budgets = { defaultMonthly: 450000 };
    if (this.budgets[yearMonth] !== undefined && this.budgets[yearMonth] !== null) {
      return Number(this.budgets[yearMonth]);
    }
    return Number(this.budgets.defaultMonthly || 450000);
  }

  setBudget(yearMonth, amount, applyToAll = false) {
    if (!this.budgets) this.budgets = { defaultMonthly: 450000 };
    const numericAmount = Math.max(0, Number(amount) || 0);

    this.budgets[yearMonth] = numericAmount;
    if (applyToAll) {
      this.budgets.defaultMonthly = numericAmount;
    }
    this.save(STORAGE_KEYS.BUDGETS, this.budgets);
    if (window.supabaseService) {
      window.supabaseService.upsertBudget(yearMonth, numericAmount, applyToAll);
    }
    return true;
  }

  // Sincronizar todos los datos desde Supabase para el hogar activo
  async syncWithSupabase(householdId) {
    if (!window.supabaseService || !householdId) return false;
    const status = window.saveStatus;
    if (status?.read().length || status?.running || status?.error) return false;
    const revision = status?.revision;

    const data = await window.supabaseService.fetchHouseholdData(householdId);
    if (!data) return false;
    if (window.supabaseService.currentHousehold?.id !== householdId ||
        status?.read().length || status?.running || status?.revision !== revision) return false;

    this.services = data.services;
    this.payments = data.payments;
    this.expenses = data.expenses;
    this.cards = data.cards;
    this.cardPayments = data.cardPayments;
    this.budgets = data.budgets;

    this.save(STORAGE_KEYS.SERVICES, this.services);
    this.save(STORAGE_KEYS.PAYMENTS, this.payments);
    this.save(STORAGE_KEYS.EXPENSES, this.expenses);
    this.save(STORAGE_KEYS.CARDS, this.cards);
    this.save(STORAGE_KEYS.CARD_PAYMENTS, this.cardPayments);
    this.save(STORAGE_KEYS.BUDGETS, this.budgets);

    return true;
  }

  expenseTrashKey() {
    return 'mihogar_expense_trash:' + (window.saveStatus?.scope() || 'local');
  }

  getExpenseTrash() {
    return this.load(this.expenseTrashKey(), []);
  }

  restoreExpense(id) {
    const trash = this.getExpenseTrash();
    const item = trash.find(entry => entry.expense.id === id);
    if (!item || this.expenses.some(expense => expense.id === id)) return false;
    const restored = [item.expense, ...this.expenses];
    if (!this.save(STORAGE_KEYS.EXPENSES, restored)) {
      window.app?.showToast('No hay espacio para restaurar el gasto. Sigue en la papelera.', 'danger');
      return false;
    }
    this.expenses = restored;
    window.supabaseService?.upsertExpense(item.expense);
    this.save(this.expenseTrashKey(), trash.filter(entry => entry !== item));
    return true;
  }

  // ==================== IMPORTACIÓN / EXPORTACIÓN ====================

  exportDataJson() {
    const data = {
      version: '1.2',
      exportDate: new Date().toISOString(),
      services: this.services,
      payments: this.payments,
      expenses: this.expenses,
      cards: this.cards,
      cardPayments: this.cardPayments,
      budgets: this.budgets,
      settings: this.settings
    };
    return JSON.stringify(data, null, 2);
  }

  importDataJson(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.services && Array.isArray(parsed.services)) {
        this.services = parsed.services;
        this.save(STORAGE_KEYS.SERVICES, this.services);
      }
      if (parsed.payments && typeof parsed.payments === 'object') {
        this.payments = parsed.payments;
        this.save(STORAGE_KEYS.PAYMENTS, this.payments);
      }
      if (parsed.expenses && Array.isArray(parsed.expenses)) {
        this.expenses = parsed.expenses;
        this.save(STORAGE_KEYS.EXPENSES, this.expenses);
      }
      if (parsed.cards && Array.isArray(parsed.cards)) {
        this.cards = parsed.cards;
        this.save(STORAGE_KEYS.CARDS, this.cards);
      }
      if (parsed.cardPayments && typeof parsed.cardPayments === 'object') {
        this.cardPayments = parsed.cardPayments;
        this.save(STORAGE_KEYS.CARD_PAYMENTS, this.cardPayments);
      }
      if (parsed.budgets && typeof parsed.budgets === 'object') {
        this.budgets = parsed.budgets;
        this.save(STORAGE_KEYS.BUDGETS, this.budgets);
      }
      return true;
    } catch (e) {
      console.error('Error importando datos:', e);
      return false;
    }
  }

  exportMonthCsv(yearMonth) {
    const lines = [];
    lines.push('TIPO,CONCEPTO / SERVICIO,CATEGORÍA,ESTADO,FECHA / VENCIMIENTO,MONTO,MEDIO DE PAGO / NOTAS');

    // Servicios del mes
    this.services.forEach(srv => {
      const payment = this.getPayment(srv.id, yearMonth);
      const isPaid = !!payment;
      const amount = isPaid ? payment.paidAmount : srv.defaultAmount;
      const date = isPaid ? payment.paidDate : `Día ${srv.dueDay}`;
      const status = isPaid ? 'PAGADO' : 'PENDIENTE';
      const notes = isPaid ? `${payment.method} - ${payment.receiptNote}` : (srv.clientCode ? `Cód: ${srv.clientCode}` : '');
      
      lines.push(`"Servicio","${srv.name}","${srv.category}","${status}","${date}","${amount}","${notes}"`);
    });

    // Cuotas de Tarjetas del mes
    const cardsSummary = this.getCardsSummary(yearMonth);
    cardsSummary.activeCards.forEach(c => {
      const isPaid = c.installmentInfo.isPaid;
      const status = isPaid ? 'PAGADO' : 'PENDIENTE';
      const date = isPaid && c.installmentInfo.payment ? c.installmentInfo.payment.paidDate : `Día ${c.dueDay}`;
      const notes = `${c.cardName} (${c.installmentInfo.statusLabel}) - ${c.notes || ''}`;
      lines.push(`"Tarjeta / Cuota","${c.description}","${c.category || 'Tarjeta'}","${status}","${date}","${c.installmentInfo.amount}","${notes}"`);
    });

    // Gastos del mes
    const monthExpenses = this.getExpenses(yearMonth);
    monthExpenses.forEach(exp => {
      lines.push(`"Gasto Diario","${exp.title}","${exp.category}","PAGADO","${exp.date}","${exp.amount}","${exp.notes || ''}"`);
    });

    return '\uFEFF' + lines.join('\n'); // Con BOM para que Excel respete los acentos
  }
}

// Instancia global
window.store = new AppStore();
