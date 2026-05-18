import { useLocalSearchParams, useRouter } from 'expo-router';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState } from 'react';

import { useRoutines } from '@/state/routines';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';

export default function RoutineDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    deleteRoutine,
    getRoutine,
    moveExercise,
    removeExercise,
    setActiveRoutineId,
    updateExercise,
    updateRoutine,
  } = useRoutines();
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [routineMenuOpen, setRoutineMenuOpen] = useState(false);
  const routine = getRoutine(id);
  const selectedExercise = routine?.exercises.find((exercise) => exercise.id === selectedExerciseId) ?? null;

  if (!routine) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Routine not found.</Text>
        </View>
      </SafeAreaView>
    );
  }
  const routineId = routine.id;

  function openAddExercise() {
    setActiveRoutineId(routineId);
    router.push('/select-exercise');
  }

  function deleteAndLeave() {
    deleteRoutine(routineId);
    router.back();
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View style={styles.screen}>
        <View style={styles.topBar}>
          <Pressable accessibilityLabel="Go back" accessibilityRole="button" onPress={() => router.back()} style={styles.backButton}>
            <View style={styles.backStem} />
            <View style={styles.backHeadTop} />
            <View style={styles.backHeadBottom} />
          </Pressable>

          <View style={styles.topActions}>
            <Pressable accessibilityRole="button">
              <Text style={styles.startText}>START</Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Routine options"
              accessibilityRole="button"
              onPress={() => setRoutineMenuOpen(true)}
              style={styles.moreButton}>
              <View style={styles.moreDot} />
              <View style={styles.moreDot} />
              <View style={styles.moreDot} />
            </Pressable>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: 128 + insets.bottom }]}
          showsVerticalScrollIndicator={false}>
          <View style={styles.formPanel}>
            <View style={styles.inputWrap}>
              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                onChangeText={(name) => updateRoutine(routine.id, { name })}
                placeholder="Routine name"
                placeholderTextColor={colors.textSecondary}
                style={styles.input}
                value={routine.name}
              />
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={() =>
                updateRoutine(routine.id, { targetType: routine.targetType === 'Routine' ? 'Latest' : 'Routine' })
              }
              style={styles.inputWrap}>
              <Text style={styles.inputLabel}>Targets</Text>
              <View style={styles.selectInput}>
                <Text style={styles.inputText}>{routine.targetType}</Text>
                <View style={styles.chevron} />
              </View>
            </Pressable>

            <View style={styles.inputWrap}>
              <TextInput
                onChangeText={(notes) => updateRoutine(routine.id, { notes })}
                placeholder="Notes"
                placeholderTextColor={colors.textSecondary}
                style={[styles.input, styles.notesInput]}
                value={routine.notes}
              />
            </View>
          </View>

          <Text style={styles.sectionTitle}>Exercises</Text>

          <View style={styles.exerciseList}>
            {routine.exercises.map((exercise) => (
              <View key={exercise.id} style={styles.exerciseRow}>
                <View style={styles.exerciseCopy}>
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                  <Text style={styles.exerciseMeta}>
                    {exercise.warmUpSets > 0 ? `${exercise.warmUpSets} Warm Up Sets, ` : ''}
                    {exercise.workingSets} Sets
                  </Text>
                </View>
                <Pressable
                  accessibilityLabel={`${exercise.name} options`}
                  accessibilityRole="button"
                  onPress={() => setSelectedExerciseId(exercise.id)}
                  style={styles.rowMenu}>
                  <View style={styles.rowMenuDot} />
                  <View style={styles.rowMenuDot} />
                  <View style={styles.rowMenuDot} />
                </Pressable>
              </View>
            ))}
          </View>
        </ScrollView>

        <Pressable
          accessibilityRole="button"
          onPress={openAddExercise}
          style={({ pressed }) => [
            styles.addExercise,
            { bottom: 34 + insets.bottom },
            pressed && styles.buttonPressed,
          ]}>
          <View style={styles.plusIcon}>
            <View style={styles.plusVertical} />
            <View style={styles.plusHorizontal} />
          </View>
          <Text style={styles.addExerciseText}>Add Exercise</Text>
        </Pressable>

        <Modal animationType="slide" transparent visible={routineMenuOpen} onRequestClose={() => setRoutineMenuOpen(false)}>
          <Pressable style={styles.sheetScrim} onPress={() => setRoutineMenuOpen(false)}>
            <View style={[styles.sheet, { paddingBottom: 34 + insets.bottom }]}>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setRoutineMenuOpen(false);
                  router.push({ pathname: '/routine/[id]/reorder', params: { id: routineId } });
                }}
                style={styles.sheetAction}>
                <Text style={styles.sheetIcon}>✎</Text>
                <Text style={styles.sheetText}>Edit</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={deleteAndLeave} style={styles.sheetAction}>
                <Text style={[styles.sheetIcon, styles.deleteText]}>▥</Text>
                <Text style={[styles.sheetText, styles.deleteText]}>Delete</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => setRoutineMenuOpen(false)} style={styles.sheetAction}>
                <Text style={styles.sheetIcon}>▤</Text>
                <Text style={styles.sheetText}>Reorder Exercises</Text>
              </Pressable>
            </View>
          </Pressable>
        </Modal>

        <Modal
          animationType="slide"
          transparent
          visible={selectedExerciseId !== null}
          onRequestClose={() => setSelectedExerciseId(null)}>
          <Pressable style={styles.sheetScrim} onPress={() => setSelectedExerciseId(null)}>
            {selectedExercise ? (
              <View style={[styles.exerciseSheet, { paddingBottom: 34 + insets.bottom }]}>
                <Text style={styles.exerciseSheetTitle}>{selectedExercise.name}</Text>
                <View style={styles.stepperRow}>
                  <Text style={styles.sheetText}>Warm Up Sets</Text>
                  <View style={styles.stepper}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() =>
                        updateExercise(routine.id, selectedExercise.id, {
                          warmUpSets: Math.max(0, selectedExercise.warmUpSets - 1),
                        })
                      }
                      style={styles.stepButton}>
                      <Text style={styles.stepText}>-</Text>
                    </Pressable>
                    <Text style={styles.sheetText}>{selectedExercise.warmUpSets}</Text>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() =>
                        updateExercise(routine.id, selectedExercise.id, {
                          warmUpSets: selectedExercise.warmUpSets + 1,
                        })
                      }
                      style={styles.stepButton}>
                      <Text style={styles.stepText}>+</Text>
                    </Pressable>
                  </View>
                </View>
                <View style={styles.stepperRow}>
                  <Text style={styles.sheetText}>Working Sets</Text>
                  <View style={styles.stepper}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() =>
                        updateExercise(routine.id, selectedExercise.id, {
                          workingSets: Math.max(1, selectedExercise.workingSets - 1),
                        })
                      }
                      style={styles.stepButton}>
                      <Text style={styles.stepText}>-</Text>
                    </Pressable>
                    <Text style={styles.sheetText}>{selectedExercise.workingSets}</Text>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() =>
                        updateExercise(routine.id, selectedExercise.id, {
                          workingSets: selectedExercise.workingSets + 1,
                        })
                      }
                      style={styles.stepButton}>
                      <Text style={styles.stepText}>+</Text>
                    </Pressable>
                  </View>
                </View>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setSelectedExerciseId(null);
                    router.push({ pathname: '/routine/[id]/reorder', params: { id: routineId } });
                  }}
                  style={styles.sheetAction}>
                  <Text style={styles.sheetIcon}>▤</Text>
                  <Text style={styles.sheetText}>Reorder Exercises</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => moveExercise(routine.id, selectedExercise.id, 'up')}
                  style={styles.sheetAction}>
                  <Text style={styles.sheetIcon}>↑</Text>
                  <Text style={styles.sheetText}>Move Up</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => moveExercise(routine.id, selectedExercise.id, 'down')}
                  style={styles.sheetAction}>
                  <Text style={styles.sheetIcon}>↓</Text>
                  <Text style={styles.sheetText}>Move Down</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    removeExercise(routine.id, selectedExercise.id);
                    setSelectedExerciseId(null);
                  }}
                  style={styles.sheetAction}>
                  <Text style={[styles.sheetIcon, styles.deleteText]}>▥</Text>
                  <Text style={[styles.sheetText, styles.deleteText]}>Remove Exercise</Text>
                </Pressable>
              </View>
            ) : null}
          </Pressable>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  screen: { flex: 1, backgroundColor: colors.background },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  emptyText: { color: colors.textPrimary, fontSize: 18 },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 24,
    paddingHorizontal: spacing.xxl,
    paddingTop: 8,
  },
  backButton: { height: 24, justifyContent: 'center', width: 28 },
  backStem: { backgroundColor: colors.accent, height: 2, position: 'absolute', width: 22 },
  backHeadTop: {
    backgroundColor: colors.accent,
    height: 2,
    position: 'absolute',
    transform: [{ rotate: '-45deg' }],
    width: 11,
  },
  backHeadBottom: {
    backgroundColor: colors.accent,
    height: 2,
    position: 'absolute',
    transform: [{ rotate: '45deg' }],
    width: 11,
  },
  topActions: { alignItems: 'center', flexDirection: 'row', gap: spacing.xxl },
  startText: { color: colors.accent, fontSize: 14, fontWeight: '700', letterSpacing: 0 },
  moreButton: { alignItems: 'center', gap: 2, height: 22, justifyContent: 'center', width: 12 },
  moreDot: { backgroundColor: colors.accent, borderRadius: radius.circle, height: 3, width: 3 },
  content: { paddingHorizontal: spacing.xxl },
  formPanel: { backgroundColor: colors.surface, borderRadius: 24, gap: 12, padding: 24 },
  inputWrap: { justifyContent: 'center' },
  inputLabel: {
    backgroundColor: colors.surface,
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    left: 15,
    letterSpacing: 0,
    paddingHorizontal: 5,
    position: 'absolute',
    top: -7,
    zIndex: 1,
  },
  input: {
    borderColor: colors.borderMuted,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '400',
    minHeight: 72,
    paddingHorizontal: 24,
  },
  selectInput: {
    alignItems: 'center',
    borderColor: colors.borderMuted,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 72,
    paddingHorizontal: 24,
  },
  inputText: { color: colors.textPrimary, fontSize: 18, fontWeight: '400', letterSpacing: 0 },
  chevron: {
    borderLeftColor: 'transparent',
    borderLeftWidth: 5,
    borderRightColor: 'transparent',
    borderRightWidth: 5,
    borderTopColor: colors.textSecondary,
    borderTopWidth: 6,
  },
  notesInput: { color: colors.textSecondary },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0,
    marginBottom: 18,
    marginTop: 28,
  },
  exerciseList: { gap: 3 },
  exerciseRow: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 64,
    paddingHorizontal: 24,
    paddingVertical: 11,
  },
  exerciseCopy: { flex: 1, paddingRight: spacing.xxl },
  exerciseName: { color: colors.textPrimary, fontSize: 16, fontWeight: '700', letterSpacing: 0, lineHeight: 20, marginBottom: 5 },
  exerciseMeta: { color: colors.textSecondary, fontSize: 15, fontWeight: '400', letterSpacing: 0, lineHeight: 19 },
  rowMenu: { alignItems: 'center', flexDirection: 'row', gap: 3, padding: spacing.sm },
  rowMenuDot: { backgroundColor: colors.textSecondary, borderRadius: radius.circle, height: 3, width: 3 },
  addExercise: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: colors.fabBackground,
    borderRadius: 20,
    flexDirection: 'row',
    gap: 18,
    height: 56,
    justifyContent: 'center',
    minWidth: 236,
    paddingHorizontal: 28,
    position: 'absolute',
  },
  addExerciseText: { color: colors.background, fontSize: 15, fontWeight: '500', letterSpacing: 0 },
  plusIcon: { alignItems: 'center', height: 20, justifyContent: 'center', width: 20 },
  plusVertical: { backgroundColor: colors.background, borderRadius: radius.xs, height: 20, position: 'absolute', width: 2 },
  plusHorizontal: { backgroundColor: colors.background, borderRadius: radius.xs, height: 2, position: 'absolute', width: 20 },
  buttonPressed: { opacity: 0.84 },
  sheetScrim: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#06100f',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    gap: 30,
    paddingHorizontal: 34,
    paddingTop: 64,
  },
  exerciseSheet: {
    backgroundColor: '#06100f',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    gap: 22,
    paddingHorizontal: 34,
    paddingTop: 36,
  },
  exerciseSheetTitle: { color: colors.textPrimary, fontSize: 24, fontWeight: '500', marginBottom: 8 },
  sheetAction: { alignItems: 'center', flexDirection: 'row', gap: 26, minHeight: 44 },
  sheetIcon: { color: colors.textPrimary, fontSize: 22, width: 34 },
  sheetText: { color: colors.textPrimary, fontSize: 18, fontWeight: '400' },
  deleteText: { color: '#ffaaa1' },
  stepperRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  stepper: { alignItems: 'center', flexDirection: 'row', gap: 18 },
  stepButton: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: radius.circle,
    borderWidth: StyleSheet.hairlineWidth,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  stepText: { color: colors.textPrimary, fontSize: 22, lineHeight: 24 },
});
