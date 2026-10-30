//Script de lógica, gráficos y actualización automática
const ctx = document.getElementById('graficoEncargos').getContext('2d');
const graficoPastel = new Chart(ctx, {
    type: 'pie',
    data: {
        labels: ['Pendiente', 'En Proceso', 'Terminado', 'Entregado'],
        datasets: [{
            data: [0, 0, 0, 0],
            backgroundColor: [
                '#9b0b43', // Borgoña (Pendiente)
                '#d97706', // Naranja (En Proceso)
                '#2563eb', // Azul (Terminado)
                '#16a34a'  // Verde (Entregado)
            ],
            borderWidth: 1
        }]
    },
    options: {
        responsive: true,
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    color: '#7d8184',
                    boxWidth: 10,
                    font: { size: 10 }
                }
            }
        }
    }
});

// Función para recalcular y actualizar el gráfico al cambiar cualquier selector
function recalcularYActualizarGrafico() {
    let pendientes = 0;
    let enProceso = 0;
    let terminados = 0;
    let entregados = 0;

    const selects = document.querySelectorAll('.selector-estado');

    selects.forEach(select => {
        if (select.value === 'pendiente') pendientes++;
        if (select.value === 'enProceso') enProceso++;
        if (select.value === 'terminado') terminados++;
        if (select.value === 'entregado') entregados++;
    });

    graficoPastel.data.datasets[0].data = [pendientes, enProceso, terminados, entregados];
    graficoPastel.update();
}

// Función auxiliar por si quieres agregar un nuevo pedido dinámicamente desde otro botón o formulario
function agregarNuevoPedido(nombreElemento) {
    const lista = document.querySelector('.Actividades');
    const nuevoSpan = document.createElement('span');
    nuevoSpan.innerHTML = `
        <h4>${nombreElemento}</h4>
        <select class="selector-estado" onchange="recalcularYActualizarGrafico()">
            <option value="pendiente" selected>Pendiente</option>
            <option value="enProceso">En proceso</option>
            <option value="terminado">Terminado</option>
            <option value="entregado">Entregado</option>
        </select>
    `;
    lista.appendChild(nuevoSpan);
    recalcularYActualizarGrafico();
}