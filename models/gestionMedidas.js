const conexion = require("../database");

function obtenerClientes(callback) {
	const sql = `
		SELECT id_cliente, nombre
		FROM Clientes
		ORDER BY nombre
	`;
	conexion.query(sql, callback);
}

// --- MEDIDAS DE CAMISAS ---
function obtenerMedidasCamisa(callback) {
	const sql = `
		SELECT m.*, c.nombre AS nombre_cliente
		FROM medidas_camisa m
		JOIN Clientes c ON m.id_cliente = c.id_cliente
		ORDER BY m.id_medida_camisa DESC
	`;
	conexion.query(sql, callback);
}

function crearMedidaCamisa(camisa, callback) {
	const sql = `
		INSERT INTO medidas_camisa
			(id_cliente, hombro, busto, largo, manga, puno, cuello, talla, observaciones)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
	`;
	conexion.query(sql, [
		camisa.id_cliente,
		camisa.hombro,
		camisa.busto,
		camisa.largo,
		camisa.manga,
		camisa.puno,
		camisa.cuello,
		camisa.talla,
		camisa.observaciones
	], callback);
}

function actualizarMedidaCamisa(id, camisa, callback) {
	const sql = `
		UPDATE medidas_camisa
		SET id_cliente = ?, hombro = ?, busto = ?, largo = ?, manga = ?,
			puno = ?, cuello = ?, talla = ?, observaciones = ?
		WHERE id_medida_camisa = ?
	`;

	conexion.query(sql, [
		camisa.id_cliente,
		camisa.hombro,
		camisa.busto,
		camisa.largo,
		camisa.manga,
		camisa.puno,
		camisa.cuello,
		camisa.talla,
		camisa.observaciones,
		id
	], callback);
}

function eliminarMedidaCamisa(id, callback) {
	conexion.query("DELETE FROM medidas_camisa WHERE id_medida_camisa = ?", [id], callback);
}

// --- MEDIDAS DE PANTALONES ---
function obtenerMedidasPantalon(callback) {
	const sql = `
		SELECT m.*, c.nombre AS nombre_cliente
		FROM medidas_pantalon m
		JOIN Clientes c ON m.id_cliente = c.id_cliente
		ORDER BY m.id_medida_pantalon DESC
	`;
	conexion.query(sql, callback);
}

function crearMedidaPantalon(pantalon, callback) {
	const sql = `
		INSERT INTO medidas_pantalon
			(id_cliente, cintura, cadera, largo, rodilla, ruedo, tiro, talla, observaciones)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
	`;
	conexion.query(sql, [
		pantalon.id_cliente,
		pantalon.cintura,
		pantalon.cadera,
		pantalon.largo,
		pantalon.rodilla,
		pantalon.ruedo,
		pantalon.tiro,
		pantalon.talla,
		pantalon.observaciones
	], callback);
}

function actualizarMedidaPantalon(id, pantalon, callback) {
	const sql = `
		UPDATE medidas_pantalon
		SET id_cliente = ?, cintura = ?, cadera = ?, largo = ?, rodilla = ?,
			ruedo = ?, tiro = ?, talla = ?, observaciones = ?
		WHERE id_medida_pantalon = ?
	`;

	conexion.query(sql, [
		pantalon.id_cliente,
		pantalon.cintura,
		pantalon.cadera,
		pantalon.largo,
		pantalon.rodilla,
		pantalon.ruedo,
		pantalon.tiro,
		pantalon.talla,
		pantalon.observaciones,
		id
	], callback);
}

function eliminarMedidaPantalon(id, callback) {
	conexion.query("DELETE FROM medidas_pantalon WHERE id_medida_pantalon = ?", [id], callback);
}

module.exports = {
	obtenerClientes,
	obtenerMedidasCamisa,
	crearMedidaCamisa,
	actualizarMedidaCamisa,
	eliminarMedidaCamisa,
	obtenerMedidasPantalon,
	crearMedidaPantalon,
	actualizarMedidaPantalon,
	eliminarMedidaPantalon
};
