/// <reference types="node" />
import fs from 'fs';
import path from 'path';

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : sourceFiles(full);
    return /\.tsx$/.test(entry.name) ? [full] : [];
  });
}

const lineOf = (source: string, index: number | undefined) => source.slice(0, index).split('\n').length;

/**
 * NativeWind can't add press/focus states or animations to a component after its first render.
 * When a className gains `active:`, `focus:`, `hover:`, `animate-` or `transition` conditionally,
 * NativeWind remounts it and, in development, crashes while printing its warning
 * ("Couldn't find a LinkingContext context"). Keep those classes unconditional.
 */
const DYNAMIC_ONLY = /\b(active|focus|hover):|\banimate-|\btransition\b/;

describe('NativeWind classNames', () => {
  it('never add press/focus states or animations conditionally', () => {
    const offenders: string[] = [];
    for (const file of sourceFiles(path.join(__dirname, '..'))) {
      const source = fs.readFileSync(file, 'utf8');
      for (const match of source.matchAll(/className=\{`([\s\S]*?)`\}/g)) {
        for (const [, expr] of match[1].matchAll(/\$\{([\s\S]*?)\}/g)) {
          if (DYNAMIC_ONLY.test(expr)) offenders.push(`${path.relative(process.cwd(), file)}:${lineOf(source, match.index)}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe('Pressable styles', () => {
  /**
   * On Android NativeWind merges a component's `style` into its own list and drops a function
   * style, so `<Pressable style={({ pressed }) => …}>` loses its background, size and layout there
   * (the web looks fine). Use <Tap>, which resolves the pressed state itself.
   */
  it('never pass a function style to Pressable', () => {
    const offenders: string[] = [];
    for (const file of sourceFiles(path.join(__dirname, '..'))) {
      const source = fs.readFileSync(file, 'utf8');
      for (const match of source.matchAll(/<Pressable\b(?:(?!<)[\s\S])*?style=\{\s*\(\{/g)) {
        offenders.push(`${path.relative(process.cwd(), file)}:${lineOf(source, match.index)}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
