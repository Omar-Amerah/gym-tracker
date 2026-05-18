import { useRouter } from 'expo-router';
import { useMemo, useRef } from 'react';
import { Animated, PanResponder, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Routine, useRoutines } from '@/state/routines';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';

const ROW_HEIGHT = 100;

function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <Text accessibilityRole="button" onPress={onPress} style={styles.backText}>
      ←
    </Text>
  );
}

function ReorderRow({ routine }: { routine: Routine }) {
  const { moveRoutine, routines } = useRoutines();
  const dragY = useRef(new Animated.Value(0)).current;
  const startIndex = routines.findIndex((item) => item.id === routine.id);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 6,
        onPanResponderMove: Animated.event([null, { dy: dragY }], { useNativeDriver: false }),
        onPanResponderRelease: (_, gesture) => {
          const steps = Math.max(-startIndex, Math.min(routines.length - 1 - startIndex, Math.round(gesture.dy / ROW_HEIGHT)));
          const direction = steps > 0 ? 'down' : 'up';

          for (let index = 0; index < Math.abs(steps); index += 1) {
            moveRoutine(routine.id, direction);
          }

          Animated.spring(dragY, { toValue: 0, useNativeDriver: true }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(dragY, { toValue: 0, useNativeDriver: true }).start();
        },
      }),
    [dragY, moveRoutine, routine.id, routines.length, startIndex],
  );

  return (
    <Animated.View style={[styles.row, { transform: [{ translateY: dragY }] }]}>
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
  const { routines } = useRoutines();

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <BackButton onPress={() => router.back()} />
          <Text style={styles.title}>Reorder</Text>
        </View>

        <View style={styles.list}>
          {routines.map((routine) => (
            <ReorderRow key={routine.id} routine={routine} />
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
    alignItems: 'center',
    flexDirection: 'row',
    gap: 34,
    paddingBottom: 44,
    paddingHorizontal: spacing.xxl,
    paddingTop: 8,
  },
  backText: {
    color: colors.accent,
    fontSize: 44,
    lineHeight: 48,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 46,
    fontWeight: '400',
    letterSpacing: 0,
  },
  list: {
    paddingHorizontal: spacing.xxl,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: ROW_HEIGHT,
    zIndex: 1,
  },
  rowText: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: 32,
    fontWeight: '400',
    letterSpacing: 0,
  },
  handle: {
    gap: 5,
    padding: 18,
  },
  handleLine: {
    backgroundColor: colors.accent,
    borderRadius: radius.xs,
    height: 3,
    width: 32,
  },
});
