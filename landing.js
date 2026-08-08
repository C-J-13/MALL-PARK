/* ==========================================================================
   AURA PARK | LANDING PAGE JS (SMOOTH SCROLL & REVERSE ANIMATION)
   ========================================================================== */

const LandingPage = {
    gone: false, // Tracks if we are in the OS

    init() {
        this.bindNav();
        this.bindScrollReveal();
        this.bindStatCounters();
        this.bindTransition();
        this.bindSmoothScroll();
    },

    bindNav() {
        const nav = document.querySelector('.lp-nav');
        if (!nav) return;
        document.getElementById('landing-page').addEventListener('scroll', () => {
            nav.classList.toggle('scrolled',
                document.getElementById('landing-page').scrollTop > 60
            );
        }, { passive: true });
    },

    // --- NEW: Smooth Scrolling for Headers ---
    bindSmoothScroll() {
        document.querySelectorAll('.lp-nav-links a').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const targetId = this.getAttribute('href').substring(1);
                const targetElement = document.getElementById(targetId);
                if (targetElement) {
                    document.getElementById('landing-page').scrollTo({
                        top: targetElement.offsetTop - 80, // Offsets the sticky navbar
                        behavior: 'smooth'
                    });
                }
            });
        });
    },

    bindScrollReveal() {
        const targets = document.querySelectorAll(
            '.lp-bento-card, .lp-stat-cell, .lp-workflow-step, .lp-about h2, .lp-about > p, ' +
            '.lp-about-eyebrow, .lp-features-header, ' +
            '.lp-cta-section h2, .lp-cta-section > p, .lp-cta-section .lp-btn-primary'
        );
        const obs = new IntersectionObserver((entries) => {
            entries.forEach((e) => {
                if (e.isIntersecting) {
                    e.target.classList.add('visible');
                    obs.unobserve(e.target);
                }
            });
        }, { threshold: 0.12 });

        targets.forEach((el, i) => {
            el.style.transitionDelay = `${i * 0.06}s`;
            obs.observe(el);
        });
    },

    bindStatCounters() {
        const cells = document.querySelectorAll('.lp-stat-cell');
        const obs = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                const el = entry.target.querySelector('[data-count]');
                if (!el || el.dataset.done) return;
                el.dataset.done = 'true';
                this.countUp(el);
                obs.unobserve(entry.target);
            });
        }, { threshold: 0.4 });
        cells.forEach(c => obs.observe(c));
    },

    countUp(el) {
        const target = parseFloat(el.dataset.count);
        const isFloat = el.dataset.float === 'true';
        const duration = 2000;
        const start = performance.now();
        const step = now => {
            const p = Math.min((now - start) / duration, 1);
            const ease = 1 - Math.pow(1 - p, 4);
            el.textContent = isFloat
                ? (target * ease).toFixed(1)
                : Math.floor(target * ease).toLocaleString();
            if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    },

    bindTransition() {
        const go = () => {
            if (this.gone) return;
            this.gone = true;
            
            const lp = document.getElementById('landing-page');
            const os = document.getElementById('aura-os');
            
            if (lp) {
                lp.classList.add('lp-exit');
                setTimeout(() => { lp.style.display = 'none'; }, 950);
            }

            if (os) {
                os.classList.remove('system-hidden');
                if (typeof gsap !== 'undefined') {
                    gsap.fromTo(os, 
                        { opacity: 0, scale: 0.95 }, 
                        { opacity: 1, scale: 1, duration: 1, ease: 'power3.out', delay: 0.2 }
                    );
                }
            }
        };

        // --- NEW: Go Back to Landing Page Logic ---
        const goBack = () => {
            if (!this.gone) return;
            
            const lp = document.getElementById('landing-page');
            const os = document.getElementById('aura-os');

            if (os && typeof gsap !== 'undefined') {
                // Reverse OS Animation
                gsap.to(os, { opacity: 0, scale: 0.95, duration: 0.5, ease: 'power2.in', onComplete: () => {
                    os.classList.add('system-hidden');
                    
                    if (lp) {
                        lp.scrollTop = 0; // Scroll back to top
                        lp.style.display = 'block';
                        void lp.offsetWidth; // Force a CSS reflow
                        lp.classList.remove('lp-exit'); // Triggers the reverse fade-in
                        
                        setTimeout(() => { this.gone = false; }, 500); // Allow re-entry
                    }
                }});
            }
        };

        // Triggers to enter OS
        // NOTE: removed auto-enter when scrolling to the bottom of the landing page,
        // because it caused accidental navigation while browsing content.
        document.querySelectorAll('[data-enter-dashboard]').forEach(btn =>
            btn.addEventListener('click', go)
        );

        document.addEventListener('keydown', e => {
            if (e.key === 'Enter' && !this.gone) go();
        });

        // Trigger to return to Landing Page
        const btnBack = document.getElementById('btn-back-home');
        if (btnBack) {
            btnBack.addEventListener('click', goBack);
        }
    }
};

document.addEventListener('DOMContentLoaded', () => LandingPage.init());