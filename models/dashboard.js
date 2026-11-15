const conexion = require("../database");

function consultar(sql) {
    return new Promise((resolver, rechazar) => {
        conexion.query(sql, (error, resultados) => {
            if (error) {
                rechazar(error);
                return;
            }

            resolver(resultados);
        });
    });
}

async function obtenerDatosDashboard() {
    const [resumen, estados, actividades] = await Promise.all([
        consultar(`
            SELECT
                (SELECT COUNT(*) FROM Pedidos_C WHERE estado <> 'Entregado') AS encargosActivos,
                (
                    SELECT COALESCE(SUM(monto), 0)
                    FROM Pagos
                    WHERE estado_pago = 'Pagado'
                      AND fecha_pago >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
                      AND fecha_pago < DATE_ADD(LAST_DAY(CURDATE()), INTERVAL 1 DAY)
                ) AS ingresosMensuales,
                (SELECT COUNT(*) FROM Pedidos_C WHERE estado = 'Terminado') AS entregasPendientes
        `),
        consultar(`
            SELECT estado, COUNT(*) AS cantidad
            FROM Pedidos_C
            GROUP BY estado
        `),
        consultar(`
            SELECT p.id_pedido_c, c.nombre AS cliente, p.fecha_pedido, p.estado
            FROM Pedidos_C p
            INNER JOIN Clientes c ON c.id_cliente = p.id_cliente
            ORDER BY p.fecha_pedido DESC, p.id_pedido_c DESC
            LIMIT 5
        `)
    ]);

    return {
        resumen: resumen[0],
        estados,
        actividades
    };
}

module.exports = { obtenerDatosDashboard };
