/* ============================================================
   floor-layout.jsx
   A small React island (loaded via CDN + in-browser Babel, no
   build step) that renders a realistic, top-down parking layout:
   painted bay lines, real car silhouettes, a driving lane with
   entry/exit signage, and a lift lobby. Mounted into #floorGrid
   by script.js — everything else in the app stays vanilla JS.
   ============================================================ */

(function () {
  'use strict';
  const e = React.createElement;

  const VEHICLE_COLORS = { Car: '#5B7DA6', SUV: '#7C6CAE', Bike: '#B08B4F', Truck: '#6E8B6B' };

  /* ---- top-down car silhouette ---- */
  function CarIcon({ type }) {
    const color = VEHICLE_COLORS[type] || VEHICLE_COLORS.Car;
    return e('g', { transform: 'translate(15,10)' },
      e('rect', { x: 0, y: 8, width: 34, height: 58, rx: 10, fill: color, stroke: '#1E1C18', strokeWidth: 1 }),
      e('rect', { x: 5, y: 16, width: 24, height: 15, rx: 3, fill: '#E7F0F8', opacity: 0.92 }),
      e('rect', { x: 5, y: 45, width: 24, height: 13, rx: 3, fill: '#E7F0F8', opacity: 0.75 }),
      e('circle', { cx: 7, cy: 15, r: 2.1, fill: '#FFE9A8' }),
      e('circle', { cx: 27, cy: 15, r: 2.1, fill: '#FFE9A8' }),
      e('circle', { cx: 7, cy: 63, r: 2.1, fill: '#D7654F' }),
      e('circle', { cx: 27, cy: 63, r: 2.1, fill: '#D7654F' })
    );
  }

  const STATUS_PALETTE = {
    available: { fill: 'rgba(144,198,149,0.30)', stroke: '#90C695' },
    occupied: { fill: 'rgba(217,154,154,0.22)', stroke: '#D99A9A' },
    reserved: { fill: 'rgba(184,178,217,0.30)', stroke: '#B8B2D9' },
  };

  /* ---- a single painted parking bay ---- */
  function Bay({ slot, onClick }) {
    const palette = STATUS_PALETTE[slot.status] || STATUS_PALETTE.available;
    const activate = () => onClick(slot.id);
    return e('g', {
        className: 'bay',
        onClick: activate,
        onKeyDown: (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); activate(); } },
        tabIndex: 0,
        role: 'button',
        'aria-label': `Slot ${slot.id}, ${slot.status}${slot.isEv ? ', EV capable' : ''}`,
      },
      e('rect', { x: 0, y: 0, width: 64, height: 96, rx: 3, fill: palette.fill, stroke: palette.stroke, strokeWidth: 2 }),
      // painted bay divider lines, like real parking paint
      e('line', { x1: 0, y1: 2, x2: 0, y2: 94, stroke: '#EFEAE0', strokeWidth: 2, opacity: 0.55 }),
      e('line', { x1: 64, y1: 2, x2: 64, y2: 94, stroke: '#EFEAE0', strokeWidth: 2, opacity: 0.55 }),
      slot.status === 'occupied' && e(CarIcon, { type: slot.vehicleType }),
      slot.status === 'reserved' && e('text', { x: 32, y: 56, textAnchor: 'middle', fontSize: 22 }, '⏳'),
      slot.isEv && slot.status === 'available' && e('text', { x: 32, y: 34, textAnchor: 'middle', fontSize: 17 }, '⚡'),
      e('text', {
        x: 32, y: 90, textAnchor: 'middle', fontSize: 10.5, fontWeight: 700,
        fill: slot.status === 'occupied' ? '#F0EDE6' : '#F0EDE6',
      }, slot.id.split('-')[1])
    );
  }

  /* ---- a block of bays, 2 columns wide, painted on asphalt ---- */
  function Block({ slots, onClick, align }) {
    const cols = 2, gap = 8, bw = 64, bh = 96;
    const rows = Math.ceil(slots.length / cols) || 1;
    const width = cols * bw + (cols - 1) * gap;
    const height = rows * bh + (rows - 1) * gap;
    return e('svg', {
        viewBox: `0 0 ${width} ${height}`,
        width, height,
        style: { display: 'block', overflow: 'visible' },
        'aria-label': `${align} parking bays`,
      },
      slots.map((s, i) => {
        const col = i % cols, row = Math.floor(i / cols);
        const x = col * (bw + gap), y = row * (bh + gap);
        return e('g', { key: s.id, transform: `translate(${x},${y})` }, e(Bay, { slot: s, onClick }));
      })
    );
  }

  /* ---- full realistic floor layout: two bay blocks + a driving lane ---- */
  function FloorLayout({ slots, onSlotClick }) {
    const mid = Math.ceil(slots.length / 2);
    const west = slots.slice(0, mid);
    const east = slots.slice(mid);

    return e('div', { className: 'realistic-lot' },
      e('div', { className: 'lot-row' },
        e('div', { className: 'lot-block' }, e(Block, { slots: west, onClick: onSlotClick, align: 'West' })),
        e('div', { className: 'lot-lane' },
          e('div', { className: 'lane-dash', 'aria-hidden': 'true' }),
          e('div', { className: 'lane-tag lane-entry' }, '↘ ENTRY'),
          e('div', { className: 'lift-lobby' },
            e('svg', { viewBox: '0 0 24 24', width: 22, height: 22, 'aria-hidden': 'true' },
              e('path', { d: 'M4 3h16v18H4V3Zm4 4v10l4-3 4 3V7l-4 3-4-3Z', fill: 'currentColor' })
            ),
            'LIFT LOBBY'
          ),
          e('div', { className: 'lane-tag lane-exit' }, 'EXIT ↗')
        ),
        e('div', { className: 'lot-block' }, e(Block, { slots: east, onClick: onSlotClick, align: 'East' }))
      )
    );
  }

  /* ---- mount helper called from script.js ---- */
  let reactRoot = null;
  window.mountFloorLayout = function (floor, slots, onSlotClick) {
    const container = document.getElementById('floorGrid');
    if (!container) return;
    if (!reactRoot) reactRoot = ReactDOM.createRoot(container);
    reactRoot.render(e(FloorLayout, { floor, slots, onSlotClick }));
  };
})();