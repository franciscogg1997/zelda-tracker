# Zelda 100%

Personal walkthrough checklist for 100% runs. Static site, no backend; progress lives in the phone's browser storage.

Live: https://franciscogg1997.github.io/zelda-tracker/

## Use
- Open on the phone, Share → Add to Home Screen. Installed, it works offline and iOS keeps the storage.
- Tap a row to check it. "Continue" jumps to the step after the furthest one done. "Skipped" lists undone steps before that point.
- ··· on a row: note, or flag it as wrong (flags collect under menu → Flagged).
- Menu → Backup copies the progress JSON; Import merges a backup back in. There is no reset.

## Develop
- `python3 -m http.server 8765` → http://localhost:8765/
- `npm test` — unit tests for `logic.js`
- `npm run validate` — proves `data/oot.json` is complete (36/100/12/4/23)
- Deploy: `git push` (GitHub Pages, about a minute)

## Content
- Rules: `docs/content-style.md`
- Fixing a step: edit its text in `data/oot.json`, keep its id, run `npm run validate`, push. Progress is unaffected.
- Adding a step: give it the next unused id number (search the file for the highest `oot-` number), place it in play order, validate.
- Adding a game: create `data/<id>.json` with the same shape, add `{ "id", "title" }` to `data/index.json`. Nothing else.
- Bump `contentVersion` when you change content; it shows under menu → About.
- Route and facts follow Zelda Dungeon's 100% walkthrough order; all text is original.
