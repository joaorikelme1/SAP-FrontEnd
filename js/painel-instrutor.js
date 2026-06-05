'use strict';
initStore();

var _sess = getSession();
if (!_sess || _sess.role !== 'instrutor') {
  clearSession();
  clearSession(); window.location.href = '../index.html';
}

/* Inicializa UI com dados da sessão */
document.getElementById('sb-nome').textContent   = _sess.nome || 'Instrutor';
document.getElementById('sb-setor').textContent  = _sess.disciplina || 'Instrutor';
document.getElementById('sb-avatar').textContent = (_sess.nome || 'I').charAt(0);
document.getElementById('wb-nome').textContent   = 'Olá, ' + (_sess.nome || 'Instrutor').split(' ')[0] + '!';
document.getElementById('wb-setor').textContent  = _sess.disciplina || 'SENAC CEP';
(function(){
  var unNome = nomeUnidade(_sess.unidadeId);
  var el = document.querySelector('.topbar-breadcrumb');
  if (el) el.textContent = 'SAP · Instrutor · ' + unNome;
})();

/* ── Navegação ── */
function navTo(panelId, navEl) {
  document.querySelectorAll('.panel-section').forEach(function(p) { p.classList.remove('active'); });
  document.querySelectorAll('.nav-link').forEach(function(n) { n.classList.remove('active'); });
  var p = document.getElementById(panelId);
  if (p) p.classList.add('active');
  if (navEl) navEl.classList.add('active');
  var labelEl = navEl ? navEl.querySelector('.nav-label') : null;
  document.getElementById('topbar-title').textContent = labelEl ? labelEl.textContent : '';
  if (panelId === 'panel-home')       renderHome();
  if (panelId === 'panel-alunos')     renderAlunos();
  if (panelId === 'panel-atendimentos')  renderAtendimentos();
  if (panelId === 'panel-encaminhar') popularSelectAlunos();
  if (panelId === 'panel-chat')       renderChat();
}

/* ── Home / Dashboard ── */
function renderHome() {
  var store    = getStore();
  /* CORREÇÃO #3: filtra atendimentos apenas dos alunos do instrutor */
  var minhasAtendimentos = Permissions.getAtendimentosVisiveis(_sess, store.atendimentos, store.alunos)
                          .filter(function(c) { return c.agendadoPor === _sess.id; });
  var meusAlunos = Permissions.getAlunosVisiveis(_sess, store.alunos);

  document.getElementById('st-alunos').textContent = meusAlunos.length;
  document.getElementById('st-agt').textContent    = minhasAtendimentos.filter(function(c){ return c.status==='aguardando'; }).length;
  document.getElementById('st-conf').textContent   = minhasAtendimentos.filter(function(c){ return c.status==='confirmada'; }).length;
  document.getElementById('st-real').textContent   = minhasAtendimentos.filter(function(c){ return c.status==='realizada'; }).length;

  renderAlunosDashboard(meusAlunos);

  var recentes = minhasAtendimentos.slice().sort(function(a,b){ return new Date(b.criacao)-new Date(a.criacao); }).slice(0,5);
  var el = document.getElementById('home-recentes');
  if (!el) return;
  if (!recentes.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-state-title">Nenhuma solicitação ainda</div></div>';
    return;
  }
  el.innerHTML = recentes.map(function(c) {
    var al = store.alunos.find(function(a){ return a.id===c.idAluno; }) || {nome:'—'};
    /* CORREÇÃO #5: escape() em dados do usuário */
    return '<div class="atendimento-item">'
      + '<div class="ci-status-bar bar-' + escape(c.status) + '"></div>'
      + '<div class="ci-body">'
      + '<div class="ci-header">'
      + '<span class="ci-motivo">' + escape(c.motivoSolicitação.slice(0,60)) + (c.motivoSolicitação.length>60?'…':'') + '</span>'
      + statusBadge(c.status)
      + '</div>'
      + '<div class="ci-meta">'
      + '<span class="ci-meta-item">' + escape(al.nome) + '</span>'
      + '<span class="ci-meta-item">' + turnoLabel(c.turno) + '</span>'
      + '<span class="ci-meta-item">' + fmtDate(c.criacao) + '</span>'
      + '</div></div></div>';
  }).join('');
}

function renderAlunosDashboard(alunos) {
  alunos = alunos || [];
  var total = alunos.length;
  function countBy(prop, fallback) {
    return alunos.reduce(function(acc, a) {
      var k = a[prop] || fallback || 'Não informado';
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {});
  }
  function topEntries(map, limit) {
    return Object.keys(map).sort(function(a,b){ return map[b]-map[a] || a.localeCompare(b); }).slice(0, limit || 6);
  }
  function renderRows(elId, map, limit, empty) {
    var el = document.getElementById(elId);
    if (!el) return;
    var keys = topEntries(map, limit);
    if (!keys.length) { el.innerHTML = '<div class="dash-empty">' + empty + '</div>'; return; }
    el.innerHTML = keys.map(function(k) {
      var n = map[k], pct = total ? Math.round(n / total * 100) : 0;
      return '<div class="dash-row">'
        + '<div class="dash-row-main"><div class="dash-row-title">' + escape(k) + '</div>'
        + '<div class="dash-row-sub">' + pct + '% dos meus alunos</div></div>'
        + '<div class="dash-row-value">' + n + '</div>'
        + '<div class="dash-row-track"><div class="dash-row-fill" style="--pct:' + pct + '%"></div></div>'
        + '</div>';
    }).join('');
  }

  renderRows('dash-cursos', countBy('curso', 'Sem curso'), 6, 'Nenhum aluno vinculado ainda.');
  renderRows('dash-turmas', countBy('turma', 'Sem turma'), 6, 'Nenhuma turma vinculada ainda.');

  var ativos = alunos.filter(function(a){ return a.statusCadastro === 'ativo' || a.statusCadastro === 'aprovado'; }).length;
  var pcd = alunos.filter(function(a){ return !!a.pcd; }).length;
  var menores = alunos.filter(function(a){ var id = calcIdade(a.dataNascimento); return id !== null && id < 18; }).length;
  var turnos = countBy('turnoCurso', 'Sem turno');
  var turnoTop = topEntries(turnos, 1)[0] || '—';
  var resumo = document.getElementById('dash-resumo');
  if (resumo) {
    resumo.innerHTML =
      '<div class="dash-mini orange"><div class="dash-mini-value">' + total + '</div><div class="dash-mini-label">Meus alunos</div></div>'
      + '<div class="dash-mini green"><div class="dash-mini-value">' + ativos + '</div><div class="dash-mini-label">Ativos/aprovados</div></div>'
      + '<div class="dash-mini navy"><div class="dash-mini-value">' + menores + '</div><div class="dash-mini-label">Menores de 18</div></div>'
      + '<div class="dash-mini blue"><div class="dash-mini-value">' + pcd + '</div><div class="dash-mini-label">Alunos PCD</div></div>'
      + '<div class="dash-mini orange"><div class="dash-mini-value">' + escape(turnoLabel(turnoTop)) + '</div><div class="dash-mini-label">Turno principal</div></div>';
  }

  var recentes = alunos.slice().sort(function(a,b){ return new Date(b.dataCadastro || 0) - new Date(a.dataCadastro || 0); }).slice(0,5);
  var recEl = document.getElementById('dash-recentes-alunos');
  if (recEl) {
    recEl.innerHTML = recentes.length ? recentes.map(function(a) {
      return '<div class="dash-row"><div class="dash-row-main"><div class="dash-row-title">' + escape(a.nome) + '</div>'
        + '<div class="dash-row-sub">' + escape(a.curso || 'Sem curso') + ' · ' + escape(a.turma || 'Sem turma') + '</div></div>'
        + '<div class="dash-row-value" style="font-size:13px">' + fmtDate(a.dataCadastro) + '</div></div>';
    }).join('') : '<div class="dash-empty">Nenhum cadastro recente.</div>';
  }
}

/* ── Lista de Alunos ── */
function renderAlunos() {
  var store = getStore();
  var q = (document.getElementById('busca-al') ? document.getElementById('busca-al').value : '').toLowerCase();

  /* CORREÇÃO #3: apenas alunos das turmas do instrutor */
  var lista = Permissions.getAlunosVisiveis(_sess, store.alunos).filter(function(a) {
    return !q || a.nome.toLowerCase().indexOf(q) >= 0 || a.matricula.indexOf(q) >= 0;
  });

  var tb = document.getElementById('tbody-alunos');
  if (!tb) return;
  if (!lista.length) {
    tb.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:36px;color:var(--gray-400)">Nenhum aluno encontrado</td></tr>';
    return;
  }
  tb.innerHTML = lista.map(function(a) {
    var nc = store.atendimentos.filter(function(c){ return c.idAluno===a.id; }).length;
    /* Badge de status do cadastro */
    var statusBadgeHtml = '';
    if (a.statusCadastro === 'pendente') {
      statusBadgeHtml = '<span style="font-size:10px;font-weight:700;background:#FEF3DC;color:#C87F00;padding:2px 7px;border-radius:20px;margin-left:6px;">Pendente</span>';
    } else if (a.statusCadastro === 'aprovado') {
      statusBadgeHtml = '<span style="font-size:10px;font-weight:700;background:#dcfce7;color:#15803d;padding:2px 7px;border-radius:20px;margin-left:6px;">Aprovado</span>';
    } else if (a.statusCadastro === 'rejeitado') {
      statusBadgeHtml = '<span style="font-size:10px;font-weight:700;background:#fee2e2;color:#991b1b;padding:2px 7px;border-radius:20px;margin-left:6px;">Rejeitado</span>';
    }
    return '<tr>'
      + '<td><div style="font-weight:600">' + escape(a.nome) + '</div>'
      + '<div style="font-size:11.5px;color:var(--gray-400)">' + escape(a.email||'') + '</div></td>'
      + '<td><code style="font-size:12px">' + escape(a.matricula) + '</code></td>'
      + '<td>' + escape(a.curso||'—') + ' / ' + escape(a.turma||'—')
      + '<div style="font-size:11px;color:var(--gray-400)">Turno: ' + turnoLabel(a.turnoCurso) + '</div></td>'
      + '<td>' + (a.pcd ? '<span style="font-size:11px;font-weight:700;background:#E8EFF8;color:#1B3A6B;padding:2px 8px;border-radius:20px;">PCD</span>' : '—') + '</td>'
      + '<td>' + statusBadgeHtml + '</td>'
      + '<td style="text-align:center">' + nc + '</td>'
      + '<td><button class="btn btn-outline btn-sm" onclick="encAluno(\'' + a.id + '\')">'
      + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>'
      + 'Encaminhar</button></td>'
      + '</tr>';
  }).join('');
}

function encAluno(id) {
  navTo('panel-encaminhar', document.querySelector('[data-panel="panel-encaminhar"]'));
  setTimeout(function() { document.getElementById('enc-aluno').value = id; atualizarCompatibilidade(); }, 80);
}

/* ── Select de alunos no formulário de solicitação ── */
function popularSelectAlunos() {
  var store = getStore();
  /* CORREÇÃO #9: select mostra apenas alunos aprovados da turma do instrutor */
  var aprovados = Permissions.getAlunosVisiveis(_sess, store.alunos);
  var sel = document.getElementById('enc-aluno');
  if (!sel) return;
  sel.innerHTML = '<option value="">Selecione o aluno...</option>'
    + aprovados.map(function(a) {
        return '<option value="' + a.id + '">' + escape(a.nome) + ' (' + escape(a.turma) + ')</option>';
      }).join('');
  atualizarCompatibilidade();
}

/* ── Compatibilidade de horário (CORREÇÃO #7) ── */
function atualizarCompatibilidade() {
  var store    = getStore();
  var alunoId  = document.getElementById('enc-aluno')  ? document.getElementById('enc-aluno').value  : '';
  var turnoSel = document.getElementById('enc-turno')  ? document.getElementById('enc-turno').value  : '';
  var horaEl   = document.getElementById('enc-hora');
  var hora     = horaEl ? horaEl.value : '';
  var hint     = document.getElementById('enc-hint');
  var hintHora = document.getElementById('enc-hora-hint');
  var aluno    = alunoId ? store.alunos.find(function(a){ return a.id===alunoId; }) : null;
  var turnoCurso = aluno ? Validators.normalizeTurno(aluno.turnoCurso) : '';
  var tipo = document.getElementById('enc-tipo') ? document.getElementById('enc-tipo').value : '';

  /* Descrição do turno do curso */
  if (hint) {
    hint.textContent = descricaoDisponibilidadeAluno(aluno);
    hint.style.color = aluno && !turnoCurso ? 'var(--s-cancel)' : '';
  }

  if (tipo === 'remoto') {
    var turnoRemoto = document.getElementById('enc-turno');
    if (turnoRemoto) { turnoRemoto.value = ''; turnoRemoto.disabled = true; }
    if (horaEl) { horaEl.removeAttribute('min'); horaEl.removeAttribute('max'); }
    if (hintHora) { hintHora.textContent = 'Atendimento remoto: o turno do curso nao e obrigatorio.'; hintHora.style.color = '#1d4ed8'; }
    return;
  } else {
    var turnoPresencial = document.getElementById('enc-turno');
    if (turnoPresencial) turnoPresencial.disabled = false;
  }

  /* Auto-seleciona e trava o select de turno conforme o curso do aluno */
  var turnoSelect = document.getElementById('enc-turno');
  if (turnoSelect) {
    if (turnoCurso && tipo === 'dentro') {
      turnoSelect.value = turnoCurso;
    } else if (turnoCurso && tipo === 'fora' && turnoSelect.value === turnoCurso) {
      turnoSelect.value = '';
    }
    Array.from(turnoSelect.options).forEach(function(opt) {
      if (!opt.value) return; /* opção vazia */
      var disabled = tipo === 'fora'
        ? !!(turnoCurso && opt.value === turnoCurso)
        : !!(tipo === 'dentro' && turnoCurso && opt.value !== turnoCurso);
      opt.disabled = disabled;
      opt.style.color = disabled ? 'var(--gray-400)' : '';
    });
  }

  /* Restringe campo de horário à faixa do turno do curso */
  if (horaEl) {
    var turnoRef = tipo === 'fora' ? (turnoSelect ? turnoSelect.value : '') : turnoCurso;
    var faixa = turnoHoraConfig(turnoRef);
    if (faixa) {
      horaEl.min = faixa.inicio;
      horaEl.max = faixa.fim;
      /* Se o horário atual já está fora da faixa, limpa */
      if (hora && (hora < faixa.inicio || hora > faixa.fim)) {
        horaEl.value = '';
        hora = '';
      }
    } else {
      horaEl.removeAttribute('min');
      horaEl.removeAttribute('max');
    }
  }

  /* Feedback do horário */
  if (aluno && turnoCurso) {
    var turnoHint = tipo === 'fora' ? (turnoSelect ? turnoSelect.value : '') : turnoCurso;
    var faixaLabel = turnoHoraConfig(turnoHint);
    if (hora) {
      var compat = tipo === 'fora'
        ? { ok: !!turnoHint && turnoHint !== turnoCurso && horarioDentroDoTurno(hora, turnoHint), motivo: 'Horario fora da faixa do turno escolhido.' }
        : getCompatibilidadeAtendimento(aluno, turnoCurso, hora);
      if (hintHora) {
        hintHora.textContent = compat.ok
          ? '✓ Horário dentro do turno ' + turnoLabel(turnoCurso) + (faixaLabel ? ' (' + faixaLabel.inicio + ' às ' + faixaLabel.fim + ')' : '') + '.'
          : '⚠ ' + compat.motivo;
        hintHora.style.color = compat.ok ? 'var(--s-done)' : 'var(--s-cancel)';
      }
    } else if (hintHora) {
      hintHora.textContent = 'Escolha um horário entre '
        + (faixaLabel ? faixaLabel.inicio + ' e ' + faixaLabel.fim : 'os horários permitidos')
        + ' (turno ' + turnoLabel(turnoCurso) + ').';
      hintHora.style.color = 'var(--gray-500)';
    }
  } else if (hintHora) {
    hintHora.textContent = 'O horário deve ser no mesmo turno do curso do aluno.';
    hintHora.style.color = '';
  }
}

/* ── Submit solicitação ── */
function submitEnc() {
  var store   = getStore();
  var alunoId = document.getElementById('enc-aluno').value;
  var motivo  = document.getElementById('enc-motivo').value.trim();
  var data    = document.getElementById('enc-data').value;
  var turno   = document.getElementById('enc-turno').value;
  var hora    = document.getElementById('enc-hora').value;
  var obs     = document.getElementById('enc-obs').value.trim();
  var errEl   = document.getElementById('enc-err');
  var tipo = document.getElementById('enc-tipo') ? document.getElementById('enc-tipo').value : '';

  errEl.style.display = 'none';

  if (!tipo) {
    errEl.textContent = 'Selecione o tipo de atendimento.';
    errEl.style.display = 'block';
    return;
  }

  if (!alunoId || !motivo || (tipo !== 'remoto' && !turno)) {
    errEl.textContent = tipo === 'remoto' ? 'Preencha: aluno e motivo.' : 'Preencha: aluno, motivo e turno.';
    errEl.style.display = 'block';
    return;
  }

  var alunoObj = store.alunos.find(function(a){ return a.id===alunoId; });

  /* CORREÇÃO #3: instrutor só pode encaminhar alunos da sua turma */
  if (!Permissions.podeEncaminharAluno(_sess, alunoObj)) {
    errEl.textContent = 'Você não tem permissão para encaminhar este aluno.';
    errEl.style.display = 'block';
    return;
  }

  /* CORREÇÃO #7: valida compatibilidade de horário */
  if (tipo === 'fora') {
    var turnoCursoEnc = alunoObj ? Validators.normalizeTurno(alunoObj.turnoCurso) : '';
    var turnoEnc = Validators.normalizeTurno(turno);
    if (turnoCursoEnc && turnoEnc === turnoCursoEnc) {
      errEl.textContent = 'Para atendimento fora do horario, escolha um turno diferente do curso do aluno.';
      errEl.style.display = 'block';
      return;
    }
    if (hora && !horarioDentroDoTurno(hora, turnoEnc)) {
      errEl.textContent = 'Horario fora da faixa do turno escolhido.';
      errEl.style.display = 'block';
      return;
    }
  } else if (tipo !== 'remoto' && hora) {
    var compat = getCompatibilidadeAtendimento(alunoObj, turno, hora);
    if (!compat.ok) {
      errEl.textContent = compat.motivo;
      errEl.style.display = 'block';
      return;
    }
  }

  store.atendimentos.push({
    id: genId('c'),
    idAluno: alunoId,
    agendadoPor: _sess.id,
    unidadeId: _sess.unidadeId||'u1',
    motivoSolicitação: motivo,
    dataPreferencial: data,
    horarioPreferencial: hora,
    turno: tipo === 'remoto' ? 'remoto' : turno,
    tipoAtendimento: tipo,
    obsResponsavel: obs,
    obsPsicologa: '',
    status: 'aguardando',
    criacao: new Date().toISOString()
  });
  saveStore(store);
  toast('Solicitação enviada com sucesso!', 'success');
  ['enc-aluno','enc-motivo','enc-data','enc-hora','enc-obs'].forEach(function(id){
    var el = document.getElementById(id); if (el) el.value = '';
  });
  var ts = document.getElementById('enc-turno'); if (ts) ts.value = '';
  var tt = document.getElementById('enc-tipo'); if (tt) tt.value = '';
  atualizarCompatibilidade();
  renderHome();
}

/* ── Lista de atendimentos ── */
function renderAtendimentos() {
  var store = getStore();
  var q     = document.getElementById('busca-cons') ? document.getElementById('busca-cons').value.toLowerCase() : '';
  var fSt   = document.getElementById('filtro-st')  ? document.getElementById('filtro-st').value : '';

  /* CORREÇÃO #3: apenas atendimentos relacionadas aos alunos do instrutor */
  var lista = Permissions.getAtendimentosVisiveis(_sess, store.atendimentos, store.alunos);
  if (fSt) lista = lista.filter(function(c){ return c.status === fSt; });
  if (q) lista = lista.filter(function(c) {
    var al = store.alunos.find(function(a){ return a.id===c.idAluno; });
    return (al&&al.nome||'').toLowerCase().indexOf(q)>=0
        || (al&&al.matricula||'').indexOf(q)>=0
        || c.motivoSolicitação.toLowerCase().indexOf(q)>=0;
  });
  lista.sort(function(a,b){ return new Date(b.criacao)-new Date(a.criacao); });

  var tb = document.getElementById('tbody-cons');
  if (!tb) return;
  if (!lista.length) {
    tb.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:36px;color:var(--gray-400)">Nenhuma atendimento encontrada</td></tr>';
    return;
  }
  tb.innerHTML = lista.map(function(c) {
    var al = store.alunos.find(function(a){ return a.id===c.idAluno; }) || {nome:'—',matricula:''};
    var tipoAtend = c.tipoAtendimento || '';
    var isRemoto = (tipoAtend === 'remoto' || c.turno === 'remoto');
    var turnoCurso    = Validators.normalizeTurno(al.turnoCurso);
    var turnoAtendimento = Validators.normalizeTurno(c.turno);
    var isForaH = !isRemoto && (tipoAtend === 'fora' || (turnoCurso && turnoAtendimento && turnoCurso !== turnoAtendimento));
    var rowStyle = isRemoto ? ' style="background:rgba(37,99,235,0.06);border-left:3px solid #3b82f6"' : isForaH ? ' style="background:rgba(247,163,0,0.06);border-left:3px solid #f5c518"' : '';
    var tipoTag = isRemoto ? ' <span style="font-size:10px;font-weight:700;background:#dbeafe;color:#1d4ed8;padding:2px 6px;border-radius:10px">📱 Remoto</span>' : isForaH ? ' <span style="font-size:10px;font-weight:700;background:#fef3dc;color:#c87f00;padding:2px 6px;border-radius:10px">⚠️ Fora do horário</span>' : (turnoCurso ? ' <span style="font-size:10px;color:var(--gray-400)">✓</span>' : '');
    var tLab = isRemoto ? '<span style="color:#1d4ed8;font-weight:600">Remoto</span>' : turnoLabel(c.turno);
    return '<tr'+rowStyle+'>'
      + '<td><div style="font-weight:600">' + escape(al.nome) + '</div>'
      + '<div style="font-size:11.5px;color:var(--gray-400)">' + escape(al.matricula) + '</div></td>'
      + '<td>' + escape(c.motivoSolicitação.length>45 ? c.motivoSolicitação.slice(0,45)+'…' : c.motivoSolicitação) + '</td>'
      + '<td>' + tLab + tipoTag + '</td>'
      + '<td>' + escape(nomeResponsavel(c.agendadoPor)) + '</td>'
      + '<td>' + statusBadge(c.status) + '</td>'
      + '<td>' + fmtDate(c.criacao) + '</td>'
      + '</tr>';
  }).join('');
}

/* ── Chat ── */
function renderChat() {
  var store = getStore();
  var meuId = _sess.id;
  var _psicObj = (store.psicologos||[]).find(function(p){return p.unidadeId===_sess.unidadeId;})||{}; var psicId = _psicObj.id || 'psic1';
  /* Update chat header with psic name */
  var chatNomeEl = document.getElementById('chat-psic-nome');
  if (chatNomeEl && _psicObj.nome) chatNomeEl.textContent = _psicObj.nome;
  var msgs = store.mensagens.filter(function(m) {
    return (m.de===meuId && m.para===psicId) || (m.de===psicId && m.para===meuId);
  }).sort(function(a,b){ return new Date(a.criacao)-new Date(b.criacao); });
  var el = document.getElementById('chat-area');
  if (!el) return;
  if (!msgs.length) {
    el.innerHTML = '<div class="chat-empty-msg">Nenhuma mensagem ainda.<br>Inicie uma conversa com a psicóloga.</div>';
    return;
  }
  el.innerHTML = msgs.map(function(m) {
    return '<div class="chat-msg ' + (m.de===meuId?'sent':'recv') + '">'
      + '<div class="chat-bubble">' + escape(m.texto) + '</div>'
      + '<div class="chat-meta">' + fmtDatetime(m.criacao) + '</div>'
      + '</div>';
  }).join('');
  el.scrollTop = el.scrollHeight;
}

function enviarMsg() {
  var input = document.getElementById('chat-txt');
  var texto = input ? input.value.trim() : '';
  if (!texto) { toast('Escreva uma mensagem antes de enviar.','warning'); return; }
  var store = getStore();
  /* CORREÇÃO: busca psicólogo da unidade do instrutor */
  var psicObj = (store.psicologos||[]).find(function(p){ return p.unidadeId===_sess.unidadeId; }) || store.psicologos[0] || {id:'psic1'};
  store.mensagens.push({
    id: genId('m'),
    de: _sess.id,
    para: psicObj.id,
    unidadeId: _sess.unidadeId,
    texto: texto,
    criacao: new Date().toISOString()
  });
  saveStore(store);
  input.value = '';
  renderChat();
}

document.addEventListener('keydown', function(e) {
  if (e.key === 'Enter' && document.activeElement && document.activeElement.id === 'chat-txt') {
    enviarMsg();
  }
});

/* ── Cadastro de aluno ── */
function salvarAluno() {
  var nome  = document.getElementById('cad-nome').value.trim();
  var mat   = document.getElementById('cad-mat').value.trim();
  var cpf   = document.getElementById('cad-cpf').value.trim();
  var nasc  = document.getElementById('cad-nasc').value;
  var tel   = document.getElementById('cad-tel').value.trim();
  var cur   = document.getElementById('cad-curso').value;
  var tur   = document.getElementById('cad-turma').value.trim();
  var turno = document.getElementById('cad-turno').value;
  var pcd   = document.getElementById('cad-pcd').value === 'sim';
  var eml   = document.getElementById('cad-email').value.trim();
  var errEl = document.getElementById('cad-err');
  errEl.style.display = 'none';

  /* CORREÇÃO #6: validações robustas */
  if (!nome || !mat || !cpf || !nasc || !tel || !cur || !tur || !turno) {
    errEl.textContent = 'Preencha todos os campos obrigatórios.'; errEl.style.display='block'; return;
  }
  if (!Validators.cpf(cpf)) {
    errEl.textContent = 'CPF inválido. Verifique os dígitos.'; errEl.style.display='block'; return;
  }
  if (eml && !Validators.email(eml)) {
    errEl.textContent = 'E-mail inválido.'; errEl.style.display='block'; return;
  }
  if (!Validators.telefone(tel)) {
    errEl.textContent = 'Telefone inválido (mínimo 10 dígitos).'; errEl.style.display='block'; return;
  }
  if (!Validators.data(nasc)) {
    errEl.textContent = 'Data de nascimento inválida.'; errEl.style.display='block'; return;
  }

  var store = getStore();
  if (store.alunos.find(function(a){ return a.matricula===mat; })) {
    errEl.textContent='Matrícula já cadastrada.'; errEl.style.display='block'; return;
  }
  if (store.alunos.find(function(a){ return a.cpf.replace(/\D/g,'')===cpf.replace(/\D/g,''); })) {
    errEl.textContent='CPF já cadastrado.'; errEl.style.display='block'; return;
  }

  /* CORREÇÃO #1: novo aluno sempre como 'pendente' */
  store.alunos.push({
    id: genId('al'),
    nome: nome,
    matricula: mat,
    cpf: cpf,
    dataNascimento: nasc,
    telefone: tel,
    curso: cur,
    turma: tur,
    turnoCurso: Validators.normalizeTurno(turno), /* CORREÇÃO #8: campo explícito */
    email: eml,
    pcd: pcd,
    responsavelCad: _sess.id,
    unidadeId: _sess.unidadeId||'u1',
    statusCadastro: 'ativo',
    dataCadastro: new Date().toISOString()
  });
  saveStore(store);
  closeModal('modal-cad');
  toast('Aluno cadastrado com sucesso!', 'success');
  ['cad-nome','cad-mat','cad-cpf','cad-nasc','cad-tel','cad-curso','cad-turma','cad-turno','cad-email'].forEach(function(id){
    var el = document.getElementById(id); if (el) el.value='';
  });
  var pcdSel = document.getElementById('cad-pcd'); if (pcdSel) pcdSel.value='nao';
  renderAlunos();
}

/* Inicializa */
renderHome();

/* ── Modal Agendamento (Instrutor/Coord) ── */
var _magAlunoId = null;

function abrirModalAgendar(idAluno) {
  var store = getStore();
  var alunos = Permissions.getAlunosVisiveis(_sess, store.alunos);
  var sel = document.getElementById('mag-aluno-sel');
  if (sel) {
    sel.innerHTML = '<option value="">Selecione o aluno...</option>'
      + alunos.map(function(a){ return '<option value="'+a.id+'">'+a.nome+' — '+a.matricula+'</option>'; }).join('');
  }
  _magAlunoId = null;
  var infoEl = document.getElementById('mag-aluno-info');
  if (infoEl) infoEl.style.display = 'none';
  var tipoEl = document.getElementById('mag-tipo'); if (tipoEl) tipoEl.value = '';
  var tipoInfo = document.getElementById('mag-tipo-info'); if (tipoInfo) tipoInfo.style.display = 'none';
  var dataEl = document.getElementById('mag-data'); if (dataEl) dataEl.value = new Date().toISOString().slice(0,10);
  var motivoEl = document.getElementById('mag-motivo'); if (motivoEl) motivoEl.value = '';
  var horaEl = document.getElementById('mag-hora'); if (horaEl) horaEl.value = '';
  var turnoEl = document.getElementById('mag-turno'); if (turnoEl) { turnoEl.value = ''; turnoEl.disabled = false; }
  if (idAluno) {
    if (sel) sel.value = idAluno;
    magSelecionarAluno();
  }
  openModal('modal-agendar');
}

function magSelecionarAluno() {
  var sel = document.getElementById('mag-aluno-sel');
  if (!sel || !sel.value) { _magAlunoId = null; return; }
  _magAlunoId = sel.value;
  var store = getStore();
  var a = store.alunos.find(function(x){ return x.id === _magAlunoId; });
  var infoEl = document.getElementById('mag-aluno-info');
  if (a && infoEl) {
    infoEl.style.display = '';
    var nEl = document.getElementById('mag-aluno-nome'); if (nEl) nEl.textContent = a.nome;
    var dEl = document.getElementById('mag-aluno-detalhe'); if (dEl) dEl.textContent = a.matricula+' · '+a.curso+' · '+turnoLabel(a.turnoCurso)+(a.telefone?' · 📞 '+a.telefone:'');
    var turnoEl = document.getElementById('mag-turno');
    if (turnoEl && a.turnoCurso) { var t=Validators.normalizeTurno(a.turnoCurso); if(t) turnoEl.value=t; }
  }
  magAtualizarTipo();
}

function magAtualizarTipo() {
  var tipoEl = document.getElementById('mag-tipo');
  var infoEl = document.getElementById('mag-tipo-info');
  if (!tipoEl || !infoEl) return;
  var tipo = tipoEl.value;
  var store = getStore();
  var a = _magAlunoId ? store.alunos.find(function(x){ return x.id===_magAlunoId; }) : null;
  var tc = a ? Validators.normalizeTurno(a.turnoCurso) : '';
  var turnoEl = document.getElementById('mag-turno');
  var horaEl = document.getElementById('mag-hora');

  if (turnoEl) {
    turnoEl.disabled = tipo === 'remoto';
    Array.from(turnoEl.options).forEach(function(opt) {
      if (!opt.value) return;
      opt.disabled = false;
      opt.style.color = '';
      if (tipo === 'dentro' && tc && opt.value !== tc) {
        opt.disabled = true;
        opt.style.color = 'var(--gray-400)';
      }
      if (tipo === 'fora' && tc && opt.value === tc) {
        opt.disabled = true;
        opt.style.color = 'var(--gray-400)';
      }
    });
    if (tipo === 'remoto') turnoEl.value = '';
    else if (tipo === 'dentro' && tc) turnoEl.value = tc;
    else if (tipo === 'fora' && tc && turnoEl.value === tc) turnoEl.value = '';
  }

  if (horaEl) {
    var turnoRef = tipo === 'dentro' ? tc : (turnoEl ? turnoEl.value : '');
    var faixa = turnoRef ? turnoHoraConfig(turnoRef) : null;
    if (tipo === 'remoto' || !faixa) {
      horaEl.removeAttribute('min');
      horaEl.removeAttribute('max');
    } else {
      horaEl.min = faixa.inicio;
      horaEl.max = faixa.fim;
    }
  }
  if (!tipo) { infoEl.style.display='none'; return; }
  if (tipo==='remoto') {
    infoEl.style.display=''; infoEl.style.background='#eff6ff'; infoEl.style.border='1px solid #93c5fd'; infoEl.style.color='#1d4ed8';
    var tel = a && a.telefone ? ' Contato: <strong>'+escape(a.telefone)+'</strong>' : '';
    infoEl.innerHTML = '📱 <strong>Atendimento Remoto</strong> — Contato direto com o aluno necessário.'+tel;
  } else if (tipo==='fora') {
    infoEl.style.display=''; infoEl.style.background='#fefce8'; infoEl.style.border='1px solid #fde047'; infoEl.style.color='#854d0e';
    infoEl.innerHTML = '⚠️ <strong>Fora do horário do curso</strong>'+(tc?' — Turno do aluno: '+turnoLabel(tc):'')+'.'
  } else {
    infoEl.style.display=''; infoEl.style.background='#f0fdf4'; infoEl.style.border='1px solid #86efac'; infoEl.style.color='#166534';
    infoEl.innerHTML = '✅ <strong>Dentro do horário do curso</strong>'+(tc?' — Turno: '+turnoLabel(tc):'')+'.'
    var turnoEl = document.getElementById('mag-turno'); if (tc && turnoEl) turnoEl.value = tc;
  }
}

function confirmarNovoAgendamento() {
  if (!_magAlunoId) { toast('Selecione um aluno.', 'warning'); return; }
  var dataEl=document.getElementById('mag-data'), turnoEl=document.getElementById('mag-turno');
  var horaEl=document.getElementById('mag-hora'), motivoEl=document.getElementById('mag-motivo');
  var tipoEl=document.getElementById('mag-tipo');
  var data=dataEl?dataEl.value.trim():'', turno=turnoEl?turnoEl.value.trim():'';
  var hora=horaEl?horaEl.value.trim():'', motivo=motivoEl?motivoEl.value.trim():'';
  var tipo=tipoEl?tipoEl.value.trim():'';
  if (!data)   { toast('Informe a data da sessão.','warning'); return; }
  if (!tipo)   { toast('Selecione o tipo de atendimento.','warning'); return; }
  if (tipo!=='remoto' && !turno) { toast('Selecione o turno.','warning'); return; }
  if (!hora)   { toast('Informe o horário da sessão.','warning'); return; }
  if (!motivo) { toast('Informe o motivo ou observação.','warning'); return; }
  var store = getStore();
  var alunoAg = store.alunos.find(function(x){ return x.id===_magAlunoId; });
  var turnoCursoAg = alunoAg ? Validators.normalizeTurno(alunoAg.turnoCurso) : '';
  var turnoAg = Validators.normalizeTurno(turno);
  if (tipo === 'dentro' && turnoCursoAg && turnoAg !== turnoCursoAg) { toast('Para atendimento dentro do horario, use o turno do curso do aluno.', 'warning'); return; }
  if (tipo === 'fora' && turnoCursoAg && turnoAg === turnoCursoAg) { toast('Para atendimento fora do horario, escolha um turno diferente do curso do aluno.', 'warning'); return; }
  var nova = {
    id: genId('c'), idAluno: _magAlunoId, motivoSolicitação: motivo, obsResponsavel: '',
    dataPreferencial: data, horarioPreferencial: hora,
    turno: tipo==='remoto'?'remoto':turno, tipoAtendimento: tipo,
    agendadoPor: _sess.id, unidadeId: _sess.unidadeId,
    status: 'confirmada', obsPsicologa: '', criacao: new Date().toISOString()
  };
  store.atendimentos.push(nova);
  saveStore(store);
  var a = store.alunos.find(function(x){ return x.id===_magAlunoId; });
  toast('Sessão de '+(a?a.nome.split(' ')[0]:'aluno')+' agendada para '+data.split('-').reverse().join('/')+' às '+hora+'!','success');
  closeModal('modal-agendar');
  if (typeof renderAtendimentos==='function') renderAtendimentos();
  if (typeof renderHome==='function') renderHome();
}


/* ── Gráficos Dashboard ── */
function renderGraficos(alunos) {
  if (!alunos) {
    var store = getStore();
    alunos = Permissions.getAlunosVisiveis(_sess, store.alunos);
  }
  var cores = ['#2d7ff9','#f97316','#10b981','#8b5cf6','#ef4444','#f59e0b','#06b6d4','#ec4899','#84cc16','#6366f1'];
  var cursosMap = {};
  alunos.forEach(function(a){ var c=a.curso||'Sem curso'; cursosMap[c]=(cursosMap[c]||0)+1; });
  var cursos = Object.keys(cursosMap).sort();
  var total = alunos.length;
  var canvas = document.getElementById('chart-pizza');
  if (canvas && canvas.getContext) {
    var ctx=canvas.getContext('2d'), W=canvas.width, H=canvas.height, cx=W/2, cy=H/2, r=Math.min(cx,cy)-10;
    ctx.clearRect(0,0,W,H);
    if (!total) { ctx.fillStyle='#e2e8f0'; ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill(); }
    else {
      var ang=-Math.PI/2;
      cursos.forEach(function(nome,i){
        var frac=cursosMap[nome]/total, end=ang+frac*Math.PI*2;
        ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,r,ang,end); ctx.closePath();
        ctx.fillStyle=cores[i%cores.length]; ctx.fill();
        ctx.strokeStyle='var(--surface,#fff)'; ctx.lineWidth=2; ctx.stroke();
        ang=end;
      });
      ctx.beginPath(); ctx.arc(cx,cy,r*0.46,0,Math.PI*2); ctx.fillStyle='var(--surface,#fff)'; ctx.fill();
      ctx.fillStyle='var(--ink,#0f172a)'; ctx.font='bold 16px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(total, cx, cy-7);
      ctx.font='11px sans-serif'; ctx.fillStyle='#6b7280'; ctx.fillText('alunos', cx, cy+11);
    }
  }
  var leg=document.getElementById('chart-pizza-legend');
  if (leg) {
    leg.innerHTML = cursos.map(function(nome,i){
      var n=cursosMap[nome], pct=total?Math.round(n/total*100):0;
      return '<div style="display:flex;align-items:center;gap:8px">'
        +'<div style="width:12px;height:12px;border-radius:3px;background:'+cores[i%cores.length]+';flex-shrink:0"></div>'
        +'<div style="flex:1;font-weight:600;color:var(--ink,#0f172a)">'+escape(nome)+'</div>'
        +'<div style="color:#6b7280">'+n+' aluno'+(n!==1?'s':'')+'</div>'
        +'<div style="font-weight:700;color:'+cores[i%cores.length]+';min-width:38px;text-align:right">'+pct+'%</div>'
        +'</div>';
    }).join('');
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
