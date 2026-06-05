'use strict';
initStore();

var _sess = getSession();
if (!_sess || _sess.role !== 'psicologa') { clearSession(); window.location.href = '../index.html'; }

document.getElementById('sb-nome').textContent   = _sess.nome || 'Psicóloga';
document.getElementById('sb-avatar').textContent = (_sess.nome || 'P').charAt(0);
document.getElementById('wb-nome').textContent   = 'Olá, ' + (_sess.nome || 'Psicóloga').split(' ')[0] + '!';
/* Mostra unidade no topbar */
(function(){
  var unNome = nomeUnidade(_sess.unidadeId);
  var el = document.getElementById('topbar-unidade');
  if (el) el.textContent = 'SAP · Psicólogo(a) · ' + unNome;
})();

var _atendimentoSel = null;
var _tabPac = 'todos';
var _cursoPacFiltro = 'todos';
var _chatPara = null;

/* ── Navegação ── */
function navTo(panelId, navEl) {
  document.querySelectorAll('.panel-section').forEach(function(p){ p.classList.remove('active'); });
  document.querySelectorAll('.nav-link').forEach(function(n){ n.classList.remove('active'); });
  var p = document.getElementById(panelId);
  if (p) p.classList.add('active');
  if (navEl) navEl.classList.add('active');
  var lEl = navEl ? navEl.querySelector('.nav-label') : null;
  var tt  = document.getElementById('topbar-title');
  if (tt) tt.textContent = lEl ? lEl.textContent : '';
  if (panelId==='panel-dashboard')  renderDashboard();
  if (panelId==='panel-atendimentos')  renderAtendimentos();
  if (panelId==='panel-aprovacoes') renderAprovacoes();
  if (panelId==='panel-alunos')  renderAlunos();
  if (panelId==='panel-chat')       renderChatTabs();
  if (panelId==='panel-calendario') renderCalendario();
}

function recarregar() {
  var a = document.querySelector('.panel-section.active');
  if (a) navTo(a.id, document.querySelector('[data-panel="' + a.id + '"]'));
  toast('Dados atualizados!', 'info');
}

function updateBadge() {
  var store = getStore();
  var pend = store.alunos.filter(function(a){ return a.statusCadastro==='pendente'; }).length;
  var agt  = store.atendimentos.filter(function(c){ return c.status==='aguardando'; }).length;
  var bP = document.getElementById('badge-pend'), bA = document.getElementById('badge-agt');
  if (bP) { bP.textContent=pend; bP.classList.toggle('hidden', pend===0); }
  if (bA) { bA.textContent=agt;  bA.style.display = agt>0?'flex':'none'; }
}

/* ── Dashboard ── */
var _dashView = 'geral';
function setDashView(v, el) {
  _dashView = v;
  document.querySelectorAll('#panel-dashboard .wb-actions .btn').forEach(function(b){ b.classList.remove('btn-orange'); b.style.borderColor='rgba(255,255,255,.4)'; b.style.color='#fff'; });
  if (el) { el.classList.add('btn-orange'); el.style.borderColor=''; el.style.color=''; }
  renderDashboard();
}
function renderDashboard() {
  var store = getStore();
  var todas = store.atendimentos.filter(function(c){ return c.unidadeId===_sess.unidadeId; });
  var minhasAtendimentos = todas;
  var periodoLabel = 'Todas as atendimentos da unidade';
  if (_dashView === 'mensal') {
    var agora = new Date();
    minhasAtendimentos = todas.filter(function(c){
      var d = new Date(c.criacao);
      return d.getMonth()===agora.getMonth() && d.getFullYear()===agora.getFullYear();
    });
    var meses=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    periodoLabel = meses[agora.getMonth()] + ' de ' + agora.getFullYear();
  }
  var plEl = document.getElementById('ds-periodo-label');
  if (plEl) plEl.textContent = '📊 ' + periodoLabel;
  var ds = {
    agt:  minhasAtendimentos.filter(function(c){ return c.status==='aguardando'; }).length,
    conf: minhasAtendimentos.filter(function(c){ return c.status==='confirmada'; }).length,
    real: minhasAtendimentos.filter(function(c){ return c.status==='realizada';  }).length,
    pac:  store.alunos.filter(function(a){ return a.unidadeId===_sess.unidadeId && a.statusCadastro==='ativo'; }).length
  };
  Object.keys(ds).forEach(function(k){ var el=document.getElementById('ds-'+k); if(el) el.textContent=ds[k]; });
  /* Atualiza título do banner com nome + unidade */
  var unNome = nomeUnidade(_sess.unidadeId);
  var subEl = document.getElementById('wb-unidade-sub');
  if (subEl) subEl.textContent = 'Unidade: ' + unNome + ' · Gerencie atendimentos e comunicações.';
  updateBadge();
  /* Gráficos */
  setTimeout(function() { renderGraficos(); }, 0);
  var recentes = minhasAtendimentos.slice().sort(function(a,b){ return new Date(b.criacao)-new Date(a.criacao); }).slice(0,6);
  var el = document.getElementById('ds-recentes');
  if (!el) return;
  if (!recentes.length) { el.innerHTML='<div class="empty-state" style="padding:28px"><div class="empty-state-title">Nenhuma atendimento ainda</div></div>'; return; }
  el.innerHTML = '<table><thead><tr><th>Aluno</th><th>Motivo</th><th>Data Pref.</th><th>Status</th><th>Ações</th></tr></thead><tbody>'
    + recentes.map(function(c){
        var a = getAluno(c.idAluno);
        return '<tr>'
          + '<td><strong>' + escape(a&&a.nome||'—') + '</strong><span class="td-sub">' + escape(a&&a.matricula||'') + '</span></td>'
          + '<td>' + escape(c.motivoSolicitação.length>42?c.motivoSolicitação.slice(0,42)+'…':c.motivoSolicitação) + '</td>'
          + '<td>' + escape(c.dataPreferencial||'—') + '</td>'
          + '<td>' + statusBadge(c.status) + '</td>'
          + '<td><button class="btn btn-outline btn-sm" onclick="abrirModalAtendimento(\'' + c.id + '\')">'
          + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>Ver</button></td>'
          + '</tr>';
      }).join('') + '</tbody></table>';
}

/* ── Atendimentos ── */
function renderAtendimentos() {
  var store  = getStore();
  var busca  = document.getElementById('busca-c')      ? document.getElementById('busca-c').value.toLowerCase() : '';
  var filtro = document.getElementById('filtro-status') ? document.getElementById('filtro-status').value : '';
  var lista  = Permissions.getAtendimentosVisiveis(_sess, store.atendimentos, store.alunos);
  if (filtro) lista = lista.filter(function(c){ return c.status===filtro; });
  if (busca)  lista = lista.filter(function(c){
    var a = getAluno(c.idAluno);
    return (a&&a.nome||'').toLowerCase().indexOf(busca)>=0
        || (a&&a.matricula||'').indexOf(busca)>=0
        || c.motivoSolicitação.toLowerCase().indexOf(busca)>=0;
  });
  lista.sort(function(a,b){ return new Date(b.criacao)-new Date(a.criacao); });
  var tb = document.getElementById('tbody-atendimentos');
  if (!tb) return;
  if (!lista.length) { tb.innerHTML='<tr><td colspan="6" style="text-align:center;padding:44px;color:var(--gray-400)">Nenhuma atendimento encontrada</td></tr>'; return; }
  tb.innerHTML = lista.map(function(c){
    var a = getAluno(c.idAluno);
    var tipoAtend = c.tipoAtendimento || '';
    var isRemoto = (tipoAtend === 'remoto' || c.turno === 'remoto');
    var turnoCurso = a ? Validators.normalizeTurno(a.turnoCurso) : '';
    var turnoAtendimento = Validators.normalizeTurno(c.turno);
    var isForaHorario = !isRemoto && (tipoAtend === 'fora' || (turnoCurso && turnoAtendimento && turnoCurso !== turnoAtendimento));
    var rowStyle = '';
    if (isRemoto) rowStyle = ' style="background:rgba(37,99,235,0.06);border-left:3px solid #3b82f6"';
    else if (isForaHorario) rowStyle = ' style="background:rgba(247,163,0,0.06);border-left:3px solid #f5c518"';
    var tipoTag = '';
    if (isRemoto) tipoTag = ' <span style="font-size:10px;font-weight:700;background:#dbeafe;color:#1d4ed8;padding:2px 7px;border-radius:10px;margin-left:4px">📱 Remoto</span>';
    else if (isForaHorario) tipoTag = ' <span style="font-size:10px;font-weight:700;background:#fef3dc;color:#c87f00;padding:2px 7px;border-radius:10px;margin-left:4px">⚠️ Fora do horário</span>';
    var tLabel = isRemoto ? '<span style="color:#1d4ed8;font-weight:600">Remoto</span>' : turnoLabel(c.turno);
    var telInfo = isRemoto && a && a.telefone ? '<span class="td-sub" style="color:#1d4ed8;font-weight:600">📞 '+escape(a.telefone)+'</span>' : '';
    return '<tr'+rowStyle+'>'
      + '<td><strong>' + escape(a&&a.nome||'—') + '</strong><span class="td-sub">' + escape(a&&a.matricula||'') + ' · ' + escape(a&&a.curso||'') + '</span>'+telInfo+'</td>'
      + '<td>' + escape(c.motivoSolicitação.length>38?c.motivoSolicitação.slice(0,38)+'…':c.motivoSolicitação) + '</td>'
      + '<td>' + tLabel + tipoTag + '<span class="td-sub">' + escape(c.horarioPreferencial||'—') + ' · ' + escape(c.dataPreferencial||'—') + '</span></td>'
      + '<td>' + fmtDate(c.criacao) + '</td>'
      + '<td>' + statusBadge(c.status) + '</td>'
      + '<td class="td-actions"><button class="btn btn-outline btn-sm" onclick="abrirModalAtendimento(\''+c.id+'\')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>Detalhes</button></td>'
      + '</tr>';
  }).join('');
}

/* ── Modal Atendimento ── */
function abrirModalAtendimento(id) {
  var store  = getStore();
  var c      = store.atendimentos.find(function(x){ return x.id===id; });
  if (!c) return;
  _atendimentoSel = id;
  var aluno  = getAluno(c.idAluno);
  var mcBody = document.getElementById('mc-body');
  var mcTitle= document.getElementById('mc-title');
  var mcObs  = document.getElementById('mc-obs');
  var mcBtns = document.getElementById('mc-status-btns');
  if (!mcBody) return;
  if (mcTitle) mcTitle.textContent = aluno ? aluno.nome : 'Atendimento';

  /* Compatibilidade de turno — CORREÇÃO #7 */
  var turnoCurso    = aluno ? Validators.normalizeTurno(aluno.turnoCurso) : '';
  var turnoAtendimento = Validators.normalizeTurno(c.turno);
  var compat = aluno ? getCompatibilidadeAtendimento(aluno, c.turno, c.horarioPreferencial) : {ok:true,motivo:''};
  var compatHtml = '';
  if (!compat.ok) {
    compatHtml = '<div style="background:#fef3dc;border:1px solid #f5c518;border-radius:var(--r-sm);padding:10px 14px;margin-bottom:12px;display:flex;gap:9px;align-items:flex-start">'
      + '<svg viewBox="0 0 24 24" fill="none" stroke="#c87f00" stroke-width="2" style="width:16px;height:16px;flex-shrink:0;margin-top:1px"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
      + '<span style="font-size:12.5px;color:#7a4800"><strong>Atenção:</strong> ' + escape(compat.motivo) + '</span>'
      + '</div>';
  } else if (turnoCurso) {
    var faixa = turnoHoraConfig(turnoCurso);
    compatHtml = '<div style="background:#e8f8ef;border:1px solid #82e0aa;border-radius:var(--r-sm);padding:10px 14px;margin-bottom:12px;display:flex;gap:9px;align-items:center">'
      + '<svg viewBox="0 0 24 24" fill="none" stroke="#1e8449" stroke-width="2.5" style="width:14px;height:14px;flex-shrink:0"><polyline points="20 6 9 17 4 12"/></svg>'
      + '<span style="font-size:12.5px;color:#155724">Turno compatível com o curso do aluno (' + turnoLabel(turnoCurso) + (faixa?' · '+faixa.inicio+' às '+faixa.fim:'') + ')</span>'
      + '</div>';
  }

  /* Bloco de confirmação com data/hora/turno */
  var confirmHtml = '';
  if (c.status === 'aguardando') {
    var dispDesc = descricaoDisponibilidadeAluno(aluno);
    /* Determina faixa de horário a partir do turnoCurso do aluno */
    var faixaConfirm = turnoHoraConfig(turnoCurso);
    var minHora = faixaConfirm ? faixaConfirm.inicio : '';
    var maxHora = faixaConfirm ? faixaConfirm.fim    : '';
    /* Opções de turno — pré-seleciona o turno do curso do aluno */
    var turnoOpts = ['manhã','tarde','noite'].map(function(t) {
      var sel = (t === (turnoCurso || turnoAtendimento)) ? ' selected' : '';
      return '<option value="' + t + '"' + sel + '>' + (t.charAt(0).toUpperCase()+t.slice(1)) + '</option>';
    }).join('');
    confirmHtml = '<div style="background:var(--green-soft);border:1px solid var(--green-mid);border-radius:var(--r-sm);padding:13px 15px;margin-bottom:14px">'
      + '<div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--green-d);margin-bottom:10px">Definir data e horário para confirmar</div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">'
      + '<div><label class="form-label" style="font-size:11px">Data da Atendimento</label><input type="date" class="form-control" id="mc-data"></div>'
      + '<div><label class="form-label" style="font-size:11px">Turno</label>'
      + '<select class="form-control" id="mc-turno-confirm" onchange="verificarHorarioModal()">'
      + '<option value="">Selecione...</option>' + turnoOpts
      + '</select></div>'
      + '<div><label class="form-label" style="font-size:11px">Horário</label>'
      + '<input type="time" class="form-control" id="mc-hora"'
      + (minHora ? ' min="' + minHora + '" max="' + maxHora + '"' : '')
      + ' onchange="verificarHorarioModal()"></div>'
      + '</div>'
      + '<div id="mc-hora-hint" style="margin-top:8px;font-size:12px;color:var(--green-d)">' + escape(dispDesc) + '</div>'
      + '</div>';
  }

  mcBody.innerHTML =
    '<div style="background:var(--gray-50);border-radius:var(--r-sm);padding:12px 14px;margin-bottom:14px">'
    + '<div style="font-size:13px;font-weight:700;color:var(--senac-navy)">' + escape(aluno&&aluno.nome||'—') + '</div>'
    + '<div style="font-size:12px;color:var(--gray-500)">' + escape(aluno&&aluno.matricula||'') + ' · ' + escape(aluno&&aluno.curso||'') + ' · ' + escape(aluno&&aluno.turma||'') + '</div>'
    + '<div style="font-size:11px;color:var(--gray-400);margin-top:3px">Turno do curso: <strong>' + turnoLabel(aluno&&aluno.turnoCurso) + '</strong>' + (aluno&&aluno.pcd?' · PCD':'') + '</div>'
    + '</div>'
    + compatHtml
    + '<div class="detail-section"><div class="detail-label">Motivo</div><div class="detail-value">' + escape(c.motivoSolicitação) + '</div></div>'
    + '<div class="detail-grid">'
    + '<div class="detail-section"><div class="detail-label">Data Preferencial</div><div class="detail-value">' + escape(c.dataPreferencial||'—') + '</div></div>'
    + '<div class="detail-section"><div class="detail-label">Horário / Turno solicitado</div><div class="detail-value">' + escape(c.horarioPreferencial||'—') + ' · ' + turnoLabel(c.turno) + '</div></div>'
    + '</div>'
    + (c.obsResponsavel ? '<div class="detail-section"><div class="detail-label">Obs. do Responsável</div><div class="alert alert-info" style="margin:0;font-size:13px"><div>' + escape(c.obsResponsavel) + '</div></div></div>' : '')
    + '<div class="detail-section"><div class="detail-label">Status Atual</div>' + statusBadge(c.status) + '</div>'
    + confirmHtml;

  if (mcObs) mcObs.value = c.obsPsicologa || '';
  if (mcBtns) {
    var btns = '';
    if (c.status!=='confirmada') btns += '<button class="btn btn-confirm btn-sm" onclick="mudarStatusConfirmar(\'' + id + '\')">'  
      + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>Confirmar</button>';
    if (c.status!=='realizada')  btns += '<button class="btn btn-success btn-sm" onclick="mudarStatus(\'' + id + '\',\'realizada\')">'
      + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="20 6 9 17 4 12"/></svg>Realizada</button>';
    if (c.status!=='falta')      btns += '<button class="btn btn-miss btn-sm" onclick="mudarStatus(\'' + id + '\',\'falta\')">'
      + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>Não compareceu</button>';
    if (c.status!=='cancelada')  btns += '<button class="btn btn-danger btn-sm" onclick="mudarStatus(\'' + id + '\',\'cancelada\')">'
      + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>Cancelar</button>';
    mcBtns.innerHTML = btns;
  }
  openModal('modal-cons');
}

/* Verifica horário em tempo real no modal */
function verificarHorarioModal() {
  if (!_atendimentoSel) return;
  var store  = getStore();
  var c      = store.atendimentos.find(function(x){ return x.id===_atendimentoSel; });
  if (!c) return;
  var aluno  = getAluno(c.idAluno);
  var hora   = document.getElementById('mc-hora')         ? document.getElementById('mc-hora').value         : '';
  var turnoEl= document.getElementById('mc-turno-confirm');
  var turnoConf = turnoEl ? turnoEl.value : '';
  var hint   = document.getElementById('mc-hora-hint');
  var horaEl = document.getElementById('mc-hora');
  if (!hint || !aluno) return;

  /* Atualiza min/max do campo hora conforme turno selecionado */
  if (horaEl && turnoConf) {
    var faixa = turnoHoraConfig(turnoConf);
    if (faixa) {
      horaEl.min = faixa.inicio;
      horaEl.max = faixa.fim;
    }
  }

  if (!turnoConf) {
    hint.textContent = 'Selecione o turno da atendimento.';
    hint.style.color = 'var(--gray-500)';
    return;
  }
  if (!hora) {
    var faixaL = turnoHoraConfig(turnoConf);
    hint.textContent = faixaL
      ? 'Digite um horário entre ' + faixaL.inicio + ' e ' + faixaL.fim + '.'
      : 'Digite o horário da atendimento.';
    hint.style.color = 'var(--gray-500)';
    return;
  }
  /* Valida: turno escolhido deve ser compatível com o curso do aluno */
  var compat = getCompatibilidadeAtendimento(aluno, turnoConf, hora);
  if (compat.ok) {
    hint.innerHTML = '<span style="display:inline-flex;align-items:center;gap:6px"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>Horário compatível com o curso do aluno (' + turnoLabel(aluno.turnoCurso) + ').</span>';
    hint.style.color = 'var(--green-d)';
  } else {
    hint.innerHTML = '<span style="display:inline-flex;align-items:center;gap:6px"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>' + escape(compat.motivo) + '</span>';
    hint.style.color = '#c87f00';
  }
}

new MutationObserver(function(mutations) {
  var mudouTema = mutations.some(function(m){ return m.attributeName === 'data-theme'; });
  var dashboardAtivo = document.getElementById('panel-dashboard');
  if (mudouTema && dashboardAtivo && dashboardAtivo.classList.contains('active')) {
    setTimeout(function(){ renderGraficos(); }, 0);
  }
}).observe(document.documentElement, { attributes:true, attributeFilter:['data-theme'] });

function salvarAtendimento() {
  if (!_atendimentoSel) return;
  var obs = document.getElementById('mc-obs') ? document.getElementById('mc-obs').value : '';
  var store = getStore();
  var c = store.atendimentos.find(function(x){ return x.id===_atendimentoSel; });
  if (c) { c.obsPsicologa=obs; saveStore(store); }
  closeModal('modal-cons');
  toast('Observação salva!', 'success');
  renderDashboard(); renderAtendimentos();
}

function mudarStatus(id, novoStatus) {
  var obs = document.getElementById('mc-obs') ? document.getElementById('mc-obs').value : '';
  var store = getStore();
  var c = store.atendimentos.find(function(x){ return x.id===id; });
  if (!c) return;
  c.status = novoStatus;
  if (obs) c.obsPsicologa = obs;
  saveStore(store);
  closeModal('modal-cons');
  var labels = { confirmada:'Confirmada', realizada:'Realizada', falta:'Não compareceu', cancelada:'Cancelada' };
  toast('Status: ' + (labels[novoStatus]||novoStatus), 'success');
  renderDashboard(); renderAtendimentos(); renderAlunos(); updateBadge();
}

function mudarStatusConfirmar(id) {
  var data      = document.getElementById('mc-data')          ? document.getElementById('mc-data').value          : '';
  var hora      = document.getElementById('mc-hora')          ? document.getElementById('mc-hora').value          : '';
  var turnoConf = document.getElementById('mc-turno-confirm') ? document.getElementById('mc-turno-confirm').value : '';
  if (!data)      { toast('Informe a data da atendimento.',   'warning'); return; }
  if (!turnoConf) { toast('Selecione o turno da atendimento.', 'warning'); return; }
  if (!hora)      { toast('Informe o horário da atendimento.', 'warning'); return; }
  var obs   = document.getElementById('mc-obs') ? document.getElementById('mc-obs').value : '';
  var store = getStore();
  var c     = store.atendimentos.find(function(x){ return x.id===id; });
  if (!c) return;
  var aluno = getAluno(c.idAluno);
  /* Valida turno escolhido pelo psicólogo contra o turno do curso do aluno */
  var compat = getCompatibilidadeAtendimento(aluno, turnoConf, hora);
  if (!compat.ok) { toast(compat.motivo, 'warning'); return; }
  /* Persiste turno confirmado (pode ser diferente do turno solicitado originalmente) */
  c.status             = 'confirmada';
  c.dataPreferencial   = data;
  c.horarioPreferencial= hora;
  c.turno              = turnoConf;
  if (obs) c.obsPsicologa = obs;
  saveStore(store);
  closeModal('modal-cons');
  toast('Atendimento confirmada! ' + turnoLabel(turnoConf) + ' · ' + hora, 'success');
  renderDashboard(); renderAtendimentos(); renderAlunos(); updateBadge();
}

/* ── Aprovações ── */
function renderAprovacoes() {
  var store = getStore();
  var lista = store.alunos.filter(function(a){ return a.statusCadastro==='pendente'; });
  var tbody = document.getElementById('tbody-aprovacoes');
  if (!tbody) return;
  if (!lista.length) {
    tbody.innerHTML='<tr><td colspan="7" style="text-align:center;padding:44px;color:var(--gray-400)">'
      + '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" style="margin:0 auto 10px;display:block;opacity:.35"><polyline points="20 6 9 17 4 12"/></svg>'
      + 'Nenhum cadastro aguardando aprovação</td></tr>'; return;
  }
  tbody.innerHTML = lista.map(function(a){
    var idade = calcIdade(a.dataNascimento), menor = isMenor(a.dataNascimento);
    var qtdC  = store.atendimentos.filter(function(c){ return c.idAluno===a.id; }).length;
    var ultC  = store.atendimentos.filter(function(c){ return c.idAluno===a.id; }).sort(function(x,y){ return new Date(y.criacao)-new Date(x.criacao); })[0];
    var pcdBadge = a.pcd
      ? '<span style="display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:700;background:var(--senac-navy-soft);color:var(--senac-navy);padding:4px 10px;border-radius:20px;border:1px solid var(--senac-navy-light);white-space:nowrap">'
        + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:11px;height:11px"><polyline points="20 6 9 17 4 12"/></svg>Sim — PCD</span>'
      : '<span style="display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:600;background:var(--gray-50);color:var(--gray-400);padding:4px 10px;border-radius:20px;border:1px solid var(--gray-100);white-space:nowrap">'
        + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:11px;height:11px"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>Não</span>';
    var ageBadgeRow = menor
      ? '<span class="age-badge menor" style="display:inline-flex;align-items:center;gap:4px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:11px;height:11px"><circle cx="12" cy="5" r="3"/><path d="M8 10h8l1 7H7l1-7z"/></svg>Menor · '+idade+'a</span>'
      : '<span class="age-badge maior" style="display:inline-flex;align-items:center;gap:4px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:11px;height:11px"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>Maior · '+idade+'a</span>';
    return '<tr>'
      + '<td><div style="display:flex;align-items:center;gap:10px">'
      + '<div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,var(--senac-orange),var(--senac-navy));display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:#fff;flex-shrink:0">'+escape(a.nome.charAt(0))+'</div>'
      + '<div><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><div style="font-weight:700;font-size:13.5px">'+escape(a.nome)+'</div>'+ageBadgeRow+'</div>'
      + '<div style="font-size:11.5px;color:var(--gray-400);margin-top:1px">'+escape(a.email||'—')+'</div></div></div></td>'
      + '<td><code style="font-size:12.5px">'+escape(a.matricula)+'</code></td>'
      + '<td>'+escape(a.cpf||'—')+'</td>'
      + '<td><div style="font-weight:600;font-size:13px">'+escape(a.curso)+'</div>'
      + '<div style="font-size:11.5px;color:var(--gray-400);margin-top:2px">'+escape(a.turma)+' · <span style="font-weight:600;color:var(--senac-navy)">'+turnoLabel(a.turnoCurso)+'</span></div></td>'
      + '<td>'+(idade!==null?idade+' anos':'—')+'</td>'
      + '<td><div style="font-size:13px;font-weight:500">'+(a.telefone?escape(a.telefone):'—')+'</div>'
      + '<div style="font-size:11.5px;color:var(--gray-400);margin-top:1px">'+fmtDate(a.dataNascimento+'T12:00:00')+'</div></td>'
      + '<td style="text-align:center">'+pcdBadge+'</td>'
      + '<td style="text-align:center"><div style="display:flex;flex-direction:column;align-items:center;gap:3px">'
      + '<strong style="font-size:17px;line-height:1">'+qtdC+'</strong>'
      + (ultC?'<div>'+statusBadge(ultC.status)+'</div>':'<div style="font-size:11px;color:var(--gray-400)">nenhuma</div>')
      + '</div></td>'
      + '<td class="td-actions"><button class="btn btn-outline btn-sm" onclick="abrirModalAgendar(\'' + a.id + '\')">'
      + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>Agendar</button>'
      + '<button class="btn btn-outline btn-sm" onclick="verHistorico(\'' + a.id + '\',\'' + escape(a.nome.split(' ')[0]) + '\')">'
      + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>Histórico</button></td>'
      + '</tr>';
  }).join('');
}

function aprovarCadastro(id) {
  var store = getStore();
  var aluno = store.alunos.find(function(a){ return a.id===id; });
  if (!aluno) return;
  aluno.statusCadastro = 'aprovado';
  saveStore(store);
  toast('Cadastro de ' + aluno.nome.split(' ')[0] + ' aprovado!', 'success');
  renderAprovacoes(); renderDashboard(); updateBadge();
}

function rejeitarCadastro(id) {
  if (!confirm('Rejeitar este cadastro?')) return;
  var store = getStore();
  var aluno = store.alunos.find(function(a){ return a.id===id; });
  if (!aluno) return;
  aluno.statusCadastro = 'rejeitado';
  saveStore(store);
  toast('Cadastro de ' + aluno.nome.split(' ')[0] + ' rejeitado.', 'warning');
  renderAprovacoes(); renderDashboard(); updateBadge();
}

/* ── Alunos ── */
function renderAlunos() {
  var store    = getStore();
  var busca    = (document.getElementById('busca-pac') ? document.getElementById('busca-pac').value : '').toLowerCase();
  var aprovados = Permissions.getAlunosVisiveis(_sess, store.alunos);
  var lista    = aprovados.slice();
  if (_tabPac==='menores') lista = lista.filter(function(a){ return isMenor(a.dataNascimento); });
  if (_tabPac==='maiores') lista = lista.filter(function(a){ return !isMenor(a.dataNascimento); });
  if (_cursoPacFiltro!=='todos') lista = lista.filter(function(a){ return a.curso===_cursoPacFiltro; });
  if (busca) lista = lista.filter(function(a){ return a.nome.toLowerCase().indexOf(busca)>=0 || a.matricula.indexOf(busca)>=0; });

  var tcT=document.getElementById('tc-todos'), tcM=document.getElementById('tc-menores'), tcA=document.getElementById('tc-maiores');
  if (tcT) tcT.textContent = aprovados.length;
  if (tcM) tcM.textContent = aprovados.filter(function(a){ return isMenor(a.dataNascimento); }).length;
  if (tcA) tcA.textContent = aprovados.filter(function(a){ return !isMenor(a.dataNascimento); }).length;

  var cursos = aprovados.map(function(a){ return a.curso; }).filter(function(v,i,arr){ return arr.indexOf(v)===i; }).sort();
  var ctEl = document.getElementById('curso-tabs');
  if (ctEl) ctEl.innerHTML = '<button class="curso-btn ' + (_cursoPacFiltro==='todos'?'active':'') + '" onclick="setCursoPac(\'todos\')">'
    + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>Todos<span class="curso-count">'+cursos.length+'</span></button>'
    + cursos.map(function(c){ return '<button class="curso-btn ' + (_cursoPacFiltro===c?'active':'') + '" onclick="setCursoPac(\'' + escape(c) + '\')">'
        + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>'
        + escape(c) + '<span class="curso-count">' + aprovados.filter(function(a){ return a.curso===c; }).length + '</span></button>'; }).join('');

  var tbody = document.getElementById('tbody-alunos');
  if (!tbody) return;
  if (!lista.length) { tbody.innerHTML='<tr><td colspan="9" style="text-align:center;padding:44px;color:var(--gray-400)">Nenhum aluno encontrado</td></tr>'; return; }
  tbody.innerHTML = lista.map(function(a){
    var idade = calcIdade(a.dataNascimento), menor = isMenor(a.dataNascimento);
    var qtdC  = store.atendimentos.filter(function(c){ return c.idAluno===a.id; }).length;
    var ultC  = store.atendimentos.filter(function(c){ return c.idAluno===a.id; }).sort(function(x,y){ return new Date(y.criacao)-new Date(x.criacao); })[0];
    var pcdBadge = a.pcd
      ? '<span style="display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:700;background:var(--senac-navy-soft);color:var(--senac-navy);padding:4px 10px;border-radius:20px;border:1px solid var(--senac-navy-light);white-space:nowrap">'
        + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:11px;height:11px"><polyline points="20 6 9 17 4 12"/></svg>Sim — PCD</span>'
      : '<span style="display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:600;background:var(--gray-50);color:var(--gray-400);padding:4px 10px;border-radius:20px;border:1px solid var(--gray-100);white-space:nowrap">'
        + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:11px;height:11px"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>Não</span>';
    var ageBadgeRow = menor
      ? '<span class="age-badge menor" style="display:inline-flex;align-items:center;gap:4px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:11px;height:11px"><circle cx="12" cy="5" r="3"/><path d="M8 10h8l1 7H7l1-7z"/></svg>Menor · '+idade+'a</span>'
      : '<span class="age-badge maior" style="display:inline-flex;align-items:center;gap:4px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:11px;height:11px"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>Maior · '+idade+'a</span>';
    return '<tr>'
      + '<td><div style="display:flex;align-items:center;gap:10px">'
      + '<div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,var(--senac-orange),var(--senac-navy));display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:#fff;flex-shrink:0">'+escape(a.nome.charAt(0))+'</div>'
      + '<div><div style="font-weight:700;font-size:13.5px">'+escape(a.nome)+'</div>'
      + '<div style="font-size:11.5px;color:var(--gray-400);margin-top:1px">'+escape(a.email||'—')+'</div></div></div></td>'
      + '<td><code style="font-size:12.5px">'+escape(a.matricula)+'</code></td>'
      + '<td><div style="font-weight:600;font-size:13px">'+escape(a.curso)+'</div>'
      + '<div style="font-size:11.5px;color:var(--gray-400);margin-top:2px">'+escape(a.turma)+' · <span style="font-weight:600;color:var(--senac-navy)">'+turnoLabel(a.turnoCurso)+'</span></div></td>'
      + '<td>'+ageBadgeRow+'</td>'
      + '<td><div style="font-size:13px;font-weight:500">'+fmtDate(a.dataNascimento+'T12:00:00')+'</div>'
      + (a.telefone?'<div style="font-size:11.5px;color:var(--gray-400);margin-top:1px">'+escape(a.telefone)+'</div>':'')+'</td>'
      + '<td style="text-align:center">'+pcdBadge+'</td>'
      + '<td style="text-align:center"><div style="display:flex;flex-direction:column;align-items:center;gap:3px">'
      + '<strong style="font-size:17px;line-height:1">'+qtdC+'</strong>'
      + (ultC?'<div>'+statusBadge(ultC.status)+'</div>':'<div style="font-size:11px;color:var(--gray-400)">nenhuma</div>')
      + '</div></td>'
      + '<td class="td-actions"><button class="btn btn-outline btn-sm" onclick="verHistorico(\'' + a.id + '\',\'' + escape(a.nome.split(' ')[0]) + '\')">'
      + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>Histórico</button></td>'
      + '</tr>';
  }).join('');
}

function setTabPac(tab, el) {
  _tabPac = tab;
  document.querySelectorAll('.tab-btn').forEach(function(t){ t.classList.remove('active'); });
  if (el) el.classList.add('active');
  renderAlunos();
}
function setCursoPac(curso) { _cursoPacFiltro = curso; renderAlunos(); }

function verHistorico(idAluno, nome) {
  var store = getStore();
  var cons  = store.atendimentos.filter(function(c){ return c.idAluno===idAluno; }).sort(function(a,b){ return new Date(b.criacao)-new Date(a.criacao); });
  var tEl   = document.getElementById('mh-title'), bEl = document.getElementById('mh-body');
  if (tEl) tEl.textContent = 'Histórico — ' + nome;
  if (!bEl) return;
  bEl.innerHTML = '<p style="font-size:13px;color:var(--gray-500);margin-bottom:16px">'+cons.length+' atendimento(s)</p>'
    + (!cons.length ? '<div class="empty-state" style="padding:24px"><div class="empty-state-title">Nenhuma atendimento</div></div>'
      : cons.map(function(c){
          return '<div style="border:1.5px solid var(--gray-100);border-radius:var(--r-sm);padding:13px 15px;margin-bottom:10px">'
            + '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:6px">'
            + '<strong style="font-size:13.5px">'+escape(c.motivoSolicitação.length>55?c.motivoSolicitação.slice(0,55)+'…':c.motivoSolicitação)+'</strong>'
            + statusBadge(c.status)+'</div>'
            + '<div style="font-size:12px;color:var(--gray-400)">'+escape(c.dataPreferencial||'—')+' · '+turnoLabel(c.turno)+' · '+fmtDate(c.criacao)+'</div>'
            + (c.obsPsicologa?'<div class="ci-obs" style="margin-top:7px">'+escape(c.obsPsicologa)+'</div>':'')
            + '</div>';
        }).join(''));
  openModal('modal-hist');
}


function agendarAlunoDireto(idAluno) {
  var store = getStore();
  var aluno = store.alunos.find(function(a){ return a.id===idAluno && a.unidadeId===_sess.unidadeId; });
  if (!aluno) { toast('Aluno não encontrado para esta unidade.', 'warning'); return; }
  var nova = {
    id: genId('c'),
    idAluno: idAluno,
    motivoSolicitação: 'Sessão agendada diretamente pela psicóloga.',
    obsResponsavel: '',
    dataPreferencial: new Date().toISOString().slice(0,10),
    horarioPreferencial: '',
    turno: Validators.normalizeTurno(aluno.turnoCurso) || '',
    agendadoPor: _sess.id,
    unidadeId: _sess.unidadeId,
    status: 'aguardando',
    obsPsicologa: '',
    criacao: new Date().toISOString()
  };
  store.atendimentos.push(nova);
  saveStore(store);
  renderDashboard(); renderAtendimentos(); renderAlunos(); renderCalendario(); updateBadge();
  abrirModalAtendimento(nova.id);
}

/* ── Chat ── */
function renderChatTabs() {
  var store  = getStore();
  var tabsEl = document.getElementById('chat-tabs');
  if (!tabsEl) return;
  var contatos = store.instrutores.concat(store.coordenadores).filter(function(u){return u.unidadeId===_sess.unidadeId;});
  tabsEl.innerHTML = contatos.map(function(u){
    return '<button class="chat-tab' + (_chatPara===u.id?' active':'') + '" id="sbtn-' + u.id + '" onclick="selecionarChat(\'' + u.id + '\')">' + escape(u.nome.split(' ')[0]) + '</button>';
  }).join('');
  if (!_chatPara && contatos.length) selecionarChat(contatos[0].id);
  else if (_chatPara) renderChatMsgs(_chatPara);
}

function selecionarChat(uid) {
  _chatPara = uid;
  document.querySelectorAll('.chat-tab').forEach(function(t){ t.classList.remove('active'); });
  var btn = document.getElementById('sbtn-'+uid); if (btn) btn.classList.add('active');
  renderChatMsgs(uid);
}

function renderChatMsgs(uid) {
  var store  = getStore();
  var psicId = _sess.id; /* CORREÇÃO: usa ID individual da sessão */
  var msgs   = store.mensagens.filter(function(m){
    return (m.de===psicId&&m.para===uid)||(m.de===uid&&m.para===psicId);
  }).sort(function(a,b){ return new Date(a.criacao)-new Date(b.criacao); });
  var bodyEl = document.getElementById('chat-body');
  if (!bodyEl) return;
  if (!msgs.length) { bodyEl.innerHTML='<div class="chat-empty-msg">Nenhuma mensagem com este contato.</div>'; return; }
  bodyEl.innerHTML = '<div class="chat-messages-area">'
    + msgs.map(function(m){
        return '<div class="chat-msg '+(m.de===psicId?'sent':'recv')+'">'
          + '<div class="chat-bubble">'+escape(m.texto)+'</div>'
          + '<div class="chat-meta">'+fmtDatetime(m.criacao)+'</div></div>';
      }).join('') + '</div>';
  var area = bodyEl.querySelector('.chat-messages-area');
  if (area) area.scrollTop = area.scrollHeight;
}

function enviarMsgPsi() {
  var input = document.getElementById('chat-txt');
  var texto = input ? input.value.trim() : '';
  if (!texto || !_chatPara) { toast('Selecione um contato e escreva a mensagem.','warning'); return; }
  var store = getStore();
  /* CORREÇÃO CHAT: usa _sess.id (ID individual da psicóloga logada) */
  store.mensagens.push({ id:genId('m'), de:_sess.id, para:_chatPara, unidadeId:_sess.unidadeId, texto:texto, criacao:new Date().toISOString() });
  saveStore(store);
  if (input) input.value='';
  renderChatMsgs(_chatPara);
}

document.addEventListener('keydown', function(e){
  if (e.key==='Enter' && document.activeElement && document.activeElement.id==='chat-txt') enviarMsgPsi();
});


/* ── Calendário ── */
var _calView = 'mes';
var _calDate = new Date();

function setCalView(v, el) {
  _calView = v;
  document.querySelectorAll('#panel-calendario .tab-btn').forEach(function(b){ b.classList.remove('active'); });
  if (el) el.classList.add('active');
  renderCalendario();
}
function calNavPrev() {
  if (_calView==='mes') { _calDate.setMonth(_calDate.getMonth()-1); }
  else if (_calView==='semana') { _calDate.setDate(_calDate.getDate()-7); }
  else { _calDate.setDate(_calDate.getDate()-1); }
  renderCalendario();
}
function calNavNext() {
  if (_calView==='mes') { _calDate.setMonth(_calDate.getMonth()+1); }
  else if (_calView==='semana') { _calDate.setDate(_calDate.getDate()+7); }
  else { _calDate.setDate(_calDate.getDate()+1); }
  renderCalendario();
}
function calHoje() { _calDate = new Date(); renderCalendario(); }

function renderCalendario() {
  var store = getStore();
  var atendimentos = store.atendimentos.filter(function(c){ return c.unidadeId===_sess.unidadeId && ['confirmada','realizada','falta','aguardando'].indexOf(c.status)>=0; }).sort(function(a,b){
    var da = (a.dataPreferencial||'') + ' ' + (a.horarioPreferencial||'');
    var db = (b.dataPreferencial||'') + ' ' + (b.horarioPreferencial||'');
    return da.localeCompare(db);
  });
  var tit = document.getElementById('cal-titulo');
  var cont = document.getElementById('cal-container');
  if (!cont) return;
  var meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  var dias = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  var hojeIso = new Date().toISOString().slice(0,10);

  function atendimentoCard(c, compact) {
    var a = getAluno(c.idAluno);
    var nome = escape(a&&a.nome||'—');
    var primeiroNome = escape(a ? a.nome.split(' ')[0] : '—');
    var hora = escape(c.horarioPreferencial||'--:--');
    var motivo = escape((c.motivoSolicitação||'Sem motivo informado').slice(0, compact ? 30 : 80) + ((c.motivoSolicitação||'').length > (compact ? 30 : 80) ? '…' : ''));
    var tipoAtend = c.tipoAtendimento || '';
    var isRemoto = (tipoAtend === 'remoto' || c.turno === 'remoto');
    var turnoCurso = a ? Validators.normalizeTurno(a.turnoCurso) : '';
    var isForaHorario = !isRemoto && (tipoAtend === 'fora' || (turnoCurso && Validators.normalizeTurno(c.turno) && turnoCurso !== Validators.normalizeTurno(c.turno)));
    /* Cor de borda: azul para remoto (prioridade), amarelo para fora do horário, senão status */
    var borderColor = isRemoto ? '#3b82f6' : isForaHorario ? '#f5c518' : (c.status==='confirmada'?'#1e8449':c.status==='realizada'?'#154360':c.status==='falta'?'#c0392b':'#c87f00');
    var bgCard = isRemoto ? 'rgba(37,99,235,0.06)' : isForaHorario ? 'rgba(247,163,0,0.06)' : '';
    var tipoLabel = isRemoto ? '📱 Remoto' : isForaHorario ? '⚠️ Fora do horário' : turnoLabel(c.turno);
    var telSpan = isRemoto && a && a.telefone ? '<span style="font-size:10px;color:#1d4ed8;font-weight:600">📞 '+escape(a.telefone)+'</span>' : '';
    if (compact) {
      return '<button class="cal-event-pill" onclick="abrirModalAtendimento(\'' + c.id + '\')" style="border-left:3px solid '+borderColor+';'+(bgCard?'background:'+bgCard:'')+'">'
        + '<strong>' + hora + ' · ' + primeiroNome + '</strong>'
        + '<span>' + escape(tipoLabel) + ' · ' + statusBadge(c.status) + '</span></button>';
    }
    return '<div class="cal-day-event" onclick="abrirModalAtendimento(\'' + c.id + '\')" style="'+(bgCard?'background:'+bgCard+';':'')+'">'
      + '<div class="cal-day-time" style="border-left:3px solid '+borderColor+';padding-left:8px"><strong>' + hora + '</strong><span>' + escape(tipoLabel) + '</span></div>'
      + '<div class="cal-day-body"><h4>' + nome + '</h4><p>' + motivo + '</p>'+telSpan+'<div>' + statusBadge(c.status) + '</div>'
      + '<div class="cal-day-meta"><span>Data: ' + fmtDate(c.dataPreferencial) + '</span><span>Agendado por: ' + escape(nomeResponsavel(c.agendadoPor)) + '</span></div></div></div>';
  }

  if (_calView==='mes') {
    if (tit) tit.textContent = meses[_calDate.getMonth()] + ' ' + _calDate.getFullYear();
    var ano = _calDate.getFullYear(), mes = _calDate.getMonth();
    var primeiro = new Date(ano, mes, 1).getDay();
    var totalDias = new Date(ano, mes+1, 0).getDate();
    var html = '<div class="cal-grid-month">';
    dias.forEach(function(d){ html += '<div class="cal-weekday">'+d+'</div>'; });
    for (var i=0;i<primeiro;i++) html += '<div></div>';
    for (var d=1;d<=totalDias;d++) {
      var dt = new Date(ano,mes,d);
      var iso = dt.toISOString().slice(0,10);
      var cons = atendimentos.filter(function(c){ return c.dataPreferencial===iso; });
      var isHoje = iso===hojeIso;
      html += '<div class="cal-day-card'+(isHoje?' today':'')+'">';
      html += '<div class="cal-day-head"><div class="cal-day-number" onclick="calDiaClick(\''+iso+'\')" style="cursor:pointer" title="Ver dia">'+d+'</div><div class="cal-day-count">'+cons.length+' sessão(ões)</div></div>';
      html += '<div class="cal-events-list">';
      if (!cons.length) html += '<div style="font-size:11px;color:var(--gray-300);padding:6px 2px">Nenhum atendimento</div>';
      cons.forEach(function(c){ html += atendimentoCard(c, true); });
      html += '</div></div>';
    }
    html += '</div>';
    cont.innerHTML = html;

  } else if (_calView==='semana') {
    var dow = _calDate.getDay();
    var inicio = new Date(_calDate); inicio.setDate(_calDate.getDate()-dow);
    if (tit) {
      var fim = new Date(inicio); fim.setDate(inicio.getDate()+6);
      tit.textContent = inicio.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'}) + ' — ' + fim.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'});
    }
    var html = '<div class="cal-week-grid">';
    for (var i=0;i<7;i++) {
      var dt = new Date(inicio); dt.setDate(inicio.getDate()+i);
      var iso = dt.toISOString().slice(0,10);
      var cons = atendimentos.filter(function(c){ return c.dataPreferencial===iso; });
      var isHoje2 = iso===hojeIso;
      html += '<div class="cal-week-col'+(isHoje2?' today':'')+'">';
      html += '<div class="cal-week-head"><div style="font-size:11px;font-weight:800;color:var(--gray-400)">'+dias[dt.getDay()]+'</div>';
      html += '<div style="font-size:20px;font-weight:800;color:var(--ink)">'+dt.getDate()+'</div>';
      html += '<div style="font-size:11px;color:var(--gray-400)">'+cons.length+' sessão(ões)</div></div>';
      html += '<div class="cal-week-body">';
      if (!cons.length) html += '<div style="font-size:11px;color:var(--gray-300);text-align:center;padding:16px 0">Nenhum atendimento</div>';
      cons.forEach(function(c){
        var a = getAluno(c.idAluno);
        var tipoAtend = c.tipoAtendimento || '';
        var isRemotoW = (tipoAtend === 'remoto' || c.turno === 'remoto');
        var tcW = a ? Validators.normalizeTurno(a.turnoCurso) : '';
        var isForaW = !isRemotoW && (tipoAtend === 'fora' || (tcW && Validators.normalizeTurno(c.turno) && tcW !== Validators.normalizeTurno(c.turno)));
        var bColorW = isRemotoW ? '#3b82f6' : isForaW ? '#f5c518' : (c.status==='confirmada'?'#1e8449':c.status==='realizada'?'#154360':c.status==='falta'?'#c0392b':'#c87f00');
        var bgW2 = isRemotoW ? 'background:rgba(37,99,235,0.07);' : isForaW ? 'background:rgba(247,163,0,0.07);' : '';
        var tLabW = isRemotoW ? '📱 Remoto' : isForaW ? '⚠️ Fora horário' : turnoLabel(c.turno);
        html += '<div class="cal-week-event" onclick="abrirModalAtendimento(\'' + c.id + '\')" style="'+bgW2+'border-left:3px solid '+bColorW+'">';
        html += '<div class="cal-week-event-time" style="font-weight:800;color:'+bColorW+'">'+(c.horarioPreferencial||'--:--')+'</div>';
        html += '<div class="cal-week-event-name" style="font-weight:700">'+escape(a&&a.nome||'—')+'</div>';
        html += '<div style="font-size:10px;color:'+(isRemotoW?'#1d4ed8':isForaW?'#c87f00':'var(--gray-400)')+';margin-top:2px">'+escape(tLabW)+'</div>';
        html += '</div>';
      });
    }
    html += '</div>';
    cont.innerHTML = html;

  } else {
    var iso = _calDate.toISOString().slice(0,10);
    if (tit) tit.textContent = _calDate.toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});
    var cons = atendimentos.filter(function(c){ return c.dataPreferencial===iso; });
    var html = '<div class="cal-day-agenda">';
    if (!cons.length) {
      html += '<div class="cal-day-empty"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" style="margin:0 auto 10px;display:block;opacity:.3"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>Nenhuma atendimento neste dia'
        + '<div style="margin-top:14px"><button class="btn btn-orange btn-sm" onclick="abrirModalAgendar(null,\''+iso+'\')">'
        + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:13px;height:13px"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>'
        + 'Agendar para este dia</button></div></div>';
    } else {
      cons.forEach(function(c){ html += atendimentoCard(c, false); });
    }
    html += '</div>';
    cont.innerHTML = html;
  }
}

function calDiaClick(iso) {
  _calDate = new Date(iso+'T12:00:00');
  setCalView('dia', document.getElementById('cal-btn-dia'));
}


/* ── Modal Novo Agendamento ── */
var _magAlunoId = null;

function abrirModalAgendar(idAluno, dataPreSel) {
  var store = getStore();
  var alunos = Permissions.getAlunosVisiveis(_sess, store.alunos);
  var sel = document.getElementById('mag-aluno-sel');
  if (sel) {
    sel.innerHTML = '<option value="">Selecione o aluno...</option>'
      + alunos.map(function(a){ return '<option value="'+a.id+'">'+ a.nome +' — '+ a.matricula +'</option>'; }).join('');
  }
  _magAlunoId = null;
  var infoEl = document.getElementById('mag-aluno-info');
  if (infoEl) infoEl.style.display = 'none';
  var wrapEl = document.getElementById('mag-select-wrap');
  if (wrapEl) wrapEl.style.display = '';

  // Se já veio com aluno pré-selecionado
  if (idAluno) {
    if (sel) sel.value = idAluno;
    magSelecionarAluno();
  } else {
    _magAlunoId = null;
  }

  // Preenche a data atual no campo de data
  var dataEl = document.getElementById('mag-data');
  if (dataEl) dataEl.value = dataPreSel || new Date().toISOString().slice(0,10);

  // Limpa campos
  var motivoEl = document.getElementById('mag-motivo');
  if (motivoEl) motivoEl.value = '';
  var horaEl = document.getElementById('mag-hora');
  if (horaEl) horaEl.value = '';
  var turnoEl = document.getElementById('mag-turno');
  if (turnoEl) turnoEl.value = '';
  var tipoEl = document.getElementById('mag-tipo');
  if (tipoEl) tipoEl.value = '';
  var tipoInfoEl = document.getElementById('mag-tipo-info');
  if (tipoInfoEl) tipoInfoEl.style.display = 'none';

  openModal('modal-agendar');
}

function magSelecionarAluno() {
  var sel = document.getElementById('mag-aluno-sel');
  if (!sel || !sel.value) { _magAlunoId = null; return; }
  _magAlunoId = sel.value;
  var store = getStore();
  var a = store.alunos.find(function(x){ return x.id === _magAlunoId; });
  var infoEl = document.getElementById('mag-aluno-info');
  var nomeEl = document.getElementById('mag-aluno-nome');
  var detalheEl = document.getElementById('mag-aluno-detalhe');
  if (a && infoEl) {
    infoEl.style.display = '';
    if (nomeEl) nomeEl.textContent = a.nome;
    if (detalheEl) detalheEl.textContent = a.matricula + ' · ' + a.curso + ' · ' + turnoLabel(a.turnoCurso)
      + (a.telefone ? ' · 📞 ' + a.telefone : '');
    // Pré-seleciona o turno do aluno
    var turnoEl = document.getElementById('mag-turno');
    if (turnoEl && a.turnoCurso) {
      var t = Validators.normalizeTurno(a.turnoCurso);
      if (t) turnoEl.value = t;
    }
  }
  magAtualizarTipo();
}

function magAtualizarTipo() {
  var tipoEl = document.getElementById('mag-tipo');
  var infoEl = document.getElementById('mag-tipo-info');
  var turnoEl = document.getElementById('mag-turno');
  if (!tipoEl || !infoEl) return;
  var tipo = tipoEl.value;
  var store = getStore();
  var a = _magAlunoId ? store.alunos.find(function(x){ return x.id===_magAlunoId; }) : null;
  var tc = a ? Validators.normalizeTurno(a.turnoCurso) : '';
  if (!tipo) { infoEl.style.display='none'; return; }
  if (tipo==='remoto') {
    infoEl.style.display='';
    infoEl.style.background='#eff6ff';
    infoEl.style.border='1px solid #93c5fd';
    infoEl.style.color='#1d4ed8';
    var tel = a && a.telefone ? ' Contato do aluno: <strong>'+escape(a.telefone)+'</strong>' : ' (telefone não cadastrado)';
    infoEl.innerHTML = '📱 <strong>Atendimento Remoto</strong> — O psicólogo deve entrar em contato com o aluno para realizar a sessão.'+tel;
  } else if (tipo==='fora') {
    infoEl.style.display='';
    infoEl.style.background='#fefce8';
    infoEl.style.border='1px solid #fde047';
    infoEl.style.color='#854d0e';
    infoEl.innerHTML = '⚠️ <strong>Fora do horário do curso</strong> — Este atendimento será sinalizado como fora do turno do aluno'+(tc?' ('+turnoLabel(tc)+')':'')+'.'
  } else {
    infoEl.style.display='';
    infoEl.style.background='#f0fdf4';
    infoEl.style.border='1px solid #86efac';
    infoEl.style.color='#166534';
    infoEl.innerHTML = '✅ <strong>Dentro do horário do curso</strong>'+(tc?' — Turno: '+turnoLabel(tc):'')+'.'
    if (tc && turnoEl) turnoEl.value = tc;
  }
}

function confirmarNovoAgendamento() {
  if (!_magAlunoId) { toast('Selecione um aluno.', 'warning'); return; }
  var dataEl   = document.getElementById('mag-data');
  var turnoEl  = document.getElementById('mag-turno');
  var horaEl   = document.getElementById('mag-hora');
  var motivoEl = document.getElementById('mag-motivo');
  var tipoEl   = document.getElementById('mag-tipo');
  var data     = dataEl   ? dataEl.value.trim()   : '';
  var turno    = turnoEl  ? turnoEl.value.trim()  : '';
  var hora     = horaEl   ? horaEl.value.trim()   : '';
  var motivo   = motivoEl ? motivoEl.value.trim() : '';
  var tipo     = tipoEl   ? tipoEl.value.trim()   : '';
  if (!data)   { toast('Informe a data da sessão.', 'warning'); return; }
  if (!tipo)   { toast('Selecione o tipo de atendimento.', 'warning'); return; }
  if (tipo!=='remoto' && !turno)  { toast('Selecione o turno.', 'warning'); return; }
  if (!hora)   { toast('Informe o horário da sessão.', 'warning'); return; }
  if (!motivo) { toast('Informe o motivo ou observação.', 'warning'); return; }

  var store = getStore();
  var nova = {
    id: genId('c'),
    idAluno: _magAlunoId,
    motivoSolicitação: motivo,
    obsResponsavel: '',
    dataPreferencial: data,
    horarioPreferencial: hora,
    turno: tipo==='remoto' ? 'remoto' : turno,
    tipoAtendimento: tipo,
    agendadoPor: _sess.id,
    unidadeId: _sess.unidadeId,
    status: 'confirmada',
    obsPsicologa: '',
    criacao: new Date().toISOString()
  };
  store.atendimentos.push(nova);
  saveStore(store);

  var a = store.alunos.find(function(x){ return x.id === _magAlunoId; });
  toast('Sessão de ' + (a ? a.nome.split(' ')[0] : 'aluno') + ' agendada para ' + data.split('-').reverse().join('/') + ' às ' + hora + '!', 'success');
  closeModal('modal-agendar');
  renderDashboard(); renderAtendimentos(); renderAlunos(); renderCalendario(); updateBadge();
}

/* Inicializa */
renderDashboard();
updateBadge();
/* ── Gráficos Dashboard ── */
function renderGraficos(alunos) {
  var store = getStore();
  if (!alunos) alunos = store.alunos.filter(function(a){ return a.unidadeId===_sess.unidadeId && a.statusCadastro==='ativo'; });
  var cores = ['#2d7ff9','#f97316','#10b981','#8b5cf6','#ef4444','#f59e0b','#06b6d4','#ec4899','#84cc16','#6366f1'];
  var cursosMap = {};
  alunos.forEach(function(a){ var c=a.curso||'Sem curso'; cursosMap[c]=(cursosMap[c]||0)+1; });
  var cursos = Object.keys(cursosMap).sort(function(a,b){ return cursosMap[b]-cursosMap[a] || a.localeCompare(b); });
  var total = alunos.length;
  function hexToRgb(hex) {
    hex = (hex || '').replace('#','');
    if (hex.length === 3) hex = hex.split('').map(function(x){ return x+x; }).join('');
    var n = parseInt(hex, 16);
    return { r:(n>>16)&255, g:(n>>8)&255, b:n&255 };
  }
  function lighten(hex, amt) {
    var c = hexToRgb(hex);
    var r = Math.min(255, Math.round(c.r + (255-c.r)*amt));
    var g = Math.min(255, Math.round(c.g + (255-c.g)*amt));
    var b = Math.min(255, Math.round(c.b + (255-c.b)*amt));
    return 'rgb('+r+','+g+','+b+')';
  }
  var canvas = document.getElementById('chart-pizza');
  if (canvas && canvas.getContext) {
    var style = getComputedStyle(document.documentElement);
    function cssVar(name, fallback) { return (style.getPropertyValue(name) || fallback).trim() || fallback; }
    function drawArc(ctx, cx, cy, radius, start, end, color, width, active) {
      var grad = ctx.createLinearGradient(cx-radius, cy-radius, cx+radius, cy+radius);
      grad.addColorStop(0, lighten(color, active ? .34 : .24));
      grad.addColorStop(.55, color);
      grad.addColorStop(1, color);
      ctx.beginPath();
      ctx.arc(cx, cy, radius, start, end);
      ctx.strokeStyle = grad;
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    var box = canvas.getBoundingClientRect();
    var dpr = window.devicePixelRatio || 1;
    var size = Math.round(Math.min(box.width || 300, box.height || 300));
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    var ctx=canvas.getContext('2d');
    ctx.setTransform(dpr,0,0,dpr,0,0);

    var W=size, H=size, cx=W/2, cy=H/2, radius=Math.min(cx,cy)-42, ring=34;
    var surface = cssVar('--white', '#ffffff');
    var ink = cssVar('--ink', '#0f172a');
    var muted = cssVar('--gray-400', '#94a3b8');
    var track = cssVar('--gray-100', '#eef2f7');
    var tip = document.getElementById('chart-pizza-tooltip');
    var segments = [];

    ctx.clearRect(0,0,W,H);
    ctx.save();
    ctx.shadowColor = 'rgba(15,23,42,.20)';
    ctx.shadowBlur = 28;
    ctx.shadowOffsetY = 14;
    ctx.beginPath();
    ctx.arc(cx, cy, radius+ring/2+9, 0, Math.PI*2);
    ctx.fillStyle = surface;
    ctx.fill();
    ctx.restore();

    var halo = ctx.createRadialGradient(cx, cy, radius-ring, cx, cy, radius+ring);
    halo.addColorStop(0, 'rgba(247,163,0,0)');
    halo.addColorStop(1, 'rgba(247,163,0,.08)');
    ctx.beginPath();
    ctx.arc(cx, cy, radius+ring/2+10, 0, Math.PI*2);
    ctx.fillStyle = halo;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI*2);
    ctx.strokeStyle = track;
    ctx.lineWidth = ring;
    ctx.lineCap = 'round';
    ctx.stroke();

    if (!total) {
      ctx.beginPath();
      ctx.arc(cx, cy, radius, -Math.PI/2, Math.PI*1.5);
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = ring;
      ctx.stroke();
      ctx.fillStyle = muted;
      ctx.font = '700 13px "DM Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Sem dados', cx, cy);
    } else {
      var gap = Math.PI / 90;
      var ang = -Math.PI/2;
      segments = [];
      cursos.forEach(function(nome,i){
        var frac = cursosMap[nome] / total;
        var sweep = frac * Math.PI * 2;
        var start = ang + gap/2;
        var end = ang + sweep - gap/2;
        if (end < start) end = start + Math.max(sweep * .7, .018);
        segments.push({ nome:nome, valor:cursosMap[nome], frac:frac, start:start, end:end, color:cores[i%cores.length] });

        ctx.save();
        ctx.shadowColor = cores[i%cores.length] + '66';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetY = 2;
        drawArc(ctx, cx, cy, radius, start, end, cores[i%cores.length], ring, false);
        ctx.restore();

        if (frac >= .10) {
          var mid = start + (end-start)/2;
          var lx = cx + Math.cos(mid) * (radius + ring*.78);
          var ly = cy + Math.sin(mid) * (radius + ring*.78);
          ctx.beginPath();
          ctx.arc(lx, ly, 15, 0, Math.PI*2);
          ctx.fillStyle = surface;
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = cores[i%cores.length];
          ctx.stroke();
          ctx.fillStyle = ink;
          ctx.font = '900 10px "DM Sans", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(Math.round(frac*100)+'%', lx, ly);
        }
        ang += sweep;
      });

      ctx.beginPath();
      ctx.arc(cx, cy, radius-ring*.68, 0, Math.PI*2);
      ctx.fillStyle = surface;
      ctx.fill();
      ctx.fillStyle = ink;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '900 38px "DM Sans", sans-serif';
      ctx.fillText(total, cx, cy-11);
      ctx.font = '900 10.5px "DM Sans", sans-serif';
      ctx.fillStyle = muted;
      ctx.fillText(total === 1 ? 'ALUNO ATIVO' : 'ALUNOS ATIVOS', cx, cy+19);
    }
    canvas._pizzaHit = { segments: segments, radius: radius, ring: ring, size: size };
    if (!canvas._pizzaBound) {
      canvas._pizzaBound = true;
      canvas.addEventListener('mousemove', function(e){
        var hit = canvas._pizzaHit;
        if (!hit) return;
        var rect = canvas.getBoundingClientRect();
        var x = e.clientX - rect.left, y = e.clientY - rect.top;
        var dx = x - rect.width/2, dy = y - rect.height/2;
        var dist = Math.sqrt(dx*dx + dy*dy) * (hit.size / rect.width);
        var angle = Math.atan2(dy, dx);
        if (angle < -Math.PI/2) angle += Math.PI*2;
        var active = -1;
        hit.segments.forEach(function(s,i){
          var a = angle;
          if (a < s.start) a += Math.PI*2;
          if (dist >= hit.radius-hit.ring*.78 && dist <= hit.radius+hit.ring*.9 && a >= s.start && a <= s.end) active = i;
        });
        document.querySelectorAll('.pizza-legend-item').forEach(function(el){
          el.classList.toggle('active', Number(el.getAttribute('data-i')) === active);
        });
        if (tip && active >= 0 && hit.segments[active]) {
          var s = hit.segments[active];
          tip.innerHTML = '<strong>'+escape(s.nome)+'</strong><span>'+s.valor+' aluno'+(s.valor!==1?'s':'')+' · '+Math.round(s.frac*100)+'%</span>';
          tip.style.left = x + 'px';
          tip.style.top = y + 'px';
          tip.style.display = 'block';
        } else if (tip) {
          tip.style.display = 'none';
        }
      });
      canvas.addEventListener('mouseleave', function(){
        if (tip) tip.style.display = 'none';
        document.querySelectorAll('.pizza-legend-item').forEach(function(el){ el.classList.remove('active'); });
      });
    }
  }
  var summary = document.getElementById('chart-pizza-summary');
  if (summary) {
    if (cursos.length && total) {
      var top = cursos[0], topN = cursosMap[top], topPct = Math.round(topN/total*100);
      summary.innerHTML = '<div class="pizza-summary-kicker">Maior concentraÃ§Ã£o</div>'
        + '<div class="pizza-summary-title">' + escape(top) + '</div>'
        + '<div class="pizza-summary-meta">' + topN + ' aluno' + (topN!==1?'s':'') + ' · ' + topPct + '% da base ativa</div>';
    } else {
      summary.innerHTML = '<div class="pizza-summary-kicker">DistribuiÃ§Ã£o</div>'
        + '<div class="pizza-summary-title">Sem dados para exibir</div>'
        + '<div class="pizza-summary-meta">Cadastre alunos ativos para popular o grÃ¡fico.</div>';
    }
  }
  var leg=document.getElementById('chart-pizza-legend');
  if (leg) {
    leg.innerHTML = cursos.length ? cursos.map(function(nome,i){
      var n=cursosMap[nome], pct=total?Math.round(n/total*100):0;
      return '<div class="pizza-legend-item" data-i="'+i+'">'
        +'<div class="pizza-legend-swatch" style="background:linear-gradient(180deg,'+lighten(cores[i%cores.length],.22)+','+cores[i%cores.length]+')"></div>'
        +'<div style="min-width:0"><div class="pizza-legend-name">'+escape(nome)+'</div>'
        +'<div class="pizza-legend-meta">'+n+' aluno'+(n!==1?'s':'')+'</div>'
        +'<div class="pizza-legend-track"><div class="pizza-legend-fill" style="--pct:'+pct+'%;--c:'+cores[i%cores.length]+'"></div></div></div>'
        +'<div class="pizza-legend-value">'+pct+'%<span class="pizza-legend-pct">'+n+'/'+total+'</span></div>'
        +'</div>';
    }).join('') : '<div class="pizza-legend-item"><div class="pizza-legend-swatch" style="background:#cbd5e1"></div><div><div class="pizza-legend-name">Sem cursos ativos</div><div class="pizza-legend-meta">Cadastre alunos ativos para visualizar a distribuição.</div></div><div class="pizza-legend-value">0%</div></div>';
  }
  var idadesMap={};
  alunos.forEach(function(a){ var id=calcIdade(a.dataNascimento); if(id!==null) idadesMap[id]=(idadesMap[id]||0)+1; });
  var idades=Object.keys(idadesMap).map(Number).sort(function(a,b){return a-b;});
  var canvas2=document.getElementById('chart-linha');
  if (canvas2 && canvas2.getContext) {
    canvas2.width=canvas2.offsetWidth||460; canvas2.height=240;
    var ctx2=canvas2.getContext('2d');
    var PL=44,PR=16,PT=16,PB=36,W2=canvas2.width,H2=canvas2.height;
    ctx2.clearRect(0,0,W2,H2);
    if (!idades.length) {
      ctx2.fillStyle='#94a3b8'; ctx2.font='13px sans-serif'; ctx2.textAlign='center';
      ctx2.fillText('Nenhum dado de idade cadastrado', W2/2, H2/2); return;
    }
    var vals=idades.map(function(id){return idadesMap[id];}), maxV=Math.max.apply(null,vals)||1;
    var xStep=idades.length>1?(W2-PL-PR)/(idades.length-1):0;
    function px(i){return PL+i*xStep;} function py(v){return PT+(H2-PT-PB)*(1-v/maxV);}
    ctx2.strokeStyle='rgba(100,116,139,0.12)'; ctx2.lineWidth=1;
    for(var g=0;g<=4;g++){
      var gy=PT+(H2-PT-PB)*g/4;
      ctx2.beginPath(); ctx2.moveTo(PL,gy); ctx2.lineTo(W2-PR,gy); ctx2.stroke();
      ctx2.fillStyle='#94a3b8'; ctx2.font='10px sans-serif'; ctx2.textAlign='right';
      ctx2.fillText(Math.round(maxV*(1-g/4)),PL-5,gy+3);
    }
    ctx2.beginPath(); ctx2.moveTo(px(0),py(vals[0]));
    vals.forEach(function(v,i){if(i>0)ctx2.lineTo(px(i),py(v));});
    ctx2.lineTo(px(vals.length-1),H2-PB); ctx2.lineTo(px(0),H2-PB); ctx2.closePath();
    ctx2.fillStyle='rgba(45,127,249,0.1)'; ctx2.fill();
    ctx2.beginPath(); ctx2.moveTo(px(0),py(vals[0]));
    vals.forEach(function(v,i){if(i>0)ctx2.lineTo(px(i),py(v));});
    ctx2.strokeStyle='#2d7ff9'; ctx2.lineWidth=2.5; ctx2.lineJoin='round'; ctx2.stroke();
    vals.forEach(function(v,i){
      ctx2.beginPath(); ctx2.arc(px(i),py(v),4,0,Math.PI*2);
      ctx2.fillStyle='#2d7ff9'; ctx2.strokeStyle='var(--surface,#fff)'; ctx2.lineWidth=2; ctx2.fill(); ctx2.stroke();
    });
    var step=idades.length>12?Math.ceil(idades.length/12):1;
    ctx2.fillStyle='#64748b'; ctx2.font='11px sans-serif'; ctx2.textAlign='center';
    idades.forEach(function(id,i){if(i%step===0)ctx2.fillText(id+' anos',px(i),H2-PB+16);});
    ctx2.save(); ctx2.translate(11,PT+(H2-PT-PB)/2); ctx2.rotate(-Math.PI/2);
    ctx2.font='10px sans-serif'; ctx2.fillStyle='#94a3b8'; ctx2.textAlign='center';
    ctx2.fillText('nº de alunos',0,0); ctx2.restore();
  }
}
