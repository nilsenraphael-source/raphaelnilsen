/**
 * SISTEMA FINANCEIRO RAPHAEL NILSEN
 * Módulo de Dados, Persistência Local e Regras de Negócio
 */

const STORAGE_KEY = 'sf_raphael_nilsen_data_v1';
const SESSION_KEY = 'sf_raphael_nilsen_session';

// Estrutura inicial padrão de alta fidelidade
// Estrutura inicial padrão de alta fidelidade
function createEmptyMonths() {
  return {
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
  };
}

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
  months: createEmptyMonths(),

  // Suporte a Múltiplos Anos
  years: {},

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

  // 6. Controle de Troco Jotur (Base R$ 200,00)
  jotur: {
    baseAmount: 200.00,
    history: [],
    annualAccumulated: []
  },

  // 6.1 Controle de Troco Mastes (Base R$ 400,00)
  trocoMastes: {
    baseAmount: 400.00,
    history: [],
    annualAccumulated: []
  },

  // 7. Investimentos
  investments: {
    stocks: [],          // Bolsa de Valores: Ações / FIIs
    stockEarnings: [],   // Rendimentos / Proventos da Bolsa (Dividendos / JCP / Rendimentos FII)
    nubankBoxes: [],     // Caixinhas Nubank / Renda Fixa
    nubankEarnings: []   // Rendimentos das Caixinhas Nubank
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
    this.activeYear = new Date().getFullYear();
    this.data = this.load();
  }

  load() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const currYear = new Date().getFullYear();
      if (stored) {
        const parsed = JSON.parse(stored);
        const merged = { ...INITIAL_DATABASE, ...parsed };
        if (!merged.settings) {
          merged.settings = { ...INITIAL_DATABASE.settings };
        } else {
          merged.settings = { ...INITIAL_DATABASE.settings, ...merged.settings };
        }
        if (!merged.settings.userEmail) merged.settings.userEmail = 'raphael_nilsen@hotmail.com';
        if (!merged.settings.userPasswordHash) merged.settings.userPasswordHash = '12345';
        if (!merged.settings.supabase || 
            !merged.settings.supabase.url || 
            merged.settings.supabase.url.includes('seu-projeto') ||
            !merged.settings.supabase.anonKey ||
            merged.settings.supabase.anonKey.includes('sua-chave')) {
          merged.settings.supabase = { ...INITIAL_DATABASE.settings.supabase };
        }

        // Garante estruturas de investimentos e rendimentos
        if (!merged.investments || typeof merged.investments !== 'object') {
          merged.investments = { stocks: [], stockEarnings: [], nubankBoxes: [], nubankEarnings: [] };
        } else {
          if (!Array.isArray(merged.investments.stocks)) merged.investments.stocks = [];
          if (!Array.isArray(merged.investments.stockEarnings)) merged.investments.stockEarnings = [];
          if (!Array.isArray(merged.investments.nubankBoxes)) merged.investments.nubankBoxes = [];
          if (!Array.isArray(merged.investments.nubankEarnings)) merged.investments.nubankEarnings = [];
        }

        // Garante estruturas de troco (Jotur e Mastes) e acumulados anuais
        if (!merged.jotur || typeof merged.jotur !== 'object') {
          merged.jotur = { baseAmount: 200.00, history: [], annualAccumulated: [] };
        } else {
          if (!Array.isArray(merged.jotur.history)) merged.jotur.history = [];
          if (!Array.isArray(merged.jotur.annualAccumulated)) merged.jotur.annualAccumulated = [];
          if (!merged.jotur.baseAmount) merged.jotur.baseAmount = 200.00;
        }

        if (!merged.trocoMastes || typeof merged.trocoMastes !== 'object') {
          merged.trocoMastes = { baseAmount: 400.00, history: [], annualAccumulated: [] };
        } else {
          if (!Array.isArray(merged.trocoMastes.history)) merged.trocoMastes.history = [];
          if (!Array.isArray(merged.trocoMastes.annualAccumulated)) merged.trocoMastes.annualAccumulated = [];
          if (!merged.trocoMastes.baseAmount) merged.trocoMastes.baseAmount = 400.00;
        }

        if (!merged.cardPurchases) {
          merged.cardPurchases = [];
        } else {
          // Garante que apenas compras reais cadastradas pelo usuário existam
          merged.cardPurchases = merged.cardPurchases.filter(p => !/^cp_[0-9]{1,2}$/.test(p.id));

          // Sanitiza compras onde a data de início da cobrança ficou anterior à data da compra
          merged.cardPurchases.forEach(p => {
            if (p.date) {
              const parts = p.date.split('-');
              if (parts.length >= 2) {
                const dYear = parseInt(parts[0], 10);
                const dMonth = parseInt(parts[1], 10);
                const dDay = parts.length >= 3 ? parseInt(parts[2], 10) : 1;
                const sMonth = Number(p.startMonth);
                const sYear = Number(p.startYear);
                if (!sMonth || !sYear || sYear < dYear || (sYear === dYear && sMonth < dMonth)) {
                  const cardObj = (merged.cards || INITIAL_DATABASE.cards || []).find(c => (c.name || '').toLowerCase() === (p.card || '').toLowerCase());
                  const closingDay = cardObj ? (cardObj.closingDay || 1) : 1;
                  if (dDay > closingDay) {
                    p.startMonth = dMonth + 1;
                    p.startYear = dYear;
                    if (p.startMonth > 12) {
                      p.startMonth = 1;
                      p.startYear += 1;
                    }
                  } else {
                    p.startMonth = dMonth;
                    p.startYear = dYear;
                  }
                }
              }
            }
          });
        }

        // Multi-Ano: migração e compatibilidade transparente
        if (!merged.years || typeof merged.years !== 'object') {
          merged.years = {};
        }
        if (!merged.years[currYear]) {
          merged.years[currYear] = merged.months || createEmptyMonths();
        }
        this.activeYear = Number(merged.activeYear) || currYear;
        if (!merged.years[this.activeYear]) {
          merged.years[this.activeYear] = createEmptyMonths();
        }
        merged.months = merged.years[this.activeYear];
        return merged;
      }
    } catch (e) {
      console.error('Erro ao ler localStorage', e);
    }
    const initial = JSON.parse(JSON.stringify(INITIAL_DATABASE));
    const currYear = new Date().getFullYear();
    initial.years = { [currYear]: initial.months };
    this.activeYear = currYear;
    return initial;
  }

  setYear(year) {
    const y = parseInt(year, 10);
    if (!y || isNaN(y)) return;
    this.activeYear = y;
    this.data.activeYear = y;
    if (!this.data.years) this.data.years = {};
    if (!this.data.years[y]) {
      this.data.years[y] = createEmptyMonths();
    }
    this.data.months = this.data.years[y];
    this.save();
    return this.data.months;
  }

  getAvailableYears() {
    if (!this.data.years) this.data.years = {};
    const existing = Object.keys(this.data.years).map(Number).filter(n => !isNaN(n));
    const current = new Date().getFullYear();
    const defaults = [current - 2, current - 1, current, current + 1, current + 2, current + 3];
    return Array.from(new Set([...existing, ...defaults])).sort((a, b) => a - b);
  }

  copyFixedExpensesFromYear(fromYear, toYear) {
    const fY = Number(fromYear);
    const tY = Number(toYear);
    if (!this.data.years || !this.data.years[fY] || !this.data.years[tY]) return 0;
    let count = 0;
    for (let m = 1; m <= 12; m++) {
      const srcMonth = this.data.years[fY][m];
      const targetMonth = this.data.years[tY][m];
      if (srcMonth && targetMonth && srcMonth.fixedExpenses) {
        srcMonth.fixedExpenses.forEach(exp => {
          const exists = targetMonth.fixedExpenses.some(e => e.name.toLowerCase() === exp.name.toLowerCase());
          if (!exists) {
            targetMonth.fixedExpenses.push({
              ...exp,
              id: 'fix_' + Date.now() + '_' + m + '_' + Math.random().toString(36).substr(2, 4),
              status: 'Pendente'
            });
            count++;
          }
        });
      }
    }
    this.save();
    return count;
  }

  save(skipCloudSync = false) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
      if (!skipCloudSync && typeof window !== 'undefined' && window.supabaseService && window.supabaseService.isConfigured()) {
        if (typeof app !== 'undefined' && app.setCloudSyncing) {
          app.setCloudSyncing(true);
        }
        if (this._syncTimeout) clearTimeout(this._syncTimeout);
        this._syncTimeout = setTimeout(async () => {
          const res = await window.supabaseService.syncToCloud(true);
          if (typeof app !== 'undefined' && app.setCloudSyncing) {
            app.setCloudSyncing(false, res.success, res.timestamp);
          }
        }, 500);
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
    const bank = config.bank !== undefined ? config.bank : '';
    const value = config.value ? Number(config.value) : 0;
    const date = config.date || '';
    const status = config.status || 'Pendente';
    const isMultiMonth = months.length > 1;
    const groupId = isMultiMonth ? ('series_rev_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4)) : null;
    const created = [];
    const year = this.activeYear || new Date().getFullYear();

    months.forEach(mNum => {
      const m = parseInt(mNum, 10);
      if (!this.data.months[m]) return;
      if (!this.data.months[m].revenues) this.data.months[m].revenues = [];

      let itemDate = date || '';

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

      // Se foi inserido já como Pago e com banco e valor definidos, credita na conta
      if ((status === 'Pago' || status === 'Recebido') && bank && value > 0) {
        this.creditToBank(bank, value);
      }
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
          this.data.months[m].revenues.filter(r => r.annualGroupId === gid).forEach(r => {
            if (typeof window !== 'undefined' && window.supabaseService) {
              window.supabaseService.deleteRowFromTable('receitas', r.id);
            }
          });
          this.data.months[m].revenues = this.data.months[m].revenues.filter(r => r.annualGroupId !== gid);
        }
      }
    } else {
      this.data.months[monthNum].revenues = this.data.months[monthNum].revenues.filter(r => r.id !== id);
      if (typeof window !== 'undefined' && window.supabaseService) {
        window.supabaseService.deleteRowFromTable('receitas', id);
      }
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

  updateFixedExpense(monthNum, id, updatedData) {
    if (!this.data.months[monthNum] || !this.data.months[monthNum].fixedExpenses) return null;
    const index = this.data.months[monthNum].fixedExpenses.findIndex(e => e.id === id);
    if (index === -1) return null;

    const currentItem = this.data.months[monthNum].fixedExpenses[index];
    this.data.months[monthNum].fixedExpenses[index] = {
      ...currentItem,
      ...updatedData,
      valueExpected: updatedData.valueExpected !== undefined ? (Number(updatedData.valueExpected) || 0) : currentItem.valueExpected,
      valuePaid: updatedData.valuePaid !== undefined ? (Number(updatedData.valuePaid) || 0) : currentItem.valuePaid
    };

    this.save();
    return this.data.months[monthNum].fixedExpenses[index];
  }

  deleteFixedExpense(monthNum, id) {
    if (!this.data.months[monthNum]) return;
    this.data.months[monthNum].fixedExpenses = this.data.months[monthNum].fixedExpenses.filter(e => e.id !== id);
    if (typeof window !== 'undefined' && window.supabaseService) {
      window.supabaseService.deleteRowFromTable('despesas_fixas', id);
    }
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
    if (typeof window !== 'undefined' && window.supabaseService) {
      window.supabaseService.deleteRowFromTable('despesas_variaveis', id);
    }
    this.save();
  }

  // Parcelas de cartão que incidem no mês (considerando mês e ano)
  getCardInstallmentsForMonth(monthNum, year = this.activeYear) {
    const list = [];
    const targetMonth = Number(monthNum);
    const targetYear = Number(year) || this.activeYear;
    const m = (this.data.years && this.data.years[targetYear]) ? this.data.years[targetYear][targetMonth] : this.data.months[targetMonth];

    if (!this.data.cardPurchases) return list;

    this.data.cardPurchases.forEach(purchase => {
      const installmentsCount = Number(purchase.installments) || 1;
      let dateYear = this.activeYear;
      let dateMonth = 1;
      let dateDay = 1;
      if (purchase.date) {
        const parts = purchase.date.split('-');
        if (parts.length >= 2) {
          dateYear = parseInt(parts[0], 10) || dateYear;
          dateMonth = parseInt(parts[1], 10) || 1;
          if (parts.length >= 3) dateDay = parseInt(parts[2], 10) || 1;
        }
      }

      let startMonth = Number(purchase.startMonth);
      let startYear = Number(purchase.startYear);

      // Validação: 1ª parcela nunca antes da data da compra
      if (!startMonth || !startYear || startYear < dateYear || (startYear === dateYear && startMonth < dateMonth)) {
        const cardObj = (this.data.cards || []).find(c => (c.name || '').toLowerCase() === (purchase.card || '').toLowerCase());
        const closingDay = cardObj ? (cardObj.closingDay || 1) : 1;
        if (purchase.date && dateDay > closingDay) {
          startMonth = dateMonth + 1;
          startYear = dateYear;
          if (startMonth > 12) {
            startMonth = 1;
            startYear += 1;
          }
        } else {
          startMonth = dateMonth;
          startYear = dateYear;
        }
      }
      const installmentValue = (Number(purchase.totalAmount) || 0) / installmentsCount;

      for (let i = 0; i < installmentsCount; i++) {
        // Cálculo temporal exato: calcula o mês e o ano em que cada parcela incide
        const totalMonths = (startMonth - 1) + i;
        const dueYear = startYear + Math.floor(totalMonths / 12);
        const dueMonth = (totalMonths % 12) + 1;

        if (dueYear === targetYear && dueMonth === targetMonth) {
          const key = `${purchase.id}_${i + 1}`;
          const status = (m && m.cardInstallmentStatus && m.cardInstallmentStatus[key]) || 'Pendente';
          const valuePaidStored = (m && m.cardInstallmentPaid && m.cardInstallmentPaid[key] !== undefined && m.cardInstallmentPaid[key] !== null)
            ? Number(m.cardInstallmentPaid[key])
            : null;
          const valuePaid = valuePaidStored !== null ? valuePaidStored : (status === 'Pago' ? installmentValue : 0);

          list.push({
            key: key,
            purchaseId: purchase.id,
            description: purchase.description,
            place: purchase.place,
            card: purchase.card,
            installmentIndex: i + 1,
            installmentsTotal: installmentsCount,
            value: installmentValue,
            valueExpected: installmentValue,
            valuePaid: valuePaid,
            valuePaidStored: valuePaidStored,
            date: purchase.date,
            startMonth: startMonth,
            startYear: startYear,
            dueMonth: dueMonth,
            dueYear: dueYear,
            status: status
          });
        }
      }
    });

    return list;
  }

  toggleCardInstallmentStatus(monthNum, key, year = this.activeYear) {
    const targetYear = Number(year) || this.activeYear;
    const m = (this.data.years && this.data.years[targetYear]) ? this.data.years[targetYear][monthNum] : this.data.months[monthNum];
    if (!m) return 'Pendente';
    if (!m.cardInstallmentStatus) m.cardInstallmentStatus = {};
    if (!m.cardInstallmentPaid) m.cardInstallmentPaid = {};
    const current = m.cardInstallmentStatus[key] || 'Pendente';
    const next = current === 'Pago' ? 'Pendente' : 'Pago';
    m.cardInstallmentStatus[key] = next;
    if (next === 'Pago' && (m.cardInstallmentPaid[key] === undefined || m.cardInstallmentPaid[key] === null)) {
      const installments = this.getCardInstallmentsForMonth(monthNum, targetYear);
      const inst = installments.find(c => c.key === key);
      if (inst) m.cardInstallmentPaid[key] = inst.value;
    }
    this.save();
    return next;
  }

  setCardInstallmentPaidValue(monthNum, key, valuePaid, status = null, year = this.activeYear) {
    const targetYear = Number(year) || this.activeYear;
    const m = (this.data.years && this.data.years[targetYear]) ? this.data.years[targetYear][monthNum] : this.data.months[monthNum];
    if (!m) return;
    if (!m.cardInstallmentPaid) m.cardInstallmentPaid = {};
    m.cardInstallmentPaid[key] = Number(valuePaid) || 0;
    if (status) {
      if (!m.cardInstallmentStatus) m.cardInstallmentStatus = {};
      m.cardInstallmentStatus[key] = status;
    }
    this.save();
  }

  setAllCardInstallmentsStatus(monthNum, status = 'Pago', year = this.activeYear) {
    const targetYear = Number(year) || this.activeYear;
    const m = (this.data.years && this.data.years[targetYear]) ? this.data.years[targetYear][monthNum] : this.data.months[monthNum];
    if (!m) return;
    if (!m.cardInstallmentStatus) m.cardInstallmentStatus = {};
    if (!m.cardInstallmentPaid) m.cardInstallmentPaid = {};
    const installments = this.getCardInstallmentsForMonth(monthNum, targetYear);
    installments.forEach(inst => {
      m.cardInstallmentStatus[inst.key] = status;
      if (status === 'Pago' && (m.cardInstallmentPaid[inst.key] === undefined || m.cardInstallmentPaid[inst.key] === null)) {
        m.cardInstallmentPaid[inst.key] = inst.value;
      }
    });
    this.save();
  }

  setAllFixedExpensesStatus(monthNum, status = 'Pago') {
    const m = this.data.months[monthNum];
    if (!m || !m.fixedExpenses) return;
    m.fixedExpenses.forEach(e => {
      e.status = status;
      if (status === 'Pago') {
        if (!e.valuePaid || Number(e.valuePaid) === 0) {
          e.valuePaid = e.valueExpected;
        }
      } else {
        e.valuePaid = 0;
      }
    });
    this.save();
  }

  // Totais do mês
  getMonthSummary(monthNum) {
    const m = this.data.months[monthNum];
    if (!m) return {
      revenues: 0, revenuesPaid: 0, revenuesPending: 0,
      fixed: 0, fixedPaid: 0, fixedPending: 0, fixedCount: 0, fixedPaidCount: 0, fixedPct: 100,
      variable: 0,
      card: 0, cardExpected: 0, cardPaid: 0, cardPending: 0, cardCount: 0, cardPaidCount: 0, cardPct: 100,
      expenses: 0, balance: 0
    };

    const totalRevenues = m.revenues.reduce((acc, r) => acc + (Number(r.value) || 0), 0);
    const totalRevenuesPaid = m.revenues.filter(r => r.status === 'Pago' || r.status === 'Recebido').reduce((acc, r) => acc + (Number(r.value) || 0), 0);
    const totalRevenuesPending = m.revenues.filter(r => r.status === 'Pendente').reduce((acc, r) => acc + (Number(r.value) || 0), 0);

    const fixedExpected = m.fixedExpenses.reduce((acc, e) => acc + (Number(e.valueExpected) || 0), 0);
    const totalFixed = m.fixedExpenses.reduce((acc, e) => acc + (e.status === 'Pago' ? (Number(e.valuePaid) || Number(e.valueExpected) || 0) : (Number(e.valueExpected) || 0)), 0);
    const fixedPaid = m.fixedExpenses.filter(e => e.status === 'Pago').reduce((acc, e) => acc + (Number(e.valuePaid) || Number(e.valueExpected) || 0), 0);
    const fixedPending = m.fixedExpenses.filter(e => e.status !== 'Pago').reduce((acc, e) => acc + (Number(e.valueExpected) || 0), 0);
    const fixedCount = m.fixedExpenses.length;
    const fixedPaidCount = m.fixedExpenses.filter(e => e.status === 'Pago').length;
    const fixedPct = fixedCount === 0 ? 100 : (totalFixed > 0 ? Math.min(100, Math.round((fixedPaid / totalFixed) * 100)) : (fixedPaidCount === fixedCount ? 100 : 0));

    const totalVariable = m.variableExpenses.reduce((acc, e) => acc + (Number(e.value) || 0), 0);
    
    const cardInstallments = this.getCardInstallmentsForMonth(monthNum);
    const totalCard = cardInstallments.reduce((acc, c) => acc + (Number(c.value) || 0), 0);
    const cardPaid = cardInstallments.filter(c => c.status === 'Pago').reduce((acc, c) => acc + (Number(c.valuePaid) || Number(c.value) || 0), 0);
    const cardPending = cardInstallments.filter(c => c.status !== 'Pago').reduce((acc, c) => acc + (Number(c.value) || 0), 0);
    const cardCount = cardInstallments.length;
    const cardPaidCount = cardInstallments.filter(c => c.status === 'Pago').length;
    const cardPct = cardCount === 0 ? 100 : (totalCard > 0 ? Math.min(100, Math.round((cardPaid / totalCard) * 100)) : (cardPaidCount === cardCount ? 100 : 0));

    // Saldo Líquido do Mês: subtrai apenas despesas EFETIVAMENTE REALIZADAS / PAGAS
    const totalExpensesRealized = fixedPaid + totalVariable + cardPaid;
    const totalExpensesExpected = fixedExpected + totalVariable + totalCard;
    const balance = totalRevenuesPaid - totalExpensesRealized;

    return {
      revenues: totalRevenuesPaid,
      revenuesExpected: totalRevenues,
      revenuesPaid: totalRevenuesPaid,
      revenuesPending: totalRevenuesPending,
      fixed: totalFixed,
      fixedExpected: fixedExpected,
      fixedPaid: fixedPaid,
      fixedPending: fixedPending,
      fixedCount: fixedCount,
      fixedPaidCount: fixedPaidCount,
      fixedPct: fixedPct,
      variable: totalVariable,
      card: totalCard,
      cardExpected: totalCard,
      cardPaid: cardPaid,
      cardPending: cardPending,
      cardCount: cardCount,
      cardPaidCount: cardPaidCount,
      cardPct: cardPct,
      expenses: totalExpensesRealized,
      expensesExpected: totalExpensesExpected,
      balance: balance
    };
  }

  // --- CARTÃO DE CRÉDITO ---
  addCardPurchase(purchase) {
    purchase.id = 'cp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    purchase.totalAmount = Number(purchase.totalAmount) || 0;
    purchase.installments = Number(purchase.installments) || 1;
    
    let dateYear = this.activeYear;
    let dateMonth = 1;
    let dateDay = 1;
    if (purchase.date) {
      const parts = purchase.date.split('-');
      if (parts.length >= 2) {
        dateYear = parseInt(parts[0], 10) || dateYear;
        dateMonth = parseInt(parts[1], 10) || 1;
        if (parts.length >= 3) dateDay = parseInt(parts[2], 10) || 1;
      }
    }

    let sMonth = Number(purchase.startMonth);
    let sYear = Number(purchase.startYear);

    // Validação: a 1ª parcela nunca pode ser anterior à data da compra!
    if (!sMonth || !sYear || sYear < dateYear || (sYear === dateYear && sMonth < dateMonth)) {
      const cardObj = (this.data.cards || []).find(c => (c.name || '').toLowerCase() === (purchase.card || '').toLowerCase());
      const closingDay = cardObj ? (cardObj.closingDay || 1) : 1;
      if (purchase.date && dateDay > closingDay) {
        sMonth = dateMonth + 1;
        sYear = dateYear;
        if (sMonth > 12) {
          sMonth = 1;
          sYear += 1;
        }
      } else {
        sMonth = dateMonth;
        sYear = dateYear;
      }
    }

    purchase.startMonth = sMonth;
    purchase.startYear = sYear;
    if (!this.data.cardPurchases) this.data.cardPurchases = [];
    this.data.cardPurchases.push(purchase);
    this.save();
    return purchase;
  }

  deleteCardPurchase(id) {
    this.data.cardPurchases = this.data.cardPurchases.filter(p => p.id !== id);
    if (typeof window !== 'undefined' && window.supabaseService) {
      window.supabaseService.deleteRowFromTable('compras_cartao', id);
    }
    this.save();
  }

  // --- SONHOS & COMPRAS ---
  addDream(dream) {
    dream.id = 'drm_' + Date.now();
    dream.value = Number(dream.value) || 0;
    dream.saved = Number(dream.saved) || 0;
    dream.imageUrl = dream.imageUrl || '';
    dream.deposits = Array.isArray(dream.deposits) ? dream.deposits : [];
    if (dream.saved > 0 && dream.deposits.length === 0) {
      dream.deposits.push({
        id: 'dep_' + Date.now(),
        date: new Date().toISOString().split('T')[0],
        value: dream.saved,
        notes: 'Valor inicial'
      });
    }
    this.data.dreams.push(dream);
    this.save();
    return dream;
  }

  deleteDream(id) {
    this.data.dreams = this.data.dreams.filter(d => d.id !== id);
    if (typeof window !== 'undefined' && window.supabaseService) {
      window.supabaseService.deleteRowFromTable('sonhos_metas', id);
    }
    this.save();
  }

  updateDreamProgress(id, saved) {
    const d = this.data.dreams.find(item => item.id === id);
    if (d) {
      d.saved = Number(saved) || 0;
      this.save();
    }
  }

  addDreamDeposit(dreamId, deposit) {
    const d = this.data.dreams.find(item => item.id === dreamId);
    if (d) {
      if (!Array.isArray(d.deposits)) {
        d.deposits = [];
        if (Number(d.saved) > 0) {
          d.deposits.push({
            id: 'dep_legacy_' + Date.now(),
            date: new Date().toISOString().split('T')[0],
            value: Number(d.saved),
            notes: 'Valor acumulado inicial'
          });
        }
      }
      deposit.id = deposit.id || ('dep_' + Date.now());
      deposit.value = Number(deposit.value) || 0;
      deposit.date = deposit.date || new Date().toISOString().split('T')[0];
      deposit.notes = deposit.notes || '';
      d.deposits.push(deposit);
      d.saved = d.deposits.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);
      this.save();
      return deposit;
    }
    return null;
  }

  deleteDreamDeposit(dreamId, depositId) {
    const d = this.data.dreams.find(item => item.id === dreamId);
    if (d && Array.isArray(d.deposits)) {
      d.deposits = d.deposits.filter(dep => dep.id !== depositId);
      d.saved = d.deposits.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);
      this.save();
    }
  }

  updateDreamImage(dreamId, imageUrl) {
    const d = this.data.dreams.find(item => item.id === dreamId);
    if (d) {
      d.imageUrl = imageUrl || '';
      this.save();
    }
  }

  // --- BOMBEIRO COMUNITÁRIO ---
  addFirefighterRecord(rec) {
    rec.id = rec.id || ('ff_' + Date.now());
    rec.shifts = rec.shifts || [];
    if (rec.shifts.length > 0) {
      const contemplated = rec.shifts.filter(s => s.contemplated).length;
      rec.amount = contemplated * 125.00;
    } else {
      rec.amount = Number(rec.amount) || 0;
    }
    this.data.firefighterRecords.push(rec);
    this.save();
    return rec;
  }

  updateFirefighterRecord(id, updatedData) {
    const idx = this.data.firefighterRecords.findIndex(r => r.id === id);
    if (idx !== -1) {
      const rec = { ...this.data.firefighterRecords[idx], ...updatedData };
      rec.shifts = rec.shifts || [];
      if (rec.shifts.length > 0) {
        const contemplated = rec.shifts.filter(s => s.contemplated).length;
        rec.amount = contemplated * 125.00;
      }
      this.data.firefighterRecords[idx] = rec;
      this.save();
      return rec;
    }
    return null;
  }

  toggleShiftContemplated(recordId, shiftId) {
    const rec = this.data.firefighterRecords.find(r => r.id === recordId);
    if (rec && rec.shifts) {
      const shift = rec.shifts.find(s => s.id === shiftId);
      if (shift) {
        shift.contemplated = !shift.contemplated;
        const contemplated = rec.shifts.filter(s => s.contemplated).length;
        rec.amount = contemplated * 125.00;
        this.save();
        return rec;
      }
    }
    return null;
  }

  deleteFirefighterRecord(id) {
    this.data.firefighterRecords = this.data.firefighterRecords.filter(r => r.id !== id);
    if (typeof window !== 'undefined' && window.supabaseService) {
      window.supabaseService.deleteRowFromTable('bombeiro_ressarcimento', id);
    }
    this.save();
  }

  updateFirefighterStatus(id, newStatus, paymentDate = null) {
    const r = this.data.firefighterRecords.find(item => item.id === id);
    if (r) {
      r.status = newStatus;
      if (newStatus === 'Pago' && !r.datePayment) {
        r.datePayment = paymentDate || new Date().toISOString().split('T')[0];
      }
      this.save();
    }
  }

  getAllFirefighterShifts() {
    const all = [];
    (this.data.firefighterRecords || []).forEach(rec => {
      (rec.shifts || []).forEach(sh => {
        all.push({
          ...sh,
          recordId: rec.id,
          monthRef: rec.monthRef,
          status: rec.status
        });
      });
    });
    return all;
  }

  // --- JOTUR (CONFERÊNCIA DE TROCO) ---
  saveJoturCount(countData) {
    if (!this.data.jotur) {
      this.data.jotur = { baseAmount: 200.00, history: [], annualAccumulated: [] };
    }
    const record = {
      id: 'jt_' + Date.now(),
      date: new Date().toISOString(),
      baseAmount: this.data.jotur.baseAmount || 200.00,
      totalCounted: countData.totalCounted,
      diff: countData.diff,
      status: countData.status,
      details: countData.details
    };
    this.data.jotur.history.unshift(record);
    if (this.data.jotur.history.length > 250) this.data.jotur.history.pop();
    this.save();
    return record;
  }

  deleteJoturHistory(id) {
    if (!this.data.jotur) return;
    this.data.jotur.history = (this.data.jotur.history || []).filter(h => h.id !== id);
    if (typeof window !== 'undefined' && window.supabaseService) {
      window.supabaseService.deleteRowFromTable('troco_jotur', id);
    }
    this.save();
  }

  // --- CONTROLE DE TROCO MASTES (BASE R$ 400,00) ---
  saveMastesCount(countData) {
    if (!this.data.trocoMastes) {
      this.data.trocoMastes = { baseAmount: 400.00, history: [], annualAccumulated: [] };
    }
    const record = {
      id: 'ms_' + Date.now(),
      date: new Date().toISOString(),
      baseAmount: this.data.trocoMastes.baseAmount || 400.00,
      totalCounted: countData.totalCounted,
      diff: countData.diff,
      status: countData.status,
      details: countData.details
    };
    this.data.trocoMastes.history.unshift(record);
    if (this.data.trocoMastes.history.length > 250) this.data.trocoMastes.history.pop();
    this.save();
    return record;
  }

  deleteMastesHistory(id) {
    if (!this.data.trocoMastes) return;
    this.data.trocoMastes.history = (this.data.trocoMastes.history || []).filter(h => h.id !== id);
    if (typeof window !== 'undefined' && window.supabaseService) {
      window.supabaseService.deleteRowFromTable('troco_mastes', id);
    }
    this.save();
  }

  // --- ACUMULADOS ANUAIS E FECHAMENTO DE ANO (JOTUR / MASTES) ---
  getTrocoAnnualSummary(type = 'jotur') {
    const target = type === 'mastes' ? this.data.trocoMastes : this.data.jotur;
    const history = (target && Array.isArray(target.history)) ? target.history : [];
    
    let totalConferences = history.length;
    let totalSobras = 0;
    let totalFaltas = 0;
    let netDifference = 0;

    history.forEach(h => {
      const diff = Number(h.diff) || 0;
      netDifference += diff;
      if (diff > 0.005) {
        totalSobras += diff;
      } else if (diff < -0.005) {
        totalFaltas += Math.abs(diff);
      }
    });

    let status = 'Exato';
    if (netDifference > 0.009) status = 'Sobra';
    else if (netDifference < -0.009) status = 'Falta';

    return {
      totalConferences,
      totalSobras,
      totalFaltas,
      netDifference,
      status
    };
  }

  closeTrocoYear(type = 'jotur', year = null) {
    const target = type === 'mastes' ? this.data.trocoMastes : this.data.jotur;
    if (!target) return { success: false, message: 'Dados do controle não encontrados.' };
    if (!Array.isArray(target.annualAccumulated)) target.annualAccumulated = [];

    const summary = this.getTrocoAnnualSummary(type);
    if (summary.totalConferences === 0) {
      return { success: false, message: 'Nenhuma conferência salva na planilha para arquivar no acumulado.' };
    }

    const closeYearNum = year || this.activeYear || new Date().getFullYear();
    const record = {
      id: 'acc_' + Date.now(),
      year: closeYearNum,
      closedAt: new Date().toISOString(),
      type: type,
      baseAmount: target.baseAmount,
      totalConferences: summary.totalConferences,
      totalSobras: summary.totalSobras,
      totalFaltas: summary.totalFaltas,
      netDifference: summary.netDifference,
      status: summary.status
    };

    target.annualAccumulated.unshift(record);
    target.history = []; // Limpa a planilha ativa para o novo ano
    this.save();
    return { success: true, record };
  }

  deleteTrocoAnnualAccumulated(type = 'jotur', id) {
    const target = type === 'mastes' ? this.data.trocoMastes : this.data.jotur;
    if (!target || !Array.isArray(target.annualAccumulated)) return;
    target.annualAccumulated = target.annualAccumulated.filter(a => a.id !== id);
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
    if (typeof window !== 'undefined' && window.supabaseService) {
      window.supabaseService.deleteRowFromTable('investimentos_bolsa', id);
    }
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
    if (typeof window !== 'undefined' && window.supabaseService) {
      window.supabaseService.deleteRowFromTable('investimentos_caixinhas', id);
    }
    this.save();
  }

  // --- RENDIMENTOS BOLSA ---
  addStockEarning(earning) {
    earning.id = 'stk_earn_' + Date.now();
    earning.amount = Number(earning.amount) || 0;
    if (!this.data.investments.stockEarnings) this.data.investments.stockEarnings = [];
    this.data.investments.stockEarnings.push(earning);
    this.save();
    return earning;
  }

  deleteStockEarning(id) {
    if (!this.data.investments.stockEarnings) return;
    this.data.investments.stockEarnings = this.data.investments.stockEarnings.filter(e => e.id !== id);
    if (typeof window !== 'undefined' && window.supabaseService) {
      window.supabaseService.deleteRowFromTable('investimentos_rendimentos_bolsa', id);
    }
    this.save();
  }

  // --- RENDIMENTOS NUBANK ---
  addNubankEarning(earning) {
    earning.id = 'box_earn_' + Date.now();
    earning.amount = Number(earning.amount) || 0;
    if (!this.data.investments.nubankEarnings) this.data.investments.nubankEarnings = [];
    this.data.investments.nubankEarnings.push(earning);
    this.save();
    return earning;
  }

  deleteNubankEarning(id) {
    if (!this.data.investments.nubankEarnings) return;
    this.data.investments.nubankEarnings = this.data.investments.nubankEarnings.filter(e => e.id !== id);
    if (typeof window !== 'undefined' && window.supabaseService) {
      window.supabaseService.deleteRowFromTable('investimentos_rendimentos_caixinhas', id);
    }
    this.save();
  }

  getInvestmentsSummary() {
    const stocks = this.data.investments.stocks || [];
    const boxes = this.data.investments.nubankBoxes || [];
    const stockEarnings = this.data.investments.stockEarnings || [];
    const nubankEarnings = this.data.investments.nubankEarnings || [];

    const totalStocks = stocks.reduce((acc, s) => acc + (Number(s.total) || (Number(s.shares) * Number(s.pricePerShare)) || 0), 0);
    const totalBoxes = boxes.reduce((acc, b) => acc + (Number(b.amount) || 0), 0);
    const totalInvested = totalStocks + totalBoxes;

    const totalStockEarnings = stockEarnings.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
    const totalNubankEarnings = nubankEarnings.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
    const totalEarnings = totalStockEarnings + totalNubankEarnings;

    const yieldGlobal = totalInvested > 0 ? (totalEarnings / totalInvested) * 100 : 0;
    const yieldStocks = totalStocks > 0 ? (totalStockEarnings / totalStocks) * 100 : 0;
    const yieldNubank = totalBoxes > 0 ? (totalNubankEarnings / totalBoxes) * 100 : 0;

    // Agrupamento por ativo da bolsa (Total Investido por Ativo)
    const stocksByAsset = {};
    stocks.forEach(s => {
      const ticker = (s.ticker || 'OUTROS').toUpperCase().trim();
      const val = Number(s.total) || (Number(s.shares) * Number(s.pricePerShare)) || 0;
      stocksByAsset[ticker] = (stocksByAsset[ticker] || 0) + val;
    });

    // Agrupamento de Rendimentos por Ativo da bolsa
    const earningsByStock = {};
    stockEarnings.forEach(e => {
      const ticker = (e.ticker || 'OUTROS').toUpperCase().trim();
      const val = Number(e.amount) || 0;
      earningsByStock[ticker] = (earningsByStock[ticker] || 0) + val;
    });

    // Agrupamento Nubank por Caixinha (Total Aplicado)
    const boxesByName = {};
    boxes.forEach(b => {
      const name = (b.name || 'Geral').trim();
      const val = Number(b.amount) || 0;
      boxesByName[name] = (boxesByName[name] || 0) + val;
    });

    // Agrupamento de Rendimentos Nubank por Caixinha
    const earningsByBox = {};
    nubankEarnings.forEach(e => {
      const name = (e.boxName || 'Geral').trim();
      const val = Number(e.amount) || 0;
      earningsByBox[name] = (earningsByBox[name] || 0) + val;
    });

    // Proventos e Rendimentos do Mês Atual (Ano/Mês corrente)
    const today = new Date();
    const currYearMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const monthStockEarnings = stockEarnings
      .filter(e => (e.date || '').startsWith(currYearMonth))
      .reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
    const monthNubankEarnings = nubankEarnings
      .filter(e => (e.date || '').startsWith(currYearMonth))
      .reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
    const currentMonthEarnings = monthStockEarnings + monthNubankEarnings;

    // Maior Ativo / Posição (Top Asset)
    let topAssetTicker = '-';
    let topAssetVal = 0;
    Object.entries(stocksByAsset).forEach(([ticker, val]) => {
      if (val > topAssetVal) {
        topAssetVal = val;
        topAssetTicker = ticker;
      }
    });
    // Se não houver ativo em bolsa mas houver caixinha
    if (topAssetVal === 0 && boxes.length > 0) {
      Object.entries(boxesByName).forEach(([name, val]) => {
        if (val > topAssetVal) {
          topAssetVal = val;
          topAssetTicker = name;
        }
      });
    }
    const topAssetShare = totalInvested > 0 ? (topAssetVal / totalInvested) * 100 : 0;

    return {
      stocks: totalStocks,
      boxes: totalBoxes,
      total: totalInvested,
      totalInvested: totalInvested,
      totalAccumulated: totalInvested + totalEarnings,
      totalStockEarnings,
      totalNubankEarnings,
      totalEarnings,
      currentMonthEarnings,
      stockCount: stocks.length,
      boxCount: boxes.length,
      totalPositions: stocks.length + boxes.length,
      earningsCount: stockEarnings.length + nubankEarnings.length,
      topAssetTicker,
      topAssetVal,
      topAssetShare,
      yieldGlobal,
      yieldStocks,
      yieldNubank,
      stocksByAsset,
      earningsByStock,
      boxesByName,
      earningsByBox
    };
  }

  // --- COFRE DE SENHAS ---
  addPassword(pwd) {
    if (!pwd.id) pwd.id = 'pwd_' + Date.now();
    if (!pwd.tabela) pwd.tabela = 'bancos_cartoes';
    if (!pwd.criado_em) pwd.criado_em = new Date().toISOString();
    this.data.passwords.push(pwd);
    this.save();
    return pwd;
  }

  updatePassword(id, updatedFields) {
    const idx = this.data.passwords.findIndex(p => p.id === id);
    if (idx !== -1) {
      this.data.passwords[idx] = {
        ...this.data.passwords[idx],
        ...updatedFields,
        atualizado_em: new Date().toISOString()
      };
      this.save();
      return this.data.passwords[idx];
    }
    return null;
  }

  deletePassword(id) {
    this.data.passwords = this.data.passwords.filter(p => p.id !== id);
    if (typeof window !== 'undefined' && window.supabaseService) {
      window.supabaseService.deleteRowFromTable('cofre_senhas', id);
    }
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
