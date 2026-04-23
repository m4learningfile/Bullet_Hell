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
        if(m<PLAYER_RADIUS+8) b.life=0; // caught
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
    if(p){ const rr=b.r+PLAYER_RADIUS; if(dist2(b.x,b.y,p.x,p.y)<rr*rr){ damagePlayer(1); spawnParticles(b.x,b.y,'#fff',8,180); b.life=0; } }
  }
  game.enemyBullets=game.enemyBullets.filter(b=>b.life>0);

  // Enemy-player body collision
  const p=game.player;
  if(p){
    for(const e of game.enemies){
      if(e.state==='spawn') continue;
      if(e.auraTimer>0) e.auraTimer-=dt;
      const rr=e.r+PLAYER_RADIUS-2;
      if(dist2(p.x,p.y,e.x,e.y)<rr*rr){
        const C=CLASSES[p.cls];
        const greenActive=(p.cls==='green'||game.upgrades.borrowedAbility==='green')&&p.dashT>0;
        if(greenActive){
          if(p.dashHits&&!p.dashHits.has(e)){ const gd=CLASSES.green.dashDmg+game.upgrades.skillDamage*2; e.hp-=gd; game.stats.skillDamage+=gd; e.hitFlash=0.15; p.dashHits.add(e); spawnParticles(e.x,e.y,'#aaffaa',12,260); if(e.hp<=0){spawnParticles(e.x,e.y,hsl(e.hueA,80,70),20,220);Audio.noise(0.15,0.12);} }
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
              const dmg=1+game.upgrades.damage*3;
              e.hp-=dmg; e.hitFlash=0.15;
              p.meleeHits.set(e,0.5);
              spawnParticles(e.x,e.y,'#ff9999',8,180);
              if(e.hp<=0){ spawnParticles(e.x,e.y,hsl(e.hueA,80,70),20,220); Audio.blip(200+Math.random()*80,0.18,'square',0.14); }
              else Audio.blip(500+Math.random()*150,0.05,'square',0.08);
            }
          } else {
            damagePlayer(1);
            const dx2=e.x-p.x,dy2=e.y-p.y,d2=Math.hypot(dx2,dy2)||1;
            p.knockVx=-(dx2/d2)*280; p.knockVy=-(dy2/d2)*280;
            e.x+=(dx2/d2)*10;e.y+=(dy2/d2)*10;
          }
          break;
        }
        if(p.cls==='white'&&game.ability.active>0){
          if((e.auraTimer||0)<=0){ const td=C.touchDmg+game.upgrades.skillDamage*2; e.hp-=td; game.stats.skillDamage+=td; e.hitFlash=0.12; e.auraTimer=C.touchTick; const hue=(performance.now()*0.5)%360; spawnParticles(e.x,e.y,hsl(hue,90,70),8,200); if(e.hp<=0){spawnParticles(e.x,e.y,hsl(e.hueA,80,70),20,220);Audio.noise(0.15,0.12);} }
          continue;
        }
        damagePlayer(1);
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

