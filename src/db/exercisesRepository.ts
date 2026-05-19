import { getDatabase } from "@/db/database";
import { CategoryRecord, createId, ExerciseRecord, nowIso, slugify } from "@/db/schema";

export type ExerciseInput = {
  bodyweightMultiplier?: number;
  category: string;
  exerciseType?: string | null;
  id?: string;
  name: string;
  singleArm?: string | null;
};

export async function listCategories(): Promise<CategoryRecord[]> {
  const db = await getDatabase();
  return db.getAllAsync<CategoryRecord>(
    "SELECT id, name, createdAt FROM categories ORDER BY name COLLATE NOCASE ASC",
  );
}

export async function createCategory(name: string) {
  const db = await getDatabase();
  const trimmed = name.trim();
  if (!trimmed) return;

  await db.runAsync(
    "INSERT OR IGNORE INTO categories (id, name, createdAt) VALUES (?, ?, ?)",
    slugify(trimmed),
    trimmed,
    nowIso(),
  );
}

export async function deleteCategory(name: string) {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync("DELETE FROM exercises WHERE category = ?", name);
    await db.runAsync("DELETE FROM categories WHERE name = ?", name);
  });
}

export async function listExercises(searchQuery = ""): Promise<ExerciseRecord[]> {
  const db = await getDatabase();
  const query = searchQuery.trim();
  if (!query) {
    return db.getAllAsync<ExerciseRecord>(
      `SELECT id, name, category, exerciseType, singleArm, bodyweightMultiplier, createdAt, updatedAt
       FROM exercises
       ORDER BY name COLLATE NOCASE ASC`,
    );
  }

  return db.getAllAsync<ExerciseRecord>(
    `SELECT id, name, category, exerciseType, singleArm, bodyweightMultiplier, createdAt, updatedAt
     FROM exercises
     WHERE name LIKE ?
     ORDER BY name COLLATE NOCASE ASC`,
    `%${query}%`,
  );
}

export async function listExercisesByCategory(category: string, searchQuery = ""): Promise<ExerciseRecord[]> {
  const db = await getDatabase();
  const query = searchQuery.trim();
  if (!query) {
    return db.getAllAsync<ExerciseRecord>(
      `SELECT id, name, category, exerciseType, singleArm, bodyweightMultiplier, createdAt, updatedAt
       FROM exercises
       WHERE category = ?
       ORDER BY name COLLATE NOCASE ASC`,
      category,
    );
  }

  return db.getAllAsync<ExerciseRecord>(
    `SELECT id, name, category, exerciseType, singleArm, bodyweightMultiplier, createdAt, updatedAt
     FROM exercises
     WHERE category = ? AND name LIKE ?
     ORDER BY name COLLATE NOCASE ASC`,
    category,
    `%${query}%`,
  );
}

export async function getExercise(id: string) {
  const db = await getDatabase();
  return db.getFirstAsync<ExerciseRecord>(
    `SELECT id, name, category, exerciseType, singleArm, bodyweightMultiplier, createdAt, updatedAt
     FROM exercises
     WHERE id = ?`,
    id,
  );
}

export async function upsertExercise(input: ExerciseInput) {
  const db = await getDatabase();
  const timestamp = nowIso();
  const id = input.id ?? createId(input.name);

  await createCategory(input.category);
  await db.runAsync(
    `INSERT INTO exercises
      (id, name, category, exerciseType, singleArm, bodyweightMultiplier, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        category = excluded.category,
        exerciseType = excluded.exerciseType,
        singleArm = excluded.singleArm,
        bodyweightMultiplier = excluded.bodyweightMultiplier,
        updatedAt = excluded.updatedAt`,
    id,
    input.name.trim(),
    input.category,
    input.exerciseType ?? null,
    input.singleArm ?? null,
    input.bodyweightMultiplier ?? 100,
    timestamp,
    timestamp,
  );

  return id;
}

export async function deleteExercise(id: string) {
  const db = await getDatabase();
  await db.runAsync("DELETE FROM exercises WHERE id = ?", id);
}
