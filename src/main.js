import { createMetaballAnimation } from './metaball-animation.js';

window.onload = () => {
    const canvas = document.getElementById('glcanvas');

    const anim = createMetaballAnimation(canvas, {
        ballSize: 0.003125,
        boundaryRadius: 0.44,
        ballColor: [1.0, 1.0, 1.0],
        showBoundary: true,        // visible in dev mode
    });

    if (!anim) return;

    // ── Dev slider controls ──────────────────────────────────────────────────
    const ballSizeSlider = document.getElementById('ball-size');
    if (ballSizeSlider) {
        ballSizeSlider.addEventListener('input', (e) => {
            anim.setBallSize(parseFloat(e.target.value));
        });
    }

    const boundarySlider = document.getElementById('boundary-radius');
    if (boundarySlider) {
        boundarySlider.addEventListener('input', (e) => {
            anim.setBoundaryRadius(parseFloat(e.target.value));
        });
    }
};
