const { ipcRenderer } = require("electron");
const { actualizarPerfil, cambiarContrasena } = require("../models/login");

const botonPerfil = document.querySelector('.IconosSuperiores button[aria-label="Perfil"]');

if (botonPerfil) {
    iniciarMenuPerfil(botonPerfil);
}

function iniciarMenuPerfil(boton) {
    const contenedor = document.createElement("div");
    contenedor.className = "AccesoPerfil";
    boton.parentElement.insertBefore(contenedor, boton);
    contenedor.appendChild(boton);

    boton.setAttribute("aria-haspopup", "menu");
    boton.setAttribute("aria-expanded", "false");
    boton.setAttribute("aria-controls", "menuPerfil");

    const menu = document.createElement("div");
    menu.id = "menuPerfil";
    menu.className = "MenuPerfil";
    menu.setAttribute("role", "menu");
    menu.hidden = true;
    menu.innerHTML = `
        <button class="OpcionPerfil" type="button" role="menuitem" data-accion="perfil">
            <i class="bi bi-person" aria-hidden="true"></i>
            <span class="TextoOpcionPerfil"><strong>Mi perfil</strong><small>Consultar nombre, correo y rol del usuario autenticado.</small></span>
        </button>
        <button class="OpcionPerfil" type="button" role="menuitem" data-accion="editar">
            <i class="bi bi-person-gear" aria-hidden="true"></i>
            <span class="TextoOpcionPerfil"><strong>Editar información</strong><small>Actualizar datos personales permitidos, como nombre o teléfono.</small></span>
        </button>
        <button class="OpcionPerfil" type="button" role="menuitem" data-accion="contrasena">
            <i class="bi bi-key" aria-hidden="true"></i>
            <span class="TextoOpcionPerfil"><strong>Cambiar contraseña</strong><small>Permitir el cambio de contraseña validando la actual.</small></span>
        </button>
        <button class="OpcionPerfil" type="button" role="menuitem" data-accion="salir">
            <i class="bi bi-box-arrow-right" aria-hidden="true"></i>
            <span class="TextoOpcionPerfil"><strong>Cerrar sesión</strong><small>Finalizar la sesión y regresar a la pantalla de inicio de sesión.</small></span>
        </button>
    `;
    contenedor.appendChild(menu);

    const dialogo = document.createElement("div");
    dialogo.className = "DialogoPerfil";
    dialogo.hidden = true;
    dialogo.innerHTML = `
        <section class="ContenidoDialogoPerfil" role="dialog" aria-modal="true" tabindex="-1">
            <div class="CuerpoDialogoPerfil"></div>
            <p class="MensajePerfil" role="status" aria-live="polite"></p>
            <div class="AccionesDialogoPerfil"></div>
        </section>
    `;
    document.body.appendChild(dialogo);

    const contenidoDialogo = dialogo.querySelector(".ContenidoDialogoPerfil");
    const mensaje = dialogo.querySelector(".MensajePerfil");
    const cuerpo = dialogo.querySelector(".CuerpoDialogoPerfil");
    const acciones = dialogo.querySelector(".AccionesDialogoPerfil");
    let usuario = null;

    function cerrarMenu() {
        menu.hidden = true;
        boton.setAttribute("aria-expanded", "false");
    }

    function abrirDialogo(titulo, descripcion, html, etiquetaGuardar, alGuardar) {
        mensaje.textContent = "";
        const iconos = {
            "Mi perfil": "bi-person-vcard",
            "Editar información": "bi-person-gear",
            "Cambiar contraseña": "bi-shield-lock",
            "Cerrar sesión": "bi-box-arrow-right"
        };
        cuerpo.innerHTML = `
            <header class="EncabezadoDialogoPerfil">
                <span class="IconoEncabezadoDialogo"><i class="bi ${iconos[titulo] || "bi-person"}" aria-hidden="true"></i></span>
                <div>
                    <span class="EtiquetaDialogoPerfil">CUENTA</span>
                    <h2>${titulo}</h2>
                    <p>${descripcion}</p>
                </div>
            </header>
            <div class="DetalleDialogoPerfil">${html}</div>
        `;
        acciones.replaceChildren();

        const cancelar = document.createElement("button");
        cancelar.type = "button";
        cancelar.textContent = "Cancelar";
        cancelar.addEventListener("click", cerrarDialogo);
        acciones.appendChild(cancelar);

        const formulario = cuerpo.querySelector("form");
        if (formulario) formulario.id = "formularioPerfil";

        if (etiquetaGuardar) {
            const guardar = document.createElement("button");
            guardar.type = "submit";
            guardar.textContent = etiquetaGuardar;
            if (titulo === "Cerrar sesión") guardar.classList.add("BotonPeligroPerfil");
            if (formulario) guardar.setAttribute("form", formulario.id);
            acciones.appendChild(guardar);
        }

        dialogo.hidden = false;
        contenidoDialogo.focus();

        if (alGuardar) {
            formulario.addEventListener("submit", function(evento) {
                evento.preventDefault();
                const botonGuardar = acciones.querySelector('button[type="submit"]');
                if (botonGuardar.hidden) return;
                alGuardar(formulario, botonGuardar);
            });
        }
    }

    function cerrarDialogo() {
        dialogo.hidden = true;
        boton.focus();
    }

    function mostrarError(error, texto) {
        console.error(texto, error);
        mensaje.textContent = "No se pudo completar la operación. Inténtelo de nuevo.";
    }

    function abrirMiPerfil() {
        if (!usuario) {
            abrirDialogo("Mi perfil", "No hay una sesión de usuario activa.", "", null, null);
            return;
        }

        abrirDialogo(
            "Mi perfil",
            "Consulta los datos asociados a tu cuenta.",
            `<div class="ResumenUsuarioPerfil">
                <span class="AvatarPerfil"><i class="bi bi-person-fill" aria-hidden="true"></i></span>
                <div><strong>${escaparTexto(usuario.nombre)}</strong><span>Usuario de COSTUMAS</span></div>
                <span class="EstadoPerfil"><i aria-hidden="true"></i> Activo</span>
            </div>
            <dl class="DatosPerfil">
                <div><dt><i class="bi bi-person" aria-hidden="true"></i> Nombre completo</dt><dd>${escaparTexto(usuario.nombre)}</dd></div>
                <div><dt><i class="bi bi-envelope" aria-hidden="true"></i> Correo electrónico</dt><dd>${escaparTexto(usuario.correo)}</dd></div>
                <div><dt><i class="bi bi-award" aria-hidden="true"></i> Rol</dt><dd>${escaparTexto(usuario.nombre_rol)}</dd></div>
                <div><dt><i class="bi bi-telephone" aria-hidden="true"></i> Teléfono</dt><dd>${escaparTexto(usuario.numero || "No registrado")}</dd></div>
            </dl>`,
            null,
            null
        );
    }

    function abrirEdicion() {
        if (!usuario) {
            abrirMiPerfil();
            return;
        }

        abrirDialogo(
            "Editar información",
            "Mantén tus datos personales al día.",
            `<form class="FormularioPerfil">
                <label>Nombre
                    <input name="nombre" type="text" maxlength="100" autocomplete="name" required>
                    <small>Este nombre se mostrará en tu perfil.</small>
                </label>
                <label>Teléfono
                    <input name="numero" type="tel" maxlength="9" pattern="[0-9]{4}-[0-9]{4}" autocomplete="tel" placeholder="9999-8888" title="Ingresa 8 dígitos con un guion en el centro.">
                    <small>Opcional. Usa el formato de 8 dígitos: 9999-8888.</small>
                </label>
            </form>`,
            "Guardar cambios",
            function(formulario, botonGuardar) {
                const nombre = formulario.elements.nombre.value.trim();
                const numero = formulario.elements.numero.value.trim();

                if (!nombre) {
                    mensaje.textContent = "El nombre es obligatorio.";
                    return;
                }

                if (nombre === nombreInicial && numero === numeroInicial) return;

                if (numero && !/^\d{4}-\d{4}$/.test(numero)) {
                    formulario.elements.numero.setCustomValidity("Ingresa 8 dígitos con el formato 9999-8888.");
                    formulario.elements.numero.reportValidity();
                    return;
                }

                botonGuardar.disabled = true;
                actualizarPerfil(usuario.id_usuario, nombre, numero, function(error) {
                    if (error) {
                        botonGuardar.disabled = false;
                        mostrarError(error, "Error al actualizar el perfil:");
                        return;
                    }

                    const usuarioActualizado = { ...usuario, nombre, numero };
                    ipcRenderer.invoke("guardar-sesion", usuarioActualizado)
                        .then(function() {
                            usuario = usuarioActualizado;
                            cerrarDialogo();
                        })
                        .catch(function(errorSesion) {
                            botonGuardar.disabled = false;
                            mostrarError(errorSesion, "Error al actualizar la sesión:");
                        });
                });
            }
        );

        const formulario = cuerpo.querySelector(".FormularioPerfil");
        const campoNombre = formulario.elements.nombre;
        const campoNumero = formulario.elements.numero;
        const botonGuardar = acciones.querySelector('button[type="submit"]');
        const nombreInicial = (usuario.nombre || "").trim();
        const numeroInicial = (usuario.numero || "").trim();

        campoNombre.value = nombreInicial;
        campoNumero.value = numeroInicial;
        botonGuardar.hidden = true;

        function actualizarEstadoEdicion() {
            const nombre = campoNombre.value.trim();
            const numero = campoNumero.value.trim();
            const telefonoValido = !numero || /^\d{4}-\d{4}$/.test(numero);

            campoNumero.setCustomValidity(
                telefonoValido ? "" : "Ingresa 8 dígitos con el formato 9999-8888."
            );
            botonGuardar.hidden = nombre === nombreInicial && numero === numeroInicial;
            if (!botonGuardar.hidden) mensaje.textContent = "";
        }

        formulario.addEventListener("input", actualizarEstadoEdicion);
    }

    function abrirCambioContrasena() {
        if (!usuario) {
            abrirMiPerfil();
            return;
        }

        abrirDialogo(
            "Cambiar contraseña",
            "Confirma tu identidad para proteger tu cuenta.",
            `<form class="FormularioPerfil">
                <label>Contraseña actual
                    <input name="actual" type="password" autocomplete="current-password" required>
                </label>
                <label>Nueva contraseña
                    <input name="nueva" type="password" autocomplete="new-password" minlength="8" required>
                    <small>Mínimo 8 caracteres, con mayúscula, minúscula, número y símbolo especial.</small>
                </label>
                <label>Confirmar nueva contraseña
                    <input name="confirmacion" type="password" autocomplete="new-password" required>
                </label>
                <p class="AyudaSeguridadPerfil"><i class="bi bi-shield-check" aria-hidden="true"></i> No compartas tu contraseña. Usa una clave segura que no utilices en otros sitios.</p>
            </form>`,
            "Cambiar contraseña",
            function(formulario, botonGuardar) {
                const actual = formulario.elements.actual.value;
                const nueva = formulario.elements.nueva.value;
                const confirmacion = formulario.elements.confirmacion.value;

                if (!esContrasenaSegura(nueva)) {
                    formulario.elements.nueva.setCustomValidity(
                        "Usa al menos 8 caracteres e incluye mayúsculas, minúsculas, números y símbolos."
                    );
                    formulario.elements.nueva.reportValidity();
                    return;
                }

                if (nueva !== confirmacion) {
                    mensaje.textContent = "La nueva contraseña y su confirmación no coinciden.";
                    return;
                }

                botonGuardar.disabled = true;
                cambiarContrasena(usuario.id_usuario, actual, nueva, function(error, actualizado) {
                    botonGuardar.disabled = false;
                    if (error) {
                        mostrarError(error, "Error al cambiar la contraseña:");
                        return;
                    }

                    if (!actualizado) {
                        mensaje.textContent = "La contraseña actual es incorrecta.";
                        return;
                    }

                    cerrarDialogo();
                });
            }
        );

        const campoNueva = cuerpo.querySelector('[name="nueva"]');
        campoNueva.addEventListener("input", function() {
            campoNueva.setCustomValidity(
                campoNueva.value && !esContrasenaSegura(campoNueva.value)
                    ? "Usa al menos 8 caracteres e incluye mayúsculas, minúsculas, números y símbolos."
                    : ""
            );
        });
    }

    function cerrarSesion() {
        abrirDialogo(
            "Cerrar sesión",
            "¿Quieres salir de tu cuenta en este dispositivo?",
            `<form class="FormularioPerfil FormularioConfirmacionPerfil">
                <p>Tu sesión se cerrará y volverás a la pantalla de inicio de sesión.</p>
            </form>`,
            "Cerrar sesión",
            function(_formulario, botonGuardar) {
                botonGuardar.disabled = true;
                ipcRenderer.invoke("cerrar-sesion")
                    .then(function() {
                        window.location.href = "../views/login.html";
                    })
                    .catch(function(error) {
                        botonGuardar.disabled = false;
                        mostrarError(error, "Error al cerrar la sesión:");
                    });
            }
        );
    }

    boton.addEventListener("click", function() {
        menu.hidden = !menu.hidden;
        boton.setAttribute("aria-expanded", String(!menu.hidden));
        if (!menu.hidden) menu.querySelector(".OpcionPerfil").focus();
    });

    menu.addEventListener("click", function(evento) {
        const opcion = evento.target.closest("[data-accion]");
        if (!opcion) return;

        cerrarMenu();
        switch (opcion.dataset.accion) {
            case "perfil":
                abrirMiPerfil();
                break;
            case "editar":
                abrirEdicion();
                break;
            case "contrasena":
                abrirCambioContrasena();
                break;
            case "salir":
                cerrarSesion();
                break;
        }
    });

    document.addEventListener("click", function(evento) {
        if (!contenedor.contains(evento.target)) cerrarMenu();
        if (evento.target === dialogo) cerrarDialogo();
    });

    document.addEventListener("keydown", function(evento) {
        if (evento.key === "Escape") {
            if (!dialogo.hidden) cerrarDialogo();
            else cerrarMenu();
        }
    });

    ipcRenderer.invoke("obtener-sesion")
        .then(function(sesion) {
            usuario = sesion;
        })
        .catch(function(error) {
            mostrarError(error, "Error al consultar la sesión:");
        });
}

function escaparTexto(texto) {
    const elemento = document.createElement("span");
    elemento.textContent = texto || "";
    return elemento.innerHTML;
}

function esContrasenaSegura(contrasena) {
    return contrasena.length >= 8
        && /[A-Z]/.test(contrasena)
        && /[a-z]/.test(contrasena)
        && /\d/.test(contrasena)
        && /[^A-Za-z0-9\s]/.test(contrasena);
}
