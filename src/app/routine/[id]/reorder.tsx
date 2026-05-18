import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { RoutineExercise, useRoutines } from "@/state/routines";
import { colors } from "@/theme/colors";
import { radius } from "@/theme/radius";
import { spacing } from "@/theme/spacing";

// The true physical height of a row: 62 (height) + 4 (marginBottom)
const ITEM_HEIGHT = 66;

function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityLabel="Go back"
      accessibilityRole="button"
      onPress={onPress}
      style={styles.backButton}
    >
      <Text style={styles.backText}>←</Text>
    </Pressable>
  );
}

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

  // Determine if this specific "bystander" card needs to shift up or down to make room
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

  const dragY = useRef(new Animated.Value(0)).current;
  const shiftAnim = useRef(new Animated.Value(0)).current;

  // THE FIX: Store EVERYTHING in the ref so the PanResponder never gets destroyed
  const gestureStateRef = useRef({
    index,
    hoverIndex,
    onDragStart,
    onHoverIndexChange,
    onDrop,
  });

  // Keep it synced with the latest render
  gestureStateRef.current = {
    index,
    hoverIndex,
    onDragStart,
    onHoverIndexChange,
    onDrop,
  };

  // Smoothly slide the bystander cards out of the way
  useEffect(() => {
    let toValue = 0;
    if (isShiftedUp) toValue = -ITEM_HEIGHT;
    else if (isShiftedDown) toValue = ITEM_HEIGHT;

    Animated.spring(shiftAnim, {
      toValue,
      useNativeDriver: true,
      bounciness: 0,
      speed: 16,
    }).start();
  }, [isShiftedUp, isShiftedDown, shiftAnim]);

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
          const dropOffset =
            (finalHover - gestureStateRef.current.index) * ITEM_HEIGHT;

          // Smoothly snap the dragged card into its final resting slot
          Animated.spring(dragY, {
            toValue: dropOffset,
            useNativeDriver: true,
            bounciness: 0,
            speed: 20,
          }).start(() => {
            dragY.setValue(0);
            shiftAnim.setValue(0);
            gestureStateRef.current.onDrop(
              gestureStateRef.current.index,
              finalHover,
            );
          });
        },
        onPanResponderTerminate: () => {
          Animated.spring(dragY, { toValue: 0, useNativeDriver: true }).start(
            () => {
              dragY.setValue(0);
              shiftAnim.setValue(0);
              gestureStateRef.current.onDrop(
                gestureStateRef.current.index,
                gestureStateRef.current.index,
              );
            },
          );
        },
      }),
    // NO CALLBACKS IN THIS ARRAY! This prevents the glitching mid-drag.
    [dragY, shiftAnim, itemCount],
  );

  const translateY = isDragging ? dragY : shiftAnim;

  return (
    <Animated.View
      style={[
        styles.row,
        isDragging && styles.rowActive,
        {
          transform: [{ translateY }],
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
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getRoutine, moveExerciseToIndex } = useRoutines();
  const routine = getRoutine(id);

  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const exercises = routine?.exercises ?? [];

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <BackButton onPress={() => router.back()} />
          <Text style={styles.title}>Reorder</Text>
        </View>

        <View style={styles.list}>
          {exercises.map((exercise, index) => (
            <ReorderRow
              key={exercise.id}
              draggingIndex={draggingIndex}
              exercise={exercise}
              hoverIndex={hoverIndex}
              index={index}
              itemCount={exercises.length}
              onDragStart={(idx) => {
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
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 18,
    paddingBottom: 22,
    paddingHorizontal: spacing.xxl,
    paddingTop: 8,
  },
  backButton: {
    alignItems: "center",
    height: 30,
    justifyContent: "center",
    width: 32,
  },
  backText: { color: colors.accent, fontSize: 28, lineHeight: 30 },
  title: {
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: "400",
    letterSpacing: 0,
  },
  list: {
    paddingHorizontal: spacing.xxl,
  },
  row: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    flexDirection: "row",
    justifyContent: "space-between",
    height: 62,
    marginBottom: 4,
    paddingLeft: 20,
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
  handle: {
    gap: 4,
    padding: 16,
  },
  handleLine: {
    backgroundColor: colors.accent,
    borderRadius: radius.xs,
    height: 2,
    width: 24,
  },
});
