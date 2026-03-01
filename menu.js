const canvas = document.getElementById("canvas");
const wrap = document.getElementById("wrap");
const rpt = document.getElementById("rpt");
const lv = document.getElementById("lv");
const infoJump = document.getElementById("infoJump");
const infoHelp = document.getElementById("infoHelp");
const menu = document.getElementById("menu");
const menuFree = document.getElementById("menuFree");
const jarak = document.getElementById("jarak");
const back = document.getElementById("back");
const jarakTerbaik = document.getElementById("jarakTerbaik");
const barFree = document.getElementById("barFree");


wrap.style.display = "none"
back.style.display = "none"
infoHelp.style.display = "none"
barFree.style.display = "none"
server.isPlay = false

misi.onclick = ()=>{
  server.mode = "misi"
  server.collision.gameState = ["play", "A"];
  client.draw.gameState = ["play", "A"];
  menu.style.display = "none"
  wrap.style.display = "block"
  server.isPlay = true
  btn.show()
  server.collision.buildStaticGrid(server.walls);
  back.style.display = "block"
}
free.onclick = ()=>{
  menu.style.display = "none"
  menuFree.style.display = ""
  back.style.display = "block"
}
help.onclick = ()=>{
  menu.style.display = "none"
  infoHelp.style.display = "block"
  back.style.display = "block"
}
back.onclick = ()=>{
  menu.style.display = ""
  infoHelp.style.display = "none"
  menuFree.style.display = "none"
  back.style.display = "none"
  wrap.style.display = "none"
  server.isPlay = false
  barFree.style.display = "none"
  jarak.style.display = "none"
  jarakTerbaik.style.display = "none"
  infoJump.style.display = "none"
  server.utils.read(server.players, p=>{
    p.x =0
    p.y =0
    p.vy =0
  })
}


menuFree.style.display = "none"
const mapBtn = ["Stage A", "Stage B", "Stage C", "Stage D","Stage E"];

mapBtn.forEach((str,i) => {
  const div = document.createElement("div");
  div.textContent = str;
  div.className = "btn";
  div.onclick=()=>{
    server.mode = "free"
    server.isPlay = true
    btn.show()
    server.collision.gameState = ["play", String(i)];
    client.draw.gameState = ["play", String(i)];
    server.collision.buildStaticGrid(server[`walls${i}`]);
    barFree.style.display = "flex"
    jarak.style.display = "flex"
    jarakTerbaik.style.display = "flex"
    menuFree.style.display = "none"
    
  }
  menuFree.appendChild(div);
});