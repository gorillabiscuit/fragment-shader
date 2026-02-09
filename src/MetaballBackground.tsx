/**
 * MetaballBackground — React component that renders the metaball animation.
 *
 * Usage in Lovable / any React project:
 *
 *   <MetaballBackground
 *       ballSize={0.003}
 *       boundaryRadius={0.35}
 *       ballColor={[1, 1, 1]}
 *       className="absolute inset-0"
 *   />
 *
 * For responsive breakpoints:
 *
 *   const isMobile = useMediaQuery('(max-width: 768px)');
 *   <MetaballBackground
 *       ballSize={isMobile ? 0.002 : 0.004}
 *       boundaryRadius={isMobile ? 0.28 : 0.44}
 *   />
 *
 * To bring this into Lovable, copy these files into your src/:
 *   - MetaballBackground.tsx   (this file)
 *   - metaball-animation.js
 *   - animation.js
 *   - physics.js
 *   - webgl-setup.js
 *   - shaders/vertex.glsl.js
 *   - shaders/fragment.glsl.js
 */

import { useRef, useEffect } from 'react';
import { createMetaballAnimation } from './metaball-animation.js';

interface MetaballBackgroundProps {
    /** Visual radius of each metaball (default 0.003125) */
    ballSize?: number;
    /** Outer boundary radius (default 0.44) */
    boundaryRadius?: number;
    /** RGB colour for the balls, each 0–1 (default white [1,1,1]) */
    ballColor?: [number, number, number];
    /** Extra CSS class names (e.g. Tailwind positioning) */
    className?: string;
    /** Inline styles */
    style?: React.CSSProperties;
}

export function MetaballBackground({
    ballSize = 0.003125,
    boundaryRadius = 0.44,
    ballColor = [1, 1, 1],
    className,
    style,
}: MetaballBackgroundProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animRef = useRef<ReturnType<typeof createMetaballAnimation>>(null);

    // Initialise once on mount, clean up on unmount
    useEffect(() => {
        if (!canvasRef.current) return;

        animRef.current = createMetaballAnimation(canvasRef.current, {
            ballSize,
            boundaryRadius,
            ballColor,
            showBoundary: false,
        });

        return () => {
            animRef.current?.destroy();
            animRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // intentionally empty — resize & prop changes handled below

    // Live-update when breakpoint-driven props change
    useEffect(() => { animRef.current?.setBallSize(ballSize); }, [ballSize]);
    useEffect(() => { animRef.current?.setBoundaryRadius(boundaryRadius); }, [boundaryRadius]);

    return (
        <canvas
            ref={canvasRef}
            className={className}
            style={{ width: '100%', height: '100%', background: 'transparent', ...style }}
        />
    );
}
