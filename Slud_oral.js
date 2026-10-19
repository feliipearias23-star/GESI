// ==UserScript==
// @name         SALUD ORAL
// @namespace    https://gesiapps.saludcapital.gov.co/GESI_sistemas/GESI_Form*
// @version      2026.10.18.1
// @description  Salud Oral: cascadas por tipo de documento, cascada sexo/género según edad, validador edad/documento, canalización por defecto (no se canalizó: usuario controlado en su ruta) y validación de fechas contra re_caracterización e intervención
// @author       You
// @match        https://gesiapps.saludcapital.gov.co/GESI_sistemas/GESI_Form*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function () {
    'use strict';

    // ════════════════════════════════════════════════════════════════════
    // CONFIGURACIÓN
    // ════════════════════════════════════════════════════════════════════
    const bgSuccess = 'rgba(50, 200, 150, 0.2)';

    // IDs de los campos de la base (una sola tabla)
    const IDS = {
        recaracterizacion: 'valorControl18702', // Fecha re_caracterización
        tipo_doc: 'valorControl18705',
        nacionalidad: 'valorControl18707',
        sexo: 'valorControl18708',
        genero: 'valorControl18709',
        edad: 'valorControl18711',              // campo "Edad" (calculado por GESI)
        etapa_gestacion: 'valorControl18713',
        rol_institucion: 'valorControl18714',
        canalizacion: 'valorControl18745',
        porque_no_canalizo: 'valorControl18746',
    };

    // Fecha de intervención (campo oculto del encabezado de la ficha)
    const ID_FECHA_INTERVENCION = 'FechaIntervencion';

    // Fechas que, con la re_caracterización diligenciada, deben ser iguales o posteriores a ella:
    // Identificación de alertas (fecha 1 y 2) y Clasificación - Tamizaje (fecha 1 y 2).
    // Solo se comparan si su contenido es una fecha válida (los textos como "1,2,9,25" se ignoran).
    const FECHAS_POSTERIORES = ['valorControl18716', 'valorControl18718', 'valorControl18721', 'valorControl18723'];

    // Valores que se dejan por defecto UNA sola vez (solo si el campo está vacío); después se respeta
    // lo que la persona cambie a mano. "requiere" espera a que otro campo tenga cierto valor.
    const DEFAULTS_UNA_VEZ = [
        { clave: 'canalizacion', valor: '959' },                                                   // No
        { clave: 'porque_no_canalizo', valor: '4129', requiere: { clave: 'canalizacion', valor: '959' } }, // 2 - Usuario Controlado en su respectiva ruta
        { clave: 'rol_institucion', valor: '4120' },                                               // 4 - Usuario beneficiario de la institución
    ];

    // Al cambiar el tipo de documento: valores comunes + los propios de cada grupo
    const VALORES_COMUNES_DOC = {
        etapa_gestacion: '3785', // 5- No aplica
    };
    const GRUPOS_DOC = [
        // CC, RC, TI (nacionales): además pinta el propio campo de tipo de documento
        { docs: [59, 60, 61], colorearDoc: true, valores: { nacionalidad: '50' } },    // COL
        // CE, NUIP, Pasaporte, Adulto sin ID, Menor sin ID, PPT (extranjeros)
        { docs: [62, 63, 64, 65, 66, 2482], colorearDoc: false, valores: { nacionalidad: '236' } }, // VEN
    ];

    // Cascada sexo -> género.
    // Con edad conocida: de 14 años en adelante -> reglas de mayores; menores de 14 -> reglas de menores.
    // Sin edad (campo vacío) se usa la regla anterior: CC -> mayores, otro documento -> menores.
    const EDAD_MINIMA_MAYORES = 14;
    const CASCADA_MAYORES = {
        '67': { genero: '70' }, // Hombre -> Masculino
        '68': { genero: '71' }, // Mujer -> Femenino
    };
    const CASCADA_MENORES = { genero: '4513' }; // No aplica

    // Validador edad / tipo de documento
    const reglasDocumento = {
        '60': { nombre: 'Registro Civil',       edadMin: 0,  edadMax: 6   },
        '61': { nombre: 'Tarjeta de Identidad', edadMin: 7,  edadMax: 17  },
        '59': { nombre: 'Cédula de Ciudadanía', edadMin: 18, edadMax: 999 },
    };

    // ════════════════════════════════════════════════════════════════════
    // UTILIDADES
    // ════════════════════════════════════════════════════════════════════
    function getCampo(clave) { return document.getElementById(IDS[clave]); }

    function ejecutarSeguro(nombre, fn) {
        try { fn(); } catch (error) { console.error('[SALUD ORAL · ' + nombre + ']', error); }
    }

    // Asigna un valor (también en listas de selección múltiple), pinta el campo como
    // "autocompletado" y avisa a GESI con un evento change solo si el valor cambió.
    function aplicar(campo, valor) {
        if (!campo) return;
        const v = String(valor);
        if (campo.tagName === 'SELECT' && !Array.from(campo.options).some((o) => o.value === v)) return;

        let cambio;
        if (campo.multiple) {
            const seleccionados = Array.from(campo.options).filter((o) => o.selected).map((o) => o.value);
            cambio = !(seleccionados.length === 1 && seleccionados[0] === v);
            if (cambio) Array.from(campo.options).forEach((o) => { o.selected = (o.value === v); });
        } else {
            cambio = campo.value !== v;
            if (cambio) campo.value = v;
        }
        campo.style.backgroundColor = bgSuccess;
        if (cambio) campo.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Aplica un objeto { clave: valor }
    function aplicarMapa(valores) {
        Object.keys(valores).forEach((k) => aplicar(getCampo(k), valores[k]));
    }

    // ════════════════════════════════════════════════════════════════════
    // CASCADAS
    // ════════════════════════════════════════════════════════════════════
    function cascadaDocumento() {
        const tipoDoc = getCampo('tipo_doc');
        if (!tipoDoc) return;
        const v = parseInt(tipoDoc.value, 10);
        const grupo = GRUPOS_DOC.find((g) => g.docs.includes(v));
        if (!grupo) return;
        if (grupo.colorearDoc) tipoDoc.style.backgroundColor = bgSuccess;
        aplicarMapa(Object.assign({}, VALORES_COMUNES_DOC, grupo.valores));
    }

    function cascadaSexoEdad() {
        const sexo = getCampo('sexo');
        const tipoDoc = getCampo('tipo_doc');
        const edadEl = getCampo('edad');
        if (!sexo || !tipoDoc) return;

        const sexoActual = sexo.value;
        const esHombreOMujer = sexoActual === '67' || sexoActual === '68';
        const edad = parseInt(edadEl ? edadEl.value : '', 10);
        const esMayor = !isNaN(edad) ? edad >= EDAD_MINIMA_MAYORES : tipoDoc.value === '59';
        const cascada = esMayor
            ? CASCADA_MAYORES[sexoActual]
            : (esHombreOMujer ? CASCADA_MENORES : null);
        if (!cascada) return;

        sexo.style.backgroundColor = bgSuccess;
        aplicarMapa(cascada);
    }

    // ════════════════════════════════════════════════════════════════════
    // VALORES POR DEFECTO (canalización, por qué no se canalizó, rol)
    // ════════════════════════════════════════════════════════════════════
    function defaultsUnaVez() {
        DEFAULTS_UNA_VEZ.forEach(({ clave, valor, requiere }) => {
            const campo = getCampo(clave);
            if (!campo || campo.dataset.uaiInicial === '1') return;
            if (requiere) {
                const dependencia = getCampo(requiere.clave);
                if (!dependencia || dependencia.value !== requiere.valor) return;
            }
            campo.dataset.uaiInicial = '1';
            if (campo.value === '') aplicar(campo, valor);
        });
    }

    // ════════════════════════════════════════════════════════════════════
    // VALIDADOR EDAD / TIPO DE DOCUMENTO
    // ════════════════════════════════════════════════════════════════════
    const CLASE_ERROR = 'mensaje-validacion-so';
    const CLASE_OK = 'mensaje-autocorreccion-so';
    let intentoCorreccion = ''; // "edad|documento" de la última corrección automática (evita bucles)
    let marcado = false;        // true si el validador dejó los campos en rojo

    function quitarMensajes() {
        document.querySelectorAll('.' + CLASE_ERROR + ', .' + CLASE_OK).forEach((m) => m.remove());
    }

    function desmarcar(campoEdad, campoDoc) {
        if (marcado) {
            [campoEdad, campoDoc].forEach((c) => { if (c) { c.style.border = ''; c.style.background = ''; } });
            marcado = false;
        }
        const err = document.querySelector('.' + CLASE_ERROR);
        if (err) err.remove();
    }

    function mostrarMensaje(campoEdad, clase, texto, estilo, segundos) {
        quitarMensajes();
        const div = document.createElement('div');
        div.className = clase;
        div.textContent = texto;
        Object.assign(div.style, estilo, { padding: '6px', marginTop: '4px', borderRadius: '4px', fontSize: '12px' });
        campoEdad.parentNode.appendChild(div);
        if (segundos) setTimeout(() => div.remove(), segundos * 1000);
    }

    // Cambia el tipo de documento al que corresponde por la edad y avisa unos segundos.
    // La cascada del nuevo documento se aplica ANTES de avisar a GESI, para que su validación
    // nativa (documento vs nacionalidad) ya vea los valores correctos.
    function corregirTipoDocumento(campoEdad, campoDoc, valor, nombre, edad) {
        if (campoDoc.tagName === 'SELECT' && !Array.from(campoDoc.options).some((o) => o.value === valor)) return false;
        campoDoc.value = valor;
        estado.doc = valor;
        cascadaDocumento();
        ['input', 'change'].forEach((ev) => campoDoc.dispatchEvent(new Event(ev, { bubbles: true })));
        mostrarMensaje(campoEdad, CLASE_OK,
            `✔ Con ${edad} años el tipo de documento se cambió a "${nombre}".`,
            { color: '#1b5e20', background: '#e8f5e9', border: '1px solid #a5d6a7' }, 6);
        return true;
    }

    function validarEdadDocumento() {
        const campoEdad = getCampo('edad');
        const campoDoc = getCampo('tipo_doc');
        if (!campoEdad || !campoDoc || !campoEdad.parentNode) return;

        desmarcar(campoEdad, campoDoc);

        const edad = parseInt(campoEdad.value, 10);
        const docValue = campoDoc.value;
        const regla = reglasDocumento[docValue];
        if (isNaN(edad) || !regla) { intentoCorreccion = ''; return; }
        if (edad >= regla.edadMin && edad <= regla.edadMax) { intentoCorreccion = ''; return; }

        const correcto = Object.entries(reglasDocumento)
            .find(([, r]) => edad >= r.edadMin && edad <= r.edadMax);
        const docCorrectoValor = correcto ? correcto[0] : null;
        const docCorrecto = correcto ? correcto[1].nombre : 'Desconocido';

        // Corrección automática (una sola vez por combinación edad|documento)
        const clave = edad + '|' + docValue;
        if (docCorrectoValor && intentoCorreccion !== clave) {
            intentoCorreccion = clave;
            if (corregirTipoDocumento(campoEdad, campoDoc, docCorrectoValor, docCorrecto, edad)) return;
        }

        // Si no se pudo corregir: se marca en rojo
        [campoEdad, campoDoc].forEach((c) => { c.style.border = '2px solid red'; c.style.background = '#fff0f0'; });
        marcado = true;
        mostrarMensaje(campoEdad, CLASE_ERROR,
            `⚠ Con ${edad} años debe usar "${docCorrecto}".`,
            { color: '#b30000', background: '#ffe6e6', border: '1px solid #ff9999' }, 0);
    }

    // ════════════════════════════════════════════════════════════════════
    // VALIDACIÓN DE FECHAS
    //  a) La fecha de re_caracterización no puede ser menor a la fecha de intervención.
    //  b) Con la re_caracterización diligenciada, las demás fechas deben ser iguales o posteriores.
    // Solo avisa (borde rojo y mensaje); no borra lo digitado.
    // ════════════════════════════════════════════════════════════════════
    const CLASE_FECHA = 'mensaje-fecha-so';
    let ultimaFirmaFechas = null;

    // Acepta dd/mm/aaaa, dd-mm-aaaa y aaaa-mm-dd (con o sin hora). Devuelve Date o null.
    function parseFecha(texto) {
        const s = String(texto || '').trim();
        let d, mo, y;
        let m = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/.exec(s);
        if (m) {
            d = +m[1]; mo = +m[2]; y = +m[3];
        } else {
            m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
            if (!m) return null;
            y = +m[1]; mo = +m[2]; d = +m[3];
        }
        const f = new Date(y, mo - 1, d);
        if (f.getFullYear() !== y || f.getMonth() !== mo - 1 || f.getDate() !== d) return null;
        return f;
    }

    function formatearFecha(f) {
        const dd = String(f.getDate()).padStart(2, '0');
        const mm = String(f.getMonth() + 1).padStart(2, '0');
        return dd + '/' + mm + '/' + f.getFullYear();
    }

    function limpiarMarcasFechas() {
        document.querySelectorAll('.' + CLASE_FECHA).forEach((m) => m.remove());
        document.querySelectorAll('[data-uai-fecha-error="1"]').forEach((el) => {
            el.style.border = '';
            el.style.background = '';
            delete el.dataset.uaiFechaError;
        });
    }

    function marcarFecha(campo, texto) {
        campo.style.border = '2px solid red';
        campo.style.background = '#fff0f0';
        campo.dataset.uaiFechaError = '1';
        const div = document.createElement('div');
        div.className = CLASE_FECHA;
        div.textContent = '⚠ ' + texto;
        Object.assign(div.style, { color: '#b30000', background: '#ffe6e6', padding: '6px',
            marginTop: '4px', border: '1px solid #ff9999', borderRadius: '4px', fontSize: '12px' });
        const ancla = campo.closest('.input-group') || campo;
        ancla.insertAdjacentElement('afterend', div);
    }

    function validarFechas() {
        const intervencionEl = document.getElementById(ID_FECHA_INTERVENCION);
        const recarEl = getCampo('recaracterizacion');
        const otras = FECHAS_POSTERIORES.map((id) => document.getElementById(id));

        // Solo se revisa si algún valor cambió desde la última vez
        const firma = [intervencionEl, recarEl].concat(otras).map((el) => (el ? el.value : '')).join('|');
        if (firma === ultimaFirmaFechas) return;
        ultimaFirmaFechas = firma;

        limpiarMarcasFechas();

        const intervencion = intervencionEl ? parseFecha(intervencionEl.value) : null;
        const recar = recarEl ? parseFecha(recarEl.value) : null;
        if (!recar) return; // sin re_caracterización diligenciada no hay nada que comparar

        if (intervencion && recar < intervencion) {
            marcarFecha(recarEl, `La fecha de re_caracterización no puede ser menor a la fecha de intervención (${formatearFecha(intervencion)}).`);
        }
        otras.forEach((el) => {
            const f = el ? parseFecha(el.value) : null;
            if (f && f < recar) {
                marcarFecha(el, `Debe ser igual o posterior a la fecha de re_caracterización (${formatearFecha(recar)}).`);
            }
        });
    }

    // ════════════════════════════════════════════════════════════════════
    // DETECCIÓN DE CAMBIOS (un solo punto de entrada para todo)
    // ════════════════════════════════════════════════════════════════════
    const estado = { listo: false, doc: '', sexo: '', edad: '' };
    let enTick = false;

    function tick() {
        if (enTick) return;
        enTick = true;
        try {
            ejecutarSeguro('Valores por defecto', defaultsUnaVez);
            ejecutarSeguro('Validación de fechas', validarFechas);

            const tipoDoc = getCampo('tipo_doc');
            const sexo = getCampo('sexo');
            if (!tipoDoc || !sexo) return;

            const edadEl = getCampo('edad');
            const edadActual = edadEl ? edadEl.value : '';

            // Primera vez que existen los campos: punto de partida, no dispara cascadas
            if (!estado.listo) {
                estado.doc = tipoDoc.value;
                estado.sexo = sexo.value;
                estado.edad = edadActual;
                estado.listo = true;
                validarEdadDocumento();
                return;
            }

            // 1) Validador: cambió el documento o la edad (puede corregir el documento)
            if (tipoDoc.value !== estado.doc || edadActual !== estado.edad) validarEdadDocumento();

            // 2) Cascada por tipo de documento
            if (tipoDoc.value !== estado.doc) {
                estado.doc = tipoDoc.value;
                cascadaDocumento();
            }

            // 3) Cascada por sexo / edad
            if (sexo.value !== estado.sexo || edadActual !== estado.edad) {
                estado.sexo = sexo.value;
                estado.edad = edadActual;
                cascadaSexoEdad();
            }
        } catch (error) {
            console.error('[SALUD ORAL]', error);
        } finally {
            enTick = false;
        }
    }

    // Reacción inmediata en fase de captura (antes que los manejadores de GESI), para que la
    // nacionalidad ya esté corregida cuando GESI valide el tipo de documento.
    const IDS_OBSERVADOS = [IDS.tipo_doc, IDS.sexo, IDS.edad];
    ['input', 'change'].forEach((ev) => {
        document.addEventListener(ev, (e) => {
            if (e.target && IDS_OBSERVADOS.includes(e.target.id)) tick();
        }, true);
    });

    // Respaldo: GESI cambia valores (p. ej. la edad o las fechas) sin disparar eventos
    setInterval(tick, 300);
    tick();
})();
