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
  cardSearchQuery: '',
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
      meses: `Gestão Mensal (${store.activeYear})`,
      cartoes: 'Cartão de Crédito e Compras Parceladas',
      senhas: 'Cofre de Senhas Protegido',
      sonhos: 'Sonhos & Planejamento de Compras',
      bombeiro: 'Bombeiro Comunitário (Ressarcimentos)',
      jotur: 'Controle de Troco Jotur',
      mastes: 'CONTROLE DE TROCO MASTES (R$ 400)',
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
      case 'mastes':
        this.renderMastes();
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

        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Conta / Descrição</th>
                <th>Vencimento</th>
                <th>Valor Previsto</th>
                <th>Valor Realizado</th>
                <th>Status</th>
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

                // Cálculo de vencimento por dia e alerta de atraso
                const dDay = Number(e.dueDay) || (e.dueDate ? parseInt(e.dueDate.split('-')[2], 10) : 1);
                const now = new Date();
                const currYear = now.getFullYear();
                const currMonth = now.getMonth() + 1;
                const currDay = now.getDate();
                const actYear = Number(store.activeYear) || currYear;
                const actMonth = Number(this.activeMonth);

                let isOverdue = false;
                let isToday = false;

                if (!isPaid) {
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

                return `
                <tr class="${isPaid ? 'row-paid' : ''}">
                  <td><strong>${e.description}</strong></td>
                  <td>Dia ${dDay}</td>
                  <td style="color: var(--text-secondary); font-weight: 600;">${formatBRL(valExp)}</td>
                  <td style="color: ${isPaid ? 'var(--success)' : (valPaid > 0 ? 'var(--text-primary)' : 'var(--text-muted)')}; font-weight: 700;">
                    ${isPaid ? formatBRL(valPaid > 0 ? valPaid : valExp) : (valPaid > 0 ? formatBRL(valPaid) : '—')}
                  </td>
                  <td>
                    <button class="status-badge ${statusBadgeClass}" style="cursor:pointer; border:none;" onclick="app.toggleFixedExpenseStatus(${this.activeMonth}, '${e.id}')" title="${statusBadgeTitle}">
                      ${statusBadgeText}
                    </button>
                  </td>
                  <td>
                    <select class="sheet-inline-select" 
                            title="Selecione o banco diretamente na tabela"
                            onchange="app.updateFixedExpenseField(${this.activeMonth}, '${e.id}', 'bank', this.value)">
                      <option value="" ${!e.bank ? 'selected' : ''}>— Selecionar Banco —</option>
                      <option value="Bradesco" ${e.bank === 'Bradesco' ? 'selected' : ''}>Bradesco</option>
                      <option value="Nubank (Nu)" ${e.bank === 'Nubank (Nu)' ? 'selected' : ''}>Nubank (Nu)</option>
                      <option value="Banco do Brasil" ${e.bank === 'Banco do Brasil' ? 'selected' : ''}>Banco do Brasil (BB)</option>
                      <option value="Caixa Poupança" ${e.bank === 'Caixa Poupança' ? 'selected' : ''}>Caixa Econômica (Poupança)</option>
                      <option value="Caixa CP" ${e.bank === 'Caixa CP' ? 'selected' : ''}>Caixa Econômica (Caixa CP)</option>
                      <option value="Seven" ${e.bank === 'Seven' ? 'selected' : ''}>Seven</option>
                      <option value="Carteira" ${e.bank === 'Carteira' ? 'selected' : ''}>Carteira (Dinheiro)</option>
                      <option value="Outro" ${e.bank === 'Outro' ? 'selected' : ''}>Outro</option>
                    </select>
                  </td>
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
            ${m.fixedExpenses.length > 0 ? `
            <tfoot>
              <tr style="font-weight: 700; background: rgba(255,255,255,0.02); border-top: 1px solid var(--border-light);">
                <td colspan="2" style="text-align: right; color: var(--text-muted); padding: 0.85rem 1rem;">Total Previsto e Realizado:</td>
                <td style="color: #fbbf24; padding: 0.85rem 1rem; font-weight:800;">${formatBRL(summary.fixedExpected || 0)}</td>
                <td style="color: var(--success); padding: 0.85rem 1rem; font-weight:800;">${formatBRL(summary.fixedPaid)}</td>
                <td colspan="3" style="color: var(--text-muted); font-size: 0.82rem; padding: 0.85rem 1rem;">
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
          <div style="display:flex; gap:1.25rem; align-items:center; flex-wrap:wrap;">
            ${cardHasItems ? `
              <button class="btn-header" style="background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3);" onclick="app.togglePayAllCards(${this.activeMonth})">
                ${cardIsComplete ? '↩ Desmarcar Fatura' : '✓ Quitar Fatura do Mês'}
              </button>
            ` : ''}
            <div style="font-size: 0.95rem; font-weight: 700; color: #fbbf24;">
              Previsto: ${formatBRL(summary.cardExpected || summary.card)}
            </div>
            <div style="font-size: 1.1rem; font-weight: 800; color: var(--danger);">
              Pago: ${formatBRL(summary.cardPaid || 0)}
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
            <span class="progress-stat-pill" style="background: rgba(251, 191, 36, 0.12); color: #fbbf24; border: 1px solid rgba(251, 191, 36, 0.25);"><span class="dot" style="background: #fbbf24;"></span> Previsto: ${formatBRL(summary.cardExpected || summary.card)}</span>
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
                <th>Valor Previsto</th>
                <th>Valor Pago</th>
                <th>Status</th>
                <th>Data da Compra</th>
                <th style="width: 70px; text-align: center;">Ações</th>
              </tr>
            </thead>
            <tbody>
              ${cardInstallments.length === 0 ? `
                <tr><td colspan="9" style="text-align:center; color: var(--text-muted); padding: 2rem;">Nenhuma parcela de cartão caindo neste mês.</td></tr>
              ` : cardInstallments.map(c => `
                <tr>
                  <td><strong>${c.description}</strong></td>
                  <td>${c.place || '-'}</td>
                  <td><span class="status-badge neutral">${c.card}</span></td>
                  <td><span class="status-badge waiting">${c.installmentIndex} de ${c.installmentsTotal}</span></td>
                  <td style="color: #fbbf24; font-weight: 700;">${formatBRL(c.value)}</td>
                  <td>
                    ${c.status === 'Pago' ? `
                      <span style="color: var(--danger); font-weight: 800; cursor:pointer;" onclick="app.openEditCardInstallmentModal(${this.activeMonth}, '${c.key}')" title="Clique para editar valor pago">
                        ${formatBRL(c.valuePaid !== undefined && c.valuePaid !== null ? c.valuePaid : c.value)} ✏️
                      </span>
                    ` : `
                      <span style="color: var(--text-muted); font-weight: 500;">-</span>
                    `}
                  </td>
                  <td>
                    <button class="status-badge ${c.status === 'Pago' ? 'paid' : 'pending'}" style="cursor:pointer; border:none;" onclick="app.toggleCardInstallment(${this.activeMonth}, '${c.key}')" title="Clique para alterar status">
                      ${c.status === 'Pago' ? '✓ Pago' : '⏳ Pendente'}
                    </button>
                  </td>
                  <td>${formatDateBR(c.date)}</td>
                  <td style="text-align:center;">
                    <button class="action-btn edit" onclick="app.openEditCardInstallmentModal(${this.activeMonth}, '${c.key}')" title="Editar Valor Pago ou Status">✏️</button>
                  </td>
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

    const dateInp = document.getElementById('rev_date');
    if (dateInp) {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      dateInp.value = `${yyyy}-${mm}-${dd}`;
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

    this.openModal('modalNovaDespesaFixa');

    setTimeout(() => {
      const inputDesc = document.getElementById('fix_desc');
      if (inputDesc) inputDesc.focus();
    }, 150);
  },

  updateFixedExpenseField(monthNum, id, field, value) {
    const expense = store.data.months[monthNum]?.fixedExpenses?.find(e => e.id === id);
    if (!expense) return;
    expense[field] = value;
    store.save();
    this.showToast('Banco atualizado!', 'info');
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
    const dDay = expense.dueDay || (expense.dueDate ? parseInt(expense.dueDate.split('-')[2], 10) : 1);
    document.getElementById('edit_fix_due_day').value = dDay;
    document.getElementById('edit_fix_val_exp').value = formatMoneyDisplay(expense.valueExpected);
    document.getElementById('edit_fix_val_paid').value = expense.valuePaid ? formatMoneyDisplay(expense.valuePaid) : '';
    document.getElementById('edit_fix_status').value = expense.status || 'Pendente';
    document.getElementById('edit_fix_bank').value = expense.bank || '';

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

    // Validação estrita: a cobrança NUNCA pode iniciar em mês/ano anterior à compra!
    if (!sMonth || !sYear || sYear < dateYear || (sYear === dateYear && sMonth < dateMonth)) {
      const cardObj = (store.data.cards || []).find(c => (c.name || '').toLowerCase() === (p.card || '').toLowerCase());
      const closingDay = cardObj ? (cardObj.closingDay || 1) : 1;
      if (p.date && dateDay > closingDay) {
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

    const count = Number(p.installments) || 1;
    const valTotal = Number(p.totalAmount) || 0;
    const valPerInstallment = count > 0 ? (valTotal / count) : valTotal;

    return {
      startMonth: sMonth,
      startYear: sYear,
      count: count,
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
    if (this.activeTabCartao !== 'todos') {
      purchases = purchases.filter(p => (p.card || '').toLowerCase().includes(this.activeTabCartao.toLowerCase()));
    }

    if (this.cardSearchQuery) {
      const q = this.cardSearchQuery.toLowerCase().trim();
      purchases = purchases.filter(p => (p.description || '').toLowerCase().includes(q) || (p.place || '').toLowerCase().includes(q));
    }

    const cardTitle = (this.activeTabCartao === 'todos') ? 'Todos os Cartões' : ((this.activeTabCartao === 'nubank') ? 'Nubank (Nu)' : 'Mastercard');
    const cols = this.getCardCalendarMonthColumns();
    const colTotals = new Array(cols.length).fill(0);
    let grandTotalYear = 0;

    container.innerHTML = `
      <div class="notion-card-calendar-container">
        <!-- CABEÇALHO NOTION -->
        <div class="notion-card-calendar-header">
          <div class="notion-card-title-wrap">
            <h2 class="notion-card-title">${cardTitle} (${store.activeYear})</h2>
            <div class="notion-card-tabs">
              <button class="notion-card-tab ${this.activeTabCartao === 'todos' ? 'active' : ''}" onclick="app.filterCard('todos')">Todos os Cartões</button>
              <button class="notion-card-tab ${this.activeTabCartao === 'master' ? 'active' : ''}" onclick="app.filterCard('master')">Mastercard</button>
              <button class="notion-card-tab ${this.activeTabCartao === 'nubank' ? 'active' : ''}" onclick="app.filterCard('nubank')">Nubank (Nu)</button>
            </div>
          </div>

          <div class="notion-card-toolbar">
            <div style="display:flex; align-items:center; gap:0.25rem;">
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

            <div style="width: 1px; height: 18px; background: rgba(255,255,255,0.1); margin: 0 0.35rem;"></div>

            <input type="text" 
                   class="form-input" 
                   style="height: 32px; font-size: 0.78rem; width: 140px; padding: 0.2rem 0.6rem;" 
                   placeholder="🔍 Filtrar..." 
                   value="${escapeHtml(this.cardSearchQuery || '')}" 
                   oninput="app.filterCardSearch(this.value)">

            <button class="notion-btn-blue" onclick="app.openModalNovaCompraCartao()">
              Nova <span style="font-size:0.65rem; margin-left:2px;">▾</span>
            </button>
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
              ${purchases.length === 0 ? `
                <tr>
                  <td colspan="${5 + cols.length}" style="text-align: center; padding: 3rem 1rem; color: #64748b;">
                    Nenhuma compra encontrada para ${cardTitle} no ano ${store.activeYear}. Clique em "+ Nova" para cadastrar sua compra.
                  </td>
                </tr>
              ` : purchases.map(p => {
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
              }).join('')}
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

  renderCardPurchasesList() {
    const tbody = document.getElementById('cardPurchasesTableBody');
    if (!tbody) return;

    let purchases = store.data.cardPurchases || [];
    if (this.activeTabCartao !== 'todos') {
      purchases = purchases.filter(p => (p.card || '').toLowerCase().includes(this.activeTabCartao.toLowerCase()));
    }

    const totalOpen = (store.data.cardPurchases || []).reduce((acc, p) => acc + (Number(p.totalAmount) || 0), 0);
    const elTotal = document.getElementById('totalOpenCardPurchases');
    if (elTotal) elTotal.textContent = formatBRL(totalOpen);

    tbody.innerHTML = purchases.length === 0 ? `
      <tr><td colspan="7" style="text-align:center; color: var(--text-muted); padding: 2rem;">Nenhuma compra de cartão cadastrada.</td></tr>
    ` : purchases.map(p => {
      const parcelas = Number(p.installments) || 1;
      const valorParcela = (Number(p.totalAmount) || 0) / parcelas;
      const mesInicio = (store.data.months[p.startMonth]?.name) || (INITIAL_DATABASE.months[p.startMonth]?.name) || 'Janeiro';
      const anoInicio = p.startYear || (p.date ? p.date.split('-')[0] : store.activeYear);

      return `
        <tr>
          <td>
            <div style="display:flex; align-items:center; gap:0.45rem;">
              <span style="color:#64748b;">📄</span>
              <strong>${escapeHtml(p.description)}</strong>
            </div>
          </td>
          <td>${this.getSiteTagHtml(p.place)}</td>
          <td><span class="status-badge neutral">${p.card}</span></td>
          <td>${formatDateBR(p.date)}</td>
          <td>
            <span class="status-badge waiting">${parcelas}x de ${formatBRL(valorParcela)}</span>
            <div style="font-size:0.75rem; color:var(--text-muted); margin-top:3px;">
              1ª parcela: <strong>${mesInicio}/${anoInicio}</strong>
            </div>
          </td>
          <td style="font-weight: 800; color: #ffffff;">${formatBRL(p.totalAmount)}</td>
          <td style="text-align: center;">
            <div class="table-actions" style="justify-content: center; gap: 0.35rem;">
              <button class="btn-table-icon" title="Ver Detalhes" onclick="app.openCardPurchaseDetails('${p.id}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
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
            <div style="font-size:0.75rem; color:var(--text-muted);">Parcelamento</div>
            <div style="font-weight:700; color:#fbbf24; font-size:0.95rem;">${info.count}x de ${formatBRL(info.installmentValue)}</div>
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

    this.openModal('modalDetalhesCompraCartao');
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
  // 5. MÓDULO BOMBEIRO COMUNITÁRIO (ESCALA 24x72 & RESSARCIMENTOS)
  // =========================================================================
  bombeiroCalState: {
    year: 2026,
    month: 9, // Outubro (0-indexed)
    filter: 'all'
  },
  currentModalShifts: [],

  getGuPorData(ano, mes, dia) {
    const GUS = [
      { id: 'azul', nome: 'AZUL', responsavel: 'Moraes', cor: '#38bdf8', bg: 'rgba(56, 189, 248, 0.16)', border: 'rgba(56, 189, 248, 0.45)', icone: '🔵' },
      { id: 'amarela', nome: 'AMARELA', responsavel: 'Lapa', cor: '#facc15', bg: 'rgba(250, 204, 21, 0.16)', border: 'rgba(250, 204, 21, 0.45)', icone: '🟡' },
      { id: 'verde', nome: 'VERDE', responsavel: 'Uitajuci', cor: '#4ade80', bg: 'rgba(74, 222, 128, 0.16)', border: 'rgba(74, 222, 128, 0.45)', icone: '🟢' },
      { id: 'vermelha', nome: 'VERMELHA', responsavel: 'Búrigo', cor: '#f87171', bg: 'rgba(248, 113, 113, 0.16)', border: 'rgba(248, 113, 113, 0.45)', icone: '🔴' }
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
          pShiftsHtml += `<div class="bombeiro-shift-badge contemplated-${s.period}" style="opacity:0.65;">${s.period === 'diurno' ? '☀️ MEU PLANTÃO (+ R$ 125)' : '🌙 MEU PLANTÃO (+ R$ 125)'}</div>`;
        } else {
          pShiftsHtml += `<div class="bombeiro-shift-badge pending" style="opacity:0.5;">⏱️ Disp: ${s.period === 'diurno' ? 'Diurno' : 'Noturno'}</div>`;
        }
      });

      cellsHtml += `
        <div class="bombeiro-day-cell other-month ${hasPContemplated ? 'has-contemplated' : ''}">
          <div class="bombeiro-day-header">
            <span class="bombeiro-day-num" style="opacity:0.4;">${pDay}</span>
          </div>
          <div class="bombeiro-gu-badge" style="background:${gu.bg}; border:1px dashed ${gu.border}; color:${gu.cor};">
            <span class="bombeiro-gu-line">${gu.icone} ${gu.nome}</span>
            <span class="bombeiro-gu-resp">(${gu.responsavel})</span>
          </div>
          ${hasJotur ? '<span class="legend-tag-jotur" style="opacity:0.5; font-size:0.6rem;">🚌 JOTUR</span>' : ''}
          ${pShiftsHtml}
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
            <div class="bombeiro-shift-badge contemplated-${s.period}" title="Plantão Contemplado (+ R$ 125,00)">
              ${s.period === 'diurno' ? '☀️ MEU PLANTÃO DIURNO (+ R$ 125)' : '🌙 MEU PLANTÃO NOTURNO (+ R$ 125)'}
            </div>
          `;
        } else {
          myShiftsHtml += `
            <div class="bombeiro-shift-badge pending" title="Disponibilidade enviada (aguardando contemplação)">
              ⏱️ Disp: ${s.period === 'diurno' ? 'Diurno' : 'Noturno'}
            </div>
          `;
        }
      });

      cellsHtml += `
        <div class="bombeiro-day-cell ${isToday ? 'is-today' : ''} ${hasContemplated ? 'has-contemplated' : ''} ${isFilteredOut ? 'filtered-out' : ''}">
          <div class="bombeiro-day-header">
            <span class="bombeiro-day-num" style="${isToday ? 'color:#38bdf8; font-weight:800;' : ''}">${day}</span>
            ${isToday ? '<span class="bombeiro-today-badge">HOJE</span>' : ''}
          </div>
          <div class="bombeiro-gu-badge" style="background:${gu.bg}; border:1px solid ${gu.border}; color:${gu.cor};">
            <span class="bombeiro-gu-line">${gu.icone} ${gu.nome}</span>
            <span class="bombeiro-gu-resp">(${gu.responsavel})</span>
          </div>
          ${hasJotur ? '<div class="bombeiro-jotur-badge">🚌 JOTUR</div>' : ''}
          ${myShiftsHtml}
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
          nShiftsHtml += `<div class="bombeiro-shift-badge contemplated-${s.period}" style="opacity:0.65;">${s.period === 'diurno' ? '☀️ MEU PLANTÃO (+ R$ 125)' : '🌙 MEU PLANTÃO (+ R$ 125)'}</div>`;
        } else {
          nShiftsHtml += `<div class="bombeiro-shift-badge pending" style="opacity:0.5;">⏱️ Disp: ${s.period === 'diurno' ? 'Diurno' : 'Noturno'}</div>`;
        }
      });

      cellsHtml += `
        <div class="bombeiro-day-cell other-month ${hasNContemplated ? 'has-contemplated' : ''}">
          <div class="bombeiro-day-header">
            <span class="bombeiro-day-num" style="opacity:0.4;">${n}</span>
          </div>
          <div class="bombeiro-gu-badge" style="background:${gu.bg}; border:1px dashed ${gu.border}; color:${gu.cor};">
            <span class="bombeiro-gu-line">${gu.icone} ${gu.nome}</span>
            <span class="bombeiro-gu-resp">(${gu.responsavel})</span>
          </div>
          ${hasJotur ? '<span class="legend-tag-jotur" style="opacity:0.5; font-size:0.6rem;">🚌 JOTUR</span>' : ''}
          ${nShiftsHtml}
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

      if (dateReq) dateReq.value = record.dateRequested || '';
      if (statusSel) statusSel.value = record.status || 'Pendente';
      if (datePay) datePay.value = record.datePayment || '';
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

      const todayStr = new Date().toISOString().split('T')[0];
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
      datePay.value = new Date().toISOString().split('T')[0];
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
  // 7. MÓDULO INVESTIMENTOS
  // =========================================================================
  renderInvestimentos() {
    const summary = store.getInvestmentsSummary();

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

    // Métricas executivas enriquecidas no banner superior
    const elAssetsBadge = document.getElementById('investAssetsBadge');
    if (elAssetsBadge) elAssetsBadge.textContent = `${summary.totalPositions} posições ativas`;

    const elEarningsCount = document.getElementById('investEarningsCountBadge');
    if (elEarningsCount) elEarningsCount.textContent = `(${summary.earningsCount} lançamentos)`;

    const elTotalPlusEarnings = document.getElementById('investTotalPlusEarnings');
    if (elTotalPlusEarnings) elTotalPlusEarnings.textContent = formatBRL(summary.totalAccumulated);

    const elCurrMonthEarnings = document.getElementById('investCurrentMonthEarnings');
    if (elCurrMonthEarnings) elCurrMonthEarnings.textContent = `+ ${formatBRL(summary.currentMonthEarnings)}`;

    const elStockCount = document.getElementById('investStockCount');
    if (elStockCount) elStockCount.textContent = `${summary.stockCount} ativos`;

    const elBoxCount = document.getElementById('investBoxCount');
    if (elBoxCount) elBoxCount.textContent = `${summary.boxCount} caixinhas`;

    const elTopAsset = document.getElementById('investTopAsset');
    if (elTopAsset) elTopAsset.textContent = summary.topAssetTicker;

    const elTopAssetDetail = document.getElementById('investTopAssetDetail');
    if (elTopAssetDetail) {
      elTopAssetDetail.textContent = summary.topAssetVal > 0 
        ? `${formatBRL(summary.topAssetVal)} (${summary.topAssetShare.toFixed(1)}% da carteira)`
        : '0% da carteira';
    }

    const elTotalReturnVal = document.getElementById('investTotalReturnVal');
    if (elTotalReturnVal) elTotalReturnVal.textContent = `+ ${summary.yieldGlobal.toFixed(2)}%`;

    const elTotalReturnSub = document.getElementById('investTotalReturnSub');
    if (elTotalReturnSub) elTotalReturnSub.textContent = `+ ${formatBRL(summary.totalEarnings)} em rendimentos`;

    // Badges de Contagem
    const badgeStockEarn = document.getElementById('countStockEarningsBadge');
    if (badgeStockEarn) badgeStockEarn.textContent = (store.data.investments.stockEarnings || []).length;

    const badgeNubankEarn = document.getElementById('countNubankEarningsBadge');
    if (badgeNubankEarn) badgeNubankEarn.textContent = (store.data.investments.nubankEarnings || []).length;

    // 1. Tabela Bolsa - Ativos em Carteira
    const tbodyStocks = document.getElementById('stocksTableBody');
    if (tbodyStocks) {
      const stocksList = store.data.investments.stocks || [];
      tbodyStocks.innerHTML = stocksList.length === 0 ? `
        <tr><td colspan="7" style="text-align:center; color: var(--text-muted); padding: 2rem;">Nenhum ativo de Bolsa (Ações/FIIs) cadastrado.</td></tr>
      ` : stocksList.map(s => {
        const totalVal = Number(s.total) || (Number(s.shares) * Number(s.pricePerShare)) || 0;
        return `
        <tr>
          <td><strong style="color:#60a5fa; font-size:0.95rem;">${s.ticker}</strong></td>
          <td><span class="status-badge neutral">${s.type || 'Ação'}</span></td>
          <td>${formatDateBR(s.date)}</td>
          <td>${s.shares}</td>
          <td>${formatBRL(s.pricePerShare)}</td>
          <td style="font-weight: 800; color: #fff;">${formatBRL(totalVal)}</td>
          <td>
            <div class="table-actions">
              <button class="btn-table-icon delete" title="Excluir Ativo" onclick="app.deleteStock('${s.id}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            </div>
          </td>
        </tr>
      `;}).join('');
    }

    // 2. Tabela Bolsa - Rendimentos / Proventos Recebidos
    const tbodyStockEarnings = document.getElementById('stockEarningsTableBody');
    if (tbodyStockEarnings) {
      const earnList = store.data.investments.stockEarnings || [];
      tbodyStockEarnings.innerHTML = earnList.length === 0 ? `
        <tr><td colspan="6" style="text-align:center; color: var(--text-muted); padding: 2rem;">Nenhum provento ou dividendo lançado. Clique em "+ Inserir Rendimento / Provento" para cadastrar.</td></tr>
      ` : earnList.map(e => `
        <tr>
          <td><strong style="color:#34d399; font-size:0.95rem;">${e.ticker}</strong></td>
          <td><span class="status-badge paid">${e.type || 'Dividendo'}</span></td>
          <td>${formatDateBR(e.date)}</td>
          <td style="font-weight: 800; color: #4ade80;">+ ${formatBRL(e.amount)}</td>
          <td style="font-size: 0.85rem; color: var(--text-secondary);">${e.notes || '-'}</td>
          <td>
            <div class="table-actions">
              <button class="btn-table-icon delete" title="Excluir Rendimento" onclick="app.deleteStockEarning('${e.id}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            </div>
          </td>
        </tr>
      `).join('');
    }

    // 3. Tabela Nubank Caixinhas
    const tbodyBoxes = document.getElementById('nubankBoxesTableBody');
    if (tbodyBoxes) {
      const boxesList = store.data.investments.nubankBoxes || [];
      tbodyBoxes.innerHTML = boxesList.length === 0 ? `
        <tr><td colspan="5" style="text-align:center; color: var(--text-muted); padding: 2rem;">Nenhuma caixinha ou renda fixa Nubank cadastrada.</td></tr>
      ` : boxesList.map(b => `
        <tr>
          <td><strong style="color:#c084fc; font-size:0.95rem;">${b.name}</strong></td>
          <td>${formatDateBR(b.date)}</td>
          <td style="font-weight: 800; color: #fff;">${formatBRL(b.amount)}</td>
          <td><span class="status-badge paid">${b.status || 'Ativo'}</span></td>
          <td>
            <div class="table-actions">
              <button class="btn-table-icon delete" title="Excluir Caixinha" onclick="app.deleteNubankBox('${b.id}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            </div>
          </td>
        </tr>
      `).join('');
    }

    // 4. Tabela Nubank Rendimentos
    const tbodyNubankEarnings = document.getElementById('nubankEarningsTableBody');
    if (tbodyNubankEarnings) {
      const boxEarnList = store.data.investments.nubankEarnings || [];
      tbodyNubankEarnings.innerHTML = boxEarnList.length === 0 ? `
        <tr><td colspan="5" style="text-align:center; color: var(--text-muted); padding: 2rem;">Nenhum rendimento de caixinha lançado. Clique em "+ Inserir Rendimento Caixinha" para adicionar.</td></tr>
      ` : boxEarnList.map(b => `
        <tr>
          <td><strong style="color:#c084fc; font-size:0.95rem;">${b.boxName}</strong></td>
          <td>${formatDateBR(b.date)}</td>
          <td style="font-weight: 800; color: #4ade80;">+ ${formatBRL(b.amount)}</td>
          <td style="font-size: 0.85rem; color: var(--text-secondary);">${b.notes || '-'}</td>
          <td>
            <div class="table-actions">
              <button class="btn-table-icon delete" title="Excluir Rendimento" onclick="app.deleteNubankEarning('${b.id}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            </div>
          </td>
        </tr>
      `).join('');
    }

    // Renderiza os Gráficos Exclusivos de Investimentos
    this.renderInvestCharts(summary);
  },

  // Alternar abas da Bolsa
  switchInvestStockTab(tab) {
    const btnPos = document.getElementById('btnTabStocksPositions');
    const btnEarn = document.getElementById('btnTabStocksEarnings');
    const pnlPos = document.getElementById('panelStocksPositions');
    const pnlEarn = document.getElementById('panelStocksEarnings');

    if (tab === 'positions') {
      btnPos?.classList.add('active');
      btnEarn?.classList.remove('active');
      if (pnlPos) pnlPos.style.display = 'block';
      if (pnlEarn) pnlEarn.style.display = 'none';
    } else {
      btnPos?.classList.remove('active');
      btnEarn?.classList.add('active');
      if (pnlPos) pnlPos.style.display = 'none';
      if (pnlEarn) pnlEarn.style.display = 'block';
    }
  },

  // Alternar abas do Nubank
  switchInvestNubankTab(tab) {
    const btnBox = document.getElementById('btnTabNubankBoxes');
    const btnEarn = document.getElementById('btnTabNubankEarnings');
    const pnlBox = document.getElementById('panelNubankBoxes');
    const pnlEarn = document.getElementById('panelNubankEarnings');

    if (tab === 'boxes') {
      btnBox?.classList.add('active');
      btnEarn?.classList.remove('active');
      if (pnlBox) pnlBox.style.display = 'block';
      if (pnlEarn) pnlEarn.style.display = 'none';
    } else {
      btnBox?.classList.remove('active');
      btnEarn?.classList.add('active');
      if (pnlBox) pnlBox.style.display = 'none';
      if (pnlEarn) pnlEarn.style.display = 'block';
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
    if (confirm('Deseja excluir esta caixinha do Nubank?')) {
      store.deleteNubankBox(id);
      this.renderInvestimentos();
      this.renderResumo();
      this.showToast('Caixinha excluída.', 'info');
    }
  },

  deleteNubankEarning(id) {
    if (confirm('Deseja excluir este rendimento da caixinha?')) {
      store.deleteNubankEarning(id);
      this.renderInvestimentos();
      this.renderResumo();
      this.showToast('Rendimento excluído.', 'info');
    }
  },

  prepareModalNovoRendimentoBolsa() {
    const form = document.getElementById('formNovoRendimentoBolsa');
    if (form) form.reset();

    const dateInp = document.getElementById('stk_earn_date');
    if (dateInp) dateInp.value = new Date().toISOString().split('T')[0];

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
  },

  prepareModalNovoRendimentoNubank() {
    const form = document.getElementById('formNovoRendimentoNubank');
    if (form) form.reset();

    const dateInp = document.getElementById('box_earn_date');
    if (dateInp) dateInp.value = new Date().toISOString().split('T')[0];

    const datalist = document.getElementById('nubankBoxesDatalist');
    if (datalist) {
      const boxNames = [...new Set((store.data.investments.nubankBoxes || []).map(b => b.name).filter(Boolean))];
      datalist.innerHTML = boxNames.map(b => `<option value="${b}">`).join('');
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
      if (modalId === 'modalConfigSupabase') {
        this.updateSupabaseModalUI();
      } else if (modalId === 'modalNovoRendimentoBolsa') {
        this.prepareModalNovoRendimentoBolsa();
      } else if (modalId === 'modalNovoRendimentoNubank') {
        this.prepareModalNovoRendimentoNubank();
      }
      modal.classList.add('active');
    }
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
    const cardObj = (store.data.cards || []).find(c => (c.name || '').toLowerCase() === cardName.toLowerCase());
    const closingDay = cardObj ? (cardObj.closingDay || 1) : 1;
    const dueDay = cardObj ? (cardObj.dueDay || 10) : 10;

    let sMonth = dMonth;
    let sYear = dYear;
    let hint = '';

    const monthNames = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

    if (dDay > closingDay) {
      sMonth = dMonth + 1;
      if (sMonth > 12) {
        sMonth = 1;
        sYear += 1;
      }
      hint = `💡 Compra feita após o fechamento (dia ${closingDay}). 1ª parcela na fatura de ${monthNames[sMonth]}/${sYear} (venc. dia ${dueDay}).`;
    } else {
      hint = `💡 Compra feita antes do fechamento (dia ${closingDay}). 1ª parcela na fatura de ${monthNames[sMonth]}/${sYear} (venc. dia ${dueDay}).`;
    }

    mSelect.value = String(sMonth);
    if (ySelect) ySelect.value = String(sYear);
    if (hintEl) hintEl.textContent = hint;
  },

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
      document.body.classList.add('modal-open');
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
        const desc = document.getElementById('fix_desc').value.trim();
        const dueDay = Math.min(31, Math.max(1, parseInt(document.getElementById('fix_due_day').value, 10) || 1));
        const valExpected = parseMoney(document.getElementById('fix_val_exp').value);
        const valPaidRaw = document.getElementById('fix_val_paid').value.trim();
        const status = document.getElementById('fix_status').value;
        let valPaid = parseMoney(valPaidRaw);
        if (status === 'Pago' && !valPaidRaw) {
          valPaid = valExpected;
        }

        // Seleção de Meses (idêntico ao Rendimento / Receita)
        const checkedBoxes = Array.from(document.querySelectorAll('input[name="fix_month_chk"]:checked'));
        const targetMonths = checkedBoxes.length > 0 ? checkedBoxes.map(c => Number(c.value)) : [this.activeMonth];
        const annualGroupId = targetMonths.length > 1 ? 'fix_grp_' + Date.now() : null;

        targetMonths.forEach(mNum => {
          const exp = {
            description: desc,
            dueDay: dueDay,
            dueDate: `${store.activeYear}-${String(mNum).padStart(2, '0')}-${String(Math.min(dueDay, 28)).padStart(2, '0')}`,
            valueExpected: valExpected,
            valuePaid: valPaid,
            status: status,
            bank: '', // Banco permanece em branco no cadastro, conforme solicitado
            annualGroupId: annualGroupId
          };
          store.addFixedExpense(mNum, exp);
        });

        this.closeModal('modalNovaDespesaFixa');
        formFix.reset();
        this.renderMeses();
        this.renderResumo();
        const msg = targetMonths.length > 1 
          ? `Despesa fixa cadastrada para ${targetMonths.length} meses!` 
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
        const desc = document.getElementById('edit_fix_desc').value.trim();
        const dueDay = Math.min(31, Math.max(1, parseInt(document.getElementById('edit_fix_due_day').value, 10) || 1));
        const valExpected = parseMoney(document.getElementById('edit_fix_val_exp').value);
        const valPaidRaw = document.getElementById('edit_fix_val_paid').value.trim();
        const status = document.getElementById('edit_fix_status').value;
        let valPaid = parseMoney(valPaidRaw);
        if (status === 'Pago' && !valPaidRaw) {
          valPaid = valExpected;
        }

        const updated = {
          description: desc,
          dueDay: dueDay,
          dueDate: `${store.activeYear}-${String(monthNum).padStart(2, '0')}-${String(Math.min(dueDay, 28)).padStart(2, '0')}`,
          valueExpected: valExpected,
          valuePaid: valPaid,
          status: status,
          bank: document.getElementById('edit_fix_bank').value || ''
        };
        store.updateFixedExpense(monthNum, id, updated);
        this.closeModal('modalEditarDespesaFixa');
        formEditFix.reset();
        this.renderMeses();
        this.renderResumo();
        this.showToast('Despesa fixa atualizada com sucesso!', 'success');
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

        // Se a data de início da cobrança ficou anterior à data da compra, ajusta automaticamente
        if (sYear < dYear || (sYear === dYear && sMonth < dMonth)) {
          const cardTypeVal = document.getElementById('card_type').value;
          const cardObj = (store.data.cards || []).find(c => (c.name || '').toLowerCase() === (cardTypeVal || '').toLowerCase());
          const closingDay = cardObj ? (cardObj.closingDay || 1) : 1;
          if (dDay > closingDay) {
            sMonth = dMonth + 1;
            sYear = dYear;
            if (sMonth > 12) {
              sMonth = 1;
              sYear += 1;
            }
          } else {
            sMonth = dMonth;
            sYear = dYear;
          }
        }

        const purchase = {
          description: document.getElementById('card_desc').value,
          place: document.getElementById('card_place').value,
          card: document.getElementById('card_type').value,
          date: dateVal,
          totalAmount: parseMoney(document.getElementById('card_val').value),
          installments: Number(document.getElementById('card_installments').value) || 1,
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
        const recordId = document.getElementById('ff_record_id')?.value;
        const monthRef = document.getElementById('ff_month')?.value || '';
        const dateRequested = document.getElementById('ff_date_req')?.value || '';
        const datePayment = document.getElementById('ff_date_pay')?.value || '';
        const status = document.getElementById('ff_status')?.value || 'Pendente';
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

    // Formulário Novo Rendimento da Bolsa
    const formStockEarn = document.getElementById('formNovoRendimentoBolsa');
    if (formStockEarn) {
      formStockEarn.addEventListener('submit', (e) => {
        e.preventDefault();
        const earn = {
          ticker: document.getElementById('stk_earn_ticker').value.toUpperCase().trim(),
          type: document.getElementById('stk_earn_type').value,
          date: document.getElementById('stk_earn_date').value,
          amount: document.getElementById('stk_earn_val').value,
          bank: document.getElementById('stk_earn_bank') ? document.getElementById('stk_earn_bank').value : '',
          notes: document.getElementById('stk_earn_notes').value
        };
        store.addStockEarning(earn);
        this.closeModal('modalNovoRendimentoBolsa');
        formStockEarn.reset();
        this.renderInvestimentos();
        this.renderResumo();
        this.showToast('💰 Rendimento da Bolsa lançado com sucesso!', 'success');
      });
    }

    // Formulário Novo Rendimento Nubank
    const formBoxEarn = document.getElementById('formNovoRendimentoNubank');
    if (formBoxEarn) {
      formBoxEarn.addEventListener('submit', (e) => {
        e.preventDefault();
        const earn = {
          boxName: document.getElementById('box_earn_name').value.trim(),
          date: document.getElementById('box_earn_date').value,
          amount: document.getElementById('box_earn_val').value,
          notes: document.getElementById('box_earn_notes').value
        };
        store.addNubankEarning(earn);
        this.closeModal('modalNovoRendimentoNubank');
        formBoxEarn.reset();
        this.renderInvestimentos();
        this.renderResumo();
        this.showToast('✨ Rendimento do Nubank cadastrado com sucesso!', 'success');
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
  }
};

// Inicialização Global
document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
