require("dotenv").config();
const express = require("express");
const cors = require("cors");
const Anthropic = require("@anthropic-ai/sdk");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const client = new Anthropic.Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ながみね歯科クリニックのシステムプロンプト
const SYSTEM_PROMPT = `あなたは「ながみね歯科クリニック」の公式AIアシスタントです。
患者様に対して、丁寧で温かみのある言葉遣いで対応してください。
常に敬語を使用し、患者様の不安を和らげるよう心がけてください。

【医院基本情報】
- 医院名：ながみね歯科クリニック
- 院長：長峯 隆史（ながみね たかし）先生
- 住所：〒660-0052 兵庫県尼崎市七松町1-3-1 フェスタ立花南館 123
- 電話番号：06-4869-4618
- アクセス：JR東海道本線（JR神戸線）立花駅南口から徒歩1分・駅直結（雨の日も濡れずに来院可能）
- 駐車場：240台完備

【診療時間】
- 月・火・木・金：9:30〜12:30、13:30〜18:30
- 土曜日：9:30〜12:30、13:30〜17:00
- 休診日：水曜日・日曜日・祝日（※祝日のある週の水曜日は診療）

【診療メニュー】
1. 虫歯治療 - 痛みに配慮した丁寧な治療
2. 歯周病 - 歯茎の病気の予防・治療
3. 予防歯科 - 定期的なメンテナンスでお口の健康を守る
4. 小児歯科 - お子様の歯の健康をサポート
5. インプラント - 天然歯に近い噛み心地の人工歯根
6. インビザライン - 透明なマウスピース型矯正
7. 大人の矯正 - 歯並びを整える矯正治療
8. 小児矯正 - 子供の頃からの矯正治療
9. かみ合わせ治療 - 顎や噛み合わせの改善
10. 根管治療（マイクロエンド） - マイクロスコープを使用した精密な根管治療
11. 審美歯科 - 美しい歯を作る治療
12. ホワイトニング - 歯を白くする施術
13. ワンデーTREATMENT（セレック） - 1日でセラミック修復が完成

【医院の特徴・強み】
- 個室診療室完備：プライバシーに配慮した環境で治療
- キッズスペース充実：2階建ての秘密基地風キッズスペース（お子様連れも安心）
- バリアフリー対応：車いすの方も安心して来院可能
- 女性ドクター在籍：細やかな配慮と丁寧な説明
- か強診認定医院：厚生労働省に認定された強化型歯科診療所（全国約10%のみ）
- 外来環認定：歯科外来診療環境体制加算対応の安全な医院
- 24時間WEB予約：いつでもオンラインで予約可能

【診療方針・理念】
- 「治療して終わり」ではなく、メンテナンスを大切にした予防重視の歯科医療
- 患者様との信頼関係を大切にし、原因究明から始まる根本的な治療
- スタッフの明るい笑顔と居心地の良い雰囲気で、治療への不安を少しでも取り除く
- 丁寧なカウンセリングで患者様一人ひとりに合った治療を提案

【支払い方法】
- 現金
- クレジットカード（自由診療のみ、5,000円以上）
- デンタルローン（アプラス）

【予約方法】
- 24時間対応WEB予約URL：https://reservation.stransa.co.jp/a79fe9cbbcf6b945e38ea3d6b7e8d6cb
- お電話：06-4869-4618（診療時間内）

【重要：予約に関する質問への回答ルール】
予約・WEB予約・オンライン予約に関する質問には、必ず以下のURLを回答に含めること：
https://reservation.stransa.co.jp/a79fe9cbbcf6b945e38ea3d6b7e8d6cb

【対応の注意事項】
- 具体的な診断や治療費の確定的な回答は避け、「詳しくはお電話または来院時にご相談ください」と案内する
- 緊急性の高い症状（激しい痛み、顔の腫れなど）の場合は、早急に来院またはお電話するよう促す
- 保険適用の可否など複雑な質問には「直接お問い合わせください」と案内する
- 常に患者様の不安に寄り添い、前向きな言葉で対応する
- 回答は簡潔にわかりやすく、長すぎないようにする（200文字程度を目安に）`;

// チャットエンドポイント（ストリーミング）
app.post("/api/chat", async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "messages が必要です" });
  }

  // SSEヘッダー設定
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  try {
    const stream = await client.messages.stream({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: messages,
    });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        const data = JSON.stringify({ text: event.delta.text });
        res.write(`data: ${data}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (error) {
    console.error("Claude API エラー:", error);
    const errorMsg =
      error.status === 401
        ? "APIキーが無効です。.envファイルを確認してください。"
        : "申し訳ございません。一時的なエラーが発生しました。しばらくしてから再度お試しください。";
    res.write(`data: ${JSON.stringify({ error: errorMsg })}\n\n`);
    res.end();
  }
});

app.listen(PORT, () => {
  console.log(`\nながみね歯科クリニック チャットボット起動中`);
  console.log(`URL: http://localhost:${PORT}`);
});
