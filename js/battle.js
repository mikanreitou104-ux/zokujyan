// ===== 戦闘エンジン(1ターンの勝敗判定・ダメージ計算・属性フック呼び出し) =====
// main.jsから切り出したモジュール。DOM操作・main.js側のUI関数(結果演出・BGM・画面遷移等)は
// 一切直接呼ばず、setBattleCallbacks()で注入されたものだけを使う(attributes.js/save-data.jsと同じDIパターン)。
// playerState/cpuState/playerAttribute/cpuAttributeもmain.js側のグローバルをimportするのではなく、
// battleTurn()の引数として毎回渡してもらう(循環importを避けるため)。
import { ATTR_LOGIC, calcDamage, getPowerCost, canUsePower, tickPoison, tickGamblerKakuhen } from "./attributes.js";
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

  // 「疾風怒濤」クエスト：風属性の風速(0〜3)のピーク値
  if (playerAttribute === "wind") {
    updateQuestProgress("windGust", playerState.windSpeed);
  }

  // 呪いを受けている側がパーを出すと、呪いスタック数分のダメージ（付与した側の属性に関わらず発動）
  if (playerHand === 1 && playerState.curseStacks > 0) {
    playerState.hp = Math.max(0, playerState.hp - playerState.curseStacks);
    callbacks.showDamageNumber("player", playerState.curseStacks);
  }
  if (cpuHand === 1 && cpuState.curseStacks > 0) {
    cpuState.hp = Math.max(0, cpuState.hp - cpuState.curseStacks);
    callbacks.showDamageNumber("cpu", cpuState.curseStacks);
  }

  // ▼ パーならパワー+1（最大値でストップ）
  // 相手が氷属性で凍結準備(freezeReady)中なら、パワー上昇を無効化して凍結を消費する
  let playerPowerFrozen = false;
  let cpuPowerFrozen = false;

  if (playerHand === 1) {
    if (cpuAttribute === "ice" && cpuState.freezeReady) {
      playerPowerFrozen = true;
      cpuState.freezeReady = false;
    } else {
      const paperGain = ATTR_LOGIC[playerAttribute].paperGain || 1;
      playerState.power = Math.min(playerState.power + paperGain, playerState.maxPower);
    }
  }
  if (cpuHand === 1) {
    if (playerAttribute === "ice" && playerState.freezeReady) {
      cpuPowerFrozen = true;
      playerState.freezeReady = false;
    } else {
      const cpuPaperGain = ATTR_LOGIC[cpuAttribute].paperGain || 1;
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

  const playerPowerCost = getPowerCost(playerAttribute, playerState);
  const cpuPowerCost = getPowerCost(cpuAttribute, cpuState);

  // 判定はcanUsePower()に集約（ギャンブラーの確変中などデフォルト条件と異なる属性はここで上書きされる）
  if (playerHand === 0 && canUsePower(playerAttribute, playerState, playerPowerCost)) playerUsedPower = true;
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

     if (playerAttribute === "thunder" && playerChargeAtStart === 5) {
      playerState.thunderCharge = 3;
  }

     if (cpuAttribute === "thunder" && cpuChargeAtStart === 5) {
      cpuState.thunderCharge = 3;
  }



    cpuState.hp -= damage;


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

     if (cpuAttribute === "thunder" && cpuChargeAtStart === 5) {
      cpuState.thunderCharge = 3;
  }
     if (playerAttribute === "thunder" && playerChargeAtStart === 5) {
      playerState.thunderCharge = 3;
  }

    playerState.hp -= cpudamage;

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

    callbacks.playDamageEffect(cpudamage);

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

    if (playerAttribute === "thunder" && playerChargeAtStart === 5) {
    playerState.thunderCharge = 3;
}
if (cpuAttribute === "thunder" && cpuChargeAtStart === 5) {
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
  if (playerState.hp <= 0) {
    callbacks.handlePlayerDefeated();
    return;
  }

  // ▼ パワー消費
  if (playerUsedPower) playerState.power -= playerPowerCost;
  if (cpuUsedPower) cpuState.power -= cpuPowerCost;

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
