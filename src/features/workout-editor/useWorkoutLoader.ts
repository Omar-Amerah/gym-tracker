import { useLocalSearchParams } from "expo-router";
import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { Alert } from "react-native";

import {
  getActiveDraftWorkout,
  getSavedWorkout,
  saveWorkout,
} from "@/db/workoutsRepository";
import { useRoutines } from "@/state/routines";

import type { ActiveWorkout, AutosaveStatus } from "./types";
import {
  buildEmptyWorkout,
  buildWorkout,
  buildWorkoutFromSaved,
  buildWorkoutPayload,
} from "./workoutUtils";

type UseWorkoutLoaderArgs = {
  markWorkoutAsSaved: (workout: ActiveWorkout) => void;
  setAutosaveStatus: Dispatch<SetStateAction<AutosaveStatus>>;
  setWorkout: Dispatch<SetStateAction<ActiveWorkout | null>>;
};

export function useWorkoutLoader({
  markWorkoutAsSaved,
  setAutosaveStatus,
  setWorkout,
}: UseWorkoutLoaderArgs) {
  const { routineId, workoutId } = useLocalSearchParams<{
    routineId?: string;
    workoutId?: string;
  }>();
  const { getRoutine, isLoading } = useRoutines();
  const [initialisedRoutineId, setInitialisedRoutineId] = useState<
    string | null
  >(null);
  const routeRoutineId = routineId ?? "";
  const routine = routineId ? getRoutine(routineId) : undefined;
  const editorKey = workoutId
    ? `workout-${workoutId}`
    : `draft-${routeRoutineId || "new"}`;

  useEffect(() => {
    if (workoutId) {
      if (initialisedRoutineId === `workout-${workoutId}`) return;

      let mounted = true;
      getSavedWorkout(workoutId)
        .then((savedWorkout) => {
          if (!mounted) return;
          if (!savedWorkout) {
            setInitialisedRoutineId(`missing-${workoutId}`);
            return;
          }
          const loadedWorkout = buildWorkoutFromSaved(savedWorkout);
          setWorkout(loadedWorkout);
          setInitialisedRoutineId(`workout-${workoutId}`);
          markWorkoutAsSaved(loadedWorkout);
        })
        .catch((error) => {
          console.error("Failed to load saved workout", error);
          if (mounted) {
            setInitialisedRoutineId(`missing-${workoutId}`);
            Alert.alert("Could not load workout", "Please try again.");
          }
        });

      return () => {
        mounted = false;
      };
    }

    if (!routeRoutineId) {
      if (initialisedRoutineId === "new") return;
      const draft = buildEmptyWorkout();
      let mounted = true;
      getActiveDraftWorkout()
        .then((activeDraft) =>
          activeDraft
            ? getSavedWorkout(activeDraft.id)
            : saveWorkout(buildWorkoutPayload(draft)).then((createdWorkoutId) =>
                getSavedWorkout(createdWorkoutId),
              ),
        )
        .then((savedDraft) => {
          if (!mounted) return;
          if (!savedDraft) {
            setAutosaveStatus("failed");
            return;
          }
          const persistedDraft = buildWorkoutFromSaved(savedDraft);
          setWorkout(persistedDraft);
          markWorkoutAsSaved(persistedDraft);
          setInitialisedRoutineId("new");
        })
        .catch((error) => {
          console.error("Failed to create workout draft", error);
          if (mounted) setAutosaveStatus("failed");
        });
      return () => {
        mounted = false;
      };
    }

    if (!routine || initialisedRoutineId === routine.id) return;
    let mounted = true;
    const draft = buildWorkout(routine);
    const initialPayload = buildWorkoutPayload(draft);
    getActiveDraftWorkout()
      .then((activeDraft) =>
        activeDraft
          ? getSavedWorkout(activeDraft.id)
          : saveWorkout(initialPayload).then((createdWorkoutId) =>
              getSavedWorkout(createdWorkoutId),
            ),
      )
      .then((savedDraft) => {
        if (!mounted) return;
        if (!savedDraft) {
          setAutosaveStatus("failed");
          return;
        }
        const persistedDraft = buildWorkoutFromSaved(savedDraft);
        setWorkout(persistedDraft);
        markWorkoutAsSaved(persistedDraft);
        setInitialisedRoutineId(routine.id);
      })
      .catch((error) => {
        console.error("Failed to create routine workout draft", error);
        if (mounted) setAutosaveStatus("failed");
      });
    return () => {
      mounted = false;
    };
  }, [
    initialisedRoutineId,
    markWorkoutAsSaved,
    routeRoutineId,
    routine,
    setAutosaveStatus,
    setWorkout,
    workoutId,
  ]);

  const isLoadingWorkout = useMemo(
    () =>
      isLoading ||
      (Boolean(workoutId) &&
        initialisedRoutineId !== `workout-${workoutId}` &&
        initialisedRoutineId !== `missing-${workoutId}`) ||
      (!workoutId && !routeRoutineId && initialisedRoutineId !== "new") ||
      (!workoutId &&
        Boolean(routeRoutineId) &&
        initialisedRoutineId !== routeRoutineId),
    [initialisedRoutineId, isLoading, routeRoutineId, workoutId],
  );

  return {
    editorKey,
    initialisedRoutineId,
    isLoadingWorkout,
    loadError: workoutId && initialisedRoutineId === `missing-${workoutId}`,
    routeRoutineId,
    workoutId,
  };
}
