/**
 * CALCULATOR.JS - Calculadora Financiera y de Gastos Integrada
 */

class CalculatorManager {
  constructor() {
    this.currentValue = '0';
    this.previousValue = null;
    this.operation = null;
    this.historyText = '';
    this.shouldResetDisplay = false;
    this.targetInputElement = null; // Input de formulario activo previo a abrir la calculadora
  }

  init() {
    this.bindEvents();
  }

  open(targetInput = null) {
    if (targetInput && typeof targetInput === 'object') {
      this.targetInputElement = targetInput;
    }

    // Si el input objetivo ya tiene un número, precargarlo en la calculadora
    if (this.targetInputElement && this.targetInputElement.value) {
      const val = parseFloat(this.targetInputElement.value);
      if (!isNaN(val)) {
        this.currentValue = String(val);
        this.historyText = `Monto desde formulario`;
      }
    }

    this.updateDisplay();
    window.app.openModal('calculatorModal');
  }

  close() {
    window.app.closeModal('calculatorModal');
  }

  updateDisplay() {
    const displayEl = document.getElementById('calcDisplayValue');
    const historyEl = document.getElementById('calcDisplayHistory');
    const cuotaInfoEl = document.getElementById('calcCuotasInfo');

    if (displayEl) {
      let formattedText = '0';
      const num = parseFloat(this.currentValue);

      if (isNaN(num)) {
        formattedText = this.currentValue || '0';
      } else if (this.currentValue.endsWith('.')) {
        // Usuario acaba de presionar coma/punto
        const integerPart = Math.floor(Math.abs(num));
        const sign = num < 0 ? '-' : '';
        formattedText = sign + integerPart.toLocaleString('es-AR') + ',';
      } else if (this.currentValue.includes('.')) {
        // Número con decimales
        const parts = this.currentValue.split('.');
        const integerNum = parseInt(parts[0], 10) || 0;
        const sign = parts[0].startsWith('-') && integerNum === 0 ? '-' : '';
        formattedText = sign + integerNum.toLocaleString('es-AR') + ',' + parts[1];
      } else {
        // Número entero
        formattedText = num.toLocaleString('es-AR');
      }

      displayEl.textContent = formattedText;

      // Auto-escalado de fuente según la longitud para evitar cortes o desbordes
      const charLength = formattedText.length;
      if (charLength <= 8) {
        displayEl.style.fontSize = '2.2rem';
      } else if (charLength <= 11) {
        displayEl.style.fontSize = '1.75rem';
      } else if (charLength <= 14) {
        displayEl.style.fontSize = '1.4rem';
      } else if (charLength <= 18) {
        displayEl.style.fontSize = '1.15rem';
      } else {
        displayEl.style.fontSize = '0.95rem';
      }
    }

    if (historyEl) {
      historyEl.textContent = this.historyText || '';
    }

    // Si hay un valor mayor a 0, actualizar automáticamente el cálculo de cuotas sugeridas
    if (cuotaInfoEl) {
      const val = parseFloat(this.currentValue);
      if (!isNaN(val) && val > 0) {
        cuotaInfoEl.innerHTML = `
          <div class="calc-cuotas-pills">
            <span class="calc-cuota-pill" onclick="window.calculatorManager.applyCuotas(3)">3x $${Math.round(val / 3).toLocaleString('es-AR')}</span>
            <span class="calc-cuota-pill" onclick="window.calculatorManager.applyCuotas(6)">6x $${Math.round(val / 6).toLocaleString('es-AR')}</span>
            <span class="calc-cuota-pill" onclick="window.calculatorManager.applyCuotas(12)">12x $${Math.round(val / 12).toLocaleString('es-AR')}</span>
            <span class="calc-cuota-pill" onclick="window.calculatorManager.applyCuotas(18)">18x $${Math.round(val / 18).toLocaleString('es-AR')}</span>
          </div>
        `;
      } else {
        cuotaInfoEl.innerHTML = '';
      }
    }
  }

  inputDigit(digit) {
    const digitStr = String(digit);
    if (this.shouldResetDisplay) {
      this.currentValue = digitStr;
      this.shouldResetDisplay = false;
    } else {
      if (this.currentValue === '0') {
        this.currentValue = digitStr;
      } else {
        // Limitar a 16 dígitos para evitar desbordes irreales
        if (this.currentValue.replace(/[^0-9]/g, '').length >= 16) return;
        this.currentValue += digitStr;
      }
    }
    this.updateDisplay();
  }

  inputDecimal() {
    if (this.shouldResetDisplay) {
      this.currentValue = '0.';
      this.shouldResetDisplay = false;
    } else if (!this.currentValue.includes('.')) {
      this.currentValue += '.';
    }
    this.updateDisplay();
  }

  toggleSign() {
    const num = parseFloat(this.currentValue);
    if (!isNaN(num)) {
      this.currentValue = String(num * -1);
      this.updateDisplay();
    }
  }

  backspace() {
    if (this.currentValue.length > 1) {
      this.currentValue = this.currentValue.slice(0, -1);
    } else {
      this.currentValue = '0';
    }
    this.updateDisplay();
  }

  clear() {
    this.currentValue = '0';
    this.previousValue = null;
    this.operation = null;
    this.historyText = '';
    this.shouldResetDisplay = false;
    this.updateDisplay();
  }

  clearEntry() {
    this.currentValue = '0';
    this.updateDisplay();
  }

  setOperation(op) {
    if (this.operation && !this.shouldResetDisplay) {
      this.calculate();
    }

    this.previousValue = parseFloat(this.currentValue);
    this.operation = op;
    this.shouldResetDisplay = true;

    const opSymbols = { '+': '+', '-': '−', '*': '×', '/': '÷' };
    this.historyText = `${this.previousValue.toLocaleString('es-AR')} ${opSymbols[op] || op}`;
    this.updateDisplay();
  }

  calculate() {
    if (this.operation === null || this.previousValue === null) return;

    const prev = this.previousValue;
    const current = parseFloat(this.currentValue);
    let result = 0;

    switch (this.operation) {
      case '+':
        result = prev + current;
        break;
      case '-':
        result = prev - current;
        break;
      case '*':
        result = prev * current;
        break;
      case '/':
        if (current === 0) {
          window.app.showToast('No se puede dividir por cero', 'danger');
          return;
        }
        result = prev / current;
        break;
      default:
        return;
    }

    // Redondear a un máximo razonable de decimales para evitar floating point noise
    result = Math.round(result * 1000000) / 1000000;

    const opSymbols = { '+': '+', '-': '−', '*': '×', '/': '÷' };
    this.historyText = `${prev.toLocaleString('es-AR')} ${opSymbols[this.operation]} ${current.toLocaleString('es-AR')} =`;
    this.currentValue = String(result);
    this.operation = null;
    this.previousValue = null;
    this.shouldResetDisplay = true;

    this.updateDisplay();
  }

  // Herramientas Financieras Rápidas
  applyPercentage(pct) {
    const current = parseFloat(this.currentValue);
    if (isNaN(current)) return;

    if (this.previousValue !== null && this.operation !== null) {
      // Si estamos en medio de una operación: ej. 100 + 10% -> 100 + 10
      const pctValue = (this.previousValue * current) / 100;
      this.currentValue = String(pctValue);
    } else {
      // Descuento o recargo directo: pct = +10, -15, etc.
      const factor = 1 + (pct / 100);
      const res = Math.round(current * factor * 100) / 100;
      this.historyText = `${current.toLocaleString('es-AR')} ${pct > 0 ? '+' : ''}${pct}% =`;
      this.currentValue = String(res);
      this.shouldResetDisplay = true;
    }
    this.updateDisplay();
  }

  applyCuotas(cuotas) {
    const current = parseFloat(this.currentValue);
    if (isNaN(current) || current <= 0) return;

    const perCuota = Math.round((current / cuotas) * 100) / 100;
    this.historyText = `${current.toLocaleString('es-AR')} en ${cuotas} cuotas fijas =`;
    this.currentValue = String(perCuota);
    this.shouldResetDisplay = true;
    this.updateDisplay();
    window.app.showToast(`$${current.toLocaleString('es-AR')} en ${cuotas} cuotas de $${perCuota.toLocaleString('es-AR')}`, 'info');
  }

  async copyResult() {
    const val = parseFloat(this.currentValue);
    if (isNaN(val)) return;

    const copied = await window.app.copyTextToClipboard(String(val));
    if (copied) {
      window.app.showToast(`Monto copiado: $${val.toLocaleString('es-AR')}`, 'success');
    } else {
      window.app.showToast('No se pudo copiar el monto', 'warning');
    }
  }

  pasteToForm() {
    const val = parseFloat(this.currentValue);
    if (isNaN(val)) return;

    if (this.targetInputElement) {
      this.targetInputElement.value = val;
      // Disparar evento input para recálculos si existen
      this.targetInputElement.dispatchEvent(new Event('input', { bubbles: true }));
      this.close();
      window.app.showToast(`Monto $${val.toLocaleString('es-AR')} insertado en el formulario`, 'success');
    } else {
      // Intentar copiar al portapapeles si no hay formulario activo
      this.copyResult();
    }
  }

  bindEvents() {
    // Teclado físico cuando el modal de la calculadora está abierto
    window.addEventListener('keydown', (e) => {
      const modal = document.getElementById('calculatorModal');
      if (!modal || !modal.classList.contains('active')) return;

      if (e.key >= '0' && e.key <= '9') {
        this.inputDigit(e.key);
      } else if (e.key === '.' || e.key === ',') {
        this.inputDecimal();
      } else if (e.key === '+') {
        this.setOperation('+');
      } else if (e.key === '-') {
        this.setOperation('-');
      } else if (e.key === '*') {
        this.setOperation('*');
      } else if (e.key === '/') {
        e.preventDefault();
        this.setOperation('/');
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        this.calculate();
      } else if (e.key === 'Backspace') {
        this.backspace();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.close();
      }
    });
  }
}

window.calculatorManager = new CalculatorManager();
