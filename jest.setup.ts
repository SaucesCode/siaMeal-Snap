// Reanimated 4 and its worklets runtime need native modules that don't exist under Jest.
jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));
jest.mock('react-native-reanimated', () => require('./jest/reanimatedMock'));
