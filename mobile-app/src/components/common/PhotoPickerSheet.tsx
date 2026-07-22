/**
 * Material-style bottom sheet for choosing a photo source.
 *
 * Replaces the stock Alert.alert dialog that Android fell back to, which
 * renders as the dated AOSP alert and looks nothing like the rest of the app.
 * Used on both platforms so the interaction is identical everywhere.
 */
import React, { useEffect, useRef } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, Animated,
  Easing, Pressable, useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius } from '../../theme';

export interface PhotoPickerSheetProps {
  visible: boolean;
  onClose: () => void;
  onTakePhoto: () => void;
  onPickFromLibrary: () => void;
  /** Omit to hide the destructive Remove action (e.g. no photo set yet). */
  onRemove?: () => void;
  title?: string;
  subtitle?: string;
}

const PhotoPickerSheet: React.FC<PhotoPickerSheetProps> = ({
  visible, onClose, onTakePhoto, onPickFromLibrary, onRemove,
  title = 'Profile photo',
  subtitle = 'Choose how you would like to update it',
}) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  const translateY = useRef(new Animated.Value(height)).current;
  const backdrop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdrop, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, damping: 22, stiffness: 220, useNativeDriver: true }),
      ]).start();
    } else {
      translateY.setValue(height);
      backdrop.setValue(0);
    }
  }, [visible, height, translateY, backdrop]);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(backdrop, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: height, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
    ]).start(onClose);
  };

  /** Runs the action after the sheet has closed, so the picker isn't fighting the animation. */
  const run = (action: () => void) => {
    Animated.parallel([
      Animated.timing(backdrop, { toValue: 0, duration: 130, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: height, duration: 180, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
    ]).start(() => { onClose(); action(); });
  };

  const options = [
    { key: 'camera',  label: 'Take photo',        hint: 'Use the camera',            icon: 'camera-outline' as const,  color: colors.primary,  onPress: onTakePhoto },
    { key: 'gallery', label: 'Choose from gallery', hint: 'Pick an existing photo',  icon: 'images-outline' as const,  color: colors.secondary, onPress: onPickFromLibrary },
    ...(onRemove ? [{ key: 'remove', label: 'Remove photo', hint: 'Go back to your initials', icon: 'trash-outline' as const, color: colors.error, onPress: onRemove }] : []),
  ];

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={dismiss}>
      <View style={StyleSheet.absoluteFill}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)', opacity: backdrop }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} accessibilityLabel="Dismiss" />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: isDark ? colors.bgCard : '#FFFFFF',
              paddingBottom: insets.bottom + 12,
              transform: [{ translateY }],
            },
          ]}
        >
          <View style={[styles.grabber, { backgroundColor: isDark ? 'rgba(255,255,255,0.18)' : '#D8DCE6' }]} />

          <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: colors.textTertiary }]}>{subtitle}</Text>

          <View style={styles.options}>
            {options.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={[styles.option, { borderColor: isDark ? 'rgba(255,255,255,0.07)' : colors.border }]}
                onPress={() => run(opt.onPress)}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel={opt.label}
                accessibilityHint={opt.hint}
              >
                <View style={[styles.optionIcon, { backgroundColor: `${opt.color}18` }]}>
                  <Ionicons name={opt.icon} size={20} color={opt.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.optionLabel, { color: opt.key === 'remove' ? colors.error : colors.textPrimary }]}>
                    {opt.label}
                  </Text>
                  <Text style={[styles.optionHint, { color: colors.textTertiary }]}>{opt.hint}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.cancel, { backgroundColor: isDark ? colors.bgCardLight : '#F2F4F8' }]}
            onPress={dismiss}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
          >
            <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20, paddingTop: 10,
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 24, shadowOffset: { width: 0, height: -6 }, elevation: 24,
  },
  grabber: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 18 },
  title: { fontSize: 18, fontWeight: '700', letterSpacing: -0.2 },
  subtitle: { fontSize: 12.5, marginTop: 3, marginBottom: 18 },
  options: { gap: 10 },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 14, paddingVertical: 13,
    borderRadius: BorderRadius.xl, borderWidth: 1,
  },
  optionIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  optionLabel: { fontSize: 14.5, fontWeight: '600' },
  optionHint: { fontSize: 11.5, marginTop: 2 },
  cancel: { marginTop: 14, paddingVertical: 14, borderRadius: BorderRadius.xl, alignItems: 'center' },
  cancelText: { fontSize: 15, fontWeight: '600' },
});

export default PhotoPickerSheet;
