const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.watchFolders = [__dirname];

config.transformer = {
  ...config.transformer,
  unstable_allowRequireContext: true,
  // Force 'default' transform profile so Babel ALWAYS transforms class syntax.
  // The native app requests hermes-stable which skips class transforms,
  // but the Hermes version bundled here does NOT support ES6 classes natively.
  unstable_transformProfile: 'default',
  // Transform react-native packages through Babel but EXCLUDE nested node_modules
  // (e.g. expo/node_modules/hermes-parser ships compiled WASM JS with TS syntax)
  transformIgnorePatterns: [
    'node_modules/(?!(' + [
      'react-native',
      '@react-native(?!/[^/]+/node_modules)',
      '@react-native-community',
      'expo(?!/node_modules)',            // expo but NOT expo/node_modules/*
      '@expo(?!/[^/]+/node_modules)',     // @expo/* but NOT @expo/*/node_modules/*
      'expo-modules-core',
      'react-native-reanimated',
      'react-native-gesture-handler',
      'react-native-screens',
      'react-native-safe-area-context',
      'react-native-svg',
      'react-native-animatable',
      '@react-navigation',
      'react-native-keyboard-aware-scroll-view',
      'react-native-url-polyfill',
    ].join('|') + ')/)',
  ],
};

module.exports = config;
