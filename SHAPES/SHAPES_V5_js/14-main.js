
// ============================================================
// MAIN LOOP
// ============================================================
let lastT = 0;

function frame(now){
  const dt = Math.min(0.033, lastT ? (now-lastT)/1000 : 0);
  lastT = now;

  if(!paused && (game.state==='playing'||game.state==='wavebreak')){
    updatePlayer(dt);
    updateEnemies(dt);
    updateBullets(dt);
    updateHexTriangles(dt);
    updateDeathRings(dt);
    updateParticles(dt);
    updateWave(dt);
    game.runTime+=dt;

    if(game.timeFreezeT<=0) game.timeScale=1;
    if(game.shake>0) game.shake-=dt*30;
    if(game.flash>0) game.flash-=dt;
  }

  // Clear
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // Shake offset
  const sx=(Math.random()-0.5)*game.shake;
  const sy=(Math.random()-0.5)*game.shake;
  const scale=screenScale();
  ctx.setTransform(1,0,0,1,sx*scale,sy*scale);

  drawBackground(dt);

  // Scale to game coordinates
  ctx.save();
  ctx.scale(scale,scale);

  for(const e of game.enemies) drawEnemy(e);
  drawHexTriangles();
  drawBullets();
  drawDeathRings();
  drawParticles();
  drawPlayer();

  if(game.timeFreezeT>0){
    ctx.fillStyle='rgba(255,140,42,0.12)';
    ctx.fillRect(0,0,BASE_W,BASE_H);
  }
  if(game.flash>0){
    ctx.fillStyle='rgba(255,80,80,'+(game.flash*0.5)+')';
    ctx.fillRect(0,0,BASE_W,BASE_H);
  }

  drawHUD();

  ctx.restore();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

function togglePause(){
  paused=!paused;
  const ov=document.getElementById('pauseOverlay');
  if(paused){ renderPauseOverlay(); ov.style.display='flex'; }
  else { ov.style.display='none'; }
}
function renderPauseOverlay(){
  const upEl=document.getElementById('pauseUpgrades');
  const rows=[];
  for(const [key,val] of Object.entries(game.upgrades)){
    if(val===false||val===null||val===0) continue;
    rows.push('<div class="pu-row"><b>'+key+'</b><span>'+val+'</span></div>');
  }
  if(!rows.length) rows.push('<div class="pu-row"><b>None yet</b><span>—</span></div>');
  upEl.innerHTML=rows.join('');

  const stEl=document.getElementById('pauseStats');
  const t=Math.floor(game.runTime), mm=String(Math.floor(t/60)).padStart(2,'0'), ss=String(t%60).padStart(2,'0');
  stEl.innerHTML=
    '<div class="ps-row"><b>Run time</b><span>'+mm+':'+ss+'</span></div>'
   +'<div class="ps-row"><b>Wave</b><span>'+game.wave+'</span></div>'
   +'<div class="ps-row"><b>Enemies defeated</b><span>'+game.stats.enemiesKilled+'</span></div>'
   +'<div class="ps-row"><b>Bosses defeated</b><span>'+game.stats.bossesKilled+'</span></div>'
   +'<div class="ps-row"><b>Bullet damage</b><span>'+game.stats.bulletDamage+'</span></div>'
   +'<div class="ps-row"><b>Skill damage</b><span>'+game.stats.skillDamage+'</span></div>';

  const pv=document.getElementById('pauseVol');
  if(pv){ pv.value=Math.round(saveData.options.masterVolume*100); document.getElementById('pauseVolVal').textContent=pv.value+'%'; }
}
