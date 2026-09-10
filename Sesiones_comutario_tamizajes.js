(function () {
  'use strict';

  // ================= RESTRICCIÓN POR BASE =================
  // Este botón debe quedar desactivado solo en la base 113.
  var BASE_RESTRINGIDA = '113';
  var ID_BOTON = 'controlBotonSeccion320';
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
      }
    }, ESPERA_INTERVALO_MS);
  }

  function desactivarBoton(boton) {
    boton.disabled = true;
    boton.classList.add('disabled');
    boton.style.pointerEvents = 'none';
    boton.style.opacity = '0.6';
    boton.title = (boton.title ? boton.title + ' | ' : '') + 'No disponible para esta base';
  }

  esperarIdBaseYArrancar(function (idBase) {
    if (idBase !== BASE_RESTRINGIDA) return; // no es la base 113: no se hace nada

    var boton = document.getElementById(ID_BOTON);
    if (boton) {
      desactivarBoton(boton);
      return;
    }

    // El botón podría no existir todavía en el DOM en el momento en que
    // Id_Base ya cargó (ej. si la sección se renderiza un instante después).
    // Se observa el DOM hasta que aparezca, sin dejar el observer corriendo
    // para siempre una vez lo encuentra.
    var observer = new MutationObserver(function () {
      var b = document.getElementById(ID_BOTON);
      if (b) {
        desactivarBoton(b);
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });
})();
