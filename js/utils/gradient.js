/**
 * GradientAnimator - Creates an animated gradient background
 * with smooth color transitions and rotation
 */
class GradientAnimator {
    // Color pairs for gradient transitions
    static COLORS = [
        ['#6d00d4', 'rgba(182, 155, 228, 0.65)'],
        ['#0078d4', 'rgba(155, 196, 228, 0.65)'],
        ['#d46d00', 'rgba(228, 182, 155, 0.65)'],
        ['#ff31dd', 'rgba(247, 185, 231, 0.65)'],
        ['#00d4a5', 'rgba(155, 228, 207, 0.65)']
    ];

    constructor() {
        this.canvas = document.getElementById('gradientCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.angle = 135;
        this.duration = 2000;
        this.transitionDuration = 600;
        this.startTime = performance.now();

        this.setupCanvas();
        this.bindEvents();
        this.animate();
    }

    setupCanvas() {
        this.resizeCanvas();
    }

    bindEvents() {
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    interpolateColor(color1, color2, factor) {
        const getRGBA = (color) => {
            if (color.startsWith('#')) {
                const r = parseInt(color.slice(1, 3), 16);
                const g = parseInt(color.slice(3, 5), 16);
                const b = parseInt(color.slice(5, 7), 16);
                return [r, g, b, 1];
            }
            return color.match(/[\d.]+/g).map(Number);
        };

        const [r1, g1, b1, a1] = getRGBA(color1);
        const [r2, g2, b2, a2] = getRGBA(color2);

        return `rgba(${
            Math.round(r1 + (r2 - r1) * factor)
        }, ${
            Math.round(g1 + (g2 - g1) * factor)
        }, ${
            Math.round(b1 + (b2 - b1) * factor)
        }, ${
            a1 + (a2 - a1) * factor
        })`;
    }

    sharpEasing(t) {
        const transitionRatio = this.transitionDuration / this.duration;
        if (t < (1 - transitionRatio)) return 0;
        
        const transitionT = (t - (1 - transitionRatio)) / transitionRatio;
        return Math.pow(transitionT, 0.5);
    }

    render(timestamp) {
        const elapsed = timestamp - this.startTime;
        const totalDuration = this.duration * GradientAnimator.COLORS.length;
        const normalizedTime = (elapsed % totalDuration) / this.duration;
        const currentIndex = Math.floor(normalizedTime) % GradientAnimator.COLORS.length;
        const nextIndex = (currentIndex + 1) % GradientAnimator.COLORS.length;
        
        const progress = this.sharpEasing(normalizedTime % 1);
        this.renderGradient(currentIndex, nextIndex, progress);
    }

    renderGradient(currentIndex, nextIndex, progress) {
        const color1 = this.interpolateColor(
            GradientAnimator.COLORS[currentIndex][0],
            GradientAnimator.COLORS[nextIndex][0],
            progress
        );
        const color2 = this.interpolateColor(
            GradientAnimator.COLORS[currentIndex][1],
            GradientAnimator.COLORS[nextIndex][1],
            progress
        );

        this.angle = (this.angle + 0.2) % 360;
        const radians = this.angle * Math.PI / 180;
        const gradient = this.ctx.createLinearGradient(
            this.canvas.width / 2 - Math.cos(radians) * this.canvas.width,
            this.canvas.height / 2 - Math.sin(radians) * this.canvas.height,
            this.canvas.width / 2 + Math.cos(radians) * this.canvas.width,
            this.canvas.height / 2 + Math.sin(radians) * this.canvas.height
        );

        gradient.addColorStop(0, color1);
        gradient.addColorStop(1, color2);

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    animate(timestamp) {
        const frame = (timestamp) => {
            this.render(timestamp);
            requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
    }
}

// Initialize gradient animation on page load
window.addEventListener('load', () => new GradientAnimator()); 