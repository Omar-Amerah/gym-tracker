import { getDatabase, seedDefaultData } from "@/db/database";
import { parseCsvSection, rowsToCsv } from "@/utils/csv";

type BackupTable = {
  headers: string[];
  name: string;
  optional?: boolean;
  orderBy?: string;
};

const BACKUP_TABLES: BackupTable[] = [
  {
    name: "categories",
    headers: ["id", "name", "createdAt"],
    orderBy: "createdAt ASC",
  },
  {
    name: "exercises",
    headers: [
      "id",
      "name",
      "category",
      "exerciseType",
      "singleArm",
      "bodyweightMultiplier",
      "createdAt",
      "updatedAt",
    ],
    orderBy: "createdAt ASC",
  },
  {
    name: "routines",
    headers: [
      "id",
      "name",
      "targetType",
      "notes",
      "sortOrder",
      "createdAt",
      "updatedAt",
    ],
    orderBy: "sortOrder ASC, createdAt ASC",
  },
  {
    name: "routine_exercises",
    headers: [
      "id",
      "routineId",
      "exerciseId",
      "name",
      "notes",
      "warmUpSets",
      "workingSets",
      "sortOrder",
      "createdAt",
      "updatedAt",
    ],
    orderBy: "routineId ASC, sortOrder ASC, createdAt ASC",
  },
  {
    name: "workouts",
    headers: [
      "id",
      "routineId",
      "name",
      "bodyweightKg",
      "date",
      "startTime",
      "endTime",
      "durationMinutes",
      "notes",
      "status",
      "createdAt",
      "updatedAt",
    ],
    orderBy: "createdAt ASC",
  },
  {
    name: "workout_exercises",
    headers: [
      "id",
      "workoutId",
      "routineExerciseId",
      "exerciseId",
      "exerciseType",
      "name",
      "notes",
      "sortOrder",
      "isStarred",
      "createdAt",
      "updatedAt",
    ],
    orderBy: "workoutId ASC, sortOrder ASC, createdAt ASC",
  },
  {
    name: "workout_sets",
    headers: [
      "id",
      "workoutExerciseId",
      "setType",
      "setOrder",
      "distance",
      "kg",
      "reps",
      "minutes",
      "seconds",
      "notes",
      "createdAt",
      "updatedAt",
    ],
    orderBy: "workoutExerciseId ASC, setOrder ASC, createdAt ASC",
  },
  {
    name: "body_stats",
    headers: [],
    optional: true,
  },
];

const REQUIRED_TABLES = BACKUP_TABLES.filter((table) => !table.optional);
const CLEAR_ORDER = [
  "workout_sets",
  "workout_exercises",
  "workouts",
  "routine_exercises",
  "routines",
  "exercises",
  "categories",
];
const NULLABLE_IMPORT_COLUMNS: Record<string, string[]> = {
  exercises: ["exerciseType", "singleArm"],
  routines: ["notes"],
  routine_exercises: ["exerciseId", "notes"],
  workouts: [
    "routineId",
    "bodyweightKg",
    "startTime",
    "endTime",
    "durationMinutes",
    "notes",
  ],
  workout_exercises: [
    "routineExerciseId",
    "exerciseId",
    "exerciseType",
    "notes",
    "isStarred",
  ],
  workout_sets: [
    "distance",
    "kg",
    "reps",
    "minutes",
    "seconds",
    "notes",
  ],
};

export async function exportBackupToCsvText(): Promise<string> {
  const db = await getDatabase();
  const sections: string[] = ["# Gym Tracker CSV Backup"];

  for (const table of BACKUP_TABLES) {
    if (!(await tableExists(table.name))) {
      if (table.optional) continue;
      throw new Error(`Missing required table: ${table.name}`);
    }

    const headers = await getTableHeaders(table);
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT ${headers.join(", ")} FROM ${table.name} ORDER BY ${table.orderBy ?? "rowid ASC"}`,
    );
    sections.push(`# table: ${table.name}\n${rowsToCsv(headers, rows)}`);
  }

  return `${sections.join("\n\n")}\n`;
}

export async function importBackupFromCsvText(text: string): Promise<void> {
  const parsedBackup = parseBackupText(text);
  validateBackup(parsedBackup);

  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await clearAllLocalDataInOpenTransaction();

    for (const table of BACKUP_TABLES) {
      const section = parsedBackup[table.name];
      if (!section || section.rows.length === 0) continue;
      if (table.optional && !(await tableExists(table.name))) continue;

      const headers = table.headers.length > 0 ? table.headers : section.headers;
      const placeholders = headers.map(() => "?").join(", ");
      const columns = headers.join(", ");
      for (const row of section.rows) {
        await db.runAsync(
          `INSERT INTO ${table.name} (${columns}) VALUES (${placeholders})`,
          headers.map((header) =>
            normaliseImportedValue(table.name, header, row[header]),
          ),
        );
      }
    }
  });
}

export async function clearAllLocalData(): Promise<void> {
  const db = await getDatabase();
  await db.withTransactionAsync(clearAllLocalDataInOpenTransaction);
}

export async function resetSeedData(): Promise<void> {
  await clearAllLocalData();
  await seedDefaultData({ force: true });
}

export async function getDatabaseSummary(): Promise<Record<string, number>> {
  const db = await getDatabase();
  const summary: Record<string, number> = {};

  for (const table of BACKUP_TABLES) {
    if (!(await tableExists(table.name))) continue;
    const row = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) AS count FROM ${table.name}`,
    );
    summary[table.name] = row?.count ?? 0;
  }

  return summary;
}

async function clearAllLocalDataInOpenTransaction() {
  const db = await getDatabase();
  for (const tableName of CLEAR_ORDER) {
    await db.runAsync(`DELETE FROM ${tableName}`);
  }

  if (await tableExists("body_stats")) {
    await db.runAsync("DELETE FROM body_stats");
  }
}

async function tableExists(tableName: string) {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
    tableName,
  );
  return Boolean(row);
}

async function getTableHeaders(table: BackupTable) {
  if (table.headers.length > 0) return table.headers;

  const db = await getDatabase();
  const columns = await db.getAllAsync<{ name: string }>(
    `PRAGMA table_info(${table.name})`,
  );
  return columns.map((column) => column.name);
}

function parseBackupText(text: string) {
  const markers = [...text.matchAll(/^# table: ([a-z_]+)\s*$/gm)];
  const sections: Record<
    string,
    { headers: string[]; rows: Record<string, string>[] }
  > = {};

  for (const [index, marker] of markers.entries()) {
    const tableName = marker[1];
    const sectionStart = marker.index + marker[0].length;
    const nextMarker = markers[index + 1];
    const sectionEnd = nextMarker ? nextMarker.index : text.length;
    sections[tableName] = parseCsvSection(text.slice(sectionStart, sectionEnd));
  }

  return sections;
}

function validateBackup(
  sections: Record<string, { headers: string[]; rows: Record<string, string>[] }>,
) {
  for (const table of REQUIRED_TABLES) {
    const section = sections[table.name];
    if (!section) {
      throw new Error(`Backup is missing ${table.name}.`);
    }

    const missingHeaders = table.headers.filter(
      (header) => !section.headers.includes(header),
    );
    if (missingHeaders.length > 0) {
      throw new Error(
        `${table.name} is missing columns: ${missingHeaders.join(", ")}.`,
      );
    }
  }
}

function normaliseImportedValue(
  tableName: string,
  header: string,
  value: string | undefined,
) {
  if (value === undefined) return null;
  if (
    value === "" &&
    (NULLABLE_IMPORT_COLUMNS[tableName] ?? []).includes(header)
  ) {
    return null;
  }
  return value;
}
