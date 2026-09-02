// ==UserScript==
// @name         AIRE Y SOL - GESI
// @namespace    GESI_AireYSol
// @version      2.0
// @description  Autocompleta y SINCRONIZA (entre TODAS las pestanas abiertas, no solo dentro de una pagina) Localidad y UPZ/UPR por consecutivo de ficha; sincroniza Fecha con Fecha de Intervencion; mapea teclas 1/2/3 a Inicial/Intermedio/Avanzado en campos IBOCA/IUV/ruido
// @match        https://gesiapps.saludcapital.gov.co/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    console.log('[AIRE Y SOL] Script cargado - version 2.0');

    // Exposicion temporal para depuracion desde la consola del navegador.
    window.AIRE_SOL_DEBUG = {
        ID_UPZ: 'valorControl18134',
        ID_LOCALIDAD: 'valorControl18133',
        STORAGE_PREFIX_UPZ: 'AIRE_SOL_UPZ_',
        STORAGE_PREFIX_LOC: 'AIRE_SOL_LOC_',
        getFichaNumero: () => getFichaNumeroDebug(),
        obtenerTodosPorId: (id) => Array.from(document.querySelectorAll('[id="' + id + '"]')),
        sincronizarUPZ: () => sincronizarUPZ(),
        sincronizarLocalidad: () => sincronizarLocalidad(),
        estaVacio: (campo) => estaVacio(campo),
        obtenerValorCampo: (campo) => obtenerValorCampo(campo),
        asignarValorCampo: (campo, valor) => asignarValorCampo(campo, valor),
    };

    function getFichaNumeroDebug() {
        const fichaInput = document.getElementById('Ficha_fic');
        return fichaInput ? fichaInput.value : null;
    }

    // ---------------------------------------------------------------
    // Configuracion de IDs
    // ---------------------------------------------------------------
    const ID_FICHA = 'Ficha_fic';
    const ID_LOCALIDAD = 'valorControl18133';
    const ID_UPZ = 'valorControl18134';
    const ID_FECHA = 'valorControl18132';
    const ID_FECHA_INTERVENCION = 'FechaIntervencion';

    const STORAGE_PREFIX_UPZ = 'AIRE_SOL_UPZ_';
    const STORAGE_PREFIX_LOC = 'AIRE_SOL_LOC_';

    // Campos de escala Inicial/Intermedio/Avanzado (IBOCA, IUV, ruido)
    const IDS_ESCALA = [
        'valorControl18135',
        'valorControl18136',
        'valorControl18137',
        'valorControl18138',
        'valorControl18139'
    ];
    const MAPA_TECLA_A_PALABRA = { '1': 'inicial', '2': 'intermedio', '3': 'avanzado' };

    // ---------------------------------------------------------------
    // Utilidades generales
    // ---------------------------------------------------------------
    function fireChange(el) {
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function obtenerTodosPorId(id) {
        return Array.from(document.querySelectorAll('[id="' + id + '"]'));
    }

    function getFichaNumero() {
        const fichaInput = document.getElementById(ID_FICHA);
        if (!fichaInput) return null;
        const valor = (fichaInput.value || '').trim();
        return valor.length > 0 ? valor : null;
    }

    function getCodigoLocalidad(fichaNumero) {
        if (!fichaNumero || fichaNumero.length < 3) return null;
        return fichaNumero.substring(1, 3);
    }

    function seleccionarOpcionPorPrefijo(select, prefijo) {
        if (!select || !prefijo) return false;
        for (const opt of select.options) {
            if (opt.text.trim().startsWith(prefijo)) {
                if (select.value !== opt.value) {
                    select.value = opt.value;
                    fireChange(select);
                }
                return true;
            }
        }
        return false;
    }

    function asignarValorCampo(campo, valor) {
        if (!campo || valor === null || valor === undefined || valor === '') return;

        if (campo.tagName === 'SELECT') {
            let coincide = Array.from(campo.options).some(o => o.value === valor);
            if (coincide) {
                if (campo.value !== valor) {
                    campo.value = valor;
                    fireChange(campo);
                }
                return;
            }
            const porTexto = Array.from(campo.options).find(o => o.text.trim() === valor);
            if (porTexto) {
                if (campo.value !== porTexto.value) {
                    campo.value = porTexto.value;
                    fireChange(campo);
                }
            }
        } else {
            if (campo.value !== valor) {
                campo.value = valor;
                fireChange(campo);
            }
        }
    }

    function obtenerValorCampo(campo) {
        if (!campo) return '';
        if (campo.tagName === 'SELECT') {
            const opt = campo.options[campo.selectedIndex];
            return opt ? opt.text.trim() : '';
        }
        return (campo.value || '').trim();
    }

    function normalizarTexto(texto) {
        return (texto || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim();
    }

    function seleccionarOpcionPorPalabraClave(select, palabraClave) {
        if (!select || !palabraClave) return false;
        for (const opt of select.options) {
            if (normalizarTexto(opt.text).includes(palabraClave)) {
                if (select.value !== opt.value) {
                    select.value = opt.value;
                    fireChange(select);
                }
                return true;
            }
        }
        return false;
    }

    function estaVacio(campo) {
        if (!campo) return true;
        return !campo.value || campo.value.trim() === '';
    }

    // ---------------------------------------------------------------
    // Bloque 1: Localidad sincronizada por ficha (igual patron que UPZ)
    // - Si hay un valor guardado para esta ficha (porque el usuario lo eligio
    //   manualmente en cualquier pestana) -> se sobrescribe SIEMPRE con ese valor.
    // - Si no hay valor guardado todavia -> se usa el calculo automatico por
    //   digitos de la ficha, solo para campos vacios (comportamiento original).
    // ---------------------------------------------------------------
    function sincronizarLocalidad() {
        const fichaNumero = getFichaNumero();
        if (!fichaNumero) return;

        const clave = STORAGE_PREFIX_LOC + fichaNumero;
        const valorGuardado = localStorage.getItem(clave);

        if (valorGuardado) {
            obtenerTodosPorId(ID_LOCALIDAD).forEach(campo => {
                if (obtenerValorCampo(campo) !== valorGuardado) {
                    asignarValorCampo(campo, valorGuardado);
                }
            });
            return;
        }

        // Sin valor guardado aun: usar el calculo automatico por digitos,
        // solo sobre campos que esten realmente vacios.
        const codigo = getCodigoLocalidad(fichaNumero);
        if (!codigo) return;
        obtenerTodosPorId(ID_LOCALIDAD).forEach(selectLocalidad => {
            if (estaVacio(selectLocalidad)) {
                seleccionarOpcionPorPrefijo(selectLocalidad, codigo);
            }
        });
    }

    function guardarLocalidadAlCambiar(el) {
        if (!el || el.id !== ID_LOCALIDAD) return;
        const fichaNumero = getFichaNumero();
        if (!fichaNumero) return;

        const valor = obtenerValorCampo(el);
        const clave = STORAGE_PREFIX_LOC + fichaNumero;
        if (valor) {
            localStorage.setItem(clave, valor);
            sincronizarLocalidad(); // propaga de inmediato dentro de esta misma pestana
        } else {
            localStorage.removeItem(clave);
        }
    }

    // ---------------------------------------------------------------
    // Bloque 2: Fecha sincronizada con Fecha de Intervencion
    // ---------------------------------------------------------------
    function sincronizarFechaConIntervencion() {
        const camposIntervencion = obtenerTodosPorId(ID_FECHA_INTERVENCION);
        const camposFecha = obtenerTodosPorId(ID_FECHA);
        if (camposFecha.length === 0) return;

        const valorIntervencion = camposIntervencion
            .map(obtenerValorCampo)
            .find(v => v);
        if (!valorIntervencion) return;

        camposFecha.forEach(campoFecha => {
            if (obtenerValorCampo(campoFecha) !== valorIntervencion) {
                asignarValorCampo(campoFecha, valorIntervencion);
            }
        });
    }

    // ---------------------------------------------------------------
    // Bloque 3: UPZ/UPR sincronizado por consecutivo (ficha)
    // ---------------------------------------------------------------
    function sincronizarUPZ() {
        const fichaNumero = getFichaNumero();
        if (!fichaNumero) return;

        const clave = STORAGE_PREFIX_UPZ + fichaNumero;
        const valorGuardado = localStorage.getItem(clave);
        if (!valorGuardado) return;

        obtenerTodosPorId(ID_UPZ).forEach(campo => {
            if (obtenerValorCampo(campo) !== valorGuardado) {
                asignarValorCampo(campo, valorGuardado);
            }
        });
    }

    function guardarUPZAlCambiar(el) {
        if (!el || el.id !== ID_UPZ) return;
        const fichaNumero = getFichaNumero();
        if (!fichaNumero) return;

        const valor = obtenerValorCampo(el);
        const clave = STORAGE_PREFIX_UPZ + fichaNumero;
        if (valor) {
            localStorage.setItem(clave, valor);
            sincronizarUPZ(); // propaga de inmediato dentro de esta misma pestana
        } else {
            localStorage.removeItem(clave);
        }
    }

    // ---------------------------------------------------------------
    // Bloque 4: atajos de teclado 1/2/3 -> Inicial/Intermedio/Avanzado
    // ---------------------------------------------------------------
    function manejarTeclaEscala(e) {
        if (!IDS_ESCALA.includes(e.target.id)) return;
        const palabraClave = MAPA_TECLA_A_PALABRA[e.key];
        if (!palabraClave) return;

        e.preventDefault();
        seleccionarOpcionPorPalabraClave(e.target, palabraClave);
    }

    // ---------------------------------------------------------------
    // Delegacion de eventos (robusta ante reconstruccion del DOM tipo SPA)
    // ---------------------------------------------------------------
    document.addEventListener('change', function (e) {
        guardarUPZAlCambiar(e.target);
        guardarLocalidadAlCambiar(e.target);
    }, true);

    document.addEventListener('input', function (e) {
        guardarUPZAlCambiar(e.target);
        guardarLocalidadAlCambiar(e.target);
    }, true);

    document.addEventListener('keydown', manejarTeclaEscala, true);

    // ---------------------------------------------------------------
    // NUEVO: sincronizacion ENTRE PESTANAS (cross-tab)
    // El evento 'storage' se dispara automaticamente en TODAS las demas
    // pestanas del mismo origen cuando localStorage cambia (nunca se dispara
    // en la pestana que hizo el cambio, por eso Bloque 1 y 3 ya llaman a
    // sincronizar*() directamente ahi). Con esto, si cambias UPZ o Localidad
    // en la pestana 1, las otras 19 se actualizan solas sin que hagas nada
    // en ellas (el listener 'storage' las despierta de inmediato).
    // ---------------------------------------------------------------
    window.addEventListener('storage', function (e) {
        if (!e.key) return;
        if (e.key.startsWith(STORAGE_PREFIX_UPZ)) {
            sincronizarUPZ();
        } else if (e.key.startsWith(STORAGE_PREFIX_LOC)) {
            sincronizarLocalidad();
        }
    });

    // ---------------------------------------------------------------
    // Observador de mutaciones (con throttle) + polling de respaldo
    // ---------------------------------------------------------------
    let ultimaEjecucion = 0;
    const THROTTLE_MS = 400;

    function intentarAutocompletar() {
        const ahora = Date.now();
        if (ahora - ultimaEjecucion < THROTTLE_MS) return;
        ultimaEjecucion = ahora;

        sincronizarLocalidad();
        sincronizarFechaConIntervencion();
        sincronizarUPZ();
    }

    const observer = new MutationObserver(() => {
        intentarAutocompletar();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Respaldo con polling (misma razon que en la version original: el
    // MutationObserver no siempre detecta cambios de .value por JS puro).
    setInterval(intentarAutocompletar, 800);

    // Primer intento al cargar
    intentarAutocompletar();

})();
