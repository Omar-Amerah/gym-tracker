import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
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

import { AppHeader } from "@/components/app-header";
import { BottomSheet } from "@/components/bottom-sheet";
import { listExercisesByCategory } from "@/db/exercisesRepository";
import type { ExerciseRecord } from "@/db/schema";
import {
  addActiveWorkoutExercise,
  replaceActiveWorkoutExercise,
} from "@/state/activeWorkoutSelection";
import { useRoutines } from "@/state/routines";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { backOrReplace } from "@/utils/navigation";

export default function CategoryExercisesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { activeWorkoutRoutineId, category, mode } = useLocalSearchParams<{
    activeWorkoutRoutineId?: string;
    category: string;
    mode?: string;
  }>();
  const { activeRoutineId, addExercise } = useRoutines();
  const isActiveWorkoutAdd = mode === "active-workout-add";
  const isActiveWorkoutReplacement = mode === "active-workout-replace";

  const [exerciseMode, setExerciseMode] = useState<"regular" | "superset">(
    "regular",
  );
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [exercises, setExercises] = useState<ExerciseRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // State for the options menu
  const [optionsExerciseId, setOptionsExerciseId] = useState<string | null>(
    null,
  );

  const loadExercises = useCallback(() => {
    let mounted = true;
    setIsLoading(true);

    listExercisesByCategory(category ?? "", searchQuery)
      .then((storedExercises) => {
        if (mounted) setExercises(storedExercises);
      })
      .catch((error) => {
        console.error("Failed to load exercises", error);
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [category, searchQuery]);

  useFocusEffect(loadExercises);

  function selectExercise(exercise: ExerciseRecord) {
    if (
      activeWorkoutRoutineId &&
      (isActiveWorkoutReplacement || isActiveWorkoutAdd)
    ) {
      const handled = isActiveWorkoutReplacement
        ? replaceActiveWorkoutExercise(activeWorkoutRoutineId, exercise)
        : addActiveWorkoutExercise(activeWorkoutRoutineId, exercise);
      if (handled) router.dismiss(2);
      return;
    }

    if (!activeRoutineId) return;
    addExercise(
      activeRoutineId,
      exercise.name,
      exercise.id,
      exercise.exerciseType,
    );
    router.replace({
      pathname: "/routine/[id]",
      params: { id: activeRoutineId },
    });
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <View style={styles.screen}>
        {isSearching ? (
          <View style={styles.headerSearch}>
            <Pressable
              onPress={() => {
                setIsSearching(false);
                setSearchQuery("");
              }}
              style={styles.iconButton}
            >
              <MaterialCommunityIcons
                name="arrow-left"
                size={24}
                color={colors.accent}
              />
            </Pressable>
            <TextInput
              autoFocus
              onChangeText={setSearchQuery}
              placeholder={`Search ${category}...`}
              placeholderTextColor={colors.textSecondary}
              style={styles.searchInput}
              value={searchQuery}
            />
            {searchQuery.length > 0 && (
              <Pressable
                onPress={() => setSearchQuery("")}
                style={styles.iconButton}
              >
                <MaterialCommunityIcons
                  name="close-circle"
                  size={20}
                  color={colors.textSecondary}
                />
              </Pressable>
            )}
          </View>
        ) : (
          <AppHeader
            leftAction="back"
            onBackPress={() =>
              backOrReplace(
                isActiveWorkoutReplacement || isActiveWorkoutAdd
                  ? {
                      pathname: "/select-exercise",
                      params: {
                        activeWorkoutRoutineId,
                        mode,
                      },
                    }
                  : "/select-exercise",
              )
            }
            title={category || "Exercises"}
            rightAccessory={
              <View style={styles.headerRightGroup}>
                <Pressable
                  onPress={() => setIsSearching(true)}
                  style={styles.headerIcon}
                >
                  <MaterialCommunityIcons
                    name="magnify"
                    size={24}
                    color={colors.accent}
                  />
                </Pressable>
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: "/create-exercise",
                      params: { category },
                    })
                  }
                  style={styles.headerIcon}
                >
                  <MaterialCommunityIcons
                    name="plus"
                    size={24}
                    color={colors.accent}
                  />
                </Pressable>
              </View>
            }
          />
        )}

        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: 100 + insets.bottom },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
        >
          <View style={styles.list}>
            {exercises.length > 0 ? (
              exercises.map((exercise) => (
                <Pressable
                  key={exercise.id}
                  onPress={() => selectExercise(exercise)}
                  style={({ pressed }) => [
                    styles.exerciseRow,
                    pressed && styles.rowPressed,
                  ]}
                >
                  <Text style={styles.exerciseText}>{exercise.name}</Text>

                  {/* The 3 Dots Button - separated from the main row press */}
                  <Pressable
                    onPress={() => setOptionsExerciseId(exercise.id)}
                    style={styles.dotsButton}
                    hitSlop={10}
                  >
                    <MaterialCommunityIcons
                      name="dots-vertical"
                      size={24}
                      color={colors.textSecondary}
                    />
                  </Pressable>
                </Pressable>
              ))
            ) : (
              <View style={styles.emptySearch}>
                <Text style={styles.emptySearchText}>
                  {isLoading
                    ? "Loading..."
                    : `No exercises found ${searchQuery ? `for "${searchQuery}"` : `in ${category}`}`}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>

        <View
          style={[
            styles.bottomContainer,
            { bottom: Math.max(insets.bottom + 16, 24) },
          ]}
        >
          <Pressable
            onPress={() => setExerciseMode("regular")}
            style={[
              styles.toggleBtn,
              exerciseMode === "regular" && styles.toggleBtnActive,
            ]}
          >
            <Text
              style={[
                styles.toggleText,
                exerciseMode === "regular" && styles.toggleTextActive,
              ]}
            >
              Regular
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setExerciseMode("superset")}
            style={[
              styles.toggleBtn,
              exerciseMode === "superset" && styles.toggleBtnActive,
            ]}
          >
            <Text
              style={[
                styles.toggleText,
                exerciseMode === "superset" && styles.toggleTextActive,
              ]}
            >
              Superset
            </Text>
          </Pressable>
        </View>

        {/* OPTIONS SHEET */}
        <BottomSheet
          onClose={() => setOptionsExerciseId(null)}
          visible={optionsExerciseId !== null}
        >
          <Pressable
            onPress={() => {
              const id = optionsExerciseId;
              if (!id) return;
              setOptionsExerciseId(null);
              setTimeout(() => {
                router.push({
                  pathname: "/edit-exercise/[id]",
                  params: { id },
                });
              }, 150);
            }}
            style={styles.sheetAction}
          >
            <MaterialCommunityIcons
              color={colors.textPrimary}
              name="pencil-outline"
              size={24}
              style={styles.sheetIcon}
            />
            <Text style={styles.sheetText}>Edit Exercise</Text>
          </Pressable>
        </BottomSheet>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  screen: { flex: 1, backgroundColor: colors.background },
  headerSearch: {
    alignItems: "center",
    flexDirection: "row",
    paddingBottom: 15,
    paddingHorizontal: 16,
    paddingTop: 15,
    gap: 12,
  },
  headerRightGroup: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerIcon: { padding: 4 },
  iconButton: {
    alignItems: "center",
    justifyContent: "center",
    height: 40,
    width: 40,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 18,
    height: 40,
    paddingHorizontal: 8,
  },
  scrollContent: { paddingTop: 8 },
  list: { paddingHorizontal: spacing.xxl },
  exerciseRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 60,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  rowPressed: { opacity: 0.5 },
  exerciseText: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "500",
    flex: 1,
  },
  dotsButton: { padding: 8, marginRight: -8 }, // Offsets the padding so it sits flush
  emptySearch: { paddingTop: 40, alignItems: "center" },
  emptySearchText: { color: colors.textSecondary, fontSize: 16 },
  bottomContainer: {
    position: "absolute",
    left: spacing.xxl,
    right: spacing.xxl,
    backgroundColor: colors.surface,
    borderRadius: 16,
    flexDirection: "row",
    padding: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 12,
  },
  toggleBtnActive: { backgroundColor: colors.fabBackground },
  toggleText: { fontSize: 15, fontWeight: "600", color: colors.textSecondary },
  toggleTextActive: { color: colors.background },
  sheetAction: {
    alignItems: "center",
    flexDirection: "row",
    gap: 16,
    minHeight: 52,
  },
  sheetIcon: { width: 34 },
  sheetText: { color: colors.textPrimary, fontSize: 17, fontWeight: "500" },
});


