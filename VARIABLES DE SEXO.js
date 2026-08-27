// ==UserScript==
// @name         VALIDADOR SEXO NEW 1.0
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Valida orientación sexual / identidad de género según la edad; soporte múltiples bases, modal simple que se puede aceptar (dismiss) por campo.
// @match        https://gesiapps.saludcapital.gov.co/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';
    const CONFIG = {
        bases: [ {
              name: 'EDUCATIVO',
              idOrientacionSexual:  ['valorControl17514','valorControl23735'],
              idIdentidadGenero: ['valorControl17515', 'valorControl23736'],
              idEdad: ['valorControl19845','valorControl22690'],
              valorNoAplicaOrientacion: '4028',
              valorNoAplicaIdentidad: '4020',
        },
                {
              name: 'COMUNITARIO',
              idOrientacionSexual: ['valorControl19391'],
              idIdentidadGenero: ['valorControl19392'],
              idEdad: ['valorControl19956'],
              valorNoAplicaOrientacion: '4028',
              valorNoAplicaIdentidad: '4020'
            },
                {
              name: 'INSTITUCIONAL',
              idOrientacionSexual: ['valorControl19135'],
              idIdentidadGenero: ['valorControl19136'],
              idEdad: ['valorControl19954'],
              valorNoAplicaOrientacion: '4028',
              valorNoAplicaIdentidad: '4020'
            },
                {
              name: 'LABORAL',
              idOrientacionSexual: ['valorControl19647'],
              idIdentidadGenero: ['valorControl19648'],
              idEdad: ['valorControl19958'],
              valorNoAplicaOrientacion: '4028',
              valorNoAplicaIdentidad: '4020'
            }
               ],

        valorNoAplicaOrientacion: null,
        valorNoAplicaIdentidad:   null,

        edadLimite: 14,
        colorErrorFondo: '#ffe0e0',
        colorErrorBorde: '#ff4d4d',

        manualIdMaxRetries: 20,
        manualIdRetryIntervalMs: 700
    };
    let DEBUG = false;
    function log(...args){ if (DEBUG) console.log('[GESI-sex]', ...args); }

    // UTILIDADES: búsqueda, edad, no-aplica
       function obtenerControlGESI(idCampo) {
        if (!idCampo) return null;
        try {
            if (typeof idCampo === 'string' && (idCampo.startsWith('#') || idCampo.startsWith('.'))) {
                const sel = document.querySelector(idCampo);
                if (sel) return (['INPUT','SELECT','TEXTAREA'].includes(sel.tagName) ? sel : sel.querySelector('input, select, textarea'));
            }
        } catch(e){}
        try { const byId = document.getElementById(idCampo); if (byId) return byId; } catch(e){}
        try { const q1 = document.querySelector(`[id$="${idCampo}"]`); if (q1) return q1; } catch(e){}
        try { const q2 = document.querySelector(`[id*="${idCampo}"]`); if (q2) return q2; } catch(e){}
        try { const n = document.querySelector(`[name*="${idCampo}"]`); if (n) return n; } catch(e){}
        try {
            const candidatos = Array.from(document.querySelectorAll('input, select, textarea'));
            return candidatos.find(el => {
                if (el.type === 'hidden') return false;
                const id = el.id || '', name = el.name || '';
                if (id === idCampo || name === idCampo) return true;
                if (id.includes(idCampo) || name.includes(idCampo)) return true;
                const attrs = Array.from(el.attributes || []).map(a => `${a.name}="${a.value}"`).join(' ');
                return attrs.includes(idCampo);
            }) || null;
        } catch(e){}
        try {
            const labels = Array.from(document.querySelectorAll('label, td, th, span'));
            for (const l of labels) {
                const txt = (l.textContent || '').toLowerCase();
                if (!txt) continue;
                if (txt.includes(String(idCampo).toLowerCase())) {
                    const cercano = (l.querySelector && l.querySelector('input,select,textarea')) || (l.closest && l.closest('tr') && l.closest('tr').querySelector('input,select,textarea'));
                    if (cercano) return cercano;
                }
            }
        } catch(e){}
        return null;
    }
    // Helper: acepta string o array; devuelve el primer elemento DOM encontrado entre las opciones (o null)
function resolveFieldOption(opt) {
    if (!opt) return null;
    const list = Array.isArray(opt) ? opt : [opt];
    for (const o of list) {
        try {
            if (!o) continue;
            const el = obtenerControlGESI(o);
            if (el) return el;
        } catch(e){}
    }
    return null;
}
    function calcularEdad(fechaStr) {
        if (!fechaStr) return null;
        let d = null;
        if (fechaStr.includes('/')) {
            const p = fechaStr.split('/');
            if (p.length >= 3) d = new Date(p[2], p[1]-1, p[0]);
        } else if (fechaStr.includes('-')) {
            const p = fechaStr.split('-');
            if (p.length >= 3) d = new Date(p[0], p[1]-1, p[2]);
        } else {
            const f = new Date(fechaStr);
            if (!isNaN(f.getTime())) d = f;
        }
        if (!d) return null;
        const hoy = new Date();
        let edad = hoy.getFullYear() - d.getFullYear();
        const dm = hoy.getMonth() - d.getMonth();
        if (dm < 0 || (dm === 0 && hoy.getDate() < d.getDate())) edad--;
        return edad;
    }
    function detectarValorNoAplica(select) {
        if (!select || select.tagName !== 'SELECT') return null;
        for (const opt of Array.from(select.options)) {
            const txt = (opt.text || '').toLowerCase();
            if (txt.includes('no aplica') || txt.includes('noaplica')) return opt.value;
        }
        return null;
    }
    function esNoAplica(campo, valorNoAp) {
        if (!campo) return false;
        if (valorNoAp && String(campo.value) === String(valorNoAp)) return true;
        if (campo.tagName === 'SELECT') {
            const opt = campo.options[campo.selectedIndex];
            if (opt) {
                const txt = (opt.text || '').toLowerCase();
                if (txt.includes('no aplica') || txt.includes('noaplica')) return true;
            }
        } else {
            const v = (campo.value || '').toLowerCase();
            if (v.includes('no aplica') || v.includes('noaplica')) return true;
        }
        return false;
    }
    function limpiarEstilo(el) {
        if (!el || !el.style) return;
        el.style.removeProperty('background-color');
        el.style.removeProperty('border');
        el.style.removeProperty('box-shadow');
        try { delete el.dataset.gesiErrorSexo; } catch(e){}
    }
    let modalEl = null;
    const dismissedElems = new Set();
    function crearModalSimple() {
        if (modalEl) return modalEl;
        const overlay = document.createElement('div');
        overlay.id = '__gesi_sexo_modal_overlay';
        overlay.style.position = 'fixed';
        overlay.style.left = '0';
        overlay.style.top = '0';
        overlay.style.right = '0';
        overlay.style.bottom = '0';
        overlay.style.background = 'rgba(0,0,0,0.35)';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.zIndex = '99999';
        overlay.style.visibility = 'hidden';

        const box = document.createElement('div');
        box.style.background = '#fff';
        box.style.padding = '14px';
        box.style.borderRadius = '6px';
        box.style.boxShadow = '0 6px 20px rgba(0,0,0,0.2)';
        box.style.maxWidth = '360px';
        box.style.width = '90%';
        box.style.textAlign = 'center';
        box.style.fontFamily = 'Arial, sans-serif';

        const msg = document.createElement('div');
        msg.id = '__gesi_sexo_modal_msg';
        msg.style.marginBottom = '12px';
        msg.style.fontSize = '14px';
        msg.style.color = '#222';
        msg.textContent = 'Verificar variables de sexo (orientación sexual / identidad de género según la edad).';

        const btn = document.createElement('button');
        btn.textContent = 'Aceptar';
        btn.style.padding = '8px 14px';
        btn.style.border = 'none';
        btn.style.background = '#3399ff';
        btn.style.color = '#fff';
        btn.style.borderRadius = '4px';
        btn.style.cursor = 'pointer';

        btn.addEventListener('click', () => {
            const errores = Array.from(document.querySelectorAll('[data-gesi-error-sexo="true"]'));
            errores.forEach(el => {
                try {
                    dismissedElems.add(el);
                    const clearFn = function () {
                        try {
                            dismissedElems.delete(el);
                            el.removeEventListener('input', clearFn);
                            el.removeEventListener('change', clearFn);
                        } catch(e){}
                    };
                    try { el.addEventListener('input', clearFn); el.addEventListener('change', clearFn); } catch(e){}
                } catch(e){}
            });
            overlay.style.visibility = 'hidden';
        });
        box.appendChild(msg);
        box.appendChild(btn);
        overlay.appendChild(box);
        document.body.appendChild(overlay);

        modalEl = overlay;
        return modalEl;
    }
    function showModalIfAllowed() {
        const m = crearModalSimple();
        const errores = Array.from(document.querySelectorAll('[data-gesi-error-sexo="true"]'));
        if (errores.length > 0) {
            const allDismissed = errores.every(el => dismissedElems.has(el));
            if (allDismissed) {
                log('Modal suprimido por dismiss.');
                return;
            }
            m.style.visibility = 'visible';
        }
    }
    function hideModal() { const m = crearModalSimple(); if (m) m.style.visibility = 'hidden'; }


    // VALIDACIÓN por base
   function localizarCamposBase(base) {
    // base fields can be string or array; resolveFieldOption returns the first DOM element found
    const orient = resolveFieldOption(base.idOrientacionSexual != null ? base.idOrientacionSexual : CONFIG.idOrientacionSexual) || null;
    const ident  = resolveFieldOption(base.idIdentidadGenero != null ? base.idIdentidadGenero : CONFIG.idIdentidadGenero)   || null;
    const edadControl = resolveFieldOption(base.idEdad != null ? base.idEdad : CONFIG.idEdad) || null;
    const fechaControl = resolveFieldOption(base.idFechaNacimiento != null ? base.idFechaNacimiento : CONFIG.idFechaNacimiento) || null;
    return { orient, ident, edadControl, fechaControl };
}
    function validarBase(base) {
        const found = localizarCamposBase(base);
        const messages = [];
        const errors = [];

        if (!found.orient || !found.ident) {
            if (!found.orient) messages.push('No se encontró campo de Orientación Sexual (id: ' + (base.idOrientacionSexual || CONFIG.idOrientacionSexual || '-') + ')');
            if (!found.ident)  messages.push('No se encontró campo de Identidad de Género (id: ' + (base.idIdentidadGenero || CONFIG.idIdentidadGenero || '-') + ')');
            return { ok: true, messages, errors, fields: found };
        }
        const vNoApOrient = base.valorNoAplicaOrientacion != null ? base.valorNoAplicaOrientacion : (CONFIG.valorNoAplicaOrientacion || detectarValorNoAplica(found.orient));
        const vNoApIdent  = base.valorNoAplicaIdentidad != null ? base.valorNoAplicaIdentidad : (CONFIG.valorNoAplicaIdentidad || detectarValorNoAplica(found.ident));

        let edad = null;
        if (found.edadControl && found.edadControl.value && !isNaN(parseInt(found.edadControl.value,10))) {
            edad = parseInt(found.edadControl.value,10);
        } else if (found.fechaControl && found.fechaControl.value) {
            edad = calcularEdad(found.fechaControl.value);
        }
        if (edad === null) {
            messages.push('Edad no disponible (campo edad/fecha no encontrado o vacío).');
            return { ok: true, messages, errors: [], fields: found };
        }
        const isNoApOrient = esNoAplica(found.orient, vNoApOrient);
        const isNoApIdent  = esNoAplica(found.ident, vNoApIdent);

        if (edad >= CONFIG.edadLimite) {
            if (isNoApOrient) errors.push('Orientación Sexual no puede ser "No aplica" para edad ' + edad);
            if (isNoApIdent)  errors.push('Identidad de Género no puede ser "No aplica" para edad ' + edad);
        } else {
            if (!isNoApOrient) errors.push('Orientación Sexual debe ser "No aplica" para edad ' + edad);
            if (!isNoApIdent)  errors.push('Identidad de Género debe ser "No aplica" para edad ' + edad);
        }
        return { ok: errors.length === 0, messages, errors, fields: found };
    }
    function aplicarErrores(erroresPorBase) {
        document.querySelectorAll('[data-gesi-error-sexo="true"]').forEach(el => limpiarEstilo(el));
        const modalList = [];
        for (const e of erroresPorBase) {
            const lines = (e.errors || []).concat(e.messages || []);
            modalList.push({ title: (e.baseName || '(sin nombre)'), details: lines });
            const f = e.fields;
            (e.errors || []).forEach(msg => {
                if (msg.toLowerCase().includes('orient') && f.orient) {
                    try {
                        f.orient.dataset.gesiErrorSexo = 'true';
                        f.orient.style.setProperty('background-color', CONFIG.colorErrorFondo, 'important');
                        f.orient.style.setProperty('border', `2px solid ${CONFIG.colorErrorBorde}`, 'important');
                        f.orient.style.setProperty('box-shadow', `0 0 0 2px rgba(255,77,77,0.12)`, 'important');
                    } catch(e){}
                }
                if (msg.toLowerCase().includes('ident') && f.ident) {
                    try {
                        f.ident.dataset.gesiErrorSexo = 'true';
                        f.ident.style.setProperty('background-color', CONFIG.colorErrorFondo, 'important');
                        f.ident.style.setProperty('border', `2px solid ${CONFIG.colorErrorBorde}`, 'important');
                        f.ident.style.setProperty('box-shadow', `0 0 0 2px rgba(255,77,77,0.12)`, 'important');
                    } catch(e){}
                }
            });
        }
        if (modalList.length > 0) showModalIfAllowed();
        else hideModal();
    }
    function validarTodasBases() {
        const bases = (CONFIG.bases && CONFIG.bases.length) ? CONFIG.bases : [{
            name: 'Principal',
            idOrientacionSexual: CONFIG.idOrientacionSexual,
            idIdentidadGenero: CONFIG.idIdentidadGenero,
            idFechaNacimiento: CONFIG.idFechaNacimiento,
            idEdad: CONFIG.idEdad,
            valorNoAplicaOrientacion: CONFIG.valorNoAplicaOrientacion,
            valorNoAplicaIdentidad: CONFIG.valorNoAplicaIdentidad
        }];
        const erroresPorBase = [];
        for (const base of bases) {
            const res = validarBase(base);
            if (!res.ok) erroresPorBase.push(Object.assign({ baseName: base.name || 'Base' }, res));
        }
        aplicarErrores(erroresPorBase);
        // return true if no errors
        return erroresPorBase.length === 0;
    }
    // Helpers públicos
    window.gesi_addManualId = function(id) {
        if (!id) return;
        id = String(id).trim();
        if (!CONFIG.manualIds) CONFIG.manualIds = [];
        if (!CONFIG.manualIds.includes(id)) CONFIG.manualIds.push(id);
        pending.set(id, 0);
        scheduleManualRetries();
        setTimeout(() => validarTodasBases(), 300);
        console.log('[GESI] manualId agregado:', id);
    };
    window.gesi_addBase = function(baseObj) {
        if (!baseObj || typeof baseObj !== 'object') return console.warn('[GESI] base inválida');
        CONFIG.bases = CONFIG.bases || [];
        CONFIG.bases.push(baseObj);
        ['idOrientacionSexual','idIdentidadGenero','idFechaNacimiento','idEdad'].forEach(k => { if (baseObj[k]) pending.set(baseObj[k], 0); });
        scheduleManualRetries();
        setTimeout(() => validarTodasBases(), 300);
        console.log('[GESI] base añadida:', baseObj.name || '(sin nombre)');
    };
    window.gesi_validarSexoOrientacion = function(){ return validarTodasBases(); };
    window.gesi_debug = function(v){ DEBUG = !!v; console.log('[GESI] debug=', DEBUG); };
    // Observers + listeners (ligero, debounced)
    let observer = null;
    const debouncedValidate = debounce(() => validarTodasBases(), 220);
    function linkListeners() {
        const bases = (CONFIG.bases && CONFIG.bases.length) ? CONFIG.bases : [{
            idOrientacionSexual: CONFIG.idOrientacionSexual,
            idIdentidadGenero: CONFIG.idIdentidadGenero,
            idFechaNacimiento: CONFIG.idFechaNacimiento,
            idEdad: CONFIG.idEdad
        }];
        for (const base of bases) {
            const f = localizarCamposBase(base);
            [f.edadControl, f.fechaControl, f.orient, f.ident].forEach(el => {
                if (!el) return;
                try {
                    // on change/input clear possible dismissed flag for that element and revalidate
                    const handler = () => { dismissedElems.delete(el); debouncedValidate(); };
                    el.removeEventListener('change', handler);
                    el.removeEventListener('input', handler);
                    el.addEventListener('change', handler);
                    el.addEventListener('input', handler);
                } catch(e){}
            });
        }
    }
    function startObservers() {
        if (observer) return;
        linkListeners();
        validarTodasBases();
        observer = new MutationObserver((muts) => {
            let relevant = false;
            for (const mu of muts) {
                if ((mu.addedNodes && mu.addedNodes.length) || (mu.removedNodes && mu.removedNodes.length)) { relevant = true; break; }
            }
            if (relevant) {
                linkListeners();
                debouncedValidate();
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });

        if (CONFIG.manualIds && CONFIG.manualIds.length) {
            CONFIG.manualIds.forEach(id => pending.set(id, 0));
            scheduleManualRetries();
        }
        log('Observers started');
    }
    function stopObservers() {
        if (observer) { observer.disconnect(); observer = null; }
        if (scheduleManualRetries._timer) { clearInterval(scheduleManualRetries._timer); scheduleManualRetries._timer = null; }
        pending.clear();
        log('Observers stopped');
    }
    // Debounce helper
    function debounce(fn, ms) {
        let t = null;
        return (...args) => {
            if (t) clearTimeout(t);
            t = setTimeout(() => { t = null; fn(...args); }, ms);
        };
    }
    // Iniciar
    try {
        document.addEventListener('DOMContentLoaded', startObservers, false);
        setTimeout(startObservers, 700);
    } catch(e){ console.error(e); }
    // Exponer stop/start para consola
    window.__gesi_stopSexoObservers = stopObservers;
    window.__gesi_startSexoObservers = startObservers;

})();