(function () {
    // ---------- RESPONSIVE CANVAS SETUP ----------
    const canvas = document.getElementById('heartCanvas');
    const ctx = canvas.getContext('2d');
    const music = document.getElementById("bgMusic");
    const overlay = document.getElementById("overlay");

    // Base artistic dimensions (classic heart ratio)
    const BASE_WIDTH = 640;
    const BASE_HEIGHT = 480;
    const ASPECT_RATIO = BASE_WIDTH / BASE_HEIGHT;

    let CANVAS_WIDTH = BASE_WIDTH;
    let CANVAS_HEIGHT = BASE_HEIGHT;
    let CANVAS_CENTER_X = CANVAS_WIDTH / 2;
    let CANVAS_CENTER_Y = CANVAS_HEIGHT / 2;

    const IMAGE_ENLARGE = 11;
    const HEART_COLOR = "#e32753";

    // Resize handler: responsive scaling while preserving particle coordinate integrity
    function resizeCanvas() {
        const maxWidth = window.innerWidth;
        const maxHeight = window.innerHeight;

        let displayWidth = maxWidth;
        let displayHeight = maxWidth / ASPECT_RATIO;

        if (displayHeight > maxHeight) {
            displayHeight = maxHeight;
            displayWidth = maxHeight * ASPECT_RATIO;
        }

        canvas.style.width = `${displayWidth}px`;
        canvas.style.height = `${displayHeight}px`;

        // Keep drawing buffer at original 640x480 to preserve all particle precision
        canvas.width = BASE_WIDTH;
        canvas.height = BASE_HEIGHT;

        CANVAS_WIDTH = BASE_WIDTH;
        CANVAS_HEIGHT = BASE_HEIGHT;
        CANVAS_CENTER_X = BASE_WIDTH / 2;
        CANVAS_CENTER_Y = BASE_HEIGHT / 2;
    }

    // ---- Core heart geometry (parametric heart) ----
    function heartFunction(t, shrinkRatio = IMAGE_ENLARGE) {
        let x = 16 * Math.pow(Math.sin(t), 3);
        let y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
        x *= shrinkRatio;
        y *= shrinkRatio;
        x += CANVAS_CENTER_X;
        y += CANVAS_CENTER_Y;
        return { x: Math.floor(x), y: Math.floor(y) };
    }

    // Scatter effect inside heart region
    function scatterInside(x, y, beta = 0.15) {
        let ratioX = -beta * Math.log(Math.random());
        let ratioY = -beta * Math.log(Math.random());
        let dx = ratioX * (x - CANVAS_CENTER_X);
        let dy = ratioY * (y - CANVAS_CENTER_Y);
        return { x: x - dx, y: y - dy };
    }

    // Dynamic shrink for halo
    function shrink(x, y, ratio) {
        let force = -1 / Math.pow(Math.pow(x - CANVAS_CENTER_X, 2) + Math.pow(y - CANVAS_CENTER_Y, 2), 0.6);
        let dx = ratio * force * (x - CANVAS_CENTER_X);
        let dy = ratio * force * (y - CANVAS_CENTER_Y);
        return { x: x - dx, y: y - dy };
    }

    // Main Heart Particle System
    class Heart {
        constructor(generateFrame = 20) {
            this.points = [];
            this.edgeDiffusionPoints = [];
            this.centerDiffusionPoints = [];
            this.allPoints = {};
            this.generateFrame = generateFrame;
            this.build(2000);
            for (let frame = 0; frame < generateFrame; frame++) {
                this.calc(frame);
            }
        }

        build(number) {
            // Generate base heart outline points
            for (let i = 0; i < number; i++) {
                let t = Math.random() * 2 * Math.PI;
                let pos = heartFunction(t);
                this.points.push([pos.x, pos.y]);
            }
            // Edge diffusion (sparkle around outline)
            this.points.forEach(([px, py]) => {
                for (let i = 0; i < 3; i++) {
                    let pos = scatterInside(px, py, 0.05);
                    this.edgeDiffusionPoints.push([pos.x, pos.y]);
                }
            });
            // Center diffusion (inner glow)
            for (let i = 0; i < 4000; i++) {
                let [px, py] = this.points[Math.floor(Math.random() * this.points.length)];
                let pos = scatterInside(px, py, 0.17);
                this.centerDiffusionPoints.push([pos.x, pos.y]);
            }
        }

        calcPosition(x, y, ratio) {
            let force = 1 / Math.pow(Math.pow(x - CANVAS_CENTER_X, 2) + Math.pow(y - CANVAS_CENTER_Y, 2), 0.520);
            let dx = ratio * force * (x - CANVAS_CENTER_X) + (Math.random() * 2 - 1);
            let dy = ratio * force * (y - CANVAS_CENTER_Y) + (Math.random() * 2 - 1);
            return { x: x - dx, y: y - dy };
        }

        calc(frame) {
            let ratio = 10 * Math.sin(frame / 10 * Math.PI);
            let haloRadius = Math.floor(4 + 6 * (1 + Math.sin(frame / 10 * Math.PI)));
            let haloNumber = Math.floor(3000 + 4000 * Math.pow(Math.abs(Math.sin(frame / 10 * Math.PI)), 2));
            let allPts = [];
            let heartHaloPoint = new Set();

            // Create ethereal outer glow (halo particles with vibrant colors)
            for (let i = 0; i < haloNumber; i++) {
                let t = Math.random() * 2 * Math.PI;
                let pos = heartFunction(t, 11.6);
                let sPos = shrink(pos.x, pos.y, haloRadius);
                let key = `${Math.floor(sPos.x)},${Math.floor(sPos.y)}`;
                if (!heartHaloPoint.has(key)) {
                    heartHaloPoint.add(key);
                    let rx = sPos.x + (Math.random() * 16 - 8);
                    let ry = sPos.y + (Math.random() * 16 - 8);
                    const palette = ['#ff2a5e', '#c2185b', '#e91e63', '#ff6b8b', '#b83b5e', '#ff9eb5'];
                    let color = palette[Math.floor(Math.random() * palette.length)];
                    allPts.push([rx, ry, color]);
                }
            }

            const processPoints = (points) => {
                points.forEach(([px, py]) => {
                    let pos = this.calcPosition(px, py, ratio);
                    allPts.push([pos.x, pos.y, HEART_COLOR]);
                });
            };

            processPoints(this.points);
            processPoints(this.edgeDiffusionPoints);
            processPoints(this.centerDiffusionPoints);
            this.allPoints[frame] = allPts;
        }

        render(frame) {
            const points = this.allPoints[frame % this.generateFrame];
            if (!points) return;
            for (let i = 0; i < points.length; i++) {
                const [x, y, color] = points[i];
                if (x >= 0 && x < CANVAS_WIDTH && y >= 0 && y < CANVAS_HEIGHT) {
                    ctx.fillStyle = color;
                    ctx.fillRect(x, y, 1, 1);
                }
            }
        }
    }

    // Draw background glow and subtle stars
    function drawBackgroundGlow() {
        const grad = ctx.createRadialGradient(CANVAS_CENTER_X, CANVAS_CENTER_Y, 30, CANVAS_CENTER_X, CANVAS_CENTER_Y, 220);
        grad.addColorStop(0, '#2a0515');
        grad.addColorStop(0.6, '#0a0105');
        grad.addColorStop(1, '#000000');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Subtle sparkling stars
        for (let i = 0; i < 40; i++) {
            if (Math.random() > 0.96) {
                ctx.fillStyle = `rgba(255, 200, 210, ${Math.random() * 0.4})`;
                let sx = Math.random() * CANVAS_WIDTH;
                let sy = Math.random() * CANVAS_HEIGHT;
                ctx.fillRect(sx, sy, 1, 1);
            }
        }
    }

    // Animation state
    let heartSystem = null;
    let animationFrameId = null;
    let frameCounter = 0;
    let isDrawing = false;
    let musicStarted = false;
    let lastTimestamp = 0;
    const FRAME_INTERVAL_MS = 80;

    function drawFrame(now) {
        if (!isDrawing) return;

        if (lastTimestamp === 0 || now - lastTimestamp >= FRAME_INTERVAL_MS) {
            lastTimestamp = now;

            ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            drawBackgroundGlow();

            if (heartSystem) {
                heartSystem.render(frameCounter);
                frameCounter++;
            }
        }

        animationFrameId = requestAnimationFrame(drawFrame);
    }

    function startVisuals() {
        if (heartSystem === null) {
            heartSystem = new Heart(20);
        }
        if (!isDrawing) {
            isDrawing = true;
            frameCounter = 0;
            lastTimestamp = 0;
            animationFrameId = requestAnimationFrame(drawFrame);
        }
    }

    function startExperience() {
        if (musicStarted) return;
        musicStarted = true;

        const playPromise = music.play();
        if (playPromise !== undefined) {
            playPromise.catch(e => {
                console.log("Audio autoplay blocked but heart still beats:", e);
            });
        }
        startVisuals();
    }

    // Event listeners
    overlay.addEventListener("click", (e) => {
        e.stopPropagation();
        overlay.classList.add("hidden");
        setTimeout(() => {
            startExperience();
        }, 100);
    });

    overlay.addEventListener("touchstart", (e) => {
        e.preventDefault();
        overlay.classList.add("hidden");
        setTimeout(() => {
            startExperience();
        }, 100);
    });

    window.addEventListener('resize', () => {
        resizeCanvas();
    });

    window.addEventListener('orientationchange', () => {
        setTimeout(resizeCanvas, 30);
    });

    // Initial setup
    resizeCanvas();

    // Pre-build heart system for instant start
    setTimeout(() => {
        if (!heartSystem) {
            heartSystem = new Heart(20);
        }
    }, 100);

    // Handle missing music file gracefully
    music.addEventListener('error', () => {
        console.warn("Music file not found, but heart will still glow.");
    });

    // Visibility change handling
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && isDrawing && heartSystem) {
            if (!animationFrameId) {
                animationFrameId = requestAnimationFrame(drawFrame);
            }
        }
    });

    // Hint message fade effect
    const hintMsg = document.getElementById('hintMsg');
    if (hintMsg) {
        setInterval(() => {
            if (hintMsg.style.opacity === '0.3') {
                hintMsg.style.opacity = '0.7';
            } else {
                hintMsg.style.opacity = '0.3';
            }
        }, 1800);
    }

    console.log("❤️ Lighter & Princess Heart — Eternal Flame ready");
})();
