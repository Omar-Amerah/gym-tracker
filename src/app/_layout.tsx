import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { RoutinesProvider } from '@/state/routines';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <RoutinesProvider>
        <Stack screenOptions={{ headerShown: false }} />
        <StatusBar style="light" />
      </RoutinesProvider>
    </SafeAreaProvider>
  );
}
