// ==UserScript==
// @name         TAMIZAJES SALUD MENTAL
// @namespace    UTIS_GESI
// @version      1.3
// @description  Tamizaje salud mental (Id_Base 119): datos de la institución sincronizados entre páginas de la misma ficha, autocompletar por cédula (Comprobador de Derechos + Supersalud: nombres, apellidos, fecha, sexo, afiliación y EAPB), cascada documento/sexo/género, estado civil por edad y validador edad/documento.
// @match        https://gesiapps.saludcapital.gov.co/GESI_sistemas/GESI_Form*
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @connect      appb.saludcapital.gov.co
// @connect      pqrdsuperargo.supersalud.gov.co
// @run-at       document-end
// ==/UserScript==

(function () {
  'use strict';

  const W = (typeof unsafeWindow !== 'undefined') ? unsafeWindow : window;
  if (W.__tamizajesSMLoaded) return;
  W.__tamizajesSMLoaded = true;

  /* =====================================================================
   * CONFIGURACIÓN (todo lo que cambia de una base a otra vive aquí)
   * ===================================================================== */

  const ID = {
    // Identificación de la institución (se sincroniza entre todas las páginas de la misma ficha)
    instNombre:      'valorControl20853',   // Nombre de la institución (texto)
    instNit:         'valorControl20854',   // NIT (texto)
    instTipo:        'valorControl20855',   // Tipo de institución (select)
    instOtra:        'valorControl20856',   // Otra, ¿cuál? (texto)
    instSector:      'valorControl20857',   // Sector: Pública / Privada (select)
    instModalidad:   'valorControl20858',   // Modalidad: Internado / Externado / Mixta (select)

    // Autocompletar por cédula
    nombre1:         'valorControl20861',   // 1er nombre
    nombre2:         'valorControl20862',   // 2do nombre
    apellido1:       'valorControl20863',   // 1er apellido
    apellido2:       'valorControl20864',   // 2do apellido
    documento:       'valorControl20866',
    afiliacion:      'valorControl20878',   // 131 Subsidiado, 132 Contributivo, 133 Excepción/especial, 134 Vinculado, 135 No asegurado
    eapb:            'valorControl20879',   // texto libre

    // Cascadas y validador
    tipoDoc:         'valorControl20865',
    estadoCivil:     'valorControl20867',
    fechaNac:        'valorControl20868',
    sexo:            'valorControl20869',
    genero:          'valorControl20870',
    etnia:           'valorControl20871',
    pobDif:          'valorControl20872',   // select múltiple
    ocupacion:       'valorControl20873',   // select múltiple
    inclusionOficio: 'valorControl20874',
    nacionalidad:    'valorControl20875',
    razonAbandono:   'valorControl20877'    // select múltiple
  };

  // Tipos de documento: 59=CC 60=RC 61=TI 63=NUIP se tratan como nacionales
  const DOC = { CC: '59', RC: '60', TI: '61' };
  const NOMBRE_DOC = { '59': 'CC', '60': 'RC', '61': 'TI' };
  const NACIONALES = ['59', '60', '61', '63'];

  const POR_GRUPO = {
    nacional:   { nacionalidad: '50',  pobDif: '2620' },
    extranjero: { nacionalidad: '236', pobDif: '4051' }
  };

  const FIJOS = {
    etnia: '84',
    inclusionOficio: '4048',
    ocupacion: '1063',
    razonAbandono: '4873'
  };

  const GENERO_POR_SEXO = { '67': '70', '68': '71', '69': '4513' };
  const ESTADO_CIVIL = { corte: 14, menor: '78', mayor: '73' };
  const EDAD_MAX = { RC: 6, TI: 17 };

  // Cuestionario SRQ (selects Si/No). DESACTIVADO hasta confirmar qué se quiere automatizar.
  const SRQ = { habilitado: false, valor: 'No', ids: [] };
  [[20881, 20900], [20903, 20906], [20909, 20909], [20912, 20916], [20919, 20928]]
    .forEach(r => { for (let n = r[0]; n <= r[1]; n++) SRQ.ids.push('valorControl' + n); });

  // Campos autocompletados que el usuario puede cambiar a mano (se respeta su cambio)
  const AUTO_IDS = new Set([
    ID.estadoCivil, ID.genero, ID.etnia, ID.pobDif, ID.ocupacion,
    ID.inclusionOficio, ID.nacionalidad, ID.razonAbandono
  ].concat(SRQ.ids));

  // Campos de institución que se copian a las demás páginas de la misma ficha
  const CAMPOS_INSTITUCION = ['instNombre', 'instNit', 'instTipo', 'instOtra', 'instSector', 'instModalidad'];
  const IDS_INSTITUCION = new Set(CAMPOS_INSTITUCION.map(k => ID[k]));
  const LS_PREFIJO = 'tsm:inst:';          // localStorage: un registro por número de ficha (Ficha_fic)
  const LS_VIGENCIA_DIAS = 30;             // los registros más viejos se borran solos

  const DEBOUNCE_VALIDADOR_MS = 700;
  const DEBOUNCE_CONSULTA_MS = 2500;
  const POLL_MS = 800;

  // ---- Fuentes de consulta ----
  const BASE_COMPROBADOR = 'https://appb.saludcapital.gov.co/comprobadordederechos/';
  const BASE_SUPERSALUD = 'https://pqrdsuperargo.supersalud.gov.co/api/api/adres/';

  // value del tipo de documento en GESI -> código de tipo de documento en la URL de Supersalud.
  // Si el tipo no está aquí (NUIP, Pasaporte, sin ID...), NO se consulta Supersalud.
  const TIPO_DOC_GESI_A_SUPERSALUD = {
    '59': '0',    // CC
    '61': '1',    // TI
    '60': '8',    // RC
    '62': '2',    // CE
    '2482': '13'  // PPT
  };

  // Sexo de Supersalud -> value del campo sexo en GESI (1 = Hombre, 2 = Mujer)
  const SEXO_SUPERSALUD_A_GESI = { 1: '67', 2: '68' };

  // Régimen subsidiado: el Nombre EAPB debe terminar en "EPS-S" (ej. CAPITAL SALUD -> CAPITAL SALUD EPS-S)
  const REGIMEN_SUBSIDIADO = '131';
  const SUFIJO_EAPB_SUBSIDIADO = 'EPS-S';

  // Nombres de los campos del formulario ASP.NET del Comprobador de Derechos.
  // REVISAR contra tu script original: al pegarlo se perdieron los signos "$" y estas líneas son
  // una reconstrucción con la convención de ASP.NET.
  const FORM_COMPROBADOR = {
    noId: 'ctl00$MainContent$txtNoId',
    vacios: [
      'ctl00$MainContent$txtConsecutivo',
      'ctl00$MainContent$txtFichaSisben',
      'ctl00$MainContent$txtPriApellido',
      'ctl00$MainContent$txtSegApellido',
      'ctl00$MainContent$txtPriNombre',
      'ctl00$MainContent$txtSegNombre'
    ],
    scriptManager: ['ctl00$ctl12', 'ctl00$MainContent$cmdConsultar'],
    boton: ['ctl00$MainContent$cmdConsultar', 'Consultar']
  };

  /* =====================================================================
   * UTILIDADES
   * ===================================================================== */

  const CL = { doc: 'tsm-aviso-doc', sexo: 'tsm-aviso-sexo', afil: 'tsm-aviso-afil' };
  const ESTILO_AVISO = {
    ok:   'color:#1b5e20;background:#e8f5e9;border:1px solid #a5d6a7;',
    warn: 'color:#b30000;background:#ffe6e6;border:1px solid #ff9999;'
  };

  // Todos los nodos con ese id (GESI a veces repite ids entre escenarios)
  const nodos = id => Array.from(document.querySelectorAll('[id="' + id + '"]'));
  const indiceDe = el => Math.max(0, nodos(el.id).indexOf(el));
  const par = (id, idx) => { const l = nodos(id); return l[idx] || l[0] || null; };
  const limpio = v => String(v == null ? '' : v).trim();
  const unir = (...p) => p.map(limpio).filter(Boolean).join(' ');

  function refrescarSelect2(el) {
    try {
      const c = document.getElementById('select2-' + el.id + '-container');
      if (c && !el.multiple && el.selectedIndex >= 0) {
        const op = el.options[el.selectedIndex];
        c.textContent = op ? op.text : '';
        c.title = op ? op.text : '';
      }
      const $ = W.jQuery;
      if ($ && $(el).data && $(el).data('select2')) $(el).trigger('change.select2');
    } catch (e) { /* sin Select2 en esta sección */ }
  }

  // Única función para escribir valores en el formulario.
  //  opts.force    -> sobrescribe aunque el usuario haya cambiado el campo a mano
  //  opts.completo -> secuencia completa de eventos (input, change, Tab, blur), para el autocompletado
  // Devuelve true si el campo quedó con ese valor (false si no se pudo: sin campo, opción inexistente o
  // cambio manual protegido).
  function setValor(el, val, opts) {
    opts = opts || {};
    if (!el) return false;
    if (!opts.force && el.getAttribute('data-tsm-manual') === '1') return false;
    val = String(val == null ? '' : val);

    let igual;
    if (el.tagName === 'SELECT') {
      const ops = Array.from(el.options);
      if (!ops.some(o => o.value === val)) return false;
      igual = el.multiple ? ops.every(o => o.selected === (o.value === val)) : el.value === val;
      if (!igual) {
        if (opts.completo) el.focus();
        if (el.multiple) ops.forEach(o => { o.selected = (o.value === val); });
        else el.value = val;
      }
    } else {
      igual = el.value === val;
      if (!igual) {
        if (opts.completo) el.focus();
        el.value = val;
      }
    }

    if (opts.force) el.removeAttribute('data-tsm-manual');
    if (!igual) {
      refrescarSelect2(el);
      if (opts.completo) {
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Tab' }));
        el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'Tab' }));
        el.dispatchEvent(new Event('blur', { bubbles: true }));
      } else {
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
    return true;
  }

  function edadDe(texto) {
    if (!texto) return null;
    const s = String(texto).trim();
    let d, m, y, r;
    if ((r = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s))) { d = +r[1]; m = +r[2]; y = +r[3]; }
    else if ((r = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s))) { y = +r[1]; m = +r[2]; d = +r[3]; }
    else return null;
    if (y < 1900 || m < 1 || m > 12 || d < 1 || d > 31) return null;
    const hoy = new Date();
    let e = hoy.getFullYear() - y;
    if (hoy.getMonth() + 1 < m || (hoy.getMonth() + 1 === m && hoy.getDate() < d)) e--;
    return (e >= 0 && e <= 120) ? e : null;
  }

  // Aviso bajo un campo. Un solo aviso por clase; segundos = 0 lo deja fijo.
  function quitarAviso(clase) {
    document.querySelectorAll('.' + clase).forEach(a => a.remove());
  }

  function aviso(ref, clase, texto, tipo, segundos) {
    quitarAviso(clase);
    if (!ref || !ref.parentNode) return;
    const d = document.createElement('div');
    d.className = clase;
    d.textContent = texto;
    d.style.cssText = 'font-size:12px;padding:6px;margin-top:4px;border-radius:4px;' + ESTILO_AVISO[tipo];
    ref.parentNode.appendChild(d);
    if (segundos) setTimeout(() => d.remove(), segundos * 1000);
  }

  /* =====================================================================
   * REGLAS (cada una una sola vez; todos los disparadores llaman aquí)
   * ===================================================================== */

  function aplicarGenero(idx, force) {
    const sexo = par(ID.sexo, idx);
    if (!sexo) return;
    const v = GENERO_POR_SEXO[sexo.value];
    if (v) setValor(par(ID.genero, idx), v, { force: force });
  }

  function aplicarEstadoCivil(idx, force) {
    const f = par(ID.fechaNac, idx);
    const edad = f ? edadDe(f.value) : null;
    if (edad === null) return;
    setValor(par(ID.estadoCivil, idx), edad < ESTADO_CIVIL.corte ? ESTADO_CIVIL.menor : ESTADO_CIVIL.mayor, { force: force });
  }

  // Bloque documento/sexo/género: al cambiar el tipo de documento (siempre re-deriva)
  function aplicarDocumento(tipoEl, idx) {
    const tipo = tipoEl.value;
    if (!tipo) return;
    const g = NACIONALES.indexOf(tipo) >= 0 ? POR_GRUPO.nacional : POR_GRUPO.extranjero;
    const F = { force: true };

    setValor(par(ID.nacionalidad, idx), g.nacionalidad, F);
    setValor(par(ID.pobDif, idx), g.pobDif, F);
    Object.keys(FIJOS).forEach(k => setValor(par(ID[k], idx), FIJOS[k], F));
    aplicarGenero(idx, true);
    aplicarEstadoCivil(idx, true);
  }

  // Validador edad/documento: si no corresponde, cambia el tipo de documento de una vez
  function validarEdadDocumento(idx) {
    const tipoEl = par(ID.tipoDoc, idx);
    const fEl = par(ID.fechaNac, idx);
    if (!tipoEl || !fEl) return;
    const edad = edadDe(fEl.value);
    if (edad === null) return;
    const actual = tipoEl.value;
    if (actual !== DOC.CC && actual !== DOC.RC && actual !== DOC.TI) return; // otros documentos: sin restricción

    const esperado = edad <= EDAD_MAX.RC ? DOC.RC : (edad <= EDAD_MAX.TI ? DOC.TI : DOC.CC);
    if (actual === esperado) return;

    // Primero los dependientes, luego el evento del tipo de documento (antes de la validación nativa de GESI)
    tipoEl.value = esperado;
    refrescarSelect2(tipoEl);
    aplicarDocumento(tipoEl, idx);
    tipoEl.dispatchEvent(new Event('change', { bubbles: true }));

    aviso(fEl, CL.doc, 'Tipo de documento ajustado a ' + NOMBRE_DOC[esperado] + ' según la edad (' + edad + ' años).', 'ok', 6);
  }

  function reaccionarFecha(el, idx) {
    const v = el.value;
    if (el.getAttribute('data-tsm-ultima') === v) return;
    el.setAttribute('data-tsm-ultima', v);
    if (edadDe(v) === null) return;
    aplicarEstadoCivil(idx, false);
    validarEdadDocumento(idx);
  }

  /* =====================================================================
   * INSTITUCIÓN: lo diligenciado en una página se copia a las demás páginas de la misma ficha
   *  - Se guarda por número de ficha (Ficha_fic) y se aplica a todos los nodos con esos ids
   *    (páginas ya creadas y páginas que se creen después).
   *  - Un cambio manual en cualquier página queda como el valor vigente en todas.
   *  - Si la ficha aún no tiene registro, se toma de lo que ya esté diligenciado en la página.
   * ===================================================================== */

  const fichaActual = () => {
    const f = document.getElementById('Ficha_fic');
    return f ? limpio(f.value) : '';
  };

  function leerInstitucion(ficha) {
    try { return JSON.parse(localStorage.getItem(LS_PREFIJO + ficha) || '{}') || {}; }
    catch (e) { return {}; }
  }

  function guardarInstitucion(ficha, datos) {
    try {
      datos._t = Date.now();
      localStorage.setItem(LS_PREFIJO + ficha, JSON.stringify(datos));
    } catch (e) { /* sin almacenamiento disponible */ }
  }

  function limpiarInstitucionesViejas() {
    try {
      const limite = Date.now() - LS_VIGENCIA_DIAS * 86400000;
      Object.keys(localStorage).filter(k => k.indexOf(LS_PREFIJO) === 0).forEach(k => {
        let d = null;
        try { d = JSON.parse(localStorage.getItem(k)); } catch (e) { /* registro dañado */ }
        if (!d || !d._t || d._t < limite) localStorage.removeItem(k);
      });
    } catch (e) { /* sin almacenamiento disponible */ }
  }

  // Escribe en todos los nodos de institución el valor vigente (salvo el que se está editando)
  function aplicarInstitucion(datos, excepto) {
    CAMPOS_INSTITUCION.forEach(k => {
      if (datos[k] === undefined) return;
      nodos(ID[k]).forEach(n => {
        if (n === excepto || n === document.activeElement || n.value === datos[k]) return;
        setValor(n, datos[k], { force: true });
      });
    });
  }

  // El usuario cambió un campo de institución: pasa a ser el valor vigente en todas las páginas
  function alCambiarInstitucion(el) {
    const ficha = fichaActual();
    if (!ficha) return;                      // sin número de ficha aún: lo toma el polling cuando exista
    const k = CAMPOS_INSTITUCION.find(c => ID[c] === el.id);
    if (!k) return;
    const datos = leerInstitucion(ficha);
    datos[k] = el.value;
    guardarInstitucion(ficha, datos);
    aplicarInstitucion(datos, el);
  }

  // Respaldo por polling: páginas nuevas, ficha que se digita después y valores puestos por GESI sin eventos
  function sincronizarInstitucion() {
    const ficha = fichaActual();
    if (!ficha) return;
    const datos = leerInstitucion(ficha);
    let nuevo = false;
    CAMPOS_INSTITUCION.forEach(k => {
      if (datos[k] !== undefined) return;
      const fuente = nodos(ID[k]).find(n => n.value !== '');
      if (fuente) { datos[k] = fuente.value; nuevo = true; }
    });
    if (nuevo) guardarInstitucion(ficha, datos);
    aplicarInstitucion(datos, null);
  }

  function aplicarSRQ() {
    if (!SRQ.habilitado) return;
    SRQ.ids.forEach(id => nodos(id).forEach(el => {
      if (el.tagName === 'SELECT' && el.value === '') setValor(el, SRQ.valor);
    }));
  }

  /* =====================================================================
   * AUTOCOMPLETAR POR CÉDULA (Comprobador de Derechos + Supersalud)
   *  - Comprobador: consulta solo por número (nombres, apellidos, fecha, régimen y EAPB).
   *  - Supersalud: consulta con el código del tipo de documento (sexo, EAPB y respaldo de datos).
   *  - El sexo de Supersalud solo se acepta si los apellidos coinciden con los del Comprobador.
   *  - Afiliación y EAPB se escriben (o se vacían) siempre, para no dejar los de la persona anterior.
   * ===================================================================== */

  let autocompletando = false;  // true mientras el script escribe (no es un cambio manual)
  let consultando = false;
  let pendiente = false;        // la cédula cambió mientras se consultaba
  let ultimaClave = '';
  let avisoCamposFaltantes = false;
  let tConsulta = null;

  function gmRequest(opts) {
    // Tampermonkey
    if (typeof GM_xmlhttpRequest === 'function') {
      return new Promise((resolve, reject) => {
        GM_xmlhttpRequest(Object.assign({ timeout: 20000 }, opts, {
          onload: resolve,
          onerror: reject,
          ontimeout: () => reject(new Error('timeout'))
        }));
      });
    }
    // Aplicación Productividad GESI (1.0.45 o superior): la consulta la hace Python
    const api = W.pywebview && W.pywebview.api;
    if (!api || typeof api.cd_http_request !== 'function') {
      return Promise.reject(new Error('puente de la app no disponible (¿app anterior a 1.0.45?)'));
    }
    return api.cd_http_request(Object.assign({ timeout: 20000 }, opts)).then(r => {
      if (!r || !r.ok) throw new Error((r && r.error) || 'error de red');
      return r; // trae .status y .responseText, igual que GM_xmlhttpRequest
    });
  }

  function extraerCampo(html, name) {
    const m = html.match(new RegExp('name="' + name + '"[^>]*value="([^"]*)"'));
    return m ? m[1] : '';
  }

  // aaaa-mm-dd -> formato del campo de fecha (type=date: aaaa-mm-dd; texto: dd/mm/aaaa)
  function formatearFechaISO(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(limpio(iso));
    if (!m) return limpio(iso);
    const el = par(ID.fechaNac, 0);
    if (el && el.type === 'date') return m[1] + '-' + m[2] + '-' + m[3];
    return m[3] + '/' + m[2] + '/' + m[1];
  }

  // Apellidos comparables: sin tildes, mayúsculas, sin importar el orden
  function normalizarApellidos(s) {
    return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toUpperCase().split(/\s+/).filter(Boolean).sort().join(' ');
  }

  const quitarCeros = s => String(s == null ? '' : s).replace(/\D/g, '').replace(/^0+/, '');

  // Si Supersalud trae algún campo con el número de documento, debe ser el consultado
  function numeroCoincide(d, documento) {
    const esperado = quitarCeros(documento);
    for (const [k, v] of Object.entries(d)) {
      if (!/(identific|documento|numero|nro|cedula|^id$)/i.test(k)) continue;
      if (typeof v !== 'string' && typeof v !== 'number') continue;
      const digitos = quitarCeros(v);
      if (digitos && digitos !== esperado) return false;
    }
    return true;
  }

  // ---------- Fuente 1: Comprobador de Derechos ----------
  function parseTablasComprobador(doc) {
    const TABLAS_IDS = [
      'MainContent_grdContributivo',
      'MainContent_grdBUDA',
      'MainContent_grdSisben',
      'MainContent_grdPoblacionEspecial',
      'MainContent_grdSubsidiado'
    ];
    const registros = [];
    TABLAS_IDS.forEach(id => {
      const tabla = doc.getElementById(id);
      if (!tabla) return;
      const filas = Array.from(tabla.querySelectorAll('tr'));
      const headerRow = filas.find(f => f.querySelector('th'));
      if (!headerRow) return;
      const headers = Array.from(headerRow.querySelectorAll('th')).map(th => th.textContent.trim());
      filas.forEach(fila => {
        if (fila === headerRow || fila.classList.contains('RowEmpty')) return;
        const celdas = Array.from(fila.querySelectorAll('td')).map(td => td.textContent.trim());
        if (!celdas.length) return;
        const registro = {};
        headers.forEach((h, i) => (registro[h] = celdas[i] || ''));
        registro._fuente = id;
        registros.push(registro);
      });
    });
    return registros;
  }

  async function consultarComprobador(documento) {
    const r1 = await gmRequest({ method: 'GET', url: BASE_COMPROBADOR + 'Consulta.aspx' });
    const html1 = r1.responseText || '';

    const pares = [
      ['__EVENTTARGET', ''], ['__EVENTARGUMENT', ''], ['__LASTFOCUS', ''],
      ['__VIEWSTATE', extraerCampo(html1, '__VIEWSTATE')],
      ['__VIEWSTATEGENERATOR', extraerCampo(html1, '__VIEWSTATEGENERATOR')],
      ['__PREVIOUSPAGE', extraerCampo(html1, '__PREVIOUSPAGE')],
      ['__EVENTVALIDATION', extraerCampo(html1, '__EVENTVALIDATION')]
    ].concat(
      FORM_COMPROBADOR.vacios.map(k => [k, '']),
      [[FORM_COMPROBADOR.noId, documento]],
      [FORM_COMPROBADOR.scriptManager],
      [['__ASYNCPOST', 'true']],
      [FORM_COMPROBADOR.boton]
    );

    const r2 = await gmRequest({
      method: 'POST',
      url: BASE_COMPROBADOR + 'Consulta.aspx',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-MicrosoftAjax': 'Delta=true',
        'X-Requested-With': 'XMLHttpRequest'
      },
      data: new URLSearchParams(pares).toString()
    });

    if ((r2.responseText || '').indexOf('No se encontr') !== -1) return null;

    const r3 = await gmRequest({ method: 'GET', url: BASE_COMPROBADOR + 'Resultados.aspx' });
    const doc = new DOMParser().parseFromString(r3.responseText || '', 'text/html');
    const registros = parseTablasComprobador(doc);
    if (!registros.length) return null;

    // Resultados.aspx guarda en sesión la ÚLTIMA consulta exitosa: se exige que el número del
    // resultado sea el consultado, para no devolver a la persona anterior.
    const esperado = quitarCeros(documento);
    const claveNumero = reg => Object.keys(reg).find(k =>
      /(identific|documento|n[uú]mero|n[uú]m\b|cedula|^id$)/i.test(k) && quitarCeros(reg[k]));
    const verificables = registros.filter(reg => claveNumero(reg));
    let r;
    if (verificables.length) {
      r = verificables.find(reg => quitarCeros(reg[claveNumero(reg)]) === esperado);
      if (!r) {
        console.warn('[TAMIZAJES SALUD MENTAL] El Comprobador devolvió otra persona (resultado anterior); se descarta.');
        return null;
      }
    } else {
      r = registros[0]; // sin columna de número no se puede verificar
    }

    // Régimen: solo con filas verificadas de Contributivo o Subsidiado y sin marcas de retiro.
    // Si aparece en ambas tablas, no se decide.
    const activa = reg => !Object.values(reg).some(v => /retirad|suspendid|inactiv|fallecid|cancelad/i.test(String(v)));
    const coincidentes = verificables.filter(reg => quitarCeros(reg[claveNumero(reg)]) === esperado && activa(reg));
    const filaContrib = coincidentes.find(reg => reg._fuente === 'MainContent_grdContributivo');
    const filaSubs = coincidentes.find(reg => reg._fuente === 'MainContent_grdSubsidiado');
    let regimen = '';
    let filaRegimen = null;
    if (filaContrib && !filaSubs) { regimen = '132'; filaRegimen = filaContrib; }
    else if (filaSubs && !filaContrib) { regimen = '131'; filaRegimen = filaSubs; }
    let eapb = '';
    if (filaRegimen) {
      const kEps = Object.keys(filaRegimen).find(k =>
        /(eps|eapb|administradora|aseguradora|entidad)/i.test(k) && limpio(filaRegimen[k]));
      if (kEps) eapb = limpio(filaRegimen[kEps]);
    }

    return {
      nombre1: limpio(r['Primer Nombre']),
      nombre2: limpio(r['Segundo Nombre']),
      apellido1: limpio(r['Primer Apellido']),
      apellido2: limpio(r['Segundo Apellido']),
      fecha: limpio(r['Fecha Nacimiento']),
      regimen: regimen,
      eapb: eapb
    };
  }

  // ---------- Fuente 2: Supersalud ----------
  async function consultarSupersalud(documento, codigoTipo) {
    const r = await gmRequest({
      method: 'GET',
      url: BASE_SUPERSALUD + codigoTipo + '/' + encodeURIComponent(documento),
      headers: { Accept: 'application/json' }
    });
    if (r.status < 200 || r.status >= 300) return null;

    let d;
    try { d = JSON.parse(r.responseText || ''); } catch (e) { return null; }
    if (!d || typeof d !== 'object') return null;

    // estado_afiliacion viene como "AC en SANITAS municipio BOGOTÁ. D.C." (AC = activo)
    const estado = limpio(d.estado_afiliacion);
    const mEps = /\ben\s+(.+?)\s+municipio\b/i.exec(estado);

    return {
      nombre1: limpio(d.nombre),
      nombre2: limpio(d.s_nombre),
      apellido1: limpio(d.apellido),
      apellido2: limpio(d.s_apellido),
      fecha: formatearFechaISO(d.fecha_nacimiento),
      sexo: SEXO_SUPERSALUD_A_GESI[d.sexo] || '',
      numeroOk: numeroCoincide(d, documento),
      estado: estado,
      activo: /^AC\b/i.test(estado),
      eapb: mEps ? mEps[1].trim() : '',
      tipoAfiliado: limpio(d.tipo_de_afiliado)
    };
  }

  // Con régimen subsidiado el nombre termina en "EPS-S": se quita cualquier "EPS", "EPS-S" o "EPSS" final
  // que ya traiga la fuente y se agrega el sufijo una sola vez.
  function formatearEapb(afiliacion, eapb) {
    const nombre = limpio(eapb);
    if (!nombre || afiliacion !== REGIMEN_SUBSIDIADO) return nombre;
    const base = nombre.replace(/\s*\bE\.?P\.?S\.?(?:\s*-?\s*S\b\.?)?\s*$/i, '').trim();
    return (base ? base + ' ' : '') + SUFIJO_EAPB_SUBSIDIADO;
  }

  // Afiliación y EAPB con lo que entregan las dos fuentes.
  //  - EAPB: de Supersalud si la afiliación está activa; si no, del Comprobador.
  //  - Régimen: Comprobador (Contributivo o Subsidiado) o Supersalud con tipo de afiliado 1 = Contributivo.
  //    Si las fuentes se contradicen o no alcanzan, no se llena.
  function decidirAfiliacion(base, sup) {
    const motivos = [];
    let eapb = '';
    let regSup = '';

    if (!sup) {
      motivos.push('sin respuesta de Supersalud');
    } else if (!sup.numeroOk) {
      motivos.push('el número de documento de Supersalud no coincide');
    } else if (!sup.activo) {
      motivos.push('Supersalud reporta la afiliación como "' + (sup.estado || 'sin dato') + '"');
    } else {
      eapb = sup.eapb;
      if (sup.tipoAfiliado === '1') regSup = '132';
      else motivos.push('no se puede deducir el régimen con el tipo de afiliado ' + (sup.tipoAfiliado || 'sin dato'));
    }

    const regBase = (base && base.regimen) || '';
    if (!eapb && base && base.eapb) eapb = base.eapb;

    let afiliacion = regBase || regSup;
    if (regBase && regSup && regBase !== regSup) {
      afiliacion = '';
      motivos.push('el Comprobador y Supersalud no coinciden en el régimen');
    }
    return { afiliacion: afiliacion, eapb: formatearEapb(afiliacion, eapb), motivo: motivos.join('; ') };
  }

  // Devuelve { persona, motivoSexo }. Nombres, apellidos y fecha salen del Comprobador; Supersalud
  // completa lo que falte y solo se consulta si el tipo de documento está en la tabla.
  async function buscarPersona(documento, tipoDoc) {
    let base = null;
    try {
      base = await consultarComprobador(documento);
    } catch (e) {
      console.warn('[TAMIZAJES SALUD MENTAL] Falló Comprobador de Derechos:', e);
    }

    const codigoTipo = TIPO_DOC_GESI_A_SUPERSALUD[tipoDoc];
    let sup = null;
    let motivoSexo = '';

    if (codigoTipo === undefined) {
      motivoSexo = 'este tipo de documento no está configurado para Supersalud';
    } else {
      try {
        sup = await consultarSupersalud(documento, codigoTipo);
        if (!sup) motivoSexo = 'Supersalud no encontró a la persona con este tipo de documento';
      } catch (e) {
        console.warn('[TAMIZAJES SALUD MENTAL] Falló Supersalud:', e);
        motivoSexo = 'falló la consulta a Supersalud';
      }
    }

    // Los nombres se toman en bloque de una sola fuente, para no mezclar personas ni partes de nombre
    const persona = {};
    const conNombre = [base, sup].find(f => f && f.nombre1 && f.apellido1);
    ['nombre1', 'nombre2', 'apellido1', 'apellido2'].forEach(k => { persona[k] = conNombre ? conNombre[k] : ''; });
    persona.fecha = (base && base.fecha) || (sup && sup.fecha) || '';

    if (sup && !motivoSexo) {
      if (!sup.sexo) {
        motivoSexo = 'Supersalud no entregó un sexo válido';
      } else if (!base) {
        motivoSexo = 'no se pudo verificar la persona con el Comprobador de Derechos';
      } else if (!sup.numeroOk) {
        motivoSexo = 'el número de documento de Supersalud no coincide';
      } else if (normalizarApellidos(unir(base.apellido1, base.apellido2)) !== normalizarApellidos(unir(sup.apellido1, sup.apellido2))
                 || !base.apellido1) {
        motivoSexo = 'los apellidos de Supersalud no coinciden con los del Comprobador';
      } else {
        persona.sexo = sup.sexo;
      }
    }

    const af = decidirAfiliacion(base, sup);
    persona.afiliacion = af.afiliacion;
    persona.eapb = af.eapb;
    persona.motivoAfiliacion = af.motivo;

    const completa = persona.nombre1 && persona.apellido1 && persona.fecha;
    return { persona: completa ? persona : null, motivoSexo: motivoSexo };
  }

  // ---------- Disparo ----------
  const claveActual = () => {
    const c = par(ID.documento, 0);
    const t = par(ID.tipoDoc, 0);
    return (t ? String(t.value || '') : '') + '|' + (c ? limpio(c.value) : '');
  };

  function programarConsulta() {
    clearTimeout(tConsulta);
    tConsulta = setTimeout(intentarAutocompletar, DEBOUNCE_CONSULTA_MS);
  }

  function limpiarDatosPersona(idx) {
    autocompletando = true;
    try {
      const F = { force: true, completo: true };
      ['nombre1', 'nombre2', 'apellido1', 'apellido2', 'fechaNac', 'afiliacion', 'eapb']
        .forEach(k => setValor(par(ID[k], idx), '', F));
    } finally {
      autocompletando = false;
    }
  }

  async function intentarAutocompletar() {
    const cedEl = par(ID.documento, 0);
    if (!cedEl) return;
    const cedula = limpio(cedEl.value);
    if (!cedula) return;
    if (consultando) { pendiente = true; return; }

    const idx = indiceDe(cedEl);

    if (!avisoCamposFaltantes) {
      const faltan = ['nombre1', 'apellido1', 'fechaNac', 'sexo', 'afiliacion', 'eapb'].filter(k => !par(ID[k], idx));
      if (faltan.length) {
        avisoCamposFaltantes = true;
        console.warn('[TAMIZAJES SALUD MENTAL] No se encontraron en la página los campos: ' + faltan.join(', ') + '. Revise los IDs en ID.');
      }
    }

    const tipoEl = par(ID.tipoDoc, idx);
    const tipoDoc = tipoEl ? String(tipoEl.value || '') : '';

    // La clave incluye el tipo de documento: si cambia el tipo, se vuelve a consultar
    const clave = tipoDoc + '|' + cedula;
    if (clave === ultimaClave) return;

    const documento = cedula.replace(/[^0-9]/g, '');
    if (!documento) return;

    ultimaClave = clave;
    consultando = true;
    quitarAviso(CL.sexo);
    quitarAviso(CL.afil);

    try {
      const res = await buscarPersona(documento, tipoDoc);
      const persona = res.persona;

      // Si mientras se consultaba cambiaron la cédula o el tipo, el resultado es de otra persona
      if (claveActual() !== clave) {
        ultimaClave = '';
        pendiente = true;
        return;
      }

      if (!persona) {
        limpiarDatosPersona(idx);
        alert('No se encontró la cédula o hubo un error. Por favor, llena los campos manualmente.');
        return;
      }

      autocompletando = true;
      try {
        const F = { force: true, completo: true };
        const campo = k => par(ID[k], idx);

        ['nombre1', 'nombre2', 'apellido1', 'apellido2'].forEach(k => setValor(campo(k), persona[k], F));

        // Sexo -> género (cascada propia del script, sin esperar al evento)
        const sexoLleno = persona.sexo ? setValor(campo('sexo'), persona.sexo, F) : false;
        if (sexoLleno) {
          aplicarGenero(idx, true);
        } else {
          aviso(campo('sexo'), CL.sexo,
            '⚠ No se pudo obtener el sexo automáticamente (' + (res.motivoSexo || 'la opción de sexo no existe en el formulario') +
            '). Revíselo a mano: puede tener un valor anterior.', 'warn', 0);
        }

        // Fecha -> estado civil y validador edad/documento (sin esperar al polling)
        const fEl = campo('fechaNac');
        setValor(fEl, persona.fecha, F);
        if (fEl) reaccionarFecha(fEl, idx);

        // Afiliación y EAPB: siempre se escriben (o se vacían)
        const afilLlena = persona.afiliacion ? setValor(campo('afiliacion'), persona.afiliacion, F) : false;
        if (!afilLlena) setValor(campo('afiliacion'), '', F);
        setValor(campo('eapb'), persona.eapb || '', F);

        const faltantes = [];
        if (!afilLlena) faltantes.push('Afiliación al SGSSS');
        if (!persona.eapb) faltantes.push('Nombre EAPB');
        if (faltantes.length) {
          aviso(campo('afiliacion'), CL.afil,
            '⚠ No se pudo obtener automáticamente: ' + faltantes.join(' y ') +
            (persona.motivoAfiliacion ? ' (' + persona.motivoAfiliacion + ')' : '') + '. Revíselo a mano.', 'warn', 0);
        }
      } finally {
        autocompletando = false;
      }
    } catch (e) {
      console.error('[TAMIZAJES SALUD MENTAL]', e);
      if (claveActual() === clave) limpiarDatosPersona(idx);
      alert('No se encontró la cédula o hubo un error. Por favor, llena los campos manualmente.');
    } finally {
      consultando = false;
      if (pendiente) {
        pendiente = false;
        programarConsulta();
      }
    }
  }

  /* =====================================================================
   * DISPARADORES (un solo listener en document, fase de captura)
   * ===================================================================== */

  let tValidador = null;

  function alEvento(e) {
    const t = e.target;
    if (!t || !t.id) return;
    const id = t.id;
    const tipo = e.type;

    // --- Autocompletar por cédula: acepta también eventos del propio script
    //     (p. ej. cuando el validador cambia el tipo de documento, se vuelve a consultar)
    if (id === ID.documento && (tipo === 'blur' || tipo === 'change' || tipo === 'keyup')) programarConsulta();
    else if (id === ID.tipoDoc && tipo === 'change') programarConsulta();
    else if (id === ID.afiliacion && tipo === 'change' && !autocompletando) quitarAviso(CL.afil);
    else if (id === ID.sexo && tipo === 'change' && !autocompletando) quitarAviso(CL.sexo);

    // --- Reglas: solo acciones reales del usuario
    if (!e.isTrusted || tipo === 'keyup') return;
    if (tipo === 'blur' && id !== ID.fechaNac) return;

    if (id === ID.tipoDoc) {
      const idx = indiceDe(t);
      aplicarDocumento(t, idx);
      clearTimeout(tValidador);
      tValidador = setTimeout(() => validarEdadDocumento(idx), DEBOUNCE_VALIDADOR_MS);
    } else if (id === ID.sexo) {
      aplicarGenero(indiceDe(t), true);
    } else if (id === ID.fechaNac) {
      reaccionarFecha(t, indiceDe(t));
    } else if (IDS_INSTITUCION.has(id) && (tipo === 'change' || tipo === 'input')) {
      alCambiarInstitucion(t);
    } else if (AUTO_IDS.has(id) && (tipo === 'change' || tipo === 'input')) {
      t.setAttribute('data-tsm-manual', '1'); // el usuario cambió a mano: se respeta
    }
  }

  // "input" se dispara antes que "change" y antes que la validación nativa de GESI
  ['input', 'change', 'blur', 'keyup'].forEach(ev => document.addEventListener(ev, alEvento, true));

  /* =====================================================================
   * RESPALDO POR POLLING (GESI cambia valores por JS sin eventos)
   * ===================================================================== */

  let claveAnterior = null;
  const claveFicha = () => {
    const f = document.getElementById('Ficha_fic');
    const c = document.getElementById('Consecutivo_fic');
    return (f ? f.value : '') + '|' + (c ? c.value : '');
  };

  function poll() {
    // Ficha nueva: se olvidan los cambios manuales y la última consulta, y se re-toma la línea base de la fecha
    const clave = claveFicha();
    if (claveAnterior !== null && clave !== claveAnterior) {
      document.querySelectorAll('[data-tsm-manual]').forEach(n => n.removeAttribute('data-tsm-manual'));
      nodos(ID.fechaNac).forEach(n => n.setAttribute('data-tsm-ultima', n.value));
      ultimaClave = '';
    }
    claveAnterior = clave;

    nodos(ID.fechaNac).forEach((el, idx) => {
      if (el.getAttribute('data-tsm-ultima') === null) {   // primera vez: solo línea base
        el.setAttribute('data-tsm-ultima', el.value);
        return;
      }
      if (el.getAttribute('data-tsm-ultima') !== el.value) reaccionarFecha(el, idx);
    });

    sincronizarInstitucion();
    aplicarSRQ();
  }

  limpiarInstitucionesViejas();
  setInterval(poll, POLL_MS);
  poll();

  /* =====================================================================
   * DIAGNÓSTICO: en la consola escribir  tamizajesSMDiagnostico()
   * ===================================================================== */
  W.tamizajesSMDiagnostico = function () {
    const filas = Object.keys(ID).map(k => {
      const l = nodos(ID[k]);
      return { campo: k, id: ID[k], nodos: l.length, valor: l[0] ? l[0].value : '(no existe)',
               manual: l[0] ? l[0].getAttribute('data-tsm-manual') === '1' : false };
    });
    console.table(filas);
    const f = nodos(ID.fechaNac)[0];
    console.log('Edad calculada:', f ? edadDe(f.value) : null, '| Ficha:', claveFicha(), '| Última consulta:', ultimaClave || '(ninguna)');
  };

  console.log('[TAMIZAJES SALUD MENTAL] v1.3 activo');
})();
