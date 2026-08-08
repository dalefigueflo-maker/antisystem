// ==========================================
// 1. CONFIGURACIÓN Y VARIABLES GLOBALES
// ==========================================
const CLAVE_DIRECTOR = "ADMINISTRADOR";
const niveles = ["1º Primaria", "2º Primaria", "3º Primaria", "4º Primaria", "5º Primaria", "6º Primaria", "1º Secundaria", "2º Secundaria", "3º Secundaria", "4º Secundaria", "5º Secundaria", "6º Secundaria"];
const paralelos = ["A", "B", "C"];

// LISTA DE MATERIAS OFICIAL
const materias = ["ARTESPLASTICAS", "BIOLOGIA", "COMPUTACION", "FILOSOFIA", "FISICA", "GEOGRAFIA", "HISTORIA", "INGLES", "LENGUAJE", "LITERATURA", "MATEMATICAS", "ORIENTACION", "PSICOLOGIA", "QUIMICA", "SOCIALES", "CIENCIAS NATURALES"];

let usuarioActual = null;
let mostrandotodoAlumno = false;

// ==========================================
// 2. REGISTRO Y LOGIN (CONECTADO A FIREBASE)
// ==========================================

function abrirRegistro(rol) {
    const box = document.getElementById('modal-dinamico');
    let h = `<h2>REGISTRAR ${rol}</h2><input type="password" id="k_dir" placeholder="CLAVE DIRECTOR" class="input-field">`;

    if (rol === 'DOCENTE') {
        h += `<input type="text" id="r_u" placeholder="Usuario de Acceso" class="input-field">
              <select id="r_m" class="input-field"><option value="">MATERIA</option>${materias.map(m => `<option value="${m}">${m}</option>`).join('')}</select>`;
    } else {
        h += `<input type="text" id="r_n" placeholder="Nombre Completo" class="input-field">
              <select id="r_g" class="input-field"><option value="">GRADO</option>${niveles.map(n => `<option value="${n}">${n}</option>`).join('')}</select>
              <select id="r_p" class="input-field"><option value="">PARALELO</option>${paralelos.map(p => `<option value="${p}">${p}</option>`).join('')}</select>`;
    }

    h += `<input type="password" id="r_pass" placeholder="Password" class="input-field">
          <button class="btn-main" onclick="guardarNuevo('${rol}')">GUARDAR EN LA NUBE</button>
          <button onclick="cerrarModal()">VOLVER</button>`;

    box.innerHTML = h;
    document.getElementById('modal-overlay').classList.remove('modal-hidden');
}

async function guardarNuevo(rol) {
    if (document.getElementById('k_dir').value !== CLAVE_DIRECTOR) return alert("Clave Errónea");
    const pass = document.getElementById('r_pass').value;

    try {
        if (rol === 'DOCENTE') {
            const user = document.getElementById('r_u').value;
            const mat = document.getElementById('r_m').value;
            await db.collection("docentes").doc(user).set({ user, pass, nombre: user, materia: mat });
            alert("Docente registrado en la nube.");
        } else {
            const nom = document.getElementById('r_n').value;
            const g = document.getElementById('r_g').value;
            const p = document.getElementById('r_p').value;
            const cod = Math.floor(1000 + Math.random() * 9000).toString();
            await db.collection("alumnos").doc(cod).set({ nombre: nom, user: cod, pass, grado: g, paralelo: p });
            alert("Alumno registrado. CÓDIGO: " + cod);
        }
        cerrarModal();
    } catch (e) { alert("Error al guardar: " + e); }
}

function abrirModal(rol) {
    document.getElementById('modal-dinamico').innerHTML = `
        <h2>ACCESO ${rol}</h2>
        <input type="text" id="u_login" placeholder="Usuario / Código" class="input-field">
        <input type="password" id="p_login" placeholder="Contraseña" class="input-field">
        <button class="btn-main" onclick="validar('${rol}')">ENTRAR</button>
        <button onclick="cerrarModal()">Cerrar</button>`;
    document.getElementById('modal-overlay').classList.remove('modal-hidden');
}

async function validar(rol) {
    const u = document.getElementById('u_login').value;
    const p = document.getElementById('p_login').value;
    const coleccion = (rol === 'DOCENTE') ? "docentes" : "alumnos";

    try {
        const doc = await db.collection(coleccion).doc(u).get();
        if (doc.exists && doc.data().pass === p) {
            usuarioActual = doc.data();
            cerrarModal();
            document.getElementById('user-display').innerText = usuarioActual.nombre;
            document.getElementById('btn-logout').style.display = "block";
            (rol === 'DOCENTE') ? vistaSelectorDocente() : cargarAlumno();
        } else { alert("Datos incorrectos"); }
    } catch (e) { alert("Error de conexión"); }
}

// ==========================================
// 3. VISTA DOCENTE (NOTAS Y TRABAJOS)
// ==========================================

function vistaSelectorDocente() {
    document.getElementById('main-content').innerHTML = `
        <div class="selector-bar">
            <strong>${usuarioActual.materia}</strong>
            <select id="sel_g" class="input-field" style="width:140px"><option value="">GRADO</option>${niveles.map(n => `<option value="${n}">${n}</option>`).join('')}</select>
            <select id="sel_p" class="input-field" style="width:100px"><option value="">PARALELO</option>${paralelos.map(p => `<option value="${p}">${p}</option>`).join('')}</select>
            <button class="btn-main" style="width:70px; padding:5px" onclick="abrirPanelNavegacion()">VER</button>
        </div>
        <div id="pizarra"></div>`;
}

function abrirPanelNavegacion() {
    usuarioActual.cursoTemp = document.getElementById('sel_g').value;
    usuarioActual.paraleloTemp = document.getElementById('sel_p').value;
    if (!usuarioActual.cursoTemp || !usuarioActual.paraleloTemp) return alert("Seleccione curso");

    document.getElementById('pizarra').innerHTML = `
        <div style="display:flex; gap:10px; justify-content:center; margin-bottom:20px;">
            <button class="btn-main" style="width:150px" onclick="verSeccionNotas()">NOTAS</button>
            <button class="btn-main" style="width:150px" onclick="verSeccionTrabajos()">TRABAJOS</button>
            <button class="btn-main" style="width:150px" onclick="verSeccionExamenDocente()">EXÁMENES</button>
        </div>
        <div id="contenedor-seccion"></div>`;
    verSeccionNotas();
}

// Variable global para controlar el estado de la tabla (ponla al inicio de tu archivo o arriba de la función)
// Asegúrate de tener esta variable global arriba de la función
let mostrarTodosLosAlumnos = false;

async function verSeccionNotas() {
    const mat = usuarioActual.materia;
    const snapshot = await db.collection("alumnos")
        .where("grado", "==", usuarioActual.cursoTemp)
        .where("paralelo", "==", usuarioActual.paraleloTemp).get();

    let listaAlumnos = [];
    snapshot.forEach(doc => { listaAlumnos.push(doc.data()); });

    listaAlumnos.sort((a, b) => {
        if (!a.nombre) return 1;
        if (!b.nombre) return -1;
        return a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' });
    });

    // Filtro para mostrar solo 5 alumnos o todos
    const alumnosAFiltrar = mostrarTodosLosAlumnos ? listaAlumnos : listaAlumnos.slice(0, 8);

    let h = `<h3>Registro: ${usuarioActual.cursoTemp} "${usuarioActual.paraleloTemp}"</h3><table>
        <tr><th>ALUMNO</th><th>H(40)</th><th>S(45)</th><th>S(10)</th><th>A(5)</th><th>TOTAL</th></tr>`;

    alumnosAFiltrar.forEach(alu => {
        const n = (alu.calificaciones && alu.calificaciones[mat]) ? alu.calificaciones[mat] : { h: 0, s: 0, r: 0, a: 0 };

        const nH = parseInt(n.h) || 0;
        const nS = parseInt(n.s) || 0;
        const nR = parseInt(n.r) || 0;
        const nA = parseInt(n.a) || 0;
        const tot = nH + nS + nR + nA;

        h += `<tr id="fila-${alu.user}">
            <td>${alu.nombre}</td>
            <td><input type="number" class="nota-h" min="0" max="40" value="${nH}" oninput="recalcularTotalFila('${alu.user}', 40, this)" onchange="actNota('${alu.user}','h',this.value)" style="width:50px"></td>
            <td><input type="number" class="nota-s" min="0" max="45" value="${nS}" oninput="recalcularTotalFila('${alu.user}', 45, this)" onchange="actNota('${alu.user}','s',this.value)" style="width:50px"></td>
            <td><input type="number" class="nota-r" min="0" max="10" value="${nR}" oninput="recalcularTotalFila('${alu.user}', 10, this)" onchange="actNota('${alu.user}','r',this.value)" style="width:50px"></td>
            <td><input type="number" class="nota-a" min="0" max="5" value="${nA}" oninput="recalcularTotalFila('${alu.user}', 5, this)" onchange="actNota('${alu.user}','a',this.value)" style="width:50px"></td>
            <td><b class="total-alumno" style="color: #000000; font-size: 16px;">${tot}</b></td>
        </tr>`;
    });
    h += `</table>`;

    // --- AQUÍ ESTÁ TU BOTÓN CON LA CLASE btn-main ---
    if (listaAlumnos.length > 5) {
        const textoBoton = mostrarTodosLosAlumnos ? "Mostrar menos" : `Mostrar más`;
        h += `<button onclick="toggleMostrarAlumnos()" class="btn-main" style="margin-top: 15px; width: 100%;">
            ${textoBoton}
        </button>`;
    }

    document.getElementById('contenedor-seccion').innerHTML = h;
}

function toggleMostrarAlumnos() {
    mostrarTodosLosAlumnos = !mostrarTodosLosAlumnos;
    verSeccionNotas();
}

// Función encargada de hacer el cambio de estado (igual a la que usaste en la boleta)
function toggleMostrarAlumnos() {
    mostrarTodosLosAlumnos = !mostrarTodosLosAlumnos;
    verSeccionNotas(); // Volvemos a pintar la sección con el nuevo límite aplicado
}

async function verSeccionTrabajos() {
    const mat = usuarioActual.materia;
    const snapshot = await db.collection("trabajos")
        .where("materia", "==", mat)
        .where("grado", "==", usuarioActual.cursoTemp)
        .where("paralelo", "==", usuarioActual.paraleloTemp).get();

    // 1. PASAMOS LOS TRABAJOS A UN ARREGLO COMÚN
    let listaTrabajos = [];
    snapshot.forEach(doc => {
        listaTrabajos.push(doc.data());
    });

    // 2. ORDENAMOS TAMBIÉN LOS TRABAJOS POR NOMBRE DEL ALUMNO (A-Z)
    listaTrabajos.sort((a, b) => {
        if (!a.alumno) return 1;
        if (!b.alumno) return -1;
        return a.alumno.localeCompare(b.alumno, 'es', { sensitivity: 'base' });
    });

    let h = `<h3>Trabajos Recibidos</h3><table><tr><th>ALUMNO</th><th>ARCHIVO</th><th>FECHA</th></tr>`;
    if (listaTrabajos.length === 0) {
        h += `<tr><td colspan="3">Sin entregas.</td></tr>`;
    } else {
        listaTrabajos.forEach(t => {
            if (t.contenido) {
                h += `<tr>
                    <td>${t.alumno}</td>
                    <td>
                        <a href="${t.contenido}" download="${t.archivo}" style="display: inline-block; background: #1a1a1a; color: white; padding: 8px 15px; text-decoration: none; border-radius: 8px; font-size: 13px; font-weight: bold; cursor: pointer;">
                            ${t.archivo}
                        </a>
                    </td>
                    <td>${t.fecha}</td>
                </tr>`;
            } else {
                h += `<tr>
                    <td>${t.alumno}</td>
                    <td>
                        <button onclick="alert('Este trabajo no tiene contenido guardado.')" style="background: #ccc; border: 1px solid #999; color: #333; padding: 8px 15px; border-radius: 8px; font-size: 13px; cursor: not-allowed;">
                            📥 ${t.archivo} (Sin contenido)
                        </button>
                    </td>
                    <td>${t.fecha}</td>
                </tr>`;
            }
        });
    }
    h += `</table>`;
    document.getElementById('contenedor-seccion').innerHTML = h;
}

async function actNota(cod, dim, val) {
    const mat = usuarioActual.materia;
    const ref = db.collection("alumnos").doc(cod);
    const doc = await ref.get();

    let califs = doc.data().calificaciones || {};
    if (!califs[mat]) califs[mat] = { h: 0, s: 0, r: 0, a: 0 };

    // Convertimos la nota a número entero puro
    let notaNum = parseInt(val) || 0;

    // Doble verificación de seguridad según la columna modificada
    if (dim === 'h' && notaNum > 40) notaNum = 40;
    if (dim === 's' && notaNum > 45) notaNum = 45;
    if (dim === 'r' && notaNum > 10) notaNum = 10;
    if (dim === 'a' && notaNum > 5) notaNum = 5;
    if (notaNum < 0) notaNum = 0;

    califs[mat][dim] = notaNum;

    // Guardamos en Firebase
    await ref.update({ calificaciones: califs });

    // Forzamos a la pantalla a redibujarse para recalcular la suma del total al instante
    verSeccionNotas();
}

async function verSeccionExamenDocente() {
    const contenedor = document.getElementById('contenedor-seccion');

    contenedor.innerHTML = `
        <div class="tarjeta-blanca">
            <h2>Publicar Examen</h2>
            <div class="campo" id="espacio-subida">
                <input type="file" id="archivo-examen" accept=".html">
            </div>

            <button onclick="subirExamenDocente()" class="btn-main">PUBLICAR EXAMEN</button>
        </div>
`;
}

async function subirExamenDocente() {
    if (!usuarioActual) {
        alert("Error: No hay sesión activa.");
        return;
    }

    const input = document.getElementById('archivo-examen');
    if (!input || input.files.length === 0) {
        alert("Selecciona un archivo.");
        return;
    }

    try {
        const archivo = input.files[0];
        const lector = new FileReader();

        lector.onload = async function (e) {
            try {
                await db.collection("examenes").doc(usuarioActual.materia).set({
                    materia: usuarioActual.materia,
                    grado: usuarioActual.cursoTemp,
                    paralelo: usuarioActual.paraleloTemp,
                    codigoArchivo: e.target.result,
                    profesor: usuarioActual.nombre,
                    fecha: new Date().toLocaleString()
                });

                alert(`✅ ¡Subido con éxito! Materia: ${usuarioActual.materia}`);
                input.value = "";
            } catch (err) {
                console.error("Error al subir a Firestore:", err);
                alert("Error en Firestore al guardar el examen.");
            }
        };
        lector.readAsText(archivo);

    } catch (error) {
        console.error(error);
        alert("Error en Firestore.");
    }
}

// ==========================================
// 4. PANEL ALUMNO (NOTAS Y ENVÍOS)
// ==========================================

async function cargarAlumno() {
    document.getElementById('main-content').innerHTML = `
        <div style="display:flex; gap:10px; justify-content:center; margin-top:20px;">
            <button class="btn-main" onclick="verBoletaAlumno()">VER NOTAS</button>
            <button class="btn-main" onclick="vistaEnviarTrabajo()">ENVIAR TRABAJO</button>
            <button class="btn-main" onclick="vistaDarExamen()">DAR EXAMEN</button>
        </div>
        <div id="visor-alumno"></div>`;
    verBoletaAlumno();
}

async function verBoletaAlumno() {
    const doc = await db.collection("alumnos").doc(usuarioActual.user).get();
    const yo = doc.data();
    const listaMaterias = mostrandotodoAlumno ? materias : materias.slice(0, 3);

    let h = `<div class="view-container"><h3>Mi Boleta</h3><table><tr><th>MATERIA</th><th>H(40)</th><th>S(45)</th><th>S(10)</th><th>A(5)</th><th>TOTAL</th></tr>`;
    listaMaterias.forEach(m => {
        const n = (yo.calificaciones && yo.calificaciones[m]) ? yo.calificaciones[m] : { h: 0, s: 0, r: 0, a: 0 };
        const tot = (n.h || 0) + (n.s || 0) + (n.r || 0) + (n.a || 0);
        h += `<tr><td>${m}</td><td>${n.h}</td><td>${n.s}</td><td>${n.r}</td><td>${n.a}</td><td><b>${tot}</b></td></tr>`;
    });
    h += `</table><button class="btn-main" style="margin-top:10px; background-color:#555;" onclick="toggleM(!mostrandotodoAlumno)">${mostrandotodoAlumno ? 'Mostrar menos' : 'Mostrar más'}</button></div>`;
    document.getElementById('visor-alumno').innerHTML = h;
}

function toggleM(e) { mostrandotodoAlumno = e; verBoletaAlumno(); }

function vistaEnviarTrabajo() {
    document.getElementById('visor-alumno').innerHTML = `
        <div id="view-container">
            <h3>Enviar Trabajo</h3>
            <select id="m_envio" class="input-field"><option value="">MATERIA</option>${materias.map(m => `<option value="${m}">${m}</option>`).join('')}</select>
            <input type="file" id="f_envio" class="input-field">
            <button class="btn-main" onclick="enviarAlDocente()">SUBIR</button>
        </div>`;
}

async function enviarAlDocente() {
    if (!usuarioActual) {
        alert("Error: Sesión no válida.");
        return;
    }
    const m = document.getElementById('m_envio').value;
    const f = document.getElementById('f_envio').files[0];
    if (!m || !f) return alert("Faltan datos");

    // Limitar tamaño del archivo para Firestore (1MB max, recomendamos < 800KB)
    if (f.size > 800 * 1024) {
        alert("El archivo es demasiado grande. El límite de tamaño es de 800 KB.");
        return;
    }

    const lector = new FileReader();
    lector.onload = async function (e) {
        try {
            await db.collection("trabajos").doc(usuarioActual.nombre).set({
                alumno: usuarioActual.nombre || "Estudiante",
                grado: usuarioActual.grado || "",
                paralelo: usuarioActual.paralelo || "",
                materia: m,
                archivo: f.name,
                contenido: e.target.result, // URL base64 del archivo
                fecha: new Date().toLocaleDateString()
            });
            alert("¡Enviado a la nube!");
            cargarAlumno();
        } catch (error) {
            console.error("Error al guardar en Firestore:", error);
            alert("Error al subir el archivo.");
        }
    };
    lector.readAsDataURL(f);
}

function vistaDarExamen() {
    document.getElementById('visor-alumno').innerHTML = `
        <div id="view-container">
            <h3>Dar Examen</h3>
            <select id="m_envio" class="input-field"><option value="">MATERIA</option>${materias.map(m => `<option value="${m}">${m}</option>`).join('')}</select>
            <button class="btn-main" style="width: 70px" onclick="verExamenAlumno()">VER</button>
        </div>`;
}

async function verExamenAlumno() {
    const selector = document.getElementById('m_envio');
    const visor = document.getElementById('visor-alumno');

    if (!selector || !visor) return;

    const materiaElegida = selector.value;

    if (!materiaElegida) {
        alert("Por favor, selecciona una materia.");
        return;
    }

    visor.innerHTML = "<p>Buscando archivo...</p>";

    try {
        const consulta = await db.collection("examenes")
            .where("materia", "==", materiaElegida)
            .get();

        if (consulta.empty) {
            visor.innerHTML = "<p>No hay archivos para esta materia.</p>";
            return;
        }

        const datos = consulta.docs[0].data();

        // Creamos un Blob con el contenido del archivo para que sea descargable
        // Esto asume que 'codigoArchivo' es el texto/HTML del examen
        const blob = new Blob([datos.codigoArchivo], { type: 'text/html' });
        const urlDescarga = URL.createObjectURL(blob);

        // Mostramos el link de descarga
        visor.innerHTML = `
            <div style="background: #f4f4f4; padding: 20px; border-radius: 8px; text-align: center;">
                <h3>Archivo de examen encontrado</h3>
                <p>Materia: <strong>${materiaElegida}</strong></p>
                <a href="${urlDescarga}" 
                   download="Examen_${materiaElegida}.html" 
                   style="display: inline-block; background: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                   DESCARGAR EXAMEN
                </a>
            </div>
        `;

    } catch (error) {
        console.error("Error:", error);
        visor.innerHTML = "<p>Error al procesar la descarga.</p>";
    }
}



// ==========================================
// 5. ADMINISTRACIÓN Y CIERRE
// ==========================================
function cerrarModal() { document.getElementById('modal-overlay').classList.add('modal-hidden'); }

window.verBaseDeDatos = async function () {
    const alus = await db.collection("alumnos").get();
    const docs = await db.collection("docentes").get();
    console.log("ALUMNOS EN NUBE:", alus.docs.map(d => d.data()));
    console.log("DOCENTES EN NUBE:", docs.docs.map(d => d.data()));
};

window.eliminarAlumno = async function (cod) {
    await db.collection("alumnos").doc(String(cod)).delete();
    console.log("Alumno eliminado de la nube.");
};

window.logout = function () { location.reload(); };

// Este código se ejecuta SOLO cuando Firebase reconoce al usuario
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        console.log("Usuario detectado:", user.uid);
        // Guardamos el ID en una variable global para que 'subirExamenDocente' la use
        window.idDocenteActual = user.uid;
    } else {
        console.warn("No hay usuario detectado aún.");
    }
});

async function registrarUnAlumno(nombre, curso, paralelo) {
    const cod = Math.floor(1000 + Math.random() * 9000).toString();
    try {
        await db.collection("alumnos").doc(cod).set({
            nombre: nombre.trim(),
            user: cod,
            pass: "12345",
            grado: curso,
            paralelo: paralelo,
            calificaciones: {}
        });
        console.log(`✅ Registrado: ${nombre} -> CÓDIGO: ${cod}`);
    } catch (e) {
        console.error(`❌ Error con ${nombre}:`, e);
    }
}