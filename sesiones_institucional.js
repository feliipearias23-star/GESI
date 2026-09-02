// ==UserScript==
// @name         SESIONES INSTITUCIONAL V3
// @namespace    https://gesiapps.saludcapital.gov.co/GESI_sistemas/GESI_Form*
// @version      2025-06-20
// @description  try to take over the world!
// @author       You
// @match        https://gesiapps.saludcapital.gov.co/GESI_sistemas/GESI_Form*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    let bgSuccess = "rgba(50, 200, 150, 0.2)";

    try{
        let tipo_doc = document.querySelector('#valorControl19131');
        let sexo = document.querySelector('#valorControl19133');
        let genero = document.querySelector('#valorControl19134');
        let orientacion = document.querySelector('#valorControl19135');
        let identidad_genero = document.querySelector('#valorControl19136');
        let etnia = document.querySelector('#valorControl19139');
        let pais = document.querySelector('#valorControl19138');
        let pob_dif = document.querySelector('#valorControl19141');
        let Pob_inclusion = document.querySelector('#valorControl19142');
        let categoria_discapacidad = document.querySelector('#valorControl19143');
        let etapa_gestacion = document.querySelector('#valorControl19144');
        let canalizacion = document.querySelector('#valorControl19148');
        let porquenosecanalizo = document.querySelector('#valorControl19149');
        let ocupacion = document.querySelector('#valorControl19145');
        let rol_institucion = document.querySelector('#valorControl19146');

        if(ocupacion.value == ""){
            ocupacion.value = '903';
            ocupacion.style.backgroundColor = bgSuccess;
        };
        if(rol_institucion.value == ""){
            rol_institucion.value = '4120';
            rol_institucion.style.backgroundColor = bgSuccess;
        };

        // Asigna un valor SOLO si el campo está vacío, para no pisar una selección manual del usuario
        function asignarSiVacio(campo, valor) {
            if (campo && campo.value === "") {
                campo.value = valor;
                campo.style.backgroundColor = bgSuccess;
            }
        }

        tipo_doc.addEventListener('change', function(){
            if ([59, 60, 61].includes(parseInt(tipo_doc.value,10))){
                tipo_doc.style.backgroundColor = bgSuccess;
                asignarSiVacio(etnia, '84');
                asignarSiVacio(pais, '50');
                asignarSiVacio(pob_dif, '2620');
                asignarSiVacio(Pob_inclusion, '4048');
                asignarSiVacio(categoria_discapacidad, '3822');
                asignarSiVacio(etapa_gestacion, '3785');
                asignarSiVacio(canalizacion, '959');
                asignarSiVacio(porquenosecanalizo, '4129');
            }
        });
        tipo_doc.addEventListener('change', function(){
            if ([62, 63, 64, 65, 66, 2482, 1640, ].includes(parseInt(tipo_doc.value,10))){
                asignarSiVacio(etnia, '84');
                asignarSiVacio(pais, '236');
                asignarSiVacio(pob_dif, '4051');
            }
        });
        sexo.addEventListener('change', function(){
            if(sexo.value == "67" || sexo.value == "68"){
                sexo.style.backgroundColor = bgSuccess;

                const docActual = parseInt(tipo_doc.value, 10);
                const esCC      = docActual === 59;
                const esTIoRC   = [60, 61].includes(docActual);

                if (esCC) {
                    if (sexo.value == "67") {
                        // Hombre
                        asignarSiVacio(genero, '70');
                        asignarSiVacio(identidad_genero, '4515');
                    } else if (sexo.value == "68") {
                        // Mujer
                        asignarSiVacio(genero, '71');
                        asignarSiVacio(identidad_genero, '4514');
                    }
                    asignarSiVacio(orientacion, '4024');
                } else if (esTIoRC) {
                    asignarSiVacio(genero, '4513');
                    asignarSiVacio(orientacion, '4028');
                    asignarSiVacio(identidad_genero, '4020');
                }
            };
        });

    } catch (error){
        console.error(error)
    };
     try {
            let oms                    = document.querySelector('#valorControl19155');
            let find                   = document.querySelector('#valorControl19156');
            let frecuencia_cardiaca    = document.querySelector('#valorControl19157');
            let tension_arterial       = document.querySelector('#valorControl19158');
            let diezciciete            = document.querySelector('#valorControl19160');
            let dieziocho              = document.querySelector('#valorControl19161');
            let cuarenta               = document.querySelector('#valorControl19163');
            let ojo_derecho            = document.querySelector('#valorControl19164');
            let ojo_izquierdo          = document.querySelector('#valorControl19165');
            let oido_derecho           = document.querySelector('#valorControl19167');
            let oido_izquierdo         = document.querySelector('#valorControl19168');
            let intencion_reproductiva = document.querySelector('#valorControl19170');
            let satisfaccion           = document.querySelector('#valorControl19171');
            let cuidado_menstrual      = document.querySelector('#valorControl19172');
            let mini_cog               = document.querySelector('#valorControl19173');
            let clasificacion_riesgo   = document.querySelector('#valorControl19174');
            let aplica_tamizaje        = document.querySelector('#valorControl19176');
            let escala_fies            = document.querySelector('#valorControl19180');
            let enfrentar_mejor        = document.querySelector('#valorControl19182');
            let mejorar_manejo         = document.querySelector('#valorControl19183');
            let tomar_mejores          = document.querySelector('#valorControl19184');
            let mi_bienestar           = document.querySelector('#valorControl19186');
            let nutricional            = document.querySelector('#valorControl19179');
            if (oms) {
                if (oms.value == "")                                              { oms.value = "4182";  oms.style.backgroundColor = bgSuccess; }
                if (find && find.value == "")                                     { find.value = "4452";                find.style.backgroundColor = bgSuccess; }
                if (frecuencia_cardiaca && frecuencia_cardiaca.value == "")       { frecuencia_cardiaca.value = "4453"; frecuencia_cardiaca.style.backgroundColor = bgSuccess; }
                if (tension_arterial && tension_arterial.value == "")             { tension_arterial.value = "4454";   tension_arterial.style.backgroundColor = bgSuccess; }
                if (diezciciete && diezciciete.value == "")                       { diezciciete.value = "4185";        diezciciete.style.backgroundColor = bgSuccess; }
                if (dieziocho && dieziocho.value == "")                           { dieziocho.value = "4232";          dieziocho.style.backgroundColor = bgSuccess; }
                if (cuarenta && cuarenta.value == "")                             { cuarenta.value = "4253";           cuarenta.style.backgroundColor = bgSuccess; }
                if (ojo_derecho && ojo_derecho.value == "")                       { ojo_derecho.value = "4191";        ojo_derecho.style.backgroundColor = bgSuccess; }
                if (ojo_izquierdo && ojo_izquierdo.value == "")                   { ojo_izquierdo.value = "4191";      ojo_izquierdo.style.backgroundColor = bgSuccess; }
                if (oido_derecho && oido_derecho.value == "")                     { oido_derecho.value = "4235";       oido_derecho.style.backgroundColor = bgSuccess; }
                if (oido_izquierdo && oido_izquierdo.value == "")                 { oido_izquierdo.value = "4235";     oido_izquierdo.style.backgroundColor = bgSuccess; }
                if (intencion_reproductiva && intencion_reproductiva.value == "") { intencion_reproductiva.value = "4457"; intencion_reproductiva.style.backgroundColor = bgSuccess; }
                if (satisfaccion && satisfaccion.value == "")                     { satisfaccion.value = "4457";       satisfaccion.style.backgroundColor = bgSuccess; }
                if (cuidado_menstrual && cuidado_menstrual.value == "")           { cuidado_menstrual.value = "4258";  cuidado_menstrual.style.backgroundColor = bgSuccess; }
                if (mini_cog && mini_cog.value == "")                             { mini_cog.value = "4455";           mini_cog.style.backgroundColor = bgSuccess; }
                if (clasificacion_riesgo && clasificacion_riesgo.value == "")     { clasificacion_riesgo.value = "4456"; clasificacion_riesgo.style.backgroundColor = bgSuccess; }
                if (aplica_tamizaje && aplica_tamizaje.value == "")               { aplica_tamizaje.value = "4258";    aplica_tamizaje.style.backgroundColor = bgSuccess; }
                if (escala_fies && escala_fies.value == "")                       { escala_fies.value = "4272";        escala_fies.style.backgroundColor = bgSuccess; }
                if (enfrentar_mejor && enfrentar_mejor.value == "")               { enfrentar_mejor.value = "4458";    enfrentar_mejor.style.backgroundColor = bgSuccess; }
                if (mejorar_manejo && mejorar_manejo.value == "")                 { mejorar_manejo.value = "4458";     mejorar_manejo.style.backgroundColor = bgSuccess; }
                if (tomar_mejores && tomar_mejores.value == "")                   { tomar_mejores.value = "4458";      tomar_mejores.style.backgroundColor = bgSuccess; }
                if (mi_bienestar && mi_bienestar.value == "")                     { mi_bienestar.value = "4460";       mi_bienestar.style.backgroundColor = bgSuccess; }
                if (nutricional && nutricional.value == "")                       {nutricional.value = "4459";         nutricional.style.backgroundColor = bgSuccess; }


                oms.addEventListener('change', function() {
                    if (find && find.value == "")                                     { find.value = "4452";                find.style.backgroundColor = bgSuccess; }
                    if (frecuencia_cardiaca && frecuencia_cardiaca.value == "")       { frecuencia_cardiaca.value = "4453"; frecuencia_cardiaca.style.backgroundColor = bgSuccess; }
                    if (tension_arterial && tension_arterial.value == "")             { tension_arterial.value = "4454";   tension_arterial.style.backgroundColor = bgSuccess; }
                    if (diezciciete && diezciciete.value == "")                       { diezciciete.value = "4185";        diezciciete.style.backgroundColor = bgSuccess; }
                    if (dieziocho && dieziocho.value == "")                           { dieziocho.value = "4232";          dieziocho.style.backgroundColor = bgSuccess; }
                    if (cuarenta && cuarenta.value == "")                             { cuarenta.value = "4253";           cuarenta.style.backgroundColor = bgSuccess; }
                    if (ojo_derecho && ojo_derecho.value == "")                       { ojo_derecho.value = "4191";        ojo_derecho.style.backgroundColor = bgSuccess; }
                    if (ojo_izquierdo && ojo_izquierdo.value == "")                   { ojo_izquierdo.value = "4191";      ojo_izquierdo.style.backgroundColor = bgSuccess; }
                    if (oido_derecho && oido_derecho.value == "")                     { oido_derecho.value = "4235";       oido_derecho.style.backgroundColor = bgSuccess; }
                    if (oido_izquierdo && oido_izquierdo.value == "")                 { oido_izquierdo.value = "4235";     oido_izquierdo.style.backgroundColor = bgSuccess; }
                    if (intencion_reproductiva && intencion_reproductiva.value == "") { intencion_reproductiva.value = "4457"; intencion_reproductiva.style.backgroundColor = bgSuccess; }
                    if (satisfaccion && satisfaccion.value == "")                     { satisfaccion.value = "4457";       satisfaccion.style.backgroundColor = bgSuccess; }
                    if (cuidado_menstrual && cuidado_menstrual.value == "")           { cuidado_menstrual.value = "4258";  cuidado_menstrual.style.backgroundColor = bgSuccess; }
                    if (mini_cog && mini_cog.value == "")                             { mini_cog.value = "4455";           mini_cog.style.backgroundColor = bgSuccess; }
                    if (clasificacion_riesgo && clasificacion_riesgo.value == "")     { clasificacion_riesgo.value = "4456"; clasificacion_riesgo.style.backgroundColor = bgSuccess; }
                    if (aplica_tamizaje && aplica_tamizaje.value == "")               { aplica_tamizaje.value = "4258";    aplica_tamizaje.style.backgroundColor = bgSuccess; }
                    if (escala_fies && escala_fies.value == "")                       { escala_fies.value = "4272";        escala_fies.style.backgroundColor = bgSuccess; }
                    if (enfrentar_mejor && enfrentar_mejor.value == "")               { enfrentar_mejor.value = "4458";    enfrentar_mejor.style.backgroundColor = bgSuccess; }
                    if (mejorar_manejo && mejorar_manejo.value == "")                 { mejorar_manejo.value = "4458";     mejorar_manejo.style.backgroundColor = bgSuccess; }
                    if (tomar_mejores && tomar_mejores.value == "")                   { tomar_mejores.value = "4458";      tomar_mejores.style.backgroundColor = bgSuccess; }
                    if (mi_bienestar && mi_bienestar.value == "")                     { mi_bienestar.value = "4460";       mi_bienestar.style.backgroundColor = bgSuccess; }
                    if (nutricional && nutricional.value == "")                       {nutricional.value = "4459";         nutricional.style.backgroundColor = bgSuccess; }

                });
            }

        } catch (error) {
            console.error(error);
        }

    })();

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
        const ID_EDAD         = 'valorControl19954';
        const ID_DOCUMENTO    = 'valorControl19131';
        const IDS_SESION      = ['19008', '19029', '19049', '19069'];

        const reglasDocumento = {
            '60': { nombre: 'Registro Civil',       edadMin: 0,  edadMax: 6   },
            '61': { nombre: 'Tarjeta de Identidad', edadMin: 7,  edadMax: 17  },
            '59': { nombre: 'Cédula de Ciudadanía', edadMin: 18, edadMax: 999 },
        };

        // Normaliza el número de sesión: cualquier valor mayor a 30 se trata como 30
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

        function validar(campoEdad, campoDoc, num) {
            if (!campoEdad || !campoDoc) return;
            const edad = parseInt(campoEdad.value, 10);
            const docValue = campoDoc.value;
            campoEdad.style.border = campoEdad.style.background = '';
            campoDoc.style.border  = campoDoc.style.background  = '';
            const prev = campoEdad.parentNode.querySelector('.mensaje-validacion');
            if (prev) prev.remove();
            if (isNaN(edad) || !docValue || !reglasDocumento[docValue]) return;
            const regla = reglasDocumento[docValue];
            if (edad < regla.edadMin || edad > regla.edadMax) {
                let docCorrecto = 'Desconocido';
                for (const r of Object.values(reglasDocumento)) {
                    if (edad >= r.edadMin && edad <= r.edadMax) { docCorrecto = r.nombre; break; }
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
    // SCRIPT 3 — COMPROBADOR DOCUMENTOS PERSONAS vs TAMIZAJES
    // ════════════════════════════════════════════════════════════════════

     (function comprobadorDocumentos() {

        const ID_DOC_PERSONAS   = 'valorControl19132';
        const ID_DOC_TAMIZAJES  = 'valorControl19154';
        const KEY_DOCS_PERSONAS = 'comprobador_docs_personas';
        const KEY_CONSECUTIVO   = 'comprobador_consecutivo';

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
                    El documento <strong><code>${doc}</code></strong> en Tamizajes<br>
                    <span style="color:red">no fue registrado en la pestaña Personas.</span>
                </div>
                <button id="comprobador-cerrar" style="margin-top:10px;width:100%;padding:6px;
                    background:#e0a800;color:white;border:none;border-radius:4px;cursor:pointer;font-size:13px;">
                    ✖ Cerrar
                </button>`;
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

            // Solo verificar al cargar si el campo estaba vacío al inicio
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

    })(); // fin comprobadorDocumentos
