// Colorpoint palette: a cream "body" with cocoa "points", like a Siamese coat.
// Single source of truth, required by tailwind.config.js and re-exported (typed) by ./index.ts.
// Contrast is enforced by src/theme/__tests__/contrast.test.ts.
module.exports = {
  bg: '#FBF6EE',
  surface: '#FFFFFF',
  line: '#EADFCF',
  text: '#2A1810',
  textMuted: '#7A6457',

  point: '#3A2720',
  pointText: '#F7EBD6',
  pointMuted: '#CBB6A2',
  pointTrack: '#55403A',
  pointDeep: '#241813',

  leaf: '#7DDB6A',
  leafOnLight: '#3E9B4F',
  leafText: '#2F7A3D',

  shutter: '#10B981',
  shutterGlyph: '#05241A',

  protein: '#8FB0F5',
  carbs: '#F2C063',
  fat: '#F59AAC',
  proteinOnLight: '#5B7FD1',
  carbsOnLight: '#E0A23B',
  fatOnLight: '#D9738A',

  over: '#B42318',
};
