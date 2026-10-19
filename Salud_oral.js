// ==UserScript==
// @name         SALUD ORAL
// @namespace    https://gesiapps.saludcapital.gov.co/GESI_sistemas/GESI_Form*
// @version      2026.10.19.1
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

    // IDs de los campos de la base (una sola tabla)
    const IDS = {
        recaracterizacion: 'valorControl18702', // Fecha re_caracterización

        // Campos del autocompletado por cédula (existencia confirmada con el snippet del formulario
        // Salud Oral). Por el orden de los campos: nombres y apellidos van antes del tipo de
        // documento, la cédula justo después, y la fecha de nacimiento justo antes de Edad.
        // Si nombres y apellidos quedaran invertidos, basta intercambiar esos dos IDs.
        nombres: 'valorControl18703',
        apellidos: 'valorControl18704',
        cedula: 'valorControl18706',
        fecha: 'valorControl18710',             // Fecha de nacimiento

        tipo_doc: 'valorControl18705',
        nacionalidad: 'valorControl18707',
        sexo: 'valorControl18708',
        genero: 'valorControl18709',
        edad: 'valorControl18711',              // campo "Edad" (calculado por GESI)
        etapa_gestacion: 'valorControl18713',
        rol_institucion: 'valorControl18714',
        canalizacion: 'valorControl18745',
        porque_no_canalizo: 'valorControl18746',
    };

    // Fecha de intervención (campo oculto del encabezado de la ficha)
    const ID_FECHA_INTERVENCION = 'FechaIntervencion';

    // Fechas que, con la re_caracterización diligenciada, deben ser iguales o posteriores a ella:
    // Identificación de alertas (fecha 1 y 2) y Clasificación - Tamizaje (fecha 1 y 2).
    // Solo se comparan si su contenido es una fecha válida (los textos como "1,2,9,25" se ignoran).
    const FECHAS_POSTERIORES = ['valorControl18716', 'valorControl18718', 'valorControl18721', 'valorControl18723'];

    // Valores que se dejan por defecto UNA sola vez (solo si el campo está vacío); después se respeta
    // lo que la persona cambie a mano. "requiere" espera a que otro campo tenga cierto valor.
    const DEFAULTS_UNA_VEZ = [
        { clave: 'canalizacion', valor: '959' },                                                   // No
        { clave: 'porque_no_canalizo', valor: '4129', requiere: { clave: 'canalizacion', valor: '959' } }, // 2 - Usuario Controlado en su respectiva ruta
        { clave: 'rol_institucion', valor: '4120' },                                               // 4 - Usuario beneficiario de la institución
    ];

    // Al cambiar el tipo de documento: valores comunes + los propios de cada grupo
    const VALORES_COMUNES_DOC = {
        etapa_gestacion: '3785', // 5- No aplica
    };
    const GRUPOS_DOC = [
        // CC, RC, TI (nacionales): además pinta el propio campo de tipo de documento
        { docs: [59, 60, 61], colorearDoc: true, valores: { nacionalidad: '50' } },    // COL
        // CE, NUIP, Pasaporte, Adulto sin ID, Menor sin ID, PPT (extranjeros)
        { docs: [62, 63, 64, 65, 66, 2482], colorearDoc: false, valores: { nacionalidad: '236' } }, // VEN
    ];

    // Cascada sexo -> género.
    // Con edad conocida: de 14 años en adelante -> reglas de mayores; menores de 14 -> reglas de menores.
    // Sin edad (campo vacío) se usa la regla anterior: CC -> mayores, otro documento -> menores.
    const EDAD_MINIMA_MAYORES = 14;
    const CASCADA_MAYORES = {
        '67': { genero: '70' }, // Hombre -> Masculino
        '68': { genero: '71' }, // Mujer -> Femenino
    };
    const CASCADA_MENORES = { genero: '4513' }; // No aplica

    // Validador edad / tipo de documento
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

    // Asigna un valor (también en listas de selección múltiple), pinta el campo como
    // "autocompletado" y avisa a GESI con un evento change solo si el valor cambió.
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

    // Aplica un objeto { clave: valor }
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
    // VALORES POR DEFECTO (canalización, por qué no se canalizó, rol)
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
    let intentoCorreccion = ''; // "edad|documento" de la última corrección automática (evita bucles)
    let marcado = false;        // true si el validador dejó los campos en rojo

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

    // Cambia el tipo de documento al que corresponde por la edad y avisa unos segundos.
    // La cascada del nuevo documento se aplica ANTES de avisar a GESI, para que su validación
    // nativa (documento vs nacionalidad) ya vea los valores correctos.
    function corregirTipoDocumento(campoEdad, campoDoc, valor, nombre, edad) {
        if (campoDoc.tagName === 'SELECT' && !Array.from(campoDoc.options).some((o) => o.value === valor)) return false;
        campoDoc.value = valor;
        estado.doc = valor;
        cascadaDocumento();
        ['input', 'change'].forEach((ev) => campoDoc.dispatchEvent(new Event(ev, { bubbles: true })));
        mostrarMensaje(campoEdad, CLASE_OK,
            `✔ Con edadañoseltipodedocumentosecambióa"{nombre}".`,
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

        // Corrección automática (una sola vez por combinación edad|documento)
        const clave = edad + '|' + docValue;
        if (docCorrectoValor && intentoCorreccion !== clave) {
            intentoCorreccion = clave;
            if (corregirTipoDocumento(campoEdad, campoDoc, docCorrectoValor, docCorrecto, edad)) return;
        }

        // Si no se pudo corregir: se marca en rojo
        [campoEdad, campoDoc].forEach((c) => { c.style.border = '2px solid red'; c.style.background = '#fff0f0'; });
        marcado = true;
        mostrarMensaje(campoEdad, CLASE_ERROR,
            `⚠ Con edadañosdebeusar"{docCorrecto}".`,
            { color: '#b30000', background: '#ffe6e6', border: '1px solid #ff9999' }, 0);
    }

    // ════════════════════════════════════════════════════════════════════
    // VALIDACIÓN DE FECHAS
    //  a) La fecha de re_caracterización no puede ser menor a la fecha de intervención.
    //  b) Con la re_caracterización diligenciada, las demás fechas deben ser iguales o posteriores.
    // Solo avisa (borde rojo y mensaje); no borra lo digitado.
    // ════════════════════════════════════════════════════════════════════
    const CLASE_FECHA = 'mensaje-fecha-so';
    let ultimaFirmaFechas = null;

    // Acepta dd/mm/aaaa, dd-mm-aaaa y aaaa-mm-dd (con o sin hora). Devuelve Date o null.
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

        // Solo se revisa si algún valor cambió desde la última vez
        const firma = [intervencionEl, recarEl].concat(otras).map((el) => (el ? el.value : '')).join('|');
        if (firma === ultimaFirmaFechas) return;
        ultimaFirmaFechas = firma;

        limpiarMarcasFechas();

        const intervencion = intervencionEl ? parseFecha(intervencionEl.value) : null;
        const recar = recarEl ? parseFecha(recarEl.value) : null;
        if (!recar) return; // sin re_caracterización diligenciada no hay nada que comparar

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
    // Llena nombres, apellidos, fecha de nacimiento y sexo al digitar el documento.
    //  - Comprobador de Derechos: consulta solo por número (nombres, apellidos, fecha).
    //  - Supersalud: consulta con el código del tipo de documento; se usa para el sexo
    //    (y como respaldo de nombres/fecha), solo si el tipo de GESI está en la tabla.
    //  - El sexo de Supersalud solo se acepta si los apellidos coinciden con los del Comprobador.
    //  - Si no se logra el sexo, aparece un aviso debajo del campo Sexo.
    // ════════════════════════════════════════════════════════════════════
    const BASE_COMPROBADOR = 'https://appb.saludcapital.gov.co/comprobadordederechos/';
    const BASE_SUPERSALUD = 'https://pqrdsuperargo.supersalud.gov.co/api/api/adres/';

    // value del tipo de documento en GESI -> código de tipo de documento en la URL de Supersalud.
    // Confirmados: CC 0, TI 1, RC 8, CE 2, PPT 13.
    // Si el tipo de GESI no está aquí (NUIP, Pasaporte, sin ID...), NO se consulta Supersalud.
    // Para agregar uno: 'valor_GESI': 'codigo_Supersalud'.
    const TIPO_DOC_GESI_A_SUPERSALUD = {
        '59': '0',    // Cédula de Ciudadanía
        '61': '1',    // Tarjeta de Identidad
        '60': '8',    // Registro Civil
        '62': '2',    // Cédula de Extranjería
        '2482': '13', // PPT
    };

    // Código de sexo de Supersalud -> value del campo de sexo en GESI.
    // 1 = Hombre, 2 = Mujer (confirmados).
    // Intersexual no está mapeado: si Supersalud devuelve otro código, el sexo queda sin llenar (y se avisa).
    const SEXO_SUPERSALUD_A_GESI = { 1: '67', 2: '68' };

    const CLASE_AVISO_SEXO = 'aviso-sexo-revisar';
    let autocompletando = false; // true mientras el script escribe, para no confundirlo con un cambio manual

    // ---------- Utilidades ----------
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

    // Como setValue, pero en un <select> solo asigna si la opción existe
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

    async function consultarComprobador(documento) {
        const r1 = await gmRequest({ method: 'GET', url: BASE_COMPROBADOR + 'Consulta.aspx' });
        const html1 = r1.responseText || '';

        const viewstate = extraerCampo(html1, '__VIEWSTATE');
        const viewstateGen = extraerCampo(html1, '__VIEWSTATEGENERATOR');
        const eventValidation = extraerCampo(html1, '__EVENTVALIDATION');
        const previousPage = extraerCampo(html1, '__PREVIOUSPAGE');

        // Nombres estándar de ASP.NET WebForms ("ctl00MainContent...")
        const body = new URLSearchParams({
            __EVENTTARGET: '',
            __EVENTARGUMENT: '',
            __LASTFOCUS: '',
            __VIEWSTATE: viewstate,
            __VIEWSTATEGENERATOR: viewstateGen,
            __PREVIOUSPAGE: previousPage,
            __EVENTVALIDATION: eventValidation,
            'ctl00MainContenttxtConsecutivo': '',
            'ctl00MainContenttxtNoId': documento,
            'ctl00MainContenttxtFichaSisben': '',
            'ctl00MainContenttxtPriApellido': '',
            'ctl00MainContenttxtSegApellido': '',
            'ctl00MainContenttxtPriNombre': '',
            'ctl00MainContenttxtSegNombre': '',
            'ctl00ctl12':'ctl00MainContent$cmdConsultar',
            __ASYNCPOST: 'true',
            'ctl00MainContentcmdConsultar': 'Consultar',
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
    //  - persona: nombres, apellidos y fecha (obligatorios) y sexo (opcional, solo si se verificó).
    //  - motivoSexo: '' si el sexo se obtuvo; si no, la razón para mostrar en el aviso.
    // Nombres/apellidos/fecha salen del Comprobador; Supersalud solo completa lo que falte
    // y únicamente si el tipo de documento está en la tabla.
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
            } else if (!sup.numeroOk) {
                motivoSexo = 'el número de documento de Supersalud no coincide';
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

    // Los eventos se escuchan en el documento (fase de captura) y se filtran por campo,
    // así funciona aunque GESI cree o reemplace los campos después de cargar la página.
    let temporizadorCedula = null;
    const programarAutofill = () => {
        clearTimeout(temporizadorCedula);
        temporizadorCedula = setTimeout(tryAutofill, 2500);
    };
    ['blur', 'change', 'keyup'].forEach((ev) => {
        document.addEventListener(ev, (e) => {
            if (!e.target) return;
            if (e.target.id === IDS.cedula) programarAutofill();
            // Cambiar el tipo de documento con la cédula ya escrita: volver a consultar
            else if (e.target.id === IDS.tipo_doc && ev === 'change') programarAutofill();
            // Si la persona corrige el sexo a mano, el aviso ya no hace falta
            else if (e.target.id === IDS.sexo && ev === 'change' && !autocompletando) quitarAvisoSexo();
        }, true);
    });

    // ════════════════════════════════════════════════════════════════════
    // DETECCIÓN DE CAMBIOS (un solo punto de entrada para todo)
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

            // Primera vez que existen los campos: punto de partida, no dispara cascadas
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

            // 1) Validador: cambió el documento o la edad (puede corregir el documento)
            if (tipoDoc.value !== estado.doc || edadActual !== estado.edad) validarEdadDocumento();

            // 2) Cascada por tipo de documento
            if (tipoDoc.value !== estado.doc) {
                estado.doc = tipoDoc.value;
                cascadaDocumento();
            }

            // 3) Cascada por sexo / edad
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

    // Reacción inmediata en fase de captura (antes que los manejadores de GESI), para que la
    // nacionalidad ya esté corregida cuando GESI valide el tipo de documento.
    const IDS_OBSERVADOS = [IDS.tipo_doc, IDS.sexo, IDS.edad];
    ['input', 'change'].forEach((ev) => {
        document.addEventListener(ev, (e) => {
            if (e.target && IDS_OBSERVADOS.includes(e.target.id)) tick();
        }, true);
    });

    // Respaldo: GESI cambia valores (p. ej. la edad o las fechas) sin disparar eventos
    setInterval(tick, 300);
    tick();
})();

