import { File } from 'expo-file-system';
import { looksLikeFitNotesCsv, parseFitNotesBackup, parseFitNotesCsv } from './fitnotes';
import { looksLikeGymManeBackup, parseGymManeBackup } from './gymmane';
import { bytesToText, isSqlite, isZip, unzipEntries } from './helpers';
import { ImportBundle, ImportPreview, ImportSource, SOURCE_LABELS } from './types';

export * from './types';
export { commitImport } from './commit';

/**
 * Reads a picked file and turns it into an ImportBundle, detecting the format
 * from the bytes (not the extension, since Android pickers often drop it).
 */
export async function parseImportFile(uri: string, expected?: ImportSource): Promise<ImportBundle> {
  const bytes = await new File(uri).bytes();
  const bundle = await parseBytes(bytes);
  if (expected && bundle.source !== expected) {
    throw new Error(
      `That looks like a ${SOURCE_LABELS[bundle.source]} file, not ${SOURCE_LABELS[expected]}. Pick it from the ${SOURCE_LABELS[bundle.source]} card instead.`
    );
  }
  return bundle;
}

async function parseBytes(bytes: Uint8Array): Promise<ImportBundle> {
  if (isSqlite(bytes)) return parseFitNotesBackup(bytes);

  if (isZip(bytes)) {
    const jsons = unzipEntries(bytes, (n) => n.toLowerCase().endsWith('.json'));
    const preferred = jsons.find((e) => e.name.split('/').pop() === 'gymmane.json') ?? jsons[0];
    if (preferred) return parseText(bytesToText(preferred.data));

    const inner = unzipEntries(bytes, (n) => /\.(fitnotes|db|sqlite|csv)$/i.test(n));
    for (const e of inner) {
      if (isSqlite(e.data)) return parseFitNotesBackup(e.data);
      if (e.name.toLowerCase().endsWith('.csv')) return parseText(bytesToText(e.data));
    }
    throw new Error('No GymMane or FitNotes data found inside this zip.');
  }

  return parseText(bytesToText(bytes));
}

function parseText(text: string): ImportBundle {
  const trimmed = text.trim();
  if (trimmed.startsWith('{')) {
    let data: unknown;
    try {
      data = JSON.parse(trimmed);
    } catch {
      throw new Error('The file looks like JSON but could not be read. Is it complete?');
    }
    if (looksLikeGymManeBackup(data)) return parseGymManeBackup(data);
    throw new Error('This JSON is not a GymMane backup. For FitRack backups use "Full JSON Backup & Restore".');
  }
  if (looksLikeFitNotesCsv(trimmed)) return parseFitNotesCsv(trimmed);
  throw new Error('Unrecognised file. Pick a FitNotes backup (.fitnotes) / CSV export, or a GymMane backup (.zip / .json).');
}

export function previewBundle(bundle: ImportBundle): ImportPreview {
  const dates = [
    ...bundle.sessions.map((s) => s.date),
    ...bundle.bodyStats.map((s) => s.date),
    ...bundle.macros.map((s) => s.date),
  ].sort();
  const exerciseNames = new Set<string>();
  let sets = 0;
  for (const s of bundle.sessions) {
    for (const e of s.exercises) {
      exerciseNames.add(e.name.toLowerCase());
      sets += e.sets.length;
    }
  }
  return {
    sourceLabel: SOURCE_LABELS[bundle.source],
    sessions: bundle.sessions.length,
    sets,
    exercises: exerciseNames.size,
    bodyStats: bundle.bodyStats.length,
    macroDays: bundle.macros.length,
    hydrationDays: bundle.hydration.length,
    firstDate: dates[0] ?? null,
    lastDate: dates[dates.length - 1] ?? null,
    warnings: bundle.warnings,
  };
}
