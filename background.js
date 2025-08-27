// background.js (Manifest V3 service worker)

// ⚠️ TEMPORARY for learning: put your key here.
// Later, move to a small server proxy so you don't ship secrets.
const KEY_STORAGE = 'openai_api_key';

async function getKey() {
  const { [KEY_STORAGE]: key } = await chrome.storage.local.get(KEY_STORAGE);
  return (key || '').trim();
}
async function setKey(k) {
  await chrome.storage.local.set({ [KEY_STORAGE]: (k || '').trim() });
}
async function clearKey() {
  await chrome.storage.local.remove(KEY_STORAGE);
}

// ---- Open our popup.html programmatically (small dialog style)
async function openKeyPopup() {
  const url = chrome.runtime.getURL('popup.html');
  // Opens the action popup (popup.html from manifest "action.default_popup")
  await chrome.action.openPopup();
}

// ---- Messaging
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    switch (message?.type) {
      case 'ai-key:get': {
        const key = await getKey();
        sendResponse({ hasKey: !!key });
        break;
      }
      case 'ai-key:prompt': {
        await openKeyPopup();
        sendResponse({ ok: true });
        break;
      }
      case 'ai-key:set': {
        const k = String(message.key || '');
        await setKey(k);
        // Notify the active tab that key is ready
        const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        if (tab?.id) {
          chrome.tabs.sendMessage(tab.id, { type: 'ai-key:ready' });
        }
        sendResponse({ ok: true });
        break;
      }
      case 'ai-key:clear': {
        await clearKey();
        sendResponse({ ok: true });
        break;
      }
      case 'ai-chat:ask': {
        try {
          const { prompt } = message;
          const answer = await askOpenAI(prompt);
          sendResponse({ ok: true, answer });
        } catch (err) {
          sendResponse({ ok: false, error: err.message || String(err) });
        }
        break;
      }
      default:
        sendResponse({ ok: false, error: 'Unknown message type' });
    }
  })();
  // Required to keep the message channel open for async response
  return true;
});

// ---- Call OpenAI with stored key
async function askOpenAI(userPrompt) {
  if (!userPrompt || !userPrompt.trim()) {
    throw new Error('Prompt is empty.');
  }

  const OPENAI_API_KEY = await getKey();
  if (!OPENAI_API_KEY) {
    throw new Error('No API key set. Click AI Helper and enter your key.');
  }

  const body = {
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: userPrompt }
    ],
    temperature: 0.2
  };

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API error (${res.status}): ${text || res.statusText}`);
  }

  const data = await res.json();
  const answer = data?.choices?.[0]?.message?.content ?? "";
  if (!answer) throw new Error("No answer from model.");
  return answer.trim();
}