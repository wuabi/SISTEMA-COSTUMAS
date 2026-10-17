const conexion = require("../database");

function buscarUsuario(correo, callback) {
    const sql = `
        SELECT U.id_usuario, U.nombre, U.correo, U.contrasena, U.estado, R.nombre_rol
        FROM Usuarios U
        INNER JOIN Roles R ON U.id_rol = R.id_rol
        WHERE U.correo = ?
        LIMIT 1
    `;

    conexion.query(sql, [correo], function(error, resultados) {
        if (error) {
            callback(error, null);
            return;
        }

        if (resultados.length === 0) {
            callback(null, null);
            return;
        }

        callback(null, resultados[0]);
    });
}

module.exports = {
    buscarUsuario
};