const { obtenerDatosDashboard } = require("../models/dashboard");

const tarjetas = {
    encargosActivos: document.getElementById("encargosActivos"),
    ingresosMensuales: document.getElementById("ingresosMensuales"),
    entregasPendientes: document.getElementById("entregasPendientes")
};
const contenedorActividades = document.querySelector(".Actividades");
const canvas = document.getElementById("graficoEncargos");
const estadoGrafico = document.getElementById("estadoGrafico");
const estadoDashboard = document.getElementById("estadoDashboard");
const coloresEstado = {
    Pendiente: "#9b0b43",
    "En proceso": "#d97706",
    Terminado: "#2563eb",
    Entregado: "#16a34a"
};
let graficoPastel;

function mostrarError(error) {
    console.error("Error al cargar el dashboard:", error);
    estadoDashboard.textContent = `No se pudieron cargar los datos del panel: ${error.message}`;
    estadoDashboard.hidden = false;
    contenedorActividades.textContent = "No se pudieron cargar las actividades.";
    estadoGrafico.textContent = "No se pudieron cargar los datos del gráfico.";
}

function actualizarGrafico(estados) {
    const cantidades = new Map(estados.map(({ estado, cantidad }) => [estado, Number(cantidad)]));
    const etiquetas = Object.keys(coloresEstado);
    const valores = etiquetas.map((estado) => cantidades.get(estado) || 0);

    if (!window.Chart) {
        canvas.hidden = true;
        estadoGrafico.textContent = "No se pudo cargar el gráfico porque Chart.js no está disponible.";
        console.error("No se pudo cargar el gráfico del dashboard: Chart.js no está disponible.");
        return;
    }

    if (valores.every((cantidad) => cantidad === 0)) {
        canvas.hidden = true;
        estadoGrafico.textContent = "No hay encargos registrados.";
        if (graficoPastel) graficoPastel.destroy();
        return;
    }

    canvas.hidden = false;
    estadoGrafico.hidden = true;
    if (graficoPastel) graficoPastel.destroy();

    graficoPastel = new window.Chart(canvas.getContext("2d"), {
        type: "pie",
        data: {
            labels: etiquetas,
            datasets: [{
                data: valores,
                backgroundColor: etiquetas.map((estado) => coloresEstado[estado]),
                borderColor: "#1f2326",
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: "bottom",
                    labels: {
                        color: "#92979b",
                        boxWidth: 10,
                        font: { size: 10 }
                    }
                }
            }
        }
    });
}

function actualizarActividades(actividades) {
    if (actividades.length === 0) {
        contenedorActividades.textContent = "Sin actividades registradas.";
        return;
    }

    const formatoFecha = new Intl.DateTimeFormat("es-HN", {
        dateStyle: "short",
        timeStyle: "short"
    });
    const elementos = actividades.map((actividad) => {
        const elemento = document.createElement("span");
        const nombre = document.createElement("h4");
        const detalle = document.createElement("p");
        const fecha = new Date(actividad.fecha_pedido);

        nombre.textContent = actividad.cliente;
        detalle.textContent = `Encargo #${actividad.id_pedido_c} · ${actividad.estado} · ${
            Number.isNaN(fecha.getTime()) ? actividad.fecha_pedido : formatoFecha.format(fecha)
        }`;
        elemento.append(nombre, detalle);
        return elemento;
    });
    contenedorActividades.replaceChildren(...elementos);
}

async function cargarDashboard() {
    estadoDashboard.hidden = true;
    estadoDashboard.textContent = "";
    contenedorActividades.textContent = "Cargando actividades...";
    estadoGrafico.hidden = false;
    estadoGrafico.textContent = "Cargando gráfico...";

    try {
        const datos = await obtenerDatosDashboard();
        tarjetas.encargosActivos.textContent = Number(datos.resumen.encargosActivos).toLocaleString("es-HN");
        tarjetas.ingresosMensuales.textContent = `L ${Number(datos.resumen.ingresosMensuales).toLocaleString("es-HN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
        tarjetas.entregasPendientes.textContent = Number(datos.resumen.entregasPendientes).toLocaleString("es-HN");

        actualizarActividades(datos.actividades);
        actualizarGrafico(datos.estados);
    } catch (error) {
        mostrarError(error);
    }
}

cargarDashboard();
