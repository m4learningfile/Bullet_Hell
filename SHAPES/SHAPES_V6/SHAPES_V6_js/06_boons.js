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
      if(cls==='crescent') return '+'+(sd*30)+' crescent bullet speed.';
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

const UNIQUE_LEGENDARY_KEYS = new Set(['revive','pierce','bounce','borrowAbility','betterBoons']);
const LEGENDARY_KEYS = ['revive','pierce','bounce','borrowAbility','betterBoons','hp','damage','skillDamage','skillCooldown','blockCooldown','moveSpeed'];
const LEGENDARY_DEFS = {
  revive:        { title:'Phoenix Heart',    desc:'Revive once with full HP when you would die.', apply(){ game.upgrades.revive=(game.upgrades.revive||0)+1; }},
  pierce:        { title:'Piercing Rounds',  desc:'Bullets pierce through every enemy.', apply(){ game.upgrades.pierce=true; }},
  bounce:        { title:'Ricochet Rounds',  desc:'Bullets bounce off arena walls once.', apply(){ game.upgrades.bounce=true; }},
  borrowAbility: { title:'Borrowed Power',   desc:'Gain a random weakened ability from another class. Fixed at pick time. Activate with T.',
    apply(){
      const p=game.player;
      // V2: kite and crescent are too class-dependent to lend out
      const others=Object.keys(CLASSES).filter(c=>c!==p.cls&&c!=='kite'&&c!=='crescent');
      const cls=others[Math.floor(Math.random()*others.length)];
      game.upgrades.borrowedAbility=cls;
      game.borrowed={ cls, t:0, active:0, charges:1, maxCharges:1 };
    }
  },
  betterBoons:   { title:'Fortune Favored',  desc:'Better odds on future boon rolls.', apply(){ game.upgrades.betterBoons=true; }},
  hp:            { title:'Apex Health',         apply(){ BOON_DEFS.hp.apply(4); }},
  damage:        { title:'Apex Bullet Damage',  apply(){ BOON_DEFS.damage.apply(4); }},
  skillDamage:   { title:'Apex Skill Damage',   apply(){ BOON_DEFS.skillDamage.apply(4); }},
  skillCooldown: { title:'Apex Skill Cooldown', apply(){ BOON_DEFS.skillCooldown.apply(4); }},
  blockCooldown: { title:'Apex Block Cooldown', apply(){ BOON_DEFS.blockCooldown.apply(4); }},
  moveSpeed:     { title:'Apex Move Speed',     apply(){ BOON_DEFS.moveSpeed.apply(4); }},
};

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
      const cls = game.player ? game.player.cls : null;
      const uniqueOwned = [...game.legendariesOwned].filter(k=>UNIQUE_LEGENDARY_KEYS.has(k)).length;
      const pool = LEGENDARY_KEYS.filter(k=>{
        if(used.has('legendary:'+k)) return false;
        if(UNIQUE_LEGENDARY_KEYS.has(k)){
          if(game.legendariesOwned.has(k)) return false;
          if(uniqueOwned>=2) return false;
          return true;
        }
        if(cls==='white' && k==='hp') return false;
        if(cls==='red'   && k==='skillDamage') return false;
        if(cls==='yellow'&& k==='damage') return false;
        return true;
      });
      if(!pool.length) continue;
      const key=pool[Math.floor(Math.random()*pool.length)];
      used.add('legendary:'+key); choices.push({key,rarity:'legendary'}); continue;
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
  // V2: Blue has a fixed in-run cooldown; Crescent now uses normal cooldown scaling again
  if(cls==='blue') return Math.max(1, 10*(1-game.preRunBonus.skillCooldown)*Math.pow(0.90,0));
  if(cls==='crescent') return Math.max(0.8, CLASSES.crescent.cooldown*(1-game.preRunBonus.skillCooldown)*Math.pow(0.90,game.upgrades.skillCooldown));
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
    const{key,rarity}=pick;
    const rd=RARITY_DEFS[rarity];
    const card=document.createElement('div');
    card.className='boon-card';
    card.style.borderColor=rd.color;
    card.style.boxShadow='0 0 22px '+rd.color+'55';
    let title,descText;
    if(rarity==='legendary'){ title=LEGENDARY_DEFS[key].title; descText=LEGENDARY_DEFS[key].desc || boonDesc(key,'legendary'); }
    else { title=BOON_DEFS[key].title; descText=boonDesc(key,rarity); }
    card.innerHTML='<h3>'+title+'</h3><p><b style="color:'+rd.color+'">'+rd.label+'</b> · '+descText+'</p>';
    card.addEventListener('click',()=>{
      if(rarity==='legendary'){
        LEGENDARY_DEFS[key].apply();
        if(UNIQUE_LEGENDARY_KEYS.has(key)) game.legendariesOwned.add(key);
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

