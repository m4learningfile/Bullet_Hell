# Bullet Hell Project – Full Context Save

## 🔥 Core Concept
Fast-paced **bullet hell / roguelite hybrid**

- Movement: WASD  
- Aim: Mouse  
- Fire: Left click  
- Ability: Right click  
- Block: Space  
- Pause: P  
- Debug: K (Test mode only → jumps to Skull)

---

## 🎮 Game Modes

### Intro Mode
- Waves 1–10 fixed
- Then transitions into scaling system

### Endless Mode
- Starts immediately with scaling
- Larger arena
- Increasing enemy pressure

### Boss Gauntlet
- Fight each boss once
- Final boss = **Skull (ultimate challenge)**

---

## ⚙️ Difficulty System

| Mode   | Effect |
|--------|--------|
| Easy   | Full heal every wave |
| Normal | Full heal every 5 waves |
| Hard   | No healing |
| Test   | Full heal + debug tools |

---

## 🧪 Test Mode

- Abilities = **0 cooldown**
- Green Arrow = infinite charges
- Press **K** → jump to Skull warning phase

---

## 🧠 Core Systems

### Boons
- Gain 1 upgrade every round
- 3 choices presented
- Rarity system:
  - Common (60%) → +1 value
  - Rare (30%) → +2 value
  - Epic (10%) → +3 value

### Boss Rewards
- Every 5 waves → +1 damage
- Every 10 waves → 2 bosses
- Bosses spawn at start of wave

---

## 👾 Enemy Scaling

- Gradual HP + speed increase
- Catch-up scaling if player is weak
- Boss scaling:
  - +50% HP per upgrade
  - +5% speed per upgrade

---

## 💀 Skull Boss

### Behavior
- Final boss in Gauntlet
- 3 WARNING screens before spawn
- Spawns in center of arena
- Background inverts

### Attacks
- Ring attack every 10 seconds (must block)
- Uses mechanics from all bosses

---

## 🧩 Special Enemy Mechanics

### Hexagon Boss
- Has damage radius
- Must be inside radius to damage

### Trapezoid Boss
- Two units
- Shared HP pool
- Alternating attacks
- Long dashes across arena
- Knocks enemies into player

---

## 🧪 Debug Tools

### K Key (TEST MODE ONLY)
- Instantly triggers Skull warning phase

---

## 🚨 Critical System Notes

### Skull Spawn (CURRENT ISSUE)
Must ensure:
- Wave does NOT clear before spawn
- spawnQueue is not empty prematurely
- Skull is forced to spawn inside arena:

```js
e.x = center;
e.y = center;
e.state = 'active';