const conexion = require("../database");

const ESTADOS_ENCARGO = ["Pendiente", "En proceso", "Terminado", "Entregado"];
const COLORES_ESTADO = ["#9b0b43", "#d97706", "#2563eb", "#16a34a"];
const COLORES_STOCK = { "Stock normal": "#16a34a", "Stock bajo": "#9b0b43" };
const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function consultar(sql, parametros = []) {
	return new Promise((resolver, rechazar) => {
		conexion.query(sql, parametros, (error, filas) => {
			if (error) {
				rechazar(error);
				return;
			}
			resolver(filas);
		});
	});
}

function fechaDesde(periodo) {
	const fecha = new Date();
	if (periodo === "mes") fecha.setMonth(fecha.getMonth() - 1);
	else if (periodo === "trimestre") fecha.setMonth(fecha.getMonth() - 3);
	else fecha.setFullYear(fecha.getFullYear() - 1);

	const anio = fecha.getFullYear();
	const mes = String(fecha.getMonth() + 1).padStart(2, "0");
	const dia = String(fecha.getDate()).padStart(2, "0");
	return `${anio}-${mes}-${dia}`;
}

function agrupacion(periodo) {
	if (periodo === "mes") {
		return { formato: "%Y-%m-%d", etiqueta: (clave) => `${clave.slice(8, 10)}/${clave.slice(5, 7)}`, texto: "por día" };
	}
	return {
		formato: "%Y-%m",
		etiqueta: (clave) => `${MESES[Number(clave.slice(5, 7)) - 1] || clave} ${clave.slice(0, 4)}`,
		texto: "por mes"
	};
}

const numero = (valor) => Number(valor) || 0;
const dinero = (valor) => `L ${numero(valor).toLocaleString("es-HN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function serie(filas, campoEtiqueta, campoValor, colores) {
	const etiquetas = filas.map((fila) => fila[campoEtiqueta] ?? "Sin dato");
	return {
		etiquetas,
		valores: filas.map((fila) => numero(fila[campoValor])),
		colores: colores ? etiquetas.map((etiqueta) => colores[etiqueta]) : undefined
	};
}

async function reporteEncargos(periodo) {
	const desde = fechaDesde(periodo);
	const grupo = agrupacion(periodo);
	const [porEstado, porFecha, porProducto, detalle] = await Promise.all([
		consultar(
			"SELECT estado, COUNT(*) AS cantidad FROM Pedidos_C WHERE fecha_pedido >= ? GROUP BY estado",
			[desde]
		),
		consultar(
			`SELECT DATE_FORMAT(fecha_pedido, '${grupo.formato}') AS clave, COUNT(*) AS cantidad
			 FROM Pedidos_C WHERE fecha_pedido >= ? GROUP BY clave ORDER BY clave`,
			[desde]
		),
		consultar(
			`SELECT pr.nombre AS etiqueta, SUM(dp.cantidad) AS cantidad
			 FROM Detalle_Pedido dp
			 INNER JOIN Pedidos_C pc ON pc.id_pedido_c = dp.id_pedido_c
			 INNER JOIN Productos pr ON pr.id_producto = dp.id_producto
			 WHERE pc.fecha_pedido >= ?
			 GROUP BY pr.id_producto, pr.nombre ORDER BY cantidad DESC LIMIT 8`,
			[desde]
		),
		consultar(
			`SELECT pc.id_pedido_c AS id, c.nombre AS cliente,
			        COALESCE(productos.nombres, 'Sin productos') AS productos,
			        pc.estado, DATE_FORMAT(pc.fecha_pedido, '%d/%m/%Y') AS fecha, pc.total
			 FROM Pedidos_C pc
			 INNER JOIN Clientes c ON c.id_cliente = pc.id_cliente
			 LEFT JOIN (
			     SELECT dp.id_pedido_c, GROUP_CONCAT(DISTINCT pr.nombre ORDER BY pr.nombre SEPARATOR ', ') AS nombres
			     FROM Detalle_Pedido dp
			     INNER JOIN Productos pr ON pr.id_producto = dp.id_producto
			     GROUP BY dp.id_pedido_c
			 ) productos ON productos.id_pedido_c = pc.id_pedido_c
			 WHERE pc.fecha_pedido >= ?
			 ORDER BY pc.fecha_pedido DESC, pc.id_pedido_c DESC LIMIT 300`,
			[desde]
		)
	]);

	const estados = Object.fromEntries(ESTADOS_ENCARGO.map((estado) => [estado, 0]));
	porEstado.forEach((fila) => {
		if (Object.hasOwn(estados, fila.estado)) estados[fila.estado] = numero(fila.cantidad);
	});
	const total = Object.values(estados).reduce((suma, cantidad) => suma + cantidad, 0);
	const entregados = estados.Entregado;

	return {
		tarjetas: [
			{ icono: "bi-clipboard2-plus", titulo: "Total de encargos", valor: total, sub: "En el periodo" },
			{ icono: "bi-activity", titulo: "Encargos activos", valor: total - entregados, sub: "Aún sin entregar" },
			{ icono: "bi-clipboard2-check", titulo: "Entregados", valor: entregados, sub: "Encargos completados" },
			{ icono: "bi-percent", titulo: "Tasa de finalización", valor: `${total ? Math.round((entregados / total) * 100) : 0}%`, sub: "Entregados / total" }
		],
		barras: {
			titulo: "Encargos",
			sub: `Cantidad de encargos ${grupo.texto}`,
			etiquetas: porFecha.map((fila) => grupo.etiqueta(String(fila.clave))),
			valores: porFecha.map((fila) => numero(fila.cantidad))
		},
		pastel1: {
			titulo: "Estado de los encargos",
			sub: "Pendiente, en proceso, terminado y entregado",
			etiquetas: ESTADOS_ENCARGO,
			valores: ESTADOS_ENCARGO.map((estado) => estados[estado]),
			colores: COLORES_ESTADO
		},
		pastel2: { titulo: "Productos en encargos", sub: "Unidades incluidas en los pedidos", ...serie(porProducto, "etiqueta", "cantidad") },
		tabla: {
			titulo: "Detalle de encargos",
			columnas: ["N°", "Cliente", "Productos", "Estado", "Fecha", "Total"],
			filas: detalle.map((fila) => [fila.id, fila.cliente, fila.productos, fila.estado, fila.fecha, dinero(fila.total)])
		}
	};
}

async function reporteVentas(periodo) {
	const desde = fechaDesde(periodo);
	const grupo = agrupacion(periodo);
	const [resumenFilas, porFecha, porProducto, porCliente, detalle] = await Promise.all([
		consultar(
			`SELECT COUNT(*) AS cantidad, COALESCE(SUM(total), 0) AS suma,
			        COALESCE(AVG(total), 0) AS promedio, COUNT(DISTINCT id_cliente) AS clientes
			 FROM Ventas WHERE fecha_venta >= ?`,
			[desde]
		),
		consultar(
			`SELECT DATE_FORMAT(fecha_venta, '${grupo.formato}') AS clave, COALESCE(SUM(total), 0) AS suma
			 FROM Ventas WHERE fecha_venta >= ? GROUP BY clave ORDER BY clave`,
			[desde]
		),
		consultar(
			`SELECT pr.nombre AS etiqueta, COALESCE(SUM(dv.subtotal), 0) AS suma
			 FROM Detalle_Ventas dv
			 INNER JOIN Ventas v ON v.id_venta = dv.id_venta
			 INNER JOIN Productos pr ON pr.id_producto = dv.id_producto
			 WHERE v.fecha_venta >= ?
			 GROUP BY pr.id_producto, pr.nombre ORDER BY suma DESC LIMIT 8`,
			[desde]
		),
		consultar(
			`SELECT COALESCE(c.nombre, 'Venta sin cliente') AS etiqueta, SUM(v.total) AS suma
			 FROM Ventas v LEFT JOIN Clientes c ON c.id_cliente = v.id_cliente
			 WHERE v.fecha_venta >= ? GROUP BY v.id_cliente, c.nombre ORDER BY suma DESC LIMIT 5`,
			[desde]
		),
		consultar(
			`SELECT v.id_venta AS id, COALESCE(c.nombre, 'Venta sin cliente') AS cliente,
			        COALESCE(productos.nombres, 'Sin productos') AS productos,
			        DATE_FORMAT(v.fecha_venta, '%d/%m/%Y') AS fecha, v.total
			 FROM Ventas v LEFT JOIN Clientes c ON c.id_cliente = v.id_cliente
			 LEFT JOIN (
			     SELECT dv.id_venta, GROUP_CONCAT(DISTINCT pr.nombre ORDER BY pr.nombre SEPARATOR ', ') AS nombres
			     FROM Detalle_Ventas dv
			     INNER JOIN Productos pr ON pr.id_producto = dv.id_producto
			     GROUP BY dv.id_venta
			 ) productos ON productos.id_venta = v.id_venta
			 WHERE v.fecha_venta >= ?
			 ORDER BY v.fecha_venta DESC, v.id_venta DESC LIMIT 300`,
			[desde]
		)
	]);
	const resumen = resumenFilas[0];

	return {
		tarjetas: [
			{ icono: "bi-cash-stack", titulo: "Ventas totales", valor: dinero(resumen.suma), sub: "En el periodo" },
			{ icono: "bi-bag-check", titulo: "Ventas realizadas", valor: numero(resumen.cantidad), sub: "Registradas en el sistema" },
			{ icono: "bi-receipt", titulo: "Venta promedio", valor: dinero(resumen.promedio), sub: "Por venta" },
			{ icono: "bi-people", titulo: "Clientes atendidos", valor: numero(resumen.clientes), sub: "Con compras en el periodo" }
		],
		barras: {
			titulo: "Ingresos por ventas",
			sub: `Ventas en lempiras ${grupo.texto}`,
			dinero: true,
			etiquetas: porFecha.map((fila) => grupo.etiqueta(String(fila.clave))),
			valores: porFecha.map((fila) => numero(fila.suma))
		},
		pastel1: { titulo: "Ventas por producto", sub: "Ingresos por producto", dinero: true, ...serie(porProducto, "etiqueta", "suma") },
		pastel2: { titulo: "Mejores clientes", sub: "Top 5 por monto vendido", dinero: true, ...serie(porCliente, "etiqueta", "suma") },
		tabla: {
			titulo: "Detalle de ventas",
			columnas: ["N°", "Cliente", "Productos", "Fecha", "Total"],
			filas: detalle.map((fila) => [fila.id, fila.cliente, fila.productos, fila.fecha, dinero(fila.total)])
		}
	};
}

async function reportePagos(periodo) {
	const desde = fechaDesde(periodo);
	const grupo = agrupacion(periodo);
	const [resumenFilas, pendienteFilas, porFecha, porMetodo, porEstado, detalle] = await Promise.all([
		consultar(
			`SELECT COUNT(CASE WHEN estado_pago <> 'Cancelado' THEN 1 END) AS cantidad,
			        COALESCE(SUM(CASE WHEN estado_pago = 'Pagado' THEN monto ELSE 0 END), 0) AS suma,
			        COALESCE(AVG(CASE WHEN estado_pago = 'Pagado' THEN monto END), 0) AS promedio
			 FROM Pagos WHERE fecha_pago >= ?`,
			[desde]
		),
		consultar(
			`SELECT COALESCE(SUM(GREATEST(v.total - COALESCE(p.pagado, 0), 0)), 0) AS saldo
			 FROM Ventas v
			 LEFT JOIN (
			     SELECT id_venta, SUM(monto) AS pagado FROM Pagos
			     WHERE estado_pago = 'Pagado' GROUP BY id_venta
			 ) p ON p.id_venta = v.id_venta`
		),
		consultar(
			`SELECT DATE_FORMAT(fecha_pago, '${grupo.formato}') AS clave, COALESCE(SUM(monto), 0) AS suma
			 FROM Pagos WHERE estado_pago = 'Pagado' AND fecha_pago >= ?
			 GROUP BY clave ORDER BY clave`,
			[desde]
		),
		consultar(
			`SELECT metodo_pago AS etiqueta,
			        COALESCE(SUM(CASE WHEN estado_pago = 'Pagado' THEN monto ELSE 0 END), 0) AS suma,
			        COUNT(*) AS cantidad
			 FROM Pagos WHERE fecha_pago >= ?
			 GROUP BY metodo_pago ORDER BY suma DESC`,
			[desde]
		),
		consultar(
			"SELECT estado_pago AS etiqueta, COUNT(*) AS cantidad FROM Pagos WHERE fecha_pago >= ? GROUP BY estado_pago",
			[desde]
		),
		consultar(
			`SELECT p.id_pago AS id, COALESCE(c.nombre, 'Venta sin cliente') AS cliente,
			        p.metodo_pago AS metodo, p.estado_pago AS estado,
			        DATE_FORMAT(p.fecha_pago, '%d/%m/%Y') AS fecha, p.monto
			 FROM Pagos p
			 INNER JOIN Ventas v ON v.id_venta = p.id_venta
			 LEFT JOIN Clientes c ON c.id_cliente = v.id_cliente
			 WHERE p.fecha_pago >= ?
			 ORDER BY p.fecha_pago DESC, p.id_pago DESC LIMIT 300`,
			[desde]
		)
	]);
	const resumen = resumenFilas[0];

	return {
		tarjetas: [
			{ icono: "bi-cash-coin", titulo: "Total cobrado", valor: dinero(resumen.suma), sub: "Pagos confirmados en el periodo" },
			{ icono: "bi-receipt", titulo: "Pagos registrados", valor: numero(resumen.cantidad), sub: "Excluye pagos cancelados" },
			{ icono: "bi-calculator", titulo: "Pago promedio", valor: dinero(resumen.promedio), sub: "Por pago confirmado" },
			{ icono: "bi-exclamation-circle", titulo: "Saldo pendiente", valor: dinero(pendienteFilas[0].saldo), sub: "Saldo pendiente de las ventas" }
		],
		barras: {
			titulo: "Pagos confirmados",
			sub: `Monto cobrado ${grupo.texto}`,
			dinero: true,
			etiquetas: porFecha.map((fila) => grupo.etiqueta(String(fila.clave))),
			valores: porFecha.map((fila) => numero(fila.suma))
		},
		pastel1: { titulo: "Monto por método de pago", sub: "Lempiras en pagos confirmados", dinero: true, ...serie(porMetodo, "etiqueta", "suma") },
		pastel2: { titulo: "Estado de los pagos", sub: "Pagado, pendiente o cancelado", ...serie(porEstado, "etiqueta", "cantidad") },
		tabla: {
			titulo: "Detalle de pagos",
			columnas: ["N°", "Cliente", "Método", "Estado", "Fecha", "Monto"],
			filas: detalle.map((fila) => [fila.id, fila.cliente, fila.metodo, fila.estado, fila.fecha, dinero(fila.monto)])
		}
	};
}

async function reporteInventario() {
	const [resumenFilas, topStock, situacion, valorPorProducto, detalle] = await Promise.all([
		consultar(
			`SELECT COUNT(*) AS articulos, COALESCE(SUM(COALESCE(i.stock, 0)), 0) AS unidades,
			        COALESCE(SUM(COALESCE(i.stock, 0) <= p.stock_minimo), 0) AS bajos,
			        COALESCE(SUM(COALESCE(i.stock, 0) * p.precio), 0) AS valor
			 FROM Productos p LEFT JOIN Inventario i ON i.id_producto = p.id_producto`
		),
		consultar(
			`SELECT p.nombre AS etiqueta, COALESCE(i.stock, 0) AS cantidad
			 FROM Productos p LEFT JOIN Inventario i ON i.id_producto = p.id_producto
			 ORDER BY cantidad DESC, p.nombre LIMIT 8`
		),
		consultar(
			`SELECT CASE WHEN COALESCE(i.stock, 0) <= p.stock_minimo THEN 'Stock bajo' ELSE 'Stock normal' END AS etiqueta,
			        COUNT(*) AS cantidad
			 FROM Productos p LEFT JOIN Inventario i ON i.id_producto = p.id_producto
			 GROUP BY etiqueta`
		),
		consultar(
			`SELECT p.nombre AS etiqueta, COALESCE(i.stock, 0) * p.precio AS valor
			 FROM Productos p LEFT JOIN Inventario i ON i.id_producto = p.id_producto
			 ORDER BY valor DESC, p.nombre LIMIT 8`
		),
		consultar(
			`SELECT p.nombre, p.descripcion, COALESCE(i.stock, 0) AS stock, p.stock_minimo, p.precio
			 FROM Productos p LEFT JOIN Inventario i ON i.id_producto = p.id_producto
			 ORDER BY p.nombre LIMIT 300`
		)
	]);
	const resumen = resumenFilas[0];

	return {
		tarjetas: [
			{ icono: "bi-box-seam", titulo: "Artículos", valor: numero(resumen.articulos), sub: "Productos registrados" },
			{ icono: "bi-stack", titulo: "Unidades en stock", valor: numero(resumen.unidades), sub: "Total disponible" },
			{ icono: "bi-exclamation-triangle", titulo: "Stock bajo", valor: numero(resumen.bajos), sub: "Por reabastecer" },
			{ icono: "bi-currency-dollar", titulo: "Valor del inventario", valor: dinero(resumen.valor), sub: "Existencias por precio" }
		],
		barras: { titulo: "Existencias", sub: "Productos con más unidades disponibles", ...serie(topStock, "etiqueta", "cantidad") },
		pastel1: { titulo: "Estado del stock", sub: "Normal o por reabastecer", ...serie(situacion, "etiqueta", "cantidad", COLORES_STOCK) },
		pastel2: { titulo: "Valor por producto", sub: "Valor actual de las existencias", dinero: true, ...serie(valorPorProducto, "etiqueta", "valor") },
		tabla: {
			titulo: "Detalle de inventario",
			columnas: ["Artículo", "Descripción", "Cantidad", "Stock mínimo", "Precio"],
			filas: detalle.map((fila) => [fila.nombre, fila.descripcion || "—", fila.stock, fila.stock_minimo, dinero(fila.precio)])
		}
	};
}

async function obtenerReporte(tipo, periodo) {
	const reportes = {
		encargos: reporteEncargos,
		ventas: reporteVentas,
		pagos: reportePagos,
		inventario: reporteInventario
	};
	if (!Object.hasOwn(reportes, tipo)) throw new Error("El tipo de reporte solicitado no es válido.");
	if (!["mes", "trimestre", "anio"].includes(periodo)) throw new Error("El periodo del reporte no es válido.");
	return reportes[tipo](periodo);
}

module.exports = { obtenerReporte };
