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

test("汎用アイテムカード追加5種: 連勝の証/双刃の型/収集家の勲章はattributeBonusに反映される", () => {
  const streak = freshState("thunder", { itemWinStreakCount: 3 });
  assert.equal(attributeBonus(streak, 1, "thunder"), 3, "手の種類に関わらず乗るはず");

  const blade = freshState("thunder", { itemScissorsAtkBonus: 2 });
  assert.equal(attributeBonus(blade, 2, "thunder"), 2, "チョキには乗る");
  assert.equal(attributeBonus(blade, 0, "thunder"), 0, "グーには乗らない");

  const collector = freshState("thunder", { itemCollectorAtkBonus: 4 });
  assert.equal(attributeBonus(collector, 1, "thunder"), 4);
});

test("炎: fireItemAtkBonus(アイテムカード「業火の種」の永続分)もグー限定でfireAtkBonusと合算される", () => {
  const attacker = freshState("fire", { fireAtkBonus: 1, fireItemAtkBonus: 2 });
  assert.equal(attributeBonus(attacker, 0, "fire"), 3);
  assert.equal(attributeBonus(attacker, 2, "fire"), 0); // チョキには乗らない
});

test("炎: onNewBattle()はfireAtkBonus/fireRage(戦闘中に貯まる分)だけリセットし、fireItemAtkBonus/fireRagePermanent(アイテムカードの永続分)は保持する", () => {
  const player = freshState("fire", {
    fireAtkBonus: 5, fireRage: true,
    fireItemAtkBonus: 2, fireRagePermanent: true
  });
  ATTR_LOGIC.fire.onNewBattle(player);
  assert.equal(player.fireAtkBonus, 0, "戦闘中に貯まった分はリセットされるはず");
  assert.equal(player.fireItemAtkBonus, 2, "アイテムカードの永続ボーナスは消えてはいけない");
  assert.equal(player.fireRage, true, "永続解放済みなら次の戦闘もfireRageはONで始まるはず");

  // 永続解放していない場合はfireRageもfalseにリセットされる
  const player2 = freshState("fire", { fireAtkBonus: 3, fireRage: true });
  ATTR_LOGIC.fire.onNewBattle(player2);
  assert.equal(player2.fireRage, false);
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

// ▼ ここから属性専用アイテムカード(js/story-catalog.jsの新設27種)がattributes.js側に
// 追加した「上書き可能フィールド」の回帰テスト。カード自体のapply()はstory-catalog.test.jsで
// 検証済みなので、ここではitemXxxフィールドを直接セットした状態でロジック関数の挙動を確認する。

test("予備電池: thunderChargeMaxを上げるとチャージ上限とダメージボーナス閾値が連動する", () => {
  const state = freshState("thunder", { thunderCharge: 5, thunderChargeMax: 7 });
  ATTR_LOGIC.thunder.onPowerUse(state); // 6まで増える(上限7未満なのでクランプされない)
  assert.equal(state.thunderCharge, 6);

  // 通常なら5で+10ボーナスだが、上限が7の間は5は「3以上7未満」のレンジなので+1のみ
  assert.equal(attributeBonus(freshState("thunder", { thunderCharge: 5, thunderChargeMax: 7 }), 0, "thunder"), 1);
  // 上限(7)に達した時だけ+10
  assert.equal(attributeBonus(freshState("thunder", { thunderCharge: 7, thunderChargeMax: 7 }), 0, "thunder"), 10);
});

test("拳聖の証/乱打の心得: 格闘家のpowerCostとチョキダメージを底上げできる", () => {
  const state = freshState("fighter", { itemFighterPowerCostReduction: 1 });
  assert.equal(getPowerCost("fighter", state), 0); // 通常1 - 1 = 0

  const maxedOut = freshState("fighter", { itemFighterPowerCostReduction: 5 });
  assert.equal(getPowerCost("fighter", maxedOut), 0); // 最低0でクランプ

  assert.equal(ATTR_LOGIC.fighter.getBaseDamage(2, false, { itemFighterScissorsBonus: 2 }), 7); // 5+2
});

test("湧き水の加護/氷解の記憶: 水のonDraw回復量・パワー獲得量を底上げできる", () => {
  const state = freshState("water", { hp: 10, maxHp: 25, power: 0, maxPower: 5, itemWaterHealBonus: 2, itemWaterPowerBonus: 1 });
  const result = ATTR_LOGIC.water.onDraw(state);
  assert.equal(result.heal, 5); // 3+2
  assert.equal(state.hp, 15);
  assert.equal(state.power, 2); // 1+1
});

test("暴風の残滓: 風速3のボーナスを底上げできる", () => {
  const state = freshState("wind", { windSpeed: 3, itemWindMaxSpeedBonusExtra: 2 });
  assert.equal(attributeBonus(state, 0, "wind"), 6); // 通常4+2
});

test("深紅の渇き/牙の刻印: 吸血の回復率とグー固定ダメージを底上げできる", () => {
  const attacker = freshState("vampire", { hp: 10, maxHp: 25, itemVampireHealRateBonus: 0.15 });
  const healed = ATTR_LOGIC.vampire.onWin(attacker, 0, true, 10); // 65%
  assert.equal(healed, 6); // floor(10*0.65)=6

  assert.equal(ATTR_LOGIC.vampire.getBaseDamage(0, true, { itemVampireRockBonus: 2 }), 7); // 5+2
});

test("鏡合わせの誓い/虚像の刃: ドッペルゲンガーの閾値短縮と勝利ダメージ底上げ", () => {
  const state = freshState("doppel", { itemDoppelThreshold: 4 });
  const opponent = { hp: 25 };
  ATTR_LOGIC.doppel.onDraw(state, opponent);
  ATTR_LOGIC.doppel.onDraw(state, opponent);
  ATTR_LOGIC.doppel.onDraw(state, opponent);
  const result = ATTR_LOGIC.doppel.onDraw(state, opponent); // 4回目、閾値4に到達
  assert.equal(result.damage, 5);

  assert.equal(ATTR_LOGIC.doppel.getBaseDamage(0, false, { itemDoppelWinBonus: 2 }), 4); // 2+2
});

test("呪詛の増幅: 呪術のパワー消費時の呪い付与量を底上げできる", () => {
  const player = freshState("curse", { itemCurseStackBonus: 1 });
  const opponent = freshState("thunder");
  ATTR_LOGIC.curse.onPowerUse(player, opponent);
  assert.equal(opponent.curseStacks, 2); // 通常1+1
});

test("増加装甲: 砲台の被弾時パワー獲得を底上げできる", () => {
  const state = freshState("cannon", { power: 0, maxPower: 20, itemCannonGainBonus: 2 });
  ATTR_LOGIC.cannon.onHpChange(state);
  assert.equal(state.power, 7); // 通常5+2
});

test("イカサマの札/大博打の記憶: ギャンブラーの確変率・持続ターンを底上げできる", () => {
  setBattleRandom(() => 0.3); // 通常25%では外れるが、+10%で35%なら発動する固定乱数
  try {
    const state = freshState("gambler", { gamblerKakuhenTurns: 0, itemGamblerRateBonus: 0.1, itemGamblerDurationBonus: 2 });
    ATTR_LOGIC.gambler.onPowerUse(state);
    assert.equal(state.gamblerKakuhenTurns, 6); // 通常4+2
  } finally {
    setBattleRandom(Math.random);
  }
});

test("幸運のコイン: マジシャンの抽選からHP回復を除外できる", () => {
  setBattleRandom(() => 0.9); // 3択なら回復(roll=2)を引く乱数だが、2択に絞ると防御力(roll=1)になる
  try {
    const state = freshState("magician", { hp: 10, maxHp: 25, itemMagicianExcludeHeal: true });
    const result = ATTR_LOGIC.magician.onPowerUse(state);
    assert.equal(result, undefined); // 回復が発生していない
    assert.equal(state.hp, 10);
    assert.equal(state.magicianDefBonus, 1);
  } finally {
    setBattleRandom(Math.random);
  }
});

test("狂戦士の心得/怒濤の一撃: バーサーカーの自傷軽減と固定ダメージ底上げ", () => {
  const state = freshState("berserker", { hp: 10, itemBerserkerSelfDmgReduction: 1 });
  const dealt = ATTR_LOGIC.berserker.onTurnEnd(state);
  assert.equal(dealt, 4); // 通常5-1
  assert.equal(state.hp, 6);

  assert.equal(ATTR_LOGIC.berserker.getBaseDamage(1, false, { itemBerserkerDmgBonus: 2 }), 8); // 6+2
});

summarize("tests/attributes.test.js");
