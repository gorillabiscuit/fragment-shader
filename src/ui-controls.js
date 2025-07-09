const controlIds = [
    'base-color', 'secondary-color', 'background-color',
    'velocity-color-toggle', 'velocity-color-slider',
    'distance-color-toggle', 'distance-color-slider',
    'mouse-force-toggle', 'mouse-force-slider', 'mouse-radius-slider',
    'attract-button', 'repel-button',
    'viscous-damping-toggle', 'viscous-damping-slider',
    'vorticity-toggle', 'vorticity-slider',
    'turbulence-toggle', 'turbulence-slider',
    'angular-momentum-toggle', 'angular-momentum-slider',
    'surface-tension-toggle', 'surface-tension-slider',
    'gravity-toggle', 'gravity-slider',
    'repulsion1-toggle', 'repulsion2-toggle', 'repulsion3-toggle',
    'repulsion1-slider', 'repulsion2-slider', 'repulsion3-slider',
    'circular-boundary-toggle',
    'metaball-visual-size-slider'
];

const listeners = [];

export function getControlValues() {
    const values = {};
    for (const id of controlIds) {
        const el = document.getElementById(id);
        if (!el) continue;
        if (el.type === 'checkbox') {
            values[id] = el.checked;
        } else if (el.type === 'color' || el.type === 'range') {
            values[id] = el.value;
        } else if (el.tagName === 'BUTTON') {
            values[id] = el.classList.contains('active');
        }
    }
    // Special: force type
    values['forceType'] = document.getElementById('attract-button').classList.contains('active') ? 'attract' : 'repel';
    return values;
}

export function onControlChange(callback) {
    listeners.push(callback);
}

function updateSliderDisplays() {
    const sliderMap = [
        { slider: 'velocity-color-slider', value: 'velocity-color-value', digits: 12 },
        { slider: 'distance-color-slider', value: 'distance-color-value', digits: 12 },
        { slider: 'mouse-force-slider', value: 'mouse-force-value', digits: 12 },
        { slider: 'mouse-radius-slider', value: 'mouse-radius-value', digits: 12 },
        { slider: 'viscous-damping-slider', value: 'viscous-damping-value', digits: 12 },
        { slider: 'vorticity-slider', value: 'vorticity-value', digits: 12 },
        { slider: 'turbulence-slider', value: 'turbulence-value', digits: 12 },
        { slider: 'angular-momentum-slider', value: 'angular-momentum-value', digits: 12 },
        { slider: 'surface-tension-slider', value: 'surface-tension-value', digits: 12 },
        { slider: 'gravity-slider', value: 'gravity-value', digits: 12 },
        { slider: 'repulsion-slider', value: 'repulsion-value', digits: 12 },
        { slider: 'repulsion-radius-slider', value: 'repulsion-radius-value', digits: 12 },
        { slider: 'repulsion1-slider', value: 'repulsion1-value', digits: 12 },
        { slider: 'repulsion2-slider', value: 'repulsion2-value', digits: 12 },
        { slider: 'repulsion3-slider', value: 'repulsion3-value', digits: 12 },
        { slider: 'metaball-visual-size-slider', value: 'metaball-visual-size-value', digits: 6 },
    ];
    for (const { slider, value, digits } of sliderMap) {
        const sliderEl = document.getElementById(slider);
        const valueEl = document.getElementById(value);
        if (sliderEl && valueEl) {
            valueEl.textContent = parseFloat(sliderEl.value).toFixed(digits);
        }
    }
}

function notifyListeners() {
    updateSliderDisplays();
    const values = getControlValues();
    for (const cb of listeners) cb(values);
}

export function setupControlListeners() {
    for (const id of controlIds) {
        const el = document.getElementById(id);
        if (!el) continue;
        el.addEventListener('input', notifyListeners);
        el.addEventListener('change', notifyListeners);
        if (el.tagName === 'BUTTON') {
            el.addEventListener('click', notifyListeners);
        }
    }
    // Attract/repel buttons: toggle active class
    const attract = document.getElementById('attract-button');
    const repel = document.getElementById('repel-button');
    if (attract && repel) {
        attract.addEventListener('click', () => {
            attract.classList.add('active');
            repel.classList.remove('active');
            notifyListeners();
        });
        repel.addEventListener('click', () => {
            repel.classList.add('active');
            attract.classList.remove('active');
            notifyListeners();
        });
    }
    updateSliderDisplays();
}
