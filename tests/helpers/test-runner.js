// 依存パッケージ無しで動く極小テストランナー。assert.strictを使い、失敗時は分かりやすく表示する。
import assert from "node:assert/strict";

let passCount = 0;
let failCount = 0;
const failures = [];

export function test(name, fn) {
  try {
    fn();
    passCount++;
    console.log(`  \x1b[32m✓\x1b[0m ${name}`);
  } catch (err) {
    failCount++;
    failures.push({ name, err });
    console.log(`  \x1b[31m✗ ${name}\x1b[0m`);
    console.log(`    ${err.message}`);
  }
}

export { assert };

export function summarize(fileLabel) {
  console.log(`\n${fileLabel}: ${passCount}件成功 / ${failCount}件失敗\n`);
  if (failCount > 0) {
    process.exitCode = 1;
  }
  const result = { passCount, failCount, failures: [...failures] };

  // run-all.js経由で複数テストファイルがこのモジュールを共有してimportするため、
  // 次のファイルの集計に前のファイルの件数が混ざらないようリセットする
  passCount = 0;
  failCount = 0;
  failures.length = 0;

  return result;
}
