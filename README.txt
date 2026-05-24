CorpseReaper - The Parasites Zombie Save Cleaner
================================================

Start:
  Start_CorpseReaper.cmd

Recommended workflow:
  1. Close The Parasites completely.
  2. Run Start_CorpseReaper_Prune_Prepare.cmd.
  3. Choose a slot, for example savegame_5 or later savegame_1.
  4. The tool automatically creates a full backup of the slot folder.
  5. Start the game and load the slot.
  6. Check that buildings, crafting stations, traps, and containers are still present.
  7. Save normally once in-game.
  8. Exit the game.
  9. Optional analysis:
     Start_CorpseReaper.cmd --analyze savegame_1

What the tool does:
  - lists detected savegame_* slots from:
    %LOCALAPPDATA%\TheParasites\Saved\SaveGames
  - patches ALS_Zombie_DeathPose_C_* records to an intentionally invalid
    class path with the same length:
    /Game/Zombisys/Zombie_Logic/ALS_Zombie_NoActor__.ALS_Zombie_NoActor___C
  - keeps the Level.sav length unchanged so the world loads correctly
  - after the next normal in-game save, The Parasites does not write those
    invalid actors again, so the zombie records truly disappear from the save
  - writes saves back as Unreal/Oodle-Kraken chunk files

Expected result after saving in-game:
  Zombie actor records/refs: 0
  Patchable for prune preparation: 0
  Already using prune class: 0

CLI options:
  Start_CorpseReaper.cmd --list
  Start_CorpseReaper.cmd --analyze savegame_1
  Start_CorpseReaper.cmd --prepare-prune savegame_1 --yes
  Start_CorpseReaper.cmd --restore <backup-folder-name> --yes

Backups:
  Default: portable Backups subfolder
  Optional: set TP_CORPSE_REAPER_BACKUP_ROOT.

Custom save path:
  set TP_SAVE_ROOT=D:\Backup\TheParasites\Saved\SaveGames
  Start_CorpseReaper.cmd

Portable Dependencies:
  - runtime\node.exe
  - runtime\node_modules\oodle.js
  - runtime\node_modules\koffi
  - runtime\node_modules\node-stream-zip

No Python, Node, npm, or package installation is required.
