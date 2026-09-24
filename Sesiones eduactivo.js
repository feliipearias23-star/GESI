// ==UserScript==
// @name         EDUCATIVO FULL HD
// @namespace    https://gesiapps.saludcapital.gov.co/GESI_sistemas/GESI_Form*
// @version      2026.09.24.4
// @description  Educativo: cascadas documento/sexo/género, sincronización de institución/sede, valores por defecto de tamizajes, sesiones (Institución→Personas), validador edad/documento, comprobador de documentos Personas↔Tamizajes, validaciones de nombres/documento y autocompletado por cédula (Comprobador de Derechos + Supersalud con código por tipo de documento, verificación y aviso de sexo)
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
    // CONFIGURACIÓN COMPARTIDA
    // ════════════════════════════════════════════════════════════════════
    const bgSuccess = "rgba(50, 200, 150, 0.2)";

    // IDs de los campos de la base Educativo (una sola tabla para todos los bloques)
    const IDS = {
        tipo_doc: 'valorControl17510',
        cedula: 'valorControl17511',        // también es el "documento" que se compara en el Bloque 5
        nombres: 'valorControl17508',
        apellidos: 'valorControl17509',
        sexo: 'valorControl17512',
        genero: 'valorControl17513',
        orientacion: 'valorControl17514',
        identidad_genero: 'valorControl17515',
        fecha: 'valorControl17516',
        pais: 'valorControl17517',
        etnia: 'valorControl17518',
        pob_dif: 'valorControl17520',
        Pob_inclusion: 'valorControl17521',
        categoria_discapacidad: 'valorControl17522',
        etapa_gestacion: 'valorControl17523',
        ocupacion: 'valorControl17524',
        rol_institucion: 'valorControl17525',
        listbox_asistencia: 'valorControl17526',
        canalizacion: 'valorControl17527',
        porquenosecanalizo: 'valorControl17528',
        oms: 'valorControl17534',
        doc_tamizajes: 'valorControl17533',
        edad: 'valorControl19845',
        nombreInstitucion: 'valorControl17347',
        daneColegio: 'valorControl17348',
        nombreSede: 'valorControl17349',
        daneSede: 'valorControl17350',
        barraFutbolera: 'valorControl17354',
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
    // BLOQUE 1 — DOCUMENTO / SEXO / GÉNERO (cascadas)
    // ════════════════════════════════════════════════════════════════════
    ejecutarSeguro('Documento/sexo/género', function () {
        const tipo_doc = getCampo('tipo_doc');
        const sexo = getCampo('sexo');
        const genero = getCampo('genero');
        const orientacion = getCampo('orientacion');
        const identidad_genero = getCampo('identidad_genero');
        const campos = {
            etnia: getCampo('etnia'),
            pais: getCampo('pais'),
            pob_dif: getCampo('pob_dif'),
            Pob_inclusion: getCampo('Pob_inclusion'),
            categoria_discapacidad: getCampo('categoria_discapacidad'),
            etapa_gestacion: getCampo('etapa_gestacion'),
            canalizacion: getCampo('canalizacion'),
            porquenosecanalizo: getCampo('porquenosecanalizo'),
            ocupacion: getCampo('ocupacion'),
            rol: getCampo('rol_institucion'),
        };

        // Al cambiar el tipo de documento: valores comunes de cada grupo
        const MAPA_DOC_A = {
            etnia: '84', pais: '50', pob_dif: '2620', Pob_inclusion: '4048',
            categoria_discapacidad: '3822', etapa_gestacion: '3785',
            canalizacion: '959', porquenosecanalizo: '4130', ocupacion: '902', rol: '4127',
        };
        // Extranjeros: mismos valores que el grupo A salvo país y población diferencial
        const MAPA_DOC_B = Object.assign({}, MAPA_DOC_A, { pais: '236', pob_dif: '4051' });

        let ultimoTipoDoc = tipo_doc ? tipo_doc.value : '';
        let ultimoSexo = sexo ? sexo.value : '';

        // Sin retardo, igual que el script original
        setInterval(function () {
            if (!tipo_doc || !sexo) return;

            const docActual = tipo_doc.value;
            const sexoActual = sexo.value;

            if (docActual !== ultimoTipoDoc) {
                ultimoTipoDoc = docActual;
                const v = parseInt(docActual, 10);
                // CC, RC, TI (nacionales): además pinta el propio campo de tipo de documento
                if ([59, 60, 61].includes(v)) {
                    tipo_doc.style.backgroundColor = bgSuccess;
                    aplicarMapa(campos, MAPA_DOC_A);
                }
                // CE, NUIP, Pasaporte, Adulto/Menor sin ID, PPT (extranjeros)
                if ([62, 63, 64, 65, 66, 2482, 1640, 1639].includes(v)) {
                    aplicarMapa(campos, MAPA_DOC_B);
                }
            }

            if (sexoActual !== ultimoSexo) {
                ultimoSexo = sexoActual;
                if (tipo_doc.value === '59') {
                    // Cédula de Ciudadanía → reglas de mayores
                    sexo.style.backgroundColor = bgSuccess;
                    if (sexoActual === '67') { aplicar(genero, '70'); aplicar(orientacion, '4024'); aplicar(identidad_genero, '4515'); }
                    else if (sexoActual === '68') { aplicar(genero, '71'); aplicar(orientacion, '4024'); aplicar(identidad_genero, '4514'); }
                } else if (sexoActual === '67' || sexoActual === '68') {
                    // Cualquier otro documento → reglas de menores
                    sexo.style.backgroundColor = bgSuccess;
                    aplicar(genero, '4513'); aplicar(orientacion, '4028'); aplicar(identidad_genero, '4020');
                }
            }
        });
    });

    // ════════════════════════════════════════════════════════════════════
    // BLOQUE 2 — SINCRONIZAR INSTITUCIÓN / SEDE (DANE) Y BARRA FUTBOLERA
    // ════════════════════════════════════════════════════════════════════
    ejecutarSeguro('Sincronizar institución', function () {
        const nombreInstitucion = getCampo('nombreInstitucion');
        const daneColegio = getCampo('daneColegio');
        const nombreSede = getCampo('nombreSede');
        const daneSede = getCampo('daneSede');
        const barraFutbolera = getCampo('barraFutbolera');
        const VALOR_BARRA_FUTBOLERA = '4116';

        function aplicarSelect2(select, opt) {
            const span = document.getElementById('select2-' + select.id + '-container');
            if (span) { span.textContent = opt.text; span.setAttribute('title', opt.text); }
            select.dispatchEvent(new Event('change', { bubbles: true }));
            select.style.backgroundColor = bgSuccess;
        }

        function setValorPorDane(select, dane) {
            if (!select || !dane) return;
            for (const opt of select.options) {
                if (opt.text.trim().startsWith(dane)) { select.value = opt.value; aplicarSelect2(select, opt); return; }
            }
            console.warn('❌ No se encontró DANE en:', select.id, dane);
        }

        function setValorDirecto(select, value) {
            if (!select || !value) return;
            const opt = select.querySelector('option[value="' + value + '"]');
            if (!opt) { console.warn('❌ No se encontró value en:', select.id, value); return; }
            select.value = value;
            aplicarSelect2(select, opt);
        }

        if (barraFutbolera) {
            setTimeout(() => setValorDirecto(barraFutbolera, VALOR_BARRA_FUTBOLERA), 1000);
        }

        if (nombreInstitucion) {
            setTimeout(() => {
                const spanObservable = document.getElementById('select2-' + IDS.nombreInstitucion + '-container');
                if (!spanObservable) return;
                let ultimoValor = '';
                new MutationObserver(() => {
                    const valActual = nombreInstitucion.value;
                    if (valActual && valActual !== '' && valActual !== ultimoValor) {
                        ultimoValor = valActual;
                        const option = nombreInstitucion.options[nombreInstitucion.selectedIndex];
                        const dane = (option ? option.text : '').split('-')[0].trim();
                        if (dane) {
                            setValorPorDane(daneColegio, dane);
                            setValorPorDane(nombreSede, dane);
                            setValorPorDane(daneSede, dane);
                        }
                        nombreInstitucion.style.backgroundColor = bgSuccess;
                    }
                }).observe(spanObservable, { childList: true, subtree: true, characterData: true });
            }, 1000);
        }
    });

    // ════════════════════════════════════════════════════════════════════
    // BLOQUE 3 — VALORES POR DEFECTO (tamizajes)
    // ════════════════════════════════════════════════════════════════════
    ejecutarSeguro('Valores por defecto tamizajes', function () {
        const oms = getCampo('oms');
        if (!oms) return;

        const campos = {
            find: document.querySelector('#valorControl17535'),
            frecuencia_cardiaca: document.querySelector('#valorControl17536'),
            tension_arterial: document.querySelector('#valorControl17537'),
            diezciciete: document.querySelector('#valorControl17539'),
            dieziocho: document.querySelector('#valorControl17540'),
            cuarenta: document.querySelector('#valorControl17541'),
            ojo_derecho: document.querySelector('#valorControl17543'),
            ojo_izquierdo: document.querySelector('#valorControl17544'),
            oido_derecho: document.querySelector('#valorControl17546'),
            oido_izquierdo: document.querySelector('#valorControl17547'),
            intencion_reproductiva: document.querySelector('#valorControl17549'),
            satisfaccion: document.querySelector('#valorControl17550'),
            cuidado_menstrual: document.querySelector('#valorControl17551'),
            mini_cog: document.querySelector('#valorControl17552'),
            clasificacion_riesgo: document.querySelector('#valorControl17553'),
            aplica_tamizaje: document.querySelector('#valorControl17555'),
            escala_fies: document.querySelector('#valorControl17559'),
            enfrentar_mejor: document.querySelector('#valorControl17561'),
            mejorar_manejo: document.querySelector('#valorControl17562'),
            tomar_mejores: document.querySelector('#valorControl17563'),
            mi_bienestar: document.querySelector('#valorControl17565'),
        };

        const VALORES_TAMIZAJE = {
            find: '4452', frecuencia_cardiaca: '4453', tension_arterial: '4454',
            diezciciete: '4185', dieziocho: '4232', cuarenta: '4253',
            ojo_derecho: '4191', ojo_izquierdo: '4191',
            oido_derecho: '4235', oido_izquierdo: '4235',
            intencion_reproductiva: '4457', satisfaccion: '4457',
            cuidado_menstrual: '4258', mini_cog: '4455', clasificacion_riesgo: '4456',
            aplica_tamizaje: '4258', escala_fies: '4272',
            enfrentar_mejor: '4458', mejorar_manejo: '4458', tomar_mejores: '4458',
            mi_bienestar: '4460',
        };

        const rellenarVacios = () => Object.keys(VALORES_TAMIZAJE).forEach((k) => asignarSiVacio(campos[k], VALORES_TAMIZAJE[k]));

        asignarSiVacio(oms, '4182');
        rellenarVacios();
        oms.addEventListener('change', rellenarVacios);
    });

    // ════════════════════════════════════════════════════════════════════
    // BLOQUE 4 — ASISTENCIA A LA SESIÓN (Institución → Personas, por botón) + VALIDADOR EDAD/DOCUMENTO
    // ════════════════════════════════════════════════════════════════════
    (function autoSesion() {

        const camposSesion = [
            { id: 'valorControl17387' },
            { id: 'valorControl17408' },
            { id: 'valorControl17428' },
            { id: 'valorControl17448' },
        ];
        const IDS_SESION = ['17387', '17408', '17428', '17448'];

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

        const ID_LISTBOX_BASE = IDS.listbox_asistencia;
        const KEY_HISTORIAL = 'auto_sesion_historial';
        const KEY_CONSECUTIVO = 'auto_sesion_consecutivo';
        const KEY_PUSO_SCRIPT = 'auto_sesion_puso_script';
        const KEY_QUITADOS = 'auto_sesion_quitados';
        const ID_EDAD = IDS.edad;
        const ID_DOCUMENTO = IDS.tipo_doc;
        const ID_BOTON_ACTUALIZAR = 'botonActualizarInformacion';

        const reglasDocumento = {
            '60': { nombre: 'Registro Civil',       edadMin: 0,  edadMax: 6   },
            '61': { nombre: 'Tarjeta de Identidad', edadMin: 7,  edadMax: 17  },
            '59': { nombre: 'Cédula de Ciudadanía', edadMin: 18, edadMax: 999 },
        };

        function obtenerHistorial() { try { return JSON.parse(localStorage.getItem(KEY_HISTORIAL) || '[]'); } catch (e) { return []; } }
        function obtenerPuestoScript() { try { return JSON.parse(localStorage.getItem(KEY_PUSO_SCRIPT) || '[]'); } catch (e) { return []; } }
        function obtenerQuitados() { try { return JSON.parse(localStorage.getItem(KEY_QUITADOS) || '[]'); } catch (e) { return []; } }

        function guardarHistorial(sesionesNuevas) {
            const combinado = [...new Set([...obtenerHistorial(), ...sesionesNuevas])];
            combinado.sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
            localStorage.setItem(KEY_HISTORIAL, JSON.stringify(combinado));
            console.log('Sesiones guardadas al actualizar:', combinado);
        }

        function limpiarHistorial() {
            [KEY_HISTORIAL, KEY_CONSECUTIVO, KEY_PUSO_SCRIPT, KEY_QUITADOS].forEach((k) => localStorage.removeItem(k));
        }

        function verificarFichaNueva() {
            const consecutivo = document.querySelector('[id*="Consecutivo"], [name*="consecutivo"], [id*="consecutivo"]');
            if (!consecutivo) return;
            const actual = (consecutivo.value || consecutivo.textContent || '').trim();
            const guardado = localStorage.getItem(KEY_CONSECUTIVO);
            if (guardado && actual !== guardado) limpiarHistorial();
            if (actual) localStorage.setItem(KEY_CONSECUTIVO, actual);
        }

        function leerSesionesActuales() {
            const sesiones = [];
            camposSesion.forEach(({ id }) => {
                const campo = document.getElementById(id);
                if (!campo) return;
                const valor = String(campo.value || '').trim();
                if (valor && mapaAsistencia[valor] && !sesiones.includes(valor)) sesiones.push(valor);
            });
            document.querySelectorAll('input').forEach((input) => {
                const valor = String(input.value || '').trim();
                const esSesion = IDS_SESION.some((id) => input.id.includes(id));
                if (esSesion && valor && mapaAsistencia[valor] && !sesiones.includes(valor)) sesiones.push(valor);
            });
            sesiones.sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
            return sesiones;
        }

        function modoInstitucion() {
            verificarFichaNueva();

            const boton = document.getElementById(ID_BOTON_ACTUALIZAR);
            if (boton && !boton.dataset.listenerSesiones) {
                boton.dataset.listenerSesiones = '1';
                boton.addEventListener('click', () => guardarHistorial(leerSesionesActuales()));
            }
            if (!boton) console.warn('No se encontró el botón de actualización:', ID_BOTON_ACTUALIZAR);

            const campos = [];
            camposSesion.forEach(({ id }) => { const campo = document.getElementById(id); if (campo) campos.push(campo); });
            document.querySelectorAll('input').forEach((input) => {
                const esSesion = IDS_SESION.some((id) => input.id.includes(id));
                if (esSesion && !campos.includes(input)) campos.push(input);
            });

            campos.forEach((campo) => {
                ['input', 'change', 'keyup'].forEach((evento) => {
                    campo.addEventListener(evento, () => {
                        console.log('Sesiones actuales, todavía sin guardar:', leerSesionesActuales());
                    });
                });
            });
        }

        function modoPersonas() {
            const historial = obtenerHistorial();
            if (!historial.length) { iniciarValidador(); return; }

            const valoresAMarcar = historial.map((s) => mapaAsistencia[String(s)]).filter(Boolean);
            const puestoScript = obtenerPuestoScript();
            obtenerQuitados(); // se conserva por compatibilidad con el historial existente

            const listboxes = Array.from(document.querySelectorAll('select')).filter((el) => el.id && el.id.includes(ID_LISTBOX_BASE));

            listboxes.forEach((listbox) => {
                const yaSeleccionados = Array.from(listbox.options).filter((op) => op.selected).map((op) => op.value);
                const noAsistioMarcados = Array.from(listbox.options).filter((op) => op.selected && op.text.includes('No asistió')).map((op) => op.value);

                let huboCambio = false;

                listbox.querySelectorAll('option').forEach((op) => {
                    if (yaSeleccionados.includes(op.value)) op.selected = true;

                    if (valoresAMarcar.includes(op.value) && !yaSeleccionados.includes(op.value)) {
                        const sesion = op.text.match(/S(\d+)/i)?.[1];
                        const existeNoAsistio = noAsistioMarcados.some((valor) => {
                            const opNo = listbox.querySelector(`option[value="${valor}"]`);
                            const sesionNo = opNo?.text.match(/S(\d+)/i)?.[1];
                            return sesion && sesionNo && sesion === sesionNo;
                        });
                        if (!existeNoAsistio) { op.selected = true; puestoScript.push(op.value); huboCambio = true; }
                    }
                });

                if (huboCambio) listbox.dispatchEvent(new Event('change', { bubbles: true }));
            });

            localStorage.setItem(KEY_PUSO_SCRIPT, JSON.stringify(puestoScript));
            iniciarValidador();
        }

        function iniciarValidador() {
            const camposEdad = document.querySelectorAll(`[id*="${ID_EDAD}"]`);
            const camposDoc = document.querySelectorAll(`[id*="${ID_DOCUMENTO}"]`);
            const total = Math.min(camposEdad.length, camposDoc.length);
            const ultimosEdad = Array(total).fill('');
            const ultimosDoc = Array(total).fill('');

            setInterval(() => {
                for (let i = 0; i < total; i++) {
                    const edad = camposEdad[i], doc = camposDoc[i];
                    if (!edad || !doc) continue;
                    if (edad.value !== ultimosEdad[i] || doc.value !== ultimosDoc[i]) {
                        ultimosEdad[i] = edad.value;
                        ultimosDoc[i] = doc.value;
                        validar(edad, doc, i + 1);
                    }
                }
            }, 400);

            for (let i = 0; i < total; i++) validar(camposEdad[i], camposDoc[i], i + 1);
        }

        // Persona -> "edad|documento" de la última corrección automática. Evita repetirla en bucle
        // si GESI devolviera el documento anterior; se olvida apenas la edad y el documento coinciden.
        const correccionesIntentadas = new Map();

        // Cambia el tipo de documento al que corresponde por la edad y avisa unos segundos
        function corregirTipoDocumento(campoEdad, campoDoc, valor, nombre, edad, num) {
            if (campoDoc.tagName === 'SELECT' && !Array.from(campoDoc.options).some((o) => o.value === valor)) return false;
            campoDoc.value = valor;
            ['input', 'change'].forEach((ev) => campoDoc.dispatchEvent(new Event(ev, { bubbles: true })));
            const previo = campoEdad.parentNode.querySelector('.mensaje-autocorreccion');
            if (previo) previo.remove();
            const div = document.createElement('div');
            div.className = 'mensaje-autocorreccion';
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
            const documento = campoDoc.value;

            campoEdad.style.border = campoEdad.style.background = '';
            campoDoc.style.border = campoDoc.style.background = '';

            const anterior = campoEdad.parentNode.querySelector('.mensaje-validacion');
            if (anterior) anterior.remove();

            if (Number.isNaN(edad) || !documento || !reglasDocumento[documento]) { correccionesIntentadas.delete(num); return; }

            const regla = reglasDocumento[documento];
            if (edad < regla.edadMin || edad > regla.edadMax) {
                let documentoCorrecto = 'Desconocido';
                let documentoCorrectoValor = null;
                for (const [valor, reglaActual] of Object.entries(reglasDocumento)) {
                    if (edad >= reglaActual.edadMin && edad <= reglaActual.edadMax) { documentoCorrecto = reglaActual.nombre; documentoCorrectoValor = valor; break; }
                }

                // Corrección automática: se cambia el tipo de documento al que corresponde por la edad
                const clave = edad + '|' + documento;
                if (documentoCorrectoValor && correccionesIntentadas.get(num) !== clave) {
                    correccionesIntentadas.set(num, clave);
                    if (corregirTipoDocumento(campoEdad, campoDoc, documentoCorrectoValor, documentoCorrecto, edad, num)) return;
                }

                [campoEdad, campoDoc].forEach((c) => { c.style.border = '2px solid red'; c.style.background = '#fff0f0'; });
                if (!campoEdad.parentNode.querySelector('.mensaje-validacion')) {
                    const mensaje = document.createElement('div');
                    mensaje.className = 'mensaje-validacion';
                    mensaje.textContent = `⚠ Persona ${num}: con ${edad} años debe usar "${documentoCorrecto}".`;
                    Object.assign(mensaje.style, { color: '#b30000', background: '#ffe6e6', padding: '6px',
                        marginTop: '4px', border: '1px solid #ff9999', borderRadius: '4px', fontSize: '12px' });
                    campoEdad.parentNode.appendChild(mensaje);
                }
            } else {
                correccionesIntentadas.delete(num);
            }
        }

        function detectarYEjecutar() {
            const enInstitucion = camposSesion.some(({ id }) => document.getElementById(id));
            const tieneValidador = document.querySelector(`[id*="${ID_EDAD}"]`);
            if (enInstitucion) modoInstitucion();
            if (tieneValidador) setTimeout(modoPersonas, 800);
        }

        if (document.readyState === 'complete') detectarYEjecutar();
        else window.addEventListener('load', detectarYEjecutar);

    })(); // fin autoSesion

    // ════════════════════════════════════════════════════════════════════
    // BLOQUE 5 — COMPROBADOR DE DOCUMENTOS: Personas vs Tamizajes
    // Avisa si el documento digitado en Tamizajes no fue registrado en Personas
    // ════════════════════════════════════════════════════════════════════
    (function comprobadorDocumentos() {

        const ID_DOC_PERSONAS = IDS.cedula;
        const ID_DOC_TAMIZAJES = IDS.doc_tamizajes;
        const KEY_DOCS_PERSONAS = 'comprobador_docs_personas';
        const KEY_CONSECUTIVO = 'comprobador_consecutivo';

        function mostrarAviso(doc) {
            const previo = document.getElementById('comprobador-aviso');
            if (previo) previo.remove();
            const aviso = document.createElement('div');
            aviso.id = 'comprobador-aviso';
            aviso.style.cssText = 'position:fixed;top:20px;right:20px;z-index:99999;background:#fff3cd;border:2px solid #e0a800;border-radius:8px;padding:16px 20px;max-width:360px;box-shadow:0 4px 12px rgba(0,0,0,0.2);font-family:Arial,sans-serif;font-size:13px;color:#333;';
            aviso.innerHTML = '<div style="font-weight:bold;font-size:14px;margin-bottom:10px;color:#c8700e;">⚠️ Documento no coincide</div>'
                + '<div style="padding:8px;background:#fff;border-radius:4px;border-left:3px solid red;">El documento <strong><code>' + doc + '</code></strong> en Tamizajes<br><span style="color:red">no fue registrado en la pestaña Personas.</span></div>'
                + '<button id="comprobador-cerrar" style="margin-top:10px;width:100%;padding:6px;background:#e0a800;color:white;border:none;border-radius:4px;cursor:pointer;font-size:13px;">✖ Cerrar</button>';
            document.body.appendChild(aviso);
            document.getElementById('comprobador-cerrar').addEventListener('click', () => aviso.remove());
        }

        const obtenerDocs = () => { try { return JSON.parse(localStorage.getItem(KEY_DOCS_PERSONAS) || '[]'); } catch (e) { return []; } };
        const guardarDocs = (docs) => localStorage.setItem(KEY_DOCS_PERSONAS, JSON.stringify(docs));
        const limpiarStorage = () => { localStorage.removeItem(KEY_DOCS_PERSONAS); localStorage.removeItem(KEY_CONSECUTIVO); };

        function verificarFichaNueva() {
            const consecutivo = document.querySelector('[id*="Consecutivo"], [name*="consecutivo"], [id*="consecutivo"]');
            if (!consecutivo) return;
            const valorActual = (consecutivo.value || consecutivo.textContent || '').trim();
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
            ['input', 'change', 'blur'].forEach((ev) => campo.addEventListener(ev, acumular));
        }

        function modoTamizajes() {
            const campo = document.getElementById(ID_DOC_TAMIZAJES);
            if (!campo) return;
            const valorAlCargar = campo.value.trim();

            function verificarDoc() {
                const doc = campo.value.trim();
                if (doc === '') return;
                const docs = obtenerDocs();
                if (docs.length === 0) return;
                campo.style.border = campo.style.background = '';
                const previo = document.getElementById('comprobador-aviso');
                if (previo) previo.remove();
                if (!docs.includes(doc)) { campo.style.border = '2px solid red'; campo.style.background = '#fff0f0'; mostrarAviso(doc); }
            }

            if (valorAlCargar === '') setTimeout(verificarDoc, 1200);
            let timer = null;
            ['input', 'change', 'blur'].forEach((ev) => campo.addEventListener(ev, () => {
                if (campo.value.trim() !== valorAlCargar) { clearTimeout(timer); timer = setTimeout(verificarDoc, 1500); }
            }));
        }

        function detectarYEjecutar() {
            if (document.getElementById(ID_DOC_PERSONAS)) modoPersonas();
            if (document.getElementById(ID_DOC_TAMIZAJES)) modoTamizajes();
        }

        if (document.readyState === 'complete') detectarYEjecutar();
        else window.addEventListener('load', detectarYEjecutar);

    })(); // fin comprobadorDocumentos

    // ════════════════════════════════════════════════════════════════════
    // BLOQUE 6 — VALIDACIONES: NOMBRES (solo letras) Y DOCUMENTO (longitud según tipo)
    // ════════════════════════════════════════════════════════════════════
    ejecutarSeguro('Validaciones nombres/documento', function () {
        const NAME_SELECTORS = ['#' + IDS.nombres, '#' + IDS.apellidos];
        const DOC_SELECTOR = '#' + IDS.cedula;
        const TIPO_DOC_SELECTOR = '#' + IDS.tipo_doc;
        const nameSanitizeRegex = /[^\p{L}\s'-]/gu;

        function attachNameFilters(selector) {
            Array.from(document.querySelectorAll(selector)).forEach((input) => {
                if (!input) return;
                input.addEventListener('input', () => {
                    const old = input.value, cleaned = old.replace(nameSanitizeRegex, '');
                    if (old !== cleaned) {
                        input.value = cleaned; input.style.border = '2px solid #e6a0a0'; input.style.background = '#fff5f5';
                        clearTimeout(input._nameValidTimer);
                        input._nameValidTimer = setTimeout(() => { input.style.border = ''; input.style.background = ''; }, 1200);
                    }
                });
                input.addEventListener('keypress', (ev) => {
                    const ch = ev.key;
                    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
                    if (ch.length === 1 && !ch.match(/[\p{L}\s'-]/u)) ev.preventDefault();
                });
                input.addEventListener('paste', (ev) => {
                    ev.preventDefault();
                    const text = (ev.clipboardData || window.clipboardData).getData('text') || '', cleaned = text.replace(nameSanitizeRegex, '');
                    input.setRangeText(cleaned, input.selectionStart || 0, input.selectionEnd || 0, 'end');
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                });
            });
        }

        function attachDocFilter(selector, tipoDocSelector) {
            const input = document.querySelector(selector);
            if (!input) return;

            const esAlfanumerico = () => {
                const tipoDoc = document.querySelector(tipoDocSelector);
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

            input.addEventListener('paste', (ev) => {
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
                    const div = document.createElement('div');
                    div.className = 'mensaje-doc';
                    div.textContent = `⚠ El documento debe tener entre ${min} y ${max} ${esAlfa ? 'caracteres' : 'números'} (actual: ${val.length}).`;
                    Object.assign(div.style, { color: '#b30000', background: '#ffe6e6', padding: '6px', marginTop: '4px', border: '1px solid #ff9999', borderRadius: '4px', fontSize: '12px' });
                    if (input.parentNode) input.parentNode.appendChild(div);
                }
            });

            const tipoDoc = document.querySelector(tipoDocSelector);
            if (tipoDoc) tipoDoc.addEventListener('change', () => input.dispatchEvent(new Event('input', { bubbles: true })));
        }

        function iniciar() {
            NAME_SELECTORS.forEach((selector) => attachNameFilters(selector));
            attachDocFilter(DOC_SELECTOR, TIPO_DOC_SELECTOR);
        }

        if (document.readyState === 'complete') iniciar();
        else window.addEventListener('load', iniciar);
    });

    // ════════════════════════════════════════════════════════════════════
    // BLOQUE 7 — AUTOCOMPLETAR POR CÉDULA (Comprobador de Derechos + Supersalud)
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
        // Si el tipo de GESI no está aquí (NUIP, Pasaporte, sin ID, 1640, 1639...), NO se consulta Supersalud.
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
            if (running) { schedule(); return; }

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

})();
