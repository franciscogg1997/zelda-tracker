# Zelda 100% Tracker — Design Spec

Date: 2026-09-19
Status: approved in conversation, pending written review

## 1. Purpose

A personal, phone-only web app that turns a 100% walkthrough of
The Legend of Zelda: Ocarina of Time (N64 via Nintendo Switch Online)
into a checklist that remembers progress. Opened mid-game with one hand.
Within five seconds of opening it, the player knows the next thing to do
and how far along they are.

Success: every counter reads complete at the end of the game and no
missable was missed.

Non-goals: accounts, backend, sync between devices, themes, statistics,
timers, maps, images, anything that is not "what do I do next".

## 2. Decisions already made

| Topic | Decision |
|---|---|
| Hosting | GitHub Pages, public repo `franciscogg1997/zelda-tracker`, served from `main` at `/`. URL `https://franciscogg1997.github.io/zelda-tracker/`. |
| Phone | iPhone, Safari, installed to the home screen. |
| Language | English UI and English step text. Item and place names as they appear in the game. |
| Detail | Full guided: every step says where to go and what to do, including dungeon navigation. Target 700–900 steps. |
| Route | Zelda Dungeon's 100% walkthrough order (story order, collectibles integrated at the first sensible moment, explicit cleanup passes). Zelda Central's 100% checklist is the cross-check for totals. |
| Text | All step text is original writing. Guides are used to verify facts, order and totals only. No guide text is copied. |
| Stack | Plain HTML, CSS and JavaScript ES modules. No build step, no framework, no dependencies. Service worker for offline. |
| Design rule | No colored left borders or side stripes on cards or rows (house rule). Warnings use an icon and a background tint. |

## 3. Repository layout

```
zelda-tracker/
  index.html              app shell
  style.css
  app.js                  DOM rendering and event handling (imports logic.js)
  logic.js                pure functions: counters, current step, skipped, progress parse/merge
  sw.js                   service worker
  manifest.webmanifest
  icons/                  icon-192.png, icon-512.png, apple-touch-icon.png
  data/index.json         [{ "id": "oot", "title": "Ocarina of Time" }] — list of games
  data/oot.json           the Ocarina of Time walkthrough
  tools/validate.mjs      data-file validator (node)
  tests/logic.test.mjs    unit tests for logic.js (node --test)
  README.md               how to run, validate, deploy, add a game
  docs/superpowers/       specs and plans
```

All URLs inside the app are relative (`./data/oot.json`) because the
site is served from a sub-path.

## 4. Content file (one per game)

`data/<gameId>.json`:

```json
{
  "id": "oot",
  "title": "Ocarina of Time",
  "platform": "N64 · Nintendo Switch Online",
  "contentVersion": 1,
  "counters": [
    { "id": "heart",     "label": "Heart pieces", "unit": "Heart piece", "total": 36 },
    { "id": "skulltula", "label": "Skulltulas",   "total": 100 },
    { "id": "song",      "label": "Songs",        "total": 12 },
    { "id": "bottle",    "label": "Bottles",      "total": 4 },
    { "id": "upgrade",   "label": "Upgrades",     "total": 23 }
  ],
  "sections": [
    {
      "id": "kokiri-forest",
      "title": "Kokiri Forest",
      "subtitle": "Child",
      "steps": [
        {
          "id": "oot-0001",
          "text": "Leave your house and talk to Saria, then find the Kokiri Sword in the training area (crawl through the hole, follow the path, avoid the boulder).",
          "detail": "The chest is at the end of the maze in the top-left of the forest.",
          "collect": { "counter": "heart", "n": 1 },
          "missable": "Do this before X or it is lost."
        }
      ]
    }
  ]
}
```

Field rules:

- `id` on steps: `<gameId>-<4 digits>`. Assigned once, never reused,
  never renumbered. A step inserted later takes the next unused number,
  regardless of its position in the list. Order in the file is the
  play order.
- `text`: required, 1–2 sentences, at most 280 characters. What to do
  and where. Must be actionable alone.
- `detail`: optional, longer help shown only when the player asks.
- `collect`: optional, `{ "counter": counterId, "n": integer }`. A
  step collects at most one thing. `n` is that collectible's number
  within its counter (Heart piece 5, Skulltula 12). Two skulltulas in
  one room are two steps. Numbering follows the route order, which
  makes duplicates and gaps detectable.
- `missable`: optional warning string. Rendered prominently.
- Section `subtitle` is free text, usually "Child" or "Adult" plus a
  hint such as "Cleanup".

Counter definitions for Ocarina of Time (what the validator enforces
as exact sums):

- heart: 36 Pieces of Heart. Boss Heart Containers are ordinary story
  steps, not counted.
- skulltula: 100 Gold Skulltula tokens.
- song: 12 ocarina songs (Zelda's Lullaby, Epona's Song, Saria's Song,
  Sun's Song, Song of Time, Song of Storms, Minuet of Forest, Bolero of
  Fire, Serenade of Water, Requiem of Spirit, Nocturne of Shadow,
  Prelude of Light). The Scarecrow's Song is a step, not counted.
- bottle: 4 bottles.
- upgrade: 23 = Deku Stick capacity ×2, Deku Nut capacity ×2, Bomb Bag
  ×2, Quiver ×2, Bullet Bag ×2, Wallet ×2, Magic Meter + Double Magic,
  Double Defense, Goron's Bracelet + Silver Gauntlets + Golden
  Gauntlets, Silver Scale + Golden Scale, Din's Fire + Farore's Wind +
  Nayru's Love.

Everything else required for 100% (main items, tunics, boots, shields,
Biggoron's Sword, masks, Gerudo Membership Card, Stone of Agony, magic
beans, arrows, Ice Arrows, and so on) exists as ordinary steps in the
route. The route being complete is what makes the run 100%, not the
counters.

Known N64 missables that must appear as `missable` warnings:

1. The Deku Nut capacity upgrade from the Business Scrub in the Lost
   Woods is lost forever once adult Link obtains the Poacher's Saw.
2. The Dungeon Map in Jabu-Jabu's Belly cannot be reached after
   Ruto is carried past its room.
3. Dampé's race Piece of Heart: if the player digs it up and leaves the
   race without collecting it, it is gone.

The content writing phase verifies these against the sources and adds
any other missable found.

### Adding a game

Add `data/<id>.json` and append `{ "id", "title" }` to
`data/index.json`. Nothing else changes. The app reads counters and sections from the file.

## 5. Progress storage

Progress is stored in `localStorage`, separately from content, keyed by
step id only. Content edits, new steps, deleted steps and new app
versions never touch it. Entries for step ids that no longer exist are
kept and ignored.

Key `zt:progress:<gameId>`:

```json
{
  "schemaVersion": 1,
  "gameId": "oot",
  "done":  { "oot-0001": 1726700000000 },
  "flags": { "oot-0042": "Chest is on the left, not the right" },
  "notes": { "oot-0040": "Suspend slot 2 saved here, before Gohma" },
  "updatedAt": 1726700000000
}
```

- `done`: step id → timestamp checked.
- `flags`: step id → short note explaining what was wrong. Presence
  means flagged.
- `notes`: step id → free text.

Rules:

- Every change is written synchronously and immediately.
- On startup the app calls `navigator.storage.persist()`.
- If the stored value fails to parse or has an unknown `schemaVersion`,
  the raw string is copied to `zt:progress:<gameId>:corrupt:<timestamp>`
  before the app does anything else, and the UI shows a persistent
  notice. Nothing is deleted.
- If a write throws (quota, private mode), the UI shows a persistent
  "Progress is not being saved" banner.
- There is no reset button.

Key `zt:ui:<gameId>` holds only conveniences: manually toggled
sections, install hint dismissed. Losing it is harmless.

Key `zt:lastGame` holds the last selected game id.

### Backup and import

Backup: one tap produces the progress JSON as text and offers the share
sheet (`navigator.share`) when available, otherwise copies to the
clipboard and shows it in a text box.

Import: paste JSON into a text box. It must parse, have
`schemaVersion` 1 and the same `gameId`. It is merged, never replaced:
`done` is the union (existing timestamps win), `flags` and `notes`
incoming values override existing ones for the same key. Before
merging, the current progress is copied to
`zt:progress:<gameId>:backup:<timestamp>`.

## 6. Derived state (logic.js, pure)

Let `steps` be all steps of the game flattened in file order.

- `furthest` = highest index whose step is done, or -1.
- `currentIndex` = `furthest + 1`. If it equals `steps.length`, the
  game is complete.
- `skipped` = every index `< furthest` whose step is not done, in
  order.
- Counters: for each counter, `done` = number of done steps whose
  `collect.counter` is that counter; `total` from the file.
- Verified = done and not flagged. This is derived, not stored.

Skipping something never moves the current step backwards. Checking a
step far ahead by mistake moves current forward; unchecking it moves it
back.

## 7. Screen

One page, mobile only, portrait, light and dark via
`prefers-color-scheme`.

Sticky header:
- Game title (and a plain `<select>` to switch games when
  `data/index.json` lists more than one).
- Counter strip: one cell per counter, `Label done/total`. Wraps to two
  rows if needed. Turns "complete" styling when done equals total.

List:
- Sections in order. A section header shows title, subtitle and
  `done/total` steps. Tapping it collapses or expands. Sections whose
  steps are all done start collapsed. Manual toggles are remembered.
- Step row: minimum 48px tall, whole row toggles done. Left: a circle
  that becomes a check. Middle: step text, then small pills for its
  counter contributions ("Heart piece", "Skulltula"), then the note if
  any, then the missable warning if any (icon plus tinted background,
  no side stripe). Right: a small "⋯" button that opens the step sheet.
- The current step is visually distinct and the page scrolls to it on
  open.
- Done steps are dimmed but still readable and still togglable.
- "more" link on rows that have `detail`, expanding it inline.

Step sheet (bottom sheet, one at a time):
- The step text and detail in full.
- Note: textarea, saved on close.
- Flag: a toggle "This step was wrong" plus a textarea for what was
  wrong, saved on close. Flagging does not change done.
- Close.

Fixed bottom bar:
- `Skipped (n)` — opens the skipped list. Hidden when n = 0.
- `Continue` — scrolls to the current step and expands its section.
  Reads "Complete" when the game is finished.
- `⋯` — menu with Flagged (n), Backup, Import, and About (app version,
  content version).

Skipped and Flagged lists reuse the same step rows, filtered, with a
Back control. Toggling done in the Skipped list removes the row.

First run, when not in standalone mode: a dismissible notice that says
to add the page to the home screen so Safari keeps the progress
(Share → Add to Home Screen).

## 8. Offline

- `manifest.webmanifest`: name "Zelda 100%", `display: standalone`,
  `start_url: ./`, icons. `apple-mobile-web-app-capable` meta and
  `apple-touch-icon` link in `index.html`.
- `sw.js` with a cache version constant, bumped only to purge old caches:
  - App shell files: precached on install, then served
    stale-while-revalidate (cached copy immediately, refreshed in the
    background, so the next open has the new version without bumping
    anything). `skipWaiting` and `clients.claim`.
  - `data/*.json`: network-first with a 4 s timeout, falling back to
    cache; successful network responses update the cache. Online
    players always get the latest content, offline players get the last
    seen content.
- If a data file is neither reachable nor cached, the app shows
  "Walkthrough not available offline yet. Open once with internet."

## 9. Error handling summary

| Situation | Behaviour |
|---|---|
| Progress JSON corrupt | Preserve raw under a corrupt key, start empty, persistent notice. |
| localStorage write fails | Persistent banner, app still usable. |
| Data file has structural errors at runtime | Show which file and which check failed. Do not render a partial list. |
| Data file is structurally fine but incomplete (a counter not fully defined) | Render normally and show a dismissible "content incomplete" notice. The strict check is the CLI validator's job, so a half-edited file never locks the player out. |
| Import JSON invalid | Inline message, nothing changes. |
| Unknown counter id in a step's `collect` | Validator error at build time; at runtime ignored. |

## 10. Validator (tools/validate.mjs)

`node tools/validate.mjs data/oot.json` exits non-zero on any error:

- JSON parses; `id`, `title`, `counters`, `sections` present.
- Counter ids unique; `label` required; `unit` (singular label for the
  row pill) optional; `total` positive integer.
- Section ids unique; every section has at least one step.
- Step ids unique, match `^<gameId>-\d{4}$`.
- `text` non-empty, ≤ 280 chars. `detail`, `missable` strings if present.
- `collect.counter` is a known counter id; `collect.n` is an integer.
- For every counter, the set of `n` over all steps is exactly
  `1..total`, each once. This catches a missing collectible, a
  duplicate and a wrong total in one check.
- Prints a summary: steps per section, counter sums, list of missable
  steps.

## 11. Tests

`node --test tests/` covers `logic.js`:

- counters with no progress, partial, complete.
- validator rejects a duplicate `n`, a gap, and a wrong total.
- current index with none done, some done, all done, a far-ahead done.
- skipped list ordering and exclusion of the current step.
- parseProgress: valid, invalid JSON, wrong schema version, wrong
  gameId.
- mergeProgress: union of done, existing timestamps win, notes and
  flags override.

The validator runs against `data/oot.json` as part of the same check.
Manual test on the iOS Simulator: open, check steps, reload, verify
progress persists; airplane mode reload works after first load.

## 12. Deploy

```
gh repo create franciscogg1997/zelda-tracker --public --source . --push
gh api -X POST repos/franciscogg1997/zelda-tracker/pages \
  -f "source[branch]=main" -f "source[path]=/"
```

Subsequent deploys are `git push`. GitHub Pages publishes within a
minute or two.

## 13. Content production

The walkthrough is written section by section following Zelda
Dungeon's chapter order. For each chapter:

1. Fetch the chapter page and Zelda Central's checklist entries for the
   same area as reference material (kept out of the repo).
2. Write original steps in the file, marking collectibles (with their
   running number) and missables.
3. Run the validator; fix errors; spot-check the running counter totals
   against the reference for that area.

The file is complete when the validator reports exact totals for all
five counters and the three known missables are present as warnings.
