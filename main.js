client.draw = new client.Draw(canvas, client.assets);
let dis =0
let besDis =0
render();

const btn = new client.VirtualButton({
    text: "⤴",
    right: 25,
    bottom: 40,
    size: 95,
    onPress: () => {
        client.utils.read(
            server.players,
            p => (p.jumpBufferTimer = p.jumpBufferMax)
        );
    }
});
btn.hide()
server.players = {};

const mapVar = {
    walls: wallsA,
    wallsB: wallsB,
    wallsC: wallsC,
    wallsD: wallsD,
    wallsE: wallsE,
    wallsF: wallsF,
    wallsG: wallsG,
    wallsH: wallsH,
    wallsI: wallsI,
    wallsJ: wallsJ,
    fA: fA,
    fB: fB,
    fC: fC,
    fD: fD,
    fE: fE,
    fF: fF,
    fG: fG,
    fH: fH,
    fI: fI,
    fJ: fJ,
};
const levelMap = {
    fA: {
        scene: "B",
        stage: "wallsB"
    },
    fB: {
        scene: "C",
        stage: "wallsC"
    },
    fC: {
        scene: "D",
        stage: "wallsD"
    },
    fD: {
        scene: "E",
        stage: "wallsE"
    },
    fE: {
        scene: "F",
        stage: "wallsF"
    },
    fF: {
        scene: "G",
        stage: "wallsG"
    },
    fG: {
        scene: "H",
        stage: "wallsH"
    },
    fH: {
        scene: "I",
        stage: "wallsI"
    },
    fI: {
        scene: "J",
        stage: "wallsJ"
    },
    fJ: {
        scene: "tamat",
        stage: "tamat"
    }
};
const clientMap = [
    { stage: "walls", finish: "fA" },
    { stage: "wallsB", finish: "fB" },
    { stage: "wallsC", finish: "fC" },
    { stage: "wallsD", finish: "fD" },
    { stage: "wallsE", finish: "fE" },
    { stage: "wallsF", finish: "fF" },
    { stage: "wallsG", finish: "fG" },
    { stage: "wallsH", finish: "fH" },
    { stage: "wallsI", finish: "fI" },
    { stage: "wallsJ", finish: "fJ" },
];

Object.keys(mapVar).forEach(key => {
    server[key] = mapVar[key];
});
const mapMshMove = {
    mshC: mshC,
    mshD: mshD,
    mshG: mshG,
    lipF: lipF,
};
Object.keys(mapMshMove).forEach(key => {
    server[key] = mapMshMove[key];
});

server.rpt = 0;
server.lv = 1;

server.players["lwk"] = server.template.createBasicEntity();




function die(p) {
  if(server.mode === "misi"){
    if (p.isTouchTrap || p.y > 1400 || (p.x === 2615 && p.y === 545)) {
        p.x = 0;
        p.y = 0;
        server.rpt++;
        rpt.textContent = `Repeat : ${server.rpt}`;
        p.isTouchTrap = false;
    }
  }else{
    if (p.isTouchTrap || p.y > 2000) {
      if(dis>besDis)
      besDis = Math.floor(p.x)
        p.x = 0;
        p.y = 0;
        p.isTouchTrap = false;
        jarakTerbaik.textContent = `Best distance : ${besDis}`
    }
  }
}
server.bul = {}
function serverLogic(dt) {
  server.utils.readBulletsData(7, dt, server.archer, server.bul)
  
  server.utils.readBulletsData(7, dt, server.mshStg3, server.bul)
  server.ai_system.move(server.mshStg3, dt);
  
  server.collision.aabb(server.players, server.bul, (g1, g2) => {
             g1.isTouchTrap = true;
             die(g1);
          
        });
    Object.keys(mapMshMove).forEach(key => {
        server.ai_system.move(server[key], dt);
        server.collision.aabb(server.players, server[key], (g1, g2) => {
          if(key !== "lipF"){
             g1.isTouchTrap = true;
             die(g1);
          }
        });
    });
    
    for (let id in levelMap) {
        const cfg = levelMap[id];
        server.collision.aabb(server.players, server[id], (g1, g2) => {
            server.collision.gameState = ["play", cfg.scene];
            client.draw.gameState = ["play", cfg.scene];
            g1.x = 0;
            g1.y = -300;
            g1.vy = 0;
            server.lv++;
            server.collision.staticGrid = {};
            server.collision.buildStaticGrid(server[cfg.stage]);
            lv.textContent = `Level : ${server.lv}`;
        });
    }

    server.utils.read(server.players, p => {
      
      if(server.mode !== "misi"){
        dis = Math.floor(p.x)
        jarak.textContent = `Distance : ${dis}`
      }
        const sisa = 3 - p.jumpCount;

        infoJump.style.display = sisa === 3 ? "none" : "block";
        infoJump.textContent = `JUMP X${sisa}`;
        p.vx = p.speed;

        server.collision.applyPhysics(p, server.lipF, dt);
        die(p);
    });
}

function clientLogic(dt) {
    client.app.cameraOn(server.players, "lwk");

    client.draw.rect(server.players, client.app.camera);

    Object.keys(mapMshMove).forEach(key => {
        client.draw.rect(server[key], client.app.camera);
    });

    clientMap.forEach(m => {
        client.draw.rect(server[m.stage], client.app.camera);
        client.draw.rect(server[m.finish], client.app.camera);
    });
    client.draw.rect(server.walls0, client.app.camera);
    
    client.draw.rect(server.archer, client.app.camera);
    client.draw.rect(server.walls1, client.app.camera);
    
    client.draw.rect(server.walls2, client.app.camera);
    client.draw.rect(server.mshStg3, client.app.camera);
    client.draw.rect(server.bul, client.app.camera);
    
    client.draw.rect(server.walls3, client.app.camera);
    client.draw.rect(server.walls4, client.app.camera);
}

function render() {
    client.app.render(dt => {
        if (!server.isPlay) return;
        serverLogic(dt);
        clientLogic(dt);
    });
}
