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
import {
  deleteWorkout,
  getLastExercisePerformance,
  getSavedWorkout,
  markWorkoutCompleted,
  saveWorkout,
  updateWorkout,
  type PreviousExercisePerformance,
  type WorkoutStatus,
} from "@/db/workoutsRepository";
import {
  registerActiveWorkoutAddExerciseHandler,
  registerActiveWorkoutReplacementHandler,
} from "@/state/activeWorkoutSelection";
import { useRoutines, type Routine } from "@/state/routines";
import { colors } from "@/theme/colors";
import { radius } from "@/theme/radius";
import { spacing } from "@/theme/spacing";
import { backOrReplace } from "@/utils/navigation";

type ActiveWorkoutSet = {
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

type ActiveWorkoutExercise = {
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

type ActiveWorkout = {
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
  "distance" | "kg" | "reps" | "minutes" | "seconds" | "notes"
>;

type SetMetricField =
  | "distance"
  | "kg"
  | "reps"
  | "minutes"
  | "seconds"
  | "time";

type SetFieldPlan = {
  field: SetMetricField;
  keyboardType: "default" | "decimal-pad" | "number-pad";
  label: string;
  width?: number;
};

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

function normaliseExerciseType(exerciseType?: string | null) {
  return exerciseType?.trim() || "Strength: Weight, Reps";
}

function getSetFieldPlan(exerciseType?: string | null): SetFieldPlan[] {
  switch (normaliseExerciseType(exerciseType)) {
    case "Strength: Weight, Time":
    case "Bodyweight: Weight, Time":
      return [
        { field: "kg", label: "Kg", keyboardType: "decimal-pad" },
        { field: "seconds", label: "Sec", keyboardType: "number-pad" },
      ];
    case "Bodyweight: Reps":
    case "Reps Only":
      return [{ field: "reps", label: "Reps", keyboardType: "number-pad" }];
    case "Bodyweight: Time":
    case "Cardio: Time":
    case "Time Only":
      return [
        { field: "minutes", label: "Min", keyboardType: "number-pad" },
        { field: "seconds", label: "Sec", keyboardType: "number-pad" },
      ];
    case "Cardio: Distance, Time":
      return [
        {
          field: "distance",
          label: "Distance",
          keyboardType: "decimal-pad",
          width: 74,
        },
        { field: "time", label: "Time", keyboardType: "default", width: 68 },
      ];
    case "Strength: Weight, Reps":
    case "Bodyweight: Weight, Reps":
    default:
      return [
        { field: "kg", label: "Kg", keyboardType: "decimal-pad" },
        { field: "reps", label: "Reps", keyboardType: "number-pad" },
      ];
  }
}

function formatTimeValue(minutes?: string, seconds?: string) {
  const trimmedMinutes = minutes?.trim() ?? "";
  const trimmedSeconds = seconds?.trim() ?? "";
  if (!trimmedMinutes && !trimmedSeconds) return "";
  if (!trimmedSeconds) return trimmedMinutes;
  return `${trimmedMinutes || "0"}:${trimmedSeconds.padStart(2, "0")}`;
}

function parseTimeValue(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return { minutes: "", seconds: "" };

  if (!trimmed.includes(":")) {
    return { minutes: trimmed, seconds: "" };
  }

  const [minutes = "", seconds = ""] = trimmed.split(":");
  return { minutes: minutes.trim(), seconds: seconds.trim() };
}

function previousValue(value: number | null | undefined) {
  return value !== null && value !== undefined ? `${value}` : "0";
}

function previousTimeValue(
  minutes: number | null | undefined,
  seconds: number | null | undefined,
) {
  if (minutes === null && seconds === null) return "0";
  if (minutes === undefined && seconds === undefined) return "0";

  const minValue = minutes ?? 0;
  const secValue = seconds ?? 0;
  return `${minValue}:${String(secValue).padStart(2, "0")}`;
}

function getPreviousPlaceholder(
  field: SetMetricField,
  previousSet: PreviousExercisePerformance["sets"][number] | null,
) {
  if (!previousSet) return "0";
  if (field === "distance") return previousValue(previousSet.distance);
  if (field === "kg") return previousValue(previousSet.kg);
  if (field === "reps") return previousValue(previousSet.reps);
  if (field === "minutes") return previousValue(previousSet.minutes);
  if (field === "seconds") return previousValue(previousSet.seconds);
  return previousTimeValue(previousSet.minutes, previousSet.seconds);
}

function buildSetPayload(exerciseType: string, set: ActiveWorkoutSet) {
  const visibleFields = new Set(
    getSetFieldPlan(exerciseType).map((fieldPlan) => fieldPlan.field),
  );
  const compactTime = visibleFields.has("time")
    ? parseTimeValue(set.time)
    : null;

  return {
    distance: visibleFields.has("distance")
      ? parseOptionalNumber(set.distance)
      : null,
    id: set.id,
    kg: visibleFields.has("kg") ? parseOptionalNumber(set.kg) : null,
    minutes: compactTime
      ? parseOptionalInteger(compactTime.minutes)
      : visibleFields.has("minutes")
        ? parseOptionalInteger(set.minutes)
        : null,
    notes: set.notes,
    reps: visibleFields.has("reps") ? parseOptionalInteger(set.reps) : null,
    seconds: compactTime
      ? parseOptionalInteger(compactTime.seconds)
      : visibleFields.has("seconds")
        ? parseOptionalInteger(set.seconds)
        : null,
    type: set.type,
  };
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

function getPreviousSetForCurrent(
  set: ActiveWorkoutSet,
  currentSets: ActiveWorkoutSet[],
  performance: PreviousExercisePerformance | undefined,
) {
  if (!performance) return null;

  const currentTypeIndex = currentSets
    .filter((item) => item.type === set.type)
    .findIndex((item) => item.id === set.id);
  if (currentTypeIndex < 0) return null;

  return (
    performance.sets
      .filter((previousSet) => previousSet.setType === set.type)
      .sort((a, b) => a.setOrder - b.setOrder)[currentTypeIndex] ?? null
  );
}

function buildWorkout(routine: Routine): ActiveWorkout {
  const now = new Date();

  return {
    routineId: routine.id,
    mode: "fromRoutine",
    name: routine.name,
    bodyweightKg: "",
    date: formatDateField(now),
    startTime: formatTimeField(now),
    endTime: "",
    notes: "",
    status: "draft",
    exercises: routine.exercises.map((exercise) => {
      const totalSets = exercise.warmUpSets + exercise.workingSets;
      const sets = Array.from({ length: totalSets }, (_, index) => ({
        distance: "",
        id: createId(`${exercise.id}-set-${index + 1}`),
        type:
          index < exercise.warmUpSets
            ? ("warmup" as const)
            : ("normal" as const),
        kg: "",
        reps: "",
        minutes: "",
        seconds: "",
        time: "",
        notes: "",
      }));

      return {
        id: createId(exercise.id),
        exerciseId: exercise.exerciseId,
        exerciseType: normaliseExerciseType(exercise.exerciseType),
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

function buildEmptyWorkout(): ActiveWorkout {
  const now = new Date();

  return {
    routineId: "",
    mode: "new",
    name: "",
    bodyweightKg: "",
    date: formatDateField(now),
    startTime: formatTimeField(now),
    endTime: "",
    notes: "",
    status: "draft",
    exercises: [],
  };
}

function createClearedReplacementSets(
  exercise: ActiveWorkoutExercise,
  replacementExerciseId: string,
) {
  return exercise.sets.map((set, index) => ({
    distance: "",
    id: createId(`${replacementExerciseId}-set-${index + 1}`),
    type: set.type,
    kg: "",
    reps: "",
    minutes: "",
    seconds: "",
    time: "",
    notes: "",
  }));
}

function createDefaultExerciseFromRecord(
  exercise: ExerciseRecord,
): ActiveWorkoutExercise {
  return {
    id: createId(`workout-${exercise.id}`),
    exerciseId: exercise.id,
    exerciseType: normaliseExerciseType(exercise.exerciseType),
    routineExerciseId: "",
    name: exercise.name,
    notes: "",
    isStarred: false,
    inputMode: "weightReps",
    sets: Array.from({ length: 3 }, (_, index) => ({
      distance: "",
      id: createId(`${exercise.id}-set-${index + 1}`),
      type: "normal" as const,
      kg: "",
      reps: "",
      minutes: "",
      seconds: "",
      time: "",
      notes: "",
    })),
  };
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
  const { routineId, workoutId } = useLocalSearchParams<{
    routineId?: string;
    workoutId?: string;
  }>();
  const { getRoutine, isLoading } = useRoutines();
  const routeRoutineId = routineId ?? "";
  const routine = routineId ? getRoutine(routineId) : undefined;
  const editorKey = workoutId
    ? `workout-${workoutId}`
    : `draft-${routeRoutineId || "new"}`;

  const [workout, setWorkout] = useState<ActiveWorkout | null>(null);
  const [initialisedRoutineId, setInitialisedRoutineId] = useState<
    string | null
  >(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [isSavingWorkout, setIsSavingWorkout] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState<
    "idle" | "saving" | "saved" | "failed"
  >("idle");
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [timePickerTarget, setTimePickerTarget] = useState<
    "startTime" | "endTime" | null
  >(null);
  const [focusedFieldId, setFocusedFieldId] = useState<string | null>(null);
  const [workoutMenuOpen, setWorkoutMenuOpen] = useState(false);
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
  const [previousPerformance, setPreviousPerformance] = useState<
    Record<string, PreviousExercisePerformance | undefined>
  >({});
  const exerciseNoteRefs = useRef<Record<string, TextInput | null>>({});
  const hourScrollRef = useRef<ScrollView>(null);
  const minuteScrollRef = useRef<ScrollView>(null);
  const previousLookupKeyRef = useRef("");
  const autosaveKeyRef = useRef("");
  const autosavePayloadKeyRef = useRef("");
  const autosavePayloadRef = useRef<ReturnType<
    typeof buildWorkoutPayload
  > | null>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autosaveSavingRef = useRef(false);
  const autosaveWriteRef = useRef<Promise<void> | null>(null);
  const isDeletingWorkoutRef = useRef(false);
  const isFinishingWorkoutRef = useRef(false);

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
          setWorkout({
            id: savedWorkout.id,
            routineId: savedWorkout.routineId ?? "",
            mode: "editSaved",
            name: savedWorkout.name,
            bodyweightKg:
              savedWorkout.bodyweightKg === null
                ? ""
                : String(savedWorkout.bodyweightKg),
            date: savedWorkout.date,
            startTime: savedWorkout.startTime,
            endTime: savedWorkout.endTime,
            notes: savedWorkout.notes,
            status: savedWorkout.status,
            exercises: savedWorkout.exercises.map((exercise) => ({
              id: exercise.id,
              routineExerciseId: exercise.routineExerciseId ?? "",
              exerciseId: exercise.exerciseId,
              exerciseType: normaliseExerciseType(exercise.exerciseType),
              name: exercise.name,
              notes: exercise.notes,
              isStarred: exercise.isStarred,
              inputMode: "weightReps",
              sets: exercise.sets.map((set) => ({
                distance: set.distance === null ? "" : String(set.distance),
                id: set.id,
                type: set.type,
                kg: set.kg === null ? "" : String(set.kg),
                reps: set.reps === null ? "" : String(set.reps),
                minutes: set.minutes === null ? "" : String(set.minutes),
                seconds: set.seconds === null ? "" : String(set.seconds),
                time: formatTimeValue(
                  set.minutes === null ? "" : String(set.minutes),
                  set.seconds === null ? "" : String(set.seconds),
                ),
                notes: set.notes,
              })),
            })),
          });
          setInitialisedRoutineId(`workout-${workoutId}`);
          autosaveKeyRef.current = JSON.stringify(
            buildWorkoutPayload({
              id: savedWorkout.id,
              routineId: savedWorkout.routineId ?? "",
              mode: "editSaved",
              name: savedWorkout.name,
              bodyweightKg:
                savedWorkout.bodyweightKg === null
                  ? ""
                  : String(savedWorkout.bodyweightKg),
              date: savedWorkout.date,
              startTime: savedWorkout.startTime,
              endTime: savedWorkout.endTime,
              notes: savedWorkout.notes,
              status: savedWorkout.status,
              exercises: savedWorkout.exercises.map((exercise) => ({
                id: exercise.id,
                routineExerciseId: exercise.routineExerciseId ?? "",
                exerciseId: exercise.exerciseId,
                exerciseType: normaliseExerciseType(exercise.exerciseType),
                name: exercise.name,
                notes: exercise.notes,
                isStarred: exercise.isStarred,
                inputMode: "weightReps",
                sets: exercise.sets.map((set) => ({
                  distance: set.distance === null ? "" : String(set.distance),
                  id: set.id,
                  type: set.type,
                  kg: set.kg === null ? "" : String(set.kg),
                  reps: set.reps === null ? "" : String(set.reps),
                  minutes: set.minutes === null ? "" : String(set.minutes),
                  seconds: set.seconds === null ? "" : String(set.seconds),
                  time: formatTimeValue(
                    set.minutes === null ? "" : String(set.minutes),
                    set.seconds === null ? "" : String(set.seconds),
                  ),
                  notes: set.notes,
                })),
              })),
            }),
          );
          setAutosaveStatus("saved");
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
      saveWorkout(buildWorkoutPayload(draft))
        .then((createdWorkoutId) => {
          if (!mounted) return;
          const persistedDraft = { ...draft, id: createdWorkoutId };
          setWorkout(persistedDraft);
          autosaveKeyRef.current = JSON.stringify(
            buildWorkoutPayload(persistedDraft),
          );
          setAutosaveStatus("saved");
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
    const draft = buildWorkout(routine);
    let mounted = true;
    saveWorkout(buildWorkoutPayload(draft))
      .then((createdWorkoutId) => {
        if (!mounted) return;
        const persistedDraft = { ...draft, id: createdWorkoutId };
        setWorkout(persistedDraft);
        autosaveKeyRef.current = JSON.stringify(
          buildWorkoutPayload(persistedDraft),
        );
        setAutosaveStatus("saved");
        setInitialisedRoutineId(routine.id);
      })
      .catch((error) => {
        console.error("Failed to create routine workout draft", error);
        if (mounted) setAutosaveStatus("failed");
      });
    return () => {
      mounted = false;
    };
  }, [initialisedRoutineId, routeRoutineId, routine, workoutId]);

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
      editorKey,
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
                    exerciseType: normaliseExerciseType(exercise.exerciseType),
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
  }, [editorKey, replacementExerciseId]);

  useEffect(() => {
    return registerActiveWorkoutAddExerciseHandler(
      editorKey,
      (exercise: ExerciseRecord) => {
        setWorkout((current) => {
          if (!current) return current;

          return {
            ...current,
            exercises: [
              ...current.exercises,
              createDefaultExerciseFromRecord(exercise),
            ],
          };
        });
      },
    );
  }, [editorKey]);

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
  }, [workout]);

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

  const updateSetTimeField = (
    exerciseId: string,
    setId: string,
    value: string,
  ) => {
    const { minutes, seconds } = parseTimeValue(value);
    setWorkout((current) => {
      if (!current) return current;

      return {
        ...current,
        exercises: current.exercises.map((exercise) =>
          exercise.id === exerciseId
            ? {
                ...exercise,
                sets: exercise.sets.map((set) =>
                  set.id === setId
                    ? { ...set, minutes, seconds, time: value }
                    : set,
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
                distance: "",
                id: createId(`${exercise.routineExerciseId}-set`),
                type: "normal",
                kg: "",
                reps: "",
                minutes: "",
                seconds: "",
                time: "",
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

  const confirmRemoveSetFromExercise = (exerciseId: string, setId: string) => {
    setSelectedSet(null);
    Alert.alert("Delete set?", "This will remove this set from the workout.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => removeSetFromExercise(exerciseId, setId),
      },
    ]);
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

  const buildWorkoutPayload = (candidate: ActiveWorkout) => ({
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
      exerciseType: exercise.exerciseType,
      id: exercise.id,
      isStarred: exercise.isStarred,
      name: exercise.name,
      notes: exercise.notes,
      routineExerciseId: exercise.routineExerciseId,
      sets: exercise.sets.map((set) =>
        buildSetPayload(exercise.exerciseType, set),
      ),
    })),
    name: candidate.name,
    notes: candidate.notes,
    routineId: candidate.routineId || null,
    status: candidate.status,
    startTime: candidate.startTime,
  });

  const saveFinishedWorkout = async (
    candidate: ActiveWorkout,
    { navigateAfterSave = true } = {},
  ) => {
    if (isSavingWorkout || !candidate.id) return;

    isFinishingWorkoutRef.current = true;
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    autosavePayloadRef.current = null;
    autosavePayloadKeyRef.current = autosaveKeyRef.current;
    setIsSavingWorkout(true);
    try {
      await autosaveWriteRef.current;
      const payload = buildWorkoutPayload(candidate);
      await markWorkoutCompleted(candidate.id, {
        ...payload,
        status: "completed",
      });
      autosaveKeyRef.current = JSON.stringify({
        ...payload,
        status: "completed",
      });
      if (navigateAfterSave) router.replace("/");
    } catch (error) {
      console.error("Failed to save workout", error);
      Alert.alert(
        "Could not save workout",
        "Something went wrong while saving this workout. Please try again.",
      );
    } finally {
      isFinishingWorkoutRef.current = false;
      setIsSavingWorkout(false);
    }
  };

  const finishWorkout = () => {
    if (!workout || isSavingWorkout) return;

    const completedWorkout = {
      ...workout,
      status: "completed" as const,
      endTime: workout.endTime || formatTimeField(new Date()),
    };
    isFinishingWorkoutRef.current = true;
    setWorkout(completedWorkout);
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
    setFocusedFieldId(null);
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
    setWorkoutMenuOpen(false);
    setSelectedExerciseId(null);
    setDraggingExerciseIndex(null);
    setHoverExerciseIndex(null);
    setIsReorderingExercises(true);
  };

  const confirmDeleteWorkout = () => {
    if (!workout?.id) return;

    const workoutToDelete = workout;
    const workoutIdToDelete = workout.id;

    setWorkoutMenuOpen(false);
    Alert.alert(
      "Delete workout?",
      "This will permanently delete this workout and all of its sets.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            isDeletingWorkoutRef.current = true;
            setWorkout(null);
            void deleteWorkout(workoutIdToDelete)
              .then(() => {
                backOrReplace("/routines");
              })
              .catch((error) => {
                console.warn("Failed to delete workout", error);
                isDeletingWorkoutRef.current = false;
                setWorkout(workoutToDelete);
                Alert.alert("Could not delete workout", "Please try again.");
              });
          },
        },
      ],
    );
  };

  const openExerciseReplacement = () => {
    if (!selectedExerciseId) return;

    setReplacementExerciseId(selectedExerciseId);
    setSelectedExerciseId(null);
    router.push({
      pathname: "/select-exercise",
      params: {
        activeWorkoutRoutineId: editorKey,
        mode: "active-workout-replace",
      },
    });
  };

  const openAddExercise = () => {
    router.push({
      pathname: "/select-exercise",
      params: {
        activeWorkoutRoutineId: editorKey,
        mode: "active-workout-add",
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
    const isEditorLoading =
      isLoading ||
      (Boolean(workoutId) && initialisedRoutineId !== `missing-${workoutId}`) ||
      (!routeRoutineId && initialisedRoutineId !== "new");

    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            {isEditorLoading ? "Loading..." : "Workout not found."}
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
            {autosaveStatus !== "idle" ? (
              <Text style={styles.autosaveStatusText}>
                {autosaveStatus === "saving"
                  ? "Saving..."
                  : autosaveStatus === "failed"
                    ? "Failed to save"
                    : "Saved"}
              </Text>
            ) : null}
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
              disabled={isSavingWorkout}
              onPress={finishWorkout}
              style={({ pressed }) => [
                styles.finishHeaderButton,
                isSavingWorkout && styles.disabledAction,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.finishHeaderText}>
                {isSavingWorkout
                  ? "SAVING"
                  : workout.status === "completed"
                    ? "DONE"
                    : "FINISH"}
              </Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Workout options"
              accessibilityRole="button"
              onPress={() => setWorkoutMenuOpen(true)}
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
            { paddingBottom: 120 + insets.bottom },
          ]}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.detailsGrid}>
            <WorkoutInput
              fieldId="workout-name"
              focusedFieldId={focusedFieldId}
              label="Name"
              onChangeText={(value) => updateWorkoutField("name", value)}
              setFocusedFieldId={setFocusedFieldId}
              value={workout.name}
              wide
            />
            <WorkoutInput
              fieldId="workout-bodyweight"
              focusedFieldId={focusedFieldId}
              keyboardType="decimal-pad"
              label="BW (Kg)"
              onChangeText={(value) =>
                updateWorkoutField("bodyweightKg", value)
              }
              setFocusedFieldId={setFocusedFieldId}
              value={workout.bodyweightKg}
            />
            <WorkoutInput
              fieldId="workout-date"
              focusedFieldId={focusedFieldId}
              icon="calendar-month-outline"
              label="Date"
              onPress={openDatePicker}
              onChangeText={(value) => updateWorkoutField("date", value)}
              setFocusedFieldId={setFocusedFieldId}
              value={workout.date}
            />
            <WorkoutInput
              fieldId="workout-start"
              focusedFieldId={focusedFieldId}
              icon="clock-outline"
              label="Start"
              onPress={() => setTimePickerTarget("startTime")}
              onChangeText={(value) => updateWorkoutField("startTime", value)}
              setFocusedFieldId={setFocusedFieldId}
              value={workout.startTime}
            />
            <WorkoutInput
              fieldId="workout-end"
              focusedFieldId={focusedFieldId}
              icon="clock-outline"
              label="End"
              onPress={() => setTimePickerTarget("endTime")}
              onChangeText={(value) => updateWorkoutField("endTime", value)}
              setFocusedFieldId={setFocusedFieldId}
              value={workout.endTime}
            />
            <WorkoutInput
              fieldId="workout-notes"
              focusedFieldId={focusedFieldId}
              label="Notes"
              multiline
              onChangeText={(value) => updateWorkoutField("notes", value)}
              setFocusedFieldId={setFocusedFieldId}
              value={workout.notes}
              wide
            />
          </View>

          <View style={styles.exerciseList}>
            {workout.exercises.length === 0 ? (
              <View style={styles.emptyWorkoutState}>
                <Pressable
                  accessibilityRole="button"
                  onPress={openAddExercise}
                  style={({ pressed }) => [
                    styles.addExerciseButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <MaterialCommunityIcons
                    color={colors.background}
                    name="plus"
                    size={20}
                  />
                  <Text style={styles.addExerciseButtonText}>Add Exercise</Text>
                </Pressable>
              </View>
            ) : null}
            {workout.exercises.map((exercise) => {
              const previous = previousPerformance[exercise.id];
              const previousExerciseNote = previous?.notes?.trim() || undefined;

              return (
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
                      onContentSizeChange={(event) => {
                        const height = event.nativeEvent.contentSize.height;

                        setNoteHeights((current) => ({
                          ...current,
                          [`exercise-${exercise.id}`]: Math.max(
                            48,
                            Math.min(150, height),
                          ),
                        }));
                      }}
                      onChangeText={(value) =>
                        updateExerciseNote(exercise.id, value)
                      }
                      onBlur={() => setFocusedFieldId(null)}
                      onFocus={() =>
                        setFocusedFieldId(`exercise-${exercise.id}-notes`)
                      }
                      placeholder={previousExerciseNote || "Exercise note"}
                      placeholderTextColor={colors.textMuted}
                      ref={(ref) => {
                        exerciseNoteRefs.current[exercise.id] = ref;
                      }}
                      scrollEnabled
                      style={[
                        styles.exerciseNoteInput,
                        focusedFieldId === `exercise-${exercise.id}-notes` &&
                          styles.inputFocused,
                        {
                          height: noteHeights[`exercise-${exercise.id}`] ?? 48,
                        },
                      ]}
                      textAlignVertical="top"
                      value={exercise.notes}
                    />
                  ) : null}

                  {exercise.sets.map((set) => {
                    const setFieldPlan = getSetFieldPlan(exercise.exerciseType);
                    const previousSet = getPreviousSetForCurrent(
                      set,
                      exercise.sets,
                      previous,
                    );

                    const prevNotes = previousSet?.notes?.trim()
                      ? `${previousSet.notes.trim()}`
                      : undefined;

                    return (
                      <View key={set.id} style={styles.setRowGroup}>
                        <View style={styles.setHeader}>
                          <View style={styles.setNumberLabel} />
                          {setFieldPlan.map((fieldPlan) => (
                            <Text
                              key={fieldPlan.field}
                              style={[
                                styles.setHeaderText,
                                fieldPlan.width
                                  ? { width: fieldPlan.width }
                                  : null,
                              ]}
                            >
                              {fieldPlan.label}
                            </Text>
                          ))}
                          <Text
                            style={[styles.setHeaderText, styles.notesHeader]}
                          >
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
                                set.type === "warmup" &&
                                  styles.warmupSetCircleText,
                                set.type === "drop" &&
                                  styles.specialSetCircleText,
                              ]}
                            >
                              {getSetLabel(set, exercise.sets)}
                            </Text>
                          </View>

                          {setFieldPlan.map((fieldPlan) => (
                            <SetInput
                              key={fieldPlan.field}
                              fieldId={`${set.id}-${fieldPlan.field}`}
                              focusedFieldId={focusedFieldId}
                              placeholder={getPreviousPlaceholder(
                                fieldPlan.field,
                                previousSet,
                              )}
                              keyboardType={fieldPlan.keyboardType}
                              onChangeText={(value) =>
                                fieldPlan.field === "time"
                                  ? updateSetTimeField(
                                      exercise.id,
                                      set.id,
                                      value,
                                    )
                                  : updateSetField(
                                      exercise.id,
                                      set.id,
                                      fieldPlan.field,
                                      value,
                                    )
                              }
                              setFocusedFieldId={setFocusedFieldId}
                              value={
                                fieldPlan.field === "time"
                                  ? set.time
                                  : (set[fieldPlan.field] ?? "")
                              }
                              width={fieldPlan.width}
                            />
                          ))}

                          <SetInput
                            fieldId={`${set.id}-notes`}
                            focusedFieldId={focusedFieldId}
                            placeholder={prevNotes}
                            multiline
                            onContentSizeChange={(height) =>
                              setNoteHeights((current) => ({
                                ...current,
                                [set.id]: Math.max(38, Math.min(120, height)),
                              }))
                            }
                            onChangeText={(value) =>
                              updateSetField(
                                exercise.id,
                                set.id,
                                "notes",
                                value,
                              )
                            }
                            setFocusedFieldId={setFocusedFieldId}
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
                    );
                  })}

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
                            exercise.isStarred
                              ? colors.accent
                              : colors.textMuted
                          }
                          name={exercise.isStarred ? "star" : "star-outline"}
                          size={22}
                        />
                      </Pressable>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
          {workout.exercises.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              onPress={openAddExercise}
              style={({ pressed }) => [
                styles.addExerciseInlineButton,
                pressed && styles.pressed,
              ]}
            >
              <MaterialCommunityIcons
                color={colors.accent}
                name="plus"
                size={18}
              />
              <Text style={styles.addExerciseInlineText}>Add Exercise</Text>
            </Pressable>
          ) : null}
        </ScrollView>

        <BottomSheet
          insetsBottom={insets.bottom}
          onClose={() => {
            setDatePickerOpen(false);
            setFocusedFieldId(null);
          }}
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
          onClose={() => {
            setTimePickerTarget(null);
            setFocusedFieldId(null);
          }}
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
              setFocusedFieldId(null);
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
              confirmRemoveSetFromExercise(
                selectedSet.exerciseId,
                selectedSet.setId,
              );
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
          onClose={() => setWorkoutMenuOpen(false)}
          visible={workoutMenuOpen}
        >
          <Text style={styles.sheetTitle}>Workout Options</Text>
          <SheetListAction
            icon="format-list-bulleted"
            label="Reorder Exercises"
            onPress={openExerciseReorder}
          />
          <SheetListAction
            destructive
            icon="trash-can-outline"
            label="Delete Workout"
            onPress={confirmDeleteWorkout}
          />
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
        color={
          destructive
            ? "#ffaaa1"
            : locked
              ? colors.textMuted
              : colors.textPrimary
        }
        name={icon}
        size={24}
        style={styles.sheetIcon}
      />
      <Text
        style={[
          styles.sheetText,
          destructive && styles.deleteText,
          locked && styles.mutedText,
        ]}
      >
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
  fieldId,
  focusedFieldId,
  keyboardType,
  label,
  multiline,
  onChangeText,
  onPress,
  setFocusedFieldId,
  value,
  wide,
}: {
  fieldId: string;
  focusedFieldId: string | null;
  icon?: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  keyboardType?: "default" | "decimal-pad" | "number-pad";
  label: string;
  multiline?: boolean;
  onChangeText: (value: string) => void;
  onPress?: () => void;
  setFocusedFieldId: (fieldId: string | null) => void;
  value: string;
  wide?: boolean;
}) {
  const focused = focusedFieldId === fieldId;

  return (
    <View style={[styles.workoutInputWrap, wide && styles.wideInput]}>
      <Text style={styles.inputLabel}>{label}</Text>
      {onPress ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setFocusedFieldId(fieldId);
            onPress();
          }}
          style={({ pressed }) => [
            styles.workoutInput,
            styles.pressableWorkoutInput,
            focused && styles.inputFocused,
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
          onBlur={() => setFocusedFieldId(null)}
          onChangeText={onChangeText}
          onFocus={() => setFocusedFieldId(fieldId)}
          placeholderTextColor={colors.textSecondary}
          style={[
            styles.workoutInput,
            focused && styles.inputFocused,
            multiline && styles.multilineInput,
          ]}
          textAlignVertical={multiline ? "top" : "center"}
          value={value}
        />
      )}
    </View>
  );
}

function SetInput({
  fieldId,
  focusedFieldId,
  placeholder,
  keyboardType,
  multiline,
  onContentSizeChange,
  onChangeText,
  setFocusedFieldId,
  style,
  value,
  width,
}: {
  fieldId: string;
  focusedFieldId: string | null;
  placeholder?: string;
  keyboardType?: "default" | "decimal-pad" | "number-pad";
  multiline?: boolean;
  onContentSizeChange?: (height: number) => void;
  onChangeText: (value: string) => void;
  setFocusedFieldId: (fieldId: string | null) => void;
  style?: StyleProp<TextStyle>;
  value: string;
  width?: number;
}) {
  const focused = focusedFieldId === fieldId;

  return (
    <View
      style={[
        styles.setInputWrap,
        width ? { width } : null,
        multiline && styles.notesInputWrap,
      ]}
    >
      <TextInput
        keyboardType={keyboardType}
        multiline={multiline}
        onBlur={() => setFocusedFieldId(null)}
        onContentSizeChange={
          onContentSizeChange
            ? (event) => {
                const height = event.nativeEvent.contentSize.height;
                onContentSizeChange(height);
              }
            : undefined
        }
        onChangeText={onChangeText}
        onFocus={() => setFocusedFieldId(fieldId)}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        scrollEnabled={multiline}
        style={[
          styles.setInput,
          width ? { width } : null,
          focused && styles.inputFocused,
          style,
        ]}
        textAlignVertical={multiline ? "top" : "center"}
        value={value}
      />
    </View>
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
    height: 42,
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
  autosaveStatusText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0,
    marginTop: 1,
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
  inputFocused: {
    borderColor: colors.accent,
    borderWidth: 1.5,
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
  emptyWorkoutState: {
    alignItems: "center",
    justifyContent: "flex-end",
    minHeight: 300,
    paddingBottom: 34,
  },
  addExerciseButton: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    flexDirection: "row",
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 18,
  },
  addExerciseButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: "800",
  },
  addExerciseInlineButton: {
    alignItems: "center",
    alignSelf: "center",
    borderColor: "rgba(91, 212, 224, 0.45)",
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: 7,
    marginTop: 10,
    minHeight: 44,
    paddingHorizontal: 16,
  },
  addExerciseInlineText: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: "800",
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
  setInputWrap: {
    width: 58,
  },
  notesInputWrap: {
    flex: 1,
    minWidth: 80,
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
    color: colors.textPrimary,
    lineHeight: 19,
    maxHeight: 120,
    height: 38,
    minWidth: 80,
    paddingTop: 9,
    paddingBottom: 9,
    textAlign: "left",
    textAlignVertical: "center",
    width: "100%",
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
