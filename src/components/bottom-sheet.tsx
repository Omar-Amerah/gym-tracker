import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "@/theme/colors";
import { radius } from "@/theme/radius";
import { spacing } from "@/theme/spacing";

type BottomSheetProps = {
  children: ReactNode;
  closeOnBackdropPress?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  maxHeight?: ViewStyle["maxHeight"];
  onClose: () => void;
  sheetStyle?: StyleProp<ViewStyle>;
  showHandle?: boolean;
  title?: string;
  visible: boolean;
};

export function BottomSheet({
  children,
  closeOnBackdropPress = true,
  contentStyle,
  maxHeight,
  onClose,
  sheetStyle,
  showHandle = false,
  title,
  visible,
}: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  const [showModal, setShowModal] = useState(visible);
  const [renderChildren, setRenderChildren] = useState(visible);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;

    if (visible) {
      setRenderChildren(true);
      setShowModal(true);
      fadeAnim.stopAnimation();
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }).start();
      return () => {
        cancelled = true;
      };
    }

    fadeAnim.stopAnimation();
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 120,
      useNativeDriver: true,
    }).start(() => {
      if (cancelled) return;
      setShowModal(false);
      setRenderChildren(false);
    });

    return () => {
      cancelled = true;
    };
  }, [fadeAnim, visible]);

  if (!showModal) return null;

  return (
    <Modal
      animationType="none"
      onRequestClose={onClose}
      transparent
      visible={showModal}
    >
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <View style={styles.scrim} />
        {closeOnBackdropPress ? (
          <Pressable
            accessibilityLabel="Close bottom sheet"
            onPress={onClose}
            style={StyleSheet.absoluteFillObject}
          />
        ) : null}
        <View
          style={[
            styles.sheet,
            maxHeight !== undefined ? { maxHeight } : null,
            { paddingBottom: spacing.xxl + insets.bottom },
            sheetStyle,
          ]}
        >
          {showHandle ? <View style={styles.handle} /> : null}
          {title ? <Text style={styles.title}>{title}</Text> : null}
          <View style={contentStyle}>{renderChildren ? children : null}</View>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-end",
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.46)",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 14,
    paddingHorizontal: 34,
    paddingTop: 28,
  },
  handle: {
    alignSelf: "center",
    backgroundColor: colors.accentMuted,
    borderRadius: radius.pill,
    height: 4,
    marginBottom: 4,
    width: 38,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 2,
  },
});
