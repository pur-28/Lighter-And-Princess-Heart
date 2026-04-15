const canvas = document.getElementById('heartCanvas');
const ctx = canvas.getContext('2d');
const music = document.getElementById("bgMusic");
const overlay = document.getElementById("overlay");

const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 480;
const CANVAS_CENTER_X = CANVAS_WIDTH / 2;
const CANVAS_CENTER_Y = CANVAS_HEIGHT / 2;
const IMAGE_ENLARGE = 11;
const HEART_COLOR = "#e32753";

canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

function heartFunction(t, shrinkRatio = IMAGE_ENLARGE) {
    let x = 16 * Math.pow(Math.sin(t), 3);
    let y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    x *= shrinkRatio;
    y *= shrinkRatio;
    x += CANVAS_CENTER_X;
    y += CANVAS_CENTER_Y;
    return { x: Math.floor(x), y: Math.floor(y) };
}

function scatterInside(x, y, beta = 0.15) {
    let ratioX = -beta * Math.log(Math.random());
    let ratioY = -beta * Math.log(Math.random());
    let dx = ratioX * (x - CANVAS_CENTER_X);
    let dy = ratioY * (y - CANVAS_CENTER_Y);
    return { x: x - dx, y: y - dy };
}

function shrink(x, y, ratio) {
    let force = -1 / Math.pow(Math.pow(x - CANVAS_CENTER_X, 2) + Math.pow(y - CANVAS_CENTER_Y, 2), 0.6);
    let dx = ratio * force * (x - CANVAS_CENTER_X);
    let dy = ratio * force * (y - CANVAS_CENTER_Y);
    return { x: x - dx, y: y - dy };
}

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
        for (let i = 0; i < number; i++) {
            let t = Math.random() * 2 * Math.PI;
            let pos = heartFunction(t);
            this.points.push([pos.x, pos.y]);
        }
        this.points.forEach(([px, py]) => {
            for (let i = 0; i < 3; i++) {
                let pos = scatterInside(px, py, 0.05);
                this.edgeDiffusionPoints.push([pos.x, pos.y]);
            }
        });
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

        for (let i = 0; i < haloNumber; i++) {
            let t = Math.random() * 2 * Math.PI;
            let pos = heartFunction(t, 11.6);
            let sPos = shrink(pos.x, pos.y, haloRadius);
            let key = `${Math.floor(sPos.x)},${Math.floor(sPos.y)}`;
            if (!heartHaloPoint.has(key)) {
                heartHaloPoint.add(key);
                let rx = sPos.x + (Math.random() * 16 - 8);
                let ry = sPos.y + (Math.random() * 16 - 8);
                let color = ['#912d7e', '#db5675', '#8c2a41'][Math.floor(Math.random() * 3)];
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
        points.forEach(([x, y, color]) => {
            ctx.fillStyle = color;
            ctx.fillRect(x, y, 1, 1);
        });
    }
}

const heart = new Heart();
let frame = 0;

function draw() {
    // Note: using clearRect here to keep your original sharp look
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    heart.render(frame);
    frame++;
    setTimeout(() => {
        requestAnimationFrame(draw);
    }, 80);
}

overlay.addEventListener("click", () => {
    overlay.classList.add("hidden");
    music.volume = 0.3;
    music.play();
    draw();
});
