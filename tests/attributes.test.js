// js/attributes.js の回帰テスト。分割前のmain.js内の挙動と一致することを保証する。
import { test, assert, summarize } from "./helpers/test-runner.js";
import {
  ATTR_LOGIC,
  calcDamage,
  damageReduction,
  attributeBonus,
  getPowerCost,
  canUsePower,
  initAttribute,
  applyPoison,
  tickPoison,
  tickGamblerKakuhen,
  setBattleRandom
} from "../js/attributes.js";

function freshState(attr, overrides = {}) {
  const state = { hp: 25, maxHp: 25, power: 3, maxPower: 3, ...overrides };
  initAttribute(state, attr);
  Object.assign(state, overrides); // initAttributeの初期値をoverridesで上書き
  return state;
}

console.log("attributes.test.js");

test("じゃんけんの勝敗判定: グーはチョキに勝ちダメージが出る", () => {
  const attacker = freshState("thunder");
  const defender = freshState("thunder");
  const damage = calcDamage(attacker, defender, 0, 2, "thunder", false, "thunder", 2);
  assert.equal(damage, 1); // 基礎ダメージ(パワー未消費のグー)= 1
});

test("じゃんけんの勝敗判定: グーはパーに負けてダメージ0", () => {
  const attacker = freshState("thunder");
  const defender = freshState("thunder");
  const damage = calcDamage(attacker, defender, 0, 1, "thunder", false, "thunder", 2);
  assert.equal(damage, 0);
});

test("じゃんけんの勝敗判定: あいこはダメージ0", () => {
  const attacker = freshState("thunder");
  const defender = freshState("thunder");
  const damage = calcDamage(attacker, defender, 1, 1, "thunder", false, "thunder", 2);
  assert.equal(damage, 0);
});

test("炎: fireAtkBonusはグーの攻撃にのみ加算される", () => {
  const attacker = freshState("fire", { fireAtkBonus: 3 });
  assert.equal(attributeBonus(attacker, 0, "fire"), 3);
  assert.equal(attributeBonus(attacker, 2, "fire"), 0); // チョキには乗らない
});

test("炎: パワー消費グー(usedPower)+fireAtkBonusでダメージが積み上がる", () => {
  const attacker = freshState("fire", { fireAtkBonus: 2 });
  const defender = freshState("fire");
  // グー(0) usedPower=true の基礎ダメージ7 + fireAtkBonus 2 = 9
  const damage = calcDamage(attacker, defender, 0, 2, "fire", true, "fire", 2);
  assert.equal(damage, 9);
});

test("石: damageReductionが被ダメージを軽減し、0未満にはならない", () => {
  const defender = freshState("stone", { stoneDefenseReduction: 5 });
  assert.equal(damageReduction(defender, "stone"), 5);

  const attacker = freshState("thunder");
  const damage = calcDamage(attacker, defender, 0, 2, "thunder", false, "stone", 2);
  assert.equal(damage, 0); // 1 - 5 は 0 未満なので0にクランプ
});

test("砲台: getBaseDamageは消費パワー×2ダメージを返す", () => {
  const attacker = freshState("cannon", { power: 5 });
  const defender = freshState("thunder");
  const damage = calcDamage(attacker, defender, 0, 2, "cannon", true, "thunder", 5);
  assert.equal(damage, 10);
});

test("砲台: powerCostは現在パワーを全消費する値を返す", () => {
  const state = freshState("cannon", { power: 7 });
  assert.equal(getPowerCost("cannon", state), 7);
});

test("格闘家: powerCostは固定1、デフォルト属性は2", () => {
  assert.equal(getPowerCost("fighter", freshState("fighter")), 1);
  assert.equal(getPowerCost("poison", freshState("poison")), 2);
});

test("ギャンブラー: canUsePowerは確変中ならパワー0でも許可する", () => {
  const normal = freshState("gambler", { power: 0, gamblerKakuhenTurns: 0 });
  const kakuhen = freshState("gambler", { power: 0, gamblerKakuhenTurns: 2 });
  assert.equal(canUsePower("gambler", normal, getPowerCost("gambler", normal)), false);
  assert.equal(canUsePower("gambler", kakuhen, getPowerCost("gambler", kakuhen)), true);
});

test("ギャンブラー: battleRandomを固定した場合のダイスダメージが再現可能", () => {
  setBattleRandom(() => 0.5); // floor(0.5*5)+1 = 3 を毎回引く固定乱数
  try {
    const attacker = freshState("gambler", { power: 3, gamblerKakuhenTurns: 0 });
    const defender = freshState("thunder");
    // powerCost=3(全消費) -> stacks=3 -> 3ダイス(各3) + stacks>=3ボーナス5 = 14
    const damage = calcDamage(attacker, defender, 0, 2, "gambler", true, "thunder", 3);
    assert.equal(damage, 14);
  } finally {
    setBattleRandom(Math.random); // 他のテストに影響しないよう必ず戻す
  }
});

test("吸血: onWinは与ダメージの半分をHP上限内で回復する", () => {
  const attacker = freshState("vampire", { hp: 10, maxHp: 25 });
  const healed = ATTR_LOGIC.vampire.onWin(attacker, 0, true, 10);
  assert.equal(healed, 5);
  assert.equal(attacker.hp, 15);
});

test("水: onDrawはHP+3・パワー+1(上限クランプ込み)", () => {
  const state = freshState("water", { hp: 24, maxHp: 25, power: 3, maxPower: 4 });
  const result = ATTR_LOGIC.water.onDraw(state);
  assert.equal(result.heal, 1); // maxHpまで残り1しか回復できない
  assert.equal(state.hp, 25);
  assert.equal(state.power, 4);
});

test("風: onHandPlayedで同じ手が続くと風速が下がり、違う手なら上がる", () => {
  const state = freshState("wind");
  ATTR_LOGIC.wind.onHandPlayed(state, 0);
  assert.equal(state.windSpeed, 0); // 初回はwindLastHandがnullなので変化なし
  ATTR_LOGIC.wind.onHandPlayed(state, 1); // 違う手 → +1
  assert.equal(state.windSpeed, 1);
  ATTR_LOGIC.wind.onHandPlayed(state, 1); // 同じ手 → -1
  assert.equal(state.windSpeed, 0);
});

test("ドッペルゲンガー: onDrawはあいこ7回目以降ダメージが5に強化される", () => {
  const state = freshState("doppel");
  const opponent = { hp: 25 };
  for (let i = 0; i < 6; i++) ATTR_LOGIC.doppel.onDraw(state, opponent);
  assert.equal(state.doppelDrawCount, 6);
  const result = ATTR_LOGIC.doppel.onDraw(state, opponent); // 7回目
  assert.equal(result.damage, 5);
  assert.equal(state.doppelDrawCount, 7);
});

test("呪術: onPowerUseは相手にcurseStacksを+1する", () => {
  const player = freshState("curse");
  const opponent = freshState("thunder");
  ATTR_LOGIC.curse.onPowerUse(player, opponent);
  ATTR_LOGIC.curse.onPowerUse(player, opponent);
  assert.equal(opponent.curseStacks, 2);
});

test("バーサーカー: onTurnEndで毎ターン5自傷し、HP未満なら削れる分だけ返す", () => {
  const state = freshState("berserker", { hp: 3 });
  const dealt = ATTR_LOGIC.berserker.onTurnEnd(state);
  assert.equal(dealt, 3);
  assert.equal(state.hp, 0);
});

test("毒: applyPoison/tickPoisonの重ね掛けとターン経過", () => {
  const defender = freshState("thunder", { hp: 25 });
  applyPoison(defender);
  assert.equal(defender.poisonDamage, 1);
  assert.equal(defender.poisonTurnsLeft, 3);

  const dealt1 = tickPoison(defender);
  assert.equal(dealt1, 1);
  assert.equal(defender.hp, 24);
  assert.equal(defender.poisonTurnsLeft, 2);

  applyPoison(defender); // まだ毒が残っている状態での再付与 → +1され3ターンにリセット
  assert.equal(defender.poisonDamage, 2);
  assert.equal(defender.poisonTurnsLeft, 3);
});

test("ギャンブラー: tickGamblerKakuhenは0未満にならない", () => {
  const state = freshState("gambler", { gamblerKakuhenTurns: 1 });
  tickGamblerKakuhen(state);
  assert.equal(state.gamblerKakuhenTurns, 0);
  tickGamblerKakuhen(state);
  assert.equal(state.gamblerKakuhenTurns, 0);
});

summarize("tests/attributes.test.js");
