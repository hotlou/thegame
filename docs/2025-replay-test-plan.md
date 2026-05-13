# 2025 Replay Test Plan

Use this to rehearse go-live against the completed 2025 USAU D-I College Championships. The replay should be run against a local database or a dedicated replay schema, not production.

## Source Data

- Men's 2025 D-I schedule/results: `https://play.usaultimate.org/events/2025-USA-Ultimate-College-Championships/schedule/Men/CollegeMen/`
- Women's 2025 D-I schedule/results: `https://play.usaultimate.org/events/2025-USA-Ultimate-College-Championships/schedule/Women/CollegeWomen/`
- Event page reference: `https://play.usaultimate.org/events/2025-USA-Ultimate-College-Championships/`

## Automated Replay

Run the full replay:

```bash
npm run replay:2025
```

For a hosted replay database, use an isolated schema and be explicit:

```bash
DATABASE_URL='postgresql://.../...?schema=thegame_replay' npm run replay:2025
```

If the replay database URL cannot be recognized as local or replay-scoped:

```bash
npm run replay:2025 -- --allow-remote-db
```

Useful variants:

```bash
npm run replay:2025 -- --entries 100
npm run replay:2025 -- --checkpoint pool
npm run replay:2025 -- --mens-file ./tmp/2025-men.html --womens-file ./tmp/2025-women.html
```

The script deletes and recreates only the event whose slug contains `replay`, defaulting to `college-d1-2025-replay`.

## What The Script Proves

- USAU pages still parse into 20 men's teams and 20 women's teams.
- The app can create a locked replay event, divisions, teams, games, bonus question, entries, picks, and answers.
- Every replay entry has exactly five unique picks.
- Scores start at zero before results.
- Scores never move backward as checkpoints are applied.
- Results can be applied incrementally through `pre`, `pool`, `prequarter`, `quarter`, `semi`, and `final`.
- Final scoring produces positive leaderboard totals and marks the event scoring complete.

## Manual Smoke Test

After running `npm run replay:2025`, start the app:

```bash
npm run dev
```

Then inspect:

- `/events/college-d1-2025-replay`
- `/events/college-d1-2025-replay/leaderboard`
- `/admin/teams`
- `/admin/games`
- `/admin/entries`
- `/admin/exports`

Check that:

- The event is locked and public picks are visible.
- Teams are grouped by division and buckets.
- The leaderboard matches the script's top-five output for the final checkpoint.
- CSV exports download and include the replay entries.
- Manual score overrides still recalculate the leaderboard.
- Re-running a results import preview shows mostly unchanged rows after the replay.

## Live Operating Runbook

Before launch:

- Confirm `DATABASE_URL` points at the intended production schema.
- Run `npm run db:migrate`.
- Import both USAU division schedule pages from `/admin/import`.
- Review parsed teams, buckets, pools, and championship-path games.
- Create or review bonus questions before entries open.
- Set `entryLockAt`, `picksVisibleAt`, and `isLocked` in `/admin/settings`.
- Submit at least one real test entry and one admin-owned entry.
- Export entries once and keep the CSV as the pre-lock audit snapshot.

During the event:

- Import results after each major window: pool completion, prequarters, quarters, semis, final.
- Preview before confirming. Investigate `UNMATCHED_TEAM` and `MANUAL_CONFLICT` before applying.
- Use manual overrides only for trusted corrections, and leave notes outside the app for why the override happened.
- After each import, check `/admin/games`, `/admin`, and the public leaderboard.
- Export leaderboard after each scoring window.

After the final:

- Set correct bonus answers.
- Run one final results import.
- Confirm `scoringComplete`.
- Export final leaderboard and entries.
- Do a final public-page smoke test from a signed-out browser.
