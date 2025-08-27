// content.js

console.log('Content script loaded - version 1.1'); // Debug version check

const codingDescContainerClass = 'py-4 px-3 coding_desc_container__gdB9M';

let lastVisitedPage = "";

const observer = new MutationObserver(() => {
    handleContentChange();
});

observer.observe(document.body, {childList: true, subtree: true});

handleContentChange();

function handleContentChange(){
    if (isPageChange()) handlePageChange();
}

function isPageChange(){
    const currentPage = window.location.pathname;
    if(lastVisitedPage===currentPage) return false;
    lastVisitedPage = currentPage;
    return true;
}

function onTargetPage(){
    const pathname = window.location.pathname;
    return pathname.startsWith("/problems/") && pathname.length > "/problems/".length;
}

function cleanUpPage(){
    const existingButton = document.getElementById('ai-help-button');
    if(existingButton) existingButton.remove();

    const existingChatContainer = document.getElementById('ai-chat-container');
    if(existingChatContainer) existingChatContainer.remove();

    chrome.runtime.sendMessage({ type: 'ai-key:clear' }).catch(()=>{});
}

function handlePageChange(){
    if(onTargetPage()){
        cleanUpPage();
        addAIChatbotButton();
    }
}

async function hasApiKey() {
  try {
    const resp = await chrome.runtime.sendMessage({ type: 'ai-key:get' });
    return !!resp?.hasKey;
  } catch { return false; }
}

async function promptForApiKey() {
  await chrome.runtime.sendMessage({ type: 'ai-key:prompt' });
  // Wait until popup saves the key (background will send 'ai-key:ready')
  return new Promise((resolve) => {
    const onMsg = (msg) => {
      if (msg?.type === 'ai-key:ready') {
        chrome.runtime.onMessage.removeListener(onMsg);
        resolve(true);
      }
    };
    chrome.runtime.onMessage.addListener(onMsg);
  });
}

function addAIChatbotButton(){
    // Avoid duplicates
    if (document.getElementById('ai-help-button')) return;

    const codingDescContainer = document.getElementsByClassName(codingDescContainerClass)[0];
    if (!codingDescContainer) return;

    const button = document.createElement('button');
    button.id = 'ai-help-button';
    button.innerText = 'AI Helper';
    button.style.position = 'relative';
    button.style.marginTop = '10px';
    button.style.marginBottom = '10px';
    button.style.zIndex = '1000';
    button.style.padding = '10px 16px';
    button.style.backgroundColor = '#007bff';
    button.style.color = '#fff';
    button.style.border = 'none';
    button.style.borderRadius = '8px';
    button.style.cursor = 'pointer';
    button.style.boxShadow = '0 2px 6px rgba(0,0,0,0.2)';
    button.style.fontSize = '14px';
    button.style.fontWeight = 'bold';

    button.addEventListener('click', async () => {
        try {
            await toggleAIChatContainer();
        } catch (err) {
            console.error("Error in toggleAIChatContainer:", err);
        }
    });

    codingDescContainer.insertAdjacentElement("beforeend", button);
}

async function toggleAIChatContainer(){
    console.log('AI Helper button clicked!'); // Debug log

        // 1) Ensure we have a key
    let ok = await hasApiKey();
    if (!ok) {
        console.log('No API key found. Opening popup...');
        await promptForApiKey();
        ok = await hasApiKey();
        if (!ok) {
            console.warn('User closed popup or did not save a key. Aborting.');
            return; // do NOT create the chat
        }
        console.log('API key saved. Proceeding to open chat.');
    }

    // 2) Now handle chat container UI
    let container = document.getElementById('ai-chat-container');
    if (!container) {
        console.log('Creating chat container...'); // Debug log
        // create first time
        createAIChatContainer();
        container = document.getElementById('ai-chat-container');
        if (container) {
            console.log('Chat container created successfully'); // Debug log
        } else {
            console.error('Failed to create chat container'); // Debug log
        }
    } else {
        console.log('Toggling existing container...'); // Debug log
        // toggle visibility
        if (container.style.display === 'none') {
            container.style.display = 'flex';
            console.log('Container made visible');
        } else {
            container.style.display = 'none';
            console.log('Container hidden');
        }
    }
}


function createAIChatContainer(){
    console.log('createAIChatContainer called'); // Debug log
    
    // Avoid duplicates
    if (document.getElementById('ai-chat-container')) {
        console.log('Chat container already exists');
        return;
    }

    try {
        console.log('codingDescContainerClass:', codingDescContainerClass); // Debug the variable

        const box = document.createElement('div');
        box.id = 'ai-chat-container';
        // Make it visible by default when created
        box.style.display = 'flex';
        box.style.flexDirection = 'column';

        // container style (block element in flow, full width of parent)
        box.style.width = '100%';
        box.style.maxWidth = '780px';
        box.style.height = '400px';
        box.style.background = '#fff';
        box.style.border = '1px solid #e5e7eb';
        box.style.borderRadius = '10px';
        box.style.boxShadow = '0 8px 20px rgba(0,0,0,0.08)';
        box.style.margin = '10px 0 16px 0';
        box.style.overflow = 'hidden';

        // Header
        const header = document.createElement('div');
        header.innerText = 'AI Chat';
        header.style.background = '#007bff';
        header.style.color = '#fff';
        header.style.padding = '8px';
        header.style.textAlign = 'center';
        header.style.borderTopLeftRadius = '10px';
        header.style.borderTopRightRadius = '10px';
        header.style.fontWeight = 'bold';

        // Chat area
        const messages = document.createElement('div');
        messages.id = 'ai-chat-messages';
        messages.style.flex = '1';
        messages.style.padding = '10px';
        messages.style.overflowY = 'auto';
        messages.style.fontSize = '14px';
        messages.style.display = 'flex';
        messages.style.flexDirection = 'column';

        // input form
        const form = document.createElement('form');
        form.id = 'ai-form';
        form.style.display = 'grid';
        form.style.gridTemplateColumns = '1fr auto';
        form.style.gap = '8px';
        form.style.padding = '10px';
        form.style.borderTop = '1px solid #f1f5f9';
        form.style.background = '#fff';

        const input = document.createElement('textarea');
        input.id = 'ai-chat-input';
        input.placeholder = 'Type a message...';
        input.rows = 1;
        input.style.resize = 'none';
        input.style.border = '1px solid #e5e7eb';
        input.style.borderRadius = '8px';
        input.style.padding = '8px 10px';
        input.style.font = 'inherit';
        input.style.outline = 'none';

        const send = document.createElement('button');
        send.id = 'ai-chat-send';
        send.type = 'submit';
        send.innerText = 'Send';
        send.style.border = 'none';
        send.style.borderRadius = '8px';
        send.style.padding = '8px 14px';
        send.style.cursor = 'pointer';
        send.style.background = '#111827';
        send.style.color = '#fff';
        send.style.fontWeight = '600';

        form.appendChild(input);
        form.appendChild(send);

        box.appendChild(header);
        box.appendChild(messages);
        box.appendChild(form);

        // Enter to send, Shift+Enter for newline
        input.addEventListener('keydown', function(e){
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                form.requestSubmit();
            }
        });

        // autosize 1–6 lines
        input.addEventListener('input', function(){
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 6 * 20) + 'px';
        });

        form.addEventListener('submit', async function(e){
            e.preventDefault();
            const text = input.value.trim();
            if (!text) return;

            addMsg('user', text);
            input.value = '';
            input.style.height = 'auto';
            setBusy(true);

            try {
                // 👇 send message to background.js
                const resp = await chrome.runtime.sendMessage({
                    type: "ai-chat:ask",
                    prompt: text
                });

                if (resp?.ok) {
                    addMsg('assistant', resp.answer);
                } else {
                    addMsg('assistant', resp?.error || "No response from AI.");
                }
            } catch (err) {
                addMsg('assistant', "Network error: " + err.message);
            } finally {
                setBusy(false);
            }
        });


        function setBusy(b){
            send.disabled = b;
            send.innerText = b ? '…' : 'Send';
        }

        function addMsg(role, text){
            const bubble = document.createElement('div');
            bubble.innerText = text;
            bubble.style.maxWidth = '90%';
            bubble.style.padding = '8px 10px';
            bubble.style.margin = '6px 0';
            bubble.style.borderRadius = '10px';
            bubble.style.whiteSpace = 'pre-wrap';
            bubble.style.wordBreak = 'break-word';

            if (role === 'user') {
                bubble.style.marginLeft = 'auto';
                bubble.style.background = '#e0f2fe';
            } else {
                bubble.style.marginRight = 'auto';
                bubble.style.background = '#f1f5f9';
            }

            messages.appendChild(bubble);
            messages.scrollTop = messages.scrollHeight;
        }

        function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

        // Insert the chat container into the same parent as the button
        const helperBtn = document.getElementById('ai-help-button');
        const codingDescContainer = document.getElementsByClassName(codingDescContainerClass)[0];
        
        console.log('Helper button found:', !!helperBtn);
        console.log('Coding desc container found:', !!codingDescContainer);
        
        if (helperBtn && codingDescContainer) {
            codingDescContainer.appendChild(box);
            console.log('Chat container appended to coding desc container');
        } else if (document.body) {
            // Fallback: append to body if containers not found
            document.body.appendChild(box);
            console.log('Chat container appended to body as fallback');
        }
        
        // Verify the container was added
        const addedContainer = document.getElementById('ai-chat-container');
        console.log('Container verification after insertion:', !!addedContainer);

    } catch (error) {
        console.error('Error in createAIChatContainer:', error);
        // Create a simple fallback container
        const fallbackBox = document.createElement('div');
        fallbackBox.id = 'ai-chat-container';
        fallbackBox.innerHTML = '<div style="padding: 20px; background: #fff; border: 1px solid #ccc;">Chat container error. Please refresh the page.</div>';
        if (document.body) {
            document.body.appendChild(fallbackBox);
        }
    }
}

