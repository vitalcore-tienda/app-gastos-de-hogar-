/**
 * CONFIG.JS - Configuración de Credenciales de Supabase
 *
 * Puedes colocar tus credenciales aquí directamente o en el archivo .env,
 * o ingresarlas desde el botón "Conectar Supabase" en la pantalla de inicio.
 */

window.SUPABASE_CONFIG = {
  // Pega aquí la URL de tu proyecto Supabase (ej: https://xyzcompany.supabase.co)
  URL: "",

  // Pega aquí la clave pública anónima de tu proyecto (anon public key)
  ANON_KEY: "",

  // Función de utilidad para obtener las credenciales activas (desde archivo o localStorage)
  getCredentials() {
    const savedUrl = localStorage.getItem('mihogar_supabase_url');
    const savedKey = localStorage.getItem('mihogar_supabase_anon_key');

    const url = (savedUrl && savedUrl.trim()) || (this.URL && this.URL.trim()) || "";
    const key = (savedKey && savedKey.trim()) || (this.ANON_KEY && this.ANON_KEY.trim()) || "";

    return {
      url,
      key,
      isConfigured: Boolean(url && key && !url.includes('TU_PROYECTO') && !key.includes('TU_CLAVE'))
    };
  },

  // Guardar credenciales desde la interfaz web
  saveCredentials(url, key) {
    if (url) localStorage.setItem('mihogar_supabase_url', url.trim());
    if (key) localStorage.setItem('mihogar_supabase_anon_key', key.trim());
    return true;
  },

  // Limpiar credenciales
  clearCredentials() {
    localStorage.removeItem('mihogar_supabase_url');
    localStorage.removeItem('mihogar_supabase_anon_key');
  }
};
