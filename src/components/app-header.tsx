import { MaterialCommunityIcons } from "@expo/vector-icons";
import { type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "@/theme/colors";
import { radius } from "@/theme/radius";
import { typography } from "@/theme/typography";

type AppHeaderProps = {
  leftAction?: "back" | "menu" | "close"; // Added "close"
  onBackPress?: () => void;
  onMenuPress?: () => void;
  onMorePress?: () => void;
  rightAccessory?: ReactNode;
  title: string;
};

export function AppHeader({
  leftAction = "menu",
  onBackPress,
  onMenuPress,
  onMorePress,
  rightAccessory,
  title,
}: AppHeaderProps) {
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityLabel={leftAction === "menu" ? "Open menu" : "Go back"}
        accessibilityRole="button"
        onPress={leftAction === "menu" ? onMenuPress : onBackPress} // Both back and close use onBackPress
        style={styles.iconButton}
      >
        {leftAction === "back" ? (
          <MaterialCommunityIcons
            color={colors.accent}
            name="arrow-left"
            size={24}
          />
        ) : leftAction === "close" ? (
          <MaterialCommunityIcons
            color={colors.accent}
            name="close"
            size={24}
          />
        ) : (
          <MaterialCommunityIcons color={colors.accent} name="menu" size={24} />
        )}
      </Pressable>

      <Text numberOfLines={1} style={styles.title}>
        {title}
      </Text>

      {rightAccessory || onMorePress ? (
        <View style={styles.actions}>
          {rightAccessory}
          {onMorePress ? (
            <Pressable
              accessibilityLabel={`${title} options`}
              accessibilityRole="button"
              onPress={onMorePress}
              style={styles.moreButton}
            >
              <MaterialCommunityIcons
                color={colors.accent}
                name="dots-vertical"
                size={24}
              />
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 16,
    paddingBottom: 15,
    paddingHorizontal: 16,
    paddingTop: 15,
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  title: {
    color: colors.textPrimary,
    flex: 1,
    letterSpacing: 0,
    ...typography.monthTitle,
    height: 30,
  },
  actions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
  },
  moreButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
});
