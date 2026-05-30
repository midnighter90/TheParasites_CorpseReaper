# Changelog

## v1.1.0 - 2026-05-30

Added:

- Loose pickup cleanup preparation for runtime pickup actors.
- Storage-like loose pickup detection so backpacks, boxes, chests, containers,
  crates, and storage-like pickup actors are skipped.
- Loose resource cleanup preparation for allowlisted resource actors: branches,
  logs, split logs, stones, and slaves.
- Dedicated analysis output for loose item and loose resource cleanup status.
- CLI options for loose item and loose resource cleanup preparation.

## Terms update - 2026-05-25

Changed:

- Updated the license and copyright notices to allow source-code inspection and
  personal non-commercial modification.
- Clarified that rehosting, mirroring, publishing modified versions, and all
  commercial uses are prohibited without explicit written permission.

## v1.0.0 - 2026-05-24

Initial public portable release.

Added:

- Offline CorpseReaper save cleaner for The Parasites.
- Savegame slot listing and analysis for `savegame_*` folders.
- Zombie DeathPose prune preparation workflow.
- Length-preserving class-path patching for compatible zombie actor records.
- Full slot backup creation before write and restore operations.
- Backup restore support from the portable `Backups` folder.
- Unreal/Oodle-Kraken chunk decode, validation, and repack support.
- Portable Node.js runtime and required dependencies.
- Command-line and interactive launcher scripts.
- Copyright, terms, installation, and third-party notice files.
