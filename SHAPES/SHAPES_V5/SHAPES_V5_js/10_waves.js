// ============================================================
// WAVES
// ============================================================
function buildFixedWave(n){
  // Intro mode: normal enemies only, no bosses. Ends after wave 10.
  const q=[],add=(t,c)=>{for(let i=0;i<c;i++)q.push(t);};
  if(n===1){ add('circle',4); }
  else if(n===2){ add('circle',4); add('triangle',2); }
  else if(n===3){ add('circle',3); add('triangle',2); add('arrow',3); }
  else if(n===4){ add('circle',2); add('triangle',2); add('arrow',2); add('hexagon',2); }
  else if(n===5){ add('circle',2); add('arrow',2); add('hexagon',1); add('diamond',2); }
  else if(n===6){ add('circle',2); add('triangle',2); add('arrow',2); add('trapezoid',2); }
  else if(n===7){ add('circle',2); add('triangle',2); add('arrow',2); add('hexagon',1); add('diamond',1); add('trapezoid',1); }
  else if(n===8){ add('triangle',2); add('arrow',2); add('hexagon',2); add('diamond',2); add('trapezoid',1); }
  else if(n===9){ add('circle',3); add('triangle',3); add('arrow',3); add('hexagon',2); add('diamond',2); add('trapezoid',2); }
  else if(n===10){ add('circle',4); add('triangle',3); add('arrow',3); add('hexagon',2); add('diamond',2); add('trapezoid',2); }
  return q;
}

function buildPointWave(n){
  let budget=25+(n-1)*5+Math.floor(n/10)*50;
  const q=[], chaos=['circle'], pressure=['triangle','arrow'], control=['hexagon','diamond','trapezoid'];
  const buildEntry=(t)=>{
    const elite = (t!=='healthpack' && Math.random()<0.18);
    const extra = elite ? Math.max(1, Math.ceil(ENEMY_DEFS[t].cost*0.75)) : 0;
    return { type:t, elite, cost:ENEMY_DEFS[t].cost + extra };
  };
  const forceOne=pool=>{ const t=pool[Math.floor(Math.random()*pool.length)]; const e=buildEntry(t); if(e.cost<=budget){q.push(e);budget-=e.cost;} };
  forceOne(chaos);forceOne(pressure);forceOne(control);
  while(budget>0){
    const pool=Math.random()<0.4?chaos:Math.random()<0.6?pressure:control;
    const t=pool[Math.floor(Math.random()*pool.length)];
    const e=buildEntry(t);
    if(e.cost>budget){
      const all=['circle','triangle','arrow','hexagon','diamond'].filter(x=>ENEMY_DEFS[x].cost<=budget);
      if(!all.length)break;
      const a=all[Math.floor(Math.random()*all.length)];
      const ae=buildEntry(a);
      if(ae.cost>budget) break;
      q.push(ae);budget-=ae.cost;
    } else { q.push(e); budget-=e.cost; }
  }
  for(let i=q.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[q[i],q[j]]=[q[j],q[i]];}
  return q;
}

function showWaveBanner(text, color='#ffd166', duration=1.4){
  const banner=document.getElementById('waveBanner');
  if(!banner) return;
  banner.textContent=text;
  banner.style.color=color;
  banner.animate(
    [
      {opacity:0,transform:'translate(-50%,-50%) scale(0.82)'},
      {opacity:1,transform:'translate(-50%,-50%) scale(1.0)',offset:0.18},
      {opacity:1,transform:'translate(-50%,-50%) scale(1.04)',offset:0.82},
      {opacity:0,transform:'translate(-50%,-50%) scale(1.1)'}
    ],
    {duration:Math.round(duration*1000), easing:'ease-out'}
  );
}

function buildGauntletWave(n){
  const roundType=game.gauntletRounds[n-1]; if(!roundType) return [];
  if(roundType==='skull'){ return [{type:'skull',boss:true,sharedBossRole:0},{type:'skull',boss:true,sharedBossRole:1}]; }
  const adds=buildPointWave(6);
  if(roundType==='trapezoid'){ const poolId='gauntlet_trap_'+n; return [{type:'trapezoid',boss:true,sharedBossPool:poolId,sharedBossRole:0,side:0,partnerPhase:0},{type:'trapezoid',boss:true,sharedBossPool:poolId,sharedBossRole:1,side:2,partnerPhase:3},...adds]; }
  if(roundType==='octagon') return [...adds]; // octagon spawns at end via octagonPendingSpawn
  return [{type:roundType,boss:true},...adds];
}

function pickRandomEnemyType(){ const types=['circle','triangle','arrow','hexagon','diamond','trapezoid','octagon']; return types[Math.floor(Math.random()*types.length)]; }

function buildBossWave(n){
  const baseWave=(game.mode==='intro'&&n<=10)?buildFixedWave(n):buildPointWave(n);
  const bossCount=n%10===0?2:1;
  const bosses=[];
  for(let i=0;i<bossCount;i++){
    const type=pickRandomEnemyType();
    if(type==='trapezoid'){ const poolId='trapBoss_'+n+'_'+i+'_'+Math.floor(Math.random()*100000); bosses.push({type:'trapezoid',boss:true,sharedBossPool:poolId,sharedBossRole:0,side:0});bosses.push({type:'trapezoid',boss:true,sharedBossPool:poolId,sharedBossRole:1,side:2}); }
    else bosses.push({type,boss:true});
  }
  return bosses.concat(baseWave);
}

function applyPreRunBonuses(){
  const pu=saveData.preRunUpgrades, du=saveData.disabledUpgrades||{}, p=game.player;
  const tierVal=(key)=>(du[key]?0:(PRE_RUN_TIERS[key].values[pu[key]||0]||0));
  game.upgrades.damage+=tierVal('damage');
  game.upgrades.skillDamage+=tierVal('skillDamage');
  const hpBonus=tierVal('hp');
  if(hpBonus&&p&&p.cls!=='white'){ p.hp+=hpBonus; p.maxHp+=hpBonus; }
  game.preRunBonus.skillCooldown=tierVal('skillCooldown');
  game.preRunBonus.moveSpeed=tierVal('moveSpeed');
  game.preRunBonus.blockCooldown=tierVal('blockCooldown');
  const shotsBonus=tierVal('shots');
  if(shotsBonus) game.upgrades.shots=Math.min(4, game.upgrades.shots+shotsBonus);
}

function startWave(n){
  game.wave=n;
  const modeBase=game.mode==='endless'?1.28:(game.mode==='gauntlet'?1.08:1.0);
  game.arenaScale=modeBase+Math.floor((n-1)/10)*0.1;
  game.enemySizeMult=game.mode==='endless'?1.35:1.0;
  const p=game.player;
  // V2: Only wave 1 grants full HP. Mid-run healing comes exclusively from green health packs.
  if(n===1){ p.hp=p.maxHp; }
  p.iframes=0.6; game.enemyBullets.length=0;
  if(n===1) applyPreRunBonuses();
  configureMapForWave(n);
  if(n===1 || n%10===1){
    game.bgPhase=(game.bgHue+rand(60,180))%360;
    if(n>1) showWaveBanner(game.mapName || 'PHASE SHIFT', '#ffd166', 1.4);
  }

  // Skull periodic wave (every 50 in endless)
  if(isSkullPeriodicWave(n)){
    game.skullFinalPhase=true; game.skullWarnTimer=1.0; game.skullWarnCount=3;
    game.spawnQueue=[]; game.enemyBullets.length=0; game.enemies.length=0;
    game.bossWavePendingReward=false;
    Audio.setLayers(30); Audio.noise(0.35,0.18); Audio.blip(70,0.45,'sawtooth',0.22);
  } else {
    game.skullFinalPhase=false;
    // V2: Octagon now spawns at wave START everywhere — no pending-spawn warning phase
    game.octagonPendingSpawn=null;
    if(game.mode==='gauntlet'&&game.gauntletRounds[n-1]==='octagon'){
      game.spawnQueue=[{type:'octagon',boss:true,skipSpawnAnim:true}, ...buildPointWave(6)];
      game.bossWavePendingReward=true;
    } else {
      // V2: Intro waves 1-10 use the fixed teaching wave layout (takes priority over isBossWave)
      game.spawnQueue=(game.mode==='gauntlet')
        ?buildGauntletWave(n)
        :((game.mode==='intro'&&n<=10)?buildFixedWave(n)
          :(isBossWave(n)?buildBossWave(n):buildPointWave(n)));
      game.bossWavePendingReward=(game.mode==='gauntlet') || (game.mode!=='intro' && isBossWave(n));
    }
    // Also check skull warning for gauntlet skull round only
    if(game.mode==='gauntlet'&&game.gauntletRounds[n-1]==='skull'){
      game.skullFinalPhase=true; game.skullWarnTimer=1.0; game.skullWarnCount=3;
      game.spawnQueue=[]; game.enemyBullets.length=0; game.enemies.length=0;
    }
  }

  // V5: 1% Wandering Kite spawn chance on Normal+ (fixed stats, no difficulty scaling)
  if(isNormalOrHigherDifficulty() && Math.random()<0.01){
    game.spawnQueue.unshift({type:'kiteenemy', fixedStats:true, elite:false});
  }

  // V2: Chance-based healthpack spawn (never in Insane, never on skull/octagon-dedicated waves)
  if(game.difficulty!=='insane' && !isSkullPeriodicWave(n) && !(game.mode==='gauntlet'&&game.gauntletRounds[n-1]==='octagon')){
    const packChance = game.difficulty==='easy'?0.80 : game.difficulty==='normal'?0.50 : 0.25;
    if(Math.random()<packChance){ game.spawnQueue.unshift({type:'healthpack'}); }
  }

  game.spawnTimer=0.6; game.waveLive=false;
  const phaseDepth = Math.floor((Math.max(1,n)-1)/10);
  Audio.setLayers(game.mode==='intro' ? Math.min(n,8) : (n+6+phaseDepth*2));
  if(game.skullFinalPhase){
    Audio.setSong('skull'); Audio.setLayers(32); Audio.noise(0.35,0.18);
  } else if(game.mode==='endless'){
    Audio.setSong('endless'+(1+Math.floor(((n-1)/10)%5)));
    if(n%10===1 && n>1){ Audio.blip(440,0.18,'triangle',0.10); Audio.blip(660,0.22,'sine',0.08); }
  } else if(game.mode==='gauntlet'){
    Audio.setSong('gauntlet'); Audio.setLayers(28);
  } else {
    Audio.setSong('intro');
  }

  const banner=document.getElementById('waveBanner');
  banner.textContent='WAVE '+n; banner.style.color=hsl((n*37)%360,90,65);
  banner.animate([{opacity:0,transform:'translate(-50%,-50%) scale(0.8)'},{opacity:1,transform:'translate(-50%,-50%) scale(1.0)',offset:0.2},{opacity:1,transform:'translate(-50%,-50%) scale(1.05)',offset:0.8},{opacity:0,transform:'translate(-50%,-50%) scale(1.1)'}],{duration:1600,easing:'ease-out'});

  if(n>game.highest){ game.highest=n; localStorage.setItem('bh_high',n); }
  game.state='playing';
}

function updateWave(dt){
  // Skull warning phase
  if(game.skullFinalPhase&&game.skullWarnCount>0){
    game.skullWarnTimer-=dt;
    if(game.skullWarnTimer<=0){
      const banner=document.getElementById('waveBanner');
      if(banner){banner.textContent='WARNING';banner.style.color='#ff1a1a';banner.animate([{opacity:0,transform:'translate(-50%,-50%) scale(0.7)'},{opacity:1,transform:'translate(-50%,-50%) scale(1.08)',offset:0.25},{opacity:1,transform:'translate(-50%,-50%) scale(1.0)',offset:0.8},{opacity:0,transform:'translate(-50%,-50%) scale(1.12)'}],{duration:700,easing:'ease-out'});}
      Audio.noise(0.22,0.2); Audio.blip(120,0.22,'sawtooth',0.18);
      game.skullWarnCount--;game.skullWarnTimer=1.0;
      if(game.skullWarnCount===0){
        game.spawnQueue=[{type:'skull',boss:true,sharedBossRole:0},{type:'skull',boss:true,sharedBossRole:1}];
        game.bossWavePendingReward=true; game.spawnTimer=0.4;
      }
    }
  }

  // Octagon pending: after adds cleared
  if(game.octagonPendingSpawn&&game.spawnQueue.length===0&&game.enemies.length===0&&game.waveLive){
    if(game.octagonWarnTimer>0){
      game.octagonWarnTimer-=dt;
      if(Math.floor((game.octagonWarnTimer+0.5)*2)!==Math.floor((game.octagonWarnTimer+0.5+dt)*2)){
        const banner=document.getElementById('waveBanner');
        if(banner){banner.textContent='OCTAGON INCOMING';banner.style.color=hsl(260,90,70);banner.animate([{opacity:0,transform:'translate(-50%,-50%) scale(0.8)'},{opacity:1,transform:'translate(-50%,-50%) scale(1.0)',offset:0.2},{opacity:0,transform:'translate(-50%,-50%) scale(1.1)'}],{duration:900,easing:'ease-out'});}
      }
      if(game.octagonWarnTimer<=0){
        spawnEnemy('octagon',game.octagonPendingSpawn);
        game.octagonPendingSpawn=null; game.waveLive=true;
      }
    }
  }

  // Spawn queue
  if(game.spawnQueue.length>0){
    game.spawnTimer-=dt;
    if(game.spawnTimer<=0){
      const next=game.spawnQueue.shift();
      if(typeof next==='string')spawnEnemy(next); else spawnEnemy(next.type,next);
      game.waveLive=true; game.spawnTimer=0.12+Math.random()*0.12;
    }
  }

  // Wave clear check
  if(game.state==='playing'&&game.waveLive&&!game.octagonPendingSpawn&&!(game.skullFinalPhase&&game.skullWarnCount>0)&&game.spawnQueue.length===0&&game.enemies.length===0){
    game.enemyBullets.length=0;
    Audio.blip(440,0.15,'sine',0.2); Audio.blip(660,0.2,'sine',0.2);
    if(game.bossWavePendingReward) game.bossesDefeated++;

    // Intro completion tracking
    if(game.mode==='intro'&&game.wave>=10&&!saveData.beatIntroWith.includes(game.chosenClass)){
      saveData.beatIntroWith.push(game.chosenClass); saveSave();
    }

    // V2: Intro mode ends after wave 10
    if(game.mode==='intro'&&game.wave>=10){
      game.state='dead';
      recordRunStats();
      document.getElementById('goStats').innerHTML='INTRO COMPLETE<br>'+CLASS_INFO[game.chosenClass].name+'<br>Endless and Gauntlet are now available.';
      document.getElementById('gameover').style.display='flex';
      return;
    }

    if(game.mode==='gauntlet'&&game.wave>=game.gauntletRounds.length){
      if(!saveData.beatGauntletOn.includes(game.difficulty)){ saveData.beatGauntletOn.push(game.difficulty); saveSave(); }
      game.state='dead';
      recordRunStats();
      document.getElementById('goStats').innerHTML='BOSS GAUNTLET CLEARED<br>'+game.difficulty.toUpperCase()+'<br>Final round: <b>'+game.wave+'</b>';
      document.getElementById('gameover').style.display='flex';
      return;
    }

    game.pendingBoonPicks=game.mode==='gauntlet'?3:1;
    game.pendingAfterBoons=game.mode==='gauntlet'?'nextWave':'wavebreak';
    game.pendingNextWave=game.wave+1;
    openBoonMenu();
  }

  if(game.state==='wavebreak'){ game.waveBreak-=dt; if(game.waveBreak<=0) startWave(game.wave+1); }

  const enemyPressure=Math.min(1,game.enemies.length/10);
  const hpPressure=game.player?(1-game.player.hp/game.player.maxHp):0;
  Audio.setTension(Math.max(enemyPressure,hpPressure));
}

function gameOver(){
  game.state='dead';
  recordRunStats();
  document.getElementById('goStats').innerHTML=game.mode.toUpperCase()+' MODE · '+game.difficulty.toUpperCase()+'<br>You reached wave <b>'+game.wave+'</b>.<br>Highest: <b>'+game.highest+'</b>';
  document.getElementById('gameover').style.display='flex';
  Audio.noise(0.8,0.4);
}

// V2: Memory Hall record keeping
function recordRunStats(){
  const cls=game.chosenClass; if(!cls) return;
  const snap={
    wave:game.wave, mode:game.mode, difficulty:game.difficulty,
    time:Math.floor(game.runTime||0),
    enemiesKilled:game.stats.enemiesKilled, bossesKilled:game.stats.bossesKilled,
    bulletDamage:game.stats.bulletDamage, skillDamage:game.stats.skillDamage,
    date:new Date().toISOString().slice(0,10),
  };
  const prior=saveData.classBestRuns[cls];
  if(!prior || snap.wave>prior.wave){ saveData.classBestRuns[cls]=snap; }
  if(game.mode==='endless'){
    const pe=saveData.bestEndless;
    if(!pe || snap.wave>pe.wave){ saveData.bestEndless={...snap, cls}; }
  }
  saveSave();
}

