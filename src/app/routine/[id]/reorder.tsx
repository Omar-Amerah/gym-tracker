import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useRef, useState } from "react";
import {
  Animated,
  LayoutAnimation,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { RoutineExercise, useRoutines } from "@/state/routines";
import { colors } from "@/theme/colors";
import { radius } from "@/theme/radius";
import { spacing } from "@/theme/spacing";

const ROW_HEIGHT = 62;

if (Platform.OS === "android") {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

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
  active,
  currentIndex,
  exercise,
  itemCount,
  onDragStart,
  onHoverIndexChange,
  onRelease,
  startIndex,
}: {
  active: boolean;
  currentIndex: number;
  exercise: RoutineExercise;
  itemCount: number;
  onDragStart: () => void;
  onHoverIndexChange: (index: number) => void;
  onRelease: () => void;
  startIndex: number | null;
}) {
  const dragY = useRef(new Animated.Value(0)).current;
  const targetIndexRef = useRef<number | null>(null);

  // 1. Create a ref to hold all props that might change during a drag
  const gestureStateRef = useRef({
    currentIndex,
    startIndex,
    onDragStart,
    onHoverIndexChange,
    onRelease,
  });

  // 2. Keep the ref perfectly in sync with the latest render
  gestureStateRef.current = {
    currentIndex,
    startIndex,
    onDragStart,
    onHoverIndexChange,
    onRelease,
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 6,
        onPanResponderGrant: () => {
          const { currentIndex, onDragStart } = gestureStateRef.current;
          targetIndexRef.current = currentIndex;
          onDragStart();
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        },
        onPanResponderMove: (_, gesture) => {
          const { currentIndex, startIndex, onHoverIndexChange } =
            gestureStateRef.current;
          const dragOriginIndex = startIndex ?? currentIndex;
          dragY.setValue(gesture.dy);

          const nextIndex = Math.max(
            0,
            Math.min(
              itemCount - 1,
              dragOriginIndex + Math.round(gesture.dy / ROW_HEIGHT),
            ),
          );

          if (nextIndex !== targetIndexRef.current) {
            targetIndexRef.current = nextIndex;
            LayoutAnimation.configureNext(
              LayoutAnimation.Presets.easeInEaseOut,
            );
            onHoverIndexChange(nextIndex);
          }
        },
        onPanResponderRelease: () => {
          Animated.spring(dragY, { toValue: 0, useNativeDriver: true }).start();
          targetIndexRef.current = null;
          gestureStateRef.current.onRelease();
        },
        onPanResponderTerminate: () => {
          Animated.spring(dragY, { toValue: 0, useNativeDriver: true }).start();
          targetIndexRef.current = null;
          gestureStateRef.current.onRelease();
        },
      }),
    [dragY, itemCount], // Only include values that NEVER change
  );

  // 3. Calculate and subtract the layout shift to prevent double-movement
  const layoutOffset =
    startIndex !== null ? (currentIndex - startIndex) * ROW_HEIGHT : 0;
  const translateY = active ? Animated.subtract(dragY, layoutOffset) : 0;

  return (
    <Animated.View
      style={[
        styles.row,
        active && styles.rowActive,
        { transform: [{ translateY }] },
      ]}
    >
      <View style={[styles.positionDot, active && styles.positionDotActive]} />
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

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragStartIndex, setDragStartIndex] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const visibleExercises = useMemo(() => {
    const exercises = routine?.exercises ?? [];
    if (!draggingId || hoverIndex === null) return exercises;
    const next = [...exercises];
    const from = next.findIndex((exercise) => exercise.id === draggingId);
    if (from < 0) return exercises;
    const [exercise] = next.splice(from, 1);
    next.splice(hoverIndex, 0, exercise);
    return next;
  }, [draggingId, hoverIndex, routine?.exercises]);

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <BackButton onPress={() => router.back()} />
          <Text style={styles.title}>Reorder</Text>
        </View>

        <View style={styles.list}>
          {visibleExercises.map((exercise, index) => (
            <ReorderRow
              active={exercise.id === draggingId}
              currentIndex={index}
              exercise={exercise}
              itemCount={routine?.exercises?.length ?? 0}
              key={exercise.id}
              onDragStart={() => {
                setDraggingId(exercise.id);
                setDragStartIndex(index);
                setHoverIndex(index);
              }}
              onHoverIndexChange={(nextIndex) => {
                setHoverIndex(nextIndex);
              }}
              onRelease={() => {
                if (draggingId !== null && hoverIndex !== null) {
                  moveExerciseToIndex(id, draggingId, hoverIndex);
                }
                setDraggingId(null);
                setDragStartIndex(null);
                setHoverIndex(null);
              }}
              startIndex={dragStartIndex}
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
    minHeight: ROW_HEIGHT,
    marginBottom: 4,
    paddingLeft: 12,
    zIndex: 1,
  },
  rowActive: {
    backgroundColor: colors.surfacePressed,
    borderColor: colors.accent,
    borderWidth: StyleSheet.hairlineWidth,
    zIndex: 5,
  },
  positionDot: {
    backgroundColor: colors.border,
    borderRadius: radius.circle,
    height: 7,
    marginRight: 10,
    width: 7,
  },
  positionDotActive: {
    backgroundColor: colors.accent,
  },
  rowText: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: 18,
    fontWeight: "400",
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
