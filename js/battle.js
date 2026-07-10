// ===== 戦闘エンジン(1ターンの勝敗判定・ダメージ計算・属性フック呼び出し) =====
// main.jsから切り出したモジュール。DOM操作・main.js側のUI関数(結果演出・BGM・画面遷移等)は
// 一切直接呼ばず、setBattleCallbacks()で注入されたものだけを使う(attributes.js/save-data.jsと同じDIパターン)。
// playerState/cpuState/playerAttribute/cpuAttributeもmain.js側のグローバルをimportするのではなく、
// battleTurn()の引数として毎回渡してもらう(循環importを避けるため)。
import { ATTR_LOGIC, calcDamage, getPowerCost, canUsePower, tickPoison, tickGamblerKakuhen, applyPoison } from "./attributes.js";
import { updateQuestProgress } from "./quests.js";
import { getStatByPath, incrementStat } from "./save-data.js";

// 1戦闘中のピーク値をクエスト進捗に使うカウンタ。戦闘開始のたびにresetBattleCounters()でリセットする
let freezeCountThisBattle = 0;
let waterHealCountThisBattle = 0;
let fighterScissorsWinCountThisBattle = 0;
let berserkerDamageThisBattle = 0;

export function resetBattleCounters() {
  freezeCountThisBattle = 0;
  waterHealCountThisBattle = 0;
  fighterScissorsWinCountThisBattle = 0;
  berserkerDamageThisBattle = 0;
}

// main.js側のUI関数・DOM操作をここに注入してもらう(未注入の項目はno-op)
let callbacks = {
  hideDarkOverlay: () => {},
  renderPlayerHand: () => {},
  renderCpuHand: () => {},
  setResultText: () => {},
  showBigResultText: () => {},
  showDamageNumber: () => {},
  onRoundResult: () => {},
  playCpuDamageEffect: () => {},
  playBigImpactEffect: () => {},
  playDamageEffect: () => {},
  handleCpuDefeated: () => {},
  handlePlayerDefeated: () => {},
  updateBattleUI: () => {},
  setupPlayerStatusWindow: () => {},
  setupCpuStatusWindow: () => {},
  endJankenScene: () => {}
};

export function setBattleCallbacks(overrides) {
  callbacks = { ...callbacks, ...overrides };
}

function battleTurn(playerHand, cpuHand, playerState, cpuState, playerAttribute, cpuAttribute) {
  console.log("playerHand:", playerHand, "cpuHand:", cpuHand, "result:", (playerHand - cpuHand + 3) % 3);

  // 「ぽん！」と同時に暗転(darkOverlay)を解除し、HPバーの変化がすぐ見えるようにする。
  // これまでは800ms後のendJankenScene()まで暗転が残り、HP更新が遅れて見えていた。
  // じゃんけんの手札カード演出自体(jankenScene)は従来どおりendJankenScene()で片付ける。
  callbacks.hideDarkOverlay();

  // ★ ターン開始時のチャージを記録
  const playerChargeAtStart = playerState.thunderCharge;
  const cpuChargeAtStart = cpuState.thunderCharge;

  // 手の名前
  const handName = ["グー", "パー", "チョキ"];

  // 手を出した回数のクエスト用トラッキング(グー/パー/チョキ)
  incrementStat(`handUseCount.${["rock", "paper", "scissors"][playerHand]}`);

  // プレイヤー・CPUの手表示
  callbacks.renderPlayerHand(playerHand);
  callbacks.renderCpuHand(cpuHand);

  // 手を出すたびに発火する属性フック（風の風速計算などに使用）
  if (ATTR_LOGIC[playerAttribute].onHandPlayed) {
    ATTR_LOGIC[playerAttribute].onHandPlayed(playerState, playerHand);
  }
  if (ATTR_LOGIC[cpuAttribute].onHandPlayed) {
    ATTR_LOGIC[cpuAttribute].onHandPlayed(cpuState, cpuHand);
  }

  // ▼ アイテムカードは常にプレイヤー側のみに適用される(敵はカードを取得しない)ため、
  // 以降の`item*`系フィールドのチェックはplayerState側にのみ書く。
  // 「疾風の靴」：直前と違う手を出すたびにパワー+1(枚数分スタックする)
  if (playerState.itemPowerOnHandChangeStacks) {
    if (playerState.itemLastHandForBoots !== null && playerState.itemLastHandForBoots !== undefined && playerState.itemLastHandForBoots !== playerHand) {
      playerState.power = Math.min(playerState.power + playerState.itemPowerOnHandChangeStacks, playerState.maxPower);
    }
    playerState.itemLastHandForBoots = playerHand;
  }

  // 「疾風怒濤」クエスト：風属性の風速(0〜3)のピーク値
  if (playerAttribute === "wind") {
    updateQuestProgress("windGust", playerState.windSpeed);
  }

  // 呪いを受けている側がパーを出すと、呪いスタック数分のダメージ（付与した側の属性に関わらず発動）
  if (playerHand === 1 && playerState.curseStacks > 0) {
    playerState.hp = Math.max(0, playerState.hp - playerState.curseStacks);
    callbacks.showDamageNumber("player", playerState.curseStacks);
  }
  // 「古き呪いの書」：プレイヤーがこのカードを持ち、相手の呪いスタックが閾値以上ならパー限定を解除する
  const cpuCurseAnyHand = playerState.itemCurseAnyHandThreshold && cpuState.curseStacks >= playerState.itemCurseAnyHandThreshold;
  if ((cpuHand === 1 || cpuCurseAnyHand) && cpuState.curseStacks > 0) {
    cpuState.hp = Math.max(0, cpuState.hp - cpuState.curseStacks);
    callbacks.showDamageNumber("cpu", cpuState.curseStacks);
  }

  // ▼ パーならパワー+1（最大値でストップ）
  // 相手が氷属性で凍結準備(freezeReady)中なら、パワー上昇を無効化して凍結を消費する
  let playerPowerFrozen = false;
  let cpuPowerFrozen = false;

  // freezeReadyは元々「氷属性onWinのみが立てるフラグ」だったが、アイテムカード「凍える吐息」が
  // 属性を問わず同じフラグを立てられるようにしたため、attribute==="ice"のゲートは外し
  // フラグの有無だけで判定する(freezeReadyを立てる経路がice.onWinとこのカードの2つになった)。
  if (playerHand === 1) {
    if (cpuState.freezeReady) {
      playerPowerFrozen = true;
      cpuState.freezeReady = false;
    } else {
      const paperGain = (ATTR_LOGIC[playerAttribute].paperGain || 1) + (playerState.itemPaperGainBonus || 0);
      const playerNewPower = playerState.power + paperGain;
      // 「貯蓄の心得」：パワー上限を超えた分をHP回復に変換する。
      // 超過分は「パーで+1のところ上限で頭打ち」のケースがほとんどで常に1になりがちなため、
      // %刻みの変換効率(切り捨てで2枚目が無駄になっていた)ではなく、
      // 「超過分×所持枚数」がそのまま回復量になる方式にして、1枚ごとに必ず効果が伸びるようにする
      if (playerState.itemOverflowPowerToHealStacks && playerNewPower > playerState.maxPower) {
        const overflow = playerNewPower - playerState.maxPower;
        const healAmount = overflow * playerState.itemOverflowPowerToHealStacks;
        const healed = Math.min(healAmount, playerState.maxHp - playerState.hp);
        playerState.hp = Math.min(playerState.hp + healAmount, playerState.maxHp);
        if (healed > 0) callbacks.showDamageNumber("player", healed, { heal: true });
      }
      playerState.power = Math.min(playerNewPower, playerState.maxPower);
    }
  }
  if (cpuHand === 1) {
    if (playerState.freezeReady) {
      cpuPowerFrozen = true;
      playerState.freezeReady = false;
      // 「氷結の残響」：チャージが残っていれば凍結を立て直し、次のパー獲得も無効化する
      if (playerState.iceEchoCharges > 0) {
        playerState.iceEchoCharges--;
        playerState.freezeReady = true;
      }
    } else {
      const cpuPaperGain = (ATTR_LOGIC[cpuAttribute].paperGain || 1) + (cpuState.itemPaperGainBonus || 0);
      cpuState.power = Math.min(cpuState.power + cpuPaperGain, cpuState.maxPower);
    }
  }

  // 「永久凍土」クエスト：自分(氷属性)がCPUを凍結させた回数(1戦闘内の最大値)
  if (cpuPowerFrozen) {
    freezeCountThisBattle++;
    updateQuestProgress("permafrost", freezeCountThisBattle);
    incrementStat("freezeCount"); // 通算の凍結回数クエスト用
  }

  // ▼ グーでパワー消費できるか判定（消費量は属性ごとにATTR_LOGIC[attr].powerCostで上書き可能、未指定なら2。固定値でも現在パワーに応じた関数でもよい）
  let playerUsedPower = false;
  let cpuUsedPower = false;

  let playerPowerCost = getPowerCost(playerAttribute, playerState);
  const cpuPowerCost = getPowerCost(cpuAttribute, cpuState);

  // 「賭け金の証」：直前の敗北で予約されていれば、今回のグーのパワー消費コストを0にする(1回限り)
  let playerFreeCostActive = false;
  if (playerHand === 0 && playerState.itemFreeCostPending) {
    playerFreeCostActive = true;
    playerPowerCost = 0;
    playerState.itemFreeCostPending = false;
  }

  // 判定はcanUsePower()に集約（ギャンブラーの確変中などデフォルト条件と異なる属性はここで上書きされる）
  if (playerHand === 0 && (playerFreeCostActive || canUsePower(playerAttribute, playerState, playerPowerCost))) playerUsedPower = true;
  if (cpuHand === 0 && canUsePower(cpuAttribute, cpuState, cpuPowerCost)) cpuUsedPower = true;

  // ▼ 勝敗判定
  const result = (playerHand - cpuHand + 3) % 3;

  // 勝敗が決まった瞬間に画面中央へ大きくWIN!/LOSE!/DRAW!を出す
  callbacks.showBigResultText(result === 1 ? "win" : result === 2 ? "lose" : "draw");

  if (result === 1) {
    let damage = calcDamage(
      playerState,
      cpuState,
      playerHand,
      cpuHand,
      playerAttribute,
      playerUsedPower,
      cpuAttribute,
      playerPowerCost
    );

     if (playerAttribute === "thunder" && playerChargeAtStart === (playerState.thunderChargeMax || 5)) {
      playerState.thunderCharge = 3;
  }

     if (cpuAttribute === "thunder" && cpuChargeAtStart === (cpuState.thunderChargeMax || 5)) {
      cpuState.thunderCharge = 3;
  }

    // 「影のささやき」：確率発動だと「発動していない感」が強いとの指摘を受け、
    // 勝利のたびにカウントし一定間隔で確定発動する周期制に変更(2026-07-10)
    if (playerState.itemShadowCycleLength) {
      playerState.itemShadowWinCounter = (playerState.itemShadowWinCounter || 0) + 1;
      if (playerState.itemShadowWinCounter >= playerState.itemShadowCycleLength) {
        playerState.itemShadowWinCounter = 0;
        damage += (playerState.itemShadowDmgBonus || 2);
      }
    }

    cpuState.hp -= damage;

    // 「捨て身の一撃」：グーでのボーナスダメージを得た代償に、与ダメージの半分を自分も被弾する
    if (playerHand === 0 && playerState.itemRockAtkBonus) {
      const recoil = Math.floor(damage / 2);
      playerState.hp = Math.max(0, playerState.hp - recoil);
      if (recoil > 0) callbacks.showDamageNumber("player", recoil);
    }

    // 「小瓶の毒」：勝利時に相手へ毒スタックを追加する(枚数分applyPoison()を繰り返す)
    if (playerState.itemPoisonOnWinStacks) {
      for (let i = 0; i < playerState.itemPoisonOnWinStacks; i++) {
        applyPoison(cpuState);
      }
    }

    // 「凍える吐息」：影のささやきと同じ理由で確率発動をやめ、勝利N回ごとの確定発動にした(氷のfreezeReadyを流用)
    if (playerState.itemFreezeCycleLength) {
      playerState.itemFreezeWinCounter = (playerState.itemFreezeWinCounter || 0) + 1;
      if (playerState.itemFreezeWinCounter >= playerState.itemFreezeCycleLength) {
        playerState.itemFreezeWinCounter = 0;
        playerState.freezeReady = true;
      }
    }

    if (ATTR_LOGIC[cpuAttribute].onHpChange) {
      ATTR_LOGIC[cpuAttribute].onHpChange(cpuState);
    }

    if (ATTR_LOGIC[playerAttribute].onWin) {
      const playerHeal = ATTR_LOGIC[playerAttribute].onWin(playerState, playerHand, playerUsedPower, damage, cpuState);
      if (playerHeal) callbacks.showDamageNumber("player", playerHeal, { heal: true });

      // 「血の匂い」クエスト：吸血属性の1回の回復量のピーク値
      if (playerAttribute === "vampire" && playerHeal) {
        updateQuestProgress("vampireThirst", playerHeal);
      }
    }

    // 「雷騰雲奔」クエスト：雷属性での一撃ダメージ
    if (playerAttribute === "thunder") {
      updateQuestProgress("thunderBolt", damage);
    }

    // 属性ごとの固有クエスト(1戦闘内のピーク値方式)
    if (playerAttribute === "poison") {
      updateQuestProgress("poisonQueen", cpuState.poisonDamage);
    }
    if (playerAttribute === "fighter" && playerHand === 2) {
      fighterScissorsWinCountThisBattle++;
      updateQuestProgress("fighterBlade", fighterScissorsWinCountThisBattle);
    }
    if (playerAttribute === "cannon") {
      updateQuestProgress("cannonBlast", damage);
    }
    if (playerAttribute === "gambler") {
      updateQuestProgress("gamblerJackpot", damage);
    }
    if (playerAttribute === "berserker") {
      berserkerDamageThisBattle += damage;
      updateQuestProgress("berserkerRampage", berserkerDamageThisBattle);
    }

    // 属性別・通算系の統計クエスト用トラッキング(勝利数・与ダメージ・高火力ヒット)
    if (getStatByPath(`winsByAttribute.${playerAttribute}`) === 0) {
      incrementStat("attributesWonCount");
    }
    incrementStat(`winsByAttribute.${playerAttribute}`);
    incrementStat(`damageByAttribute.${playerAttribute}`, damage);
    incrementStat("totalDamageDealt", damage);
    if (damage >= 10) incrementStat("highDamageHits");
    if (playerAttribute === "poison") incrementStat("poisonApplyCount");

    // プロフィール画面用：じゃんけん1回ごとの勝敗・手ごとの勝率トラッキング
    incrementStat("roundWinCount");
    incrementStat(`handWinCount.${["rock", "paper", "scissors"][playerHand]}`);
    callbacks.onRoundResult("win");

    // 「連勝の証」：勝つたびに連勝ボーナスを積み増す(この勝利自体のダメージには乗らず、次以降に反映される)
    if (playerState.itemWinStreakBonusPerWin) {
      playerState.itemWinStreakCount = (playerState.itemWinStreakCount || 0) + playerState.itemWinStreakBonusPerWin;
    }

    callbacks.playCpuDamageEffect(damage);

    // 10ダメージ以上を与えた瞬間は、通常の演出に加えてさらに派手なフラッシュ・シェイク・SEを重ねる
    if (damage >= 10) {
      callbacks.playBigImpactEffect();
    }

    if (cpuState.hp <= 0) {
      callbacks.handleCpuDefeated();
      return;
    }

    callbacks.setResultText(
      `勝ち！ CPUに${damage}ダメージ！` +
      (cpuPowerFrozen ? "（CPUは氷で凍結され、パワー上昇が無効化された）" : "")
    );

  } else if (result === 2) {

    let cpudamage = calcDamage(
      cpuState,
      playerState,
      cpuHand,
      playerHand,
      cpuAttribute,
      cpuUsedPower,
      playerAttribute,
      cpuPowerCost
    );

     if (cpuAttribute === "thunder" && cpuChargeAtStart === (cpuState.thunderChargeMax || 5)) {
      cpuState.thunderCharge = 3;
  }
     if (playerAttribute === "thunder" && playerChargeAtStart === (playerState.thunderChargeMax || 5)) {
      playerState.thunderCharge = 3;
  }

    playerState.hp -= cpudamage;

    // 「棘の鎧」：受けたダメージの一定割合を相手に反射する
    if (playerState.itemThornReflectRate) {
      const reflected = Math.floor(cpudamage * playerState.itemThornReflectRate);
      if (reflected > 0) {
        cpuState.hp = Math.max(0, cpuState.hp - reflected);
        callbacks.showDamageNumber("cpu", reflected);
      }
    }

    // 「連勝の証」：敗北で連勝ボーナスがリセットされる
    if (playerState.itemWinStreakBonusPerWin) {
      playerState.itemWinStreakCount = 0;
    }

    if (ATTR_LOGIC[playerAttribute].onHpChange) {
      ATTR_LOGIC[playerAttribute].onHpChange(playerState);
    }

    if (ATTR_LOGIC[cpuAttribute].onWin) {
      const cpuHeal = ATTR_LOGIC[cpuAttribute].onWin(cpuState, cpuHand, cpuUsedPower, cpudamage, playerState);
      if (cpuHeal) callbacks.showDamageNumber("cpu", cpuHeal, { heal: true });
    }

    incrementStat("totalDamageTaken", cpudamage);
    incrementStat("roundLossCount");
    callbacks.onRoundResult("loss");

    // 「賭け金の証」：敗北した次の1回、グーのパワー消費コストが無料になる予約を立てる(枚数分プールを1つ消費)
    if (playerState.itemFreeCostCharges > 0) {
      playerState.itemFreeCostPending = true;
      playerState.itemFreeCostCharges--;
    }

    callbacks.playDamageEffect(cpudamage);

    // 「不屈の護石」：致死ダメージをHP1で耐える(枚数分プールを1つ消費)
    if (playerState.hp <= 0 && playerState.itemSurviveCharges > 0) {
      playerState.itemSurviveCharges--;
      playerState.hp = 1;
      callbacks.showDamageNumber("player", 1, { heal: true });
    }

    if (playerState.hp <= 0) {
      callbacks.handlePlayerDefeated();
      return;
    }

    callbacks.setResultText(
      `負け… あなたに${cpudamage}ダメージ` +
      (playerPowerFrozen ? "（あなたは氷で凍結され、パワー上昇が無効化された）" : "")
    );



  } else {
    incrementStat("drawCount");
    callbacks.onRoundResult("draw");

    // 「連勝の証」：あいこでも連勝ボーナスがリセットされる
    if (playerState.itemWinStreakBonusPerWin) {
      playerState.itemWinStreakCount = 0;
    }

    let drawNote = "";
    if (playerPowerFrozen) drawNote += "（あなたは氷で凍結され、パワー上昇が無効化された）";
    if (cpuPowerFrozen) drawNote += "（CPUは氷で凍結され、パワー上昇が無効化された）";
    callbacks.setResultText("あいこ" + drawNote);

    // あいこ時に発火する属性フック（水のHP回復/パワー増加、ドッペルゲンガーの反撃ダメージなど）
    // 戻り値は { damage: 相手へのダメージ } か { heal: 自分の回復量 } のどちらか
    if (ATTR_LOGIC[playerAttribute].onDraw) {
      const result = ATTR_LOGIC[playerAttribute].onDraw(playerState, cpuState);
      if (result && result.damage) callbacks.showDamageNumber("cpu", result.damage);
      if (result && result.heal) callbacks.showDamageNumber("player", result.heal, { heal: true });

      // 「泉の恵み」クエスト：水属性が1戦闘中にあいこで回復した回数
      if (playerAttribute === "water" && result && result.heal) {
        waterHealCountThisBattle++;
        updateQuestProgress("waterBlessing", waterHealCountThisBattle);
      }
      // 「鏡合わせの狂気」クエスト：ドッペルゲンガー属性のあいこ回数のピーク値
      if (playerAttribute === "doppel") {
        updateQuestProgress("doppelMadness", playerState.doppelDrawCount);
      }
    }
    if (ATTR_LOGIC[cpuAttribute].onDraw) {
      const result = ATTR_LOGIC[cpuAttribute].onDraw(cpuState, playerState);
      if (result && result.damage) callbacks.showDamageNumber("player", result.damage);
      if (result && result.heal) callbacks.showDamageNumber("cpu", result.heal, { heal: true });
    }

    // 「老練の心得」：あいこ時パワー+1(枚数分スタックする)
    if (playerState.itemPowerOnDrawStacks) {
      playerState.power = Math.min(playerState.power + playerState.itemPowerOnDrawStacks, playerState.maxPower);
    }

    // 「蜘蛛の糸」：あいこの時、相手のパワーを1奪う(枚数分スタックする)
    if (playerState.itemPowerStealOnDrawStacks && cpuState.power > 0) {
      const stolen = Math.min(playerState.itemPowerStealOnDrawStacks, cpuState.power);
      cpuState.power = Math.max(0, cpuState.power - stolen);
      playerState.power = Math.min(playerState.power + stolen, playerState.maxPower);
    }

    if (playerAttribute === "thunder" && playerChargeAtStart === (playerState.thunderChargeMax || 5)) {
    playerState.thunderCharge = 3;
}
if (cpuAttribute === "thunder" && cpuChargeAtStart === (cpuState.thunderChargeMax || 5)) {
    cpuState.thunderCharge = 3;
}


  }

  // ▼ 毒のDOT処理（このターンの勝敗に関わらず、毎ターン両者に対して発動）
  const playerPoisonDmg = tickPoison(playerState);
  const cpuPoisonDmg = tickPoison(cpuState);
  if (playerPoisonDmg) callbacks.showDamageNumber("player", playerPoisonDmg);
  if (cpuPoisonDmg) callbacks.showDamageNumber("cpu", cpuPoisonDmg);

  // ▼ ギャンブラーの確変ターン経過（このターンの勝敗に関わらず、毎ターン両者に対して発動）
  tickGamblerKakuhen(playerState);
  tickGamblerKakuhen(cpuState);

  // 「巡礼の杖」：勝敗に関わらず3ターンごとにHPが回復する(回復量は枚数分スタックする)
  if (playerState.itemPilgrimStaffStacks) {
    playerState.itemPilgrimStaffTurns = (playerState.itemPilgrimStaffTurns || 0) + 1;
    if (playerState.itemPilgrimStaffTurns >= 3) {
      playerState.itemPilgrimStaffTurns = 0;
      const healAmount = 2 * playerState.itemPilgrimStaffStacks;
      const healed = Math.min(healAmount, playerState.maxHp - playerState.hp);
      playerState.hp = Math.min(playerState.hp + healAmount, playerState.maxHp);
      if (healed > 0) callbacks.showDamageNumber("player", healed, { heal: true });
    }
  }

  // ▼ 属性固有の毎ターン処理（バーサーカーの自傷など、このターンの勝敗に関わらず発動）
  if (ATTR_LOGIC[playerAttribute].onTurnEnd) {
    const playerTurnEndDmg = ATTR_LOGIC[playerAttribute].onTurnEnd(playerState);
    if (playerTurnEndDmg) callbacks.showDamageNumber("player", playerTurnEndDmg);
  }
  if (ATTR_LOGIC[cpuAttribute].onTurnEnd) {
    const cpuTurnEndDmg = ATTR_LOGIC[cpuAttribute].onTurnEnd(cpuState);
    if (cpuTurnEndDmg) callbacks.showDamageNumber("cpu", cpuTurnEndDmg);
  }

  // ▼ 毒のDOTやあいこ時の反撃（ドッペルゲンガー等）、バーサーカーの自傷でHPが0以下になっていないか確認
  if (cpuState.hp <= 0) {
    callbacks.handleCpuDefeated();
    return;
  }
  // 「不屈の護石」：毒やバーサーカーの自傷等、勝敗以外の経路での致死もHP1で耐える(枚数分プールを1つ消費)
  if (playerState.hp <= 0 && playerState.itemSurviveCharges > 0) {
    playerState.itemSurviveCharges--;
    playerState.hp = 1;
    callbacks.showDamageNumber("player", 1, { heal: true });
  }
  if (playerState.hp <= 0) {
    callbacks.handlePlayerDefeated();
    return;
  }

  // ▼ パワー消費
  if (playerUsedPower) playerState.power -= playerPowerCost;
  if (cpuUsedPower) cpuState.power -= cpuPowerCost;

  // 「呪いの人形」：属性に関わらず、パワー消費のたびに相手へ呪いを付与する(付与量は枚数分スタックする)
  // (ATTR_LOGIC[attr].onPowerUseが無い属性でも発動するよう、専用の分岐にしている)
  if (playerUsedPower && playerState.itemCurseOnPowerUseStacks) {
    cpuState.curseStacks = (cpuState.curseStacks || 0) + playerState.itemCurseOnPowerUseStacks;
  }

  // ▼ チャージ増加（ターン終了時）
  if (playerUsedPower && ATTR_LOGIC[playerAttribute].onPowerUse) {
    const playerPowerUseResult = ATTR_LOGIC[playerAttribute].onPowerUse(playerState, cpuState);
    if (playerPowerUseResult && playerPowerUseResult.heal) {
      callbacks.showDamageNumber("player", playerPowerUseResult.heal, { heal: true });
    }

    // 「爆炎」クエスト：炎属性の攻撃力上昇
    if (playerAttribute === "fire") {
      updateQuestProgress("fireBurst", playerState.fireAtkBonus);
    }

    // 呪術：パワー消費のたびに相手へ呪いを付与するため、通算の付与回数クエスト用にカウント
    if (playerAttribute === "curse") {
      incrementStat("curseApplyCount");
      // 「呪いの深淵」クエスト：相手の呪いスタックのピーク値
      updateQuestProgress("curseAbyss", cpuState.curseStacks);
    }

    // 「岩盤の守り」クエスト：石属性が1戦闘中にパワーを消費した回数のピーク値
    if (playerAttribute === "stone") {
      updateQuestProgress("stoneGuard", playerState.stoneUseCount);
    }

    // 「大魔導の極意」クエスト：マジシャン属性の永続攻撃力上昇のピーク値
    if (playerAttribute === "magician") {
      updateQuestProgress("magicianMastery", playerState.magicianAtkBonus);
    }
  }
  if (cpuUsedPower && ATTR_LOGIC[cpuAttribute].onPowerUse) {
    const cpuPowerUseResult = ATTR_LOGIC[cpuAttribute].onPowerUse(cpuState, playerState);
    if (cpuPowerUseResult && cpuPowerUseResult.heal) {
      callbacks.showDamageNumber("cpu", cpuPowerUseResult.heal, { heal: true });
    }
  }

  // ▼ UI更新
  callbacks.updateBattleUI();
  callbacks.setupPlayerStatusWindow();
  callbacks.setupCpuStatusWindow();

  // ▼ ターン終了処理
  setTimeout(() => {
    callbacks.endJankenScene();
  }, 800);
}

export { battleTurn };
