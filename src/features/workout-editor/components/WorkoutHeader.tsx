import { MaterialCommunityIcons } from "@expo/vector-icons";
import { memo } from "react";
import { Pressable, Text, View } from "react-native";

import { PrimaryPillButton } from "@/components/action-buttons";
import { colors } from "@/theme/colors";

import { styles } from "../styles";
import type { AutosaveStatus } from "../types";

type WorkoutHeaderProps = {
  autosaveStatus: AutosaveStatus;
  isSavingWorkout: boolean;
  onBack: () => void;
  onFinish: () => void;
  onOpenWorkoutMenu: () => void;
  title: string;
  workoutStatus: "draft" | "completed";
};

export const WorkoutHeader = memo(function WorkoutHeader({
  autosaveStatus,
  isSavingWorkout,
  onBack,
  onFinish,
  onOpenWorkoutMenu,
  title,
  workoutStatus,
}: WorkoutHeaderProps) {
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityLabel="Go back"
        accessibilityRole="button"
        onPress={onBack}
        style={styles.iconButton}
      >
        <MaterialCommunityIcons
          color={colors.accent}
          name="arrow-left"
          size={24}
        />
      </Pressable>

      <View style={styles.dateHeaderTitle}>
        <Text numberOfLines={1} style={styles.headerTitle}>
          {title}
        </Text>
        {autosaveStatus !== "idle" ? (
          <Text style={styles.autosaveStatusPill}>
            {autosaveStatus === "saving"
              ? "Saving..."
              : autosaveStatus === "failed"
                ? "Failed to save"
                : "Saved"}
          </Text>
        ) : null}
      </View>

      <View style={styles.headerActions}>
        <Pressable
          accessibilityLabel="Workout timer"
          accessibilityRole="button"
          style={styles.headerSquareButton}
        >
          <MaterialCommunityIcons
            color={colors.accent}
            name="timer-outline"
            size={23}
          />
        </Pressable>
        <PrimaryPillButton
          accessibilityLabel="Finish workout"
          disabled={isSavingWorkout}
          label={
            isSavingWorkout
              ? "SAVING"
              : workoutStatus === "completed"
                ? "DONE"
                : "FINISH"
          }
          minWidth={84}
          onPress={onFinish}
        />
        <Pressable
          accessibilityLabel="Workout options"
          accessibilityRole="button"
          onPress={onOpenWorkoutMenu}
          style={styles.headerSquareButton}
        >
          <MaterialCommunityIcons
            color={colors.accent}
            name="dots-vertical"
            size={24}
          />
        </Pressable>
      </View>
    </View>
  );
});
