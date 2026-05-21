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
  exerciseType?: string | null;
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
  // Abs / Core
  createSeedExercise(
    "ab-crunch-machine",
    "Ab Crunch Machine",
    "Abs",
    "Strength: Weight, Reps",
  ),
  createSeedExercise("cable-abs", "Cable Abs", "Abs", "Strength: Weight, Reps"),
  createSeedExercise(
    "cable-woodchops",
    "Cable Woodchops",
    "Abs",
    "Strength: Weight, Reps",
  ),
  createSeedExercise("crunches", "Crunches", "Abs", "Bodyweight: Reps"),
  createSeedExercise(
    "decline-sit-ups",
    "Decline Sit Ups",
    "Abs",
    "Bodyweight: Reps",
  ),
  createSeedExercise("leg-raises", "Leg Raises", "Abs", "Bodyweight: Reps"),
  createSeedExercise(
    "medball-rotations",
    "Medball Rotations",
    "Abs",
    "Strength: Weight, Reps",
  ),
  createSeedExercise(
    "pallof-press",
    "Pallof Press",
    "Abs",
    "Strength: Weight, Reps",
  ),
  createSeedExercise("plank", "Plank", "Abs", "Bodyweight: Time"),
  createSeedExercise(
    "weighted-russian-twist",
    "Weighted Russian Twist",
    "Abs",
    "Strength: Weight, Reps",
  ),

  // Back
  createSeedExercise(
    "assisted-pull-up",
    "Assisted Pull Up",
    "Back",
    "Strength: Weight, Reps",
  ),
  createSeedExercise(
    "barbell-row",
    "Barbell Row",
    "Back",
    "Strength: Weight, Reps",
  ),
  createSeedExercise(
    "cable-row",
    "Cable Row",
    "Back",
    "Strength: Weight, Reps",
  ),
  createSeedExercise(
    "diverging-lat-pulldown",
    "Diverging Lat Pulldown",
    "Back",
    "Strength: Weight, Reps",
  ),
  createSeedExercise(
    "lat-pulldown-machine",
    "Lat Pulldown Machine",
    "Back",
    "Strength: Weight, Reps",
  ),
  createSeedExercise("pull-up", "Pull Up", "Back", "Bodyweight: Reps"),
  createSeedExercise(
    "seated-row",
    "Seated Row",
    "Back",
    "Strength: Weight, Reps",
  ),
  createSeedExercise(
    "seated-row-individual",
    "Seated Row Individual",
    "Back",
    "Strength: Weight, Reps",
  ),
  createSeedExercise(
    "single-arm-dumbbell-row",
    "Single-Arm Dumbbell Row",
    "Back",
    "Strength: Weight, Reps",
  ),
  createSeedExercise(
    "t-bar-row",
    "T Bar Row",
    "Back",
    "Strength: Weight, Reps",
  ),

  // Biceps / Forearms
  createSeedExercise(
    "bicep-curl",
    "Bicep Curl",
    "Biceps",
    "Strength: Weight, Reps",
  ),
  createSeedExercise(
    "cable-bicep-curl",
    "Cable Bicep Curl",
    "Biceps",
    "Strength: Weight, Reps",
  ),
  createSeedExercise(
    "cable-reverse-bicep-curls",
    "Cable Reverse Bicep Curls",
    "Biceps",
    "Strength: Weight, Reps",
  ),
  createSeedExercise(
    "dumbbell-bicep-curl",
    "Dumbbell Bicep Curl",
    "Biceps",
    "Strength: Weight, Reps",
  ),
  createSeedExercise(
    "hammer-curl",
    "Hammer Curl",
    "Biceps",
    "Strength: Weight, Reps",
  ),
  createSeedExercise(
    "incline-dumbbell-curl",
    "Incline Dumbbell Curl",
    "Biceps",
    "Strength: Weight, Reps",
  ),
  createSeedExercise(
    "preacher-curl",
    "Preacher Curl",
    "Biceps",
    "Strength: Weight, Reps",
  ),
  createSeedExercise(
    "reverse-grip-ez-bar-curl",
    "Reverse Grip EZ Bar Curl",
    "Biceps",
    "Strength: Weight, Reps",
  ),
  createSeedExercise(
    "reverse-wrist-curls",
    "Reverse Wrist Curls",
    "Biceps",
    "Strength: Weight, Reps",
  ),
  createSeedExercise(
    "wrist-curls",
    "Wrist Curls",
    "Biceps",
    "Strength: Weight, Reps",
  ),

  // Cardio / Conditioning
  createSeedExercise("bike", "Bike", "Cardio", "Cardio: Time"),
  createSeedExercise(
    "rowing-machine",
    "Rowing Machine",
    "Cardio",
    "Cardio: Distance, Time",
  ),
  createSeedExercise(
    "treadmill-run",
    "Treadmill Run",
    "Cardio",
    "Cardio: Distance, Time",
  ),
  createSeedExercise("walking", "Walking", "Cardio", "Cardio: Distance, Time"),

  // Chest
  createSeedExercise(
    "bench-press",
    "Bench Press",
    "Chest",
    "Strength: Weight, Reps",
  ),
  createSeedExercise(
    "cable-chest-fly",
    "Cable Chest Fly",
    "Chest",
    "Strength: Weight, Reps",
  ),
  createSeedExercise(
    "chest-fly",
    "Chest Fly",
    "Chest",
    "Strength: Weight, Reps",
  ),
  createSeedExercise(
    "chest-press-machine",
    "Chest Press Machine",
    "Chest",
    "Strength: Weight, Reps",
  ),
  createSeedExercise(
    "decline-bench-press",
    "Decline Bench Press",
    "Chest",
    "Strength: Weight, Reps",
  ),
  createSeedExercise("dips", "Dips", "Chest", "Bodyweight: Reps"),
  createSeedExercise(
    "incline-dumbbell-press",
    "Incline Dumbbell Press",
    "Chest",
    "Strength: Weight, Reps",
  ),
  createSeedExercise("pec-fly", "Pec Fly", "Chest", "Strength: Weight, Reps"),
  createSeedExercise("push-up", "Push Up", "Chest", "Bodyweight: Reps"),
  createSeedExercise(
    "single-arm-landmine-punch-press",
    "Single-Arm Landmine Punch Press",
    "Chest",
    "Strength: Weight, Reps",
  ),

  // Legs
  createSeedExercise(
    "back-extension",
    "Back Extension",
    "Legs",
    "Bodyweight: Reps",
  ),
  createSeedExercise(
    "box-deadlift",
    "Box Deadlift",
    "Legs",
    "Strength: Weight, Reps",
  ),
  createSeedExercise("box-jumps", "Box Jumps", "Legs", "Bodyweight: Reps"),
  createSeedExercise(
    "bulgarian-split-squats",
    "Bulgarian Split Squats",
    "Legs",
    "Strength: Weight, Reps",
  ),
  createSeedExercise(
    "calf-raises",
    "Calf Raises",
    "Legs",
    "Strength: Weight, Reps",
  ),
  createSeedExercise("leg-curl", "Leg Curl", "Legs", "Strength: Weight, Reps"),
  createSeedExercise(
    "leg-extension",
    "Leg Extension",
    "Legs",
    "Strength: Weight, Reps",
  ),
  createSeedExercise(
    "leg-press",
    "Leg Press",
    "Legs",
    "Strength: Weight, Reps",
  ),
  createSeedExercise(
    "romanian-deadlift",
    "Romanian Deadlift",
    "Legs",
    "Strength: Weight, Reps",
  ),
  createSeedExercise(
    "romanian-deadlifts",
    "Romanian Deadlifts",
    "Legs",
    "Strength: Weight, Reps",
  ),
  createSeedExercise("squat", "Squat", "Legs", "Strength: Weight, Reps"),
  createSeedExercise(
    "standing-band-knee-drives",
    "Standing Band Knee Drives",
    "Legs",
    "Strength: Weight, Reps",
  ),

  // Shoulders
  createSeedExercise(
    "cable-delt-fly",
    "Cable Delt Fly",
    "Shoulders",
    "Strength: Weight, Reps",
  ),
  createSeedExercise(
    "cable-lateral-raise",
    "Cable Lateral Raise",
    "Shoulders",
    "Strength: Weight, Reps",
  ),
  createSeedExercise(
    "external-rotation",
    "External Rotation",
    "Shoulders",
    "Strength: Weight, Reps",
  ),
  createSeedExercise(
    "face-pulls",
    "Face Pulls",
    "Shoulders",
    "Strength: Weight, Reps",
  ),
  createSeedExercise(
    "front-raise",
    "Front Raise",
    "Shoulders",
    "Strength: Weight, Reps",
  ),
  createSeedExercise(
    "lateral-raise",
    "Lateral Raise",
    "Shoulders",
    "Strength: Weight, Reps",
  ),
  createSeedExercise(
    "military-press",
    "Military Press",
    "Shoulders",
    "Strength: Weight, Reps",
  ),
  createSeedExercise(
    "rear-delt-fly",
    "Rear Delt Fly",
    "Shoulders",
    "Strength: Weight, Reps",
  ),
  createSeedExercise(
    "shoulder-press",
    "Shoulder Press",
    "Shoulders",
    "Strength: Weight, Reps",
  ),

  // Triceps
  createSeedExercise(
    "cable-tricep-extension",
    "Cable Tricep Extension",
    "Triceps",
    "Strength: Weight, Reps",
  ),
  createSeedExercise(
    "overhead-triceps-extension",
    "Overhead Triceps Extension",
    "Triceps",
    "Strength: Weight, Reps",
  ),
  createSeedExercise(
    "skull-crushers",
    "Skull Crushers",
    "Triceps",
    "Strength: Weight, Reps",
  ),
  createSeedExercise(
    "tricep-pushdown",
    "Tricep Pushdown",
    "Triceps",
    "Strength: Weight, Reps",
  ),
];

export const DEFAULT_ROUTINES: {
  id: string;
  name: string;
  targetType: TargetType;
  notes: string;
  exercises: RoutineExerciseRecord[];
}[] = [];

export function createId(prefix: string) {
  const random = Math.random().toString(36).slice(2, 10);
  return `${slugify(prefix)}-${Date.now()}-${random}`;
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function nowIso() {
  return new Date().toISOString();
}

function createSeedExercise(
  id: string,
  name: string,
  category: string,
  exerciseType: string = "Strength: Weight, Reps",
): ExerciseRecord {
  const createdAt = "2026-05-18T00:00:00.000Z";

  return {
    id,
    name,
    category,
    exerciseType,
    singleArm: null,
    bodyweightMultiplier: 100,
    createdAt,
    updatedAt: createdAt,
  };
}
