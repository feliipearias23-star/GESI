// ==UserScript==
// @name         GESI - Obligatorios NEW 1.0
// @namespace    http://tampermonkey.net/
// @version      2.13
// @description  Marca campos obligatorios de forma persistente (fondo azul) y permite excluir campos específicos; soporta manualIds con reintentos. Añade validación de FechaIntervencion por mes/año. (v2.13: sin chequeo continuo de fondo, solo al cargar / cambiar de pestaña / guardar)
// @match        https://gesiapps.saludcapital.gov.co/*
// @grant        none
// ==/UserScript==

(function () {
'use strict';
// CONFIG - AQUI AGREGAS TUS valorControlNNNN Y EXCLUSIONES
const CONFIG = {
  colorObligatorioFondo: 'rgba(100,180,255,0.30)', mostrarBorde: false, colorObligatorioBorde: '#64b4ff',
  debounceMs: 300, keepColorWhenFilled: true, manualSelectors: [ /* '#otroSelectorOpcional' */ ],
  manualIds: ['valorControl17354','valorControl17355','valorControl17512','valorControl19232',' valorControl19389','valorControl19255'], // ids a marcar aunque no tengan asterisco
  manualExcludes: ['valorControl17380','valorControl17381','valorControl17383','valorControl17384','valorControl17379','valorControl17382','valorControl19224'] // 'valorControlNNNN' o selector CSS
};
const DEBUG=false;
function log(...a){ if(DEBUG) console.log('[GESI]',...a); }
function warn(...a){ if(DEBUG) console.warn('[GESI]',...a); }

// Inserta regla CSS persistente que respeta la exclusión
(function insertCss(){
  const existing=document.getElementById('__gesi_obligatorios_style');
  if(existing) existing.remove();
  const style=document.createElement('style');
  style.id='__gesi_obligatorios_style';
  const borderRule=CONFIG.mostrarBorde ? `border:2px solid ${CONFIG.colorObligatorioBorde} !important; box-shadow:0 0 0 1px rgba(100,180,255,0.25) !important;` : '';
  style.textContent=`[data-gesi-obligatorio="true"]:not([data-gesi-excluir="true"]) { background-color: ${CONFIG.colorObligatorioFondo} !important; ${borderRule} }`;
  document.head && document.head.appendChild(style);
})();

function limpiarEstiloInline(el){ if(!el||!el.style) return; el.style.removeProperty('background-color'); el.style.removeProperty('border'); el.style.removeProperty('box-shadow'); }
const TAGS=['INPUT','SELECT','TEXTAREA'];
const esControlValido=el=>el && el.type!=='hidden' && TAGS.includes(el.tagName);
const soloVisibles=els=>els.filter(el=>el.type!=='hidden');

function controlesEnFila(fila){
  const controles=soloVisibles(Array.from(fila.querySelectorAll('input, select, textarea')));
  if(controles.length===1) return controles[0];
  if(controles.length>1) return controles.find(c=>c.tagName==='SELECT') || controles[0];
  const siguiente=fila.nextElementSibling;
  if(siguiente){ const c2=soloVisibles(Array.from(siguiente.querySelectorAll('input, select, textarea'))); if(c2.length>0) return c2[0]; }
  return null; // sin match: el llamador decide si sigue con otro fallback
}

function obtenerControlGESI(idCampo, tdEtiqueta){
  if(!idCampo) return null;
  try {
    if(typeof idCampo==='string' && (idCampo.startsWith('#')||idCampo.startsWith('.'))){
      const sel=document.querySelector(idCampo);
      if(esControlValido(sel)) return sel;
      if(sel){ const child=sel.querySelector && sel.querySelector('input, select, textarea'); if(child && child.type!=='hidden') return child; }
    }
  } catch(e){}
  const byId=document.getElementById(idCampo);
  if(esControlValido(byId)) return byId;
  try { const q=document.querySelector(`[id$="${idCampo}"]`); if(esControlValido(q)) return q; } catch(e){}
  try { const q2=document.querySelector(`[id*="${idCampo}"]`); if(esControlValido(q2)) return q2; } catch(e){}
  try { const n=document.querySelector(`[name*="${idCampo}"]`); if(esControlValido(n)) return n; } catch(e){}
  const candidatos=Array.from(document.querySelectorAll('input, select, textarea'));
  const encontrado=candidatos.find(el=>{
    if(el.type==='hidden') return false;
    const id=el.id||'', name=el.name||'', attrs=Array.from(el.attributes||[]).map(a=>`${a.name}="${a.value}"`).join(' ');
    return id===idCampo||name===idCampo||id.includes(idCampo)||name.includes(idCampo)||attrs.includes(idCampo);
  });
  if(encontrado) return encontrado;
  if(tdEtiqueta){
    const fila=tdEtiqueta.closest && tdEtiqueta.closest('tr');
    if(fila){ const r=controlesEnFila(fila); if(r) return r; } // sin match sigue al fallback de label
  }
  try { // label fallback
    for(const l of Array.from(document.querySelectorAll('label, td, th, span'))){
      const txt=(l.textContent||'').toLowerCase();
      if(txt.includes(idCampo.toLowerCase())){
        const cercano=(l.querySelector && l.querySelector('input, select, textarea')) || (l.closest && l.closest('tr') && l.closest('tr').querySelector('input, select, textarea'));
        if(cercano && cercano.type!=='hidden') return cercano;
      }
    }
  } catch(e){}
  return null;
}

function buscarCampoCerca(elementoTexto){
  if(!elementoTexto) return null;
  const nodoBase=t=>t.nodeType===3 ? t.parentElement : t;
  const labelFor=elementoTexto.closest ? elementoTexto.closest('label[for]') : null;
  if(labelFor && labelFor.htmlFor){ const campo=document.getElementById(labelFor.htmlFor); if(campo) return campo; }
  let contenedor=nodoBase(elementoTexto);
  for(let i=0;i<6 && contenedor;i++){ const campo=contenedor.querySelector && contenedor.querySelector('input, select, textarea'); if(campo) return campo; contenedor=contenedor.parentElement; }
  let hermano=nodoBase(elementoTexto).nextElementSibling, intentos=0;
  while(hermano && intentos<8){
    if(TAGS.includes(hermano.tagName)) return hermano;
    const campo=hermano.querySelector && hermano.querySelector('input, select, textarea');
    if(campo) return campo;
    hermano=hermano.nextElementSibling; intentos++;
  }
  const base=nodoBase(elementoTexto), td=base.closest ? base.closest('td, th') : null;
  if(td){ const fila=td.closest('tr'); if(fila) return controlesEnFila(fila); }
  return null;
}

function nodeIndicatesRequired(node){
  if(!node) return false;
  try {
    if(node.querySelector){
      const candidatos=node.querySelectorAll('font, span, b, strong, i, sup, small, [class]');
      for(const el of candidatos){
        const txt=(el.textContent||'').trim();
        const cls=(el.className||'').toLowerCase ? (el.className||'').toString().toLowerCase() : '';
        if(txt==='*'||txt.startsWith('*')) return true;
        if(el.tagName==='FONT' && (el.getAttribute('color')||'').toLowerCase().includes('red') && txt.includes('*')) return true;
        if(cls.includes('required')||cls.includes('oblig')) return true;
      }
    }
  } catch(e){}
  const text=(node.textContent||'').replace(/\u00A0/g,' ').trim();
  return text ? /\*\s| \*|^\*| \*$/.test(text) : false;
}

function findRequiredLabelNodes(){
  const nodes=[];
  const selectors=['label','td[title*="Control: valorControl"]','td[title*="Control:"]','th','span','font','b','strong','div'];
  for(const el of document.querySelectorAll(selectors.join(','))){

    if(nodeIndicatesRequired(el)){
      try { const style=window.getComputedStyle(el); if(style && (style.display==='none'||style.visibility==='hidden'||parseFloat(style.opacity)===0)) continue; } catch(e){}
      nodes.push(el); continue;
    }
    if(el.tagName==='LABEL' && el.htmlFor){ const c=document.getElementById(el.htmlFor); if(c && (c.getAttribute('required')!==null||c.getAttribute('aria-required')==='true')) nodes.push(el); }
  }
  for(const c of document.querySelectorAll('input[required], select[required], textarea[required], [aria-required="true"]')){
    let label=c.id ? document.querySelector(`label[for="${c.id}"]`) : null;
    if(!label){ const maybe=c.closest && c.closest('td, th, tr'); if(maybe){ const lbl=maybe.querySelector('label, td, th, span, b, strong'); if(lbl) label=lbl; } }
    const target=label||c;
    if(!nodes.includes(target)) nodes.push(target);
  }
  return nodes;
}

// comprobar si un elemento coincide con alguna exclusión (manualExcludes)
function elementIsExcluded(el){
  if(!el) return false;
  for(const ex of CONFIG.manualExcludes||[]){
    try {
      if(typeof ex!=='string') continue;
      if(ex.startsWith('#')||ex.startsWith('.')||ex.includes('[')||ex.includes(' ')){
        try { if(el.matches && el.matches(ex)) return true; } catch(e){} // selector inválido para matches -> ignorar
        try { if(el.closest && el.closest(ex)) return true; } catch(e){}
      } else {
        const id=el.id||'', name=el.name||'';
        if(id===ex||id.includes(ex)||name===ex||name.includes(ex)) return true;
      }
    } catch(e){}
  }
  return false;
}

function marcarSiNoExcluido(el, nuevos){ if(!elementIsExcluded(el)) nuevos.add(el); else try { el.dataset.gesiExcluir='true'; } catch(e){} }

// marcarCamposObligatorios con diffing y respeto a exclusiones
function marcarCamposObligatorios(){
  const nuevos=new Set();
  for(const nodo of findRequiredLabelNodes()){
    let control = (nodo.tagName && TAGS.includes(nodo.tagName)) ? nodo : null;
    if(!control){
      let idCampo=null;
      try { const title=nodo.getAttribute && nodo.getAttribute('title'); if(title){ const m=title.match(/Control:\s*(valorControl\d+)/i); if(m) idCampo=m[1]; } } catch(e){}
      control = (idCampo && obtenerControlGESI(idCampo, nodo)) || buscarCampoCerca(nodo) || (nodo.tagName==='LABEL' && nodo.htmlFor ? document.getElementById(nodo.htmlFor) : null);
    }
    if(control) marcarSiNoExcluido(control, nuevos);
  }
  for(const sel of CONFIG.manualSelectors||[]){
    try {
      for(const m of Array.from(document.querySelectorAll(sel))){
        let target=m;
        if(m.tagName && !TAGS.includes(m.tagName)){ const inside=m.querySelector && m.querySelector('input, select, textarea'); if(inside) target=inside; }
        if(target) marcarSiNoExcluido(target, nuevos);
      }
    } catch(e){ warn('manualSelector inválido:', sel, e); }
  }
  for(const id of CONFIG.manualIds||[]){
    const el=obtenerControlGESI(id, null) || (id.startsWith('#') ? document.querySelector(id) : document.getElementById(id));
    if(esControlValido(el)) marcarSiNoExcluido(el, nuevos);
  }
  const actuales=new Set(Array.from(document.querySelectorAll('[data-gesi-obligatorio="true"]')));
  for(const el of actuales) if(!nuevos.has(el)){
    try { delete el.dataset.gesiObligatorio; delete el.dataset.gesiEtiqueta; delete el.dataset.gesiControlId; delete el.dataset.gesiManual; limpiarEstiloInline(el); } catch(e){} // no borra data-gesi-excluir: permite reexcluir
  }
  for(const el of nuevos) if(!actuales.has(el)){
    try { el.dataset.gesiObligatorio='true'; if(el.dataset.gesiExcluir) delete el.dataset.gesiExcluir; } catch(e){}
  }
  log('marcado diff: actuales=', actuales.size, 'nuevos=', nuevos.size);
}

// manualIds con reintentos
const pendingManualIds=new Map();
function tryResolveManualId(id){
  const el=obtenerControlGESI(id, null) || (id.startsWith('#') ? document.querySelector(id) : document.getElementById(id));
  if(!esControlValido(el)) return false;
  el.dataset.gesiObligatorio='true'; el.dataset.gesiManual='true'; el.dataset.gesiControlId=id;
  try { el.dataset.gesiEtiqueta=id; } catch(e){}
  pendingManualIds.delete(id);
  log('manualId resuelto y marcado:', id);
  return true;
}
function schedulePendingRetries(){
  if(schedulePendingRetries._timer) return;
  schedulePendingRetries._timer=setInterval(()=>{
    for(const [id, info] of Array.from(pendingManualIds.entries())){
      if(info.attempts>=info.max){ log('manualId no encontrado tras intentos:', id); pendingManualIds.delete(id); continue; }
      info.attempts++; tryResolveManualId(id);
    }
    if(pendingManualIds.size===0){ clearInterval(schedulePendingRetries._timer); schedulePendingRetries._timer=null; }
  }, 800);
}

function marcarOEliminarExcluir(idOrSelector, marcar){
  try {
    const setFlag=el=>{ try { marcar ? el.dataset.gesiExcluir='true' : delete el.dataset.gesiExcluir; } catch(e){} };
    if(idOrSelector.startsWith('#')||idOrSelector.startsWith('.')||idOrSelector.includes('[')||idOrSelector.includes(' ')){
      Array.from(document.querySelectorAll(idOrSelector)).forEach(setFlag);
    } else {
      for(const el of Array.from(document.querySelectorAll('input, select, textarea'))){
        const id=el.id||'', name=el.name||'';
        if(id===idOrSelector||id.includes(idOrSelector)||name===idOrSelector||name.includes(idOrSelector)) setFlag(el);
      }
    }
  } catch(e){}
}

window.gesi_addExclude=function(idOrSelector){
  if(!idOrSelector) return console.warn('[GESI] exclude vacío');
  if(!CONFIG.manualExcludes) CONFIG.manualExcludes=[];
  if(!CONFIG.manualExcludes.includes(idOrSelector)) CONFIG.manualExcludes.push(idOrSelector);
  marcarOEliminarExcluir(idOrSelector, true);
  marcarCamposObligatorios();
  console.log('[GESI] añadido exclude:', idOrSelector);
};
window.gesi_removeExclude=function(idOrSelector){
  if(!idOrSelector) return console.warn('[GESI] remove exclude vacío');
  if(!CONFIG.manualExcludes) CONFIG.manualExcludes=[];
  CONFIG.manualExcludes=CONFIG.manualExcludes.filter(x=>x!==idOrSelector);
  marcarOEliminarExcluir(idOrSelector, false);
  marcarCamposObligatorios();
  console.log('[GESI] removed exclude:', idOrSelector);
};
window.gesi_addManualId=function(id){
  if(!id) return console.warn('[GESI] manual id vacío');
  id=String(id).trim();
  if(!CONFIG.manualIds) CONFIG.manualIds=[];
  if(!CONFIG.manualIds.includes(id)) CONFIG.manualIds.push(id);
  if(tryResolveManualId(id)) console.log('[GESI] manualId aplicado:', id);
  else { pendingManualIds.set(id, {attempts:0, max:20}); schedulePendingRetries(); console.log('[GESI] manualId pendiente, intentando:', id); }
};
window.gesi_addManualSelector=function(sel){
  if(!sel) return console.warn('[GESI] manual selector vacío');
  if(!CONFIG.manualSelectors) CONFIG.manualSelectors=[];
  if(!CONFIG.manualSelectors.includes(sel)) CONFIG.manualSelectors.push(sel);
  marcarCamposObligatorios();
  console.log('[GESI] manual selector añadido y aplicado:', sel);
};
window.gesi_refreshObligatorios=function(){ marcarCamposObligatorios(); };
window.__gesi_obtenerControlGESI=obtenerControlGESI;

function initManualIdsFromConfig(){
  for(const id of CONFIG.manualIds||[]) window.gesi_addManualId(id);
  for(const ex of CONFIG.manualExcludes||[]) try { window.gesi_addExclude(ex); } catch(e){}
}

const MIN_INTERVALO_ESCANEO = Math.max(CONFIG.debounceMs || 300, 200);

function ejecutarEscaneoCompleto(){
  marcarCamposObligatorios();
  attachButtonClickPrevention();
}

const SELECTOR_BOTONES_GUARDAR='button[type="submit"], input[type="submit"], #botonActualizarInformacion, [onclick*="uardar"], [onclick*="rear"], .btn-guardar, [data-action="save"]';

function iniciarDetectorObligatorios(){
  // 1) Carga inicial: pasadas espaciadas y luego se detiene.
  ejecutarEscaneoCompleto();
  setTimeout(ejecutarEscaneoCompleto, 600);
  setTimeout(ejecutarEscaneoCompleto, 1500);
  setTimeout(ejecutarEscaneoCompleto, 3000);

  // 2) Cambios de pestaña/sección del formulario.
  document.addEventListener('click', (e)=>{
    const boton=e.target.closest && e.target.closest('button, a, li, [role="tab"]');
    if(!boton) return;
    setTimeout(ejecutarEscaneoCompleto,250); setTimeout(ejecutarEscaneoCompleto,900);
  }, true);

  document.addEventListener('click', (e)=>{
    const boton=e.target.closest && e.target.closest(SELECTOR_BOTONES_GUARDAR);
    if(boton) ejecutarEscaneoCompleto();
  }, true);
}
initManualIdsFromConfig();

// BLOQUE ADICIONAL: Validación FechaIntervencion por mes/año permitido
(function enforceFechaMes() {
  const ALLOWED_MONTH=8; // 1=enero ... 8=agosto
  const ALLOWED_YEAR=2026; // número o null para permitir cualquier año
  const DATE_SELECTOR='#FechaIntervencion', PRIMARY_SUBMIT_SELECTOR='#botonActualizarInformacion';
  const ADDITIONAL_SUBMIT_SELECTORS=['button[type="submit"]','input[type="submit"]'];
  const ENFORCE_ON_CREATE_ONLY=true; // true = validar sólo al CREAR (ID registro === 0). false = validar siempre
  const MESSAGE_CLASS='__gesi_fecha_error';

  function parseDateDDMMYYYY(str){
    if(!str) return null;
    const m=(str||'').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if(!m) return null;
    const d=parseInt(m[1],10), mo=parseInt(m[2],10), y=parseInt(m[3],10), dt=new Date(y, mo-1, d);
    return (dt.getFullYear()!==y||dt.getMonth()!==mo-1||dt.getDate()!==d) ? null : dt;
  }

  function detectCreationMode(){
    try { // 1) title del submit principal (ej. "... | ID registro:  0")
      const btn=document.querySelector(PRIMARY_SUBMIT_SELECTOR);
      if(btn && btn.title){ const m=btn.title.match(/ID\s*registro\s*[:\-]?\s*(\d+)/i); if(m) return parseInt(m[1].trim(),10)===0; }
    } catch(e){}
    try { // 2) inputs ocultos con id/registro en el nombre
      for(const inp of Array.from(document.querySelectorAll('input[type="hidden"], input'))){
        const nm=(inp.name||'').toLowerCase(), id=(inp.id||'').toLowerCase();
        if(/idregistro|registroid|id_record|id_registro|idregistro/i.test(nm+' '+id)){
          const val=(inp.value||'').trim();
          if(val!==''){ const num=parseInt(val,10); if(!isNaN(num)) return num===0; }
        }
      }
    } catch(e){}
    try { const u=location.href.toLowerCase(); if(u.includes('/nuevo')||u.includes('accion=nuevo')||u.includes('mode=create')||u.includes('create')) return true; } catch(e){} // 3) url de creación
    return null; // 4) indeterminado
  }

  function getButtonsSet(){
    const set=new Set();
    try { const primary=document.querySelector(PRIMARY_SUBMIT_SELECTOR); if(primary) set.add(primary); } catch(e){}
    for(const sel of ADDITIONAL_SUBMIT_SELECTORS) try { Array.from(document.querySelectorAll(sel)).forEach(b=>set.add(b)); } catch(e){}
    if(set.size===0) Array.from(document.querySelectorAll('button,input[type="button"],input[type="submit"]')).forEach(b=>{
      const txt=(b.innerText||b.value||'').toLowerCase();
      if(/crear|guardar|registrar|enviar|actualizar|save|create|confirmar/.test(txt)) set.add(b);
    });
    return Array.from(set);
  }

  function clearError(inputEl){
    if(!inputEl) return;
    try { inputEl.style.border=''; inputEl.style.background=''; const prev=(inputEl.parentNode||document).querySelector('.'+MESSAGE_CLASS); if(prev) prev.remove(); } catch(e){}
    getButtonsSet().forEach(b=>{ try { b.disabled=false; } catch(e){} });
  }

  function showError(inputEl, msg){
    if(!inputEl) return;
    clearError(inputEl);
    inputEl.style.border='2px solid red'; inputEl.style.background='#fff0f0';
    const div=document.createElement('div');
    div.className=MESSAGE_CLASS; div.textContent=msg;
    Object.assign(div.style, { color:'#b30000', background:'#ffe6e6', padding:'6px', marginTop:'4px', border:'1px solid #ff9999', borderRadius:'4px', fontSize:'12px' });
    try { if(inputEl.parentNode) inputEl.parentNode.appendChild(div); else document.body.appendChild(div); } catch(e){ document.body.appendChild(div); }
    getButtonsSet().forEach(b=>{ try { b.disabled=true; } catch(e){} });
  }

  function checkAndToggle(){
    const input=document.querySelector(DATE_SELECTOR);
    if(!input) return true; // no hay campo: no bloquear
    const mode=detectCreationMode(); // true=create, false=edit, null=indeterminado
    if(ENFORCE_ON_CREATE_ONLY && (mode===false||mode===null)){ clearError(input); return true; } // en edición o indeterminado no se bloquea
    const val=(input.value||'').trim();
    if(!val){ showError(input, '⚠ Fecha vacía. Debe ingresar una fecha en formato DD/MM/AAAA del mes permitido.'); return false; }
    const dt=parseDateDDMMYYYY(val);
    if(!dt){ showError(input, '⚠ Fecha inválida. Formato esperado DD/MM/AAAA.'); return false; }
    const month=dt.getMonth()+1, year=dt.getFullYear();
    if((ALLOWED_MONTH && month!==ALLOWED_MONTH) || (ALLOWED_YEAR && year!==ALLOWED_YEAR)){
      const monthName=(new Date(year, ALLOWED_MONTH-1, 1)).toLocaleString('es-CO', { month:'long' });
      showError(input, `⚠ Solo se permiten fechas de ${monthName}${ALLOWED_YEAR ? ' de '+ALLOWED_YEAR : ''}. Ajusta la fecha.`);
      return false;
    }
    clearError(input);
    return true;
  }

  function preventInvalidSubmitHandler(ev){
    if(checkAndToggle()) return;
    ev.preventDefault(); ev.stopImmediatePropagation();
    try { const input=document.querySelector(DATE_SELECTOR); if(input) input.focus(); } catch(e){}
  }

  function attachButtonClickPrevention(){
    getButtonsSet().forEach(b=>{
      if(!b || b.__gesi__hasClickGuard) return;
      b.addEventListener('click', function(ev){ if(!checkAndToggle()){ ev.preventDefault(); ev.stopPropagation(); try { b.blur(); } catch(e){} } }, true);
      b.__gesi__hasClickGuard=true;
    });
  }

  window.__gesi_attachButtonClickPrevention=attachButtonClickPrevention;

  function start(){
    document.addEventListener('submit', preventInvalidSubmitHandler, true);
    const attemptAttach=setInterval(()=>{
      const input=document.querySelector(DATE_SELECTOR);
      if(!input) return;
      ['input','change','blur'].forEach(ev=>input.addEventListener(ev, ()=>setTimeout(checkAndToggle,120), true));
      attachButtonClickPrevention();
      setTimeout(checkAndToggle, 300);
      clearInterval(attemptAttach);
    }, 300);
  }

  if(document.readyState==='complete') start(); else window.addEventListener('load', start);
})();

function attachButtonClickPrevention(){ if(window.__gesi_attachButtonClickPrevention) window.__gesi_attachButtonClickPrevention(); }

iniciarDetectorObligatorios();

})();
