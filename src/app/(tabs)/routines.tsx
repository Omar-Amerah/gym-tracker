import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
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

import { AppHeader } from "@/components/app-header";
import { useRoutines } from "@/state/routines";
import { colors } from "@/theme/colors";
import { radius } from "@/theme/radius";
import { spacing } from "@/theme/spacing";

// --- NEW REUSABLE BOTTOM SHEET COMPONENT ---
function BottomSheet({
  children,
  insetsBottom,
  onClose,
  visible,
}: {
  children: React.ReactNode;
  insetsBottom: number;
  onClose: () => void;
  visible: boolean;
}) {
  const [showModal, setShowModal] = useState(visible);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setShowModal(true);
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }).start(() => {
        setShowModal(false);
      });
    }
  }, [visible, fadeAnim]);

  if (!showModal) return null;

  return (
    <Modal
      animationType="none"
      onRequestClose={onClose}
      transparent
      visible={showModal}
    >
      <Animated.View style={[styles.sheetContainer, { opacity: fadeAnim }]}>
        <View style={styles.scrimOverlay} />

        {/* Invisible tap target to dismiss */}
        <Pressable
          accessibilityLabel="Close menu"
          onPress={onClose}
          style={StyleSheet.absoluteFillObject}
        />

        <View
          style={[
            styles.sheet,
            {
              paddingBottom: 34 + insetsBottom,
            },
          ]}
        >
          {children}
        </View>
      </Animated.View>
    </Modal>
  );
}
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
        <AppHeader onMorePress={() => setMenuOpen(true)} title="Routines" />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.list}>
            {routines.map((routine) => (
              <View key={routine.id} style={styles.routineRow}>
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

        {/* Global Menu Bottom Sheet */}
        <BottomSheet
          insetsBottom={insets.bottom}
          onClose={() => setMenuOpen(false)}
          visible={menuOpen}
        >
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
            <Text style={[styles.sheetText, styles.deleteText]}>Delete</Text>
          </Pressable>
        </BottomSheet>

        {/* Selected Routine Options Bottom Sheet */}
        <BottomSheet
          insetsBottom={insets.bottom}
          onClose={() => setSelectedRoutineId(null)}
          visible={selectedRoutineId !== null}
        >
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
        </BottomSheet>
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
    position: "relative",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 180,
    paddingHorizontal: spacing.xxl,
    paddingTop: 0,
  },
  list: {
    paddingHorizontal: 0,
  },
  routineRow: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 82,
    overflow: "hidden",
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
    fontSize: 13,
    fontWeight: "400",
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
    borderRadius: 24,
    bottom: 16,
    height: 72,
    justifyContent: "center",
    position: "absolute",
    right: 24,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.34,
    shadowRadius: 12,
    elevation: 5,
    width: 72,
    zIndex: 20,
  },
  addButtonPressed: {
    opacity: 0.86,
  },
  plusIcon: {
    alignItems: "center",
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  plusVertical: {
    backgroundColor: colors.background,
    borderRadius: radius.xs,
    height: 28,
    position: "absolute",
    width: 3,
  },
  plusHorizontal: {
    backgroundColor: colors.background,
    borderRadius: radius.xs,
    height: 3,
    position: "absolute",
    width: 28,
  },
  sheetContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  scrimOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.4)", // The dark dimming color
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
