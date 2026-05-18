import { StyleSheet, View } from 'react-native';

import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';

export type TabName = 'Log' | 'Routines' | 'Statistics';

export function TabIcon({ name, selected }: { name: TabName; selected: boolean }) {
  if (name === 'Log') {
    return (
      <View style={[styles.logIconWrap, selected && styles.logIconWrapSelected]}>
        <View style={[styles.logClock, selected && styles.logClockSelected]}>
          <View style={[styles.logClockHand, selected && styles.logClockHandSelected]} />
          <View style={[styles.logClockTail, selected && styles.logClockTailSelected]} />
        </View>
      </View>
    );
  }

  if (name === 'Routines') {
    return (
      <View style={styles.routineIcon}>
        <View style={styles.routineHandle} />
        <View style={[styles.routinePlate, styles.routinePlateLeftOuter]} />
        <View style={[styles.routinePlate, styles.routinePlateLeftInner]} />
        <View style={[styles.routinePlate, styles.routinePlateRightInner]} />
        <View style={[styles.routinePlate, styles.routinePlateRightOuter]} />
      </View>
    );
  }

  return (
    <View style={styles.statsIcon}>
      <View style={[styles.statsBar, styles.statsBarShort]} />
      <View style={[styles.statsBar, styles.statsBarMedium]} />
      <View style={[styles.statsBar, styles.statsBarTall]} />
    </View>
  );
}

const styles = StyleSheet.create({
  logIconWrap: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 32,
    justifyContent: 'center',
    width: 66,
  },
  logIconWrapSelected: {
    backgroundColor: colors.accentMuted,
  },
  logClock: {
    borderColor: colors.textSecondary,
    borderRadius: radius.circle,
    borderWidth: 2,
    height: 18,
    width: 18,
  },
  logClockSelected: {
    borderColor: colors.textPrimary,
  },
  logClockHand: {
    backgroundColor: colors.textSecondary,
    height: 7,
    left: 7,
    position: 'absolute',
    top: 3,
    width: 2,
  },
  logClockHandSelected: {
    backgroundColor: colors.textPrimary,
  },
  logClockTail: {
    backgroundColor: colors.textSecondary,
    height: 2,
    left: 7,
    position: 'absolute',
    top: 8,
    width: 6,
  },
  logClockTailSelected: {
    backgroundColor: colors.textPrimary,
  },
  routineIcon: {
    height: 23,
    justifyContent: 'center',
    transform: [{ rotate: '-45deg' }],
    width: 23,
  },
  routineHandle: {
    backgroundColor: colors.textSecondary,
    height: 3,
    left: 3,
    position: 'absolute',
    right: 3,
  },
  routinePlate: {
    backgroundColor: colors.textSecondary,
    borderRadius: radius.xs,
    height: 12,
    position: 'absolute',
    width: 3,
  },
  routinePlateLeftOuter: {
    left: 0,
  },
  routinePlateLeftInner: {
    left: 4,
  },
  routinePlateRightInner: {
    right: 4,
  },
  routinePlateRightOuter: {
    right: 0,
  },
  statsIcon: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 2,
    height: 23,
  },
  statsBar: {
    backgroundColor: colors.textSecondary,
    borderRadius: radius.xs,
    width: 5,
  },
  statsBarShort: {
    height: 13,
  },
  statsBarMedium: {
    height: 17,
  },
  statsBarTall: {
    height: 21,
  },
});
