/**
 * ParticleBackground component.
 * A reusable animated particle background that can be placed inside any container.
 * Particles react to mouse movement creating an interactive effect.
 */
import React, {useEffect, useRef} from 'react';
import styles from './ParticleBackground.module.css';

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    color: string;
    baseX: number;
    baseY: number;
    density: number;
}

interface ParticleBackgroundProps {
    /** Background color of the canvas container */
    backgroundColor?: string;
    /** Color of the particles */
    particleColor?: string;
    /** Density factor - higher means fewer particles (default: 9000) */
    particleDensity?: number;
    /** Mouse interaction radius (default: 100) */
    mouseRadius?: number;
    /** Additional CSS class name */
    className?: string;
}

export const ParticleBackground: React.FC<ParticleBackgroundProps> = ({
    backgroundColor = '#DCFF4A',
    particleColor = '#000000',
    particleDensity = 9000,
    mouseRadius = 100,
    className
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let particles: Particle[] = [];
        let mouse = {x: 0, y: 0, radius: mouseRadius};

        const handleResize = () => {
            canvas.width = container.offsetWidth;
            canvas.height = container.offsetHeight;
            initParticles();
        };

        const handleMouseMove = (e: MouseEvent) => {
            const rect = container.getBoundingClientRect();
            mouse.x = e.clientX - rect.left;
            mouse.y = e.clientY - rect.top;
        };

        const initParticles = () => {
            particles = [];
            const numberOfParticles = (canvas.width * canvas.height) / particleDensity;

            for (let i = 0; i < numberOfParticles; i++) {
                const size = (Math.random() * 3) + 1;
                const x = (Math.random() * ((canvas.width - size * 2) - (size * 2)) + size * 2);
                const y = (Math.random() * ((canvas.height - size * 2) - (size * 2)) + size * 2);
                const directionX = (Math.random() * 2) - 1;
                const directionY = (Math.random() * 2) - 1;

                particles.push({
                    x,
                    y,
                    vx: directionX,
                    vy: directionY,
                    size,
                    color: particleColor,
                    baseX: x,
                    baseY: y,
                    density: (Math.random() * 30) + 1
                });
            }
        };

        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);
            if (!ctx) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            for (const p of particles) {
                // Mouse interaction
                const dx = mouse.x - p.x;
                const dy = mouse.y - p.y;
                const distance = Math.hypot(dx, dy);
                const forceDirectionX = dx / distance;
                const forceDirectionY = dy / distance;
                const maxDistance = mouse.radius;
                const force = (maxDistance - distance) / maxDistance;
                const directionX = forceDirectionX * force * p.density;
                const directionY = forceDirectionY * force * p.density;

                if (distance < mouse.radius) {
                    p.x -= directionX;
                    p.y -= directionY;
                } else {
                    if (p.x !== p.baseX) {
                        const dxBase = p.x - p.baseX;
                        p.x -= dxBase / 10;
                    }
                    if (p.y !== p.baseY) {
                        const dyBase = p.y - p.baseY;
                        p.y -= dyBase / 10;
                    }
                }

                // Draw particle
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = p.color;
                ctx.fill();
            }
        };

        // Set up event listeners
        window.addEventListener('resize', handleResize);
        window.addEventListener('mousemove', handleMouseMove);

        // Use ResizeObserver to detect container size changes
        const resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(container);

        handleResize();
        animate();

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('mousemove', handleMouseMove);
            cancelAnimationFrame(animationFrameId);
            resizeObserver.disconnect();
        };
    }, [particleColor, particleDensity, mouseRadius]);

    return (
        <div
            ref={containerRef}
            className={`${styles.container} ${className || ''}`}
            style={{backgroundColor}}
        >
            <canvas ref={canvasRef} className={styles.canvas}/>
        </div>
    );
};

