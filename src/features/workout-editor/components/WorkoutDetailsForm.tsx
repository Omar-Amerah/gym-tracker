import { memo } from "react";
import { TextInput, View } from "react-native";

import { styles } from "../styles";
import type { ActiveWorkout, TimePickerTarget, WorkoutField } from "../types";
import { WorkoutInput } from "./WorkoutInput";

type WorkoutDetailsFormProps = {
  onFocusScroll?: (fieldId: string, inputRef: TextInput | null) => void;
  onOpenDatePicker: () => void;
  setTimePickerTarget: (target: TimePickerTarget) => void;
  updateWorkoutField: (field: WorkoutField, value: string) => void;
  workout: ActiveWorkout;
};

export const WorkoutDetailsForm = memo(function WorkoutDetailsForm({
  onFocusScroll,
  onOpenDatePicker,
  setTimePickerTarget,
  updateWorkoutField,
  workout,
}: WorkoutDetailsFormProps) {
  return (
    <View style={styles.detailsGrid}>
      <WorkoutInput
        fieldId="workout-name"
        label="Name"
        onFocusScroll={onFocusScroll}
        onChangeText={(value) => updateWorkoutField("name", value)}
        value={workout.name}
        wide
      />
      <WorkoutInput
        fieldId="workout-bodyweight"
        keyboardType="decimal-pad"
        label="BW (Kg)"
        onFocusScroll={onFocusScroll}
        onChangeText={(value) => updateWorkoutField("bodyweightKg", value)}
        value={workout.bodyweightKg}
      />
      <WorkoutInput
        fieldId="workout-date"
        icon="calendar-month-outline"
        label="Date"
        onPress={onOpenDatePicker}
        onChangeText={(value) => updateWorkoutField("date", value)}
        value={workout.date}
      />
      <WorkoutInput
        fieldId="workout-start"
        icon="clock-outline"
        label="Start"
        onPress={() => setTimePickerTarget("startTime")}
        onChangeText={(value) => updateWorkoutField("startTime", value)}
        value={workout.startTime}
      />
      <WorkoutInput
        fieldId="workout-end"
        icon="clock-outline"
        label="End"
        onPress={() => setTimePickerTarget("endTime")}
        onChangeText={(value) => updateWorkoutField("endTime", value)}
        value={workout.endTime}
      />
      <WorkoutInput
        fieldId="workout-notes"
        label="Notes"
        multiline
        onFocusScroll={onFocusScroll}
        onChangeText={(value) => updateWorkoutField("notes", value)}
        value={workout.notes}
        wide
      />
    </View>
  );
});
