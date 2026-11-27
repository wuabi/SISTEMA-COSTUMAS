const entregasModel = require("../models/gestionEntregas");

const tablaPendientes = document.getElementById("tablaPendientes");
const tablaHistorial = document.getElementById("tablaHistorial");
const buscarEntrega = document.getElementById("buscarEntrega");
const mensaje = document.getElementById("mensaje");

let fechasLocalesAnteriores = {};
let pedidos = [];

try {
    fechasLocalesAnteriores = JSON.parse(localStorage.getItem("costumas_fechas_entregas")) || {};
} catch (error) {
    console.error("No se pudieron leer las fechas guardadas anteriormente:", error);
}

function fechaActual() {
    const hoy = new Date();
    const anio = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, "0");
    const dia = String(hoy.getDate()).padStart(2, "0");
    return `${anio}-${mes}-${dia}`;
}

function fechaISO(fecha) {
    if (!fecha) return "";
    if (fecha instanceof Date) {
        return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
    }
    return String(fecha).slice(0, 10);
}

function mostrarFecha(fecha) {
    const valor = fechaISO(fecha);
    if (!valor || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return "No registrada";
    const [anio, mes, dia] = valor.split("-");
    return `${dia}/${mes}/${anio}`;
}

function escapar(texto) {
    return String(texto ?? "").replace(/[&<>"']/g, caracter => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[caracter]));
}

function notificar(texto, tipo = "exito") {
    mensaje.textContent = texto;
    mensaje.className = `Mensaje visible ${tipo}`;
    clearTimeout(notificar.temporizador);
    notificar.temporizador = setTimeout(() => {
        mensaje.textContent = "";
        mensaje.className = "Mensaje";
    }, 4500);
}

function pedidosFiltrados(estado) {
    const texto = buscarEntrega.value.trim().toLowerCase();
    return pedidos.filter(pedido => {
        if (pedido.estado !== estado) return false;
        return String(pedido.id_pedido_c).includes(texto) ||
            String(pedido.nombre_cliente || "").toLowerCase().includes(texto) ||
            String(pedido.numero || "").toLowerCase().includes(texto);
    });
}

function filaVacia(tabla, mensajeTexto) {
    tabla.innerHTML = `<tr><td colspan="7" class="EstadoTabla">${escapar(mensajeTexto)}</td></tr>`;
}

function renderizarPendientes() {
    const lista = pedidosFiltrados("Terminado");
    if (!lista.length) {
        filaVacia(tablaPendientes, pedidos.some(p => p.estado === "Terminado")
            ? "No hay resultados para tu búsqueda."
            : "No hay pedidos terminados pendientes de entrega.");
        return;
    }

    tablaPendientes.innerHTML = lista.map(pedido => {
        const id = Number(pedido.id_pedido_c);
        const fechaProgramada = pedido.fecha_programada ||
            (fechasLocalesAnteriores[id] && fechasLocalesAnteriores[id].programada);
        return `
            <tr>
                <td class="IdPedido">#${id}</td>
                <td>${escapar(pedido.nombre_cliente)}</td>
                <td>${escapar(pedido.numero || "Sin teléfono")}</td>
                <td>${mostrarFecha(pedido.fecha_pedido)}</td>
                <td>
                    <input class="CampoFecha fecha-programada" type="date"
                        data-id="${id}" value="${escapar(fechaISO(fechaProgramada))}"
                        aria-label="Fecha programada del pedido ${id}">
                </td>
                <td>L ${Number(pedido.total || 0).toFixed(2)}</td>
                <td>
                    <div class="AccionEntrega">
                        <input class="CampoFecha fecha-real" type="date"
                            data-id="${id}" value="${escapar(fechaActual())}"
                            max="${fechaActual()}" aria-label="Fecha real de entrega del pedido ${id}">
                        <button class="btn-entregar" type="button" data-entregar="${id}">
                            <i class="bi bi-check2-circle"></i> Entregar
                        </button>
                    </div>
                </td>
            </tr>`;
    }).join("");

    tablaPendientes.querySelectorAll(".fecha-programada").forEach(input => {
        input.addEventListener("change", () => {
            const id = input.dataset.id;
            input.disabled = true;
            entregasModel.actualizarFechaProgramada(Number(id), input.value || null, error => {
                input.disabled = false;
                if (error) {
                    console.error("No se pudo guardar la fecha programada:", error);
                    notificar(error.message || "No se pudo guardar la fecha programada.", "error");
                    cargarPedidos(false);
                    return;
                }

                const pedido = pedidos.find(item => Number(item.id_pedido_c) === Number(id));
                if (pedido) pedido.fecha_programada = input.value || null;
                notificar(input.value ? "Fecha programada guardada." : "Fecha programada eliminada.");
            });
        });
    });

    tablaPendientes.querySelectorAll("[data-entregar]").forEach(boton => {
        boton.addEventListener("click", () => confirmarEntrega(boton.dataset.entregar, boton));
    });
}

function confirmarEntrega(id, boton) {
    const campoFecha = tablaPendientes.querySelector(`.fecha-real[data-id="${id}"]`);
    const fecha = campoFecha.value;

    if (!fecha) {
        notificar("Selecciona la fecha en que se realizó la entrega.", "error");
        return;
    }
    if (fecha > fechaActual()) {
        notificar("La fecha de entrega no puede ser futura.", "error");
        return;
    }

    if (!confirm(`¿Confirmas que el pedido #${id} fue entregado el ${mostrarFecha(fecha)}?`)) return;

    boton.disabled = true;
    entregasModel.marcarComoEntregado(Number(id), fecha, error => {
        if (error) {
            console.error(error);
            boton.disabled = false;
            notificar(error.message || "No se pudo actualizar el pedido.", "error");
            return;
        }

        notificar(`El pedido #${id} ahora aparece como Entregado.`);
        cargarPedidos(false);
    });
}

function renderizarHistorial() {
    const lista = pedidosFiltrados("Entregado");
    if (!lista.length) {
        filaVacia(tablaHistorial, "Todavía no hay pedidos entregados.");
        return;
    }

    tablaHistorial.innerHTML = lista.map(pedido => {
        const fechaEntrega = pedido.fecha_entrega ||
            (fechasLocalesAnteriores[pedido.id_pedido_c] &&
                fechasLocalesAnteriores[pedido.id_pedido_c].entrega);
        return `
            <tr>
                <td class="IdPedido">#${Number(pedido.id_pedido_c)}</td>
                <td>${escapar(pedido.nombre_cliente)}</td>
                <td>${escapar(pedido.numero || "Sin teléfono")}</td>
                <td>${mostrarFecha(pedido.fecha_pedido)}</td>
                <td>${mostrarFecha(fechaEntrega)}</td>
                <td>L ${Number(pedido.total || 0).toFixed(2)}</td>
                <td><span class="EstadoEtiqueta">Entregado</span></td>
            </tr>`;
    }).join("");
}

function actualizarResumen() {
    const pendientes = pedidos.filter(p => p.estado === "Terminado").length;
    const entregados = pedidos.filter(p => p.estado === "Entregado").length;
    document.getElementById("totalPendientes").textContent = pendientes;
    document.getElementById("totalEntregadas").textContent = entregados;
    document.getElementById("totalGestionadas").textContent = pendientes + entregados;
}

function cargarPedidos(mostrarError = true) {
    entregasModel.obtenerPedidos((error, resultados) => {
        if (error) {
            console.error("Error al consultar pedidos:", error);
            filaVacia(tablaPendientes, "No se pudieron consultar los pedidos. Revisa la conexión a MySQL.");
            filaVacia(tablaHistorial, "No se pudo consultar el historial.");
            if (mostrarError) notificar("Error de conexión o consulta a la base de datos.", "error");
            return;
        }
        pedidos = resultados || [];
        actualizarResumen();
        renderizarPendientes();
        renderizarHistorial();
    });
}

buscarEntrega.addEventListener("input", () => {
    renderizarPendientes();
    renderizarHistorial();
});

document.getElementById("btnActualizar").addEventListener("click", () => cargarPedidos());
cargarPedidos();
