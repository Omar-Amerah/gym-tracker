import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import {
  PrimaryPillButton,
  SecondaryOutlineButton,
} from "@/components/action-buttons";
import { AppHeader } from "@/components/app-header";
import { BottomSheet } from "@/components/bottom-sheet";
import { useRoutines } from "@/state/routines";
import { colors } from "@/theme/colors";
import { radius } from "@/theme/radius";
import { spacing } from "@/theme/spacing";
import { backOrReplace } from "@/utils/navigation";

export default function RoutineDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    deleteRoutine,
    getRoutine,
    isLoading,
    removeExercise,
    setActiveRoutineId,
    updateExercise,
    updateRoutine,
  } = useRoutines();

  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(
    null,
  );
  const [isStartingWorkout, setIsStartingWorkout] = useState(false);
  const [routineMenuOpen, setRoutineMenuOpen] = useState(false);
  const [targetMenuOpen, setTargetMenuOpen] = useState(false);

  const routine = getRoutine(id);
  const selectedExercise =
    routine?.exercises.find((exercise) => exercise.id === selectedExerciseId) ??
    null;

  useFocusEffect(
    useCallback(() => {
      setIsStartingWorkout(false);
    }, []),
  );

  if (!routine) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            {isLoading ? "Loading..." : "Routine not found."}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const routineId = routine.id;
  const routineName = routine.name;

  function openAddExercise() {
    setActiveRoutineId(routineId);
    router.push("/select-exercise");
  }

  function startWorkout() {
    if (isStartingWorkout) return;
    setIsStartingWorkout(true);
    router.push({
      pathname: "/active-workout/[routineId]",
      params: { routineId },
    });
  }

  function deleteAndLeave() {
    setRoutineMenuOpen(false);
    Alert.alert(
      "Delete routine?",
      `This will permanently delete ${routineName}.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteRoutine(routineId);
            backOrReplace("/routines");
          },
        },
      ],
    );
  }

  function confirmRemoveExercise() {
    if (!selectedExercise) return;

    const exerciseId = selectedExercise.id;
    const exerciseName = selectedExercise.name;
    setSelectedExerciseId(null);
    Alert.alert(
      "Remove exercise?",
      `This will remove ${exerciseName} from this routine.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => removeExercise(routineId, exerciseId),
        },
      ],
    );
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <View style={styles.screen}>
        <AppHeader
          leftAction="back"
          onBackPress={() => backOrReplace("/routines")}
          onMorePress={() => setRoutineMenuOpen(true)}
          rightAccessory={
            <PrimaryPillButton
              accessibilityLabel="Start workout"
              disabled={isStartingWorkout}
              label="START"
              minWidth={92}
              onPress={startWorkout}
            />
          }
          title={routine.name}
        />

        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: 128 + insets.bottom },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.formPanel}>
            <View style={styles.inputWrap}>
              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                onChangeText={(name) => updateRoutine(routine.id, { name })}
                placeholder="Routine name"
                placeholderTextColor={colors.textSecondary}
                style={styles.input}
                value={routine.name}
              />
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={() => setTargetMenuOpen(true)}
              style={styles.inputWrap}
            >
              <Text style={styles.inputLabel}>Targets</Text>
              <View style={styles.selectInput}>
                <Text style={styles.inputText}>{routine.targetType}</Text>
                <MaterialCommunityIcons
                  name="chevron-down"
                  size={24}
                  color={colors.textSecondary}
                />
              </View>
            </Pressable>

            <View style={styles.inputWrap}>
              <TextInput
                multiline={true}
                textAlignVertical="top"
                onChangeText={(notes) => updateRoutine(routine.id, { notes })}
                placeholder="Notes"
                placeholderTextColor={colors.textSecondary}
                style={[styles.input, styles.notesInput]}
                value={routine.notes}
              />
            </View>
          </View>

          <Text style={styles.sectionTitle}>Exercises</Text>

          <View style={styles.exerciseList}>
            {routine.exercises.map((exercise) => (
              <Pressable
                accessibilityRole="button"
                key={exercise.id}
                onPress={() => setSelectedExerciseId(exercise.id)}
                style={({ pressed }) => [
                  styles.exerciseRow,
                  pressed && styles.exerciseRowPressed,
                ]}
              >
                <View style={styles.exerciseCopy}>
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                  <Text style={styles.exerciseMeta}>
                    {exercise.warmUpSets > 0
                      ? `${exercise.warmUpSets} Warm Up Sets, `
                      : ""}
                    {exercise.workingSets} Sets
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>

          <View
            style={[
              styles.addExerciseFooter,
              routine.exercises.length === 0 && styles.emptyAddExerciseFooter,
            ]}
          >
            {routine.exercises.length === 0 ? (
              <PrimaryPillButton
                accessibilityLabel="Add exercise"
                icon="plus"
                label="Add Exercise"
                minWidth={190}
                onPress={openAddExercise}
              />
            ) : (
              <SecondaryOutlineButton
                accessibilityLabel="Add exercise"
                icon="plus"
                label="Add Exercise"
                minWidth={190}
                onPress={openAddExercise}
              />
            )}
          </View>
        </ScrollView>

        {/* --- TARGET PROGRESSION MENU --- */}
        <BottomSheet
          onClose={() => setTargetMenuOpen(false)}
          visible={targetMenuOpen}
        >
          <Text style={styles.exerciseSheetTitle}>Target Progression</Text>

          <Pressable
            accessibilityRole="button"
            onPress={() => {
              updateRoutine(routine.id, { targetType: "Routine" });
              setTargetMenuOpen(false);
            }}
            style={styles.targetOptionRow}
          >
            <View style={styles.targetOptionText}>
              <Text style={styles.targetOptionTitle}>Routine</Text>
              <Text style={styles.targetOptionDesc}>
                Use the specific sets and reps saved directly in this routine
                template.
              </Text>
            </View>
            {routine.targetType === "Routine" && (
              <MaterialCommunityIcons
                name="check"
                size={24}
                color={colors.accent}
              />
            )}
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => {
              updateRoutine(routine.id, { targetType: "Latest" });
              setTargetMenuOpen(false);
            }}
            style={styles.targetOptionRow}
          >
            <View style={styles.targetOptionText}>
              <Text style={styles.targetOptionTitle}>Latest</Text>
              <Text style={styles.targetOptionDesc}>
                Automatically target the exact numbers you hit the last time you
                did this exercise.
              </Text>
            </View>
            {routine.targetType === "Latest" && (
              <MaterialCommunityIcons
                name="check"
                size={24}
                color={colors.accent}
              />
            )}
          </Pressable>
        </BottomSheet>

        {/* --- GLOBAL ROUTINE MENU MODAL --- */}
        <BottomSheet
          onClose={() => setRoutineMenuOpen(false)}
          visible={routineMenuOpen}
        >
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setRoutineMenuOpen(false);
              // Since the Name/Notes fields are already editable inline, Edit just closes the sheet
            }}
            style={styles.sheetAction}
          >
            <MaterialCommunityIcons
              color={colors.textPrimary}
              name="pencil-outline"
              size={24}
              style={styles.sheetIcon}
            />
            <Text style={styles.sheetText}>Edit</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setRoutineMenuOpen(false);
              // FIXED: Added the router.push here!
              router.push({
                pathname: "/routine/[id]/reorder",
                params: { id: routineId },
              });
            }}
            style={styles.sheetAction}
          >
            <MaterialCommunityIcons
              color={colors.textPrimary}
              name="format-list-bulleted"
              size={24}
              style={styles.sheetIcon}
            />
            <Text style={styles.sheetText}>Reorder Exercises</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={deleteAndLeave}
            style={styles.sheetAction}
          >
            <MaterialCommunityIcons
              color="#ffaaa1"
              name="trash-can-outline"
              size={24}
              style={styles.sheetIcon}
            />
            <Text style={[styles.sheetText, styles.deleteText]}>Delete</Text>
          </Pressable>
        </BottomSheet>

        {/* --- EXERCISE OPTIONS MODAL --- */}
        <BottomSheet
          onClose={() => setSelectedExerciseId(null)}
          visible={selectedExerciseId !== null}
        >
          {selectedExercise ? (
            <>
              <Text style={styles.exerciseSheetTitle}>
                {selectedExercise.name}
              </Text>

              <View style={styles.stepperRow}>
                <Text style={styles.sheetText}>Warm Up Sets</Text>
                <View style={styles.stepper}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() =>
                      updateExercise(routine.id, selectedExercise.id, {
                        warmUpSets: Math.max(
                          0,
                          selectedExercise.warmUpSets - 1,
                        ),
                      })
                    }
                    style={styles.stepButton}
                  >
                    <MaterialCommunityIcons
                      name="minus"
                      size={20}
                      color={colors.textPrimary}
                    />
                  </Pressable>
                  <Text style={styles.stepNumberText}>
                    {selectedExercise.warmUpSets}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() =>
                      updateExercise(routine.id, selectedExercise.id, {
                        warmUpSets: selectedExercise.warmUpSets + 1,
                      })
                    }
                    style={styles.stepButton}
                  >
                    <MaterialCommunityIcons
                      name="plus"
                      size={20}
                      color={colors.textPrimary}
                    />
                  </Pressable>
                </View>
              </View>

              <View style={styles.stepperRow}>
                <Text style={styles.sheetText}>Working Sets</Text>
                <View style={styles.stepper}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() =>
                      updateExercise(routine.id, selectedExercise.id, {
                        workingSets: Math.max(
                          1,
                          selectedExercise.workingSets - 1,
                        ),
                      })
                    }
                    style={styles.stepButton}
                  >
                    <MaterialCommunityIcons
                      name="minus"
                      size={20}
                      color={colors.textPrimary}
                    />
                  </Pressable>
                  <Text style={styles.stepNumberText}>
                    {selectedExercise.workingSets}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() =>
                      updateExercise(routine.id, selectedExercise.id, {
                        workingSets: selectedExercise.workingSets + 1,
                      })
                    }
                    style={styles.stepButton}
                  >
                    <MaterialCommunityIcons
                      name="plus"
                      size={20}
                      color={colors.textPrimary}
                    />
                  </Pressable>
                </View>
              </View>

              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setSelectedExerciseId(null);
                  router.push({
                    pathname: "/routine/[id]/reorder",
                    params: { id: routineId },
                  });
                }}
                style={[styles.sheetAction, { marginTop: 8 }]}
              >
                <MaterialCommunityIcons
                  color={colors.textPrimary}
                  name="format-list-bulleted"
                  size={24}
                  style={styles.sheetIcon}
                />
                <Text style={styles.sheetText}>Reorder Exercises</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={confirmRemoveExercise}
                style={styles.sheetAction}
              >
                <MaterialCommunityIcons
                  color="#ffaaa1"
                  name="trash-can-outline"
                  size={24}
                  style={styles.sheetIcon}
                />
                <Text style={[styles.sheetText, styles.deleteText]}>
                  Remove Exercise
                </Text>
              </Pressable>
            </>
          ) : null}
        </BottomSheet>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  screen: { flex: 1, backgroundColor: colors.background },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  emptyText: { color: colors.textPrimary, fontSize: 18 },

  content: { paddingHorizontal: spacing.xxl },

  formPanel: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    gap: 16,
    padding: 24,
    marginTop: 12,
  },
  inputWrap: { justifyContent: "center" },
  inputLabel: {
    backgroundColor: colors.surface,
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "500",
    left: 15,
    letterSpacing: 0,
    paddingHorizontal: 5,
    position: "absolute",
    top: -7,
    zIndex: 1,
  },
  input: {
    borderColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "400",
    minHeight: 64,
    paddingHorizontal: 20,
  },
  selectInput: {
    alignItems: "center",
    borderColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 64,
    paddingHorizontal: 20,
  },
  inputText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "400",
    letterSpacing: 0,
  },
  notesInput: {
    color: colors.textSecondary,
    paddingTop: 20,
    paddingBottom: 20,
  },

  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0,
    marginBottom: 18,
    marginTop: 28,
  },
  exerciseList: { gap: 3 },
  exerciseRow: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 64,
    paddingHorizontal: 24,
    paddingVertical: 11,
  },
  exerciseRowPressed: {
    backgroundColor: colors.surfacePressed || "rgba(255, 255, 255, 0.05)",
  },
  exerciseCopy: { flex: 1, paddingRight: spacing.xxl },
  exerciseName: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0,
    lineHeight: 20,
    marginBottom: 5,
  },
  exerciseMeta: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: "400",
    letterSpacing: 0,
    lineHeight: 19,
  },
  addExerciseFooter: {
    alignItems: "center",
    marginBottom: 18,
    marginTop: 22,
  },
  emptyAddExerciseFooter: {
    minHeight: 180,
    justifyContent: "center",
  },
  buttonPressed: { opacity: 0.84 },
  disabledAction: { opacity: 0.55 },

  // --- BOTTOM SHEET MODAL STYLES ---
  exerciseSheetTitle: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 12,
  },
  sheetAction: {
    alignItems: "center",
    flexDirection: "row",
    gap: 16,
    minHeight: 44,
  },
  sheetIcon: { width: 34 },
  sheetText: { color: colors.textPrimary, fontSize: 17, fontWeight: "500" },
  deleteText: { color: "#ffaaa1" },

  // --- TARGET SELECTOR MODAL STYLES ---
  targetOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  targetOptionText: {
    flex: 1,
    paddingRight: 24,
  },
  targetOptionTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  targetOptionDesc: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },

  stepperRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  stepper: { alignItems: "center", flexDirection: "row", gap: 16 },
  stepNumberText: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "500",
    width: 28,
    textAlign: "center",
    lineHeight: 20,
  },
  stepButton: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radius.circle,
    borderWidth: 1,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
});


