const { buscarUsuario } = require("../models/login");

const formulario = document.getElementById("loginForm");
const mensaje = document.getElementById("loginMessage");
const boton = document.getElementById("btnLogin");

formulario.addEventListener("submit", function (evento) {
    evento.preventDefault();

    const correo = document.getElementById("username").value.trim();
    const contrasena = document.getElementById("password").value;

    mensaje.textContent = "";
    mensaje.style.color = "#ef8497";

    if (correo === "" || contrasena === "") {
        mensaje.textContent = "Ingrese su correo y contraseña.";
        return;
    }

    boton.disabled = true;
    boton.textContent = "Verificando...";

    buscarUsuario(correo, function (error, datosUsuario) {
        if (error) {
            console.error("Error al buscar usuario: ", error);

            mensaje.textContent = "No se pudo verificar el acceso."
            boton.disabled = false;
            boton.textContent = "Iniciar sesión";
            return;
        }

        if (!datosUsuario) {
            mensaje.textContent = "correo o contraseña incorrectos.";
            boton.disabled = false;
            boton.textContent = "Iniciar sesión";
            return;
        }

        if(datosUsuario.estado !== "Activo"){
            mensaje.textContent = "Esta cuenta se encuentra inactiva.";
            boton.disabled = false;
            boton.textContent = "Iniciar sesión";
            return;
        }

        if (contrasena !== datosUsuario.contrasena) {
            mensaje.textContent = "Correo o contraseña incorrectos.";
            boton.disabled = false;
            boton.textContent = "Iniciar sesión";
            return;
        }

        mensaje.style.color = "#ef8497";
        mensaje.textContent = "Inicio de sesión exitoso.";

        console.log("Usuario autenticado:", {
            id: datosUsuario.id_usuario,
            nombre: datosUsuario.nombre,
            correo: datosUsuario.correo,
            rol: datosUsuario.nombre_rol
        });

        setTimeout(function () {
            window.location.href = "../views/dashboard.html";
        }, 500);
    });
});
