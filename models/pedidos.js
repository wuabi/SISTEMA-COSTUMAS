const conexion = require("../database");

function obtenerClientes(callback) {
	const sql = `
		SELECT id_cliente AS id, nombre
		FROM Clientes
		ORDER BY nombre
	`;

	conexion.query(sql, callback);
}

function obtenerProveedores(callback) {
	const sql = `
		SELECT id_proveedor AS id, nombre_empresa AS nombre
		FROM Proveedores
		ORDER BY nombre_empresa
	`;

	conexion.query(sql, callback);
}

function obtenerOCrearProveedor(nombre, callback) {
	const nombreLimpio = String(nombre || "").trim();
	if (!nombreLimpio || nombreLimpio.length > 100) {
		callback(new Error("Ingresa un nombre de proveedor de hasta 100 caracteres."));
		return;
	}

	conexion.query(
		`SELECT id_proveedor AS id, nombre_empresa AS nombre
		FROM Proveedores
		WHERE LOWER(TRIM(nombre_empresa)) = LOWER(?)
		LIMIT 1`,
		[nombreLimpio],
		(error, resultados) => {
			if (error) {
				callback(error);
				return;
			}
			if (resultados.length) {
				callback(null, resultados[0], false);
				return;
			}

			conexion.query(
				"INSERT INTO Proveedores (nombre_empresa) VALUES (?)",
				[nombreLimpio],
				(errorInsercion, resultado) => {
					if (errorInsercion) {
						callback(errorInsercion);
						return;
					}
					callback(null, { id: resultado.insertId, nombre: nombreLimpio }, true);
				}
			);
		}
	);
}

function obtenerPedidosClientes(callback) {
	const sql = `
		SELECT
			p.id_pedido_c AS id,
			c.nombre,
			DATE_FORMAT(p.fecha_pedido, '%Y-%m-%d') AS fecha,
			p.total,
			p.estado
		FROM Pedidos_C p
		INNER JOIN Clientes c ON c.id_cliente = p.id_cliente
		ORDER BY p.fecha_pedido DESC, p.id_pedido_c DESC
	`;

	conexion.query(sql, callback);
}

function obtenerPedidosProveedores(callback) {
	const sql = `
		SELECT
			p.id_pedido_p AS id,
			pr.nombre_empresa AS nombre,
			DATE_FORMAT(p.fecha_pedido, '%Y-%m-%d') AS fecha,
			p.total,
			CASE WHEN p.estado = 'Entregado' THEN 'Recibido' ELSE 'Pedido' END AS estado,
			COUNT(dp.id_detalle_pedido_p) AS cantidad_articulos
		FROM Pedidos_P p
		INNER JOIN Proveedores pr ON pr.id_proveedor = p.id_proveedor
		LEFT JOIN Detalle_Pedido_P dp ON dp.id_pedido_p = p.id_pedido_p
		GROUP BY p.id_pedido_p, pr.nombre_empresa, p.fecha_pedido, p.total, p.estado
		ORDER BY p.fecha_pedido DESC, p.id_pedido_p DESC
	`;

	conexion.query(sql, callback);
}

function obtenerProductosProveedor(idProveedor, callback) {
	const sql = `
		SELECT id_producto AS id, nombre, descripcion
		FROM Productos
		WHERE id_proveedor = ?
		ORDER BY nombre
	`;

	conexion.query(sql, [idProveedor], callback);
}

function obtenerDetallePedidoProveedor(idPedido, callback) {
	const sql = `
		SELECT
			pr.nombre_empresa AS proveedor,
			p.id_pedido_p AS id,
			DATE_FORMAT(p.fecha_pedido, '%Y-%m-%d') AS fecha,
			p.total,
			p.estado,
			producto.nombre AS articulo,
			d.cantidad,
			d.precio_unitario,
			d.subtotal
		FROM Pedidos_P p
		INNER JOIN Proveedores pr ON pr.id_proveedor = p.id_proveedor
		LEFT JOIN Detalle_Pedido_P d ON d.id_pedido_p = p.id_pedido_p
		LEFT JOIN Productos producto ON producto.id_producto = d.id_producto
		WHERE p.id_pedido_p = ?
		ORDER BY producto.nombre
	`;

	conexion.query(sql, [idPedido], callback);
}

function crearPedidoCliente(pedido, callback) {
	const sql = `
		INSERT INTO Pedidos_C (id_cliente, fecha_pedido, estado, total)
		VALUES (?, ?, ?, ?)
	`;

	conexion.query(sql, [pedido.idEntidad, pedido.fecha, pedido.estado, pedido.total], callback);
}

function crearPedidoProveedor(pedido, callback) {
	const idProveedor = Number(pedido.idEntidad);
	if (!Number.isInteger(idProveedor) || idProveedor <= 0) {
		callback(new Error("Selecciona un proveedor válido."));
		return;
	}

	if (!/^\d{4}-\d{2}-\d{2}$/.test(String(pedido.fecha || ""))) {
		callback(new Error("Ingresa una fecha de compra válida."));
		return;
	}

	if (!["Pedido", "Recibido"].includes(pedido.estado)) {
		callback(new Error("Selecciona un estado válido para la compra."));
		return;
	}

	if (!Array.isArray(pedido.articulos) || pedido.articulos.length === 0) {
		callback(new Error("Agrega al menos un artículo a la compra."));
		return;
	}

	const articulos = pedido.articulos.map(articulo => ({
		id: Number(articulo.id),
		cantidad: Number(articulo.cantidad),
		precio: Number(articulo.precio)
	}));
	const idsArticulos = articulos.map(articulo => articulo.id);
	if (
		articulos.some(articulo =>
			!Number.isInteger(articulo.id) ||
			articulo.id <= 0 ||
			!Number.isInteger(articulo.cantidad) ||
			articulo.cantidad <= 0 ||
			articulo.cantidad > 2147483647 ||
			!Number.isFinite(articulo.precio) ||
			articulo.precio <= 0
		) ||
		new Set(idsArticulos).size !== idsArticulos.length
	) {
		callback(new Error("Revisa los artículos, las cantidades y los costos unitarios."));
		return;
	}

	const totalCentavos = articulos.reduce(
		(total, articulo) => total + Math.round(articulo.precio * 100) * articulo.cantidad,
		0
	);
	if (!Number.isSafeInteger(totalCentavos) || totalCentavos <= 0 || totalCentavos > 9999999999) {
		callback(new Error("El total de la compra no es válido."));
		return;
	}

	conexion.query(
		`SELECT id_producto
		FROM Productos
		WHERE id_proveedor = ? AND id_producto IN (${idsArticulos.map(() => "?").join(", ")})`,
		[idProveedor, ...idsArticulos],
		(error, productos) => {
			if (error) {
				callback(error);
				return;
			}

			if (productos.length !== idsArticulos.length) {
				callback(new Error("Uno o más artículos no pertenecen al proveedor seleccionado."));
				return;
			}

			conexion.beginTransaction(errorTransaccion => {
				if (errorTransaccion) {
					callback(errorTransaccion);
					return;
				}

				conexion.query(
					`INSERT INTO Pedidos_P (id_proveedor, fecha_pedido, estado, total)
					VALUES (?, ?, ?, ?)`,
					[
						idProveedor,
						pedido.fecha,
						pedido.estado === "Recibido" ? "Entregado" : "Pendiente",
						(totalCentavos / 100).toFixed(2)
					],
					(errorPedido, resultadoPedido) => {
						if (errorPedido) {
							deshacerCompra(errorPedido);
							return;
						}

						const valores = articulos.map(articulo => [
							resultadoPedido.insertId,
							articulo.id,
							articulo.cantidad,
							(Math.round(articulo.precio * 100) / 100).toFixed(2),
							((Math.round(articulo.precio * 100) * articulo.cantidad) / 100).toFixed(2)
						]);

						conexion.query(
							`INSERT INTO Detalle_Pedido_P
							(id_pedido_p, id_producto, cantidad, precio_unitario, subtotal)
							VALUES ?`,
							[valores],
							errorDetalle => {
								if (errorDetalle) {
									deshacerCompra(errorDetalle);
									return;
								}

								conexion.commit(errorCommit => {
									if (errorCommit) {
										deshacerCompra(errorCommit);
										return;
									}

									callback(null, resultadoPedido);
								});
							}
						);
					}
				);
			});
		}
	);

	function deshacerCompra(error) {
		conexion.rollback(errorRollback => {
			if (errorRollback) {
				console.error("No se pudo revertir la transacción de compra:", errorRollback);
			}
			callback(error);
		});
	}
}

function actualizarEstadoPedidoCliente(id, estado, callback) {
	conexion.query(
		"UPDATE Pedidos_C SET estado = ? WHERE id_pedido_c = ?",
		[estado, id],
		callback
	);
}

function actualizarEstadoPedidoEmpleado(id, estadoAnterior, estadoNuevo, callback) {
	const estadosPermitidos = ["En proceso", "Terminado"];
	if (!estadosPermitidos.includes(estadoAnterior) || !estadosPermitidos.includes(estadoNuevo)) {
		callback(new Error("El empleado solo puede cambiar el estado entre En proceso y Terminado."));
		return;
	}

	conexion.query(
		"UPDATE Pedidos_C SET estado = ? WHERE id_pedido_c = ? AND estado = ?",
		[estadoNuevo, id, estadoAnterior],
		function(error, resultado) {
			if (error) {
				callback(error);
				return;
			}

			if (resultado.affectedRows !== 1) {
				callback(new Error("El pedido cambió o ya no está disponible. Actualiza la lista e inténtalo de nuevo."));
				return;
			}

			callback(null, resultado);
		}
	);
}

function actualizarEstadoPedidoProveedor(id, estado, callback) {
	const estadosProveedor = {
		Pedido: "Pendiente",
		Recibido: "Entregado"
	};
	if (!Object.prototype.hasOwnProperty.call(estadosProveedor, estado)) {
		callback(new Error("El estado debe ser Pedido o Recibido."));
		return;
	}

	conexion.query(
		"UPDATE Pedidos_P SET estado = ? WHERE id_pedido_p = ?",
		[estadosProveedor[estado], id],
		callback
	);
}

module.exports = {
	obtenerClientes,
	obtenerProveedores,
	obtenerOCrearProveedor,
	obtenerProductosProveedor,
	obtenerPedidosClientes,
	obtenerPedidosProveedores,
	obtenerDetallePedidoProveedor,
	crearPedidoCliente,
	crearPedidoProveedor,
	actualizarEstadoPedidoCliente,
	actualizarEstadoPedidoEmpleado,
	actualizarEstadoPedidoProveedor
};
