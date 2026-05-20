import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, Text } from "react-native";

import { BottomSheet } from "@/components/bottom-sheet";
import { colors } from "@/theme/colors";

import { styles } from "../styles";
import type { ActiveWorkoutSet, SelectedSet } from "../types";
import { getSetTypeLabel } from "../workoutUtils";

type SetOptionsSheetProps = {
  onChangeSetType: (
    exerciseId: string,
    setId: string,
    type: ActiveWorkoutSet["type"],
  ) => void;
  onClose: () => void;
  onCopyOnce: (exerciseId: string, setId: string) => void;
  onDelete: (exerciseId: string, setId: string) => void;
  selectedSet: SelectedSet;
  selectedSetData: ActiveWorkoutSet | null | undefined;
  visible: boolean;
};

export function SetOptionsSheet({
  onChangeSetType,
  onClose,
  onCopyOnce,
  onDelete,
  selectedSet,
  selectedSetData,
  visible,
}: SetOptionsSheetProps) {
  return (
    <BottomSheet onClose={onClose} visible={visible}>
      <Text style={styles.sheetTitle}>Set Options</Text>
      <Text style={styles.sheetDescription}>
        {selectedSetData ? getSetTypeLabel(selectedSetData.type) : ""}
      </Text>

      {(["normal", "warmup", "drop"] as const).map((type) => (
        <Pressable
          accessibilityRole="button"
          key={type}
          onPress={() => {
            if (!selectedSet) return;
            onChangeSetType(selectedSet.exerciseId, selectedSet.setId, type);
          }}
          style={({ pressed }) => [
            styles.sheetAction,
            pressed && styles.pressed,
          ]}
        >
          <MaterialCommunityIcons
            color={
              selectedSetData?.type === type
                ? colors.accent
                : colors.textPrimary
            }
            name={selectedSetData?.type === type ? "check" : "circle-outline"}
            size={24}
            style={styles.sheetIcon}
          />
          <Text
            style={[
              styles.sheetText,
              selectedSetData?.type === type && styles.sheetTextSelected,
            ]}
          >
            {getSetTypeLabel(type)}
          </Text>
        </Pressable>
      ))}

      <Pressable
        accessibilityRole="button"
        onPress={() => {
          if (!selectedSet) return;
          onCopyOnce(selectedSet.exerciseId, selectedSet.setId);
          onClose();
        }}
        style={({ pressed }) => [styles.sheetAction, pressed && styles.pressed]}
      >
        <MaterialCommunityIcons
          color={colors.textPrimary}
          name="content-copy"
          size={22}
          style={styles.sheetIcon}
        />
        <Text style={styles.sheetText}>Copy Once</Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        onPress={() => {
          if (!selectedSet) return;
          onDelete(selectedSet.exerciseId, selectedSet.setId);
        }}
        style={({ pressed }) => [styles.sheetAction, pressed && styles.pressed]}
      >
        <MaterialCommunityIcons
          color="#ffaaa1"
          name="trash-can-outline"
          size={24}
          style={styles.sheetIcon}
        />
        <Text style={[styles.sheetText, styles.deleteText]}>Delete</Text>
      </Pressable>
    </BottomSheet>
  );
}
