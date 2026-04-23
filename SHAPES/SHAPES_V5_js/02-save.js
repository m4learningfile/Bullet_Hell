// ============================================================
// SAVE SYSTEM
// ============================================================
const SAVE_KEY = 'shapes_v2_save';
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
// CLASS / ENEMY / BOSS INFO (for compendium + unlocks)
// ============================================================
const CLASS_INFO = {
  orange:{
    name:'SQUARE', hp:3, difficulty:'Easy', classType:'Balanced Starter',
    bulletDamage:1, skillName:'Time Pause', skillCooldown:20, skillDamage:2,
    skillDescription:'Time Pause freezes every enemy and enemy bullet in place for a full second and deals a 2-damage shockwave to every enemy in the arena at the moment it activates. A free reset button for dangerous waves.',
    quirks:'No class restrictions — every boon pool is available. Forgiving hitbox and starting HP; recommended for learning enemy patterns.',
    skillBrief:'Time Freeze: Stuns and damages all enemies in the arena.',
    previewLong:'Balanced 3-HP starter with no restrictions. Time Pause freezes everything for a full second and hits every enemy on screen with a 2-dmg shockwave — a free panic button. The easiest class to pick up first.',
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
    bulletDamage:1, skillName:'Directional Dash', skillCooldown:10, skillDamage:2,
    skillDescription:'Dashes in the aimed direction with a short i-frame window, passing through bullets and enemies. Every enemy caught in the dash takes 2 damage. Holds up to 2 charges.',
    quirks:'The only class with ability charges — two dashes in quick succession are a huge clutch tool. Cooldown is per charge.',
    skillBrief:'Dash: Quick directional dash that pierces bullets.',
    previewLong:'Mobility bruiser. Holds 2 charges of a directional dash that grants brief i-frames and damages every enemy caught inside (2 dmg + Skill Damage). The only class with stored ability charges — back-to-back dashes let you reposition and clutch out of chaos.',
    unlockHint:'Kill any boss on Easy or harder.',
  },
  blue:{
    name:'CIRCLE', hp:2, difficulty:'Easy', classType:'Projectile Specialist',
    bulletDamage:1, skillName:'Big Ball', skillCooldown:'10s (fixed)', skillDamage:3,
    skillDescription:'Fires a slow, large piercing orb that travels across the arena. Every enemy it passes through takes 3 damage. The orb persists until it leaves the arena.',
    quirks:'"Skill Cooldown" boons are repurposed to grow the orb radius — every tier makes the orb larger. Circle has no in-run way to shorten its 10s cooldown (only the pre-run Skill Cooldown upgrade affects it).',
    skillBrief:'Big Ball: Slow piercing orb that damages all in its path.',
    previewLong:'Projectile specialist. Big Ball fires a slow piercing orb that deals 3 damage to every enemy it passes through. Skill Cooldown boons are repurposed to grow the orb instead of reducing the fixed 10s cooldown — a class that wipes lines of enemies.',
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
    bulletDamage:1, skillName:'Invuln Dash', skillCooldown:8, skillDamage:'1 + 3× Bullet Damage',
    skillDescription:'Wind up for 1 second in the aimed direction, then charge forward. Whether standing still or mid-dash, any enemy that touches the front arc (±80°) takes melee damage, and you are immune to contact damage from that side. Being hit from the back or sides still damages you.',
    quirks:'Tankiest class at 4 HP. Cannot roll Skill Damage boons — instead, Bullet Damage gives triple scaling to the melee (base 1, +3 per Bullet Damage tier). Each enemy can only be hit by the melee once every 0.5 seconds. Wind-up can be dodged, so aim carefully.',
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
    bulletDamage:1, skillName:'Death Ring', skillCooldown:60, skillDamage:10,
    skillDescription:'Releases an expanding pulse ring from your position that travels to the farthest arena corner. Every enemy the ring sweeps through takes 10 damage, plus 2 extra per Skill Damage boon. Hits each enemy only once per cast.',
    quirks:'60-second cooldown is the longest in the roster. Save the ring for boss waves or emergency clears. Unlocked by completing the ultimate challenge.',
    skillBrief:'Death Ring: Expanding ring that hits every enemy it passes through.',
    previewLong:'Nuker / AoE. Death Ring releases an expanding pulse from your skull that sweeps all the way to the arena\'s farthest corner, hitting every enemy in its path exactly once for 10 + 2× Skill Damage. 60-second cooldown — save it for boss waves or emergencies.',
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
    bulletDamage:1, skillName:'Crescent Form', skillCooldown:'10s duration + 10s cooldown', skillDamage:2,
    skillDescription:'For 10 seconds your bullets transform into indigo crescents: piercing boomerangs that fly out to your cursor position and return, hitting enemies twice per shot. After the form ends, the 10-second cooldown begins. Skill Cooldown boons are repurposed to increase crescent bullet speed.',
    quirks:'Skill Cooldown boons speed up your crescents instead of shortening the cooldown (no in-run cooldown reduction). Skill Damage boons still raise crescent damage normally.',
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
