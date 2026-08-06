/* ==========================================================================
   AURA OS | TELEMETRY CHARTS (WITH AXES)
   ========================================================================== */

const TelemetryCharts = {
    init() {
        this.renderOccupancySparkline();
    },

    renderOccupancySparkline() {
        const canvas = document.getElementById('mini-occupancy-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const gradient = ctx.createLinearGradient(0, 0, 0, 80);
        gradient.addColorStop(0, 'rgba(255, 92, 0, 0.5)'); 
        gradient.addColorStop(1, 'rgba(255, 92, 0, 0.0)'); 

        const data = {
            labels: ['8 AM', '10 AM', '12 PM', '2 PM', '4 PM', '6 PM', '8 PM', '10 PM'],
            datasets: [{
                label: 'Occupancy %',
                data: [30, 45, 80, 75, 60, 95, 85, 40],
                borderColor: '#FF5C00',
                borderWidth: 2,
                backgroundColor: gradient,
                fill: true,
                pointRadius: 3,        
                pointBackgroundColor: '#FF5C00',
                tension: 0.4           
            }]
        };

        new Chart(ctx, {
            type: 'line',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: true, mode: 'index', intersect: false } 
                },
                scales: {
                    x: { 
                        display: true, 
                        grid: { color: 'rgba(255,255,255,0.05)' },
                        ticks: { color: '#A1A1AA', font: { size: 10, family: 'Inter' } }
                    }, 
                    y: { 
                        display: true, 
                        min: 0, 
                        max: 100,
                        grid: { color: 'rgba(255,255,255,0.05)' },
                        ticks: { color: '#A1A1AA', font: { size: 10, family: 'Inter' }, stepSize: 25 }
                    }
                },
                animation: {
                    duration: 2000,
                    easing: 'easeOutQuart'
                }
            }
        });
    }
};

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => TelemetryCharts.init(), 2500); 
});