// ==UserScript==
// @name         SALUD ORAL
// @namespace    https://gesiapps.saludcapital.gov.co/GESI_sistemas/GESI_Form*
// @version      2026.10.27.1
// @description  Salud Oral: cascadas por tipo de documento, cascada sexo/género según edad, validador edad/documento, canalización por defecto, validación de fechas y autocompletado por cédula (Comprobador de Derechos + Supersalud con sexo verificado)
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
    const bgSuccess = 'rgba(50, 200, 150, 0.2)';

    const IDS = {
        recaracterizacion: 'valorControl18702',

        nombres: 'valorControl18703',
        apellidos: 'valorControl18704',
        cedula: 'valorControl18706',
        fecha: 'valorControl18710',

        tipo_doc: 'valorControl18705',
        nacionalidad: 'valorControl18707',
        sexo: 'valorControl18708',
        genero: 'valorControl18709',
        edad: 'valorControl18711',
        etapa_gestacion: 'valorControl18713',
        rol_institucion: 'valorControl18714',
        canalizacion: 'valorControl18745',
        porque_no_canalizo: 'valorControl18746',
    };

    const ID_FECHA_INTERVENCION = 'FechaIntervencion';

    const FECHAS_POSTERIORES = ['valorControl18716', 'valorControl18718', 'valorControl18721', 'valorControl18723'];

    const DEFAULTS_UNA_VEZ = [
        { clave: 'canalizacion', valor: '959' },
        { clave: 'porque_no_canalizo', valor: '4129', requiere: { clave: 'canalizacion', valor: '959' } },
        { clave: 'rol_institucion', valor: '4120' },
    ];

    const VALORES_COMUNES_DOC = {
        etapa_gestacion: '3785',
    };
    const GRUPOS_DOC = [
        { docs: [59, 60, 61], colorearDoc: true, valores: { nacionalidad: '50' } },
        { docs: [62, 63, 64, 65, 66, 2482], colorearDoc: false, valores: { nacionalidad: '236' } },
    ];

    const EDAD_MINIMA_MAYORES = 14;
    const CASCADA_MAYORES = {
        '67': { genero: '70' },
        '68': { genero: '71' },
    };
    const CASCADA_MENORES = { genero: '4513' };

    const reglasDocumento = {
        '60': { nombre: 'Registro Civil',       edadMin: 0,  edadMax: 6   },
        '61': { nombre: 'Tarjeta de Identidad', edadMin: 7,  edadMax: 17  },
        '59': { nombre: 'Cédula de Ciudadanía', edadMin: 18, edadMax: 999 },
    };

    // ════════════════════════════════════════════════════════════════════
    // UTILIDADES
    // ════════════════════════════════════════════════════════════════════
    function getCampo(clave) { return document.getElementById(IDS[clave]); }

    function ejecutarSeguro(nombre, fn) {
        try { fn(); } catch (error) { console.error('[SALUD ORAL · ' + nombre + ']', error); }
    }

    function aplicar(campo, valor) {
        if (!campo) return;
        const v = String(valor);
        if (campo.tagName === 'SELECT' && !Array.from(campo.options).some((o) => o.value === v)) return;

        let cambio;
        if (campo.multiple) {
            const seleccionados = Array.from(campo.options).filter((o) => o.selected).map((o) => o.value);
            cambio = !(seleccionados.length === 1 && seleccionados[0] === v);
            if (cambio) Array.from(campo.options).forEach((o) => { o.selected = (o.value === v); });
        } else {
            cambio = campo.value !== v;
            if (cambio) campo.value = v;
        }
        campo.style.backgroundColor = bgSuccess;
        if (cambio) campo.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function aplicarMapa(valores) {
        Object.keys(valores).forEach((k) => aplicar(getCampo(k), valores[k]));
    }

    // ════════════════════════════════════════════════════════════════════
    // CASCADAS
    // ════════════════════════════════════════════════════════════════════
    function cascadaDocumento() {
        const tipoDoc = getCampo('tipo_doc');
        if (!tipoDoc) return;
        const v = parseInt(tipoDoc.value, 10);
        const grupo = GRUPOS_DOC.find((g) => g.docs.includes(v));
        if (!grupo) return;
        if (grupo.colorearDoc) tipoDoc.style.backgroundColor = bgSuccess;
        aplicarMapa(Object.assign({}, VALORES_COMUNES_DOC, grupo.valores));
    }

    function cascadaSexoEdad() {
        const sexo = getCampo('sexo');
        const tipoDoc = getCampo('tipo_doc');
        const edadEl = getCampo('edad');
        if (!sexo || !tipoDoc) return;

        const sexoActual = sexo.value;
        const esHombreOMujer = sexoActual === '67' || sexoActual === '68';
        const edad = parseInt(edadEl ? edadEl.value : '', 10);
        const esMayor = !isNaN(edad) ? edad >= EDAD_MINIMA_MAYORES : tipoDoc.value === '59';
        const cascada = esMayor
            ? CASCADA_MAYORES[sexoActual]
            : (esHombreOMujer ? CASCADA_MENORES : null);
        if (!cascada) return;

        sexo.style.backgroundColor = bgSuccess;
        aplicarMapa(cascada);
    }

    // ════════════════════════════════════════════════════════════════════
    // VALORES POR DEFECTO
    // ════════════════════════════════════════════════════════════════════
    function defaultsUnaVez() {
        DEFAULTS_UNA_VEZ.forEach(({ clave, valor, requiere }) => {
            const campo = getCampo(clave);
            if (!campo || campo.dataset.uaiInicial === '1') return;
            if (requiere) {
                const dependencia = getCampo(requiere.clave);
                if (!dependencia || dependencia.value !== requiere.valor) return;
            }
            campo.dataset.uaiInicial = '1';
            if (campo.value === '') aplicar(campo, valor);
        });
    }

    // ════════════════════════════════════════════════════════════════════
    // VALIDADOR EDAD / TIPO DE DOCUMENTO
    // ════════════════════════════════════════════════════════════════════
    const CLASE_ERROR = 'mensaje-validacion-so';
    const CLASE_OK = 'mensaje-autocorreccion-so';
    let intentoCorreccion = '';
    let marcado = false;

    function quitarMensajes() {
        document.querySelectorAll('.' + CLASE_ERROR + ', .' + CLASE_OK).forEach((m) => m.remove());
    }

    function desmarcar(campoEdad, campoDoc) {
        if (marcado) {
            [campoEdad, campoDoc].forEach((c) => { if (c) { c.style.border = ''; c.style.background = ''; } });
            marcado = false;
        }
        const err = document.querySelector('.' + CLASE_ERROR);
        if (err) err.remove();
    }

    function mostrarMensaje(campoEdad, clase, texto, estilo, segundos) {
        quitarMensajes();
        const div = document.createElement('div');
        div.className = clase;
        div.textContent = texto;
        Object.assign(div.style, estilo, { padding: '6px', marginTop: '4px', borderRadius: '4px', fontSize: '12px' });
        campoEdad.parentNode.appendChild(div);
        if (segundos) setTimeout(() => div.remove(), segundos * 1000);
    }

    function corregirTipoDocumento(campoEdad, campoDoc, valor, nombre, edad) {
        if (campoDoc.tagName === 'SELECT' && !Array.from(campoDoc.options).some((o) => o.value === valor)) return false;
        campoDoc.value = valor;
        estado.doc = valor;
        cascadaDocumento();
        ['input', 'change'].forEach((ev) => campoDoc.dispatchEvent(new Event(ev, { bubbles: true })));
        mostrarMensaje(campoEdad, CLASE_OK,
            `✔ Con ${edad} años el tipo de documento se cambió a "${nombre}".`,
            { color: '#1b5e20', background: '#e8f5e9', border: '1px solid #a5d6a7' }, 6);
        return true;
    }

    function validarEdadDocumento() {
        const campoEdad = getCampo('edad');
        const campoDoc = getCampo('tipo_doc');
        if (!campoEdad || !campoDoc || !campoEdad.parentNode) return;

        desmarcar(campoEdad, campoDoc);

        const edad = parseInt(campoEdad.value, 10);
        const docValue = campoDoc.value;
        const regla = reglasDocumento[docValue];
        if (isNaN(edad) || !regla) { intentoCorreccion = ''; return; }
        if (edad >= regla.edadMin && edad <= regla.edadMax) { intentoCorreccion = ''; return; }

        const correcto = Object.entries(reglasDocumento)
            .find(([, r]) => edad >= r.edadMin && edad <= r.edadMax);
        const docCorrectoValor = correcto ? correcto[0] : null;
        const docCorrecto = correcto ? correcto[1].nombre : 'Desconocido';

        const clave = edad + '|' + docValue;
        if (docCorrectoValor && intentoCorreccion !== clave) {
            intentoCorreccion = clave;
            if (corregirTipoDocumento(campoEdad, campoDoc, docCorrectoValor, docCorrecto, edad)) return;
        }

        [campoEdad, campoDoc].forEach((c) => { c.style.border = '2px solid red'; c.style.background = '#fff0f0'; });
        marcado = true;
        mostrarMensaje(campoEdad, CLASE_ERROR,
            `⚠ Con ${edad} años debe usar "${docCorrecto}".`,
            { color: '#b30000', background: '#ffe6e6', border: '1px solid #ff9999' }, 0);
    }

    // ════════════════════════════════════════════════════════════════════
    // VALIDACIÓN DE FECHAS
    // ════════════════════════════════════════════════════════════════════
    const CLASE_FECHA = 'mensaje-fecha-so';
    let ultimaFirmaFechas = null;

    function parseFecha(texto) {
        const s = String(texto || '').trim();
        let d, mo, y;
        let m = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/.exec(s);
        if (m) {
            d = +m[1]; mo = +m[2]; y = +m[3];
        } else {
            m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
            if (!m) return null;
            y = +m[1]; mo = +m[2]; d = +m[3];
        }
        const f = new Date(y, mo - 1, d);
        if (f.getFullYear() !== y || f.getMonth() !== mo - 1 || f.getDate() !== d) return null;
        return f;
    }

    function formatearFecha(f) {
        const dd = String(f.getDate()).padStart(2, '0');
        const mm = String(f.getMonth() + 1).padStart(2, '0');
        return dd + '/' + mm + '/' + f.getFullYear();
    }

    function limpiarMarcasFechas() {
        document.querySelectorAll('.' + CLASE_FECHA).forEach((m) => m.remove());
        document.querySelectorAll('[data-uai-fecha-error="1"]').forEach((el) => {
            el.style.border = '';
            el.style.background = '';
            delete el.dataset.uaiFechaError;
        });
    }

    function marcarFecha(campo, texto) {
        campo.style.border = '2px solid red';
        campo.style.background = '#fff0f0';
        campo.dataset.uaiFechaError = '1';
        const div = document.createElement('div');
        div.className = CLASE_FECHA;
        div.textContent = '⚠ ' + texto;
        Object.assign(div.style, { color: '#b30000', background: '#ffe6e6', padding: '6px',
            marginTop: '4px', border: '1px solid #ff9999', borderRadius: '4px', fontSize: '12px' });
        const ancla = campo.closest('.input-group') || campo;
        ancla.insertAdjacentElement('afterend', div);
    }

    function validarFechas() {
        const intervencionEl = document.getElementById(ID_FECHA_INTERVENCION);
        const recarEl = getCampo('recaracterizacion');
        const otras = FECHAS_POSTERIORES.map((id) => document.getElementById(id));

        const firma = [intervencionEl, recarEl].concat(otras).map((el) => (el ? el.value : '')).join('|');
        if (firma === ultimaFirmaFechas) return;
        ultimaFirmaFechas = firma;

        limpiarMarcasFechas();

        const intervencion = intervencionEl ? parseFecha(intervencionEl.value) : null;
        const recar = recarEl ? parseFecha(recarEl.value) : null;
        if (!recar) return;

        if (intervencion && recar < intervencion) {
            marcarFecha(recarEl, `La fecha de re_caracterización no puede ser menor a la fecha de intervención (${formatearFecha(intervencion)}).`);
        }
        otras.forEach((el) => {
            const f = el ? parseFecha(el.value) : null;
            if (f && f < recar) {
                marcarFecha(el, `Debe ser igual o posterior a la fecha de re_caracterización (${formatearFecha(recar)}).`);
            }
        });
    }

    // ════════════════════════════════════════════════════════════════════
    // AUTOCOMPLETAR POR CÉDULA (Comprobador de Derechos + Supersalud)
    // ════════════════════════════════════════════════════════════════════
    const BASE_COMPROBADOR = 'https://appb.saludcapital.gov.co/comprobadordederechos/';
    const BASE_SUPERSALUD = 'https://pqrdsuperargo.supersalud.gov.co/api/api/adres/';

    const TIPO_DOC_GESI_A_SUPERSALUD = {
        '59': '0',
        '61': '1',
        '60': '8',
        '62': '2',
        '2482': '13',
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
        const escapado = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp('name="' + escapado + '"[^>]*value="([^"]*)"');
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

    function soloDigitosSinCeros(s) {
        return String(s ?? '').replace(/\D/g, '').replace(/^0+/, '');
    }

    function numeroCoincide(d, documento) {
        const esperado = soloDigitosSinCeros(documento);
        for (const [k, v] of Object.entries(d)) {
            if (!/(identific|documento|numero|nro|cedula|^id$)/i.test(k)) continue;
            if (typeof v !== 'string' && typeof v !== 'number') continue;
            const digitos = soloDigitosSinCeros(v);
            if (digitos && digitos !== esperado) return false;
        }
        return true;
    }

    // ---------- Aviso debajo del campo Sexo ----------
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
        Object.assign(div.style, { color: '#b30000', background: '#ffe6e6', padding: '6px',
            marginTop: '4px', border: '1px solid #ff9999', borderRadius: '4px', fontSize: '12px' });
        campo.parentNode.appendChild(div);
    }

    // ---------- Fuente 1: Comprobador de Derechos ----------
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

    // ¿Algún dato del registro es el número de documento consultado?
    function registroEsDeDocumento(registro, documento) {
        const esperado = soloDigitosSinCeros(documento);
        if (!esperado) return false;
        return Object.entries(registro).some(([k, v]) => {
            if (k === '_fuente') return false;
            const texto = String(v || '').trim();
            // Solo celdas que sean básicamente un número (evita coincidencias casuales dentro de otros textos)
            if (!/^[\d.\s-]+$/.test(texto)) return false;
            return soloDigitosSinCeros(texto) === esperado;
        });
    }

    async function consultarComprobador(documento) {
        const r1 = await gmRequest({ method: 'GET', url: BASE_COMPROBADOR + 'Consulta.aspx' });
        const html1 = r1.responseText || '';

        const viewstate = extraerCampo(html1, '__VIEWSTATE');
        const viewstateGen = extraerCampo(html1, '__VIEWSTATEGENERATOR');
        const eventValidation = extraerCampo(html1, '__EVENTVALIDATION');
        const previousPage = extraerCampo(html1, '__PREVIOUSPAGE');

        // IMPORTANTE: los nombres de ASP.NET llevan "$" (ctl00$MainContent$txtNoId).
        // Sin los "$" el servidor no recibe la cédula y Resultados.aspx devuelve la última consulta de la sesión.
        const body = new URLSearchParams({
            __EVENTTARGET: '',
            __EVENTARGUMENT: '',
            __LASTFOCUS: '',
            __VIEWSTATE: viewstate,
            __VIEWSTATEGENERATOR: viewstateGen,
            __PREVIOUSPAGE: previousPage,
            __EVENTVALIDATION: eventValidation,
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

        const texto2 = r2.responseText || '';
        if (texto2.indexOf('No se encontr') !== -1) return null;
        // Si el servidor respondió con error, no se debe leer Resultados.aspx (traería la consulta anterior)
        if (texto2.indexOf('|error|') !== -1) {
            console.warn('[SALUD ORAL · cédula] El Comprobador respondió con error al consultar.');
            return null;
        }

        const r3 = await gmRequest({ method: 'GET', url: BASE_COMPROBADOR + 'Resultados.aspx' });
        const doc = new DOMParser().parseFromString(r3.responseText || '', 'text/html');
        const registros = parseTablasComprobador(doc);

        // Solo se acepta un registro que realmente pertenezca al documento digitado
        const r = registros.find((reg) => registroEsDeDocumento(reg, documento));
        if (!r) {
            if (registros.length) {
                console.warn('[SALUD ORAL · cédula] Se descartó un resultado que no corresponde al documento ' + documento + ' (posible consulta anterior de la sesión).');
            }
            return null;
        }

        return {
            apellidos: unir(r['Primer Apellido'], r['Segundo Apellido']),
            nombres: unir(r['Primer Nombre'], r['Segundo Nombre']),
            fecha: (r['Fecha Nacimiento'] || '').trim(),
        };
    }

    // ---------- Fuente 2: Supersalud ----------
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

        return {
            apellidos: unir(d.apellido, d.s_apellido),
            nombres: unir(d.nombre, d.s_nombre),
            fecha: formatearFechaISO(d.fecha_nacimiento),
            sexo: SEXO_SUPERSALUD_A_GESI[d.sexo] || '',
            numeroOk: numeroCoincide(d, documento),
        };
    }

    // ---------- Búsqueda ----------
    async function buscarPersona(documento, tipoDoc) {
        let base = null;
        try {
            base = await consultarComprobador(documento);
        } catch (e) {
            console.warn('[SALUD ORAL · cédula] Falló Comprobador de Derechos:', e);
        }

        const codigoTipo = TIPO_DOC_GESI_A_SUPERSALUD[tipoDoc];
        let sup = null;
        let motivoSexo = '';

        if (codigoTipo === undefined) {
            motivoSexo = 'este tipo de documento no está configurado para Supersalud';
        } else {
            try {
                sup = await consultarSupersalud(documento, codigoTipo);
                if (!sup) motivoSexo = 'Supersalud no encontró a la persona con este tipo de documento';
                else if (!sup.numeroOk) { sup = null; motivoSexo = 'el número de documento de Supersalud no coincide'; }
            } catch (e) {
                console.warn('[SALUD ORAL · cédula] Falló Supersalud:', e);
                motivoSexo = 'falló la consulta a Supersalud';
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
            } else if (!base.apellidos || normalizarApellidos(base.apellidos) !== normalizarApellidos(sup.apellidos)) {
                motivoSexo = 'los apellidos de Supersalud no coinciden con los del Comprobador';
            } else {
                persona.sexo = sup.sexo;
            }
        }

        const completa = persona.nombres && persona.apellidos && persona.fecha;
        return { persona: completa ? persona : null, motivoSexo };
    }

    function showManualAlert() {
        alert('No se encontró la cédula o hubo un error. Por favor, llena los campos manualmente.');
    }

    // ---------- Disparo ----------
    let running = false;
    let lastClave = '';

    async function tryAutofill() {
        const cedEl = getCampo('cedula');
        if (!cedEl) return;

        const cedula = (cedEl.value || '').trim();
        if (!cedula) return;
        if (running) return;

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
                setValue('fecha', persona.fecha);
                const sexoLleno = setValueSiExiste('sexo', persona.sexo);
                if (!sexoLleno) {
                    mostrarAvisoSexo(motivoSexo || 'la opción de sexo no existe en el formulario');
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

    let temporizadorCedula = null;
    const programarAutofill = () => {
        clearTimeout(temporizadorCedula);
        temporizadorCedula = setTimeout(tryAutofill, 2500);
    };
    ['blur', 'change', 'keyup'].forEach((ev) => {
        document.addEventListener(ev, (e) => {
            if (!e.target) return;
            if (e.target.id === IDS.cedula) programarAutofill();
            else if (e.target.id === IDS.tipo_doc && ev === 'change') programarAutofill();
            else if (e.target.id === IDS.sexo && ev === 'change' && !autocompletando) quitarAvisoSexo();
        }, true);
    });

    // ════════════════════════════════════════════════════════════════════
    // DETECCIÓN DE CAMBIOS
    // ════════════════════════════════════════════════════════════════════
    const estado = { listo: false, doc: '', sexo: '', edad: '' };
    let enTick = false;

    function tick() {
        if (enTick) return;
        enTick = true;
        try {
            ejecutarSeguro('Valores por defecto', defaultsUnaVez);
            ejecutarSeguro('Validación de fechas', validarFechas);

            const tipoDoc = getCampo('tipo_doc');
            const sexo = getCampo('sexo');
            if (!tipoDoc || !sexo) return;

            const edadEl = getCampo('edad');
            const edadActual = edadEl ? edadEl.value : '';

            if (!estado.listo) {
                estado.doc = tipoDoc.value;
                estado.sexo = sexo.value;
                estado.edad = edadActual;
                estado.listo = true;
                ['nombres', 'apellidos', 'cedula', 'fecha'].forEach((k) => {
                    if (!getCampo(k)) console.warn('[SALUD ORAL · cédula] No existe el campo "' + k + '" (' + IDS[k] + '). Corrige el ID en IDS.');
                });
                validarEdadDocumento();
                return;
            }

            if (tipoDoc.value !== estado.doc || edadActual !== estado.edad) validarEdadDocumento();

            if (tipoDoc.value !== estado.doc) {
                estado.doc = tipoDoc.value;
                cascadaDocumento();
            }

            if (sexo.value !== estado.sexo || edadActual !== estado.edad) {
                estado.sexo = sexo.value;
                estado.edad = edadActual;
                cascadaSexoEdad();
            }
        } catch (error) {
            console.error('[SALUD ORAL]', error);
        } finally {
            enTick = false;
        }
    }

    const IDS_OBSERVADOS = [IDS.tipo_doc, IDS.sexo, IDS.edad];
    ['input', 'change'].forEach((ev) => {
        document.addEventListener(ev, (e) => {
            if (e.target && IDS_OBSERVADOS.includes(e.target.id)) tick();
        }, true);
    });

    setInterval(tick, 300);
    tick();
})();
