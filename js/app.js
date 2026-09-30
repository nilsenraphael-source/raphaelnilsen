/**
 * SISTEMA FINANCEIRO RAPHAEL NILSEN
 * Controlador da Aplicação e Interface Executiva
 */

// Formatador Monetário Brasileiro Executivo
function formatBRL(val) {
  const num = Number(val) || 0;
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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

// Elementos Globais
const app = {
  currentTab: 'resumo',
  activeMonth: new Date().getMonth() + 1, // 1 a 12
  activeSubtabMes: 'receitas',
  activeTabCartao: 'todos',
  activeTabInvest: 'bolsa',

  init() {
    this.bindEvents();
    this.checkSession();
    this.updateHeaderDate();
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
    } else {
      if (loginScreen) loginScreen.style.display = 'flex';
      if (appContainer) appContainer.style.display = 'none';
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

  updateHeaderDate() {
    const el = document.getElementById('headerDate');
    if (el) {
      const now = new Date();
      const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      const formatted = now.toLocaleDateString('pt-BR', options);
      el.textContent = formatted.charAt(0).toUpperCase() + formatted.slice(1);
    }
  },

  // Roteamento de Abas
  navigateTo(tabId) {
    this.currentTab = tabId;

    // Atualiza Sidebar
    document.querySelectorAll('.nav-item').forEach(item => {
      if (item.dataset.tab === tabId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Atualiza View
    document.querySelectorAll('.page-view').forEach(view => {
      view.classList.remove('active');
    });
    const targetView = document.getElementById(`view-${tabId}`);
    if (targetView) targetView.classList.add('active');

    // Atualiza Título do Cabeçalho
    const titles = {
      resumo: 'Resumo Executivo Consolidado',
      meses: 'Gestão Mensal de Entradas e Saídas',
      cartoes: 'Cartão de Crédito e Compras Parceladas',
      senhas: 'Cofre de Senhas Protegido',
      sonhos: 'Sonhos & Planejamento de Compras',
      bombeiro: 'Bombeiro Comunitário (Ressarcimentos)',
      jotur: 'Controle de Caixa & Troco Jotur (R$ 200)',
      investimentos: 'Gestão de Ativos & Investimentos'
    };
    const titleEl = document.getElementById('pageTitle');
    if (titleEl) titleEl.textContent = titles[tabId] || 'Sistema Financeiro';

    // Fecha sidebar no celular se aberta
    const sidebar = document.getElementById('appSidebar');
    if (sidebar) sidebar.classList.remove('open');

    // Renderiza o módulo específico
    this.render();
  },

  // Disparador de Renderização
  render() {
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

    // 3. Renderiza a Sub-aba ativa
    this.renderActiveMonthSubtab();
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
      container.innerHTML = `
        <div class="card-header">
          <div class="card-title-group">
            <h3 class="card-title">Receitas de ${m.name}</h3>
          </div>
          <button class="btn-header primary" onclick="app.openModal('modalNovaReceita')">+ Nova Receita</button>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Fonte de Renda</th>
                <th>Valor</th>
                <th>Data</th>
                <th>Estado</th>
                <th>Banco / Conta</th>
                <th style="width: 80px;">Ações</th>
              </tr>
            </thead>
            <tbody>
              ${m.revenues.length === 0 ? `
                <tr><td colspan="6" style="text-align:center; color: var(--text-muted); padding: 2rem;">Nenhuma receita registrada neste mês.</td></tr>
              ` : m.revenues.map(r => `
                <tr>
                  <td><strong>${r.source}</strong></td>
                  <td style="color: var(--success); font-weight: 700;">${formatBRL(r.value)}</td>
                  <td>${formatDateBR(r.date)}</td>
                  <td><span class="status-badge ${r.status === 'Recebido' ? 'received' : 'pending'}">${r.status || 'Pendente'}</span></td>
                  <td>${r.bank || '-'}</td>
                  <td>
                    <div class="table-actions">
                      <button class="btn-table-icon delete" title="Excluir" onclick="app.deleteRevenue(${this.activeMonth}, '${r.id}')">
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
    } else if (this.activeSubtabMes === 'fixas') {
      container.innerHTML = `
        <div class="card-header">
          <div class="card-title-group">
            <h3 class="card-title">Despesas Fixas de ${m.name}</h3>
          </div>
          <button class="btn-header primary" onclick="app.openModal('modalNovaDespesaFixa')">+ Nova Despesa Fixa</button>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Conta / Descrição</th>
                <th>Vencimento</th>
                <th>Valor Previsto</th>
                <th>Valor Pago</th>
                <th>Estado</th>
                <th>Banco / Conta</th>
                <th style="width: 80px;">Ações</th>
              </tr>
            </thead>
            <tbody>
              ${m.fixedExpenses.length === 0 ? `
                <tr><td colspan="7" style="text-align:center; color: var(--text-muted); padding: 2rem;">Nenhuma despesa fixa cadastrada para este mês.</td></tr>
              ` : m.fixedExpenses.map(e => `
                <tr>
                  <td><strong>${e.description}</strong></td>
                  <td>${formatDateBR(e.dueDate)}</td>
                  <td>${formatBRL(e.valueExpected)}</td>
                  <td style="color: var(--danger); font-weight: 700;">${formatBRL(e.valuePaid || e.valueExpected)}</td>
                  <td>
                    <button class="status-badge ${e.status === 'Pago' ? 'paid' : 'pending'}" style="cursor:pointer; border:none;" onclick="app.toggleFixedExpenseStatus(${this.activeMonth}, '${e.id}')">
                      ${e.status || 'Pendente'}
                    </button>
                  </td>
                  <td>${e.bank || '-'}</td>
                  <td>
                    <div class="table-actions">
                      <button class="btn-table-icon delete" title="Excluir" onclick="app.deleteFixedExpense(${this.activeMonth}, '${e.id}')">
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
      const cardInstallments = store.getCardInstallmentsForMonth(this.activeMonth);
      const totalCardThisMonth = cardInstallments.reduce((acc, c) => acc + c.value, 0);

      container.innerHTML = `
        <div class="card-header">
          <div class="card-title-group">
            <h3 class="card-title">Fatura / Parcelas de Cartão para ${m.name}</h3>
            <span class="card-subtitle">Encaminhado automaticamente do Módulo Cartão de Crédito</span>
          </div>
          <div style="font-size: 1.1rem; font-weight: 800; color: var(--danger);">
            Total Fatura: ${formatBRL(totalCardThisMonth)}
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
                <th>Data da Compra</th>
              </tr>
            </thead>
            <tbody>
              ${cardInstallments.length === 0 ? `
                <tr><td colspan="6" style="text-align:center; color: var(--text-muted); padding: 2rem;">Nenhuma parcela de cartão caindo neste mês.</td></tr>
              ` : cardInstallments.map(c => `
                <tr>
                  <td><strong>${c.description}</strong></td>
                  <td>${c.place || '-'}</td>
                  <td><span class="status-badge neutral">${c.card}</span></td>
                  <td><span class="status-badge waiting">${c.installmentIndex} de ${c.installmentsTotal}</span></td>
                  <td style="color: var(--danger); font-weight: 700;">${formatBRL(c.value)}</td>
                  <td>${formatDateBR(c.date)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }
  },

  deleteRevenue(monthNum, id) {
    if (confirm('Deseja excluir esta receita?')) {
      store.deleteRevenue(monthNum, id);
      this.renderMeses();
      this.renderResumo();
      this.showToast('Receita removida com sucesso.', 'info');
    }
  },

  deleteFixedExpense(monthNum, id) {
    if (confirm('Deseja excluir esta despesa fixa?')) {
      store.deleteFixedExpense(monthNum, id);
      this.renderMeses();
      this.renderResumo();
      this.showToast('Despesa fixa removida com sucesso.', 'info');
    }
  },

  toggleFixedExpenseStatus(monthNum, id) {
    const expense = store.data.months[monthNum].fixedExpenses.find(e => e.id === id);
    if (expense) {
      expense.status = expense.status === 'Pago' ? 'Pendente' : 'Pago';
      store.save();
      this.renderMeses();
      this.renderResumo();
      this.showToast(`Despesa marcada como ${expense.status}!`, 'success');
    }
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
    const sidebar = document.getElementById('appSidebar');
    if (btnMobile && sidebar) {
      btnMobile.addEventListener('click', () => {
        sidebar.classList.toggle('open');
      });
    }

    // Navegação Sidebar
    document.querySelectorAll('.nav-item').forEach(item => {
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

    // Formulário Nova Receita
    const formRev = document.getElementById('formNovaReceita');
    if (formRev) {
      formRev.addEventListener('submit', (e) => {
        e.preventDefault();
        const rev = {
          source: document.getElementById('rev_source').value,
          value: document.getElementById('rev_value').value,
          date: document.getElementById('rev_date').value,
          status: document.getElementById('rev_status').value,
          bank: document.getElementById('rev_bank').value
        };
        store.addRevenue(this.activeMonth, rev);
        this.closeModal('modalNovaReceita');
        formRev.reset();
        this.renderMeses();
        this.renderResumo();
        this.showToast('Receita adicionada!', 'success');
      });
    }

    // Formulário Nova Despesa Fixa
    const formFix = document.getElementById('formNovaDespesaFixa');
    if (formFix) {
      formFix.addEventListener('submit', (e) => {
        e.preventDefault();
        const exp = {
          description: document.getElementById('fix_desc').value,
          dueDate: document.getElementById('fix_date').value,
          valueExpected: document.getElementById('fix_val_exp').value,
          valuePaid: document.getElementById('fix_val_paid').value || document.getElementById('fix_val_exp').value,
          status: document.getElementById('fix_status').value,
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
