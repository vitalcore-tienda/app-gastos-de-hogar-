/**
 * WHATSAPP.JS - Generador de mensajes y recordatorios familiares por WhatsApp
 */

class WhatsAppManager {
  generateMessage(yearMonth) {
    const services = window.store.getServices();
    const expenses = window.store.getExpenses(yearMonth);
    const cardsSummary = window.store.getCardsSummary(yearMonth);
    const activeCards = cardsSummary.activeCards;

    const [year, month] = yearMonth.split('-').map(Number);
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    const monthName = monthNames[month - 1];

    let pendingList = [];
    let paidList = [];
    let totalPending = 0;
    let totalPaid = 0;

    services.forEach(s => {
      const status = window.servicesManager.getServiceStatus(s, yearMonth);
      if (status.type === 'paid') {
        const amt = Number(status.payment.paidAmount || s.defaultAmount);
        totalPaid += amt;
        paidList.push(`• *${s.name}*: $${amt.toLocaleString('es-AR')} (Pagado el ${status.payment.paidDate} vía ${status.payment.method})`);
      } else {
        const amt = Number(s.defaultAmount || 0);
        totalPending += amt;
        const codeText = s.clientCode ? ` [Cód/Nº: ${s.clientCode}]` : '';
        pendingList.push(`• *${s.name}*: $${amt.toLocaleString('es-AR')} (Vence día ${s.dueDay})${codeText}`);
      }
    });

    // Cuotas de Tarjetas
    let cardPendingList = [];
    let cardPaidList = [];
    let totalCardsPending = 0;
    let totalCardsPaid = 0;

    activeCards.forEach(c => {
      const amt = Number(c.installmentInfo.amount);
      if (c.installmentInfo.isPaid) {
        totalCardsPaid += amt;
        cardPaidList.push(`• *${c.cardName}* (${c.description}): Cuota ${c.installmentInfo.currentNumber}/${c.installmentInfo.total} - $${amt.toLocaleString('es-AR')} [PAGADA]`);
      } else {
        totalCardsPending += amt;
        cardPendingList.push(`• *${c.cardName}* (${c.description}): Cuota ${c.installmentInfo.currentNumber}/${c.installmentInfo.total} - $${amt.toLocaleString('es-AR')} (Vence día ${c.dueDay})`);
      }
    });

    const totalExpenses = expenses.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
    const grandTotal = totalPaid + totalPending + totalCardsPaid + totalCardsPending + totalExpenses;
    const totalPaidAll = totalPaid + totalCardsPaid + totalExpenses;
    const totalPendingAll = totalPending + totalCardsPending;

    // Presupuesto mensual
    const budget = window.store.getBudget(yearMonth);
    const budgetPct = budget > 0 ? ((grandTotal / budget) * 100).toFixed(0) : '0';
    const budgetDiff = budget - grandTotal;

    let msg = `🏠 *SERVICIOS Y GASTOS DEL HOGAR*\n`;
    msg += `📅 *Mes: ${monthName} ${year}*\n`;
    msg += `─────────────────────────\n\n`;

    if (pendingList.length > 0) {
      msg += `⏳ *SERVICIOS PENDIENTES (${pendingList.length}):*\n`;
      msg += pendingList.join('\n') + `\n`;
      msg += `👉 *Subtotal servicios:* $${totalPending.toLocaleString('es-AR')}\n\n`;
    } else {
      msg += `🎉 *¡No hay servicios pendientes este mes!*\n\n`;
    }

    if (cardPendingList.length > 0) {
      msg += `💳 *TARJETAS Y CUOTAS PENDIENTES (${cardPendingList.length}):*\n`;
      msg += cardPendingList.join('\n') + `\n`;
      msg += `👉 *Subtotal cuotas:* $${totalCardsPending.toLocaleString('es-AR')}\n\n`;
    }

    if (paidList.length > 0) {
      msg += `✅ *SERVICIOS PAGADOS (${paidList.length}):*\n`;
      msg += paidList.join('\n') + `\n\n`;
    }

    if (cardPaidList.length > 0) {
      msg += `💳 *CUOTAS DE TARJETAS PAGADAS (${cardPaidList.length}):*\n`;
      msg += cardPaidList.join('\n') + `\n\n`;
    }

    if (expenses.length > 0) {
      msg += `🛒 *GASTOS DIARIOS / COMPRAS (${expenses.length} reg.):*\n`;
      msg += `• Total compras supermercado/farmacia/otros: *$${totalExpenses.toLocaleString('es-AR')}*\n\n`;
    }

    msg += `─────────────────────────\n`;
    msg += `🎯 *CONTROL DE PRESUPUESTO:*\n`;
    msg += `• *Presupuesto asignado:* $${budget.toLocaleString('es-AR')}\n`;
    msg += `• *Total consumido:* $${grandTotal.toLocaleString('es-AR')} (${budgetPct}%)\n`;
    if (budgetDiff >= 0) {
      msg += `• *Saldo disponible:* $${budgetDiff.toLocaleString('es-AR')} (Dentro de meta)\n\n`;
    } else {
      msg += `• *⚠️ Presupuesto excedido por:* $${Math.abs(budgetDiff).toLocaleString('es-AR')}\n\n`;
    }

    msg += `💰 *RESUMEN DE PAGOS:*\n`;
    msg += `• *Total del mes:* $${grandTotal.toLocaleString('es-AR')}\n`;
    msg += `• *Ya Abonado:* $${totalPaidAll.toLocaleString('es-AR')}\n`;
    msg += `• *Falta Pagar:* $${totalPendingAll.toLocaleString('es-AR')}\n`;

    return msg;
  }

  openPreview(yearMonth) {
    const text = this.generateMessage(yearMonth);
    const previewBox = document.getElementById('whatsappPreviewText');
    if (previewBox) {
      previewBox.textContent = text;
    }
    window.app.openModal('whatsappModal');
  }

  copyToClipboard() {
    const previewBox = document.getElementById('whatsappPreviewText');
    if (!previewBox) return;

    const text = previewBox.textContent;
    navigator.clipboard.writeText(text).then(() => {
      window.app.showToast('Mensaje copiado para enviar por WhatsApp ✅', 'success');
    }).catch(() => {
      window.app.showToast('No se pudo copiar el texto', 'warning');
    });
  }

  openDirect() {
    const previewBox = document.getElementById('whatsappPreviewText');
    if (!previewBox) return;

    const text = encodeURIComponent(previewBox.textContent);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  }
}

window.whatsappManager = new WhatsAppManager();
