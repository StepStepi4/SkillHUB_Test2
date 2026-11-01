    const CACHE_KEY = 'skillhub_v1_flat';
    let simData = [];
    let currentScenario = null;

    // Векторні Аватарки (Можна замінити на <img> якщо потрібно)
    const clientAvatar = `
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/></svg>
    `;
    const consultantAvatar = `
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
    `;

    window.onload = () => {
        let cachedData = localStorage.getItem(CACHE_KEY);
        if (cachedData) {
            let parsedDb = JSON.parse(cachedData);
            if (parsedDb && parsedDb.simulatorData && parsedDb.simulatorData.length > 0) {
                simData = parsedDb.simulatorData;
                renderMenu();
            } else {
                document.getElementById('scenariosList').innerHTML = `<div style="text-align:center; color:var(--text-muted); margin-top:40px;">Немає даних для тренажера. Переконайтеся, що вкладка у таблиці називається "💬 Тренажер заперечень" і оновіть базу.</div>`;
            }
        } else {
            document.getElementById('scenariosList').innerHTML = `<div style="text-align:center; color:var(--text-muted); margin-top:40px;">Спочатку відкрийте головний додаток для завантаження бази даних.</div>`;
        }
    };

    function renderMenu() {
        const list = document.getElementById('scenariosList');
        list.innerHTML = simData.map((item, index) => {
            return `
            <div class="scenario-card" onclick="openChat(${index})">
                <div class="scenario-title">"${item.objection}"</div>
                <div style="color:var(--primary); font-weight:bold;">❯</div>
            </div>
            `;
        }).join('');
    }

    function switchView(viewId) {
        document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
        document.getElementById(viewId).classList.add('active');
    }

    function closeChat() {
        switchView('menuView');
        document.getElementById('chatArea').innerHTML = '';
        document.getElementById('choicesPanel').innerHTML = '';
    }

    function scrollToBottom() {
        const chatArea = document.getElementById('chatArea');
        chatArea.scrollTo({ top: chatArea.scrollHeight, behavior: 'smooth' });
    }

    function shuffleArray(array) {
        let newArr = [...array];
        for (let i = newArr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
        }
        return newArr;
    }

    function openChat(index) {
        currentScenario = simData[index];
        const chatArea = document.getElementById('chatArea');
        const choicesPanel = document.getElementById('choicesPanel');
        
        chatArea.innerHTML = '';
        choicesPanel.innerHTML = '';
        switchView('chatView');

        setTimeout(() => {
            chatArea.innerHTML += `<div id="typing" class="typing">Клієнт друкує...</div>`;
            scrollToBottom();
            
            setTimeout(() => {
                document.getElementById('typing').remove();
                chatArea.innerHTML += `
                    <div class="chat-row client">
                        <div class="avatar avatar-client">${clientAvatar}</div>
                        <div class="bubble bubble-client">${currentScenario.objection}</div>
                    </div>
                `;
                scrollToBottom();
                showOptions();
            }, 1000);
            
        }, 300);
    }

    function showOptions() {
        const choicesPanel = document.getElementById('choicesPanel');
        let options = shuffleArray(currentScenario.responses);
        
        let html = `<div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: var(--text-muted); margin-bottom: 4px; text-align: center;">Оберіть вашу відповідь:</div>`;
        html += options.map(opt => `
            <button class="choice-btn" onclick="sendResponse(this)">${opt}</button>
        `).join('');
        
        choicesPanel.innerHTML = html;
        scrollToBottom();
    }

    function sendResponse(btnEl) {
        const text = btnEl.innerText;
        const chatArea = document.getElementById('chatArea');
        const choicesPanel = document.getElementById('choicesPanel');
        
        choicesPanel.innerHTML = ''; 
        
        chatArea.innerHTML += `
            <div class="chat-row consultant">
                <div class="bubble bubble-consultant">${text}</div>
                <div class="avatar avatar-consultant">${consultantAvatar}</div>
            </div>
        `;
        scrollToBottom();

        setTimeout(() => {
            choicesPanel.innerHTML = `
                <button class="choice-btn" style="text-align: center; color: var(--primary); border-color: var(--primary);" onclick="showOptions()">🔄 Спробувати іншу відповідь</button>
                <button class="choice-btn" style="text-align: center; background: var(--bg); color: var(--text-main);" onclick="closeChat()">Повернутися до списку</button>
            `;
            scrollToBottom();
        }, 800);
    }
