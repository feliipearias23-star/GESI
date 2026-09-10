
(function () {
  'use strict';

  // ================= RESTRICCIÓN POR BASE =================
  // Esta validación solo debe correr en las bases 107, 113, 114 y 112.
  // #Id_Base puede no existir todavía en el DOM en el momento en que este
  // script se inyecta (la ficha puede cargar el detalle un instante
  // después del shell inicial de la página) -- se espera con un sondeo
  // liviano a que aparezca CON un valor cargado antes de decidir si el
  // resto del código corre o no. Si nunca aparece (pantalla sin ficha,
  // listados, login, etc.) se deja de sondear a los 20s en vez de dejar
  // un timer corriendo para siempre.
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
      if (transcurrido >= ESPERA_MAX_MS) {
        clearInterval(intervalo);
        // Nunca apareció #Id_Base con valor -- no es una pantalla de
        // ficha, o tardó demasiado. No se hace nada más.
      }
    }, ESPERA_INTERVALO_MS);
  }

  esperarIdBaseYArrancar(function (idBase) {
    if (BASES_PERMITIDAS.indexOf(idBase) === -1) return; // base no permitida: no se activa nada

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

    function marcarError(input, mensaje) {
      input.classList.add('is-invalid');
      input.setCustomValidity(mensaje);
      input.reportValidity();
    }

    function limpiarError(input) {
      input.classList.remove('is-invalid');
      input.setCustomValidity('');
    }

    // ================= CACHE DE CAMPOS "Fecha de sesión" =================
    const SELECTOR_LABEL = 'td[title^="Control:"]';
    const SELECTOR_INPUT = 'input[placeholder="DD/MM/AAAA"]';
    let cacheCampos = null;

    function construirCamposFechaSesion() {
      const inputs = [];
      document.querySelectorAll(SELECTOR_LABEL).forEach(td => {
        if (!/Fecha de sesi[oó]n/i.test(td.textContent)) return;
        const match = td.getAttribute('title').match(/valorControl(\d+)/);
        if (!match) return;
        const input = document.getElementById('valorControl' + match[1]);
        if (input && input.matches(SELECTOR_INPUT)) inputs.push(input);
      });
      inputs.sort((a, b) =>
        (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) ? -1 : 1
      );
      return inputs;
    }

    function getCamposFechaSesion() {
      if (!cacheCampos) cacheCampos = construirCamposFechaSesion();
      return cacheCampos;
    }

    function invalidarCache() {
      cacheCampos = null;
    }

    // ================= VALIDACIÓN =================
    function validarCampoSesion(input) {
      limpiarError(input);

      const valor = getValorFecha(input);
      if (!valor) return;

      const hoy = hoySinHora();
      if (valor > hoy) {
        return marcarError(input, 'La fecha no puede ser mayor a la fecha actual.');
      }

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
      getCamposFechaSesion().forEach(validarCampoSesion);
    }

    // ================= EVENTOS (DELEGACIÓN) =================
    document.addEventListener('blur', e => {
      if (e.target.matches(SELECTOR_INPUT)) validarCampoSesion(e.target);
    }, true);

    document.addEventListener('input', e => {
      if (!e.target.matches(SELECTOR_INPUT)) return;
      e.target.value.length === 10 ? validarCampoSesion(e.target) : limpiarError(e.target);
    });

    document.addEventListener('change', e => {
      if (e.target.id === 'FechaIntervencion' || e.target.matches(SELECTOR_INPUT)) {
        revalidarTodas();
      }
    });

    // ================= AUTO-INVALIDACIÓN DE CACHE =================
    const observer = new MutationObserver(invalidarCache);
    observer.observe(document.body, { childList: true, subtree: true });
  });
})();
