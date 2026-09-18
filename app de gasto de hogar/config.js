/**
 * CONFIG.JS - Configuración de Credenciales de Supabase
 *
 * En producción, las credenciales públicas se cargan desde config.public.js.
 * Un archivo .env no puede ser leído por GitHub Pages en el navegador.
 */

const publicConfig = window.SUPABASE_PUBLIC_CONFIG || {};

window.SUPABASE_CONFIG = {
  // URL y clave pública compartidas por todos los navegadores.
  URL: typeof publicConfig.URL === 'string' ? publicConfig.URL : "",

  // Puede ser una clave publishable moderna o la clave anon pública anterior.
  ANON_KEY: typeof publicConfig.ANON_KEY === 'string' ? publicConfig.ANON_KEY : "",

  hasPublicCredentials() {
    return Boolean(this.URL && this.URL.trim() && this.ANON_KEY && this.ANON_KEY.trim());
  },

  // La configuración publicada tiene prioridad para evitar que una configuración
  // antigua guardada en un celular desconecte a la persona del hogar compartido.
  getCredentials() {
    const savedUrl = localStorage.getItem('mihogar_supabase_url');
    const savedKey = localStorage.getItem('mihogar_supabase_anon_key');

    const url = (this.URL && this.URL.trim()) || (savedUrl && savedUrl.trim()) || "";
    const key = (this.ANON_KEY && this.ANON_KEY.trim()) || (savedKey && savedKey.trim()) || "";

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
