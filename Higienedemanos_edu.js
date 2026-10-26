// ==UserScript==
// @name         HIGIENE DE MANOS
// @namespace    https://gesiapps.saludcapital.gov.co/GESI_sistemas/GESI_Form*
// @version      1.0
// @description  Autocompleta nombres y apellidos (en un solo campo) al digitar el documento, con Comprobador de Derechos y Supersalud como respaldo
// @author       You
// @match        https://gesiapps.saludcapital.gov.co/GESI_sistemas/GESI_Form*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        GM_xmlhttpRequest
// @connect      appb.saludcapital.gov.co
// @connect      pqrdsuperargo.supersalud.gov.co
// @run-at       document-end
// ==/UserScript==

(function () {
    'use strict';

    // ════════════════════════════════════════════════════════════════════
    // CONFIGURACIÓN
    // ════════════════════════════════════════════════════════════════════
    const IDS = {
        nombres:  'valorControl18348', // campo único: nombres + apellidos
        tipo_doc: 'valorControl18349',
        cedula:   'valorControl18350',
    };

    const BASE_COMPROBADOR = 'https://appb.saludcapital.gov.co/comprobadordederechos/';
    const BASE_SUPERSALUD  = 'https://pqrdsuperargo.supersalud.gov.co/api/api/adres/';

    // value del tipo de documento en GESI -> código de tipo en la URL de Supersalud.
    // Si el tipo de GESI no está aquí (NUIP, Pasaporte, sin ID...), NO se consulta Supersalud.
    const TIPO_DOC_GESI_A_SUPERSALUD = {
        '59': '0',    // Cédula de Ciudadanía
        '61': '1',    // Tarjeta de Identidad
        '60': '8',    // Registro Civil
        '62': '2',    // Cédula de Extranjería
        '2482': '13', // PPT
    };

    function getCampo(clave) { return document.getElementById(IDS[clave]); }

    // ════════════════════════════════════════════════════════════════════
    // UTILIDADES
    // ════════════════════════════════════════════════════════════════════
    function setValue(clave, value) {
        const el = getCampo(clave);
        if (!el) return false;

        const v = value ?? '';
        el.focus();
        el.value = v;

        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));

        el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Tab' }));
        el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'Tab' }));

        el.dispatchEvent(new Event('blur', { bubbles: true }));
        return true;
    }

    function extraerCampo(html, name) {
        const regex = new RegExp('name="' + name + '"[^>]*value="([^"]*)"');
        const m = html.match(regex);
        return m ? m[1] : '';
    }

    function gmRequest(opts) {
        // En Tampermonkey: usa GM_xmlhttpRequest
        if (typeof GM_xmlhttpRequest === 'function') {
            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest(Object.assign({ timeout: 20000 }, opts, {
                    onload: resolve,
                    onerror: reject,
                    ontimeout: () => reject(new Error('timeout')),
                }));
            });
        }
        // Dentro de la app (1.0.45 o superior): la consulta la hace Python
        const api = window.pywebview && window.pywebview.api;
        if (!api || typeof api.cd_http_request !== 'function') {
            return Promise.reject(new Error('puente de la app no disponible (¿app anterior a 1.0.45?)'));
        }
        return api.cd_http_request(Object.assign({ timeout: 20000 }, opts)).then((r) => {
            if (!r || !r.ok) throw new Error((r && r.error) || 'error de red');
            return r;
        });
    }

    // Une partes ignorando vacíos: ['A', '', 'B'] -> 'A B'
    function unir(...partes) {
        return partes.map((p) => String(p ?? '').trim()).filter(Boolean).join(' ');
    }

    const quitarCeros = (s) => String(s || '').replace(/\D/g, '').replace(/^0+/, '');

    // Si la respuesta de Supersalud trae algún campo con el número de documento, debe ser el consultado
    function numeroCoincide(d, documento) {
        const esperado = quitarCeros(documento);
        for (const [k, v] of Object.entries(d)) {
            if (!/(identific|documento|numero|nro|cedula|^id$)/i.test(k)) continue;
            if (typeof v !== 'string' && typeof v !== 'number') continue;
            const digitos = quitarCeros(v);
            if (digitos && digitos !== esperado) return false;
        }
        return true;
    }

    // ════════════════════════════════════════════════════════════════════
    // FUENTE 1: COMPROBADOR DE DERECHOS
    // ════════════════════════════════════════════════════════════════════
    function parseTablasComprobador(doc) {
        const TABLAS_IDS = [
            'MainContent_grdContributivo',
            'MainContent_grdBUDA',
            'MainContent_grdSisben',
            'MainContent_grdPoblacionEspecial',
            'MainContent_grdSubsidiado',
        ];

        const registros = [];
        TABLAS_IDS.forEach((id) => {
            const tabla = doc.getElementById(id);
            if (!tabla) return;

            const filas = Array.from(tabla.querySelectorAll('tr'));
            const headerRow = filas.find((f) => f.querySelector('th'));
            if (!headerRow) return;

            const headers = Array.from(headerRow.querySelectorAll('th')).map((th) => th.textContent.trim());

            filas.forEach((fila) => {
                if (fila === headerRow) return;
                if (fila.classList.contains('RowEmpty')) return;

                const celdas = Array.from(fila.querySelectorAll('td')).map((td) => td.textContent.trim());
                if (!celdas.length) return;

                const registro = {};
                headers.forEach((h, i) => (registro[h] = celdas[i] || ''));
                registro._fuente = id;
                registros.push(registro);
            });
        });
        return registros;
    }

    async function consultarComprobador(documento) {
        const r1 = await gmRequest({ method: 'GET', url: BASE_COMPROBADOR + 'Consulta.aspx' });
        const html1 = r1.responseText || '';

        const body = new URLSearchParams({
            __EVENTTARGET: '',
            __EVENTARGUMENT: '',
            __LASTFOCUS: '',
            __VIEWSTATE: extraerCampo(html1, '__VIEWSTATE'),
            __VIEWSTATEGENERATOR: extraerCampo(html1, '__VIEWSTATEGENERATOR'),
            __PREVIOUSPAGE: extraerCampo(html1, '__PREVIOUSPAGE'),
            __EVENTVALIDATION: extraerCampo(html1, '__EVENTVALIDATION'),
            'ctl00$MainContent$txtConsecutivo': '',
            'ctl00$MainContent$txtNoId': documento,
            'ctl00$MainContent$txtFichaSisben': '',
            'ctl00$MainContent$txtPriApellido': '',
            'ctl00$MainContent$txtSegApellido': '',
            'ctl00$MainContent$txtPriNombre': '',
            'ctl00$MainContent$txtSegNombre': '',
            'ctl00$ctl12': 'ctl00$MainContent$cmdConsultar',
            __ASYNCPOST: 'true',
            'ctl00$MainContent$cmdConsultar': 'Consultar',
        }).toString();

        const r2 = await gmRequest({
            method: 'POST',
            url: BASE_COMPROBADOR + 'Consulta.aspx',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'X-MicrosoftAjax': 'Delta=true',
                'X-Requested-With': 'XMLHttpRequest',
            },
            data: body,
        });

        if ((r2.responseText || '').indexOf('No se encontr') !== -1) return null;

        const r3 = await gmRequest({ method: 'GET', url: BASE_COMPROBADOR + 'Resultados.aspx' });
        const doc = new DOMParser().parseFromString(r3.responseText || '', 'text/html');
        const registros = parseTablasComprobador(doc);
        if (!registros.length) return null;

        // Resultados.aspx guarda en sesión la ÚLTIMA consulta exitosa: si la actual no quedó
        // registrada, devolvería a la persona anterior. Por eso se exige que el número coincida.
        const esperado = quitarCeros(documento);
        const claveNumero = (reg) => Object.keys(reg).find((k) =>
            /(identific|documento|n[uú]mero|n[uú]m\b|cedula|^id$)/i.test(k) && quitarCeros(reg[k]));
        const verificables = registros.filter((reg) => claveNumero(reg));

        let r;
        if (verificables.length) {
            r = verificables.find((reg) => quitarCeros(reg[claveNumero(reg)]) === esperado);
            if (!r) {
                console.warn('[Autocompletar nombre] El Comprobador devolvió otra persona (resultado anterior); se descarta.');
                return null;
            }
        } else {
            r = registros[0]; // sin columna de número no se puede verificar
        }

        const nombre = unir(r['Primer Nombre'], r['Segundo Nombre'], r['Primer Apellido'], r['Segundo Apellido']);
        return nombre ? { nombre } : null;
    }

    // ════════════════════════════════════════════════════════════════════
    // FUENTE 2: SUPERSALUD (respaldo)
    // ════════════════════════════════════════════════════════════════════
    async function consultarSupersalud(documento, codigoTipo) {
        const r = await gmRequest({
            method: 'GET',
            url: BASE_SUPERSALUD + codigoTipo + '/' + encodeURIComponent(documento),
            headers: { Accept: 'application/json' },
        });
        if (r.status < 200 || r.status >= 300) return null;

        let d;
        try { d = JSON.parse(r.responseText || ''); } catch (e) { return null; }
        if (!d || typeof d !== 'object') return null;
        if (!numeroCoincide(d, documento)) return null;

        const nombre = unir(d.nombre, d.s_nombre, d.apellido, d.s_apellido);
        return nombre ? { nombre } : null;
    }

    // ════════════════════════════════════════════════════════════════════
    // BÚSQUEDA: Comprobador primero; si no hay resultado, Supersalud
    // ════════════════════════════════════════════════════════════════════
    async function buscarNombre(documento, tipoDoc) {
        try {
            const r = await consultarComprobador(documento);
            if (r) return r.nombre;
        } catch (e) {
            console.warn('[Autocompletar nombre] Falló Comprobador de Derechos:', e);
        }

        const codigoTipo = TIPO_DOC_GESI_A_SUPERSALUD[tipoDoc];
        if (codigoTipo !== undefined) {
            try {
                const r = await consultarSupersalud(documento, codigoTipo);
                if (r) return r.nombre;
            } catch (e) {
                console.warn('[Autocompletar nombre] Falló Supersalud:', e);
            }
        }
        return null;
    }

    function showManualAlert() {
        alert('No se encontró la cédula o hubo un error. Por favor, llena el nombre manualmente.');
    }

    // ════════════════════════════════════════════════════════════════════
    // DISPARO
    // ════════════════════════════════════════════════════════════════════
    let running = false;
    let pendiente = false; // la cédula cambió mientras se consultaba: hay que volver a consultar
    let lastClave = '';

    // Tipo de documento y cédula que hay en el formulario en este momento
    function claveActual() {
        const c = getCampo('cedula');
        const t = getCampo('tipo_doc');
        return (t ? String(t.value || '') : '') + '|' + (c ? (c.value || '').trim() : '');
    }

    async function tryAutofill() {
        const cedEl = getCampo('cedula');
        const nomEl = getCampo('nombres');
        if (!cedEl || !nomEl) return;

        const cedula = (cedEl.value || '').trim();
        if (!cedula) return;
        if (running) { pendiente = true; return; }

        const tipoEl = getCampo('tipo_doc');
        const tipoDoc = tipoEl ? String(tipoEl.value || '') : '';

        // La clave incluye el tipo de documento: si se cambia el tipo, se vuelve a consultar
        const clave = tipoDoc + '|' + cedula;
        if (clave === lastClave) return;

        const documento = cedula.replace(/[^0-9]/g, '');
        if (!documento) return;

        lastClave = clave;
        running = true;

        try {
            const nombre = await buscarNombre(documento, tipoDoc);

            // Si mientras se consultaba cambiaron la cédula o el tipo, el resultado es de otra
            // persona: se descarta y se vuelve a consultar con lo que hay ahora.
            if (claveActual() !== clave) {
                lastClave = '';
                pendiente = true;
                return;
            }

            if (!nombre) {
                setValue('nombres', ''); // no dejar el nombre de la persona anterior
                showManualAlert();
                return;
            }

            setValue('nombres', nombre);
        } catch (e) {
            console.error('[Autocompletar nombre]', e);
            if (claveActual() === clave) setValue('nombres', '');
            showManualAlert();
        } finally {
            running = false;
            if (pendiente) {
                pendiente = false;
                schedule();
            }
        }
    }

    let t = null;
    const schedule = () => {
        clearTimeout(t);
        t = setTimeout(tryAutofill, 2500);
    };

    // Los eventos se escuchan en el documento (fase de captura) y se filtran por campo,
    // así funciona aunque GESI cree o reemplace los campos después de cargar la página.
    ['blur', 'change', 'keyup'].forEach((ev) => {
        document.addEventListener(ev, (e) => {
            if (!e.target) return;
            if (e.target.id === IDS.cedula) schedule();
            else if (e.target.id === IDS.tipo_doc && ev === 'change') schedule();
        }, true);
    });
})();
