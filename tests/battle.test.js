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

// ▼ ここから汎用アイテムカード(js/story-catalog.jsのITEM_CARD_CATALOG新設18種)が
// battle.js側に追加したフックの回帰テスト。カード自体のapply()はstory-catalog.test.js側で検証済みなので、
// ここではapply()後を模した状態(itemXxxフィールドを直接セット)でbattleTurn()の挙動を確認する。

test("背水の誓い: HPが50%以下の間だけ攻撃力+2が乗る", () => {
  resetCallLog();
  resetBattleCounters();
  const playerLow = freshState("thunder", { hp: 10, maxHp: 25, itemLowHpAtkBonus: 2 });
  const cpu1 = freshState("thunder");
  battleTurn(2, 1, playerLow, cpu1, "thunder", "thunder"); // チョキ(固定4ダメージ)がパーに勝つ
  assert.equal(cpu1.hp, 25 - 6); // 4 + 背水の誓い2

  const playerFull = freshState("thunder", { hp: 25, maxHp: 25, itemLowHpAtkBonus: 2 });
  const cpu2 = freshState("thunder");
  battleTurn(2, 1, playerFull, cpu2, "thunder", "thunder");
  assert.equal(cpu2.hp, 25 - 4); // HPが50%超なのでボーナスなし
});

test("捨て身の一撃: グー勝利時に与ダメ+4する代わりに与ダメの半分を自分も被弾する", () => {
  resetCallLog();
  resetBattleCounters();
  const player = freshState("thunder", { itemRockAtkBonus: 4, power: 0 });
  const cpu = freshState("thunder");
  const playerHpBefore = player.hp;
  battleTurn(0, 2, player, cpu, "thunder", "thunder"); // グー(パワーなし、base1)+4=5ダメージ
  assert.equal(cpu.hp, 25 - 5);
  assert.equal(player.hp, playerHpBefore - 2); // 5の半分(floor)=2自傷
});

test("一点賭けの証: グーでパワー消費した時だけ攻撃力+3が乗る", () => {
  resetCallLog();
  resetBattleCounters();
  const playerWithPower = freshState("thunder", { itemPowerAtkBonus: 3, power: 2 });
  const cpu1 = freshState("thunder");
  battleTurn(0, 2, playerWithPower, cpu1, "thunder", "thunder"); // グー+パワー消費(base7+3=10)
  assert.equal(cpu1.hp, 25 - 10);

  const playerNoPower = freshState("thunder", { itemPowerAtkBonus: 3, power: 0 });
  const cpu2 = freshState("thunder");
  battleTurn(0, 2, playerNoPower, cpu2, "thunder", "thunder"); // パワーなし(base1のみ、ボーナス乗らない)
  assert.equal(cpu2.hp, 25 - 1);
});

test("賭け金の証: 敗北した次のグー使用時はパワー消費コストが0になる(パワーが減らない)", () => {
  resetCallLog();
  resetBattleCounters();
  const player = freshState("thunder", { itemFreeCostEnabled: true, power: 2 });
  const cpu1 = freshState("thunder");
  battleTurn(2, 0, player, cpu1, "thunder", "thunder"); // チョキ vs グー → 負け(予約が立つ)
  assert.equal(player.itemFreeCostPending, true);
  assert.equal(player.power, 2, "負けただけでパワーが変化してはいけない");

  const cpu2 = freshState("thunder");
  battleTurn(0, 2, player, cpu2, "thunder", "thunder"); // グー vs チョキ → 勝ち、コストが無料になるはず
  assert.equal(player.power, 2, "無料のはずのパワーが消費されている");
  assert.equal(player.itemFreeCostPending, false, "使用後に予約が消費されていない");
});

test("小瓶の毒: 勝利時に相手へ毒1スタックが追加される", () => {
  resetCallLog();
  resetBattleCounters();
  const player = freshState("thunder", { itemPoisonOnWin: true });
  const cpu = freshState("thunder");
  battleTurn(0, 2, player, cpu, "thunder", "thunder");
  assert.equal(cpu.poisonDamage, 1);
  // applyPoison()でturnsLeftは3にセットされるが、同じターン内で毎ターン発動のtickPoison()も
  // 走るため、ターン終了時点では1回分減った2になる
  assert.equal(cpu.poisonTurnsLeft, 2);
});

test("呪いの人形: onPowerUseを持たない属性でもパワー消費のたびに相手へ呪いが乗る", () => {
  resetCallLog();
  resetBattleCounters();
  const player = freshState("ice", { itemCurseOnPowerUse: true, power: 2 });
  const cpu = freshState("ice");
  battleTurn(0, 2, player, cpu, "ice", "ice"); // 氷にはonPowerUseが無い
  assert.equal(cpu.curseStacks, 1);
});

test("凍える吐息: 発動確率100%なら勝利時に必ずfreezeReadyが立ち、相手の次のパー獲得を防ぐ(氷属性以外でも動く)", () => {
  resetCallLog();
  resetBattleCounters();
  const player = freshState("thunder", { itemFreezeChanceOnWin: 1 });
  const cpu = freshState("thunder");
  battleTurn(0, 2, player, cpu, "thunder", "thunder"); // 勝ち
  assert.equal(player.freezeReady, true);

  // 2ターン目はプレイヤーが負ける手にして、勝利時のfreezeChance再抽選が混ざらないようにする
  const cpuPowerBefore = cpu.power;
  battleTurn(0, 1, player, cpu, "thunder", "thunder"); // cpuがパーを出す(プレイヤーは負け)
  assert.equal(cpu.power, cpuPowerBefore, "凍結中なのにパワーが増えている");
  assert.equal(player.freezeReady, false, "凍結が消費されていない");
});

test("蜘蛛の糸: あいこの時に相手のパワーを1奪う", () => {
  resetCallLog();
  resetBattleCounters();
  // cpuのpowerをコスト(2)未満にして、グー同士のあいこでcpu側の通常のパワー消費が発生しないようにする
  // (発生すると、盗んだ直後にパワー消費が乗ってしまい検証が混ざる)
  const player = freshState("thunder", { itemPowerStealOnDraw: true, power: 0 });
  const cpu = freshState("thunder", { power: 1 });
  battleTurn(0, 0, player, cpu, "thunder", "thunder"); // グー同士→あいこ
  assert.equal(cpu.power, 0);
  assert.equal(player.power, 1);
});

test("老練の心得: あいこ時にパワー+1される", () => {
  resetCallLog();
  resetBattleCounters();
  const player = freshState("thunder", { itemPowerOnDraw: true, power: 0, maxPower: 3 });
  const cpu = freshState("thunder");
  battleTurn(0, 0, player, cpu, "thunder", "thunder");
  assert.equal(player.power, 1);
});

test("疾風の靴: 直前と違う手を出すとパワー+1、同じ手なら手替えボーナスは乗らない", () => {
  resetCallLog();
  resetBattleCounters();
  const player = freshState("thunder", { itemPowerOnHandChange: true, power: 0, maxPower: 5 });
  const cpu = freshState("thunder");
  battleTurn(2, 0, player, cpu, "thunder", "thunder"); // 初回(直前の手が無い)はボーナスなし
  assert.equal(player.power, 0);
  battleTurn(1, 0, player, cpu, "thunder", "thunder"); // 直前(チョキ)と違う(パー)→手替え+1、パー自体の獲得+1も乗り計2
  assert.equal(player.power, 2);
  battleTurn(1, 0, player, cpu, "thunder", "thunder"); // 同じ手(パー)→手替えボーナスなし、パー獲得+1のみ
  assert.equal(player.power, 3);
});

test("貯蓄の心得: パワーが上限を超えた分がHP回復に変換される", () => {
  resetCallLog();
  resetBattleCounters();
  const player = freshState("thunder", { itemOverflowPowerToHeal: true, power: 3, maxPower: 3, hp: 20, maxHp: 25 });
  const cpu = freshState("thunder");
  battleTurn(1, 0, player, cpu, "thunder", "thunder"); // パーで+1のところ上限3で頭打ち→あふれた1がHP回復
  assert.equal(player.power, 3);
  assert.equal(player.hp, 21);
});

test("巡礼の杖: 3ターンごとにHPが2回復する", () => {
  resetCallLog();
  resetBattleCounters();
  const player = freshState("thunder", { itemPilgrimStaffActive: true, itemPilgrimStaffTurns: 0, hp: 10, maxHp: 25 });
  const cpu = freshState("thunder");
  battleTurn(0, 0, player, cpu, "thunder", "thunder");
  assert.equal(player.hp, 10);
  battleTurn(0, 0, player, cpu, "thunder", "thunder");
  assert.equal(player.hp, 10);
  battleTurn(0, 0, player, cpu, "thunder", "thunder");
  assert.equal(player.hp, 12);
  assert.equal(player.itemPilgrimStaffTurns, 0);
});

// ▼ ここから属性専用アイテムカードのうち、battle.js側の分岐(freezeReadyの消費・呪いのパー限定判定)を
// 書き換えた2枚(氷結の残響/古き呪いの書)の回帰テスト。

test("氷結の残響: 凍結消費時にiceEchoChargesが残っていれば凍結を1回分立て直す", () => {
  resetCallLog();
  resetBattleCounters();
  const player = freshState("ice", { iceEchoCharges: 1 });
  const cpu = freshState("ice");
  battleTurn(0, 2, player, cpu, "ice", "ice"); // グーがチョキに勝つ→氷の通常onWinでfreezeReady=true
  assert.equal(player.freezeReady, true);

  battleTurn(0, 1, player, cpu, "ice", "ice"); // cpuがパー→凍結消費、echoで即座に立て直る
  assert.equal(player.freezeReady, true, "echoで立て直されていない");
  assert.equal(player.iceEchoCharges, 0);

  battleTurn(0, 1, player, cpu, "ice", "ice"); // 2回目の消費。echoは使い切ったので今度は立て直らない
  assert.equal(player.freezeReady, false);
});

test("古き呪いの書: 相手の呪いスタックが閾値以上ならパー以外の手でもダメージが乗る", () => {
  resetCallLog();
  resetBattleCounters();
  const player = freshState("curse", { itemCurseAnyHandThreshold: 5 });
  const cpu = freshState("thunder", { curseStacks: 5, hp: 25 });
  battleTurn(2, 0, player, cpu, "curse", "thunder"); // cpuHand=0(グー、パーではない)
  assert.equal(cpu.hp, 25 - 5, "パー限定のままダメージが乗っていない");
});

summarize("tests/battle.test.js");
