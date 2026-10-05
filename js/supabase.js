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

      // Sincroniza também as tabelas relacionais individuais no Supabase
      await this.syncToRelationalTables(store.data);

      store.data.settings.lastSync = nowIso;
      store.save(true); // salva lastSync sem disparar novo loop
      if (!silent) console.log('[Cofre Supabase] Sincronização concluída com sucesso às ' + nowIso);
      return { success: true, message: 'Dados salvos com sucesso no Cofre Supabase!', timestamp: nowIso };
    } catch (e) {
      console.error('[Cofre Supabase] Erro ao sincronizar:', e);
      return { success: false, error: e.message || 'Erro ao sincronizar com o Supabase' };
    }
  }

  // Sincronização Individual para cada Tabela Relacional
  async syncToRelationalTables(data) {
    if (!this.client || !this.isConfigured()) return;
    const email = (data.settings?.userEmail || 'raphael_nilsen@hotmail.com').trim().toLowerCase();
    const nowIso = new Date().toISOString();

    try {
      // 1. Contas Bancárias
      if (Array.isArray(data.accounts) && data.accounts.length > 0) {
        const rows = data.accounts.map(a => ({
          id: String(a.id),
          user_email: email,
          nome: a.name || '',
          tipo: a.type || '',
          saldo: Number(a.balance) || 0,
          cor: a.color || '',
          updated_at: nowIso
        }));
        await this.client.from('contas_bancarias').upsert(rows);
      }

      // 2. Receitas (todos os anos e meses)
      const revenues = [];
      const yearsObj = data.years || { [store?.activeYear || new Date().getFullYear()]: data.months };
      for (const [yStr, mObj] of Object.entries(yearsObj)) {
        const y = parseInt(yStr, 10);
        if (!mObj || typeof mObj !== 'object') continue;
        for (let m = 1; m <= 12; m++) {
          if (mObj[m] && Array.isArray(mObj[m].revenues)) {
            mObj[m].revenues.forEach(r => {
              revenues.push({
                id: String(r.id),
                user_email: email,
                ano: y,
                mes: m,
                descricao: r.source || r.description || 'Rendimento',
                valor: Number(r.value) || 0,
                data: r.date || '',
                status: r.status || 'Pendente',
                banco: r.bank || '',
                tipo: r.type || 'mensal',
                updated_at: nowIso
              });
            });
          }
        }
      }
      if (revenues.length > 0) {
        await this.client.from('receitas').upsert(revenues);
      }

      // 3. Despesas Fixas
      const fixedExpenses = [];
      for (const [yStr, mObj] of Object.entries(yearsObj)) {
        const y = parseInt(yStr, 10);
        if (!mObj || typeof mObj !== 'object') continue;
        for (let m = 1; m <= 12; m++) {
          if (mObj[m] && Array.isArray(mObj[m].fixedExpenses)) {
            mObj[m].fixedExpenses.forEach(f => {
              fixedExpenses.push({
                id: String(f.id),
                user_email: email,
                ano: y,
                mes: m,
                descricao: f.name || f.description || '',
                valor_previsto: Number(f.valueExpected) || 0,
                valor_pago: Number(f.valuePaid) || 0,
                data_vencimento: f.dueDay ? String(f.dueDay) : (f.dueDate || ''),
                status: f.status || 'Pendente',
                banco: f.bank || '',
                updated_at: nowIso
              });
            });
          }
        }
      }
      if (fixedExpenses.length > 0) {
        await this.client.from('despesas_fixas').upsert(fixedExpenses);
      }

      // 4. Despesas Variáveis
      const variableExpenses = [];
      for (const [yStr, mObj] of Object.entries(yearsObj)) {
        const y = parseInt(yStr, 10);
        if (!mObj || typeof mObj !== 'object') continue;
        for (let m = 1; m <= 12; m++) {
          if (mObj[m] && Array.isArray(mObj[m].variableExpenses)) {
            mObj[m].variableExpenses.forEach(v => {
              variableExpenses.push({
                id: String(v.id),
                user_email: email,
                ano: y,
                mes: m,
                descricao: v.description || v.name || '',
                valor: Number(v.value) || 0,
                data: v.date || '',
                categoria: v.category || '',
                banco: v.bank || '',
                updated_at: nowIso
              });
            });
          }
        }
      }
      if (variableExpenses.length > 0) {
        await this.client.from('despesas_variaveis').upsert(variableExpenses);
      }

      // 5. Compras no Cartão
      if (Array.isArray(data.cardPurchases) && data.cardPurchases.length > 0) {
        const cardRows = data.cardPurchases.map(cp => ({
          id: String(cp.id),
          user_email: email,
          descricao: cp.description || '',
          estabelecimento: cp.place || '',
          cartao: cp.card || '',
          data_compra: cp.date || '',
          valor_total: Number(cp.totalAmount) || 0,
          parcelas: parseInt(cp.installments, 10) || 1,
          ano_inicio: parseInt(cp.startYear, 10) || new Date().getFullYear(),
          mes_inicio: parseInt(cp.startMonth, 10) || 1,
          updated_at: nowIso
        }));
        await this.client.from('compras_cartao').upsert(cardRows);
      }

      // 6. Investimentos Bolsa
      if (data.investments && Array.isArray(data.investments.stocks) && data.investments.stocks.length > 0) {
        const stockRows = data.investments.stocks.map(s => ({
          id: String(s.id),
          user_email: email,
          ticker: s.ticker || s.name || '',
          tipo: s.type || 'Ação',
          quantidade: Number(s.quantity) || 0,
          preco_medio: Number(s.averagePrice) || 0,
          total_aplicado: Number(s.totalInvested) || 0,
          data_compra: s.date || '',
          updated_at: nowIso
        }));
        await this.client.from('investimentos_bolsa').upsert(stockRows);
      }

      // 7. Investimentos Caixinhas
      if (data.investments && Array.isArray(data.investments.nubankBoxes) && data.investments.nubankBoxes.length > 0) {
        const boxRows = data.investments.nubankBoxes.map(b => ({
          id: String(b.id),
          user_email: email,
          nome: b.name || '',
          valor: Number(b.amount) || 0,
          status: b.status || 'Ativa',
          data_aplicacao: b.date || '',
          updated_at: nowIso
        }));
        await this.client.from('investimentos_caixinhas').upsert(boxRows);
      }

      // 8. Troco Jotur
      if (data.jotur && Array.isArray(data.jotur.history) && data.jotur.history.length > 0) {
        const joturRows = data.jotur.history.map(j => ({
          id: String(j.id || ('jt_' + new Date(j.timestamp || Date.now()).getTime())),
          user_email: email,
          data_hora: j.date || j.timestamp || nowIso,
          troco_base: Number(j.baseAmount || data.jotur.baseAmount) || 200,
          total_contado: Number(j.totalCounted) || 0,
          resultado: j.diffText || j.status || '',
          updated_at: nowIso
        }));
        await this.client.from('troco_jotur').upsert(joturRows);
      }

      // 9. Cofre de Senhas
      if (Array.isArray(data.passwords) && data.passwords.length > 0) {
        const pwdRows = data.passwords.map(p => ({
          id: String(p.id),
          user_email: email,
          servico: p.service || '',
          categoria: p.category || '',
          usuario: p.username || '',
          senha: p.password || '',
          url: p.url || '',
          notas: p.notes || '',
          updated_at: nowIso
        }));
        await this.client.from('cofre_senhas').upsert(pwdRows);
      }

      // 10. Sonhos e Metas
      if (Array.isArray(data.dreams) && data.dreams.length > 0) {
        const dreamRows = data.dreams.map(d => ({
          id: String(d.id),
          user_email: email,
          titulo: d.title || '',
          valor_alvo: Number(d.targetAmount) || 0,
          valor_atual: Number(d.currentAmount) || 0,
          data_alvo: d.deadline || '',
          categoria: d.category || '',
          updated_at: nowIso
        }));
        await this.client.from('sonhos_metas').upsert(dreamRows);
      }

      // 11. Bombeiro
      if (Array.isArray(data.firefighterRecords) && data.firefighterRecords.length > 0) {
        const ffRows = data.firefighterRecords.map(f => ({
          id: String(f.id),
          user_email: email,
          mes_referencia: f.month || '',
          data_solicitada: f.requestDate || '',
          data_pagamento: f.paymentDate || '',
          valor: Number(f.amount) || 0,
          status: f.status || 'Pendente',
          updated_at: nowIso
        }));
        await this.client.from('bombeiro_ressarcimento').upsert(ffRows);
      }
    } catch (e) {
      console.warn('[Cofre Supabase] Aviso na sincronização relacional:', e);
    }
  }

  // Deletar linha específica de qualquer tabela
  async deleteRowFromTable(tableName, id) {
    if (!this.client || !this.isConfigured()) return;
    try {
      await this.client.from(tableName).delete().eq('id', String(id));
    } catch (e) {
      console.warn(`[Cofre Supabase] Erro ao deletar de ${tableName}:`, e);
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

      if (data && data.data_json && data.data_json.accounts && Array.isArray(data.data_json.accounts)) {
        store.data = data.data_json;
        store.data.settings.lastSync = data.updated_at;
        store.save(true);
        if (!silent) console.log('[Cofre Supabase] Dados carregados da nuvem com sucesso.');
        return { success: true, message: 'Dados restaurados com sucesso da nuvem!' };
      } else {
        // Se a nuvem tem apenas um registro parcial/teste, sobe o estado local
        this.syncToCloud(true);
        return { success: false, reason: 'Nenhum backup completo na nuvem. Dados locais enviados com sucesso.' };
      }
    } catch (e) {
      console.error('[Cofre Supabase] Erro ao carregar:', e);
      return { success: false, error: e.message };
    }
  }
}

const supabaseService = new SupabaseService();
window.supabaseService = supabaseService;

