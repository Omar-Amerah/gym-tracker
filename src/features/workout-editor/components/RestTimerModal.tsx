import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  Alert,
  Modal,
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

import {
  formatTimer,
  type RestTimerController,
} from "@/features/workout-editor/hooks/useRestTimer";
import { colors } from "@/theme/colors";
import { radius } from "@/theme/radius";
import { spacing } from "@/theme/spacing";

type RestTimerModalProps = {
  visible: boolean;
  onClose: () => void;
  timer: RestTimerController;
};

export function RestTimerModal({
  visible,
  onClose,
  timer,
}: RestTimerModalProps) {
  const insets = useSafeAreaInsets();

  const [addTimerOpen, setAddTimerOpen] = useState(false);
  const [editTimersOpen, setEditTimersOpen] = useState(false);
  const [timerMenuOpen, setTimerMenuOpen] = useState(false);
  const [minutesInput, setMinutesInput] = useState("");
  const [secondsInput, setSecondsInput] = useState("");

  const countdownLabel = useMemo(
    () => formatTimer(timer.remainingSeconds),
    [timer.remainingSeconds],
  );

  const saveNewTimer = () => {
    const minutes = Number(minutesInput.trim() || "0");
    const seconds = Number(secondsInput.trim() || "0");

    if (Number.isNaN(minutes) || Number.isNaN(seconds)) {
      Alert.alert(
        "Invalid timer",
        "Enter a valid number of minutes and seconds.",
      );
      return;
    }

    const totalSeconds = minutes * 60 + seconds;

    if (totalSeconds <= 0) {
      Alert.alert("Invalid timer", "Timer must be longer than 0 seconds.");
      return;
    }

    if (totalSeconds > 3599) {
      Alert.alert("Timer too long", "Keep rest timers under 60 minutes.");
      return;
    }

    timer.addPreset(totalSeconds);
    timer.selectPreset(totalSeconds);

    setMinutesInput("");
    setSecondsInput("");
    setAddTimerOpen(false);
  };

  const onMainTimerButtonPress = () => {
    if (timer.isRunning) {
      timer.resetToSelectedDuration();
      return;
    }

    timer.startTimer(
      timer.remainingSeconds > 0
        ? timer.remainingSeconds
        : timer.selectedDurationSeconds,
    );
  };

  return (
    <>
      <Modal
        animationType="slide"
        onRequestClose={onClose}
        presentationStyle="fullScreen"
        visible={visible}
      >
        <SafeAreaView style={styles.modalRoot}>
          <Pressable
            accessibilityLabel="Minimise timer"
            accessibilityRole="button"
            onPress={onClose}
            style={styles.handlePressArea}
          >
            <View style={styles.handle} />
          </Pressable>

          <Pressable
            accessibilityLabel="Close timer"
            accessibilityRole="button"
            onPress={onClose}
            style={styles.closeButton}
          >
            <MaterialCommunityIcons
              color={colors.accent}
              name="close"
              size={34}
            />
          </Pressable>

          <View style={styles.countdownArea}>
            <Text
              adjustsFontSizeToFit
              numberOfLines={1}
              style={styles.countdown}
            >
              {countdownLabel}
            </Text>

            <Pressable
              accessibilityLabel={
                timer.isRunning ? "Reset timer" : "Start timer"
              }
              accessibilityRole="button"
              onPress={onMainTimerButtonPress}
              style={({ pressed }) => [
                styles.playButton,
                timer.isRunning && styles.stopButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <MaterialCommunityIcons
                color={colors.background}
                name={timer.isRunning ? "stop" : "play"}
                size={38}
              />
            </Pressable>
          </View>

          <View
            style={[
              styles.timerDock,
              { paddingBottom: Math.max(insets.bottom, spacing.lg) },
            ]}
          >
            <View style={styles.timerDockHeader}>
              <Text style={styles.timerDockTitle}>Timers</Text>

              <Pressable
                accessibilityLabel="Timer options"
                accessibilityRole="button"
                onPress={() => setTimerMenuOpen((current) => !current)}
                style={styles.timerDockMenuButton}
              >
                <MaterialCommunityIcons
                  color={colors.textSecondary}
                  name="dots-vertical"
                  size={26}
                />
              </Pressable>
            </View>

            {timerMenuOpen ? (
              <View style={styles.timerMenu}>
                <Pressable
                  onPress={() => {
                    setTimerMenuOpen(false);
                    setEditTimersOpen(true);
                  }}
                  style={styles.timerMenuRow}
                >
                  <Text style={styles.timerMenuText}>Edit Timers</Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    setTimerMenuOpen(false);
                    timer.resetToSelectedDuration();
                  }}
                  style={styles.timerMenuRow}
                >
                  <Text style={styles.timerMenuText}>Reset Timer</Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    setTimerMenuOpen(false);
                    timer.stopTimer();
                  }}
                  style={styles.timerMenuRow}
                >
                  <Text style={styles.timerMenuDangerText}>Stop Timer</Text>
                </Pressable>
              </View>
            ) : null}

            <ScrollView
              horizontal
              contentContainerStyle={styles.presetList}
              showsHorizontalScrollIndicator={false}
            >
              <Pressable
                accessibilityRole="button"
                onPress={() => setAddTimerOpen(true)}
                style={({ pressed }) => [
                  styles.addTimerChip,
                  pressed && styles.buttonPressed,
                ]}
              >
                <MaterialCommunityIcons
                  color={colors.background}
                  name="plus"
                  size={24}
                />
                <Text style={styles.addTimerChipText}>Add Timer</Text>
              </Pressable>

              {timer.presets.map((preset) => {
                const isSelected = preset === timer.selectedDurationSeconds;

                return (
                  <Pressable
                    accessibilityRole="button"
                    key={preset}
                    onPress={() => timer.selectPreset(preset)}
                    style={({ pressed }) => [
                      styles.presetChip,
                      isSelected && styles.presetChipSelected,
                      pressed && styles.buttonPressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.presetChipText,
                        isSelected && styles.presetChipTextSelected,
                      ]}
                    >
                      {formatTimer(preset)}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>

      <Modal
        animationType="fade"
        onRequestClose={() => setAddTimerOpen(false)}
        transparent
        visible={addTimerOpen}
      >
        <View style={styles.overlay}>
          <View style={styles.addTimerCard}>
            <Text style={styles.addTimerTitle}>Add Timer</Text>

            <View style={styles.addTimerInputs}>
              <View style={styles.addTimerInputGroup}>
                <Text style={styles.addTimerLabel}>min</Text>
                <TextInput
                  keyboardType="number-pad"
                  onChangeText={setMinutesInput}
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  style={styles.addTimerInput}
                  value={minutesInput}
                />
              </View>

              <View style={styles.addTimerInputGroup}>
                <Text style={styles.addTimerLabel}>sec</Text>
                <TextInput
                  keyboardType="number-pad"
                  onChangeText={setSecondsInput}
                  placeholder="50"
                  placeholderTextColor={colors.textMuted}
                  style={styles.addTimerInput}
                  value={secondsInput}
                />
              </View>
            </View>

            <View style={styles.addTimerActions}>
              <Pressable
                onPress={() => setAddTimerOpen(false)}
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>

              <Pressable onPress={saveNewTimer} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        onRequestClose={() => setEditTimersOpen(false)}
        presentationStyle="fullScreen"
        visible={editTimersOpen}
      >
        <SafeAreaView style={styles.editRoot}>
          <View style={styles.editHeader}>
            <Pressable
              accessibilityLabel="Close edit timers"
              accessibilityRole="button"
              onPress={() => setEditTimersOpen(false)}
              style={styles.editCloseButton}
            >
              <MaterialCommunityIcons
                color={colors.accent}
                name="close"
                size={34}
              />
            </Pressable>

            <Text style={styles.editTitle}>Edit Timers</Text>
          </View>

          <ScrollView contentContainerStyle={styles.editList}>
            {timer.presets.map((preset) => (
              <Pressable
                key={preset}
                onLongPress={() => {
                  Alert.alert(formatTimer(preset), "Timer options", [
                    {
                      text: "Delete",
                      style: "destructive",
                      onPress: () => timer.removePreset(preset),
                    },
                    { text: "Cancel", style: "cancel" },
                  ]);
                }}
                style={styles.editRow}
              >
                <Text style={styles.editRowText}>{formatTimer(preset)}</Text>
                <MaterialCommunityIcons
                  color={colors.accent}
                  name="minus"
                  size={26}
                />
              </Pressable>
            ))}
          </ScrollView>

          <Pressable
            accessibilityLabel="Add timer"
            accessibilityRole="button"
            onPress={() => setAddTimerOpen(true)}
            style={[
              styles.editAddButton,
              { bottom: Math.max(insets.bottom + spacing.lg, 28) },
            ]}
          >
            <MaterialCommunityIcons
              color={colors.background}
              name="plus"
              size={34}
            />
          </Pressable>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  handlePressArea: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 76,
  },
  handle: {
    alignSelf: "center",
    backgroundColor: colors.textMuted,
    borderRadius: radius.pill,
    height: 6,
    marginTop: -spacing.sm,
    opacity: 0.75,
    transform: [{ rotate: "-1deg" }],
    width: 88,
  },
  closeButton: {
    alignItems: "center",
    height: 54,
    justifyContent: "center",
    position: "absolute",
    right: spacing.xl,
    top: spacing.xl,
    width: 54,
    zIndex: 5,
  },
  countdownArea: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  countdown: {
    color: colors.textPrimary,
    fontSize: 118,
    fontWeight: "800",
    letterSpacing: -3,
    lineHeight: 134,
    textAlign: "center",
    width: "100%",
  },
  playButton: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    height: 84,
    justifyContent: "center",
    marginTop: spacing.xxxl,
    width: 84,
  },
  stopButton: {
    backgroundColor: "#ff9f43",
  },
  buttonPressed: {
    opacity: 0.72,
  },
  timerDock: {
    backgroundColor: colors.surfacePressed,
    borderTopColor: colors.borderMuted,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  timerDockHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  timerDockTitle: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: "700",
  },
  timerDockMenuButton: {
    alignItems: "center",
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  timerMenu: {
    backgroundColor: colors.background,
    borderColor: colors.borderMuted,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.md,
    overflow: "hidden",
  },
  timerMenuRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  timerMenuText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  timerMenuDangerText: {
    color: "#ff9b9b",
    fontSize: 16,
    fontWeight: "700",
  },
  presetList: {
    alignItems: "center",
    gap: spacing.md,
    paddingRight: spacing.xl,
  },
  addTimerChip: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderColor: colors.accent,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 42,
    paddingHorizontal: 18,
  },
  addTimerChipText: {
    color: colors.background,
    fontSize: 17,
    fontWeight: "800",
  },
  presetChip: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderColor: colors.accent,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: "center",
    minHeight: 42,
    paddingHorizontal: 20,
  },
  presetChipSelected: {
    backgroundColor: colors.textPrimary,
    borderColor: colors.textPrimary,
  },
  presetChipText: {
    color: colors.background,
    fontSize: 17,
    fontWeight: "800",
  },
  presetChipTextSelected: {
    color: colors.background,
  },
  overlay: {
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.72)",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  addTimerCard: {
    backgroundColor: colors.surface,
    borderColor: colors.borderMuted,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.xl,
    width: "100%",
  },
  addTimerTitle: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: "800",
    marginBottom: spacing.xl,
  },
  addTimerInputs: {
    flexDirection: "row",
    gap: spacing.lg,
  },
  addTimerInputGroup: {
    flex: 1,
  },
  addTimerLabel: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: spacing.sm,
  },
  addTimerInput: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: "700",
    minHeight: 58,
    paddingHorizontal: spacing.lg,
  },
  addTimerActions: {
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "flex-end",
    marginTop: spacing.xl,
  },
  secondaryButton: {
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  secondaryButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  primaryButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: "800",
  },
  editRoot: {
    flex: 1,
    backgroundColor: colors.background,
  },
  editHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  editCloseButton: {
    alignItems: "center",
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  editTitle: {
    color: colors.textPrimary,
    fontSize: 32,
    fontWeight: "500",
  },
  editList: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  editRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 66,
  },
  editRowText: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: "500",
  },
  editAddButton: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    height: 74,
    justifyContent: "center",
    position: "absolute",
    right: spacing.xl,
    width: 74,
  },
});
