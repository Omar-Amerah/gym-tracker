import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, PanResponder, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryPillButton } from "@/components/action-buttons";
import { colors } from "@/theme/colors";

import { styles } from "../styles";
import type { ActiveWorkoutExercise } from "../types";

const ITEM_HEIGHT = 66;

type ReorderExercisesViewProps = {
  exercises: ActiveWorkoutExercise[];
  onDone: () => void;
  onMoveExerciseToIndex: (exerciseId: string, targetIndex: number) => void;
};

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
          const finalHover =
            gestureStateRef.current.hoverIndex ?? gestureStateRef.current.index;
          gestureStateRef.current.onDrop(
            gestureStateRef.current.index,
            finalHover,
          );
          requestAnimationFrame(() => dragY.setValue(0));
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

export function ReorderExercisesView({
  exercises,
  onDone,
  onMoveExerciseToIndex,
}: ReorderExercisesViewProps) {
  const [draggingExerciseIndex, setDraggingExerciseIndex] = useState<
    number | null
  >(null);
  const [hoverExerciseIndex, setHoverExerciseIndex] = useState<number | null>(
    null,
  );
  const [displayExercises, setDisplayExercises] =
    useState<ActiveWorkoutExercise[]>(exercises);

  useEffect(() => {
    if (draggingExerciseIndex === null) {
      setDisplayExercises(exercises);
    }
  }, [draggingExerciseIndex, exercises]);

  function moveDisplayExercise(fromIdx: number, toIdx: number) {
    const nextExercises = [...displayExercises];
    const [movedExercise] = nextExercises.splice(fromIdx, 1);
    if (!movedExercise) return displayExercises;

    const boundedIndex = Math.max(0, Math.min(toIdx, nextExercises.length));
    nextExercises.splice(boundedIndex, 0, movedExercise);
    return nextExercises;
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Back to workout"
            accessibilityRole="button"
            onPress={onDone}
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

          <PrimaryPillButton
            accessibilityLabel="Done reordering"
            label="DONE"
            minWidth={84}
            onPress={onDone}
          />
        </View>

        <View style={styles.reorderList}>
          {displayExercises.map((exercise, index) => (
            <ReorderWorkoutRow
              key={exercise.id}
              draggingIndex={draggingExerciseIndex}
              exercise={exercise}
              hoverIndex={hoverExerciseIndex}
              index={index}
              itemCount={displayExercises.length}
              onDragStart={(idx) => {
                if (draggingExerciseIndex !== null) return;
                setDraggingExerciseIndex(idx);
                setHoverExerciseIndex(idx);
              }}
              onHoverIndexChange={setHoverExerciseIndex}
              onDrop={(fromIdx, toIdx) => {
                if (fromIdx !== toIdx) {
                  const movedExercise = displayExercises[fromIdx];
                  const nextExercises = moveDisplayExercise(fromIdx, toIdx);

                  setDisplayExercises(nextExercises);
                  setDraggingExerciseIndex(null);
                  setHoverExerciseIndex(null);

                  if (movedExercise) {
                    onMoveExerciseToIndex(movedExercise.id, toIdx);
                  }
                  return;
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
