import { createContext, ReactNode, useContext, useMemo, useState } from 'react';

export type TargetType = 'Latest' | 'Routine';

export type RoutineExercise = {
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
  createRoutine: () => string;
  deleteRoutine: (id: string) => void;
  duplicateRoutine: (id: string) => string | null;
  getRoutine: (id: string) => Routine | undefined;
  moveRoutine: (id: string, direction: 'up' | 'down') => void;
  reorderRoutines: () => void;
  routines: Routine[];
  setActiveRoutineId: (id: string | null) => void;
  updateRoutine: (id: string, patch: Partial<Pick<Routine, 'name' | 'notes' | 'targetType'>>) => void;
  addExercise: (routineId: string, name: string) => void;
  removeExercise: (routineId: string, exerciseId: string) => void;
  moveExercise: (routineId: string, exerciseId: string, direction: 'up' | 'down') => void;
  updateExercise: (
    routineId: string,
    exerciseId: string,
    patch: Partial<Pick<RoutineExercise, 'notes' | 'warmUpSets' | 'workingSets'>>,
  ) => void;
};

const initialRoutines: Routine[] = [
  {
    id: 'upper-body',
    name: 'Upper body',
    targetType: 'Routine',
    notes: '',
    exercises: [
      { id: 'bench-press', name: 'Bench Press', notes: '', warmUpSets: 2, workingSets: 3 },
      {
        id: 'single-arm-landmine-punch-press',
        name: 'Single-Arm Landmine Punch Press',
        notes: '',
        warmUpSets: 1,
        workingSets: 3,
      },
      { id: 'barbell-row', name: 'Barbell Row', notes: '', warmUpSets: 1, workingSets: 3 },
      { id: 'military-press', name: 'Military Press', notes: '', warmUpSets: 1, workingSets: 3 },
      { id: 'incline-dumbbell-press', name: 'Incline Dumbbell Press', notes: '', warmUpSets: 0, workingSets: 3 },
      { id: 'diverging-lat-pulldown', name: 'Diverging Lat Pulldown', notes: '', warmUpSets: 0, workingSets: 3 },
      { id: 'pec-fly', name: 'Pec Fly', notes: '', warmUpSets: 0, workingSets: 3 },
      { id: 'face-pulls', name: 'Face Pulls', notes: '', warmUpSets: 0, workingSets: 3 },
    ],
  },
  {
    id: 'lower-body',
    name: 'Lower Body',
    targetType: 'Routine',
    notes: '',
    exercises: [
      { id: 'squat', name: 'Squat', notes: '', warmUpSets: 2, workingSets: 3 },
      { id: 'romanian-deadlifts', name: 'Romanian Deadlifts', notes: '', warmUpSets: 1, workingSets: 3 },
    ],
  },
  {
    id: 'functional-fencing-day',
    name: 'Functional/Fencing Day',
    targetType: 'Routine',
    notes: '',
    exercises: [
      { id: 'medball-rotations', name: 'Medball Rotations', notes: '', warmUpSets: 0, workingSets: 3 },
      { id: 'plank', name: 'Plank', notes: '', warmUpSets: 0, workingSets: 3 },
      { id: 'pallof-press', name: 'Pallof Press', notes: '', warmUpSets: 0, workingSets: 3 },
    ],
  },
];

const RoutinesContext = createContext<RoutinesContextValue | null>(null);

function toId(name: string) {
  return `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${Date.now()}`;
}

export function RoutinesProvider({ children }: { children: ReactNode }) {
  const [routines, setRoutines] = useState<Routine[]>(initialRoutines);
  const [activeRoutineId, setActiveRoutineId] = useState<string | null>(null);

  const value = useMemo<RoutinesContextValue>(
    () => ({
      activeRoutineId,
      routines,
      setActiveRoutineId,
      getRoutine: (id) => routines.find((routine) => routine.id === id),
      createRoutine: () => {
        const id = `routine-${Date.now()}`;
        setRoutines((current) => [
          ...current,
          { id, name: 'New Routine', targetType: 'Routine', notes: '', exercises: [] },
        ]);
        return id;
      },
      deleteRoutine: (id) => {
        setRoutines((current) => current.filter((routine) => routine.id !== id));
      },
      duplicateRoutine: (id) => {
        const routine = routines.find((item) => item.id === id);
        if (!routine) return null;

        const copyId = `${routine.id}-copy-${Date.now()}`;
        setRoutines((current) => [
          ...current,
          {
            ...routine,
            id: copyId,
            name: `${routine.name} Copy`,
            exercises: routine.exercises.map((exercise) => ({
              ...exercise,
              id: `${exercise.id}-copy-${Date.now()}`,
            })),
          },
        ]);
        return copyId;
      },
      moveRoutine: (id, direction) => {
        setRoutines((current) => {
          const index = current.findIndex((routine) => routine.id === id);
          const nextIndex = direction === 'up' ? index - 1 : index + 1;
          if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;

          const routinesCopy = [...current];
          const [routine] = routinesCopy.splice(index, 1);
          routinesCopy.splice(nextIndex, 0, routine);
          return routinesCopy;
        });
      },
      reorderRoutines: () => {
        setRoutines((current) => [...current].reverse());
      },
      updateRoutine: (id, patch) => {
        setRoutines((current) => current.map((routine) => (routine.id === id ? { ...routine, ...patch } : routine)));
      },
      addExercise: (routineId, name) => {
        setRoutines((current) =>
          current.map((routine) =>
            routine.id === routineId
              ? {
                  ...routine,
                  exercises: [
                    ...routine.exercises,
                    { id: toId(name), name, notes: '', warmUpSets: 0, workingSets: 3 },
                  ],
                }
              : routine,
          ),
        );
      },
      removeExercise: (routineId, exerciseId) => {
        setRoutines((current) =>
          current.map((routine) =>
            routine.id === routineId
              ? { ...routine, exercises: routine.exercises.filter((exercise) => exercise.id !== exerciseId) }
              : routine,
          ),
        );
      },
      moveExercise: (routineId, exerciseId, direction) => {
        setRoutines((current) =>
          current.map((routine) => {
            if (routine.id !== routineId) return routine;
            const index = routine.exercises.findIndex((exercise) => exercise.id === exerciseId);
            const nextIndex = direction === 'up' ? index - 1 : index + 1;
            if (index < 0 || nextIndex < 0 || nextIndex >= routine.exercises.length) return routine;

            const exercises = [...routine.exercises];
            const [exercise] = exercises.splice(index, 1);
            exercises.splice(nextIndex, 0, exercise);
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
      },
    }),
    [activeRoutineId, routines],
  );

  return <RoutinesContext.Provider value={value}>{children}</RoutinesContext.Provider>;
}

export function useRoutines() {
  const value = useContext(RoutinesContext);
  if (!value) {
    throw new Error('useRoutines must be used within RoutinesProvider');
  }
  return value;
}
