/**
 * CARDS.JS - Módulo de Gestión y Renderizado de Tarjetas de Crédito y Cuotas
 */

const CARD_BRAND_THEMES = {
  Visa: { icon: '💳', bg: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)', text: '#ffffff', tag: 'VISA' },
  Mastercard: { icon: '💳', bg: 'linear-gradient(135deg, #ff512f 0%, #dd2476 100%)', text: '#ffffff', tag: 'MASTERCARD' },
  Naranja: { icon: '🍊', bg: 'linear-gradient(135deg, #f7797d 0%, #f12711 100%)', text: '#ffffff', tag: 'NARANJA X' },
  Amex: { icon: '💳', bg: 'linear-gradient(135deg, #2b5876 0%, #4e4376 100%)', text: '#ffffff', tag: 'AMEX' },
  Cabal: { icon: '💳', bg: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', text: '#ffffff', tag: 'CABAL' },
  Otra: { icon: '💳', bg: 'linear-gradient(135deg, #4b6cb7 0%, #182848 100%)', text: '#ffffff', tag: 'TARJETA' }
};

const CARD_CATEGORIES = {
  Electrodomésticos: '📺',
  Tecnología: '💻',
  Indumentaria: '👟',
  Hogar: '🛋️',
  Mantenimiento: '🔧',
  Supermercado: '🛒',
  Salud: '💊',
  Viajes: '✈️',
  Otros: '📦'
};

class CardsManager {
  constructor() {
    this.currentFilter = 'active'; // 'active', 'all', 'finished'
    this.currentBrand = 'all';
    this.searchQuery = '';
  }

  getBrandTheme(brand) {
    return CARD_BRAND_THEMES[brand] || CARD_BRAND_THEMES.Otra;
  }

  getCategoryIcon(cat) {
    return CARD_CATEGORIES[cat] || '📦';
  }

  render(yearMonth) {
    const grid = document.getElementById('cardsGrid');
    const emptyState = document.getElementById('cardsEmptyState');
    if (!grid) return;

    const summary = window.store.getCardsSummary(yearMonth);
    let cards = summary.allCards;

    // Actualizar KPIs del panel de tarjetas
    const kpiMonthAmount = document.getElementById('cardsKpiMonthAmount');
    const kpiPaidAmount = document.getElementById('cardsKpiPaidAmount');
    const kpiPendingAmount = document.getElementById('cardsKpiPendingAmount');
    const kpiFutureDebt = document.getElementById('cardsKpiFutureDebt');
    const badge = document.getElementById('cardsPendingBadge');

    if (kpiMonthAmount) kpiMonthAmount.textContent = `$${summary.totalMonthAmount.toLocaleString('es-AR')}`;
    if (kpiPaidAmount) kpiPaidAmount.textContent = `$${summary.paidAmount.toLocaleString('es-AR')}`;
    if (kpiPendingAmount) kpiPendingAmount.textContent = `$${summary.pendingAmount.toLocaleString('es-AR')}`;
    if (kpiFutureDebt) kpiFutureDebt.textContent = `$${summary.totalFutureDebt.toLocaleString('es-AR')}`;
    if (badge) badge.textContent = summary.pendingCount;

    // Actualizar contadores de filtros
    const activeCount = summary.activeCount;
    const allCount = cards.length;
    const finishedCount = cards.filter(c => c.installmentInfo.status === 'finished').length;

    const countActiveEl = document.getElementById('cardsCountActive');
    const countAllEl = document.getElementById('cardsCountAll');
    const countFinishedEl = document.getElementById('cardsCountFinished');

    if (countActiveEl) countActiveEl.textContent = activeCount;
    if (countAllEl) countAllEl.textContent = allCount;
    if (countFinishedEl) countFinishedEl.textContent = finishedCount;

    // Filtro por Estado
    if (this.currentFilter === 'active') {
      cards = cards.filter(c => c.installmentInfo.status === 'active');
    } else if (this.currentFilter === 'finished') {
      cards = cards.filter(c => c.installmentInfo.status === 'finished');
    }

    // Filtro por Marca / Emisor
    if (this.currentBrand !== 'all') {
      cards = cards.filter(c => c.cardBrand === this.currentBrand);
    }

    // Filtro por Búsqueda
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      cards = cards.filter(c => 
        c.description.toLowerCase().includes(q) ||
        c.cardName.toLowerCase().includes(q) ||
        (c.notes && c.notes.toLowerCase().includes(q)) ||
        (c.category && c.category.toLowerCase().includes(q))
      );
    }

    if (cards.length === 0) {
      grid.innerHTML = '';
      if (emptyState) emptyState.classList.remove('hidden');
      return;
    }

    if (emptyState) emptyState.classList.add('hidden');

    grid.innerHTML = cards.map(card => {
      const info = card.installmentInfo;
      const theme = this.getBrandTheme(card.cardBrand);
      const catIcon = this.getCategoryIcon(card.category);
      const isPaid = info.isPaid;
      const isFinished = info.status === 'finished';
      const isFuture = info.status === 'future';

      let statusBadgeClass = 'pill-pending';
      let statusBadgeText = `⏳ Cuota ${info.currentNumber}/${info.total}`;

      if (isPaid && !isFinished) {
        statusBadgeClass = 'pill-paid';
        statusBadgeText = `✅ Cuota ${info.currentNumber}/${info.total} Pagada`;
      } else if (isFinished) {
        statusBadgeClass = 'pill-paid';
        statusBadgeText = `🎉 Finalizada (${info.total}/${info.total})`;
      } else if (isFuture) {
        statusBadgeClass = 'pill-future';
        statusBadgeText = `🗓️ ${info.statusLabel}`;
      }

      return `
        <article class="card-item-box ${isPaid ? 'card-paid' : ''} ${isFinished ? 'card-finished' : ''}">
          
          <!-- Encabezado estilo Tarjeta Física -->
          <div class="card-visual-header" style="background: ${theme.bg}; color: ${theme.text};">
            <div class="card-visual-top">
              <span class="card-brand-chip">${theme.tag}</span>
              <span class="card-due-day">Vence día ${card.dueDay}</span>
            </div>
            <div class="card-visual-name">${this.escapeHtml(card.cardName)}</div>
            <div class="card-visual-desc">
              <span>${catIcon} ${this.escapeHtml(card.description)}</span>
            </div>
          </div>

          <!-- Cuerpo de Información de la Cuota -->
          <div class="card-item-body">
            
            <div class="card-status-row">
              <span class="status-pill ${statusBadgeClass}">${statusBadgeText}</span>
              <span class="card-category-label">${card.category || 'Varios'}</span>
            </div>

            <!-- Importes -->
            <div class="card-amounts-grid">
              <div class="card-amount-block">
                <span class="amount-label">Cuota de este mes:</span>
                <strong class="amount-highlight">$${Number(info.amount).toLocaleString('es-AR')}</strong>
              </div>
              <div class="card-amount-block text-right">
                <span class="amount-label">Total de la compra:</span>
                <span class="amount-muted">$${Number(card.totalAmount).toLocaleString('es-AR')}</span>
              </div>
            </div>

            <!-- Barra de Progreso de Cuotas -->
            <div class="installments-progress-container">
              <div class="progress-labels">
                <span>Progreso: <strong>${info.progressPct}%</strong></span>
                <span>${info.currentNumber} de ${info.total} cuotas</span>
              </div>
              <div class="progress-bar-track">
                <div class="progress-bar-fill" style="width: ${info.progressPct}%;"></div>
              </div>
              <div class="progress-subtext">
                ${isFinished 
                  ? '✨ Compra 100% saldada' 
                  : `Quedan ${info.remainingInstallments} cuota(s) pendiente(s) ($${(info.remainingInstallments * info.amount).toLocaleString('es-AR')})`}
              </div>
            </div>

            ${card.notes ? `
              <div class="card-notes-row">
                📌 <span>${this.escapeHtml(card.notes)}</span>
              </div>
            ` : ''}

            ${isPaid && info.payment ? `
              <div class="card-paid-info">
                ✓ Abonado el ${info.payment.paidDate} (${info.payment.method})
                ${info.payment.receiptNote ? ` - ${this.escapeHtml(info.payment.receiptNote)}` : ''}
              </div>
            ` : ''}

          </div>

          <!-- Pie con Acciones -->
          <div class="card-item-footer">
            ${!isFinished && !isFuture ? (
              isPaid ? `
                <button class="btn-paid-status" onclick="window.cardsManager.unmarkPaid('${card.id}', '${yearMonth}')" title="Desmarcar pago">
                  <span>✓ Pagado (Desmarcar)</span>
                </button>
              ` : `
                <button class="btn-pay-action btn-pay-card" onclick="window.cardsManager.openPayModal('${card.id}', '${yearMonth}')">
                  <span>💵 Pagar Cuota</span>
                </button>
              `
            ) : (
              isFinished ? `<span class="finished-label">✅ Saldada</span>` : `<span class="future-label">🗓️ Inicia en ${card.startYearMonth}</span>`
            )}

            <div class="service-card-menu">
              <button class="btn-card-icon" onclick="window.cardsManager.openEditModal('${card.id}')" title="Editar cuota">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              </button>
              <button class="btn-card-icon btn-delete" onclick="window.cardsManager.deleteCard('${card.id}')" title="Eliminar compra">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            </div>
          </div>

        </article>
      `;
    }).join('');
  }

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
      tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
  }

  openAddModal() {
    const title = document.getElementById('cardModalTitle');
    if (title) title.textContent = 'Agregar Compra en Cuotas';

    document.getElementById('cardForm').reset();
    document.getElementById('cardId').value = '';
    
    // Mes actual por defecto
    const today = new Date();
    const currYM = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    document.getElementById('cardStartYearMonth').value = currYM;
    document.getElementById('cardTotalInstallments').value = '6';
    document.getElementById('cardDueDay').value = '10';

    window.app.openModal('cardModal');
  }

  openEditModal(cardId) {
    const card = window.store.getCardById(cardId);
    if (!card) return;

    const title = document.getElementById('cardModalTitle');
    if (title) title.textContent = 'Editar Compra en Cuotas';

    document.getElementById('cardId').value = card.id;
    document.getElementById('cardName').value = card.cardName;
    document.getElementById('cardBrand').value = card.cardBrand || 'Visa';
    document.getElementById('cardDescription').value = card.description;
    document.getElementById('cardCategory').value = card.category || 'Hogar';
    document.getElementById('cardTotalAmount').value = card.totalAmount;
    document.getElementById('cardTotalInstallments').value = card.totalInstallments;
    document.getElementById('cardInstallmentAmount').value = card.installmentAmount;
    document.getElementById('cardStartYearMonth').value = card.startYearMonth;
    document.getElementById('cardDueDay').value = card.dueDay || 10;
    document.getElementById('cardNotes').value = card.notes || '';

    window.app.openModal('cardModal');
  }

  openPayModal(cardId, yearMonth) {
    const card = window.store.getCardById(cardId);
    if (!card) return;

    const info = window.store.getCardInstallmentInfo(card, yearMonth);

    document.getElementById('cardPayId').value = card.id;
    document.getElementById('cardPayBannerName').textContent = `${card.cardName} - ${card.description}`;
    document.getElementById('cardPayBannerDetail').textContent = `${info.statusLabel} • Vence día ${card.dueDay}`;
    
    document.getElementById('cardPayAmount').value = info.amount;
    
    const todayStr = new Date().toISOString().split('T')[0];
    document.getElementById('cardPayDate').value = todayStr;
    document.getElementById('cardPayReceiptNote').value = '';
    document.getElementById('cardPayMethod').value = 'Débito en Cuenta Bancaria';

    window.app.openModal('cardPayModal');
  }

  unmarkPaid(cardId, yearMonth) {
    if (confirm('¿Deseas desmarcar el pago de esta cuota y dejarla como pendiente?')) {
      window.store.removeCardPayment(cardId, yearMonth);
      window.app.refreshAll();
      window.app.showToast('Cuota marcada como pendiente', 'warning');
    }
  }

  deleteCard(cardId) {
    const card = window.store.getCardById(cardId);
    if (!card) return;

    if (confirm(`¿Eliminar la compra en cuotas "${card.description}" (${card.cardName})?`)) {
      window.store.deleteCard(cardId);
      window.app.refreshAll();
      window.app.showToast(`Compra "${card.description}" eliminada`, 'warning');
    }
  }

  // Recalcular monto por cuota al cambiar el total o cuotas en el modal
  calculateInstallment() {
    const total = parseFloat(document.getElementById('cardTotalAmount').value) || 0;
    const installments = parseInt(document.getElementById('cardTotalInstallments').value) || 1;
    if (total > 0 && installments > 0) {
      const perInst = Math.round((total / installments) * 100) / 100;
      document.getElementById('cardInstallmentAmount').value = perInst;
    }
  }
}

window.cardsManager = new CardsManager();
