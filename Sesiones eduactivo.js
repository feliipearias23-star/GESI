// ==UserScript==
// @name         SESIONES EDUCATIVO FULL NEW
// @namespace    https://gesiapps.saludcapital.gov.co/GESI_sistemas/GESI_Form*
// @version      1.3
// @description  Auto sesión, validador edad/doc, comprobador documentos, campos automáticos, validaciones nombres/doc/fechas
// @author       You
// @match        https://gesiapps.saludcapital.gov.co/GESI_sistemas/GESI_Form*
// @grant        none
// @run-at       document-end
// ==/UserScript==
(function () {
'use strict';
console.log('🚀 GESI Todo en Uno v1.3 — cargado');
const bgSuccess='rgba(50, 200, 150, 0.2)', $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);

// SCRIPT 1 — SESIONES EDUCATIVO
(function sesionesEducativo() {
  try { // BLOQUE 1: tipo de documento, sexo, género
    let tipo_doc=$('#valorControl17510'), sexo=$('#valorControl17512'), genero=$('#valorControl17513'), orientacion=$('#valorControl17514'), identidad_genero=$('#valorControl17515'), etnia=$('#valorControl17518'), pais=$('#valorControl17517'), pob_dif=$('#valorControl17520'), Pob_inclusion=$('#valorControl17521'), categoria_discapacidad=$('#valorControl17522'), etapa_gestacion=$('#valorControl17523'), canalizacion=$('#valorControl17527'), porquenosecanalizo=$('#valorControl17528'), ocupacion=$('#valorControl17524'), rol=$('#valorControl17525');
    let ultimoTipoDoc=tipo_doc?tipo_doc.value:'', ultimoSexo=sexo?sexo.value:'';
    const set=(el,v)=>{ if(el){el.value=v;el.style.backgroundColor=bgSuccess;} };
    const elems={etnia,pais,pob_dif,Pob_inclusion,categoria_discapacidad,etapa_gestacion,canalizacion,porquenosecanalizo,ocupacion,rol};
    const mapaDocA={etnia:'84',pais:'50',pob_dif:'2620',Pob_inclusion:'4048',categoria_discapacidad:'3822',etapa_gestacion:'3785',canalizacion:'959',porquenosecanalizo:'4130',ocupacion:'902',rol:'4127'};
    const mapaDocB={...mapaDocA,pais:'236',pob_dif:'4051'};
    const aplicarMapa=mapa=>{ for(const k in mapa) set(elems[k],mapa[k]); };
    setInterval(function(){
      if(!tipo_doc||!sexo) return;
      const docActual=tipo_doc.value, sexoActual=sexo.value;
      if(docActual!==ultimoTipoDoc){
        ultimoTipoDoc=docActual;
        const v=parseInt(docActual,10);
        if([59,60,61].includes(v)){ tipo_doc.style.backgroundColor=bgSuccess; aplicarMapa(mapaDocA); }
        if([62,63,64,65,66,2482].includes(v)) aplicarMapa(mapaDocB);
      }
      if(sexoActual!==ultimoSexo){
        ultimoSexo=sexoActual;
        if(tipo_doc.value==='59'){
          sexo.style.backgroundColor=bgSuccess;
          if(sexoActual==='67'){ set(genero,'70'); set(orientacion,'4024'); set(identidad_genero,'4515'); }
          else if(sexoActual==='68'){ set(genero,'71'); set(orientacion,'4024'); set(identidad_genero,'4514'); }
        } else if(sexoActual==='67'||sexoActual==='68'){
          sexo.style.backgroundColor=bgSuccess; set(genero,'4513'); set(orientacion,'4028'); set(identidad_genero,'4020');
        }
      }
    }, 500);
  } catch(error) { console.error(error); }

  try { // BLOQUE 2: sincronizar institución
    let nombreInstitucion=$('#valorControl17347'), daneColegio=$('#valorControl17348'), nombreSede=$('#valorControl17349'), daneSede=$('#valorControl17350'), barraFutbolera=$('#valorControl17354');
    const VALOR_BARRA_FUTBOLERA='4116';
    function aplicarSelect2(select,opt){ const span=document.getElementById('select2-'+select.id+'-container'); if(span){ span.textContent=opt.text; span.setAttribute('title',opt.text); } select.dispatchEvent(new Event('change',{bubbles:true})); select.style.backgroundColor=bgSuccess; }
    function setValorPorDane(select,dane){ if(!select||!dane) return; for(let opt of select.options) if(opt.text.trim().startsWith(dane)){ select.value=opt.value; aplicarSelect2(select,opt); return; } console.warn('❌ No se encontró DANE en:',select.id,dane); }
    function setValorDirecto(select,value){ if(!select||!value) return; const opt=select.querySelector('option[value="'+value+'"]'); if(!opt){ console.warn('❌ No se encontró value en:',select.id,value); return; } select.value=value; aplicarSelect2(select,opt); }
    if(barraFutbolera) setTimeout(()=>{ setValorDirecto(barraFutbolera,VALOR_BARRA_FUTBOLERA); console.log('⚽ Barra futbolera seleccionada:',VALOR_BARRA_FUTBOLERA); }, 1000);
    if(nombreInstitucion) setTimeout(()=>{
      const spanObservable=document.getElementById('select2-valorControl17347-container');
      if(!spanObservable) return;
      let ultimoValor='';
      new MutationObserver(()=>{
        const valActual=nombreInstitucion.value;
        if(valActual&&valActual!==''&&valActual!==ultimoValor){
          ultimoValor=valActual;
          const option=nombreInstitucion.options[nombreInstitucion.selectedIndex];
          const dane=(option?option.text:'').split('-')[0].trim();
          console.log('🎯 DANE detectado:',dane);
          if(dane){ setValorPorDane(daneColegio,dane); setValorPorDane(nombreSede,dane); setValorPorDane(daneSede,dane); }
          nombreInstitucion.style.backgroundColor=bgSuccess;
        }
      }).observe(spanObservable,{childList:true,subtree:true,characterData:true});
      console.log('👀 MutationObserver activo en institución');
    }, 1000);
  } catch(error) { console.error(error); }

  try { // BLOQUE 3: tamizajes
    let oms=$('#valorControl17534'), find=$('#valorControl17535'), frecuencia_cardiaca=$('#valorControl17536'), tension_arterial=$('#valorControl17537'), diezciciete=$('#valorControl17539'), dieziocho=$('#valorControl17540'), cuarenta=$('#valorControl17541'), ojo_derecho=$('#valorControl17543'), ojo_izquierdo=$('#valorControl17544'), oido_derecho=$('#valorControl17546'), oido_izquierdo=$('#valorControl17547'), intencion_reproductiva=$('#valorControl17549'), satisfaccion=$('#valorControl17550'), cuidado_menstrual=$('#valorControl17551'), mini_cog=$('#valorControl17552'), clasificacion_riesgo=$('#valorControl17553'), aplica_tamizaje=$('#valorControl17555'), escala_fies=$('#valorControl17559'), enfrentar_mejor=$('#valorControl17561'), mejorar_manejo=$('#valorControl17562'), tomar_mejores=$('#valorControl17563'), mi_bienestar=$('#valorControl17565');
    if(oms){
      const camposTamizaje=[[find,'4452'],[frecuencia_cardiaca,'4453'],[tension_arterial,'4454'],[diezciciete,'4185'],[dieziocho,'4232'],[cuarenta,'4253'],[ojo_derecho,'4191'],[ojo_izquierdo,'4191'],[oido_derecho,'4235'],[oido_izquierdo,'4235'],[intencion_reproductiva,'4457'],[satisfaccion,'4457'],[cuidado_menstrual,'4258'],[mini_cog,'4455'],[clasificacion_riesgo,'4456'],[aplica_tamizaje,'4258'],[escala_fies,'4272'],[enfrentar_mejor,'4458'],[mejorar_manejo,'4458'],[tomar_mejores,'4458'],[mi_bienestar,'4460']];
      const rellenarVacios=()=>camposTamizaje.forEach(([el,val])=>{ if(el&&el.value===''){ el.value=val; el.style.backgroundColor=bgSuccess; } });
      if(oms.value===''){ oms.value='4182'; oms.style.backgroundColor=bgSuccess; }
      rellenarVacios();
      oms.addEventListener('change',rellenarVacios);
    }
  } catch(error) { console.error(error); }
})(); // fin sesionesEducativo

(function autoSesion(){
  const camposSesion=[{id:'valorControl17387'},{id:'valorControl17408'},{id:'valorControl17428'},{id:'valorControl17448'}],
  IDS_SESION=['17387','17408','17428','17448'],
  mapaAsistencia={'1':'4307','2':'4422','3':'4424','4':'4426','5':'4428','6':'4430','7':'4432','8':'4434','9':'4462','10':'4464','11':'4466','12':'4468','13':'4470','14':'4472','15':'4474','16':'4476','17':'4478','18':'4480','19':'4482','20':'4484','21':'4486','22':'4488','23':'4490','24':'4492','25':'4494','26':'4496','27':'4498','28':'4500','29':'4502','30':'4504','31':'4836','32':'4838','33':'4840','34':'4842','35':'4844','36':'4846','37':'4848','38':'4850','39':'4852','40':'4854','41':'4856','42':'4858','43':'4860','44':'4862','45':'4864','46':'4866','47':'4868','48':'4870'},
  ID_LISTBOX_BASE='valorControl17526',
  KEY_HISTORIAL='auto_sesion_historial',
  KEY_CONSECUTIVO='auto_sesion_consecutivo',
  KEY_PUSO_SCRIPT='auto_sesion_puso_script',
  KEY_QUITADOS='auto_sesion_quitados',
  ID_EDAD='valorControl19845',
  ID_DOCUMENTO='valorControl17510',
  ID_BOTON_ACTUALIZAR='botonActualizarInformacion',
  reglasDocumento={'60':{nombre:'Registro Civil',edadMin:0,edadMax:6},'61':{nombre:'Tarjeta de Identidad',edadMin:7,edadMax:17},'59':{nombre:'Cédula de Ciudadanía',edadMin:18,edadMax:999}};

  function obtenerHistorial(){try{return JSON.parse(localStorage.getItem(KEY_HISTORIAL)||'[]')}catch(e){return[]}}
  function obtenerPuestoScript(){try{return JSON.parse(localStorage.getItem(KEY_PUSO_SCRIPT)||'[]')}catch(e){return[]}}
  function obtenerQuitados(){try{return JSON.parse(localStorage.getItem(KEY_QUITADOS)||'[]')}catch(e){return[]}}

  function guardarHistorial(sesionesNuevas){
    const combinado=[...new Set([...obtenerHistorial(),...sesionesNuevas])];
    combinado.sort((a,b)=>parseInt(a,10)-parseInt(b,10));
    localStorage.setItem(KEY_HISTORIAL,JSON.stringify(combinado));
    console.log('Sesiones guardadas al actualizar:',combinado);
  }

  function limpiarHistorial(){
    [KEY_HISTORIAL,KEY_CONSECUTIVO,KEY_PUSO_SCRIPT,KEY_QUITADOS]
      .forEach(k=>localStorage.removeItem(k));
  }

  function verificarFichaNueva(){
    const consecutivo=document.querySelector('[id*="Consecutivo"],[name*="consecutivo"],[id*="consecutivo"]');
    if(!consecutivo)return;
    const actual=(consecutivo.value||consecutivo.textContent||'').trim(),
    guardado=localStorage.getItem(KEY_CONSECUTIVO);
    if(guardado&&actual!==guardado)limpiarHistorial();
    if(actual)localStorage.setItem(KEY_CONSECUTIVO,actual);
  }

  function leerSesionesActuales(){
    const sesiones=[];
    camposSesion.forEach(({id})=>{
      const campo=document.getElementById(id);
      if(!campo)return;
      const valor=String(campo.value||'').trim();
      if(valor&&mapaAsistencia[valor]&&!sesiones.includes(valor))sesiones.push(valor);
    });

    document.querySelectorAll('input').forEach(input=>{
      const valor=String(input.value||'').trim(),
      esSesion=IDS_SESION.some(id=>input.id.includes(id));
      if(esSesion&&valor&&mapaAsistencia[valor]&&!sesiones.includes(valor))sesiones.push(valor);
    });

    sesiones.sort((a,b)=>parseInt(a,10)-parseInt(b,10));
    return sesiones;
  }

  function modoInstitucion(){
    verificarFichaNueva();

    const boton=document.getElementById(ID_BOTON_ACTUALIZAR);

    if(boton&&!boton.dataset.listenerSesiones){
      boton.dataset.listenerSesiones='1';
      boton.addEventListener('click',()=>{
        guardarHistorial(leerSesionesActuales());
      });
    }

    if(!boton)console.warn('No se encontró el botón de actualización:',ID_BOTON_ACTUALIZAR);

    const campos=[];

    camposSesion.forEach(({id})=>{
      const campo=document.getElementById(id);
      if(campo)campos.push(campo);
    });

    document.querySelectorAll('input').forEach(input=>{
      const esSesion=IDS_SESION.some(id=>input.id.includes(id));
      if(esSesion&&!campos.includes(input))campos.push(input);
    });

    campos.forEach(campo=>{
      ['input','change','keyup'].forEach(evento=>{
        campo.addEventListener(evento,()=>{
          console.log('Sesiones actuales, todavía sin guardar:',leerSesionesActuales());
        });
      });
    });
  }

  function modoPersonas(){
    const historial=obtenerHistorial();

    if(!historial.length){
      console.log('No hay sesiones guardadas para marcar.');
      iniciarValidador();
      return;
    }

    const valoresAMarcar=historial.map(s=>mapaAsistencia[String(s)]).filter(Boolean),
    puestoScript=obtenerPuestoScript(),
    quitados=obtenerQuitados();

    const listboxes=Array.from(document.querySelectorAll('select'))
      .filter(el=>el.id&&el.id.includes(ID_LISTBOX_BASE));

    console.log('Sesiones encontradas en el historial:',historial);
    console.log('Opciones que se deben marcar:',valoresAMarcar);

    listboxes.forEach(listbox=>{
      const yaSeleccionados=Array.from(listbox.options)
        .filter(op=>op.selected).map(op=>op.value);

      const noAsistioMarcados=Array.from(listbox.options)
        .filter(op=>op.selected&&op.text.includes('No asistió'))
        .map(op=>op.value);

      let huboCambio=false;

      listbox.querySelectorAll('option').forEach(op=>{
        if(yaSeleccionados.includes(op.value))op.selected=true;

        if(valoresAMarcar.includes(op.value)&&!yaSeleccionados.includes(op.value)){
          const sesion=op.text.match(/S(\d+)/i)?.[1];

          const existeNoAsistio=noAsistioMarcados.some(valor=>{
            const opNo=listbox.querySelector(`option[value="${valor}"]`);
            const sesionNo=opNo?.text.match(/S(\d+)/i)?.[1];
            return sesion&&sesionNo&&sesion===sesionNo;
          });

          if(!existeNoAsistio){
            op.selected=true;
            puestoScript.push(op.value);
            huboCambio=true;
          }
        }
      });

      if(huboCambio)listbox.dispatchEvent(new Event('change',{bubbles:true}));
    });

    iniciarValidador();
  }

  function iniciarValidador(){
    const camposEdad=document.querySelectorAll(`[id*="${ID_EDAD}"]`),
    camposDoc=document.querySelectorAll(`[id*="${ID_DOCUMENTO}"]`),
    total=Math.min(camposEdad.length,camposDoc.length),
    ultimosEdad=Array(total).fill(''),
    ultimosDoc=Array(total).fill('');

    setInterval(()=>{
      for(let i=0;i<total;i++){
        const edad=camposEdad[i],doc=camposDoc[i];
        if(!edad||!doc)continue;

        if(edad.value!==ultimosEdad[i]||doc.value!==ultimosDoc[i]){
          ultimosEdad[i]=edad.value;
          ultimosDoc[i]=doc.value;
          validar(edad,doc,i+1);
        }
      }
    },400);

    for(let i=0;i<total;i++)validar(camposEdad[i],camposDoc[i],i+1);
  }

  function validar(campoEdad,campoDoc,num){
    if(!campoEdad||!campoDoc)return;

    const edad=parseInt(campoEdad.value,10),
    documento=campoDoc.value;

    campoEdad.style.border=campoEdad.style.background='';
    campoDoc.style.border=campoDoc.style.background='';

    const anterior=campoEdad.parentNode.querySelector('.mensaje-validacion');
    if(anterior)anterior.remove();

    if(Number.isNaN(edad)||!documento||!reglasDocumento[documento])return;

    const regla=reglasDocumento[documento];

    if(edad<regla.edadMin||edad>regla.edadMax){
      let documentoCorrecto='Desconocido';

      for(const reglaActual of Object.values(reglasDocumento)){
        if(edad>=reglaActual.edadMin&&edad<=reglaActual.edadMax){
          documentoCorrecto=reglaActual.nombre;
          break;
        }
      }

      [campoEdad,campoDoc].forEach(c=>{
        c.style.border='2px solid red';
        c.style.background='#fff0f0';
      });

      if(!campoEdad.parentNode.querySelector('.mensaje-validacion')){
        const mensaje=document.createElement('div');
        mensaje.className='mensaje-validacion';
        mensaje.textContent=`Persona ${num}: con ${edad} años debe usar "${documentoCorrecto}".`;

        Object.assign(mensaje.style,{
          color:'#b30000',
          background:'#ffe6e6',
          padding:'6px',
          marginTop:'4px',
          border:'1px solid #ff9999',
          borderRadius:'4px',
          fontSize:'12px'
        });

        campoEdad.parentNode.appendChild(mensaje);
      }
    }
  }

  function detectarYEjecutar(){
    const enInstitucion=camposSesion.some(({id})=>document.getElementById(id)),
    tieneValidador=document.querySelector(`[id*="${ID_EDAD}"]`);

    if(enInstitucion)modoInstitucion();
    if(tieneValidador)setTimeout(modoPersonas,800);
  }

  if(document.readyState==='complete')detectarYEjecutar();
  else window.addEventListener('load',detectarYEjecutar);
})();
// SCRIPT 3 — COMPROBADOR DOCUMENTOS PERSONAS vs TAMIZAJES
(function comprobadorDocumentos() {
  const ID_DOC_PERSONAS='valorControl17511', ID_DOC_TAMIZAJES='valorControl17533', KEY_DOCS_PERSONAS='comprobador_docs_personas', KEY_CONSECUTIVO='comprobador_consecutivo';
  function mostrarAviso(doc){
    const previo=document.getElementById('comprobador-aviso');
    if(previo) previo.remove();
    const aviso=document.createElement('div');
    aviso.id='comprobador-aviso';
    aviso.style.cssText=`position:fixed;top:20px;right:20px;z-index:99999;background:#fff3cd;border:2px solid #e0a800;border-radius:8px;padding:16px 20px;max-width:360px;box-shadow:0 4px 12px rgba(0,0,0,0.2);font-family:Arial,sans-serif;font-size:13px;color:#333;`;
    aviso.innerHTML=`<div style="font-weight:bold;font-size:14px;margin-bottom:10px;color:#c8700e;">⚠️ Documento no coincide</div><div style="padding:8px;background:#fff;border-radius:4px;border-left:3px solid red;">El documento <strong><code>${doc}</code></strong> en Tamizajes<br><span style="color:red">no fue registrado en la pestaña Personas.</span></div><button id="comprobador-cerrar" style="margin-top:10px;width:100%;padding:6px;background:#e0a800;color:white;border:none;border-radius:4px;cursor:pointer;font-size:13px;">✖ Cerrar</button>`;
    document.body.appendChild(aviso);
    document.getElementById('comprobador-cerrar').addEventListener('click',()=>aviso.remove());
  }
  const obtenerDocs=()=>{ try { return JSON.parse(localStorage.getItem(KEY_DOCS_PERSONAS)||'[]'); } catch { return []; } };
  const guardarDocs=docs=>localStorage.setItem(KEY_DOCS_PERSONAS,JSON.stringify(docs));
  const limpiarStorage=()=>{ localStorage.removeItem(KEY_DOCS_PERSONAS); localStorage.removeItem(KEY_CONSECUTIVO); };
  function verificarFichaNueva(){
    const consecutivo=$('[id*="Consecutivo"], [name*="consecutivo"], [id*="consecutivo"]');
    if(!consecutivo) return;
    const valorActual=(consecutivo.value||consecutivo.textContent||'').trim(), valorGuardado=localStorage.getItem(KEY_CONSECUTIVO);
    if(valorGuardado&&valorActual!==valorGuardado) limpiarStorage();
    if(valorActual) localStorage.setItem(KEY_CONSECUTIVO,valorActual);
  }
  function modoPersonas(){
    verificarFichaNueva();
    const campo=document.getElementById(ID_DOC_PERSONAS);
    if(!campo) return;
    function acumular(){ const val=campo.value.trim(); if(val==='') return; const acumulado=new Set(obtenerDocs()); acumulado.add(val); guardarDocs(Array.from(acumulado)); }
    acumular();
    ['input','change','blur'].forEach(ev=>campo.addEventListener(ev,acumular));
  }
  function modoTamizajes(){
    const campo=document.getElementById(ID_DOC_TAMIZAJES);
    if(!campo) return;
    const valorAlCargar=campo.value.trim();
    function verificarDoc(){
      const doc=campo.value.trim();
      if(doc==='') return;
      const docs=obtenerDocs();
      if(docs.length===0) return;
      campo.style.border=campo.style.background='';
      const previo=document.getElementById('comprobador-aviso');
      if(previo) previo.remove();
      if(!docs.includes(doc)){ campo.style.border='2px solid red'; campo.style.background='#fff0f0'; mostrarAviso(doc); }
    }
    if(valorAlCargar==='') setTimeout(verificarDoc,1200);
    let timer=null;
    ['input','change','blur'].forEach(ev=>campo.addEventListener(ev,()=>{ if(campo.value.trim()!==valorAlCargar){ clearTimeout(timer); timer=setTimeout(verificarDoc,1500); } }));
  }
  function detectarYEjecutar(){ if(document.getElementById(ID_DOC_PERSONAS)) modoPersonas(); if(document.getElementById(ID_DOC_TAMIZAJES)) modoTamizajes(); }
  if(document.readyState==='complete') detectarYEjecutar(); else window.addEventListener('load',detectarYEjecutar);
})(); // fin comprobadorDocumentos

// SCRIPT 4 — VALIDACIONES: NOMBRES, DOCUMENTO (6-11), FECHA INTERVENCIÓN
(function addValidations() {
  const NAME_SELECTORS=['#valorControl17508','#valorControl17509'];
  const DOC_SELECTOR='#valorControl17511';
  const SESSION1_DATE_SELECTOR='#valorControl17386';
  const INTERVENTION_DATE_SELECTOR='#FechaIntervencion';
  const nameSanitizeRegex=/[^\p{L}\s'-]/gu;

  function attachNameFilters(selector){
    Array.from($$(selector)).forEach(input=>{
      if(!input) return;
      input.addEventListener('input',()=>{
        const old=input.value, cleaned=old.replace(nameSanitizeRegex,'');
        if(old!==cleaned){
          input.value=cleaned; input.style.border='2px solid #e6a0a0'; input.style.background='#fff5f5';
          clearTimeout(input._nameValidTimer);
          input._nameValidTimer=setTimeout(()=>{ input.style.border=''; input.style.background=''; },1200);
        }
      });
      input.addEventListener('keypress',ev=>{
        const ch=ev.key;
        if(ev.ctrlKey||ev.metaKey||ev.altKey) return;
        if(ch.length===1&&!ch.match(/[\p{L}\s'-]/u)) ev.preventDefault();
      });
      input.addEventListener('paste',ev=>{
        ev.preventDefault();
        const text=(ev.clipboardData||window.clipboardData).getData('text')||'', cleaned=text.replace(nameSanitizeRegex,'');
        input.setRangeText(cleaned,input.selectionStart||0,input.selectionEnd||0,'end');
        input.dispatchEvent(new Event('input',{bubbles:true}));
      });
    });
  }

  function attachDocFilter(selector){
    const input=$(selector);
    if(!input) return;
    input.addEventListener('input',()=>{
      const old=input.value, cleaned=old.replace(/[^\p{L}\p{N}]/gu,'');
      if(old!==cleaned) input.value=cleaned;
      input.style.border=''; input.style.background='';
      const prev=input.parentNode?input.parentNode.querySelector('.mensaje-doc'):null;
      if(prev) prev.remove();
    });
    input.addEventListener('paste',ev=>{
      ev.preventDefault();
      const text=(ev.clipboardData||window.clipboardData).getData('text')||'', cleaned=text.replace(/[^\p{L}\p{N}]/gu,'');
      input.setRangeText(cleaned,input.selectionStart||0,input.selectionEnd||0,'end');
      input.dispatchEvent(new Event('input',{bubbles:true}));
    });
    input.addEventListener('blur',()=>{
      const val=(input.value||'').trim(), min=6, max=11;
      const prev=input.parentNode?input.parentNode.querySelector('.mensaje-doc'):null;
      if(prev) prev.remove();
      if(val.length===0) return;
      if(val.length<min||val.length>max){
        input.style.border='2px solid red'; input.style.background='#fff0f0';
        const div=document.createElement('div');
        div.className='mensaje-doc';
        div.textContent=`⚠ El documento debe tener entre ${min} y ${max} caracteres (actual: ${val.length}).`;
        Object.assign(div.style,{color:'#b30000',background:'#ffe6e6',padding:'6px',marginTop:'4px',border:'1px solid #ff9999',borderRadius:'4px',fontSize:'12px'});
        if(input.parentNode) input.parentNode.appendChild(div);
      }
    });
  }

function validateSessionDateMatchesIntervention(
  interventionSel,
  sessionDateSel,
  sessionNumberSel
) {
  const FLAG = '__gesi_fecha_sesion_validada__';
  if (window[FLAG]) return;

  const value = el => String(
    el?.value ||
    el?.getAttribute?.('value') ||
    ''
  ).trim();

  const normalize = date => {
    date = String(date || '').trim().split('T')[0];

    let m = date.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);

    return m
      ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
      : date;
  };

  const timer = setInterval(() => {
    const intervention = document.querySelector(interventionSel);
    const sessionDate = document.querySelector(sessionDateSel);
    const sessionNumber = document.querySelector(sessionNumberSel);

    if (!intervention || !sessionDate || !sessionNumber) return;

    const number = value(sessionNumber).match(/\d+/);
    if (!number) return;

    if (parseInt(number[0], 10) !== 1) {
      window[FLAG] = true;
      clearInterval(timer);
      return;
    }

    const interventionValue = value(intervention);
    const sessionValue = value(sessionDate);

    if (!interventionValue || !sessionValue) return;

    window[FLAG] = true;
    clearInterval(timer);

    if (
      normalize(interventionValue) ===
      normalize(sessionValue)
    ) {
      return;
    }

    alert(
      'La fecha de la sesión 1 (' +
      sessionValue +
      ') no coincide con la fecha de intervención (' +
      interventionValue +
      ').'
    );
  }, 200);
}
  function start() {
  NAME_SELECTORS.forEach((selector) => {
    attachNameFilters(selector);
  });

  attachDocFilter(DOC_SELECTOR);

  validateSessionDateMatchesIntervention(
    '#FechaIntervencion',
    '#valorControl17386',
    '#valorControl17387'
  );
}
  if(document.readyState==='complete') start(); else window.addEventListener('load',start);
})(); // fin addValidations
})();