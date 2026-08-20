/**
 * APP.JS - Controlador Principal de la Aplicación
 */

const MONTH_NAMES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

class AppController {
  constructor() {
    const today = new Date();
    this.currentYear = today.getFullYear();
    this.currentMonth = today.getMonth() + 1; // 1-12

    this.activeTab = 'services';
    this.authMode = 'login'; // 'login' o 'register'
    this.lastFocusedElement = null;
  }

  get yearMonthKey() {
    return `${this.currentYear}-${String(this.currentMonth).padStart(2, '0')}`;
  }

  async init() {
    this.initTheme();
    this.bindEvents();
    this.updateMonthDisplay();
    this.refreshAll();
    await this.initAuth();
  }

  // ==================== AUTENTICACIÓN Y HOGARES (SUPABASE) ====================

  async initAuth() {
    if (!window.supabaseService) return;

    const session = await window.supabaseService.getSession();
    const user = session ? session.user : null;

    const userProfileChip = document.getElementById('userProfileChip');
    const openAuthBtn = document.getElementById('openAuthModalBtn');
    const houseBadge = document.getElementById('headerHouseholdBadge');

    if (user) {
      // Usuario autenticado
      if (openAuthBtn) openAuthBtn.style.display = 'none';
      if (userProfileChip) {
        userProfileChip.style.display = 'flex';
        const emailLabel = document.getElementById('userEmailLabel');
        const initialLabel = document.getElementById('userAvatarInitial');
        const displayName = user.user_metadata?.full_name || user.email || 'Usuario';
        if (emailLabel) emailLabel.textContent = displayName;
        if (initialLabel) initialLabel.textContent = displayName.charAt(0).toUpperCase();
      }

      // Verificar si el usuario tiene un hogar asignado
      const household = await window.supabaseService.getUserHousehold(user.id);
      if (household) {
        // Hogar activo
        if (houseBadge) {
          houseBadge.style.display = 'flex';
          const nameEl = document.getElementById('headerHouseName');
          const codeEl = document.getElementById('headerInviteCodeTag');
          if (nameEl) nameEl.textContent = household.name;
          if (codeEl) codeEl.textContent = household.invite_code;
        }
        
        // Sincronizar datos de la nube con la app
        await window.store.syncWithSupabase(household.id);
        this.refreshAll();
        this.closeAllModals();

        // Iniciar suscripción en tiempo real (Supabase Realtime)
        window.supabaseService.subscribeToHouseholdChanges(household.id, async (payload) => {
          console.log('⚡ Evento en tiempo real recibido:', payload);
          await window.store.syncWithSupabase(household.id);
          this.refreshAll();
          this.showToast('⚡ Datos del hogar sincronizados en tiempo real', 'info');
        });
      } else {
        // Usuario logueado pero sin hogar creado ni unido
        if (houseBadge) houseBadge.style.display = 'none';
        window.supabaseService.unsubscribeRealtime();
        this.openModal('householdModal');
      }
    } else {
      // No logueado
      if (openAuthBtn) openAuthBtn.style.display = 'inline-flex';
      if (userProfileChip) userProfileChip.style.display = 'none';
      if (houseBadge) houseBadge.style.display = 'none';
      window.supabaseService.unsubscribeRealtime();

      // Si Supabase está configurado pero el usuario no inició sesión y no está en modo local
      if (window.supabaseService.isConfigured() && !window.supabaseService.isLocalMode) {
        // Mantener vista local disponible o sugerir login
      }
    }
  }

  updateAuthTabUI() {
    const tabLogin = document.getElementById('tabLoginBtn');
    const tabRegister = document.getElementById('tabRegisterBtn');
    const nameGroup = document.getElementById('authNameGroup');
    const submitBtn = document.getElementById('authSubmitBtn');
    const modalTitle = document.getElementById('authModalTitle');

    if (this.authMode === 'register') {
      if (tabLogin) tabLogin.classList.remove('active');
      if (tabRegister) tabRegister.classList.add('active');
      if (nameGroup) nameGroup.style.display = 'block';
      if (submitBtn) submitBtn.textContent = 'Crear Cuenta Familiar';
      if (modalTitle) modalTitle.textContent = 'Crear Cuenta en Mi Hogar';
    } else {
      if (tabLogin) tabLogin.classList.add('active');
      if (tabRegister) tabRegister.classList.remove('active');
      if (nameGroup) nameGroup.style.display = 'none';
      if (submitBtn) submitBtn.textContent = 'Ingresar a Mi Hogar';
      if (modalTitle) modalTitle.textContent = 'Acceso Familiar - Nube';
    }
  }

  // ==================== TEMA CLARO / OSCURO ====================

  initTheme() {
    const savedTheme = window.store.settings.theme || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }

  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    window.store.settings.theme = next;
    window.store.save(STORAGE_KEYS.SETTINGS, window.store.settings);

    // Re-renderizar gráficos para actualizar colores de fuente
    this.refreshAll();
  }

  // ==================== NAVEGACIÓN DE MESES ====================

  updateMonthDisplay() {
    const monthNameEl = document.getElementById('monthName');
    const yearNumberEl = document.getElementById('yearNumber');
    if (monthNameEl) monthNameEl.textContent = MONTH_NAMES_ES[this.currentMonth - 1];
    if (yearNumberEl) yearNumberEl.textContent = this.currentYear;
  }

  prevMonth() {
    this.currentMonth--;
    if (this.currentMonth < 1) {
      this.currentMonth = 12;
      this.currentYear--;
    }
    this.onMonthChanged();
  }

  nextMonth() {
    this.currentMonth++;
    if (this.currentMonth > 12) {
      this.currentMonth = 1;
      this.currentYear++;
    }
    this.onMonthChanged();
  }

  goToToday() {
    const today = new Date();
    this.currentYear = today.getFullYear();
    this.currentMonth = today.getMonth() + 1;
    this.onMonthChanged();
  }

  onMonthChanged() {
    this.updateMonthDisplay();
    this.refreshAll();
  }

  // ==================== PESTAÑAS (TABS) ====================

  switchTab(tabName) {
    this.activeTab = tabName;

    document.querySelectorAll('.tab-btn').forEach(btn => {
      const isTarget = btn.getAttribute('data-tab') === tabName;
      btn.classList.toggle('active', isTarget);
      btn.setAttribute('aria-selected', isTarget);
    });

    document.querySelectorAll('.tab-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === `tab-${tabName}`);
    });

    if (tabName === 'cards') {
      window.cardsManager.render(this.yearMonthKey);
    } else if (tabName === 'calendar') {
      window.calendarManager.render(this.yearMonthKey);
    } else if (tabName === 'analytics') {
      window.dashboardManager.update(this.yearMonthKey);
    }
  }

  // ==================== ACTUALIZACIÓN GLOBAL ====================

  refreshAll() {
    const ym = this.yearMonthKey;
    window.servicesManager.render(ym);
    window.expensesManager.render(ym);
    window.cardsManager.render(ym);
    window.dashboardManager.update(ym);
    if (window.settlementManager) {
      window.settlementManager.render(ym);
    }

    if (this.activeTab === 'cards') {
      window.cardsManager.render(ym);
    } else if (this.activeTab === 'calendar') {
      window.calendarManager.render(ym);
    }
  }

  // ==================== GESTIÓN DE MODALES ====================

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.tabIndex = -1;
      if (!document.querySelector('.modal-backdrop.active')) {
        this.lastFocusedElement = document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      }
      modal.classList.add('active');
      document.body.classList.add('modal-open');

      requestAnimationFrame(() => {
        this.focusModal(modal);
      });
    }
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
      this.restoreModalState();
    }
  }

  closeAllModals() {
    document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.remove('active'));
    this.restoreModalState();
  }

  restoreModalState() {
    const activeModal = this.getActiveModal();
    if (activeModal) {
      this.focusModal(activeModal);
      return;
    }

    document.body.classList.remove('modal-open');
    if (this.lastFocusedElement?.isConnected) {
      this.lastFocusedElement.focus({ preventScroll: true });
    }
    this.lastFocusedElement = null;
  }

  getActiveModal() {
    const activeModals = document.querySelectorAll('.modal-backdrop.active');
    return activeModals[activeModals.length - 1] || null;
  }

  getFocusableElements(container) {
    return [...container.querySelectorAll(
      'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
    )].filter(element => {
      const styles = window.getComputedStyle(element);
      return element.getClientRects().length > 0 && styles.visibility !== 'hidden';
    });
  }

  focusModal(modal) {
    const [firstFocusable] = this.getFocusableElements(modal);
    (firstFocusable || modal).focus({ preventScroll: true });
  }

  handleModalKeydown(event) {
    if (event.defaultPrevented) return;

    const modal = this.getActiveModal();
    if (!modal) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeAllModals();
      return;
    }

    if (event.key !== 'Tab') return;

    const focusable = this.getFocusableElements(modal);

    if (!focusable.length) {
      event.preventDefault();
      modal.focus({ preventScroll: true });
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  async copyTextToClipboard(text) {
    if (!text) return false;

    if (navigator.clipboard?.writeText && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        // Continúa con el mecanismo de compatibilidad para navegadores que lo bloqueen.
      }
    }

    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const fallback = document.createElement('textarea');
    fallback.value = text;
    fallback.setAttribute('readonly', '');
    fallback.style.position = 'fixed';
    fallback.style.opacity = '0';
    fallback.style.pointerEvents = 'none';
    document.body.appendChild(fallback);
    fallback.select();
    fallback.setSelectionRange(0, fallback.value.length);

    let copied = false;
    try {
      copied = document.execCommand('copy');
    } catch {
      copied = false;
    }
    fallback.remove();
    if (previouslyFocused?.isConnected) {
      previouslyFocused.focus({ preventScroll: true });
    }
    return copied;
  }

  // ==================== NOTIFICACIONES TOAST ====================

  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'warning') icon = '⚠️';
    if (type === 'danger') icon = '❌';

    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  // ==================== EVENT LISTENERS ====================

  bindEvents() {
    // Inicializar calculadora
    window.calculatorManager.init();

    // Meses
    document.getElementById('prevMonthBtn').addEventListener('click', () => this.prevMonth());
    document.getElementById('nextMonthBtn').addEventListener('click', () => this.nextMonth());
    document.getElementById('currentMonthBtn').addEventListener('click', () => this.goToToday());

    // Tema
    document.getElementById('themeToggleBtn').addEventListener('click', () => this.toggleTheme());

    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => this.switchTab(btn.getAttribute('data-tab')));
    });

    // Filtros de servicios
    document.querySelectorAll('.filter-chip[data-filter]').forEach(chip => {
      chip.addEventListener('click', (e) => {
        const group = e.currentTarget.closest('.filter-group');
        if (group) {
          group.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        }
        e.currentTarget.classList.add('active');
        window.servicesManager.currentFilter = e.currentTarget.getAttribute('data-filter');
        window.servicesManager.render(this.yearMonthKey);
      });
    });

    // Búsqueda y orden de servicios
    const searchServ = document.getElementById('searchServicesInput');
    if (searchServ) {
      searchServ.addEventListener('input', (e) => {
        window.servicesManager.searchQuery = e.target.value;
        window.servicesManager.render(this.yearMonthKey);
      });
    }

    const sortServ = document.getElementById('sortServicesSelect');
    if (sortServ) {
      sortServ.addEventListener('change', (e) => {
        window.servicesManager.currentSort = e.target.value;
        window.servicesManager.render(this.yearMonthKey);
      });
    }

    // Filtros y búsqueda de gastos
    const searchExp = document.getElementById('searchExpensesInput');
    if (searchExp) {
      searchExp.addEventListener('input', (e) => {
        window.expensesManager.searchQuery = e.target.value;
        window.expensesManager.render(this.yearMonthKey);
      });
    }

    const filterExpCat = document.getElementById('filterExpenseCategory');
    if (filterExpCat) {
      filterExpCat.addEventListener('change', (e) => {
        window.expensesManager.selectedCategory = e.target.value;
        window.expensesManager.render(this.yearMonthKey);
      });
    }

    // Filtros y búsqueda de Tarjetas y Cuotas
    document.querySelectorAll('.card-filter-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        document.querySelectorAll('.card-filter-chip').forEach(c => c.classList.remove('active'));
        e.currentTarget.classList.add('active');
        window.cardsManager.currentFilter = e.currentTarget.getAttribute('data-card-filter');
        window.cardsManager.render(this.yearMonthKey);
      });
    });

    const searchCards = document.getElementById('searchCardsInput');
    if (searchCards) {
      searchCards.addEventListener('input', (e) => {
        window.cardsManager.searchQuery = e.target.value;
        window.cardsManager.render(this.yearMonthKey);
      });
    }

    const filterCardBrand = document.getElementById('filterCardBrand');
    if (filterCardBrand) {
      filterCardBrand.addEventListener('change', (e) => {
        window.cardsManager.currentBrand = e.target.value;
        window.cardsManager.render(this.yearMonthKey);
      });
    }

    // Botones de Abrir Modales
    document.getElementById('addServiceBtn').addEventListener('click', () => {
      document.getElementById('serviceModalTitle').textContent = 'Agregar Servicio del Hogar';
      document.getElementById('serviceForm').reset();
      document.getElementById('serviceId').value = '';
      this.openModal('serviceModal');
    });

    document.getElementById('addExpenseBtn').addEventListener('click', () => {
      window.expensesManager.openAddModal();
    });

    const addCardBtn = document.getElementById('addCardBtn');
    if (addCardBtn) {
      addCardBtn.addEventListener('click', () => {
        window.cardsManager.openAddModal();
      });
    }

    // Calculadora Header
    const calcBtn = document.getElementById('calculatorBtn');
    if (calcBtn) {
      calcBtn.addEventListener('click', () => {
        window.calculatorManager.open();
      });
    }

    document.getElementById('shareWhatsAppBtn').addEventListener('click', () => {
      window.whatsappManager.openPreview(this.yearMonthKey);
    });

    document.getElementById('printBtn').addEventListener('click', () => {
      window.print();
    });

    document.getElementById('backupBtn').addEventListener('click', () => {
      this.openModal('backupModal');
    });

    // Cerrar Modales
    document.querySelectorAll('.btn-close-modal, #cancelServiceBtn, #cancelPayBtn, #cancelExpenseBtn, #cancelCardBtn, #cancelCardPayBtn, #closeCalcModalBtn, #cancelBudgetBtn, #closeBudgetModalBtn, #closeAuthModalBtn, #closeInviteModalBtn, #closeInviteBtn2, #closeSupaConfigModalBtn, #cancelSupaConfigBtn').forEach(btn => {
      btn.addEventListener('click', () => this.closeAllModals());
    });

    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) this.closeAllModals();
      });
    });

    window.addEventListener('keydown', (e) => this.handleModalKeydown(e));

    // WhatsApp Modal Acciones
    document.getElementById('copyWhatsAppTextBtn').addEventListener('click', () => {
      window.whatsappManager.copyToClipboard();
    });

    document.getElementById('openWhatsAppDirectBtn').addEventListener('click', () => {
      window.whatsappManager.openDirect();
    });

    // Formulario de Servicio
    document.getElementById('serviceForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const serviceData = {
        id: document.getElementById('serviceId').value || undefined,
        name: document.getElementById('serviceName').value.trim(),
        category: document.getElementById('serviceCategory').value,
        provider: document.getElementById('serviceProvider').value.trim(),
        dueDay: Number(document.getElementById('serviceDueDay').value),
        defaultAmount: Number(document.getElementById('serviceDefaultAmount').value),
        clientCode: document.getElementById('serviceClientCode').value.trim(),
        notes: document.getElementById('serviceNotes').value.trim(),
        autoDebit: document.getElementById('serviceAutoDebit').checked
      };

      window.store.saveService(serviceData);
      this.closeAllModals();
      this.refreshAll();
      this.showToast('Servicio guardado con éxito', 'success');
    });

    // Formulario de Pago de Servicio
    document.getElementById('payForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const serviceId = document.getElementById('payServiceId').value;
      const paymentDetails = {
        paidAmount: Number(document.getElementById('payAmount').value),
        paidDate: document.getElementById('payDate').value,
        method: document.getElementById('payMethod').value,
        receiptNote: document.getElementById('payReceiptNote').value.trim()
      };

      window.store.recordPayment(serviceId, this.yearMonthKey, paymentDetails);
      this.closeAllModals();
      this.refreshAll();
      this.showToast('¡Pago registrado correctamente!', 'success');
    });

    // Formulario de Gasto Diario
    document.getElementById('expenseForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const payerSelect = document.getElementById('expensePaidBySelect');
      const payerCustom = document.getElementById('expensePaidByCustom');
      let paidBy = 'Yo';
      if (payerSelect) {
        if (payerSelect.value === 'custom') {
          paidBy = payerCustom?.value.trim() || 'Yo';
        } else {
          paidBy = payerSelect.value;
        }
      }

      const expenseData = {
        id: document.getElementById('expenseId').value || undefined,
        title: document.getElementById('expenseTitle').value.trim(),
        category: document.getElementById('expenseCategory').value,
        amount: Number(document.getElementById('expenseAmount').value),
        date: document.getElementById('expenseDate').value,
        paidBy: paidBy,
        notes: document.getElementById('expenseNotes').value.trim()
      };

      window.store.saveExpense(expenseData);
      this.closeAllModals();
      this.refreshAll();
      this.showToast(`Gasto anotado (Pagado por ${paidBy})`, 'success');
    });

    // Formulario de Tarjeta y Cuotas
    const cardTotalInput = document.getElementById('cardTotalAmount');
    const cardInstCountInput = document.getElementById('cardTotalInstallments');

    if (cardTotalInput) {
      cardTotalInput.addEventListener('input', () => window.cardsManager.calculateInstallment());
    }
    if (cardInstCountInput) {
      cardInstCountInput.addEventListener('input', () => window.cardsManager.calculateInstallment());
    }

    const cardForm = document.getElementById('cardForm');
    if (cardForm) {
      cardForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const cardData = {
          id: document.getElementById('cardId').value || undefined,
          cardName: document.getElementById('cardName').value.trim(),
          cardBrand: document.getElementById('cardBrand').value,
          description: document.getElementById('cardDescription').value.trim(),
          category: document.getElementById('cardCategory').value,
          totalAmount: Number(document.getElementById('cardTotalAmount').value),
          totalInstallments: Number(document.getElementById('cardTotalInstallments').value),
          installmentAmount: Number(document.getElementById('cardInstallmentAmount').value),
          startYearMonth: document.getElementById('cardStartYearMonth').value,
          dueDay: Number(document.getElementById('cardDueDay').value),
          notes: document.getElementById('cardNotes').value.trim()
        };

        window.store.saveCard(cardData);
        this.closeAllModals();
        this.refreshAll();
        this.showToast('Compra en cuotas guardada con éxito', 'success');
      });
    }

    // Formulario de Pago de Cuota de Tarjeta
    const cardPayForm = document.getElementById('cardPayForm');
    if (cardPayForm) {
      cardPayForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const cardId = document.getElementById('cardPayId').value;
        const paymentDetails = {
          paidAmount: Number(document.getElementById('cardPayAmount').value),
          paidDate: document.getElementById('cardPayDate').value,
          method: document.getElementById('cardPayMethod').value,
          receiptNote: document.getElementById('cardPayReceiptNote').value.trim()
        };

        window.store.recordCardPayment(cardId, this.yearMonthKey, paymentDetails);
        this.closeAllModals();
        this.refreshAll();
        this.showToast('¡Pago de cuota registrado!', 'success');
      });
    }
    // Presupuesto Modal
    const openBudgetBtn = document.getElementById('openBudgetModalBtn');
    if (openBudgetBtn) {
      openBudgetBtn.addEventListener('click', () => {
        const currentBudget = window.store.getBudget(this.yearMonthKey);
        const input = document.getElementById('budgetAmountInput');
        if (input) input.value = currentBudget;
        this.openModal('budgetModal');
      });
    }

    const budgetForm = document.getElementById('budgetForm');
    if (budgetForm) {
      budgetForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const amount = Number(document.getElementById('budgetAmountInput').value);
        const applyAll = document.getElementById('budgetApplyAllMonths').checked;

        window.store.setBudget(this.yearMonthKey, amount, applyAll);
        this.closeAllModals();
        this.refreshAll();
        this.showToast(`Presupuesto actualizado a $${amount.toLocaleString('es-AR')}`, 'success');
      });
    }

    // ==================== EVENTOS DE AUTH Y HOGARES ====================

    const openAuthBtn = document.getElementById('openAuthModalBtn');
    if (openAuthBtn) {
      openAuthBtn.addEventListener('click', () => {
        this.authMode = 'login';
        this.updateAuthTabUI();
        this.openModal('authModal');
      });
    }

    const tabLogin = document.getElementById('tabLoginBtn');
    const tabRegister = document.getElementById('tabRegisterBtn');
    if (tabLogin && tabRegister) {
      tabLogin.addEventListener('click', () => {
        this.authMode = 'login';
        this.updateAuthTabUI();
      });
      tabRegister.addEventListener('click', () => {
        this.authMode = 'register';
        this.updateAuthTabUI();
      });
    }

    const authForm = document.getElementById('authForm');
    if (authForm) {
      authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('authEmail').value.trim();
        const password = document.getElementById('authPassword').value;
        const fullName = document.getElementById('authFullName')?.value.trim() || '';

        const submitBtn = document.getElementById('authSubmitBtn');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Procesando...';
        }

        try {
          if (!window.supabaseService.isConfigured()) {
            this.openModal('supabaseConfigModal');
            this.showToast('Primero configura la URL y API Key de Supabase', 'warning');
            return;
          }

          if (this.authMode === 'register') {
            await window.supabaseService.signUp(email, password, fullName);
            this.showToast('¡Cuenta creada! Iniciando sesión...', 'success');
          } else {
            await window.supabaseService.signIn(email, password);
            this.showToast('¡Bienvenido de nuevo!', 'success');
          }

          await this.initAuth();
        } catch (err) {
          console.error('Error de autenticación:', err);
          this.showToast(err.message || 'Error al autenticar', 'danger');
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = this.authMode === 'register' ? 'Crear Cuenta' : 'Ingresar a Mi Hogar';
          }
        }
      });
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        await window.supabaseService.signOut();
        await this.initAuth();
        this.showToast('Has cerrado sesión correctamente', 'success');
      });
    }

    const btnContinueLocal = document.getElementById('btnContinueLocal');
    if (btnContinueLocal) {
      btnContinueLocal.addEventListener('click', () => {
        if (window.supabaseService) window.supabaseService.isLocalMode = true;
        this.closeAllModals();
        this.showToast('Continuando en Modo Local (almacenamiento en este dispositivo)', 'success');
      });
    }

    // Formularios de Creación / Unión de Hogar
    const createHouseForm = document.getElementById('createHouseForm');
    if (createHouseForm) {
      createHouseForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const houseName = document.getElementById('newHouseName').value.trim();
        if (!houseName) return;

        try {
          const house = await window.supabaseService.createHousehold(houseName);
          this.showToast(`¡Hogar "${house.name}" creado con éxito!`, 'success');
          await this.initAuth();
        } catch (err) {
          this.showToast(err.message || 'Error al crear el hogar', 'danger');
        }
      });
    }

    const joinHouseForm = document.getElementById('joinHouseForm');
    if (joinHouseForm) {
      joinHouseForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const inviteCode = document.getElementById('joinInviteCode').value.trim();
        if (!inviteCode) return;

        try {
          const house = await window.supabaseService.joinHouseholdByCode(inviteCode);
          this.showToast(`¡Te uniste a "${house.name}" correctamente!`, 'success');
          await this.initAuth();
        } catch (err) {
          this.showToast(err.message || 'Error al unirse al hogar', 'danger');
        }
      });
    }

    // Modal de Invitación y Compartir
    const headerShareHouseBtn = document.getElementById('headerShareHouseBtn');
    if (headerShareHouseBtn) {
      headerShareHouseBtn.addEventListener('click', () => {
        const code = window.supabaseService?.currentHousehold?.invite_code || '---';
        const displayEl = document.getElementById('modalInviteCodeDisplay');
        if (displayEl) displayEl.textContent = code;
        this.openModal('inviteModal');
      });
    }

    const copyCodeHandler = async () => {
      const code = window.supabaseService?.currentHousehold?.invite_code;
      if (!code) return;

      try {
        const copied = await this.copyTextToClipboard(code);
        if (copied) {
          this.showToast(`Código ${code} copiado al portapapeles`, 'success');
        } else {
          this.showToast('No se pudo copiar el código. Intenta seleccionarlo y copiarlo manualmente.', 'warning');
        }
      } catch {
        this.showToast('No se pudo copiar el código. Intenta seleccionarlo y copiarlo manualmente.', 'warning');
      }
    };

    const headerCopyCode = document.getElementById('headerCopyInviteCodeBtn');
    const modalCopyCode = document.getElementById('modalCopyCodeBtn');
    if (headerCopyCode) headerCopyCode.addEventListener('click', copyCodeHandler);
    if (modalCopyCode) modalCopyCode.addEventListener('click', copyCodeHandler);

    const shareInviteWhatsAppBtn = document.getElementById('shareInviteWhatsAppBtn');
    if (shareInviteWhatsAppBtn) {
      shareInviteWhatsAppBtn.addEventListener('click', () => {
        const house = window.supabaseService?.currentHousehold;
        if (!house) return;
        const text = encodeURIComponent(`🏠 ¡Hola! Sumate a nuestro hogar "${house.name}" en la app de Servicios y Gastos para organizar las cuentas juntos.\n\n🔑 Código de Invitación: *${house.invite_code}*\n\n¡Ingresa el código al registrarte en la app!`);
        window.open(`https://wa.me/?text=${text}`, '_blank');
      });
    }

    // Configuración de Supabase
    const btnOpenSupaConfig = document.getElementById('btnOpenSupaConfig');
    if (btnOpenSupaConfig) {
      btnOpenSupaConfig.addEventListener('click', () => {
        const creds = window.SUPABASE_CONFIG.getCredentials();
        const urlInput = document.getElementById('supaUrlInput');
        const keyInput = document.getElementById('supaKeyInput');
        if (urlInput) urlInput.value = creds.url || '';
        if (keyInput) keyInput.value = creds.key || '';
        this.openModal('supabaseConfigModal');
      });
    }

    const supaConfigForm = document.getElementById('supabaseConfigForm');
    if (supaConfigForm) {
      supaConfigForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const url = document.getElementById('supaUrlInput').value.trim();
        const key = document.getElementById('supaKeyInput').value.trim();

        window.SUPABASE_CONFIG.saveCredentials(url, key);
        window.supabaseService.init();
        this.closeAllModals();
        this.showToast('Credenciales de Supabase guardadas y conectadas', 'success');
        this.initAuth();
      });
    }

    // Backup & Exportación
    document.getElementById('exportJsonBtn').addEventListener('click', () => {
      const json = window.store.exportDataJson();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mihogar_respaldo_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      this.showToast('Copia de seguridad descargada', 'success');
    });

    document.getElementById('exportCsvBtn').addEventListener('click', () => {
      const csv = window.store.exportMonthCsv(this.yearMonthKey);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gastos_hogar_${this.yearMonthKey}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      this.showToast('Reporte Excel (CSV) descargado', 'success');
    });

    document.getElementById('importJsonInput').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const success = window.store.importDataJson(event.target.result);
        if (success) {
          this.closeAllModals();
          this.refreshAll();
          this.showToast('¡Datos restaurados con éxito!', 'success');
        } else {
          this.showToast('Error al leer el archivo de respaldo', 'danger');
        }
      };
      reader.readAsText(file);
    });

    document.getElementById('loadSampleDataBtn').addEventListener('click', () => {
      if (confirm('¿Cargar datos de ejemplo? Esto agregará servicios típicos y compras en cuotas.')) {
        window.store.loadSampleData();
        this.closeAllModals();
        this.refreshAll();
        this.showToast('Datos de ejemplo cargados', 'success');
      }
    });
  }
}

// Inicialización al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
  window.app = new AppController();
  window.app.init();
});
