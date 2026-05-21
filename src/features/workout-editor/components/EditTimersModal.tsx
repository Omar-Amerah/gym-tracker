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

import { colors } from "@/theme/colors";
import { radius } from "@/theme/radius";
import { spacing } from "@/theme/spacing";

import { formatTimer, useRestTimer } from "../hooks/useRestTimer";

type RestTimer = ReturnType<typeof useRestTimer>;

type EditTimersModalProps = {
  onClose: () => void;
  timer: RestTimer;
  visible: boolean;
};

export function EditTimersModal({
  onClose,
  timer,
  visible,
}: EditTimersModalProps) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState<number | null>(null);
  const [minutes, setMinutes] = useState("");
  const [seconds, setSeconds] = useState("");

  function openEditor(secondsValue: number | null) {
    setEditorOpen(true);
    setEditingPreset(secondsValue);
    setMinutes(secondsValue ? String(Math.floor(secondsValue / 60)) : "");
    setSeconds(secondsValue ? String(secondsValue % 60).padStart(2, "0") : "");
  }

  function savePreset() {
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

    if (
      timer.presets.includes(totalSeconds) &&
      editingPreset !== totalSeconds
    ) {
      Alert.alert("Duplicate timer", "That timer already exists.");
      return;
    }

    if (editingPreset === null) {
      timer.addPreset(totalSeconds);
    } else {
      timer.updatePreset(editingPreset, totalSeconds);
    }

    closeEditor();
  }

  function closeEditor() {
    setEditorOpen(false);
    setEditingPreset(null);
    setMinutes("");
    setSeconds("");
  }

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent={false}
      visible={visible}
    >
      <SafeAreaView style={styles.screen}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Close edit timers"
            accessibilityRole="button"
            onPress={onClose}
            style={styles.iconButton}
          >
            <MaterialCommunityIcons
              color={colors.accent}
              name="close"
              size={25}
            />
          </Pressable>
          <Text style={styles.title}>Edit Timers</Text>
          <Pressable
            accessibilityLabel="Add timer"
            accessibilityRole="button"
            onPress={() => openEditor(null)}
            style={styles.iconButton}
          >
            <MaterialCommunityIcons color={colors.accent} name="plus" size={26} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        >
          {timer.presets.map((preset, index) => (
            <Pressable
              accessibilityRole="button"
              key={preset}
              onPress={() => openEditor(preset)}
              style={styles.row}
            >
              <Text style={styles.rowText}>{formatTimer(preset)}</Text>
              <View style={styles.reorderButtons}>
                <Pressable
                  accessibilityLabel={`Move ${formatTimer(preset)} earlier`}
                  accessibilityRole="button"
                  disabled={index === 0}
                  onPress={(event) => {
                    event.stopPropagation();
                    timer.movePreset(index, index - 1);
                  }}
                  style={[
                    styles.reorderButton,
                    index === 0 && styles.disabledButton,
                  ]}
                >
                  <MaterialCommunityIcons
                    color={colors.accent}
                    name="chevron-up"
                    size={22}
                  />
                </Pressable>
                <Pressable
                  accessibilityLabel={`Move ${formatTimer(preset)} later`}
                  accessibilityRole="button"
                  disabled={index === timer.presets.length - 1}
                  onPress={(event) => {
                    event.stopPropagation();
                    timer.movePreset(index, index + 1);
                  }}
                  style={[
                    styles.reorderButton,
                    index === timer.presets.length - 1 &&
                      styles.disabledButton,
                  ]}
                >
                  <MaterialCommunityIcons
                    color={colors.accent}
                    name="chevron-down"
                    size={22}
                  />
                </Pressable>
              </View>
              <Pressable
                accessibilityLabel={`Delete ${formatTimer(preset)}`}
                accessibilityRole="button"
                onPress={(event) => {
                  event.stopPropagation();
                  timer.removePreset(preset);
                }}
                style={styles.deleteButton}
              >
                <MaterialCommunityIcons
                  color="#ffaaa1"
                  name="trash-can-outline"
                  size={22}
                />
              </Pressable>
            </Pressable>
          ))}
        </ScrollView>

        <TimerFields
          minutes={minutes}
          onCancel={closeEditor}
          onChangeMinutes={setMinutes}
          onChangeSeconds={setSeconds}
          onSave={savePreset}
          seconds={seconds}
          visible={editorOpen}
        />
      </SafeAreaView>
    </Modal>
  );
}

type TimerFieldsProps = {
  minutes: string;
  onCancel: () => void;
  onChangeMinutes: (value: string) => void;
  onChangeSeconds: (value: string) => void;
  onSave: () => void;
  seconds: string;
  visible: boolean;
};

function TimerFields({
  minutes,
  onCancel,
  onChangeMinutes,
  onChangeSeconds,
  onSave,
  seconds,
  visible,
}: TimerFieldsProps) {
  if (!visible) return null;

  return (
    <View style={styles.editor}>
      <View style={styles.fieldGroup}>
        <TextInput
          keyboardType="number-pad"
          maxLength={2}
          onChangeText={(value) => onChangeMinutes(value.replace(/\D/g, ""))}
          placeholder="00"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          value={minutes}
        />
        <Text style={styles.colon}>:</Text>
        <TextInput
          keyboardType="number-pad"
          maxLength={2}
          onChangeText={(value) => onChangeSeconds(value.replace(/\D/g, ""))}
          placeholder="50"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          value={seconds}
        />
      </View>
      <View style={styles.editorActions}>
        <Pressable onPress={onCancel} style={styles.secondaryButton}>
          <Text style={styles.secondaryText}>Cancel</Text>
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
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.card,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.card,
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  title: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 0,
    textAlign: "center",
  },
  list: {
    paddingBottom: 140,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.md,
  },
  row: {
    alignItems: "center",
    borderBottomColor: colors.borderMuted,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    minHeight: 58,
  },
  rowText: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: 0,
  },
  deleteButton: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  reorderButtons: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  reorderButton: {
    alignItems: "center",
    height: 36,
    justifyContent: "center",
    width: 34,
  },
  disabledButton: {
    opacity: 0.28,
  },
  editor: {
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
  },
  fieldGroup: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  input: {
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
  editorActions: {
    flexDirection: "row",
    gap: spacing.card,
  },
  secondaryButton: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    minHeight: 46,
    justifyContent: "center",
  },
  secondaryText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
  saveButton: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    flex: 1,
    minHeight: 46,
    justifyContent: "center",
  },
  saveText: {
    color: colors.background,
    fontSize: 15,
    fontWeight: "800",
  },
});
