// Modelo: consultas únicamente a las tablas que ya existen en sistema_COSTUMAS.
const conexion = require("../database");

// Consulta pedidos terminados y entregados junto con los datos del cliente.
function obtenerPedidos(callback) {
    const sql = `
        SELECT
            PC.id_pedido_c,
            DATE_FORMAT(PC.fecha_pedido, '%Y-%m-%d') AS fecha_pedido,
            DATE_FORMAT(PC.fecha_programada, '%Y-%m-%d') AS fecha_programada,
            DATE_FORMAT(PC.fecha_entrega, '%Y-%m-%d') AS fecha_entrega,
            PC.estado,
            PC.total,
            C.nombre AS nombre_cliente,
            C.numero
        FROM Pedidos_C PC
        INNER JOIN Clientes C ON PC.id_cliente = C.id_cliente
        WHERE PC.estado IN ('Terminado', 'Entregado')
        ORDER BY PC.fecha_pedido DESC, PC.id_pedido_c DESC
    `;

    conexion.query(sql, callback);
}

function esFechaValida(fecha) {
    if (typeof fecha !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
    const [anio, mes, dia] = fecha.split("-").map(Number);
    const fechaVerificada = new Date(Date.UTC(anio, mes - 1, dia));
    return fechaVerificada.getUTCFullYear() === anio &&
        fechaVerificada.getUTCMonth() === mes - 1 &&
        fechaVerificada.getUTCDate() === dia;
}

function actualizarFechaProgramada(idPedido, fecha, callback) {
    if (fecha !== null && !esFechaValida(fecha)) {
        callback(new Error("La fecha programada no es válida."));
        return;
    }

    const sql = `
        UPDATE Pedidos_C
        SET fecha_programada = ?
        WHERE id_pedido_c = ? AND estado = 'Terminado'
    `;

    conexion.query(sql, [fecha, idPedido], (error, resultado) => {
        if (error) return callback(error);
        if (resultado.affectedRows === 0) {
            conexion.query(
                `SELECT id_pedido_c
                FROM Pedidos_C
                WHERE id_pedido_c = ? AND estado = 'Terminado'
                    AND fecha_programada <=> ?`,
                [idPedido, fecha],
                (errorVerificacion, pedidosCoincidentes) => {
                    if (errorVerificacion) return callback(errorVerificacion);
                    if (!pedidosCoincidentes.length) {
                        return callback(new Error("El pedido ya no está terminado o no existe."));
                    }
                    callback(null, resultado);
                }
            );
            return;
        }
        callback(null, resultado);
    });
}

function marcarComoEntregado(idPedido, fecha, callback) {
    if (!esFechaValida(fecha)) {
        callback(new Error("La fecha de entrega no es válida."));
        return;
    }

    const sql = `
        UPDATE Pedidos_C
        SET estado = 'Entregado', fecha_entrega = ?
        WHERE id_pedido_c = ? AND estado = 'Terminado'
    `;

    conexion.query(sql, [fecha, idPedido], (error, resultado) => {
        if (error) return callback(error);

        if (resultado.affectedRows === 0) {
            return callback(new Error("El pedido ya no está terminado o no existe."));
        }

        callback(null, resultado);
    });
}

module.exports = {
    obtenerPedidos,
    actualizarFechaProgramada,
    marcarComoEntregado
};
