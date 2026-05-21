import { MaterialCommunityIcons } from "@expo/vector-icons";
import { memo } from "react";
import { Pressable, Text, View } from "react-native";

import { colors } from "@/theme/colors";

import { styles } from "../styles";

type ExerciseFooterActionsProps = {
  exerciseName: string;
  onAddSet: () => void;
  onCharts: () => void;
  onHistory: () => void;
};

export const ExerciseFooterActions = memo(function ExerciseFooterActions({
  exerciseName,
  onAddSet,
  onCharts,
  onHistory,
}: ExerciseFooterActionsProps) {
  return (
    <View style={styles.exerciseFooter}>
      <Pressable
        accessibilityRole="button"
        onPress={onAddSet}
        style={({ pressed }) => [styles.addSetButton, pressed && styles.pressed]}
      >
        <MaterialCommunityIcons color={colors.accent} name="plus" size={18} />
        <Text style={styles.addSetText}>Add Set</Text>
      </Pressable>

      <View style={styles.exerciseActionGroup}>
        <Pressable
          accessibilityLabel={`${exerciseName} history`}
          accessibilityRole="button"
          onPress={onHistory}
          style={({ pressed }) => [
            styles.exerciseIconButton,
            pressed && styles.pressed,
          ]}
        >
          <MaterialCommunityIcons
            color={colors.accent}
            name="history"
            size={22}
          />
        </Pressable>
        <Pressable
          accessibilityLabel={`${exerciseName} charts`}
          accessibilityRole="button"
          onPress={onCharts}
          style={({ pressed }) => [
            styles.exerciseIconButton,
            pressed && styles.pressed,
          ]}
        >
          <MaterialCommunityIcons
            color={colors.accent}
            name="chart-line"
            size={22}
          />
        </Pressable>
      </View>
    </View>
  );
});
