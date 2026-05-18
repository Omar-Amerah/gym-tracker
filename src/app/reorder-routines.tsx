import { useRouter } from "expo-router";
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

import { Routine, useRoutines } from "@/state/routines";
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
  itemCount,
  onDragStart,
  onHoverIndexChange,
  onRelease,
  routine,
  startIndex,
}: {
  active: boolean;
  currentIndex: number;
  itemCount: number;
  onDragStart: () => void;
  onHoverIndexChange: (index: number) => void;
  onRelease: () => void;
  routine: Routine;
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

  // Calculate how far the DOM node has physically moved from its original starting slot
  const layoutOffset =
    startIndex !== null ? (currentIndex - startIndex) * ROW_HEIGHT : 0;

  // Subtract the layout shift from the visual translation so the item doesn't get moved twice
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
      <Text style={styles.rowText}>{routine.name}</Text>
      <View {...panResponder.panHandlers} style={styles.handle}>
        <View style={styles.handleLine} />
        <View style={styles.handleLine} />
      </View>
    </Animated.View>
  );
}

export default function ReorderRoutinesScreen() {
  const router = useRouter();
  const { moveRoutineToIndex, routines } = useRoutines();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragStartIndex, setDragStartIndex] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const visibleRoutines = useMemo(() => {
    if (!draggingId || hoverIndex === null) return routines;
    const next = [...routines];
    const from = next.findIndex((routine) => routine.id === draggingId);
    if (from < 0) return routines;
    const [routine] = next.splice(from, 1);
    next.splice(hoverIndex, 0, routine);
    return next;
  }, [draggingId, hoverIndex, routines]);

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <BackButton onPress={() => router.back()} />
          <Text style={styles.title}>Reorder</Text>
        </View>

        <View style={styles.list}>
          {visibleRoutines.map((routine, index) => (
            <ReorderRow
              active={routine.id === draggingId}
              currentIndex={index}
              itemCount={routines.length}
              key={routine.id}
              onDragStart={() => {
                setDraggingId(routine.id);
                setDragStartIndex(index);
                setHoverIndex(index);
              }}
              onHoverIndexChange={(nextIndex) => {
                setHoverIndex(nextIndex);
              }}
              onRelease={() => {
                if (draggingId !== null && hoverIndex !== null) {
                  moveRoutineToIndex(draggingId, hoverIndex);
                }
                setDraggingId(null);
                setDragStartIndex(null);
                setHoverIndex(null);
              }}
              routine={routine}
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
