/**
 * CONFIGURACIÓN PÚBLICA DE SUPABASE
 *
 * Este archivo se publica junto con la aplicación para que todos los
 * integrantes del hogar se conecten al mismo proyecto sin ingresar datos.
 * La clave `publishable` es apta para un navegador: la seguridad de los
 * datos depende de las políticas RLS de Supabase, no de ocultar esta clave.
 * Nunca coloques aquí una clave `service_role` ni `sb_secret`.
 */

window.SUPABASE_PUBLIC_CONFIG = Object.freeze({
  URL: 'https://pnrxnmdgygjphnycjyhg.supabase.co',
  ANON_KEY: 'sb_publishable_U9N2MF0ChO04x3USAamdWg_DziwuWeV'
});
