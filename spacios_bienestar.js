// ==UserScript==
// @name         GESI - Espacios de Bienestar
// @namespace    https://gesiapps.saludcapital.gov.co/GESI_sistemas/GESI_Form*
// @version      1.6
// @description  Autoasignación y validaciones para Espacios de Bienestar
// @author       You
// @match        https://gesiapps.saludcapital.gov.co/GESI_sistemas/GESI_Form*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function () {
  'use strict';

  console.log('🚀 GESI Espacios de Bienestar v1.6 — cargado');

  const bgSuccess = 'rgba(50, 200, 150, 0.2)';
  const $ = selector => document.querySelector(selector);

  const ID = {
    tipoDoc: 'valorControl23943',
    nacionalidad: 'valorControl23945',
    estadoCivil: 'valorControl23946',
    edad: 'valorControl23948',
    sexo: 'valorControl23950',
    genero: 'valorControl23951',
    orientacion: 'valorControl23952',
    identidadGenero: 'valorControl23953',
    etnia: 'valorControl23954',
    poblacionDiferencial: 'valorControl23958',
    poblacionInclusionOficio: 'valorControl23961'
  };
  const GRUPO_NACIONAL = [
    '59',
    '60',
    '61',
    '63'
  ];
  const GRUPO_EXTRANJERO = [
    '62','64','65','66','2482','1637','1638','1639','1640','4040'
  ];

  const mapaNacional = {
    etnia: '84',
    nacionalidad: '50',
    poblacionDiferencial: '2620',
    poblacionInclusionOficio: '4048'
  };

  const mapaExtranjero = {
    etnia: '84',
    nacionalidad: '236',
    poblacionDiferencial: '4051',
    poblacionInclusionOficio: '4048'
  };
  const reglasDocumento = {
    '60': {
      nombre: 'Registro Civil',
      min: 0,
      max: 6
    },
    '61': {
      nombre: 'Tarjeta de Identidad',
      min: 7,
      max: 17
    },
    '59': {
      nombre: 'Cédula de Ciudadanía',
      min: 18,
      max: 999
    }
  };
  const ALERTAS = {
    valorControl24006: '9',valorControl24007: '17', valorControl24008: '22', valorControl24009: '29',valorControl24010: '16', valorControl24011: '32',valorControl24012: '7',valorControl24014: '23'
  };
  const BARRERAS = [
    'valorControl24045','valorControl24046','valorControl24047','valorControl24048','valorControl24049','valorControl24050','valorControl24059'
  ];
  const TEXTO_BARRERA_POR_DEFECTO = 'no';
  const manual = {};
  let asignandoPorScript = false;
  const alertOriginal = window.alert;

  function esMenorConGeneroNoAplica() {
    const edad = document.getElementById(ID.edad);
    const genero = document.getElementById(ID.genero);

    if (!edad || !genero) {
      return false;
    }

    const edadNum = parseInt(edad.value, 10);

    return (
      !Number.isNaN(edadNum) &&
      edadNum < 14 &&
      genero.value === '4513'
    );
  }

  window.alert = function (mensaje) {
    const texto = String(mensaje || '');

    const esAlertaSexoGenero =
      /sexo\s+y\s+g[eé]nero/i.test(texto);

    if (
      esAlertaSexoGenero &&
      esMenorConGeneroNoAplica()
    ) {
      console.warn(
        'GESI: se filtró la alerta Sexo/Género para menor de 14 años.'
      );
      return;
    }

    return alertOriginal.apply(this, arguments);
  };
  function set(campo, valor, notificar = true) {
    if (!campo || manual[campo.id]) {
      return;
    }

    if (campo.value === valor) {
      return;
    }

    asignandoPorScript = true;

    campo.value = valor;
    campo.style.backgroundColor = bgSuccess;
    const spanSelect2 = document.getElementById(
      'select2-' + campo.id + '-container'
    );

    if (spanSelect2) {
      const opcionElegida = Array.from(campo.options || [])
        .find(opcion => opcion.value === valor);

      if (opcionElegida) {
        spanSelect2.textContent = opcionElegida.text;
        spanSelect2.setAttribute(
          'title',
          opcionElegida.text
        );
      }
    }

    if (notificar) {
      campo.dispatchEvent(
        new Event('change', {
          bubbles: true
        })
      );
    }

    asignandoPorScript = false;
  }

  function marcarManualAlEditar(campo) {
    if (!campo) {
      return;
    }

    const marcar = evento => {
      if (
        evento.isTrusted &&
        !asignandoPorScript
      ) {
        manual[campo.id] = true;
      }
    };

    campo.addEventListener('input', marcar);
    campo.addEventListener('change', marcar);
  }

  function quitarTildes(texto) {
    return String(texto || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  function textoOpcionNormalizado(opcion) {
    return quitarTildes(opcion.text)
      .replace(/^\s*\d+\s*[-.)]?\s*/, '')
      .trim();
  }
  function asegurarValorPorDefecto(id, valorDeseado) {
    const campo = document.getElementById(id);

    if (!campo || valorDeseado == null) {
      return;
    }

    if (campo.dataset.ebAuto !== '1') {
      campo.dataset.ebAuto = '1';
      marcarManualAlEditar(campo);
    }
    if (
      campo.value !== '' &&
      campo.value != null
    ) {
      return;
    }

    manual[campo.id] = false;
    set(campo, valorDeseado);
  }
  function valorOpcionPorTexto(select, textoBuscado) {
    if (!select || !select.options) {
      return null;
    }
    const objetivo = quitarTildes(textoBuscado);
    for (const opcion of select.options) {
      if (opcion.value === '') {
        continue;
      }

      if (
        textoOpcionNormalizado(opcion) === objetivo
      ) {
        return opcion.value;
      }
    }
    for (const opcion of select.options) {
      if (opcion.value === '') {
        continue;
      }
      if (
        textoOpcionNormalizado(opcion)
          .startsWith(objetivo)
      ) {
        return opcion.value;
      }
    }

    return null;
  }
  function valorOpcionPorPrefijo(select, numero) {
    if (!select || !select.options) {
      return null;
    }
    const patron = new RegExp(
      '^\\s*' +
      numero +
      '\\s*(?:[-.)]|$)'
    );
    for (const opcion of select.options) {
      if (opcion.value === '') {
        continue;
      }
      if (patron.test(opcion.value)) {
        return opcion.value;
      }
    }
    for (const opcion of select.options) {
      if (opcion.value === '') {
        continue;
      }

      if (patron.test(opcion.text)) {
        return opcion.value;
      }
    }

    return null;
  }
  function aplicarAlertas() {
    for (const [id, numero] of Object.entries(ALERTAS)) {
      const campo = document.getElementById(id);

      if (!campo) {
        continue;
      }

      let valorReal = campo.dataset.ebValorAlerta;

      if (!valorReal) {
        if (campo.tagName === 'SELECT') {
          const encontrado = valorOpcionPorPrefijo(
            campo,
            numero
          );

          if (!encontrado) {
            continue;
          }

          valorReal = encontrado;
        } else {
          valorReal = numero;
        }

        campo.dataset.ebValorAlerta = valorReal;
      }

      asegurarValorPorDefecto(id, valorReal);
    }
  }
  function aplicarBarrerasAcceso() {
    for (const id of BARRERAS) {
      const campo = document.getElementById(id);

      if (!campo) {
        continue;
      }
      let valorNo = campo.dataset.ebValorNo;
      if (!valorNo) {
        if (campo.tagName === 'SELECT') {
          const encontrado = valorOpcionPorTexto(
            campo,
            TEXTO_BARRERA_POR_DEFECTO
          );

          if (!encontrado) {
            continue;
          }
          valorNo = encontrado;
        } else {
          valorNo = 'NO';
        }

        campo.dataset.ebValorNo = valorNo;
      }
      asegurarValorPorDefecto(id, valorNo);
    }
  }
  function aplicarPorTipoDoc(campos) {
    const {
      tipoDoc,
      etnia,
      nacionalidad,
      poblacionDiferencial,
      poblacionInclusionOficio
    } = campos;

    if (!tipoDoc) {
      return;
    }

    const valorDoc = tipoDoc.value;
    let mapa = null;

    if (GRUPO_NACIONAL.includes(valorDoc)) {
      mapa = mapaNacional;
    } else if (
      GRUPO_EXTRANJERO.includes(valorDoc)
    ) {
      mapa = mapaExtranjero;
    }

    if (!mapa) {
      return;
    }

    tipoDoc.style.backgroundColor = bgSuccess;

    set(etnia, mapa.etnia);
    set(nacionalidad, mapa.nacionalidad);
    set(
      poblacionDiferencial,
      mapa.poblacionDiferencial
    );
    set(
      poblacionInclusionOficio,
      mapa.poblacionInclusionOficio
    );
  }
  function aplicarCascadaSexo(campos) {
    const {
      sexo,
      genero,
      orientacion,
      identidadGenero,
      edad
    } = campos;

    if (!sexo) {
      return;
    }

    const valorSexo = sexo.value;

    if (
      valorSexo !== '67' &&
      valorSexo !== '68'
    ) {
      return;
    }

    sexo.style.backgroundColor = bgSuccess;

    const edadNum = edad
      ? parseInt(edad.value, 10)
      : NaN;
    if (Number.isNaN(edadNum)) {
      set(
        genero,
        valorSexo === '67'
          ? '70'
          : '71',
        false
      );

      return;
    }

    if (edadNum < 14) {
      set(genero, '4513', false);
      set(orientacion, '4028', false);
      set(identidadGenero, '4020', false);
    } else {
      set(
        genero,
        valorSexo === '67'
          ? '70'
          : '71',
        false
      );

      set(orientacion, '4024', false);

      set(
        identidadGenero,
        valorSexo === '68'
          ? '4514'
          : '4515',
        false
      );
    }
  }
  function aplicarEstadoCivilPorEdad(campos) {
    const {
      edad,
      estadoCivil
    } = campos;

    if (!edad || !estadoCivil) {
      return;
    }

    const edadNum = parseInt(edad.value, 10);

    if (Number.isNaN(edadNum)) {
      return;
    }
    set(
      estadoCivil,
      edadNum < 14
        ? '6- No aplica'
        : '1- Soltero(a)'
    );
  }
  function validarEdadDocumento(campos) {
    const {
      edad,
      tipoDoc
    } = campos;

    if (!edad || !tipoDoc) {
      return;
    }

    const edadNum = parseInt(edad.value, 10);
    const valorDoc = tipoDoc.value;

    edad.style.border = '';
    edad.style.background = '';

    tipoDoc.style.border = '';
    tipoDoc.style.background = '';

    const anterior = edad.parentNode
      ? edad.parentNode.querySelector(
          '.mensaje-validacion-edad'
        )
      : null;

    if (anterior) {
      anterior.remove();
    }

    const regla = reglasDocumento[valorDoc];

    if (
      !regla ||
      Number.isNaN(edadNum)
    ) {
      return;
    }

    if (
      edadNum < regla.min ||
      edadNum > regla.max
    ) {
      let documentoCorrecto = 'Desconocido';

      for (const reglaEdad of Object.values(
        reglasDocumento
      )) {
        if (
          edadNum >= reglaEdad.min &&
          edadNum <= reglaEdad.max
        ) {
          documentoCorrecto = reglaEdad.nombre;
          break;
        }
      }

      [edad, tipoDoc].forEach(campo => {
        campo.style.border = '2px solid red';
        campo.style.background = '#fff0f0';
      });

      if (
        edad.parentNode &&
        !edad.parentNode.querySelector(
          '.mensaje-validacion-edad'
        )
      ) {
        const mensaje = document.createElement('div');

        mensaje.className =
          'mensaje-validacion-edad';

        mensaje.textContent =
          `Con ${edadNum} años debe usar "${documentoCorrecto}".`;

        Object.assign(mensaje.style, {
          color: '#b30000',
          background: '#ffe6e6',
          padding: '6px',
          marginTop: '4px',
          border: '1px solid #ff9999',
          borderRadius: '4px',
          fontSize: '12px'
        });
        edad.parentNode.appendChild(mensaje);
      }
    }
  }
  function iniciar() {
    const campos = {
      tipoDoc: $('#' + ID.tipoDoc),
      nacionalidad: $('#' + ID.nacionalidad),
      estadoCivil: $('#' + ID.estadoCivil),
      edad: $('#' + ID.edad),
      sexo: $('#' + ID.sexo),
      genero: $('#' + ID.genero),
      orientacion: $('#' + ID.orientacion),
      identidadGenero: $('#' + ID.identidadGenero),
      etnia: $('#' + ID.etnia),
      poblacionDiferencial: $(
        '#' + ID.poblacionDiferencial
      ),
      poblacionInclusionOficio: $(
        '#' + ID.poblacionInclusionOficio
      )
    };
    if (
      !campos.tipoDoc ||
      !campos.sexo
    ) {
      return false;
    }
    if (
      campos.tipoDoc.dataset.ebInit === '1'
    ) {
      return true;
    }
    try {
      campos.tipoDoc.dataset.ebInit = '1';
      [
        ID.nacionalidad,
        ID.estadoCivil,
        ID.genero,
        ID.orientacion,
        ID.identidadGenero,
        ID.etnia,
        ID.poblacionDiferencial,
        ID.poblacionInclusionOficio
      ].forEach(id => {
        manual[id] = false;
      });
      [
        campos.nacionalidad,
        campos.estadoCivil,
        campos.genero,
        campos.orientacion,
        campos.identidadGenero,
        campos.etnia,
        campos.poblacionDiferencial,
        campos.poblacionInclusionOficio
      ].forEach(marcarManualAlEditar);

      const ejecutarTodo = () => {
        aplicarPorTipoDoc(campos);
        aplicarCascadaSexo(campos);
        aplicarEstadoCivilPorEdad(campos);
        validarEdadDocumento(campos);
      };
      campos.tipoDoc.addEventListener(
        'input',
        ejecutarTodo
      );

      campos.tipoDoc.addEventListener(
        'change',
        ejecutarTodo
      );
      campos.sexo.addEventListener(
        'input',
        () => {
          aplicarCascadaSexo(campos);
        },
        true
      );

      campos.sexo.addEventListener(
        'change',
        () => {
          aplicarCascadaSexo(campos);
          aplicarEstadoCivilPorEdad(campos);
          validarEdadDocumento(campos);
        },
        true
      );
      if (campos.edad) {
        let ultimaEdad = campos.edad.value;

        campos.edad.addEventListener(
          'input',
          () => {
            if (
              campos.edad.value === ultimaEdad
            ) {
              return;
            }

            ultimaEdad = campos.edad.value;

            aplicarCascadaSexo(campos);
            aplicarEstadoCivilPorEdad(campos);
            validarEdadDocumento(campos);
          }
        );
      }
      ejecutarTodo();

      return true;
    } catch (error) {
      console.error(
        '❌ Error inicializando GESI Espacios de Bienestar:',
        error
      );

      delete campos.tipoDoc.dataset.ebInit;

      return false;
    }
  }
  const ID_EAPB = 'valorControl23966';

  function agregarBuscadorEAPB() {
    const select = document.getElementById(ID_EAPB);

    if (!select) {
      return false;
    }

    if (
      select.dataset.buscadorListo === '1'
    ) {
      return true;
    }

    select.dataset.buscadorListo = '1';
    select.style.position = 'absolute';
    select.style.opacity = '0';
    select.style.height = '0';
    select.style.width = '0';
    select.style.padding = '0';
    select.style.border = 'none';
    select.style.pointerEvents = 'none';

    const wrapper = document.createElement('div');

    wrapper.style.position = 'relative';
    wrapper.style.display = 'inline-block';
    wrapper.style.width = '100%';

    const input = document.createElement('input');

    input.type = 'text';
    input.placeholder = 'Buscar EAPB...';
    input.autocomplete = 'off';

    input.style.width = '100%';
    input.style.boxSizing = 'border-box';
    input.style.padding = '6px 8px';
    input.style.border = '1px solid #ccc';
    input.style.borderRadius = '4px';

    const lista = document.createElement('div');

    lista.style.position = 'absolute';
    lista.style.top = '100%';
    lista.style.left = '0';
    lista.style.right = '0';
    lista.style.maxHeight = '220px';
    lista.style.overflowY = 'auto';
    lista.style.background = '#fff';
    lista.style.border = '1px solid #ccc';
    lista.style.borderTop = 'none';
    lista.style.zIndex = '99999';
    lista.style.display = 'none';
    lista.style.boxShadow =
      '0 4px 10px rgba(0,0,0,0.15)';

    select.parentNode.insertBefore(
      wrapper,
      select
    );

    wrapper.appendChild(select);
    wrapper.appendChild(input);
    wrapper.appendChild(lista);

    function opcionesDisponibles() {
      return Array.from(select.options)
        .filter(opcion => opcion.value !== '');
    }
    function pintarLista(filtro) {
      const texto = quitarTildes(filtro);

      const opciones = opcionesDisponibles()
        .filter(opcion =>
          quitarTildes(opcion.text)
            .includes(texto)
        );
      lista.innerHTML = '';

      if (opciones.length === 0) {
        const vacio = document.createElement('div');

        vacio.textContent = 'Sin resultados';
        vacio.style.padding = '6px 8px';
        vacio.style.color = '#888';
        vacio.style.fontStyle = 'italic';

        lista.appendChild(vacio);
      } else {
        opciones.slice(0, 200)
          .forEach(opcion => {
            const item = document.createElement('div');

            item.textContent = opcion.text;
            item.style.padding = '6px 8px';
            item.style.cursor = 'pointer';

            item.addEventListener(
              'mouseenter',
              () => {
                item.style.background = '#e6f4ff';
              }
            );
            item.addEventListener(
              'mouseleave',
              () => {
                item.style.background = '';
              }
            );
            item.addEventListener(
              'mousedown',
              evento => {
                evento.preventDefault();

                select.value = opcion.value;

                select.dispatchEvent(
                  new Event('change', {
                    bubbles: true
                  })
                );

                select.style.backgroundColor =
                  bgSuccess;

                input.value = opcion.text;
                input.style.backgroundColor =
                  bgSuccess;

                lista.style.display = 'none';
              }
            );

            lista.appendChild(item);
          });
      }

      lista.style.display = 'block';
    }
    const seleccionActual =
      select.options[select.selectedIndex];

    if (
      seleccionActual &&
      seleccionActual.value !== ''
    ) {
      input.value = seleccionActual.text;
    }

    input.addEventListener(
      'focus',
      () => pintarLista(input.value)
    );

    input.addEventListener(
      'input',
      () => pintarLista(input.value)
    );

    input.addEventListener(
      'blur',
      () => {
        setTimeout(() => {
          lista.style.display = 'none';
        }, 150);
      }
    );

    document.addEventListener(
      'click',
      evento => {
        if (!wrapper.contains(evento.target)) {
          lista.style.display = 'none';
        }
      }
    );

    return true;
  }
  const intervalo = setInterval(() => {
    iniciar();
    aplicarAlertas();
    aplicarBarrerasAcceso();
    agregarBuscadorEAPB();
  }, 100);

  window.addEventListener(
    'beforeunload',
    () => {
      clearInterval(intervalo);
    }
  );
})();
