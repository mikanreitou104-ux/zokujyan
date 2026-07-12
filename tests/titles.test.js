// js/titles.js(称号システム)の回帰テスト。
// saveDataは全テストファイル間でプロセス共有のシングルトンなので、各テストは自分が変更した
// saveData.stats/equippedTitleを最後に必ず元へ戻し、実行順に依存しないようにする。
import "./helpers/localstorage-polyfill.js";
import { test, assert, summarize } from "./helpers/test-runner.js";
import { saveData } from "../js/save-data.js";
import { TITLE_CATALOG, isTitleUnlocked, getUnlockedTitleIds, getEquippedTitleId, getEquippedTitleName, equipTitle } from "../js/titles.js";

console.log("titles.test.js");

test("TITLE_CATALOG: 全エントリがname/hint/conditionを持つ", () => {
  Object.keys(TITLE_CATALOG).forEach(id => {
    const title = TITLE_CATALOG[id];
    assert.equal(typeof title.name, "string", `${id}.nameが文字列でない`);
    assert.equal(typeof title.hint, "string", `${id}.hintが文字列でない`);
    assert.equal(typeof title.condition, "function", `${id}.conditionが関数でない`);
  });
});

test("isTitleUnlocked: beginnerは常に解放されている", () => {
  assert.equal(isTitleUnlocked("beginner"), true);
});

test("isTitleUnlocked: 未知のidはfalseを返す", () => {
  assert.equal(isTitleUnlocked("no-such-title"), false);
});

test("isTitleUnlocked: 統計しきい値未満はfalse、しきい値到達でtrueになる(strongOne=roundWinCount>=300)", () => {
  const before = saveData.stats.roundWinCount;

  saveData.stats.roundWinCount = 299;
  assert.equal(isTitleUnlocked("strongOne"), false);

  saveData.stats.roundWinCount = 300;
  assert.equal(isTitleUnlocked("strongOne"), true);

  saveData.stats.roundWinCount = before;
});

test("getUnlockedTitleIds: 解放済みのものだけを含み、必ずbeginnerを含む", () => {
  const before = saveData.stats.cpuBattlesWon;
  saveData.stats.cpuBattlesWon = 0;

  const ids = getUnlockedTitleIds();
  assert.ok(ids.includes("beginner"), "beginnerが含まれていない");
  assert.ok(!ids.includes("cpuChampion"), "条件未達成のcpuChampionが含まれてしまっている");

  saveData.stats.cpuBattlesWon = before;
});

test("getEquippedTitleId/getEquippedTitleName: 未装備(null)はbeginnerにフォールバックする", () => {
  const beforeEquipped = saveData.equippedTitle;
  saveData.equippedTitle = null;

  assert.equal(getEquippedTitleId(), "beginner");
  assert.equal(getEquippedTitleName(), TITLE_CATALOG.beginner.name);

  saveData.equippedTitle = beforeEquipped;
});

test("getEquippedTitleId: 装備中の称号が条件を満たさなくなった場合もbeginnerにフォールバックする", () => {
  const beforeEquipped = saveData.equippedTitle;
  const beforeStat = saveData.stats.cpuBattlesWon;

  saveData.stats.cpuBattlesWon = 0;
  saveData.equippedTitle = "cpuChampion"; // 条件未達成のはずのidを直接セット(equipTitle()を経由しない不正状態を想定)

  assert.equal(getEquippedTitleId(), "beginner");

  saveData.equippedTitle = beforeEquipped;
  saveData.stats.cpuBattlesWon = beforeStat;
});

test("equipTitle: 未解放の称号は装備できず、saveData.equippedTitleも変化しない", () => {
  const beforeEquipped = saveData.equippedTitle;
  const beforeStat = saveData.stats.cpuBattlesWon;
  saveData.stats.cpuBattlesWon = 0;
  saveData.equippedTitle = "beginner";

  const result = equipTitle("cpuChampion");
  assert.equal(result, false);
  assert.equal(saveData.equippedTitle, "beginner");

  saveData.equippedTitle = beforeEquipped;
  saveData.stats.cpuBattlesWon = beforeStat;
});

test("equipTitle: 解放済みの称号は装備でき、getEquippedTitleNameに反映される", () => {
  const beforeEquipped = saveData.equippedTitle;
  const beforeStat = saveData.stats.cpuBattlesWon;
  saveData.stats.cpuBattlesWon = 100;

  const result = equipTitle("cpuChampion");
  assert.equal(result, true);
  assert.equal(saveData.equippedTitle, "cpuChampion");
  assert.equal(getEquippedTitleName(), TITLE_CATALOG.cpuChampion.name);

  saveData.equippedTitle = beforeEquipped;
  saveData.stats.cpuBattlesWon = beforeStat;
});

summarize("tests/titles.test.js");
