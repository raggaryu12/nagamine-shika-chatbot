(function () {
  "use strict";

  // チャットボット設定
  const CONFIG = {
    apiUrl: window.NAGAMINE_CHATBOT_API_URL || "http://localhost:3000/api/chat",
    welcomeMessage:
      "こんにちは！ながみね歯科クリニックのAIアシスタントです😊\n\nご予約・診療内容・アクセスなど、何でもお気軽にお聞きください。",
    quickReplies: [
      "診療時間を教えてください",
      "予約はできますか？",
      "アクセス方法は？",
      "どんな治療がありますか？",
    ],
  };

  // 会話履歴
  let conversationHistory = [];
  let isLoading = false;

  // ウィジェットHTMLを生成
  function createWidget() {
    const widget = document.createElement("div");
    widget.id = "nagamine-chatbot-widget";
    widget.innerHTML = `
      <!-- チャットウィンドウ -->
      <div id="nagamine-chat-window">
        <!-- ヘッダー -->
        <div id="nagamine-chat-header">
          <div id="nagamine-chat-header-icon">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
          </div>
          <div id="nagamine-chat-header-info">
            <div id="nagamine-chat-header-title">ながみね歯科クリニック</div>
            <div id="nagamine-chat-header-sub">AIアシスタント ● 24時間対応</div>
          </div>
          <button id="nagamine-chat-close" aria-label="閉じる">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <!-- メッセージエリア -->
        <div id="nagamine-chat-messages"></div>

        <!-- クイック返信 -->
        <div id="nagamine-quick-replies"></div>

        <!-- 入力エリア -->
        <div id="nagamine-chat-input-area">
          <textarea
            id="nagamine-chat-input"
            placeholder="メッセージを入力してください..."
            rows="1"
            maxlength="500"
          ></textarea>
          <button id="nagamine-chat-send" aria-label="送信">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </div>

        <!-- 予約ボタン -->
        <div id="nagamine-reserve-bar">
          <a href="https://reservation.stransa.co.jp/a79fe9cbbcf6b945e38ea3d6b7e8d6cb" target="_blank" rel="noopener noreferrer" id="nagamine-reserve-btn">
            📅 WEB予約はこちら（24時間対応）
          </a>
        </div>

        <!-- フッター -->
        <div id="nagamine-chat-footer">
          ながみね歯科クリニック ｜ TEL: 06-4869-4618
        </div>
      </div>

      <!-- チャットボタン -->
      <button id="nagamine-chat-btn" aria-label="チャットを開く">
        <svg width="28" height="28" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="17" cy="13" r="8" fill="white" fill-opacity="0.2" stroke="white" stroke-width="2"/>
          <text x="17" y="17.5" text-anchor="middle" fill="white" font-size="9" font-weight="bold" font-family="Arial">AI</text>
          <path d="M13 21 Q13 25 17 25 Q21 25 21 21" stroke="white" stroke-width="2" fill="none" stroke-linecap="round"/>
          <circle cx="27" cy="6" r="1.5" fill="white"/>
          <circle cx="25" cy="3" r="1" fill="white" fill-opacity="0.6"/>
          <circle cx="29" cy="9" r="1" fill="white" fill-opacity="0.6"/>
        </svg>
        <span id="nagamine-chat-btn-label">AIアシスタント</span>
        <div id="nagamine-chat-badge"></div>
      </button>
    `;
    document.body.appendChild(widget);
  }

  // ウェルカムメッセージを表示
  function showWelcomeMessage() {
    addBotMessage(CONFIG.welcomeMessage);
    showQuickReplies(CONFIG.quickReplies);
  }

  // ボットメッセージを追加
  function addBotMessage(text) {
    const messagesEl = document.getElementById("nagamine-chat-messages");
    const msgEl = document.createElement("div");
    msgEl.className = "nagamine-msg bot";
    msgEl.innerHTML = `
      <div class="nagamine-msg-avatar">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
      </div>
      <div class="nagamine-msg-bubble">${escapeHtml(text)}</div>
    `;
    messagesEl.appendChild(msgEl);
    scrollToBottom();
    return msgEl.querySelector(".nagamine-msg-bubble");
  }

  // ユーザーメッセージを追加
  function addUserMessage(text) {
    clearQuickReplies();
    const messagesEl = document.getElementById("nagamine-chat-messages");
    const msgEl = document.createElement("div");
    msgEl.className = "nagamine-msg user";
    msgEl.innerHTML = `
      <div class="nagamine-msg-bubble">${escapeHtml(text)}</div>
    `;
    messagesEl.appendChild(msgEl);
    scrollToBottom();
  }

  // タイピングインジケーター
  function showTyping() {
    const messagesEl = document.getElementById("nagamine-chat-messages");
    const typingEl = document.createElement("div");
    typingEl.id = "nagamine-typing";
    typingEl.className = "nagamine-msg bot";
    typingEl.innerHTML = `
      <div class="nagamine-msg-avatar">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
      </div>
      <div class="nagamine-msg-bubble" style="background:white;padding:10px 16px;">
        <div class="nagamine-typing-indicator">
          <span></span><span></span><span></span>
        </div>
      </div>
    `;
    messagesEl.appendChild(typingEl);
    scrollToBottom();
  }

  function hideTyping() {
    const typingEl = document.getElementById("nagamine-typing");
    if (typingEl) typingEl.remove();
  }

  // クイック返信ボタンを表示
  function showQuickReplies(replies) {
    const container = document.getElementById("nagamine-quick-replies");
    container.innerHTML = "";
    replies.forEach((reply) => {
      const btn = document.createElement("button");
      btn.className = "nagamine-quick-btn";
      btn.textContent = reply;
      btn.addEventListener("click", () => {
        sendMessage(reply);
      });
      container.appendChild(btn);
    });
  }

  function clearQuickReplies() {
    const container = document.getElementById("nagamine-quick-replies");
    container.innerHTML = "";
  }

  // メッセージ送信
  async function sendMessage(text) {
    if (isLoading || !text.trim()) return;

    isLoading = true;
    const sendBtn = document.getElementById("nagamine-chat-send");
    const inputEl = document.getElementById("nagamine-chat-input");

    sendBtn.disabled = true;
    inputEl.value = "";
    autoResize(inputEl);

    // ユーザーメッセージ表示
    addUserMessage(text);

    // 履歴に追加
    conversationHistory.push({ role: "user", content: text });

    // タイピング表示
    showTyping();

    try {
      const response = await fetch(CONFIG.apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: conversationHistory }),
      });

      if (!response.ok) throw new Error("サーバーエラー");

      hideTyping();

      // ストリーミングレスポンスを処理
      const bubbleEl = addBotMessage("");
      let fullText = "";

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.error) {
              bubbleEl.innerHTML = escapeHtml(data.error);
              break;
            }
            if (data.done) break;
            if (data.text) {
              fullText += data.text;
              bubbleEl.innerHTML = escapeHtml(fullText);
              scrollToBottom();
            }
          } catch (e) {
            // JSON解析エラーは無視
          }
        }
      }

      // 履歴に追加
      if (fullText) {
        conversationHistory.push({ role: "assistant", content: fullText });
      }
    } catch (error) {
      hideTyping();
      addBotMessage(
        "申し訳ございません。一時的な接続エラーが発生しました。\nお電話（06-4869-4618）でもお問い合わせいただけます。"
      );
    } finally {
      isLoading = false;
      sendBtn.disabled = false;
      inputEl.focus();
    }
  }

  // ユーティリティ
  function scrollToBottom() {
    const messagesEl = document.getElementById("nagamine-chat-messages");
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function escapeHtml(text) {
    const escaped = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
    // URLをクリック可能なリンクに変換
    const linked = escaped.replace(
      /(https?:\/\/[^\s<]+)/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer" style="color:#1a73e8;text-decoration:underline;">$1</a>'
    );
    return linked.replace(/\n/g, "<br>");
  }

  function autoResize(el) {
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 100) + "px";
  }

  // イベントバインド
  function bindEvents() {
    const chatBtn = document.getElementById("nagamine-chat-btn");
    const chatWindow = document.getElementById("nagamine-chat-window");
    const closeBtn = document.getElementById("nagamine-chat-close");
    const sendBtn = document.getElementById("nagamine-chat-send");
    const inputEl = document.getElementById("nagamine-chat-input");

    // チャット開閉
    chatBtn.addEventListener("click", () => {
      const isOpen = chatWindow.classList.contains("open");
      if (isOpen) {
        chatWindow.classList.remove("open");
        chatBtn.setAttribute("aria-label", "チャットを開く");
        chatBtn.innerHTML = `
          <svg width="28" height="28" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="17" cy="13" r="8" fill="white" fill-opacity="0.2" stroke="white" stroke-width="2"/>
            <text x="17" y="17.5" text-anchor="middle" fill="white" font-size="9" font-weight="bold" font-family="Arial">AI</text>
            <path d="M13 21 Q13 25 17 25 Q21 25 21 21" stroke="white" stroke-width="2" fill="none" stroke-linecap="round"/>
            <circle cx="27" cy="6" r="1.5" fill="white"/>
            <circle cx="25" cy="3" r="1" fill="white" fill-opacity="0.6"/>
            <circle cx="29" cy="9" r="1" fill="white" fill-opacity="0.6"/>
          </svg>
          <span id="nagamine-chat-btn-label">AIアシスタント</span>
          <div id="nagamine-chat-badge"></div>
        `;
      } else {
        chatWindow.classList.add("open");
        chatBtn.setAttribute("aria-label", "チャットを閉じる");
        chatBtn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        `;
        setTimeout(() => {
          document.getElementById("nagamine-chat-input").focus();
        }, 300);
      }
    });

    // 閉じるボタン
    closeBtn.addEventListener("click", () => {
      chatWindow.classList.remove("open");
      chatBtn.setAttribute("aria-label", "チャットを開く");
      chatBtn.innerHTML = `
        <svg width="28" height="28" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="17" cy="13" r="8" fill="white" fill-opacity="0.2" stroke="white" stroke-width="2"/>
          <text x="17" y="17.5" text-anchor="middle" fill="white" font-size="9" font-weight="bold" font-family="Arial">AI</text>
          <path d="M13 21 Q13 25 17 25 Q21 25 21 21" stroke="white" stroke-width="2" fill="none" stroke-linecap="round"/>
          <circle cx="27" cy="6" r="1.5" fill="white"/>
          <circle cx="25" cy="3" r="1" fill="white" fill-opacity="0.6"/>
          <circle cx="29" cy="9" r="1" fill="white" fill-opacity="0.6"/>
        </svg>
        <span id="nagamine-chat-btn-label">AIアシスタント</span>
        <div id="nagamine-chat-badge"></div>
      `;
    });

    // 送信ボタン
    sendBtn.addEventListener("click", () => {
      const text = inputEl.value.trim();
      sendMessage(text);
    });

    // Enterキー送信（Shift+Enterは改行）
    inputEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        const text = inputEl.value.trim();
        sendMessage(text);
      }
    });

    // 自動リサイズ
    inputEl.addEventListener("input", () => {
      autoResize(inputEl);
    });
  }

  // 初期化
  function init() {
    createWidget();
    bindEvents();
    showWelcomeMessage();
  }

  // DOMContentLoaded後に初期化
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
