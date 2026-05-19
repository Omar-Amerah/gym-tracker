import { useLocalSearchParams } from "expo-router";
import { useMemo, useRef, useState } from "react";
import { Animated, PanResponder, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppHeader } from "@/components/app-header";
import { RoutineExercise, useRoutines } from "@/state/routines";
import { colors } from "@/theme/colors";
import { radius } from "@/theme/radius";
import { spacing } from "@/theme/spacing";
import { backOrReplace } from "@/utils/navigation";

// The true physical height of a row: 62 (height) + 4 (marginBottom)
const ITEM_HEIGHT = 66;

function ReorderRow({
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
  exercise: RoutineExercise;
  hoverIndex: number | null;
  index: number;
  itemCount: number;
  onDragStart: (index: number) => void;
  onDrop: (fromIndex: number, toIndex: number) => void;
  onHoverIndexChange: (index: number) => void;
}) {
  const isDragging = draggingIndex === index;

  // Pure instant math - no springs or effects needed!
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
          dragY.setValue(0); // Instantly snap back visual offset
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
        styles.row,
        isDragging && styles.rowActive,
        {
          transform: [{ translateY: isDragging ? dragY : shiftOffset }],
          zIndex: isDragging ? 10 : 1,
        },
      ]}
    >
      <Text style={styles.rowText}>{exercise.name}</Text>
      <View {...panResponder.panHandlers} style={styles.handle}>
        <View style={styles.handleLine} />
        <View style={styles.handleLine} />
      </View>
    </Animated.View>
  );
}

export default function ReorderExercisesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getRoutine, isLoading, moveExerciseToIndex } = useRoutines();
  const routine = getRoutine(id);

  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const exercises = routine?.exercises ?? [];

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <View style={styles.screen}>
        <AppHeader
          leftAction="back"
          onBackPress={() =>
            backOrReplace({
              pathname: "/routine/[id]",
              params: { id },
            })
          }
          title="Reorder"
        />

        <View style={styles.list}>
          {isLoading ? <Text style={styles.emptyText}>Loading...</Text> : null}
          {exercises.map((exercise, index) => (
            <ReorderRow
              key={exercise.id}
              draggingIndex={draggingIndex}
              exercise={exercise}
              hoverIndex={hoverIndex}
              index={index}
              itemCount={exercises.length}
              onDragStart={(idx) => {
                // Prevent grabbing a second item while one is already active
                if (draggingIndex !== null) return;
                setDraggingIndex(idx);
                setHoverIndex(idx);
              }}
              onHoverIndexChange={(idx) => {
                setHoverIndex(idx);
              }}
              onDrop={(fromIdx, toIdx) => {
                if (fromIdx !== toIdx) {
                  moveExerciseToIndex(id, exercises[fromIdx].id, toIdx);
                }
                setDraggingIndex(null);
                setHoverIndex(null);
              }}
            />
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  screen: { flex: 1, backgroundColor: colors.background },
  list: { paddingHorizontal: spacing.xxl, paddingTop: 8 },
  row: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    flexDirection: "row",
    justifyContent: "space-between",
    height: 62,
    marginBottom: 4,
    paddingLeft: 20,
    zIndex: 1,
  },
  rowActive: {
    backgroundColor: colors.surfacePressed,
    borderColor: colors.accent,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 5,
  },
  rowText: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: 18,
    fontWeight: "500",
    letterSpacing: 0,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 16,
    paddingTop: 24,
    textAlign: "center",
  },
  handle: { gap: 4, padding: 16 },
  handleLine: {
    backgroundColor: colors.accent,
    borderRadius: radius.xs,
    height: 2,
    width: 24,
  },
});
