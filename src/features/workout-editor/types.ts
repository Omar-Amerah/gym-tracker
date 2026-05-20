import type { WorkoutStatus } from "@/db/workoutsRepository";

export type ActiveWorkoutSet = {
  distance: string;
  id: string;
  type: "warmup" | "normal" | "drop";
  kg: string;
  reps: string;
  minutes?: string;
  seconds?: string;
  time: string;
  notes: string;
};

export type ActiveWorkoutExercise = {
  exerciseId?: string | null;
  exerciseType: string;
  id: string;
  routineExerciseId: string;
  name: string;
  notes: string;
  isStarred: boolean;
  sets: ActiveWorkoutSet[];
  inputMode: "weightReps" | "time";
};

export type ActiveWorkout = {
  id?: string;
  mode: "new" | "fromRoutine" | "editSaved";
  routineId: string;
  name: string;
  bodyweightKg: string;
  date: string;
  startTime: string;
  endTime: string;
  notes: string;
  status: WorkoutStatus;
  exercises: ActiveWorkoutExercise[];
};

export type WorkoutField = keyof Pick<
  ActiveWorkout,
  "name" | "bodyweightKg" | "date" | "startTime" | "endTime" | "notes"
>;

export type SelectedSet = {
  exerciseId: string;
  setId: string;
} | null;

export type SetField = keyof Pick<
  ActiveWorkoutSet,
  "distance" | "kg" | "reps" | "minutes" | "seconds" | "notes"
>;

export type SetMetricField =
  | "distance"
  | "kg"
  | "reps"
  | "minutes"
  | "seconds"
  | "time";

export type SetFieldPlan = {
  field: SetMetricField;
  keyboardType: "default" | "decimal-pad" | "number-pad";
  label: string;
  width?: number;
};

export type AutosaveStatus = "idle" | "saving" | "saved" | "failed";

export type TimePickerTarget = "startTime" | "endTime" | null;
