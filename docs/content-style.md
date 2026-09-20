# Writing rules for walkthrough steps

Audience: someone playing with the controller in one hand and the phone in the other. Every step is read once, mid-game, in two seconds.

## One step = one action
- Something you can check off after 10 seconds to 5 minutes of play. Not a room list, not a chapter.
- Imperative, second person, present tense: "Bomb the boulder", "Climb the vines".
- Say where and what. "Open the chest on the ledge for the Dungeon Map." Not "You will now want to get the map."
- Keep `text` under 280 characters (the validator enforces it). Put room layouts, enemy tips, the exact spot, and "if you fall, …" recovery in `detail`.
- No filler, no recaps, no "now that you have".
- Everything the reference marks "Optional" is mandatory here: this is a 100% run.

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

## Sources
- Use the reference pages to verify facts and order. Do not copy their sentences. Write from the facts.

## Fixed numbering

Songs (counter `song`): 1 Zelda's Lullaby · 2 Epona's Song · 3 Saria's Song · 4 Sun's Song · 5 Song of Time · 6 Song of Storms · 7 Minuet of Forest · 8 Bolero of Fire · 9 Serenade of Water · 10 Requiem of Spirit · 11 Nocturne of Shadow · 12 Prelude of Light.

Bottles (counter `bottle`): 1 Kakariko Cucco game (Anju) · 2 Ruto's Letter, Lake Hylia · 3 Lon Lon Milk from Talon's Super Cucco game · 4 Big Poe Shop, 1000 points.

Upgrades (counter `upgrade`): 1 Deku Stick 20 · 2 Deku Stick 30 · 3 Deku Nut 30 · 4 Deku Nut 40 · 5 Bomb Bag 30 · 6 Bomb Bag 40 · 7 Quiver 40 · 8 Quiver 50 · 9 Bullet Bag 40 · 10 Bullet Bag 50 · 11 Adult's Wallet · 12 Giant's Wallet · 13 Magic Meter · 14 Double Magic · 15 Double Defense · 16 Goron's Bracelet · 17 Silver Gauntlets · 18 Golden Gauntlets · 19 Silver Scale · 20 Golden Scale · 21 Din's Fire · 22 Farore's Wind · 23 Nayru's Love.
