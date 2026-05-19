import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useRoutines } from '@/state/routines';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { backOrReplace } from '@/utils/navigation';

const exercises = [
  { id: '1', name: 'Cable Woodchops', info: false },
  { id: '2', name: 'Crunches', info: true },
  { id: '3', name: 'Leg Raises', info: true },
  { id: '4', name: 'Medball Rotations', info: false },
  { id: '5', name: 'Pallof Press', info: false },
  { id: '6', name: 'Plank', info: true },
] as const;

export default function AbsExerciseScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { activeRoutineId, addExercise } = useRoutines();

  function selectExercise(name: string) {
    if (!activeRoutineId) return;
    addExercise(activeRoutineId, name);
    router.replace({ pathname: '/routine/[id]', params: { id: activeRoutineId } });
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="Back to categories" accessibilityRole="button" onPress={() => backOrReplace('/select-exercise')} style={styles.backButton}>
            <View style={styles.backStem} />
            <View style={styles.backHeadTop} />
            <View style={styles.backHeadBottom} />
          </Pressable>
          <Text style={styles.title}>Abs</Text>
          <View style={styles.headerActions}>
            <Pressable accessibilityLabel="Search exercises" accessibilityRole="button" style={styles.searchIcon}>
              <View style={styles.searchCircle} />
              <View style={styles.searchHandle} />
            </Pressable>
            <Pressable accessibilityLabel="Create exercise" accessibilityRole="button" style={styles.headerPlus}>
              <View style={styles.plusVertical} />
              <View style={styles.plusHorizontal} />
            </Pressable>
          </View>
        </View>

        <View style={styles.list}>
          {exercises.map((exercise) => (
            <Pressable
              accessibilityRole="button"
              key={exercise.id}
              onPress={() => selectExercise(exercise.name)}
              style={({ pressed }) => [styles.exerciseRow, pressed && styles.rowPressed]}>
              <Text style={styles.exerciseText}>{exercise.name}</Text>
              <View style={styles.exerciseActions}>
                {exercise.info ? (
                  <View style={styles.infoIcon}>
                    <Text style={styles.infoText}>i</Text>
                  </View>
                ) : null}
                <View style={styles.rowMenu}>
                  <View style={styles.rowMenuDot} />
                  <View style={styles.rowMenuDot} />
                  <View style={styles.rowMenuDot} />
                </View>
              </View>
            </Pressable>
          ))}
        </View>

        <View style={[styles.bottomBar, { height: 96 + insets.bottom, paddingBottom: insets.bottom }]}>
          <View style={styles.option}>
            <View style={styles.radioSelected}>
              <View style={styles.radioDot} />
            </View>
            <Text style={styles.optionText}>Regular</Text>
          </View>
          <View style={styles.option}>
            <View style={styles.radio} />
            <Text style={styles.optionText}>Unlock Supersets</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingBottom: 26,
    paddingHorizontal: spacing.xxl,
    paddingTop: 8,
  },
  backButton: {
    height: 26,
    justifyContent: 'center',
    marginRight: 34,
    width: 28,
  },
  backStem: {
    backgroundColor: colors.accent,
    height: 2,
    position: 'absolute',
    width: 23,
  },
  backHeadTop: {
    backgroundColor: colors.accent,
    height: 2,
    position: 'absolute',
    transform: [{ rotate: '-45deg' }],
    width: 12,
  },
  backHeadBottom: {
    backgroundColor: colors.accent,
    height: 2,
    position: 'absolute',
    transform: [{ rotate: '45deg' }],
    width: 12,
  },
  title: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: 34,
    fontWeight: '400',
    letterSpacing: 0,
  },
  headerActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 28,
  },
  searchIcon: {
    height: 30,
    width: 30,
  },
  searchCircle: {
    borderColor: colors.accent,
    borderRadius: radius.circle,
    borderWidth: 3,
    height: 19,
    width: 19,
  },
  searchHandle: {
    backgroundColor: colors.accent,
    height: 13,
    left: 19,
    position: 'absolute',
    top: 18,
    transform: [{ rotate: '-45deg' }],
    width: 3,
  },
  headerPlus: {
    alignItems: 'center',
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  plusVertical: {
    backgroundColor: colors.accent,
    height: 26,
    position: 'absolute',
    width: 3,
  },
  plusHorizontal: {
    backgroundColor: colors.accent,
    height: 3,
    position: 'absolute',
    width: 26,
  },
  list: {
    paddingHorizontal: spacing.xxl,
  },
  exerciseRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 74,
  },
  rowPressed: {
    opacity: 0.7,
  },
  exerciseText: {
    color: colors.textPrimary,
    fontSize: 27,
    fontWeight: '400',
    letterSpacing: 0,
  },
  exerciseActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 28,
  },
  infoIcon: {
    alignItems: 'center',
    borderColor: colors.textPrimary,
    borderRadius: radius.circle,
    borderWidth: 3,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  infoText: {
    color: colors.textPrimary,
    fontSize: 19,
    fontWeight: '700',
    lineHeight: 22,
  },
  rowMenu: {
    alignItems: 'center',
    gap: 3,
  },
  rowMenuDot: {
    backgroundColor: colors.textSecondary,
    borderRadius: radius.circle,
    height: 5,
    width: 5,
  },
  bottomBar: {
    alignItems: 'center',
    backgroundColor: colors.fabBackground,
    bottom: 0,
    flexDirection: 'row',
    gap: 22,
    left: 0,
    paddingHorizontal: spacing.xxl,
    position: 'absolute',
    right: 0,
  },
  option: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  radioSelected: {
    alignItems: 'center',
    borderColor: colors.background,
    borderRadius: radius.circle,
    borderWidth: 3,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  radioDot: {
    backgroundColor: colors.background,
    borderRadius: radius.circle,
    height: 15,
    width: 15,
  },
  radio: {
    borderColor: colors.background,
    borderRadius: radius.circle,
    borderWidth: 3,
    height: 30,
    width: 30,
  },
  optionText: {
    color: colors.background,
    fontSize: 20,
    fontWeight: '400',
    letterSpacing: 0,
  },
});
