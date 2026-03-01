class Collision {
    constructor(cellSize = 100) {
        this.cellSize = cellSize;
        this.staticGrid = {};
        this.dynamicGrid = {};
        this.gameState = [];
    }

    // ==============================
    // GRID SYSTEM
    // ==============================

    getCellKey(x, y) {
        const cx = Math.floor(x / this.cellSize);
        const cy = Math.floor(y / this.cellSize);
        return `${cx},${cy}`;
    }

    buildStaticGrid(group = {}) {
        this.staticGrid = {};
        for (let id in group) {
            const g = group[id];
            const key = this.getCellKey(g.x, g.y);
            (this.staticGrid[key] ??= []).push(g);
        }
    }

    buildDynamicGrid(group = {}) {
        this.dynamicGrid = {};
        for (let id in group) {
            const g = group[id];
            const key = this.getCellKey(g.x, g.y);
            (this.dynamicGrid[key] ??= []).push(g);
        }
    }

    getNearbyAll(x, y) {
        const cx = Math.floor(x / this.cellSize);
        const cy = Math.floor(y / this.cellSize);
        const result = [];

        for (let gx = cx - 1; gx <= cx + 1; gx++) {
            for (let gy = cy - 1; gy <= cy + 1; gy++) {
                const key = `${gx},${gy}`;
                if (this.staticGrid[key]) result.push(...this.staticGrid[key]);
                if (this.dynamicGrid[key]) result.push(...this.dynamicGrid[key]);
            }
        }

        return result;
    }

    // ==============================
    // AABB CORE
    // ==============================

    checkAABB(px, py, pw, ph, tx, ty, tw, th) {
        return (
            px < tx + tw &&
            px + pw > tx &&
            py < ty + th &&
            py + ph > ty
        );
    }

    // ==============================
    // GROUP vs GROUP AABB
    // ==============================

    aabb(group1 = {}, group2 = {}, onCollide) {

        this.buildDynamicGrid(group2);

        const collisions = [];

        for (let id in group1) {
            const g1 = group1[id];
            const nearby = this.getNearbyAll(g1.x, g1.y);

            for (let g2 of nearby) {
              if(!this.gameState.includes(g2.scene))continue
                if (this.checkAABB(
                    g1.x, g1.y, g1.width, g1.height,
                    g2.x, g2.y, g2.width, g2.height
                )) {
                    if (onCollide) onCollide(g1, g2);
                    collisions.push({ g1, g2 });
                }
            }
        }

        return collisions;
    }
    
    

    // ==============================
    // SIMPLE MOVE WITH COLLISION
    // ==============================

    moveWithCollision(player, dx, dy) {

        // ===== X =====
        let nextX = player.x + dx;
        let nearbyX = this.getNearbyAll(nextX, player.y);

        for (let o of nearbyX) {
            if (this.checkAABB(
                nextX,
                player.y,
                player.width,
                player.height,
                o.x,
                o.y,
                o.width,
                o.height
            )) {
                if (dx > 0) nextX = o.x - player.width;
                if (dx < 0) nextX = o.x + o.width;
                dx = 0;
            }
        }

        player.x = nextX;

        // ===== Y =====
        let nextY = player.y + dy;
        let nearbyY = this.getNearbyAll(player.x, nextY);

        for (let o of nearbyY) {
            if (this.checkAABB(
                player.x,
                nextY,
                player.width,
                player.height,
                o.x,
                o.y,
                o.width,
                o.height
            )) {
                if (dy > 0) nextY = o.y - player.height;
                if (dy < 0) nextY = o.y + o.height;
                dy = 0;
            }
        }

        player.y = nextY;
    }

    // ==============================
    // PHYSICS (TIDAK DIUBAH)
    // ==============================

    applyPhysics(player, dynamicObstacles = {}, dt = 1) {

        this.buildDynamicGrid(dynamicObstacles);

        player.vy += player.gravity * dt;
        /*// === HORIZONTAL FRICTION ===
if (player.onGround) {
    player.vx *= player.friction; // friction normal
} else {
    player.vx *= player.airFriction ?? 0.98; // lebih licin di udara
}

// stop micro sliding
if (Math.abs(player.vx) < 1) {
    player.vx = 0;
}*/


        player.onGround = false;
        player.onWall = false;
        player.wallSide = null;
        player.groundObject = null;

        let nextX = player.x + player.vx * dt;
        let nearbyX = this.getNearbyAll(nextX, player.y);

        for (let o of nearbyX) {
          if(!this.gameState.includes(o.scene))continue
            if (this.checkAABB(
                nextX, player.y,
                player.width, player.height,
                o.x, o.y, o.width, o.height
            )) {

                if (player.vx > 0) {
                    nextX = o.x - player.width;
                    player.wallSide = "right";
                } else if (player.vx < 0) {
                    nextX = o.x + o.width;
                    player.wallSide = "left";
                }

                player.vx = 0;
                player.onWall = true;
            }
        }

        player.x = nextX;

        let nextY = player.y + player.vy * dt;
        let nearbyY = this.getNearbyAll(player.x, nextY);

        for (let o of nearbyY) {
          if(!this.gameState.includes(o.scene))continue
            if (this.checkAABB(
                player.x, nextY,
                player.width, player.height,
                o.x, o.y, o.width, o.height
            )) {

                if (player.vy > 0) {
                    nextY = o.y - player.height;
                    player.onGround = true;
                    player.groundObject = o;
                } else if (player.vy < 0) {
                    nextY = o.y + o.height;
                }

                player.vy = 0;
            }
        }

        player.y = nextY;

        if (!player.onGround) {
            player.state = player.vy < 0 ? "jump" : "fall";
        } else if (Math.abs(player.vx) > 10) {
            player.state = "run";
        } else {
            player.state = "idle";
        }

        if (player.onGround) {
            player.coyoteTimer = player.coyoteMax;
            player.jumpCount = 0;
        } else {
            player.coyoteTimer = Math.max(player.coyoteTimer - dt, 0);
        }

        if (player.jumpBufferTimer > 0) {
            player.jumpBufferTimer = Math.max(player.jumpBufferTimer - dt, 0);
        }

        if (player.jumpBufferTimer > 0) {

            if (player.coyoteTimer > 0) {
                player.vy = -player.jumpPower;
                player.jumpCount = 1;
                player.coyoteTimer = 0;
                player.jumpBufferTimer = 0;
            }
            else if (
                player.jumpCount > 0 &&
                player.jumpCount < player.maxJump
            ) {
                player.vy = -player.jumpPower;
                player.jumpCount++;
                player.jumpBufferTimer = 0;
            }
        }

        if (player.onGround && player.groundObject) {
          
            if (player.groundObject.vx)
                player.x += player.groundObject.vx * dt;

            if (player.groundObject.vy)
                player.y += player.groundObject.vy * dt;
        }
    }

    applySpeedPlatformerByAnalog(p, anal) {
        p.vx = anal.dx * p.speed;

        if (anal.dx < 0) p.animationDirection = "left";
        else if (anal.dx > 0) p.animationDirection = "right";
    }
}


class AI_System {
    move(players, deltaTime, cb=()=>{}) {
        for (let id in players) {
            const el = players[id];
            if(!el.isAI_Move)continue
            
            el.AI_Step ??= 1;
            el.__aiTime ??= 0;

            const move = el.AI_Move[el.AI_Step];
            cb(el, move)

            if (!move) {
                el.AI_Step = 1;
                el.__aiTime = 0;
                continue;
            }

            el.__aiTime += deltaTime;

            if (move.pos) {
                el.x += move.pos.x * deltaTime;
                el.y += move.pos.y * deltaTime;
            }

            if (move.animDir !== undefined) {
                el.animationDirection = move.animDir;
            }

            if (move.ability !== undefined) {
                el.ability = move.ability;
            }

            if (el.__aiTime >= move.duration) {
                el.__aiTime = 0;
                el.AI_Step++;

                if (!el.AI_Move[el.AI_Step]) {
                    el.AI_Step = 1;
                }
            }
        }
    }
}
class UtilsServer {
    timer(id, interval, dt, callback = () => {}) {
        this._timers ??= {};

        const key = `spawn ${id}`;
        if (!this._timers[key]) {
            this._timers[key] = { waktu: 0 };
        }

        const timer = this._timers[key];

        timer.waktu += dt;

        if (timer.waktu >= interval) {
            callback();
            timer.waktu = 0;
        }
    }
    splitTime(key, str, dt, callback = () => {}) {
        this.yourTime ??= {};
        if (!this.yourTime[key]) {
            this.yourTime[key] = {};
        }
        const t = this.yourTime[key];
        if (t[`timer1`] !== undefined) {
            let idx = t.now;
            t[`timer${idx}`] -= dt ?? 1 / 60;

            callback({
                [`timer${idx}`]: true,
                sisa: t[`timer${idx}`]
            });

            if (t[`timer${idx}`] <= 0) {
                t[`timer${idx}`] = 0;
                t.now++;
                if (t.now > t.total) {
                    t.now = 1;
                    for (let i = 0; i < t.timeAsli.length; i++) {
                        t[`timer${i + 1}`] = t.timeAsli[i];
                    }
                }
            }
            return;
        }
        const arrTime = str.split(" ").map(Number);
        const obj = {};
        for (let i = 0; i < arrTime.length; i++) {
            obj[`timer${i + 1}`] = arrTime[i];
        }
        obj.now = 1;
        obj.timeAsli = arrTime;
        obj.total = arrTime.length;
        this.yourTime[key] = obj;
    }

    checkDistance(group1, group2, threshold, cb) {
        for (let id1 in group1) {
            const obj1 = group1[id1];
            for (let id2 in group2) {
                const obj2 = group2[id2];
                const dx = obj2.x - obj1.x;
                const dy = obj2.y - obj1.y;
                const dist = Math.hypot(dx, dy);
                if (dist <= threshold) {
                    cb(obj1, obj2, dist);
                }
            }
        }
    }

    checkDX(group1, group2, threshold, cb) {
        for (let id1 in group1) {
            const obj1 = group1[id1];
            for (let id2 in group2) {
                const obj2 = group2[id2];
                const dx = obj2.x - obj1.x;
                if (Math.abs(dx) <= threshold) cb(obj1, obj2, dx);
            }
        }
    }

    checkDY(group1, group2, threshold, cb) {
        for (let id1 in group1) {
            const obj1 = group1[id1];
            for (let id2 in group2) {
                const obj2 = group2[id2];
                const dy = obj2.y - obj1.y;
                if (Math.abs(dy) <= threshold) cb(obj1, obj2, dy);
            }
        }
    }
    createBullets(spawnTime=1,dt, data, skills) {
        for (let id in data) {
            const obj = data[id];
            if (!obj.bullet) continue;
            this.timer(obj.id, this.rand(5,9), dt, () => {
                const id = crypto.randomUUID();
                skills[id] = {
                    id,
                    x: obj.x + obj.width / 2 - obj.bullet.width / 2,
                    y: obj.y + obj.width / 2 - obj.bullet.height / 2,
                    ...obj.bullet,
                    dx : obj.animationDirection === "right"?1:-1
                };
            });
        }
    }
    readBulletsData(spawnTime, dt, data, skills) {
        this.createBullets(spawnTime,dt, data, skills);
        for (let id in skills) {
            const skill = skills[id];
            skill.lifeTime -= dt;
            if (skill.lifeTime <= 0) delete skills[skill.id];
            skill.speedY ??=0
            skill.x += skill.speed * dt;
            skill.y += skill.speedY * dt;
        }
    }

    fixAnalog(dx, dy) {
        const len = Math.hypot(dx, dy);
        if (len > 0) {
            dx /= len;
            dy /= len;
        }
        return { dx, dy };
    }

    randId() {
        return Date.now() + "_" + Math.floor(Math.random() * 1000);
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
            cb(el, id);
            if (el.delThis) delete obj[id];
        }
    }

    getSafePosition(cfg = {}) {
        const {
            avoid,
            width,
            height,
            worldWidth = 300,
            worldHeight = 600,
            worldX = 0,
            worldY = 0
        } = cfg;
        let x, y, safe;
        do {
            x = this.rand(worldX, worldWidth);
            y = this.rand(worldY, worldHeight);
            safe = true;

            for (let id in avoid) {
                const w = avoid[id];
                if (
                    x < w.x + w.width &&
                    x + width > w.x &&
                    y < w.y + w.height &&
                    y + height > w.y
                ) {
                    safe = false;
                    break;
                }
            }
        } while (!safe);

        return { x, y };
    }
    generateAnimationDirectionFromAnalog(p, o) {
        if (o.dx !== 0 || o.dy !== 0) {
            if (Math.abs(o.dx) > Math.abs(o.dy)) {
                p.animationDirection = o.dx > 0 ? "right" : "left";
            } else {
                p.animationDirection = o.dy > 0 ? "bottom" : "top";
            }
        }
    }
    generateXDirectionFromAnalog(p, o) {
        if (o.dx !== 0 || o.dy !== 0)
            p.animationDirection = o.dx > 0 ? "right" : "left";
    }
    
    
}
class Template{
  createBasicEntity(opt = {}) {

    const base = {
        x: -50,
        y: 150,
        width: 25,
        height: 25,
        hp: 100,
        maxHp: 100,

        HPdata: {
            width: 100,
            height: 7
        },
        
        name: "nama",
        scene: "play",
        color: ["green","lime","black"],
        id: "aaa",
        speed: 250,
        rotate : 45,
        rotateSpeed : 0.9,
        vx: 0,
        vy: 0,
        gravity: 900,
        friction : 0.85,
        airFriction :0.98,
        onGround: false,
        onWall: false,
        onSide: false,
        state: "idle",
        animationDirection: "right",
        img: "diam",

        visual: {
            width: 100,
            height: 100
        },
            lineData: {
  lineColor: ["blue","green","yellow"],
  lineWidth: [6,3,1]
},
      
        jumpBufferTimer: 0,
        jumpBufferMax: 0.15,
        coyoteTimer: 0,
        coyoteMax: 0.2,
        jumpCount: 0,
        maxJump: 3,
        jumpPower: 350
    };

    return {
        ...base,
        ...opt,

        visual: {
            ...base.visual,
            ...(opt.visual || {})
        },

        dataHP: {
            ...base.dataHP,
            ...(opt.dataHP || {})
        }
    };
}
}
class GameLoopServer {
    constructor(tickRate = 60) {
        this.dt = 1000 / tickRate;
        this.last = Date.now();
        this.acc = 0;
    }

    render(cb) {
        setInterval(() => {
            const now = Date.now();
            this.acc += now - this.last;
            this.last = now;

            while (this.acc >= this.dt) {
                cb(this.dt / 1000);
                this.acc -= this.dt;
            }
        }, 1);
    }
}

const AdivaServer = {
    Collision,
    UtilsServer,
    GameLoop
};

const server = {
    utils: new UtilsServer(),
    template: new Template(),
    collision: new Collision(150),
    ai_system: new AI_System()
};
