// Reanimated 4 and its worklets runtime need native modules that don't exist under Jest;
// both packages ship official mocks for tests.
jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
