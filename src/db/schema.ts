type TargetType = "Latest" | "Routine";
export type CategoryRecord = {
  id: string;
  name: string;
  createdAt: string;
};

export type ExerciseRecord = {
  id: string;
  name: string;
  category: string;
  exerciseType: string | null;
  singleArm: string | null;
  bodyweightMultiplier: number;
  createdAt: string;
  updatedAt: string;
};

export type RoutineRecord = {
  id: string;
  name: string;
  targetType: TargetType;
  notes: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type RoutineExerciseRecord = {
  id: string;
  routineId: string;
  exerciseId: string | null;
  name: string;
  notes: string | null;
  warmUpSets: number;
  workingSets: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export const DEFAULT_CATEGORIES = [
  "Abs",
  "Back",
  "Biceps",
  "Cardio",
  "Chest",
  "Legs",
  "Shoulders",
  "Triceps",
] as const;

export const DEFAULT_EXERCISES: ExerciseRecord[] = [
  createSeedExercise("cable-woodchops", "Cable Woodchops", "Abs"),
  createSeedExercise("crunches", "Crunches", "Abs"),
  createSeedExercise("leg-raises", "Leg Raises", "Abs"),
  createSeedExercise("medball-rotations", "Medball Rotations", "Abs"),
  createSeedExercise("pallof-press", "Pallof Press", "Abs"),
  createSeedExercise("plank", "Plank", "Abs"),
  createSeedExercise("pull-up", "Pull Up", "Back"),
  createSeedExercise("barbell-row", "Barbell Row", "Back"),
  createSeedExercise("diverging-lat-pulldown", "Diverging Lat Pulldown", "Back"),
  createSeedExercise("bicep-curl", "Bicep Curl", "Biceps"),
  createSeedExercise("bench-press", "Bench Press", "Chest"),
  createSeedExercise("pec-fly", "Pec Fly", "Chest"),
  createSeedExercise("face-pulls", "Face Pulls", "Shoulders"),
  createSeedExercise("military-press", "Military Press", "Shoulders"),
  createSeedExercise("incline-dumbbell-press", "Incline Dumbbell Press", "Chest"),
  createSeedExercise("squat", "Squat", "Legs"),
  createSeedExercise("romanian-deadlifts", "Romanian Deadlifts", "Legs"),
  createSeedExercise("romanian-deadlift", "Romanian Deadlift", "Legs"),
  createSeedExercise(
    "single-arm-landmine-punch-press",
    "Single-Arm Landmine Punch Press",
    "Chest",
  ),
];

export const DEFAULT_ROUTINES = [
  {
    id: "upper-body",
    name: "Upper body",
    targetType: "Routine" as TargetType,
    notes: "",
    exercises: [
      createSeedRoutineExercise("upper-body-bench-press", "upper-body", "bench-press", "Bench Press", 0, 2, 3),
      createSeedRoutineExercise(
        "upper-body-single-arm-landmine-punch-press",
        "upper-body",
        "single-arm-landmine-punch-press",
        "Single-Arm Landmine Punch Press",
        1,
        1,
        3,
      ),
      createSeedRoutineExercise("upper-body-barbell-row", "upper-body", "barbell-row", "Barbell Row", 2, 1, 3),
      createSeedRoutineExercise("upper-body-military-press", "upper-body", "military-press", "Military Press", 3, 1, 3),
      createSeedRoutineExercise(
        "upper-body-incline-dumbbell-press",
        "upper-body",
        "incline-dumbbell-press",
        "Incline Dumbbell Press",
        4,
        0,
        3,
      ),
      createSeedRoutineExercise(
        "upper-body-diverging-lat-pulldown",
        "upper-body",
        "diverging-lat-pulldown",
        "Diverging Lat Pulldown",
        5,
        0,
        3,
      ),
      createSeedRoutineExercise("upper-body-pec-fly", "upper-body", "pec-fly", "Pec Fly", 6, 0, 3),
      createSeedRoutineExercise("upper-body-face-pulls", "upper-body", "face-pulls", "Face Pulls", 7, 0, 3),
    ],
  },
  {
    id: "lower-body",
    name: "Lower Body",
    targetType: "Routine" as TargetType,
    notes: "",
    exercises: [
      createSeedRoutineExercise("lower-body-squat", "lower-body", "squat", "Squat", 0, 2, 3),
      createSeedRoutineExercise(
        "lower-body-romanian-deadlifts",
        "lower-body",
        "romanian-deadlifts",
        "Romanian Deadlifts",
        1,
        1,
        3,
      ),
    ],
  },
  {
    id: "functional-fencing-day",
    name: "Functional/Fencing Day",
    targetType: "Routine" as TargetType,
    notes: "",
    exercises: [
      createSeedRoutineExercise(
        "functional-fencing-day-medball-rotations",
        "functional-fencing-day",
        "medball-rotations",
        "Medball Rotations",
        0,
        0,
        3,
      ),
      createSeedRoutineExercise("functional-fencing-day-plank", "functional-fencing-day", "plank", "Plank", 1, 0, 3),
      createSeedRoutineExercise(
        "functional-fencing-day-pallof-press",
        "functional-fencing-day",
        "pallof-press",
        "Pallof Press",
        2,
        0,
        3,
      ),
    ],
  },
];

export function createId(prefix: string) {
  const random = Math.random().toString(36).slice(2, 10);
  return `${slugify(prefix)}-${Date.now()}-${random}`;
}

export function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function nowIso() {
  return new Date().toISOString();
}

function createSeedExercise(id: string, name: string, category: string): ExerciseRecord {
  const createdAt = "2026-05-18T00:00:00.000Z";
  return {
    id,
    name,
    category,
    exerciseType: "Strength: Weight, Reps",
    singleArm: "Default (Yes)",
    bodyweightMultiplier: 100,
    createdAt,
    updatedAt: createdAt,
  };
}

function createSeedRoutineExercise(
  id: string,
  routineId: string,
  exerciseId: string | null,
  name: string,
  sortOrder: number,
  warmUpSets: number,
  workingSets: number,
): RoutineExerciseRecord {
  const createdAt = "2026-05-18T00:00:00.000Z";
  return {
    id,
    routineId,
    exerciseId,
    name,
    notes: "",
    warmUpSets,
    workingSets,
    sortOrder,
    createdAt,
    updatedAt: createdAt,
  };
}
