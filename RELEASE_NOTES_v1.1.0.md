# The Parasites CorpseReaper v1.1.0

Savegame cleanup editor update.

## Download

Use the attached release ZIP:

```text
TheParasites_CorpseReaper_v1.1.0.zip
```

## Added

- Loose pickup cleanup preparation for runtime pickup actors.
- Storage-like loose pickup detection so backpacks, boxes, chests, containers,
  crates, and storage-like pickup actors are skipped.
- Loose resource cleanup preparation for allowlisted resource actors: branches,
  logs, split logs, stones, and slaves.
- Dedicated analysis output for loose item and loose resource cleanup status.
- CLI options for loose item and loose resource cleanup preparation.

## Usage

1. Close The Parasites completely.
2. Back up your saves.
3. Extract the ZIP.
4. Run `Start_CorpseReaper.cmd`.
5. Choose the cleanup pass and slot.
6. Load the prepared slot in-game.
7. Check that buildings, crafting stations, traps, and containers are still
   present.
8. Save normally once in-game.
9. Exit the game.
10. Optional analysis:

```text
Start_CorpseReaper.cmd --analyze savegame_1
```

## CLI

```text
Start_CorpseReaper.cmd --prepare-prune savegame_1 --yes
Start_CorpseReaper.cmd --prepare-loose-item-prune savegame_1 --yes
Start_CorpseReaper.cmd --prepare-loose-resource-prune savegame_1 --yes
```

## Target Version

Prepared for:

```text
The Parasites TP_Alpha_v_0.1.5.0.0
```

No compatibility is promised for other game versions.

## Terms

Personal, non-commercial use only.

No warranty. No support obligation. No future update guarantee. Use at your own
risk.

See `LICENSE.md` and `COPYRIGHT_AND_TERMS.txt`.
