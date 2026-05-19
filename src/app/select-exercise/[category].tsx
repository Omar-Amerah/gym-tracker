import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
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
import { useRoutines } from "@/state/routines";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";

// --- REUSABLE BOTTOM SHEET ---
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
  const translateY = useRef(new Animated.Value(400)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setShowModal(true);
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 0,
          speed: 14,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 400,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => setShowModal(false));
    }
  }, [visible, translateY, fadeAnim]);

  if (!showModal) return null;

  return (
    <Modal
      animationType="none"
      onRequestClose={onClose}
      transparent
      visible={showModal}
    >
      <View style={styles.sheetContainer}>
        <Animated.View style={[styles.scrimOverlay, { opacity: fadeAnim }]} />
        <Pressable
          accessibilityLabel="Close menu"
          onPress={onClose}
          style={StyleSheet.absoluteFillObject}
        />
        <Animated.View
          style={[
            styles.sheet,
            { paddingBottom: 34 + insetsBottom, transform: [{ translateY }] },
          ]}
        >
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const ALL_EXERCISES = [
  { id: "1", name: "Cable Woodchops", category: "Abs" },
  { id: "2", name: "Crunches", category: "Abs" },
  { id: "3", name: "Leg Raises", category: "Abs" },
  { id: "4", name: "Medball Rotations", category: "Abs" },
  { id: "5", name: "Pallof Press", category: "Abs" },
  { id: "6", name: "Plank", category: "Abs" },
  { id: "7", name: "Pull Up", category: "Back" },
  { id: "8", name: "Bench Press", category: "Chest" },
];

export default function CategoryExercisesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { category } = useLocalSearchParams<{ category: string }>();
  const { activeRoutineId, addExercise } = useRoutines();

  const [exerciseMode, setExerciseMode] = useState<"regular" | "superset">(
    "regular",
  );
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // State for the options menu
  const [optionsExerciseId, setOptionsExerciseId] = useState<string | null>(
    null,
  );

  const filteredExercises = useMemo(() => {
    const categoryExercises = ALL_EXERCISES.filter(
      (ex) => ex.category === category,
    );
    if (!searchQuery.trim()) return categoryExercises;
    return categoryExercises.filter((ex) =>
      ex.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [category, searchQuery]);

  function selectExercise(name: string) {
    if (!activeRoutineId) return;
    addExercise(activeRoutineId, name);
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
            onBackPress={() => router.back()}
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
                  onPress={() => router.push("/create-exercise")}
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
            {filteredExercises.length > 0 ? (
              filteredExercises.map((exercise) => (
                <Pressable
                  key={exercise.id}
                  onPress={() => selectExercise(exercise.name)}
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
                  No exercises found{" "}
                  {searchQuery ? `for "${searchQuery}"` : `in ${category}`}
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
          insetsBottom={insets.bottom}
          onClose={() => setOptionsExerciseId(null)}
          visible={optionsExerciseId !== null}
        >
          <Pressable
            onPress={() => {
              const id = optionsExerciseId;
              setOptionsExerciseId(null);
              // Route to the new Edit screen we are about to make
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
    gap: 8,
  },
  sheetAction: {
    alignItems: "center",
    flexDirection: "row",
    gap: 16,
    minHeight: 52,
  },
  sheetIcon: { width: 34 },
  sheetText: { color: colors.textPrimary, fontSize: 17, fontWeight: "500" },
});
