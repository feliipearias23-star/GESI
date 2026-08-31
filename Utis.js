// ==UserScript==
// @name         UTIS
// @namespace    https://gesiapps.saludcapital.gov.co/GESI_sistemas/GESI_Form*
// @version      1.1
// @description  Auto asignación documento/sexo/género + validador edad/documento para la nueva base
// @author       You
// @match        https://gesiapps.saludcapital.gov.co/GESI_sistemas/GESI_Form*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function () {
    'use strict';

    console.log('🚀 GESI Nueva Base — cargado');

    const bgSuccess = 'rgba(50, 200, 150, 0.2)';

    (function documentoSexoGenero() {
        try {
            let tipo_doc               = document.querySelector('#valorControl20688');
            let sexo                   = document.querySelector('#valorControl20691');
            let genero                 = document.querySelector('#valorControl20692');
            let identidad_genero       = document.querySelector('#valorControl20693');
            let etnia                  = document.querySelector('#valorControl20698');
            let pais                   = document.querySelector('#valorControl20690');
            let pob_dif_inclusion      = document.querySelector('#valorControl20699');
            let categoria_discapacidad = document.querySelector('#valorControl20701');
            let canalizacion           = document.querySelector('#valorControl20740');
            let porquenosecanalizo     = document.querySelector('#valorControl20741');
            let alerta_mujeres         = document.querySelector('#valorControl20738');
            let etapa_gestacion        = document.querySelector('#valorControl20739');
            let frecuencia_cardiaca    = document.querySelector('#valorControl20746');
            let tension_arterial       = document.querySelector('#valorControl20747');
            let spo2                   = document.querySelector('#valorControl20748');
            let tamizaje_aplicado      = document.querySelector('#valorControl20749');
            let resultado_glucometria  = document.querySelector('#valorControl20750');

            let ultimoTipoDoc = tipo_doc ? tipo_doc.value : '';
            let ultimoSexo    = sexo ? sexo.value : '';

            setInterval(function () {
                if (!tipo_doc || !sexo) return;

                const docActual  = tipo_doc.value;
                const sexoActual = sexo.value;

                if (docActual !== ultimoTipoDoc) {
                    ultimoTipoDoc = docActual;
                    const v = parseInt(docActual, 10);

                    // ⚠️ Verifica que estos códigos de valor sigan siendo válidos en esta base
                    if ([59, 60, 61].includes(v)) {
                        tipo_doc.style.backgroundColor = bgSuccess;
                        if (etnia)  { etnia.value = '84';   etnia.style.backgroundColor = bgSuccess; }
                        if (pais)   { pais.value = '50';    pais.style.backgroundColor = bgSuccess; }
                        if (pob_dif_inclusion)      { pob_dif_inclusion.value = '2620';       pob_dif_inclusion.style.backgroundColor = bgSuccess; }
                        if (categoria_discapacidad) { categoria_discapacidad.value = '3822';  categoria_discapacidad.style.backgroundColor = bgSuccess; }
                        if (canalizacion)           { canalizacion.value = '959';             canalizacion.style.backgroundColor = bgSuccess; }
                        if (porquenosecanalizo)     { porquenosecanalizo.value = '4517';      porquenosecanalizo.style.backgroundColor = bgSuccess; }
                        if (alerta_mujeres)         { alerta_mujeres.value = '2610';           alerta_mujeres.style.backgroundColor = bgSuccess; }
                        if (etapa_gestacion)        { etapa_gestacion.value = '3785';          etapa_gestacion.style.backgroundColor = bgSuccess; }
                        if (frecuencia_cardiaca)    { frecuencia_cardiaca.value = 'NA';         frecuencia_cardiaca.style.backgroundColor = bgSuccess; }
                        if (tension_arterial)       { tension_arterial.value = 'NA';            tension_arterial.style.backgroundColor = bgSuccess; }
                        if (spo2)                   { spo2.value = 'NA';                        spo2.style.backgroundColor = bgSuccess; }
                        if (tamizaje_aplicado)      { tamizaje_aplicado.value = '1397';          tamizaje_aplicado.style.backgroundColor = bgSuccess; }
                        if (resultado_glucometria)  { resultado_glucometria.value = '0';         resultado_glucometria.style.backgroundColor = bgSuccess; }
                    }
                    if ([62, 63, 64, 65, 66, 2482].includes(v)) {
                        if (etnia)  { etnia.value = '84';   etnia.style.backgroundColor = bgSuccess; }
                        if (pais)   { pais.value = '236';   pais.style.backgroundColor = bgSuccess; }
                        if (pob_dif_inclusion)      { pob_dif_inclusion.value = '4051';       pob_dif_inclusion.style.backgroundColor = bgSuccess; }
                        if (categoria_discapacidad) { categoria_discapacidad.value = '3822';  categoria_discapacidad.style.backgroundColor = bgSuccess; }
                        if (canalizacion)           { canalizacion.value = '959';             canalizacion.style.backgroundColor = bgSuccess; }
                        if (porquenosecanalizo)     { porquenosecanalizo.value = '4517';      porquenosecanalizo.style.backgroundColor = bgSuccess; }
                        if (alerta_mujeres)         { alerta_mujeres.value = '2610';           alerta_mujeres.style.backgroundColor = bgSuccess; }
                        if (etapa_gestacion)        { etapa_gestacion.value = '3785';          etapa_gestacion.style.backgroundColor = bgSuccess; }
                        if (frecuencia_cardiaca)    { frecuencia_cardiaca.value = 'NA';         frecuencia_cardiaca.style.backgroundColor = bgSuccess; }
                        if (tension_arterial)       { tension_arterial.value = 'NA';            tension_arterial.style.backgroundColor = bgSuccess; }
                        if (spo2)                   { spo2.value = 'NA';                        spo2.style.backgroundColor = bgSuccess; }
                        if (tamizaje_aplicado)      { tamizaje_aplicado.value = '1397';          tamizaje_aplicado.style.backgroundColor = bgSuccess; }
                        if (resultado_glucometria)  { resultado_glucometria.value = '0';         resultado_glucometria.style.backgroundColor = bgSuccess; }
                    }
                }

                if (sexoActual !== ultimoSexo) {
                    ultimoSexo = sexoActual;
                    const docValue = tipo_doc.value;
                    // Tipos de documento que usan la asignación completa de sexo/género/identidad:
                    // 59=CC, 62=CE, 64=Pasaporte, 65=Adulto sin ID., 2482=PPT
                    const tiposConGeneroCompleto = ['59', '62', '64', '65', '2482'];
                    if (tiposConGeneroCompleto.includes(docValue)) {
                        if (sexoActual === '67') {
                            sexo.style.backgroundColor = bgSuccess;
                            if (genero)           { genero.value = '70';    genero.style.backgroundColor = bgSuccess; }
                            if (identidad_genero) { identidad_genero.value = '4515'; identidad_genero.style.backgroundColor = bgSuccess; }
                        } else if (sexoActual === '68') {
                            sexo.style.backgroundColor = bgSuccess;
                            if (genero)           { genero.value = '71';    genero.style.backgroundColor = bgSuccess; }
                            if (identidad_genero) { identidad_genero.value = '4514'; identidad_genero.style.backgroundColor = bgSuccess; }
                        }
                    } else if (sexoActual === '67' || sexoActual === '68') {
                        if (genero)           { genero.value = '4513';    genero.style.backgroundColor = bgSuccess; }
                        sexo.style.backgroundColor = bgSuccess;
                        if (identidad_genero) { identidad_genero.value = '4020'; identidad_genero.style.backgroundColor = bgSuccess; }
                    }
                }

            }, 500);

        } catch (error) {
            console.error(error);
        }
    })(); // fin documentoSexoGenero

    (function autoEPI() {
        const VALOR_DEFECTO = '4258'; // No aplica

        const campos = [
            'valorControl20622', 'valorControl20623', // Cabeza (cráneo)
            'valorControl20625', 'valorControl20626', // Ojos y Cara
            'valorControl20628', 'valorControl20629', // Oídos
            'valorControl20631', 'valorControl20632', // Vías Respiratorias
            'valorControl20634', 'valorControl20635', // Cuerpo
            'valorControl20637', 'valorControl20638', // Manos y brazos
            'valorControl20640', 'valorControl20641', // Pies y piernas
            'valorControl20643', 'valorControl20644', // Cinturones seguridad altura
            'valorControl20646', 'valorControl20647', // Ropa de trabajo
        ];

        function aplicarValor(select, valor) {
            if (!select || !valor) return;
            const opt = select.querySelector(`option[value="${valor}"]`);
            if (!opt) { console.warn('❌ EPI: no se encontró value', valor, 'en', select.id); return; }
            select.value = valor;
            const span = document.getElementById('select2-' + select.id + '-container');
            if (span) {
                span.textContent = opt.text;
                span.setAttribute('title', opt.text);
            }
            select.dispatchEvent(new Event('change', { bubbles: true }));
            select.style.backgroundColor = bgSuccess;
        }

        function revisarCampos() {
            campos.forEach(id => {
                const campo = document.getElementById(id);
                // Si el campo aún no existe (tab/sección no renderizada) o ya tiene un valor, se ignora.
                if (!campo || campo.value) return;
                aplicarValor(campo, VALOR_DEFECTO);
            });
        }

        function iniciar() {
            revisarCampos();
            // Reintenta periódicamente por si los campos se renderizan después (ej. al cambiar de pestaña/sección)
            setInterval(revisarCampos, 1000);
        }

        if (document.readyState === 'complete') iniciar();
        else window.addEventListener('load', iniciar);
    })(); // fin autoEPI

    (function sincronizarCodigoActividad() {
        const ID_ACTIVIDAD_ECONOMICA = 'valorControl20551';
        const ID_CODIGO_ACTIVIDAD    = 'valorControl20549';

        function copiarValor(origen, destino) {
            if (!origen || !destino) return;
            const valor = origen.value;
            if (!valor || destino.value === valor) return;

            if (destino.tagName === 'SELECT') {
                const opt = destino.querySelector(`option[value="${valor}"]`);
                if (!opt) { console.warn('❌ Código Actividad: no se encontró value', valor); return; }
                destino.value = valor;
                const span = document.getElementById('select2-' + destino.id + '-container');
                if (span) {
                    span.textContent = opt.text;
                    span.setAttribute('title', opt.text);
                }
            } else {
                destino.value = valor;
                destino.dispatchEvent(new Event('input', { bubbles: true }));
            }
            destino.dispatchEvent(new Event('change', { bubbles: true }));
            destino.style.backgroundColor = bgSuccess;
        }

        function iniciar() {
            const actividadEconomica = document.getElementById(ID_ACTIVIDAD_ECONOMICA);
            const codigoActividad    = document.getElementById(ID_CODIGO_ACTIVIDAD);
            if (!actividadEconomica || !codigoActividad) return;

            copiarValor(actividadEconomica, codigoActividad); // por si ya tiene valor al cargar

            let ultimoValor = actividadEconomica.value;
            setInterval(() => {
                if (actividadEconomica.value !== ultimoValor) {
                    ultimoValor = actividadEconomica.value;
                    copiarValor(actividadEconomica, codigoActividad);
                }
            }, 500);
        }

        if (document.readyState === 'complete') iniciar();
        else window.addEventListener('load', iniciar);
    })(); // fin sincronizarCodigoActividad

    (function buscadorNombreEAPB() {
        const ID_EAPB = 'valorControl20706';

        function normalizar(texto) {
            return texto
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, ''); // quita tildes
        }

        function construirBuscador(select) {
            if (select.dataset.buscadorAplicado === '1') return;
            select.dataset.buscadorAplicado = '1';

            // Envolvemos el select en un contenedor relativo
            const wrapper = document.createElement('div');
            wrapper.style.position = 'relative';
            wrapper.style.display = 'inline-block';
            wrapper.style.width = select.offsetWidth ? select.offsetWidth + 'px' : '100%';
            select.parentNode.insertBefore(wrapper, select);
            wrapper.appendChild(select);

            // Ocultamos el select nativo pero lo dejamos en el DOM (el formulario lo sigue usando)
            select.style.position = 'absolute';
            select.style.opacity = '0';
            select.style.height = '0';
            select.style.width = '0';
            select.style.padding = '0';
            select.style.border = 'none';
            select.style.pointerEvents = 'none';

            // Input visual de búsqueda
            const input = document.createElement('input');
            input.type = 'text';
            input.autocomplete = 'off';
            input.placeholder = 'Buscar EAPB...';
            input.style.cssText = `
                width: 100%; box-sizing: border-box; padding: 6px 8px;
                border: 1px solid #ccc; border-radius: 4px; font-size: 13px;
            `;

            // Lista desplegable
            const lista = document.createElement('ul');
            lista.style.cssText = `
                list-style: none; margin: 2px 0 0 0; padding: 0;
                position: absolute; top: 100%; left: 0; right: 0; z-index: 9999;
                background: #fff; border: 1px solid #ccc; border-radius: 4px;
                max-height: 260px; overflow-y: auto; display: none;
                box-shadow: 0 4px 10px rgba(0,0,0,0.15);
            `;

            wrapper.appendChild(input);
            wrapper.appendChild(lista);

            const opciones = Array.from(select.options).filter(opt => opt.value !== '');

            function renderLista(filtro) {
                lista.innerHTML = '';
                const filtroNorm = normalizar(filtro || '');
                const coincidencias = opciones.filter(opt => normalizar(opt.text).includes(filtroNorm));

                if (coincidencias.length === 0) {
                    const li = document.createElement('li');
                    li.textContent = 'Sin resultados';
                    li.style.cssText = 'padding: 6px 10px; color: #888; font-size: 13px;';
                    lista.appendChild(li);
                    return;
                }

                coincidencias.forEach(opt => {
                    const li = document.createElement('li');
                    li.textContent = opt.text;
                    li.style.cssText = 'padding: 6px 10px; cursor: pointer; font-size: 13px;';
                    li.addEventListener('mousedown', (e) => {
                        e.preventDefault(); // evita que el input pierda foco antes del click
                        select.value = opt.value;
                        select.dispatchEvent(new Event('change', { bubbles: true }));
                        input.value = opt.text;
                        lista.style.display = 'none';
                    });
                    li.addEventListener('mouseenter', () => { li.style.backgroundColor = '#f0f4ff'; });
                    li.addEventListener('mouseleave', () => { li.style.backgroundColor = ''; });
                    lista.appendChild(li);
                });
            }

            input.addEventListener('focus', () => {
                renderLista(input.value);
                lista.style.display = 'block';
            });
            input.addEventListener('input', () => {
                renderLista(input.value);
                lista.style.display = 'block';
            });
            input.addEventListener('blur', () => {
                setTimeout(() => { lista.style.display = 'none'; }, 150);
            });

            // Si el select ya tenía un valor preseleccionado, lo reflejamos en el input
            if (select.value) {
                const seleccionado = opciones.find(opt => opt.value === select.value);
                if (seleccionado) input.value = seleccionado.text;
            }
        }

        function iniciar() {
            const campo = document.getElementById(ID_EAPB);
            if (campo) construirBuscador(campo);
        }

        const intervalo = setInterval(iniciar, 1000);
        // No se limpia el intervalo por si el campo se reconstruye al cambiar de pestaña (SPA)
    })(); // fin buscadorNombreEAPB

    // BLOQUE 2 — VALIDADOR EDAD/DOCUMENTO
    (function validadorEdadDocumento() {

        const ID_EDAD      = 'valorControl20696';
        const ID_DOCUMENTO = 'valorControl20688';

        // ⚠️ Ajusta estos códigos si en la nueva base cambian los valores del select de documento
        const reglasDocumento = {
            '60': { nombre: 'Registro Civil',       edadMin: 0,  edadMax: 6   },
            '61': { nombre: 'Tarjeta de Identidad', edadMin: 7,  edadMax: 17  },
            '59': { nombre: 'Cédula de Ciudadanía', edadMin: 18, edadMax: 999 },
        };

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
            if (document.querySelector(`[id*="${ID_EDAD}"]`)) setTimeout(iniciarValidador, 800);
        }

        if (document.readyState === 'complete') detectarYEjecutar();
        else window.addEventListener('load', detectarYEjecutar);

    })(); // fin validadorEdadDocumento

    (function formatoTiempoTrabajoActividad() {
        const ID_CAMPO = 'valorControl20708';

        function formatear(valor) {
            let limpio = valor.replace(/\D/g, '').slice(0, 4);
            if (limpio.length > 2) {
                limpio = limpio.slice(0, 2) + '_' + limpio.slice(2);
            }
            return limpio;
        }

        function aplicarFormato(input) {
            if (input.dataset.formatoAplicado === '1') return;
            input.dataset.formatoAplicado = '1';

            input.addEventListener('input', () => {
                const cursorAlFinal = input.selectionStart === input.value.length;
                input.value = formatear(input.value);
                if (cursorAlFinal) {
                    input.selectionStart = input.selectionEnd = input.value.length;
                }
            });
        }

        function iniciar() {
            const campo = document.getElementById(ID_CAMPO);
            if (campo) aplicarFormato(campo);
        }

        setInterval(iniciar, 1000);
    })(); // fin formatoTiempoTrabajoActividad

    (function porcentajeSemaforizacion() {
        const IDS_PORCENTAJE = [
            'valorControl20573',
            'valorControl20566',
            'valorControl20587',
            'valorControl20562',
            'valorControl20580',
            // Porcentaje de trabajadores que apropian prácticas saludables en las UT
            'valorControl20848',
            // Valoración Inicial de la UTI
            'valorControl20850',
            // Valoración Final de la UTI - Monitoreo
            'valorControl20851',
        ];

        function limpiarValor(valor) {
            return valor.replace('%', '').trim();
        }

        function aplicarFormato(input) {
            if (input.dataset.porcentajeAplicado === '1') return;
            input.dataset.porcentajeAplicado = '1';

            // Al enfocar, quita el % para que pueda editar el número limpio
            input.addEventListener('focus', () => {
                input.value = limpiarValor(input.value);
            });

            // Al salir del campo, agrega el % si hay un valor
            input.addEventListener('blur', () => {
                const limpio = limpiarValor(input.value);
                if (limpio !== '') {
                    input.value = limpio + '%';
                }
            });
        }

        function iniciar() {
            IDS_PORCENTAJE.forEach(id => {
                const campo = document.getElementById(id);
                if (campo) aplicarFormato(campo);
            });
        }

        setInterval(iniciar, 1000);
    })(); // fin porcentajeSemaforizacion

})();
