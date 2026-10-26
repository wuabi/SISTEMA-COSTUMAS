const { obtenerResumenNotificaciones } = require("../models/notificaciones");
const botonNotificaciones = document.querySelector(
    '.IconosSuperiores button[aria-label="Notificaciones"]'
);

if (botonNotificaciones) {
    iniciarNotificaciones(botonNotificaciones);
}

function iniciarNotificaciones(boton) {
    const contenedor = document.createElement("div");
    contenedor.className = "AccesoNotificaciones";
    boton.parentElement.insertBefore(contenedor, boton);
    contenedor.appendChild(boton);

    let contador = boton.querySelector(".ContadorNotificaciones");
    if (!contador) {
        contador = document.createElement("span");
        contador.className = "ContadorNotificaciones";
        contador.setAttribute("aria-hidden", "true");
        boton.appendChild(contador);
    }
    contador.hidden = true;

    boton.setAttribute("aria-haspopup", "true");
    boton.setAttribute("aria-expanded", "false");
    boton.setAttribute("aria-controls", "panelNotificaciones");

    const panel = document.createElement("section");
    panel.id = "panelNotificaciones";
    panel.className = "PanelNotificaciones";
    panel.setAttribute("aria-label", "Notificaciones del sistema");
    panel.hidden = true;
    panel.innerHTML = `
        <header class="EncabezadoNotificaciones">
            <h2>Notificaciones</h2>
            <span>Resumen del sistema</span>
        </header>
        <div class="ListaNotificaciones" aria-live="polite">
            <p class="VacioNotificaciones">Cargando notificaciones...</p>
        </div>
    `;
    contenedor.appendChild(panel);

    const lista = panel.querySelector(".ListaNotificaciones");
    let cantidadAvisos = 0;

    function agregarAviso(icono, titulo, detalle) {
        const aviso = document.createElement("article");
        aviso.className = "AvisoNotificacion";

        const iconoElemento = document.createElement("span");
        iconoElemento.className = "IconoNotificacion";
        iconoElemento.setAttribute("aria-hidden", "true");
        iconoElemento.innerHTML = `<i class="bi ${icono}"></i>`;

        const texto = document.createElement("span");
        texto.className = "TextoNotificacion";

        const encabezado = document.createElement("strong");
        encabezado.textContent = titulo;
        const descripcion = document.createElement("small");
        descripcion.textContent = detalle;

        texto.append(encabezado, descripcion);
        aviso.append(iconoElemento, texto);
        lista.appendChild(aviso);
    }

    function mostrarEstado(texto) {
        const estado = document.createElement("p");
        estado.className = "VacioNotificaciones";
        estado.textContent = texto;
        lista.replaceChildren(estado);
    }

    function actualizarNotificaciones() {
        obtenerResumenNotificaciones((error, resumen) => {
            if (error) {
                console.error("Error al cargar las notificaciones:", error);
                contador.hidden = true;
                boton.setAttribute("aria-label", "Notificaciones");
                mostrarEstado("No se pudieron cargar las notificaciones. Verifica la conexión con la base de datos.");
                return;
            }

            lista.replaceChildren();
            cantidadAvisos = 0;

            const categorias = [
                {
                    cantidad: resumen.encargosPendientes,
                    icono: "bi-hourglass-split",
                    titulo: "Encargos de clientes pendientes",
                    detalle: cantidad => `${cantidad} ${cantidad === 1 ? "pedido espera" : "pedidos esperan"} por iniciar.`
                },
                {
                    cantidad: resumen.encargosEnProceso,
                    icono: "bi-tools",
                    titulo: "Encargos en proceso",
                    detalle: cantidad => `${cantidad} ${cantidad === 1 ? "pedido está" : "pedidos están"} en confección.`
                },
                {
                    cantidad: resumen.entregasPendientes,
                    icono: "bi-box-seam",
                    titulo: "Entregas por realizar",
                    detalle: cantidad => `${cantidad} ${cantidad === 1 ? "pedido terminado espera" : "pedidos terminados esperan"} entrega.`
                },
                {
                    cantidad: resumen.pedidosProveedorPendientes,
                    icono: "bi-truck",
                    titulo: "Pedidos a proveedores abiertos",
                    detalle: cantidad => `${cantidad} ${cantidad === 1 ? "pedido requiere" : "pedidos requieren"} seguimiento.`
                },
                {
                    cantidad: resumen.pagosPendientes,
                    icono: "bi-cash-coin",
                    titulo: "Pagos pendientes",
                    detalle: cantidad => `${cantidad} ${cantidad === 1 ? "pago está" : "pagos están"} pendiente de confirmar.`
                }
            ];

            categorias.forEach(categoria => {
                if (categoria.cantidad > 0) {
                    agregarAviso(
                        categoria.icono,
                        categoria.titulo,
                        categoria.detalle(categoria.cantidad)
                    );
                    cantidadAvisos += categoria.cantidad;
                }
            });

            contador.textContent = cantidadAvisos > 99 ? "99+" : String(cantidadAvisos);
            contador.hidden = cantidadAvisos === 0;
            boton.setAttribute(
                "aria-label",
                cantidadAvisos
                    ? `Notificaciones, ${cantidadAvisos} asuntos requieren atención`
                    : "Notificaciones"
            );

            if (cantidadAvisos === 0) {
                mostrarEstado("No hay asuntos pendientes. Todo está al día.");
            }
        });
    }

    function cerrarPanel() {
        panel.hidden = true;
        boton.setAttribute("aria-expanded", "false");
    }

    boton.addEventListener("click", () => {
        const abrir = panel.hidden;
        panel.hidden = !abrir;
        boton.setAttribute("aria-expanded", String(abrir));
        if (abrir) actualizarNotificaciones();
    });

    document.addEventListener("click", evento => {
        if (!contenedor.contains(evento.target)) cerrarPanel();
    });

    document.addEventListener("keydown", evento => {
        if (evento.key === "Escape" && !panel.hidden) {
            cerrarPanel();
            boton.focus();
        }
    });

    actualizarNotificaciones();
    window.setInterval(actualizarNotificaciones, 60000);
}
