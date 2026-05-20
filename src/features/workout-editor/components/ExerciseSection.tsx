import { MaterialCommunityIcons } from "@expo/vector-icons";
import { memo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import type { PreviousExercisePerformance } from "@/db/workoutsRepository";
import { colors } from "@/theme/colors";

import { styles } from "../styles";
import type { ActiveWorkoutExercise, SetField } from "../types";
import { getPreviousSetForCurrent } from "../workoutUtils";
import { ExerciseFooterActions } from "./ExerciseFooterActions";
import { SetRow } from "./SetRow";

type ExerciseSectionProps = {
  exercise: ActiveWorkoutExercise;
  exerciseNoteTargetId: string | null;
  focusedFieldId: string | null;
  noteHeights: Record<string, number>;
  onAddSet: (exerciseId: string) => void;
  onExerciseNoteHeight: (exerciseId: string, height: number) => void;
  onOpenExerciseOptions: (exerciseId: string) => void;
  onOpenSetOptions: (exerciseId: string, setId: string) => void;
  onSetFocusedFieldId: (fieldId: string | null) => void;
  onSetNoteHeight: (setId: string, height: number) => void;
  onShowFutureAction: (message: string) => void;
  onToggleExerciseStar: (exerciseId: string) => void;
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
};

export const ExerciseSection = memo(function ExerciseSection({
  exercise,
  exerciseNoteTargetId,
  focusedFieldId,
  noteHeights,
  onAddSet,
  onExerciseNoteHeight,
  onOpenExerciseOptions,
  onOpenSetOptions,
  onSetFocusedFieldId,
  onSetNoteHeight,
  onShowFutureAction,
  onToggleExerciseStar,
  onUpdateExerciseNote,
  onUpdateSetField,
  onUpdateSetTimeField,
  previousPerformance,
  setExerciseNoteRef,
}: ExerciseSectionProps) {
  const [isNoteFocused, setIsNoteFocused] = useState(false);
  const showNoteFocus =
    isNoteFocused || focusedFieldId === `exercise-${exercise.id}-notes`;
  const previousExerciseNote = previousPerformance?.notes?.trim() || undefined;

  return (
    <View style={styles.exerciseSection}>
      <View style={styles.exerciseHeader}>
        <Text style={styles.exerciseTitle}>{exercise.name}</Text>
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

      {exercise.notes.length > 0 || exerciseNoteTargetId === exercise.id ? (
        <TextInput
          multiline
          onContentSizeChange={(event) => {
            const height = event.nativeEvent.contentSize.height;
            // Clamp to 48px until it genuinely hits a second line (> 60px)
            const clampedHeight = height < 60 ? 48 : Math.min(150, height);
            onExerciseNoteHeight(exercise.id, clampedHeight);
          }}
          onChangeText={(value) => onUpdateExerciseNote(exercise.id, value)}
          onBlur={() => {
            setIsNoteFocused(false);
            onSetFocusedFieldId(null);
          }}
          onFocus={() => {
            setIsNoteFocused(true);
            onSetFocusedFieldId(`exercise-${exercise.id}-notes`);
          }}
          placeholder={previousExerciseNote || "Exercise note"}
          placeholderTextColor={colors.textMuted}
          ref={(ref) => setExerciseNoteRef(exercise.id, ref)}
          scrollEnabled
          style={[
            styles.exerciseNoteInput,
            showNoteFocus && styles.inputFocused,
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
          focusedFieldId={focusedFieldId}
          noteHeight={noteHeights[set.id]}
          onOpenSetOptions={onOpenSetOptions}
          onSetFocusedFieldId={onSetFocusedFieldId}
          onSetNoteHeight={onSetNoteHeight}
          onUpdateSetField={onUpdateSetField}
          onUpdateSetTimeField={onUpdateSetTimeField}
          previousSet={getPreviousSetForCurrent(
            set,
            exercise.sets,
            previousPerformance,
          )}
          set={set}
        />
      ))}

      <ExerciseFooterActions
        exerciseName={exercise.name}
        isStarred={exercise.isStarred}
        onAddSet={() => onAddSet(exercise.id)}
        onCharts={() =>
          onShowFutureAction(
            "Charts will be available after workouts are saved.",
          )
        }
        onHistory={() =>
          onShowFutureAction(
            "History will be available after workouts are saved.",
          )
        }
        onToggleStar={() => onToggleExerciseStar(exercise.id)}
      />
    </View>
  );
});
