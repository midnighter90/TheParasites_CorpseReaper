The Parasites CorpseReaper v1.1.0
Portable save cleaner and usage

What this tool does
-------------------
CorpseReaper is an offline cleanup tool for savegame_* slots.

It prepares compatible saved actors for one-time in-game prune passes. After a
prepared slot is loaded and saved once in-game, The Parasites should stop
writing those invalid actors back into the save.

Current cleanup targets:

  - zombie DeathPose actors.
  - loose pickup item actors.
  - allowlisted loose resource actors, including branches, logs, split logs,
    stones, and slaves.

Container contents are not edited. Storage-like pickup actors are skipped by
the loose-item cleanup.

Recommended workflow:

  1. Close The Parasites completely.
  2. Run:

     Start_CorpseReaper.cmd

  3. Choose the cleanup pass and slot.
  4. The tool automatically creates a full backup of the slot folder.
  5. Start the game and load the slot.
  6. Check that buildings, crafting stations, traps, and containers are still
     present.
  7. Save normally once in-game.
  8. Exit the game.
  9. Optional analysis:

     Start_CorpseReaper.cmd --analyze savegame_1

Expected result after saving in-game:

  Zombie actor records/refs: 0
  Patchable for prune preparation: 0
  Already using prune class: 0

Important warning
-----------------
Use this tool at your own risk. Back up your saves before using any save tool.

This package is provided as-is. There is no warranty, no support obligation, no
liability, and no guarantee that this tool will keep working with future
versions of The Parasites.

Read COPYRIGHT_AND_TERMS.txt before publishing, mirroring, sharing, modifying,
hosting, or using this package.

Tested target
-------------
This release was prepared for the Windows version of:

  The Parasites TP_Alpha_v_0.1.5.0.0

No compatibility is promised for other versions.

Portable dependencies
---------------------
This package includes:

  runtime\node.exe
  runtime\node_modules\oodle.js
  runtime\node_modules\koffi
  runtime\node_modules\node-stream-zip

No Python, Node, npm, or package installation is required.

Default save folder
-------------------
CorpseReaper lists detected savegame_* slots from:

  %LOCALAPPDATA%\TheParasites\Saved\SaveGames

Custom save path
----------------
Open Command Prompt in this package folder and run:

  set TP_SAVE_ROOT=D:\Backup\TheParasites\Saved\SaveGames
  Start_CorpseReaper.cmd

Backups
-------
Default backup folder:

  Backups

Optional custom backup root:

  set TP_CORPSE_REAPER_BACKUP_ROOT=D:\Backup\CorpseReaper
  Start_CorpseReaper.cmd

CLI options
-----------
Start_CorpseReaper.cmd --list
Start_CorpseReaper.cmd --analyze savegame_1
Start_CorpseReaper.cmd --prepare-prune savegame_1 --yes
Start_CorpseReaper.cmd --prepare-loose-item-prune savegame_1 --yes
Start_CorpseReaper.cmd --prepare-loose-resource-prune savegame_1 --yes
Start_CorpseReaper.cmd --restore <backup-folder-name> --yes
