# Guardado y recuperación de gastos

El pie de la página indica si el cambio está guardándose, confirmado por Supabase
o pendiente. Reintentar vuelve a enviar los cambios en orden. También se
reintentan al recuperar conexión o iniciar sesión en el hogar.

Los pendientes se conservan en este navegador, separados por proyecto, cuenta
y hogar. No borrar los datos del navegador mientras haya cambios pendientes.

En Gastos, abrir «Papelera de gastos de este dispositivo» y pulsar Restaurar.
El gasto conserva su importe, fecha, notas y responsable. Si era de otro mes,
seleccionar ese mes para verlo. La restauración también se envía a la nube.
La papelera está en el navegador que eliminó el gasto, no compartida entre
dispositivos. No recupera eliminaciones anteriores a esta actualización.

## Publicación

Subir a GitHub index.html, js/app.js, js/store.js, js/expenses.js,
js/supabase-client.js, js/save-status.js y css/save-status.css.
Esta mejora no requiere ejecutar SQL.

## Verificación local

Ejecutar: node tests/save-recovery.cjs

Prueba que los errores conservan los pendientes, que el reintento los envía en
orden, que borrar/restaurar conserva el gasto y que los pendientes persisten y
están separados por hogar. No realiza operaciones sobre la base real.
