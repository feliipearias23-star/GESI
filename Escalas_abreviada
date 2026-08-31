// ==UserScript==
// @name         GESI - Base 65 - Tamizaje Escala Abreviada de Desarrollo
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Automatiza campos de la ficha Tamizaje - Escala Abreviada de Desarrollo (Base 65) en GESI
// @author       Cristhian
// @match        https://gesiapps.saludcapital.gov.co/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // =========================================================
    // Configuración general
    // =========================================================
    const FICHA_ID = 'Ficha_fic';
    const ENTORNO_ID = 'valorControl21654';
    const ENTORNO_TEXTO_DEFECTO = 'Institucional';
    const LOCALIDAD_ID = 'valorControl21656';

    // Cálculo edad caracterización
    const CARAC_ANIOS_ID = 'valorControl21673';
    const CARAC_MESES_ID = 'valorControl21674';
    const CARAC_DIAS_ID  = 'valorControl21675';

    const NAC_ANIOS_ID = 'valorControl21676';
    const NAC_MESES_ID = 'valorControl21677';
    const NAC_DIAS_ID  = 'valorControl21678';

    const EDAD_ANIOS_ID = 'valorControl21679';
    const EDAD_MESES_ID = 'valorControl21680';
    const EDAD_DIAS_ID  = 'valorControl21681';

    // Campos adicionales que también deben quedar con la edad en MESES
    const EDAD_MESES_REPLICA_IDS = [
        'valorControl21700',
        'valorControl21723',
        'valorControl21741',
        'valorControl21759'
    ];

    const CAMPOS_FECHA_EDAD = [
        CARAC_ANIOS_ID, CARAC_MESES_ID, CARAC_DIAS_ID,
        NAC_ANIOS_ID, NAC_MESES_ID, NAC_DIAS_ID
    ];

    // Total puntuación directa PD = Total acumulado al inicio + Número de items correctos
    // Un grupo por cada apartado (A - Motricidad gruesa, B - Motricidad fino adaptativa,
    // C - Audición lenguaje, D - Personal social)
    const GRUPOS_PUNTUACION_PD = [
        { acumuladoId: 'valorControl21703', itemsId: 'valorControl21706', totalId: 'valorControl21709' }, // A
        { acumuladoId: 'valorControl21724', itemsId: 'valorControl21725', totalId: 'valorControl21726' }, // B
        { acumuladoId: 'valorControl21742', itemsId: 'valorControl21743', totalId: 'valorControl21744' }, // C
        { acumuladoId: 'valorControl21760', itemsId: 'valorControl21761', totalId: 'valorControl21762' }  // D
    ];
    const CAMPOS_PUNTUACION_PD = GRUPOS_PUNTUACION_PD.flatMap(g => [g.acumuladoId, g.itemsId]);

    // NOTA: el bloque de semaforización automática según "Total puntuación
    // típica PT" fue eliminado a petición del usuario, ya que los rangos
    // varían según la edad y el llenado automático no aplica.

    function aplicarEntornoPorDefecto() {
        const select = document.getElementById(ENTORNO_ID);
        if (!select || select.tagName !== 'SELECT') return;
        if (select.value && select.value !== '') return;

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
        const inputFicha = document.getElementById(FICHA_ID);
        const selectLocalidad = document.getElementById(LOCALIDAD_ID);

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

    function leerValorNumerico(id) {
        const el = document.getElementById(id);
        if (!el || el.value === '' || el.value === null) return null;
        const num = parseInt(el.value, 10);
        return Number.isNaN(num) ? null : num;
    }

    function calcularDiferenciaFechas(fechaMayor, fechaMenor) {
        let anios = fechaMayor.getFullYear() - fechaMenor.getFullYear();
        let meses = fechaMayor.getMonth() - fechaMenor.getMonth();
        let dias = fechaMayor.getDate() - fechaMenor.getDate();

        if (dias < 0) {
            meses -= 1;
            // Último día del mes anterior al mes de la fecha mayor
            const ultimoDiaMesAnterior = new Date(fechaMayor.getFullYear(), fechaMayor.getMonth(), 0);
            dias += ultimoDiaMesAnterior.getDate();
        }

        if (meses < 0) {
            anios -= 1;
            meses += 12;
        }

        return { anios, meses, dias };
    }

    function marcarVerde(el) {
        if (!el) return;
        el.style.backgroundColor = '#d4edda';
        el.style.border = '1px solid #28a745';
    }

    function escribirValor(id, valor) {
        const el = document.getElementById(id);
        if (!el) return;
        marcarVerde(el);
        if (el.value === String(valor)) return; // evita disparar eventos innecesarios
        el.value = valor;
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('input', { bubbles: true }));
    }

    function actualizarEdadNino() {
        const caracAnios = leerValorNumerico(CARAC_ANIOS_ID);
        const caracMeses = leerValorNumerico(CARAC_MESES_ID);
        const caracDias  = leerValorNumerico(CARAC_DIAS_ID);

        const nacAnios = leerValorNumerico(NAC_ANIOS_ID);
        const nacMeses = leerValorNumerico(NAC_MESES_ID);
        const nacDias  = leerValorNumerico(NAC_DIAS_ID);

        if ([caracAnios, caracMeses, caracDias, nacAnios, nacMeses, nacDias].some(v => v === null)) {
            return; // faltan datos por diligenciar
        }

        const fechaCarac = new Date(caracAnios, caracMeses - 1, caracDias);
        const fechaNac = new Date(nacAnios, nacMeses - 1, nacDias);

        // Validación básica: fecha de nacimiento no debe ser posterior a la de caracterización
        if (fechaNac > fechaCarac) return;

        const edad = calcularDiferenciaFechas(fechaCarac, fechaNac);

        escribirValor(EDAD_ANIOS_ID, edad.anios);
        escribirValor(EDAD_MESES_ID, edad.meses);
        escribirValor(EDAD_DIAS_ID, edad.dias);

        // Total de meses completos transcurridos desde el nacimiento
        // (no solo el residuo de meses del desglose Años/Meses/Días)
        const totalMeses = (edad.anios * 12) + edad.meses;
        EDAD_MESES_REPLICA_IDS.forEach(id => escribirValor(id, totalMeses));
    }

    function actualizarPuntuacionPD(grupo) {
        const acumulado = leerValorNumerico(grupo.acumuladoId);
        const items = leerValorNumerico(grupo.itemsId);

        if (acumulado === null || items === null) return;

        escribirValor(grupo.totalId, acumulado + items);
    }

    function actualizarTodasLasPuntuacionesPD() {
        GRUPOS_PUNTUACION_PD.forEach(actualizarPuntuacionPD);
    }

    document.addEventListener('input', event => {
        if (CAMPOS_FECHA_EDAD.includes(event.target.id)) {
            actualizarEdadNino();
        }
        if (CAMPOS_PUNTUACION_PD.includes(event.target.id)) {
            actualizarTodasLasPuntuacionesPD();
        }
    }, true);

    document.addEventListener('change', event => {
        if (CAMPOS_FECHA_EDAD.includes(event.target.id)) {
            actualizarEdadNino();
        }
        if (CAMPOS_PUNTUACION_PD.includes(event.target.id)) {
            actualizarTodasLasPuntuacionesPD();
        }
    }, true);

    function procesarFicha() {
        aplicarEntornoPorDefecto();
        aplicarLocalidadDesdeFicha();
        actualizarEdadNino(); // por si los campos ya vienen diligenciados al cargar
        actualizarTodasLasPuntuacionesPD(); // ídem para los 4 apartados de puntuación PD
    }

    setInterval(() => {
        const fichaExiste = document.getElementById(FICHA_ID);
        if (!fichaExiste) return; // aún no ha cargado esta sección del formulario
        procesarFicha();
    }, 500);
})();
