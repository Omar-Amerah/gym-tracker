import type { ExerciseRecord } from "@/db/schema";

type ReplacementHandler = (exercise: ExerciseRecord) => void;

const replacementHandlers = new Map<string, ReplacementHandler>();

export function registerActiveWorkoutReplacementHandler(
  routineId: string,
  handler: ReplacementHandler,
) {
  replacementHandlers.set(routineId, handler);

  return () => {
    if (replacementHandlers.get(routineId) === handler) {
      replacementHandlers.delete(routineId);
    }
  };
}

export function replaceActiveWorkoutExercise(
  routineId: string,
  exercise: ExerciseRecord,
) {
  const handler = replacementHandlers.get(routineId);
  if (!handler) return false;

  handler(exercise);
  return true;
}
