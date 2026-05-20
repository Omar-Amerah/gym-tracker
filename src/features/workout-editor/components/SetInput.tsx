import { memo } from "react";
import {
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
} from "react-native";

import { colors } from "@/theme/colors";

import { styles } from "../styles";

type SetInputProps = {
  fieldId: string;
  focusedFieldId: string | null;
  keyboardType?: "default" | "decimal-pad" | "number-pad";
  multiline?: boolean;
  onChangeText: (value: string) => void;
  onContentSizeChange?: (height: number) => void;
  placeholder?: string;
  setFocusedFieldId: (fieldId: string | null) => void;
  style?: StyleProp<TextStyle>;
  value: string;
  width?: number;
};

export const SetInput = memo(function SetInput({
  fieldId,
  focusedFieldId,
  placeholder,
  keyboardType,
  multiline,
  onContentSizeChange,
  onChangeText,
  setFocusedFieldId,
  style,
  value,
  width,
}: SetInputProps) {
  const focused = focusedFieldId === fieldId;

  return (
    <View
      style={[
        styles.setInputWrap,
        width ? { width } : null,
        multiline && styles.notesInputWrap,
      ]}
    >
      <TextInput
        keyboardType={keyboardType}
        multiline={multiline}
        onBlur={() => setFocusedFieldId(null)}
        onContentSizeChange={
          onContentSizeChange
            ? (event) => {
                const height = event.nativeEvent.contentSize.height;
                onContentSizeChange(height);
              }
            : undefined
        }
        onChangeText={onChangeText}
        onFocus={() => setFocusedFieldId(fieldId)}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        scrollEnabled={multiline}
        style={[
          styles.setInput,
          width ? { width } : null,
          focused && styles.inputFocused,
          style,
        ]}
        textAlignVertical={multiline ? "top" : "center"}
        value={value ?? ""}
      />
    </View>
  );
});
