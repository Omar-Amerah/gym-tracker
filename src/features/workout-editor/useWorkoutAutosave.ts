import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
} from "react";

import {
  updateWorkout,
  type WorkoutInput,
} from "@/db/workoutsRepository";

import type { ActiveWorkout, AutosaveStatus } from "./types";
import { buildWorkoutPayload } from "./workoutUtils";

type UseWorkoutAutosaveArgs = {
  isDeletingWorkoutRef: MutableRefObject<boolean>;
  isFinishingWorkoutRef: MutableRefObject<boolean>;
  workout: ActiveWorkout | null;
};

export function useWorkoutAutosave({
  isDeletingWorkoutRef,
  isFinishingWorkoutRef,
  workout,
}: UseWorkoutAutosaveArgs) {
  const [autosaveStatus, setAutosaveStatus] =
    useState<AutosaveStatus>("idle");
  const autosaveKeyRef = useRef("");
  const autosavePayloadKeyRef = useRef("");
  const autosavePayloadRef = useRef<WorkoutInput | null>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autosaveSavingRef = useRef(false);
  const autosaveWriteRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    if (!workout || !workout.id) return;
    if (isDeletingWorkoutRef.current) return;
    if (isFinishingWorkoutRef.current) return;

    const workoutIdToSave = workout.id;
    const payload = buildWorkoutPayload(workout);
    const payloadKey = JSON.stringify(payload);
    if (autosaveKeyRef.current === payloadKey) return;

    setAutosaveStatus("saving");
    const timer = setTimeout(() => {
      autosaveTimerRef.current = null;
      autosavePayloadRef.current = payload;
      autosavePayloadKeyRef.current = payloadKey;

      const flushAutosave = () => {
        if (autosaveSavingRef.current) return;
        const nextPayload = autosavePayloadRef.current;
        const nextKey = autosavePayloadKeyRef.current;
        if (!nextPayload || !nextKey || autosaveKeyRef.current === nextKey) {
          return;
        }

        autosaveSavingRef.current = true;
        const writePromise = updateWorkout(workoutIdToSave, nextPayload)
          .then(() => {
            autosaveKeyRef.current = nextKey;
            setAutosaveStatus("saved");
          })
          .catch((error) => {
            console.warn("Failed to autosave workout", error);
            setAutosaveStatus("failed");
          })
          .finally(() => {
            autosaveSavingRef.current = false;
            if (autosaveWriteRef.current === writePromise) {
              autosaveWriteRef.current = null;
            }
            if (
              !isFinishingWorkoutRef.current &&
              autosavePayloadKeyRef.current !== autosaveKeyRef.current
            ) {
              flushAutosave();
            }
          });
        autosaveWriteRef.current = writePromise;
        void writePromise;
      };

      flushAutosave();
    }, 450);
    autosaveTimerRef.current = timer;

    return () => {
      clearTimeout(timer);
      if (autosaveTimerRef.current === timer) {
        autosaveTimerRef.current = null;
      }
    };
  }, [isDeletingWorkoutRef, isFinishingWorkoutRef, workout]);

  const markWorkoutAsSaved = useCallback((candidate: ActiveWorkout) => {
    autosaveKeyRef.current = JSON.stringify(buildWorkoutPayload(candidate));
    setAutosaveStatus("saved");
  }, []);

  const markPayloadAsSaved = useCallback((payload: WorkoutInput) => {
    autosaveKeyRef.current = JSON.stringify(payload);
    setAutosaveStatus("saved");
  }, []);

  const cancelPendingAutosave = useCallback(() => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    autosavePayloadRef.current = null;
    autosavePayloadKeyRef.current = autosaveKeyRef.current;
  }, []);

  const waitForPendingAutosave = useCallback(async () => {
    await autosaveWriteRef.current;
  }, []);

  return {
    autosaveStatus,
    cancelPendingAutosave,
    markPayloadAsSaved,
    markWorkoutAsSaved,
    setAutosaveStatus,
    waitForPendingAutosave,
  };
}
