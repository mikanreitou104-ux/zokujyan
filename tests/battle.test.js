// js/battle.js(battleTurn)の回帰テスト。分割前のmain.js内の挙動と一致することを保証する。
import "./helpers/localstorage-polyfill.js"; // save-data.jsの読み込みより先にlocalStorageを用意する
import { test, assert, summarize } from "./helpers/test-runner.js";
import { initAttribute } from "../js/attributes.js";
import { saveData } from "../js/save-data.js";
import { getQuestProgress } from "../js/quests.js";
import { battleTurn, resetBattleCounters, setBattleCallbacks } from "../js/battle.js";

function freshState(attr, overrides = {}) {
  const state = { hp: 25, maxHp: 25, power: 3, maxPower: 3, ...overrides };
  initAttribute(state, attr);
  Object.assign(state, overrides); // initAttributeの初期値をoverridesで上書き
  return state;
}

// battleTurn()に渡すコールバックの呼び出しを記録するためのモック。
// テストごとにresetCallLog()で呼び出し履歴をクリアする。
const callLog = [];
function makeSpy(name) {
  return (...args) => callLog.push({ name, args });
}
setBattleCallbacks({
  hideDarkOverlay: makeSpy("hideDarkOverlay"),
  renderPlayerHand: makeSpy("renderPlayerHand"),
  renderCpuHand: makeSpy("renderCpuHand"),
  setResultText: makeSpy("setResultText"),
  showBigResultText: makeSpy("showBigResultText"),
  showDamageNumber: makeSpy("showDamageNumber"),
  playCpuDamageEffect: makeSpy("playCpuDamageEffect"),
  playBigImpactEffect: makeSpy("playBigImpactEffect"),
  playDamageEffect: makeSpy("playDamageEffect"),
  handleCpuDefeated: makeSpy("handleCpuDefeated"),
  handlePlayerDefeated: makeSpy("handlePlayerDefeated"),
  updateBattleUI: makeSpy("updateBattleUI"),
  setupPlayerStatusWindow: makeSpy("setupPlayerStatusWindow"),
  setupCpuStatusWindow: makeSpy("setupCpuStatusWindow"),
  endJankenScene: makeSpy("endJankenScene"),
  onRoundResult: makeSpy("onRoundResult")
});
function resetCallLog() {
  callLog.length = 0;
}
function callsTo(name) {
  return callLog.filter(c => c.name === name);
}

console.log("battle.test.js");

test("通常の勝ち: グーがチョキに勝ちCPUのHPが減り、setResultTextに勝利メッセージが渡る", () => {
  resetCallLog();
  resetBattleCounters();
  const player = freshState("thunder");
  const cpu = freshState("thunder");
  const cpuHpBefore = cpu.hp;

  battleTurn(0, 2, player, cpu, "thunder", "thunder"); // グー(0) vs チョキ(2)

  assert.ok(cpu.hp < cpuHpBefore, "CPUのHPが減っていない");
  const resultCalls = callsTo("setResultText");
  assert.equal(resultCalls.length, 1);
  assert.ok(resultCalls[0].args[0].startsWith("勝ち！"), "勝利メッセージになっていない");
  assert.equal(callsTo("handleCpuDefeated").length, 0);
});

test("通常の負け: パーがグーに勝たれ、自分のHPが減りsetResultTextに敗北メッセージが渡る", () => {
  resetCallLog();
  resetBattleCounters();
  const player = freshState("thunder", { hp: 25 });
  const cpu = freshState("thunder");

  battleTurn(0, 1, player, cpu, "thunder", "thunder"); // グー(0) vs パー(1、パーが勝つ)

  assert.ok(player.hp < 25, "プレイヤーのHPが減っていない");
  const resultCalls = callsTo("setResultText");
  assert.ok(resultCalls[0].args[0].startsWith("負け…"), "敗北メッセージになっていない");
});

test("あいこ: HPは変化せずsaveData.stats.drawCountが増える", () => {
  resetCallLog();
  resetBattleCounters();
  const player = freshState("thunder");
  const cpu = freshState("thunder");
  const drawCountBefore = saveData.stats.drawCount;

  battleTurn(0, 0, player, cpu, "thunder", "thunder"); // グー同士 → あいこ

  assert.equal(saveData.stats.drawCount, drawCountBefore + 1);
  assert.equal(callsTo("setResultText")[0].args[0].startsWith("あいこ"), true);
});

test("氷: 相手がfreezeReady中にパーを出すとパワーが増えず凍結が消費される", () => {
  resetCallLog();
  resetBattleCounters();
  const player = freshState("thunder", { power: 0 });
  const cpu = freshState("ice", { freezeReady: true });

  battleTurn(1, 0, player, cpu, "thunder", "ice"); // プレイヤーがパー(勝ち)、CPUはグー。CPU(氷)が負けるのでonWinで再度freezeReadyが立たない

  assert.equal(player.power, 0, "凍結中なのにパワーが増えている");
  assert.equal(cpu.freezeReady, false, "凍結が消費されていない");
});

test("毒: 勝敗に関わらず毎ターンtickPoisonが両者に発動しHPが減る", () => {
  resetCallLog();
  resetBattleCounters();
  const player = freshState("thunder", { poisonDamage: 2, poisonTurnsLeft: 3 });
  const cpu = freshState("thunder");
  const hpBefore = player.hp;

  battleTurn(0, 0, player, cpu, "thunder", "thunder"); // あいこにして勝敗以外の影響を見る

  assert.equal(player.hp, hpBefore - 2);
  assert.equal(player.poisonTurnsLeft, 2);
});

test("HP0による決着: ダメージでCPUのHPが0以下になるとhandleCpuDefeatedが呼ばれる", () => {
  resetCallLog();
  resetBattleCounters();
  const player = freshState("thunder");
  const cpu = freshState("thunder", { hp: 1 });

  battleTurn(0, 2, player, cpu, "thunder", "thunder"); // グーがチョキに勝つ

  assert.equal(callsTo("handleCpuDefeated").length, 1);
  assert.equal(callsTo("setResultText").length, 0, "決着時はsetResultTextを呼ばず即returnするはず");
});

test("HP0による決着: 自分のHPが0以下になるとhandlePlayerDefeatedが呼ばれる", () => {
  resetCallLog();
  resetBattleCounters();
  const player = freshState("thunder", { hp: 1 });
  const cpu = freshState("thunder");

  battleTurn(0, 1, player, cpu, "thunder", "thunder"); // グーがパーに負ける

  assert.equal(callsTo("handlePlayerDefeated").length, 1);
});

test("風属性クエスト: onHandPlayedで動いたwindSpeedがwindGustクエストの進捗に反映される", () => {
  resetCallLog();
  resetBattleCounters();
  // windGustは統計値ではなく1戦闘内のピーク値を手動で記録するクエストなので、
  // 他のテストファイルの実行順に影響されないよう明示的にリセットしておく
  saveData.quests.mainProgress.windGust = { progress: 0, claimed: false };
  const player = freshState("wind", { windLastHand: 1 }); // 直前と違う手を出すと風速+1
  const cpu = freshState("thunder");

  battleTurn(0, 1, player, cpu, "wind", "thunder"); // グー vs パー(負け、風速計算には無関係)

  assert.equal(player.windSpeed, 1);
  assert.equal(getQuestProgress("windGust"), 1);
});

test("炎属性クエスト: パワー消費で上がるfireAtkBonusがfireBurstクエストの進捗に反映される", () => {
  resetCallLog();
  resetBattleCounters();
  // fireBurstも同様にピーク値を手動記録するクエストなので明示的にリセットする
  saveData.quests.mainProgress.fireBurst = { progress: 0, claimed: false };
  const player = freshState("fire", { power: 3, maxPower: 3 });
  const cpu = freshState("thunder");

  battleTurn(0, 2, player, cpu, "fire", "thunder"); // グー(パワー消費)がチョキに勝つ

  assert.equal(player.fireAtkBonus, 1);
  assert.equal(getQuestProgress("fireBurst"), 1);
});

test("onRoundResult: 勝ち/負け/あいこがそれぞれ'win'/'loss'/'draw'で1回だけ通知される(オンライン専用勝率の集計に使う)", () => {
  resetCallLog();
  resetBattleCounters();
  const player = freshState("thunder");
  const cpu = freshState("thunder");
  battleTurn(0, 2, player, cpu, "thunder", "thunder"); // 勝ち
  assert.deepEqual(callsTo("onRoundResult").map(c => c.args[0]), ["win"]);

  resetCallLog();
  const player2 = freshState("thunder");
  const cpu2 = freshState("thunder");
  battleTurn(0, 1, player2, cpu2, "thunder", "thunder"); // 負け
  assert.deepEqual(callsTo("onRoundResult").map(c => c.args[0]), ["loss"]);

  resetCallLog();
  const player3 = freshState("thunder");
  const cpu3 = freshState("thunder");
  battleTurn(0, 0, player3, cpu3, "thunder", "thunder"); // あいこ
  assert.deepEqual(callsTo("onRoundResult").map(c => c.args[0]), ["draw"]);
});

summarize("tests/battle.test.js");
