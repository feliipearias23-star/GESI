// ==UserScript==
// @name         Instituciones de Protección y Atención 
// @namespace    https://gesiapps.saludcapital.gov.co/GESI_sistemas/GESI_Form*
// @version      2026.10.30.7
// @description  Instituciones de Protección y Atención: valores por defecto, cascadas documento/sexo/género, validador edad/documento, autocompletado por cédula (incluye afiliación y EAPB), alertas en "No aplica", campos de Evaluación bloqueados hasta que haya Fecha Evaluación y secciones 7-9 en "No"
// @author       You
// @match        https://gesiapps.saludcapital.gov.co/GESI_sistemas/GESI_Form*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @connect      appb.saludcapital.gov.co
// @connect      pqrdsuperargo.supersalud.gov.co
// @run-at       document-end
// ==/UserScript==

(function () {
    'use strict';

    // ════════════════════════════════════════════════════════════════════
    // CONFIGURACIÓN COMPARTIDA
    // ════════════════════════════════════════════════════════════════════
    const bgSuccess = "rgba(50, 200, 150, 0.2)";

    const IDS = {
        fecha_recaract: 'valorControl18221',
        nombre_completo: 'valorControl18222',
        tipo_doc: 'valorControl18223',
        cedula: 'valorControl18224',
        sexo: 'valorControl18225',
        genero: 'valorControl18226',
        identidad_genero: 'valorControl18227',
        orientacion: 'valorControl18228',
        fecha: 'valorControl18229',
        edad: 'valorControl18230',
        curso_vida: 'valorControl18231',
        etnia: 'valorControl18232',
        pueblo: 'valorControl18233',
        habla_espanol: 'valorControl18234',
        pais: 'valorControl18235',
        categoria_discapacidad: 'valorControl18236',
        pob_dif: 'valorControl18245',
        ocupacion: 'valorControl18248',
        Pob_inclusion: 'valorControl18249',
        sgsss: 'valorControl18261',
        eapb: 'valorControl18264',
        nivel_educativo: 'valorControl18265',
    };

    function getCampo(clave) { return document.querySelector('#' + IDS[clave]); }

    // Asigna un valor, dispara change (para que GESI sincronice el campo oculto) y pinta el campo
    function aplicar(campo, valor) {
        if (!campo) return;
        if (campo.tagName === 'SELECT' && valor !== '' && !Array.from(campo.options).some((o) => o.value === String(valor))) return;
        campo.value = valor;
        campo.style.backgroundColor = bgSuccess;
        campo.dispatchEvent(new Event('change', { bubbles: true }));
    }
    function aplicarMapa(campos, valores) {
        Object.keys(valores).forEach((k) => aplicar(campos[k], valores[k]));
    }
    function ejecutarSeguro(nombre, fn) {
        try { fn(); } catch (error) { console.error('[' + nombre + ']', error); }
    }

    // Selects de Evaluación de las secciones 7, 8 y 9: los registra el bloque 6 y los bloquea/habilita el bloque 5
    const selectsEvaluacion = new Set();

    // ════════════════════════════════════════════════════════════════════
    // REGLAS (edite aquí si alguna no es la que usa)
    // ════════════════════════════════════════════════════════════════════
    const EDAD_MINIMA_MAYORES = 14;   // desde esta edad: cascada de mayores; menos: cascada de menores

    // Se aplican siempre que se cambia el tipo de documento
    const VALORES_COMUNES_DOC = {
        etnia: '84',                    // 6- Ninguno
        pueblo: '100',                  // 16- Otro
        habla_espanol: '958',           // Si
        categoria_discapacidad: '3822', // 8- No aplica
        Pob_inclusion: '4048',          // 15- No aplica
        // Afiliación (sgsss) y EAPB ya no se ponen aquí: las llena el autocompletado tras consultar
        // el Comprobador de Derechos y Supersalud (bloque 3).
    };
    const GRUPOS_DOC = [
        // CC, RC, TI (nacionales)
        { docs: [59, 60, 61], colorearDoc: true, valores: { pais: '50', pob_dif: '2620' } },        // COL, 14- No Aplica
        // CE, NUIP, Pasaporte, sin ID, Carnet, Salvoconducto, PEP, DNI, PPT, PTP (extranjeros)
        { docs: [62, 63, 64, 65, 66, 1637, 1638, 1639, 1640, 2482, 4040], colorearDoc: false,
          valores: { pais: '236', pob_dif: '4051' } },                                               // VEN, 17- Migrante Internacional
    ];
    const OCUPACION_ESTUDIANTE = '902';   // 3- Estudiante, se pone con RC y TI
    const DOCS_ESTUDIANTE = [60, 61];

    const CASCADA_MAYORES = {
        '67': { genero: '70', orientacion: '4024', identidad_genero: '4515' },  // Hombre: Masculino, Heterosexual, 7 - Masculino
        '68': { genero: '71', orientacion: '4024', identidad_genero: '4514' },  // Mujer: Femenino, Heterosexual, 6 - Femenino
    };
    const CASCADA_MENORES = { genero: '4513', orientacion: '4028', identidad_genero: '4020' }; // No aplica

    // ════════════════════════════════════════════════════════════════════
    // BLOQUE 1 — DOCUMENTO / SEXO / GÉNERO (valores por defecto y cascadas)
    // ════════════════════════════════════════════════════════════════════
    ejecutarSeguro('Documento/sexo/género', function () {
        const CLAVES = ['genero', 'orientacion', 'identidad_genero', 'etnia', 'pueblo', 'habla_espanol', 'pais',
            'categoria_discapacidad', 'pob_dif', 'Pob_inclusion', 'sgsss', 'ocupacion'];
        const campos = {};
        CLAVES.forEach((k) => { campos[k] = getCampo(k); });
        let tipo_doc = getCampo('tipo_doc');
        let sexo = getCampo('sexo');
        let edadEl = getCampo('edad');

        let ultimoTipoDoc = tipo_doc ? tipo_doc.value : '';
        let ultimoSexo = sexo ? sexo.value : '';
        let ultimaEdad = edadEl ? edadEl.value : '';

        setInterval(function () {
            if (!tipo_doc || !tipo_doc.isConnected) tipo_doc = getCampo('tipo_doc');
            if (!sexo || !sexo.isConnected) sexo = getCampo('sexo');
            if (!edadEl || !edadEl.isConnected) edadEl = getCampo('edad');
            CLAVES.forEach((k) => { if (!campos[k] || !campos[k].isConnected) campos[k] = getCampo(k); });
            if (!tipo_doc || !sexo) return;

            const docActual = tipo_doc.value;
            const sexoActual = sexo.value;
            const edadActual = edadEl ? edadEl.value : '';

            if (docActual !== ultimoTipoDoc) {
                ultimoTipoDoc = docActual;
                const v = parseInt(docActual, 10);
                const grupo = GRUPOS_DOC.find((g) => g.docs.includes(v));
                if (grupo) {
                    if (grupo.colorearDoc) tipo_doc.style.backgroundColor = bgSuccess;
                    aplicarMapa(campos, Object.assign({}, VALORES_COMUNES_DOC, grupo.valores));
                    if (DOCS_ESTUDIANTE.includes(v)) aplicar(campos.ocupacion, OCUPACION_ESTUDIANTE);
                }
            }

            if (sexoActual !== ultimoSexo || edadActual !== ultimaEdad) {
                ultimoSexo = sexoActual;
                ultimaEdad = edadActual;
                const esHombreOMujer = sexoActual === '67' || sexoActual === '68';
                const edad = parseInt(edadActual, 10);
                // Sin edad conocida: CC → mayores, otro documento → menores
                const esMayor = !isNaN(edad) ? edad >= EDAD_MINIMA_MAYORES : tipo_doc.value === '59';
                const cascada = esMayor ? CASCADA_MAYORES[sexoActual] : (esHombreOMujer ? CASCADA_MENORES : null);
                if (cascada) {
                    sexo.style.backgroundColor = bgSuccess;
                    aplicarMapa(campos, cascada);
                }
            }
        }, 300);
    });

    // ════════════════════════════════════════════════════════════════════
    // BLOQUE 2 — VALIDADOR EDAD / TIPO DE DOCUMENTO (con corrección automática)
    // RC 0-6 · TI 7-17 · CC 18 o más
    // ════════════════════════════════════════════════════════════════════
    ejecutarSeguro('Validador edad/documento', function () {
        const reglasDocumento = {
            '60': { nombre: 'Registro Civil',       edadMin: 0,  edadMax: 6   },
            '61': { nombre: 'Tarjeta de Identidad', edadMin: 7,  edadMax: 17  },
            '59': { nombre: 'Cédula de Ciudadanía', edadMin: 18, edadMax: 999 },
        };
        let ultimaClave = '';
        let correccionPrevia = '';   // "edad|doc" de la última corrección, para no repetirla en bucle

        function mensaje(campoEdad, clase, texto, estilo) {
            const previo = campoEdad.parentNode.querySelector('.' + clase);
            if (previo) previo.remove();
            const div = document.createElement('div');
            div.className = clase;
            div.textContent = texto;
            Object.assign(div.style, estilo, { padding: '6px', marginTop: '4px', borderRadius: '4px', fontSize: '12px' });
            campoEdad.parentNode.appendChild(div);
            return div;
        }

        function validar() {
            const campoEdad = getCampo('edad'), campoDoc = getCampo('tipo_doc');
            if (!campoEdad || !campoDoc) return;
            const edad = parseInt(campoEdad.value, 10);
            const docValue = campoDoc.value;
            const clave = edad + '|' + docValue;
            if (clave === ultimaClave) return;
            ultimaClave = clave;

            campoEdad.style.border = campoEdad.style.background = '';
            campoDoc.style.border = campoDoc.style.background = '';
            const prev = campoEdad.parentNode.querySelector('.mensaje-validacion');
            if (prev) prev.remove();
            if (isNaN(edad) || !docValue || !reglasDocumento[docValue]) { correccionPrevia = ''; return; }

            const regla = reglasDocumento[docValue];
            if (edad >= regla.edadMin && edad <= regla.edadMax) { correccionPrevia = ''; return; }

            let docCorrecto = 'Desconocido', docCorrectoValor = null;
            for (const [valor, r] of Object.entries(reglasDocumento)) {
                if (edad >= r.edadMin && edad <= r.edadMax) { docCorrecto = r.nombre; docCorrectoValor = valor; break; }
            }
            if (docCorrectoValor && correccionPrevia !== clave &&
                Array.from(campoDoc.options).some((o) => o.value === docCorrectoValor)) {
                correccionPrevia = clave;
                campoDoc.value = docCorrectoValor;
                ['input', 'change'].forEach((ev) => campoDoc.dispatchEvent(new Event(ev, { bubbles: true })));
                const div = mensaje(campoEdad, 'mensaje-autocorreccion',
                    '✔ Con edad ' + edad + ' años el tipo de documento se cambió a "' + docCorrecto + '".',
                    { color: '#1b5e20', background: '#e8f5e9', border: '1px solid #a5d6a7' });
                setTimeout(() => div.remove(), 6000);
                return;
            }
            [campoEdad, campoDoc].forEach((c) => { c.style.border = '2px solid red'; c.style.background = '#fff0f0'; });
            mensaje(campoEdad, 'mensaje-validacion',
                '⚠ Con edad ' + edad + ' años debe usar "' + docCorrecto + '".',
                { color: '#b30000', background: '#ffe6e6', border: '1px solid #ff9999' });
        }
        setInterval(validar, 400);
    });

    // ════════════════════════════════════════════════════════════════════
    // BLOQUE 3 — AUTOCOMPLETAR POR CÉDULA (Comprobador de Derechos + Supersalud)
    // Llena nombre completo (nombres + apellidos), fecha de nacimiento y sexo.
    // ════════════════════════════════════════════════════════════════════
    ejecutarSeguro('Autocompletar por cédula', function () {

        const BASE_COMPROBADOR = 'https://appb.saludcapital.gov.co/comprobadordederechos/';
        const BASE_SUPERSALUD = 'https://pqrdsuperargo.supersalud.gov.co/api/api/adres/';

        // value del tipo de documento en GESI -> código de Supersalud
        const TIPO_DOC_GESI_A_SUPERSALUD = {
            '59': '0',    // CC
            '61': '1',    // TI
            '60': '8',    // RC
            '62': '2',    // CE
            '2482': '13', // PPT
        };
        const SEXO_SUPERSALUD_A_GESI = { 1: '67', 2: '68' };
        const CLASE_AVISO_SEXO = 'aviso-sexo-revisar';
        const CLASE_AVISO_AFIL = 'aviso-afiliacion-revisar';

        // Afiliación al SGSSS (value del campo sgsss): 131 Subsidiado, 132 Contributivo
        const REGIMEN_SUBSIDIADO = '131';
        const REGIMEN_CONTRIBUTIVO = '132';
        // Régimen subsidiado: el nombre de la EAPB debe terminar en "EPS-S" (ej. CAPITAL SALUD -> CAPITAL SALUD EPS-S)
        const SUFIJO_EAPB_SUBSIDIADO = 'EPS-S';

        const limpio = (v) => String(v == null ? '' : v).trim();
        const quitarCeros = (s) => String(s == null ? '' : s).replace(/\D/g, '').replace(/^0+/, '');
        const normTexto = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
            .toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();

        function setValue(clave, value) {
            const el = getCampo(clave);
            if (!el) return false;
            el.focus();
            el.value = value ?? '';
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
            const m = html.match(new RegExp('name="' + name + '"[^>]*value="([^"]*)"'));
            return m ? m[1] : '';
        }
        function gmRequest(opts) {
            if (typeof GM_xmlhttpRequest === 'function') {
                return new Promise((resolve, reject) => {
                    GM_xmlhttpRequest(Object.assign({ timeout: 20000 }, opts, {
                        onload: resolve, onerror: reject, ontimeout: () => reject(new Error('timeout')),
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
        // aaaa-mm-dd -> formato del campo (date: aaaa-mm-dd; texto: dd/mm/aaaa)
        function formatearFechaISO(iso) {
            const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || '').trim());
            if (!m) return String(iso || '').trim();
            const el = getCampo('fecha');
            if (el && el.type === 'date') return m[1] + '-' + m[2] + '-' + m[3];
            return m[3] + '/' + m[2] + '/' + m[1];
        }
        function normalizarApellidos(s) {
            return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                .toUpperCase().split(/\s+/).filter(Boolean).sort().join(' ');
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

        function quitarAvisoAfil() {
            document.querySelectorAll('.' + CLASE_AVISO_AFIL).forEach((a) => a.remove());
        }
        function mostrarAvisoAfil(texto) {
            quitarAvisoAfil();
            const campo = getCampo('sgsss') || getCampo('eapb');
            if (!campo || !campo.parentNode) return;
            const div = document.createElement('div');
            div.className = CLASE_AVISO_AFIL;
            div.textContent = '⚠ No se pudo obtener automáticamente: ' + texto + '. Revíselo a mano.';
            Object.assign(div.style, { color: '#b30000', background: '#ffe6e6', padding: '6px',
                marginTop: '4px', border: '1px solid #ff9999', borderRadius: '4px', fontSize: '12px' });
            campo.parentNode.appendChild(div);
        }

        // EAPB: si el campo es texto se escribe el nombre; si es lista, se busca la opción por nombre
        function setEapb(nombre) {
            const el = getCampo('eapb');
            if (!el) return false;
            if (el.tagName !== 'SELECT') return setValue('eapb', nombre);
            if (!nombre) return setValue('eapb', '');
            const opciones = Array.from(el.options);
            // Se prueba el nombre completo y, si no está, el nombre sin el sufijo "EPS-S"
            const candidatos = [normTexto(nombre), normTexto(nombre.replace(/\s*\bE\.?P\.?S\.?(?:\s*-?\s*S\b\.?)?\s*$/i, ''))]
                .filter((c, i, a) => c && a.indexOf(c) === i);
            let op = null;
            for (const buscado of candidatos) {
                op = opciones.find((o) => normTexto(o.text) === buscado);
                if (op) break;
            }
            if (!op) {
                for (const buscado of candidatos) {
                    op = opciones.find((o) => { const t = normTexto(o.text); return t.length >= 4 && (t.includes(buscado) || buscado.includes(t)); });
                    if (op) break;
                }
            }
            return op ? setValue('eapb', op.value) : false;
        }

        // ---------- Fuente 1: Comprobador de Derechos ----------
        function parseTablasComprobador(doc) {
            const TABLAS_IDS = ['MainContent_grdContributivo', 'MainContent_grdBUDA', 'MainContent_grdSisben',
                'MainContent_grdPoblacionEspecial', 'MainContent_grdSubsidiado'];
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
                __EVENTTARGET: '', __EVENTARGUMENT: '', __LASTFOCUS: '',
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

            // Resultados.aspx guarda en sesión la ÚLTIMA consulta exitosa: se exige que el número del
            // resultado sea el consultado, para no devolver a la persona anterior.
            const esperado = quitarCeros(documento);
            const claveNumero = (reg) => Object.keys(reg).find((k) =>
                /(identific|documento|n[uú]mero|n[uú]m\b|cedula|^id$)/i.test(k) && quitarCeros(reg[k]));
            const verificables = registros.filter((reg) => claveNumero(reg));
            let r;
            if (verificables.length) {
                r = verificables.find((reg) => quitarCeros(reg[claveNumero(reg)]) === esperado);
                if (!r) {
                    console.warn('[Autocompletar cédula] El Comprobador devolvió otra persona (resultado anterior); se descarta.');
                    return null;
                }
            } else {
                r = registros[0];   // sin columna de número no se puede verificar
            }

            // Régimen: solo con filas verificadas de Contributivo o Subsidiado y sin marcas de retiro.
            // Si aparece en ambas tablas, no se decide.
            const activa = (reg) => !Object.values(reg).some((v) => /retirad|suspendid|inactiv|fallecid|cancelad/i.test(String(v)));
            const coincidentes = verificables.filter((reg) => quitarCeros(reg[claveNumero(reg)]) === esperado && activa(reg));
            const filaContrib = coincidentes.find((reg) => reg._fuente === 'MainContent_grdContributivo');
            const filaSubs = coincidentes.find((reg) => reg._fuente === 'MainContent_grdSubsidiado');
            let regimen = '', filaRegimen = null;
            if (filaContrib && !filaSubs) { regimen = REGIMEN_CONTRIBUTIVO; filaRegimen = filaContrib; }
            else if (filaSubs && !filaContrib) { regimen = REGIMEN_SUBSIDIADO; filaRegimen = filaSubs; }
            let eapb = '';
            if (filaRegimen) {
                const kEps = Object.keys(filaRegimen).find((k) =>
                    /(eps|eapb|administradora|aseguradora|entidad)/i.test(k) && limpio(filaRegimen[k]));
                if (kEps) eapb = limpio(filaRegimen[kEps]);
            }

            return {
                apellidos: unir(r['Primer Apellido'], r['Segundo Apellido']),
                nombres: unir(r['Primer Nombre'], r['Segundo Nombre']),
                fecha: (r['Fecha Nacimiento'] || '').trim(),
                regimen: regimen,
                eapb: eapb,
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

            // estado_afiliacion viene como "AC en SANITAS municipio BOGOTÁ. D.C." (AC = activo)
            const estado = limpio(d.estado_afiliacion);
            const mEps = /\ben\s+(.+?)\s+municipio\b/i.exec(estado);

            return {
                apellidos: unir(d.apellido, d.s_apellido),
                nombres: unir(d.nombre, d.s_nombre),
                fecha: formatearFechaISO(d.fecha_nacimiento),
                sexo: SEXO_SUPERSALUD_A_GESI[d.sexo] || '',
                numeroOk: numeroCoincide(d, documento),
                estado: estado,
                activo: /^AC\b/i.test(estado),
                eapb: mEps ? mEps[1].trim() : '',
                tipoAfiliado: limpio(d.tipo_de_afiliado),
            };
        }

        // Con régimen subsidiado el nombre termina en "EPS-S": se quita cualquier "EPS", "EPS-S" o "EPSS" final
        // que ya traiga la fuente y se agrega el sufijo una sola vez.
        function formatearEapb(afiliacion, eapb) {
            const nombre = limpio(eapb);
            if (!nombre || afiliacion !== REGIMEN_SUBSIDIADO) return nombre;
            const base = nombre.replace(/\s*\bE\.?P\.?S\.?(?:\s*-?\s*S\b\.?)?\s*$/i, '').trim();
            return (base ? base + ' ' : '') + SUFIJO_EAPB_SUBSIDIADO;
        }

        // Afiliación y EAPB con lo que entregan las dos fuentes.
        //  - EAPB: de Supersalud si la afiliación está activa; si no, del Comprobador.
        //  - Régimen: Comprobador (Contributivo o Subsidiado) o Supersalud con tipo de afiliado 1 = Contributivo.
        //    Si las fuentes se contradicen o no alcanzan, no se llena.
        function decidirAfiliacion(base, sup) {
            const motivos = [];
            let eapb = '', regSup = '';

            if (!sup) {
                motivos.push('sin respuesta de Supersalud');
            } else if (!sup.numeroOk) {
                motivos.push('el número de documento de Supersalud no coincide');
            } else if (!sup.activo) {
                motivos.push('Supersalud reporta la afiliación como "' + (sup.estado || 'sin dato') + '"');
            } else {
                eapb = sup.eapb;
                if (sup.tipoAfiliado === '1') regSup = REGIMEN_CONTRIBUTIVO;
                else motivos.push('no se puede deducir el régimen con el tipo de afiliado ' + (sup.tipoAfiliado || 'sin dato'));
            }

            const regBase = (base && base.regimen) || '';
            if (!eapb && base && base.eapb) eapb = base.eapb;

            let afiliacion = regBase || regSup;
            if (regBase && regSup && regBase !== regSup) {
                afiliacion = '';
                motivos.push('el Comprobador y Supersalud no coinciden en el régimen');
            }
            return { afiliacion: afiliacion, eapb: formatearEapb(afiliacion, eapb), motivo: motivos.join('; ') };
        }

        // Devuelve { persona, motivoSexo }. El sexo solo se acepta si los apellidos coinciden con los del Comprobador.
        async function buscarPersona(documento, tipoDoc) {
            let base = null;
            try { base = await consultarComprobador(documento); }
            catch (e) { console.warn('[Autocompletar cédula] Falló Comprobador de Derechos:', e); }

            const codigoTipo = TIPO_DOC_GESI_A_SUPERSALUD[tipoDoc];
            let sup = null, motivoSexo = '';
            if (codigoTipo === undefined) {
                motivoSexo = 'este tipo de documento no está configurado para Supersalud';
            } else {
                try {
                    sup = await consultarSupersalud(documento, codigoTipo);
                    if (!sup) motivoSexo = 'Supersalud no encontró a la persona con este tipo de documento';
                } catch (e) {
                    console.warn('[Autocompletar cédula] Falló Supersalud:', e);
                    motivoSexo = 'falló la consulta a Supersalud';
                }
            }

            const persona = {};
            [base, sup].forEach((fuente) => {
                if (!fuente) return;
                ['nombres', 'apellidos', 'fecha'].forEach((c) => { if (!persona[c] && fuente[c]) persona[c] = fuente[c]; });
            });

            if (sup && !motivoSexo) {
                if (!sup.sexo) motivoSexo = 'Supersalud no entregó un sexo válido';
                else if (!base) motivoSexo = 'no se pudo verificar la persona con el Comprobador de Derechos';
                else if (!sup.numeroOk) motivoSexo = 'el número de documento de Supersalud no coincide';
                else if (!base.apellidos || normalizarApellidos(base.apellidos) !== normalizarApellidos(sup.apellidos)) {
                    motivoSexo = 'los apellidos de Supersalud no coinciden con los del Comprobador';
                } else persona.sexo = sup.sexo;
            }

            const af = decidirAfiliacion(base, sup);
            persona.afiliacion = af.afiliacion;
            persona.eapb = af.eapb;
            persona.motivoAfiliacion = af.motivo;

            const completa = persona.nombres && persona.apellidos && persona.fecha;
            return { persona: completa ? persona : null, motivoSexo };
        }

        let autocompletando = false;
        function aplicarPersona(persona, motivoSexo) {
            autocompletando = true;
            try {
                setValue('nombre_completo', unir(persona.nombres, persona.apellidos));
                setValue('fecha', persona.fecha);
                const sexoLleno = setValueSiExiste('sexo', persona.sexo);
                if (!sexoLleno) mostrarAvisoSexo(motivoSexo || 'la opción de sexo no existe en el formulario');

                // Afiliación y EAPB: siempre se escriben (o se vacían), para no dejar los de la persona anterior
                const afilLlena = persona.afiliacion ? setValueSiExiste('sgsss', persona.afiliacion) : false;
                if (!afilLlena) setValue('sgsss', '');
                const eapbLlena = persona.eapb ? setEapb(persona.eapb) : (setEapb(''), false);

                const faltantes = [];
                if (!afilLlena) faltantes.push('Afiliación al SGSSS');
                if (!eapbLlena) faltantes.push(persona.eapb ? 'EAPB (la fuente indica "' + persona.eapb + '" y no está en la lista)' : 'EAPB');
                if (faltantes.length) {
                    mostrarAvisoAfil(faltantes.join(' y ') + (persona.motivoAfiliacion ? ' (' + persona.motivoAfiliacion + ')' : ''));
                }
                return sexoLleno;
            } finally { autocompletando = false; }
        }

        // ---------- Disparo ----------
        let running = false;
        let lastClave = '';

        async function tryAutofill() {
            const cedEl = getCampo('cedula');
            if (!cedEl) return;
            const cedula = (cedEl.value || '').trim();
            if (!cedula || running) return;

            const tipoEl = getCampo('tipo_doc');
            const tipoDoc = tipoEl ? String(tipoEl.value || '') : '';
            const clave = tipoDoc + '|' + cedula;
            if (clave === lastClave) return;

            const documento = cedula.replace(/[^0-9]/g, '');
            if (!documento) return;

            lastClave = clave;
            running = true;
            quitarAvisoSexo();
            quitarAvisoAfil();
            try {
                const { persona, motivoSexo } = await buscarPersona(documento, tipoDoc);
                if (!persona) {
                    alert('No se encontró la cédula o hubo un error. Por favor, llena los campos manualmente.');
                    return;
                }
                aplicarPersona(persona, motivoSexo);
            } catch (e) {
                alert('No se encontró la cédula o hubo un error. Por favor, llena los campos manualmente.');
            } finally { running = false; }
        }

        let t = null;
        const schedule = () => { clearTimeout(t); t = setTimeout(tryAutofill, 2500); };
        ['blur', 'change', 'keyup'].forEach((ev) => {
            document.addEventListener(ev, (e) => {
                if (!e.target) return;
                if (e.target.id === IDS.cedula) schedule();
                else if (e.target.id === IDS.tipo_doc && ev === 'change') schedule();
                else if (e.target.id === IDS.sexo && ev === 'change' && !autocompletando) quitarAvisoSexo();
                else if (e.target.id === IDS.sgsss && ev === 'change' && !autocompletando) quitarAvisoAfil();
            }, true);
        });
    });

    // ════════════════════════════════════════════════════════════════════
    // BLOQUE 4 — ALERTAS: "No aplica" POR DEFECTO (Caracterización y Evaluación)
    // Solo en registros nuevos (documento vacío) y solo si el select está vacío.
    // Si el usuario cambia la selección a mano, el script no vuelve a tocarla.
    // ════════════════════════════════════════════════════════════════════
    ejecutarSeguro('Alertas No aplica', function () {
        const IDS_ALERTAS = [
            'valorControl18275', 'valorControl18276',   // Condición crónica
            'valorControl18278', 'valorControl18279',   // Enfermedad transmisible y ETV
            'valorControl18281', 'valorControl18283',   // Alerta nutricional
            'valorControl18287', 'valorControl18289',   // Alertas psicosociales
            'valorControl18295', 'valorControl18296',   // Alerta salud oral
            'valorControl18298', 'valorControl18300',   // Alertas infancia
            'valorControl18306', 'valorControl18308',   // Alertas en mujeres - gestantes
            'valorControl18312', 'valorControl18314',   // Etapa de gestación
            'valorControl18318', 'valorControl18320',   // Alertas en población LGBTI
            'valorControl18325', 'valorControl18328',   // Alertas discapacidad - limitaciones
        ];
        const RE_NO_APLICA = /no\s*aplica/i;
        const atendidos = new WeakSet();

        function procesar() {
            const ced = getCampo('cedula');
            const registroNuevo = !!ced && String(ced.value || '').trim() === '';
            IDS_ALERTAS.forEach((id) => {
                const sel = document.getElementById(id);
                if (!sel || !sel.isConnected || atendidos.has(sel)) return;
                sel.addEventListener('change', (e) => { if (e.isTrusted) atendidos.add(sel); });
                if (!registroNuevo) return;
                if (sel.selectedOptions.length > 0) { atendidos.add(sel); return; }
                const op = Array.from(sel.options).find((o) => RE_NO_APLICA.test(o.text));
                if (!op) return;
                op.selected = true;
                sel.dispatchEvent(new Event('change', { bubbles: true }));
                sel.style.backgroundColor = bgSuccess;
                atendidos.add(sel);
            });
        }
        setInterval(procesar, 500);
        procesar();
    });

    // ════════════════════════════════════════════════════════════════════
    // BLOQUE 5 — EVALUACIÓN: CAMPOS BLOQUEADOS HASTA QUE HAYA "Fecha Evaluación"
    // Sin fecha: los campos de Evaluación (numéricos y las listas de las secciones 7-9) quedan bloqueados (grises).
    // Con fecha: se habilitan para diligenciarlos, y a la vez se bloquean TODOS los campos de Caracterización.
    // Si se borra la fecha, vuelve cada grupo a su estado anterior. Ya no se escribe 0.
    // ════════════════════════════════════════════════════════════════════
    ejecutarSeguro('Evaluación bloqueada sin fecha', function () {
        const RE_FECHA_EVAL = /Fecha\s+Evaluaci[oó]n/i;
        const RE_EVALUACION = /Evaluaci[oó]n/i;
        const RE_CARACT = /Caracterizaci[oó]n/i;
        const BG_BLOQUEADO = '#eeeeee';
        const camposEval = new WeakSet();   // inputs ya identificados como Evaluación
        const revisados = new WeakSet();    // inputs ya analizados (sean o no de Evaluación)
        let fechaEl = null;

        // Un select bloqueado no recibe clic ni teclado (no se usa "disabled" para no alterar el envío del formulario)
        ['mousedown', 'keydown'].forEach((ev) => {
            document.addEventListener(ev, (e) => {
                const t = e.target;
                if (!t || !t.getAttribute) return;
                if (t.getAttribute('data-eval-bloq') === '1' ||
                    (t.tagName === 'SELECT' && t.getAttribute('data-caract-bloq') === '1')) e.preventDefault();
            }, true);
        });

        function bloquearSelect(sel, bloquear) {
            const bloqueado = sel.getAttribute('data-eval-bloq') === '1';
            if (bloquear && !bloqueado) {
                sel.setAttribute('data-eval-bloq', '1');
                sel.style.pointerEvents = 'none';
                sel.tabIndex = -1;
                sel.style.backgroundColor = BG_BLOQUEADO;
            } else if (!bloquear && bloqueado) {
                sel.removeAttribute('data-eval-bloq');
                sel.style.pointerEvents = '';
                sel.removeAttribute('tabindex');
                sel.style.backgroundColor = '';
            }
        }

        // ---- Caracterización: se bloquea cuando "Fecha Evaluación" ya está diligenciada ----
        const RE_ETIQ_CARACT = /^[*\s]*Caracterizaci[oó]n/i;
        const caractCache = new WeakMap();   // campo -> true/false (ya analizado)

        // Retrocede desde el campo hasta su etiqueta: "Caracterización (.)" -> true.
        // "Fecha Caracterización", "Evaluación" u otro campo antes de la etiqueta -> false.
        function esCaracterizacion(campo) {
            const w = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
            w.currentNode = campo;
            for (let i = 0; i < 80; i++) {
                const n = w.previousNode();
                if (!n) return false;
                if (n.nodeType === 1) {
                    const tag = n.tagName;
                    if (tag === 'SELECT' || tag === 'TEXTAREA') return false;
                    if (tag === 'INPUT' && n.type !== 'hidden') return false;
                } else {
                    const t = (n.nodeValue || '').trim();
                    if (!t) continue;
                    if (RE_ETIQ_CARACT.test(t)) return true;
                    if (RE_EVALUACION.test(t) || /Fecha\s+Caracterizaci[oó]n/i.test(t)) return false;
                }
            }
            return false;
        }

        function bloquearCaract(el, bloquear) {
            const marcado = el.getAttribute('data-caract-bloq') === '1';
            if (bloquear && !marcado) {
                el.setAttribute('data-caract-bloq', '1');
                if (el.tagName === 'SELECT') { el.style.pointerEvents = 'none'; el.tabIndex = -1; }
                else el.readOnly = true;
                el.style.backgroundColor = BG_BLOQUEADO;
            } else if (!bloquear && marcado) {
                el.removeAttribute('data-caract-bloq');
                if (el.tagName === 'SELECT') { el.style.pointerEvents = ''; el.removeAttribute('tabindex'); }
                else el.readOnly = false;
                el.style.backgroundColor = '';
            }
        }

        // Localiza el input de "Fecha Evaluación": el primer input visible después de esa etiqueta
        function buscarFechaEval() {
            const w = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
            let encontrada = false, n;
            while ((n = w.nextNode())) {
                if (!encontrada) {
                    if (n.nodeType === 3 && RE_FECHA_EVAL.test(n.nodeValue || '')) encontrada = true;
                    continue;
                }
                if (n.nodeType === 1 && n.tagName === 'INPUT' && n.type !== 'hidden') return n;
            }
            return null;
        }

        // Retrocede desde el input hasta la etiqueta; si antes aparece otro campo, no es de Evaluación
        function esEvaluacion(input) {
            const w = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
            w.currentNode = input;
            for (let i = 0; i < 80; i++) {
                const n = w.previousNode();
                if (!n) return false;
                if (n.nodeType === 1) {
                    const tag = n.tagName;
                    if (tag === 'SELECT' || tag === 'TEXTAREA') return false;
                    if (tag === 'INPUT' && n.type !== 'hidden') return false;
                } else {
                    const t = (n.nodeValue || '').trim();
                    if (!t) continue;
                    if (RE_FECHA_EVAL.test(t)) return false;   // es la propia fecha, no un campo numérico
                    if (RE_EVALUACION.test(t)) return true;
                    if (RE_CARACT.test(t)) return false;
                }
            }
            return false;
        }

        function procesar() {
            if (!fechaEl || !fechaEl.isConnected) fechaEl = buscarFechaEval();
            if (!fechaEl) return;                       // sin fecha localizada, no se bloquea nada
            const hayFecha = String(fechaEl.value || '').trim() !== '';

            document.querySelectorAll('input[type="text"], input[type="number"]').forEach((input) => {
                if (!input.isConnected || input.offsetParent === null || input === fechaEl) return;
                if (!revisados.has(input)) {
                    revisados.add(input);
                    if (!input.disabled && esEvaluacion(input)) camposEval.add(input);
                }
                if (!camposEval.has(input)) return;

                if (hayFecha) {
                    if (input.readOnly) { input.readOnly = false; input.style.backgroundColor = ''; }
                } else if (!input.readOnly) {
                    input.readOnly = true;
                    input.style.backgroundColor = BG_BLOQUEADO;
                }
            });

            // Selects de Evaluación de las secciones 7-9 (los registra el bloque 6)
            selectsEvaluacion.forEach((sel) => {
                if (!sel.isConnected) { selectsEvaluacion.delete(sel); return; }
                bloquearSelect(sel, !hayFecha);
            });

            // Campos de Caracterización: bloqueados cuando YA hay Fecha Evaluación (facilita la digitación de Evaluación)
            document.querySelectorAll('select, input[type="text"], input[type="number"], textarea').forEach((el) => {
                if (!el.isConnected || el.offsetParent === null || el === fechaEl) return;
                if (!caractCache.has(el)) caractCache.set(el, !el.disabled && esCaracterizacion(el));
                if (caractCache.get(el)) bloquearCaract(el, hayFecha);
            });
        }
        setInterval(procesar, 500);
        procesar();
    });

    // ════════════════════════════════════════════════════════════════════
    // BLOQUE 6 — SECCIONES 7, 8 Y 9: "No" POR DEFECTO (Caracterización y Evaluación)
    // Solo selects vacíos dentro de esas secciones. No llena "Otro, ¿cuál?".
    // Los selects de Evaluación además se registran para que el bloque 5 los bloquee sin Fecha Evaluación.
    // ════════════════════════════════════════════════════════════════════
    ejecutarSeguro('Secciones 7-9 en No', function () {
        const SECCIONES = [7, 8, 9];
        const RE_ETIQ = /^[*\s]*(Caracterizaci[oó]n|Evaluaci[oó]n)/i;
        const RE_RUIDO = /^[*\[\]?().\s]*$/;
        const RE_NO = /^\s*no\s*$/i;
        const EXCLUIR_IDS = [];   // si alguno queda mal, agregue aquí su id y se omite
        const atendidos = new WeakSet();

        // Retrocede en el documento desde el select: etiqueta (Caracterización/Evaluación), título de la fila y número de sección.
        // Si antes de la etiqueta aparece otro campo, el select no es de Caracterización/Evaluación.
        function analizar(sel) {
            const w = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
            w.currentNode = sel;
            let etiqueta = null, titulo = null, seccion = null;
            for (let i = 0; i < 8000; i++) {
                const n = w.previousNode();
                if (!n) break;
                if (n.nodeType === 1) {
                    const tag = n.tagName;
                    if (!etiqueta && (tag === 'SELECT' || tag === 'TEXTAREA' || (tag === 'INPUT' && n.type !== 'hidden'))) return null;
                    continue;
                }
                const t = (n.nodeValue || '').trim();
                if (!t) continue;
                if (!etiqueta) { if (RE_ETIQ.test(t)) etiqueta = t; continue; }
                if (!titulo) {
                    if (RE_ETIQ.test(t) || RE_RUIDO.test(t)) continue;
                    titulo = t;
                }
                const m = /^(\d{1,2})\.\s+\S/.exec(t);
                if (m) { seccion = parseInt(m[1], 10); break; }
            }
            return etiqueta ? { etiqueta: etiqueta, titulo: titulo, seccion: seccion } : null;
        }

        function procesar() {
            document.querySelectorAll('select:not([multiple])').forEach((sel) => {
                if (atendidos.has(sel) || !sel.isConnected || sel.offsetParent === null) return;
                if (EXCLUIR_IDS.includes(sel.id) || sel.disabled) return;
                atendidos.add(sel);

                const info = analizar(sel);
                if (!info || !SECCIONES.includes(info.seccion)) return;
                // Evaluación: también se llena con "No", y además se registra para que el bloque 5 la bloquee sin Fecha Evaluación
                const esEval = /^[*\s]*Evaluaci[oó]n/i.test(info.etiqueta);
                if (esEval) selectsEvaluacion.add(sel);
                if (info.titulo && /^\s*Otro/i.test(info.titulo)) return;   // fila "Otro, ¿cuál?": se bloquea pero no se llena

                if (sel.value !== '') return;                                // ya tiene Sí/No: no se pisa
                const op = Array.from(sel.options).find((o) => RE_NO.test(o.text));
                if (!op) return;
                sel.value = op.value;
                sel.dispatchEvent(new Event('change', { bubbles: true }));
                if (!esEval) sel.style.backgroundColor = bgSuccess;   // las de Evaluación conservan el gris del bloqueo
            });
        }
        setInterval(procesar, 700);
        procesar();
    });

})();
