export interface MetaballConfig {
    /** Visual radius of each metaball (default 0.0027, range ~0.0001–0.012) */
    ballSize?: number;
    /** Outer boundary radius (default 0.400, range ~0.20–0.48) */
    boundaryRadius?: number;
    /** RGB colour for the balls, each 0–1 (default [1,1,1] = white) */
    ballColor?: [number, number, number];
    /** Render boundary circles (default false) */
    showBoundary?: boolean;
    /** Overall animation speed multiplier (default 1.0 = designed pace) */
    speed?: number;
}

export interface MetaballController {
    /** Stop animation and release resources. */
    destroy(): void;
    /** Manually resize the canvas (if not relying on ResizeObserver). */
    resize(width: number, height: number): void;
    /** Update metaball visual size. */
    setBallSize(v: number): void;
    /** Update outer boundary radius. */
    setBoundaryRadius(v: number): void;
    /** Update overall speed multiplier. */
    setSpeed(v: number): void;
}

/**
 * Creates a metaball animation on the given canvas.
 * The canvas must have CSS layout dimensions (width/height via CSS or parent).
 * Returns a controller for live updates and cleanup, or null if WebGL failed.
 */
export function createMetaballAnimation(
    canvas: HTMLCanvasElement,
    config?: MetaballConfig
): MetaballController | null;
