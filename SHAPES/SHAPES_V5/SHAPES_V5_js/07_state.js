// ============================================================
// GAME STATE
// ============================================================
const game = {
  state:'menu', chosenClass:null, mode:'intro', difficulty:'easy',
  difficultySettings:DIFFICULTIES.easy,
  player:null, enemies:[], playerBullets:[], enemyBullets:[], particles:[],
  hexTriangles:[], deathRings:[],
  wave:0, highest:parseInt(localStorage.getItem('bh_high')||'0'),
  arenaScale:1.0, enemySizeMult:1.0, timeScale:1.0, timeFreezeT:0,
  waveBreak:0, bgPhase:0, bgHue:210, bgT:0, shake:0, flash:0,
  ability:{ t:0, active:0, charges:1, maxCharges:1 },
  block:{ t:0, active:0 },
  borrowed:{ cls:null, t:0, active:0, charges:0, maxCharges:0 },
  spawnQueue:[], spawnTimer:0, waveLive:false,
  upgrades:{ hp:0,damage:0,shots:0,skillCooldown:0,blockCooldown:0,skillDamage:0,moveSpeed:0,blueBallSize:0,octaDuration:0,revive:0,pierce:false,bounce:false,betterBoons:false,borrowedAbility:null },
  legendariesOwned:new Set(),
  totalUpgrades:0, bossesDefeated:0, boonHistory:[],
  bossWavePendingReward:false, sharedBossPools:{},
  pendingBoonPicks:1, pendingAfterBoons:'wavebreak', pendingNextWave:1,
  gauntletRounds:['circle','triangle','arrow','hexagon','diamond','octagon','trapezoid','skull'],
  skullFinalPhase:false, skullWarnTimer:0, skullWarnCount:0, skullFlash:0,
  octagonPendingSpawn:null, octagonWarnTimer:0,
  mapVariant:0, mapPortals:[], unlockBanners:[], enemyDeathRings:[], blockWasUsed:false, blockSuccessThisCast:false,
  preRunBonus:{ damage:0, skillDamage:0, hp:0, skillCooldown:0, moveSpeed:0, blockCooldown:0 },
  yellowTriHpBonus:0,
  trapWindUp:0, trapWindDir:{ x:0, y:0 },
  aimX:0, aimY:0,
  runTime:0,
  stats:{ enemiesKilled:0, bossesKilled:0, bulletDamage:0, skillDamage:0 },
};

function isBossWave(n){
  if(game.mode==='gauntlet') return n>=1;
  if(game.mode==='endless'&&n>0&&n%50===0) return false; // skull solo handled separately
  return n>0&&n%5===0;
}

function isSkullPeriodicWave(n){ return game.mode==='endless'&&n===50; }

function getBossScale(){ return{hp:1+game.totalUpgrades*0.5, speed:1+game.totalUpgrades*0.05}; }

function getEnemyRunScale(){
  const wave=Math.max(1,game.wave||1);
  const diff=DIFFICULTIES[game.difficulty]||DIFFICULTIES.easy;
  const ds=diff.scale;
  const baseHp=1+Math.min(1.2,(wave-1)*0.032);
  const baseSpeed=1+Math.min(0.22, Math.log2(wave)*0.045);
  const expectedUpgrades=Math.floor((wave-1)*0.8);
  const missing=Math.max(0,expectedUpgrades-game.totalUpgrades);
  const catchupHp=1+Math.min(0.22,missing*0.035);
  const catchupSpeed=1+Math.min(0.05,missing*0.008);
  // V2: bosses scale slightly less brutally — HP 15% less aggressive, speed 30% less
  const bossHp=1+game.bossesDefeated*0.0850;
  const bossSpeed=1+game.bossesDefeated*0.0100;
  return{
    hp:  baseHp*catchupHp*bossHp*ds,
    speed:baseSpeed*catchupSpeed*bossSpeed*ds,
  };
}

