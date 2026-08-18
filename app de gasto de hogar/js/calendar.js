/**
 * CALENDAR.JS - Vista mensual de vencimientos y gastos
 */

class CalendarManager {
  constructor() {
    this.selectedDay = null;
  }

  render(yearMonth) {
    const gridContainer = document.getElementById('calendarGridDays');
    if (!gridContainer) return;

    const [year, month] = yearMonth.split('-').map(Number);
    const firstDayIndex = new Date(year, month - 1, 1).getDay(); // 0 = Domingo
    const totalDaysInMonth = new Date(year, month, 0).getDate();
    const prevMonthDays = new Date(year, month - 1, 0).getDate();

    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth() + 1;
    const todayDay = today.getDate();

    const services = window.store.getServices();
    const expenses = window.store.getExpenses(yearMonth);
    const cardsSummary = window.store.getCardsSummary(yearMonth);
    const activeCards = cardsSummary.activeCards;

    let html = '';

    // Días del mes anterior
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthDays - i;
      html += `<div class="calendar-day-cell other-month"><span class="day-cell-number">${dayNum}</span></div>`;
    }

    // Días del mes actual
    for (let day = 1; day <= totalDaysInMonth; day++) {
      const isToday = (year === todayYear && month === todayMonth && day === todayDay);
      const isSelected = this.selectedDay === day;

      // Buscar servicios que vencen en este día
      const dayServices = services.filter(s => Number(s.dueDay) === day);

      // Buscar tarjetas que vencen en este día
      const dayCards = activeCards.filter(c => Number(c.dueDay) === day);
      
      // Buscar gastos de este día
      const dayString = `${yearMonth}-${String(day).padStart(2, '0')}`;
      const dayExpenses = expenses.filter(e => e.date === dayString);

      // Event pills
      let eventsHtml = '<div class="day-events-pills">';
      
      dayServices.forEach(s => {
        const status = window.servicesManager.getServiceStatus(s, yearMonth);
        let pillClass = 'cal-pending';
        if (status.type === 'paid') pillClass = 'cal-paid';
        else if (status.type === 'overdue') pillClass = 'cal-overdue';

        eventsHtml += `
          <span class="cal-pill ${pillClass}" title="${s.name} - $${s.defaultAmount}">
            ${s.name}
          </span>
        `;
      });

      dayCards.forEach(c => {
        const isPaid = c.installmentInfo.isPaid;
        let pillClass = isPaid ? 'cal-paid' : 'cal-card';

        eventsHtml += `
          <span class="cal-pill ${pillClass}" title="💳 ${c.cardName} (${c.installmentInfo.statusLabel}) - $${c.installmentInfo.amount}">
            💳 ${c.cardName.split(' ')[0]}: Cuota ${c.installmentInfo.currentNumber}/${c.installmentInfo.total}
          </span>
        `;
      });

      if (dayExpenses.length > 0) {
        eventsHtml += `
          <span class="cal-pill" style="background: var(--bg-secondary); color: var(--text-muted);" title="${dayExpenses.length} compras">
            🛒 ${dayExpenses.length} gasto${dayExpenses.length > 1 ? 's' : ''}
          </span>
        `;
      }
      eventsHtml += '</div>';

      html += `
        <div class="calendar-day-cell ${isToday ? 'is-today' : ''} ${isSelected ? 'is-selected' : ''}" onclick="window.calendarManager.selectDay(${day}, '${yearMonth}')">
          <span class="day-cell-number">${day}</span>
          ${eventsHtml}
        </div>
      `;
    }

    // Completar última semana
    const totalCells = firstDayIndex + totalDaysInMonth;
    const remaining = (7 - (totalCells % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      html += `<div class="calendar-day-cell other-month"><span class="day-cell-number">${i}</span></div>`;
    }

    gridContainer.innerHTML = html;

    // Si había un día seleccionado, actualizar su detalle
    if (this.selectedDay) {
      this.selectDay(this.selectedDay, yearMonth);
    } else {
      // Seleccionar por defecto el día de hoy si estamos en el mes actual, o el día 1
      const defaultDay = (year === todayYear && month === todayMonth) ? todayDay : 1;
      this.selectDay(defaultDay, yearMonth);
    }
  }

  selectDay(day, yearMonth) {
    this.selectedDay = day;
    const title = document.getElementById('calendarDetailTitle');
    const subtitle = document.getElementById('calendarDetailSubtitle');
    const itemsContainer = document.getElementById('calendarDetailItems');
    if (!title || !itemsContainer) return;

    const [year, month] = yearMonth.split('-').map(Number);
    const dayString = `${yearMonth}-${String(day).padStart(2, '0')}`;
    const dateObj = new Date(year, month - 1, day);
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateFormatted = dateObj.toLocaleDateString('es-AR', options);

    title.textContent = `Detalle del ${dateFormatted.charAt(0).toUpperCase() + dateFormatted.slice(1)}`;

    const services = window.store.getServices().filter(s => Number(s.dueDay) === day);
    const cardsSummary = window.store.getCardsSummary(yearMonth);
    const cards = cardsSummary.activeCards.filter(c => Number(c.dueDay) === day);
    const expenses = window.store.getExpenses(yearMonth).filter(e => e.date === dayString);

    if (services.length === 0 && cards.length === 0 && expenses.length === 0) {
      subtitle.textContent = 'No hay servicios ni tarjetas que venzan ni gastos registrados en esta fecha.';
      itemsContainer.innerHTML = `
        <div style="padding: 1rem; text-align: center; color: var(--text-muted); font-size: 0.9rem;">
          ✨ Día libre de vencimientos
        </div>
      `;
      return;
    }

    const totalVencimientos = services.length + cards.length;
    subtitle.textContent = `${totalVencimientos} vencimiento(s) de pago • ${expenses.length} gasto(s) del día`;

    let itemsHtml = '';

    // Renderizar servicios del día
    services.forEach(s => {
      const status = window.servicesManager.getServiceStatus(s, yearMonth);
      const isPaid = status.type === 'paid';
      const icon = window.servicesManager.getServiceIcon(s.category);

      itemsHtml += `
        <div class="expense-item" style="border-left: 4px solid ${isPaid ? 'var(--color-success)' : 'var(--color-warning)'}">
          <div class="expense-left">
            <div class="expense-category-icon">${icon}</div>
            <div class="expense-info">
              <span class="expense-title">${s.name} (${s.provider || s.category})</span>
              <div class="expense-meta">
                <span>Servicio Fijo</span>
                <span>•</span>
                <span class="status-pill ${status.class}" style="font-size: 0.7rem; padding: 2px 6px;">${status.label}</span>
                ${s.clientCode ? `<span>• Cód: ${s.clientCode}</span>` : ''}
              </div>
            </div>
          </div>
          <div class="expense-right">
            <strong class="expense-amount">$${Number(isPaid ? status.payment.paidAmount : s.defaultAmount).toLocaleString('es-AR')}</strong>
          </div>
        </div>
      `;
    });

    // Renderizar tarjetas del día
    cards.forEach(c => {
      const isPaid = c.installmentInfo.isPaid;
      const statusClass = isPaid ? 'pill-paid' : 'pill-pending';
      const statusText = isPaid ? `✅ Cuota ${c.installmentInfo.currentNumber}/${c.installmentInfo.total} Pagada` : `⏳ Cuota ${c.installmentInfo.currentNumber}/${c.installmentInfo.total}`;

      itemsHtml += `
        <div class="expense-item" style="border-left: 4px solid ${isPaid ? 'var(--color-success)' : '#8b5cf6'}">
          <div class="expense-left">
            <div class="expense-category-icon">💳</div>
            <div class="expense-info">
              <span class="expense-title">${c.cardName}: ${c.description}</span>
              <div class="expense-meta">
                <span>Tarjeta de Crédito</span>
                <span>•</span>
                <span class="status-pill ${statusClass}" style="font-size: 0.7rem; padding: 2px 6px;">${statusText}</span>
                <span>• ${c.category}</span>
              </div>
            </div>
          </div>
          <div class="expense-right">
            <strong class="expense-amount">$${Number(c.installmentInfo.amount).toLocaleString('es-AR')}</strong>
          </div>
        </div>
      `;
    });

    // Renderizar gastos del día
    expenses.forEach(e => {
      const icon = window.expensesManager.getCategoryIcon(e.category);
      itemsHtml += `
        <div class="expense-item">
          <div class="expense-left">
            <div class="expense-category-icon">${icon}</div>
            <div class="expense-info">
              <span class="expense-title">${e.title}</span>
              <div class="expense-meta">
                <span>Gasto anotado</span>
                <span>•</span>
                <span>${e.category}</span>
                ${e.notes ? `<span>• ${e.notes}</span>` : ''}
              </div>
            </div>
          </div>
          <div class="expense-right">
            <strong class="expense-amount">$${Number(e.amount).toLocaleString('es-AR')}</strong>
          </div>
        </div>
      `;
    });

    itemsContainer.innerHTML = itemsHtml;
  }
}

window.calendarManager = new CalendarManager();
