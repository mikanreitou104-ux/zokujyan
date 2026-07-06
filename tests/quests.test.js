// js/quests.js の回帰テスト。分割前のmain.js内の挙動と一致することを保証する。
import "./helpers/localstorage-polyfill.js"; // save-data.jsの読み込みより先にlocalStorageを用意する
import { test, assert, summarize } from "./helpers/test-runner.js";
import { saveData } from "../js/save-data.js";
import {
  QUEST_CATALOG,
  QUEST_CATEGORIES,
  getQuestGroupKey,
  getQuestLinesForCategory,
  getQuestProgress,
  isQuestClaimable,
  claimQuestReward,
  countClaimableQuests,
  updateQuestProgress
} from "../js/quests.js";

console.log("quests.test.js");

test("buildMilestoneQuestsが自動生成した段階クエストがQUEST_CATALOGに含まれる", () => {
  assert.ok(QUEST_CATALOG.winsBy_fire_5, "winsBy_fire_5 が存在しない");
  assert.equal(QUEST_CATALOG.winsBy_fire_5.target, 5);
  assert.equal(QUEST_CATALOG.winsBy_fire_5.statPath, "winsByAttribute.fire");
  assert.equal(QUEST_CATALOG.battlesWon_300.target, 300);
});

test("生成クエストにはstatPath経由でcategoryが補完されている", () => {
  assert.equal(QUEST_CATALOG.winsBy_fire_5.category, "attribute");
  assert.equal(QUEST_CATALOG.battlesWon_300.category, "cpuBattle");
});

test("getQuestGroupKey: 同じstatPathを持つ複数段階は同じグループキーになる", () => {
  const key1 = getQuestGroupKey("winsBy_fire_5");
  const key2 = getQuestGroupKey("winsBy_fire_20");
  assert.equal(key1, key2);
  assert.equal(key1, "winsByAttribute.fire");
});

test("getQuestGroupKey: statPathを持たない単独クエストは自分自身のidを返す", () => {
  assert.equal(getQuestGroupKey("fireBurst"), "fireBurst");
});

test("getQuestLinesForCategory: 指定カテゴリのクエストのみをtarget昇順でグループ化する", () => {
  const lines = getQuestLinesForCategory("cpuBattle");
  const battlesWonLine = lines.find(l => l.key === "cpuBattlesWon");
  assert.ok(battlesWonLine, "cpuBattlesWonのラインが見つからない");
  const targets = battlesWonLine.ids.map(id => QUEST_CATALOG[id].target);
  const sorted = [...targets].sort((a, b) => a - b);
  assert.deepEqual(targets, sorted);
});

test("getQuestProgress: statPathを持つクエストはsaveData.statsから直接読む", () => {
  saveData.stats.winsByAttribute.fire = 12;
  assert.equal(getQuestProgress("winsBy_fire_5"), 12);
});

test("getQuestProgress/isQuestClaimable: statPathを持たない手動クエストはmainProgressを読む", () => {
  saveData.quests.mainProgress.fireBurst = { progress: 0, claimed: false };
  updateQuestProgress("fireBurst", 3);
  assert.equal(getQuestProgress("fireBurst"), 3);
  assert.equal(isQuestClaimable("fireBurst"), false); // target=5 未達

  updateQuestProgress("fireBurst", 5);
  assert.equal(getQuestProgress("fireBurst"), 5);
  assert.equal(isQuestClaimable("fireBurst"), true); // target=5 到達
});

test("updateQuestProgress: 進捗は上書きではなく最大値を保持する(下がらない)", () => {
  saveData.quests.mainProgress.thunderBolt = { progress: 0, claimed: false };
  updateQuestProgress("thunderBolt", 10);
  updateQuestProgress("thunderBolt", 4); // 前回より小さい値
  assert.equal(getQuestProgress("thunderBolt"), 10);
});

test("claimQuestReward: 達成済みクエストの報酬でコインが増え、claimed状態になる", () => {
  saveData.quests.mainProgress.permafrost = { progress: 0, claimed: false };
  updateQuestProgress("permafrost", 10); // target=10
  const coinsBefore = saveData.coins;

  const claimed = claimQuestReward("permafrost");
  assert.equal(claimed, true);
  assert.equal(saveData.coins, coinsBefore + QUEST_CATALOG.permafrost.reward);
  assert.equal(isQuestClaimable("permafrost"), false); // 受け取り済みなので再度は不可
});

test("claimQuestReward: 未達成のクエストは受け取れずfalseを返す", () => {
  saveData.quests.mainProgress.cannonBlast = { progress: 0, claimed: false };
  updateQuestProgress("cannonBlast", 1); // target=20には届かない
  const claimed = claimQuestReward("cannonBlast");
  assert.equal(claimed, false);
});

test("countClaimableQuests: 獲得可能な数の増減が反映される", () => {
  const before = countClaimableQuests();
  saveData.quests.mainProgress.gamblerJackpot = { progress: 0, claimed: false };
  updateQuestProgress("gamblerJackpot", 15); // target=15 到達 → 獲得可能が1つ増える
  assert.equal(countClaimableQuests(), before + 1);
});

test("QUEST_CATEGORIESは4タブ構成", () => {
  assert.equal(QUEST_CATEGORIES.length, 4);
  assert.deepEqual(QUEST_CATEGORIES.map(c => c.id), ["cpuBattle", "attribute", "combat", "economy"]);
});

summarize("tests/quests.test.js");
