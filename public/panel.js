// Panel de Monitoreo de Costos - JavaScript

let dailyCostChart = null;
let distributionChart = null;

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    console.log('Panel de monitoreo inicializado');
    
    // Event listeners
    document.getElementById('periodSelector').addEventListener('change', handlePeriodChange);
    document.getElementById('refreshBtn').addEventListener('click', loadAllData);
    
    // Modal
    const modal = document.getElementById('editPriceModal');
    const closeBtn = document.querySelector('.close');
    const cancelBtn = document.getElementById('cancelEdit');
    
    closeBtn.onclick = () => modal.classList.remove('active');
    cancelBtn.onclick = () => modal.classList.remove('active');
    
    window.onclick = (event) => {
        if (event.target === modal) {
            modal.classList.remove('active');
        }
    };
    
    // Form submission
    document.getElementById('editPriceForm').addEventListener('submit', handlePriceUpdate);
    
    // Cargar datos iniciales
    loadAllData();
    
    // Auto-refresh cada 60 segundos
    setInterval(loadAllData, 60000);
});

// Cargar todos los datos
async function loadAllData() {
    const period = document.getElementById('periodSelector').value;
    
    try {
        await Promise.all([
            loadSummary(period),
            loadDailyCosts(period),
            loadPhoneCosts(period),
            loadPricing()
        ]);
        
        updateLastUpdateTime();
    } catch (error) {
        console.error('Error cargando datos:', error);
        showError('Error cargando datos del panel');
    }
}

// Cargar resumen de costos
async function loadSummary(period) {
    try {
        const response = await authFetch(`/panel/costs/summary?period=${period}`);
        const data = await response.json();
        
        // Actualizar cards
        document.getElementById('openaiCost').textContent = `$${data.openai.totalCost.toFixed(4)}`;
        document.getElementById('openaiCalls').textContent = `${data.openai.calls} llamadas`;
        document.getElementById('openaiTokens').textContent = `${formatNumber(data.openai.totalTokens)} tokens`;
        
        document.getElementById('metaCost').textContent = `$${data.meta.totalCost.toFixed(4)}`;
        document.getElementById('metaConversations').textContent = `${data.meta.conversations} conversaciones`;
        
        document.getElementById('totalCost').textContent = `$${data.total.totalCost.toFixed(4)}`;
        
        // Actualizar período
        const periodLabels = {
            '24h': 'Últimas 24 horas',
            '7d': 'Últimos 7 días',
            '30d': 'Últimos 30 días',
            'all': 'Todo el tiempo'
        };
        document.getElementById('periodLabel').textContent = periodLabels[period] || period;
        
        // Actualizar gráfico de distribución
        updateDistributionChart(data);
        
    } catch (error) {
        console.error('Error cargando resumen:', error);
        throw error;
    }
}

// Cargar costos diarios
async function loadDailyCosts(period) {
    try {
        const days = period === '24h' ? 1 : period === '7d' ? 7 : period === '30d' ? 30 : 90;
        const response = await authFetch(`/panel/costs/daily?days=${days}`);
        const data = await response.json();
        
        updateDailyCostChart(data.data);
        
    } catch (error) {
        console.error('Error cargando costos diarios:', error);
        throw error;
    }
}

// Cargar costos por teléfono
async function loadPhoneCosts(period) {
    try {
        const days = period === '24h' ? 1 : period === '7d' ? 7 : period === '30d' ? 30 : 999;
        const response = await authFetch(`/panel/costs/by-phone?days=${days}&limit=20`);
        const data = await response.json();
        
        updatePhoneTable(data.data);
        
    } catch (error) {
        console.error('Error cargando costos por teléfono:', error);
        throw error;
    }
}

// Cargar configuración de precios
async function loadPricing() {
    try {
        const response = await authFetch('/panel/pricing');
        const data = await response.json();
        
        updatePricingTable(data.pricing);
        
    } catch (error) {
        console.error('Error cargando precios:', error);
        throw error;
    }
}

// Actualizar gráfico de costos diarios
function updateDailyCostChart(data) {
    const ctx = document.getElementById('dailyCostChart').getContext('2d');
    
    // Preparar datos para el gráfico
    const labels = data.map(d => formatDate(d.date));
    const openaiData = data.map(d => d.openai.cost);
    const metaData = data.map(d => d.meta.cost);
    
    // Destruir gráfico anterior si existe
    if (dailyCostChart) {
        dailyCostChart.destroy();
    }
    
    // Crear nuevo gráfico
    dailyCostChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels.reverse(),
            datasets: [
                {
                    label: 'OpenAI',
                    data: openaiData.reverse(),
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Meta WhatsApp',
                    data: metaData.reverse(),
                    borderColor: '#f5576c',
                    backgroundColor: 'rgba(245, 87, 108, 0.1)',
                    tension: 0.4,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: '#a0aec0'
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': $' + context.parsed.y.toFixed(4);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#a0aec0',
                        callback: function(value) {
                            return '$' + value.toFixed(4);
                        }
                    },
                    grid: {
                        color: 'rgba(160, 174, 192, 0.1)'
                    }
                },
                x: {
                    ticks: {
                        color: '#a0aec0'
                    },
                    grid: {
                        color: 'rgba(160, 174, 192, 0.1)'
                    }
                }
            }
        }
    });
}

// Actualizar gráfico de distribución
function updateDistributionChart(data) {
    const ctx = document.getElementById('distributionChart').getContext('2d');
    
    // Destruir gráfico anterior si existe
    if (distributionChart) {
        distributionChart.destroy();
    }
    
    // Crear nuevo gráfico
    distributionChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['OpenAI', 'Meta WhatsApp'],
            datasets: [{
                data: [data.openai.totalCost, data.meta.totalCost],
                backgroundColor: [
                    'rgba(102, 126, 234, 0.8)',
                    'rgba(245, 87, 108, 0.8)'
                ],
                borderColor: [
                    '#667eea',
                    '#f5576c'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#a0aec0',
                        padding: 20
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((context.parsed / total) * 100).toFixed(1);
                            return context.label + ': $' + context.parsed.toFixed(4) + ' (' + percentage + '%)';
                        }
                    }
                }
            }
        }
    });
}

// Actualizar tabla de teléfonos
function updatePhoneTable(data) {
    const tbody = document.getElementById('phoneTableBody');
    
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="loading">No hay datos disponibles</td></tr>';
        return;
    }
    
    tbody.innerHTML = data.map(item => `
        <tr>
            <td><strong>${escapeHtml(item.contactName)}</strong></td>
            <td><span class="phone-number">${formatPhoneNumber(item.phoneNumber)}</span></td>
            <td class="cost-amount">$${item.openai.cost.toFixed(4)}</td>
            <td class="cost-amount">$${item.meta.cost.toFixed(4)}</td>
            <td class="cost-amount"><strong>$${item.total.toFixed(4)}</strong></td>
            <td class="cost-breakdown">${item.openai.calls} / ${item.meta.conversations}</td>
        </tr>
    `).join('');
}

// Actualizar tabla de precios
function updatePricingTable(pricing) {
    const tbody = document.getElementById('pricingTableBody');
    
    if (!pricing || pricing.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="loading">No hay configuración disponible</td></tr>';
        return;
    }
    
    tbody.innerHTML = pricing.map(item => `
        <tr>
            <td>${escapeHtml(item.service)}</td>
            <td>${escapeHtml(item.metric)}</td>
            <td class="cost-amount">$${item.price_per_unit}</td>
            <td>${escapeHtml(item.currency)}</td>
            <td>${formatDateTime(item.updated_at)}</td>
            <td>
                <button class="btn-edit" onclick="editPrice('${escapeHtml(item.service)}', '${escapeHtml(item.metric)}', ${item.price_per_unit})">
                    ✏️ Editar
                </button>
            </td>
        </tr>
    `).join('');
}

// Editar precio
function editPrice(service, metric, currentPrice) {
    document.getElementById('editService').value = service;
    document.getElementById('editMetric').value = metric;
    document.getElementById('editServiceName').value = service;
    document.getElementById('editMetricName').value = metric;
    document.getElementById('editPrice').value = currentPrice;
    
    document.getElementById('editPriceModal').classList.add('active');
}

// Manejar actualización de precio
async function handlePriceUpdate(event) {
    event.preventDefault();
    
    const service = document.getElementById('editService').value;
    const metric = document.getElementById('editMetric').value;
    const price = parseFloat(document.getElementById('editPrice').value);
    
    try {
        const response = await authFetch(`/panel/pricing/${service}/${metric}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ price })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            document.getElementById('editPriceModal').classList.remove('active');
            await loadPricing();
            showSuccess('Precio actualizado correctamente');
        } else {
            showError(data.message || 'Error actualizando precio');
        }
    } catch (error) {
        console.error('Error actualizando precio:', error);
        showError('Error actualizando precio');
    }
}

// Manejar cambio de período
function handlePeriodChange() {
    loadAllData();
}

// Actualizar tiempo de última actualización
function updateLastUpdateTime() {
    document.getElementById('lastUpdate').textContent = new Date().toLocaleString('es-AR');
}

// Utilidades
function formatNumber(num) {
    return new Intl.NumberFormat('es-AR').format(num);
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
}

function formatDateTime(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleString('es-AR');
}

function formatPhoneNumber(phone) {
    // Formato: +54 11 1234-5678
    if (phone.startsWith('54')) {
        return `+${phone.slice(0, 2)} ${phone.slice(2, 4)} ${phone.slice(4, 8)}-${phone.slice(8)}`;
    }
    return phone;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showSuccess(message) {
    // Implementar notificación de éxito (toast, alert, etc.)
    alert('✅ ' + message);
}

function showError(message) {
    // Implementar notificación de error (toast, alert, etc.)
    alert('❌ ' + message);
}
