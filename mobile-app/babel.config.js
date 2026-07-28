module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          // Force the 'default' transform profile so Babel transforms
          // class syntax even when the native app requests hermes-stable.
          // hermes-stable skips class transforms assuming Hermes handles
          // them natively, but the Hermes bundled here is too old for that.
          unstable_transformProfile: 'default',
        },
      ],
    ],
    plugins: [
      ['@babel/plugin-transform-typescript', { isTSX: true, allExtensions: true, allowDeclareFields: true }],
      'babel-plugin-transform-import-meta',
      // Order matters: class-properties BEFORE transform-classes
      // loose: true uses `this.prop = value` (simple assignment) — works for
      // most cases. Files that have non-writable prototype props (e.g. Event.js
      // NONE/CAPTURING_PHASE) are patched separately in postinstall to make
      // them writable so assignments don't throw.
      ['@babel/plugin-transform-class-properties', { loose: true }],
      ['@babel/plugin-transform-private-methods', { loose: true }],
      ['@babel/plugin-proposal-private-property-in-object', { loose: true }],
      ['@babel/plugin-transform-classes', { loose: true }],
      // Reanimated plugin must always be last
      'react-native-reanimated/plugin',
    ],
  };
};
