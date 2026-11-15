const {
	obtenerClientes,
	obtenerMedidasCamisa,
	crearMedidaCamisa,
	actualizarMedidaCamisa,
	eliminarMedidaCamisa,
	obtenerMedidasPantalon,
	crearMedidaPantalon,
	actualizarMedidaPantalon,
	eliminarMedidaPantalon
} = require("../models/gestionMedidas");

const formulario = document.getElementById("formMedida");
const buscador = document.getElementById("buscarMedida");
const selectCliente = document.getElementById("clienteMedida");
const selectTipoPrenda = document.getElementById("tipoPrenda");
const contenedorCamposMedidas = document.querySelector(".CamposMedidas");
const botonCancelar = document.querySelector(".BotonCancelar");
const botonGuardar = formulario.querySelector(".BotonGuardar");
const panelFormulario = document.getElementById("formularioMedida");
const botonNuevaMedida = document.getElementById("btnNuevaMedida");
const btnAlternarVista = document.getElementById("btnAlternarVista");
const textoVistaActual = document.getElementById("textoVistaActual");
const tituloVistaTipo = document.getElementById("tituloVistaTipo");
const cabeceraTabla = document.getElementById("cabeceraTabla");
const listaMedidasUnica = document.getElementById("listaMedidasUnica");
const pieTabla = document.querySelector(".PieTabla");
const indicador = pieTabla.querySelector(".Indicador");
const totalMedidas = document.getElementById("totalMedidas");
const clientesConMedidas = document.getElementById("clientesConMedidas");

let medidasCamisas = [];
let medidasPantalones = [];
let vistaActual = "camisa";
let edicionActual = null;
let errorCamisas = false;
let errorPantalones = false;

function mostrarFormulario(mostrar) {
	panelFormulario.hidden = !mostrar;
	botonNuevaMedida.setAttribute("aria-expanded", String(mostrar));
}

const camposCamisa = [
	{ id: "hombro", etiqueta: "Hombro" },
	{ id: "busto", etiqueta: "Busto" },
	{ id: "largo", etiqueta: "Largo" },
	{ id: "manga", etiqueta: "Manga" },
	{ id: "puno", etiqueta: "Puño" },
	{ id: "cuello", etiqueta: "Cuello" },
	{ id: "talla", etiqueta: "Talla", tipo: "text", placeholder: "Ej. S, M, L" }
];

const camposPantalon = [
	{ id: "cintura", etiqueta: "Cintura" },
	{ id: "cadera", etiqueta: "Cadera" },
	{ id: "largo", etiqueta: "Largo" },
	{ id: "rodilla", etiqueta: "Rodilla" },
	{ id: "ruedo", etiqueta: "Ruedo" },
	{ id: "tiro", etiqueta: "Tiro" },
	{ id: "talla", etiqueta: "Talla", tipo: "text", placeholder: "Ej. 32, 34" }
];

function actualizarIndicador(texto) {
	indicador.lastChild.textContent = ` ${texto}`;
}

function actualizarResumen() {
	const idsClientes = new Set(
		[...medidasCamisas, ...medidasPantalones].map(medida => Number(medida.id_cliente))
	);
	totalMedidas.textContent = medidasCamisas.length + medidasPantalones.length;
	clientesConMedidas.textContent = idsClientes.size;
}

function cargarClientesSelect() {
	obtenerClientes((error, resultados) => {
		selectCliente.replaceChildren();
		const opcionInicial = document.createElement("option");
		opcionInicial.value = "";
		opcionInicial.selected = true;
		opcionInicial.disabled = true;

		if (error) {
			console.error("Error al cargar clientes:", error);
			opcionInicial.textContent = "No fue posible cargar los clientes";
			selectCliente.disabled = true;
		} else if (resultados.length === 0) {
			opcionInicial.textContent = "No hay clientes registrados";
			selectCliente.disabled = true;
		} else {
			opcionInicial.textContent = "Selecciona un cliente";
			selectCliente.disabled = false;
			resultados.forEach(cliente => {
				const opcion = document.createElement("option");
				opcion.value = cliente.id_cliente;
				opcion.textContent = cliente.nombre;
				selectCliente.appendChild(opcion);
			});
		}

		selectCliente.prepend(opcionInicial);
	});
}

function renderizarCamposDinamicos(tipo) {
	contenedorCamposMedidas.replaceChildren();
	const campos = tipo === "camisa" ? camposCamisa : tipo === "pantalon" ? camposPantalon : [];

	campos.forEach(campo => {
		const divCampo = document.createElement("div");
		divCampo.className = "CampoMedida";

		const label = document.createElement("label");
		label.htmlFor = `medida_${campo.id}`;
		label.textContent = campo.etiqueta;

		const entradaDiv = document.createElement("div");
		entradaDiv.className = "EntradaMedida";

		const input = document.createElement("input");
		input.id = `medida_${campo.id}`;
		input.name = campo.id;
		input.type = campo.tipo || "number";
		input.placeholder = campo.placeholder || "0.0";
		if (!campo.tipo) {
			input.min = "0.01";
			input.max = "999.99";
			input.step = "0.01";
		}

		entradaDiv.appendChild(input);
		if (!campo.tipo) {
			const unidad = document.createElement("span");
			unidad.textContent = "pulg";
			entradaDiv.appendChild(unidad);
		}

		divCampo.append(label, entradaDiv);
		contenedorCamposMedidas.appendChild(divCampo);
	});
}

function crearCelda(fila, valor) {
	const celda = document.createElement("td");
	celda.textContent = valor === null || valor === undefined || valor === "" ? "—" : valor;
	fila.appendChild(celda);
	return celda;
}

function crearBotonAccion(ariaLabel, icono, accion) {
	const boton = document.createElement("button");
	boton.type = "button";
	boton.title = ariaLabel;
	boton.setAttribute("aria-label", ariaLabel);
	const elementoIcono = document.createElement("i");
	elementoIcono.className = `bi ${icono}`;
	boton.appendChild(elementoIcono);
	boton.addEventListener("click", accion);
	return boton;
}

function renderizarTablaUnica() {
	const termino = buscador.value.trim().toLocaleLowerCase();
	const esCamisa = vistaActual === "camisa";
	const medidas = esCamisa ? medidasCamisas : medidasPantalones;
	const errorCarga = esCamisa ? errorCamisas : errorPantalones;
	const columnas = esCamisa
		? [
			["Busto", "busto"], ["Hombro", "hombro"], ["Largo", "largo"],
			["Manga", "manga"], ["Puño", "puno"], ["Cuello", "cuello"], ["Talla", "talla"]
		]
		: [
			["Cintura", "cintura"], ["Cadera", "cadera"], ["Largo", "largo"],
			["Rodilla", "rodilla"], ["Ruedo", "ruedo"], ["Tiro", "tiro"], ["Talla", "talla"]
		];

	textoVistaActual.textContent = esCamisa ? "Camisas" : "Pantalones";
	tituloVistaTipo.textContent = esCamisa ? "camisas" : "pantalones";
	cabeceraTabla.replaceChildren();
	listaMedidasUnica.replaceChildren();

	["Cliente", ...columnas.map(([titulo]) => titulo), "Acciones"].forEach(titulo => {
		const encabezado = document.createElement("th");
		encabezado.textContent = titulo;
		cabeceraTabla.appendChild(encabezado);
	});

	if (errorCarga) {
		const fila = document.createElement("tr");
		fila.className = "FilaVacia";
		const celda = crearCelda(fila, "No fue posible cargar las medidas.");
		celda.colSpan = columnas.length + 2;
		listaMedidasUnica.appendChild(fila);
		pieTabla.firstElementChild.textContent = "Error al cargar las medidas";
		return;
	}

	const filtradas = medidas.filter(medida =>
		(medida.nombre_cliente || "").toLocaleLowerCase().includes(termino)
	);

	if (filtradas.length === 0) {
		const fila = document.createElement("tr");
		fila.className = "FilaVacia";
		const celda = crearCelda(
			fila,
			termino ? "No hay resultados para la búsqueda." : "No hay medidas registradas."
		);
		celda.colSpan = columnas.length + 2;
		listaMedidasUnica.appendChild(fila);
	} else {
		filtradas.forEach(medida => {
			const fila = document.createElement("tr");
			crearCelda(fila, medida.nombre_cliente);
			columnas.forEach(([, campo]) => crearCelda(fila, medida[campo]));

			const acciones = document.createElement("td");
			acciones.className = "Acciones";
			const tipo = esCamisa ? "camisa" : "pantalon";
			const id = esCamisa ? medida.id_medida_camisa : medida.id_medida_pantalon;
			acciones.append(
				crearBotonAccion("Editar medida", "bi-pencil", () => editarMedida(medida, tipo)),
				crearBotonAccion("Eliminar medida", "bi-trash3", () => borrarMedida(id, tipo))
			);
			fila.appendChild(acciones);
			listaMedidasUnica.appendChild(fila);
		});
	}

	pieTabla.firstElementChild.textContent =
		`Mostrando ${filtradas.length} de ${medidas.length} medidas de ${esCamisa ? "camisa" : "pantalón"}`;
}

function cargarDatos() {
	let respuestas = 0;
	const completarCarga = () => {
		respuestas += 1;
		if (respuestas === 2) {
			actualizarResumen();
			renderizarTablaUnica();
			actualizarIndicador(errorCamisas || errorPantalones ? "No se pudieron cargar las medidas" : "Actualizado");
		}
	};

	obtenerMedidasCamisa((error, resultados) => {
		errorCamisas = Boolean(error);
		if (error) {
			console.error("Error al obtener medidas de camisa:", error);
		} else {
			medidasCamisas = resultados;
		}
		completarCarga();
	});

	obtenerMedidasPantalon((error, resultados) => {
		errorPantalones = Boolean(error);
		if (error) {
			console.error("Error al obtener medidas de pantalón:", error);
		} else {
			medidasPantalones = resultados;
		}
		completarCarga();
	});
}

function limpiarFormulario() {
	edicionActual = null;
	formulario.reset();
	selectCliente.selectedIndex = 0;
	selectTipoPrenda.selectedIndex = 0;
	selectTipoPrenda.disabled = false;
	contenedorCamposMedidas.replaceChildren();
	document.getElementById("observaciones").value = "";
	document.getElementById("tituloFormulario").textContent = "Nueva medida";
	botonGuardar.innerHTML = '<i class="bi bi-floppy" aria-hidden="true"></i> Guardar medidas';
}

function editarMedida(medida, tipo) {
	edicionActual = {
		id: tipo === "camisa" ? medida.id_medida_camisa : medida.id_medida_pantalon,
		tipo
	};
	selectCliente.value = medida.id_cliente;
	selectTipoPrenda.value = tipo;
	selectTipoPrenda.disabled = true;
	renderizarCamposDinamicos(tipo);

	const campos = tipo === "camisa" ? camposCamisa : camposPantalon;
	campos.forEach(campo => {
		document.getElementById(`medida_${campo.id}`).value = medida[campo.id] ?? "";
	});
	document.getElementById("observaciones").value = medida.observaciones || "";
	document.getElementById("tituloFormulario").textContent = "Editar medida";
	botonGuardar.innerHTML = '<i class="bi bi-floppy" aria-hidden="true"></i> Guardar cambios';
	mostrarFormulario(true);
	formulario.scrollIntoView({ behavior: "smooth", block: "center" });
}

function borrarMedida(id, tipo) {
	if (!window.confirm("¿Estás seguro de eliminar este registro?")) {
		return;
	}

	const eliminar = tipo === "camisa" ? eliminarMedidaCamisa : eliminarMedidaPantalon;
	eliminar(id, error => {
		if (error) {
			console.error("Error al eliminar medida:", error);
			window.alert("No se pudo eliminar el registro.");
			return;
		}
		cargarDatos();
	});
}

function obtenerDatosFormulario(tipoPrenda) {
	const campos = tipoPrenda === "camisa" ? camposCamisa : camposPantalon;
	const datos = {
		id_cliente: Number(selectCliente.value),
		observaciones: document.getElementById("observaciones").value.trim() || null
	};

	campos.forEach(campo => {
		const valor = document.getElementById(`medida_${campo.id}`).value.trim();
		datos[campo.id] = campo.tipo ? (valor || null) : (valor ? Number(valor) : null);
	});

	if (campos.every(campo => !datos[campo.id])) {
		window.alert("Ingresa al menos una medida o una talla.");
		return null;
	}

	return datos;
}

btnAlternarVista.addEventListener("click", () => {
	vistaActual = vistaActual === "camisa" ? "pantalon" : "camisa";
	renderizarTablaUnica();
});

botonNuevaMedida.addEventListener("click", () => {
	if (!panelFormulario.hidden) {
		limpiarFormulario();
		mostrarFormulario(false);
		return;
	}

	limpiarFormulario();
	mostrarFormulario(true);
	selectCliente.focus();
});

selectTipoPrenda.addEventListener("change", evento => {
	if (edicionActual && evento.target.value !== edicionActual.tipo) {
		limpiarFormulario();
	}
	renderizarCamposDinamicos(evento.target.value);
});

formulario.addEventListener("submit", evento => {
	evento.preventDefault();
	if (!formulario.reportValidity()) {
		return;
	}

	const tipo = selectTipoPrenda.value;
	const datos = obtenerDatosFormulario(tipo);
	if (!datos) {
		return;
	}

	const esEdicion = Boolean(edicionActual);
	const guardar = tipo === "camisa"
		? (esEdicion ? callback => actualizarMedidaCamisa(edicionActual.id, datos, callback) : callback => crearMedidaCamisa(datos, callback))
		: (esEdicion ? callback => actualizarMedidaPantalon(edicionActual.id, datos, callback) : callback => crearMedidaPantalon(datos, callback));

	botonGuardar.disabled = true;
	guardar(error => {
		botonGuardar.disabled = false;
		if (error) {
			console.error("Error al guardar medida:", error);
			window.alert("No se pudieron guardar las medidas.");
			return;
		}

		limpiarFormulario();
		cargarDatos();
	});
});

buscador.addEventListener("input", renderizarTablaUnica);
botonCancelar.addEventListener("click", () => {
	limpiarFormulario();
	mostrarFormulario(false);
});

actualizarIndicador("Cargando medidas");
cargarClientesSelect();
cargarDatos();
