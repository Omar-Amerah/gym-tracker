import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

const workouts = [
  {
    id: '1',
    weekday: 'Sun',
    day: '17',
    month: 'May',
    title: 'Functional/Fencing Day',
    duration: 75,
    exercises: [
      '3x Medball Rotations',
      '3x Plank',
      '3x Pallof Press',
      '3x Diverging Lat Pulldown',
      '3x Face Pulls',
      '3x Rear Delt Fly',
      '3x Cable Reverse Bicep Curls',
      '3x Dumbbell Bicep Curl',
      '2x Wrist Curls',
      '2x Reverse Wrist Curls',
      '2x External Rotation',
    ],
  },
  {
    id: '2',
    weekday: 'Sat',
    day: '16',
    month: 'May',
    title: 'Lower Body',
    duration: 101,
    exercises: [
      '3x Box Jumps',
      '3x Standing Band Knee Drives',
      '3x Squat',
      '3x Romanian Deadlifts',
      '3x Bulgarian Split Squats',
      '3x Calf Raises',
      '3x Cable Woodchops',
    ],
  },
  {
    id: '3',
    weekday: 'Fri',
    day: '15',
    month: 'May',
    title: 'Upper body',
    duration: 98,
    exercises: [
      '3x Bench Press',
      '3x Barbell Row',
      '3x Military Press',
      '3x Single-Arm Landmine Punch Press',
      '3x Diverging Lat Pulldown',
      '3x Pec Fly',
      '3x Face Pulls',
      '3x Pushdowns',
      '3x Cable Lateral Raise',
      '3x Dumbbell Bicep Curl',
    ],
  },
] as const;

export default function LogScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="Open menu" accessibilityRole="button" style={styles.iconButton}>
            <View style={styles.menuLine} />
            <View style={styles.menuLine} />
            <View style={styles.menuLine} />
          </Pressable>
          <Text style={styles.monthTitle}>May</Text>
        </View>

        <ScrollView
          contentContainerStyle={[styles.timeline, { paddingBottom: 102 + insets.bottom }]}
          showsVerticalScrollIndicator={false}>
          {workouts.map((workout, index) => (
            <View key={workout.id} style={styles.entry}>
              <View style={styles.dateColumn}>
                <Text style={styles.weekday}>{workout.weekday}</Text>
                <Text style={styles.day}>{workout.day}</Text>
                <Text style={styles.month}>{workout.month}</Text>
                {index < workouts.length - 1 ? <View style={styles.timelineLine} /> : null}
              </View>

              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
                <View style={styles.cardHeader}>
                  <Text style={styles.workoutTitle}>{workout.title}</Text>
                  <Text style={styles.duration}>{workout.duration} min</Text>
                </View>

                <View style={styles.exerciseList}>
                  {workout.exercises.map((exercise) => (
                    <Text key={exercise} style={styles.exerciseText}>
                      {exercise}
                    </Text>
                  ))}
                </View>
              </Pressable>
            </View>
          ))}
        </ScrollView>

        <Pressable
          accessibilityLabel="Start workout"
          accessibilityRole="button"
          onPress={() => router.push('/start-workout')}
          style={({ pressed }) => [
            styles.addButton,
            { bottom: 88 + insets.bottom },
            pressed && styles.addButtonPressed,
          ]}>
          <View style={styles.plusIcon}>
            <View style={styles.plusVertical} />
            <View style={styles.plusHorizontal} />
          </View>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xl,
    paddingBottom: 31,
    paddingHorizontal: spacing.xl,
    paddingTop: 8,
  },
  iconButton: {
    alignItems: 'center',
    borderRadius: radius.circle,
    height: 23,
    justifyContent: 'center',
    width: 23,
  },
  menuLine: {
    backgroundColor: colors.accent,
    borderRadius: radius.xs,
    height: 2,
    marginVertical: 2,
    width: 19,
  },
  monthTitle: {
    color: colors.textPrimary,
    letterSpacing: 0,
    ...typography.monthTitle,
  },
  timeline: {
    paddingHorizontal: spacing.xxl,
    paddingTop: 0,
  },
  entry: {
    flexDirection: 'row',
    marginBottom: spacing.xxl,
  },
  dateColumn: {
    alignItems: 'center',
    marginRight: spacing.lg,
    width: 31,
  },
  weekday: {
    color: colors.textSecondary,
    letterSpacing: 0,
    textTransform: 'uppercase',
    ...typography.dateWeekday,
  },
  day: {
    color: colors.textPrimary,
    letterSpacing: 0,
    ...typography.dateDay,
  },
  month: {
    color: colors.textSecondary,
    letterSpacing: 0,
    textTransform: 'uppercase',
    ...typography.dateMonth,
  },
  timelineLine: {
    backgroundColor: 'transparent',
    flex: 1,
    marginTop: spacing.md,
    minHeight: 48,
    width: 1,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.lg,
  },
  cardPressed: {
    backgroundColor: colors.surfacePressed,
    transform: [{ scale: 0.99 }],
  },
  cardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  workoutTitle: {
    color: colors.textPrimary,
    flex: 1,
    letterSpacing: 0,
    ...typography.workoutTitle,
  },
  duration: {
    color: colors.textSecondary,
    letterSpacing: 0,
    marginTop: 0,
    ...typography.duration,
  },
  exerciseList: {
    gap: 0,
  },
  exerciseText: {
    color: colors.textPrimary,
    letterSpacing: 0,
    ...typography.exercise,
  },
  addButton: {
    alignItems: 'center',
    backgroundColor: colors.fabBackground,
    borderRadius: 15,
    height: 56,
    justifyContent: 'center',
    position: 'absolute',
    right: spacing.xxl,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.34,
    shadowRadius: 12,
    width: 58,
    zIndex: 10,
  },
  addButtonPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.97 }],
  },
  plusIcon: {
    alignItems: 'center',
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  plusVertical: {
    backgroundColor: colors.background,
    borderRadius: radius.xs,
    height: 20,
    position: 'absolute',
    width: 2,
  },
  plusHorizontal: {
    backgroundColor: colors.background,
    borderRadius: radius.xs,
    height: 2,
    position: 'absolute',
    width: 20,
  },
});
