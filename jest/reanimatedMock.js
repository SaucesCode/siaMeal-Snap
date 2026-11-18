// Minimal Reanimated stand-in for Jest. Reanimated 4.7's own `react-native-reanimated/mock`
// imports the real package, whose native initializer throws under Jest ("setCSSEventHandler
// is not available in JSReanimated"). This covers the APIs the app's tested code uses:
// animations resolve to their final value immediately and worklets run synchronously.
const React = require('react');
const { View, Text, Image, ScrollView } = require('react-native');

function makeSharedValue(initial) {
  return {
    value: initial,
    get() {
      return this.value;
    },
    set(next) {
      this.value = typeof next === 'function' ? next(this.value) : next;
    },
  };
}

const identity = (t) => t;
const passthroughEasing = () => identity;

const createAnimatedComponent = (Component) => Component;

module.exports = {
  __esModule: true,
  default: { View, Text, Image, ScrollView, createAnimatedComponent },
  View,
  Text,
  Image,
  ScrollView,
  createAnimatedComponent,
  useSharedValue: (initial) => React.useRef(makeSharedValue(initial)).current,
  useAnimatedStyle: (worklet) => worklet(),
  useAnimatedProps: (worklet) => worklet(),
  useDerivedValue: (worklet) => makeSharedValue(worklet()),
  withTiming: (to) => to,
  withSpring: (to) => to,
  withDelay: (_delay, animation) => animation,
  withRepeat: (animation) => animation,
  withSequence: (...animations) => animations[animations.length - 1],
  cancelAnimation: () => {},
  runOnJS: (fn) => fn,
  useReducedMotion: () => false,
  interpolate: (value, input, output) => {
    const [i0, i1] = [input[0], input[input.length - 1]];
    const [o0, o1] = [output[0], output[output.length - 1]];
    return o0 + ((value - i0) / (i1 - i0)) * (o1 - o0);
  },
  Easing: {
    bezier: passthroughEasing,
    linear: identity,
    quad: identity,
    ease: identity,
    in: (easing) => easing,
    out: (easing) => easing,
    inOut: (easing) => easing,
  },
  ReduceMotion: { System: 'system', Always: 'always', Never: 'never' },
  configureReanimatedLogger: () => {},
  ReanimatedLogLevel: { warn: 1, error: 2 },
};
