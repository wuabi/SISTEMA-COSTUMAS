
const conexion = require("../database");

function obtenerPagos(callback) {
    const sql = `
        SELECT
            p.id_pago,
            p.id_venta,
            p.fecha_pago,
            p.monto,
            p.metodo_pago,
            p.estado_pago,
            COALESCE(v.total, 0) AS total_venta,
            COALESCE(abonos.total_abonado, 0) AS total_abonado,
            GREATEST(
                COALESCE(v.total, 0) - COALESCE(abonos.total_abonado, 0),
                0
            ) AS saldo_pendiente
        FROM Pagos AS p
        INNER JOIN Ventas AS v ON v.id_venta = p.id_venta
        LEFT JOIN (
            SELECT id_venta, SUM(monto) AS total_abonado
            FROM Pagos
            WHERE estado_pago = 'Pagado'
            GROUP BY id_venta
        ) AS abonos ON abonos.id_venta = p.id_venta
        ORDER BY p.fecha_pago DESC
    `;

    conexion.query(sql, callback);
}

function crearPago(pago, callback) {
    validarPago(pago, error => {
        if (error) return callback(error);

        conexion.beginTransaction(errorTransaccion => {
            if (errorTransaccion) return callback(errorTransaccion);

            conexion.query(
                "SELECT total FROM Ventas WHERE id_venta = ?",
                [pago.id_venta],
                (errorVenta, ventas) => {
                    if (errorVenta) return finalizarConError(errorVenta, callback);
                    if (!ventas.length) {
                        return finalizarConError(
                            crearError("VENTA_NO_EXISTE", "La venta indicada no existe."),
                            callback
                        );
                    }

                    conexion.query(
                        `SELECT COALESCE(SUM(monto), 0) AS total_abonado
                         FROM Pagos
                         WHERE id_venta = ? AND estado_pago = 'Pagado'`,
                        [pago.id_venta],
                        (errorSaldo, totales) => {
                            if (errorSaldo) return finalizarConError(errorSaldo, callback);

                            const totalVenta = Number(ventas[0].total);
                            const totalAbonado = Number(totales[0].total_abonado);

                            if (
                                pago.estado_pago === "Pagado" &&
                                totalAbonado + pago.monto > totalVenta
                            ) {
                                return finalizarConError(
                                    crearError(
                                        "SALDO_INSUFICIENTE",
                                        "El pago excede el saldo pendiente de la venta."
                                    ),
                                    callback
                                );
                            }

                            conexion.query(
                                `INSERT INTO Pagos
                                 (id_venta, monto, metodo_pago, estado_pago)
                                 VALUES (?, ?, ?, ?)`,
                                [
                                    pago.id_venta,
                                    pago.monto,
                                    pago.metodo_pago,
                                    pago.estado_pago
                                ],
                                (errorInsert, resultado) => {
                                    if (errorInsert) {
                                        return finalizarConError(errorInsert, callback);
                                    }

                                    conexion.commit(errorCommit => {
                                        if (errorCommit) {
                                            return finalizarConError(errorCommit, callback);
                                        }
                                        callback(null, resultado);
                                    });
                                }
                            );
                        }
                    );
                }
            );
        });
    });
}

function actualizarPago(id, pago, callback) {
    validarPago(pago, error => {
        if (error) return callback(error);

        conexion.beginTransaction(errorTransaccion => {
            if (errorTransaccion) return callback(errorTransaccion);

            conexion.query(
                "SELECT id_pago FROM Pagos WHERE id_pago = ?",
                [id],
                (errorExistencia, pagosExistentes) => {
                    if (errorExistencia) {
                        return finalizarConError(errorExistencia, callback);
                    }
                    if (!pagosExistentes.length) {
                        return finalizarConError(
                            crearError("PAGO_NO_EXISTE", "El pago seleccionado no existe."),
                            callback
                        );
                    }

                    conexion.query(
                        "SELECT total FROM Ventas WHERE id_venta = ?",
                        [pago.id_venta],
                        (errorVenta, ventas) => {
                            if (errorVenta) return finalizarConError(errorVenta, callback);
                            if (!ventas.length) {
                                return finalizarConError(
                                    crearError("VENTA_NO_EXISTE", "La venta indicada no existe."),
                                    callback
                                );
                            }

                            conexion.query(
                                `SELECT COALESCE(SUM(monto), 0) AS total_abonado
                                 FROM Pagos
                                 WHERE id_venta = ?
                                   AND estado_pago = 'Pagado'
                                   AND id_pago <> ?`,
                                [pago.id_venta, id],
                                (errorSaldo, totales) => {
                                    if (errorSaldo) return finalizarConError(errorSaldo, callback);

                                    const totalVenta = Number(ventas[0].total);
                                    const totalAbonado = Number(totales[0].total_abonado);

                                    if (
                                        pago.estado_pago === "Pagado" &&
                                        totalAbonado + pago.monto > totalVenta
                                    ) {
                                        return finalizarConError(
                                            crearError(
                                                "SALDO_INSUFICIENTE",
                                                "El pago excede el saldo pendiente de la venta."
                                            ),
                                            callback
                                        );
                                    }

                                    conexion.query(
                                        `UPDATE Pagos
                                         SET id_venta = ?, monto = ?,
                                             metodo_pago = ?, estado_pago = ?
                                         WHERE id_pago = ?`,
                                        [
                                            pago.id_venta,
                                            pago.monto,
                                            pago.metodo_pago,
                                            pago.estado_pago,
                                            id
                                        ],
                                        (errorUpdate, resultado) => {
                                            if (errorUpdate) {
                                                return finalizarConError(errorUpdate, callback);
                                            }

                                            conexion.commit(errorCommit => {
                                                if (errorCommit) {
                                                    return finalizarConError(errorCommit, callback);
                                                }
                                                callback(null, resultado);
                                            });
                                        }
                                    );
                                }
                            );
                        }
                    );
                }
            );
        });
    });
}

function eliminarPago(id, callback) {
    conexion.beginTransaction(errorTransaccion => {
        if (errorTransaccion) return callback(errorTransaccion);

        conexion.query(
            "DELETE FROM Pagos WHERE id_pago = ?",
            [id],
            (errorEliminar, resultado) => {
                if (errorEliminar) {
                    return finalizarConError(errorEliminar, callback);
                }

                if (resultado.affectedRows === 0) {
                    return finalizarConError(
                        crearError("PAGO_NO_EXISTE", "El pago seleccionado no existe."),
                        callback
                    );
                }

                conexion.commit(errorCommit => {
                    if (errorCommit) return finalizarConError(errorCommit, callback);
                    callback(null, resultado);
                });
            }
        );
    });
}

function validarPago(pago, callback) {
    const metodosValidos = ["Efectivo", "Tarjeta", "Transferencia"];
    const estadosValidos = ["Pendiente", "Pagado", "Cancelado"];

    if (
        !Number.isInteger(Number(pago.id_venta)) ||
        Number(pago.id_venta) <= 0 ||
        !Number.isFinite(Number(pago.monto)) ||
        Number(pago.monto) <= 0 ||
        !metodosValidos.includes(pago.metodo_pago) ||
        !estadosValidos.includes(pago.estado_pago)
    ) {
        return callback(crearError(
            "VALIDACION_PAGO",
            "Verifica la venta, el monto, el método y el estado del pago."
        ));
    }

    pago.id_venta = Number(pago.id_venta);
    pago.monto = Number(pago.monto);
    callback(null);
}

function crearError(code, message) {
    const error = new Error(message);
    error.code = code;
    return error;
}

function finalizarConError(error, callback) {
    conexion.rollback(() => callback(error));
}

module.exports = {
    obtenerPagos,
    crearPago,
    actualizarPago,
    eliminarPago
};
