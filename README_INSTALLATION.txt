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
    stones, and portable station worker resources.

Container contents are not edited. Storage-like pickup actors are skipped by
the loose-item cleanup.

The tool is designed to keep Level.sav structurally valid, length-preserving,
and readable by the game.

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

Folder included in this package
-------------------------------
app
runtime
Backups

The app folder contains the CorpseReaper script. The runtime folder contains the
portable Node.js runtime and save compression dependencies. The Backups folder
is created and used by the tool for local backup copies.

Default save folder
-------------------
CorpseReaper lists detected savegame_* slots from:

  %LOCALAPPDATA%\TheParasites\Saved\SaveGames

Recommended workflow
--------------------
1. Close The Parasites completely.
2. Back up your saves.
3. Extract this package anywhere.
4. Run:

   Start_CorpseReaper.cmd

5. Choose the cleanup pass and slot.
6. The tool automatically creates a full backup of the slot folder.
7. Start the game and load the slot.
8. Check that buildings, crafting stations, traps, and containers are still
   present.
9. Save normally once in-game.
10. Exit the game.
11. Optional analysis:

   Start_CorpseReaper.cmd --analyze savegame_1

Expected result after saving in-game:

  Zombie actor records/refs: 0
  Patchable for prune preparation: 0
  Already using prune class: 0

Interactive menu
----------------
Run:

  Start_CorpseReaper.cmd

The menu can prepare cleanup passes, restore a backup, or analyze savegames.

Command-line usage
------------------
List slots:

  Start_CorpseReaper.cmd --list

Analyze a slot:

  Start_CorpseReaper.cmd --analyze savegame_1

Prepare a slot without confirmation prompts:

  Start_CorpseReaper.cmd --prepare-prune savegame_1 --yes
  Start_CorpseReaper.cmd --prepare-loose-item-prune savegame_1 --yes
  Start_CorpseReaper.cmd --prepare-loose-resource-prune savegame_1 --yes

Restore a backup without confirmation prompts:

  Start_CorpseReaper.cmd --restore <backup-folder-name> --yes

Custom save path
----------------
Open Command Prompt in this package folder and run:

  set TP_SAVE_ROOT=D:\Backup\TheParasites\Saved\SaveGames
  Start_CorpseReaper.cmd

Custom backup path
------------------
Open Command Prompt in this package folder and run:

  set TP_CORPSE_REAPER_BACKUP_ROOT=D:\Backup\CorpseReaper
  Start_CorpseReaper.cmd

Portable dependencies
---------------------
This package includes:

  runtime\node.exe
  runtime\node_modules\oodle.js
  runtime\node_modules\koffi
  runtime\node_modules\node-stream-zip

No Python, Node, npm, or package installation is required.

What is patched
---------------
CorpseReaper patches compatible ALS_Zombie_DeathPose_C_* records to an
intentionally invalid class path with the same length:

  /Game/Zombisys/Zombie_Logic/ALS_Zombie_NoActor__.ALS_Zombie_NoActor___C

CorpseReaper can also patch loose pickup item actors and allowlisted loose
resource actors to same-length invalid class paths. Container contents and
storage-like pickup actors are not edited.

After this step, load the slot in-game, save normally, exit the game, then
verify with --analyze.
