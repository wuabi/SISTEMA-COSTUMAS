const conexion = require("../database");

function obtenerClientes(callback) {
	const sql = `
		SELECT id_cliente, nombre, numero, correo, direccion
		FROM Clientes
		ORDER BY nombre
	`;

	conexion.query(sql, callback);
}

function crearCliente(cliente, callback) {
	const sql = `
		INSERT INTO Clientes (nombre, numero, correo, direccion)
		VALUES (?, ?, ?, ?)
	`;

	conexion.query(sql, [cliente.nombre, cliente.numero, cliente.correo, cliente.direccion], callback);
}

function actualizarCliente(id, cliente, callback) {
	const sql = `
		UPDATE Clientes
		SET nombre = ?, numero = ?, correo = ?, direccion = ?
		WHERE id_cliente = ?
	`;

	conexion.query(sql, [cliente.nombre, cliente.numero, cliente.correo, cliente.direccion, id], callback);
}

function eliminarCliente(id, callback) {
	conexion.query("DELETE FROM Clientes WHERE id_cliente = ?", [id], callback);
}

module.exports = {
	obtenerClientes,
	crearCliente,
	actualizarCliente,
	eliminarCliente
};
