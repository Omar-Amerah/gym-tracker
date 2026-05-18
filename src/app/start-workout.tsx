import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export default function StartWorkoutScreen() {
  const router = useRouter();

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Start Workout</Text>

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/select-exercise')}
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}>
            <Text style={styles.buttonText}>Add Exercise</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.button, styles.finishButton, pressed && styles.buttonPressed]}>
            <Text style={styles.finishButtonText}>Finish Workout</Text>
          </Pressable>
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
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xxl,
    paddingTop: 8,
  },
  title: {
    color: colors.textPrimary,
    letterSpacing: 0,
    marginBottom: spacing.xxl,
    ...typography.monthTitle,
  },
  actions: {
    gap: spacing.lg,
  },
  button: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.xxl,
  },
  finishButton: {
    backgroundColor: colors.fabBackground,
    borderColor: colors.fabBackground,
  },
  buttonPressed: {
    opacity: 0.84,
  },
  buttonText: {
    color: colors.textPrimary,
    letterSpacing: 0,
    ...typography.exercise,
  },
  finishButtonText: {
    color: colors.background,
    letterSpacing: 0,
    ...typography.exercise,
  },
});
