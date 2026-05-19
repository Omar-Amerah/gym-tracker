import type { ExerciseRecord } from "@/db/schema";

type ReplacementHandler = (exercise: ExerciseRecord) => void;

type AddExerciseHandler = (exercise: ExerciseRecord) => void;

const addExerciseHandlers = new Map<string, AddExerciseHandler>();
const replacementHandlers = new Map<string, ReplacementHandler>();

export function registerActiveWorkoutAddExerciseHandler(
  editorKey: string,
  handler: AddExerciseHandler,
) {
  addExerciseHandlers.set(editorKey, handler);

  return () => {
    if (addExerciseHandlers.get(editorKey) === handler) {
      addExerciseHandlers.delete(editorKey);
    }
  };
}

export function registerActiveWorkoutReplacementHandler(
  editorKey: string,
  handler: ReplacementHandler,
) {
  replacementHandlers.set(editorKey, handler);

  return () => {
    if (replacementHandlers.get(editorKey) === handler) {
      replacementHandlers.delete(editorKey);
    }
  };
}

export function addActiveWorkoutExercise(
  editorKey: string,
  exercise: ExerciseRecord,
) {
  const handler = addExerciseHandlers.get(editorKey);
  if (!handler) return false;

  handler(exercise);
  return true;
}

export function replaceActiveWorkoutExercise(
  editorKey: string,
  exercise: ExerciseRecord,
) {
  const handler = replacementHandlers.get(editorKey);
  if (!handler) return false;

  handler(exercise);
  return true;
}
