// Modelo: consultas únicamente a las tablas que ya existen en sistema_COSTUMAS.
const conexion = require("../database");

// Consulta pedidos terminados y entregados junto con los datos del cliente.
function obtenerPedidos(callback) {
    const sql = `
        SELECT
            PC.id_pedido_c,
            PC.fecha_pedido,
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

// Actualiza el estado en la tabla Pedidos_C, sin crear ni modificar tablas.
function marcarComoEntregado(idPedido, callback) {
    const sql = `
        UPDATE Pedidos_C
        SET estado = 'Entregado'
        WHERE id_pedido_c = ? AND estado = 'Terminado'
    `;

    conexion.query(sql, [idPedido], (error, resultado) => {
        if (error) return callback(error);

        if (resultado.affectedRows === 0) {
            return callback(new Error("El pedido ya no está terminado o no existe."));
        }

        callback(null, resultado);
    });
}

module.exports = {
    obtenerPedidos,
    marcarComoEntregado
};
