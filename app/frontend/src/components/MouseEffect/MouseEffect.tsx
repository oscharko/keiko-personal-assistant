import React, {useEffect, useRef} from 'react';
import styles from './MouseEffect.module.css';

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

export const MouseEffect: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let particles: Particle[] = [];
        let mouse = {x: 0, y: 0, radius: 100};

        const handleResize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            initParticles();
        };

        const handleMouseMove = (e: MouseEvent) => {
            mouse.x = e.x;
            mouse.y = e.y;
        };

        const initParticles = () => {
            particles = [];
            const numberOfParticles = (canvas.width * canvas.height) / 9000;

            for (let i = 0; i < numberOfParticles; i++) {
                const size = (Math.random() * 3) + 1;
                const x = (Math.random() * ((canvas.width - size * 2) - (size * 2)) + size * 2);
                const y = (Math.random() * ((canvas.height - size * 2) - (size * 2)) + size * 2);
                const directionX = (Math.random() * 2) - 1; // -1 to 1
                const directionY = (Math.random() * 2) - 1; // -1 to 1
                const color = '#000000';

                particles.push({
                    x,
                    y,
                    vx: directionX,
                    vy: directionY,
                    size,
                    color,
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

            for (const element of particles) {
                let p = element;

                // Mouse interaction
                let dx = mouse.x - p.x;
                let dy = mouse.y - p.y;
                let distance = Math.hypot(dx, dy);
                let forceDirectionX = dx / distance;
                let forceDirectionY = dy / distance;
                let maxDistance = mouse.radius;
                let force = (maxDistance - distance) / maxDistance;
                let directionX = forceDirectionX * force * p.density;
                let directionY = forceDirectionY * force * p.density;

                if (distance < mouse.radius) {
                    p.x -= directionX;
                    p.y -= directionY;
                } else {
                    if (p.x !== p.baseX) {
                        let dx = p.x - p.baseX;
                        p.x -= dx / 10;
                    }
                    if (p.y !== p.baseY) {
                        let dy = p.y - p.baseY;
                        p.y -= dy / 10;
                    }
                }

                // Draw particle
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = p.color;
                ctx.fill();
            }
        };

        window.addEventListener('resize', handleResize);
        globalThis.addEventListener('mousemove', handleMouseMove);

        handleResize();
        animate();

        return () => {
            window.removeEventListener('resize', handleResize);
            globalThis.removeEventListener('mousemove', handleMouseMove);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <div className={styles.canvasContainer}>
            <canvas ref={canvasRef} className={styles.canvas}/>
        </div>
    );
};
