// ==UserScript==
// @name         GESI - Mascota Verde INSTITUCIONAL
// @namespace    GESI_Form
// @version      1.1
// @description  Mascota Verde Institucional: sincronización de seguimientos/sesiones entre páginas, autocompletado por cédula (nombres + apellidos en un solo campo), y valores por defecto de etnia / población de inclusión según tipo de documento
// @author       You
// @match        https://gesiapps.saludcapital.gov.co/GESI_sistemas/GESI_Form*
// @grant        GM_xmlhttpRequest
// @connect      appb.saludcapital.gov.co
// @connect      pqrdsuperargo.supersalud.gov.co
// @run-at       document-end
// ==/UserScript==

(function () {
    'use strict';

    // ════════════════════════════════════════════════════════════════════
    // CONFIGURACIÓN  (⚠ AQUÍ VAN LOS IDs DE LA BASE MASCOTA VERDE INSTITUCIONAL)
    // Reemplaza cada 'REEMPLAZAR' por el id real, ej: 'valorControl20123'.
    // Los campos que dejes en 'REEMPLAZAR' se ignoran (el script no falla).
    // ════════════════════════════════════════════════════════════════════
    const PENDIENTE = 'REEMPLAZAR';

    const IDS = {
        nombre_completo: 'valorControl21604', // Nombres y apellidos completos (un solo campo)
        tipo_doc:        'valorControl21605',
        cedula:          'valorControl21606',
        nacionalidad:    'valorControl21607',
        sexo:            'valorControl21608',
        fecha:           'valorControl21609', // Fecha de nacimiento
        etnia:           'valorControl21610',
        pob_inclusion:   'valorControl21611', // Población diferencial y de inclusión (lista múltiple)
    };

    // Si es true, el autocompletado exige que también se haya encontrado la fecha de nacimiento
    // (si no, se muestra el aviso de llenar manualmente). Por defecto no la exige.
    const REQUIERE_FECHA = false;

    // Etnia por defecto: la opción cuyo texto empieza con "6" (ej. "6- ...")
    const ETNIA_DEFECTO_TEXTO = /^\s*6\s*[-–.)]/;

    // Regla por tipo de documento (igual que en Institucional):
    //   nacionales = CC, RC, TI  ·  extranjeros = cualquier otro tipo (CE, PPT, pasaporte, sin ID...)
    // Se buscan las opciones por TEXTO (regex). Si una regex no encuentra la opción, ese campo no se toca.
    // ⚠ Ajusta las regex si los textos de esta base son distintos. 'null' = no se aplica.
    const REGLAS_DOC = {
        nacional:   { nacionalidad: /colombia/i, poblacion: /ning[uú]n|no aplica/i },
        extranjero: { nacionalidad: /venezuela|venezolan/i, poblacion: /migrante/i },
    };

    // Rangos de edad por tipo de documento (validador de edad, igual que en Institucional)
    const RANGOS_EDAD = { RC: [0, 6], TI: [7, 17], CC: [18, 999] };

    // Campos que se sincronizan entre páginas (seguimientos / sesiones).
    // Agrega aquí los ids de la base Mascota Verde Institucional, ej:
    //   'valorControl20001', // Fecha sesión 2
    const CAMPOS_SYNC = [
        // Sesión 1: Sesión, Fecha, Nivel de crecimiento, Mantenimiento, Estado de la mascota
        'valorControl21612', 'valorControl21613', 'valorControl21614', 'valorControl21615', 'valorControl21616',
        // Sesión 2
        'valorControl21619', 'valorControl21620', 'valorControl21621', 'valorControl21622', 'valorControl21623',
        // Sesión 3
        'valorControl21625', 'valorControl21626', 'valorControl21627', 'valorControl21628', 'valorControl21629',
        // Sesión 4
        'valorControl21631', 'valorControl21632', 'valorControl21633', 'valorControl21634', 'valorControl21635',
        // Sesión 5
        'valorControl21637', 'valorControl21638', 'valorControl21639', 'valorControl21640', 'valorControl21641',
        // Sesión 6
        'valorControl21643', 'valorControl21644', 'valorControl21645', 'valorControl21646', 'valorControl21647',
    ];

    const bgSuccess = 'rgba(50, 200, 150, 0.2)';

    // ════════════════════════════════════════════════════════════════════
    // UTILIDADES
    // ════════════════════════════════════════════════════════════════════
    function idValido(id) { return id && id !== PENDIENTE; }

    function getCampo(clave) {
        const id = IDS[clave];
        return idValido(id) ? document.getElementById(id) : null;
    }

    function aplicar(campo, valor) {
        if (!campo) return;
        campo.value = valor;
        campo.style.backgroundColor = bgSuccess;
        ['input', 'change'].forEach((ev) => campo.dispatchEvent(new Event(ev, { bubbles: true })));
    }

    function ejecutarSeguro(nombre, fn) {
        try { fn(); } catch (error) { console.error('[' + nombre + ']', error); }
    }

    // ════════════════════════════════════════════════════════════════════
    // BLOQUE 1 — TIPO DE DOCUMENTO → NACIONALIDAD / ETNIA / POBLACIÓN  +  VALIDADOR EDAD/DOCUMENTO
    // La edad se calcula desde la fecha de nacimiento (esta base no tiene campo de edad).
    // ════════════════════════════════════════════════════════════════════
    ejecutarSeguro('Tipo documento y validador', function () {
        // let: GESI puede crear o reemplazar el campo después de cargar la página; se vuelve a buscar en cada ciclo
        let tipo_doc = getCampo('tipo_doc');

        const textoSel = (el) => {
            if (!el) return '';
            if (el.tagName === 'SELECT') { const o = el.options[el.selectedIndex]; return o ? o.text : ''; }
            return String(el.value || '');
        };

        // 'RC' | 'TI' | 'CC' | 'OTRO' | '' (sin seleccionar)
        function categoriaDoc(texto) {
            const t = String(texto || '').trim();
            if (!t || /^seleccione/i.test(t)) return '';
            if (/\bRC\b|registro civil/i.test(t)) return 'RC';
            if (/\bTI\b|tarjeta de identidad/i.test(t)) return 'TI';
            if (/\bCC\b|c[eé]dula de ciudadan/i.test(t)) return 'CC';
            return 'OTRO';
        }

        const NOMBRES_DOC = { RC: 'Registro Civil', TI: 'Tarjeta de Identidad', CC: 'Cédula de Ciudadanía' };

        function aplicarPorTexto(clave, regex, soloSiVacio) {
            const el = getCampo(clave);
            if (!el || !regex || el.tagName !== 'SELECT') return;
            if (soloSiVacio && el.value) return;
            const op = Array.from(el.options).find((o) => regex.test(o.text));
            if (op) aplicar(el, op.value);
        }

        // Cascada al cambiar el tipo de documento (primera vez: solo campos vacíos, para no pisar datos guardados)
        function aplicarCascada(primera) {
            const cat = categoriaDoc(textoSel(tipo_doc));
            if (!cat) return;
            tipo_doc.style.backgroundColor = bgSuccess;
            const regla = (cat === 'CC' || cat === 'RC' || cat === 'TI') ? REGLAS_DOC.nacional : REGLAS_DOC.extranjero;
            aplicarPorTexto('etnia', ETNIA_DEFECTO_TEXTO, primera);
            aplicarPorTexto('nacionalidad', regla.nacionalidad, primera);
            aplicarPorTexto('pob_inclusion', regla.poblacion, primera);

            // Extranjero: si la nacionalidad quedó en Colombia (de un documento anterior), se limpia
            if (regla === REGLAS_DOC.extranjero && !primera) {
                const nac = getCampo('nacionalidad');
                if (nac && nac.tagName === 'SELECT') {
                    const op = nac.options[nac.selectedIndex];
                    if (op && /colombia/i.test(op.text)) aplicar(nac, nac.options[0] ? nac.options[0].value : '');
                }
            }
        }

        // ---------- Validador edad / tipo de documento ----------
        function edadDesdeFecha(str) {
            const s = String(str || '').trim();
            let d, m, y;
            let r = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
            if (r) { d = +r[1]; m = +r[2]; y = +r[3]; }
            else if ((r = /^(\d{4})-(\d{2})-(\d{2})/.exec(s))) { y = +r[1]; m = +r[2]; d = +r[3]; }
            else return NaN;
            const hoy = new Date();
            let edad = hoy.getFullYear() - y;
            if (hoy.getMonth() + 1 < m || (hoy.getMonth() + 1 === m && hoy.getDate() < d)) edad--;
            return edad >= 0 && edad < 150 ? edad : NaN;
        }

        function categoriaPorEdad(edad) {
            for (const [cat, [min, max]] of Object.entries(RANGOS_EDAD)) {
                if (edad >= min && edad <= max) return cat;
            }
            return null;
        }

        function mensaje(clase, texto, estilo, segundos) {
            document.querySelectorAll('.' + clase).forEach((x) => x.remove());
            const div = document.createElement('div');
            div.className = clase;
            div.textContent = texto;
            Object.assign(div.style, estilo, { padding: '6px', marginTop: '4px', borderRadius: '4px', fontSize: '12px' });
            tipo_doc.parentNode.appendChild(div);
            if (segundos) setTimeout(() => div.remove(), segundos * 1000);
        }

        let ultimaCorreccion = '';

        function validar() {
            const fecha = getCampo('fecha');
            const edad = edadDesdeFecha(fecha ? fecha.value : '');
            const cat = categoriaDoc(textoSel(tipo_doc));

            tipo_doc.style.border = '';
            document.querySelectorAll('.mensaje-validacion-mv').forEach((x) => x.remove());

            if (isNaN(edad) || !RANGOS_EDAD[cat]) { ultimaCorreccion = ''; return; }

            const correcta = categoriaPorEdad(edad);
            if (!correcta || correcta === cat) { ultimaCorreccion = ''; return; }

            // Corrección automática: cambia el tipo de documento al que corresponde por la edad
            const clave = edad + '|' + cat;
            if (ultimaCorreccion !== clave && tipo_doc.tagName === 'SELECT') {
                ultimaCorreccion = clave;
                const op = Array.from(tipo_doc.options).find((o) => categoriaDoc(o.text) === correcta);
                if (op) {
                    aplicar(tipo_doc, op.value);
                    mensaje('mensaje-autocorreccion-mv',
                        '✔ Con ' + edad + ' años el tipo de documento se cambió a "' + NOMBRES_DOC[correcta] + '".',
                        { color: '#1b5e20', background: '#e8f5e9', border: '1px solid #a5d6a7' }, 6);
                    return;
                }
            }

            tipo_doc.style.border = '2px solid red';
            mensaje('mensaje-validacion-mv',
                '⚠ Con ' + edad + ' años debe usar "' + NOMBRES_DOC[correcta] + '".',
                { color: '#b30000', background: '#ffe6e6', border: '1px solid #ff9999' });
        }

        let ultimoDoc = null;      // null = aún no se ha evaluado (primera vez)
        let ultimaFecha = null;

        setInterval(function () {
            if (!tipo_doc || !tipo_doc.isConnected) {
                tipo_doc = getCampo('tipo_doc');
                ultimoDoc = null; // campo nuevo: se evalúa como primera vez (solo llena vacíos)
            }
            if (!tipo_doc) return;

            const fecha = getCampo('fecha');
            const docActual = tipo_doc.value;
            const fechaActual = fecha ? fecha.value : '';

            const cambioDoc = docActual !== ultimoDoc;
            if (cambioDoc) {
                const primera = ultimoDoc === null;
                ultimoDoc = docActual;
                if (docActual) aplicarCascada(primera);
            }
            if (cambioDoc || fechaActual !== ultimaFecha) {
                ultimaFecha = fechaActual;
                validar();
            }
        }, 300);
    });

    // ════════════════════════════════════════════════════════════════════
    // BLOQUE 2 — SINCRONIZACIÓN DE SEGUIMIENTOS / SESIONES (localStorage)
    // Tomado de Mascota Verde v4. Prefijo propio para no chocar con otros scripts
    // (localStorage es compartido por todo el dominio).
    // ════════════════════════════════════════════════════════════════════
    ejecutarSeguro('Sincronización', function () {
        const campos = CAMPOS_SYNC.filter(idValido);
        if (!campos.length) return;

        const STORAGE_PREFIX = 'GESI_SYNC_MVI_';

        function guardarEnStorage(id, valor) {
            try { localStorage.setItem(STORAGE_PREFIX + id, valor); }
            catch (e) { console.error('Error al guardar en localStorage:', e); }
        }

        function obtenerDelStorage(id) {
            try { return localStorage.getItem(STORAGE_PREFIX + id) || ''; }
            catch (e) { return ''; }
        }

        function establecerValor(elemento, valor) {
            if (!elemento) return false;
            if ((elemento.value || '') === valor) return false;

            elemento.value = valor;
            elemento.setAttribute('value', valor);

            if (elemento.tagName === 'SELECT') {
                for (let i = 0; i < elemento.options.length; i++) {
                    if (elemento.options[i].value === valor) { elemento.selectedIndex = i; break; }
                }
            }

            [
                new Event('input', { bubbles: true }),
                new Event('change', { bubbles: true }),
                new Event('blur', { bubbles: true }),
                new KeyboardEvent('keyup', { bubbles: true }),
            ].forEach((evt) => {
                try { elemento.dispatchEvent(evt); } catch (e) { /* ignorar */ }
            });
            return true;
        }

        function sincronizar(idCampo) {
            const elementos = document.querySelectorAll('#' + idCampo);
            if (!elementos.length) return;

            // Lo que el usuario escribió pasa al storage
            elementos.forEach((elem) => {
                const valor = (elem.value || '').trim();
                if (valor && valor !== obtenerDelStorage(idCampo) && valor.toLowerCase() !== 'seleccione') {
                    guardarEnStorage(idCampo, valor);
                }
            });

            // Lo guardado se propaga a los elementos vacíos
            const valorGuardado = obtenerDelStorage(idCampo);
            if (valorGuardado) {
                elementos.forEach((elem, index) => {
                    const v = (elem.value || '').trim().toLowerCase();
                    if (v === '' || v === 'seleccione') {
                        setTimeout(() => establecerValor(elem, valorGuardado), 50 * index);
                    }
                });
            }
        }

        function sincronizarTodo() { campos.forEach(sincronizar); }

        ['input', 'change'].forEach((ev) => {
            document.addEventListener(ev, (e) => {
                if (e.target && campos.includes(e.target.id)) sincronizar(e.target.id);
            }, true);
        });

        // GESI reconstruye elementos: resincronizar cuando cambie el DOM
        new MutationObserver(() => setTimeout(sincronizarTodo, 300))
            .observe(document.body, { childList: true, subtree: true });

        setInterval(sincronizarTodo, 300);

        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) setTimeout(sincronizarTodo, 500);
        });

        setTimeout(sincronizarTodo, 2000);
    });

    // ════════════════════════════════════════════════════════════════════
    // BLOQUE 3 — AUTOCOMPLETAR POR CÉDULA (Comprobador de Derechos + Supersalud)
    // Llena nombres/apellidos (en el campo único de nombre completo), fecha de nacimiento
    // y sexo al digitar el documento.
    //  - Comprobador de Derechos: consulta solo por número (nombres, apellidos, fecha).
    //  - Supersalud: consulta con el código del tipo de documento; se usa para el sexo
    //    (y como respaldo de nombres/fecha), solo si el tipo de GESI es reconocido.
    //  - El sexo de Supersalud solo se acepta si los apellidos coinciden con los del Comprobador.
    //  - Si no se logra el sexo, aparece un aviso debajo del campo Sexo.
    // ════════════════════════════════════════════════════════════════════
    (function autocompletarPorCedula() {

        const BASE_COMPROBADOR = 'https://appb.saludcapital.gov.co/comprobadordederechos/';
        const BASE_SUPERSALUD = 'https://pqrdsuperargo.supersalud.gov.co/api/api/adres/';

        // Texto de la opción de tipo de documento en GESI (ej. "1- CC") -> código de tipo en Supersalud.
        // Confirmados: CC 0, TI 1, RC 8, CE 2, PPT 13.
        // Se reconoce por el texto porque los values de esta base no se conocen.
        // Si el tipo no se reconoce (NUIP, Pasaporte, sin ID...), NO se consulta Supersalud.
        function codigoSupersalud(textoTipoDoc) {
            const t = String(textoTipoDoc || '');
            if (/\bPPT\b|permiso/i.test(t)) return '13';
            if (/\bCC\b|c[eé]dula de ciudadan/i.test(t)) return '0';
            if (/\bTI\b|tarjeta de identidad/i.test(t)) return '1';
            if (/\bRC\b|registro civil/i.test(t)) return '8';
            if (/\bCE\b|extranjer/i.test(t)) return '2';
            return undefined;
        }

        // Sexo Supersalud (1 = Hombre, 2 = Mujer) -> marcador; la opción se busca por texto en GESI.
        // Intersexual no está mapeado: el sexo queda sin llenar (y se avisa).
        const SEXO_SUPERSALUD_A_GESI = { 1: 'H', 2: 'M' };

        const CLASE_AVISO_SEXO = 'aviso-sexo-revisar';
        let autocompletando = false; // true mientras el script escribe, para no confundirlo con un cambio manual

        // ---------- Utilidades ----------
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

        // Busca la opción de sexo por texto (hombre/mujer) y la asigna
        function setSexoPorTexto(marcador) {
            const el = getCampo('sexo');
            if (!el || !marcador || el.tagName !== 'SELECT') return false;
            const re = marcador === 'H' ? /hombre|masculino/i : /mujer|femenino/i;
            const op = Array.from(el.options).find((o) => re.test(o.text));
            return op ? setValue('sexo', op.value) : false;
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
            // Dentro de la app "Productividad GESI" (1.0.45 o superior): la consulta la hace Python
            const api = window.pywebview && window.pywebview.api;
            if (!api || typeof api.cd_http_request !== 'function') {
                return Promise.reject(new Error('puente de la app no disponible (¿app anterior a 1.0.45?)'));
            }
            return api.cd_http_request(Object.assign({ timeout: 20000 }, opts)).then((r) => {
                if (!r || !r.ok) throw new Error((r && r.error) || 'error de red');
                return r; // trae .status y .responseText, igual que GM_xmlhttpRequest
            });
        }

        // Une partes de un nombre ignorando vacíos: ['A', '', 'B'] -> 'A B'
        function unir(...partes) {
            return partes.map((p) => String(p ?? '').trim()).filter(Boolean).join(' ');
        }

        // Convierte aaaa-mm-dd al formato que espera el campo de GESI
        // (input type="date" -> aaaa-mm-dd; texto -> dd/mm/aaaa)
        function formatearFechaISO(iso) {
            const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || '').trim());
            if (!m) return String(iso || '').trim();
            const el = getCampo('fecha');
            if (el && el.type === 'date') return m[1] + '-' + m[2] + '-' + m[3];
            return m[3] + '/' + m[2] + '/' + m[1];
        }

        // Apellidos comparables: sin tildes, mayúsculas, sin importar el orden de las palabras
        function normalizarApellidos(s) {
            return String(s || '')
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                .toUpperCase()
                .split(/\s+/).filter(Boolean)
                .sort().join(' ');
        }

        // Si la respuesta de Supersalud trae algún campo con el número de documento, debe ser el consultado.
        // Si no trae ninguno, no se puede comprobar por ahí y decide la comparación de apellidos.
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

        // Arma el cuerpo del POST con los nombres reales de los controles que trae la propia página
        // (ASP.NET los llama ctl00$MainContent$...). Si la página no los trae, se usa el patrón estándar.
        function cuerpoComprobador(html1, documento) {
            const pagina = new DOMParser().parseFromString(html1, 'text/html');
            const oculto = (n) => {
                const el = pagina.querySelector('input[name="' + n + '"]');
                return el ? el.value : '';
            };
            const nombreControl = (id) => {
                const el = pagina.getElementById('MainContent_' + id);
                return (el && el.getAttribute('name')) || ('ctl00$MainContent$' + id);
            };
            const gestor = /PageRequestManager\._initialize\('([^']+)'/.exec(html1);
            const claveGestor = gestor ? gestor[1] : 'ctl00$ctl12';
            const boton = nombreControl('cmdConsultar');

            const cuerpo = {
                __EVENTTARGET: '',
                __EVENTARGUMENT: '',
                __LASTFOCUS: '',
                __VIEWSTATE: oculto('__VIEWSTATE'),
                __VIEWSTATEGENERATOR: oculto('__VIEWSTATEGENERATOR'),
                __PREVIOUSPAGE: oculto('__PREVIOUSPAGE'),
                __EVENTVALIDATION: oculto('__EVENTVALIDATION'),
            };
            ['txtConsecutivo', 'txtNoId', 'txtFichaSisben', 'txtPriApellido', 'txtSegApellido', 'txtPriNombre', 'txtSegNombre']
                .forEach((id) => { cuerpo[nombreControl(id)] = (id === 'txtNoId') ? documento : ''; });
            cuerpo[claveGestor] = boton;
            cuerpo.__ASYNCPOST = 'true';
            cuerpo[boton] = 'Consultar';
            return new URLSearchParams(cuerpo).toString();
        }

        async function consultarComprobador(documento) {
            const r1 = await gmRequest({ method: 'GET', url: BASE_COMPROBADOR + 'Consulta.aspx' });
            const body = cuerpoComprobador(r1.responseText || '', documento);

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

        // ---------- Fuente 2: Supersalud (con el código del tipo de documento) ----------
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
        // Devuelve { persona, motivoSexo }.
        //  - persona: nombres, apellidos, fecha y sexo (este último solo si se verificó).
        //  - motivoSexo: '' si el sexo se obtuvo; si no, la razón para mostrar en el aviso.
        async function buscarPersona(documento, tipoDoc) {
            let base = null;
            try {
                base = await consultarComprobador(documento);
            } catch (e) {
                console.warn('[Autocompletar cédula] Falló Comprobador de Derechos:', e);
            }

            const codigoTipo = codigoSupersalud(tipoDoc);
            let sup = null;
            let motivoSexo = '';

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

            const completa = persona.nombres && persona.apellidos && (!REQUIERE_FECHA || persona.fecha);
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
            const opSel = tipoEl && tipoEl.tagName === 'SELECT' ? tipoEl.options[tipoEl.selectedIndex] : null;
            const tipoDoc = opSel ? opSel.text : (tipoEl ? String(tipoEl.value || '') : '');

            // La clave incluye el tipo de documento: si se cambia el tipo, se vuelve a consultar
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
                    // Campo único: primero NOMBRES y luego APELLIDOS
                    setValue('nombre_completo', unir(persona.nombres, persona.apellidos));
                    if (persona.fecha) setValue('fecha', persona.fecha);

                    if (getCampo('sexo')) {
                        const sexoLleno = setSexoPorTexto(persona.sexo);
                        if (!sexoLleno) {
                            mostrarAvisoSexo(motivoSexo || 'la opción de sexo no existe en el formulario');
                        }
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

        // Los eventos se escuchan en el documento (fase de captura) y se filtran por campo,
        // así funciona aunque GESI cree o reemplace los campos después de cargar la página.
        let t = null;
        const schedule = () => {
            clearTimeout(t);
            t = setTimeout(tryAutofill, 2500);
        };
        ['blur', 'change', 'keyup'].forEach((ev) => {
            document.addEventListener(ev, (e) => {
                if (!e.target) return;
                if (idValido(IDS.cedula) && e.target.id === IDS.cedula) schedule();
                // Cambiar el tipo de documento con la cédula ya escrita: volver a consultar
                else if (idValido(IDS.tipo_doc) && e.target.id === IDS.tipo_doc && ev === 'change') schedule();
                // Si la persona corrige el sexo a mano, el aviso ya no hace falta
                else if (idValido(IDS.sexo) && e.target.id === IDS.sexo && ev === 'change' && !autocompletando) quitarAvisoSexo();
            }, true);
        });
    })();

})();
