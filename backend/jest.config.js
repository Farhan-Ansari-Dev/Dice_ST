/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  moduleNameMapper: {
    '^expo-server-sdk$': '<rootDir>/src/__tests__/__mocks__/expo-server-sdk.ts',
  },
  // mongodb-memory-server needs time to download/start
  testTimeout: 30000,
  // Suppress console noise during tests
  silent: false,
};
