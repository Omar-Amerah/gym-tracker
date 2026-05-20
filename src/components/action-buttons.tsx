import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  Pressable,
  StyleSheet,
  Text,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { colors } from "@/theme/colors";
import { animations } from "@/theme/animations";
import { radius } from "@/theme/radius";

type ActionButtonProps = {
  accessibilityLabel?: string;
  disabled?: boolean;
  icon?: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  label: string;
  minWidth?: number;
  onPress: (event: GestureResponderEvent) => void;
  style?: StyleProp<ViewStyle>;
};

export function PrimaryPillButton({
  accessibilityLabel,
  disabled,
  icon,
  label,
  minWidth = 84,
  onPress,
  style,
}: ActionButtonProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        { minWidth },
        disabled && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      {icon ? (
        <MaterialCommunityIcons
          color={colors.background}
          name={icon}
          size={18}
        />
      ) : null}
      <Text style={styles.primaryText}>{label}</Text>
    </Pressable>
  );
}

export function SecondaryOutlineButton({
  accessibilityLabel,
  disabled,
  icon,
  label,
  minWidth,
  onPress,
  style,
}: ActionButtonProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.secondaryButton,
        minWidth ? { minWidth } : null,
        disabled && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      {icon ? (
        <MaterialCommunityIcons color={colors.accent} name={icon} size={18} />
      ) : null}
      <Text style={styles.secondaryText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    flexDirection: "row",
    gap: 8,
    height: 42,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  primaryText: {
    color: colors.background,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  secondaryButton: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "transparent",
    borderColor: "rgba(91, 212, 224, 0.55)",
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    height: 50,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  secondaryText: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0,
  },
  pressed: {
    opacity: animations.pressOpacity,
  },
  disabled: {
    opacity: 0.55,
  },
});
