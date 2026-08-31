// ==UserScript==
// @name         SESIONES LABORAL V1
// @namespace    https://gesiapps.saludcapital.gov.co/GESI_sistemas/GESI_Form*
// @version      2025-06-06.1
// @description  Autocompleta campos de Comunitario y marca automáticamente las sesiones de asistencia (multi-persona)
// @author       You
// @match        https://gesiapps.saludcapital.gov.co/GESI_sistemas/GESI_Form*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    let bgSuccess = "rgba(50, 200, 150, 0.2)";

    // ===================== BLOQUE 1: Autocompletado de campos =====================
    try{
        let tipo_doc = document.querySelector('#valorControl19643');
        let sexo = document.querySelector('#valorControl19645');
        let genero = document.querySelector('#valorControl19646');
        let orientacion = document.querySelector('#valorControl19647');
        let identidad_genero = document.querySelector('#valorControl19648');
        let etnia = document.querySelector('#valorControl19651');
        let pais = document.querySelector('#valorControl19650');
        let pob_dif = document.querySelector('#valorControl19653');
        let Pob_inclusion = document.querySelector('#valorControl19654');
        let categoria_discapacidad = document.querySelector('#valorControl19655');
        let etapa_gestacion = document.querySelector('#valorControl19656');
        let canalizacion = document.querySelector('#valorControl19660');
        let porquenosecanalizo = document.querySelector('#valorControl19661');
        let ocupacion = document.querySelector('#valorControl19401');



let ultimoTipoDoc = tipo_doc ? tipo_doc.value : '';
            let ultimoSexo    = sexo ? sexo.value : '';

            setInterval(function() {
                if (!tipo_doc || !sexo) return;

                const docActual  = tipo_doc.value;
                const sexoActual = sexo.value;

                if (docActual !== ultimoTipoDoc) {
                    ultimoTipoDoc = docActual;
                    const v = parseInt(docActual, 10);
                    if ([59, 60, 61].includes(v)) {
                        tipo_doc.style.backgroundColor = bgSuccess;
                        if (etnia)  { etnia.value = '84';   etnia.style.backgroundColor = bgSuccess; }
                        if (pais)   { pais.value = '50';    pais.style.backgroundColor = bgSuccess; }
                        if (pob_dif){ pob_dif.value = '2620'; pob_dif.style.backgroundColor = bgSuccess; }
                        if (Pob_inclusion)          { Pob_inclusion.value = '4048';          Pob_inclusion.style.backgroundColor = bgSuccess; }
                        if (categoria_discapacidad) { categoria_discapacidad.value = '3822'; categoria_discapacidad.style.backgroundColor = bgSuccess; }
                        if (etapa_gestacion)        { etapa_gestacion.value = '3785';        etapa_gestacion.style.backgroundColor = bgSuccess; }
                        if (canalizacion)           { canalizacion.value = '959';            canalizacion.style.backgroundColor = bgSuccess; }
                        if (porquenosecanalizo)     { porquenosecanalizo.value = '4128';     porquenosecanalizo.style.backgroundColor = bgSuccess; }
                        if (ocupacion)              { ocupacion.value = '902';               ocupacion.style.backgroundColor = bgSuccess; }
                        if (rol)                     { rol.value = '4127';                   rol.style.backgroundColor = bgSuccess; }
                    }
                    if ([62, 63, 64, 65, 66, 2482,].includes(v)) {
                        if (etnia)  { etnia.value = '84';   etnia.style.backgroundColor = bgSuccess; }
                        if (pais)   { pais.value = '236';   pais.style.backgroundColor = bgSuccess; }
                        if (pob_dif){ pob_dif.value = '4051'; pob_dif.style.backgroundColor = bgSuccess; }
                        if (Pob_inclusion)          { Pob_inclusion.value = '4048';          Pob_inclusion.style.backgroundColor = bgSuccess; }
                        if (categoria_discapacidad) { categoria_discapacidad.value = '3822'; categoria_discapacidad.style.backgroundColor = bgSuccess; }
                        if (etapa_gestacion)        { etapa_gestacion.value = '3785';        etapa_gestacion.style.backgroundColor = bgSuccess; }
                        if (canalizacion)           { canalizacion.value = '959';            canalizacion.style.backgroundColor = bgSuccess; }
                        if (porquenosecanalizo)     { porquenosecanalizo.value = '4128';     porquenosecanalizo.style.backgroundColor = bgSuccess; }
                        if (ocupacion)              { ocupacion.value = '902';               ocupacion.style.backgroundColor = bgSuccess; }
                        if (rol)                    { rol.value = '4127';                    rol.style.backgroundColor = bgSuccess; }
                    }
                }

                if (sexoActual !== ultimoSexo) {
                    ultimoSexo = sexoActual;
                    const docValue = tipo_doc.value;
                    if (docValue === '59') {
                        if (sexoActual === '67') {
                            sexo.style.backgroundColor = bgSuccess;
                            if (genero)          { genero.value = '70';          genero.style.backgroundColor = bgSuccess; }
                            if (orientacion)     { orientacion.value = '4024';   orientacion.style.backgroundColor = bgSuccess; }
                            if (identidad_genero){ identidad_genero.value = '4515'; identidad_genero.style.backgroundColor = bgSuccess; }
                        } else if (sexoActual === '68') {
                            sexo.style.backgroundColor = bgSuccess;
                            if (genero)          { genero.value = '71';          genero.style.backgroundColor = bgSuccess; }
                            if (orientacion)     { orientacion.value = '4024';   orientacion.style.backgroundColor = bgSuccess; }
                            if (identidad_genero){ identidad_genero.value = '4514'; identidad_genero.style.backgroundColor = bgSuccess; }
                        }
                    } else if (sexoActual === '67' || sexoActual === '68') {
                        if (genero)          { genero.value = '4513';          genero.style.backgroundColor = bgSuccess; }
                        sexo.style.backgroundColor = bgSuccess;
                        if (orientacion)     { orientacion.value = '4028';     orientacion.style.backgroundColor = bgSuccess; }
                        if (identidad_genero){ identidad_genero.value = '4020'; identidad_genero.style.backgroundColor = bgSuccess; }
                    }
                }

            }, );

        } catch (error) {
            console.error(error);
        }

    // ===================== BLOQUE 2: Auto Sesión Asistencia (v8.4) =====================
    (function autoSesion() {
        'use strict';

        const camposSesion = [
            { id: 'valorControl19520' },
            { id: 'valorControl19541' },
            { id: 'valorControl19561' },
            { id: 'valorControl19581' },
        ];

        const mapaAsistencia = {
            '1':  '4307', '2':  '4422', '3':  '4424', '4':  '4426',
            '5':  '4428', '6':  '4430', '7':  '4432', '8':  '4434',
            '9':  '4462', '10': '4464', '11': '4466', '12': '4468',
            '13': '4470', '14': '4472', '15': '4474', '16': '4476',
            '17': '4478', '18': '4480', '19': '4482', '20': '4484',
            '21': '4486', '22': '4488', '23': '4490', '24': '4492',
            '25': '4494', '26': '4496', '27': '4498', '28': '4500',
            '29': '4502', '30': '4504',
        };

        const ID_LISTBOX_BASE = 'valorControl19659';
        const KEY_HISTORIAL   = 'auto_sesion_historial';
        const KEY_CONSECUTIVO = 'auto_sesion_consecutivo';
        const KEY_PUSO_SCRIPT = 'auto_sesion_puso_script';
        const KEY_QUITADOS    = 'auto_sesion_quitados';
        const IDS_SESION      = ['19520', '19541', '19561', '19581'];

        function obtenerHistorial() {
            try { return JSON.parse(localStorage.getItem(KEY_HISTORIAL) || '[]'); } catch { return []; }
        }
        function obtenerPuestoScript() {
            try { return JSON.parse(localStorage.getItem(KEY_PUSO_SCRIPT) || '[]'); } catch { return []; }
        }
        function obtenerQuitados() {
            try { return JSON.parse(localStorage.getItem(KEY_QUITADOS) || '[]'); } catch { return []; }
        }
        function guardarHistorial(sesionesNuevas) {
            const historialActual = obtenerHistorial();
            const combinado = [...new Set([...historialActual, ...sesionesNuevas])];
            combinado.sort((a, b) => parseInt(a) - parseInt(b));
            localStorage.setItem(KEY_HISTORIAL, JSON.stringify(combinado));
        }
        function limpiarHistorial() {
            localStorage.removeItem(KEY_HISTORIAL);
            localStorage.removeItem(KEY_CONSECUTIVO);
            localStorage.removeItem(KEY_PUSO_SCRIPT);
            localStorage.removeItem(KEY_QUITADOS);
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
                        const val = campo.value.trim();
                        if (val !== '' && mapaAsistencia[val] && !sesionesEstaPestana.includes(val))
                            sesionesEstaPestana.push(val);
                    }
                });
                document.querySelectorAll('input').forEach(input => {
                    const val = input.value.trim();
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
            if (historial.length === 0) return;
            const valoresAMarcar = historial.map(s => mapaAsistencia[s]).filter(Boolean);
            const puestoScript   = obtenerPuestoScript();
            const quitados       = obtenerQuitados();

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
        }

        function detectar() {
            const enInstitucion = camposSesion.some(({ id }) => document.getElementById(id));
            const enPersonas    = Array.from(document.querySelectorAll('select'))
                .some(el => el.id && el.id.includes(ID_LISTBOX_BASE));

            if (enInstitucion) modoInstitucion();

            if (enPersonas) {
                function intentar(reintentos) {
                    const hayListbox = Array.from(document.querySelectorAll('select'))
                        .some(el => el.id && el.id.includes(ID_LISTBOX_BASE) && el.options.length > 1);
                    if (hayListbox) {
                        modoPersonas();
                    } else if (reintentos > 0) {
                        setTimeout(() => intentar(reintentos - 1), 600);
                    }
                }
                setTimeout(() => intentar(10), 500);
            }
        }

        if (document.readyState === 'complete') detectar();
        else window.addEventListener('load', detectar);

    })();

})();
