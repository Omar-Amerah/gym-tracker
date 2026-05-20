import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

import { animations } from "@/theme/animations";
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
  const selectedProgress = useRef(new Animated.Value(selected ? 1 : 0)).current;
  const iconName =
    name === "Log"
      ? "clock-time-nine-outline"
      : name === "Routines"
        ? "dumbbell"
        : "chart-bar";
  const pillScale = selectedProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.96, 1],
  });

  useEffect(() => {
    Animated.timing(selectedProgress, {
      toValue: selected ? 1 : 0,
      duration: animations.tabDuration,
      useNativeDriver: true,
    }).start();
  }, [selected, selectedProgress]);

  return (
    <View style={styles.iconOuter}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.iconPillHighlight,
          { opacity: selectedProgress, transform: [{ scale: pillScale }] },
        ]}
      />
      <View style={styles.iconPill}>
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
    height: 34,
    justifyContent: "center",
    width: 72,
  },
  iconPillHighlight: {
    backgroundColor: colors.accentMuted,
    borderRadius: radius.pill,
    height: 34,
    left: 3,
    position: "absolute",
    top: 0,
    width: 72,
  },
});
