# Zelda 100%

Personal walkthrough checklist for 100% runs. Static site, no backend; progress lives in the phone's browser storage.

Live: https://franciscogg1997.github.io/zelda-tracker/

## Use
- Open on the phone, Share → Add to Home Screen. Installed, it works offline and iOS keeps the storage.
- The app opens on the step you are up to. Tap a row to check it off.
- "Continue" jumps back to that step from anywhere. Once you reach the end it jumps to the first thing you skipped.
- "Skipped" lists everything left undone behind you. The run is only Complete when that list is empty.
- The strip under the title is the filter. Tap "Skulltulas" to see only skulltula hunts, "Story" for the main route, "Extras" for one-off pickups. Tap again to clear. A filter brings the whole detour with it, not just the step that hands over the item, and it never changes what you have collected.
- A step's reward tints its row and labels it: pink for a Piece of Heart, gold for a Gold Skulltula, violet for a song, teal for a bottle, blue for an upgrade. The tint drops once you check it off.
- ··· on a row: leave a note (such as which suspend slot you saved in), or flag the step as wrong. Flags collect under menu → Flagged.
- Menu → Backup copies the progress JSON; Import merges a backup back in. There is no reset.

## Develop
- `python3 -m http.server 8765` → http://localhost:8765/
- `npm test` — unit tests for `logic.js`
- `npm run validate` — proves `data/oot.json` is complete (36/100/12/4/23)
- Deploy: `git push` (GitHub Pages, about a minute)
- When app code changes, bump `APP_VERSION` in `app.js` and the `?v=` on the stylesheet and module in `index.html` so phones cannot run new markup against cached old code. The app saves a copy of your progress under `zt:progress:<game>:v<old>:<time>` the first time it runs a new version.

## Content
- `data/oot.json` is the single source of truth. It was assembled once from per-chapter drafts (`data/parts/`, in git history up to the content commit) with `tools/merge.mjs`; edit the merged file directly from now on.
- Rules: `docs/content-style.md`
- Step ids are frozen. Progress is stored against them, so a renumber would silently move your checkmarks to other steps. Edit text freely; never reuse or reassign an id.
- Fixing a step: edit its text in `data/oot.json`, keep its id, run `npm run validate`, push. Progress is unaffected.
- Adding a step: give it the next unused id number (search the file for the highest `oot-` number), place it in play order, validate.
- Each step carries `kind`: `main` (needed to finish the game) or `side` (optional for a 100% run).
- Filters are derived, not stored: a run of consecutive `side` steps belongs to whatever collectible closes it. A run that yields nothing counted is a side quest when it is five steps or longer, and an extra when it is shorter.
- Adding a game: create `data/<id>.json` with the same shape, add `{ "id", "title" }` to `data/index.json`. Nothing else.
- Bump `contentVersion` when you change content; it shows under menu → About.
- Route and facts follow Zelda Dungeon's 100% walkthrough order; all text is original.
