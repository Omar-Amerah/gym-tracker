import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppHeader } from "@/components/app-header";
import {
  listLoggedWorkouts,
  type LoggedWorkout,
} from "@/db/workoutsRepository";
import { colors } from "@/theme/colors";
import { radius } from "@/theme/radius";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";

export default function LogScreen() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [workouts, setWorkouts] = useState<LoggedWorkout[]>([]);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;

      setIsLoading(true);
      setError(null);
      listLoggedWorkouts()
        .then((savedWorkouts) => {
          if (mounted) setWorkouts(savedWorkouts);
        })
        .catch((loadError) => {
          console.error("Failed to load logged workouts", loadError);
          if (mounted) {
            setError("Could not load workouts.");
            setWorkouts([]);
          }
        })
        .finally(() => {
          if (mounted) setIsLoading(false);
        });

      return () => {
        mounted = false;
      };
    }, []),
  );

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={styles.screenRoot}>
        <AppHeader title="Logged Workouts" />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <Text style={styles.stateText}>Loading workouts...</Text>
          ) : null}
          {error ? <Text style={styles.stateText}>{error}</Text> : null}
          {!isLoading && !error && workouts.length === 0 ? (
            <Text style={styles.stateText}>No logged workouts yet.</Text>
          ) : null}
          {workouts.map((workout, index) => (
            <View key={workout.id} style={styles.entry}>
              <View style={styles.dateColumn}>
                <Text style={styles.weekday}>{workout.weekday}</Text>
                <Text style={styles.day}>{workout.day}</Text>
                <Text style={styles.month}>{workout.month}</Text>
                {index < workouts.length - 1 ? (
                  <View style={styles.timelineLine} />
                ) : null}
              </View>

              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.card,
                  pressed && styles.cardPressed,
                ]}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.workoutTitle}>{workout.name}</Text>
                  <Text style={styles.duration}>
                    {workout.durationMinutes === null
                      ? "-- min"
                      : `${workout.durationMinutes} min`}
                  </Text>
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
          onPress={() => router.push("/start-workout")}
          style={({ pressed }) => [
            styles.floatingAddButton,
            pressed && styles.addButtonPressed,
          ]}
        >
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
  screenRoot: {
    flex: 1,
    backgroundColor: colors.background,
    position: "relative",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 0,
  },
  stateText: {
    color: colors.textSecondary,
    fontSize: 16,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xl,
  },
  entry: {
    flexDirection: "row",
    marginBottom: 16,
  },
  dateColumn: {
    alignItems: "center",
    marginTop: 7,
    marginRight: 12,
    marginLeft: 12,
    width: 31,
  },
  weekday: {
    color: colors.textSecondary,
    letterSpacing: 0,
    textTransform: "uppercase",
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
    textTransform: "uppercase",
    ...typography.dateMonth,
  },
  timelineLine: {
    backgroundColor: colors.background,
    flex: 1,
    marginTop: spacing.md,
    minHeight: 48,
    width: 1,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    marginRight: 13,
  },
  cardPressed: {
    backgroundColor: colors.surfacePressed,
  },
  cardHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  workoutTitle: {
    color: colors.textPrimary,
    flex: 1,
    ...typography.workoutTitle,
  },
  duration: {
    color: colors.textSecondary,
    backgroundColor: colors.border,
    borderRadius: radius.pill,
    letterSpacing: 0,
    marginTop: 0,
    overflow: "hidden",
    paddingHorizontal: 7,
    paddingVertical: 2,
    ...typography.duration,
  },
  exerciseList: {
    gap: 0,
  },
  exerciseText: {
    color: colors.textSecondary,
    ...typography.exercise,
  },
  floatingAddButton: {
    alignItems: "center",
    backgroundColor: colors.fabBackground,
    borderRadius: 16,
    bottom: 12,
    height: 58,
    justifyContent: "center",
    position: "absolute",
    right: 24,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.34,
    shadowRadius: 12,
    width: 60,
    zIndex: 20,
  },
  addButtonPressed: {
    opacity: 0.86,
  },
  plusIcon: {
    alignItems: "center",
    height: 22,
    justifyContent: "center",
    width: 22,
  },
  plusVertical: {
    backgroundColor: colors.background,
    borderRadius: radius.xs,
    height: 22,
    position: "absolute",
    width: 2,
  },
  plusHorizontal: {
    backgroundColor: colors.background,
    borderRadius: radius.xs,
    height: 2,
    position: "absolute",
    width: 22,
  },
});
