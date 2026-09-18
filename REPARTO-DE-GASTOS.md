# Reparto por gasto

En Agregar/Editar gasto, indicar quién pagó y marcar las personas que participan.
Elegir partes iguales, porcentajes que sumen 100%, o montos que sumen el importe.
La vista previa muestra la parte de cada persona. Los centavos sobrantes se
distribuyen sin alterar el total.

El resumen muestra lo pagado, lo que corresponde a cada uno y las transferencias
sugeridas. Incluye a quienes participan aunque todavía no hayan pagado nada.
Los gastos anteriores sin reparto se excluyen y se avisa cuántos faltan editar.
Usar siempre el mismo nombre/correo para una persona; los nombres antiguos como
«Yo» o «Papá» no se convierten automáticamente a las cuentas actuales.

## Activación

1. Ejecutar supabase_expense_split.sql en SQL Editor del proyecto nuevo.
   Agrega los campos del reparto sin borrar datos ni modificar permisos.
2. Subir a GitHub index.html, js/expense-split.js, js/expenses.js,
   js/settlement.js, js/app.js, js/supabase-client.js y css/save-status.css.
   Si todavía no publicaste la mejora anterior, incluir también js/store.js y
   js/save-status.js.
3. Probar un gasto de $30.000 pagado por una persona y repartido en $15.000,
   $10.000 y $5.000. Las otras dos deben reintegrarle $10.000 y $5.000.

Pruebas locales: node tests/expense-split.cjs y node tests/save-recovery.cjs.
Falta comprobar el guardado/lectura real entre dispositivos después de aplicar
el SQL y publicar.
