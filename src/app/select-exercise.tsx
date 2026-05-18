import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';

const categories = ['Abs', 'Back', 'Biceps', 'Cardio', 'Chest', 'Legs', 'Shoulders', 'Triceps'] as const;

export default function SelectExerciseScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="Close select exercise" accessibilityRole="button" onPress={() => router.back()} style={styles.closeButton}>
            <View style={[styles.closeLine, styles.closeLineForward]} />
            <View style={[styles.closeLine, styles.closeLineBack]} />
          </Pressable>
          <Text style={styles.title}>Select Exercise</Text>
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
          {categories.map((category) => (
            <Pressable
              accessibilityRole="button"
              key={category}
              onPress={() => category === 'Abs' && router.push('/select-exercise/abs')}
              style={({ pressed }) => [styles.categoryRow, pressed && styles.rowPressed]}>
              <Text style={styles.categoryText}>{category}</Text>
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
  closeButton: {
    height: 26,
    justifyContent: 'center',
    marginRight: 34,
    width: 26,
  },
  closeLine: {
    backgroundColor: colors.accent,
    height: 3,
    position: 'absolute',
    width: 28,
  },
  closeLineForward: {
    transform: [{ rotate: '45deg' }],
  },
  closeLineBack: {
    transform: [{ rotate: '-45deg' }],
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
  categoryRow: {
    justifyContent: 'center',
    minHeight: 74,
  },
  rowPressed: {
    opacity: 0.7,
  },
  categoryText: {
    color: colors.textPrimary,
    fontSize: 25,
    fontWeight: '400',
    letterSpacing: 0,
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
