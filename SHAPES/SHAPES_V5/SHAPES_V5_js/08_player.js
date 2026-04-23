// ============================================================
// PLAYER
// ============================================================
function makePlayer(cls){
  const C=CLASSES[cls];
  return{ x:BASE_W/2, y:BASE_H/2, vx:0, vy:0,
    cls, color:C.color,
    radius: cls==='red' ? ENEMY_DEFS.trapezoid.r : PLAYER_RADIUS,
    hp:C.hp, maxHp:C.hp,
    iframes:0, fireCd:0,
    dashVx:0, dashVy:0, dashT:0,
    octaFireCd:0, angle:0,
    knockVx:0, knockVy:0, edgeHitCd:0,
    meleeHits:new Map(),
    // V2 new classes
    trail:[],                  // kite: array of {x,y} points
    trailSampleDt:0,           // kite: time since last sample
    trailHits:new Map(),       // kite: enemy -> remaining 0.6s tick cooldown
    crescentActive:0,          // crescent: remaining duration seconds (0 = inactive)
  };
}

function updatePlayer(dt){
  const p=game.player; if(!p) return;
  const A=arenaRect();

  // Ability timers
  if(p.cls==='green'){
    if(game.ability.charges<game.ability.maxCharges){
      game.ability.t-=dt;
      if(game.ability.t<=0){ game.ability.charges=Math.min(game.ability.maxCharges,game.ability.charges+1); if(game.ability.charges<game.ability.maxCharges) game.ability.t=CLASSES.green.cooldown; }
    }
  } else if(p.cls==='pink'){
    if(game.ability.t>0) game.ability.t-=dt;
  } else if(p.cls==='red'){
    if(game.ability.t>0) game.ability.t-=dt;
    // wind-up countdown
    if(game.trapWindUp>0){ game.trapWindUp-=dt; if(game.trapWindUp<=0) executeTrapdash(); }
  } else {
    if(game.ability.t>0) game.ability.t-=dt;
  }
  if(game.ability.active>0) game.ability.active-=dt;

  // Yellow auto-summon
  if(p.cls==='yellow'){
    const maxTri=CLASSES.yellow.baseMaxTri+game.upgrades.shots;
    if(game.ability.t<=0&&game.hexTriangles.length<maxTri){ summonHexTriangle(); }
  }
  // Borrowed yellow auto-summon (weakened cap)
  if(p.cls!=='yellow'&&game.upgrades.borrowedAbility==='yellow'){
    const maxTri=Math.min(6, 2+game.upgrades.shots);
    if(game.borrowed.t<=0&&game.hexTriangles.length<maxTri){ summonHexTriangle(); }
  }

  // V2: Kite ghost trail
  if(p.cls==='kite'){
    p.trailSampleDt+=dt;
    if(p.trailSampleDt>=0.03){
      p.trailSampleDt=0;
      const last=p.trail[p.trail.length-1];
      if(!last || dist2(last.x,last.y,p.x,p.y)>16){ p.trail.push({x:p.x,y:p.y}); }
    }
    // Trail length scales with Skill Cooldown boon (repurposed) + pre-run bonus
    const base=CLASSES.kite.baseTrailLen;
    const extra=game.upgrades.skillCooldown*80 + game.preRunBonus.skillCooldown*400;
    const maxPoints=Math.max(8, Math.floor((base+extra)/12));
    while(p.trail.length>maxPoints) p.trail.shift();
    // Tick per-enemy hit cooldowns and deal damage to anyone on the line
    if(p.trailHits){ for(const [e,cd] of p.trailHits){ const nx=cd-dt; if(nx<=0||e.hp<=0) p.trailHits.delete(e); else p.trailHits.set(e,nx); } }
    const tickDmg=CLASSES.kite.trailTickDmg+Math.floor(game.upgrades.skillDamage*0.5);
    for(const e of game.enemies){
      if(e.hp<=0||e.state==='spawn') continue;
      if((p.trailHits&&p.trailHits.get(e)||0)>0) continue;
      // Check segment proximity
      let onTrail=false;
      for(let i=1;i<p.trail.length;i++){
        const a=p.trail[i-1], b=p.trail[i];
        const vx=b.x-a.x, vy=b.y-a.y, wx=e.x-a.x, wy=e.y-a.y;
        const segLen2=vx*vx+vy*vy; if(segLen2<1) continue;
        const tProj=Math.max(0,Math.min(1,(wx*vx+wy*vy)/segLen2));
        const px=a.x+vx*tProj, py=a.y+vy*tProj;
        if(dist2(px,py,e.x,e.y)<(e.r+9)**2){ onTrail=true; break; }
      }
      if(onTrail){
        e.hp-=tickDmg; e.hitFlash=0.15; game.stats.skillDamage+=tickDmg;
        if(!p.trailHits) p.trailHits=new Map();
        p.trailHits.set(e, CLASSES.kite.trailTick);
        spawnParticles(e.x,e.y,CLASSES.kite.color,6,140);
        if(e.hp<=0){ spawnParticles(e.x,e.y,hsl(e.hueA,80,70),14,180); Audio.blip(380+Math.random()*80,0.09,'sine',0.08); }
      }
    }
  }

  // V2: Crescent form timer — just ticks the active duration; game.ability.t handles cooldown
  if(p.cls==='crescent'){
    if(p.crescentActive>0){
      p.crescentActive-=dt;
      if(p.crescentActive<=0){ p.crescentActive=0; Audio.blip(220,0.15,'sawtooth',0.14); }
    }
  }

  // Octa burst
  if(p.cls==='purple'&&game.ability.active>0){
    p.octaFireCd-=dt;
    if(p.octaFireCd<=0){
      for(let i=0;i<8;i++){
        const ang=p.angle+i*(Math.PI/4);
        game.playerBullets.push({ x:p.x+Math.cos(ang)*(playerRadius(p)+4), y:p.y+Math.sin(ang)*(playerRadius(p)+4), vx:Math.cos(ang)*PLAYER_BULLET_SPEED, vy:Math.sin(ang)*PLAYER_BULLET_SPEED, life:1.2, bouncesLeft:game.upgrades.bounce?1:0 });
      }
      p.octaFireCd=CLASSES.purple.burstRate;
      Audio.blip(760+Math.random()*120,0.04,'square',0.07);
    }
  }

  // Borrowed ability timers
  if(game.upgrades.borrowedAbility){
    const bcls=game.upgrades.borrowedAbility;
    if(bcls==='green'){
      if(game.borrowed.charges<game.borrowed.maxCharges){ game.borrowed.t-=dt; if(game.borrowed.t<=0){ game.borrowed.charges=Math.min(game.borrowed.maxCharges,game.borrowed.charges+1); if(game.borrowed.charges<game.borrowed.maxCharges) game.borrowed.t=CLASSES.green.cooldown; } }
    } else { if(game.borrowed.t>0) game.borrowed.t-=dt; }
    if(game.borrowed.active>0) game.borrowed.active-=dt;
    if(bcls==='purple'&&game.borrowed.active>0){
      p.octaFireCdB=(p.octaFireCdB||0)-dt;
      if(p.octaFireCdB<=0){
        for(let i=0;i<8;i++){ const ang=p.angle+i*(Math.PI/4); game.playerBullets.push({ x:p.x+Math.cos(ang)*(playerRadius(p)+4),y:p.y+Math.sin(ang)*(playerRadius(p)+4),vx:Math.cos(ang)*PLAYER_BULLET_SPEED,vy:Math.sin(ang)*PLAYER_BULLET_SPEED,life:1.2,bouncesLeft:game.upgrades.bounce?1:0 }); }
        p.octaFireCdB=CLASSES.purple.burstRate;
      }
    }
  }

  if(game.block.active>0){
    game.block.active-=dt;
    if(game.block.active<=0){
      game.block.active=0;
      if(game.blockWasUsed && !game.blockSuccessThisCast) resetCrescentUnlockProgress();
      game.blockWasUsed=false;
      game.blockSuccessThisCast=false;
    }
  }
  if(game.block.t>0) game.block.t-=dt;
  if(game.timeFreezeT>0){ game.timeFreezeT-=dt; game.timeScale=game.timeFreezeT>0?0:1; }

  // Player knock
  if(p.knockVx||p.knockVy){
    p.x+=(p.knockVx||0)*dt; p.y+=(p.knockVy||0)*dt;
    p.knockVx=(p.knockVx||0)*0.88; p.knockVy=(p.knockVy||0)*0.88;
    if(Math.abs(p.knockVx)<5) p.knockVx=0; if(Math.abs(p.knockVy)<5) p.knockVy=0;
  }

  // Movement input
  let mx=0,my=0;
  if(keys['w'])my-=1; if(keys['s'])my+=1;
  if(keys['a'])mx-=1; if(keys['d'])mx+=1;
  if(mx||my){const m=Math.hypot(mx,my);mx/=m;my/=m;}

  // Dash movement
  if(p.dashT>0){
    p.dashT-=dt; p.x+=p.dashVx*dt; p.y+=p.dashVy*dt;
  } else {
    const starBoost=(p.cls==='white'&&game.ability.active>0?CLASSES.white.speedMult:1);
    const kiteBoost=(p.cls==='kite'?CLASSES.kite.speedMult:1);
    const boonBoost=1+game.upgrades.moveSpeed*0.10/(1+game.upgrades.moveSpeed*0.04);
    const preBoost=1+game.preRunBonus.moveSpeed;
    const speed=PLAYER_SPEED*starBoost*kiteBoost*boonBoost*preBoost;
    p.x+=mx*speed*dt; p.y+=my*speed*dt;
  }

  // Portal warp happens before border damage/clamp
  let edgeBounced=false;
  const warpedByPortal = tryEntityPortalWarp(p, playerRadius(p), false);
  if(warpedByPortal){
    spawnParticles(p.x,p.y,'#7cf',10,120);
    Audio.blip(980,0.08,'triangle',0.08);
  }
  if(!warpedByPortal && p.x<A.x+playerRadius(p)){ p.x=A.x+playerRadius(p); if(p.dashT>0){p.dashVx=Math.abs(p.dashVx);}else{p.knockVx=Math.max(p.knockVx||0,380);} edgeBounced=true; }
  if(!warpedByPortal && p.x>A.x+A.w-playerRadius(p)){ p.x=A.x+A.w-playerRadius(p); if(p.dashT>0){p.dashVx=-Math.abs(p.dashVx);}else{p.knockVx=Math.min(p.knockVx||0,-380);} edgeBounced=true; }
  if(!warpedByPortal && p.y<A.y+playerRadius(p)){ p.y=A.y+playerRadius(p); if(p.dashT>0){p.dashVy=Math.abs(p.dashVy);}else{p.knockVy=Math.max(p.knockVy||0,380);} edgeBounced=true; }
  if(!warpedByPortal && p.y>A.y+A.h-playerRadius(p)){ p.y=A.y+A.h-playerRadius(p); if(p.dashT>0){p.dashVy=-Math.abs(p.dashVy);}else{p.knockVy=Math.min(p.knockVy||0,-380);} edgeBounced=true; }
  if(p.edgeHitCd>0) p.edgeHitCd-=dt;
  const starInvuln=(p.cls==='white'&&game.ability.active>0);
  if(edgeBounced){
    game.flash=Math.max(game.flash,0.1);
    if(!starInvuln && (p.edgeHitCd||0)<=0){
      p.hp-=1; p.edgeHitCd=0.4;
      game.shake=Math.max(game.shake,14); game.flash=0.35;
      Audio.noise(0.2,0.3); spawnParticles(p.x,p.y,'#ff5555',12,180);
      if(p.hp<=0){
        if(game.upgrades.revive>0){
          game.upgrades.revive--; p.hp=p.maxHp; p.iframes=2.5; game.flash=0.6;
          spawnParticles(p.x,p.y,'#ffd166',40,320); Audio.blip(880,0.4,'sine',0.25);
        } else { gameOver(); }
      }
    }
  }

  if(p.iframes>0) p.iframes-=dt;
  if(p.portalCooldown>0) p.portalCooldown-=dt;
  if(p.meleeHits&&p.meleeHits.size){
    for(const [e,cd] of p.meleeHits){
      const nx=cd-dt;
      if(nx<=0||e.hp<=0) p.meleeHits.delete(e);
      else p.meleeHits.set(e,nx);
    }
  }
  // V2: auto-aim option targets the nearest enemy instead of the mouse
  let aimX=mouse.x, aimY=mouse.y;
  if(saveData.options&&saveData.options.autoAim){
    let nearest=null, nD2=Infinity;
    for(const e of game.enemies){
      if(e.state==='spawn'||e.hp<=0||e.type==='healthpack') continue;
      const d2=dist2(p.x,p.y,e.x,e.y);
      if(d2<nD2){ nD2=d2; nearest=e; }
    }
    if(nearest){ aimX=nearest.x; aimY=nearest.y; }
  }
  game.aimX=aimX; game.aimY=aimY;
  p.angle=Math.atan2(aimY-p.y, aimX-p.x);

  // Firing (red and yellow don't fire bullets; only fire during actual play)
  if(p.fireCd>0) p.fireCd-=dt;
  const canFire = p.cls!=='red'&&p.cls!=='yellow'&&game.state==='playing';
  const firing = mouse.down || mouse.toggleFire; // V2: supports toggle mode
  if(canFire&&firing&&p.fireCd<=0){
    const isShotgun=p.cls==='pink';
    const crescentOn=(p.cls==='crescent'&&p.crescentActive>0);
    const totalShots=1+game.upgrades.shots, spreadStep=isShotgun?0.22:0.13, half=(totalShots-1)/2;
    const bulletLife=isShotgun?0.5:1.5;
    // V2: Crescent form — piercing boomerang bullets that fly to cursor and return
    if(crescentOn){
      const activeCrescents = game.playerBullets.filter(b=>b.crescent&&b.life>0).length;
      if(activeCrescents===0){
        const aimX=game.aimX!==undefined?game.aimX:mouse.x, aimY=game.aimY!==undefined?game.aimY:mouse.y;
        const dx=aimX-p.x, dy=aimY-p.y, m=Math.max(60,Math.hypot(dx,dy));
        const spd=CLASSES.crescent.crescentSpeed*0.55 + game.upgrades.skillDamage*10;
        const dmg=(PLAYER_BULLET_DMG+game.upgrades.damage)*4;
        for(let i=0;i<totalShots;i++){
          const ang=p.angle+(i-half)*spreadStep;
          game.playerBullets.push({
            x:p.x+Math.cos(ang)*playerRadius(p), y:p.y+Math.sin(ang)*playerRadius(p),
            vx:Math.cos(ang)*spd, vy:Math.sin(ang)*spd,
            life:4.0, crescent:true, crescentSpd:spd, dmg,
            maxTravel:m, travelled:0, returning:false, pierced:new WeakSet(),
            bouncesLeft:0,
          });
        }
        p.fireCd=1/(PLAYER_FIRE_RATE*0.6);
        Audio.blip(540+Math.random()*60,0.07,'triangle',0.1);
      } else {
        p.fireCd=Math.max(p.fireCd,0.08);
      }
    } else {
      for(let i=0;i<totalShots;i++){
        const ang=p.angle+(i-half)*spreadStep;
        game.playerBullets.push({ x:p.x+Math.cos(ang)*playerRadius(p), y:p.y+Math.sin(ang)*playerRadius(p), vx:Math.cos(ang)*PLAYER_BULLET_SPEED, vy:Math.sin(ang)*PLAYER_BULLET_SPEED, life:bulletLife, bouncesLeft:game.upgrades.bounce?1:0 });
      }
      p.fireCd=1/PLAYER_FIRE_RATE;
      Audio.blip(880+Math.random()*80,0.05,'square',0.08);
    }
  }

  // Block
  if(keys[' ']&&game.block.t<=0&&game.block.active<=0){
    game.block.active=BLOCK_DURATION; game.block.t=effectiveBlockCooldown(); game.blockWasUsed=true; game.blockSuccessThisCast=false;
    Audio.blip(200,0.15,'sine',0.12);
  }

  // Ability
  if(mouse.right){ useAbility(); mouse.right=false; }
}

function summonHexTriangle(){
  const p=game.player; if(!p) return;
  const baseHp=30+(game.yellowTriHpBonus||0);
  game.hexTriangles.push({ x:p.x+(Math.random()-0.5)*50, y:p.y+(Math.random()-0.5)*50, hp:baseHp, maxHp:baseHp, angle:Math.random()*Math.PI*2, dashT:0, dashVx:0, dashVy:0, stateT:0.5, dashHits:null });
  if(p.cls==='yellow') game.ability.t=effectiveAbilityCooldown('yellow');
  else if(game.upgrades.borrowedAbility==='yellow') game.borrowed.t=effectiveBorrowedCooldown('yellow');
  Audio.blip(660,0.12,'triangle',0.12);
}

function executeTrapdash(){
  const p=game.player; if(!p) return;
  p.dashVx=game.trapWindDir.x*1400; p.dashVy=game.trapWindDir.y*1400;
  p.dashT=CLASSES.red.duration+game.upgrades.skillDamage*0.01;
  p.iframes=Math.max(p.iframes,p.dashT+0.08);
  p.dashHits=new Set(); game.trapWindUp=0;
  Audio.blip(1100,0.12,'square',0.14);
}

function useAbility(){
  const p=game.player; if(!p) return;
  const C=CLASSES[p.cls];
  if(p.cls==='orange'){
    if(game.ability.t>0) return;
    game.timeFreezeT=C.duration; game.timeScale=0;
    game.ability.t=effectiveAbilityCooldown(p.cls); game.ability.active=C.duration;
    const dmg=C.abilityDmg+currentSkillDamageBonus('orange');
    for(const e of game.enemies){ if(e.state==='spawn'||e.immuneToHits) continue; e.hp-=dmg; e.hitFlash=0.2; game.stats.skillDamage+=dmg; spawnParticles(e.x,e.y,hsl(25,100,70),10,200); }
    game.shake=Math.max(game.shake,10); Audio.noise(0.35,0.22); Audio.blip(120,0.5,'sine',0.2);
  } else if(p.cls==='white'){
    if(game.ability.t>0) return;
    p.iframes=C.duration; game.ability.t=effectiveAbilityCooldown(p.cls); game.ability.active=C.duration;
    Audio.blip(660,0.3,'sawtooth',0.2);
  } else if(p.cls==='green'){
    if(game.ability.charges<=0) return;
    let dmx=(game.aimX!==undefined?game.aimX:mouse.x)-p.x,dmy=(game.aimY!==undefined?game.aimY:mouse.y)-p.y; const m=Math.hypot(dmx,dmy)||1; dmx/=m;dmy/=m;
    p.dashVx=dmx*1400; p.dashVy=dmy*1400; p.dashT=C.duration;
    p.iframes=Math.max(p.iframes,C.duration+0.08); p.dashHits=new Set();
    game.ability.charges--; if(game.ability.t<=0) game.ability.t=effectiveAbilityCooldown(p.cls);
    Audio.blip(1200,0.1,'square',0.15);
  } else if(p.cls==='blue'){
    if(game.ability.t>0) return;
    const dx=(game.aimX!==undefined?game.aimX:mouse.x)-p.x,dy=(game.aimY!==undefined?game.aimY:mouse.y)-p.y,m=Math.hypot(dx,dy)||1;
    const radius=C.ballRadius+game.upgrades.blueBallSize*5;
    game.playerBullets.push({ x:p.x+(dx/m)*(playerRadius(p)+4),y:p.y+(dy/m)*(playerRadius(p)+4),vx:(dx/m)*C.ballSpeed,vy:(dy/m)*C.ballSpeed,life:6,bigBall:true,r:radius,dmg:C.ballDmg+currentSkillDamageBonus('blue'),pierced:new WeakSet() });
    game.ability.t=effectiveAbilityCooldown(p.cls);
    Audio.blip(320,0.18,'sine',0.16);
  } else if(p.cls==='purple'){
    if(game.ability.t>0) return;
    game.ability.active=C.duration+game.upgrades.octaDuration*0.2; game.ability.t=C.cooldown; p.octaFireCd=0;
    Audio.blip(520,0.18,'square',0.14);
  } else if(p.cls==='red'){
    if(game.ability.t>0||game.trapWindUp>0) return;
    // Start wind-up
    const dx=(game.aimX!==undefined?game.aimX:mouse.x)-p.x,dy=(game.aimY!==undefined?game.aimY:mouse.y)-p.y,m=Math.hypot(dx,dy)||1;
    game.trapWindDir={ x:dx/m, y:dy/m }; game.trapWindUp=CLASSES.red.windUp;
    game.ability.t=effectiveAbilityCooldown('red');
    Audio.blip(400,0.18,'sine',0.10);
  } else if(p.cls==='yellow'){
    const maxTri=CLASSES.yellow.baseMaxTri+game.upgrades.shots;
    if(game.hexTriangles.length>=maxTri||game.ability.t>0) return;
    summonHexTriangle();
  } else if(p.cls==='pink'){
    if(game.ability.t>0) return;
    const dx=(game.aimX!==undefined?game.aimX:mouse.x)-p.x,dy=(game.aimY!==undefined?game.aimY:mouse.y)-p.y,m=Math.hypot(dx,dy)||1;
    const baseRange=220, rangeBonus=Math.min(50,game.upgrades.skillDamage*10);
    const maxRange=baseRange+rangeBonus;
    const actualDist=Math.min(m,maxRange);
    const dashDur=0.18;
    p.dashVx=(dx/m)*(actualDist/dashDur); p.dashVy=(dy/m)*(actualDist/dashDur);
    p.dashT=dashDur;
    p.iframes=Math.max(p.iframes,p.dashT+0.08);
    p.dashHits=new Set();
    game.ability.t=effectiveAbilityCooldown('pink');
    Audio.blip(900,0.1,'triangle',0.12);
  } else if(p.cls==='black'){
    if(game.ability.t>0) return;
    const dmg=CLASSES.black.ringDmg+currentSkillDamageBonus('black');
    const A=arenaRect();
    const cornerDist=Math.max(
      Math.hypot(p.x-A.x,       p.y-A.y),
      Math.hypot(p.x-(A.x+A.w), p.y-A.y),
      Math.hypot(p.x-A.x,       p.y-(A.y+A.h)),
      Math.hypot(p.x-(A.x+A.w), p.y-(A.y+A.h))
    );
    game.deathRings.push({ x:p.x, y:p.y, r:playerRadius(p)+6, maxR:cornerDist+40, speed:520, dmg, hits:new Set() });
    game.ability.t=effectiveAbilityCooldown('black');
    Audio.noise(0.6,0.35); Audio.blip(80,0.5,'sawtooth',0.28);
  } else if(p.cls==='kite'){
    // Passive trail — no active ability
    return;
  } else if(p.cls==='crescent'){
    if(game.ability.t>0||p.crescentActive>0) return;
    p.crescentActive=CLASSES.crescent.duration;
    game.ability.active=CLASSES.crescent.duration;
    // Full cycle: 10s active form + scaled cooldown. HUD ticks down the combined total.
    game.ability.t=CLASSES.crescent.duration+effectiveAbilityCooldown('crescent');
    Audio.blip(500,0.2,'sine',0.16); Audio.blip(700,0.25,'triangle',0.14);
  }
}

function useBorrowedAbility(){
  const p=game.player, bcls=game.upgrades.borrowedAbility; if(!bcls) return;
  const C=CLASSES[bcls], B=game.borrowed;
  const cd=effectiveBorrowedCooldown(bcls);

  if(bcls==='orange'){
    if(B.t>0)return;
    const dur=0.5; // weakened from 1.0
    game.timeFreezeT=dur; game.timeScale=0; B.t=cd; B.active=dur;
    for(const e of game.enemies){ if(e.state==='spawn'||e.immuneToHits)continue; e.hp-=(C.abilityDmg+currentSkillDamageBonus('orange')); e.hitFlash=0.2; spawnParticles(e.x,e.y,hsl(25,100,70),10,200); }
    game.shake=Math.max(game.shake,10); Audio.noise(0.35,0.22);
  } else if(bcls==='white'){
    if(B.t>0)return;
    const dur=2.5; // weakened from 5.0
    p.iframes=Math.max(p.iframes,dur); B.t=cd; B.active=dur;
  } else if(bcls==='green'){
    if(B.charges<=0)return; // weakened: 1 charge instead of 2
    let dmx=(game.aimX!==undefined?game.aimX:mouse.x)-p.x,dmy=(game.aimY!==undefined?game.aimY:mouse.y)-p.y; const m=Math.hypot(dmx,dmy)||1; dmx/=m;dmy/=m;
    p.dashVx=dmx*1400; p.dashVy=dmy*1400; p.dashT=C.duration; p.iframes=Math.max(p.iframes,C.duration+0.08); p.dashHits=new Set();
    B.charges--; if(B.t<=0) B.t=cd;
  } else if(bcls==='blue'){
    if(B.t>0)return; // weakened: 15s cooldown instead of 10s (via BORROWED_COOLDOWNS)
    const dx=(game.aimX!==undefined?game.aimX:mouse.x)-p.x,dy=(game.aimY!==undefined?game.aimY:mouse.y)-p.y,m=Math.hypot(dx,dy)||1;
    const radius=C.ballRadius+game.upgrades.blueBallSize*5;
    game.playerBullets.push({ x:p.x+(dx/m)*(playerRadius(p)+4),y:p.y+(dy/m)*(playerRadius(p)+4),vx:(dx/m)*C.ballSpeed,vy:(dy/m)*C.ballSpeed,life:6,bigBall:true,r:radius,dmg:C.ballDmg+currentSkillDamageBonus('blue'),pierced:new WeakSet() });
    B.t=cd;
  } else if(bcls==='purple'){
    if(B.t>0)return;
    B.active=C.duration+game.upgrades.octaDuration*0.1; // weakened: keeps 0.1 scale
    B.t=cd; p.octaFireCdB=0;
  } else if(bcls==='red'){
    if(B.t>0)return; // weakened: 10s cooldown, scales off skill damage
    let dmx=(game.aimX!==undefined?game.aimX:mouse.x)-p.x,dmy=(game.aimY!==undefined?game.aimY:mouse.y)-p.y; const m=Math.hypot(dmx,dmy)||1; dmx/=m;dmy/=m;
    p.dashVx=dmx*1200; p.dashVy=dmy*1200; p.dashT=0.25;
    p.iframes=Math.max(p.iframes,p.dashT+0.08);
    p.dashHits=new Set();
    B.t=cd; Audio.blip(500,0.15,'sawtooth',0.18);
  } else if(bcls==='yellow'){
    if(B.t>0)return; // weakened: cap 2 triangles, +1 per Extra Shots, max 6
    const maxTri=Math.min(6, 2+game.upgrades.shots);
    if(game.hexTriangles.length>=maxTri)return;
    summonHexTriangle();
    B.t=cd;
  } else if(bcls==='pink'){
    if(B.t>0)return;
    const dx=(game.aimX!==undefined?game.aimX:mouse.x)-p.x,dy=(game.aimY!==undefined?game.aimY:mouse.y)-p.y,m=Math.hypot(dx,dy)||1;
    const baseRange=200, rangeBonus=Math.min(40,game.upgrades.skillDamage*8);
    const maxRange=baseRange+rangeBonus;
    const actualDist=Math.min(m,maxRange);
    const dashDur=0.18;
    p.dashVx=(dx/m)*(actualDist/dashDur); p.dashVy=(dy/m)*(actualDist/dashDur);
    p.dashT=dashDur;
    p.iframes=Math.max(p.iframes,p.dashT+0.08);
    B.t=cd; Audio.blip(900,0.1,'triangle',0.12);
  } else if(bcls==='black'){
    if(B.t>0)return; // weakened: no 2x scale on skill damage
    const dmg=CLASSES.black.ringDmg+currentSkillDamageBonus('black');
    const A=arenaRect();
    const cornerDist=Math.max(
      Math.hypot(p.x-A.x,       p.y-A.y),
      Math.hypot(p.x-(A.x+A.w), p.y-A.y),
      Math.hypot(p.x-A.x,       p.y-(A.y+A.h)),
      Math.hypot(p.x-(A.x+A.w), p.y-(A.y+A.h))
    );
    game.deathRings.push({ x:p.x, y:p.y, r:playerRadius(p)+6, maxR:cornerDist+40, speed:520, dmg, hits:new Set() });
    B.t=cd;
    Audio.noise(0.6,0.35); Audio.blip(80,0.5,'sawtooth',0.28);
  }
}

function damagePlayer(amount=1){
  const p=game.player; if(!p) return;
  if(p.iframes>0) return;
  if(game.block.active>0){
    game.block.active=0; game.blockWasUsed=false; noteSuccessfulBlock(); spawnParticles(p.x,p.y,'#fff',16,160); Audio.blip(400,0.12,'triangle',0.18); p.iframes=0.3; return;
  }
  resetCrescentUnlockProgress();
  p.hp-=amount; p.iframes=HIT_IFRAME;
  game.shake=Math.max(game.shake,14); game.flash=0.35; Audio.noise(0.2,0.3);
  if(p.hp<=0){
    if(game.upgrades.revive>0){ game.upgrades.revive--; p.hp=p.maxHp; p.iframes=2.5; game.flash=0.6; spawnParticles(p.x,p.y,'#ffd166',40,320); Audio.blip(880,0.4,'sine',0.25); return; }
    gameOver();
  }
}

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

  const firingHeld = mouse.down || mouse.toggleFire;
  const claimedTargets = new Set();
  for(let i=game.hexTriangles.length-1;i>=0;i--){
    const t=game.hexTriangles[i];
    if(t.hp<=0){ spawnParticles(t.x,t.y,'#ff69b4',12,180); game.hexTriangles.splice(i,1); continue; }
    t.angle+=dt*3;
    if(t.hitCD){ for(const [e,cd] of t.hitCD){ const nx=cd-dt; if(nx<=0||e.hp<=0) t.hitCD.delete(e); else t.hitCD.set(e,nx); } }

    let tx, ty;
    if(firingHeld){ tx=game.aimX; ty=game.aimY; }
    else {
      let nearestUnclaimed=null, nearestAny=null, nUnclaimed=Infinity, nAny=Infinity;
      for(const e of game.enemies){
        if(e.state==='spawn'||e.hp<=0) continue;
        const d2=dist2(t.x,t.y,e.x,e.y);
        if(d2<nAny){ nAny=d2; nearestAny=e; }
        if(!claimedTargets.has(e) && d2<nUnclaimed){ nUnclaimed=d2; nearestUnclaimed=e; }
      }
      const target = nearestUnclaimed || nearestAny;
      if(target){
        claimedTargets.add(target);
        tx=target.x; ty=target.y;
      } else { tx=p.x; ty=p.y; }
    }
    const dx=tx-t.x, dy=ty-t.y, d=Math.hypot(dx,dy)||1;
    if(d>10){ t.x+=(dx/d)*triSpeed*dt; t.y+=(dy/d)*triSpeed*dt; }

    t.x=clamp(t.x,A.x+10,A.x+A.w-10);
    t.y=clamp(t.y,A.y+10,A.y+A.h-10);

    for(const e of game.enemies){
      if(e.hp<=0||e.state==='spawn') continue;
      const rr=t.r+e.r, dd=dist2(t.x,t.y,e.x,e.y);
      if(dd<rr*rr){
        if(!t.hitCD) t.hitCD=new Map();
        if(t.hitCD.has(e)) continue;
        const dmg=(CLASSES.yellow.triDmg||2) + currentSkillDamageBonus('yellow');
        e.hp -= dmg;
        e.hitFlash=0.16;
        game.stats.skillDamage += dmg;
        t.hitCD.set(e, 0.5);
        t.hp -= 1;
        spawnParticles(e.x,e.y,'#ff69b4',10,170);
        Audio.blip(760+Math.random()*80,0.035,'triangle',0.05);
        if(e.hp<=0){ spawnParticles(e.x,e.y,hsl(e.hueA||320,80,70),16,190); }
        if(t.hp<=0) break;
      }
    }
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

