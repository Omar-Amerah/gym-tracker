import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { formatTimer } from "@/features/workout-editor/hooks/useRestTimer";
import { colors } from "@/theme/colors";
import { radius } from "@/theme/radius";
import { spacing } from "@/theme/spacing";

type MiniRestTimerBarProps = {
  visible: boolean;
  remainingSeconds: number;
  isRunning: boolean;
  onOpen: () => void;
  onToggle: () => void;
  onStop: () => void;
};

export function MiniRestTimerBar({
  visible,
  remainingSeconds,
  isRunning,
  onOpen,
  onToggle,
  onStop,
}: MiniRestTimerBarProps) {
  const insets = useSafeAreaInsets();

  if (!visible || remainingSeconds <= 0) return null;

  return (
    <View
      style={[
        styles.root,
        {
          paddingBottom: Math.max(insets.bottom, spacing.md),
        },
      ]}
    >
      <View style={styles.handle} />

      <View style={styles.content}>
        <Pressable
          accessibilityLabel={isRunning ? "Pause timer" : "Resume timer"}
          accessibilityRole="button"
          onPress={onToggle}
          style={styles.iconButton}
        >
          <MaterialCommunityIcons
            color={colors.background}
            name={isRunning ? "pause" : "play"}
            size={22}
          />
        </Pressable>

        <Pressable
          accessibilityLabel="Open timer"
          accessibilityRole="button"
          onPress={onOpen}
          style={styles.timeButton}
        >
          <Text style={styles.timeText}>{formatTimer(remainingSeconds)}</Text>
        </Pressable>

        <Pressable
          accessibilityLabel="Stop timer"
          accessibilityRole="button"
          onPress={onStop}
          style={styles.closeButton}
        >
          <MaterialCommunityIcons
            color={colors.accent}
            name="close"
            size={34}
          />
        </Pressable>
      </View>
    </View>
  );
}

export const MINI_REST_TIMER_BAR_HEIGHT = 104;

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    bottom: 0,
    left: 0,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    position: "absolute",
    right: 0,
    zIndex: 60,
  },
  handle: {
    alignSelf: "center",
    backgroundColor: colors.textMuted,
    borderRadius: radius.pill,
    height: 5,
    marginBottom: spacing.sm,
    opacity: 0.75,
    width: 76,
  },
  content: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: radius.circle,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  timeButton: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  timeText: {
    color: colors.textPrimary,
    fontSize: 38,
    fontWeight: "600",
    letterSpacing: -1,
    lineHeight: 44,
  },
  closeButton: {
    alignItems: "center",
    height: 48,
    justifyContent: "center",
    width: 48,
  },
});
