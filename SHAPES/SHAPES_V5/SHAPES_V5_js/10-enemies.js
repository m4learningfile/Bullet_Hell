// ============================================================
// ENEMIES
// ============================================================
function spawnEnemy(type, opts={}){
  const D=ENEMY_DEFS[type]; if(!D) return;
  // V2: Elite roll when toggle is on (never elite for healthpacks)
  if(type!=='healthpack' && saveData.options.eliteEnemies && !opts.boss && !opts.elite && type!=='skull' && type!=='octagon' && Math.random()<0.18){
    opts=Object.assign({},opts,{elite:true});
  }
  const A=arenaRect();
  let x,y;
  if(opts.x!==undefined&&opts.y!==undefined){ x=opts.x; y=opts.y; }
  else {
    const side=(opts.side!==undefined)?opts.side:Math.floor(Math.random()*4), margin=60;
    if(side===0){x=rand(A.x,A.x+A.w);y=A.y-margin;}
    else if(side===1){x=rand(A.x,A.x+A.w);y=A.y+A.h+margin;}
    else if(side===2){x=A.x-margin;y=rand(A.y,A.y+A.h);}
    else{x=A.x+A.w+margin;y=rand(A.y,A.y+A.h);}
  }
  const bossScale=opts.boss?getBossScale():{hp:1,speed:1};
  const runScale=getEnemyRunScale();
  const bossSizeMul=opts.boss?(type==='trapezoid'?2.0:1.8):1.0; // V2: trapezoid boss = 200% of normal trapezoid size
  const sizeScale=(game.mode==='endless'?1.35:1.0)*bossSizeMul*(opts.elite?1.1:1.0);
  const baseSpeedMult=1.2;
  let bossSpeedMult=opts.boss?(type==='trapezoid'?2.0:(type==='arrow'?0.72:(type==='circle'?2.5:1.6))):1.0;
  const eliteHp=opts.elite?1.6:1, eliteSpeed=opts.elite?1.25:1;
  const e={
    type,x,y,vx:0,vy:0, boss:!!opts.boss, elite:!!opts.elite,
    hp:Math.round(D.hp*runScale.hp*(opts.boss?10:1)*bossScale.hp*eliteHp),
    maxHp:Math.round(D.hp*runScale.hp*(opts.boss?10:1)*bossScale.hp*eliteHp),
    r:D.r*sizeScale,
    speed:D.speed*baseSpeedMult*runScale.speed*bossScale.speed*bossSpeedMult*eliteSpeed,
    hueA:D.color[0], hueB:D.color[1],
    phase:Math.random()*Math.PI*2,
    angle:Math.random()*Math.PI*2,
    state:opts.skipSpawnAnim?'active':'spawn',
    stateT:opts.skipSpawnAnim?(0.4+Math.random()*0.3):1.0,
    dashT:0,dashDx:0,dashDy:0,
    fireT:opts.boss?0.7:1+Math.random()*1.5,
    hitFlash:0, bossCooldown:0, burstShotsLeft:0, dashBurstLeft:0,
    dashWait:0, dashLockX:0, dashLockY:0, chainT:0,
  };

  if(type==='circle'){
    const a=Math.random()*Math.PI*2; e.vx=Math.cos(a)*e.speed; e.vy=Math.sin(a)*e.speed;
  } else if(type==='hexagon'){
    if(opts.boss) e.safeRadius=e.r*6; e.steps=0; e.targetX=x; e.targetY=y;
  } else if(type==='trapezoid'){
    e.state2='idle'; e.chargeT=0; e.cooldownT=opts.boss?(opts.partnerPhase||0):2;
    e.warnDx=0; e.warnDy=0; e.vx=0; e.vy=0;
    if(opts.boss&&opts.sharedBossPool){
      const poolId=opts.sharedBossPool;
      if(!game.sharedBossPools[poolId]){ const tot=Math.round(e.maxHp*1.7); game.sharedBossPools[poolId]={hp:tot,maxHp:tot}; }
      const pool=game.sharedBossPools[poolId];
      Object.defineProperty(e,'hp',{configurable:true,enumerable:true,get(){return pool.hp;},set(v){pool.hp=Math.max(0,v);}});
      Object.defineProperty(e,'maxHp',{configurable:true,enumerable:true,get(){return pool.maxHp;},set(v){pool.maxHp=v;}});
      e.sharedBossPool=poolId; e.sharedBossRole=opts.sharedBossRole||0;
      e.r=Math.max(e.r,A.w*0.143); e.cooldownT=e.sharedBossRole===0?0.6:3.6;
    }
  } else if(type==='skull'){
    const a=Math.random()*Math.PI*2, role=opts.sharedBossRole||0;
    const offsetX=opts.sharedBossPool?(role===0?-220:220):0;
    e.x=A.x+A.w/2+offsetX; e.y=A.y+A.h/2;
    e.state='active'; e.stateT=0; e.vx=Math.cos(a)*e.speed*0.55; e.vy=Math.sin(a)*e.speed*0.55;
    e.fireT=1.2+role*0.7; e.dashWait=2.5+role*1.5; e.state2='idle'; e.chargeT=0;
    e.warnDx=0; e.warnDy=0; e.skullDashLeft=0; e.ringT=10+role*5; e.safeRadius=e.r*6;
    if(opts.sharedBossPool){
      const poolId=opts.sharedBossPool;
      if(!game.sharedBossPools[poolId]){ const tot=Math.round(e.maxHp*1.5); game.sharedBossPools[poolId]={hp:tot,maxHp:tot}; }
      const pool=game.sharedBossPools[poolId];
      Object.defineProperty(e,'hp',{configurable:true,enumerable:true,get(){return pool.hp;},set(v){pool.hp=Math.max(0,v);}});
      Object.defineProperty(e,'maxHp',{configurable:true,enumerable:true,get(){return pool.maxHp;},set(v){pool.maxHp=v;}});
      e.sharedBossPool=poolId; e.sharedBossRole=role;
    }
  } else if(type==='octagon'){
    // V2: Octagon boss spawns directly at center, active, 40% faster initial rotation/fire
    const cx=A.x+A.w/2, cy=A.y+A.h/2;
    e.x=cx; e.y=cy; e.state='active'; e.stateT=0;
    e.state2='active'; e.immuneToHits=false;
    e.fireT=0.9; e.safeRadius=0;
    e.fastStart=true; // used by AI to boost early rotation/fire speed
  } else if(type==='healthpack'){
    // V2: green health pack — stationary, no attacks, +1 HP on death
    e.state='active'; e.stateT=0; e.speed=0; e.vx=0; e.vy=0;
    e.isHealthPack=true;
    // Keep spawn position near but inside the arena (reroll if too close to center)
    e.x=clamp(x,A.x+30,A.x+A.w-30);
    e.y=clamp(y,A.y+30,A.y+A.h-30);
  }

  game.enemies.push(e);
}

function updateEnemies(dt){
  const A=arenaRect(), p=game.player, ts=game.timeScale, ETA=dt*ts;

  // Track boss kills + elite rewards + stats + healthpack heal before filtering
  for(const e of game.enemies){
    if(e.hp<=0&&!e._killTracked){
      e._killTracked=true;
      if(e.type==='healthpack'){
        // V2: kill a health pack → +1 HP (capped at max)
        if(p){ p.hp=Math.min(p.maxHp, p.hp+1); }
        spawnParticles(e.x,e.y,'#2ea84a',24,220);
        Audio.blip(660,0.2,'sine',0.18);
        Audio.blip(880,0.25,'sine',0.14);
      } else if(e.boss){
        const role=e.sharedBossRole||0;
        if(!e.sharedBossPool||role===0){ trackBossKill(e.type); game.stats.bossesKilled++; }
      } else {
        game.stats.enemiesKilled++;
        if(e.elite){ saveData.points += 1; saveSave(); }
      }
    }
  }

  for(const e of game.enemies){
    if(e.hitFlash>0) e.hitFlash-=dt;
    if(e.bossCooldown>0) e.bossCooldown-=dt;
    if(e.knockVx||e.knockVy){
      e.x+=(e.knockVx||0)*ETA; e.y+=(e.knockVy||0)*ETA;
      e.knockVx=(e.knockVx||0)*0.92; e.knockVy=(e.knockVy||0)*0.92;
      if(Math.abs(e.knockVx||0)<8)e.knockVx=0; if(Math.abs(e.knockVy||0)<8)e.knockVy=0;
      e.x=clamp(e.x,A.x+e.r,A.x+A.w-e.r); e.y=clamp(e.y,A.y+e.r,A.y+A.h-e.r);
    }
    if(e.state==='spawn'){ e.stateT-=dt; const cx=A.x+A.w/2,cy=A.y+A.h/2,dx=cx-e.x,dy=cy-e.y,m=Math.hypot(dx,dy)||1; e.x+=(dx/m)*120*dt; e.y+=(dy/m)*120*dt; if(e.stateT<=0)e.state='active'; continue; }
    e.phase+=dt*2;
    if(e.type==='healthpack'){ continue; } // V2: stationary, no AI

    switch(e.type){
      case 'circle':{
        e.x+=e.vx*ETA; e.y+=e.vy*ETA;
        if(e.x<A.x+e.r){e.x=A.x+e.r;e.vx=Math.abs(e.vx);}
        if(e.x>A.x+A.w-e.r){e.x=A.x+A.w-e.r;e.vx=-Math.abs(e.vx);}
        if(e.y<A.y+e.r){e.y=A.y+e.r;e.vy=Math.abs(e.vy);}
        if(e.y>A.y+A.h-e.r){e.y=A.y+A.h-e.r;e.vy=-Math.abs(e.vy);}
        for(const o of game.enemies){ if(o===e||o.state!=='active')continue; const dx=e.x-o.x,dy=e.y-o.y,d2=dx*dx+dy*dy,rr=e.r+o.r; if(d2>0&&d2<rr*rr){const d=Math.sqrt(d2),nx=dx/d,ny=dy/d,dot=e.vx*nx+e.vy*ny;e.vx-=2*dot*nx;e.vy-=2*dot*ny;const ov=rr-d;e.x+=nx*ov*0.5;e.y+=ny*ov*0.5;} }
        break;
      }
      case 'triangle':{
        e.angle+=dt*2*ts;
        if(e.dashT>0){
          e.dashT-=ETA; const rot=3*ETA*(e.dashSpin||1),cs=Math.cos(rot),sn=Math.sin(rot),nx=e.dashDx*cs-e.dashDy*sn,ny=e.dashDx*sn+e.dashDy*cs; e.dashDx=nx;e.dashDy=ny; e.x+=e.dashDx*ETA;e.y+=e.dashDy*ETA;
          if(e.dashT<=0){
            if((e.boss||e.elite)&&e.dashBurstLeft>0){ e.dashBurstLeft--;const dx2=p.x-e.x,dy2=p.y-e.y,d2=Math.hypot(dx2,dy2)||1;e.dashDx=(dx2/d2)*e.speed*3.5;e.dashDy=(dy2/d2)*e.speed*3.5;e.dashT=0.42;e.dashSpin=Math.random()<0.5?1:-1; }
            else{e.state='active';e.stateT=(e.boss||e.elite)?1.6+Math.random()*0.4:1.2+Math.random()*0.8;}
          }
        } else {
          e.stateT=(e.stateT||0)-ETA; const dx=p.x-e.x,dy=p.y-e.y,d=Math.hypot(dx,dy)||1; e.x+=(dx/d)*40*ETA;e.y+=(dy/d)*40*ETA;
          if(e.stateT<=0){ e.dashDx=(dx/d)*e.speed*3.5;e.dashDy=(dy/d)*e.speed*3.5;e.dashT=e.boss?0.42:0.4;e.dashSpin=Math.random()<0.5?1:-1; if(e.boss)e.dashBurstLeft=2; else if(e.elite)e.dashBurstLeft=1; else e.stateT=1.2+Math.random()*0.8; }
        }
        e.x=clamp(e.x,A.x+e.r,A.x+A.w-e.r); e.y=clamp(e.y,A.y+e.r,A.y+A.h-e.r);
        break;
      }
      case 'arrow':{
        const dx=p.x-e.x,dy=p.y-e.y,d=Math.hypot(dx,dy)||1; e.angle=Math.atan2(dy,dx); e.x+=(dx/d)*e.speed*ETA;e.y+=(dy/d)*e.speed*ETA;
        e.x=clamp(e.x,A.x+e.r,A.x+A.w-e.r);e.y=clamp(e.y,A.y+e.r,A.y+A.h-e.r);
        break;
      }
      case 'hexagon':{
        if(e.stepT===undefined)e.stepT=0; e.stepT-=ETA;
        if(e.stepT<=0){ const steps=[0,60,120,180,240,300],a=steps[Math.floor(Math.random()*6)]*Math.PI/180,len=e.boss?220:140; e.targetX=clamp(e.x+Math.cos(a)*len,A.x+e.r,A.x+A.w-e.r);e.targetY=clamp(e.y+Math.sin(a)*len,A.y+e.r,A.y+A.h-e.r);e.stepT=e.boss?0.55:1.2; }
        const dx=e.targetX-e.x,dy=e.targetY-e.y,d=Math.hypot(dx,dy); if(d>2){e.x+=(dx/d)*e.speed*ETA;e.y+=(dy/d)*e.speed*ETA;}
        e.angle+=ETA*(e.boss?2.6:1.5);
        { const knock=e.boss?24:10,velPush=e.boss?1.0:0.45; for(const o of game.enemies){ if(o===e||o.state!=='active')continue; const ddx=o.x-e.x,ddy=o.y-e.y,rr=e.r+o.r,d2=ddx*ddx+ddy*ddy; if(d2>0&&d2<rr*rr){const dd=Math.sqrt(d2),nx=ddx/dd,ny=ddy/dd;o.x+=nx*knock;o.y+=ny*knock;if(typeof o.vx==='number'){o.vx+=nx*o.speed*velPush;o.vy+=ny*o.speed*velPush;}} } }
        break;
      }
      case 'trapezoid':{
        const dx=p.x-e.x,dy=p.y-e.y,d=Math.hypot(dx,dy)||1;
        if(!e.state2){e.state2='idle';e.cooldownT=e.boss?(e.partnerPhase||0):2;e.warnDx=dx/d;e.warnDy=dy/d;e.vx=0;e.vy=0;e.bounceLeft=e.boss?2:0;}
        if(e.state2==='idle'){ e.cooldownT-=ETA; if(e.cooldownT<=0){e.state2='charge';e.chargeT=1.0;e.warnDx=dx/d;e.warnDy=dy/d;if(e.boss)e.bounceLeft=2;} }
        else if(e.state2==='charge'){ e.chargeT-=ETA; if(e.chargeT<=0){const spd=e.boss?1550:1240;e.vx=e.warnDx*spd;e.vy=e.warnDy*spd;e.state2='dash';} }
        else if(e.state2==='dash'){
          e.x+=e.vx*ETA;e.y+=e.vy*ETA;
          // V2: Trapezoid boss passes through allies without pushing them (bumps wall 2x instead)
          let hitX=e.x<=A.x+e.r||e.x>=A.x+A.w-e.r, hitY=e.y<=A.y+e.r||e.y>=A.y+A.h-e.r;
          if(hitX||hitY){ e.x=clamp(e.x,A.x+e.r,A.x+A.w-e.r);e.y=clamp(e.y,A.y+e.r,A.y+A.h-e.r); if(e.boss&&e.bounceLeft>0){if(hitX)e.vx*=-1;if(hitY)e.vy*=-1;e.bounceLeft--;}else{e.vx=0;e.vy=0;e.warnDx=0;e.warnDy=0;e.state2='idle';e.cooldownT=3.0;} }
        }
        break;
      }
      case 'skull':{
        const sdx=p.x-e.x,sdy=p.y-e.y,sd=Math.hypot(sdx,sdy)||1;
        e.x+=e.vx*ETA;e.y+=e.vy*ETA;
        if(e.x<A.x+e.r||e.x>A.x+A.w-e.r){e.vx*=-1;e.x=clamp(e.x,A.x+e.r,A.x+A.w-e.r);}
        if(e.y<A.y+e.r||e.y>A.y+A.h-e.r){e.vy*=-1;e.y=clamp(e.y,A.y+e.r,A.y+A.h-e.r);}
        e.angle+=ETA*1.6; e.x+=(sdx/sd)*e.speed*0.42*ETA; e.y+=(sdy/sd)*e.speed*0.42*ETA;
        e.ringT-=ETA;
        if(e.ringT<=0){ e.ringT=10; game.skullFlash=0.8; if(game.block.active<=0){damagePlayer(1);}else{game.block.active=0;spawnParticles(p.x,p.y,'#fff',20,220);} Audio.noise(0.4,0.35);Audio.blip(80,0.35,'sawtooth',0.26); }
        e.fireT-=ETA;
        if(e.fireT<=0){ e.fireT=1.1; for(let burst=0;burst<2;burst++){for(let i=0;i<8;i++){const ang=e.angle+i*(Math.PI/4)+burst*0.09; game.enemyBullets.push({x:e.x+Math.cos(ang)*e.r*0.9,y:e.y+Math.sin(ang)*e.r*0.9,vx:Math.cos(ang)*(ENEMY_BULLET_SPEED+80),vy:Math.sin(ang)*(ENEMY_BULLET_SPEED+80),r:7,life:4.5,hue:0});}} }
        if(!e.state2){e.state2='idle';e.dashWait=2.2;}
        if(e.state2==='idle'){e.dashWait-=ETA;if(e.dashWait<=0){e.warnDx=sdx/sd;e.warnDy=sdy/sd;e.chargeT=0.7;e.state2='charge';e.skullDashLeft=1;}}
        else if(e.state2==='charge'){e.chargeT-=ETA;if(e.chargeT<=0){e.dashDx=e.warnDx*e.speed*4.2;e.dashDy=e.warnDy*e.speed*4.2;e.dashT=0.24;e.state2='dash';}}
        else if(e.state2==='dash'){
          e.x+=e.dashDx*ETA;e.y+=e.dashDy*ETA;
          if(e.x<A.x+e.r||e.x>A.x+A.w-e.r)e.dashDx*=-1;
          if(e.y<A.y+e.r||e.y>A.y+A.h-e.r)e.dashDy*=-1;
          e.dashT-=ETA;
          if(e.dashT<=0){if(e.skullDashLeft>0){e.skullDashLeft--;e.warnDx=sdx/sd;e.warnDy=sdy/sd;e.chargeT=0.35;e.state2='charge';}else{e.state2='idle';e.dashWait=2.4;}}
        }
        for(const o of game.enemies){ if(o===e||o.state==='spawn')continue; const dx2=o.x-e.x,dy2=o.y-e.y,rr=e.r+o.r,d2=dx2*dx2+dy2*dy2; if(d2>0&&d2<rr*rr){const dd=Math.sqrt(d2),nx=dx2/dd,ny=dy2/dd;o.x+=nx*14;o.y+=ny*14;if(!o.boss){o.knockVx=(o.knockVx||0)+nx*110;o.knockVy=(o.knockVy||0)+ny*110;}} }
        break;
      }
      case 'diamond':{
        if(e.driftVx===undefined){const a=Math.random()*Math.PI*2;e.driftVx=Math.cos(a)*e.speed;e.driftVy=Math.sin(a)*e.speed;}
        e.x+=e.driftVx*ETA;e.y+=e.driftVy*ETA;
        if(e.x<A.x+e.r||e.x>A.x+A.w-e.r){e.driftVx*=-1;e.x=clamp(e.x,A.x+e.r,A.x+A.w-e.r);}
        if(e.y<A.y+e.r||e.y>A.y+A.h-e.r){e.driftVy*=-1;e.y=clamp(e.y,A.y+e.r,A.y+A.h-e.r);}
        e.angle+=ETA*(e.boss?2.6:1.0);
        e.fireT-=ETA;
        if(e.fireT<=0){ e.fireT=e.boss?0.7:2.2; const bc=e.boss?2:1; for(let burst=0;burst<bc;burst++){for(let i=0;i<4;i++){const ang=e.angle+i*Math.PI/2+burst*0.08; game.enemyBullets.push({x:e.x+Math.cos(ang)*e.r,y:e.y+Math.sin(ang)*e.r,vx:Math.cos(ang)*ENEMY_BULLET_SPEED,vy:Math.sin(ang)*ENEMY_BULLET_SPEED,r:6,life:4,hue:e.hueA});}} Audio.blip(500,0.08,'triangle',0.1); }
        break;
      }
      case 'octagon':{
        const cx=A.x+A.w/2, cy=A.y+A.h/2;
        if(e.state2==='moving_to_center'){
          const dx=cx-e.x,dy=cy-e.y,d=Math.hypot(dx,dy);
          if(d<6){ e.x=cx;e.y=cy;e.state2='active';e.immuneToHits=false; spawnParticles(cx,cy,hsl(260,90,70),20,250); Audio.blip(440,0.2,'sawtooth',0.18); }
          else{ e.x+=(dx/d)*e.speed*1.5*ETA;e.y+=(dy/d)*e.speed*1.5*ETA; }
        } else {
          const hpFrac=e.hp/Math.max(1,e.maxHp);
          // V2: 40% faster baseline on top of the existing HP-based scaling
          const speedMult=(hpFrac>0.5?1.0:hpFrac>0.25?1.4:2.0)*1.4;
          e.angle+=ETA*0.8*speedMult;
          e.fireT-=ETA;
          if(e.fireT<=0){ e.fireT=1.5/speedMult; for(let i=0;i<8;i++){const ang=e.angle+i*(Math.PI/4); game.enemyBullets.push({x:e.x+Math.cos(ang)*e.r,y:e.y+Math.sin(ang)*e.r,vx:Math.cos(ang)*(ENEMY_BULLET_SPEED*0.8),vy:Math.sin(ang)*(ENEMY_BULLET_SPEED*0.8),r:6,life:4.5,hue:260});} Audio.blip(520+Math.random()*60,0.06,'square',0.08); }
        }
        break;
      }
    }
  }

  // Hexagon death splits
  for(const e of game.enemies){ if(e.hp<=0&&e.type==='hexagon'&&!e._didSplit){ e._didSplit=true; const elite=!!e.boss; for(let i=0;i<6;i++){const ang=(i/6)*Math.PI*2,off=e.r*0.55;spawnEnemy('triangle',{x:e.x+Math.cos(ang)*off,y:e.y+Math.sin(ang)*off,elite,skipSpawnAnim:true});} spawnParticles(e.x,e.y,hsl(e.hueA,80,70),24,240); } }

  game.enemies=game.enemies.filter(e=>e.hp>0);
}

// ============================================================
