// ============================================================
// UTILS
// ============================================================
const rand=(a,b)=>a+Math.random()*(b-a);
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const dist2=(ax,ay,bx,by)=>(ax-bx)**2+(ay-by)**2;
const lerp=(a,b,t)=>a+(b-a)*t;
function hsl(h,s=70,l=55,a=1){
  return 'hsla('+((h%360+360)%360)+','+s+'%,'+l+'%,'+a+')';
}
function classSkillScale(cls){
  switch(cls){
    case 'blue': return 3;
    case 'black': return 5;
    default: return 1;
  }
}
function currentSkillDamageBonus(cls){
  return game.upgrades.skillDamage * classSkillScale(cls);
}
function arenaRect(){
  const s=game.arenaScale;
  const w=BASE_W*0.85*s, h=BASE_H*0.78*s;
  const maxW=BASE_W*0.95, maxH=BASE_H*0.90;
  const aw=Math.min(w,maxW), ah=Math.min(h,maxH);
  return{ x:(BASE_W-aw)/2, y:(BASE_H-ah)/2, w:aw, h:ah };
}

function getTrapezoidGuidePoints(e){
  const A=arenaRect();
  const points=[{x:e.x,y:e.y}];
  let x=e.x, y=e.y;
  let dx=e.warnDx||0, dy=e.warnDy||0;
  const mag=Math.hypot(dx,dy)||1;
  dx/=mag; dy/=mag;
  const maxHits=(e.boss?3:1);
  let hits=0;
  while(hits<maxHits){
    let tx=Infinity, ty=Infinity;
    if(dx>0) tx=(A.x+A.w-e.r-x)/dx;
    else if(dx<0) tx=(A.x+e.r-x)/dx;
    if(dy>0) ty=(A.y+A.h-e.r-y)/dy;
    else if(dy<0) ty=(A.y+e.r-y)/dy;
    let t=Math.min(tx,ty);
    if(!isFinite(t) || t<=0) break;
    x+=dx*t; y+=dy*t;
    points.push({x,y});
    hits++;
    if(hits>=maxHits) break;
    const hitX=Math.abs(t-tx)<0.0001;
    const hitY=Math.abs(t-ty)<0.0001;
    if(hitX) dx*=-1;
    if(hitY) dy*=-1;
  }
  return points;
}
function playerRadius(p){ return (p && p.radius) || PLAYER_RADIUS; }

function getIncomingEnemyDamage(){
  return 1 + Math.floor(Math.max(0,(game.wave||1)-1)/10);
}
function isNormalOrHigherDifficulty(){
  return game.difficulty==='normal' || game.difficulty==='hard' || game.difficulty==='insane';
}
function completeClassUnlock(key, title, how){
  if(saveData.adminMode) return;
  if(!saveData.specialUnlocks[key]){
    saveData.specialUnlocks[key]=true;
    saveSave();
    pushUnlockBanner(title, how);
  }
}
function pushUnlockBanner(title, how){
  if(!game.unlockBanners) game.unlockBanners=[];
  game.unlockBanners.push({title, how, t:5.0});
}
function noteSuccessfulBlock(){
  if(!isNormalOrHigherDifficulty()) return;
  if((game.wave||1) < 11) return;
  game.blockSuccessThisCast = true;
  saveData.unlockProgress.crescentBlockStreak = (saveData.unlockProgress.crescentBlockStreak||0) + 1;
  if(saveData.unlockProgress.crescentBlockStreak >= 10){
    completeClassUnlock('crescent', 'CRESCENT UNLOCKED', 'Block 10 attacks in a row on Normal+ at wave 11+ without taking a hit. COMPLETED');
  } else {
    saveSave();
  }
}
function resetCrescentUnlockProgress(){
  if((saveData.unlockProgress.crescentBlockStreak||0)!==0){
    saveData.unlockProgress.crescentBlockStreak = 0;
    saveSave();
  }
}
function configureMapForWave(n){
  const decade = Math.floor((Math.max(1,n)-1)/10);
  game.mapVariant = decade % 5;
  game.mapNames = ['VOID GRID','AZURE CIRCUIT','CRIMSON VEIL','VERDANT CAGE','AMETHYST NEXUS'];
  game.mapName = game.mapNames[game.mapVariant] || 'VOID GRID';
  game.mapPortals = [];
  if(n < 10) return;
  if(decade % 2 === 1){
    const portalCount = 2 + Math.floor(Math.random()*3); // 2-4
    const sides = ['top','right','bottom','left'];
    const chosen = sides.slice().sort(()=>Math.random()-0.5).slice(0, portalCount);
    const perm = chosen.slice().sort(()=>Math.random()-0.5);
    const A = arenaRect();
    const len = 120;
    const makePortal = (side, exitSide) => {
      const posRand = Math.random();
      let x=A.x, y=A.y, w=0, h=0, cx=0, cy=0;
      if(side==='top'){ cx=A.x+60+posRand*(A.w-120); cy=A.y; x=cx-len/2; y=A.y-8; w=len; h=16; }
      if(side==='bottom'){ cx=A.x+60+posRand*(A.w-120); cy=A.y+A.h; x=cx-len/2; y=A.y+A.h-8; w=len; h=16; }
      if(side==='left'){ cx=A.x; cy=A.y+60+posRand*(A.h-120); x=A.x-8; y=cy-len/2; w=16; h=len; }
      if(side==='right'){ cx=A.x+A.w; cy=A.y+60+posRand*(A.h-120); x=A.x+A.w-8; y=cy-len/2; w=16; h=len; }
      return {side, exitSide, x,y,w,h,cx,cy,len};
    };
    const uniqueExit = {};
    for(let i=0;i<chosen.length;i++){
      uniqueExit[chosen[i]] = perm[i];
      if(uniqueExit[chosen[i]]===chosen[i]) uniqueExit[chosen[i]] = perm[(i+1)%perm.length];
    }
    game.mapPortals = chosen.map(side => makePortal(side, uniqueExit[side]));
  }
}
function tryEntityPortalWarp(obj, radius, isEnemy=false){
  if(!game.mapPortals || !game.mapPortals.length) return false;
  if(obj.portalCooldown>0) return false;
  const A = arenaRect();
  for(const p of game.mapPortals){
    let entered = false;
    if(p.side==='top' && obj.y-radius <= A.y && obj.x>=p.x && obj.x<=p.x+p.w) entered = true;
    else if(p.side==='bottom' && obj.y+radius >= A.y+A.h && obj.x>=p.x && obj.x<=p.x+p.w) entered = true;
    else if(p.side==='left' && obj.x-radius <= A.x && obj.y>=p.y && obj.y<=p.y+p.h) entered = true;
    else if(p.side==='right' && obj.x+radius >= A.x+A.w && obj.y>=p.y && obj.y<=p.y+p.h) entered = true;
    if(entered){
      const exit = game.mapPortals.find(q => q.side===p.exitSide);
      if(!exit) return false;
      if(exit.side==='top'){ obj.x=exit.cx; obj.y=A.y+radius+10; }
      if(exit.side==='bottom'){ obj.x=exit.cx; obj.y=A.y+A.h-radius-10; }
      if(exit.side==='left'){ obj.x=A.x+radius+10; obj.y=exit.cy; }
      if(exit.side==='right'){ obj.x=A.x+A.w-radius-10; obj.y=exit.cy; }
      obj.portalCooldown = 0.35;
      return true;
    }
  }
  return false;
}
function updateUnlockBanners(dt){
  if(!game.unlockBanners) game.unlockBanners=[];
  for(let i=game.unlockBanners.length-1;i>=0;i--){
    game.unlockBanners[i].t -= dt;
    if(game.unlockBanners[i].t<=0) game.unlockBanners.splice(i,1);
  }
}
function drawUnlockBanners(){
  if(!game.unlockBanners || !game.unlockBanners.length) return;
  const s=screenScale();
  ctx.save(); ctx.scale(s,s);
  for(let i=0;i<game.unlockBanners.length;i++){
    const b=game.unlockBanners[i];
    const y = 80 + i*86;
    const slide = Math.min(1, (5.0-b.t)/0.35, b.t/0.35);
    const x = BASE_W - 20 - 320*slide;
    ctx.fillStyle='rgba(15,18,28,0.92)';
    ctx.strokeStyle='rgba(255,209,102,0.9)';
    ctx.lineWidth=2;
    ctx.beginPath(); ctx.roundRect(x, y, 300, 68, 12); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#ffd166'; ctx.font='700 14px Segoe UI'; ctx.fillText(b.title, x+16, y+22);
    ctx.fillStyle='#cfd8dc'; ctx.font='400 11px Segoe UI'; wrapCanvasText(b.how, x+16, y+40, 268, 13);
  }
  ctx.restore();
}
function wrapCanvasText(text, x, y, maxWidth, lineHeight){
  const words = String(text).split(/\s+/);
  let line = '';
  for(const w of words){
    const test = line ? line + ' ' + w : w;
    if(ctx.measureText(test).width > maxWidth && line){
      ctx.fillText(line, x, y);
      y += lineHeight;
      line = w;
    } else line = test;
  }
  if(line) ctx.fillText(line, x, y);
}
function drawEnemyDeathRings(){
  if(!game.enemyDeathRings) return;
  for(const ring of game.enemyDeathRings){
    const prog=ring.r/ring.maxR, alpha=Math.max(0.2,1-prog*0.7);
    ctx.save();
    ctx.shadowColor='#ff6666'; ctx.shadowBlur=28;
    ctx.strokeStyle='rgba(255,120,120,'+alpha+')'; ctx.lineWidth=8;
    ctx.beginPath(); ctx.arc(ring.x,ring.y,ring.r,0,Math.PI*2); ctx.stroke();
    ctx.restore();
  }
}
function updateEnemyDeathRings(dt){
  if(!game.enemyDeathRings) game.enemyDeathRings=[];
  const p=game.player;
  for(let i=game.enemyDeathRings.length-1;i>=0;i--){
    const ring=game.enemyDeathRings[i];
    const prevR=ring.r;
    ring.r += ring.speed*dt;
    if(p && !ring.hitPlayer){
      const d = Math.hypot(p.x-ring.x, p.y-ring.y);
      const pr = playerRadius(p);
      if(d>=prevR-pr && d<=ring.r+pr){
        ring.hitPlayer = true;
        if(game.block.active>0){
          game.block.active=0;
          spawnParticles(p.x,p.y,'#fff',18,180);
        } else {
          damagePlayer(ring.dmg);
        }
      }
    }
    if(ring.r>=ring.maxR) game.enemyDeathRings.splice(i,1);
  }
}

