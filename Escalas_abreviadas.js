// ==UserScript==
// @name         GESI - Base 65 - Tamizaje Escala Abreviada de Desarrollo
// @namespace    http://tampermonkey.net/
// @version      3.0
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
                    area: 'MG',
                    acumuladoId: 'valorControl21703',
                    itemsId: 'valorControl21706',
                    totalId: 'valorControl21709',
                    ptId: 'valorControl21712',
                    semaforoId: 'valorControl21715'
                },
                {
                    area: 'MF',
                    acumuladoId: 'valorControl21724',
                    itemsId: 'valorControl21725',
                    totalId: 'valorControl21726',
                    ptId: 'valorControl21727',
                    semaforoId: 'valorControl21728'
                },
                {
                    area: 'AL',
                    acumuladoId: 'valorControl21742',
                    itemsId: 'valorControl21743',
                    totalId: 'valorControl21744',
                    ptId: 'valorControl21745',
                    semaforoId: 'valorControl21746'
                },
                {
                    area: 'PS',
                    acumuladoId: 'valorControl21760',
                    itemsId: 'valorControl21761',
                    totalId: 'valorControl21762',
                    ptId: 'valorControl21763',
                    semaforoId: 'valorControl21764'
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
                    area: 'MG',
                    acumuladoId: 'valorControl21704',
                    itemsId: 'valorControl21707',
                    totalId: 'valorControl21710',
                    ptId: 'valorControl21713',
                    semaforoId: 'valorControl21716'
                },
                {
                    area: 'MF',
                    acumuladoId: 'valorControl21730',
                    itemsId: 'valorControl21731',
                    totalId: 'valorControl21732',
                    ptId: 'valorControl21733',
                    semaforoId: 'valorControl21734'
                },
                {
                    area: 'AL',
                    acumuladoId: 'valorControl21748',
                    itemsId: 'valorControl21749',
                    totalId: 'valorControl21750',
                    ptId: 'valorControl21751',
                    semaforoId: 'valorControl21752'
                },
                {
                    area: 'PS',
                    acumuladoId: 'valorControl21766',
                    itemsId: 'valorControl21767',
                    totalId: 'valorControl21768',
                    ptId: 'valorControl21769',
                    semaforoId: 'valorControl21770'
                }
            ]
        }
    };


    const RANGOS_EDAD = [
        { rango: 1, desdeMeses: 0, desdeDias: 0, hastaMeses: 1, hastaDias: 0 },
        { rango: 2, desdeMeses: 1, desdeDias: 1, hastaMeses: 3, hastaDias: 0 },
        { rango: 3, desdeMeses: 3, desdeDias: 1, hastaMeses: 6, hastaDias: 0 },
        { rango: 4, desdeMeses: 6, desdeDias: 1, hastaMeses: 9, hastaDias: 0 },
        { rango: 5, desdeMeses: 9, desdeDias: 1, hastaMeses: 12, hastaDias: 0 },
        { rango: 6, desdeMeses: 12, desdeDias: 1, hastaMeses: 18, hastaDias: 0 },
        { rango: 7, desdeMeses: 18, desdeDias: 1, hastaMeses: 24, hastaDias: 0 },
        { rango: 8, desdeMeses: 24, desdeDias: 1, hastaMeses: 36, hastaDias: 0 },
        { rango: 9, desdeMeses: 36, desdeDias: 1, hastaMeses: 48, hastaDias: 0 },
        { rango: 10, desdeMeses: 48, desdeDias: 1, hastaMeses: 60, hastaDias: 0 },
        { rango: 11, desdeMeses: 60, desdeDias: 1, hastaMeses: 72, hastaDias: 0 },
        { rango: 12, desdeMeses: 72, desdeDias: 1, hastaMeses: 84, hastaDias: 0 }
    ];


    const TABLA_SEMAFORO = {
        1: {
            MG: { rojoHasta: 35, amarilloHasta: 47 },
            MF: { rojoHasta: 31, amarilloHasta: 51 },
            AL: { rojoHasta: 19, amarilloHasta: 29 },
            PS: { rojoHasta: 16, amarilloHasta: 33 }
        },

        2: {
            MG: { rojoHasta: 30, amarilloHasta: 40 },
            MF: { rojoHasta: 25, amarilloHasta: 32 },
            AL: { rojoHasta: 30, amarilloHasta: 39 },
            PS: { rojoHasta: 33, amarilloHasta: 40 }
        },

        3: {
            MG: { rojoHasta: 32, amarilloHasta: 41 },
            MF: { rojoHasta: 33, amarilloHasta: 39 },
            AL: { rojoHasta: 24, amarilloHasta: 40 },
            PS: { rojoHasta: 33, amarilloHasta: 39 }
        },

        4: {
            MG: { rojoHasta: 36, amarilloHasta: 43 },
            MF: { rojoHasta: 38, amarilloHasta: 45 },
            AL: { rojoHasta: 26, amarilloHasta: 41 },
            PS: { rojoHasta: 33, amarilloHasta: 39 }
        },

        5: {
            MG: { rojoHasta: 34, amarilloHasta: 40 },
            MF: { rojoHasta: 38, amarilloHasta: 44 },
            AL: { rojoHasta: 35, amarilloHasta: 42 },
            PS: { rojoHasta: 45, amarilloHasta: null }
        },

        6: {
            MG: { rojoHasta: 33, amarilloHasta: 39 },
            MF: { rojoHasta: 45, amarilloHasta: null },
            AL: { rojoHasta: 38, amarilloHasta: 44 },
            PS: { rojoHasta: 37, amarilloHasta: 41 }
        },

        7: {
            MG: { rojoHasta: 32, amarilloHasta: 42 },
            MF: { rojoHasta: 34, amarilloHasta: 40 },
            AL: { rojoHasta: 33, amarilloHasta: 43 },
            PS: { rojoHasta: 30, amarilloHasta: 39 }
        },

        8: {
            MG: { rojoHasta: 29, amarilloHasta: 38 },
            MF: { rojoHasta: 34, amarilloHasta: 40 },
            AL: { rojoHasta: 32, amarilloHasta: 42 },
            PS: { rojoHasta: 29, amarilloHasta: 41 }
        },

        9: {
            MG: { rojoHasta: 32, amarilloHasta: 40 },
            MF: { rojoHasta: 32, amarilloHasta: 38 },
            AL: { rojoHasta: 30, amarilloHasta: 39 },
            PS: { rojoHasta: 30, amarilloHasta: 42 }
        },

        10: {
            MG: { rojoHasta: 33, amarilloHasta: 42 },
            MF: { rojoHasta: 29, amarilloHasta: 42 },
            AL: { rojoHasta: 33, amarilloHasta: 42 },
            PS: { rojoHasta: 32, amarilloHasta: 40 }
        },

        11: {
            MG: { rojoHasta: 29, amarilloHasta: 42 },
            MF: { rojoHasta: 34, amarilloHasta: 40 },
            AL: { rojoHasta: 34, amarilloHasta: 40 },
            PS: { rojoHasta: 32, amarilloHasta: 38 }
        },

        12: {
            MG: { rojoHasta: 36, amarilloHasta: 50 },
            MF: { rojoHasta: 36, amarilloHasta: 45 },
            AL: { rojoHasta: 30, amarilloHasta: 46 },
            PS: { rojoHasta: 38, amarilloHasta: 60 }
        }
    };

    function obtenerElemento(id) {
        return document.getElementById(id);
    }

    function leerTexto(id) {
        const elemento = obtenerElemento(id);

        if (!elemento) {
            return '';
        }

        return String(elemento.value || '').trim();
    }

    function leerValorNumerico(id) {
        const valor = leerTexto(id);

        if (valor === '') {
            return null;
        }

        const numero = Number(valor.replace(',', '.'));

        return Number.isFinite(numero) ? numero : null;
    }

    function tieneDato(id) {
        return leerTexto(id) !== '';
    }

    function dispararEventos(elemento) {
        if (!elemento) return;

        elemento.dispatchEvent(new Event('input', {
            bubbles: true
        }));

        elemento.dispatchEvent(new Event('change', {
            bubbles: true
        }));
    }

    function escribirValor(id, valor) {
        const elemento = obtenerElemento(id);

        if (!elemento) return;

        const valorTexto = String(valor);

        if (String(elemento.value) === valorTexto) {
            return;
        }

        elemento.value = valorTexto;
        dispararEventos(elemento);
    }

    function aplicarColor(elemento, valorSemaforo) {
        if (!elemento) return;

        elemento.style.backgroundColor = '';
        elemento.style.border = '';

        if (valorSemaforo === 1) {
            elemento.style.backgroundColor = '#d4edda';
            elemento.style.border = '1px solid #28a745';
        } else if (valorSemaforo === 2) {
            elemento.style.backgroundColor = '#fff3cd';
            elemento.style.border = '1px solid #ffc107';
        } else if (valorSemaforo === 3) {
            elemento.style.backgroundColor = '#f8d7da';
            elemento.style.border = '1px solid #dc3545';
        }
    }

    function quitarColor(elemento) {
        if (!elemento) return;

        elemento.style.backgroundColor = '';
        elemento.style.border = '';
    }

    function compararEdad(mesesA, diasA, mesesB, diasB) {
        if (mesesA !== mesesB) {
            return mesesA - mesesB;
        }

        return diasA - diasB;
    }

    function obtenerRangoEdad(anios, meses, dias) {
        if (
            anios === null ||
            meses === null ||
            dias === null ||
            anios < 0 ||
            meses < 0 ||
            meses > 11 ||
            dias < 0 ||
            dias > 31
        ) {
            return null;
        }

        const mesesTotales = (anios * 12) + meses;

        const rangoEncontrado = RANGOS_EDAD.find(rango => {
            const esMayorOIgualAlInicio =
                compararEdad(
                    mesesTotales,
                    dias,
                    rango.desdeMeses,
                    rango.desdeDias
                ) >= 0;

            const esMenorOIgualAlFinal =
                compararEdad(
                    mesesTotales,
                    dias,
                    rango.hastaMeses,
                    rango.hastaDias
                ) <= 0;

            return esMayorOIgualAlInicio && esMenorOIgualAlFinal;
        });

        return rangoEncontrado ? rangoEncontrado.rango : null;
    }

    function obtenerRangoDeMomento(configuracionMomento) {
        const anios = leerValorNumerico(configuracionMomento.edad.aniosId);
        const meses = leerValorNumerico(configuracionMomento.edad.mesesId);
        const dias = leerValorNumerico(configuracionMomento.edad.diasId);

        if (anios === null || meses === null || dias === null) {
            return null;
        }

        return obtenerRangoEdad(anios, meses, dias);
    }

    function obtenerValorSemaforo(pt, rango, area) {
        if (pt === null || rango === null || !area) {
            return null;
        }

        const configuracionRango = TABLA_SEMAFORO[rango];

        if (!configuracionRango) {
            return null;
        }

        const configuracionArea = configuracionRango[area];

        if (!configuracionArea) {
            return null;
        }

        if (pt <= configuracionArea.rojoHasta) {
            return 3;
        }

        if (
            configuracionArea.amarilloHasta !== null &&
            pt <= configuracionArea.amarilloHasta
        ) {
            return 2;
        }

        return 1;
    }

    function seleccionarValorSemaforo(campo, valorSemaforo) {
        if (!campo) {
            return false;
        }

        const valorTexto = String(valorSemaforo);

        const opcionPorValor = Array.from(campo.options || []).find(
            opcion => String(opcion.value) === valorTexto
        );

        if (opcionPorValor) {
            const cambio = String(campo.value) !== valorTexto;

            campo.value = valorTexto;

            if (cambio) {
                dispararEventos(campo);
            }

            return true;
        }

        const nombresColor = {
            1: 'verde',
            2: 'amarillo',
            3: 'rojo'
        };

        const nombreColor = nombresColor[valorSemaforo];

        const opcionPorTexto = Array.from(campo.options || []).find(
            opcion => String(opcion.textContent || '')
                .trim()
                .toLowerCase()
                .includes(nombreColor)
        );

        if (opcionPorTexto) {
            const cambio = campo.value !== opcionPorTexto.value;

            campo.value = opcionPorTexto.value;

            if (cambio) {
                dispararEventos(campo);
            }

            return true;
        }

        console.warn(
            `No se encontró la opción del semáforo con valor ${valorSemaforo}`,
            campo
        );

        return false;
    }

    function actualizarSemaforo(grupo, configuracionMomento) {
        const campoPT = obtenerElemento(grupo.ptId);
        const campoSemaforo = obtenerElemento(grupo.semaforoId);

        if (!campoPT || !campoSemaforo) {
            return;
        }

        const pt = leerValorNumerico(grupo.ptId);

        if (pt === null) {
            if (campoSemaforo.tagName === 'SELECT') {
                campoSemaforo.value = '';
                dispararEventos(campoSemaforo);
            } else {
                campoSemaforo.value = '';
            }

            quitarColor(campoSemaforo);
            return;
        }

        const rango = obtenerRangoDeMomento(configuracionMomento);

        if (rango === null) {
            console.warn(
                'No se pudo determinar el rango de edad',
                configuracionMomento,
                grupo
            );
            return;
        }

        const valorSemaforo = obtenerValorSemaforo(
            pt,
            rango,
            grupo.area
        );

        if (valorSemaforo === null) {
            return;
        }

        seleccionarValorSemaforo(
            campoSemaforo,
            valorSemaforo
        );

        aplicarColor(
            campoSemaforo,
            valorSemaforo
        );
    }

    function crearFechaDesdeCampos(configuracionFecha) {
        const anio = leerValorNumerico(configuracionFecha.aniosId);
        const mes = leerValorNumerico(configuracionFecha.mesesId);
        const dia = leerValorNumerico(configuracionFecha.diasId);

        if (anio === null || mes === null || dia === null) {
            return null;
        }

        if (
            anio < 0 ||
            mes < 1 ||
            mes > 12 ||
            dia < 1 ||
            dia > 31
        ) {
            return null;
        }

        const fecha = new Date(anio, mes - 1, dia);

        if (
            fecha.getFullYear() !== anio ||
            fecha.getMonth() !== mes - 1 ||
            fecha.getDate() !== dia
        ) {
            return null;
        }

        return fecha;
    }

    function calcularDiferenciaFechas(fechaMayor, fechaMenor) {
        let anios =
            fechaMayor.getFullYear() -
            fechaMenor.getFullYear();

        let meses =
            fechaMayor.getMonth() -
            fechaMenor.getMonth();

        let dias =
            fechaMayor.getDate() -
            fechaMenor.getDate();

        if (dias < 0) {
            meses--;

            const ultimoDiaMesAnterior = new Date(
                fechaMayor.getFullYear(),
                fechaMayor.getMonth(),
                0
            );

            dias += ultimoDiaMesAnterior.getDate();
        }

        if (meses < 0) {
            anios--;
            meses += 12;
        }

        return {
            anios,
            meses,
            dias
        };
    }

    function actualizarEdadMomento(configuracionMomento) {
        const fechaEvaluacion = crearFechaDesdeCampos(
            configuracionMomento.fechaEvaluacion
        );

        const fechaNacimiento = crearFechaDesdeCampos(
            configuracionMomento.fechaNacimiento
        );

        if (!fechaEvaluacion || !fechaNacimiento) {
            return;
        }

        if (fechaNacimiento > fechaEvaluacion) {
            return;
        }

        const edad = calcularDiferenciaFechas(
            fechaEvaluacion,
            fechaNacimiento
        );

        escribirValor(
            configuracionMomento.edad.aniosId,
            edad.anios
        );

        escribirValor(
            configuracionMomento.edad.mesesId,
            edad.meses
        );

        escribirValor(
            configuracionMomento.edad.diasId,
            edad.dias
        );

        const totalMeses =
            (edad.anios * 12) + edad.meses;

        configuracionMomento.edadMesesReplicaIds.forEach(id => {
            escribirValor(id, totalMeses);
        });
    }

    function actualizarPuntuacionPD(grupo) {
        const acumulado = leerValorNumerico(grupo.acumuladoId);
        const items = leerValorNumerico(grupo.itemsId);

        if (acumulado === null || items === null) {
            return;
        }

        escribirValor(
            grupo.totalId,
            acumulado + items
        );
    }

    function actualizarPuntuacionesMomento(configuracionMomento) {
        configuracionMomento.puntuacionPD.forEach(grupo => {
            actualizarPuntuacionPD(grupo);
            actualizarSemaforo(grupo, configuracionMomento);
        });
    }

    function actualizarFechaEvaluacionSeparada() {
        const campoFecha = obtenerElemento(FECHA_EVALUACION_ID);

        if (!campoFecha) {
            return;
        }

        const texto = String(campoFecha.value || '').trim();

        if (!texto) {
            return;
        }

        const partes = texto.split('/');

        if (partes.length !== 3) {
            return;
        }

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

        const fecha = new Date(
            anioNumero,
            mesNumero - 1,
            diaNumero
        );

        if (
            fecha.getFullYear() !== anioNumero ||
            fecha.getMonth() !== mesNumero - 1 ||
            fecha.getDate() !== diaNumero
        ) {
            return;
        }

        escribirValor(
            FECHA_EVALUACION_SEPARADA.aniosId,
            anioNumero
        );

        escribirValor(
            FECHA_EVALUACION_SEPARADA.mesesId,
            mesNumero
        );

        escribirValor(
            FECHA_EVALUACION_SEPARADA.diasId,
            diaNumero
        );
    }

    function copiarFechaNacimientoCaracterizacionAEvaluacion() {
        const campoFechaEvaluacion =
            obtenerElemento(FECHA_EVALUACION_ID);

        if (
            !campoFechaEvaluacion ||
            !String(campoFechaEvaluacion.value || '').trim()
        ) {
            return;
        }

        const origen =
            MOMENTOS.caracterizacion.fechaNacimiento;

        const destino =
            MOMENTOS.evaluacion.fechaNacimiento;

        const anio = leerValorNumerico(origen.aniosId);
        const mes = leerValorNumerico(origen.mesesId);
        const dia = leerValorNumerico(origen.diasId);

        if (anio === null || mes === null || dia === null) {
            return;
        }

        escribirValor(destino.aniosId, anio);
        escribirValor(destino.mesesId, mes);
        escribirValor(destino.diasId, dia);
    }

    function aplicarEntornoPorDefecto() {
        const select = obtenerElemento(ENTORNO_ID);

        if (!select || select.tagName !== 'SELECT') {
            return;
        }

        if (select.value) {
            return;
        }

        const opcion = Array.from(select.options).find(
            opcion =>
                opcion.textContent
                    .trim()
                    .toLowerCase() ===
                ENTORNO_TEXTO_DEFECTO.toLowerCase()
        );

        if (opcion) {
            select.value = opcion.value;
            dispararEventos(select);
            aplicarColor(select, 1);
        }
    }

    function aplicarLocalidadDesdeFicha() {
        const inputFicha = obtenerElemento(FICHA_ID);
        const selectLocalidad = obtenerElemento(LOCALIDAD_ID);

        if (!inputFicha || !selectLocalidad) {
            return;
        }

        if (selectLocalidad.value) {
            return;
        }

        const numeroFicha =
            String(inputFicha.value || '').trim();

        if (numeroFicha.length < 3) {
            return;
        }

        const codigoLocalidad =
            numeroFicha.substring(1, 3);

        const opcion = Array.from(selectLocalidad.options).find(
            opcion =>
                opcion.textContent
                    .trim()
                    .startsWith(codigoLocalidad + ' - ')
        );

        if (opcion) {
            selectLocalidad.value = opcion.value;
            dispararEventos(selectLocalidad);
            aplicarColor(selectLocalidad, 1);
        }
    }

    function obtenerClaveInstitucionPorFicha() {
        const inputFicha = obtenerElemento(FICHA_ID);

        if (!inputFicha) {
            return null;
        }

        const numeroFicha =
            String(inputFicha.value || '').trim();

        if (!numeroFicha) {
            return null;
        }

        return CLAVE_INSTITUCION_PREFIJO + numeroFicha;
    }

    function sincronizarNombreInstitucion() {
        const campoInstitucion =
            obtenerElemento(NOMBRE_INSTITUCION_ID);

        const clave =
            obtenerClaveInstitucionPorFicha();

        if (!campoInstitucion || !clave) {
            return;
        }

        let nombreGuardado = '';

        try {
            nombreGuardado =
                localStorage.getItem(clave) || '';
        } catch (error) {
            console.warn(
                'No fue posible consultar la institución:',
                error
            );
        }

        const nombreActual =
            String(campoInstitucion.value || '').trim();

        if (nombreActual) {
            try {
                localStorage.setItem(clave, nombreActual);
            } catch (error) {
                console.warn(
                    'No fue posible guardar la institución:',
                    error
                );
            }

            aplicarColor(campoInstitucion, 1);
            return;
        }

        if (nombreGuardado) {
            escribirValor(
                NOMBRE_INSTITUCION_ID,
                nombreGuardado
            );

            aplicarColor(campoInstitucion, 1);
        }
    }

    function procesarFicha() {
        aplicarEntornoPorDefecto();
        aplicarLocalidadDesdeFicha();
        sincronizarNombreInstitucion();

        actualizarFechaEvaluacionSeparada();
        copiarFechaNacimientoCaracterizacionAEvaluacion();

        Object.values(MOMENTOS).forEach(configuracionMomento => {
            actualizarEdadMomento(configuracionMomento);
            actualizarPuntuacionesMomento(configuracionMomento);
        });
    }

    const IDS_RELEVANTES = Object.values(MOMENTOS).flatMap(
        configuracionMomento => [
            configuracionMomento.fechaEvaluacion.aniosId,
            configuracionMomento.fechaEvaluacion.mesesId,
            configuracionMomento.fechaEvaluacion.diasId,
            configuracionMomento.fechaNacimiento.aniosId,
            configuracionMomento.fechaNacimiento.mesesId,
            configuracionMomento.fechaNacimiento.diasId,
            ...configuracionMomento.puntuacionPD.flatMap(grupo => [
                grupo.acumuladoId,
                grupo.itemsId,
                grupo.ptId
            ])
        ]
    );

    let procesamientoPendiente = false;

    function programarProcesamiento() {
        if (procesamientoPendiente) {
            return;
        }

        procesamientoPendiente = true;

        requestAnimationFrame(() => {
            procesamientoPendiente = false;
            procesarFicha();
        });
    }

    document.addEventListener('input', evento => {
        const id = evento.target && evento.target.id;

        if (
            id === FECHA_EVALUACION_ID ||
            id === FICHA_ID ||
            id === NOMBRE_INSTITUCION_ID ||
            IDS_RELEVANTES.includes(id)
        ) {
            programarProcesamiento();
        }
    }, true);

    document.addEventListener('change', evento => {
        const id = evento.target && evento.target.id;

        if (
            id === FECHA_EVALUACION_ID ||
            id === FICHA_ID ||
            id === NOMBRE_INSTITUCION_ID ||
            IDS_RELEVANTES.includes(id)
        ) {
            programarProcesamiento();
        }
    }, true);

    const observador = new MutationObserver(mutations => {
        const huboCambios = mutations.some(mutation =>
            mutation.type === 'childList' &&
            mutation.addedNodes &&
            mutation.addedNodes.length > 0
        );

        if (huboCambios) {
            programarProcesamiento();
        }
    });

    function iniciarObservador() {
        if (!document.body) {
            return;
        }

        observador.observe(document.body, {
            childList: true,
            subtree: true
        });

        programarProcesamiento();
    }

    if (document.readyState === 'loading') {
        document.addEventListener(
            'DOMContentLoaded',
            iniciarObservador,
            { once: true }
        );
    } else {
        iniciarObservador();
    }
})();
