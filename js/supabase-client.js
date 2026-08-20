/**
 * SUPABASE-CLIENT.JS - Cliente de Supabase, Autenticación y Gestión de Hogares
 */

class SupabaseService {
  constructor() {
    this.client = null;
    this.currentUser = null;
    this.currentHousehold = null;
    this.isLocalMode = false;
    this.init();
  }

  init() {
    const creds = window.SUPABASE_CONFIG ? window.SUPABASE_CONFIG.getCredentials() : { isConfigured: false };
    
    if (creds.isConfigured && window.supabase) {
      try {
        this.client = window.supabase.createClient(creds.url, creds.key, {
          auth: {
            persistSession: true,
            autoRefreshToken: true
          }
        });
        console.log('✅ Cliente Supabase inicializado correctamente.');
      } catch (err) {
        console.error('Error inicializando Supabase Client:', err);
      }
    } else {
      console.log('ℹ️ Supabase no configurado aún o en modo local.');
    }
  }

  isConfigured() {
    const creds = window.SUPABASE_CONFIG ? window.SUPABASE_CONFIG.getCredentials() : { isConfigured: false };
    return creds.isConfigured && Boolean(this.client);
  }

  // ==========================================================================
  // AUTENTICACIÓN
  // ==========================================================================

  async getSession() {
    if (!this.client) return null;
    try {
      const { data, error } = await this.client.auth.getSession();
      if (error) throw error;
      if (data && data.session) {
        this.currentUser = data.session.user;
        return data.session;
      }
      return null;
    } catch (err) {
      console.error('Error obteniendo sesión de Supabase:', err);
      return null;
    }
  }

  async signUp(email, password, fullName = '') {
    if (!this.client) throw new Error('Supabase no está configurado. Por favor ingresa tu URL y API Key.');
    
    const { data, error } = await this.client.auth.signUp({
      email: email.trim(),
      password: password,
      options: {
        data: { full_name: fullName.trim() }
      }
    });

    if (error) throw error;
    this.currentUser = data.user;
    return data;
  }

  async signIn(email, password) {
    if (!this.client) throw new Error('Supabase no está configurado. Por favor ingresa tu URL y API Key.');

    const { data, error } = await this.client.auth.signInWithPassword({
      email: email.trim(),
      password: password
    });

    if (error) throw error;
    this.currentUser = data.user;
    return data;
  }

  async signOut() {
    if (this.client) {
      try {
        await this.client.auth.signOut();
      } catch (e) {
        console.warn('Error en sign out:', e);
      }
    }
    this.currentUser = null;
    this.currentHousehold = null;
    this.isLocalMode = false;
    localStorage.removeItem('mihogar_cached_household');
  }

  // ==========================================================================
  // GESTIÓN DE HOGARES Y CÓDIGOS DE INVITACIÓN
  // ==========================================================================

  async getUserHousehold(userId) {
    if (!this.client || !userId) return null;

    try {
      // 1. Buscar membresía del usuario
      const { data: memberData, error: memberErr } = await this.client
        .from('household_members')
        .select('household_id, role')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();

      if (memberErr || !memberData) return null;

      // 2. Obtener datos del hogar
      const { data: household, error: houseErr } = await this.client
        .from('households')
        .select('*')
        .eq('id', memberData.household_id)
        .single();

      if (houseErr || !household) return null;

      this.currentHousehold = { ...household, userRole: memberData.role };
      localStorage.setItem('mihogar_cached_household', JSON.stringify(this.currentHousehold));
      return this.currentHousehold;
    } catch (err) {
      console.error('Error obteniendo hogar del usuario:', err);
      return null;
    }
  }

  async createHousehold(name) {
    if (!this.client) throw new Error('Supabase no está configurado');
    if (!this.currentUser) {
      await this.getSession();
    }
    if (!this.currentUser) throw new Error('Debes iniciar sesión para crear un hogar');

    const cleanName = name.trim();
    const { data, error } = await this.client.rpc('create_household', {
      p_name: cleanName
    });

    if (error) throw error;

    const household = Array.isArray(data) ? data[0] : data;
    if (!household) throw new Error('No se pudo crear el hogar. Intenta nuevamente.');

    this.currentHousehold = {
      ...household,
      userRole: household.user_role || 'admin'
    };
    localStorage.setItem('mihogar_cached_household', JSON.stringify(this.currentHousehold));
    return this.currentHousehold;
  }

  async joinHouseholdByCode(inviteCode) {
    if (!this.client) throw new Error('Supabase no está configurado');
    if (!this.currentUser) {
      await this.getSession();
    }
    if (!this.currentUser) throw new Error('Debes iniciar sesión para unirte a un hogar');

    const { data, error } = await this.client.rpc('join_household_by_invite_code', {
      p_invite_code: inviteCode.trim()
    });

    if (error) throw error;

    const household = Array.isArray(data) ? data[0] : data;
    if (!household) throw new Error('No se pudo unir al hogar con ese código.');

    this.currentHousehold = {
      ...household,
      userRole: household.user_role || 'member'
    };
    localStorage.setItem('mihogar_cached_household', JSON.stringify(this.currentHousehold));
    return this.currentHousehold;
  }

  async getHouseholdMembers(householdId) {
    if (!this.client || !householdId) return [];

    try {
      const { data, error } = await this.client
        .from('household_members')
        .select('*')
        .eq('household_id', householdId)
        .order('joined_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error listando miembros del hogar:', err);
      return [];
    }
  }

  // ==========================================================================
  // CAPA DE SINCRONIZACIÓN DE DATOS CON SUPABASE
  // ==========================================================================

  async fetchHouseholdData(householdId) {
    if (!this.client || !householdId) return null;

    try {
      const [srvRes, payRes, expRes, crdRes, crdPayRes, bdgRes] = await Promise.all([
        this.client.from('services').select('*').eq('household_id', householdId),
        this.client.from('payments').select('*').eq('household_id', householdId),
        this.client.from('expenses').select('*').eq('household_id', householdId),
        this.client.from('cards').select('*').eq('household_id', householdId),
        this.client.from('card_payments').select('*').eq('household_id', householdId),
        this.client.from('budgets').select('*').eq('household_id', householdId)
      ]);

      // Mapear pagos a formato de diccionario payments[serviceId_yearMonth]
      const paymentsObj = {};
      (payRes.data || []).forEach(p => {
        const key = `${p.service_id}_${p.year_month}`;
        paymentsObj[key] = {
          paidAmount: Number(p.paid_amount),
          paidDate: p.paid_date,
          method: p.method,
          receiptNote: p.receipt_note,
          paidBy: p.paid_by
        };
      });

      // Mapear pagos de tarjetas a formato cardPayments[cardId_yearMonth]
      const cardPaymentsObj = {};
      (crdPayRes.data || []).forEach(cp => {
        const key = `${cp.card_id}_${cp.year_month}`;
        cardPaymentsObj[key] = {
          paidAmount: Number(cp.paid_amount),
          paidDate: cp.paid_date,
          method: cp.method,
          receiptNote: cp.receipt_note
        };
      });

      // Mapear presupuestos
      const budgetsObj = { defaultMonthly: 450000 };
      (bdgRes.data || []).forEach(b => {
        if (b.is_default) budgetsObj.defaultMonthly = Number(b.amount);
        budgetsObj[b.year_month] = Number(b.amount);
      });

      // Mapear servicios a formato camelCase
      const servicesArr = (srvRes.data || []).map(s => ({
        id: s.id,
        name: s.name,
        category: s.category,
        provider: s.provider,
        dueDay: Number(s.due_day),
        defaultAmount: Number(s.default_amount),
        clientCode: s.client_code,
        notes: s.notes,
        autoDebit: Boolean(s.auto_debit)
      }));

      // Mapear tarjetas
      const cardsArr = (crdRes.data || []).map(c => ({
        id: c.id,
        cardName: c.card_name,
        cardBrand: c.card_brand,
        description: c.description,
        category: c.category,
        totalAmount: Number(c.total_amount),
        totalInstallments: Number(c.total_installments),
        installmentAmount: Number(c.installment_amount),
        startYearMonth: c.start_year_month,
        dueDay: Number(c.due_day),
        notes: c.notes
      }));

      // Mapear gastos
      const expensesArr = (expRes.data || []).map(e => ({
        id: e.id,
        title: e.title,
        category: e.category,
        amount: Number(e.amount),
        date: e.date,
        notes: e.notes,
        paidBy: e.paid_by || e.created_by || 'Yo',
        createdBy: e.created_by
      }));

      return {
        services: servicesArr,
        payments: paymentsObj,
        expenses: expensesArr,
        cards: cardsArr,
        cardPayments: cardPaymentsObj,
        budgets: budgetsObj
      };
    } catch (err) {
      console.error('Error cargando datos de Supabase:', err);
      return null;
    }
  }

  // Métodos asíncronos individuales para persistir cambios en Supabase en segundo plano
  async upsertService(service) {
    if (!this.client || !this.currentHousehold) return;
    try {
      await this.client.from('services').upsert({
        id: service.id,
        household_id: this.currentHousehold.id,
        name: service.name,
        category: service.category,
        provider: service.provider,
        due_day: service.dueDay,
        default_amount: service.defaultAmount,
        client_code: service.clientCode,
        notes: service.notes,
        auto_debit: service.autoDebit
      });
    } catch (e) {
      console.error('Error guardando servicio en Supabase:', e);
    }
  }

  async deleteService(serviceId) {
    if (!this.client || !this.currentHousehold) return;
    try {
      await this.client.from('services').delete().eq('id', serviceId).eq('household_id', this.currentHousehold.id);
    } catch (e) {
      console.error('Error eliminando servicio en Supabase:', e);
    }
  }

  async upsertPayment(serviceId, yearMonth, details) {
    if (!this.client || !this.currentHousehold) return;
    try {
      const paymentId = `pay_${serviceId}_${yearMonth}`;
      await this.client.from('payments').upsert({
        id: paymentId,
        household_id: this.currentHousehold.id,
        service_id: serviceId,
        year_month: yearMonth,
        paid_amount: details.paidAmount,
        paid_date: details.paidDate,
        method: details.method,
        receipt_note: details.receiptNote,
        paid_by: this.currentUser ? this.currentUser.email : 'Usuario'
      });
    } catch (e) {
      console.error('Error guardando pago en Supabase:', e);
    }
  }

  async deletePayment(serviceId, yearMonth) {
    if (!this.client || !this.currentHousehold) return;
    try {
      const paymentId = `pay_${serviceId}_${yearMonth}`;
      await this.client.from('payments').delete().eq('id', paymentId).eq('household_id', this.currentHousehold.id);
    } catch (e) {
      console.error('Error eliminando pago en Supabase:', e);
    }
  }

  async upsertExpense(expense) {
    if (!this.client || !this.currentHousehold) return;
    try {
      await this.client.from('expenses').upsert({
        id: expense.id,
        household_id: this.currentHousehold.id,
        title: expense.title,
        category: expense.category,
        amount: expense.amount,
        date: expense.date,
        notes: expense.notes,
        paid_by: expense.paidBy || (this.currentUser ? this.currentUser.user_metadata?.full_name || this.currentUser.email : 'Yo'),
        created_by: this.currentUser ? this.currentUser.email : 'Usuario'
      });
    } catch (e) {
      console.error('Error guardando gasto en Supabase:', e);
    }
  }

  async deleteExpense(expenseId) {
    if (!this.client || !this.currentHousehold) return;
    try {
      await this.client.from('expenses').delete().eq('id', expenseId).eq('household_id', this.currentHousehold.id);
    } catch (e) {
      console.error('Error eliminando gasto en Supabase:', e);
    }
  }

  async upsertCard(card) {
    if (!this.client || !this.currentHousehold) return;
    try {
      await this.client.from('cards').upsert({
        id: card.id,
        household_id: this.currentHousehold.id,
        card_name: card.cardName,
        card_brand: card.cardBrand,
        description: card.description,
        category: card.category,
        total_amount: card.totalAmount,
        total_installments: card.totalInstallments,
        installment_amount: card.installmentAmount,
        start_year_month: card.startYearMonth,
        due_day: card.dueDay,
        notes: card.notes
      });
    } catch (e) {
      console.error('Error guardando tarjeta en Supabase:', e);
    }
  }

  async deleteCard(cardId) {
    if (!this.client || !this.currentHousehold) return;
    try {
      await this.client.from('cards').delete().eq('id', cardId).eq('household_id', this.currentHousehold.id);
    } catch (e) {
      console.error('Error eliminando tarjeta en Supabase:', e);
    }
  }

  async upsertCardPayment(cardId, yearMonth, details) {
    if (!this.client || !this.currentHousehold) return;
    try {
      const payId = `cardpay_${cardId}_${yearMonth}`;
      await this.client.from('card_payments').upsert({
        id: payId,
        household_id: this.currentHousehold.id,
        card_id: cardId,
        year_month: yearMonth,
        paid_amount: details.paidAmount,
        paid_date: details.paidDate,
        method: details.method,
        receipt_note: details.receiptNote
      });
    } catch (e) {
      console.error('Error guardando pago de cuota en Supabase:', e);
    }
  }

  async deleteCardPayment(cardId, yearMonth) {
    if (!this.client || !this.currentHousehold) return;
    try {
      const payId = `cardpay_${cardId}_${yearMonth}`;
      await this.client.from('card_payments').delete().eq('id', payId).eq('household_id', this.currentHousehold.id);
    } catch (e) {
      console.error('Error eliminando pago de cuota en Supabase:', e);
    }
  }

  async upsertBudget(yearMonth, amount, isDefault = false) {
    if (!this.client || !this.currentHousehold) return;
    try {
      await this.client.from('budgets').upsert({
        household_id: this.currentHousehold.id,
        year_month: yearMonth,
        amount: Number(amount),
        is_default: isDefault,
        updated_at: new Date().toISOString()
      }, { onConflict: 'household_id,year_month' });
    } catch (e) {
      console.error('Error guardando presupuesto en Supabase:', e);
    }
  }

  // ==========================================================================
  // SUSCRIPCIÓN EN TIEMPO REAL (SUPABASE REALTIME)
  // ==========================================================================

  subscribeToHouseholdChanges(householdId, onChangeCallback) {
    if (!this.client || !householdId) return null;

    // Desconectar canal anterior si existía
    this.unsubscribeRealtime();

    const liveIndicator = document.getElementById('headerLiveIndicator');
    if (liveIndicator) liveIndicator.style.display = 'inline-flex';

    this.realtimeChannel = this.client
      .channel(`realtime_household_${householdId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        filter: `household_id=eq.${householdId}`
      }, async (payload) => {
        console.log('⚡ [Realtime] Cambio detectado en base de datos:', payload.table, payload.eventType);
        if (onChangeCallback) {
          onChangeCallback(payload);
        }
      })
      .subscribe((status) => {
        console.log('📡 [Realtime] Estado de suscripción:', status);
        if (status === 'SUBSCRIBED') {
          const liveText = document.getElementById('headerLiveText');
          if (liveText) liveText.textContent = 'En vivo';
        }
      });

    return this.realtimeChannel;
  }

  unsubscribeRealtime() {
    if (this.client && this.realtimeChannel) {
      try {
        this.client.removeChannel(this.realtimeChannel);
      } catch (e) {
        console.warn('Error al remover canal realtime:', e);
      }
      this.realtimeChannel = null;
    }
    const liveIndicator = document.getElementById('headerLiveIndicator');
    if (liveIndicator) liveIndicator.style.display = 'none';
  }
}

// Instancia global
window.supabaseService = new SupabaseService();
