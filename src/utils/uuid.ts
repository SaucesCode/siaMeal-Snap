/**
 * Generates an RFC 4122 version 4 compliant UUID.
 * Compatible across Hermes, V8, Node.js, and browser runtimes.
 */
export function generateUUID(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    try {
      return globalThis.crypto.randomUUID();
    } catch {
      // fallback
    }
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
