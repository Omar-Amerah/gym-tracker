import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';

export type TabName = 'Log' | 'Routines' | 'Statistics';

export function TabIcon({ name, selected }: { name: TabName; selected: boolean }) {
  const iconName =
    name === 'Log' ? 'clock-time-nine-outline' : name === 'Routines' ? 'dumbbell' : 'chart-bar';

  return (
    <View style={[styles.iconWrap, selected && styles.iconWrapSelected]}>
      <MaterialCommunityIcons
        color={selected ? colors.textPrimary : colors.textSecondary}
        name={iconName}
        size={24}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 32,
    justifyContent: 'center',
    width: 66,
  },
  iconWrapSelected: {
    backgroundColor: colors.accentMuted,
  },
});
