/**
 * SISTEMA FINANCEIRO RAPHAEL NILSEN
 * Integração com o Supabase (Cofre de Dados na Nuvem)
 */

class SupabaseService {
  constructor() {
    this.client = null;
    this.init();
  }

  init() {
    const config = typeof store !== 'undefined' ? store.data.settings.supabase : null;
    if (config && config.url && config.anonKey) {
      if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
        try {
          this.client = window.supabase.createClient(config.url, config.anonKey);
          console.log('[Cofre Supabase] Conectado com sucesso à nuvem.');
        } catch (e) {
          console.warn('[Cofre Supabase] Erro ao instanciar cliente:', e);
        }
      }
    }
  }

  isConfigured() {
    const config = typeof store !== 'undefined' ? store.data?.settings?.supabase : null;
    return !!(config && config.url && config.anonKey && !config.url.includes('seu-projeto'));
  }

  saveConfig(url, anonKey) {
    store.data.settings.supabase = {
      url: url.trim(),
      anonKey: anonKey.trim()
    };
    store.save(true);
    this.init();
  }

  // Sincronização Segura do Estado Completo do Sistema
  async syncToCloud(silent = false) {
    if (!this.client) this.init();
    if (!this.isConfigured() || !this.client) {
      return { success: false, reason: 'Cofre Supabase não configurado. Dados salvos com segurança no navegador!' };
    }

    try {
      const nowIso = new Date().toISOString();
      const payload = {
        user_email: (store.data.settings.userEmail || 'raphael_nilsen@hotmail.com').trim().toLowerCase(),
        data_json: store.data,
        updated_at: nowIso
      };

      const { data, error } = await this.client
        .from('financial_vault')
        .upsert(payload, { onConflict: 'user_email' });

      if (error) throw error;

      store.data.settings.lastSync = nowIso;
      store.save(true); // salva lastSync sem disparar novo loop
      if (!silent) console.log('[Cofre Supabase] Sincronização concluída com sucesso às ' + nowIso);
      return { success: true, message: 'Dados salvos com sucesso no Cofre Supabase!', timestamp: nowIso };
    } catch (e) {
      console.error('[Cofre Supabase] Erro ao sincronizar:', e);
      return { success: false, error: e.message || 'Erro ao sincronizar com o Supabase' };
    }
  }

  // Carregar dados da Nuvem
  async loadFromCloud(silent = false) {
    if (!this.client) this.init();
    if (!this.isConfigured() || !this.client) {
      return { success: false, reason: 'Cofre Supabase não configurado' };
    }

    try {
      const { data, error } = await this.client
        .from('financial_vault')
        .select('data_json, updated_at')
        .eq('user_email', store.data.settings.userEmail)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = zero rows found
        throw error;
      }

      if (data && data.data_json) {
        store.data = data.data_json;
        store.data.settings.lastSync = data.updated_at;
        store.save(true);
        if (!silent) console.log('[Cofre Supabase] Dados carregados da nuvem com sucesso.');
        return { success: true, message: 'Dados restaurados com sucesso da nuvem!' };
      }
      return { success: false, reason: 'Nenhum backup encontrado na nuvem para este usuário' };
    } catch (e) {
      console.error('[Cofre Supabase] Erro ao carregar:', e);
      return { success: false, error: e.message };
    }
  }
}

const supabaseService = new SupabaseService();
window.supabaseService = supabaseService;

