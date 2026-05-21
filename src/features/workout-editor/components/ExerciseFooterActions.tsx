import { MaterialCommunityIcons } from "@expo/vector-icons";
import { memo } from "react";
import { Pressable, Text, View } from "react-native";

import { colors } from "@/theme/colors";

import { styles } from "../styles";

type ExerciseFooterActionsProps = {
  exerciseName: string;
  onAddSet: () => void;
  onHistory: () => void;
};

export const ExerciseFooterActions = memo(function ExerciseFooterActions({
  exerciseName,
  onAddSet,
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
      </View>
    </View>
  );
});
