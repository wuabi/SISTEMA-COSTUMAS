// controllers/reportes.js
const { obtenerReporte } = require("../models/reportes");

// Chart.js: se usa el de la etiqueta <script> (igual que el panel principal).
// Si no está disponible, se intenta con el paquete instalado: npm install chart.js
let Chart = window.Chart;
if (!Chart) {
	try {
		Chart = require("chart.js/auto");
	} catch (error) {
		console.error("No se pudo cargar Chart.js. Ejecuta: npm install chart.js", error);
	}
}

const selectorReporte = document.getElementById("tipoReporte");
const selectorPeriodo = document.getElementById("selectorPeriodo");
const contenedorAvisos = document.getElementById("avisos");
const estadoCarga = document.getElementById("estadoCarga");

let periodo = "mes";
let numeroCarga = 0;
const graficos = {};

// Colores del sistema (los mismos del gráfico de pastel del panel principal)
const PALETA = ["#9b0b43", "#d97706", "#2563eb", "#16a34a", "#e83e79", "#a78bfa", "#14b8a6", "#eab308"];
const COLOR_TEXTO = "#92979b";
const COLOR_LINEAS = "#2a2f33";

if (Chart) {
	Chart.defaults.color = COLOR_TEXTO;
	Chart.defaults.font.family = "Arial, Helvetica, sans-serif";
}

const formatoLempiras = (n) => "L " + Number(n).toLocaleString("es-HN", { maximumFractionDigits: 2 });

function escapar(texto) {
	const div = document.createElement("div");
	div.textContent = texto ?? "";
	return div.innerHTML;
}

function dibujar(idCanvas, tipo, datos) {
	const canvas = document.getElementById(idCanvas);
	const aviso = canvas.parentElement.querySelector(".VacioGrafico");

	if (graficos[idCanvas]) {
		graficos[idCanvas].destroy();
		delete graficos[idCanvas];
	}

	const hayDatos = datos.valores.length > 0 && datos.valores.some((v) => v > 0);
	canvas.hidden = !hayDatos;
	aviso.hidden = hayDatos;
	if (!hayDatos || !Chart) return;

	const esBarra = tipo === "bar";
	const colores = datos.etiquetas.map((_, i) => (datos.colores && datos.colores[i]) || PALETA[i % PALETA.length]);

	graficos[idCanvas] = new Chart(canvas.getContext("2d"), {
		type: tipo,
		data: {
			labels: datos.etiquetas,
			datasets: [{
				data: datos.valores,
				backgroundColor: esBarra ? "#9b0b43" : colores,
				hoverBackgroundColor: esBarra ? "#e83e79" : undefined,
				borderColor: esBarra ? "#9b0b43" : "#1f2326",
				borderWidth: esBarra ? 0 : 2,
				borderRadius: esBarra ? 6 : 0,
				maxBarThickness: 40
			}]
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			plugins: {
				legend: {
					display: !esBarra,
					position: "bottom",
					labels: { color: COLOR_TEXTO, boxWidth: 10, font: { size: 11 } }
				},
				tooltip: {
					callbacks: {
						label: (ctx) => {
							const valor = esBarra ? ctx.parsed.y : ctx.parsed;
							const texto = datos.dinero ? formatoLempiras(valor) : valor;
							return esBarra ? ` ${texto}` : ` ${ctx.label}: ${texto}`;
						}
					}
				}
			},
			scales: esBarra ? {
				x: { grid: { display: false }, ticks: { color: COLOR_TEXTO } },
				y: {
					beginAtZero: true,
					grid: { color: COLOR_LINEAS },
					ticks: { color: COLOR_TEXTO, callback: (v) => (datos.dinero ? formatoLempiras(v) : v) }
				}
			} : {}
		}
	});
}

function pintarTarjetas(tarjetas) {
	document.getElementById("tarjetas").innerHTML = tarjetas.map((t) => `
		<article class="Tarjeta">
			<div class="IconoTarjeta"><i class="bi ${escapar(t.icono)}"></i></div>
			<div>
				<p>${escapar(t.titulo)}</p>
				<h1>${escapar(String(t.valor))}</h1>
				<small>${escapar(t.sub)}</small>
			</div>
		</article>`).join("");
}

function pintarTabla(tabla) {
	document.getElementById("tituloTabla").textContent = tabla.titulo;
	document.getElementById("encabezadoTabla").innerHTML =
		"<tr>" + tabla.columnas.map((c) => `<th>${escapar(c)}</th>`).join("") + "</tr>";

	document.getElementById("cuerpoTabla").innerHTML = tabla.filas.length
		? tabla.filas.map((fila) => "<tr>" + fila.map((c) => `<td>${escapar(String(c ?? "—"))}</td>`).join("") + "</tr>").join("")
		: `<tr><td class="SinDatos" colspan="${tabla.columnas.length}">No hay registros en este periodo.</td></tr>`;

	document.getElementById("totalFilas").textContent = `${tabla.filas.length} registros`;
}

function pintarAvisos(avisos) {
	const lista = [...avisos];
	if (!Chart) lista.push("No se encontró Chart.js. Ejecuta en la terminal: npm install chart.js");

	contenedorAvisos.hidden = lista.length === 0;
	contenedorAvisos.innerHTML = lista.length
		? `<i class="bi bi-exclamation-triangle"></i><div><strong>Revisa estos avisos</strong>${lista.map((a) => `<p>${escapar(a)}</p>`).join("")}</div>`
		: "";
}

async function cargar() {
	const miCarga = ++numeroCarga;
	const tipo = selectorReporte.value;
	estadoCarga.textContent = " Consultando MySQL";

	try {
		const r = await obtenerReporte(tipo, periodo);
		if (miCarga !== numeroCarga) return; // llegó una consulta más nueva

		pintarTarjetas(r.tarjetas);

		document.getElementById("tituloBarras").textContent = r.barras.titulo;
		document.getElementById("subBarras").textContent = r.barras.sub;
		document.getElementById("tituloPastel1").textContent = r.pastel1.titulo;
		document.getElementById("subPastel1").textContent = r.pastel1.sub;
		document.getElementById("tituloPastel2").textContent = r.pastel2.titulo;
		document.getElementById("subPastel2").textContent = r.pastel2.sub;

		dibujar("graficoBarras", "bar", r.barras);
		dibujar("graficoPastel1", "pie", r.pastel1);
		dibujar("graficoPastel2", "pie", r.pastel2);

		pintarTabla(r.tabla);
		pintarAvisos(r.avisos || []);
		estadoCarga.textContent = r.avisos && r.avisos.length ? " Datos con avisos" : " Datos de MySQL";
	} catch (error) {
		if (miCarga !== numeroCarga) return;
		console.error("Error al cargar el reporte:", error);
		pintarAvisos([`No se pudo cargar el reporte: ${error.message}`]);
		estadoCarga.textContent = " Error de conexión";
	}
}

selectorReporte.addEventListener("change", () => {
	// El inventario no depende del periodo
	selectorPeriodo.classList.toggle("Deshabilitado", selectorReporte.value === "inventario");
	cargar();
});

selectorPeriodo.querySelectorAll("button").forEach((boton) => {
	boton.addEventListener("click", () => {
		selectorPeriodo.querySelector(".Activo").classList.remove("Activo");
		boton.classList.add("Activo");
		periodo = boton.dataset.periodo;
		cargar();
	});
});

document.getElementById("btnImprimir").addEventListener("click", () => window.print());

cargar();
