// ==UserScript==
// @name         GESTION DEL RIESGO
// @namespace    http://tampermonkey.net/
// @version      3.3
// @description  Script GESI PRO FULL v3.3 — reset forzado al cambiar doc, protección manual, debounce en validadores
// @match        https://gesiapps.saludcapital.gov.co/GESI_sistemas/GESI_Form*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function () {
'use strict';

const style = document.createElement('style');
style.innerHTML = `
@keyframes fadeIn {
    from {opacity:0; transform:translateY(-10px);}
    to {opacity:1; transform:translateY(0);}
}`;
document.head.appendChild(style);

const bgAuto  = 'rgba(100,180,255,0.3)';
let ultimoError = '';


const camposManual = new Set();


let timerDoc = null;
let timerTel = null;

// CAMPOS

function campos() {
    return {
        num_doc:          document.querySelector('#valorControl22091'),
        tipo_doc:         document.querySelector('#valorControl22090'),
        nacionalidad:     document.querySelector('#valorControl22098'),
        etnia:            document.querySelector('#valorControl22104'),
        sexo:             document.querySelector('#valorControl22100'),
        genero:           document.querySelector('#valorControl22102'),
        orientacion:      document.querySelector('#valorControl23735'),
        identidad_genero: document.querySelector('#valorControl23736'),
        pdi:              document.querySelector('#valorControl22112'),
        pio:              document.querySelector('#valorControl22114'),
        etapa_gestacion:  document.querySelector('#valorControl22131'),
        edad:             document.querySelector('#valorControl22690'),
        fecha_nacimiento: document.querySelector('#AQUI_ID_FECHA'),
        conducta_suicida:    document.querySelector('#valorControl22220'),
        bullying:            document.querySelector('#valorControl22221'),
        violencia:           document.querySelector('#valorControl22222'),
        problemas_psico:     document.querySelector('#valorControl22223'),
        consumo_sustancias:  document.querySelector('#valorControl22224'),
        cutting:             document.querySelector('#valorControl22225'),
        otros_tipos:         document.querySelector('#valorControl22226'),
        prob_aprendizaje:    document.querySelector('#valorControl22227'),
        trastornos_infancia: document.querySelector('#valorControl22228'),
        antecedentes:        document.querySelector('#valorControl22230'),
    };
}

// ─────────────────────────────────────────────
// ALERTA
// ─────────────────────────────────────────────
function mostrarAvisoError(titulo, mensaje) {
    const claveError = titulo + mensaje;
    if (ultimoError === claveError) return;
    ultimoError = claveError;

    const prev = document.getElementById('noti-gesi');
    if (prev) prev.remove();

    const noti = document.createElement('div');
    noti.id = 'noti-gesi';
    noti.style.cssText = `
        position:fixed; top:20px; right:20px; z-index:99999;
        background:linear-gradient(135deg,#ff4d4d,#e53935);
        color:white; padding:16px 20px; border-radius:12px;
        max-width:320px; font-family:Arial;
        box-shadow:0 8px 25px rgba(0,0,0,0.25);
        animation:fadeIn 0.3s ease;
    `;
    noti.innerHTML = `
        <div style="font-weight:bold;font-size:14px;margin-bottom:6px;">⚠ ${titulo}</div>
        <div style="font-size:13px;line-height:1.4;">${mensaje}</div>
    `;
    document.body.appendChild(noti);

    setTimeout(() => {
        noti.style.opacity      = '0';
        noti.style.transform    = 'translateY(-10px)';
        noti.style.transition   = 'all 0.3s';
        setTimeout(() => { noti.remove(); ultimoError = ''; }, 300);
    }, 3000);
}

// ─────────────────────────────────────────────
// SETTERS
// ─────────────────────────────────────────────

// Solo si el campo está vacío Y el usuario NO lo tocó
function setAuto(c, v) {
    if (c && c.value === '' && !camposManual.has(c.id)) {
        c.value = v;
        c.style.backgroundColor = bgAuto;
    }
}

function setForzado(c, v) {
    if (c) {
        c.value = v;
        c.style.backgroundColor = bgAuto;
        camposManual.delete(c.id);  // resetear bandera manual
    }
}

function aplicarTipoDoc(v, forzar) {
    const c = campos();
    v = parseInt(v);
    const set = forzar ? setForzado : setAuto;

    if ([59, 60, 61].includes(v)) {
        set(c.nacionalidad, '50');
        set(c.pdi, '2620');
        setAuto(c.etnia, '84');
        setAuto(c.pio, '4048');
    }

    if ([62, 65, 66, 1640, 2482].includes(v)) {
        set(c.nacionalidad, '236');
        set(c.pdi, '4051');
        setAuto(c.etnia, '84');
        setAuto(c.pio, '4048');
    }
}

function aplicarSexo(forzar) {
    const c   = campos();
    const t   = parseInt(c.tipo_doc?.value);
    const s   = c.sexo?.value;
    const eCC = (t === 59);
    const set = forzar ? setForzado : setAuto;

    if (s === '68') {
        set(c.genero,           eCC ? '71'   : '4513');
        set(c.orientacion,      eCC ? '4024' : '4028');
        set(c.identidad_genero, eCC ? '4514' : '4020');
    }

    if (s === '67') {
        set(c.genero,           eCC ? '70'   : '4513');
        set(c.orientacion,      eCC ? '4024' : '4028');
        set(c.identidad_genero, eCC ? '4515' : '4020');
    }
}

function aplicarCamposAuto() {
    const c = campos();
    setAuto(c.conducta_suicida,    '2844');
    setAuto(c.bullying,            '2845');
    setAuto(c.violencia,           '2846');
    setAuto(c.problemas_psico,     '2831');
    setAuto(c.consumo_sustancias,  '2847');
    setAuto(c.cutting,             '2848');
    setAuto(c.otros_tipos,         '2843');
    setAuto(c.prob_aprendizaje,    '2849');
    setAuto(c.trastornos_infancia, '2842');
    setAuto(c.antecedentes,        '4257');
}

function validarNumDoc() {
    const c = campos();
    const v = c.num_doc?.value?.trim();
    if (!v) { if (c.num_doc) c.num_doc.style.border = ''; return; }

    const invalido = !/^\d+$/.test(v) || /^\d{9}$/.test(v) || /^\d{11,}$/.test(v);
    if (invalido) {
        c.num_doc.style.border = '2px solid red';
        mostrarAvisoError('Documento inválido', 'Verifique número de documento');
    } else {
        c.num_doc.style.border = '';
    }
}

function validarTelefono() {
    const t = document.querySelector('#valorControl22218');
    if (!t) return;
    const v = t.value.trim();
    if (v && !/^\d{10}$/.test(v)) {
        t.style.border = '2px solid red';
        mostrarAvisoError('Teléfono inválido', 'Debe tener 10 dígitos');
    } else {
        t.style.border = '';
    }
}

function calcEdad(f) {
    if (!f) return null;
    let p = f.includes('/') ? f.split('/') : f.split('-');
    if (p.length !== 3) return null;
    let d = f.includes('/')
        ? new Date(p[2], p[1]-1, p[0])
        : new Date(p[0], p[1]-1, p[2]);
    let h = new Date();
    let e = h.getFullYear() - d.getFullYear();
    if (h.getMonth() < d.getMonth() ||
       (h.getMonth() === d.getMonth() && h.getDate() < d.getDate())) e--;
    return e;
}

function resolverEdad() {
    const c = campos();
    let edad = calcEdad(c.fecha_nacimiento?.value);
    if ((edad === null || isNaN(edad)) && c.edad?.value) {
        edad = parseInt(c.edad.value);
    }
    return edad;
}

function validarFechaVsEdad() {
    const c    = campos();
    const real = calcEdad(c.fecha_nacimiento?.value);
    const sis  = parseInt(c.edad?.value);
    if (real && sis && Math.abs(real - sis) > 1) {
        c.edad.style.border = '2px solid red';
        mostrarAvisoError('Edad inconsistente', 'No coincide con fecha de nacimiento');
    } else if (c.edad) {
        c.edad.style.border = '';
    }
}

function validarEdadVsDocumento() {
    const c    = campos();
    const tipo = parseInt(c.tipo_doc?.value);
    const edad = resolverEdad();

    if (!tipo || edad === null || isNaN(edad)) return;

    let valido = true;
    if (tipo === 60 && (edad < 0  || edad > 6))  valido = false;
    if (tipo === 61 && (edad < 7  || edad > 17)) valido = false;
    if (tipo === 59 && (edad < 18 || edad > 99)) valido = false;

    if (!valido) {
        if (campos().edad) campos().edad.style.border = '2px solid red';
        mostrarAvisoError('Documento no corresponde', 'El tipo de documento no coincide con la edad');
    }
}

function controlarGestacion() {
    const c    = campos();
    const edad = resolverEdad();

    if (c.sexo?.value === '68' && edad >= 11) {
        c.etapa_gestacion.disabled = false;
        if (!c.etapa_gestacion.value) {
            c.etapa_gestacion.value = '3785';
            c.etapa_gestacion.style.backgroundColor = bgAuto;
            c.etapa_gestacion.dispatchEvent(new Event('change', {bubbles: true}));
        }
    } else {
        c.etapa_gestacion.disabled = true;
        c.etapa_gestacion.value   = '';
    }
}

function resaltarCamposObligatorios() {
    [
        '#valorControl22198','#valorControl22199','#valorControl22204',
        '#valorControl22208','#valorControl22218','#valorControl22143',
        '#valorControl22046','#valorControl22047','#valorControl22048',
        '#valorControl22058','#valorControl22060','#valorControl23730',
        '#valorControl23732','#valorControl23733','#valorControl23734',
        '#valorControl22086','#valorControl22088','#valorControl22116',
        '#valorControl22129','#valorControl22130','#valorControl22115',
        '#valorControl22138','#valorControl22140','#valorControl22144',
        '#valorControl22232','#valorControl22233','#valorControl22251',
        '#valorControl22252','#valorControl22253','#valorControl22061',
        '#valorControl22239'
    ].forEach(id => {
        const el = document.querySelector(id);
        if (el && !el.style.border.includes('red'))
            el.style.backgroundColor = 'rgba(100,180,255,0.15)';
    });
}
function iniciarListeners() {

    // FIX 1: Cambio de tipo_doc → reset forzado de nacionalidad y PDI
    const tipoDoc = document.querySelector('#valorControl22090');
    if (tipoDoc) {
        tipoDoc.addEventListener('change', () => {
            aplicarTipoDoc(tipoDoc.value, true);
        });
    }

    // FIX 1: Cambio de sexo → reset forzado de genero/orientacion/identidad
    const sexo = document.querySelector('#valorControl22100');
    if (sexo) {
        sexo.addEventListener('change', () => {
            aplicarSexo(true);
        });
    }

    // FIX 2: Marcar como "manual" los campos auto cuando el usuario los cambia
    const idsAutoProtegidos = [
        '#valorControl22098', // nacionalidad
        '#valorControl22104', // etnia
        '#valorControl22102', // genero
        '#valorControl23735', // orientacion
        '#valorControl23736', // identidad_genero
        '#valorControl22112', // pdi
        '#valorControl22114', // pio
        '#valorControl22220','#valorControl22221','#valorControl22222',
        '#valorControl22223','#valorControl22224','#valorControl22225',
        '#valorControl22226','#valorControl22227','#valorControl22228',
        '#valorControl22230'
    ];

    idsAutoProtegidos.forEach(id => {
        const el = document.querySelector(id);
        if (el) {
            el.addEventListener('change', () => {
                camposManual.add(el.id);
                el.style.backgroundColor = ''; // quitar color auto si fue cambiado a mano
            });
        }
    });

    // FIX 3: Debounce 900ms para número de documento
    const numDoc = document.querySelector('#valorControl22091');
    if (numDoc) {
        numDoc.addEventListener('input', () => {
            clearTimeout(timerDoc);
            numDoc.style.border = ''; // limpiar error mientras escribe
            ultimoError = '';
            timerDoc = setTimeout(validarNumDoc, 900);
        });
    }

    // FIX 3: Debounce 900ms para teléfono
    const tel = document.querySelector('#valorControl22218');
    if (tel) {
        tel.addEventListener('input', () => {
            clearTimeout(timerTel);
            tel.style.border = '';
            ultimoError = '';
            timerTel = setTimeout(validarTelefono, 900);
        });
    }
}

// ─────────────────────────────────────────────
// LOOP — solo lógica que no depende de escritura activa
// validarNumDoc y validarTelefono ya NO están aquí
// ─────────────────────────────────────────────
setInterval(() => {
    const c = campos();
    if (!c.tipo_doc) return;

    aplicarTipoDoc(c.tipo_doc.value, false); // modo normal (no forzar)
    aplicarSexo(false);
    aplicarCamposAuto();
    setTimeout(controlarGestacion, 200);
    validarFechaVsEdad();
    validarEdadVsDocumento();
    resaltarCamposObligatorios();

}, 400);

// Arrancar listeners
iniciarListeners();

})();
