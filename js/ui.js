// === ПОЛЬЗОВАТЕЛЬСКИЙ ИНТЕРФЕЙС И DOM (ui.js) ===

const elCatInput = document.getElementById('catInput');
const elClearBtn = document.getElementById('clearAllBtn');
const elSuggList = document.getElementById('customSuggestions');
const elPriceInput = document.getElementById('devicePrice');
const elPriceWrapper = document.getElementById('priceWrapper');
const elOkBtn = document.getElementById('okBtn');
const elResultBox = document.getElementById('result');
const elTechInfo = document.getElementById('techInfo');
const elServiceList = document.getElementById('serviceList');
const scrollTopBtn = document.getElementById('scrollTopBtn');
const compareBar = document.getElementById('compareBar');

const tabTitles = {
    'tab-search': 'SkillHUB Assistant',
    'tab-reserves': 'Активні резерви',
    'tab-skillhub': 'SkillHUB',
    'tab-settings': 'Налаштування'
};

// --- МАСШТАБИРОВАНИЕ И ТЕМА ---
window.updateFontScale = function(scale) {
    localStorage.setItem('skillhub_font_scale', scale);
    let style = document.getElementById('dynamicFontScale');
    if(!style) { 
        style = document.createElement('style'); 
        style.id = 'dynamicFontScale'; 
        document.head.appendChild(style); 
    }
    style.innerHTML = `
        :root { --nav-height: calc(76px * ${scale}); }
        input, select, textarea, button, .btn { font-size: calc(16px * ${scale}) !important; }
        .list-item-title { font-size: calc(16px * ${scale}) !important; }
        .list-item-subtitle { font-size: calc(13px * ${scale}) !important; }
        .list-item-value { font-size: calc(16px * ${scale}) !important; }
        .sc-title { font-size: calc(15px * ${scale}) !important; }
        .sc-price { font-size: calc(15px * ${scale}) !important; }
        .tech-val { font-size: calc(14px * ${scale}) !important; }
        .tech-label { font-size: calc(11px * ${scale}) !important; }
        .desc-line div { font-size: calc(13px * ${scale}) !important; }
        .modal-title { font-size: calc(18px * ${scale}) !important; }
        .rating-name { font-size: calc(15px * ${scale}) !important; }
        .rating-score { font-size: calc(15px * ${scale}) !important; }
        .rating-desc { font-size: calc(12px * ${scale}) !important; }
        .rezervy-name { font-size: calc(14px * ${scale}) !important; }
        .rezervy-cat { font-size: calc(12px * ${scale}) !important; }
        .rezervy-price { font-size: calc(15px * ${scale}) !important; }
        .sc-brand { font-size: calc(10px * ${scale}) !important; }
        .status-badge { font-size: calc(11px * ${scale}) !important; }
        .ua-name { font-size: calc(20px * ${scale}) !important; }
        .nav-item span { font-size: calc(11px * ${scale}) !important; }
        .nav-icon { width: calc(24px * ${scale}) !important; height: calc(24px * ${scale}) !important; }
        .nav-icon.icon-bulb { width: calc(28px * ${scale}) !important; height: calc(28px * ${scale}) !important; }
    `;
};

let savedFontScale = localStorage.getItem('skillhub_font_scale') || "1";
if(document.getElementById('fontSizeSlider')) document.getElementById('fontSizeSlider').value = savedFontScale;
window.updateFontScale(savedFontScale);

let currentTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', currentTheme);

function updateToggleUI() {
    const toggle = document.getElementById('themeToggle');
    if(toggle) {
        if(currentTheme === 'dark') toggle.classList.add('active');
        else toggle.classList.remove('active');
    }
}
updateToggleUI();

let tTog = document.getElementById('themeToggle');
if(tTog) {
    tTog.onclick = () => {
        currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', currentTheme);
        localStorage.setItem('theme', currentTheme);
        updateToggleUI();
    };
}

// --- УПРАВЛЕНИЕ ВКЛАДКАМИ ---
window.switchTab = function(tabId) {
    document.querySelectorAll('.app-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    
    document.getElementById(tabId).classList.add('active');
    let activeNavBtn = document.querySelector(`.nav-item[onclick*="${tabId}"]`);
    if (activeNavBtn) activeNavBtn.classList.add('active');

    document.getElementById('headerTitle').innerText = tabTitles[tabId];
    document.getElementById('statusContainer').style.display = (tabId === 'tab-search') ? 'flex' : 'none';

    if (window.isCompareMode) window.toggleCompareMode();
    if (window.isModalCompareMode) window.toggleModalCompareMode();
    if (compareBar) compareBar.classList.remove('show');
    if (tabId === 'tab-reserves') window.renderRezervyList();
    window.scrollTo(0, 0);
};

// --- ФУНКЦИИ БАЗОВОГО ИНТЕРФЕЙСА ---
window.enableUI = function() { 
    if(elCatInput) elCatInput.disabled = false; 
    if (window.db.appVersion && !window.db.appVersion.startsWith("Error")) {
        window.safeUpdateHTML('appVersionDisp', `Версія ${window.db.appVersion}`);
        document.getElementById('appVersionDisp').style.display = 'inline-block';
    }
    document.getElementById('appLoader').classList.add('hidden');
};

window.saveDefaultStore = function() {
    const val = document.getElementById('defaultStoreSelect').value;
    try { localStorage.setItem('skillhub_default_store', val); } catch(e){}
    const reserveFilter = document.getElementById('storeFilter');
    if (reserveFilter) {
        reserveFilter.value = val;
        if (document.getElementById('tab-reserves').classList.contains('active')) window.renderRezervyList();
    }
};

window.populateFilters = function() {
    const storeSel = document.getElementById('storeFilter');
    const defaultSel = document.getElementById('defaultStoreSelect');
    
    if (window.db.rezervyData) {
        const stores = [...new Set(window.db.rezervyData.map(r => r.store))].sort();
        let h = '<option value="">-- Оберіть магазин --</option>';
        stores.forEach(s => { if (s && s !== "Не вказано") h += `<option value="${s}">${s}</option>`; });
        
        let currentStoreSelVal = storeSel ? storeSel.value : null;
        let currentDefaultSelVal = defaultSel ? defaultSel.value : null;

        if(storeSel) window.safeUpdateHTML(storeSel, h);
        if(defaultSel) window.safeUpdateHTML(defaultSel, h.replace('Оберіть магазин', 'Не вибрано'));
        
        let savedStore = currentStoreSelVal || currentDefaultSelVal || (function(){ try { return localStorage.getItem('skillhub_default_store'); } catch(e){ return null; } })();
        if (savedStore) { 
            if(storeSel) storeSel.value = savedStore; 
            if(defaultSel) defaultSel.value = savedStore; 
        }
    }
};

// --- УПРАВЛЕНИЕ МОДАЛЬНЫМИ ОКНАМИ ---
window.checkOpenModals = function() {
    const modals = ['descModal', 'compareModal', 'rezervItemModal', 'galleryModal', 'sellerModal', 'certManualModal', 'ratingModal', 'klochCalcModal'];
    for (let id of modals) {
        let el = document.getElementById(id);
        if (el && el.classList.contains('show')) return true;
    }
    return false;
};

window.closeModalBase = function(modalId) {
    document.getElementById(modalId).classList.remove('show');
    if (!window.checkOpenModals()) {
        document.body.classList.remove('modal-open');
        document.body.style.top = '';
        window.scrollTo(0, window.savedScrollY);
    }
    if (modalId === 'descModal' || modalId === 'rezervItemModal' || modalId === 'sellerModal' || modalId === 'certManualModal' || modalId === 'ratingModal' || modalId === 'klochCalcModal') {
        if (window.isModalCompareMode) {
            window.isModalCompareMode = false;
            window.modalCompareSelection = [];
            if (compareBar) compareBar.classList.remove('show');
            document.querySelectorAll('.compare-toggle-btn').forEach(btn => {
                btn.innerText = 'Порівняти'; btn.classList.remove('active');
            });
            if (document.getElementById('montazhCity')) window.updateMontazhResults(); 
            else if (document.querySelector('#rezervItemModal.show')) window.updateRezervResults();
            else window.updateSetupResults();
        }
    }
};

window.openModalBase = function(modalId, name = "", code = "", priceLabel = "") {
    try {
        if (name && modalId === 'descModal') {
            let title = name.replace(/🇺🇦\s*/g, '').replace(/^UA\s+/i, '').replace(/^\[.*?\]\s*/, ''); 
            let priceLabelHtml = "";
            if (priceLabel && priceLabel !== "Дізнатись" && priceLabel !== "Обрати пакет") {
                priceLabelHtml = `<div style="font-size: 16px; font-weight: 800; color: var(--primary); white-space: nowrap; margin-left: 10px; background: var(--input-bg); padding: 4px 8px; border-radius: 8px;">${priceLabel}</div>`;
            }
            document.getElementById('modalTitle').innerHTML = `<div style="display:flex; align-items:flex-start; justify-content:space-between; width:100%; gap:10px;">
                <span style="line-height:1.2;">${title}</span>${priceLabelHtml}
            </div>`;
            
            const raw = window.findInDb(window.db.descriptions, name) || "";
            let p = window.currentDevicePrice || parseFloat(document.getElementById('devicePrice').value) || 0;
            let comboHtml = "";

            if (p > 0) {
                let tariffs = window.db.tariffs.filter(t => {
                    let n1 = window.normalizeServiceName(t.service); let n2 = window.normalizeServiceName(name);
                    return n1 === n2 || (t.serviceRu && window.normalizeServiceName(t.serviceRu) === n2);
                });
                let validTariffs = tariffs.filter(t => t.maxPrice > 0 && t.maxPrice < p).sort((a,b) => b.maxPrice - a.maxPrice);
                let allCombos = [];
                function findCombos(startIndex, currentCombo, currentSum) {
                    if (currentSum >= p) { allCombos.push({ combo: [...currentCombo], sum: currentSum }); return; }
                    if (currentCombo.length >= 4) return;
                    for (let i = startIndex; i < validTariffs.length; i++) {
                        currentCombo.push(validTariffs[i]);
                        findCombos(i, currentCombo, currentSum + validTariffs[i].maxPrice);
                        currentCombo.pop();
                    }
                }
                findCombos(0, [], 0);

                allCombos.sort((a, b) => { let diffA = a.sum - p; let diffB = b.sum - p; if (diffA !== diffB) return diffA - diffB; return a.combo.length - b.combo.length; });
                let uniqueCombos = []; let seenSignatures = new Set();
                for (let c of allCombos) {
                    let sig = c.combo.map(t => t.maxPrice).sort((x, y) => x - y).join('-');
                    if (!seenSignatures.has(sig)) { seenSignatures.add(sig); uniqueCombos.push(c); }
                }

                let topCombos = uniqueCombos.slice(0, 2);
                if (topCombos.length > 0) {
                    let comboVariantsHtml = topCombos.map((comboObj, vIdx) => {
                        let totalComboPrice = 0;
                        let comboItemsHtml = comboObj.combo.map(t => {
                            let minP = t.minPrice || 0; let maxP = t.maxPrice || 0; let tName = t.service;
                            let cleanName = tName.replace(/^\[.*?\]\s*/, '').trim(); let brandMatch = tName.match(/^\[(.*?)\]/);
                            let brand = brandMatch ? brandMatch[1] : ""; let displayName = brand ? `[${brand}] ${cleanName}` : cleanName;
                            if (!displayName.includes(maxP.toString())) displayName += ` (${minP.toLocaleString('uk-UA')} - ${maxP.toLocaleString('uk-UA')})`;
                            
                            let tPriceStr = ""; let tPriceNum = 0;
                            if (t.cost) {
                                let cStr = String(t.cost).trim();
                                if (cStr.includes('%')) tPriceNum = Math.round(maxP * parseFloat(cStr.replace(',', '.'))/100);
                                else tPriceNum = parseFloat(cStr.replace(/\s+/g, '').replace(',', '.'));
                                if (!isNaN(tPriceNum)) { totalComboPrice += tPriceNum; tPriceStr = tPriceNum.toLocaleString('uk-UA') + " ₴"; } 
                                else tPriceStr = cStr;
                            }
                            return `
                            <div style="margin-bottom: 8px; background: var(--card-bg); border-radius: 8px; padding: 12px; border: 1px solid var(--border);">
                                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; gap: 10px;">
                                    <div style="font-size: 13px; font-weight: 700; color: var(--text-main); line-height: 1.3;">${displayName}</div>
                                    <div style="font-size: 14px; font-weight: 800; color: var(--primary); white-space: nowrap;">${tPriceStr}</div>
                                </div>
                                <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(0,0,0,0.05); padding-top: 8px;">
                                    <span style="font-size: 12px; color: var(--text-muted);">Код товару:</span>
                                    <span style="font-size: 15px; font-weight: 800; color: var(--text-main); cursor: pointer;" onclick="window.copyCode(event, this, '${t.code}')">${t.code} 📋</span>
                                </div>
                            </div>`;
                        }).join('');

                        let sumHtml = comboObj.sum.toLocaleString('uk-UA'); let certCount = comboObj.combo.length;
                        let certWord = (certCount >= 2 && certCount <= 4) ? "сертифікати" : "сертифікатів";
                        let variantTitle = `Варіант ${vIdx + 1} (${certCount} ${certWord})`;

                        return `
                        <div style="margin-bottom: 20px;">
                            <div style="font-size: 11px; font-weight: 800; color: var(--text-muted); text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px; text-align: center;">${variantTitle}</div>
                            ${comboItemsHtml}
                            <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 8px; background: var(--card-bg); padding: 12px; border-radius: 8px; border: 1px solid var(--primary-light);">
                                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: var(--text-muted);">
                                    <span>Сума діапазонів:</span><span style="font-weight:700; color:var(--text-main);">${sumHtml} ₴</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 13px; font-weight: 700;">
                                    <span>Загальна вартість:</span><span style="color:var(--primary); font-size: 16px;">${totalComboPrice.toLocaleString('uk-UA')} ₴</span>
                                </div>
                            </div>
                        </div>`;
                    }).join('');

                    comboHtml = `
                        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px dashed var(--border);">
                            <button class="btn" style="background: var(--primary-light); color: var(--rozetka-green-dark); font-weight: 800; width: 100%; border: 1px dashed var(--primary);" onclick="this.nextElementSibling.style.display='block'; this.style.display='none';">🧩 Об'єднати сертифікати</button>
                            <div style="display: none; background: var(--input-bg); padding: 16px; border-radius: 12px; border: 1px solid var(--border); animation: fade 0.2s ease;">
                                <div style="text-align:center; font-size:13px; color:var(--text-muted); font-weight:600; margin-bottom:16px;">Об'єднання для ${p.toLocaleString('uk-UA')} ₴</div>
                                ${comboVariantsHtml}
                            </div>
                        </div>`;
                }
            }

            document.getElementById('modalBody').innerHTML = window.generateDescToggleHTML(raw, code).replace('display: none;', 'display: block;').replace('Детальніше', 'Опис сервісу') + comboHtml;
            let dc = document.getElementById('modalBody').querySelector('.desc-content');
            if(dc) dc.classList.add('show');
        }

        if (!document.body.classList.contains('modal-open')) {
            window.savedScrollY = window.scrollY;
            document.body.style.top = `-${window.savedScrollY}px`;
            document.body.classList.add('modal-open');
        }
        document.getElementById(modalId).classList.add('show');
    } catch(e) { console.error(e); }
};

window.openModal = function(name, code = "", priceLabel = "") {
    let nameClean = window.normalizeServiceName(name); let u = String(name).toUpperCase(); 
    let isSetupCategory = window.db.tariffs.some(t => t.cat && window.normalizeServiceName(t.cat) === nameClean);
    let isStaticEpz = (u.includes('WINDOWS') || u.includes('OFFICE') || u.includes('ESD') || u.includes('[ESD]')) && !u.includes('НАЛАШТУВАННЯ') && !u.includes('ВСТАНОВЛЕННЯ') && !u.includes('АНТИВІРУС');

    if (!isStaticEpz) {
        if (u.includes('МОНТАЖ') || u.includes('ПІДКЛЮЧЕННЯ') || (u.includes('ВСТАНОВЛЕННЯ') && !u.includes('ЗАХИСН'))) { document.getElementById('modalTitle').innerText = "Монтаж ВПТ"; window.openModalBase('descModal'); window.renderMontazhModal(); return; } 
        else if (u.includes('ПЕРЕВІРКА') || u.includes('ПІКСЕЛ')) { document.getElementById('modalTitle').innerText = "Перевірка на биті пікселі"; window.openModalBase('descModal'); window.renderDirectListModal(["перевірка", "піксел"]); return; } 
        else if (u.includes('ПОКЛЕЙКА') || u.includes('ЗАХИСН') || u.includes('СКЛО') || u.includes('ПЛІВК')) { document.getElementById('modalTitle').innerText = "Поклейка скла та плівок"; window.openModalBase('descModal'); window.renderDirectListModal(["поклейка", "скло", "плівк", "захисн"]); return; }
        else if (u.includes('АНТИВІРУС') || u.includes('ESET')) { document.getElementById('modalTitle').innerText = "Антивіруси"; window.openModalBase('descModal'); window.renderSetupModal(name, "antivirus"); return; }
        else if (u.includes('КІНОТЕАТР') || u.includes('SWEET') || u.includes('PARALLELS')) { document.getElementById('modalTitle').innerText = u.includes('PARALLELS') ? "Parallels Desktop" : "Онлайн кінотеатри"; window.openModalBase('descModal'); window.renderDirectListModal(u.includes('PARALLELS') ? ["parallels"] : ["sweet", "кінотеатр"]); return; }
        else if (isSetupCategory || u.includes('НАЛАШТУВАННЯ') || u.includes('ПЗ') || u.includes('ПОСЛУГИ') || u.includes('ГОДИНА РОБОТИ')) { document.getElementById('modalTitle').innerText = "Налаштування та сервіси"; window.openModalBase('descModal'); window.renderSetupModal(name, "setup"); return; }
    }
    window.openModalBase('descModal', name, code, priceLabel);
};

window.showChangelogModal = function(version, changelogText) {
    document.getElementById('modalTitle').innerHTML = `Оновлення v${version}`;
    let blocks = String(changelogText).split(/(?:\r?\n)?\s*--\s*(?:\r?\n)?/);
    let html = '<div style="display:flex; flex-direction:column; gap:12px;">';
    
    blocks.forEach((block) => {
        if (!block.trim()) return;
        let lines = block.split(/\r?\n/);
        let blockHtml = '';
        
        lines.forEach((line, index) => {
            let l = line.trim(); if (!l) return;
            let lineStyle = "";
            if (l.startsWith('(AA+)')) { l = l.substring(5).trim().toUpperCase(); lineStyle += " font-weight:800;"; } 
            else if (l.startsWith('(Аа+)')) { l = l.substring(5).trim(); l = l.charAt(0).toUpperCase() + l.slice(1); lineStyle += " font-weight:800;"; } 
            else if (l.startsWith('(аа*)')) { l = l.substring(5).trim(); lineStyle += " font-style:italic;"; } 
            else if (l.startsWith('(КР+)')) { l = l.substring(5).trim().toUpperCase(); lineStyle += " font-weight:800; color:var(--danger);"; } 
            else if (l.startsWith('(Кр+)')) { l = l.substring(5).trim(); lineStyle += " font-weight:800; color:var(--danger);"; } 
            else if (l.startsWith('(кр*)')) { l = l.substring(5).trim(); lineStyle += " font-style:italic; color:var(--danger);"; }

            l = l.replace(/([\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/g, '<span style="font-size: 1.5em; vertical-align: middle; line-height: 1;">$1</span>');
            let margin = blockHtml !== '' ? "margin-top: 6px;" : "";
            blockHtml += `<div style="${lineStyle} ${margin}">${l}</div>`;
        });
        if (blockHtml) html += `<div style="background:var(--card-bg); padding:12px 16px; border-radius:16px; border:1px solid var(--border); box-shadow: 0 2px 8px rgba(0,0,0,0.04); font-size:14px; line-height:1.5; color:var(--text-main);">${blockHtml}</div>`;
    });
    html += '</div>';
    window.safeUpdateHTML('modalBody', html);
    window.openModalBase('descModal');
};

// --- ВЕРХНИЙ СКРОЛЛ ---
let isScrolling = false;
window.addEventListener('scroll', () => {
    if (!isScrolling) {
        window.requestAnimationFrame(() => {
            if (window.scrollY > 200) { if(scrollTopBtn) scrollTopBtn.classList.add('show'); }
            else { if(scrollTopBtn) scrollTopBtn.classList.remove('show'); }
            isScrolling = false;
        });
        isScrolling = true;
    }
});

if(scrollTopBtn) scrollTopBtn.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });

// --- ЛОГИКА РЕНДЕРИНГА HTML БЛОКОВ ---
window.parseDescriptionLines = function(descE) {
    let safeDesc = descE ? String(descE).trim() : "";
    if (!safeDesc || safeDesc === "Опис відсутній...") return `<div class="desc-line" style="color: var(--text-muted); font-style: italic; justify-content: center;">Опис відсутній...</div>`;
    let html = ``;
    html += safeDesc.replace(/\|/g, '\n').split(/\r?\n/).map(line => {
        const l = line.trim(); if (!l) return '';
        if (l.startsWith('+')) return `<div style="font-weight:700; font-size:14px; color:var(--text-main); margin: 12px 0 6px 0;">${l.substring(1).trim()}</div>`;
        if (l.startsWith('=')) return `<div style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--text-muted); margin: 12px 0 6px 0;">${l.substring(1).trim()}</div>`;
        
        let match = l.match(/^(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/); 
        let e = match ? match[0] : "🔹"; 
        let t = match ? l.replace(e, '').trim() : l;
        
        if (!match) {
            let lower = t.toLowerCase();
            if (lower.includes('налаштуван') || lower.includes('встановлен') || lower.includes('пк')) e = '⚙️';
            else if (lower.includes('антивірус') || lower.includes('захист')) e = '🛡️';
            else if (lower.includes('windows') || lower.includes('office') || lower.includes('офіс')) e = '🔑';
            else if (lower.includes('гарантія') || lower.includes('обмін')) e = '♻️';
            else if (lower.includes('sweet') || lower.includes('tv') || lower.includes('кіно')) e = '🎬';
            else if (lower.includes('монтаж') || lower.includes('демонтаж')) e = '🛠️';
            else e = '🔹';
        }

        let priceBadge = '';
        let serviceMatch = t.match(/"([^"]+)"/);
        if (serviceMatch && window.currentDevicePrice > 0) {
            let sName = serviceMatch[1];
            let costText = window.findPriceForServiceText(sName, window.currentDevicePrice);
            if (costText) {
                priceBadge = `<div class="sc-price" style="font-size: 13px; font-weight: 800; color: var(--primary); background: var(--input-bg); padding: 4px 8px; border-radius: 8px; border: 1px solid var(--border); white-space: nowrap; margin-left: 8px;">${costText}</div>`;
            }
        }

        return `
        <div class="desc-line" style="display:flex; align-items:center; width:100%; justify-content:space-between; padding: 10px 0;">
            <div style="display:flex; align-items:center; gap:10px; flex:1; padding-right:10px;">
                <div class="desc-icon-box" style="display:flex; align-items:center; justify-content:center; flex-shrink:0;">${window.renderIcon(e)}</div>
                <div style="font-size: 13px; line-height: 1.4; color: var(--text-main); font-weight: 500; word-break: break-word;">${t}</div>
            </div>
            ${priceBadge}
        </div>`;
    }).join('');
    return html;
};

window.generateDescToggleHTML = function(descE, codeF) {
    let descText = window.parseDescriptionLines(descE); 
    let codeHtml = codeF ? `
        <div class="desc-code" onclick="window.copyCode(event, this, '${window.escapeForJS(codeF)}')">
            <span style="color:var(--text-muted); font-weight:500;">Код:</span>
            <span style="font-size:15px; font-weight:700; color:var(--primary);">${codeF} 📋</span>
        </div>` : '';

    if (!descText && !codeHtml) return '';

    return `
        <div style="margin-top: 4px;">
            <div class="desc-toggle-wrapper" onclick="const c = this.nextElementSibling; const a = this.querySelector('svg'); c.classList.toggle('show'); if(c.classList.contains('show')){a.style.transform='rotate(180deg)';}else{a.style.transform='rotate(0deg)';}">
                <span>Детальніше</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>
            <div class="desc-content">
                ${codeHtml}
                ${descText}
            </div>
        </div>
    `;
};

window.buildTechInfoHTML = function(item, p) {
    if(!item) return "";
    let html = `<div class="tech-info-block">`; let hasInfo = false;
    if (item.complexity) {
        hasInfo = true; let s = "color: var(--text-muted); font-weight: 500;"; const t = String(item.complexity).toLowerCase();
        if (t.includes('критич')) s = "color: var(--danger); font-weight: 700;";
        else if (t.includes('висок')) s = "color: #f97316; font-weight: 600;";
        else if (t.includes('середн')) s = "color: #eab308; font-weight: 600;";
        else if (t.includes('низьк')) s = "color: #10b981; font-weight: 600;";
        html += `<div class="tech-row"><div class="tech-icon" style="display:flex; align-items:center; justify-content:center; width:26px; height:26px;">${window.renderIcon('⚙️')}</div><div class="tech-text-wrap"><div class="tech-label">Складність</div><div class="tech-val" style="${s}">${item.complexity}</div></div></div>`;
    }
    
    let calcPrice = item.price ? item.price.toString() : "";
    if (calcPrice.includes('%') && p > 0) {
        let uah = calcPrice.replace(/(\d+(?:\.\d+)?)%/g, (match, p1) => { return Math.round(p * parseFloat(p1) / 100).toLocaleString('uk-UA') + " ₴"; });
        calcPrice = `${calcPrice} <span style="color:var(--primary); font-weight:bold;">(${uah})</span>`;
    }
    
    const fields = [
        ['💵', 'Платний ремонт', calcPrice], 
        ['🔧', 'Найдорожчі деталі', item.expensiveParts],
        ['✅', 'Гарантійні випадки', item.garant], 
        ['🛡️', 'Гарантія', item.garantiya], 
        ['❌', 'Негарантійні випадки', item.negarant]
    ];
    
    fields.forEach(f => {
        if (f[2] && f[2].toString().trim() !== "") { 
            hasInfo = true;
            let isNegarant = f[1].includes('Негарантійні');
            let rowClasses = isNegarant ? 'tech-row negarant' : 'tech-row';
            html += `<div class="${rowClasses}"><div class="tech-icon" style="display:flex; align-items:center; justify-content:center; width:26px; height:26px;">${window.renderIcon(f[0])}</div><div class="tech-text-wrap"><div class="tech-label">${f[1]}</div><div class="tech-val">${f[2]}</div></div></div>`;
        }
    });

    let photosArray = [];
    if (item.photo1) photosArray.push(item.photo1);
    if (item.photo2) photosArray.push(item.photo2);
    if (item.photo3) photosArray.push(item.photo3);

    if (photosArray.length > 0) {
        hasInfo = true;
        let photosStr = photosArray.join(',');
        html += `
        <div class="tech-photo-wrapper" onclick="window.openGallery('${photosStr}')">
            <div class="photo-icon" style="display:flex; align-items:center; justify-content:center; width:26px; height:26px;">${window.renderIcon('📸')}</div>
            <div class="photo-text">
                <span class="photo-title">Приклади пошкоджень</span>
                <span class="photo-subtitle">Переглянути фото (${photosArray.length})</span>
            </div>
            <div class="photo-arrow">❯</div>
        </div>`;
    }

    html += `</div>`; return hasInfo ? html : "";
};

window.generateServiceCardHTML = function(s, isModalCtx = false, disableCompare = false) {
    if(!s) return '';
    let isSelected = false; let compareModeActive = false;
    if (!disableCompare) {
        isSelected = isModalCtx ? window.modalCompareSelection.includes(s.name) : window.compareSelection.includes(s.name);
        compareModeActive = isModalCtx ? window.isModalCompareMode : window.isCompareMode;
    }
    
    let cardClass = "service-card";
    if (compareModeActive && !s.isPackage) cardClass += ' compare-mode';
    if (isSelected) cardClass += ' selected';
    
    let safeName = window.escapeForJS(s.name); let safeCode = window.escapeForJS(s.code); let safeLabel = window.escapeForJS(s.label);
    let clickHandler = '';
    if (disableCompare) clickHandler = `onclick="window.handleServiceClick(event, '${safeName}', '${safeCode}', ${s.isPackage}, true, '${safeLabel}')"`;
    else if (isModalCtx) clickHandler = `onclick="window.handleModalServiceClick(event, '${safeName}', ${s.isPackage}, '${safeCode}', '${safeLabel}')"`;
    else clickHandler = `onclick="window.handleServiceClick(event, '${safeName}', '${safeCode}', ${s.isPackage}, false, '${safeLabel}')"`;
        
    let descHtml = s.descToggleHTML || '';
    let availHtml = s.availabilityHTML ? `<div style="margin-top:8px;">${s.availabilityHTML}</div>` : '';
    let focusHtml = (s.isFocus && !isSelected) ? `<span style="color:#f59e0b; font-size:16px; flex-shrink:0; line-height:1.2;">🔥</span>` : '';
    let brandHtml = s.brand ? `<div class="sc-brand ${s.cls}">${s.brand}</div>` : '';
    let checkboxHtml = (compareModeActive && !s.isPackage) ? `<div class="checkbox"></div>` : '';

    return `
    <div class="${cardClass}" ${clickHandler}>
        ${checkboxHtml}
        <div class="sc-header" style="align-items: center;">
            <div style="display:flex; flex-direction:column; align-items:flex-start; flex:1; padding-right:10px;">
                ${brandHtml}
                <div class="sc-title">${focusHtml} <span style="flex:1;">${s.title}</span></div>
            </div>
            <div class="sc-price">${s.label}</div>
        </div>
        ${availHtml}
        ${descHtml}
    </div>`;
};

// --- ВЫПОЛНЕНИЕ ЛОГИКИ СТРАНИЦ ---

window.renderTechInfo = function() {
    if (!window.currentCategoryData) return;
    const p = parseFloat(elPriceInput.value) || 0;
    let html = window.buildTechInfoHTML(window.currentCategoryData, p);
    window.safeUpdateHTML(elTechInfo, html);
    elTechInfo.style.display = html ? 'block' : 'none';
};

window.renderServices = function() {
    try {
        const p = parseFloat(elPriceInput.value) || 0; 
        window.currentDevicePrice = p; 
        
        if (window.currentCategoryData && window.currentCategoryData.service) {
            window.renderTechInfo(); 
            let dataForSort = window.calculateServicesArray(window.currentCategoryData, p);
            window.lastCalculatedServices = dataForSort;

            let compareableCount = dataForSort.filter(s => !s.isPackage).length;
            const btnCompare = document.getElementById('toggleCompareBtn');
            if (compareableCount >= 2) {
                btnCompare.style.display = 'block';
                if (window.isCompareMode) btnCompare.classList.add('active');
            } else { 
                btnCompare.style.display = 'none'; 
                if (window.isCompareMode) window.toggleCompareMode(); 
            }

            requestAnimationFrame(() => { window.safeUpdateHTML(elServiceList, dataForSort.map(s => window.generateServiceCardHTML(s, false)).join('')); });
            
        } else if (window.currentServiceData) {
            elTechInfo.style.display = 'none'; window.safeUpdateHTML(elTechInfo, '');
            
            let fakeCat = { service: window.currentServiceData.origName, focusServices: window.currentServiceData.name };
            let dataForSort = window.calculateServicesArray(fakeCat, p);
            
            dataForSort.forEach(s => { s.descToggleHTML = window.generateDescToggleHTML(window.findInDb(window.db.descriptions, s.name), s.code); });
            window.lastCalculatedServices = dataForSort;
            
            document.getElementById('toggleCompareBtn').style.display = 'none';
            if (window.isCompareMode) window.toggleCompareMode();

            requestAnimationFrame(() => { 
                window.safeUpdateHTML(elServiceList, dataForSort.map(s => window.generateServiceCardHTML(s, false, false)).join('')); 
                setTimeout(() => {
                    let toggleWrapper = elServiceList.querySelector('.desc-toggle-wrapper');
                    if (toggleWrapper && !toggleWrapper.nextElementSibling.classList.contains('show')) toggleWrapper.click();
                }, 50);
            });
            
        } else {
            window.lastCalculatedServices = []; document.getElementById('toggleCompareBtn').style.display = 'none';
            if (window.isCompareMode) window.toggleCompareMode();
            elTechInfo.style.display = 'none'; window.safeUpdateHTML(elTechInfo, ''); window.safeUpdateHTML(elServiceList, ''); return;
        }
    } catch(e) { console.error(e); }
};

if(elPriceInput) elPriceInput.addEventListener('input', window.debounce(window.renderServices, 50));

window.renderSkillHubTab = function() {
    const container = document.getElementById('dynamicSkillHubButtons');
    if (!container || !window.db.skillHubButtons) return;

    let html = window.db.skillHubButtons.map(btn => {
        let actionStr = ''; let linkStr = String(btn.link).trim(); let nm = String(btn.name).toLowerCase();
        
        if (linkStr === "Calculator_kloch") actionStr = `onclick="window.openKlochCalc()"`;
        else if (linkStr === "--") actionStr = `onclick="window.openSellerModal()"`;
        else if (linkStr === "%") actionStr = `onclick="window.openRatingModal()"`;
        else if (linkStr === "@@") actionStr = `onclick="window.openModalBase('certManualModal')"`;
        else if (linkStr !== "" && linkStr !== "#") actionStr = `onclick="window.open('${linkStr}', '_blank')"`;
        else {
            if (nm.includes("замін") || nm.includes("замен") || nm.includes("продавц")) actionStr = `onclick="window.openSellerModal()"`;
            else if (nm.includes("об'єдн") || nm.includes("объед") || nm.includes("сертиф")) actionStr = `onclick="window.openModalBase('certManualModal')"`;
            else if (nm.includes("рейтинг")) actionStr = `onclick="window.openRatingModal()"`;
            else if (nm.includes("калькулятор") || nm.includes("клочківськ")) actionStr = `onclick="window.openKlochCalc()"`;
        }

        return `
        <button class="list-item" ${actionStr} style="width:100%; border:none; border-bottom:1px solid var(--border); font-family:inherit; outline:none; display:flex; align-items:center; background: transparent;">
            <div style="font-size: 32px; display: flex; align-items: center; justify-content: center; width: 44px; height: 44px; flex-shrink: 0; margin-right: 12px;">
                ${window.renderIcon(btn.emoji)}
            </div>
            <div class="list-item-content" style="flex:1; text-align:left;">
                <span class="list-item-title">${btn.name}</span>
                <span class="list-item-subtitle">${btn.desc}</span>
            </div>
            <div class="list-item-arrow" style="margin-left: auto;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" style="width:18px; height:18px; stroke-width: 2.5;"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </div>
        </button>`;
    }).join('');
    window.safeUpdateHTML(container, html);
};

// --- ФУНКЦИИ СРАВНЕНИЯ ---
window.toggleCompareMode = function() {
    window.isCompareMode = !window.isCompareMode; window.compareSelection = []; 
    const btn = document.getElementById('toggleCompareBtn');
    if (window.isCompareMode) { 
        btn.innerText = 'Скасувати'; btn.classList.add('active');
        if(compareBar) compareBar.classList.add('show'); 
    } else { 
        btn.innerText = 'Порівняти'; btn.classList.remove('active');
        if(compareBar) compareBar.classList.remove('show'); 
    }
    window.updateCompareUI(); window.renderServices(); 
};

window.toggleModalCompareMode = function() {
    window.isModalCompareMode = !window.isModalCompareMode; window.modalCompareSelection = []; 
    const btn = document.querySelector('.modal.show .compare-toggle-btn');
    if (btn) {
        if (window.isModalCompareMode) btn.innerText = 'Скасувати порівняння';
        else btn.innerText = 'Порівняти';
    }

    if (window.isModalCompareMode) { 
        if(compareBar) { compareBar.classList.add('show'); compareBar.style.zIndex = '100035'; }
    } else { 
        if(compareBar) compareBar.classList.remove('show'); 
    }
    window.updateModalCompareUI();

    if (document.getElementById('montazhCity')) window.updateMontazhResults(); 
    else if (document.querySelector('#rezervItemModal.show')) window.updateRezervResults();
    else window.updateSetupResults(); 
};

window.handleServiceClick = function(e, name, code, isPackage, forceNoCompare = false, priceLabel = "") {
    let target = e.target;
    if (target.closest('.desc-toggle-wrapper') || target.closest('.desc-content')) return;

    if (window.isCompareMode && !forceNoCompare) {
        if (isPackage) { alert("Пакети послуг не порівнюються."); return; }
        let index = window.compareSelection.indexOf(name);
        if (index > -1) window.compareSelection.splice(index, 1);
        else if (window.compareSelection.length < 2) window.compareSelection.push(name);
        window.updateCompareUI(); window.renderServices(); 
    } else { window.openModal(name, code, priceLabel); }
};

window.handleModalServiceClick = function(e, name, isPackage, code, priceLabel = "") {
    let target = e.target;
    if (target.closest('.desc-toggle-wrapper') || target.closest('.desc-content')) return; 
    
    if (window.isModalCompareMode) {
        if (isPackage) { alert("Пакети не порівнюються."); return; }
        let index = window.modalCompareSelection.indexOf(name);
        if (index > -1) window.modalCompareSelection.splice(index, 1);
        else if (window.modalCompareSelection.length < 2) window.modalCompareSelection.push(name);
        window.updateModalCompareUI();
        
        if (document.getElementById('montazhCity')) window.updateMontazhResults(); 
        else if (document.querySelector('#rezervItemModal.show')) window.updateRezervResults();
        else window.updateSetupResults(); 
    } else {
        if (isPackage) window.openModal(name, code, priceLabel);
        else { let toggle = e.currentTarget.querySelector('.desc-toggle-wrapper'); if(toggle) toggle.click(); }
    }
};

window.updateCompareUI = function() {
    let count = window.compareSelection.length;
    let text = count === 0 ? "Оберіть 2 сервіси" : (count === 1 ? "Ще 1 сервіс..." : "Готово!");
    document.getElementById('compareStatusText').innerText = text;
    let btn = document.getElementById('compareExecuteBtn');
    btn.innerText = `Порівняти (${count}/2)`;
    if (count === 2) { btn.style.opacity = '1'; btn.style.pointerEvents = 'auto'; } 
    else { btn.style.opacity = '0.5'; btn.style.pointerEvents = 'none'; }
};

window.updateModalCompareUI = function() {
    let count = window.modalCompareSelection.length;
    let text = count === 0 ? "Оберіть 2 сервіси" : (count === 1 ? "Ще 1 сервіс..." : "Готово!");
    document.getElementById('compareStatusText').innerText = text;
    let btn = document.getElementById('compareExecuteBtn');
    btn.innerText = `Порівняти (${count}/2)`;
    if (count === 2) { btn.style.opacity = '1'; btn.style.pointerEvents = 'auto'; } 
    else { btn.style.opacity = '0.5'; btn.style.pointerEvents = 'none'; }
};

window.handleExecuteCompare = function() { if (window.isModalCompareMode) window.executeModalCompare(); else window.executeCompare(); };

window.executeCompare = function() {
    if (window.compareSelection.length !== 2) return;
    let sA = window.lastCalculatedServices.find(s => s.name === window.compareSelection[0]); let sB = window.lastCalculatedServices.find(s => s.name === window.compareSelection[1]);
    if (!sA || !sB) return;
    let descA = window.findInDb(window.db.descriptions, sA.name) || ""; let descB = window.findInDb(window.db.descriptions, sB.name) || "";
    let html = window.buildCompareTable(sA, sB, descA, descB); 
    window.safeUpdateHTML('compareModalBody', html);
    window.openModalBase('compareModal');
    document.getElementById('compareBar').classList.remove('show');
};

window.executeModalCompare = function() {
    if (window.modalCompareSelection.length !== 2) return;
    let sA = window.lastModalServices.find(s => s.name === window.modalCompareSelection[0] || s.serviceName === window.modalCompareSelection[0]);
    let sB = window.lastModalServices.find(s => s.name === window.modalCompareSelection[1] || s.serviceName === window.modalCompareSelection[1]);
    if (!sA || !sB) return;
    let mappedA = { name: sA.name || sA.serviceName, title: (sA.title || sA.serviceName).replace(/^\[.*?\]\s*/, ''), brand: sA.brand || sA.displayProv || "", label: sA.priceText || sA.label, cls: sA.cls || "brand-settings" };
    let mappedB = { name: sB.name || sB.serviceName, title: (sB.title || sB.serviceName).replace(/^\[.*?\]\s*/, ''), brand: sB.brand || sB.displayProv || "", label: sB.priceText || sB.label, cls: sB.cls || "brand-settings" };
    let descA = window.findInDb(window.db.descriptions, mappedA.name) || ""; let descB = window.findInDb(window.db.descriptions, mappedB.name) || "";
    let html = window.buildCompareTable(mappedA, mappedB, descA, descB); 
    window.safeUpdateHTML('compareModalBody', html);
    window.openModalBase('compareModal');
    document.getElementById('compareBar').classList.remove('show');
};

window.closeCompareModal = function() {
    window.closeModalBase('compareModal');
    window.isCompareMode = false; window.compareSelection = [];
    window.isModalCompareMode = false; window.modalCompareSelection = [];
    
    if (compareBar) compareBar.classList.remove('show');
    const mainBtn = document.getElementById('toggleCompareBtn');
    if (mainBtn) { mainBtn.innerText = 'Порівняти'; mainBtn.classList.remove('active'); }
    
    document.querySelectorAll('.compare-toggle-btn').forEach(btn => {
        btn.innerText = 'Порівняти'; btn.classList.remove('active');
    });

    if (window.currentCategoryData || window.currentServiceData) window.renderServices();
    if (document.getElementById('montazhCity')) window.updateMontazhResults();
    else if (document.querySelector('#rezervItemModal.show')) window.updateRezervResults();
    else window.updateSetupResults();
};

// --- ФУНКЦИИ АВТОЗАПОЛНЕНИЯ (Поиск) ---
if(elCatInput) {
    elCatInput.addEventListener('input', window.debounce(() => {
        try {
            const val = window.normalize(elCatInput.value); 
            elClearBtn.style.display = val.length > 0 ? 'block' : 'none';
            if (val.length === 0) {
                elSuggList.style.display = "none"; elPriceWrapper.style.display = "none"; elResultBox.style.display = "none"; 
                window.currentCategoryData = null; window.currentServiceData = null;
                if(window.isCompareMode) window.toggleCompareMode(); document.getElementById('toggleCompareBtn').style.display = 'none';
                return;
            }
            if (val.length < 2) { elSuggList.style.display = 'none'; return; }
            
            let catMatches = window.db.categories.filter(c => 
                (c.ua && window.normalize(c.ua).includes(val)) || 
                (c.ru && window.normalize(c.ru).includes(val)) || 
                (c.en && window.normalize(c.en).includes(val))
            ).map(c => ({...c, searchType: 'category', icon: '📦'}));
            
            let servMatches = window.allServicesSearchList.filter(s => window.normalize(s.searchStr).includes(val));
            let matches = [...catMatches, ...servMatches].slice(0, 15);

            requestAnimationFrame(() => {
                if (matches.length > 0) {
                    elSuggList.style.display = 'block';
                    let html = matches.map((m, idx) => {
                        let text = m.searchType === 'category' ? m.ua : m.name;
                        let brandBadge = '';
                        if (m.searchType === 'service' && m.brandText) {
                            brandBadge = `<div class="sc-brand ${m.cls}" style="margin: 0; font-size: 9px; padding: 2px 6px; flex-shrink: 0;">${m.brandText}</div>`;
                        }
                        return `<div class="sugg-item" data-idx="${idx}">
                            <span style="flex-shrink:0; width: 24px; height: 24px; display:flex; align-items:center; justify-content:center;">${window.renderIcon(m.icon)}</span> 
                            ${brandBadge} 
                            <span style="flex:1; line-height:1.3; margin-left: 6px;">${text}</span>
                        </div>`;
                    }).join('');
                    window.safeUpdateHTML(elSuggList, html);
                    
                    Array.from(elSuggList.children).forEach((el) => {
                        el.onmousedown = () => window.selectItem(matches[el.getAttribute('data-idx')]);
                    });
                } else elSuggList.style.display = 'none'; 
            });
        } catch(e) { console.error(e); }
    }, 100));
}

if(elClearBtn) {
    elClearBtn.onclick = () => { 
        elCatInput.value = ""; elPriceInput.value = ""; 
        elClearBtn.style.display = "none"; elSuggList.style.display = "none"; 
        elPriceWrapper.style.display = "none"; elResultBox.style.display = "none"; 
        window.currentCategoryData = null; window.currentServiceData = null; 
        elCatInput.focus();
        if(window.isCompareMode) window.toggleCompareMode(); document.getElementById('toggleCompareBtn').style.display = 'none';
    };
}
if(elOkBtn) elOkBtn.onclick = () => elPriceInput.blur();

window.selectItem = function(item) {
    if(item.searchType === 'service') {
        window.currentCategoryData = null;
        window.currentServiceData = { name: item.name, origName: item.origName, icon: item.icon };
        elCatInput.value = item.name;
        window.safeUpdateHTML('uaTitle', `<div style="display:flex; align-items:center; gap:8px;">
            <div style="width:24px; height:24px; display:flex; justify-content:center; align-items:center;">${window.renderIcon(item.icon)}</div>
            <span>${item.name}</span>
        </div>`);
        window.safeUpdateHTML('itemCategory', item.brandText ? "Послуга від " + item.brandText : "Окрема послуга");
    } else {
        window.currentCategoryData = item;
        window.currentServiceData = null;
        elCatInput.value = item.ua; 
        window.safeUpdateHTML('uaTitle', `<div style="display:flex; align-items:center; gap:8px;">
            <div style="width:24px; height:24px; display:flex; justify-content:center; align-items:center;">${window.renderIcon(item.icon)}</div>
            <span>${item.ua}</span>
        </div>`); 
        window.safeUpdateHTML('itemCategory', item.category || ""); 
    }
    
    elSuggList.style.display = 'none'; 
    elPriceWrapper.style.display = 'flex'; 
    elResultBox.style.display = 'block';
    if(window.isCompareMode) window.toggleCompareMode(); 
    window.renderServices(); 
};

// --- ФУНКЦИИ РЕЗЕРВОВ ---
window.renderRezervyList = function() {
    const store = document.getElementById('storeFilter').value;
    const cont = document.getElementById('rezervyList');
    const searchInput = document.getElementById('topReservesSearchInput');
    const searchQuery = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const dateContainer = document.getElementById('rezervyDateContainer');

    if (dateContainer) {
        if (window.db.rezervyDate) {
            dateContainer.innerHTML = `📅 Останнє оновлення: <span style="color:var(--text-main);">${window.db.rezervyDate}</span>`;
            dateContainer.style.display = 'block';
        } else dateContainer.style.display = 'none';
    }

    if (!store) { window.safeUpdateHTML(cont, '<div style="padding:20px; text-align:center; color:var(--text-muted); font-weight:600;">Оберіть магазин вище</div>'); return; }
    let matches = window.db.rezervyData.filter(r => r.store === store);

    if (searchQuery) {
        matches = matches.filter(r => {
            let shortName = r.name.replace(/^(Телевізор|Ноутбук|Смартфон|Мобільний телефон|Планшет|Холодильник|Пральна машина|Мікрохвильова піч|Кавомашина|Пилосос)\s*/i, '').toLowerCase();
            let catName = r.cat.toLowerCase();
            return shortName.includes(searchQuery) || catName.includes(searchQuery) || r.name.toLowerCase().includes(searchQuery);
        });
    }

    if (matches.length === 0) { window.safeUpdateHTML(cont, `<div style="padding:20px; text-align:center; color:var(--text-muted); font-weight:600;">Немає товарів</div>`); return; }

    matches.sort((a, b) => b.price - a.price);

    let html = matches.map(r => {
        let shortName = r.name.replace(/^(Телевізор|Ноутбук|Смартфон|Мобільний телефон|Планшет|Холодильник|Пральна машина|Мікрохвильова піч|Кавомашина|Пилосос)\s*/i, '');
        let snMatchList = shortName.match(/^\[Уцінка:\s*([^\]]+)\]/i);
        let isDiscount = shortName.toLowerCase().includes('уцінка') || snMatchList !== null;
        let discountIconHtml = isDiscount ? `<img src="./assets/icons_skillHUB/Discount.svg" alt="%" class="discount-tag-icon">` : '';

        let safeCatOnClick = String(r.cat).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\u0026quot;');
        let safeNameOnClick = String(shortName).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\u0026quot;');

        let searchVal = window.normalize(r.cat); let catExists = false;
        if (searchVal && window.db.categories && window.db.categories.length > 0) {
            catExists = window.db.categories.some(c => {
                let cUa = window.normalize(c.ua);
                if (!cUa) return false;
                return cUa.includes(searchVal) || searchVal.includes(cUa);
            });
        } else { catExists = true; }

        let catStyle = catExists ? "" : "color: var(--danger); background: var(--danger-bg); padding: 2px 6px; border-radius: 4px; display: inline-block; width: fit-content; transition: 0.2s ease;";
        let garantiyaHtml = r.garantiya ? `<span class="list-item-subtitle" style="font-size: 11px; color: var(--primary); margin-top: 4px; font-weight: 600;">🛡️ Гарантія: ${window.escapeHTML(r.garantiya)}</span>` : "";
        let discountClass = isDiscount ? "discount-card" : "";

        return `
        <div class="list-item ${discountClass}" onclick="window.openRezervItemModal('${safeCatOnClick}', ${r.price}, '${safeNameOnClick}', ${isDiscount})">
            <div class="list-item-content">
                <div style="display:flex; align-items:center; gap: 4px;">
                    <span class="list-item-title rezervy-name" style="flex:1;">${window.escapeHTML(shortName)}</span>
                </div>
                <span class="list-item-subtitle rezervy-cat" style="${catStyle}; margin-top:4px;">${window.escapeHTML(r.cat)}</span>
                ${garantiyaHtml}
            </div>
            <div class="list-item-value rezervy-price" style="display:flex; align-items:center;">
                ${Math.round(r.price).toLocaleString('uk-UA')} ₴
                ${discountIconHtml}
            </div>
        </div>`;
    }).join('');
    window.safeUpdateHTML(cont, html);
};

const topPanel = document.getElementById('topSearchPanel');
const openTopBtn = document.getElementById('openTopSearchBtn');
const closeTopBtn = document.getElementById('closeTopSearchBtn');
const topInput = document.getElementById('topReservesSearchInput');
const clearTopBtn = document.getElementById('clearTopSearchBtn');

if(openTopBtn) openTopBtn.onclick = () => { topPanel.classList.add('show'); setTimeout(() => topInput.focus(), 300); };
if(closeTopBtn) closeTopBtn.onclick = () => { topPanel.classList.remove('show'); topInput.value = ''; clearTopBtn.style.display = 'none'; window.renderRezervyList(); };
if(topInput) topInput.addEventListener('input', () => { clearTopBtn.style.display = topInput.value.length > 0 ? 'flex' : 'none'; window.renderRezervyList(); });
if(clearTopBtn) clearTopBtn.onclick = () => { topInput.value = ''; clearTopBtn.style.display = 'none'; topInput.focus(); window.renderRezervyList(); };

document.addEventListener('click', function(event) {
    if (topPanel && topPanel.classList.contains('show')) {
        if (!topPanel.contains(event.target) && event.target !== openTopBtn && (!openTopBtn || !openTopBtn.contains(event.target))) {
            topPanel.classList.remove('show'); topInput.value = ''; clearTopBtn.style.display = 'none'; window.renderRezervyList(); 
        }
    }
});

window.openRezervItemModal = function(catName, price, itemName, isDiscount = false) {
    let sn = ""; let cleanItemName = itemName;
    let snMatch = itemName.match(/^\[Уцінка:\s*([^\]]+)\]/i);
    if (snMatch) { sn = snMatch[1].trim(); cleanItemName = itemName.replace(snMatch[0], '').trim(); }

    let searchVal = window.normalize(catName); let foundItem = null;
    if (window.db.categories && window.db.categories.length > 0) foundItem = window.db.categories.find(c => window.normalize(c.ua).includes(searchVal) || searchVal.includes(window.normalize(c.ua)));

    if (foundItem || isDiscount) {
        let itemData = foundItem || { category: catName, service: "" };
        document.getElementById('rezervItemTitle').innerText = cleanItemName + ` — ${Math.round(price).toLocaleString('uk-UA')} ₴`;
        window.openModalBase('rezervItemModal');
        window.renderRezervItemServices(itemData, price, isDiscount, sn);
    } else alert(`Категорію "${catName}" не знайдено.`);
};

window.closeRezervItemModal = function() { window.closeModalBase('rezervItemModal'); };

window.updateRezervResults = function() {
    let listEl = document.getElementById('rezervServiceList');
    if (!listEl) return;
    window.safeUpdateHTML(listEl, window.lastModalServices.map(s => window.generateServiceCardHTML(s, true, false)).join(''));
};

window.selectDiscountReason = function(reason) {
    let descBox = document.getElementById('discountReasonDesc');
    if (!reason) { descBox.style.display = 'none'; window.updateRezervServicesFiltered(""); return; }
    let descRaw = window.findInDb(window.db.descriptions, reason);
    if (descRaw) { descBox.innerHTML = window.parseDescriptionLines(descRaw); descBox.style.display = 'block'; } 
    else descBox.style.display = 'none';
    window.updateRezervServicesFiltered(reason);
};

window.updateRezervServicesFiltered = function(discountReason) {
    let item = window.currentRezervItem; let p = window.currentRezervPrice;
    let listEl = document.getElementById('rezervServiceList'); let btn = document.getElementById('rezervCompareBtn');

    if (!item || !item.service) {
        window.safeUpdateHTML(listEl, '<div style="color:var(--text-muted);">Немає сервісів</div>');
        if(btn) btn.style.display = 'none'; return;
    }

    if (window.currentRezervIsDiscount && !discountReason) {
        let warnHtml = `
        <div style="display: flex; align-items: flex-start; gap: 12px; background: var(--clr-support-bg); border: 1px solid rgba(253, 224, 71, 0.4); border-radius: 12px; padding: 16px; margin-top: 8px;">
            <span style="font-size: 22px; line-height: 1;">💡</span>
            <span style="font-size: 13px; font-weight: 600; color: var(--clr-support-text); line-height: 1.4;">
                Будь ласка, оберіть причину уцінки вище, щоб побачити доступні сервіси для цього пристрою.
            </span>
        </div>`;
        window.safeUpdateHTML(listEl, warnHtml);
        if(btn) btn.style.display = 'none'; return;
    }

    let baseServicesArray = window.calculateServicesArray(item, p);

    if (discountReason && window.db.categories) {
        let discountCat = window.db.categories.find(c => String(c.ua).trim().toLowerCase() === String(discountReason).trim().toLowerCase());
        if (discountCat && discountCat.service) {
            let allowedDiscountServices = discountCat.service.split('|').map(s => window.normalizeServiceName(s));
            if (allowedDiscountServices.length > 0) {
                baseServicesArray = baseServicesArray.filter(s => {
                    let sClean = window.normalizeServiceName(s.name);
                    return allowedDiscountServices.some(ds => sClean.includes(ds) || ds.includes(sClean));
                });
            } else baseServicesArray = [];
        } else baseServicesArray = [];
    }

    baseServicesArray.forEach(s => { s.descToggleHTML = window.generateDescToggleHTML(window.findInDb(window.db.descriptions, s.name), s.code); });

    if (btn) {
        if (baseServicesArray.filter(s => !s.isPackage).length >= 2) btn.style.display = 'block';
        else { btn.style.display = 'none'; if (window.isModalCompareMode) window.toggleModalCompareMode(); }
    }
    window.lastModalServices = baseServicesArray;
    window.safeUpdateHTML(listEl, baseServicesArray.map(s => window.generateServiceCardHTML(s, true, false)).join(''));
};

window.renderRezervItemServices = function(item, p, isDiscount = false, sn = "") {
    try {
        window.currentRezervItem = item; window.currentDevicePrice = p; window.currentRezervPrice = p; window.currentRezervIsDiscount = isDiscount;
        let snHtml = "";
        if (sn) {
            snHtml = `<div style="display:flex; justify-content:space-between; align-items:center; background:var(--input-bg); padding:12px 16px; border-radius:12px; margin-bottom:16px; border:1px solid var(--border);">
                <div style="font-size:12px; color:var(--text-muted); font-weight:600; text-transform:uppercase;">Серійний номер:</div>
                <div style="font-size:15px; font-weight:800; color:var(--primary); cursor:pointer; display:flex; align-items:center; gap:6px;" onclick="window.copyCode(event, this, '${window.escapeForJS(sn)}')">${sn} 📋</div>
            </div>`;
        }

        let techStr = window.buildTechInfoHTML(item, p);
        let discountHtml = "";
        if (isDiscount) {
            let discountKeys = window.db.categories.map(c => c.ua).filter(ua => ua && ua.toLowerCase().startsWith('уцінка')).sort();
            let optionsHtml = discountKeys.map(k => `<option value="${window.escapeHTML(k)}">${window.escapeHTML(k)}</option>`).join('');
            let newSiteUrl = "https://sites.google.com/view/skillhub-kh-reg/%D0%B3%D0%BE%D0%BB%D0%BE%D0%B2%D0%BD%D0%B0/%D1%96%D0%BD%D1%81%D1%82%D1%80%D1%83%D0%BA%D1%86%D1%96%D1%97/%D1%96%D0%BD%D1%81%D1%82%D1%80%D1%83%D0%BA%D1%86%D1%96%D1%97/%D1%83%D1%86%D1%96%D0%BD%D0%BA%D0%B0?authuser=0";
            
            discountHtml = `
            <div id="discountReasonBlock" style="margin-top: 16px; margin-bottom: 8px;">
                <button class="btn" style="border-radius: 12px; font-size: 15px; background: var(--card-bg); color: var(--text-main); border: 2px solid var(--border); box-shadow: 0 4px 12px rgba(0,0,0,0.05); font-weight: 700; width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 12px;" onclick="window.open('${newSiteUrl}', '_blank')">
                    <span style="font-size: 18px;">❓</span> Як дізнатись причину уцінки
                </button>
                <div class="input-group" style="position:relative; margin-bottom: 12px;">
                    <select id="discountReasonSelect" onchange="window.selectDiscountReason(this.value)" style="font-weight: 600; color: var(--text-main); text-align: center; text-align-last: center;">
                        <option value="">-- Оберіть причину уцінки --</option>
                        ${optionsHtml}
                    </select>
                </div>
                <div id="discountReasonDesc" style="display: none; background: var(--card-bg); border-radius: 12px; border: 1px solid var(--primary-light); padding: 12px; margin-bottom: 12px;"></div>
            </div>`;
        }

        window.safeUpdateHTML('rezervTechInfo', snHtml + techStr + discountHtml);
        document.getElementById('rezervTechInfo').style.display = (snHtml || techStr || discountHtml) ? 'block' : 'none';

        let titleEl = document.getElementById('rezervRecommendTitle');
        if (titleEl) titleEl.innerText = isDiscount ? "Сервіси для уцінки" : "Рекомендовані сервіси";
        window.updateRezervServicesFiltered("");
    } catch(e) { console.error(e); }
};

// --- ФУНКЦИИ ГАЛЕРЕИ ---
let currentPhotos = []; let currentPhotoIndex = 0;
window.getDirectImageUrl = function(url) {
    if (!url) return "";
    let driveMatch = String(url).match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (driveMatch && driveMatch[1]) return `https://drive.google.com/thumbnail?id=${driveMatch[1]}&sz=w1200`;
    return url;
};

window.openGallery = function(photosStr) {
    currentPhotos = photosStr.split(',').filter(p => p.trim() !== "");
    if (currentPhotos.length === 0) return;

    if (currentPhotos[0].includes('photos.app.goo.gl') || currentPhotos[0].includes('photos.google.com')) {
        document.getElementById('modalTitle').innerText = "Приклади пошкоджень";
        let linksHtml = currentPhotos.map((url, i) => `<button onclick="window.open('${url}', '_blank')" class="btn btn-primary" style="margin-bottom:10px; text-decoration:none;">📸 Відкрити Фото ${i+1}</button>`).join('');
        document.getElementById('modalBody').innerHTML = `<div class="desc-block" style="text-align:center;">Посилання відкриваються у новій вкладці</div>${linksHtml}`;
        window.openModalBase('descModal');
        return;
    }
    currentPhotoIndex = 0; window.updateGalleryImage(); window.openModalBase('galleryModal');
};

window.closeGallery = function() { window.closeModalBase('galleryModal'); };

window.changePhoto = function(dir) {
    currentPhotoIndex += dir;
    if (currentPhotoIndex < 0) currentPhotoIndex = currentPhotos.length - 1;
    if (currentPhotoIndex >= currentPhotos.length) currentPhotoIndex = 0;
    window.updateGalleryImage();
};

window.updateGalleryImage = function() {
    document.getElementById('galleryImage').src = window.getDirectImageUrl(currentPhotos[currentPhotoIndex].trim()); 
    document.getElementById('galleryCounter').innerText = `${currentPhotoIndex + 1} / ${currentPhotos.length}`;
    document.querySelector('.gallery-nav.prev').style.display = currentPhotos.length > 1 ? 'block' : 'none';
    document.querySelector('.gallery-nav.next').style.display = currentPhotos.length > 1 ? 'block' : 'none';
};

// --- ФУНКЦИИ РЕЙТИНГА ---
window.renderRatingModalContent = function() {
    const container = document.getElementById('ratingModalBody');
    if (!container) return;
    
    if (!window.db.sellerRatings || window.db.sellerRatings.length === 0) {
        window.safeUpdateHTML(container, '<div style="text-align:center; padding:20px; color:var(--text-muted); font-weight:600;">Дані оновлюються...</div>');
        return;
    }

    let groups = {};
    window.db.sellerRatings.forEach(r => {
        let nom = r.nomination || "Загальний рейтинг"; let cleanNom = nom.replace(/\s*#\d+\s*$/, '').trim(); 
        if (!groups[cleanNom]) groups[cleanNom] = []; groups[cleanNom].push(r);
    });

    let html = "";
    for (let nom in groups) {
        html += `<div class="rating-group">`;
        let sorted = groups[nom].sort((a, b) => {
            let valA = parseFloat(String(a.result).replace(/[^\d.,-]/g, '').replace(',', '.')) || 0;
            let valB = parseFloat(String(b.result).replace(/[^\d.,-]/g, '').replace(',', '.')) || 0;
            return valB - valA;
        });

        sorted.forEach((item, index) => {
            let rank = index + 1;
            let topClass = rank === 1 ? "top-1" : (rank === 2 ? "top-2" : (rank === 3 ? "top-3" : ""));
            let rankDisplay = rank === 1 ? "🥇" : (rank === 2 ? "🥈" : (rank === 3 ? "🥉" : rank));
            html += `
            <div class="rating-item ${topClass}">
                <div class="rating-rank">${rankDisplay}</div>
                <div class="rating-info">
                    <div class="rating-header-row"><span class="rating-name">${item.name}</span><span class="rating-score">${item.result}</span></div>
                    <div class="rating-desc">${item.nomination}</div>
                </div>
            </div>`;
        });
        html += `</div>`;
    }
    window.safeUpdateHTML(container, html);
};

// --- ФУНКЦИИ МОНТАЖА И УСЛУГ ---
window.renderMontazhModal = function() {
    try {
        if (!window.db.montazhData || !window.db.montazhData.cities || window.db.montazhData.cities.length === 0) {
            window.safeUpdateHTML('modalBody', `<div style="text-align:center; padding: 20px; color:var(--text-muted); font-weight: 800;">Помилка: Міста для монтажу не завантажено.</div>`); return;
        }

        window.currentDevicePrice = parseFloat(document.getElementById('devicePrice').value) || 0;

        const cities = window.db.montazhData.cities.sort((a, b) => String(a).localeCompare(String(b))); const services = window.db.montazhData.services;
        window.cityStatusMap = new Map();
        cities.forEach(city => {
            let hasAny = services.some(s => { let avail = s.availability[city]; return avail && avail !== "-" && avail !== "✖" && !String(avail).toLowerCase().includes("немає"); });
            window.cityStatusMap.set(city, hasAny);
        });
        const categories = [...new Set(services.map(s => s.cat).filter(Boolean))];

        window.safeUpdateHTML('modalBody', `
            <div class="input-group">
                <select id="montazhCity" class="montazh-select">
                    <option value="">-- Оберіть місто --</option>
                    ${cities.map(c => { let emoji = window.cityStatusMap.get(c) ? "🟢" : "🔴"; return `<option value="${c}">${emoji} ${c}</option>`; }).join('')}
                </select>
            </div>
            <div class="input-group">
                <select id="montazhCat" class="montazh-select">
                    <option value="">-- Оберіть категорію --</option>
                    ${categories.map(c => `<option value="${c}">${c}</option>`).join('')}
                </select>
            </div>
            <div id="montazhSubCatWrapper" class="input-group" style="display:none;">
                <select id="montazhSubCat" class="montazh-select"></select>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                <span style="font-weight:700; font-size:12px; text-transform:uppercase; color:var(--text-muted);">Послуги</span>
                <button id="montazhCompareBtn" class="compare-toggle-btn" style="display:none;" onclick="window.toggleModalCompareMode()">Порівняти</button>
            </div>
            <div id="montazhResults" style="margin-bottom:0; display:flex; flex-direction:column; gap:12px;"></div>
        `);

        let catSelect = document.getElementById('montazhCat');
        if (window.currentCategoryData && window.currentCategoryData.category) {
            let targetCat = String(window.currentCategoryData.category).toLowerCase();
            for (let i = 0; i < catSelect.options.length; i++) {
                if (String(catSelect.options[i].value).toLowerCase().includes(targetCat) || targetCat.includes(String(catSelect.options[i].value).toLowerCase())) {
                    catSelect.selectedIndex = i; setTimeout(() => catSelect.dispatchEvent(new Event('change')), 50); break;
                }
            }
        }
        document.getElementById('montazhCity').addEventListener('change', window.updateMontazhResults);
        document.getElementById('montazhCat').addEventListener('change', (e) => {
            const cat = e.target.value; const subCatSelect = document.getElementById('montazhSubCat'); const subCatWrapper = document.getElementById('montazhSubCatWrapper');
            const subcats = [...new Set(services.filter(s => s.cat === cat).map(s => s.subcat).filter(c => c && String(c).trim() !== ""))];
            if (subcats.length > 0) { subCatSelect.innerHTML = `<option value="">-- Всі послуги --</option>` + subcats.map(sc => `<option value="${sc}">${sc}</option>`).join(''); subCatWrapper.style.display = 'block'; } 
            else { subCatSelect.innerHTML = ''; subCatWrapper.style.display = 'none'; }
            window.updateMontazhResults();
        });
        document.getElementById('montazhSubCat').addEventListener('change', window.updateMontazhResults);
    } catch(e) { console.error(e); }
};

window.updateMontazhResults = function() {
    try {
        const city = document.getElementById('montazhCity').value; const cat = document.getElementById('montazhCat').value;
        const subcatWrapper = document.getElementById('montazhSubCatWrapper'); const subcat = subcatWrapper.style.display !== 'none' ? document.getElementById('montazhSubCat').value : "";
        const resultsContainer = document.getElementById('montazhResults');
        
        if (!city || !cat) { window.safeUpdateHTML(resultsContainer, ""); return; }
        const matches = window.db.montazhData.services.filter(s => s.cat === cat && (!subcatWrapper.style.display || subcatWrapper.style.display === 'none' || !subcat || s.subcat === subcat));
        if (matches.length === 0) { window.safeUpdateHTML(resultsContainer, `<div style="padding:20px; text-align:center; color:var(--text-muted);">Послуг не знайдено</div>`); return; }

        let renderItems = [];
        matches.forEach(s => {
             let availability = s.availability[city] || ""; let isUnavailable = (!availability || String(availability).toLowerCase().includes("немає") || availability === "-" || availability === "✖");
             let displayProv = ""; let matchProv = String(s.name).match(/^\[(.*?)\]/); if (matchProv) displayProv = matchProv[1].trim(); 
             let price = s.price;
             if (!price) {
                 let nameClean = window.normalizeServiceName(s.name); const t = window.db.tariffs.find(x => window.normalizeServiceName(x.service) === nameClean || (x.serviceRu && window.normalizeServiceName(x.serviceRu) === nameClean));
                 if (t && t.cost) price = t.cost;
             }
             let cleanCost = String(price).replace(/\s+/g, '').replace(/[^\d.,]/g, '').replace(',', '.'); let priceVal = parseFloat(cleanCost) || 0;
             let priceText = isNaN(priceVal) || cleanCost === '' ? price : priceVal.toLocaleString('uk-UA') + " ₴";
             let descToggleHTML = window.generateDescToggleHTML(window.findInDb(window.db.descriptions, s.name), window.findInDb(window.db.serviceCodes, s.name));
             renderItems.push({ isUnavailable, priceVal, displayProv, serviceName: s.name, priceText, descToggleHTML, availability, code: s.code });
        });

        renderItems.sort((a, b) => { if (a.isUnavailable !== b.isUnavailable) return a.isUnavailable ? 1 : -1; return b.priceVal - a.priceVal; });
        window.lastModalServices = renderItems.map(item => {
            let cls = 'brand-other'; let pUpper = String(item.displayProv).toUpperCase();
            if (pUpper === 'ЕКТА' || pUpper === 'EKTA') cls = "brand-ekta"; else if (pUpper === 'НАШ СЕРВІС' || pUpper === 'SUPPORT' || pUpper === 'МІЙ СЕРВІС') cls = "brand-support";
            return { name: item.serviceName, title: String(item.serviceName).replace(/^\[.*?\]\s*/, ''), brand: item.displayProv, cls, priceText: item.priceText, code: item.code };
        });

        let modalCompBtn = document.getElementById('montazhCompareBtn'); let availableCount = renderItems.filter(item => !item.isUnavailable).length;
        if (modalCompBtn) { if (availableCount >= 2) modalCompBtn.style.display = 'block'; else { modalCompBtn.style.display = 'none'; if (window.isModalCompareMode) window.toggleModalCompareMode(); } }

        let resultsHTML = ""; let seenUnavailable = new Set(); 
        renderItems.forEach(item => {
            let cls = 'brand-other'; let pUpper = String(item.displayProv).toUpperCase();
            if (pUpper === 'ЕКТА' || pUpper === 'EKTA') cls = "brand-ekta"; else if (pUpper === 'НАШ СЕРВІС' || pUpper === 'SUPPORT' || pUpper === 'МІЙ СЕРВІС') cls = "brand-support";
            let obj = { name: item.serviceName, title: String(item.serviceName).replace(/^\[.*?\]\s*/, ''), brand: item.displayProv, cls, label: item.priceText, descToggleHTML: item.descToggleHTML, isPackage: false, code: item.code };
            
            if (item.isUnavailable) {
                if (!seenUnavailable.has(pUpper) && item.displayProv) {
                    seenUnavailable.add(pUpper);
                    resultsHTML += `<div class="service-card" style="opacity:0.6; cursor:default;"><div class="sc-header"><div class="sc-brand ${cls}" style="margin-bottom:0;">${item.displayProv}</div></div><div style="font-size:14px; font-weight:600;">Монтаж у цьому місті відсутній</div></div>`; 
                }
            } else {
                 let text = item.availability; let availLower = String(text).toLowerCase(); let displayText = text;
                 if (availLower === "так" || availLower === "+") displayText = "В межах міста";
                 let col = "var(--primary)";
                 if (availLower.includes("тільки місто") || availLower.includes("до 20 км")) col = "var(--danger)";
                 else if (availLower.includes("передмістя") || availLower.includes("платно")) col = "#f59e0b";
                 
                 let extraInfoHTML = `<div style="font-size:11px; font-weight:600; color:${col}; margin-top: 6px;">📍 ${displayText}</div>`;
                 obj.availabilityHTML = extraInfoHTML; 
                 resultsHTML += window.generateServiceCardHTML(obj, true, false); 
            }
        });
        window.safeUpdateHTML(resultsContainer, resultsHTML);
    } catch(e) { console.error(e); }
};

window.renderDirectListModal = function(targetCategories) {
    try {
        window.currentDevicePrice = parseFloat(elPriceInput.value) || 0;
        if (!Array.isArray(targetCategories)) targetCategories = [targetCategories];
        let matches = window.db.tariffs.filter(t => {
            let c = t.cat ? window.normalizeServiceName(t.cat) : ""; let sName = t.service ? window.normalizeServiceName(t.service) : "";
            return targetCategories.some(tc => { let ntc = window.normalizeServiceName(tc); return c.includes(ntc) || sName.includes(ntc); });
        });
        if(matches.length === 0) { window.safeUpdateHTML('modalBody', `<div style="text-align:center; padding: 20px; color:var(--text-muted);">Послуг не знайдено</div>`); return; }
        
        const p = parseFloat(elPriceInput.value) || 0; 
        let processedMatches = matches.map(m => {
            let numCost = 0; let priceText = "Дізнатись вартість";
            if (m.cost) {
                let rawCost = m.cost.toString().trim();
                if (rawCost.includes('%')) {
                    if (p > 0) { numCost = Math.round(p * parseFloat(rawCost.replace(',', '.'))/100); priceText = numCost.toLocaleString('uk-UA') + " ₴"; } else priceText = rawCost;
                } else {
                    let cleanCost = rawCost.replace(/\s+/g, '').replace(/[^\d.,]/g, '').replace(',', '.');
                    if (cleanCost === '') priceText = rawCost;
                    else { numCost = parseFloat(cleanCost); priceText = isNaN(numCost) ? rawCost : numCost.toLocaleString('uk-UA') + " ₴"; }
                }
            }
            let cls = 'brand-settings'; let uName = String(m.service).toUpperCase();
            if (uName.includes('SUPPORT') || uName.includes('НАШ СЕРВІС')) cls = 'brand-support'; 
            else if (uName.includes('EKTA') || uName.includes('ЕКТА')) cls = 'brand-ekta'; 
            else if (uName.includes('EPZ') || uName.includes('ЕПЗ')) cls = 'brand-epz'; 
            return { name: m.service, title: String(m.service).replace(/^\[.*?\]\s*/, ''), numCost, priceText, cls: cls, code: m.code, isPackage: false };
        });

        processedMatches.sort((a, b) => b.numCost - a.numCost); window.lastModalServices = processedMatches;
        let headerHtml = `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;"><span style="font-weight:700; font-size:12px; text-transform:uppercase; color:var(--text-muted);">Сервіси</span><button id="setupCompareBtn" class="compare-toggle-btn" style="display:${processedMatches.length >= 2 ? 'block' : 'none'}; cursor:pointer;" onclick="window.toggleModalCompareMode()">Порівняти</button></div>`;
        let html = processedMatches.map(m => { m.label = m.priceText; m.descToggleHTML = window.generateDescToggleHTML(window.findInDb(window.db.descriptions, m.name), m.code); return window.generateServiceCardHTML(m, true, false); }).join('');
        window.safeUpdateHTML('modalBody', headerHtml + `<div id="setupResults" style="margin-bottom:0; display:flex; flex-direction:column; gap:12px;">${html}</div>`);
    } catch(e) { console.error(e); }
};

window.renderSetupModal = function(targetName, mode = "setup") {
    try {
        window.currentDevicePrice = parseFloat(elPriceInput.value) || 0;
        let setupCats = [...new Set(window.db.tariffs.filter(t => {
            if (!t.cat) return false; let c = String(t.cat).toLowerCase();
            if (mode === "antivirus") return c.includes('антивірус') || c.includes('eset');
            else return !c.includes('монтаж') && !c.includes('кухонна') && !c.includes('перевірка') && !c.includes('поклейка') && !c.includes('скло') && !c.includes('антивірус') && !c.includes('eset') && !c.includes('кінотеатр') && !c.includes('sweet') && !c.includes('сервіси support') && !c.includes('сервіси екта');
        }).map(t => t.cat))];
        
        let labelText = mode === "antivirus" ? "Оберіть тип антивірусу:" : "Оберіть тип сервісу:";
        window.safeUpdateHTML('modalBody', `<div class="input-group"><span class="montazh-label" style="font-weight:600; display:block; margin-bottom:8px; font-size:14px; color:var(--text-muted);">${labelText}</span><select id="setupCat" class="montazh-select"><option value="">-- Оберіть категорію --</option>${setupCats.map(c => `<option value="${c}">${c}</option>`).join('')}</select></div><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;"><span style="font-weight:700; font-size:12px; text-transform:uppercase; color:var(--text-muted);">Сервіси</span><button id="setupCompareBtn" class="compare-toggle-btn" style="display:none; cursor:pointer;" onclick="window.toggleModalCompareMode()">Порівняти</button></div><div id="setupResults" style="margin-bottom:0; display:flex; flex-direction:column; gap:12px;"></div>`);
        
        let catSelect = document.getElementById('setupCat'); let targetClean = window.normalizeServiceName(targetName);
        let targetTariff = window.db.tariffs.find(t => window.normalizeServiceName(t.service) === targetClean || (t.serviceRu && window.normalizeServiceName(t.serviceRu) === targetClean));
        let catToSelect = targetName; if (targetTariff && targetTariff.cat) catToSelect = targetTariff.cat;
        let cleanCatToSelect = window.normalizeServiceName(catToSelect);
        for (let i = 0; i < catSelect.options.length; i++) {
            let optClean = window.normalizeServiceName(catSelect.options[i].value);
            if (optClean === cleanCatToSelect || optClean.includes(cleanCatToSelect) || cleanCatToSelect.includes(optClean)) { catSelect.selectedIndex = i; setTimeout(() => catSelect.dispatchEvent(new Event('change')), 50); break; }
        }
        catSelect.addEventListener('change', window.updateSetupResults);
    } catch(e) { console.error(e); }
};

window.updateSetupResults = function() {
    try {
        let catElement = document.getElementById('setupCat'); 
        let container = document.getElementById('setupResults');
        if(!container) return; 

        if (catElement) {
            let cat = catElement.value;
            if(!cat) { window.safeUpdateHTML(container, ""); return; }
            let matches = window.db.tariffs.filter(t => t.cat === cat);
            if(matches.length === 0) { window.safeUpdateHTML(container, `<div style="text-align:center; padding: 20px; color:var(--text-muted);">Послуг не знайдено</div>`); return; }
            
            const p = parseFloat(elPriceInput.value) || 0; 
            let processedMatches = matches.map(m => {
                let numCost = 0; let priceText = "Дізнатись вартість";
                if (m.cost) {
                    let rawCost = m.cost.toString().trim();
                    if (rawCost.includes('%')) {
                        if (p > 0) { numCost = Math.round(p * parseFloat(rawCost.replace(',', '.'))/100); priceText = numCost.toLocaleString('uk-UA') + " ₴"; } else priceText = rawCost;
                    } else {
                        let cleanCost = rawCost.replace(/\s+/g, '').replace(/[^\d.,]/g, '').replace(',', '.');
                        if (cleanCost === '') priceText = rawCost;
                        else { numCost = parseFloat(cleanCost); priceText = isNaN(numCost) ? rawCost : numCost.toLocaleString('uk-UA') + " ₴"; }
                    }
                }
                let cls = 'brand-settings'; let uName = String(m.service).toUpperCase();
                if (uName.includes('SUPPORT') || uName.includes('НАШ СЕРВІС')) cls = 'brand-support'; 
                else if (uName.includes('EKTA') || uName.includes('ЕКТА')) cls = 'brand-ekta'; 
                else if (uName.includes('EPZ') || uName.includes('ЕПЗ')) cls = 'brand-epz'; 
                return { name: m.service, title: String(m.service).replace(/^\[.*?\]\s*/, ''), numCost, priceText, cls: cls, code: m.code, isPackage: false };
            });

            processedMatches.sort((a, b) => b.numCost - a.numCost); 
            window.lastModalServices = processedMatches;
        }
        
        let modalCompBtn = document.getElementById('setupCompareBtn');
        if (modalCompBtn) { 
            if (window.lastModalServices.length >= 2) modalCompBtn.style.display = 'block'; 
            else { modalCompBtn.style.display = 'none'; if (window.isModalCompareMode) { window.toggleModalCompareMode(); } } 
        }
        
        let html = window.lastModalServices.map(m => { 
            m.label = m.priceText; 
            m.descToggleHTML = window.generateDescToggleHTML(window.findInDb(window.db.descriptions, m.name), m.code); 
            return window.generateServiceCardHTML(m, true, false); 
        }).join('');
        window.safeUpdateHTML(container, html);
    } catch(e) { console.error(e); }
};

// --- ФОРМА ПРОДАВЦА ---
window.handleSellerResponse = function(data) {
    const s = document.getElementById('sellerStore');
    const r = document.getElementById('sellerReason');
    if(s && r) {
        s.innerHTML = '<option value="" disabled selected>Оберіть магазин</option>';
        r.innerHTML = '<option value="" disabled selected>Оберіть причину</option>';
        data.stores.forEach(item => s.add(new Option(item, item)));
        data.reasons.forEach(item => r.add(new Option(item, item)));
    }
};

let formSeller = document.getElementById('sellerFormSubmit');
if(formSeller) {
    formSeller.onsubmit = function(e) {
        e.preventDefault();
        const btn = document.getElementById('submitSellerBtn');
        const overlay = document.getElementById('sellerStatusOverlay');
        
        btn.disabled = true;
        btn.innerText = 'НАДСИЛАЄМО...';

        fetch(window.SELLER_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: new FormData(this)
        })
        .then(() => {
            formSeller.style.display = 'none';
            overlay.style.display = 'block';
        })
        .catch(() => {
            alert("Помилка відправки.");
            btn.disabled = false;
            btn.innerText = 'ВІДПРАВИТИ';
        });
    };
}

// Запускаем приложение
window.init();