/* ==========================================================================
   AURA OS | MAIN CONTROLLER (IN-DOCK BOOKING FLOW)
   ========================================================================== */

const OSMain = {
    isInitialized: false, 
    timerInterval: null,
    totalSeconds: 0,
    currentSeconds: 0,
    isCmdAnimating: false,
    selectedPopupSlot: null,
    selectedPopupIsEV: false,

    init() {
        if (this.isInitialized) return; 
        this.isInitialized = true;

        this.bindLeftDockTabs();
        this.bindCommandPalette();
        this.bindBookingEvents();
        this.bindBookingInputs();
        this.bindThemeToggle();
    },

   bindThemeToggle() {
    const toggle = document.getElementById('theme-toggle');

    if (!toggle) return;

    // Load saved theme
    const savedTheme = localStorage.getItem('aura-theme');

    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
    }

    toggle.addEventListener('click', () => {
        document.body.classList.toggle('light-theme');

        const isLight =
            document.body.classList.contains('light-theme');

        localStorage.setItem(
            'aura-theme',
            isLight ? 'light' : 'dark'
        );
    });
},

    bindLeftDockTabs() {
        const navBtns = document.querySelectorAll('.dock-nav .nav-btn');
        navBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const currentBtn = e.target.closest('.nav-btn') || btn; 
                navBtns.forEach(b => b.classList.remove('active'));
                currentBtn.classList.add('active');

                const targetTabId = currentBtn.getAttribute('data-tab');
                document.querySelectorAll('.dock-tab').forEach(tab => {
                    tab.classList.remove('active');
                    tab.classList.add('hidden');
                    tab.style.display = 'none'; 
                });

                const activeTab = document.getElementById(targetTabId);
                if (activeTab) {
                    activeTab.classList.remove('hidden');
                    activeTab.classList.add('active');
                    activeTab.style.display = 'flex';
                }
            });
        });
    },

    // --- NEW: Toggles contents within the Left Dock ---
    toggleBookingForm(show) {
        const mainPanel = document.getElementById('left-panel-main');
        const bookingPanel = document.getElementById('left-panel-booking');
        
        if (show) {
            mainPanel.style.display = 'none';
            bookingPanel.style.display = 'flex';
            
            // Set current time into Check-in automatically
            const now = new Date();
            const timeStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
            document.getElementById('booking-in').value = timeStr;
            
        } else {
            bookingPanel.style.display = 'none';
            mainPanel.style.display = 'flex';
        }
    },

    toggleCommandPalette() {
        const overlay = document.getElementById('command-palette-overlay');
        const input = document.getElementById('cmd-input');
        if (!overlay || this.isCmdAnimating) return; 

        if (overlay.classList.contains('hidden')) {
            overlay.classList.remove('hidden');
            this.isCmdAnimating = true;
            
            if (input) {
                input.value = '';
                const items = document.querySelectorAll('.cmd-item');
                items.forEach(item => {
                    item.style.display = 'flex';
                    item.classList.remove('active');
                });
                if (items.length > 0) items[0].classList.add('active');
                setTimeout(() => input.focus(), 50);
            }

            if (typeof gsap !== 'undefined') {
                gsap.killTweensOf('.cmd-palette');
                gsap.fromTo('.cmd-palette', 
                    { scale: 0.95, opacity: 0, y: 10 }, 
                    { scale: 1, opacity: 1, y: 0, duration: 0.2, ease: "back.out(1.5)", onComplete: () => this.isCmdAnimating = false }
                );
            } else {
                this.isCmdAnimating = false;
            }
        } else {
            this.isCmdAnimating = true;
            if (typeof gsap !== 'undefined') {
                gsap.killTweensOf('.cmd-palette');
                gsap.to('.cmd-palette', { 
                    scale: 0.95, opacity: 0, y: 10, duration: 0.15, 
                    onComplete: () => {
                        overlay.classList.add('hidden');
                        this.isCmdAnimating = false;
                    }
                });
            } else {
                overlay.classList.add('hidden');
                this.isCmdAnimating = false;
            }
        }
    },

    bindCommandPalette() {
        const input = document.getElementById('cmd-input');
        const trigger = document.getElementById('cmd-trigger');
        const overlay = document.getElementById('command-palette-overlay');

        if (input) {
            input.addEventListener('input', (e) => {
                const query = e.target.value.toLowerCase().trim();
                const items = document.querySelectorAll('.cmd-item');
                let firstVisible = null;

                items.forEach(item => {
                    const text = item.innerText.toLowerCase();
                    if (text.includes(query)) {
                        item.style.display = 'flex';
                        if (!firstVisible) firstVisible = item;
                    } else {
                        item.style.display = 'none';
                    }
                });
                items.forEach(i => i.classList.remove('active'));
                if (firstVisible) firstVisible.classList.add('active');
            });

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const activeItem = document.querySelector('.cmd-item.active');
                    if (activeItem) {
                        const action = activeItem.getAttribute('data-action');
                        this.executeCommand(action);
                    }
                }
            });
        }

        document.querySelectorAll('.cmd-item').forEach(item => {
            item.addEventListener('click', () => {
                const action = item.getAttribute('data-action');
                this.executeCommand(action);
            });
        });

        document.addEventListener('keydown', (e) => {
            if (e.repeat) return; 
            if ((e.metaKey || e.ctrlKey) && e.key && e.key.toLowerCase() === 'k') { 
                e.preventDefault(); 
                this.toggleCommandPalette(); 
            }
            if (e.key === 'Escape' && overlay && !overlay.classList.contains('hidden')) {
                e.preventDefault();
                this.toggleCommandPalette();
            }
        });

        if (trigger) trigger.addEventListener('click', () => this.toggleCommandPalette());
        if (overlay) overlay.addEventListener('click', (e) => { 
            if (e.target === overlay) this.toggleCommandPalette(); 
        });
    },

    executeCommand(action) {
        const overlay = document.getElementById('command-palette-overlay');
        if (overlay && !overlay.classList.contains('hidden')) {
            this.toggleCommandPalette();
        }

        switch (action) {
            case 'book':
                this.showSlotPopup('B1', '4w'); 
                break;
            case 'ping-ev':
                const fleetTabBtn = document.querySelector('.dock-nav .nav-btn[data-tab="tab-fleet"]');
                if (fleetTabBtn) fleetTabBtn.click();
                
                const evFilterBtn = document.querySelector('.map-filters .filter-btn[data-filter="ev"]');
                if (evFilterBtn) evFilterBtn.click();

                const aiFeed = document.getElementById('ev-ping-status');
                if (aiFeed) {
                    aiFeed.innerHTML = '<div class="widget-card" style="border-color: rgba(16, 185, 129, 0.5);"><span class="text-emerald" style="font-size: 0.85rem;">⚡ Ping sent. All stations responding online.</span></div>';
                }
                break;
            case 'export-report':
                this.downloadAnalyticsReport();
                break;
        }
    },

    downloadAnalyticsReport() {
        const now = new Date();
        const csvRows = [
            ["Timestamp", "Floor", "Total Capacity", "Occupancy Rate", "Hourly Revenue"],
            [now.toISOString(), "Level 1", "120 bays", "68%", "₹2,450/hr"],
            [now.toISOString(), "Level 2", "120 bays", "42%", "₹1,800/hr"],
            [now.toISOString(), "Level 3", "120 bays", "25%", "₹950/hr"]
        ];
        const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `AURA_Parking_Analytics_${now.toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },

    openSessionPage() {
        const overlay = document.getElementById('session-page-overlay');
        if (!overlay) return;
        overlay.classList.remove('hidden');
        if (typeof gsap !== 'undefined') {
            gsap.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.3 });
            gsap.fromTo('.session-page-container > .glass-panel', { y: 30, opacity: 0, scale: 0.95 }, { y: 0, opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(1.2)' });
        }
    },

    closeSessionPage() {
        const overlay = document.getElementById('session-page-overlay');
        if (!overlay) return;
        if (typeof gsap !== 'undefined') {
            gsap.to(overlay, { opacity: 0, duration: 0.2, onComplete: () => overlay.classList.add('hidden') });
        } else {
            overlay.classList.add('hidden');
        }
    },

    showSlotPopup(slotId, type) {
        this.selectedPopupSlot = slotId;
        this.selectedPopupIsEV = (type === 'ev');
        
        const popup = document.getElementById('slot-popup-overlay');
        document.getElementById('popup-slot-id').innerText = slotId;
        
        let typeName = "Standard 4W";
        let price = "Estimate at checkout";
        let icon = "local_parking";
        let color = "#3B82F6";

        if (type === 'ev') { typeName = "EV Charging Bay"; price = "Estimate at checkout"; icon = "electric_car"; color = "#10B981"; }
        if (type === '2w') { typeName = "2-Wheeler Spot"; price = "Estimate at checkout"; icon = "two_wheeler"; color = "#A1A1AA"; }
        if (type === 'accessible') { typeName = "Accessible Bay"; price = "Estimate at checkout"; icon = "accessible"; color = "#3B82F6"; }

        document.getElementById('popup-slot-type').innerText = typeName;
        document.getElementById('popup-slot-price').innerText = price;
        
        const iconEl = document.getElementById('popup-icon');
        if(iconEl) {
            iconEl.innerText = icon;
            iconEl.style.color = color;
        }

        popup.classList.remove('hidden');
        if (typeof gsap !== 'undefined') {
            gsap.fromTo('.popup-panel', { scale: 0.9, opacity: 0, y: 20 }, { scale: 1, opacity: 1, y: 0, duration: 0.3, ease: "back.out(1.5)" });
        }
    },

    closeSlotPopup() {
        const popup = document.getElementById('slot-popup-overlay');
        if (!popup) return;
        
        if (typeof gsap !== 'undefined') {
            gsap.to('.popup-panel', { scale: 0.9, opacity: 0, y: 20, duration: 0.2, onComplete: () => popup.classList.add('hidden') });
        } else {
            popup.classList.add('hidden');
        }
    },

    bindBookingEvents() {
        document.addEventListener('click', (e) => {
            
            // HUD CURRENT SESSION BUTTON
            if (e.target.closest('#btn-view-session')) {
                this.openSessionPage();
            }

            // CLOSE SESSION PAGE
            if (e.target.closest('#btn-close-session-page')) {
                this.closeSessionPage();
            }

            // Popup Cancels
            if (e.target.closest('#btn-popup-cancel')) {
                this.closeSlotPopup();
            }

            // Popup triggers Booking Mode
            if (e.target.closest('#btn-popup-book')) {
                this.closeSlotPopup();
                this.openBookingPanel(this.selectedPopupSlot, this.selectedPopupIsEV);
            }

            // Left Dock "Quick Reserve" triggers Booking Mode directly
            if (e.target.closest('#btn-quick-book')) {
                this.openBookingPanel('B1', false);
            }

            // Cancel Button in the Booking Form (Restores Left Dock)
            if (e.target.closest('#btn-cancel-booking-form')) {
                this.toggleBookingForm(false);
            }

            // Confirm Booking -> Starts Session & OPENS FULL SCREEN
            if (e.target.closest('#btn-confirm-booking')) {
                const slotEl = document.getElementById('selected-slot-id');
                const slot = slotEl ? slotEl.innerText : 'B1';
                const plateInput = document.getElementById('booking-plate');
                const plate = (plateInput && plateInput.value) ? plateInput.value : 'MH 12 PA 9999';
                const inTime = document.getElementById('booking-in')?.value;
                const outTime = document.getElementById('booking-out')?.value;
                const fare = this.calculateFare(inTime, outTime);
                const durationMinutes = this.getMinutesBetweenTimes(inTime, outTime);
                const durationHours = durationMinutes > 0 ? durationMinutes / 60 : 2;

                const rSlot = document.getElementById('receipt-slot-display');
                const rPlate = document.getElementById('receipt-plate-display');
                const rFare = document.getElementById('receipt-fare-display');
                const rQRNote = document.getElementById('receipt-qr-note');
                if (rSlot) rSlot.innerText = `Slot ${slot} Reserved`;
                if (rPlate) rPlate.innerText = plate.toUpperCase();
                if (rFare) rFare.innerText = fare ? `Estimated fare: ${fare}` : 'Fare estimate unavailable';
                if (rQRNote) rQRNote.innerText = 'Scan this QR at exit to complete your payment.';

                if (window.SpatialMap && typeof window.SpatialMap.bookSlot === 'function') {
                    window.SpatialMap.bookSlot(slot);
                }

                this.setSessionQRCode(slot, plate, fare);
                this.toggleBookingForm(false); // Restore main menu for next time
                this.openSessionPage();
                this.startTimer(durationHours);
            }

            // Extend Time in Session Page
            if (e.target.closest('#btn-extend-time')) {
                this.totalSeconds += 3600;
                this.currentSeconds += 3600;
                const timerRing = document.getElementById('timer-ring');
                if (timerRing) timerRing.classList.remove('timer-warning');
                if (typeof gsap !== 'undefined' && timerRing) {
                    gsap.fromTo(timerRing, { strokeDashoffset: '+=50' }, { strokeDashoffset: '-=50', duration: 0.5, ease: "back.out(2)" });
                }
            }

            // End Session
            if (e.target.closest('#btn-cancel-booking')) {
                clearInterval(this.timerInterval);
                document.getElementById('countdown-clock').innerText = "00:00:00";
                document.getElementById('receipt-slot-display').innerText = "Session Ended";
                this.closeSessionPage();
            }
        });
    },

    openBookingPanel(slotId, isEV) {
        // Toggle the view
        this.toggleBookingForm(true);

        // Update Labels
        const slotEl = document.getElementById('selected-slot-id');
        if (slotEl) slotEl.innerText = slotId;

        const typeLabel = document.getElementById('booking-type-label');
        const activeFloor = document.querySelector('.floor-btn.active');
        const floorId = activeFloor ? activeFloor.getAttribute('data-floor') : '1';
        document.getElementById('booking-floor-id').innerText = floorId;

        if (typeLabel) {
            if (isEV) typeLabel.innerHTML = `EV Bay &middot; Fast Charging`;
            else if (slotId.startsWith('M')) typeLabel.innerHTML = `2-Wheeler Bay`;
            else if (slotId.startsWith('A')) typeLabel.innerHTML = `Accessible Bay &middot; Standard`;
            else typeLabel.innerHTML = `Car Bay &middot; Standard`;
        }
    },

    bindBookingInputs() {
        const bookingIn = document.getElementById('booking-in');
        const bookingOut = document.getElementById('booking-out');

        const updateFare = () => {
            const inTime = bookingIn ? bookingIn.value : '';
            const outTime = bookingOut ? bookingOut.value : '';
            const estimateEl = document.getElementById('booking-fare-estimate');
            const fare = this.calculateFare(inTime, outTime);

            if (estimateEl) {
                estimateEl.innerText = fare ? `Estimated fare: ${fare}` : 'Enter check-out time to see estimated fare';
            }
        };

        if (bookingIn) bookingIn.addEventListener('input', updateFare);
        if (bookingOut) bookingOut.addEventListener('input', updateFare);
    },

    calculateFare(inTime, outTime) {
        if (!inTime || !outTime) return null;
        const minutes = this.getMinutesBetweenTimes(inTime, outTime);
        if (minutes <= 0) return null;

        if (minutes <= 30) return '₹0';
        if (minutes <= 60) return '₹20';
        if (minutes <= 120) return '₹30';
        if (minutes <= 240) return '₹50';
        if (minutes <= 480) return '₹70';

        const extraHours = Math.ceil((minutes - 480) / 60);
        return `₹${70 + extraHours * 10}`;
    },

    setSessionQRCode(slot, plate, fare) {
        const qrImg = document.getElementById('receipt-qr-img');
        if (!qrImg) return;
        const payload = encodeURIComponent(`AURA PARK Exit Scan | Slot: ${slot} | Plate: ${plate.toUpperCase()} | Fare: ${fare || 'TBD'}`);
        qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${payload}`;
    },

    getMinutesBetweenTimes(inTime, outTime) {
        const [inH, inM] = inTime.split(':').map(Number);
        const [outH, outM] = outTime.split(':').map(Number);
        if (Number.isNaN(inH) || Number.isNaN(inM) || Number.isNaN(outH) || Number.isNaN(outM)) return 0;

        let start = inH * 60 + inM;
        let end = outH * 60 + outM;
        if (end <= start) end += 24 * 60; // next day
        return end - start;
    },

    startTimer(hours) {
        clearInterval(this.timerInterval);
        this.totalSeconds = hours * 3600; 
        this.currentSeconds = this.totalSeconds;
        
        const timerRing = document.getElementById('timer-ring');
        const timerText = document.getElementById('countdown-clock');
        
        if (timerRing) {
            timerRing.style.strokeDashoffset = 0;
            timerRing.classList.remove('timer-warning');
            timerRing.style.stroke = "var(--accent-amber)";
        }

        this.timerInterval = setInterval(() => {
            this.currentSeconds--;
            
            if (timerRing) {
                const percentage = this.currentSeconds / this.totalSeconds;
                timerRing.style.strokeDashoffset = 283 - (percentage * 283); 
            }

            if (timerText) {
                const h = Math.floor(this.currentSeconds / 3600).toString().padStart(2, '0');
                const m = Math.floor((this.currentSeconds % 3600) / 60).toString().padStart(2, '0');
                const s = (this.currentSeconds % 60).toString().padStart(2, '0');
                timerText.innerText = `${h}:${m}:${s}`;
            }

            if (this.currentSeconds <= 300 && this.currentSeconds > 0 && timerRing) { 
                timerRing.classList.add('timer-warning');
            }

            if (this.currentSeconds <= 0) {
                clearInterval(this.timerInterval);
                if (timerText) timerText.innerText = "EXPIRED";
                if (timerRing) {
                    timerRing.classList.remove('timer-warning');
                    timerRing.style.stroke = "#FF0033";
                }
            }
        }, 1000);
    }
};

window.OSMain = OSMain;
window.openBookingPanel = (slotId, isEV) => OSMain.openBookingPanel(slotId, isEV);
document.addEventListener('DOMContentLoaded', () => OSMain.init());
