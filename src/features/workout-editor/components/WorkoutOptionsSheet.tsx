import { Text } from "react-native";

import { BottomSheet } from "@/components/bottom-sheet";

import { styles } from "../styles";
import { SheetListAction } from "./SheetActions";

type WorkoutOptionsSheetProps = {
  onClose: () => void;
  onDeleteWorkout: () => void;
  onReorder: () => void;
  visible: boolean;
};

export function WorkoutOptionsSheet({
  onClose,
  onDeleteWorkout,
  onReorder,
  visible,
}: WorkoutOptionsSheetProps) {
  return (
    <BottomSheet onClose={onClose} visible={visible}>
      <Text style={styles.sheetTitle}>Workout Options</Text>
      <SheetListAction
        icon="format-list-bulleted"
        label="Reorder Exercises"
        onPress={onReorder}
      />
      <SheetListAction
        destructive
        icon="trash-can-outline"
        label="Delete Workout"
        onPress={onDeleteWorkout}
      />
    </BottomSheet>
  );
}
