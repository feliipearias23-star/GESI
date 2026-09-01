// ==UserScript==
// @name         SESIONES COMUNITARIO V5
// @namespace    https://gesiapps.saludcapital.gov.co/GESI_sistemas/GESI_Form*
// @version      2.1
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
    
    function setValueAndNotify(campo, valor) {
        if (!campo) return;
        campo.value = valor;
        campo.style.backgroundColor = bgSuccess;
        campo.dispatchEvent(new Event('input', { bubbles: true }));
        campo.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // ===================== BLOQUE 1: Autocompletado de campos =====================
    try{
        let tipo_doc = document.querySelector('#valorControl19387');
        let sexo = document.querySelector('#valorControl19389');
        let genero = document.querySelector('#valorControl19390');
        let orientacion = document.querySelector('#valorControl19391');
        let identidad_genero = document.querySelector('#valorControl19392');
        let etnia = document.querySelector('#valorControl19395');
        let pais = document.querySelector('#valorControl19394');
        let pob_dif = document.querySelector('#valorControl19397');
        let Pob_inclusion = document.querySelector('#valorControl19398');
        let categoria_discapacidad = document.querySelector('#valorControl19399');
        let etapa_gestacion = document.querySelector('#valorControl19400');
        let canalizacion = document.querySelector('#valorControl19404');
        let porquenosecanalizo = document.querySelector('#valorControl19405');
        let ocupacion = document.querySelector('#valorControl19401');
        // TODO: reemplazar el selector por el ID real del control "rol" cuando lo tengas.
        let rol = document.querySelector('#valorControlROL_PENDIENTE');

            const DEBOUNCE_TIPO_DOC = 700;

            let ultimoValorVistoTipoDoc = tipo_doc ? tipo_doc.value : '';
            let timeoutTipoDoc = null;
            let ultimoTipoDocAplicado = tipo_doc ? tipo_doc.value : '';
            let ultimoSexo    = sexo ? sexo.value : '';

            function aplicarLogicaTipoDoc(docActual) {
                if (docActual === ultimoTipoDocAplicado) return;
                ultimoTipoDocAplicado = docActual;
                const v = parseInt(docActual, 10);
                if ([59, 60, 61].includes(v)) {
                    tipo_doc.style.backgroundColor = bgSuccess;
                    setValueAndNotify(etnia, '84');
                    setValueAndNotify(pais, '50');
                    setValueAndNotify(pob_dif, '2620');
                    setValueAndNotify(Pob_inclusion, '4048');
                    setValueAndNotify(categoria_discapacidad, '3822');
                    setValueAndNotify(etapa_gestacion, '3785');
                    setValueAndNotify(canalizacion, '959');
                    setValueAndNotify(porquenosecanalizo, '4517');
                    setValueAndNotify(ocupacion, '1063');
                    if (rol) setValueAndNotify(rol, '');
                }
                if ([62, 63, 64, 65, 66, 2482].includes(v)) {
                    setValueAndNotify(etnia, '84');
                    setValueAndNotify(pais, '236');
                    setValueAndNotify(pob_dif, '4051');
                    setValueAndNotify(Pob_inclusion, '4048');
                    setValueAndNotify(categoria_discapacidad, '3822');
                    setValueAndNotify(etapa_gestacion, '3785');
                    setValueAndNotify(canalizacion, '');
                    setValueAndNotify(porquenosecanalizo, '');
                    setValueAndNotify(ocupacion, '1063');
                    if (rol) setValueAndNotify(rol, '');
                }
            }

            setInterval(function() {
                if (!tipo_doc || !sexo) return;

                const docActual  = tipo_doc.value;
                const sexoActual = sexo.value;

                if (docActual !== ultimoValorVistoTipoDoc) {
                    ultimoValorVistoTipoDoc = docActual;
                 
                    if (timeoutTipoDoc) clearTimeout(timeoutTipoDoc);
                    timeoutTipoDoc = setTimeout(() => aplicarLogicaTipoDoc(tipo_doc.value), DEBOUNCE_TIPO_DOC);
                }

                if (sexoActual !== ultimoSexo) {
                    ultimoSexo = sexoActual;
                    const docValue = tipo_doc.value;
                    if (docValue === '59') {
                        if (sexoActual === '67') {
                            sexo.style.backgroundColor = bgSuccess;
                            setValueAndNotify(genero, '70');
                            setValueAndNotify(orientacion, '4024');
                            setValueAndNotify(identidad_genero, '4515');
                        } else if (sexoActual === '68') {
                            sexo.style.backgroundColor = bgSuccess;
                            setValueAndNotify(genero, '71');
                            setValueAndNotify(orientacion, '4024');
                            setValueAndNotify(identidad_genero, '4514');
                        }
                    } else if (sexoActual === '67' || sexoActual === '68') {
                        setValueAndNotify(genero, '4513');
                        sexo.style.backgroundColor = bgSuccess;
                        setValueAndNotify(orientacion, '4028');
                        setValueAndNotify(identidad_genero, '4020');
                    }
                }

            }, 400);

        } catch (error) {
            console.error(error);
        }

    // ===================== BLOQUE 2: Auto Sesión Asistencia (v8.4) =====================
    (function autoSesion() {
        'use strict';

        const camposSesion = [
            { id: 'valorControl19264' },
            { id: 'valorControl19285' },
            { id: 'valorControl19305' },
            { id: 'valorControl19325' },
        ];

        const mapaAsistencia = {
            '1':  '4307', '2':  '4422', '3':  '4424', '4':  '4426',
            '5':  '4428', '6':  '4430', '7':  '4432', '8':  '4434',
            '9':  '4462', '10': '4464', '11': '4466', '12': '4468',
            '13': '4470', '14': '4472', '15': '4474', '16': '4476',
            '17': '4478', '18': '4480', '19': '4482', '20': '4484',
            '21': '4486', '22': '4488', '23': '4490', '24': '4492',
            '25': '4494', '26': '4496', '27': '4498', '28': '4500',
            '29': '4502', '30': '4504', '31': '4836', '32': '4838',
            '33': '4840', '34': '4842', '35': '4844', '36': '4846',
            '37': '4848', '38': '4850', '39': '4852', '40': '4854',
            '41': '4856', '42': '4858', '43': '4860', '44': '4862',
            '45': '4864','46': '4866', '47': '4868', '48': '4870',
        };

        const ID_LISTBOX_BASE = 'valorControl19403';
        const KEY_HISTORIAL   = 'auto_sesion_historial';
        const KEY_CONSECUTIVO = 'auto_sesion_consecutivo';
        const KEY_PUSO_SCRIPT = 'auto_sesion_puso_script';
        const KEY_QUITADOS    = 'auto_sesion_quitados';
        const IDS_SESION      = ['19264', '19285', '19305', '19325'];

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
// ===================== BLOQUE 3: VALIDACIONES NOMBRES / DOC / FECHA =====================
    (function addValidations() {
        const $  = s => document.querySelector(s);
        const $$ = s => document.querySelectorAll(s);

        const NAME_SELECTORS = ['#valorControl19385', '#valorControl19386'];
        const DOC_SELECTOR = '#valorControl19388';
        const TIPO_DOC_SELECTOR = '#valorControl19387';
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

        function validateSessionDateMatchesIntervention(
            interventionSel,
            sessionDateSel,
            sessionNumberSel,
            fichaNumberSel
        ) {
            const FLAG = '__gesi_fecha_sesion_validada_comunitario__';
            if (window[FLAG]) return;

            const value = el => String(
                el?.value ||
                el?.getAttribute?.('value') ||
                el?.textContent ||
                ''
            ).trim();

            const esFichaNueva = () => {
                const ficha = document.querySelector(fichaNumberSel);
                if (!ficha) return true;
                return value(ficha) === '';
            };

            if (!esFichaNueva()) {
                window[FLAG] = true;
                return;
            }

            const normalize = date => {
                date = String(date || '').trim().split('T')[0];
                let m = date.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
                return m
                    ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
                    : date;
            };

            const timer = setInterval(() => {
                if (!esFichaNueva()) {
                    window[FLAG] = true;
                    clearInterval(timer);
                    return;
                }

                const intervention = document.querySelector(interventionSel);
                const sessionDate = document.querySelector(sessionDateSel);
                const sessionNumber = document.querySelector(sessionNumberSel);

                if (!intervention || !sessionDate || !sessionNumber) return;

                const number = value(sessionNumber).match(/\d+/);
                if (!number) return;

                if (parseInt(number[0], 10) !== 1) {
                    window[FLAG] = true;
                    clearInterval(timer);
                    return;
                }

                const interventionValue = value(intervention);
                const sessionValue = value(sessionDate);

                if (!interventionValue || !sessionValue) return;

                window[FLAG] = true;
                clearInterval(timer);

                if (normalize(interventionValue) === normalize(sessionValue)) return;

                alert(
                    'La fecha de la sesión 1 (' +
                    sessionValue +
                    ') no coincide con la fecha de intervención (' +
                    interventionValue +
                    ').'
                );
            }, 200);
        }

        function start() {
            NAME_SELECTORS.forEach(selector => attachNameFilters(selector));
            attachDocFilter(DOC_SELECTOR, TIPO_DOC_SELECTOR);
            validateSessionDateMatchesIntervention(
                '#FechaIntervencion',
                '#valorControl19263',
                '#valorControl19264',
                '#Ficha_fic'
            );
        }

        if (document.readyState === 'complete') start();
        else window.addEventListener('load', start);
    })();
})();
