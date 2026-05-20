import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";

import { colors } from "@/theme/colors";
import { radius } from "@/theme/radius";

export type TabName = "Log" | "Routines" | "Statistics";

export function TabIcon({
  name,
  selected,
}: {
  name: TabName;
  selected: boolean;
}) {
  const iconName =
    name === "Log"
      ? "clock-time-nine-outline"
      : name === "Routines"
        ? "dumbbell"
        : "chart-bar";

  return (
    <View style={styles.iconOuter}>
      <View style={[styles.iconPill, selected && styles.iconPillSelected]}>
        <MaterialCommunityIcons
          color={selected ? colors.textPrimary : colors.textSecondary}
          name={iconName}
          size={25}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  iconOuter: {
    alignItems: "center",
    height: 34,
    justifyContent: "center",
    width: 78,
  },
  iconPill: {
    alignItems: "center",
    borderRadius: radius.pill,
    height: 34,
    justifyContent: "center",
    overflow: "hidden",
    width: 72,
  },
  iconPillSelected: {
    backgroundColor: colors.accentMuted,
  },
});
