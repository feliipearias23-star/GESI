// ==UserScript==
// @name         PERSONA MAYOR
// @namespace    https://gesiapps.saludcapital.gov.co/GESI_sistemas/GESI_Form*
// @version      2026.10.18.1
// @description  Persona Mayor: cascadas por tipo de documento, cascada sexo/género/identidad/orientación según edad, validador edad/documento, condiciones crónicas en "No aplica" por defecto y buscador en Nombre EAPB
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
        tipo_doc: 'valorControl18630',
        nacionalidad: 'valorControl18632',
        sexo: 'valorControl18633',
        genero: 'valorControl18634',
        identidad_genero: 'valorControl18635',
        orientacion: 'valorControl18636',
        edad: 'valorControl18638',          // campo "Años" (calculado por GESI)
        etnia: 'valorControl18640',
        categoria_discapacidad: 'valorControl18643',
        pob_dif: 'valorControl18644',
        pob_inclusion: 'valorControl18645', // población de inclusión por oficio
        eapb: 'valorControl18647',
    };

    // Condiciones crónicas (caracterización): listas de selección múltiple que se dejan por defecto
    // en "No aplica". Para agregar otra lista, basta un par { id, noAplica }.
    // La lista de "Alertas en vejez" (valorControl18666) no tiene opción "No aplica", por eso no está.
    const CONDICIONES_CRONICAS_NO_APLICA = [
        { id: 'valorControl18651', noAplica: '2603' }, // Condición crónica: 29- No aplica
        { id: 'valorControl18654', noAplica: '2605' }, // Enfermedad transmisible y ETV: 9- No aplica
        { id: 'valorControl18657', noAplica: '4098' }, // Alerta nutricional: 17- No aplica
        { id: 'valorControl18660', noAplica: '2607' }, // Alertas psicosociales: 22- No aplica
        { id: 'valorControl18663', noAplica: '2608' }, // Alerta salud oral: 29- No aplica
        { id: 'valorControl18669', noAplica: '4106' }, // Limitaciones para la actividad: 23- No aplica
    ];

    // Al cambiar el tipo de documento: valores comunes + los propios de cada grupo
    const VALORES_COMUNES_DOC = {
        etnia: '84',                    // 6- Ninguno
        categoria_discapacidad: '3822', // 8 - No aplica
        pob_inclusion: '4048',          // 15- No aplica
    };
    const GRUPOS_DOC = [
        // CC, RC, TI (nacionales): además pinta el propio campo de tipo de documento
        { docs: [59, 60, 61], colorearDoc: true, valores: { nacionalidad: '50', pob_dif: '2620' } },   // COL, 14- No Aplica
        // CE, NUIP, Pasaporte, Adulto sin ID, Menor sin ID, PPT (extranjeros)
        { docs: [62, 63, 64, 65, 66, 2482], colorearDoc: false, valores: { nacionalidad: '236', pob_dif: '4051' } }, // VEN, 17- Migrante Internacional
    ];

    // Cascada sexo -> género / orientación / identidad de género.
    // Con edad conocida: de 14 años en adelante -> reglas de mayores; menores de 14 -> reglas de menores.
    // Sin edad (campo vacío) se usa la regla anterior: CC -> mayores, otro documento -> menores.
    const EDAD_MINIMA_MAYORES = 14;
    const CASCADA_MAYORES = {
        '67': { genero: '70', orientacion: '4024', identidad_genero: '4515' }, // Hombre
        '68': { genero: '71', orientacion: '4024', identidad_genero: '4514' }, // Mujer
    };
    const CASCADA_MENORES = { genero: '4513', orientacion: '4028', identidad_genero: '4020' };

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
        try { fn(); } catch (error) { console.error('[PERSONA MAYOR · ' + nombre + ']', error); }
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
    // VALIDADOR EDAD / TIPO DE DOCUMENTO
    // ════════════════════════════════════════════════════════════════════
    const CLASE_ERROR = 'mensaje-validacion-pm';
    const CLASE_OK = 'mensaje-autocorreccion-pm';
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
    // CONDICIONES CRÓNICAS — "No aplica" por defecto
    // Se marca UNA sola vez por lista y solo si no tiene nada seleccionado; después se respeta
    // lo que la persona cambie a mano (incluso si deja la lista vacía o quita "No aplica").
    // ════════════════════════════════════════════════════════════════════
    function condicionesCronicasNoAplica() {
        CONDICIONES_CRONICAS_NO_APLICA.forEach(({ id, noAplica }) => {
            const campo = document.getElementById(id);
            if (!campo || campo.dataset.uaiCondicionInicial === '1') return;
            campo.dataset.uaiCondicionInicial = '1';
            const vacio = !Array.from(campo.options).some((o) => o.selected);
            if (vacio) aplicar(campo, noAplica);
        });
    }

    // ════════════════════════════════════════════════════════════════════
    // BUSCADOR EN "NOMBRE EAPB"
    // Caja de texto con lista filtrable (JS puro). El select original se conserva, invisible pero
    // funcional, para que GESI siga leyendo y enviando su valor.
    // ════════════════════════════════════════════════════════════════════
    const normalizar = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

    function textoSeleccionado(select) {
        const op = select.options[select.selectedIndex];
        return op && op.value !== '' ? op.text.trim() : '';
    }

    function construirBuscadorEapb(select) {
        select.dataset.uaiBuscador = '1';

        const contenedor = document.createElement('div');
        contenedor.style.position = 'relative';

        const input = document.createElement('input');
        input.type = 'text';
        input.className = select.className;
        input.placeholder = 'Escriba para buscar la EAPB…';
        input.autocomplete = 'off';
        input.style.width = '100%';
        input.value = textoSeleccionado(select);

        const lista = document.createElement('div');
        Object.assign(lista.style, {
            display: 'none', position: 'absolute', top: '100%', left: '0', right: '0', zIndex: '99999',
            maxHeight: '240px', overflowY: 'auto', background: '#fff', color: '#000',
            border: '1px solid #90caf9', borderRadius: '4px', fontSize: '13px',
            boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
        });

        select.parentNode.insertBefore(contenedor, select);
        contenedor.appendChild(input);
        contenedor.appendChild(lista);
        contenedor.appendChild(select);
        // El select queda dentro del contenedor, invisible, para no perder la validación nativa de GESI
        Object.assign(select.style, {
            position: 'absolute', left: '0', bottom: '0', width: '100%', height: '1px',
            padding: '0', border: '0', opacity: '0', pointerEvents: 'none',
        });
        select.tabIndex = -1;
        select._uaiInput = input;

        let visibles = [];
        let activo = -1;

        function pintar() {
            lista.textContent = '';
            if (!visibles.length) {
                const vacio = document.createElement('div');
                vacio.textContent = 'Sin resultados';
                Object.assign(vacio.style, { padding: '6px 8px', color: '#777' });
                lista.appendChild(vacio);
            }
            visibles.forEach((op, i) => {
                const item = document.createElement('div');
                item.textContent = op.text.trim();
                Object.assign(item.style, {
                    padding: '5px 8px', cursor: 'pointer', background: i === activo ? '#e3f2fd' : '#fff',
                });
                // mousedown (y no click) para que el blur del input no cierre la lista antes de elegir
                item.addEventListener('mousedown', (e) => { e.preventDefault(); elegir(op); });
                lista.appendChild(item);
            });
            lista.style.display = 'block';
            const itemActivo = lista.children[activo];
            if (itemActivo && itemActivo.scrollIntoView) itemActivo.scrollIntoView({ block: 'nearest' });
        }

        function cerrar() { lista.style.display = 'none'; }

        function opcionesReales() { return Array.from(select.options).filter((o) => o.value !== ''); }

        function mostrarTodas() {
            visibles = opcionesReales();
            activo = visibles.findIndex((o) => o.value === select.value);
            pintar();
        }

        function filtrar() {
            const terminos = normalizar(input.value).split(/\s+/).filter(Boolean);
            visibles = opcionesReales().filter((o) => {
                const t = normalizar(o.text);
                return terminos.every((x) => t.includes(x));
            });
            activo = visibles.length ? 0 : -1;
            pintar();
        }

        function elegir(op) {
            select.value = op.value;
            input.value = op.text.trim();
            cerrar();
            ['input', 'change'].forEach((ev) => select.dispatchEvent(new Event(ev, { bubbles: true })));
        }

        input.addEventListener('focus', () => { input.select(); mostrarTodas(); });
        input.addEventListener('input', filtrar);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                if (lista.style.display === 'none') { mostrarTodas(); return; }
                if (!visibles.length) return;
                activo = e.key === 'ArrowDown' ? (activo + 1) % visibles.length
                                               : (activo - 1 + visibles.length) % visibles.length;
                pintar();
            } else if (e.key === 'Enter') {
                if (lista.style.display !== 'none' && activo >= 0 && visibles[activo]) {
                    e.preventDefault();
                    elegir(visibles[activo]);
                }
            } else if (e.key === 'Escape') {
                input.value = textoSeleccionado(select);
                cerrar();
            }
        });
        input.addEventListener('blur', () => {
            cerrar();
            if (input.value.trim() === '') {
                // Caja vacía: se limpia la selección
                if (select.value !== '') {
                    select.value = '';
                    ['input', 'change'].forEach((ev) => select.dispatchEvent(new Event(ev, { bubbles: true })));
                }
            } else {
                // Texto escrito pero sin elegir una opción: se vuelve a mostrar la opción vigente
                input.value = textoSeleccionado(select);
            }
        });
    }

    // Crea el buscador si hace falta (GESI puede volver a dibujar el formulario) y mantiene la caja
    // sincronizada cuando GESI cambia el valor del select por su cuenta (p. ej. al cargar una ficha).
    function buscadorEapb() {
        const select = getCampo('eapb');
        if (!select || !select.parentNode) return;

        if (select.dataset.uaiBuscador === '1' && select._uaiInput && !select._uaiInput.isConnected) {
            delete select.dataset.uaiBuscador;
        }
        if (select.dataset.uaiBuscador !== '1') { construirBuscadorEapb(select); return; }

        const input = select._uaiInput;
        if (input && document.activeElement !== input) {
            const texto = textoSeleccionado(select);
            if (input.value !== texto) input.value = texto;
        }
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
            ejecutarSeguro('Condiciones crónicas', condicionesCronicasNoAplica);
            ejecutarSeguro('Buscador EAPB', buscadorEapb);

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
            console.error('[PERSONA MAYOR]', error);
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

    // Respaldo: GESI cambia valores (p. ej. los Años al digitar la fecha) sin disparar eventos
    setInterval(tick, 300);
    tick();
})();
