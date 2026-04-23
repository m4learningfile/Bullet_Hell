// ============================================================
// CANVAS SETUP
// ============================================================
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
let DPR = Math.min(window.devicePixelRatio||1, 2);
function resize() {
  const maxW=window.innerWidth, maxH=window.innerHeight, ratio=BASE_W/BASE_H;
  let w=maxW, h=maxW/ratio;
  if(h>maxH){h=maxH;w=maxH*ratio;}
  canvas.style.width=w+'px'; canvas.style.height=h+'px';
  canvas.width=Math.floor(w*DPR); canvas.height=Math.floor(h*DPR);
}
window.addEventListener('resize',resize); resize();
function screenScale(){ return canvas.width/BASE_W; }

// ============================================================
// INPUT
// ============================================================
const keys = {};
const mouse = { x:BASE_W/2, y:BASE_H/2, down:false, right:false };
let paused = false;
window.addEventListener('keydown', e => {
  const k=e.key.toLowerCase(); keys[k]=true;
  if(e.key===' ') e.preventDefault();
  if((k==='p'||e.key==='Escape')&&game.state!=='menu'&&game.state!=='dead'&&game.state!=='boonselect'){ togglePause(); }
  if(k==='t'&&game.state==='playing'&&!paused&&game.upgrades.borrowedAbility) useBorrowedAbility();
});
window.addEventListener('keyup', e=>{ keys[e.key.toLowerCase()]=false; });
canvas.addEventListener('mousemove', e=>{
  const r=canvas.getBoundingClientRect();
  mouse.x=(e.clientX-r.left)/r.width*BASE_W;
  mouse.y=(e.clientY-r.top)/r.height*BASE_H;
});
canvas.addEventListener('mousedown', e=>{
  if(game.state!=='playing') return;
  if(e.button===0){
    if(saveData.options&&saveData.options.shootMode==='toggle'){ mouse.toggleFire=!mouse.toggleFire; }
    else mouse.down=true;
  }
  if(e.button===2) mouse.right=true;
});
canvas.addEventListener('mouseup',   e=>{
  if(e.button===0 && (!saveData.options||saveData.options.shootMode!=='toggle')) mouse.down=false;
  if(e.button===2) mouse.right=false;
});
// V2: When the mouse is released outside the canvas, drop hold-fire (toggle mode is unaffected)
window.addEventListener('mouseup', ()=>{
  if(!saveData.options||saveData.options.shootMode!=='toggle') mouse.down=false;
  mouse.right=false;
});
canvas.addEventListener('contextmenu', e=>e.preventDefault());
