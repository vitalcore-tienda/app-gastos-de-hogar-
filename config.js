/**
 * CONFIG.JS - Configuración de Credenciales de Supabase
 */

window.SUPABASE_CONFIG = {
  // URL de tu proyecto Supabase
  URL: "https://TU-PROYECTO.supabase.co",

  // Clave pública anónima de tu proyecto (anon public key)
  ANON_KEY: "TU_CLAVE_ANON_PUBLICA_AQUI",

  // Función de utilidad para obtener las credenciales activas
  getCredentials() {
    return {
      url: this.URL,
      key: this.ANON_KEY,
      isConfigured: Boolean(this.URL && this.ANON_KEY)
    };
  }
};
