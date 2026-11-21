const {
	obtenerClientes,
	obtenerProveedores,
	obtenerOCrearProveedor,
	obtenerProductosProveedor,
	obtenerPedidosClientes,
	obtenerPedidosProveedores,
	obtenerDetallePedidoProveedor,
	crearPedidoCliente,
	crearPedidoProveedor,
	actualizarEstadoPedidoCliente,
	actualizarEstadoPedidoEmpleado,
	actualizarEstadoPedidoProveedor
} = require("../models/pedidos");

const esProveedor = document.body.dataset.tipoPedido === "proveedor";
const esEmpleado = window.COSTUMAS_ROLES.rol === "Empleado";
const nombreEntidad = esProveedor ? "proveedores" : "clientes";
const estados = ["Pendiente", "En proceso", "Terminado", "Entregado"];
const etiquetasEstadoProveedor = {
	"Pedido": "Pedido",
	"Recibido": "Recibido"
};
const estadosProveedor = ["Pedido", "Recibido"];
const estadosEmpleado = ["En proceso", "Terminado"];
const formulario = document.getElementById("formPedido");
const panelFormulario = document.getElementById("formulario");
const botonNuevo = document.getElementById("btnNuevoEncargo");
const botonCancelar = document.getElementById("btnCancelarPedido");
const tabla = document.getElementById("tablaPedidos");
const buscador = document.getElementById("buscar");
const selectorEntidad = document.getElementById("entidad");
const listaEntidades = document.getElementById("opcionesEntidad");
const aviso = document.getElementById("avisoPedido");
const campoMonto = document.getElementById("campoMonto");
const entradaMonto = document.getElementById("monto");
const seccionArticulos = document.getElementById("seccionArticulos");
const listaArticulos = document.getElementById("listaArticulos");
const botonAgregarArticulo = document.getElementById("btnAgregarArticulo");
const avisoArticulos = document.getElementById("avisoArticulos");
const totalCalculado = document.getElementById("totalCalculado");
const indicador = document.querySelector(".Indicador");
const textoIndicador = indicador.lastChild;
const textoEstadoListado = document.getElementById("estadoListado");
const botonGuardar = formulario.querySelector('[type="submit"]');
let pedidos = [];
let entidades = [];
let entidadesDisponibles = false;
let errorCargaPedidos = false;
let productosProveedor = [];
let errorCargaProductos = false;

function crearDialogoDetallePedido() {
	const dialogo = document.createElement("div");
	dialogo.className = "DialogoDetallePedido";
	dialogo.hidden = true;
	dialogo.innerHTML = `
		<section class="ContenidoDialogoPerfil" role="dialog" aria-modal="true" aria-labelledby="tituloDetallePedido" tabindex="-1">
			<header class="EncabezadoDialogoPerfil">
				<span class="IconoEncabezadoDialogo"><i class="bi bi-receipt" aria-hidden="true"></i></span>
				<div>
					<span class="EtiquetaDialogoPerfil"></span>
					<h2 id="tituloDetallePedido"></h2>
					<p>Consulta los datos generales registrados.</p>
				</div>
			</header>
			<div class="DetalleDialogoPerfil">
				<dl class="DatosPerfil"></dl>
			</div>
			<div class="AccionesDialogoPerfil">
				<button type="button">Aceptar</button>
			</div>
		</section>
	`;
	document.body.appendChild(dialogo);

	const contenido = dialogo.querySelector(".ContenidoDialogoPerfil");
	const etiqueta = dialogo.querySelector(".EtiquetaDialogoPerfil");
	const titulo = dialogo.querySelector("#tituloDetallePedido");
	const datos = dialogo.querySelector(".DatosPerfil");
	const botonCerrar = dialogo.querySelector(".AccionesDialogoPerfil button");
	let elementoEnfocado;

	function cerrar() {
		dialogo.hidden = true;
		if (elementoEnfocado) elementoEnfocado.focus();
	}

	botonCerrar.addEventListener("click", cerrar);
	dialogo.addEventListener("click", evento => {
		if (evento.target === dialogo) cerrar();
	});
	document.addEventListener("keydown", evento => {
		if (evento.key === "Escape" && !dialogo.hidden) cerrar();
	});

	return {
		mostrar(pedido, botonDisparador) {
			elementoEnfocado = botonDisparador;
			etiqueta.textContent = esProveedor ? "DETALLE DE COMPRA" : "DETALLE DEL PEDIDO";
			titulo.textContent = `${esProveedor ? "Compra" : "Pedido"} #${pedido.id}`;
			datos.replaceChildren();

			[
				{ etiqueta: esProveedor ? "Proveedor" : "Cliente", valor: pedido.nombre, icono: esProveedor ? "bi-truck" : "bi-person" },
				{ etiqueta: "Fecha", valor: pedido.fecha, icono: "bi-calendar3" },
				{ etiqueta: "Total", valor: `L ${Number(pedido.total).toFixed(2)}`, icono: "bi-cash-coin" },
				{ etiqueta: "Estado", valor: esProveedor ? etiquetasEstadoProveedor[pedido.estado] : pedido.estado, icono: "bi-clipboard-check" }
			].forEach(dato => {
				const elemento = document.createElement("div");
				const etiqueta = document.createElement("dt");
				const icono = document.createElement("i");
				icono.className = `bi ${dato.icono}`;
				icono.setAttribute("aria-hidden", "true");
				etiqueta.append(icono, document.createTextNode(` ${dato.etiqueta}`));

				const valor = document.createElement("dd");
				valor.textContent = dato.valor;
				elemento.append(etiqueta, valor);
				datos.appendChild(elemento);
			});

			if (esProveedor) {
				const elemento = document.createElement("div");
				const etiqueta = document.createElement("dt");
				const valor = document.createElement("dd");
				etiqueta.textContent = "Artículos";
				valor.textContent = "Cargando artículos...";
				elemento.append(etiqueta, valor);
				datos.appendChild(elemento);

				obtenerDetallePedidoProveedor(pedido.id, (error, resultados) => {
					if (dialogo.hidden || titulo.textContent !== `Compra #${pedido.id}`) return;
					if (error) {
						console.error("Error al cargar los artículos de la compra:", error);
						valor.textContent = "No fue posible cargar los artículos.";
						return;
					}

					const articulos = resultados.filter(resultado => resultado.articulo);
					valor.replaceChildren();
					if (articulos.length === 0) {
						valor.textContent = "Sin artículos registrados.";
						return;
					}

					const lista = document.createElement("ul");
					articulos.forEach(articulo => {
						const elementoArticulo = document.createElement("li");
						elementoArticulo.textContent =
							`${articulo.cantidad} × ${articulo.articulo} — L ${Number(articulo.subtotal).toFixed(2)}`;
						lista.appendChild(elementoArticulo);
					});
					valor.appendChild(lista);
				});
			}

			dialogo.hidden = false;
			contenido.focus();
		}
	};
}

const dialogoDetallePedido = crearDialogoDetallePedido();

function mostrarFormulario(mostrar) {
	panelFormulario.hidden = !mostrar;
	botonNuevo.setAttribute("aria-expanded", String(mostrar));
}

function establecerFechaActual() {
	const fechaActual = new Date();
	document.getElementById("fecha").value = new Date(
		fechaActual.getTime() - fechaActual.getTimezoneOffset() * 60000
	).toISOString().slice(0, 10);
}

function agregarCelda(fila, texto) {
	const celda = document.createElement("td");
	celda.textContent = texto;
	fila.appendChild(celda);
	return celda;
}

function actualizarResumen() {
	if (esProveedor) {
		const totalComprado = pedidos.reduce((total, pedido) => total + Number(pedido.total), 0);
		document.getElementById("total").textContent = `L ${totalComprado.toFixed(2)}`;
		document.getElementById("pendientes").textContent =
			pedidos.filter(pedido => pedido.estado === "Pedido").length;
		document.getElementById("finalizados").textContent =
			pedidos.filter(pedido => pedido.estado === "Recibido").length;
		return;
	}

	document.getElementById("total").textContent = pedidos.length;
	document.getElementById("pendientes").textContent =
		pedidos.filter(pedido => pedido.estado === "Pendiente").length;
	document.getElementById("proceso").textContent =
		pedidos.filter(pedido => pedido.estado === "En proceso").length;
	document.getElementById("finalizados").textContent =
		pedidos.filter(pedido => ["Terminado", "Entregado"].includes(pedido.estado)).length;
}

function actualizarIndicador(texto) {
	textoIndicador.textContent = ` ${texto}`;
}

function actualizarEstadoPedido(pedido, selector) {
	const estadoAnterior = pedido.estado;
	const estadoNuevo = selector.value;
	selector.disabled = true;

	const actualizarEstado = esEmpleado
		? (id, estado, callback) => actualizarEstadoPedidoEmpleado(id, estadoAnterior, estado, callback)
		: esProveedor
			? actualizarEstadoPedidoProveedor
			: actualizarEstadoPedidoCliente;

	actualizarEstado(pedido.id, estadoNuevo, error => {
		if (error) {
			console.error("Error al actualizar el estado del pedido:", error);
			selector.value = estadoAnterior;
			selector.disabled = false;
			window.alert("No se pudo actualizar el estado del pedido.");
			return;
		}

		pedido.estado = estadoNuevo;
		renderizar();
	});
}

function mostrarPedido(pedido) {
	const fila = document.createElement("tr");
	agregarCelda(fila, `#${pedido.id}`);
	agregarCelda(fila, pedido.nombre);
	if (esProveedor) {
		const cantidad = Number(pedido.cantidad_articulos);
		agregarCelda(fila, `${cantidad} ${cantidad === 1 ? "artículo" : "artículos"}`);
	}
	agregarCelda(fila, pedido.fecha);
	agregarCelda(fila, `L ${Number(pedido.total).toFixed(2)}`);

	const celdaEstado = document.createElement("td");
	const selector = document.createElement("select");
	selector.className = "selector-estado";
	selector.setAttribute("aria-label", `Estado ${esProveedor ? "de la compra" : "del pedido"} #${pedido.id}`);

	const estadosDisponibles = esProveedor
		? estadosProveedor
		: esEmpleado && estadosEmpleado.includes(pedido.estado)
			? estadosEmpleado
			: esEmpleado
				? [pedido.estado]
				: estados;

	estadosDisponibles.forEach(estado => {
		const opcion = document.createElement("option");
		opcion.value = estado;
		opcion.textContent = esProveedor ? etiquetasEstadoProveedor[estado] : estado;
		opcion.selected = pedido.estado === estado;
		selector.appendChild(opcion);
	});
	selector.disabled = esEmpleado && !estadosEmpleado.includes(pedido.estado);

	selector.addEventListener("change", () => actualizarEstadoPedido(pedido, selector));
	celdaEstado.appendChild(selector);
	fila.appendChild(celdaEstado);

	const celdaAcciones = document.createElement("td");
	const botonDetalle = document.createElement("button");
	botonDetalle.type = "button";
	botonDetalle.textContent = "Ver detalle";
	botonDetalle.className = "BotonDetalle";
	botonDetalle.addEventListener("click", () => {
		dialogoDetallePedido.mostrar(pedido, botonDetalle);
	});
	celdaAcciones.appendChild(botonDetalle);
	fila.appendChild(celdaAcciones);
	tabla.appendChild(fila);
}

function renderizar() {
	tabla.replaceChildren();

	if (errorCargaPedidos) {
		const fila = document.createElement("tr");
		const celda = agregarCelda(fila, `No fue posible cargar ${esProveedor ? "las compras" : "los pedidos"}.`);
		celda.colSpan = esProveedor ? 7 : 6;
		celda.className = "Vacio";
		tabla.appendChild(fila);
		textoEstadoListado.textContent = `No fue posible cargar ${esProveedor ? "las compras" : "los pedidos"}.`;
		actualizarResumen();
		return;
	}

	const termino = buscador.value.trim().toLocaleLowerCase();
	const filtrados = pedidos.filter(pedido =>
		String(pedido.id).includes(termino) ||
		pedido.nombre.toLocaleLowerCase().includes(termino)
	);

	if (filtrados.length === 0) {
		const fila = document.createElement("tr");
		const celda = agregarCelda(
			fila,
			pedidos.length
				? `No hay ${esProveedor ? "compras" : "pedidos"} que coincidan con la búsqueda.`
				: `Aún no hay ${esProveedor ? "compras" : "pedidos"} registrados.`
		);
		celda.colSpan = esProveedor ? 7 : 6;
		celda.className = "Vacio";
		tabla.appendChild(fila);
	}

	filtrados.forEach(mostrarPedido);
	textoEstadoListado.textContent =
		`Mostrando ${filtrados.length} de ${pedidos.length} ${esProveedor ? "compras" : "pedidos"}`;
	actualizarResumen();
}

function actualizarOpcionesArticulos() {
	const filas = Array.from(listaArticulos.querySelectorAll(".FilaArticulo"));
	const selecciones = filas.map(fila => fila.querySelector(".SelectorArticulo"));
	const productosSeleccionados = new Set(selecciones.map(selector => selector.value).filter(Boolean));
	selecciones.forEach(selector => {
		const seleccionadosEnOtrasFilas = new Set(
			selecciones
				.filter(otroSelector => otroSelector !== selector)
				.map(otroSelector => otroSelector.value)
		);
		Array.from(selector.options).forEach(opcion => {
			opcion.disabled = opcion.value !== "" && seleccionadosEnOtrasFilas.has(opcion.value);
		});
	});
	const hayFilaIncompleta = selecciones.some(selector => !selector.value);
	const todosSeleccionados = productosProveedor.every(producto =>
		productosSeleccionados.has(String(producto.id))
	);
	botonAgregarArticulo.disabled = hayFilaIncompleta || todosSeleccionados;
}

function actualizarTotalCompra() {
	let totalCentavos = 0;
	Array.from(listaArticulos.querySelectorAll(".FilaArticulo")).forEach(fila => {
		const cantidad = Number(fila.querySelector(".CantidadArticulo").value);
		const precio = Number(fila.querySelector(".PrecioArticulo").value);
		const subtotalCentavos = Number.isInteger(cantidad) && cantidad > 0 && Number.isFinite(precio) && precio > 0
			? Math.round(precio * 100) * cantidad
			: 0;
		fila.querySelector(".SubtotalArticulo").textContent = `L ${(subtotalCentavos / 100).toFixed(2)}`;
		totalCentavos += subtotalCentavos;
	});
	totalCalculado.textContent = `L ${(totalCentavos / 100).toFixed(2)}`;
}

function agregarFilaArticulo() {
	if (productosProveedor.length === 0) return;

	const fila = document.createElement("div");
	fila.className = "FilaArticulo";

	const selector = document.createElement("select");
	selector.className = "SelectorArticulo";
	selector.setAttribute("aria-label", "Producto");
	const opcionInicial = document.createElement("option");
	opcionInicial.value = "";
	opcionInicial.textContent = "Selecciona un producto";
	opcionInicial.disabled = true;
	opcionInicial.selected = true;
	selector.appendChild(opcionInicial);
	selector.required = true;

	productosProveedor.forEach(producto => {
		const opcion = document.createElement("option");
		opcion.value = producto.id;
		opcion.textContent = producto.nombre;
		selector.appendChild(opcion);
	});

	const cantidad = document.createElement("input");
	cantidad.className = "CantidadArticulo";
	cantidad.type = "number";
	cantidad.min = "1";
	cantidad.max = "2147483647";
	cantidad.step = "1";
	cantidad.value = "1";
	cantidad.setAttribute("aria-label", "Cantidad");
	cantidad.required = true;

	const precio = document.createElement("input");
	precio.className = "PrecioArticulo";
	precio.type = "number";
	precio.min = "0.01";
	precio.max = "99999999.99";
	precio.step = "0.01";
	precio.placeholder = "Ingresa costo";
	precio.setAttribute("aria-label", "Costo unitario en lempiras");
	precio.required = true;
	precio.disabled = true;

	const subtotal = document.createElement("output");
	subtotal.className = "SubtotalArticulo";
	subtotal.textContent = "L 0.00";

	const botonEliminar = document.createElement("button");
	botonEliminar.type = "button";
	botonEliminar.className = "BotonEliminarArticulo";
	botonEliminar.setAttribute("aria-label", "Quitar artículo");
	botonEliminar.innerHTML = '<i class="bi bi-trash3" aria-hidden="true"></i>';

	selector.addEventListener("change", () => {
		const producto = productosProveedor.find(item => String(item.id) === selector.value);
		precio.value = "";
		precio.disabled = !producto;
		actualizarOpcionesArticulos();
		actualizarTotalCompra();
	});
	cantidad.addEventListener("input", actualizarTotalCompra);
	precio.addEventListener("input", actualizarTotalCompra);
	botonEliminar.addEventListener("click", () => {
		fila.remove();
		actualizarOpcionesArticulos();
		actualizarTotalCompra();
	});

	fila.append(selector, cantidad, precio, subtotal, botonEliminar);
	listaArticulos.appendChild(fila);
	actualizarOpcionesArticulos();
}

function cargarProductosProveedor() {
	listaArticulos.replaceChildren();
	productosProveedor = [];
	errorCargaProductos = false;
	actualizarTotalCompra();

	const proveedor = entidades.find(entidad =>
		entidad.nombre.toLocaleLowerCase() === selectorEntidad.value.trim().toLocaleLowerCase()
	);
	if (!proveedor) {
		avisoArticulos.textContent = selectorEntidad.value.trim()
			? "Este proveedor no tiene productos disponibles en el catálogo."
			: "Escribe o selecciona un proveedor para consultar sus productos.";
		botonAgregarArticulo.disabled = true;
		return;
	}

	botonAgregarArticulo.disabled = true;
	avisoArticulos.textContent = "Cargando productos del proveedor...";
	const idProveedor = Number(proveedor.id);
	obtenerProductosProveedor(idProveedor, (error, resultados) => {
		const proveedorActual = entidades.find(entidad =>
			entidad.nombre.toLocaleLowerCase() === selectorEntidad.value.trim().toLocaleLowerCase()
		);
		if (!proveedorActual || Number(proveedorActual.id) !== idProveedor) return;
		if (error) {
			console.error("Error al cargar los productos del proveedor:", error);
			errorCargaProductos = true;
			avisoArticulos.textContent = "No fue posible cargar los productos de este proveedor.";
			return;
		}

		productosProveedor = resultados;
		if (productosProveedor.length === 0) {
			avisoArticulos.textContent = "Este proveedor no tiene productos registrados.";
			return;
		}

		avisoArticulos.textContent = "Agrega uno o más productos y ajusta la cantidad y el costo unitario.";
		botonAgregarArticulo.disabled = false;
	});
}

function registrarProveedorEscrito() {
	if (!esProveedor) return;
	const nombre = selectorEntidad.value.trim();
	if (!nombre) {
		cargarProductosProveedor();
		return;
	}

	const existente = entidades.find(entidad =>
		entidad.nombre.toLocaleLowerCase() === nombre.toLocaleLowerCase()
	);
	if (existente) {
		selectorEntidad.value = existente.nombre;
		cargarProductosProveedor();
		return;
	}

	if (selectorEntidad.dataset.registrando === nombre.toLocaleLowerCase()) return;
	selectorEntidad.dataset.registrando = nombre.toLocaleLowerCase();
	botonGuardar.disabled = true;
	obtenerOCrearProveedor(nombre, (error, proveedor, creado) => {
		delete selectorEntidad.dataset.registrando;
		botonGuardar.disabled = !entidadesDisponibles;
		if (error) {
			console.error("Error al registrar el proveedor:", error);
			aviso.textContent = error.message || "No fue posible registrar el proveedor.";
			return;
		}

		if (!entidades.some(entidad => Number(entidad.id) === Number(proveedor.id))) {
			entidades.push(proveedor);
			const opcion = document.createElement("option");
			opcion.value = proveedor.nombre;
			listaEntidades.appendChild(opcion);
		}
		selectorEntidad.value = proveedor.nombre;
		aviso.textContent = creado
			? "Proveedor registrado. Para hacer el pedido, agrega primero sus artículos al catálogo."
			: "Completa los datos para registrar la compra.";
		cargarProductosProveedor();
	});
}

function cargarEntidades() {
	const obtenerEntidades = esProveedor ? obtenerProveedores : obtenerClientes;
	obtenerEntidades((error, resultados) => {
		if (esProveedor) {
			listaEntidades.replaceChildren();
			if (error) {
				console.error(`Error al cargar ${nombreEntidad}:`, error);
				aviso.textContent = `No se pudieron cargar ${nombreEntidad}. Inténtalo de nuevo más tarde.`;
				entidadesDisponibles = false;
				botonGuardar.disabled = true;
				return;
			}

			entidades = resultados;
			resultados.forEach(entidad => {
				const opcion = document.createElement("option");
				opcion.value = entidad.nombre;
				listaEntidades.appendChild(opcion);
			});
			aviso.textContent = resultados.length
				? "Escribe o selecciona un proveedor; puedes registrar uno nuevo."
				: "Escribe el proveedor para registrarlo.";
			entidadesDisponibles = true;
			botonGuardar.disabled = false;
			return;
		}

		selectorEntidad.replaceChildren();
		const opcionInicial = document.createElement("option");
		opcionInicial.value = "";
		opcionInicial.disabled = true;
		opcionInicial.selected = true;

		if (error) {
			console.error(`Error al cargar ${nombreEntidad}:`, error);
			opcionInicial.textContent = `No fue posible cargar ${nombreEntidad}`;
			aviso.textContent = `No se pudieron cargar ${nombreEntidad}. Inténtalo de nuevo más tarde.`;
			selectorEntidad.appendChild(opcionInicial);
			entidadesDisponibles = false;
		} else if (resultados.length === 0) {
			opcionInicial.textContent = `No hay ${nombreEntidad} registrados`;
			aviso.textContent = `Registra ${nombreEntidad} antes de crear un pedido.`;
			selectorEntidad.appendChild(opcionInicial);
			entidadesDisponibles = false;
		} else {
			entidades = resultados;
			opcionInicial.textContent = `Selecciona ${esProveedor ? "un proveedor" : "un cliente"}`;
			selectorEntidad.appendChild(opcionInicial);
			resultados.forEach(entidad => {
				const opcion = document.createElement("option");
				opcion.value = entidad.id;
				opcion.textContent = entidad.nombre;
				selectorEntidad.appendChild(opcion);
			});
			aviso.textContent = `Completa los datos para registrar ${esProveedor ? "la compra" : "el encargo"}.`;
			entidadesDisponibles = true;
		}

		selectorEntidad.disabled = !entidadesDisponibles;
		botonGuardar.disabled = !entidadesDisponibles;
	});
}

function cargarPedidos() {
	const obtenerPedidos = esProveedor ? obtenerPedidosProveedores : obtenerPedidosClientes;
	obtenerPedidos((error, resultados) => {
		if (error) {
			console.error("Error al cargar pedidos:", error);
			pedidos = [];
			errorCargaPedidos = true;
			actualizarIndicador(`No se pudieron cargar ${esProveedor ? "las compras" : "los pedidos"}`);
			renderizar();
			return;
		}

		pedidos = resultados;
		errorCargaPedidos = false;
		actualizarIndicador("Actualizado");
		renderizar();
	});
}

formulario.addEventListener("submit", evento => {
	evento.preventDefault();
	if (esEmpleado) return;

	if (!entidadesDisponibles) {
		window.alert(`No hay ${nombreEntidad} disponibles para registrar ${esProveedor ? "la compra" : "el pedido"}.`);
		return;
	}

	const proveedor = esProveedor && entidades.find(entidad =>
		entidad.nombre.toLocaleLowerCase() === selectorEntidad.value.trim().toLocaleLowerCase()
	);
	if (esProveedor && !proveedor) {
		window.alert("Escribe y confirma el nombre del proveedor antes de registrar la compra.");
		registrarProveedorEscrito();
		return;
	}

	const pedido = {
		idEntidad: esProveedor ? Number(proveedor.id) : Number(selectorEntidad.value),
		fecha: document.getElementById("fecha").value,
		estado: document.getElementById("estado").value
	};
	if (esProveedor) {
		if (errorCargaProductos) {
			window.alert("No fue posible consultar los productos del proveedor. Inténtalo de nuevo.");
			return;
		}

		const filasArticulos = Array.from(listaArticulos.querySelectorAll(".FilaArticulo"));
		if (filasArticulos.length === 0) {
			window.alert("Agrega al menos un artículo a la compra.");
			return;
		}

		pedido.articulos = filasArticulos.map(fila => ({
			id: Number(fila.querySelector(".SelectorArticulo").value),
			cantidad: Number(fila.querySelector(".CantidadArticulo").value),
			precio: Number(fila.querySelector(".PrecioArticulo").value)
		}));
		if (!formulario.reportValidity()) return;
	} else {
		pedido.total = Number(entradaMonto.value);
	}

	const crearPedido = esProveedor ? crearPedidoProveedor : crearPedidoCliente;
	botonGuardar.disabled = true;

	crearPedido(pedido, error => {
		botonGuardar.disabled = !entidadesDisponibles;
		if (error) {
			console.error("Error al guardar el pedido:", error);
			window.alert(`No se pudo registrar ${esProveedor ? "la compra" : "el pedido"}.`);
			return;
		}

		formulario.reset();
		establecerFechaActual();
		mostrarFormulario(false);
		cargarPedidos();
	});
});

formulario.addEventListener("reset", () => {
	window.setTimeout(() => {
		establecerFechaActual();
		selectorEntidad.value = "";
		if (esProveedor) {
			productosProveedor = [];
			errorCargaProductos = false;
			listaArticulos.replaceChildren();
			avisoArticulos.textContent = "Escribe o selecciona un proveedor para consultar sus productos.";
			botonAgregarArticulo.disabled = true;
			actualizarTotalCompra();
		}
	});
});

buscador.addEventListener("input", renderizar);
if (esProveedor) {
	campoMonto.hidden = true;
	entradaMonto.required = false;
	seccionArticulos.hidden = false;
	botonAgregarArticulo.disabled = true;
	selectorEntidad.addEventListener("input", cargarProductosProveedor);
	selectorEntidad.addEventListener("change", registrarProveedorEscrito);
	selectorEntidad.addEventListener("blur", registrarProveedorEscrito);
	botonAgregarArticulo.addEventListener("click", agregarFilaArticulo);
}
botonCancelar.addEventListener("click", () => {
	formulario.reset();
	mostrarFormulario(false);
});

botonNuevo.addEventListener("click", () => {
	if (esEmpleado) return;

	if (!panelFormulario.hidden) {
		mostrarFormulario(false);
		return;
	}

	formulario.reset();
	mostrarFormulario(true);
	selectorEntidad.focus();
	formulario.scrollIntoView({ behavior: "smooth", block: "center" });
});

establecerFechaActual();
textoEstadoListado.textContent = `Cargando ${esProveedor ? "compras" : "pedidos"}...`;
actualizarIndicador(`Cargando ${esProveedor ? "compras" : "pedidos"}`);
if (esEmpleado) {
	botonNuevo.hidden = true;
	panelFormulario.hidden = true;
} else {
	cargarEntidades();
}
cargarPedidos();
