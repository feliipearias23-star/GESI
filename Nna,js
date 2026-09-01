// ==UserScript==
// @name        NNA
// @namespace    https://gesiapps.saludcapital.gov.co/GESI_sistemas/GESI_Form*
// @version      3.11
// @description  Automatización NNAT  
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
        ESTUDIA_SI: '958', ESTUDIA_NO: '959',
        ACTIVIDADES_SI: '958', ACTIVIDADES_NO: '959',
        ETNIA_ACUDIENTE: '84', POBLACION_INCLUSION: '4048',
        ACCIDENTE_TRABAJO: '4565',
        SINTOMAS: '959', CONDICIONES_LABORALES: '959',
        SEXO_MUJER: '68', SEXO_HOMBRE: '67',
        COMPROMISO_NO: '959', CUMPLIMIENTO_NO_APLICA: '960'
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
    const modificadoManualmente = new WeakMap();
    let autoAsignando = false;
    let validacionIntervenciones = true;
    let validacionEscolar = true;

    const getElemento = (id) => document.getElementById(id);

    // Color de resaltado para campos auto-asignados por el script (azul cielo)
    const COLOR_AUTO = '#cceeff';

    // Marca un campo como "tocado por el usuario" para no volver a sobrescribirlo
    const marcarComoManual = (elemento) => {
        if (!elemento || modificadoManualmente.has(elemento)) return;

        elemento.addEventListener('change', () => {
            if (autoAsignando) return;
            modificadoManualmente.set(elemento, true);
            elemento.setAttribute('data-utis-ultimo-valor', elemento.value);
            // v3.10: ya no se limpia el color azul cielo al marcar el campo como manual
        });
    };

    const respetarValorExistente = (elemento) => {
        if (!elemento || modificadoManualmente.has(elemento)) return;
        if (elemento.value) {
            modificadoManualmente.set(elemento, true);
            elemento.setAttribute('data-utis-ultimo-valor', elemento.value);
        }
    };

    // Asigna "valor" a "elemento" si aún no fue modificado manualmente
    const autoAsignar = (elemento, valor) => {
        if (!elemento || modificadoManualmente.get(elemento)) return;

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
        elemento.style.backgroundColor = COLOR_AUTO;
        autoAsignando = false;
    };

    // Igual que autoAsignar, pero respeta el último valor manual dentro de la misma ficha
    const autoAsignarConValorAnterior = (elemento, valorPorDefecto) => {
        if (!elemento) return;

        const valorAnterior = elemento.getAttribute('data-utis-ultimo-valor');

        if (modificadoManualmente.get(elemento)) {
            if (elemento.value !== valorAnterior) {
                elemento.setAttribute('data-utis-ultimo-valor', elemento.value);
            }
            return;
        }

        // Evita trabajo y disparo de evento si el valor ya es el correcto
        if (elemento.value === valorPorDefecto) {
            elemento.setAttribute('data-utis-ultimo-valor', valorPorDefecto);
            return;
        }

        autoAsignando = true;
        const opcion = elemento.querySelector(`option[value="${valorPorDefecto}"]`);
        elemento.value = valorPorDefecto;

        const select2 = document.getElementById('select2-' + elemento.id + '-container');
        if (select2 && opcion) {
            select2.textContent = opcion.text;
            select2.setAttribute('title', opcion.text);
        }

        elemento.setAttribute('data-utis-ultimo-valor', valorPorDefecto);
        elemento.dispatchEvent(new Event('change', { bubbles: true }));
        elemento.style.backgroundColor = COLOR_AUTO;
        autoAsignando = false;
    };


    const obtenerControlVisual = (elemento) => {
        if (!elemento || !elemento.parentNode) return elemento;
        const input = elemento.parentNode.querySelector(':scope > .utis-buscador-institucion-input');
        return input || elemento;
    };

    const bloquearCampo = (elemento) => {
        if (!elemento) return;
        elemento.disabled = true;
        elemento.value = '';
        limpiarMensajesPorCampo(elemento);
        elemento.dispatchEvent(new Event('change', { bubbles: true }));

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

        sexo.style.backgroundColor = COLOR_AUTO;
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

        respetarValorExistente(estadoCivil);
        autoAsignar(estadoCivil, edad < 14 ? VALORES.ESTADO_CIVIL_MENOR_14 : VALORES.ESTADO_CIVIL_MAYOR_14);
    };

    const aplicarTipoIntervencion = () => {
        const tipoDoc = getElemento(IDS.tipoDoc);
        const edadElemento = getElemento(IDS.edad);
        const tipoIntervencion = getElemento(IDS.tipoIntervencion);
        if (!tipoDoc || !edadElemento || !tipoIntervencion || !Object.values(TIPO_DOC).includes(tipoDoc.value)) return;

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
        const campo = getElemento(IDS.accidenteTrabajo);
        respetarValorExistente(campo);
        autoAsignarConValorAnterior(campo, VALORES.ACCIDENTE_TRABAJO);
    };

    const CAMPOS_SINTOMAS = [
        IDS.dolorCabeza, IDS.nauseasVomito, IDS.tosExpectoracion, IDS.sensacionCansancio,
        IDS.dificultadAprendizaje, IDS.secrecionOjos, IDS.enrojecimientoAmpollas,
        IDS.dolorArticular, IDS.dolorOido, IDS.problemasVoz
    ];

    const aplicarSintomas = () => {
        CAMPOS_SINTOMAS.forEach((id) => {
            const campo = getElemento(id);
            respetarValorExistente(campo);
            autoAsignarConValorAnterior(campo, VALORES.SINTOMAS);
        });
    };

    const CAMPOS_CONDICIONES_LABORALES = [
        IDS.motivoServicioMedico, IDS.trabajoAfectaSalud, IDS.lavadoManos,
        IDS.cambiosTemperatura, IDS.evitarDanos
    ];

    const aplicarCondicionesLaborales = () => {
        CAMPOS_CONDICIONES_LABORALES.forEach((id) => {
            const campo = getElemento(id);
            respetarValorExistente(campo);
            autoAsignarConValorAnterior(campo, VALORES.CONDICIONES_LABORALES);
        });

        const sexo = getElemento(IDS.sexo);
        const nnaGestante = getElemento(IDS.nnaGestante);
        const nnaLactante = getElemento(IDS.nnaLactante);

        if (sexo && sexo.value === VALORES.SEXO_MUJER) {
            desbloquearCampo(nnaGestante);
            respetarValorExistente(nnaGestante);
            autoAsignarConValorAnterior(nnaGestante, VALORES.CONDICIONES_LABORALES);
            if (nnaGestante) nnaGestante.style.backgroundColor = COLOR_AUTO;

            desbloquearCampo(nnaLactante);
            respetarValorExistente(nnaLactante);
            autoAsignarConValorAnterior(nnaLactante, VALORES.CONDICIONES_LABORALES);
            if (nnaLactante) nnaLactante.style.backgroundColor = COLOR_AUTO;
        } else {
            bloquearCampo(nnaGestante);
            bloquearCampo(nnaLactante);
        }
    };

    const aplicarDecalogo = () => {
        DECALOGO.forEach((item) => {
            const compromiso = getElemento(item.compromiso);
            const cumplimiento = getElemento(item.cumplimiento);

            respetarValorExistente(compromiso);
            respetarValorExistente(cumplimiento);

            autoAsignarConValorAnterior(compromiso, VALORES.COMPROMISO_NO);
            autoAsignarConValorAnterior(cumplimiento, VALORES.CUMPLIMIENTO_NO_APLICA);
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
        mensaje.textContent = `⚠ Con ${edad} años, el tipo de documento no debería ser "${regla.nombre}".`;
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

        tipoIntervencion.style.border = '';
        edadElemento.style.border = '';
        tipoIntervencion.parentNode?.querySelector('.utis-mensaje-validacion-intervencion')?.remove();

        const edad = parseInt(edadElemento.value, 10);
        if (isNaN(edad) || !tipoIntervencion.value) return;

        const esperado = edad < 14 ? VALORES.TIPO_INTERVENCION_MENOR_14 : VALORES.TIPO_INTERVENCION_MAYOR_14;

        if (tipoIntervencion.value === esperado) {
            validacionIntervenciones = true;
            return;
        }

        tipoIntervencion.style.border = '2px solid red';
        edadElemento.style.border = '2px solid red';

        const etiqueta = edad < 14 ? 'Niños y Niñas' : 'Adolescentes';
        const mensaje = document.createElement('div');
        mensaje.className = 'utis-mensaje-validacion-intervencion';
        mensaje.textContent = `⚠ Con ${edad} años, el Tipo de Intervención debe ser "${etiqueta}". Por favor corrija antes de guardar.`;
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
    const CAMPOS_NNAT_MANUALES = [
        IDS.genero, IDS.orientacionSexual, IDS.identidadGenero, IDS.estadoCivil, IDS.etnia,
        IDS.categoriaDiscapacidad, IDS.poblacionDiferencial, IDS.nacionalidad, IDS.tipoIntervencion
    ];

    const CAMPOS_LABORALES_MANUALES = [
        IDS.motivoServicioMedico, IDS.trabajoAfectaSalud, IDS.lavadoManos,
        IDS.cambiosTemperatura, IDS.evitarDanos, IDS.nnaGestante, IDS.nnaLactante
    ];

    const CAMPOS_ACUDIENTE_MANUALES = [
        IDS_ACUDIENTE.nacionalidad, IDS_ACUDIENTE.etnia, IDS_ACUDIENTE.poblacionInclusionOficio
    ];

    const CAMPOS_ESCOLARES_MANUALES = [
        IDS_ESCOLAR.razonAbandono, IDS_ESCOLAR.institucion, IDS_ESCOLAR.curso, IDS_ESCOLAR.queActividades
    ];

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

        CAMPOS_NNAT_MANUALES.forEach((id) => marcarComoManual(getElemento(id)));
        marcarComoManual(getElemento(IDS.accidenteTrabajo));
        CAMPOS_SINTOMAS.forEach((id) => marcarComoManual(getElemento(id)));
        CAMPOS_LABORALES_MANUALES.forEach((id) => marcarComoManual(getElemento(id)));

        aplicarReglasAcudiente();
        CAMPOS_ACUDIENTE_MANUALES.forEach((id) => marcarComoManual(getElemento(id)));

        inicializarBuscadorInstitucion();
        validarInformacionEscolar();
        CAMPOS_ESCOLARES_MANUALES.forEach((id) => marcarComoManual(getElemento(id)));

        DECALOGO.forEach((item) => {
            marcarComoManual(getElemento(item.compromiso));
            marcarComoManual(getElemento(item.cumplimiento));
        });
    };

    // ============================================================
    // BLOQUEO DE GUARDADO SI HAY ERRORES DE VALIDACIÓN
    // ============================================================
    const bloquearGuardoSiHayError = () => {
        document.querySelectorAll(
            'button[type="submit"], button[onclick*="guardar"], button[onclick*="Guardar"], .btn-guardar, [data-action="save"]'
        ).forEach((boton) => {
            boton.addEventListener('click', (evento) => {
                validarEdadTipoIntervencion();
                actualizarEstadoValidacionEscolar();

                if (validacionIntervenciones && validacionEscolar) return;

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
        });
    };

    const IDS_DISPARADORES = [
        IDS.tipoDoc, IDS.sexo, IDS.edad,
        IDS_ACUDIENTE.tipoDoc,
        IDS_ESCOLAR.actualmenteEstudia, IDS_ESCOLAR.actividadesRecreativas,
        IDS_ESCOLAR.razonAbandono, IDS_ESCOLAR.institucion, IDS_ESCOLAR.curso, IDS_ESCOLAR.queActividades
    ];

    document.addEventListener('change', (evento) => {

        if (autoAsignando) return;
        if (IDS_DISPARADORES.includes(evento.target?.id)) procesarBloque();
    }, true);

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
