// ==UserScript==
// @name         INSTITUCIONAL FULL HD
// @namespace    https://gesiapps.saludcapital.gov.co/GESI_sistemas/GESI_Form*
// @version      2026.09.24.1
// @description  Institucional: valores por defecto, cascadas documento/sexo/género, sesiones, validador edad/documento y autocompletado por cédula (Comprobador de Derechos + Supersalud con código por tipo de documento, verificación y aviso de sexo)
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
    // CONFIGURACIÓN COMPARTIDA
    // ════════════════════════════════════════════════════════════════════
    const bgSuccess = "rgba(50, 200, 150, 0.2)";

    // IDs de los campos de la base Institucional (una sola tabla para todos los bloques)
    const IDS = {
        nombres: 'valorControl19129',
        apellidos: 'valorControl19130',
        linea_operativa: 'valorControl19009',
        tema: 'valorControl19012',
        tipo_doc: 'valorControl19131',
        cedula: 'valorControl19132',
        sexo: 'valorControl19133',
        genero: 'valorControl19134',
        orientacion: 'valorControl19135',
        identidad_genero: 'valorControl19136',
        fecha: 'valorControl19137',
        pais: 'valorControl19138',
        edad: 'valorControl19954',
        etnia: 'valorControl19139',
        pob_dif: 'valorControl19141',
        Pob_inclusion: 'valorControl19142',
        categoria_discapacidad: 'valorControl19143',
        etapa_gestacion: 'valorControl19144',
        ocupacion: 'valorControl19145',
        rol_institucion: 'valorControl19146',
        canalizacion: 'valorControl19148',
        porquenosecanalizo: 'valorControl19149',
    };

    function getCampo(clave) { return document.querySelector('#' + IDS[clave]); }

    // Asigna un valor y pinta el campo como "autocompletado"
    function aplicar(campo, valor) {
        if (!campo) return;
        campo.value = valor;
        campo.style.backgroundColor = bgSuccess;
    }

    // Asigna un valor SOLO si el campo está vacío, para no pisar una selección manual del usuario
    function asignarSiVacio(campo, valor) {
        if (campo && campo.value === "") aplicar(campo, valor);
    }

    // Aplica un objeto { clave: valor } sobre un mapa de campos
    function aplicarMapa(campos, valores) {
        Object.keys(valores).forEach((k) => aplicar(campos[k], valores[k]));
    }

    function ejecutarSeguro(nombre, fn) {
        try { fn(); } catch (error) { console.error('[' + nombre + ']', error); }
    }

    // ════════════════════════════════════════════════════════════════════
    // BLOQUE 1 — DOCUMENTO / SEXO / GÉNERO (valores por defecto y cascadas)
    // ════════════════════════════════════════════════════════════════════
    ejecutarSeguro('Documento/sexo/género', function () {
        const tipo_doc = getCampo('tipo_doc');
        const sexo = getCampo('sexo');
        const campos = {
            genero: getCampo('genero'),
            orientacion: getCampo('orientacion'),
            identidad_genero: getCampo('identidad_genero'),
            etnia: getCampo('etnia'),
            pais: getCampo('pais'),
            pob_dif: getCampo('pob_dif'),
            Pob_inclusion: getCampo('Pob_inclusion'),
            categoria_discapacidad: getCampo('categoria_discapacidad'),
            etapa_gestacion: getCampo('etapa_gestacion'),
            canalizacion: getCampo('canalizacion'),
            porquenosecanalizo: getCampo('porquenosecanalizo'),
            ocupacion: getCampo('ocupacion'),
        };
        const rol_institucion = getCampo('rol_institucion');

        // Valores por defecto (solo si están vacíos)
        asignarSiVacio(campos.ocupacion, '');
        asignarSiVacio(rol_institucion, '4120');

        // Al cambiar el tipo de documento: valores comunes + los propios de cada grupo
        const VALORES_COMUNES_DOC = {
            etnia: '84',
            Pob_inclusion: '4048',
            categoria_discapacidad: '3822',
            etapa_gestacion: '3785',
            canalizacion: '',
            porquenosecanalizo: '',
            ocupacion: '1063',
        };
        const GRUPOS_DOC = [
            // CC, RC, TI (nacionales): además pinta el propio campo de tipo de documento
            { docs: [59, 60, 61], colorearDoc: true, valores: { pais: '50', pob_dif: '2620' } },
            // CE, NUIP, Pasaporte, Adulto sin ID, Menor sin ID, PPT (extranjeros)
            { docs: [62, 63, 64, 65, 66, 2482], colorearDoc: false, valores: { pais: '236', pob_dif: '4051' } },
        ];

        // Al cambiar el sexo o la edad: género / orientación / identidad de género.
        // Con edad conocida: de 14 años en adelante → reglas de mayores; menores de 14 → reglas de menores.
        // Sin edad (campo vacío o inexistente) se usa la regla anterior: CC → mayores, otro documento → menores.
        const EDAD_MINIMA_MAYORES = 14;
        const CASCADA_MAYORES = {
            '67': { genero: '70', orientacion: '4024', identidad_genero: '4515' },
            '68': { genero: '71', orientacion: '4024', identidad_genero: '4514' },
        };
        const CASCADA_MENORES = { genero: '4513', orientacion: '4028', identidad_genero: '4020' };

        // Campo de edad (mismo criterio que el validador). Se busca como máximo cada 500 ms
        // mientras no exista, para no recorrer la página en cada revisión.
        const getEdad = () => getCampo('edad') || document.querySelector('[id*="' + IDS.edad + '"]');
        let edadEl = getEdad();
        let ultimaBusquedaEdad = Date.now();

        let ultimoTipoDoc = tipo_doc ? tipo_doc.value : '';
        let ultimoSexo = sexo ? sexo.value : '';
        let ultimaEdad = edadEl ? edadEl.value : '';

        // Sin retardo, igual que el script original
        setInterval(function () {
            if (!tipo_doc || !sexo) return;

            const docActual = tipo_doc.value;
            const sexoActual = sexo.value;

            if (!edadEl || !edadEl.isConnected) {
                const ahora = Date.now();
                if (ahora - ultimaBusquedaEdad > 500) {
                    ultimaBusquedaEdad = ahora;
                    edadEl = getEdad();
                    if (edadEl) ultimaEdad = edadEl.value; // punto de partida: no dispara la cascada
                }
            }
            const edadActual = edadEl ? edadEl.value : '';

            if (docActual !== ultimoTipoDoc) {
                ultimoTipoDoc = docActual;
                const v = parseInt(docActual, 10);
                const grupo = GRUPOS_DOC.find((g) => g.docs.includes(v));
                if (grupo) {
                    if (grupo.colorearDoc) tipo_doc.style.backgroundColor = bgSuccess;
                    aplicarMapa(campos, Object.assign({}, VALORES_COMUNES_DOC, grupo.valores));
                }
            }

            if (sexoActual !== ultimoSexo || edadActual !== ultimaEdad) {
                ultimoSexo = sexoActual;
                ultimaEdad = edadActual;
                const esHombreOMujer = sexoActual === '67' || sexoActual === '68';
                const edad = parseInt(edadActual, 10);
                const esMayor = !isNaN(edad) ? edad >= EDAD_MINIMA_MAYORES : tipo_doc.value === '59';
                const cascada = esMayor
                    ? CASCADA_MAYORES[sexoActual]
                    : (esHombreOMujer ? CASCADA_MENORES : null);
                if (cascada) {
                    sexo.style.backgroundColor = bgSuccess;
                    aplicarMapa(campos, cascada);
                }
            }
        });
    });

    // ════════════════════════════════════════════════════════════════════
    // BLOQUE 2 — VALORES POR DEFECTO (evaluación)
    // ════════════════════════════════════════════════════════════════════
    ejecutarSeguro('Valores por defecto evaluación', function () {
        const NO_APLICA_6 = "6. No aplica (no cumple con los criterios)";
        const NO_APLICA_3 = "3. No aplica (no cumple con los criterios)";
        [
            ['valorControl14647', NO_APLICA_6], // oms
            ['valorControl14648', NO_APLICA_6], // find
            ['valorControl14649', NO_APLICA_6], // epoc
            ['valorControl14650', NO_APLICA_6], // visual
            ['valorControl14651', NO_APLICA_3], // auditivo
            ['valorControl14656', '1'],         // asistencia
        ].forEach(([id, valor]) => asignarSiVacio(document.querySelector('#' + id), valor));
    });

    // ════════════════════════════════════════════════════════════════════
    // BLOQUE 3 — ASISTENCIA A LA SESIÓN (Institución → Personas) + VALIDADOR EDAD/DOCUMENTO
    // ════════════════════════════════════════════════════════════════════
    (function autoSesion() {

        const camposSesion = [
            { id: 'valorControl19008' },
            { id: 'valorControl19029' },
            { id: 'valorControl19049' },
            { id: 'valorControl19069' },
        ];

        const mapaAsistencia = {
            '1':  '4307', '2':  '4422', '3':  '4424', '4':  '4426', '5':  '4428',
            '6':  '4430', '7':  '4432', '8':  '4434', '9':  '4462', '10': '4464',
            '11': '4466', '12': '4468', '13': '4470', '14': '4472', '15': '4474',
            '16': '4476', '17': '4478', '18': '4480', '19': '4482', '20': '4484',
            '21': '4486', '22': '4488', '23': '4490', '24': '4492', '25': '4494',
            '26': '4496', '27': '4498', '28': '4500', '29': '4502', '30': '4504',
            '31': '4836', '32': '4838', '33': '4840', '34': '4842', '35': '4844',
            '36': '4846', '37': '4848', '38': '4850', '39': '4852', '40': '4854',
            '41': '4856', '42': '4858', '43': '4860', '44': '4862', '45': '4864',
            '46': '4866', '47': '4868', '48': '4870',

        };

        const ID_LISTBOX_BASE = 'valorControl19147';
        const KEY_HISTORIAL   = 'auto_sesion_historial';
        const KEY_CONSECUTIVO = 'auto_sesion_consecutivo';
        const ID_EDAD         = IDS.edad;
        const ID_DOCUMENTO    = IDS.tipo_doc;
        const IDS_SESION      = ['19008', '19029', '19049', '19069'];

        const reglasDocumento = {
            '60': { nombre: 'Registro Civil',       edadMin: 0,  edadMax: 6   },
            '61': { nombre: 'Tarjeta de Identidad', edadMin: 7,  edadMax: 17  },
            '59': { nombre: 'Cédula de Ciudadanía', edadMin: 18, edadMax: 999 },
        };

        // Normaliza el número de sesión: cualquier valor mayor a 48 se trata como 48
        function normalizarSesion(val) {
            const n = parseInt(val, 10);
            if (isNaN(n)) return '';
            if (n > 48) return '48';
            if (n < 1) return '';
            return String(n);
        }

        function obtenerHistorial() {
            try { return JSON.parse(localStorage.getItem(KEY_HISTORIAL) || '[]'); } catch { return []; }
        }
        // FIX: ya no se une con el historial anterior, se SOBRESCRIBE con lo que
        // hay actualmente en los campos de sesión. Esto evita que sesiones viejas
        // (p. ej. una "3" que quedó de antes) se queden marcadas para siempre
        // junto con la sesión nueva que se está digitando (p. ej. "30").
        function guardarHistorial(sesionesNuevas) {
            const combinado = [...new Set(sesionesNuevas)];
            combinado.sort((a, b) => parseInt(a) - parseInt(b));
            localStorage.setItem(KEY_HISTORIAL, JSON.stringify(combinado));
        }
        function limpiarHistorial() {
            localStorage.removeItem(KEY_HISTORIAL);
            localStorage.removeItem(KEY_CONSECUTIVO);
        }
        function verificarFichaNueva() {
            const consecutivo = document.querySelector('[id*="Consecutivo"], [name*="consecutivo"], [id*="consecutivo"]');
            if (!consecutivo) return;
            const valorActual   = (consecutivo.value || consecutivo.textContent || '').trim();
            const valorGuardado = localStorage.getItem(KEY_CONSECUTIVO);
            if (valorGuardado && valorActual !== valorGuardado) limpiarHistorial();
            if (valorActual) localStorage.setItem(KEY_CONSECUTIVO, valorActual);
        }

        function modoInstitucion() {
            verificarFichaNueva();
            function recalcularHistorial() {
                const sesionesEstaPestana = [];
                camposSesion.forEach(({ id }) => {
                    const campo = document.getElementById(id);
                    if (campo) {
                        const val = normalizarSesion(campo.value.trim());
                        if (val !== '' && mapaAsistencia[val] && !sesionesEstaPestana.includes(val))
                            sesionesEstaPestana.push(val);
                    }
                });
                document.querySelectorAll('input').forEach(input => {
                    const val = normalizarSesion(input.value.trim());
                    const esIdSesion = IDS_SESION.some(idPart => input.id.includes(idPart));
                    if (esIdSesion && val !== '' && mapaAsistencia[val] && !sesionesEstaPestana.includes(val))
                        sesionesEstaPestana.push(val);
                });
                guardarHistorial(sesionesEstaPestana);
            }
            camposSesion.forEach(({ id }) => {
                const campo = document.getElementById(id);
                if (!campo) return;
                ['input', 'change', 'keyup'].forEach(ev => campo.addEventListener(ev, recalcularHistorial));
            });
            document.querySelectorAll('input').forEach(input => {
                const esIdSesion = IDS_SESION.some(idPart => input.id.includes(idPart));
                if (esIdSesion)
                    ['input', 'change', 'keyup'].forEach(ev => input.addEventListener(ev, recalcularHistorial));
            });
            recalcularHistorial();
            setTimeout(recalcularHistorial, 500);
            setTimeout(recalcularHistorial, 1500);
            setTimeout(recalcularHistorial, 3000);
        }

        function modoPersonas() {
            const historial = obtenerHistorial();
            if (historial.length === 0) { iniciarValidador(); return; }

            const valoresAMarcar = historial.map(s => mapaAsistencia[s]).filter(Boolean);

            const listboxes = Array.from(document.querySelectorAll('select'))
                .filter(el => el.id && el.id.includes(ID_LISTBOX_BASE));

            listboxes.forEach(listbox => {
                const yaSeleccionados = Array.from(listbox.options)
                    .filter(opt => opt.selected).map(opt => opt.value);

                const noAsistioMarcados = Array.from(listbox.options)
                    .filter(opt => opt.selected && opt.text.includes('No asistió'))
                    .map(opt => opt.value);

                let huboCambio = false;

                listbox.querySelectorAll('option').forEach(op => {
                    if (yaSeleccionados.includes(op.value)) { op.selected = true; }
                    if (valoresAMarcar.includes(op.value) && !yaSeleccionados.includes(op.value)) {
                        const numSesion = op.text.match(/S(\d+)/)?.[1];
                        const noAsistioEstaSesion = noAsistioMarcados.some(v => {
                            const opNo = listbox.querySelector(`option[value="${v}"]`);
                            return opNo?.text.match(/S(\d+)/)?.[1] === numSesion;
                        });
                        if (!noAsistioEstaSesion) { op.selected = true; huboCambio = true; }
                    }
                });

                if (huboCambio) listbox.dispatchEvent(new Event('change', { bubbles: true }));
            });

            iniciarValidador();
        }

        function iniciarValidador() {
            const camposEdad = document.querySelectorAll(`[id*="${ID_EDAD}"]`);
            const camposDoc  = document.querySelectorAll(`[id*="${ID_DOCUMENTO}"]`);
            const total = Math.min(camposEdad.length, camposDoc.length);
            const ultimosEdad = Array(total).fill('');
            const ultimosDoc  = Array(total).fill('');
            setInterval(() => {
                for (let i = 0; i < total; i++) {
                    const ce = camposEdad[i], cd = camposDoc[i];
                    if (!ce || !cd) continue;
                    if (ce.value !== ultimosEdad[i] || cd.value !== ultimosDoc[i]) {
                        ultimosEdad[i] = ce.value;
                        ultimosDoc[i]  = cd.value;
                        validar(ce, cd, i + 1);
                    }
                }
            }, 400);
            for (let i = 0; i < total; i++) { validar(camposEdad[i], camposDoc[i], i + 1); }
        }

        // Persona -> "edad|documento" de la última corrección automática. Evita repetirla en bucle
        // si GESI devolviera el documento anterior; se olvida apenas la edad y el documento coinciden.
        const correccionesIntentadas = new Map();

        // Cambia el tipo de documento al que corresponde por la edad y avisa unos segundos
        function corregirTipoDocumento(campoEdad, campoDoc, valor, nombre, edad, num) {
            if (campoDoc.tagName === 'SELECT' && !Array.from(campoDoc.options).some(o => o.value === valor)) return false;
            campoDoc.value = valor;
            ['input', 'change'].forEach(ev => campoDoc.dispatchEvent(new Event(ev, { bubbles: true })));
            const previo = campoEdad.parentNode.querySelector('.mensaje-autocorreccion');
            if (previo) previo.remove();
            const div = document.createElement('div');
            div.className   = 'mensaje-autocorreccion';
            div.textContent = `✔ Persona ${num}: con ${edad} años el tipo de documento se cambió a "${nombre}".`;
            Object.assign(div.style, { color: '#1b5e20', background: '#e8f5e9', padding: '6px',
                marginTop: '4px', border: '1px solid #a5d6a7', borderRadius: '4px', fontSize: '12px' });
            campoEdad.parentNode.appendChild(div);
            setTimeout(() => div.remove(), 6000);
            return true;
        }

        function validar(campoEdad, campoDoc, num) {
            if (!campoEdad || !campoDoc) return;
            const edad = parseInt(campoEdad.value, 10);
            const docValue = campoDoc.value;
            campoEdad.style.border = campoEdad.style.background = '';
            campoDoc.style.border  = campoDoc.style.background  = '';
            const prev = campoEdad.parentNode.querySelector('.mensaje-validacion');
            if (prev) prev.remove();
            if (isNaN(edad) || !docValue || !reglasDocumento[docValue]) { correccionesIntentadas.delete(num); return; }
            const regla = reglasDocumento[docValue];
            if (edad < regla.edadMin || edad > regla.edadMax) {
                let docCorrecto = 'Desconocido';
                let docCorrectoValor = null;
                for (const [valor, r] of Object.entries(reglasDocumento)) {
                    if (edad >= r.edadMin && edad <= r.edadMax) { docCorrecto = r.nombre; docCorrectoValor = valor; break; }
                }
                // Corrección automática: se cambia el tipo de documento al que corresponde por la edad
                const clave = edad + '|' + docValue;
                if (docCorrectoValor && correccionesIntentadas.get(num) !== clave) {
                    correccionesIntentadas.set(num, clave);
                    if (corregirTipoDocumento(campoEdad, campoDoc, docCorrectoValor, docCorrecto, edad, num)) return;
                }
                [campoEdad, campoDoc].forEach(c => { c.style.border = '2px solid red'; c.style.background = '#fff0f0'; });
                if (!campoEdad.parentNode.querySelector('.mensaje-validacion')) {
                    const div = document.createElement('div');
                    div.className   = 'mensaje-validacion';
                    div.textContent = `⚠ Persona ${num}: Con ${edad} años debe usar "${docCorrecto}".`;
                    Object.assign(div.style, { color: '#b30000', background: '#ffe6e6', padding: '6px',
                        marginTop: '4px', border: '1px solid #ff9999', borderRadius: '4px', fontSize: '12px' });
                    campoEdad.parentNode.appendChild(div);
                }
            } else {
                correccionesIntentadas.delete(num);
            }
        }

        function detectarYEjecutar() {
            const enInstitucion  = camposSesion.some(({ id }) => document.getElementById(id));
            const tieneValidador = document.querySelector(`[id*="${ID_EDAD}"]`);
            if (enInstitucion) modoInstitucion();
            if (tieneValidador) setTimeout(modoPersonas, 800);
        }

        if (document.readyState === 'complete') detectarYEjecutar();
        else window.addEventListener('load', detectarYEjecutar);

    })(); // fin autoSesion

    // ════════════════════════════════════════════════════════════════════
    // BLOQUE 4 — AUTOCOMPLETAR POR CÉDULA (Comprobador de Derechos + Supersalud)
    // Llena nombres, apellidos, fecha de nacimiento y sexo al digitar el documento.
    //  - Comprobador de Derechos: consulta solo por número (nombres, apellidos, fecha).
    //  - Supersalud: consulta con el código del tipo de documento; se usa para el sexo
    //    (y como respaldo de nombres/fecha), solo si el tipo de GESI está en la tabla.
    //  - El sexo de Supersalud solo se acepta si los apellidos coinciden con los del Comprobador.
    //  - Si no se logra el sexo, aparece un aviso debajo del campo Sexo.
    // ════════════════════════════════════════════════════════════════════
    (function autocompletarPorCedula() {

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
                console.warn('[Autocompletar cédula] Falló Comprobador de Derechos:', e);
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
        let t = null;
        const schedule = () => {
            clearTimeout(t);
            t = setTimeout(tryAutofill, 2500);
        };
        ['blur', 'change', 'keyup'].forEach((ev) => {
            document.addEventListener(ev, (e) => {
                if (!e.target) return;
                if (e.target.id === IDS.cedula) schedule();
                // Cambiar el tipo de documento con la cédula ya escrita: volver a consultar
                else if (e.target.id === IDS.tipo_doc && ev === 'change') schedule();
                // Si la persona corrige el sexo a mano, el aviso ya no hace falta
                else if (e.target.id === IDS.sexo && ev === 'change' && !autocompletando) quitarAvisoSexo();
            }, true);
        });
    })(); // fin autocompletarPorCedula

    // ════════════════════════════════════════════════════════════════════
    // BLOQUE 5 — AVISO: EL TEMA NO ES OBLIGATORIO EN LAS LÍNEAS OPERATIVAS 5 Y 6
    // Si la línea operativa es la 5 o la 6 y el Tema está vacío, se avisa (debajo de la línea operativa) que puede quedar sin diligenciar
    // ════════════════════════════════════════════════════════════════════
    (function avisoTemaOpcional() {

        // Pares línea operativa → tema. Para otro bloque de sesión con los mismos campos, basta agregar un par.
        const PARES = [
            { linea: IDS.linea_operativa, tema: IDS.tema },
        ];
        const LINEAS_SIN_TEMA = [5, 6];
        const CLASE_AVISO = 'aviso-tema-opcional';

        // Número de línea según el texto de la opción elegida ("5 - ...", "Línea 5", "Línea operativa 5"...)
        function numeroLinea(campo) {
            if (!campo) return null;
            let texto = campo.value;
            if (campo.tagName === 'SELECT') {
                const op = campo.options[campo.selectedIndex];
                texto = op ? op.text : '';
            }
            const m = /^\s*(?:l[ií]nea(?:\s+operativa)?\s*)?(\d+)(?!\d)/i.exec(String(texto || ''));
            const n = m ? parseInt(m[1], 10) : NaN;
            return LINEAS_SIN_TEMA.includes(n) ? n : null;
        }

        function evaluar() {
            PARES.forEach(({ linea, tema }) => {
                const campoLinea = document.getElementById(linea);
                const campoTema = document.getElementById(tema);
                const n = numeroLinea(campoLinea);
                const temaVacio = !!campoTema && String(campoTema.value ?? '').trim() === '';
                const avisos = document.querySelectorAll('.' + CLASE_AVISO + '[data-tema="' + tema + '"]');

                if (n === null || !temaVacio) {
                    avisos.forEach((a) => a.remove());
                    return;
                }

                const texto = `ℹ Línea operativa ${n}: el campo Tema no es obligatorio. Si no lo trae, puede dejarlo sin diligenciar.`;
                if (avisos.length) {
                    if (avisos[0].textContent !== texto) avisos[0].textContent = texto;
                    return;
                }
                const div = document.createElement('div');
                div.className = CLASE_AVISO;
                div.setAttribute('data-tema', tema);
                div.textContent = texto;
                Object.assign(div.style, { color: '#0d47a1', background: '#e3f2fd', padding: '6px',
                    marginTop: '4px', border: '1px solid #90caf9', borderRadius: '4px', fontSize: '12px' });
                campoLinea.parentNode.appendChild(div); // debajo de la línea operativa
            });
        }

        // Al instante cuando se cambia la línea o el tema, y una revisión periódica liviana por si GESI
        // cambia los valores sin disparar eventos o vuelve a dibujar el formulario.
        const IDS_OBSERVADOS = PARES.flatMap((p) => [p.linea, p.tema]);
        ['change', 'input', 'keyup'].forEach((ev) => {
            document.addEventListener(ev, (e) => {
                if (e.target && IDS_OBSERVADOS.includes(e.target.id)) evaluar();
            }, true);
        });
        setInterval(evaluar, 700);
        evaluar();
    })(); // fin avisoTemaOpcional

})();
