import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { useRoutines } from "@/state/routines";
import { colors } from "@/theme/colors";
import { radius } from "@/theme/radius";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";

export default function RoutinesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    createRoutine,
    deleteRoutine,
    duplicateRoutine,
    routines,
    setActiveRoutineId,
  } = useRoutines();
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedRoutineId, setSelectedRoutineId] = useState<string | null>(
    null,
  );
  const selectedRoutine = routines.find(
    (routine) => routine.id === selectedRoutineId,
  );

  function openRoutine(id: string) {
    setActiveRoutineId(id);
    router.push({ pathname: "/routine/[id]", params: { id } });
  }

  function createAndOpenRoutine() {
    const id = createRoutine();
    openRoutine(id);
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={styles.screenRoot}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Open menu"
            accessibilityRole="button"
            style={styles.iconButton}
          >
            <View style={styles.menuLine} />
            <View style={styles.menuLine} />
            <View style={styles.menuLine} />
          </Pressable>
          <Text style={styles.title}>Routines</Text>
          <Pressable
            accessibilityLabel="Routine list options"
            accessibilityRole="button"
            onPress={() => setMenuOpen(true)}
            style={styles.moreButton}
          >
            <View style={styles.moreDot} />
            <View style={styles.moreDot} />
            <View style={styles.moreDot} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.list}>
            {routines.map((routine, index) => (
              <View
                key={routine.id}
                style={[
                  styles.routineRow,
                  index === 0 && styles.firstRow,
                  index === routines.length - 1 && styles.lastRow,
                ]}
              >
                <Pressable
                  accessibilityRole="button"
                  onPress={() => openRoutine(routine.id)}
                  style={({ pressed }) => [
                    styles.routineMain,
                    pressed && styles.rowPressed,
                  ]}
                >
                  <Text style={styles.routineName}>{routine.name}</Text>
                  <Text style={styles.routineMeta}>
                    {routine.exercises.length} exercises
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityLabel={`${routine.name} options`}
                  accessibilityRole="button"
                  onPress={() => {
                    setSelectedRoutineId(routine.id);
                  }}
                  style={styles.rowMenu}
                >
                  <View style={styles.rowMenuDot} />
                  <View style={styles.rowMenuDot} />
                  <View style={styles.rowMenuDot} />
                </Pressable>
              </View>
            ))}
          </View>
        </ScrollView>

        <Pressable
          accessibilityLabel="Create routine"
          accessibilityRole="button"
          onPress={createAndOpenRoutine}
          style={({ pressed }) => [
            styles.fab,
            pressed && styles.addButtonPressed,
          ]}
        >
          <View style={styles.plusIcon}>
            <View style={styles.plusVertical} />
            <View style={styles.plusHorizontal} />
          </View>
        </Pressable>

        <Modal
          animationType="slide"
          transparent
          visible={menuOpen}
          onRequestClose={() => setMenuOpen(false)}
        >
          <View style={styles.sheetScrim}>
            <Pressable
              accessibilityLabel="Close menu"
              style={styles.scrimDismiss}
              onPress={() => setMenuOpen(false)}
            />
            <View style={[styles.sheet, { paddingBottom: 34 + insets.bottom }]}>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setMenuOpen(false);
                  router.push("/reorder-routines");
                }}
                style={styles.sheetAction}
              >
                <MaterialCommunityIcons
                  color={colors.textPrimary}
                  name="sort"
                  size={24}
                  style={styles.sheetIcon}
                />
                <Text style={styles.sheetText}>Reorder</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  if (routines[0]) duplicateRoutine(routines[0].id);
                  setMenuOpen(false);
                }}
                style={styles.sheetAction}
              >
                <MaterialCommunityIcons
                  color={colors.textPrimary}
                  name="content-copy"
                  size={22}
                  style={styles.sheetIcon}
                />
                <Text style={styles.sheetText}>Copy</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  if (routines[0]) deleteRoutine(routines[0].id);
                  setMenuOpen(false);
                }}
                style={styles.sheetAction}
              >
                <MaterialCommunityIcons
                  color="#ffaaa1"
                  name="trash-can-outline"
                  size={24}
                  style={styles.sheetIcon}
                />
                <Text style={[styles.sheetText, styles.deleteText]}>
                  Delete
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        <Modal
          animationType="slide"
          transparent
          visible={selectedRoutineId !== null}
          onRequestClose={() => setSelectedRoutineId(null)}
        >
          <View style={styles.sheetScrim}>
            <Pressable
              accessibilityLabel="Close routine options"
              style={styles.scrimDismiss}
              onPress={() => setSelectedRoutineId(null)}
            />
            <View style={[styles.sheet, { paddingBottom: 34 + insets.bottom }]}>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setSelectedRoutineId(null);
                  router.push("/reorder-routines");
                }}
                style={styles.sheetAction}
              >
                <MaterialCommunityIcons
                  color={colors.textPrimary}
                  name="sort"
                  size={24}
                  style={styles.sheetIcon}
                />
                <Text style={styles.sheetText}>Reorder</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  if (selectedRoutineId) duplicateRoutine(selectedRoutineId);
                  setSelectedRoutineId(null);
                }}
                style={styles.sheetAction}
              >
                <MaterialCommunityIcons
                  color={colors.textPrimary}
                  name="content-copy"
                  size={22}
                  style={styles.sheetIcon}
                />
                <Text style={styles.sheetText}>Copy</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  if (selectedRoutineId) deleteRoutine(selectedRoutineId);
                  setSelectedRoutineId(null);
                }}
                style={styles.sheetAction}
              >
                <MaterialCommunityIcons
                  color="#ffaaa1"
                  name="trash-can-outline"
                  size={24}
                  style={styles.sheetIcon}
                />
                <Text style={[styles.sheetText, styles.deleteText]}>
                  Delete{selectedRoutine ? ` ${selectedRoutine.name}` : ""}
                </Text>
              </Pressable>
            </View>
          </View>
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
  screenRoot: {
    flex: 1,
    backgroundColor: colors.background,
    position: "relative", // The fix! Respects the safe area padding
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 180,
    paddingHorizontal: spacing.xxl,
    paddingTop: 0,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 16,
    paddingBottom: 26,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    height: 30,
    justifyContent: "center",
    width: 30,
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
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    gap: 2,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  moreDot: {
    backgroundColor: colors.accent,
    borderRadius: radius.circle,
    height: 3,
    width: 3,
  },
  list: {
    paddingHorizontal: 0,
  },
  routineRow: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 78,
    overflow: "hidden",
  },
  firstRow: {
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  lastRow: {
    borderBottomWidth: 0,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },
  rowPressed: {
    backgroundColor: colors.surfacePressed,
  },
  routineMain: {
    alignItems: "flex-start",
    alignSelf: "stretch",
    flex: 1,
    justifyContent: "center",
    paddingLeft: 22,
  },
  routineName: {
    color: colors.textPrimary,
    fontSize: 19,
    fontWeight: "500",
    letterSpacing: 0,
  },
  routineMeta: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0,
    marginTop: 4,
  },
  rowMenu: {
    alignItems: "center",
    alignSelf: "stretch",
    flexDirection: "row",
    gap: 4,
    justifyContent: "center",
    paddingHorizontal: 22,
  },
  rowMenuDot: {
    backgroundColor: colors.textSecondary,
    borderRadius: radius.circle,
    height: 4,
    width: 4,
  },
  fab: {
    alignItems: "center",
    backgroundColor: colors.fabBackground,
    borderRadius: 16,
    bottom: 12, // Lowered exactly as requested
    height: 58,
    justifyContent: "center",
    position: "absolute",
    right: 24,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.34,
    shadowRadius: 12,
    elevation: 5,
    width: 60,
    zIndex: 20,
  },
  addButtonPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.97 }],
  },
  plusIcon: {
    alignItems: "center",
    height: 22,
    justifyContent: "center",
    width: 22,
  },
  plusVertical: {
    backgroundColor: colors.background,
    borderRadius: radius.xs,
    height: 22,
    position: "absolute",
    width: 2,
  },
  plusHorizontal: {
    backgroundColor: colors.background,
    borderRadius: radius.xs,
    height: 2,
    position: "absolute",
    width: 22,
  },
  sheetScrim: {
    backgroundColor: "rgba(0, 0, 0, 0.36)",
    flex: 1,
    justifyContent: "flex-end",
  },
  scrimDismiss: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: "#06100f",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 20,
  },
  sheetAction: {
    alignItems: "center",
    flexDirection: "row",
    gap: 16,
    minHeight: 52,
    paddingHorizontal: 10,
  },
  sheetIcon: {
    width: 48,
  },
  sheetText: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: "500",
  },
  deleteText: {
    color: "#ffaaa1",
  },
});
