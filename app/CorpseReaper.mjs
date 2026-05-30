import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import readline from "node:readline/promises";

const APP_DIR = path.dirname(fileURLToPath(import.meta.url));
const TOOL_DIR = path.resolve(APP_DIR, "..");
const RUNTIME_DIR = path.join(TOOL_DIR, "runtime");
const BACKUP_ROOT = process.env.TP_CORPSE_REAPER_BACKUP_ROOT || process.env.TP_CLEANER_BACKUP_ROOT || path.join(TOOL_DIR, "Backups");
const SAVE_ROOT =
  process.env.TP_SAVE_ROOT ||
  path.join(process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || "", "AppData", "Local"), "TheParasites", "Saved", "SaveGames");

const OODLE_ENTRY = path.join(RUNTIME_DIR, "node_modules", "oodle.js", "dist", "index.js");
const OODLE_DLL = path.join(RUNTIME_DIR, "node_modules", "oodle.js", "bin", "oodle-x64.dll");

const MAGIC = 0x9e2a83c1;
const HEADER_MARKER = 0x22222222;
const CHUNK_HEADER_SIZE = 49;
const UNREAL_CHUNK_SIZE = 0x20000;
const GAME_PROCESS_NAME = "TheParasites";

const TARGET_CLASS = "/Game/JigSInventory/Demo/Pickups/StaticMesh/BP_Antiradin.BP_Antiradin_C";
const PRUNE_CLASS = "/Game/Zombisys/Zombie_Logic/ALS_Zombie_NoActor__.ALS_Zombie_NoActor___C";
const DEATH_POSE_PREFIX = "ALS_Zombie_DeathPose_C_";
const LOOSE_PICKUP_CLASS_PREFIX = "/Game/JigSInventory/Demo/Pickups/";
const INVALID_LOOSE_PICKUP_BASE_NAME = "BP_NoLooseItem";
const INVALID_LOOSE_PICKUP_PREFIXES = ["/Game/Invalid/", "/Game/_Invalid/"];
const STORAGE_LIKE_PICKUP_MARKERS = ["backpack", "box", "chest", "container", "crate", "storage"];
const INVALID_LOOSE_RESOURCE_BASE_NAME = "BP_NoLooseResource";
const LOOSE_RESOURCE_CLASSES = new Set([
  "/Game/BuildingSystem/Blueprints/Resources/BP_Resources_Branch.BP_Resources_Branch_C",
  "/Game/BuildingSystem/Blueprints/Resources/BP_Resources_Log.BP_Resources_Log_C",
  "/Game/BuildingSystem/Blueprints/Resources/BP_Resources_Slave1.BP_Resources_Slave1_C",
  "/Game/BuildingSystem/Blueprints/Resources/BP_Resources_Split_Log.BP_Resources_Split_Log_C",
  "/Game/BuildingSystem/Blueprints/Resources/BP_Resources_Stone.BP_Resources_Stone_C",
]);
const KNOWN_RECLASS_SOURCES = new Set([
  "/Game/Zombisys/Zombie_Logic/ALS_Zombie_DeathPose.ALS_Zombie_DeathPose_C",
  "/Game/JigSInventory/Demo/Pickups/SkeletalMesh/BP_Scorpion.BP_Scorpion_C",
]);
const KNOWN_PRUNE_SOURCES = new Set([...KNOWN_RECLASS_SOURCES, TARGET_CLASS]);

let oodleModule = null;
let oodle = null;

function stamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const ms = String(d.getMilliseconds()).padStart(3, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}-${ms}`;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MiB`;
}

function assertPortableRuntime() {
  if (process.arch !== "x64") {
    throw new Error(`This package only includes the x64 runtime. Current architecture: ${process.arch}`);
  }
  for (const required of [OODLE_ENTRY, OODLE_DLL]) {
    if (!fs.existsSync(required)) {
      throw new Error(`Portable dependency is missing: ${required}`);
    }
  }
}

async function loadOodle() {
  if (oodle) return oodle;
  assertPortableRuntime();
  oodleModule = await import(pathToFileURL(OODLE_ENTRY).href);
  oodle = await oodleModule.Oodle.Create(OODLE_DLL);
  return oodle;
}

function gameIsRunning() {
  try {
    const output = execFileSync("tasklist", ["/FI", `IMAGENAME eq ${GAME_PROCESS_NAME}*`], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    return output.includes(GAME_PROCESS_NAME);
  } catch {
    return false;
  }
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function assertSlotName(slot) {
  if (!/^savegame_\d+$/.test(slot)) {
    throw new Error(`Invalid save slot: ${slot}`);
  }
}

function slotDir(slot) {
  assertSlotName(slot);
  return path.join(SAVE_ROOT, slot);
}

function levelPath(slot) {
  return path.join(slotDir(slot), "Level.sav");
}

function copyDir(src, dst) {
  fs.cpSync(src, dst, { recursive: true, force: true, errorOnExist: false });
}

function makeBackup(slot, reason) {
  const src = slotDir(slot);
  if (!fs.existsSync(src)) {
    throw new Error(`Slot not found: ${src}`);
  }
  ensureDir(BACKUP_ROOT);
  const dst = path.join(BACKUP_ROOT, `${slot}_${reason}_${stamp()}`);
  copyDir(src, dst);
  return dst;
}

function listSlots() {
  if (!fs.existsSync(SAVE_ROOT)) return [];
  return fs
    .readdirSync(SAVE_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^savegame_\d+$/.test(entry.name))
    .filter((entry) => fs.existsSync(path.join(SAVE_ROOT, entry.name, "Level.sav")))
    .map((entry) => {
      const level = path.join(SAVE_ROOT, entry.name, "Level.sav");
      const stat = fs.statSync(level);
      return { slot: entry.name, level, size: stat.size, mtime: stat.mtime };
    })
    .sort((a, b) => a.slot.localeCompare(b.slot, undefined, { numeric: true }));
}

function listBackups() {
  if (!fs.existsSync(BACKUP_ROOT)) return [];
  return fs
    .readdirSync(BACKUP_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^savegame_\d+/.test(entry.name))
    .filter((entry) => fs.existsSync(path.join(BACKUP_ROOT, entry.name, "Level.sav")))
    .map((entry) => {
      const full = path.join(BACKUP_ROOT, entry.name);
      const stat = fs.statSync(full);
      const slot = entry.name.match(/^(savegame_\d+)/)?.[1] || "";
      return { name: entry.name, full, slot, mtime: stat.mtime };
    })
    .sort((a, b) => b.mtime - a.mtime);
}

function decodeShiftedString(raw) {
  const out = Buffer.alloc(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    out[i] = (raw[i] + 1) & 0xff;
  }
  return out.toString("latin1").replace(/\0+$/g, "");
}

function encodeShiftedString(text) {
  const out = Buffer.alloc(Buffer.byteLength(text, "latin1"));
  for (let i = 0; i < text.length; i += 1) {
    out[i] = (text.charCodeAt(i) - 1) & 0xff;
  }
  return out;
}

function makeInvalidLoosePickupClass(sourceLength) {
  return makeInvalidClassPath(sourceLength, INVALID_LOOSE_PICKUP_BASE_NAME);
}

function makeInvalidLooseResourceClass(sourceLength) {
  return makeInvalidClassPath(sourceLength, INVALID_LOOSE_RESOURCE_BASE_NAME);
}

function makeInvalidClassPath(sourceLength, baseName) {
  for (const prefix of INVALID_LOOSE_PICKUP_PREFIXES) {
    const remaining = sourceLength - prefix.length - 3;
    if (remaining < baseName.length * 2 || remaining % 2 !== 0) continue;
    const nameLength = remaining / 2;
    const className = baseName + "_".repeat(nameLength - baseName.length);
    const candidate = `${prefix}${className}.${className}_C`;
    if (candidate.length === sourceLength) return candidate;
  }
  throw new Error(`Cannot generate an invalid class path with length ${sourceLength}`);
}

function isGeneratedLoosePickupPruneClass(classPath) {
  return INVALID_LOOSE_PICKUP_PREFIXES.some((prefix) => classPath.startsWith(`${prefix}${INVALID_LOOSE_PICKUP_BASE_NAME}`));
}

function isGeneratedLooseResourcePruneClass(classPath) {
  return INVALID_LOOSE_PICKUP_PREFIXES.some((prefix) => classPath.startsWith(`${prefix}${INVALID_LOOSE_RESOURCE_BASE_NAME}`));
}

function isRuntimeActorName(objectName) {
  return /_C_\d+$/.test(objectName);
}

function isLoosePickupRecord(record) {
  if (!record.classPath.startsWith(LOOSE_PICKUP_CLASS_PREFIX)) return false;
  if (!isRuntimeActorName(record.objectName)) return false;
  const text = `${record.classPath} ${record.objectName}`.toLowerCase();
  if (text.includes("zombie")) return false;
  return true;
}

function isStorageLikePickupRecord(record) {
  const text = `${record.classPath} ${record.objectName}`.toLowerCase();
  return STORAGE_LIKE_PICKUP_MARKERS.some((marker) => text.includes(marker));
}

function isLooseResourceRecord(record) {
  return LOOSE_RESOURCE_CLASSES.has(record.classPath) && isRuntimeActorName(record.objectName);
}

function findActorRecords(decoded) {
  const starts = [];
  const classPrefix = Buffer.from([0x2e, 0x46, 0x60, 0x6c, 0x64]);
  const endLimit = decoded.length - 8;

  for (let pos = 0; pos < endLimit; pos += 1) {
    const classLength = decoded.readInt32LE(pos);
    if (classLength < 5 || classLength > 400) continue;
    if (pos + 4 + classLength > decoded.length) continue;
    if (!decoded.subarray(pos + 4, pos + 9).equals(classPrefix)) continue;

    const classRaw = decoded.subarray(pos + 4, pos + 4 + classLength);
    const classPath = decodeShiftedString(classRaw);
    const namePos = pos + 4 + classLength;
    if (namePos + 4 > decoded.length) continue;
    const nameLength = decoded.readInt32LE(namePos);
    if (nameLength < 1 || nameLength > 300 || namePos + 4 + nameLength > decoded.length) continue;
    const objectName = decodeShiftedString(decoded.subarray(namePos + 4, namePos + 4 + nameLength));
    starts.push({ start: pos, classPath, objectName });
  }

  return starts.map((record, index) => ({
    ...record,
    end: index + 1 < starts.length ? starts[index + 1].start : decoded.length,
    size: (index + 1 < starts.length ? starts[index + 1].start : decoded.length) - record.start,
  }));
}

async function decodeLevelSav(file) {
  const o = await loadOodle();
  const data = fs.readFileSync(file);
  const parts = [];
  let offset = 0;

  while (offset < data.length) {
    if (offset + CHUNK_HEADER_SIZE > data.length) {
      throw new Error(`Trailing bytes at ${offset}: ${data.length - offset}`);
    }
    const tag = data.readUInt32LE(offset);
    const marker = data.readUInt32LE(offset + 4);
    if (tag !== MAGIC || marker !== HEADER_MARKER) {
      throw new Error(`Unexpected chunk header at ${offset}: tag=0x${tag.toString(16)}, marker=0x${marker.toString(16)}`);
    }
    const algorithm = data[offset + 16];
    const compressedSize = Number(data.readBigUInt64LE(offset + 17));
    const uncompressedSize = Number(data.readBigUInt64LE(offset + 25));
    const compressedRepeat = Number(data.readBigUInt64LE(offset + 33));
    const uncompressedRepeat = Number(data.readBigUInt64LE(offset + 41));
    if (algorithm !== 2) throw new Error(`Unexpected compression algorithm at ${offset}: ${algorithm}`);
    if (compressedSize !== compressedRepeat || uncompressedSize !== uncompressedRepeat) {
      throw new Error(`Chunk sizes do not match at ${offset}`);
    }

    const start = offset + CHUNK_HEADER_SIZE;
    const end = start + compressedSize;
    if (end > data.length) throw new Error(`Chunk at ${offset} extends past the end of the file`);
    const decoded = Buffer.from(o.decompress({ buffer: data.subarray(start, end) }, uncompressedSize));
    if (decoded.length !== uncompressedSize) {
      throw new Error(`Decoded ${decoded.length} bytes, expected ${uncompressedSize}`);
    }
    parts.push(decoded);
    offset = end;
  }

  return Buffer.concat(parts);
}

function makeHeader(payloadLength, rawLength) {
  const header = Buffer.alloc(CHUNK_HEADER_SIZE);
  header.writeUInt32LE(MAGIC, 0);
  header.writeUInt32LE(HEADER_MARKER, 4);
  header.writeBigUInt64LE(BigInt(UNREAL_CHUNK_SIZE), 8);
  header[16] = 2;
  header.writeBigUInt64LE(BigInt(payloadLength), 17);
  header.writeBigUInt64LE(BigInt(rawLength), 25);
  header.writeBigUInt64LE(BigInt(payloadLength), 33);
  header.writeBigUInt64LE(BigInt(rawLength), 41);
  return header;
}

async function encodeLevelSav(decoded) {
  const o = await loadOodle();
  const { OodleCompressor, OodleCompressionLevel } = oodleModule;
  const parts = [];

  for (let offset = 0; offset < decoded.length; offset += UNREAL_CHUNK_SIZE) {
    const raw = decoded.subarray(offset, Math.min(offset + UNREAL_CHUNK_SIZE, decoded.length));
    const payload = Buffer.from(o.compress({ buffer: raw }, OodleCompressor.Kraken, OodleCompressionLevel.Optimal));
    const check = Buffer.from(o.decompress({ buffer: payload }, raw.length));
    if (!check.equals(raw)) {
      throw new Error(`Oodle round-trip failed at decoded offset ${offset}`);
    }
    parts.push(makeHeader(payload.length, raw.length), payload);
  }

  return Buffer.concat(parts);
}

function classifyRecords(records) {
  const targetLen = TARGET_CLASS.length;
  const pruneLen = PRUNE_CLASS.length;
  const allZombieRecords = records.filter((record) => record.classPath.includes("Zombie") || record.objectName.includes("Zombie"));
  const alreadyAntiradin = records.filter((record) => record.objectName.startsWith(DEATH_POSE_PREFIX) && record.classPath === TARGET_CLASS);
  const alreadyPruneClass = records.filter((record) => record.objectName.startsWith(DEATH_POSE_PREFIX) && record.classPath === PRUNE_CLASS);
  const patchable = records.filter((record) => {
    if (record.classPath === TARGET_CLASS) return false;
    if (record.classPath === PRUNE_CLASS) return false;
    if (record.objectName.startsWith(DEATH_POSE_PREFIX) && KNOWN_RECLASS_SOURCES.has(record.classPath) && record.classPath.length === targetLen) {
      return true;
    }
    return record.classPath.includes("Zombie") && record.classPath.length === targetLen;
  });
  const prunePatchable = records.filter((record) => {
    if (!record.objectName.startsWith(DEATH_POSE_PREFIX)) return false;
    if (record.classPath === PRUNE_CLASS) return false;
    if (record.classPath.length !== pruneLen) return false;
    return KNOWN_PRUNE_SOURCES.has(record.classPath) || record.classPath.includes("Zombie");
  });
  const skippedLength = allZombieRecords.filter((record) => record.classPath.includes("Zombie") && record.classPath.length !== targetLen);
  const loosePickupRecords = records.filter(isLoosePickupRecord);
  const storageLikeLoosePickups = loosePickupRecords.filter(isStorageLikePickupRecord);
  const looseItemPatchable = loosePickupRecords.filter((record) => !isStorageLikePickupRecord(record));
  const alreadyLooseItemPruneClass = records.filter((record) => isRuntimeActorName(record.objectName) && isGeneratedLoosePickupPruneClass(record.classPath));
  const looseResourceRecords = records.filter(isLooseResourceRecord);
  const alreadyLooseResourcePruneClass = records.filter((record) => isRuntimeActorName(record.objectName) && isGeneratedLooseResourcePruneClass(record.classPath));
  return {
    allZombieRecords,
    alreadyAntiradin,
    alreadyPruneClass,
    patchable,
    prunePatchable,
    skippedLength,
    loosePickupRecords,
    storageLikeLoosePickups,
    looseItemPatchable,
    alreadyLooseItemPruneClass,
    looseResourceRecords,
    alreadyLooseResourcePruneClass,
  };
}

function summarizeRecordsByClass(records) {
  const summary = new Map();
  for (const record of records) {
    const current = summary.get(record.classPath) || { classPath: record.classPath, count: 0, examples: [] };
    current.count += 1;
    if (current.examples.length < 3) current.examples.push(record.objectName);
    summary.set(record.classPath, current);
  }
  return [...summary.values()].sort((a, b) => b.count - a.count || a.classPath.localeCompare(b.classPath));
}

function printRecordSummaryByClass(records, limit = 20) {
  const summary = summarizeRecordsByClass(records);
  for (const entry of summary.slice(0, limit)) {
    console.log(`  - ${entry.count} x ${entry.classPath}`);
    console.log(`    examples: ${entry.examples.join(", ")}`);
  }
  if (summary.length > limit) console.log(`  ... ${summary.length - limit} more classes`);
}

function printLooseItemDetails(classified) {
  console.log("");
  console.log("Loose item actor details:");
  console.log(`  Loose pickup actor records: ${classified.loosePickupRecords.length}`);
  console.log(`  Patchable loose item actors: ${classified.looseItemPatchable.length}`);
  console.log(`  Storage-like pickup actors skipped: ${classified.storageLikeLoosePickups.length}`);
  console.log(`  Already using loose-item prune class: ${classified.alreadyLooseItemPruneClass.length}`);

  if (classified.looseItemPatchable.length > 0) {
    console.log("");
    console.log("Patchable loose item classes:");
    printRecordSummaryByClass(classified.looseItemPatchable);
  }

  if (classified.storageLikeLoosePickups.length > 0) {
    console.log("");
    console.log("Skipped storage-like pickup classes:");
    printRecordSummaryByClass(classified.storageLikeLoosePickups, 12);
  }
}

function printLooseResourceDetails(classified) {
  console.log("");
  console.log("Loose resource actor details:");
  console.log(`  Loose resource actor records: ${classified.looseResourceRecords.length}`);
  console.log(`  Already using loose-resource prune class: ${classified.alreadyLooseResourcePruneClass.length}`);

  if (classified.looseResourceRecords.length > 0) {
    console.log("");
    console.log("Patchable loose resource classes:");
    printRecordSummaryByClass(classified.looseResourceRecords);
  }
}

async function analyzeSlot(slot, verbose = true) {
  const file = levelPath(slot);
  if (!fs.existsSync(file)) {
    throw new Error(`Level.sav is missing: ${file}`);
  }

  const decoded = await decodeLevelSav(file);
  const records = findActorRecords(decoded);
  const classified = classifyRecords(records);
  const levelStat = fs.statSync(file);

  if (verbose) {
    console.log("");
    console.log(`Analysis: ${slot}`);
    console.log(`  Level.sav: ${formatBytes(levelStat.size)} raw, ${formatBytes(decoded.length)} decoded`);
    console.log(`  Actor records: ${records.length}`);
    console.log(`  Zombie actor records/refs: ${classified.allZombieRecords.length}`);
    console.log(`  Patchable for legacy pickup fallback: ${classified.patchable.length}`);
    console.log(`  Already using legacy pickup fallback: ${classified.alreadyAntiradin.length}`);
    console.log(`  Patchable for prune preparation: ${classified.prunePatchable.length}`);
    console.log(`  Already using prune class: ${classified.alreadyPruneClass.length}`);
    if (classified.skippedLength.length > 0) {
      console.log(`  Skipped because of different class length: ${classified.skippedLength.length}`);
    }
    console.log(`  Loose pickup actor records: ${classified.loosePickupRecords.length}`);
    console.log(`  Patchable loose item actors: ${classified.looseItemPatchable.length}`);
    console.log(`  Storage-like pickup actors skipped: ${classified.storageLikeLoosePickups.length}`);
    console.log(`  Already using loose-item prune class: ${classified.alreadyLooseItemPruneClass.length}`);
    console.log(`  Loose resource actor records: ${classified.looseResourceRecords.length}`);
    console.log(`  Already using loose-resource prune class: ${classified.alreadyLooseResourcePruneClass.length}`);
  }

  return { decoded, records, classified, levelStat };
}

async function writeClassReplacement(slot, decoded, records, targetClass, backupReason) {
  const backup = makeBackup(slot, backupReason);
  const patched = Buffer.from(decoded);
  const targetClassForRecord = typeof targetClass === "function" ? targetClass : () => targetClass;

  for (const record of records) {
    const replacementClass = targetClassForRecord(record);
    const targetBytes = encodeShiftedString(replacementClass);
    const classLength = patched.readInt32LE(record.start);
    if (classLength !== targetBytes.length) {
      throw new Error(`Internal error: class length does not match for ${record.objectName}`);
    }
    const classStart = record.start + 4;
    targetBytes.copy(patched, classStart);
  }

  const encoded = await encodeLevelSav(patched);
  const roundTrip = await decodeLevelSavBuffer(encoded);
  if (!roundTrip.equals(patched)) {
    throw new Error("Internal validation failed: the repacked save does not decode back to the same bytes.");
  }

  fs.writeFileSync(levelPath(slot), encoded);
  const newStat = fs.statSync(levelPath(slot));
  return { backup, newStat };
}

async function patchSlot(slot, assumeYes = false) {
  assertSlotName(slot);
  if (gameIsRunning()) {
    throw new Error("The Parasites is still running. Please close the game completely before writing saves.");
  }

  const analysis = await analyzeSlot(slot, true);
  const { patchable, skippedLength } = analysis.classified;

  if (skippedLength.length > 0) {
    console.log("");
    console.log("Note: Some zombie actor records use a different class length. They will be skipped for safety:");
    for (const record of skippedLength.slice(0, 12)) {
      console.log(`  - ${record.objectName} :: ${record.classPath} (${record.classPath.length})`);
    }
    if (skippedLength.length > 12) console.log(`  ... ${skippedLength.length - 12} more`);
  }

  if (patchable.length === 0) {
    console.log("");
    console.log("No unpatched, compatible zombie records found for the legacy pickup fallback.");
    return;
  }

  console.log("");
  console.log("Records that will be replaced with the legacy pickup fallback:");
  for (const record of patchable.slice(0, 20)) {
    console.log(`  - ${record.objectName} :: ${record.classPath}`);
  }
  if (patchable.length > 20) console.log(`  ... ${patchable.length - 20} more`);

  if (!assumeYes) {
    const ok = await askYesNo(`Create a backup and redirect ${patchable.length} records to the legacy pickup fallback?`, false);
    if (!ok) {
      console.log("Cancelled.");
      return;
    }
  }

  const { backup, newStat } = await writeClassReplacement(slot, analysis.decoded, patchable, TARGET_CLASS, "before_legacy_pickup");
  console.log("");
  console.log("Done.");
  console.log(`  Backup: ${backup}`);
  console.log(`  Written: ${levelPath(slot)}`);
  console.log(`  New Level.sav size: ${formatBytes(newStat.size)}`);
}

async function preparePruneSlot(slot, assumeYes = false) {
  assertSlotName(slot);
  if (gameIsRunning()) {
    throw new Error("The Parasites is still running. Please close the game completely before writing saves.");
  }

  const analysis = await analyzeSlot(slot, true);
  const { prunePatchable, alreadyPruneClass } = analysis.classified;

  if (prunePatchable.length === 0) {
    console.log("");
    if (alreadyPruneClass.length > 0) {
      console.log("This slot is already prepared for the prune load/save pass.");
    } else {
      console.log("No compatible zombie DeathPose records found.");
    }
    return;
  }

  console.log("");
  console.log("Records that will be redirected to an invalid prune class:");
  for (const record of prunePatchable.slice(0, 20)) {
    console.log(`  - ${record.objectName} :: ${record.classPath}`);
  }
  if (prunePatchable.length > 20) console.log(`  ... ${prunePatchable.length - 20} more`);
  console.log("");
  console.log("After this step: load the slot in-game, save once normally, exit the game, then analyze again.");

  if (!assumeYes) {
    const ok = await askYesNo(`Create a backup and prepare ${prunePatchable.length} records for pruning?`, false);
    if (!ok) {
      console.log("Cancelled.");
      return;
    }
  }

  const { backup, newStat } = await writeClassReplacement(slot, analysis.decoded, prunePatchable, PRUNE_CLASS, "before_prune_prepare");
  console.log("");
  console.log("Done. The slot is prepared for the in-game prune pass.");
  console.log(`  Backup: ${backup}`);
  console.log(`  Written: ${levelPath(slot)}`);
  console.log(`  New Level.sav size: ${formatBytes(newStat.size)}`);
  console.log("");
  console.log("Now load it in-game, save normally, exit the game, then verify with --analyze.");
}

async function analyzeLooseItemsSlot(slot) {
  assertSlotName(slot);
  const analysis = await analyzeSlot(slot, true);
  printLooseItemDetails(analysis.classified);
}

async function prepareLooseItemPruneSlot(slot, assumeYes = false) {
  assertSlotName(slot);
  if (gameIsRunning()) {
    throw new Error("The Parasites is still running. Please close the game completely before writing saves.");
  }

  const analysis = await analyzeSlot(slot, true);
  const { looseItemPatchable, storageLikeLoosePickups, alreadyLooseItemPruneClass } = analysis.classified;

  if (looseItemPatchable.length === 0) {
    console.log("");
    if (alreadyLooseItemPruneClass.length > 0) {
      console.log("This slot is already prepared for the loose-item prune load/save pass.");
    } else {
      console.log("No patchable loose item pickup actors found.");
    }
    if (storageLikeLoosePickups.length > 0) {
      console.log(`Storage-like pickup actors were skipped for safety: ${storageLikeLoosePickups.length}`);
    }
    return;
  }

  console.log("");
  console.log("Loose item classes that will be redirected to invalid prune classes:");
  printRecordSummaryByClass(looseItemPatchable);
  if (storageLikeLoosePickups.length > 0) {
    console.log("");
    console.log(`Storage-like pickup actors skipped for safety: ${storageLikeLoosePickups.length}`);
    printRecordSummaryByClass(storageLikeLoosePickups, 12);
  }
  console.log("");
  console.log("Container and inventory arrays are not edited. Only loose pickup actor class paths are changed.");
  console.log("After this step: load the slot in-game, save once normally, exit the game, then analyze again.");

  if (!assumeYes) {
    const ok = await askYesNo(`Create a backup and prepare ${looseItemPatchable.length} loose item actors for pruning?`, false);
    if (!ok) {
      console.log("Cancelled.");
      return;
    }
  }

  const { backup, newStat } = await writeClassReplacement(
    slot,
    analysis.decoded,
    looseItemPatchable,
    (record) => makeInvalidLoosePickupClass(record.classPath.length),
    "before_loose_item_prune",
  );
  console.log("");
  console.log("Done. The slot is prepared for the loose-item in-game prune pass.");
  console.log(`  Backup: ${backup}`);
  console.log(`  Written: ${levelPath(slot)}`);
  console.log(`  New Level.sav size: ${formatBytes(newStat.size)}`);
  console.log("");
  console.log("Now load it in-game, save normally, exit the game, then verify with --analyze-loose-items.");
}

async function analyzeLooseResourcesSlot(slot) {
  assertSlotName(slot);
  const analysis = await analyzeSlot(slot, true);
  printLooseResourceDetails(analysis.classified);
}

async function prepareLooseResourcePruneSlot(slot, assumeYes = false) {
  assertSlotName(slot);
  if (gameIsRunning()) {
    throw new Error("The Parasites is still running. Please close the game completely before writing saves.");
  }

  const analysis = await analyzeSlot(slot, true);
  const { looseResourceRecords, alreadyLooseResourcePruneClass } = analysis.classified;

  if (looseResourceRecords.length === 0) {
    console.log("");
    if (alreadyLooseResourcePruneClass.length > 0) {
      console.log("This slot is already prepared for the loose-resource prune load/save pass.");
    } else {
      console.log("No patchable loose resource actors found.");
    }
    return;
  }

  console.log("");
  console.log("Loose resource classes that will be redirected to invalid prune classes:");
  printRecordSummaryByClass(looseResourceRecords);
  console.log("");
  console.log("Only allowlisted loose resource actor class paths are changed:");
  for (const classPath of LOOSE_RESOURCE_CLASSES) {
    console.log(`  - ${classPath}`);
  }
  console.log("Container, inventory, building, wall, fence, loot-container, and storage actors are not edited.");
  console.log("After this step: load the slot in-game, save once normally, exit the game, then analyze again.");

  if (!assumeYes) {
    const ok = await askYesNo(`Create a backup and prepare ${looseResourceRecords.length} loose resource actors for pruning?`, false);
    if (!ok) {
      console.log("Cancelled.");
      return;
    }
  }

  const { backup, newStat } = await writeClassReplacement(
    slot,
    analysis.decoded,
    looseResourceRecords,
    (record) => makeInvalidLooseResourceClass(record.classPath.length),
    "before_loose_resource_prune",
  );
  console.log("");
  console.log("Done. The slot is prepared for the loose-resource in-game prune pass.");
  console.log(`  Backup: ${backup}`);
  console.log(`  Written: ${levelPath(slot)}`);
  console.log(`  New Level.sav size: ${formatBytes(newStat.size)}`);
  console.log("");
  console.log("Now load it in-game, save normally, exit the game, then verify with --analyze-loose-resources.");
}

async function decodeLevelSavBuffer(data) {
  const temp = path.join(TOOL_DIR, `.roundtrip_${process.pid}_${Date.now()}.sav`);
  try {
    fs.writeFileSync(temp, data);
    return await decodeLevelSav(temp);
  } finally {
    try {
      fs.rmSync(temp, { force: true });
    } catch {
      // Best effort cleanup.
    }
  }
}

async function restoreBackup(backupNameOrPath = null, assumeYes = false) {
  if (gameIsRunning()) {
    throw new Error("The Parasites is still running. Please close the game completely before restoring a backup.");
  }

  let backup = null;
  if (backupNameOrPath) {
    backup = path.isAbsolute(backupNameOrPath) ? backupNameOrPath : path.join(BACKUP_ROOT, backupNameOrPath);
    if (!fs.existsSync(backup)) throw new Error(`Backup not found: ${backup}`);
  } else {
    const backups = listBackups();
    if (backups.length === 0) {
      console.log("No backups found in the tool folder.");
      return;
    }
    console.log("");
    console.log("Available backups:");
    backups.forEach((item, index) => {
      console.log(`  ${index + 1}. ${item.name}  (${item.mtime.toLocaleString()})`);
    });
    const answer = await ask(`Choose backup number or press Enter to cancel: `);
    if (!answer.trim()) return;
    const index = Number.parseInt(answer.trim(), 10) - 1;
    if (Number.isNaN(index) || index < 0 || index >= backups.length) {
      console.log("Invalid selection.");
      return;
    }
    backup = backups[index].full;
  }

  const base = path.basename(backup);
  const slot = base.match(/^(savegame_\d+)/)?.[1];
  if (!slot) throw new Error(`Cannot determine target slot from backup name: ${base}`);
  const dst = slotDir(slot);
  const level = path.join(backup, "Level.sav");
  if (!fs.existsSync(level)) throw new Error(`Backup does not contain Level.sav: ${backup}`);

  if (!assumeYes) {
    const ok = await askYesNo(`Restore backup "${base}" to ${slot}? The current slot will be backed up first.`, false);
    if (!ok) {
      console.log("Cancelled.");
      return;
    }
  }

  if (fs.existsSync(dst)) {
    const currentBackup = makeBackup(slot, "before_restore");
    console.log(`Current slot backed up first: ${currentBackup}`);
    fs.rmSync(dst, { recursive: true, force: true });
  }
  copyDir(backup, dst);
  console.log(`Backup restored: ${backup}`);
  console.log(`Target: ${dst}`);
}

let rl = null;

async function ask(question) {
  if (!rl) rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return rl.question(question);
}

async function askYesNo(question, defaultYes = false) {
  const suffix = defaultYes ? " [Y/n] " : " [y/N] ";
  const answer = (await ask(question + suffix)).trim().toLowerCase();
  if (!answer) return defaultYes;
  return answer === "j" || answer === "ja" || answer === "y" || answer === "yes";
}

async function chooseSlot() {
  const slots = listSlots();
  if (slots.length === 0) {
    console.log(`No savegame_* slots found under: ${SAVE_ROOT}`);
    return null;
  }
  console.log("");
  console.log("Savegames:");
  slots.forEach((item, index) => {
    console.log(`  ${index + 1}. ${item.slot}  ${formatBytes(item.size)}  ${item.mtime.toLocaleString()}`);
  });
  const answer = await ask("Choose savegame number or press Enter to cancel: ");
  if (!answer.trim()) return null;
  const index = Number.parseInt(answer.trim(), 10) - 1;
  if (Number.isNaN(index) || index < 0 || index >= slots.length) {
    console.log("Invalid selection.");
    return null;
  }
  return slots[index].slot;
}

async function printSlotList(analyze = false) {
  const slots = listSlots();
  if (slots.length === 0) {
    console.log(`No savegame_* slots found under: ${SAVE_ROOT}`);
    return;
  }
  console.log("");
  console.log(`Save-Root: ${SAVE_ROOT}`);
  for (const item of slots) {
    console.log(`- ${item.slot}: ${formatBytes(item.size)}, ${item.mtime.toLocaleString()}`);
    if (analyze) {
      await analyzeSlot(item.slot, true);
    }
  }
}

async function menu() {
  console.log("CorpseReaper - The Parasites Save Cleaner");
  console.log(`Tool: ${TOOL_DIR}`);
  console.log(`Save-Root: ${SAVE_ROOT}`);
  console.log("");

  if (gameIsRunning()) {
    console.log("WARNING: The Parasites appears to be running. Write/restore actions are blocked until the game is closed.");
    console.log("");
  }

  const restoreFirst = await askYesNo("Restore a backup first?", false);
  if (restoreFirst) await restoreBackup();

  for (;;) {
    console.log("");
    console.log("Menu");
    console.log("  1. Choose savegame and prepare zombie prune pass");
    console.log("  2. Choose savegame and prepare loose item prune pass");
    console.log("  3. Choose savegame and prepare loose resource prune pass");
    console.log("  4. Restore backup");
    console.log("  5. Analyze savegames only");
    console.log("  6. Analyze loose items in one savegame");
    console.log("  7. Analyze loose resources in one savegame");
    console.log("  8. Exit");
    const choice = (await ask("Selection: ")).trim();

    if (choice === "1") {
      const slot = await chooseSlot();
      if (slot) await preparePruneSlot(slot, false);
    } else if (choice === "2") {
      const slot = await chooseSlot();
      if (slot) await prepareLooseItemPruneSlot(slot, false);
    } else if (choice === "3") {
      const slot = await chooseSlot();
      if (slot) await prepareLooseResourcePruneSlot(slot, false);
    } else if (choice === "4") {
      await restoreBackup();
    } else if (choice === "5") {
      await printSlotList(true);
    } else if (choice === "6") {
      const slot = await chooseSlot();
      if (slot) await analyzeLooseItemsSlot(slot);
    } else if (choice === "7") {
      const slot = await chooseSlot();
      if (slot) await analyzeLooseResourcesSlot(slot);
    } else if (choice === "8" || choice === "") {
      break;
    } else {
      console.log("Invalid selection.");
    }
  }
}

async function main() {
  ensureDir(BACKUP_ROOT);
  const args = process.argv.slice(2);
  const yes = args.includes("--yes");

  if (args.includes("--help") || args.includes("-h")) {
    console.log("Usage:");
    console.log("  Start_CorpseReaper.cmd");
    console.log("  Start_CorpseReaper.cmd --list");
    console.log("  Start_CorpseReaper.cmd --analyze savegame_1");
    console.log("  Start_CorpseReaper.cmd --analyze-loose-items savegame_1");
    console.log("  Start_CorpseReaper.cmd --analyze-loose-resources savegame_1");
    console.log("  Start_CorpseReaper.cmd --prepare-prune savegame_1 --yes");
    console.log("  Start_CorpseReaper.cmd --prepare-loose-item-prune savegame_1 --yes");
    console.log("  Start_CorpseReaper.cmd --prepare-loose-resource-prune savegame_1 --yes");
    console.log("  Start_CorpseReaper.cmd --restore <backup-folder-name> --yes");
    console.log("");
    console.log("Optional: set TP_SAVE_ROOT if your saves are not in the default path.");
    return;
  }

  const listIndex = args.indexOf("--list");
  if (listIndex !== -1) {
    await printSlotList(false);
    return;
  }

  const analyzeIndex = args.indexOf("--analyze");
  if (analyzeIndex !== -1) {
    const slot = args[analyzeIndex + 1];
    if (!slot) throw new Error("--analyze needs a slot, e.g. savegame_1");
    await analyzeSlot(slot, true);
    return;
  }

  const looseAnalyzeIndex = args.indexOf("--analyze-loose-items");
  if (looseAnalyzeIndex !== -1) {
    const slot = args[looseAnalyzeIndex + 1];
    if (!slot) throw new Error("--analyze-loose-items needs a slot, e.g. savegame_1");
    await analyzeLooseItemsSlot(slot);
    return;
  }

  const pruneIndex = args.indexOf("--prepare-prune");
  if (pruneIndex !== -1) {
    const slot = args[pruneIndex + 1];
    if (!slot) throw new Error("--prepare-prune needs a slot, e.g. savegame_1");
    await preparePruneSlot(slot, yes);
    return;
  }

  const looseResourceAnalyzeIndex = args.indexOf("--analyze-loose-resources");
  if (looseResourceAnalyzeIndex !== -1) {
    const slot = args[looseResourceAnalyzeIndex + 1];
    if (!slot) throw new Error("--analyze-loose-resources needs a slot, e.g. savegame_1");
    await analyzeLooseResourcesSlot(slot);
    return;
  }

  const loosePruneIndex = args.indexOf("--prepare-loose-item-prune");
  if (loosePruneIndex !== -1) {
    const slot = args[loosePruneIndex + 1];
    if (!slot) throw new Error("--prepare-loose-item-prune needs a slot, e.g. savegame_1");
    await prepareLooseItemPruneSlot(slot, yes);
    return;
  }

  const looseResourcePruneIndex = args.indexOf("--prepare-loose-resource-prune");
  if (looseResourcePruneIndex !== -1) {
    const slot = args[looseResourcePruneIndex + 1];
    if (!slot) throw new Error("--prepare-loose-resource-prune needs a slot, e.g. savegame_1");
    await prepareLooseResourcePruneSlot(slot, yes);
    return;
  }

  const restoreIndex = args.indexOf("--restore");
  if (restoreIndex !== -1) {
    const backup = args[restoreIndex + 1];
    if (!backup) throw new Error("--restore needs a backup folder name");
    await restoreBackup(backup, yes);
    return;
  }

  await menu();
}

main()
  .catch((err) => {
    console.error("");
    console.error("ERROR:");
    console.error(err && err.stack ? err.stack : String(err));
    process.exitCode = 1;
  })
  .finally(() => {
    if (rl) rl.close();
  });
