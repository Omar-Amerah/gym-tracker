import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import { useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import type { ComponentProps } from "react";
import { useCallback, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppHeader } from "@/components/app-header";
import { BottomSheet } from "@/components/bottom-sheet";
import {
  clearAllLocalData,
  exportBackupToCsvText,
  getDatabaseSummary,
  importBackupFromCsvText,
  resetSeedData,
} from "@/db/backupRepository";
import {
  getActiveDraftWorkout,
  listCompletedWorkouts,
  type LoggedWorkout,
} from "@/db/workoutsRepository";
import { useRoutines } from "@/state/routines";
import { animations } from "@/theme/animations";
import { colors } from "@/theme/colors";
import { radius } from "@/theme/radius";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";

export default function LogScreen() {
  const router = useRouter();
  const { refreshRoutines } = useRoutines();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStartingWorkout, setIsStartingWorkout] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [activeDraft, setActiveDraft] = useState<LoggedWorkout | null>(null);
  const [workouts, setWorkouts] = useState<LoggedWorkout[]>([]);
  const visibleWorkouts = activeDraft ? [activeDraft, ...workouts] : workouts;
  const isDataActionRunning = isExporting || isImporting || isClearing;

  const openWorkout = useCallback(
    (workout: LoggedWorkout) => {
      router.push({
        pathname: "/workout/[workoutId]",
        params: { workoutId: workout.id },
      });
    },
    [router],
  );

  const loadLogData = useCallback(async () => {
    const [savedWorkouts, draftWorkout] = await Promise.all([
      listCompletedWorkouts(),
      getActiveDraftWorkout(),
    ]);
    setWorkouts(savedWorkouts);
    setActiveDraft(draftWorkout);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;

      setIsLoading(true);
      setIsStartingWorkout(false);
      setError(null);
      loadLogData()
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
    }, [loadLogData]),
  );

  const refreshAfterDataChange = useCallback(async () => {
    await Promise.all([loadLogData(), refreshRoutines()]);
  }, [loadLogData, refreshRoutines]);

  const exportBackup = useCallback(async () => {
    if (isDataActionRunning) return;

    setMenuOpen(false);
    setIsExporting(true);
    try {
      const csvText = await exportBackupToCsvText();
      const file = new File(Paths.cache, `${createBackupFilename()}.csv`);
      file.create({ overwrite: true });
      file.write(csvText);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          dialogTitle: "Export Gym Tracker Backup",
          mimeType: "text/csv",
        });
      } else {
        Alert.alert("Backup created", file.uri);
      }
    } catch (exportError) {
      console.error("Failed to export backup", exportError);
      Alert.alert("Export failed", "Could not create a backup file.");
    } finally {
      setIsExporting(false);
    }
  }, [isDataActionRunning]);

  const chooseImportFile = useCallback(async () => {
    setIsImporting(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        type: ["text/csv", "text/plain", "text/*", "application/vnd.ms-excel"],
      });
      if (result.canceled) return;

      const asset = result.assets?.[0];
      if (!asset?.uri) {
        Alert.alert("Import failed", "No backup file was selected.");
        return;
      }

      const backupText = await new File(asset.uri).text();
      if (!hasExpectedBackupMarkers(backupText)) {
        Alert.alert(
          "Invalid backup",
          "This file does not look like a Gym Tracker CSV backup.",
        );
        return;
      }

      Alert.alert(
        "Replace local data?",
        "Your current routines, exercises and workout logs will be replaced.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Import",
            style: "destructive",
            onPress: () => {
              setIsImporting(true);
              void importBackupFromCsvText(backupText)
                .then(refreshAfterDataChange)
                .then(() => {
                  Alert.alert("Import complete.");
                })
                .catch((importError) => {
                  console.error("Failed to import backup", importError);
                  Alert.alert(
                    "Import failed",
                    "The backup could not be imported. Your data was not replaced.",
                  );
                })
                .finally(() => setIsImporting(false));
            },
          },
        ],
      );
    } catch (importError) {
      console.error("Failed to choose backup file", importError);
      Alert.alert("Import failed", "Could not read the selected backup file.");
    } finally {
      setIsImporting(false);
    }
  }, [refreshAfterDataChange]);

  const confirmImportBackup = useCallback(() => {
    if (isDataActionRunning) return;

    setMenuOpen(false);
    Alert.alert(
      "Import backup?",
      "This will replace your current local data with the selected backup. Export a backup first if you want to keep your current data.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Choose File",
          onPress: () => {
            void chooseImportFile();
          },
        },
      ],
    );
  }, [chooseImportFile, isDataActionRunning]);

  const confirmClearLocalData = useCallback(() => {
    if (isDataActionRunning) return;

    setMenuOpen(false);
    Alert.alert(
      "Clear local data?",
      "This will permanently delete all routines, exercises and workout logs stored on this device.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => {
            setIsClearing(true);
            void clearAllLocalData()
              .then(refreshAfterDataChange)
              .then(() => Alert.alert("Local data cleared."))
              .catch((clearError) => {
                console.error("Failed to clear local data", clearError);
                Alert.alert("Clear failed", "Could not clear local data.");
              })
              .finally(() => setIsClearing(false));
          },
        },
      ],
    );
  }, [isDataActionRunning, refreshAfterDataChange]);

  const confirmResetSeedData = useCallback(() => {
    if (isDataActionRunning) return;

    setMenuOpen(false);
    Alert.alert(
      "Reset seed data?",
      "This will clear local data and restore the default categories, exercises and routines.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: () => {
            setIsClearing(true);
            void resetSeedData()
              .then(refreshAfterDataChange)
              .then(() => Alert.alert("Seed data restored."))
              .catch((resetError) => {
                console.error("Failed to reset seed data", resetError);
                Alert.alert("Reset failed", "Could not restore seed data.");
              })
              .finally(() => setIsClearing(false));
          },
        },
      ],
    );
  }, [isDataActionRunning, refreshAfterDataChange]);

  const showDatabaseSummary = useCallback(async () => {
    if (isDataActionRunning) return;

    setMenuOpen(false);
    try {
      const summary = await getDatabaseSummary();
      Alert.alert("Database Summary", formatDatabaseSummary(summary));
    } catch (summaryError) {
      console.error("Failed to load database summary", summaryError);
      Alert.alert("Summary failed", "Could not load database counts.");
    }
  }, [isDataActionRunning]);

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={styles.screenRoot}>
        <AppHeader
          onMenuPress={() => setMenuOpen(true)}
          onMorePress={() => setMenuOpen(true)}
          title="Logged Workouts"
        />

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

        <BottomSheet
          onClose={() => setMenuOpen(false)}
          title="Data & Backup"
          visible={menuOpen}
        >
          <BackupAction
            disabled={isDataActionRunning}
            icon="database-export-outline"
            label={isExporting ? "Exporting..." : "Export CSV Backup"}
            onPress={exportBackup}
          />
          <BackupAction
            disabled={isDataActionRunning}
            icon="database-import-outline"
            label={isImporting ? "Importing..." : "Import CSV Backup"}
            onPress={confirmImportBackup}
          />
          <BackupAction
            disabled={isDataActionRunning}
            icon="database-search-outline"
            label="Database Summary"
            onPress={() => {
              void showDatabaseSummary();
            }}
          />
          <BackupAction
            destructive
            disabled={isDataActionRunning}
            icon="trash-can-outline"
            label={isClearing ? "Clearing..." : "Clear Local Data"}
            onPress={confirmClearLocalData}
          />
          <BackupAction
            destructive
            disabled={isDataActionRunning}
            icon="database-refresh-outline"
            label="Reset Seed Data"
            onPress={confirmResetSeedData}
          />
        </BottomSheet>
      </View>
    </SafeAreaView>
  );
}

function BackupAction({
  destructive = false,
  disabled,
  icon,
  label,
  onPress,
}: {
  destructive?: boolean;
  disabled: boolean;
  icon: ComponentProps<typeof MaterialCommunityIcons>["name"];
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.sheetAction,
        disabled && styles.sheetActionDisabled,
        pressed && styles.sheetActionPressed,
      ]}
    >
      <MaterialCommunityIcons
        color={destructive ? "#ffaaa1" : colors.textPrimary}
        name={icon}
        size={24}
        style={styles.sheetIcon}
      />
      <Text style={[styles.sheetText, destructive && styles.deleteText]}>
        {label}
      </Text>
    </Pressable>
  );
}

function createBackupFilename() {
  const date = new Date();
  const value = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
    String(date.getHours()).padStart(2, "0"),
    String(date.getMinutes()).padStart(2, "0"),
  ].join("-");
  return `gym-tracker-backup-${value}`;
}

function hasExpectedBackupMarkers(text: string) {
  return [
    "categories",
    "exercises",
    "routines",
    "routine_exercises",
    "workouts",
    "workout_exercises",
    "workout_sets",
  ].every((table) => text.includes(`# table: ${table}`));
}

function formatDatabaseSummary(summary: Record<string, number>) {
  const labels: Record<string, string> = {
    categories: "Categories",
    exercises: "Exercises",
    routines: "Routines",
    routine_exercises: "Routine Exercises",
    workouts: "Workouts",
    workout_exercises: "Workout Exercises",
    workout_sets: "Workout Sets",
    body_stats: "Body Stats",
  };

  return Object.entries(labels)
    .filter(([table]) => summary[table] !== undefined)
    .map(([table, label]) => `${label}: ${summary[table]}`)
    .join("\n");
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
  sheetAction: {
    alignItems: "center",
    flexDirection: "row",
    gap: 16,
    minHeight: 48,
  },
  sheetActionDisabled: {
    opacity: 0.55,
  },
  sheetActionPressed: {
    opacity: animations.pressOpacity,
  },
  sheetIcon: {
    width: 34,
  },
  sheetText: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: "500",
  },
  deleteText: {
    color: "#ffaaa1",
  },
});
