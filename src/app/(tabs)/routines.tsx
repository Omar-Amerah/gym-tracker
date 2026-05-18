import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useRoutines } from '@/state/routines';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export default function RoutinesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { createRoutine, deleteRoutine, duplicateRoutine, routines, setActiveRoutineId } = useRoutines();
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedRoutineId, setSelectedRoutineId] = useState<string | null>(null);
  const selectedRoutine = routines.find((routine) => routine.id === selectedRoutineId);

  function openRoutine(id: string) {
    setActiveRoutineId(id);
    router.push({ pathname: '/routine/[id]', params: { id } });
  }

  function createAndOpenRoutine() {
    const id = createRoutine();
    openRoutine(id);
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="Open menu" accessibilityRole="button" style={styles.iconButton}>
            <View style={styles.menuLine} />
            <View style={styles.menuLine} />
            <View style={styles.menuLine} />
          </Pressable>
          <Text style={styles.title}>Routines</Text>
          <Pressable
            accessibilityLabel="Routine list options"
            accessibilityRole="button"
            onPress={() => setMenuOpen(true)}
            style={styles.moreButton}>
            <View style={styles.moreDot} />
            <View style={styles.moreDot} />
            <View style={styles.moreDot} />
          </Pressable>
        </View>

        <View style={styles.list}>
          {routines.map((routine, index) => (
            <Pressable
              accessibilityRole="button"
              key={routine.id}
              onPress={() => openRoutine(routine.id)}
              style={({ pressed }) => [
                styles.routineRow,
                index === 0 && styles.firstRow,
                index === routines.length - 1 && styles.lastRow,
                pressed && styles.rowPressed,
              ]}>
              <Text style={styles.routineName}>{routine.name}</Text>
              <Pressable
                accessibilityLabel={`${routine.name} options`}
                accessibilityRole="button"
                onPress={(event) => {
                  event.stopPropagation();
                  setSelectedRoutineId(routine.id);
                }}
                style={styles.rowMenu}>
                <View style={styles.rowMenuDot} />
                <View style={styles.rowMenuDot} />
                <View style={styles.rowMenuDot} />
              </Pressable>
            </Pressable>
          ))}
        </View>

        <Pressable
          accessibilityLabel="Create routine"
          accessibilityRole="button"
          onPress={createAndOpenRoutine}
          style={({ pressed }) => [styles.addButton, { bottom: 88 + insets.bottom }, pressed && styles.addButtonPressed]}>
          <View style={styles.plusIcon}>
            <View style={styles.plusVertical} />
            <View style={styles.plusHorizontal} />
          </View>
        </Pressable>

        <Modal animationType="slide" transparent visible={menuOpen} onRequestClose={() => setMenuOpen(false)}>
          <Pressable style={styles.sheetScrim} onPress={() => setMenuOpen(false)}>
            <View style={[styles.sheet, { paddingBottom: 34 + insets.bottom }]}>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setMenuOpen(false);
                  router.push('/reorder-routines');
                }}
                style={styles.sheetAction}>
                <Text style={styles.sheetIcon}>▤</Text>
                <Text style={styles.sheetText}>Reorder</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  if (routines[0]) duplicateRoutine(routines[0].id);
                  setMenuOpen(false);
                }}
                style={styles.sheetAction}>
                <Text style={styles.sheetIcon}>▣</Text>
                <Text style={styles.sheetText}>Copy</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  if (routines[0]) deleteRoutine(routines[0].id);
                  setMenuOpen(false);
                }}
                style={styles.sheetAction}>
                <Text style={[styles.sheetIcon, styles.deleteText]}>▥</Text>
                <Text style={[styles.sheetText, styles.deleteText]}>Delete</Text>
              </Pressable>
            </View>
          </Pressable>
        </Modal>

        <Modal
          animationType="slide"
          transparent
          visible={selectedRoutineId !== null}
          onRequestClose={() => setSelectedRoutineId(null)}>
          <Pressable style={styles.sheetScrim} onPress={() => setSelectedRoutineId(null)}>
            <View style={[styles.sheet, { paddingBottom: 34 + insets.bottom }]}>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setSelectedRoutineId(null);
                  router.push('/reorder-routines');
                }}
                style={styles.sheetAction}>
                <Text style={styles.sheetIcon}>▤</Text>
                <Text style={styles.sheetText}>Reorder</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  if (selectedRoutineId) duplicateRoutine(selectedRoutineId);
                  setSelectedRoutineId(null);
                }}
                style={styles.sheetAction}>
                <Text style={styles.sheetIcon}>▣</Text>
                <Text style={styles.sheetText}>Copy</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  if (selectedRoutineId) deleteRoutine(selectedRoutineId);
                  setSelectedRoutineId(null);
                }}
                style={styles.sheetAction}>
                <Text style={[styles.sheetIcon, styles.deleteText]}>▥</Text>
                <Text style={[styles.sheetText, styles.deleteText]}>
                  Delete{selectedRoutine ? ` ${selectedRoutine.name}` : ''}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Modal>
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
    gap: spacing.xl,
    paddingBottom: 31,
    paddingHorizontal: spacing.xl,
    paddingTop: 8,
  },
  iconButton: {
    alignItems: 'center',
    borderRadius: radius.circle,
    height: 23,
    justifyContent: 'center',
    width: 23,
  },
  menuLine: {
    backgroundColor: colors.accent,
    borderRadius: radius.xs,
    height: 2,
    marginVertical: 2,
    width: 19,
  },
  title: {
    color: colors.textPrimary,
    flex: 1,
    letterSpacing: 0,
    ...typography.monthTitle,
  },
  moreButton: {
    alignItems: 'center',
    gap: 2,
    height: 22,
    justifyContent: 'center',
    width: 12,
  },
  moreDot: {
    backgroundColor: colors.accent,
    borderRadius: radius.circle,
    height: 3,
    width: 3,
  },
  list: {
    paddingHorizontal: spacing.xxl,
  },
  routineRow: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 104,
    paddingHorizontal: 24,
  },
  firstRow: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  lastRow: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  rowPressed: {
    backgroundColor: colors.surfacePressed,
  },
  routineName: {
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: '400',
    letterSpacing: 0,
  },
  rowMenu: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    padding: spacing.md,
  },
  rowMenuDot: {
    backgroundColor: colors.textSecondary,
    borderRadius: radius.circle,
    height: 4,
    width: 4,
  },
  addButton: {
    alignItems: 'center',
    backgroundColor: colors.fabBackground,
    borderRadius: 22,
    height: 84,
    justifyContent: 'center',
    position: 'absolute',
    right: spacing.xxl,
    width: 86,
    zIndex: 10,
  },
  addButtonPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.97 }],
  },
  plusIcon: {
    alignItems: 'center',
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  plusVertical: {
    backgroundColor: colors.background,
    borderRadius: radius.xs,
    height: 30,
    position: 'absolute',
    width: 3,
  },
  plusHorizontal: {
    backgroundColor: colors.background,
    borderRadius: radius.xs,
    height: 3,
    position: 'absolute',
    width: 30,
  },
  sheetScrim: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#06100f',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    gap: 30,
    paddingHorizontal: 34,
    paddingTop: 64,
  },
  sheetAction: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 38,
    minHeight: 54,
  },
  sheetIcon: {
    color: colors.textPrimary,
    fontSize: 24,
    width: 48,
  },
  sheetText: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '400',
  },
  deleteText: {
    color: '#ffaaa1',
  },
});
