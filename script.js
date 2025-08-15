const DEFAULT_USERS = {
  'usuario1': '1234',
  'empleado': 'password',
  'admin': 'admin123'
};

let usuarios = JSON.parse(localStorage.getItem("usuarios")) || DEFAULT_USERS;
localStorage.setItem("usuarios", JSON.stringify(usuarios));
let usuarioActual = localStorage.getItem('currentUser') || null;

function guardarUsuarios() { localStorage.setItem("usuarios", JSON.stringify(usuarios)); }
function escapeHtml(unsafe) {
  if (unsafe === null || unsafe === undefined) return '';
  return String(unsafe)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

document.addEventListener('DOMContentLoaded', () => {
  if (usuarioActual) { mostrarApp(); } else { mostrarLogin(); }
});

// ===== Autenticación =====
function login() {
  const user = document.getElementById("username").value.trim();
  const pass = document.getElementById("password").value;
  if (!user || !pass) { alert("Por favor ingresa usuario y contraseña."); return; }

  if (usuarios[user] && usuarios[user] === pass) {
    usuarioActual = user;
    localStorage.setItem('currentUser', usuarioActual);
    mostrarApp();
    alert(`¡Bienvenido, ${usuarioActual}!`);
  } else { alert("Usuario o contraseña incorrectos."); }
}

function logout() {
  if (confirm("¿Cerrar sesión?")) {
    usuarioActual = null;
    localStorage.removeItem('currentUser');
    limpiarCamposAutenticacion();
    mostrarLogin();
    limpiarCamposFormulario();
    limpiarHistorialUI();
  }
}

function mostrarApp() {
  document.getElementById("loginForm").classList.remove("active");
  document.getElementById("registerForm").classList.remove("active");
  document.getElementById("mainContent").classList.add("active");

  const fechaInput = document.getElementById("fechaRegistro");
  const hoy = new Date().toISOString().split("T")[0];
  if (fechaInput && !fechaInput.value) fechaInput.value = hoy;

  cargarNumerosVehiculo();
  obtenerDireccion();
  mostrarHistorial();

  const adminLinks = document.getElementById("adminLinks");
  if (adminLinks) adminLinks.style.display = (usuarioActual === 'admin') ? "flex" : "none";
}

function mostrarLogin() {
  document.getElementById("loginForm").classList.add("active");
  document.getElementById("registerForm").classList.remove("active");
  document.getElementById("mainContent").classList.remove("active");
}

function mostrarRegistro() {
  document.getElementById("registerForm").classList.add("active");
  document.getElementById("loginForm").classList.remove("active");
  document.getElementById("mainContent").classList.remove("active");
}

function registrarUsuario() {
  const user = document.getElementById("newUsername").value.trim();
  const pass = document.getElementById("newPassword").value;
  if (!user || !pass) { alert("Por favor ingresa un usuario y contraseña."); return; }
  if (usuarios[user]) { alert("El usuario ya existe."); return; }
  usuarios[user] = pass;
  guardarUsuarios();
  alert("Usuario registrado con éxito. Ahora puedes iniciar sesión.");
  mostrarLogin();
  limpiarCamposRegistro();
}

// ===== Formularios y datos =====
function cargarNumerosVehiculo() {
  const tipo = document.getElementById("tipoVehiculo").value;
  const numeroVehiculo = document.getElementById("numeroVehiculo");

  // Limpiar select
  numeroVehiculo.innerHTML = "<option value=''>Seleccione un tipo primero</option>";

  if (!tipo) return; // salir si no hay tipo seleccionado

  const maxVehiculos = 100; // 100 unidades por tipo

  for (let i = 1; i <= maxVehiculos; i++) {
    let opcion = document.createElement("option");
    opcion.value = `${tipo} ${i}`;
    opcion.text = `${tipo} ${i}`;
    numeroVehiculo.appendChild(opcion);
  }
}


function obtenerDireccion() {
  const direccionInput = document.getElementById("direccion");
  if (!direccionInput) return;
  direccionInput.value = "Obteniendo ubicación...";
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        let lat = position.coords.latitude;
        let lon = position.coords.longitude;
        fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`)
          .then(resp => resp.json())
          .then(data => { direccionInput.value = data?.display_name || "No se pudo obtener la dirección."; })
          .catch(() => { direccionInput.value = "Error obteniendo dirección."; });
      },
      (err) => {
        const errorMsg = {1:"Ubicación no permitida por el usuario.",2:"No se pudo determinar la ubicación.",3:"Tiempo de espera agotado."}[err.code] || "Error de geolocalización desconocido.";
        direccionInput.value = errorMsg;
      },
      { enableHighAccuracy: false, timeout: 8000 }
    );
  } else { direccionInput.value = "Geolocalización no soportada por el navegador."; }
}

function calcularTiempoTrabajo(entrada, salida) {
  if (!entrada || !salida) return null;
  const [hE, mE] = entrada.split(':').map(Number);
  const [hS, mS] = salida.split(':').map(Number);
  let inicio = new Date(2000,0,1,hE,mE), fin = new Date(2000,0,1,hS,mS);
  if (fin < inicio) fin.setDate(fin.getDate()+1);
  let diffMin = Math.round((fin-inicio)/60000);
  if (diffMin>360) diffMin -= 30;
  diffMin = Math.max(0,diffMin);
  return { horas: Math.floor(diffMin/60), minutos: diffMin%60, formato:`${Math.floor(diffMin/60)}h ${diffMin%60}m`, minutosTotales: diffMin };
}

function guardarDia() {
  if (!usuarioActual) { alert("Debes iniciar sesión para guardar un registro."); return; }
  const resultado = document.getElementById("resultado");
  const fechaRegistro = document.getElementById("fechaRegistro").value;
  const horaEntrada = document.getElementById("horaEntrada").value;
  const horaSalida = document.getElementById("horaSalida").value;
  if (!fechaRegistro || !horaEntrada || !horaSalida) { resultado.innerHTML = "⚠️ Ingresa todos los datos requeridos (fecha, entrada, salida)."; return; }

  const tiempo = calcularTiempoTrabajo(horaEntrada,horaSalida);
  if (tiempo===null || tiempo.minutosTotales<=0) { resultado.innerHTML="⚠️ No se pudo calcular el tiempo trabajado o la hora de salida es inválida."; return; }

  const dia = {
    fecha: fechaRegistro, horaEntrada, horaSalida, tiempoTrabajo: tiempo.formato,
    minutosTrabajados: tiempo.minutosTotales,
    direccion: document.getElementById("direccion").value || "No especificado",
    orden: document.getElementById("orden").value.trim() || "No especificado",
    vehiculo: document.getElementById("numeroVehiculo").value || "No especificado",
    personal: document.getElementById("personal").value.trim() || "No especificado",
    tipoVehiculo: document.getElementById("tipoVehiculo").value || "No especificado",
    createdAt: new Date().toISOString()
  };

  const key = `historial_${usuarioActual}`;
  let historial = JSON.parse(localStorage.getItem(key)) || [];
  historial.push(dia);
  localStorage.setItem(key, JSON.stringify(historial));

  mostrarResultado(dia);
  mostrarHistorial();
  limpiarCamposFormulario();
}

function mostrarResultado(dia) {
  const resultado = document.getElementById("resultado");
  resultado.innerHTML = `
    <p>✅ ¡Registro guardado con éxito!</p>
    <strong>Fecha:</strong> ${escapeHtml(dia.fecha)} <br>
    <strong>Entrada:</strong> ${escapeHtml(dia.horaEntrada)} - <strong>Salida:</strong> ${escapeHtml(dia.horaSalida)} <br>
    <strong>Tiempo trabajado:</strong> ${escapeHtml(dia.tiempoTrabajo)} <br>
    <strong>Dirección:</strong> ${escapeHtml(dia.direccion)} <br>
    <strong>Vehículo:</strong> ${escapeHtml(dia.vehiculo)} <br>
    <strong>Orden de trabajo:</strong> ${escapeHtml(dia.orden)} <br>
    <strong>Personal:</strong> ${escapeHtml(dia.personal)}
  `;
}

// ===== Limpiar campos =====
function limpiarCamposAutenticacion() { document.getElementById("username").value=""; document.getElementById("password").value=""; }
function limpiarCamposRegistro() { document.getElementById("newUsername").value=""; document.getElementById("newPassword").value=""; }
function limpiarCamposFormulario() {
  ["orden","personal","tipoVehiculo","numeroVehiculo","horaEntrada","horaSalida","direccion"].forEach(id=>{
    const el=document.getElementById(id);
    if(el) { if(id==="numeroVehiculo"){el.innerHTML='<option value="">Seleccione un tipo primero</option>'}else{el.value=""} }
  });
}
function limpiarHistorialUI() {
  ["resultado","tabButtons","tabContents","resumenSemanal"].forEach(id=>{const el=document.getElementById(id); if(el) el.innerHTML="";});
}

// ===== Historial =====
function mostrarHistorial() {
  if(!usuarioActual) return;
  const historial = JSON.parse(localStorage.getItem(`historial_${usuarioActual}`)) || [];
  const tabButtons = document.getElementById("tabButtons");
  const tabContents = document.getElementById("tabContents");
  const resumenSemanal = document.getElementById("resumenSemanal");
  if(!tabButtons || !tabContents || !resumenSemanal) return;

  tabButtons.innerHTML=""; tabContents.innerHTML=""; resumenSemanal.innerHTML="";

  const baseDateStr = document.getElementById("fechaRegistro").value;
  if(!baseDateStr){ tabContents.innerHTML="<em>Seleccione una fecha válida.</em>"; return; }
  const baseDate = new Date(baseDateStr+'T00:00:00');
  const startOfWeek = new Date(baseDate); startOfWeek.setDate(baseDate.getDate() - baseDate.getDay());

  let totalMinutosSemana = 0;
  let activeTabSet=false;

  for(let i=0;i<7;i++){
    const dia=new Date(startOfWeek); dia.setDate(startOfWeek.getDate()+i);
    const diaStr=dia.toISOString().split('T')[0];
    const registrosDia=historial.filter(d=>d.fecha===diaStr);
    registrosDia.forEach(r=>totalMinutosSemana+=Number(r.minutosTrabajados||0));

    const btn=document.createElement("button");
    btn.textContent=dia.toLocaleDateString('es-ES',{weekday:'short',day:'numeric',month:'short'}).toUpperCase();
    btn.type="button";
    btn.onclick=()=>{Array.from(tabButtons.children).forEach(b=>b.classList.remove("active")); btn.classList.add("active"); renderRegistrosDia(registrosDia,tabContents);}
    tabButtons.appendChild(btn);

    if(!activeTabSet && diaStr===baseDateStr){ btn.click(); activeTabSet=true; }
  }

  if(!activeTabSet && tabButtons.children.length>0){ tabButtons.children[0].click(); }

  const horas=Math.floor(totalMinutosSemana/60); const minutos=totalMinutosSemana%60;
  resumenSemanal.textContent=`Total semanal: ${horas}h ${minutos}m`;
}

function renderRegistrosDia(registros,contenedor){
  contenedor.innerHTML="";
  if(!registros.length){ contenedor.innerHTML="<em>No hay registros para este día.</em>"; return; }
  registros.forEach(r=>{
    const div=document.createElement("div");
    div.className="history-item";
    div.innerHTML=`${escapeHtml(r.horaEntrada)}-${escapeHtml(r.horaSalida)} | ${escapeHtml(r.tiempoTrabajo)} | ${escapeHtml(r.orden)} | ${escapeHtml(r.vehiculo)} | ${escapeHtml(r.personal)}`;
    contenedor.appendChild(div);
  });
}

// ===== Compartir historial =====
function compartirHistorial() {
  if (!usuarioActual) { alert("Debes iniciar sesión para compartir el historial."); return; }

  const fechaBase = document.getElementById("fechaRegistro").value;
  const historial = JSON.parse(localStorage.getItem(`historial_${usuarioActual}`)) || [];

  const registrosDia = historial.filter(d => d.fecha === fechaBase);

  const baseDate = new Date(fechaBase + 'T00:00:00');
  const startOfWeek = new Date(baseDate); startOfWeek.setDate(baseDate.getDate() - baseDate.getDay());
  const endOfWeek = new Date(startOfWeek); endOfWeek.setDate(startOfWeek.getDate() + 6);

  let texto = `Historial de ${usuarioActual}\n\n`;
  texto += `-- Día: ${fechaBase} --\n`;
  if (registrosDia.length === 0) texto += "No hay registros.\n";
  registrosDia.forEach(r => texto += `${r.horaEntrada}-${r.horaSalida} | ${r.tiempoTrabajo} | ${r.orden} | ${r.vehiculo} | ${r.personal}\n`);

  texto += `\n-- Semana (${startOfWeek.toLocaleDateString()} - ${endOfWeek.toLocaleDateString()}) --\n`;
  const registrosSemana = historial.filter(d => {
    const dia = new Date(d.fecha + 'T00:00:00');
    return dia >= startOfWeek && dia <= endOfWeek;
  });
  if (registrosSemana.length === 0) texto += "No hay registros.\n";
  registrosSemana.forEach(r => texto += `${r.fecha} ${r.horaEntrada}-${r.horaSalida} | ${r.tiempoTrabajo} | ${r.orden} | ${r.vehiculo} | ${r.personal}\n`);

  window._textoCompartir = texto;
  document.getElementById("shareModal").style.display = "flex";
}

function cerrarModal() { document.getElementById("shareModal").style.display = "none"; }

function shareVia(opcion) {
  const texto = window._textoCompartir || '';
  switch(opcion) {
    case 'whatsapp':
      window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank");
      break;
    case 'email':
      window.location.href = `mailto:?subject=${encodeURIComponent('Historial de '+usuarioActual)}&body=${encodeURIComponent(texto)}`;
      break;
    case 'sms':
      window.location.href = `sms:?body=${encodeURIComponent(texto)}`;
      break;
    case 'clipboard':
      navigator.clipboard.writeText(texto)
        .then(() => alert("Historial copiado al portapapeles."))
        .catch(() => alert("No se pudo copiar."));
      break;
  }
  cerrarModal();
}

// ===== Admin =====
function verUsuarios(){ alert("Funcionalidad de ver usuarios (admin)."); }
function verRegistros(){ alert("Funcionalidad de ver registros de todos (admin)."); }
