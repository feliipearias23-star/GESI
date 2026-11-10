// ==UserScript==
// @name         Caracterizacion ambiental
// @namespace    UTIS_GESI
// @version      1.0
// @description  Marca en rojo el campo NIT si no cumple: solo dígitos, guion opcional antes del último dígito, 9 a 10 dígitos y máximo 11 caracteres. Detecta el campo por ID o por la etiqueta "NIT".
// @match        https://gesiapps.saludcapital.gov.co/GESI_sistemas/GESI_Form*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function () {
    'use strict';

    if (window.__validadorNitLoaded) return;
    window.__validadorNitLoaded = true;

    // Ejecuta un bloque aislado: si falla, lo informa en consola sin romper la página
    function ejecutarSeguro(nombre, fn) {
        try { fn(); }
        catch (e) { console.error('[VALIDADOR NIT] Falló el bloque "' + nombre + '":', e); }
    }

    // Textos "ruido" que se ignoran al buscar la etiqueta (asteriscos, dos puntos, guiones, paréntesis vacíos...)
    const RE_RUIDO = /^[\s*:.\-–—_()]*$/;

    // ════════════════════════════════════════════════════════════════════
    // VALIDADOR DE NIT (marca en rojo si no cumple)
    // Válido: vacío (no se alerta), o solo dígitos con un guion opcional antes del último dígito,
    //   entre 9 y 10 dígitos y máximo 11 caracteres en total.
    //   Ej.: 901034401-5 · 123456789-0 · 123456789 · 1234567890
    // Se detecta por ID (NIT_IDS) y, como respaldo, por la palabra "NIT" (o "identificación tributaria")
    // en cualquiera de los 3 textos que preceden al campo.
    // ════════════════════════════════════════════════════════════════════
    ejecutarSeguro('Validador NIT', function () {
        // Si conoce el ID real del campo NIT de esta base, agréguelo aquí (ej. 'valorControl12345').
        // Si lo deja vacío, el campo se detecta solo por la etiqueta.
        const NIT_IDS = [];
        const FONDO_ERROR = '#ffb3b3';
        const BORDE_ERROR = '#d00000';
        const MENSAJE = 'NIT inválido: mínimo 9 dígitos y máximo 11 caracteres contando el guion (ej. 123456789-0)';
        const TIPOS_NIT = ['text', 'number', 'tel', 'search'];

        const normNit = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

        function nitValido(v) {
            v = String(v == null ? '' : v).trim();
            if (!v) return true;
            if (v.length > 11) return false;
            if (!/^\d+(-\d)?$/.test(v)) return false;
            const digitos = v.replace('-', '').length;
            return digitos >= 9 && digitos <= 10;
        }

        const cacheNit = new WeakMap();   // input -> true/false (¿es el campo NIT?)
        const nitConocidos = new Set();   // campos NIT ya identificados (se revalidan periódicamente)

        // Retrocede desde el input hasta 3 textos de etiqueta; si antes aparece otro campo, se detiene
        function esCampoNIT(el) {
            if (!el || el.tagName !== 'INPUT') return false;
            if (NIT_IDS.indexOf(el.id) >= 0) return true;
            const tipo = (el.getAttribute('type') || 'text').toLowerCase();
            if (TIPOS_NIT.indexOf(tipo) < 0) return false;
            if (cacheNit.has(el)) return cacheNit.get(el);
            let res = false, textos = 0;
            const w = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
            w.currentNode = el;
            for (let i = 0; i < 25 && textos < 3; i++) {
                const n = w.previousNode();
                if (!n) break;
                if (n.nodeType === 1) {
                    const tag = n.tagName;
                    if (tag === 'SELECT' || tag === 'TEXTAREA' || (tag === 'INPUT' && n.type !== 'hidden')) break;
                    continue;
                }
                const tx = (n.nodeValue || '').trim();
                if (!tx || RE_RUIDO.test(tx)) continue;
                textos++;
                if (/\bnit\b|identificacion tributaria/.test(normNit(tx))) { res = true; break; }
            }
            cacheNit.set(el, res);
            return res;
        }

        function marcarNit(el) {
            if (nitValido(el.value)) {
                if (el.getAttribute('data-nit-error') === '1') {
                    el.removeAttribute('data-nit-error');
                    el.style.removeProperty('background-color');
                    el.style.removeProperty('border-color');
                    el.removeAttribute('title');
                }
            } else {
                el.setAttribute('data-nit-error', '1');
                el.style.setProperty('background-color', FONDO_ERROR, 'important');
                el.style.setProperty('border-color', BORDE_ERROR, 'important');
                el.title = MENSAJE;
            }
        }

        // Delegación en document (captura): sirve aunque GESI reconstruya el DOM
        ['input', 'change', 'focusout', 'keyup'].forEach((ev) => {
            document.addEventListener(ev, (e) => {
                if (esCampoNIT(e.target)) { nitConocidos.add(e.target); marcarNit(e.target); }
            }, true);
        });

        // Revisión periódica: valores puestos por JS sin eventos y páginas creadas después
        function revisarNit() {
            NIT_IDS.forEach((id) => document.querySelectorAll('[id="' + id + '"]').forEach((el) => nitConocidos.add(el)));
            document.querySelectorAll('input[type="text"], input[type="number"], input[type="tel"], input[type="search"], input:not([type])').forEach((el) => {
                if (!cacheNit.has(el) && esCampoNIT(el)) nitConocidos.add(el);
            });
            nitConocidos.forEach((el) => {
                if (!el.isConnected) { nitConocidos.delete(el); return; }
                marcarNit(el);
            });
        }
        setInterval(revisarNit, 1500);
        revisarNit();
    });

    console.log('[VALIDADOR NIT] v1.0 activo');
})();
