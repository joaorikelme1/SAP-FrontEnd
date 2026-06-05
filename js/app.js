/* ============================================================
   app.js — SAP SENAC DF  (v12)
   Perfis: administrador | psicologa | coordenacao | instrutor
   - Login individual por pessoa (NÃO compartilhado por perfil)
   - Separação total por unidade (unidadeId)
   - Sem aprovação de aluno pela psicóloga
   - Chat funcionando corretamente
   ============================================================ */
'use strict';

var SAP_VERSION = 'v12';
var STORE_KEY   = 'sap_store_' + SAP_VERSION;
var SESSION_KEY = 'sap_session_' + SAP_VERSION;

function _ago(days, hours) {
  var d = new Date();
  d.setDate(d.getDate() + (days  || 0));
  d.setHours(d.getHours() + (hours || 0));
  return d.toISOString();
}

var SEED = {
  unidades: [
    { id:'u1',  nome:'Taguatinga',         regiao:'Região Oeste'       },
    { id:'u2',  nome:'Brasília (Asa Sul)',  regiao:'Plano Piloto'       },
    { id:'u3',  nome:'Ceilândia',           regiao:'Região Oeste'       },
    { id:'u4',  nome:'Samambaia',           regiao:'Região Oeste'       },
    { id:'u5',  nome:'Gama',               regiao:'Região Sul'         },
    { id:'u6',  nome:'Sobradinho',         regiao:'Região Norte'       },
    { id:'u7',  nome:'Planaltina',         regiao:'Região Norte'       },
    { id:'u8',  nome:'Recanto das Emas',   regiao:'Região Sul'         },
    { id:'u9',  nome:'Núcleo Bandeirante', regiao:'Região Central-Sul' },
    { id:'u10', nome:'Paranoá',            regiao:'Região Leste'       }
  ],
  /* ADMINISTRADORES - logins individuais */
  administradores: [
    { id:'adm1', usuario:'admin.taguatinga', cpf:'000.000.001-00', senha:'Admin@2024!',  nome:'Roberto Almeida',     unidadeId:'u1', role:'administrador' },
    { id:'adm2', usuario:'admin.asasul',     cpf:'000.000.002-00', senha:'Admin@2024!',  nome:'Patrícia Monteiro',   unidadeId:'u2', role:'administrador' },
    { id:'adm3', usuario:'admin.ceilandia',  cpf:'000.000.003-00', senha:'Admin@2024!',  nome:'Wagner Santos',       unidadeId:'u3', role:'administrador' }
  ],
  /* PSICÓLOGOS - cada um com login individual */
  psicologos: [
    { id:'psic1', usuario:'carla.mendes',    cpf:'111.111.111-11', senha:'Psic@2024!', nome:'Dra. Carla Mendes',    crp:'01/12345', unidadeId:'u1', role:'psicologa' },
    { id:'psic2', usuario:'marcos.oliveira', cpf:'222.222.222-22', senha:'Psic@2024!', nome:'Dr. Marcos Oliveira',  crp:'01/67890', unidadeId:'u2', role:'psicologa' },
    { id:'psic3', usuario:'ana.ribeiro',     cpf:'333.333.333-33', senha:'Psic@2024!', nome:'Dra. Ana Ribeiro',     crp:'01/11223', unidadeId:'u3', role:'psicologa' }
  ],
  /* COORDENADORES - cada um com login individual */
  coordenadores: [
    { id:'coord1', usuario:'ana.ramos',      cpf:'444.444.444-44', senha:'Coord@2024!', nome:'Ana Paula Ramos',    setor:'Coordenação Pedagógica', unidadeId:'u1', role:'coordenacao' },
    { id:'coord2', usuario:'roberto.fig',    cpf:'555.555.555-55', senha:'Coord@2024!', nome:'Roberto Figueiredo', setor:'Coordenação de Cursos',  unidadeId:'u2', role:'coordenacao' },
    { id:'coord3', usuario:'lucia.ferreira', cpf:'666.666.666-66', senha:'Coord@2024!', nome:'Lúcia Ferreira',     setor:'Coordenação Geral',      unidadeId:'u3', role:'coordenacao' }
  ],
  /* INSTRUTORES - cada um com CPF individual como login */
  instrutores: [
    { id:'inst1', usuario:'carlos.lima',    cpf:'777.111.222-33', senha:'Inst@2024!', nome:'Carlos Eduardo Lima',   disciplina:'Administração',    turmas:['ADM-2024A','ADM-2024B'], unidadeId:'u1', role:'instrutor' },
    { id:'inst2', usuario:'marcia.costa',   cpf:'777.222.333-44', senha:'Inst@2024!', nome:'Márcia Fernanda Costa', disciplina:'Saúde/Enfermagem', turmas:['ENF-2024A','ENF-2024B'], unidadeId:'u1', role:'instrutor' },
    { id:'inst3', usuario:'paulo.alves',    cpf:'777.333.444-55', senha:'Inst@2024!', nome:'Paulo Roberto Alves',   disciplina:'Informática',      turmas:['INFO-2024A'],            unidadeId:'u1', role:'instrutor' },
    { id:'inst4', usuario:'fernanda.lima',  cpf:'777.444.555-66', senha:'Inst@2024!', nome:'Fernanda Lima',         disciplina:'Marketing',        turmas:['MKT-2024A'],             unidadeId:'u2', role:'instrutor' },
    { id:'inst5', usuario:'jorge.santos',   cpf:'777.555.666-77', senha:'Inst@2024!', nome:'Jorge Santos',          disciplina:'Administração',    turmas:['ADM-2024A'],             unidadeId:'u3', role:'instrutor' }
  ],
  alunos: [
    { id:'al1', nome:'Maria Eduarda Lima',  matricula:'20240001', cpf:'111.222.333-44', dataNascimento:'2007-03-15', curso:'Administração', turma:'ADM-2024A',  turnoCurso:'manhã', telefone:'(61) 91111-2222', email:'maria@senac.br',    pcd:false, responsavelCad:'inst1',  unidadeId:'u1', statusCadastro:'ativo', dataCadastro:_ago(-10) },
    { id:'al2', nome:'João Victor Pereira', matricula:'20240002', cpf:'222.333.444-55', dataNascimento:'2008-07-20', curso:'Enfermagem',    turma:'ENF-2024B',  turnoCurso:'tarde', telefone:'(61) 92222-3333', email:'joao@senac.br',     pcd:false, responsavelCad:'coord1', unidadeId:'u1', statusCadastro:'ativo', dataCadastro:_ago(-8)  },
    { id:'al3', nome:'Ana Clara Costa',     matricula:'20240003', cpf:'333.444.555-66', dataNascimento:'2005-11-08', curso:'Informática',   turma:'INFO-2024A', turnoCurso:'noite', telefone:'(61) 93333-4444', email:'ana@senac.br',      pcd:false, responsavelCad:'inst3',  unidadeId:'u1', statusCadastro:'ativo', dataCadastro:_ago(-15) },
    { id:'al4', nome:'Carlos Mendes',       matricula:'20240004', cpf:'444.555.666-77', dataNascimento:'2009-02-14', curso:'Administração', turma:'ADM-2024B',  turnoCurso:'manhã', telefone:'(61) 94444-5555', email:'carlos@senac.br',   pcd:true,  responsavelCad:'inst1',  unidadeId:'u1', statusCadastro:'ativo', dataCadastro:_ago(-5)  },
    { id:'al5', nome:'Beatriz Souza',       matricula:'20240005', cpf:'555.666.777-88', dataNascimento:'2006-09-30', curso:'Enfermagem',    turma:'ENF-2024A',  turnoCurso:'tarde', telefone:'(61) 95555-6666', email:'beatriz@senac.br',  pcd:false, responsavelCad:'coord1', unidadeId:'u1', statusCadastro:'ativo', dataCadastro:_ago(-12) },
    { id:'al6', nome:'Lucas Ferreira',      matricula:'20240006', cpf:'666.777.888-99', dataNascimento:'2008-05-12', curso:'Administração', turma:'ADM-2024B',  turnoCurso:'manhã', telefone:'(61) 96666-7777', email:'lucas@senac.br',    pcd:false, responsavelCad:'inst1',  unidadeId:'u1', statusCadastro:'ativo', dataCadastro:_ago(-7)  },
    { id:'al7', nome:'Fernanda Oliveira',   matricula:'20240007', cpf:'777.888.999-00', dataNascimento:'2009-01-25', curso:'Enfermagem',    turma:'ENF-2024A',  turnoCurso:'tarde', telefone:'(61) 97777-8888', email:'fernanda@senac.br', pcd:true,  responsavelCad:'inst2',  unidadeId:'u1', statusCadastro:'ativo', dataCadastro:_ago(-6)  },
    { id:'al8', nome:'Rodrigo Santos',      matricula:'20240008', cpf:'888.999.000-11', dataNascimento:'2007-06-10', curso:'Marketing',     turma:'MKT-2024A',  turnoCurso:'manhã', telefone:'(61) 98888-9999', email:'rodrigo@senac.br',  pcd:false, responsavelCad:'inst4',  unidadeId:'u2', statusCadastro:'ativo', dataCadastro:_ago(-4)  },
    { id:'al9', nome:'Priscila Souza',      matricula:'20240009', cpf:'999.000.111-22', dataNascimento:'2008-11-30', curso:'Administração', turma:'ADM-2024A',  turnoCurso:'manhã', telefone:'(61) 99000-1111', email:'priscila@senac.br', pcd:false, responsavelCad:'inst5',  unidadeId:'u3', statusCadastro:'ativo', dataCadastro:_ago(-3)  }
  ],
  atendimentos: [
    { id:'c1', idAluno:'al1', agendadoPor:'inst1',  unidadeId:'u1', motivoSolicitação:'Ansiedade intensa antes das provas',              dataPreferencial:'2025-07-22', horarioPreferencial:'09:00', turno:'manhã', obsResponsavel:'Apresentou choro em aula.',     obsPsicologa:'Acompanhar semanalmente.', status:'realizada',  criacao:_ago(-14) },
    { id:'c2', idAluno:'al1', agendadoPor:'coord1', unidadeId:'u1', motivoSolicitação:'Dificuldades nos relacionamentos com colegas',    dataPreferencial:'2025-07-28', horarioPreferencial:'10:30', turno:'manhã', obsResponsavel:'',                              obsPsicologa:'',                        status:'confirmada', criacao:_ago(-3)  },
    { id:'c3', idAluno:'al3', agendadoPor:'inst3',  unidadeId:'u1', motivoSolicitação:'Problemas de foco e procrastinação recorrente',   dataPreferencial:'2025-07-25', horarioPreferencial:'19:00', turno:'noite', obsResponsavel:'Situação piorou este semestre.', obsPsicologa:'',                        status:'aguardando', criacao:_ago(-2)  },
    { id:'c4', idAluno:'al1', agendadoPor:'inst1',  unidadeId:'u1', motivoSolicitação:'Sessão de acompanhamento regular',                dataPreferencial:'2025-07-15', horarioPreferencial:'09:00', turno:'manhã', obsResponsavel:'',                              obsPsicologa:'Aluna não compareceu.',   status:'falta',      criacao:_ago(-20) },
    { id:'c5', idAluno:'al3', agendadoPor:'coord1', unidadeId:'u1', motivoSolicitação:'Estresse elevado no período de avaliações',       dataPreferencial:'2025-07-18', horarioPreferencial:'19:00', turno:'noite', obsResponsavel:'',                              obsPsicologa:'Cancelado a pedido.',     status:'cancelada',  criacao:_ago(-18) },
    { id:'c6', idAluno:'al5', agendadoPor:'inst2',  unidadeId:'u1', motivoSolicitação:'Dificuldades emocionais na adaptação ao curso',   dataPreferencial:'2025-07-30', horarioPreferencial:'14:00', turno:'tarde', obsResponsavel:'Primeiro solicitação.',       obsPsicologa:'',                        status:'aguardando', criacao:_ago(-1)  },
    { id:'c7', idAluno:'al6', agendadoPor:'coord1', unidadeId:'u1', motivoSolicitação:'Conflito familiar afetando o rendimento escolar', dataPreferencial:'2025-07-29', horarioPreferencial:'09:30', turno:'manhã', obsResponsavel:'',                              obsPsicologa:'',                        status:'aguardando', criacao:_ago(-4)  },
    { id:'c8', idAluno:'al7', agendadoPor:'inst2',  unidadeId:'u1', motivoSolicitação:'Dificuldade de adaptação à nova escola',          dataPreferencial:'2025-08-01', horarioPreferencial:'14:00', turno:'tarde', obsResponsavel:'Primeiro mês da aluna.',         obsPsicologa:'',                        status:'aguardando', criacao:_ago(0,-3) },
    { id:'c9', idAluno:'al8', agendadoPor:'inst4',  unidadeId:'u2', motivoSolicitação:'Ansiedade social e dificuldade de comunicação',   dataPreferencial:'2025-08-05', horarioPreferencial:'09:00', turno:'manhã', obsResponsavel:'',                              obsPsicologa:'',                        status:'aguardando', criacao:_ago(-1)  }
  ],
  mensagens: [
    { id:'m1', de:'inst1',  para:'psic1', unidadeId:'u1', texto:'Olá Dra. Carla, enviei o solicitação da Maria Eduarda. Ela está muito ansiosa.',    criacao:_ago(-3,-4) },
    { id:'m2', de:'psic1',  para:'inst1', unidadeId:'u1', texto:'Recebi, obrigada Carlos. Irei atendê-la na quarta-feira às 09h.',                        criacao:_ago(-3,-3) },
    { id:'m3', de:'coord1', para:'psic1', unidadeId:'u1', texto:'Dra. Carla, precisamos conversar sobre o caso do João Victor.',                          criacao:_ago(-1,-2) },
    { id:'m4', de:'psic1',  para:'coord1',unidadeId:'u1', texto:'Claro, Ana Paula. Pode me enviar mais detalhes pelo sistema.',                          criacao:_ago(-1,-1) }
  ]
};

/* ============================================================  STORAGE  ============================================================ */
var StorageService = (function () {
  function _normalize(store) {
    if (!store || typeof store !== 'object') store = {};
    store.unidades       = Array.isArray(store.unidades)       ? store.unidades       : JSON.parse(JSON.stringify(SEED.unidades));
    store.administradores= Array.isArray(store.administradores)? store.administradores: JSON.parse(JSON.stringify(SEED.administradores));
    store.psicologos     = Array.isArray(store.psicologos)     ? store.psicologos     : JSON.parse(JSON.stringify(SEED.psicologos));
    store.coordenadores  = Array.isArray(store.coordenadores)  ? store.coordenadores  : JSON.parse(JSON.stringify(SEED.coordenadores));
    store.instrutores    = Array.isArray(store.instrutores)    ? store.instrutores    : JSON.parse(JSON.stringify(SEED.instrutores));
    store.alunos         = Array.isArray(store.alunos)         ? store.alunos         : JSON.parse(JSON.stringify(SEED.alunos));
    store.atendimentos      = Array.isArray(store.atendimentos)      ? store.atendimentos      : JSON.parse(JSON.stringify(SEED.atendimentos));
    store.mensagens      = Array.isArray(store.mensagens)      ? store.mensagens      : JSON.parse(JSON.stringify(SEED.mensagens));
    store.alunos = store.alunos.map(function(a) {
      if (!a || typeof a !== 'object') return a;
      /* CORREÇÃO: sem aprovação, todo aluno cadastrado fica 'ativo' */
      if (!a.statusCadastro || a.statusCadastro === 'pendente' || a.statusCadastro === 'aprovado') a.statusCadastro = 'ativo';
      if (typeof a.pcd !== 'boolean') a.pcd = false;
      a.turnoCurso = Validators.normalizeTurno(a.turnoCurso || '');
      if (!a.unidadeId) a.unidadeId = 'u1';
      return a;
    });
    store.atendimentos = store.atendimentos.map(function(c) {
      if (!c || typeof c !== 'object') return c;
      if (!c.motivoSolicitação && c.motivo) c.motivoSolicitação = c.motivo;
      if (!c.obsResponsavel && c.obsAluno) c.obsResponsavel = c.obsAluno;
      if (!c.unidadeId) c.unidadeId = 'u1';
      return c;
    });
    /* garante campo unidadeId em mensagens */
    store.mensagens = store.mensagens.map(function(m) {
      if (!m.unidadeId) m.unidadeId = 'u1';
      return m;
    });
    return store;
  }
  return {
    init: function() {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) { localStorage.setItem(STORE_KEY, JSON.stringify(_normalize(JSON.parse(JSON.stringify(SEED))))); return; }
      try { localStorage.setItem(STORE_KEY, JSON.stringify(_normalize(JSON.parse(raw)))); }
      catch(e) { localStorage.setItem(STORE_KEY, JSON.stringify(_normalize(JSON.parse(JSON.stringify(SEED))))); }
    },
    get: function() { try { return _normalize(JSON.parse(localStorage.getItem(STORE_KEY))||{}); } catch(e) { return _normalize({}); } },
    save: function(d) { localStorage.setItem(STORE_KEY, JSON.stringify(_normalize(d))); },
    reset: function() { localStorage.setItem(STORE_KEY, JSON.stringify(_normalize(JSON.parse(JSON.stringify(SEED))))); },
    getAluno: function(id) { return this.get().alunos.find(function(a){ return a.id===id; })||null; }
  };
})();
function initStore()  { StorageService.init(); }
function getStore()   { return StorageService.get(); }
function saveStore(d) { StorageService.save(d); }
function resetStore() { StorageService.reset(); }
function getAluno(id) { return StorageService.getAluno(id); }

/* ============================================================  SESSION  ============================================================ */
var SessionService = (function () {
  return {
    get: function() { try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)||'null'); } catch(e) { return null; } },
    set: function(s) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({
        id:s.id, role:s.role, nome:s.nome, disciplina:s.disciplina||null,
        crp:s.crp||null, setor:s.setor||null, turmas:s.turmas||[], unidadeId:s.unidadeId||'u1'
      }));
    },
    clear: function() { sessionStorage.removeItem(SESSION_KEY); }
  };
})();
function getSession()   { return SessionService.get(); }
function clearSession() { SessionService.clear(); }

/* ============================================================  PERMISSIONS  ============================================================ */
var Permissions = (function () {
  function getPsicologa(store, unidadeId) {
    return store.psicologos.find(function(p){ return p.unidadeId===unidadeId; }) || store.psicologos[0];
  }
  /* Todos os usuários da mesma unidade */
  function getUsuariosUnidade(store, unidadeId) {
    var lista = [];
    store.psicologos.forEach(function(u){ if(u.unidadeId===unidadeId) lista.push(u); });
    store.instrutores.forEach(function(u){ if(u.unidadeId===unidadeId) lista.push(u); });
    store.coordenadores.forEach(function(u){ if(u.unidadeId===unidadeId) lista.push(u); });
    return lista;
  }
  function getAlunosVisiveis(sess, alunos) {
    var lista = alunos.filter(function(a){ return a.unidadeId===sess.unidadeId && a.statusCadastro==='ativo'; });
    if (sess.role==='instrutor') {
      var t = Array.isArray(sess.turmas) ? sess.turmas : [];
      lista = lista.filter(function(a){ return t.indexOf(a.turma)>=0; });
    }
    return lista;
  }
  function getAtendimentosVisiveis(sess, atendimentos, alunos) {
    var uc = atendimentos.filter(function(c){ return c.unidadeId===sess.unidadeId; });
    if (sess.role==='psicologa'||sess.role==='coordenacao'||sess.role==='administrador') return uc;
    if (sess.role==='instrutor') {
      var ids = getAlunosVisiveis(sess, alunos).map(function(a){ return a.id; });
      return uc.filter(function(c){ return ids.indexOf(c.idAluno)>=0; });
    }
    return [];
  }
  function podeEncaminharAluno(sess, aluno) {
    if (!sess||!aluno) return false;
    if (aluno.unidadeId!==sess.unidadeId) return false;
    if (sess.role==='coordenacao') return true;
    if (sess.role==='instrutor') { var t=Array.isArray(sess.turmas)?sess.turmas:[]; return t.indexOf(aluno.turma)>=0; }
    return false;
  }
  return { getAlunosVisiveis, getAtendimentosVisiveis, podeEncaminharAluno, getPsicologa, getUsuariosUnidade };
})();

/* ============================================================  VALIDATORS  ============================================================ */
var Validators = (function () {
  function cpf(v) {
    v = String(v||'').replace(/\D/g,'');
    if (v.length!==11||/^(\d)\1{10}$/.test(v)) return false;
    var s=0,r; for(var i=0;i<9;i++) s+=parseInt(v[i])*(10-i); r=(s*10)%11; if(r===10||r===11)r=0; if(r!==parseInt(v[9])) return false;
    s=0; for(var j=0;j<10;j++) s+=parseInt(v[j])*(11-j); r=(s*10)%11; if(r===10||r===11)r=0; return r===parseInt(v[10]);
  }
  function email(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v||'')); }
  function telefone(v) { v=String(v||'').replace(/\D/g,''); return v.length>=10&&v.length<=11; }
  function data(v) { if(!v) return null; var d=new Date(v+'T12:00:00'); return isNaN(d.getTime())?null:d; }
  function normalizeTurno(t) {
    t=String(t||'').toLowerCase().trim();
    if(t==='manha'||t==='manhã') return 'manhã';
    if(t==='tarde') return 'tarde';
    if(t==='noite') return 'noite';
    return '';
  }
  return { cpf, email, telefone, data, normalizeTurno };
})();

/* ============================================================  FORMATTERS  ============================================================ */
function fmtDate(iso) { if(!iso) return '—'; var d=Validators.data(String(iso).slice(0,10)); return d?d.toLocaleDateString('pt-BR'):'—'; }
function fmtDatetime(iso) {
  if(!iso) return '—';
  try { var d=new Date(iso); if(isNaN(d.getTime())) return '—'; return d.toLocaleDateString('pt-BR')+' às '+d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}); } catch(e) { return '—'; }
}
function calcIdade(dn) { if(!dn) return null; var h=new Date(),n=new Date(dn+'T12:00:00'); if(isNaN(n.getTime())) return null; var i=h.getFullYear()-n.getFullYear(),m=h.getMonth()-n.getMonth(); if(m<0||(m===0&&h.getDate()<n.getDate())) i--; return i; }
function isMenor(dn) { var i=calcIdade(dn); return i!==null&&i<18; }
function turnoLabel(t) { var n=Validators.normalizeTurno(t); if(!n) return '—'; return n.charAt(0).toUpperCase()+n.slice(1); }
function nomeUnidade(id) { var u=getStore().unidades.find(function(x){ return x.id===id; }); return u?u.nome:(id||'—'); }
function nomeResponsavel(id) {
  if(!id) return '—';
  var s=getStore();
  var p=s.psicologos.find(function(x){ return x.id===id; }); if(p) return 'Psic. '+p.nome;
  var i=s.instrutores.find(function(x){ return x.id===id; }); if(i) return 'Instr. '+i.nome;
  var c=s.coordenadores.find(function(x){ return x.id===id; }); if(c) return 'Coord. '+c.nome;
  return id;
}
function genId(p) { return (p||'x')+Date.now().toString(36)+Math.random().toString(36).slice(2,6); }

/* ============================================================  TURNO  ============================================================ */
function turnoHoraConfig(t) {
  t=Validators.normalizeTurno(t);
  if(t==='manhã') return {inicio:'08:00',fim:'11:59'};
  if(t==='tarde') return {inicio:'13:00',fim:'17:59'};
  if(t==='noite') return {inicio:'18:00',fim:'21:59'};
  return null;
}
function horarioDentroDoTurno(h,t) { if(!h) return true; var c=turnoHoraConfig(t); if(!c) return true; return h>=c.inicio&&h<=c.fim; }
function getCompatibilidadeAtendimento(aluno, turnoAtendimento, horaAtendimento) {
  var tc=Validators.normalizeTurno(aluno&&aluno.turnoCurso), t=Validators.normalizeTurno(turnoAtendimento);
  if(!tc) return {ok:true,motivo:''};
  if(!t) return {ok:false,motivo:'Selecione o turno da atendimento.'};
  if(t!==tc) return {ok:false,motivo:'A atendimento deve ocorrer no turno do curso do aluno ('+turnoLabel(tc)+').'};
  if(horaAtendimento&&!horarioDentroDoTurno(horaAtendimento,tc)){ var f=turnoHoraConfig(tc); return {ok:false,motivo:'Horário fora do turno ('+f.inicio+' às '+f.fim+').'}; }
  return {ok:true,motivo:''};
}
function descricaoDisponibilidadeAluno(aluno) {
  if(!aluno) return 'Selecione um aluno para ver o turno compatível.';
  var tc=Validators.normalizeTurno(aluno.turnoCurso);
  if(!tc) return 'O aluno não tem turno de curso cadastrado.';
  var f=turnoHoraConfig(tc);
  return 'Curso no turno da '+turnoLabel(tc).toLowerCase()+(f?' ('+f.inicio+' às '+f.fim+').':'.');
}

/* ============================================================  STATUS  ============================================================ */
var STATUS_MAP = { aguardando:{cls:'badge-wait',label:'Aguardando'}, confirmada:{cls:'badge-ok',label:'Confirmada'}, realizada:{cls:'badge-done',label:'Realizada'}, cancelada:{cls:'badge-cancel',label:'Cancelada'}, falta:{cls:'badge-miss',label:'Não compareceu'} };
function statusBadge(s) { var m=STATUS_MAP[s]||{cls:'',label:s||'—'}; return '<span class="badge '+m.cls+'"><span class="badge-dot"></span>'+m.label+'</span>'; }

/* ============================================================  UI  ============================================================ */
function toast(msg, type) {
  type=type||'success'; var c=document.getElementById('toast-container');
  if(!c){c=document.createElement('div');c.id='toast-container';document.body.appendChild(c);}
  var el=document.createElement('div'); el.className='toast '+type;
  var sp=document.createElement('span'); sp.textContent=msg; el.appendChild(sp); c.appendChild(el);
  setTimeout(function(){el.style.opacity='0';},2800); setTimeout(function(){if(el.parentNode)el.parentNode.removeChild(el);},3200);
}
function openModal(id)  { var el=document.getElementById(id); if(el) el.classList.add('open'); }
function closeModal(id) { var el=document.getElementById(id); if(el) el.classList.remove('open'); }

/* ============================================================  ESCAPE / MASKS  ============================================================ */
function escape(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }
function mCPF(el) { var v=el.value.replace(/\D/g,'').slice(0,11); if(v.length>9)v=v.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/,'$1.$2.$3-$4'); else if(v.length>6)v=v.replace(/(\d{3})(\d{3})(\d{0,3})/,'$1.$2.$3'); else if(v.length>3)v=v.replace(/(\d{3})(\d{0,3})/,'$1.$2'); el.value=v; }
function mTel(el) { var v=el.value.replace(/\D/g,'').slice(0,11); if(v.length>10)v=v.replace(/(\d{2})(\d{5})(\d{4})/,'($1) $2-$3'); else if(v.length>6)v=v.replace(/(\d{2})(\d{4,5})(\d{0,4})/,'($1) $2-$3'); else if(v.length>2)v=v.replace(/(\d{2})(\d{0,5})/,'($1) $2'); el.value=v; }

/* ============================================================  AUTH  ============================================================ */
function logout() { clearSession(); window.location.href='../index.html'; }

/**
 * Login com validação de usuário + senha + unidade
 * REGRA CRÍTICA: cada pessoa tem login individual.
 * Se unidadeId for fornecido, valida que o usuário pertence àquela unidade.
 */
function login(role, usuario, senha, unidadeId) {
  var store=getStore(), user=null;
  if(role==='administrador') user=store.administradores.find(function(a){ return (a.usuario===usuario||a.cpf===usuario)&&a.senha===senha; });
  else if(role==='psicologa')   user=store.psicologos.find(function(p){ return (p.usuario===usuario||p.cpf===usuario)&&p.senha===senha; });
  else if(role==='coordenacao') user=store.coordenadores.find(function(c){ return (c.usuario===usuario||c.cpf===usuario)&&c.senha===senha; });
  else if(role==='instrutor')   user=store.instrutores.find(function(i){ return (i.usuario===usuario||i.cpf===usuario)&&i.senha===senha; });
  if(!user) return {ok:false, msg:'Usuário ou senha incorretos.'};
  /* VALIDAÇÃO DE UNIDADE: se unidade foi fornecida, deve bater */
  if(unidadeId && user.unidadeId !== unidadeId) {
    return {ok:false, msg:'Acesso negado: este usuário não pertence à unidade selecionada.'};
  }
  SessionService.set({ id:user.id, role, nome:user.nome, disciplina:user.disciplina||null, crp:user.crp||null, setor:user.setor||null, turmas:user.turmas||[], unidadeId:user.unidadeId||'u1' });
  return {ok:true};
}
