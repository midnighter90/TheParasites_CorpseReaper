# Development Log - The Parasites CorpseReaper

Status date: 2026-05-30

This file summarizes the public technical history of CorpseReaper in neutral
English. It intentionally omits private local paths and personal notes.

## Purpose

CorpseReaper is a portable offline savegame cleanup editor for The Parasites
`TP_Alpha_v_0.1.5.0.0`.

The tool prepares compatible saved actor records for one-time in-game prune
passes. It does not directly delete bytes from `Level.sav`; instead, it changes
selected actor class paths to same-length invalid or prune-specific class paths
so the game can drop those actors after the prepared slot is loaded and saved
normally.

## Save Format Work

- `Level.sav` is stored as Unreal/Oodle-Kraken chunks.
- The chunk header uses magic `0x9e2a83c1`, marker `0x22222222`, and a
  49-byte header.
- The tool decodes chunks, patches the decoded buffer, repacks chunks, and
  verifies the written file by decoding it again.
- Actor class paths and actor names are serialized as shifted byte strings, so
  the tool uses paired shifted-string decode and encode helpers.

## Cleanup Targets

The original public release focused on zombie DeathPose cleanup preparation:

- compatible `ALS_Zombie_DeathPose_C_*` actor records.
- the prune class
  `/Game/Zombisys/Zombie_Logic/ALS_Zombie_NoActor__.ALS_Zombie_NoActor___C`.
- legacy pickup fallback detection for older prepared test saves.

The v1.1.0 update adds cleanup preparation for:

- loose pickup item actors under `/Game/JigSInventory/Demo/Pickups/`.
- allowlisted loose resource actors under the building resource blueprints.
- storage-like pickup detection so backpacks, boxes, chests, containers,
  crates, and storage-like actors are skipped.

Container contents and inventory arrays are not edited by CorpseReaper.

## Safety Rules

- Write and restore actions are blocked while The Parasites appears to be
  running.
- Every write creates a full backup of the target slot.
- Patch operations preserve class-path string length for each edited actor.
- Repacked saves are decoded again and compared against the patched decoded
  buffer before the write is considered valid.
- Restore operations back up the current slot before replacing it.

## Public Commands

```text
Start_CorpseReaper.cmd --list
Start_CorpseReaper.cmd --analyze savegame_1
Start_CorpseReaper.cmd --analyze-loose-items savegame_1
Start_CorpseReaper.cmd --analyze-loose-resources savegame_1
Start_CorpseReaper.cmd --prepare-prune savegame_1 --yes
Start_CorpseReaper.cmd --prepare-loose-item-prune savegame_1 --yes
Start_CorpseReaper.cmd --prepare-loose-resource-prune savegame_1 --yes
Start_CorpseReaper.cmd --restore <backup-folder-name> --yes
```

## Project Scope

CorpseReaper is kept focused on savegame cleanup. Trader-specific save editing
experiments were split into a separate project so cleanup behavior and trader
behavior can evolve independently.

## Release Notes

### v1.1.0

- Added loose item cleanup preparation.
- Added loose resource cleanup preparation.
- Added dedicated loose item and loose resource analysis commands.
- Removed trader-specific code from CorpseReaper.
- Kept the tool focused on cleanup save editing.

### v1.0.0

- Initial portable release.
- Added zombie DeathPose cleanup preparation.
- Added backup, restore, analysis, Unreal/Oodle-Kraken decode, validation, and
  repack support.
