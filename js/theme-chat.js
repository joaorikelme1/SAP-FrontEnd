/* theme-chat.js — Tema escuro/claro para painéis SAP SENAC CEP */
'use strict';

function sapApplyTheme(t) {
  document.documentElement.setAttribute('data-theme', t || 'light');
  document.querySelectorAll('.ico-moon').forEach(function(el) {
    el.style.display = t === 'dark' ? 'none' : 'block';
  });
  document.querySelectorAll('.ico-sun').forEach(function(el) {
    el.style.display = t === 'dark' ? 'block' : 'none';
  });
}
function sapToggleTheme() {
  var cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  localStorage.setItem('sap_theme', cur);
  sapApplyTheme(cur);
}
function sapInitTheme() {
  sapApplyTheme(localStorage.getItem('sap_theme') || 'light');
}

document.addEventListener('DOMContentLoaded', function() {
  sapInitTheme();
});
