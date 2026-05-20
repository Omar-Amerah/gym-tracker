import { MaterialCommunityIcons } from "@expo/vector-icons";
import { memo } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { colors } from "@/theme/colors";

import { styles } from "../styles";

type WorkoutInputProps = {
  fieldId: string;
  focusedFieldId: string | null;
  icon?: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  keyboardType?: "default" | "decimal-pad" | "number-pad";
  label: string;
  multiline?: boolean;
  onChangeText: (value: string) => void;
  onPress?: () => void;
  setFocusedFieldId: (fieldId: string | null) => void;
  value: string;
  wide?: boolean;
};

export const WorkoutInput = memo(function WorkoutInput({
  icon,
  fieldId,
  focusedFieldId,
  keyboardType,
  label,
  multiline,
  onChangeText,
  onPress,
  setFocusedFieldId,
  value,
  wide,
}: WorkoutInputProps) {
  const focused = focusedFieldId === fieldId;

  return (
    <View style={[styles.workoutInputWrap, wide && styles.wideInput]}>
      <Text style={styles.inputLabel}>{label}</Text>
      {onPress ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setFocusedFieldId(fieldId);
            onPress();
          }}
          style={({ pressed }) => [
            styles.workoutInput,
            styles.pressableWorkoutInput,
            focused && styles.inputFocused,
            pressed && styles.pressed,
          ]}
        >
          <Text numberOfLines={1} style={styles.pressableWorkoutInputText}>
            {value || "--"}
          </Text>
          {icon ? (
            <MaterialCommunityIcons
              color={colors.accent}
              name={icon}
              size={19}
              style={styles.pressableWorkoutInputIcon}
            />
          ) : null}
        </Pressable>
      ) : (
        <TextInput
          keyboardType={keyboardType}
          multiline={multiline}
          onBlur={() => setFocusedFieldId(null)}
          onChangeText={onChangeText}
          onFocus={() => setFocusedFieldId(fieldId)}
          placeholderTextColor={colors.textSecondary}
          style={[
            styles.workoutInput,
            focused && styles.inputFocused,
            multiline && styles.multilineInput,
          ]}
          textAlignVertical={multiline ? "top" : "center"}
          value={value ?? ""}
        />
      )}
    </View>
  );
});
