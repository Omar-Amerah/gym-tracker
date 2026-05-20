import { MaterialCommunityIcons } from "@expo/vector-icons";
import { memo } from "react";
import { Pressable, Text } from "react-native";

import { colors } from "@/theme/colors";

import { styles } from "../styles";

type SheetActionProps = {
  destructive?: boolean;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  label: string;
  locked?: boolean;
  onPress?: () => void;
};

export const ExerciseQuickAction = memo(function ExerciseQuickAction({
  destructive,
  icon,
  label,
  locked,
  onPress,
}: SheetActionProps) {
  const color = destructive
    ? "#ffaaa1"
    : locked
      ? colors.textMuted
      : colors.accent;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={locked && !onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.quickAction,
        locked && !onPress && styles.disabledAction,
        pressed && styles.pressed,
      ]}
    >
      <MaterialCommunityIcons color={color} name={icon} size={24} />
      <Text
        numberOfLines={1}
        style={[
          styles.quickActionText,
          destructive && styles.deleteText,
          locked && !onPress && styles.mutedText,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
});

export const SheetListAction = memo(function SheetListAction({
  destructive,
  icon,
  label,
  locked,
  onPress,
}: SheetActionProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={locked && !onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.sheetAction,
        locked && styles.disabledAction,
        pressed && styles.pressed,
      ]}
    >
      <MaterialCommunityIcons
        color={
          destructive
            ? "#ffaaa1"
            : locked
              ? colors.textMuted
              : colors.textPrimary
        }
        name={icon}
        size={24}
        style={styles.sheetIcon}
      />
      <Text
        style={[
          styles.sheetText,
          destructive && styles.deleteText,
          locked && styles.mutedText,
        ]}
      >
        {label}
      </Text>
      {locked ? (
        <MaterialCommunityIcons
          color={colors.textMuted}
          name="lock-outline"
          size={16}
        />
      ) : null}
    </Pressable>
  );
});
