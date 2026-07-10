// ===== 属性ロジック(ATTR_BASE_STATUS / ATTR_DATA / ATTR_LOGIC / ダメージ計算) =====
// main.jsから切り出したモジュール。DOM操作は一切含まない(main.js側で描画を担当する)。

// オンライン対戦中は乱数をシード同期させる必要があるため、main.js側のbattleRandom(actingState)を
// 実行時に注入してもらう。注入されるまではMath.randomにフォールバックする(CPU戦・ストーリー用)。
let battleRandomImpl = Math.random;
export function setBattleRandom(fn) {
  battleRandomImpl = fn;
}

export const ATTR_BASE_STATUS = {
  fire: {
    maxHp: 25,
    maxPower: 3
  },
  thunder: {
    maxHp: 30,
    maxPower: 4
  },
  ice: {
    maxHp: 30,
    maxPower: 3
  },
  stone: {
    maxHp: 35,
    maxPower: 3
  },
  water: {
    maxHp: 30,
    maxPower: 4
  },
  wind: {
    maxHp: 25,
    maxPower: 3
  },
  fighter: {
    maxHp: 25,
    maxPower: 5
  },
  poison: {
    maxHp: 20,
    maxPower: 3
  },
  vampire: {
    maxHp: 25,
    maxPower: 3
  },
  doppel: {
    maxHp: 25,
    maxPower: 3
  },
  curse: {
    maxHp: 25,
    maxPower: 3
  },
  cannon: {
    maxHp: 25,
    maxPower: 20
  },
  gambler: {
    maxHp: 25,
    maxPower: 3
  },
  magician: {
    maxHp: 25,
    maxPower: 3
  },
  berserker: {
    maxHp: 80,
    maxPower: 3
  },

};

export function getRandomAttribute() {
  const keys = Object.keys(ATTR_DATA);
  const index = Math.floor(Math.random() * keys.length);
  return keys[index];
}

// グーのパワー消費量を求める。ATTR_LOGIC[attr].powerCostは固定値(数値)でも、
// 現在のパワー残量に応じて変わる関数(state => 消費量)でもよい（未指定なら2）
export function getPowerCost(attribute, state) {
    const logic = ATTR_LOGIC[attribute];
    const cost = logic && logic.powerCost !== undefined ? logic.powerCost : 2;
    return typeof cost === "function" ? cost(state) : cost;
}

// グーでパワーを使った攻撃ができるかどうかを判定する。
// デフォルトは「コスト>0 かつ 現在パワーがコスト以上」。
// ATTR_LOGIC[attr].canUsePower(state, cost)を定義すれば上書き可能
// （ギャンブラーの確変中はパワー0でも攻撃できる、など）
export function canUsePower(attribute, state, cost) {
    const logic = ATTR_LOGIC[attribute];
    if (logic && logic.canUsePower) return logic.canUsePower(state, cost);
    return cost > 0 && state.power >= cost;
}

// ギャンブラーのダイスロールダメージ（消費量1〜3に応じてダイス数が変わり、3以上は+5される）
export function rollGamblerDamage(stacks, actingState) {
    if (stacks <= 0) return 0;
    const diceCount = Math.min(stacks, 3);
    let total = 0;
    for (let i = 0; i < diceCount; i++) {
        total += Math.floor(battleRandomImpl(actingState) * 5) + 1; // 1〜5のダイス
    }
    if (stacks >= 3) total += 5;
    return total;
}

export function baseDamage(hand, usedPower, attribute, attackerState, powerCost) {
    // 属性ごとに基礎ダメージを上書きしたい場合はATTR_LOGIC[attr].getBaseDamageで対応
    const logic = ATTR_LOGIC[attribute];
    if (logic && logic.getBaseDamage) {
        const override = logic.getBaseDamage(hand, usedPower, attackerState, powerCost);
        if (override !== null && override !== undefined) return override;
    }

    if (hand === 2) return 4;      // チョキ
    if (hand === 1) return 2;      // パー
    if (hand === 0) return usedPower ? 7 : 1; // グー
}


// 属性補正計算

export function attributeBonus(state, hand, attribute, usedPower) {
    let bonus = 0;

    // ▼ 属性を問わず加算される汎用ボーナス(アイテムカード用)
    bonus += (state.genericAtkBonus || 0);

    // ▼ 「連勝の証」：連勝数に応じて積み上がる攻撃力(あいこ・敗北でitemWinStreakCountが0に戻る)
    bonus += (state.itemWinStreakCount || 0);

    // ▼ 「収集家の勲章」：所持アイテムカードの種類数が3増えるごとに main.js 側で再計算される攻撃力
    bonus += (state.itemCollectorAtkBonus || 0);

    // ▼ HPが最大の50%以下の間だけ加算される汎用ボーナス(アイテムカード「背水の誓い」用)
    if (state.itemLowHpAtkBonus && state.hp <= state.maxHp / 2) {
        bonus += state.itemLowHpAtkBonus;
    }

    // ▼ グー限定で加算される汎用ボーナス(アイテムカード「捨て身の一撃」「一点賭けの証」用)
    if (hand === 0) {
        bonus += (state.itemRockAtkBonus || 0);
        if (usedPower) {
            bonus += (state.itemPowerAtkBonus || 0);
        }
    }

    // ▼ チョキ限定で加算される汎用ボーナス(アイテムカード「双刃の型」用)
    if (hand === 2) {
        bonus += (state.itemScissorsAtkBonus || 0);
    }

    // ▼ 炎
    if (attribute === "fire") {

        // グー限定 fireAtkBonus(戦闘中にパワー消費するたびに貯まる分、敵が変わるとリセットされる)
        // + fireItemAtkBonus(アイテムカード「業火の種」による永続分、リセットされない)
        if (hand === 0) {
            bonus += (state.fireAtkBonus || 0) + (state.fireItemAtkBonus || 0);
        }

        // 全手に乗る fireRage
        if (state.fireRage) {
            bonus += 2;
        }
    }

    // ▼ 雷（アイテムカード「予備電池」でチャージ上限自体を5→7等に引き上げられる）
    if (attribute === "thunder") {
        const chargeMax = state.thunderChargeMax || 5;
        if (state.thunderCharge >= 3 && state.thunderCharge < chargeMax) {
            bonus += 1;
        }
        if (state.thunderCharge === chargeMax) {
            bonus += 10;
        }
    }

    // ▼ 石（段階強化で積み上がる攻撃力上昇）
    if (attribute === "stone") {
        bonus += (state.stoneAtkBonus || 0);
    }

    // ▼ 風（風速3のとき火力上昇。アイテムカード「暴風の残滓」で+4のボーナス自体を底上げできる）
    if (attribute === "wind" && state.windSpeed === 3) {
        bonus += 4 + (state.itemWindMaxSpeedBonusExtra || 0);
    }

    // ▼ マジシャン（パワー消費でランダムに積み上がる永続攻撃力）
    if (attribute === "magician") {
        bonus += (state.magicianAtkBonus || 0);
    }

    return bonus;
}

// 防御側の被ダメージ軽減計算
export function damageReduction(state, attribute) {
    let reduction = 0;

    // ▼ 属性を問わず軽減される汎用ボーナス(アイテムカード用)
    reduction += (state.genericDefReduction || 0);

    // ▼ 石
    if (attribute === "stone") {
        reduction += (state.stoneDefenseReduction || 0);
    }

    // ▼ マジシャン（パワー消費でランダムに積み上がる永続防御力、上限3）
    if (attribute === "magician") {
        reduction += (state.magicianDefBonus || 0);
    }

    return reduction;
}

// ローグライク補正計算（今はまだ0）
export function roguelikeBonus(state) {
    return 0;
}


//ダメージ計算関数
export function calcDamage(
    attackerState,
    defenderState,
    attackerHand,
    defenderHand,
    attackerAttribute,
    usedPower,   // ★ 追加
    defenderAttribute,
    attackerPowerCost   // ★ 追加（今回消費したパワー量。砲台のような可変ダメージ属性用）
) {

   // 勝敗判定
    const result = (attackerHand - defenderHand + 3) % 3;
    if (result !== 1) return 0;

    // ① 基礎ダメージ
    let damage = baseDamage(attackerHand, usedPower, attackerAttribute, attackerState, attackerPowerCost);

    // ② 属性補正
    damage += attributeBonus(attackerState, attackerHand, attackerAttribute, usedPower);

    // ③ ローグライク補正（今はまだ0）
    damage += roguelikeBonus(attackerState);

    // ④ 防御側の被ダメージ軽減
    damage -= damageReduction(defenderState, defenderAttribute);

    return Math.max(0, damage);
}

// 実際に勝つかどうかに関わらず、この手を出したら何ダメージになるかを事前計算する
// （10ダメージ以上になりそうな攻撃を検知して、ぽん!前のカットイン演出を出すために使う）
export function previewAttackDamage(attackerState, defenderState, hand, attackerAttribute, defenderAttribute) {
    const cost = getPowerCost(attackerAttribute, attackerState);
    const usedPower = hand === 0 && canUsePower(attackerAttribute, attackerState, cost);

    let damage = baseDamage(hand, usedPower, attackerAttribute, attackerState, cost);
    damage += attributeBonus(attackerState, hand, attackerAttribute, usedPower);
    damage += roguelikeBonus(attackerState);
    damage -= damageReduction(defenderState, defenderAttribute);

    return Math.max(0, damage);
}

// colorは属性のブランドカラー。属性選択カードの枠・光彩やバトル中のHPバーの色分けに使う
// (以前はどの属性でも画像アイコン以外の視覚的な差がなかった)
export const ATTR_DATA = {
  fire: {
    name: "炎",
    img: "images/attr/fire.png",
    color: "#ff5a3c",
    shortDesc: "パワー消費で火力上昇。HP10以下でさらに強化。",
    desc: "攻撃的で高火力の属性。パワーを消費するたびに攻撃力が上昇し、体力が10以下になると攻撃力がさらに上昇する。体力が少し少ない"
  },
  ice: {
    name: "氷",
    img: "images/attr/ice.png",
    color: "#4fd1ff",
    shortDesc: "勝利で相手のパワー獲得を封じる。",
    desc: "冷気で相手の動きを鈍らせる属性。じゃんけんに勝利することで相手のパワー獲得を阻害することができる。"
  },
  thunder: {
    name: "雷",
    img: "images/attr/thunder.png",
    color: "#ffd83d",
    shortDesc: "チャージを溜めて大技を狙う一撃属性。",
    desc: "素早く強烈な一撃を放つ属性。チャージ３回で攻撃力が上昇し、チャージ５回で大ダメージを与えることができる。"
  },
  stone: {
    name: "石",
    img: "images/attr/stone.png",
    color: "#a68a5b",
    shortDesc: "パワー消費で防御と攻撃を積み上げる。",
    desc: "パワーを消費するたびに段階的に強化される、腰を据えた防御型の属性。被ダメージ軽減と攻撃力上昇を積み重ねていく。"
  },
  water: {
    name: "水",
    img: "images/attr/water.png",
    color: "#2f8fff",
    shortDesc: "あいこでHPとパワーが回復する。",
    desc: "あいこになるとHPが回復し、パワーも溜まっていく持久戦向けの属性。"
  },
  wind: {
    name: "風",
    img: "images/attr/wind.png",
    color: "#6fe0b8",
    shortDesc: "手を変えて風速を稼ぎ火力を上げる。",
    desc: "手を切り替えて風速を稼ぎ、風速が3になると一気に火力が跳ね上がるテクニカルな属性。"
  },
  fighter: {
    name: "格闘家",
    img: "images/attr/fighter.png",
    color: "#ff8a3d",
    shortDesc: "低コストで手数を稼ぐ接近戦特化。",
    desc: "パワー上限が高く、グーのパワー消費が1と軽い接近戦特化の属性。パーでパワーを大きく獲得でき、チョキは常に固定5ダメージを与える。"
  },
  poison: {
    name: "毒",
    img: "images/attr/poison.png",
    color: "#9b4dff",
    shortDesc: "勝利で毒を付与し継続ダメージを与える。",
    desc: "じゃんけんに勝利すると相手に毒を付与し、3ターンの間毎ターンダメージを与え続ける。毒が残っている間に再度勝利すると、毒ダメージが積み重なる。その分HPは低め。"
  },
  vampire: {
    name: "吸血",
    img: "images/attr/vampire.png",
    color: "#c81d4a",
    shortDesc: "与ダメージの半分を吸収して回復する。",
    desc: "与えたダメージの半分を自分のHPとして吸収する属性。パワーを消費したグーの攻撃は固定5ダメージ。"
  },
  doppel: {
    name: "ドッペルゲンガー",
    img: "images/attr/doppel.png",
    color: "#8a6fd1",
    shortDesc: "あいこで相手に反撃ダメージを与える。",
    desc: "あいこになると相手に反撃ダメージを与える異形の属性。じゃんけんに勝利した際のダメージは手の種類に関わらず一律2固定。あいこを7回重ねると反撃ダメージが強化される。"
  },
  curse: {
    name: "呪術",
    img: "images/attr/curse.png",
    color: "#4a2e8f",
    shortDesc: "パワー消費で相手に呪いを蓄積させる。",
    desc: "グーが命中したかどうかに関わらず、パワーを消費すると相手に呪いを付与する属性。呪われた相手はパーを出すたびにスタック数分のダメージを受ける。呪いは重複して積み重なる。"
  },
  cannon: {
    name: "砲台",
    img: "images/attr/cannon.png",
    color: "#64798a",
    shortDesc: "被弾でパワーが溜まる高火力な砲台。",
    desc: "パワー上限20の重火力型属性。被ダメージ時にパワーが+5溜まり、グーを出すと現在のパワーを全消費してその2倍のダメージを与える。"
  },
  gambler: {
    name: "ギャンブラー",
    img: "images/attr/gambler.png",
    color: "#2ecc71",
    shortDesc: "全パワー消費でダイス勝負の一撃を放つ。",
    desc: "グーを出すと所持パワーを全消費し、消費量に応じたダイスロールでダメージが変動する一発逆転型の属性。パワー消費時に25%の確率で「確変」に突入し、4ターンの間パワー消費なしで攻撃できる。"
  },
  magician: {
    name: "マジシャン",
    img: "images/attr/magician.png",
    color: "#d9a7ff",
    shortDesc: "パワー消費でランダムに成長していく。",
    desc: "パワーを2消費すると「永続攻撃力+1」「永続防御力+1(上限3)」「HP4回復」のいずれかがランダムに発動する成長型の属性。"
  },
  berserker: {
    name: "バーサーカー",
    img: "images/attr/berserker.png",
    color: "#b3121f",
    shortDesc: "自傷しつつ固定高火力で殴り続ける。",
    desc: "HP80の高耐久だが毎ターンHPが5ずつ減っていく属性。どの手を出しても6ダメージの固定火力を持ち、パワーを消費したグーはさらに+3ダメージを与える。"
  }
};

export function initAttribute(player, attr) {
  ATTR_LOGIC[attr].init(player);
}

export const ATTR_LOGIC = {
  fire: {
    name: "炎",
    init(player) {
      player.fireAtkBonus = 0;
      player.fireRage = false;
    },

    onPowerUse(player) {
      player.fireAtkBonus++;
    },
    onHpChange(player) {
      if (player.hp <= 10) {
        player.fireRage = true;
      }
    },
    // ストーリーモードは敵が変わってもプレイヤー側はinitAttribute()を呼び直さないため、
    // fireAtkBonus/fireRageを放っておくと連戦するほど無制限に強くなってしまう。
    // main.js側のhandleStoryEnemyDefeated()が次の敵に切り替わるたびにこれを呼び、他属性と足並みを揃える。
    // ただしfireItemAtkBonus(「業火の種」)/fireRagePermanent(「怒りの解放」)はアイテムカードによる
    // 永続的な強化なので、他の14属性のアイテムカード同様リセットしない(ここでリセットされる
    // fireAtkBonus/fireRageはあくまで戦闘中に自然に貯まる分・HP<=10の一時的な発動のみ)。
    onNewBattle(player) {
      player.fireAtkBonus = 0;
      player.fireRage = Boolean(player.fireRagePermanent);
    },
    getStatus(player) {
      const totalAtkBonus = (player.fireAtkBonus || 0) + (player.fireItemAtkBonus || 0);
      return [
        { label: "攻撃力上昇", value: `+${totalAtkBonus}` },
        { label: "怒り状態", value: player.fireRage ? "ON" : "OFF" }
      ];
    }
  },

  thunder: {
    name: "雷",
    init(player) {
      player.thunderCharge = 0;
    },
    onPowerUse(player) {
      player.thunderCharge++;
      const chargeMax = player.thunderChargeMax || 5;
      if (player.thunderCharge > chargeMax) player.thunderCharge = chargeMax;
    },
    getStatus(player) {
      const chargeMax = player.thunderChargeMax || 5;
      return [
        { label: "チャージ", value: `${player.thunderCharge} / ${chargeMax}` }
      ];
    }
  },

  ice: {
    name: "氷",
    init(player) {
      player.freezeReady = false;
    },
    onWin(player) {
      player.freezeReady = true;
    },
    getStatus(player) {
      return [
        { label: "凍結準備", value: player.freezeReady ? "READY" : "NO" }
      ];
    }
  },

  stone: {
    name: "石",
    init(player) {
      player.stoneUseCount = 0;
      player.stoneDefenseReduction = 0;
      player.stoneAtkBonus = 0;
    },
    onPowerUse(player) {
      player.stoneUseCount++;

      if (player.stoneUseCount === 1) {
        player.stoneDefenseReduction += 1;
      } else if (player.stoneUseCount === 2) {
        player.stoneAtkBonus += 1;
      } else if (player.stoneUseCount === 3) {
        player.stoneDefenseReduction += 1;
      } else if (player.stoneUseCount > 3 && (player.stoneUseCount - 3) % 2 === 0) {
        player.maxPower += 1;
      }
    },
    getStatus(player) {
      return [
        { label: "被ダメージ軽減", value: `-${player.stoneDefenseReduction}` },
        { label: "攻撃力上昇", value: `+${player.stoneAtkBonus}` }
      ];
    }
  },

  water: {
    name: "水",
    init(player) {
      // 追加の状態は持たない（hp/powerは既存フィールドを流用）
    },
    onDraw(player) {
      // アイテムカード「湧き水の加護」「氷解の記憶」で回復量/パワー獲得量を底上げできる
      const healBase = 3 + (player.itemWaterHealBonus || 0);
      const powerBase = 1 + (player.itemWaterPowerBonus || 0);
      const healAmount = Math.min(healBase, player.maxHp - player.hp);
      player.hp = Math.min(player.hp + healBase, player.maxHp);
      player.power = Math.min(player.power + powerBase, player.maxPower);
      return { heal: healAmount }; // UIのポップアップ表示に使う
    },
    getBaseDamage(hand, usedPower) {
      if (hand === 0 && usedPower) return 6; // グー(パワー消費時)は固定6ダメージ
      return null;
    },
    getStatus(player) {
      return [
        { label: "あいこ時の恩恵", value: "HP+3 / パワー+1" }
      ];
    }
  },

  wind: {
    name: "風",
    init(player) {
      player.windSpeed = 0;
      player.windLastHand = null;
    },
    onHandPlayed(player, hand) {
      if (player.windSpeed === 3) {
        player.windSpeed = 0;
      } else if (player.windLastHand !== null) {
        if (hand === player.windLastHand) {
          player.windSpeed = Math.max(0, player.windSpeed - 1);
        } else {
          player.windSpeed = Math.min(player.windSpeed + 1, 3);
        }
      }
      player.windLastHand = hand;
    },
    onWin(player, hand, usedPower) {
      if (hand === 0 && usedPower) {
        player.windSpeed = Math.min(player.windSpeed + 2, 3);
      }
    },
    getStatus(player) {
      return [
        { label: "風速", value: `${player.windSpeed} / 3` }
      ];
    }
  },

  fighter: {
    name: "格闘家",
    init(player) {
      // 追加の状態は持たない（hp/powerは既存フィールドを流用）
    },
    // グーのパワー消費量（通常は2）。アイテムカード「拳聖の証」でさらに-1できる(最低0)
    powerCost(state) {
      return Math.max(0, 1 - (state.itemFighterPowerCostReduction || 0));
    },
    paperGain: 2,   // パーで得るパワー量（通常は1）
    getBaseDamage(hand, usedPower, attackerState) {
      // チョキは固定5ダメージ(アイテムカード「乱打の心得」で底上げ可能)
      if (hand === 2) return 5 + (attackerState.itemFighterScissorsBonus || 0);
      return null; // グー・パーは通常計算に任せる
    },
    getStatus(player) {
      return [
        { label: "グー消費パワー", value: `${Math.max(0, 1 - (player.itemFighterPowerCostReduction || 0))}` },
        { label: "パー獲得パワー", value: "+2" }
      ];
    }
  },

  poison: {
    name: "毒",
    init(player) {
      player.poisonDamage = 0;
      player.poisonTurnsLeft = 0;
    },
    onWin(player, hand, usedPower, damage, defenderState) {
      applyPoison(defenderState);
      // アイテムカード「猛毒の秘薬」「延命の毒草」で初期ダメージ/持続ターンを底上げできる
      if (player.itemPoisonInitialBonus) {
        defenderState.poisonDamage += player.itemPoisonInitialBonus;
      }
      if (player.itemPoisonDurationBonus) {
        defenderState.poisonTurnsLeft += player.itemPoisonDurationBonus;
      }
    },
    getStatus(player) {
      return [
        { label: "毒付与", value: "1ダメージ/3ターン(重複で+1)" }
      ];
    }
  },

  vampire: {
    name: "吸血",
    init(player) {
      // 追加の状態は持たない（hp/powerは既存フィールドを流用）
    },
    getBaseDamage(hand, usedPower, attackerState) {
      // グー(パワー消費時)は固定5ダメージ(アイテムカード「牙の刻印」で底上げ可能)
      if (hand === 0 && usedPower) return 5 + (attackerState.itemVampireRockBonus || 0);
      return null;
    },
    onWin(player, hand, usedPower, damage) {
      // アイテムカード「深紅の渇き」で回復率(通常50%)を底上げできる
      const healRate = 0.5 + (player.itemVampireHealRateBonus || 0);
      const healAmount = Math.floor(damage * healRate);
      const actualHeal = Math.min(healAmount, player.maxHp - player.hp);
      player.hp = Math.min(player.hp + healAmount, player.maxHp);
      return actualHeal; // 実際に回復した量を返し、UIのポップアップ表示に使う
    },
    getStatus(player) {
      return [
        { label: "吸血", value: "与ダメージの50%を回復" }
      ];
    }
  },

  doppel: {
    name: "ドッペルゲンガー",
    init(player) {
      player.doppelDrawCount = 0;
    },
    onDraw(player, opponent) {
      player.doppelDrawCount++;
      // アイテムカード「鏡合わせの誓い」で強化閾値(通常7回)を短縮できる
      const threshold = player.itemDoppelThreshold || 7;
      const dmg = player.doppelDrawCount >= threshold ? 5 : 3;
      opponent.hp = Math.max(0, opponent.hp - dmg);
      return { damage: dmg }; // UIのポップアップ表示に使う
    },
    getBaseDamage(hand, usedPower, attackerState) {
      // 勝利時のダメージは手の種類に関わらず一律2固定(アイテムカード「虚像の刃」で底上げ可能)
      return 2 + (attackerState.itemDoppelWinBonus || 0);
    },
    getStatus(player) {
      const threshold = player.itemDoppelThreshold || 7;
      return [
        { label: "あいこ回数", value: `${player.doppelDrawCount}` },
        { label: "あいこ反撃ダメージ", value: player.doppelDrawCount >= threshold ? "5" : "3" }
      ];
    }
  },

  curse: {
    name: "呪術",
    init(player) {
      // 呪いスタック(curseStacks)は呪われた側に付与される汎用フィールドなので、
      // 呪術属性自身は特別な初期状態を持たない
    },
    onPowerUse(player, opponent) {
      // グーが当たったかどうかに関わらず、パワーを消費した時点で相手に呪いを付与する
      // (アイテムカード「呪詛の増幅」で付与量(通常+1)を底上げできる)
      const stackAmount = 1 + (player.itemCurseStackBonus || 0);
      opponent.curseStacks = (opponent.curseStacks || 0) + stackAmount;
    },
    getStatus(player) {
      return [
        { label: "呪い付与条件", value: "パワー消費で相手に+1スタック" }
      ];
    }
  },

  cannon: {
    name: "砲台",
    init(player) {
      // 追加の状態は持たない（hp/powerは既存フィールドを流用）
    },
    powerCost(state) {
      return state.power; // 現在パワーを全消費
    },
    onHpChange(player) {
      // 被ダメージ時にパワーが溜まる(アイテムカード「増加装甲」で獲得量(通常+5)を底上げできる)
      const gain = 5 + (player.itemCannonGainBonus || 0);
      player.power = Math.min(player.power + gain, player.maxPower);
    },
    getBaseDamage(hand, usedPower, attackerState, powerCost) {
      if (hand === 0 && usedPower) return powerCost * 2; // 消費量×2ダメージ
      return null;
    },
    getStatus(player) {
      return [
        { label: "被弾時パワー獲得", value: "+5" },
        { label: "グー消費量", value: "現在パワー全て" }
      ];
    }
  },

  gambler: {
    name: "ギャンブラー",
    init(player) {
      player.gamblerKakuhenTurns = 0;
    },
    // 確変中はパワー0でも攻撃可能。それ以外は通常通りパワーが1以上必要
    canUsePower(state, cost) {
      return state.gamblerKakuhenTurns > 0 || state.power > 0;
    },
    // 確変中はパワー消費0。それ以外は所持パワーを全消費
    powerCost(state) {
      return state.gamblerKakuhenTurns > 0 ? 0 : state.power;
    },
    getBaseDamage(hand, usedPower, attackerState, powerCost) {
      if (hand !== 0 || !usedPower) return null;
      // 確変中は消費量に関わらず最強の式(3d5+5)固定、それ以外は消費量に応じたダイス
      const stacks = attackerState.gamblerKakuhenTurns > 0 ? 3 : powerCost;
      return rollGamblerDamage(stacks, attackerState);
    },
    onPowerUse(player) {
      // アイテムカード「イカサマの札」「大博打の記憶」で発生率(通常25%)/持続ターン(通常4)を底上げできる
      const rate = 0.25 + (player.itemGamblerRateBonus || 0);
      const duration = 4 + (player.itemGamblerDurationBonus || 0);
      if (battleRandomImpl(player) < rate) {
        player.gamblerKakuhenTurns = (player.gamblerKakuhenTurns || 0) + duration;
      }
    },
    getStatus(player) {
      return [
        {
          label: "確変",
          value: player.gamblerKakuhenTurns > 0 ? `ON（残り${player.gamblerKakuhenTurns}ターン）` : "OFF"
        }
      ];
    }
  },

  magician: {
    name: "マジシャン",
    init(player) {
      player.magicianAtkBonus = 0;
      player.magicianDefBonus = 0;
    },
    onPowerUse(player) {
      // パワー消費のたびに3つの効果からランダムに1つ発動
      // アイテムカード「幸運のコイン」を持つ場合はHP回復を抽選から除外し、攻撃力/防御力の2択にする
      const excludeHeal = player.itemMagicianExcludeHeal;
      const roll = Math.floor(battleRandomImpl(player) * (excludeHeal ? 2 : 3));
      if (roll === 0) {
        player.magicianAtkBonus++; // 永続攻撃力+1（上限なし）
      } else if (roll === 1) {
        player.magicianDefBonus = Math.min(player.magicianDefBonus + 1, 3); // 永続防御力+1（上限3）
      } else {
        // アイテムカード「奇術師の手袋」で回復量(通常4)を底上げできる
        const healBase = 4 + (player.itemMagicianHealBonus || 0);
        const healAmount = Math.min(healBase, player.maxHp - player.hp);
        player.hp = Math.min(player.hp + healBase, player.maxHp);
        return { heal: healAmount }; // UIのポップアップ表示に使う
      }
    },
    getStatus(player) {
      return [
        { label: "永続攻撃力", value: `+${player.magicianAtkBonus}` },
        { label: "永続防御力", value: `+${player.magicianDefBonus} / 3` }
      ];
    }
  },

  berserker: {
    name: "バーサーカー",
    init(player) {
      // 追加の状態は持たない（hp/powerは既存フィールドを流用）
    },
    onTurnEnd(player) {
      // アイテムカード「狂戦士の心得」で毎ターン自傷(通常5)を軽減できる(最低1)
      const selfDmg = Math.max(1, 5 - (player.itemBerserkerSelfDmgReduction || 0));
      const dealt = Math.min(selfDmg, player.hp);
      player.hp = Math.max(0, player.hp - selfDmg); // 毎ターン自傷
      return dealt; // UIのポップアップ表示に使う
    },
    getBaseDamage(hand, usedPower, attackerState) {
      let dmg = 6 + (attackerState.itemBerserkerDmgBonus || 0); // どの手でも固定ダメージ(アイテムカード「怒濤の一撃」で底上げ可能)
      if (hand === 0 && usedPower) dmg += 3; // パワー消費したグーはさらに+3
      return dmg;
    },
    getStatus(player) {
      return [
        { label: "毎ターンHP減少", value: "-5" },
        { label: "固定ダメージ", value: "6（パワー消費グーは+3）" }
      ];
    }
  }
};

// 毒(DOT)の状態を防御側に付与/更新する。既に毒が残っている場合はダメージ+1・継続ターン数を3にリセットする
export function applyPoison(defenderState) {
  defenderState.poisonDamage = defenderState.poisonTurnsLeft > 0
    ? (defenderState.poisonDamage || 0) + 1
    : 1;
  defenderState.poisonTurnsLeft = 3;
}

// 毒のDOTを1ターン分ティックする（毎ターン両者に対して呼ぶ）
export function tickPoison(state) {
  if (!state.poisonTurnsLeft) return 0;
  const dealt = Math.min(state.poisonDamage, state.hp);
  state.hp = Math.max(0, state.hp - state.poisonDamage);
  state.poisonTurnsLeft--;
  if (state.poisonTurnsLeft <= 0) {
    state.poisonDamage = 0;
  }
  return dealt; // 実際に削れたHP量を返し、UIのポップアップ表示に使う
}

// ギャンブラーの確変（パワー消費なしの4ターン）の残りターンを1ターン分減らす
export function tickGamblerKakuhen(state) {
  if (state.gamblerKakuhenTurns > 0) {
    state.gamblerKakuhenTurns--;
  }
}
