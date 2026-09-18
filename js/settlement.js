/**
 * SETTLEMENT.JS - Módulo de Liquidación Familiar y Cuentas Claras (Estilo Splitwise)
 */

class SettlementManager {
  constructor() {
    this.containerId = 'settlementWidgetCard';
  }

  /**
   * Calcula el balance neto de cada integrante y las transferencias necesarias para saldar.
   */
  calculate(yearMonth) {
    const expenses = window.store.getExpenses(yearMonth) || [];
    const people = new Map();
    let total = 0;
    let unassigned = 0;
    const person = name => {
      if (!people.has(name)) people.set(name, { name, paid: 0, owed: 0 });
      return people.get(name);
    };
    for (const expense of expenses) {
      const cents = Math.round(Number(expense.amount) * 100);
      const shares = expense.split?.participants;
      if (!Array.isArray(shares) || !shares.length ||
          shares.some(p => !p.name || !Number.isSafeInteger(p.cents) || p.cents < 0) ||
          shares.reduce((sum, p) => sum + p.cents, 0) !== cents) {
        unassigned++;
        continue;
      }
      person(expense.paidBy || 'Yo').paid += cents;
      for (const share of shares) person(share.name).owed += share.cents;
      total += cents;
    }
    const balances = [...people.values()].map(p => ({
      name: p.name, paid: p.paid / 100, owed: p.owed / 100,
      net: (p.paid - p.owed) / 100,
      status: p.paid > p.owed ? 'creditor' : p.paid < p.owed ? 'debtor' : 'settled'
    })).sort((a, b) => b.net - a.net);
    const creditors = balances.filter(p => p.net > 0).map(p => ({ name: p.name, cents: Math.round(p.net * 100) }));
    const debtors = balances.filter(p => p.net < 0).map(p => ({ name: p.name, cents: Math.round(-p.net * 100) }));
    const transfers = [];
    let c = 0, d = 0;
    while (c < creditors.length && d < debtors.length) {
      const cents = Math.min(creditors[c].cents, debtors[d].cents);
      transfers.push({ from: debtors[d].name, to: creditors[c].name, amount: cents / 100 });
      creditors[c].cents -= cents;
      debtors[d].cents -= cents;
      if (!creditors[c].cents) c++;
      if (!debtors[d].cents) d++;
    }
    return { totalSpent: total / 100, memberCount: people.size, balances, transfers, unassigned };
  }

  /**
   * Renderiza el widget de liquidación en el dashboard y/o pestaña de gastos
   */
  render(yearMonth) {
    const containers = [
      document.getElementById('settlementDashboardCard'),
      document.getElementById('settlementExpensesCard')
    ].filter(Boolean);

    if (containers.length === 0) return;

    const data = this.calculate(yearMonth);

    const htmlContent = this.generateHtml(data, yearMonth);

    containers.forEach(container => {
      container.innerHTML = htmlContent;
    });
  }

  generateHtml(data, yearMonth) {
    if (data.totalSpent === 0 || data.memberCount <= 1) {
      return `
        <div class="settlement-card">
          <div class="settlement-header">
            <div class="settlement-title-box">
              <span class="settlement-icon">🤝</span>
              <div>
                <h4>Liquidación de Cuentas (Splitwise Familiar)</h4>
                <p>Balances netos y reintegros automáticos entre familiares</p>
              </div>
            </div>
          </div>
          <div class="settlement-empty">
            <span class="settlement-empty-icon">⚖️</span>
            <p>Agregá un gasto con participantes para calcular el reparto. ${data.unassigned ? `${data.unassigned} gasto(s) sin reparto: editalos para incluirlos.` : ''}</p>
          </div>
        </div>
      `;
    }

    return `
      <div class="settlement-card">
        <div class="settlement-header">
          <div class="settlement-title-box">
            <span class="settlement-icon">🤝</span>
            <div>
              <h4>Liquidación de Cuentas (Splitwise Familiar)</h4>
              <p>Total Gastado: <strong>$${data.totalSpent.toLocaleString('es-AR')}</strong> • Según el reparto de cada gasto</p>
            </div>
          </div>
          <button class="btn btn-sm btn-outline-whatsapp" onclick="window.settlementManager.shareWhatsApp('${yearMonth}')" title="Enviar balances al grupo familiar">
            <span>📲 Compartir Liquidación</span>
          </button>
        </div>

        <p>${data.unassigned ? `${data.unassigned} gasto(s) sin reparto, excluidos del cálculo. Editalos para incluirlos.` : 'Todos los gastos tienen reparto.'}</p>
        <!-- Grid de Balances Netos de Cada Miembro -->
        <div class="settlement-members-grid">
          ${data.balances.map(b => {
            const isCreditor = b.status === 'creditor';
            const isDebtor = b.status === 'debtor';
            const statusClass = isCreditor ? 'balance-creditor' : isDebtor ? 'balance-debtor' : 'balance-settled';
            const badgeText = isCreditor 
              ? `Le deben $${Math.abs(b.net).toLocaleString('es-AR')}`
              : isDebtor 
                ? `Debe reintegrar $${Math.abs(b.net).toLocaleString('es-AR')}`
                : 'Al día (Sin deuda)';
            const icon = isCreditor ? '🟢' : isDebtor ? '🔴' : '⚪';

            return `
              <div class="settlement-member-item ${statusClass}">
                <div class="member-head">
                  <span class="member-avatar">${b.name.charAt(0).toUpperCase()}</span>
                  <div class="member-name-area">
                    <strong class="member-name">${this.escapeHtml(b.name)}</strong>
                    <span class="member-paid-total">Pagó: ${b.paid.toLocaleString('es-AR')} · Le corresponde: ${b.owed.toLocaleString('es-AR')}</span>
                  </div>
                </div>
                <div class="member-net-badge">
                  <span>${icon} ${badgeText}</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Lista de Transferencias para quedar a mano -->
        <div class="settlement-transfers-box">
          <div class="transfers-title">
            <span class="transfer-icon">💸</span>
            <strong>Transferencias sugeridas para quedar a mano:</strong>
          </div>
          ${data.transfers.length === 0 ? `
            <div class="transfers-all-settled">
              <span>🎉 ¡Todos los integrantes están al día y a mano!</span>
            </div>
          ` : `
            <div class="transfers-list">
              ${data.transfers.map(t => `
                <div class="transfer-row">
                  <div class="transfer-party from-party">
                    <span class="party-avatar">${t.from.charAt(0).toUpperCase()}</span>
                    <strong>${this.escapeHtml(t.from)}</strong>
                  </div>
                  <div class="transfer-arrow-box">
                    <span class="transfer-amount">$${t.amount.toLocaleString('es-AR')}</span>
                    <span class="transfer-arrow">➡️</span>
                  </div>
                  <div class="transfer-party to-party">
                    <span class="party-avatar">${t.to.charAt(0).toUpperCase()}</span>
                    <strong>${this.escapeHtml(t.to)}</strong>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      </div>
    `;
  }

  shareWhatsApp(yearMonth) {
    const data = this.calculate(yearMonth);
    if (data.totalSpent === 0) return;

    let msg = `🤝 *LIQUIDACIÓN DE CUENTAS FAMILIARES*\n`;
    msg += `📅 Mes: ${yearMonth}\n`;
    msg += `💰 Gasto Total Compartido: *$${data.totalSpent.toLocaleString('es-AR')}*\n`;
    msg += `Reparto según cada gasto. ${data.unassigned} gasto(s) sin reparto excluidos.\n\n`;
    
    msg += `📊 *Balances Individuales:*\n`;
    data.balances.forEach(b => {
      if (b.status === 'creditor') {
        msg += `• *${b.name}*: puso $${b.paid.toLocaleString('es-AR')} ➡️ *Le deben $${b.net.toLocaleString('es-AR')}* 🟢\n`;
      } else if (b.status === 'debtor') {
        msg += `• *${b.name}*: puso $${b.paid.toLocaleString('es-AR')} ➡️ *Debe reintegrar $${Math.abs(b.net).toLocaleString('es-AR')}* 🔴\n`;
      } else {
        msg += `• *${b.name}*: puso $${b.paid.toLocaleString('es-AR')} ➡️ *Al día* ⚪\n`;
      }
    });

    if (data.transfers.length > 0) {
      msg += `\n💸 *Transferencias para quedar a mano:*\n`;
      data.transfers.forEach(t => {
        msg += `👉 *${t.from}* le transfiere *$${t.amount.toLocaleString('es-AR')}* a *${t.to}*\n`;
      });
    } else {
      msg += `\n🎉 ¡Todos los miembros están a mano!`;
    }

    msg += `\n_Generado con la App de Gastos de Mi Hogar_`;

    const encoded = encodeURIComponent(msg);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  }

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
      tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
  }
}

// Instancia global
window.settlementManager = new SettlementManager();
