const {
	obtenerClientes,
	crearCliente,
	actualizarCliente,
	eliminarCliente
} = require("../models/gestionClientes");

const formulario = document.getElementById("formCliente");
const listaClientes = document.getElementById("listaClientes");
const buscador = document.getElementById("buscarCliente");
const botonNuevo = document.getElementById("btnNuevoCliente");
const botonCancelar = document.getElementById("btnCancelar");
const pieTabla = document.querySelector(".PieTabla");
let clientes = [];

function actualizarEstadisticas() {
	document.getElementById("totalClientes").textContent = clientes.length;
	document.getElementById("totalTelefonos").textContent = clientes.filter(cliente => cliente.numero).length;
	document.getElementById("totalCorreos").textContent = clientes.filter(cliente => cliente.correo).length;
	document.getElementById("totalDirecciones").textContent = clientes.filter(cliente => cliente.direccion).length;
}

function agregarCelda(fila, valor) {
	const celda = document.createElement("td");
	celda.textContent = valor || "—";
	fila.appendChild(celda);
}

function renderizarClientes() {
	const termino = buscador.value.trim().toLocaleLowerCase();
	const filtrados = clientes.filter(cliente =>
		[cliente.nombre, cliente.numero, cliente.correo, cliente.direccion]
			.some(valor => (valor || "").toLocaleLowerCase().includes(termino))
	);

	listaClientes.replaceChildren();

	if (filtrados.length === 0) {
		const fila = document.createElement("tr");
		const celda = document.createElement("td");
		celda.colSpan = 5;
		celda.textContent = clientes.length
			? "No hay resultados para la búsqueda."
			: "Aún no hay clientes registrados.";
		fila.appendChild(celda);
		listaClientes.appendChild(fila);
	}

	filtrados.forEach(cliente => {
		const fila = document.createElement("tr");
		agregarCelda(fila, cliente.nombre);
		agregarCelda(fila, cliente.numero);
		agregarCelda(fila, cliente.correo);
		agregarCelda(fila, cliente.direccion);

		const acciones = document.createElement("td");
		acciones.className = "Acciones";

		const botonEditar = document.createElement("button");
		botonEditar.type = "button";
		botonEditar.title = "Editar";
		botonEditar.setAttribute("aria-label", `Editar ${cliente.nombre}`);
		botonEditar.innerHTML = '<i class="bi bi-pencil"></i>';
		botonEditar.addEventListener("click", () => editarCliente(cliente));

		const botonEliminar = document.createElement("button");
		botonEliminar.type = "button";
		botonEliminar.title = "Eliminar";
		botonEliminar.setAttribute("aria-label", `Eliminar ${cliente.nombre}`);
		botonEliminar.innerHTML = '<i class="bi bi-trash3"></i>';
		botonEliminar.addEventListener("click", () => borrarCliente(cliente));

		acciones.append(botonEditar, botonEliminar);
		fila.appendChild(acciones);
		listaClientes.appendChild(fila);
	});

	pieTabla.firstElementChild.textContent = `Mostrando ${filtrados.length} de ${clientes.length} clientes`;
	pieTabla.querySelector(".Indicador").lastChild.textContent = " Datos de MySQL";
	actualizarEstadisticas();
}

function cargarClientes() {
	obtenerClientes((error, resultados) => {
		if (error) {
			console.error("Error al cargar clientes:", error);
			clientes = [];
			renderizarClientes();
			pieTabla.querySelector(".Indicador").lastChild.textContent = " Error de conexión";
			return;
		}

		clientes = resultados;
		renderizarClientes();
	});
}

function editarCliente(cliente) {
	document.getElementById("idCliente").value = cliente.id_cliente;
	document.getElementById("nombreCliente").value = cliente.nombre;
	document.getElementById("numeroCliente").value = cliente.numero || "";
	document.getElementById("correoCliente").value = cliente.correo || "";
	document.getElementById("direccionCliente").value = cliente.direccion || "";
	document.querySelector(".TituloFormulario h3").textContent = "Editar cliente";
	formulario.scrollIntoView({ behavior: "smooth", block: "center" });
}

function borrarCliente(cliente) {
	if (!window.confirm(`¿Eliminar a ${cliente.nombre}? Esta acción no se puede deshacer.`)) {
		return;
	}

	eliminarCliente(cliente.id_cliente, error => {
		if (error) {
			console.error("Error al eliminar cliente:", error);
			window.alert("No se pudo eliminar el cliente.");
			return;
		}

		cargarClientes();
	});
}

function limpiarFormulario() {
	formulario.reset();
	document.getElementById("idCliente").value = "";
	document.querySelector(".TituloFormulario h3").textContent = "Datos del cliente";
}

formulario.addEventListener("submit", evento => {
	evento.preventDefault();

	const id = document.getElementById("idCliente").value;
	const cliente = {
		nombre: document.getElementById("nombreCliente").value.trim(),
		numero: document.getElementById("numeroCliente").value.trim() || null,
		correo: document.getElementById("correoCliente").value.trim() || null,
		direccion: document.getElementById("direccionCliente").value.trim() || null
	};
	const guardar = id
		? callback => actualizarCliente(id, cliente, callback)
		: callback => crearCliente(cliente, callback);

	guardar(error => {
		if (error) {
			console.error("Error al guardar cliente:", error);
			window.alert("No se pudo guardar el cliente.");
			return;
		}

		limpiarFormulario();
		cargarClientes();
	});
});

buscador.addEventListener("input", renderizarClientes);
botonNuevo.addEventListener("click", () => {
	limpiarFormulario();
	document.getElementById("nombreCliente").focus();
});
botonCancelar.addEventListener("click", limpiarFormulario);

listaClientes.replaceChildren();
pieTabla.firstElementChild.textContent = "Cargando clientes...";
pieTabla.querySelector(".Indicador").lastChild.textContent = " Conectando con MySQL";
cargarClientes();
