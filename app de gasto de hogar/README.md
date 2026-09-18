# 🏠 Mi Hogar - Gestión de Servicios y Gastos Familiares

Una aplicación web moderna, accesible y pensada para organizar de forma sencilla todos los servicios, impuestos y compras cotidianas del hogar de tus papás.

---

## ✨ Características Principales

1. **Gestor de Servicios e Impuestos Recurrentes**:
   - Luz, Gas, Agua, Internet, Celular, Expensas, Impuestos Municipales, Seguros, etc.
   - Guardado de **Código de Pago Electrónico / Nº de Cliente** con botón de copiado rápido en 1 clic.
   - Indicador de Débito Automático o Pago Manual.
   - Alertas por fecha de vencimiento (verde = pagado, amarillo = por vencer esta semana, rojo = vencido).
   - Registro de pago en 1 clic con importe real abonado, fecha, medio de pago y notas.

2. **Registro de Gastos Cotidianos**:
   - Supermercado, farmacia, mantenimiento/arreglos del hogar, comida, mascotas y varios.
   - Totalizadores y categorización instantánea.

3. **Panel y Métricas Financieras (Dashboard)**:
   - Total del mes, Total abonado, Pendiente por pagar y Próximo vencimiento más cercano.
   - Semáforo de avisos y felicitaciones cuando todo está al día.
   - Gráfico interactivo por categorías y desglose porcentual.

4. **Calendario Mensual**:
   - Vista visual de días con facturas por vencer y compras realizadas.

5. **📲 Compartir por WhatsApp**:
   - Genera un mensaje formateado y ordenado para enviar a tus papás o grupo familiar con los servicios pendientes, pagados y totales.

6. **🖨️ Impresión para la Heladera**:
   - Hoja optimizada para imprimir el listado de servicios, códigos de pago y montos en papel.

7. **💾 Copias de Seguridad y Excel**:
   - Exportar a Excel (formato CSV).
   - Respaldo completo en archivo JSON e importación inmediata.

---

## 🚀 Cómo Usar / Abrir la Aplicación

Simplemente abre el archivo `index.html` en cualquier navegador web (Google Chrome, Edge, Safari, Firefox), o ejecútalo con cualquier servidor local:

```bash
# Opcional: Si tienes Python instalado
python -m http.server 8080
```
Y abre `http://localhost:8080` en tu navegador.

---

## 🌐 Publicar en GitHub Pages

La aplicación funciona como sitio estático, así que se puede publicar directamente desde la raíz del repositorio:

1. Crea un repositorio en GitHub y sube estos archivos.
2. En GitHub, abre **Settings → Pages**.
3. En **Build and deployment**, selecciona **Deploy from a branch**.
4. Elige la rama `main` y la carpeta **/(root)**; luego guarda.
5. GitHub mostrará la dirección pública de la aplicación. Ábrela desde cualquier celular.

### Importante sobre Supabase

- El archivo `.env` queda excluido por `.gitignore`: no lo subas al repositorio.
- La conexión compartida se carga desde `config.public.js`, por lo que cada celular solo necesita crear su cuenta o iniciar sesión.
- La URL del proyecto y una clave **publishable/anon** son datos públicos de una aplicación web y pueden estar en ese archivo. Nunca agregues una clave `service_role` ni `sb_secret`.
- Si es la primera vez que preparas la base, ejecuta primero `supabase_schema.sql` y después `supabase_security_migration.sql` en el SQL Editor de Supabase.
- Antes de publicar, ejecuta `supabase_security_migration.sql` para que cada integrante solo pueda acceder a su propio hogar.
- En **Authentication → URL Configuration** de Supabase, agrega la dirección final de GitHub Pages como `Site URL` y como `Redirect URL`.
