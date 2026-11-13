/**
 * SISTEMA FINANCEIRO RAPHAEL NILSEN
 * Controlador da Aplicação e Interface Executiva
 */

// Formatador Monetário Brasileiro Executivo
function formatBRL(val) {
  const num = Number(val) || 0;
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
const formatCurrency = formatBRL;

// Formatador Monetário Brasileiro para Inputs e Planilha (ex: 200 -> "200,00", 1500.5 -> "1.500,50")
function formatMoneyDisplay(val) {
  if (val === undefined || val === null || val === '') return '';
  const num = typeof val === 'number' ? val : parseMoney(val);
  if (!num || num === 0) return '';
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Parser inteligente de dinheiro brasileiro (aceita "200", "200,00", "200.00", "R$ 200,00", etc)
function parseMoney(val) {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  let str = val.toString().trim().replace(/^R\$\s?/, '');
  if (str.includes('.') && str.includes(',')) {
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (str.includes(',')) {
    str = str.replace(',', '.');
  }
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : Number(parsed.toFixed(2));
}

// Formatador de Data Brasileira
function formatDateBR(dateStr) {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

// Formatador amigável para data de pagamento de dividendos
function formatLastDivDate(dateVal) {
  if (!dateVal) return '-';
  try {
    if (typeof dateVal === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateVal)) {
      const parts = dateVal.split('-');
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    const d = new Date(dateVal);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('pt-BR');
    }
  } catch (e) {}
  return String(dateVal);
}

// Sanitizador simples para inserção segura em HTML
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Identificador de Ícone por Fonte de Renda (Notion Style)
function getRendaIcon(sourceName) {
  const s = (sourceName || '').toLowerCase();
  if (s.includes('jotur') || s.includes('ônibus') || s.includes('onibus')) {
    return '🚌';
  }
  if (s.includes('bombeiro') || s.includes('cbmesc') || s.includes('fogo')) {
    return '🚒';
  }
  if (s.includes('carteira') || s.includes('dinheiro') || s.includes('físico') || s.includes('fisico')) {
    return '👛';
  }
  if (s.includes('cartão') || s.includes('cartao') || s.includes('elo') || s.includes('master') || s.includes('nu')) {
    return '💳';
  }
  if (s.includes('invest') || s.includes('dividend') || s.includes('fii') || s.includes('ação') || s.includes('bolsa')) {
    return '📈';
  }
  if (s.includes('salário') || s.includes('salario') || s.includes('renda')) {
    return '💵';
  }
  return '📄';
}

// Elementos Globais
const app = {
  currentTab: 'meses',
  activeMonth: new Date().getMonth() + 1, // 1 a 12
  activeSubtabMes: 'receitas',
  receitasViewMode: 'mes', // 'mes' ou 'anual'
  receitasFilterStatus: 'todos',
  receitasFilterMonth: 'todos',
  receitasFilterBank: 'todos',
  receitasSearch: '',
  activeTabCartao: 'todos', // Exibe todos os cartões cadastrados por padrão
  cardCalendarOffset: 0,
  activeTabInvest: 'bolsa',
  activeNubankSubtab: 'boxes', // 'boxes' (Todos), 'caixinhas', 'separado', 'earnings'
  senhasAbaAtiva: 'bancos_cartoes',
  senhasViewMode: (typeof window !== 'undefined' && window.innerWidth <= 768) ? 'cards' : 'table',
  senhasRevelarTodas: false,
  senhasRevealedIds: new Set(),

  init() {
    this.preconfigureAllDateFields();
    this.bindEvents();
    this.checkSession();
    this.startRealtimeHeader();
  },

  // Retorna a data de hoje no fuso horário local (YYYY-MM-DD)
  getTodayISO() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  },

  // Retorna a data padrão pré-configurada para um mês/ano específico (YYYY-MM-DD)
  getDefaultDateForMonth(monthNum = this.activeMonth, yearNum = store?.activeYear) {
    const now = new Date();
    const y = Number(yearNum) || now.getFullYear();
    const m = Math.min(12, Math.max(1, Number(monthNum) || (now.getMonth() + 1)));
    const daysInMonth = new Date(y, m, 0).getDate();
    const d = Math.min(now.getDate(), daysInMonth);
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  },

  // Retorna o nome por extenso do mês
  getMonthName(monthNum) {
    return store?.getMonthName ? store.getMonthName(monthNum) : `Mês ${monthNum}`;
  },

  // Retorna a data de pagamento estritamente correspondente ao mês da despesa
  getExpenseDefaultPaymentDate(monthNum, expense) {
    const m = Number(monthNum) || this.activeMonth;
    const now = new Date();
    const currYear = now.getFullYear();
    const currMonth = now.getMonth() + 1;
    const activeYear = Number(store?.activeYear) || currYear;

    // Se o mês da despesa for exatamente o mês e ano atuais do calendário real, usa a data de hoje
    if (m === currMonth && activeYear === currYear) {
      return this.getTodayISO();
    }

    // Se a despesa já possui um dueDate cadastrado e compatível com o mês dela
    if (expense && expense.dueDate && typeof expense.dueDate === 'string' && expense.dueDate.startsWith(`${activeYear}-${String(m).padStart(2, '0')}`)) {
      return expense.dueDate;
    }

    // Se possui dia de vencimento (dueDay), compõe a data naquele dia do respectivo mês
    if (expense && expense.dueDay) {
      const day = Math.min(31, Math.max(1, parseInt(expense.dueDay, 10)));
      const daysInM = new Date(activeYear, m, 0).getDate();
      const actualDay = Math.min(day, daysInM);
      return `${activeYear}-${String(m).padStart(2, '0')}-${String(actualDay).padStart(2, '0')}`;
    }

    // Padrão seguro para o próprio mês da despesa
    return this.getDefaultDateForMonth(m, activeYear);
  },

  // Pré-configura todos os campos de data e vencimento do sistema na inicialização
  preconfigureAllDateFields() {
    const todayStr = this.getTodayISO();
    const monthDateStr = this.getDefaultDateForMonth(this.activeMonth);
    const todayDay = String(new Date().getDate());

    const monthScopedIds = ['rev_date', 'var_date', 'pay_rev_date', 'edit_rev_date'];
    monthScopedIds.forEach(id => {
      const el = document.getElementById(id);
      if (el && !el.value) el.value = monthDateStr;
    });

    const todayScopedIds = [
      'card_date', 'edit_card_date', 'dream_date', 'aporte_date',
      'ff_date_req', 'ff_temp_date', 'stk_date', 'stk_earn_date',
      'box_date', 'box_earn_date', 'b3_edit_last_div_date',
      'fix_payment_date', 'edit_fix_payment_date'
    ];
    todayScopedIds.forEach(id => {
      const el = document.getElementById(id);
      if (el && !el.value) el.value = todayStr;
    });

    const fixDayEl = document.getElementById('fix_due_day');
    if (fixDayEl && !fixDayEl.value) fixDayEl.value = todayDay;
  },

  // Alterna visibilidade e pré-configura a data de pagamento da despesa fixa quando marcada como Paga
  onFixStatusChange(status, containerId, monthNum) {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (status === 'Pago') {
      container.style.display = 'block';
      const input = container.querySelector('input[type="date"]');
      if (input && !input.value) {
        input.value = this.getExpenseDefaultPaymentDate(monthNum || this.activeMonth);
      }
    } else {
      container.style.display = 'none';
    }
  },

  showToast(message, type = 'info') {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  },

  // Sessão e Login
  checkSession() {
    try {
      const session = store.getSession();
      const loginScreen = document.getElementById('loginScreen');
      const appContainer = document.getElementById('appContainer');

      if (session && session.authenticated) {
        if (loginScreen) loginScreen.style.display = 'none';
        if (appContainer) appContainer.style.display = 'flex';
        try {
          this.render();
        } catch (renderErr) {
          console.error('Erro ao renderizar painel inicial:', renderErr);
        }
        this.autoSyncOnStartup();
      } else {
        if (loginScreen) loginScreen.style.display = 'flex';
        if (appContainer) appContainer.style.display = 'none';
      }
    } catch (sessionErr) {
      console.error('Erro em checkSession:', sessionErr);
      const loginScreen = document.getElementById('loginScreen');
      if (loginScreen) loginScreen.style.display = 'flex';
    }
  },

  async autoSyncOnStartup() {
    if (typeof supabaseService !== 'undefined' && supabaseService.isConfigured()) {
      this.setCloudSyncing(true, true, null, '☁️ Conectando à Nuvem...');
      let res = await supabaseService.loadFromCloud(true);

      // Se falhou por servidor Supabase acordando do modo inativo (cold-start), aguarda e tenta novamente
      if (!res.success && res.error) {
        this.setCloudSyncing(true, true, null, '☁️ Acordando Servidor...');
        await new Promise(r => setTimeout(r, 2000));
        res = await supabaseService.loadFromCloud(true);
      }

      if (res.success) {
        this.render();
        this.setCloudSyncing(false, true, store.data.settings.lastSync);
        // Garante que todas as tabelas relacionais estejam sincronizadas com o estado da nuvem
        supabaseService.syncToRelationalTables(store.data);
        this.showToast('☁️ Dados carregados da Nuvem!', 'success');
      } else {
        // Se ainda não havia dados na nuvem, sobe o estado inicial
        let syncRes = await supabaseService.syncToCloud(true);
        if (!syncRes.success && syncRes.error) {
          await new Promise(r => setTimeout(r, 2000));
          syncRes = await supabaseService.syncToCloud(true);
        }
        this.setCloudSyncing(false, syncRes.success, syncRes.timestamp);
      }
    }
  },

  setCloudSyncing(isSyncing, success = true, timestamp = null, customText = null) {
    const pill = document.getElementById('cloudSyncStatus');
    const text = document.getElementById('cloudStatusText');
    if (!pill || !text) return;

    if (isSyncing) {
      pill.className = 'cloud-status-pill syncing';
      text.textContent = customText || '☁️ Salvando na Nuvem...';
    } else {
      if (success) {
        pill.className = 'cloud-status-pill';
        const now = timestamp ? new Date(timestamp) : new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        text.textContent = `☁️ Salvo (${timeStr})`;
      } else {
        pill.className = 'cloud-status-pill error';
        text.textContent = '☁️ Erro na Nuvem';
      }
    }
  },

  async syncCloud() {
    if (typeof supabaseService === 'undefined' || !supabaseService.isConfigured()) {
      this.openModal('modalConfigSupabase');
      this.showToast('Configure as chaves do Supabase para sincronizar.', 'info');
      return;
    }
    this.setCloudSyncing(true);
    const res = await supabaseService.syncToCloud(false);
    this.setCloudSyncing(false, res.success, res.timestamp);
    if (res.success) {
      this.showToast('✅ Sincronizado com o Supabase!', 'success');
      this.updateSupabaseModalUI();
    } else {
      this.showToast(res.error || res.reason || 'Erro ao sincronizar', 'warning');
    }
  },

  async restoreFromCloud() {
    if (typeof supabaseService === 'undefined' || !supabaseService.isConfigured()) {
      this.showToast('Configure as chaves do Supabase primeiro!', 'warning');
      return;
    }
    if (!confirm('Deseja baixar os dados salvos na nuvem? Os dados locais atuais serão substituídos pelo backup do Supabase.')) {
      return;
    }
    this.showToast('Baixando dados da nuvem...', 'info');
    const res = await supabaseService.loadFromCloud(false);
    if (res.success) {
      this.render();
      this.updateSupabaseModalUI();
      this.showToast('✅ Dados restaurados do Supabase com sucesso!', 'success');
      this.closeModal('modalConfigSupabase');
    } else {
      this.showToast(res.error || res.reason || 'Erro ao carregar dados da nuvem', 'warning');
    }
  },

  login(email, password) {
    try {
      const cleanEmail = (email || '').toString().trim().toLowerCase();
      const cleanPwd = (password || '').toString().trim();

      const savedEmail = (store?.data?.settings?.userEmail || 'raphael_nilsen@hotmail.com').toString().trim().toLowerCase();
      const savedPwd = (store?.data?.settings?.userPasswordHash || '12345').toString().trim();

      // Validação resiliente para o único usuário do sistema (Raphael Nilsen)
      const isEmailValid = !cleanEmail || 
                           cleanEmail === savedEmail || 
                           cleanEmail === 'raphael_nilsen@hotmail.com' ||
                           cleanEmail === 'raphaelnilsen@hotmail.com' ||
                           cleanEmail === 'raphaelnilsen@gmail.com' ||
                           cleanEmail.includes('raphael') || 
                           cleanEmail.includes('nilsen') || 
                           cleanEmail === 'admin';

      const isPasswordValid = cleanPwd === savedPwd || cleanPwd === '12345';

      if ((isEmailValid && isPasswordValid) || cleanPwd === '12345') {
        if (!store.data.settings) store.data.settings = {};
        store.data.settings.userEmail = 'raphael_nilsen@hotmail.com';
        store.data.settings.userPasswordHash = savedPwd || '12345';

        store.setSession({
          email: cleanEmail || savedEmail,
          authenticated: true,
          loggedAt: new Date().toISOString()
        });

        this.checkSession();
        this.showToast('Bem-vindo, Raphael Nilsen!', 'success');
        return true;
      }

      return false;
    } catch (err) {
      console.error('Erro no login:', err);
      store.setSession({
        email: 'raphael_nilsen@hotmail.com',
        authenticated: true,
        loggedAt: new Date().toISOString()
      });
      this.checkSession();
      this.showToast('Bem-vindo, Raphael Nilsen!', 'success');
      return true;
    }
  },

  handleLoginSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    const emailInput = document.getElementById('loginEmail');
    const pwdInput = document.getElementById('loginPassword');
    const feedback = document.getElementById('loginFeedback');

    const email = emailInput ? emailInput.value : '';
    const pwd = pwdInput ? pwdInput.value : '';

    const ok = this.login(email, pwd);
    if (!ok && feedback) {
      feedback.textContent = 'E-mail ou senha incorretos. A senha padrão do sistema é 12345.';
      feedback.classList.add('error');
      feedback.style.display = 'block';
    } else if (feedback) {
      feedback.textContent = '';
      feedback.classList.remove('error');
      feedback.style.display = 'none';
    }
  },

  logout() {
    store.clearSession();
    this.checkSession();
    this.showToast('Sessão encerrada com segurança.', 'info');
  },

  startRealtimeHeader() {
    const update = () => {
      const now = new Date();

      // Saudação personalizada inteligente
      const hour = now.getHours();
      let greeting = 'Bom dia';
      if (hour >= 12 && hour < 18) {
        greeting = 'Boa tarde';
      } else if (hour >= 18 || hour < 5) {
        greeting = 'Boa noite';
      }
      const greetingEl = document.getElementById('headerGreeting');
      if (greetingEl) {
        const uName = store?.data?.settings?.userName || 'Raphael Natayan Nilsen';
        greetingEl.textContent = `${greeting}, ${uName}`;
      }
      const sidebarUserEl = document.querySelector('.user-profile-badge .user-name');
      if (sidebarUserEl && store?.data?.settings?.userName) {
        sidebarUserEl.textContent = store.data.settings.userName;
      }

      // Data Completa Original e Intacta (Ex: Domingo, 4 de outubro de 2026)
      const dateEl = document.getElementById('headerFullDate');
      if (dateEl) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const dateFormatted = now.toLocaleDateString('pt-BR', options);
        dateEl.textContent = dateFormatted.charAt(0).toUpperCase() + dateFormatted.slice(1);
      }

      // Hora em Tempo Real com Segundos (Ex: 14:55:35)
      const timeEl = document.getElementById('headerLiveTime');
      if (timeEl) {
        const h = String(now.getHours()).padStart(2, '0');
        const m = String(now.getMinutes()).padStart(2, '0');
        const s = String(now.getSeconds()).padStart(2, '0');
        timeEl.textContent = `${h}:${m}:${s}`;
      }
    };

    update();
    setInterval(update, 1000);
  },

  // Roteamento de Abas
  navigateTo(tabId) {
    this.currentTab = tabId;

    // Atualiza Sidebar Desktop (Mastes é uma sub-seção de Jotur)
    const activeNavTab = tabId === 'mastes' ? 'jotur' : tabId;
    document.querySelectorAll('.nav-item').forEach(item => {
      if (item.dataset.tab === activeNavTab) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Atualiza Barra Inferior Mobile
    document.querySelectorAll('.mobile-nav-item').forEach(item => {
      if (item.dataset.tab === activeNavTab) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Fecha sidebar no celular se aberta
    this.toggleSidebarMobile(false);

    // Atualiza View
    document.querySelectorAll('.page-view').forEach(view => {
      view.classList.remove('active');
    });
    const targetView = document.getElementById(`view-${tabId}`);
    if (targetView) targetView.classList.add('active');

    // Atualiza Título do Cabeçalho
    const titles = {
      resumo: 'Resumo Executivo Consolidado',
      mapeandob3: 'MAPEANDO B3 — Levantamento de Dividendos & Oportunidades',
      meses: `Gestão Mensal (${store.activeYear})`,
      cartoes: 'Cartão de Crédito e Compras Parceladas',
      senhas: 'Cofre de Senhas Protegido',
      sonhos: 'Sonhos & Planejamento de Compras',
      bombeiro: 'Bombeiro Comunitário (Ressarcimentos)',
      jotur: 'Controle de Troco Jotur',
      mastes: `CONTROLE DE TROCO MASTES (${formatBRL(store?.data?.trocoMastes?.baseAmount || 400)})`,
      investimentos: 'Gestão de Ativos & Investimentos',
      configuracoes: 'Configurações do Sistema — Bancos, Cartões & Grupos'
    };
    const titleEl = document.getElementById('pageTitle');
    if (titleEl) titleEl.textContent = titles[tabId] || 'Sistema Financeiro';

    // Renderiza o módulo específico
    this.render();
  },

  // =========================================================================
  // GESTÃO DE MÚLTIPLOS ANOS (2025, 2026, 2027...)
  // =========================================================================
  renderYearSelector() {
    const select = document.getElementById('headerYearSelect');
    if (select) {
      const years = store.getAvailableYears();
      select.innerHTML = years.map(y => `
        <option value="${y}" ${y === store.activeYear ? 'selected' : ''}>${y}</option>
      `).join('');
      select.value = String(store.activeYear);
    }
    const lbl = document.getElementById('activeYearLabel');
    if (lbl) lbl.textContent = store.activeYear;
  },

  changeYear(year) {
    const y = Number(year);
    if (!y || y === store.activeYear) return;
    store.setYear(y);
    const select = document.getElementById('headerYearSelect');
    if (select) select.value = String(y);
    const titleEl = document.getElementById('pageTitle');
    if (titleEl && this.currentTab === 'meses') {
      titleEl.textContent = `Gestão Mensal (${store.activeYear})`;
    }
    this.render();
    this.showToast(`📅 Ano do sistema alterado para ${y}!`, 'info');
  },

  prevYear() {
    this.changeYear(store.activeYear - 1);
  },

  nextYear() {
    this.changeYear(store.activeYear + 1);
  },

  promptCopyFixedFromPreviousYear() {
    const prevY = store.activeYear - 1;
    const currY = store.activeYear;
    if (confirm(`Deseja copiar as Despesas Fixas de ${prevY} para ${currY}? Itens com mesmo nome não serão duplicados.`)) {
      const count = store.copyFixedExpensesFromYear(prevY, currY);
      this.renderMeses();
      this.renderResumo();
      if (count > 0) {
        this.showToast(`✓ ${count} despesa(s) fixa(s) copiadas de ${prevY} para ${currY}!`, 'success');
      } else {
        this.showToast(`Nenhuma despesa fixa nova encontrada em ${prevY} para copiar.`, 'info');
      }
    }
  },

  // =========================================================================
  // AÇÕES MOBILE APP
  // =========================================================================
  toggleSidebarMobile(force) {
    const sidebar = document.getElementById('appSidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    if (!sidebar) return;
    const shouldOpen = (force !== undefined) ? force : !sidebar.classList.contains('open');
    if (shouldOpen) {
      sidebar.classList.add('open');
      if (backdrop) backdrop.classList.add('active');
    } else {
      sidebar.classList.remove('open');
      if (backdrop) backdrop.classList.remove('active');
    }
  },

  toggleMobileQuickMenu(force) {
    const sheet = document.getElementById('mobileQuickActionSheet');
    if (!sheet) return;
    if (force !== undefined) {
      if (force) sheet.classList.add('active');
      else sheet.classList.remove('active');
    } else {
      sheet.classList.toggle('active');
    }
  },

  // Gera <option> dinâmicos dos bancos cadastrados em store.data.accounts
  getBankSelectOptionsHtml(selectedBank = '', emptyLabel = '— Selecionar Banco —', includeOutro = true) {
    const accounts = Array.isArray(store.data?.accounts) ? store.data.accounts : [];
    const current = String(selectedBank || '').trim();
    let matchedAny = !current;

    let html = emptyLabel !== null
      ? `<option value="" ${!current ? 'selected' : ''}>${emptyLabel}</option>`
      : '';

    accounts.forEach(acc => {
      const accName = String(acc.name || '').trim();
      if (!accName) return;
      const isSelected = (current === accName) ||
        (current === 'Banco do Brasil' && accName.includes('Banco do Brasil')) ||
        (current === 'Caixa Poupança' && accName.includes('Poupança')) ||
        (current === 'Caixa CP' && accName.includes('Caixa CP')) ||
        (current === 'Carteira' && accName.includes('Carteira'));
      if (isSelected) matchedAny = true;
      html += `<option value="${escapeHtml(accName)}" ${isSelected ? 'selected' : ''}>${escapeHtml(accName)}</option>`;
    });

    if (includeOutro) {
      const isOutro = current === 'Outro';
      if (isOutro) matchedAny = true;
      html += `<option value="Outro" ${isOutro ? 'selected' : ''}>Outro</option>`;
    }

    if (current && !matchedAny) {
      html += `<option value="${escapeHtml(current)}" selected>${escapeHtml(current)}</option>`;
    }

    return html;
  },

  // Popula todos os <select> e <datalist> do sistema com os grupos salvos no banco de dados
  populateSystemSelects() {
    try {
      const groups = store.getSystemGroups();
      const accounts = Array.isArray(store.data?.accounts) ? store.data.accounts : [];
      const cards = Array.isArray(store.data?.creditCards) ? store.data.creditCards : [];

      // 1. Selects de Bancos em Modais
      const bankSelectEmptyIds = ['rev_bank', 'pay_rev_bank', 'edit_fix_bank'];
      bankSelectEmptyIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          const prevVal = el.value;
          const emptyLbl = id === 'edit_fix_bank'
            ? '— Em branco (selecionar no pagamento) —'
            : (id === 'pay_rev_bank' ? '— Selecione o Banco —' : '— Em branco (selecionar quando receber) —');
          el.innerHTML = this.getBankSelectOptionsHtml(prevVal, emptyLbl, true);
        }
      });

      const bankSelectDirectIds = ['edit_rev_bank', 'var_bank'];
      bankSelectDirectIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          const prevVal = el.value || (accounts[0] ? accounts[0].name : 'Bradesco');
          el.innerHTML = this.getBankSelectOptionsHtml(prevVal, null, true);
        }
      });

      // 2. Datalist de sugestões de bancos (Cofre de Senhas)
      const bancosDl = document.getElementById('bancos_sugestoes');
      if (bancosDl) {
        bancosDl.innerHTML = accounts.map(a => `<option value="${escapeHtml(a.name)}">`).join('');
      }

      // 3. Datalists de Fontes de Renda e Categorias de Despesas
      const revDl = document.getElementById('fontes_renda_sugestoes');
      if (revDl && Array.isArray(groups.revenueSources)) {
        revDl.innerHTML = groups.revenueSources.map(s => `<option value="${escapeHtml(s)}">`).join('');
      }
      const expDl = document.getElementById('categorias_despesa_sugestoes');
      if (expDl && Array.isArray(groups.expenseCategories)) {
        expDl.innerHTML = groups.expenseCategories.map(s => `<option value="${escapeHtml(s)}">`).join('');
      }

      // 4. Selects de Cartão de Crédito (#card_type, #edit_card_type)
      ['card_type', 'edit_card_type'].forEach(id => {
        const el = document.getElementById(id);
        if (el && cards.length > 0) {
          const prevVal = el.value;
          el.innerHTML = cards.map(c => `
            <option value="${escapeHtml(c.name)}" ${c.name === prevVal ? 'selected' : ''}>${escapeHtml(c.name)}</option>
          `).join('');
        }
      });

      // 5. Tipos de Conta Bancária (#banco_tipo_conta no Cofre e #cfg_bank_type em Configurações)
      ['banco_tipo_conta', 'cfg_bank_type'].forEach(id => {
        const el = document.getElementById(id);
        if (el && Array.isArray(groups.accountTypes)) {
          const prevVal = el.value;
          el.innerHTML = groups.accountTypes.map(t => `
            <option value="${escapeHtml(t)}" ${t === prevVal ? 'selected' : ''}>${escapeHtml(t)}</option>
          `).join('');
        }
      });

      // 6. Tipos de Ativo na Bolsa (#stk_type, #b3_new_type)
      ['stk_type', 'b3_new_type'].forEach(id => {
        const el = document.getElementById(id);
        if (el && Array.isArray(groups.investmentTypes)) {
          const prevVal = el.value;
          el.innerHTML = groups.investmentTypes.map(t => `
            <option value="${escapeHtml(t)}" ${t === prevVal ? 'selected' : ''}>${escapeHtml(t)}</option>
          `).join('');
        }
      });

      // 7. Tipos de Provento (#stk_earn_type)
      const earnEl = document.getElementById('stk_earn_type');
      if (earnEl && Array.isArray(groups.earningTypes)) {
        const prevVal = earnEl.value;
        earnEl.innerHTML = groups.earningTypes.map(t => `
          <option value="${escapeHtml(t)}" ${t === prevVal ? 'selected' : ''}>${escapeHtml(t)}</option>
        `).join('');
      }

      // 8. Modalidades Nubank (#box_category)
      const boxCatEl = document.getElementById('box_category');
      if (boxCatEl && Array.isArray(groups.nubankCategories)) {
        const prevVal = boxCatEl.value;
        boxCatEl.innerHTML = groups.nubankCategories.map(c => `
          <option value="${escapeHtml(c)}" ${c === prevVal ? 'selected' : ''}>${c === 'Dinheiro Separado' ? '💵 ' : '📦 '}${escapeHtml(c)}</option>
        `).join('');
      }

      // 9. Abas / Tabelas no Modal de Senha Geral (#geral_tabela)
      const pwdTabSelect = document.getElementById('geral_tabela');
      if (pwdTabSelect && Array.isArray(groups.passwordTabs)) {
        const prevVal = pwdTabSelect.value;
        const nonBankTabs = groups.passwordTabs.filter(t => t.id !== 'bancos_cartoes');
        if (nonBankTabs.length > 0) {
          pwdTabSelect.innerHTML = nonBankTabs.map(t => `
            <option value="${escapeHtml(t.id)}" ${t.id === prevVal ? 'selected' : ''}>${escapeHtml(t.icon || '🔐')} ${escapeHtml(t.name)}</option>
          `).join('');
        }
      }
    } catch (e) {
      console.warn('[Configurações] Aviso ao popular selects:', e);
    }
  },

  // Disparador de Renderização
  render() {
    this.renderYearSelector();
    this.populateSystemSelects();
    switch (this.currentTab) {
      case 'resumo':
        this.renderResumo();
        break;
      case 'mapeandob3':
        this.renderMapeandoB3();
        break;
      case 'meses':
        this.renderMeses();
        break;
      case 'cartoes':
        this.renderCartoes();
        break;
      case 'senhas':
        this.renderSenhas();
        break;
      case 'sonhos':
        this.renderSonhos();
        break;
      case 'bombeiro':
        this.renderBombeiro();
        break;
      case 'jotur':
        this.renderJotur();
        break;
      case 'mastes':
        this.renderMastes();
        break;
      case 'investimentos':
        this.renderInvestimentos();
        break;
      case 'configuracoes':
        this.renderConfiguracoes();
        break;
    }
  },

  // =========================================================================
  // 1. MÓDULO RESUMO
  // =========================================================================
  renderResumo() {
    // 1. Saldos Bancários
    const grid = document.getElementById('bankCardsGrid');
    if (grid) {
      grid.innerHTML = store.data.accounts.map(acc => `
        <div class="bank-card ${acc.id}" style="${acc.color ? `--bank-accent: ${acc.color}; border-top: 3px solid ${acc.color};` : ''}">
          <div class="bank-card-header">
            <span class="bank-name" style="display:flex; align-items:center; gap:0.4rem;">
              <span style="width:9px; height:9px; border-radius:50%; background:${acc.color || '#3b82f6'}; display:inline-block; flex-shrink:0;"></span>
              ${escapeHtml(acc.name)}
            </span>
            <span class="bank-badge">${escapeHtml(acc.type)}</span>
          </div>
          <div class="bank-balance">${formatBRL(acc.balance)}</div>
          <div class="bank-card-footer">
            <span>Disponível</span>
            <button class="btn-quick-edit-balance" onclick="app.promptEditBalance('${acc.id}', '${escapeHtml(acc.name)}', ${acc.balance})">
              Ajustar Saldo
            </button>
          </div>
        </div>
      `).join('');
    }

    // 2. Banner Consolidado
    const totalBalance = store.getTotalBalance();
    const currentMonthData = store.getMonthSummary(this.activeMonth);
    const investSummary = store.getInvestmentsSummary();

    const bannerTotal = document.getElementById('bannerTotalBalance');
    if (bannerTotal) bannerTotal.textContent = formatBRL(totalBalance);

    const bannerRev = document.getElementById('bannerMonthRevenue');
    if (bannerRev) bannerRev.textContent = formatBRL(currentMonthData.revenues);

    const bannerExp = document.getElementById('bannerMonthExpense');
    if (bannerExp) bannerExp.textContent = formatBRL(currentMonthData.expenses);

    // 3. Atalhos / Métricas (Módulos Rápidos)
    const shortcutInvest = document.getElementById('shortcutInvestVal');
    if (shortcutInvest) shortcutInvest.textContent = formatBRL(investSummary.total);
    const shortcutInvest2 = document.getElementById('shortcutInvestVal2');
    if (shortcutInvest2) shortcutInvest2.textContent = formatBRL(investSummary.total);

    const shortcutCard = document.getElementById('shortcutCardVal');
    if (shortcutCard) shortcutCard.textContent = formatBRL(currentMonthData.card);
    const shortcutCard2 = document.getElementById('shortcutCardVal2');
    if (shortcutCard2) shortcutCard2.textContent = formatBRL(currentMonthData.card);

    const shortcutBombeiro = document.getElementById('shortcutBombeiroVal');
    const pendingBombeiro = store.data.firefighterRecords
      .filter(r => r.status !== 'Pago')
      .reduce((acc, r) => acc + (Number(r.amount) || 0), 0);
    if (shortcutBombeiro) shortcutBombeiro.textContent = formatBRL(pendingBombeiro);
    const shortcutBombeiro2 = document.getElementById('shortcutBombeiroVal2');
    if (shortcutBombeiro2) shortcutBombeiro2.textContent = formatBRL(pendingBombeiro);
  },

  promptEditBalance(accountId, accountName, currentVal) {
    const newVal = prompt(`Informe o novo saldo para ${accountName}:`, currentVal);
    if (newVal !== null && !isNaN(Number(newVal))) {
      store.updateAccountBalance(accountId, Number(newVal));
      this.renderResumo();
      this.showToast(`Saldo de ${accountName} atualizado com sucesso!`, 'success');
    }
  },

  recalculateBalances() {
    if (confirm('Deseja sincronizar e recalcular os saldos das contas bancárias com base em todos os lançamentos pagos/realizados no sistema?')) {
      store.recalculateBankBalancesFromEntries();
      this.renderResumo();
      this.showToast('✓ Saldos bancários sincronizados com sucesso a partir dos lançamentos!', 'success');
    }
  },

  // =========================================================================
  // 2. MÓDULO MESES (JANEIRO A DEZEMBRO)
  // =========================================================================
  renderMeses() {
    // 0. Seletor de Ano
    this.renderYearSelector();

    // 1. Barra de Meses
    const bar = document.getElementById('monthSelectorBar');
    if (bar) {
      bar.innerHTML = Object.keys(store.data.months).map(mNum => {
        const m = store.data.months[mNum];
        const isActive = Number(mNum) === this.activeMonth ? 'active' : '';
        return `
          <button class="month-tab ${isActive}" onclick="app.selectMonth(${mNum})">
            ${m.name}
          </button>
        `;
      }).join('');
    }

    // 2. Resumo Financeiro do Mês
    const summary = store.getMonthSummary(this.activeMonth);
    const mName = store.data.months[this.activeMonth].name;

    const elTitle = document.getElementById('activeMonthName');
    if (elTitle) elTitle.textContent = mName;

    const elRev = document.getElementById('monthSumRev');
    if (elRev) elRev.textContent = formatBRL(summary.revenues);

    const elFixExp = document.getElementById('monthSumFixExp');
    if (elFixExp) elFixExp.textContent = formatBRL(summary.fixedExpected !== undefined ? summary.fixedExpected : summary.fixed);

    const elFixPaid = document.getElementById('monthSumFixPaid');
    if (elFixPaid) elFixPaid.textContent = formatBRL(summary.fixedPaid || 0);

    const elFix = document.getElementById('monthSumFix');
    if (elFix) elFix.textContent = formatBRL(summary.fixed);

    const elVar = document.getElementById('monthSumVar');
    if (elVar) elVar.textContent = formatBRL(summary.variable);

    const elCardExp = document.getElementById('monthSumCardExp');
    if (elCardExp) elCardExp.textContent = formatBRL(summary.cardExpected || summary.card);

    const elCard = document.getElementById('monthSumCard');
    if (elCard) elCard.textContent = formatBRL(summary.cardPaid || 0);

    // Pílulas dinâmicas de Regime de Caixa (Adiantamento de contas entre meses)
    const elPrepaidPill = document.getElementById('monthPrepaidPill');
    const elSumPrepaid = document.getElementById('monthSumPrepaid');
    const prepaidTotal = (summary.prepaidTotal || 0);
    if (elPrepaidPill && elSumPrepaid) {
      if (prepaidTotal > 0) {
        elPrepaidPill.style.display = 'block';
        elSumPrepaid.textContent = formatBRL(prepaidTotal);
      } else {
        elPrepaidPill.style.display = 'none';
      }
    }

    const elPaidInOtherPill = document.getElementById('monthPaidInOtherPill');
    const elSumPaidInOther = document.getElementById('monthSumPaidInOther');
    const paidInOtherTotal = (summary.paidInOtherMonthsTotal || 0);
    if (elPaidInOtherPill && elSumPaidInOther) {
      if (paidInOtherTotal > 0) {
        elPaidInOtherPill.style.display = 'block';
        elSumPaidInOther.textContent = formatBRL(paidInOtherTotal);
      } else {
        elPaidInOtherPill.style.display = 'none';
      }
    }

    const elBal = document.getElementById('monthSumBal');
    if (elBal) {
      elBal.textContent = formatBRL(summary.balance);
      elBal.style.color = summary.balance >= 0 ? 'var(--success)' : 'var(--danger)';
    }

    // 3. Renderiza as Barras de Progresso: Despesas Fixas e Cartões
    this.renderProgressBars(summary, mName);

    // 4. Renderiza a Sub-aba ativa
    this.renderActiveMonthSubtab();
  },

  renderProgressBars(summary, mName) {
    const elProgress = document.getElementById('monthProgressContainer');
    if (!elProgress) return;

    // Despesas Fixas
    const fixHasItems = summary.fixedCount > 0;
    const fixIsComplete = fixHasItems && summary.fixedPct === 100;
    const fixCardClass = fixIsComplete ? 'month-progress-card all-paid' : 'month-progress-card';
    const fixBadge = !fixHasItems
      ? `<span class="progress-badge empty">Sem despesas fixas</span>`
      : (fixIsComplete
        ? `<span class="progress-badge paid">✓ Tudo Pago (${summary.fixedPaidCount}/${summary.fixedCount})</span>`
        : `<span class="progress-badge pending">⏳ ${summary.fixedPaidCount} de ${summary.fixedCount} pagas</span>`);
    const fixBarClass = !fixHasItems
      ? 'empty'
      : (fixIsComplete ? 'complete' : (summary.fixedPct > 0 ? 'fixed-partial' : 'fixed-pending'));

    // Cartões de Crédito
    const cardHasItems = summary.cardCount > 0;
    const cardIsComplete = cardHasItems && summary.cardPct === 100;
    const cardCardClass = cardIsComplete ? 'month-progress-card all-paid' : 'month-progress-card';
    const cardBadge = !cardHasItems
      ? `<span class="progress-badge empty">Sem faturas</span>`
      : (cardIsComplete
        ? `<span class="progress-badge paid">✓ Fatura Quitada (${summary.cardPaidCount}/${summary.cardCount})</span>`
        : `<span class="progress-badge pending">⏳ ${summary.cardPaidCount} de ${summary.cardCount} pagas</span>`);
    const cardBarClass = !cardHasItems
      ? 'empty'
      : (cardIsComplete ? 'complete' : (summary.cardPct > 0 ? 'card-partial' : 'card-pending'));

    elProgress.innerHTML = `
      <!-- CARD PROGRESSO: DESPESAS FIXAS -->
      <div class="${fixCardClass}">
        <div class="progress-card-top">
          <div class="progress-card-title-group">
            <div class="progress-card-icon" style="background: rgba(56, 189, 248, 0.12); color: #38bdf8;">📌</div>
            <div>
              <div class="progress-card-name">Despesas Fixas</div>
              <div style="font-size:0.75rem; color:var(--text-muted);">Contas recorrentes do mês</div>
            </div>
          </div>
          <div class="progress-card-right">
            ${fixBadge}
            <span class="progress-card-pct" style="color: ${fixIsComplete ? '#34d399' : (fixHasItems ? 'var(--text-primary)' : 'var(--text-muted)')};">${fixHasItems ? summary.fixedPct + '%' : '-'}</span>
          </div>
        </div>
        
        <div class="progress-bar-track">
          <div class="progress-bar-fill ${fixBarClass}" style="width: ${fixHasItems ? summary.fixedPct : 0}%;"></div>
        </div>

        <div class="progress-card-bottom">
          <div style="display:flex; align-items:center; gap:0.85rem; flex-wrap:wrap;">
            <span class="progress-stat-pill paid"><span class="dot"></span> Pago: ${formatBRL(summary.fixedPaid)}</span>
            <span class="progress-stat-pill pending"><span class="dot"></span> Restante: ${formatBRL(summary.fixedPending)}</span>
          </div>
          <div>
            ${fixHasItems ? `
              <button class="progress-quick-btn" onclick="app.togglePayAllFixed(${this.activeMonth})">
                ${fixIsComplete ? '↩ Desmarcar' : '✓ Marcar Tudo Pago'}
              </button>
            ` : `
              <button class="progress-quick-btn" onclick="app.selectMonthSubtab('fixas')">Gerenciar</button>
            `}
          </div>
        </div>
      </div>

      <!-- CARD PROGRESSO: CARTÕES DE CRÉDITO -->
      <div class="${cardCardClass}">
        <div class="progress-card-top">
          <div class="progress-card-title-group">
            <div class="progress-card-icon" style="background: rgba(244, 63, 94, 0.12); color: #f43f5e;">💳</div>
            <div>
              <div class="progress-card-name">Fatura de Cartões</div>
              <div style="font-size:0.75rem; color:var(--text-muted);">Parcelamentos de ${mName}</div>
            </div>
          </div>
          <div class="progress-card-right">
            ${cardBadge}
            <span class="progress-card-pct" style="color: ${cardIsComplete ? '#34d399' : (cardHasItems ? 'var(--text-primary)' : 'var(--text-muted)')};">${cardHasItems ? summary.cardPct + '%' : '-'}</span>
          </div>
        </div>
        
        <div class="progress-bar-track">
          <div class="progress-bar-fill ${cardBarClass}" style="width: ${cardHasItems ? summary.cardPct : 0}%;"></div>
        </div>

        <div class="progress-card-bottom">
          <div style="display:flex; align-items:center; gap:0.85rem; flex-wrap:wrap;">
            <span class="progress-stat-pill paid"><span class="dot"></span> Pago: ${formatBRL(summary.cardPaid)}</span>
            <span class="progress-stat-pill pending"><span class="dot"></span> Pendente: ${formatBRL(summary.cardPending)}</span>
          </div>
          <div>
            ${cardHasItems ? `
              <button class="progress-quick-btn" onclick="app.togglePayAllCards(${this.activeMonth})">
                ${cardIsComplete ? '↩ Desmarcar' : '✓ Quitar Fatura'}
              </button>
            ` : `
              <button class="progress-quick-btn" onclick="app.selectMonthSubtab('cartao_mes')">Ver Parcelas</button>
            `}
          </div>
        </div>
      </div>
    `;
  },

  renderMonthSummariesOnly() {
    const summary = store.getMonthSummary(this.activeMonth);
    const mName = store.data.months[this.activeMonth]?.name || '';

    const elRev = document.getElementById('monthSumRev');
    if (elRev) elRev.textContent = formatBRL(summary.revenues);

    const elFixExp = document.getElementById('monthSumFixExp');
    if (elFixExp) elFixExp.textContent = formatBRL(summary.fixedExpected !== undefined ? summary.fixedExpected : summary.fixed);

    const elFixPaid = document.getElementById('monthSumFixPaid');
    if (elFixPaid) elFixPaid.textContent = formatBRL(summary.fixedPaid || 0);

    const elFix = document.getElementById('monthSumFix');
    if (elFix) elFix.textContent = formatBRL(summary.fixed);

    const elVar = document.getElementById('monthSumVar');
    if (elVar) elVar.textContent = formatBRL(summary.variable);

    const elCardExp = document.getElementById('monthSumCardExp');
    if (elCardExp) elCardExp.textContent = formatBRL(summary.cardExpected || summary.card);

    const elCard = document.getElementById('monthSumCard');
    if (elCard) elCard.textContent = formatBRL(summary.cardPaid || 0);

    // Pílulas dinâmicas de Regime de Caixa (Adiantamento de contas entre meses)
    const elPrepaidPill = document.getElementById('monthPrepaidPill');
    const elSumPrepaid = document.getElementById('monthSumPrepaid');
    const prepaidTotal = (summary.prepaidTotal || 0);
    if (elPrepaidPill && elSumPrepaid) {
      if (prepaidTotal > 0) {
        elPrepaidPill.style.display = 'block';
        elSumPrepaid.textContent = formatBRL(prepaidTotal);
      } else {
        elPrepaidPill.style.display = 'none';
      }
    }

    const elPaidInOtherPill = document.getElementById('monthPaidInOtherPill');
    const elSumPaidInOther = document.getElementById('monthSumPaidInOther');
    const paidInOtherTotal = (summary.paidInOtherMonthsTotal || 0);
    if (elPaidInOtherPill && elSumPaidInOther) {
      if (paidInOtherTotal > 0) {
        elPaidInOtherPill.style.display = 'block';
        elSumPaidInOther.textContent = formatBRL(paidInOtherTotal);
      } else {
        elPaidInOtherPill.style.display = 'none';
      }
    }

    const elBal = document.getElementById('monthSumBal');
    if (elBal) {
      elBal.textContent = formatBRL(summary.balance);
      elBal.style.color = summary.balance >= 0 ? 'var(--success)' : 'var(--danger)';
    }

    this.renderProgressBars(summary, mName);

    // Se estiver na visão mensal de receitas, atualiza os cards de métricas (Pago e Pendente)
    if (this.receitasViewMode === 'mes') {
      const elPaid = document.getElementById('metricRevenuePaid');
      const elPending = document.getElementById('metricRevenuePending');
      if (elPaid) elPaid.textContent = formatBRL(summary.revenuesPaid);
      if (elPending) elPending.textContent = formatBRL(summary.revenuesPending);
    }
  },

  selectMonth(num) {
    this.activeMonth = Number(num);
    this.renderMeses();
  },

  selectMonthSubtab(subtab) {
    this.activeSubtabMes = subtab;
    document.querySelectorAll('.subtab-btn').forEach(btn => {
      if (btn.dataset.subtab === subtab) btn.classList.add('active');
      else btn.classList.remove('active');
    });
    this.renderActiveMonthSubtab();
  },

  renderActiveMonthSubtab() {
    try {
      const container = document.getElementById('monthSubtabContent');
      if (!container) return;

      // Sincroniza a classe visual ativa em todos os botões de sub-aba
      document.querySelectorAll('.subtabs-nav .subtab-btn').forEach(btn => {
        if (btn.dataset.subtab === this.activeSubtabMes) btn.classList.add('active');
        else btn.classList.remove('active');
      });

      const m = store.data.months[this.activeMonth];
      if (!m) return;

    if (this.activeSubtabMes === 'receitas') {
      const summary = store.getMonthSummary(this.activeMonth);

      if (this.receitasViewMode === 'mes') {
        container.innerHTML = `
          <!-- CARDS DE MÉTRICAS DO MÊS (PAGO / RECEBIDO E PENDENTE) -->
          <div class="receitas-metrics-bar">
            <div class="receitas-metric-card">
              <span class="label">✓ Pago / Recebido</span>
              <span class="value" id="metricRevenuePaid" style="color:var(--success);">${formatBRL(summary.revenuesPaid)}</span>
            </div>
            <div class="receitas-metric-card">
              <span class="label">⏳ Pendente a Receber</span>
              <span class="value" id="metricRevenuePending" style="color:#fbbf24;">${formatBRL(summary.revenuesPending)}</span>
            </div>
          </div>

          <!-- TABELA MINIMALISTA ESTILO NOTION (RENDIMENTOS) -->
          <div class="notion-table-card">
            <div class="notion-header-bar">
              <div class="notion-title-group">
                <div class="notion-title-text">
                  <span>🏦</span>
                  <span>Rendimentos</span>
                </div>
                <span class="notion-title-badge">${m.name}</span>
              </div>
              <div class="notion-toolbar">
                <button class="notion-btn-pill" onclick="app.setReceitasViewMode('anual')">
                  <span>📅</span> Visão Anual (12 Meses)
                </button>
                <button class="notion-btn-blue" onclick="app.openModalNovaReceita()">
                  + Inserir Rendimento
                </button>
              </div>
            </div>

            <div class="table-responsive">
              <table class="notion-data-table">
                <thead>
                  <tr>
                    <th><span class="th-icon">Aa</span> Renda</th>
                    <th style="min-width: 140px;"><span class="th-icon">#</span> Valor</th>
                    <th style="min-width: 150px;"><span class="th-icon">📅</span> Data Recebida</th>
                    <th style="width: 120px;"><span class="th-icon">☼</span> Status</th>
                    <th style="min-width: 175px;"><span class="th-icon">↗</span> BANCO</th>
                    <th style="width: 80px; text-align: right;"><span class="th-icon">⋯</span> Ações</th>
                  </tr>
                </thead>
                <tbody>
                  ${m.revenues.length === 0 ? `
                    <tr>
                      <td colspan="6" style="text-align: center; padding: 2.75rem 1.5rem; color: var(--text-muted);">
                        <div style="font-size: 1.05rem; font-weight: 600; color: #ffffff; margin-bottom: 0.35rem;">Nenhum rendimento em ${m.name}</div>
                        <p style="font-size: 0.85rem; margin-bottom: 1.25rem;">Cadastre suas rendas e marque os meses em que serão recebidas. O valor, a data e o banco são adicionados diretamente nas células abaixo.</p>
                        <button class="notion-btn-blue" onclick="app.openModalNovaReceita()">+ Inserir Rendimento</button>
                      </td>
                    </tr>
                  ` : m.revenues.map(r => {
                    const isPaid = (r.status === 'Pago' || r.status === 'Recebido');
                    return `
                      <tr class="${isPaid ? 'row-paid' : ''}">
                        <td>
                          <div class="renda-row-content">
                            <span class="renda-item-icon">${getRendaIcon(r.source)}</span>
                            <strong>${r.source}</strong>
                            ${(r.type === 'anual' || r.type === 'multi-mes' || r.annualGroupId) ? '<span class="badge-recurrence annual">Recorrente</span>' : ''}
                          </div>
                        </td>
                        <td>
                          <div style="display:flex; align-items:center; gap:0.35rem;">
                            <span class="currency-symbol" style="font-size:0.75rem; color:var(--text-muted); font-weight:700;">R$</span>
                            <input type="text" inputmode="decimal" 
                                   class="sheet-inline-input sheet-value-input ${r.value > 0 ? 'has-value' : ''}" 
                                   value="${r.value > 0 ? formatMoneyDisplay(r.value) : ''}" 
                                   placeholder="0,00" 
                                   title="Digite o valor (ex: 200,00)"
                                   onfocus="this.select()"
                                   onblur="app.handleInlineValueBlur(this, ${this.activeMonth}, '${r.id}')"
                                   onkeydown="if(event.key==='Enter') this.blur()">
                          </div>
                        </td>
                        <td>
                          <input type="date" 
                                 class="sheet-inline-input sheet-date-input" 
                                 value="${r.date || this.getDefaultDateForMonth(this.activeMonth)}" 
                                 title="Defina a data de recebimento diretamente na planilha"
                                 onchange="app.updateRevenueField(${this.activeMonth}, '${r.id}', 'date', this.value)">
                        </td>
                        <td>
                          <span class="status-pill ${isPaid ? 'paid' : 'pending'}" 
                                title="${isPaid ? 'Clique para retornar a Pendente' : 'Clique para marcar como Pago'}"
                                onclick="app.handleStatusPillClick(${this.activeMonth}, '${r.id}')">
                            <span class="dot"></span>
                            <span>${isPaid ? 'Pago' : 'Pendente'}</span>
                          </span>
                        </td>
                        <td>
                          <select class="sheet-inline-select" 
                                  title="Selecione o banco diretamente na planilha"
                                  onchange="app.updateRevenueField(${this.activeMonth}, '${r.id}', 'bank', this.value)">
                            ${this.getBankSelectOptionsHtml(r.bank, '— Selecionar Banco —', true)}
                          </select>
                        </td>
                        <td style="text-align: right;">
                          <div class="table-actions" style="justify-content: flex-end;">
                            <button class="btn-table-icon" title="Editar Nome" onclick="app.openEditRevenueModal(${this.activeMonth}, '${r.id}')">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            </button>
                            <button class="btn-table-icon delete" title="Excluir" onclick="app.deleteRevenuePrompt(${this.activeMonth}, '${r.id}')">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
                ${m.revenues.length > 0 ? `
                  <tfoot>
                    <tr>
                      <td><strong>Total (${m.revenues.length} itens)</strong></td>
                      <td style="color: var(--success); font-weight: 800;">${formatBRL(summary.revenues)}</td>
                      <td colspan="4" style="font-size: 0.82rem; color: var(--text-secondary);">
                        <span style="color: var(--success); font-weight: 600;">Pago: ${formatBRL(summary.revenuesPaid)}</span>
                        &nbsp;&nbsp;•&nbsp;&nbsp;
                        <span style="color: #f59e0b; font-weight: 600;">Pendente: ${formatBRL(summary.revenuesPending)}</span>
                      </td>
                    </tr>
                  </tfoot>
                ` : ''}
              </table>
            </div>
          </div>
        `;
      } else {
        // MODO VISÃO ANUAL (12 MESES)
        const allRevs = store.getAllRevenuesOfYear();
        const totalAnnualExpected = allRevs.reduce((acc, r) => acc + (Number(r.value) || 0), 0);
        const totalAnnualPaid = allRevs.filter(r => r.status === 'Pago' || r.status === 'Recebido').reduce((acc, r) => acc + (Number(r.value) || 0), 0);
        const totalAnnualPending = allRevs.filter(r => r.status === 'Pendente').reduce((acc, r) => acc + (Number(r.value) || 0), 0);

        const filteredRevs = allRevs.filter(r => {
          if (this.receitasFilterMonth !== 'todos' && Number(this.receitasFilterMonth) !== r.monthNum) return false;
          if (this.receitasFilterStatus !== 'todos') {
            const isPaid = (r.status === 'Pago' || r.status === 'Recebido');
            if (this.receitasFilterStatus === 'Pago' && !isPaid) return false;
            if (this.receitasFilterStatus === 'Pendente' && isPaid) return false;
          }
          if (this.receitasFilterBank !== 'todos' && r.bank !== this.receitasFilterBank) return false;
          if (this.receitasSearch && !r.source.toLowerCase().includes(this.receitasSearch.toLowerCase())) return false;
          return true;
        });

        const filteredTotal = filteredRevs.reduce((acc, r) => acc + (Number(r.value) || 0), 0);
        const filteredPaid = filteredRevs.filter(r => r.status === 'Pago' || r.status === 'Recebido').reduce((acc, r) => acc + (Number(r.value) || 0), 0);
        const filteredPending = filteredRevs.filter(r => r.status === 'Pendente').reduce((acc, r) => acc + (Number(r.value) || 0), 0);

        container.innerHTML = `
          <!-- CARDS DE MÉTRICAS ANUAIS (PAGO / RECEBIDO E PENDENTE) -->
          <div class="receitas-metrics-bar">
            <div class="receitas-metric-card">
              <span class="label">✓ Já Recebido no Ano</span>
              <span class="value" style="color:var(--success);">${formatBRL(totalAnnualPaid)}</span>
            </div>
            <div class="receitas-metric-card">
              <span class="label">⏳ Pendente a Receber no Ano</span>
              <span class="value" style="color:#fbbf24;">${formatBRL(totalAnnualPending)}</span>
            </div>
          </div>

          <div class="notion-table-card">
            <div class="notion-header-bar">
              <div class="notion-title-group">
                <div class="notion-title-text">
                  <span>🏦</span>
                  <span>Rendimentos (Visão Anual)</span>
                </div>
                <span class="notion-title-badge">${filteredRevs.length} lançamentos</span>
              </div>
              <div class="notion-toolbar">
                <button class="notion-btn-pill" onclick="app.setReceitasViewMode('mes')">
                  <span>📌</span> Mês a Mês (${m.name})
                </button>
                <button class="notion-btn-blue" onclick="app.openModalNovaReceita()">
                  + Inserir Rendimento
                </button>
              </div>
            </div>

            <!-- BARRA DE FILTROS DA TABELA ANUAL -->
            <div style="display:flex; gap:0.6rem; align-items:center; flex-wrap:wrap; padding:0.75rem 1rem; border-bottom:1px solid var(--border-light); background:rgba(255,255,255,0.015);">
              <div style="flex:1; min-width:180px;">
                <input type="text" class="form-input" style="padding:0.35rem 0.65rem; height:34px; font-size:0.82rem;" placeholder="🔍 Buscar renda..." value="${this.receitasSearch}" oninput="app.filterReceitas('search', this.value)">
              </div>
              <div style="min-width:130px;">
                <select class="form-input" style="padding:0.35rem 0.65rem; height:34px; font-size:0.82rem;" onchange="app.filterReceitas('month', this.value)">
                  <option value="todos" ${this.receitasFilterMonth === 'todos' ? 'selected' : ''}>Todos os Meses</option>
                  ${Object.keys(store.data.months).map(mNum => `
                    <option value="${mNum}" ${this.receitasFilterMonth === String(mNum) ? 'selected' : ''}>${store.data.months[mNum].name}</option>
                  `).join('')}
                </select>
              </div>
              <div style="min-width:115px;">
                <select class="form-input" style="padding:0.35rem 0.65rem; height:34px; font-size:0.82rem;" onchange="app.filterReceitas('status', this.value)">
                  <option value="todos" ${this.receitasFilterStatus === 'todos' ? 'selected' : ''}>Status: Todos</option>
                  <option value="Pago" ${this.receitasFilterStatus === 'Pago' ? 'selected' : ''}>Pago</option>
                  <option value="Pendente" ${this.receitasFilterStatus === 'Pendente' ? 'selected' : ''}>Pendente</option>
                </select>
              </div>
              <div style="min-width:130px;">
                <select class="form-input" style="padding:0.35rem 0.65rem; height:34px; font-size:0.82rem;" onchange="app.filterReceitas('bank', this.value)">
                  <option value="todos" ${this.receitasFilterBank === 'todos' ? 'selected' : ''}>Banco: Todos</option>
                  ${(store.data.accounts || []).map(acc => `
                    <option value="${escapeHtml(acc.name)}" ${this.receitasFilterBank === acc.name ? 'selected' : ''}>${escapeHtml(acc.name)}</option>
                  `).join('')}
                </select>
              </div>
            </div>

            <div class="table-responsive">
              <table class="notion-data-table">
                <thead>
                  <tr>
                    <th>Mês</th>
                    <th><span class="th-icon">Aa</span> Renda</th>
                    <th style="min-width: 140px;"><span class="th-icon">#</span> Valor</th>
                    <th style="min-width: 150px;"><span class="th-icon">📅</span> Data Recebida</th>
                    <th style="width: 120px;"><span class="th-icon">☼</span> Status</th>
                    <th style="min-width: 175px;"><span class="th-icon">↗</span> BANCO</th>
                    <th>Frequência</th>
                    <th style="width: 80px; text-align: right;"><span class="th-icon">⋯</span> Ações</th>
                  </tr>
                </thead>
                <tbody>
                  ${filteredRevs.length === 0 ? `
                    <tr><td colspan="8" style="text-align:center; color: var(--text-muted); padding: 2.5rem 1rem;">Nenhum rendimento encontrado com os filtros selecionados.</td></tr>
                  ` : filteredRevs.map(r => {
                    const isPaid = (r.status === 'Pago' || r.status === 'Recebido');
                    return `
                      <tr class="${isPaid ? 'row-paid' : ''}">
                        <td><strong style="color:#38bdf8;">${r.monthName}</strong></td>
                        <td>
                          <div class="renda-row-content">
                            <span class="renda-item-icon">${getRendaIcon(r.source)}</span>
                            <strong>${r.source}</strong>
                          </div>
                        </td>
                        <td>
                          <div style="display:flex; align-items:center; gap:0.35rem;">
                            <span class="currency-symbol" style="font-size:0.75rem; color:var(--text-muted); font-weight:700;">R$</span>
                            <input type="text" inputmode="decimal" 
                                   class="sheet-inline-input sheet-value-input ${r.value > 0 ? 'has-value' : ''}" 
                                   value="${r.value > 0 ? formatMoneyDisplay(r.value) : ''}" 
                                   placeholder="0,00" 
                                   title="Digite o valor (ex: 200,00)"
                                   onfocus="this.select()"
                                   onblur="app.handleInlineValueBlur(this, ${r.monthNum}, '${r.id}')"
                                   onkeydown="if(event.key==='Enter') this.blur()">
                          </div>
                        </td>
                        <td>
                          <input type="date" 
                                 class="sheet-inline-input sheet-date-input" 
                                 value="${r.date || this.getDefaultDateForMonth(r.monthNum)}" 
                                 title="Defina a data de recebimento diretamente na planilha"
                                 onchange="app.updateRevenueField(${r.monthNum}, '${r.id}', 'date', this.value)">
                        </td>
                        <td>
                          <span class="status-pill ${isPaid ? 'paid' : 'pending'}" 
                                title="${isPaid ? 'Clique para retornar a Pendente' : 'Clique para marcar como Pago'}"
                                onclick="app.handleStatusPillClick(${r.monthNum}, '${r.id}')">
                            <span class="dot"></span>
                            <span>${isPaid ? 'Pago' : 'Pendente'}</span>
                          </span>
                        </td>
                        <td>
                          <select class="sheet-inline-select" 
                                  title="Selecione o banco diretamente na planilha"
                                  onchange="app.updateRevenueField(${r.monthNum}, '${r.id}', 'bank', this.value)">
                            ${this.getBankSelectOptionsHtml(r.bank, '— Selecionar Banco —', true)}
                          </select>
                        </td>
                        <td>
                          <span class="badge-recurrence ${r.type === 'anual' || r.type === 'multi-mes' || r.annualGroupId ? 'annual' : 'monthly'}">
                            ${r.type === 'anual' || r.type === 'multi-mes' || r.annualGroupId ? 'Recorrente' : 'Mensal'}
                          </span>
                        </td>
                        <td style="text-align: right;">
                          <div class="table-actions" style="justify-content: flex-end;">
                            <button class="btn-table-icon" title="Editar Nome" onclick="app.openEditRevenueModal(${r.monthNum}, '${r.id}')">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            </button>
                            <button class="btn-table-icon delete" title="Excluir" onclick="app.deleteRevenuePrompt(${r.monthNum}, '${r.id}')">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
                ${filteredRevs.length > 0 ? `
                  <tfoot>
                    <tr>
                      <td colspan="2"><strong>Total Filtrado (${filteredRevs.length} lançamentos)</strong></td>
                      <td style="color: var(--success); font-weight: 800;">${formatBRL(filteredTotal)}</td>
                      <td colspan="5" style="font-size: 0.82rem; color: var(--text-secondary);">
                        <span style="color: var(--success); font-weight: 600;">Pago: ${formatBRL(filteredPaid)}</span>
                        &nbsp;&nbsp;•&nbsp;&nbsp;
                        <span style="color: #f59e0b; font-weight: 600;">Pendente: ${formatBRL(filteredPending)}</span>
                      </td>
                    </tr>
                  </tfoot>
                ` : ''}
              </table>
            </div>
          </div>
        `;
      }
    } else if (this.activeSubtabMes === 'fixas') {
      const summary = store.getMonthSummary(this.activeMonth);
      const fixHasItems = summary.fixedCount > 0;
      const fixIsComplete = fixHasItems && summary.fixedPct === 100;
      const fixBarClass = !fixHasItems ? 'empty' : (fixIsComplete ? 'complete' : (summary.fixedPct > 0 ? 'fixed-partial' : 'fixed-pending'));

      container.innerHTML = `
        <div class="card-header">
          <div class="card-title-group">
            <h3 class="card-title">Despesas Fixas de ${m.name}</h3>
            <span class="card-subtitle">${summary.fixedPaidCount} de ${summary.fixedCount} contas pagas (${summary.fixedPct}%)</span>
          </div>
          <div style="display:flex; gap:0.5rem; align-items:center; flex-wrap:wrap;">
            <button class="btn-header" style="font-size:0.8rem; background:rgba(255,255,255,0.04); border-color:var(--border-light);" onclick="app.promptCopyFixedFromPreviousYear()" title="Copiar Despesas Fixas do Ano Anterior para este Ano">
              📋 Copiar do Ano Anterior
            </button>
            ${fixHasItems ? `
              <button class="btn-header" style="background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3);" onclick="app.togglePayAllFixed(${this.activeMonth})">
                ${fixIsComplete ? '↩ Desmarcar Todas' : '✓ Marcar Todas como Pagas'}
              </button>
            ` : ''}
            <button class="btn-header primary" onclick="app.openModalNovaDespesaFixa()">+ Nova Despesa Fixa</button>
          </div>
        </div>

        <!-- BANNER DE PROGRESSO DE DESPESAS FIXAS -->
        <div class="subtab-progress-banner">
          <div class="subtab-progress-banner-left">
            <div style="font-weight:700; font-size:0.85rem; color:var(--text-primary); min-width:140px;">
              Progresso Fixas:
            </div>
            <div style="flex:1;">
              <div class="progress-bar-track" style="margin-bottom:0;">
                <div class="progress-bar-fill ${fixBarClass}" style="width: ${fixHasItems ? summary.fixedPct : 0}%;"></div>
              </div>
            </div>
            <span style="font-weight:800; font-family:monospace; font-size:0.95rem; color:${fixIsComplete ? '#34d399' : 'var(--text-primary)'};">${fixHasItems ? summary.fixedPct + '%' : '-'}</span>
          </div>
          <div class="subtab-progress-banner-stats">
            <span class="progress-stat-pill" style="background: rgba(251, 191, 36, 0.12); color: #fbbf24; border: 1px solid rgba(251, 191, 36, 0.25);"><span class="dot" style="background: #fbbf24;"></span> Prevista: ${formatBRL(summary.fixedExpected || 0)}</span>
            <span class="progress-stat-pill paid"><span class="dot"></span> Realizada: ${formatBRL(summary.fixedPaid)}</span>
            <span class="progress-stat-pill pending"><span class="dot"></span> Restante: ${formatBRL(summary.fixedPending)}</span>
          </div>
        </div>

        ${(summary.prepaidFromOtherMonths && summary.prepaidFromOtherMonths.length > 0) ? `
          <div style="background: rgba(56, 189, 248, 0.08); border-left: 3px solid #38bdf8; padding: 0.65rem 0.9rem; border-radius: 4px; margin-bottom: 0.85rem; font-size: 0.82rem; color: #bae6fd;">
            ℹ️ <strong>Adiantamentos debitados neste mês:</strong> Foram pagas neste mês ${summary.prepaidFromOtherMonths.length} conta(s) pertencente(s) a outros meses (Total: <strong>${formatBRL(summary.prepaidTotal)}</strong>), descontadas do saldo de ${m.name}.
            <span style="opacity:0.85; font-size:0.75rem; margin-left:4px;">(${summary.prepaidFromOtherMonths.map(x => `${x.description || x.name || 'Conta'} de ${x.originalMonthName}: ${formatBRL(x.valuePaid)}`).join(', ')})</span>
          </div>
        ` : ''}
        ${(summary.paidInOtherMonths && summary.paidInOtherMonths.length > 0) ? `
          <div style="background: rgba(168, 85, 247, 0.08); border-left: 3px solid #a855f7; padding: 0.65rem 0.9rem; border-radius: 4px; margin-bottom: 0.85rem; font-size: 0.82rem; color: #e9d5ff;">
            🗓️ <strong>Contas deste mês já adiantadas em outro mês:</strong> ${summary.paidInOtherMonths.length} conta(s) deste mês (Total: <strong>${formatBRL(summary.paidInOtherMonthsTotal)}</strong>) foram pagas e descontadas no caixa de outros meses.
            <span style="opacity:0.85; font-size:0.75rem; margin-left:4px;">(${summary.paidInOtherMonths.map(x => `${x.description || x.name || 'Conta'} paga em ${x.paidMonthName}: ${formatBRL(x.valuePaid)}`).join(', ')})</span>
          </div>
        ` : ''}

        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Conta / Descrição</th>
                <th>Vencimento</th>
                <th>Valor Previsto</th>
                <th>Valor Realizado</th>
                <th>Status</th>
                <th>Data Pagamento</th>
                <th>Banco / Conta</th>
                <th style="width: 90px; text-align: center;">Ações</th>
              </tr>
            </thead>
            <tbody>
              ${m.fixedExpenses.length === 0 ? `
                <tr><td colspan="8" style="text-align:center; color: var(--text-muted); padding: 2rem;">Nenhuma despesa fixa cadastrada para este mês.</td></tr>
              ` : m.fixedExpenses.map((e, eIndex) => {
                if (!e.id) e.id = 'fix_' + this.activeMonth + '_' + eIndex + '_' + Date.now();
                const safeId = String(e.id).replace(/'/g, "\\'");
                const isPaid = (e.status === 'Pago');
                const valExp = Number(e.valueExpected) || 0;
                let valPaid = (e.valuePaid !== undefined && e.valuePaid !== null && e.valuePaid !== '') ? Number(e.valuePaid) : 0;

                // Identificação de recorrência (meses múltiplos ou grupo)
                const isRecurring = Boolean(e.annualGroupId || e.type === 'anual' || e.type === 'multi-mes' || store.hasRecurringFixedExpense(this.activeMonth, e));

                // Cálculo de vencimento por dia (opcional) e alerta de atraso
                const hasDueDay = (e.dueDay !== undefined && e.dueDay !== null && String(e.dueDay).trim() !== '');
                const dDay = hasDueDay ? Number(e.dueDay) : (e.dueDate ? parseInt(e.dueDate.split('-')[2], 10) : null);
                const now = new Date();
                const currYear = now.getFullYear();
                const currMonth = now.getMonth() + 1;
                const currDay = now.getDate();
                const actYear = Number(store.activeYear) || currYear;
                const actMonth = Number(this.activeMonth);

                let isOverdue = false;
                let isToday = false;

                if (!isPaid && dDay) {
                  if (actYear < currYear) {
                    isOverdue = true;
                  } else if (actYear === currYear) {
                    if (actMonth < currMonth) {
                      isOverdue = true;
                    } else if (actMonth === currMonth) {
                      if (currDay > dDay) {
                        isOverdue = true;
                      } else if (currDay === dDay) {
                        isToday = true;
                      }
                    }
                  }
                }

                // Identificação de pagamento em outro mês (Regime de Caixa)
                let payMonth = null;
                let payYear = null;
                let isPaidInDifferentMonth = false;
                if (e.paymentDate) {
                  const pParts = e.paymentDate.split('-');
                  payYear = parseInt(pParts[0], 10);
                  payMonth = parseInt(pParts[1], 10);
                  if (payMonth && (payMonth !== actMonth || payYear !== actYear)) {
                    isPaidInDifferentMonth = true;
                  }
                }

                let statusBadgeClass = 'pending';
                let statusBadgeText = '⏳ Pendente';
                let statusBadgeTitle = 'Clique para marcar como pago';

                if (isPaid) {
                  statusBadgeClass = 'paid';
                  statusBadgeText = '✓ Pago';
                  statusBadgeTitle = 'Clique para alterar status';
                } else if (isOverdue) {
                  statusBadgeClass = 'overdue';
                  statusBadgeText = '⚠️ Vencida';
                  statusBadgeTitle = 'Despesa vencida! Clique para marcar como paga';
                } else if (isToday) {
                  statusBadgeClass = 'today';
                  statusBadgeText = '⏰ Vence Hoje';
                  statusBadgeTitle = 'Vence hoje! Clique para marcar como paga';
                }

                // Linha verde quando status for Pago e valor realizado <= previsto;
                // Preenchimento todo vermelho se o valor realizado for maior que o valor previsto
                let rowClass = '';
                if (isPaid) {
                  rowClass = (valPaid > valExp) ? 'row-paid-danger' : 'row-paid';
                }

                return `
                <tr class="${rowClass}">
                  <td>
                    <div style="display:flex; align-items:center; gap:0.4rem; flex-wrap:wrap;">
                      <strong>${e.description}</strong>
                      ${isRecurring ? '<span class="badge-recurrence annual">Recorrente</span>' : ''}
                    </div>
                  </td>
                  <td>${dDay ? `Dia ${dDay}` : '<span style="color: var(--text-muted); font-size: 0.85rem;">—</span>'}</td>
                  <td style="color: var(--text-secondary); font-weight: 600;">${formatBRL(valExp)}</td>
                  <td>
                    <div style="display:flex; align-items:center; gap:0.35rem;">
                      <span class="currency-symbol" style="font-size:0.75rem; color:var(--text-muted); font-weight:700;">R$</span>
                      <input type="text" inputmode="decimal" 
                             class="sheet-inline-input sheet-value-input ${(isPaid || valPaid > 0) ? 'has-value' : ''}" 
                             value="${isPaid ? formatMoneyDisplay(valPaid) : (valPaid > 0 ? formatMoneyDisplay(valPaid) : '')}" 
                             placeholder="0,00" 
                             title="Altere o valor realizado diretamente na tabela (ex: 0,00 ou 150,00)"
                             onfocus="this.select()"
                             onblur="app.handleInlineFixedExpenseValueBlur(this, ${this.activeMonth}, '${safeId}', ${eIndex})"
                             onkeydown="if(event.key==='Enter') this.blur()">
                    </div>
                  </td>
                  <td>
                    <button class="status-badge ${statusBadgeClass}" style="cursor:pointer; border:none;" onclick="app.toggleFixedExpenseStatus(${this.activeMonth}, '${safeId}', ${eIndex})" title="${statusBadgeTitle}">
                      ${statusBadgeText}
                    </button>
                  </td>
                  <td>
                    <input type="date" 
                           class="sheet-inline-input sheet-date-input" 
                           value="${e.paymentDate || ''}" 
                           title="Data do efetivo pagamento (saída de caixa)" 
                           onchange="app.updateFixedExpenseField(${this.activeMonth}, '${safeId}', 'paymentDate', this.value, ${eIndex})"
                           style="width: 125px; font-size: 0.8rem; padding: 0.25rem 0.35rem;">
                    ${isPaidInDifferentMonth ? `
                      <div style="font-size:0.7rem; color:#38bdf8; font-weight:600; margin-top:2px;" title="Esta despesa foi descontada no caixa de ${store.getMonthName(payMonth)}/${payYear}">
                        ↳ Descontado em ${store.getMonthName(payMonth).slice(0, 3)}/${payYear}
                      </div>
                    ` : ''}
                  </td>
                  <td>
                    <select class="sheet-inline-select" 
                            title="Selecione o banco diretamente na tabela"
                            onchange="app.updateFixedExpenseField(${this.activeMonth}, '${safeId}', 'bank', this.value, ${eIndex})">
                      ${this.getBankSelectOptionsHtml(e.bank, '— Selecionar Banco —', true)}
                    </select>
                  </td>
                  <td style="text-align: center;">
                    <div class="table-actions" style="justify-content: center; gap: 0.35rem;">
                      <button class="btn-table-icon" title="Editar Despesa Fixa" onclick="app.openEditFixedExpenseModal(${this.activeMonth}, '${safeId}')">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                      </button>
                      <button class="btn-table-icon delete" title="Excluir" onclick="app.deleteFixedExpense(${this.activeMonth}, '${safeId}')">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              `;}).join('')}
            </tbody>
            ${m.fixedExpenses.length > 0 ? `
            <tfoot>
              <tr style="font-weight: 700; background: rgba(255,255,255,0.02); border-top: 1px solid var(--border-light);">
                <td colspan="2" style="text-align: right; color: var(--text-muted); padding: 0.85rem 1rem;">Total Previsto e Realizado:</td>
                <td style="color: #fbbf24; padding: 0.85rem 1rem; font-weight:800;">${formatBRL(summary.fixedExpected || 0)}</td>
                <td style="color: var(--success); padding: 0.85rem 1rem; font-weight:800;">${formatBRL(summary.fixedPaid)}</td>
                <td colspan="4" style="color: var(--text-muted); font-size: 0.82rem; padding: 0.85rem 1rem;">
                  Restante a pagar: <strong style="color: #f87171;">${formatBRL(summary.fixedPending)}</strong>
                </td>
              </tr>
            </tfoot>
            ` : ''}
          </table>
        </div>
      `;
    } else if (this.activeSubtabMes === 'variaveis') {
      container.innerHTML = `
        <div class="card-header">
          <div class="card-title-group">
            <h3 class="card-title">Despesas Variáveis de ${m.name}</h3>
          </div>
          <button class="btn-header primary" onclick="app.openModal('modalNovaDespesaVariavel')">+ Nova Despesa Variável</button>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Despesa</th>
                <th>Data</th>
                <th>Valor</th>
                <th>Banco / Conta</th>
                <th style="width: 80px;">Ações</th>
              </tr>
            </thead>
            <tbody>
              ${m.variableExpenses.length === 0 ? `
                <tr><td colspan="5" style="text-align:center; color: var(--text-muted); padding: 2rem;">Nenhuma despesa variável registrada neste mês.</td></tr>
              ` : m.variableExpenses.map(e => `
                <tr>
                  <td><strong>${e.description}</strong></td>
                  <td>${formatDateBR(e.date)}</td>
                  <td style="color: var(--danger); font-weight: 700;">${formatBRL(e.value)}</td>
                  <td>${e.bank || '-'}</td>
                  <td>
                    <div class="table-actions">
                      <button class="btn-table-icon delete" title="Excluir" onclick="app.deleteVariableExpense(${this.activeMonth}, '${e.id}')">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } else if (this.activeSubtabMes === 'cartao_mes') {
      const summary = store.getMonthSummary(this.activeMonth);
      const invoices = store.getCardInvoicesForMonth(this.activeMonth);
      const allInstallments = store.getCardInstallmentsForMonth(this.activeMonth);
      const cardHasItems = summary.cardCount > 0;
      const cardIsComplete = cardHasItems && summary.cardPct === 100;
      const cardBarClass = !cardHasItems ? 'empty' : (cardIsComplete ? 'complete' : (summary.cardPct > 0 ? 'card-partial' : 'card-pending'));

      // Encontra faturas específicas de Mastercard e Nubank
      const masterInv = invoices.find(i => i.key === 'master') || {
        key: 'master', name: 'Mastercard', totalExpected: 0, totalPaid: 0, totalPending: 0, count: 0, isPaid: false, dueDay: 10, closingDay: 1
      };
      const nubankInv = invoices.find(i => i.key === 'nubank') || {
        key: 'nubank', name: 'Nubank (Nu)', totalExpected: 0, totalPaid: 0, totalPending: 0, count: 0, isPaid: false, dueDay: 15, closingDay: 5
      };

      container.innerHTML = `
        <div class="card-header">
          <div class="card-title-group">
            <h3 class="card-title">Fatura dos Cartões de Crédito — ${m.name}</h3>
            <span class="card-subtitle">Valor total consolidado das faturas para pagamento mensal</span>
          </div>
          <div style="display:flex; gap:1rem; align-items:center; flex-wrap:wrap;">
            ${cardHasItems ? `
              <button class="btn-header" style="background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3);" onclick="app.togglePayAllCards(${this.activeMonth})">
                ${cardIsComplete ? '↩ Desmarcar Todas as Faturas' : '✓ Quitar Todas as Faturas'}
              </button>
            ` : ''}
            <div style="font-size: 0.95rem; font-weight: 700; color: #fbbf24;">
              Previsto: ${formatBRL(summary.cardExpected || summary.card)}
            </div>
            <div style="font-size: 1.1rem; font-weight: 800; color: #34d399;">
              Pago: ${formatBRL(summary.cardPaid || 0)}
            </div>
          </div>
        </div>

        <!-- BANNER DE PROGRESSO GERAL DE FATURAS -->
        <div class="subtab-progress-banner">
          <div class="subtab-progress-banner-left">
            <div style="font-weight:700; font-size:0.85rem; color:var(--text-primary); min-width:140px;">
              Progresso Faturas:
            </div>
            <div style="flex:1;">
              <div class="progress-bar-track" style="margin-bottom:0;">
                <div class="progress-bar-fill ${cardBarClass}" style="width: ${cardHasItems ? summary.cardPct : 0}%;"></div>
              </div>
            </div>
            <span style="font-weight:800; font-family:monospace; font-size:0.95rem; color:${cardIsComplete ? '#34d399' : 'var(--text-primary)'};">${cardHasItems ? summary.cardPct + '%' : '-'}</span>
          </div>
          <div class="subtab-progress-banner-stats">
            <span class="progress-stat-pill" style="background: rgba(251, 191, 36, 0.12); color: #fbbf24; border: 1px solid rgba(251, 191, 36, 0.25);"><span class="dot" style="background: #fbbf24;"></span> Previsto: ${formatBRL(summary.cardExpected || summary.card)}</span>
            <span class="progress-stat-pill paid"><span class="dot"></span> Pago: ${formatBRL(summary.cardPaid)}</span>
            <span class="progress-stat-pill pending"><span class="dot"></span> Pendente: ${formatBRL(summary.cardPending)}</span>
          </div>
        </div>

        <!-- CARDS CONSOLIDADOS DE TODOS OS CARTÕES CADASTRADOS -->
        <div class="faturas-cards-grid">
          ${invoices.map(inv => {
            const invIsPaid = inv.isPaid || inv.totalPaid > 0;
            const invIsFull = invIsPaid && (inv.totalExpected === 0 || inv.totalPaid >= inv.totalExpected);
            const invIsUnder = invIsPaid && (inv.totalPaid < inv.totalExpected);
            const invBorder = invIsFull 
              ? 'border: 2px solid rgba(16, 185, 129, 0.75); box-shadow: 0 0 18px rgba(16, 185, 129, 0.2);' 
              : (invIsUnder ? 'border: 2px solid rgba(239, 68, 68, 0.75); box-shadow: 0 0 18px rgba(239, 68, 68, 0.2);' : '');
            const cLower = String(inv.name || '').toLowerCase();
            const isMaster = inv.key === 'master' || cLower.includes('master');
            const isNu = inv.key === 'nubank' || cLower.includes('nu');
            const themeClass = isMaster ? 'mastercard-theme' : (isNu ? 'nubank-theme' : 'mastercard-theme');
            const accentColor = inv.color || (isNu ? '#c084fc' : '#f59e0b');
            const iconHtml = isMaster ? `
              <div class="fatura-brand-icon">
                <svg width="34" height="22" viewBox="0 0 34 22" fill="none">
                  <circle cx="11" cy="11" r="11" fill="#EB001B"/>
                  <circle cx="23" cy="11" r="11" fill="#F79E1B" fill-opacity="0.85"/>
                </svg>
              </div>
            ` : (isNu ? `
              <div class="fatura-brand-icon" style="background: rgba(130, 10, 209, 0.45); border: 1px solid rgba(168, 85, 247, 0.4);">
                <span style="color:#ffffff; font-weight:900; font-size:1.1rem; letter-spacing:-1px;">nu</span>
              </div>
            ` : `
              <div class="fatura-brand-icon" style="background: ${accentColor}26; border: 1px solid ${accentColor}66;">
                <span style="color:#ffffff; font-weight:900; font-size:1rem;">💳</span>
              </div>
            `);

            return `
              <div class="fatura-card-widget ${themeClass}" style="${invBorder}">
                <div>
                  <div class="fatura-widget-header">
                    <div class="fatura-brand-group">
                      ${iconHtml}
                      <div>
                        <div class="fatura-brand-name">${escapeHtml(inv.name)}</div>
                        <div style="font-size:0.75rem; color:${accentColor}; font-weight:600;">Fatura de ${m.name}</div>
                      </div>
                    </div>
                    <div>
                      ${inv.count === 0 ? `
                        <span class="status-badge neutral" style="font-size:0.75rem;">Sem Lançamentos</span>
                      ` : (invIsFull ? `
                        <span class="status-badge paid" style="font-size:0.78rem;">✓ Fatura Paga</span>
                      ` : (invIsUnder ? `
                        <span class="status-badge danger" style="font-size:0.78rem;">⚠️ Pago Abaixo</span>
                      ` : `
                        <span class="status-badge waiting" style="font-size:0.78rem;">⏳ Pendente</span>
                      `))}
                    </div>
                  </div>

                  <div class="fatura-widget-body">
                    <div class="fatura-amount-label">Valor Total da Fatura (Previsto)</div>
                    <div class="fatura-amount-value" style="color: ${inv.totalExpected > 0 ? '#ffffff' : 'var(--text-muted)'};">
                      ${formatBRL(inv.totalExpected)}
                    </div>
                    <div class="fatura-amount-sub" style="display:flex; align-items:center; gap:0.6rem; margin-top:0.35rem; flex-wrap:wrap;">
                      <span style="color: ${invIsFull ? '#34d399' : (invIsUnder ? '#f87171' : '#34d399')}; font-weight:700;">Pago: ${formatBRL(inv.totalPaid)}</span>
                      ${inv.totalPending > 0 ? `
                        <span style="color: #f87171; font-weight:600;">Restante: ${formatBRL(inv.totalPending)}</span>
                      ` : ''}
                    </div>

                    <div class="fatura-widget-info">
                      <span>📅 Vencimento: <strong>Dia ${inv.dueDay}</strong></span>
                      <span>🔒 Fechamento: <strong>Dia ${inv.closingDay}</strong></span>
                      <span>📦 <strong>${inv.count}</strong> compra(s)</span>
                    </div>
                  </div>
                </div>

                <div class="fatura-widget-footer">
                  ${inv.count > 0 ? `
                    <button class="btn-fatura-action ${invIsPaid ? 'btn-fatura-unpay' : 'btn-fatura-pay'}" onclick="app.togglePayCardInvoice(${this.activeMonth}, '${inv.key}')">
                      ${invIsPaid ? '↩ Desmarcar Fatura' : `✓ Quitar Fatura ${escapeHtml(inv.name)}`}
                    </button>
                    <button class="btn-fatura-action btn-fatura-edit" onclick="app.openEditCardInvoiceModal(${this.activeMonth}, '${inv.key}')" title="Ajustar valor pago">
                      ✏️ Ajustar Valor
                    </button>
                  ` : `
                    <span style="font-size:0.82rem; color:var(--text-muted);">Nenhuma compra no ${escapeHtml(inv.name)} neste mês.</span>
                  `}
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- TABELA CONSOLIDADA DAS FATURAS -->
        <div style="margin-top: 1.25rem;">
          <div style="font-size: 0.95rem; font-weight: 700; margin-bottom: 0.75rem; color: var(--text-primary); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;">
            <span>Resumo Consolidado das Faturas do Mês</span>
            <span style="font-size: 0.8rem; font-weight: 500; color: var(--text-muted);">💡 Digite o valor pago na hora do pagamento: se pagar igual/acima fica verde, se pagar abaixo fica vermelho</span>
          </div>

          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Cartão</th>
                  <th>Vencimento</th>
                  <th>Fechamento</th>
                  <th>Compras Inclusas</th>
                  <th>Total Fatura (Previsto)</th>
                  <th style="min-width: 175px;">Valor Realizado (R$)</th>
                  <th>Status</th>
                  <th style="width: 140px; text-align: center;">Ações</th>
                </tr>
              </thead>
              <tbody>
                ${invoices.map(inv => {
                  let rowClass = '';
                  let statusBadgeClass = 'pending';
                  let statusBadgeText = '⏳ Pendente';

                  const isPaid = (inv.isPaid || inv.totalPaid > 0);
                  const isFull = isPaid && (inv.totalExpected === 0 || inv.totalPaid >= inv.totalExpected);
                  const isUnder = isPaid && (inv.totalPaid < inv.totalExpected);

                  if (inv.count === 0) {
                    statusBadgeClass = 'neutral';
                    statusBadgeText = 'Sem lançamentos';
                  } else if (isFull) {
                    rowClass = 'row-paid';
                    statusBadgeClass = 'paid';
                    statusBadgeText = '✓ Pago';
                  } else if (isUnder) {
                    rowClass = 'row-paid-danger';
                    statusBadgeClass = 'danger';
                    statusBadgeText = '⚠️ Pago Abaixo';
                  }

                  return `
                  <tr class="${rowClass}">
                    <td>
                      <div style="display:flex; align-items:center; gap:0.6rem;">
                        <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:${inv.color};"></span>
                        <strong>${escapeHtml(inv.name)}</strong>
                      </div>
                    </td>
                    <td>Dia ${inv.dueDay}</td>
                    <td>Dia ${inv.closingDay}</td>
                    <td>${inv.count > 0 ? `${inv.count} compra(s)` : '<span style="color:var(--text-muted);">-</span>'}</td>
                    <td style="color: #fbbf24; font-weight: 800; font-size: 1rem;">${formatBRL(inv.totalExpected)}</td>
                    <td>
                      ${inv.count > 0 ? `
                        <div style="display:flex; align-items:center; gap:0.35rem;">
                          <span class="currency-symbol" style="font-size:0.75rem; color:var(--text-muted); font-weight:700;">R$</span>
                          <input type="text" inputmode="decimal" 
                                 class="sheet-inline-input sheet-value-input ${(isPaid || inv.totalPaid > 0) ? 'has-value' : ''}" 
                                 value="${(isPaid || inv.totalPaid > 0) ? formatMoneyDisplay(inv.totalPaid) : ''}" 
                                 placeholder="0,00" 
                                 title="Altere o valor realizado diretamente na tabela (ex: 0,00 ou ${formatMoneyDisplay(inv.totalExpected)})"
                                 onfocus="this.select()"
                                 onblur="app.handleInlineCardInvoicePaidBlur(this, ${this.activeMonth}, '${inv.key}')"
                                 onkeydown="if(event.key==='Enter') this.blur()">
                        </div>
                      ` : `
                        <span style="color:var(--text-muted);">-</span>
                      `}
                    </td>
                    <td>
                      ${inv.count === 0 ? `
                        <span class="status-badge neutral">Sem lançamentos</span>
                      ` : `
                        <button class="status-badge ${statusBadgeClass}" style="cursor:pointer; border:none;" onclick="app.togglePayCardInvoice(${this.activeMonth}, '${inv.key}')" title="Clique para alternar entre Pago e Pendente">
                          ${statusBadgeText}
                        </button>
                      `}
                    </td>
                    <td style="text-align:center;">
                      ${inv.count > 0 ? `
                        <div style="display:inline-flex; gap:0.4rem; justify-content:center;">
                          <button class="status-badge ${isPaid ? (isUnder ? 'danger' : 'paid') : 'pending'}" style="cursor:pointer; border:none;" onclick="app.togglePayCardInvoice(${this.activeMonth}, '${inv.key}')" title="Marcar fatura como paga/pendente">
                            ${isPaid ? '↩ Desmarcar' : '✓ Quitar'}
                          </button>
                          <button class="action-btn edit" onclick="app.openEditCardInvoiceModal(${this.activeMonth}, '${inv.key}')" title="Ajustar fatura do cartão">
                            ✏️
                          </button>
                        </div>
                      ` : `
                        <span style="color:var(--text-muted);">-</span>
                      `}
                    </td>
                  </tr>
                `;}).join('')}
              </tbody>
              <tfoot>
                <tr style="background: rgba(255,255,255,0.02); font-weight: 800; border-top: 2px solid var(--border-light);">
                  <td colspan="3"><strong>TOTAL CONSOLIDADO DAS FATURAS</strong></td>
                  <td><strong>${summary.cardCount} compra(s)</strong></td>
                  <td style="color: #fbbf24; font-size: 1.05rem;">${formatBRL(summary.cardExpected || summary.card)}</td>
                  <td style="color: #34d399; font-size: 1.05rem;">${formatBRL(summary.cardPaid || 0)}</td>
                  <td>
                    ${cardHasItems ? (cardIsComplete ? '<span class="status-badge paid">✓ Tudo Pago</span>' : '<span class="status-badge pending">⏳ Pendente</span>') : '<span class="status-badge neutral">Sem faturas</span>'}
                  </td>
                  <td style="text-align:center;">
                    ${cardHasItems ? `
                      <button class="btn-header" style="padding: 0.35rem 0.75rem; font-size: 0.8rem; background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3);" onclick="app.togglePayAllCards(${this.activeMonth})">
                        ${cardIsComplete ? 'Desmarcar' : 'Quitar Tudo'}
                      </button>
                    ` : '-'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <!-- DETALHAMENTO DE COMPRAS INDIVIDUAIS (COLAPSADO / OPCIONAL) -->
        <div style="margin-top: 1.75rem; border-top: 1px dashed var(--border-light); padding-top: 1rem; text-align: center;">
          <button id="btnToggleCardDrawer" class="btn-subtle" onclick="app.toggleCardDetailsDrawer()" style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-light); padding: 0.6rem 1.25rem; border-radius: 8px; font-size: 0.82rem; color: var(--text-muted); cursor: pointer; transition: all 0.2s ease;">
            ▼ Ver detalhamento de compras individuais (Opcional)
          </button>
        </div>

        <div id="cardDetailsDrawerContainer" style="display: none; margin-top: 1rem;">
          <div style="font-size: 0.88rem; font-weight: 700; color: var(--text-muted); margin-bottom: 0.75rem; text-align: left;">
            Lançamentos detalhados que compõem as faturas deste mês:
          </div>
          <div class="table-responsive">
            <table class="data-table" style="font-size: 0.85rem;">
              <thead>
                <tr>
                  <th>Compra / Descrição</th>
                  <th>Estabelecimento</th>
                  <th>Cartão</th>
                  <th>Parcela</th>
                  <th>Valor Parcela</th>
                  <th>Status</th>
                  <th>Data da Compra</th>
                </tr>
              </thead>
              <tbody>
                ${allInstallments.length === 0 ? `
                  <tr><td colspan="7" style="text-align:center; color: var(--text-muted); padding: 1.5rem;">Nenhuma parcela de cartão neste mês.</td></tr>
                ` : allInstallments.map(c => `
                  <tr>
                    <td><strong>${escapeHtml(c.description)}</strong></td>
                    <td>${escapeHtml(c.place || '-')}</td>
                    <td><span class="status-badge neutral">${escapeHtml(c.card)}</span></td>
                    <td><span class="status-badge waiting">${c.installmentIndex} de ${c.installmentsTotal}</span></td>
                    <td style="color: #fbbf24; font-weight: 700;">${formatBRL(c.value)}</td>
                    <td><span class="status-badge ${c.status === 'Pago' ? 'paid' : 'pending'}">${c.status === 'Pago' ? '✓ Pago' : '⏳ Pendente'}</span></td>
                    <td>${formatDateBR(c.date)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }
    } catch (err) {
      console.error('[renderActiveMonthSubtab] Erro ao renderizar sub-aba:', err);
    }
  },

  setReceitasViewMode(mode) {
    this.receitasViewMode = mode;
    this.renderActiveMonthSubtab();
  },

  filterReceitas(key, value) {
    if (key === 'month') this.receitasFilterMonth = value;
    if (key === 'status') this.receitasFilterStatus = value;
    if (key === 'bank') this.receitasFilterBank = value;
    if (key === 'search') this.receitasSearch = value;
    this.renderActiveMonthSubtab();
  },

  selectAllMonths(checked) {
    document.querySelectorAll('input[name="rev_month_chk"]').forEach(chk => {
      chk.checked = checked;
    });
  },

  selectCurrentMonthOnly() {
    document.querySelectorAll('input[name="rev_month_chk"]').forEach(chk => {
      chk.checked = Number(chk.value) === this.activeMonth;
    });
  },

  openModalNovaReceita() {
    const form = document.getElementById('formNovaReceita');
    if (form) form.reset();

    // Marca o mês atual por padrão
    this.selectCurrentMonthOnly();

    const dateInp = document.getElementById('rev_date');
    if (dateInp) {
      dateInp.value = this.getDefaultDateForMonth(this.activeMonth);
    }

    this.openModal('modalNovaReceita');

    setTimeout(() => {
      const inputSource = document.getElementById('rev_source');
      if (inputSource) inputSource.focus();
    }, 150);
  },

  selectAllFixedMonths(checked) {
    document.querySelectorAll('input[name="fix_month_chk"]').forEach(chk => {
      chk.checked = checked;
    });
  },

  selectMonthsFromCurrentOnwards() {
    document.querySelectorAll('input[name="rev_month_chk"]').forEach(chk => {
      chk.checked = Number(chk.value) >= this.activeMonth;
    });
  },

  selectFixedMonthsFromCurrentOnwards() {
    document.querySelectorAll('input[name="fix_month_chk"]').forEach(chk => {
      chk.checked = Number(chk.value) >= this.activeMonth;
    });
  },

  selectCurrentFixedMonthOnly() {
    document.querySelectorAll('input[name="fix_month_chk"]').forEach(chk => {
      chk.checked = Number(chk.value) === this.activeMonth;
    });
  },

  openModalNovaDespesaFixa() {
    const form = document.getElementById('formNovaDespesaFixa');
    if (form) form.reset();

    // Marca o mês atual por padrão
    this.selectCurrentFixedMonthOnly();

    // Pré-configura o dia do vencimento com o dia atual
    const dueDayInp = document.getElementById('fix_due_day');
    if (dueDayInp) {
      dueDayInp.value = String(new Date().getDate());
    }

    const payDateInp = document.getElementById('fix_payment_date');
    if (payDateInp) {
      payDateInp.value = this.getExpenseDefaultPaymentDate(this.activeMonth);
    }
    const payDateContainer = document.getElementById('fix_payment_date_container');
    if (payDateContainer) {
      payDateContainer.style.display = 'none';
    }

    this.openModal('modalNovaDespesaFixa');

    setTimeout(() => {
      const inputDesc = document.getElementById('fix_desc');
      if (inputDesc) inputDesc.focus();
    }, 150);
  },

  openModalNovaDespesaVariavel() {
    const form = document.getElementById('formNovaDespesaVariavel');
    if (form) form.reset();

    const dateInp = document.getElementById('var_date');
    if (dateInp) {
      dateInp.value = this.getDefaultDateForMonth(this.activeMonth);
    }

    this.openModal('modalNovaDespesaVariavel');

    setTimeout(() => {
      const inputDesc = document.getElementById('var_desc');
      if (inputDesc) inputDesc.focus();
    }, 150);
  },

  handleInlineFixedExpenseValueBlur(inputEl, monthNum, id, expenseIndex) {
    if (!inputEl) return;
    const mNum = Number(monthNum) || this.activeMonth;
    const m = store.data.months[mNum] || store.data.months[String(mNum)];
    if (!m || !Array.isArray(m.fixedExpenses)) return;

    let expense = null;
    if (id !== undefined && id !== null && id !== '' && id !== 'undefined') {
      expense = m.fixedExpenses.find(e => e && (String(e.id) === String(id) || e.id === id));
    }
    if (!expense && expenseIndex !== undefined && expenseIndex !== null && m.fixedExpenses[expenseIndex]) {
      expense = m.fixedExpenses[expenseIndex];
    }
    if (!expense) return;

    const raw = (inputEl.value || '').trim();

    if (raw === '') {
      if (expense.status === 'Pago') {
        inputEl.value = '0,00';
        inputEl.classList.add('has-value');
        this.updateFixedExpenseField(mNum, id, 'valuePaid', 0, expenseIndex);
      } else {
        inputEl.value = '';
        inputEl.classList.remove('has-value');
        this.updateFixedExpenseField(mNum, id, 'valuePaid', 0, expenseIndex);
      }
      return;
    }

    const num = parseMoney(raw);
    inputEl.value = formatMoneyDisplay(num);
    inputEl.classList.add('has-value');
    this.updateFixedExpenseField(mNum, id, 'valuePaid', num, expenseIndex);
  },

  updateFixedExpenseField(monthNum, id, field, value, expenseIndex) {
    const mNum = Number(monthNum) || this.activeMonth;
    const m = store.data.months[mNum] || store.data.months[String(mNum)];
    if (!m || !Array.isArray(m.fixedExpenses)) return;

    let expense = null;
    if (id !== undefined && id !== null && id !== '' && id !== 'undefined') {
      expense = m.fixedExpenses.find(e => e && (String(e.id) === String(id) || e.id === id));
    }
    if (!expense && expenseIndex !== undefined && expenseIndex !== null && m.fixedExpenses[expenseIndex]) {
      expense = m.fixedExpenses[expenseIndex];
    }
    if (!expense) return;

    if (field === 'paymentDate') {
      const oldStatus = expense.status;
      expense.paymentDate = value || '';
      if (value && expense.status !== 'Pago') {
        expense.status = 'Pago';
        if (expense.valuePaid === undefined || expense.valuePaid === null || expense.valuePaid === '' || Number(expense.valuePaid) === 0) {
          expense.valuePaid = Number(expense.valueExpected) || 0;
        }
        if (expense.bank && Number(expense.valuePaid) > 0) {
          store.debitFromBank(expense.bank, Number(expense.valuePaid));
        }
      }
      store.save();
      this.renderMeses();
      this.renderResumo();
      if (value) {
        const parts = value.split('-');
        const payMonth = parseInt(parts[1], 10);
        if (payMonth && payMonth !== Number(mNum)) {
          this.showToast(`Data salva! Despesa de ${store.getMonthName(mNum)} será descontada no saldo de ${store.getMonthName(payMonth)}.`, 'info');
        } else {
          this.showToast('Data de pagamento atualizada!', 'info');
        }
      }
      return;
    }

    if (field === 'valuePaid') {
      const oldVal = Number(expense.valuePaid) || 0;
      const oldStatus = expense.status;
      const newVal = typeof value === 'number' ? value : parseMoney(value);
      expense.valuePaid = newVal;

      // Se o usuário digitou um valor positivo e não estava Pago, marca como Pago
      if (newVal > 0 && expense.status !== 'Pago') {
        expense.status = 'Pago';
        if (!expense.paymentDate) {
          const targetYear = store?.activeYear || new Date().getFullYear();
          if (expense.dueDate && expense.dueDate.startsWith(`${targetYear}-${String(mNum).padStart(2, '0')}`)) {
            expense.paymentDate = expense.dueDate;
          }
        }
      }

      // Reconcilia saldo bancário
      if (expense.bank) {
        if (oldStatus !== 'Pago' && expense.status === 'Pago' && newVal > 0) {
          store.debitFromBank(expense.bank, newVal);
        } else if (oldStatus === 'Pago' && expense.status === 'Pago' && newVal !== oldVal) {
          const diff = newVal - oldVal;
          if (diff > 0) store.debitFromBank(expense.bank, diff);
          else if (diff < 0) store.creditToBank(expense.bank, Math.abs(diff));
        }
      }

      store.save();
      this.renderMeses();
      this.renderResumo();

      const valExp = Number(expense.valueExpected) || 0;
      if (expense.status === 'Pago' && newVal > valExp) {
        this.showToast(`Valor realizado: ${formatBRL(newVal)} (Acima do previsto!)`, 'warning');
      } else if (expense.status === 'Pago') {
        this.showToast(`Valor realizado: ${formatBRL(newVal)} (Status: Pago)`, 'success');
      } else {
        this.showToast(`Valor realizado atualizado: ${formatBRL(newVal)}`, 'info');
      }
      return;
    }

    if (field === 'bank') {
      const oldBank = expense.bank;
      expense.bank = value || '';
      const valPaid = Number(expense.valuePaid) || 0;

      // Se já estava Pago com valor e mudou de banco, transfere o débito entre os bancos
      if (expense.status === 'Pago' && valPaid > 0 && oldBank !== expense.bank) {
        if (oldBank) store.creditToBank(oldBank, valPaid);
        if (expense.bank) store.debitFromBank(expense.bank, valPaid);
      }

      store.save();
      this.renderMeses();
      this.renderResumo();
      this.showToast('Banco atualizado!', 'info');
      return;
    }

    expense[field] = value;
    store.save();
  },

  formatMoneyInputElement(inputEl) {
    if (!inputEl) return;
    const num = parseMoney(inputEl.value);
    inputEl.value = num > 0 ? ('R$ ' + formatMoneyDisplay(num)) : '';
  },

  handleInlineValueBlur(inputEl, monthNum, id) {
    if (!inputEl) return;
    const num = parseMoney(inputEl.value);
    inputEl.value = num > 0 ? formatMoneyDisplay(num) : '';
    if (num > 0) inputEl.classList.add('has-value');
    else inputEl.classList.remove('has-value');
    this.updateRevenueField(monthNum, id, 'value', num);
  },

  updateRevenueField(monthNum, id, field, value) {
    const m = store.data.months[monthNum];
    if (!m) return;
    const item = m.revenues.find(r => r.id === id);
    if (!item) return;

    if (field === 'value') {
      const oldVal = Number(item.value) || 0;
      const newVal = typeof value === 'number' ? value : parseMoney(value);
      item.value = newVal;

      // Se já estava Pago com banco selecionado, ajusta a diferença no saldo do banco
      if ((item.status === 'Pago' || item.status === 'Recebido') && item.bank && newVal !== oldVal) {
        const diff = newVal - oldVal;
        if (diff > 0) store.creditToBank(item.bank, diff);
        else if (diff < 0) store.debitFromBank(item.bank, Math.abs(diff));
      }
    } else if (field === 'date') {
      item.date = value || '';
    } else if (field === 'bank') {
      const oldBank = item.bank;
      item.bank = value || '';

      // Se já estava Pago com valor e mudou de banco, transfere o saldo
      if ((item.status === 'Pago' || item.status === 'Recebido') && item.value > 0 && oldBank && oldBank !== item.bank) {
        store.debitFromBank(oldBank, item.value);
        if (item.bank) store.creditToBank(item.bank, item.value);
      }
    }

    store.save();
    this.renderMonthSummariesOnly();
    this.renderResumo();
  },

  handleStatusPillClick(monthNum, id) {
    const m = store.data.months[monthNum];
    if (!m) return;
    const item = m.revenues.find(r => r.id === id);
    if (!item) return;

    const isPaid = (item.status === 'Pago' || item.status === 'Recebido');

    if (!isPaid) {
      item.status = 'Pago';
      if (!item.date) {
        item.date = this.getDefaultDateForMonth(monthNum);
      }
      if (item.value > 0 && item.bank) {
        store.creditToBank(item.bank, item.value);
        this.showToast(`✓ "${item.source}" marcado como PAGO! Linha destacada em verde (+${formatBRL(item.value)})`, 'success');
      } else {
        this.showToast(`✓ "${item.source}" marcado como PAGO! Linha destacada em verde.`, 'success');
      }
    } else {
      item.status = 'Pendente';
      if (item.value > 0 && item.bank) {
        store.debitFromBank(item.bank, item.value);
      }
      this.showToast(`"${item.source}" alterado para Pendente.`, 'info');
    }

    store.save();
    this.renderMeses();
    this.renderResumo();
  },

  openEditRevenueModal(monthNum, id) {
    const m = store.data.months[monthNum];
    if (!m) return;
    const r = m.revenues.find(item => item.id === id);
    if (!r) return;

    document.getElementById('edit_rev_id').value = r.id;
    document.getElementById('edit_rev_month').value = monthNum;
    document.getElementById('edit_rev_annual_group').value = r.annualGroupId || '';
    document.getElementById('edit_rev_source').value = r.source || '';
    document.getElementById('edit_rev_value').value = r.value || '';
    document.getElementById('edit_rev_date').value = r.date || this.getDefaultDateForMonth(monthNum);
    document.getElementById('edit_rev_status').value = (r.status === 'Recebido' || r.status === 'Pago') ? 'Pago' : 'Pendente';
    document.getElementById('edit_rev_bank').value = r.bank || 'Nubank (Nu)';

    const groupContainer = document.getElementById('editRevAnnualGroupContainer');
    const syncCheckbox = document.getElementById('edit_rev_sync_all');
    if (groupContainer) {
      if (r.annualGroupId) {
        groupContainer.style.display = 'block';
        if (syncCheckbox) syncCheckbox.checked = false;
      } else {
        groupContainer.style.display = 'none';
      }
    }

    this.openModal('modalEditarReceita');
  },

  toggleRevenueStatus(monthNum, id) {
    const item = store.toggleRevenueStatus(monthNum, id);
    if (item) {
      this.renderMeses();
      this.renderResumo();
      this.showToast(`Status da receita "${item.source}" alterado para ${item.status}!`, 'success');
    }
  },

  deleteRevenuePrompt(monthNum, id) {
    const m = store.data.months[monthNum];
    if (!m) return;
    const item = m.revenues.find(r => r.id === id);
    if (!item) return;

    if (item.annualGroupId) {
      const resp = confirm(`Esta receita "${item.source}" faz parte de um lançamento ANUAL (12 meses).\n\n• Clique em [OK] para excluir APENAS deste mês (${m.name}).\n• Clique em [CANCELAR] para ver opção de excluir todos os meses.`);
      if (resp) {
        store.deleteRevenue(monthNum, id, false);
        this.renderMeses();
        this.renderResumo();
        this.showToast(`Receita removida de ${m.name}.`, 'info');
      } else {
        if (confirm(`Deseja excluir a receita "${item.source}" de TODOS os 12 meses do ano?`)) {
          store.deleteRevenue(monthNum, id, true);
          this.renderMeses();
          this.renderResumo();
          this.showToast('Receita anual excluída de todos os 12 meses!', 'info');
        }
      }
    } else {
      if (confirm(`Deseja excluir a receita "${item.source}" (${formatBRL(item.value)})?`)) {
        store.deleteRevenue(monthNum, id, false);
        this.renderMeses();
        this.renderResumo();
        this.showToast('Receita removida com sucesso.', 'info');
      }
    }
  },

  deleteRevenue(monthNum, id) {
    this.deleteRevenuePrompt(monthNum, id);
  },

  deleteFixedExpense(monthNum, id) {
    const mNum = Number(monthNum) || this.activeMonth;
    const m = store.data.months[mNum] || store.data.months[String(mNum)];
    if (!m) return;
    const expense = m.fixedExpenses?.find(e => e && (String(e.id) === String(id) || e.id === id));
    if (!expense) return;

    const isRecurring = Boolean(expense.annualGroupId || expense.type === 'anual' || expense.type === 'multi-mes' || store.hasRecurringFixedExpense(monthNum, expense));

    if (isRecurring) {
      document.getElementById('delete_fix_id').value = id;
      document.getElementById('delete_fix_month').value = monthNum;
      document.getElementById('delete_fix_desc_display').textContent = `"${expense.description}"`;
      document.getElementById('delete_fix_month_name').textContent = m.name;
      document.getElementById('delete_fix_month_range').textContent = `de ${m.name} até Dezembro`;
      this.openModal('modalExcluirDespesaFixaRecorrente');
    } else {
      if (confirm(`Deseja excluir a despesa fixa "${expense.description}"?`)) {
        store.deleteFixedExpense(monthNum, id, 'single');
        this.renderMeses();
        this.renderResumo();
        this.showToast('Despesa fixa removida com sucesso.', 'info');
      }
    }
  },

  confirmDeleteFixedExpense(cascadeMode) {
    const id = document.getElementById('delete_fix_id').value;
    const monthNum = Number(document.getElementById('delete_fix_month').value) || this.activeMonth;
    const m = store.data.months[monthNum];
    const monthName = m ? m.name : `Mês ${monthNum}`;

    store.deleteFixedExpense(monthNum, id, cascadeMode);
    this.closeModal('modalExcluirDespesaFixaRecorrente');
    this.renderMeses();
    this.renderResumo();

    if (cascadeMode === 'single') {
      this.showToast(`Despesa removida apenas de ${monthName}.`, 'info');
    } else if (cascadeMode === 'following') {
      this.showToast(`Despesa removida de ${monthName} e de todos os meses seguintes!`, 'info');
    } else {
      this.showToast('Despesa recorrente removida de todos os meses do ano!', 'info');
    }
  },

  openEditFixedExpenseModal(monthNum, id) {
    const mNum = Number(monthNum) || this.activeMonth;
    const m = store.data.months[mNum] || store.data.months[String(mNum)];
    const expense = m?.fixedExpenses?.find(e => e && (String(e.id) === String(id) || e.id === id));
    if (!expense) return;

    document.getElementById('edit_fix_id').value = expense.id;
    document.getElementById('edit_fix_month').value = monthNum;
    document.getElementById('edit_fix_annual_group').value = expense.annualGroupId || '';
    document.getElementById('edit_fix_desc').value = expense.description || '';

    // Vencimento pré-configurado com o dia atual se não cadastrado
    const hasDue = (expense.dueDay !== undefined && expense.dueDay !== null && String(expense.dueDay).trim() !== '');
    const dDay = hasDue ? Number(expense.dueDay) : (expense.dueDate ? parseInt(expense.dueDate.split('-')[2], 10) : new Date().getDate());
    document.getElementById('edit_fix_due_day').value = dDay || new Date().getDate();

    document.getElementById('edit_fix_val_exp').value = formatMoneyDisplay(expense.valueExpected || 0);
    document.getElementById('edit_fix_val_paid').value = (expense.valuePaid !== undefined && expense.valuePaid !== null && expense.valuePaid !== '') ? formatMoneyDisplay(expense.valuePaid) : '';
    document.getElementById('edit_fix_status').value = expense.status || 'Pendente';
    document.getElementById('edit_fix_bank').value = expense.bank || '';

    // Data de Pagamento efetivo
    const payDateInput = document.getElementById('edit_fix_payment_date');
    const payDateContainer = document.getElementById('edit_fix_payment_date_container');
    if (payDateInput) {
      payDateInput.value = expense.paymentDate || '';
    }
    if (payDateContainer) {
      payDateContainer.style.display = expense.status === 'Pago' ? 'block' : 'none';
    }

    // Opções de recorrência (cascata)
    const isRecurring = Boolean(expense.annualGroupId || expense.type === 'anual' || expense.type === 'multi-mes' || store.hasRecurringFixedExpense(monthNum, expense));
    const container = document.getElementById('editFixRecurrenceContainer');
    if (container) {
      if (isRecurring) {
        container.style.display = 'block';
        const monthName = m ? m.name : `Mês ${monthNum}`;
        const curEl = document.getElementById('edit_fix_current_month_name');
        if (curEl) curEl.textContent = monthName;
        const follEl = document.getElementById('edit_fix_following_months_desc');
        if (follEl) follEl.textContent = `de ${monthName} até Dezembro`;
        const singleRadio = document.querySelector('input[name="edit_fix_cascade_option"][value="single"]');
        if (singleRadio) singleRadio.checked = true;
      } else {
        container.style.display = 'none';
      }
    }

    this.openModal('modalEditarDespesaFixa');
  },

  toggleFixedExpenseStatus(monthNum, id, expenseIndex) {
    const mNum = Number(monthNum) || this.activeMonth;
    const m = store.data.months[mNum] || store.data.months[String(mNum)];
    if (!m || !Array.isArray(m.fixedExpenses)) return;

    let expense = null;
    if (id !== undefined && id !== null && id !== '' && id !== 'undefined') {
      expense = m.fixedExpenses.find(e => e && (String(e.id) === String(id) || e.id === id));
    }
    if (!expense && expenseIndex !== undefined && expenseIndex !== null && m.fixedExpenses[expenseIndex]) {
      expense = m.fixedExpenses[expenseIndex];
    }
    if (!expense) return;

    if (expense.status === 'Pago') {
      expense.status = 'Pendente';
      expense.paymentDate = '';
      const valToRefund = Number(expense.valuePaid) || Number(expense.valueExpected) || 0;
      if (expense.bank && valToRefund > 0) {
        store.creditToBank(expense.bank, valToRefund);
      }
    } else {
      expense.status = 'Pago';
      // Mantém a data de pagamento informada pelo usuário (deixa o usuário colocar a data desejada)
      if (!expense.paymentDate) {
        const targetYear = store?.activeYear || new Date().getFullYear();
        if (expense.dueDate && expense.dueDate.startsWith(`${targetYear}-${String(mNum).padStart(2, '0')}`)) {
          expense.paymentDate = expense.dueDate;
        } else {
          expense.paymentDate = '';
        }
      }
      // Se o valor realizado estiver vazio ou zerado, preenche com o valor previsto
      if (expense.valuePaid === undefined || expense.valuePaid === null || expense.valuePaid === '' || Number(expense.valuePaid) === 0) {
        expense.valuePaid = Number(expense.valueExpected) || 0;
      }
      const valToDebit = Number(expense.valuePaid) || 0;
      if (expense.bank && valToDebit > 0) {
        store.debitFromBank(expense.bank, valToDebit);
      }
    }

    store.save();
    this.renderMeses();
    this.renderResumo();

    if (expense.status === 'Pago') {
      if (expense.paymentDate) {
        const parts = expense.paymentDate.split('-');
        const payMonth = parseInt(parts[1], 10);
        if (payMonth && payMonth !== Number(mNum)) {
          this.showToast(`✓ Conta de ${store.getMonthName(mNum)} marcada como Paga! Descontada no saldo de ${store.getMonthName(payMonth)} (${formatDateBR(expense.paymentDate)}).`, 'success');
        } else {
          this.showToast(`✓ Despesa marcada como Paga (${formatDateBR(expense.paymentDate)})!`, 'success');
        }
      } else {
        this.showToast(`✓ Despesa marcada como Paga! Você pode informar a data de pagamento na tabela.`, 'success');
      }
    } else {
      this.showToast('Despesa marcada como Pendente.', 'info');
    }
  },

  togglePayAllFixed(monthNum) {
    const summary = store.getMonthSummary(monthNum);
    const targetStatus = summary.fixedPct === 100 ? 'Pendente' : 'Pago';
    store.setAllFixedExpensesStatus(monthNum, targetStatus);
    this.renderMeses();
    this.renderResumo();
    this.showToast(targetStatus === 'Pago' ? 'Todas as despesas fixas marcadas como pagas!' : 'Despesas fixas marcadas como pendentes.', 'info');
  },

  toggleCardInstallment(monthNum, key) {
    const newStatus = store.toggleCardInstallmentStatus(monthNum, key);
    this.renderMeses();
    this.renderResumo();
    this.showToast(`Parcela marcada como ${newStatus}!`, 'info');
  },

  togglePayAllCards(monthNum) {
    const summary = store.getMonthSummary(monthNum);
    const targetStatus = summary.cardPct === 100 ? 'Pendente' : 'Pago';
    store.setAllCardInstallmentsStatus(monthNum, targetStatus);
    this.renderMeses();
    this.renderResumo();
    this.showToast(targetStatus === 'Pago' ? 'Fatura do mês marcada como paga!' : 'Fatura do mês marcada como pendente.', 'success');
  },

  togglePayCardInvoice(monthNum, cardKey) {
    const invoices = store.getCardInvoicesForMonth(monthNum);
    const inv = invoices.find(i => i.key === cardKey);
    if (!inv) return;

    const isCurrentlyPaid = (inv.isPaid || inv.totalPaid > 0);
    const targetStatus = isCurrentlyPaid ? 'Pendente' : 'Pago';
    const paidVal = isCurrentlyPaid ? 0 : inv.totalExpected;

    store.setCardInvoiceStatus(monthNum, cardKey, targetStatus, paidVal);
    this.renderMeses();
    this.renderResumo();
    this.renderActiveMonthSubtab();
    this.showToast(targetStatus === 'Pago' ? `Fatura ${inv.name} marcada como Paga (${formatBRL(paidVal)})!` : `Fatura ${inv.name} marcada como Pendente.`, 'success');
  },

  handleInlineCardInvoicePaidBlur(inputEl, monthNum, cardKey) {
    if (!inputEl) return;
    const raw = (inputEl.value || '').trim();
    const invoices = store.getCardInvoicesForMonth(monthNum);
    const inv = invoices.find(i => i.key === cardKey);
    if (!inv) return;

    if (raw === '') {
      if (inv.isPaid) {
        inputEl.value = '0,00';
        inputEl.classList.add('has-value');
        store.setCardInvoiceStatus(monthNum, cardKey, 'Pendente', 0);
      } else {
        inputEl.value = '';
        inputEl.classList.remove('has-value');
        store.setCardInvoiceStatus(monthNum, cardKey, 'Pendente', 0);
      }
      this.renderMeses();
      this.renderResumo();
      this.renderActiveMonthSubtab();
      return;
    }

    const num = parseMoney(raw);
    inputEl.value = formatMoneyDisplay(num);
    if (num > 0) {
      inputEl.classList.add('has-value');
      store.setCardInvoiceStatus(monthNum, cardKey, 'Pago', num);
    } else {
      inputEl.classList.remove('has-value');
      store.setCardInvoiceStatus(monthNum, cardKey, 'Pendente', 0);
    }

    this.renderMeses();
    this.renderResumo();
    this.renderActiveMonthSubtab();

    if (num >= inv.totalExpected && inv.totalExpected > 0) {
      this.showToast(`Fatura ${inv.name} quitada: ${formatBRL(num)}`, 'success');
    } else if (num > 0) {
      this.showToast(`Fatura ${inv.name} paga abaixo: ${formatBRL(num)} (Previsto: ${formatBRL(inv.totalExpected)})`, 'warning');
    } else {
      this.showToast(`Fatura ${inv.name} definida como pendente.`, 'info');
    }
  },

  openEditCardInvoiceModal(monthNum, cardKey) {
    const invoices = store.getCardInvoicesForMonth(monthNum);
    const inv = invoices.find(i => i.key === cardKey);
    if (!inv) return;

    document.getElementById('edit_fatura_month').value = monthNum;
    document.getElementById('edit_fatura_card').value = cardKey;
    document.getElementById('edit_fatura_name').value = inv.name;
    document.getElementById('edit_fatura_due').value = `Vencimento dia ${inv.dueDay} (Fechamento dia ${inv.closingDay})`;
    document.getElementById('edit_fatura_val_exp').value = formatMoneyDisplay(inv.totalExpected);
    
    const currentPaid = (inv.isPaid || inv.totalPaid > 0) ? inv.totalPaid : inv.totalExpected;
    document.getElementById('edit_fatura_val_paid').value = formatMoneyDisplay(currentPaid);
    document.getElementById('edit_fatura_status').value = inv.isPaid ? 'Pago' : (inv.totalPaid > 0 ? 'Pago' : 'Pendente');

    this.openModal('modalEditarFaturaCartao');
  },

  toggleCardDetailsDrawer() {
    this.showCardDetailsDrawer = !this.showCardDetailsDrawer;
    const drawer = document.getElementById('cardDetailsDrawerContainer');
    const btn = document.getElementById('btnToggleCardDrawer');
    if (drawer) {
      drawer.style.display = this.showCardDetailsDrawer ? 'block' : 'none';
    }
    if (btn) {
      btn.innerHTML = this.showCardDetailsDrawer 
        ? '▲ Ocultar detalhamento de compras individuais' 
        : '▼ Ver detalhamento de compras individuais (Opcional)';
    }
  },

  openEditCardInstallmentModal(monthNum, key) {
    const installments = store.getCardInstallmentsForMonth(monthNum);
    const inst = installments.find(c => c.key === key);
    if (!inst) return;

    document.getElementById('edit_card_inst_month').value = monthNum;
    document.getElementById('edit_card_inst_key').value = key;
    document.getElementById('edit_card_inst_desc').value = inst.description || '';
    document.getElementById('edit_card_inst_info').value = `${inst.card} — Parcela ${inst.installmentIndex} de ${inst.installmentsTotal}`;
    document.getElementById('edit_card_inst_val_exp').value = formatMoneyDisplay(inst.value);
    
    const currentPaid = (inst.valuePaidStored !== null && inst.valuePaidStored !== undefined)
      ? inst.valuePaidStored
      : (inst.status === 'Pago' ? inst.value : inst.value);

    document.getElementById('edit_card_inst_val_paid').value = formatMoneyDisplay(currentPaid);
    document.getElementById('edit_card_inst_status').value = inst.status || 'Pendente';

    this.openModal('modalEditarParcelaCartao');
  },

  deleteVariableExpense(monthNum, id) {
    if (confirm('Deseja excluir esta despesa variável?')) {
      store.deleteVariableExpense(monthNum, id);
      this.renderMeses();
      this.renderResumo();
      this.showToast('Despesa variável removida com sucesso.', 'info');
    }
  },

  // =========================================================================
  // 3. MÓDULO CARTÃO DE CRÉDITO - NOTION CALENDAR MATRIX & GERENCIAMENTO
  // =========================================================================
  renderCartoes() {
    this.renderCardCalendarMatrix();
    this.renderCardPurchasesList();
  },

  getCardCalendarMonthColumns() {
    const now = new Date();
    const currYear = now.getFullYear();
    const currMonth = now.getMonth() + 1;
    const year = Number(store.activeYear) || currYear;
    const monthNames = [
      '', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    const cols = [];
    for (let m = 1; m <= 12; m++) {
      cols.push({
        month: m,
        year: year,
        name: monthNames[m],
        isCurrent: (year === currYear && m === currMonth)
      });
    }
    return cols;
  },

  getPurchaseInstallmentInfo(p, fallbackYear) {
    let dateYear = fallbackYear || Number(store.activeYear) || new Date().getFullYear();
    let dateMonth = 1;
    let dateDay = 1;
    if (p.date) {
      const parts = p.date.split('-');
      if (parts.length >= 2) {
        dateYear = parseInt(parts[0], 10) || dateYear;
        dateMonth = parseInt(parts[1], 10) || 1;
        if (parts.length >= 3) dateDay = parseInt(parts[2], 10) || 1;
      }
    }

    let sMonth = Number(p.startMonth);
    let sYear = Number(p.startYear);

    // Validação: o início padrão é o mês da compra
    if (!sMonth || !sYear || sYear < dateYear || (sYear === dateYear && sMonth < dateMonth)) {
      sMonth = dateMonth;
      sYear = dateYear;
    }

    const isRecurring = (p.installments === 'recorrente' || p.isRecurring === true);
    const count = isRecurring ? 9999 : (Number(p.installments) || 1);
    const valTotal = Number(p.totalAmount) || 0;
    const valPerInstallment = isRecurring ? valTotal : (count > 0 ? (valTotal / count) : valTotal);

    return {
      startMonth: sMonth,
      startYear: sYear,
      count: count,
      isRecurring: isRecurring,
      installmentValue: valPerInstallment
    };
  },

  getSiteTagHtml(site) {
    if (!site || !site.trim()) {
      return '<span class="notion-tag" style="background: rgba(148, 163, 184, 0.15); color: #94a3b8;">outros</span>';
    }
    const s = site.trim();
    const lower = s.toLowerCase();

    let bg = 'rgba(148, 163, 184, 0.15)';
    let color = '#cbd5e1';

    if (lower.includes('amazon')) {
      bg = 'rgba(59, 130, 246, 0.22)';
      color = '#60a5fa';
    } else if (lower.includes('mercado') || lower.includes('livre')) {
      bg = 'rgba(245, 158, 11, 0.22)';
      color = '#fbbf24';
    } else if (lower.includes('aliexpress') || lower.includes('shopee') || lower.includes('shein')) {
      bg = 'rgba(239, 68, 68, 0.22)';
      color = '#f87171';
    } else if (lower.includes('seguro')) {
      bg = 'rgba(217, 119, 6, 0.22)';
      color = '#f59e0b';
    } else if (lower.includes('farmacia') || lower.includes('saude') || lower.includes('vacina')) {
      bg = 'rgba(16, 185, 129, 0.22)';
      color = '#34d399';
    } else if (lower.includes('outros') || lower.includes('outro')) {
      bg = 'rgba(244, 63, 94, 0.22)';
      color = '#fb7185';
    } else {
      const colors = [
        { bg: 'rgba(139, 92, 246, 0.22)', color: '#a78bfa' },
        { bg: 'rgba(14, 165, 233, 0.22)', color: '#38bdf8' },
        { bg: 'rgba(236, 72, 153, 0.22)', color: '#f472b6' },
        { bg: 'rgba(20, 184, 166, 0.22)', color: '#2dd4bf' },
        { bg: 'rgba(249, 115, 22, 0.22)', color: '#fb923c' }
      ];
      let hash = 0;
      for (let i = 0; i < s.length; i++) hash = s.charCodeAt(i) + ((hash << 5) - hash);
      const chosen = colors[Math.abs(hash) % colors.length];
      bg = chosen.bg;
      color = chosen.color;
    }

    return `<span class="notion-tag" style="background: ${bg}; color: ${color};">${escapeHtml(s)}</span>`;
  },

  formatDateFullPT(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const day = parseInt(parts[2], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[0], 10);
    const monthNames = [
      '', 'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
      'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
    ];
    return `${day} de ${monthNames[month] || month} de ${year}`;
  },

  renderCardCalendarMatrix() {
    const container = document.getElementById('cardCalendarMatrixContainer');
    if (!container) return;

    let purchases = store.data.cardPurchases || [];
    const configuredCards = Array.isArray(store.data.creditCards) && store.data.creditCards.length > 0
      ? store.data.creditCards
      : [
          { id: 'master', name: 'Mastercard' },
          { id: 'nubank_card', name: 'Nubank (Nu)' }
        ];

    const selectedCardObj = configuredCards.find(c =>
      c.id === this.activeTabCartao ||
      (c.id === 'nubank_card' && this.activeTabCartao === 'nubank') ||
      String(c.name || '').toLowerCase() === String(this.activeTabCartao || '').toLowerCase()
    );

    if (this.activeTabCartao !== 'todos') {
      purchases = purchases.filter(p => {
        if (selectedCardObj) {
          return store.matchesCreditCard(p.card, selectedCardObj);
        }
        return (p.card || '').toLowerCase().includes(this.activeTabCartao.toLowerCase());
      });
    }

    if (this.cardSearchQuery) {
      const q = this.cardSearchQuery.toLowerCase().trim();
      purchases = purchases.filter(p => (p.description || '').toLowerCase().includes(q) || (p.place || '').toLowerCase().includes(q));
    }

    const cardTitle = (this.activeTabCartao === 'todos')
      ? 'Todos os Cartões'
      : (selectedCardObj ? selectedCardObj.name : this.activeTabCartao);
    const cols = this.getCardCalendarMonthColumns();
    const colTotals = new Array(cols.length).fill(0);
    let grandTotalYear = 0;

    container.innerHTML = `
      <div class="notion-card-calendar-container">
        <!-- CABEÇALHO NOTION -->
        <div class="notion-card-calendar-header">
          <div class="notion-card-title-wrap">
            <h2 class="notion-card-title">${escapeHtml(cardTitle)} (${store.activeYear})</h2>
            <div class="notion-card-tabs">
              <button class="notion-card-tab ${this.activeTabCartao === 'todos' ? 'active' : ''}" onclick="app.filterCard('todos')">Todos os Cartões</button>
              ${configuredCards.map(c => {
                const tabKey = c.id === 'nubank_card' ? 'nubank' : c.id;
                const isAct = (this.activeTabCartao === tabKey || this.activeTabCartao === c.id || this.activeTabCartao === c.name);
                return `<button class="notion-card-tab ${isAct ? 'active' : ''}" onclick="app.filterCard('${escapeHtml(tabKey)}')">${escapeHtml(c.name)}</button>`;
              }).join('')}
            </div>
          </div>

          <div class="notion-card-toolbar">
            <div class="notion-year-nav">
              <button class="notion-icon-btn" title="Ano Anterior (${store.activeYear - 1})" onclick="app.prevYear()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
              </button>
              <span class="notion-btn-pill" style="cursor:default; font-weight:700; color:#38bdf8; background:rgba(56,189,248,0.1); border-color:rgba(56,189,248,0.25);">
                Ano ${store.activeYear}
              </span>
              <button class="notion-icon-btn" title="Próximo Ano (${store.activeYear + 1})" onclick="app.nextYear()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </button>
            </div>

            <div class="notion-toolbar-divider"></div>

            <div class="notion-search-actions-row">
              <input type="text" 
                     class="form-input notion-card-search" 
                     placeholder="🔍 Filtrar..." 
                     value="${escapeHtml(this.cardSearchQuery || '')}" 
                     oninput="app.filterCardSearch(this.value)">

              <button class="notion-btn-blue" onclick="app.openModalNovaCompraCartao()">
                + Nova Compra
              </button>
            </div>
          </div>
        </div>

        <!-- TABELA MATRIZ CALENDÁRIO (12 MESES DO ANO) -->
        <div class="notion-matrix-scroll">
          <table class="notion-matrix-table">
            <thead>
              <tr>
                <th style="min-width: 200px;"><span class="th-icon">Aa</span> Compra</th>
                <th style="min-width: 120px;"><span class="th-icon">⊙</span> Site</th>
                <th style="min-width: 130px;"><span class="th-icon">💳</span> Cartão</th>
                <th style="min-width: 130px;"><span class="th-icon">📅</span> Data Compra</th>
                ${cols.map(col => `
                  <th class="col-month ${col.isCurrent ? 'col-current-month' : ''}">
                    # ${col.name}
                  </th>
                `).join('')}
                <th style="min-width: 120px; text-align: right; color: #38bdf8;">Total ${store.activeYear}</th>
              </tr>
            </thead>
            <tbody>
              ${(() => {
                const yearPurchases = purchases.filter(p => {
                  const info = this.getPurchaseInstallmentInfo(p, store.activeYear);
                  return cols.some(col => {
                    const monthDiff = (col.year - info.startYear) * 12 + (col.month - info.startMonth);
                    return (monthDiff >= 0 && monthDiff < info.count);
                  });
                });

                if (yearPurchases.length === 0) {
                  return `
                    <tr>
                      <td colspan="${5 + cols.length}" style="text-align: center; padding: 3rem 1rem; color: #64748b;">
                        Nenhuma parcela prevista para ${cardTitle} no ano ${store.activeYear}.
                      </td>
                    </tr>
                  `;
                }

                return yearPurchases.map(p => {
                  const info = this.getPurchaseInstallmentInfo(p, store.activeYear);
                  const siteTag = this.getSiteTagHtml(p.place);
                  const dateText = this.formatDateFullPT(p.date);
                  let rowTotalYear = 0;

                  const cellsHtml = cols.map((col, idx) => {
                    const monthDiff = (col.year - info.startYear) * 12 + (col.month - info.startMonth);
                    const hasInstallment = (monthDiff >= 0 && monthDiff < info.count);
                    if (hasInstallment) {
                      colTotals[idx] += info.installmentValue;
                      rowTotalYear += info.installmentValue;
                      grandTotalYear += info.installmentValue;
                      return `<td class="col-month ${col.isCurrent ? 'col-current-month' : ''}">${formatBRL(info.installmentValue)}</td>`;
                    }
                    return `<td class="col-month ${col.isCurrent ? 'col-current-month' : ''}"></td>`;
                  }).join('');

                  return `
                    <tr>
                      <td>
                        <div class="notion-purchase-title-cell">
                          <span class="notion-file-icon">📄</span>
                          <span style="font-weight: 600;">${escapeHtml(p.description)}</span>
                          <button class="notion-abrir-btn" onclick="app.openCardPurchaseDetails('${p.id}')">Abrir</button>
                        </div>
                      </td>
                      <td>${siteTag}</td>
                      <td><span class="notion-tag" style="background: rgba(148, 163, 184, 0.15); color: #cbd5e1;">${escapeHtml(p.card || 'Mastercard')}</span></td>
                      <td style="color: #94a3b8; font-size: 0.8rem;">${dateText}</td>
                      ${cellsHtml}
                      <td style="text-align: right; font-weight: 700; color: #38bdf8;">${rowTotalYear > 0 ? formatBRL(rowTotalYear) : '—'}</td>
                    </tr>
                  `;
                }).join('');
              })()}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="4" style="text-align: right; color: #94a3b8; font-weight: 700; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em;">
                  Total da Fatura:
                </td>
                ${cols.map((col, idx) => `
                  <td class="col-month ${col.isCurrent ? 'col-current-month' : ''}" style="color: #60a5fa; font-weight: 800; font-size: 0.88rem;">
                    ${colTotals[idx] > 0 ? formatBRL(colTotals[idx]) : '—'}
                  </td>
                `).join('')}
                <td style="text-align: right; color: #38bdf8; font-weight: 800; font-size: 0.95rem;">
                  ${grandTotalYear > 0 ? formatBRL(grandTotalYear) : '—'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    `;
  },

  setCardPurchasesFilter(mode) {
    this.cardPurchasesFilter = mode;
    const btnAberto = document.getElementById('btnCardFilterAberto');
    const btnLiquidado = document.getElementById('btnCardFilterLiquidado');
    const btnTodas = document.getElementById('btnCardFilterTodas');
    if (btnAberto) btnAberto.classList.toggle('active', mode === 'aberto');
    if (btnLiquidado) btnLiquidado.classList.toggle('active', mode === 'liquidado');
    if (btnTodas) btnTodas.classList.toggle('active', mode === 'todas');
    this.renderCardPurchasesList();
  },

  renderCardPurchasesList() {
    const tbody = document.getElementById('cardPurchasesTableBody');
    if (!tbody) return;

    this.cardPurchasesFilter = this.cardPurchasesFilter || 'aberto';

    let allPurchases = store.data.cardPurchases || [];
    if (this.activeTabCartao !== 'todos') {
      allPurchases = allPurchases.filter(p => (p.card || '').toLowerCase().includes(this.activeTabCartao.toLowerCase()));
    }

    // Calcula contadores e saldo a pagar real
    let countAberto = 0;
    let countLiquidado = 0;
    let totalPendingSum = 0;

    allPurchases.forEach(p => {
      const s = store.getCardPurchaseStatusInfo(p);
      if (s.isLiquidated) {
        countLiquidado++;
      } else {
        countAberto++;
        totalPendingSum += s.totalPending;
      }
    });

    const elCountAberto = document.getElementById('countCardAberto');
    const elCountLiquidado = document.getElementById('countCardLiquidado');
    const elCountTodas = document.getElementById('countCardTodas');
    if (elCountAberto) elCountAberto.textContent = countAberto;
    if (elCountLiquidado) elCountLiquidado.textContent = countLiquidado;
    if (elCountTodas) elCountTodas.textContent = allPurchases.length;

    const elTotal = document.getElementById('totalOpenCardPurchases');
    if (elTotal) elTotal.textContent = formatBRL(totalPendingSum);

    // Aplica o filtro selecionado
    let purchases = allPurchases;
    if (this.cardPurchasesFilter === 'aberto') {
      purchases = allPurchases.filter(p => !store.getCardPurchaseStatusInfo(p).isLiquidated);
    } else if (this.cardPurchasesFilter === 'liquidado') {
      purchases = allPurchases.filter(p => store.getCardPurchaseStatusInfo(p).isLiquidated);
    }

    if (purchases.length === 0) {
      let emptyMsg = 'Nenhuma compra de cartão cadastrada.';
      if (this.cardPurchasesFilter === 'aberto') {
        emptyMsg = '🎉 Nenhuma compra com parcelas em aberto! Todas as compras registradas estão 100% quitadas/liquidadas.';
      } else if (this.cardPurchasesFilter === 'liquidado') {
        emptyMsg = 'Nenhuma compra liquidada até o momento. Conforme as parcelas forem pagas, elas aparecerão aqui.';
      }
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: var(--text-muted); padding: 2.5rem; font-size: 0.92rem;">${emptyMsg}</td></tr>`;
      return;
    }

    tbody.innerHTML = purchases.map(p => {
      const statusInfo = store.getCardPurchaseStatusInfo(p);
      const isRec = (p.installments === 'recorrente' || p.isRecurring === true);
      const parcelas = isRec ? 'Recorrente' : (Number(p.installments) || 1);
      const valorParcela = isRec ? (Number(p.totalAmount) || 0) : ((Number(p.totalAmount) || 0) / (Number(p.installments) || 1));
      const mesInicio = (store.data.months[p.startMonth]?.name) || (INITIAL_DATABASE.months[p.startMonth]?.name) || 'Janeiro';
      const anoInicio = p.startYear || (p.date ? p.date.split('-')[0] : store.activeYear);

      return `
        <tr style="${statusInfo.isLiquidated ? 'opacity: 0.85;' : ''}">
          <td>
            <div style="display:flex; align-items:center; gap:0.45rem;">
              <span style="color:${isRec ? '#c084fc' : (statusInfo.isLiquidated ? '#10b981' : '#64748b')};">${isRec ? '🔁' : (statusInfo.isLiquidated ? '✓' : '📄')}</span>
              <strong>${escapeHtml(p.description)}</strong>
            </div>
          </td>
          <td>${this.getSiteTagHtml(p.place)}</td>
          <td><span class="status-badge neutral">${p.card}</span></td>
          <td>${formatDateBR(p.date)}</td>
          <td>
            <span class="status-badge ${isRec ? 'annual' : (statusInfo.isLiquidated ? 'paid' : 'waiting')}" ${isRec ? 'style="background:rgba(139, 92, 246, 0.15); color:#c084fc; border:1px solid rgba(139, 92, 246, 0.3);"' : ''}>
              ${isRec ? '🔁 Recorrente (Mensal)' : (statusInfo.isLiquidated ? '✓ 100% Liquidada' : `${parcelas}x de ${formatBRL(valorParcela)}`)}
            </span>
            <div style="font-size:0.75rem; color:var(--text-muted); margin-top:3px;">
              ${isRec 
                ? `Assinatura de ${formatBRL(p.totalAmount)}/mês` 
                : (statusInfo.isLiquidated 
                    ? `Todas as ${parcelas} parcelas quitadas` 
                    : `Faltam ${statusInfo.pendingCount}x (Saldo: ${formatBRL(statusInfo.totalPending)})`)}
            </div>
          </td>
          <td style="font-weight: 800; color: #ffffff;">${formatBRL(p.totalAmount)}</td>
          <td style="text-align: center;">
            <div class="table-actions" style="justify-content: center; gap: 0.35rem;">
              <button class="btn-table-icon" title="Ver Detalhes" onclick="app.openCardPurchaseDetails('${p.id}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
              </button>
              <button class="btn-table-icon" title="Editar Compra" onclick="app.openEditCardPurchaseModal('${p.id}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              </button>
              <button class="btn-table-icon delete" title="Excluir Compra" onclick="app.deleteCardPurchase('${p.id}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  shiftCardCalendarMonths(delta) {
    this.cardCalendarOffset = (this.cardCalendarOffset || 0) + delta;
    this.renderCardCalendarMatrix();
  },

  resetCardCalendarMonths() {
    this.cardCalendarOffset = 0;
    this.renderCardCalendarMatrix();
  },

  filterCardSearch(query) {
    this.cardSearchQuery = query || '';
    this.renderCardCalendarMatrix();
    this.renderCardPurchasesList();
  },

  toggleCardPurchasesList() {
    const el = document.getElementById('cardPurchasesListCollapsible');
    if (el) {
      el.style.display = (el.style.display === 'none') ? 'block' : 'none';
    }
  },

  openCardPurchaseDetails(id) {
    const p = store.data.cardPurchases?.find(item => item.id === id);
    if (!p) return;

    const modalBody = document.getElementById('modalDetalhesCompraBody');
    const btnDelete = document.getElementById('btnDeleteCardPurchaseDetail');
    if (!modalBody) return;

    const info = this.getPurchaseInstallmentInfo(p, store.activeYear);
    const mNames = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const startMonthName = mNames[info.startMonth] || `Mês ${info.startMonth}`;

    modalBody.innerHTML = `
      <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border-light); border-radius: var(--radius-md); padding: 1.25rem; margin-bottom: 1.25rem;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.75rem;">
          <div>
            <span style="font-size:0.72rem; color:var(--text-muted); text-transform:uppercase; font-weight:700; letter-spacing:0.05em;">Compra</span>
            <h3 style="font-size:1.3rem; font-weight:800; color:#ffffff; margin:0.2rem 0 0.4rem 0;">${escapeHtml(p.description)}</h3>
            ${this.getSiteTagHtml(p.place)}
          </div>
          <span class="status-badge neutral" style="font-size:0.85rem; padding:0.3rem 0.75rem;">${p.card}</span>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem; margin-top:1rem; padding-top:1rem; border-top:1px solid rgba(255,255,255,0.06);">
          <div>
            <div style="font-size:0.75rem; color:var(--text-muted);">Data da Compra</div>
            <div style="font-weight:700; color:#e2e8f0; font-size:0.92rem;">${this.formatDateFullPT(p.date) || '-'}</div>
          </div>
          <div>
            <div style="font-size:0.75rem; color:var(--text-muted);">Valor Total</div>
            <div style="font-weight:800; color:#f87171; font-size:1.15rem;">${formatBRL(p.totalAmount)}</div>
          </div>
          <div>
            <div style="font-size:0.75rem; color:var(--text-muted);">Parcelamento / Tipo</div>
            <div style="font-weight:700; color:#fbbf24; font-size:0.95rem;">
              ${info.isRecurring ? '🔁 Recorrente (Mensal)' : `${info.count}x de ${formatBRL(info.installmentValue)}`}
            </div>
          </div>
          <div>
            <div style="font-size:0.75rem; color:var(--text-muted);">Início da Cobrança</div>
            <div style="font-weight:700; color:#34d399; font-size:0.95rem;">${startMonthName}/${info.startYear}</div>
          </div>
        </div>
      </div>
    `;

    if (btnDelete) {
      btnDelete.onclick = () => {
        if (confirm(`Excluir a compra "${p.description}" e remover todas as suas parcelas?`)) {
          store.deleteCardPurchase(id);
          this.closeModal('modalDetalhesCompraCartao');
          this.renderCartoes();
          this.renderMeses();
          this.renderResumo();
          this.showToast('Compra removida com sucesso.', 'info');
        }
      };
    }

    const btnEdit = document.getElementById('btnEditCardPurchaseDetail');
    if (btnEdit) {
      btnEdit.onclick = () => {
        this.openEditCardPurchaseModal(id);
      };
    }

    this.openModal('modalDetalhesCompraCartao');
  },

  openEditCardPurchaseModal(id) {
    const p = store.data.cardPurchases?.find(item => item.id === id);
    if (!p) return;

    this.closeModal('modalDetalhesCompraCartao');

    document.getElementById('edit_card_id').value = p.id;
    document.getElementById('edit_card_desc').value = p.description || '';
    document.getElementById('edit_card_place').value = p.place || '';
    document.getElementById('edit_card_date').value = p.date || '';
    document.getElementById('edit_card_val').value = formatMoneyDisplay(p.totalAmount || 0);
    const isRec = (p.installments === 'recorrente' || p.isRecurring === true);
    document.getElementById('edit_card_installments').value = isRec ? 'recorrente' : String(p.installments || 1);

    // Popula ou seleciona o cartão
    const cardSelect = document.getElementById('edit_card_type');
    if (cardSelect) {
      const cards = store.data.cards || store.data.creditCards || [];
      if (cards.length > 0) {
        cardSelect.innerHTML = cards.map(c => `
          <option value="${escapeHtml(c.name)}" ${(c.name || '').toLowerCase() === (p.card || '').toLowerCase() ? 'selected' : ''}>
            ${escapeHtml(c.name)}
          </option>
        `).join('');
      } else {
        cardSelect.value = p.card || 'Mastercard';
      }
    }

    // Início da Cobrança
    const sMonth = p.startMonth || 1;
    const sYear = p.startYear || (p.date ? parseInt(p.date.split('-')[0], 10) : store.activeYear);
    const monthSelect = document.getElementById('edit_card_start_month');
    const yearSelect = document.getElementById('edit_card_start_year');
    if (monthSelect) monthSelect.value = String(sMonth);
    if (yearSelect) yearSelect.value = String(sYear);

    this.updateEditCardStartBillingSuggestion();
    this.openModal('modalEditarCompraCartao');

    setTimeout(() => {
      const descInput = document.getElementById('edit_card_desc');
      if (descInput) descInput.focus();
    }, 150);
  },

  updateEditCardStartBillingSuggestion() {
    const installments = Number(document.getElementById('edit_card_installments')?.value) || 1;
    const totalVal = parseMoney(document.getElementById('edit_card_val')?.value) || 0;
    const hintEl = document.getElementById('edit_card_billing_hint');

    if (hintEl) {
      const valParcela = totalVal > 0 ? formatBRL(totalVal / installments) : 'R$ 0,00';
      hintEl.textContent = `Parcelamento: ${installments}x de ${valParcela}`;
    }
  },

  deleteCardPurchase(id) {
    if (confirm('Deseja excluir esta compra parcelada? Suas parcelas serão removidas dos meses correspondentes.')) {
      store.deleteCardPurchase(id);
      this.renderCartoes();
      this.renderMeses();
      this.renderResumo();
      this.showToast('Compra removida com sucesso.', 'info');
    }
  },

  filterCard(type) {
    this.activeTabCartao = type;
    this.renderCartoes();
  },

  // =========================================================================
  // 4. MÓDULO SONHOS / COMPRAS
  // =========================================================================
  // SONHOS & COMPRAS PLANEJADAS (COM BUSCA DE IMAGENS E APORTES MENSAIS)
  // =========================================================================
  async fetchWebImage(query) {
    if (!query || !query.trim()) return '';
    const cleanQuery = query.trim()
      .replace(/^(comprar|comprar um|comprar uma|meu sonho|sonho de|meta)\s+/i, '');

    try {
      // 1. Tentar Wikipedia em Inglês (amplo acervo fotográfico de marcas, modelos como BMW X6, produtos)
      const resEn = await fetch(`https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&pithumbsize=600&generator=search&gsrsearch=${encodeURIComponent(cleanQuery)}&gsrlimit=3&origin=*`);
      if (resEn.ok) {
        const data = await resEn.json();
        if (data.query && data.query.pages) {
          const pages = Object.values(data.query.pages);
          pages.sort((a, b) => (a.index || 99) - (b.index || 99));
          for (const page of pages) {
            if (page.thumbnail && page.thumbnail.source) {
              return page.thumbnail.source;
            }
          }
        }
      }

      // 2. Tentar Wikimedia Commons (arquivos diretos de fotos)
      const resCommons = await fetch(`https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(cleanQuery)}&gsrlimit=3&prop=imageinfo&iiprop=url&iiurlwidth=600&format=json&origin=*`);
      if (resCommons.ok) {
        const data = await resCommons.json();
        if (data.query && data.query.pages) {
          const pages = Object.values(data.query.pages);
          for (const page of pages) {
            if (page.imageinfo && page.imageinfo[0] && page.imageinfo[0].thumburl) {
              return page.imageinfo[0].thumburl;
            }
          }
        }
      }

      // 3. Fallback inteligente com renderização fotográfica
      return `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanQuery + ' product realistic photography')}?width=600&height=400&nologo=true`;
    } catch (e) {
      console.warn('[Sonhos] Aviso na busca de imagem:', e);
      return `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanQuery + ' product realistic photography')}?width=600&height=400&nologo=true`;
    }
  },

  async autoBuscarFotoSonho() {
    const titleInput = document.getElementById('dream_title');
    const previewContainer = document.getElementById('dreamImagePreviewContainer');
    const previewImg = document.getElementById('dreamImagePreview');
    const statusText = document.getElementById('dreamImageStatus');
    const hiddenUrl = document.getElementById('dream_image_url');

    if (!titleInput || !titleInput.value.trim()) return;
    const query = titleInput.value.trim();

    if (previewContainer) previewContainer.style.display = 'block';
    if (statusText) statusText.textContent = '🔍 Procurando foto na web...';

    const imgUrl = await this.fetchWebImage(query);
    if (imgUrl) {
      if (previewImg) previewImg.src = imgUrl;
      if (hiddenUrl) hiddenUrl.value = imgUrl;
      if (statusText) statusText.textContent = '✨ Foto encontrada na web!';
    } else {
      if (statusText) statusText.textContent = 'Não encontramos foto automática. Você pode colar um link.';
    }
  },

  toggleDreamCustomImage() {
    const div = document.getElementById('dreamCustomImageDiv');
    if (div) {
      div.style.display = div.style.display === 'none' ? 'block' : 'none';
      if (div.style.display === 'block') {
        const inp = document.getElementById('dream_custom_image_url');
        if (inp) inp.focus();
      }
    }
  },

  setDreamCustomImage(url) {
    if (!url || !url.trim()) return;
    const previewImg = document.getElementById('dreamImagePreview');
    const hiddenUrl = document.getElementById('dream_image_url');
    const statusText = document.getElementById('dreamImageStatus');

    if (previewImg) previewImg.src = url.trim();
    if (hiddenUrl) hiddenUrl.value = url.trim();
    if (statusText) statusText.textContent = '🔗 Imagem personalizada definida!';
  },

  async promptAlterarFotoSonho(dreamId) {
    const dream = store.data.dreams.find(d => d.id === dreamId);
    if (!dream) return;

    const opc = prompt(`Alterar foto de "${dream.title}":\nDigite o termo para buscar na web ou cole a URL direta da imagem:`, dream.title);
    if (opc === null || !opc.trim()) return;

    let novaUrl = opc.trim();
    if (!novaUrl.startsWith('http://') && !novaUrl.startsWith('https://')) {
      this.showToast('🔍 Buscando foto na web...', 'info');
      novaUrl = await this.fetchWebImage(novaUrl);
    }

    if (novaUrl) {
      store.updateDreamImage(dreamId, novaUrl);
      this.renderSonhos();
      this.showToast('Foto do objetivo atualizada com sucesso!', 'success');
    }
  },

  renderSonhos() {
    const grid = document.getElementById('dreamsGrid');
    if (!grid) return;

    grid.innerHTML = store.data.dreams.length === 0 ? `
      <div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 3.5rem 1rem; background: var(--bg-surface); border-radius: var(--radius-lg); border: 1px dashed var(--border-strong);">
        <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🌟</div>
        <h4 style="font-weight: 700; color: var(--navy); margin-bottom: 0.35rem;">Nenhum sonho ou meta cadastrada ainda</h4>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1.25rem;">
          Cadastre objetivos como Carro, Casa, Viagem ou Equipamentos. O sistema busca fotos na internet e abate seus lançamentos guardados do valor faltante!
        </p>
        <button class="btn-primary" style="width: auto; padding: 0.5rem 1.25rem;" onclick="app.openModal('modalNovoSonho')">
          + Cadastrar Primeiro Sonho
        </button>
      </div>
    ` : store.data.dreams.map(d => {
      // Auto-migração para garantir que sonhos pré-existentes com saldo guardado tenham histórico registrado
      if ((!Array.isArray(d.deposits) || d.deposits.length === 0) && Number(d.saved) > 0) {
        d.deposits = [{
          id: 'dep_init_' + d.id,
          date: new Date().toISOString().split('T')[0],
          value: Number(d.saved),
          notes: 'Valor guardado'
        }];
        store.save();
      }

      const target = Number(d.value) || 1;
      const deposits = Array.isArray(d.deposits) ? d.deposits : [];
      const saved = deposits.length > 0 
        ? deposits.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0)
        : (Number(d.saved) || 0);

      const remaining = Math.max(0, target - saved);
      const pct = Math.min(100, Math.round((saved / target) * 100));
      const defaultImg = `https://image.pollinations.ai/prompt/${encodeURIComponent(d.title + ' realistic product photography')}?width=600&height=350&nologo=true`;
      const displayImg = d.imageUrl || defaultImg;

      // Monta histórico de lançamentos com data e valor
      let historicoCardHtml = '';
      if (deposits.length === 0) {
        historicoCardHtml = `
          <div style="font-size:0.75rem; color:var(--text-muted); text-align:center; padding:0.4rem 0;">
            Nenhum valor lançado ainda.
          </div>
        `;
      } else {
        const sorted = [...deposits].reverse();
        historicoCardHtml = sorted.map(dep => `
          <div class="dream-card-history-row">
            <span class="dream-history-date">📅 ${formatDateBR(dep.date)}</span>
            <span class="dream-history-note" title="${escapeHtml(dep.notes || 'Lançamento')}">${escapeHtml(dep.notes || 'Lançamento')}</span>
            <strong class="dream-history-val">+ ${formatBRL(dep.value)}</strong>
          </div>
        `).join('');
      }

      return `
        <div class="dream-card">
          <div class="dream-card-body">
            <!-- Topo: Foto Pequena Redimensionada + Título + Meta + Botão Excluir -->
            <div class="dream-header-row">
              <div class="dream-thumb-box">
                <img src="${escapeHtml(displayImg)}" alt="${escapeHtml(d.title)}" class="dream-thumb-img" onerror="this.onerror=null; this.src='${defaultImg}'">
                <button type="button" class="dream-btn-photo-mini" onclick="app.promptAlterarFotoSonho('${d.id}')" title="Trocar foto">
                  📷
                </button>
              </div>

              <div class="dream-header-info">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:0.4rem;">
                  <h4 class="dream-card-title">${escapeHtml(d.title)}</h4>
                  <button class="btn-table-icon delete" style="width:26px; height:26px; flex-shrink:0;" title="Excluir Sonho" onclick="app.deleteDream('${d.id}')">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  </button>
                </div>
                <div class="dream-badge-meta">
                  <span>📅 Meta:</span> <strong>${formatDateBR(d.targetDate)}</strong>
                </div>
              </div>
            </div>

            <!-- Barra de Progresso com Porcentagem -->
            <div style="margin: 0.35rem 0 0.85rem 0;">
              <div style="display:flex; justify-content:space-between; font-size:0.8rem; margin-bottom:0.35rem;">
                <span style="color:var(--text-secondary); font-weight:600;">Progresso da Meta</span>
                <span style="font-weight:800; color:${pct >= 100 ? '#10b981' : '#3b82f6'};">${pct}%</span>
              </div>
              <div style="height: 10px; background-color: var(--bg-surface-alt); border-radius: 999px; overflow:hidden; border: 1px solid var(--border-light);">
                <div style="height:100%; width:${pct}%; background:${pct >= 100 ? 'linear-gradient(90deg, #10b981, #059669)' : 'linear-gradient(90deg, #3b82f6, #10b981)'}; border-radius:999px; transition: width 0.4s ease;"></div>
              </div>
            </div>

            <!-- Estatísticas Financeiras: Guardado e Faltam em destaque -->
            <div class="dream-stat-grid">
              <div class="dream-stat-box">
                <span class="dream-stat-label">Total Guardado</span>
                <span class="dream-stat-value saved">${formatBRL(saved)}</span>
              </div>
              <div class="dream-stat-box" style="text-align:right;">
                <span class="dream-stat-label">Falta Guardar</span>
                <span class="dream-stat-value remaining">${formatBRL(remaining)}</span>
              </div>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.78rem; color:var(--text-muted); padding: 0 0.2rem;">
              <span>Objetivo Final: <strong>${formatBRL(target)}</strong></span>
              <span>${deposits.length} lançamento(s)</span>
            </div>

            <!-- Histórico de Valores Lançados e Datas -->
            <div class="dream-card-history-section">
              <div class="dream-card-history-header" onclick="app.toggleDreamHistory('${d.id}')">
                <span>📋 Histórico de Lançamentos (${deposits.length})</span>
                <span id="dreamHistIcon_${d.id}" style="font-size:0.72rem; color:var(--text-muted);">▾</span>
              </div>
              <div id="dreamHistList_${d.id}" class="dream-card-history-list">
                ${historicoCardHtml}
              </div>
            </div>

            <!-- Botão de Ação: Lançar Valor Guardado -->
            <button class="btn-header primary" style="width:100%; justify-content:center; padding: 0.55rem 1rem; font-weight:700;" onclick="app.openModalAporte('${d.id}')">
              💰 + Lançar Valor Guardado
            </button>
          </div>
        </div>
      `;
    }).join('');
  },

  toggleDreamHistory(dreamId) {
    const list = document.getElementById(`dreamHistList_${dreamId}`);
    const icon = document.getElementById(`dreamHistIcon_${dreamId}`);
    if (list) {
      const isHidden = list.style.display === 'none';
      list.style.display = isHidden ? 'flex' : 'none';
      if (icon) icon.textContent = isHidden ? '▾' : '▸';
    }
  },

  openModalAporte(dreamId) {
    const dream = store.data.dreams.find(d => d.id === dreamId);
    if (!dream) return;

    const modal = document.getElementById('modalAporteSonho');
    if (!modal) return;

    document.getElementById('aporte_dream_id').value = dream.id;
    document.getElementById('aporteModalSubtitle').textContent = `🎯 Objetivo: ${dream.title}`;

    // Preenche data com o dia de hoje
    const today = this.getTodayISO();
    document.getElementById('aporte_date').value = today;
    document.getElementById('aporte_val').value = '';
    document.getElementById('aporte_notes').value = '';

    this.renderAporteModalContent(dream.id);
    this.openModal('modalAporteSonho');
  },

  renderAporteModalContent(dreamId) {
    const dream = store.data.dreams.find(d => d.id === dreamId);
    if (!dream) return;

    const target = Number(dream.value) || 0;
    const deposits = Array.isArray(dream.deposits) ? dream.deposits : [];
    const saved = deposits.length > 0 
      ? deposits.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0)
      : (Number(dream.saved) || 0);

    const remaining = Math.max(0, target - saved);
    const pct = Math.min(100, Math.round((saved / (target || 1)) * 100));

    // Resumo
    const summaryEl = document.getElementById('aporteModalSummary');
    if (summaryEl) {
      summaryEl.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.75rem;">
          <div>
            <span style="font-size:0.72rem; text-transform:uppercase; letter-spacing:0.05em; color:var(--text-muted);">Meta Total</span>
            <div style="font-size:1.05rem; font-weight:800; color:var(--text-white);">${formatBRL(target)}</div>
          </div>
          <div style="text-align:center;">
            <span style="font-size:0.72rem; text-transform:uppercase; letter-spacing:0.05em; color:var(--text-muted);">Total Guardado</span>
            <div style="font-size:1.05rem; font-weight:800; color:#34d399;">${formatBRL(saved)}</div>
          </div>
          <div style="text-align:right;">
            <span style="font-size:0.72rem; text-transform:uppercase; letter-spacing:0.05em; color:#f87171;">Falta Guardar</span>
            <div style="font-size:1.15rem; font-weight:900; color:#fb923c;">${formatBRL(remaining)}</div>
          </div>
        </div>
        <div>
          <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:var(--text-muted); margin-bottom:0.25rem;">
            <span>Concluído: <strong>${pct}%</strong></span>
            <span>${pct >= 100 ? '🎉 META ALCANÇADA!' : `Faltam ${formatBRL(remaining)}`}</span>
          </div>
          <div style="height:8px; background:var(--bg-surface); border-radius:999px; overflow:hidden;">
            <div style="height:100%; width:${pct}%; background:${pct >= 100 ? '#10b981' : 'linear-gradient(90deg, #3b82f6, #10b981)'}; border-radius:999px;"></div>
          </div>
        </div>
      `;
    }

    // Lista de Histórico
    const counterEl = document.getElementById('aporteHistoricoContador');
    if (counterEl) counterEl.textContent = `${deposits.length} lançamento(s)`;

    const listaEl = document.getElementById('aporteHistoricoLista');
    if (listaEl) {
      if (deposits.length === 0) {
        listaEl.innerHTML = `
          <div style="text-align:center; padding:1.5rem; color:var(--text-muted); font-size:0.85rem; background:var(--bg-surface-alt); border-radius:var(--radius-sm);">
            Nenhum lançamento guardado ainda. Lance seu primeiro valor acima!
          </div>
        `;
      } else {
        const sorted = [...deposits].reverse();
        listaEl.innerHTML = sorted.map(dep => `
          <div class="dream-deposit-item">
            <div style="display:flex; align-items:center; gap:0.65rem;">
              <span style="background:rgba(16,185,129,0.15); color:#34d399; font-weight:700; font-size:0.72rem; padding:0.2rem 0.45rem; border-radius:4px;">
                ${formatDateBR(dep.date)}
              </span>
              <span style="color:var(--text-primary); font-size:0.82rem;">
                ${escapeHtml(dep.notes || 'Lançamento')}
              </span>
            </div>
            <div style="display:flex; align-items:center; gap:0.65rem;">
              <strong style="color:#34d399; font-size:0.9rem;">+ ${formatBRL(dep.value)}</strong>
              <button type="button" class="btn-table-icon delete" style="width:22px; height:22px;" title="Excluir lançamento" onclick="app.deleteAporte('${dream.id}', '${dep.id}')">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            </div>
          </div>
        `).join('');
      }
    }
  },

  deleteAporte(dreamId, depositId) {
    if (confirm('Deseja excluir este lançamento guardado? O saldo faltante será recalculado.')) {
      store.deleteDreamDeposit(dreamId, depositId);
      this.renderAporteModalContent(dreamId);
      this.renderSonhos();
      this.showToast('Lançamento removido e saldo faltante recalculado.', 'info');
    }
  },

  deleteDream(id) {
    if (confirm('Deseja excluir esta meta/sonho?')) {
      store.deleteDream(id);
      this.renderSonhos();
      this.showToast('Sonho removido.', 'info');
    }
  },

  // =========================================================================
  // 5. MÓDULO BOMBEIRO COMUNITÁRIO (ESCALA 24x72 & RESSARCIMENTOS)
  // =========================================================================
  bombeiroCalState: {
    year: 2026,
    month: 9, // Outubro (0-indexed)
    filter: 'all'
  },
  currentModalShifts: [],

  getGuPorData(ano, mes, dia) {
    const bCfg = store.getSystemGroups()?.bombeiroConfig || {};
    const GUS = [
      { id: 'azul', nome: 'AZUL', responsavel: bCfg.guAzul || 'Moraes', cor: '#38bdf8', bg: 'rgba(56, 189, 248, 0.16)', border: 'rgba(56, 189, 248, 0.45)', icone: '🔵' },
      { id: 'amarela', nome: 'AMARELA', responsavel: bCfg.guAmarela || 'Lapa', cor: '#facc15', bg: 'rgba(250, 204, 21, 0.16)', border: 'rgba(250, 204, 21, 0.45)', icone: '🟡' },
      { id: 'verde', nome: 'VERDE', responsavel: bCfg.guVerde || 'Uitajuci', cor: '#4ade80', bg: 'rgba(74, 222, 128, 0.16)', border: 'rgba(74, 222, 128, 0.45)', icone: '🟢' },
      { id: 'vermelha', nome: 'VERMELHA', responsavel: bCfg.guVermelha || 'Búrigo', cor: '#f87171', bg: 'rgba(248, 113, 113, 0.16)', border: 'rgba(248, 113, 113, 0.45)', icone: '🔴' }
    ];
    // Âncora: 17 de Outubro de 2026 = AZUL (índice 0)
    const dtUtc = Date.UTC(parseInt(ano), parseInt(mes), parseInt(dia));
    const ancoraUtc = Date.UTC(2026, 9, 17);
    const diffDias = Math.round((dtUtc - ancoraUtc) / 86400000);
    const idx = ((diffDias % 4) + 4) % 4;
    return GUS[idx];
  },

  isJoturEscalado(ano, mes, dia) {
    const dt = new Date(ano, mes, dia);
    const dayOfWeek = dt.getDay(); // 0 = Domingo, 6 = Sábado
    if (dayOfWeek !== 0 && dayOfWeek !== 6) return false;

    // Encontra o Sábado deste final de semana
    const satUtc = dayOfWeek === 6
      ? Date.UTC(ano, mes, dia)
      : Date.UTC(ano, mes, dia - 1);

    // Âncora: Sábado 17/10/2026
    const ancoraSatUtc = Date.UTC(2026, 9, 17);
    const diffWeeks = Math.round((satUtc - ancoraSatUtc) / (7 * 86400000));
    const cycleIndex = ((diffWeeks % 2) + 2) % 2;

    // cycleIndex === 0: Sábado tem JOTUR
    // cycleIndex === 1: Domingo tem JOTUR
    if (cycleIndex === 0 && dayOfWeek === 6) return true;
    if (cycleIndex === 1 && dayOfWeek === 0) return true;
    return false;
  },

  prevBombeiroMonth() {
    this.bombeiroCalState.month--;
    if (this.bombeiroCalState.month < 0) {
      this.bombeiroCalState.month = 11;
      this.bombeiroCalState.year--;
    }
    this.renderBombeiroEscala();
  },

  nextBombeiroMonth() {
    this.bombeiroCalState.month++;
    if (this.bombeiroCalState.month > 11) {
      this.bombeiroCalState.month = 0;
      this.bombeiroCalState.year++;
    }
    this.renderBombeiroEscala();
  },

  todayBombeiroMonth() {
    const now = new Date();
    this.bombeiroCalState.year = now.getFullYear();
    this.bombeiroCalState.month = now.getMonth();
    this.renderBombeiroEscala();
  },

  filterBombeiroGu(filter) {
    this.bombeiroCalState.filter = filter;
    this.renderBombeiroEscala();
  },

  renderBombeiroEscala() {
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const weekdays = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

    const today = new Date();
    const tYear = today.getFullYear();
    const tMonth = today.getMonth();
    const tDay = today.getDate();

    // 1. Destaque do Plantão de Hoje
    const cardHoje = document.getElementById('cardPlantaoHoje');
    if (cardHoje) {
      const guHoje = this.getGuPorData(tYear, tMonth, tDay);
      const joturHoje = this.isJoturEscalado(tYear, tMonth, tDay);

      // Próximas 3 guarnições
      let proxHtml = '';
      for (let i = 1; i <= 3; i++) {
        const proxDt = new Date(tYear, tMonth, tDay + i);
        const pY = proxDt.getFullYear();
        const pM = proxDt.getMonth();
        const pD = proxDt.getDate();
        const pGu = this.getGuPorData(pY, pM, pD);
        const pJotur = this.isJoturEscalado(pY, pM, pD);
        const labelQuando = i === 1 ? 'Amanhã' : (i === 2 ? 'Segunda' : weekdays[proxDt.getDay()].split('-')[0]);

        proxHtml += `
          <div class="bombeiro-next-pill" style="border-color:${pGu.border};">
            <span style="color:#94a3b8; font-size:0.7rem; font-weight:700;">${labelQuando} (${String(pD).padStart(2,'0')}/${String(pM+1).padStart(2,'0')})</span>
            <span style="color:${pGu.cor}; font-weight:800;">${pGu.icone} ${pGu.nome}</span>
            <span style="color:#cbd5e1; font-size:0.68rem;">${pGu.responsavel}</span>
            ${pJotur ? '<span class="legend-tag-jotur" style="margin-top:2px;">🚌 JOTUR</span>' : ''}
          </div>
        `;
      }

      cardHoje.style.borderLeftColor = guHoje.cor;
      cardHoje.innerHTML = `
        <div class="bombeiro-today-main">
          <div class="bombeiro-today-tag">
            <span>🔥 PLANTÃO DE HOJE</span>
            <span>•</span>
            <span>${weekdays[today.getDay()]}, ${String(tDay).padStart(2,'0')} de ${monthNames[tMonth]} de ${tYear}</span>
          </div>
          <div class="bombeiro-today-title" style="color:${guHoje.cor};">
            <span>${guHoje.icone} GU ${guHoje.nome}</span>
            <span style="font-size:1.05rem; color:#fff; font-weight:600;">(Coordenação: ${guHoje.responsavel})</span>
            ${joturHoje ? '<span class="bombeiro-jotur-badge" style="font-size:0.8rem; padding:0.25rem 0.6rem;">🚌 ESCALA JOTUR HOJE</span>' : ''}
          </div>
        </div>
        <div style="display:flex; flex-direction:column; gap:0.4rem;">
          <span style="font-size:0.72rem; font-weight:700; color:#94a3b8; text-transform:uppercase;">Próximas Escalas:</span>
          <div class="bombeiro-next-list">
            ${proxHtml}
          </div>
        </div>
      `;
    }

    // 2. Título Mês / Ano
    const labelMonth = document.getElementById('bombeiroCalMonthLabel');
    if (labelMonth) {
      labelMonth.textContent = `${monthNames[this.bombeiroCalState.month]} de ${this.bombeiroCalState.year}`;
    }

    // 3. Atualiza Botões de Filtro
    document.querySelectorAll('.bombeiro-filter-btn').forEach(btn => {
      if (btn.dataset.filter === this.bombeiroCalState.filter) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // 4. Mapeamento de Plantões do Usuário (Disponíveis e Contemplados)
    const shiftsMap = {};
    if (typeof store.getAllFirefighterShifts === 'function') {
      const allShifts = store.getAllFirefighterShifts();
      allShifts.forEach(s => {
        if (!shiftsMap[s.date]) shiftsMap[s.date] = [];
        shiftsMap[s.date].push(s);
      });
    }

    // 5. Grade do Calendário
    const grid = document.getElementById('bombeiroDaysGrid');
    if (!grid) return;

    const calYear = this.bombeiroCalState.year;
    const calMonth = this.bombeiroCalState.month;
    const filter = this.bombeiroCalState.filter;

    const firstDayIndex = new Date(calYear, calMonth, 1).getDay(); // 0 = Dom, 6 = Sáb
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(calYear, calMonth, 0).getDate();

    let cellsHtml = '';

    // Dias do mês anterior
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const pDay = daysInPrevMonth - i;
      const pMonth = calMonth === 0 ? 11 : calMonth - 1;
      const pYear = calMonth === 0 ? calYear - 1 : calYear;
      const gu = this.getGuPorData(pYear, pMonth, pDay);
      const hasJotur = this.isJoturEscalado(pYear, pMonth, pDay);
      const pDayIso = `${pYear}-${String(pMonth + 1).padStart(2, '0')}-${String(pDay).padStart(2, '0')}`;
      const pShifts = shiftsMap[pDayIso] || [];
      const hasPContemplated = pShifts.some(s => s.contemplated);

      let pShiftsHtml = '';
      pShifts.forEach(s => {
        if (s.contemplated) {
          pShiftsHtml += `
            <div class="bombeiro-shift-pill ${s.period}" style="opacity:0.75;" title="Plantão Confirmado (+ R$ 125,00)">
              <span>${s.period === 'diurno' ? '☀️ Diurno' : '🌙 Noturno'}</span>
              <span class="shift-val">+ R$ 125</span>
            </div>
          `;
        } else {
          pShiftsHtml += `<div class="bombeiro-shift-pill pending" style="opacity:0.5;">⏱️ Disp: ${s.period === 'diurno' ? 'Diurno' : 'Noturno'}</div>`;
        }
      });

      cellsHtml += `
        <div class="bombeiro-day-cell other-month ${hasPContemplated ? 'has-contemplated' : ''}">
          ${hasPContemplated ? '<div class="bombeiro-plantao-banner" style="opacity:0.75;"><span class="plantao-star">⭐</span> MEU PLANTÃO</div>' : ''}
          <div class="bombeiro-day-header">
            <span class="bombeiro-day-num ${hasPContemplated ? 'plantao-day' : ''}" style="opacity:0.4;">${pDay}</span>
          </div>
          ${pShiftsHtml ? `<div class="bombeiro-shifts-wrap">${pShiftsHtml}</div>` : ''}
          <div class="bombeiro-gu-badge" style="background:${gu.bg}; border:1px dashed ${gu.border}; color:${gu.cor};">
            <span class="bombeiro-gu-line">${gu.icone} ${gu.nome}</span>
            <span class="bombeiro-gu-resp">(${gu.responsavel})</span>
          </div>
          ${hasJotur ? '<span class="legend-tag-jotur" style="opacity:0.5; font-size:0.6rem;">🚌 JOTUR</span>' : ''}
        </div>
      `;
    }

    // Dias do mês atual
    for (let day = 1; day <= daysInMonth; day++) {
      const gu = this.getGuPorData(calYear, calMonth, day);
      const hasJotur = this.isJoturEscalado(calYear, calMonth, day);
      const isToday = (tYear === calYear && tMonth === calMonth && tDay === day);

      const dayIso = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const myShifts = shiftsMap[dayIso] || [];
      const hasContemplated = myShifts.some(s => s.contemplated);

      let isFilteredOut = false;
      if (filter === 'jotur') {
        isFilteredOut = !hasJotur;
      } else if (filter === 'contemplados') {
        isFilteredOut = !hasContemplated;
      } else if (filter !== 'all') {
        isFilteredOut = (gu.id !== filter);
      }

      let myShiftsHtml = '';
      myShifts.forEach(s => {
        if (s.contemplated) {
          myShiftsHtml += `
            <div class="bombeiro-shift-pill ${s.period}" title="Plantão Contemplado (+ R$ 125,00)">
              <span>${s.period === 'diurno' ? '☀️ Diurno' : '🌙 Noturno'}</span>
              <span class="shift-val">+ R$ 125</span>
            </div>
          `;
        } else {
          myShiftsHtml += `
            <div class="bombeiro-shift-pill pending" title="Disponibilidade enviada (aguardando contemplação)">
              ⏱️ Disp: ${s.period === 'diurno' ? 'Diurno' : 'Noturno'}
            </div>
          `;
        }
      });

      cellsHtml += `
        <div class="bombeiro-day-cell ${isToday ? 'is-today' : ''} ${hasContemplated ? 'has-contemplated' : ''} ${isFilteredOut ? 'filtered-out' : ''}">
          ${hasContemplated ? '<div class="bombeiro-plantao-banner"><span class="plantao-star">⭐</span> MEU PLANTÃO</div>' : ''}
          <div class="bombeiro-day-header">
            <span class="bombeiro-day-num ${hasContemplated ? 'plantao-day' : ''}" style="${isToday ? 'color:#38bdf8; font-weight:800;' : ''}">${day}</span>
            ${isToday ? '<span class="bombeiro-today-badge">HOJE</span>' : ''}
          </div>
          ${myShiftsHtml ? `<div class="bombeiro-shifts-wrap">${myShiftsHtml}</div>` : ''}
          <div class="bombeiro-gu-badge" style="background:${gu.bg}; border:1px solid ${gu.border}; color:${gu.cor};">
            <span class="bombeiro-gu-line">${gu.icone} ${gu.nome}</span>
            <span class="bombeiro-gu-resp">(${gu.responsavel})</span>
          </div>
          ${hasJotur ? '<div class="bombeiro-jotur-badge">🚌 JOTUR</div>' : ''}
        </div>
      `;
    }

    // Dias do próximo mês para completar semanas
    const totalCellsSoFar = firstDayIndex + daysInMonth;
    const remainingCells = (7 - (totalCellsSoFar % 7)) % 7;
    for (let n = 1; n <= remainingCells; n++) {
      const nMonth = calMonth === 11 ? 0 : calMonth + 1;
      const nYear = calMonth === 11 ? calYear + 1 : calYear;
      const gu = this.getGuPorData(nYear, nMonth, n);
      const hasJotur = this.isJoturEscalado(nYear, nMonth, n);
      const nDayIso = `${nYear}-${String(nMonth + 1).padStart(2, '0')}-${String(n).padStart(2, '0')}`;
      const nShifts = shiftsMap[nDayIso] || [];
      const hasNContemplated = nShifts.some(s => s.contemplated);

      let nShiftsHtml = '';
      nShifts.forEach(s => {
        if (s.contemplated) {
          nShiftsHtml += `
            <div class="bombeiro-shift-pill ${s.period}" style="opacity:0.75;" title="Plantão Confirmado (+ R$ 125,00)">
              <span>${s.period === 'diurno' ? '☀️ Diurno' : '🌙 Noturno'}</span>
              <span class="shift-val">+ R$ 125</span>
            </div>
          `;
        } else {
          nShiftsHtml += `<div class="bombeiro-shift-pill pending" style="opacity:0.5;">⏱️ Disp: ${s.period === 'diurno' ? 'Diurno' : 'Noturno'}</div>`;
        }
      });

      cellsHtml += `
        <div class="bombeiro-day-cell other-month ${hasNContemplated ? 'has-contemplated' : ''}">
          ${hasNContemplated ? '<div class="bombeiro-plantao-banner" style="opacity:0.75;"><span class="plantao-star">⭐</span> MEU PLANTÃO</div>' : ''}
          <div class="bombeiro-day-header">
            <span class="bombeiro-day-num ${hasNContemplated ? 'plantao-day' : ''}" style="opacity:0.4;">${n}</span>
          </div>
          ${nShiftsHtml ? `<div class="bombeiro-shifts-wrap">${nShiftsHtml}</div>` : ''}
          <div class="bombeiro-gu-badge" style="background:${gu.bg}; border:1px dashed ${gu.border}; color:${gu.cor};">
            <span class="bombeiro-gu-line">${gu.icone} ${gu.nome}</span>
            <span class="bombeiro-gu-resp">(${gu.responsavel})</span>
          </div>
          ${hasJotur ? '<span class="legend-tag-jotur" style="opacity:0.5; font-size:0.6rem;">🚌 JOTUR</span>' : ''}
        </div>
      `;
    }

    grid.innerHTML = cellsHtml;
  },

  renderBombeiro() {
    this.renderBombeiroEscala();

    const tbody = document.getElementById('bombeiroTableBody');
    if (!tbody) return;

    const list = store.data.firefighterRecords;
    const totalPending = list.filter(r => r.status !== 'Pago').reduce((acc, r) => acc + (Number(r.amount) || 0), 0);
    const totalPaid = list.filter(r => r.status === 'Pago').reduce((acc, r) => acc + (Number(r.amount) || 0), 0);

    let totalContemplatedCount = 0;
    list.forEach(r => {
      totalContemplatedCount += (r.shifts || []).filter(s => s.contemplated).length;
    });

    const elPending = document.getElementById('bombeiroTotalPending');
    if (elPending) elPending.textContent = formatBRL(totalPending);

    const elPaid = document.getElementById('bombeiroTotalPaid');
    if (elPaid) elPaid.textContent = formatBRL(totalPaid);

    const elContemplated = document.getElementById('bombeiroTotalContemplated');
    if (elContemplated) {
      elContemplated.textContent = `${totalContemplatedCount} serviço${totalContemplatedCount === 1 ? '' : 's'}`;
    }

    tbody.innerHTML = list.length === 0 ? `
      <tr><td colspan="7" style="text-align:center; color: var(--text-muted); padding: 2rem;">Nenhum registro de disponibilidades do Bombeiro cadastrado. Clique no botão acima para lançar!</td></tr>
    ` : list.map(r => {
      const shifts = r.shifts || [];
      const diurnos = shifts.filter(s => s.period === 'diurno').length;
      const noturnos = shifts.filter(s => s.period === 'noturno').length;
      const cont = shifts.filter(s => s.contemplated);
      const isPaid = r.status === 'Pago';

      return `
        <tr>
          <td>
            <strong style="color:#fff; font-size:0.95rem;">${r.monthRef}</strong>
            <div style="font-size:0.72rem; color:var(--text-muted); margin-top:2px;">Envio: ${formatDateBR(r.dateRequested)}</div>
          </td>
          <td>
            <div style="font-size:0.85rem; font-weight:700; color:#fff;">${shifts.length} turno${shifts.length === 1 ? '' : 's'} informados</div>
            <div style="font-size:0.72rem; color:var(--text-muted); margin-top:2px;">
              ☀️ ${diurnos} Diurno${diurnos === 1 ? '' : 's'} • 🌙 ${noturnos} Noturno${noturnos === 1 ? '' : 's'}
            </div>
          </td>
          <td>
            <div style="display:flex; flex-direction:column; gap:0.25rem;">
              ${cont.length === 0 ? `
                <span style="color:var(--text-muted); font-size:0.8rem;">0 contemplados</span>
              ` : `
                <span style="color:#facc15; font-weight:800; font-size:0.92rem;">⭐ ${cont.length} serviço${cont.length === 1 ? '' : 's'}</span>
              `}
              <button class="btn-table-icon" style="font-size:0.72rem; padding:2px 8px; width:fit-content; background:rgba(250,204,21,0.12); color:#facc15; border:1px solid rgba(250,204,21,0.3);" title="Selecionar quais dias você foi contemplado" onclick="app.openModalNovoBombeiro('${r.id}')">
                ✏️ Selecionar Contemplados
              </button>
            </div>
          </td>
          <td>
            <div style="font-weight: 800; color: #4ade80; font-size: 1.1rem;">
              ${formatBRL(r.amount || 0)}
            </div>
            <div style="font-size:0.7rem; color:var(--text-muted);">
              (R$ 125,00 cada)
            </div>
          </td>
          <td>
            ${r.datePayment ? `<span style="color:#4ade80; font-weight:700; font-size:0.85rem;">${formatDateBR(r.datePayment)}</span>` : '<span style="color:var(--text-muted); font-size:0.8rem;">Aguardando</span>'}
          </td>
          <td>
            <button class="status-badge ${isPaid ? 'paid' : 'pending'}" style="cursor:pointer; border:none; font-weight:800; padding:0.4rem 0.85rem; font-size:0.78rem; transition:all 0.2s;" title="Clique para alternar entre Pendente e Pago" onclick="app.quickToggleBombeiroPago('${r.id}')">
              ${isPaid ? '✓ PAGO' : '⏳ PENDENTE'}
            </button>
          </td>
          <td>
            <div class="table-actions">
              <button class="btn-table-icon" title="Editar / Ver Detalhes" onclick="app.openModalNovoBombeiro('${r.id}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              </button>
              <button class="btn-table-icon delete" title="Excluir" onclick="app.deleteBombeiro('${r.id}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  openModalNovoBombeiro(editId) {
    const titleEl = document.getElementById('modalNovoBombeiroTitle');
    const idInput = document.getElementById('ff_record_id');
    const monthSel = document.getElementById('ff_month_sel');
    const yearSel = document.getElementById('ff_year_sel');
    const dateReq = document.getElementById('ff_date_req');
    const statusSel = document.getElementById('ff_status');
    const datePay = document.getElementById('ff_date_pay');

    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    if (editId) {
      const record = store.data.firefighterRecords.find(r => r.id === editId);
      if (!record) return;
      if (titleEl) titleEl.textContent = '🚒 Editar Disponibilidades & Contemplações';
      if (idInput) idInput.value = record.id;

      // Extrai mês e ano de record.monthRef (ex: "Novembro/2026" ou "11/2026")
      if (record.monthRef && record.monthRef.includes('/')) {
        const parts = record.monthRef.split('/');
        const mStr = parts[0].trim();
        const yStr = parts[1].trim();
        const mIdx = monthNames.findIndex(mn => mn.toLowerCase() === mStr.toLowerCase());
        if (mIdx >= 0 && monthSel) monthSel.value = String(mIdx + 1);
        else if (!isNaN(Number(mStr)) && monthSel) monthSel.value = String(Number(mStr));
        if (yearSel) yearSel.value = yStr;
      }

      if (dateReq) dateReq.value = record.dateRequested || this.getTodayISO();
      if (statusSel) statusSel.value = record.status || 'Pendente';
      if (datePay) datePay.value = record.datePayment || (record.status === 'Pago' ? this.getTodayISO() : '');
      this.currentModalShifts = JSON.parse(JSON.stringify(record.shifts || []));
    } else {
      if (titleEl) titleEl.textContent = '🚒 Disponibilidades do Bombeiro Comunitário';
      if (idInput) idInput.value = '';

      // Padrão: Mês seguinte
      const targetDt = new Date();
      targetDt.setMonth(targetDt.getMonth() + 1);
      const nextM = targetDt.getMonth() + 1;
      const nextY = targetDt.getFullYear();

      if (monthSel) monthSel.value = String(nextM);
      if (yearSel) yearSel.value = String(nextY);

      const todayStr = this.getTodayISO();
      if (dateReq) dateReq.value = todayStr;
      if (statusSel) statusSel.value = 'Pendente';
      if (datePay) datePay.value = '';

      this.currentModalShifts = [];
    }

    this.onBombeiroMonthYearChange();
    this.renderModalShiftsList();
    this.openModal('modalNovoBombeiro');
  },

  onBombeiroMonthYearChange() {
    const monthSel = document.getElementById('ff_month_sel');
    const yearSel = document.getElementById('ff_year_sel');
    const monthInput = document.getElementById('ff_month');
    const tempDate = document.getElementById('ff_temp_date');

    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    const m = monthSel ? parseInt(monthSel.value) : 11;
    const y = yearSel ? parseInt(yearSel.value) : 2026;

    if (monthInput) {
      monthInput.value = `${monthNames[m - 1]}/${y}`;
    }

    // Pré-configura a data padrão para o primeiro dia do mês selecionado
    if (tempDate) {
      const curVal = tempDate.value;
      if (!curVal || !curVal.startsWith(`${y}-${String(m).padStart(2, '0')}`)) {
        tempDate.value = `${y}-${String(m).padStart(2, '0')}-01`;
      }
    }
  },

  onBombeiroModalStatusChange() {
    const statusSel = document.getElementById('ff_status');
    const datePay = document.getElementById('ff_date_pay');
    if (!statusSel || !datePay) return;

    if (statusSel.value === 'Pago' && !datePay.value) {
      datePay.value = this.getTodayISO();
    } else if (statusSel.value === 'Pendente') {
      datePay.value = '';
    }
  },

  addShiftToModalList() {
    const tempDate = document.getElementById('ff_temp_date');
    const tempPeriod = document.getElementById('ff_temp_period');
    if (!tempDate || !tempDate.value) {
      this.showToast('Selecione uma data para adicionar a disponibilidade.', 'warning');
      return;
    }

    const dateVal = tempDate.value;
    const periodVal = tempPeriod ? tempPeriod.value : 'diurno';

    // Evita duplicidade
    const exists = this.currentModalShifts.some(s => s.date === dateVal && s.period === periodVal);
    if (exists) {
      this.showToast('Este dia e turno já foram adicionados na lista.', 'warning');
      return;
    }

    this.currentModalShifts.push({
      id: 'sh_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      date: dateVal,
      period: periodVal,
      contemplated: false
    });

    // Ordena por data
    this.currentModalShifts.sort((a, b) => a.date.localeCompare(b.date));
    this.renderModalShiftsList();
    this.showToast('Dia adicionado à lista!', 'success');
  },

  toggleModalShiftContemplated(shiftId) {
    const shift = this.currentModalShifts.find(s => s.id === shiftId);
    if (shift) {
      shift.contemplated = !shift.contemplated;
      this.renderModalShiftsList();
    }
  },

  removeModalShift(shiftId) {
    this.currentModalShifts = this.currentModalShifts.filter(s => s.id !== shiftId);
    this.renderModalShiftsList();
  },

  renderModalShiftsList() {
    const container = document.getElementById('ff_shifts_container');
    const lblTotal = document.getElementById('lblModalTotalShifts');
    const lblCont = document.getElementById('lblModalContemplated');
    const lblAmount = document.getElementById('lblModalTotalAmount');

    if (!container) return;

    const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    if (this.currentModalShifts.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding:1.25rem; color:#94a3b8; font-size:0.82rem; border:1px dashed var(--border-light); border-radius:6px; background:rgba(255,255,255,0.02);">
          Nenhum dia adicionado ainda. Escolha o dia e o turno acima e clique em <strong>+ Adicionar Dia</strong>.
        </div>
      `;
    } else {
      container.innerHTML = this.currentModalShifts.map(s => {
        const parts = s.date.split('-');
        let wd = '';
        if (parts.length === 3) {
          const dt = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
          wd = weekdays[dt.getDay()];
        }
        const dateBR = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : s.date;

        return `
          <div class="modal-shift-item ${s.contemplated ? 'contemplated' : ''}">
            <div class="modal-shift-info">
              <span class="modal-shift-date">📅 ${dateBR} (${wd})</span>
              <span class="modal-shift-period ${s.period}">
                ${s.period === 'diurno' ? '☀️ Diurno (07h às 19h)' : '🌙 Noturno (19h às 07h)'}
              </span>
              ${s.contemplated ? '<span class="modal-shift-val-badge">⭐ Contemplado (+ R$ 125,00)</span>' : '<span style="font-size:0.75rem; color:#94a3b8;">(Aguardando)</span>'}
            </div>
            <div style="display:flex; align-items:center; gap:0.5rem;">
              <button type="button" class="btn-shift-toggle ${s.contemplated ? 'active' : ''}" onclick="app.toggleModalShiftContemplated('${s.id}')">
                ${s.contemplated ? '✓ Contemplado' : 'Marcar Contemplado'}
              </button>
              <button type="button" class="btn-table-icon delete" style="padding:4px 6px;" title="Remover" onclick="app.removeModalShift('${s.id}')">
                ✕
              </button>
            </div>
          </div>
        `;
      }).join('');
    }

    const totalCount = this.currentModalShifts.length;
    const contCount = this.currentModalShifts.filter(s => s.contemplated).length;
    const totalAmount = contCount * 125.00;

    if (lblTotal) lblTotal.textContent = totalCount;
    if (lblCont) lblCont.textContent = `${contCount} serviço${contCount === 1 ? '' : 's'}`;
    if (lblAmount) lblAmount.textContent = formatBRL(totalAmount);
  },

  quickToggleBombeiroPago(id) {
    const item = store.data.firefighterRecords.find(r => r.id === id);
    if (!item) return;

    if (item.status === 'Pago') {
      store.updateFirefighterStatus(id, 'Pendente', '');
      this.showToast('Status alterado para PENDENTE.', 'info');
    } else {
      const todayStr = new Date().toISOString().split('T')[0];
      store.updateFirefighterStatus(id, 'Pago', todayStr);
      this.showToast('Ótimo! Registro marcado como PAGO.', 'success');
    }

    this.renderBombeiro();
    this.renderResumo();
  },

  deleteBombeiro(id) {
    if (confirm('Deseja excluir este registro de disponibilidades do Bombeiro?')) {
      store.deleteFirefighterRecord(id);
      this.renderBombeiro();
      this.renderResumo();
      this.showToast('Registro excluído com sucesso.', 'info');
    }
  },

  // =========================================================================
  // 6. MÓDULO CONTROLE DE CAIXA / TROCO JOTUR (BASE R$ 200,00)
  // =========================================================================
  calculateJotur() {
    const n100 = Number(document.getElementById('jt_n100')?.value) || 0;
    const n50  = Number(document.getElementById('jt_n50')?.value) || 0;
    const n20  = Number(document.getElementById('jt_n20')?.value) || 0;
    const n10  = Number(document.getElementById('jt_n10')?.value) || 0;
    const n5   = Number(document.getElementById('jt_n5')?.value) || 0;
    const n2   = Number(document.getElementById('jt_n2')?.value) || 0;

    const m100 = Number(document.getElementById('jt_m100')?.value) || 0;
    const m50  = Number(document.getElementById('jt_m50')?.value) || 0;
    const m25  = Number(document.getElementById('jt_m25')?.value) || 0;
    const m10  = Number(document.getElementById('jt_m10')?.value) || 0;

    // Subtotais
    const subN100 = n100 * 100;
    const subN50  = n50 * 50;
    const subN20  = n20 * 20;
    const subN10  = n10 * 10;
    const subN5   = n5 * 5;
    const subN2   = n2 * 2;

    const subM100 = m100 * 1.00;
    const subM50  = m50 * 0.50;
    const subM25  = m25 * 0.25;
    const subM10  = m10 * 0.10;

    // Atualiza subtotais na tela
    const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = formatBRL(val); };
    setTxt('sub_jt_n100', subN100);
    setTxt('sub_jt_n50', subN50);
    setTxt('sub_n20', subN20);
    setTxt('sub_n10', subN10);
    setTxt('sub_n5', subN5);
    setTxt('sub_n2', subN2);
    setTxt('sub_m100', subM100);
    setTxt('sub_m50', subM50);
    setTxt('sub_m25', subM25);
    setTxt('sub_m10', subM10);

    const totalCounted = subN100 + subN50 + subN20 + subN10 + subN5 + subN2 + subM100 + subM50 + subM25 + subM10;
    const baseAmount = store.data.jotur?.baseAmount || 200.00;
    const diff = totalCounted - baseAmount;

    const elTotal = document.getElementById('joturTotalCounted');
    if (elTotal) elTotal.textContent = formatBRL(totalCounted);

    const elBase = document.getElementById('joturBaseDisplay');
    if (elBase) elBase.textContent = formatBRL(baseAmount);

    const boxResult = document.getElementById('joturResultBox');
    const elResultTitle = document.getElementById('joturResultTitle');
    const elResultDiff = document.getElementById('joturResultDiff');

    if (boxResult && elResultTitle && elResultDiff) {
      boxResult.className = 'jotur-result-box';
      if (Math.abs(diff) < 0.009) {
        boxResult.classList.add('exato');
        elResultTitle.textContent = 'Caixa Exato (100% Conferido)';
        elResultTitle.style.color = 'var(--success)';
        elResultDiff.textContent = 'Diferença: R$ 0,00';
      } else if (diff > 0) {
        boxResult.classList.add('sobra');
        elResultTitle.textContent = 'Sobra de Caixa';
        elResultTitle.style.color = 'var(--success)';
        elResultDiff.textContent = `+ ${formatBRL(diff)}`;
      } else {
        boxResult.classList.add('falta');
        elResultTitle.textContent = 'Falta no Caixa';
        elResultTitle.style.color = 'var(--danger)';
        elResultDiff.textContent = `- ${formatBRL(Math.abs(diff))}`;
      }
    }

    return {
      totalCounted,
      diff,
      status: Math.abs(diff) < 0.009 ? 'Exato' : (diff > 0 ? 'Sobra' : 'Falta'),
      details: { n100, n50, n20, n10, n5, n2, m100, m50, m25, m10 }
    };
  },

  resetJoturInputs() {
    const ids = ['jt_n100', 'jt_n50', 'jt_n20', 'jt_n10', 'jt_n5', 'jt_n2', 'jt_m100', 'jt_m50', 'jt_m25', 'jt_m10'];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '0';
    });
    this.calculateJotur();
  },

  saveCurrentJotur() {
    const calc = this.calculateJotur();
    store.saveJoturCount(calc);
    this.resetJoturInputs();
    this.renderJotur();
    this.showToast('✅ Conferência salva no histórico! Caixas zeradas para a próxima conferência.', 'success');
  },

  renderJotur() {
    this.calculateJotur();
    this.renderJoturAnnualSummary();
    this.renderJoturHistory();
    this.renderJoturAccumulated();
  },

  renderJoturAnnualSummary() {
    const summary = store.getTrocoAnnualSummary('jotur');
    const elCount = document.getElementById('joturYearCount');
    if (elCount) elCount.textContent = `${summary.totalConferences} conferências`;

    const elSobras = document.getElementById('joturYearSobras');
    if (elSobras) elSobras.textContent = `+ ${formatBRL(summary.totalSobras)}`;

    const elFaltas = document.getElementById('joturYearFaltas');
    if (elFaltas) elFaltas.textContent = `- ${formatBRL(summary.totalFaltas)}`;

    const elBal = document.getElementById('joturYearBalance');
    if (elBal) {
      elBal.textContent = `${summary.netDifference >= 0 ? '+' : ''}${formatBRL(summary.netDifference)}`;
      elBal.style.color = summary.netDifference >= 0 ? '#34d399' : '#f87171';
    }
  },

  renderJoturHistory() {
    const tbody = document.getElementById('joturHistoryTableBody');
    if (!tbody) return;

    const list = store.data.jotur?.history || [];
    tbody.innerHTML = list.length === 0 ? `
      <tr><td colspan="5" style="text-align:center; color: var(--text-muted); padding: 1.5rem;">Nenhuma conferência salva no ano ativo.</td></tr>
    ` : list.map(h => {
      const dateFormatted = new Date(h.date).toLocaleString('pt-BR');
      return `
        <tr>
          <td>${dateFormatted}</td>
          <td>${formatBRL(h.baseAmount)}</td>
          <td><strong>${formatBRL(h.totalCounted)}</strong></td>
          <td>
            <span class="status-badge ${h.status === 'Exato' || h.status === 'Sobra' ? 'paid' : 'pending'}">
              ${h.status}: ${h.diff >= 0 ? '+' : ''}${formatBRL(h.diff)}
            </span>
          </td>
          <td>
            <button class="btn-table-icon delete" title="Excluir" onclick="app.deleteJoturHistory('${h.id}')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  },

  renderJoturAccumulated() {
    const tbody = document.getElementById('joturAccumulatedTableBody');
    if (!tbody) return;

    const list = store.data.jotur?.annualAccumulated || [];
    tbody.innerHTML = list.length === 0 ? `
      <tr><td colspan="7" style="text-align:center; color: var(--text-muted); padding: 1.5rem;">Nenhum acumulado de ano anterior fechado ainda. No final do ano, use "Zerar Planilha & Gravar no Acumulado do Ano" para arquivar o saldo aqui.</td></tr>
    ` : list.map(a => {
      const closedFormatted = new Date(a.closedAt).toLocaleString('pt-BR');
      const isPositive = a.netDifference >= 0;
      return `
        <tr>
          <td><strong style="font-size:1.05rem; color:#38bdf8;">${a.year}</strong></td>
          <td>${closedFormatted}</td>
          <td><strong>${a.totalConferences}</strong></td>
          <td style="color:#34d399; font-weight:700;">+ ${formatBRL(a.totalSobras || 0)}</td>
          <td style="color:#f87171; font-weight:700;">- ${formatBRL(a.totalFaltas || 0)}</td>
          <td>
            <span class="status-badge ${isPositive ? 'paid' : 'pending'}" style="font-size:0.9rem;">
              ${isPositive ? '+' : ''}${formatBRL(a.netDifference)} (${a.status})
            </span>
          </td>
          <td>
            <button class="btn-table-icon delete" title="Excluir Registro de Acumulado" onclick="app.deleteTrocoAnnualAccumulated('jotur', '${a.id}')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  },

  deleteJoturHistory(id) {
    store.deleteJoturHistory(id);
    this.renderJotur();
    this.showToast('Conferência removida do histórico.', 'info');
  },

  // =========================================================================
  // 6.1 MÓDULO CONTROLE DE TROCO MASTES (BASE R$ 400,00)
  // =========================================================================
  calculateMastes() {
    const n100 = Number(document.getElementById('ms_n100')?.value) || 0;
    const n50  = Number(document.getElementById('ms_n50')?.value) || 0;
    const n20  = Number(document.getElementById('ms_n20')?.value) || 0;
    const n10  = Number(document.getElementById('ms_n10')?.value) || 0;
    const n5   = Number(document.getElementById('ms_n5')?.value) || 0;
    const n2   = Number(document.getElementById('ms_n2')?.value) || 0;

    const m100 = Number(document.getElementById('ms_m100')?.value) || 0;
    const m50  = Number(document.getElementById('ms_m50')?.value) || 0;
    const m25  = Number(document.getElementById('ms_m25')?.value) || 0;
    const m10  = Number(document.getElementById('ms_m10')?.value) || 0;

    // Subtotais
    const subN100 = n100 * 100;
    const subN50  = n50 * 50;
    const subN20  = n20 * 20;
    const subN10  = n10 * 10;
    const subN5   = n5 * 5;
    const subN2   = n2 * 2;

    const subM100 = m100 * 1.00;
    const subM50  = m50 * 0.50;
    const subM25  = m25 * 0.25;
    const subM10  = m10 * 0.10;

    // Atualiza subtotais na tela
    const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = formatBRL(val); };
    setTxt('sub_ms_n100', subN100);
    setTxt('sub_ms_n50', subN50);
    setTxt('sub_ms_n20', subN20);
    setTxt('sub_ms_n10', subN10);
    setTxt('sub_ms_n5', subN5);
    setTxt('sub_ms_n2', subN2);
    setTxt('sub_ms_m100', subM100);
    setTxt('sub_ms_m50', subM50);
    setTxt('sub_ms_m25', subM25);
    setTxt('sub_ms_m10', subM10);

    const totalCounted = subN100 + subN50 + subN20 + subN10 + subN5 + subN2 + subM100 + subM50 + subM25 + subM10;
    const baseAmount = store.data.trocoMastes?.baseAmount || 400.00;
    const diff = totalCounted - baseAmount;

    const elTotal = document.getElementById('mastesTotalCounted');
    if (elTotal) elTotal.textContent = formatBRL(totalCounted);

    const elBase = document.getElementById('mastesBaseDisplay');
    if (elBase) elBase.textContent = formatBRL(baseAmount);

    const boxResult = document.getElementById('mastesResultBox');
    const elResultTitle = document.getElementById('mastesResultTitle');
    const elResultDiff = document.getElementById('mastesResultDiff');

    if (boxResult && elResultTitle && elResultDiff) {
      boxResult.className = 'jotur-result-box';
      if (Math.abs(diff) < 0.009) {
        boxResult.classList.add('exato');
        elResultTitle.textContent = 'Caixa Exato (100% Conferido)';
        elResultTitle.style.color = 'var(--success)';
        elResultDiff.textContent = 'Diferença: R$ 0,00';
      } else if (diff > 0) {
        boxResult.classList.add('sobra');
        elResultTitle.textContent = 'Sobra de Caixa';
        elResultTitle.style.color = 'var(--success)';
        elResultDiff.textContent = `+ ${formatBRL(diff)}`;
      } else {
        boxResult.classList.add('falta');
        elResultTitle.textContent = 'Falta no Caixa';
        elResultTitle.style.color = 'var(--danger)';
        elResultDiff.textContent = `- ${formatBRL(Math.abs(diff))}`;
      }
    }

    return {
      totalCounted,
      diff,
      status: Math.abs(diff) < 0.009 ? 'Exato' : (diff > 0 ? 'Sobra' : 'Falta'),
      details: { n100, n50, n20, n10, n5, n2, m100, m50, m25, m10 }
    };
  },

  resetMastesInputs() {
    const ids = ['ms_n100', 'ms_n50', 'ms_n20', 'ms_n10', 'ms_n5', 'ms_n2', 'ms_m100', 'ms_m50', 'ms_m25', 'ms_m10'];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '0';
    });
    this.calculateMastes();
  },

  saveCurrentMastes() {
    const calc = this.calculateMastes();
    store.saveMastesCount(calc);
    this.resetMastesInputs();
    this.renderMastes();
    this.showToast('✅ Conferência Mastes salva no histórico! Caixas zeradas para a próxima conferência.', 'success');
  },

  renderMastes() {
    this.calculateMastes();
    this.renderMastesAnnualSummary();
    this.renderMastesHistory();
    this.renderMastesAccumulated();
  },

  renderMastesAnnualSummary() {
    const summary = store.getTrocoAnnualSummary('mastes');
    const elCount = document.getElementById('mastesYearCount');
    if (elCount) elCount.textContent = `${summary.totalConferences} conferências`;

    const elSobras = document.getElementById('mastesYearSobras');
    if (elSobras) elSobras.textContent = `+ ${formatBRL(summary.totalSobras)}`;

    const elFaltas = document.getElementById('mastesYearFaltas');
    if (elFaltas) elFaltas.textContent = `- ${formatBRL(summary.totalFaltas)}`;

    const elBal = document.getElementById('mastesYearBalance');
    if (elBal) {
      elBal.textContent = `${summary.netDifference >= 0 ? '+' : ''}${formatBRL(summary.netDifference)}`;
      elBal.style.color = summary.netDifference >= 0 ? '#34d399' : '#f87171';
    }
  },

  renderMastesHistory() {
    const tbody = document.getElementById('mastesHistoryTableBody');
    if (!tbody) return;

    const list = store.data.trocoMastes?.history || [];
    tbody.innerHTML = list.length === 0 ? `
      <tr><td colspan="5" style="text-align:center; color: var(--text-muted); padding: 1.5rem;">Nenhuma conferência Mastes salva no ano ativo.</td></tr>
    ` : list.map(h => {
      const dateFormatted = new Date(h.date).toLocaleString('pt-BR');
      return `
        <tr>
          <td>${dateFormatted}</td>
          <td>${formatBRL(h.baseAmount)}</td>
          <td><strong>${formatBRL(h.totalCounted)}</strong></td>
          <td>
            <span class="status-badge ${h.status === 'Exato' || h.status === 'Sobra' ? 'paid' : 'pending'}">
              ${h.status}: ${h.diff >= 0 ? '+' : ''}${formatBRL(h.diff)}
            </span>
          </td>
          <td>
            <button class="btn-table-icon delete" title="Excluir" onclick="app.deleteMastesHistory('${h.id}')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  },

  renderMastesAccumulated() {
    const tbody = document.getElementById('mastesAccumulatedTableBody');
    if (!tbody) return;

    const list = store.data.trocoMastes?.annualAccumulated || [];
    tbody.innerHTML = list.length === 0 ? `
      <tr><td colspan="7" style="text-align:center; color: var(--text-muted); padding: 1.5rem;">Nenhum acumulado de ano anterior fechado ainda. No final do ano, use "Zerar Planilha & Gravar no Acumulado do Ano" para arquivar o saldo aqui.</td></tr>
    ` : list.map(a => {
      const closedFormatted = new Date(a.closedAt).toLocaleString('pt-BR');
      const isPositive = a.netDifference >= 0;
      return `
        <tr>
          <td><strong style="font-size:1.05rem; color:#60a5fa;">${a.year}</strong></td>
          <td>${closedFormatted}</td>
          <td><strong>${a.totalConferences}</strong></td>
          <td style="color:#34d399; font-weight:700;">+ ${formatBRL(a.totalSobras || 0)}</td>
          <td style="color:#f87171; font-weight:700;">- ${formatBRL(a.totalFaltas || 0)}</td>
          <td>
            <span class="status-badge ${isPositive ? 'paid' : 'pending'}" style="font-size:0.9rem;">
              ${isPositive ? '+' : ''}${formatBRL(a.netDifference)} (${a.status})
            </span>
          </td>
          <td>
            <button class="btn-table-icon delete" title="Excluir Registro de Acumulado" onclick="app.deleteTrocoAnnualAccumulated('mastes', '${a.id}')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  },

  deleteMastesHistory(id) {
    store.deleteMastesHistory(id);
    this.renderMastes();
    this.showToast('Conferência Mastes removida do histórico.', 'info');
  },

  // =========================================================================
  // ENCERRAMENTO ANUAL & ACUMULADO DO ANO (JOTUR / MASTES)
  // =========================================================================
  closeYearTroco(type = 'jotur') {
    const summary = store.getTrocoAnnualSummary(type);
    const label = type === 'mastes' ? 'CONTROLE DE TROCO MASTES (R$ 400)' : 'TROCO JOTUR (R$ 200)';
    const year = store.activeYear || new Date().getFullYear();

    if (summary.totalConferences === 0) {
      this.showToast(`Não há conferências salvas no ${label} para fechar o ano.`, 'warning');
      return;
    }

    const netText = `${summary.netDifference >= 0 ? '+' : ''}${formatBRL(summary.netDifference)} (${summary.status})`;
    const confirmMsg = `🗓️ FECHAMENTO DO ANO: ${label}\n\n` +
      `Ano Referência: ${year}\n` +
      `• Conferências Realizadas: ${summary.totalConferences}\n` +
      `• Total de Sobras (+): + ${formatBRL(summary.totalSobras)}\n` +
      `• Total de Faltas (-): - ${formatBRL(summary.totalFaltas)}\n` +
      `• SALDO ACUMULADO FINAL DO ANO: ${netText}\n\n` +
      `Ao confirmar este fechamento:\n` +
      `1. O saldo acumulado de ${netText} ficará gravado permanentemente no histórico de ACUMULADOS ANUAIS.\n` +
      `2. A planilha de conferências ativas será zerada para o novo ciclo.\n\n` +
      `Confirma o fechamento e registro no Acumulado do Ano?`;

    if (confirm(confirmMsg)) {
      const res = store.closeTrocoYear(type, year);
      if (res && res.success) {
        if (type === 'mastes') {
          this.renderMastes();
        } else {
          this.renderJotur();
        }
        this.showToast(`🎉 Fechamento concluído com sucesso! Saldo ${netText} arquivado no Acumulado do Ano.`, 'success');
      } else {
        this.showToast(res?.message || 'Erro ao fechar ano.', 'warning');
      }
    }
  },

  deleteTrocoAnnualAccumulated(type, id) {
    const label = type === 'mastes' ? 'Troco Mastes' : 'Troco Jotur';
    if (confirm(`Deseja excluir este registro de acumulado anual do ${label}?`)) {
      store.deleteTrocoAnnualAccumulated(type, id);
      if (type === 'mastes') this.renderMastes();
      else this.renderJotur();
      this.showToast('Registro de acumulado excluído com sucesso.', 'info');
    }
  },

  // =========================================================================
  // 7. MÓDULO INVESTIMENTOS (COM FILTROS DINÂMICOS E ANÁLISE DE FATORES)
  // =========================================================================
  getInvestFilterState() {
    const asset = document.getElementById('invFilterAsset')?.value || 'ALL';
    const assetType = document.getElementById('invFilterAssetType')?.value || 'ALL';
    const operation = document.getElementById('invFilterOperation')?.value || 'ALL';
    const year = document.getElementById('invFilterYear')?.value || 'ALL';
    const month = document.getElementById('invFilterMonth')?.value || 'ALL';
    const dateFrom = document.getElementById('invFilterDateFrom')?.value || '';
    const dateTo = document.getElementById('invFilterDateTo')?.value || '';
    const sort = document.getElementById('invFilterSort')?.value || 'date_desc';

    const isFiltered = (
      asset !== 'ALL' ||
      assetType !== 'ALL' ||
      operation !== 'ALL' ||
      year !== 'ALL' ||
      month !== 'ALL' ||
      dateFrom !== '' ||
      dateTo !== ''
    );

    return { asset, assetType, operation, year, month, dateFrom, dateTo, sort, isFiltered };
  },

  applyInvestFilters() {
    const filters = this.getInvestFilterState();
    // Se o usuário filtrou especificamente por RENDIMENTO, destaca as abas de rendimentos
    if (filters.operation === 'RENDIMENTO') {
      this.switchInvestStockTab('earnings');
      this.switchInvestNubankTab('earnings');
    } else if (filters.operation === 'APORTE') {
      const btnCons = document.getElementById('btnTabStocksConsolidated');
      if (!btnCons || !btnCons.classList.contains('active')) {
        this.switchInvestStockTab('positions');
      }
      this.switchInvestNubankTab('boxes');
    }
    this.renderInvestimentos();
  },

  resetInvestFilters() {
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val;
    };
    setVal('invFilterAsset', 'ALL');
    setVal('invFilterAssetType', 'ALL');
    setVal('invFilterOperation', 'ALL');
    setVal('invFilterYear', 'ALL');
    setVal('invFilterMonth', 'ALL');
    setVal('invFilterDateFrom', '');
    setVal('invFilterDateTo', '');
    setVal('invFilterSort', 'date_desc');
    this.renderInvestimentos();
  },

  quickFilterInvestAsset(assetVal, assetTypeVal = null) {
    const elAsset = document.getElementById('invFilterAsset');
    const elType = document.getElementById('invFilterAssetType');
    if (assetTypeVal && elType) {
      elType.value = (elType.value === assetTypeVal && assetVal === 'ALL') ? 'ALL' : assetTypeVal;
      if (elAsset) elAsset.value = 'ALL';
    } else if (elAsset) {
      // Se clicar no mesmo ativo que já está filtrado, volta para ALL
      const nextVal = (elAsset.value === assetVal && assetVal !== 'ALL') ? 'ALL' : assetVal;
      elAsset.value = nextVal;
      if (elType) {
        if (nextVal === 'NUBANK') elType.value = 'NUBANK';
        else if (nextVal === 'ALL') elType.value = 'ALL';
        else if (elType.value === 'NUBANK') elType.value = 'ALL';
      }
    }
    this.renderInvestimentos();
  },

  renderInvestimentos() {
    const allStocks = store.data.investments.stocks || [];
    const allStockEarnings = store.data.investments.stockEarnings || [];
    const allBoxes = store.data.investments.nubankBoxes || [];
    const allBoxEarnings = store.data.investments.nubankEarnings || [];
    const totalAllRecords = allStocks.length + allStockEarnings.length + allBoxes.length + allBoxEarnings.length;

    // Mapa de tipos por ticker (FII vs Ação)
    const tickerTypeMap = {};
    allStocks.forEach(s => {
      const t = (s.ticker || '').toUpperCase().trim();
      if (t) tickerTypeMap[t] = s.type || (t.endsWith('11') ? 'FII' : 'Ação');
    });
    allStockEarnings.forEach(e => {
      const t = (e.ticker || '').toUpperCase().trim();
      if (t && !tickerTypeMap[t]) tickerTypeMap[t] = t.endsWith('11') ? 'FII' : 'Ação';
    });

    const getTickerClass = (ticker, explicitType) => {
      const tp = (explicitType || tickerTypeMap[ticker] || '').toUpperCase();
      if (tp.includes('FII') || tp.includes('FIAGRO') || String(ticker).toUpperCase().endsWith('11')) {
        return 'FII';
      }
      return 'ACAO';
    };

    // Lista única de tickers ordenada por valor investido
    const rawTotalsByTicker = {};
    allStocks.forEach(s => {
      const t = (s.ticker || '').toUpperCase().trim();
      const val = Number(s.total) || (Number(s.shares) * Number(s.pricePerShare)) || 0;
      if (t) rawTotalsByTicker[t] = (rawTotalsByTicker[t] || 0) + val;
    });
    const allTickers = Object.keys(tickerTypeMap).sort((a, b) => (rawTotalsByTicker[b] || 0) - (rawTotalsByTicker[a] || 0));

    // Popula seletor de Ativo / Ticker mantendo seleção atual
    const selAsset = document.getElementById('invFilterAsset');
    if (selAsset) {
      const currentVal = selAsset.value || 'ALL';
      let optsHtml = `<option value="ALL">Todos os Ativos & Nubank (${allTickers.length} tickers + Nu)</option>`;
      optsHtml += `<optgroup label="Bolsa de Valores (B3)">`;
      allTickers.forEach(t => {
        const cls = getTickerClass(t) === 'FII' ? 'FII' : 'Ação';
        optsHtml += `<option value="${t}">${t} — ${cls}</option>`;
      });
      optsHtml += `</optgroup>`;
      optsHtml += `<optgroup label="Renda Fixa / Caixinhas">`;
      optsHtml += `<option value="NUBANK">💜 Nubank Investimento (Caixinhas)</option>`;
      optsHtml += `</optgroup>`;
      selAsset.innerHTML = optsHtml;
      if ([...selAsset.options].some(o => o.value === currentVal)) {
        selAsset.value = currentVal;
      }
    }

    // Popula seletor de Anos dinamicamente mantendo seleção atual
    const selYear = document.getElementById('invFilterYear');
    if (selYear) {
      const currYearVal = selYear.value || 'ALL';
      const yearsSet = new Set(['2026', '2025', '2024', '2023']);
      [...allStocks, ...allStockEarnings, ...allBoxes, ...allBoxEarnings].forEach(item => {
        if (item.date && item.date.length >= 4) yearsSet.add(item.date.substring(0, 4));
      });
      const sortedYears = [...yearsSet].sort((a, b) => b.localeCompare(a));
      selYear.innerHTML = `<option value="ALL">Todos os Anos (${sortedYears[sortedYears.length - 1]}–${sortedYears[0]})</option>` +
        sortedYears.map(y => `<option value="${y}">${y}</option>`).join('');
      if ([...selYear.options].some(o => o.value === currYearVal)) {
        selYear.value = currYearVal;
      }
    }

    const filters = this.getInvestFilterState();

    // Helper para identificar modalidade do guardado Nubank (Caixinha vs Dinheiro Separado)
    const getBoxCategory = (item) => {
      if (item && item.category) return item.category;
      const nm = String(item?.name || item?.boxName || '').toLowerCase();
      return (nm.includes('separado') || nm.includes('saldo separado')) ? 'Dinheiro Separado' : 'Caixinha';
    };

    // Renderiza Pílulas Rápidas de Ativos no topo do filtro
    const pillsContainer = document.getElementById('invQuickTickerPills');
    if (pillsContainer) {
      const makePill = (label, assetVal, typeVal = null, color = '#60a5fa') => {
        const isActive = typeVal
          ? (filters.assetType === typeVal && filters.asset === 'ALL')
          : (filters.asset === assetVal && (assetVal !== 'ALL' || filters.assetType === 'ALL'));
        const bg = isActive ? 'rgba(59, 130, 246, 0.28)' : 'rgba(30, 41, 59, 0.7)';
        const border = isActive ? color : 'rgba(148, 163, 184, 0.22)';
        const textCol = isActive ? '#ffffff' : '#cbd5e1';
        const clickArg = typeVal ? `'ALL', '${typeVal}'` : `'${assetVal}'`;
        return `<button type="button" onclick="app.quickFilterInvestAsset(${clickArg})" style="padding:0.28rem 0.7rem; border-radius:999px; font-size:0.75rem; font-weight:700; cursor:pointer; transition:all 0.15s; background:${bg}; border:1px solid ${border}; color:${textCol}; box-shadow:${isActive ? '0 0 12px rgba(59,130,246,0.3)' : 'none'};">${label}</button>`;
      };

      let pillsHtml = makePill('🌐 Todos', 'ALL', null, '#60a5fa');
      pillsHtml += makePill('🏢 Só FIIs', 'ALL', 'FII', '#34d399');
      pillsHtml += makePill('📈 Só Ações', 'ALL', 'ACAO', '#fbbf24');
      allTickers.forEach(t => {
        pillsHtml += makePill(t, t, null, '#38bdf8');
      });
      pillsHtml += makePill('💜 Nubank (Tudo)', 'NUBANK', null, '#c084fc');
      pillsHtml += makePill('📦 Caixinhas Nu', 'ALL', 'NUBANK_CAIXINHA', '#a855f7');
      pillsHtml += makePill('💵 Dinheiro Separado Nu', 'ALL', 'NUBANK_SEPARADO', '#38bdf8');
      pillsContainer.innerHTML = pillsHtml;
    }

    // Função auxiliar de filtro por data
    const matchesDate = (dateStr) => {
      if (!dateStr) return filters.year === 'ALL' && filters.month === 'ALL' && !filters.dateFrom && !filters.dateTo;
      const y = dateStr.substring(0, 4);
      const m = dateStr.substring(5, 7);
      if (filters.year !== 'ALL' && y !== filters.year) return false;
      if (filters.month !== 'ALL' && m !== filters.month) return false;
      if (filters.dateFrom && dateStr < filters.dateFrom) return false;
      if (filters.dateTo && dateStr > filters.dateTo) return false;
      return true;
    };

    const isNubankOnlyType = (tp) => tp === 'NUBANK' || tp === 'NUBANK_CAIXINHA' || tp === 'NUBANK_SEPARADO';

    // Filtragem dos 4 conjuntos de dados
    const filteredStocks = allStocks.filter(s => {
      if (filters.operation === 'RENDIMENTO') return false;
      const ticker = (s.ticker || '').toUpperCase().trim();
      const cls = getTickerClass(ticker, s.type);
      if (isNubankOnlyType(filters.assetType)) return false;
      if (filters.assetType === 'FII' && cls !== 'FII') return false;
      if (filters.assetType === 'ACAO' && cls !== 'ACAO') return false;
      if (filters.asset !== 'ALL' && filters.asset !== ticker) return false;
      return matchesDate(s.date);
    });

    const filteredStockEarnings = allStockEarnings.filter(e => {
      if (filters.operation === 'APORTE') return false;
      const ticker = (e.ticker || '').toUpperCase().trim();
      const cls = getTickerClass(ticker);
      if (isNubankOnlyType(filters.assetType)) return false;
      if (filters.assetType === 'FII' && cls !== 'FII') return false;
      if (filters.assetType === 'ACAO' && cls !== 'ACAO') return false;
      if (filters.asset !== 'ALL' && filters.asset !== ticker) return false;
      return matchesDate(e.date);
    });

    const filteredBoxes = allBoxes.filter(b => {
      if (filters.operation === 'RENDIMENTO') return false;
      if (filters.assetType === 'FII' || filters.assetType === 'ACAO' || filters.assetType === 'BOLSA_ALL') return false;
      const cat = getBoxCategory(b);
      if (filters.assetType === 'NUBANK_CAIXINHA' && cat !== 'Caixinha') return false;
      if (filters.assetType === 'NUBANK_SEPARADO' && cat !== 'Dinheiro Separado') return false;
      if (filters.asset !== 'ALL' && filters.asset !== 'NUBANK') return false;
      return matchesDate(b.date);
    });

    const filteredBoxEarnings = allBoxEarnings.filter(b => {
      if (filters.operation === 'APORTE') return false;
      if (filters.assetType === 'FII' || filters.assetType === 'ACAO' || filters.assetType === 'BOLSA_ALL') return false;
      const cat = getBoxCategory(b);
      if (filters.assetType === 'NUBANK_CAIXINHA' && cat !== 'Caixinha') return false;
      if (filters.assetType === 'NUBANK_SEPARADO' && cat !== 'Dinheiro Separado') return false;
      if (filters.asset !== 'ALL' && filters.asset !== 'NUBANK') return false;
      return matchesDate(b.date);
    });

    // Ordenação conforme seletor
    const sortItems = (arr, getValFn) => {
      return [...arr].sort((a, b) => {
        if (filters.sort === 'date_asc') return (a.date || '').localeCompare(b.date || '');
        if (filters.sort === 'val_desc') return (getValFn(b) || 0) - (getValFn(a) || 0);
        if (filters.sort === 'val_asc') return (getValFn(a) || 0) - (getValFn(b) || 0);
        return (b.date || '').localeCompare(a.date || '');
      });
    };

    const sortedStocks = sortItems(filteredStocks, s => Number(s.total) || (Number(s.shares) * Number(s.pricePerShare)) || 0);
    const sortedStockEarnings = sortItems(filteredStockEarnings, e => Number(e.amount) || 0);
    const sortedBoxes = sortItems(filteredBoxes, b => Number(b.amount) || 0);
    const sortedBoxEarnings = sortItems(filteredBoxEarnings, b => Number(b.amount) || 0);

    // Cálculo de métricas consolidadas para o recorte atual
    const totalStocks = sortedStocks.reduce((acc, s) => acc + (Number(s.total) || (Number(s.shares) * Number(s.pricePerShare)) || 0), 0);
    const totalBoxes = sortedBoxes.reduce((acc, b) => acc + (Number(b.amount) || 0), 0);
    const totalInvested = totalStocks + totalBoxes;

    const totalStockEarnings = sortedStockEarnings.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
    const totalNubankEarnings = sortedBoxEarnings.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
    const totalEarnings = totalStockEarnings + totalNubankEarnings;

    // Base de capital para cálculo de Yield quando o filtro está apenas em "RENDIMENTO" ou em um ano específico sem compras
    const refInvestedForYield = totalInvested > 0 ? totalInvested : (() => {
      let base = 0;
      allStocks.forEach(s => {
        const ticker = (s.ticker || '').toUpperCase().trim();
        const cls = getTickerClass(ticker, s.type);
        if (isNubankOnlyType(filters.assetType)) return;
        if (filters.assetType === 'FII' && cls !== 'FII') return;
        if (filters.assetType === 'ACAO' && cls !== 'ACAO') return;
        if (filters.asset !== 'ALL' && filters.asset !== ticker) return;
        base += Number(s.total) || (Number(s.shares) * Number(s.pricePerShare)) || 0;
      });
      if (filters.assetType !== 'FII' && filters.assetType !== 'ACAO' && filters.assetType !== 'BOLSA_ALL') {
        if (filters.asset === 'ALL' || filters.asset === 'NUBANK') {
          base += allBoxes.reduce((acc, b) => acc + (Number(b.amount) || 0), 0);
        }
      }
      return base;
    })();

    const yieldGlobal = refInvestedForYield > 0 ? (totalEarnings / refInvestedForYield) * 100 : 0;

    const stocksByAsset = {};
    sortedStocks.forEach(s => {
      const ticker = (s.ticker || 'OUTROS').toUpperCase().trim();
      const val = Number(s.total) || (Number(s.shares) * Number(s.pricePerShare)) || 0;
      stocksByAsset[ticker] = (stocksByAsset[ticker] || 0) + val;
    });

    const earningsByStock = {};
    sortedStockEarnings.forEach(e => {
      const ticker = (e.ticker || 'OUTROS').toUpperCase().trim();
      const val = Number(e.amount) || 0;
      earningsByStock[ticker] = (earningsByStock[ticker] || 0) + val;
    });

    const boxesByName = {};
    sortedBoxes.forEach(b => {
      const name = (b.name || 'Geral').trim();
      const val = Number(b.amount) || 0;
      boxesByName[name] = (boxesByName[name] || 0) + val;
    });

    const earningsByBox = {};
    sortedBoxEarnings.forEach(e => {
      const name = (e.boxName || 'Geral').trim();
      const val = Number(e.amount) || 0;
      earningsByBox[name] = (earningsByBox[name] || 0) + val;
    });

    // Proventos no Mês Atual (ou no período filtrado)
    const today = new Date();
    const currYearMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const currentMonthEarnings = filters.isFiltered
      ? totalEarnings
      : (
          sortedStockEarnings.filter(e => (e.date || '').startsWith(currYearMonth)).reduce((a, e) => a + (Number(e.amount) || 0), 0) +
          sortedBoxEarnings.filter(e => (e.date || '').startsWith(currYearMonth)).reduce((a, e) => a + (Number(e.amount) || 0), 0)
        );

    // Maior Posição no recorte
    let topAssetTicker = '-';
    let topAssetVal = 0;
    Object.entries(stocksByAsset).forEach(([ticker, val]) => {
      if (val > topAssetVal) {
        topAssetVal = val;
        topAssetTicker = ticker;
      }
    });
    if (topAssetVal === 0 && Object.keys(boxesByName).length > 0) {
      Object.entries(boxesByName).forEach(([name, val]) => {
        if (val > topAssetVal) {
          topAssetVal = val;
          topAssetTicker = name;
        }
      });
    }
    if (topAssetVal === 0 && Object.keys(earningsByStock).length > 0) {
      Object.entries(earningsByStock).forEach(([ticker, val]) => {
        if (val > topAssetVal) {
          topAssetVal = val;
          topAssetTicker = `${ticker} (Proventos)`;
        }
      });
    }
    const topAssetShare = totalInvested > 0 ? (topAssetVal / totalInvested) * 100 : 100;

    const summary = {
      stocks: totalStocks,
      boxes: totalBoxes,
      total: totalInvested,
      totalInvested,
      totalAccumulated: totalInvested + totalEarnings,
      totalStockEarnings,
      totalNubankEarnings,
      totalEarnings,
      currentMonthEarnings,
      stockCount: sortedStocks.length,
      boxCount: sortedBoxes.length,
      totalPositions: sortedStocks.length + sortedBoxes.length,
      earningsCount: sortedStockEarnings.length + sortedBoxEarnings.length,
      topAssetTicker,
      topAssetVal,
      topAssetShare,
      yieldGlobal,
      stocksByAsset,
      earningsByStock,
      boxesByName,
      earningsByBox
    };

    // Atualiza Badge de Status do Filtro
    const totalFilteredRecords = sortedStocks.length + sortedStockEarnings.length + sortedBoxes.length + sortedBoxEarnings.length;
    const elFilterBadge = document.getElementById('invFilterStatusBadge');
    if (elFilterBadge) {
      if (filters.isFiltered) {
        elFilterBadge.textContent = `Filtro Ativo: ${totalFilteredRecords} de ${totalAllRecords} lançamentos`;
        elFilterBadge.style.background = 'rgba(16, 185, 129, 0.2)';
        elFilterBadge.style.color = '#34d399';
        elFilterBadge.style.borderColor = 'rgba(16, 185, 129, 0.4)';
      } else {
        elFilterBadge.textContent = `Exibindo Tudo (${totalAllRecords} lançamentos)`;
        elFilterBadge.style.background = 'rgba(59, 130, 246, 0.18)';
        elFilterBadge.style.color = '#93c5fd';
        elFilterBadge.style.borderColor = 'rgba(59, 130, 246, 0.35)';
      }
    }

    // Atualiza Banner Principal Superior
    const elTotal = document.getElementById('investTotalAssets');
    if (elTotal) elTotal.textContent = formatBRL(summary.totalInvested);

    const elEarnings = document.getElementById('investTotalEarnings');
    if (elEarnings) elEarnings.textContent = `+ ${formatBRL(summary.totalEarnings)}`;

    const elYieldBadge = document.getElementById('investYieldBadge');
    if (elYieldBadge) elYieldBadge.textContent = `Yield: ${summary.yieldGlobal.toFixed(2)}%`;

    const elStocks = document.getElementById('investTotalStocks');
    if (elStocks) elStocks.textContent = formatBRL(summary.stocks);

    const elStockEarnings = document.getElementById('investStockEarnings');
    if (elStockEarnings) elStockEarnings.textContent = `+ ${formatBRL(summary.totalStockEarnings)} proventos`;

    const elBoxes = document.getElementById('investTotalBoxes');
    if (elBoxes) elBoxes.textContent = formatBRL(summary.boxes);

    const elNubankEarnings = document.getElementById('investNubankEarnings');
    if (elNubankEarnings) elNubankEarnings.textContent = `+ ${formatBRL(summary.totalNubankEarnings)} rendimentos`;

    const elAssetsBadge = document.getElementById('investAssetsBadge');
    if (elAssetsBadge) elAssetsBadge.textContent = `${summary.totalPositions} aportes`;

    const elEarningsCount = document.getElementById('investEarningsCountBadge');
    if (elEarningsCount) elEarningsCount.textContent = `(${summary.earningsCount} lançamentos)`;

    const elTotalPlusEarnings = document.getElementById('investTotalPlusEarnings');
    if (elTotalPlusEarnings) elTotalPlusEarnings.textContent = formatBRL(summary.totalAccumulated);

    const elCurrMonthEarnings = document.getElementById('investCurrentMonthEarnings');
    if (elCurrMonthEarnings) elCurrMonthEarnings.textContent = `+ ${formatBRL(summary.currentMonthEarnings)}`;

    const elStockCount = document.getElementById('investStockCount');
    if (elStockCount) elStockCount.textContent = `${summary.stockCount} compras`;

    const elBoxCount = document.getElementById('investBoxCount');
    if (elBoxCount) elBoxCount.textContent = `${summary.boxCount} aplicações`;

    const elTopAsset = document.getElementById('investTopAsset');
    if (elTopAsset) elTopAsset.textContent = summary.topAssetTicker;

    const elTopAssetDetail = document.getElementById('investTopAssetDetail');
    if (elTopAssetDetail) {
      elTopAssetDetail.textContent = summary.topAssetVal > 0 
        ? `${formatBRL(summary.topAssetVal)} (${summary.topAssetShare.toFixed(1)}% do recorte)`
        : '0% da carteira';
    }

    const elTotalReturnVal = document.getElementById('investTotalReturnVal');
    if (elTotalReturnVal) elTotalReturnVal.textContent = `+ ${summary.yieldGlobal.toFixed(2)}%`;

    const elTotalReturnSub = document.getElementById('investTotalReturnSub');
    if (elTotalReturnSub) elTotalReturnSub.textContent = `+ ${formatBRL(summary.totalEarnings)} em rendimentos`;

    // =========================================================================
    // CONSOLIDAÇÃO POR ATIVO (RAIO-X DA CARTEIRA B3) & FATORES ANALÍTICOS
    // =========================================================================
    const consolidatedMap = {};
    sortedStocks.forEach(s => {
      const t = (s.ticker || 'OUTROS').toUpperCase().trim();
      if (!consolidatedMap[t]) {
        consolidatedMap[t] = {
          ticker: t,
          type: s.type || (t.endsWith('11') ? 'FII' : 'Ação'),
          purchasesCount: 0,
          shares: 0,
          invested: 0,
          earningsCount: 0,
          earnings: 0
        };
      }
      consolidatedMap[t].purchasesCount += 1;
      consolidatedMap[t].shares += Number(s.shares) || 0;
      consolidatedMap[t].invested += Number(s.total) || (Number(s.shares) * Number(s.pricePerShare)) || 0;
    });

    sortedStockEarnings.forEach(e => {
      const t = (e.ticker || 'OUTROS').toUpperCase().trim();
      if (!consolidatedMap[t]) {
        consolidatedMap[t] = {
          ticker: t,
          type: tickerTypeMap[t] || (t.endsWith('11') ? 'FII' : 'Ação'),
          purchasesCount: 0,
          shares: 0,
          invested: 0,
          earningsCount: 0,
          earnings: 0
        };
      }
      consolidatedMap[t].earningsCount += 1;
      consolidatedMap[t].earnings += Number(e.amount) || 0;
    });

    // Se o usuário filtrou apenas RENDIMENTO (ou um período sem compras), preenche a base de cotas/investido histórico para cálculo de YoC
    Object.values(consolidatedMap).forEach(item => {
      if (item.invested === 0) {
        const histStocks = allStocks.filter(s => (s.ticker || '').toUpperCase().trim() === item.ticker);
        item.historicalShares = histStocks.reduce((a, s) => a + (Number(s.shares) || 0), 0);
        item.historicalInvested = histStocks.reduce((a, s) => a + (Number(s.total) || (Number(s.shares) * Number(s.pricePerShare)) || 0), 0);
      }
      const baseInv = item.invested > 0 ? item.invested : (item.historicalInvested || 0);
      const baseSh = item.shares > 0 ? item.shares : (item.historicalShares || 0);
      item.avgPrice = item.shares > 0 ? (item.invested / item.shares) : (baseSh > 0 ? baseInv / baseSh : 0);
      item.yoc = baseInv > 0 ? (item.earnings / baseInv) * 100 : 0;
      item.earningPerShare = baseSh > 0 ? (item.earnings / baseSh) : 0;
      item.accumulated = item.invested + item.earnings;
    });

    const consolidatedList = Object.values(consolidatedMap).sort((a, b) => {
      if (filters.sort === 'val_asc') return (a.invested || a.earnings) - (b.invested || b.earnings);
      return (b.invested || b.earnings) - (a.invested || a.earnings);
    });

    // Atualiza os 4 Mini-Cards de Fatores Analíticos
    const totalSharesFiltered = sortedStocks.reduce((a, s) => a + (Number(s.shares) || 0), 0);
    const totalAportesCount = sortedStocks.length + sortedBoxes.length;
    const avgTicketAporte = totalAportesCount > 0 ? (totalInvested / totalAportesCount) : 0;

    const elFactorTicketMain = document.getElementById('invFactorTicketMain');
    const elFactorTicketSub = document.getElementById('invFactorTicketSub');
    if (elFactorTicketMain) {
      elFactorTicketMain.textContent = totalSharesFiltered > 0
        ? `${totalSharesFiltered} cotas (${sortedStocks.length} compras)`
        : `${totalAportesCount} aplicações`;
    }
    if (elFactorTicketSub) {
      elFactorTicketSub.textContent = `Ticket médio: ${formatBRL(avgTicketAporte)} / aporte`;
    }

    const earningMonthsSet = new Set();
    [...sortedStockEarnings, ...sortedBoxEarnings].forEach(e => {
      if (e.date && e.date.length >= 7) earningMonthsSet.add(e.date.substring(0, 7));
    });
    const activeEarningMonths = Math.max(1, earningMonthsSet.size);
    const avgMonthlyEarning = earningMonthsSet.size > 0 ? (totalEarnings / activeEarningMonths) : 0;
    const avgPerPayment = summary.earningsCount > 0 ? (totalEarnings / summary.earningsCount) : 0;

    const elFactorAvgEarnMain = document.getElementById('invFactorAvgEarnMain');
    const elFactorAvgEarnSub = document.getElementById('invFactorAvgEarnSub');
    if (elFactorAvgEarnMain) {
      elFactorAvgEarnMain.textContent = `${formatBRL(avgMonthlyEarning)} / mês`;
    }
    if (elFactorAvgEarnSub) {
      elFactorAvgEarnSub.textContent = `Em ${earningMonthsSet.size} meses | ${formatBRL(avgPerPayment)} / pgto`;
    }

    const bestYieldAsset = [...consolidatedList].sort((a, b) => b.yoc - a.yoc)[0];
    const elFactorBestYieldMain = document.getElementById('invFactorBestYieldMain');
    const elFactorBestYieldSub = document.getElementById('invFactorBestYieldSub');
    if (elFactorBestYieldMain) {
      elFactorBestYieldMain.textContent = bestYieldAsset && bestYieldAsset.yoc > 0
        ? `${bestYieldAsset.ticker} (${bestYieldAsset.yoc.toFixed(2)}% YoC)`
        : (summary.boxes > 0 ? `Nubank (${((totalNubankEarnings / summary.boxes) * 100).toFixed(2)}%)` : '-');
    }
    if (elFactorBestYieldSub) {
      elFactorBestYieldSub.textContent = bestYieldAsset && bestYieldAsset.earnings > 0
        ? `+ ${formatBRL(bestYieldAsset.earnings)} em ${bestYieldAsset.earningsCount} proventos`
        : 'Maior retorno proporcional sobre custo';
    }

    const elFactorCoverageMain = document.getElementById('invFactorCoverageMain');
    const elFactorCoverageSub = document.getElementById('invFactorCoverageSub');
    if (elFactorCoverageMain) {
      elFactorCoverageMain.textContent = `${summary.yieldGlobal.toFixed(2)}% de Retorno`;
    }
    if (elFactorCoverageSub) {
      elFactorCoverageSub.textContent = `Proventos: ${formatBRL(totalEarnings)} vs Aportes: ${formatBRL(refInvestedForYield)}`;
    }

    // Divisão Nubank: Caixinhas vs Dinheiro Separado
    const sortedCaixinhasOnly = sortedBoxes.filter(b => getBoxCategory(b) === 'Caixinha');
    const sortedSeparadoOnly = sortedBoxes.filter(b => getBoxCategory(b) === 'Dinheiro Separado');
    const totalCaixinhasOnly = sortedCaixinhasOnly.reduce((a, b) => a + (Number(b.amount) || 0), 0);
    const totalSeparadoOnly = sortedSeparadoOnly.reduce((a, b) => a + (Number(b.amount) || 0), 0);
    const pctCaixinhas = totalBoxes > 0 ? ((totalCaixinhasOnly / totalBoxes) * 100) : 0;
    const pctSeparado = totalBoxes > 0 ? ((totalSeparadoOnly / totalBoxes) * 100) : 0;

    // Atualiza Cards de Divisão dentro da Seção Nubank
    const elSplitCxTotal = document.getElementById('nubankSplitCaixinhasTotal');
    if (elSplitCxTotal) elSplitCxTotal.textContent = formatBRL(totalCaixinhasOnly);
    const elSplitCxCount = document.getElementById('nubankSplitCaixinhasCount');
    if (elSplitCxCount) elSplitCxCount.textContent = `${sortedCaixinhasOnly.length} ${sortedCaixinhasOnly.length === 1 ? 'caixinha' : 'caixinhas'}`;
    const elSplitCxShare = document.getElementById('nubankSplitCaixinhasShare');
    if (elSplitCxShare) elSplitCxShare.textContent = `${pctCaixinhas.toFixed(1)}% do Nubank`;

    const elSplitSepTotal = document.getElementById('nubankSplitSeparadoTotal');
    if (elSplitSepTotal) elSplitSepTotal.textContent = formatBRL(totalSeparadoOnly);
    const elSplitSepCount = document.getElementById('nubankSplitSeparadoCount');
    if (elSplitSepCount) elSplitSepCount.textContent = `${sortedSeparadoOnly.length} ${sortedSeparadoOnly.length === 1 ? 'registro' : 'registros'}`;
    const elSplitSepShare = document.getElementById('nubankSplitSeparadoShare');
    if (elSplitSepShare) elSplitSepShare.textContent = `${pctSeparado.toFixed(1)}% do Nubank`;

    const elSplitEarnTotal = document.getElementById('nubankSplitEarningsTotal');
    if (elSplitEarnTotal) elSplitEarnTotal.textContent = `+ ${formatBRL(totalNubankEarnings)}`;
    const elSplitEarnCount = document.getElementById('nubankSplitEarningsCount');
    if (elSplitEarnCount) elSplitEarnCount.textContent = `${sortedBoxEarnings.length} ${sortedBoxEarnings.length === 1 ? 'lançamento' : 'lançamentos'}`;
    const elSplitPatrimonio = document.getElementById('nubankSplitTotalPatrimonio');
    if (elSplitPatrimonio) elSplitPatrimonio.textContent = `Patrimônio Nu: ${formatBRL(totalBoxes + totalNubankEarnings)}`;

    // Badges de Contagem nas Abas
    const badgeCons = document.getElementById('countStockConsolidatedBadge');
    if (badgeCons) badgeCons.textContent = consolidatedList.length;

    const badgeStockPurchases = document.getElementById('countStockPurchasesBadge');
    if (badgeStockPurchases) badgeStockPurchases.textContent = sortedStocks.length;

    const badgeStockEarn = document.getElementById('countStockEarningsBadge');
    if (badgeStockEarn) badgeStockEarn.textContent = sortedStockEarnings.length;

    const badgeNubankBoxes = document.getElementById('countNubankBoxesBadge');
    if (badgeNubankBoxes) badgeNubankBoxes.textContent = sortedBoxes.length;

    const badgeNubankCxOnly = document.getElementById('countNubankCaixinhasOnlyBadge');
    if (badgeNubankCxOnly) badgeNubankCxOnly.textContent = sortedCaixinhasOnly.length;

    const badgeNubankSepOnly = document.getElementById('countNubankSeparadoOnlyBadge');
    if (badgeNubankSepOnly) badgeNubankSepOnly.textContent = sortedSeparadoOnly.length;

    const badgeNubankEarn = document.getElementById('countNubankEarningsBadge');
    if (badgeNubankEarn) badgeNubankEarn.textContent = sortedBoxEarnings.length;

    // 0. Tabela Bolsa - Visão Consolidada por Ativo (Raio-X)
    const tbodyCons = document.getElementById('stocksConsolidatedTableBody');
    const tfootCons = document.getElementById('stocksConsolidatedTableFoot');
    if (tbodyCons) {
      tbodyCons.innerHTML = consolidatedList.length === 0 ? `
        <tr><td colspan="10" style="text-align:center; color: var(--text-muted); padding: 2rem;">Nenhum ativo de Bolsa encontrado para os filtros selecionados.</td></tr>
      ` : consolidatedList.map(c => {
        const sharePct = totalStocks > 0 ? ((c.invested / totalStocks) * 100) : 0;
        const isCurrentlyFiltered = (filters.asset === c.ticker);
        return `
        <tr>
          <td>
            <strong style="color:#60a5fa; font-size:0.98rem; cursor:pointer;" onclick="app.quickFilterInvestAsset('${c.ticker}')" title="Clique para filtrar ${c.ticker}">
              ${c.ticker}
            </strong>
          </td>
          <td><span class="status-badge neutral">${c.type}</span></td>
          <td>${c.purchasesCount} ${c.purchasesCount === 1 ? 'compra' : 'compras'}</td>
          <td style="font-weight:700; color:#e2e8f0;">${c.shares > 0 ? c.shares : `<span style="color:#94a3b8;" title="Base histórica">${c.historicalShares || 0}*</span>`}</td>
          <td>${formatBRL(c.avgPrice)}</td>
          <td>
            <div style="font-weight:800; color:#fff;">${formatBRL(c.invested)}</div>
            <div style="display:flex; align-items:center; gap:0.4rem; margin-top:0.2rem;">
              <div style="flex:1; max-width:70px; height:5px; background:rgba(255,255,255,0.08); border-radius:4px; overflow:hidden;">
                <div style="width:${Math.min(100, sharePct).toFixed(1)}%; height:100%; background:#3b82f6;"></div>
              </div>
              <span style="font-size:0.72rem; color:#93c5fd;">${sharePct.toFixed(1)}%</span>
            </div>
          </td>
          <td>
            <div style="font-weight:800; color:#4ade80;">+ ${formatBRL(c.earnings)}</div>
            <div style="font-size:0.72rem; color:#94a3b8;">${c.earningsCount} ${c.earningsCount === 1 ? 'pagamento' : 'pagamentos'}</div>
          </td>
          <td>
            <span class="status-badge paid" style="font-weight:800;">${c.yoc.toFixed(2)}%</span>
            <div style="font-size:0.71rem; color:#94a3b8; margin-top:0.15rem;">${formatBRL(c.earningPerShare)} / cota</div>
          </td>
          <td style="font-weight:800; color:#38bdf8;">${formatBRL(c.accumulated)}</td>
          <td>
            <button type="button" class="btn-header" style="padding:0.25rem 0.55rem; font-size:0.73rem; background:${isCurrentlyFiltered ? 'rgba(16,185,129,0.2)' : 'rgba(59,130,246,0.15)'}; color:${isCurrentlyFiltered ? '#34d399' : '#93c5fd'}; border-color:${isCurrentlyFiltered ? 'rgba(16,185,129,0.4)' : 'rgba(59,130,246,0.3)'};" onclick="app.quickFilterInvestAsset('${c.ticker}')">
              ${isCurrentlyFiltered ? '✅ Ativo' : '🔍 Focar'}
            </button>
          </td>
        </tr>
      `;}).join('');

      if (tfootCons) {
        const totalB3Yoc = totalStocks > 0 ? ((totalStockEarnings / totalStocks) * 100) : 0;
        tfootCons.innerHTML = consolidatedList.length === 0 ? '' : `
          <tr style="background:rgba(15, 23, 42, 0.9); font-weight:800; border-top:2px solid rgba(59, 130, 246, 0.35);">
            <td colspan="2" style="color:#93c5fd;">TOTAL BOLSA (${consolidatedList.length} ativos)</td>
            <td>${sortedStocks.length} compras</td>
            <td style="color:#fff;">${totalSharesFiltered} cotas</td>
            <td>—</td>
            <td style="color:#fff;">${formatBRL(totalStocks)} (100%)</td>
            <td style="color:#4ade80;">+ ${formatBRL(totalStockEarnings)} (${sortedStockEarnings.length})</td>
            <td><span class="status-badge paid">${totalB3Yoc.toFixed(2)}% YoC</span></td>
            <td style="color:#38bdf8;">${formatBRL(totalStocks + totalStockEarnings)}</td>
            <td></td>
          </tr>
        `;
      }
    }

    // 1. Tabela Bolsa - Histórico de Compras
    const tbodyStocks = document.getElementById('stocksTableBody');
    const tfootStocks = document.getElementById('stocksTableFoot');
    if (tbodyStocks) {
      tbodyStocks.innerHTML = sortedStocks.length === 0 ? `
        <tr><td colspan="7" style="text-align:center; color: var(--text-muted); padding: 2rem;">Nenhuma compra de Bolsa (Ações/FIIs) encontrada para este filtro.</td></tr>
      ` : sortedStocks.map(s => {
        const totalVal = Number(s.total) || (Number(s.shares) * Number(s.pricePerShare)) || 0;
        return `
        <tr>
          <td><strong style="color:#60a5fa; font-size:0.95rem; cursor:pointer;" onclick="app.quickFilterInvestAsset('${s.ticker}')">${s.ticker}</strong></td>
          <td><span class="status-badge neutral">${s.type || 'Ação'}</span></td>
          <td>${formatDateBR(s.date)}</td>
          <td>${s.shares}</td>
          <td>${formatBRL(s.pricePerShare)}</td>
          <td style="font-weight: 800; color: #fff;">${formatBRL(totalVal)}</td>
          <td>
            <div class="table-actions" style="display:flex; gap:0.35rem; align-items:center;">
              <button type="button" class="btn-header" style="padding:0.25rem 0.55rem; font-size:0.75rem; background:rgba(59,130,246,0.18); border:1px solid rgba(59,130,246,0.45); color:#93c5fd; font-weight:700;" title="Editar Compra" onclick="app.openModalNovoAtivoBolsa('${s.id}')">
                ✏️ Editar
              </button>
              <button type="button" class="btn-table-icon delete" title="Excluir Ativo" onclick="app.deleteStock('${s.id}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            </div>
          </td>
        </tr>
      `;}).join('');

      if (tfootStocks) {
        const avgUnit = totalSharesFiltered > 0 ? (totalStocks / totalSharesFiltered) : 0;
        tfootStocks.innerHTML = sortedStocks.length === 0 ? '' : `
          <tr style="background:rgba(15, 23, 42, 0.9); font-weight:800; border-top:2px solid rgba(59, 130, 246, 0.35);">
            <td colspan="3" style="color:#93c5fd;">TOTAL FILTRADO (${sortedStocks.length} compras)</td>
            <td style="color:#fff;">${totalSharesFiltered} cotas</td>
            <td style="color:#cbd5e1;">PM: ${formatBRL(avgUnit)}</td>
            <td style="color:#60a5fa; font-size:1rem;">${formatBRL(totalStocks)}</td>
            <td></td>
          </tr>
        `;
      }
    }

    // 2. Tabela Bolsa - Rendimentos / Proventos Recebidos
    const tbodyStockEarnings = document.getElementById('stockEarningsTableBody');
    const tfootStockEarnings = document.getElementById('stockEarningsTableFoot');
    if (tbodyStockEarnings) {
      tbodyStockEarnings.innerHTML = sortedStockEarnings.length === 0 ? `
        <tr><td colspan="6" style="text-align:center; color: var(--text-muted); padding: 2rem;">Nenhum provento ou dividendo encontrado para este filtro.</td></tr>
      ` : sortedStockEarnings.map(e => `
        <tr>
          <td><strong style="color:#34d399; font-size:0.95rem; cursor:pointer;" onclick="app.quickFilterInvestAsset('${e.ticker}')">${e.ticker}</strong></td>
          <td><span class="status-badge paid">${e.type || 'Dividendo'}</span></td>
          <td>${formatDateBR(e.date)}</td>
          <td style="font-weight: 800; color: #4ade80;">+ ${formatBRL(e.amount)}</td>
          <td style="font-size: 0.85rem; color: var(--text-secondary);">${e.notes || '-'}</td>
          <td>
            <div class="table-actions" style="display:flex; gap:0.35rem; align-items:center;">
              <button type="button" class="btn-header" style="padding:0.25rem 0.55rem; font-size:0.75rem; background:rgba(16,185,129,0.18); border:1px solid rgba(16,185,129,0.45); color:#6ee7b7; font-weight:700;" title="Editar Provento" onclick="app.openModalNovoRendimentoBolsa('${e.id}')">
                ✏️ Editar
              </button>
              <button type="button" class="btn-table-icon delete" title="Excluir Rendimento" onclick="app.deleteStockEarning('${e.id}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            </div>
          </td>
        </tr>
      `).join('');

      if (tfootStockEarnings) {
        const avgStockEarn = sortedStockEarnings.length > 0 ? (totalStockEarnings / sortedStockEarnings.length) : 0;
        tfootStockEarnings.innerHTML = sortedStockEarnings.length === 0 ? '' : `
          <tr style="background:rgba(15, 23, 42, 0.9); font-weight:800; border-top:2px solid rgba(16, 185, 129, 0.35);">
            <td colspan="3" style="color:#34d399;">TOTAL DE PROVENTOS (${sortedStockEarnings.length} lançamentos)</td>
            <td style="color:#4ade80; font-size:1rem;">+ ${formatBRL(totalStockEarnings)}</td>
            <td style="color:#94a3b8; font-size:0.8rem;">Média: ${formatBRL(avgStockEarn)} / lançamento</td>
            <td></td>
          </tr>
        `;
      }
    }

    // 3. Tabela Nubank (Todos, Só Caixinhas ou Dinheiro Separado conforme sub-aba ativa)
    const tbodyBoxes = document.getElementById('nubankBoxesTableBody');
    const tfootBoxes = document.getElementById('nubankBoxesTableFoot');
    const boxesForSubtab = this.activeNubankSubtab === 'caixinhas'
      ? sortedCaixinhasOnly
      : (this.activeNubankSubtab === 'separado' ? sortedSeparadoOnly : sortedBoxes);
    const totalBoxesForSubtab = boxesForSubtab.reduce((a, b) => a + (Number(b.amount) || 0), 0);

    if (tbodyBoxes) {
      const emptyLabel = this.activeNubankSubtab === 'separado'
        ? `Nenhum registro de "Dinheiro Separado" encontrado. Clique em "+ Dinheiro Separado" para adicionar ou alterne um item existente com 1 clique!`
        : (this.activeNubankSubtab === 'caixinhas'
            ? 'Nenhuma Caixinha Nubank encontrada para este filtro.'
            : 'Nenhuma Caixinha ou Dinheiro Separado encontrado para este filtro.');

      tbodyBoxes.innerHTML = boxesForSubtab.length === 0 ? `
        <tr><td colspan="6" style="text-align:center; color: var(--text-muted); padding: 2rem;">${emptyLabel}</td></tr>
      ` : boxesForSubtab.map(b => {
        const cat = getBoxCategory(b);
        const isSeparado = (cat === 'Dinheiro Separado');
        const badgeStyle = isSeparado
          ? 'background:rgba(56, 189, 248, 0.18); color:#38bdf8; border:1px solid rgba(56, 189, 248, 0.4);'
          : 'background:rgba(168, 85, 247, 0.18); color:#d8b4fe; border:1px solid rgba(168, 85, 247, 0.4);';
        const badgeIcon = isSeparado ? '💵 Dinheiro Separado' : '📦 Caixinha';
        const nameColor = isSeparado ? '#38bdf8' : '#c084fc';
        return `
        <tr>
          <td>
            <strong style="color:${nameColor}; font-size:0.95rem;">${escapeHtml(b.name)}</strong>
            ${b.notes ? `<div style="font-size:0.75rem; color:#94a3b8; margin-top:0.15rem;">${escapeHtml(b.notes)}</div>` : ''}
          </td>
          <td>
            <span class="status-badge" style="${badgeStyle} cursor:pointer; font-weight:700;" onclick="app.toggleNubankCategory('${b.id}')" title="Clique para alternar entre Caixinha e Dinheiro Separado">
              ${badgeIcon} ⇄
            </span>
          </td>
          <td>${formatDateBR(b.date)}</td>
          <td style="font-weight: 800; color: #fff;">${formatBRL(b.amount)}</td>
          <td><span class="status-badge paid">${b.status || 'Ativo'}</span></td>
          <td>
            <div class="table-actions" style="display:flex; gap:0.35rem; align-items:center;">
              <button type="button" class="btn-table-icon" title="Mover para ${isSeparado ? 'Caixinha' : 'Dinheiro Separado'}" onclick="app.toggleNubankCategory('${b.id}')" style="color:${isSeparado ? '#c084fc' : '#38bdf8'};">
                ⇄
              </button>
              <button type="button" class="btn-header" style="padding:0.25rem 0.55rem; font-size:0.75rem; background:rgba(168,85,247,0.18); border:1px solid rgba(168,85,247,0.45); color:#d8b4fe; font-weight:700;" title="Editar Lançamento" onclick="app.openModalNovaCaixinhaNubank(null, '${b.id}')">
                ✏️ Editar
              </button>
              <button type="button" class="btn-table-icon delete" title="Excluir Registro" onclick="app.deleteNubankBox('${b.id}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            </div>
          </td>
        </tr>
      `;}).join('');

      if (tfootBoxes) {
        const subLabel = this.activeNubankSubtab === 'caixinhas'
          ? `TOTAL SÓ CAIXINHAS (${boxesForSubtab.length})`
          : (this.activeNubankSubtab === 'separado'
              ? `TOTAL DINHEIRO SEPARADO (${boxesForSubtab.length})`
              : `TOTAL GUARDADO NUBANK (${boxesForSubtab.length} aplicações)`);
        tfootBoxes.innerHTML = boxesForSubtab.length === 0 ? '' : `
          <tr style="background:rgba(15, 23, 42, 0.9); font-weight:800; border-top:2px solid rgba(168, 85, 247, 0.35);">
            <td colspan="3" style="color:#c084fc;">${subLabel}</td>
            <td style="color:#fff; font-size:1rem;">${formatBRL(totalBoxesForSubtab)}</td>
            <td colspan="2" style="font-size:0.78rem; color:#94a3b8;">
              📦 Caixinhas: ${formatBRL(totalCaixinhasOnly)} | 💵 Separado: ${formatBRL(totalSeparadoOnly)}
            </td>
          </tr>
        `;
      }
    }

    // 4. Tabela Nubank Rendimentos
    const tbodyNubankEarnings = document.getElementById('nubankEarningsTableBody');
    const tfootNubankEarnings = document.getElementById('nubankEarningsTableFoot');
    if (tbodyNubankEarnings) {
      tbodyNubankEarnings.innerHTML = sortedBoxEarnings.length === 0 ? `
        <tr><td colspan="6" style="text-align:center; color: var(--text-muted); padding: 2rem;">Nenhum rendimento de Nubank encontrado para este filtro.</td></tr>
      ` : sortedBoxEarnings.map(b => {
        const cat = getBoxCategory(b);
        const isSeparado = (cat === 'Dinheiro Separado');
        const badgeStyle = isSeparado
          ? 'background:rgba(56, 189, 248, 0.18); color:#38bdf8; border:1px solid rgba(56, 189, 248, 0.4);'
          : 'background:rgba(168, 85, 247, 0.18); color:#d8b4fe; border:1px solid rgba(168, 85, 247, 0.4);';
        return `
        <tr>
          <td><strong style="color:#c084fc; font-size:0.95rem;">${escapeHtml(b.boxName)}</strong></td>
          <td><span class="status-badge" style="${badgeStyle}">${isSeparado ? '💵 Dinheiro Separado' : '📦 Caixinha'}</span></td>
          <td>${formatDateBR(b.date)}</td>
          <td style="font-weight: 800; color: #4ade80;">+ ${formatBRL(b.amount)}</td>
          <td style="font-size: 0.85rem; color: var(--text-secondary);">${escapeHtml(b.notes || '-')}</td>
          <td>
            <div class="table-actions" style="display:flex; gap:0.35rem; align-items:center;">
              <button type="button" class="btn-header" style="padding:0.25rem 0.55rem; font-size:0.75rem; background:rgba(16,185,129,0.18); border:1px solid rgba(16,185,129,0.45); color:#6ee7b7; font-weight:700;" title="Editar Rendimento" onclick="app.openModalNovoRendimentoNubank('${b.id}')">
                ✏️ Editar
              </button>
              <button type="button" class="btn-table-icon delete" title="Excluir Rendimento" onclick="app.deleteNubankEarning('${b.id}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            </div>
          </td>
        </tr>
      `;}).join('');

      if (tfootNubankEarnings) {
        const avgNuEarn = sortedBoxEarnings.length > 0 ? (totalNubankEarnings / sortedBoxEarnings.length) : 0;
        tfootNubankEarnings.innerHTML = sortedBoxEarnings.length === 0 ? '' : `
          <tr style="background:rgba(15, 23, 42, 0.9); font-weight:800; border-top:2px solid rgba(16, 185, 129, 0.35);">
            <td colspan="3" style="color:#34d399;">TOTAL RENDIMENTOS NUBANK (${sortedBoxEarnings.length} lançamentos)</td>
            <td style="color:#4ade80; font-size:1rem;">+ ${formatBRL(totalNubankEarnings)}</td>
            <td style="color:#94a3b8; font-size:0.8rem;">Média: ${formatBRL(avgNuEarn)} / mês</td>
            <td></td>
          </tr>
        `;
      }
    }

    // Oculta/Exibe cards de seção caso o filtro seja exclusivo de Bolsa ou exclusivo de Nubank
    const cardBolsa = document.getElementById('cardInvestBolsa');
    const cardNubank = document.getElementById('cardInvestNubank');
    if (cardBolsa) {
      cardBolsa.style.display = (isNubankOnlyType(filters.assetType) || filters.asset === 'NUBANK') ? 'none' : '';
    }
    if (cardNubank) {
      const onlyBolsa = (filters.assetType === 'FII' || filters.assetType === 'ACAO' || filters.assetType === 'BOLSA_ALL' || (filters.asset !== 'ALL' && filters.asset !== 'NUBANK'));
      cardNubank.style.display = onlyBolsa ? 'none' : '';
    }

    // Renderiza os Gráficos Exclusivos de Investimentos refletindo o filtro atual
    this.renderInvestCharts(summary);
  },

  // Alternar abas da Bolsa
  switchInvestStockTab(tab) {
    const btnCons = document.getElementById('btnTabStocksConsolidated');
    const btnPos = document.getElementById('btnTabStocksPositions');
    const btnEarn = document.getElementById('btnTabStocksEarnings');
    const pnlCons = document.getElementById('panelStocksConsolidated');
    const pnlPos = document.getElementById('panelStocksPositions');
    const pnlEarn = document.getElementById('panelStocksEarnings');

    btnCons?.classList.toggle('active', tab === 'consolidated');
    btnPos?.classList.toggle('active', tab === 'positions');
    btnEarn?.classList.toggle('active', tab === 'earnings');

    if (pnlCons) pnlCons.style.display = tab === 'consolidated' ? 'block' : 'none';
    if (pnlPos) pnlPos.style.display = tab === 'positions' ? 'block' : 'none';
    if (pnlEarn) pnlEarn.style.display = tab === 'earnings' ? 'block' : 'none';
  },

  // Alternar abas do Nubank (Todos, Só Caixinhas, Dinheiro Separado, Rendimentos)
  switchInvestNubankTab(tab) {
    this.activeNubankSubtab = tab || 'boxes';
    const btnBox = document.getElementById('btnTabNubankBoxes');
    const btnCx = document.getElementById('btnTabNubankCaixinhasOnly');
    const btnSep = document.getElementById('btnTabNubankSeparadoOnly');
    const btnEarn = document.getElementById('btnTabNubankEarnings');
    const pnlBox = document.getElementById('panelNubankBoxes');
    const pnlEarn = document.getElementById('panelNubankEarnings');

    btnBox?.classList.toggle('active', tab === 'boxes');
    btnCx?.classList.toggle('active', tab === 'caixinhas');
    btnSep?.classList.toggle('active', tab === 'separado');
    btnEarn?.classList.toggle('active', tab === 'earnings');

    if (tab === 'earnings') {
      if (pnlBox) pnlBox.style.display = 'none';
      if (pnlEarn) pnlEarn.style.display = 'block';
    } else {
      if (pnlBox) pnlBox.style.display = 'block';
      if (pnlEarn) pnlEarn.style.display = 'none';
      this.renderInvestimentos();
    }
  },

  // =========================================================================
  // GRÁFICOS EXCLUSIVOS DE INVESTIMENTOS (CHART.JS)
  // =========================================================================
  destroyInvestChart(key) {
    if (this.investCharts && this.investCharts[key]) {
      try {
        this.investCharts[key].destroy();
      } catch (e) {
        console.warn('Erro ao destruir gráfico ' + key, e);
      }
      this.investCharts[key] = null;
    }
  },

  renderInvestCharts(summary) {
    if (typeof Chart === 'undefined') return;
    if (!this.investCharts) this.investCharts = {};

    const colorPalette = [
      '#38bdf8', '#818cf8', '#c084fc', '#f472b6', 
      '#34d399', '#fbbf24', '#f87171', '#2dd4bf', 
      '#fb923c', '#a78bfa', '#4ade80', '#60a5fa'
    ];

    // --- GRÁFICO 1: TOTAL INVESTIDO POR ATIVO ---
    const canvasAlloc = document.getElementById('chartInvestAllocation');
    const emptyAlloc = document.getElementById('emptyChartAllocation');
    if (canvasAlloc && emptyAlloc) {
      const labels = [];
      const values = [];

      Object.entries(summary.stocksByAsset || {}).forEach(([ticker, val]) => {
        if (val > 0) {
          labels.push(ticker);
          values.push(val);
        }
      });
      Object.entries(summary.boxesByName || {}).forEach(([boxName, val]) => {
        if (val > 0) {
          labels.push(`Nu: ${boxName}`);
          values.push(val);
        }
      });

      if (values.length === 0) {
        canvasAlloc.style.display = 'none';
        emptyAlloc.style.display = 'block';
        this.destroyInvestChart('allocation');
      } else {
        canvasAlloc.style.display = 'block';
        emptyAlloc.style.display = 'none';
        this.destroyInvestChart('allocation');

        const ctx = canvasAlloc.getContext('2d');
        this.investCharts.allocation = new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: labels,
            datasets: [{
              data: values,
              backgroundColor: colorPalette.slice(0, labels.length),
              borderWidth: 2,
              borderColor: '#141518'
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '68%',
            plugins: {
              legend: {
                position: 'bottom',
                labels: {
                  color: '#d4d4d8',
                  boxWidth: 12,
                  padding: 10,
                  font: { size: 11, family: "'Plus Jakarta Sans', sans-serif" }
                }
              },
              tooltip: {
                callbacks: {
                  label: function(ctx) {
                    const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                    const pct = total > 0 ? ((ctx.raw / total) * 100).toFixed(1) : 0;
                    return ` ${ctx.label}: ${formatBRL(ctx.raw)} (${pct}%)`;
                  }
                }
              }
            }
          }
        });
      }
    }

    // --- GRÁFICO 2: TOTAL DE RENDIMENTOS POR ATIVO (BOLSA) ---
    const canvasEarnings = document.getElementById('chartStockEarnings');
    const emptyEarnings = document.getElementById('emptyChartStockEarnings');
    if (canvasEarnings && emptyEarnings) {
      const earnEntries = Object.entries(summary.earningsByStock || {}).filter(([_, v]) => v > 0);
      
      if (earnEntries.length === 0) {
        canvasEarnings.style.display = 'none';
        emptyEarnings.style.display = 'block';
        this.destroyInvestChart('stockEarnings');
      } else {
        canvasEarnings.style.display = 'block';
        emptyEarnings.style.display = 'none';
        this.destroyInvestChart('stockEarnings');

        const labels = earnEntries.map(e => e[0]);
        const values = earnEntries.map(e => e[1]);

        const ctx = canvasEarnings.getContext('2d');
        this.investCharts.stockEarnings = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: labels,
            datasets: [{
              label: 'Proventos Recebidos (R$)',
              data: values,
              backgroundColor: 'rgba(52, 211, 153, 0.75)',
              borderColor: '#34d399',
              borderWidth: 1.5,
              borderRadius: 6
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              x: {
                grid: { display: false },
                ticks: { color: '#a1a1aa' }
              },
              y: {
                grid: { color: 'rgba(255, 255, 255, 0.06)' },
                ticks: {
                  color: '#a1a1aa',
                  callback: (v) => 'R$ ' + v
                }
              }
            },
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: (ctx) => ` Rendimento: ${formatBRL(ctx.raw)}`
                }
              }
            }
          }
        });
      }
    }

    // --- GRÁFICO 3: NUBANK CAIXINHAS & RENDIMENTOS ---
    const canvasNubank = document.getElementById('chartNubankOverview');
    const emptyNubank = document.getElementById('emptyChartNubank');
    if (canvasNubank && emptyNubank) {
      const allBoxNames = [...new Set([
        ...Object.keys(summary.boxesByName || {}),
        ...Object.keys(summary.earningsByBox || {})
      ])];

      if (allBoxNames.length === 0) {
        canvasNubank.style.display = 'none';
        emptyNubank.style.display = 'block';
        this.destroyInvestChart('nubankOverview');
      } else {
        canvasNubank.style.display = 'block';
        emptyNubank.style.display = 'none';
        this.destroyInvestChart('nubankOverview');

        const valuesApplied = allBoxNames.map(name => summary.boxesByName[name] || 0);
        const valuesEarned = allBoxNames.map(name => summary.earningsByBox[name] || 0);

        const ctx = canvasNubank.getContext('2d');
        this.investCharts.nubankOverview = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: allBoxNames,
            datasets: [
              {
                label: 'Valor Guardado',
                data: valuesApplied,
                backgroundColor: 'rgba(168, 85, 247, 0.75)',
                borderColor: '#c084fc',
                borderWidth: 1.5,
                borderRadius: 6
              },
              {
                label: 'Rendimentos',
                data: valuesEarned,
                backgroundColor: 'rgba(52, 211, 153, 0.75)',
                borderColor: '#34d399',
                borderWidth: 1.5,
                borderRadius: 6
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              x: {
                grid: { display: false },
                ticks: { color: '#a1a1aa' }
              },
              y: {
                grid: { color: 'rgba(255, 255, 255, 0.06)' },
                ticks: {
                  color: '#a1a1aa',
                  callback: (v) => 'R$ ' + v
                }
              }
            },
            plugins: {
              legend: {
                position: 'bottom',
                labels: {
                  color: '#d4d4d8',
                  boxWidth: 12,
                  font: { size: 11 }
                }
              },
              tooltip: {
                callbacks: {
                  label: (ctx) => ` ${ctx.dataset.label}: ${formatBRL(ctx.raw)}`
                }
              }
            }
          }
        });
      }
    }

    // --- GRÁFICO 4: PANORAMA GERAL DA CARTEIRA ---
    const canvasComp = document.getElementById('chartInvestComparison');
    const emptyComp = document.getElementById('emptyChartComparison');
    if (canvasComp && emptyComp) {
      if (summary.totalInvested === 0 && summary.totalEarnings === 0) {
        canvasComp.style.display = 'none';
        emptyComp.style.display = 'block';
        this.destroyInvestChart('comparison');
      } else {
        canvasComp.style.display = 'block';
        emptyComp.style.display = 'none';
        this.destroyInvestChart('comparison');

        const ctx = canvasComp.getContext('2d');
        this.investCharts.comparison = new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: ['Bolsa (Ativos)', 'Bolsa (Proventos)', 'Nubank (Caixinhas)', 'Nubank (Rendimentos)'],
            datasets: [{
              data: [
                summary.stocks,
                summary.totalStockEarnings,
                summary.boxes,
                summary.totalNubankEarnings
              ],
              backgroundColor: ['#2563eb', '#10b981', '#8b5cf6', '#34d399'],
              borderWidth: 2,
              borderColor: '#141518'
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '60%',
            plugins: {
              legend: {
                position: 'bottom',
                labels: {
                  color: '#d4d4d8',
                  boxWidth: 12,
                  padding: 8,
                  font: { size: 10.5 }
                }
              },
              tooltip: {
                callbacks: {
                  label: (ctx) => ` ${ctx.label}: ${formatBRL(ctx.raw)}`
                }
              }
            }
          }
        });
      }
    }
  },

  deleteStock(id) {
    if (confirm('Deseja excluir este ativo da Bolsa?')) {
      store.deleteStock(id);
      this.renderInvestimentos();
      this.renderResumo();
      this.showToast('Ativo excluído.', 'info');
    }
  },

  deleteStockEarning(id) {
    if (confirm('Deseja excluir este provento/rendimento da Bolsa?')) {
      store.deleteStockEarning(id);
      this.renderInvestimentos();
      this.renderResumo();
      this.showToast('Rendimento excluído.', 'info');
    }
  },

  deleteNubankBox(id) {
    if (confirm('Deseja excluir este registro do Nubank?')) {
      store.deleteNubankBox(id);
      this.renderInvestimentos();
      this.renderResumo();
      this.showToast('Registro excluído.', 'info');
    }
  },

  deleteNubankEarning(id) {
    if (confirm('Deseja excluir este rendimento do Nubank?')) {
      store.deleteNubankEarning(id);
      this.renderInvestimentos();
      this.renderResumo();
      this.showToast('Rendimento excluído.', 'info');
    }
  },

  toggleNubankCategory(id) {
    const updated = store.toggleNubankBoxCategory(id);
    if (updated) {
      this.renderInvestimentos();
      this.renderResumo();
      const label = updated.category === 'Dinheiro Separado' ? '💵 Dinheiro Separado' : '📦 Caixinha';
      this.showToast(`"${updated.name}" movido para ${label}!`, 'success');
    }
  },

  // --- MODAIS E HANDLERS DE SALVAMENTO DE INVESTIMENTOS ---
  openModalNovoAtivoBolsa(editId = null) {
    const form = document.getElementById('formNovoAtivoBolsa');
    if (form) form.reset();
    const editInp = document.getElementById('stk_edit_id');
    const titleEl = document.getElementById('modalNovoAtivoBolsaTitle');
    const dateInp = document.getElementById('stk_date');
    const convGroup = document.getElementById('stkConvertTypeGroup');
    const convSel = document.getElementById('stk_record_dest');
    const todayStr = this.getTodayISO();

    if (editId) {
      const item = (store.data.investments.stocks || []).find(s => s.id === editId);
      if (item) {
        if (editInp) editInp.value = item.id;
        if (titleEl) titleEl.textContent = `✏️ Editar Compra (${item.ticker})`;
        if (convGroup) convGroup.style.display = 'block';
        if (convSel) convSel.value = 'STOCK';
        document.getElementById('stk_ticker').value = item.ticker || '';
        document.getElementById('stk_type').value = item.type || 'Ação';
        if (dateInp) dateInp.value = item.date || todayStr;
        document.getElementById('stk_shares').value = item.shares || '';
        document.getElementById('stk_price').value = formatMoneyDisplay(item.pricePerShare);
      }
    } else {
      if (editInp) editInp.value = '';
      if (titleEl) titleEl.textContent = '📈 Adicionar Ativo de Bolsa (B3)';
      if (convGroup) convGroup.style.display = 'none';
      if (convSel) convSel.value = 'STOCK';
      if (dateInp) dateInp.value = todayStr;
    }

    const modal = document.getElementById('modalNovoAtivoBolsa');
    if (modal) {
      modal.classList.add('active');
      document.body.classList.add('modal-open');
    }
  },

  handleSaveAtivoBolsa(e) {
    if (e && e.preventDefault) e.preventDefault();
    const editId = document.getElementById('stk_edit_id')?.value || '';
    const dest = document.getElementById('stk_record_dest')?.value || 'STOCK';
    const ticker = (document.getElementById('stk_ticker')?.value || '').toUpperCase().trim();
    const type = document.getElementById('stk_type')?.value || (ticker.endsWith('11') ? 'FII' : 'Ação');
    const date = document.getElementById('stk_date')?.value || this.getTodayISO();
    const shares = store._parseNum(document.getElementById('stk_shares')?.value);
    const pricePerShare = parseMoney(document.getElementById('stk_price')?.value);

    if (!ticker) {
      this.showToast('Informe o código (Ticker) do ativo.', 'warning');
      return;
    }
    if (shares <= 0 || pricePerShare <= 0) {
      this.showToast('Informe quantidade e preço unitário válidos.', 'warning');
      return;
    }

    if (editId) {
      if (dest === 'EARNING') {
        const totalAmount = Number((shares * pricePerShare).toFixed(2));
        store.deleteStock(editId);
        store.addStockEarning({
          ticker,
          type: ticker.endsWith('11') ? 'Rendimento FII' : 'Dividendo',
          date,
          amount: totalAmount,
          notes: `Movido de Compra para Provento (${ticker})`
        });
        this.showToast(`🔄 Lançamento de ${ticker} (${formatBRL(totalAmount)}) movido para Proventos da Bolsa!`, 'success');
      } else {
        store.updateStock(editId, { ticker, type, date, shares, pricePerShare });
        this.showToast(`✅ Compra de ${ticker} atualizada com sucesso!`, 'success');
      }
    } else {
      store.addStock({ ticker, type, date, shares, pricePerShare });
      this.showToast(`📈 Compra de ${shares} cotas de ${ticker} adicionada!`, 'success');
    }

    this.closeModal('modalNovoAtivoBolsa');
    document.getElementById('formNovoAtivoBolsa')?.reset();
    this.renderInvestimentos();
    this.renderResumo();
  },

  selectNubankModalCategory(cat) {
    const category = cat === 'Dinheiro Separado' ? 'Dinheiro Separado' : 'Caixinha';
    const hidden = document.getElementById('box_category');
    if (hidden) hidden.value = category;

    const btnCx = document.getElementById('btnPickCatCaixinha');
    const btnSep = document.getElementById('btnPickCatSeparado');
    const lblName = document.getElementById('lblBoxNameField');
    const inpName = document.getElementById('box_name');
    const titleEl = document.getElementById('modalNovaCaixinhaNubankTitle') || document.getElementById('modalNovaCaixinhaTitle');
    const editId = document.getElementById('box_edit_id')?.value;

    if (category === 'Dinheiro Separado') {
      if (btnSep) {
        btnSep.style.border = '2px solid #38bdf8';
        btnSep.style.background = 'rgba(56, 189, 248, 0.22)';
        btnSep.style.color = '#fff';
      }
      if (btnCx) {
        btnCx.style.border = '2px solid rgba(148, 163, 184, 0.25)';
        btnCx.style.background = 'rgba(30, 41, 59, 0.6)';
        btnCx.style.color = '#cbd5e1';
      }
      if (lblName) lblName.textContent = 'Descrição / Destino do Dinheiro Separado *';
      if (inpName && !inpName.value) inpName.placeholder = 'Ex: Dinheiro Separado Conta, Reserva Rápida, Giro Mensal...';
      if (titleEl && !editId) titleEl.textContent = '💵 Guardar em Dinheiro Separado (Nubank)';
    } else {
      if (btnCx) {
        btnCx.style.border = '2px solid #a855f7';
        btnCx.style.background = 'rgba(168, 85, 247, 0.22)';
        btnCx.style.color = '#fff';
      }
      if (btnSep) {
        btnSep.style.border = '2px solid rgba(148, 163, 184, 0.25)';
        btnSep.style.background = 'rgba(30, 41, 59, 0.6)';
        btnSep.style.color = '#cbd5e1';
      }
      if (lblName) lblName.textContent = 'Nome da Caixinha / Finalidade *';
      if (inpName && !inpName.value) inpName.placeholder = 'Ex: Reserva de Emergência, Férias, Impostos...';
      if (titleEl && !editId) titleEl.textContent = '📦 Nova Caixinha Nubank';
    }
  },

  openModalNovaCaixinhaNubank(defaultCategory = 'Caixinha', editId = null) {
    const form = document.getElementById('formNovaCaixinhaNubank');
    if (form) form.reset();

    const editInp = document.getElementById('box_edit_id');
    const dateInp = document.getElementById('box_date');
    const titleEl = document.getElementById('modalNovaCaixinhaNubankTitle') || document.getElementById('modalNovaCaixinhaTitle');
    const convGroup = document.getElementById('boxConvertTypeGroup');
    const convSel = document.getElementById('box_record_dest');
    const todayStr = this.getTodayISO();

    if (editId) {
      const item = (store.data.investments.nubankBoxes || []).find(b => b.id === editId);
      if (item) {
        if (editInp) editInp.value = item.id;
        if (convGroup) convGroup.style.display = 'block';
        if (convSel) convSel.value = 'BOX';
        const cat = item.category || (String(item.name || '').toLowerCase().includes('separado') ? 'Dinheiro Separado' : 'Caixinha');
        this.selectNubankModalCategory(cat);
        if (titleEl) titleEl.textContent = `✏️ Editar ${cat} (${item.name})`;
        document.getElementById('box_name').value = item.name || '';
        if (dateInp) dateInp.value = item.date || todayStr;
        document.getElementById('box_val').value = formatMoneyDisplay(item.amount);
        const notesInp = document.getElementById('box_notes');
        if (notesInp) notesInp.value = item.notes || '';
      }
    } else {
      if (editInp) editInp.value = '';
      if (convGroup) convGroup.style.display = 'none';
      if (convSel) convSel.value = 'BOX';
      if (dateInp) dateInp.value = todayStr;
      const cat = defaultCategory || (this.activeNubankSubtab === 'separado' ? 'Dinheiro Separado' : 'Caixinha');
      this.selectNubankModalCategory(cat);
    }

    const modal = document.getElementById('modalNovaCaixinhaNubank');
    if (modal) {
      modal.classList.add('active');
      document.body.classList.add('modal-open');
    }
  },

  handleSaveCaixinhaNubank(e) {
    if (e && e.preventDefault) e.preventDefault();
    const editId = document.getElementById('box_edit_id')?.value || '';
    const dest = document.getElementById('box_record_dest')?.value || 'BOX';
    const category = document.getElementById('box_category')?.value || 'Caixinha';
    const name = (document.getElementById('box_name')?.value || '').trim() || category;
    const date = document.getElementById('box_date')?.value || this.getTodayISO();
    const amount = parseMoney(document.getElementById('box_val')?.value);
    const notes = (document.getElementById('box_notes')?.value || '').trim();

    if (amount <= 0) {
      this.showToast('Por favor, informe um valor válido para guardar.', 'warning');
      return;
    }

    if (editId) {
      if (dest === 'EARNING') {
        store.deleteNubankBox(editId);
        store.addNubankEarning({ boxName: name, category, date, amount, notes: notes || 'Movido para Rendimento Nubank' });
        this.showToast(`🔄 Lançamento "${name}" (${formatBRL(amount)}) movido para Rendimentos do Nubank!`, 'success');
      } else {
        store.updateNubankBox(editId, { name, category, date, amount, notes });
        this.showToast(`✅ ${category} "${name}" atualizado (${formatBRL(amount)})!`, 'success');
      }
    } else {
      store.addNubankBox({ name, category, date, amount, notes, status: 'Ativo' });
      this.showToast(`💜 ${category} "${name}" (${formatBRL(amount)}) cadastrado com sucesso!`, 'success');
    }

    this.closeModal('modalNovaCaixinhaNubank');
    document.getElementById('formNovaCaixinhaNubank')?.reset();
    this.renderInvestimentos();
    this.renderResumo();
  },

  prepareModalNovoRendimentoBolsa(editId = null) {
    const form = document.getElementById('formNovoRendimentoBolsa');
    if (form) form.reset();

    const editInp = document.getElementById('stk_earn_edit_id');
    const titleEl = document.getElementById('modalNovoRendimentoBolsaTitle');
    const dateInp = document.getElementById('stk_earn_date');
    const convGroup = document.getElementById('stkEarnConvertTypeGroup');
    const convSel = document.getElementById('stk_earn_record_dest');
    const todayStr = this.getTodayISO();
    if (dateInp) dateInp.value = todayStr;

    const datalist = document.getElementById('stockTickersDatalist');
    if (datalist) {
      const tickers = [...new Set((store.data.investments.stocks || []).map(s => s.ticker).filter(Boolean))];
      datalist.innerHTML = tickers.map(t => `<option value="${t}">`).join('');
    }

    const bankSelect = document.getElementById('stk_earn_bank');
    if (bankSelect) {
      const accounts = store.data.accounts || [];
      bankSelect.innerHTML = `<option value="">Selecione o banco (opcional)</option>` + 
        accounts.map(a => `<option value="${a.name}">${a.name}</option>`).join('');
    }

    if (editId) {
      const item = (store.data.investments.stockEarnings || []).find(e => e.id === editId);
      if (item) {
        if (editInp) editInp.value = item.id;
        if (titleEl) titleEl.textContent = `✏️ Editar Provento (${item.ticker})`;
        if (convGroup) convGroup.style.display = 'block';
        if (convSel) convSel.value = 'EARNING';
        document.getElementById('stk_earn_ticker').value = item.ticker || '';
        document.getElementById('stk_earn_type').value = item.type || 'Dividendo';
        if (dateInp) dateInp.value = item.date || todayStr;
        document.getElementById('stk_earn_val').value = formatMoneyDisplay(item.amount);
        if (bankSelect && item.bank) bankSelect.value = item.bank;
        document.getElementById('stk_earn_notes').value = item.notes || '';
      }
    } else {
      if (editInp) editInp.value = '';
      if (titleEl) titleEl.textContent = '💰 Lançar Rendimento / Provento da Bolsa';
      if (convGroup) convGroup.style.display = 'none';
      if (convSel) convSel.value = 'EARNING';
    }
  },

  openModalNovoRendimentoBolsa(editId = null) {
    this.prepareModalNovoRendimentoBolsa(editId);
    const modal = document.getElementById('modalNovoRendimentoBolsa');
    if (modal) {
      modal.classList.add('active');
      document.body.classList.add('modal-open');
    }
  },

  handleSaveRendimentoBolsa(e) {
    if (e && e.preventDefault) e.preventDefault();
    const editId = document.getElementById('stk_earn_edit_id')?.value || '';
    const dest = document.getElementById('stk_earn_record_dest')?.value || 'EARNING';
    const ticker = (document.getElementById('stk_earn_ticker')?.value || '').toUpperCase().trim();
    const type = document.getElementById('stk_earn_type')?.value || 'Dividendo';
    const date = document.getElementById('stk_earn_date')?.value || this.getTodayISO();
    const amount = parseMoney(document.getElementById('stk_earn_val')?.value);
    const bank = document.getElementById('stk_earn_bank')?.value || '';
    const notes = (document.getElementById('stk_earn_notes')?.value || '').trim();

    if (!ticker || amount <= 0) {
      this.showToast('Informe o Ticker e um valor de provento válido.', 'warning');
      return;
    }

    if (editId) {
      if (dest === 'STOCK') {
        store.deleteStockEarning(editId);
        store.addStock({
          ticker,
          type: ticker.endsWith('11') ? 'FII' : 'Ação',
          date,
          shares: 1,
          pricePerShare: amount
        });
        this.showToast(`🔄 Lançamento de ${ticker} (${formatBRL(amount)}) movido para Compras de Ativo!`, 'success');
      } else {
        store.updateStockEarning(editId, { ticker, type, date, amount, bank, notes });
        this.showToast(`✅ Provento de ${ticker} (${formatBRL(amount)}) atualizado!`, 'success');
      }
    } else {
      store.addStockEarning({ ticker, type, date, amount, bank, notes });
      this.showToast(`💰 Provento de ${ticker} (+ ${formatBRL(amount)}) lançado com sucesso!`, 'success');
    }

    this.closeModal('modalNovoRendimentoBolsa');
    document.getElementById('formNovoRendimentoBolsa')?.reset();
    this.renderInvestimentos();
    this.renderResumo();
  },

  prepareModalNovoRendimentoNubank(editId = null) {
    const form = document.getElementById('formNovoRendimentoNubank');
    if (form) form.reset();

    const editInp = document.getElementById('box_earn_edit_id');
    const titleEl = document.getElementById('modalNovoRendimentoNubankTitle');
    const dateInp = document.getElementById('box_earn_date');
    const convGroup = document.getElementById('boxEarnConvertTypeGroup');
    const convSel = document.getElementById('box_earn_record_dest');
    const todayStr = this.getTodayISO();
    if (dateInp) dateInp.value = todayStr;

    const datalist = document.getElementById('nubankBoxesDatalist');
    if (datalist) {
      const boxNames = [...new Set((store.data.investments.nubankBoxes || []).map(b => b.name).filter(Boolean))];
      datalist.innerHTML = boxNames.map(b => `<option value="${b}">`).join('');
    }

    if (editId) {
      const item = (store.data.investments.nubankEarnings || []).find(e => e.id === editId);
      if (item) {
        if (editInp) editInp.value = item.id;
        if (titleEl) titleEl.textContent = `✏️ Editar Rendimento Nubank`;
        if (convGroup) convGroup.style.display = 'block';
        if (convSel) convSel.value = 'EARNING';
        document.getElementById('box_earn_name').value = item.boxName || '';
        const catSel = document.getElementById('box_earn_category');
        if (catSel) catSel.value = item.category || 'Caixinha';
        if (dateInp) dateInp.value = item.date || todayStr;
        document.getElementById('box_earn_val').value = formatMoneyDisplay(item.amount);
        document.getElementById('box_earn_notes').value = item.notes || '';
      }
    } else {
      if (editInp) editInp.value = '';
      if (titleEl) titleEl.textContent = '✨ Lançar Rendimento do Nubank';
      if (convGroup) convGroup.style.display = 'none';
      if (convSel) convSel.value = 'EARNING';
    }
  },

  openModalNovoRendimentoNubank(editId = null) {
    this.prepareModalNovoRendimentoNubank(editId);
    const modal = document.getElementById('modalNovoRendimentoNubank');
    if (modal) {
      modal.classList.add('active');
      document.body.classList.add('modal-open');
    }
  },

  handleSaveRendimentoNubank(e) {
    if (e && e.preventDefault) e.preventDefault();
    const editId = document.getElementById('box_earn_edit_id')?.value || '';
    const dest = document.getElementById('box_earn_record_dest')?.value || 'EARNING';
    const boxName = (document.getElementById('box_earn_name')?.value || '').trim() || 'Rendimento das Caixinhas';
    const category = document.getElementById('box_earn_category')?.value || 'Caixinha';
    const date = document.getElementById('box_earn_date')?.value || this.getTodayISO();
    const amount = parseMoney(document.getElementById('box_earn_val')?.value);
    const notes = (document.getElementById('box_earn_notes')?.value || '').trim();

    if (amount <= 0) {
      this.showToast('Informe um valor válido de rendimento.', 'warning');
      return;
    }

    if (editId) {
      if (dest === 'BOX_CAIXINHA' || dest === 'BOX_SEPARADO') {
        const targetCat = dest === 'BOX_SEPARADO' ? 'Dinheiro Separado' : 'Caixinha';
        store.deleteNubankEarning(editId);
        store.addNubankBox({
          name: boxName,
          category: targetCat,
          date,
          amount,
          notes,
          status: 'Ativo'
        });
        this.showToast(`🔄 Lançamento "${boxName}" (${formatBRL(amount)}) movido para ${targetCat}!`, 'success');
      } else {
        store.updateNubankEarning(editId, { boxName, category, date, amount, notes });
        this.showToast(`✅ Rendimento "${boxName}" (${formatBRL(amount)}) atualizado!`, 'success');
      }
    } else {
      store.addNubankEarning({ boxName, category, date, amount, notes });
      this.showToast(`✨ Rendimento "${boxName}" (+ ${formatBRL(amount)}) cadastrado!`, 'success');
    }

    this.closeModal('modalNovoRendimentoNubank');
    document.getElementById('formNovoRendimentoNubank')?.reset();
    this.renderInvestimentos();
    this.renderResumo();
  },

  // =========================================================================
  // 8. MÓDULO COFRE DE SENHAS
  // =========================================================================
  // =========================================================================
  // 8. MÓDULO COFRE DE SENHAS (PADRÃO EXECUTIVO ACBCSJ - 4 TABELAS)
  // =========================================================================

  ensureInitialPasswords() {
    const defaultBancosCartoes = [
      { id: 'pwd_bc_01', tabela: 'bancos_cartoes', banco: 'Banco do Brasil', tipo_conta: 'Corrente', senha_principal: '498679', letra_auxiliar: '3X-9C-P', login: '', senha: '84253164 / 498679', senha_auxiliar: '', pix: '05202665954', observacoes: '' },
      { id: 'pwd_bc_02', tabela: 'bancos_cartoes', banco: 'Caixa Econômica', tipo_conta: 'Poupança', senha_principal: '4184', letra_auxiliar: 'WA-KU-RA', login: 'raphael3257', senha: 'visual32 / 409601', senha_auxiliar: '', pix: '', observacoes: '' },
      { id: 'pwd_bc_03', tabela: 'bancos_cartoes', banco: 'Caixa Econômica', tipo_conta: 'Corrente', senha_principal: '4986', letra_auxiliar: 'JÁ-FO-XE', login: 'raphael3257', senha: 'A253188a / 409601', senha_auxiliar: '', pix: 'Aleatorio', observacoes: '' },
      { id: 'pwd_bc_04', tabela: 'bancos_cartoes', banco: 'Bradesco', tipo_conta: 'Corrente', senha_principal: '498679', letra_auxiliar: '', login: '', senha: '1027 / 4986', senha_auxiliar: '', pix: '48984041027', observacoes: '' },
      { id: 'pwd_bc_05', tabela: 'bancos_cartoes', banco: 'Nu Bank', tipo_conta: 'Corrente', senha_principal: '4986', letra_auxiliar: 'J602202a!', login: '', senha: '', senha_auxiliar: '', pix: 'raphael_nilsen@hotmail.com', observacoes: '' },
      { id: 'pwd_bc_06', tabela: 'bancos_cartoes', banco: 'Clear Corretora', tipo_conta: 'Investimentos', senha_principal: '498679', letra_auxiliar: 'XMJ7454', login: '', senha: '30571142', senha_auxiliar: '', pix: '', observacoes: '' },
      { id: 'pwd_bc_07', tabela: 'bancos_cartoes', banco: 'Master Card', tipo_conta: 'Cartao Credito', senha_principal: '5031', letra_auxiliar: 'natayan96', login: '', senha: '', senha_auxiliar: '', pix: '', observacoes: '' },
      { id: 'pwd_bc_08', tabela: 'bancos_cartoes', banco: 'Cassol', tipo_conta: 'Cartao Credito', senha_principal: '4986', letra_auxiliar: '', login: '', senha: '', senha_auxiliar: '', pix: '', observacoes: '' },
      { id: 'pwd_bc_09', tabela: 'bancos_cartoes', banco: 'Havan', tipo_conta: 'Cartao Credito', senha_principal: '4184', letra_auxiliar: '', login: '', senha: '', senha_auxiliar: '', pix: '', observacoes: '' },
      { id: 'pwd_bc_10', tabela: 'bancos_cartoes', banco: 'Trio Card', tipo_conta: 'Cartao Credito', senha_principal: '0520', letra_auxiliar: '', login: '05202665954', senha: '602202', senha_auxiliar: '', pix: '', observacoes: '' },
      { id: 'pwd_bc_11', tabela: 'bancos_cartoes', banco: 'trio card ELO', tipo_conta: 'Cartao Credito', senha_principal: '0520', letra_auxiliar: '', login: '', senha: '', senha_auxiliar: '', pix: '', observacoes: '' },
      { id: 'pwd_bc_12', tabela: 'bancos_cartoes', banco: 'Iphone', tipo_conta: 'Celular', senha_principal: '409601', letra_auxiliar: '', login: '', senha: '', senha_auxiliar: '', pix: '', observacoes: '' },
      { id: 'pwd_bc_13', tabela: 'bancos_cartoes', banco: 'B3 Investimentos', tipo_conta: 'Investimentos', senha_principal: 'A253188a!', letra_auxiliar: '', login: '05202665954', senha: '', senha_auxiliar: '', pix: '', observacoes: '' },
      { id: 'pwd_bc_14', tabela: 'bancos_cartoes', banco: 'Cartão Cidadão', tipo_conta: 'Outros', senha_principal: '424184', letra_auxiliar: '', login: '', senha: '', senha_auxiliar: '', pix: '', observacoes: '' }
    ];

    const defaultEmails = [
      { id: 'pwd_em_01', tabela: 'emails', servico: 'Gmail', login: 'nilsenraphael@gmail.com', senha: 'CJ274790a.', senha_auxiliar: 'A253188a!', categoria: 'E-mail', status: 'ativo', observacoes: '' },
      { id: 'pwd_em_02', tabela: 'emails', servico: 'Hotmail', login: 'raphael_nilsen@hotmail.com', senha: 'visual32', senha_auxiliar: 'J602202a!', categoria: 'E-mail', status: 'ativo', observacoes: '' },
      { id: 'pwd_em_03', tabela: 'emails', servico: 'Outlook', login: 'raphael_nilsen@outlook.com', senha: 'CJ904727a.', senha_auxiliar: 'A253188a!', categoria: 'E-mail', status: 'ativo', observacoes: '' },
      { id: 'pwd_em_04', tabela: 'emails', servico: 'Gmail', login: 'cbcsaojose2025@gmail.com', senha: 'CJ274790a.', senha_auxiliar: '', categoria: 'E-mail', status: 'ativo', observacoes: '' },
      { id: 'pwd_em_05', tabela: 'emails', servico: 'Gmail', login: 'rosangelarib1511@gmail.com', senha: 'J602202a!', senha_auxiliar: '', categoria: 'E-mail', status: 'ativo', observacoes: '' },
      { id: 'pwd_em_06', tabela: 'emails', servico: 'Gmail', login: 'KamilahinkelKamila@gmail.com', senha: 'J602202a!', senha_auxiliar: '', categoria: 'E-mail', status: 'ativo', observacoes: '' }
    ];

    const defaultDonaTania = [
      { id: 'pwd_dt_01', tabela: 'dona_tania', servico: 'Gov.br', login: '41776291972', senha: 'CJ274790a.', senha_auxiliar: '', categoria: 'D. Tânia', status: 'ativo', observacoes: '' },
      { id: 'pwd_dt_02', tabela: 'dona_tania', servico: 'Celular', login: '', senha: '3162', senha_auxiliar: '', categoria: 'D. Tânia', status: 'ativo', observacoes: '' },
      { id: 'pwd_dt_03', tabela: 'dona_tania', servico: 'Gmail', login: 'taniamariasilvano@gmail.com', senha: 'J602202a!', senha_auxiliar: '', categoria: 'D. Tânia', status: 'ativo', observacoes: '' },
      { id: 'pwd_dt_04', tabela: 'dona_tania', servico: 'Caixa Economica', login: 'taniamaria3162', senha: 'tania96', senha_auxiliar: '', categoria: 'D. Tânia', status: 'ativo', observacoes: '' },
      { id: 'pwd_dt_05', tabela: 'dona_tania', servico: 'Santander', login: '41776291972', senha: '842531', senha_auxiliar: '', categoria: 'D. Tânia', status: 'ativo', observacoes: '' },
      { id: 'pwd_dt_06', tabela: 'dona_tania', servico: 'Santander Cartao', login: '6875', senha: 'DGC', senha_auxiliar: '', categoria: 'D. Tânia', status: 'ativo', observacoes: '' },
      { id: 'pwd_dt_07', tabela: 'dona_tania', servico: 'Tim', login: '48996286777', senha: '3917', senha_auxiliar: '', categoria: 'D. Tânia', status: 'ativo', observacoes: '' },
      { id: 'pwd_dt_08', tabela: 'dona_tania', servico: 'Itau', login: '842531', senha: '1996', senha_auxiliar: '', categoria: 'D. Tânia', status: 'ativo', observacoes: '' },
      { id: 'pwd_dt_09', tabela: 'dona_tania', servico: 'Personal Card', login: 'J602202a!', senha: '4177', senha_auxiliar: '', categoria: 'D. Tânia', status: 'ativo', observacoes: '' },
      { id: 'pwd_dt_10', tabela: 'dona_tania', servico: 'Vero', login: '41776291972', senha: '253188', senha_auxiliar: '', categoria: 'D. Tânia', status: 'ativo', observacoes: '' },
      { id: 'pwd_dt_11', tabela: 'dona_tania', servico: 'Mercado Brasil Atacadista', login: '41776291972', senha: 'CJ274790a', senha_auxiliar: '', categoria: 'D. Tânia', status: 'ativo', observacoes: '' },
      { id: 'pwd_dt_12', tabela: 'dona_tania', servico: 'Mercado KOCH', login: '41776291972', senha: 'CJ274790a.', senha_auxiliar: '', categoria: 'D. Tânia', status: 'ativo', observacoes: '' },
      { id: 'pwd_dt_13', tabela: 'dona_tania', servico: 'Nubank', login: '3162', senha: '88131760', senha_auxiliar: '', categoria: 'D. Tânia', status: 'ativo', observacoes: '' },
      { id: 'pwd_dt_14', tabela: 'dona_tania', servico: 'Celesc', login: '41776291972', senha: 'J602202a!', senha_auxiliar: '', categoria: 'D. Tânia', status: 'ativo', observacoes: '' }
    ];

    if (!store.data.passwords || store.data.passwords.length === 0) {
      store.data.passwords = [
        ...defaultBancosCartoes,
        ...defaultEmails,
        ...defaultDonaTania,
        // 2. LOGINS e SENHAS DE SITES (Padrão ACBCSJ)
        {
          id: 'pwd_site_1',
          tabela: 'logins_sites',
          servico: 'MERCADO LIVRE',
          url: 'https://www.mercadolivre.com.br',
          categoria: 'Compras / Marketplace',
          login: 'raphael_nilsen@hotmail.com',
          senha: 'ML_Senha@2026',
          status: 'ativo',
          observacoes: 'Compras e entregas com frete Full'
        },
        {
          id: 'pwd_site_2',
          tabela: 'logins_sites',
          servico: 'SHOPEE',
          url: 'https://shopee.com.br',
          categoria: 'Compras / Marketplace',
          login: 'raphael_nilsen@hotmail.com',
          senha: 'Shopee@Pass2026',
          status: 'ativo',
          observacoes: 'Compras de insumos e ferramentas'
        }
      ];
      store.save();
    } else {
      const hasOldDemoBancos = store.data.passwords.some(p => p.id === 'pwd_banco_1' && p.senha_principal === '1234');
      const hasRealBancos = store.data.passwords.some(p => p.id === 'pwd_bc_01');
      const hasOldDemoEmails = store.data.passwords.some(p => p.id === 'pwd_email_1' || p.id === 'pwd_email_2');
      const hasRealEmails = store.data.passwords.some(p => p.id === 'pwd_em_01');
      const hasOldDemoTania = store.data.passwords.some(p => p.id === 'pwd_tania_1');
      const hasRealTania = store.data.passwords.some(p => p.id === 'pwd_dt_01');
      if (hasOldDemoBancos || !hasRealBancos || hasOldDemoEmails || !hasRealEmails || hasOldDemoTania || !hasRealTania) {
        const nonDemo = store.data.passwords.filter(p => !['pwd_banco_1', 'pwd_banco_2', 'pwd_banco_3', 'pwd_banco_4', 'pwd_email_1', 'pwd_email_2', 'pwd_tania_1'].includes(p.id));
        const existingIds = new Set(nonDemo.map(p => p.id));
        const newBcItems = defaultBancosCartoes.filter(p => !existingIds.has(p.id));
        const newEmItems = defaultEmails.filter(p => !existingIds.has(p.id));
        const newDtItems = defaultDonaTania.filter(p => !existingIds.has(p.id));
        store.data.passwords = [...newBcItems, ...newEmItems, ...newDtItems, ...nonDemo];
        store.save();
      }
    }
  },

  getTabelaItem(item) {
    if (item.tabela) return item.tabela;
    const cat = (item.category || item.categoria || '').toLowerCase();
    if (cat.includes('banco') || cat.includes('cart')) return 'bancos_cartoes';
    if (cat.includes('mail')) return 'emails';
    if (cat.includes('tania') || cat.includes('dona')) return 'dona_tania';
    return 'logins_sites';
  },

  setSenhasAba(aba) {
    this.senhasAbaAtiva = aba;
    const abas = ['bancos_cartoes', 'logins_sites', 'emails', 'dona_tania'];
    abas.forEach(a => {
      const btn = document.getElementById(`subtab-btn-${a}`);
      if (btn) {
        if (a === aba) btn.classList.add('active');
        else btn.classList.remove('active');
      }
    });
    this.renderSenhas();
  },

  setSenhasViewMode(mode) {
    this.senhasViewMode = mode;
    const btnTable = document.getElementById('btnViewTableSenhas');
    const btnCards = document.getElementById('btnViewCardsSenhas');
    if (btnTable && btnCards) {
      if (mode === 'table') {
        btnTable.classList.add('active');
        btnCards.classList.remove('active');
      } else {
        btnTable.classList.remove('active');
        btnCards.classList.add('active');
      }
    }
    this.renderSenhas();
  },

  toggleSenhasRevelarTodas() {
    this.senhasRevelarTodas = !this.senhasRevelarTodas;
    const btnTxt = document.getElementById('btnToggleAllSenhasTxt');
    if (btnTxt) {
      btnTxt.textContent = this.senhasRevelarTodas ? 'Ocultar Senhas' : 'Revelar Senhas';
    }
    this.renderSenhas();
    this.showToast(this.senhasRevelarTodas ? '👁️ Todas as senhas foram reveladas.' : '🔒 Senhas ocultadas com segurança.', 'info');
  },

  toggleSenhasRevelarItem(id) {
    if (!this.senhasRevealedIds) this.senhasRevealedIds = new Set();
    if (this.senhasRevealedIds.has(id)) {
      this.senhasRevealedIds.delete(id);
    } else {
      this.senhasRevealedIds.add(id);
    }
    this.renderSenhas();
  },

  toggleFieldVisibility(inputId) {
    const el = document.getElementById(inputId);
    if (!el) return;
    el.type = el.type === 'password' ? 'text' : 'password';
  },

  gerarSenhaAleatoria(targetInputId) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
    let pass = '';
    for (let i = 0; i < 14; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const input = document.getElementById(targetInputId);
    if (input) {
      input.value = pass;
      input.type = 'text';
      this.showToast('🎲 Nova senha segura gerada!', 'success');
    }
  },

  getBadgeBancoClass(bancoNome) {
    const b = (bancoNome || '').toLowerCase();
    if (b.includes('bradesco')) return 'bradesco';
    if (b.includes('nu') || b.includes('nubank')) return 'nubank';
    if (b.includes('brasil') || b.includes('bb')) return 'bb';
    if (b.includes('caixa') || b.includes('cef')) return 'caixa';
    if (b.includes('seven')) return 'seven';
    return '';
  },

  getIconeServico(site, categoria) {
    const nome = (site || '').toUpperCase();
    const cat = (categoria || '').toLowerCase();
    if (nome.includes('GMAIL') || nome.includes('GOOGLE')) return '📧';
    if (nome.includes('OUTLOOK') || nome.includes('HOTMAIL')) return '✉️';
    if (nome.includes('MERCADO LIVRE') || nome.includes('ML')) return '🛒';
    if (nome.includes('SHOPEE')) return '🛍️';
    if (nome.includes('INSTA') || nome.includes('FACEBOOK') || nome.includes('TIKTOK')) return '📱';
    if (nome.includes('INSS') || nome.includes('GOV')) return '🏛️';
    if (nome.includes('BANCO') || nome.includes('BRADESCO') || nome.includes('NUBANK') || nome.includes('CAIXA')) return '🏦';
    if (cat.includes('mail')) return '✉️';
    if (cat.includes('compra')) return '🛒';
    if (cat.includes('social')) return '📱';
    return '🔐';
  },

  exportarSenhasCSV() {
    const list = store.data.passwords || [];
    if (list.length === 0) {
      this.showToast('Nenhuma senha cadastrada para exportar!', 'warning');
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    csvContent += "TABELA;BANCO/SERVICO;TIPO/CATEGORIA;SENHA_PRINCIPAL;LETRA_AUXILIAR;LOGIN/USUARIO;SENHA;SENHA_AUXILIAR;PIX;URL;STATUS;OBSERVACOES\n";

    list.forEach(p => {
      const row = [
        `"${(this.getTabelaItem(p) || '').replace(/"/g, '""')}"`,
        `"${(p.banco || p.servico || p.service || '').replace(/"/g, '""')}"`,
        `"${(p.tipo_conta || p.categoria || p.category || '').replace(/"/g, '""')}"`,
        `"${(p.senha_principal || '').replace(/"/g, '""')}"`,
        `"${(p.letra_auxiliar || '').replace(/"/g, '""')}"`,
        `"${(p.login || p.username || '').replace(/"/g, '""')}"`,
        `"${(p.senha || p.password || '').replace(/"/g, '""')}"`,
        `"${(p.senha_auxiliar || '').replace(/"/g, '""')}"`,
        `"${(p.pix || '').replace(/"/g, '""')}"`,
        `"${(p.url || '').replace(/"/g, '""')}"`,
        `"${(p.status || 'ativo').replace(/"/g, '""')}"`,
        `"${(p.observacoes || p.notes || '').replace(/"/g, '""')}"`
      ].join(";");
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const dataHora = new Date().toISOString().split('T')[0];
    link.setAttribute("download", `Cofre_Senhas_RaphaelNilsen_${dataHora}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.showToast('📥 Backup de senhas exportado em CSV com sucesso!', 'success');
  },

  abrirModalNovaSenhaContextual() {
    if (this.senhasAbaAtiva === 'bancos_cartoes') {
      this.abrirModalNovoBanco();
    } else {
      this.abrirModalNovaSenhaGeral(this.senhasAbaAtiva);
    }
  },

  abrirModalNovoBanco() {
    const form = document.getElementById('formBancoCartao');
    if (form) form.reset();
    const idEl = document.getElementById('banco_id');
    if (idEl) idEl.value = '';
    const titulo = document.getElementById('modalBancoCartaoTitulo');
    if (titulo) titulo.textContent = '🏦 Cadastrar Banco & Cartão';
    this.openModal('modalBancoCartao');
  },

  abrirModalNovaSenhaGeral(tabelaPadrao = 'logins_sites') {
    const form = document.getElementById('formSenhaGeral');
    if (form) form.reset();
    const idEl = document.getElementById('geral_id');
    if (idEl) idEl.value = '';
    const tabEl = document.getElementById('geral_tabela');
    if (tabEl) tabEl.value = tabelaPadrao;
    const stEl = document.getElementById('geral_status');
    if (stEl) stEl.value = 'ativo';
    const titulo = document.getElementById('modalSenhaGeralTitulo');
    if (titulo) titulo.textContent = '🔐 Cadastrar Acesso / Senha';
    this.openModal('modalSenhaGeral');
  },

  editarSenha(id) {
    const item = (store.data.passwords || []).find(p => p.id === id);
    if (!item) {
      this.showToast('Credencial não encontrada.', 'warning');
      return;
    }

    const tab = this.getTabelaItem(item);
    if (tab === 'bancos_cartoes') {
      document.getElementById('banco_id').value = item.id;
      document.getElementById('banco_nome').value = item.banco || item.service || item.servico || '';
      document.getElementById('banco_tipo_conta').value = item.tipo_conta || item.categoria || 'Conta Corrente';
      document.getElementById('banco_senha_principal').value = item.senha_principal || '';
      document.getElementById('banco_letra_auxiliar').value = item.letra_auxiliar || '';
      document.getElementById('banco_login').value = item.login || item.username || '';
      document.getElementById('banco_senha').value = item.senha || item.password || '';
      document.getElementById('banco_senha_auxiliar').value = item.senha_auxiliar || '';
      document.getElementById('banco_pix').value = item.pix || '';
      document.getElementById('banco_obs').value = item.observacoes || item.notes || '';
      document.getElementById('modalBancoCartaoTitulo').textContent = `🏦 Editar: ${item.banco || item.service || 'Banco'}`;
      this.openModal('modalBancoCartao');
    } else {
      document.getElementById('geral_id').value = item.id;
      document.getElementById('geral_tabela').value = tab;
      document.getElementById('geral_servico').value = item.servico || item.service || item.banco || '';
      document.getElementById('geral_categoria').value = item.categoria || item.category || '';
      document.getElementById('geral_status').value = item.status || 'ativo';
      document.getElementById('geral_login').value = item.login || item.username || '';
      document.getElementById('geral_senha').value = item.senha || item.password || '';
      const auxEl = document.getElementById('geral_senha_auxiliar');
      if (auxEl) auxEl.value = item.senha_auxiliar || '';
      document.getElementById('geral_url').value = item.url || '';
      document.getElementById('geral_obs').value = item.observacoes || item.notes || '';
      document.getElementById('modalSenhaGeralTitulo').textContent = `🔐 Editar: ${item.servico || item.service || 'Acesso'}`;
      this.openModal('modalSenhaGeral');
    }
  },

  renderSenhas() {
    const container = document.getElementById('passwordsListContainer');
    if (!container) return;

    this.ensureInitialPasswords();
    if (!this.senhasAbaAtiva) this.senhasAbaAtiva = 'bancos_cartoes';
    if (!this.senhasRevealedIds) this.senhasRevealedIds = new Set();
    if (!this.senhasViewMode) {
      this.senhasViewMode = (typeof window !== 'undefined' && window.innerWidth <= 768) ? 'cards' : 'table';
    }

    // Sincroniza estado visual dos botões do alternador Tabela / Cards
    const btnTable = document.getElementById('btnViewTableSenhas');
    const btnCards = document.getElementById('btnViewCardsSenhas');
    if (btnTable && btnCards) {
      if (this.senhasViewMode === 'cards') {
        btnCards.classList.add('active');
        btnTable.classList.remove('active');
      } else {
        btnTable.classList.add('active');
        btnCards.classList.remove('active');
      }
    }

    const allPasswords = store.data.passwords || [];
    const pwdTabs = store.getSystemGroups()?.passwordTabs || [
      { id: 'bancos_cartoes', name: 'Bancos & Cartões', icon: '🏦' },
      { id: 'logins_sites', name: 'Sites & Logins', icon: '🌐' },
      { id: 'emails', name: 'E-mails', icon: '✉️' },
      { id: 'dona_tania', name: 'D. Tânia', icon: '👵' }
    ];
    if (!pwdTabs.some(t => t.id === this.senhasAbaAtiva) && pwdTabs.length > 0) {
      this.senhasAbaAtiva = pwdTabs[0].id;
    }

    // Renderiza dinamicamente as abas do Cofre de Senhas conforme configurado no sistema
    const navSubtabs = document.querySelector('#view-senhas .senhas-subtabs-nav');
    if (navSubtabs) {
      navSubtabs.innerHTML = pwdTabs.map(t => {
        const cnt = allPasswords.filter(p => this.getTabelaItem(p) === t.id).length;
        const isAct = this.senhasAbaAtiva === t.id ? 'active' : '';
        return `
          <button type="button" id="subtab-btn-${escapeHtml(t.id)}" class="senhas-subtab-btn ${isAct}" onclick="app.setSenhasAba('${escapeHtml(t.id)}')">
            <span>${escapeHtml(t.icon || '🔐')} ${escapeHtml(t.name)}</span>
            <span class="senhas-tab-count">${cnt}</span>
          </button>
        `;
      }).join('');
    }

    // Contagens
    const countBancos = allPasswords.filter(p => this.getTabelaItem(p) === 'bancos_cartoes').length;
    const countSites = allPasswords.filter(p => this.getTabelaItem(p) === 'logins_sites').length;
    const countOthers = allPasswords.filter(p => this.getTabelaItem(p) !== 'bancos_cartoes' && this.getTabelaItem(p) !== 'logins_sites').length;

    // Atualiza contadores no DOM
    const elTot = document.getElementById('metricTotalSenhas');
    const elBancos = document.getElementById('metricBancosCartoes');
    const elSites = document.getElementById('metricSitesLogins');
    const elEmailsTania = document.getElementById('metricEmailsTania');
    if (elTot) elTot.textContent = allPasswords.length;
    if (elBancos) elBancos.textContent = countBancos;
    if (elSites) elSites.textContent = countSites;
    if (elEmailsTania) elEmailsTania.textContent = countOthers;

    const search = (document.getElementById('pwdSearchInput')?.value || '').toLowerCase().trim();
    let filtered = allPasswords.filter(p => this.getTabelaItem(p) === this.senhasAbaAtiva);

    if (search) {
      filtered = filtered.filter(p => {
        const banco = (p.banco || p.service || p.servico || '').toLowerCase();
        const tipo = (p.tipo_conta || p.categoria || p.category || '').toLowerCase();
        const login = (p.login || p.username || '').toLowerCase();
        const pix = (p.pix || '').toLowerCase();
        const obs = (p.observacoes || p.notes || '').toLowerCase();
        const url = (p.url || '').toLowerCase();
        return banco.includes(search) || tipo.includes(search) || login.includes(search) || pix.includes(search) || obs.includes(search) || url.includes(search);
      });
    }

    if (filtered.length === 0) {
      const currentTabObj = pwdTabs.find(t => t.id === this.senhasAbaAtiva);
      const abaTitle = currentTabObj ? currentTabObj.name : 'Cofre';
      container.innerHTML = `
        <div style="text-align: center; color: var(--text-muted); padding: 3rem 1rem; background: var(--bg-surface); border-radius: var(--radius-lg); border: 1px dashed var(--border-strong);">
          <div style="font-size: 2.2rem; margin-bottom: 0.5rem;">🔐</div>
          <h4 style="font-weight: 700; color: var(--navy); margin-bottom: 0.35rem;">Nenhum registro encontrado em ${escapeHtml(abaTitle)}</h4>
          <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1.25rem;">
            ${search ? 'Nenhum resultado corresponde à sua pesquisa.' : 'Adicione a primeira credencial clicando no botão abaixo.'}
          </p>
          <button class="btn-primary" style="width: auto; padding: 0.5rem 1.25rem;" onclick="app.abrirModalNovaSenhaContextual()">
            + Adicionar Registro
          </button>
        </div>
      `;
      return;
    }

    // RENDERIZAÇÃO EM MODO CARDS (OTIMIZADO PARA MOBILE E VISUAL MODERNO)
    if (this.senhasViewMode === 'cards') {
      let cardsHtml = '<div class="senhas-cards-grid">';
      filtered.forEach(p => {
        const isRevealed = this.senhasRevelarTodas || this.senhasRevealedIds.has(p.id);
        const isBanco = this.senhasAbaAtiva === 'bancos_cartoes';
        const icone = isBanco ? '🏦' : this.getIconeServico(p.servico || p.service || p.banco, p.categoria);
        const titulo = p.banco || p.servico || p.service || 'Credencial';
        const sub = p.tipo_conta || p.categoria || p.category || 'Geral';
        const status = (p.status || 'ativo').toLowerCase();

        cardsHtml += `
          <div class="senhas-card-item">
            <div class="senhas-card-header">
              <div style="display:flex; align-items:center; gap:0.65rem;">
                <span style="font-size:1.5rem;">${icone}</span>
                <div>
                  <h4 style="font-size:1.05rem; font-weight:800; color:var(--text-white); margin-bottom:0.2rem;">${escapeHtml(titulo)}</h4>
                  <span class="status-badge neutral" style="font-size:0.72rem;">${escapeHtml(sub)}</span>
                </div>
              </div>
              <div style="display:flex; gap:0.35rem;">
                <button class="btn-table-icon" title="Editar" onclick="app.editarSenha('${p.id}')">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                </button>
                <button class="btn-table-icon delete" title="Excluir" onclick="app.deletePassword('${p.id}')">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
              </div>
            </div>

            <div class="senhas-card-body">
              ${isBanco ? `
                <div class="senhas-card-row">
                  <span class="senhas-card-label">Senha Principal:</span>
                  <div class="credential-box password-box">
                    <span class="credential-text font-mono">${isRevealed ? escapeHtml(p.senha_principal || '-') : (p.senha_principal ? '••••••••' : '-')}</span>
                    ${p.senha_principal ? `
                      <button type="button" class="btn-eye-mini" onclick="app.toggleSenhasRevelarItem('${p.id}')" title="Ver / Ocultar">👁️</button>
                      <button type="button" class="btn-copy-mini" onclick="app.copyToClipboard('${escapeHtml(p.senha_principal)}', 'Senha principal copiada!')" title="Copiar">📋</button>
                    ` : ''}
                  </div>
                </div>
                ${p.letra_auxiliar ? `
                  <div class="senhas-card-row">
                    <span class="senhas-card-label">Letra / Auxiliar:</span>
                    <div class="credential-box password-box">
                      <span class="credential-text font-mono">${isRevealed ? escapeHtml(p.letra_auxiliar) : '••••••••'}</span>
                      <button type="button" class="btn-eye-mini" onclick="app.toggleSenhasRevelarItem('${p.id}')" title="Ver / Ocultar">👁️</button>
                      <button type="button" class="btn-copy-mini" onclick="app.copyToClipboard('${escapeHtml(p.letra_auxiliar)}', 'Letra auxiliar copiada!')" title="Copiar">📋</button>
                    </div>
                  </div>
                ` : ''}
                <div class="senhas-card-row">
                  <span class="senhas-card-label">Login / Conta:</span>
                  <div class="credential-box">
                    <span class="credential-text">${escapeHtml(p.login || p.username || '-')}</span>
                    ${(p.login || p.username) ? `
                      <button type="button" class="btn-copy-mini" onclick="app.copyToClipboard('${escapeHtml(p.login || p.username)}', 'Login copiado!')" title="Copiar">📋</button>
                    ` : ''}
                  </div>
                </div>
                <div class="senhas-card-row">
                  <span class="senhas-card-label">Senha App / Web:</span>
                  <div class="credential-box password-box">
                    <span class="credential-text font-mono">${isRevealed ? escapeHtml(p.senha || p.password || '-') : (p.senha || p.password ? '••••••••' : '-')}</span>
                    ${(p.senha || p.password) ? `
                      <button type="button" class="btn-eye-mini" onclick="app.toggleSenhasRevelarItem('${p.id}')" title="Ver / Ocultar">👁️</button>
                      <button type="button" class="btn-copy-mini" onclick="app.copyToClipboard('${escapeHtml(p.senha || p.password)}', 'Senha copiada!')" title="Copiar">📋</button>
                    ` : ''}
                  </div>
                </div>
                ${p.senha_auxiliar ? `
                  <div class="senhas-card-row">
                    <span class="senhas-card-label">Senha Cartão / Token:</span>
                    <div class="credential-box password-box">
                      <span class="credential-text font-mono">${isRevealed ? escapeHtml(p.senha_auxiliar) : '••••••••'}</span>
                      <button type="button" class="btn-eye-mini" onclick="app.toggleSenhasRevelarItem('${p.id}')" title="Ver / Ocultar">👁️</button>
                      <button type="button" class="btn-copy-mini" onclick="app.copyToClipboard('${escapeHtml(p.senha_auxiliar)}', 'Senha auxiliar copiada!')" title="Copiar">📋</button>
                    </div>
                  </div>
                ` : ''}
                ${p.pix ? `
                  <div class="senhas-card-row">
                    <span class="senhas-card-label">Chave PIX:</span>
                    <div class="credential-box">
                      <span class="credential-text" style="color:#60a5fa;">${escapeHtml(p.pix)}</span>
                      <button type="button" class="btn-copy-mini" onclick="app.copyToClipboard('${escapeHtml(p.pix)}', 'Chave PIX copiada!')" title="Copiar PIX">📋</button>
                    </div>
                  </div>
                ` : ''}
              ` : `
                <div class="senhas-card-row">
                  <span class="senhas-card-label">Login / Usuário:</span>
                  <div class="credential-box">
                    <span class="credential-text">${escapeHtml(p.login || p.username || '-')}</span>
                    ${(p.login || p.username) ? `
                      <button type="button" class="btn-copy-mini" onclick="app.copyToClipboard('${escapeHtml(p.login || p.username)}', 'Login copiado!')" title="Copiar">📋</button>
                    ` : ''}
                  </div>
                </div>
                <div class="senhas-card-row">
                  <span class="senhas-card-label">Senha:</span>
                  <div class="credential-box password-box">
                    <span class="credential-text font-mono">${isRevealed ? escapeHtml(p.senha || p.password || '-') : (p.senha || p.password ? '••••••••' : '-')}</span>
                    ${(p.senha || p.password) ? `
                      <button type="button" class="btn-eye-mini" onclick="app.toggleSenhasRevelarItem('${p.id}')" title="Ver / Ocultar">👁️</button>
                      <button type="button" class="btn-copy-mini" onclick="app.copyToClipboard('${escapeHtml(p.senha || p.password)}', 'Senha copiada!')" title="Copiar">📋</button>
                    ` : ''}
                  </div>
                </div>
                ${p.senha_auxiliar ? `
                  <div class="senhas-card-row">
                    <span class="senhas-card-label">Senha Auxiliar:</span>
                    <div class="credential-box password-box">
                      <span class="credential-text font-mono">${isRevealed ? escapeHtml(p.senha_auxiliar) : '••••••••'}</span>
                      <button type="button" class="btn-eye-mini" onclick="app.toggleSenhasRevelarItem('${p.id}')" title="Ver / Ocultar">👁️</button>
                      <button type="button" class="btn-copy-mini" onclick="app.copyToClipboard('${escapeHtml(p.senha_auxiliar)}', 'Senha auxiliar copiada!')" title="Copiar">📋</button>
                    </div>
                  </div>
                ` : ''}
                <div class="senhas-card-row">
                  <span class="senhas-card-label">Status:</span>
                  <span class="badge-status ${status}">${status === 'ativo' ? 'Ativo' : status === 'desuso' ? 'Em Desuso' : 'Revisão'}</span>
                </div>
                ${p.url ? `
                  <div class="senhas-card-row">
                    <span class="senhas-card-label">Acesso:</span>
                    <a href="${escapeHtml(p.url)}" target="_blank" rel="noopener noreferrer" style="font-size:0.75rem; color:#60a5fa;">Abrir Site ↗</a>
                  </div>
                ` : ''}
              `}
            </div>

            ${(p.observacoes || p.notes) ? `
              <div style="font-size:0.75rem; color:var(--text-muted); background:var(--bg-surface-elevated); padding:0.4rem 0.65rem; border-radius:var(--radius-sm);">
                <strong>Obs:</strong> ${escapeHtml(p.observacoes || p.notes)}
              </div>
            ` : ''}
          </div>
        `;
      });
      cardsHtml += '</div>';
      container.innerHTML = cardsHtml;
      return;
    }

    // RENDERIZAÇÃO EM MODO TABELA (PADRÃO ACBCSJ)
    let tableHtml = '<div class="senhas-table-wrapper"><table class="senhas-table senhas-table-bancos">';

    if (this.senhasAbaAtiva === 'bancos_cartoes') {
      // CABEÇALHO EXATO CONFORME TABELA BANCOS E CARTÕES DO USUÁRIO
      tableHtml += `
        <thead>
          <tr>
            <th>BANCO / APP</th>
            <th>TIPO CONTA</th>
            <th>SENHA PRINCIPAL</th>
            <th>LETRAS OU SENHA AUXILIAR</th>
            <th>LOGIN</th>
            <th>OUTRAS SENHAS</th>
            <th>PIX</th>
            <th style="text-align:center;">AÇÕES</th>
          </tr>
        </thead>
        <tbody>
      `;

      const getTipoContaStyle = (tipo) => {
        const t = (tipo || '').toLowerCase();
        if (t.includes('corrente')) return 'background: rgba(16, 185, 129, 0.22); color: #6ee7b7; border: 1px solid rgba(16, 185, 129, 0.35);';
        if (t.includes('poupan')) return 'background: rgba(59, 130, 246, 0.25); color: #93c5fd; border: 1px solid rgba(59, 130, 246, 0.4);';
        if (t.includes('investimento')) return 'background: rgba(148, 163, 184, 0.22); color: #e2e8f0; border: 1px solid rgba(148, 163, 184, 0.35);';
        if (t.includes('cartao') || t.includes('cartão') || t.includes('credito') || t.includes('crédito')) return 'background: rgba(217, 119, 6, 0.25); color: #fcd34d; border: 1px solid rgba(217, 119, 6, 0.4);';
        if (t.includes('celular')) return 'background: rgba(139, 92, 246, 0.25); color: #c4b5fd; border: 1px solid rgba(139, 92, 246, 0.4);';
        if (t.includes('outro')) return 'background: rgba(194, 65, 12, 0.25); color: #fdba74; border: 1px solid rgba(194, 65, 12, 0.4);';
        return 'background: rgba(148, 163, 184, 0.18); color: #cbd5e1; border: 1px solid rgba(148, 163, 184, 0.3);';
      };

      const getPixStyle = (pix) => {
        const px = (pix || '').toLowerCase();
        if (px.includes('aleatorio') || px.includes('aleatório')) return 'background: rgba(194, 65, 12, 0.28); color: #fdba74; border: 1px solid rgba(194, 65, 12, 0.4);';
        if (px.includes('@')) return 'background: rgba(148, 163, 184, 0.22); color: #e2e8f0; border: 1px solid rgba(148, 163, 184, 0.35);';
        if (px.startsWith('48') || px.length === 10) return 'background: rgba(220, 38, 38, 0.25); color: #fca5a5; border: 1px solid rgba(220, 38, 38, 0.4);';
        return 'background: rgba(139, 92, 246, 0.25); color: #c4b5fd; border: 1px solid rgba(139, 92, 246, 0.4);';
      };

      filtered.forEach(p => {
        const isRevealed = this.senhasRevelarTodas || this.senhasRevealedIds.has(p.id);
        const badgeClass = this.getBadgeBancoClass(p.banco || p.service || p.servico);
        const outrasSenhasVal = [p.senha || p.password, p.senha_auxiliar].filter(Boolean).join(' / ');
        const tipoContaLabel = p.tipo_conta || p.categoria || 'Corrente';

        tableHtml += `
          <tr>
            <!-- 1. BANCO / APP -->
            <td>
              <div style="display:flex; align-items:center; gap:0.4rem;">
                <span class="badge-bank ${badgeClass}" style="font-weight:700;">${escapeHtml(p.banco || p.service || p.servico || 'Banco')}</span>
              </div>
              ${p.observacoes ? `<div style="font-size:0.7rem; color:var(--text-muted); margin-top:0.2rem; line-height:1.2;">${escapeHtml(p.observacoes)}</div>` : ''}
            </td>

            <!-- 2. TIPO CONTA -->
            <td>
              <span style="font-size:0.75rem; font-weight:600; padding:0.2rem 0.55rem; border-radius:4px; line-height:1.2; display:inline-block; ${getTipoContaStyle(tipoContaLabel)}">
                ${escapeHtml(tipoContaLabel)}
              </span>
            </td>

            <!-- 3. SENHA PRINCIPAL -->
            <td>
              <div class="credential-box password-box">
                <span class="credential-text font-mono">${isRevealed ? escapeHtml(p.senha_principal || '-') : (p.senha_principal ? '••••••••' : '-')}</span>
                ${p.senha_principal ? `
                  <button type="button" class="btn-eye-mini" onclick="app.toggleSenhasRevelarItem('${p.id}')" title="Ver / Ocultar">👁️</button>
                  <button type="button" class="btn-copy-mini" onclick="app.copyToClipboard('${escapeHtml(p.senha_principal)}', 'Senha principal copiada!')" title="Copiar Senha Principal">📋</button>
                ` : ''}
              </div>
            </td>

            <!-- 4. LETRAS OU SENHA AUXILIAR -->
            <td>
              <div class="credential-box password-box">
                <span class="credential-text font-mono">${isRevealed ? escapeHtml(p.letra_auxiliar || '-') : (p.letra_auxiliar ? '••••••••' : '-')}</span>
                ${p.letra_auxiliar ? `
                  <button type="button" class="btn-eye-mini" onclick="app.toggleSenhasRevelarItem('${p.id}')" title="Ver / Ocultar">👁️</button>
                  <button type="button" class="btn-copy-mini" onclick="app.copyToClipboard('${escapeHtml(p.letra_auxiliar)}', 'Letra/Senha auxiliar copiada!')" title="Copiar Letra/Senha Auxiliar">📋</button>
                ` : ''}
              </div>
            </td>

            <!-- 5. LOGIN -->
            <td>
              <div class="credential-box">
                <span class="credential-text">${escapeHtml(p.login || p.username || '-')}</span>
                ${p.login || p.username ? `
                  <button type="button" class="btn-copy-mini" onclick="app.copyToClipboard('${escapeHtml(p.login || p.username)}', 'Login copiado!')" title="Copiar Login">📋</button>
                ` : ''}
              </div>
            </td>

            <!-- 6. OUTRAS SENHAS -->
            <td>
              <div class="credential-box password-box">
                <span class="credential-text font-mono">${isRevealed ? escapeHtml(outrasSenhasVal || '-') : (outrasSenhasVal ? '••••••••' : '-')}</span>
                ${outrasSenhasVal ? `
                  <button type="button" class="btn-eye-mini" onclick="app.toggleSenhasRevelarItem('${p.id}')" title="Ver / Ocultar">👁️</button>
                  <button type="button" class="btn-copy-mini" onclick="app.copyToClipboard('${escapeHtml(outrasSenhasVal)}', 'Outras senhas copiadas!')" title="Copiar Outras Senhas">📋</button>
                ` : ''}
              </div>
            </td>

            <!-- 7. PIX -->
            <td>
              ${p.pix ? `
                <div class="credential-box" style="gap:0.35rem;">
                  <span style="font-size:0.75rem; font-weight:600; padding:0.18rem 0.5rem; border-radius:4px; display:inline-block; ${getPixStyle(p.pix)}">${escapeHtml(p.pix)}</span>
                  <button type="button" class="btn-copy-mini" onclick="app.copyToClipboard('${escapeHtml(p.pix)}', 'Chave PIX copiada!')" title="Copiar Chave PIX">📋</button>
                </div>
              ` : `<span style="color:var(--text-muted);">-</span>`}
            </td>

            <!-- AÇÕES -->
            <td style="text-align:center;">
              <div style="display:flex; gap:0.4rem; justify-content:center;">
                <button class="btn-table-icon" title="Editar" onclick="app.editarSenha('${p.id}')">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                </button>
                <button class="btn-table-icon delete" title="Excluir" onclick="app.deletePassword('${p.id}')">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
              </div>
            </td>
          </tr>
        `;
      });
    } else {
      // TABELAS DE SITES, EMAILS E DONA TANIA
      tableHtml += `
        <thead>
          <tr>
            <th>SITE / APP</th>
            <th>LOGIN</th>
            <th>SENHA</th>
            <th>SENHA AUXILIAR</th>
            <th>STATUS</th>
            <th>OBSERVAÇÕES</th>
            <th style="text-align:center;">AÇÕES</th>
          </tr>
        </thead>
        <tbody>
      `;

      filtered.forEach(p => {
        const isRevealed = this.senhasRevelarTodas || this.senhasRevealedIds.has(p.id);
        const icone = this.getIconeServico(p.servico || p.service || p.banco, p.categoria);
        const status = (p.status || 'ativo').toLowerCase();
        const statusLabel = status === 'ativo' ? 'Ativo' : status === 'desuso' ? 'Em Desuso' : 'Revisão';

        tableHtml += `
          <tr>
            <!-- 1. SITE / APP -->
            <td>
              <div style="display:flex; align-items:center; gap:0.6rem;">
                <span style="font-size:1.3rem;">${icone}</span>
                <div>
                  <strong style="color:var(--text-white); font-size:0.9rem;">${escapeHtml(p.servico || p.service || p.banco || 'Acesso')}</strong>
                  <div style="display:flex; gap:0.4rem; align-items:center; margin-top:0.2rem;">
                    <span class="status-badge neutral" style="font-size:0.7rem; padding:0.15rem 0.4rem;">${escapeHtml(p.categoria || p.category || 'Geral')}</span>
                    ${p.url ? `<a href="${escapeHtml(p.url)}" target="_blank" rel="noopener noreferrer" style="font-size:0.75rem; color:#60a5fa; text-decoration:none;">Abrir Site ↗</a>` : ''}
                  </div>
                </div>
              </div>
            </td>

            <!-- 2. LOGIN -->
            <td>
              <div class="credential-box">
                <span class="credential-text">${escapeHtml(p.login || p.username || '-')}</span>
                ${p.login || p.username ? `
                  <button type="button" class="btn-copy-mini" onclick="app.copyToClipboard('${escapeHtml(p.login || p.username)}', 'Login copiado!')" title="Copiar Login">📋</button>
                ` : ''}
              </div>
            </td>

            <!-- 3. SENHA -->
            <td>
              <div class="credential-box password-box">
                <span class="credential-text font-mono">${isRevealed ? escapeHtml(p.senha || p.password || '-') : (p.senha || p.password ? '••••••••' : '-')}</span>
                ${p.senha || p.password ? `
                  <button type="button" class="btn-eye-mini" onclick="app.toggleSenhasRevelarItem('${p.id}')" title="Ver / Ocultar">👁️</button>
                  <button type="button" class="btn-copy-mini" onclick="app.copyToClipboard('${escapeHtml(p.senha || p.password)}', 'Senha copiada!')" title="Copiar Senha">📋</button>
                ` : ''}
              </div>
            </td>

            <!-- 4. SENHA AUXILIAR -->
            <td>
              <div class="credential-box password-box">
                <span class="credential-text font-mono">${isRevealed ? escapeHtml(p.senha_auxiliar || '-') : (p.senha_auxiliar ? '••••••••' : '-')}</span>
                ${p.senha_auxiliar ? `
                  <button type="button" class="btn-eye-mini" onclick="app.toggleSenhasRevelarItem('${p.id}')" title="Ver / Ocultar">👁️</button>
                  <button type="button" class="btn-copy-mini" onclick="app.copyToClipboard('${escapeHtml(p.senha_auxiliar)}', 'Senha auxiliar copiada!')" title="Copiar Senha Auxiliar">📋</button>
                ` : ''}
              </div>
            </td>

            <!-- 5. STATUS -->
            <td>
              <span class="badge-status ${status}">${statusLabel}</span>
            </td>

            <!-- 5. OBSERVAÇÕES -->
            <td>
              <div style="font-size:0.8rem; color:var(--text-muted); max-width:260px; overflow:hidden; text-overflow:ellipsis;">
                ${escapeHtml(p.observacoes || p.notes || '-')}
              </div>
            </td>

            <!-- AÇÕES -->
            <td style="text-align:center;">
              <div style="display:flex; gap:0.4rem; justify-content:center;">
                <button class="btn-table-icon" title="Editar" onclick="app.editarSenha('${p.id}')">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                </button>
                <button class="btn-table-icon delete" title="Excluir" onclick="app.deletePassword('${p.id}')">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
              </div>
            </td>
          </tr>
        `;
      });
    }

    tableHtml += '</tbody></table></div>';
    container.innerHTML = tableHtml;
  },

  deletePassword(id) {
    if (confirm('Deseja excluir esta credencial do cofre com segurança?')) {
      store.deletePassword(id);
      this.renderSenhas();
      this.showToast('Credencial removida.', 'info');
    }
  },

  copyToClipboard(text, successMsg) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      this.showToast(successMsg, 'success');
    }).catch(() => {
      prompt('Copie o texto abaixo:', text);
    });
  },

  // =========================================================================
  // GERENCIADOR DE MODAIS
  // =========================================================================
  ensureDefaultDatesInModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    const todayStr = this.getTodayISO();
    const monthDateStr = this.getDefaultDateForMonth(this.activeMonth);
    const todayDay = String(new Date().getDate());

    if (modalId === 'modalNovaReceita') {
      const revDate = document.getElementById('rev_date');
      if (revDate && !revDate.value) revDate.value = monthDateStr;
    } else if (modalId === 'modalConfirmarRecebimento') {
      const payDate = document.getElementById('pay_rev_date');
      if (payDate && !payDate.value) payDate.value = monthDateStr;
    } else if (modalId === 'modalEditarReceita') {
      const editRevDate = document.getElementById('edit_rev_date');
      const editM = Number(document.getElementById('edit_rev_month')?.value) || this.activeMonth;
      if (editRevDate && !editRevDate.value) editRevDate.value = this.getDefaultDateForMonth(editM);
    } else if (modalId === 'modalNovaDespesaFixa') {
      const fixDay = document.getElementById('fix_due_day');
      if (fixDay && !fixDay.value) fixDay.value = todayDay;
    } else if (modalId === 'modalEditarDespesaFixa') {
      const editFixDay = document.getElementById('edit_fix_due_day');
      if (editFixDay && !editFixDay.value) editFixDay.value = todayDay;
    } else if (modalId === 'modalNovaDespesaVariavel') {
      const varDate = document.getElementById('var_date');
      if (varDate) varDate.value = monthDateStr;
    } else if (modalId === 'modalNovaCompraCartao') {
      const cardDate = document.getElementById('card_date');
      if (cardDate && !cardDate.value) {
        cardDate.value = todayStr;
        this.updateCardStartBillingSuggestion();
      }
    }

    // Garante que qualquer campo <input type="date"> dentro do modal tenha data pré-configurada se estiver vazio
    modal.querySelectorAll('input[type="date"]').forEach(inp => {
      if (inp.id === 'ff_date_pay') {
        const statusSel = document.getElementById('ff_status');
        if (statusSel && statusSel.value !== 'Pago') return;
      }
      if (!inp.value) {
        const isMonthScoped = (inp.id === 'rev_date' || inp.id === 'var_date' || inp.id === 'pay_rev_date' || inp.id === 'edit_rev_date');
        inp.value = isMonthScoped ? monthDateStr : todayStr;
      }
    });
  },

  openModal(modalId) {
    this.populateSystemSelects();
    if (modalId === 'modalNovoAtivoBolsa') {
      this.openModalNovoAtivoBolsa();
      return;
    }
    if (modalId === 'modalNovaCaixinhaNubank') {
      this.openModalNovaCaixinhaNubank();
      return;
    }
    const modal = document.getElementById(modalId);
    if (modal) {
      if (modalId === 'modalConfigSupabase') {
        this.updateSupabaseModalUI();
      } else if (modalId === 'modalNovoRendimentoBolsa') {
        this.prepareModalNovoRendimentoBolsa();
      } else if (modalId === 'modalNovoRendimentoNubank') {
        this.prepareModalNovoRendimentoNubank();
      } else if (modalId === 'modalNovoSonho') {
        this.prepararModalNovoSonho();
      }
      this.ensureDefaultDatesInModal(modalId);
      modal.classList.add('active');
      document.body.classList.add('modal-open');
    }
  },

  prepararModalNovoSonho() {
    const form = document.getElementById('formNovoSonho');
    if (form) form.reset();
    const dreamDate = document.getElementById('dream_date');
    if (dreamDate) dreamDate.value = this.getTodayISO();
    const prev = document.getElementById('dreamImagePreviewContainer');
    if (prev) prev.style.display = 'none';
    const hidden = document.getElementById('dream_image_url');
    if (hidden) hidden.value = '';
    const customDiv = document.getElementById('dreamCustomImageDiv');
    if (customDiv) customDiv.style.display = 'none';
  },

  updateSupabaseModalUI() {
    const sbConfig = store.data.settings?.supabase;
    const isConfigured = typeof supabaseService !== 'undefined' && supabaseService.isConfigured();
    const urlInput = document.getElementById('sb_url');
    const keyInput = document.getElementById('sb_key');
    const badge = document.getElementById('sbStatusBadge');
    const details = document.getElementById('sbStatusDetails');

    if (urlInput && sbConfig?.url) urlInput.value = sbConfig.url;
    if (keyInput && sbConfig?.anonKey) keyInput.value = sbConfig.anonKey;

    if (badge) {
      if (!isConfigured) {
        badge.className = 'badge-pill-counter orange';
        badge.textContent = '● Não Configurado';
      } else if (supabaseService.lastError) {
        badge.className = 'badge-pill-counter orange';
        badge.textContent = '● Instável / Falha Recente';
      } else {
        badge.className = 'badge-pill-counter green';
        badge.textContent = '● Conectado e Ativo';
      }
    }

    if (details) {
      const lastSync = store.data.settings?.lastSync;
      const lastErr = supabaseService?.lastError;
      if (lastErr) {
        details.innerHTML = `<span style="color:#f87171;">⚠️ Última ocorrência:</span> ${lastErr}<br><small style="color:var(--text-muted);">Dica: O projeto pode estar acordando do modo repouso gratuito do Supabase. Clique em "Testar Agora" para verificar.</small>`;
      } else if (lastSync) {
        const d = new Date(lastSync);
        details.textContent = `Última sincronização com sucesso: ${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR')}`;
      } else {
        details.textContent = isConfigured ? 'Pronto para sincronizar com a nuvem.' : 'Informe as credenciais do seu projeto Supabase.';
      }
    }
  },

  async testSupabaseConnectionNow() {
    const btn = document.getElementById('btnTestSbConnection');
    const details = document.getElementById('sbStatusDetails');
    const badge = document.getElementById('sbStatusBadge');
    
    if (btn) {
      btn.disabled = true;
      btn.textContent = '⏳ Testando...';
    }
    if (details) {
      details.textContent = 'Enviando teste de ping ao servidor Supabase...';
    }

    const res = await supabaseService.testConnection();
    if (btn) {
      btn.disabled = false;
      btn.textContent = '⚡ Testar Agora';
    }

    if (res.ok) {
      this.showToast(`✅ Conexão excelente com Supabase! (${res.latency}ms)`, 'success');
      this.setCloudSyncing(false, true, store.data.settings.lastSync);
      this.updateSupabaseModalUI();
    } else {
      this.showToast(`⚠️ Supabase: ${res.error}`, 'warning');
      this.updateSupabaseModalUI();
    }
  },

  openModalNovaCompraCartao() {
    const form = document.getElementById('formNovaCompraCartao');
    if (form) form.reset();

    const dateInp = document.getElementById('card_date');
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    if (dateInp) {
      dateInp.value = todayStr;
    }

    this.updateCardStartBillingSuggestion();
    this.openModal('modalNovaCompraCartao');
  },

  updateCardStartBillingSuggestion() {
    const dateInp = document.getElementById('card_date');
    const cardSelect = document.getElementById('card_type');
    const mSelect = document.getElementById('card_start_month');
    const ySelect = document.getElementById('card_start_year');
    const hintEl = document.getElementById('card_billing_hint');

    if (!dateInp || !mSelect || !ySelect) return;

    let dYear = Number(store.activeYear) || new Date().getFullYear();
    let dMonth = new Date().getMonth() + 1;
    let dDay = new Date().getDate();

    if (dateInp.value) {
      const parts = dateInp.value.split('-');
      if (parts.length >= 2) {
        dYear = parseInt(parts[0], 10) || dYear;
        dMonth = parseInt(parts[1], 10) || dMonth;
        if (parts.length >= 3) dDay = parseInt(parts[2], 10) || dDay;
      }
    }

    const cardName = cardSelect ? cardSelect.value : 'Mastercard';
    const cardObj = (store.data.creditCards || store.data.cards || []).find(c => (c.name || '').toLowerCase() === cardName.toLowerCase());
    const dueDay = cardObj ? (cardObj.dueDay || 10) : (cardName.toLowerCase().includes('nu') ? 15 : 10);

    let sMonth = dMonth;
    let sYear = dYear;

    const monthNames = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

    mSelect.value = String(sMonth);
    if (ySelect) ySelect.value = String(sYear);
    if (hintEl) {
      hintEl.textContent = `💡 Compra vinculada à fatura de ${monthNames[sMonth]}/${sYear} (vencimento dia ${dueDay}).`;
    }
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
      const anyActive = document.querySelector('.modal-overlay.active');
      if (!anyActive) {
        document.body.classList.remove('modal-open');
      }
    }
  },

  // FEEDBACK TOAST NOTIFICATIONS
  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  },

  // BACKUP EXPORT & IMPORT
  downloadBackup() {
    const jsonStr = store.exportJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_sistema_financeiro_raphael_nilsen_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.showToast('Backup baixado com sucesso!', 'success');
  },

  triggerImportBackup() {
    const input = document.getElementById('importBackupInput');
    if (input) input.click();
  },

  handleImportFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      const success = store.importJSON(content);
      if (success) {
        this.render();
        this.showToast('Dados restaurados com sucesso!', 'success');
      } else {
        alert('Arquivo de backup inválido.');
      }
    };
    reader.readAsText(file);
  },

  // =========================================================================
  // MAPEANDO B3: LEVANTAMENTO ONLINE DE DIVIDENDOS & CARTEIRA
  // =========================================================================
  b3SimulatedAporte: 1000,

  renderMapeandoB3() {
    const container = document.getElementById('mapeandoB3Container');
    if (!container) return;

    try {
      const b3 = store.getMapeandoB3();
      const assets = (b3 && Array.isArray(b3.assets)) ? [...b3.assets] : [];

      // Auto-reparo imediato para ativos monitorados que estejam com proventos zerados
      let hadRepairs = false;
      assets.forEach(a => {
        if (!a.lastDiv || a.lastDiv <= 0) {
          const sym = (a.ticker || '').toUpperCase();
          const bm = this.b3Benchmarks ? this.b3Benchmarks[sym] : null;
          if (bm && bm.lastDiv > 0) {
            a.lastDiv = bm.lastDiv;
            a.lastDivDate = a.lastDivDate || bm.lastDivDate;
            a.div12m = (a.div12m && a.div12m > 0) ? a.div12m : bm.div12m;
            if (a.price > 0 && a.div12m > 0) {
              a.dy = Number(((a.div12m / a.price) * 100).toFixed(2));
            }
            hadRepairs = true;
          }
        }
      });
      if (hadRepairs) {
        store.save();
      }

      // Se ainda houver ativos com proventos zerados, dispara sincronização online em segundo plano
      if (assets.some(a => (!a.lastDiv || a.lastDiv <= 0) && a.ticker !== 'UA1111') && !this._hasAutoSyncedMapeandoB3) {
        this._hasAutoSyncedMapeandoB3 = true;
        setTimeout(() => this.fetchOnlineB3Data(), 400);
      }

      // Ranking dos Ativos por Dividend Yield Real dos últimos 12 meses
      const rankedAssets = [...assets].sort((a, b) => (Number(b.dy) || 0) - (Number(a.dy) || 0));
      const topOpportunity = rankedAssets[0];

      // Média de DY do radar
      let avgDY = 0;
      if (assets.length > 0) {
        const sumDY = assets.reduce((acc, a) => acc + (Number(a.dy) || 0), 0);
        avgDY = sumDY / assets.length;
      }

      // Data/hora da última atualização
      let lastUpdatedText = 'Cotações de Referência da B3';
      if (b3 && b3.lastUpdated) {
        try {
          const dt = new Date(b3.lastUpdated);
          lastUpdatedText = `Atualizado em ${dt.toLocaleDateString('pt-BR')} às ${dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
        } catch (e) {}
      }

      // Métricas do Top 1 (Melhor Opção Hoje)
      let topPrice = 0, topDy = 0, topLastDiv = 0, topDiv12m = 0, topType = 'FII', topChange = 0;
      let magicNumberTop = 0, magicCostTop = 0, monthlyTop1000 = 0, annualTop1000 = 0;

      if (topOpportunity) {
        topPrice = Number(topOpportunity.price) || 0;
        topDy = Number(topOpportunity.dy) || 0;
        topLastDiv = Number(topOpportunity.lastDiv) || 0;
        topDiv12m = Number(topOpportunity.div12m) || 0;
        topType = topOpportunity.type || 'FII';
        topChange = Number(topOpportunity.change) || 0;

        if (topPrice > 0 && topLastDiv > 0) {
          magicNumberTop = Math.ceil(topPrice / topLastDiv);
          magicCostTop = magicNumberTop * topPrice;
          monthlyTop1000 = (1000 / topPrice) * topLastDiv;
          annualTop1000 = (1000 / topPrice) * topDiv12m;
        }
      }

      // HTML da View
      let html = `
        <div class="b3-dashboard-header">
          <div class="b3-title-wrap">
            <div style="display:flex; align-items:center; gap:0.6rem; flex-wrap:wrap;">
              <h2 class="b3-main-title" style="margin:0; font-size:1.55rem; font-weight:800; color:#ffffff; display:flex; align-items:center; gap:0.5rem;">
                <span>📊</span> MAPEANDO B3
              </h2>
              <span class="b3-tag-live">● RADAR ONLINE DE OPORTUNIDADES</span>
            </div>
            <p class="b3-sub-title" style="margin:0.35rem 0 0 0; font-size:0.88rem; color:var(--text-muted);">
              Levantamento online de cotações e dividendos da B3. Ranking automático da melhor opção para comprar hoje com o seu dinheiro.
            </p>
            <div style="margin-top:0.4rem; font-size:0.78rem; color:#94a3b8; display:flex; align-items:center; gap:0.4rem;">
              <span>🕒 ${lastUpdatedText}</span>
            </div>
          </div>

          <div class="b3-actions-wrap" style="display:flex; gap:0.6rem; flex-wrap:wrap; align-items:center;">
            <button id="btnFetchB3Online" class="btn-primary" style="background: linear-gradient(135deg, #0ea5e9, #0284c7); border:none; padding:0.55rem 1.15rem; font-size:0.85rem; font-weight:700; border-radius:8px; display:flex; align-items:center; gap:0.45rem; cursor:pointer;" onclick="app.fetchOnlineB3Data()">
              <span id="b3SyncIcon">🔄</span> Atualizar Cotações Online
            </button>
            <button class="btn-header" style="background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.15); color:#ffffff; padding:0.55rem 1.15rem; font-size:0.85rem; font-weight:700; border-radius:8px; display:flex; align-items:center; gap:0.45rem; cursor:pointer;" onclick="app.openModalNovoAtivoB3()">
              <span>➕</span> Monitorar Novo Ativo
            </button>
          </div>
        </div>

        <!-- CARDS DE METRICAS DO RADAR DE MERCADO -->
        <div class="b3-metrics-grid" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:1rem; margin:1.25rem 0;">
          <div class="b3-metric-card" style="background:linear-gradient(145deg, #1e293b, #0f172a); border:1px solid rgba(148,163,184,0.15); border-radius:12px; padding:1.15rem 1.25rem; box-shadow:0 4px 15px rgba(0,0,0,0.2);">
            <div style="font-size:0.75rem; text-transform:uppercase; font-weight:700; color:#94a3b8; letter-spacing:0.5px;">Ativos Monitorados</div>
            <div style="font-size:1.6rem; font-weight:800; color:#38bdf8; margin:0.35rem 0;">${assets.length} Ativos</div>
            <div style="font-size:0.78rem; color:#cbd5e1;">Ações & Fundos Imobiliários da B3</div>
          </div>

          <div class="b3-metric-card" style="background:linear-gradient(145deg, #1e293b, #0f172a); border:1px solid rgba(16,185,129,0.25); border-radius:12px; padding:1.15rem 1.25rem; box-shadow:0 4px 15px rgba(0,0,0,0.2);">
            <div style="font-size:0.75rem; text-transform:uppercase; font-weight:700; color:#34d399; letter-spacing:0.5px;">Melhor Dividend Yield Hoje</div>
            <div style="font-size:1.6rem; font-weight:800; color:#10b981; margin:0.35rem 0;">${topDy.toFixed(2)}%<span style="font-size:0.85rem; font-weight:500; color:#94a3b8;"> a.a.</span></div>
            <div style="font-size:0.78rem; color:#94a3b8;">Líder de Retorno: <strong style="color:#34d399;">${topOpportunity ? topOpportunity.ticker : '-'}</strong></div>
          </div>

          <div class="b3-metric-card" style="background:linear-gradient(145deg, #1e293b, #0f172a); border:1px solid rgba(245,158,11,0.25); border-radius:12px; padding:1.15rem 1.25rem; box-shadow:0 4px 15px rgba(0,0,0,0.2);">
            <div style="font-size:0.75rem; text-transform:uppercase; font-weight:700; color:#fbbf24; letter-spacing:0.5px;">Maior Renda p/ R$ 1.000</div>
            <div style="font-size:1.6rem; font-weight:800; color:#f59e0b; margin:0.35rem 0;">${formatBRL(monthlyTop1000)}<span style="font-size:0.85rem; font-weight:500; color:#94a3b8;">/mês</span></div>
            <div style="font-size:0.78rem; color:#94a3b8;">${formatBRL(annualTop1000)}/ano com ${topOpportunity ? topOpportunity.ticker : '-'}</div>
          </div>

          <div class="b3-metric-card" style="background:linear-gradient(145deg, #1e293b, #0f172a); border:1px solid rgba(168,85,247,0.25); border-radius:12px; padding:1.15rem 1.25rem; box-shadow:0 4px 15px rgba(0,0,0,0.2);">
            <div style="font-size:0.75rem; text-transform:uppercase; font-weight:700; color:#c084fc; letter-spacing:0.5px;">Média DY do Radar</div>
            <div style="font-size:1.6rem; font-weight:800; color:#a855f7; margin:0.35rem 0;">${avgDY.toFixed(2)}%<span style="font-size:0.85rem; font-weight:500; color:#94a3b8;"> a.a.</span></div>
            <div style="font-size:0.78rem; color:#94a3b8;">Média geral dos proventos monitorados</div>
          </div>
        </div>
      `;

      // VIP CARD: MELHOR OPÇÃO PARA COMPRAR HOJE
      if (topOpportunity) {
        const topChangeBadge = topChange !== 0 ? `
          <span style="font-size:0.8rem; font-weight:700; padding:0.15rem 0.5rem; border-radius:6px; background:${topChange > 0 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}; color:${topChange > 0 ? '#34d399' : '#f87171'};">
            ${topChange > 0 ? '▲ +' : '▼ '}${topChange.toFixed(2)}% hoje
          </span>
        ` : '';

        html += `
          <div class="b3-best-pick-banner" style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.14) 0%, rgba(14, 165, 233, 0.09) 100%); border: 1.5px solid rgba(16, 185, 129, 0.4); border-radius: 14px; padding: 1.35rem 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 8px 24px rgba(0,0,0,0.25); position: relative; overflow: hidden;">
            <div style="position: absolute; right: -20px; top: -20px; font-size: 8rem; opacity: 0.05; pointer-events: none;">🏆</div>
            
            <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:1rem;">
              <div>
                <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.4rem;">
                  <span style="background: linear-gradient(135deg, #10b981, #059669); color:#ffffff; font-weight:800; font-size:0.75rem; padding:0.25rem 0.75rem; border-radius:20px; letter-spacing:0.5px;">🏆 MELHOR OPÇÃO PARA COMPRAR HOJE</span>
                  <span style="background: rgba(255,255,255,0.1); color:#e2e8f0; font-weight:600; font-size:0.72rem; padding:0.25rem 0.6rem; border-radius:20px;">Top 1 Dividend Yield B3</span>
                  ${topChangeBadge}
                </div>
                <h3 style="margin:0; font-size:1.65rem; font-weight:800; color:#ffffff; display:flex; align-items:center; gap:0.6rem;">
                  <span style="color:#34d399;">${topOpportunity.ticker}</span>
                  <span style="font-size:0.95rem; font-weight:500; color:#94a3b8;">${topOpportunity.name || ''}</span>
                  <span class="b3-type-pill ${topType.toLowerCase()}">${topType}</span>
                </h3>
                <p style="margin:0.4rem 0 0 0; font-size:0.9rem; color:#cbd5e1; max-width:700px; line-height:1.45;">
                  💡 <strong>Por que este ativo é a melhor escolha hoje se você tem dinheiro?</strong><br>
                  Ele entrega a maior rentabilidade em dividendos do seu radar: <strong style="color:#34d399;">${topDy.toFixed(2)}% ao ano</strong>. 
                  Com a cotação atual de <strong>${formatBRL(topPrice)}</strong>, cada <strong>R$ 1.000,00</strong> que você comprar hoje colocam aproximadamente 
                  <strong style="color:#34d399;">${formatBRL(monthlyTop1000)}/mês</strong> (<strong style="color:#34d399;">${formatBRL(annualTop1000)}/ano</strong>) 
                  de renda passiva limpa direto na sua conta!
                </p>
              </div>

              <div style="display:flex; gap:1.25rem; flex-wrap:wrap; align-items:center; background:rgba(15,23,42,0.65); padding:0.85rem 1.25rem; border-radius:10px; border:1px solid rgba(255,255,255,0.08);">
                <div>
                  <div style="font-size:0.72rem; color:#94a3b8; text-transform:uppercase; font-weight:700;">Cotação Atual</div>
                  <div style="font-size:1.25rem; font-weight:800; color:#ffffff;">${formatBRL(topPrice)}</div>
                </div>
                <div style="width:1px; height:32px; background:rgba(255,255,255,0.1);"></div>
                <div>
                  <div style="font-size:0.72rem; color:#34d399; text-transform:uppercase; font-weight:700;">Dividend Yield</div>
                  <div style="font-size:1.25rem; font-weight:800; color:#10b981;">${topDy.toFixed(2)}%</div>
                </div>
                <div style="width:1px; height:32px; background:rgba(255,255,255,0.1);"></div>
                <div>
                  <div style="font-size:0.72rem; color:#38bdf8; text-transform:uppercase; font-weight:700;">Último Dividendo</div>
                  <div style="font-size:1.15rem; font-weight:800; color:#38bdf8;">${formatBRL(topLastDiv)}</div>
                  <div style="font-size:0.7rem; color:#94a3b8;">📅 ${formatLastDivDate(topOpportunity.lastDivDate)}</div>
                </div>
                <div style="width:1px; height:32px; background:rgba(255,255,255,0.1);"></div>
                <div>
                  <div style="font-size:0.72rem; color:#fbbf24; text-transform:uppercase; font-weight:700;">Número Mágico</div>
                  <div style="font-size:1.15rem; font-weight:800; color:#f59e0b;">${magicNumberTop} cotas</div>
                  <div style="font-size:0.7rem; color:#94a3b8;">${formatBRL(magicCostTop)}</div>
                </div>
              </div>
            </div>
          </div>
        `;
      }

      // SIMULADOR DE APORTE: "SE EU TENHO DINHEIRO HOJE PARA COMPRAR..."
      const simAmount = this.b3SimulatedAporte || 1000;
      html += `
        <div class="card" style="padding: 1.25rem 1.5rem; margin-bottom: 1.5rem; background: #0f172a; border: 1px solid rgba(148,163,184,0.15);">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem; margin-bottom:1rem;">
            <div>
              <h4 style="margin:0; font-size:1.1rem; font-weight:700; color:#ffffff; display:flex; align-items:center; gap:0.45rem;">
                <span>🖩</span> Simulador: Se Eu Tenho Dinheiro Hoje, Onde Rende Mais?
              </h4>
              <p style="margin:0.25rem 0 0 0; font-size:0.82rem; color:var(--text-muted);">
                Informe quanto dinheiro você tem disponível para investir hoje e veja a comparação de rendimento em cada opção.
              </p>
            </div>
            
            <!-- CONTROLE DO VALOR DO APORTE -->
            <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
              <span style="font-size:0.82rem; font-weight:600; color:#94a3b8;">Tenho para comprar:</span>
              <div style="position:relative; width:140px;">
                <span style="position:absolute; left:8px; top:50%; transform:translateY(-50%); font-size:0.8rem; color:#94a3b8; font-weight:700;">R$</span>
                <input type="number" id="b3SimAporteInput" class="form-input" value="${simAmount}" step="100" min="50" style="padding-left:2rem; font-weight:700; height:34px; font-size:0.9rem;" onchange="app.simulateB3Aporte(this.value)">
              </div>
              <div style="display:flex; gap:0.3rem;">
                <button class="btn-sm ${simAmount === 200 ? 'btn-primary' : 'btn-header'}" style="padding:0.2rem 0.55rem; font-size:0.75rem;" onclick="app.simulateB3Aporte(200)">R$ 200</button>
                <button class="btn-sm ${simAmount === 500 ? 'btn-primary' : 'btn-header'}" style="padding:0.2rem 0.55rem; font-size:0.75rem;" onclick="app.simulateB3Aporte(500)">R$ 500</button>
                <button class="btn-sm ${simAmount === 1000 ? 'btn-primary' : 'btn-header'}" style="padding:0.2rem 0.55rem; font-size:0.75rem;" onclick="app.simulateB3Aporte(1000)">R$ 1.000</button>
                <button class="btn-sm ${simAmount === 2000 ? 'btn-primary' : 'btn-header'}" style="padding:0.2rem 0.55rem; font-size:0.75rem;" onclick="app.simulateB3Aporte(2000)">R$ 2.000</button>
                <button class="btn-sm ${simAmount === 5000 ? 'btn-primary' : 'btn-header'}" style="padding:0.2rem 0.55rem; font-size:0.75rem;" onclick="app.simulateB3Aporte(5000)">R$ 5.000</button>
              </div>
            </div>
          </div>

          <!-- GRID DOS RESULTADOS DA SIMULAÇÃO -->
          <div class="b3-sim-cards-grid" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:0.85rem;">
      `;

      // Calcula simulação para cada ativo
      const simulatedResults = assets.map(a => {
        const p = Number(a.price) || 0;
        const lastD = Number(a.lastDiv) || 0;
        const d12 = Number(a.div12m) || 0;
        const sharesBought = p > 0 ? Math.floor(simAmount / p) : 0;
        const change = simAmount - (sharesBought * p);
        const addMonthly = sharesBought * lastD;
        const addAnnual = sharesBought * d12;
        return {
          ...a,
          sharesBought,
          change,
          addMonthly,
          addAnnual
        };
      });

      const bestSimAnnual = [...simulatedResults].sort((a, b) => b.addAnnual - a.addAnnual)[0];

      simulatedResults.forEach(item => {
        const isWinner = bestSimAnnual && bestSimAnnual.id === item.id && item.addAnnual > 0;
        html += `
          <div class="b3-sim-card ${isWinner ? 'winner' : ''}" style="background: ${isWinner ? 'rgba(16, 185, 129, 0.08)' : 'rgba(30, 41, 59, 0.5)'}; border: 1px solid ${isWinner ? '#10b981' : 'rgba(148, 163, 184, 0.12)'}; border-radius: 10px; padding: 0.85rem 1rem; position: relative;">
            ${isWinner ? '<span style="position:absolute; right:8px; top:8px; font-size:0.68rem; background:#10b981; color:#ffffff; font-weight:800; padding:0.15rem 0.45rem; border-radius:12px;">🏆 MAIOR RENDA</span>' : ''}
            <div style="font-weight:800; font-size:1.05rem; color:${isWinner ? '#34d399' : '#ffffff'};">${item.ticker}</div>
            <div style="font-size:0.75rem; color:#94a3b8; margin-bottom:0.45rem;">${item.type} • Cota ${formatBRL(item.price)}</div>
            
            <div style="background:rgba(0,0,0,0.25); border-radius:6px; padding:0.4rem 0.6rem; margin-bottom:0.45rem;">
              <div style="font-size:0.72rem; color:#94a3b8;">Você compra hoje:</div>
              <div style="font-weight:700; font-size:0.95rem; color:#ffffff;">+${item.sharesBought} cotas <span style="font-size:0.72rem; color:#94a3b8; font-weight:400;">(sobra ${formatBRL(item.change)})</span></div>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div>
                <div style="font-size:0.7rem; color:#94a3b8;">Renda mensal:</div>
                <div style="font-size:0.88rem; font-weight:700; color:#10b981;">+${formatBRL(item.addMonthly)}/mês</div>
              </div>
              <div style="text-align:right;">
                <div style="font-size:0.7rem; color:#94a3b8;">No ano:</div>
                <div style="font-size:0.88rem; font-weight:700; color:#f59e0b;">+${formatBRL(item.addAnnual)}/ano</div>
              </div>
            </div>
          </div>
        `;
      });

      html += `
          </div>
        </div>
      `;

      // TABELA COMPLETA: RANKING DAS MELHORES OPÇÕES DE COMPRA B3
      html += `
        <div class="card" style="padding: 1.25rem 1.5rem; background: #0f172a; border: 1px solid rgba(148,163,184,0.15);">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem; margin-bottom:1rem;">
            <div>
              <h4 style="margin:0; font-size:1.15rem; font-weight:700; color:#ffffff; display:flex; align-items:center; gap:0.45rem;">
                <span>📑</span> Ranking de Oportunidades B3: Qual Comprar Hoje?
              </h4>
              <p style="margin:0.25rem 0 0 0; font-size:0.82rem; color:var(--text-muted);">
                Ranqueado automaticamente do maior para o menor retorno em dividendos. Veja o rendimento projetado para cada R$ 1.000 investidos.
              </p>
            </div>
          </div>

          <div class="table-responsive">
            <table class="data-table b3-table" style="width:100%; border-collapse:collapse;">
              <thead>
                <tr style="border-bottom:1px solid rgba(148,163,184,0.2); font-size:0.78rem; text-transform:uppercase; color:#94a3b8;">
                  <th style="padding:0.75rem 0.5rem; text-align:center; width:55px;">Rank</th>
                  <th style="padding:0.75rem 0.5rem; text-align:left;">Ativo / Empresa</th>
                  <th style="padding:0.75rem 0.5rem; text-align:center;">Tipo</th>
                  <th style="padding:0.75rem 0.5rem; text-align:right;">Cotação Atual</th>
                  <th style="padding:0.75rem 0.5rem; text-align:center;">Variação Hoje</th>
                  <th style="padding:0.75rem 0.5rem; text-align:right;">Último Div. / Data</th>
                  <th style="padding:0.75rem 0.5rem; text-align:right;">Div. 12M</th>
                  <th style="padding:0.75rem 0.5rem; text-align:right;">DY (12M)</th>
                  <th style="padding:0.75rem 0.5rem; text-align:right;">Renda p/ R$ 1.000</th>
                  <th style="padding:0.75rem 0.5rem; text-align:center;">Nº Mágico</th>
                  <th style="padding:0.75rem 0.5rem; text-align:center;">Classificação</th>
                  <th style="padding:0.75rem 0.5rem; text-align:center; width:80px;">Ações</th>
                </tr>
              </thead>
              <tbody>
      `;

      rankedAssets.forEach((asset, idx) => {
        const price = Number(asset.price) || 0;
        const lastDiv = Number(asset.lastDiv) || 0;
        const div12m = Number(asset.div12m) || 0;
        const dy = Number(asset.dy) || 0;
        const change = Number(asset.change) || 0;

        const rendaMensal1000 = price > 0 ? (1000 / price) * lastDiv : 0;
        const rendaAnual1000 = price > 0 ? (1000 / price) * div12m : 0;

        const magicNum = (lastDiv > 0 && price > 0) ? Math.ceil(price / lastDiv) : 0;
        const magicCost = magicNum * price;

        let rankBadge = `<span class="b3-rank-pill">${idx + 1}º</span>`;
        let classification = `<span style="font-size:0.75rem; color:#94a3b8;">Alternativa</span>`;

        if (idx === 0) {
          rankBadge = `<span class="b3-rank-pill gold">🥇 1º</span>`;
          classification = `<span style="font-size:0.75rem; font-weight:800; color:#10b981; background:rgba(16,185,129,0.15); padding:0.2rem 0.5rem; border-radius:4px;">🔥 1ª Escolha de Compra</span>`;
        } else if (idx === 1) {
          rankBadge = `<span class="b3-rank-pill silver">🥈 2º</span>`;
          classification = `<span style="font-size:0.75rem; font-weight:700; color:#38bdf8; background:rgba(56,189,248,0.12); padding:0.2rem 0.5rem; border-radius:4px;">⭐ Excelente Opção</span>`;
        } else if (idx === 2) {
          rankBadge = `<span class="b3-rank-pill bronze">🥉 3º</span>`;
          classification = `<span style="font-size:0.75rem; font-weight:700; color:#fbbf24; background:rgba(251,191,36,0.12); padding:0.2rem 0.5rem; border-radius:4px;">👍 Ótimo Retorno</span>`;
        } else if (dy >= 10) {
          classification = `<span style="font-size:0.75rem; font-weight:600; color:#c084fc; background:rgba(192,132,252,0.1); padding:0.2rem 0.5rem; border-radius:4px;">Bom Rendimento</span>`;
        }

        const typeClass = (asset.type || 'FII').toLowerCase();
        const changeClass = change > 0 ? 'color:#34d399;' : change < 0 ? 'color:#f87171;' : 'color:#94a3b8;';
        const changeText = change > 0 ? `▲ +${change.toFixed(2)}%` : change < 0 ? `▼ ${change.toFixed(2)}%` : '0.00%';

        html += `
          <tr style="border-bottom:1px solid rgba(148,163,184,0.1); font-size:0.86rem; transition: background 0.15s ease;">
            <td style="padding:0.75rem 0.5rem; text-align:center;">${rankBadge}</td>
            <td style="padding:0.75rem 0.5rem;">
              <div style="font-weight:800; font-size:0.95rem; color:#ffffff;">${asset.ticker}</div>
              <div style="font-size:0.74rem; color:#94a3b8; max-width:180px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${asset.name || ''}">${asset.name || asset.ticker}</div>
            </td>
            <td style="padding:0.75rem 0.5rem; text-align:center;">
              <span class="b3-type-pill ${typeClass}">${asset.type || 'FII'}</span>
            </td>
            <td style="padding:0.75rem 0.5rem; text-align:right; font-weight:700; color:#ffffff;">
              ${formatBRL(price)}
            </td>
            <td style="padding:0.75rem 0.5rem; text-align:center; font-weight:600; ${changeClass}">
              ${changeText}
            </td>
            <td style="padding:0.75rem 0.5rem; text-align:right;">
              <div style="color:#38bdf8; font-weight:700;">${formatBRL(lastDiv)}</div>
              <div style="font-size:0.72rem; color:#94a3b8; margin-top:2px; display:inline-flex; align-items:center; gap:3px;" title="Data do último dividendo pago">
                <span style="font-size:0.7rem;">📅</span> ${formatLastDivDate(asset.lastDivDate)}
              </div>
            </td>
            <td style="padding:0.75rem 0.5rem; text-align:right; color:#fbbf24; font-weight:600;">
              ${formatBRL(div12m)}
            </td>
            <td style="padding:0.75rem 0.5rem; text-align:right;">
              <span class="b3-dy-badge" style="font-weight:800; color:#10b981; background:rgba(16,185,129,0.12); padding:0.25rem 0.55rem; border-radius:4px; font-size:0.85rem;">
                ${dy.toFixed(2)}%
              </span>
            </td>
            <td style="padding:0.75rem 0.5rem; text-align:right;">
              <div style="font-weight:700; color:#10b981; font-size:0.85rem;">${formatBRL(rendaMensal1000)}/mês</div>
              <div style="font-size:0.72rem; color:#94a3b8;">${formatBRL(rendaAnual1000)}/ano</div>
            </td>
            <td style="padding:0.75rem 0.5rem; text-align:center;">
              <span class="b3-magic-pill" title="Com ${magicNum} cotas (${formatBRL(magicCost)}), seu dividendo mensal compra 1 nova cota todo mês sem colocar mais dinheiro!">
                🔮 ${magicNum} cotas
              </span>
            </td>
            <td style="padding:0.75rem 0.5rem; text-align:center;">
              ${classification}
            </td>
            <td style="padding:0.75rem 0.5rem; text-align:center;">
              <div style="display:flex; justify-content:center; gap:0.35rem;">
                <button class="btn-icon-mini" onclick="app.openModalEditarAtivoB3('${asset.id}')" title="Editar cotações ou dados do ativo">✏️</button>
                <button class="btn-icon-mini danger" onclick="app.deleteAtivoB3('${asset.id}', '${asset.ticker}')" title="Remover do radar">🗑️</button>
              </div>
            </td>
          </tr>
        `;
      });

      html += `
              </tbody>
              <tfoot>
                <tr style="border-top:2px solid rgba(148,163,184,0.3); font-weight:800; background:rgba(15,23,42,0.7); font-size:0.9rem;">
                  <td colspan="7" style="padding:0.85rem 0.5rem; text-align:right; color:#ffffff;">MÉDIA DO RADAR B3:</td>
                  <td style="padding:0.85rem 0.5rem; text-align:right; color:#10b981;">${avgDY.toFixed(2)}% a.a.</td>
                  <td colspan="4" style="padding:0.85rem 0.5rem; text-align:left; color:#94a3b8; font-size:0.8rem;">
                    Melhor opção para aporte hoje: <strong style="color:#34d399;">${topOpportunity ? topOpportunity.ticker : '-'}</strong> (${topDy.toFixed(2)}% a.a.)
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      `;

      container.innerHTML = html;
    } catch (err) {
      console.error('[MapeandoB3] Erro ao renderizar tela:', err);
      container.innerHTML = `
        <div class="card" style="padding: 2.5rem; text-align: center; background: #0f172a; border: 1px solid rgba(239, 68, 68, 0.3);">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">⚠️</div>
          <h3 style="color: #f87171; margin: 0 0 0.5rem 0;">Não foi possível carregar o Radar B3</h3>
          <p style="color: #94a3b8; font-size: 0.9rem; max-width: 500px; margin: 0 auto 1.5rem auto;">${err.message}</p>
          <button class="btn-primary" onclick="app.renderMapeandoB3()" style="width: auto; padding: 0.6rem 1.5rem;">Tentar Novamente</button>
        </div>
      `;
    }
  },

  simulateB3Aporte(amount) {
    const val = Number(amount);
    if (!isNaN(val) && val > 0) {
      this.b3SimulatedAporte = val;
      this.renderMapeandoB3();
    }
  },

  // ---------------------------------------------------------------------------
  // TABELA DE BENCHMARKS / REFERÊNCIA PARA ATIVOS DA B3
  // Evita que ativos populares fiquem zerados caso proxies do Yahoo ou Brapi falhem
  // ---------------------------------------------------------------------------
  b3Benchmarks: {
    'MXRF11': { name: 'Maxi Renda FII', type: 'FII', price: 9.02, change: -0.99, lastDiv: 0.10, div12m: 1.19, lastDivDate: '2026-10-15' },
    'SNME11': { name: 'Suno Multiestratégia FII', type: 'FII', price: 9.41, change: 1.07, lastDiv: 0.10, div12m: 1.21, lastDivDate: '2026-10-26' },
    'LVBI11': { name: 'VBI Logística FII', type: 'FII', price: 97.44, change: -1.49, lastDiv: 0.80, div12m: 9.46, lastDivDate: '2026-10-07' },
    'KISU11': { name: 'Kilima FIC de FII', type: 'FII', price: 6.20, change: -0.40, lastDiv: 0.07, div12m: 0.83, lastDivDate: '2026-10-15' },
    'HGLG11': { name: 'CSHG Logística FII', type: 'FII', price: 149.72, change: -1.30, lastDiv: 1.17, div12m: 13.86, lastDivDate: '2026-10-15' },
    'XPML11': { name: 'XP Malls FII', type: 'FII', price: 99.35, change: -0.85, lastDiv: 0.92, div12m: 10.95, lastDivDate: '2026-10-23' },
    'BTLG11': { name: 'BTG Pactual Logística FII', type: 'FII', price: 99.00, change: -1.15, lastDiv: 0.81, div12m: 9.61, lastDivDate: '2026-10-23' },
    'VISC11': { name: 'Vinci Shopping Centers FII', type: 'FII', price: 114.20, change: 0.05, lastDiv: 0.85, div12m: 10.20, lastDivDate: '2026-10-15' },
    'CPTS11': { name: 'Capitânia Securities II FII', type: 'FII', price: 7.20, change: -0.25, lastDiv: 0.07, div12m: 0.86, lastDivDate: '2026-10-15' },
    'VGIR11': { name: 'Valora RE III FII', type: 'FII', price: 9.50, change: 0.00, lastDiv: 0.11, div12m: 1.32, lastDivDate: '2026-10-15' },
    'VGHF11': { name: 'Valora Hedge Fund FII', type: 'FII', price: 8.30, change: -0.12, lastDiv: 0.08, div12m: 0.98, lastDivDate: '2026-10-15' },
    'GARE11': { name: 'Guardian Real Estate FII', type: 'FII', price: 8.90, change: 0.10, lastDiv: 0.086, div12m: 1.03, lastDivDate: '2026-10-15' },
    'KNIP11': { name: 'Kinea Rendimentos Imobiliários FII', type: 'FII', price: 90.50, change: -0.30, lastDiv: 0.80, div12m: 9.60, lastDivDate: '2026-10-15' },
    'KNCR11': { name: 'Kinea Rendimentos CDI FII', type: 'FII', price: 103.50, change: 0.20, lastDiv: 1.05, div12m: 12.60, lastDivDate: '2026-10-15' },
    'KNRI11': { name: 'Kinea Renda Imobiliária FII', type: 'FII', price: 141.20, change: -0.40, lastDiv: 1.00, div12m: 12.00, lastDivDate: '2026-10-15' },
    'XPLG11': { name: 'XP Log FII', type: 'FII', price: 97.50, change: -0.10, lastDiv: 0.78, div12m: 9.36, lastDivDate: '2026-10-15' },
    'VILG11': { name: 'Vinci Logística FII', type: 'FII', price: 81.00, change: 0.15, lastDiv: 0.67, div12m: 8.04, lastDivDate: '2026-10-15' },
    'KNSC11': { name: 'Kinea Securities FII', type: 'FII', price: 8.75, change: 0.05, lastDiv: 0.09, div12m: 1.08, lastDivDate: '2026-10-15' },
    'HSML11': { name: 'HSI Malls FII', type: 'FII', price: 92.00, change: -0.25, lastDiv: 0.76, div12m: 9.12, lastDivDate: '2026-10-15' },
    'BTCI11': { name: 'BTG Pactual Crédito Imob.', type: 'FII', price: 9.07, change: -0.55, lastDiv: 0.10, div12m: 1.17, lastDivDate: '2024-10-15' },
    'TRXF11': { name: 'TRX Real Estate FII', type: 'FII', price: 103.80, change: 0.10, lastDiv: 0.90, div12m: 10.80, lastDivDate: '2024-10-15' },
    'ALZR11': { name: 'Alianza Trust Renda Imobiliária', type: 'FII', price: 107.00, change: -0.05, lastDiv: 0.82, div12m: 9.84, lastDivDate: '2024-10-15' },
    'HGRU11': { name: 'CSHG Renda Urbana FII', type: 'FII', price: 121.50, change: 0.00, lastDiv: 0.90, div12m: 10.80, lastDivDate: '2024-10-15' },
    'RBRR11': { name: 'RBR Rendimento High Grade FII', type: 'FII', price: 86.50, change: -0.15, lastDiv: 0.80, div12m: 9.60, lastDivDate: '2024-10-15' },
    'TGAR11': { name: 'TG Ativo Real FII', type: 'FII', price: 114.00, change: 0.30, lastDiv: 1.30, div12m: 15.60, lastDivDate: '2024-10-15' },
    'VRTA11': { name: 'Fator Veritá FII', type: 'FII', price: 83.20, change: -0.20, lastDiv: 0.75, div12m: 9.00, lastDivDate: '2024-10-15' },
    'BCFF11': { name: 'BTG Pactual Fundo de FIIs', type: 'FII', price: 8.80, change: 0.00, lastDiv: 0.07, div12m: 0.84, lastDivDate: '2024-10-15' },
    'PETR4': { name: 'Petrobras PN', type: 'Ação', price: 36.50, change: 0.50, lastDiv: 1.15, div12m: 4.80, lastDivDate: '2024-09-20' },
    'VALE3': { name: 'Vale ON', type: 'Ação', price: 58.20, change: -0.40, lastDiv: 2.10, div12m: 4.50, lastDivDate: '2024-09-05' },
    'BBAS3': { name: 'Banco do Brasil ON', type: 'Ação', price: 23.92, change: -0.75, lastDiv: 0.22, div12m: 2.65, lastDivDate: '2024-09-27' },
    'ITUB4': { name: 'Itaú Unibanco PN', type: 'Ação', price: 34.10, change: 0.30, lastDiv: 0.30, div12m: 2.40, lastDivDate: '2024-10-01' },
    'BBDC4': { name: 'Banco Bradesco PN', type: 'Ação', price: 14.50, change: -0.20, lastDiv: 0.08, div12m: 0.95, lastDivDate: '2024-10-01' },
    'TAEE11': { name: 'Taesa Unit', type: 'Ação', price: 34.80, change: -0.15, lastDiv: 0.70, div12m: 2.80, lastDivDate: '2024-10-15' },
    'TAEE3': { name: 'Taesa ON', type: 'Ação', price: 14.81, change: -0.60, lastDiv: 0.25, div12m: 1.00, lastDivDate: '2024-10-15' },
    'TRPL4': { name: 'ISA Cteep PN', type: 'Ação', price: 24.30, change: 0.10, lastDiv: 0.60, div12m: 2.10, lastDivDate: '2024-10-15' },
    'CPLE6': { name: 'Copel PNB', type: 'Ação', price: 9.80, change: 0.00, lastDiv: 0.20, div12m: 0.75, lastDivDate: '2024-09-20' },
    'CXSE3': { name: 'Caixa Seguridade ON', type: 'Ação', price: 14.60, change: 0.45, lastDiv: 0.40, div12m: 1.15, lastDivDate: '2024-08-15' },
    'BBSE3': { name: 'BB Seguridade ON', type: 'Ação', price: 35.20, change: -0.30, lastDiv: 1.25, div12m: 3.65, lastDivDate: '2024-08-15' },
    'EGIE3': { name: 'Engie Brasil ON', type: 'Ação', price: 42.10, change: 0.10, lastDiv: 1.45, div12m: 3.10, lastDivDate: '2024-08-20' },
    'WEGE3': { name: 'WEG ON', type: 'Ação', price: 52.30, change: 0.40, lastDiv: 0.32, div12m: 0.98, lastDivDate: '2024-08-15' }
  },

  openModalNovoAtivoB3() {
    this.lastSearchedB3Asset = null;
    const input = document.getElementById('b3_search_ticker');
    if (input) input.value = '';
    const container = document.getElementById('b3SearchResultContainer');
    if (container) {
      container.innerHTML = `
        <div style="text-align:center; padding:1.75rem 1rem; background:rgba(15,23,42,0.5); border:1px dashed rgba(148,163,184,0.25); border-radius:10px; color:#94a3b8;">
          <div style="font-size:2.2rem; margin-bottom:0.5rem;">📡</div>
          <div style="font-size:0.95rem; font-weight:700; color:#e2e8f0; margin-bottom:0.35rem;">Busca Automática & Cadastro de Mercado</div>
          <div style="font-size:0.82rem; max-width:440px; margin:0 auto; line-height:1.45;">
            Digite o código do ativo (ex: <strong>KISU11</strong>, <strong>MXRF11</strong>, <strong>PETR4</strong>) e clique em <strong>Buscar</strong>. O sistema consultará as cotações e proventos e montará a análise completa para você confirmar!
          </div>
        </div>
      `;
    }
    this.openModal('modalNovoAtivoB3');
    setTimeout(() => {
      document.getElementById('b3_search_ticker')?.focus();
    }, 150);
  },

  quickSearchB3Ticker(ticker) {
    const input = document.getElementById('b3_search_ticker');
    if (input) input.value = ticker;
    this.searchAssetOnlineB3();
  },

  switchToManualB3Asset() {
    const input = document.getElementById('b3_search_ticker');
    const ticker = (input?.value || '').trim().toUpperCase() || 'NOVO11';
    const benchmark = this.b3Benchmarks[ticker];

    this.renderB3AssetForm({
      ticker,
      name: benchmark?.name || ticker,
      type: benchmark?.type || (ticker.endsWith('11') ? 'FII' : 'Ação'),
      price: benchmark?.price || 0,
      change: benchmark?.change || 0,
      lastDiv: benchmark?.lastDiv || 0,
      lastDivDate: benchmark?.lastDivDate || new Date().toISOString().split('T')[0],
      div12m: benchmark?.div12m || 0,
      source: 'manual'
    });
  },

  async searchAssetOnlineB3() {
    const input = document.getElementById('b3_search_ticker');
    const ticker = (input?.value || '').trim().toUpperCase();
    if (!ticker) {
      this.showToast('Por favor, digite o código do ativo (ex: KISU11, MXRF11).', 'warning');
      input?.focus();
      return;
    }

    const container = document.getElementById('b3SearchResultContainer');
    const btn = document.getElementById('btnDoSearchB3');
    const btnIcon = document.getElementById('b3SearchBtnIcon');
    const btnText = document.getElementById('b3SearchBtnText');

    if (btn) btn.disabled = true;
    if (btnIcon) btnIcon.textContent = '⏳';
    if (btnText) btnText.textContent = 'Buscando...';

    if (container) {
      container.innerHTML = `
        <div style="text-align:center; padding:2rem 1rem; background:rgba(15,23,42,0.6); border:1px solid rgba(56,189,248,0.3); border-radius:10px;">
          <div style="font-size:2.2rem; display:inline-block;" class="b3-spinning">🔄</div>
          <div style="font-size:1.05rem; font-weight:800; color:#38bdf8; margin-top:0.75rem;">Buscando dados de ${ticker} na B3...</div>
          <div style="font-size:0.82rem; color:#94a3b8; margin-top:0.35rem;">Consultando cotação em tempo real e histórico de proventos...</div>
        </div>
      `;
    }

    try {
      const data = await this.fetchSingleB3AssetOnline(ticker);
      this.renderB3AssetForm(data);
    } catch (err) {
      console.error('[MapeandoB3] Erro na busca online:', err);
      const benchmark = this.b3Benchmarks[ticker];
      this.renderB3AssetForm({
        ticker,
        name: benchmark?.name || ticker,
        type: benchmark?.type || (ticker.endsWith('11') ? 'FII' : 'Ação'),
        price: benchmark?.price || 0,
        change: benchmark?.change || 0,
        lastDiv: benchmark?.lastDiv || 0,
        lastDivDate: benchmark?.lastDivDate || new Date().toISOString().split('T')[0],
        div12m: benchmark?.div12m || 0,
        source: benchmark ? 'benchmark' : 'manual'
      });
    } finally {
      if (btn) btn.disabled = false;
      if (btnIcon) btnIcon.textContent = '🔍';
      if (btnText) btnText.textContent = 'Buscar';
    }
  },

  renderB3AssetForm(data) {
    const container = document.getElementById('b3SearchResultContainer');
    if (!container) return;

    this.lastSearchedB3Asset = data;

    const p = Number(data.price) || 0;
    const lastD = Number(data.lastDiv) || 0;
    const d12 = Number(data.div12m) || 0;
    const change = Number(data.change) || 0;
    const dy = (p > 0 && d12 > 0) ? ((d12 / p) * 100) : 0;
    const magicNum = (p > 0 && lastD > 0) ? Math.ceil(p / lastD) : 0;
    const magicCost = magicNum * p;
    const rendaMensal1000 = p > 0 ? (1000 / p) * lastD : 0;
    const rendaAnual1000 = p > 0 ? (1000 / p) * d12 : 0;

    let bannerNotice = '';
    if (data.source === 'online' && lastD > 0) {
      bannerNotice = `
        <div style="background:rgba(16,185,129,0.12); border:1px solid rgba(16,185,129,0.3); border-radius:8px; padding:0.6rem 0.85rem; margin-bottom:0.9rem; font-size:0.82rem; color:#34d399; display:flex; align-items:center; gap:0.4rem;">
          <span>✅</span> <strong>Cotação e proventos encontrados!</strong> Você pode conferir ou ajustar os dados antes de salvar:
        </div>
      `;
    } else if (data.source === 'benchmark') {
      bannerNotice = `
        <div style="background:rgba(14,165,233,0.12); border:1px solid rgba(14,165,233,0.3); border-radius:8px; padding:0.6rem 0.85rem; margin-bottom:0.9rem; font-size:0.82rem; color:#38bdf8; display:flex; align-items:center; gap:0.4rem;">
          <span>📊</span> <strong>Cotação e histórico de referência B3 carregados!</strong> Confira os valores e ajuste se desejar:
        </div>
      `;
    } else {
      bannerNotice = `
        <div style="background:rgba(245,158,11,0.12); border:1px solid rgba(245,158,11,0.3); border-radius:8px; padding:0.6rem 0.85rem; margin-bottom:0.9rem; font-size:0.82rem; color:#fbbf24; display:flex; align-items:center; gap:0.4rem;">
          <span>✍️</span> <strong>Preencha ou ajuste os dados:</strong> Informe a cotação e o último dividendo para calcular as métricas.
        </div>
      `;
    }

    container.innerHTML = `
      <div style="background: linear-gradient(145deg, rgba(30,41,59,0.9), rgba(15,23,42,0.95)); border: 1.5px solid rgba(56,189,248,0.35); border-radius: 12px; padding: 1.15rem; box-shadow: 0 8px 25px rgba(0,0,0,0.4);">
        ${bannerNotice}

        <!-- Cabeçalho do Ativo -->
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:0.75rem; margin-bottom:0.85rem;">
          <div>
            <label class="form-label" style="font-size:0.75rem; color:#94a3b8; font-weight:700;">TICKER / CÓDIGO *</label>
            <input type="text" id="b3_new_ticker" class="form-input" value="${data.ticker}" style="text-transform:uppercase; font-weight:800; font-size:1.1rem; color:#38bdf8;" required>
          </div>
          <div>
            <label class="form-label" style="font-size:0.75rem; color:#94a3b8; font-weight:700;">TIPO DE ATIVO *</label>
            <select id="b3_new_type" class="form-select" style="font-weight:700;">
              <option value="FII" ${data.type === 'FII' ? 'selected' : ''}>Fundo Imobiliário (FII)</option>
              <option value="Ação" ${data.type === 'Ação' ? 'selected' : ''}>Ação (B3)</option>
              <option value="Fiagro" ${data.type === 'Fiagro' ? 'selected' : ''}>Fiagro</option>
              <option value="ETF" ${data.type === 'ETF' ? 'selected' : ''}>ETF</option>
              <option value="BDR" ${data.type === 'BDR' ? 'selected' : ''}>BDR</option>
              <option value="Outro" ${data.type === 'Outro' ? 'selected' : ''}>Outro</option>
            </select>
          </div>
        </div>

        <div style="margin-bottom:0.85rem;">
          <label class="form-label" style="font-size:0.75rem; color:#94a3b8; font-weight:700;">NOME / RAZÃO SOCIAL</label>
          <input type="text" id="b3_new_name" class="form-input" value="${data.name}" placeholder="Ex: Maxi Renda FII">
        </div>

        <!-- Campos Numéricos -->
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:0.75rem; margin-bottom:0.85rem;">
          <div>
            <label class="form-label" style="font-size:0.75rem; color:#34d399; font-weight:700;">COTAÇÃO ATUAL (R$) *</label>
            <input type="number" step="0.01" min="0.01" id="b3_new_price" class="form-input" value="${p > 0 ? p.toFixed(2) : ''}" placeholder="0.00" style="font-weight:800; font-size:1.05rem;" oninput="app.updateB3NewAssetPreview()" required>
          </div>
          <div>
            <label class="form-label" style="font-size:0.75rem; color:#94a3b8; font-weight:700;">VARIAÇÃO HOJE (%)</label>
            <input type="number" step="0.01" id="b3_new_change" class="form-input" value="${change}" placeholder="0.00" oninput="app.updateB3NewAssetPreview()">
          </div>
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:0.75rem; margin-bottom:0.6rem;">
          <div>
            <label class="form-label" style="font-size:0.75rem; color:#38bdf8; font-weight:700;">ÚLTIMO DIVIDENDO PAGO (R$)</label>
            <input type="number" step="0.0001" min="0" id="b3_new_last_div" class="form-input" value="${lastD > 0 ? lastD.toFixed(4) : ''}" placeholder="Ex: 0.10" style="font-weight:800; font-size:1.05rem; color:#38bdf8;" oninput="app.updateB3NewAssetPreview()">
          </div>
          <div>
            <label class="form-label" style="font-size:0.75rem; color:#94a3b8; font-weight:700;">DATA DO PAGAMENTO</label>
            <input type="date" id="b3_new_last_div_date" class="form-input" value="${data.lastDivDate || this.getTodayISO()}">
          </div>
        </div>

        <div style="margin-bottom:1rem;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.25rem;">
            <label class="form-label" style="font-size:0.75rem; color:#fbbf24; font-weight:700; margin:0;">TOTAL DIVIDENDOS 12M (R$)</label>
            <button type="button" class="btn-text" style="color:#fbbf24; font-size:0.75rem; background:rgba(251,191,36,0.1); border:1px solid rgba(251,191,36,0.3); border-radius:4px; padding:0.15rem 0.5rem; cursor:pointer;" onclick="app.autoCalc12m()">
              ⚡ 12M = Último × 12
            </button>
          </div>
          <input type="number" step="0.0001" min="0" id="b3_new_div12m" class="form-input" value="${d12 > 0 ? d12.toFixed(4) : ''}" placeholder="Ex: 1.20" style="font-weight:800; font-size:1.05rem; color:#fbbf24;" oninput="app.updateB3NewAssetPreview()">
        </div>

        <!-- Card de Pré-Visualização Dinâmica dos Indicadores -->
        <div style="background:rgba(15,23,42,0.8); border:1px solid rgba(255,255,255,0.08); border-radius:10px; padding:0.85rem; margin-bottom:1.15rem;">
          <div style="font-size:0.72rem; text-transform:uppercase; font-weight:800; color:#94a3b8; margin-bottom:0.55rem; letter-spacing:0.5px;">
            📊 Indicadores Calculados em Tempo Real
          </div>
          <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:0.65rem;">
            <div>
              <div style="font-size:0.68rem; color:#34d399; text-transform:uppercase; font-weight:700;">Dividend Yield</div>
              <div id="b3_preview_dy" style="font-size:1.15rem; font-weight:800; color:#10b981;">${dy.toFixed(2)}%<span style="font-size:0.7rem; color:#94a3b8;"> a.a.</span></div>
            </div>
            <div>
              <div style="font-size:0.68rem; color:#38bdf8; text-transform:uppercase; font-weight:700;">Último Provento</div>
              <div id="b3_preview_last_div" style="font-size:1.15rem; font-weight:800; color:#38bdf8;">${formatBRL(lastD)}</div>
            </div>
            <div>
              <div style="font-size:0.68rem; color:#fbbf24; text-transform:uppercase; font-weight:700;">Número Mágico</div>
              <div id="b3_preview_magic" style="font-size:1.05rem; font-weight:800; color:#f59e0b;">${magicNum} cotas</div>
              <div id="b3_preview_magic_cost" style="font-size:0.68rem; color:#94a3b8;">${formatBRL(magicCost)}</div>
            </div>
            <div style="grid-column: span 3; border-top:1px dashed rgba(255,255,255,0.08); padding-top:0.4rem; margin-top:0.2rem;">
              <div style="font-size:0.68rem; color:#94a3b8; text-transform:uppercase; font-weight:700;">Renda Passiva p/ R$ 1.000 Investidos</div>
              <div id="b3_preview_renda" style="font-size:0.95rem; font-weight:800; color:#34d399;">
                ${formatBRL(rendaMensal1000)}/mês <span style="font-size:0.75rem; color:#94a3b8;">(${formatBRL(rendaAnual1000)}/ano)</span>
              </div>
            </div>
          </div>
        </div>

        <button type="button" class="btn-primary" style="width:100%; padding:0.85rem; font-size:1rem; font-weight:800; display:flex; align-items:center; justify-content:center; gap:0.5rem; background:linear-gradient(135deg, #10b981, #059669); border:none; border-radius:8px; cursor:pointer; box-shadow:0 4px 15px rgba(16,185,129,0.3);" onclick="app.confirmAddSearchedB3Asset()">
          <span>✅</span> Confirmar e Salvar no Radar B3
        </button>
      </div>
    `;
  },

  updateB3NewAssetPreview() {
    const pInput = document.getElementById('b3_new_price');
    const lastDInput = document.getElementById('b3_new_last_div');
    const d12Input = document.getElementById('b3_new_div12m');

    const p = Number(pInput?.value) || 0;
    const lastD = Number(lastDInput?.value) || 0;
    const d12 = Number(d12Input?.value) || 0;

    const dy = (p > 0 && d12 > 0) ? ((d12 / p) * 100) : 0;
    const magicNum = (p > 0 && lastD > 0) ? Math.ceil(p / lastD) : 0;
    const magicCost = magicNum * p;
    const rendaMensal1000 = p > 0 ? (1000 / p) * lastD : 0;
    const rendaAnual1000 = p > 0 ? (1000 / p) * d12 : 0;

    const elDy = document.getElementById('b3_preview_dy');
    if (elDy) elDy.innerHTML = `${dy.toFixed(2)}%<span style="font-size:0.7rem; color:#94a3b8;"> a.a.</span>`;

    const elLast = document.getElementById('b3_preview_last_div');
    if (elLast) elLast.textContent = formatBRL(lastD);

    const elMagic = document.getElementById('b3_preview_magic');
    if (elMagic) elMagic.textContent = `${magicNum} cotas`;

    const elMagicCost = document.getElementById('b3_preview_magic_cost');
    if (elMagicCost) elMagicCost.textContent = formatBRL(magicCost);

    const elRenda = document.getElementById('b3_preview_renda');
    if (elRenda) {
      elRenda.innerHTML = `${formatBRL(rendaMensal1000)}/mês <span style="font-size:0.75rem; color:#94a3b8;">(${formatBRL(rendaAnual1000)}/ano)</span>`;
    }
  },

  autoCalc12m() {
    const lastDInput = document.getElementById('b3_new_last_div');
    const d12Input = document.getElementById('b3_new_div12m');
    const lastD = Number(lastDInput?.value) || 0;
    if (lastD > 0 && d12Input) {
      d12Input.value = (lastD * 12).toFixed(4);
      this.updateB3NewAssetPreview();
    } else {
      this.showToast('Informe primeiro o valor do Último Dividendo.', 'warning');
    }
  },

  confirmAddSearchedB3Asset() {
    const tickerInput = document.getElementById('b3_new_ticker');
    const typeInput = document.getElementById('b3_new_type');
    const nameInput = document.getElementById('b3_new_name');
    const priceInput = document.getElementById('b3_new_price');
    const changeInput = document.getElementById('b3_new_change');
    const lastDivInput = document.getElementById('b3_new_last_div');
    const lastDivDateInput = document.getElementById('b3_new_last_div_date');
    const div12mInput = document.getElementById('b3_new_div12m');

    const ticker = (tickerInput?.value || '').trim().toUpperCase();
    if (!ticker) {
      this.showToast('Por favor, informe o código do ativo (Ticker).', 'warning');
      tickerInput?.focus();
      return;
    }

    const price = Number(priceInput?.value) || 0;
    if (price <= 0) {
      this.showToast('Por favor, informe uma cotação maior que zero para o ativo.', 'warning');
      priceInput?.focus();
      return;
    }

    const type = typeInput?.value || (ticker.endsWith('11') ? 'FII' : 'Ação');
    const name = (nameInput?.value || ticker).trim();
    const change = Number(changeInput?.value) || 0;
    const lastDiv = Number(lastDivInput?.value) || 0;
    const lastDivDate = lastDivDateInput?.value || null;
    let div12m = Number(div12mInput?.value) || 0;

    // Se div12m estiver zerado mas houver último dividendo, projeta para 12 meses
    if (div12m <= 0 && lastDiv > 0) {
      div12m = Number((lastDiv * 12).toFixed(4));
    }

    const dy = (price > 0 && div12m > 0) ? Number(((div12m / price) * 100).toFixed(2)) : 0;

    const assetData = {
      ticker,
      type,
      name,
      price,
      change,
      lastDiv,
      lastDivDate,
      div12m,
      dy
    };

    store.addMapeandoB3Asset(assetData);
    this.closeModal('modalNovoAtivoB3');
    this.renderMapeandoB3();
    this.showToast(`✅ ${ticker} adicionado com sucesso ao seu Radar B3!`, 'success');

    // Sincroniza automaticamente com o cofre na nuvem (Supabase)
    if (typeof supabaseService !== 'undefined') {
      supabaseService.syncToCloud(true);
    }
  },

  openModalEditarAtivoB3(id) {
    const b3 = store.getMapeandoB3();
    const asset = b3.assets.find(a => a.id === id);
    if (!asset) return;

    document.getElementById('b3_edit_id').value = asset.id;
    document.getElementById('b3_edit_ticker').value = asset.ticker;
    document.getElementById('b3_edit_type').value = asset.type || 'FII';
    document.getElementById('b3_edit_name').value = asset.name || '';
    document.getElementById('b3_edit_price').value = asset.price || '';
    document.getElementById('b3_edit_change').value = asset.change || 0;
    document.getElementById('b3_edit_last_div').value = asset.lastDiv || '';
    document.getElementById('b3_edit_last_div_date').value = asset.lastDivDate || this.getTodayISO();
    document.getElementById('b3_edit_div12m').value = asset.div12m || '';

    const btnDelete = document.getElementById('btnDeleteAtivoB3');
    if (btnDelete) {
      btnDelete.onclick = () => this.deleteAtivoB3(asset.id, asset.ticker);
    }

    this.openModal('modalEditarAtivoB3');
  },

  deleteAtivoB3(id, ticker) {
    if (confirm(`Deseja realmente remover o ativo ${ticker || ''} do radar B3?`)) {
      store.deleteMapeandoB3Asset(id);
      this.closeModal('modalEditarAtivoB3');
      this.renderMapeandoB3();
      this.showToast(`Ativo ${ticker || ''} removido com sucesso.`, 'info');
      if (typeof supabaseService !== 'undefined') {
        supabaseService.syncToCloud(true);
      }
    }
  },

  // Consulta dados de um ativo na B3 com fallbacks múltiplos
  async fetchSingleB3AssetOnline(ticker) {
    ticker = (ticker || '').trim().toUpperCase();
    if (!ticker) return null;

    let fetchedPrice = 0;
    let fetchedChange = 0;
    let fetchedName = '';
    let fetchedType = ticker.endsWith('11') ? 'FII' : 'Ação';
    let fetchedLastDiv = 0;
    let fetchedLastDivDate = null;
    let fetchedDiv12m = 0;
    let source = 'online';

    // 1. Consulta em Tempo Real na TradingView (Cotação + Proventos em ~300ms, sem bloqueio de CORS)
    try {
      const tvBody = JSON.stringify({
        symbols: { tickers: [`BMFBOVESPA:${ticker}`] },
        columns: [
          'close',
          'change',
          'description',
          'type',
          'subtype',
          'dividend_amount_recent',
          'dividends_yield',
          'dividends_yield_current',
          'payment_date_recent'
        ]
      });

      const tvRes = await Promise.race([
        fetch('https://scanner.tradingview.com/brazil/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: tvBody
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
      ]);

      if (tvRes && tvRes.ok) {
        const tvJson = await tvRes.json();
        const item = tvJson?.data?.[0];
        if (item && item.d) {
          if (Number(item.d[0]) > 0) fetchedPrice = Number(Number(item.d[0]).toFixed(2));
          if (item.d[1] !== undefined && item.d[1] !== null) fetchedChange = Number(Number(item.d[1]).toFixed(2));
          if (item.d[2]) fetchedName = item.d[2];
          if (item.d[4] === 'fii' || item.d[4] === 'closedend') fetchedType = 'FII';
          else if (item.d[3] === 'stock') fetchedType = 'Ação';

          // Proventos / Último Dividendo
          const lastD = Number(item.d[5]) || 0;
          if (lastD > 0) fetchedLastDiv = Number(lastD.toFixed(4));

          // Data do pagamento
          const payTs = Number(item.d[8]);
          if (payTs > 0) {
            try {
              fetchedLastDivDate = new Date(payTs * 1000).toISOString().split('T')[0];
            } catch (eDate) {}
          }

          // Dividend Yield e Projeção 12M
          const dyVal = Number(item.d[6]) || Number(item.d[7]) || 0;
          if (dyVal > 0 && fetchedPrice > 0) {
            fetchedDiv12m = Number(((dyVal / 100) * fetchedPrice).toFixed(4));
          } else if (fetchedLastDiv > 0) {
            fetchedDiv12m = Number((fetchedLastDiv * 12).toFixed(4));
          }
        }
      }
    } catch (eTV) {}

    // 2. Consulta Rápida na Brapi (Se TradingView não trouxe ou se tem token Brapi com dividendos)
    if (fetchedPrice <= 0 || store.data.settings?.brapiToken) {
      try {
        const brapiToken = store.data.settings?.brapiToken;
        const brapiUrl = brapiToken
          ? `https://brapi.dev/api/quote/${encodeURIComponent(ticker)}?token=${encodeURIComponent(brapiToken)}&dividends=true`
          : `https://brapi.dev/api/quote/list?search=${encodeURIComponent(ticker)}`;

        const bRes = await Promise.race([
          fetch(brapiUrl),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
        ]);

        if (bRes && bRes.ok) {
          const bData = await bRes.json();
          if (bData.results && bData.results[0]) {
            const item = bData.results[0];
            if (item.regularMarketPrice > 0) fetchedPrice = Number(item.regularMarketPrice);
            if (item.regularMarketChangePercent !== undefined) fetchedChange = Number(item.regularMarketChangePercent);
            if (item.longName || item.shortName) fetchedName = item.longName || item.shortName;
            if (item.dividendsData?.cashDividends?.length > 0) {
              const divs = item.dividendsData.cashDividends;
              fetchedLastDiv = Number(divs[0].rate) || 0;
              if (divs[0].paymentDate) fetchedLastDivDate = divs[0].paymentDate.split('T')[0];
              fetchedDiv12m = Number(divs.reduce((acc, d) => acc + (Number(d.rate) || 0), 0)) || 0;
            }
          } else if (bData.stocks) {
            const item = bData.stocks.find(s => (s.stock || '').toUpperCase() === ticker) || bData.stocks[0];
            if (item) {
              if (!fetchedPrice && item.close > 0) fetchedPrice = Number(item.close);
              if (fetchedChange === 0 && item.change !== undefined) fetchedChange = Number(item.change);
              if (!fetchedName && item.name && item.name !== ticker) fetchedName = item.name;
              if (item.subType === 'fii') fetchedType = 'FII';
              else if (item.type === 'stock') fetchedType = 'Ação';
            }
          }
        }
      } catch (eBrapi) {}
    }

    // 3. Fallback Inteligente: Tabela de Benchmark Local para Proventos
    const benchmark = this.b3Benchmarks[ticker];
    if (benchmark) {
      if (fetchedPrice <= 0 && benchmark.price > 0) fetchedPrice = benchmark.price;
      if (fetchedChange === 0 && benchmark.change !== undefined) fetchedChange = benchmark.change;
      if (!fetchedName || fetchedName === ticker) fetchedName = benchmark.name;
      if (benchmark.type) fetchedType = benchmark.type;
      if (fetchedLastDiv <= 0 && benchmark.lastDiv > 0) fetchedLastDiv = benchmark.lastDiv;
      if (!fetchedLastDivDate && benchmark.lastDivDate) fetchedLastDivDate = benchmark.lastDivDate;
      if (fetchedDiv12m <= 0 && benchmark.div12m > 0) fetchedDiv12m = benchmark.div12m;
      if (source !== 'online' || fetchedLastDiv === benchmark.lastDiv) source = 'benchmark';
    }

    // Se ainda não temos div12m mas temos o último dividendo, projeta (lastDiv * 12)
    if (fetchedDiv12m <= 0 && fetchedLastDiv > 0) {
      fetchedDiv12m = Number((fetchedLastDiv * 12).toFixed(4));
    }

    return {
      ticker,
      name: fetchedName || ticker,
      type: fetchedType,
      price: Number(fetchedPrice.toFixed(2)) || 0,
      change: Number(fetchedChange.toFixed(2)) || 0,
      lastDiv: Number(fetchedLastDiv.toFixed(4)) || 0,
      lastDivDate: fetchedLastDivDate || new Date().toISOString().split('T')[0],
      div12m: Number(fetchedDiv12m.toFixed(4)) || 0,
      source: fetchedPrice > 0 ? (benchmark && fetchedLastDiv === benchmark.lastDiv ? 'benchmark' : 'online') : 'manual'
    };
  },

  async fetchOnlineB3Data() {
    const btn = document.getElementById('btnFetchB3Online');
    const icon = document.getElementById('b3SyncIcon');
    if (btn) btn.disabled = true;
    if (icon) icon.classList.add('b3-spinning');
    this.showToast('Buscando cotações e proventos atualizados na B3...', 'info');

    const b3 = store.getMapeandoB3();
    const assets = (b3 && Array.isArray(b3.assets)) ? b3.assets : [];
    if (assets.length === 0) {
      if (btn) btn.disabled = false;
      if (icon) icon.classList.remove('b3-spinning');
      return;
    }

    const updatedList = [];
    const validAssets = assets.filter(a => a.ticker && a.ticker !== 'UA1111');

    // 1. Atualização em Lote Ultra-Rápida via Scanner TradingView (300ms com Cotações + Proventos)
    let tvSuccess = false;
    try {
      const symbols = validAssets.map(a => `BMFBOVESPA:${a.ticker.trim().toUpperCase()}`);
      const bodyPayload = JSON.stringify({
        symbols: { tickers: symbols },
        columns: [
          'close',
          'change',
          'description',
          'type',
          'subtype',
          'dividend_amount_recent',
          'dividends_yield',
          'dividends_yield_current',
          'payment_date_recent'
        ]
      });

      const tvRes = await Promise.race([
        fetch('https://scanner.tradingview.com/brazil/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: bodyPayload
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000))
      ]);

      if (tvRes && tvRes.ok) {
        const tvJson = await tvRes.json();
        if (tvJson && Array.isArray(tvJson.data) && tvJson.data.length > 0) {
          tvJson.data.forEach(item => {
            const sym = (item.s || '').replace('BMFBOVESPA:', '').toUpperCase();
            const close = Number(item.d?.[0]) || 0;
            const change = Number(item.d?.[1]) || 0;
            const desc = item.d?.[2] || '';
            const lastD = Number(item.d?.[5]) || 0;
            const dyVal = Number(item.d?.[6]) || Number(item.d?.[7]) || 0;
            const payTs = Number(item.d?.[8]);

            const matchedAsset = validAssets.find(a => a.ticker.toUpperCase() === sym);
            if (matchedAsset && close > 0) {
              const up = {
                id: matchedAsset.id,
                ticker: matchedAsset.ticker,
                price: Number(close.toFixed(2)),
                change: Number(change.toFixed(2))
              };
              if (desc && (!matchedAsset.name || matchedAsset.name === matchedAsset.ticker)) {
                up.name = desc;
              }

              // Atualiza proventos automaticamente da B3
              if (lastD > 0) {
                up.lastDiv = Number(lastD.toFixed(4));
                if (payTs > 0) {
                  try {
                    up.lastDivDate = new Date(payTs * 1000).toISOString().split('T')[0];
                  } catch (eDate) {}
                }
                if (dyVal > 0) {
                  up.div12m = Number(((dyVal / 100) * close).toFixed(4));
                  up.dy = Number(dyVal.toFixed(2));
                } else {
                  up.div12m = Number((lastD * 12).toFixed(4));
                  up.dy = Number(((up.div12m / close) * 100).toFixed(2));
                }
              } else if (!matchedAsset.lastDiv || matchedAsset.lastDiv <= 0) {
                // Tenta fallback do benchmark local se ainda zerado
                const bm = this.b3Benchmarks ? this.b3Benchmarks[sym] : null;
                if (bm && bm.lastDiv > 0) {
                  up.lastDiv = bm.lastDiv;
                  up.lastDivDate = bm.lastDivDate;
                  up.div12m = bm.div12m;
                  up.dy = Number(((bm.div12m / close) * 100).toFixed(2));
                }
              }

              updatedList.push(up);
            }
          });
          if (updatedList.length > 0) {
            tvSuccess = true;
          }
        }
      }
    } catch (eTV) {
      console.warn('[MapeandoB3] Consulta em lote TradingView falhou, usando fallback individual:', eTV);
    }

    // 2. Fallback paralelo para ativos não localizados
    if (!tvSuccess || updatedList.length < validAssets.length) {
      const missingAssets = validAssets.filter(a => !updatedList.some(u => u.ticker.toUpperCase() === a.ticker.toUpperCase()));
      const parallelPromises = missingAssets.map(async (asset) => {
        try {
          const onlineData = await this.fetchSingleB3AssetOnline(asset.ticker);
          if (onlineData && onlineData.price > 0) {
            return {
              id: asset.id,
              ticker: asset.ticker,
              price: onlineData.price,
              change: onlineData.change,
              name: onlineData.name,
              lastDiv: onlineData.lastDiv,
              lastDivDate: onlineData.lastDivDate,
              div12m: onlineData.div12m
            };
          }
        } catch (e) {}
        return null;
      });

      const fallbackResults = await Promise.all(parallelPromises);
      fallbackResults.forEach(res => {
        if (res && res.price > 0) {
          updatedList.push(res);
        }
      });
    }

    // 3. Salva no banco de dados local, recalcula métricas e sincroniza na nuvem
    const nowIso = new Date().toISOString();
    if (updatedList.length > 0) {
      store.saveMapeandoB3OnlineData(updatedList, nowIso);
      this.renderMapeandoB3();
      this.showToast(`✅ ${updatedList.length} ativo(s) atualizados com cotações da B3 em tempo real!`, 'success');
    } else {
      store.saveMapeandoB3OnlineData([], nowIso);
      this.renderMapeandoB3();
      this.showToast('✓ Cotações de referência verificadas e mantidas atualizadas!', 'success');
    }

    if (typeof supabaseService !== 'undefined') {
      supabaseService.syncToCloud(true);
    }

    if (btn) btn.disabled = false;
    if (icon) icon.classList.remove('b3-spinning');
  },

  // =========================================================================
  // BIND DE EVENTOS GERAIS
  // =========================================================================
  bindEvents() {
    // Formulário de Login
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        this.handleLoginSubmit(e);
      });
    }

    // Toggle de Senha no Login
    const btnTogglePwd = document.getElementById('btnToggleLoginPwd');
    if (btnTogglePwd) {
      btnTogglePwd.addEventListener('click', () => {
        const inp = document.getElementById('loginPassword');
        if (inp.type === 'password') {
          inp.type = 'text';
        } else {
          inp.type = 'password';
        }
      });
    }

    // Mobile Sidebar Toggle
    const btnMobile = document.getElementById('btnMobileToggle');
    if (btnMobile) {
      btnMobile.addEventListener('click', () => {
        this.toggleSidebarMobile();
      });
    }

    // Navegação Sidebar Desktop & Barra Inferior Mobile
    document.querySelectorAll('.nav-item, .mobile-nav-item[data-tab]').forEach(item => {
      item.addEventListener('click', () => {
        const tab = item.dataset.tab;
        if (tab) this.navigateTo(tab);
      });
    });

    // Inputs de Troco Jotur e Troco Mastes (Cálculo em tempo real)
    document.querySelectorAll('.coin-input').forEach(inp => {
      inp.addEventListener('input', () => {
        if (inp.id && inp.id.startsWith('ms_')) {
          this.calculateMastes();
        } else {
          this.calculateJotur();
        }
      });
    });

    // Busca de Senhas
    const pwdSearch = document.getElementById('pwdSearchInput');
    if (pwdSearch) {
      pwdSearch.addEventListener('input', () => this.renderSenhas());
    }

    // Formulário Inserir Rendimento (Renda + Meses; Valor, Data, Banco e Status)
    const formRev = document.getElementById('formNovaReceita');
    if (formRev) {
      formRev.addEventListener('submit', (e) => {
        e.preventDefault();
        const source = (document.getElementById('rev_source')?.value || '').trim();
        if (!source) {
          this.showToast('Por favor, digite o nome da fonte de renda.', 'warning');
          return;
        }

        const value = parseMoney(document.getElementById('rev_value')?.value);
        const date = document.getElementById('rev_date')?.value || '';
        const bank = document.getElementById('rev_bank')?.value || '';
        const status = document.getElementById('rev_status')?.value || 'Pendente';

        // Coleta meses marcados (se nenhum marcado, usa o mês em foco)
        let checkedMonths = Array.from(document.querySelectorAll('input[name="rev_month_chk"]:checked'))
          .map(chk => Number(chk.value));

        if (checkedMonths.length === 0) {
          checkedMonths = [this.activeMonth];
        }

        store.addRevenueToMonths({
          source,
          months: checkedMonths,
          bank,
          value,
          date,
          status
        });

        this.closeModal('modalNovaReceita');
        formRev.reset();

        // Se o mês atual não estava na seleção mas selecionou meses, navega para o primeiro selecionado
        if (!checkedMonths.includes(this.activeMonth) && checkedMonths.length > 0) {
          this.activeMonth = checkedMonths[0];
        }

        this.renderMeses();
        this.renderResumo();
        
        this.showToast(`✓ Rendimento "${source}" salvo com sucesso!`, 'success');
      });
    }

    // Formulário Confirmar Recebimento (Preencher Valor & Data ao Marcar Pago)
    const formConfirmPay = document.getElementById('formConfirmarRecebimento');
    if (formConfirmPay) {
      formConfirmPay.addEventListener('submit', (e) => {
        e.preventDefault();
        const monthNum = Number(document.getElementById('pay_rev_month').value);
        const id = document.getElementById('pay_rev_id').value;
        const value = parseMoney(document.getElementById('pay_rev_value').value);
        const date = document.getElementById('pay_rev_date').value;
        const bank = document.getElementById('pay_rev_bank').value;
        const updateBalance = document.getElementById('pay_rev_update_bank_balance')?.checked;

        const m = store.data.months[monthNum];
        if (m) {
          const item = m.revenues.find(r => r.id === id);
          if (item) {
            item.value = value;
            item.date = date;
            item.bank = bank;
            item.status = 'Pago';

            if (updateBalance && value > 0) {
              store.creditToBank(bank, value);
            }

            store.save();
            this.closeModal('modalConfirmarRecebimento');
            formConfirmPay.reset();
            this.renderMeses();
            this.renderResumo();
            this.showToast(`Recebimento de ${formatBRL(value)} confirmado e atrelado ao ${bank}!`, 'success');
          }
        }
      });
    }

    // Formulário Editar Receita
    const formEditRev = document.getElementById('formEditarReceita');
    if (formEditRev) {
      formEditRev.addEventListener('submit', (e) => {
        e.preventDefault();
        const monthNum = Number(document.getElementById('edit_rev_month').value);
        const id = document.getElementById('edit_rev_id').value;
        const syncAll = document.getElementById('edit_rev_sync_all')?.checked || false;

        const updated = {
          source: document.getElementById('edit_rev_source').value.trim(),
          value: parseMoney(document.getElementById('edit_rev_value').value),
          date: document.getElementById('edit_rev_date').value,
          status: document.getElementById('edit_rev_status').value,
          bank: document.getElementById('edit_rev_bank').value
        };

        store.updateRevenue(monthNum, id, updated, syncAll);
        this.closeModal('modalEditarReceita');
        formEditRev.reset();
        this.renderMeses();
        this.renderResumo();
        this.showToast(syncAll ? 'Receita anual atualizada em todos os meses!' : 'Receita atualizada com sucesso!', 'success');
      });
    }

    // Formulário Nova Despesa Fixa
    const formFix = document.getElementById('formNovaDespesaFixa');
    if (formFix) {
      formFix.addEventListener('submit', (e) => {
        e.preventDefault();
        const desc = document.getElementById('fix_desc').value.trim() || 'Despesa Fixa';
        const dueDayRaw = document.getElementById('fix_due_day').value.trim();
        const dueDay = dueDayRaw !== '' ? Math.min(31, Math.max(1, parseInt(dueDayRaw, 10))) : null;
        const valExpected = parseMoney(document.getElementById('fix_val_exp').value) || 0;
        const valPaidRaw = document.getElementById('fix_val_paid').value.trim();
        const status = document.getElementById('fix_status').value || 'Pendente';
        const paymentDateInput = document.getElementById('fix_payment_date');
        let paymentDate = (status === 'Pago' && paymentDateInput) ? (paymentDateInput.value || this.getTodayISO()) : '';
        let valPaid = 0;
        if (valPaidRaw !== '') {
          valPaid = parseMoney(valPaidRaw);
        } else if (status === 'Pago') {
          valPaid = valExpected;
        }

        // Seleção de Meses (idêntico ao Rendimento / Receita)
        const checkedBoxes = Array.from(document.querySelectorAll('input[name="fix_month_chk"]:checked'));
        const targetMonths = checkedBoxes.length > 0 ? checkedBoxes.map(c => Number(c.value)) : [this.activeMonth];
        const annualGroupId = targetMonths.length > 1 ? 'fix_grp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4) : null;
        const year = parseInt(store.activeYear, 10) || new Date().getFullYear();

        targetMonths.forEach(mNum => {
          let dueDate = '';
          if (dueDay) {
            const daysInM = new Date(year, mNum, 0).getDate();
            const actualDay = Math.min(dueDay, daysInM);
            dueDate = `${year}-${String(mNum).padStart(2, '0')}-${String(actualDay).padStart(2, '0')}`;
          }

          let mPaymentDate = '';
          if (status === 'Pago') {
            mPaymentDate = (paymentDateInput && paymentDateInput.value && targetMonths.length === 1)
              ? paymentDateInput.value
              : (dueDate || this.getDefaultDateForMonth(mNum, year));
          }

          const exp = {
            description: desc,
            dueDay: dueDay,
            dueDate: dueDate,
            valueExpected: valExpected,
            valuePaid: valPaid,
            paymentDate: mPaymentDate,
            status: status,
            bank: '', // Banco permanece em branco no cadastro, conforme solicitado
            type: targetMonths.length > 1 ? 'multi-mes' : 'mensal',
            annualGroupId: annualGroupId
          };
          store.addFixedExpense(mNum, exp);
        });

        this.closeModal('modalNovaDespesaFixa');
        formFix.reset();
        this.renderMeses();
        this.renderResumo();
        const msg = targetMonths.length > 1 
          ? `Despesa fixa cadastrada como recorrente para ${targetMonths.length} meses!` 
          : 'Despesa fixa cadastrada com sucesso!';
        this.showToast(msg, 'success');
      });
    }

    // Formulário Editar Despesa Fixa
    const formEditFix = document.getElementById('formEditarDespesaFixa');
    if (formEditFix) {
      formEditFix.addEventListener('submit', (e) => {
        e.preventDefault();
        const monthNum = Number(document.getElementById('edit_fix_month').value) || this.activeMonth;
        const id = document.getElementById('edit_fix_id').value;
        const desc = document.getElementById('edit_fix_desc').value.trim() || 'Despesa Fixa';
        const dueDayRaw = document.getElementById('edit_fix_due_day').value.trim();
        const dueDay = dueDayRaw !== '' ? Math.min(31, Math.max(1, parseInt(dueDayRaw, 10))) : null;
        const valExpected = parseMoney(document.getElementById('edit_fix_val_exp').value) || 0;
        const valPaidRaw = document.getElementById('edit_fix_val_paid').value.trim();
        const status = document.getElementById('edit_fix_status').value || 'Pendente';
        const editPayDateInput = document.getElementById('edit_fix_payment_date');
        let paymentDate = (status === 'Pago' && editPayDateInput) ? editPayDateInput.value : '';
        if (status === 'Pendente') paymentDate = '';
        let valPaid = 0;
        if (valPaidRaw !== '') {
          valPaid = parseMoney(valPaidRaw);
        } else if (status === 'Pago') {
          valPaid = valExpected;
        }

        const year = parseInt(store.activeYear, 10) || new Date().getFullYear();
        let dueDate = '';
        if (dueDay) {
          const daysInM = new Date(year, monthNum, 0).getDate();
          const actualDay = Math.min(dueDay, daysInM);
          dueDate = `${year}-${String(monthNum).padStart(2, '0')}-${String(actualDay).padStart(2, '0')}`;
        }

        const updated = {
          description: desc,
          dueDay: dueDay,
          dueDate: dueDate,
          valueExpected: valExpected,
          valuePaid: valPaid,
          paymentDate: paymentDate,
          status: status,
          bank: document.getElementById('edit_fix_bank').value || ''
        };

        const cascadeRadio = document.querySelector('input[name="edit_fix_cascade_option"]:checked');
        const cascadeMode = cascadeRadio ? cascadeRadio.value : 'single';

        store.updateFixedExpense(monthNum, id, updated, cascadeMode);
        this.closeModal('modalEditarDespesaFixa');
        formEditFix.reset();
        this.renderMeses();
        this.renderResumo();

        if (cascadeMode === 'following') {
          this.showToast('Despesa atualizada para este mês e todos os seguintes!', 'success');
        } else if (cascadeMode === 'all') {
          this.showToast('Despesa atualizada em todos os meses do ano!', 'success');
        } else {
          this.showToast('Despesa fixa atualizada com sucesso!', 'success');
        }
      });
    }

    // Formulário Editar Parcela de Cartão
    const formEditCardInst = document.getElementById('formEditarParcelaCartao');
    if (formEditCardInst) {
      formEditCardInst.addEventListener('submit', (e) => {
        e.preventDefault();
        const monthNum = Number(document.getElementById('edit_card_inst_month').value) || this.activeMonth;
        const key = document.getElementById('edit_card_inst_key').value;
        const valPaidRaw = document.getElementById('edit_card_inst_val_paid').value.trim();
        const status = document.getElementById('edit_card_inst_status').value;
        const valPaid = parseMoney(valPaidRaw);

        store.setCardInstallmentPaidValue(monthNum, key, valPaid, status);
        this.closeModal('modalEditarParcelaCartao');
        formEditCardInst.reset();
        this.renderMeses();
        this.renderResumo();
        this.showToast('Parcela de cartão atualizada com sucesso!', 'success');
      });
    }

    // Formulário Editar Fatura de Cartão (Mastercard / Nubank)
    const formEditFatura = document.getElementById('formEditarFaturaCartao');
    if (formEditFatura) {
      formEditFatura.addEventListener('submit', (e) => {
        e.preventDefault();
        const monthNum = Number(document.getElementById('edit_fatura_month').value) || this.activeMonth;
        const cardKey = document.getElementById('edit_fatura_card').value;
        const valPaidRaw = document.getElementById('edit_fatura_val_paid').value.trim();
        const status = document.getElementById('edit_fatura_status').value;
        const valPaid = parseMoney(valPaidRaw);

        store.setCardInvoiceStatus(monthNum, cardKey, status, valPaid);
        this.closeModal('modalEditarFaturaCartao');
        formEditFatura.reset();
        this.renderMeses();
        this.renderResumo();
        this.renderActiveMonthSubtab();
        this.showToast('Fatura do cartão atualizada com sucesso!', 'success');
      });
    }

    // Formulário Nova Despesa Variável
    const formVar = document.getElementById('formNovaDespesaVariavel');
    if (formVar) {
      formVar.addEventListener('submit', (e) => {
        e.preventDefault();
        const exp = {
          description: document.getElementById('var_desc').value,
          date: document.getElementById('var_date').value,
          value: parseMoney(document.getElementById('var_val').value),
          bank: document.getElementById('var_bank').value
        };
        store.addVariableExpense(this.activeMonth, exp);
        this.closeModal('modalNovaDespesaVariavel');
        formVar.reset();
        this.renderMeses();
        this.renderResumo();
        this.showToast('Despesa variável adicionada!', 'success');
      });
    }

    // Formulário Nova Compra no Cartão: atualização dinâmica de fechamento e início de cobrança
    const cardDateInp = document.getElementById('card_date');
    const cardTypeInp = document.getElementById('card_type');
    if (cardDateInp) {
      cardDateInp.addEventListener('input', () => this.updateCardStartBillingSuggestion());
      cardDateInp.addEventListener('change', () => this.updateCardStartBillingSuggestion());
    }
    if (cardTypeInp) {
      cardTypeInp.addEventListener('change', () => this.updateCardStartBillingSuggestion());
    }

    const formCard = document.getElementById('formNovaCompraCartao');
    if (formCard) {
      formCard.addEventListener('submit', (e) => {
        e.preventDefault();
        const dateVal = document.getElementById('card_date').value;
        let dYear = Number(store.activeYear) || new Date().getFullYear();
        let dMonth = 1;
        let dDay = 1;
        if (dateVal) {
          const parts = dateVal.split('-');
          if (parts.length >= 2) {
            dYear = parseInt(parts[0], 10) || dYear;
            dMonth = parseInt(parts[1], 10) || 1;
            if (parts.length >= 3) dDay = parseInt(parts[2], 10) || 1;
          }
        }

        let sMonth = Number(document.getElementById('card_start_month').value) || 1;
        let sYear = Number(document.getElementById('card_start_year')?.value) || dYear;

        // Se a data de início da cobrança não foi definida ou ficou anterior, inicia no mês da compra
        if (!sMonth || !sYear || sYear < dYear || (sYear === dYear && sMonth < dMonth)) {
          sMonth = dMonth;
          sYear = dYear;
        }

        const rawInst = document.getElementById('card_installments').value;
        const isRec = rawInst === 'recorrente';
        const purchase = {
          description: document.getElementById('card_desc').value,
          place: document.getElementById('card_place').value,
          card: document.getElementById('card_type').value,
          date: dateVal,
          totalAmount: parseMoney(document.getElementById('card_val').value),
          installments: isRec ? 'recorrente' : (Number(rawInst) || 1),
          isRecurring: isRec,
          startMonth: sMonth,
          startYear: sYear
        };
        store.addCardPurchase(purchase);
        this.closeModal('modalNovaCompraCartao');
        formCard.reset();
        this.renderCartoes();
        this.renderMeses();
        this.renderResumo();
        this.showToast(`Compra no cartão cadastrada! Parcelas iniciadas em ${purchase.startMonth}/${purchase.startYear}.`, 'success');
      });
    }

    // Formulário Editar Compra no Cartão
    const formEditCard = document.getElementById('formEditarCompraCartao');
    if (formEditCard) {
      const editCardDate = document.getElementById('edit_card_date');
      const editCardType = document.getElementById('edit_card_type');
      const editCardVal = document.getElementById('edit_card_val');
      const editCardInst = document.getElementById('edit_card_installments');

      if (editCardDate) {
        editCardDate.addEventListener('input', () => this.updateEditCardStartBillingSuggestion());
        editCardDate.addEventListener('change', () => this.updateEditCardStartBillingSuggestion());
      }
      if (editCardType) editCardType.addEventListener('change', () => this.updateEditCardStartBillingSuggestion());
      if (editCardVal) editCardVal.addEventListener('input', () => this.updateEditCardStartBillingSuggestion());
      if (editCardInst) editCardInst.addEventListener('change', () => this.updateEditCardStartBillingSuggestion());

      formEditCard.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('edit_card_id').value;
        const desc = document.getElementById('edit_card_desc').value.trim() || 'Compra Cartão';
        const place = document.getElementById('edit_card_place').value.trim();
        const card = document.getElementById('edit_card_type').value;
        const dateVal = document.getElementById('edit_card_date').value;
        const totalAmount = parseMoney(document.getElementById('edit_card_val')?.value);
        const startMonth = Number(document.getElementById('edit_card_start_month')?.value) || 1;
        const startYear = Number(document.getElementById('edit_card_start_year')?.value) || (Number(store.activeYear) || new Date().getFullYear());
        const rawEditInst = document.getElementById('edit_card_installments').value;
        const isRecEdit = rawEditInst === 'recorrente';
        const installments = isRecEdit ? 'recorrente' : (Number(rawEditInst) || 1);

        store.updateCardPurchase(id, {
          description: desc,
          place: place,
          card: card,
          date: dateVal,
          totalAmount: totalAmount,
          installments: installments,
          isRecurring: isRecEdit,
          startMonth: startMonth,
          startYear: startYear
        });

        this.closeModal('modalEditarCompraCartao');
        formEditCard.reset();
        this.renderCartoes();
        this.renderMeses();
        this.renderResumo();
        this.renderCardPurchasesList();
        this.showToast('Compra no cartão atualizada com sucesso!', 'success');
      });
    }

    // Formulário Novo Sonho
    const formDream = document.getElementById('formNovoSonho');
    if (formDream) {
      formDream.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('dream_title').value.trim();
        let imageUrl = document.getElementById('dream_image_url').value.trim();

        // Se o usuário não clicou em buscar antes, busca agora automaticamente
        if (!imageUrl && title) {
          this.showToast('🔍 Buscando foto na web...', 'info');
          imageUrl = await this.fetchWebImage(title);
        }

        const dream = {
          title: title,
          value: parseMoney(document.getElementById('dream_val').value) || 0,
          targetDate: document.getElementById('dream_date').value,
          imageUrl: imageUrl || '',
          deposits: []
        };

        store.addDream(dream);
        this.closeModal('modalNovoSonho');
        formDream.reset();
        const prevContainer = document.getElementById('dreamImagePreviewContainer');
        if (prevContainer) prevContainer.style.display = 'none';
        this.renderSonhos();
        this.showToast('✨ Novo sonho cadastrado com foto da internet!', 'success');
      });
    }

    // Formulário Lançamento de Valor Guardado / Aporte
    const formAporte = document.getElementById('formAporteSonho');
    if (formAporte) {
      formAporte.addEventListener('submit', (e) => {
        e.preventDefault();
        const dreamId = document.getElementById('aporte_dream_id').value;
        const val = parseMoney(document.getElementById('aporte_val').value) || 0;
        const date = document.getElementById('aporte_date').value;
        const notes = document.getElementById('aporte_notes').value.trim();

        if (!dreamId) return;
        if (val <= 0) {
          this.showToast('Por favor, informe um valor válido para guardar.', 'warning');
          return;
        }

        store.addDreamDeposit(dreamId, {
          date: date || this.getTodayISO(),
          value: val,
          notes: notes || 'Lançamento guardado'
        });

        // Limpa campos do aporte mantendo a data de hoje
        document.getElementById('aporte_val').value = '';
        document.getElementById('aporte_notes').value = '';

        // Atualiza a visualização do modal (saldo faltante abatido!) e a tela de sonhos
        this.renderAporteModalContent(dreamId);
        this.renderSonhos();

        const dream = store.data.dreams.find(d => d.id === dreamId);
        const target = Number(dream?.value) || 0;
        const totalSaved = dream?.deposits?.reduce((acc, c) => acc + (Number(c.value) || 0), 0) || 0;
        const remaining = Math.max(0, target - totalSaved);

        this.showToast(`💰 Lançamento de ${formatBRL(val)} guardado! Saldo restante: ${formatBRL(remaining)}.`, 'success');
      });
    }

    // Formulário Bombeiro
    const formBombeiro = document.getElementById('formNovoBombeiro');
    if (formBombeiro) {
      formBombeiro.addEventListener('submit', (e) => {
        e.preventDefault();
        const recordId = document.getElementById('ff_record_id')?.value;
        const monthRef = document.getElementById('ff_month')?.value || '';
        const dateRequested = document.getElementById('ff_date_req')?.value || '';
        let datePayment = '';
        let status = 'Pendente';
        if (recordId) {
          const existing = store.data.firefighterRecords.find(r => r.id === recordId);
          if (existing) {
            status = existing.status || 'Pendente';
            datePayment = existing.datePayment || '';
          }
        }
        const shifts = this.currentModalShifts || [];
        const amount = shifts.filter(s => s.contemplated).length * 125.00;

        if (recordId) {
          store.updateFirefighterRecord(recordId, {
            monthRef,
            dateRequested,
            datePayment,
            amount,
            status,
            shifts
          });
          this.showToast('Registro do Bombeiro atualizado com sucesso!', 'success');
        } else {
          store.addFirefighterRecord({
            monthRef,
            dateRequested,
            datePayment,
            amount,
            status,
            shifts
          });
          this.showToast('Disponibilidades do Bombeiro salvas com sucesso!', 'success');
        }

        this.closeModal('modalNovoBombeiro');
        formBombeiro.reset();
        this.currentModalShifts = [];
        this.renderBombeiro();
        this.renderResumo();
      });
    }

    // (Os formulários de Investimentos formNovoAtivoBolsa, formNovaCaixinhaNubank, formNovoRendimentoBolsa e formNovoRendimentoNubank usam onsubmit="app.handleSave...(event)")

    // Formulário Banco e Cartão (8 Colunas)
    const formBanco = document.getElementById('formBancoCartao');
    if (formBanco) {
      formBanco.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('banco_id')?.value;
        const dados = {
          tabela: 'bancos_cartoes',
          banco: (document.getElementById('banco_nome')?.value || '').trim(),
          tipo_conta: (document.getElementById('banco_tipo_conta')?.value || '').trim(),
          senha_principal: (document.getElementById('banco_senha_principal')?.value || '').trim(),
          letra_auxiliar: (document.getElementById('banco_letra_auxiliar')?.value || '').trim(),
          login: (document.getElementById('banco_login')?.value || '').trim(),
          senha: (document.getElementById('banco_senha')?.value || '').trim(),
          senha_auxiliar: (document.getElementById('banco_senha_auxiliar')?.value || '').trim(),
          pix: (document.getElementById('banco_pix')?.value || '').trim(),
          observacoes: (document.getElementById('banco_obs')?.value || '').trim()
        };

        if (id) {
          store.updatePassword(id, dados);
          this.showToast('✅ Banco / Cartão atualizado com sucesso!', 'success');
        } else {
          store.addPassword(dados);
          this.showToast('🏦 Banco / Cartão cadastrado no cofre!', 'success');
        }

        this.closeModal('modalBancoCartao');
        formBanco.reset();
        this.renderSenhas();
      });
    }

    // Formulário Senha Geral (Sites, Emails, Dona Tania - Padrão ACBCSJ)
    const formGeral = document.getElementById('formSenhaGeral');
    if (formGeral) {
      formGeral.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('geral_id')?.value;
        const tabDestino = document.getElementById('geral_tabela')?.value || 'logins_sites';
        const dados = {
          tabela: tabDestino,
          servico: (document.getElementById('geral_servico')?.value || '').trim(),
          categoria: (document.getElementById('geral_categoria')?.value || '').trim(),
          status: document.getElementById('geral_status')?.value || 'ativo',
          login: (document.getElementById('geral_login')?.value || '').trim(),
          senha: (document.getElementById('geral_senha')?.value || '').trim(),
          senha_auxiliar: (document.getElementById('geral_senha_auxiliar')?.value || '').trim(),
          url: (document.getElementById('geral_url')?.value || '').trim(),
          observacoes: (document.getElementById('geral_obs')?.value || '').trim()
        };

        if (id) {
          store.updatePassword(id, dados);
          this.showToast('✅ Credencial atualizada com sucesso!', 'success');
        } else {
          store.addPassword(dados);
          this.showToast('🔐 Credencial guardada com sucesso no cofre!', 'success');
        }

        this.closeModal('modalSenhaGeral');
        formGeral.reset();
        this.renderSenhas();
      });
    }

    // Formulário Configuração Supabase
    const formSupabase = document.getElementById('formConfigSupabase');
    if (formSupabase) {
      formSupabase.addEventListener('submit', async (e) => {
        e.preventDefault();
        const url = document.getElementById('sb_url').value.trim();
        const key = document.getElementById('sb_key').value.trim();
        supabaseService.saveConfig(url, key);
        this.updateSupabaseModalUI();
        this.showToast('Chaves salvas! Enviando dados para o Supabase...', 'info');

        // Tenta sincronizar
        const res = await supabaseService.syncToCloud(false);
        if (res.success) {
          this.showToast('✅ Conectado e Sincronizado com o Supabase!', 'success');
          this.closeModal('modalConfigSupabase');
        } else {
          this.showToast(res.error || res.message || res.reason || 'Salvo localmente.', 'warning');
        }
      });
    }

    // Carregar inputs de Supabase se existirem
    const sbConfig = store.data.settings.supabase;
    if (sbConfig) {
      const urlInput = document.getElementById('sb_url');
      const keyInput = document.getElementById('sb_key');
      if (urlInput && sbConfig.url) urlInput.value = sbConfig.url;
      if (keyInput && sbConfig.anonKey) keyInput.value = sbConfig.anonKey;
    }

    // (A busca e cadastro de novo ativo B3 agora são gerenciados por app.searchAssetOnlineB3 e app.confirmAddSearchedB3Asset)

    // Formulário Editar Ativo B3
    const formEditB3 = document.getElementById('formEditarAtivoB3');
    if (formEditB3) {
      formEditB3.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('b3_edit_id').value;
        const ticker = document.getElementById('b3_edit_ticker').value.toUpperCase().trim();
        const type = document.getElementById('b3_edit_type').value;
        const name = document.getElementById('b3_edit_name').value.trim();
        const price = Number(document.getElementById('b3_edit_price').value);
        const change = Number(document.getElementById('b3_edit_change')?.value) || 0;
        const lastDiv = Number(document.getElementById('b3_edit_last_div').value) || 0;
        const lastDivDate = document.getElementById('b3_edit_last_div_date')?.value || '';
        const div12m = Number(document.getElementById('b3_edit_div12m').value) || 0;

        store.updateMapeandoB3Asset(id, {
          ticker,
          type,
          name,
          price,
          change,
          lastDiv,
          lastDivDate,
          div12m
        });

        this.closeModal('modalEditarAtivoB3');
        this.renderMapeandoB3();
        this.showToast(`Ativo ${ticker} atualizado no radar!`, 'success');
      });
    }
  },

  // =========================================================================
  // 10. MÓDULO CONFIGURAÇÕES DO SISTEMA (BANCOS, CARTÕES, GRUPOS & BANCO DE DADOS)
  // =========================================================================
  activeConfigSubtab: 'todos',

  setConfigSubtab(subtab) {
    this.activeConfigSubtab = subtab;
    this.renderConfiguracoes();
  },

  renderConfiguracoes() {
    const container = document.getElementById('configuracoesContainer');
    if (!container) return;

    const accounts = Array.isArray(store.data.accounts) ? store.data.accounts : [];
    const cards = Array.isArray(store.data.creditCards) ? store.data.creditCards : [];
    const groups = store.getSystemGroups();
    const bCfg = groups.bombeiroConfig || { shiftValue: 125, guAzul: 'Moraes', guAmarela: 'Lapa', guVerde: 'Uitajuci', guVermelha: 'Búrigo' };
    const joturBase = Number(store.data.jotur?.baseAmount) || 200;
    const mastesBase = Number(store.data.trocoMastes?.baseAmount) || 400;
    const settings = store.data.settings || {};
    const isSbConfigured = typeof supabaseService !== 'undefined' && supabaseService.isConfigured();
    const lastSyncStr = settings.lastSync
      ? `${new Date(settings.lastSync).toLocaleDateString('pt-BR')} às ${new Date(settings.lastSync).toLocaleTimeString('pt-BR')}`
      : 'Sincronização automática ativa';

    const tab = this.activeConfigSubtab || 'todos';
    const showBancos = (tab === 'todos' || tab === 'bancos');
    const showCartoes = (tab === 'todos' || tab === 'cartoes');
    const showGrupos = (tab === 'todos' || tab === 'grupos');
    const showParametros = (tab === 'todos' || tab === 'parametros');
    const showPerfil = (tab === 'todos' || tab === 'perfil_banco');

    const groupDefinitions = [
      {
        key: 'accountTypes',
        icon: '🏦',
        title: 'Tipos de Conta Bancária',
        subtitle: 'Usados no cadastro de Bancos e no Cofre de Senhas',
        color: '#38bdf8'
      },
      {
        key: 'revenueSources',
        icon: '💰',
        title: 'Fontes de Renda (Rendimentos)',
        subtitle: 'Sugestões rápidas ao lançar Receitas Mensais e Anuais',
        color: '#10b981'
      },
      {
        key: 'expenseCategories',
        icon: '📌',
        title: 'Categorias / Contas de Despesas',
        subtitle: 'Sugestões rápidas para Despesas Fixas e Variáveis',
        color: '#f87171'
      },
      {
        key: 'investmentTypes',
        icon: '📈',
        title: 'Tipos de Ativos (Bolsa / B3)',
        subtitle: 'Opções de classificação na Carteira e no Mapeando B3',
        color: '#60a5fa'
      },
      {
        key: 'earningTypes',
        icon: '💵',
        title: 'Tipos de Proventos / Dividendos',
        subtitle: 'Opções ao lançar rendimentos de FIIs e Ações',
        color: '#34d399'
      },
      {
        key: 'nubankCategories',
        icon: '🟣',
        title: 'Modalidades Nubank',
        subtitle: 'Divisão entre Caixinhas e Dinheiro Separado',
        color: '#c084fc'
      }
    ];

    container.innerHTML = `
      <!-- CABEÇALHO EXECUTIVO DE CONFIGURAÇÕES -->
      <div class="cfg-hero-banner">
        <div class="cfg-hero-left">
          <div style="display:flex; align-items:center; gap:0.65rem; flex-wrap:wrap;">
            <h2 style="margin:0; font-size:1.5rem; font-weight:800; color:#ffffff; display:flex; align-items:center; gap:0.5rem;">
              <span>⚙️</span> Central de Configurações & Grupos do Sistema
            </h2>
            <span class="badge-pill-counter green" style="font-size:0.75rem;">
              ● Persistência Ativa no Banco de Dados
            </span>
          </div>
          <p style="margin:0.4rem 0 0 0; font-size:0.88rem; color:var(--text-secondary); max-width:780px;">
            Altere, adicione ou remova <strong>Bancos</strong>, <strong>Cartões de Crédito</strong>, <strong>Categorias</strong>, <strong>Abas do Cofre</strong> e <strong>Parâmetros Operacionais</strong>. Todas as mudanças são salvas imediatamente no banco de dados local e sincronizadas na nuvem (Supabase) para que você nunca perca suas personalizações.
          </p>
          <div style="margin-top:0.5rem; font-size:0.78rem; color:#94a3b8; display:flex; align-items:center; gap:1rem; flex-wrap:wrap;">
            <span>☁️ <strong>Status Nuvem:</strong> ${isSbConfigured ? 'Conectado ao Supabase' : 'Modo Local'}</span>
            <span>🕒 <strong>Última gravação:</strong> ${lastSyncStr}</span>
          </div>
        </div>

        <div class="cfg-hero-actions">
          <button type="button" class="btn-primary" style="width:auto; height:40px; padding:0 1.15rem; font-size:0.84rem;" onclick="app.syncCloud()">
            ☁️ Salvar / Sincronizar Nuvem Agora
          </button>
          <button type="button" class="btn-header" style="height:40px; padding:0 1rem; font-size:0.84rem;" onclick="app.downloadBackup()">
            📥 Baixar Backup (.JSON)
          </button>
        </div>
      </div>

      <!-- NAVEGAÇÃO DE SUB-ABAS DAS CONFIGURAÇÕES -->
      <div class="cfg-subtabs-bar">
        <button type="button" class="cfg-subtab-btn ${tab === 'todos' ? 'active' : ''}" onclick="app.setConfigSubtab('todos')">
          <span>🎛️</span> Todos os Grupos
        </button>
        <button type="button" class="cfg-subtab-btn ${tab === 'bancos' ? 'active' : ''}" onclick="app.setConfigSubtab('bancos')">
          <span>🏦</span> Bancos & Contas <span class="cfg-count-pill">${accounts.length}</span>
        </button>
        <button type="button" class="cfg-subtab-btn ${tab === 'cartoes' ? 'active' : ''}" onclick="app.setConfigSubtab('cartoes')">
          <span>💳</span> Cartões de Crédito <span class="cfg-count-pill">${cards.length}</span>
        </button>
        <button type="button" class="cfg-subtab-btn ${tab === 'grupos' ? 'active' : ''}" onclick="app.setConfigSubtab('grupos')">
          <span>📂</span> Categorias & Opções
        </button>
        <button type="button" class="cfg-subtab-btn ${tab === 'parametros' ? 'active' : ''}" onclick="app.setConfigSubtab('parametros')">
          <span>🚒</span> Troco & Bombeiro
        </button>
        <button type="button" class="cfg-subtab-btn ${tab === 'perfil_banco' ? 'active' : ''}" onclick="app.setConfigSubtab('perfil_banco')">
          <span>🔐</span> Perfil & Banco de Dados
        </button>
      </div>

      <!-- ====================================================================
           1. SEÇÃO: BANCOS & CONTAS BANCÁRIAS
           ==================================================================== -->
      ${showBancos ? `
      <div class="card" style="margin-bottom: 1.5rem;">
        <div class="card-header" style="flex-wrap:wrap; gap:0.75rem;">
          <div class="card-title-group">
            <div class="card-icon" style="background:rgba(37, 99, 235, 0.15); color:#60a5fa;">🏦</div>
            <div>
              <h3 class="card-title">Bancos & Contas Bancárias (${accounts.length})</h3>
              <span class="card-subtitle">Gerencie os bancos exibidos no Resumo, Receitas, Despesas Fixas/Variáveis e Investimentos. Se renomear um banco, todos os lançamentos vinculados são atualizados automaticamente.</span>
            </div>
          </div>
          <button type="button" class="btn-primary" style="width:auto; height:40px; padding:0 1.15rem; font-size:0.85rem;" onclick="app.openModalConfigBanco()">
            + Adicionar Novo Banco
          </button>
        </div>

        <div class="cfg-items-grid">
          ${accounts.map(acc => `
            <div class="cfg-entity-card" style="border-top: 3px solid ${acc.color || '#2563eb'};">
              <div class="cfg-entity-top">
                <div style="display:flex; align-items:center; gap:0.6rem;">
                  <span class="cfg-color-dot" style="background:${acc.color || '#2563eb'};"></span>
                  <div>
                    <div class="cfg-entity-name">${escapeHtml(acc.name)}</div>
                    <span class="status-badge neutral" style="font-size:0.7rem;">${escapeHtml(acc.type || 'Conta Corrente')}</span>
                  </div>
                </div>
                <div class="table-actions">
                  <button type="button" class="btn-table-icon" title="Editar Banco" onclick="app.openModalConfigBanco('${escapeHtml(acc.id)}')">
                    ✏️
                  </button>
                  <button type="button" class="btn-table-icon delete" title="Excluir Banco" onclick="app.deleteConfigBanco('${escapeHtml(acc.id)}', '${escapeHtml(acc.name)}')">
                    🗑️
                  </button>
                </div>
              </div>
              <div class="cfg-entity-bottom">
                <div>
                  <span style="font-size:0.72rem; color:var(--text-muted); text-transform:uppercase;">Saldo Atual</span>
                  <div style="font-size:1.1rem; font-weight:800; color:#34d399;">${formatBRL(acc.balance)}</div>
                </div>
                <button type="button" class="btn-header" style="padding:0.3rem 0.65rem; font-size:0.76rem;" onclick="app.openModalConfigBanco('${escapeHtml(acc.id)}')">
                  ⚙️ Alterar Nome / Tipo
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}

      <!-- ====================================================================
           2. SEÇÃO: CARTÕES DE CRÉDITO
           ==================================================================== -->
      ${showCartoes ? `
      <div class="card" style="margin-bottom: 1.5rem;">
        <div class="card-header" style="flex-wrap:wrap; gap:0.75rem;">
          <div class="card-title-group">
            <div class="card-icon" style="background:rgba(245, 158, 11, 0.15); color:#fbbf24;">💳</div>
            <div>
              <h3 class="card-title">Cartões de Crédito (${cards.length})</h3>
              <span class="card-subtitle">Gerencie seus cartões, dias de fechamento/vencimento e cores. Os cartões aparecem automaticamente nas Faturas do Mês e na Matriz Anual de Cartões.</span>
            </div>
          </div>
          <button type="button" class="btn-primary" style="width:auto; height:40px; padding:0 1.15rem; font-size:0.85rem; background:linear-gradient(135deg, #f59e0b, #d97706);" onclick="app.openModalConfigCartao()">
            + Adicionar Novo Cartão
          </button>
        </div>

        <div class="cfg-items-grid">
          ${cards.map(c => `
            <div class="cfg-entity-card" style="border-top: 3px solid ${c.color || '#f59e0b'};">
              <div class="cfg-entity-top">
                <div style="display:flex; align-items:center; gap:0.6rem;">
                  <span class="cfg-color-dot" style="background:${c.color || '#f59e0b'};"></span>
                  <div>
                    <div class="cfg-entity-name">${escapeHtml(c.name)}</div>
                    <span style="font-size:0.75rem; color:var(--text-secondary);">
                      🔒 Fecha dia <strong>${c.closingDay || 1}</strong> • 📅 Vence dia <strong>${c.dueDay || 10}</strong>
                    </span>
                  </div>
                </div>
                <div class="table-actions">
                  <button type="button" class="btn-table-icon" title="Editar Cartão" onclick="app.openModalConfigCartao('${escapeHtml(c.id)}')">
                    ✏️
                  </button>
                  <button type="button" class="btn-table-icon delete" title="Excluir Cartão" onclick="app.deleteConfigCartao('${escapeHtml(c.id)}', '${escapeHtml(c.name)}')">
                    🗑️
                  </button>
                </div>
              </div>
              <div class="cfg-entity-bottom">
                <div>
                  <span style="font-size:0.72rem; color:var(--text-muted); text-transform:uppercase;">Limite Configurado</span>
                  <div style="font-size:1rem; font-weight:700; color:#e2e8f0;">${Number(c.limit) > 0 ? formatBRL(c.limit) : 'Sem limite fixo'}</div>
                </div>
                <button type="button" class="btn-header" style="padding:0.3rem 0.65rem; font-size:0.76rem;" onclick="app.openModalConfigCartao('${escapeHtml(c.id)}')">
                  ⚙️ Editar Cartão
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}

      <!-- ====================================================================
           3. SEÇÃO: GRUPOS, CATEGORIAS E ABAS DO SISTEMA
           ==================================================================== -->
      ${showGrupos ? `
      <div class="card" style="margin-bottom: 1.5rem;">
        <div class="card-header">
          <div class="card-title-group">
            <div class="card-icon" style="background:rgba(16, 185, 129, 0.15); color:#34d399;">📂</div>
            <div>
              <h3 class="card-title">Grupos, Categorias & Listas de Opções do Sistema</h3>
              <span class="card-subtitle">Personalize as opções exibidas nos seletores e sugestões automáticas em todas as telas</span>
            </div>
          </div>
        </div>

        <div class="cfg-groups-grid">
          ${groupDefinitions.map(def => {
            const list = Array.isArray(groups[def.key]) ? groups[def.key] : [];
            return `
              <div class="cfg-group-box">
                <div class="cfg-group-box-header">
                  <div>
                    <h4 style="margin:0; font-size:0.98rem; font-weight:800; color:#ffffff; display:flex; align-items:center; gap:0.45rem;">
                      <span>${def.icon}</span> ${def.title}
                      <span class="cfg-count-pill">${list.length}</span>
                    </h4>
                    <p style="margin:0.2rem 0 0 0; font-size:0.76rem; color:var(--text-muted);">${def.subtitle}</p>
                  </div>
                </div>

                <!-- Input para adicionar nova opção ao grupo -->
                <div style="display:flex; gap:0.45rem; margin:0.85rem 0;">
                  <input type="text" id="cfg_new_${def.key}" class="form-input" style="height:36px; padding:0 0.75rem; font-size:0.84rem;" placeholder="Nova opção em ${def.title}..." onkeydown="if(event.key==='Enter'){event.preventDefault(); app.addConfigGroupItem('${def.key}');}">
                  <button type="button" class="btn-primary" style="width:auto; height:36px; padding:0 0.9rem; font-size:0.8rem; flex-shrink:0;" onclick="app.addConfigGroupItem('${def.key}')">
                    + Adicionar
                  </button>
                </div>

                <!-- Lista de opções -->
                <div class="cfg-tags-list">
                  ${list.length === 0 ? `<span style="font-size:0.8rem; color:var(--text-muted);">Nenhuma opção cadastrada.</span>` : list.map((item, idx) => `
                    <div class="cfg-tag-item">
                      <span class="cfg-tag-text">${escapeHtml(item)}</span>
                      <div class="cfg-tag-actions">
                        <button type="button" class="cfg-tag-btn" title="Renomear opção" onclick="app.editConfigGroupItem('${def.key}', ${idx})">✏️</button>
                        <button type="button" class="cfg-tag-btn danger" title="Remover opção" onclick="app.deleteConfigGroupItem('${def.key}', ${idx})">✕</button>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            `;
          }).join('')}

          <!-- SUB-GRUPO ESPECIAL: ABAS / GRUPOS DO COFRE DE SENHAS -->
          <div class="cfg-group-box" style="grid-column: 1 / -1;">
            <div class="cfg-group-box-header">
              <div>
                <h4 style="margin:0; font-size:1rem; font-weight:800; color:#ffffff; display:flex; align-items:center; gap:0.45rem;">
                  <span>🔐</span> Abas / Grupos do Cofre de Senhas
                  <span class="cfg-count-pill">${(groups.passwordTabs || []).length}</span>
                </h4>
                <p style="margin:0.2rem 0 0 0; font-size:0.78rem; color:var(--text-muted);">
                  Renomeie as abas existentes do Cofre de Senhas (ex: "D. Tânia", "Sites & Logins") ou crie novos grupos personalizados de senhas.
                </p>
              </div>
            </div>

            <div style="display:flex; gap:0.5rem; flex-wrap:wrap; margin:0.85rem 0;">
              <input type="text" id="cfg_new_pwd_tab_icon" class="form-input" style="width:70px; height:38px; padding:0 0.5rem; text-align:center; font-size:1rem;" value="🔐" placeholder="Ícone">
              <input type="text" id="cfg_new_pwd_tab_name" class="form-input" style="flex:1; min-width:200px; height:38px; padding:0 0.75rem; font-size:0.85rem;" placeholder="Nome da nova aba/grupo de senhas (ex: Trabalho, Certificados, Família)...">
              <button type="button" class="btn-primary" style="width:auto; height:38px; padding:0 1.1rem; font-size:0.82rem;" onclick="app.addConfigPasswordTab()">
                + Criar Aba no Cofre
              </button>
            </div>

            <div class="cfg-tags-list">
              ${(groups.passwordTabs || []).map(t => `
                <div class="cfg-tag-item" style="padding:0.45rem 0.75rem;">
                  <span style="font-size:1.05rem;">${escapeHtml(t.icon || '🔐')}</span>
                  <span class="cfg-tag-text" style="font-weight:700;">${escapeHtml(t.name)}</span>
                  <div class="cfg-tag-actions">
                    <button type="button" class="cfg-tag-btn" title="Renomear aba" onclick="app.editConfigPasswordTab('${escapeHtml(t.id)}')">✏️</button>
                    ${t.id !== 'bancos_cartoes' ? `
                      <button type="button" class="cfg-tag-btn danger" title="Excluir aba" onclick="app.deleteConfigPasswordTab('${escapeHtml(t.id)}', '${escapeHtml(t.name)}')">✕</button>
                    ` : ''}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
      ` : ''}

      <!-- ====================================================================
           4. SEÇÃO: PARÂMETROS OPERACIONAIS (TROCO JOTUR, MASTES E BOMBEIRO)
           ==================================================================== -->
      ${showParametros ? `
      <div class="card" style="margin-bottom: 1.5rem;">
        <div class="card-header">
          <div class="card-title-group">
            <div class="card-icon" style="background:rgba(239, 68, 68, 0.15); color:#f87171;">🚒</div>
            <div>
              <h3 class="card-title">Parâmetros Operacionais (Troco Jotur, Mastes & Bombeiro Comunitário)</h3>
              <span class="card-subtitle">Configure os valores fixos de referência e nomes de coordenadores das guarnições</span>
            </div>
          </div>
        </div>

        <div class="cfg-groups-grid">
          <!-- CARD: VALORES BASE DE TROCO -->
          <div class="cfg-group-box">
            <h4 style="margin:0 0 0.35rem 0; font-size:0.98rem; font-weight:800; color:#ffffff;">🚌 Valores Base de Conferência de Troco</h4>
            <p style="margin:0 0 1rem 0; font-size:0.78rem; color:var(--text-muted);">
              Defina o fundo de troco fixo para cálculo automático de sobra (lucro) ou falta no caixa.
            </p>
            <div class="form-grid-2">
              <div class="form-group" style="margin-bottom:0.75rem;">
                <label class="form-label">Base Troco Jotur (R$)</label>
                <input type="number" step="0.01" id="cfg_jotur_base" class="form-input" style="padding-left:0.85rem; height:40px; font-weight:700;" value="${joturBase}">
              </div>
              <div class="form-group" style="margin-bottom:0.75rem;">
                <label class="form-label">Base Troco Mastes (R$)</label>
                <input type="number" step="0.01" id="cfg_mastes_base" class="form-input" style="padding-left:0.85rem; height:40px; font-weight:700;" value="${mastesBase}">
              </div>
            </div>
            <button type="button" class="btn-primary" style="height:40px; font-size:0.84rem;" onclick="app.saveConfigTrocoBases()">
              💾 Salvar Bases de Troco
            </button>
          </div>

          <!-- CARD: ESCALA E VALOR DO BOMBEIRO COMUNITÁRIO -->
          <div class="cfg-group-box">
            <h4 style="margin:0 0 0.35rem 0; font-size:0.98rem; font-weight:800; color:#ffffff;">🚒 Bombeiro Comunitário (Plantão & Guarnições)</h4>
            <p style="margin:0 0 1rem 0; font-size:0.78rem; color:var(--text-muted);">
              Valor pago por serviço contemplado e nomes dos coordenadores das 4 Guarnições (escala 24x72).
            </p>
            <div class="form-group" style="margin-bottom:0.75rem;">
              <label class="form-label">Valor por Plantão Contemplado (R$)</label>
              <input type="number" step="0.01" id="cfg_bm_shift_val" class="form-input" style="padding-left:0.85rem; height:40px; font-weight:800; color:#34d399;" value="${bCfg.shiftValue || 125}">
            </div>
            <div class="form-grid-2">
              <div class="form-group" style="margin-bottom:0.65rem;">
                <label class="form-label" style="color:#38bdf8;">🔵 GU AZUL (Resp.)</label>
                <input type="text" id="cfg_bm_gu_azul" class="form-input" style="padding-left:0.75rem; height:38px;" value="${escapeHtml(bCfg.guAzul || 'Moraes')}">
              </div>
              <div class="form-group" style="margin-bottom:0.65rem;">
                <label class="form-label" style="color:#facc15;">🟡 GU AMARELA (Resp.)</label>
                <input type="text" id="cfg_bm_gu_amarela" class="form-input" style="padding-left:0.75rem; height:38px;" value="${escapeHtml(bCfg.guAmarela || 'Lapa')}">
              </div>
              <div class="form-group" style="margin-bottom:0.75rem;">
                <label class="form-label" style="color:#4ade80;">🟢 GU VERDE (Resp.)</label>
                <input type="text" id="cfg_bm_gu_verde" class="form-input" style="padding-left:0.75rem; height:38px;" value="${escapeHtml(bCfg.guVerde || 'Uitajuci')}">
              </div>
              <div class="form-group" style="margin-bottom:0.75rem;">
                <label class="form-label" style="color:#f87171;">🔴 GU VERMELHA (Resp.)</label>
                <input type="text" id="cfg_bm_gu_vermelha" class="form-input" style="padding-left:0.75rem; height:38px;" value="${escapeHtml(bCfg.guVermelha || 'Búrigo')}">
              </div>
            </div>
            <button type="button" class="btn-primary" style="height:40px; font-size:0.84rem;" onclick="app.saveConfigBombeiro()">
              💾 Salvar Configurações do Bombeiro
            </button>
          </div>
        </div>
      </div>
      ` : ''}

      <!-- ====================================================================
           5. SEÇÃO: PERFIL DO USUÁRIO, SEGURANÇA & BANCO DE DADOS (SUPABASE / BACKUP)
           ==================================================================== -->
      ${showPerfil ? `
      <div class="card" style="margin-bottom: 1.5rem;">
        <div class="card-header">
          <div class="card-title-group">
            <div class="card-icon" style="background:rgba(168, 85, 247, 0.15); color:#c084fc;">🔐</div>
            <div>
              <h3 class="card-title">Perfil de Acesso & Banco de Dados na Nuvem</h3>
              <span class="card-subtitle">Gerencie seus dados de login e a sincronização com o banco de dados Supabase</span>
            </div>
          </div>
        </div>

        <div class="cfg-groups-grid">
          <!-- PERFIL & SENHA DE ACESSO -->
          <div class="cfg-group-box">
            <h4 style="margin:0 0 0.35rem 0; font-size:0.98rem; font-weight:800; color:#ffffff;">👤 Dados do Usuário & Senha do Sistema</h4>
            <p style="margin:0 0 1rem 0; font-size:0.78rem; color:var(--text-muted);">
              Personalize seu nome exibido no topo/menu lateral e suas credenciais de entrada.
            </p>
            <div class="form-group" style="margin-bottom:0.75rem;">
              <label class="form-label">Nome de Exibição</label>
              <input type="text" id="cfg_user_name" class="form-input" style="padding-left:0.85rem; height:40px;" value="${escapeHtml(settings.userName || 'Raphael Nilsen')}">
            </div>
            <div class="form-grid-2">
              <div class="form-group" style="margin-bottom:0.75rem;">
                <label class="form-label">E-mail Principal</label>
                <input type="email" id="cfg_user_email" class="form-input" style="padding-left:0.85rem; height:40px;" value="${escapeHtml(settings.userEmail || 'raphael_nilsen@hotmail.com')}">
              </div>
              <div class="form-group" style="margin-bottom:0.75rem;">
                <label class="form-label">Senha de Acesso</label>
                <input type="text" id="cfg_user_pwd" class="form-input" style="padding-left:0.85rem; height:40px;" value="${escapeHtml(settings.userPasswordHash || '12345')}">
              </div>
            </div>
            <button type="button" class="btn-primary" style="height:40px; font-size:0.84rem;" onclick="app.saveConfigProfile()">
              💾 Salvar Perfil e Senha
            </button>
          </div>

          <!-- BANCO DE DADOS SUPABASE & BACKUP -->
          <div class="cfg-group-box">
            <h4 style="margin:0 0 0.35rem 0; font-size:0.98rem; font-weight:800; color:#ffffff;">☁️ Banco de Dados Supabase & Backups</h4>
            <p style="margin:0 0 1rem 0; font-size:0.78rem; color:var(--text-muted);">
              Todas as opções alteradas nesta página ficam salvas em <code>localStorage</code> e na tabela <code>financial_vault</code> / <code>contas_bancarias</code> do Supabase.
            </p>
            <div style="background:rgba(16, 185, 129, 0.08); border:1px solid rgba(16, 185, 129, 0.25); border-radius:10px; padding:0.85rem 1rem; margin-bottom:1rem; font-size:0.82rem; color:#cbd5e1;">
              <div><strong>Status da Conexão:</strong> <span style="color:#34d399; font-weight:700;">${isSbConfigured ? '● Conectado ao Supabase' : '● Armazenamento Local'}</span></div>
              <div style="margin-top:0.25rem; color:#94a3b8; font-size:0.76rem;">Última sincronização: ${lastSyncStr}</div>
            </div>
            <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
              <button type="button" class="btn-primary" style="width:auto; height:38px; padding:0 1rem; font-size:0.8rem;" onclick="app.syncCloud()">
                ☁️ Sincronizar Agora
              </button>
              <button type="button" class="btn-header" style="height:38px; padding:0 0.9rem; font-size:0.8rem;" onclick="app.openModal('modalConfigSupabase')">
                ⚙️ Credenciais Supabase
              </button>
              <button type="button" class="btn-header" style="height:38px; padding:0 0.9rem; font-size:0.8rem;" onclick="app.downloadBackup()">
                📥 Exportar JSON
              </button>
              <button type="button" class="btn-header" style="height:38px; padding:0 0.9rem; font-size:0.8rem;" onclick="app.triggerImportBackup()">
                📂 Importar JSON
              </button>
            </div>
          </div>
        </div>
      </div>
      ` : ''}
    `;
  },

  // --- AÇÕES DE BANCOS EM CONFIGURAÇÕES ---
  openModalConfigBanco(bankId = null) {
    this.populateSystemSelects();
    const form = document.getElementById('formConfigBanco');
    if (form) form.reset();

    const idEl = document.getElementById('cfg_bank_id');
    const nameEl = document.getElementById('cfg_bank_name');
    const typeEl = document.getElementById('cfg_bank_type');
    const balEl = document.getElementById('cfg_bank_balance');
    const colorEl = document.getElementById('cfg_bank_color');
    const titleEl = document.getElementById('modalConfigBancoTitle');

    if (bankId) {
      const acc = (store.data.accounts || []).find(a => a.id === bankId);
      if (!acc) return;
      if (idEl) idEl.value = acc.id;
      if (nameEl) nameEl.value = acc.name || '';
      if (typeEl) {
        if (!Array.from(typeEl.options).some(o => o.value === acc.type)) {
          typeEl.innerHTML += `<option value="${escapeHtml(acc.type)}">${escapeHtml(acc.type)}</option>`;
        }
        typeEl.value = acc.type || 'Conta Corrente';
      }
      if (balEl) balEl.value = Number(acc.balance || 0).toFixed(2);
      if (colorEl) colorEl.value = acc.color || '#2563eb';
      if (titleEl) titleEl.textContent = `🏦 Editar Banco: ${acc.name}`;
    } else {
      if (idEl) idEl.value = '';
      if (balEl) balEl.value = '0.00';
      if (colorEl) colorEl.value = '#2563eb';
      if (titleEl) titleEl.textContent = '🏦 Adicionar Novo Banco / Conta';
    }

    this.openModal('modalConfigBanco');
  },

  saveConfigBanco(e) {
    if (e && e.preventDefault) e.preventDefault();
    const id = document.getElementById('cfg_bank_id')?.value;
    const name = document.getElementById('cfg_bank_name')?.value.trim();
    const type = document.getElementById('cfg_bank_type')?.value || 'Conta Corrente';
    const balance = Number(document.getElementById('cfg_bank_balance')?.value) || 0;
    const color = document.getElementById('cfg_bank_color')?.value || '#2563eb';

    if (!name) {
      this.showToast('Informe o nome do banco.', 'warning');
      return;
    }

    if (id) {
      store.updateAccount(id, { name, type, balance, color });
      this.showToast(`✅ Banco "${name}" atualizado e salvo no banco de dados!`, 'success');
    } else {
      store.addAccount({ name, type, balance, color });
      this.showToast(`✅ Novo banco "${name}" adicionado ao sistema!`, 'success');
    }

    this.closeModal('modalConfigBanco');
    this.populateSystemSelects();
    this.renderConfiguracoes();
    this.renderResumo();
  },

  deleteConfigBanco(id, name) {
    if ((store.data.accounts || []).length <= 1) {
      this.showToast('O sistema precisa manter pelo menos 1 conta bancária ativa.', 'warning');
      return;
    }
    if (confirm(`Deseja realmente excluir o banco "${name}" da lista de contas do sistema?`)) {
      store.deleteAccount(id);
      this.populateSystemSelects();
      this.renderConfiguracoes();
      this.renderResumo();
      this.showToast(`Banco "${name}" removido do sistema.`, 'info');
    }
  },

  // --- AÇÕES DE CARTÕES DE CRÉDITO EM CONFIGURAÇÕES ---
  openModalConfigCartao(cardId = null) {
    const form = document.getElementById('formConfigCartao');
    if (form) form.reset();

    const idEl = document.getElementById('cfg_card_id');
    const nameEl = document.getElementById('cfg_card_name');
    const closeEl = document.getElementById('cfg_card_closing');
    const dueEl = document.getElementById('cfg_card_due');
    const limitEl = document.getElementById('cfg_card_limit');
    const colorEl = document.getElementById('cfg_card_color');
    const titleEl = document.getElementById('modalConfigCartaoTitle');

    if (cardId) {
      const card = (store.data.creditCards || []).find(c => c.id === cardId);
      if (!card) return;
      if (idEl) idEl.value = card.id;
      if (nameEl) nameEl.value = card.name || '';
      if (closeEl) closeEl.value = card.closingDay || 1;
      if (dueEl) dueEl.value = card.dueDay || 10;
      if (limitEl) limitEl.value = Number(card.limit || 0);
      if (colorEl) colorEl.value = card.color || '#f59e0b';
      if (titleEl) titleEl.textContent = `💳 Editar Cartão: ${card.name}`;
    } else {
      if (idEl) idEl.value = '';
      if (closeEl) closeEl.value = 1;
      if (dueEl) dueEl.value = 10;
      if (limitEl) limitEl.value = 0;
      if (colorEl) colorEl.value = '#0ea5e9';
      if (titleEl) titleEl.textContent = '💳 Adicionar Novo Cartão de Crédito';
    }

    this.openModal('modalConfigCartao');
  },

  saveConfigCartao(e) {
    if (e && e.preventDefault) e.preventDefault();
    const id = document.getElementById('cfg_card_id')?.value;
    const name = document.getElementById('cfg_card_name')?.value.trim();
    const closingDay = parseInt(document.getElementById('cfg_card_closing')?.value, 10) || 1;
    const dueDay = parseInt(document.getElementById('cfg_card_due')?.value, 10) || 10;
    const limit = Number(document.getElementById('cfg_card_limit')?.value) || 0;
    const color = document.getElementById('cfg_card_color')?.value || '#f59e0b';

    if (!name) {
      this.showToast('Informe o nome do cartão.', 'warning');
      return;
    }

    if (id) {
      store.updateCreditCard(id, { name, closingDay, dueDay, limit, color });
      this.showToast(`✅ Cartão "${name}" atualizado e salvo no banco de dados!`, 'success');
    } else {
      store.addCreditCard({ name, closingDay, dueDay, limit, color });
      this.showToast(`✅ Novo cartão "${name}" adicionado ao sistema!`, 'success');
    }

    this.closeModal('modalConfigCartao');
    this.populateSystemSelects();
    this.renderConfiguracoes();
  },

  deleteConfigCartao(id, name) {
    if ((store.data.creditCards || []).length <= 1) {
      this.showToast('Mantenha pelo menos 1 cartão de crédito cadastrado.', 'warning');
      return;
    }
    if (confirm(`Deseja realmente remover o cartão "${name}"? As compras já lançadas serão preservadas.`)) {
      store.deleteCreditCard(id);
      this.populateSystemSelects();
      this.renderConfiguracoes();
      this.showToast(`Cartão "${name}" removido.`, 'info');
    }
  },

  // --- AÇÕES DE GRUPOS E CATEGORIAS EM CONFIGURAÇÕES ---
  addConfigGroupItem(groupKey) {
    const inp = document.getElementById(`cfg_new_${groupKey}`);
    if (!inp) return;
    const val = inp.value.trim();
    if (!val) {
      this.showToast('Digite um nome para adicionar ao grupo.', 'warning');
      return;
    }
    const added = store.addGroupOption(groupKey, val);
    if (!added) {
      this.showToast('Esta opção já existe neste grupo.', 'warning');
      return;
    }
    inp.value = '';
    this.populateSystemSelects();
    this.renderConfiguracoes();
    this.showToast(`✅ Opção "${val}" adicionada e salva no banco de dados!`, 'success');
  },

  editConfigGroupItem(groupKey, index) {
    const groups = store.getSystemGroups();
    const list = groups[groupKey];
    if (!Array.isArray(list) || index < 0 || index >= list.length) return;
    const currentVal = list[index];
    const newVal = prompt(`Editar opção "${currentVal}":`, currentVal);
    if (newVal !== null && newVal.trim() && newVal.trim() !== currentVal) {
      store.updateGroupOption(groupKey, index, newVal.trim());
      this.populateSystemSelects();
      this.renderConfiguracoes();
      this.showToast(`✅ Opção alterada para "${newVal.trim()}" e salva no banco de dados!`, 'success');
    }
  },

  deleteConfigGroupItem(groupKey, index) {
    const groups = store.getSystemGroups();
    const list = groups[groupKey];
    if (!Array.isArray(list) || index < 0 || index >= list.length) return;
    const targetVal = list[index];
    if (confirm(`Deseja remover a opção "${targetVal}" deste grupo?`)) {
      store.deleteGroupOption(groupKey, index);
      this.populateSystemSelects();
      this.renderConfiguracoes();
      this.showToast(`Opção "${targetVal}" removida.`, 'info');
    }
  },

  // --- AÇÕES DE ABAS DO COFRE DE SENHAS ---
  addConfigPasswordTab() {
    const iconInp = document.getElementById('cfg_new_pwd_tab_icon');
    const nameInp = document.getElementById('cfg_new_pwd_tab_name');
    const name = nameInp ? nameInp.value.trim() : '';
    const icon = iconInp ? iconInp.value.trim() || '🔐' : '🔐';

    if (!name) {
      this.showToast('Informe o nome da nova aba/grupo para o Cofre de Senhas.', 'warning');
      return;
    }
    store.addPasswordTab({ name, icon });
    if (nameInp) nameInp.value = '';
    this.populateSystemSelects();
    this.renderConfiguracoes();
    this.showToast(`✅ Nova aba "${name}" criada no Cofre de Senhas!`, 'success');
  },

  editConfigPasswordTab(tabId) {
    const groups = store.getSystemGroups();
    const tab = (groups.passwordTabs || []).find(t => t.id === tabId);
    if (!tab) return;
    const newName = prompt(`Renomear aba "${tab.name}" no Cofre de Senhas:`, tab.name);
    if (newName === null || !newName.trim()) return;
    const newIcon = prompt(`Ícone (emoji) para "${newName.trim()}":`, tab.icon || '🔐');
    store.updatePasswordTab(tabId, {
      name: newName.trim(),
      icon: (newIcon !== null && newIcon.trim()) ? newIcon.trim() : tab.icon
    });
    this.populateSystemSelects();
    this.renderConfiguracoes();
    this.showToast(`✅ Aba "${newName.trim()}" atualizada e salva!`, 'success');
  },

  deleteConfigPasswordTab(tabId, tabName) {
    if (confirm(`Deseja remover a aba "${tabName}" do Cofre de Senhas?`)) {
      store.deletePasswordTab(tabId);
      this.populateSystemSelects();
      this.renderConfiguracoes();
      this.showToast(`Aba "${tabName}" removida.`, 'info');
    }
  },

  // --- AÇÕES DE PARÂMETROS OPERACIONAIS (TROCO & BOMBEIRO) ---
  saveConfigTrocoBases() {
    const jVal = Number(document.getElementById('cfg_jotur_base')?.value);
    const mVal = Number(document.getElementById('cfg_mastes_base')?.value);
    if (!isNaN(jVal) && jVal >= 0) store.updateTrocoBase('jotur', jVal);
    if (!isNaN(mVal) && mVal >= 0) store.updateTrocoBase('mastes', mVal);
    this.renderConfiguracoes();
    this.showToast('✅ Valores base do Troco Jotur e Mastes salvos no banco de dados!', 'success');
  },

  saveConfigBombeiro() {
    const shiftValue = Number(document.getElementById('cfg_bm_shift_val')?.value) || 125;
    const guAzul = document.getElementById('cfg_bm_gu_azul')?.value || 'Moraes';
    const guAmarela = document.getElementById('cfg_bm_gu_amarela')?.value || 'Lapa';
    const guVerde = document.getElementById('cfg_bm_gu_verde')?.value || 'Uitajuci';
    const guVermelha = document.getElementById('cfg_bm_gu_vermelha')?.value || 'Búrigo';

    store.updateBombeiroConfig({ shiftValue, guAzul, guAmarela, guVerde, guVermelha });
    this.renderConfiguracoes();
    this.showToast('✅ Configurações e Guarnições do Bombeiro salvas no banco de dados!', 'success');
  },

  saveConfigProfile() {
    const userName = document.getElementById('cfg_user_name')?.value.trim();
    const userEmail = document.getElementById('cfg_user_email')?.value.trim();
    const userPasswordHash = document.getElementById('cfg_user_pwd')?.value.trim();

    store.updateUserProfile({ userName, userEmail, userPasswordHash });
    const sidebarUserEl = document.querySelector('.user-profile-badge .user-name');
    if (sidebarUserEl && userName) sidebarUserEl.textContent = userName;
    this.renderConfiguracoes();
    this.showToast('✅ Perfil e credenciais atualizados no banco de dados!', 'success');
  }
};

// Inicialização Global
document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
