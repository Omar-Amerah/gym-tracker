import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppHeader } from "@/components/app-header";
import {
  getActiveDraftWorkout,
  listCompletedWorkouts,
  type LoggedWorkout,
} from "@/db/workoutsRepository";
import { animations } from "@/theme/animations";
import { colors } from "@/theme/colors";
import { radius } from "@/theme/radius";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";

export default function LogScreen() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStartingWorkout, setIsStartingWorkout] = useState(false);
  const [activeDraft, setActiveDraft] = useState<LoggedWorkout | null>(null);
  const [workouts, setWorkouts] = useState<LoggedWorkout[]>([]);
  const visibleWorkouts = activeDraft ? [activeDraft, ...workouts] : workouts;

  const openWorkout = useCallback(
    (workout: LoggedWorkout) => {
      router.push({
        pathname: "/workout/[workoutId]",
        params: { workoutId: workout.id },
      });
    },
    [router],
  );

  useFocusEffect(
    useCallback(() => {
      let mounted = true;

      setIsLoading(true);
      setIsStartingWorkout(false);
      setError(null);
      Promise.all([listCompletedWorkouts(), getActiveDraftWorkout()])
        .then(([savedWorkouts, draftWorkout]) => {
          if (mounted) {
            setWorkouts(savedWorkouts);
            setActiveDraft(draftWorkout);
          }
        })
        .catch((loadError) => {
          console.error("Failed to load logged workouts", loadError);
          if (mounted) {
            setError("Could not load workouts.");
            setWorkouts([]);
            setActiveDraft(null);
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
          {!isLoading && !error && !activeDraft && workouts.length === 0 ? (
            <Text style={styles.stateText}>No logged workouts yet.</Text>
          ) : null}
          {visibleWorkouts.map((workout, index) => (
            <View key={workout.id} style={styles.entry}>
              <View style={styles.dateColumn}>
                <Text style={styles.weekday}>{workout.weekday}</Text>
                <Text style={styles.day}>{workout.day}</Text>
                <Text style={styles.month}>{workout.month}</Text>
                {index < visibleWorkouts.length - 1 ? (
                  <View style={styles.timelineLine} />
                ) : null}
              </View>

              <Pressable
                accessibilityRole="button"
                onPress={() => openWorkout(workout)}
                style={({ pressed }) => [
                  styles.card,
                  pressed && styles.cardPressed,
                ]}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.workoutTitle}>{workout.name}</Text>
                  {workout.status === "draft" ? (
                    <Text style={styles.draftBadge}>In Progress</Text>
                  ) : (
                    <Text style={styles.duration}>
                      {workout.durationMinutes === null
                        ? "-- min"
                        : `${workout.durationMinutes} min`}
                    </Text>
                  )}
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

        {activeDraft ? (
          <Pressable
            accessibilityLabel="Resume workout"
            accessibilityRole="button"
            onPress={() =>
              router.push({
                pathname: "/workout/[workoutId]",
                params: { workoutId: activeDraft.id },
              })
            }
            style={({ pressed }) => [
              styles.resumePill,
              pressed && styles.resumePillPressed,
            ]}
          >
            <Text style={styles.resumeLabel}>Resume Workout</Text>
            <Text style={styles.resumeTitle}>{activeDraft.name}</Text>
          </Pressable>
        ) : (
          <Pressable
            accessibilityLabel="Start workout"
            accessibilityRole="button"
            disabled={isStartingWorkout}
            onPress={async () => {
              if (isStartingWorkout) return;
              setIsStartingWorkout(true);
              try {
                const draftWorkout = await getActiveDraftWorkout();
                if (draftWorkout) {
                  openWorkout(draftWorkout);
                  return;
                }
                router.push("/workout/new");
              } catch (startError) {
                console.error("Failed to start workout", startError);
                setIsStartingWorkout(false);
              }
            }}
            style={({ pressed }) => [
              styles.floatingAddButton,
              isStartingWorkout && styles.disabledAction,
              pressed && styles.addButtonPressed,
            ]}
          >
            <View style={styles.plusIcon}>
              <View style={styles.plusVertical} />
              <View style={styles.plusHorizontal} />
            </View>
          </Pressable>
        )}
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
    paddingBottom: 96,
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
  draftBadge: {
    color: colors.accent,
    backgroundColor: "rgba(91, 212, 224, 0.12)",
    borderColor: "rgba(91, 212, 224, 0.35)",
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
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
    opacity: animations.pressOpacity,
  },
  disabledAction: {
    opacity: 0.55,
  },
  resumePill: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: colors.fabBackground,
    borderRadius: radius.pill,
    bottom: 18,
    maxWidth: 520,
    minHeight: 54,
    paddingHorizontal: 18,
    paddingVertical: 8,
    position: "absolute",
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    width: "74%",
    zIndex: 20,
  },
  resumePillPressed: {
    opacity: animations.pressOpacity,
  },
  resumeLabel: {
    color: colors.background,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0,
    lineHeight: 18,
  },
  resumeTitle: {
    color: colors.background,
    fontSize: 12,
    letterSpacing: 0,
    lineHeight: 16,
    opacity: 0.72,
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
