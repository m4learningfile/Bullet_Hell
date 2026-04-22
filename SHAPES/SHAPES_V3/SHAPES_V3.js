"use strict";
// ============================================================
// CONSTANTS
// ============================================================
const BASE_W = 1280, BASE_H = 800;
const PLAYER_SPEED = 260;
const PLAYER_RADIUS = 14;
const PLAYER_FIRE_RATE = 6;
const PLAYER_BULLET_SPEED = 720;
const PLAYER_BULLET_DMG = 1;
const HIT_IFRAME = 1.0;
const BLOCK_COOLDOWN = 5.0;
const BLOCK_DURATION = 0.6;
const ENEMY_BULLET_SPEED = 260;

const DIFFICULTIES = {
  easy:   { name: 'Easy (0.5x)',   regenInterval: 0, scale: 0.6  },
  normal: { name: 'Normal (1.0x)', regenInterval: 0, scale: 1.0  },
  hard:   { name: 'Hard (1.5x)',   regenInterval: 0, scale: 1.5  },
  insane: { name: 'Insane (2.0x)', regenInterval: 0, scale: 2.0  },
};

const CLASSES = {
  orange: { hp:3, cooldown:20, ability:'timepause',    duration:1.0,  color:'#ff8c2a', abilityDmg:20 },
  white:  { hp:1, cooldown:30, ability:'invuln',       duration:5.0,  color:'#ffffff', touchDmg:1, touchTick:0.35, speedMult:1.55 },
  green:  { hp:2, cooldown:10, ability:'dash',         duration:0.22, color:'#4dff6a', charges:2, dashDmg:10 },
  blue:   { hp:2, cooldown:10, ability:'bigball',      duration:0.0,  color:'#66d9ff', ballRadius:20, ballSpeed:250, ballDmg:5 },
  purple: { hp:3, cooldown:30, ability:'octaburst',    duration:1.0,  color:'#a855f7', burstRate:0.12 },
  red:    { hp:4, cooldown:8,  ability:'trapdash',     duration:0.22, color:'#ff3333', windUp:1.0 },
  black:  { hp:2, cooldown:60, ability:'skullring',    duration:0.0,  color:'#bbbbbb', ringDmg:20 },
  yellow: { hp:1, cooldown:10, ability:'hexsummon',    duration:0.0,  color:'#ffdd00', baseMaxTri:6 },
  pink:   { hp:3, cooldown:4,  ability:'triangledash', duration:0.22, color:'#ff69b4' },
  kite:   { hp:2, cooldown:0,  ability:'passivetrail', duration:0.0,  color:'#9fe8c8', speedMult:1.30, trailTickDmg:2, trailTick:0.6, baseTrailLen:220 },
  crescent:{hp:2, cooldown:10, ability:'crescentform', duration:10.0, color:'#7b6dff', crescentDmg:2, crescentSpeed:900 },
};

const ENEMY_DEFS = {
  circle:   { hp:4,  r:16, speed:130, cost:1, color:[190,360] },
  triangle: { hp:5,  r:18, speed:90,  cost:2, color:[280,60]  },
  arrow:    { hp:3,  r:15, speed:160, cost:2, color:[120,260] },
  hexagon:  { hp:7,  r:22, speed:70,  cost:4, color:[30,200]  },
  diamond:  { hp:9,  r:24, speed:40,  cost:6, color:[340,160] },
  skull:    { hp:22, r:34, speed:102, cost:0, color:[0,0]     },
  trapezoid:{ hp:6,  r:20, speed:80,  cost:5, color:[210,10]  },
  octagon:  { hp:18, r:28, speed:90,  cost:0, color:[260,60]  },
  healthpack:{ hp:1, r:18, speed:0,   cost:0, color:[120,120] },
};

const PRE_RUN_TIERS = {
  damage:        { label:'Bullet Damage',  values:[0,1,2,3,4,5],                  costs:[0,1,3,6,10,20] },
  skillDamage:   { label:'Skill Damage',   values:[0,3,6,9,12,15],                costs:[0,1,3,6,10,20] },
  hp:            { label:'Health',         values:[0,1,2,3,4,5],                  costs:[0,1,3,6,10,20] },
  skillCooldown: { label:'Skill Cooldown', values:[0,0.05,0.10,0.15,0.20,0.25],   costs:[0,1,3,6,10,20] },
  moveSpeed:     { label:'Move Speed',     values:[0,0.05,0.10,0.15,0.20,0.25],   costs:[0,1,3,6,10,20] },
  blockCooldown: { label:'Block Cooldown', values:[0,0.05,0.10,0.15,0.20,0.25],   costs:[0,1,3,6,10,20] },
  shots:         { label:'Extra Bullet Stream', values:[0,1,2,3],                 costs:[0,5,15,25] },
};

// ============================================================
// SAVE SYSTEM
// ============================================================
const SAVE_KEY = 'shapes_v3_save';
function defaultSave() {
  return {
    points: 0,
    bossKills: {},
    beatIntroWith: [],
    beatGauntletOn: [],
    preRunUpgrades: { damage:0, skillDamage:0, hp:0, skillCooldown:0, moveSpeed:0, blockCooldown:0, shots:0 },
    disabledUpgrades: {},
    options: { masterVolume: 0.32, eliteEnemies: false, shootMode: 'hold', autoAim: false },
    adminMode: false,
    classBestRuns: {},   // per-class best run: { cls: { wave, mode, difficulty, time, enemiesKilled, bulletDamage, skillDamage, date } }
    bestEndless: null,   // overall best endless run
  };
}
function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return defaultSave();
    const d = JSON.parse(raw);
    const def = defaultSave();
    return {
      points: d.points||0,
      bossKills: d.bossKills||{},
      beatIntroWith: d.beatIntroWith||[],
      beatGauntletOn: d.beatGauntletOn||[],
      preRunUpgrades: Object.assign({},def.preRunUpgrades,d.preRunUpgrades||{}),
      disabledUpgrades: d.disabledUpgrades||{},
      options: Object.assign({},def.options,d.options||{}),
      adminMode: !!d.adminMode,
      classBestRuns: d.classBestRuns||{},
      bestEndless: d.bestEndless||null,
    };
  } catch(e) { return defaultSave(); }
}
function saveSave() { localStorage.setItem(SAVE_KEY, JSON.stringify(saveData)); }
const saveData = loadSave();

// ============================================================
// UNLOCK SYSTEM
// ============================================================
const CLASS_INFO = {
  orange:{
    name:'SQUARE', hp:3, difficulty:'Easy', classType:'Balanced Starter',
    bulletDamage:1, skillName:'Time Pause', skillCooldown:20, skillDamage:20,
    skillDescription:'Time Pause freezes every enemy and enemy bullet in place for a full second and deals a 2-damage shockwave to every enemy in the arena at the moment it activates. A free reset button for dangerous waves.',
    quirks:'No class restrictions — every boon pool is available. Forgiving hitbox and starting HP; recommended for learning enemy patterns.',
    skillBrief:'Time Freeze: Stuns and damages all enemies in the arena.',
    previewLong:'Balanced 3-HP starter with no restrictions. Time Pause freezes everything for a full second and hits every enemy on screen with a 20-dmg shockwave — a free panic button. The easiest class to pick up first.',
    unlockHint:'Always available.',
  },
  white:{
    name:'STAR', hp:1, difficulty:'Expert', classType:'Glass Cannon / Invuln Tank',
    bulletDamage:1, skillName:'Rainbow Invulnerability', skillCooldown:30, skillDamage:1,
    skillDescription:'Becomes fully invincible for 5 seconds. While active, bodily contact with an enemy deals 1 damage to that enemy every 0.35 seconds, letting you plow through packs safely.',
    quirks:'Move speed is 1.55× normal. Cannot gain HP boons. One single hit while the skill is down ends the run — play it like a ninja. While Rainbow Invuln is active, also immune to arena-edge damage (the only class that is).',
    skillBrief:'Rainbow Invuln: Temporary invincibility; kills enemies on touch.',
    previewLong:'A 1-HP glass cannon that moves 55% faster than any other class. Rainbow Invuln grants 5 seconds of full invincibility — and while active, body contact damages enemies for you. One hit while the skill is down and the run is over.',
    unlockHint:'Beat Intro Mode with Square.',
  },
  green:{
    name:'ARROW', hp:2, difficulty:'Medium', classType:'Mobility / Bruiser',
    bulletDamage:1, skillName:'Directional Dash', skillCooldown:10, skillDamage:10,
    skillDescription:'Dashes in the aimed direction with a short i-frame window, passing through bullets and enemies. Every enemy caught in the dash takes 10 damage. Holds up to 2 charges.',
    quirks:'The only class with ability charges — two dashes in quick succession are a huge clutch tool. Cooldown is per charge.',
    skillBrief:'Dash: Quick directional dash that pierces bullets.',
    previewLong:'Mobility bruiser. Holds 2 charges of a directional dash that grants brief i-frames and damages every enemy caught inside (10 dmg + Skill Damage). The only class with stored ability charges — back-to-back dashes let you reposition and clutch out of chaos.',
    unlockHint:'Kill any boss on Easy or harder.',
  },
  blue:{
    name:'CIRCLE', hp:2, difficulty:'Easy', classType:'Projectile Specialist',
    bulletDamage:1, skillName:'Big Ball', skillCooldown:'10s (fixed)', skillDamage:5,
    skillDescription:'Fires a slow, large piercing orb that travels across the arena. Every enemy it passes through takes 5 damage. The orb persists until it leaves the arena.',
    quirks:'"Skill Cooldown" boons are repurposed to grow the orb radius — every tier makes the orb larger. Circle has no in-run way to shorten its 10s cooldown (only the pre-run Skill Cooldown upgrade affects it).',
    skillBrief:'Big Ball: Slow piercing orb that damages all in its path.',
    previewLong:'Projectile specialist. Big Ball fires a slow piercing orb that deals 5 damage to every enemy it passes through. Skill Cooldown boons are repurposed to grow the orb instead of reducing the fixed 10s cooldown — a class that wipes lines of enemies.',
    unlockHint:'Kill any boss on Easy or harder.',
  },
  purple:{
    name:'OCTAGON', hp:3, difficulty:'Medium', classType:'Area Damage',
    bulletDamage:1, skillName:'Octa Burst', skillCooldown:30, skillDamage:1,
    skillDescription:'For 1 second, fires streams of bullets from all 8 octagon points simultaneously, creating a shotgun cone around the player.',
    quirks:'Skill Damage boons extend the burst duration instead of increasing per-bullet damage. Position in the middle of a pack to maximize hits.',
    skillBrief:'Octa Burst: Briefly fires from all 8 directions at once.',
    previewLong:'Area damage. For one second, your octagon fires rapid streams from all 8 points at once — a deadly bubble of bullets for whoever is standing next to you. Skill Damage boons extend the burst duration instead of raising per-bullet damage.',
    unlockHint:'Kill the Octagon boss on Normal or harder.',
  },
  red:{
    name:'TRAPEZOID', hp:4, difficulty:'Medium', classType:'Tank / Melee',
    bulletDamage:1, skillName:'Invuln Dash', skillCooldown:8, skillDamage:'1 + 5× Bullet Damage',
    skillDescription:'Wind up for 1 second in the aimed direction, then charge forward. Whether standing still or mid-dash, any enemy that touches the front arc (±80°) takes melee damage, and you are immune to contact damage from that side. Being hit from the back or sides still damages you.',
    quirks:'Tankiest class at 4 HP. Cannot roll Skill Damage boons — instead, Bullet Damage gives 5× scaling to the melee (base 1, +5 per Bullet Damage tier). Each enemy can only be hit by the melee once every 0.5 seconds. Wind-up can be dodged, so aim carefully.',
    skillBrief:'Invuln Dash: Windup then charge. Front arc is immune and melees.',
    previewLong:'Tank and melee bruiser with a beefy 4 HP. A 1-second windup, then a high-speed dash. Enemies that touch your front arc get hit for 1 + 3× Bullet Damage and cannot damage you — your back and sides still do. Bullet Damage, not Skill Damage, drives the kit.',
    unlockHint:'Kill the Trapezoid boss on Normal or harder.',
  },
  yellow:{
    name:'HEXAGON', hp:1, difficulty:'Hard', classType:'Minion Master',
    bulletDamage:'—', skillName:'Triangle Swarm', skillCooldown:'auto', skillDamage:2,
    skillDescription:'Cannot shoot. Instead, auto-summons pink triangle allies. Each ally has 30 HP. Triangles follow your cursor while the shoot button is held; otherwise they seek nearby enemies. Contact deals 2 + Skill Damage on a 0.5s per-target cooldown and costs the triangle 1 HP per hit. Borrowed Power version also auto-summons (cap of 2, up to 6 with Extra Shots).',
    quirks:'Base cap is 6 triangles; +1 per Extra Shots boon (max 10). HP boons give +1 HP to the hexagon and +2 HP to every triangle per rarity level (common +1/+2, rare +2/+4, epic +4/+8).',
    skillBrief:'Triangle Swarm: Auto-summons triangle allies to fight for you.',
    previewLong:'Minion master at 1 HP. Cannot shoot. Instead, up to 6 triangle allies (max 10 with Extra Shots) are auto-summoned. Triangles follow your cursor while the shoot button is held; contact deals 2 + Skill Damage per 0.5s per enemy. Each triangle has 30 HP and loses 1 per hit. HP boons buff both you and the swarm.',
    unlockHint:'Kill the Hexagon boss on Hard.',
  },
  pink:{
    name:'TRIANGLE', hp:3, difficulty:'Easy', classType:'Evader / Shotgun',
    bulletDamage:1, skillName:'Triangle Dash', skillCooldown:4, skillDamage:0,
    skillDescription:'Dashes a short distance with i-frames. The dash itself deals no damage — it exists purely as a mobility and survival tool.',
    quirks:'Starts with 2 extra bullet streams built-in (fires 3 beams by default). Can still roll Extra Shots boons up to the global cap of 4 extra streams. Lowest skill cooldown in the roster (4s). Skill Damage boons extend the dash range instead of adding damage.',
    skillBrief:'Triangle Dash: Fast-cooldown mobility dash. No damage.',
    previewLong:'Evader / shotgun. Starts with 2 extra bullet streams built-in — you fire a tight 3-beam shotgun with short range. Triangle Dash has the roster\'s shortest cooldown (4s) and snaps to your cursor: never overshoots, always gets close.',
    unlockHint:'Kill the Triangle boss on Hard.',
  },
  black:{
    name:'SKULL', hp:2, difficulty:'Hard', classType:'Nuker / AoE',
    bulletDamage:1, skillName:'Death Ring', skillCooldown:60, skillDamage:20,
    skillDescription:'Releases an expanding pulse ring from your position that travels to the farthest arena corner. Every enemy the ring sweeps through takes 20 damage, plus 15 extra per common Skill Damage boon tier. Hits each enemy only once per cast.',
    quirks:'60-second cooldown is the longest in the roster. Save the ring for boss waves or emergency clears. Unlocked by completing the ultimate challenge.',
    skillBrief:'Death Ring: Expanding ring that hits every enemy it passes through.',
    previewLong:'Nuker / AoE. Death Ring releases an expanding pulse from your skull that sweeps all the way to the arena\'s farthest corner, hitting every enemy in its path exactly once for 20 + 5× Skill Damage. 60-second cooldown — save it for boss waves or emergencies.',
    unlockHint:'Beat Boss Gauntlet on Hard.',
  },
  kite:{
    name:'KITE', hp:2, difficulty:'Medium', classType:'Zoner / Trail',
    bulletDamage:1, skillName:'Ghost Trail', skillCooldown:'passive', skillDamage:2,
    skillDescription:'A permanent mint trail follows behind you. Enemies pass through it freely but take 2 + Skill Damage every 0.6 seconds while standing on the line. Trail length grows with every Skill Cooldown boon (Skill Cooldown is repurposed here).',
    quirks:'30% faster base move speed than every other class. Skill Cooldown boons extend the trail instead of reducing a cooldown. Fires normal bullets. No manual ability — the trail is always active.',
    skillBrief:'Ghost Trail: Mint trail deals passive damage every 0.6s to enemies that cross it.',
    previewLong:'Zoner with a permanent mint trail that damages anything crossing it every 0.6s. 30% faster move speed than the rest of the roster. Skill Cooldown boons lengthen the trail instead of shortening a cooldown. Still fires regular bullets — the trail is your second layer.',
    unlockHint:'Always available.',
  },
  crescent:{
    name:'CRESCENT', hp:2, difficulty:'Medium', classType:'Boomerang Bullets',
    bulletDamage:1, skillName:'Crescent Form', skillCooldown:'10s duration + 10s cooldown', skillDamage:'2× Bullet Damage + Skill Damage',
    skillDescription:'For 10 seconds your bullets transform into indigo crescents: piercing boomerangs that fly out to your cursor position and return, hitting enemies twice per shot. After the form ends, the 10-second cooldown begins. Skill Cooldown boons are repurposed to increase crescent bullet speed.',
    quirks:'Skill Cooldown boons speed up your crescents instead of shortening the cooldown (no in-run cooldown reduction). Crescent shots are tuned to hit about twice as hard as normal bullets before Skill Damage is added.',
    skillBrief:'Crescent Form: Bullets become piercing boomerangs for 10s.',
    previewLong:'Boomerang specialist. While Crescent Form is active (10 seconds), every bullet you fire becomes a piercing indigo crescent that flies to your cursor and returns, damaging enemies twice. Skill Cooldown boons make the crescents faster; Skill Damage makes them hit harder.',
    unlockHint:'Always available.',
  },
};
function isUnlocked(cls) {
  if (saveData.adminMode) return true;
  switch(cls) {
    case 'orange': return true;
    case 'white':  return saveData.beatIntroWith.includes('orange');
    case 'green':  return Object.keys(saveData.bossKills).length > 0;
    case 'blue':   return Object.keys(saveData.bossKills).length > 0;
    case 'purple': return !!(saveData.bossKills['octagon:normal']||saveData.bossKills['octagon:hard']);
    case 'red':    return !!(saveData.bossKills['trapezoid:normal']||saveData.bossKills['trapezoid:hard']);
    case 'yellow': return !!saveData.bossKills['hexagon:hard'];
    case 'pink':   return !!saveData.bossKills['triangle:hard'];
    case 'black':  return saveData.beatGauntletOn.includes('hard');
    case 'kite':     return true;
    case 'crescent': return true;
    default: return false;
  }
}
function isEndlessUnlocked() { return saveData.adminMode || saveData.beatIntroWith.includes('orange'); }
function isBossUnlocked(type){ return saveData.adminMode || Object.keys(saveData.bossKills).some(k=>k.startsWith(type+':')); }
function effectivePoints() { return saveData.adminMode ? Math.max(999, saveData.points) : saveData.points; }

const ENEMY_INFO = {
  circle:   { name:'CIRCLE',    cost:1, category:'Chaos',    desc:'Homing drone. Walks straight at the player in a steady line. Cheap filler but dangerous in numbers — whole waves are made of these.' },
  triangle: { name:'TRIANGLE',  cost:2, category:'Pressure', desc:'Burst shooter. Stops periodically to fire a 3-shot spread aimed at the player, then resumes chasing.' },
  arrow:    { name:'ARROW',     cost:2, category:'Pressure', desc:'Rushing skirmisher. Fast straight chase. Fires a single shot at you before retreating briefly, then dives back in.' },
  hexagon:  { name:'HEXAGON',   cost:4, category:'Control',  desc:'Splitter. On death it splits into two smaller hexagons that still chase you. Kill them in clean spaces so you are not swamped.' },
  diamond:  { name:'DIAMOND',   cost:6, category:'Control',  desc:'Slow-moving turret. Fires steady bursts of bullets aimed at the player. Costs 6 points, so waves rarely stack more than a couple.' },
  trapezoid:{ name:'TRAPEZOID', cost:5, category:'Control',  desc:'Diagonal bouncer. Moves on 45-degree angles and ricochets off arena walls. In boss form two of them appear and coordinate phase patterns.' },
  healthpack:{name:'HEALTH PACK', cost:'—', category:'Support', desc:'Forest-green cross, 1 HP, stationary. Chance to appear once per wave based on difficulty (Easy 80% / Normal 50% / Hard 25% / Insane 0%). Killing it heals you for 1 HP.' },
};

const BOSS_INFO = {
  circle:{
    name:'CIRCLE BOSS', difficulty:'Low',
    desc:'Scaled-up Circle. Fast homing dash-chase with large HP pool. Drops pursuit bullets around itself as it roams.',
    tips:'Kite in wide circles — it has no burst damage, only sustain contact pressure.',
  },
  triangle:{
    name:'TRIANGLE BOSS', difficulty:'Medium',
    desc:'Charging bullet-spewer. Every few seconds fires a dense cone spread, then dashes at the player.',
    tips:'Hug its side; the cone fires forward only. The dash is a tell — sidestep during the wind-up.',
  },
  arrow:{
    name:'ARROW BOSS', difficulty:'Medium',
    desc:'Fast rushdown boss. Lunges at the player with rapid single shots between lunges.',
    tips:'Do not get pinned against a wall — keep the arena center free.',
  },
  hexagon:{
    name:'HEXAGON BOSS', difficulty:'Medium',
    desc:'Splits on death into two smaller hexagon bosses, which split again once each. Effectively 7 enemies.',
    tips:'Take each split in an open area; it is easy to get surrounded by the smaller versions.',
  },
  diamond:{
    name:'DIAMOND BOSS', difficulty:'Medium',
    desc:'Stationary turret. Fires fast omnidirectional bullet volleys at a higher rate than a regular diamond.',
    tips:'Mind the bullet density. Look for gaps in the stream rather than trying to outrun it.',
  },
  trapezoid:{
    name:'TRAPEZOID BOSS', difficulty:'Hard',
    desc:'Appears as a linked pair. Both trapezoids share HP and bounce off arena walls in synchronized patterns. Beating one ends the fight.',
    tips:'Focus fire one at a time. The shared HP pool means splitting damage wastes DPS.',
  },
  octagon:{
    name:'OCTAGON',        difficulty:'Hard',
    desc:'Boss-only enemy that spawns in the center of the arena immediately at wave start. Rotates and fires bullet streams from all 8 points at once, starting 40% faster than before. Rotation and fire rate accelerate further as its HP drops.',
    tips:'No more immune entry window — it is hot the moment the wave starts. Stay at the edges and find the rotating gaps between bullet streams.',
  },
  skull:{
    name:'SKULL',          difficulty:'Apex',
    desc:'The final boss. Flashes the arena white on entry. Dashes in straight lines twice in a row, then idles. Ignores the point-budget system and appears every 50 waves in Endless and as the final Gauntlet round.',
    tips:'Predict the dash path and move perpendicular. Cast Death Ring or dash skills during the idle phase — it has no ranged attack but massive HP.',
  },
};


function trackBossKill(type) {
  const key = type + ':' + game.difficulty;
  if (!saveData.bossKills[key]) saveData.bossKills[key] = true;
  const pts = game.difficulty==='easy'?1:game.difficulty==='normal'?2:3;
  saveData.points += pts;
  saveSave();
}


// ============================================================
// CANVAS SETUP
// ============================================================
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
let DPR = Math.min(window.devicePixelRatio||1, 2);
function resize() {
  const maxW=window.innerWidth, maxH=window.innerHeight, ratio=BASE_W/BASE_H;
  let w=maxW, h=maxW/ratio;
  if(h>maxH){h=maxH;w=maxH*ratio;}
  canvas.style.width=w+'px'; canvas.style.height=h+'px';
  canvas.width=Math.floor(w*DPR); canvas.height=Math.floor(h*DPR);
}
window.addEventListener('resize',resize); resize();
function screenScale(){ return canvas.width/BASE_W; }

// ============================================================
// INPUT
// ============================================================
const keys = {};
const mouse = { x:BASE_W/2, y:BASE_H/2, down:false, right:false };
let paused = false;
window.addEventListener('keydown', e => {
  const k=e.key.toLowerCase(); keys[k]=true;
  if(e.key===' ') e.preventDefault();
  if((k==='p'||e.key==='Escape')&&game.state!=='menu'&&game.state!=='dead'&&game.state!=='boonselect'){ togglePause(); }
  if(k==='t'&&game.state==='playing'&&!paused&&game.upgrades.borrowedAbility) useBorrowedAbility();
});
window.addEventListener('keyup', e=>{ keys[e.key.toLowerCase()]=false; });
canvas.addEventListener('mousemove', e=>{
  const r=canvas.getBoundingClientRect();
  mouse.x=(e.clientX-r.left)/r.width*BASE_W;
  mouse.y=(e.clientY-r.top)/r.height*BASE_H;
});
canvas.addEventListener('mousedown', e=>{
  if(game.state!=='playing') return;
  if(e.button===0){
    if(saveData.options&&saveData.options.shootMode==='toggle'){ mouse.toggleFire=!mouse.toggleFire; }
    else mouse.down=true;
  }
  if(e.button===2) mouse.right=true;
});
canvas.addEventListener('mouseup',   e=>{
  if(e.button===0 && (!saveData.options||saveData.options.shootMode!=='toggle')) mouse.down=false;
  if(e.button===2) mouse.right=false;
});
// V2: When the mouse is released outside the canvas, drop hold-fire (toggle mode is unaffected)
window.addEventListener('mouseup', ()=>{
  if(!saveData.options||saveData.options.shootMode!=='toggle') mouse.down=false;
  mouse.right=false;
});
canvas.addEventListener('contextmenu', e=>e.preventDefault());

// ============================================================
// AUDIO
// ============================================================
const Audio = (()=>{
  let aCx=null, masterGain, layers={}, tension=0;
  // V2: song library — endless rotates between 3, gauntlet has its own dark/heavy track
  const LEAD_HYPE=[
    659.25,0,0,783.99,0,880,0,0,659.25,0,0,523.25,0,587.33,0,0,
    698.46,0,880,0,1046.5,0,0,880,698.46,0,0,0,698.46,0,880,0,
    784,0,0,1046.5,1318.51,0,1046.5,0,784,0,0,659.25,784,0,0,0,
    987.77,0,784,0,587.33,0,784,0,987.77,0,1174.66,0,784,0,587.33,0,
  ];
  const LEAD_DRIVE=[
    880,0,1046.5,0,1318.51,0,1046.5,0,880,0,784,0,659.25,0,587.33,0,
    987.77,0,1174.66,0,1318.51,0,1567.98,0,1318.51,0,1174.66,0,880,0,987.77,0,
    1046.5,0,880,0,1318.51,0,1567.98,0,1318.51,0,1046.5,0,880,0,659.25,0,
    1174.66,0,987.77,0,880,0,1046.5,0,1318.51,0,1174.66,0,987.77,0,880,0,
  ];
  const LEAD_SYNTH=[
    523.25,0,659.25,0,783.99,0,1046.5,0,783.99,0,659.25,0,523.25,0,659.25,0,
    587.33,0,739.99,0,880,0,1174.66,0,880,0,739.99,0,587.33,0,739.99,0,
    622.25,0,783.99,0,932.33,0,1244.51,0,932.33,0,783.99,0,622.25,0,783.99,0,
    698.46,0,880,0,1046.5,0,1396.91,0,1046.5,0,880,0,698.46,0,880,0,
  ];
  const LEAD_DARK=[
    164.81,0,0,0,196,0,0,0,174.61,0,0,0,155.56,0,0,0,
    164.81,0,0,196,0,0,174.61,0,164.81,0,155.56,0,164.81,0,0,0,
    174.61,0,0,0,207.65,0,0,0,196,0,0,0,174.61,0,0,0,
    174.61,0,207.65,0,246.94,0,207.65,0,196,0,174.61,0,164.81,0,155.56,0,
  ];
  const SONGS={
    endless1:{ bpm:118, roots:[110.00,87.31,130.81,98.00], lead:LEAD_HYPE,  thirdMap:[3,4,4,3] },
    endless2:{ bpm:132, roots:[146.83,110.00,164.81,123.47], lead:LEAD_DRIVE, thirdMap:[4,3,4,3] },
    endless3:{ bpm:128, roots:[87.31,130.81,98.00,116.54], lead:LEAD_SYNTH, thirdMap:[4,4,3,4] },
    gauntlet:{ bpm:94,  roots:[82.41,69.30,77.78,61.74],   lead:LEAD_DARK,  thirdMap:[3,3,3,3] },
    intro:   { bpm:118, roots:[110.00,87.31,130.81,98.00], lead:LEAD_HYPE,  thirdMap:[3,4,4,3] },
  };
  let currentSong=SONGS.endless1;
  let STEP=60/currentSong.bpm/4;
  function setSong(id){
    if(!SONGS[id]) return;
    if(SONGS[id]===currentSong) return;
    currentSong=SONGS[id];
    STEP=60/currentSong.bpm/4;
    step=0;
  }
  const KICK =[1,0,0,0,1,0,0,0,1,0,0,1,1,0,0,0];
  const SNARE=[0,0,0,0,1,0,0,0,0,0,0,0,1,0,1,0];
  const HAT  =[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,1];
  const OHAT =[0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0];
  const BASS_MULT=[1,0,0,1,0,1,1,0,1.5,0,0,1,0,2,0,1];
  function chordTones(i){
    const r=currentSong.roots[i]*2;
    const third=r*Math.pow(2,currentSong.thirdMap[i]/12);
    return [r,third,r*Math.pow(2,7/12)];
  }
  function init(){
    if(aCx)return;
    aCx=new(window.AudioContext||window.webkitAudioContext)();
    masterGain=aCx.createGain(); masterGain.gain.value=storedVol; masterGain.connect(aCx.destination);
    layers.drums=ml(0); layers.bass=ml(0); layers.pad=ml(0); layers.lead=ml(0);
    nextTime=aCx.currentTime+0.15; scheduler();
  }
  function ml(vol){ const g=aCx.createGain(); g.gain.value=vol; g.connect(masterGain); return{gain:g,target:0}; }
  function setLayers(w){ layers.drums.target=1; layers.bass.target=w>=6?0.9:0; layers.pad.target=w>=11?0.35:0; layers.lead.target=w>=16?0.45:0; }
  function setTension(t){ tension=Math.max(0,Math.min(1,t)); }
  function kickAt(t){
    const o=aCx.createOscillator(),g=aCx.createGain();
    o.type='sine'; o.frequency.setValueAtTime(160,t); o.frequency.exponentialRampToValueAtTime(45,t+0.15);
    g.gain.setValueAtTime(1.1,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.2);
    o.connect(g); g.connect(layers.drums.gain); o.start(t); o.stop(t+0.22);
  }
  function snareAt(t){
    const sz=Math.floor(aCx.sampleRate*0.18),buf=aCx.createBuffer(1,sz,aCx.sampleRate),d=buf.getChannelData(0);
    for(let i=0;i<sz;i++) d[i]=(Math.random()*2-1)*(1-i/sz);
    const src=aCx.createBufferSource(); src.buffer=buf;
    const f=aCx.createBiquadFilter(); f.type='bandpass'; f.frequency.value=1800; f.Q.value=0.8;
    const g=aCx.createGain(); g.gain.setValueAtTime(0.6,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.18);
    src.connect(f); f.connect(g); g.connect(layers.drums.gain); src.start(t);
    const o=aCx.createOscillator(),og=aCx.createGain(); o.type='triangle'; o.frequency.value=220;
    og.gain.setValueAtTime(0.3,t); og.gain.exponentialRampToValueAtTime(0.001,t+0.1);
    o.connect(og); og.connect(layers.drums.gain); o.start(t); o.stop(t+0.12);
  }
  function hatAt(t,open=false){
    const dur=open?0.14:0.04,sz=Math.floor(aCx.sampleRate*dur),buf=aCx.createBuffer(1,sz,aCx.sampleRate),d=buf.getChannelData(0);
    for(let i=0;i<sz;i++) d[i]=(Math.random()*2-1)*(1-i/sz);
    const src=aCx.createBufferSource(); src.buffer=buf;
    const f=aCx.createBiquadFilter(); f.type='highpass'; f.frequency.value=7500;
    const g=aCx.createGain(); g.gain.setValueAtTime(open?0.22:0.3,t); g.gain.exponentialRampToValueAtTime(0.001,t+dur);
    src.connect(f); f.connect(g); g.connect(layers.drums.gain); src.start(t);
  }
  function bassAt(t,freq,dur=0.22){
    const o=aCx.createOscillator(),g=aCx.createGain(),f=aCx.createBiquadFilter();
    o.type='sawtooth'; o.frequency.value=freq; f.type='lowpass'; f.frequency.value=350+tension*500;
    g.gain.setValueAtTime(0.001,t); g.gain.linearRampToValueAtTime(0.55,t+0.01); g.gain.exponentialRampToValueAtTime(0.001,t+dur);
    o.connect(f); f.connect(g); g.connect(layers.bass.gain); o.start(t); o.stop(t+dur+0.02);
    const o2=aCx.createOscillator(),g2=aCx.createGain(); o2.type='sine'; o2.frequency.value=freq/2;
    g2.gain.setValueAtTime(0.4,t); g2.gain.exponentialRampToValueAtTime(0.001,t+dur);
    o2.connect(g2); g2.connect(layers.bass.gain); o2.start(t); o2.stop(t+dur+0.02);
  }
  function padAt(t,freqs,dur){
    for(const fr of freqs){
      const o=aCx.createOscillator(),g=aCx.createGain(); o.type='sawtooth'; o.frequency.value=fr;
      g.gain.setValueAtTime(0.001,t); g.gain.linearRampToValueAtTime(0.08,t+0.15);
      g.gain.linearRampToValueAtTime(0.08,t+dur-0.2); g.gain.linearRampToValueAtTime(0.001,t+dur);
      const lp=aCx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=1400;
      o.connect(lp); lp.connect(g); g.connect(layers.pad.gain); o.start(t); o.stop(t+dur+0.05);
    }
  }
  function leadAt(t,freq,dur=0.18){
    const o=aCx.createOscillator(),o2=aCx.createOscillator(),g=aCx.createGain();
    o.type='square'; o.frequency.value=freq; o2.type='triangle'; o2.frequency.value=freq*2.005;
    const lp=aCx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=2400;
    g.gain.setValueAtTime(0.001,t); g.gain.linearRampToValueAtTime(0.18,t+0.01); g.gain.exponentialRampToValueAtTime(0.001,t+dur);
    o.connect(lp); o2.connect(lp); lp.connect(g); g.connect(layers.lead.gain);
    o.start(t); o.stop(t+dur+0.02); o2.start(t); o2.stop(t+dur+0.02);
  }
  let nextTime=0,step=0;
  function scheduler(){
    if(!aCx)return;
    const now=aCx.currentTime;
    for(const k of Object.keys(layers)) layers[k].gain.gain.setTargetAtTime(layers[k].target,now,0.4);
    while(nextTime<now+0.25){
      const beat=step%16,bar=Math.floor(step/16)%4,root=currentSong.roots[bar];
      if(KICK[beat])kickAt(nextTime); if(SNARE[beat])snareAt(nextTime);
      if(HAT[beat])hatAt(nextTime,false); if(OHAT[beat])hatAt(nextTime,true);
      const bm=BASS_MULT[beat]; if(bm)bassAt(nextTime,root*bm,STEP*1.6);
      if(beat===0)padAt(nextTime,chordTones(bar),STEP*16);
      const leadF=currentSong.lead[bar*16+beat]; if(leadF)leadAt(nextTime,leadF,STEP*1.8);
      nextTime+=STEP; step++;
    }
    setTimeout(scheduler,40);
  }
  function blip(freq,dur=0.08,type='square',vol=0.12){
    if(!aCx)return;
    const t=aCx.currentTime,o=aCx.createOscillator(),g=aCx.createGain();
    o.type=type; o.frequency.value=freq; g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.001,t+dur);
    o.connect(g); g.connect(masterGain); o.start(t); o.stop(t+dur+0.02);
  }
  function noise(dur=0.15,vol=0.15){
    if(!aCx)return;
    const t=aCx.currentTime,sz=Math.floor(aCx.sampleRate*dur),buf=aCx.createBuffer(1,sz,aCx.sampleRate),d=buf.getChannelData(0);
    for(let i=0;i<sz;i++) d[i]=(Math.random()*2-1)*(1-i/sz);
    const src=aCx.createBufferSource(); src.buffer=buf;
    const g=aCx.createGain(); g.gain.value=vol; src.connect(g); g.connect(masterGain); src.start(t);
  }
  let storedVol=0.32;
  function setMasterVolume(v){ storedVol=v; if(masterGain) masterGain.gain.value=v; }
  function getStoredVolume(){ return storedVol; }
  return{init,setLayers,setTension,blip,noise,setMasterVolume,getStoredVolume,setSong};
})();

// ============================================================
// UTILS
// ============================================================
const rand=(a,b)=>a+Math.random()*(b-a);
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const dist2=(ax,ay,bx,by)=>(ax-bx)**2+(ay-by)**2;
const lerp=(a,b,t)=>a+(b-a)*t;
function hsl(h,s=70,l=55,a=1){
  return 'hsla('+((h%360+360)%360)+','+s+'%,'+l+'%,'+a+')';
}
function classSkillScale(cls){
  switch(cls){
    case 'blue': return 3;
    case 'black': return 5;
    default: return 1;
  }
}
function currentSkillDamageBonus(cls){
  return game.upgrades.skillDamage * classSkillScale(cls);
}
function arenaRect(){
  const s=game.arenaScale;
  const w=BASE_W*0.85*s, h=BASE_H*0.78*s;
  const maxW=BASE_W*0.95, maxH=BASE_H*0.90;
  const aw=Math.min(w,maxW), ah=Math.min(h,maxH);
  return{ x:(BASE_W-aw)/2, y:(BASE_H-ah)/2, w:aw, h:ah };
}

// ============================================================
// RARITY / BOON SYSTEM
// ============================================================
const RARITY_DEFS = {
  common:    { label:'Common',    value:1, color:'#cfd8dc', weight:55 },
  rare:      { label:'Rare',      value:2, color:'#64b5f6', weight:25 },
  epic:      { label:'Epic',      value:3, color:'#ba68c8', weight:15 },
  legendary: { label:'Legendary', value:4, color:'#ffd166', weight:5  },
};

const BOON_POOLS = {
  common: ['hp','skillCooldown','blockCooldown','skillDamage','moveSpeed','damage'],
  rare:   ['hp','skillCooldown','blockCooldown','skillDamage','moveSpeed','damage'],
  epic:   ['hp','skillCooldown','blockCooldown','skillDamage','moveSpeed','damage','shots'],
};

function pickRarity() {
  const better = !!game.upgrades.betterBoons;
  const roll = Math.random()*100;
  if(roll<5) return 'legendary';
  if(better){ if(roll<30) return 'epic'; if(roll<65) return 'rare'; return 'common'; }
  if(roll<20) return 'epic'; if(roll<45) return 'rare'; return 'common';
}

function boonDesc(key, rarity) {
  const v = RARITY_DEFS[rarity].value;
  const cls = game.player ? game.player.cls : null;
  switch(key) {
    case 'hp':
      if(cls==='white') return 'No effect (Star has fixed 1 HP).';
      if(cls==='yellow') return '+'+v+' max HP to the hexagon, +'+(v*2)+' max HP to every triangle ally.';
      return '+'+v+' max health.';
    case 'shots':
      if(cls==='yellow') return '+1 max triangle ally (up to 10 total).';
      return '+1 extra projectile stream. Max 4 total extras.';
    case 'damage':
      return '+'+v+' bullet damage.';
    case 'skillCooldown':
      if(cls==='blue') return 'Big Ball gets '+v+' size tier'+(v>1?'s':'')+' bigger.';
      if(cls==='kite') return '+'+(v*80)+'px ghost trail length.';
      if(cls==='crescent') return '+'+(v*90)+' crescent bullet speed.';
      return 'Reduce ability cooldown (stacks with diminishing returns).';
    case 'blockCooldown':
      return 'Reduce block cooldown (stacks with diminishing returns).';
    case 'skillDamage':
      const sd = v*3;
      if(cls==='purple') return '+'+(0.2*v).toFixed(1)+'s Octagon burst duration.';
      if(cls==='red')    return 'No effect (Trapezoid has no skill damage).';
      if(cls==='black')  return '+'+(sd*5)+' ring damage (5× effective for Skull).';
      if(cls==='blue')   return '+'+(sd*3)+' Big Ball damage (3× effective for Circle).';
      if(cls==='orange') return '+'+sd+' Time Pause shockwave damage.';
      if(cls==='green')  return '+'+sd+' Dash damage per enemy.';
      if(cls==='white')  return '+'+sd+' touch damage while invulnerable.';
      if(cls==='yellow') return '+'+sd+' damage per triangle hit.';
      if(cls==='pink')   return '+'+(v*20)+'px dash range.';
      return '+'+sd+' damage to damaging abilities.';
    case 'moveSpeed':
      return '+'+(10*v)+'% movement speed.';
    default: return '';
  }
}

const BOON_DEFS = {
  hp: { title:'Extra Health', apply(v){
    if(!game.player) return;
    if(game.player.cls==='white') return;
    if(game.player.cls==='yellow'){
      game.upgrades.hp += v;
      const triBonus = v*2;
      for(const t of game.hexTriangles){ t.hp+=triBonus; t.maxHp+=triBonus; }
      game.yellowTriHpBonus = (game.yellowTriHpBonus||0)+triBonus;
      // Hexagon player gains +v HP (scales with rarity)
      game.player.maxHp += v; game.player.hp += v;
    } else {
      game.upgrades.hp+=v; game.player.maxHp+=v; game.player.hp+=v;
    }
  }},
  shots: { title:'Extra Shot', apply(){
    if(game.player&&game.player.cls==='yellow'){
      game.upgrades.shots=Math.min(4,game.upgrades.shots+1);
    } else {
      game.upgrades.shots=Math.min(4,game.upgrades.shots+1);
    }
  }},
  damage:        { title:'Bullet Damage',  apply(v){ game.upgrades.damage+=v; }},
  skillCooldown: { title:'Skill Cooldown', apply(v){
    if(game.player&&game.player.cls==='blue') game.upgrades.blueBallSize+=v;
    else game.upgrades.skillCooldown+=v;
  }},
  blockCooldown: { title:'Block Cooldown', apply(v){ game.upgrades.blockCooldown+=v; }},
  skillDamage:   { title:'Skill Damage',   apply(v){
    if(game.player&&game.player.cls==='purple') game.upgrades.octaDuration+=v;
    else game.upgrades.skillDamage+=v*3;
  }},
  moveSpeed:     { title:'Move Speed',     apply(v){ game.upgrades.moveSpeed+=v; }},
};

const LEGENDARY_KEYS = ['revive','pierce','bounce','borrowAbility','betterBoons','megaStat'];
const LEGENDARY_DEFS = {
  revive:       { title:'Phoenix Heart',    desc:'Revive once with full HP when you would die.', apply(){ game.upgrades.revive=(game.upgrades.revive||0)+1; }},
  pierce:       { title:'Piercing Rounds',  desc:'Bullets pierce through every enemy.', apply(){ game.upgrades.pierce=true; }},
  bounce:       { title:'Ricochet Rounds',  desc:'Bullets bounce off arena walls once.', apply(){ game.upgrades.bounce=true; }},
  borrowAbility:{ title:'Borrowed Power',   desc:'Gain a random weakened ability from another class. Fixed at pick time. Activate with T.',
    apply(){
      const p=game.player;
      // V2: kite and crescent are too class-dependent to lend out
      const others=Object.keys(CLASSES).filter(c=>c!==p.cls&&c!=='kite'&&c!=='crescent');
      const cls=others[Math.floor(Math.random()*others.length)];
      game.upgrades.borrowedAbility=cls;
      game.borrowed={ cls, t:0, active:0, charges:1, maxCharges:1 };
    }
  },
  betterBoons:  { title:'Fortune Favored',  desc:'Better odds on future boon rolls.', apply(){ game.upgrades.betterBoons=true; }},
  megaStat:     { title:'Apex Stat',        desc:'+4 to a random stat upgrade.', apply(){ applyMegaStat(); }},
};

function applyMegaStat(){
  const opts=['hp','damage','skillCooldown','blockCooldown','skillDamage','moveSpeed'];
  let pool=opts.filter(k=>!(game.player&&game.player.cls==='white'&&k==='hp'));
  if(game.player&&game.player.cls==='red') pool=pool.filter(k=>k!=='skillDamage');
  if(game.player&&game.player.cls==='yellow') pool=pool.filter(k=>k!=='damage');
  const key=pool[Math.floor(Math.random()*pool.length)];
  BOON_DEFS[key].apply(4);
  game.boonHistory.push('Apex '+BOON_DEFS[key].title+' (+4)');
}

function getAvailableBoonKeys(rarity) {
  const cls = game.player ? game.player.cls : null;
  let keys = BOON_POOLS[rarity] || BOON_POOLS.common;
  if(cls==='white')  keys=keys.filter(k=>k!=='hp');
  if(cls==='red')    keys=keys.filter(k=>k!=='skillDamage');
  if(cls==='yellow') keys=keys.filter(k=>k!=='damage');
  if(cls==='red'||cls==='yellow') keys=keys.filter(k=>k!=='shots'||cls==='yellow');
  return keys;
}

function rollBoonChoices(){
  const choices=[], used=new Set();
  while(choices.length<3){
    const rarity=pickRarity();
    if(rarity==='legendary'){
      const owned=game.legendariesOwned.size;
      const available=LEGENDARY_KEYS.filter(k=>!game.legendariesOwned.has(k)&&!used.has('legendary:'+k));
      if(owned>=2||!available.length){
        if(used.has('legendary:_mega'))continue;
        used.add('legendary:_mega'); choices.push({key:'megaStat',rarity:'legendary',isFallback:true}); continue;
      }
      const key=available[Math.floor(Math.random()*available.length)];
      used.add('legendary:'+key); choices.push({key,rarity:'legendary',isFallback:false}); continue;
    }
    let pool=getAvailableBoonKeys(rarity).filter(k=>!used.has(rarity+':'+k));
    if(rarity!=='epic') pool=pool.filter(k=>k!=='shots');
    pool=pool.filter(k=>!(k==='shots'&&game.upgrades.shots>=4));
    if(!pool.length)continue;
    const key=pool[Math.floor(Math.random()*pool.length)];
    used.add(rarity+':'+key); choices.push({key,rarity});
  }
  return choices;
}

function effectiveAbilityCooldown(cls){
  // V2: Blue and Crescent have fixed in-run cooldowns (their Skill Cooldown boons are repurposed elsewhere)
  if(cls==='blue') return Math.max(1, 10*(1-game.preRunBonus.skillCooldown)*Math.pow(0.90,0));
  if(cls==='crescent') return Math.max(1, 20*(1-game.preRunBonus.skillCooldown)); // 10s form + 10s cooldown
  if(cls==='kite') return 0.8; // passive — no cooldown
  const base=CLASSES[cls].cooldown||0;
  return Math.max(0.8, base*(1-game.preRunBonus.skillCooldown)*Math.pow(0.90,game.upgrades.skillCooldown));
}
const BORROWED_COOLDOWNS = {
  orange:20, white:30, green:10, blue:15, purple:30,
  red:10, yellow:10, pink:6, black:60
};
function effectiveBorrowedCooldown(cls){
  const base=BORROWED_COOLDOWNS[cls]||CLASSES[cls].cooldown||10;
  return Math.max(0.8, base*(1-game.preRunBonus.skillCooldown)*Math.pow(0.90,game.upgrades.skillCooldown));
}
function effectiveBlockCooldown(){
  return Math.max(0.6, BLOCK_COOLDOWN*(1-game.preRunBonus.blockCooldown)*Math.pow(0.90,game.upgrades.blockCooldown));
}

function openBoonMenu(){
  game.state='boonselect';
  mouse.down=false; mouse.right=false; // V2: stop firing while the menu is up
  const grid=document.getElementById('boonGrid');
  grid.innerHTML='';
  const picks=rollBoonChoices();
  const sub=document.querySelector('#boonMenu .subtitle');
  if(sub) sub.textContent='Pick an upgrade. Remaining after this: '+Math.max(0,game.pendingBoonPicks-1);
  picks.forEach(pick=>{
    const{key,rarity,isFallback}=pick;
    const rd=RARITY_DEFS[rarity];
    const card=document.createElement('div');
    card.className='boon-card';
    card.style.borderColor=rd.color;
    card.style.boxShadow='0 0 22px '+rd.color+'55';
    let title,descText;
    if(rarity==='legendary'){ title=LEGENDARY_DEFS[key].title; descText=LEGENDARY_DEFS[key].desc; }
    else { title=BOON_DEFS[key].title; descText=boonDesc(key,rarity); }
    card.innerHTML='<h3>'+title+'</h3><p><b style="color:'+rd.color+'">'+rd.label+'</b> · '+descText+'</p>';
    card.addEventListener('click',()=>{
      if(rarity==='legendary'){
        LEGENDARY_DEFS[key].apply();
        if(!isFallback) game.legendariesOwned.add(key);
        game.totalUpgrades+=4; game.boonHistory.push(title+' (Legendary)');
      } else {
        BOON_DEFS[key].apply(rd.value);
        game.totalUpgrades+=rd.value; game.boonHistory.push(title+' ('+rd.label+')');
      }
      game.pendingBoonPicks=Math.max(0,game.pendingBoonPicks-1);
      if(game.pendingBoonPicks>0){ openBoonMenu(); return; }
      document.getElementById('boonMenu').style.display='none';
      game.bossWavePendingReward=false;
      if(game.pendingAfterBoons==='start'||game.pendingAfterBoons==='nextWave'){
        game.state='playing'; startWave(game.pendingNextWave);
      } else { game.state='wavebreak'; game.waveBreak=1.2; }
    });
    grid.appendChild(card);
  });
  document.getElementById('boonMenu').style.display='flex';
}

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

function isSkullPeriodicWave(n){ return game.mode==='endless'&&n>0&&n%50===0; }

function getBossScale(){ return{hp:1+game.totalUpgrades*0.5, speed:1+game.totalUpgrades*0.05}; }

function getEnemyRunScale(){
  const wave=Math.max(1,game.wave||1);
  const diff=DIFFICULTIES[game.difficulty]||DIFFICULTIES.easy;
  const ds=diff.scale;
  const baseHp=1+Math.min(1.2,(wave-1)*0.032);
  const baseSpeed=1+Math.min(0.30,(wave-1)*0.009);
  const expectedUpgrades=Math.floor((wave-1)*0.8);
  const missing=Math.max(0,expectedUpgrades-game.totalUpgrades);
  const catchupHp=1+Math.min(0.22,missing*0.035);
  const catchupSpeed=1+Math.min(0.08,missing*0.012);
  // V2: bosses scale slightly less brutally — HP 15% less aggressive, speed 30% less
  const bossHp=1+game.bossesDefeated*0.0850;
  const bossSpeed=1+game.bossesDefeated*0.0175;
  return{
    hp:  baseHp*catchupHp*bossHp*ds,
    speed:baseSpeed*catchupSpeed*bossSpeed*ds,
  };
}

// ============================================================
// PLAYER
// ============================================================
function makePlayer(cls){
  const C=CLASSES[cls];
  return{ x:BASE_W/2, y:BASE_H/2, vx:0, vy:0,
    cls, color:C.color,
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
    const tickDmg=CLASSES.kite.trailTickDmg+game.upgrades.skillDamage*2;
    for(const e of game.enemies){
      if(e.hp<=0||e.state==='spawn'||e.type==='healthpack') continue;
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
        game.playerBullets.push({ x:p.x+Math.cos(ang)*(PLAYER_RADIUS+4), y:p.y+Math.sin(ang)*(PLAYER_RADIUS+4), vx:Math.cos(ang)*PLAYER_BULLET_SPEED, vy:Math.sin(ang)*PLAYER_BULLET_SPEED, life:1.2, bouncesLeft:game.upgrades.bounce?1:0 });
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
        for(let i=0;i<8;i++){ const ang=p.angle+i*(Math.PI/4); game.playerBullets.push({ x:p.x+Math.cos(ang)*(PLAYER_RADIUS+4),y:p.y+Math.sin(ang)*(PLAYER_RADIUS+4),vx:Math.cos(ang)*PLAYER_BULLET_SPEED,vy:Math.sin(ang)*PLAYER_BULLET_SPEED,life:1.2,bouncesLeft:game.upgrades.bounce?1:0 }); }
        p.octaFireCdB=CLASSES.purple.burstRate;
      }
    }
  }

  if(game.block.active>0) game.block.active-=dt;
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

  // Arena edge bounce — ALWAYS damages the player, bypassing iframes and block
  let edgeBounced=false;
  if(p.x<A.x+PLAYER_RADIUS){ p.x=A.x+PLAYER_RADIUS; if(p.dashT>0){p.dashVx=Math.abs(p.dashVx);}else{p.knockVx=Math.max(p.knockVx||0,380);} edgeBounced=true; }
  if(p.x>A.x+A.w-PLAYER_RADIUS){ p.x=A.x+A.w-PLAYER_RADIUS; if(p.dashT>0){p.dashVx=-Math.abs(p.dashVx);}else{p.knockVx=Math.min(p.knockVx||0,-380);} edgeBounced=true; }
  if(p.y<A.y+PLAYER_RADIUS){ p.y=A.y+PLAYER_RADIUS; if(p.dashT>0){p.dashVy=Math.abs(p.dashVy);}else{p.knockVy=Math.max(p.knockVy||0,380);} edgeBounced=true; }
  if(p.y>A.y+A.h-PLAYER_RADIUS){ p.y=A.y+A.h-PLAYER_RADIUS; if(p.dashT>0){p.dashVy=-Math.abs(p.dashVy);}else{p.knockVy=Math.min(p.knockVy||0,-380);} edgeBounced=true; }
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
      const aimX=game.aimX!==undefined?game.aimX:mouse.x, aimY=game.aimY!==undefined?game.aimY:mouse.y;
      const dx=aimX-p.x, dy=aimY-p.y, m=Math.max(60,Math.hypot(dx,dy));
      const nx=dx/m, ny=dy/m;
      const spd=CLASSES.crescent.crescentSpeed + game.upgrades.skillCooldown*90;
      const dmg=(PLAYER_BULLET_DMG+game.upgrades.damage)*2 + currentSkillDamageBonus('crescent');
      for(let i=0;i<totalShots;i++){
        const ang=p.angle+(i-half)*spreadStep;
        game.playerBullets.push({
          x:p.x+Math.cos(ang)*PLAYER_RADIUS, y:p.y+Math.sin(ang)*PLAYER_RADIUS,
          vx:Math.cos(ang)*spd, vy:Math.sin(ang)*spd,
          life:4.0, crescent:true, crescentSpd:spd, dmg,
          maxTravel:m, travelled:0, returning:false, pierced:new WeakSet(),
          bouncesLeft:0,
        });
      }
      p.fireCd=1/PLAYER_FIRE_RATE;
      Audio.blip(540+Math.random()*60,0.07,'triangle',0.1);
    } else {
      for(let i=0;i<totalShots;i++){
        const ang=p.angle+(i-half)*spreadStep;
        game.playerBullets.push({ x:p.x+Math.cos(ang)*PLAYER_RADIUS, y:p.y+Math.sin(ang)*PLAYER_RADIUS, vx:Math.cos(ang)*PLAYER_BULLET_SPEED, vy:Math.sin(ang)*PLAYER_BULLET_SPEED, life:bulletLife, bouncesLeft:game.upgrades.bounce?1:0 });
      }
      p.fireCd=1/PLAYER_FIRE_RATE;
      Audio.blip(880+Math.random()*80,0.05,'square',0.08);
    }
  }

  // Block
  if(keys[' ']&&game.block.t<=0&&game.block.active<=0){
    game.block.active=BLOCK_DURATION; game.block.t=effectiveBlockCooldown();
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
    game.playerBullets.push({ x:p.x+(dx/m)*(PLAYER_RADIUS+4),y:p.y+(dy/m)*(PLAYER_RADIUS+4),vx:(dx/m)*C.ballSpeed,vy:(dy/m)*C.ballSpeed,life:6,bigBall:true,r:radius,dmg:C.ballDmg+currentSkillDamageBonus('blue'),pierced:new WeakSet() });
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
    game.deathRings.push({ x:p.x, y:p.y, r:PLAYER_RADIUS+6, maxR:cornerDist+40, speed:520, dmg, hits:new Set() });
    game.ability.t=effectiveAbilityCooldown('black');
    Audio.noise(0.6,0.35); Audio.blip(80,0.5,'sawtooth',0.28);
  } else if(p.cls==='kite'){
    // Passive trail — no active ability
    return;
  } else if(p.cls==='crescent'){
    if(game.ability.t>0||p.crescentActive>0) return;
    p.crescentActive=CLASSES.crescent.duration;
    game.ability.active=CLASSES.crescent.duration;
    // Full cycle: 10s active form + 10s cooldown. HUD ticks down the combined total.
    game.ability.t=CLASSES.crescent.duration+CLASSES.crescent.cooldown;
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
    game.playerBullets.push({ x:p.x+(dx/m)*(PLAYER_RADIUS+4),y:p.y+(dy/m)*(PLAYER_RADIUS+4),vx:(dx/m)*C.ballSpeed,vy:(dy/m)*C.ballSpeed,life:6,bigBall:true,r:radius,dmg:C.ballDmg+currentSkillDamageBonus('blue'),pierced:new WeakSet() });
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
    game.deathRings.push({ x:p.x, y:p.y, r:PLAYER_RADIUS+6, maxR:cornerDist+40, speed:520, dmg, hits:new Set() });
    B.t=cd;
    Audio.noise(0.6,0.35); Audio.blip(80,0.5,'sawtooth',0.28);
  }
}

function damagePlayer(amount=1){
  const p=game.player; if(!p) return;
  if(p.iframes>0) return;
  if(game.block.active>0){
    game.block.active=0; spawnParticles(p.x,p.y,'#fff',16,160); Audio.blip(400,0.12,'triangle',0.18); p.iframes=0.3; return;
  }
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
            damagePlayer(1);
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

// ============================================================
// WAVES
// ============================================================
function buildFixedWave(n){
  // V2: Intro walks players through every enemy type, one introduction per wave
  const q=[],add=(t,c)=>{for(let i=0;i<c;i++)q.push(t);};
  if(n===1){ add('circle',4); }
  else if(n===2){ add('circle',4); add('triangle',2); }                                     // introduce triangle
  else if(n===3){ add('circle',3); add('triangle',2); add('arrow',3); }                     // introduce arrow
  else if(n===4){ add('circle',2); add('triangle',2); add('arrow',2); add('hexagon',2); }   // introduce hexagon
  else if(n===5){ add('circle',2); add('arrow',2); add('hexagon',1); add('diamond',2); }    // introduce diamond
  else if(n===6){ add('circle',2); add('triangle',2); add('arrow',2); add('trapezoid',2); } // introduce trapezoid
  else if(n===7){ q.push({type:'octagon',boss:true,skipSpawnAnim:true}); add('circle',3); } // introduce octagon (boss)
  else if(n===8){ add('triangle',2); add('arrow',2); add('hexagon',2); add('diamond',2); add('trapezoid',1); } // sampler
  else if(n===9){ add('circle',3); add('triangle',3); add('arrow',3); add('hexagon',2); add('diamond',2); add('trapezoid',2); } // full roster
  else if(n===10){ q.push({type:'skull',boss:true,sharedBossPool:'intro_skull',sharedBossRole:0}); } // final Skull boss
  return q;
}

function buildPointWave(n){
  let budget=25+(n-1)*5+Math.floor(n/10)*50;
  const q=[], chaos=['circle'], pressure=['triangle','arrow'], control=['hexagon','diamond','trapezoid'];
  const forceOne=pool=>{ const t=pool[Math.floor(Math.random()*pool.length)]; if(ENEMY_DEFS[t].cost<=budget){q.push(t);budget-=ENEMY_DEFS[t].cost;} };
  forceOne(chaos);forceOne(pressure);forceOne(control);
  while(budget>0){
    const pool=Math.random()<0.4?chaos:Math.random()<0.6?pressure:control;
    const t=pool[Math.floor(Math.random()*pool.length)];
    const c=ENEMY_DEFS[t].cost;
    if(c>budget){
      const all=['circle','triangle','arrow','hexagon','diamond'].filter(x=>ENEMY_DEFS[x].cost<=budget);
      if(!all.length)break;
      const a=all[Math.floor(Math.random()*all.length)];q.push(a);budget-=ENEMY_DEFS[a].cost;
    } else {q.push(t);budget-=c;}
  }
  for(let i=q.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[q[i],q[j]]=[q[j],q[i]];}
  return q;
}

function buildGauntletWave(n){
  const roundType=game.gauntletRounds[n-1]; if(!roundType) return [];
  if(roundType==='skull'){ const poolId='gauntlet_skull_'+n; return [{type:'skull',boss:true,sharedBossPool:poolId,sharedBossRole:0},{type:'skull',boss:true,sharedBossPool:poolId,sharedBossRole:1}]; }
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
  if(n%4===1||n===1) game.bgPhase=(game.bgHue+rand(60,180))%360;

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
      const introHasBoss=(game.mode==='intro'&&(n===7||n===10));
      game.bossWavePendingReward=(game.mode==='gauntlet')||isBossWave(n)||introHasBoss;
    }
    // Also check skull warning for gauntlet skull round + intro wave 10 final
    if((game.mode==='gauntlet'&&game.gauntletRounds[n-1]==='skull')||(game.mode==='intro'&&n===10)){
      game.skullFinalPhase=true; game.skullWarnTimer=1.0; game.skullWarnCount=3;
      game.spawnQueue=[]; game.enemyBullets.length=0; game.enemies.length=0;
    }
  }

  // V2: Chance-based healthpack spawn (never in Insane, never on skull/octagon-dedicated waves)
  if(game.difficulty!=='insane' && !isSkullPeriodicWave(n) && !(game.mode==='gauntlet'&&game.gauntletRounds[n-1]==='octagon')){
    const packChance = game.difficulty==='easy'?0.80 : game.difficulty==='normal'?0.50 : 0.25;
    if(Math.random()<packChance){ game.spawnQueue.unshift({type:'healthpack'}); }
  }

  game.spawnTimer=0.6; game.waveLive=false;
  Audio.setLayers(game.mode==='intro'?Math.min(n,8):n+4);
  if(game.skullFinalPhase){ Audio.setLayers(30); Audio.noise(0.35,0.18); }

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
        const poolId='skull_periodic_'+game.wave;
        game.spawnQueue=[{type:'skull',boss:true,sharedBossPool:poolId,sharedBossRole:0}];
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

// ============================================================
// MENU
// ============================================================

const modeDescriptions = {
  intro:    'Intro Mode: fixed teaching waves 1–10, then ramps into the point system.',
  endless:  'Endless Mode: random point-budget waves. Boss kills earn shop points. Every 50th wave: Skull solo.',
  gauntlet: 'Boss Gauntlet: fight each boss type once. Start with 3 boons, gain 3 after each round.',
};

const difficultyDescriptions = {
  easy:   'Easy (0.5x): 80% chance per wave to spawn a green health pack. Killing it restores 1 HP.',
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
