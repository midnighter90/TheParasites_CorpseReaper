# The Parasites CorpseReaper

Portable zombie save cleaner for the Windows version of **The Parasites**.

Prepared for:

- The Parasites `TP_Alpha_v_0.1.5.0.0`
- Windows
- Portable Node.js runtime included
- Unreal/Oodle-Kraken save chunk support included

No compatibility is promised for other game versions.

## What It Does

CorpseReaper is an offline save tool for `savegame_*` slots.

It prepares compatible zombie DeathPose actor records for a one-time in-game
prune pass. After the prepared slot is loaded and saved once in-game, The
Parasites stops writing those invalid zombie actors back into the save.

Recommended workflow:

1. Close The Parasites completely.
2. Run `Start_CorpseReaper_Prune_Prepare.cmd`.
3. Choose a slot, for example `savegame_5` or later `savegame_1`.
4. The tool automatically creates a full backup of the slot folder.
5. Start the game and load the slot.
6. Check that buildings, crafting stations, traps, and containers are still
   present.
7. Save normally once in-game.
8. Exit the game.
9. Optional analysis:

```text
Start_CorpseReaper.cmd --analyze savegame_1
```

The tool is designed to keep `Level.sav` structurally valid, length-preserving,
and readable by the game.

## How It Works

CorpseReaper:

- lists detected `savegame_*` slots from:

```text
%LOCALAPPDATA%\TheParasites\Saved\SaveGames
```

- patches compatible `ALS_Zombie_DeathPose_C_*` records to an intentionally
  invalid class path with the same length:

```text
/Game/Zombisys/Zombie_Logic/ALS_Zombie_NoActor__.ALS_Zombie_NoActor___C
```

- keeps the `Level.sav` decoded length unchanged.
- writes saves back as Unreal/Oodle-Kraken chunk files.
- creates a full backup before write and restore operations.

Expected result after saving in-game:

```text
Zombie actor records/refs: 0
Patchable for prune preparation: 0
Already using prune class: 0
```

## Usage

Interactive menu:

```text
Start_CorpseReaper.cmd
```

Recommended prune preparation:

```text
Start_CorpseReaper_Prune_Prepare.cmd
```

CLI options:

```text
Start_CorpseReaper.cmd --list
Start_CorpseReaper.cmd --analyze savegame_1
Start_CorpseReaper.cmd --prepare-prune savegame_1 --yes
Start_CorpseReaper.cmd --restore <backup-folder-name> --yes
```

Custom save path:

```text
set TP_SAVE_ROOT=D:\Backup\TheParasites\Saved\SaveGames
Start_CorpseReaper.cmd
```

## Backups

Default backup folder:

```text
Backups
```

Optional custom backup root:

```text
set TP_CORPSE_REAPER_BACKUP_ROOT=D:\Backup\CorpseReaper
Start_CorpseReaper.cmd
```

## Portable Dependencies

No Python, Node, npm, or package installation is required.

This package includes:

- `runtime\node.exe`
- `runtime\node_modules\oodle.js`
- `runtime\node_modules\koffi`
- `runtime\node_modules\node-stream-zip`

## Safety Notes

Use this tool at your own risk. Back up your saves before using any save tool.

CorpseReaper blocks write and restore operations while The Parasites appears to
be running, but you are still responsible for closing the game completely and
checking the prepared save after loading it.

This package is provided as-is. There is no warranty, no support obligation, no
liability, and no guarantee that this tool will keep working with future
versions of The Parasites.

## Terms

The source code is available in this repository for inspection, personal
non-commercial use, and personal non-commercial modification.

Because commercial use and hosting on other websites are prohibited, this is a
custom restricted source-available license, not an OSI-approved open-source
license.

Personal, non-commercial use only. Reuploading, mirroring, reposting,
redistribution, repackaging, publishing modified versions, hosting this tool or
its source code on other websites, paid distribution, and all commercial use are
prohibited without explicit written permission from the copyright holder.

This tool is provided as-is, with no warranty, no support obligation, and no
guarantee of compatibility with future game updates. Use at your own risk.

Read [LICENSE.md](LICENSE.md), [COPYRIGHT_AND_TERMS.txt](COPYRIGHT_AND_TERMS.txt),
and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) before using or sharing
this package.

## Third-Party Components

This package includes third-party runtime components. See
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and the files in
[licenses](licenses).

The Parasites and Unreal Engine belong to their respective owners. This tool is
unofficial and is not affiliated with, endorsed by, sponsored by, or approved by
the developer, publisher, or rightsholder of The Parasites.
