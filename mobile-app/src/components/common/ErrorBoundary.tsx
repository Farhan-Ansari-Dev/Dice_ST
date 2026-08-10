import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * App-wide error boundary.
 *
 * Catches uncaught render/lifecycle errors anywhere in the navigation tree and
 * shows a branded fallback instead of an unrecoverable blank screen (the default
 * React behaviour when a render throws in production).
 *
 * Deliberately self-contained — it uses hardcoded brand colours and no theme /
 * context hooks, so the fallback still renders even if a provider is the thing
 * that failed. Logging is console.error only (no third-party crash reporting).
 */
class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, info?.componentStack);
  }

  handleRetry = () => {
    // Reset the boundary and attempt to render the app tree again.
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.iconWrap}>
            <Ionicons name="alert-circle-outline" size={56} color="#6C63FF" />
          </View>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.subtitle}>Please restart the app.</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={this.handleRetry}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Retry"
          >
            <Text style={styles.buttonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F9FC' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(108,99,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: { fontSize: 22, fontWeight: '700', color: '#0A0B1E', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#4A5568', marginBottom: 32, textAlign: 'center' },
  button: { backgroundColor: '#6C63FF', paddingHorizontal: 48, paddingVertical: 14, borderRadius: 9999 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});

export default ErrorBoundary;
