import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Typography, Spacing } from '../../theme';
import { useConfigStore } from '../../store/configStore';

export default function MaintenanceScreen() {
  const { loadRemoteConfig, isLoading, dynamicConfig } = useConfigStore();
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bgDark }]}>
      <View style={styles.container}>
        <Ionicons name="construct" size={80} color={colors.primary} />
        
        <Text style={[styles.title, { color: colors.textPrimary }]}>Under Maintenance</Text>
        
        <Text style={[styles.message, { color: colors.textSecondary }]}>
          {dynamicConfig.announcement_body || "We are currently performing scheduled maintenance to improve your experience. We'll be back shortly!"}
        </Text>

        <TouchableOpacity 
          style={[styles.button, { backgroundColor: colors.primary }, isLoading && styles.buttonDisabled]} 
          onPress={loadRemoteConfig}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Checking...' : 'Check Status'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    ...Typography.h1,
    marginTop: 24,
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    ...Typography.body1,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
