// ==UserScript==
// @name         UTIS - Acciones NNAT + Acudiente + Escolar + Síntomas + Condiciones Laborales + Decálogo
// @namespace    UTIS_GESI
// @version      4.3
// @description  Automatización NNAT + Acudiente + Tipo de Intervención + Información Escolar + Síntomas + Condiciones Laborales + Decálogo de Salud (v4.3: el último cambio manual SIEMPRE prevalece también al guardar y al recargar la ficha (valores ya existentes no se sobrescriben, congelación de autocompletado durante el guardado, detección de cambios delegada y consolidada); v4.2: detección de Seguimiento al efecto más robusta (espacios raros, texto Select2) + diagnóstico en consola; v4.1: Decálogo: Compromiso y Cumplimiento se marcan ambos en "No aplica"; v4.0: "5- Seguimiento al efecto" se detecta por valor O por texto de la opción, sin regla de edades a ninguna edad (hasta 17 años y 364 días); v3.9: el último cambio manual SIEMPRE prevalece y es el que se guarda; v3.8: Tipo de Intervención = 105 sin regla de edades; v3.7: Lactante ligada a sexo=Mujer; Institución sin obligatoriedad + buscador por nombre)
// @match        https://gesiapps.saludcapital.gov.co/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // ============================================================
    // IDS PRINCIPALES
    // ============================================================
    const IDS = {
        tipoDoc: 'valorControl21240', tipoIntervencion: 'valorControl21239',
        nacionalidad: 'valorControl21246', sexo: 'valorControl21247',
        genero: 'valorControl21248', identidadGenero: 'valorControl21249',
        estadoCivil: 'valorControl21250', edad: 'valorControl21252',
        etnia: 'valorControl21254', poblacionDiferencial: 'valorControl21255',
        orientacionSexual: 'valorControl21256', categoriaDiscapacidad: 'valorControl21258',

        accidenteTrabajo: 'valorControl21826',

        dolorCabeza: 'valorControl21830', nauseasVomito: 'valorControl21831',
        tosExpectoracion: 'valorControl21832', sensacionCansancio: 'valorControl21833',
        dificultadAprendizaje: 'valorControl21834', secrecionOjos: 'valorControl21835',
        enrojecimientoAmpollas: 'valorControl21836', dolorArticular: 'valorControl21837',
        dolorOido: 'valorControl21838', problemasVoz: 'valorControl21839',

        motivoServicioMedico: 'valorControl21847', trabajoAfectaSalud: 'valorControl21848',
        lavadoManos: 'valorControl21849', cambiosTemperatura: 'valorControl21850',
        evitarDanos: 'valorControl21851',

        nnaGestante: 'valorControl21852', nnaLactante: 'valorControl21853'
    };

    // Información acudiente
    const IDS_ACUDIENTE = {
        tipoDoc: 'valorControl21300', nacionalidad: 'valorControl21302',
        etnia: 'valorControl21304', poblacionInclusionOficio: 'valorControl21305'
    };

    // Información escolar
    const IDS_ESCOLAR = {
        actualmenteEstudia: 'valorControl21816', razonAbandono: 'valorControl21817',
        institucion: 'valorControl21818', curso: 'valorControl21820',
        actividadesRecreativas: 'valorControl21822', queActividades: 'valorControl21823'
    };

    // ============================================================
    // DECÁLOGO DE SALUD
    // Compromiso ítem 1 = valorControl21878, cumplimiento ítem 1 = valorControl21879
    // Cada siguiente ítem aumenta de 3 en 3
    // ============================================================
    const DECALOGO = [
        { numero: 1, nombre: 'Disminuir la exposición a contaminación ambiental', compromiso: 'valorControl21878', cumplimiento: 'valorControl21879' },
        { numero: 2, nombre: 'Consumir verduras o frutas todos los días', compromiso: 'valorControl21881', cumplimiento: 'valorControl21882' },
        { numero: 3, nombre: 'Aumentar la actividad física', compromiso: 'valorControl21884', cumplimiento: 'valorControl21885' },
        { numero: 4, nombre: 'No agregar sal a las comidas cuando ya están servidas', compromiso: 'valorControl21887', cumplimiento: 'valorControl21888' },
        { numero: 5, nombre: 'Disminuir el consumo diario de bebidas azucaradas', compromiso: 'valorControl21890', cumplimiento: 'valorControl21891' },
        { numero: 6, nombre: 'Usar medidas de protección a rayos solares (gorra, protector solar, prendas que cubran su piel)', compromiso: 'valorControl21893', cumplimiento: 'valorControl21894' },
        { numero: 7, nombre: 'Disminuir la exposición a humo de segunda mano', compromiso: 'valorControl21896', cumplimiento: 'valorControl21897' },
        { numero: 8, nombre: 'Aumentar el hábito de lavado de manos con agua y jabón antes de cada comida y después de ir al baño', compromiso: 'valorControl21899', cumplimiento: 'valorControl21900' },
        { numero: 9, nombre: 'Disminuir la exposición a cambios frecuentes de temperatura', compromiso: 'valorControl21902', cumplimiento: 'valorControl21903' },
        { numero: 10, nombre: 'Eliminar el riesgo de daños al cuerpo ocasionados por la actividad que realiza (manipulación de cargas, exposición a agentes químicos, uso de herramientas o máquinas)', compromiso: 'valorControl21905', cumplimiento: 'valorControl21906' }
    ];

    // ============================================================
    // VALORES / CATÁLOGOS
    // ============================================================
    const VALORES = {
        ETNIA: '84', CATEGORIA_DISCAPACIDAD: '3822',
        ESTADO_CIVIL_MENOR_14: '78', ESTADO_CIVIL_MAYOR_14: '73',
        TIPO_INTERVENCION_MENOR_14: '102', TIPO_INTERVENCION_MAYOR_14: '103',
        // "5- Seguimiento al efecto" → sin regla de edades (se detecta por valor O por texto)
        TIPO_INTERVENCION_SEGUIMIENTO: '105',
        TEXTO_SEGUIMIENTO_EFECTO: 'seguimiento al efecto',
        ESTUDIA_SI: '958', ESTUDIA_NO: '959',
        ACTIVIDADES_SI: '958', ACTIVIDADES_NO: '959',
        ETNIA_ACUDIENTE: '84', POBLACION_INCLUSION: '4048',
        ACCIDENTE_TRABAJO: '4565',
        SINTOMAS: '959', CONDICIONES_LABORALES: '959',
        SEXO_MUJER: '68', SEXO_HOMBRE: '67',
        // v4.1: Compromiso y Cumplimiento del Decálogo usan el mismo valor "No aplica"
        DECALOGO_NO_APLICA: '960',
        TEXTO_NO_APLICA: 'no aplica'
    };

    const TIPO_DOC = { RC: '60', TI: '61', MENOR_SIN_ID: '66', PPT: '2482' };

    const TIPO_DOC_ACUDIENTE = {
        CC: '59', CE: '62', PASAPORTE: '64', ADULTO_SIN_ID: '65',
        CARNET_DIPLOMATICO: '1637', SALVOCONDUCTO: '1638', PEP: '1639',
        DNI_PAIS_ORIGEN: '1640', PTP: '4040'
    };

    // Cascada sexo → género / orientación / identidad, según rango de edad
    const CASCADA_SEXO = {
        menor_14: {
            '67': { genero: '70', orientacion: '4028', identidad: '4020' },
            '68': { genero: '71', orientacion: '4028', identidad: '4020' }
        },
        mayor_14: {
            '67': { genero: '70', orientacion: '4024', identidad: '4515' },
            '68': { genero: '71', orientacion: '4024', identidad: '4514' }
        }
    };

    // Reglas edad / tipo de documento
    const REGLAS_EDAD_DOC = {
        '60': { nombre: 'Registro Civil', minimo: 0, maximo: 6 },
        '61': { nombre: 'Tarjeta de Identidad', minimo: 7, maximo: 17 }
    };

    // Grupos documento NNAT
    const GRUPOS_DOC = {
        NACIONAL: { tipos: ['60', '61'], nacionalidad: '50', poblacionDiferencial: '2620' },
        EXTRANJERO_SIN_ID: { tipos: ['66', '2482'], nacionalidad: '236', poblacionDiferencial: '4051' }
    };

    // Grupos documento acudiente
    const GRUPOS_DOC_ACUDIENTE = {
        NACIONAL: { tipos: ['59'], nacionalidad: '50' },
        EXTRANJERO: { tipos: ['62', '64', '65', '1637', '1638', '1639', '1640', '2482', '4040'], nacionalidad: '236' }
    };

    // ============================================================
    // ESTADO / UTILIDADES DE CONTROL
    // ============================================================
    // Campos que el usuario ya modificó manualmente (el script no los vuelve a tocar)
    const modificadoManualmente = new WeakMap();
    let autoAsignando = false;
    // v4.3: mientras se guarda, el script no escribe nada (así no pisa lo que el usuario eligió)
    let congelado = false;
    let validacionIntervenciones = true;
    let validacionEscolar = true;

    const getElemento = (id) => document.getElementById(id);

    // Normaliza texto (sin tildes, minúsculas, espacios colapsados incluyendo
    // espacios no separables) para comparar etiquetas de opciones
    const normalizarTexto = (texto) =>
        (texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').toLowerCase().trim();

    // v4.2: textos "visibles" de un select: opción seleccionada y, si existe,
    // el contenedor Select2 que muestra el valor al usuario.
    const textosVisiblesSelect = (select) => [
        select.options?.[select.selectedIndex]?.text,
        select.selectedOptions?.[0]?.textContent,
        document.getElementById('select2-' + select.id + '-container')?.textContent
    ];

    // v4.0/v4.2: ÚNICA fuente de verdad para saber si el Tipo de Intervención es
    // "5- Seguimiento al efecto" (sin regla de edades: aplica a cualquier edad,
    // incluso 17 años y 364 días). Se detecta por VALOR o por TEXTO (de la opción
    // o de lo que muestra el widget). La usan el autocompletado y la validación.
    const intervencionSinReglaEdad = () => {
        const select = getElemento(IDS.tipoIntervencion);
        if (!select) return false;

        if (select.value === VALORES.TIPO_INTERVENCION_SEGUIMIENTO) return true;

        return textosVisiblesSelect(select).some(
            (t) => normalizarTexto(t).includes(VALORES.TEXTO_SEGUIMIENTO_EFECTO)
        );
    };

    // Registra el cambio manual del usuario sobre un campo
    const registrarCambioManual = (elemento) => {
        modificadoManualmente.set(elemento, true);
        elemento.setAttribute('data-utis-ultimo-valor', elemento.value);
        elemento.style.backgroundColor = '';
    };

    // v4.3: un campo está "vacío" si no tiene valor o muestra el placeholder "Seleccione"
    const estaVacioOPlaceholder = (elemento) => {
        const valor = elemento.value;
        if (valor === '' || valor === '0' || valor === '-1') return true;
        return normalizarTexto(elemento.options?.[elemento.selectedIndex]?.text).startsWith('seleccione');
    };

    // Detección por VALOR, independiente de eventos (funciona con Select2/jQuery).
    // El script guarda en data-utis-ultimo-valor lo último que él mismo escribió.
    //  - Si el valor actual es distinto → lo cambió el usuario → manual.
    //  - v4.3: si el script nunca escribió el campo y YA trae un valor (ficha guardada
    //    que se recarga, o algo elegido antes de que corriera el script) → también es
    //    una decisión previa que se respeta y NO se sobrescribe con el valor por defecto.
    const esCambioManual = (elemento) => {
        if (modificadoManualmente.get(elemento)) return true;

        const ultimoEscrito = elemento.getAttribute('data-utis-ultimo-valor');
        if (ultimoEscrito !== null) {
            if (elemento.value === ultimoEscrito) return false;
            registrarCambioManual(elemento);
            return true;
        }

        if (!estaVacioOPlaceholder(elemento)) {
            registrarCambioManual(elemento);
            return true;
        }
        return false;
    };

    // Asigna "valor" por defecto si el usuario NO ha modificado el campo.
    const autoAsignar = (elemento, valor) => {
        if (!elemento || congelado || esCambioManual(elemento)) return;

        // Evita trabajo y disparo de evento si el valor ya es el correcto
        if (elemento.value === valor) {
            elemento.setAttribute('data-utis-ultimo-valor', valor);
            return;
        }

        const opcion = elemento.querySelector(`option[value="${valor}"]`);
        autoAsignando = true;
        elemento.value = valor;

        const select2 = document.getElementById('select2-' + elemento.id + '-container');
        if (select2 && opcion) {
            select2.textContent = opcion.text;
            select2.setAttribute('title', opcion.text);
        }

        elemento.setAttribute('data-utis-ultimo-valor', valor);
        elemento.dispatchEvent(new Event('change', { bubbles: true }));
        elemento.style.backgroundColor = '#d4edda';
        autoAsignando = false;
    };

    // ------------------------------------------------------------
    // Devuelve el control "visible" asociado a un elemento. Para campos
    // normales es el propio elemento; para el campo Institución (que tiene
    // un buscador propio superpuesto) es el input de búsqueda, porque el
    // <select> original queda oculto dentro del contenedor del buscador.
    // ------------------------------------------------------------
    const obtenerControlVisual = (elemento) => {
        if (!elemento || !elemento.parentNode) return elemento;
        const input = elemento.parentNode.querySelector(':scope > .utis-buscador-institucion-input');
        return input || elemento;
    };

    const bloquearCampo = (elemento) => {
        if (!elemento) return;
        elemento.disabled = true;
        limpiarMensajesPorCampo(elemento);

        // v3.9: solo limpia/notifica si realmente había un valor, y bajo la guarda
        // autoAsignando, para evitar recursión infinita de procesarBloque.
        if (elemento.value !== '') {
            autoAsignando = true;
            elemento.value = '';
            elemento.dispatchEvent(new Event('change', { bubbles: true }));
            autoAsignando = false;
        }

        // Un campo bloqueado se reinicia: al desbloquearse vuelve a su valor por defecto
        modificadoManualmente.delete(elemento);
        elemento.removeAttribute('data-utis-ultimo-valor');

        const visual = obtenerControlVisual(elemento);
        visual.style.backgroundColor = '#e9ecef';
        visual.style.opacity = '0.6';
        visual.style.cursor = 'not-allowed';
        visual.style.border = '';
        if (visual !== elemento) visual.disabled = true;
    };

    const desbloquearCampo = (elemento) => {
        if (!elemento) return;
        elemento.disabled = false;
        limpiarMensajesPorCampo(elemento);

        const visual = obtenerControlVisual(elemento);
        visual.style.backgroundColor = '';
        visual.style.opacity = '1';
        visual.style.cursor = 'auto';
        visual.style.border = '';
        if (visual !== elemento) visual.disabled = false;
    };

    const limpiarMensajesPorCampo = (elemento) => {
        if (!elemento || !elemento.parentNode) return;
        elemento.parentNode.querySelectorAll('.utis-mensaje-validacion-escolar').forEach((m) => m.remove());
    };

    const mostrarErrorEscolar = (elemento, textoError) => {
        if (!elemento || !elemento.parentNode || elemento.disabled) return;
        limpiarMensajesPorCampo(elemento);

        const visual = obtenerControlVisual(elemento);
        visual.style.border = '2px solid red';

        const mensaje = document.createElement('div');
        mensaje.className = 'utis-mensaje-validacion-escolar';
        mensaje.textContent = `⚠ ${textoError}`;
        Object.assign(mensaje.style, {
            color: '#b30000', background: '#ffe6e6', padding: '6px', marginTop: '4px',
            border: '1px solid #ff9999', borderRadius: '4px', fontSize: '12px'
        });
        elemento.parentNode.appendChild(mensaje);
    };

    const obtenerGrupoDoc = (tipoDocValue, grupos) =>
        Object.values(grupos).find((grupo) => grupo.tipos.includes(tipoDocValue)) || null;

    // ============================================================
    // REGLAS DE NEGOCIO NNAT
    // ============================================================
    const aplicarCascadaSexo = () => {
        const tipoDoc = getElemento(IDS.tipoDoc);
        const sexo = getElemento(IDS.sexo);
        if (!tipoDoc || !sexo || !Object.values(TIPO_DOC).includes(tipoDoc.value)) return;

        const edad = parseInt(getElemento(IDS.edad)?.value || 0, 10);
        const cascada = edad < 14 ? CASCADA_SEXO.menor_14 : CASCADA_SEXO.mayor_14;
        const mapa = cascada[sexo.value];
        if (!mapa) return;

        sexo.style.backgroundColor = '#d4edda';
        autoAsignar(getElemento(IDS.genero), mapa.genero);
        autoAsignar(getElemento(IDS.orientacionSexual), mapa.orientacion);
        autoAsignar(getElemento(IDS.identidadGenero), mapa.identidad);
    };

    const aplicarEstadoCivil = () => {
        const tipoDoc = getElemento(IDS.tipoDoc);
        const edadElemento = getElemento(IDS.edad);
        const estadoCivil = getElemento(IDS.estadoCivil);
        if (!tipoDoc || !edadElemento || !estadoCivil || !Object.values(TIPO_DOC).includes(tipoDoc.value)) return;

        const edad = parseInt(edadElemento.value, 10);
        if (isNaN(edad)) return;

        autoAsignar(estadoCivil, edad < 14 ? VALORES.ESTADO_CIVIL_MENOR_14 : VALORES.ESTADO_CIVIL_MAYOR_14);
    };

    const aplicarTipoIntervencion = () => {
        const tipoDoc = getElemento(IDS.tipoDoc);
        const edadElemento = getElemento(IDS.edad);
        const tipoIntervencion = getElemento(IDS.tipoIntervencion);
        if (!tipoDoc || !edadElemento || !tipoIntervencion || !Object.values(TIPO_DOC).includes(tipoDoc.value)) return;

        // "5- Seguimiento al efecto" no tiene regla de edades → no se sobrescribe
        if (intervencionSinReglaEdad()) return;

        const edad = parseInt(edadElemento.value, 10);
        if (isNaN(edad)) return;

        autoAsignar(tipoIntervencion, edad < 14 ? VALORES.TIPO_INTERVENCION_MENOR_14 : VALORES.TIPO_INTERVENCION_MAYOR_14);
    };

    const aplicarAutocompletados = () => {
        const tipoDoc = getElemento(IDS.tipoDoc);
        if (!tipoDoc || !Object.values(TIPO_DOC).includes(tipoDoc.value)) return;

        autoAsignar(getElemento(IDS.etnia), VALORES.ETNIA);
        autoAsignar(getElemento(IDS.categoriaDiscapacidad), VALORES.CATEGORIA_DISCAPACIDAD);

        const grupo = obtenerGrupoDoc(tipoDoc.value, GRUPOS_DOC);
        if (!grupo) return;

        autoAsignar(getElemento(IDS.nacionalidad), grupo.nacionalidad);
        autoAsignar(getElemento(IDS.poblacionDiferencial), grupo.poblacionDiferencial);
    };

    const aplicarAccidenteTrabajo = () => {
        autoAsignar(getElemento(IDS.accidenteTrabajo), VALORES.ACCIDENTE_TRABAJO);
    };

    const CAMPOS_SINTOMAS = [
        IDS.dolorCabeza, IDS.nauseasVomito, IDS.tosExpectoracion, IDS.sensacionCansancio,
        IDS.dificultadAprendizaje, IDS.secrecionOjos, IDS.enrojecimientoAmpollas,
        IDS.dolorArticular, IDS.dolorOido, IDS.problemasVoz
    ];

    const aplicarSintomas = () => {
        CAMPOS_SINTOMAS.forEach((id) => autoAsignar(getElemento(id), VALORES.SINTOMAS));
    };

    // NOTA v3.7: nnaLactante se sacó de esta lista genérica porque ahora
    // depende del sexo, igual que nnaGestante (ver aplicarCondicionesLaborales).
    const CAMPOS_CONDICIONES_LABORALES = [
        IDS.motivoServicioMedico, IDS.trabajoAfectaSalud, IDS.lavadoManos,
        IDS.cambiosTemperatura, IDS.evitarDanos
    ];

    // Habilita un campo dependiente de sexo=Mujer y le pone su valor por defecto
    // (sin pintar de verde si el usuario ya lo modificó manualmente).
    const habilitarCampoSoloMujer = (elemento) => {
        if (!elemento) return;
        desbloquearCampo(elemento);
        autoAsignar(elemento, VALORES.CONDICIONES_LABORALES);
        if (!modificadoManualmente.get(elemento)) elemento.style.backgroundColor = '#d4edda';
    };

    const aplicarCondicionesLaborales = () => {
        CAMPOS_CONDICIONES_LABORALES.forEach((id) => autoAsignar(getElemento(id), VALORES.CONDICIONES_LABORALES));

        // v3.7: Niña o adolescente trabajadora gestante Y lactante: ambas
        // solo aplican/se habilitan si sexo = Mujer. Si sexo = Hombre, las
        // dos quedan bloqueadas y sin valor (misma lógica para las dos).
        const sexo = getElemento(IDS.sexo);
        const camposSoloMujer = [getElemento(IDS.nnaGestante), getElemento(IDS.nnaLactante)];

        if (sexo && sexo.value === VALORES.SEXO_MUJER) {
            camposSoloMujer.forEach(habilitarCampoSoloMujer);
        } else {
            camposSoloMujer.forEach(bloquearCampo);
        }
    };

    // v4.1: Compromiso y Cumplimiento se marcan AMBOS en "No aplica". Se busca la
    // opción por TEXTO en cada select (por si el value de Compromiso difiere del
    // de Cumplimiento) y, si no se encuentra, se usa el value 960 por defecto.
    const valorNoAplica = (elemento) => {
        const opcion = Array.from(elemento?.options || []).find(
            (o) => normalizarTexto(o.text).includes(VALORES.TEXTO_NO_APLICA)
        );
        return opcion ? opcion.value : VALORES.DECALOGO_NO_APLICA;
    };

    const aplicarDecalogo = () => {
        DECALOGO.forEach((item) => {
            [item.compromiso, item.cumplimiento].forEach((id) => {
                const campo = getElemento(id);
                if (campo) autoAsignar(campo, valorNoAplica(campo));
            });
        });
    };

    // ============================================================
    // VALIDACIONES (bloquean el guardado si fallan)
    // ============================================================
    const validarEdadDocumento = () => {
        const tipoDoc = getElemento(IDS.tipoDoc);
        const edadElemento = getElemento(IDS.edad);
        if (!tipoDoc || !edadElemento) return;

        edadElemento.style.border = '';
        tipoDoc.style.border = '';
        edadElemento.parentNode?.querySelector('.utis-mensaje-validacion-edad-doc')?.remove();

        const regla = REGLAS_EDAD_DOC[tipoDoc.value];
        if (!regla) return;

        const edad = parseInt(edadElemento.value, 10);
        if (isNaN(edad) || (edad >= regla.minimo && edad <= regla.maximo)) return;

        edadElemento.style.border = '2px solid red';
        tipoDoc.style.border = '2px solid red';

        const mensaje = document.createElement('div');
        mensaje.className = 'utis-mensaje-validacion-edad-doc';
        mensaje.textContent = `⚠ Con edadaños,eltipodedocumentonodeberíaser"{regla.nombre}".`;
        Object.assign(mensaje.style, {
            color: '#b30000', background: '#ffe6e6', padding: '6px', marginTop: '4px',
            border: '1px solid #ff9999', borderRadius: '4px', fontSize: '12px'
        });
        edadElemento.parentNode?.appendChild(mensaje);
    };

    const validarEdadTipoIntervencion = () => {
        const edadElemento = getElemento(IDS.edad);
        const tipoIntervencion = getElemento(IDS.tipoIntervencion);
        if (!edadElemento || !tipoIntervencion) return;

        // Limpia estado visual previo y asume válido; solo se marca inválido
        // más abajo si realmente hay inconsistencia edad / tipo de intervención.
        tipoIntervencion.style.border = '';
        edadElemento.style.border = '';
        tipoIntervencion.parentNode?.querySelector('.utis-mensaje-validacion-intervencion')?.remove();
        validacionIntervenciones = true;

        // "5- Seguimiento al efecto" no tiene regla de edades → siempre válido
        if (intervencionSinReglaEdad()) return;

        const edad = parseInt(edadElemento.value, 10);
        if (isNaN(edad) || !tipoIntervencion.value) return;

        const esperado = edad < 14 ? VALORES.TIPO_INTERVENCION_MENOR_14 : VALORES.TIPO_INTERVENCION_MAYOR_14;
        if (tipoIntervencion.value === esperado) return;

        tipoIntervencion.style.border = '2px solid red';
        edadElemento.style.border = '2px solid red';

        const etiqueta = edad < 14 ? 'Niños y Niñas' : 'Adolescentes';
        const mensaje = document.createElement('div');
        mensaje.className = 'utis-mensaje-validacion-intervencion';
        mensaje.textContent = `⚠ Con edadaños,elTipodeIntervencióndebeser"{etiqueta}". Por favor corrija antes de guardar.`;
        Object.assign(mensaje.style, {
            color: '#b30000', background: '#ffe6e6', padding: '8px', marginTop: '4px',
            border: '1px solid #ff9999', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold'
        });
        tipoIntervencion.parentNode?.appendChild(mensaje);

        validacionIntervenciones = false;
    };

    const validarInformacionEscolar = () => {
        const actualmenteEstudia = getElemento(IDS_ESCOLAR.actualmenteEstudia);
        const razonAbandono = getElemento(IDS_ESCOLAR.razonAbandono);
        const institucion = getElemento(IDS_ESCOLAR.institucion);
        const curso = getElemento(IDS_ESCOLAR.curso);
        const actividadesRecreativas = getElemento(IDS_ESCOLAR.actividadesRecreativas);
        const queActividades = getElemento(IDS_ESCOLAR.queActividades);
        if (!actualmenteEstudia) return;

        if (actualmenteEstudia.value === VALORES.ESTUDIA_SI) {
            desbloquearCampo(institucion);
            desbloquearCampo(curso);
            bloquearCampo(razonAbandono);
            // v3.7: Institución/jardín NO es obligatoria; "En qué curso está" SÍ.
            if (!curso?.value) mostrarErrorEscolar(curso, 'Debe diligenciar en qué curso está.');
        } else if (actualmenteEstudia.value === VALORES.ESTUDIA_NO) {
            bloquearCampo(institucion);
            desbloquearCampo(razonAbandono);
            desbloquearCampo(curso);
            if (!razonAbandono?.value) mostrarErrorEscolar(razonAbandono, 'Debe diligenciar la Razón del abandono escolar.');
            if (!curso?.value) mostrarErrorEscolar(curso, 'Debe diligenciar el último año cursado.');
        } else {
            desbloquearCampo(institucion);
            desbloquearCampo(razonAbandono);
            desbloquearCampo(curso);
            desbloquearCampo(queActividades);
        }

        if (actividadesRecreativas?.value === VALORES.ACTIVIDADES_SI) {
            desbloquearCampo(queActividades);
            if (!queActividades?.value) mostrarErrorEscolar(queActividades, 'Debe especificar qué actividades realiza.');
        } else if (actividadesRecreativas?.value === VALORES.ACTIVIDADES_NO) {
            bloquearCampo(queActividades);
        } else {
            desbloquearCampo(queActividades);
        }
    };

    const actualizarEstadoValidacionEscolar = () => {
        const actualmenteEstudia = getElemento(IDS_ESCOLAR.actualmenteEstudia);
        validacionEscolar = true;
        if (!actualmenteEstudia?.value) return;

        if (actualmenteEstudia.value === VALORES.ESTUDIA_SI) {
            // v3.7: ya no exige Institución/jardín, solo Curso.
            if (!getElemento(IDS_ESCOLAR.curso)?.value) {
                validacionEscolar = false;
            }
        } else if (actualmenteEstudia.value === VALORES.ESTUDIA_NO) {
            if (!getElemento(IDS_ESCOLAR.razonAbandono)?.value || !getElemento(IDS_ESCOLAR.curso)?.value) {
                validacionEscolar = false;
            }
        }

        if (getElemento(IDS_ESCOLAR.actividadesRecreativas)?.value === VALORES.ACTIVIDADES_SI &&
            !getElemento(IDS_ESCOLAR.queActividades)?.value) {
            validacionEscolar = false;
        }
    };

    // ============================================================
    // BUSCADOR POR NOMBRE PARA EL CAMPO INSTITUCIÓN (v3.7)
    // El <select> original de Institución solo permite buscar saltando a
    // la opción cuyo TEXTO empieza por lo que se teclea (comportamiento
    // nativo del navegador) y a veces no trae el código exacto. Este
    // bloque superpone un input de texto que filtra las opciones por
    // cualquier parte del nombre, sin depender de jQuery/Select2.
    // ============================================================
    const inicializarBuscadorInstitucion = () => {
        const select = getElemento(IDS_ESCOLAR.institucion);
        if (!select || select.tagName !== 'SELECT') return;
        if (select.dataset.utisBuscadorInit === '1') return;

        const anchoOriginal = select.offsetWidth;
        select.dataset.utisBuscadorInit = '1';
        select.style.display = 'none';

        const contenedor = document.createElement('div');
        contenedor.className = 'utis-buscador-institucion-contenedor';
        contenedor.style.position = 'relative';
        if (anchoOriginal) contenedor.style.width = anchoOriginal + 'px';

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'form-control utis-buscador-institucion-input';
        input.placeholder = 'Buscar institución por nombre...';
        input.autocomplete = 'off';

        const lista = document.createElement('div');
        lista.className = 'utis-buscador-institucion-lista';
        Object.assign(lista.style, {
            position: 'absolute', top: '100%', left: '0', right: '0', maxHeight: '220px',
            overflowY: 'auto', background: '#fff', border: '1px solid #ccc', zIndex: '10000',
            display: 'none', boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
        });

        select.parentNode.insertBefore(contenedor, select);
        contenedor.appendChild(select);
        contenedor.appendChild(input);
        contenedor.appendChild(lista);

        const sincronizarInputConSelect = () => {
            const seleccionada = select.options[select.selectedIndex];
            input.value = seleccionada && seleccionada.value ? seleccionada.text : '';
        };
        sincronizarInputConSelect();

        const renderizarLista = (filtro) => {
            const texto = filtro.trim().toLowerCase();
            const todasLasOpciones = Array.from(select.options).filter((o) => o.value !== '');
            const filtradas = texto
                ? todasLasOpciones.filter((o) => o.text.toLowerCase().includes(texto))
                : todasLasOpciones;

            lista.innerHTML = '';
            if (!filtradas.length) {
                const vacio = document.createElement('div');
                vacio.textContent = 'Sin resultados';
                Object.assign(vacio.style, { padding: '6px 10px', color: '#888' });
                lista.appendChild(vacio);
            } else {
                filtradas.slice(0, 200).forEach((opcion) => {
                    const item = document.createElement('div');
                    item.textContent = opcion.text;
                    Object.assign(item.style, { padding: '6px 10px', cursor: 'pointer' });
                    item.addEventListener('mouseenter', () => { item.style.background = '#f0f0f0'; });
                    item.addEventListener('mouseleave', () => { item.style.background = ''; });
                    item.addEventListener('mousedown', (ev) => {
                        ev.preventDefault();
                        select.value = opcion.value;
                        input.value = opcion.text;
                        lista.style.display = 'none';
                        select.dispatchEvent(new Event('change', { bubbles: true }));
                    });
                    lista.appendChild(item);
                });
            }
            lista.style.display = 'block';
        };

        input.addEventListener('focus', () => renderizarLista(''));
        input.addEventListener('input', () => renderizarLista(input.value));
        input.addEventListener('blur', () => {
            // Pequeño retardo para permitir que el mousedown de la lista se procese antes de ocultarla
            setTimeout(() => { lista.style.display = 'none'; }, 150);
        });

        // Si el select cambia por otra vía (ej. bloqueo/desbloqueo, reseteo de ficha), refleja el valor en el input
        select.addEventListener('change', () => {
            if (document.activeElement !== input) sincronizarInputConSelect();
        });
    };

    // ============================================================
    // ACUDIENTE
    // ============================================================
    const aplicarReglasAcudiente = () => {
        const tipoDoc = getElemento(IDS_ACUDIENTE.tipoDoc);
        if (!tipoDoc || !Object.values(TIPO_DOC_ACUDIENTE).includes(tipoDoc.value)) return;

        const grupo = obtenerGrupoDoc(tipoDoc.value, GRUPOS_DOC_ACUDIENTE);
        if (!grupo) return;

        autoAsignar(getElemento(IDS_ACUDIENTE.nacionalidad), grupo.nacionalidad);
        autoAsignar(getElemento(IDS_ACUDIENTE.etnia), VALORES.ETNIA_ACUDIENTE);
        autoAsignar(getElemento(IDS_ACUDIENTE.poblacionInclusionOficio), VALORES.POBLACION_INCLUSION);
    };

    // ============================================================
    // ORQUESTADOR PRINCIPAL
    // ============================================================
    const procesarBloque = () => {
        aplicarCascadaSexo();
        aplicarEstadoCivil();
        aplicarTipoIntervencion();
        aplicarAutocompletados();
        aplicarAccidenteTrabajo();
        aplicarSintomas();
        aplicarCondicionesLaborales();
        aplicarDecalogo();

        validarEdadDocumento();
        validarEdadTipoIntervencion();

        aplicarReglasAcudiente();

        inicializarBuscadorInstitucion();
        validarInformacionEscolar();
    };

    // ============================================================
    // BLOQUEO DE GUARDADO SI HAY ERRORES DE VALIDACIÓN
    // ============================================================
    const SELECTOR_GUARDAR =
        'button[type="submit"], button[onclick*="guardar"], button[onclick*="Guardar"], .btn-guardar, [data-action="save"]';

    // v4.3: al guardar, primero se "consolida" lo que el usuario cambió (por si vino de
    // un widget que no disparó 'change') y se congela el autocompletado unos segundos,
    // para que nada pise el último cambio mientras se envía el formulario.
    const congelarPorGuardado = () => {
        document.querySelectorAll('[data-utis-ultimo-valor]').forEach((el) => {
            if (el.value !== el.getAttribute('data-utis-ultimo-valor')) registrarCambioManual(el);
        });
        congelado = true;
        setTimeout(() => { congelado = false; }, 4000);
    };

    // Listener delegado: sigue funcionando aunque GESI reconstruya los botones.
    const bloquearGuardoSiHayError = () => {
        document.addEventListener('click', (evento) => {
            if (!evento.target?.closest?.(SELECTOR_GUARDAR)) return;

            congelarPorGuardado();
            validarEdadTipoIntervencion();
            actualizarEstadoValidacionEscolar();

            if (validacionIntervenciones && validacionEscolar) return;

            congelado = false; // el guardado no procede: se reanuda el autocompletado
            evento.preventDefault();
            evento.stopPropagation();

            let textoAlerta = '❌ No puede guardar. ';
            if (!validacionIntervenciones) textoAlerta += 'Corrija la inconsistencia entre Edad y Tipo de Intervención. ';
            if (!validacionEscolar) textoAlerta += 'Complete o corrija los campos de Información Escolar.';

            const alerta = document.createElement('div');
            alerta.textContent = textoAlerta;
            Object.assign(alerta.style, {
                position: 'fixed', top: '20px', right: '20px', background: '#ffe6e6', color: '#b30000',
                padding: '12px 16px', borderRadius: '4px', border: '2px solid #ff9999', fontSize: '14px',
                fontWeight: 'bold', zIndex: '9999', boxShadow: '0 2px 8px rgba(0,0,0,0.2)', maxWidth: '400px'
            });
            document.body.appendChild(alerta);
            setTimeout(() => alerta.remove(), 5000);
        }, true);
    };

    // ============================================================
    // DISPARADORES: evento change delegado (soporta reconstrucción SPA del DOM)
    // NOTA DE RENDIMIENTO (v3.6): tipoIntervencion y los campos del Decálogo
    // se sacaron de esta lista porque son SALIDAS calculadas por el propio
    // script. Tenerlos aquí causaba una cascada recursiva de reprocesamiento.
    // (El polling de respaldo sí monitorea tipoIntervencion, por lo que un
    // cambio manual a/desde "5- Seguimiento al efecto" se revalida en ≤500 ms.)
    // ============================================================
    const IDS_DISPARADORES = [
        IDS.tipoDoc, IDS.sexo, IDS.edad,
        IDS_ACUDIENTE.tipoDoc,
        IDS_ESCOLAR.actualmenteEstudia, IDS_ESCOLAR.actividadesRecreativas,
        IDS_ESCOLAR.razonAbandono, IDS_ESCOLAR.institucion, IDS_ESCOLAR.curso, IDS_ESCOLAR.queActividades
    ];

    document.addEventListener('change', (evento) => {
        // Ignora cambios disparados programáticamente por el propio script
        // (autoAsignar / bloquearCampo), evitando recursión.
        if (autoAsignando) return;

        const campo = evento.target;
        // v4.3: único punto de registro de cambios manuales (delegado, cubre nodos
        // reconstruidos o duplicados): si el script había escrito este campo y el
        // usuario lo cambia, ese cambio queda como el vigente.
        if (campo?.hasAttribute?.('data-utis-ultimo-valor')) registrarCambioManual(campo);

        if (IDS_DISPARADORES.includes(campo?.id)) procesarBloque();
    }, true);

    // ============================================================
    // DIAGNÓSTICO (v4.2): escribe utisDiagnostico() en la consola del navegador
    // para ver cómo está leyendo el Tipo de Intervención este script.
    // ============================================================
    window.utisDiagnostico = () => {
        const nodos = Array.from(document.querySelectorAll(`[id="${IDS.tipoIntervencion}"]`));
        console.log('[UTIS v4.3] nodos con el id de Tipo de Intervención:', nodos.length);
        nodos.forEach((n, i) => console.log(`  #${i}`, {
            value: n.value,
            textos: textosVisiblesSelect(n),
            esSeguimiento: n === getElemento(IDS.tipoIntervencion) ? intervencionSinReglaEdad() : '(no es el nodo que usa el script)'
        }));
    };
    console.log('[UTIS] v4.3 cargado');

    // ============================================================
    // EJECUCIÓN INICIAL
    // ============================================================
    procesarBloque();
    bloquearGuardoSiHayError();

    // ============================================================
    // POLLING DE RESPALDO (detecta cambios que no disparan 'change')
    // ============================================================
    const IDS_MONITOREADOS = {
        tipoDoc: IDS.tipoDoc, sexo: IDS.sexo, edad: IDS.edad, tipoIntervencion: IDS.tipoIntervencion,
        accidenteTrabajo: IDS.accidenteTrabajo,
        dolorCabeza: IDS.dolorCabeza, nauseasVomito: IDS.nauseasVomito, tosExpectoracion: IDS.tosExpectoracion,
        sensacionCansancio: IDS.sensacionCansancio, dificultadAprendizaje: IDS.dificultadAprendizaje,
        secrecionOjos: IDS.secrecionOjos, enrojecimientoAmpollas: IDS.enrojecimientoAmpollas,
        dolorArticular: IDS.dolorArticular, dolorOido: IDS.dolorOido, problemasVoz: IDS.problemasVoz,
        motivoServicioMedico: IDS.motivoServicioMedico, trabajoAfectaSalud: IDS.trabajoAfectaSalud,
        lavadoManos: IDS.lavadoManos, cambiosTemperatura: IDS.cambiosTemperatura, evitarDanos: IDS.evitarDanos,
        nnaGestante: IDS.nnaGestante, nnaLactante: IDS.nnaLactante,
        tipoDocAcudiente: IDS_ACUDIENTE.tipoDoc,
        estudia: IDS_ESCOLAR.actualmenteEstudia, actividades: IDS_ESCOLAR.actividadesRecreativas
    };

    let ultimosValores = {};

    setInterval(() => {
        const valoresActuales = {};
        Object.entries(IDS_MONITOREADOS).forEach(([clave, id]) => {
            valoresActuales[clave] = getElemento(id)?.value;
        });

        DECALOGO.forEach((item) => {
            valoresActuales[`decalogo_${item.numero}_compromiso`] = getElemento(item.compromiso)?.value;
            valoresActuales[`decalogo_${item.numero}_cumplimiento`] = getElemento(item.cumplimiento)?.value;
        });

        if (JSON.stringify(valoresActuales) !== JSON.stringify(ultimosValores)) {
            ultimosValores = valoresActuales;
            procesarBloque();
        }
    }, 500);

})();
