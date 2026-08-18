/**
 * CONFIG.JS - Configuración de Credenciales de Supabase
 */

window.SUPABASE_CONFIG = {
  // URL de tu proyecto Supabase
  URL: "https://wiwxkajgnkuknqlxoqsw.supabase.co",

  // Clave pública anónima de tu proyecto (anon / publishable key)
  ANON_KEY: "sb_publishable_Nb1z26B4fj-qZifeEZqa9Q_p1LgZvSc",

  // Función de utilidad para obtener las credenciales activas
  getCredentials() {
    return {
      url: this.URL,
      key: this.ANON_KEY,
      isConfigured: Boolean(this.URL && this.ANON_KEY)
    };
  }
};
