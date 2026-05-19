import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { createId } from "@/db/schema";
import {
  addRoutineExerciseRecord,
  createRoutineRecord,
  deleteRoutineRecord,
  duplicateRoutineRecord,
  listRoutines,
  removeRoutineExerciseRecord,
  updateRoutineExerciseRecord,
  updateRoutineExerciseSortOrder,
  updateRoutineRecord,
  updateRoutineSortOrder,
} from "@/db/routinesRepository";

export type TargetType = "Latest" | "Routine";

export type RoutineExercise = {
  exerciseId?: string | null;
  id: string;
  name: string;
  notes: string;
  warmUpSets: number;
  workingSets: number;
};

export type Routine = {
  id: string;
  name: string;
  targetType: TargetType;
  notes: string;
  exercises: RoutineExercise[];
};

type RoutinesContextValue = {
  activeRoutineId: string | null;
  addExercise: (routineId: string, name: string, exerciseId?: string | null) => void;
  createRoutine: () => string;
  deleteRoutine: (id: string) => void;
  duplicateRoutine: (id: string) => string | null;
  getRoutine: (id: string) => Routine | undefined;
  isLoading: boolean;
  moveExercise: (routineId: string, exerciseId: string, direction: "up" | "down") => void;
  moveExerciseToIndex: (routineId: string, exerciseId: string, targetIndex: number) => void;
  moveRoutine: (id: string, direction: "up" | "down") => void;
  moveRoutineToIndex: (id: string, targetIndex: number) => void;
  removeExercise: (routineId: string, exerciseId: string) => void;
  refreshRoutines: () => Promise<void>;
  reorderRoutines: () => void;
  routines: Routine[];
  setActiveRoutineId: (id: string | null) => void;
  updateExercise: (
    routineId: string,
    exerciseId: string,
    patch: Partial<Pick<RoutineExercise, "notes" | "warmUpSets" | "workingSets">>,
  ) => void;
  updateRoutine: (id: string, patch: Partial<Pick<Routine, "name" | "notes" | "targetType">>) => void;
};

const RoutinesContext = createContext<RoutinesContextValue | null>(null);

function reportPersistenceError(error: unknown) {
  console.error("Routine persistence failed", error);
}

export function RoutinesProvider({ children }: { children: ReactNode }) {
  const [activeRoutineId, setActiveRoutineId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [routines, setRoutines] = useState<Routine[]>([]);

  const refreshRoutines = useCallback(async () => {
    const storedRoutines = await listRoutines();
    setRoutines(storedRoutines);
  }, []);

  useEffect(() => {
    let mounted = true;

    listRoutines()
      .then((storedRoutines) => {
        if (mounted) setRoutines(storedRoutines);
      })
      .catch(reportPersistenceError)
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const value = useMemo<RoutinesContextValue>(
    () => ({
      activeRoutineId,
      isLoading,
      routines,
      refreshRoutines,
      setActiveRoutineId,
      getRoutine: (id) => routines.find((routine) => routine.id === id),
      createRoutine: () => {
        const id = createId("routine");
        const routine: Routine = {
          id,
          name: "New Routine",
          targetType: "Routine",
          notes: "",
          exercises: [],
        };

        setRoutines((current) => {
          void createRoutineRecord(id, current.length).catch(reportPersistenceError);
          return [...current, routine];
        });

        return id;
      },
      deleteRoutine: (id) => {
        setRoutines((current) => current.filter((routine) => routine.id !== id));
        void deleteRoutineRecord(id).catch(reportPersistenceError);
      },
      duplicateRoutine: (id) => {
        const routine = routines.find((item) => item.id === id);
        if (!routine) return null;

        const copyId = createId(`${routine.id}-copy`);
        const copy: Routine = {
          ...routine,
          id: copyId,
          name: `${routine.name} Copy`,
          exercises: routine.exercises.map((exercise) => ({
            ...exercise,
            id: createId(exercise.name),
          })),
        };

        setRoutines((current) => [...current, copy]);
        void duplicateRoutineRecord(copy, copyId, routines.length).catch(reportPersistenceError);
        return copyId;
      },
      moveRoutine: (id, direction) => {
        const index = routines.findIndex((routine) => routine.id === id);
        const nextIndex = direction === "up" ? index - 1 : index + 1;
        if (index < 0 || nextIndex < 0 || nextIndex >= routines.length) return;

        value.moveRoutineToIndex(id, nextIndex);
      },
      moveRoutineToIndex: (id, targetIndex) => {
        setRoutines((current) => {
          const index = current.findIndex((routine) => routine.id === id);
          if (index < 0) return current;

          const next = [...current];
          const [routine] = next.splice(index, 1);
          const boundedIndex = Math.max(0, Math.min(targetIndex, next.length));
          next.splice(boundedIndex, 0, routine);
          void updateRoutineSortOrder(next.map((item) => item.id)).catch(reportPersistenceError);
          return next;
        });
      },
      reorderRoutines: () => {
        setRoutines((current) => {
          const next = [...current].reverse();
          void updateRoutineSortOrder(next.map((item) => item.id)).catch(reportPersistenceError);
          return next;
        });
      },
      updateRoutine: (id, patch) => {
        setRoutines((current) =>
          current.map((routine) => (routine.id === id ? { ...routine, ...patch } : routine)),
        );
        void updateRoutineRecord(id, patch).catch(reportPersistenceError);
      },
      addExercise: (routineId, name, exerciseId = null) => {
        const routineExerciseId = createId(name);
        const exercise: RoutineExercise = {
          id: routineExerciseId,
          exerciseId,
          name,
          notes: "",
          warmUpSets: 0,
          workingSets: 3,
        };

        setRoutines((current) =>
          current.map((routine) => {
            if (routine.id !== routineId) return routine;
            void addRoutineExerciseRecord({
              exerciseId,
              id: routineExerciseId,
              name,
              routineId,
              sortOrder: routine.exercises.length,
            }).catch(reportPersistenceError);
            return { ...routine, exercises: [...routine.exercises, exercise] };
          }),
        );
      },
      removeExercise: (routineId, exerciseId) => {
        setRoutines((current) =>
          current.map((routine) =>
            routine.id === routineId
              ? {
                  ...routine,
                  exercises: routine.exercises.filter((exercise) => exercise.id !== exerciseId),
                }
              : routine,
          ),
        );
        void removeRoutineExerciseRecord(exerciseId).catch(reportPersistenceError);
      },
      moveExercise: (routineId, exerciseId, direction) => {
        const routine = routines.find((item) => item.id === routineId);
        if (!routine) return;
        const index = routine.exercises.findIndex((exercise) => exercise.id === exerciseId);
        const nextIndex = direction === "up" ? index - 1 : index + 1;
        if (index < 0 || nextIndex < 0 || nextIndex >= routine.exercises.length) return;

        value.moveExerciseToIndex(routineId, exerciseId, nextIndex);
      },
      moveExerciseToIndex: (routineId, exerciseId, targetIndex) => {
        setRoutines((current) =>
          current.map((routine) => {
            if (routine.id !== routineId) return routine;

            const index = routine.exercises.findIndex((exercise) => exercise.id === exerciseId);
            if (index < 0) return routine;

            const exercises = [...routine.exercises];
            const [exercise] = exercises.splice(index, 1);
            const boundedIndex = Math.max(0, Math.min(targetIndex, exercises.length));
            exercises.splice(boundedIndex, 0, exercise);
            void updateRoutineExerciseSortOrder(exercises.map((item) => item.id)).catch(reportPersistenceError);
            return { ...routine, exercises };
          }),
        );
      },
      updateExercise: (routineId, exerciseId, patch) => {
        setRoutines((current) =>
          current.map((routine) =>
            routine.id === routineId
              ? {
                  ...routine,
                  exercises: routine.exercises.map((exercise) =>
                    exercise.id === exerciseId ? { ...exercise, ...patch } : exercise,
                  ),
                }
              : routine,
          ),
        );
        void updateRoutineExerciseRecord(exerciseId, patch).catch(reportPersistenceError);
      },
    }),
    [activeRoutineId, isLoading, refreshRoutines, routines],
  );

  return <RoutinesContext.Provider value={value}>{children}</RoutinesContext.Provider>;
}

export function useRoutines() {
  const value = useContext(RoutinesContext);
  if (!value) {
    throw new Error("useRoutines must be used within RoutinesProvider");
  }
  return value;
}
