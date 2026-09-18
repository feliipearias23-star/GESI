// ==UserScript==
// @name         GESI - Base 65 - Tamizaje Escala Abreviada de Desarrollo
// @namespace    http://tampermonkey.net/
// @version      2.4
// @description  Automatiza campos de Caracterización y Evaluación de la ficha Base 65 en GESI
// @author       Cristhian
// @match        https://gesiapps.saludcapital.gov.co/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const FICHA_ID = 'Ficha_fic';
    const ENTORNO_ID = 'valorControl21654';
    const ENTORNO_TEXTO_DEFECTO = 'Institucional';
    const LOCALIDAD_ID = 'valorControl21656';
    const NOMBRE_INSTITUCION_ID = 'valorControl21655';
    const CLAVE_INSTITUCION_PREFIJO = 'gesi_base65_institucion_';

    // Fecha de evaluación: campo completo DD/MM/AAAA
    const FECHA_EVALUACION_ID = 'valorControl21652';
    const FECHA_EVALUACION_SEPARADA = {
        aniosId: 'valorControl21686',
        mesesId: 'valorControl21687',
        diasId: 'valorControl21688'
    };

    const MOMENTOS = {
        caracterizacion: {
            fechaEvaluacion: {
                aniosId: 'valorControl21673',
                mesesId: 'valorControl21674',
                diasId: 'valorControl21675'
            },
            fechaNacimiento: {
                aniosId: 'valorControl21676',
                mesesId: 'valorControl21677',
                diasId: 'valorControl21678'
            },
            edad: {
                aniosId: 'valorControl21679',
                mesesId: 'valorControl21680',
                diasId: 'valorControl21681'
            },
            edadMesesReplicaIds: [
                'valorControl21700',
                'valorControl21723',
                'valorControl21741',
                'valorControl21759'
            ],
            puntuacionPD: [
                {
                    acumuladoId: 'valorControl21703',
                    itemsId: 'valorControl21706',
                    totalId: 'valorControl21709'
                },
                {
                    acumuladoId: 'valorControl21724',
                    itemsId: 'valorControl21725',
                    totalId: 'valorControl21726'
                },
                {
                    acumuladoId: 'valorControl21742',
                    itemsId: 'valorControl21743',
                    totalId: 'valorControl21744'
                },
                {
                    acumuladoId: 'valorControl21760',
                    itemsId: 'valorControl21761',
                    totalId: 'valorControl21762'
                }
            ]
        },

        evaluacion: {
            fechaEvaluacion: {
                aniosId: 'valorControl21686',
                mesesId: 'valorControl21687',
                diasId: 'valorControl21688'
            },
            fechaNacimiento: {
                aniosId: 'valorControl21689',
                mesesId: 'valorControl21690',
                diasId: 'valorControl21691'
            },
            edad: {
                aniosId: 'valorControl21692',
                mesesId: 'valorControl21693',
                diasId: 'valorControl21694'
            },
            edadMesesReplicaIds: [
                'valorControl21701',
                'valorControl21729',
                'valorControl21747',
                'valorControl21765'
            ],
            puntuacionPD: [
                {
                    acumuladoId: 'valorControl21704',
                    itemsId: 'valorControl21707',
                    totalId: 'valorControl21710'
                },
                {
                    acumuladoId: 'valorControl21730',
                    itemsId: 'valorControl21731',
                    totalId: 'valorControl21732'
                },
                {
                    acumuladoId: 'valorControl21748',
                    itemsId: 'valorControl21749',
                    totalId: 'valorControl21750'
                },
                {
                    acumuladoId: 'valorControl21766',
                    itemsId: 'valorControl21767',
                    totalId: 'valorControl21768'
                }
            ]
        }
    };

    function obtenerElemento(id) {
        return document.getElementById(id);
    }

    function leerValorNumerico(id) {
        const elemento = obtenerElemento(id);

        if (!elemento || elemento.value === '' || elemento.value === null) {
            return null;
        }

        const numero = parseInt(elemento.value, 10);

        return Number.isNaN(numero) ? null : numero;
    }

    function marcarVerde(elemento) {
        if (!elemento) return;

        elemento.style.backgroundColor = '#d4edda';
        elemento.style.border = '1px solid #28a745';
    }

    function escribirValor(id, valor) {
        const elemento = obtenerElemento(id);

        if (!elemento) return;

        marcarVerde(elemento);

        const valorTexto = String(valor);

        if (elemento.value === valorTexto) {
            return;
        }

        elemento.value = valorTexto;

        elemento.dispatchEvent(new Event('input', {
            bubbles: true
        }));

        elemento.dispatchEvent(new Event('change', {
            bubbles: true
        }));
    }

    function actualizarFechaEvaluacionSeparada() {
        const campoFecha = obtenerElemento(FECHA_EVALUACION_ID);

        if (!campoFecha) return;

        const fechaTexto = campoFecha.value.trim();

        if (!fechaTexto) return;

        const partes = fechaTexto.split('/');

        if (partes.length !== 3) return;

        const dia = partes[0].trim().padStart(2, '0');
        const mes = partes[1].trim().padStart(2, '0');
        const anio = partes[2].trim();

        if (
            !/^\d{2}$/.test(dia) ||
            !/^\d{2}$/.test(mes) ||
            !/^\d{4}$/.test(anio)
        ) {
            return;
        }

        const diaNumero = Number(dia);
        const mesNumero = Number(mes);
        const anioNumero = Number(anio);

        const fechaValida = new Date(
            anioNumero,
            mesNumero - 1,
            diaNumero
        );

        if (
            fechaValida.getFullYear() !== anioNumero ||
            fechaValida.getMonth() !== mesNumero - 1 ||
            fechaValida.getDate() !== diaNumero
        ) {
            return;
        }

        const campoAnio = obtenerElemento(FECHA_EVALUACION_SEPARADA.aniosId);
        const campoMes = obtenerElemento(FECHA_EVALUACION_SEPARADA.mesesId);
        const campoDia = obtenerElemento(FECHA_EVALUACION_SEPARADA.diasId);

        if (!campoAnio || !campoMes || !campoDia) {
            return;
        }

        escribirValor(campoAnio.id, anioNumero);
        escribirValor(campoMes.id, mes);
        escribirValor(campoDia.id, dia);
    }

    function copiarFechaNacimientoCaracterizacionAEvaluacion() {
        const campoFechaEvaluacion = obtenerElemento(FECHA_EVALUACION_ID);

        if (!campoFechaEvaluacion || !campoFechaEvaluacion.value.trim()) {
            return;
        }

        const fechaNacimientoCaracterizacion = MOMENTOS.caracterizacion.fechaNacimiento;
        const fechaNacimientoEvaluacion = MOMENTOS.evaluacion.fechaNacimiento;

        const anio = leerValorNumerico(fechaNacimientoCaracterizacion.aniosId);
        const mes = leerValorNumerico(fechaNacimientoCaracterizacion.mesesId);
        const dia = leerValorNumerico(fechaNacimientoCaracterizacion.diasId);

        if (anio === null || mes === null || dia === null) {
            return;
        }

        escribirValor(fechaNacimientoEvaluacion.aniosId, anio);
        escribirValor(fechaNacimientoEvaluacion.mesesId, mes);
        escribirValor(fechaNacimientoEvaluacion.diasId, dia);
    }

    function aplicarEntornoPorDefecto() {
        const select = obtenerElemento(ENTORNO_ID);

        if (!select || select.tagName !== 'SELECT') {
            return;
        }

        if (select.value && select.value !== '') {
            return;
        }

        const opcion = Array.from(select.options).find(
            opt => opt.textContent.trim().toLowerCase() === ENTORNO_TEXTO_DEFECTO.toLowerCase()
        );

        if (opcion) {
            select.value = opcion.value;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            marcarVerde(select);
        }
    }

    function aplicarLocalidadDesdeFicha() {
        const inputFicha = obtenerElemento(FICHA_ID);
        const selectLocalidad = obtenerElemento(LOCALIDAD_ID);

        if (!inputFicha || !selectLocalidad) return;
        if (selectLocalidad.value && selectLocalidad.value !== '') return;

        const numeroFicha = inputFicha.value.trim();
        if (numeroFicha.length < 3) return;

        const codigoLocalidad = numeroFicha.substring(1, 3);

        const opcion = Array.from(selectLocalidad.options).find(opt =>
            opt.textContent.trim().startsWith(codigoLocalidad + ' - ')
        );

        if (opcion) {
            selectLocalidad.value = opcion.value;
            selectLocalidad.dispatchEvent(new Event('change', { bubbles: true }));
            marcarVerde(selectLocalidad);
        }
    }

    function obtenerClaveInstitucionPorFicha() {
        const inputFicha = obtenerElemento(FICHA_ID);

        if (!inputFicha || !inputFicha.value.trim()) {
            return null;
        }

        const numeroFicha = inputFicha.value.trim();

        return `${CLAVE_INSTITUCION_PREFIJO}${numeroFicha}`;
    }

    function sincronizarNombreInstitucion() {
        const campoInstitucion = obtenerElemento(NOMBRE_INSTITUCION_ID);
        const claveInstitucion = obtenerClaveInstitucionPorFicha();

        if (!campoInstitucion || !claveInstitucion) {
            return;
        }

        let nombreGuardado = '';

        try {
            nombreGuardado = localStorage.getItem(claveInstitucion) || '';
        } catch (error) {
            console.warn('No fue posible consultar el nombre de la institución:', error);
        }

        const nombreActual = campoInstitucion.value.trim();

        if (nombreActual) {
            try {
                localStorage.setItem(claveInstitucion, nombreActual);
            } catch (error) {
                console.warn('No fue posible guardar el nombre de la institución:', error);
            }

            marcarVerde(campoInstitucion);
            return;
        }

        if (nombreGuardado) {
            escribirValor(NOMBRE_INSTITUCION_ID, nombreGuardado);
        }
    }

    function crearFechaDesdeCampos(configuracionFecha) {
        const anios = leerValorNumerico(configuracionFecha.aniosId);
        const meses = leerValorNumerico(configuracionFecha.mesesId);
        const dias = leerValorNumerico(configuracionFecha.diasId);

        if ([anios, meses, dias].some(v => v === null)) {
            return null;
        }

        if (anios < 0 || meses < 1 || meses > 12 || dias < 1 || dias > 31) {
            return null;
        }

        const fecha = new Date(anios, meses - 1, dias);

        if (
            fecha.getFullYear() !== anios ||
            fecha.getMonth() !== meses - 1 ||
            fecha.getDate() !== dias
        ) {
            return null;
        }

        return fecha;
    }

    function calcularDiferenciaFechas(fechaMayor, fechaMenor) {
        let anios = fechaMayor.getFullYear() - fechaMenor.getFullYear();
        let meses = fechaMayor.getMonth() - fechaMenor.getMonth();
        let dias = fechaMayor.getDate() - fechaMenor.getDate();

        if (dias < 0) {
            meses -= 1;
            const ultimoDiaMesAnterior = new Date(fechaMayor.getFullYear(), fechaMayor.getMonth(), 0);
            dias += ultimoDiaMesAnterior.getDate();
        }

        if (meses < 0) {
            anios -= 1;
            meses += 12;
        }

        return { anios, meses, dias };
    }

    function actualizarEdadMomento(configuracionMomento) {
        const fechaEvaluacion = crearFechaDesdeCampos(configuracionMomento.fechaEvaluacion);
        const fechaNacimiento = crearFechaDesdeCampos(configuracionMomento.fechaNacimiento);

        if (!fechaEvaluacion || !fechaNacimiento) return;
        if (fechaNacimiento > fechaEvaluacion) return;

        const edad = calcularDiferenciaFechas(fechaEvaluacion, fechaNacimiento);

        escribirValor(configuracionMomento.edad.aniosId, edad.anios);
        escribirValor(configuracionMomento.edad.mesesId, edad.meses);
        escribirValor(configuracionMomento.edad.diasId, edad.dias);

        const totalMeses = (edad.anios * 12) + edad.meses;
        configuracionMomento.edadMesesReplicaIds.forEach(id => escribirValor(id, totalMeses));
    }

    function actualizarPuntuacionPD(grupo) {
        const acumulado = leerValorNumerico(grupo.acumuladoId);
        const items = leerValorNumerico(grupo.itemsId);

        if (acumulado === null || items === null) return;

        escribirValor(grupo.totalId, acumulado + items);
    }

    function actualizarPuntuacionesMomento(configuracionMomento) {
        configuracionMomento.puntuacionPD.forEach(actualizarPuntuacionPD);
    }

    function procesarFicha() {
        if (!obtenerElemento(FICHA_ID)) return;

        aplicarEntornoPorDefecto();
        aplicarLocalidadDesdeFicha();
        sincronizarNombreInstitucion();

        // Fecha de evaluación: 21652 -> 21686 / 21687 / 21688
        actualizarFechaEvaluacionSeparada();

        // Copiar fecha de nacimiento de Caracterización a Evaluación
        copiarFechaNacimientoCaracterizacionAEvaluacion();

        Object.values(MOMENTOS).forEach(configuracionMomento => {
            actualizarEdadMomento(configuracionMomento);
            actualizarPuntuacionesMomento(configuracionMomento);
        });
    }

    const IDS_EDAD = Object.values(MOMENTOS).flatMap(momentos => [
        momentos.fechaEvaluacion.aniosId,
        momentos.fechaEvaluacion.mesesId,
        momentos.fechaEvaluacion.diasId,
        momentos.fechaNacimiento.aniosId,
        momentos.fechaNacimiento.mesesId,
        momentos.fechaNacimiento.diasId
    ]);

    const IDS_PUNTUACION = Object.values(MOMENTOS).flatMap(momentos =>
        momentos.puntuacionPD.flatMap(grupo => [grupo.acumuladoId, grupo.itemsId])
    );

    let procesamientoPendiente = false;

    function programarProcesamiento() {
        if (procesamientoPendiente) return;

        procesamientoPendiente = true;

        requestAnimationFrame(() => {
            procesamientoPendiente = false;
            procesarFicha();
        });
    }

    document.addEventListener('input', evento => {
        const id = evento.target && evento.target.id;

        if (id === FECHA_EVALUACION_ID) {
            actualizarFechaEvaluacionSeparada();
            programarProcesamiento();
            return;
        }

        if (id === FICHA_ID || id === NOMBRE_INSTITUCION_ID) {
            sincronizarNombreInstitucion();
            programarProcesamiento();
            return;
        }

        if (IDS_EDAD.includes(id) || IDS_PUNTUACION.includes(id)) {
            programarProcesamiento();
        }
    }, true);

    document.addEventListener('change', evento => {
        const id = evento.target && evento.target.id;

        if (id === FECHA_EVALUACION_ID) {
            actualizarFechaEvaluacionSeparada();
            programarProcesamiento();
            return;
        }

        if (id === FICHA_ID || id === NOMBRE_INSTITUCION_ID) {
            sincronizarNombreInstitucion();
            programarProcesamiento();
            return;
        }

        if (IDS_EDAD.includes(id) || IDS_PUNTUACION.includes(id)) {
            programarProcesamiento();
        }
    }, true);

    const observador = new MutationObserver(mutations => {
        const huboCambiosRelevantes = mutations.some(mutation =>
            mutation.type === 'childList' && mutation.addedNodes && mutation.addedNodes.length > 0
        );

        if (huboCambiosRelevantes) {
            programarProcesamiento();
        }
    });

    observador.observe(document.body, {
        childList: true,
        subtree: true
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', programarProcesamiento);
    } else {
        programarProcesamiento();
    }
})();
