require("dotenv").config();
const express = require("express");
const cors = require("cors");
const Anthropic = require("@anthropic-ai/sdk");
const config = require("./clinic.config");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const client = new Anthropic.Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// clinic.config.js からシステムプロンプトを自動生成
const SYSTEM_PROMPT = `あなたは「${config.name}」の公式AIアシスタントです。
患者様に対して、丁寧で温かみのある言葉遣いで対応してください。
常に敬語を使用し、患者様の不安を和らげるよう心がけてください。

【医院基本情報】
- 医院名：${config.name}
- 院長：${config.doctor}先生
- 住所：${config.address}
- 電話番号：${config.phone}
- アクセス：${config.access}
- 駐車場：${config.parking}

【診療時間】
${config.hours.map(h => `- ${h}`).join("\n")}
- 休診日：${config.holiday}

【診療メニュー】
${config.services.map((s, i) => `${i + 1}. ${s}`).join("\n")}

【医院の特徴・強み】
${config.features.map(f => `- ${f}`).join("\n")}

【支払い方法】
${config.payment.map(p => `- ${p}`).join("\n")}

【予約方法】
- 24時間対応WEB予約URL：${config.reservationUrl}
- お電話：${config.phone}（診療時間内）

【重要：予約に関する質問への回答ルール】
予約・WEB予約・オンライン予約に関する質問には、必ず以下のURLを回答に含めること：
${config.reservationUrl}

【対応の注意事項】
- 具体的な診断や治療費の確定的な回答は避け、「詳しくはお電話または来院時にご相談ください」と案内する
- 緊急性の高い症状（激しい痛み、顔の腫れなど）の場合は、早急に来院またはお電話するよう促す
- 保険適用の可否など複雑な質問には「直接お問い合わせください」と案内する
- 常に患者様の不安に寄り添い、前向きな言葉で対応する
- 回答は簡潔にわかりやすく、長すぎないようにする（200文字程度を目安に）`;

// クライアント向けにconfig情報を提供するエンドポイント
app.get("/api/config", (req, res) => {
  res.json({
    name: config.name,
    phone: config.phone,
    reservationUrl: config.reservationUrl,
    chatbot: config.chatbot,
  });
});

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
  console.log(`\n${config.name} チャットボット起動中`);
  console.log(`URL: http://localhost:${PORT}`);
});
