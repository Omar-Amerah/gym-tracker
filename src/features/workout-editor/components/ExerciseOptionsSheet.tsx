import { Text, View } from "react-native";

import { BottomSheet } from "@/components/bottom-sheet";

import { styles } from "../styles";
import type { ActiveWorkoutExercise } from "../types";
import { ExerciseQuickAction, SheetListAction } from "./SheetActions";

type ExerciseOptionsSheetProps = {
  onAddNote: () => void;
  onCharts: () => void;
  onClose: () => void;
  onDelete: () => void;
  onHistory: () => void;
  onPersonalRecords: () => void;
  onReorder: () => void;
  onReplace: () => void;
  onSettings: () => void;
  selectedExercise: ActiveWorkoutExercise | null;
  visible: boolean;
};

export function ExerciseOptionsSheet({
  onAddNote,
  onCharts,
  onClose,
  onDelete,
  onHistory,
  onPersonalRecords,
  onReorder,
  onReplace,
  onSettings,
  selectedExercise,
  visible,
}: ExerciseOptionsSheetProps) {
  return (
    <BottomSheet onClose={onClose} visible={visible}>
      <Text style={styles.sheetTitle}>{selectedExercise?.name}</Text>

      <View style={styles.exerciseQuickActions}>
        <ExerciseQuickAction
          icon="format-list-bulleted"
          label="Reorder"
          onPress={onReorder}
        />
        <ExerciseQuickAction
          icon="swap-horizontal"
          label="Replace"
          onPress={onReplace}
        />
        <ExerciseQuickAction
          destructive
          icon="trash-can-outline"
          label="Delete"
          onPress={onDelete}
        />
      </View>

      <SheetListAction
        icon="note-plus-outline"
        label="Add Note"
        onPress={onAddNote}
      />
      <SheetListAction
        icon="history"
        label="History"
        onPress={onHistory}
      />
      <SheetListAction
        icon="chart-line"
        label="Charts"
        locked
        onPress={onCharts}
      />
      <SheetListAction
        icon="trophy-outline"
        label="Personal Records"
        locked
        onPress={onPersonalRecords}
      />
      <SheetListAction
        icon="cog-outline"
        label="Settings"
        locked
        onPress={onSettings}
      />
    </BottomSheet>
  );
}
