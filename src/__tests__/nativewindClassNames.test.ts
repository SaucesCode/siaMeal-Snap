/// <reference types="node" />
import fs from 'fs';
import path from 'path';

/**
 * NativeWind can't add press/focus states or animations to a component after its first render.
 * When a className gains `active:`, `focus:`, `hover:`, `animate-` or `transition` conditionally,
 * NativeWind remounts it and, in development, crashes while printing its warning
 * ("Couldn't find a LinkingContext context"). Keep those classes unconditional.
 */
const DYNAMIC_ONLY = /\b(active|focus|hover):|\banimate-|\btransition\b/;

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : sourceFiles(full);
    return /\.tsx$/.test(entry.name) ? [full] : [];
  });
}

describe('NativeWind classNames', () => {
  it('never add press/focus states or animations conditionally', () => {
    const offenders: string[] = [];
    for (const file of sourceFiles(path.join(__dirname, '..'))) {
      const source = fs.readFileSync(file, 'utf8');
      for (const match of source.matchAll(/className=\{`([\s\S]*?)`\}/g)) {
        for (const [, expr] of match[1].matchAll(/\$\{([\s\S]*?)\}/g)) {
          if (DYNAMIC_ONLY.test(expr)) {
            const line = source.slice(0, match.index).split('\n').length;
            offenders.push(`${path.relative(process.cwd(), file)}:${line}`);
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
