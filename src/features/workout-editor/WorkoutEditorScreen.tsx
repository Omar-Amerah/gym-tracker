import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  BackHandler,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import {
  PrimaryPillButton,
  SecondaryOutlineButton,
} from "@/components/action-buttons";
import type { ExerciseRecord } from "@/db/schema";
import { deleteWorkout, markWorkoutCompleted } from "@/db/workoutsRepository";
import {
  cancelWorkoutReminderNotifications,
  prepareWorkoutReminderNotifications,
} from "@/notifications/workoutReminderNotifications";
import {
  registerActiveWorkoutAddExerciseHandler,
  registerActiveWorkoutReplacementHandler,
} from "@/state/activeWorkoutSelection";
import { ExerciseOptionsSheet } from "./components/ExerciseOptionsSheet";
import { ExerciseSection } from "./components/ExerciseSection";
import { FinishWorkoutSummarySheet } from "./components/FinishWorkoutSummarySheet";
import {
  MiniRestTimerBar
} from "./components/MiniRestTimerBar";
import { ReorderExercisesView } from "./components/ReorderExercisesView";
import { RestTimerModal } from "./components/RestTimerModal";
import { SetOptionsSheet } from "./components/SetOptionsSheet";
import { WorkoutDatePickerSheet } from "./components/WorkoutDatePickerSheet";
import { WorkoutDetailsForm } from "./components/WorkoutDetailsForm";
import { WorkoutHeader } from "./components/WorkoutHeader";
import { WorkoutOptionsSheet } from "./components/WorkoutOptionsSheet";
import { WorkoutTimePickerSheet } from "./components/WorkoutTimePickerSheet";
import {
  buildFinishedWorkoutSummary,
  type FinishedWorkoutSummary,
} from "./finishedWorkoutSummary";
import { useRestTimer } from "./hooks/useRestTimer";
import { styles } from "./styles";
import type {
  ActiveWorkout,
  ActiveWorkoutExercise,
  ActiveWorkoutSet,
  SelectedSet,
  SetField,
  WorkoutField,
} from "./types";
import { usePreviousPerformance } from "./usePreviousPerformance";
import { useWorkoutAutosave } from "./useWorkoutAutosave";
import { useWorkoutLoader } from "./useWorkoutLoader";
import { isWorkoutIncomplete } from "./workoutCompletion";
import { normaliseExerciseType, parseTimeValue } from "./workoutFieldRules";
import {
  buildWorkoutPayload,
  createClearedReplacementSets,
  createDefaultExerciseFromRecord,
  createId,
  formatDateField,
  formatDisplayDate,
  formatTimeField,
  parseDateField,
  parseTimeField,
} from "./workoutUtils";

export function WorkoutEditorScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const router = useRouter();

  const [workout, setWorkout] = useState<ActiveWorkout | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [isSavingWorkout, setIsSavingWorkout] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [timePickerTarget, setTimePickerTarget] = useState<
    "startTime" | "endTime" | null
  >(null);
  const [, setFocusedFieldId] = useState<string | null>(null);
  const [workoutMenuOpen, setWorkoutMenuOpen] = useState(false);
  const [restTimerOpen, setRestTimerOpen] = useState(false);
  const [hasOpenedRestTimer, setHasOpenedRestTimer] = useState(false);
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
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [noteHeights, setNoteHeights] = useState<Record<string, number>>({});
  const [validationAttempted, setValidationAttempted] = useState(false);
  const [finishSummary, setFinishSummary] =
    useState<FinishedWorkoutSummary | null>(null);
  const exerciseNoteRefs = useRef<Record<string, TextInput | null>>({});
  const scrollViewRef = useRef<ScrollView | null>(null);
  const scrollYRef = useRef(0);
  const scrollFocusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const isRoutingToLogRef = useRef(false);
  const isDeletingWorkoutRef = useRef(false);
  const isFinishingWorkoutRef = useRef(false);
  const restTimer = useRestTimer();
  const { stopTimer } = restTimer;
  const { previousPerformance } = usePreviousPerformance(workout);
  const {
    autosaveStatus,
    cancelPendingAutosave,
    markPayloadAsSaved,
    markWorkoutAsSaved,
    setAutosaveStatus,
    waitForPendingAutosave,
  } = useWorkoutAutosave({
    isDeletingWorkoutRef,
    isFinishingWorkoutRef,
    workout,
  });
  const { editorKey, isLoadingWorkout } = useWorkoutLoader({
    markWorkoutAsSaved,
    setAutosaveStatus,
    setWorkout,
  });

  useEffect(() => {
    setValidationAttempted(false);
  }, [editorKey]);

  useEffect(() => {
    if (workout?.status === "draft") {
      void prepareWorkoutReminderNotifications();
    }
  }, [workout?.id, workout?.status]);

  useEffect(() => {
    setHasOpenedRestTimer(false);
    setRestTimerOpen(false);
    stopTimer();
  }, [editorKey, stopTimer]);

  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      "keyboardDidShow",
      (event) => {
        setKeyboardHeight(event.endCoordinates.height);
      },
    );
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
      if (scrollFocusTimeoutRef.current) {
        clearTimeout(scrollFocusTimeoutRef.current);
      }
    };
  }, []);

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

  const updateWorkoutField = useCallback(
    (field: WorkoutField, value: string) => {
      setWorkout((current) =>
        current ? { ...current, [field]: value } : current,
      );
    },
    [],
  );

  const updateSetField = useCallback(
    (exerciseId: string, setId: string, field: SetField, value: string) => {
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
    },
    [],
  );

  const updateSetTimeField = useCallback(
    (exerciseId: string, setId: string, value: string) => {
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
    },
    [],
  );

  const updateExerciseNote = useCallback(
    (exerciseId: string, value: string) => {
      setWorkout((current) => {
        if (!current) return current;

        return {
          ...current,
          exercises: current.exercises.map((exercise) =>
            exercise.id === exerciseId
              ? { ...exercise, notes: value }
              : exercise,
          ),
        };
      });
    },
    [],
  );

  const addSetToExercise = useCallback((exerciseId: string) => {
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
  }, []);

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

  const saveFinishedWorkout = async (
    candidate: ActiveWorkout,
    { navigateAfterSave = true } = {},
  ) => {
    if (isSavingWorkout || !candidate.id) return;

    isFinishingWorkoutRef.current = true;
    cancelPendingAutosave();
    setIsSavingWorkout(true);
    try {
      await waitForPendingAutosave();
      const payload = buildWorkoutPayload(candidate);
      const completedPayload = {
        ...payload,
        status: "completed",
      } as const;
      const summary = navigateAfterSave
        ? await buildFinishedWorkoutSummary(candidate)
        : null;
      await markWorkoutCompleted(candidate.id, completedPayload);
      markPayloadAsSaved(completedPayload);
      void cancelWorkoutReminderNotifications({ dismissPresented: true });
      if (navigateAfterSave) {
        setFinishSummary(summary);
      }
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

    if (isWorkoutIncomplete(workout)) {
      setValidationAttempted(true);
      Alert.alert(
        "Finish incomplete workout?",
        "Some sets are missing required values. Finish anyway?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Finish Anyway",
            onPress: () => completeWorkout(workout),
          },
        ],
      );
      return;
    }

    completeWorkout(workout);
  };

  const completeWorkout = (candidate: ActiveWorkout) => {
    const completedWorkout = {
      ...candidate,
      status: "completed" as const,
      endTime: candidate.endTime || formatTimeField(new Date()),
    };
    isFinishingWorkoutRef.current = true;
    setWorkout(completedWorkout);
    void saveFinishedWorkout(completedWorkout);
  };

  const routeToLog = useCallback(() => {
    if (isRoutingToLogRef.current) return;

    isRoutingToLogRef.current = true;
    router.replace("/");
  }, [router]);

  const requestLeaveWorkout = useCallback(() => {
    routeToLog();
  }, [routeToLog]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        () => {
          routeToLog();
          return true;
        },
      );

      return () => subscription.remove();
    }, [routeToLog]),
  );

  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (event) => {
      if (isRoutingToLogRef.current) return;

      event.preventDefault();
      routeToLog();
    });

    return unsubscribe;
  }, [navigation, routeToLog]);

  const openDatePicker = useCallback(() => {
    if (!workout) return;
    setCalendarMonth(parseDateField(workout.date));
    setDatePickerOpen(true);
  }, [workout]);

  const selectCalendarDay = useCallback(
    (day: number) => {
      const selectedDate = new Date(
        calendarMonth.getFullYear(),
        calendarMonth.getMonth(),
        day,
      );
      updateWorkoutField("date", formatDateField(selectedDate));
      setDatePickerOpen(false);
      setFocusedFieldId(null);
    },
    [calendarMonth, updateWorkoutField],
  );

  const moveCalendarMonth = useCallback((direction: -1 | 1) => {
    setCalendarMonth(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + direction, 1),
    );
  }, []);

  const updateSelectedTime = useCallback(
    (part: "hour" | "minute", value: string) => {
      if (!timePickerTarget || !workout) return;

      const currentTime =
        workout[timePickerTarget] || formatTimeField(new Date());
      const parsed = parseTimeField(currentTime);
      const nextTime =
        part === "hour"
          ? `${value}:${parsed.minute}`
          : `${parsed.hour}:${value}`;

      updateWorkoutField(timePickerTarget, nextTime);
    },
    [timePickerTarget, updateWorkoutField, workout],
  );

  const moveExerciseToIndex = useCallback(
    (exerciseId: string, targetIndex: number) => {
      setWorkout((current) => {
        if (!current) return current;

        const currentIndex = current.exercises.findIndex(
          (exercise) => exercise.id === exerciseId,
        );
        if (currentIndex < 0) return current;

        const exercises = [...current.exercises];
        const [exercise] = exercises.splice(currentIndex, 1);
        const boundedIndex = Math.max(
          0,
          Math.min(targetIndex, exercises.length),
        );
        exercises.splice(boundedIndex, 0, exercise);

        return {
          ...current,
          exercises,
        };
      });
    },
    [],
  );

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

  const openExerciseReorder = useCallback(() => {
    setWorkoutMenuOpen(false);
    setSelectedExerciseId(null);
    setIsReorderingExercises(true);
  }, []);

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
                void cancelWorkoutReminderNotifications({
                  dismissPresented: true,
                });
                routeToLog();
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

  const openExerciseReplacement = useCallback(() => {
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
  }, [editorKey, router, selectedExerciseId]);

  const openAddExercise = useCallback(() => {
    router.push({
      pathname: "/select-exercise",
      params: {
        activeWorkoutRoutineId: editorKey,
        mode: "active-workout-add",
      },
    });
  }, [editorKey, router]);

  const focusExerciseNote = useCallback((exerciseId: string) => {
    setExerciseNoteTargetId(exerciseId);
    setSelectedExerciseId(null);
    setTimeout(() => {
      exerciseNoteRefs.current[exerciseId]?.focus();
    }, 180);
  }, []);

  const openExerciseHistory = useCallback(
    (exercise: ActiveWorkoutExercise | null) => {
      if (!exercise) return;

      setSelectedExerciseId(null);
      router.push({
        pathname: "/exercise-history",
        params: {
          exerciseId: exercise.exerciseId ?? "",
          exerciseName: exercise.name,
        },
      });
    },
    [router],
  );

  const openExerciseStatistics = useCallback(
    (exercise: ActiveWorkoutExercise | null) => {
      if (!exercise) return;

      setSelectedExerciseId(null);
      router.push({
        pathname: "/statistics",
        params: {
          exerciseId: exercise.exerciseId ?? "",
          exerciseName: exercise.name,
          scrollTo: "exercise",
        },
      });
    },
    [router],
  );

  const getSetNoteHeight = useCallback((contentHeight: number) => {
    const DEFAULT_HEIGHT = 38;
    const MAX_HEIGHT = 88;
    const ONE_LINE_THRESHOLD = 44;
    const VERTICAL_PADDING = 4;

    if (contentHeight <= ONE_LINE_THRESHOLD) {
      return DEFAULT_HEIGHT;
    }

    return Math.min(
      MAX_HEIGHT,
      Math.max(DEFAULT_HEIGHT, Math.ceil(contentHeight) + VERTICAL_PADDING),
    );
  }, []);

  const getExerciseNoteHeight = useCallback((contentHeight: number) => {
    const DEFAULT_HEIGHT = 48;
    const ONE_LINE_THRESHOLD = 48;
    const VERTICAL_PADDING = 22;

    if (contentHeight <= ONE_LINE_THRESHOLD) {
      return DEFAULT_HEIGHT;
    }

    return Math.max(DEFAULT_HEIGHT, Math.ceil(contentHeight) + VERTICAL_PADDING);
  }, []);

  const scrollFocusedInputIntoView = useCallback(
    (_fieldId: string, inputRef: TextInput | null) => {
      if (!inputRef) return;

      if (scrollFocusTimeoutRef.current) {
        clearTimeout(scrollFocusTimeoutRef.current);
      }

      scrollFocusTimeoutRef.current = setTimeout(
        () => {
          inputRef.measureInWindow((_x, y, _width, _height) => {
            const targetY = insets.top + 125;
            const nextScrollY = scrollYRef.current + y - targetY;

            scrollViewRef.current?.scrollTo({
              y: Math.max(0, nextScrollY),
              animated: true,
            });
          });
        },
        Platform.OS === "android" ? 70 : 40,
      );
    },
    [insets.top],
  );
  const updateExerciseNoteHeight = useCallback(
    (exerciseId: string, height: number) => {
      const nextHeight = getExerciseNoteHeight(height);
      const key = `exercise-${exerciseId}`;

      setNoteHeights((current) =>
        current[key] === nextHeight
          ? current
          : {
              ...current,
              [key]: nextHeight,
            },
      );
    },
    [getExerciseNoteHeight],
  );

  const updateSetNoteHeight = useCallback(
    (setId: string, height: number) => {
      const nextHeight = getSetNoteHeight(height);

      setNoteHeights((current) =>
        current[setId] === nextHeight
          ? current
          : {
              ...current,
              [setId]: nextHeight,
            },
      );
    },
    [getSetNoteHeight],
  );

  const openRestTimer = useCallback(() => {
    setHasOpenedRestTimer(true);
    setRestTimerOpen(true);
  }, []);

  const stopRestTimer = useCallback(() => {
    stopTimer();
    setHasOpenedRestTimer(false);
  }, [stopTimer]);

  const openSetOptions = useCallback((exerciseId: string, setId: string) => {
    setSelectedSet({ exerciseId, setId });
  }, []);

  const setExerciseNoteRef = useCallback(
    (exerciseId: string, ref: TextInput | null) => {
      exerciseNoteRefs.current[exerciseId] = ref;
    },
    [],
  );

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

  if (!workout) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            {isLoadingWorkout ? "Loading..." : "Workout not found."}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isReorderingExercises) {
    return (
      <ReorderExercisesView
        exercises={workout.exercises}
        onDone={() => setIsReorderingExercises(false)}
        onMoveExerciseToIndex={moveExerciseToIndex}
      />
    );
  }

  const miniRestTimerVisible =
    hasOpenedRestTimer &&
    workout.status === "draft" &&
    !restTimerOpen &&
    keyboardHeight === 0 &&
    restTimer.remainingSeconds > 0;

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.screen}
      >
        <WorkoutHeader
          autosaveStatus={autosaveStatus}
          isSavingWorkout={isSavingWorkout}
          onBack={requestLeaveWorkout}
          onFinish={finishWorkout}
          onOpenWorkoutMenu={() => setWorkoutMenuOpen(true)}
          onTimerPress={
            workout.status === "draft"
              ? openRestTimer
              : undefined
          }
          title={headerTitle}
          workoutStatus={workout.status}
        />

        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={[
            styles.content,
            {
              paddingBottom:
                keyboardHeight > 0
                  ? keyboardHeight + insets.bottom + 180
                  : 140 + insets.bottom + (miniRestTimerVisible ? 112 : 0),
            },
          ]}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          onScroll={(event) => {
            scrollYRef.current = event.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
        >
          <WorkoutDetailsForm
            onFocusScroll={scrollFocusedInputIntoView}
            onOpenDatePicker={openDatePicker}
            setTimePickerTarget={setTimePickerTarget}
            updateWorkoutField={updateWorkoutField}
            workout={workout}
          />
          <View style={styles.exerciseList}>
            {workout.exercises.length === 0 ? (
              <View style={styles.emptyWorkoutState}>
                <PrimaryPillButton
                  accessibilityLabel="Add exercise"
                  icon="plus"
                  label="Add Exercise"
                  minWidth={190}
                  onPress={openAddExercise}
                />
              </View>
            ) : null}
            {workout.exercises.map((exercise) => (
              <ExerciseSection
                key={exercise.id}
                exercise={exercise}
                exerciseNoteTargetId={exerciseNoteTargetId}
                onFocusScroll={scrollFocusedInputIntoView}
                noteHeights={noteHeights}
                onAddSet={addSetToExercise}
                onExerciseNoteHeight={updateExerciseNoteHeight}
                onHistory={openExerciseHistory}
                onOpenExerciseOptions={setSelectedExerciseId}
                onOpenSetOptions={openSetOptions}
                onSetNoteHeight={updateSetNoteHeight}
                onUpdateExerciseNote={updateExerciseNote}
                onUpdateSetField={updateSetField}
                onUpdateSetTimeField={updateSetTimeField}
                previousPerformance={previousPerformance[exercise.id]}
                setExerciseNoteRef={setExerciseNoteRef}
                validationAttempted={validationAttempted}
              />
            ))}
          </View>
          {workout.exercises.length > 0 ? (
            <SecondaryOutlineButton
              accessibilityLabel="Add exercise"
              icon="plus"
              label="Add Exercise"
              minWidth={190}
              onPress={openAddExercise}
              style={styles.addExerciseFooter}
            />
          ) : null}
        </ScrollView>

        <WorkoutDatePickerSheet
          calendarMonth={calendarMonth}
          onClose={() => {
            setDatePickerOpen(false);
            setFocusedFieldId(null);
          }}
          onMoveMonth={moveCalendarMonth}
          onSelectDay={selectCalendarDay}
          selectedDate={selectedDate}
          visible={datePickerOpen}
        />

        <WorkoutTimePickerSheet
          currentTime={timePickerTarget ? workout[timePickerTarget] : ""}
          onClose={() => {
            setTimePickerTarget(null);
            setFocusedFieldId(null);
          }}
          onSetNow={() => {
            if (!timePickerTarget) return;
            updateWorkoutField(timePickerTarget, formatTimeField(new Date()));
            setTimePickerTarget(null);
            setFocusedFieldId(null);
          }}
          onUpdateTime={updateSelectedTime}
          target={timePickerTarget}
          visible={timePickerTarget !== null}
        />

        <SetOptionsSheet
          onChangeSetType={updateSetType}
          onClose={() => setSelectedSet(null)}
          onCopyOnce={copySetOnce}
          onDelete={confirmRemoveSetFromExercise}
          selectedSet={selectedSet}
          selectedSetData={selectedSetData}
          visible={selectedSet !== null}
        />

        <WorkoutOptionsSheet
          onClose={() => setWorkoutMenuOpen(false)}
          onDeleteWorkout={confirmDeleteWorkout}
          onReorder={openExerciseReorder}
          visible={workoutMenuOpen}
        />

        <ExerciseOptionsSheet
          onAddNote={() => {
            if (!selectedExerciseId) return;
            focusExerciseNote(selectedExerciseId);
          }}
          onClose={() => setSelectedExerciseId(null)}
          onDelete={() => {
            if (!selectedExercise) return;
            deleteExerciseFromWorkout(selectedExercise.id);
          }}
          onHistory={() => openExerciseHistory(selectedExercise)}
          onReorder={openExerciseReorder}
          onReplace={openExerciseReplacement}
          onStatistics={() => openExerciseStatistics(selectedExercise)}
          selectedExercise={selectedExercise}
          visible={selectedExerciseId !== null}
        />

        <FinishWorkoutSummarySheet
          onDone={() => {
            setFinishSummary(null);
            routeToLog();
          }}
          summary={finishSummary}
          visible={finishSummary !== null}
        />

        <RestTimerModal
          onClose={() => setRestTimerOpen(false)}
          timer={restTimer}
          visible={restTimerOpen && workout.status === "draft"}
        />

        <MiniRestTimerBar
          isRunning={restTimer.isRunning}
          onOpen={openRestTimer}
          onStop={stopRestTimer}
          onToggle={restTimer.toggleTimer}
          remainingSeconds={restTimer.remainingSeconds}
          visible={miniRestTimerVisible}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
