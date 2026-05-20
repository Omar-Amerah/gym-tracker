import { memo } from "react";
import { View } from "react-native";

import { styles } from "../styles";
import type { ActiveWorkout, TimePickerTarget, WorkoutField } from "../types";
import { WorkoutInput } from "./WorkoutInput";

type WorkoutDetailsFormProps = {
  focusedFieldId: string | null;
  onOpenDatePicker: () => void;
  setFocusedFieldId: (fieldId: string | null) => void;
  setTimePickerTarget: (target: TimePickerTarget) => void;
  updateWorkoutField: (field: WorkoutField, value: string) => void;
  workout: ActiveWorkout;
};

export const WorkoutDetailsForm = memo(function WorkoutDetailsForm({
  focusedFieldId,
  onOpenDatePicker,
  setFocusedFieldId,
  setTimePickerTarget,
  updateWorkoutField,
  workout,
}: WorkoutDetailsFormProps) {
  return (
    <View style={styles.detailsGrid}>
      <WorkoutInput
        fieldId="workout-name"
        focusedFieldId={focusedFieldId}
        label="Name"
        onChangeText={(value) => updateWorkoutField("name", value)}
        setFocusedFieldId={setFocusedFieldId}
        value={workout.name}
        wide
      />
      <WorkoutInput
        fieldId="workout-bodyweight"
        focusedFieldId={focusedFieldId}
        keyboardType="decimal-pad"
        label="BW (Kg)"
        onChangeText={(value) => updateWorkoutField("bodyweightKg", value)}
        setFocusedFieldId={setFocusedFieldId}
        value={workout.bodyweightKg}
      />
      <WorkoutInput
        fieldId="workout-date"
        focusedFieldId={focusedFieldId}
        icon="calendar-month-outline"
        label="Date"
        onPress={onOpenDatePicker}
        onChangeText={(value) => updateWorkoutField("date", value)}
        setFocusedFieldId={setFocusedFieldId}
        value={workout.date}
      />
      <WorkoutInput
        fieldId="workout-start"
        focusedFieldId={focusedFieldId}
        icon="clock-outline"
        label="Start"
        onPress={() => setTimePickerTarget("startTime")}
        onChangeText={(value) => updateWorkoutField("startTime", value)}
        setFocusedFieldId={setFocusedFieldId}
        value={workout.startTime}
      />
      <WorkoutInput
        fieldId="workout-end"
        focusedFieldId={focusedFieldId}
        icon="clock-outline"
        label="End"
        onPress={() => setTimePickerTarget("endTime")}
        onChangeText={(value) => updateWorkoutField("endTime", value)}
        setFocusedFieldId={setFocusedFieldId}
        value={workout.endTime}
      />
      <WorkoutInput
        fieldId="workout-notes"
        focusedFieldId={focusedFieldId}
        label="Notes"
        multiline
        onChangeText={(value) => updateWorkoutField("notes", value)}
        setFocusedFieldId={setFocusedFieldId}
        value={workout.notes}
        wide
      />
    </View>
  );
});
