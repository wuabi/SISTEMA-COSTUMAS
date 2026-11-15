
const {
    obtenerPagos,
    crearPago,
    actualizarPago,
    eliminarPago
} = require("../models/pagos");

const formulario = document.getElementById("formPago");
const listaPagos = document.getElementById("TablaPagos");
const buscador = document.getElementById("buscarPago");
const botonNuevo = document.getElementById("btnNuevoPago");
const botonCerrar = document.getElementById("btnCerrarPago");
const botonCancelar = document.getElementById("btnCancelarPago");
const panelFormulario = document.getElementById("FormularioPago");
const pieTabla = document.querySelector(".PieTabla");

let pagos = [];

// Campo oculto para guardar el ID cuando se edita un pago.
let campoId = document.getElementById("idPago");

if (!campoId) {
    campoId = document.createElement("input");
    campoId.type = "hidden";
    campoId.id = "idPago";
    formulario.prepend(campoId);
}

// Referencias a las estadísticas.
const tarjetas = document.querySelectorAll(".TarjetasPagos .Tarjeta");

function actualizarEstadisticas() {
    const totalPagos = pagos.length;

    const totalRecaudado = pagos
        .filter(pago => pago.estado_pago === "Pagado")
        .reduce((total, pago) => total + Number(pago.monto), 0);

    const pagosCompletados = pagos.filter(
        pago => pago.estado_pago === "Pagado"
    ).length;

    const pagosPendientes = pagos.filter(
        pago => pago.estado_pago === "Pendiente"
    ).length;

    tarjetas[0].querySelector("h3").textContent = totalPagos;

    tarjetas[1].querySelector("h3").textContent =
        `L. ${totalRecaudado.toFixed(2)}`;

    tarjetas[2].querySelector("h3").textContent = pagosCompletados;

    tarjetas[3].querySelector("h3").textContent = pagosPendientes;
}

function agregarCelda(fila, valor) {
    const celda = document.createElement("td");
    celda.textContent = valor ?? "—";
    fila.appendChild(celda);
}

function formatearFecha(fecha) {
    if (!fecha) return "—";

    const fechaPago = new Date(fecha);

    if (Number.isNaN(fechaPago.getTime())) {
        return fecha;
    }

    return fechaPago.toLocaleString("es-HN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function renderizarPagos() {
    const termino = buscador.value.trim().toLocaleLowerCase();

    const filtrados = pagos.filter(pago =>
        [
            pago.id_pago,
            pago.id_venta,
            pago.fecha_pago,
            pago.monto,
            pago.metodo_pago,
            pago.estado_pago,
            pago.total_venta,
            pago.total_abonado,
            pago.saldo_pendiente
        ].some(valor =>
            String(valor ?? "").toLocaleLowerCase().includes(termino)
        )
    );

    listaPagos.replaceChildren();

    if (filtrados.length === 0) {
        const fila = document.createElement("tr");
        fila.className = "FilaVacia";

        const celda = document.createElement("td");
        celda.colSpan = 10;

        const mensaje = document.createElement("div");
        mensaje.className = "MensajeVacio";

        const icono = document.createElement("i");
        icono.className = "fa-solid fa-receipt";

        const titulo = document.createElement("strong");
        titulo.textContent = pagos.length
            ? "No hay resultados para la búsqueda."
            : "No hay pagos registrados";

        const descripcion = document.createElement("span");
        descripcion.textContent = pagos.length
            ? "Intenta buscar con otro término."
            : "Los pagos aparecerán aquí cuando sean registrados.";

        mensaje.append(icono, titulo, descripcion);
        celda.appendChild(mensaje);
        fila.appendChild(celda);
        listaPagos.appendChild(fila);
    } else {
        filtrados.forEach(pago => {
            const fila = document.createElement("tr");

            // Información del pago.
            agregarCelda(fila, pago.id_pago);
            agregarCelda(fila, pago.id_venta);
            agregarCelda(fila, formatearFecha(pago.fecha_pago));
            agregarCelda(
                fila,
                `L. ${Number(pago.monto).toFixed(2)}`
            );
            agregarCelda(fila, pago.metodo_pago);

            // Estado del pago.
            const celdaEstado = document.createElement("td");
            const estado = document.createElement("span");

            estado.className = `EstadoPago Estado${pago.estado_pago}`;
            estado.textContent = pago.estado_pago;

            celdaEstado.appendChild(estado);
            fila.appendChild(celdaEstado);

            // Información financiera de la venta.
            agregarCelda(
                fila,
                `L. ${Number(pago.total_venta).toFixed(2)}`
            );

            agregarCelda(
                fila,
                `L. ${Number(pago.total_abonado).toFixed(2)}`
            );

            const saldo = Math.max(
                0,
                Number(pago.saldo_pendiente)
            );

            const celdaSaldo = document.createElement("td");
            celdaSaldo.textContent = `L. ${saldo.toFixed(2)}`;

            if (saldo === 0) {
                celdaSaldo.classList.add("SaldoLiquidado");
            } else {
                celdaSaldo.classList.add("SaldoPendiente");
            }

            fila.appendChild(celdaSaldo);

            // Acciones: editar y eliminar.
            const acciones = document.createElement("td");
            acciones.className = "Acciones";

            const botonEditar = document.createElement("button");
            botonEditar.type = "button";
            botonEditar.title = "Editar";
            botonEditar.setAttribute(
                "aria-label",
                `Editar pago ${pago.id_pago}`
            );

            botonEditar.innerHTML =
                '<i class="fa-solid fa-pen-to-square"></i>';

            botonEditar.addEventListener("click", () => editarPago(pago));

            const botonEliminar = document.createElement("button");
            botonEliminar.type = "button";
            botonEliminar.title = "Eliminar";
            botonEliminar.setAttribute(
                "aria-label",
                `Eliminar pago ${pago.id_pago}`
            );

            botonEliminar.innerHTML =
                '<i class="fa-solid fa-trash"></i>';

            botonEliminar.addEventListener("click", () => borrarPago(pago));

            acciones.append(botonEditar, botonEliminar);
            fila.appendChild(acciones);

            listaPagos.appendChild(fila);
        });
    }

    pieTabla.firstElementChild.textContent =
        `Mostrando ${filtrados.length} de ${pagos.length} pagos`;

    actualizarEstadisticas();
}

function cargarPagos() {
    obtenerPagos((error, resultados) => {
        if (error) {
            console.error("Error al cargar pagos:", error);

            pagos = [];
            renderizarPagos();

            pieTabla.firstElementChild.textContent =
                "No se pudieron cargar los pagos";

            return;
        }

        pagos = resultados;
        renderizarPagos();

        pieTabla.firstElementChild.textContent =
            `Mostrando ${pagos.length} pagos registrados`;
    });
}

function mostrarFormulario() {
    panelFormulario.hidden = false;

    panelFormulario.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
    });
}

function editarPago(pago) {
    campoId.value = pago.id_pago;

    document.getElementById("id_venta").value = pago.id_venta;
    document.getElementById("monto").value = pago.monto;
    document.getElementById("metodo_pago").value = pago.metodo_pago;
    document.getElementById("estado_pago").value = pago.estado_pago;

    document.querySelector(".TituloFormulario h3").textContent =
        "Editar pago";

    document.querySelector(".TituloFormulario p").textContent =
        "Modifica la información del pago.";

    formulario.querySelector('button[type="submit"]').innerHTML =
        '<i class="fa-solid fa-floppy-disk"></i> Guardar cambios';

    mostrarFormulario();
}

function borrarPago(pago) {
    if (!window.confirm(
        `¿Eliminar el pago ${pago.id_pago}? Esta acción no se puede deshacer.`
    )) {
        return;
    }

    eliminarPago(pago.id_pago, error => {
        if (error) {
            console.error("Error al eliminar pago:", error);

            if (error.code === "ER_ROW_IS_REFERENCED_2") {
                window.alert(
                    "No se puede eliminar este pago porque tiene registros relacionados."
                );
            } else {
                window.alert("No se pudo eliminar el pago.");
            }

            return;
        }

        cargarPagos();
    });
}

function limpiarFormulario() {
    formulario.reset();
    campoId.value = "";

    document.querySelector(".TituloFormulario h3").textContent =
        "Nuevo pago";

    document.querySelector(".TituloFormulario p").textContent =
        "Ingresa la información del pago.";

    formulario.querySelector('button[type="submit"]').innerHTML =
        '<i class="fa-solid fa-floppy-disk"></i> Registrar pago';
}

function cerrarFormulario() {
    panelFormulario.hidden = true;
    limpiarFormulario();
}

formulario.addEventListener("submit", evento => {
    evento.preventDefault();

    const id = campoId.value;

    const pago = {
        id_venta: Number(document.getElementById("id_venta").value),
        monto: Number(document.getElementById("monto").value),
        metodo_pago: document.getElementById("metodo_pago").value,
        estado_pago: document.getElementById("estado_pago").value
    };

    if (
        !Number.isInteger(pago.id_venta) ||
        pago.id_venta <= 0 ||
        !Number.isFinite(pago.monto) ||
        pago.monto <= 0
    ) {
        window.alert("Verifica el ID de venta y el monto ingresado.");
        return;
    }

    const guardar = id
        ? callback => actualizarPago(id, pago, callback)
        : callback => crearPago(pago, callback);

    guardar(error => {
        if (error) {
            console.error("Error al guardar el pago:", error);

            if (error.code === "ER_NO_REFERENCED_ROW_2") {
                window.alert("La venta indicada no existe.");
            } else if (
                error.code === "VALIDACION_PAGO" ||
                error.code === "VENTA_NO_EXISTE" ||
                error.code === "SALDO_INSUFICIENTE" ||
                error.code === "PAGO_NO_EXISTE"
            ) {
                window.alert(error.message);
            } else {
                window.alert("No se pudo guardar el pago.");
            }

            return;
        }

        cerrarFormulario();
        cargarPagos();
    });
});

buscador.addEventListener("input", renderizarPagos);

botonNuevo.addEventListener("click", () => {
    limpiarFormulario();
    mostrarFormulario();
    document.getElementById("id_venta").focus();
});

botonCerrar.addEventListener("click", cerrarFormulario);
botonCancelar.addEventListener("click", cerrarFormulario);

// Estado inicial de la tabla.
listaPagos.replaceChildren();

pieTabla.firstElementChild.textContent = "Cargando pagos...";

cargarPagos();
