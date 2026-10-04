/**
 * SISTEMA FINANCEIRO RAPHAEL NILSEN
 * Controlador da Aplicação e Interface Executiva
 */

// Formatador Monetário Brasileiro Executivo
function formatBRL(val) {
  const num = Number(val) || 0;
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

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
  activeTabCartao: 'todos',
  activeTabInvest: 'bolsa',

  init() {
    this.bindEvents();
    this.checkSession();
    this.startRealtimeHeader();
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
    const session = store.getSession();
    const loginScreen = document.getElementById('loginScreen');
    const appContainer = document.getElementById('appContainer');

    if (session && session.authenticated) {
      if (loginScreen) loginScreen.style.display = 'none';
      if (appContainer) appContainer.style.display = 'flex';
      this.render();
      this.autoSyncOnStartup();
    } else {
      if (loginScreen) loginScreen.style.display = 'flex';
      if (appContainer) appContainer.style.display = 'none';
    }
  },

  async autoSyncOnStartup() {
    if (typeof supabaseService !== 'undefined' && supabaseService.isConfigured()) {
      const res = await supabaseService.loadFromCloud(true);
      if (res.success) {
        this.render();
        this.showToast('☁️ Dados sincronizados com a Nuvem!', 'success');
      } else {
        // Se ainda não havia dados na nuvem, sobe o estado inicial
        supabaseService.syncToCloud(true);
      }
    }
  },

  async syncCloud() {
    const btn = document.getElementById('btnSyncCloud');
    if (btn) btn.textContent = '⏳ Sincronizando...';
    const res = await supabaseService.syncToCloud(false);
    if (btn) btn.textContent = '☁️ Nuvem';
    if (res.success) {
      this.showToast('✅ Sincronizado com o Supabase!', 'success');
    } else {
      this.showToast(res.error || res.reason || 'Erro ao sincronizar', 'warning');
    }
  },

  login(email, password) {
    const cleanEmail = email.trim().toLowerCase();
    const targetEmail = store.data.settings.userEmail.toLowerCase();
    const targetPwd = store.data.settings.userPasswordHash;

    if (cleanEmail === targetEmail && password === targetPwd) {
      store.setSession({
        email: cleanEmail,
        authenticated: true,
        loggedAt: new Date().toISOString()
      });
      this.checkSession();
      this.showToast('Bem-vindo, Raphael Nilsen!', 'success');
      return true;
    } else {
      return false;
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
        greetingEl.textContent = `${greeting}, Raphael Natayan Nilsen`;
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

    // Atualiza Sidebar Desktop
    document.querySelectorAll('.nav-item').forEach(item => {
      if (item.dataset.tab === tabId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Atualiza Barra Inferior Mobile
    document.querySelectorAll('.mobile-nav-item').forEach(item => {
      if (item.dataset.tab === tabId) {
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
      meses: `Gestão Mensal (${store.activeYear})`,
      cartoes: 'Cartão de Crédito e Compras Parceladas',
      senhas: 'Cofre de Senhas Protegido',
      sonhos: 'Sonhos & Planejamento de Compras',
      bombeiro: 'Bombeiro Comunitário (Ressarcimentos)',
      jotur: 'Controle de Caixa & Troco Jotur (R$ 200)',
      investimentos: 'Gestão de Ativos & Investimentos'
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

  // Disparador de Renderização
  render() {
    this.renderYearSelector();
    switch (this.currentTab) {
      case 'resumo':
        this.renderResumo();
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
      case 'investimentos':
        this.renderInvestimentos();
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
        <div class="bank-card ${acc.id}">
          <div class="bank-card-header">
            <span class="bank-name">${acc.name}</span>
            <span class="bank-badge">${acc.type}</span>
          </div>
          <div class="bank-balance">${formatBRL(acc.balance)}</div>
          <div class="bank-card-footer">
            <span>Disponível</span>
            <button class="btn-quick-edit-balance" onclick="app.promptEditBalance('${acc.id}', '${acc.name}', ${acc.balance})">
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

    const elFix = document.getElementById('monthSumFix');
    if (elFix) elFix.textContent = formatBRL(summary.fixed);

    const elVar = document.getElementById('monthSumVar');
    if (elVar) elVar.textContent = formatBRL(summary.variable);

    const elCard = document.getElementById('monthSumCard');
    if (elCard) elCard.textContent = formatBRL(summary.card);

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

    const elFix = document.getElementById('monthSumFix');
    if (elFix) elFix.textContent = formatBRL(summary.fixed);

    const elVar = document.getElementById('monthSumVar');
    if (elVar) elVar.textContent = formatBRL(summary.variable);

    const elCard = document.getElementById('monthSumCard');
    if (elCard) elCard.textContent = formatBRL(summary.card);

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
    const container = document.getElementById('monthSubtabContent');
    if (!container) return;

    const m = store.data.months[this.activeMonth];

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

          <!-- TABELA MINIMALISTA ESTILO NOTION (BANCO) -->
          <div class="notion-table-card">
            <div class="notion-header-bar">
              <div class="notion-title-group">
                <div class="notion-title-text">
                  <span>🏦</span>
                  <span>BANCO</span>
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
                        <div style="font-size: 1.05rem; font-weight: 600; color: #ffffff; margin-bottom: 0.35rem;">Nenhum lançamento no BANCO em ${m.name}</div>
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
                                 value="${r.date || ''}" 
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
                            <option value="" ${!r.bank ? 'selected' : ''}>— Selecionar Banco —</option>
                            <option value="Nubank (Nu)" ${r.bank === 'Nubank (Nu)' ? 'selected' : ''}>Nubank (Nu)</option>
                            <option value="Bradesco" ${r.bank === 'Bradesco' ? 'selected' : ''}>Bradesco</option>
                            <option value="Banco do Brasil" ${r.bank === 'Banco do Brasil' ? 'selected' : ''}>Banco do Brasil (BB)</option>
                            <option value="Caixa Poupança" ${r.bank === 'Caixa Poupança' ? 'selected' : ''}>Caixa Poupança</option>
                            <option value="Caixa CP" ${r.bank === 'Caixa CP' ? 'selected' : ''}>Caixa CP</option>
                            <option value="Seven" ${r.bank === 'Seven' ? 'selected' : ''}>Seven</option>
                            <option value="Carteira" ${r.bank === 'Carteira' ? 'selected' : ''}>Carteira (Físico)</option>
                            <option value="Outro" ${r.bank === 'Outro' ? 'selected' : ''}>Outro</option>
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
                  <span>BANCO (Visão Anual)</span>
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
                  <option value="Bradesco" ${this.receitasFilterBank === 'Bradesco' ? 'selected' : ''}>Bradesco</option>
                  <option value="Nubank (Nu)" ${this.receitasFilterBank === 'Nubank (Nu)' ? 'selected' : ''}>Nubank (Nu)</option>
                  <option value="Banco do Brasil" ${this.receitasFilterBank === 'Banco do Brasil' ? 'selected' : ''}>Banco do Brasil (BB)</option>
                  <option value="Caixa Poupança" ${this.receitasFilterBank === 'Caixa Poupança' ? 'selected' : ''}>Caixa Poupança</option>
                  <option value="Caixa CP" ${this.receitasFilterBank === 'Caixa CP' ? 'selected' : ''}>Caixa CP</option>
                  <option value="Seven" ${this.receitasFilterBank === 'Seven' ? 'selected' : ''}>Seven</option>
                  <option value="Carteira" ${this.receitasFilterBank === 'Carteira' ? 'selected' : ''}>Carteira</option>
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
                                 value="${r.date || ''}" 
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
                            <option value="" ${!r.bank ? 'selected' : ''}>— Selecionar Banco —</option>
                            <option value="Nubank (Nu)" ${r.bank === 'Nubank (Nu)' ? 'selected' : ''}>Nubank (Nu)</option>
                            <option value="Bradesco" ${r.bank === 'Bradesco' ? 'selected' : ''}>Bradesco</option>
                            <option value="Banco do Brasil" ${r.bank === 'Banco do Brasil' ? 'selected' : ''}>Banco do Brasil (BB)</option>
                            <option value="Caixa Poupança" ${r.bank === 'Caixa Poupança' ? 'selected' : ''}>Caixa Poupança</option>
                            <option value="Caixa CP" ${r.bank === 'Caixa CP' ? 'selected' : ''}>Caixa CP</option>
                            <option value="Seven" ${r.bank === 'Seven' ? 'selected' : ''}>Seven</option>
                            <option value="Carteira" ${r.bank === 'Carteira' ? 'selected' : ''}>Carteira (Físico)</option>
                            <option value="Outro" ${r.bank === 'Outro' ? 'selected' : ''}>Outro</option>
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
            <button class="btn-header primary" onclick="app.openModal('modalNovaDespesaFixa')">+ Nova Despesa Fixa</button>
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
            <span class="progress-stat-pill paid"><span class="dot"></span> Pago: ${formatBRL(summary.fixedPaid)}</span>
            <span class="progress-stat-pill pending"><span class="dot"></span> Pendente: ${formatBRL(summary.fixedPending)}</span>
          </div>
        </div>

        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Conta / Descrição</th>
                <th>Vencimento</th>
                <th>Valor Previsto</th>
                <th>Valor Realizado</th>
                <th>Estado</th>
                <th>Banco / Conta</th>
                <th style="width: 90px; text-align: center;">Ações</th>
              </tr>
            </thead>
            <tbody>
              ${m.fixedExpenses.length === 0 ? `
                <tr><td colspan="7" style="text-align:center; color: var(--text-muted); padding: 2rem;">Nenhuma despesa fixa cadastrada para este mês.</td></tr>
              ` : m.fixedExpenses.map(e => {
                const isPaid = (e.status === 'Pago');
                const valExp = Number(e.valueExpected) || 0;
                const valPaid = Number(e.valuePaid) || 0;
                return `
                <tr class="${isPaid ? 'row-paid' : ''}">
                  <td><strong>${e.description}</strong></td>
                  <td>${formatDateBR(e.dueDate)}</td>
                  <td style="color: var(--text-secondary); font-weight: 600;">${formatBRL(valExp)}</td>
                  <td style="color: ${isPaid ? 'var(--success)' : (valPaid > 0 ? 'var(--text-primary)' : 'var(--text-muted)')}; font-weight: 700;">
                    ${isPaid ? formatBRL(valPaid > 0 ? valPaid : valExp) : (valPaid > 0 ? formatBRL(valPaid) : '—')}
                  </td>
                  <td>
                    <button class="status-badge ${isPaid ? 'paid' : 'pending'}" style="cursor:pointer; border:none;" onclick="app.toggleFixedExpenseStatus(${this.activeMonth}, '${e.id}')" title="Clique para alterar status">
                      ${isPaid ? '✓ Pago' : '⏳ Pendente'}
                    </button>
                  </td>
                  <td>${e.bank || '-'}</td>
                  <td style="text-align: center;">
                    <div class="table-actions" style="justify-content: center; gap: 0.35rem;">
                      <button class="btn-table-icon" title="Editar Despesa Fixa" onclick="app.openEditFixedExpenseModal(${this.activeMonth}, '${e.id}')">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                      </button>
                      <button class="btn-table-icon delete" title="Excluir" onclick="app.deleteFixedExpense(${this.activeMonth}, '${e.id}')">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              `;}).join('')}
            </tbody>
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
      const cardInstallments = store.getCardInstallmentsForMonth(this.activeMonth);
      const cardHasItems = summary.cardCount > 0;
      const cardIsComplete = cardHasItems && summary.cardPct === 100;
      const cardBarClass = !cardHasItems ? 'empty' : (cardIsComplete ? 'complete' : (summary.cardPct > 0 ? 'card-partial' : 'card-pending'));

      container.innerHTML = `
        <div class="card-header">
          <div class="card-title-group">
            <h3 class="card-title">Fatura / Parcelas de Cartão para ${m.name}</h3>
            <span class="card-subtitle">Encaminhado automaticamente do Módulo Cartão de Crédito</span>
          </div>
          <div style="display:flex; gap:1rem; align-items:center;">
            ${cardHasItems ? `
              <button class="btn-header" style="background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3);" onclick="app.togglePayAllCards(${this.activeMonth})">
                ${cardIsComplete ? '↩ Desmarcar Fatura' : '✓ Quitar Fatura do Mês'}
              </button>
            ` : ''}
            <div style="font-size: 1.1rem; font-weight: 800; color: var(--danger);">
              Total: ${formatBRL(summary.card)}
            </div>
          </div>
        </div>

        <!-- BANNER DE PROGRESSO DE FATURA -->
        <div class="subtab-progress-banner">
          <div class="subtab-progress-banner-left">
            <div style="font-weight:700; font-size:0.85rem; color:var(--text-primary); min-width:140px;">
              Progresso Fatura:
            </div>
            <div style="flex:1;">
              <div class="progress-bar-track" style="margin-bottom:0;">
                <div class="progress-bar-fill ${cardBarClass}" style="width: ${cardHasItems ? summary.cardPct : 0}%;"></div>
              </div>
            </div>
            <span style="font-weight:800; font-family:monospace; font-size:0.95rem; color:${cardIsComplete ? '#34d399' : 'var(--text-primary)'};">${cardHasItems ? summary.cardPct + '%' : '-'}</span>
          </div>
          <div class="subtab-progress-banner-stats">
            <span class="progress-stat-pill paid"><span class="dot"></span> Pago: ${formatBRL(summary.cardPaid)}</span>
            <span class="progress-stat-pill pending"><span class="dot"></span> Pendente: ${formatBRL(summary.cardPending)}</span>
          </div>
        </div>

        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Compra / Descrição</th>
                <th>Estabelecimento</th>
                <th>Cartão</th>
                <th>Parcela</th>
                <th>Valor da Parcela</th>
                <th>Estado</th>
                <th>Data da Compra</th>
              </tr>
            </thead>
            <tbody>
              ${cardInstallments.length === 0 ? `
                <tr><td colspan="7" style="text-align:center; color: var(--text-muted); padding: 2rem;">Nenhuma parcela de cartão caindo neste mês.</td></tr>
              ` : cardInstallments.map(c => `
                <tr>
                  <td><strong>${c.description}</strong></td>
                  <td>${c.place || '-'}</td>
                  <td><span class="status-badge neutral">${c.card}</span></td>
                  <td><span class="status-badge waiting">${c.installmentIndex} de ${c.installmentsTotal}</span></td>
                  <td style="color: var(--danger); font-weight: 700;">${formatBRL(c.value)}</td>
                  <td>
                    <button class="status-badge ${c.status === 'Pago' ? 'paid' : 'pending'}" style="cursor:pointer; border:none;" onclick="app.toggleCardInstallment(${this.activeMonth}, '${c.key}')" title="Clique para alterar status">
                      ${c.status === 'Pago' ? '✓ Pago' : '⏳ Pendente'}
                    </button>
                  </td>
                  <td>${formatDateBR(c.date)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
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

    this.openModal('modalNovaReceita');

    setTimeout(() => {
      const inputSource = document.getElementById('rev_source');
      if (inputSource) inputSource.focus();
    }, 150);
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
    this.renderContas();
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
    document.getElementById('edit_rev_date').value = r.date || '';
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
    if (confirm('Deseja excluir esta despesa fixa?')) {
      store.deleteFixedExpense(monthNum, id);
      this.renderMeses();
      this.renderResumo();
      this.showToast('Despesa fixa removida com sucesso.', 'info');
    }
  },

  openEditFixedExpenseModal(monthNum, id) {
    const expense = store.data.months[monthNum]?.fixedExpenses?.find(e => e.id === id);
    if (!expense) return;

    document.getElementById('edit_fix_id').value = expense.id;
    document.getElementById('edit_fix_month').value = monthNum;
    document.getElementById('edit_fix_desc').value = expense.description || '';
    document.getElementById('edit_fix_date').value = expense.dueDate || '';
    document.getElementById('edit_fix_val_exp').value = formatMoneyDisplay(expense.valueExpected);
    document.getElementById('edit_fix_val_paid').value = expense.valuePaid ? formatMoneyDisplay(expense.valuePaid) : '';
    document.getElementById('edit_fix_status').value = expense.status || 'Pendente';
    document.getElementById('edit_fix_bank').value = expense.bank || 'Bradesco';

    this.openModal('modalEditarDespesaFixa');
  },

  toggleFixedExpenseStatus(monthNum, id) {
    const expense = store.data.months[monthNum].fixedExpenses.find(e => e.id === id);
    if (expense) {
      expense.status = expense.status === 'Pago' ? 'Pendente' : 'Pago';
      if (expense.status === 'Pago' && (!expense.valuePaid || Number(expense.valuePaid) === 0)) {
        expense.valuePaid = expense.valueExpected;
      }
      store.save();
      this.renderMeses();
      this.renderResumo();
      this.showToast(`Despesa marcada como ${expense.status}!`, 'success');
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

  deleteVariableExpense(monthNum, id) {
    if (confirm('Deseja excluir esta despesa variável?')) {
      store.deleteVariableExpense(monthNum, id);
      this.renderMeses();
      this.renderResumo();
      this.showToast('Despesa variável removida com sucesso.', 'info');
    }
  },

  // =========================================================================
  // 3. MÓDULO CARTÃO DE CRÉDITO
  // =========================================================================
  renderCartoes() {
    const tbody = document.getElementById('cardPurchasesTableBody');
    if (!tbody) return;

    let purchases = store.data.cardPurchases;
    if (this.activeTabCartao !== 'todos') {
      purchases = purchases.filter(p => p.card.toLowerCase().includes(this.activeTabCartao.toLowerCase()));
    }

    const totalOpen = store.data.cardPurchases.reduce((acc, p) => acc + (Number(p.totalAmount) || 0), 0);
    const elTotal = document.getElementById('totalOpenCardPurchases');
    if (elTotal) elTotal.textContent = formatBRL(totalOpen);

    tbody.innerHTML = purchases.length === 0 ? `
      <tr><td colspan="7" style="text-align:center; color: var(--text-muted); padding: 2rem;">Nenhuma compra de cartão cadastrada.</td></tr>
    ` : purchases.map(p => {
      const parcelas = Number(p.installments) || 1;
      const valorParcela = (Number(p.totalAmount) || 0) / parcelas;
      const mesInicio = store.data.months[p.startMonth]?.name || 'Janeiro';

      return `
        <tr>
          <td><strong>${p.description}</strong></td>
          <td>${p.place || '-'}</td>
          <td><span class="status-badge neutral">${p.card}</span></td>
          <td>${formatDateBR(p.date)}</td>
          <td><span class="status-badge waiting">${parcelas}x de ${formatBRL(valorParcela)}</span></td>
          <td style="font-weight: 800; color: var(--navy);">${formatBRL(p.totalAmount)}</td>
          <td>
            <div class="table-actions">
              <button class="btn-table-icon delete" title="Excluir Compra" onclick="app.deleteCardPurchase('${p.id}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
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
    document.querySelectorAll('.card-filter-btn').forEach(b => {
      if (b.dataset.card === type) b.classList.add('active');
      else b.classList.remove('active');
    });
    this.renderCartoes();
  },

  // =========================================================================
  // 4. MÓDULO SONHOS / COMPRAS
  // =========================================================================
  renderSonhos() {
    const grid = document.getElementById('dreamsGrid');
    if (!grid) return;

    grid.innerHTML = store.data.dreams.length === 0 ? `
      <div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 3rem; background: #fff; border-radius: var(--radius-lg); border: 1px dashed var(--border-strong);">
        Nenhum sonho ou meta cadastrada ainda. Clique em "+ Novo Sonho / Compra" para começar!
      </div>
    ` : store.data.dreams.map(d => {
      const target = Number(d.value) || 1;
      const saved = Number(d.saved) || 0;
      const pct = Math.min(100, Math.round((saved / target) * 100));

      return `
        <div class="card" style="margin-bottom:0; display:flex; flex-direction:column; justify-content:space-between;">
          <div>
            <div class="card-header" style="border-bottom:none; padding-bottom:0;">
              <div>
                <h4 style="font-size:1.1rem; font-weight:800; color:var(--navy);">${d.title}</h4>
                <span style="font-size:0.8rem; color:var(--text-muted);">Meta: ${formatDateBR(d.targetDate)}</span>
              </div>
              <button class="btn-table-icon delete" title="Excluir" onclick="app.deleteDream('${d.id}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            </div>
            <div style="margin: 1.25rem 0;">
              <div style="display:flex; justify-content:space-between; font-size:0.85rem; margin-bottom:0.4rem;">
                <span style="color:var(--text-secondary);">Guardado: <strong>${formatBRL(saved)}</strong></span>
                <span style="font-weight:800; color:var(--primary);">${pct}%</span>
              </div>
              <div style="height: 10px; background-color: var(--bg-surface-alt); border-radius: 999px; overflow:hidden;">
                <div style="height:100%; width:${pct}%; background:linear-gradient(90deg, #2563eb, #10b981); border-radius:999px; transition: width 0.4s ease;"></div>
              </div>
              <div style="display:flex; justify-content:space-between; font-size:0.8rem; color:var(--text-muted); margin-top:0.4rem;">
                <span>Faltam: ${formatBRL(Math.max(0, target - saved))}</span>
                <span>Objetivo: ${formatBRL(target)}</span>
              </div>
            </div>
          </div>
          <button class="btn-header primary" style="width:100%; justify-content:center;" onclick="app.promptAddDreamProgress('${d.id}', '${d.title}', ${saved})">
            Atualizar Valor Guardado
          </button>
        </div>
      `;
    }).join('');
  },

  promptAddDreamProgress(id, title, currentSaved) {
    const val = prompt(`Valor total já guardado para "${title}":`, currentSaved);
    if (val !== null && !isNaN(Number(val))) {
      store.updateDreamProgress(id, Number(val));
      this.renderSonhos();
      this.showToast('Progresso do sonho atualizado!', 'success');
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
  // 5. MÓDULO BOMBEIRO COMUNITÁRIO
  // =========================================================================
  renderBombeiro() {
    const tbody = document.getElementById('bombeiroTableBody');
    if (!tbody) return;

    const list = store.data.firefighterRecords;
    const totalPending = list.filter(r => r.status !== 'Pago').reduce((acc, r) => acc + (Number(r.amount) || 0), 0);
    const totalPaid = list.filter(r => r.status === 'Pago').reduce((acc, r) => acc + (Number(r.amount) || 0), 0);

    const elPending = document.getElementById('bombeiroTotalPending');
    if (elPending) elPending.textContent = formatBRL(totalPending);

    const elPaid = document.getElementById('bombeiroTotalPaid');
    if (elPaid) elPaid.textContent = formatBRL(totalPaid);

    tbody.innerHTML = list.length === 0 ? `
      <tr><td colspan="6" style="text-align:center; color: var(--text-muted); padding: 2rem;">Nenhum registro do Bombeiro Comunitário cadastrado.</td></tr>
    ` : list.map(r => `
      <tr>
        <td><strong>${r.monthRef}</strong></td>
        <td>${formatDateBR(r.dateRequested)}</td>
        <td>${formatDateBR(r.datePayment)}</td>
        <td style="font-weight: 800; color: var(--navy);">${formatBRL(r.amount)}</td>
        <td>
          <button class="status-badge ${r.status === 'Pago' ? 'paid' : (r.status === 'Em Análise' ? 'waiting' : 'pending')}" style="cursor:pointer; border:none;" onclick="app.toggleBombeiroStatus('${r.id}')">
            ${r.status || 'Solicitado'}
          </button>
        </td>
        <td>
          <div class="table-actions">
            <button class="btn-table-icon delete" title="Excluir" onclick="app.deleteBombeiro('${r.id}')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  },

  toggleBombeiroStatus(id) {
    const item = store.data.firefighterRecords.find(r => r.id === id);
    if (item) {
      if (item.status === 'Solicitado') item.status = 'Em Análise';
      else if (item.status === 'Em Análise') item.status = 'Pago';
      else item.status = 'Solicitado';

      store.save();
      this.renderBombeiro();
      this.renderResumo();
      this.showToast(`Status alterado para: ${item.status}`, 'success');
    }
  },

  deleteBombeiro(id) {
    if (confirm('Deseja excluir este registro de ressarcimento?')) {
      store.deleteFirefighterRecord(id);
      this.renderBombeiro();
      this.renderResumo();
      this.showToast('Registro excluído com sucesso.', 'info');
    }
  },

  // =========================================================================
  // 6. MÓDULO CONTROLE DE CAIXA / TROCO JOTUR (BASE R$ 200)
  // =========================================================================
  calculateJotur() {
    const n20 = Number(document.getElementById('jt_n20')?.value) || 0;
    const n10 = Number(document.getElementById('jt_n10')?.value) || 0;
    const n5  = Number(document.getElementById('jt_n5')?.value) || 0;
    const n2  = Number(document.getElementById('jt_n2')?.value) || 0;

    const m100 = Number(document.getElementById('jt_m100')?.value) || 0;
    const m50  = Number(document.getElementById('jt_m50')?.value) || 0;
    const m25  = Number(document.getElementById('jt_m25')?.value) || 0;
    const m10  = Number(document.getElementById('jt_m10')?.value) || 0;

    // Subtotais
    const subN20 = n20 * 20;
    const subN10 = n10 * 10;
    const subN5  = n5 * 5;
    const subN2  = n2 * 2;

    const subM100 = m100 * 1.00;
    const subM50  = m50 * 0.50;
    const subM25  = m25 * 0.25;
    const subM10  = m10 * 0.10;

    // Atualiza subtotais na tela
    const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = formatBRL(val); };
    setTxt('sub_n20', subN20);
    setTxt('sub_n10', subN10);
    setTxt('sub_n5', subN5);
    setTxt('sub_n2', subN2);
    setTxt('sub_m100', subM100);
    setTxt('sub_m50', subM50);
    setTxt('sub_m25', subM25);
    setTxt('sub_m10', subM10);

    const totalCounted = subN20 + subN10 + subN5 + subN2 + subM100 + subM50 + subM25 + subM10;
    const baseAmount = store.data.jotur.baseAmount || 200.00;
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
      details: { n20, n10, n5, n2, m100, m50, m25, m10 }
    };
  },

  saveCurrentJotur() {
    const calc = this.calculateJotur();
    store.saveJoturCount(calc);
    this.renderJoturHistory();
    this.showToast('Conferência de troco Jotur salva com sucesso!', 'success');
  },

  renderJotur() {
    this.calculateJotur();
    this.renderJoturHistory();
  },

  renderJoturHistory() {
    const tbody = document.getElementById('joturHistoryTableBody');
    if (!tbody) return;

    const list = store.data.jotur.history || [];
    tbody.innerHTML = list.length === 0 ? `
      <tr><td colspan="5" style="text-align:center; color: var(--text-muted); padding: 1.5rem;">Nenhuma conferência salva no histórico ainda.</td></tr>
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

  deleteJoturHistory(id) {
    store.deleteJoturHistory(id);
    this.renderJoturHistory();
    this.showToast('Histórico removido.', 'info');
  },

  // =========================================================================
  // 7. MÓDULO INVESTIMENTOS
  // =========================================================================
  renderInvestimentos() {
    const summary = store.getInvestmentsSummary();

    const elTotal = document.getElementById('investTotalAssets');
    if (elTotal) elTotal.textContent = formatBRL(summary.total);

    const elStocks = document.getElementById('investTotalStocks');
    if (elStocks) elStocks.textContent = formatBRL(summary.stocks);

    const elBoxes = document.getElementById('investTotalBoxes');
    if (elBoxes) elBoxes.textContent = formatBRL(summary.boxes);

    // Tabela Bolsa
    const tbodyStocks = document.getElementById('stocksTableBody');
    if (tbodyStocks) {
      tbodyStocks.innerHTML = store.data.investments.stocks.length === 0 ? `
        <tr><td colspan="7" style="text-align:center; color: var(--text-muted); padding: 2rem;">Nenhum ativo de Bolsa (Ações/FIIs) cadastrado.</td></tr>
      ` : store.data.investments.stocks.map(s => `
        <tr>
          <td><strong>${s.ticker}</strong></td>
          <td><span class="status-badge neutral">${s.type || 'Ação'}</span></td>
          <td>${formatDateBR(s.date)}</td>
          <td>${s.shares}</td>
          <td>${formatBRL(s.pricePerShare)}</td>
          <td style="font-weight: 800; color: var(--navy);">${formatBRL(s.total || s.shares * s.pricePerShare)}</td>
          <td>
            <div class="table-actions">
              <button class="btn-table-icon delete" title="Excluir" onclick="app.deleteStock('${s.id}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            </div>
          </td>
        </tr>
      `).join('');
    }

    // Tabela Nubank Caixinhas
    const tbodyBoxes = document.getElementById('nubankBoxesTableBody');
    if (tbodyBoxes) {
      tbodyBoxes.innerHTML = store.data.investments.nubankBoxes.length === 0 ? `
        <tr><td colspan="5" style="text-align:center; color: var(--text-muted); padding: 2rem;">Nenhuma caixinha ou renda fixa Nubank cadastrada.</td></tr>
      ` : store.data.investments.nubankBoxes.map(b => `
        <tr>
          <td><strong>${b.name}</strong></td>
          <td>${formatDateBR(b.date)}</td>
          <td style="font-weight: 800; color: var(--purple);">${formatBRL(b.amount)}</td>
          <td><span class="status-badge paid">${b.status || 'Ativo'}</span></td>
          <td>
            <div class="table-actions">
              <button class="btn-table-icon delete" title="Excluir" onclick="app.deleteNubankBox('${b.id}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            </div>
          </td>
        </tr>
      `).join('');
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

  deleteNubankBox(id) {
    if (confirm('Deseja excluir esta caixinha do Nubank?')) {
      store.deleteNubankBox(id);
      this.renderInvestimentos();
      this.renderResumo();
      this.showToast('Caixinha excluída.', 'info');
    }
  },

  // =========================================================================
  // 8. MÓDULO COFRE DE SENHAS
  // =========================================================================
  renderSenhas() {
    const container = document.getElementById('passwordsListContainer');
    if (!container) return;

    const searchTerm = (document.getElementById('pwdSearchInput')?.value || '').toLowerCase();
    let list = store.data.passwords;
    if (searchTerm) {
      list = list.filter(p => 
        (p.service && p.service.toLowerCase().includes(searchTerm)) ||
        (p.username && p.username.toLowerCase().includes(searchTerm)) ||
        (p.notes && p.notes.toLowerCase().includes(searchTerm))
      );
    }

    container.innerHTML = list.length === 0 ? `
      <div style="text-align: center; color: var(--text-muted); padding: 3rem; background: #fff; border-radius: var(--radius-lg); border: 1px dashed var(--border-strong);">
        Nenhuma credencial encontrada no cofre.
      </div>
    ` : list.map(p => `
      <div class="card" style="margin-bottom: 1rem;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:1rem;">
          <div>
            <span class="status-badge neutral" style="margin-bottom:0.4rem;">${p.category || 'Geral'}</span>
            <h4 style="font-size:1.1rem; font-weight:800; color:var(--navy);">${p.service}</h4>
            ${p.url ? `<a href="${p.url}" target="_blank" style="font-size:0.8rem; color:var(--primary);">${p.url}</a>` : ''}
          </div>
          <div class="table-actions">
            <button class="btn-table-icon delete" title="Excluir" onclick="app.deletePassword('${p.id}')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </div>
        <div class="form-grid-2" style="margin-top:1.25rem;">
          <div>
            <span class="form-label">Usuário / Login</span>
            <div class="password-box">
              <span style="flex:1; overflow:hidden; text-overflow:ellipsis;">${p.username || '-'}</span>
              <button class="btn-table-icon" title="Copiar Usuário" onclick="app.copyToClipboard('${p.username}', 'Usuário copiado!')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              </button>
            </div>
          </div>
          <div>
            <span class="form-label">Senha</span>
            <div class="password-box">
              <span id="pwd_val_${p.id}" class="password-text" style="flex:1;">••••••••</span>
              <button class="btn-table-icon" title="Ver / Ocultar" onclick="app.togglePasswordVisibility('${p.id}', '${p.password}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
              </button>
              <button class="btn-table-icon" title="Copiar Senha" onclick="app.copyToClipboard('${p.password}', 'Senha copiada!')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              </button>
            </div>
          </div>
        </div>
        ${p.notes ? `<div style="margin-top:0.75rem; font-size:0.8rem; color:var(--text-muted); background:var(--bg-surface-alt); padding:0.5rem 0.75rem; border-radius:var(--radius-sm);"><strong>Obs:</strong> ${p.notes}</div>` : ''}
      </div>
    `).join('');
  },

  togglePasswordVisibility(id, clearValue) {
    const el = document.getElementById(`pwd_val_${id}`);
    if (el) {
      if (el.textContent === '••••••••') {
        el.textContent = clearValue;
      } else {
        el.textContent = '••••••••';
      }
    }
  },

  deletePassword(id) {
    if (confirm('Deseja excluir esta credencial do cofre?')) {
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
  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
    }
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
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
  // BIND DE EVENTOS GERAIS
  // =========================================================================
  bindEvents() {
    // Formulário de Login
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const pwd = document.getElementById('loginPassword').value;
        const feedback = document.getElementById('loginFeedback');

        const ok = this.login(email, pwd);
        if (!ok && feedback) {
          feedback.textContent = 'E-mail ou senha incorretos.';
          feedback.classList.add('error');
        }
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

    // Inputs de Troco Jotur (Cálculo em tempo real)
    document.querySelectorAll('.coin-input').forEach(inp => {
      inp.addEventListener('input', () => this.calculateJotur());
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
        this.renderContas();
        
        this.showToast(`✓ Rendimento "${source}" inserido em ${checkedMonths.length} mês(es)! Preencha na planilha ao receber.`, 'success');
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
          value: document.getElementById('edit_rev_value').value,
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
        const valExpected = parseMoney(document.getElementById('fix_val_exp').value);
        const valPaidRaw = document.getElementById('fix_val_paid').value.trim();
        const status = document.getElementById('fix_status').value;
        let valPaid = parseMoney(valPaidRaw);
        if (status === 'Pago' && !valPaidRaw) {
          valPaid = valExpected;
        }

        const exp = {
          description: document.getElementById('fix_desc').value,
          dueDate: document.getElementById('fix_date').value,
          valueExpected: valExpected,
          valuePaid: valPaid,
          status: status,
          bank: document.getElementById('fix_bank').value
        };
        store.addFixedExpense(this.activeMonth, exp);
        this.closeModal('modalNovaDespesaFixa');
        formFix.reset();
        this.renderMeses();
        this.renderResumo();
        this.showToast('Despesa fixa cadastrada!', 'success');
      });
    }

    // Formulário Editar Despesa Fixa
    const formEditFix = document.getElementById('formEditarDespesaFixa');
    if (formEditFix) {
      formEditFix.addEventListener('submit', (e) => {
        e.preventDefault();
        const monthNum = Number(document.getElementById('edit_fix_month').value) || this.activeMonth;
        const id = document.getElementById('edit_fix_id').value;
        const valExpected = parseMoney(document.getElementById('edit_fix_val_exp').value);
        const valPaidRaw = document.getElementById('edit_fix_val_paid').value.trim();
        const status = document.getElementById('edit_fix_status').value;
        let valPaid = parseMoney(valPaidRaw);
        if (status === 'Pago' && !valPaidRaw) {
          valPaid = valExpected;
        }

        const updated = {
          description: document.getElementById('edit_fix_desc').value,
          dueDate: document.getElementById('edit_fix_date').value,
          valueExpected: valExpected,
          valuePaid: valPaid,
          status: status,
          bank: document.getElementById('edit_fix_bank').value
        };
        store.updateFixedExpense(monthNum, id, updated);
        this.closeModal('modalEditarDespesaFixa');
        formEditFix.reset();
        this.renderMeses();
        this.renderResumo();
        this.showToast('Despesa fixa atualizada com sucesso!', 'success');
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
          value: document.getElementById('var_val').value,
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

    // Formulário Nova Compra no Cartão
    const formCard = document.getElementById('formNovaCompraCartao');
    if (formCard) {
      formCard.addEventListener('submit', (e) => {
        e.preventDefault();
        const purchase = {
          description: document.getElementById('card_desc').value,
          place: document.getElementById('card_place').value,
          card: document.getElementById('card_type').value,
          date: document.getElementById('card_date').value,
          totalAmount: document.getElementById('card_val').value,
          installments: document.getElementById('card_installments').value,
          startMonth: document.getElementById('card_start_month').value
        };
        store.addCardPurchase(purchase);
        this.closeModal('modalNovaCompraCartao');
        formCard.reset();
        this.renderCartoes();
        this.renderMeses();
        this.renderResumo();
        this.showToast('Compra no cartão cadastrada! Parcelas distribuídas nos meses.', 'success');
      });
    }

    // Formulário Novo Sonho
    const formDream = document.getElementById('formNovoSonho');
    if (formDream) {
      formDream.addEventListener('submit', (e) => {
        e.preventDefault();
        const dream = {
          title: document.getElementById('dream_title').value,
          value: document.getElementById('dream_val').value,
          saved: document.getElementById('dream_saved').value || 0,
          targetDate: document.getElementById('dream_date').value
        };
        store.addDream(dream);
        this.closeModal('modalNovoSonho');
        formDream.reset();
        this.renderSonhos();
        this.showToast('Novo objetivo planejado cadastrado!', 'success');
      });
    }

    // Formulário Bombeiro
    const formBombeiro = document.getElementById('formNovoBombeiro');
    if (formBombeiro) {
      formBombeiro.addEventListener('submit', (e) => {
        e.preventDefault();
        const rec = {
          monthRef: document.getElementById('ff_month').value,
          dateRequested: document.getElementById('ff_date_req').value,
          datePayment: document.getElementById('ff_date_pay').value,
          amount: document.getElementById('ff_amount').value,
          status: document.getElementById('ff_status').value
        };
        store.addFirefighterRecord(rec);
        this.closeModal('modalNovoBombeiro');
        formBombeiro.reset();
        this.renderBombeiro();
        this.renderResumo();
        this.showToast('Registro do Bombeiro cadastrado!', 'success');
      });
    }

    // Formulário Ativo Bolsa
    const formStock = document.getElementById('formNovoAtivoBolsa');
    if (formStock) {
      formStock.addEventListener('submit', (e) => {
        e.preventDefault();
        const stock = {
          ticker: document.getElementById('stk_ticker').value.toUpperCase(),
          type: document.getElementById('stk_type').value,
          date: document.getElementById('stk_date').value,
          shares: document.getElementById('stk_shares').value,
          pricePerShare: document.getElementById('stk_price').value
        };
        store.addStock(stock);
        this.closeModal('modalNovoAtivoBolsa');
        formStock.reset();
        this.renderInvestimentos();
        this.renderResumo();
        this.showToast('Ativo de Bolsa adicionado com sucesso!', 'success');
      });
    }

    // Formulário Caixinha Nubank
    const formBox = document.getElementById('formNovaCaixinhaNubank');
    if (formBox) {
      formBox.addEventListener('submit', (e) => {
        e.preventDefault();
        const box = {
          name: document.getElementById('box_name').value,
          date: document.getElementById('box_date').value,
          amount: document.getElementById('box_val').value,
          status: 'Ativo'
        };
        store.addNubankBox(box);
        this.closeModal('modalNovaCaixinhaNubank');
        formBox.reset();
        this.renderInvestimentos();
        this.renderResumo();
        this.showToast('Caixinha Nubank cadastrada!', 'success');
      });
    }

    // Formulário Nova Senha
    const formPwd = document.getElementById('formNovaSenha');
    if (formPwd) {
      formPwd.addEventListener('submit', (e) => {
        e.preventDefault();
        const pwd = {
          service: document.getElementById('pwd_service').value,
          category: document.getElementById('pwd_category').value,
          username: document.getElementById('pwd_user').value,
          password: document.getElementById('pwd_pass').value,
          url: document.getElementById('pwd_url').value,
          notes: document.getElementById('pwd_notes').value
        };
        store.addPassword(pwd);
        this.closeModal('modalNovaSenha');
        formPwd.reset();
        this.renderSenhas();
        this.showToast('Senha guardada com segurança no cofre!', 'success');
      });
    }

    // Formulário Configuração Supabase
    const formSupabase = document.getElementById('formConfigSupabase');
    if (formSupabase) {
      formSupabase.addEventListener('submit', async (e) => {
        e.preventDefault();
        const url = document.getElementById('sb_url').value;
        const key = document.getElementById('sb_key').value;
        supabaseService.saveConfig(url, key);
        this.closeModal('modalConfigSupabase');
        this.showToast('Chaves do Supabase salvas!', 'success');

        // Tenta sincronizar
        const res = await supabaseService.syncToCloud();
        if (res.success) {
          this.showToast('Sincronizado com o Supabase!', 'success');
        } else {
          this.showToast(res.message || res.reason || 'Salvo localmente.', 'info');
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
  }
};

// Inicialização Global
document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
