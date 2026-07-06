// ===== ストーリーモード：ステージ / アイテムカードのデータ定義 =====
// main.jsから切り出したモジュール。DOM描画(renderStageList等)はmain.js側の責務。
// ステージ数・敵数を増やす拡張時は、このファイルにエントリを足すだけでよい設計になっている。

export const STAGE_CATALOG = {
  stage1: {
    name: "始まりの草原",
    intro: "村はずれに広がる、のどかな草原。裂けめへと続く道は、この先にある。",
    background: "./images/stage/1.png",
    reward: 100,
    // ステージ1はチュートリアル位置づけ。属性解放のような大きな報酬は付けず、コインのみにする。
    // unlocksAttribute: 本編最初のステージ(村防衛パート、未実装)に持ち越す予定。
    // プレイヤーの基礎HP(fire25/thunder30/ice30)に合わせたスケール
    // story は任意。設定されている敵の直前だけ読み物画面(screen-story-read)を挟む。
    // story.lines[].portraits はキャラ立ち絵素材ができてから追加する想定(今は未指定=立ち絵なし表示)。
    enemies: [
      { name: "炎スライム", img: "./images/enemy/akasra.png",  attribute: "fire",    maxHp: 12, maxPower: 1, aiType: "balanced",
        story: {
          title: "1　始まりの冒険",
          lines: [
            { text: "空が裂け、あらゆる時空が入り混じった世界となって早１年。\n世界は混沌につつまれていた。" },
            { speaker: "おかん", text: "気を付けていってくるのよ" },
            { speaker: "{name}", text: "・・・" },
            { text: "この世界の平和を守るため、{name}は立ち上がる。" },
            { text: "邪悪な敵を倒し、裂けめの真相をつかみ、おかんの安全をまもるために（中学から喧嘩ばっかりだけど）。" },
            { text: "大きな裂けめに向かっていく途中で老人に話しかけられる。" },
            { speaker: "老人", text: "お前は裂けめに向かっているな。それならやめておけ。お前では生きて帰ってこれない。" },
            { speaker: "{name}", text: "え？誰ですか" },
            { speaker: "{name}", text: "いや普通に行きますけど。" },
            { speaker: "老人", text: "ふん、また“物語の主人公気取り”の若造か。" },
            { speaker: "{name}", text: "うわうざ。誰だよほんとに" },
            { speaker: "老人", text: "一年間、世界が崩れていくのを眺めてただけのくせに、\n急に正義感が湧いてきたか。\nまるで、家で英雄の物語ばかり読んで\n『俺にもできる』と勘違いする若者そのものだ。" },
            { speaker: "{name}", text: "おじいちゃん？話聞いてる？" },
            { speaker: "{name}", text: "というかなんでこんな煽ってくるの。" },
            { speaker: "老人", text: "その幻想を砕いてやる。\nまずはこの手を振りほどけ。\nできぬなら、裂けめどころか村の外にも出るな。" },
            { speaker: "{name}", text: "幻想って...というか力つよ！じじいなにもんだよ。" },
            { speaker: "老人", text: "……待てよ。お前、その身に眠る力……ただの若造ではないな。" },
            { speaker: "老人", text: "ちょうどいい。眠ったままのその属性の力、少しは目覚めさせてやろう。" },
            { speaker: "老人", text: "そこの炎スライムを相手に稽古をつけてやる。まずはその力、見せてみろ。" },
            { speaker: "{name}", text: "はぁ？？わけわかんないことばっか言ってんじゃねぇよ……" },
            { speaker: "{name}", text: "力って、そんなんわかんねぇし。というか誰なの？？？" },
            { speaker: "老人", text: "つべこべ言わずにいけ！！" },
            { speaker: "{name}", text: "うわぁぁぁ、なんだよもおおおおおお。" }
          ]
        }
      },
      { name: "水スライム",   img: "./images/enemy/mizusra.png", attribute: "water",   maxHp: 18, maxPower: 2, aiType: "defensive" },
      { name: "おっきめスライム", img: "./images/enemy/akasra.png",  attribute: "thunder", maxHp: 24, maxPower: 2, aiType: "balanced" }
    ],
    // clearStory: 任意。ステージの最後の敵を倒した直後、リザルト画面より前に挟む読み物。
    clearStory: {
      lines: [
        { speaker: "{name}", text: "か、勝てた、というかなんだこの力" },
        { speaker: "老人", text: "それがお前に眠る属性の力だ。その力は得ようと思って得られるものではない。親に感謝するんだな。" },
        { speaker: "{name}", text: "（おかん…）" },
        { speaker: "老人", text: "なんだその顔、家族と仲悪いのか" },
        { speaker: "{name}", text: "悪くはない、と思う。たぶん" },
        { speaker: "老人", text: "訳アリというわけか" },
        { speaker: "{name}", text: "いや、訳ありっていうか。あんまずけずけ家庭の事情に口出すなよ。" },
        { speaker: "老人", text: "引きこもりすぎて追い出されてきたとかか？" },
        { speaker: "{name}", text: "ちょっと黙ろうかおじいちゃん" },
        { speaker: "{name}", text: "んで、これでもう裂けまで行っていいですよね" },
        { speaker: "老人", text: "まだだめじゃな。このまま行ってもひき肉かミンチにされるだけじゃ。よくてハンバーグじゃ" },
        { speaker: "{name}", text: "（全部ひき肉じゃねぇか）" },
        { speaker: "{name}", text: "じゃあどうしたらいってもいいんすか" },
        { speaker: "老人", text: "どうしても裂けめまで行きたいようじゃな。その熱意はいいが、意気込みだけでは強くはなれんぞ" },
        { speaker: "{name}", text: "だから、どうしたらいいのかって聞いてるんだけど" },
        { speaker: "老人", text: "そう焦るな、最近の若者はすぐタイパコスパなどと言って話をろくにきとらん。だいたい…" },
        { speaker: "{name}", text: "はいはいわかったから。早く本題を話してください" },
        { speaker: "老人", text: "はぁ、まったく。わかったわかった。" },
        { speaker: "老人", text: "わしについてこい。そしたらじきに分かる" },
        { speaker: "{name}", text: "（なんだこのじじい）" },
        { speaker: "{name}", text: "（というかよくてハンバーグっておかしいよな。火通されちゃってるじゃん）" },
        { text: "謎の老人との修行？の旅が始まった。" },
        { text: "{name}に待ち受ける試練とは。そして、この世界に伸びようとしている魔の手とは一体何か。" },
        { text: "そして、老人に認められ無事に裂けめまでたどり着けるのか。" },
        { text: "冒険はまだ、始まったばかりだ" }
      ]
    }
  }
};

export const ITEM_CARD_CATALOG = {
  hpUp:        { name: "生命の欠片", desc: "最大HP+12（全回復）",             apply(p) { p.maxHp += 12; p.hp = p.maxHp; } },
  powerUp:     { name: "闘気の残滓", desc: "最大パワー+1",                   apply(p) { p.maxPower += 1; } },
  fireEmber:   { name: "業火の種",   desc: "（炎専用）攻撃力上昇+2",         apply(p) { p.fireAtkBonus = (p.fireAtkBonus || 0) + 2; }, attribute: "fire" },
  thunderCore: { name: "雷核",       desc: "（雷専用）チャージ+2",           apply(p) { p.thunderCharge = Math.min((p.thunderCharge || 0) + 2, 5); }, attribute: "thunder" },
  iceHeart:    { name: "氷結の心臓", desc: "（氷専用）凍結準備が発動済みに", apply(p) { p.freezeReady = true; }, attribute: "ice" }
};
