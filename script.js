/* ============================================================
   MallPark — script.js
   Vanilla JS only. Organized by concern:
   1. Mock data generation
   2. State & derived stats
   3. Rendering (grid, floors, analytics, EV, reservations)
   4. Navigation & sidebar
   5. Dark mode
   6. Search / filters
   7. Detail panel
   8. Reservations & fee estimator
   9. Live simulation
   ============================================================ */

(function () {
  'use strict';

  /* ---------------------------------------------------------
     1. MOCK DATA GENERATION
  --------------------------------------------------------- */
  const VEHICLE_TYPES = ['Car', 'SUV', 'Bike', 'Truck'];
  const STATUS_WEIGHTS = [
    ['available', 0.45],
    ['occupied', 0.4],
    ['reserved', 0.1],
  ]; // remainder become EV-capable overlay, not a status itself

  const FLOOR_COUNT = 4;
  const SLOTS_PER_FLOOR = 15;
  const LIFTS = ['Lift A', 'Lift B', 'Lift C'];

  // Shops are only present on some floors — mirrors a real mall where
  // upper parking levels are parking-only.
  const SHOPS_BY_FLOOR = {
    1: [
      { name: 'Reliance Trends', icon: '👕', distance: '25m from Exit' },
      { name: 'Café Brew', icon: '☕', distance: '32m from Lift Lobby' },
      { name: 'Timezone', icon: '🎮', distance: '48m from Entry' },
    ],
    2: [
      { name: 'Starbucks', icon: '☕', distance: '42m from Exit' },
      { name: 'Food Court', icon: '🍔', distance: '35m from Lift Lobby' },
      { name: 'INOX Cinemas', icon: '🎬', distance: '60m from Exit' },
      { name: 'Lifestyle', icon: '🛍️', distance: '55m from Entry' },
    ],
    3: [],
    4: [],
  };

  function weightedStatus() {
    const r = Math.random();
    let acc = 0;
    for (const [status, weight] of STATUS_WEIGHTS) {
      acc += weight;
      if (r <= acc) return status;
    }
    return 'available';
  }

  function generateSlots() {
    const slots = [];
    for (let floor = 1; floor <= FLOOR_COUNT; floor++) {
      for (let i = 1; i <= SLOTS_PER_FLOOR; i++) {
        const isEv = Math.random() < 0.15;
        slots.push({
          id: `F${floor}-${String(i).padStart(2, '0')}`,
          floor,
          number: i,
          status: isEv ? (Math.random() < 0.5 ? 'available' : 'occupied') : weightedStatus(),
          vehicleType: VEHICLE_TYPES[Math.floor(Math.random() * VEHICLE_TYPES.length)],
          isEv,
          fastCharger: isEv ? Math.random() < 0.5 : false,
          nearestLift: LIFTS[Math.floor(Math.random() * LIFTS.length)],
          walkDistance: 20 + Math.floor(Math.random() * 180),
        });
      }
    }
    return slots;
  }

  /* ---------------------------------------------------------
     2. STATE
  --------------------------------------------------------- */
  const state = {
    slots: generateSlots(),
    reservations: [
      { name: 'Priya Sharma', vehicleNo: 'MH12 AB1234', vehicleType: 'Car', arrival: '14:30', duration: 3 },
      { name: 'Rahul Verma', vehicleNo: 'MH14 CD9087', vehicleType: 'Bike', arrival: '16:00', duration: 2 },
    ],
    filters: { floor: 'all', status: 'all', vehicle: 'all', search: '' },
    activeFloorTab: 1,
    liveEnabled: true,
    selectedSlotId: null,
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function effectiveStatus(slot) {
    // For display purposes, EV-capable + available slots surface as "ev" filter bucket
    if (slot.isEv) return slot.status === 'available' ? 'ev' : slot.status;
    return slot.status;
  }

  function computeStats(slots) {
    const total = slots.length;
    const available = slots.filter(s => s.status === 'available').length;
    const occupied = slots.filter(s => s.status === 'occupied').length;
    const reserved = slots.filter(s => s.status === 'reserved').length;
    const occupancyPct = total ? Math.round((occupied / total) * 100) : 0;
    const availablePct = total ? Math.round((available / total) * 100) : 0;
    return { total, available, occupied, reserved, occupancyPct, availablePct };
  }

  /* ---------------------------------------------------------
     3. RENDERING
  --------------------------------------------------------- */
  function animateCounter(el, target) {
    const start = parseInt(el.textContent.replace(/[^\d]/g, ''), 10) || 0;
    const duration = 700;
    const t0 = performance.now();
    function step(t) {
      const p = Math.min(1, (t - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const val = Math.round(start + (target - start) * eased);
      el.textContent = el.dataset.suffix ? val + el.dataset.suffix : val;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function renderStats() {
    const stats = computeStats(state.slots);
    animateCounter($('#statTotal'), stats.total);
    animateCounter($('#statAvailable'), stats.available);
    animateCounter($('#statOccupied'), stats.occupied);
    $('#statOccupancy').textContent = stats.occupancyPct + '%';
    $('#statOccupancyBar').style.width = stats.occupancyPct + '%';
    $('#statAvailableNote').textContent = stats.availablePct + '% of total capacity';
    $('#statOccupiedNote').textContent = stats.occupancyPct + '% currently in use';
    return stats;
  }

  function slotsForFloor(floor) {
    return state.slots.filter(s => s.floor === floor);
  }

  function renderFloorCards() {
    const containers = [$('#floorCards'), $('#floorCardsFull')];
    containers.forEach(container => {
      if (!container) return;
      container.innerHTML = '';
      for (let floor = 1; floor <= FLOOR_COUNT; floor++) {
        const fSlots = slotsForFloor(floor);
        const total = fSlots.length;
        const available = fSlots.filter(s => s.status === 'available').length;
        const occupied = fSlots.filter(s => s.status === 'occupied').length;
        const pct = total ? Math.round((occupied / total) * 100) : 0;

        const card = document.createElement('div');
        card.className = 'floor-card';
        card.innerHTML = `
          <div class="floor-card-top">
            <h3>Floor ${floor}</h3>
            <span class="floor-pill">${total} slots</span>
          </div>
          <div class="floor-stats">
            <span>Available <b>${available}</b></span>
            <span>Occupied <b>${occupied}</b></span>
          </div>
          <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
          <button class="floor-card-btn" data-open-floor="${floor}">Open layout</button>
        `;
        card.addEventListener('click', (e) => {
          if (e.target.closest('[data-open-floor]') || true) openFloorLayout(floor);
        });
        container.appendChild(card);
      }
    });
  }

  function openFloorLayout(floor) {
    switchPage('floors');
    setFloorTab(floor);
  }

  function slotIcon(slot) {
    const icons = { Car: '🚗', SUV: '🚙', Bike: '🏍️', Truck: '🚚' };
    return icons[slot.vehicleType] || '🚗';
  }

  function renderSlotEl(slot) {
    const div = document.createElement('div');
    const status = effectiveStatus(slot);
    div.className = `slot ${slot.status}${slot.isEv ? ' ev-slot' : ''}`;
    div.setAttribute('role', 'button');
    div.setAttribute('tabindex', '0');
    div.setAttribute('aria-label', `Slot ${slot.id}, ${slot.status}${slot.isEv ? ', EV capable' : ''}`);
    div.dataset.id = slot.id;
    div.innerHTML = `
      ${slot.isEv ? '<span class="slot-badge">EV</span>' : ''}
      <span class="slot-icon" aria-hidden="true">${slot.status === 'occupied' ? slotIcon(slot) : (slot.status === 'reserved' ? '⏳' : (slot.isEv ? '⚡' : '🅿️'))}</span>
      <span class="slot-no">${slot.id.split('-')[1]}</span>
    `;
    div.addEventListener('click', () => openDetailPanel(slot.id));
    div.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetailPanel(slot.id); } });
    return div;
  }

  function matchesFilters(slot, filters) {
    if (filters.floor !== 'all' && String(slot.floor) !== String(filters.floor)) return false;
    if (filters.status !== 'all') {
      if (filters.status === 'ev') { if (!slot.isEv) return false; }
      else if (slot.status !== filters.status) return false;
    }
    if (filters.vehicle !== 'all' && slot.vehicleType !== filters.vehicle) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const haystack = `${slot.id} ${slot.vehicleType} floor ${slot.floor} ${slot.status}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  }

  function renderParkingGrid() {
    const grid = $('#parkingGrid');
    if (!grid) return;
    grid.innerHTML = '';
    const filtered = state.slots.filter(s => matchesFilters(s, state.filters));
    if (!filtered.length) {
      grid.innerHTML = `<p class="muted" style="grid-column:1/-1;">No slots match your search or filters.</p>`;
      return;
    }
    filtered.forEach(s => grid.appendChild(renderSlotEl(s)));
  }

  function setFloorTab(floor) {
    state.activeFloorTab = floor;
    $$('#floorTabs .chip').forEach(chip => {
      chip.classList.toggle('active', Number(chip.dataset.floorTab) === floor);
    });
    $('#floorGridTitle').textContent = `Floor ${floor} layout`;
    renderFloorGrid();
  }

  function renderFloorGrid() {
    const container = $('#floorGrid');
    if (!container) return;

    const slots = slotsForFloor(state.activeFloorTab);

    if (window.mountFloorLayout) {
      window.mountFloorLayout(state.activeFloorTab, slots, openDetailPanel);
    } else {
      // Fallback if the CDN scripts didn't load (e.g. offline) — plain grid.
      container.innerHTML = '';
      slots.forEach(s => container.appendChild(renderSlotEl(s)));
    }

    renderShopStrip(state.activeFloorTab);
  }

  function renderShopStrip(floor) {
    const stripContainer = $('#shopStrip');
    if (!stripContainer) return;
    const shops = SHOPS_BY_FLOOR[floor] || [];
    if (!shops.length) {
      stripContainer.innerHTML = `<p class="muted">No shops on this floor — parking only.</p>`;
      return;
    }
    stripContainer.innerHTML = shops.map(sh => `
      <div class="shop-card">
        <div class="shop-icon" aria-hidden="true">${sh.icon}</div>
        <div class="shop-name">${sh.name}</div>
        <div class="shop-dist">${sh.distance}</div>
      </div>
    `).join('');
  }

  function renderEvGrid() {
    const evSlots = state.slots.filter(s => s.isEv);
    const grid = $('#evGrid');
    grid.innerHTML = '';
    evSlots.forEach(slot => {
      const card = document.createElement('div');
      card.className = `ev-card${slot.status === 'occupied' ? ' occupied-ev' : ''}`;
      card.innerHTML = `
        <div class="battery-icon">${slot.status === 'occupied' ? '🔋' : '🔌'}</div>
        <div class="ev-card-slot">${slot.id}</div>
        <div class="ev-card-type">${slot.fastCharger ? 'Fast charger' : 'Normal charger'} · Floor ${slot.floor}</div>
        <span class="ev-card-status ${slot.status === 'occupied' ? 'occupied' : 'available'}">${slot.status === 'occupied' ? 'Occupied' : 'Available'}</span>
      `;
      grid.appendChild(card);
    });
    $('#evAvailable').textContent = evSlots.filter(s => s.status !== 'occupied').length;
    $('#evOccupied').textContent = evSlots.filter(s => s.status === 'occupied').length;
    $('#evFast').textContent = evSlots.filter(s => s.fastCharger).length;
    $('#evNormal').textContent = evSlots.filter(s => !s.fastCharger).length;
  }

  /* ---- Analytics: custom bar / pie / rings / line, no libraries ---- */
  function renderAnalytics() {
    const stats = computeStats(state.slots);

    // Rings
    const circumference = 2 * Math.PI * 50; // r=50
    const occRing = $('#ringOccupied');
    const availRing = $('#ringAvailable');
    occRing.style.strokeDasharray = circumference;
    occRing.style.strokeDashoffset = circumference - (stats.occupancyPct / 100) * circumference;
    availRing.style.strokeDasharray = circumference;
    availRing.style.strokeDashoffset = circumference - (stats.availablePct / 100) * circumference;
    $('#ringOccupiedVal').textContent = stats.occupancyPct + '%';
    $('#ringAvailableVal').textContent = stats.availablePct + '%';

    // Bar chart: occupancy % per floor
    const barChart = $('#barChart');
    barChart.innerHTML = '';
    let busiest = { floor: 1, pct: -1 };
    for (let floor = 1; floor <= FLOOR_COUNT; floor++) {
      const fSlots = slotsForFloor(floor);
      const occ = fSlots.filter(s => s.status === 'occupied').length;
      const pct = Math.round((occ / fSlots.length) * 100);
      if (pct > busiest.pct) busiest = { floor, pct };
      const col = document.createElement('div');
      col.className = 'bar-col';
      col.innerHTML = `<span class="bar-pct">${pct}%</span><div class="bar" style="height:${pct}%"></div><span class="bar-label">Floor ${floor}</span>`;
      barChart.appendChild(col);
    }
    $('#busiestFloor').textContent = `Floor ${busiest.floor}`;

    // Pie chart: status distribution via conic-gradient
    const total = state.slots.length;
    const available = state.slots.filter(s => s.status === 'available').length;
    const occupied = state.slots.filter(s => s.status === 'occupied').length;
    const reserved = state.slots.filter(s => s.status === 'reserved').length;
    const evCount = state.slots.filter(s => s.isEv).length;

    const segments = [
      { label: 'Available', value: available, color: 'var(--available)' },
      { label: 'Occupied', value: occupied, color: 'var(--occupied)' },
      { label: 'Reserved', value: reserved, color: 'var(--reserved)' },
    ];
    let cursor = 0;
    const gradientParts = segments.map(seg => {
      const pct = (seg.value / total) * 100;
      const part = `${seg.color} ${cursor}% ${cursor + pct}%`;
      cursor += pct;
      return part;
    });
    $('#pieChart').style.background = `conic-gradient(${gradientParts.join(', ')})`;

    const legend = $('#pieLegend');
    legend.innerHTML = '';
    segments.forEach(seg => {
      const row = document.createElement('div');
      row.className = 'pie-legend-item';
      row.innerHTML = `<i class="dot" style="background:${seg.color}"></i>${seg.label}<b>${seg.value}</b>`;
      legend.appendChild(row);
    });
    const evRow = document.createElement('div');
    evRow.className = 'pie-legend-item';
    evRow.innerHTML = `<i class="dot" style="background:var(--ev)"></i>EV capable<b>${evCount}</b>`;
    legend.appendChild(evRow);

    // Line graph: mock traffic curve across the day (SVG polyline)
    renderLineChart();
  }

  function renderLineChart() {
    const svg = $('#lineChart');
    const hours = Array.from({ length: 13 }, (_, i) => i + 8); // 8am - 8pm
    // Deterministic-ish curve peaking around 6-8pm, seeded by time so it feels "live" but stable per render
    const points = hours.map((h, i) => {
      const base = 30 + 55 * Math.exp(-Math.pow((h - 18) / 4, 2));
      const jitter = Math.sin(i * 1.7) * 4;
      return Math.max(5, Math.min(95, base + jitter));
    });
    const w = 600, h = 200, pad = 10;
    const stepX = (w - pad * 2) / (points.length - 1);
    const coords = points.map((v, i) => {
      const x = pad + i * stepX;
      const y = h - pad - (v / 100) * (h - pad * 2);
      return [x, y];
    });
    const linePath = coords.map((c, i) => (i === 0 ? `M${c[0]},${c[1]}` : `L${c[0]},${c[1]}`)).join(' ');
    const areaPath = `${linePath} L${coords[coords.length - 1][0]},${h - pad} L${coords[0][0]},${h - pad} Z`;

    svg.innerHTML = `
      <defs>
        <linearGradient id="lineFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.28"/>
          <stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <path d="${areaPath}" fill="url(#lineFade)" stroke="none"></path>
      <path d="${linePath}" fill="none" stroke="var(--accent-strong)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></path>
      ${coords.map(c => `<circle cx="${c[0]}" cy="${c[1]}" r="3" fill="var(--accent-strong)"></circle>`).join('')}
    `;
  }

  /* ---- Reservations list ---- */
  function renderReservations() {
    const list = $('#resList');
    list.innerHTML = '';
    if (!state.reservations.length) {
      list.innerHTML = `<p class="muted">No upcoming reservations yet.</p>`;
      return;
    }
    state.reservations.forEach(r => {
      const row = document.createElement('div');
      row.className = 'res-item';
      row.innerHTML = `
        <div>
          <div class="res-item-name">${r.name}</div>
          <div class="res-item-meta">${r.vehicleNo} · ${r.vehicleType} · Arrives ${r.arrival} · ${r.duration}h</div>
        </div>
        <span class="res-item-badge">Reserved</span>
      `;
      list.appendChild(row);
    });
  }

  /* ---- Nearest available slot suggestion ---- */
  function renderNearestSlot() {
    const available = state.slots.filter(s => s.status === 'available');
    const box = $('#nearestSlot');
    if (!available.length) {
      box.innerHTML = 'No open slots right now — check back shortly.';
      return;
    }
    const nearest = available.reduce((a, b) => (a.walkDistance < b.walkDistance ? a : b));
    box.innerHTML = `<b>${nearest.id}</b>Floor ${nearest.floor} · ${nearest.walkDistance}m walk · near ${nearest.nearestLift}`;
    box.dataset.slotId = nearest.id;
  }

  /* ---------------------------------------------------------
     4. NAVIGATION & SIDEBAR
  --------------------------------------------------------- */
  function switchPage(pageName) {
    $$('.page').forEach(p => p.classList.toggle('active', p.dataset.page === pageName));
    $$('.nav-item').forEach(n => {
      const isActive = n.dataset.page === pageName;
      n.classList.toggle('active', isActive);
      if (isActive) n.setAttribute('aria-current', 'page'); else n.removeAttribute('aria-current');
    });
    closeSidebarMobile();
    if (pageName === 'analytics') renderAnalytics();
    if (pageName === 'floors') setFloorTab(state.activeFloorTab);
    if (pageName === 'ev') renderEvGrid();
    if (pageName === 'reservations') renderReservations();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function initNav() {
    $$('.nav-item').forEach(item => {
      item.addEventListener('click', () => switchPage(item.dataset.page));
    });
    $$('[data-goto]').forEach(el => {
      el.addEventListener('click', () => switchPage(el.dataset.goto));
    });
  }

  function openSidebarMobile() {
    $('#sidebar').classList.add('open');
    $('#overlay').classList.add('show');
  }
  function closeSidebarMobile() {
    $('#sidebar').classList.remove('open');
    $('#overlay').classList.remove('show');
  }
  function initSidebarToggle() {
    $('#hamburgerBtn').addEventListener('click', () => {
      $('#sidebar').classList.contains('open') ? closeSidebarMobile() : openSidebarMobile();
    });
    $('#overlay').addEventListener('click', closeSidebarMobile);
  }

  /* ---------------------------------------------------------
     5. DARK MODE
  --------------------------------------------------------- */
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('mallpark-theme', theme);
    const isDark = theme === 'dark';
    $('#settingsDarkSwitch').classList.toggle('active', isDark);
    $('#settingsDarkSwitch').setAttribute('aria-checked', String(isDark));
    // re-render color-dependent visuals
    if ($('.page[data-page="analytics"]').classList.contains('active')) renderAnalytics();
  }
  function initDarkMode() {
    const saved = localStorage.getItem('mallpark-theme') ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    applyTheme(saved);

    function toggleTheme() {
      const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(current);
    }
    $('#darkToggle').addEventListener('click', toggleTheme);
    $('#settingsDarkSwitch').addEventListener('click', toggleTheme);
  }

  /* ---------------------------------------------------------
     6. SEARCH / FILTERS
  --------------------------------------------------------- */
  function initFilters() {
    $$('.chip[data-filter="floor"]').forEach(chip => {
      chip.addEventListener('click', () => {
        $$('.chip[data-filter="floor"]').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        state.filters.floor = chip.dataset.value;
        renderParkingGrid();
      });
    });
    $('#statusFilter').addEventListener('change', (e) => {
      state.filters.status = e.target.value;
      renderParkingGrid();
    });
    $('#vehicleFilter').addEventListener('change', (e) => {
      state.filters.vehicle = e.target.value;
      renderParkingGrid();
    });
    $('#globalSearch').addEventListener('input', (e) => {
      state.filters.search = e.target.value.trim();
      renderParkingGrid();
    });

    $('#floorTabs').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-floor-tab]');
      if (!btn) return;
      setFloorTab(Number(btn.dataset.floorTab));
    });
  }

  /* ---------------------------------------------------------
     7. DETAIL PANEL
  --------------------------------------------------------- */
  const STATUS_LABELS = { available: 'Available', occupied: 'Occupied', reserved: 'Reserved' };
  const STATUS_BG = { available: 'var(--available-bg)', occupied: 'var(--occupied-bg)', reserved: 'var(--reserved-bg)' };
  const STATUS_TEXT = { available: '#3E6B42', occupied: '#8C4747', reserved: '#4E4A79' };

  function openDetailPanel(slotId) {
    const slot = state.slots.find(s => s.id === slotId);
    if (!slot) return;
    state.selectedSlotId = slotId;

    $('#detailSlotNo').textContent = slot.id;
    const badge = $('#detailStatusBadge');
    badge.textContent = STATUS_LABELS[slot.status] + (slot.isEv ? ' · EV' : '');
    badge.style.background = STATUS_BG[slot.status];
    badge.style.color = STATUS_TEXT[slot.status];
    $('#detailVehicle').textContent = slot.vehicleType;
    $('#detailFloor').textContent = `Floor ${slot.floor}`;
    $('#detailLift').textContent = slot.nearestLift;
    $('#detailDistance').textContent = `${slot.walkDistance}m`;
    $('#detailEv').textContent = slot.isEv ? (slot.fastCharger ? 'Yes · Fast charger' : 'Yes · Normal charger') : 'Not available';

    const reserveBtn = $('#detailReserveBtn');
    reserveBtn.disabled = slot.status !== 'available';
    reserveBtn.textContent = slot.status === 'available' ? 'Reserve this slot' : 'Slot unavailable';
    reserveBtn.style.opacity = slot.status === 'available' ? '1' : '.5';
    reserveBtn.style.cursor = slot.status === 'available' ? 'pointer' : 'not-allowed';

    $('#detailPanel').classList.add('show');
    $('#detailPanel').setAttribute('aria-hidden', 'false');
    $('#detailOverlay').classList.add('show');
  }
  function closeDetailPanel() {
    $('#detailPanel').classList.remove('show');
    $('#detailPanel').setAttribute('aria-hidden', 'true');
    $('#detailOverlay').classList.remove('show');
  }
  function initDetailPanel() {
    $('#detailClose').addEventListener('click', closeDetailPanel);
    $('#detailOverlay').addEventListener('click', closeDetailPanel);
    $('#detailReserveBtn').addEventListener('click', () => {
      const slot = state.slots.find(s => s.id === state.selectedSlotId);
      if (!slot || slot.status !== 'available') return;
      slot.status = 'reserved';
      renderAllGridDependents();
      showToast(`${slot.id} reserved successfully.`);
      closeDetailPanel();
    });
    $('#nearestBtn').addEventListener('click', () => {
      const box = $('#nearestSlot');
      if (box.dataset.slotId) openDetailPanel(box.dataset.slotId);
    });
  }

  /* ---------------------------------------------------------
     8. RESERVATIONS FORM & FEE ESTIMATOR
  --------------------------------------------------------- */
  function initReservationForm() {
    $('#reservationForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const reservation = {
        name: $('#resName').value.trim(),
        vehicleNo: $('#resVehicleNo').value.trim(),
        vehicleType: $('#resVehicleType').value,
        arrival: $('#resArrival').value || '—',
        duration: Number($('#resDuration').value) || 1,
      };
      state.reservations.unshift(reservation);
      renderReservations();

      // Try to mark a matching available slot as reserved for realism
      const match = state.slots.find(s => s.status === 'available' && s.vehicleType === reservation.vehicleType);
      if (match) { match.status = 'reserved'; renderAllGridDependents(); }

      $('#resSuccess').hidden = false;
      e.target.reset();
      $('#resDuration').value = 2;
      showToast('Reservation confirmed.');
      setTimeout(() => { $('#resSuccess').hidden = true; }, 4000);
    });
  }

  const FEE_RATES = { Bike: 20, Car: 40, SUV: 55, Truck: 80 };
  function initFeeEstimator() {
    $('#feeForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const type = $('#feeVehicleType').value;
      const entry = $('#feeEntry').value;
      const exit = $('#feeExit').value;
      if (!entry || !exit) return;

      const [eh, em] = entry.split(':').map(Number);
      const [xh, xm] = exit.split(':').map(Number);
      let minutes = (xh * 60 + xm) - (eh * 60 + em);
      if (minutes <= 0) minutes += 24 * 60; // handle overnight
      const hours = Math.ceil(minutes / 60);
      const rate = FEE_RATES[type];
      const subtotal = hours * rate;
      const gst = Math.round(subtotal * 0.18);
      const total = subtotal + gst;

      $('#feeHours').textContent = `${hours} hr${hours > 1 ? 's' : ''}`;
      $('#feeRate').textContent = `₹${rate}/hr`;
      $('#feeSubtotal').textContent = `₹${subtotal}`;
      $('#feeGst').textContent = `₹${gst}`;
      $('#feeTotal').textContent = `₹${total}`;
    });
  }

  /* ---------------------------------------------------------
     9. LIVE SIMULATION
  --------------------------------------------------------- */
  function renderAllGridDependents() {
    renderStats();
    renderFloorCards();
    renderParkingGrid();
    if ($('.page[data-page="floors"]').classList.contains('active')) renderFloorGrid();
    if ($('.page[data-page="analytics"]').classList.contains('active')) renderAnalytics();
    if ($('.page[data-page="ev"]').classList.contains('active')) renderEvGrid();
    renderNearestSlot();
  }

  function simulateLiveUpdate() {
    if (!state.liveEnabled) return;
    const candidates = state.slots.filter(s => s.status === 'available' || s.status === 'occupied');
    const flips = Math.min(4, Math.ceil(candidates.length * 0.05));
    for (let i = 0; i < flips; i++) {
      const slot = candidates[Math.floor(Math.random() * candidates.length)];
      if (!slot) continue;
      slot.status = slot.status === 'available' ? 'occupied' : 'available';
    }
    renderAllGridDependents();
  }
  function initLiveSimulation() {
    setInterval(simulateLiveUpdate, 5000);
    $('#settingsLiveSwitch').addEventListener('click', () => {
      state.liveEnabled = !state.liveEnabled;
      $('#settingsLiveSwitch').classList.toggle('active', state.liveEnabled);
      $('#settingsLiveSwitch').setAttribute('aria-checked', String(state.liveEnabled));
    });
  }

  /* ---- live clock ---- */
  function initClock() {
    function tick() {
      const now = new Date();
      $('#liveClock').textContent = now.toLocaleTimeString('en-IN', { hour12: false });
    }
    tick();
    setInterval(tick, 1000);
  }

  /* ---- toast ---- */
  let toastTimer;
  function showToast(message) {
    const toast = $('#toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
  }

  /* ---- parking tips rotation (bonus) ---- */
  const TIPS = [
    'Level 2 tends to clear out fastest after 6 PM.',
    'EV bays near Lift B rarely queue on weekends.',
    'Ground floor fills first — try Floor 3 for quick access.',
    'Reserve ahead during weekend evenings to skip the search.',
  ];
  function initTips() {
    let i = 0;
    setInterval(() => {
      i = (i + 1) % TIPS.length;
      $('#tipText').style.opacity = 0;
      setTimeout(() => { $('#tipText').textContent = TIPS[i]; $('#tipText').style.opacity = 1; }, 250);
    }, 8000);
  }

  /* ---------------------------------------------------------
     INIT
  --------------------------------------------------------- */
  function init() {
    initNav();
    initSidebarToggle();
    initDarkMode();
    initFilters();
    initDetailPanel();
    initReservationForm();
    initFeeEstimator();
    initLiveSimulation();
    initClock();
    initTips();

    renderStats();
    renderFloorCards();
    renderParkingGrid();
    setFloorTab(1);
    renderReservations();
    renderNearestSlot();
  }

  document.addEventListener('DOMContentLoaded', init);
})();