/* ==========================================================================
   AURA OS | FLAT 2D ARCHITECTURAL BLUEPRINT (POP-UP ENABLED)
   ========================================================================== */

const SpatialMap = {
    svgNS: "http://www.w3.org/2000/svg",
    container: null,
    slots: [],
    currentFloor: 1,

    init() {
        this.container = document.getElementById('spatial-map-svg');
        if (!this.container) return;
        this.container.setAttribute('viewBox', '0 0 1000 650');
        this.renderBlueprint();
        this.bindFloorSwitcher();
        this.bindFilters();
        this.startLiveSimulation();
    },

    renderBlueprint() {
        this.container.innerHTML = '';
        this.slots = [];

        const base = document.createElementNS(this.svgNS, 'polygon');
        base.setAttribute('points', `30,30 970,30 970,630 30,630`);
        base.setAttribute('fill', 'rgba(12, 12, 16, 0.9)');
        base.setAttribute('stroke', 'rgba(255, 255, 255, 0.12)');
        base.setAttribute('stroke-width', '2');
        base.setAttribute('rx', '12'); 
        this.container.appendChild(base);

        this.drawText('ENTRY ↓', 80, 20, '#10B981');
        this.drawText('EXIT ↓', 80, 645, '#FF5C00');

        for (let i = 0; i < 5; i++) {
            this.createSlot({ id: `A${i + 1}`, x: 160 + (i * 60), y: 50, w: 45, h: 70, type: 'accessible', label: `A${i+1} ♿`, stroke: '#3B82F6', fill: 'rgba(59, 130, 246, 0.15)' });
        }
        this.drawStructuralBlock(650, 50, 150, 70, 'LIFT / STAIRS');

        for (let i = 0; i < 8; i++) {
            this.createSlot({ id: `EV${i + 1}`, x: 860, y: 160 + (i * 50), w: 70, h: 40, type: 'ev', label: `EV${i+1}`, stroke: '#10B981', fill: 'rgba(16, 185, 129, 0.15)' });
        }

        for (let c = 0; c < 10; c++) {
            this.createSlot({ id: `B${c + 1}`, x: 160 + (c * 60), y: 190, w: 45, h: 70, type: '4w', label: `B${c+1}` });
            this.createSlot({ id: `C${c + 1}`, x: 160 + (c * 60), y: 260, w: 45, h: 70, type: '4w', label: `C${c+1}` });
        }
        for (let c = 0; c < 10; c++) {
            this.createSlot({ id: `D${c + 1}`, x: 160 + (c * 60), y: 400, w: 45, h: 70, type: '4w', label: `D${c+1}` });
            this.createSlot({ id: `E${c + 1}`, x: 160 + (c * 60), y: 470, w: 45, h: 70, type: '4w', label: `E${c+1}` });
        }

        for (let c = 0; c < 16; c++) {
            this.createSlot({ id: `M${c + 1}`, x: 160 + (c * 40), y: 570, w: 30, h: 45, type: '2w', label: `M${c+1}`, stroke: 'rgba(255, 255, 255, 0.25)', fill: 'rgba(255, 255, 255, 0.04)' });
        }

        const pathStr = `M 80 40 L 80 150 L 810 150 L 810 360 L 80 360 L 80 620`;
        const path = document.createElementNS(this.svgNS, 'path');
        path.setAttribute('d', pathStr);
        path.setAttribute('stroke', '#FF5C00');
        path.setAttribute('stroke-width', '2.5');
        path.setAttribute('stroke-dasharray', '8 8');
        path.setAttribute('fill', 'none');
        path.setAttribute('opacity', '0.6');
        this.container.appendChild(path);

        this.updateTelemetryHUD();
    },

    createSlot(cfg) {
        const occupancyChance = this.currentFloor === 1 ? 0.6 : 0.3;
        const isOccupied = Math.random() < occupancyChance;

        const g = document.createElementNS(this.svgNS, 'g');
        g.setAttribute('class', 'parking-slot');
        g.style.cursor = isOccupied ? 'not-allowed' : 'pointer';

        const poly = document.createElementNS(this.svgNS, 'polygon');
        poly.setAttribute('points', `${cfg.x},${cfg.y} ${cfg.x + cfg.w},${cfg.y} ${cfg.x + cfg.w},${cfg.y + cfg.h} ${cfg.x},${cfg.y + cfg.h}`);

        let stroke = cfg.stroke || 'rgba(255, 255, 255, 0.3)';
        let fill = cfg.fill || 'rgba(255, 255, 255, 0.04)';

        if (isOccupied) {
            stroke = 'rgba(255, 92, 0, 0.6)';
            fill = 'rgba(255, 92, 0, 0.25)';
        }

        poly.setAttribute('stroke', stroke);
        poly.setAttribute('fill', fill);
        poly.setAttribute('stroke-width', '1.5');
        poly.style.transition = 'all 0.2s ease';

        const clickHandler = () => {
            if (!isOccupied && window.OSMain) {
                // THE NEW MAGIC: Opens the Pop-up instead of the Dock!
                window.OSMain.showSlotPopup(cfg.id, cfg.type);
            }
        };

        poly.addEventListener('click', clickHandler);
        g.addEventListener('click', clickHandler);

        if (!isOccupied) {
            poly.addEventListener('mouseenter', () => {
                poly.setAttribute('stroke', '#FF5C00');
                poly.setAttribute('fill', 'rgba(255, 92, 0, 0.4)');
            });
            poly.addEventListener('mouseleave', () => {
                poly.setAttribute('stroke', stroke);
                poly.setAttribute('fill', fill);
            });
        }

        g.appendChild(poly);

        const text = document.createElementNS(this.svgNS, 'text');
        text.setAttribute('x', cfg.x + (cfg.w / 2));
        text.setAttribute('y', cfg.y + (cfg.h / 2) + (cfg.type === '2w' ? 3 : 4));
        text.setAttribute('fill', isOccupied ? '#FF5C00' : '#FFFFFF');
        text.setAttribute('font-size', cfg.type === '2w' ? '9' : '11');
        text.setAttribute('font-weight', 'bold');
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('pointer-events', 'none');
        text.textContent = cfg.label || cfg.id;
        g.appendChild(text);

        this.container.appendChild(g);
        this.slots.push({ id: cfg.id, poly, text, isOccupied, stroke, fill, type: cfg.type, g });
    },

    drawText(str, x, y, color) {
        const txt = document.createElementNS(this.svgNS, 'text');
        txt.setAttribute('x', x);
        txt.setAttribute('y', y);
        txt.setAttribute('fill', color);
        txt.setAttribute('font-size', '14');
        txt.setAttribute('font-weight', 'bold');
        txt.setAttribute('text-anchor', 'middle');
        txt.textContent = str;
        this.container.appendChild(txt);
    },

    drawStructuralBlock(x, y, w, h, text) {
        const poly = document.createElementNS(this.svgNS, 'polygon');
        poly.setAttribute('points', `${x},${y} ${x + w},${y} ${x + w},${y + h} ${x},${y + h}`);
        poly.setAttribute('fill', 'rgba(255, 255, 255, 0.08)');
        poly.setAttribute('stroke', 'rgba(255, 255, 255, 0.25)');
        poly.setAttribute('stroke-width', '1.5');
        this.container.appendChild(poly);

        const txt = document.createElementNS(this.svgNS, 'text');
        txt.setAttribute('x', x + (w / 2));
        txt.setAttribute('y', y + (h / 2) + 4);
        txt.setAttribute('fill', '#A1A1AA');
        txt.setAttribute('font-size', '12');
        txt.setAttribute('font-weight', 'bold');
        txt.setAttribute('text-anchor', 'middle');
        txt.textContent = text;
        this.container.appendChild(txt);
    },

    bindFloorSwitcher() {
        document.querySelectorAll('.floor-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.floor-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentFloor = parseInt(btn.getAttribute('data-floor'));
                
                if (typeof gsap !== 'undefined') {
                    gsap.to(this.container, { opacity: 0, scale: 0.98, duration: 0.2, onComplete: () => {
                        this.renderBlueprint();
                        gsap.to(this.container, { opacity: 1, scale: 1, duration: 0.4, ease: "power2.out" });
                    }});
                } else {
                    this.renderBlueprint();
                }
            });
        });
    },

    bindFilters() {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                const filter = e.target.getAttribute('data-filter');
                this.slots.forEach(slot => {
                    if (filter === 'all' || slot.type === filter || (filter === '4w' && slot.type === 'accessible')) {
                        slot.g.style.opacity = '1';
                        slot.g.style.pointerEvents = 'all';
                    } else {
                        slot.g.style.opacity = '0.1';
                        slot.g.style.pointerEvents = 'none';
                    }
                });
            });
        });
    },

    startLiveSimulation() {
        setInterval(() => {
            if (this.slots.length === 0) return;
            const rand = Math.floor(Math.random() * this.slots.length);
            const slot = this.slots[rand];
            slot.isOccupied = !slot.isOccupied;

            if (slot.isOccupied) {
                slot.poly.setAttribute('fill', 'rgba(255, 92, 0, 0.25)');
                slot.poly.setAttribute('stroke', 'rgba(255, 92, 0, 0.6)');
                slot.text.setAttribute('fill', '#FF5C00');
            } else {
                slot.poly.setAttribute('fill', slot.fill);
                slot.poly.setAttribute('stroke', slot.stroke);
                slot.text.setAttribute('fill', '#FFFFFF');
            }
            this.updateTelemetryHUD();
        }, 3000);
    },

    updateTelemetryHUD() {
        const total = this.slots.length;
        const occupied = this.slots.filter(s => s.isOccupied).length;
        const pct = total === 0 ? 0 : Math.round((occupied / total) * 100);
        const counterEl = document.getElementById('counter-occupancy');
        if (counterEl) counterEl.innerText = `${pct}%`;
    }
};

document.addEventListener('DOMContentLoaded', () => { setTimeout(() => SpatialMap.init(), 300); });