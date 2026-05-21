import { memo, useRef, useState } from "react";
import { TextInput, View, type StyleProp, type TextStyle } from "react-native";

import { colors } from "@/theme/colors";

import { styles } from "../styles";

type SetInputProps = {
  fieldId: string;
  hasWarning?: boolean;
  keyboardType?: "default" | "decimal-pad" | "number-pad";
  multiline?: boolean;
  onChangeText: (value: string) => void;
  onContentSizeChange?: (height: number) => void;
  onFocusScroll?: (fieldId: string, inputRef: TextInput | null) => void;
  placeholder?: string;
  style?: StyleProp<TextStyle>;
  value: string;
  width?: number;
};

export const SetInput = memo(function SetInput({
  fieldId,
  hasWarning,
  placeholder,
  keyboardType,
  multiline,
  onContentSizeChange,
  onChangeText,
  onFocusScroll,
  style,
  value,
  width,
}: SetInputProps) {
  const inputRef = useRef<TextInput | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View
      style={[
        styles.setInputWrap,
        width ? { width } : null,
        multiline && styles.notesInputWrap,
      ]}
    >
      <TextInput
        ref={inputRef}
        keyboardType={keyboardType}
        multiline={multiline}
        onBlur={() => setIsFocused(false)}
        onContentSizeChange={
          onContentSizeChange
            ? (event) => {
                const height = event.nativeEvent.contentSize.height;
                onContentSizeChange(height);
              }
            : undefined
        }
        onChangeText={onChangeText}
        onFocus={() => {
          setIsFocused(true);
          onFocusScroll?.(fieldId, inputRef.current);
        }}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        scrollEnabled={multiline}
        style={[
          styles.setInput,
          width ? { width } : null,
          hasWarning && styles.inputWarning,
          isFocused && styles.inputFocused,
          style,
        ]}
        textAlignVertical={multiline ? "top" : "center"}
        value={value ?? ""}
      />
    </View>
  );
});
