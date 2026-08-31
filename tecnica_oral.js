// ==UserScript==
// @name         TECNICA ORAL PRO
// @namespace    https://gesiapps.saludcapital.gov.co/GESI_sistemas/GESI_Form*
// @version      2025-06-09
// @description  Automatiza + validaciones + UI pro
// @match        https://gesiapps.saludcapital.gov.co/GESI_sistemas/GESI_Form*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    function iniciarScript() {

        let tipoDocumento = document.getElementById("valorControl20456");
        let numeroDocumento = document.getElementById("valorControl20457");
        let nacionalidad = document.getElementById("valorControl20458");
        let sexo = document.getElementById("valorControl20459");
        let genero = document.getElementById("valorControl20460");
        let edad = document.getElementById("valorControl20462");
        let etnia = document.getElementById("valorControl20464");
        let poblacion = document.getElementById("valorControl20465");

        let ev1 = document.getElementById("valorControl20478");
        let ev2 = document.getElementById("valorControl20479");
        let ev3 = document.getElementById("valorControl20480");
        let ev4 = document.getElementById("valorControl20481");
        let ev5 = document.getElementById("valorControl20482");
        let ev6 = document.getElementById("valorControl20483");
        let ev7 = document.getElementById("valorControl20484");

        let campo0_1 = document.getElementById("valorControl20488");
        let campo0_2 = document.getElementById("valorControl20489");

        if (!tipoDocumento || !nacionalidad || !poblacion || !etnia || !sexo || !genero || !numeroDocumento || !edad) {
            setTimeout(iniciarScript, 1000);
            return;
        }

        // 🔴 ERROR
        function marcarError(el) {
            if (!el) return;
            el.style.backgroundColor = "#ffe6e6";
            el.style.border = "2px solid #ff4d4d";
        }

        function limpiarError(el) {
            if (!el) return;
            el.style.backgroundColor = "";
            el.style.border = "";
        }

        // 🔵 MARCAR AZUL
        function marcarAzul(el) {
            if (!el) return;
            el.style.backgroundColor = "#d4f1ff";
            el.style.border = "";
        }

        // 🔒 SOLO SI VACÍO
        function aplicarCambio(el, valor) {
            if (!el) return;
            if (el.value !== "") return;

            el.value = valor;
            el.dispatchEvent(new Event('change', { bubbles: true }));
            marcarAzul(el);
        }

        function aplicarCero(el) {
            if (!el) return;
            if (el.value !== "") return;

            el.value = "0";
            el.dispatchEvent(new Event('input', { bubbles: true }));
            marcarAzul(el);
        }

        // 🔄 FORZADO
        function aplicarCambioForzado(el, valor) {
            if (!el) return;

            if (el.value !== valor) {
                el.value = valor;
                el.dispatchEvent(new Event('change', { bubbles: true }));
                marcarAzul(el);
            }
        }

        // 🎨 ALERTA PRO
        let alertaActiva = false;

        function mostrarAlerta(msg) {
            if (alertaActiva) return;
            alertaActiva = true;

            let overlay = document.createElement("div");
            overlay.style = `
                position:fixed;top:0;left:0;width:100%;height:100%;
                background:rgba(0,0,0,0.5);
                display:flex;align-items:center;justify-content:center;
                z-index:9999;
                backdrop-filter: blur(3px);
            `;

            let modal = document.createElement("div");
            modal.style = `
                background:linear-gradient(135deg,#ffffff,#f2f7ff);
                padding:25px;
                border-radius:15px;
                text-align:center;
                width:320px;
                box-shadow:0 10px 30px rgba(0,0,0,0.3);
                font-family:Arial;
            `;

            modal.innerHTML = `
                <div style="font-size:40px;margin-bottom:10px;">⚠️</div>
                <p style="margin-bottom:20px;font-size:15px;color:#333;">
                    ${msg}
                </p>
                <button style="
                    padding:10px 25px;
                    border:none;
                    background:linear-gradient(135deg,#007bff,#0056b3);
                    color:#fff;
                    border-radius:8px;
                    cursor:pointer;
                    font-weight:bold;
                ">Aceptar</button>
            `;

            modal.querySelector("button").onclick = () => {
                overlay.remove();
                alertaActiva = false;
            };

            overlay.appendChild(modal);
            document.body.appendChild(overlay);
        }

        // 🧠 AUTOCOMPLETAR
        function autocompletarPorTipo() {

            let tipo = tipoDocumento.value;

            let colombia = ["59", "60", "61"];
            let venezuela = ["62", "66", "1640", "2482"];

            if (colombia.includes(tipo)) {
                aplicarCambioForzado(nacionalidad, "50");
                aplicarCambioForzado(poblacion, "2620");
                aplicarCambioForzado(etnia, "84");
            } else if (venezuela.includes(tipo)) {
                aplicarCambioForzado(nacionalidad, "236");
                aplicarCambioForzado(poblacion, "4051");
                aplicarCambioForzado(etnia, "84");
            }

            aplicarCambio(ev1, "4557");
            aplicarCambio(ev2, "4557");
            aplicarCambio(ev3, "4557");
            aplicarCambio(ev4, "4557");
            aplicarCambio(ev5, "4557");
            aplicarCambio(ev6, "4557");
            aplicarCambio(ev7, "4557");

            aplicarCero(campo0_1);
            aplicarCero(campo0_2);
        }

        function actualizarGenero() {
            if (sexo.value === "67") aplicarCambioForzado(genero, "70");
            if (sexo.value === "68") aplicarCambioForzado(genero, "71");
        }

        // 🚨 VALIDACIÓN
        function validar() {

            let tipo = tipoDocumento.value;
            let num = numeroDocumento.value;
            let edadVal = parseInt(edad.value);

            limpiarError(numeroDocumento);
            limpiarError(edad);

            if (num.length > 0) {
                if (!/^\d*$/.test(num)) {
                    marcarError(numeroDocumento);
                    mostrarAlerta("El documento solo debe contener números");
                    return;
                }

                if (num.length > 10) {
                    marcarError(numeroDocumento);
                    mostrarAlerta("Máximo 10 dígitos permitidos");
                    return;
                }

                if (num.length === 9) {
                    marcarError(numeroDocumento);
                    mostrarAlerta("El documento no puede tener 9 dígitos");
                    return;
                }
            }

            if (!isNaN(edadVal)) {

                if (tipo === "60" && edadVal > 6) {
                    marcarError(edad);
                    mostrarAlerta("Este documento no corresponde a la edad (RC: 0-6 años)");
                }

                if (tipo === "61" && (edadVal < 7 || edadVal > 17)) {
                    marcarError(edad);
                    mostrarAlerta("Este documento no corresponde a la edad (TI: 7-17 años)");
                }

                if (tipo === "59" && (edadVal < 18 || edadVal > 99)) {
                    marcarError(edad);
                    mostrarAlerta("Este documento no corresponde a la edad (CC: 18-99 años)");
                }
            }
        }

        // 🎯 EVENTOS
        tipoDocumento.addEventListener("change", () => {
            autocompletarPorTipo();
            validar();
        });

        sexo.addEventListener("change", actualizarGenero);
        numeroDocumento.addEventListener("blur", validar);  // Cambié 'input' por 'blur'
        edad.addEventListener("input", validar);

        // 🟢 INICIO
        actualizarGenero();
    }

    iniciarScript();

})();
