(function () {
  'use strict';
  // ================= RESTRICCIÓN POR BASE =================
  var BASES_PERMITIDAS = ['107', '113', '114', '112'];
  var ESPERA_INTERVALO_MS = 300;
  var ESPERA_MAX_MS = 20000;

  function esperarIdBaseYArrancar(callback) {
    var transcurrido = 0;
    var intervalo = setInterval(function () {
      var idBaseEl = document.getElementById('Id_Base');
      if (idBaseEl && idBaseEl.value) {
        clearInterval(intervalo);
        callback(idBaseEl.value);
        return;
      }
      transcurrido += ESPERA_INTERVALO_MS;
      if (transcurrido >= ESPERA_MAX_MS) clearInterval(intervalo);
    }, ESPERA_INTERVALO_MS);
  }

  esperarIdBaseYArrancar(function (idBase) {
    if (BASES_PERMITIDAS.indexOf(idBase) === -1) return;

    // ================= UTILIDADES DE FECHA =================
    function parseDDMMAAAA(str) {
      if (!str) return null;
      const p = str.trim().split('/');
      if (p.length !== 3) return null;
      const dd = +p[0], mm = +p[1], aaaa = +p[2];
      if (!dd || !mm || !aaaa) return null;
      const f = new Date(aaaa, mm - 1, dd);
      if (f.getDate() !== dd || f.getMonth() !== mm - 1 || f.getFullYear() !== aaaa) return null;
      f.setHours(0, 0, 0, 0);
      return f;
    }

    function getValorFecha(input) {
      if (!input) return null;
      if (input.type === 'date') {
        const f = new Date(input.value + 'T00:00:00');
        return isNaN(f) ? null : f;
      }
      return parseDDMMAAAA(input.value);
    }

    function hoySinHora() {
      const h = new Date();
      h.setHours(0, 0, 0, 0);
      return h;
    }

    // ================= MENSAJES DE ERROR (SIN ROBAR EL FOCO) =================
    // Antes se usaba reportValidity(), que en Chrome/Edge le devuelve el foco
    // al campo inválido. Combinado con el evento blur y con revalidarTodas(),
    // el cursor quedaba "atrapado" o saltaba a otro campo y no se podía
    // corregir. Ahora el error se muestra como texto debajo del campo y
    // nunca se mueve el foco.
    const CLASE_MSG = 'msg-error-fecha';

    function getMensajeEl(input) {
      const sig = input.nextElementSibling;
      return (sig && sig.classList.contains(CLASE_MSG)) ? sig : null;
    }

    function marcarError(input, mensaje) {
      input.classList.add('is-invalid');
      input.setCustomValidity(mensaje); // sigue bloqueando el envío del formulario
      let msg = getMensajeEl(input);
      if (!msg) {
        msg = document.createElement('div');
        msg.className = CLASE_MSG;
        msg.style.cssText = 'color:#dc3545;font-size:12px;margin-top:2px;';
        input.insertAdjacentElement('afterend', msg);
      }
      msg.textContent = mensaje;
    }

    function limpiarError(input) {
      input.classList.remove('is-invalid');
      input.setCustomValidity('');
      const msg = getMensajeEl(input);
      if (msg) msg.remove();
    }

    // ================= CACHE: CAMPOS DE FECHA CLASIFICADOS =================
    const SELECTOR_LABEL = 'td[title^="Control:"]';
    const SELECTOR_INPUT = 'input[placeholder="DD/MM/AAAA"]';

    let cacheSesiones = null;
    let cacheTipos = null; // Map<input, 'sesion' | 'nacimiento'>

    function reconstruirCache() {
      const sesiones = [];
      const tipos = new Map();

      document.querySelectorAll(SELECTOR_LABEL).forEach(td => {
        const match = td.getAttribute('title').match(/valorControl(\d+)/);
        if (!match) return;
        const input = document.getElementById('valorControl' + match[1]);
        if (!input || !input.matches(SELECTOR_INPUT)) return;

        const texto = td.textContent;
        if (/Fecha de sesi[oó]n/i.test(texto)) {
          tipos.set(input, 'sesion');
          sesiones.push(input);
        } else if (/Fecha de nacimiento/i.test(texto)) {
          tipos.set(input, 'nacimiento');
        }
      });

      sesiones.sort((a, b) =>
        (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) ? -1 : 1
      );

      cacheSesiones = sesiones;
      cacheTipos = tipos;
    }

    function getCamposFechaSesion() {
      if (!cacheSesiones) reconstruirCache();
      return cacheSesiones;
    }

    function getTipoCampo(input) {
      if (!cacheTipos) reconstruirCache();
      return cacheTipos.get(input) || null;
    }

    function invalidarCache() {
      cacheSesiones = null;
      cacheTipos = null;
    }

    // ================= VALIDACIÓN =================
    function validarCampoFecha(input) {
      limpiarError(input);

      const valor = getValorFecha(input);
      if (!valor) return;

      const tipo = getTipoCampo(input);
      const hoy = hoySinHora();

      if (valor > hoy) {
        return marcarError(input, 'La fecha no puede ser mayor a la fecha actual.');
      }

      if (tipo !== 'sesion') return;

      const fechaIntervencion = getValorFecha(document.getElementById('FechaIntervencion'));
      if (fechaIntervencion && valor < fechaIntervencion) {
        return marcarError(input, `La fecha no puede ser anterior a la Fecha de Intervención (${fechaIntervencion.toLocaleDateString('es-CO')}).`);
      }

      const campos = getCamposFechaSesion();
      const idx = campos.indexOf(input);
      if (idx === -1) return;

      if (idx > 0) {
        const anterior = getValorFecha(campos[idx - 1]);
        if (anterior && valor < anterior) {
          return marcarError(input, `La fecha de esta sesión no puede ser anterior a la sesión anterior (${anterior.toLocaleDateString('es-CO')}).`);
        }
      }

      if (idx < campos.length - 1) {
        const siguiente = getValorFecha(campos[idx + 1]);
        if (siguiente && valor > siguiente) {
          marcarError(input, `La fecha de esta sesión no puede ser posterior a la siguiente sesión (${siguiente.toLocaleDateString('es-CO')}).`);
        }
      }
    }

    function revalidarTodas() {
      getCamposFechaSesion().forEach(validarCampoFecha);
      Array.from(cacheTipos.entries())
        .filter(([, tipo]) => tipo === 'nacimiento')
        .forEach(([input]) => validarCampoFecha(input));
    }

    // ================= EVENTOS (DELEGACIÓN) =================
    document.addEventListener('blur', e => {
      if (e.target.matches && e.target.matches(SELECTOR_INPUT)) validarCampoFecha(e.target);
    }, true);

    document.addEventListener('input', e => {
      if (!e.target.matches || !e.target.matches(SELECTOR_INPUT)) return;
      e.target.value.length === 10 ? validarCampoFecha(e.target) : limpiarError(e.target);
    });

    document.addEventListener('change', e => {
      if (e.target.id === 'FechaIntervencion' || (e.target.matches && e.target.matches(SELECTOR_INPUT))) {
        revalidarTodas();
      }
    });

    // ================= AUTO-INVALIDACIÓN DE CACHE =================
    // Se ignoran los cambios causados por nuestros propios mensajes de error,
    // para no reconstruir el cache cada vez que aparece o desaparece uno.
    function esNodoPropio(n) {
      return n.nodeType === 1 && n.classList.contains(CLASE_MSG);
    }

    const observer = new MutationObserver(mutaciones => {
      const relevante = mutaciones.some(m =>
        Array.from(m.addedNodes).some(n => !esNodoPropio(n)) ||
        Array.from(m.removedNodes).some(n => !esNodoPropio(n))
      );
      if (relevante) invalidarCache();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });
})();
