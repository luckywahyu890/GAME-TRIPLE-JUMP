class GameLoop {
    constructor(canvas, listDraw = []) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");

        this.lastTime = performance.now();
        this.running = false;
        this.rafId = null;
        this.listDraw = listDraw;

        this.camera = { x: 0, y: 0 };

        // 🔥 HARUS object
        this.portraitSize = {};

        // 🔥 resize listener system
        this.resizeCallbacks = [];
        this.gameState = []

        this.resizeCanvas = this.resizeCanvas.bind(this);

        this.resizeCanvas("mainAdv");
        window.addEventListener("resize", () => {
            this.resizeCanvas("mainAdv");
        });
    }

    /* ============================= */
    /* ADD RESIZE LISTENER */
    /* ============================= */
    addResizeListener(fn) {
        this.resizeCallbacks.push(fn);
    }

    /* ============================= */
    /* RESIZE CANVAS */
    /* ============================= */
    resizeCanvas(key) {
        const isPortrait = window.innerHeight >= window.innerWidth;
        const mode = isPortrait ? "portrait" : "landscape";

        if (isPortrait) {
            if (!this.portraitSize[key]) {
                this.portraitSize[key] = {
                    width: window.innerWidth,
                    height: window.innerHeight
                };
            }

            this.canvas.width = this.portraitSize[key].width;
            this.canvas.height = this.portraitSize[key].height;
        } else {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        }

        // 🔥 Panggil semua callback
        this.resizeCallbacks.forEach(fn => {
            fn({
                canvas: this.canvas,
                camera: this.camera,
                mode: mode
            });
        });
    }

    cameraOn(players, myID, cb = () => {}) {
        if (!players || !myID || !players[myID]) return;

        const me = players[myID];
        cb(me);
        const targetX = me.x - this.canvas.width / 8 + me.width / 2;
        const targetY = me.y - this.canvas.height / 2.8 + me.height / 2;

        const smooth = 0.05;

        this.camera.x += (targetX - this.camera.x) * smooth;
        this.camera.y += (targetY - this.camera.y) * smooth;
    }
    divText(text, key = "defInf", top = "50%", left = "50%", cb) {
        let div = document.getElementById(key);
        if (!div) {
            div = document.createElement("div");
            div.id = key;
            div.style.position = "absolute";
            div.style.top = top;
            div.style.left = left;
            div.style.transform = "translate(-50%, -50%)";
            div.style.background = "rgba(0,0,0,0.6)";
            div.style.color = "white";
            div.style.padding = "8px 12px";
            div.style.fontFamily = "monospace";
            div.style.fontSize = "16px";
            div.style.borderRadius = "6px";
            div.style.userSelect = "none";
            div.style.touchAction = "none";
            div.style.zIndex = 9999;

            // callback opsional untuk atur style sendiri
            if (cb && typeof cb === "function") {
                cb(div);
            }

            document.body.appendChild(div);
        } else {
            // update text
            div.innerHTML = text;

            // callback opsional jika ingin update style div yang sudah ada
            if (cb && typeof cb === "function") {
                cb(div);
            }
        }

        // update teks
        div.innerHTML = text;
    }

    async render(cb) {
        this.running = true;
        this.lastTime = performance.now();

        const loop = now => {
            if (!this.running) return;

            const dt = (now - this.lastTime) / 1000;
            this.lastTime = now;

            // clear otomatis
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            cb(dt, this.ctx);
            if (this.listDraw.length > 0)
                this.listDraw.forEach(el => el.draw());

            this.rafId = requestAnimationFrame(loop);
        };

        this.rafId = requestAnimationFrame(loop);
    }

    stop() {
        this.running = false;
        cancelAnimationFrame(this.rafId);
    }
}

class Analog {
    constructor(
        canvas,
        {
            x = 0,
            y = 0,
            radius = 40,
            stickRadius = 18,
            speed = 2,
            onStart = null,
            onMove = null,
            onEnd = null,
            color = "yellow",
            colorStick = "black",
            lineColor = "white",
            type = "basic"
        } = {}
    ) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.type = type;

        this.x = x;
        this.y = y;
        this.radius = radius;
        this.stickRadius = stickRadius;
        this.speed = speed;
        this.color = color;
        this.colorStick = colorStick;
        this.lineColor = lineColor;

        this.onStart = onStart;
        this.onMove = onMove;
        this.onEnd = onEnd;

        this.touchId = null;
        this.active = false;

        this.directionX = 0;
        this.directionY = 0;
        this.spdX = 0;
        this.spdY = 0;
        this.cornerDirection = null;

        // visual stick offset
        this.dx = 0;
        this.dy = 0;

        this._addEvents();
    }

    /* ================= EVENTS ================= */

    _addEvents() {
        this.canvas.addEventListener("touchstart", this._onStart.bind(this));
        this.canvas.addEventListener("touchmove", this._onMove.bind(this));
        this.canvas.addEventListener("touchend", this._onEnd.bind(this));
        this.canvas.addEventListener("touchcancel", this._onEnd.bind(this));
    }

    _onStart(e) {
        const rect = this.canvas.getBoundingClientRect();

        for (const touch of e.changedTouches) {
            const tx = touch.clientX - rect.left;
            const ty = touch.clientY - rect.top;

            const dx = tx - this.x;
            const dy = ty - this.y;

            if (Math.hypot(dx, dy) <= this.radius && this.touchId == null) {
                this.touchId = touch.identifier;
                this.active = true;

                if (this.onStart) this.onStart(this);
            }
        }

        e.preventDefault();
    }

    _onMove(e) {
        const rect = this.canvas.getBoundingClientRect();

        for (const touch of e.changedTouches) {
            if (touch.identifier !== this.touchId) continue;

            const tx = touch.clientX - rect.left;
            const ty = touch.clientY - rect.top;

            const dx = tx - this.x;
            const dy = ty - this.y;

            this.directionX = dx;
            this.directionY = dy;

            /* ===== Speed logic asli kamu ===== */

            this.spdX = dx > 0 ? this.speed : dx < 0 ? -this.speed : 0;
            this.spdY = dy > 0 ? this.speed : dy < 0 ? -this.speed : 0;

            /* ===== Corner direction ===== */

            const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

            if (Math.hypot(dx, dy) < 10) {
                this.cornerDirection = null;
            } else if (angle >= -22.5 && angle < 22.5)
                this.cornerDirection = "right";
            else if (angle >= 22.5 && angle < 67.5)
                this.cornerDirection = "bottomRight";
            else if (angle >= 67.5 && angle < 112.5)
                this.cornerDirection = "bottom";
            else if (angle >= 112.5 && angle < 157.5)
                this.cornerDirection = "bottomLeft";
            else if (angle >= 157.5 || angle < -157.5)
                this.cornerDirection = "left";
            else if (angle >= -157.5 && angle < -112.5)
                this.cornerDirection = "topLeft";
            else if (angle >= -112.5 && angle < -67.5)
                this.cornerDirection = "top";
            else if (angle >= -67.5 && angle < -22.5)
                this.cornerDirection = "topRight";

            /* ===== Visual stick clamp ===== */

            let dist = Math.hypot(dx, dy);
            if (dist > this.radius) {
                const ang = Math.atan2(dy, dx);
                this.dx = Math.cos(ang) * this.radius;
                this.dy = Math.sin(ang) * this.radius;
            } else {
                this.dx = dx;
                this.dy = dy;
            }

            if (this.onMove) this.onMove(this);
        }

        e.preventDefault();
    }

    _onEnd(e) {
        for (const touch of e.changedTouches) {
            if (touch.identifier === this.touchId) {
                this.reset();
                if (this.onEnd) this.onEnd(this);
            }
        }
    }

    /* ================= RESET ================= */

    reset() {
        this.touchId = null;
        this.active = false;

        this.directionX = 0;
        this.directionY = 0;
        this.spdX = 0;
        this.spdY = 0;
        this.cornerDirection = null;

        this.dx = 0;
        this.dy = 0;
    }

    /* ================= DRAW ================= */

    draw() {
        const ctx = this.ctx;

        // base
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();

        // stick
        if (this.type === "basic") {
            ctx.beginPath();
            ctx.arc(
                this.x + this.dx,
                this.y + this.dy,
                this.stickRadius,
                0,
                Math.PI * 2
            );
            ctx.fillStyle = this.colorStick;
            ctx.fill();
        }
        if (this.type === "rect") {
            ctx.save(); // simpan state canvas

            // geser origin ke tengah rect
            ctx.translate(this.x + this.dx, this.y + this.dy);

            // rotate setengah (contoh: 45 derajat)
            ctx.rotate(Math.PI / 4); // ubah sesuai angle

            // gambar rect, offset setengah width & height supaya center di origin
            ctx.fillStyle = this.colorStick;
            ctx.fillRect(
                -this.stickRadius,
                -this.stickRadius,
                this.stickRadius * 1.5,
                this.stickRadius * 1.5
            );
            ctx.strokeStyle = this.lineColor;
            ctx.lineWidth = 5;
            ctx.strokeRect(
                -this.stickRadius,
                -this.stickRadius,
                this.stickRadius * 1.5,
                this.stickRadius * 1.5
            );

            ctx.restore(); // kembalikan canvas ke state awal
        }
    }
}

class Draw {
    constructor(canvas, assets) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.assets = assets;
        this.animState = {};
        this.hpState = {};
        this.gameState = []
    }

    isVisible(
        lg,
        viewportX = 0,
        viewportY = 0,
        viewportwidth = 350,
        viewportheight = 600
    ) {
        return !(
            lg.x + lg.width < viewportX ||
            lg.x > viewportX + viewportwidth ||
            lg.y + lg.height < viewportY ||
            lg.y > viewportY + viewportheight
        );
    }

    rect(data, camera, cb = () => {}) {
        for (let id in data) {
            const obj = data[id];
            if(!this.gameState.includes(obj.scene))continue
            if (
                !this.isVisible(
                    obj,
                    camera.x,
                    camera.y,
                    this.canvas.width,
                    this.canvas.height
                )
            )
                continue;
            const x = obj.x - camera.x;
            const y = obj.y - camera.y;
            const w = obj.width;
            const h = obj.height;

            
            obj.rotate += obj.rotateSpeed || 0.01;
            this.ctx.save();
            obj.rotate ??= 0;

            // pindah ke tengah rect
            this.ctx.translate(x + w / 2, y + h / 2);

            // rotate (radian)
            this.ctx.rotate(obj.rotate);

            // gambar relatif dari tengah
            if (Array.isArray(obj.color)) {
    // Create gradient from left to right
    const gradient = this.ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
    obj.color.forEach((color, index) => {
        // Add color stops at equal intervals
        gradient.addColorStop(index / (obj.color.length - 1), color);
    });
    this.ctx.fillStyle = gradient;
} else {
    this.ctx.fillStyle = obj.color || "black";
}

this.ctx.fillRect(-w / 2, -h / 2, w, h);
            if (obj.lineData) {
    const cfg = obj.lineData;

    const colors = Array.isArray(cfg.lineColor)
        ? cfg.lineColor
        : [cfg.lineColor || "gray"];

    const widths = Array.isArray(cfg.lineWidth)
        ? cfg.lineWidth
        : [];

    colors.forEach((color, i) => {
        this.ctx.strokeStyle = color;

        if (widths.length) {
            this.ctx.lineWidth = widths[i] ?? widths[widths.length - 1];
        } else {
            const base = cfg.lineWidth || 1;
            this.ctx.lineWidth = base + (colors.length - i - 1);
        }

        this.ctx.strokeRect(-w / 2, -h / 2, w, h);
    });
}
            this.ctx.restore();

            cb(obj);
        }
    }

    arc(data, camera, cb = () => {}) {
        for (let id in data) {
            const obj = data[id];
            if (
                !this.isVisible(
                    obj,
                    camera.x,
                    camera.y,
                    this.canvas.width,
                    this.canvas.height
                )
            )
                continue;
            const start = obj.startAngle ?? 0;
            const end = obj.endAngle ?? Math.PI * 2;
            obj.radius ??= 20;

            this.ctx.beginPath();
            this.ctx.arc(
                obj.x - camera.x,
                obj.y - camera.y,
                obj.radius,
                start,
                end
            );

            // fill
            this.ctx.fillStyle = obj.color || "black";
            this.ctx.fill();

            // stroke
            this.ctx.strokeStyle = obj.lineColor || "black";
            this.ctx.stroke();

            cb(obj);
        }
    }

    
  
    textName(data, camera, color, position = "center", cb = () => {}) {
        for (let id in data) {
            const obj = data[id];
            cb(obj);
            if (
                !this.isVisible(
                    obj,
                    camera.x,
                    camera.y,
                    this.canvas.width,
                    this.canvas.height
                )
            )
                continue;
            const weight = obj.isBold ? "bold" : "";
            const size = obj.textSize ? obj.textSize + "px" : "20px";
            const family = obj.font || "Arial";

            this.ctx.font = `${weight} ${size} ${family}`;
            this.ctx.fillStyle = color || obj.color || "black";

            this.ctx.textAlign = "center";
            this.ctx.textBaseline = "middle";

            let x = obj.x - camera.x + obj.width / 2;
            let y = obj.y - camera.y + obj.height / 2;

            if (position === "top") {
                y = obj.y - camera.y - 10;
            } else if (position === "bottom") {
                y = obj.y - camera.y + obj.height + 10;
            }

            this.ctx.fillText(obj.name, x, y);
        }
    }
    text(
        data,
        camera,
        texts,
        sizeParam = 21,
        position = "center",
        color = "black",
        cb = () => {}
    ) {
        for (let id in data) {
            const obj = data[id];
            cb(obj);
            if (
                !this.isVisible(
                    obj,
                    camera.x,
                    camera.y,
                    this.canvas.width,
                    this.canvas.height
                )
            )
                continue;
            const weight = obj.isBold ? "bold" : "";
            const size = obj.size
                ? `${obj.size + sizeParam}px`
                : `${sizeParam}px`;
            const family = obj.font || "Arial";

            this.ctx.font = `${weight} ${size} ${family}`;
            this.ctx.fillStyle = color || obj.color || "black";

            this.ctx.textAlign = "center";
            this.ctx.textBaseline = "middle";

            let x = obj.x - camera.x + obj.width / 2;
            let y = obj.y - camera.y + obj.height / 2;

            if (position === "top") {
                y = obj.y - camera.y - 10;
            } else if (position === "bottom") {
                y = obj.y - camera.y + obj.height + 10;
            }

            this.ctx.fillText(texts, x, y);
        }
    }
    textDirFolAnalog(
        data,
        camera,
        texts,
        dt = 0,
        position = "center",
        color = "black",
        cb = () => {}
    ) {
        for (let id in data) {
            const obj = data[id];
            cb(obj);
            if (
                !this.isVisible(
                    obj,
                    camera.x,
                    camera.y,
                    this.canvas.width,
                    this.canvas.height
                )
            )
                continue;
            const weight = obj.isBold ? "bold" : "";
            const size = obj.size ? obj.size + "px" : "20px";
            const family = obj.font || "Arial";

            this.ctx.font = `${weight} ${size} ${family}`;
            this.ctx.fillStyle = color || obj.color || "black";
            this.ctx.textAlign = "center";
            this.ctx.textBaseline = "middle";

            const centerX = obj.x + obj.width / 2 - camera.x;
            const centerY = obj.y + obj.height / 2 - camera.y;

            const dx = obj.dx || 0;
            const dy = obj.dy || 0;

            let angle = 0;

            if (dx !== 0 || dy !== 0) {
                let raw = Math.atan2(dy, dx);

                // SNAP 8 ARAH
                const step = Math.PI / 4;
                angle = Math.round(raw / step) * step;
            }

            this.ctx.save();
            this.ctx.translate(centerX, centerY);
            this.ctx.rotate(angle);

            let yOffset = 0;

            if (position === "top") {
                yOffset = -obj.height / 2 - 10;
            } else if (position === "bottom") {
                yOffset = obj.height / 2 + 10;
            }

            this.ctx.fillText(texts, 0, yOffset);

            this.ctx.restore();
        }
    }

    hp(
        data,
        camera,
        layerKey,
        position = "top",
        colorBar = "black",
        colorHp = "lime",
        colorDecrease = "red",
        cb = () => {}
    ) {
        if (!this.hpState[layerKey]) this.hpState[layerKey] = {};
        const stateLayer = this.hpState[layerKey];

        for (let id in data) {
            const player = data[id]; // pakai player langsung
            cb(player);

            if (
                !this.isVisible(
                    player,
                    camera.x,
                    camera.y,
                    this.canvas.width,
                    this.canvas.height
                )
            )
                continue;

            if (player.hp == null || player.maxHp == null) continue;

            const hpData = player.HPdata || {};
            if (stateLayer[id] == null) stateLayer[id] = player.hp; // init display

            const smooth = hpData.smoothSpeed ?? 0.5;
            let displayHp = stateLayer[id];

            // Smooth HP perubahan
            if (displayHp > player.hp) {
                displayHp -= smooth;
                if (displayHp < player.hp) displayHp = player.hp;
            } else if (displayHp < player.hp) {
                displayHp += smooth;
                if (displayHp > player.hp) displayHp = player.hp;
            }

            stateLayer[id] = displayHp; // update player state

            // ===============================
            // SIZE CONFIG
            // ===============================
            const barWidth = hpData.width ?? player.width;
            const barHeight = hpData.height ?? 6;

            const x = player.x - camera.x + player.width / 2 - barWidth / 2;
            const offsetY = hpData.offsetY ?? -12;
            let y;

            if (position === "top") {
                y = player.y - camera.y + offsetY;
            } else if (position === "bottom") {
                y = player.y - camera.y + player.height + Math.abs(offsetY);
            } else {
                y = player.y - camera.y + offsetY;
            }

            const percent = Math.max(0, player.hp / player.maxHp);
            const displayPercent = Math.max(0, displayHp / player.maxHp);

            const hpWidth = percent * barWidth;
            const decreaseWidth = displayPercent * barWidth;

            // Background
            this.ctx.fillStyle = hpData.colorBar ?? colorBar;
            this.ctx.fillRect(x, y, barWidth, barHeight);

            // Main HP
            let finalColor = hpData.colorHp ?? colorHp;
            if (percent <= 0.3) finalColor = "red";

            this.ctx.fillStyle = finalColor;
            this.ctx.fillRect(x, y, hpWidth, barHeight);

            // Damage delay effect
            if (decreaseWidth > hpWidth) {
                this.ctx.fillStyle = hpData.colorDecrease ?? colorDecrease;
                this.ctx.fillRect(
                    x + hpWidth,
                    y,
                    decreaseWidth - hpWidth,
                    barHeight
                );
            }
        }

        // Cleanup state kalau player sudah hilang
        for (let id in stateLayer) {
            if (!data[id]) delete stateLayer[id];
        }
    }
}


class Utils {
    constructor() {}
    generateAnimationDirectionFromAnalog(p, o) {
        if (o.dx !== 0 || o.dy !== 0) {
            if (Math.abs(o.dx) > Math.abs(o.dy)) {
                p.animationDirection = o.dx > 0 ? "right" : "left";
            } else {
                p.animationDirection = o.dy > 0 ? "bottom" : "top";
            }
        }
    }
    rand(min = 0, max = 0) {
        if (min === 0 && max === 0) return 0;
        if (min === max) return min;

        let number;
        let guard = 10;
        do {
            number = Math.floor(Math.random() * (max - min + 1)) + min;
        } while (number === 0 && guard-- > 0);

        return number === 0 ? min : number;
    }

    read(obj, cb) {
        for (let id in obj) {
            const el = obj[id];
            if (!el) continue;
            cb(el, id);
            if (el.delThis) delete obj[id];
        }
    }
}

class DOM {
    constructor() {}

    h1(parent, text, className) {
        const child = document.createElement("h1");
        if (className) child.className = className;
        child.textContent = text;
        parent.appendChild(child);
        return child;
    }

    h2(parent, text, className) {
        const child = document.createElement("h2");
        if (className) child.className = className;
        child.textContent = text;
        parent.appendChild(child);
        return child;
    }

    h3(parent, text, className) {
        const child = document.createElement("h3");
        if (className) child.className = className;
        child.textContent = text;
        parent.appendChild(child);
        return child;
    }

    h4(parent, text, className) {
        const child = document.createElement("h4");
        if (className) child.className = className;
        child.textContent = text;
        parent.appendChild(child);
        return child;
    }

    div(parent, text, className) {
        const child = document.createElement("div");
        if (className) child.className = className;
        if (text) child.textContent = text;
        parent.appendChild(child);
        return child;
    }

    input(parent, placeholder, className) {
        const child = document.createElement("input");
        if (className) child.className = className;
        if (placeholder) child.placeholder = placeholder;
        parent.appendChild(child);
        return child;
    }

    button(parent, text, className) {
        const child = document.createElement("button");
        if (className) child.className = className;
        child.textContent = text;
        parent.appendChild(child);
        return child;
    }
    addButton(el, cb = (el, scope) => {}, colorAfterClick = "yellow") {
        /* ===== STYLE BASE ===== */
        el.style.position = "absolute";
        el.style.top = "80%";
        el.style.right = "20%";
        el.style.width = "clamp(80px, 15vw, 120px)";
        el.style.height = "clamp(30px, 7vh, 60px)";
        el.style.fontWeight = "bolder";
        el.style.color = "white";
        el.style.fontSize = "17px";
        el.style.backgroundColor = "green";
        el.style.border = "1.5px solid brown";
        el.style.borderRadius = "5%";
        el.style.userSelect = "none";
        el.style.touchAction = "none";
        el.style.transition =
            "transform 0.08s ease, background-color 0.08s ease";

        /* ===== CALLBACK SETUP ===== */
        cb(el, "setup"); // scope "setup" untuk konfigurasi awal

        /* ===== SIMPAN WARNA AWAL ===== */
        const defaultColor = el.style.backgroundColor;

        /* ===== EVENT ===== */
        el.addEventListener("pointerdown", e => {
            e.preventDefault();

            el.style.transform = "scale(0.9)";
            el.style.backgroundColor = colorAfterClick;

            cb(el, "press"); // scope "press" untuk saat klik
        });

        const resetStyle = () => {
            el.style.transform = "scale(1)";
            el.style.backgroundColor = defaultColor;
        };

        el.addEventListener("pointerup", resetStyle);
        el.addEventListener("pointercancel", resetStyle);
        el.addEventListener("pointerleave", resetStyle);
    }
}
class VirtualButton {
    static injected = false;

    static injectCSS() {
        if (this.injected) return;

        const style = document.createElement("style");
        style.textContent = `
      .vbtn{
        position:fixed;
        bottom:25px;
        width:80px;
        height:80px;
        border-radius:50%;
        border:none;
        font-size:26px;
        font-weight:bold;
        background:rgba(255,255,255,0.25);
        backdrop-filter:blur(6px);
        color:white;
        user-select:none;
        touch-action:none;
        transition: transform 0.08s ease;
will-change: transform;
      }

      .vbtn:active{
        transform: scale(0.9);
      }
    `;
        document.head.appendChild(style);
        this.injected = true;
    }

    constructor({
        text = "",
        left = null,
        right = null,
        bottom = 25,
        size = 80,
        background = "rgba(128,128,128,0.5)",
        onPress = () => {},
        onRelease = () => {}
    }) {
        VirtualButton.injectCSS();

        this.el = document.createElement("button");
        this.el.className = "vbtn";
        this.el.textContent = text;

        this.el.style.width = size + "px";
        this.el.style.height = size + "px";
        this.el.style.bottom = bottom + "px";
        this.el.style.background = background;

        if (left !== null) this.el.style.left = left + "px";
        if (right !== null) this.el.style.right = right + "px";

        document.body.appendChild(this.el);
        this.isHolding = false;

        this.el.addEventListener("pointerdown", e => {
            e.preventDefault();
            this.isHolding = true;
            onPress();
        });

        const release = e => {
            e.preventDefault();
            this.isHolding = false;
            onRelease();
            
        };

        this.el.addEventListener("pointerup", release);
        this.el.addEventListener("pointercancel", release);
        this.el.addEventListener("pointerleave", release);
    }
    show() {
    this.el.style.display = "block";
}

hide() {
    this.el.style.display = "none";
}
}
const Adiva = {
    GameLoop,
    Analog,
    Draw,
    Utils,
    DOM,
    VirtualButton
};
const client = {
    app: new GameLoop(canvas),
    utils: new Utils(),
    dom: new DOM(canvas),
    VirtualButton,
    Draw
};
