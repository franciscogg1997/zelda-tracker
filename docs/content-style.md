# Writing rules for walkthrough steps

Audience: someone playing with the controller in one hand and the phone in the other. Every step is read once, mid-game, in two seconds.

## One step = one action

This is a turn-by-turn walkthrough, not a summary. The player follows it with the
controller in hand and never has to guess where to walk. **A step is one thing you
do in about 5 to 60 seconds of play.**

- Imperative, second person, present tense: "Bomb the boulder", "Climb the vines".
- Say where and what. "Open the chest on the ledge for the Dungeon Map." Not "You will now want to get the map."
- Keep `text` under 280 characters (the validator enforces it). Put room layouts, enemy tips, the exact spot, and "if you fall, …" recovery in `detail`.
- No filler, no recaps, no "now that you have".
- Everything the reference marks "Optional" is still written as a step: this is a 100% run. Mark it `"kind": "side"` (below).

### Navigation is the point

In a dungeon, every step names where you are going and how you get there. Doors,
floors, directions, landmarks. Split anything that bundles several actions.

Too coarse, never write this:
- "Navigate the east wing and get the Compass."
- "Solve the block puzzle and continue."
- "Work your way to the boss door."

Right size, write this:
- "Go through the locked door on the east side of the main room."
- "Push the block twice to the north so it lines up under the ledge."
- "Climb onto the block and jump to the ledge with the torch."
- "Light a Deku Stick on the torch and light the two unlit torches by the door."
- "Go up the stairs that opened and take the west door on the second floor."

Rules of thumb:
- A room transition is its own step, and it names the exit: "take the north door", "drop through the hole in the floor", "climb the ladder to 3F".
- A puzzle is one step per action: each block push, each switch, each torch, each Hookshot target.
- A chest is its own step and says what is in it.
- A fight that can kill you is its own step, with how to win in `detail`.
- Say which floor you are on (1F, 2F, B1) whenever the dungeon has floors.
- After a key, say which door it opens. After a switch, say what it changed and where.

### How long a chapter should be

Roughly double what a summary walkthrough would use. A dungeon chapter is usually
60 to 140 steps, a big overworld chapter 80 to 130. If a dungeon comes out under
50 steps, it is too coarse: split the navigation further.

## Main route or optional

Every step carries `"kind"`. Omit it (or write `"main"`) for the main route, and
write `"kind": "side"` for anything optional.

- `main`: you cannot finish the game without it. Story, dungeon progression, required items (Kokiri Sword, Slingshot, Bombs, Bow, Hookshot, Ocarina items, Goron's Bracelet, Silver Gauntlets, Golden Gauntlets, tunics and boots needed to survive, keys, bosses, medallions, required songs).
- `side`: the game can be finished without it, even though a 100% run wants it. Heart Pieces, Gold Skulltulas, capacity upgrades, extra bottles, mini-games, Great Fairy spells, masks, the trading sequences, Biggoron's Sword, the Scarecrow's Song, magic beans.
- The test is simple: could the player reach Ganon without this step? If yes, it is `side`.
- A step that is only there to reach a side collectible (walking to the grotto, buying the bugs) is `side` too. Keep side detours grouped so hiding them leaves a clean main route.
- Songs: warp songs and story songs are `main`. Song of Storms, Sun's Song, Epona's Song and the Scarecrow's Song are `side` unless the reference uses them to progress.

## Names
- Items, places, characters and songs exactly as the English game writes them: Fairy Slingshot, Zora's Domain, Kaepora Gaebora, Zelda's Lullaby, Gold Skulltula, Piece of Heart, Heart Container.
- Directions relative to how Link enters the room unless a landmark is clearer.

## Collectibles
- One collectible per step. Two skulltulas in one room are two steps.
- Set `collect: { counter, n }` with the number from the numbering reference. Never invent a number.
- The `text` names the collectible: "…and grab the Gold Skulltula token." / "…for a Piece of Heart."
- Counters: heart (36), skulltula (100), song (12), bottle (4), upgrade (23). Heart pieces and skulltulas use the reference's `#N`. Songs, bottles and upgrades use the fixed numbering below.
- Boss Heart Containers, main items (Slingshot, Bombs, Hookshot…), tunics, boots, shields, swords, masks, arrows, magic beans, Gerudo Membership Card, Stone of Agony are ordinary steps with no `collect`.

## Missables
- `missable` goes on the step that must be done in time, written as a warning: "Get this before trading for the Poacher's Saw as an adult; after that it is gone forever."
- The step that would lock it out also warns in its `detail`.
- Known N64 missables: the Deku Nut capacity upgrade (Lost Woods Business Scrub) is lost once adult Link gets the Poacher's Saw; the Dungeon Map in Jabu-Jabu's Belly is unreachable after Ruto is carried past its room; Dampé's race Piece of Heart is lost if dug up and abandoned.

## Bosses
- One step for the fight (strategy in `detail`), one step for the Heart Container and leaving.

## Sections
- One section per area visit or dungeon. Title is the place. Subtitle is "Child" or "Adult", plus "Dungeon" or "Cleanup" where useful.
- Ids: kebab-case, unique across the whole file, e.g. `kakariko-child-1`, `forest-temple`.

## Field reference

```json
{
  "id": "oot-0412",
  "text": "Take the north door out of the lobby and follow the corridor to the flooded room.",
  "detail": "Longer help: layout, enemies, what to do if you fall.",
  "kind": "side",
  "collect": { "counter": "skulltula", "n": 34 },
  "missable": "Do this before X or it is gone forever."
}
```

Only those six fields. `text` is required; the rest are optional.

## Sources
- Use the reference pages to verify facts and order. Do not copy their sentences. Write from the facts.

## Fixed numbering

Songs (counter `song`): 1 Zelda's Lullaby · 2 Epona's Song · 3 Saria's Song · 4 Sun's Song · 5 Song of Time · 6 Song of Storms · 7 Minuet of Forest · 8 Bolero of Fire · 9 Serenade of Water · 10 Requiem of Spirit · 11 Nocturne of Shadow · 12 Prelude of Light.

Bottles (counter `bottle`): 1 Kakariko Cucco game (Anju) · 2 Ruto's Letter, Lake Hylia · 3 Lon Lon Milk from Talon's Super Cucco game · 4 Big Poe Shop, 1000 points.

Upgrades (counter `upgrade`): 1 Deku Stick 20 · 2 Deku Stick 30 · 3 Deku Nut 30 · 4 Deku Nut 40 · 5 Bomb Bag 30 · 6 Bomb Bag 40 · 7 Quiver 40 · 8 Quiver 50 · 9 Bullet Bag, first upgrade (Market Shooting Gallery) · 10 Bullet Bag, second upgrade (Lost Woods target) · 11 Adult's Wallet · 12 Giant's Wallet · 13 Magic Meter · 14 Double Magic · 15 Double Defense · 16 Goron's Bracelet · 17 Silver Gauntlets · 18 Golden Gauntlets · 19 Silver Scale · 20 Golden Scale · 21 Din's Fire · 22 Farore's Wind · 23 Nayru's Love.
