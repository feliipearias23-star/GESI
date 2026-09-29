// ==UserScript==
// @name         SESIONES INSTITUCIONAL V8
// @namespace    https://gesiapps.saludcapital.gov.co/GESI_sistemas/GESI_Form*
// @version      2025-09-28
// @description  Autocompletado, Asistencia a la Sesión, Comprobador, Aviso Líneas 5/6 y Validaciones
// @author       You
// @match        https://gesiapps.saludcapital.gov.co/GESI_sistemas/GESI_Form*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    let bgSuccess = "rgba(50, 200, 150, 0.2)";

    // ════════════════════════════════════════════════════════════════════
    // BLOQUE 1 — AUTOCOMPLETADO DE CAMPOS BÁSICOS
    // ════════════════════════════════════════════════════════════════════
    try {
        let tipo_doc = document.querySelector('#valorControl19131'),
            sexo = document.querySelector('#valorControl19133'),
            genero = document.querySelector('#valorControl19134'),
            orientacion = document.querySelector('#valorControl19135'),
            identidad_genero = document.querySelector('#valorControl19136'),
            etnia = document.querySelector('#valorControl19139'),
            pais = document.querySelector('#valorControl19138'),
            pob_dif = document.querySelector('#valorControl19141'),
            Pob_inclusion = document.querySelector('#valorControl19142'),
            categoria_discapacidad = document.querySelector('#valorControl19143'),
            etapa_gestacion = document.querySelector('#valorControl19144'),
            canalizacion = document.querySelector('#valorControl19148'),
            porquenosecanalizo = document.querySelector('#valorControl19149'),
            ocupacion = document.querySelector('#valorControl19145'),
            rol = document.querySelector('#valorControl19146');

        let ultimoTipoDoc = tipo_doc ? tipo_doc.value : '',
            ultimoSexo = sexo ? sexo.value : '';

        const set = (el, v) => {
            if (el) {
                el.value = v;
                el.style.backgroundColor = bgSuccess;
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
            }
        };

        const elems = { etnia, pais, pob_dif, Pob_inclusion, categoria_discapacidad, etapa_gestacion, canalizacion, porquenosecanalizo, ocupacion, rol };
        const mapaDocA = { etnia: '84', pais: '50', pob_dif: '2620', Pob_inclusion: '4048', categoria_discapacidad: '3822', etapa_gestacion: '3785', canalizacion: '959', porquenosecanalizo: '4129', ocupacion: '903', rol: '4120' };
        const mapaDocB = { ...mapaDocA, pais: '236', pob_dif: '4051', canalizacion: '', porquenosecanalizo: '' };

        const aplicarMapa = mapa => {
            for (const k in mapa) set(elems[k], mapa[k]);
        };

        setInterval(function() {
            if (!tipo_doc || !sexo) {
                tipo_doc = document.querySelector('#valorControl19131');
                sexo = document.querySelector('#valorControl19133');
                genero = document.querySelector('#valorControl19134');
                orientacion = document.querySelector('#valorControl19135');
                identidad_genero = document.querySelector('#valorControl19136');
                etnia = document.querySelector('#valorControl19139');
                pais = document.querySelector('#valorControl19138');
                pob_dif = document.querySelector('#valorControl19141');
                Pob_inclusion = document.querySelector('#valorControl19142');
                categoria_discapacidad = document.querySelector('#valorControl19143');
                etapa_gestacion = document.querySelector('#valorControl19144');
                canalizacion = document.querySelector('#valorControl19148');
                porquenosecanalizo = document.querySelector('#valorControl19149');
                ocupacion = document.querySelector('#valorControl19145');
                rol = document.querySelector('#valorControl19146');
                if (!tipo_doc || !sexo) return;
                Object.assign(elems, { etnia, pais, pob_dif, Pob_inclusion, categoria_discapacidad, etapa_gestacion, canalizacion, porquenosecanalizo, ocupacion, rol });
            }

            const docActual = tipo_doc.value;
            const sexoActual = sexo.value;

            if (docActual !== ultimoTipoDoc) {
                ultimoTipoDoc = docActual;
                const v = parseInt(docActual, 10);
                if ([59, 60, 61].includes(v)) {
                    tipo_doc.style.backgroundColor = bgSuccess;
                    aplicarMapa(mapaDocA);
                }
                if ([62, 63, 64, 65, 66, 2482, 1640, 1639].includes(v)) {
                    tipo_doc.style.backgroundColor = bgSuccess;
                    aplicarMapa(mapaDocB);
                }
            }

            if (sexoActual !== ultimoSexo) {
                ultimoSexo = sexoActual;
                if (tipo_doc.value === '59') {
                    sexo.style.backgroundColor = bgSuccess;
                    if (sexoActual === '67') {
                        set(genero, '70');
                        set(orientacion, '4024');
                        set(identidad_genero, '4515');
                    } else if (sexoActual === '68') {
                        set(genero, '71');
                        set(orientacion, '4024');
                        set(identidad_genero, '4514');
                    }
                } else if (sexoActual === '67' || sexoActual === '68') {
                    sexo.style.backgroundColor = bgSuccess;
                    set(genero, '4513');
                    set(orientacion, '4028');
                    set(identidad_genero, '4020');
                }
            }
        }, 100);

    } catch (error) {
        console.error(error);
    }

    // ════════════════════════════════════════════════════════════════════
    // BLOQUE 2 — AUTOCOMPLETADO DE TAMIZAJES
    // ════════════════════════════════════════════════════════════════════
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
            if (oms.value === "")                                              { oms.value = "4182";                  oms.style.backgroundColor = bgSuccess; }
            if (find && find.value === "")                                     { find.value = "4452";                 find.style.backgroundColor = bgSuccess; }
            if (frecuencia_cardiaca && frecuencia_cardiaca.value === "")       { frecuencia_cardiaca.value = "4453";  frecuencia_cardiaca.style.backgroundColor = bgSuccess; }
            if (tension_arterial && tension_arterial.value === "")             { tension_arterial.value = "4454";    tension_arterial.style.backgroundColor = bgSuccess; }
            if (diezciciete && diezciciete.value === "")                       { diezciciete.value = "4185";         diezciciete.style.backgroundColor = bgSuccess; }
            if (dieziocho && dieziocho.value === "")                           { dieziocho.value = "4232";           dieziocho.style.backgroundColor = bgSuccess; }
            if (cuarenta && cuarenta.value === "")                             { cuarenta.value = "4253";            cuarenta.style.backgroundColor = bgSuccess; }
            if (ojo_derecho && ojo_derecho.value === "")                       { ojo_derecho.value = "4191";         ojo_derecho.style.backgroundColor = bgSuccess; }
            if (ojo_izquierdo && ojo_izquierdo.value === "")                   { ojo_izquierdo.value = "4191";       ojo_izquierdo.style.backgroundColor = bgSuccess; }
            if (oido_derecho && oido_derecho.value === "")                     { oido_derecho.value = "4235";        oido_derecho.style.backgroundColor = bgSuccess; }
            if (oido_izquierdo && oido_izquierdo.value === "")                 { oido_izquierdo.value = "4235";      oido_izquierdo.style.backgroundColor = bgSuccess; }
            if (intencion_reproductiva && intencion_reproductiva.value === "") { intencion_reproductiva.value = "4457"; intencion_reproductiva.style.backgroundColor = bgSuccess; }
            if (satisfaccion && satisfaccion.value === "")                     { satisfaccion.value = "4457";        satisfaccion.style.backgroundColor = bgSuccess; }
            if (cuidado_menstrual && cuidado_menstrual.value === "")           { cuidado_menstrual.value = "4258";   cuidado_menstrual.style.backgroundColor = bgSuccess; }
            if (mini_cog && mini_cog.value === "")                             { mini_cog.value = "4455";            mini_cog.style.backgroundColor = bgSuccess; }
            if (clasificacion_riesgo && clasificacion_riesgo.value === "")     { clasificacion_riesgo.value = "4456"; clasificacion_riesgo.style.backgroundColor = bgSuccess; }
            if (aplica_tamizaje && aplica_tamizaje.value === "")               { aplica_tamizaje.value = "4258";     aplica_tamizaje.style.backgroundColor = bgSuccess; }
            if (escala_fies && escala_fies.value === "")                       { escala_fies.value = "4272";         escala_fies.style.backgroundColor = bgSuccess; }
            if (enfrentar_mejor && enfrentar_mejor.value === "")               { enfrentar_mejor.value = "4458";     enfrentar_mejor.style.backgroundColor = bgSuccess; }
            if (mejorar_manejo && mejorar_manejo.value === "")                 { mejorar_manejo.value = "4458";      mejorar_manejo.style.backgroundColor = bgSuccess; }
            if (tomar_mejores && tomar_mejores.value === "")                   { tomar_mejores.value = "4458";       tomar_mejores.style.backgroundColor = bgSuccess; }
            if (mi_bienestar && mi_bienestar.value === "")                     { mi_bienestar.value = "4460";        mi_bienestar.style.backgroundColor = bgSuccess; }
            if (nutricional && nutricional.value == "")                       {nutricional.value = "4459";         nutricional.style.backgroundColor = bgSuccess; }

            oms.addEventListener('change', function() {
                if (find && find.value === "")                                     { find.value = "4452";                 find.style.backgroundColor = bgSuccess; }
                if (frecuencia_cardiaca && frecuencia_cardiaca.value === "")       { frecuencia_cardiaca.value = "4453";  frecuencia_cardiaca.style.backgroundColor = bgSuccess; }
                if (tension_arterial && tension_arterial.value === "")             { tension_arterial.value = "4454";    tension_arterial.style.backgroundColor = bgSuccess; }
                if (diezciciete && diezciciete.value === "")                       { diezciciete.value = "4185";         diezciciete.style.backgroundColor = bgSuccess; }
                if (dieziocho && dieziocho.value === "")                           { dieziocho.value = "4232";           dieziocho.style.backgroundColor = bgSuccess; }
                if (cuarenta && cuarenta.value === "")                             { cuarenta.value = "4253";            cuarenta.style.backgroundColor = bgSuccess; }
                if (ojo_derecho && ojo_derecho.value === "")                       { ojo_derecho.value = "4191";         ojo_derecho.style.backgroundColor = bgSuccess; }
                if (ojo_izquierdo && ojo_izquierdo.value === "")                   { ojo_izquierdo.value = "4191";       ojo_izquierdo.style.backgroundColor = bgSuccess; }
                if (oido_derecho && oido_derecho.value === "")                     { oido_derecho.value = "4235";        oido_derecho.style.backgroundColor = bgSuccess; }
                if (oido_izquierdo && oido_izquierdo.value === "")                 { oido_izquierdo.value = "4235";      oido_izquierdo.style.backgroundColor = bgSuccess; }
                if (intencion_reproductiva && intencion_reproductiva.value === "") { intencion_reproductiva.value = "4457"; intencion_reproductiva.style.backgroundColor = bgSuccess; }
                if (satisfaccion && satisfaccion.value === "")                     { satisfaccion.value = "4457";        satisfaccion.style.backgroundColor = bgSuccess; }
                if (cuidado_menstrual && cuidado_menstrual.value === "")           { cuidado_menstrual.value = "4258";   cuidado_menstrual.style.backgroundColor = bgSuccess; }
                if (mini_cog && mini_cog.value === "")                             { mini_cog.value = "4455";            mini_cog.style.backgroundColor = bgSuccess; }
                if (clasificacion_riesgo && clasificacion_riesgo.value === "")     { clasificacion_riesgo.value = "4456"; clasificacion_riesgo.style.backgroundColor = bgSuccess; }
                if (aplica_tamizaje && aplica_tamizaje.value === "")               { aplica_tamizaje.value = "4258";     aplica_tamizaje.style.backgroundColor = bgSuccess; }
                if (escala_fies && escala_fies.value === "")                       { escala_fies.value = "4272";         escala_fies.style.backgroundColor = bgSuccess; }
                if (enfrentar_mejor && enfrentar_mejor.value === "")               { enfrentar_mejor.value = "4458";     enfrentar_mejor.style.backgroundColor = bgSuccess; }
                if (mejorar_manejo && mejorar_manejo.value === "")                 { mejorar_manejo.value = "4458";      mejorar_manejo.style.backgroundColor = bgSuccess; }
                if (tomar_mejores && tomar_mejores.value === "")                   { tomar_mejores.value = "4458";       tomar_mejores.style.backgroundColor = bgSuccess; }
                if (mi_bienestar && mi_bienestar.value === "")                     { mi_bienestar.value = "4460";        mi_bienestar.style.backgroundColor = bgSuccess; }
                if (nutricional && nutricional.value == "")                       {nutricional.value = "4459";         nutricional.style.backgroundColor = bgSuccess; }
            });
        }
    } catch (error) {
        console.error(error);
    }

    // ════════════════════════════════════════════════════════════════════
    // BLOQUE 3 — ASISTENCIA A LA SESIÓN + VALIDADOR EDAD/DOCUMENTO
    // ════════════════════════════════════════════════════════════════════
    (function autoSesion() {

        const camposSesion = [
            { id: 'valorControl19008' },
            { id: 'valorControl19029' },
            { id: 'valorControl19049' },
            { id: 'valorControl19069' },
        ];
        const IDS_SESION = ['19008', '19029', '19049', '19069'];

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

        const ID_LISTBOX_BASE     = 'valorControl19147';
        const KEY_HISTORIAL       = 'auto_sesion_historial';
        const KEY_CONSECUTIVO     = 'auto_sesion_consecutivo';
        const KEY_PUSO_SCRIPT     = 'auto_sesion_puso_script';
        const ID_EDAD             = 'valorControl19954';
        const ID_DOCUMENTO        = 'valorControl19131';
        const ID_BOTON_ACTUALIZAR = 'botonActualizarInformacion';

        const reglasDocumento = {
            '60': { nombre: 'Registro Civil',       edadMin: 0,  edadMax: 6   },
            '61': { nombre: 'Tarjeta de Identidad', edadMin: 7,  edadMax: 17  },
            '59': { nombre: 'Cédula de Ciudadanía', edadMin: 18, edadMax: 999 },
        };

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

        function obtenerPuestoScript() {
            try { return JSON.parse(localStorage.getItem(KEY_PUSO_SCRIPT) || '[]'); } catch { return []; }
        }

        function guardarHistorial(sesionesNuevas) {
            const combinado = [...new Set(sesionesNuevas)];
            combinado.sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
            localStorage.setItem(KEY_HISTORIAL, JSON.stringify(combinado));
            console.log('Sesiones guardadas al actualizar:', combinado);
        }

        function limpiarHistorial() {
            [KEY_HISTORIAL, KEY_CONSECUTIVO, KEY_PUSO_SCRIPT].forEach(k => localStorage.removeItem(k));
        }

        function verificarFichaNueva() {
            const consecutivo = document.querySelector('[id*="Consecutivo"], [name*="consecutivo"], [id*="consecutivo"]');
            if (!consecutivo) return;
            const valorActual   = (consecutivo.value || consecutivo.textContent || '').trim();
            const valorGuardado = localStorage.getItem(KEY_CONSECUTIVO);
            if (valorGuardado && valorActual !== valorGuardado) limpiarHistorial();
            if (valorActual) localStorage.setItem(KEY_CONSECUTIVO, valorActual);
        }

        function leerSesionesActuales() {
            const sesiones = [];
            camposSesion.forEach(({ id }) => {
                const campo = document.getElementById(id);
                if (!campo) return;
                const val = normalizarSesion(campo.value.trim());
                if (val && mapaAsistencia[val] && !sesiones.includes(val)) sesiones.push(val);
            });
            document.querySelectorAll('input').forEach(input => {
                const val = normalizarSesion(input.value.trim());
                const esIdSesion = IDS_SESION.some(idPart => input.id.includes(idPart));
                if (esIdSesion && val && mapaAsistencia[val] && !sesiones.includes(val)) sesiones.push(val);
            });
            sesiones.sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
            return sesiones;
        }

        function modoInstitucion() {
            verificarFichaNueva();

            const boton = document.getElementById(ID_BOTON_ACTUALIZAR) || document.querySelector('[id*="Actualizar"], [id*="Guardar"]');
            if (boton && !boton.dataset.listenerSesiones) {
                boton.dataset.listenerSesiones = '1';
                boton.addEventListener('click', () => {
                    guardarHistorial(leerSesionesActuales());
                });
            }

            const campos = [];
            camposSesion.forEach(({ id }) => { const c = document.getElementById(id); if (c) campos.push(c); });
            document.querySelectorAll('input').forEach(input => {
                const esIdSesion = IDS_SESION.some(idPart => input.id.includes(idPart));
                if (esIdSesion && !campos.includes(input)) campos.push(input);
            });

            campos.forEach(campo => {
                ['input', 'change', 'keyup'].forEach(ev => {
                    campo.addEventListener(ev, () => {
                        console.log('Sesiones detectadas (sin guardar aún):', leerSesionesActuales());
                    });
                });
            });
        }

        function modoPersonas() {
            const historial = obtenerHistorial();
            if (historial.length === 0) { iniciarValidador(); return; }

            const valoresAMarcar = historial.map(s => mapaAsistencia[String(s)]).filter(Boolean);
            const puestoScript   = obtenerPuestoScript();

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
                        const numSesion = op.text.match(/S(\d+)/i)?.[1];
                        const noAsistioEstaSesion = noAsistioMarcados.some(v => {
                            const opNo = listbox.querySelector(`option[value="${v}"]`);
                            return opNo?.text.match(/S(\d+)/i)?.[1] === numSesion;
                        });
                        if (!noAsistioEstaSesion) {
                            op.selected = true;
                            puestoScript.push(op.value);
                            huboCambio = true;
                        }
                    }
                });

                if (huboCambio) listbox.dispatchEvent(new Event('change', { bubbles: true }));
            });

            localStorage.setItem(KEY_PUSO_SCRIPT, JSON.stringify(puestoScript));
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
    // BLOQUE 4 — COMPROBADOR DOCUMENTOS PERSONAS vs TAMIZAJES
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

            if (valorAlCargar === '') {
                setTimeout(verificarDoc, 1200);
            }

            let timer = null;
            ['input', 'change', 'blur'].forEach(ev => {
                campo.addEventListener(ev, () => {
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

    // ════════════════════════════════════════════════════════════════════
    // BLOQUE 5 — AVISO: EL TEMA NO ES OBLIGATORIO EN LAS LÍNEAS OPERATIVAS 5 Y 6
    // ════════════════════════════════════════════════════════════════════
    (function avisoTemaOpcional() {

        const IDS_OBJ = (typeof IDS !== 'undefined') ? IDS : {};
        const PARES = [
            { linea: IDS_OBJ.linea_operativa || 'valorControl19001', tema: IDS_OBJ.tema || 'valorControl19003' },
        ].filter(p => p.linea && p.tema);

        const LINEAS_SIN_TEMA = [5, 6];
        const CLASE_AVISO = 'aviso-tema-opcional';

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
                if (!campoLinea) return;
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
                campoLinea.parentNode.appendChild(div);
            });
        }

        const IDS_OBSERVADOS = PARES.flatMap((p) => [p.linea, p.tema]);
        ['change', 'input', 'keyup'].forEach((ev) => {
            document.addEventListener(ev, (e) => {
                if (e.target && IDS_OBSERVADOS.includes(e.target.id)) evaluar();
            }, true);
        });
        setInterval(evaluar, 700);
        evaluar();
    })(); // fin avisoTemaOpcional

    // ════════════════════════════════════════════════════════════════════
    // BLOQUE 6 — VALIDACIONES NOMBRES Y NÚMERO DE DOCUMENTO
    // ════════════════════════════════════════════════════════════════════
    (function addValidations() {
        const $  = s => document.querySelector(s);
        const $$ = s => document.querySelectorAll(s);

        const NAME_SELECTORS = ['#valorControl19129', '#valorControl19130'];
        const DOC_SELECTOR = '#valorControl19132';
        const TIPO_DOC_SELECTOR = '#valorControl19131';
        const nameSanitizeRegex = /[^\p{L}\s'-]/gu;

        function attachNameFilters(selector) {
            Array.from($$(selector)).forEach(input => {
                if (!input) return;
                input.addEventListener('input', () => {
                    const old = input.value, cleaned = old.replace(nameSanitizeRegex, '');
                    if (old !== cleaned) {
                        input.value = cleaned;
                        input.style.border = '2px solid #e6a0a0';
                        input.style.background = '#fff5f5';
                        clearTimeout(input._nameValidTimer);
                        input._nameValidTimer = setTimeout(() => {
                            input.style.border = '';
                            input.style.background = '';
                        }, 1200);
                    }
                });
                input.addEventListener('keypress', ev => {
                    const ch = ev.key;
                    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
                    if (ch.length === 1 && !ch.match(/[\p{L}\s'-]/u)) ev.preventDefault();
                });
                input.addEventListener('paste', ev => {
                    ev.preventDefault();
                    const text = (ev.clipboardData || window.clipboardData).getData('text') || '';
                    const cleaned = text.replace(nameSanitizeRegex, '');
                    input.setRangeText(cleaned, input.selectionStart || 0, input.selectionEnd || 0, 'end');
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                });
            });
        }

        function attachDocFilter(selector, tipoDocSelector) {
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
                input.style.border = '';
                input.style.background = '';
                const prev = input.parentNode ? input.parentNode.querySelector('.mensaje-doc') : null;
                if (prev) prev.remove();
            });

            input.addEventListener('paste', ev => {
                ev.preventDefault();
                const regex = esAlfanumerico() ? /[^\p{L}\p{N}]/gu : /[^\p{N}]/gu;
                const text = (ev.clipboardData || window.clipboardData).getData('text') || '';
                const cleaned = text.replace(regex, '');
                input.setRangeText(cleaned, input.selectionStart || 0, input.selectionEnd || 0, 'end');
                input.dispatchEvent(new Event('input', { bubbles: true }));
            });

            input.addEventListener('blur', () => {
                const val = (input.value || '').trim();
                const esAlfa = esAlfanumerico();
                const min = 6, max = esAlfa ? 11 : 10;
                const prev = input.parentNode ? input.parentNode.querySelector('.mensaje-doc') : null;
                if (prev) prev.remove();
                if (val.length === 0) return;
                if (val.length < min || val.length > max) {
                    input.style.border = '2px solid red';
                    input.style.background = '#fff0f0';
                    const div = document.createElement('div');
                    div.className = 'mensaje-doc';
                    div.textContent = `⚠ El documento debe tener entre ${min} y ${max} ${esAlfa ? 'caracteres' : 'números'} (actual: ${val.length}).`;
                    Object.assign(div.style, {
                        color: '#b30000',
                        background: '#ffe6e6',
                        padding: '6px',
                        marginTop: '4px',
                        border: '1px solid #ff9999',
                        borderRadius: '4px',
                        fontSize: '12px'
                    });
                    if (input.parentNode) input.parentNode.appendChild(div);
                }
            });

            const tipoDoc = $(tipoDocSelector);
            if (tipoDoc) {
                tipoDoc.addEventListener('change', () => {
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                });
            }
        }

        function start() {
            NAME_SELECTORS.forEach(selector => attachNameFilters(selector));
            attachDocFilter(DOC_SELECTOR, TIPO_DOC_SELECTOR);
        }

        if (document.readyState === 'complete') start();
        else window.addEventListener('load', start);
    })();

})();
