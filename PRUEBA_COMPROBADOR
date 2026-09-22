// ==UserScript==
// @name          EDUCATIVO-Autocompletar por cédula (Comprobador de Derechos)
// @namespace    opencode-gesi
// @version      1.0.1
// @match        https://gesiapps.saludcapital.gov.co/GESI_sistemas/GESI_Form/formulario
// @grant        GM_xmlhttpRequest
// @connect      appb.saludcapital.gov.co
// @run-at       document-idle
// ==/UserScript==

const AUTHORIZED_USERS = ['Andres Arias', 'Cristhian Parra']; // agrega aquí los autorizados

function getFullNameFromDOM() {
  const el = document.querySelector('span.dig-nav-user-name');
  return el && el.textContent ? el.textContent.trim().replace(/\s+/g, ' ') : null;
}

(function authorizeOrStop() {
  const fullName = getFullNameFromDOM();
  if (!fullName) return;

  const allowed = AUTHORIZED_USERS.some(u => u.trim().toUpperCase() === fullName.toUpperCase());
  if (!allowed) return;
})();

(function () {
  'use strict';

  const BASE = 'https://appb.saludcapital.gov.co/comprobadordederechos/';

  const IDS = {
    cedula: 'valorControl17511',
    nombres: 'valorControl17508',
    apellidos: 'valorControl17509',
    fechaNacimiento: 'valorControl17516',
  };

  const SELECTORS = {
    cedula: '#' + IDS.cedula,
    nombres: '#' + IDS.nombres,
    apellidos: '#' + IDS.apellidos,
    fecha: '#' + IDS.fechaNacimiento,
  };

  function $(sel) { return document.querySelector(sel); }

  function setValue(selector, value) {
    const el = $(selector);
    if (!el) return false;

    const v = value ?? '';
    el.focus();
    el.value = v;

    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));

    el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Tab' }));
    el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'Tab' }));

    el.dispatchEvent(new Event('blur', { bubbles: true }));
    return true;
  }

  function extraerCampo(html, name) {
    const regex = new RegExp('name="' + name + '"[^>]*value="([^"]*)"');
    const m = html.match(regex);
    return m ? m[1] : '';
  }

  function gmRequest(opts) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest(Object.assign({ timeout: 20000 }, opts, {
        onload: resolve,
        onerror: reject,
        ontimeout: () => reject(new Error('timeout')),
      }));
    });
  }

  function parseTablasComprobador(doc) {
    const TABLAS_IDS = [
      'MainContent_grdContributivo',
      'MainContent_grdBUDA',
      'MainContent_grdSisben',
      'MainContent_grdPoblacionEspecial',
      'MainContent_grdSubsidiado',
    ];

    const registros = [];
    TABLAS_IDS.forEach((id) => {
      const tabla = doc.getElementById(id);
      if (!tabla) return;

      const filas = Array.from(tabla.querySelectorAll('tr'));
      const headerRow = filas.find((f) => f.querySelector('th'));
      if (!headerRow) return;

      const headers = Array.from(headerRow.querySelectorAll('th')).map((th) => th.textContent.trim());

      filas.forEach((fila) => {
        if (fila === headerRow) return;
        if (fila.classList.contains('RowEmpty')) return;

        const celdas = Array.from(fila.querySelectorAll('td')).map((td) => td.textContent.trim());
        if (!celdas.length) return;

        const registro = {};
        headers.forEach((h, i) => (registro[h] = celdas[i] || ''));
        registro._fuente = id;
        registros.push(registro);
      });
    });
    return registros;
  }

  async function consultarComprobador(documentoRaw) {
    const documento = (documentoRaw || '').replace(/[^0-9]/g, '');
    if (!documento) return { encontrado: false, documento };

    const r1 = await gmRequest({ method: 'GET', url: BASE + 'Consulta.aspx' });
    const html1 = r1.responseText || '';

    const viewstate = extraerCampo(html1, '__VIEWSTATE');
    const viewstateGen = extraerCampo(html1, '__VIEWSTATEGENERATOR');
    const eventValidation = extraerCampo(html1, '__EVENTVALIDATION');
    const previousPage = extraerCampo(html1, '__PREVIOUSPAGE');

    const body = new URLSearchParams({
      __EVENTTARGET: '',
      __EVENTARGUMENT: '',
      __LASTFOCUS: '',
      __VIEWSTATE: viewstate,
      __VIEWSTATEGENERATOR: viewstateGen,
      __PREVIOUSPAGE: previousPage,
      __EVENTVALIDATION: eventValidation,
      'ctl00$MainContent$txtConsecutivo': '',
      'ctl00$MainContent$txtNoId': documento,
      'ctl00$MainContent$txtFichaSisben': '',
      'ctl00$MainContent$txtPriApellido': '',
      'ctl00$MainContent$txtSegApellido': '',
      'ctl00$MainContent$txtPriNombre': '',
      'ctl00$MainContent$txtSegNombre': '',
      'ctl00$ctl12': 'ctl00$MainContent$cmdConsultar',
      __ASYNCPOST: 'true',
      'ctl00$MainContent$cmdConsultar': 'Consultar',
    }).toString();

    const r2 = await gmRequest({
      method: 'POST',
      url: BASE + 'Consulta.aspx',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-MicrosoftAjax': 'Delta=true',
        'X-Requested-With': 'XMLHttpRequest',
      },
      data: body,
    });

    const texto2 = r2.responseText || '';
    if (texto2.indexOf('No se encontr') !== -1) return { encontrado: false, documento };

    const r3 = await gmRequest({ method: 'GET', url: BASE + 'Resultados.aspx' });
    const parser = new DOMParser();
    const doc = parser.parseFromString(r3.responseText || '', 'text/html');
    const registros = parseTablasComprobador(doc);

    return { encontrado: registros.length > 0, documento, registros };
  }

  function showManualAlert() {
    alert('No se encontró la cédula o hubo un error. Por favor, llena los campos manualmente.');
  }

  let running = false;
  let lastCedula = '';

  async function tryAutofill() {
    const cedEl = $(SELECTORS.cedula);
    if (!cedEl) return;

    const cedula = (cedEl.value || '').trim();
    if (!cedula) return;
    if (running) return;
    if (cedula === lastCedula) return;

    lastCedula = cedula;
    running = true;

    try {
      const resultado = await consultarComprobador(cedula);
      if (!resultado.encontrado) {
        showManualAlert();
        return;
      }

      const r = resultado.registros[0] || null;
      if (!r) {
        showManualAlert();
        return;
      }

      const apellidos = `${r['Primer Apellido'] || ''} ${r['Segundo Apellido'] || ''}`.trim();
      const nombres = `${r['Primer Nombre'] || ''} ${r['Segundo Nombre'] || ''}`.trim();
      const fecha = (r['Fecha Nacimiento'] || '').trim();

      if (!nombres || !apellidos || !fecha) {
        showManualAlert();
        return;
      }

      setValue(SELECTORS.nombres, nombres);
      setValue(SELECTORS.apellidos, apellidos);
      setValue(SELECTORS.fecha, fecha);
    } catch (e) {
      showManualAlert();
    } finally {
      running = false;
    }
  }

  function init() {
  const cedEl = $(SELECTORS.cedula);
  if (!cedEl) return;

  let t = null;
  const schedule = () => {
    clearTimeout(t);
    t = setTimeout(tryAutofill, 2500);
  };

  cedEl.addEventListener('blur', schedule);
  cedEl.addEventListener('change', schedule);
  cedEl.addEventListener('keyup', (e) => {
    if (e.key === 'Tab' || e.key === 'Enter') return schedule();
    schedule();
  });
}

  init();
})();
