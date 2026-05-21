import { MaterialCommunityIcons } from "@expo/vector-icons";
import { memo, useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import type { PreviousExercisePerformance } from "@/db/workoutsRepository";
import { colors } from "@/theme/colors";

import { styles } from "../styles";
import type { ActiveWorkoutExercise, SetField } from "../types";
import { isExerciseComplete } from "../workoutCompletion";
import { getPreviousSetForCurrent } from "../workoutUtils";
import { ExerciseFooterActions } from "./ExerciseFooterActions";
import { SetRow } from "./SetRow";

type ExerciseSectionProps = {
  exercise: ActiveWorkoutExercise;
  exerciseNoteTargetId: string | null;
  noteHeights: Record<string, number>;
  onAddSet: (exerciseId: string) => void;
  onExerciseNoteHeight: (exerciseId: string, height: number) => void;
  onFocusScroll?: (fieldId: string, inputRef: TextInput | null) => void;
  onHistory: (exercise: ActiveWorkoutExercise) => void;
  onOpenExerciseOptions: (exerciseId: string) => void;
  onOpenSetOptions: (exerciseId: string, setId: string) => void;
  onSetNoteHeight: (setId: string, height: number) => void;
  onUpdateExerciseNote: (exerciseId: string, value: string) => void;
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
  previousPerformance: PreviousExercisePerformance | undefined;
  setExerciseNoteRef: (exerciseId: string, ref: TextInput | null) => void;
  validationAttempted: boolean;
};

export const ExerciseSection = memo(function ExerciseSection({
  exercise,
  exerciseNoteTargetId,
  noteHeights,
  onAddSet,
  onExerciseNoteHeight,
  onFocusScroll,
  onHistory,
  onOpenExerciseOptions,
  onOpenSetOptions,
  onSetNoteHeight,
  onUpdateExerciseNote,
  onUpdateSetField,
  onUpdateSetTimeField,
  previousPerformance,
  setExerciseNoteRef,
  validationAttempted,
}: ExerciseSectionProps) {
  const exerciseNoteRef = useRef<TextInput | null>(null);
  const [isNoteFocused, setIsNoteFocused] = useState(false);
  const previousExerciseNote = previousPerformance?.notes?.trim() || undefined;
  const exerciseComplete = isExerciseComplete(exercise);

  return (
    <View style={styles.exerciseSection}>
      <View style={styles.exerciseHeader}>
        <Text style={styles.exerciseTitle}>{exercise.name}</Text>
        {exerciseComplete ? (
          <MaterialCommunityIcons
            accessibilityLabel={`${exercise.name} complete`}
            color={colors.accent}
            name="check"
            size={18}
            style={styles.exerciseCompleteIcon}
          />
        ) : null}
        <Pressable
          accessibilityLabel={`${exercise.name} options`}
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => onOpenExerciseOptions(exercise.id)}
          style={styles.exerciseMenu}
        >
          <MaterialCommunityIcons
            color={colors.textSecondary}
            name="dots-vertical"
            size={23}
          />
        </Pressable>
      </View>

      {exercise.notes.length > 0 ||
      exerciseNoteTargetId === exercise.id ||
      previousExerciseNote ? (
        <TextInput
          ref={(ref) => {
            exerciseNoteRef.current = ref;
            setExerciseNoteRef(exercise.id, ref);
          }}
          multiline
          onContentSizeChange={(event) => {
            const height = event.nativeEvent.contentSize.height;
            onExerciseNoteHeight(exercise.id, height);
          }}
          onChangeText={(value) => onUpdateExerciseNote(exercise.id, value)}
          onBlur={() => setIsNoteFocused(false)}
          onFocus={() => {
            setIsNoteFocused(true);
            onFocusScroll?.(
              `exercise-${exercise.id}-notes`,
              exerciseNoteRef.current,
            );
          }}
          placeholder={previousExerciseNote || "Exercise note"}
          placeholderTextColor={colors.textMuted}
          scrollEnabled
          style={[
            styles.exerciseNoteInput,
            isNoteFocused && styles.inputFocused,
            {
              height: noteHeights[`exercise-${exercise.id}`] ?? 48,
            },
          ]}
          textAlignVertical="top"
          value={exercise.notes}
        />
      ) : null}

      {exercise.sets.map((set) => (
        <SetRow
          key={set.id}
          exercise={exercise}
          noteHeight={noteHeights[set.id]}
          onFocusScroll={onFocusScroll}
          onOpenSetOptions={onOpenSetOptions}
          onSetNoteHeight={onSetNoteHeight}
          onUpdateSetField={onUpdateSetField}
          onUpdateSetTimeField={onUpdateSetTimeField}
          previousSet={getPreviousSetForCurrent(
            set,
            exercise.sets,
            previousPerformance,
          )}
          set={set}
          validationAttempted={validationAttempted}
        />
      ))}

      <ExerciseFooterActions
        exerciseName={exercise.name}
        onAddSet={() => onAddSet(exercise.id)}
        onHistory={() => onHistory(exercise)}
      />
    </View>
  );
});
