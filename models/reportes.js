// models/reportes.js
// Consultas para el módulo de Reportes.
//
// Si tus tablas o columnas se llaman distinto, cambia SOLO el bloque DB de abajo.
// Cada consulta está protegida: si una tabla no existe, ese reporte muestra un aviso
// en pantalla y el resto sigue funcionando.

const conexion = require("../database");

// ================= NOMBRES REALES DE TU BASE DE DATOS (AJUSTAR) =================
const DB = {
	clientes:   { tabla: "Clientes",   id: "id_cliente", nombre: "nombre" },
	encargos:   { tabla: "Encargos",   id: "id_encargo", cliente: "id_cliente", prenda: "tipo_prenda", estado: "estado", fecha: "fecha", total: "total" },
	pagos:      { tabla: "Pagos",      id: "id_pago", encargo: "id_encargo", monto: "monto", metodo: "metodo_pago", fecha: "fecha" },
	inventario: { tabla: "Inventario", id: "id_articulo", nombre: "nombre", categoria: "categoria", cantidad: "cantidad", minimo: "stock_minimo", precio: "precio" }
};
// =================================================================================

const comillas = (obj) => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, "`" + v + "`"]));
const C = comillas(DB.clientes);
const E = comillas(DB.encargos);
const P = comillas(DB.pagos);
const I = comillas(DB.inventario);

// Mismos colores del gráfico de pastel del panel principal
const COLOR_ESTADO = {
	"Pendiente": "#9b0b43",
	"En proceso": "#d97706",
	"Terminado": "#2563eb",
	"Entregado": "#16a34a"
};
const ESTADOS = Object.keys(COLOR_ESTADO);
const COLOR_STOCK = { "Stock normal": "#16a34a", "Stock bajo": "#9b0b43" };

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

// ---------------------------------------------------------------- utilidades

function consultar(sql, params = []) {
	return new Promise((resolver, rechazar) => {
		conexion.query(sql, params, (error, filas) => (error ? rechazar(error) : resolver(filas)));
	});
}

function crearContexto() {
	const avisos = [];
	return {
		avisos,
		async q(nombre, sql, params = []) {
			try {
				return await consultar(sql, params);
			} catch (error) {
				console.error(`Reportes - ${nombre}:`, error);
				avisos.push(`${nombre}: ${error.sqlMessage || error.message}`);
				return [];
			}
		},
		async uno(nombre, sql, params = []) {
			const filas = await this.q(nombre, sql, params);
			return filas[0] || {};
		}
	};
}

function fechaDesde(periodo) {
	const d = new Date();
	if (periodo === "mes") d.setMonth(d.getMonth() - 1);
	else if (periodo === "trimestre") d.setMonth(d.getMonth() - 3);
	else d.setFullYear(d.getFullYear() - 1);
	return d.toISOString().slice(0, 10);
}

const etiquetaMes = (clave) => `${MESES[Number(clave.slice(5, 7)) - 1] || clave} ${clave.slice(0, 4)}`;

// Para "Mes" se agrupa por día; para "Trimestre" y "Año", por mes
function grupo(periodo) {
	return periodo === "mes"
		? { sql: "%Y-%m-%d", etiqueta: (k) => `${k.slice(8, 10)}/${k.slice(5, 7)}`, texto: "por día" }
		: { sql: "%Y-%m", etiqueta: etiquetaMes, texto: "por mes" };
}

const num = (n) => Number(n) || 0;
const dinero = (n) => "L " + num(n).toLocaleString("es-HN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function claveEstado(valor) {
	const v = String(valor ?? "").toLowerCase().normalize("NFD").replace(/[^a-z]/g, "");
	if (v.startsWith("pend")) return "Pendiente";
	if (v.startsWith("enproc") || v.startsWith("proc")) return "En proceso";
	if (v.startsWith("term")) return "Terminado";
	if (v.startsWith("entr")) return "Entregado";
	return valor ? String(valor) : "Sin estado";
}

function contarEstados(filas) {
	const conteo = Object.fromEntries(ESTADOS.map((e) => [e, 0]));
	filas.forEach((f) => {
		const clave = claveEstado(f.estado);
		conteo[clave] = (conteo[clave] || 0) + num(f.cantidad);
	});
	return conteo;
}

function serie(filas, campoEtiqueta, campoValor, colores) {
	const etiquetas = filas.map((f) => f[campoEtiqueta] ?? "Sin dato");
	return {
		etiquetas,
		valores: filas.map((f) => num(f[campoValor])),
		colores: colores ? etiquetas.map((e) => colores[e]) : undefined
	};
}

const esEntregado = (alias = "") => `LOWER(${alias}${E.estado}) LIKE 'entreg%'`;

// ---------------------------------------------------------------- ENCARGOS

async function reporteEncargos(periodo, ctx) {
	const desde = fechaDesde(periodo);
	const g = grupo(periodo);

	const filasEstado = await ctx.q("Encargos por estado",
		`SELECT ${E.estado} AS estado, COUNT(*) AS cantidad
		 FROM ${E.tabla} WHERE ${E.fecha} >= ? GROUP BY ${E.estado}`, [desde]);

	const porFecha = await ctx.q("Encargos por fecha",
		`SELECT DATE_FORMAT(${E.fecha}, '${g.sql}') AS clave, COUNT(*) AS cantidad
		 FROM ${E.tabla} WHERE ${E.fecha} >= ? GROUP BY clave ORDER BY clave`, [desde]);

	const porPrenda = await ctx.q("Tipos de prenda",
		`SELECT COALESCE(${E.prenda}, 'Sin dato') AS etiqueta, COUNT(*) AS cantidad
		 FROM ${E.tabla} WHERE ${E.fecha} >= ? GROUP BY etiqueta ORDER BY cantidad DESC LIMIT 8`, [desde]);

	const detalle = await ctx.q("Detalle de encargos",
		`SELECT e.${E.id} AS id, COALESCE(c.${C.nombre}, '—') AS cliente, e.${E.prenda} AS prenda,
		        e.${E.estado} AS estado, DATE_FORMAT(e.${E.fecha}, '%d/%m/%Y') AS fecha, e.${E.total} AS total
		 FROM ${E.tabla} e LEFT JOIN ${C.tabla} c ON c.${C.id} = e.${E.cliente}
		 WHERE e.${E.fecha} >= ? ORDER BY e.${E.fecha} DESC LIMIT 300`, [desde]);

	const estados = contarEstados(filasEstado);
	const total = Object.values(estados).reduce((a, b) => a + b, 0);
	const entregados = estados["Entregado"] || 0;

	return {
		tarjetas: [
			{ icono: "bi-clipboard2-plus", titulo: "Total de encargos", valor: total, sub: "En el periodo" },
			{ icono: "bi-activity", titulo: "Encargos activos", valor: total - entregados, sub: "Aún sin entregar" },
			{ icono: "bi-clipboard2-check", titulo: "Entregados", valor: entregados, sub: "Encargos completados" },
			{ icono: "bi-percent", titulo: "Tasa de finalización", valor: (total ? Math.round((entregados / total) * 100) : 0) + "%", sub: "Entregados / total" }
		],
		barras: { titulo: "Encargos", sub: `Cantidad de encargos ${g.texto}`, etiquetas: porFecha.map((f) => g.etiqueta(String(f.clave))), valores: porFecha.map((f) => num(f.cantidad)) },
		pastel1: { titulo: "Estado de los encargos", sub: "Pendiente, en proceso, terminado y entregado", etiquetas: ESTADOS.slice(), valores: ESTADOS.map((e) => estados[e]), colores: ESTADOS.map((e) => COLOR_ESTADO[e]) },
		pastel2: { titulo: "Tipos de prenda solicitados", sub: "Prendas más pedidas", ...serie(porPrenda, "etiqueta", "cantidad") },
		tabla: {
			titulo: "Detalle de encargos",
			columnas: ["N°", "Cliente", "Prenda", "Estado", "Fecha", "Total"],
			filas: detalle.map((f) => [f.id, f.cliente, f.prenda || "—", claveEstado(f.estado), f.fecha, dinero(f.total)])
		}
	};
}

// ---------------------------------------------------------------- VENTAS
// Se consideran ventas los encargos con estado "Entregado" (suma de su total).

async function reporteVentas(periodo, ctx) {
	const desde = fechaDesde(periodo);
	const g = grupo(periodo);

	const resumen = await ctx.uno("Resumen de ventas",
		`SELECT COUNT(*) AS cantidad, COALESCE(SUM(${E.total}), 0) AS suma, COALESCE(AVG(${E.total}), 0) AS promedio,
		        COUNT(DISTINCT ${E.cliente}) AS clientes
		 FROM ${E.tabla} WHERE ${esEntregado()} AND ${E.fecha} >= ?`, [desde]);

	const porFecha = await ctx.q("Ingresos por fecha",
		`SELECT DATE_FORMAT(${E.fecha}, '${g.sql}') AS clave, COALESCE(SUM(${E.total}), 0) AS suma
		 FROM ${E.tabla} WHERE ${esEntregado()} AND ${E.fecha} >= ? GROUP BY clave ORDER BY clave`, [desde]);

	const porPrenda = await ctx.q("Ventas por prenda",
		`SELECT COALESCE(${E.prenda}, 'Sin dato') AS etiqueta, COALESCE(SUM(${E.total}), 0) AS suma
		 FROM ${E.tabla} WHERE ${esEntregado()} AND ${E.fecha} >= ? GROUP BY etiqueta ORDER BY suma DESC LIMIT 8`, [desde]);

	const porCliente = await ctx.q("Mejores clientes",
		`SELECT COALESCE(c.${C.nombre}, 'Sin cliente') AS etiqueta, COALESCE(SUM(e.${E.total}), 0) AS suma
		 FROM ${E.tabla} e LEFT JOIN ${C.tabla} c ON c.${C.id} = e.${E.cliente}
		 WHERE ${esEntregado("e.")} AND e.${E.fecha} >= ? GROUP BY etiqueta ORDER BY suma DESC LIMIT 5`, [desde]);

	const detalle = await ctx.q("Detalle de ventas",
		`SELECT e.${E.id} AS id, COALESCE(c.${C.nombre}, '—') AS cliente, e.${E.prenda} AS prenda,
		        DATE_FORMAT(e.${E.fecha}, '%d/%m/%Y') AS fecha, e.${E.total} AS total
		 FROM ${E.tabla} e LEFT JOIN ${C.tabla} c ON c.${C.id} = e.${E.cliente}
		 WHERE ${esEntregado("e.")} AND e.${E.fecha} >= ? ORDER BY e.${E.fecha} DESC LIMIT 300`, [desde]);

	return {
		tarjetas: [
			{ icono: "bi-cash-stack", titulo: "Ventas totales", valor: dinero(resumen.suma), sub: "En el periodo" },
			{ icono: "bi-bag-check", titulo: "Ventas realizadas", valor: num(resumen.cantidad), sub: "Encargos entregados" },
			{ icono: "bi-receipt", titulo: "Venta promedio", valor: dinero(resumen.promedio), sub: "Por encargo" },
			{ icono: "bi-people", titulo: "Clientes atendidos", valor: num(resumen.clientes), sub: "Con compras en el periodo" }
		],
		barras: { titulo: "Ingresos", sub: `Ventas en lempiras ${g.texto}`, dinero: true, etiquetas: porFecha.map((f) => g.etiqueta(String(f.clave))), valores: porFecha.map((f) => num(f.suma)) },
		pastel1: { titulo: "Ventas por tipo de prenda", sub: "Ingresos por prenda", dinero: true, ...serie(porPrenda, "etiqueta", "suma") },
		pastel2: { titulo: "Mejores clientes", sub: "Top 5 por monto", dinero: true, ...serie(porCliente, "etiqueta", "suma") },
		tabla: {
			titulo: "Detalle de ventas",
			columnas: ["N°", "Cliente", "Prenda", "Fecha", "Total"],
			filas: detalle.map((f) => [f.id, f.cliente, f.prenda || "—", f.fecha, dinero(f.total)])
		}
	};
}

// ---------------------------------------------------------------- PAGOS

async function reportePagos(periodo, ctx) {
	const desde = fechaDesde(periodo);
	const g = grupo(periodo);

	const resumen = await ctx.uno("Resumen de pagos",
		`SELECT COUNT(*) AS cantidad, COALESCE(SUM(${P.monto}), 0) AS suma, COALESCE(AVG(${P.monto}), 0) AS promedio
		 FROM ${P.tabla} WHERE ${P.fecha} >= ?`, [desde]);

	const pendiente = await ctx.uno("Saldo pendiente",
		`SELECT COALESCE(SUM(e.${E.total} - COALESCE(p.pagado, 0)), 0) AS saldo
		 FROM ${E.tabla} e
		 LEFT JOIN (SELECT ${P.encargo} AS id_enc, SUM(${P.monto}) AS pagado FROM ${P.tabla} GROUP BY ${P.encargo}) p
		        ON p.id_enc = e.${E.id}
		 WHERE e.${E.total} > COALESCE(p.pagado, 0)`);

	const porFecha = await ctx.q("Pagos por fecha",
		`SELECT DATE_FORMAT(${P.fecha}, '${g.sql}') AS clave, COALESCE(SUM(${P.monto}), 0) AS suma
		 FROM ${P.tabla} WHERE ${P.fecha} >= ? GROUP BY clave ORDER BY clave`, [desde]);

	const porMetodo = await ctx.q("Pagos por método",
		`SELECT COALESCE(${P.metodo}, 'Sin dato') AS etiqueta, COALESCE(SUM(${P.monto}), 0) AS suma, COUNT(*) AS cantidad
		 FROM ${P.tabla} WHERE ${P.fecha} >= ? GROUP BY etiqueta ORDER BY suma DESC`, [desde]);

	const detalle = await ctx.q("Detalle de pagos",
		`SELECT p.${P.id} AS id, COALESCE(c.${C.nombre}, '—') AS cliente, p.${P.metodo} AS metodo,
		        DATE_FORMAT(p.${P.fecha}, '%d/%m/%Y') AS fecha, p.${P.monto} AS monto
		 FROM ${P.tabla} p
		 LEFT JOIN ${E.tabla} e ON e.${E.id} = p.${P.encargo}
		 LEFT JOIN ${C.tabla} c ON c.${C.id} = e.${E.cliente}
		 WHERE p.${P.fecha} >= ? ORDER BY p.${P.fecha} DESC LIMIT 300`, [desde]);

	return {
		tarjetas: [
			{ icono: "bi-cash-coin", titulo: "Total cobrado", valor: dinero(resumen.suma), sub: "En el periodo" },
			{ icono: "bi-receipt", titulo: "Pagos registrados", valor: num(resumen.cantidad), sub: "Cantidad de pagos" },
			{ icono: "bi-calculator", titulo: "Pago promedio", valor: dinero(resumen.promedio), sub: "Por pago" },
			{ icono: "bi-exclamation-circle", titulo: "Saldo pendiente", valor: dinero(pendiente.saldo), sub: "Por cobrar (todos los encargos)" }
		],
		barras: { titulo: "Pagos", sub: `Monto cobrado ${g.texto}`, dinero: true, etiquetas: porFecha.map((f) => g.etiqueta(String(f.clave))), valores: porFecha.map((f) => num(f.suma)) },
		pastel1: { titulo: "Monto por método de pago", sub: "Lempiras cobrados", dinero: true, ...serie(porMetodo, "etiqueta", "suma") },
		pastel2: { titulo: "Pagos por método", sub: "Cantidad de pagos", ...serie(porMetodo, "etiqueta", "cantidad") },
		tabla: {
			titulo: "Detalle de pagos",
			columnas: ["N°", "Cliente", "Método", "Fecha", "Monto"],
			filas: detalle.map((f) => [f.id, f.cliente, f.metodo || "—", f.fecha, dinero(f.monto)])
		}
	};
}

// ---------------------------------------------------------------- INVENTARIO
// El inventario es el estado actual, por eso no depende del periodo.

async function reporteInventario(periodo, ctx) {
	const resumen = await ctx.uno("Resumen de inventario",
		`SELECT COUNT(*) AS articulos, COALESCE(SUM(${I.cantidad}), 0) AS unidades,
		        COALESCE(SUM(${I.cantidad} <= ${I.minimo}), 0) AS bajos,
		        COALESCE(SUM(${I.cantidad} * ${I.precio}), 0) AS valor
		 FROM ${I.tabla}`);

	const topStock = await ctx.q("Artículos con más existencias",
		`SELECT ${I.nombre} AS etiqueta, ${I.cantidad} AS cantidad FROM ${I.tabla} ORDER BY ${I.cantidad} DESC LIMIT 8`);

	const situacion = await ctx.q("Estado del stock",
		`SELECT CASE WHEN ${I.cantidad} <= ${I.minimo} THEN 'Stock bajo' ELSE 'Stock normal' END AS etiqueta, COUNT(*) AS cantidad
		 FROM ${I.tabla} GROUP BY etiqueta`);

	const porCategoria = await ctx.q("Unidades por categoría",
		`SELECT COALESCE(${I.categoria}, 'Sin categoría') AS etiqueta, SUM(${I.cantidad}) AS unidades
		 FROM ${I.tabla} GROUP BY etiqueta ORDER BY unidades DESC LIMIT 8`);

	const detalle = await ctx.q("Detalle de inventario",
		`SELECT ${I.nombre} AS nombre, ${I.categoria} AS categoria, ${I.cantidad} AS cantidad, ${I.minimo} AS minimo, ${I.precio} AS precio
		 FROM ${I.tabla} ORDER BY ${I.nombre} LIMIT 300`);

	return {
		tarjetas: [
			{ icono: "bi-box-seam", titulo: "Artículos", valor: num(resumen.articulos), sub: "Registrados" },
			{ icono: "bi-stack", titulo: "Unidades en stock", valor: num(resumen.unidades), sub: "Total disponible" },
			{ icono: "bi-exclamation-triangle", titulo: "Stock bajo", valor: num(resumen.bajos), sub: "Por reabastecer" },
			{ icono: "bi-currency-dollar", titulo: "Valor del inventario", valor: dinero(resumen.valor), sub: "Cantidad x precio" }
		],
		barras: { titulo: "Existencias", sub: "Artículos con más unidades disponibles", ...serie(topStock, "etiqueta", "cantidad") },
		pastel1: { titulo: "Estado del stock", sub: "Normal o por reabastecer", ...serie(situacion, "etiqueta", "cantidad", COLOR_STOCK) },
		pastel2: { titulo: "Unidades por categoría", sub: "Distribución del inventario", ...serie(porCategoria, "etiqueta", "unidades") },
		tabla: {
			titulo: "Detalle de inventario",
			columnas: ["Artículo", "Categoría", "Cantidad", "Stock mínimo", "Precio"],
			filas: detalle.map((f) => [f.nombre, f.categoria || "—", f.cantidad, f.minimo, dinero(f.precio)])
		}
	};
}

// ---------------------------------------------------------------- API del modelo

async function obtenerReporte(tipo, periodo) {
	const ctx = crearContexto();
	const reportes = {
		encargos: reporteEncargos,
		ventas: reporteVentas,
		pagos: reportePagos,
		inventario: reporteInventario
	};
	const resultado = await (reportes[tipo] || reporteEncargos)(periodo, ctx);
	resultado.avisos = ctx.avisos;
	return resultado;
}

module.exports = {
	obtenerReporte
};
