import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
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
import {
  createCategory,
  deleteCategory,
  listCategories,
  listExercises,
} from "@/db/exercisesRepository";
import type { CategoryRecord, ExerciseRecord } from "@/db/schema";
import {
  addActiveWorkoutExercise,
  replaceActiveWorkoutExercise,
} from "@/state/activeWorkoutSelection";
import { useRoutines } from "@/state/routines";
import { colors } from "@/theme/colors";
import { radius } from "@/theme/radius";
import { spacing } from "@/theme/spacing";
import { backOrReplace } from "@/utils/navigation";

// --- REUSABLE BOTTOM SHEET COMPONENT ---
function BottomSheet({
  children,
  insetsBottom,
  onClose,
  visible,
}: {
  children: React.ReactNode;
  insetsBottom: number;
  onClose: () => void;
  visible: boolean;
}) {
  const [showModal, setShowModal] = useState(visible);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setShowModal(true);
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }).start(() => {
        setShowModal(false);
      });
    }
  }, [visible, fadeAnim]);

  if (!showModal) return null;

  return (
    <Modal
      animationType="none"
      onRequestClose={onClose}
      transparent
      visible={showModal}
    >
      <Animated.View style={[styles.sheetContainer, { opacity: fadeAnim }]}>
        <View style={styles.scrimOverlay} />
        <Pressable
          accessibilityLabel="Close menu"
          onPress={onClose}
          style={StyleSheet.absoluteFillObject}
        />
        <View
          style={[
            styles.sheet,
            {
              paddingBottom: 34 + insetsBottom,
            },
          ]}
        >
          {children}
        </View>
      </Animated.View>
    </Modal>
  );
}

export default function SelectExerciseScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { activeWorkoutRoutineId, mode } = useLocalSearchParams<{
    activeWorkoutRoutineId?: string;
    mode?: string;
  }>();
  const { activeRoutineId, addExercise } = useRoutines();
  const isActiveWorkoutAdd = mode === "active-workout-add";
  const isActiveWorkoutReplacement = mode === "active-workout-replace";

  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [exerciseResults, setExerciseResults] = useState<ExerciseRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [exerciseMode, setExerciseMode] = useState<"regular" | "superset">(
    "regular",
  );
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Sheet States
  const [optionsSheetOpen, setOptionsSheetOpen] = useState(false);
  const [createSheetOpen, setCreateSheetOpen] = useState(false);
  const [deleteSheetOpen, setDeleteSheetOpen] = useState(false);
  const [categoryPendingDelete, setCategoryPendingDelete] =
    useState<CategoryRecord | null>(null);

  const [newCategoryName, setNewCategoryName] = useState("");

  const loadSelectionData = useCallback(() => {
    let mounted = true;
    setIsLoading(true);

    Promise.all([listCategories(), listExercises(searchQuery)])
      .then(([storedCategories, storedExercises]) => {
        if (!mounted) return;
        setCategories(storedCategories);
        setExerciseResults(storedExercises);
      })
      .catch((error) => {
        console.error("Failed to load exercise selection data", error);
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [searchQuery]);

  useFocusEffect(loadSelectionData);

  const handleCreateCategory = async () => {
    const trimmedName = newCategoryName.trim();
    if (!trimmedName) return;

    await createCategory(trimmedName);
    setCategories(await listCategories());
    setNewCategoryName("");
    setCreateSheetOpen(false);
  };

  const handleDeleteCategory = async (categoryToDelete: string) => {
    await deleteCategory(categoryToDelete);
    await Promise.all([listCategories(), listExercises(searchQuery)]).then(
      ([storedCategories, storedExercises]) => {
        setCategories(storedCategories);
        setExerciseResults(storedExercises);
      },
    );
    setCategoryPendingDelete(null);
    setDeleteSheetOpen(false);
  };

  const selectExercise = (exercise: ExerciseRecord) => {
    if (
      activeWorkoutRoutineId &&
      (isActiveWorkoutReplacement || isActiveWorkoutAdd)
    ) {
      const handled = isActiveWorkoutReplacement
        ? replaceActiveWorkoutExercise(activeWorkoutRoutineId, exercise)
        : addActiveWorkoutExercise(activeWorkoutRoutineId, exercise);
      if (handled) router.dismiss(1);
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
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <View style={styles.screen}>
        {/* DYNAMIC HEADER */}
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
              placeholder="Search all exercises..."
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
            leftAction="close"
            onBackPress={() =>
              isActiveWorkoutReplacement || isActiveWorkoutAdd
                ? router.dismiss(1)
                : backOrReplace(
                    activeRoutineId
                      ? {
                          pathname: "/routine/[id]",
                          params: { id: activeRoutineId },
                        }
                      : "/routines",
                  )
            }
            title="Select Exercise"
            onMorePress={() => setOptionsSheetOpen(true)} // Uses the global standard options menu
            rightAccessory={
              <Pressable
                onPress={() => setIsSearching(true)}
                style={styles.iconButton}
              >
                <MaterialCommunityIcons
                  name="magnify"
                  size={24}
                  color={colors.accent}
                />
              </Pressable>
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
            {!isSearching
              ? categories.map((category) => (
                  <Pressable
                    key={category.id}
                    // 👇 This is the updated dynamic route
                    onPress={() =>
                      router.push({
                        pathname: "/select-exercise/[category]",
                        params: {
                          activeWorkoutRoutineId,
                          category: category.name,
                          mode,
                        },
                      })
                    }
                    style={({ pressed }) => [
                      styles.categoryRow,
                      pressed && styles.rowPressed,
                    ]}
                  >
                    <Text style={styles.categoryText}>{category.name}</Text>
                  </Pressable>
                ))
              : exerciseResults.map((exercise) => (
                  <Pressable
                    key={exercise.id}
                    onPress={() => selectExercise(exercise)}
                    style={({ pressed }) => [
                      styles.categoryRow,
                      pressed && styles.rowPressed,
                    ]}
                  >
                    <View>
                      <Text style={styles.categoryText}>{exercise.name}</Text>
                      <Text style={styles.exerciseCategoryBadge}>
                        {exercise.category}
                      </Text>
                    </View>
                  </Pressable>
                ))}
            {isLoading ? <Text style={styles.emptyText}>Loading...</Text> : null}
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

        {/* 1. OPTIONS MENU SHEET */}
        <BottomSheet
          insetsBottom={insets.bottom}
          onClose={() => setOptionsSheetOpen(false)}
          visible={optionsSheetOpen}
        >
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setOptionsSheetOpen(false);
              setTimeout(() => setCreateSheetOpen(true), 300);
            }}
            style={styles.sheetAction}
          >
            <MaterialCommunityIcons
              color={colors.textPrimary}
              name="folder-plus-outline"
              size={24}
              style={styles.sheetIcon}
            />
            <Text style={styles.sheetText}>New Category</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setOptionsSheetOpen(false);
              setTimeout(() => setDeleteSheetOpen(true), 300);
            }}
            style={styles.sheetAction}
          >
            <MaterialCommunityIcons
              color="#ffaaa1"
              name="trash-can-outline"
              size={24}
              style={styles.sheetIcon}
            />
            <Text style={[styles.sheetText, styles.deleteText]}>
              Delete Category
            </Text>
          </Pressable>
        </BottomSheet>

        {/* 2. CREATE CATEGORY SHEET */}
        <BottomSheet
          insetsBottom={insets.bottom}
          onClose={() => {
            setCreateSheetOpen(false);
            setNewCategoryName("");
          }}
          visible={createSheetOpen}
        >
          <Text style={styles.sheetTitle}>New Category</Text>
          <Text style={styles.sheetDescription}>
            Enter a name to create a new grouping for your exercises.
          </Text>

          <View style={styles.inputWrap}>
            <TextInput
              autoFocus
              onChangeText={setNewCategoryName}
              placeholder="e.g. Kettlebell, Olympic..."
              placeholderTextColor={colors.textSecondary}
              style={styles.sheetInput}
              value={newCategoryName}
            />
          </View>

          <Pressable
            disabled={!newCategoryName.trim()}
            onPress={() => {
              void handleCreateCategory();
            }}
            style={({ pressed }) => [
              styles.createButton,
              !newCategoryName.trim() && styles.buttonDisabled,
              pressed && styles.rowPressed,
            ]}
          >
            <Text style={styles.createButtonText}>Create Category</Text>
          </Pressable>
        </BottomSheet>

        {/* 3. DELETE CATEGORY SHEET */}
        <BottomSheet
          insetsBottom={insets.bottom}
          onClose={() => {
            setDeleteSheetOpen(false);
            setCategoryPendingDelete(null);
          }}
          visible={deleteSheetOpen}
        >
          {categoryPendingDelete ? (
            <>
              <Text style={styles.sheetTitle}>Delete Category?</Text>
              <Text style={styles.sheetDescription}>
                This will remove {categoryPendingDelete.name} and its exercises
                from the library.
              </Text>

              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  void handleDeleteCategory(categoryPendingDelete.name);
                }}
                style={({ pressed }) => [
                  styles.sheetAction,
                  pressed && styles.rowPressed,
                ]}
              >
                <MaterialCommunityIcons
                  color="#ffaaa1"
                  name="trash-can-outline"
                  size={24}
                  style={styles.sheetIcon}
                />
                <Text style={[styles.sheetText, styles.deleteText]}>
                  Delete Category
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => setCategoryPendingDelete(null)}
                style={({ pressed }) => [
                  styles.sheetAction,
                  pressed && styles.rowPressed,
                ]}
              >
                <MaterialCommunityIcons
                  color={colors.textPrimary}
                  name="close"
                  size={24}
                  style={styles.sheetIcon}
                />
                <Text style={styles.sheetText}>Cancel</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.sheetTitle}>Delete Category</Text>
              <Text style={styles.sheetDescription}>
                Select a category to permanently remove it.
              </Text>

              <ScrollView
                style={styles.deleteListScroll}
                showsVerticalScrollIndicator={false}
              >
                {categories.map((cat) => (
                  <Pressable
                    key={cat.id}
                    onPress={() => setCategoryPendingDelete(cat)}
                    style={({ pressed }) => [
                      styles.deleteCategoryRow,
                      pressed && styles.rowPressed,
                    ]}
                  >
                    <Text style={styles.categoryText}>{cat.name}</Text>
                    <MaterialCommunityIcons
                      name="trash-can-outline"
                      size={22}
                      color="#ffaaa1"
                    />
                  </Pressable>
                ))}
              </ScrollView>
            </>
          )}
        </BottomSheet>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  screen: { flex: 1, backgroundColor: colors.background },

  // --- HEADER ---
  headerSearch: {
    alignItems: "center",
    flexDirection: "row",
    paddingBottom: 15,
    paddingHorizontal: 16,
    paddingTop: 15,
    gap: 12,
  },
  iconButton: {
    alignItems: "center",
    justifyContent: "center",
    height: 40,
    width: 40,
  },
  title: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: 22,
    fontWeight: "600",
  },
  searchInput: { flex: 1, color: colors.textPrimary, fontSize: 18, height: 40 },

  // --- LIST ---
  scrollContent: { paddingTop: 8 },
  list: { paddingHorizontal: spacing.xxl },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 60,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  rowPressed: { opacity: 0.5 },
  categoryText: { color: colors.textPrimary, fontSize: 18, fontWeight: "500" },
  exerciseCategoryBadge: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 16,
    paddingTop: 24,
    textAlign: "center",
  },

  // --- TOGGLE ---
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

  // --- SHEETS ---
  sheetContainer: { flex: 1, justifyContent: "flex-end" },
  scrimOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  sheet: {
    backgroundColor: "#06100f",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 32,
    gap: 20,
  },
  sheetTitle: { color: colors.textPrimary, fontSize: 22, fontWeight: "600" },
  sheetDescription: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  sheetAction: {
    alignItems: "center",
    flexDirection: "row",
    gap: 16,
    minHeight: 44,
    paddingBottom: 8,
  },
  sheetIcon: { width: 34 },
  sheetText: { color: colors.textPrimary, fontSize: 17, fontWeight: "500" },
  deleteText: { color: "#ffaaa1" },

  // Create Sheet specific
  inputWrap: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    height: 56,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  sheetInput: { color: colors.textPrimary, fontSize: 16 },
  createButton: {
    backgroundColor: colors.fabBackground,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  createButtonText: {
    color: colors.background,
    fontWeight: "700",
    fontSize: 16,
  },
  buttonDisabled: { opacity: 0.3 },

  // Delete Sheet specific
  deleteListScroll: {
    maxHeight: 280,
  },
  deleteCategoryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
});
