import { MaterialCommunityIcons } from "@expo/vector-icons";
import { memo } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import type { PreviousExercisePerformance } from "@/db/workoutsRepository";
import { colors } from "@/theme/colors";

import { styles } from "../styles";
import type {
  ActiveWorkoutExercise,
  ActiveWorkoutSet,
  SetField,
} from "../types";
import { isSetFieldMissing } from "../workoutCompletion";
import { getPreviousPlaceholder, getSetFieldPlan } from "../workoutFieldRules";
import { getSetLabel } from "../workoutUtils";
import { SetInput } from "./SetInput";

type PreviousSet = PreviousExercisePerformance["sets"][number] | null;

type SetRowProps = {
  exercise: ActiveWorkoutExercise;
  noteHeight: number | undefined;
  onFocusScroll?: (fieldId: string, inputRef: TextInput | null) => void;
  onOpenSetOptions: (exerciseId: string, setId: string) => void;
  onSetNoteHeight: (setId: string, height: number) => void;
  onUpdateSetField: (
    exerciseId: string,
    setId: string,
    field: SetField,
    value: string,
  ) => void;
  onUpdateSetTimeField: (
    exerciseId: string,
    setId: string,
    value: string,
  ) => void;
  previousSet: PreviousSet;
  set: ActiveWorkoutSet;
  validationAttempted: boolean;
};

export const SetRow = memo(function SetRow({
  exercise,
  noteHeight,
  onFocusScroll,
  onOpenSetOptions,
  onSetNoteHeight,
  onUpdateSetField,
  onUpdateSetTimeField,
  previousSet,
  set,
  validationAttempted,
}: SetRowProps) {
  const setFieldPlan = getSetFieldPlan(exercise.exerciseType);
  const prevNotes = previousSet?.notes?.trim()
    ? `${previousSet.notes.trim()}`
    : undefined;

  return (
    <View style={styles.setRowGroup}>
      <View style={styles.setHeader}>
        <View style={styles.setNumberLabel} />
        {setFieldPlan.map((fieldPlan) => (
          <Text
            key={fieldPlan.field}
            style={[
              styles.setHeaderText,
              fieldPlan.width ? { width: fieldPlan.width } : null,
            ]}
          >
            {fieldPlan.label}
          </Text>
        ))}
        <Text style={[styles.setHeaderText, styles.notesHeader]}>Notes</Text>
        <View style={styles.removeColumn} />
      </View>

      <View style={styles.setRow}>
        <View
          style={[
            styles.setCircle,
            set.type === "warmup" && styles.warmupSetCircle,
            set.type === "drop" && styles.specialSetCircle,
          ]}
        >
          <Text
            style={[
              styles.setCircleText,
              set.type === "warmup" && styles.warmupSetCircleText,
              set.type === "drop" && styles.specialSetCircleText,
            ]}
          >
            {getSetLabel(set, exercise.sets)}
          </Text>
        </View>

        {setFieldPlan.map((fieldPlan) => (
          <SetInput
            key={fieldPlan.field}
            fieldId={`${set.id}-${fieldPlan.field}`}
            hasWarning={
              validationAttempted &&
              set.type !== "warmup" &&
              isSetFieldMissing(set, exercise.exerciseType, fieldPlan.field)
            }
            placeholder={getPreviousPlaceholder(fieldPlan.field, previousSet)}
            keyboardType={fieldPlan.keyboardType}
            onFocusScroll={onFocusScroll}
            onChangeText={(value) => {
              if (fieldPlan.field === "time") {
                onUpdateSetTimeField(exercise.id, set.id, value);
                return;
              }

              onUpdateSetField(exercise.id, set.id, fieldPlan.field, value);
            }}
            value={
              fieldPlan.field === "time"
                ? set.time
                : (set[fieldPlan.field] ?? "")
            }
            width={fieldPlan.width}
          />
        ))}

        <SetInput
          fieldId={`${set.id}-notes`}
          placeholder={prevNotes}
          multiline
          onFocusScroll={onFocusScroll}
          onContentSizeChange={(height) => onSetNoteHeight(set.id, height)}
          onChangeText={(value) =>
            onUpdateSetField(exercise.id, set.id, "notes", value)
          }
          style={[
            styles.notesInput,
            {
              height: noteHeight ?? 38,
            },
          ]}
          value={set.notes}
        />

        <Pressable
          accessibilityLabel="Set options"
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => onOpenSetOptions(exercise.id, set.id)}
          style={styles.setOptionsButton}
        >
          <MaterialCommunityIcons
            color={colors.textMuted}
            name="dots-vertical"
            size={22}
          />
        </Pressable>
      </View>
    </View>
  );
});
