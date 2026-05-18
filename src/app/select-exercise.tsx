import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
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

import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";

const categories = [
  "Abs",
  "Back",
  "Biceps",
  "Cardio",
  "Chest",
  "Legs",
  "Shoulders",
  "Triceps",
] as const;

// MOCK DATA: Replace this with your actual exercise list from state/database
const ALL_EXERCISES = [
  { id: "1", name: "Crunch", category: "Abs" },
  { id: "2", name: "Plank", category: "Abs" },
  { id: "3", name: "Pull Up", category: "Back" },
  { id: "4", name: "Barbell Row", category: "Back" },
  { id: "5", name: "Bicep Curl", category: "Biceps" },
  { id: "6", name: "Bench Press", category: "Chest" },
  { id: "7", name: "Squat", category: "Legs" },
  { id: "8", name: "Romanian Deadlift", category: "Legs" },
];

export default function SelectExerciseScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [exerciseMode, setExerciseMode] = useState<"regular" | "superset">(
    "regular",
  );

  // NEW: Search State
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [createSheetOpen, setCreateSheetOpen] = useState(false);

  // Filter exercises based on search query
  const filteredExercises = useMemo(() => {
    if (!searchQuery.trim()) return ALL_EXERCISES;
    return ALL_EXERCISES.filter((ex) =>
      ex.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [searchQuery]);

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <View style={styles.screen}>
        {/* DYNAMIC HEADER: Swaps between Title and Search Bar */}
        {isSearching ? (
          <View style={styles.header}>
            <Pressable
              accessibilityLabel="Exit search"
              accessibilityRole="button"
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
                accessibilityLabel="Clear search"
                accessibilityRole="button"
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
          <View style={styles.header}>
            <Pressable
              accessibilityLabel="Close select exercise"
              accessibilityRole="button"
              onPress={() => router.back()}
              style={styles.iconButton}
            >
              <MaterialCommunityIcons
                name="close"
                size={24}
                color={colors.accent}
              />
            </Pressable>

            <Text style={styles.title} numberOfLines={1}>
              Select Exercise
            </Text>

            <View style={styles.headerActions}>
              <Pressable
                accessibilityLabel="Search exercises"
                accessibilityRole="button"
                onPress={() => setIsSearching(true)}
                style={styles.iconButton}
              >
                <MaterialCommunityIcons
                  name="magnify"
                  size={24}
                  color={colors.accent}
                />
              </Pressable>
              <Pressable
                accessibilityLabel="Create exercise"
                accessibilityRole="button"
                onPress={() => setCreateSheetOpen(true)}
                style={styles.iconButton}
              >
                <MaterialCommunityIcons
                  name="plus"
                  size={24}
                  color={colors.accent}
                />
              </Pressable>
            </View>
          </View>
        )}

        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: 100 + insets.bottom },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag" // Dismisses keyboard nicely when scrolling search results
        >
          <View style={styles.list}>
            {!isSearching ? (
              // DEFAULT VIEW: Categories (Chevron removed!)
              categories.map((category) => (
                <Pressable
                  accessibilityRole="button"
                  key={category}
                  onPress={() =>
                    category === "Abs" && router.push("/select-exercise/abs")
                  }
                  style={({ pressed }) => [
                    styles.categoryRow,
                    pressed && styles.rowPressed,
                  ]}
                >
                  <Text style={styles.categoryText}>{category}</Text>
                </Pressable>
              ))
            ) : // SEARCH VIEW: Filtered global exercises
            filteredExercises.length > 0 ? (
              filteredExercises.map((exercise) => (
                <Pressable
                  accessibilityRole="button"
                  key={exercise.id}
                  onPress={() => {
                    // TODO: Add logic to select this exercise for your routine
                    console.log("Selected:", exercise.name);
                  }}
                  style={({ pressed }) => [
                    styles.categoryRow,
                    pressed && styles.rowPressed,
                  ]}
                >
                  <Text style={styles.categoryText}>{exercise.name}</Text>
                  <Text style={styles.exerciseCategoryBadge}>
                    {exercise.category}
                  </Text>
                </Pressable>
              ))
            ) : (
              <View style={styles.emptySearch}>
                <Text style={styles.emptySearchText}>
                  No exercises found for {searchQuery}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* MODERN FLOATING SEGMENTED CONTROL */}
        <View
          style={[
            styles.bottomContainer,
            { bottom: Math.max(insets.bottom + 16, 24) },
          ]}
        >
          <Pressable
            accessibilityRole="button"
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
            accessibilityRole="button"
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

        <Modal
          animationType="slide"
          transparent
          visible={createSheetOpen}
          onRequestClose={() => setCreateSheetOpen(false)}
        >
          <View style={styles.sheetScrim}>
            <Pressable
              accessibilityLabel="Close create exercise"
              onPress={() => setCreateSheetOpen(false)}
              style={styles.scrimDismiss}
            />
            <View style={[styles.sheet, { paddingBottom: 34 + insets.bottom }]}>
              <Text style={styles.sheetTitle}>Create Exercise</Text>
              <Text style={styles.sheetDescription}>
                Add a custom movement to your exercise library.
              </Text>
              <Pressable accessibilityRole="button" style={styles.sheetAction}>
                <MaterialCommunityIcons
                  color={colors.textPrimary}
                  name="plus-circle-outline"
                  size={24}
                  style={styles.sheetIcon}
                />
                <Text style={styles.sheetText}>New Exercise</Text>
              </Pressable>
              <Pressable accessibilityRole="button" style={styles.sheetAction}>
                <MaterialCommunityIcons
                  color={colors.textPrimary}
                  name="folder-plus-outline"
                  size={24}
                  style={styles.sheetIcon}
                />
                <Text style={styles.sheetText}>New Category</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // --- HEADER STYLES ---
  header: {
    alignItems: "center",
    flexDirection: "row",
    paddingBottom: 16,
    paddingHorizontal: spacing.xxl,
    paddingTop: 8,
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
    letterSpacing: 0,
  },
  headerActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 18,
    height: 40,
    paddingHorizontal: 8,
  },

  // --- LIST STYLES ---
  scrollContent: {
    paddingTop: 8,
  },
  list: {
    paddingHorizontal: spacing.xxl,
  },
  categoryRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 60,
  },
  rowPressed: {
    opacity: 0.5,
  },
  categoryText: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "500",
    letterSpacing: 0,
  },
  exerciseCategoryBadge: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "400",
  },
  emptySearch: {
    paddingTop: 40,
    alignItems: "center",
  },
  emptySearchText: {
    color: colors.textSecondary,
    fontSize: 16,
  },

  // --- PREMIUM BOTTOM BAR TOGGLE ---
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
  toggleBtnActive: {
    backgroundColor: colors.fabBackground,
  },
  toggleText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  toggleTextActive: {
    color: colors.background,
  },
  sheetScrim: {
    backgroundColor: "rgba(0, 0, 0, 0.36)",
    flex: 1,
    justifyContent: "flex-end",
  },
  scrimDismiss: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: "#06100f",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 20,
  },
  sheetTitle: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: "600",
    paddingHorizontal: 10,
  },
  sheetDescription: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    paddingBottom: 10,
    paddingHorizontal: 10,
  },
  sheetAction: {
    alignItems: "center",
    flexDirection: "row",
    gap: 16,
    minHeight: 52,
    paddingHorizontal: 10,
  },
  sheetIcon: {
    width: 48,
  },
  sheetText: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: "500",
  },
});
