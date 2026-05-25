# Development Log - The Parasites CorpseReaper

Stand: 2026-05-25

Diese Datei dokumentiert die relevanten Schritte, mit denen CorpseReaper
entwickelt, verpackt, geprueft und fuer die Veroeffentlichung vorbereitet
wurde.

## Ausgangspunkt

CorpseReaper entstand als offline Save-Tool fuer The Parasites
`TP_Alpha_v_0.1.5.0.0`. Das konkrete Problem waren in `Level.sav`
persistierende Zombie-DeathPose-Actor, die nach Spielstand-Lade-/Speicherlaeufen
weiter im Save auftauchen konnten.

Das Ziel war kein Ingame-Mod, sondern ein portables Werkzeug, das Savegames
vorbereitet, bevor sie einmal im Spiel geladen und wieder gespeichert werden.
Der Spielstand sollte dabei strukturell gueltig bleiben und jederzeit ueber ein
vollstaendiges Backup wiederherstellbar sein.

## Recherche

1. Savegame-Struktur untersucht:
   - relevante Slots liegen unter `%LOCALAPPDATA%\TheParasites\Saved\SaveGames`.
   - jeder Slot enthaelt u.a. `Level.sav`.
   - `Level.sav` ist kein einfaches Klartextformat, sondern in Unreal/Oodle-
     Kraken-Chunks gepackt.

2. Chunk-Format nachvollzogen:
   - Chunk-Magic `0x9e2a83c1`.
   - Header-Marker `0x22222222`.
   - Headergroesse 49 Bytes.
   - Kompressionsalgorithmus 2, Oodle/Kraken.
   - unkomprimierte Chunk-Groesse bis `0x20000`.

3. Oodle-Zugriff geloest:
   - portable Node.js Runtime eingebunden.
   - `oodle.js` plus `koffi` fuer DLL-Aufrufe verwendet.
   - `oodle-x64.dll` in die portable Runtime aufgenommen.
   - Decode und Re-Encode mit Roundtrip-Pruefung gebaut.

4. Actor-Records analysiert:
   - im decodierten `Level.sav` liegen Actor-Klassenpfade und Actor-Namen als
     leicht verschobene Strings vor.
   - dafuer wurden `decodeShiftedString` und `encodeShiftedString` gebaut.
   - DeathPose-Actor wurden ueber den Namen-Prefix
     `ALS_Zombie_DeathPose_C_` und bekannte Zombie-Klassenpfade identifiziert.

## Trial and Error

1. Direktes Loeschen von Actor-Daten wurde verworfen.
   - Die Actor-Records stehen nicht isoliert genug, um sie ohne Risiko einfach
     aus dem Byte-Strom zu schneiden.
   - Ein Loeschen wuerde Offsets, Laengen, Referenzen oder nachfolgende Records
     verschieben.
   - Ziel wurde daher: laengen-erhaltend patchen statt Bytes entfernen.

2. Legacy-Fallback mit Pickup-Klasse untersucht.
   - Als Zwischenweg wurde eine laengenkompatible Klasse genutzt:
     `/Game/JigSInventory/Demo/Pickups/StaticMesh/BP_Antiradin.BP_Antiradin_C`.
   - Der Code kann solche Altdaten noch erkennen, damit fruehere Tests oder
     vorbereitete Saves analysierbar bleiben.
   - Fuer die finale Veroeffentlichung war dieser Weg nicht der empfohlene
     Hauptpfad.

3. Finaler Prune-Ansatz gefunden.
   - Die finale Zielklasse ist:
     `/Game/Zombisys/Zombie_Logic/ALS_Zombie_NoActor__.ALS_Zombie_NoActor___C`.
   - Sie ist absichtlich fuer einen Prune-Pass gedacht und laengenkompatibel zu
     den betrachteten DeathPose-Daten.
   - Nach Laden und einmaligem Speichern im Spiel soll The Parasites diese
     ungueltigen Zombie-Actor nicht mehr zurueckschreiben.

4. Sicherheitsregeln ergaenzt.
   - keine Schreibaktion, solange der Prozess `TheParasites*` laeuft.
   - jedes Schreiben erzeugt ein vollstaendiges Slot-Backup.
   - der decodierte Save bleibt laengenstabil.
   - jede neu gepackte Datei wird wieder decodiert und gegen den gepatchten
     Buffer verglichen.

## Finaler Code

Der finale Code liegt in:

```text
app/CorpseReaper.mjs
```

Wichtige Bestandteile:

- Save-slot listing fuer `savegame_*`.
- Oodle/Kraken Decode von `Level.sav`.
- Oodle/Kraken Encode mit Roundtrip-Pruefung.
- Actor-Record-Erkennung ueber verschobene Strings.
- Klassifizierung:
  - alle Zombie-Records.
  - bereits auf Legacy-Pickup umgebogene Records.
  - bereits auf Prune-Klasse gesetzte Records.
  - patchbare DeathPose-/Zombie-Records.
  - aus Laengengruenden uebersprungene Records.
- `--analyze` fuer Risiko-/Statussicht.
- `--prepare-prune` fuer den empfohlenen Workflow.
- Restore-Funktion fuer vorher angelegte Backups.
- interaktives Menue und CMD-Launcher.

Die wichtigsten Launcher:

```text
Start_CorpseReaper.cmd
Start_CorpseReaper_Prune_Prepare.cmd
```

## Dokumentation und Repository-Aufbau

Nach dem funktionalen Code wurde der Ordner in einen veroeffentlichbaren
Repository-Stil gebracht, angelehnt an QuickStack:

- `README.md`
- `README.txt`
- `README_INSTALLATION.txt`
- `CHANGELOG.md`
- `CHANGELOG.txt`
- `RELEASE_NOTES_v1.0.0.md`
- `VERSION.txt`
- `PUBLISHING.md`
- `LICENSE.md`
- `COPYRIGHT_AND_TERMS.txt`
- `THIRD_PARTY_NOTICES.md`
- `THIRD_PARTY_NOTICES.txt`
- `MANIFEST_SHA256.txt`
- `.gitattributes`
- `.gitignore`

Das Repository wurde auf GitHub vorbereitet:

```text
https://github.com/midnighter90/TheParasites_CorpseReaper
```

## Lizenz- und Copyright-Arbeit

1. Zunaechst wurde der Stil an QuickStack angeglichen.
2. Danach wurden die Terms fuer alle Projekte auf einen einheitlichen Stand
   gebracht:
   - Quellcode einsehbar.
   - persoenliche, nicht-kommerzielle Nutzung erlaubt.
   - persoenliche, nicht-kommerzielle Modifikation erlaubt.
   - kein Rehosting, Mirroring, Reposting, Repackaging oder Hosting auf anderen
     Websites.
   - keine kommerzielle Nutzung.
   - keine Garantie, kein Supportversprechen, keine Zukunftskompatibilitaet.
3. Git-Autor, Committer und Tagger wurden auf
   `midnighter90 <258240830+midnighter90@users.noreply.github.com>` gesetzt.

## Oodle-Notiz

Bei der finalen Public-Pruefung fiel auf, dass `oodle-x64.dll` ein
Copyright-/Lizenz-Risikopunkt ist. Die Notices wurden daher erweitert:

- Oodle gehoert Epic/RAD bzw. den jeweiligen Rechteinhabern.
- Die DLLs werden nur genutzt, um vorhandene Oodle-kompatible Save-Chunks
  offline zu lesen und zu schreiben.
- Die Notiz wurde inhaltlich an die WorkingRobot/OodleUE EULA Notice angelehnt.
- Nutzer sind selbst fuer passende Unreal/Oodle-Berechtigungen verantwortlich.
- Wenn ein autorisierter Rechteinhaber die oeffentliche Bereitstellung nicht
  wuenscht, sollen die DLLs entfernt oder eine tragfaehige Alternative gefunden
  werden.

## GitHub-/Release-Arbeit

Durchgefuehrte Repository-Schritte:

1. lokales Git-Repository initialisiert bzw. aufgeraeumt.
2. Remote auf `TheParasites_CorpseReaper` gesetzt.
3. Initialen Import committed.
4. QuickStack-artige Dokumentation ergaenzt.
5. Lizenz-/Terms-Update committed.
6. Oodle-Hinweise ergaenzt und danach an OodleUE-Notice angepasst.
7. `v1.0.0`-Tag auf den aktuellen, korrigierten Stand gesetzt.
8. `main` und `v1.0.0` nach GitHub gepusht.

## Verifikation

Vor Public wurden u.a. diese Punkte geprueft:

- `node --check app/CorpseReaper.mjs`.
- CLI-Hilfe und Analysepfad.
- Decode/Re-Encode-Roundtrip.
- Manifest-Hashes.
- Release-ZIP entpackbar.
- Release-ZIP gegen `MANIFEST_SHA256.txt` pruefbar.
- kein versehentliches Committen lokaler Backup-Ordner.
- GitHub-Remote, `main`, `v1.0.0` und Autor/Tagger.
- Dokumentation, Terms, Copyright und Third-Party Notices.

## Ergebnis

CorpseReaper ist ein portables Offline-Tool, das `Level.sav` nicht destruktiv
umbaut, sondern kompatible Zombie-DeathPose-Actor fuer einen Ingame-Prune-Pass
vorbereitet. Der finale public Workflow ist:

1. Spiel schliessen.
2. `Start_CorpseReaper_Prune_Prepare.cmd` starten.
3. Slot waehlen.
4. Backup automatisch erstellen lassen.
5. Slot im Spiel laden.
6. Welt kurz pruefen.
7. einmal normal speichern.
8. optional danach mit `--analyze` kontrollieren.
