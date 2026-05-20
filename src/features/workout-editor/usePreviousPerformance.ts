import { useEffect, useRef, useState } from "react";

import {
  getLastExercisePerformance,
  type PreviousExercisePerformance,
} from "@/db/workoutsRepository";

import type { ActiveWorkout } from "./types";

export function usePreviousPerformance(workout: ActiveWorkout | null) {
  const previousLookupKeyRef = useRef("");
  const [previousPerformance, setPreviousPerformance] = useState<
    Record<string, PreviousExercisePerformance | undefined>
  >({});

  useEffect(() => {
    if (!workout || workout.exercises.length === 0) {
      setPreviousPerformance({});
      previousLookupKeyRef.current = "";
      return;
    }

    const lookupKey = [
      workout.id ?? "",
      workout.mode,
      ...workout.exercises.map(
        (exercise) =>
          `${exercise.id}:${exercise.exerciseId ?? ""}:${exercise.name}`,
      ),
    ].join("|");
    if (previousLookupKeyRef.current === lookupKey) return;
    previousLookupKeyRef.current = lookupKey;

    let mounted = true;
    const excludeWorkoutId = workout.id ?? null;

    Promise.all(
      workout.exercises.map(async (exercise) => {
        try {
          const performance = await getLastExercisePerformance({
            exerciseId: exercise.exerciseId,
            exerciseName: exercise.name,
            excludeWorkoutId,
          });
          return [exercise.id, performance ?? undefined] as const;
        } catch (error) {
          console.warn("Failed to load previous exercise performance", error);
          return [exercise.id, undefined] as const;
        }
      }),
    ).then((entries) => {
      if (!mounted) return;
      setPreviousPerformance(Object.fromEntries(entries));
    });

    return () => {
      mounted = false;
    };
  }, [workout]);

  return { previousPerformance };
}
