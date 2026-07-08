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
      { name: "雷スライム", img: "./images/enemy/kaminarisra.png",  attribute: "thunder", maxHp: 24, maxPower: 2, aiType: "balanced" }
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
        { speaker: "{name}", text: "（というか、よくてハンバーグっておかしいよな。）" },
        { text: "謎の老人との修行？の旅が始まった。" },
        { text: "{name}に待ち受ける試練とは。そして、この世界に伸びようとしている魔の手とは一体何か。" },
        { text: "そして、老人に認められ無事に裂けめまでたどり着けるのか。" },
        { text: "冒険はまだ、始まったばかりだ" }
      ]
    }
  },
  stage2: {
    name: "選ぶ理由",
    intro: "老人に連れられ、くらい森の奥へ。ここで本格的な稽古が始まる。",
    background: "./images/stage/2.png",
    reward: 100,
    unlocksAttribute: "stone",
    enemies: [
      { name: "炎スライム", img: "./images/enemy/mizusra.png", attribute: "fire",    maxHp: 12, maxPower: 2, aiType: "balanced",
        story: {
          title: "2　選ぶ理由",
          lines: [
            { speaker: "{name}", text: "なあ、結局どこ向かってんの、これ" },
            { speaker: "老人", text: "黙ってついてこい。着けば分かる" },
            { speaker: "{name}", text: "さっきも同じこと言われた気がするけど" },
            { speaker: "{name}", text: "…" },
            { text: "老人につれられるまま、くらい森の中へ入っていく" },
            { speaker: "老人", text: "ここじゃ" },
            { speaker: "{name}", text: "なんかじめじめしてるし、虫とかいないよね。苦手なんだよぉ" },
            { speaker: "老人", text: "その軟弱な精神を鍛えてやろうといっておるのだ" },
            { speaker: "{name}", text: "意味あるんだろうなこれ" },
            { speaker: "老人", text: "わかりやすい意味をすぐに見いだせないとやる気がでんのか" },
            { speaker: "老人", text: "そんなんじゃ、どれだけ才能があろうと無意味じゃな" },
            { speaker: "{name}", text: "…" },
            { speaker: "老人", text: "...図星か" },
            { speaker: "老人", text: "まあいい。今は深く考えんと戦ってみればええわ。" },
            { speaker: "{name}", text: "…" },
            { speaker: "老人", text: "返事はどうした。" },
            { speaker: "{name}", text: "…" },
            { speaker: "老人", text: "なにふてくされとるんじゃ。さっきまでの威勢はどうした。" },
            { speaker: "{name}", text: "べつに" },
            { speaker: "老人", text: "なんじゃそれは。そんなに嫌なら行動で示してみればよいではないか" },
            { speaker: "{name}", text: "…俺には無理なんだろ？じゃあいいよ。もう帰ります。" },
            { speaker: "老人", text: "覚悟すら軟弱とは。お前には少し期待したんだがな。" },
            { speaker: "{name}", text: "…勝手に期待とかすんなよ" },
            { speaker: "老人", text: "もうよい。帰りたいなら帰れ。" },
            { speaker: "{name}", text: "…" },
            { speaker: "{name}", text: "…" },
            { speaker: "老人", text: "何をしておる。帰るならさっさと帰れ" },
            { speaker: "{name}", text: "…俺だって、こんな惨めな…" },
            { speaker: "老人", text: "あ？なんだって？" },
            { speaker: "{name}", text: "俺だって！！こんな惨めな思いするために家出てきたわけじゃないんだよ！！！！" },
            { speaker: "老人", text: "…" },
            { speaker: "{name}", text: "あんたの言う通りだよ俺は！！弱くて、軟弱で、覚悟もなくて、才能もない。" },
            { speaker: "{name}", text: "俺は何も持ってないんだよ！！！特別な力も！！たまたまちょっとできただけだ！！！" },
            { speaker: "老人", text: "…" },
            { speaker: "{name}", text: "…喧嘩したんだ。６年前に。おかんと。" },
            { speaker: "{name}", text: "そっからろくに話してもないんだ。" },
            { speaker: "{name}", text: "俺は何もしてなかったし。もう嫌われてるんだ。" },
            { speaker: "老人", text: "お前は、お母さんが嫌いなのか？" },
            { speaker: "{name}", text: "いや。嫌いじゃない。" },
            { speaker: "老人", text: "どうして裂けめにむかってるんだ。" },
            { speaker: "{name}", text: "おかんはモノを運ぶ仕事なんだ。裂け目から出る魔物の怖がってるんだ。" },
            { speaker: "老人", text: "そうか" },
            { speaker: "{name}", text: "でも俺には無理だ。あきらめて帰るよ。じいさんありがとな。ちゃんと諦められる。" },
            { speaker: "老人", text: "本当にやめるのか" },
            { speaker: "{name}", text: "俺には無理だったんだ、最初から" },
            { speaker: "老人", text: "わしはおぬしには無理とは言っとらんぞ。" },
            { speaker: "{name}", text: "なんだよ急に" },
            { speaker: "老人", text: "お前は自分には才能がないといったがそれは間違いじゃ。お前には世界を救える力を持ってる。" },
            { speaker: "{name}", text: "あの...属性？のこと？" },
            { speaker: "老人", text: "そうだ。わしと一緒に来れば必ずお前は世界を救える。" },
            { speaker: "{name}", text: "世界を..." },
            { speaker: "老人", text: "ここで今一度選べ。帰って自分の才能を無駄にするか" },
            { speaker: "老人", text: "人のために使うか" },
            { speaker: "スライム", text: "ぽこぽこぽこ" },
            { speaker: "老人", text: "魔物か、ここにいて長話していたらそうなるか。" },
            { speaker: "{name}", text: "俺、やれるかな。" },
            { speaker: "老人", text: "できるかどうかは自分次第じゃ" }
          ]
        }
      },
      { name: "雷コウモリ", img: "./images/enemy/mizusra.png", attribute: "thunder", maxHp: 24, maxPower: 2, aiType: "aggressive" },
      { name: "氷スライム", img: "./images/enemy/mizusra.png", attribute: "ice",     maxHp: 26, maxPower: 2, aiType: "defensive" },
      { name: "風バタフライ", img: "./images/enemy/mizusra.png", attribute: "wind",    maxHp: 28, maxPower: 2, aiType: "balanced",
        story: {
          lines: [
            { speaker: "老人", text: "まだまだ粗削りじゃが、覚醒したてでここまでとは驚異的" },
            { speaker: "{name}", text: "……。" },
            { speaker: "老人", text: "...集中せい。" },
            { speaker: "{name}", text: "...うん。" }
          ]
        }
      },
      { name: "クラゲ", img: "./images/enemy/mizusra.png", attribute: "water",   maxHp: 30, maxPower: 3, aiType: "defensive" },
      { name: "蜂", img: "./images/enemy/mizusra.png", attribute: "poison",  maxHp: 26, maxPower: 3, aiType: "aggressive" },
      { name: "格闘スライム", img: "./images/enemy/mizusra.png", attribute: "fighter", maxHp: 28, maxPower: 3, aiType: "aggressive" },
      { name: "ゴブリン", img: "./images/enemy/mizusra.png", attribute: "berserker", maxHp: 80, maxPower: 3, aiType: "balanced",
        // このstory.lines内で村が襲われている場面に切り替わる(該当行にbackground指定あり)ため、
        // 戦闘そのものもその続きとして村の光景(images/stage/3.png)で行う
        background: "./images/stage/3.png",
        story: {
          lines: [
            { speaker: "女の声", text: "きゃああああああああああああああああああああああああ" },
            { speaker: "{name}", text: "今の、人の声？" },
            { speaker: "老人", text: "そのようじゃな。魔物もちょうど収まってきているし行くか？" },
            { speaker: "{name}", text: "俺なんかが行って意味あるのかな。" },
            { speaker: "老人", text: "その自己否定はお前の悪い癖じゃな" },
            { speaker: "{name}", text: "いやだって、事実だし。" },
            { speaker: "老人", text: "そうか。なら行かないんだな" },
            { speaker: "{name}", text: "..." },
            { speaker: "老人", text: "素直じゃないのぉ。まったく最近の若者らしい奴じゃな" },
            { speaker: "{name}", text: "うっさい。" },
            { text: "二人は声のしたほうへ向かった。" },
            // ここから村が魔物に襲われている光景に切り替わるため、背景を差し替える
            { text: "するとそこには、魔物が人の里を襲っているところだった。", background: "./images/stage/3.png" }
          ]
        }
      },
      { name: "ゴブリン", img: "./images/enemy/mizusra.png", attribute: "berserker",   maxHp: 80, maxPower: 3, aiType: "balanced",
        background: "./images/stage/3.png",
        story: {
          background: "./images/stage/3.png",
          lines: [
            { speaker: "村人", text: "たすけてぇえええ" },
            { speaker: "{name}", text: "まってろ！すぐ行くから！" },
            { speaker: "老人", text: "…" }
          ]
        }
      },
      { name: "ホブゴブリン",   img: "./images/enemy/mizusra.png", attribute: "berserker", maxHp: 100, maxPower: 4, aiType: "aggressive",
        background: "./images/stage/3.png",
        story: {
          background: "./images/stage/3.png",
          lines: [
            { speaker: "ホブゴブリン", text: "ニンゲン、コロス" },
            { speaker: "{name}", text: "（でっけぇしくさい。くそが！勝てるわけない俺に）" },
            { speaker: "村人", text: "お願いします。村を、村を救ってください。お願いします。" },
            { speaker: "{name}", text: "勝てなかったら、ごめんなさい。" },
            { speaker: "老人", text: "弱気になるな！気持ちで負けていては勝てる相手にも勝てんぞ！" },
            { speaker: "{name}", text: "お前も手伝えよ！！俺一人じゃ無理かもしれない！" },
            { speaker: "老人", text: "いや、手は貸さん。お前ひとりでやれる。" },
            { speaker: "{name}", text: "くそじじい！！" },
            { speaker: "ホブゴブリン", text: "フゴオオオオオオ" },
            { speaker: "{name}", text: "やるしかない！！！みんな下がっててください！！" }
          ]
        }
      }
    ],
    clearStory: {
      background: "./images/stage/3.png",
      lines: [
        { speaker: "{name}", text: "か、かてた。" },
        { speaker: "老人", text: "上出来じゃ" },
        { speaker: "{name}", text: "あんたは手伝えよ！死ぬかもしれなかったんだぞ！" },
        { speaker: "老人", text: "でもお前は今生きとるじゃろうが" },
        { speaker: "{name}", text: "それは結果論だろ！！" },
        { speaker: "老人", text: "もうええじゃろ。ほれ、村の人がよんどるぞ" },
        { speaker: "村人", text: "ありがとうございます。勇者様。" },
        { speaker: "{name}", text: "いや。俺は勇者なんかじゃ。" },
        { speaker: "村人", text: "あなた様が勇者ではなくて誰が勇者なのですか。" },
        { speaker: "村人", text: "巨大なゴブリンに立ち向かっていく姿。私共を守ってくれたその姿は勇者様そのものでしたよ" },
        { speaker: "{name}", text: "俺はそんな大層なもんじゃ..." },
        { speaker: "老人", text: "これ！過剰な自己謙遜は相手の否定につながるぞ。" },
        { speaker: "{name}", text: "いって！なに殴るんだよ！" },
        { speaker: "村人", text: "その、お名前伺ってもいいですか。" },
        { speaker: "{name}", text: "あ、えっと{name}です。" },
        { speaker: "村人", text: "{name}様ですか。なんとお礼をしたらいいか。" },
        { speaker: "{name}", text: "いやいや、お礼なんていいですよ。" },
        { speaker: "村人", text: "いえいえ、といってもこんな有様の村では渡せるものもほとんどないのですが。" },
        { speaker: "{name}", text: "いやいや、なおさらもらえないですよ。村の復興のために大切に使ってください。" },
        { speaker: "村人", text: "なんと、お優しい方なんだ..." },
        { speaker: "老人", text: "お前も結構やるじゃないか。" },
        { speaker: "{name}", text: "なんだよ急に" },
        { text: "こうしてこの街の平和は保たれた。" },
        { speaker: "老人", text: "…" },
        { speaker: "老人", text: "（この魔物たち、大半は裂けめの向こうからやってきたようだが）" },
        { speaker: "老人", text: "（そうじゃないのもいるな）" },
        { speaker: "老人", text: "（なにか嫌な予感がする）" },
        { speaker: "{name}", text: "おいじじい。なにぼ～としてんのよ。" },
        { speaker: "老人", text: "いやなんでもない" },
        { speaker: "{name}", text: "なんか今日はこの村に泊まっていいらしい。ご飯も食べていいんだって" },
        { speaker: "老人", text: "それは良かったな" },
        { speaker: "{name}", text: "あんたもくるだろ？" },
        { speaker: "老人", text: "そうじゃな。ありがたい" },
        { speaker: "{name}", text: "あんた風呂はいれよ。っちょっと匂うぞ" },
        { speaker: "老人", text: "お前もこれくらいの年齢になったらわかる。どうにもならない匂いもあると" },
        { speaker: "{name}", text: "言い訳すんな。普通に風呂入れさせてもらえ" },
        { text: "こうして二人の冒険はまだまだつづくのであった。" }
      ]
    }
  }
};

// アイテムカード選択画面で提示するカードをプールからランダムにcount枚抽選する(重複なし)。
// オンライン対戦には一切絡まないストーリーモード専用の演出用途なので、battleRandom()ではなく
// getRandomAttribute()と同じくMath.random()をそのまま使う(乱数のシード同期は不要)。
export function pickRandomCardIds(pool, count) {
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

export const ITEM_CARD_CATALOG = {
  hpUp:        { name: "生命の欠片", desc: "最大HP+12（全回復）",             apply(p) { p.maxHp += 12; p.hp = p.maxHp; } },
  powerUp:     { name: "闘気の残滓", desc: "最大パワー+1",                   apply(p) { p.maxPower += 1; } },
  fireEmber:   { name: "業火の種",   desc: "（炎専用）攻撃力上昇+2",         apply(p) { p.fireAtkBonus = (p.fireAtkBonus || 0) + 2; }, attribute: "fire" },
  thunderCore: { name: "雷核",       desc: "（雷専用）チャージ+2",           apply(p) { p.thunderCharge = Math.min((p.thunderCharge || 0) + 2, 5); }, attribute: "thunder" },
  iceHeart:    { name: "氷結の心臓", desc: "（氷専用）凍結準備が発動済みに", apply(p) { p.freezeReady = true; }, attribute: "ice" },

  // ▼ 汎用カード18種(数値強化枠)
  emberEcho:   { name: "業炎の残り火", desc: "攻撃力+1（全属性共通）", apply(p) { p.genericAtkBonus = (p.genericAtkBonus || 0) + 1; } },
  ironWard:    { name: "鉄壁の護符",   desc: "被ダメージ-1（全属性共通）", apply(p) { p.genericDefReduction = (p.genericDefReduction || 0) + 1; } },
  swiftFeather:{ name: "俊敏の羽根",   desc: "パー使用時の獲得パワー+1", apply(p) { p.itemPaperGainBonus = (p.itemPaperGainBonus || 0) + 1; } },

  // ▼ 汎用カード18種(ハイリスク・ハイリターン枠)
  doubleEdgedCharm: {
    name: "諸刃の護符", desc: "最大HP-8（即時反映）、攻撃力+3",
    apply(p) {
      p.maxHp = Math.max(1, p.maxHp - 8);
      p.hp = Math.min(p.hp, p.maxHp);
      p.genericAtkBonus = (p.genericAtkBonus || 0) + 3;
    }
  },
  allInToken: {
    name: "一点賭けの証", desc: "最大パワー-1（即時反映）、パワー消費時の攻撃力+3",
    apply(p) {
      p.maxPower = Math.max(1, p.maxPower - 1);
      p.power = Math.min(p.power, p.maxPower);
      p.itemPowerAtkBonus = (p.itemPowerAtkBonus || 0) + 3;
    }
  },
  desperateVow:        { name: "背水の誓い", desc: "HPが50%以下の間、攻撃力+2", apply(p) { p.itemLowHpAtkBonus = (p.itemLowHpAtkBonus || 0) + 2; } },
  selfSacrificeStrike: { name: "捨て身の一撃", desc: "グーで与ダメ+4。ただし与ダメの半分を自分も被弾する", apply(p) { p.itemRockAtkBonus = (p.itemRockAtkBonus || 0) + 4; } },
  wagerToken:          { name: "賭け金の証", desc: "負けた次の1回、グーのパワー消費コストが無料になる", apply(p) { p.itemFreeCostEnabled = true; } },

  // ▼ 汎用カード18種(状態異常・妨害の汎用化枠)
  poisonVial:    { name: "小瓶の毒",   desc: "勝利時、相手に毒1スタックを追加する", apply(p) { p.itemPoisonOnWin = true; } },
  curseDoll:     { name: "呪いの人形", desc: "パワー消費のたびに相手へ呪いを+1する", apply(p) { p.itemCurseOnPowerUse = true; } },
  freezingBreath:{ name: "凍える吐息", desc: "勝利時20%で相手の次のパー獲得を無効化する", apply(p) { p.itemFreezeChanceOnWin = (p.itemFreezeChanceOnWin || 0) + 0.2; } },
  spiderThread:  { name: "蜘蛛の糸",   desc: "あいこの時、相手のパワーを1奪う", apply(p) { p.itemPowerStealOnDraw = true; } },
  shadowWhisper: { name: "影のささやき", desc: "勝利時10%で追加1ダメージ", apply(p) { p.itemExtraDmgChanceOnHit = (p.itemExtraDmgChanceOnHit || 0) + 0.1; } },

  // ▼ 汎用カード18種(経済・立ち回り枠)
  veteranWisdom:   { name: "老練の心得", desc: "あいこ時、パワー+1", apply(p) { p.itemPowerOnDraw = true; } },
  windSprintBoots: { name: "疾風の靴",   desc: "直前と違う手を出すたびにパワー+1", apply(p) { p.itemPowerOnHandChange = true; p.itemLastHandForBoots = null; } },
  merchantsEye:    { name: "商人の目利き", desc: "次のアイテムカード選択の選択肢が1枚増える", apply(p) { p.itemExtraCardChoicePending = true; } },
  savingsCreed:    { name: "貯蓄の心得", desc: "パワーが上限を超えた分がHP回復に変換される", apply(p) { p.itemOverflowPowerToHeal = true; } },
  pilgrimsStaff:   { name: "巡礼の杖",   desc: "3ターンごとにHPが2回復する", apply(p) { p.itemPilgrimStaffActive = true; p.itemPilgrimStaffTurns = 0; } },

  // ▼ 属性専用カード(15属性×2種、既存3種(fireEmber/thunderCore/iceHeart)の2枚目)
  fireRageUnlock:  { name: "怒りの解放", desc: "（炎専用）HPに関わらず怒り状態(攻撃力+2)を即座に発動する", apply(p) { p.fireRage = true; }, attribute: "fire" },
  thunderSpareCell:{ name: "予備電池",   desc: "（雷専用）チャージ上限を+2する", apply(p) { p.thunderChargeMax = (p.thunderChargeMax || 5) + 2; }, attribute: "thunder" },
  iceEcho:         { name: "氷結の残響", desc: "（氷専用）凍結準備の効果がもう1回分発動するようになる", apply(p) { p.iceEchoCharges = (p.iceEchoCharges || 0) + 1; }, attribute: "ice" },

  stoneMemory: { name: "岩盤の記憶", desc: "（石専用）被ダメージ軽減の蓄積を+1底上げする", apply(p) { p.stoneDefenseReduction = (p.stoneDefenseReduction || 0) + 1; }, attribute: "stone" },
  stoneBoulder:{ name: "巨石の一撃", desc: "（石専用）攻撃力上昇の蓄積を+1底上げする", apply(p) { p.stoneAtkBonus = (p.stoneAtkBonus || 0) + 1; }, attribute: "stone" },

  waterSpringBlessing:{ name: "湧き水の加護", desc: "（水専用）あいこ時の回復量+2", apply(p) { p.itemWaterHealBonus = (p.itemWaterHealBonus || 0) + 2; }, attribute: "water" },
  waterFrostMemory:   { name: "氷解の記憶",   desc: "（水専用）あいこ時のパワー獲得+1", apply(p) { p.itemWaterPowerBonus = (p.itemWaterPowerBonus || 0) + 1; }, attribute: "water" },

  windTailwind:  { name: "順風の羽根", desc: "（風専用）風速+1する（即時、上限3）", apply(p) { p.windSpeed = Math.min((p.windSpeed || 0) + 1, 3); }, attribute: "wind" },
  windTempestAsh:{ name: "暴風の残滓", desc: "（風専用）風速3の攻撃力ボーナスをさらに+2する", apply(p) { p.itemWindMaxSpeedBonusExtra = (p.itemWindMaxSpeedBonusExtra || 0) + 2; }, attribute: "wind" },

  fighterSaintFist: { name: "拳聖の証",   desc: "（格闘家専用）グーのパワー消費がさらに-1（最低0）", apply(p) { p.itemFighterPowerCostReduction = (p.itemFighterPowerCostReduction || 0) + 1; }, attribute: "fighter" },
  fighterFlurry:    { name: "乱打の心得", desc: "（格闘家専用）チョキの固定ダメージ+2", apply(p) { p.itemFighterScissorsBonus = (p.itemFighterScissorsBonus || 0) + 2; }, attribute: "fighter" },

  poisonElixir: { name: "猛毒の秘薬", desc: "（毒専用）毒付与時の初期ダメージ+1", apply(p) { p.itemPoisonInitialBonus = (p.itemPoisonInitialBonus || 0) + 1; }, attribute: "poison" },
  poisonHerb:   { name: "延命の毒草", desc: "（毒専用）毒の持続ターン+2", apply(p) { p.itemPoisonDurationBonus = (p.itemPoisonDurationBonus || 0) + 2; }, attribute: "poison" },

  vampireCrimsonThirst:{ name: "深紅の渇き", desc: "（吸血専用）吸血の回復率+15%", apply(p) { p.itemVampireHealRateBonus = (p.itemVampireHealRateBonus || 0) + 0.15; }, attribute: "vampire" },
  vampireFangMark:     { name: "牙の刻印",   desc: "（吸血専用）グー(パワー消費時)の固定ダメージ+2", apply(p) { p.itemVampireRockBonus = (p.itemVampireRockBonus || 0) + 2; }, attribute: "vampire" },

  doppelMirrorVow: { name: "鏡合わせの誓い", desc: "（ドッペルゲンガー専用）あいこ反撃強化の閾値を4回に短縮する", apply(p) { p.itemDoppelThreshold = 4; }, attribute: "doppel" },
  doppelPhantomBlade:{ name: "虚像の刃",     desc: "（ドッペルゲンガー専用）勝利時の固定ダメージ+2", apply(p) { p.itemDoppelWinBonus = (p.itemDoppelWinBonus || 0) + 2; }, attribute: "doppel" },

  curseAmplify:{ name: "呪詛の増幅",   desc: "（呪術専用）パワー消費時の呪い付与量+1", apply(p) { p.itemCurseStackBonus = (p.itemCurseStackBonus || 0) + 1; }, attribute: "curse" },
  curseOldTome:{ name: "古き呪いの書", desc: "（呪術専用）相手の呪いスタックが5以上の間、パー限定を解除しどの手にもダメージが乗る", apply(p) { p.itemCurseAnyHandThreshold = 5; }, attribute: "curse" },

  cannonArmorUp:  { name: "増加装甲", desc: "（砲台専用）被弾時のパワー獲得+2", apply(p) { p.itemCannonGainBonus = (p.itemCannonGainBonus || 0) + 2; }, attribute: "cannon" },
  cannonBoreUp:   { name: "口径拡張", desc: "（砲台専用）最大パワー+6", apply(p) { p.maxPower += 6; }, attribute: "cannon" },

  gamblerCheatCard:{ name: "イカサマの札",   desc: "（ギャンブラー専用）確変突入率+10%", apply(p) { p.itemGamblerRateBonus = (p.itemGamblerRateBonus || 0) + 0.1; }, attribute: "gambler" },
  gamblerBigBet:   { name: "大博打の記憶",   desc: "（ギャンブラー専用）確変の持続ターン+2", apply(p) { p.itemGamblerDurationBonus = (p.itemGamblerDurationBonus || 0) + 2; }, attribute: "gambler" },

  magicianGloves:{ name: "奇術師の手袋", desc: "（マジシャン専用）HP回復量+2", apply(p) { p.itemMagicianHealBonus = (p.itemMagicianHealBonus || 0) + 2; }, attribute: "magician" },
  magicianLuckyCoin:{ name: "幸運のコイン", desc: "（マジシャン専用）抽選からHP回復を除外し、攻撃力/防御力の2択にする", apply(p) { p.itemMagicianExcludeHeal = true; }, attribute: "magician" },

  berserkerDiscipline:{ name: "狂戦士の心得", desc: "（バーサーカー専用）毎ターンの自傷-1（最低1）", apply(p) { p.itemBerserkerSelfDmgReduction = (p.itemBerserkerSelfDmgReduction || 0) + 1; }, attribute: "berserker" },
  berserkerRageBlow:{ name: "怒濤の一撃",   desc: "（バーサーカー専用）固定ダメージ+2", apply(p) { p.itemBerserkerDmgBonus = (p.itemBerserkerDmgBonus || 0) + 2; }, attribute: "berserker" }
};
