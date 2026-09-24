(function autocompletarPorCedula() {

        const BASE_COMPROBADOR = 'https://appb.saludcapital.gov.co/comprobadordederechos/';
        const BASE_SUPERSALUD = 'https://pqrdsuperargo.supersalud.gov.co/api/api/adres/';

        // value del tipo de documento en GESI -> código de tipo de documento en la URL de Supersalud.
        // Confirmados: CC 0, TI 1, RC 8, CE 2, PPT 13.
        // Si el tipo de GESI no está aquí (NUIP, Pasaporte, sin ID, 1640, 1639...), NO se consulta Supersalud.
        // Para agregar uno: 'valor_GESI': 'codigo_Supersalud'.
        const TIPO_DOC_GESI_A_SUPERSALUD = {
            '59': '0',    // Cédula de Ciudadanía
            '61': '1',    // Tarjeta de Identidad
            '60': '8',    // Registro Civil
            '62': '2',    // Cédula de Extranjería
            '2482': '13', // PPT
        };

        // Código de sexo de Supersalud -> value del campo de sexo en GESI.
        // 1 = Hombre, 2 = Mujer (confirmados).
        // Intersexual no está mapeado: si Supersalud devuelve otro código, el sexo queda sin llenar (y se avisa).
        const SEXO_SUPERSALUD_A_GESI = { 1: '67', 2: '68' };

        const CLASE_AVISO_SEXO = 'aviso-sexo-revisar';
        let autocompletando = false; // true mientras el script escribe, para no confundirlo con un cambio manual

        // ---------- Utilidades ----------
        function setValue(clave, value) {
            const el = getCampo(clave);
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

        // Como setValue, pero en un <select> solo asigna si la opción existe
        function setValueSiExiste(clave, value) {
            const el = getCampo(clave);
            if (!el || !value) return false;
            if (el.tagName === 'SELECT' && !Array.from(el.options).some((o) => o.value === String(value))) return false;
            return setValue(clave, value);
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

        // Une partes de un nombre ignorando vacíos: ['A', '', 'B'] -> 'A B'
        function unir(...partes) {
            return partes.map((p) => String(p ?? '').trim()).filter(Boolean).join(' ');
        }

        // Convierte aaaa-mm-dd al formato que espera el campo de GESI
        // (input type="date" -> aaaa-mm-dd; texto -> dd/mm/aaaa)
        function formatearFechaISO(iso) {
            const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || '').trim());
            if (!m) return String(iso || '').trim();
            const el = getCampo('fecha');
            if (el && el.type === 'date') return m[1] + '-' + m[2] + '-' + m[3];
            return m[3] + '/' + m[2] + '/' + m[1];
        }

        // Apellidos comparables: sin tildes, mayúsculas, sin importar el orden de las palabras
        function normalizarApellidos(s) {
            return String(s || '')
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                .toUpperCase()
                .split(/\s+/).filter(Boolean)
                .sort().join(' ');
        }

        // Si la respuesta de Supersalud trae algún campo con el número de documento, debe ser el consultado.
        // Si no trae ninguno, no se puede comprobar por ahí y decide la comparación de apellidos.
        function numeroCoincide(d, documento) {
            const quitarCeros = (s) => String(s).replace(/\D/g, '').replace(/^0+/, '');
            const esperado = quitarCeros(documento);
            for (const [k, v] of Object.entries(d)) {
                if (!/(identific|documento|numero|nro|cedula|^id$)/i.test(k)) continue;
                if (typeof v !== 'string' && typeof v !== 'number') continue;
                const digitos = quitarCeros(v);
                if (digitos && digitos !== esperado) return false;
            }
            return true;
        }

        // ---------- Aviso debajo del campo Sexo ----------
        function quitarAvisoSexo() {
            document.querySelectorAll('.' + CLASE_AVISO_SEXO).forEach((a) => a.remove());
        }

        function mostrarAvisoSexo(motivo) {
            quitarAvisoSexo();
            const campo = getCampo('sexo');
            if (!campo || !campo.parentNode) return;
            const div = document.createElement('div');
            div.className = CLASE_AVISO_SEXO;
            div.textContent = '⚠ No se pudo obtener el sexo automáticamente (' + motivo + '). Revíselo a mano: puede tener un valor anterior.';
            Object.assign(div.style, { color: '#b30000', background: '#ffe6e6', padding: '6px',
                marginTop: '4px', border: '1px solid #ff9999', borderRadius: '4px', fontSize: '12px' });
            campo.parentNode.appendChild(div);
        }

        // ---------- Fuente 1: Comprobador de Derechos ----------
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

        async function consultarComprobador(documento) {
            const r1 = await gmRequest({ method: 'GET', url: BASE_COMPROBADOR + 'Consulta.aspx' });
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
                url: BASE_COMPROBADOR + 'Consulta.aspx',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'X-MicrosoftAjax': 'Delta=true',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                data: body,
            });

            if ((r2.responseText || '').indexOf('No se encontr') !== -1) return null;

            const r3 = await gmRequest({ method: 'GET', url: BASE_COMPROBADOR + 'Resultados.aspx' });
            const doc = new DOMParser().parseFromString(r3.responseText || '', 'text/html');
            const r = parseTablasComprobador(doc)[0];
            if (!r) return null;

            return {
                apellidos: unir(r['Primer Apellido'], r['Segundo Apellido']),
                nombres: unir(r['Primer Nombre'], r['Segundo Nombre']),
                fecha: (r['Fecha Nacimiento'] || '').trim(),
            };
        }

        // ---------- Fuente 2: Supersalud (con el código del tipo de documento) ----------
        async function consultarSupersalud(documento, codigoTipo) {
            const r = await gmRequest({
                method: 'GET',
                url: BASE_SUPERSALUD + codigoTipo + '/' + encodeURIComponent(documento),
                headers: { Accept: 'application/json' },
            });
            if (r.status < 200 || r.status >= 300) return null;

            let d;
            try { d = JSON.parse(r.responseText || ''); } catch (e) { return null; }
            if (!d || typeof d !== 'object') return null;

            return {
                apellidos: unir(d.apellido, d.s_apellido),
                nombres: unir(d.nombre, d.s_nombre),
                fecha: formatearFechaISO(d.fecha_nacimiento),
                sexo: SEXO_SUPERSALUD_A_GESI[d.sexo] || '',
                numeroOk: numeroCoincide(d, documento),
            };
        }

        // ---------- Búsqueda ----------
        // Devuelve { persona, motivoSexo }.
        //  - persona: nombres, apellidos y fecha (obligatorios) y sexo (opcional, solo si se verificó).
        //  - motivoSexo: '' si el sexo se obtuvo; si no, la razón para mostrar en el aviso.
        // Nombres/apellidos/fecha salen del Comprobador; Supersalud solo completa lo que falte
        // y únicamente si el tipo de documento está en la tabla.
        async function buscarPersona(documento, tipoDoc) {
            let base = null;
            try {
                base = await consultarComprobador(documento);
            } catch (e) {
                console.warn('[Autocompletar cédula] Falló Comprobador de Derechos:', e);
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
                    console.warn('[Autocompletar cédula] Falló Supersalud:', e);
                    motivoSexo = 'falló la consulta a Supersalud';
                }
            }

            const persona = {};
            [base, sup].forEach((fuente) => {
                if (!fuente) return;
                ['nombres', 'apellidos', 'fecha'].forEach((c) => { if (!persona[c] && fuente[c]) persona[c] = fuente[c]; });
            });

            if (sup && !motivoSexo) {
                if (!sup.sexo) {
                    motivoSexo = 'Supersalud no entregó un sexo válido';
                } else if (!base) {
                    motivoSexo = 'no se pudo verificar la persona con el Comprobador de Derechos';
                } else if (!sup.numeroOk) {
                    motivoSexo = 'el número de documento de Supersalud no coincide';
                } else if (!base.apellidos || normalizarApellidos(base.apellidos) !== normalizarApellidos(sup.apellidos)) {
                    motivoSexo = 'los apellidos de Supersalud no coinciden con los del Comprobador';
                } else {
                    persona.sexo = sup.sexo;
                }
            }

            const completa = persona.nombres && persona.apellidos && persona.fecha;
            return { persona: completa ? persona : null, motivoSexo };
        }

        function showManualAlert() {
            alert('No se encontró la cédula o hubo un error. Por favor, llena los campos manualmente.');
        }

        // ---------- Disparo ----------
        let running = false;
        let lastClave = '';

        async function tryAutofill() {
            const cedEl = getCampo('cedula');
            if (!cedEl) return;

            const cedula = (cedEl.value || '').trim();
            if (!cedula) return;
            if (running) { schedule(); return; }

            const tipoEl = getCampo('tipo_doc');
            const tipoDoc = tipoEl ? String(tipoEl.value || '') : '';

            // La clave incluye el tipo de documento: si se cambia el tipo, se vuelve a consultar
            const clave = tipoDoc + '|' + cedula;
            if (clave === lastClave) return;

            const documento = cedula.replace(/[^0-9]/g, '');
            if (!documento) return;

            lastClave = clave;
            running = true;
            quitarAvisoSexo();

            try {
                const { persona, motivoSexo } = await buscarPersona(documento, tipoDoc);
                if (!persona) {
                    showManualAlert();
                    return;
                }

                autocompletando = true;
                try {
                    setValue('nombres', persona.nombres);
                    setValue('apellidos', persona.apellidos);
                    setValue('fecha', persona.fecha);
                    const sexoLleno = setValueSiExiste('sexo', persona.sexo);
                    if (!sexoLleno) {
                        mostrarAvisoSexo(motivoSexo || 'la opción de sexo no existe en el formulario');
                    }
                } finally {
                    autocompletando = false;
                }
            } catch (e) {
                showManualAlert();
            } finally {
                running = false;
            }
        }

        // Los eventos se escuchan en el documento (fase de captura) y se filtran por campo,
        // así funciona aunque GESI cree o reemplace los campos después de cargar la página.
        let t = null;
        const schedule = () => {
            clearTimeout(t);
            t = setTimeout(tryAutofill, 2500);
        };
        ['blur', 'change', 'keyup'].forEach((ev) => {
            document.addEventListener(ev, (e) => {
                if (!e.target) return;
                if (e.target.id === IDS.cedula) schedule();
                // Cambiar el tipo de documento con la cédula ya escrita: volver a consultar
                else if (e.target.id === IDS.tipo_doc && ev === 'change') schedule();
                // Si la persona corrige el sexo a mano, el aviso ya no hace falta
                else if (e.target.id === IDS.sexo && ev === 'change' && !autocompletando) quitarAvisoSexo();
            }, true);
        });

    })(); // fin autocompletarPorCedula

})();
