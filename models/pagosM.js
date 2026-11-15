

const conexion = require("../database");

const METODOS_VALIDOS = [
    "Efectivo",
    "Tarjeta",
    "Transferencia"
];

const ESTADOS_VALIDOS = [
    "Pendiente",
    "Pagado",
    "Cancelado"
];

function crearError(mensaje, codigo = "VALIDACION_PAGO") {
    const error = new Error(mensaje);
    error.code = codigo;
    return error;
}

function validarPago(pago) {
    const idVenta = Number(pago.id_venta);
    const monto = Number(pago.monto);

    if (!Number.isInteger(idVenta) || idVenta <= 0) {
        throw crearError("El ID de venta debe ser un entero positivo.");
    }

    if (
        !Number.isFinite(monto) ||
        monto <= 0 ||
        monto > 99999999.99
    ) {
        throw crearError("El monto debe ser mayor que cero y válido para DECIMAL(10,2).");
    }

    if (Math.abs(monto * 100 - Math.round(monto * 100)) > 0.000001) {
        throw crearError("El monto solo puede tener dos decimales.");
    }

    if (!METODOS_VALIDOS.includes(pago.metodo_pago)) {
        throw crearError("El método de pago no es válido.");
    }

    if (!ESTADOS_VALIDOS.includes(pago.estado_pago)) {
        throw crearError("El estado del pago no es válido.");
    }

    return {
        id_venta: idVenta,
        monto: Number(monto.toFixed(2)),
        metodo_pago: pago.metodo_pago,
        estado_pago: pago.estado_pago
    };
}

// Consulta los pagos y calcula los abonos y saldos de cada venta.
function obtenerPagos(callback) {
    const sql = `
        SELECT
            p.id_pago,
            p.id_venta,
            p.fecha_pago,
            p.monto,
            p.metodo_pago,
            p.estado_pago,
            v.total AS total_venta,
            COALESCE(a.total_abonado, 0) AS total_abonado,
            GREATEST(
                v.total - COALESCE(a.total_abonado, 0),
                0
            ) AS saldo_pendiente
        FROM Pagos p
        INNER JOIN Ventas v
            ON p.id_venta = v.id_venta
        LEFT JOIN (
            SELECT
                id_venta,
                SUM(monto) AS total_abonado
            FROM Pagos
            WHERE estado_pago = 'Pagado'
            GROUP BY id_venta
        ) a ON a.id_venta = v.id_venta
        ORDER BY p.fecha_pago DESC
    `;

    conexion.query(sql, callback);
}

// Registra o actualiza un pago dentro de una transacción SQL.
function guardarPago(idPago, pago, callback) {
    let datos;

    try {
        datos = validarPago(pago);
    } catch (error) {
        return callback(error);
    }

    const id = idPago ? Number(idPago) : null;

    if (id !== null && (!Number.isInteger(id) || id <= 0)) {
        return callback(crearError("El ID del pago no es válido."));
    }

    // Este código requiere que database exporte un pool mysql2.
    conexion.getConnection((errorConexion, connection) => {
        if (errorConexion) {
            return callback(errorConexion);
        }

        connection.beginTransaction(errorInicio => {
            if (errorInicio) {
                connection.release();
                return callback(errorInicio);
            }

            const finalizarConError = error => {
                connection.rollback(() => {
                    connection.release();
                    callback(error);
                });
            };

            // Bloquea la venta mientras se valida y registra el pago.
            connection.query(
                `SELECT total FROM Ventas
                 WHERE id_venta = ?
                 FOR UPDATE`,
                [datos.id_venta],
                (errorVenta, ventas) => {
                    if (errorVenta) {
                        return finalizarConError(errorVenta);
                    }

                    if (ventas.length === 0) {
                        return finalizarConError(
                            crearError("La venta indicada no existe.", "VENTA_NO_EXISTE")
                        );
                    }

                    const totalVenta = Number(ventas[0].total);

                    const sqlAbonado = `
                        SELECT COALESCE(SUM(monto), 0) AS abonado
                        FROM Pagos
                        WHERE id_venta = ?
                          AND estado_pago = 'Pagado'
                          ${id !== null ? "AND id_pago <> ?" : ""}
                    `;

                    const parametrosAbonado =
                        id !== null
                            ? [datos.id_venta, id]
                            : [datos.id_venta];

                    connection.query(
                        sqlAbonado,
                        parametrosAbonado,
                        (errorAbonado, resultados) => {
                            if (errorAbonado) {
                                return finalizarConError(errorAbonado);
                            }

                            const abonado = Number(resultados[0].abonado);

                            // Solo los pagos Pagado reducen el saldo.
                            if (
                                datos.estado_pago === "Pagado" &&
                                abonado + datos.monto > totalVenta + 0.000001
                            ) {
                                return finalizarConError(
                                    crearError(
                                        `El pago supera el saldo disponible. Saldo actual: L. ${(totalVenta - abonado).toFixed(2)}.`,
                                        "SALDO_INSUFICIENTE"
                                    )
                                );
                            }

                            const sql = id !== null
                                ? `
                                    UPDATE Pagos
                                    SET id_venta = ?,
                                        monto = ?,
                                        metodo_pago = ?,
                                        estado_pago = ?
                                    WHERE id_pago = ?
                                `
                                : `
                                    INSERT INTO Pagos
                                        (id_venta, monto, metodo_pago, estado_pago)
                                    VALUES (?, ?, ?, ?)
                                `;

                            const parametros = id !== null
                                ? [
                                    datos.id_venta,
                                    datos.monto,
                                    datos.metodo_pago,
                                    datos.estado_pago,
                                    id
                                ]
                                : [
                                    datos.id_venta,
                                    datos.monto,
                                    datos.metodo_pago,
                                    datos.estado_pago
                                ];

                            connection.query(sql, parametros, (errorGuardar, resultado) => {
                                if (errorGuardar) {
                                    return finalizarConError(errorGuardar);
                                }

                                if (id !== null && resultado.affectedRows === 0) {
                                    return finalizarConError(
                                        crearError("El pago que intentas actualizar no existe.", "PAGO_NO_EXISTE")
                                    );
                                }

                                connection.commit(errorCommit => {
                                    if (errorCommit) {
                                        return finalizarConError(errorCommit);
                                    }

                                    connection.release();
                                    callback(null, resultado);
                                });
                            });
                        }
                    );
                }
            );
        });
    });
}

function crearPago(pago, callback) {
    guardarPago(null, pago, callback);
}

function actualizarPago(id, pago, callback) {
    guardarPago(id, pago, callback);
}

function eliminarPago(id, callback) {
    const idPago = Number(id);

    if (!Number.isInteger(idPago) || idPago <= 0) {
        return callback(crearError("El ID del pago no es válido."));
    }

    conexion.query(
        "DELETE FROM Pagos WHERE id_pago = ?",
        [idPago],
        callback
    );
}

module.exports = {
    obtenerPagos,
    crearPago,
    actualizarPago,
    eliminarPago
};
