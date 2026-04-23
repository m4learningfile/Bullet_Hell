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
  updateEnemyDeathRings(dt);
  updateUnlockBanners(dt);
    updateParticles(dt);
    updateWave(dt);
    game.runTime+=dt;

    if(game.timeFreezeT<=0) game.timeScale=1;
    if(game.shake>0) game.shake-=dt*30;
    if(game.flash>0) game.flash-=dt;
  }

  updateCamera();

  // Clear
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // Shake offset + BASE→canvas scale baked in
  const sx=(Math.random()-0.5)*game.shake;
  const sy=(Math.random()-0.5)*game.shake;
  const scale=screenScale();
  ctx.setTransform(scale,0,0,scale,sx*scale,sy*scale);

  // World pass
  ctx.save();
  ctx.translate(-camera.x, -camera.y);

  drawBackground(dt);

  for(const e of game.enemies) drawEnemy(e);
  drawHexTriangles();
  drawBullets();
  drawDeathRings();
  drawEnemyDeathRings();
  drawParticles();
  drawPlayer();

  if(game.timeFreezeT>0){
    ctx.fillStyle='rgba(255,140,42,0.12)';
    ctx.fillRect(0,0,WORLD_W,WORLD_H);
  }
  if(game.flash>0){
    ctx.fillStyle='rgba(255,80,80,'+(game.flash*0.5)+')';
    ctx.fillRect(0,0,WORLD_W,WORLD_H);
  }

  ctx.restore();

  // Screen-space HUD + crosshair
  drawHUD();
  drawCrosshair();

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
  const ps=document.getElementById('pauseScaling');
  if(ps){
    const sc=getEnemyRunScale();
    ps.innerHTML='<span class="pause-scale-num">Enemy HP scaling: '+sc.hp.toFixed(2)+'x</span> · '
      +'<span class="pause-scale-num">Enemy move scaling: '+sc.speed.toFixed(2)+'x</span> · '
      +'<span class="pause-scale-num">Enemy damage: '+getIncomingEnemyDamage()+'</span>';
  }
}

// ============================================================
// MENU
// ============================================================

const modeDescriptions = {
  intro:    'Intro Mode: fixed teaching waves 1–10. Normal enemies only, then the run ends.',
  endless:  'Endless Mode: random point-budget waves with rotating maps and music. Boss kills earn shop points. Wave 50: Skull.',
  gauntlet: 'Boss Gauntlet: fight each boss type once. Start with 3 boons, gain 3 after each round.',
};

const difficultyDescriptions = {
  easy:   'Easy (0.5x): 80% chance per wave to spawn a green health pack. Killing it restores 10 HP.',
  normal: 'Normal (1.0x): 50% chance per wave to spawn a green health pack.',
  hard:   'Hard (1.5x): 25% chance per wave to spawn a green health pack.',
  insane: 'Insane (2.0x): Enemies at double power. No health packs spawn — the only way to survive is to not get hit.',
};

// ---- CLASS GRID ----
const CLASS_ORDER = ['orange','white','green','blue','purple','red','yellow','pink','black','kite','crescent'];

function classShapeSVG(cls, unlocked){
  if(unlocked===undefined) unlocked=true;
  const c=unlocked?CLASSES[cls].color:'#151515';
  const stroke=unlocked?'#fff':'#333';
  switch(cls){
    case 'orange': return '<svg width="48" height="48" viewBox="0 0 48 48"><rect x="8" y="8" width="32" height="32" fill="'+c+'" stroke="'+stroke+'" stroke-width="2"/></svg>';
    case 'white':  return '<svg width="48" height="48" viewBox="0 0 48 48"><polygon points="24,4 29,18 44,18 32,28 36,44 24,34 12,44 16,28 4,18 19,18" fill="'+c+'" stroke="'+stroke+'" stroke-width="'+(unlocked?0:2)+'"/></svg>';
    case 'green':  return '<svg width="48" height="48" viewBox="0 0 48 48"><polygon points="24,4 44,38 24,28 4,38" fill="'+c+'" stroke="'+stroke+'" stroke-width="2"/></svg>';
    case 'blue':   return '<svg width="48" height="48" viewBox="0 0 48 48"><circle cx="24" cy="24" r="16" fill="'+c+'" stroke="'+stroke+'" stroke-width="2"/></svg>';
    case 'purple': return '<svg width="48" height="48" viewBox="0 0 48 48"><polygon points="24,4 38,10 44,24 38,38 24,44 10,38 4,24 10,10" fill="'+c+'" stroke="'+stroke+'" stroke-width="2"/></svg>';
    case 'red':    return '<svg width="48" height="48" viewBox="0 0 48 48"><polygon points="14,12 34,12 42,38 6,38" fill="'+c+'" stroke="'+stroke+'" stroke-width="2"/></svg>';
    case 'yellow': return '<svg width="48" height="48" viewBox="0 0 48 48"><polygon points="24,4 42,14 42,34 24,44 6,34 6,14" fill="'+c+'" stroke="'+stroke+'" stroke-width="2"/></svg>';
    case 'pink':   return '<svg width="48" height="48" viewBox="0 0 48 48"><polygon points="24,6 42,40 6,40" fill="'+c+'" stroke="'+stroke+'" stroke-width="2"/></svg>';
    case 'kite': {
      // Kite diamond (elongated) with a tail
      if(!unlocked) return '<svg width="48" height="48" viewBox="0 0 48 48"><polygon points="24,4 40,22 24,44 8,22" fill="#151515" stroke="#333" stroke-width="2"/></svg>';
      return '<svg width="48" height="48" viewBox="0 0 48 48"><polygon points="24,4 40,22 24,44 8,22" fill="'+c+'" stroke="#fff" stroke-width="2"/><line x1="24" y1="44" x2="24" y2="48" stroke="'+c+'" stroke-width="2"/></svg>';
    }
    case 'crescent': {
      if(!unlocked) return '<svg width="48" height="48" viewBox="0 0 48 48"><path d="M 34 24 A 14 14 0 1 1 14 14 A 10 10 0 1 0 34 24 Z" fill="#151515" stroke="#333" stroke-width="2"/></svg>';
      return '<svg width="48" height="48" viewBox="0 0 48 48"><path d="M 34 24 A 14 14 0 1 1 14 14 A 10 10 0 1 0 34 24 Z" fill="'+c+'" stroke="#fff" stroke-width="2"/></svg>';
    }
    case 'black': {
      const r=18, cx=24, cy=24;
      const dome='M '+(cx-r*0.85)+','+(cy-r*0.1)+' A '+(r*0.85)+','+(r*0.85)+' 0 0 1 '+(cx+r*0.85)+','+(cy-r*0.1)+' L '+(cx+r*0.55)+','+(cy+r*0.45)+' L '+(cx+r*0.25)+','+(cy+r*0.45)+' L '+(cx+r*0.2)+','+(cy+r*0.75)+' L '+(cx-r*0.2)+','+(cy+r*0.75)+' L '+(cx-r*0.25)+','+(cy+r*0.45)+' L '+(cx-r*0.55)+','+(cy+r*0.45)+' Z';
      if(!unlocked){
        return '<svg width="48" height="48" viewBox="0 0 48 48"><path d="'+dome+'" fill="#151515" stroke="#333" stroke-width="2"/></svg>';
      }
      const leftEyeX=cx-r*0.35, rightEyeX=cx+r*0.35, eyeY=cy-r*0.15, eyeR=r*0.22, pupR=r*0.1;
      const noseX1=cx-r*0.08, noseX2=cx+r*0.08, noseY1=cy+r*0.25, noseY2=cy+r*0.1;
      return '<svg width="48" height="48" viewBox="0 0 48 48">'
        +'<path d="'+dome+'" fill="#d8d8d8" stroke="#fff" stroke-width="1.5"/>'
        +'<circle cx="'+leftEyeX+'" cy="'+eyeY+'" r="'+eyeR+'" fill="#fff"/>'
        +'<circle cx="'+rightEyeX+'" cy="'+eyeY+'" r="'+eyeR+'" fill="#fff"/>'
        +'<circle cx="'+leftEyeX+'" cy="'+eyeY+'" r="'+pupR+'" fill="#000"/>'
        +'<circle cx="'+rightEyeX+'" cy="'+eyeY+'" r="'+pupR+'" fill="#000"/>'
        +'<polyline points="'+noseX1+','+noseY1+' '+cx+','+noseY2+' '+noseX2+','+noseY1+'" fill="none" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>'
        +'</svg>';
    }
    default: return '';
  }
}

function renderClassGrid(){
  const grid=document.getElementById('classGrid');
  grid.innerHTML='';
  for(const cls of CLASS_ORDER){
    const info=CLASS_INFO[cls];
    const unlocked=isUnlocked(cls);
    const div=document.createElement('div');
    div.className='cls '+cls+(unlocked?'':' locked')+(cls==='orange'?' active':'');
    div.setAttribute('data-class',cls);

    const shape=document.createElement('div');
    shape.className='shape';
    shape.innerHTML=classShapeSVG(cls,unlocked);

    const nameEl=document.createElement('h3');
    nameEl.textContent=unlocked?info.name:'??? 🔒';

    const hpEl=document.createElement('p');
    hpEl.className='hp';
    hpEl.textContent=unlocked?('HP: '+info.hp):'HP: ?';

    div.appendChild(shape);
    div.appendChild(nameEl);
    div.appendChild(hpEl);

    if(unlocked){
      div.addEventListener('click',()=>startGameWithClass(cls));
      div.addEventListener('mouseenter',()=>updateClassPreview(cls));
    } else {
      div.addEventListener('click',()=>showInfoModal('???',info.unlockHint,null));
      div.addEventListener('mouseenter',()=>updateClassPreview(null));
    }

    div.addEventListener('contextmenu',e=>{
      e.preventDefault();
      if(unlocked) showInfoModal(info.name,null,info.skillBrief);
      else showInfoModal('???',info.unlockHint,null);
    });

    grid.appendChild(div);
  }
  updateClassPreview('orange');
}

function updateClassPreview(cls){
  const shapeEl=document.getElementById('previewShape');
  const nameEl=document.getElementById('previewName');
  const descEl=document.getElementById('previewDesc');
  if(!shapeEl||!nameEl||!descEl) return;
  if(!cls||!isUnlocked(cls)){
    shapeEl.innerHTML='<div style="font-size:48px;opacity:0.4;">???</div>';
    nameEl.textContent='LOCKED';
    descEl.textContent='Defeat the required boss or mode to unlock this class.';
    return;
  }
  const info=CLASS_INFO[cls];
  shapeEl.innerHTML=classShapeSVG(cls,true);
  nameEl.textContent=info.name;
  descEl.textContent=info.previewLong||info.skillBrief;
}

// ---- SHOP ----
function renderShopLines(){
  const shopPts=document.getElementById('shopPoints');
  const upgPts=document.getElementById('upgradesPointsLabel');
  const pts=effectivePoints();
  if(shopPts) shopPts.textContent=pts;
  if(upgPts) upgPts.textContent=pts;
  const container=document.getElementById('shopLines');
  if(!container) return;
  container.innerHTML='';
  const du=saveData.disabledUpgrades||{};
  for(const [key,tier] of Object.entries(PRE_RUN_TIERS)){
    const currentLevel=saveData.preRunUpgrades[key]||0;
    const maxLevel=tier.costs.length-1;
    const disabled=!!du[key];

    const line=document.createElement('div');
    line.className='shop-line';

    const label=document.createElement('div');
    label.className='shop-label';
    label.textContent=tier.label+' ('+currentLevel+'/'+maxLevel+')'+(currentLevel&&disabled?' — disabled':'');
    line.appendChild(label);

    const desc=document.createElement('div');
    desc.className='shop-desc';
    desc.textContent=tier.desc || '';
    line.appendChild(desc);

    const tiers=document.createElement('div');
    tiers.className='shop-tiers';

    for(let i=1;i<=maxLevel;i++){
      const btn=document.createElement('div');
      btn.className='shop-tier';
      if(i<=currentLevel){
        btn.classList.add('owned');
        if(disabled) btn.classList.add('disabled');
        btn.textContent=disabled?'✕':'✓';
        btn.title='Click to '+(disabled?'enable':'disable')+' this upgrade for your next run.';
        btn.addEventListener('click',()=>{
          saveData.disabledUpgrades[key]=!disabled;
          saveSave();
          renderShopLines();
        });
      } else if(i===currentLevel+1){
        const cost=tier.costs[i];
        btn.classList.add('next-tier');
        btn.textContent=cost+'pt';
        if(pts>=cost){
          btn.classList.add('affordable');
          btn.addEventListener('click',()=>{
            if(!saveData.adminMode) saveData.points-=cost;
            saveData.preRunUpgrades[key]=i;
            saveSave();
            renderShopLines();
          });
        }
      } else {
        btn.textContent=tier.costs[i]+'pt';
        btn.classList.add('locked-tier');
      }
      tiers.appendChild(btn);
    }
    line.appendChild(tiers);
    container.appendChild(line);
  }
}

// ---- INFO MODAL ----
function showInfoModal(name,unlockHint,skill){
  document.getElementById('infoModalTitle').textContent=name;
  let body='';
  if(unlockHint) body+='<b>Unlock:</b> '+unlockHint;
  if(skill){ if(body) body+='<br><br>'; body+=skill; }
  if(!body) body='<i>???</i>';
  document.getElementById('infoModalBody').innerHTML=body;
  document.getElementById('infoModal').style.display='flex';
}
document.getElementById('infoModalClose').addEventListener('click',()=>{
  document.getElementById('infoModal').style.display='none';
});

// ---- MODE BUTTONS ----
document.querySelectorAll('[data-mode]').forEach(btn=>{
  btn.addEventListener('click',()=>{
    const m=btn.getAttribute('data-mode');
    if(m==='endless'&&!isEndlessUnlocked()){
      showInfoModal('ENDLESS MODE','Beat Intro Mode with Square.',null);
      return;
    }
    game.mode=m;
    document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('active',b===btn));
    document.getElementById('modeDesc').textContent=modeDescriptions[game.mode];

    const easyBtn=document.querySelector('[data-difficulty="easy"]');
    if(game.mode==='gauntlet'){
      easyBtn.style.display='none';
      if(game.difficulty==='easy'){
        game.difficulty='normal';
        game.difficultySettings=DIFFICULTIES.normal;
        document.querySelectorAll('[data-difficulty]').forEach(b=>b.classList.toggle('active',b.getAttribute('data-difficulty')==='normal'));
      }
      document.getElementById('difficultyDesc').textContent=difficultyDescriptions[game.difficulty];
    } else {
      easyBtn.style.display='';
      document.getElementById('difficultyDesc').textContent=difficultyDescriptions[game.difficulty];
    }
  });
});

// ---- DIFFICULTY BUTTONS ----
document.querySelectorAll('[data-difficulty]').forEach(btn=>{
  btn.addEventListener('click',()=>{
    game.difficulty=btn.getAttribute('data-difficulty');
    game.difficultySettings=DIFFICULTIES[game.difficulty];
    document.querySelectorAll('[data-difficulty]').forEach(b=>b.classList.toggle('active',b===btn));
    if(game.mode==='gauntlet'){
      document.getElementById('difficultyDesc').textContent=difficultyDescriptions[game.difficulty];
    } else {
      document.getElementById('difficultyDesc').textContent=difficultyDescriptions[game.difficulty];
    }
  });
});

// ---- NAV BUTTONS ----
document.getElementById('continueToClass').addEventListener('click',()=>{
  showMenuStep('classStep');
  renderClassGrid();
  renderShopLines();
});

document.getElementById('backToMode').addEventListener('click',()=>{
  showMenuStep('modeStep');
});

// ---- START GAME ----
function startGameWithClass(cls){
  Audio.init();
  Audio.setSong('menu');
  // V2: Select soundtrack per mode
  if(game.mode==='gauntlet') Audio.setSong('gauntlet');
  else if(game.mode==='endless'){
    const pool=['endless1','endless2','endless3'];
    Audio.setSong(pool[Math.floor(Math.random()*pool.length)]);
  } else Audio.setSong('intro');
  game.chosenClass=cls;
  game.player=makePlayer(cls);
  game.upgrades={ hp:0,damage:0,shots:0,skillCooldown:0,blockCooldown:0,skillDamage:0,moveSpeed:0,blueBallSize:0,octaDuration:0,revive:0,pierce:false,bounce:false,betterBoons:false,borrowedAbility:null };
  if(cls==='pink') game.upgrades.shots=2; // Triangle starts with 2 extra bullet streams
  game.legendariesOwned=new Set();
  game.borrowed={ cls:null,t:0,active:0,charges:0,maxCharges:0 };
  game.totalUpgrades=0; game.bossesDefeated=0; game.boonHistory=[];
  game.hexTriangles=[]; game.yellowTriHpBonus=0; game.deathRings=[];
  game.enemies=[]; game.playerBullets=[]; game.enemyBullets=[]; game.particles=[];
  game.preRunBonus={ damage:0,skillDamage:0,hp:0,skillCooldown:0,moveSpeed:0,blockCooldown:0 };
  game.sharedBossPools={};
  game.skullFinalPhase=false; game.skullWarnTimer=0; game.skullWarnCount=0; game.skullFlash=0;
  game.octagonPendingSpawn=null; game.octagonWarnTimer=0;

  if(cls==='green'){
    game.ability.charges=CLASSES.green.charges;
    game.ability.maxCharges=CLASSES.green.charges;
    game.ability.t=0;
  } else {
    game.ability.charges=1; game.ability.maxCharges=1; game.ability.t=0;
  }
  game.block.t=0; game.block.active=0;
  paused=false;
  game.runTime=0;
  game.stats={ enemiesKilled:0, bossesKilled:0, bulletDamage:0, skillDamage:0 };
  document.getElementById('pauseOverlay').style.display='none';

  document.getElementById('menu').style.display='none';

  if(game.mode==='gauntlet'){
    if(game.difficulty==='easy'){
      game.difficulty='normal';
      game.difficultySettings=DIFFICULTIES.normal;
    }
    game.pendingBoonPicks=3;
    game.pendingAfterBoons='start';
    game.pendingNextWave=1;
    openBoonMenu();
  } else {
    startWave(1);
  }
}

// ---- TITLE / COMPENDIUM / OPTIONS ----
function showMenuStep(which){
  for(const id of ['titleStep','compendiumStep','optionsStep','modeStep','classStep','upgradesStep','memoryHallStep']){
    const el=document.getElementById(id);
    if(el) el.style.display=(id===which)?'block':'none';
  }
  if(which!=='classStep' && which!=='upgradesStep' && game.state==='menu'){
    try{ Audio.setSong('menu'); }catch(_){}
  }
}

document.getElementById('btnPlay').addEventListener('click',()=>showMenuStep('modeStep'));
document.getElementById('btnCompendium').addEventListener('click',()=>{ renderCompendium('classes'); showMenuStep('compendiumStep'); });
document.getElementById('btnMemoryHall').addEventListener('click',()=>{ renderMemoryHall(); showMenuStep('memoryHallStep'); });
document.getElementById('btnOptions').addEventListener('click',()=>showMenuStep('optionsStep'));
document.getElementById('backFromMemoryHall').addEventListener('click',()=>showMenuStep('titleStep'));
document.getElementById('backFromCompendium').addEventListener('click',()=>showMenuStep('titleStep'));
document.getElementById('backFromOptions').addEventListener('click',()=>showMenuStep('titleStep'));
document.getElementById('backToTitle').addEventListener('click',()=>showMenuStep('titleStep'));

// Compendium
document.querySelectorAll('.comp-tab').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('.comp-tab').forEach(b=>b.classList.toggle('active',b===btn));
    renderCompendium(btn.getAttribute('data-comp'));
  });
});

function renderCompendium(tab){
  const container=document.getElementById('compendiumContent');
  container.innerHTML='';
  if(tab==='classes'){
    for(const cls of CLASS_ORDER){
      const info=CLASS_INFO[cls];
      const unlocked=isUnlocked(cls);
      const entry=document.createElement('div');
      entry.className='comp-entry'+(unlocked?'':' locked');
      const shape=document.createElement('div'); shape.className='shape'; shape.innerHTML=classShapeSVG(cls,unlocked);
      const body=document.createElement('div'); body.className='comp-entry-body';
      if(unlocked){
        const cdStr=(typeof info.skillCooldown==='number')?(info.skillCooldown+'s'):info.skillCooldown;
        body.innerHTML=
          '<h4>'+info.name+'</h4>'
          +'<div class="comp-stats">'
            +'<div><b>Difficulty:</b> '+info.difficulty+'</div>'
            +'<div><b>Health:</b> '+info.hp+'</div>'
            +'<div><b>Class Type:</b> '+info.classType+'</div>'
            +'<div><b>Bullet Damage:</b> '+info.bulletDamage+'</div>'
            +'<div><b>Skill Damage:</b> '+info.skillDamage+'</div>'
            +'<div><b>Skill Cooldown:</b> '+cdStr+'</div>'
          +'</div>'
          +'<p><b>'+info.skillName+':</b> '+info.skillDescription+'</p>'
          +'<p class="quirks"><b>Special Quirks:</b> '+info.quirks+'</p>';
      } else {
        body.innerHTML='<h4>??? 🔒</h4><div class="meta">HP: ?</div><p><b>Unlock:</b> '+info.unlockHint+'</p>';
      }
      entry.appendChild(shape); entry.appendChild(body);
      container.appendChild(entry);
    }
  } else if(tab==='enemies'){
    for(const type of Object.keys(ENEMY_INFO)){
      const info=ENEMY_INFO[type];
      const def=ENEMY_DEFS[type];
      const entry=document.createElement('div');
      entry.className='comp-entry';
      const shape=document.createElement('div'); shape.className='shape'; shape.innerHTML=enemyShapeSVG(type);
      const body=document.createElement('div'); body.className='comp-entry-body';
      body.innerHTML=
        '<h4>'+info.name+'</h4>'
        +'<div class="comp-stats">'
          +'<div><b>Category:</b> '+info.category+'</div>'
          +'<div><b>Health:</b> '+def.hp+'</div>'
          +'<div><b>Speed:</b> '+def.speed+'</div>'
          +'<div><b>Wave Cost:</b> '+info.cost+' pt</div>'
        +'</div>'
        +'<p>'+info.desc+'</p>';
      entry.appendChild(shape); entry.appendChild(body);
      container.appendChild(entry);
    }
  } else if(tab==='bosses'){
    for(const type of Object.keys(BOSS_INFO)){
      const info=BOSS_INFO[type];
      const def=ENEMY_DEFS[type];
      const unlocked=isBossUnlocked(type);
      const entry=document.createElement('div');
      entry.className='comp-entry'+(unlocked?'':' locked');
      const shape=document.createElement('div'); shape.className='shape';
      shape.innerHTML=unlocked?enemyShapeSVG(type):enemyShapeSVGLocked(type);
      const body=document.createElement('div'); body.className='comp-entry-body';
      if(unlocked){
        body.innerHTML=
          '<h4>'+info.name+'</h4>'
          +'<div class="comp-stats">'
            +'<div><b>Threat:</b> '+info.difficulty+'</div>'
            +'<div><b>Base HP:</b> '+def.hp+'</div>'
            +'<div><b>Speed:</b> '+def.speed+'</div>'
          +'</div>'
          +'<p>'+info.desc+'</p>'
          +'<p class="quirks"><b>Tips:</b> '+info.tips+'</p>';
      } else {
        body.innerHTML='<h4>??? 🔒</h4><div class="meta">Unknown threat</div><p><b>Unlock:</b> Defeat this boss at least once.</p>';
      }
      entry.appendChild(shape); entry.appendChild(body);
      container.appendChild(entry);
    }
  } else if(tab==='boons'){
    const STAT_BOON_ORDER = ['damage','hp','skillDamage','skillCooldown','blockCooldown','moveSpeed'];
    const BOON_COMP_DESC = {
      damage:        r => '+'+r.value+' bullet damage.',
      hp:            r => '+'+r.value+' max health. (Class variants: Star is fixed 1 HP; Hexagon also buffs triangle allies by +'+(r.value*2)+' HP.)',
      skillDamage:   r => '+'+(r.value*3)+' damage to damaging abilities. Scales differently per class — Circle ×3, Skull ×5, Pink gains dash range, Purple gains burst duration, Trapezoid none.',
      skillCooldown: r => 'Adds '+r.value+' stack'+(r.value>1?'s':'')+' of 10% ability cooldown reduction (diminishing). Blue instead grows Big Ball size; Kite lengthens ghost trail.',
      blockCooldown: r => 'Adds '+r.value+' stack'+(r.value>1?'s':'')+' of 10% block cooldown reduction (diminishing).',
      moveSpeed:     r => '+'+(10*r.value)+'% movement speed.',
      shots:         r => '+1 extra projectile stream (max 4). Hexagon gains +1 triangle ally instead.',
    };
    const sectionHeader = txt => {
      const h=document.createElement('div');
      h.style.cssText='font-size:13px;letter-spacing:2px;color:#9cf;margin:10px 0 4px;padding-top:6px;border-top:1px solid #2a2e3c;';
      h.textContent=txt; return h;
    };
    const renderBoonEntry = (key, tiers) => {
      const def=BOON_DEFS[key];
      const entry=document.createElement('div');
      entry.className='comp-entry';
      const shape=document.createElement('div'); shape.className='shape';
      const n = tiers.length;
      const swatches = tiers.map((tier,i)=>{
        let cx, r;
        if(n===1){ cx=24; r=14; }
        else if(n===3){ cx=12+i*12; r=8; }
        else { cx=8+i*11; r=5.5; }
        return '<circle cx="'+cx+'" cy="24" r="'+r+'" fill="'+RARITY_DEFS[tier].color+'" stroke="#000" stroke-width="1"/>';
      }).join('');
      shape.innerHTML='<svg width="48" height="48" viewBox="0 0 48 48">'+swatches+'</svg>';
      const body=document.createElement('div'); body.className='comp-entry-body';
      let html='<h4>'+def.title.toUpperCase()+'</h4>';
      for(const tier of tiers){
        const rd=RARITY_DEFS[tier];
        html+='<p><b style="color:'+rd.color+'">'+rd.label+':</b> '+BOON_COMP_DESC[key](rd)+'</p>';
      }
      body.innerHTML=html;
      entry.appendChild(shape); entry.appendChild(body);
      container.appendChild(entry);
    };
    container.appendChild(sectionHeader('STAT BOONS'));
    for(const key of STAT_BOON_ORDER){
      renderBoonEntry(key, ['common','rare','epic','legendary']);
    }
    const emptyNote = () => {
      const d=document.createElement('div');
      d.style.cssText='padding:10px 0;opacity:0.5;font-size:12px;font-style:italic;';
      d.textContent='None yet.';
      return d;
    };
    container.appendChild(sectionHeader('COMMON BOONS'));
    container.appendChild(emptyNote());
    container.appendChild(sectionHeader('RARE BOONS'));
    container.appendChild(emptyNote());
    container.appendChild(sectionHeader('EPIC BOONS'));
    renderBoonEntry('shots', ['epic']);
    container.appendChild(sectionHeader('LEGENDARY BOONS'));
    const legColor = RARITY_DEFS.legendary.color;
    for(const key of LEGENDARY_KEYS){
      if(!UNIQUE_LEGENDARY_KEYS.has(key)) continue;
      const def=LEGENDARY_DEFS[key];
      const entry=document.createElement('div');
      entry.className='comp-entry';
      const shape=document.createElement('div'); shape.className='shape';
      shape.innerHTML='<svg width="48" height="48" viewBox="0 0 48 48"><polygon points="24,4 44,24 24,44 4,24" fill="'+legColor+'" stroke="#000" stroke-width="1.5"/></svg>';
      const body=document.createElement('div'); body.className='comp-entry-body';
      body.innerHTML='<h4>'+def.title.toUpperCase()+'</h4>'
        +'<div class="meta"><span style="color:'+legColor+'">LEGENDARY</span></div>'
        +'<p>'+def.desc+'</p>';
      entry.appendChild(shape); entry.appendChild(body);
      container.appendChild(entry);
    }
  }
}

function enemyShapeSVGLocked(type){
  return enemyShapeSVG(type).replace(/fill="[^"]+"/g,'fill="#151515"').replace(/stroke="#fff"/g,'stroke="#333"');
}

// V2: Memory Hall
function formatRunTime(secs){
  const s=Math.max(0,secs|0), mm=String(Math.floor(s/60)).padStart(2,'0'), ss=String(s%60).padStart(2,'0');
  return mm+':'+ss;
}
function renderRunStatsHTML(run, heading){
  if(!run) return '<h4>'+heading+'</h4><div style="opacity:0.6;">No run recorded yet.</div>';
  return '<h4>'+heading+'</h4>'
    +'<div class="mh-row-stat"><b>Class</b><span>'+(run.cls?CLASS_INFO[run.cls].name:CLASS_INFO[game.chosenClass||'orange'].name)+'</span></div>'
    +'<div class="mh-row-stat"><b>Wave</b><span>'+run.wave+'</span></div>'
    +'<div class="mh-row-stat"><b>Mode</b><span>'+run.mode.toUpperCase()+'</span></div>'
    +'<div class="mh-row-stat"><b>Difficulty</b><span>'+run.difficulty.toUpperCase()+'</span></div>'
    +'<div class="mh-row-stat"><b>Run time</b><span>'+formatRunTime(run.time)+'</span></div>'
    +'<div class="mh-row-stat"><b>Enemies defeated</b><span>'+(run.enemiesKilled||0)+'</span></div>'
    +'<div class="mh-row-stat"><b>Bosses defeated</b><span>'+(run.bossesKilled||0)+'</span></div>'
    +'<div class="mh-row-stat"><b>Bullet damage</b><span>'+(run.bulletDamage||0)+'</span></div>'
    +'<div class="mh-row-stat"><b>Skill damage</b><span>'+(run.skillDamage||0)+'</span></div>'
    +(run.date?'<div class="mh-row-stat"><b>Date</b><span>'+run.date+'</span></div>':'');
}
function renderMemoryHall(){
  const be=saveData.bestEndless;
  document.getElementById('mhBestNum').textContent=be?be.wave:'—';
  document.getElementById('mhBestStats').innerHTML=renderRunStatsHTML(be,'BEST ENDLESS RUN');
  document.getElementById('mhSelectedStats').innerHTML='<h4>SELECTED RUN</h4><div style="opacity:0.6;">Click a class tile below to view its best run.</div>';

  const row1=document.getElementById('mhRow1');
  const row2=document.getElementById('mhRow2');
  row1.innerHTML=''; row2.innerHTML='';
  const half=Math.ceil(CLASS_ORDER.length/2);
  CLASS_ORDER.forEach((cls,i)=>{
    const info=CLASS_INFO[cls];
    const unlocked=isUnlocked(cls);
    const run=saveData.classBestRuns[cls];
    const tile=document.createElement('div');
    tile.className='mh-tile'+(run?'':' empty');
    tile.innerHTML=
      '<div class="shape">'+classShapeSVG(cls,unlocked)+'</div>'
      +'<div class="mh-name">'+(unlocked?info.name:'???')+'</div>'
      +'<div class="mh-wave">'+(run?('WAVE '+run.wave):'— no run —')+'</div>'
      +'<div class="mh-mode">'+(run?run.mode+' · '+run.difficulty:'')+'</div>';
    tile.addEventListener('click',()=>{
      document.querySelectorAll('.mh-tile').forEach(t=>t.classList.remove('selected'));
      tile.classList.add('selected');
      const label=(unlocked?info.name:'LOCKED')+' — BEST RUN';
      if(run){ document.getElementById('mhSelectedStats').innerHTML=renderRunStatsHTML({...run,cls},label); }
      else { document.getElementById('mhSelectedStats').innerHTML='<h4>'+label+'</h4><div style="opacity:0.6;">'+(unlocked?'No run recorded yet for this class.':'Unlock this class to start setting records.')+'</div>'; }
    });
    (i<half?row1:row2).appendChild(tile);
  });
}

function enemyShapeSVG(type){
  const D=ENEMY_DEFS[type], hue=(D.color[0]+D.color[1])/2;
  const c=hsl(hue,70,55);
  switch(type){
    case 'circle':   return '<svg width="48" height="48" viewBox="0 0 48 48"><circle cx="24" cy="24" r="14" fill="'+c+'" stroke="#fff" stroke-width="1.5"/></svg>';
    case 'triangle': return '<svg width="48" height="48" viewBox="0 0 48 48"><polygon points="24,8 40,38 8,38" fill="'+c+'" stroke="#fff" stroke-width="1.5"/></svg>';
    case 'arrow':    return '<svg width="48" height="48" viewBox="0 0 48 48"><polygon points="24,6 42,38 24,30 6,38" fill="'+c+'" stroke="#fff" stroke-width="1.5"/></svg>';
    case 'hexagon':  return '<svg width="48" height="48" viewBox="0 0 48 48"><polygon points="24,6 40,15 40,33 24,42 8,33 8,15" fill="'+c+'" stroke="#fff" stroke-width="1.5"/></svg>';
    case 'diamond':  return '<svg width="48" height="48" viewBox="0 0 48 48"><polygon points="24,4 42,24 24,44 6,24" fill="'+c+'" stroke="#fff" stroke-width="1.5"/></svg>';
    case 'trapezoid':return '<svg width="48" height="48" viewBox="0 0 48 48"><polygon points="14,10 34,10 42,38 6,38" fill="'+c+'" stroke="#fff" stroke-width="1.5"/></svg>';
    case 'octagon':  return '<svg width="48" height="48" viewBox="0 0 48 48"><polygon points="24,4 38,10 44,24 38,38 24,44 10,38 4,24 10,10" fill="'+c+'" stroke="#fff" stroke-width="1.5"/></svg>';
    case 'healthpack': return '<svg width="48" height="48" viewBox="0 0 48 48"><rect x="7" y="7" width="34" height="34" fill="#f4f4f4" stroke="#2a7a38" stroke-width="2"/><rect x="19" y="11" width="10" height="26" fill="#0e9938"/><rect x="11" y="19" width="26" height="10" fill="#0e9938"/></svg>';
    case 'skull':    return classShapeSVG('black',true);
  }
  return '';
}

// Options
Audio.setMasterVolume(saveData.options.masterVolume);
const masterVolEl=document.getElementById('masterVol');
const masterVolValEl=document.getElementById('masterVolVal');
masterVolEl.value=Math.round(saveData.options.masterVolume*100);
masterVolValEl.textContent=masterVolEl.value+'%';
masterVolEl.addEventListener('input',()=>{
  const v=parseInt(masterVolEl.value,10)/100;
  saveData.options.masterVolume=v;
  Audio.setMasterVolume(v);
  masterVolValEl.textContent=masterVolEl.value+'%';
  saveSave();
});
document.getElementById('resetSaveBtn').addEventListener('click',()=>{
  if(confirm('Reset all save data? This will relock every class and reset points.')){
    localStorage.removeItem(SAVE_KEY);
    location.reload();
  }
});

// V2: Elite toggle wiring
const eliteToggle=document.getElementById('eliteToggle');
if(eliteToggle){
  eliteToggle.checked=!!saveData.options.eliteEnemies;
  eliteToggle.addEventListener('change',()=>{
    saveData.options.eliteEnemies=eliteToggle.checked;
    saveSave();
  });
}

// V2: Shoot mode + auto-aim wiring
const shootModeEl=document.getElementById('shootMode');
if(shootModeEl){
  shootModeEl.value=saveData.options.shootMode||'hold';
  shootModeEl.addEventListener('change',()=>{
    saveData.options.shootMode=shootModeEl.value;
    mouse.toggleFire=false;
    saveSave();
  });
}
const autoAimToggle=document.getElementById('autoAimToggle');
if(autoAimToggle){
  autoAimToggle.checked=!!saveData.options.autoAim;
  autoAimToggle.addEventListener('change',()=>{
    saveData.options.autoAim=autoAimToggle.checked;
    saveSave();
  });
}

// V2: Admin code input
const adminHint=document.getElementById('adminHint');
const adminBox=document.getElementById('adminBox');
const adminStatus=document.getElementById('adminStatus');
if(adminHint){
  adminHint.textContent=saveData.adminMode?'admin: ON (click)':'admin…';
  adminHint.addEventListener('click',()=>{
    if(saveData.adminMode){
      saveData.adminMode=false; saveSave();
      adminHint.textContent='admin…';
      adminStatus.textContent='Admin disabled.';
      renderClassGrid(); renderShopLines();
      return;
    }
    adminBox.style.display=adminBox.style.display==='flex'?'none':'flex';
  });
}
const adminSubmit=document.getElementById('adminSubmit');
if(adminSubmit){
  adminSubmit.addEventListener('click',()=>{
    const code=document.getElementById('adminCode').value.trim().toLowerCase();
    if(code==='widdleyotiddle'){
      saveData.adminMode=true; saveData.points=Math.max(999,saveData.points); saveSave();
      adminStatus.textContent='Admin ON · 999 points granted · all classes unlocked.';
      adminHint.textContent='admin: ON (click)';
      renderClassGrid(); renderShopLines();
    } else {
      adminStatus.textContent='Invalid code.';
    }
  });
}

// V2: Upgrades screen navigation
const openUpgradesBtn=document.getElementById('openUpgradesBtn');
if(openUpgradesBtn){
  openUpgradesBtn.addEventListener('click',()=>{ renderShopLines(); showMenuStep('upgradesStep'); });
}
const backFromUpgrades=document.getElementById('backFromUpgrades');
if(backFromUpgrades){
  backFromUpgrades.addEventListener('click',()=>showMenuStep('classStep'));
}

// V2: Pause overlay buttons
document.getElementById('pauseResume').addEventListener('click',()=>togglePause());
document.getElementById('pauseRestart').addEventListener('click',()=>{
  if(!confirm('Restart this run? Progress on the current run will be lost.')) return;
  const cls=game.chosenClass, mode=game.mode, diff=game.difficulty;
  togglePause();
  game.mode=mode; game.difficulty=diff; game.difficultySettings=DIFFICULTIES[diff];
  startGameWithClass(cls);
});
document.getElementById('pauseForfeit').addEventListener('click',()=>{
  if(!confirm('Forfeit and return to the main menu?')) return;
  togglePause();
  game.state='menu';
  document.getElementById('menu').style.display='flex';
  showMenuStep('titleStep');
});
const pauseVol=document.getElementById('pauseVol');
if(pauseVol){
  pauseVol.addEventListener('input',()=>{
    const v=parseInt(pauseVol.value,10)/100;
    saveData.options.masterVolume=v;
    Audio.setMasterVolume(v);
    document.getElementById('pauseVolVal').textContent=pauseVol.value+'%';
    saveSave();
  });
}

// ---- INIT ----
showMenuStep('titleStep');
renderClassGrid();
renderShopLines();
