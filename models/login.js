const crypto = require("crypto");
const conexion = require("../database");

function hashearContrasena(contrasena) {
    return crypto.createHash("sha256").update(String(contrasena)).digest("hex");
}

function compararContrasena(contrasenaIngresada, contrasenaGuardada) {
    if (!contrasenaIngresada || !contrasenaGuardada) {
        return false;
    }

    const valorIngresado = hashearContrasena(contrasenaIngresada);
    return valorIngresado === contrasenaGuardada || String(contrasenaIngresada) === String(contrasenaGuardada);
}

function buscarUsuario(correo, callback) {
    const sql = `
        SELECT U.id_usuario, U.nombre, U.numero, U.correo, U.contrasena, U.estado, R.nombre_rol
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

function actualizarPerfil(idUsuario, nombre, numero, callback) {
    const sql = `
        UPDATE Usuarios
        SET nombre = ?, numero = ?
        WHERE id_usuario = ?
    `;

    conexion.query(sql, [nombre, numero || null, idUsuario], function(error) {
        callback(error || null);
    });
}

function cambiarContrasena(idUsuario, contrasenaActual, contrasenaNueva, callback) {
    const consultaActual = `
        SELECT contrasena
        FROM Usuarios
        WHERE id_usuario = ?
        LIMIT 1
    `;

    conexion.query(consultaActual, [idUsuario], function(error, resultados) {
        if (error) {
            callback(error, false);
            return;
        }

        if (resultados.length === 0 || !compararContrasena(contrasenaActual, resultados[0].contrasena)) {
            callback(null, false);
            return;
        }

        const contrasenaHasheada = hashearContrasena(contrasenaNueva);
        const actualizacion = `
            UPDATE Usuarios
            SET contrasena = ?
            WHERE id_usuario = ?
        `;

        conexion.query(actualizacion, [contrasenaHasheada, idUsuario], function(errorActualizacion) {
            callback(errorActualizacion || null, !errorActualizacion);
        });
    });
}

module.exports = {
    buscarUsuario,
    actualizarPerfil,
    cambiarContrasena,
    compararContrasena,
    hashearContrasena
};
