# Pioneers: Climbing the Obelisk
## Complete Build Specification for Claude Code (Opus)

---

## 1. Project Overview

**Pioneers: Climbing the Obelisk** is a browser-based isometric 2.5D action roguelite. The player selects a class, equips 4 spells, and fights through 50 floors of escalating biomes inside a dark fantasy tower to defeat the King. Death ends the run, the player returns to the hub, and the world improves slightly for the next attempt.

This document covers the **demo build**: floors 1–10 (fully handcrafted with unique mechanics per floor), Fire and Ice classes only, with the Floor 10 boss (Wilhelm) fully implemented.

---

## 2. Tech Stack

- **Renderer:** HTML5 Canvas (2D context, isometric projection)
- **Language:** Vanilla JavaScript (no frameworks)
- **Art:** SVG-based sprites and environments, canvas particle effects for spells
- **Delivery:** Single self-contained `.html` file (artifact)
- **Target:** Desktop browser, ~900×600px canvas minimum

### Isometric Setup
- Tile size: 64×32px (classic 2:1 isometric ratio)
- Camera: fixed overhead isometric angle, does not rotate
- Coordinate system: screen X/Y derived from world grid coordinates using standard iso math:
  ```
  screenX = (worldX - worldY) * (tileWidth / 2)
  screenY = (worldX + worldY) * (tileHeight / 2)
  ```
- Draw order: back-to-front (painter's algorithm) sorted by `worldX + worldY`

---

## 3. Game Flow

```
[Title Screen] — "Pioneers: Climbing the Obelisk"
     ↓
[Class Select] → Fire or Ice
     ↓
[Spell Loadout] → Pick 4 of 10 class spells
     ↓
[Floor 1 — Village Outskirts] → Talk to NPC → receive quest
     ↓
[Floors 2–9] → Each floor has unique layout, mechanic, and objective
     ↓
[Floor 6 — Safe Haven] → Hub/shop mid-run (no death here)
     ↓
[Floor 10 — Boss: Wilhelm]
     ↓
[Run End] → Win or death → return to pre-run screen → world improves → repeat
```

> **Note:** There is no separate hub before the run in the demo. The pre-run screen (class select + spell loadout + basic shop) serves as the hub. The mid-run safe haven is Floor 6.

---

## 4. Controls

| Input | Action |
|---|---|
| `W A S D` | Move (isometric-mapped: W = up-left, S = down-right, A = down-left, D = up-right) |
| `Mouse` | Aim / camera reference |
| `Left Click` | Basic attack (projectile toward cursor) |
| `Shift` | Dash / dodge (short invincibility frames) |
| `Ctrl` | Sprint (increased move speed) |
| `Space` | Jump (limited — used for dodging over ground hazards and traps) |
| `Q / E / R / F` | Cast equipped spells (slots 1–4) |
| `G` | Interact / pick up items / talk to NPCs |
| `Tab` | Toggle inventory screen |
| `Escape` | Pause menu |

---

## 5. Classes

Only two classes are implemented in the demo. The architecture must support 7 total (see Section 17 for the full class list).

Each class has:
- A **basic auto-attack** (left click) — element-themed projectile
- **10 spells** — player picks 4 before the run
- A **visual identity** — color palette, particle effects, sprite tint

### 5.1 Fire Class 🔥

**Auto-attack:** Small fireball projectile, medium speed, minor burn DoT on hit.

**Color palette:** Deep reds, oranges, ember yellows. Dark char-black outlines.

| # | Spell | Type | Description |
|---|---|---|---|
| 1 | Fireball | Projectile | Fast single-target fireball |
| 2 | Flame Wave | Cone AoE | Short-range fire cone in front of player |
| 3 | Burning Dash | Mobility | Dash forward, leaving a fire trail that damages enemies |
| 4 | Inferno | AoE Burst | Large radius explosion centered on player |
| 5 | Ember Shot | Rapid Fire | 5 quick low-damage shots in succession |
| 6 | Heat Shield | Defense | Temporary damage reduction + reflect minor damage |
| 7 | Flame Pillar | Ground Burst | Targeted vertical fire column at cursor position |
| 8 | Explosion Trap | Utility | Place a delayed proximity trap (explodes on enemy contact) |
| 9 | Meteor Drop | Heavy Strike | Target a zone — meteor lands after 1.5s for heavy damage |
| 10 | Phoenix Surge | Heal + Damage | Heal 20% HP, release a burst of fire damaging nearby enemies |

### 5.2 Ice Class ❄️

**Auto-attack:** Ice shard projectile, slightly slower than fire, applies brief slow on hit.

**Color palette:** Pale blues, white, deep navy. Crystalline, sharp shapes.

| # | Spell | Type | Description |
|---|---|---|---|
| 1 | Ice Shard | Projectile | Fast piercing shard |
| 2 | Frost Nova | AoE Freeze | Freeze all nearby enemies briefly |
| 3 | Ice Wall | Utility | Spawn a wall of ice blocking enemy movement (destructible) |
| 4 | Blizzard | Area Damage | Sustained AoE snowstorm at cursor location for 3 seconds |
| 5 | Freeze Beam | Beam | Continuous beam that slows then freezes target |
| 6 | Slow Field | Zone | Create a persistent ground zone that slows enemies passing through |
| 7 | Ice Dash | Mobility | Slide rapidly forward, freezing enemies passed through |
| 8 | Spike Trap | Utility | Place ice spikes — deals damage when enemy walks over |
| 9 | Cryo Armor | Defense | Temporary armor buff, reflects freeze on taking damage |
| 10 | Deep Freeze | Crowd Control | Long-duration full freeze on single target |

---

## 6. Spell System

- Player picks **4 spells** from their class's 10 at the spell loadout screen before each run
- Spells are mapped to `Q / E / R / F`
- Each spell has:
  - **Damage value** (scales with floor)
  - **Cooldown** (in seconds)
  - **Mana cost**
  - **Effect type**: projectile / AoE / beam / buff / trap / mobility
- Spells do **not** level up mid-run in the demo
- Loadout cannot be changed once a run starts

### Spell UI (Bottom Right)
- Diamond arrangement of 4 slots (top=Q, left=E, right=R, bottom=F)
- Each slot shows: spell icon, cooldown radial overlay, mana cost indicator
- Grayed out if on cooldown or insufficient mana

### Between-Floor Boon System
- After completing each floor (except Floor 6 and Floor 10), player is offered **1 of 3 random boons**
- Boons are NOT just stat boosts — they modify spells and playstyle:
  - Example: "Fireball now pierces through enemies"
  - Example: "Frost Nova radius increased by 50%"
  - Example: "Dash leaves a damage trail for 2 seconds"
  - Example: "Every 5th basic attack is a critical hit"
- Boon system framework must be built even if only 6–8 boons exist in the demo

---

## 7. Combat System

- **Real-time** — no turn-based pausing
- Player has a **basic attack** (left click, no cooldown, free or very low mana cost)
- **Dash** (Shift) grants ~0.3s of invincibility frames — critical for survival
- Enemies deal contact damage and use ranged/melee abilities
- **Status effects:**
  - Burn (Fire DoT over time)
  - Freeze (full movement stop)
  - Slow (reduced move speed)
  - Stun (brief action interrupt)
- **Enemy aggro:** Enemies activate when player enters a radius (~300px). They pursue and attack.

### Combat Feel (Critical — Implement These)
- **Hit pause:** 2–4 frame freeze on impactful hits (especially heavy attacks and spell hits)
- **Screen shake:** Small shake on explosions, boss slams, and player taking heavy damage
- **Particle bursts:** Every hit spawns element-appropriate particles (fire sparks, ice shards, etc.)
- **Camera zoom:** Subtle zoom in during intense moments (boss phase transitions, final enemy of a wave)

### Player Stats (base values, gear modifies these)
| Stat | Base Value |
|---|---|
| Health | 100 |
| Mana | 80 |
| Mana regen | 5/sec |
| Move speed | 180 px/sec |
| Dash distance | 120px |
| Dash cooldown | 1.2s |

---

## 8. Enemy Types

All enemies are SVG-based sprites, tinted/varied per biome. Enemies scale in HP and damage every floor.

| Enemy | Role | Behavior | First Appears |
|---|---|---|---|
| Goblin | Fast, weak swarm | Rushes in groups, low HP, low damage | Floor 1 |
| Orc | Melee bruiser | Moderate speed, high HP, telegraphed heavy attack | Floor 1 |
| Hobgoblin | Mini-boss | Tougher orc variant, guards gates | Floor 3 (boss) |
| Troll | Tank | Slow, very high HP, path-blocking | Floor 3 |
| Skeleton | Undead melee | Fragile but relentless, re-assembles once if not destroyed fully | Floor 4 |
| Skeletal Bellhop | Undead ranged | Throws haunted luggage, keeps distance | Floor 7 |
| Corrupted Servant | Undead melee | Fast, erratic movement | Floor 7 |
| Slime | Blob | Splits into 2 small slimes on death, slow but persistent | Floor 8 |
| Demon | Elite | Fast, aggressive, high damage | Floor 9 |
| Elf | Ranged, agile | Keeps distance, fires arrows, dodges | Floor 3+ |

### Elite Enemies
- Elite variants of standard enemies appear from Floor 4 onward
- Elites have a glowing outline and one random **modifier**:
  - Shielded (absorbs one hit)
  - Enraged (increased speed + damage when below 50% HP)
  - Vampiric (heals on hit)
  - Armored (reduced damage taken from front)

### Scaling Formula
```
enemyHP = baseHP * (1 + floor * 0.15)
enemyDamage = baseDamage * (1 + floor * 0.10)
groupSize = baseGroup + floor(floor / 3)
```
Major power spike at floor 5: all stats +30% on top of normal scaling.

---

## 9. Floor-by-Floor Design (Demo: Floors 1–10)

Each floor is unique. Floors are **not procedurally generated** except where explicitly noted.

---

### 🟫 Floor 1 — Village Outskirts

**Type:** Handcrafted, large open map

**Environment:**
- Large open area with a small village at center (3–5 houses, dirt paths)
- NPC standing near a glowing spawn rune at player start
- Ground transitions: brown dirt near town → patches of grass → dense forest at outskirts
- Outskirts: trees, shadows, foliage — dense enough to partially hide objects

**Quest (random, 1 of 3 — player talks to NPC to receive it):**

| Quest | Description |
|---|---|
| Village Siege | Waves of enemies attack the village. NPCs fight alongside player. If NPCs die, rewards are reduced. |
| Hunt Quest | Kill X enemies scattered in the forest. Enemies drop "ears" as collectibles. Return to NPC to complete. |
| Search Quest | Find a hidden item in the forest. Item glows subtly or emits particles. No combat required but enemies patrol. |

**Completion:**
- After quest is done, player must find the **cave entrance**
- Cave spawns in the dense forest outskirts — partially hidden by trees
- Cave entrance is the **only procedurally placed element on this floor** (position randomized each run, always in outskirts region)
- Entering the cave transitions to Floor 2

**Enemies:** Goblins, Orcs (sparse — tutorial density)

**Atmosphere:** Daylight fading to dusk, warm amber light near village, shadowed forest edges

---

### 🪨 Floor 2 — Cave Maze

**Type:** Fully procedural maze

**Layout:**
- Tight corridors, dead ends, occasional open pocket rooms for combat
- Enemies lurk in corners and dead ends
- Exit is somewhere in the maze — player must explore to find it

**Atmosphere:**
- Ambient dripping water sound
- Torch lighting — warm pools of light in darkness
- Slight fog / darkness between torches
- Occasional skeleton remains as environmental detail (non-interactive)

**Enemies:** Goblins, Orcs

**Objective:** Find the exit. No quest UI — exploration is the objective.

**Notes for generation:** Use a recursive backtracker or similar algorithm. Ensure the exit is always reachable. Minimum maze size: 20×20 tiles. Place 3–5 open pocket rooms of ~4×4 tiles for combat encounters.

---

### ⛰️ Floor 3 — Mountain Descent

**Type:** Handcrafted, linear spiral path downward

**Environment:**
- Player exits cave onto a mountain cliff
- Path spirals downward — linear but with width variation
- Visual progression top to bottom:
  - Top: lush green, full trees
  - Mid: fading green, sparse trees
  - Bottom: dead trees, grey grass, dark soil

**Mechanic — Time Pressure:**
- 5-minute countdown timer visible in HUD
- If timer expires: enemy swarm spawns behind player and pursues relentlessly
- Timer creates urgency without hard failure — swarm is dangerous but survivable

**Enemies:**
- Fast attackers (Goblins) — charge ahead of player
- Slow tanks (Trolls) — block the path, must be defeated or dodged

**End:**
- Gate at the bottom guarded by a **Hobgoblin mini-boss**
- Hobgoblin: tougher Orc variant, high HP, telegraphed charge attack
- Defeating Hobgoblin opens gate → enter cemetery (Floor 4)

---

### 🪦 Floor 4 — Cemetery Survival

**Type:** Handcrafted arena

**Environment:**
- Cemetery grounds: tombstones as partial cover, dead trees, moonlit sky
- Enemies: Skeletons (first introduction)
- Skeletons re-assemble once after being defeated unless destroyed quickly (kill within 2s of down state to prevent re-assembly)

**Objective:** Survive for 1 minute

**Final event (at ~50 seconds):**
- A large hole erupts in the center of the cemetery
- Final surge of enemies pours out — highest density of the fight
- After 1 minute total: all enemies die, hole becomes the exit

**Completion:** Enter the hole → Floor 5

---

### 🏛️ Floor 5 — Tomb Trap Hallway

**Type:** Handcrafted, linear

**Layout:**
- Long straight hallway
- Large ornate door at the far end, slowly closing from the start
- Player must reach the door before it closes — creates constant forward pressure

**Traps (all 4 types present, order randomized each run):**

| Trap | Description |
|---|---|
| Floor Spikes | Spikes erupt from tiles periodically — avoid or jump |
| Fire Jets | Horizontal flame bursts from walls — time movement between pulses |
| Swinging Blades | Pendulum blades crossing the corridor — dash through at correct timing |
| Dart Walls | Darts fire from side walls — sprint between volleys |

**Design rules:**
- Trap types are always the same 4
- The **sequence and spacing** of traps randomizes each run
- No enemies in this hallway — pure movement challenge

**End:**
- Survive all traps and reach the door before it closes → ornate elevator
- Elevator ascends → Floor 6

---

### 🏨 Floor 6 — Safe Haven (Mid-Run Hub)

**Type:** Non-combat safe zone

**Environment:**
- Opulent tavern / hotel interior
- Warm lighting, gold accents, rich furnishings
- Peaceful ambient music

**Systems available:**
- **Buy gear** from merchant (gear quality reflects run progress)
- **Buy buffs** from merchant — buffs persist for multiple floors (e.g. +20% speed for 3 floors)
- **Heal** from healer NPC (full or partial heal options, costs gold)
- **Pause / safely end run** — player can quit here without death penalty

**NPCs:**
- Merchant — sells gear and consumables
- Healer — HP restoration for gold
- Mysterious Vendor — sells rare/exotic items with unusual effects (1–2 items, high cost)

**No enemies, no timer. Player leaves when ready.**

---

### 🏨 Floor 7 — Haunted Hotel

**Type:** Procedural multi-floor building

**Environment:**
- Same aesthetic as Floor 6 but corrupted: torn wallpaper, flickering lights, dark stains, broken furniture
- Oppressive atmosphere — the safe haven turned sinister

**Structure:**
- 4 procedural floors stacked vertically
- Each floor has up to 5 rooms
- Room types (randomized per floor per run):

| Room Type | Contents |
|---|---|
| Enemy Room | Combat encounter — must clear to proceed |
| Empty Room | No enemies, may have environmental detail |
| Loot Room (rare) | Gear or relic drop, no enemies |

**Enemies:**
- Skeletal Bellhops — throw haunted luggage, keep distance
- Corrupted Servants — fast, erratic melee

**Final floor:**
- A door leading to the next biome
- Door visual: chaotic, pulsating energy, wild and unnatural — signals the tone shift ahead

---

### 🌲 Floor 8 — Corrupted Forest (Slime Zone)

**Type:** Handcrafted arena with open forest layout

**Environment:**
- Blue-tinted forest — unnatural coloring, everything feels wrong
- Bioluminescent plants, twisted trees
- Unnatural lighting: cool blue glow from ground

**Objective:**
1. Kill slimes until a **key drops** from one of them (random drop, guaranteed eventually)
2. After key drops: finish remaining enemies
3. Key opens path to next area

**End:** Path opens into a **giant arena** → Floor 9

**Enemies:** Slimes only (split into 2 small slimes on death)

---

### 🩸 Floor 9 — Void Survival

**Type:** Abstract arena — no environment

**Environment:**
- Forest fades to complete black void
- No background, no floor texture, no walls
- Only the player and enemies exist visually
- Eerie minimal atmosphere — silence broken only by combat sounds

**Mechanic — Circular Meter:**
- A circular progress meter fills as player kills enemies
- Taking damage **reduces** the meter
- Meter draining to 0 does NOT end the run — but enemies become more numerous if meter stays low
- Filling the meter to 100% triggers completion

**Enemies:** Demons — fast, aggressive, high damage output

**Completion:**
- Meter fills to 100% → all remaining enemies instantly die
- Player is **fully healed** before entering Floor 10
- Brief dramatic pause before boss floor transition

---

### ⚔️ Floor 10 — Boss: Wilhelm

**Type:** Boss arena

**Arena:**
- Grey stone floor, circular shape
- Red aura pulsing from the center
- No obstacles at start — arena space is destroyed by boss mechanics

**Boss: Wilhelm**
- Large armored warrior, dragon-themed spear
- High HP, 5 phase transitions (every 20% HP lost)

**Boss Stats:**
| Stat | Value |
|---|---|
| HP | 800 |
| Move speed | 110 px/sec (increases per phase) |
| Phase count | 5 (at 80%, 60%, 40%, 20%, 0% HP) |

**Attacks:**

| Attack | Description |
|---|---|
| Spear Dash | Wilhelm charges forward in a straight line with spear extended — telegraphed with red indicator |
| Circular Sweep | Spins spear in a wide arc — deals damage to all nearby players |
| Zigzag Thrown Spear | Throws spear in a zigzag trajectory — spear returns to Wilhelm after impact |

**Phase Mechanic (every 20% HP lost):**
- A **spear falls from the sky** onto a random arena location
- Creates a persistent damage zone (same mechanic as original Spear General spec)
- Damage zones do NOT disappear — arena progressively shrinks
- Wilhelm also gains slight speed increase each phase

**By final phase (below 20% HP):**
- 4 damage zones already placed
- Wilhelm is faster and attacks more frequently
- Arena is significantly reduced — player must dodge in tight space

**Reward on defeat:**
- Guaranteed **legendary gear drop**
- Run complete — victory screen

---

## 10. Quest / Objective System

Objectives are floor-specific in this design (not random across all floors). Floor 1 has 3 possible random quests. All other floors have fixed mechanics. See Section 9 for per-floor detail.

**HUD objective tracker:** Always shows current floor objective and progress (e.g. "Survive: 0:42 / 1:00", "Enemies killed: 6 / 10").

---

## 11. Gear System

### Stats Provided by Gear
- Health (max HP increase)
- Mana (max mana increase)
- Damage (% bonus to all damage)
- Defense (% damage reduction)
- Speed (% move speed bonus)

### Gear Slots
- Weapon
- Armor
- Boots
- Accessory (ring or amulet)

### Acquisition
- Floor clears drop random gear (1 item per floor, higher floors = better rarity)
- Floor 6 shop sells gear for gold
- Wilhelm (Floor 10) always drops one guaranteed legendary item

### Roguelite Rule — No Gear Carries Between Runs
- Gear does not persist between runs
- The pre-run shop improves quality after each completed run (civilization grows)
- This creates progression without power creep

### Gear Rarity Tiers
| Tier | Color | Drop Rate |
|---|---|---|
| Common | Gray | 60% |
| Uncommon | Green | 25% |
| Rare | Blue | 12% |
| Legendary | Gold | 3% |

---

## 12. Relic System

- Relics are passive items found during runs (separate from gear slots)
- Player holds up to 4 relics per run
- Relics have unique build-defining effects, not just stat boosts
  - Example: "Spell crits reduce all cooldowns by 0.5s"
  - Example: "Killing a frozen enemy restores 5 mana"
- Framework must be built in demo; 3–5 placeholder relics are sufficient
- Relic slots shown in inventory screen (bottom panel)

---

## 13. Build / Boon System

- After each floor clear (except Floor 6 and Floor 10), player chooses 1 of 3 random boons
- Boons modify spells, playstyle, or mechanics — not just flat stats
- Examples:
  - "Fireball now splits into 3 smaller fireballs on impact"
  - "Ice Wall now damages enemies when it shatters"
  - "Your dash now has 2 charges"
  - "Basic attacks apply Burn for 1 second"
- Boon choice screen: simple full-screen overlay with 3 cards, pick 1, dismiss

---

## 14. UI Layout

### In-Game HUD

**Bottom Right:**
- Health bar (red)
- Mana bar (blue)
- Diamond spell UI — 4 slots (top=Q, left=E, right=R, bottom=F)
- Each slot: spell icon, cooldown radial overlay, mana cost indicator
- Grayed out on cooldown or insufficient mana

**Top Left:**
- Floor number and floor name
- Current objective + progress

**Top Right:**
- Timer (Floor 3 only)
- Circular meter (Floor 9 only)
- Mini-map optional for demo

### Inventory Screen (Tab)
- **Left panel:** Equipped gear (4 slots: weapon, armor, boots, accessory)
- **Right panel:** Collected items this run (scrollable grid)
- **Bottom:** Relic slots (up to 4)
- **Active boons:** List of current boons in effect
- Close with Tab or Escape

---

## 15. Art Style

**Game title treatment:** "Pioneers: Climbing the Obelisk" — serif or carved-stone title font on title screen

**Theme:** Dark fantasy — ancient, mysterious, atmospheric, slightly surreal. Each biome has its own distinct visual identity while sharing the dark palette.

**Reference:** Clair Obscur: Expedition 33 (tone, color treatment, sense of dread and beauty combined)

### Per-Biome Palette

| Floor | Biome | Palette |
|---|---|---|
| 1 | Village Outskirts | Warm amber, brown dirt, green forest, dusk sky |
| 2 | Cave Maze | Near-black, warm torch orange, grey stone |
| 3 | Mountain Descent | Bright green → fading grey → dead brown (top to bottom) |
| 4 | Cemetery | Cold moonlight blue, grey stone, dead tree silhouettes |
| 5 | Tomb Hallway | Ancient gold, dark stone, red trap glow |
| 6 | Safe Haven | Warm gold, cream walls, candlelight orange |
| 7 | Haunted Hotel | Corrupted version of Floor 6 — desaturated, flickering, dark stains |
| 8 | Corrupted Forest | Bioluminescent blue-green, twisted blue tint on all surfaces |
| 9 | Void | Pure black — no environment color |
| 10 | Boss Arena | Grey stone, pulsing red aura |

### General Art Rules
- Player and enemies: SVG shapes composed into character forms (not pixel art)
- Environments: isometric tile SVGs — appropriate per biome
- Spell effects: canvas particle systems (fire particles, ice crystals, void sparks, etc.)
- No external image assets — all art generated via SVG/Canvas
- Lighting changes per biome: use canvas overlay layers with appropriate opacity/color blend

---

## 16. Death & Progression

- Death (HP = 0) immediately ends the run
- Brief death animation and fade
- Return to pre-run screen
- Pre-run shop quality improves slightly each run (better gear tier unlocked)
- Player starts from Floor 1, picks class and spells again

**Meta-progression in demo:** Shop tier improves by one step per run (Common → Uncommon available, etc.). No permanent stat upgrades. Full meta-currency unlock system is post-demo.

---

## 17. Full Class List (Future Builds)

Architecture must support all 7. Only Fire and Ice are playable in the demo.

| Class | Element | Playstyle |
|---|---|---|
| Fire 🔥 | Fire | Burst damage, DoT, mobility via fire trails |
| Ice ❄️ | Ice | Crowd control, slows, defensive buffs |
| Lightning ⚡ | Lightning | Chain damage, speed buffs, stuns |
| Ground 🌱 | Ground | Tanks, terrain manipulation, shields |
| Air 🌬️ | Air | Extreme mobility, knockback, AoE pulls |
| Water 🌊 | Water | Healing, pushes, attack buffs, cleanse |
| Physical 🗡️ | Physical | Melee-focused, raw damage, self-buffs |

---

## 18. Full Spell Lists (All 7 Classes)

### Fire 🔥
1. Fireball — fast projectile
2. Flame Wave — short cone AoE
3. Burning Dash — dash leaving fire trail
4. Inferno — large AoE burst
5. Ember Shot — rapid low-damage shots
6. Heat Shield — temporary damage reduction
7. Flame Pillar — vertical burst from ground
8. Explosion Trap — delayed AoE
9. Meteor Drop — targeted heavy strike
10. Phoenix Surge — heal + damage burst

### Ice ❄️
1. Ice Shard — fast piercing projectile
2. Frost Nova — AoE freeze
3. Ice Wall — block path (destructible)
4. Blizzard — sustained area damage
5. Freeze Beam — slows then freezes
6. Slow Field — persistent slow zone
7. Ice Dash — slide forward, freeze enemies passed through
8. Spike Trap — damage on enemy contact
9. Cryo Armor — defense buff, reflect freeze
10. Deep Freeze — long-duration single target stun

### Lightning ⚡
1. Chain Lightning — bounces between nearby enemies
2. Lightning Strike — targeted burst at cursor
3. Overcharge — buff: increased attack speed
4. Static Field — persistent AoE damage zone
5. Dash Blink — teleport dash to cursor
6. Thunder Crash — slam dealing AoE damage
7. Shock Trap — placed trap, stuns on trigger
8. Energy Beam — sustained beam
9. Storm Call — multi-strike lightning barrage
10. Paralysis Pulse — AoE stun

### Ground 🌱
1. Rock Throw
2. Earth Spike
3. Quake Slam — AoE
4. Stone Shield
5. Wall Raise
6. Sandstorm — AoE
7. Burrow Dash
8. Gravity Pull
9. Boulder Roll
10. Fortress Form — major defense buff

### Air 🌬️
1. Wind Slash
2. Dash Burst — fast movement
3. Tornado — AoE pull
4. Air Blade Barrage
5. Lift — knock enemies into air
6. Cyclone Shield
7. Vacuum Pull
8. Sonic Boom
9. Glide Boost
10. Tempest Mode — major mobility buff

### Water 🌊
1. Water Shot
2. Wave Push
3. Healing Mist
4. Bubble Shield
5. Tidal Crash
6. Flow Dash
7. Whirlpool — pull enemies
8. Rain Storm — AoE
9. Cleanse — remove debuffs
10. Surge — attack boost

### Physical 🗡️
1. Heavy Strike
2. Combo Slash
3. Dash Strike
4. Spin Attack
5. Guard Block
6. Rage Boost
7. Leap Slam
8. Execute
9. Weapon Throw
10. Adrenaline Rush

---

## 19. Full Boss List (Future Builds, Floors 10–50)

| Floor | Boss | Key Mechanics |
|---|---|---|
| 10 | Wilhelm | Spear dash, circular sweep, zigzag throw, persistent damage zones every 20% HP |
| 20 | Hammer General | Shield at every 25% HP — must break shield to continue damage |
| 30 | Bow General | Summons enemies at every 20% HP (max 4 times) |
| 40 | Sword General | Gains speed + damage as HP decreases |
| 50 | The King | All mechanics combined — summons generals, throws spears, gains shields, increases speed at low HP |

All boss arenas are **circular** with no obstacles at the start.

---

## 20. Design Rules (Non-Negotiable)

- **No procedural map generation** — except Floor 2 (cave maze) and Floor 7 (hotel room layout), which are explicitly procedural
- **Randomized objectives on Floor 1** — 1 of 3 quest types per run
- **Keep systems simple and responsive** — gameplay feel > feature count
- **Prioritize smooth combat** — dash, attack, and spell cast must feel instant
- **Combat feel is mandatory** — hit pause, screen shake, and particle bursts are required, not optional
- **Avoid over-complication** — if a system adds friction without fun, cut it
- **No external assets** — all art is SVG/Canvas generated in-code
- **Architecture for 50 floors** — build the demo to Floor 10 but code must be structured to extend without rewriting

---

## 21. Demo Scope Summary

| Feature | Demo Status |
|---|---|
| Fire class | ✅ Full implementation |
| Ice class | ✅ Full implementation |
| Floor 1 — Village Outskirts | ✅ Full (3 quest types, procedural cave position) |
| Floor 2 — Cave Maze | ✅ Full (procedural maze generation) |
| Floor 3 — Mountain Descent | ✅ Full (timer, path, Hobgoblin mini-boss) |
| Floor 4 — Cemetery Survival | ✅ Full (1-min survival, skeleton re-assembly, final surge) |
| Floor 5 — Tomb Trap Hallway | ✅ Full (4 trap types, randomized order, closing door) |
| Floor 6 — Safe Haven | ✅ Full (shop, healer, mysterious vendor) |
| Floor 7 — Haunted Hotel | ✅ Full (4-floor procedural hotel) |
| Floor 8 — Corrupted Forest | ✅ Full (slime key drop mechanic) |
| Floor 9 — Void Survival | ✅ Full (circular meter, full heal on complete) |
| Floor 10 — Boss: Wilhelm | ✅ Full (3 attacks, 5 phases, damage zones) |
| Spell loadout screen | ✅ |
| Between-floor boon system | ✅ Framework + 6–8 boons minimum |
| Gear drops + stats | ✅ |
| Relic system | ⚠️ Framework only (3–5 placeholder relics) |
| Combat feel (hit pause, shake, particles) | ✅ Required |
| Elite enemies with modifiers | ✅ |
| Classes 3–7 | ❌ Post-demo |
| Floors 11–50 | ❌ Post-demo |
| Bosses 2–5 | ❌ Post-demo |
| Tavern / item stash system | ❌ Post-demo |
| Meta-currency / class unlocks | ❌ Post-demo |
| Hub town evolution visuals | ❌ Post-demo |

---

*End of specification. Build the demo first — all 10 floors fully playable. Architect the codebase to support the full 50-floor spec without requiring a rewrite.*
