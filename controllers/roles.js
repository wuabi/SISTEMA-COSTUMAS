const { ipcRenderer } = require("electron");

const rolesPorModulo = {
    "Administrador": [
        "dashboard.html",
        "gestionClientes.html",
        "gestionMedidas.html",
        "encargosclientes.html",
        "encargosproveedores.html",
        "gestionEntregas.html",
        "gestionPagos.html",
        "gestionReportes.html",
        "gestionEncargos.html"
    ],
    "Gerente": [
        "dashboard.html",
        "gestionClientes.html",
        "gestionMedidas.html",
        "encargosclientes.html",
        "gestionPagos.html",
        "gestionEncargos.html"
    ],
    "Empleado": ["encargosclientes.html"]
};

const paginaInicialPorRol = {
    "Administrador": "dashboard.html",
    "Gerente": "dashboard.html",
    "Empleado": "encargosclientes.html"
};

const controladoresPorPagina = {
    "dashboard.html": ["dashboard.js", "notificaciones.js", "perfil.js"],
    "gestionClientes.html": ["gestionClientes.js", "notificaciones.js", "perfil.js"],
    "gestionMedidas.html": ["gestionMedidas.js", "notificaciones.js", "perfil.js"],
    "encargosclientes.html": ["gestionPedidos.js", "notificaciones.js", "perfil.js"],
    "encargosproveedores.html": ["gestionPedidos.js", "notificaciones.js", "perfil.js"],
    "gestionEntregas.html": ["gestionEntregasController.js", "notificaciones.js", "perfil.js"],
    "gestionPagos.html": ["pagosC.js", "notificaciones.js", "perfil.js"],
    "gestionReportes.html": ["reportes.js", "notificaciones.js", "perfil.js"],
    "gestionEncargos.html": ["notificaciones.js", "perfil.js"]
};

const usuario = ipcRenderer.sendSync("obtener-sesion-sincrono");
const nombreArchivo = decodeURIComponent(window.location.pathname.split("/").pop());

if (!usuario || !rolesPorModulo[usuario.nombre_rol]) {
    window.location.replace("../views/login.html");
} else if (!rolesPorModulo[usuario.nombre_rol].includes(nombreArchivo)) {
    window.location.replace(paginaInicialPorRol[usuario.nombre_rol]);
} else {
    window.COSTUMAS_ROLES = {
        rol: usuario.nombre_rol,
        modulos: rolesPorModulo[usuario.nombre_rol]
    };

    document.querySelectorAll(".Lateral button[onclick]").forEach(boton => {
        const destino = boton.getAttribute("onclick").match(/location\.href\s*=\s*['"]([^'"]+)['"]/);
        if (!destino) return;

        const modulo = destino[1].split("/").pop();
        boton.hidden = !rolesPorModulo[usuario.nombre_rol].includes(modulo);
    });

    cargarControladores(controladoresPorPagina[nombreArchivo]);
}

async function cargarControladores(controladores) {
    try {
        for (const controlador of controladores) {
            await new Promise((resolver, rechazar) => {
                const script = document.createElement("script");
                script.src = `../controllers/${controlador}`;
                script.onload = resolver;
                script.onerror = () => rechazar(new Error(`No se pudo cargar ${controlador}.`));
                document.body.appendChild(script);
            });
        }
    } catch (error) {
        console.error("Error al cargar las funciones del módulo:", error);
        const aviso = document.createElement("p");
        aviso.setAttribute("role", "alert");
        aviso.textContent = "No se pudieron cargar las funciones del módulo. Cierra y vuelve a abrir esta pantalla.";
        document.body.prepend(aviso);
    }
}
