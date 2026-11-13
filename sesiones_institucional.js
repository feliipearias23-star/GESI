// ==UserScript==
// @name         SESIONES INSTITUCIONAL
// @namespace    https://gesiapps.saludcapital.gov.co/GESI_sistemas/GESI_Form*
// @version      2026.11.13.1
// @description  Institucional: solo se activa en la base Institucional (guard por IDs). Valores por defecto, cascadas documento/sexo/género, sesiones, validador edad/documento, autocompletado por cédula (Comprobador de Derechos + Supersalud), aviso de Tema opcional (líneas 5 y 6), bloqueo de Nombre del grupo, coherencias (Discapacidad vs Categoría, FIES desde 65 años), valores por defecto de Tamizajes, comprobador de documentos Personas vs Tamizajes y validaciones de nombres/documento
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
        nombre_grupo: 'valorControl18976',
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
        // Pestaña Tamizajes
        doc_tamizajes: 'valorControl19154',
        oms: 'valorControl19155',
        // Escala FIES: si se conoce el ID, escríbalo aquí (ej. 'valorControl12345').
        // Mientras esté vacío, el campo se ubica por su etiqueta ("FIES").
        fies: '',
    };

    // ════════════════════════════════════════════════════════════════════
    // GUARD — el script SOLO arranca si la página es la base Institucional.
    // Se reconoce por IDs que únicamente existen en esta base.
    // En cualquier otra base solo corre una comprobación barata cada 1.5 s.
    // (Se incluyen los IDs de la pestaña Tamizajes para que también arranque allí.)
    // ════════════════════════════════════════════════════════════════════
    const MARCADORES_INSTITUCIONAL = [
        IDS.nombres, IDS.tipo_doc, IDS.cedula, IDS.linea_operativa,
        IDS.nombre_grupo, 'valorControl19008', 'valorControl19147',
        IDS.doc_tamizajes, IDS.oms,
    ].map((id) => '[id^="' + id + '"]').join(',');

    function esBaseInstitucional() {
        return !!document.querySelector(MARCADORES_INSTITUCIONAL);
    }

    function getCampo(clave) { return document.querySelector('#' + IDS[clave]); }

    // Campo de edad (mismo criterio para el cascada de sexo, el validador y las coherencias)
    function getEdad() { return getCampo('edad') || document.querySelector('[id*="' + IDS.edad + '"]'); }

    // Busca un campo por su ID exacto y, si no existe, por un ID que lo contenga (sin contar inputs hidden)
    function buscarPorId(id) {
        const exacto = document.getElementById(id);
        if (exacto) return exacto;
        const numero = id.replace(/^valorControl/, '');
        return document.querySelector('select[id*="' + numero + '"], textarea[id*="' + numero + '"], input:not([type="hidden"])[id*="' + numero + '"]');
    }

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

    // Texto sin tildes, en minúscula y con espacios normalizados (para comparar etiquetas y opciones)
    const sinTildes = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

    // Texto visible de lo elegido (en un select, el de la opción; en otro campo, su valor)
    function textoElegido(campo) {
        if (campo.tagName === 'SELECT') {
            const op = campo.options[campo.selectedIndex];
            return op ? op.text : '';
        }
        return campo.value;
    }

    // ¿El campo está sin diligenciar? (vacío, 0, -1 o la opción "Seleccione")
    function estaVacio(campo) {
        if (!campo) return true;
        const v = String(campo.value ?? '').trim();
        if (v === '' || v === '0' || v === '-1') return true;
        if (campo.tagName === 'SELECT') {
            const op = campo.options[campo.selectedIndex];
            return !!op && /^(--+\s*)?(seleccion|select|escoja|elija|ninguno)/.test(sinTildes(op.text));
        }
        return false;
    }

    // ¿El texto es una opción "No aplica"? (acepta numeración previa: "6. No aplica (...)")
    const esNoAplicaTexto = (t) => /^(\d+\s*[.\-)]\s*)?no aplica/.test(sinTildes(t));
    const esNoAplica = (campo) => !!campo && esNoAplicaTexto(textoElegido(campo));

    // Avisos visuales (un solo lugar para el estilo de todos los mensajes del script)
    const ESTILOS_AVISO = {
        error: { color: '#b30000', background: '#ffe6e6', border: '1px solid #ff9999' },
        ok:    { color: '#1b5e20', background: '#e8f5e9', border: '1px solid #a5d6a7' },
        info:  { color: '#0d47a1', background: '#e3f2fd', border: '1px solid #90caf9' },
    };
    function crearAviso(tipo, texto, clase) {
        const div = document.createElement('div');
        if (clase) div.className = clase;
        div.textContent = texto;
        Object.assign(div.style, ESTILOS_AVISO[tipo], { padding: '6px', marginTop: '4px', borderRadius: '4px', fontSize: '12px' });
        return div;
    }

    // Mantiene UN aviso de la clase dada junto al campo "ancla": lo crea, lo actualiza o lo quita (texto vacío)
    function sincronizarAviso(ancla, clase, tipo, texto) {
        if (!ancla || !ancla.parentNode) return;
        const previos = Array.from(ancla.parentNode.children).filter((h) => h.classList.contains(clase));
        if (!texto) { previos.forEach((a) => a.remove()); return; }
        if (previos.length === 1) {
            if (previos[0].textContent !== texto) previos[0].textContent = texto;
            return;
        }
        previos.forEach((a) => a.remove());
        ancla.parentNode.appendChild(crearAviso(tipo, texto, clase));
    }

    function quitarAvisos(clase) {
        document.querySelectorAll('.' + clase).forEach((a) => a.remove());
    }

    // Marca (o desmarca) un campo en rojo por incoherencia; solo limpia lo que él mismo marcó
    function marcarIncoherente(campo, activo) {
        if (!campo) return;
        if (activo) {
            campo.dataset.incoherente = '1';
            campo.style.border = '2px solid red';
            campo.style.backgroundColor = '#fff0f0';
        } else if (campo.dataset.incoherente === '1') {
            delete campo.dataset.incoherente;
            campo.style.border = '';
            campo.style.backgroundColor = '';
        }
    }

    // Ejecuta una revisión ahora, tras los eventos del usuario (con debounce de 250 ms)
    // y cada 500 ms (GESI cambia valores por JS sin avisar, por eso el respaldo por intervalo)
    function vigilar(fn, ms) {
        let pendiente = null;
        const programar = () => {
            if (pendiente) return;
            pendiente = setTimeout(() => { pendiente = null; fn(); }, 250);
        };
        ['change', 'input', 'keyup', 'click', 'blur'].forEach((ev) => {
            document.addEventListener(ev, programar, true);
        });
        setInterval(fn, ms || 500);
        fn();
    }

    // ════════════════════════════════════════════════════════════════════
    // AYUDANTES DE UBICACIÓN POR ETIQUETA (para bloques 5 y 7)
    // Optimizados: filtro barato por longitud antes de normalizar, sin recorrer
    // div/p, y si no se encuentra el campo no se vuelve a buscar durante 5 s.
    // ════════════════════════════════════════════════════════════════════
    const CONTROL_SEL = 'input:not([type="hidden"]):not([type="submit"]):not([type="button"]), select, textarea';
    const ETIQUETAS_SEL = 'label, th, td, legend, b, strong, span';
    const ESPERA_TRAS_FALLO_MS = 5000;
    const fallosEtiqueta = new Map(); // regex.source -> momento del último intento fallido

    function controlDespuesDe(etiqueta) {
        if (etiqueta.htmlFor) {
            const porFor = document.getElementById(etiqueta.htmlFor);
            if (porFor) return porFor;
        }
        let nodo = etiqueta;
        for (let i = 0; i < 5 && nodo.parentElement; i++) {
            nodo = nodo.parentElement;
            const c = Array.from(nodo.querySelectorAll(CONTROL_SEL))
                .find((x) => etiqueta.compareDocumentPosition(x) & Node.DOCUMENT_POSITION_FOLLOWING);
            if (c) return c;
        }
        return null;
    }

    function localizarPorEtiqueta(regex) {
        const clave = regex.source;
        const ultimoFallo = fallosEtiqueta.get(clave);
        if (ultimoFallo && Date.now() - ultimoFallo < ESPERA_TRAS_FALLO_MS) return null;

        const els = document.querySelectorAll(ETIQUETAS_SEL);
        for (const el of els) {
            if (el.children.length > 1) continue;
            const crudo = el.textContent;
            if (!crudo || crudo.length > 80) continue; // filtro barato antes de normalizar
            const txt = sinTildes(crudo);
            if (!txt || txt.length > 60 || !regex.test(txt)) continue;
            const c = controlDespuesDe(el);
            if (c) { fallosEtiqueta.delete(clave); return c; }
        }
        fallosEtiqueta.set(clave, Date.now());
        return null;
    }

    // Primero por etiqueta; si no aparece, por ID
    function localizarCampo(regex, idClave) {
        return localizarPorEtiqueta(regex) || (IDS[idClave] ? buscarPorId(IDS[idClave]) : null);
    }

    // ════════════════════════════════════════════════════════════════════
    // INICIO — aquí arrancan los 10 bloques (solo en la base Institucional)
    // ════════════════════════════════════════════════════════════════════
    function iniciar() {

        // ════════════════════════════════════════════════════════════════
        // BLOQUE 1 — DOCUMENTO / SEXO / GÉNERO (valores por defecto y cascadas)
        // ════════════════════════════════════════════════════════════════
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
                canalizacion: '959',
                porquenosecanalizo: '4129',
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

            // Campo de edad: se busca como máximo cada 500 ms mientras no exista,
            // para no recorrer la página en cada revisión.
            let edadEl = getEdad();
            let ultimaBusquedaEdad = Date.now();

            let ultimoTipoDoc = tipo_doc ? tipo_doc.value : '';
            let ultimoSexo = sexo ? sexo.value : '';
            let ultimaEdad = edadEl ? edadEl.value : '';

            // Intervalo de 250 ms (antes sin retardo: corría cientos de veces por segundo)
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
            }, 250);
        });

        // ════════════════════════════════════════════════════════════════
        // BLOQUE 2 — VALORES POR DEFECTO (evaluación)
        // ════════════════════════════════════════════════════════════════
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

        // ════════════════════════════════════════════════════════════════
        // BLOQUE 3 — ASISTENCIA A LA SESIÓN (Institución → Personas) + VALIDADOR EDAD/DOCUMENTO
        // ════════════════════════════════════════════════════════════════
        ejecutarSeguro('Sesiones y validador', function autoSesion() {

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
            // Claves PROPIAS de este script (antes compartidas con otros scripts del mismo dominio)
            const KEY_HISTORIAL   = 'inst_auto_sesion_historial';
            const KEY_CONSECUTIVO = 'inst_auto_sesion_consecutivo';
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
            // El historial se SOBRESCRIBE con lo que hay actualmente en los campos de sesión,
            // para que sesiones viejas no se queden marcadas junto con la sesión nueva.
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
                const div = crearAviso('ok', `✔ Persona ${num}: con edad de ${edad} años el tipo de documento se cambió a "${nombre}".`, 'mensaje-autocorreccion');
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
                        campoEdad.parentNode.appendChild(
                            crearAviso('error', `⚠ Persona ${num}: con edad de ${edad} años debe usar "${docCorrecto}".`, 'mensaje-validacion'));
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

        }); // fin autoSesion

        // ════════════════════════════════════════════════════════════════
        // BLOQUE 4 — AUTOCOMPLETAR POR CÉDULA (Comprobador de Derechos + Supersalud)
        // Llena nombres, apellidos, fecha de nacimiento y sexo al digitar el documento.
        //  - Comprobador de Derechos: consulta solo por número (nombres, apellidos, fecha).
        //  - Supersalud: consulta con el código del tipo de documento; se usa para el sexo
        //    (y como respaldo de nombres/fecha), solo si el tipo de GESI está en la tabla.
        //  - El sexo de Supersalud solo se acepta si los apellidos coinciden con los del Comprobador.
        //  - Si no se logra el sexo, aparece un aviso debajo del campo Sexo.
        // ════════════════════════════════════════════════════════════════
        ejecutarSeguro('Autocompletar por cédula', function autocompletarPorCedula() {

            const BASE_COMPROBADOR = 'https://appb.saludcapital.gov.co/comprobadordederechos/';
            const BASE_SUPERSALUD = 'https://pqrdsuperargo.supersalud.gov.co/api/api/adres/';

            // value del tipo de documento en GESI -> código de tipo de documento en la URL de Supersalud.
            // Confirmados: CC 0, TI 1, RC 8, CE 2, PPT 13.
            // Si el tipo de GESI no está aquí (NUIP, Pasaporte, sin ID...), NO se consulta Supersalud.
            const TIPO_DOC_GESI_A_SUPERSALUD = {
                '59': '0',    // Cédula de Ciudadanía
                '61': '1',    // Tarjeta de Identidad
                '60': '8',    // Registro Civil
                '62': '2',    // Cédula de Extranjería
                '2482': '13', // PPT
            };

            // Código de sexo de Supersalud -> value del campo de sexo en GESI. 1 = Hombre, 2 = Mujer.
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
                quitarAvisos(CLASE_AVISO_SEXO);
            }

            function mostrarAvisoSexo(motivo) {
                quitarAvisoSexo();
                const campo = getCampo('sexo');
                if (!campo || !campo.parentNode) return;
                campo.parentNode.appendChild(crearAviso('error',
                    '⚠ No se pudo obtener el sexo automáticamente (' + motivo + '). Revíselo a mano: puede tener un valor anterior.',
                    CLASE_AVISO_SEXO));
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
        }); // fin autocompletarPorCedula

        // ════════════════════════════════════════════════════════════════
        // BLOQUE 5 — AVISO: EL TEMA NO ES OBLIGATORIO EN LAS LÍNEAS OPERATIVAS 5 Y 6
        // ════════════════════════════════════════════════════════════════
        ejecutarSeguro('Aviso tema opcional', function avisoTemaOpcional() {

            const LINEAS_SIN_TEMA = [5, 6];
            const CLASE_AVISO = 'aviso-tema-opcional';
            let logHecho = false;
            let campoLinea = null;
            let campoTema = null;

            function numeroLinea(campo) {
                if (!campo) return null;
                const texto = String(textoElegido(campo) || '').trim();
                const m = /^(?:l[ií]nea(?:\s+operativa)?\s*)?(\d+)(?!\d)/i.exec(texto) || /(\d+)/.exec(texto);
                let n = m ? parseInt(m[1], 10) : NaN;
                if (isNaN(n) && /^\d+$/.test(String(campo.value || '').trim())) n = parseInt(campo.value, 10);
                return LINEAS_SIN_TEMA.includes(n) ? n : null;
            }

            function evaluar() {
                // Los campos se guardan en caché mientras sigan en la página:
                // solo se vuelven a buscar si desaparecen o no se habían encontrado.
                if (!campoLinea || !campoLinea.isConnected) {
                    // La línea operativa se reconoce por sus opciones ("6 - Alta externalidad");
                    // si no aparece, se busca por ID (y por etiqueta como último recurso).
                    campoLinea =
                        Array.from(document.querySelectorAll('select'))
                            .find((s) => Array.from(s.options).some((o) => /alta externalidad/i.test(o.text)))
                        || localizarCampo(/^l[ií]nea\s+operativa|^linea\b/, 'linea_operativa');
                }
                if (!campoTema || !campoTema.isConnected) {
                    campoTema = localizarCampo(/^tema\b/, 'tema');
                }

                if (!logHecho && campoLinea) {
                    logHecho = true;
                    console.log('[Aviso tema] línea operativa:', campoLinea.id, '| tema:', campoTema ? campoTema.id : 'NO ENCONTRADO');
                }

                const n = numeroLinea(campoLinea);

                // Si no se ubica el Tema, se avisa igual (estaVacio(null) = true)
                if (!campoLinea || n === null || !estaVacio(campoTema)) {
                    quitarAvisos(CLASE_AVISO);
                    return;
                }

                sincronizarAviso(campoLinea, CLASE_AVISO, 'info',
                    `ℹ Línea operativa ${n}: el campo Tema no es obligatorio. Si no lo trae, puede dejarlo sin diligenciar.`);
            }

            vigilar(evaluar);
        }); // fin avisoTemaOpcional

        // ════════════════════════════════════════════════════════════════
        // BLOQUE 6 — BLOQUEAR "NOMBRE DEL GRUPO" (solo base Institucional)
        // Se identifica ÚNICAMENTE por su ID (IDS.nombre_grupo = valorControl18976).
        // No se usa la etiqueta: otras bases tienen un campo con el mismo nombre y no deben bloquearse.
        // ════════════════════════════════════════════════════════════════
        ejecutarSeguro('Bloqueo nombre del grupo', function bloquearNombreGrupo() {

            const ID_GRUPO = IDS.nombre_grupo;          // 'valorControl18976'
            if (!ID_GRUPO) return;

            // ID exacto, o el mismo ID seguido de un sufijo que NO empiece por dígito (ej. _1, -2)
            const reId = new RegExp('^' + ID_GRUPO + '(?![0-9])');

            function localizar() {
                const exacto = document.getElementById(ID_GRUPO);
                if (exacto) return exacto;
                return Array.from(document.querySelectorAll('[id^="' + ID_GRUPO + '"]'))
                    .find((el) => reId.test(el.id) && el.type !== 'hidden') || null;
            }

            function bloquear(campo) {
                if (campo.value !== '') {
                    if (campo.tagName === 'SELECT') campo.selectedIndex = 0; else campo.value = '';
                    campo.dispatchEvent(new Event('input', { bubbles: true }));
                    campo.dispatchEvent(new Event('change', { bubbles: true }));
                }
                if (campo.dataset.bloqueadoPorScript === '1') return;
                campo.dataset.bloqueadoPorScript = '1';
                console.log('[Nombre del grupo] bloqueado:', campo.id);
                campo.readOnly = true;
                campo.tabIndex = -1;
                campo.title = 'Este formato no lleva Nombre del grupo';
                Object.assign(campo.style, { backgroundColor: '#e0e0e0', cursor: 'not-allowed', pointerEvents: 'none' });
                campo.addEventListener('mousedown', (e) => e.preventDefault());
                campo.addEventListener('keydown', (e) => e.preventDefault());
            }

            let campoGrupo = null;
            function revisar() {
                if (!campoGrupo || !campoGrupo.isConnected) campoGrupo = localizar();
                if (campoGrupo) bloquear(campoGrupo);
            }

            setInterval(revisar, 700);
            revisar();
        }); // fin bloquearNombreGrupo

        // ════════════════════════════════════════════════════════════════
        // BLOQUE 7 — COHERENCIAS ENTRE CAMPOS
        //  a) Población diferencial = Discapacidad  →  la Categoría de discapacidad NO puede
        //     quedar vacía ni en "No aplica" (se marcan en rojo ambos campos y se avisa).
        //     Funciona con una o varias personas en la página (se emparejan por orden).
        //  b) Escala FIES: solo aplica desde los 65 años. Con edad menor:
        //     - si está vacía, se deja en "No aplica" automáticamente;
        //     - si tiene otro valor, se marca en rojo y se avisa (no se pisa lo digitado).
        //     La edad sale del campo Edad o, si no existe, de la fecha de nacimiento.
        // ════════════════════════════════════════════════════════════════
        ejecutarSeguro('Coherencias', function coherencias() {

            const CLASE_AVISO_DISCAP = 'aviso-discapacidad';
            const CLASE_AVISO_FIES = 'aviso-fies';
            const CATEGORIA_NO_APLICA = '3822';
            const EDAD_MINIMA_FIES = 65;
            let fiesEl = null;
            let logHecho = false;

            // "dd/mm/aaaa" o "aaaa-mm-dd" -> años cumplidos (NaN si no se entiende)
            function edadDesdeFecha(valor) {
                const s = String(valor || '').trim();
                let y, m, d, r;
                if ((r = /^(\d{4})-(\d{2})-(\d{2})/.exec(s))) { y = +r[1]; m = +r[2]; d = +r[3]; }
                else if ((r = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(s))) { d = +r[1]; m = +r[2]; y = +r[3]; }
                else return NaN;
                const hoy = new Date();
                let e = hoy.getFullYear() - y;
                if (hoy.getMonth() + 1 < m || (hoy.getMonth() + 1 === m && hoy.getDate() < d)) e--;
                return e >= 0 && e < 130 ? e : NaN;
            }

            function leerEdad() {
                const el = getEdad();
                const e = el ? parseInt(el.value, 10) : NaN;
                if (!isNaN(e)) return e;
                const f = getCampo('fecha') || document.querySelector('[id*="' + IDS.fecha + '"]');
                return f ? edadDesdeFecha(f.value) : NaN;
            }

            // ---- a) Discapacidad vs categoría ----
            function evaluarDiscapacidad() {
                const difs = Array.from(document.querySelectorAll('select[id*="' + IDS.pob_dif + '"]'));
                const cats = Array.from(document.querySelectorAll('select[id*="' + IDS.categoria_discapacidad + '"]'));
                const total = Math.min(difs.length, cats.length);

                for (let i = 0; i < total; i++) {
                    const dif = difs[i], cat = cats[i];
                    const t = sinTildes(textoElegido(dif));
                    const esDiscapacidad = /discapacidad/.test(t) && !/\b(sin|no)\b.*discapacidad/.test(t);
                    const incoherente = esDiscapacidad
                        && (estaVacio(cat) || esNoAplica(cat) || cat.value === CATEGORIA_NO_APLICA);

                    marcarIncoherente(dif, incoherente);
                    marcarIncoherente(cat, incoherente);
                    const quien = total > 1 ? `Persona ${i + 1}: ` : '';
                    sincronizarAviso(cat, CLASE_AVISO_DISCAP, 'error', incoherente
                        ? `⚠ ${quien}la Población diferencial es Discapacidad, así que la Categoría de discapacidad debe diligenciarse (no puede quedar en "No aplica").`
                        : '');
                }
            }

            // ---- b) FIES solo desde los 65 años ----
            function seleccionarNoAplica(campo) {
                if (campo.tagName !== 'SELECT') return false;
                const op = Array.from(campo.options).find((o) => esNoAplicaTexto(o.text));
                if (!op) return false;
                aplicar(campo, op.value);
                ['input', 'change'].forEach((ev) => campo.dispatchEvent(new Event(ev, { bubbles: true })));
                return true;
            }

            function evaluarFies() {
                if (!fiesEl || !fiesEl.isConnected) fiesEl = localizarCampo(/\bfies\b/, 'fies');
                const edad = leerEdad();

                if (!logHecho && fiesEl) {
                    logHecho = true;
                    console.log('[Coherencias] FIES:', fiesEl.id || fiesEl.name, '| edad actual:', isNaN(edad) ? 'NO ENCONTRADA' : edad);
                }

                if (!fiesEl || isNaN(edad) || edad >= EDAD_MINIMA_FIES) {
                    marcarIncoherente(fiesEl, false);
                    quitarAvisos(CLASE_AVISO_FIES);
                    return;
                }

                if (estaVacio(fiesEl)) {
                    seleccionarNoAplica(fiesEl); // la siguiente revisión ya la ve en "No aplica"
                    return;
                }

                const ok = esNoAplica(fiesEl);
                marcarIncoherente(fiesEl, !ok);
                sincronizarAviso(fiesEl, CLASE_AVISO_FIES, 'error', ok ? ''
                    : `⚠ La escala FIES aplica desde los ${EDAD_MINIMA_FIES} años y esta persona tiene ${edad}. Debe quedar en "No aplica".`);
            }

            vigilar(function () {
                ejecutarSeguro('Coherencia discapacidad', evaluarDiscapacidad);
                ejecutarSeguro('Coherencia FIES', evaluarFies);
            });
        }); // fin coherencias

        // ════════════════════════════════════════════════════════════════
        // BLOQUE 8 — VALORES POR DEFECTO DE TAMIZAJES
        // Si el campo OMS existe, se llena (solo si está vacío) y, al cambiarlo,
        // se llenan los demás campos de tamizajes que sigan vacíos.
        // ════════════════════════════════════════════════════════════════
        ejecutarSeguro('Valores por defecto tamizajes', function tamizajesPorDefecto() {

            const oms = document.querySelector('#' + IDS.oms);
            if (!oms) return;

            const DEFECTOS_TAMIZAJES = [
                ['valorControl19156', '4452'], // find
                ['valorControl19157', '4453'], // frecuencia cardíaca
                ['valorControl19158', '4454'], // tensión arterial
                ['valorControl19160', '4185'], // 10 a 17
                ['valorControl19161', '4232'], // 18
                ['valorControl19163', '4253'], // 40
                ['valorControl19164', '4191'], // ojo derecho
                ['valorControl19165', '4191'], // ojo izquierdo
                ['valorControl19167', '4235'], // oído derecho
                ['valorControl19168', '4235'], // oído izquierdo
                ['valorControl19170', '4457'], // intención reproductiva
                ['valorControl19171', '4457'], // satisfacción
                ['valorControl19172', '4258'], // cuidado menstrual
                ['valorControl19173', '4455'], // mini-cog
                ['valorControl19174', '4456'], // clasificación de riesgo
                ['valorControl19176', '4258'], // aplica tamizaje
                ['valorControl19180', '4272'], // escala FIES
                ['valorControl19182', '4458'], // enfrentar mejor
                ['valorControl19183', '4458'], // mejorar manejo
                ['valorControl19184', '4458'], // tomar mejores
                ['valorControl19186', '4460'], // mi bienestar
                ['valorControl19179', '4459'], // nutricional
            ];

            function aplicarDefectosTamizajes() {
                DEFECTOS_TAMIZAJES.forEach(([id, valor]) => asignarSiVacio(document.querySelector('#' + id), valor));
            }

            asignarSiVacio(oms, '4182');
            aplicarDefectosTamizajes();
            oms.addEventListener('change', aplicarDefectosTamizajes);
        }); // fin tamizajesPorDefecto

        // ════════════════════════════════════════════════════════════════
        // BLOQUE 9 — COMPROBADOR DOCUMENTOS PERSONAS vs TAMIZAJES
        // En Personas acumula los documentos digitados; en Tamizajes avisa si el
        // documento digitado no fue registrado en Personas.
        // ════════════════════════════════════════════════════════════════
        ejecutarSeguro('Comprobador documentos', function comprobadorDocumentos() {

            const ID_DOC_PERSONAS   = IDS.cedula;
            const ID_DOC_TAMIZAJES  = IDS.doc_tamizajes;
            // Claves PROPIAS de este script (para no chocar con otros scripts del mismo dominio)
            const KEY_DOCS_PERSONAS = 'inst_comprobador_docs_personas';
            const KEY_CONSECUTIVO   = 'inst_comprobador_consecutivo';

            function mostrarAviso(doc) {
                const previo = document.getElementById('comprobador-aviso');
                if (previo) previo.remove();
                const aviso = document.createElement('div');
                aviso.id = 'comprobador-aviso';
                aviso.style.cssText = `position:fixed;top:20px;right:20px;z-index:99999;background:#fff3cd;
                    border:2px solid #e0a800;border-radius:8px;padding:16px 20px;max-width:360px;
                    box-shadow:0 4px 12px rgba(0,0,0,0.2);font-family:Arial,sans-serif;font-size:13px;color:#333;`;
                aviso.innerHTML = `
                    <div style="font-weight:bold;font-size:14px;margin-bottom:10px;color:#c8700e;">⚠️ Documento no coincide</div>
                    <div style="padding:8px;background:#fff;border-radius:4px;border-left:3px solid red;">
                        El documento <strong><code class="comprobador-doc"></code></strong> en Tamizajes<br>
                        <span style="color:red">no fue registrado en la pestaña Personas.</span>
                    </div>
                    <button id="comprobador-cerrar" style="margin-top:10px;width:100%;padding:6px;
                        background:#e0a800;color:white;border:none;border-radius:4px;cursor:pointer;font-size:13px;">
                        ✖ Cerrar
                    </button>`;
                aviso.querySelector('.comprobador-doc').textContent = doc; // textContent: no interpreta HTML
                document.body.appendChild(aviso);
                document.getElementById('comprobador-cerrar').addEventListener('click', () => aviso.remove());
            }

            function obtenerDocs() {
                try { return JSON.parse(localStorage.getItem(KEY_DOCS_PERSONAS) || '[]'); } catch { return []; }
            }
            function guardarDocs(docs) { localStorage.setItem(KEY_DOCS_PERSONAS, JSON.stringify(docs)); }
            function limpiarStorage() {
                localStorage.removeItem(KEY_DOCS_PERSONAS);
                localStorage.removeItem(KEY_CONSECUTIVO);
            }

            function verificarFichaNueva() {
                const consecutivo = document.querySelector('[id*="Consecutivo"], [name*="consecutivo"], [id*="consecutivo"]');
                if (!consecutivo) return;
                const valorActual   = (consecutivo.value || consecutivo.textContent || '').trim();
                const valorGuardado = localStorage.getItem(KEY_CONSECUTIVO);
                if (valorGuardado && valorActual !== valorGuardado) limpiarStorage();
                if (valorActual) localStorage.setItem(KEY_CONSECUTIVO, valorActual);
            }

            function modoPersonas() {
                verificarFichaNueva();
                const campo = document.getElementById(ID_DOC_PERSONAS);
                if (!campo) return;
                function acumular() {
                    const val = campo.value.trim();
                    if (val === '') return;
                    const acumulado = new Set(obtenerDocs());
                    acumulado.add(val);
                    guardarDocs(Array.from(acumulado));
                }
                acumular();
                ['input', 'change', 'blur'].forEach(ev => campo.addEventListener(ev, acumular));
            }

            function modoTamizajes() {
                const campo = document.getElementById(ID_DOC_TAMIZAJES);
                if (!campo) return;

                // Guardar el valor que tenía al cargar la página
                const valorAlCargar = campo.value.trim();

                function verificarDoc() {
                    const doc = campo.value.trim();
                    if (doc === '') return;
                    const docs = obtenerDocs();
                    if (docs.length === 0) return;
                    campo.style.border = campo.style.background = '';
                    const previo = document.getElementById('comprobador-aviso');
                    if (previo) previo.remove();
                    if (!docs.includes(doc)) {
                        campo.style.border = '2px solid red';
                        campo.style.background = '#fff0f0';
                        mostrarAviso(doc);
                    }
                }

                // Solo verificar al cargar si el campo estaba vacío al inicio.
                // Si ya tenía valor, era una ficha existente — no mostrar aviso
                if (valorAlCargar === '') {
                    setTimeout(verificarDoc, 1200);
                }

                // Siempre verificar cuando el usuario escribe algo nuevo
                let timer = null;
                ['input', 'change', 'blur'].forEach(ev => {
                    campo.addEventListener(ev, () => {
                        // Solo verificar si el valor cambió respecto al que tenía al cargar
                        if (campo.value.trim() !== valorAlCargar) {
                            clearTimeout(timer);
                            timer = setTimeout(verificarDoc, 1500);
                        }
                    });
                });
            }

            function detectarYEjecutar() {
                if (document.getElementById(ID_DOC_PERSONAS)) modoPersonas();
                if (document.getElementById(ID_DOC_TAMIZAJES)) modoTamizajes();
            }

            if (document.readyState === 'complete') detectarYEjecutar();
            else window.addEventListener('load', detectarYEjecutar);

        }); // fin comprobadorDocumentos

        // ════════════════════════════════════════════════════════════════
        // BLOQUE 10 — VALIDACIONES: NOMBRES Y DOCUMENTO (sin fecha de intervención)
        //  - Nombres/apellidos: solo letras, espacios, apóstrofo y guion.
        //  - Documento: solo números (alfanumérico para tipos 65 y 66), con longitud
        //    de 6 a 10 (6 a 12 en alfanuméricos), validada al salir del campo.
        // ════════════════════════════════════════════════════════════════
        ejecutarSeguro('Validaciones nombres y documento', function addValidations() {
            const $  = s => document.querySelector(s);
            const $$ = s => document.querySelectorAll(s);

            const NAME_SELECTORS = ['#' + IDS.nombres, '#' + IDS.apellidos];
            const DOC_SELECTOR = '#' + IDS.cedula;
            const TIPO_DOC_SELECTOR = '#' + IDS.tipo_doc;
            const nameSanitizeRegex = /[^\p{L}\s'-]/gu;

            function attachNameFilters(selector) {
                Array.from($$(selector)).forEach(input => {
                    if (!input) return;
                    input.addEventListener('input', () => {
                        const old = input.value, cleaned = old.replace(nameSanitizeRegex, '');
                        if (old !== cleaned) {
                            input.value = cleaned; input.style.border = '2px solid #e6a0a0'; input.style.background = '#fff5f5';
                            clearTimeout(input._nameValidTimer);
                            input._nameValidTimer = setTimeout(() => { input.style.border = ''; input.style.background = ''; }, 1200);
                        }
                    });
                    input.addEventListener('keypress', ev => {
                        const ch = ev.key;
                        if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
                        if (ch.length === 1 && !ch.match(/[\p{L}\s'-]/u)) ev.preventDefault();
                    });
                    input.addEventListener('paste', ev => {
                        ev.preventDefault();
                        const text = (ev.clipboardData || window.clipboardData).getData('text') || '', cleaned = text.replace(nameSanitizeRegex, '');
                        input.setRangeText(cleaned, input.selectionStart || 0, input.selectionEnd || 0, 'end');
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                    });
                });
            }

            function attachDocFilter(selector, tipoDocSelector = TIPO_DOC_SELECTOR) {
                const input = $(selector);
                if (!input) return;

                const esAlfanumerico = () => {
                    const tipoDoc = $(tipoDocSelector);
                    return tipoDoc && ['65', '66'].includes(String(tipoDoc.value).trim());
                };

                input.addEventListener('input', () => {
                    const regex = esAlfanumerico() ? /[^\p{L}\p{N}]/gu : /[^\p{N}]/gu;
                    const old = input.value, cleaned = old.replace(regex, '');
                    if (old !== cleaned) input.value = cleaned;
                    input.style.border = ''; input.style.background = '';
                    const prev = input.parentNode ? input.parentNode.querySelector('.mensaje-doc') : null;
                    if (prev) prev.remove();
                });

                input.addEventListener('paste', ev => {
                    ev.preventDefault();
                    const regex = esAlfanumerico() ? /[^\p{L}\p{N}]/gu : /[^\p{N}]/gu;
                    const text = (ev.clipboardData || window.clipboardData).getData('text') || '', cleaned = text.replace(regex, '');
                    input.setRangeText(cleaned, input.selectionStart || 0, input.selectionEnd || 0, 'end');
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                });

                input.addEventListener('blur', () => {
                    const val = (input.value || '').trim(), esAlfa = esAlfanumerico(), min = 6, max = esAlfa ? 12 : 10;
                    const prev = input.parentNode ? input.parentNode.querySelector('.mensaje-doc') : null;
                    if (prev) prev.remove();
                    if (val.length === 0) return;
                    if (val.length < min || val.length > max) {
                        input.style.border = '2px solid red'; input.style.background = '#fff0f0';
                        if (input.parentNode) {
                            input.parentNode.appendChild(crearAviso('error',
                                `⚠ El documento debe tener entre ${min} y ${max} ${esAlfa ? 'caracteres' : 'números'} (actual: ${val.length}).`,
                                'mensaje-doc'));
                        }
                    }
                });

                const tipoDoc = $(tipoDocSelector);
                if (tipoDoc) {
                    tipoDoc.addEventListener('change', () => { input.dispatchEvent(new Event('input', { bubbles: true })); });
                }
            }

            function start() {
                NAME_SELECTORS.forEach((selector) => {
                    attachNameFilters(selector);
                });

                attachDocFilter(DOC_SELECTOR);
            }

            if (document.readyState === 'complete') start(); else window.addEventListener('load', start);
        }); // fin addValidations

    } // fin iniciar

    // ════════════════════════════════════════════════════════════════════
    // ARRANQUE CONDICIONADO
    // Base Institucional → arranca ya. Otra base → solo vigila (barato) por si
    // la página carga los campos más tarde; si nunca aparecen, no hace nada.
    // ════════════════════════════════════════════════════════════════════
    let iniciado = false;
    function intentarIniciar() {
        if (iniciado || !esBaseInstitucional()) return false;
        iniciado = true;
        console.log('[SESIONES INSTITUCIONAL] base Institucional detectada: script activado');
        iniciar();
        return true;
    }

    if (!intentarIniciar()) {
        let intentos = 0;
        const espera = setInterval(() => {
            intentos++;
            if (intentarIniciar() || intentos >= 40) clearInterval(espera); // máx. ~60 s
        }, 1500);
    }

})();
