import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
    Alert,
    Animated,
    Modal,
    PanResponder,
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

import { PrimaryPillButton } from "@/components/action-buttons";
import { AppHeader } from "@/components/app-header";
import {
  deleteExercise,
  getExercise,
  listCategories,
  upsertExercise,
} from "@/db/exercisesRepository";
import type { CategoryRecord } from "@/db/schema";
import { colors } from "@/theme/colors";
import { radius } from "@/theme/radius";
import { spacing } from "@/theme/spacing";

const EXERCISE_TYPES = [
  "Strength: Weight, Reps",
  "Strength: Weight, Time",
  "Bodyweight: Weight, Reps",
  "Bodyweight: Weight, Time",
  "Bodyweight: Reps",
  "Bodyweight: Time",
  "Cardio: Distance, Time",
  "Cardio: Time",
  "Reps Only",
  "Time Only",
];

const SINGLE_ARM_OPTIONS = ["No", "Yes"];

type PickerType = "category" | "type" | "arm" | null;

const SLIDER_STEP = 5;
const SLIDER_MIN = 0;
const SLIDER_MAX = 100;
const THUMB_SIZE = 22;

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
      return;
    }

    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 120,
      useNativeDriver: true,
    }).start(() => {
      setShowModal(false);
    });
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

export default function EditExerciseScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [exerciseType, setExerciseType] = useState("Strength: Weight, Reps");
  const [singleArm, setSingleArm] = useState("No");
  const [multiplier, setMultiplier] = useState(100);
  const [isLoading, setIsLoading] = useState(true);

  const [activePicker, setActivePicker] = useState<PickerType>(null);

  const trackWidthRef = useRef(1);

  const isBodyweight = exerciseType.toLowerCase().includes("bodyweight");

  useEffect(() => {
    let mounted = true;

    Promise.all([getExercise(id), listCategories()])
      .then(([exercise, storedCategories]) => {
        if (!mounted) return;
        setCategories(storedCategories);

        if (exercise) {
          setName(exercise.name);
          setCategory(exercise.category);
          setExerciseType(exercise.exerciseType ?? "Strength: Weight, Reps");
          setSingleArm(exercise.singleArm ?? "No");
          setMultiplier(exercise.bodyweightMultiplier);
        }
      })
      .catch((error) => {
        console.error("Failed to load exercise", error);
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [id]);

  const clamp = (value: number, min: number, max: number) => {
    return Math.max(min, Math.min(max, value));
  };

  const snapToStep = (value: number) => {
    return Math.round(value / SLIDER_STEP) * SLIDER_STEP;
  };

  const updateMultiplierFromX = (x: number) => {
    const trackWidth = trackWidthRef.current || 1;
    const rawValue = (x / trackWidth) * 100;
    const nextValue = snapToStep(clamp(rawValue, SLIDER_MIN, SLIDER_MAX));

    setMultiplier(nextValue);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponderCapture: () => true,

      onPanResponderGrant: (event) => {
        updateMultiplierFromX(event.nativeEvent.locationX);
      },

      onPanResponderMove: (event) => {
        updateMultiplierFromX(event.nativeEvent.locationX);
      },
    }),
  ).current;

  const getPickerOptions = () => {
    if (activePicker === "category") return categories.map((item) => item.name);
    if (activePicker === "arm") return SINGLE_ARM_OPTIONS;
    return EXERCISE_TYPES;
  };

  const saveExercise = async () => {
    if (!name.trim() || !category.trim()) return;

    await upsertExercise({
      id,
      name,
      category,
      exerciseType,
      singleArm,
      bodyweightMultiplier: multiplier,
    });
    router.back();
  };

  const handleDeleteExercise = async () => {
    await deleteExercise(id);
    router.back();
  };

  const confirmDeleteExercise = () => {
    Alert.alert(
      "Delete exercise?",
      `This will permanently delete ${name.trim() || "this exercise"} from the library.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void handleDeleteExercise();
          },
        },
      ],
    );
  };

  const handlePickerSelect = (item: string) => {
    if (activePicker === "category") setCategory(item);
    if (activePicker === "arm") setSingleArm(item);
    if (activePicker === "type") setExerciseType(item);

    setActivePicker(null);
  };

  const renderPickerLabel = () => {
    if (activePicker === "category") return "Select Category";
    if (activePicker === "arm") return "Single Leg / Single Arm";
    if (activePicker === "type") return "Select Exercise Type";
    return "";
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <View style={styles.screen}>
        <AppHeader
          leftAction="back"
          onBackPress={() => router.back()}
          title="Edit Exercise"
          rightAccessory={
            <PrimaryPillButton
              disabled={isLoading || !name.trim() || !category.trim()}
              label="SAVE"
              onPress={() => {
                void saveExercise();
              }}
            />
          }
        />

        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <View style={styles.inputGroup}>
            <Text style={styles.floatingLabel}>Name</Text>
            <TextInput
              style={styles.textInput}
              value={name}
              onChangeText={setName}
              placeholder="Exercise name"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.inputGroup,
              pressed && styles.pressed,
            ]}
            onPress={() => setActivePicker("category")}
          >
            <Text style={styles.floatingLabel}>Category</Text>
            <View style={styles.selectBox}>
              <Text style={styles.selectText}>{category}</Text>
              <MaterialCommunityIcons
                name="menu-down"
                size={24}
                color={colors.textSecondary}
              />
            </View>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.inputGroup,
              pressed && styles.pressed,
            ]}
            onPress={() => setActivePicker("type")}
          >
            <Text style={styles.floatingLabel}>Exercise Type</Text>
            <View style={styles.selectBox}>
              <Text style={styles.selectText}>{exerciseType}</Text>
              <MaterialCommunityIcons
                name="menu-down"
                size={24}
                color={colors.textSecondary}
              />
            </View>
          </Pressable>

          <View style={styles.inputGroup}>
            <Pressable
              onPress={() => setActivePicker("arm")}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <Text style={styles.floatingLabel}>Single Leg / Single Arm</Text>
              <View style={styles.selectBox}>
                <Text style={styles.selectText}>{singleArm}</Text>
                <MaterialCommunityIcons
                  name="menu-down"
                  size={24}
                  color={colors.textSecondary}
                />
              </View>
            </Pressable>

            <Text style={styles.hintText}>
              Count weight twice in statistics
            </Text>
          </View>

          {isBodyweight && (
            <View style={styles.multiplierContainer}>
              <View style={styles.multiplierHeader}>
                <View>
                  <Text style={styles.multiplierTitle}>
                    Bodyweight multiplier
                  </Text>
                  <Text style={styles.multiplierSubtitle}>
                    Percentage of bodyweight used in calculations
                  </Text>
                </View>

                <View style={styles.multiplierBadge}>
                  <Text style={styles.multiplierValue}>{multiplier}%</Text>
                </View>
              </View>

              <View
                style={styles.sliderTouchArea}
                onLayout={(event) => {
                  trackWidthRef.current = event.nativeEvent.layout.width;
                }}
                {...panResponder.panHandlers}
              >
                <View style={styles.sliderTrack}>
                  <View
                    style={[
                      styles.sliderFill,
                      {
                        width: `${multiplier}%`,
                      },
                    ]}
                  />

                  <View style={styles.sliderMarks}>
                    {Array.from({ length: 11 }).map((_, index) => (
                      <View
                        key={index}
                        style={[
                          styles.sliderMark,
                          multiplier >= index * 10 && styles.sliderMarkActive,
                        ]}
                      />
                    ))}
                  </View>

                  <View
                    style={[
                      styles.sliderThumb,
                      {
                        left: `${multiplier}%`,
                        transform: [{ translateX: -THUMB_SIZE / 2 }],
                      },
                    ]}
                  />
                </View>
              </View>

              <View style={styles.sliderLabels}>
                <Text style={styles.sliderLabel}>0%</Text>
                <Text style={styles.sliderLabel}>50%</Text>
                <Text style={styles.sliderLabel}>100%</Text>
              </View>
            </View>
          )}

          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.deleteAction,
              pressed && styles.pressed,
            ]}
            onPress={confirmDeleteExercise}
          >
            <MaterialCommunityIcons
              color="#ffaaa1"
              name="trash-can-outline"
              size={24}
              style={styles.sheetIcon}
            />
            <Text style={[styles.sheetText, styles.deleteText]}>
              Delete Exercise
            </Text>
          </Pressable>
        </ScrollView>

        <BottomSheet
          insetsBottom={insets.bottom}
          onClose={() => setActivePicker(null)}
          visible={activePicker !== null}
        >
          <Text style={styles.sheetTitle}>{renderPickerLabel()}</Text>

          <ScrollView
            showsVerticalScrollIndicator={false}
            style={styles.sheetScroll}
          >
            {getPickerOptions().map((item) => {
              const selected =
                item === category || item === exerciseType || item === singleArm;

              return (
                <Pressable
                  accessibilityRole="button"
                  key={item}
                  style={({ pressed }) => [
                    styles.sheetOption,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => handlePickerSelect(item)}
                >
                  <Text
                    style={[
                      styles.sheetText,
                      selected && styles.sheetTextSelected,
                    ]}
                  >
                    {item}
                  </Text>

                  {selected ? (
                    <MaterialCommunityIcons
                      name="check"
                      size={22}
                      color={colors.accent}
                    />
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </BottomSheet>
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

  content: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: 26,
  },

  inputGroup: {
    position: "relative",
  },

  floatingLabel: {
    position: "absolute",
    top: -9,
    left: 12,
    backgroundColor: colors.background,
    paddingHorizontal: 5,
    color: colors.textSecondary,
    fontSize: 12,
    zIndex: 2,
  },

  textInput: {
    height: 56,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: radius.sm,
    color: colors.textPrimary,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: "rgba(255,255,255,0.015)",
  },

  selectBox: {
    height: 56,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: radius.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    backgroundColor: "rgba(255,255,255,0.015)",
  },

  selectText: {
    color: colors.textPrimary,
    fontSize: 16,
    flex: 1,
    paddingRight: 12,
  },

  hintText: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 8,
    paddingHorizontal: 4,
    lineHeight: 17,
  },

  multiplierContainer: {
    marginTop: 4,
    padding: 16,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.025)",
  },

  multiplierHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 18,
  },

  multiplierTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "600",
  },

  multiplierSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 17,
    maxWidth: 220,
  },

  multiplierBadge: {
    minWidth: 58,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(28, 138, 178, 0.16)",
    borderWidth: 1,
    borderColor: "rgba(28, 138, 178, 0.35)",
  },

  multiplierValue: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: "800",
  },

  sliderTouchArea: {
    height: 42,
    justifyContent: "center",
  },

  sliderTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.1)",
    position: "relative",
    justifyContent: "center",
  },

  sliderFill: {
    position: "absolute",
    left: 0,
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.accent,
  },

  sliderMarks: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  sliderMark: {
    width: 2,
    height: 8,
    borderRadius: 1,
    backgroundColor: "rgba(255,255,255,0.26)",
  },

  sliderMarkActive: {
    backgroundColor: "rgba(0,0,0,0.38)",
  },

  sliderThumb: {
    position: "absolute",
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: colors.textPrimary,
    borderWidth: 3,
    borderColor: colors.accent,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 6,
  },

  sliderLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },

  sliderLabel: {
    color: colors.textSecondary,
    fontSize: 11,
  },

  sheetContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },

  scrimOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },

  sheet: {
    backgroundColor: "#06100f",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    gap: 18,
    paddingHorizontal: 34,
    paddingTop: 36,
  },

  sheetTitle: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 2,
  },

  sheetScroll: {
    maxHeight: 320,
  },

  sheetOption: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
    minHeight: 52,
  },

  sheetText: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: "500",
    flex: 1,
  },

  sheetTextSelected: {
    color: colors.accent,
  },

  sheetIcon: {
    width: 34,
  },

  deleteAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    minHeight: 52,
    marginTop: 6,
  },

  deleteText: {
    color: "#ffaaa1",
  },

  pressed: {
    opacity: 0.72,
  },
});
