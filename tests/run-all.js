// node tests/run-all.js (または npm test) で全テストファイルをまとめて実行する。
// 各ファイルは実行時にトップレベルで結果を出力し、失敗があればprocess.exitCodeを1にする。
await import("./attributes.test.js");
await import("./quests.test.js");
await import("./battle.test.js");
await import("./story-catalog.test.js");
await import("./shop-catalog.test.js");

if (process.exitCode) {
  console.log("いずれかのテストが失敗しました。");
} else {
  console.log("全テスト成功。");
}
