/**
 * SERVICES.JS - Módulo de Gestión y Renderizado de Servicios e Impuestos
 */

const CATEGORY_ICONS = {
  Luz: '⚡',
  Gas: '🔥',
  Agua: '💧',
  Internet: '🌐',
  Celular: '📱',
  Expensas: '🏢',
  Impuestos: '🏛️',
  Seguros: '🛡️',
  Streaming: '🎬',
  Otros: '📋'
};

class ServicesManager {
  constructor() {
    this.currentFilter = 'all';
    this.searchQuery = '';
    this.currentSort = 'due-asc';
  }

  getServiceIcon(category) {
    return CATEGORY_ICONS[category] || '📋';
  }

  getServiceStatus(service, yearMonth) {
    const payment = window.store.getPayment(service.id, yearMonth);
    if (payment && payment.paid) {
      return {
        type: 'paid',
        label: '✅ Pagado',
        class: 'pill-paid',
        cardClass: 'card-paid',
        payment
      };
    }

    // Calcular si está vencido o por vencer
    const [year, month] = yearMonth.split('-').map(Number);
    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth() + 1;
    const todayDay = today.getDate();

    const isCurrentMonth = (year === todayYear && month === todayMonth);
    const isPastMonth = (year < todayYear || (year === todayYear && month < todayMonth));

    if (isPastMonth) {
      return {
        type: 'overdue',
        label: '⚠️ Impago (Mes Pasado)',
        class: 'pill-overdue',
        cardClass: 'card-overdue'
      };
    }

    if (isCurrentMonth) {
      if (todayDay > service.dueDay) {
        const daysOver = todayDay - service.dueDay;
        return {
          type: 'overdue',
          label: `⚠️ Vencido (hace ${daysOver} d)`,
          class: 'pill-overdue',
          cardClass: 'card-overdue'
        };
      } else if (service.dueDay - todayDay <= 4) {
        const daysLeft = service.dueDay - todayDay;
        const text = daysLeft === 0 ? '¡Vence Hoy!' : `Vence en ${daysLeft} d`;
        return {
          type: 'pending',
          label: `⏳ ${text}`,
          class: 'pill-pending',
          cardClass: 'card-pending'
        };
      }
    }

    return {
      type: 'pending',
      label: `⏳ Vence día ${service.dueDay}`,
      class: 'pill-pending',
      cardClass: 'card-pending'
    };
  }

  render(yearMonth) {
    const grid = document.getElementById('servicesGrid');
    const emptyState = document.getElementById('servicesEmptyState');
    if (!grid) return;

    let services = window.store.getServices();

    // Actualizar contadores de filtros
    let totalCount = services.length;
    let pendingCount = 0;
    let paidCount = 0;

    services.forEach(s => {
      const status = this.getServiceStatus(s, yearMonth);
      if (status.type === 'paid') paidCount++;
      else pendingCount++;
    });

    document.getElementById('countFilterAll').textContent = totalCount;
    document.getElementById('countFilterPending').textContent = pendingCount;
    document.getElementById('countFilterPaid').textContent = paidCount;
    
    const badge = document.getElementById('servicesPendingBadge');
    if (badge) badge.textContent = pendingCount;

    // Filtrar
    if (this.currentFilter === 'pending') {
      services = services.filter(s => this.getServiceStatus(s, yearMonth).type !== 'paid');
    } else if (this.currentFilter === 'paid') {
      services = services.filter(s => this.getServiceStatus(s, yearMonth).type === 'paid');
    }

    // Buscar
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      services = services.filter(s => 
        s.name.toLowerCase().includes(q) ||
        (s.provider && s.provider.toLowerCase().includes(q)) ||
        (s.clientCode && s.clientCode.toLowerCase().includes(q)) ||
        s.category.toLowerCase().includes(q)
      );
    }

    // Ordenar
    services.sort((a, b) => {
      if (this.currentSort === 'due-asc') return a.dueDay - b.dueDay;
      if (this.currentSort === 'due-desc') return b.dueDay - a.dueDay;
      if (this.currentSort === 'name-asc') return a.name.localeCompare(b.name);
      if (this.currentSort === 'amount-desc') return b.defaultAmount - a.defaultAmount;
      return 0;
    });

    if (services.length === 0) {
      grid.innerHTML = '';
      emptyState.classList.remove('hidden');
      return;
    }

    emptyState.classList.add('hidden');

    grid.innerHTML = services.map(service => {
      const status = this.getServiceStatus(service, yearMonth);
      const isPaid = status.type === 'paid';
      const icon = this.getServiceIcon(service.category);
      const amountToDisplay = isPaid ? status.payment.paidAmount : service.defaultAmount;

      return `
        <article class="service-card ${status.cardClass}" data-id="${service.id}">
          <div class="service-card-header">
            <div class="service-category-badge">
              <div class="service-icon-circle">${icon}</div>
              <div class="service-title-group">
                <h3>${this.escapeHtml(service.name)}</h3>
                <span class="service-provider-tag">${this.escapeHtml(service.provider || service.category)}</span>
              </div>
            </div>
            <span class="status-pill ${status.class}">${status.label}</span>
          </div>

          <div class="service-card-body">
            <div class="service-amount-row">
              <span class="service-amount-label">${isPaid ? 'Monto pagado:' : 'Importe estimado:'}</span>
              <span class="service-amount-value">$${Number(amountToDisplay).toLocaleString('es-AR')}</span>
            </div>

            <div class="service-due-row">
              <span>Vence habitualmente:</span>
              <span class="service-due-date">Día ${service.dueDay} de cada mes</span>
            </div>

            ${service.autoDebit ? `
              <div class="auto-debit-badge">
                <span>🔄 Débito Automático</span>
              </div>
            ` : ''}

            ${service.clientCode ? `
              <div class="service-code-box">
                <div class="code-info">
                  <span>Nº CLIENTE / CÓDIGO DE PAGO</span>
                  <strong>${this.escapeHtml(service.clientCode)}</strong>
                </div>
                <button class="btn-copy-code" onclick="window.servicesManager.copyCode('${this.escapeHtml(service.clientCode)}')" title="Copiar código">
                  📋 Copiar
                </button>
              </div>
            ` : ''}

            ${service.notes ? `
              <div style="font-size: 0.775rem; color: var(--text-muted); margin-top: 0.2rem;">
                📌 ${this.escapeHtml(service.notes)}
              </div>
            ` : ''}

            ${isPaid ? `
              <div style="font-size: 0.775rem; color: var(--color-success-dark); margin-top: 0.2rem; font-weight: 600;">
                ✓ Pagado el ${status.payment.paidDate} (${status.payment.method})
                ${status.payment.receiptNote ? ` - ${this.escapeHtml(status.payment.receiptNote)}` : ''}
              </div>
            ` : ''}
          </div>

          <div class="service-card-footer">
            ${isPaid ? `
              <button class="btn-paid-status" onclick="window.servicesManager.unmarkPaid('${service.id}', '${yearMonth}')" title="Hacer clic para anular o desmarcar el pago">
                <span>✓ Pagado (Desmarcar)</span>
              </button>
            ` : `
              <button class="btn-pay-action" onclick="window.servicesManager.openPayModal('${service.id}', '${yearMonth}')">
                <span>💵 Marcar Pagado</span>
              </button>
            `}

            <div class="service-card-menu">
              <button class="btn-card-icon" onclick="window.servicesManager.openEditModal('${service.id}')" title="Editar servicio">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              </button>
              <button class="btn-card-icon btn-delete" onclick="window.servicesManager.deleteService('${service.id}')" title="Eliminar servicio">
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

  copyCode(code) {
    navigator.clipboard.writeText(code).then(() => {
      window.app.showToast('Código copiado al portapapeles: ' + code, 'success');
    }).catch(() => {
      window.app.showToast('No se pudo copiar el código', 'warning');
    });
  }

  openPayModal(serviceId, yearMonth) {
    const service = window.store.getServiceById(serviceId);
    if (!service) return;

    document.getElementById('payServiceId').value = service.id;
    document.getElementById('payBannerIcon').textContent = this.getServiceIcon(service.category);
    document.getElementById('payBannerName').textContent = `${service.name} (${service.provider || service.category})`;
    document.getElementById('payBannerDetail').textContent = `Vencimiento habitual: Día ${service.dueDay} - Importe estimado: $${service.defaultAmount}`;
    
    document.getElementById('payAmount').value = service.defaultAmount;
    
    // Fecha por defecto: hoy
    const todayStr = new Date().toISOString().split('T')[0];
    document.getElementById('payDate').value = todayStr;
    document.getElementById('payReceiptNote').value = '';

    if (service.autoDebit) {
      document.getElementById('payMethod').value = 'Débito Automático';
    } else {
      document.getElementById('payMethod').value = 'Transferencia';
    }

    window.app.openModal('payModal');
  }

  unmarkPaid(serviceId, yearMonth) {
    if (confirm('¿Deseas desmarcar este pago y volver a dejarlo como pendiente?')) {
      window.store.removePayment(serviceId, yearMonth);
      window.app.refreshAll();
      window.app.showToast('Servicio marcado como pendiente', 'warning');
    }
  }

  openEditModal(serviceId) {
    const service = window.store.getServiceById(serviceId);
    if (!service) return;

    document.getElementById('serviceModalTitle').textContent = 'Editar Servicio del Hogar';
    document.getElementById('serviceId').value = service.id;
    document.getElementById('serviceName').value = service.name;
    document.getElementById('serviceCategory').value = service.category;
    document.getElementById('serviceProvider').value = service.provider || '';
    document.getElementById('serviceDueDay').value = service.dueDay;
    document.getElementById('serviceDefaultAmount').value = service.defaultAmount;
    document.getElementById('serviceClientCode').value = service.clientCode || '';
    document.getElementById('serviceNotes').value = service.notes || '';
    document.getElementById('serviceAutoDebit').checked = !!service.autoDebit;

    window.app.openModal('serviceModal');
  }

  deleteService(serviceId) {
    const service = window.store.getServiceById(serviceId);
    if (!service) return;

    if (confirm(`¿Estás seguro de eliminar el servicio "${service.name}"?`)) {
      window.store.deleteService(serviceId);
      window.app.refreshAll();
      window.app.showToast(`Servicio "${service.name}" eliminado`, 'warning');
    }
  }
}

window.servicesManager = new ServicesManager();
