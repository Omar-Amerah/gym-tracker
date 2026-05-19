import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import type { ExerciseRecord } from "@/db/schema";
import { saveWorkout } from "@/db/workoutsRepository";
import { registerActiveWorkoutReplacementHandler } from "@/state/activeWorkoutSelection";
import { useRoutines, type Routine } from "@/state/routines";
import { colors } from "@/theme/colors";
import { radius } from "@/theme/radius";
import { spacing } from "@/theme/spacing";
import { backOrReplace } from "@/utils/navigation";

type ActiveWorkoutSet = {
  id: string;
  type: "warmup" | "normal" | "drop";
  kg: string;
  reps: string;
  minutes?: string;
  seconds?: string;
  notes: string;
};

type ActiveWorkoutExercise = {
  exerciseId?: string | null;
  id: string;
  routineExerciseId: string;
  name: string;
  notes: string;
  isStarred: boolean;
  sets: ActiveWorkoutSet[];
  inputMode: "weightReps" | "time";
};

type ActiveWorkout = {
  routineId: string;
  name: string;
  bodyweightKg: string;
  date: string;
  startTime: string;
  endTime: string;
  notes: string;
  exercises: ActiveWorkoutExercise[];
};

type WorkoutField = keyof Pick<
  ActiveWorkout,
  "name" | "bodyweightKg" | "date" | "startTime" | "endTime" | "notes"
>;

type SelectedSet = {
  exerciseId: string;
  setId: string;
} | null;

type SetField = keyof Pick<
  ActiveWorkoutSet,
  "kg" | "reps" | "minutes" | "seconds" | "notes"
>;

const ITEM_HEIGHT = 66;
const TIME_OPTION_HEIGHT = 42;
const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatDisplayDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
  });
}

function formatDateField(date: Date) {
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatTimeField(date: Date) {
  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function parseDateField(value: string) {
  const [day, month, year] = value.split("/").map(Number);
  if (!day || !month || !year) return new Date();

  const parsed = new Date(year, month - 1, day);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function parseTimeField(value: string) {
  const [rawHour, rawMinute] = value.split(":").map(Number);
  const hour = Number.isFinite(rawHour)
    ? Math.max(0, Math.min(23, rawHour))
    : 0;
  const minute = Number.isFinite(rawMinute)
    ? Math.max(0, Math.min(59, rawMinute))
    : 0;

  return {
    hour: String(hour).padStart(2, "0"),
    minute: String(minute).padStart(2, "0"),
  };
}

function parseOptionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalInteger(value: string | undefined) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return null;

  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function calculateDurationMinutes(
  date: string,
  startTime: string,
  endTime: string,
) {
  if (!startTime || !endTime) return null;

  const [day, month, year] = date.split("/").map(Number);
  const start = parseTimeField(startTime);
  const end = parseTimeField(endTime);
  if (!day || !month || !year) return null;

  const startDate = new Date(
    year,
    month - 1,
    day,
    Number(start.hour),
    Number(start.minute),
  );
  const endDate = new Date(
    year,
    month - 1,
    day,
    Number(end.hour),
    Number(end.minute),
  );

  if (endDate.getTime() < startDate.getTime()) {
    endDate.setDate(endDate.getDate() + 1);
  }

  const diff = Math.round((endDate.getTime() - startDate.getTime()) / 60000);
  return Number.isFinite(diff) ? diff : null;
}

function getCalendarDays(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const visibleCellCount = Math.ceil((firstDay + daysInMonth) / 7) * 7;

  return Array.from({ length: visibleCellCount }, (_, index) => {
    const day = index - firstDay + 1;
    return day >= 1 && day <= daysInMonth ? day : null;
  });
}

function formatMonthTitle(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function buildWorkout(routine: Routine): ActiveWorkout {
  const now = new Date();

  return {
    routineId: routine.id,
    name: routine.name,
    bodyweightKg: "",
    date: formatDateField(now),
    startTime: formatTimeField(now),
    endTime: "",
    notes: "",
    exercises: routine.exercises.map((exercise) => {
      const totalSets = exercise.warmUpSets + exercise.workingSets;
      const sets = Array.from({ length: totalSets }, (_, index) => ({
        id: createId(`${exercise.id}-set-${index + 1}`),
        type:
          index < exercise.warmUpSets
            ? ("warmup" as const)
            : ("normal" as const),
        kg: "",
        reps: "",
        minutes: "",
        seconds: "",
        notes: "",
      }));

      return {
        id: createId(exercise.id),
        exerciseId: exercise.exerciseId,
        routineExerciseId: exercise.id,
        name: exercise.name,
        notes: "",
        isStarred: false,
        inputMode: "weightReps",
        sets,
      };
    }),
  };
}

function createClearedReplacementSets(
  exercise: ActiveWorkoutExercise,
  replacementExerciseId: string,
) {
  return exercise.sets.map((set, index) => ({
    id: createId(`${replacementExerciseId}-set-${index + 1}`),
    type: set.type,
    kg: "",
    reps: "",
    minutes: "",
    seconds: "",
    notes: "",
  }));
}

function getSetLabel(set: ActiveWorkoutSet, sets: ActiveWorkoutSet[]) {
  if (set.type === "warmup") return "W";

  if (set.type === "drop") return "D";

  return String(
    sets
      .filter((item) => item.type === "normal")
      .findIndex((item) => item.id === set.id) + 1,
  );
}

function getSetTypeLabel(type: ActiveWorkoutSet["type"]) {
  if (type === "warmup") return "Warm up";
  if (type === "drop") return "Drop set";
  return "Normal";
}

function BottomSheet({
  children,
  insetsBottom,
  onClose,
  visible,
}: {
  children: React.ReactNode;
  insetsBottom: number;
  onClose: () => void;
  visible: boolean;
}) {
  const [showModal, setShowModal] = useState(visible);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setShowModal(true);
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }).start();
      return;
    }

    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 120,
      useNativeDriver: true,
    }).start(() => {
      setShowModal(false);
    });
  }, [visible, fadeAnim]);

  if (!showModal) return null;

  return (
    <Modal
      animationType="none"
      onRequestClose={onClose}
      transparent
      visible={showModal}
    >
      <Animated.View style={[styles.sheetContainer, { opacity: fadeAnim }]}>
        <View style={styles.scrimOverlay} />
        <Pressable
          accessibilityLabel="Close menu"
          onPress={onClose}
          style={StyleSheet.absoluteFillObject}
        />
        <View
          style={[
            styles.sheet,
            {
              paddingBottom: 34 + insetsBottom,
            },
          ]}
        >
          {children}
        </View>
      </Animated.View>
    </Modal>
  );
}

function ReorderWorkoutRow({
  draggingIndex,
  exercise,
  hoverIndex,
  index,
  itemCount,
  onDragStart,
  onDrop,
  onHoverIndexChange,
}: {
  draggingIndex: number | null;
  exercise: ActiveWorkoutExercise;
  hoverIndex: number | null;
  index: number;
  itemCount: number;
  onDragStart: (index: number) => void;
  onDrop: (fromIndex: number, toIndex: number) => void;
  onHoverIndexChange: (index: number) => void;
}) {
  const isDragging = draggingIndex === index;
  const isShiftedUp =
    draggingIndex !== null &&
    hoverIndex !== null &&
    draggingIndex < index &&
    hoverIndex >= index;
  const isShiftedDown =
    draggingIndex !== null &&
    hoverIndex !== null &&
    draggingIndex > index &&
    hoverIndex <= index;
  const shiftOffset = isShiftedUp
    ? -ITEM_HEIGHT
    : isShiftedDown
      ? ITEM_HEIGHT
      : 0;

  const dragY = useRef(new Animated.Value(0)).current;
  const gestureStateRef = useRef({
    index,
    hoverIndex,
    onDragStart,
    onHoverIndexChange,
    onDrop,
  });
  gestureStateRef.current = {
    index,
    hoverIndex,
    onDragStart,
    onHoverIndexChange,
    onDrop,
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 6,
        onPanResponderGrant: () => {
          gestureStateRef.current.onDragStart(gestureStateRef.current.index);
        },
        onPanResponderMove: (_, gesture) => {
          dragY.setValue(gesture.dy);
          const currentIndex = gestureStateRef.current.index;
          const nextIndex = Math.max(
            0,
            Math.min(
              itemCount - 1,
              currentIndex + Math.round(gesture.dy / ITEM_HEIGHT),
            ),
          );

          if (nextIndex !== gestureStateRef.current.hoverIndex) {
            gestureStateRef.current.onHoverIndexChange(nextIndex);
          }
        },
        onPanResponderRelease: () => {
          dragY.setValue(0);
          const finalHover =
            gestureStateRef.current.hoverIndex ?? gestureStateRef.current.index;
          gestureStateRef.current.onDrop(
            gestureStateRef.current.index,
            finalHover,
          );
        },
        onPanResponderTerminate: () => {
          dragY.setValue(0);
          gestureStateRef.current.onDrop(
            gestureStateRef.current.index,
            gestureStateRef.current.index,
          );
        },
      }),
    [dragY, itemCount],
  );

  return (
    <Animated.View
      style={[
        styles.reorderRow,
        isDragging && styles.reorderRowActive,
        {
          transform: [{ translateY: isDragging ? dragY : shiftOffset }],
          zIndex: isDragging ? 10 : 1,
        },
      ]}
    >
      <Text numberOfLines={1} style={styles.reorderRowText}>
        {exercise.name}
      </Text>
      <View {...panResponder.panHandlers} style={styles.reorderHandle}>
        <View style={styles.reorderHandleLine} />
        <View style={styles.reorderHandleLine} />
      </View>
    </Animated.View>
  );
}

export default function ActiveWorkoutScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { routineId } = useLocalSearchParams<{ routineId: string }>();
  const { getRoutine, isLoading } = useRoutines();
  const routine = getRoutine(routineId);

  const [workout, setWorkout] = useState<ActiveWorkout | null>(null);
  const [initialisedRoutineId, setInitialisedRoutineId] = useState<
    string | null
  >(null);
  const [finishConfirmOpen, setFinishConfirmOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [isSavingWorkout, setIsSavingWorkout] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [timePickerTarget, setTimePickerTarget] = useState<
    "startTime" | "endTime" | null
  >(null);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(
    null,
  );
  const [replacementExerciseId, setReplacementExerciseId] = useState<
    string | null
  >(null);
  const [selectedSet, setSelectedSet] = useState<SelectedSet>(null);
  const [exerciseNoteTargetId, setExerciseNoteTargetId] = useState<
    string | null
  >(null);
  const [isReorderingExercises, setIsReorderingExercises] = useState(false);
  const [draggingExerciseIndex, setDraggingExerciseIndex] = useState<
    number | null
  >(null);
  const [hoverExerciseIndex, setHoverExerciseIndex] = useState<number | null>(
    null,
  );
  const [noteHeights, setNoteHeights] = useState<Record<string, number>>({});
  const exerciseNoteRefs = useRef<Record<string, TextInput | null>>({});
  const hourScrollRef = useRef<ScrollView>(null);
  const minuteScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!routine || initialisedRoutineId === routine.id) return;
    setWorkout(buildWorkout(routine));
    setInitialisedRoutineId(routine.id);
  }, [initialisedRoutineId, routine]);

  useEffect(() => {
    if (!timePickerTarget || !workout) return;

    const time = parseTimeField(
      workout[timePickerTarget] || formatTimeField(new Date()),
    );
    const hourIndex = Number(time.hour);
    const minuteIndex = Number(time.minute);
    const timer = setTimeout(() => {
      hourScrollRef.current?.scrollTo({
        animated: false,
        y: Math.max(0, (hourIndex - 2) * TIME_OPTION_HEIGHT),
      });
      minuteScrollRef.current?.scrollTo({
        animated: false,
        y: Math.max(0, (minuteIndex - 2) * TIME_OPTION_HEIGHT),
      });
    }, 80);

    return () => clearTimeout(timer);
  }, [timePickerTarget, workout]);

  useEffect(() => {
    return registerActiveWorkoutReplacementHandler(
      routineId,
      (exercise: ExerciseRecord) => {
        setWorkout((current) => {
          if (!current || !replacementExerciseId) return current;

          return {
            ...current,
            exercises: current.exercises.map((workoutExercise) =>
              workoutExercise.id === replacementExerciseId
                ? {
                    ...workoutExercise,
                    exerciseId: exercise.id,
                    name: exercise.name,
                    notes: "",
                    isStarred: false,
                    sets: createClearedReplacementSets(
                      workoutExercise,
                      exercise.id,
                    ),
                  }
                : workoutExercise,
            ),
          };
        });
        setReplacementExerciseId(null);
        setSelectedExerciseId(null);
      },
    );
  }, [replacementExerciseId, routineId]);

  const updateWorkoutField = (field: WorkoutField, value: string) => {
    setWorkout((current) =>
      current ? { ...current, [field]: value } : current,
    );
  };

  const updateSetField = (
    exerciseId: string,
    setId: string,
    field: SetField,
    value: string,
  ) => {
    setWorkout((current) => {
      if (!current) return current;

      return {
        ...current,
        exercises: current.exercises.map((exercise) =>
          exercise.id === exerciseId
            ? {
                ...exercise,
                sets: exercise.sets.map((set) =>
                  set.id === setId ? { ...set, [field]: value } : set,
                ),
              }
            : exercise,
        ),
      };
    });
  };

  const updateExerciseNote = (exerciseId: string, value: string) => {
    setWorkout((current) => {
      if (!current) return current;

      return {
        ...current,
        exercises: current.exercises.map((exercise) =>
          exercise.id === exerciseId ? { ...exercise, notes: value } : exercise,
        ),
      };
    });
  };

  const toggleExerciseStar = (exerciseId: string) => {
    setWorkout((current) => {
      if (!current) return current;

      return {
        ...current,
        exercises: current.exercises.map((exercise) =>
          exercise.id === exerciseId
            ? { ...exercise, isStarred: !exercise.isStarred }
            : exercise,
        ),
      };
    });
  };

  const addSetToExercise = (exerciseId: string) => {
    setWorkout((current) => {
      if (!current) return current;

      return {
        ...current,
        exercises: current.exercises.map((exercise) => {
          if (exercise.id !== exerciseId) return exercise;

          return {
            ...exercise,
            sets: [
              ...exercise.sets,
              {
                id: createId(`${exercise.routineExerciseId}-set`),
                type: "normal",
                kg: "",
                reps: "",
                minutes: "",
                seconds: "",
                notes: "",
              },
            ],
          };
        }),
      };
    });
  };

  const removeSetFromExercise = (exerciseId: string, setId: string) => {
    setWorkout((current) => {
      if (!current) return current;

      return {
        ...current,
        exercises: current.exercises.map((exercise) => {
          if (exercise.id !== exerciseId) return exercise;

          return {
            ...exercise,
            sets: exercise.sets.filter((set) => set.id !== setId),
          };
        }),
      };
    });
  };

  const updateSetType = (
    exerciseId: string,
    setId: string,
    type: ActiveWorkoutSet["type"],
  ) => {
    setWorkout((current) => {
      if (!current) return current;

      return {
        ...current,
        exercises: current.exercises.map((exercise) =>
          exercise.id === exerciseId
            ? {
                ...exercise,
                sets: exercise.sets.map((set) =>
                  set.id === setId ? { ...set, type } : set,
                ),
              }
            : exercise,
        ),
      };
    });
  };

  const copySetOnce = (exerciseId: string, setId: string) => {
    setWorkout((current) => {
      if (!current) return current;

      return {
        ...current,
        exercises: current.exercises.map((exercise) => {
          if (exercise.id !== exerciseId) return exercise;

          const setIndex = exercise.sets.findIndex((set) => set.id === setId);
          if (setIndex < 0) return exercise;

          const setToCopy = exercise.sets[setIndex];
          const nextSets = [...exercise.sets];
          nextSets.splice(setIndex + 1, 0, {
            ...setToCopy,
            id: createId(`${exercise.routineExerciseId}-copy`),
          });
          return { ...exercise, sets: nextSets };
        }),
      };
    });
  };

  const workoutHasSetData = (candidate: ActiveWorkout) =>
    candidate.exercises.some((exercise) =>
      exercise.sets.some(
        (set) =>
          set.kg.trim() ||
          set.reps.trim() ||
          (set.minutes ?? "").trim() ||
          (set.seconds ?? "").trim() ||
          set.notes.trim(),
      ),
    );

  const saveFinishedWorkout = async (candidate: ActiveWorkout) => {
    if (isSavingWorkout) return;

    setIsSavingWorkout(true);
    try {
      await saveWorkout({
        bodyweightKg: parseOptionalNumber(candidate.bodyweightKg),
        date: candidate.date,
        durationMinutes: calculateDurationMinutes(
          candidate.date,
          candidate.startTime,
          candidate.endTime,
        ),
        endTime: candidate.endTime,
        exercises: candidate.exercises.map((exercise) => ({
          exerciseId: exercise.exerciseId ?? null,
          id: exercise.id,
          isStarred: exercise.isStarred,
          name: exercise.name,
          notes: exercise.notes,
          routineExerciseId: exercise.routineExerciseId,
          sets: exercise.sets.map((set) => ({
            id: set.id,
            kg: parseOptionalNumber(set.kg),
            minutes: parseOptionalInteger(set.minutes),
            notes: set.notes,
            reps: parseOptionalInteger(set.reps),
            seconds: parseOptionalInteger(set.seconds),
            type: set.type,
          })),
        })),
        name: candidate.name,
        notes: candidate.notes,
        routineId: candidate.routineId,
        startTime: candidate.startTime,
      });
      setFinishConfirmOpen(false);
      router.replace("/");
    } catch (error) {
      console.error("Failed to save workout", error);
      Alert.alert(
        "Could not save workout",
        "Something went wrong while saving this workout. Please try again.",
      );
    } finally {
      setIsSavingWorkout(false);
    }
  };

  const finishWorkout = () => {
    if (!workout || isSavingWorkout) return;

    const completedWorkout = {
      ...workout,
      endTime: workout.endTime || formatTimeField(new Date()),
    };
    setWorkout(completedWorkout);

    if (!workoutHasSetData(completedWorkout)) {
      Alert.alert("This workout has no completed data. Save anyway?", "", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Save",
          onPress: () => {
            void saveFinishedWorkout(completedWorkout);
          },
        },
      ]);
      return;
    }

    void saveFinishedWorkout(completedWorkout);
  };

  const openDatePicker = () => {
    if (!workout) return;
    setCalendarMonth(parseDateField(workout.date));
    setDatePickerOpen(true);
  };

  const selectCalendarDay = (day: number) => {
    const selectedDate = new Date(
      calendarMonth.getFullYear(),
      calendarMonth.getMonth(),
      day,
    );
    updateWorkoutField("date", formatDateField(selectedDate));
    setDatePickerOpen(false);
  };

  const moveCalendarMonth = (direction: -1 | 1) => {
    setCalendarMonth(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + direction, 1),
    );
  };

  const updateSelectedTime = (part: "hour" | "minute", value: string) => {
    if (!timePickerTarget || !workout) return;

    const currentTime =
      workout[timePickerTarget] || formatTimeField(new Date());
    const parsed = parseTimeField(currentTime);
    const nextTime =
      part === "hour" ? `${value}:${parsed.minute}` : `${parsed.hour}:${value}`;

    updateWorkoutField(timePickerTarget, nextTime);
  };

  const moveExerciseToIndex = (exerciseId: string, targetIndex: number) => {
    setWorkout((current) => {
      if (!current) return current;

      const currentIndex = current.exercises.findIndex(
        (exercise) => exercise.id === exerciseId,
      );
      if (currentIndex < 0) return current;

      const exercises = [...current.exercises];
      const [exercise] = exercises.splice(currentIndex, 1);
      const boundedIndex = Math.max(0, Math.min(targetIndex, exercises.length));
      exercises.splice(boundedIndex, 0, exercise);

      return {
        ...current,
        exercises,
      };
    });
  };

  const deleteExerciseFromWorkout = (exerciseId: string) => {
    const exercise = workout?.exercises.find((item) => item.id === exerciseId);
    if (!exercise) return;

    Alert.alert(
      "Remove exercise?",
      `This will remove ${exercise.name} and its sets from this workout.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            setWorkout((current) => {
              if (!current) return current;
              return {
                ...current,
                exercises: current.exercises.filter(
                  (item) => item.id !== exerciseId,
                ),
              };
            });
            setSelectedExerciseId(null);
          },
        },
      ],
    );
  };

  const openExerciseReorder = () => {
    setSelectedExerciseId(null);
    setDraggingExerciseIndex(null);
    setHoverExerciseIndex(null);
    setIsReorderingExercises(true);
  };

  const openExerciseReplacement = () => {
    if (!selectedExerciseId) return;

    setReplacementExerciseId(selectedExerciseId);
    setSelectedExerciseId(null);
    router.push({
      pathname: "/select-exercise",
      params: {
        activeWorkoutRoutineId: routineId,
        mode: "active-workout-replace",
      },
    });
  };

  const focusExerciseNote = (exerciseId: string) => {
    setExerciseNoteTargetId(exerciseId);
    setSelectedExerciseId(null);
    setTimeout(() => {
      exerciseNoteRefs.current[exerciseId]?.focus();
    }, 180);
  };

  const showFutureActionAlert = (message: string) => {
    Alert.alert("Coming soon", message);
  };

  const selectedExercise = selectedExerciseId
    ? (workout?.exercises.find(
        (exercise) => exercise.id === selectedExerciseId,
      ) ?? null)
    : null;
  const selectedSetData = selectedSet
    ? workout?.exercises
        .find((exercise) => exercise.id === selectedSet.exerciseId)
        ?.sets.find((set) => set.id === selectedSet.setId)
    : null;
  const selectedDate = workout ? parseDateField(workout.date) : new Date();
  const headerTitle = formatDisplayDate(selectedDate);
  const selectedTime =
    timePickerTarget && workout
      ? parseTimeField(workout[timePickerTarget] || formatTimeField(new Date()))
      : null;

  if (!workout) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            {isLoading ? "Loading..." : "Workout not found."}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isReorderingExercises) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <View style={styles.screen}>
          <View style={styles.header}>
            <Pressable
              accessibilityLabel="Back to workout"
              accessibilityRole="button"
              onPress={() => setIsReorderingExercises(false)}
              style={styles.iconButton}
            >
              <MaterialCommunityIcons
                color={colors.accent}
                name="arrow-left"
                size={24}
              />
            </Pressable>

            <View style={styles.dateHeaderTitle}>
              <Text numberOfLines={1} style={styles.headerTitle}>
                Reorder
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={() => setIsReorderingExercises(false)}
              style={({ pressed }) => [
                styles.finishHeaderButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.finishHeaderText}>DONE</Text>
            </Pressable>
          </View>

          <View style={styles.reorderList}>
            {workout.exercises.map((exercise, index) => (
              <ReorderWorkoutRow
                key={exercise.id}
                draggingIndex={draggingExerciseIndex}
                exercise={exercise}
                hoverIndex={hoverExerciseIndex}
                index={index}
                itemCount={workout.exercises.length}
                onDragStart={(idx) => {
                  if (draggingExerciseIndex !== null) return;
                  setDraggingExerciseIndex(idx);
                  setHoverExerciseIndex(idx);
                }}
                onHoverIndexChange={setHoverExerciseIndex}
                onDrop={(fromIdx, toIdx) => {
                  if (fromIdx !== toIdx) {
                    moveExerciseToIndex(workout.exercises[fromIdx].id, toIdx);
                  }
                  setDraggingExerciseIndex(null);
                  setHoverExerciseIndex(null);
                }}
              />
            ))}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.screen}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            onPress={() => backOrReplace("/routines")}
            style={styles.iconButton}
          >
            <MaterialCommunityIcons
              color={colors.accent}
              name="arrow-left"
              size={24}
            />
          </Pressable>

          <View style={styles.dateHeaderTitle}>
            <Text numberOfLines={1} style={styles.headerTitle}>
              {headerTitle}
            </Text>
          </View>

          <View style={styles.headerActions}>
            <Pressable
              accessibilityLabel="Workout timer"
              accessibilityRole="button"
              style={styles.headerSquareButton}
            >
              <MaterialCommunityIcons
                color={colors.accent}
                name="timer-outline"
                size={23}
              />
            </Pressable>
            <Pressable
              accessibilityLabel="Finish workout"
              accessibilityRole="button"
              onPress={() => setFinishConfirmOpen(true)}
              style={({ pressed }) => [
                styles.finishHeaderButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.finishHeaderText}>FINISH</Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Workout options"
              accessibilityRole="button"
              style={styles.headerSquareButton}
            >
              <MaterialCommunityIcons
                color={colors.accent}
                name="dots-vertical"
                size={24}
              />
            </Pressable>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: 32 + insets.bottom },
          ]}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.detailsGrid}>
            <WorkoutInput
              label="Name"
              onChangeText={(value) => updateWorkoutField("name", value)}
              value={workout.name}
              wide
            />
            <WorkoutInput
              keyboardType="decimal-pad"
              label="BW (Kg)"
              onChangeText={(value) =>
                updateWorkoutField("bodyweightKg", value)
              }
              value={workout.bodyweightKg}
            />
            <WorkoutInput
              icon="calendar-month-outline"
              label="Date"
              onPress={openDatePicker}
              onChangeText={(value) => updateWorkoutField("date", value)}
              value={workout.date}
            />
            <WorkoutInput
              icon="clock-outline"
              label="Start"
              onPress={() => setTimePickerTarget("startTime")}
              onChangeText={(value) => updateWorkoutField("startTime", value)}
              value={workout.startTime}
            />
            <WorkoutInput
              icon="clock-outline"
              label="End"
              onPress={() => setTimePickerTarget("endTime")}
              onChangeText={(value) => updateWorkoutField("endTime", value)}
              value={workout.endTime}
            />
            <WorkoutInput
              label="Notes"
              multiline
              onChangeText={(value) => updateWorkoutField("notes", value)}
              value={workout.notes}
              wide
            />
          </View>

          <View style={styles.exerciseList}>
            {workout.exercises.map((exercise) => (
              <View key={exercise.id} style={styles.exerciseSection}>
                <View style={styles.exerciseHeader}>
                  <Text style={styles.exerciseTitle}>{exercise.name}</Text>
                  <Pressable
                    accessibilityLabel={`${exercise.name} options`}
                    accessibilityRole="button"
                    hitSlop={8}
                    onPress={() => setSelectedExerciseId(exercise.id)}
                    style={styles.exerciseMenu}
                  >
                    <MaterialCommunityIcons
                      color={colors.textSecondary}
                      name="dots-vertical"
                      size={23}
                    />
                  </Pressable>
                </View>

                {exercise.notes.length > 0 ||
                exerciseNoteTargetId === exercise.id ? (
                  <TextInput
                    multiline
                    onContentSizeChange={(event) =>
                      setNoteHeights((current) => ({
                        ...current,
                        [`exercise-${exercise.id}`]: Math.max(
                          48,
                          Math.min(150, event.nativeEvent.contentSize.height),
                        ),
                      }))
                    }
                    onChangeText={(value) =>
                      updateExerciseNote(exercise.id, value)
                    }
                    placeholder="Exercise note"
                    placeholderTextColor={colors.textMuted}
                    ref={(ref) => {
                      exerciseNoteRefs.current[exercise.id] = ref;
                    }}
                    scrollEnabled
                    style={[
                      styles.exerciseNoteInput,
                      {
                        height: noteHeights[`exercise-${exercise.id}`] ?? 48,
                      },
                    ]}
                    textAlignVertical="top"
                    value={exercise.notes}
                  />
                ) : null}

                {exercise.sets.map((set) => (
                  <View key={set.id} style={styles.setRowGroup}>
                    <View style={styles.setHeader}>
                      <View style={styles.setNumberLabel} />
                      {exercise.inputMode === "time" ? (
                        <>
                          <Text style={styles.setHeaderText}>min</Text>
                          <Text style={styles.setHeaderText}>sec</Text>
                        </>
                      ) : (
                        <>
                          <Text style={styles.setHeaderText}>Kg</Text>
                          <Text style={styles.setHeaderText}>Reps</Text>
                        </>
                      )}
                      <Text style={[styles.setHeaderText, styles.notesHeader]}>
                        Notes
                      </Text>
                      <View style={styles.removeColumn} />
                    </View>

                    <View style={styles.setRow}>
                      <View
                        style={[
                          styles.setCircle,
                          set.type === "warmup" && styles.warmupSetCircle,
                          set.type === "drop" && styles.specialSetCircle,
                        ]}
                      >
                        <Text
                          style={[
                            styles.setCircleText,
                            set.type === "warmup" && styles.warmupSetCircleText,
                            set.type === "drop" && styles.specialSetCircleText,
                          ]}
                        >
                          {getSetLabel(set, exercise.sets)}
                        </Text>
                      </View>

                      {exercise.inputMode === "time" ? (
                        <>
                          <SetInput
                            keyboardType="number-pad"
                            onChangeText={(value) =>
                              updateSetField(
                                exercise.id,
                                set.id,
                                "minutes",
                                value,
                              )
                            }
                            value={set.minutes ?? ""}
                          />
                          <SetInput
                            keyboardType="number-pad"
                            onChangeText={(value) =>
                              updateSetField(
                                exercise.id,
                                set.id,
                                "seconds",
                                value,
                              )
                            }
                            value={set.seconds ?? ""}
                          />
                        </>
                      ) : (
                        <>
                          <SetInput
                            keyboardType="decimal-pad"
                            onChangeText={(value) =>
                              updateSetField(exercise.id, set.id, "kg", value)
                            }
                            value={set.kg}
                          />
                          <SetInput
                            keyboardType="number-pad"
                            onChangeText={(value) =>
                              updateSetField(exercise.id, set.id, "reps", value)
                            }
                            value={set.reps}
                          />
                        </>
                      )}

                      <SetInput
                        multiline
                        onContentSizeChange={(height) =>
                          setNoteHeights((current) => ({
                            ...current,
                            [set.id]: Math.max(38, Math.min(120, height)),
                          }))
                        }
                        onChangeText={(value) =>
                          updateSetField(exercise.id, set.id, "notes", value)
                        }
                        style={[
                          styles.notesInput,
                          {
                            height: noteHeights[set.id] ?? 38,
                          },
                        ]}
                        value={set.notes}
                      />

                      <Pressable
                        accessibilityLabel="Set options"
                        accessibilityRole="button"
                        hitSlop={8}
                        onPress={() =>
                          setSelectedSet({
                            exerciseId: exercise.id,
                            setId: set.id,
                          })
                        }
                        style={styles.setOptionsButton}
                      >
                        <MaterialCommunityIcons
                          color={colors.textMuted}
                          name="dots-vertical"
                          size={22}
                        />
                      </Pressable>
                    </View>
                  </View>
                ))}

                <View style={styles.exerciseFooter}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => addSetToExercise(exercise.id)}
                    style={({ pressed }) => [
                      styles.addSetButton,
                      pressed && styles.pressed,
                    ]}
                  >
                    <MaterialCommunityIcons
                      color={colors.accent}
                      name="plus"
                      size={18}
                    />
                    <Text style={styles.addSetText}>Add Set</Text>
                  </Pressable>

                  <View style={styles.exerciseActionGroup}>
                    <Pressable
                      accessibilityLabel={`${exercise.name} history`}
                      accessibilityRole="button"
                      onPress={() =>
                        showFutureActionAlert(
                          "History will be available after workouts are saved.",
                        )
                      }
                      style={({ pressed }) => [
                        styles.exerciseIconButton,
                        pressed && styles.pressed,
                      ]}
                    >
                      <MaterialCommunityIcons
                        color={colors.accent}
                        name="history"
                        size={22}
                      />
                    </Pressable>
                    <Pressable
                      accessibilityLabel={`${exercise.name} charts`}
                      accessibilityRole="button"
                      onPress={() =>
                        showFutureActionAlert(
                          "Charts will be available after workouts are saved.",
                        )
                      }
                      style={({ pressed }) => [
                        styles.exerciseIconButton,
                        pressed && styles.pressed,
                      ]}
                    >
                      <MaterialCommunityIcons
                        color={colors.accent}
                        name="chart-line"
                        size={22}
                      />
                    </Pressable>
                    <Pressable
                      accessibilityLabel={`${exercise.name} star`}
                      accessibilityRole="button"
                      onPress={() => toggleExerciseStar(exercise.id)}
                      style={({ pressed }) => [
                        styles.exerciseIconButton,
                        pressed && styles.pressed,
                      ]}
                    >
                      <MaterialCommunityIcons
                        color={
                          exercise.isStarred ? colors.accent : colors.textMuted
                        }
                        name={exercise.isStarred ? "star" : "star-outline"}
                        size={22}
                      />
                    </Pressable>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        <BottomSheet
          insetsBottom={insets.bottom}
          onClose={() => setFinishConfirmOpen(false)}
          visible={finishConfirmOpen}
        >
          <Text style={styles.sheetTitle}>Finish workout?</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setFinishConfirmOpen(false)}
            style={({ pressed }) => [
              styles.sheetAction,
              pressed && styles.pressed,
            ]}
          >
            <MaterialCommunityIcons
              color={colors.textPrimary}
              name="close"
              size={24}
              style={styles.sheetIcon}
            />
            <Text style={styles.sheetText}>Cancel</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={isSavingWorkout}
            onPress={finishWorkout}
            style={({ pressed }) => [
              styles.sheetAction,
              isSavingWorkout && styles.disabledAction,
              pressed && styles.pressed,
            ]}
          >
            <MaterialCommunityIcons
              color={colors.accent}
              name="check"
              size={24}
              style={styles.sheetIcon}
            />
            <Text style={styles.sheetText}>
              {isSavingWorkout ? "Saving..." : "Finish"}
            </Text>
          </Pressable>
        </BottomSheet>

        <BottomSheet
          insetsBottom={insets.bottom}
          onClose={() => setDatePickerOpen(false)}
          visible={datePickerOpen}
        >
          <View style={styles.pickerHeader}>
            <Pressable
              accessibilityLabel="Previous month"
              accessibilityRole="button"
              onPress={() => moveCalendarMonth(-1)}
              style={({ pressed }) => [
                styles.pickerNavButton,
                pressed && styles.pressed,
              ]}
            >
              <MaterialCommunityIcons
                color={colors.accent}
                name="chevron-left"
                size={25}
              />
            </Pressable>
            <Text style={styles.pickerTitle}>
              {formatMonthTitle(calendarMonth)}
            </Text>
            <Pressable
              accessibilityLabel="Next month"
              accessibilityRole="button"
              onPress={() => moveCalendarMonth(1)}
              style={({ pressed }) => [
                styles.pickerNavButton,
                pressed && styles.pressed,
              ]}
            >
              <MaterialCommunityIcons
                color={colors.accent}
                name="chevron-right"
                size={25}
              />
            </Pressable>
          </View>

          <View style={styles.weekRow}>
            {WEEKDAY_LABELS.map((label, index) => (
              <Text key={`${label}-${index}`} style={styles.weekLabel}>
                {label}
              </Text>
            ))}
          </View>
          <View style={styles.calendarGrid}>
            {getCalendarDays(calendarMonth).map((day, index) => {
              const isSelected =
                day !== null &&
                selectedDate.getFullYear() === calendarMonth.getFullYear() &&
                selectedDate.getMonth() === calendarMonth.getMonth() &&
                selectedDate.getDate() === day;

              return day === null ? (
                <View key={`empty-${index}`} style={styles.calendarCell} />
              ) : (
                <Pressable
                  accessibilityRole="button"
                  key={`${calendarMonth.getMonth()}-${day}`}
                  onPress={() => selectCalendarDay(day)}
                  style={({ pressed }) => [
                    styles.calendarCell,
                    pressed && styles.pressed,
                  ]}
                >
                  <View
                    style={[
                      styles.calendarPill,
                      isSelected && styles.calendarPillSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.calendarText,
                        isSelected && styles.calendarTextSelected,
                      ]}
                    >
                      {day}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </BottomSheet>

        <BottomSheet
          insetsBottom={insets.bottom}
          onClose={() => setTimePickerTarget(null)}
          visible={timePickerTarget !== null}
        >
          <Text style={styles.sheetTitle}>
            {timePickerTarget === "endTime" ? "End Time" : "Start Time"}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              if (!timePickerTarget) return;
              updateWorkoutField(timePickerTarget, formatTimeField(new Date()));
              setTimePickerTarget(null);
            }}
            style={({ pressed }) => [
              styles.sheetAction,
              pressed && styles.pressed,
            ]}
          >
            <MaterialCommunityIcons
              color={colors.accent}
              name="clock-check-outline"
              size={24}
              style={styles.sheetIcon}
            />
            <Text style={styles.sheetText}>Use Current Time</Text>
          </Pressable>
          <View style={styles.timePicker}>
            <ScrollView
              ref={hourScrollRef}
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
              style={styles.timeColumn}
            >
              {Array.from({ length: 24 }, (_, index) =>
                String(index).padStart(2, "0"),
              ).map((hour) => (
                <Pressable
                  accessibilityRole="button"
                  key={hour}
                  onPress={() => updateSelectedTime("hour", hour)}
                  style={[
                    styles.timeOption,
                    selectedTime?.hour === hour && styles.timeOptionSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.timeOptionText,
                      selectedTime?.hour === hour &&
                        styles.timeOptionTextSelected,
                    ]}
                  >
                    {hour}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <Text style={styles.timeDivider}>:</Text>
            <ScrollView
              ref={minuteScrollRef}
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
              style={styles.timeColumn}
            >
              {Array.from({ length: 60 }, (_, index) =>
                String(index).padStart(2, "0"),
              ).map((minute) => (
                <Pressable
                  accessibilityRole="button"
                  key={minute}
                  onPress={() => updateSelectedTime("minute", minute)}
                  style={[
                    styles.timeOption,
                    selectedTime?.minute === minute &&
                      styles.timeOptionSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.timeOptionText,
                      selectedTime?.minute === minute &&
                        styles.timeOptionTextSelected,
                    ]}
                  >
                    {minute}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </BottomSheet>

        <BottomSheet
          insetsBottom={insets.bottom}
          onClose={() => setSelectedSet(null)}
          visible={selectedSet !== null}
        >
          <Text style={styles.sheetTitle}>Set Options</Text>
          <Text style={styles.sheetDescription}>
            {selectedSetData ? getSetTypeLabel(selectedSetData.type) : ""}
          </Text>

          {(["normal", "warmup", "drop"] as const).map((type) => (
            <Pressable
              accessibilityRole="button"
              key={type}
              onPress={() => {
                if (!selectedSet) return;
                updateSetType(selectedSet.exerciseId, selectedSet.setId, type);
              }}
              style={({ pressed }) => [
                styles.sheetAction,
                pressed && styles.pressed,
              ]}
            >
              <MaterialCommunityIcons
                color={
                  selectedSetData?.type === type
                    ? colors.accent
                    : colors.textPrimary
                }
                name={
                  selectedSetData?.type === type ? "check" : "circle-outline"
                }
                size={24}
                style={styles.sheetIcon}
              />
              <Text
                style={[
                  styles.sheetText,
                  selectedSetData?.type === type && styles.sheetTextSelected,
                ]}
              >
                {getSetTypeLabel(type)}
              </Text>
            </Pressable>
          ))}

          <Pressable
            accessibilityRole="button"
            onPress={() => {
              if (!selectedSet) return;
              copySetOnce(selectedSet.exerciseId, selectedSet.setId);
              setSelectedSet(null);
            }}
            style={({ pressed }) => [
              styles.sheetAction,
              pressed && styles.pressed,
            ]}
          >
            <MaterialCommunityIcons
              color={colors.textPrimary}
              name="content-copy"
              size={22}
              style={styles.sheetIcon}
            />
            <Text style={styles.sheetText}>Copy Once</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => {
              if (!selectedSet) return;
              removeSetFromExercise(selectedSet.exerciseId, selectedSet.setId);
              setSelectedSet(null);
            }}
            style={({ pressed }) => [
              styles.sheetAction,
              pressed && styles.pressed,
            ]}
          >
            <MaterialCommunityIcons
              color="#ffaaa1"
              name="trash-can-outline"
              size={24}
              style={styles.sheetIcon}
            />
            <Text style={[styles.sheetText, styles.deleteText]}>Delete</Text>
          </Pressable>
        </BottomSheet>

        <BottomSheet
          insetsBottom={insets.bottom}
          onClose={() => setSelectedExerciseId(null)}
          visible={selectedExerciseId !== null}
        >
          <Text style={styles.sheetTitle}>{selectedExercise?.name}</Text>

          <View style={styles.exerciseQuickActions}>
            <ExerciseQuickAction
              icon="format-list-bulleted"
              label="Reorder"
              onPress={openExerciseReorder}
            />
            <ExerciseQuickAction
              icon="swap-horizontal"
              label="Replace"
              onPress={openExerciseReplacement}
            />
            <ExerciseQuickAction
              destructive
              icon="trash-can-outline"
              label="Delete"
              onPress={() => {
                if (!selectedExercise) return;
                deleteExerciseFromWorkout(selectedExercise.id);
              }}
            />
          </View>

          <SheetListAction
            icon="note-plus-outline"
            label="Add Note"
            onPress={() => {
              if (!selectedExerciseId) return;
              focusExerciseNote(selectedExerciseId);
            }}
          />
          <SheetListAction
            icon="history"
            label="History"
            locked
            onPress={() =>
              showFutureActionAlert(
                "History will be available after workouts are saved.",
              )
            }
          />
          <SheetListAction
            icon="chart-line"
            label="Charts"
            locked
            onPress={() =>
              showFutureActionAlert(
                "Charts will be available after workouts are saved.",
              )
            }
          />
          <SheetListAction
            icon="trophy-outline"
            label="Personal Records"
            locked
            onPress={() =>
              showFutureActionAlert(
                "Personal records will be available after workouts are saved.",
              )
            }
          />
          <SheetListAction
            icon="cog-outline"
            label="Settings"
            locked
            onPress={() =>
              showFutureActionAlert("Exercise settings will be added later.")
            }
          />
        </BottomSheet>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ExerciseQuickAction({
  destructive,
  icon,
  label,
  locked,
  onPress,
}: {
  destructive?: boolean;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  label: string;
  locked?: boolean;
  onPress?: () => void;
}) {
  const color = destructive
    ? "#ffaaa1"
    : locked
      ? colors.textMuted
      : colors.accent;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={locked && !onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.quickAction,
        locked && !onPress && styles.disabledAction,
        pressed && styles.pressed,
      ]}
    >
      <MaterialCommunityIcons color={color} name={icon} size={24} />
      <Text
        numberOfLines={1}
        style={[
          styles.quickActionText,
          destructive && styles.deleteText,
          locked && !onPress && styles.mutedText,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function SheetListAction({
  icon,
  label,
  locked,
  onPress,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  label: string;
  locked?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={locked && !onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.sheetAction,
        locked && styles.disabledAction,
        pressed && styles.pressed,
      ]}
    >
      <MaterialCommunityIcons
        color={locked ? colors.textMuted : colors.textPrimary}
        name={icon}
        size={24}
        style={styles.sheetIcon}
      />
      <Text style={[styles.sheetText, locked && styles.mutedText]}>
        {label}
      </Text>
      {locked ? (
        <MaterialCommunityIcons
          color={colors.textMuted}
          name="lock-outline"
          size={16}
        />
      ) : null}
    </Pressable>
  );
}

function WorkoutInput({
  icon,
  keyboardType,
  label,
  multiline,
  onChangeText,
  onPress,
  value,
  wide,
}: {
  icon?: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  keyboardType?: "default" | "decimal-pad" | "number-pad";
  label: string;
  multiline?: boolean;
  onChangeText: (value: string) => void;
  onPress?: () => void;
  value: string;
  wide?: boolean;
}) {
  return (
    <View style={[styles.workoutInputWrap, wide && styles.wideInput]}>
      <Text style={styles.inputLabel}>{label}</Text>
      {onPress ? (
        <Pressable
          accessibilityRole="button"
          onPress={onPress}
          style={({ pressed }) => [
            styles.workoutInput,
            styles.pressableWorkoutInput,
            pressed && styles.pressed,
          ]}
        >
          <Text numberOfLines={1} style={styles.pressableWorkoutInputText}>
            {value || "--"}
          </Text>
          {icon ? (
            <MaterialCommunityIcons
              color={colors.accent}
              name={icon}
              size={19}
              style={styles.pressableWorkoutInputIcon}
            />
          ) : null}
        </Pressable>
      ) : (
        <TextInput
          keyboardType={keyboardType}
          multiline={multiline}
          onChangeText={onChangeText}
          placeholderTextColor={colors.textSecondary}
          style={[styles.workoutInput, multiline && styles.multilineInput]}
          textAlignVertical={multiline ? "top" : "center"}
          value={value}
        />
      )}
    </View>
  );
}

function SetInput({
  keyboardType,
  multiline,
  onContentSizeChange,
  onChangeText,
  style,
  value,
}: {
  keyboardType?: "default" | "decimal-pad" | "number-pad";
  multiline?: boolean;
  onContentSizeChange?: (height: number) => void;
  onChangeText: (value: string) => void;
  style?: StyleProp<TextStyle>;
  value: string;
}) {
  return (
    <TextInput
      keyboardType={keyboardType}
      multiline={multiline}
      onContentSizeChange={
        onContentSizeChange
          ? (event) => onContentSizeChange(event.nativeEvent.contentSize.height)
          : undefined
      }
      onChangeText={onChangeText}
      placeholderTextColor={colors.textMuted}
      scrollEnabled={multiline}
      style={[styles.setInput, style]}
      textAlignVertical={multiline ? "top" : "center"}
      value={value}
    />
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  emptyText: {
    color: colors.textPrimary,
    fontSize: 18,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    paddingBottom: 12,
    paddingHorizontal: spacing.xxl,
    paddingTop: 12,
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  dateHeaderTitle: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    height: 40,
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  headerSquareButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  headerTitle: {
    color: colors.textPrimary,
    flexShrink: 1,
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: 0,
  },
  headerActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  finishHeaderButton: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    height: 40,
    justifyContent: "center",
    paddingHorizontal: 9,
  },
  finishHeaderText: {
    color: colors.background,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  content: {
    paddingHorizontal: spacing.xxl,
    paddingTop: 8,
  },
  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 14,
  },
  workoutInputWrap: {
    flexGrow: 1,
    minWidth: "47%",
    position: "relative",
  },
  wideInput: {
    minWidth: "100%",
  },
  inputLabel: {
    backgroundColor: colors.background,
    color: colors.textSecondary,
    fontSize: 12,
    left: 12,
    letterSpacing: 0,
    paddingHorizontal: 5,
    position: "absolute",
    top: -8,
    zIndex: 1,
  },
  workoutInput: {
    backgroundColor: "rgba(255,255,255,0.015)",
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: radius.sm,
    borderWidth: 1,
    color: colors.textPrimary,
    fontSize: 15,
    minHeight: 52,
    paddingHorizontal: 14,
  },
  pressableWorkoutInput: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  pressableWorkoutInputText: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
  },
  pressableWorkoutInputIcon: {
    width: 20,
  },
  multilineInput: {
    minHeight: 74,
    paddingTop: 16,
  },
  exerciseList: {
    gap: 6,
  },
  exerciseSection: {
    borderTopColor: "rgba(145, 145, 145, 0.32)",
    borderTopWidth: 0.5,
    paddingBottom: 20,
    paddingTop: 18,
  },
  exerciseHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  exerciseTitle: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0,
    paddingRight: 12,
  },
  exerciseMenu: {
    alignItems: "center",
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  exerciseNoteInput: {
    backgroundColor: "rgba(255,255,255,0.02)",
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: radius.sm,
    borderWidth: 1,
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 12,
    maxHeight: 150,
    minHeight: 48,
    paddingHorizontal: 12,
    paddingTop: 11,
    paddingBottom: 11,
  },
  setHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginBottom: 3,
  },
  setHeaderText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0,
    textAlign: "left",
    width: 58,
  },
  setNumberLabel: {
    textAlign: "center",
    width: 34,
  },
  notesHeader: {
    flex: 1,
    textAlign: "left",
  },
  removeColumn: {
    width: 24,
  },
  setRowGroup: {
    marginBottom: 8,
  },
  setRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 8,
    minHeight: 42,
    paddingVertical: 2,
  },
  setCircle: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: "rgba(255,255,255,0.82)",
    borderRadius: radius.circle,
    borderWidth: 1,
    height: 32,
    justifyContent: "center",
    marginTop: 3,
    width: 32,
    marginRight: 5,
    marginLeft: -2,
  },
  warmupSetCircle: {
    backgroundColor: "rgba(91, 212, 224, 0.1)",
    borderColor: colors.accent,
  },
  specialSetCircle: {
    backgroundColor: "rgba(91, 212, 224, 0.04)",
    borderColor: colors.accentMuted,
  },
  setCircleText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "700",
  },
  warmupSetCircleText: {
    color: colors.accent,
  },
  specialSetCircleText: {
    color: colors.accent,
  },
  setInput: {
    backgroundColor: "rgba(255,255,255,0.02)",
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: radius.sm,
    borderWidth: 1,
    color: colors.textPrimary,
    fontSize: 15,
    height: 38,
    includeFontPadding: false,
    paddingHorizontal: 8,
    paddingVertical: 0,
    textAlign: "left",
    textAlignVertical: "center",
    width: 58,
  },
  notesInput: {
    color: "rgba(230, 231, 235, 0.8)",
    flex: 1,
    lineHeight: 19,
    maxHeight: 120,
    height: 38,
    minWidth: 80,
    paddingTop: 9,
    paddingBottom: 9,
    textAlign: "left",
    textAlignVertical: "center",
  },
  setOptionsButton: {
    alignItems: "center",
    height: 38,
    justifyContent: "center",
    marginTop: 5,
    width: 24,
  },
  exerciseFooter: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    minHeight: 38,
    paddingTop: 4,
  },
  addSetButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: 5,
    minHeight: 36,
    paddingRight: 12,
  },
  addSetText: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: "700",
  },
  exerciseActionGroup: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  exerciseIconButton: {
    alignItems: "center",
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  sheetContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  scrimOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  sheet: {
    backgroundColor: "#06100f",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    gap: 14,
    paddingHorizontal: 34,
    paddingTop: 32,
  },
  sheetTitle: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 2,
  },
  sheetDescription: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  sheetAction: {
    alignItems: "center",
    flexDirection: "row",
    gap: 16,
    minHeight: 44,
  },
  sheetIcon: {
    width: 34,
  },
  sheetText: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: 17,
    fontWeight: "500",
  },
  sheetTextSelected: {
    color: colors.accent,
  },
  pickerHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  pickerNavButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  pickerTitle: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0,
    textAlign: "center",
  },
  weekRow: {
    flexDirection: "row",
    marginTop: 4,
  },
  weekLabel: {
    color: colors.textMuted,
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  calendarCell: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: "14.285%",
  },
  calendarPill: {
    alignItems: "center",
    borderRadius: radius.md,
    height: 36,
    justifyContent: "center",
    width: 40,
  },
  calendarPillSelected: {
    backgroundColor: colors.accent,
  },
  calendarText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "600",
    includeFontPadding: false,
    lineHeight: 18,
    textAlign: "center",
  },
  calendarTextSelected: {
    color: colors.background,
    fontWeight: "800",
  },
  timePicker: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    maxHeight: 230,
  },
  timeColumn: {
    backgroundColor: "rgba(255,255,255,0.02)",
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    maxHeight: 230,
  },
  timeDivider: {
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: "700",
  },
  timeOption: {
    alignItems: "center",
    height: 42,
    justifyContent: "center",
  },
  timeOptionSelected: {
    backgroundColor: "rgba(91, 212, 224, 0.16)",
  },
  timeOptionText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "600",
  },
  timeOptionTextSelected: {
    color: colors.accent,
  },
  reorderList: {
    paddingHorizontal: spacing.xxl,
    paddingTop: 8,
  },
  reorderRow: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    flexDirection: "row",
    height: 62,
    justifyContent: "space-between",
    marginBottom: 4,
    paddingLeft: 20,
    zIndex: 1,
  },
  reorderRowActive: {
    backgroundColor: colors.surfacePressed,
    borderColor: colors.accent,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 5,
  },
  reorderRowText: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: 18,
    fontWeight: "500",
    letterSpacing: 0,
  },
  reorderHandle: {
    gap: 4,
    padding: 16,
  },
  reorderHandleLine: {
    backgroundColor: colors.accent,
    borderRadius: radius.xs,
    height: 2,
    width: 24,
  },
  exerciseQuickActions: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 4,
  },
  quickAction: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    gap: 8,
    justifyContent: "center",
    minHeight: 76,
    paddingHorizontal: 6,
  },
  quickActionText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0,
    textAlign: "center",
  },
  disabledAction: {
    opacity: 0.52,
  },
  mutedText: {
    color: colors.textMuted,
  },
  deleteText: {
    color: "#ffaaa1",
  },
  pressed: {
    opacity: 0.72,
  },
});
