// ==UserScript==
// @name         SALUD ORAL - Verificador de documentos repetidos
// @namespace    http://tampermonkey.net/
// @version      2026.11.04.5
// @description  Solo en la base "Acciones Salud Oral Institucional": recorre las personas de la ficha y detecta documentos repetidos dentro de la misma ficha; al digitar un documento ya registrado en esa ficha no deja ingresarlo
// @match        https://gesiapps.saludcapital.gov.co/GESI_sistemas/GESI_Form*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function () {
    'use strict';

    // ════════════════════════════════════════════════════════════════════
    // SOLO SE ACTIVA EN LA BASE "Acciones Salud Oral Institucional"
    // ════════════════════════════════════════════════════════════════════
    // Texto del encabezado que identifica la base (basta con que aparezca uno)
    const BASE_TEXTOS = ['acciones salud oral institucional'];

    const normTexto = (s) => String(s || '').toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ');

    // Elementos que pertenecen al menú lateral: se ignoran
    const SEL_MENU = 'nav, aside, ul, li, .sidebar, #sidebar, [class*="sidebar"], [class*="menu"]';

    function esBaseInstitucional() {
        if (!document.body) return false;
        const objetivos = BASE_TEXTOS.map(normTexto);
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let nodo;
        while ((nodo = walker.nextNode())) {
            const t = normTexto(nodo.nodeValue);
            if (!t || !objetivos.some((o) => t.includes(o))) continue;
            const padre = nodo.parentElement;
            if (padre && !padre.closest(SEL_MENU)) return true;
        }
        return false;
    }

    function iniciarScript() {

    // ════════════════════════════════════════════════════════════════════
    // CONFIGURACIÓN
    // ════════════════════════════════════════════════════════════════════
    const IDS = {
        nombres: 'valorControl18703',
        apellidos: 'valorControl18704',
        documento: 'valorControl18706',   // Número de documento (cédula)
    };

    // Campo donde aparece el NÚMERO DE FICHA
    const FICHA_CAMPO_ID = 'Ficha_fic';

    // Botones de personas de la ficha:
    // las demás personas son btn-default; la persona abierta es btn-info.
    const SEL_OTRAS  = 'input[type="submit"].btn.btn-default.btn-sm';
    const SEL_ACTUAL = 'input[type="submit"].btn.btn-info.btn-sm';

    // Tiempo sin teclear para revisar el documento mientras se digita
    const ESPERA_TECLEO_MS = 900;

    const KEY_ACTIVO  = 'sorep_activo';
    const KEY_PAGINAS = 'sorep_paginas';
    const KEY_INDEX   = 'sorep_index';
    const KEY_FICHA   = 'sorep_ficha';
    const KEY_ORIGEN  = 'sorep_origen';   // persona desde la que se inició el recorrido
    const KEY_REPORTE = 'sorep_reporte';  // '1' = mostrar el reporte en el panel
    const KEY_DOCS    = 'sorep_docs';     // documentos conocidos de la ficha
    const KEY_POS     = 'sorep_pos';
    const KEY_MIN     = 'sorep_min';
    const KEY_SIZE    = 'sorep_size';

    // ════════════════════════════════════════════════════════════════════
    // UTILIDADES
    // ════════════════════════════════════════════════════════════════════
    const $ = (id) => document.getElementById(id);

    const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g,
        (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    // Solo dígitos y sin ceros a la izquierda: "01.234" y "1234" son el mismo documento
    function normDoc(v) { return String(v || '').replace(/\D/g, '').replace(/^0+/, ''); }

    // Número de ficha (null si no se encuentra el campo)
    function fichaId() {
        const el = $(FICHA_CAMPO_ID);
        if (!el) return null;
        const v = String(el.value !== undefined && el.value !== '' ? el.value : el.textContent).trim();
        return v || null;
    }

    function nombreCompleto(n, a) {
        return [n, a].map((x) => String(x || '').trim()).filter(Boolean).join(' ') || '(sin nombre)';
    }

    // ════════════════════════════════════════════════════════════════════
    // PERSONAS DE LA FICHA (navegación por botones)
    // ════════════════════════════════════════════════════════════════════
    function obtenerBotonesPersonas() {
        return Array.from(document.querySelectorAll(SEL_OTRAS));
    }

    // Identificador estable de una persona: el pagina_actual de su formulario (o el texto del botón)
    function valorPagina(btn) {
        const form = btn.closest('form');
        const pag = form ? form.querySelector('[name="pagina_actual"]') : null;
        return { key: pag ? pag.value : btn.value, label: btn.value };
    }

    function paginaActual() {
        const btn = document.querySelector(SEL_ACTUAL);
        if (btn) return valorPagina(btn);
        const pag = document.querySelector('[name="pagina_actual"]');
        return { key: pag ? pag.value : 'unica', label: pag ? pag.value : '1' };
    }

    function leerActual() {
        const v = (id) => ($(id) ? $(id).value : '').trim();
        return { documento: v(IDS.documento), nombres: v(IDS.nombres), apellidos: v(IDS.apellidos) };
    }

    // ════════════════════════════════════════════════════════════════════
    // DOCUMENTOS CONOCIDOS DE LA FICHA (sessionStorage, separados por número de ficha)
    // ════════════════════════════════════════════════════════════════════
    function leerCache() {
        const ficha = fichaId();
        try {
            const c = JSON.parse(sessionStorage.getItem(KEY_DOCS) || 'null');
            if (ficha && c && c.ficha === ficha && c.items) return c;
        } catch (e) { /* cache dañada: se reinicia */ }
        return { ficha, items: {} };
    }

    function guardarCache(c) { sessionStorage.setItem(KEY_DOCS, JSON.stringify(c)); }

    // Guarda (o actualiza) el documento de la persona que está abierta
    function registrarActual() {
        if (!$(IDS.documento)) return; // esta pantalla no es el formulario de la persona
        if (!fichaId()) return;        // sin número de ficha no se guarda nada
        const { key, label } = paginaActual();
        const d = leerActual();
        const c = leerCache();
        c.items[key] = { label, documento: d.documento, nombres: d.nombres, apellidos: d.apellidos };
        guardarCache(c);
        actualizarCobertura();
    }

    // ¿Otra persona (distinta de la abierta) de ESTA ficha ya tiene este documento?
    function buscarRepetido(norm, keyActual) {
        const c = leerCache();
        const hallado = Object.entries(c.items)
            .find(([k, it]) => k !== keyActual && normDoc(it.documento) === norm);
        return hallado ? hallado[1] : null;
    }

    function agrupar() {
        const c = leerCache();
        const grupos = {};
        const sinDoc = [];
        Object.values(c.items).forEach((it) => {
            const n = normDoc(it.documento);
            if (!n) { sinDoc.push(it); return; }
            (grupos[n] = grupos[n] || []).push(it);
        });
        return {
            repetidos: Object.entries(grupos).filter(([, lista]) => lista.length > 1),
            sinDoc,
        };
    }

    // Cuántas personas de la ficha se conocen frente al total que muestra la pantalla
    function cobertura() {
        const total = document.querySelectorAll(SEL_OTRAS).length + 1;
        const known = Object.keys(leerCache().items).length;
        return { total, known: Math.min(known, total), completa: known >= total };
    }

    // ════════════════════════════════════════════════════════════════════
    // PANEL
    // ════════════════════════════════════════════════════════════════════
    const panel = document.createElement('div');
    panel.id = 'sorep-panel';
    panel.style.cssText = `
        position:fixed; z-index:999999;
        background:#1e293b; border-radius:12px;
        box-shadow:0 6px 24px rgba(0,0,0,0.4);
        font-family:Arial,sans-serif; font-size:13px; color:#f1f5f9;
        width:320px; min-width:260px; min-height:140px;
        max-width:700px; max-height:80vh;
        resize:both; overflow:auto;
        user-select:none;
    `;
    panel.innerHTML = `
        <div id="sorep-header" style="
            display:flex; align-items:center; justify-content:space-between;
            padding:10px 14px; cursor:move; font-weight:bold; font-size:14px;
            border-bottom:1px solid #334155;">
            <span>🦷 Documentos repetidos</span>
            <span>
                <span id="sorep-clear-btn" title="Limpiar reporte" style="cursor:pointer; font-size:14px; padding:0 6px;">🗑</span>
                <span id="sorep-min-btn" style="cursor:pointer; font-size:16px; padding:0 4px;">—</span>
            </span>
        </div>
        <div id="sorep-body" style="padding:12px 14px;">
            <div id="sorep-estado" style="
                font-size:12px; color:#94a3b8; margin-bottom:10px;
                background:#0f172a; padding:6px 10px; border-radius:6px; min-height:18px;">
                Listo para iniciar
            </div>
            <div style="display:flex; gap:8px; margin-bottom:10px;">
                <button id="sorep-iniciar" style="
                    flex:1; padding:8px; border:none; border-radius:8px;
                    background:#22c55e; color:white; font-weight:bold;
                    font-size:13px; cursor:pointer;">
                    ▶ Verificar Ficha
                </button>
                <button id="sorep-parar" disabled style="
                    flex:0 0 auto; padding:8px 12px; border:none; border-radius:8px;
                    background:#ef4444; color:white; font-weight:bold;
                    font-size:13px; cursor:pointer; opacity:0.4;">
                    ⏹
                </button>
            </div>
            <div id="sorep-reporte" style="
                max-height:60vh; overflow-y:auto; display:none;
                border-top:1px solid #334155; padding-top:8px;">
            </div>
        </div>
    `;
    document.body.appendChild(panel);

    const header     = $('sorep-header');
    const clearBtn   = $('sorep-clear-btn');
    const minBtn     = $('sorep-min-btn');
    const body       = $('sorep-body');
    const btnIniciar = $('sorep-iniciar');
    const btnParar   = $('sorep-parar');
    const estadoDiv  = $('sorep-estado');
    const reporteDiv = $('sorep-reporte');

    function setEstado(msg, color) {
        estadoDiv.textContent = msg;
        estadoDiv.style.color = color || '#94a3b8';
    }

    function setBotones(corriendo) {
        btnIniciar.disabled      = corriendo;
        btnIniciar.style.opacity = corriendo ? '0.4' : '1';
        btnParar.disabled        = !corriendo;
        btnParar.style.opacity   = corriendo ? '1' : '0.4';
    }

    // Estado en reposo: resumen de lo que se sabe de la ficha
    function actualizarCobertura() {
        if (sessionStorage.getItem(KEY_ACTIVO) === '1') return;
        if (!fichaId()) {
            setEstado('⚠ No se encontró el número de ficha en esta pantalla', '#f59e0b');
            return;
        }
        const g = agrupar();
        const c = cobertura();
        if (g.repetidos.length) {
            setEstado(`⚠ Ficha ${fichaId()}: ${g.repetidos.length} documento(s) repetido(s)`, '#f59e0b');
        } else if (c.completa) {
            setEstado(`✅ Ficha ${fichaId()}: sin documentos repetidos (${c.known} personas revisadas)`, '#22c55e');
        } else {
            setEstado(`Ficha ${fichaId()}: personas revisadas ${c.known} de ${c.total}. Pulsa «Verificar Ficha» para revisarlas todas.`, '#94a3b8');
        }
    }

    // Posición, tamaño y minimizado (persisten entre recargas)
    function aplicarPosicionGuardada() {
        const pos = JSON.parse(localStorage.getItem(KEY_POS) || 'null');
        if (pos) { panel.style.left = pos.left + 'px'; panel.style.top = pos.top + 'px'; }
        else { panel.style.bottom = '20px'; panel.style.right = '20px'; }
    }
    function aplicarTamanoGuardado() {
        const size = JSON.parse(localStorage.getItem(KEY_SIZE) || 'null');
        if (size) { panel.style.width = size.width + 'px'; panel.style.height = size.height + 'px'; }
    }
    function aplicarMinimizadoGuardado() {
        const min = localStorage.getItem(KEY_MIN) === '1';
        body.style.display = min ? 'none' : 'block';
        minBtn.textContent = min ? '▢' : '—';
        if (min) { panel.style.height = 'auto'; panel.style.resize = 'horizontal'; }
    }
    aplicarPosicionGuardada();
    aplicarTamanoGuardado();
    aplicarMinimizadoGuardado();

    new ResizeObserver(() => {
        localStorage.setItem(KEY_SIZE, JSON.stringify({ width: panel.offsetWidth, height: panel.offsetHeight }));
    }).observe(panel);

    minBtn.addEventListener('click', () => {
        const minAhora = body.style.display !== 'none';
        body.style.display = minAhora ? 'none' : 'block';
        minBtn.textContent = minAhora ? '▢' : '—';
        localStorage.setItem(KEY_MIN, minAhora ? '1' : '0');
        if (minAhora) { panel.style.height = 'auto'; panel.style.resize = 'horizontal'; }
        else { aplicarTamanoGuardado(); panel.style.resize = 'both'; }
    });

    let arrastrando = false, offX = 0, offY = 0;
    header.addEventListener('mousedown', (e) => {
        arrastrando = true;
        const rect = panel.getBoundingClientRect();
        offX = e.clientX - rect.left;
        offY = e.clientY - rect.top;
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';
    });
    document.addEventListener('mousemove', (e) => {
        if (!arrastrando) return;
        panel.style.left = (e.clientX - offX) + 'px';
        panel.style.top = (e.clientY - offY) + 'px';
    });
    document.addEventListener('mouseup', () => {
        if (!arrastrando) return;
        arrastrando = false;
        const rect = panel.getBoundingClientRect();
        localStorage.setItem(KEY_POS, JSON.stringify({ left: rect.left, top: rect.top }));
    });

    // ════════════════════════════════════════════════════════════════════
    // REPORTE
    // ════════════════════════════════════════════════════════════════════
    function limpiarReporte() {
        reporteDiv.style.display = 'none';
        reporteDiv.innerHTML = '';
    }

    function renderReporte() {
        if (sessionStorage.getItem(KEY_REPORTE) !== '1') return;
        const { repetidos, sinDoc } = agrupar();
        const c = cobertura();
        const fila = 'padding:6px 0; border-bottom:1px solid #334155; font-size:12px;';
        let html = `<div style="${fila} color:#94a3b8;">Ficha <b>${esc(fichaId() || '?')}</b></div>`;

        if (repetidos.length) {
            html += repetidos.map(([doc, lista]) => `
                <div style="${fila}">
                    <div style="color:#ef4444;">⛔ Documento <b>${esc(doc)}</b> repetido (${lista.length} veces)</div>
                    <div style="color:#94a3b8;">${lista.map((p) =>
                        `Persona ${esc(p.label)}: ${esc(nombreCompleto(p.nombres, p.apellidos))}`).join('<br>')}</div>
                </div>`).join('');
        } else {
            html += `<div style="${fila} color:#22c55e;">✅ No hay documentos repetidos entre las personas revisadas.</div>`;
        }

        if (sinDoc.length) {
            html += `
                <div style="${fila}">
                    <div style="color:#f59e0b;">🚫 Sin número de documento</div>
                    <div style="color:#94a3b8;">${sinDoc.map((p) =>
                        `Persona ${esc(p.label)}: ${esc(nombreCompleto(p.nombres, p.apellidos))}`).join('<br>')}</div>
                </div>`;
        }

        if (!c.completa) {
            html += `<div style="${fila} color:#f59e0b;">⚠ Revisión incompleta: ${c.known} de ${c.total} personas.</div>`;
        }

        reporteDiv.innerHTML = html;
        reporteDiv.style.display = 'block';
    }

    // ════════════════════════════════════════════════════════════════════
    // RECORRIDO DE LA FICHA (lee el documento de cada persona; no consulta nada externo)
    // ════════════════════════════════════════════════════════════════════
    function irAPersona(paginas, index) {
        if (sessionStorage.getItem(KEY_ACTIVO) !== '1') return;
        if (index >= paginas.length) { finalizar(); return; }

        const objetivo = paginas[index];
        const boton = obtenerBotonesPersonas().find((b) => valorPagina(b).key === objetivo.key);
        if (!boton) { // no se encontró el botón: se salta a la siguiente persona
            setTimeout(() => irAPersona(paginas, index + 1), 300);
            return;
        }

        sessionStorage.setItem(KEY_INDEX, String(index));
        setEstado(`Cargando persona ${index + 2} de ${paginas.length + 1}...`, '#60a5fa');
        boton.click();
    }

    function procesarPersonaActual(paginas, index) {
        registrarActual();
        continuar(paginas, index);
    }

    function continuar(paginas, index) {
        const siguiente = index + 1;
        if (siguiente >= paginas.length) finalizar();
        else setTimeout(() => irAPersona(paginas, siguiente), 400);
    }

    function finalizar() {
        sessionStorage.setItem(KEY_ACTIVO, '0');
        sessionStorage.setItem(KEY_REPORTE, '1');
        setBotones(false);
        renderReporte();

        // Volver a la persona desde la que se inició el recorrido
        const origen = sessionStorage.getItem(KEY_ORIGEN);
        if (origen && origen !== paginaActual().key) {
            const boton = obtenerBotonesPersonas().find((b) => valorPagina(b).key === origen);
            if (boton) {
                setEstado('Volviendo a la persona inicial...', '#60a5fa');
                setTimeout(() => boton.click(), 400);
                return;
            }
        }
        actualizarCobertura();
        marcarRepetidoActual();
    }

    function iniciarVerificacion() {
        const ficha = fichaId();
        if (!ficha) {
            setEstado('⚠ No se encontró el número de ficha (campo ' + FICHA_CAMPO_ID + ')', '#ef4444');
            return;
        }
        const otras = obtenerBotonesPersonas().map(valorPagina);
        sessionStorage.setItem(KEY_FICHA, ficha);
        sessionStorage.setItem(KEY_PAGINAS, JSON.stringify(otras));
        sessionStorage.setItem(KEY_INDEX, '-1');
        sessionStorage.setItem(KEY_ORIGEN, paginaActual().key);
        sessionStorage.setItem(KEY_ACTIVO, '1');
        sessionStorage.removeItem(KEY_REPORTE);
        guardarCache({ ficha, items: {} });
        setBotones(true);
        limpiarReporte();
        setEstado(`🔄 Ficha ${ficha}: ${otras.length + 1} personas encontradas, iniciando...`, '#60a5fa');
        // La persona abierta no está en "otras": se lee directo y luego se sigue con la primera de la lista
        procesarPersonaActual(otras, -1);
    }

    function detenerVerificacion() {
        sessionStorage.setItem(KEY_ACTIVO, '0');
        sessionStorage.setItem(KEY_REPORTE, '1');
        setBotones(false);
        renderReporte();
        setEstado('⏹ Detenido (revisión incompleta)', '#ef4444');
    }

    function limpiarTodo() {
        [KEY_ACTIVO, KEY_PAGINAS, KEY_INDEX, KEY_FICHA, KEY_ORIGEN, KEY_REPORTE, KEY_DOCS]
            .forEach((k) => sessionStorage.removeItem(k));
        limpiarReporte();
        setBotones(false);
        registrarActual();
        actualizarCobertura();
    }

    // ════════════════════════════════════════════════════════════════════
    // AVISOS DEBAJO DEL CAMPO DOCUMENTO
    // ════════════════════════════════════════════════════════════════════
    const CLASE_AVISO = 'aviso-doc-repetido-so';
    let temporizadorAviso = null;

    function quitarAviso() {
        clearTimeout(temporizadorAviso);
        document.querySelectorAll('.' + CLASE_AVISO).forEach((a) => a.remove());
        const campo = $(IDS.documento);
        if (campo && campo.dataset.soRepetido === '1') {
            campo.style.border = '';
            campo.style.background = '';
            delete campo.dataset.soRepetido;
        }
    }

    // tipo: 'error' (rojo) o 'info' (amarillo); segundos = 0 deja el aviso fijo
    function mostrarAviso(texto, tipo, segundos) {
        quitarAviso();
        const campo = $(IDS.documento);
        if (!campo || !campo.parentNode) return;
        const rojo = tipo === 'error';
        const div = document.createElement('div');
        div.className = CLASE_AVISO;
        div.textContent = texto;
        Object.assign(div.style, {
            color: rojo ? '#b30000' : '#7a5b00',
            background: rojo ? '#ffe6e6' : '#fff8e1',
            border: '1px solid ' + (rojo ? '#ff9999' : '#ffd54f'),
            padding: '6px', marginTop: '4px', borderRadius: '4px', fontSize: '12px',
        });
        if (rojo) {
            campo.style.border = '2px solid red';
            campo.style.background = '#fff0f0';
            campo.dataset.soRepetido = '1';
        }
        campo.parentNode.appendChild(div);
        if (segundos) temporizadorAviso = setTimeout(quitarAviso, segundos * 1000);
    }

    // Documento ya guardado de la persona abierta que coincide con otra persona de la misma ficha
    function marcarRepetidoActual() {
        const campo = $(IDS.documento);
        if (!campo) return;
        const norm = normDoc(campo.value);
        if (!norm) return;
        const otro = buscarRepetido(norm, paginaActual().key);
        if (otro) {
            mostrarAviso(`⚠ Este documento también está en la persona ${otro.label} (${nombreCompleto(otro.nombres, otro.apellidos)}) de esta ficha. Debe corregirse.`, 'error', 0);
        }
    }

    // ════════════════════════════════════════════════════════════════════
    // BLOQUEO AL DIGITAR: no deja ingresar un documento ya registrado en la misma ficha
    // ════════════════════════════════════════════════════════════════════
    function revisarCedula() {
        const campo = $(IDS.documento);
        if (!campo) return;

        const norm = normDoc(campo.value);
        if (!norm) { registrarActual(); return; }

        const otro = buscarRepetido(norm, paginaActual().key);
        if (otro) {
            // Se vacía antes de que el autocompletado por cédula consulte nada
            campo.value = '';
            registrarActual();
            mostrarAviso(`⛔ El documento ${norm} ya está registrado en esta ficha (persona ${otro.label}: ${nombreCompleto(otro.nombres, otro.apellidos)}). No se puede repetir.`, 'error', 12);
            campo.focus();
            return;
        }

        registrarActual();
        const c = cobertura();
        if (!c.completa) {
            mostrarAviso(`Se comparó con ${c.known} de ${c.total} personas de la ficha. Pulsa «Verificar Ficha» para una revisión completa.`, 'info', 6);
        }
    }

    let temporizadorTecleo = null;
    document.addEventListener('input', (e) => {
        if (!e.target || e.target.id !== IDS.documento) return;
        quitarAviso();
        clearTimeout(temporizadorTecleo);
        temporizadorTecleo = setTimeout(revisarCedula, ESPERA_TECLEO_MS);
    }, true);

    ['change', 'blur'].forEach((ev) => {
        document.addEventListener(ev, (e) => {
            if (!e.target || e.target.id !== IDS.documento) return;
            clearTimeout(temporizadorTecleo);
            revisarCedula();
        }, true);
    });

    // ════════════════════════════════════════════════════════════════════
    // ARRANQUE / CONTINUACIÓN TRAS CADA RECARGA
    // ════════════════════════════════════════════════════════════════════
    function detectarContinuacion() {
        const guardada = sessionStorage.getItem(KEY_FICHA);
        if (guardada && guardada !== fichaId()) { // se abrió otra ficha: lo anterior ya no aplica
            [KEY_ACTIVO, KEY_PAGINAS, KEY_INDEX, KEY_FICHA, KEY_ORIGEN, KEY_REPORTE, KEY_DOCS]
                .forEach((k) => sessionStorage.removeItem(k));
        }

        if (sessionStorage.getItem(KEY_ACTIVO) === '1') {
            const paginas = JSON.parse(sessionStorage.getItem(KEY_PAGINAS) || '[]');
            if (!paginas.length) return;
            setBotones(true);
            const index = parseInt(sessionStorage.getItem(KEY_INDEX) || '-1', 10);
            setEstado(`Leyendo persona ${index + 2} de ${paginas.length + 1}...`, '#60a5fa');
            // espera para que el formulario termine de poblarse tras la recarga
            setTimeout(() => procesarPersonaActual(paginas, index), 800);
            return;
        }

        setTimeout(() => {
            registrarActual();
            renderReporte();
            actualizarCobertura();
            marcarRepetidoActual();
        }, 800);
    }

    btnIniciar.addEventListener('click', iniciarVerificacion);
    btnParar.addEventListener('click', detenerVerificacion);
    clearBtn.addEventListener('click', () => {
        if (sessionStorage.getItem(KEY_ACTIVO) === '1') return; // no limpiar mientras corre
        limpiarTodo();
    });

    if (document.readyState === 'complete') detectarContinuacion();
    else window.addEventListener('load', detectarContinuacion);

    }   // fin de iniciarScript

    // ════════════════════════════════════════════════════════════════════
    // VIGÍA: espera hasta 10 s a que cargue la página; si no es la base
    // Institucional, no crea el panel ni activa ningún bloqueo
    // ════════════════════════════════════════════════════════════════════
    if (esBaseInstitucional()) {
        iniciarScript();
    } else {
        let intentos = 0;
        const vigia = setInterval(() => {
            if (esBaseInstitucional()) { clearInterval(vigia); iniciarScript(); }
            else if (++intentos >= 20) clearInterval(vigia);
        }, 500);
    }
})();
