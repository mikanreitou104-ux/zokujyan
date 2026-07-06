// save-data.js はモジュール読み込み時に localStorage.getItem() を呼ぶため、
// Node環境向けに最小限のインメモリ実装をグローバルに用意する(既にあれば何もしない)。
if (typeof globalThis.localStorage === "undefined") {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear()
  };
}
