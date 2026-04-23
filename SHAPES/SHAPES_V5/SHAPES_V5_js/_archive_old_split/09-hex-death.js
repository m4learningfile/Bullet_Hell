// ============================================================
// HEX TRIANGLE AI
// ============================================================
function updateHexTriangles(dt){
  const p=game.player;
  if(!p||(p.cls!=='yellow'&&game.upgrades.borrowedAbility!=='yellow')){ game.hexTriangles=[]; return; }
  const A=arenaRect();
  const boonBoost=1+game.upgrades.moveSpeed*0.10/(1+game.upgrades.moveSpeed*0.04);
  const preBoost=1+game.preRunBonus.moveSpeed;
  const triSpeed=PLAYER_SPEED*1.25*boonBoost*preBoost;

  // V2: Triangles no longer dash. They follow cursor while shooting; otherwise drift toward player/enemies.
  //     Contact with enemies deals skill-damage-scaling damage on a 0.5s per-target cooldown.
  const firingHeld = mouse.down || mouse.toggleFire;
  for(let i=game.hexTriangles.length-1;i>=0;i--){
    const t=game.hexTriangles[i];
    if(t.hp<=0){ spawnParticles(t.x,t.y,'#ff69b4',12,180); game.hexTriangles.splice(i,1); continue; }
    t.angle+=dt*3;
    // Tick per-enemy contact cooldowns
    if(t.hitCD){ for(const [e,cd] of t.hitCD){ const nx=cd-dt; if(nx<=0||e.hp<=0) t.hitCD.delete(e); else t.hitCD.set(e,nx); } }

    // Movement target
    let tx, ty;
    if(firingHeld){ tx=game.aimX; ty=game.aimY; }
    else {
      // Seek nearest enemy (excluding health packs), or loiter near the player
      let nearest=null, nD2=Infinity;
      for(const e of game.enemies){ if(e.state==='spawn'||e.hp<=0||e.type==='healthpack') continue; const d2=dist2(t.x,t.y,e.x,e.y); if(d2<nD2){nD2=d2;nearest=e;} }
      if(nearest){ tx=nearest.x; ty=nearest.y; }
      else { tx=p.x; ty=p.y; }
    }
    const dx=tx-t.x, dy=ty-t.y, d=Math.hypot(dx,dy)||1;
    if(d>10){ t.x+=(dx/d)*triSpeed*dt; t.y+=(dy/d)*triSpeed*dt; }

    // Contact damage
    for(const e of game.enemies){
      if(e.hp<=0||e.state==='spawn'||e.type==='healthpack') continue;
      if(dist2(t.x,t.y,e.x,e.y)<(e.r+12)**2){
        if(!t.hitCD) t.hitCD=new Map();
        if((t.hitCD.get(e)||0)>0) continue;
        const td=2+game.upgrades.skillDamage;
        e.hp-=td; e.hitFlash=0.12; game.stats.skillDamage+=td;
        t.hitCD.set(e, 0.5);
        t.hp-=1;
        spawnParticles(t.x,t.y,'#ffdd00',4,120);
        spawnParticles(e.x,e.y,'#ffdd00',6,160);
        if(e.hp<=0){ spawnParticles(e.x,e.y,hsl(e.hueA,80,70),16,200); Audio.blip(300+Math.random()*80,0.12,'square',0.08); }
      }
    }
    t.x=clamp(t.x,A.x+10,A.x+A.w-10);
    t.y=clamp(t.y,A.y+10,A.y+A.h-10);
  }
}

function updateDeathRings(dt){
  for(let i=game.deathRings.length-1;i>=0;i--){
    const ring=game.deathRings[i];
    const prevR=ring.r;
    ring.r+=ring.speed*dt;
    for(const e of game.enemies){
      if(e.hp<=0||e.state==='spawn'||e.immuneToHits) continue;
      if(ring.hits.has(e)) continue;
      const d=Math.hypot(e.x-ring.x, e.y-ring.y);
      if(d>=prevR-e.r && d<=ring.r+e.r){
        ring.hits.add(e);
        e.hp-=ring.dmg; e.hitFlash=0.15; game.stats.skillDamage+=ring.dmg;
        spawnParticles(e.x,e.y,'#ddd',10,200);
        if(e.hp<=0){ spawnParticles(e.x,e.y,hsl(e.hueA,80,70),20,220); Audio.noise(0.15,0.12); Audio.blip(200+Math.random()*80,0.18,'square',0.14); }
        else Audio.blip(600+Math.random()*200,0.04,'sawtooth',0.08);
      }
    }
    if(ring.r>=ring.maxR) game.deathRings.splice(i,1);
  }
}

