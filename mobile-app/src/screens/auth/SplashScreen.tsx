import React from 'react';
import { View, Image, StyleSheet, useColorScheme } from 'react-native';

const SplashScreen: React.FC = () => {
  const systemScheme = useColorScheme();
  const isDark = systemScheme === 'dark';

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0A0B0F' : '#FFFFFF' }]}>
      <Image
        source={isDark ? require('../../../assets/logo-light.png') : require('../../../assets/logo-dark.png')}
        style={styles.logoImage}
        resizeMode="contain"
        accessibilityRole="image"
        accessibilityLabel="Dice logo"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: { width: 220, height: 220 },
});

export default SplashScreen;
