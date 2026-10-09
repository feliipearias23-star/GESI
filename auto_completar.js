// ==UserScript==
// @name         AUTOCOMPLETAR POR CÉDULA (EDUCATIVO E INSTITUCIONAL)
// @namespace    https://gesiapps.saludcapital.gov.co/GESI_sistemas/GESI_Form*
// @version      1.5
// @description  Búsqueda y autocompletado de personas por documento en Comprobador de Derechos y Supersalud (con asignación de género >= 14 años)
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
    const CLASE_AVISO_SEXO = 'aviso-sexo-revisar';
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
        if (typeof GM_xmlhttpRequest === 'function') {
            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest(Object.assign({ timeout: 20000 }, opts, {
                    onload: resolve,
                    onerror: reject,
                    ontimeout: () => reject(new Error('timeout')),
                }));
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

    function formatearFechaISO(iso) {
        const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || '').trim());
        if (!m) return String(iso || '').trim();
        const el = getCampo('fecha');
        if (el && el.type === 'date') return m[1] + '-' + m[2] + '-' + m[3];
        return m[3] + '/' + m[2] + '/' + m[1];
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

    function quitarAvisoSexo() {
        document.querySelectorAll('.' + CLASE_AVISO_SEXO).forEach((a) => a.remove());
    }

    function mostrarAvisoSexo(motivo) {
        quitarAvisoSexo();
        const campo = getCampo('sexo');
        if (!campo || !campo.parentNode) return;
        const div = document.createElement('div');
        div.className = CLASE_AVISO_SEXO;
        div.textContent = '⚠ No se pudo obtener el sexo automáticamente (' + motivo + '). Revíselo a mano: puede tener un valor anterior.';
        Object.assign(div.style, {
            color: '#b30000', background: '#ffe6e6', padding: '6px',
            marginTop: '4px', border: '1px solid #ff9999', borderRadius: '4px', fontSize: '12px'
        });
        campo.parentNode.appendChild(div);
    }

    // CAMBIO: aviso para la fecha cuando Supersalud está caído y el Comprobador no la trae
    function mostrarAvisoFecha() {
        const campo = getCampo('fecha');
        if (!campo || !campo.parentNode) return;
        const div = document.createElement('div');
        div.className = CLASE_AVISO_SEXO;
        div.textContent = '⚠ No se obtuvo la fecha de nacimiento (Supersalud no está disponible). Digítela a mano.';
        Object.assign(div.style, {
            color: '#b30000', background: '#ffe6e6', padding: '6px',
            marginTop: '4px', border: '1px solid #ff9999', borderRadius: '4px', fontSize: '12px'
        });
        campo.parentNode.appendChild(div);
    }

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
        const r = parseTablasComprobador(doc)[0];
        if (!r) return null;

        return {
            apellidos: unir(r['Primer Apellido'], r['Segundo Apellido']),
            nombres: unir(r['Primer Nombre'], r['Segundo Nombre']),
            fecha: (r['Fecha Nacimiento'] || '').trim(),
        };
    }

    async function consultarSupersalud(documento, codigoTipo) {
        const r = await gmRequest({
            method: 'GET',
            url: BASE_SUPERSALUD + codigoTipo + '/' + encodeURIComponent(documento),
            headers: { Accept: 'application/json' },
        });
        // CAMBIO: status 0 o 5xx = Supersalud caído (se distingue de "no encontrado")
        if (typeof r.status === 'number' && (r.status === 0 || r.status >= 500)) {
            throw new Error('Supersalud caído (status ' + r.status + ')');
        }
        if (r.status < 200 || r.status >= 300) return null;

        let d;
        try { d = JSON.parse(r.responseText || ''); } catch (e) { return null; }
        if (!d || typeof d !== 'object') return null;

        return {
            apellidos: unir(d.apellido, d.s_apellido),
            nombres: unir(d.nombre, d.s_nombre),
            fecha: formatearFechaISO(d.fecha_nacimiento),
            sexo: SEXO_SUPERSALUD_A_GESI[d.sexo] || '',
            numeroOk: numeroCoincide(d, documento),
        };
    }

    async function buscarPersona(documento, tipoDoc) {
        let base = null;
        try {
            base = await consultarComprobador(documento);
        } catch (e) {
            console.warn('[Autocompletar cédula] Falló Comprobador de Derechos:', e);
        }

        const codigoTipo = TIPO_DOC_GESI_A_SUPERSALUD[tipoDoc];
        let sup = null;
        let motivoSexo = '';
        let supCaido = false; // CAMBIO

        if (codigoTipo === undefined) {
            motivoSexo = 'este tipo de documento no está configurado para Supersalud';
        } else {
            try {
                sup = await consultarSupersalud(documento, codigoTipo);
                if (!sup) motivoSexo = 'Supersalud no encontró a la persona con este tipo de documento';
            } catch (e) {
                console.warn('[Autocompletar cédula] Falló Supersalud:', e);
                motivoSexo = 'falló la consulta a Supersalud';
                supCaido = true; // CAMBIO
            }
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

        // CAMBIO: solo si Supersalud está caído se acepta sin fecha; en los demás casos igual que antes
        const completa = persona.nombres && persona.apellidos && persona.fecha;
        const aceptable = supCaido ? (persona.nombres && persona.apellidos) : completa;
        return { persona: aceptable ? persona : null, motivoSexo };
    }

    function showManualAlert() {
        alert('No se encontró la cédula o hubo un error. Por favor, llena los campos manualmente.');
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
        quitarAvisoSexo();

        try {
            const { persona, motivoSexo } = await buscarPersona(documento, tipoDoc);
            if (!persona) {
                showManualAlert();
                return;
            }

            autocompletando = true;
            try {
                setValue('nombres', persona.nombres);
                setValue('apellidos', persona.apellidos);
                if (persona.fecha) {
                    setValue('fecha', persona.fecha);
                } else {
                    mostrarAvisoFecha(); // CAMBIO
                }
                const sexoLleno = setValueSiExiste('sexo', persona.sexo);
                if (sexoLleno) {
                    actualizarGeneroYOrientacion(persona.sexo, tipoDoc, persona.fecha);
                } else {
                    mostrarAvisoSexo(motivoSexo || 'la opción de sexo no existe en el formulario');
                    if (!persona.fecha) mostrarAvisoFecha(); // mostrarAvisoSexo borra avisos previos
                }
            } finally {
                autocompletando = false;
            }
        } catch (e) {
            showManualAlert();
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
                    quitarAvisoSexo();
                    const fechaVal = getCampo('fecha')?.value || '';
                    const tipoDocVal = getCampo('tipo_doc')?.value || '';
                    actualizarGeneroYOrientacion(e.target.value, tipoDocVal, fechaVal);
                }
            }
        }, true);
    });

})();
