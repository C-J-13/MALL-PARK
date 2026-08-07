/* ==========================================================================
   AURA OS | CINEMATIC CHOREOGRAPHY
   Boot Sequence, Transitions, and UI Physics
   ========================================================================== */

const OSAnimations = {
    init() {
        // Run cinematic boot sequence on load
        this.runBootSequence();
    },

    runBootSequence() {
        const tl = gsap.timeline({
            onComplete: () => {
                // Initialize the OS Logic once boot is done
                if (window.OSMain) window.OSMain.init();
            }
        });

        // 1. Logo reveals from darkness
        tl.to('#boot-logo', {
            opacity: 1,
            y: -10,
            duration: 1.5,
            ease: "power2.out",
            delay: 0.2
        })
        
        // 2. Subtitle fades in
        .to('#boot-text', {
            opacity: 1,
            duration: 1,
            ease: "power1.inOut"
        }, "-=0.5")

        // 3. Hold for reading, then dissolve the entire boot screen
        .to('.boot-content', {
            opacity: 0,
            scale: 1.05,
            duration: 0.8,
            ease: "power3.in",
            delay: 1.2
        })
        .set('#boot-sequence', { display: 'none' })

        // 4. Reveal the Operating System (The "Vision Pro" fade-in)
        .set('#aura-os', { className: '' }) // Remove hidden class
        .fromTo('#aura-os', 
            { filter: 'blur(30px)', opacity: 0, scale: 0.98 },
            { filter: 'blur(0px)', opacity: 1, scale: 1, duration: 1.5, ease: "expo.out" }
        )

        // 5. Staggered dock entrances (Physics-based slide in)
        .fromTo('.system-hud',
            { y: -30, opacity: 0 },
            { y: 0, opacity: 1, duration: 1, ease: "back.out(1.2)" },
            "-=1.2"
        )
        .fromTo('.dock-left',
            { x: -50, opacity: 0 },
            { x: 0, opacity: 1, duration: 1.2, ease: "expo.out" },
            "-=1.0"
        )
        .fromTo('.dock-right',
            { x: 50, opacity: 0 },
            { x: 0, opacity: 1, duration: 1.2, ease: "expo.out" },
            "-=1.0"
        )
        .fromTo('.center-stage',
            { opacity: 0, scale: 0.95 },
            { opacity: 1, scale: 1, duration: 1.2, ease: "power3.out" },
            "-=0.8"
        );
    }
};

document.addEventListener('DOMContentLoaded', () => {
    OSAnimations.init();
});