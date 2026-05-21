import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
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
import { SafeAreaView } from "react-native-safe-area-context";

import { animations } from "@/theme/animations";
import { colors } from "@/theme/colors";
import { radius } from "@/theme/radius";
import { spacing } from "@/theme/spacing";

import { EditTimersModal } from "./EditTimersModal";
import { formatTimer, useRestTimer } from "../hooks/useRestTimer";

type RestTimer = ReturnType<typeof useRestTimer>;

type RestTimerModalProps = {
  onClose: () => void;
  timer: RestTimer;
  visible: boolean;
};

export function RestTimerModal({
  onClose,
  timer,
  visible,
}: RestTimerModalProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [minutes, setMinutes] = useState("");
  const [seconds, setSeconds] = useState("");

  const displaySeconds =
    timer.remainingSeconds > 0
      ? timer.remainingSeconds
      : timer.selectedDurationSeconds;

  function saveAddedTimer() {
    const totalSeconds =
      Number.parseInt(minutes || "0", 10) * 60 +
      Number.parseInt(seconds || "0", 10);

    if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
      Alert.alert("Invalid timer", "Timer must be longer than 0 seconds.");
      return;
    }

    if (totalSeconds > 59 * 60 + 59) {
      Alert.alert("Invalid timer", "Timer must be 59:59 or shorter.");
      return;
    }

    timer.addPreset(totalSeconds);
    setMinutes("");
    setSeconds("");
    setAddOpen(false);
  }

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent={false}
      visible={visible}
    >
      <SafeAreaView style={styles.screen}>
        <View style={styles.handle} />
        <Pressable
          accessibilityLabel="Close rest timer"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.closeButton}
        >
          <MaterialCommunityIcons color={colors.accent} name="close" size={27} />
        </Pressable>

        <View style={styles.timerPanel}>
          <Text adjustsFontSizeToFit numberOfLines={1} style={styles.time}>
            {formatTimer(displaySeconds)}
          </Text>
          <Pressable
            accessibilityLabel={timer.isRunning ? "Pause timer" : "Start timer"}
            accessibilityRole="button"
            onPress={timer.toggleTimer}
            style={({ pressed }) => [
              styles.playButton,
              timer.isRunning && styles.pauseButton,
              pressed && styles.pressed,
            ]}
          >
            <MaterialCommunityIcons
              color={colors.background}
              name={timer.isRunning ? "pause" : "play"}
              size={46}
            />
          </Pressable>
        </View>

        <View style={styles.bottomPanel}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Timers</Text>
            <Pressable
              accessibilityLabel="Edit timers"
              accessibilityRole="button"
              onPress={() => setEditOpen(true)}
              style={styles.menuButton}
            >
              <MaterialCommunityIcons
                color={colors.accent}
                name="dots-vertical"
                size={24}
              />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.presetRow}
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            <Pressable
              accessibilityRole="button"
              onPress={() => setAddOpen(true)}
              style={styles.addChip}
            >
              <Text style={styles.addChipText}>+ Add Timer</Text>
            </Pressable>
            {timer.presets.map((preset) => (
              <Pressable
                accessibilityRole="button"
                key={preset}
                onPress={() => timer.selectPreset(preset)}
                style={({ pressed }) => [
                  styles.presetChip,
                  timer.selectedDurationSeconds === preset &&
                    styles.presetChipSelected,
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.presetText,
                    timer.selectedDurationSeconds === preset &&
                      styles.presetTextSelected,
                  ]}
                >
                  {formatTimer(preset)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.secondaryActions}>
            <Pressable
              accessibilityRole="button"
              onPress={() => timer.resetTimer()}
              style={styles.secondaryAction}
            >
              <Text style={styles.secondaryActionText}>Reset Timer</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={timer.stopTimer}
              style={styles.secondaryAction}
            >
              <Text style={styles.secondaryActionText}>Stop Timer</Text>
            </Pressable>
          </View>
        </View>

        <AddTimerPanel
          minutes={minutes}
          onCancel={() => {
            setAddOpen(false);
            setMinutes("");
            setSeconds("");
          }}
          onChangeMinutes={setMinutes}
          onChangeSeconds={setSeconds}
          onSave={saveAddedTimer}
          seconds={seconds}
          visible={addOpen}
        />

        <EditTimersModal
          onClose={() => setEditOpen(false)}
          timer={timer}
          visible={editOpen}
        />
      </SafeAreaView>
    </Modal>
  );
}

type AddTimerPanelProps = {
  minutes: string;
  onCancel: () => void;
  onChangeMinutes: (value: string) => void;
  onChangeSeconds: (value: string) => void;
  onSave: () => void;
  seconds: string;
  visible: boolean;
};

function AddTimerPanel({
  minutes,
  onCancel,
  onChangeMinutes,
  onChangeSeconds,
  onSave,
  seconds,
  visible,
}: AddTimerPanelProps) {
  if (!visible) return null;

  return (
    <View style={styles.addPanel}>
      <Text style={styles.addTitle}>Add Timer</Text>
      <View style={styles.timeFields}>
        <TextInput
          keyboardType="number-pad"
          maxLength={2}
          onChangeText={(value) => onChangeMinutes(value.replace(/\D/g, ""))}
          placeholder="00"
          placeholderTextColor={colors.textMuted}
          style={styles.timeInput}
          value={minutes}
        />
        <Text style={styles.colon}>:</Text>
        <TextInput
          keyboardType="number-pad"
          maxLength={2}
          onChangeText={(value) => onChangeSeconds(value.replace(/\D/g, ""))}
          placeholder="50"
          placeholderTextColor={colors.textMuted}
          style={styles.timeInput}
          value={seconds}
        />
      </View>
      <View style={styles.addActions}>
        <Pressable onPress={onCancel} style={styles.cancelButton}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
        <Pressable onPress={onSave} style={styles.saveButton}>
          <Text style={styles.saveText}>Save</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
  handle: {
    alignSelf: "center",
    backgroundColor: colors.accentMuted,
    borderRadius: radius.pill,
    height: 4,
    marginTop: spacing.card,
    width: 42,
  },
  closeButton: {
    alignItems: "center",
    height: 48,
    justifyContent: "center",
    position: "absolute",
    right: spacing.xxl,
    top: spacing.xxl,
    width: 48,
    zIndex: 2,
  },
  timerPanel: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.xxl,
  },
  time: {
    color: colors.textPrimary,
    fontSize: 104,
    fontWeight: "800",
    letterSpacing: 0,
  },
  playButton: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: radius.xl,
    height: 84,
    justifyContent: "center",
    marginTop: spacing.xxl,
    width: 84,
  },
  pauseButton: {
    backgroundColor: "#ff9f43",
  },
  pressed: {
    opacity: animations.pressOpacity,
  },
  bottomPanel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.card,
    padding: spacing.xxl,
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 0,
  },
  menuButton: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  presetRow: {
    gap: spacing.md,
    paddingRight: spacing.xxl,
  },
  addChip: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 42,
    paddingHorizontal: spacing.xxl,
  },
  addChipText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "800",
  },
  presetChip: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 42,
    minWidth: 74,
    paddingHorizontal: spacing.xxl,
  },
  presetChipSelected: {
    borderColor: colors.accent,
    backgroundColor: "rgba(91, 212, 224, 0.12)",
  },
  presetText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "800",
  },
  presetTextSelected: {
    color: colors.accent,
  },
  secondaryActions: {
    flexDirection: "row",
    gap: spacing.card,
  },
  secondaryAction: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    minHeight: 42,
    justifyContent: "center",
  },
  secondaryActionText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "700",
  },
  addPanel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    bottom: 0,
    gap: spacing.card,
    left: 0,
    padding: spacing.xxl,
    position: "absolute",
    right: 0,
    zIndex: 3,
  },
  addTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 0,
  },
  timeFields: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  timeInput: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: "800",
    height: 58,
    textAlign: "center",
    width: 78,
  },
  colon: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: "800",
    marginHorizontal: spacing.md,
  },
  addActions: {
    flexDirection: "row",
    gap: spacing.card,
  },
  cancelButton: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 46,
  },
  cancelText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
  saveButton: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    flex: 1,
    justifyContent: "center",
    minHeight: 46,
  },
  saveText: {
    color: colors.background,
    fontSize: 15,
    fontWeight: "800",
  },
});
