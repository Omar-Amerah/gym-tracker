import { useMemo, useRef, useState } from "react";
import {
  Animated,
  PanResponder,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppHeader } from "@/components/app-header";
import { Routine, useRoutines } from "@/state/routines";
import { colors } from "@/theme/colors";
import { radius } from "@/theme/radius";
import { spacing } from "@/theme/spacing";
import { backOrReplace } from "@/utils/navigation";

// The true physical height of a row: 62 (height) + 4 (marginBottom)
const ITEM_HEIGHT = 66;

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

  const gestureStateRef = useRef({
    currentIndex,
    startIndex,
    onDragStart,
    onHoverIndexChange,
    onRelease,
  });

  // Keep it synced with the latest render
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
        },
        onPanResponderMove: (_, gesture) => {
          const { currentIndex, startIndex, onHoverIndexChange } =
            gestureStateRef.current;
          const dragOriginIndex = startIndex ?? currentIndex;
          dragY.setValue(gesture.dy);

          // Corrected 66px math ensures the offsets never drift!
          const nextIndex = Math.max(
            0,
            Math.min(
              itemCount - 1,
              dragOriginIndex + Math.round(gesture.dy / ITEM_HEIGHT),
            ),
          );

          if (nextIndex !== targetIndexRef.current) {
            targetIndexRef.current = nextIndex;
            onHoverIndexChange(nextIndex);
          }
        },
        onPanResponderRelease: () => {
          targetIndexRef.current = null;
          dragY.setValue(0);
          gestureStateRef.current.onRelease();
        },
        onPanResponderTerminate: () => {
          targetIndexRef.current = null;
          dragY.setValue(0);
          gestureStateRef.current.onRelease();
        },
      }),
    [dragY, itemCount],
  );

  const layoutOffset =
    startIndex !== null ? (currentIndex - startIndex) * ITEM_HEIGHT : 0;

  const translateY = active ? Animated.subtract(dragY, layoutOffset) : 0;

  return (
    <Animated.View
      style={[
        styles.row,
        active && styles.rowActive,
        {
          transform: [{ translateY }],
          zIndex: active ? 10 : 1,
        },
      ]}
    >
      <Text style={styles.rowText}>{routine.name}</Text>
      <View {...panResponder.panHandlers} style={styles.handle}>
        <View style={styles.handleLine} />
        <View style={styles.handleLine} />
      </View>
    </Animated.View>
  );
}

export default function ReorderRoutinesScreen() {
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
        <AppHeader
          leftAction="back"
          onBackPress={() => backOrReplace("/routines")}
          title="Reorder"
        />

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
                // Clears synchronously, preventing any lockouts
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
  list: {
    paddingHorizontal: spacing.xxl,
    paddingTop: 8,
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
