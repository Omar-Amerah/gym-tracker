import { Tabs } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TabIcon, type TabName } from '@/components/tab-icons';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

const tabItems: { label: TabName; routeName: string }[] = [
  { label: 'Log', routeName: 'index' },
  { label: 'Routines', routeName: 'routines' },
  { label: 'Statistics', routeName: 'statistics' },
];

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        animation: 'none',
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
      }}
      screenLayout={({ children }) => (
        <View style={styles.sceneContainer}>{children}</View>
      )}
      tabBar={({ state, navigation }) => (
        <View style={[styles.tabBar, { height: 72 + insets.bottom, paddingBottom: insets.bottom }]}>
          {tabItems.map((item) => {
            const routeIndex = state.routes.findIndex((route) => route.name === item.routeName);
            const selected = state.index === routeIndex;

            return (
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                key={item.routeName}
                onPress={() => navigation.navigate(item.routeName)}
                style={styles.tab}>
                <TabIcon name={item.label} selected={selected} />
                <Text style={[styles.tabText, selected && styles.tabTextSelected]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>
      )}>
      <Tabs.Screen name="index" options={{ title: 'Log' }} />
      <Tabs.Screen name="routines" options={{ title: 'Routines' }} />
      <Tabs.Screen name="statistics" options={{ title: 'Statistics' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    alignItems: 'center',
    backgroundColor: colors.tabBar,
    borderColor: colors.borderMuted,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.md,
  },
  sceneContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tab: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
    height: 55,
    justifyContent: 'center',
  },
  tabText: {
    color: colors.textSecondary,
    letterSpacing: 0,
    ...typography.tabLabel,
  },
  tabTextSelected: {
    color: colors.textPrimary,
  },
});
