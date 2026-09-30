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
    revenue.id = 'rev_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    revenue.value = Number(revenue.value) || 0;
    this.data.months[monthNum].revenues.push(revenue);
    this.save();
    return revenue;
  }

  deleteRevenue(monthNum, id) {
    if (!this.data.months[monthNum]) return;
    this.data.months[monthNum].revenues = this.data.months[monthNum].revenues.filter(r => r.id !== id);
    this.save();
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
    if (!m) return { revenues: 0, fixed: 0, variable: 0, card: 0, balance: 0 };

    const totalRevenues = m.revenues.reduce((acc, r) => acc + (Number(r.value) || 0), 0);
    const totalFixed = m.fixedExpenses.reduce((acc, e) => acc + (e.status === 'Pago' ? (Number(e.valuePaid) || Number(e.valueExpected) || 0) : (Number(e.valueExpected) || 0)), 0);
    const totalVariable = m.variableExpenses.reduce((acc, e) => acc + (Number(e.value) || 0), 0);
    
    const cardInstallments = this.getCardInstallmentsForMonth(monthNum);
    const totalCard = cardInstallments.reduce((acc, c) => acc + c.value, 0);

    const totalExpenses = totalFixed + totalVariable + totalCard;
    const balance = totalRevenues - totalExpenses;

    return {
      revenues: totalRevenues,
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
