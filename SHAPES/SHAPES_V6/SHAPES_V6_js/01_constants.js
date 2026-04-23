"use strict";
// ============================================================
// CONSTANTS
// ============================================================
const BASE_W = 1280, BASE_H = 800;
const WORLD_W = BASE_W * 2.5, WORLD_H = BASE_H * 2.5;
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
  kiteenemy:{ hp:1000, r:22, speed:170, cost:0, color:[150,190] },
  healthpack:{ hp:1, r:18, speed:0,   cost:0, color:[120,120] },
};

const PRE_RUN_TIERS = {
  damage:        { label:'Bullet Damage',  values:[0,1,2,3,4,5],                  costs:[0,1,3,6,10,20], desc:'+1 bullet damage per tier.' },
  skillDamage:   { label:'Skill Damage',   values:[0,3,6,9,12,15],                costs:[0,1,3,6,10,20], desc:'+3 skill damage per tier (Circle scales 3x, Skull scales 5x).' },
  hp:            { label:'Health',         values:[0,1,2,3,4,5],                  costs:[0,1,3,6,10,20], desc:'+1 max HP per tier.' },
  skillCooldown: { label:'Skill Cooldown', values:[0,0.05,0.10,0.15,0.20,0.25],   costs:[0,1,3,6,10,20], desc:'5% lower skill cooldown per tier.' },
  moveSpeed:     { label:'Move Speed',     values:[0,0.05,0.10,0.15,0.20,0.25],   costs:[0,1,3,6,10,20], desc:'5% more movement speed per tier.' },
  blockCooldown: { label:'Block Cooldown', values:[0,0.05,0.10,0.15,0.20,0.25],   costs:[0,1,3,6,10,20], desc:'5% lower block cooldown per tier.' },
  shots:         { label:'Extra Bullet Stream', values:[0,1,2,3],                 costs:[0,5,15,25], desc:'+1 additional bullet stream per tier.' },
};

