// ==UserScript==
// @name         AUTOCOMPLETAR POR CÉDULA (EDUCATIVO E INSTITUCIONAL)
// @namespace    https://gesiapps.saludcapital.gov.co/GESI_sistemas/GESI_Form*
// @version      1.4
// @description  Búsqueda y autocompletado de personas por documento en Comprobador de Derechos y Supersalud (con asignación de género >= 14 años). Funciona aunque Supersalud esté caído.
// @author       You
// @match        https://gesiapps.saludcapital.gov.co/GESI_sistemas/GESI_Form*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        GM_xmlhttpRequest
// @connect      appb.saludcapital.gov.co
// @connect      pqrdsuperargo.supersalud.gov.co
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    const LOG = '[Autocompletar cédula]';
    const BASE_COMPROBADOR = 'https://appb.saludcapital.gov.co/comprobadordederechos/';
    const BASE_SUPERSALUD  = 'https://pqrdsuperargo.supersalud.gov.co/api/api/adres/';

    const MAPAS_ENTORNO = {
        educativo: {
            nombres:          'valorControl17508',
            apellidos:        'valorControl17509',
            tipo_doc:         'valorControl17510',
            cedula:           'valorControl17511',
            sexo:             'valorControl17512',
            genero:           'valorControl17513',
            orientacion:      'valorControl17514',
            identidad_genero: 'valorControl17515',
            fecha:            'valorControl17516'
        },
        institucional: {
            nombres:          'valorControl19129',
            apellidos:        'valorControl19130',
            tipo_doc:         'valorControl19131',
            cedula:           'valorControl19132',
            sexo:             'valorControl19133',
            genero:           'valorControl19134',
            orientacion:      'valorControl19135',
            identidad_genero: 'valorControl19136',
            fecha:            'valorControl19137'
        }
    };

    function getEntorno() {
        if (document.getElementById('valorControl17511') || document.getElementById('valorControl17510')) {
            return MAPAS_ENTORNO.educativo;
        }
        if (document.getElementById('valorControl19132') || document.getElementById('valorControl19131')) {
            return MAPAS_ENTORNO.institucional;
        }
        return null;
    }

    function getCampo(clave) {
        const env = getEntorno();
        if (!env || !env[clave]) return null;
        return document.getElementById(env[clave]);
    }

    const TIPO_DOC_GESI_A_SUPERSALUD = {
        '59': '0',    // Cédula de Ciudadanía
        '61': '1',    // Tarjeta de Identidad
        '60': '8',    // Registro Civil
        '62': '2',    // Cédula de Extranjería
        '2482': '13', // PPT
    };

    const SEXO_SUPERSALUD_A_GESI = { 1: '67', 2: '68' };
    const CLASE_AVISO = 'aviso-sexo-revisar';
    let autocompletando = false;

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

    function setValueSiExiste(clave, value) {
        const el = getCampo(clave);
        if (!el || !value) return false;
        if (el.tagName === 'SELECT' && !Array.from(el.options).some((o) => o.value === String(value))) return false;
        return setValue(clave, value);
    }

    function extraerCampo(html, name) {
        const regex = new RegExp('name="' + name + '"[^>]*value="([^"]*)"');
        const m = html.match(regex);
        return m ? m[1] : '';
    }

    function gmRequest(opts) {
    // En Tampermonkey: usa GM_xmlhttpRequest como siempre
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
        return r; // trae .status y .responseText, igual que GM_xmlhttpRequest
    });
}
        const api = window.pywebview && window.pywebview.api;
        if (!api || typeof api.cd_http_request !== 'function') {
            return Promise.reject(new Error('puente de la app no disponible (¿app anterior a 1.0.45?)'));
        }
        return api.cd_http_request(Object.assign({ timeout: 20000 }, opts)).then((r) => {
            if (!r || !r.ok) throw new Error((r && r.error) || 'error de red');
            return r;
        });
    }

    function unir(...partes) {
        return partes.map((p) => String(p ?? '').trim()).filter(Boolean).join(' ');
    }

    // Quita tildes, pasa a minúsculas y colapsa espacios (para comparar encabezados)
    function norm(s) {
        return String(s || '')
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .trim();
    }

    // Recibe fechas ISO (yyyy-mm-dd...) o latinas (dd/mm/yyyy [hora]) y las deja
    // en el formato que necesite el campo del formulario
    function formatearFecha(valor) {
        const s = String(valor || '').trim();
        if (!s) return '';
        let y, m, d;
        const mIso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
        const mLat = /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/.exec(s);
        if (mIso) { y = mIso[1]; m = mIso[2]; d = mIso[3]; }
        else if (mLat) { d = mLat[1].padStart(2, '0'); m = mLat[2].padStart(2, '0'); y = mLat[3]; }
        else return s;
        const el = getCampo('fecha');
        if (el && el.type === 'date') return y + '-' + m + '-' + d;
        return d + '/' + m + '/' + y;
    }

    function normalizarApellidos(s) {
        return String(s || '')
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .toUpperCase()
            .split(/\s+/).filter(Boolean)
            .sort().join(' ');
    }

    function numeroCoincide(d, documento) {
        const quitarCeros = (s) => String(s).replace(/\D/g, '').replace(/^0+/, '');
        const esperado = quitarCeros(documento);
        for (const [k, v] of Object.entries(d)) {
            if (!/(identific|documento|numero|nro|cedula|^id$)/i.test(k)) continue;
            if (typeof v !== 'string' && typeof v !== 'number') continue;
            const digitos = quitarCeros(v);
            if (digitos && digitos !== esperado) return false;
        }
        return true;
    }

    function calcularEdad(fechaStr) {
        if (!fechaStr) return null;
        let dia, mes, anio;
        const mIso = /^(\d{4})-(\d{2})-(\d{2})/.exec(fechaStr);
        if (mIso) {
            anio = parseInt(mIso[1], 10);
            mes  = parseInt(mIso[2], 10) - 1;
            dia  = parseInt(mIso[3], 10);
        } else {
            const mLat = /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/.exec(fechaStr);
            if (mLat) {
                dia  = parseInt(mLat[1], 10);
                mes  = parseInt(mLat[2], 10) - 1;
                anio = parseInt(mLat[3], 10);
            }
        }
        if (!anio || isNaN(mes) || !dia) return null;
        const hoy = new Date();
        const nac = new Date(anio, mes, dia);
        let edad = hoy.getFullYear() - nac.getFullYear();
        const m = hoy.getMonth() - nac.getMonth();
        if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
        return edad;
    }

    function actualizarGeneroYOrientacion(sexoVal, tipoDocVal, fechaVal) {
        if (!sexoVal) return;
        const edad = calcularEdad(fechaVal);
        const esMayorOIgual14 = String(tipoDocVal) === '59' || (edad !== null && edad >= 14);

        if (esMayorOIgual14) {
            if (sexoVal === '67') {
                setValueSiExiste('genero', '70');
                setValueSiExiste('orientacion', '4024');
                setValueSiExiste('identidad_genero', '4515');
            } else if (sexoVal === '68') {
                setValueSiExiste('genero', '71');
                setValueSiExiste('orientacion', '4024');
                setValueSiExiste('identidad_genero', '4514');
            }
        } else {
            if (sexoVal === '67' || sexoVal === '68') {
                setValueSiExiste('genero', '4513');
                setValueSiExiste('orientacion', '4028');
                setValueSiExiste('identidad_genero', '4020');
            }
        }
    }

    function quitarAvisos() {
        document.querySelectorAll('.' + CLASE_AVISO).forEach((a) => a.remove());
    }

    function mostrarAviso(clave, texto) {
        const campo = getCampo(clave);
        if (!campo || !campo.parentNode) return;
        const div = document.createElement('div');
        div.className = CLASE_AVISO;
        div.textContent = '⚠ ' + texto;
        Object.assign(div.style, {
            color: '#b30000', background: '#ffe6e6', padding: '6px',
            marginTop: '4px', border: '1px solid #ff9999', borderRadius: '4px', fontSize: '12px'
        });
        campo.parentNode.appendChild(div);
    }

    function mostrarAvisoSexo(motivo) {
        mostrarAviso('sexo', 'No se pudo obtener el sexo automáticamente (' + motivo + '). Revíselo a mano: puede tener un valor anterior.');
    }

    // ---------- COMPROBADOR DE DERECHOS ----------

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
                if (fila === headerRow || fila.classList.contains('RowEmpty')) return;
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

    // Busca en un registro el primer valor no vacío cuyo encabezado (normalizado) cumpla el patrón
    function valorPorEncabezado(registro, patron) {
        for (const [k, v] of Object.entries(registro)) {
            if (k === '_fuente') continue;
            if (patron.test(norm(k)) && String(v || '').trim()) return String(v).trim();
        }
        return '';
    }

    function extraerDatosRegistro(r) {
        const apellidos = unir(
            valorPorEncabezado(r, /^primer apellido$|^apellido 1$|^1er apellido$/),
            valorPorEncabezado(r, /^segundo apellido$|^apellido 2$|^2do apellido$/)
        ) || valorPorEncabezado(r, /^apellidos?$/);

        const nombres = unir(
            valorPorEncabezado(r, /^primer nombre$|^nombre 1$|^1er nombre$/),
            valorPorEncabezado(r, /^segundo nombre$|^nombre 2$|^2do nombre$/)
        ) || valorPorEncabezado(r, /^nombres?$/);

        const fecha = valorPorEncabezado(r, /fecha.*nac|f\.? ?nac|nacimiento/);

        return { apellidos, nombres, fecha };
    }

       async function consultarComprobador(documento) {
        const diag = [];

        const r1 = await gmRequest({ method: 'GET', url: BASE_COMPROBADOR + 'Consulta.aspx' });
        const html1 = r1.responseText || '';
        diag.push('GET1 status=' + r1.status + ' len=' + html1.length +
            ' viewstate=' + (extraerCampo(html1, '__VIEWSTATE') ? 'si' : 'NO') +
            ' claves=[' + Object.keys(r1).join(',') + ']');

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
        const txt2 = r2.responseText || '';
        diag.push('POST status=' + r2.status + ' len=' + txt2.length +
            ' noSeEncontro=' + (txt2.indexOf('No se encontr') !== -1) +
            ' inicio="' + txt2.slice(0, 80).replace(/\s+/g, ' ') + '"');

        if (txt2.indexOf('No se encontr') !== -1) {
            throw new Error(diag.join(' | '));
        }

        const r3 = await gmRequest({ method: 'GET', url: BASE_COMPROBADOR + 'Resultados.aspx' });
        const txt3 = r3.responseText || '';
        const doc = new DOMParser().parseFromString(txt3, 'text/html');
        const registros = parseTablasComprobador(doc);
        diag.push('GET3 status=' + r3.status + ' len=' + txt3.length +
            ' registros=' + registros.length +
            ' titulo="' + ((doc.title || '').slice(0, 40)) + '"');

        console.log(LOG, 'DIAG', diag);
        registros.forEach((r, i) => console.log(LOG, 'Registro', i, r._fuente, Object.keys(r), r));

        if (!registros.length) {
            throw new Error(diag.join(' | '));
        }

        const datos = registros.map(extraerDatosRegistro);
        const base = datos.find((d) => d.nombres && d.apellidos) || {};
        const out = {
            apellidos: base.apellidos || (datos.find((d) => d.apellidos) || {}).apellidos || '',
            nombres:   base.nombres   || (datos.find((d) => d.nombres)   || {}).nombres   || '',
            fecha:     (datos.find((d) => d.fecha) || {}).fecha || '',
        };

        if (!out.nombres && !out.apellidos) {
            diag.push('encabezados=[' + Object.keys(registros[0]).join(',') + ']');
            throw new Error(diag.join(' | '));
        }

        console.log(LOG, 'Comprobador: datos combinados =', out);
        return out;
    }

    // ---------- SUPERSALUD ----------

    async function consultarSupersalud(documento, codigoTipo) {
        const r = await gmRequest({
            method: 'GET',
            url: BASE_SUPERSALUD + codigoTipo + '/' + encodeURIComponent(documento),
            headers: { Accept: 'application/json' },
            timeout: 8000, // si está caído no bloquea al resto
        });
        if (typeof r.status === 'number' && (r.status === 0 || r.status >= 500)) {
            throw new Error('Supersalud no disponible (status ' + r.status + ')');
        }
        if (r.status < 200 || r.status >= 300) return null;

        let d;
        try { d = JSON.parse(r.responseText || ''); } catch (e) { return null; }
        if (!d || typeof d !== 'object') return null;

        return {
            apellidos: unir(d.apellido, d.s_apellido),
            nombres: unir(d.nombre, d.s_nombre),
            fecha: d.fecha_nacimiento ? String(d.fecha_nacimiento).trim() : '',
            sexo: SEXO_SUPERSALUD_A_GESI[d.sexo] || '',
            numeroOk: numeroCoincide(d, documento),
        };
    }

    // ---------- BÚSQUEDA COMBINADA ----------

    async function buscarPersona(documento, tipoDoc) {
        const codigoTipo = TIPO_DOC_GESI_A_SUPERSALUD[tipoDoc];

        // Primero el Comprobador (depende de la sesión), luego Supersalud
        let base = null;
        let errorBase = '';
        try {
            base = await consultarComprobador(documento);
        } catch (e) {
            errorBase = String((e && e.message) || e);
            console.warn(LOG, 'Falló Comprobador de Derechos:', e);
        }

        let motivoSexo = '';
        let sup = null;
        if (codigoTipo === undefined) {
            motivoSexo = 'este tipo de documento no está configurado para Supersalud';
        } else {
            try {
                sup = await consultarSupersalud(documento, codigoTipo);
            } catch (e) {
                console.warn(LOG, 'Falló Supersalud:', e);
                motivoSexo = 'Supersalud no está disponible en este momento';
            }
        }

        if (codigoTipo !== undefined && !sup && !motivoSexo) {
            motivoSexo = 'Supersalud no encontró a la persona con este tipo de documento';
        }

        const persona = {};
        [base, sup].forEach((fuente) => {
            if (!fuente) return;
            ['nombres', 'apellidos', 'fecha'].forEach((c) => { if (!persona[c] && fuente[c]) persona[c] = fuente[c]; });
        });

        if (sup && !motivoSexo) {
            if (!sup.sexo) {
                motivoSexo = 'Supersalud no entregó un sexo válido';
            } else if (!base) {
                motivoSexo = 'no se pudo verificar la persona con el Comprobador de Derechos';
            } else if (!sup.numeroOk) {
                motivoSexo = 'el número de documento de Supersalud no coincide';
            } else if (!base.apellidos || normalizarApellidos(base.apellidos) !== normalizarApellidos(sup.apellidos)) {
                motivoSexo = 'los apellidos de Supersalud no coinciden con los del Comprobador';
            } else {
                persona.sexo = sup.sexo;
            }
        }

        // Se acepta resultado parcial: basta con tener nombres o apellidos
        const hayAlgo = !!(persona.nombres || persona.apellidos);
        const faltantes = ['nombres', 'apellidos', 'fecha'].filter((c) => !persona[c]);
        console.log(LOG, 'Resultado final:', persona, 'faltan:', faltantes, 'motivoSexo:', motivoSexo);

        return { persona: hayAlgo ? persona : null, faltantes, motivoSexo, errorBase };
    }

    function showManualAlert(detalle) {
        alert('No se encontró la cédula o hubo un error. Por favor, llena los campos manualmente.' + (detalle ? '\n\nDetalle: ' + detalle : ''));
    }

    let running = false;
    let lastClave = '';

    async function tryAutofill() {
        const cedEl = getCampo('cedula');
        if (!cedEl) return;

        const cedula = (cedEl.value || '').trim();
        if (!cedula) return;
        if (running) { schedule(); return; }

        const tipoEl = getCampo('tipo_doc');
        const tipoDoc = tipoEl ? String(tipoEl.value || '') : '';

        const clave = tipoDoc + '|' + cedula;
        if (clave === lastClave) return;

        const documento = cedula.replace(/[^0-9]/g, '');
        if (!documento) return;

        lastClave = clave;
        running = true;
        quitarAvisos();

        try {
            const { persona, faltantes, motivoSexo, errorBase } = await buscarPersona(documento, tipoDoc);
            if (!persona) {
                showManualAlert(errorBase || 'el Comprobador no devolvió datos');
                return;
            }

            autocompletando = true;
            try {
                if (persona.nombres)   setValue('nombres', persona.nombres);
                if (persona.apellidos) setValue('apellidos', persona.apellidos);

                const fechaFmt = formatearFecha(persona.fecha);
                if (fechaFmt) setValue('fecha', fechaFmt);

                const sexoLleno = setValueSiExiste('sexo', persona.sexo);
                if (sexoLleno) {
                    actualizarGeneroYOrientacion(persona.sexo, tipoDoc, fechaFmt || persona.fecha);
                } else {
                    mostrarAvisoSexo(motivoSexo || 'la opción de sexo no existe en el formulario');
                }

                // Avisos por datos que no se pudieron obtener
                if (faltantes.includes('fecha'))     mostrarAviso('fecha', 'No se obtuvo la fecha de nacimiento. Digítela a mano.');
                if (faltantes.includes('nombres'))   mostrarAviso('nombres', 'No se obtuvieron los nombres. Digítelos a mano.');
                if (faltantes.includes('apellidos')) mostrarAviso('apellidos', 'No se obtuvieron los apellidos. Digítelos a mano.');
            } finally {
                autocompletando = false;
            }
        } catch (e) {
            console.error(LOG, e);
            showManualAlert(String((e && e.message) || e));
        } finally {
            running = false;
        }
    }

    let t = null;
    const schedule = () => {
        clearTimeout(t);
        t = setTimeout(tryAutofill, 2500);
    };

    ['blur', 'change', 'keyup'].forEach((ev) => {
        document.addEventListener(ev, (e) => {
            const env = getEntorno();
            if (!e.target || !env) return;

            if (e.target.id === env.cedula) {
                schedule();
            } else if (e.target.id === env.tipo_doc && ev === 'change') {
                schedule();
            } else if (e.target.id === env.sexo && ev === 'change') {
                if (!autocompletando) {
                    quitarAvisos();
                    const fechaVal = getCampo('fecha')?.value || '';
                    const tipoDocVal = getCampo('tipo_doc')?.value || '';
                    actualizarGeneroYOrientacion(e.target.value, tipoDocVal, fechaVal);
                }
            }
        }, true);
    });

})();
