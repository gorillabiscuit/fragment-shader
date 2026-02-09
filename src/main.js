import { createMetaballAnimation } from './metaball-animation.js';

window.onload = () => {
    const canvas = document.getElementById('glcanvas');

    const anim = createMetaballAnimation(canvas, {
        ballSize: 0.0018,
        boundaryRadius: 0.37,
        speed: 0.65,
        ballColor: [1.0, 1.0, 1.0],
        showBoundary: true,        // visible in dev mode
    });

    if (!anim) return;

    // ── Helper: wire a slider to an action + value display ───────────────────
    function wireSlider(sliderId, valueId, formatter, action) {
        const slider = document.getElementById(sliderId);
        const display = document.getElementById(valueId);
        if (!slider) return;
        slider.addEventListener('input', (e) => {
            const v = parseFloat(e.target.value);
            action(v);
            if (display) display.textContent = formatter(v);
        });
    }

    wireSlider('ball-size', 'ball-size-val',
        v => v.toFixed(4),
        v => anim.setBallSize(v));

    wireSlider('boundary-radius', 'boundary-val',
        v => v.toFixed(3),
        v => anim.setBoundaryRadius(v));

    wireSlider('speed', 'speed-val',
        v => v.toFixed(2),
        v => anim.setSpeed(v));
};
