import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { animations } from "@/theme/animations";
import { colors } from "@/theme/colors";
import { radius } from "@/theme/radius";
import { spacing } from "@/theme/spacing";

import { formatTimer } from "../hooks/useRestTimer";

type MiniRestTimerBarProps = {
  isRunning: boolean;
  onOpen: () => void;
  onStop: () => void;
  onToggle: () => void;
  remainingSeconds: number;
  visible: boolean;
};

export function MiniRestTimerBar({
  isRunning,
  onOpen,
  onStop,
  onToggle,
  remainingSeconds,
  visible,
}: MiniRestTimerBarProps) {
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  return (
    <Pressable
      accessibilityLabel="Open rest timer"
      accessibilityRole="button"
      onPress={onOpen}
      style={[styles.bar, { paddingBottom: insets.bottom + spacing.md }]}
    >
      <View style={styles.handle} />
      <View style={styles.content}>
        <Pressable
          accessibilityLabel={isRunning ? "Pause timer" : "Resume timer"}
          accessibilityRole="button"
          onPress={(event) => {
            event.stopPropagation();
            onToggle();
          }}
          style={({ pressed }) => [
            styles.iconButton,
            isRunning && styles.pauseButton,
            pressed && styles.pressed,
          ]}
        >
          <MaterialCommunityIcons
            color={colors.background}
            name={isRunning ? "pause" : "play"}
            size={28}
          />
        </Pressable>

        <Text style={styles.time}>{formatTimer(remainingSeconds)}</Text>

        <Pressable
          accessibilityLabel="Stop timer"
          accessibilityRole="button"
          onPress={(event) => {
            event.stopPropagation();
            onStop();
          }}
          style={({ pressed }) => [
            styles.closeButton,
            pressed && styles.pressed,
          ]}
        >
          <MaterialCommunityIcons color={colors.accent} name="close" size={25} />
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderTopWidth: StyleSheet.hairlineWidth,
    bottom: 0,
    left: 0,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.md,
    position: "absolute",
    right: 0,
    zIndex: 30,
  },
  handle: {
    alignSelf: "center",
    backgroundColor: colors.accentMuted,
    borderRadius: radius.pill,
    height: 4,
    marginBottom: spacing.card,
    width: 42,
  },
  content: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 58,
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  pauseButton: {
    backgroundColor: "#ff9f43",
  },
  closeButton: {
    alignItems: "center",
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  pressed: {
    opacity: animations.pressOpacity,
  },
  time: {
    color: colors.textPrimary,
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: 0,
  },
});
