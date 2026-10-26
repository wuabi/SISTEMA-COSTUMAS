const conexion = require("../database");

function obtenerResumenNotificaciones(callback) {
    const sql = `
        SELECT
            (SELECT COUNT(*) FROM Pedidos_C WHERE estado = 'Pendiente') AS encargosPendientes,
            (SELECT COUNT(*) FROM Pedidos_C WHERE estado = 'En proceso') AS encargosEnProceso,
            (SELECT COUNT(*) FROM Pedidos_C WHERE estado = 'Terminado') AS entregasPendientes,
            (SELECT COUNT(*) FROM Pedidos_P WHERE estado IN ('Pendiente', 'En proceso')) AS pedidosProveedorPendientes,
            (SELECT COUNT(*) FROM Pagos WHERE estado_pago = 'Pendiente') AS pagosPendientes
    `;

    conexion.query(sql, (error, resultados) => {
        if (error) {
            callback(error);
            return;
        }

        const fila = resultados[0];
        callback(null, {
            encargosPendientes: Number(fila.encargosPendientes),
            encargosEnProceso: Number(fila.encargosEnProceso),
            entregasPendientes: Number(fila.entregasPendientes),
            pedidosProveedorPendientes: Number(fila.pedidosProveedorPendientes),
            pagosPendientes: Number(fila.pagosPendientes)
        });
    });
}

module.exports = { obtenerResumenNotificaciones };
