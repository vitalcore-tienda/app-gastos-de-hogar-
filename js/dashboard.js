/**
 * DASHBOARD.JS - Cálculos de métricas (KPIs), Alertas y Gráficos (Chart.js)
 */

class DashboardManager {
  constructor() {
    this.categoryChart = null;
    this.splitChart = null;
  }

  update(yearMonth) {
    const services = window.store.getServices();
    const expenses = window.store.getExpenses(yearMonth);
    const cardsSummary = window.store.getCardsSummary(yearMonth);
    const activeCards = cardsSummary.activeCards;

    let totalServicesAmount = 0;
    let totalServicesPaid = 0;
    let totalServicesPending = 0;
    let paidCount = 0;
    let pendingCount = 0;

    let overdueList = [];
    let upcomingList = [];

    const today = new Date();
    const todayDay = today.getDate();
    const [year, month] = yearMonth.split('-').map(Number);
    const isCurrentMonth = (year === today.getFullYear() && month === (today.getMonth() + 1));
    const isPastMonth = (year < today.getFullYear() || (year === today.getFullYear() && month < (today.getMonth() + 1)));

    // Procesar Servicios
    services.forEach(s => {
      const status = window.servicesManager.getServiceStatus(s, yearMonth);
      if (status.type === 'paid') {
        const paidAmt = Number(status.payment.paidAmount || s.defaultAmount);
        totalServicesAmount += paidAmt;
        totalServicesPaid += paidAmt;
        paidCount++;
      } else {
        const estAmt = Number(s.defaultAmount || 0);
        totalServicesAmount += estAmt;
        totalServicesPending += estAmt;
        pendingCount++;

        if (status.type === 'overdue') {
          overdueList.push({ name: s.name, dueDay: s.dueDay, amount: estAmt, type: 'Servicio' });
        } else if (isCurrentMonth && s.dueDay >= todayDay && (s.dueDay - todayDay <= 5)) {
          upcomingList.push({ name: s.name, dueDay: s.dueDay, amount: estAmt, type: 'Servicio' });
        }
      }
    });

    // Procesar Cuotas de Tarjetas
    let totalCardsAmount = cardsSummary.totalMonthAmount;
    let totalCardsPaid = cardsSummary.paidAmount;
    let totalCardsPending = cardsSummary.pendingAmount;
    let cardPaidCount = cardsSummary.paidCount;
    let cardPendingCount = cardsSummary.pendingCount;

    activeCards.forEach(c => {
      if (!c.installmentInfo.isPaid) {
        if (isPastMonth) {
          overdueList.push({ name: `${c.cardName} (${c.description} - ${c.installmentInfo.statusLabel})`, dueDay: c.dueDay, amount: c.installmentInfo.amount, type: 'Tarjeta' });
        } else if (isCurrentMonth) {
          if (todayDay > c.dueDay) {
            overdueList.push({ name: `${c.cardName} (${c.description} - ${c.installmentInfo.statusLabel})`, dueDay: c.dueDay, amount: c.installmentInfo.amount, type: 'Tarjeta' });
          } else if (c.dueDay - todayDay <= 5) {
            upcomingList.push({ name: `${c.cardName} (${c.description} - ${c.installmentInfo.statusLabel})`, dueDay: c.dueDay, amount: c.installmentInfo.amount, type: 'Tarjeta' });
          }
        }
      }
    });

    const totalExpensesAmount = expenses.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
    const totalExpensesCount = expenses.length;

    // Totales Globales
    const grandTotal = totalServicesAmount + totalExpensesAmount + totalCardsAmount;
    const grandPaid = totalServicesPaid + totalExpensesAmount + totalCardsPaid; // los gastos anotados ya están pagados
    const grandPending = totalServicesPending + totalCardsPending;
    const totalPendingItems = pendingCount + cardPendingCount;

    // Actualizar KPIs en DOM
    document.getElementById('kpiTotalAmount').textContent = `$${grandTotal.toLocaleString('es-AR')}`;
    document.getElementById('kpiTotalCount').textContent = `${services.length} serv. + ${activeCards.length} cuotas + ${totalExpensesCount} compras`;

    document.getElementById('kpiPaidAmount').textContent = `$${grandPaid.toLocaleString('es-AR')}`;
    document.getElementById('kpiPaidCount').textContent = `${paidCount + cardPaidCount} abonos + ${totalExpensesCount} compras`;

    document.getElementById('kpiPendingAmount').textContent = `$${grandPending.toLocaleString('es-AR')}`;
    document.getElementById('kpiPendingCount').textContent = `${totalPendingItems} pendientes (${pendingCount} serv. + ${cardPendingCount} cuotas)`;

    // Próximo Vencimiento
    const nextTitle = document.getElementById('kpiNextTitle');
    const nextDetail = document.getElementById('kpiNextDetail');

    if (totalPendingItems === 0 && (services.length > 0 || activeCards.length > 0)) {
      nextTitle.textContent = '🎉 ¡Todo al día!';
      nextDetail.textContent = 'No hay pagos pendientes este mes';
    } else if (upcomingList.length > 0) {
      const next = upcomingList.sort((a, b) => a.dueDay - b.dueDay)[0];
      nextTitle.textContent = `${next.name} ($${Number(next.amount).toLocaleString('es-AR')})`;
      nextDetail.textContent = `Vence día ${next.dueDay} (en ${next.dueDay - todayDay} días)`;
    } else if (overdueList.length > 0) {
      const overdue = overdueList[0];
      nextTitle.textContent = `⚠️ ${overdue.name}`;
      nextDetail.textContent = `Venció el día ${overdue.dueDay}`;
    } else if (services.length > 0 || activeCards.length > 0) {
      // Buscar el siguiente pendiente por orden de día combinando servicios y tarjetas
      const pendingServices = services
        .filter(s => window.servicesManager.getServiceStatus(s, yearMonth).type !== 'paid')
        .map(s => ({ name: s.name, dueDay: s.dueDay, amount: s.defaultAmount }));
      
      const pendingCardInst = activeCards
        .filter(c => !c.installmentInfo.isPaid)
        .map(c => ({ name: `${c.cardName} (${c.description})`, dueDay: c.dueDay, amount: c.installmentInfo.amount }));

      const allPending = [...pendingServices, ...pendingCardInst].sort((a, b) => a.dueDay - b.dueDay);
      if (allPending.length > 0) {
        const next = allPending[0];
        nextTitle.textContent = `${next.name} ($${Number(next.amount).toLocaleString('es-AR')})`;
        nextDetail.textContent = `Vence día ${next.dueDay}`;
      }
    } else {
      nextTitle.textContent = 'Sin compromisos';
      nextDetail.textContent = 'Agrega tus primeros servicios o tarjetas';
    }

    // Renderizar Widget de Presupuesto Mensual
    const budget = window.store.getBudget(yearMonth);
    this.renderBudgetBar(grandTotal, budget, yearMonth);

    // Renderizar Banner de Alertas (incluyendo alerta de presupuesto si corresponde)
    const isOverBudget = grandTotal > budget;
    this.renderAlertBanner(overdueList, upcomingList, totalPendingItems, services.length + activeCards.length, isOverBudget, grandTotal - budget);

    // Renderizar Gráficos y Tablas
    this.renderCharts(services, expenses, activeCards, yearMonth, grandTotal, totalServicesAmount, totalExpensesAmount, totalCardsAmount);

    // Renderizar Liquidación de Cuentas (Splitwise)
    if (window.settlementManager) {
      window.settlementManager.render(yearMonth);
    }
  }

  renderBudgetBar(grandTotal, budget, yearMonth) {
    const limitEl = document.getElementById('budgetTotalLimit');
    const consumedEl = document.getElementById('budgetConsumedAmount');
    const remainingEl = document.getElementById('budgetRemainingAmount');
    const fillEl = document.getElementById('budgetProgressFill');
    const badgeEl = document.getElementById('budgetStatusBadge');

    if (!limitEl || !consumedEl || !remainingEl || !fillEl || !badgeEl) return;

    limitEl.textContent = `$${budget.toLocaleString('es-AR')}`;
    const pct = budget > 0 ? (grandTotal / budget) * 100 : 0;
    const diff = budget - grandTotal;

    consumedEl.textContent = `$${grandTotal.toLocaleString('es-AR')} (${pct.toFixed(0)}%)`;

    fillEl.style.width = `${Math.min(pct, 100)}%`;

    if (diff < 0) {
      const overAmt = Math.abs(diff);
      remainingEl.innerHTML = `<span class="text-danger font-bold">⚠️ Excedido por $${overAmt.toLocaleString('es-AR')}</span>`;
      badgeEl.className = 'status-pill pill-overdue';
      badgeEl.innerHTML = `🔴 Presupuesto Excedido (+${(pct - 100).toFixed(0)}%)`;
      fillEl.style.background = 'linear-gradient(90deg, #f59e0b 0%, #ef4444 100%)';
    } else if (pct >= 75) {
      remainingEl.innerHTML = `<span class="text-warning font-bold">Disponible: $${diff.toLocaleString('es-AR')}</span>`;
      badgeEl.className = 'status-pill pill-pending';
      badgeEl.innerHTML = `🟡 En Alerta (${pct.toFixed(0)}% consumido)`;
      fillEl.style.background = 'linear-gradient(90deg, #10b981 0%, #f59e0b 100%)';
    } else {
      remainingEl.innerHTML = `<span class="text-success font-bold">Disponible: $${diff.toLocaleString('es-AR')}</span>`;
      badgeEl.className = 'status-pill pill-paid';
      badgeEl.innerHTML = `🟢 Saludable (Te quedan $${diff.toLocaleString('es-AR')})`;
      fillEl.style.background = 'linear-gradient(90deg, #3b82f6 0%, #10b981 100%)';
    }
  }

  renderAlertBanner(overdueList, upcomingList, totalPendingItems, totalItems, isOverBudget = false, overBudgetAmount = 0) {
    const container = document.getElementById('alertBannerContainer');
    if (!container) return;

    if (totalItems === 0 && !isOverBudget) {
      container.innerHTML = '';
      return;
    }

    if (isOverBudget) {
      container.innerHTML = `
        <div class="alert-banner alert-danger">
          <div class="alert-banner-content">
            <span class="alert-banner-icon">🚨</span>
            <span><strong>¡Atención Familiar!</strong> Los gastos totales del mes superaron el presupuesto asignado por <strong>$${Number(overBudgetAmount).toLocaleString('es-AR')}</strong>.</span>
          </div>
        </div>
      `;
    } else if (overdueList.length > 0) {
      const names = overdueList.map(s => `<strong>${s.name}</strong>`).join(', ');
      container.innerHTML = `
        <div class="alert-banner alert-danger">
          <div class="alert-banner-content">
            <span class="alert-banner-icon">⚠️</span>
            <span>Tenés <strong>${overdueList.length} pago(s) vencido(s) o impago(s)</strong>: ${names}.</span>
          </div>
        </div>
      `;
    } else if (upcomingList.length > 0) {
      const names = upcomingList.map(s => `<strong>${s.name}</strong> (día ${s.dueDay})`).join(', ');
      container.innerHTML = `
        <div class="alert-banner alert-warning">
          <div class="alert-banner-content">
            <span class="alert-banner-icon">⏳</span>
            <span>Atención: Vencen en los próximos días: ${names}.</span>
          </div>
        </div>
      `;
    } else if (totalPendingItems === 0) {
      container.innerHTML = `
        <div class="alert-banner alert-success">
          <div class="alert-banner-content">
            <span class="alert-banner-icon">🎉</span>
            <span>¡Excelente noticia! Todos los servicios y cuotas de tarjetas del mes están pagados.</span>
          </div>
        </div>
      `;
    } else {
      container.innerHTML = '';
    }
  }

  renderCharts(services, expenses, activeCards, yearMonth, grandTotal, totalServices, totalExpenses, totalCards) {
    const categoryTotals = {};

    // Sumar servicios por categoría
    services.forEach(s => {
      const status = window.servicesManager.getServiceStatus(s, yearMonth);
      const amt = status.type === 'paid' ? Number(status.payment.paidAmount) : Number(s.defaultAmount);
      categoryTotals[s.category] = (categoryTotals[s.category] || 0) + amt;
    });

    // Sumar cuotas de tarjetas
    activeCards.forEach(c => {
      const cat = c.category ? `💳 ${c.category}` : '💳 Tarjetas en Cuotas';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + Number(c.installmentInfo.amount);
    });

    // Sumar gastos cotidianos
    expenses.forEach(e => {
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + Number(e.amount);
    });

    // 1. Gráfico Circular de Categorías
    const ctxCategory = document.getElementById('categoryChart');
    if (ctxCategory && typeof Chart !== 'undefined') {
      const labels = Object.keys(categoryTotals);
      const data = Object.values(categoryTotals);

      const colorPalette = [
        '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', 
        '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#64748b'
      ];

      if (this.categoryChart) {
        this.categoryChart.destroy();
      }

      if (data.length > 0) {
        this.categoryChart = new Chart(ctxCategory, {
          type: 'doughnut',
          data: {
            labels: labels,
            datasets: [{
              data: data,
              backgroundColor: colorPalette.slice(0, labels.length),
              borderWidth: 2,
              borderColor: document.documentElement.getAttribute('data-theme') === 'dark' ? '#151d2e' : '#ffffff',
              borderRadius: 6,
              spacing: 3
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
              legend: {
                position: 'bottom',
                labels: {
                  color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#f8fafc' : '#0f172a',
                  font: { family: 'Plus Jakarta Sans', size: 12, weight: '600' },
                  padding: 14,
                  usePointStyle: true,
                  pointStyle: 'circle'
                }
              },
              tooltip: {
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                titleFont: { family: 'Plus Jakarta Sans', size: 13, weight: 'bold' },
                bodyFont: { family: 'Plus Jakarta Sans', size: 12 },
                padding: 12,
                cornerRadius: 8,
                callbacks: {
                  label: function(context) {
                    const val = context.raw || 0;
                    const pct = grandTotal > 0 ? ((val / grandTotal) * 100).toFixed(1) : 0;
                    return ` ${context.label}: $${Number(val).toLocaleString('es-AR')} (${pct}%)`;
                  }
                }
              }
            }
          }
        });
      }
    }

    // 2. Gráfico de Proporción Servicios vs Gastos Variables vs Cuotas
    const ctxSplit = document.getElementById('splitChart');
    if (ctxSplit && typeof Chart !== 'undefined') {
      if (this.splitChart) {
        this.splitChart.destroy();
      }

      this.splitChart = new Chart(ctxSplit, {
        type: 'bar',
        data: {
          labels: ['Servicios Fijos', 'Cuotas Tarjetas', 'Gastos Cotidianos'],
          datasets: [{
            label: 'Monto ($)',
            data: [totalServices, totalCards || 0, totalExpenses],
            backgroundColor: ['#3b82f6', '#8b5cf6', '#10b981'],
            borderRadius: 8
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: function(context) {
                  return ` Total: $${Number(context.raw).toLocaleString('es-AR')}`;
                }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: function(value) {
                  return '$' + Number(value).toLocaleString('es-AR');
                },
                color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#94a3b8' : '#64748b'
              }
            },
            x: {
              ticks: {
                color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#f8fafc' : '#0f172a'
              }
            }
          }
        }
      });
    }

    // 3. Tabla de Detalle Consolidado
    const tableBody = document.getElementById('analyticsTableBody');
    if (tableBody) {
      let rowsHtml = '';

      // Servicios
      services.forEach(s => {
        const status = window.servicesManager.getServiceStatus(s, yearMonth);
        const isPaid = status.type === 'paid';
        const amt = isPaid ? Number(status.payment.paidAmount) : Number(s.defaultAmount);
        const pct = grandTotal > 0 ? ((amt / grandTotal) * 100).toFixed(1) : '0';

        rowsHtml += `
          <tr>
            <td><strong>${s.name}</strong> <small style="color:var(--text-muted);">(${s.category})</small></td>
            <td>Servicio Fijo</td>
            <td><span class="status-pill ${status.class}" style="font-size:0.7rem; padding: 2px 6px;">${status.label}</span></td>
            <td><strong>$${amt.toLocaleString('es-AR')}</strong></td>
            <td>${pct}%</td>
          </tr>
        `;
      });

      // Cuotas de Tarjetas
      activeCards.forEach(c => {
        const isPaid = c.installmentInfo.isPaid;
        const amt = Number(c.installmentInfo.amount);
        const pct = grandTotal > 0 ? ((amt / grandTotal) * 100).toFixed(1) : '0';
        const statusClass = isPaid ? 'pill-paid' : 'pill-pending';
        const statusText = isPaid ? `✅ Cuota ${c.installmentInfo.currentNumber}/${c.installmentInfo.total} Pagada` : `⏳ Cuota ${c.installmentInfo.currentNumber}/${c.installmentInfo.total}`;

        rowsHtml += `
          <tr>
            <td><strong>${c.description}</strong> <small style="color:var(--text-muted);">(${c.cardName} - ${c.category})</small></td>
            <td>Tarjeta / Cuotas</td>
            <td><span class="status-pill ${statusClass}" style="font-size:0.7rem; padding: 2px 6px;">${statusText}</span></td>
            <td><strong>$${amt.toLocaleString('es-AR')}</strong></td>
            <td>${pct}%</td>
          </tr>
        `;
      });

      // Gastos
      expenses.forEach(e => {
        const pct = grandTotal > 0 ? ((Number(e.amount) / grandTotal) * 100).toFixed(1) : '0';
        rowsHtml += `
          <tr>
            <td><strong>${e.title}</strong> <small style="color:var(--text-muted);">(${e.category})</small></td>
            <td>Gasto Diario</td>
            <td><span class="status-pill pill-paid" style="font-size:0.7rem; padding: 2px 6px;">✅ Pagado</span></td>
            <td><strong>$${Number(e.amount).toLocaleString('es-AR')}</strong></td>
            <td>${pct}%</td>
          </tr>
        `;
      });

      tableBody.innerHTML = rowsHtml || '<tr><td colspan="5" style="text-align:center; padding: 1.5rem;">No hay datos en este mes</td></tr>';
    }
  }
}

window.dashboardManager = new DashboardManager();
