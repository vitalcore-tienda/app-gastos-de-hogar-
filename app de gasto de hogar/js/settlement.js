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
    
    // 1. Recopilar todos los gastos y agrupar por pagador
    const memberPaid = {};
    let totalSpent = 0;

    expenses.forEach(e => {
      const payer = (e.paidBy && e.paidBy.trim()) || 'Yo';
      const amt = Number(e.amount || 0);
      memberPaid[payer] = (memberPaid[payer] || 0) + amt;
      totalSpent += amt;
    });

    const members = Object.keys(memberPaid);
    
    // Si no hay gastos o hay 0 miembros
    if (totalSpent === 0 || members.length === 0) {
      return {
        totalSpent: 0,
        memberCount: 0,
        fairShare: 0,
        balances: [],
        transfers: []
      };
    }

    // 2. Calcular cuota justa por persona (Equitativa)
    const memberCount = members.length;
    const fairShare = memberCount > 0 ? totalSpent / memberCount : 0;

    // 3. Determinar balance neto de cada miembro: (Pagado - Cuota Justa)
    // Positivo (+) => Puso de más, le deben reintegrar.
    // Negativo (-) => Puso de menos, debe pagar.
    const balances = members.map(name => {
      const paid = memberPaid[name] || 0;
      const net = paid - fairShare;
      return {
        name,
        paid,
        net: Math.round(net * 100) / 100,
        status: net > 1 ? 'creditor' : net < -1 ? 'debtor' : 'settled'
      };
    });

    // 4. Algoritmo de Compensación de Deudas (Simplificación de transferencias)
    const creditors = balances
      .filter(b => b.net > 0.5)
      .map(b => ({ name: b.name, amount: b.net }))
      .sort((a, b) => b.amount - a.amount);

    const debtors = balances
      .filter(b => b.net < -0.5)
      .map(b => ({ name: b.name, amount: -b.net }))
      .sort((a, b) => b.amount - a.amount);

    const transfers = [];
    let cIdx = 0;
    let dIdx = 0;

    while (cIdx < creditors.length && dIdx < debtors.length) {
      const creditor = creditors[cIdx];
      const debtor = debtors[dIdx];
      const settlementAmt = Math.min(creditor.amount, debtor.amount);

      if (settlementAmt > 0.5) {
        transfers.push({
          from: debtor.name,
          to: creditor.name,
          amount: Math.round(settlementAmt)
        });
      }

      creditor.amount -= settlementAmt;
      debtor.amount -= settlementAmt;

      if (creditor.amount < 0.5) cIdx++;
      if (debtor.amount < 0.5) dIdx++;
    }

    return {
      totalSpent,
      memberCount,
      fairShare: Math.round(fairShare),
      balances: balances.sort((a, b) => b.net - a.net),
      transfers
    };
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
            <p>Se necesitan gastos registrados de al menos 2 integrantes para calcular reintegros.</p>
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
              <p>Total Gastado: <strong>$${data.totalSpent.toLocaleString('es-AR')}</strong> • Cuota equitativa: <strong>$${data.fairShare.toLocaleString('es-AR')}</strong>/persona</p>
            </div>
          </div>
          <button class="btn btn-sm btn-outline-whatsapp" onclick="window.settlementManager.shareWhatsApp('${yearMonth}')" title="Enviar balances al grupo familiar">
            <span>📲 Compartir Liquidación</span>
          </button>
        </div>

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
                    <span class="member-paid-total">Aportó: $${b.paid.toLocaleString('es-AR')}</span>
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
    msg += `👤 Cuota Justa por Persona: *$${data.fairShare.toLocaleString('es-AR')}*\n\n`;
    
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
