import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { RoutinesProvider } from '@/state/routines';
import { colors } from '@/theme/colors';

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.background,
    border: colors.border,
    primary: colors.accent,
    text: colors.textPrimary,
  },
};

void SystemUI.setBackgroundColorAsync(colors.background);

export default function RootLayout() {
  return (
    <SafeAreaProvider style={styles.appRoot}>
      <RoutinesProvider>
        <View style={styles.appRoot}>
          <ThemeProvider value={navigationTheme}>
            <Stack
              screenOptions={{
                animation: 'fade',
                animationDuration: 150,
                contentStyle: { backgroundColor: colors.background },
                headerShown: false,
                navigationBarColor: colors.background,
                statusBarBackgroundColor: colors.background,
                statusBarStyle: 'light',
              }}
            />
          </ThemeProvider>
          <StatusBar
            animated={false}
            backgroundColor={colors.background}
            style="light"
            translucent={false}
          />
        </View>
      </RoutinesProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  appRoot: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
