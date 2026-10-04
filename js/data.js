/**
 * SISTEMA FINANCEIRO RAPHAEL NILSEN
 * Módulo de Dados, Persistência Local e Regras de Negócio
 */

const STORAGE_KEY = 'sf_raphael_nilsen_data_v1';
const SESSION_KEY = 'sf_raphael_nilsen_session';

// Estrutura inicial padrão de alta fidelidade
const INITIAL_DATABASE = {
  // 1. Contas Bancárias / Saldos
  accounts: [
    { id: 'bradesco', name: 'Bradesco', type: 'Conta Corrente', balance: 0.00, color: '#dc2626' },
    { id: 'nubank', name: 'Nubank (Nu)', type: 'Conta Digital', balance: 0.00, color: '#8b5cf6' },
    { id: 'bb', name: 'Banco do Brasil (BB)', type: 'Conta Corrente', balance: 0.00, color: '#eab308' },
    { id: 'caixa-p', name: 'Caixa Econômica (Poupança)', type: 'Poupança', balance: 0.00, color: '#0284c7' },
    { id: 'caixa-cp', name: 'Caixa Econômica (Caixa CP)', type: 'Conta Pagamento', balance: 0.00, color: '#0ea5e9' },
    { id: 'seven', name: 'Seven', type: 'Conta / Cartão', balance: 0.00, color: '#475569' },
    { id: 'carteira', name: 'Carteira (Dinheiro Físico)', type: 'Dinheiro', balance: 0.00, color: '#10b981' }
  ],

  // 2. Gestão Mensal (Janeiro a Dezembro)
  // Estrutura de cada mês: { revenues: [], fixedExpenses: [], variableExpenses: [] }
  months: {
    1: { name: 'Janeiro', revenues: [], fixedExpenses: [], variableExpenses: [] },
    2: { name: 'Fevereiro', revenues: [], fixedExpenses: [], variableExpenses: [] },
    3: { name: 'Março', revenues: [], fixedExpenses: [], variableExpenses: [] },
    4: { name: 'Abril', revenues: [], fixedExpenses: [], variableExpenses: [] },
    5: { name: 'Maio', revenues: [], fixedExpenses: [], variableExpenses: [] },
    6: { name: 'Junho', revenues: [], fixedExpenses: [], variableExpenses: [] },
    7: { name: 'Julho', revenues: [], fixedExpenses: [], variableExpenses: [] },
    8: { name: 'Agosto', revenues: [], fixedExpenses: [], variableExpenses: [] },
    9: { name: 'Setembro', revenues: [], fixedExpenses: [], variableExpenses: [] },
    10: { name: 'Outubro', revenues: [], fixedExpenses: [], variableExpenses: [] },
    11: { name: 'Novembro', revenues: [], fixedExpenses: [], variableExpenses: [] },
    12: { name: 'Dezembro', revenues: [], fixedExpenses: [], variableExpenses: [] }
  },

  // 3. Cartões de Crédito
  creditCards: [
    { id: 'master', name: 'Mastercard', limit: 0, closingDay: 1, dueDay: 10 },
    { id: 'nubank_card', name: 'Nubank (Nu)', limit: 0, closingDay: 5, dueDay: 15 }
  ],
  // Compras no Cartão
  cardPurchases: [],

  // 4. Sonhos / Compras Futuras
  dreams: [],

  // 5. Bombeiro Comunitário
  firefighterRecords: [],

  // 6. Controle de Troco Jotur
  jotur: {
    baseAmount: 200.00,
    history: []
  },

  // 7. Investimentos
  investments: {
    stocks: [], // Bolsa de Valores: Ações / FIIs
    nubankBoxes: [] // Caixinhas Nubank / Renda Fixa
  },

  // 8. Cofre de Senhas
  passwords: [],

  // Configurações do Sistema
  settings: {
    userName: 'Raphael Nilsen',
    userEmail: 'raphael_nilsen@hotmail.com',
    userPasswordHash: '12345',
    lastSync: null,
    supabase: {
      url: 'https://mpqovczuspebtnbdawcp.supabase.co',
      anonKey: 'sb_publishable_G9fek0q02UhIXKx6aSXkIQ_3_ovrTLZ'
    }
  }
};

class DataStore {
  constructor() {
    this._syncTimeout = null;
    this.data = this.load();
  }

  load() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const merged = { ...INITIAL_DATABASE, ...parsed };
        if (!merged.settings) merged.settings = { ...INITIAL_DATABASE.settings };
        if (!merged.settings.supabase || !merged.settings.supabase.url || !merged.settings.supabase.anonKey) {
          merged.settings.supabase = { ...INITIAL_DATABASE.settings.supabase };
        }
        return merged;
      }
    } catch (e) {
      console.error('Erro ao ler localStorage', e);
    }
    return JSON.parse(JSON.stringify(INITIAL_DATABASE));
  }

  save(skipCloudSync = false) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
      if (!skipCloudSync && typeof window !== 'undefined' && window.supabaseService && window.supabaseService.isConfigured()) {
        if (this._syncTimeout) clearTimeout(this._syncTimeout);
        this._syncTimeout = setTimeout(() => {
          window.supabaseService.syncToCloud(true);
        }, 1500);
      }
    } catch (e) {
      console.error('Erro ao salvar no localStorage', e);
    }
  }

  // Sessão de Login
  getSession() {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY));
    } catch (e) {
      return null;
    }
  }

  setSession(user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  }

  clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }

  // --- MÉTODOS DE CÁLCULO E CONSULTA ---

  // Saldo total consolidado
  getTotalBalance() {
    return this.data.accounts.reduce((acc, curr) => acc + (Number(curr.balance) || 0), 0);
  }

  // Atualiza saldo de conta
  updateAccountBalance(id, newBalance) {
    const account = this.data.accounts.find(a => a.id === id);
    if (account) {
      account.balance = Number(newBalance) || 0;
      this.save();
    }
  }

  // --- MÓDULO MESES & RECEITAS / DESPESAS ---
  addRevenue(monthNum, revenue) {
    if (!this.data.months[monthNum]) return;
    revenue.id = revenue.id || ('rev_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4));
    revenue.value = Number(revenue.value) || 0;
    revenue.status = revenue.status || 'Pendente';
    revenue.type = revenue.type || 'mensal';
    if (!this.data.months[monthNum].revenues) this.data.months[monthNum].revenues = [];
    this.data.months[monthNum].revenues.push(revenue);
    this.save();
    return revenue;
  }

  addAnnualRevenue(revenueConfig) {
    const annualGroupId = 'ann_rev_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    const results = [];
    const day = Math.min(Math.max(parseInt(revenueConfig.day, 10) || 5, 1), 31);
    const year = parseInt(revenueConfig.year, 10) || new Date().getFullYear();
    const source = revenueConfig.source || 'Receita Anual';
    const value = Number(revenueConfig.value) || 0;
    const bank = revenueConfig.bank || 'Nubank (Nu)';
    const baseStatus = revenueConfig.status || 'Pendente';

    for (let m = 1; m <= 12; m++) {
      if (!this.data.months[m]) continue;
      if (!this.data.months[m].revenues) this.data.months[m].revenues = [];

      // Ajusta o dia para meses com menos dias (ex: Fevereiro tem 28 ou 29)
      const daysInMonth = new Date(year, m, 0).getDate();
      const actualDay = Math.min(day, daysInMonth);
      const dayStr = String(actualDay).padStart(2, '0');
      const monthStr = String(m).padStart(2, '0');
      const dateFormatted = `${year}-${monthStr}-${dayStr}`;

      const revItem = {
        id: 'rev_' + Date.now() + '_' + m + '_' + Math.random().toString(36).substr(2, 4),
        source: source,
        value: value,
        date: dateFormatted,
        status: baseStatus,
        bank: bank,
        type: 'anual',
        annualGroupId: annualGroupId
      };

      this.data.months[m].revenues.push(revItem);
      results.push(revItem);
    }

    this.save();
    return { annualGroupId, items: results };
  }

  updateRevenue(monthNum, id, updatedData, updateAllInAnnualGroup = false) {
    if (!this.data.months[monthNum]) return null;
    const index = this.data.months[monthNum].revenues.findIndex(r => r.id === id);
    if (index === -1) return null;

    const currentItem = this.data.months[monthNum].revenues[index];
    const annualGroupId = currentItem.annualGroupId;

    if (updateAllInAnnualGroup && annualGroupId) {
      for (let m = 1; m <= 12; m++) {
        if (!this.data.months[m] || !this.data.months[m].revenues) continue;
        this.data.months[m].revenues.forEach(r => {
          if (r.annualGroupId === annualGroupId) {
            if (updatedData.source !== undefined) r.source = updatedData.source;
            if (updatedData.value !== undefined) r.value = Number(updatedData.value) || 0;
            if (updatedData.bank !== undefined) r.bank = updatedData.bank;
            if (updatedData.status !== undefined) r.status = updatedData.status;
            // Preserva o mês, apenas ajusta o dia se alterado
            if (updatedData.day !== undefined) {
              const currentYear = r.date ? r.date.split('-')[0] : new Date().getFullYear();
              const daysInMonth = new Date(currentYear, m, 0).getDate();
              const actualDay = Math.min(parseInt(updatedData.day, 10) || 5, daysInMonth);
              r.date = `${currentYear}-${String(m).padStart(2, '0')}-${String(actualDay).padStart(2, '0')}`;
            }
          }
        });
      }
    } else {
      this.data.months[monthNum].revenues[index] = {
        ...currentItem,
        ...updatedData,
        value: updatedData.value !== undefined ? (Number(updatedData.value) || 0) : currentItem.value
      };
    }

    this.save();
    return this.data.months[monthNum].revenues[index];
  }

  toggleRevenueStatus(monthNum, id) {
    if (!this.data.months[monthNum]) return null;
    const item = this.data.months[monthNum].revenues.find(r => r.id === id);
    if (item) {
      item.status = (item.status === 'Pago' || item.status === 'Recebido') ? 'Pendente' : 'Pago';
      this.save();
      return item;
    }
    return null;
  }

  addRevenueToMonths(config) {
    const source = (config.source || 'Rendimento').trim();
    const months = Array.isArray(config.months) && config.months.length > 0 ? config.months : [new Date().getMonth() + 1];
    const bank = config.bank || 'Nubank (Nu)';
    const value = config.value ? Number(config.value) : 0;
    const date = config.date || '';
    const status = config.status || 'Pendente';
    const isMultiMonth = months.length > 1;
    const groupId = isMultiMonth ? ('series_rev_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4)) : null;
    const created = [];
    const year = new Date().getFullYear();

    months.forEach(mNum => {
      const m = parseInt(mNum, 10);
      if (!this.data.months[m]) return;
      if (!this.data.months[m].revenues) this.data.months[m].revenues = [];

      let itemDate = date;
      if (!itemDate && value > 0) {
        const mStr = String(m).padStart(2, '0');
        itemDate = `${year}-${mStr}-05`;
      }

      const revItem = {
        id: 'rev_' + Date.now() + '_' + m + '_' + Math.random().toString(36).substr(2, 4),
        source: source,
        value: value,
        date: itemDate,
        status: status,
        bank: bank,
        type: isMultiMonth ? 'multi-mes' : 'mensal',
        annualGroupId: groupId
      };

      this.data.months[m].revenues.push(revItem);
      created.push(revItem);
    });

    this.save();
    return { groupId, items: created };
  }

  creditToBank(bankNameOrId, amount) {
    const val = Number(amount);
    if (!val || val <= 0) return null;
    const clean = (bankNameOrId || '').toLowerCase().trim();
    const account = this.data.accounts.find(a => 
      a.id.toLowerCase() === clean || 
      a.name.toLowerCase().includes(clean) || 
      clean.includes(a.name.toLowerCase())
    );
    if (account) {
      account.balance = Number((account.balance + val).toFixed(2));
      this.save();
      return account;
    }
    return null;
  }

  debitFromBank(bankNameOrId, amount) {
    const val = Number(amount);
    if (!val || val <= 0) return null;
    const clean = (bankNameOrId || '').toLowerCase().trim();
    const account = this.data.accounts.find(a => 
      a.id.toLowerCase() === clean || 
      a.name.toLowerCase().includes(clean) || 
      clean.includes(a.name.toLowerCase())
    );
    if (account) {
      account.balance = Number(Math.max(0, account.balance - val).toFixed(2));
      this.save();
      return account;
    }
    return null;
  }

  deleteRevenue(monthNum, id, deleteAllAnnual = false) {
    if (!this.data.months[monthNum]) return;
    const item = this.data.months[monthNum].revenues.find(r => r.id === id);

    if (deleteAllAnnual && item && item.annualGroupId) {
      const gid = item.annualGroupId;
      for (let m = 1; m <= 12; m++) {
        if (this.data.months[m] && this.data.months[m].revenues) {
          this.data.months[m].revenues = this.data.months[m].revenues.filter(r => r.annualGroupId !== gid);
        }
      }
    } else {
      this.data.months[monthNum].revenues = this.data.months[monthNum].revenues.filter(r => r.id !== id);
    }
    this.save();
  }

  getAllRevenuesOfYear(year = null) {
    const list = [];
    for (let m = 1; m <= 12; m++) {
      const monthObj = this.data.months[m];
      if (monthObj && monthObj.revenues) {
        monthObj.revenues.forEach(r => {
          if (!year || (r.date && r.date.startsWith(String(year)))) {
            list.push({
              ...r,
              monthNum: m,
              monthName: monthObj.name
            });
          }
        });
      }
    }
    return list;
  }

  addFixedExpense(monthNum, expense) {
    if (!this.data.months[monthNum]) return;
    expense.id = 'fix_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    expense.valueExpected = Number(expense.valueExpected) || 0;
    expense.valuePaid = Number(expense.valuePaid) || 0;
    this.data.months[monthNum].fixedExpenses.push(expense);
    this.save();
    return expense;
  }

  deleteFixedExpense(monthNum, id) {
    if (!this.data.months[monthNum]) return;
    this.data.months[monthNum].fixedExpenses = this.data.months[monthNum].fixedExpenses.filter(e => e.id !== id);
    this.save();
  }

  addVariableExpense(monthNum, expense) {
    if (!this.data.months[monthNum]) return;
    expense.id = 'var_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    expense.value = Number(expense.value) || 0;
    this.data.months[monthNum].variableExpenses.push(expense);
    this.save();
    return expense;
  }

  deleteVariableExpense(monthNum, id) {
    if (!this.data.months[monthNum]) return;
    this.data.months[monthNum].variableExpenses = this.data.months[monthNum].variableExpenses.filter(e => e.id !== id);
    this.save();
  }

  // Parcelas de cartão que incidem no mês
  getCardInstallmentsForMonth(monthNum) {
    const list = [];
    const targetMonth = Number(monthNum);

    this.data.cardPurchases.forEach(purchase => {
      const installmentsCount = Number(purchase.installments) || 1;
      const startMonth = Number(purchase.startMonth) || 1;
      const installmentValue = (Number(purchase.totalAmount) || 0) / installmentsCount;

      for (let i = 0; i < installmentsCount; i++) {
        // Mês da parcela (ajuste cíclico 1 a 12)
        const dueMonth = ((startMonth - 1 + i) % 12) + 1;
        if (dueMonth === targetMonth) {
          list.push({
            purchaseId: purchase.id,
            description: purchase.description,
            place: purchase.place,
            card: purchase.card,
            installmentIndex: i + 1,
            installmentsTotal: installmentsCount,
            value: installmentValue,
            date: purchase.date
          });
        }
      }
    });

    return list;
  }

  // Totais do mês
  getMonthSummary(monthNum) {
    const m = this.data.months[monthNum];
    if (!m) return { revenues: 0, revenuesPaid: 0, revenuesPending: 0, fixed: 0, variable: 0, card: 0, balance: 0 };

    const totalRevenues = m.revenues.reduce((acc, r) => acc + (Number(r.value) || 0), 0);
    const totalRevenuesPaid = m.revenues.filter(r => r.status === 'Pago' || r.status === 'Recebido').reduce((acc, r) => acc + (Number(r.value) || 0), 0);
    const totalRevenuesPending = m.revenues.filter(r => r.status === 'Pendente').reduce((acc, r) => acc + (Number(r.value) || 0), 0);

    const totalFixed = m.fixedExpenses.reduce((acc, e) => acc + (e.status === 'Pago' ? (Number(e.valuePaid) || Number(e.valueExpected) || 0) : (Number(e.valueExpected) || 0)), 0);
    const totalVariable = m.variableExpenses.reduce((acc, e) => acc + (Number(e.value) || 0), 0);
    
    const cardInstallments = this.getCardInstallmentsForMonth(monthNum);
    const totalCard = cardInstallments.reduce((acc, c) => acc + c.value, 0);

    const totalExpenses = totalFixed + totalVariable + totalCard;
    const balance = totalRevenues - totalExpenses;

    return {
      revenues: totalRevenues,
      revenuesPaid: totalRevenuesPaid,
      revenuesPending: totalRevenuesPending,
      fixed: totalFixed,
      variable: totalVariable,
      card: totalCard,
      expenses: totalExpenses,
      balance: balance
    };
  }

  // --- CARTÃO DE CRÉDITO ---
  addCardPurchase(purchase) {
    purchase.id = 'cp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    purchase.totalAmount = Number(purchase.totalAmount) || 0;
    purchase.installments = Number(purchase.installments) || 1;
    this.data.cardPurchases.push(purchase);
    this.save();
    return purchase;
  }

  deleteCardPurchase(id) {
    this.data.cardPurchases = this.data.cardPurchases.filter(p => p.id !== id);
    this.save();
  }

  // --- SONHOS & COMPRAS ---
  addDream(dream) {
    dream.id = 'drm_' + Date.now();
    dream.value = Number(dream.value) || 0;
    dream.saved = Number(dream.saved) || 0;
    this.data.dreams.push(dream);
    this.save();
    return dream;
  }

  deleteDream(id) {
    this.data.dreams = this.data.dreams.filter(d => d.id !== id);
    this.save();
  }

  updateDreamProgress(id, saved) {
    const d = this.data.dreams.find(item => item.id === id);
    if (d) {
      d.saved = Number(saved) || 0;
      this.save();
    }
  }

  // --- BOMBEIRO COMUNITÁRIO ---
  addFirefighterRecord(rec) {
    rec.id = 'ff_' + Date.now();
    rec.amount = Number(rec.amount) || 0;
    this.data.firefighterRecords.push(rec);
    this.save();
    return rec;
  }

  deleteFirefighterRecord(id) {
    this.data.firefighterRecords = this.data.firefighterRecords.filter(r => r.id !== id);
    this.save();
  }

  updateFirefighterStatus(id, newStatus) {
    const r = this.data.firefighterRecords.find(item => item.id === id);
    if (r) {
      r.status = newStatus;
      this.save();
    }
  }

  // --- JOTUR (CONFERÊNCIA DE TROCO) ---
  saveJoturCount(countData) {
    const record = {
      id: 'jt_' + Date.now(),
      date: new Date().toISOString(),
      baseAmount: this.data.jotur.baseAmount,
      totalCounted: countData.totalCounted,
      diff: countData.diff,
      status: countData.status,
      details: countData.details
    };
    this.data.jotur.history.unshift(record);
    // Limita a 50 históricos
    if (this.data.jotur.history.length > 50) this.data.jotur.history.pop();
    this.save();
    return record;
  }

  deleteJoturHistory(id) {
    this.data.jotur.history = this.data.jotur.history.filter(h => h.id !== id);
    this.save();
  }

  // --- INVESTIMENTOS ---
  addStock(stock) {
    stock.id = 'stk_' + Date.now();
    stock.shares = Number(stock.shares) || 0;
    stock.pricePerShare = Number(stock.pricePerShare) || 0;
    stock.total = stock.shares * stock.pricePerShare;
    this.data.investments.stocks.push(stock);
    this.save();
    return stock;
  }

  deleteStock(id) {
    this.data.investments.stocks = this.data.investments.stocks.filter(s => s.id !== id);
    this.save();
  }

  addNubankBox(box) {
    box.id = 'box_' + Date.now();
    box.amount = Number(box.amount) || 0;
    this.data.investments.nubankBoxes.push(box);
    this.save();
    return box;
  }

  deleteNubankBox(id) {
    this.data.investments.nubankBoxes = this.data.investments.nubankBoxes.filter(b => b.id !== id);
    this.save();
  }

  getInvestmentsSummary() {
    const totalStocks = this.data.investments.stocks.reduce((acc, s) => acc + (Number(s.total) || (Number(s.shares) * Number(s.pricePerShare)) || 0), 0);
    const totalBoxes = this.data.investments.nubankBoxes.reduce((acc, b) => acc + (Number(b.amount) || 0), 0);
    return {
      stocks: totalStocks,
      boxes: totalBoxes,
      total: totalStocks + totalBoxes
    };
  }

  // --- COFRE DE SENHAS ---
  addPassword(pwd) {
    pwd.id = 'pwd_' + Date.now();
    this.data.passwords.push(pwd);
    this.save();
    return pwd;
  }

  deletePassword(id) {
    this.data.passwords = this.data.passwords.filter(p => p.id !== id);
    this.save();
  }

  // --- BACKUP & RESTAURAÇÃO ---
  exportJSON() {
    return JSON.stringify(this.data, null, 2);
  }

  importJSON(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed && parsed.accounts) {
        this.data = parsed;
        this.save();
        return true;
      }
    } catch (e) {
      console.error('Falha ao importar JSON', e);
    }
    return false;
  }
}

// Instância Global Única
const store = new DataStore();
