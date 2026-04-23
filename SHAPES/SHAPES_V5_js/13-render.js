// ============================================================
// RENDER
// ============================================================
function drawBackground(dt){
  game.bgT+=dt*0.15;
  game.bgHue=lerp(game.bgHue,game.bgPhase,1-Math.exp(-dt*0.3));
  const h=game.bgHue, s=screenScale();
  ctx.save(); ctx.scale(s,s);
  const skullBG=game.skullFinalPhase;
  const g=ctx.createLinearGradient(0,0,BASE_W,BASE_H);
  if(skullBG){g.addColorStop(0,'#f8f8f8');g.addColorStop(0.5,'#ffffff');g.addColorStop(1,'#f0f0f0');}
  else{g.addColorStop(0,hsl(h,40,6));g.addColorStop(0.5,hsl(h+30,50,10));g.addColorStop(1,hsl(h+60,40,6));}
  ctx.fillStyle=g; ctx.fillRect(0,0,BASE_W,BASE_H);
  if(game.skullFlash>0){ game.skullFlash=Math.max(0,game.skullFlash-dt); ctx.fillStyle='rgba(255,255,255,'+(0.25*game.skullFlash)+')'; ctx.fillRect(0,0,BASE_W,BASE_H); }
  for(let i=0;i<3;i++){
    const t=game.bgT+i*1.3, x=BASE_W/2+Math.cos(t*0.3+i)*300, y=BASE_H/2+Math.sin(t*0.4+i*2)*200;
    const rg=ctx.createRadialGradient(x,y,0,x,y,500);
    rg.addColorStop(0,hsl(h+i*40,60,14,0.45)); rg.addColorStop(1,hsl(h+i*40,60,10,0));
    ctx.fillStyle=rg; ctx.fillRect(0,0,BASE_W,BASE_H);
  }
  const A=arenaRect();
  ctx.save();
  ctx.fillStyle='rgba(0,0,0,0.35)'; ctx.fillRect(A.x,A.y,A.w,A.h);
  ctx.strokeStyle=skullBG?'rgba(0,0,0,0.65)':hsl(h+180,60,60,0.6);
  ctx.lineWidth=2; ctx.shadowColor=hsl(h+180,80,60); ctx.shadowBlur=18;
  ctx.strokeRect(A.x,A.y,A.w,A.h);
  ctx.restore(); ctx.restore();
}

function drawPlayer(){
  const p=game.player; if(!p) return;
  const blink=p.iframes>0&&Math.floor(p.iframes*20)%2===0;

  // V2: Kite trail rendered behind the player
  if(p.cls==='kite' && p.trail && p.trail.length>1){
    ctx.save();
    ctx.shadowColor=CLASSES.kite.color; ctx.shadowBlur=18;
    ctx.strokeStyle=CLASSES.kite.color; ctx.lineWidth=6; ctx.lineJoin='round'; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(p.trail[0].x, p.trail[0].y);
    for(let i=1;i<p.trail.length;i++) ctx.lineTo(p.trail[i].x, p.trail[i].y);
    ctx.stroke();
    ctx.strokeStyle='rgba(255,255,255,0.5)'; ctx.lineWidth=2; ctx.shadowBlur=0;
    ctx.beginPath(); ctx.moveTo(p.trail[0].x, p.trail[0].y);
    for(let i=1;i<p.trail.length;i++) ctx.lineTo(p.trail[i].x, p.trail[i].y);
    ctx.stroke();
    ctx.restore();
  }

  // V2: Crescent form aura
  if(p.cls==='crescent' && p.crescentActive>0){
    ctx.save();
    ctx.strokeStyle=CLASSES.crescent.color; ctx.shadowColor=CLASSES.crescent.color; ctx.shadowBlur=22; ctx.lineWidth=3;
    const r=PLAYER_RADIUS+10+Math.sin(performance.now()*0.01)*2;
    ctx.beginPath(); ctx.arc(p.x,p.y,r,0,Math.PI*2); ctx.stroke();
    ctx.restore();
  }

  if(p.cls==='white'&&game.ability.active>0){
    const hue=(performance.now()*0.5)%360;
    ctx.save(); ctx.shadowColor=hsl(hue,90,65); ctx.shadowBlur=30;
    ctx.strokeStyle=hsl(hue,90,70); ctx.lineWidth=3; ctx.beginPath(); ctx.arc(p.x,p.y,PLAYER_RADIUS+12,0,Math.PI*2); ctx.stroke();
    ctx.strokeStyle=hsl((hue+120)%360,90,70); ctx.lineWidth=2; ctx.beginPath(); ctx.arc(p.x,p.y,PLAYER_RADIUS+6,0,Math.PI*2); ctx.stroke(); ctx.restore();
  }
  if(p.cls==='purple'&&game.ability.active>0){
    ctx.save(); ctx.strokeStyle='rgba(220,180,255,0.9)'; ctx.shadowColor=p.color; ctx.shadowBlur=24; ctx.lineWidth=3;
    ctx.beginPath(); ctx.arc(p.x,p.y,PLAYER_RADIUS+12+Math.sin(performance.now()*0.02)*2,0,Math.PI*2); ctx.stroke(); ctx.restore();
  }
  if(game.block.active>0){ ctx.save(); ctx.strokeStyle='rgba(255,255,255,0.9)'; ctx.lineWidth=3; ctx.shadowColor='#fff'; ctx.shadowBlur=20; ctx.beginPath(); ctx.arc(p.x,p.y,PLAYER_RADIUS+6,0,Math.PI*2); ctx.stroke(); ctx.restore(); }
  if(p.cls==='green'&&p.dashT>0){ ctx.save(); ctx.strokeStyle=hsl(120,100,70); ctx.shadowColor=p.color; ctx.shadowBlur=22; ctx.lineWidth=4; ctx.beginPath(); ctx.moveTo(p.x-p.dashVx*0.04,p.y-p.dashVy*0.04); ctx.lineTo(p.x-p.dashVx*0.12,p.y-p.dashVy*0.12); ctx.stroke(); ctx.restore(); }
  if(p.cls==='orange'&&game.timeFreezeT>0){ ctx.save(); ctx.strokeStyle=hsl(25,100,65); ctx.shadowColor=p.color; ctx.shadowBlur=26; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(p.x,p.y,PLAYER_RADIUS+10+Math.sin(performance.now()*0.01)*2,0,Math.PI*2); ctx.stroke(); ctx.restore(); }

  // Red wind-up warning line
  if(p.cls==='red'&&game.trapWindUp>0){
    ctx.save(); ctx.strokeStyle='rgba(255,100,100,0.7)'; ctx.lineWidth=2; ctx.setLineDash([6,4]);
    ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(p.x+game.trapWindDir.x*300,p.y+game.trapWindDir.y*300); ctx.stroke();
    ctx.setLineDash([]); ctx.restore();
  }

  ctx.save(); ctx.shadowColor=p.color; ctx.shadowBlur=18;
  ctx.fillStyle=blink?'rgba(255,255,255,0.55)':p.color;
  ctx.strokeStyle='#fff'; ctx.lineWidth=2;
  ctx.translate(p.x,p.y);
  if(p.cls==='green'||p.cls==='red') ctx.rotate(p.angle);

  if(p.cls==='orange'){
    const r=PLAYER_RADIUS; ctx.fillRect(-r,-r,r*2,r*2); ctx.strokeRect(-r,-r,r*2,r*2);
  } else if(p.cls==='white'){
    const R=PLAYER_RADIUS+2; ctx.beginPath();
    for(let i=0;i<10;i++){const ang=-Math.PI/2+i*Math.PI/5,rr=i%2===0?R:R*0.45; ctx.lineTo(Math.cos(ang)*rr,Math.sin(ang)*rr);}
    ctx.closePath(); ctx.fill(); ctx.stroke();
  } else if(p.cls==='green'){
    const R=PLAYER_RADIUS+3; ctx.beginPath(); ctx.moveTo(R,0); ctx.lineTo(-R*0.7,-R*0.8); ctx.lineTo(-R*0.3,0); ctx.lineTo(-R*0.7,R*0.8); ctx.closePath(); ctx.fill(); ctx.stroke();
  } else if(p.cls==='blue'){
    ctx.beginPath(); ctx.arc(0,0,PLAYER_RADIUS+1,0,Math.PI*2); ctx.fill(); ctx.stroke();
  } else if(p.cls==='purple'){
    const R=PLAYER_RADIUS+3; ctx.beginPath();
    for(let i=0;i<8;i++){const a=-Math.PI/8+i*Math.PI/4; ctx.lineTo(Math.cos(a)*R,Math.sin(a)*R);}
    ctx.closePath(); ctx.fill(); ctx.stroke();
  } else if(p.cls==='red'){
    const R=PLAYER_RADIUS+2; ctx.beginPath(); ctx.moveTo(R,-R*0.7); ctx.lineTo(R,R*0.7); ctx.lineTo(-R*0.55,R*0.42); ctx.lineTo(-R*0.55,-R*0.42); ctx.closePath(); ctx.fill(); ctx.stroke();
  } else if(p.cls==='yellow'){
    const R=PLAYER_RADIUS+2; ctx.beginPath();
    for(let i=0;i<6;i++){const a=i*Math.PI/3; ctx.lineTo(Math.cos(a)*R,Math.sin(a)*R);}
    ctx.closePath(); ctx.fill(); ctx.stroke();
  } else if(p.cls==='pink'){
    const R=PLAYER_RADIUS+2; ctx.beginPath();
    for(let i=0;i<3;i++){const a=-Math.PI/2+i*2*Math.PI/3; ctx.lineTo(Math.cos(a)*R,Math.sin(a)*R);}
    ctx.closePath(); ctx.fill(); ctx.stroke();
  } else if(p.cls==='black'){
    const R=PLAYER_RADIUS+2;
    ctx.fillStyle=blink?'rgba(255,255,255,0.55)':'#1a1a1a'; ctx.strokeStyle='#bbb';
    ctx.beginPath(); ctx.arc(0,-R*0.1,R*0.9,Math.PI,2*Math.PI);
    ctx.lineTo(R*0.5,R*0.45); ctx.lineTo(R*0.2,R*0.45); ctx.lineTo(R*0.18,R*0.7);
    ctx.lineTo(-R*0.18,R*0.7); ctx.lineTo(-R*0.2,R*0.45); ctx.lineTo(-R*0.5,R*0.45);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    if(!blink){
      ctx.fillStyle='#ddd'; ctx.shadowBlur=0;
      ctx.beginPath(); ctx.arc(-R*0.3,-R*0.1,R*0.18,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(R*0.3,-R*0.1,R*0.18,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#000';
      ctx.beginPath(); ctx.arc(-R*0.3,-R*0.1,R*0.08,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(R*0.3,-R*0.1,R*0.08,0,Math.PI*2); ctx.fill();
    }
  } else if(p.cls==='kite'){
    // Elongated diamond shape for Kite
    const R=PLAYER_RADIUS+3;
    ctx.beginPath(); ctx.moveTo(0,-R*1.1); ctx.lineTo(R*0.75,0); ctx.lineTo(0,R*1.1); ctx.lineTo(-R*0.75,0); ctx.closePath(); ctx.fill(); ctx.stroke();
  } else if(p.cls==='crescent'){
    // Crescent moon shape — negative-space cutout from a circle
    const R=PLAYER_RADIUS+2;
    ctx.beginPath(); ctx.arc(0,0,R,0,Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.save(); ctx.globalCompositeOperation='destination-out';
    ctx.beginPath(); ctx.arc(R*0.45,0,R*0.85,0,Math.PI*2); ctx.fill(); ctx.restore();
  }
  ctx.restore();

  // Aim barrel for non-rotating classes (except red which shows its shape)
  if(p.cls!=='green'&&p.cls!=='red'){
    ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.angle);
    ctx.shadowColor=p.color; ctx.shadowBlur=12; ctx.strokeStyle=p.color; ctx.lineWidth=3;
    ctx.beginPath(); ctx.moveTo(PLAYER_RADIUS+2,0); ctx.lineTo(PLAYER_RADIUS+14,0); ctx.stroke();
    ctx.fillStyle=p.color; ctx.beginPath(); ctx.moveTo(PLAYER_RADIUS+14,0); ctx.lineTo(PLAYER_RADIUS+9,-4); ctx.lineTo(PLAYER_RADIUS+9,4); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  ctx.save(); ctx.strokeStyle='rgba(255,255,255,0.6)'; ctx.fillStyle='rgba(255,255,255,0.15)'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.arc(mouse.x,mouse.y,6,0,Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(mouse.x-10,mouse.y); ctx.lineTo(mouse.x-3,mouse.y); ctx.moveTo(mouse.x+3,mouse.y); ctx.lineTo(mouse.x+10,mouse.y); ctx.moveTo(mouse.x,mouse.y-10); ctx.lineTo(mouse.x,mouse.y-3); ctx.moveTo(mouse.x,mouse.y+3); ctx.lineTo(mouse.x,mouse.y+10); ctx.stroke();
  ctx.restore();
}

function drawHexTriangles(){
  for(const t of game.hexTriangles){
    ctx.save(); ctx.translate(t.x,t.y); ctx.rotate(t.angle);
    ctx.shadowColor='#ff69b4'; ctx.shadowBlur=14;
    ctx.fillStyle='#ff69b4'; ctx.strokeStyle='#fff'; ctx.lineWidth=1.5;
    const R=12; ctx.beginPath();
    for(let i=0;i<3;i++){const a=-Math.PI/2+i*2*Math.PI/3; ctx.lineTo(Math.cos(a)*R,Math.sin(a)*R);}
    ctx.closePath(); ctx.fill(); ctx.stroke();
    if(t.hp<t.maxHp){ ctx.rotate(-t.angle); ctx.shadowBlur=0; const hw=20,hh=3; ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillRect(-hw/2,-R-8,hw,hh); ctx.fillStyle='#ff69b4'; ctx.fillRect(-hw/2,-R-8,hw*(t.hp/t.maxHp),hh); }
    ctx.restore();
  }
}

function drawEnemy(e){
  const t=performance.now()*0.002;
  const h1=(e.hueA+Math.sin(t+e.phase)*20)%360, h2=(e.hueB+Math.cos(t+e.phase)*20)%360;
  const bg=game.bgHue; let mainH=h1;
  const diff=((mainH-bg)+540)%360-180; if(Math.abs(diff)<90) mainH=(bg+180)%360;
  const secH=(mainH+40)%360;
  const alphaSpawn=e.state==='spawn'?clamp(1-e.stateT,0.3,1):1;
  ctx.save(); ctx.globalAlpha=alphaSpawn; ctx.translate(e.x,e.y); if(e.angle)ctx.rotate(e.angle);
  ctx.shadowColor=hsl(mainH,90,65); ctx.shadowBlur=22;

  if(e.safeRadius&&!e.immuneToHits){
    const skullBG=game.skullFinalPhase; ctx.save(); ctx.shadowBlur=0; ctx.globalAlpha=0.16;
    ctx.fillStyle=skullBG?'rgba(0,0,0,0.10)':'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.arc(0,0,e.safeRadius,0,Math.PI*2); ctx.fill();
    ctx.globalAlpha=0.42; ctx.strokeStyle=skullBG?'rgba(0,0,0,0.55)':'rgba(255,255,255,0.48)'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(0,0,e.safeRadius,0,Math.PI*2); ctx.stroke(); ctx.restore();
  }

  const grd=ctx.createRadialGradient(-e.r*0.3,-e.r*0.3,1,0,0,e.r);
  grd.addColorStop(0,hsl(secH,85,75)); grd.addColorStop(1,hsl(mainH,90,45));
  ctx.fillStyle=(e.type==='trapezoid'&&e.state2==='charge')?'#ffffff':grd;
  ctx.lineWidth=2.5; ctx.strokeStyle=e.hitFlash>0?'#fff':hsl(mainH,100,85,0.95);

  if(e.type==='trapezoid'&&e.state2==='charge'){
    ctx.save(); ctx.rotate(e.angle?-e.angle:0); ctx.strokeStyle='rgba(255,255,255,0.85)'; ctx.lineWidth=2; ctx.shadowBlur=10;
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(e.warnDx*1200,e.warnDy*1200); ctx.stroke(); ctx.restore();
  }

  switch(e.type){
    case 'circle': ctx.beginPath();ctx.arc(0,0,e.r,0,Math.PI*2);ctx.fill();ctx.stroke(); break;
    case 'triangle': ctx.beginPath();for(let i=0;i<3;i++){const a=-Math.PI/2+i*2*Math.PI/3;ctx.lineTo(Math.cos(a)*e.r,Math.sin(a)*e.r);}ctx.closePath();ctx.fill();ctx.stroke(); break;
    case 'arrow': ctx.beginPath();ctx.moveTo(e.r,0);ctx.lineTo(-e.r*0.6,-e.r*0.7);ctx.lineTo(-e.r*0.2,0);ctx.lineTo(-e.r*0.6,e.r*0.7);ctx.closePath();ctx.fill();ctx.stroke(); break;
    case 'hexagon': ctx.beginPath();for(let i=0;i<6;i++){const a=i*Math.PI/3;ctx.lineTo(Math.cos(a)*e.r,Math.sin(a)*e.r);}ctx.closePath();ctx.fill();ctx.stroke(); break;
    case 'octagon': {
      ctx.beginPath();
      for(let i=0;i<8;i++){const a=-Math.PI/8+i*Math.PI/4;ctx.lineTo(Math.cos(a)*e.r,Math.sin(a)*e.r);}
      ctx.closePath();ctx.fill();ctx.stroke();
      if(e.immuneToHits){ ctx.save();ctx.strokeStyle='rgba(255,255,255,0.55)';ctx.lineWidth=2;ctx.shadowBlur=0;ctx.beginPath();ctx.arc(0,0,e.r+7,0,Math.PI*2);ctx.stroke();ctx.restore(); }
      break;
    }
    case 'trapezoid': ctx.beginPath();ctx.moveTo(e.r*0.85,-e.r*0.7);ctx.lineTo(e.r*0.85,e.r*0.7);ctx.lineTo(-e.r*0.55,e.r*0.42);ctx.lineTo(-e.r*0.55,-e.r*0.42);ctx.closePath();ctx.fill();ctx.stroke(); break;
    case 'healthpack': {
      // V2: forest green cross (medical sign). Pulses gently
      ctx.save();
      const pulse=1+Math.sin(performance.now()*0.004)*0.06;
      ctx.scale(pulse,pulse);
      // outer frame
      ctx.fillStyle='#f4f4f4'; ctx.strokeStyle='#2a7a38'; ctx.lineWidth=2; ctx.shadowColor='#2ea84a'; ctx.shadowBlur=16;
      ctx.beginPath(); ctx.rect(-e.r*0.95,-e.r*0.95,e.r*1.9,e.r*1.9); ctx.fill(); ctx.stroke();
      // green cross
      ctx.fillStyle='#0e9938'; ctx.shadowBlur=10;
      const armW=e.r*0.32, armL=e.r*0.75;
      ctx.fillRect(-armW,-armL,armW*2,armL*2); // vertical
      ctx.fillRect(-armL,-armW,armL*2,armW*2); // horizontal
      ctx.restore();
      break;
    }
    case 'diamond':{
      ctx.beginPath();ctx.moveTo(0,-e.r);ctx.lineTo(e.r,0);ctx.lineTo(0,e.r);ctx.lineTo(-e.r,0);ctx.closePath();ctx.fill();ctx.stroke();
      ctx.fillStyle=hsl(secH,100,80);
      for(let i=0;i<4;i++){const a=i*Math.PI/2;ctx.beginPath();ctx.arc(Math.cos(a)*e.r*0.9,Math.sin(a)*e.r*0.9,3,0,Math.PI*2);ctx.fill();}
      break;
    }
    case 'skull':{
      ctx.fillStyle='#111';ctx.strokeStyle=e.hitFlash>0?'#fff':'#000';ctx.shadowColor='#fff';ctx.shadowBlur=18;
      ctx.beginPath();ctx.arc(0,-e.r*0.1,e.r*0.85,Math.PI,2*Math.PI);
      ctx.lineTo(e.r*0.55,e.r*0.45);ctx.lineTo(e.r*0.25,e.r*0.45);ctx.lineTo(e.r*0.2,e.r*0.75);
      ctx.lineTo(-e.r*0.2,e.r*0.75);ctx.lineTo(-e.r*0.25,e.r*0.45);ctx.lineTo(-e.r*0.55,e.r*0.45);
      ctx.closePath();ctx.fill();ctx.stroke();
      ctx.shadowBlur=0;ctx.fillStyle='#fff';
      ctx.beginPath();ctx.arc(-e.r*0.35,-e.r*0.15,e.r*0.2,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.arc(e.r*0.35,-e.r*0.15,e.r*0.2,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#000';
      ctx.beginPath();ctx.arc(-e.r*0.35,-e.r*0.15,e.r*0.09,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.arc(e.r*0.35,-e.r*0.15,e.r*0.09,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='#000';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-e.r*0.08,e.r*0.25);ctx.lineTo(0,e.r*0.1);ctx.lineTo(e.r*0.08,e.r*0.25);ctx.stroke();
      break;
    }
  }

  if(e.boss){ctx.save();ctx.rotate(e.angle?-e.angle:0);ctx.shadowBlur=0;ctx.fillStyle='#fff';ctx.font='700 10px Segoe UI';ctx.textAlign='center';ctx.fillText('BOSS',0,-e.r-18);ctx.restore();}
  if(e.hp<e.maxHp){
    ctx.rotate(e.angle?-e.angle:0);
    const w=e.r*2,hh=4,yy=-e.r-12; ctx.shadowBlur=0;
    ctx.fillStyle='rgba(0,0,0,0.6)';ctx.fillRect(-w/2,yy,w,hh);
    ctx.fillStyle=hsl(mainH,90,60);ctx.fillRect(-w/2,yy,w*(e.hp/Math.max(1,e.maxHp)),hh);
  }
  ctx.restore();
}

function drawDeathRings(){
  for(const ring of game.deathRings){
    const prog=ring.r/ring.maxR;
    const alpha=Math.max(0.2, 1-prog*0.7);
    ctx.save();
    ctx.shadowColor='#fff'; ctx.shadowBlur=32;
    ctx.strokeStyle='rgba(255,255,255,'+alpha+')'; ctx.lineWidth=8;
    ctx.beginPath(); ctx.arc(ring.x,ring.y,ring.r,0,Math.PI*2); ctx.stroke();
    ctx.shadowBlur=0;
    ctx.strokeStyle='rgba(200,200,210,'+(alpha*0.8)+')'; ctx.lineWidth=3;
    ctx.beginPath(); ctx.arc(ring.x,ring.y,Math.max(0,ring.r-6),0,Math.PI*2); ctx.stroke();
    ctx.strokeStyle='rgba(150,150,160,'+(alpha*0.5)+')'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(ring.x,ring.y,Math.max(0,ring.r-14),0,Math.PI*2); ctx.stroke();
    ctx.restore();
  }
}

function drawBullets(){
  const skullHUD=game.skullFinalPhase;
  for(const b of game.playerBullets){
    ctx.save();
    if(b.bigBall){
      const rr=b.r||20,g=ctx.createRadialGradient(b.x,b.y,0,b.x,b.y,rr);
      g.addColorStop(0,'rgba(220,245,255,0.95)');g.addColorStop(1,'rgba(102,217,255,0.55)');
      ctx.shadowColor='#66d9ff';ctx.shadowBlur=20;ctx.fillStyle=g;
      ctx.beginPath();ctx.arc(b.x,b.y,rr,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle=skullHUD?'rgba(0,0,0,0.8)':'rgba(255,255,255,0.8)';ctx.lineWidth=2;ctx.stroke();
    } else if(b.ringShot){
      ctx.shadowColor='#888';ctx.shadowBlur=10;ctx.fillStyle='rgba(180,180,180,0.9)';
      ctx.beginPath();ctx.arc(b.x,b.y,5,0,Math.PI*2);ctx.fill();
    } else if(b.crescent){
      // V2: indigo crescent bullet. Direction from velocity so it faces its travel
      const ang=Math.atan2(b.vy,b.vx);
      ctx.translate(b.x,b.y); ctx.rotate(ang);
      ctx.shadowColor='#7b6dff'; ctx.shadowBlur=18;
      ctx.fillStyle='#a79bff'; ctx.strokeStyle='#fff'; ctx.lineWidth=1.4;
      ctx.beginPath();
      ctx.arc(0,0,7,-Math.PI*0.75,Math.PI*0.75,false);
      ctx.arc(3,0,5,Math.PI*0.6,-Math.PI*0.6,true);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    } else {
      ctx.shadowColor='#fff';ctx.shadowBlur=14;ctx.fillStyle='#fff';
      ctx.beginPath();ctx.arc(b.x,b.y,3,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='rgba(255,255,255,0.5)';ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(b.x-b.vx*0.02,b.y-b.vy*0.02);ctx.lineTo(b.x,b.y);ctx.stroke();
    }
    ctx.restore();
  }
  for(const b of game.enemyBullets){
    ctx.save();ctx.shadowColor=hsl(b.hue,100,60);ctx.shadowBlur=16;
    const g=ctx.createRadialGradient(b.x,b.y,0,b.x,b.y,b.r);
    g.addColorStop(0,hsl(b.hue,100,80));g.addColorStop(1,hsl(b.hue,100,40));
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#fff';ctx.lineWidth=1.2;ctx.stroke();ctx.restore();
  }
}

function drawParticles(){
  for(const p of game.particles){ctx.globalAlpha=p.life/p.max;ctx.fillStyle=p.color;ctx.fillRect(p.x-2,p.y-2,4,4);}
  ctx.globalAlpha=1;
}

function drawHUD(){
  const p=game.player; if(!p) return;
  ctx.save();
  const skullHUD=game.skullFinalPhase;

  ctx.textAlign='left';
  ctx.fillStyle=skullHUD?'#000':'#fff'; ctx.shadowColor=skullHUD?'rgba(255,255,255,0.9)':'rgba(0,0,0,0.9)'; ctx.shadowBlur=6;
  ctx.font='700 20px Segoe UI,system-ui,sans-serif'; ctx.fillText('WAVE '+game.wave,24,30);
  ctx.font='400 12px Segoe UI,sans-serif'; ctx.fillStyle=skullHUD?'rgba(0,0,0,0.7)':'rgba(255,255,255,0.7)'; ctx.fillText('HIGHEST: '+game.highest,24,48);

  // Points display in endless
  if(game.mode==='endless'){
    ctx.font='400 12px Segoe UI,sans-serif'; ctx.fillStyle=skullHUD?'rgba(0,0,0,0.7)':'rgba(255,220,100,0.9)'; ctx.fillText('POINTS: '+saveData.points,24,66);
  }

  // V2 run timer (top-right)
  {
    const t=Math.floor(game.runTime), mm=Math.floor(t/60), ss=t%60;
    const txt='TIME '+String(mm).padStart(2,'0')+':'+String(ss).padStart(2,'0');
    ctx.textAlign='right';
    ctx.font='700 16px Segoe UI,system-ui,sans-serif';
    ctx.fillStyle=skullHUD?'#000':'#fff';
    ctx.shadowColor=skullHUD?'rgba(255,255,255,0.9)':'rgba(0,0,0,0.9)'; ctx.shadowBlur=6;
    ctx.fillText(txt, BASE_W-24, 30);
    ctx.shadowBlur=0; ctx.textAlign='left';
  }

  // Boss health bars
  const bossEntries=[], pooled=new Set();
  for(const e of game.enemies){
    if(!e.boss||e.hp<=0) continue;
    if(e.sharedBossPool){ if(pooled.has(e.sharedBossPool))continue; pooled.add(e.sharedBossPool); const pool=game.sharedBossPools[e.sharedBossPool]; if(pool)bossEntries.push({label:e.type,hp:pool.hp,maxHp:pool.maxHp}); }
    else bossEntries.push({label:e.type,hp:e.hp,maxHp:e.maxHp});
  }
  if(bossEntries.length){
    ctx.textAlign='center';ctx.fillStyle='#fff';ctx.font='700 18px Segoe UI,system-ui,sans-serif';
    ctx.fillText(bossEntries.length===1?'BOSS':'BOSSES',BASE_W/2,28);
    const barW=280,barH=16; let y=44;
    for(const b of bossEntries){
      const x=BASE_W/2-barW/2;
      ctx.fillStyle='rgba(0,0,0,0.55)';ctx.fillRect(x,y,barW,barH);
      const frac=Math.max(0,Math.min(1,b.hp/Math.max(1,b.maxHp)));
      ctx.fillStyle='#ff6b6b';ctx.fillRect(x,y,barW*frac,barH);
      ctx.strokeStyle='rgba(255,255,255,0.8)';ctx.lineWidth=2;ctx.strokeRect(x,y,barW,barH);
      y+=22;
    }
  }

  // V2 HP bar — semi-thick white outline, color fill, current/max text to the right
  ctx.textAlign='left'; ctx.font='700 14px Segoe UI'; ctx.fillStyle=skullHUD?'#000':'#fff'; ctx.shadowBlur=0;
  ctx.fillText('HP',20,BASE_H-58);
  const hpBarX=20, hpBarY=BASE_H-46, hpBarW=260, hpBarH=22;
  ctx.fillStyle='rgba(0,0,0,0.55)'; ctx.fillRect(hpBarX,hpBarY,hpBarW,hpBarH);
  const hpFrac=Math.max(0,Math.min(1,p.hp/Math.max(1,p.maxHp)));
  ctx.fillStyle=p.color; ctx.shadowColor=p.color; ctx.shadowBlur=14;
  ctx.fillRect(hpBarX,hpBarY,hpBarW*hpFrac,hpBarH);
  ctx.shadowBlur=0;
  ctx.strokeStyle='#fff'; ctx.lineWidth=3; ctx.strokeRect(hpBarX,hpBarY,hpBarW,hpBarH);
  ctx.fillStyle=skullHUD?'#000':'#fff'; ctx.font='700 15px Segoe UI';
  ctx.fillText(Math.max(0,p.hp)+' / '+p.maxHp, hpBarX+hpBarW+12, hpBarY+hpBarH-5);

  // Enemy counter
  const counts={circle:0,triangle:0,arrow:0,hexagon:0,diamond:0,trapezoid:0,octagon:0};
  for(const e of game.enemies) if(counts[e.type]!==undefined) counts[e.type]++;
  const order=['circle','triangle','arrow','hexagon','diamond','trapezoid','octagon'];
  const labels={circle:'Circles',triangle:'Triangles',arrow:'Arrows',hexagon:'Hexagons',diamond:'Diamonds',trapezoid:'Trapezoids',octagon:'Octagons'};
  ctx.textAlign='right'; ctx.font='600 13px Segoe UI';
  for(let i=0;i<order.length;i++){
    const c=counts[order[i]];
    ctx.fillStyle=c>0?(skullHUD?'#000':'#fff'):(skullHUD?'rgba(0,0,0,0.3)':'rgba(255,255,255,0.3)');
    ctx.fillText(labels[order[i]]+': '+c,BASE_W-30,BASE_H-108+i*18);
  }

  // Cooldowns
  drawCooldown(BASE_W/2-50,BASE_H-60,40,'BLOCK',game.block.t/effectiveBlockCooldown(),'#88c4ff');
  const C=CLASSES[p.cls]; let abilRight;
  if(p.cls==='green'){
    for(let i=0;i<C.charges;i++){
      const filled=i<game.ability.charges?1:(i===game.ability.charges?1-(game.ability.t/effectiveAbilityCooldown(p.cls)):0);
      drawCooldown(BASE_W/2+20+i*44,BASE_H-60,40,i===0?'DASH':'',1-filled,p.color);
    }
    abilRight=BASE_W/2+20+C.charges*44;
  } else {
    const prog=game.ability.t>0?game.ability.t/effectiveAbilityCooldown(p.cls):0;
    const labelMap={orange:'PAUSE',white:'INVULN',blue:'ORB',purple:'BURST',red:'DASH',yellow:'SUMMON',pink:'DASH',black:'RING',kite:'TRAIL',crescent:'FORM'};
    drawCooldown(BASE_W/2+20,BASE_H-60,40,labelMap[p.cls]||'SKILL',prog,p.color);
    abilRight=BASE_W/2+64;
  }
  if(game.upgrades.borrowedAbility){
    const bcls=game.upgrades.borrowedAbility,bC=CLASSES[bcls],bColor=bC.color;
    const lm={orange:'PAUSE(T)',white:'INVULN(T)',green:'DASH(T)',blue:'ORB(T)',purple:'BURST(T)',red:'DASH(T)',yellow:'SUMMON(T)',pink:'DASH(T)',black:'RING(T)'};
    if(bcls==='green'){
      for(let i=0;i<game.borrowed.maxCharges;i++){const f=i<game.borrowed.charges?1:(i===game.borrowed.charges?1-(game.borrowed.t/effectiveBorrowedCooldown(bcls)):0);drawCooldown(abilRight+i*44,BASE_H-60,40,i===0?lm[bcls]:'',1-f,bColor);}
    } else {
      const prog2=game.borrowed.t>0?game.borrowed.t/effectiveBorrowedCooldown(bcls):0;
      drawCooldown(abilRight,BASE_H-60,40,lm[bcls]||'',prog2,bColor);
    }
  }
  ctx.restore();
}

function drawCooldown(x,y,size,label,progress,color){
  ctx.save(); ctx.fillStyle='rgba(0,0,0,0.55)'; ctx.fillRect(x,y,size,size);
  const fill=clamp(1-progress,0,1),fh=size*fill;
  ctx.fillStyle=progress>0?color+'88':color;
  if(progress===0){ctx.shadowColor=color;ctx.shadowBlur=14;}
  ctx.fillRect(x,y+size-fh,size,fh); ctx.shadowBlur=0;
  ctx.strokeStyle=progress===0?'#fff':'rgba(255,255,255,0.4)'; ctx.lineWidth=2; ctx.strokeRect(x,y,size,size);
  if(label){ctx.fillStyle='#fff';ctx.font='600 10px Segoe UI';ctx.textAlign='center';ctx.fillText(label,x+size/2,y+size+12);}
  ctx.restore();
}
