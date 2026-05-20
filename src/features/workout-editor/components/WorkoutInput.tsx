import { MaterialCommunityIcons } from "@expo/vector-icons";
import { memo, useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { colors } from "@/theme/colors";

import { styles } from "../styles";

type WorkoutInputProps = {
  fieldId: string;
  icon?: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  keyboardType?: "default" | "decimal-pad" | "number-pad";
  label: string;
  multiline?: boolean;
  onChangeText: (value: string) => void;
  onFocusScroll?: (fieldId: string, inputRef: TextInput | null) => void;
  onPress?: () => void;
  value: string;
  wide?: boolean;
};

export const WorkoutInput = memo(function WorkoutInput({
  icon,
  fieldId,
  keyboardType,
  label,
  multiline,
  onChangeText,
  onFocusScroll,
  onPress,
  value,
  wide,
}: WorkoutInputProps) {
  const inputRef = useRef<TextInput | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [isPressableFocused, setIsPressableFocused] = useState(false);

  return (
    <View style={[styles.workoutInputWrap, wide && styles.wideInput]}>
      <Text style={styles.inputLabel}>{label}</Text>
      {onPress ? (
        <Pressable
          accessibilityRole="button"
          onBlur={() => setIsPressableFocused(false)}
          onFocus={() => setIsPressableFocused(true)}
          onPress={onPress}
          style={({ pressed }) => [
            styles.workoutInput,
            styles.pressableWorkoutInput,
            isPressableFocused && styles.inputFocused,
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
          ref={inputRef}
          keyboardType={keyboardType}
          multiline={multiline}
          onBlur={() => setIsFocused(false)}
          onChangeText={onChangeText}
          onFocus={() => {
            setIsFocused(true);
            onFocusScroll?.(fieldId, inputRef.current);
          }}
          placeholderTextColor={colors.textSecondary}
          style={[
            styles.workoutInput,
            isFocused && styles.inputFocused,
            multiline && styles.multilineInput,
          ]}
          textAlignVertical={multiline ? "top" : "center"}
          value={value ?? ""}
        />
      )}
    </View>
  );
});
