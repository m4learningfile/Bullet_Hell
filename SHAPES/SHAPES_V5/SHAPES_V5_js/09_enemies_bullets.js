// ============================================================
// ENEMIES
// ============================================================
function spawnEnemy(type, opts={}){
  const D=ENEMY_DEFS[type]; if(!D) return;
    // V5: elites are always on in point-budget waves and cost more when selected there.
  if(type!=='healthpack' && !opts.boss && !opts.elite && type!=='skull' && type!=='octagon' && type!=='kiteenemy' && Math.random()<0.18){
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
  const bossSizeMul=opts.boss?(type==='trapezoid'?2.0:1.8):1.0;
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

  if(opts.fixedStats){ e.hp=D.hp; e.maxHp=D.hp; e.speed=D.speed; e.r=D.r; e.elite=false; }
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
        // V5: kill a health pack → +10 HP (capped at max)
        if(p){ p.hp=Math.min(p.maxHp, p.hp+10); }
        spawnParticles(e.x,e.y,'#2ea84a',24,220);
        Audio.blip(660,0.2,'sine',0.18);
        Audio.blip(880,0.25,'sine',0.14);
      } else if(e.type==='kiteenemy'){
        game.stats.enemiesKilled++;
        completeClassUnlock('kite', 'KITE UNLOCKED', 'Kill the Wandering Kite enemy. COMPLETED');
      } else if(e.boss){
        if(e.type==='skull' && !e._spawnedDeathWave){
          e._spawnedDeathWave=true;
          if(!game.enemyDeathRings) game.enemyDeathRings=[];
          game.enemyDeathRings.push({x:e.x,y:e.y,r:10,maxR:Math.max(BASE_W,BASE_H),speed:900,dmg:5,hitPlayer:false});
        }
        const role=e.sharedBossRole||0;
        if(!e.sharedBossPool || e.type==='skull'){ trackBossKill(e.type); game.stats.bossesKilled++; }
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
        if(!e.state2){e.state2='idle';e.cooldownT=e.boss?(e.partnerPhase||0):2;e.warnDx=dx/d;e.warnDy=dy/d;e.vx=0;e.vy=0;e.bounceLeft=e.boss?2:0;e.wallHits=0;}
        if(e.state2==='idle'){ e.cooldownT-=ETA; if(e.cooldownT<=0){e.state2='charge';e.chargeT=1.0;e.warnDx=dx/d;e.warnDy=dy/d;if(e.boss){e.bounceLeft=2;e.wallHits=0;}} }
        else if(e.state2==='charge'){ e.chargeT-=ETA; if(e.chargeT<=0){const spd=e.boss?1550:1240;e.vx=e.warnDx*spd;e.vy=e.warnDy*spd;e.state2='dash';} }
        else if(e.state2==='dash'){
          e.x+=e.vx*ETA;e.y+=e.vy*ETA;
          let hitX=e.x<=A.x+e.r||e.x>=A.x+A.w-e.r, hitY=e.y<=A.y+e.r||e.y>=A.y+A.h-e.r;
          if(hitX||hitY){
            e.x=clamp(e.x,A.x+e.r,A.x+A.w-e.r);e.y=clamp(e.y,A.y+e.r,A.y+A.h-e.r);
            if(e.boss){
              e.wallHits=(e.wallHits||0)+1;
              if(e.wallHits<3){
                if(hitX)e.vx*=-1;
                if(hitY)e.vy*=-1;
              } else {
                e.vx=0;e.vy=0;e.warnDx=0;e.warnDy=0;e.state2='idle';e.cooldownT=2.2;
              }
            } else {
              e.vx=0;e.vy=0;e.warnDx=0;e.warnDy=0;e.state2='idle';e.cooldownT=3.0;
            }
          }
        }
        break;
      }
      case 'kiteenemy':{
        e.lifeT -= ETA;
        e.tailSample -= ETA;
        e.angle = Math.atan2(e.vy, e.vx);
        e.x += e.vx*ETA; e.y += e.vy*ETA;
        if(e.x<=A.x+e.r||e.x>=A.x+A.w-e.r) e.vx*=-1;
        if(e.y<=A.y+e.r||e.y>=A.y+A.h-e.r) e.vy*=-1;
        e.x=clamp(e.x,A.x+e.r,A.x+A.w-e.r); e.y=clamp(e.y,A.y+e.r,A.y+A.h-e.r);
        if(e.tailSample<=0){
          e.tailSample=0.05;
          e.tail.unshift({x:e.x,y:e.y});
        }
        e.tailLen = Math.max(0, e.tailLen - ETA*14.5);
        while(e.tail.length>Math.max(2, Math.floor(e.tailLen/8))) e.tail.pop();
        if(e.lifeT<=0 || e.tailLen<=0){ e.hp=0; }
        break;
      }
      case 'skull':{
        if(!e.state2){
          e.state2='turret';
          e.x = A.x + A.w*(e.sharedBossRole===0?0.37:0.63);
          e.y = A.y + A.h*0.5;
          e.spinDir = (e.sharedBossRole===0?1:-1);
          e.fireT = e.sharedBossRole===0?0.5:0.75;
          e.safeRadius = 0;
        }
        e.angle += ETA * 0.8 * e.spinDir;
        e.fireT -= ETA;
        if(e.fireT<=0){
          e.fireT = 0.9;
          const base = e.angle;
          for(let i=0;i<8;i++){
            const a = base + i*Math.PI/4;
            game.enemyBullets.push({x:e.x+Math.cos(a)*e.r*0.8,y:e.y+Math.sin(a)*e.r*0.8,vx:Math.cos(a)*ENEMY_BULLET_SPEED,vy:Math.sin(a)*ENEMY_BULLET_SPEED,r:5,life:5});
          }
          Audio.blip(140,0.08,'square',0.08);
        }
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
    if(e.hp>0 && e.state==='active' && e.type!=='healthpack'){
      if(tryEntityPortalWarp(e, e.r, true)){
        spawnParticles(e.x,e.y,hsl(e.hueA||190,90,70),6,90);
      }
    }
  }

  // Hexagon death splits
  for(const e of game.enemies){ if(e.hp<=0&&e.type==='hexagon'&&!e._didSplit){ e._didSplit=true; const elite=!!e.boss; for(let i=0;i<6;i++){const ang=(i/6)*Math.PI*2,off=e.r*0.55;spawnEnemy('triangle',{x:e.x+Math.cos(ang)*off,y:e.y+Math.sin(ang)*off,elite,skipSpawnAnim:true});} spawnParticles(e.x,e.y,hsl(e.hueA,80,70),24,240); } }

  game.enemies=game.enemies.filter(e=>e.hp>0);
}

// ============================================================
// BULLETS + COLLISIONS
// ============================================================
function updateBullets(dt){
  const A=arenaRect(), ts=game.timeScale, ETA=dt*ts;
  const pierceOn=!!game.upgrades.pierce;

  for(const b of game.playerBullets){
    // V2: Crescent boomerang — travels outward to maxTravel, then returns to the player
    if(b.crescent){
      const p=game.player;
      if(!b.returning){
        b.x+=b.vx*dt; b.y+=b.vy*dt;
        b.travelled+=Math.hypot(b.vx,b.vy)*dt;
        if(b.travelled>=b.maxTravel){ b.returning=true; b.pierced=new WeakSet(); }
      } else if(p){
        const dx=p.x-b.x, dy=p.y-b.y, m=Math.hypot(dx,dy)||1;
        b.vx=(dx/m)*b.crescentSpd; b.vy=(dy/m)*b.crescentSpd;
        b.x+=b.vx*dt; b.y+=b.vy*dt;
        if(m<playerRadius(p)+8) b.life=0; // caught
      } else { b.life=0; }
      b.life-=dt;
    } else {
      b.x+=b.vx*dt; b.y+=b.vy*dt; b.life-=dt;
    }
    if(!b.bigBall&&!b.ringShot&&!b.crescent&&b.bouncesLeft>0){
      let bounced=false;
      if(b.x<A.x){b.x=A.x;b.vx=Math.abs(b.vx);bounced=true;}
      else if(b.x>A.x+A.w){b.x=A.x+A.w;b.vx=-Math.abs(b.vx);bounced=true;}
      if(b.y<A.y){b.y=A.y;b.vy=Math.abs(b.vy);bounced=true;}
      else if(b.y>A.y+A.h){b.y=A.y+A.h;b.vy=-Math.abs(b.vy);bounced=true;}
      if(bounced) b.bouncesLeft--;
    } else if(!b.crescent) {
      const om=b.bigBall?(b.r||20):(b.ringShot?100:0);
      if(b.x<A.x-om||b.x>A.x+A.w+om||b.y<A.y-om||b.y>A.y+A.h+om) b.life=0;
    }
    const piercingShot=b.bigBall||b.ringShot||b.crescent||pierceOn;
    for(const e of game.enemies){
      if(e.hp<=0||e.state==='spawn') continue;
      if(e.immuneToHits) continue;
      if(e.safeRadius){ const pl=game.player; if(pl&&dist2(pl.x,pl.y,e.x,e.y)>e.safeRadius*e.safeRadius) continue; }
      const hitR=b.bigBall?(e.r+(b.r||20)):b.ringShot?(e.r+8):b.crescent?(e.r+7):(e.r+4);
      if(dist2(b.x,b.y,e.x,e.y)<hitR*hitR){
        if(piercingShot){
          if(!b.pierced) b.pierced=new WeakSet();
          if(b.pierced.has(e)) continue;
          b.pierced.add(e);
          const dmg=b.bigBall?(b.dmg||(PLAYER_BULLET_DMG+game.upgrades.damage)):b.ringShot?(b.dmg||10):b.crescent?(b.dmg||2):(PLAYER_BULLET_DMG+game.upgrades.damage);
          e.hp-=dmg; e.hitFlash=b.bigBall?0.14:0.1;
          if(b.bigBall||b.ringShot||b.crescent) game.stats.skillDamage+=dmg; else game.stats.bulletDamage+=dmg;
          spawnParticles(e.x,e.y,b.bigBall?'#99e6ff':b.crescent?'#bcb0ff':hsl(e.hueA,80,70),b.bigBall?8:4,b.bigBall?140:120);
        } else {
          const dmg2=PLAYER_BULLET_DMG+game.upgrades.damage;
          e.hp-=dmg2; e.hitFlash=0.1; b.life=0;
          game.stats.bulletDamage+=dmg2;
          spawnParticles(b.x,b.y,hsl(e.hueA,80,70),4,120);
        }
        if(e.hp<=0){ spawnParticles(e.x,e.y,hsl(e.hueA,80,70),20,220); Audio.blip(200+Math.random()*80,0.18,'square',0.14); Audio.noise(0.15,0.12); }
        else Audio.blip(800+Math.random()*200,0.03,'square',0.05);
        if(!piercingShot) break;
      }
    }
  }
  game.playerBullets=game.playerBullets.filter(b=>b.life>0);

  for(const b of game.enemyBullets){
    b.x+=b.vx*ETA; b.y+=b.vy*ETA; b.life-=dt;
    if(b.x<A.x||b.x>A.x+A.w||b.y<A.y||b.y>A.y+A.h) b.life=0;
    const p=game.player;
    if(p){ const rr=b.r+playerRadius(p); if(dist2(b.x,b.y,p.x,p.y)<rr*rr){ damagePlayer(getIncomingEnemyDamage()); spawnParticles(b.x,b.y,'#fff',8,180); b.life=0; } }
  }
  game.enemyBullets=game.enemyBullets.filter(b=>b.life>0);

  // Enemy-player body collision
  const p=game.player;
  if(p){
    for(const e of game.enemies){
      if(e.state==='spawn') continue;
      if(e.auraTimer>0) e.auraTimer-=dt;
      const rr=e.r+playerRadius(p)-2;
      if(dist2(p.x,p.y,e.x,e.y)<rr*rr){
        const C=CLASSES[p.cls];
        const greenActive=(p.cls==='green'||game.upgrades.borrowedAbility==='green')&&p.dashT>0;
        if(greenActive){
          if(p.dashHits&&!p.dashHits.has(e)){ const gd=CLASSES.green.dashDmg+currentSkillDamageBonus('green'); e.hp-=gd; game.stats.skillDamage+=gd; e.hitFlash=0.15; p.dashHits.add(e); spawnParticles(e.x,e.y,'#aaffaa',12,260); if(e.hp<=0){spawnParticles(e.x,e.y,hsl(e.hueA,80,70),20,220);Audio.noise(0.15,0.12);} }
          continue;
        }
        const borrowedRedActive=(p.cls!=='red'&&game.upgrades.borrowedAbility==='red'&&p.dashT>0);
        if(borrowedRedActive){
          if(p.dashHits&&!p.dashHits.has(e)){
            e.hp-=(1+game.upgrades.skillDamage); e.hitFlash=0.15; p.dashHits.add(e);
            spawnParticles(e.x,e.y,'#ff9999',10,200);
            if(e.hp<=0){spawnParticles(e.x,e.y,hsl(e.hueA,80,70),20,220);Audio.noise(0.15,0.12);}
          }
          continue;
        }
        // Red: front face = melee damage (1 + 3× bullet damage, 0.5s per-target cooldown); back = normal damage
        if(p.cls==='red'){
          const dx=e.x-p.x,dy=e.y-p.y;
          const angleToEnemy=Math.atan2(dy,dx);
          const angleDiff=Math.abs(((angleToEnemy-p.angle)+Math.PI*3)%(Math.PI*2)-Math.PI);
          if(angleDiff<1.4){ // within ~80 degrees front
            if(!p.meleeHits) p.meleeHits=new Map();
            const cd=p.meleeHits.get(e)||0;
            if(cd<=0){
              const dmg=1+game.upgrades.damage*5;
              e.hp-=dmg; e.hitFlash=0.15;
              p.meleeHits.set(e,0.5);
              spawnParticles(e.x,e.y,'#ff9999',8,180);
              if(e.hp<=0){ spawnParticles(e.x,e.y,hsl(e.hueA,80,70),20,220); Audio.blip(200+Math.random()*80,0.18,'square',0.14); }
              else Audio.blip(500+Math.random()*150,0.05,'square',0.08);
            }
          } else {
            damagePlayer(getIncomingEnemyDamage());
            const dx2=e.x-p.x,dy2=e.y-p.y,d2=Math.hypot(dx2,dy2)||1;
            p.knockVx=-(dx2/d2)*280; p.knockVy=-(dy2/d2)*280;
            e.x+=(dx2/d2)*10;e.y+=(dy2/d2)*10;
          }
          break;
        }
        if(p.cls==='white'&&game.ability.active>0){
          if((e.auraTimer||0)<=0){ const td=C.touchDmg+currentSkillDamageBonus('white'); e.hp-=td; game.stats.skillDamage+=td; e.hitFlash=0.12; e.auraTimer=C.touchTick; const hue=(performance.now()*0.5)%360; spawnParticles(e.x,e.y,hsl(hue,90,70),8,200); if(e.hp<=0){spawnParticles(e.x,e.y,hsl(e.hueA,80,70),20,220);Audio.noise(0.15,0.12);} }
          continue;
        }
        if(e.type==='trapezoid'&&e.boss&&e.state2==='dash'){
          damagePlayer(getIncomingEnemyDamage());
          break;
        }
        damagePlayer(getIncomingEnemyDamage());
        const dx=e.x-p.x,dy=e.y-p.y,d=Math.hypot(dx,dy)||1;
        p.knockVx=-(dx/d)*280; p.knockVy=-(dy/d)*280;
        e.x+=(dx/d)*10; e.y+=(dy/d)*10;
        break;
      }
    }
    // Reset red melee set each frame (allow re-hit after cooldown handles it via setTimeout above)
    if(p.cls==='red'&&p.dashT<=0) p.dashHits=null;
  }
}

// ============================================================
// PARTICLES
// ============================================================
function spawnParticles(x,y,color,count,speed){
  for(let i=0;i<count;i++){ const a=Math.random()*Math.PI*2,s=speed*(0.3+Math.random()*0.9); game.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:0.5+Math.random()*0.5,max:1,color}); }
}
function updateParticles(dt){
  for(const p of game.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=0.94;p.vy*=0.94;p.life-=dt;}
  game.particles=game.particles.filter(p=>p.life>0);
}

