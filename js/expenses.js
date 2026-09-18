/**
 * EXPENSES.JS - Módulo de Gestión de Gastos Cotidianos / Variables y Aportes por Integrante
 */

const EXPENSE_CATEGORY_ICONS = {
  Supermercado: '🛒',
  Farmacia: '💊',
  'Comida / Delivery': '🍔',
  Mantenimiento: '🔧',
  Mascotas: '🐾',
  Transporte: '🚗',
  Indumentaria: '👟',
  Educación: '📚',
  Otros: '📦'
};

class ExpensesManager {
  constructor() {
    this.searchQuery = '';
    this.selectedCategory = 'all';
    this.selectedMember = 'all';
  }

  getCategoryIcon(cat) {
    return EXPENSE_CATEGORY_ICONS[cat] || '📦';
  }

  render(yearMonth) {
    this.renderTrash();
    const listContainer = document.getElementById('expensesList');
    const emptyState = document.getElementById('expensesEmptyState');
    if (!listContainer) return;

    let expenses = window.store.getExpenses(yearMonth);

    // Calcular totales
    const totalSum = expenses.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
    const totalCount = expenses.length;

    const totalSumEl = document.getElementById('expensesTotalSum');
    const totalCountEl = document.getElementById('expensesTotalCount');
    if (totalSumEl) totalSumEl.textContent = `$${totalSum.toLocaleString('es-AR')}`;
    if (totalCountEl) totalCountEl.textContent = totalCount;
    
    const badge = document.getElementById('expensesCountBadge');
    if (badge) badge.textContent = totalCount;

    // Resumen por categoría (chips)
    const categoryTotals = {};
    expenses.forEach(e => {
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + Number(e.amount);
    });

    const chipsContainer = document.getElementById('expenseCategoriesSummary');
    if (chipsContainer) {
      chipsContainer.innerHTML = Object.entries(categoryTotals).map(([cat, amount]) => `
        <span class="category-chip-mini">
          <span>${this.getCategoryIcon(cat)}</span>
          <span>${cat}:</span>
          <strong>$${amount.toLocaleString('es-AR')}</strong>
        </span>
      `).join('');
    }

    // Renderizar Desglose de Aportes por Integrante
    this.renderMembersSummary(yearMonth);

    // Filtrar por categoría
    if (this.selectedCategory !== 'all') {
      expenses = expenses.filter(e => e.category === this.selectedCategory);
    }

    // Filtrar por búsqueda
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      expenses = expenses.filter(e => 
        e.title.toLowerCase().includes(q) ||
        (e.notes && e.notes.toLowerCase().includes(q)) ||
        (e.paidBy && e.paidBy.toLowerCase().includes(q)) ||
        e.category.toLowerCase().includes(q)
      );
    }

    if (expenses.length === 0) {
      listContainer.innerHTML = '';
      emptyState.classList.remove('hidden');
      return;
    }

    emptyState.classList.add('hidden');

    listContainer.innerHTML = expenses.map(item => {
      const icon = this.getCategoryIcon(item.category);
      const payer = item.paidBy || 'Yo';

      return `
        <div class="expense-item" data-id="${item.id}">
          <div class="expense-left">
            <div class="expense-category-icon">${icon}</div>
            <div class="expense-info">
              <div class="expense-title-row">
                <span class="expense-title">${this.escapeHtml(item.title)}</span>
                <span class="expense-payer-badge" title="Pagado por ${this.escapeHtml(payer)}">
                  <span class="payer-icon">👤</span>
                  <span class="payer-name">${this.escapeHtml(payer)}</span>
                </span>
              </div>
              <div class="expense-meta">
                <span>📅 ${item.date}</span>
                <span>${item.split?.participants?.length ? 'Repartido entre ' + item.split.participants.length + ' persona(s)' : 'Sin reparto: editar para asignarlo'}</span>
                <span>•</span>
                <span>${item.category}</span>
                ${item.notes ? `<span>•</span><span class="expense-notes">${this.escapeHtml(item.notes)}</span>` : ''}
              </div>
            </div>
          </div>

          <div class="expense-right">
            <span class="expense-amount">$${Number(item.amount).toLocaleString('es-AR')}</span>
            <div class="service-card-menu">
              <button class="btn-card-icon" onclick="window.expensesManager.openEditModal('${item.id}')" title="Editar gasto">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              </button>
              <button class="btn-card-icon btn-delete" onclick="window.expensesManager.deleteExpense('${item.id}')" title="Eliminar gasto">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  renderMembersSummary(yearMonth) {
    const container = document.getElementById('membersExpensesBar');
    if (!container) return;

    const data = window.store.getExpensesByMember(yearMonth);
    if (!data || data.members.length === 0) {
      container.innerHTML = '';
      return;
    }

    container.innerHTML = `
      <div class="members-summary-card">
        <div class="members-summary-header">
          <span class="summary-header-icon">👥</span>
          <strong>Aportes de Gastos del Hogar por Integrante:</strong>
        </div>
        <div class="members-chips-list">
          ${data.members.map(m => {
            const pct = data.grandTotal > 0 ? Math.round((m.total / data.grandTotal) * 100) : 0;
            return `
              <div class="member-contribution-chip">
                <span class="member-chip-avatar">${m.name.charAt(0).toUpperCase()}</span>
                <div class="member-chip-info">
                  <span class="member-chip-name">${this.escapeHtml(m.name)}</span>
                  <strong class="member-chip-amt">$${m.total.toLocaleString('es-AR')} <small>(${pct}%)</small></strong>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
      tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
  }

  async populateMembersDropdown(selectedPayer = 'Yo') {
    const select = document.getElementById('expensePaidBySelect');
    const customInput = document.getElementById('expensePaidByCustom');
    if (!select) return;

    select.innerHTML = '';

    // Obtener miembros del hogar si está conectado
    let members = [];
    if (window.supabaseService && window.supabaseService.currentHousehold) {
      const dbMembers = await window.supabaseService.getHouseholdMembers(window.supabaseService.currentHousehold.id);
      members = dbMembers.map(m => m.user_email).filter(Boolean);
    }

    if (members.length === 0) {
      members = ['Yo', 'Papá', 'Mamá'];
    } else if (selectedPayer === 'Yo') {
      selectedPayer = window.supabaseService.currentUser?.email || members[0];
    }

    let isCustom = false;
    if (selectedPayer && !members.includes(selectedPayer)) {
      isCustom = true;
    }

    members.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m;
      opt.textContent = `👤 ${m}`;
      if (m === selectedPayer) opt.selected = true;
      select.appendChild(opt);
    });

    const customOpt = document.createElement('option');
    customOpt.value = 'custom';
    customOpt.textContent = '➕ Otro miembro / Personalizado...';
    if (isCustom) customOpt.selected = true;
    select.appendChild(customOpt);

    if (customInput) {
      if (isCustom) {
        customInput.style.display = 'block';
        customInput.value = selectedPayer;
      } else {
        customInput.style.display = 'none';
        customInput.value = '';
      }

      select.onchange = () => {
        if (select.value === 'custom') {
          customInput.style.display = 'block';
          customInput.focus();
        } else {
          customInput.style.display = 'none';
        }
      };
    }
  }

  async openAddModal() {
    document.getElementById('expenseModalTitle').textContent = 'Anotar Gasto del Hogar';
    document.getElementById('expenseId').value = '';
    document.getElementById('expenseTitle').value = '';
    document.getElementById('expenseCategory').value = 'Supermercado';
    document.getElementById('expenseAmount').value = '';
    
    const todayStr = new Date().toISOString().split('T')[0];
    document.getElementById('expenseDate').value = todayStr;
    document.getElementById('expenseNotes').value = '';

    await this.populateMembersDropdown('Yo');
    window.expenseSplit.open();

    window.app.openModal('expenseModal');
  }

  async openEditModal(expenseId) {
    const expense = window.store.getExpenses().find(e => e.id === expenseId);
    if (!expense) return;

    document.getElementById('expenseModalTitle').textContent = 'Editar Gasto del Hogar';
    document.getElementById('expenseId').value = expense.id;
    document.getElementById('expenseTitle').value = expense.title;
    document.getElementById('expenseCategory').value = expense.category;
    document.getElementById('expenseAmount').value = expense.amount;
    document.getElementById('expenseDate').value = expense.date;
    document.getElementById('expenseNotes').value = expense.notes || '';

    await this.populateMembersDropdown(expense.paidBy || 'Yo');
    window.expenseSplit.open(expense.split || null);

    window.app.openModal('expenseModal');
  }

  deleteExpense(expenseId) {
    if (confirm('¿Eliminar este gasto del registro familiar?')) {
      if (!window.store.deleteExpense(expenseId)) return;
      window.app.refreshAll();
      window.app.showToast('Gasto enviado a la papelera. Podés recuperarlo desde Gastos.', 'success');
    }
  }
  renderTrash() {
    const container = document.getElementById('expenseTrashList');
    if (!container) return;
    container.replaceChildren();
    const items = window.store.getExpenseTrash();
    if (!items.length) container.textContent = 'No hay gastos eliminados.';
    for (const { expense } of items) {
      const row = document.createElement('div');
      row.className = 'trash-row';
      const label = document.createElement('span');
      label.textContent = expense.title + ' · $' + Number(expense.amount).toLocaleString('es-AR') + ' · ' + expense.date;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn btn-secondary';
      button.textContent = 'Restaurar';
      button.addEventListener('click', () => {
        if (window.store.restoreExpense(expense.id)) {
          window.app.refreshAll();
          window.app.showToast('Gasto restaurado con su fecha original.', 'success');
        }
      });
      row.append(label, button);
      container.append(row);
    }
  }
}

window.expensesManager = new ExpensesManager();
