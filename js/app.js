// ==========================================
// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ И НАСТРОЙКИ
// ==========================================
const API_URL = 'https://script.google.com/macros/s/AKfycbzu9v1_2-iePDzfL9j7uMlWT4PgAMNZCE_X0JpG8sWaHcSwx1bcYLfiLHd91PHWlHzF/exec';
const CACHE_KEY = 'skillhub_v1_flat'; 
const SEEN_VERSION_KEY = 'skillhub_version_flat';
const SELLER_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzu9v1_2-iePDzfL9j7uMlWT4PgAMNZCE_X0JpG8sWaHcSwx1bcYLfiLHd91PHWlHzF/exec";

window.currentDevicePrice = 0; 
window.currentRezervItem = null;
window.currentRezervPrice = 0;
window.currentRezervIsDiscount = false;

let db = { categories: [], descriptions: {}, tariffs: [], appVersion: "", changelog: "", montazhData: {cities:[], services:[]}, serviceCodes: {}, rezervyData: [], rezervyDate: "", serviceBrands: {}, trainingData: [], skillHubButtons: [], sellerRatings: [] };
let currentCategoryData = null;
let currentServiceData = null; 
let savedScrollY = 0; 

let isCompareMode = false;
let compareSelection = [];
window.lastCalculatedServices = [];
let isModalCompareMode = false;
let modalCompareSelection = [];
window.lastModalServices = [];
window.allServicesSearchList = [];

let currentPhotos = [];
let currentPhotoIndex = 0;

// ==========================================
// SPA ЛОГИКА (БЕСШОВНЫЕ ПЕРЕХОДЫ ИФРЕЙМОВ)
// ==========================================
window.openModule = function(url) {
    const container = document.getElementById('spa-module-container');
    const frame = document.getElementById('spa-frame');
    frame.src = url;
    container.style.display = 'block';
    document.body.classList.add('modal-open');
    setTimeout(() => { container.style.opacity = '1'; }, 10);
};

window.closeModule = function() {
    const container = document.getElementById('spa-module-container');
    container.style.opacity = '0';
    setTimeout(() => {
        container.style.display = 'none';
        document.getElementById('spa-frame').src = '';
        document.body.classList.remove('modal-open');
    }, 300);
};

// ==========================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ И ЧИСТКА СТРОК
// ==========================================
const normalize = (str) => str ? String(str).toLowerCase().trim().replace(/[‘’'"`]/g, "") : "";

function normalizeServiceName(s) {
    if (!s) return "";
    return String(s).replace(/^\[.*?\]\s*/, '').replace(/[«»"'”`\u00A0\s]/g, '').trim().toLowerCase();
}

window.escapeHTML = function(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '\u0026amp;').replace(/</g, '\u0026lt;').replace(/>/g, '\u0026gt;').replace(/"/g, '\u0026quot;').replace(/'/g, '\u0026#39;');
};

window.escapeForJS = function(str) {
    if (!str) return '';
    return String(str).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '"').replace(/\n/g, '\\n').replace(/\r/g, '');
};

window.safeUpdateHTML = function(elementOrId, newHtml) {
    let el = typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;
    if (el && el.innerHTML !== newHtml) { el.innerHTML = newHtml; }
};

window.renderIcon = function(val) {
    if (!val) return '';
    let clean = String(val).trim();
    if (clean.toLowerCase().endsWith('.svg') || clean.toLowerCase().endsWith('.png')) {
        return `<img src="assets/icons/${clean}" alt="icon" style="width: 100%; height: 100%; object-fit: contain; display: block;">`;
    }
    return clean;
};

window.findInDb = function(dict, key) {
    if (!key || !dict) return "";
    if (dict[key]) return dict[key];
    let clean = normalizeServiceName(key);
    for (let k in dict) { if (normalizeServiceName(k) === clean) return dict[k]; }
    return "";
};

function sanitizeDb(data) {
    if(!data) return { categories: [], descriptions: {}, tariffs: [], montazhData: {cities:[], services:[]}, serviceCodes: {}, rezervyData: [], rezervyDate: "", serviceBrands: {}, trainingData: [], skillHubButtons: [], sellerRatings: [] };
    data.categories = data.categories || [];
    data.descriptions = data.descriptions || {};
    data.tariffs = data.tariffs || [];
    data.montazhData = data.montazhData || { cities: [], services: [] };
    if (!data.montazhData.cities) data.montazhData.cities = [];
    if (!data.montazhData.services) data.montazhData.services = [];
    data.serviceCodes = data.serviceCodes || {};
    data.rezervyData = data.rezervyData || [];
    data.rezervyDate = data.rezervyDate || ""; 
    data.serviceBrands = data.serviceBrands || {};
    data.trainingData = data.trainingData || [];
    data.skillHubButtons = data.skillHubButtons || [];
    data.sellerRatings = data.sellerRatings || [];
    return data;
}

function debounce(func, wait) {
    let timeout;
    return function(...args) { clearTimeout(timeout); timeout = setTimeout(() => func.apply(this, args), wait); };
}

// ==========================================
// УПРАВЛЕНИЕ МАСШТАБОМ И ТЕМАМИ
// ==========================================
window.updateFontScale = function(scale) {
    localStorage.setItem('skillhub_font_scale', scale);
    let style = document.getElementById('dynamicFontScale');
    if(!style) { 
        style = document.createElement('style'); 
        style.id = 'dynamicFontScale'; 
        document.head.appendChild(style); 
    }
    style.innerHTML = `
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
    `;
};

function setAppStatus(state, text) {
    const dot = document.getElementById('statusDot');
    const txt = document.getElementById('statusText');
    if(!dot || !txt) return;
    dot.className = 'dot'; 
    if (state === 'ok') dot.classList.add('green', 'pulse');
    else if (state === 'error') dot.classList.add('red');
    else if (state === 'loading') dot.classList.add('yellow', 'pulse');
    else dot.classList.add('yellow');
    txt.innerText = text;
}

// ==========================================
// МАРШРУТИЗАЦИЯ ВКЛАДОК КЛИЕНТСКОЙ ЧАСТИ
// ==========================================
window.switchTab = function(tabId) {
    document.querySelectorAll('.app-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    
    let activeNavBtn = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
    if (activeNavBtn) activeNavBtn.classList.add('active');

    const tabTitles = {
        'tab-search': 'SkillHUB Assistant',
        'tab-reserves': 'Активні резерви',
        'tab-skillhub': 'SkillHUB',
        'tab-settings': 'Налаштування'
    };

    document.getElementById('headerTitle').innerText = tabTitles[tabId];
    document.getElementById('statusContainer').style.display = (tabId === 'tab-search') ? 'flex' : 'none';

    if (isCompareMode) window.toggleCompareMode();
    if (isModalCompareMode) window.toggleModalCompareMode();
    document.getElementById('compareBar').classList.remove('show');
    
    if (tabId === 'tab-reserves') window.renderRezervyList();
    window.scrollTo(0, 0);
};

// ==========================================
// УПРАВЛЕНИЕ МОДАЛЬНЫМИ ОКНАМИ БАЗЫ
// ==========================================
window.openModalBase = function(modalId, name = "", code = "", priceLabel = "") {
    try {
        if (name && modalId === 'descModal') {
            let title = name.replace(/🇺🇦\s*/g, '').replace(/^UA\s+/i, '').replace(/^\[.*?\]\s*/, ''); 
            let priceLabelHtml = "";
            if (priceLabel && priceLabel !== "Дізнатись" && priceLabel !== "Обрати пакет") {
                priceLabelHtml = `<div style="font-size: 16px; font-weight: 800; color: var(--primary); white-space: nowrap; margin-left: 10px; background: var(--input-bg); padding: 4px 8px; border-radius: 8px;">${priceLabel}</div>`;
            }

            document.getElementById('modalTitle').innerHTML = `
                <div style="display:flex; align-items:flex-start; justify-content:space-between; width:100%; gap:10px;">
                    <span style="line-height:1.2;">${title}</span>
                    ${priceLabelHtml}
                </div>`;
            
            const raw = window.findInDb(db.descriptions, name) || "";
            let p = window.currentDevicePrice || parseFloat(document.getElementById('devicePrice').value) || 0;
            let comboHtml = "";

            if (p > 0) {
                let tariffs = db.tariffs.filter(t => {
                    let n1 = normalizeServiceName(t.service);
                    let n2 = normalizeServiceName(name);
                    return n1 === n2 || (t.serviceRu && normalizeServiceName(t.serviceRu) === n2);
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

                allCombos.sort((a, b) => {
                    let diffA = a.sum - p; let diffB = b.sum - p;
                    if (diffA !== diffB) return diffA - diffB;
                    return a.combo.length - b.combo.length;
                });

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
                            let cleanName = tName.replace(/^\[.*?\]\s*/, '').trim();
                            let brandMatch = tName.match(/^\[(.*?)\]/);
                            let brand = brandMatch ? brandMatch[1] : "";
                            let displayName = brand ? `[${brand}] ${cleanName}` : cleanName;

                            if (!displayName.includes(maxP.toString())) { displayName += ` (${minP.toLocaleString('uk-UA')} - ${maxP.toLocaleString('uk-UA')})`; }
                            let tPriceStr = ""; let tPriceNum = 0;
                            if (t.cost) {
                                let cStr = String(t.cost).trim();
                                if (cStr.includes('%')) { tPriceNum = Math.round(maxP * parseFloat(cStr.replace(',', '.'))/100); } 
                                else { tPriceNum = parseFloat(cStr.replace(/\s+/g, '').replace(',', '.')); }
                                if (!isNaN(tPriceNum)) { totalComboPrice += tPriceNum; tPriceStr = tPriceNum.toLocaleString('uk-UA') + " ₴"; } 
                                else { tPriceStr = cStr; }
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

                        return `
                        <div style="margin-bottom: 20px;">
                            <div style="font-size: 11px; font-weight: 800; color: var(--text-muted); text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px; text-align: center;">Варіант ${vIdx + 1} (${comboObj.combo.length} серт.)</div>
                            ${comboItemsHtml}
                            <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 8px; background: var(--card-bg); padding: 12px; border-radius: 8px; border: 1px solid var(--primary-light);">
                                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 13px; font-weight: 700;">
                                    <span>Загальна вартість:</span>
                                    <span style="color:var(--primary); font-size: 16px;">${totalComboPrice.toLocaleString('uk-UA')} ₴</span>
                                </div>
                            </div>
                        </div>`;
                    }).join('');

                    comboHtml = `
                        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px dashed var(--border);">
                            <button class="btn" style="background: var(--primary-light); color: var(--rozetka-green-dark); font-weight: 800; width: 100%; border: 1px dashed var(--primary);" onclick="this.nextElementSibling.style.display='block'; this.style.display='none';">
                                🧩 Об'єднати сертифікати
                            </button>
                            <div style="display: none; background: var(--input-bg); padding: 16px; border-radius: 12px; border: 1px solid var(--border); animation: fade 0.2s ease;">
                                ${comboVariantsHtml}
                            </div>
                        </div>`;
                }
            }

            window.safeUpdateHTML('modalBody', window.generateDescToggleHTML(raw, code).replace('display: none;', 'display: block;').replace('Детальніше', 'Опис сервісу') + comboHtml);
            let dc = document.getElementById('modalBody').querySelector('.desc-content');
            if(dc) dc.classList.add('show');
        }

        if (!document.body.classList.contains('modal-open')) {
            savedScrollY = window.scrollY;
            document.body.style.top = `-${savedScrollY}px`;
            document.body.classList.add('modal-open');
        }
        document.getElementById(modalId).classList.add('show');
    } catch(e) { console.error(e); }
};

window.closeModalBase = function(modalId) {
    document.getElementById(modalId).classList.remove('show');
    if (!window.checkOpenModals()) {
        document.body.classList.remove('modal-open');
        document.body.style.top = '';
        window.scrollTo(0, savedScrollY);
    }
    if (['descModal', 'rezervItemModal', 'sellerModal', 'certManualModal', 'ratingModal'].includes(modalId)) {
        if (isModalCompareMode) { window.toggleModalCompareMode(); }
    }
};

window.checkOpenModals = function() {
    return ['descModal', 'compareModal', 'rezervItemModal', 'galleryModal', 'sellerModal', 'certManualModal', 'ratingModal'].some(id => {
        let el = document.getElementById(id); return el && el.classList.contains('show');
    });
};

// ==========================================
// ПОИСК ТЕХНИКИ И РЕНДЕР КАРТОЧЕК СЕРВИСОВ
// ==========================================
window.buildServiceSearchList = function() {
    let uniqueMap = new Map();
    if(db.tariffs) {
        db.tariffs.forEach(t => {
            if(t.service) {
                let origName = t.service.trim();
                if(!uniqueMap.has(origName)) uniqueMap.set(origName, { orig: origName, ru: t.serviceRu || "", en: t.serviceEn || "" });
            }
        });
    }
    window.allServicesSearchList = Array.from(uniqueMap.entries()).map(([origName, data]) => {
        let nameClean = origName.replace(/^\[.*?\]\s*/, '').trim();
        let u = nameClean.toUpperCase();
        let exactBrand = db.serviceBrands ? window.findInDb(db.serviceBrands, origName) : "";
        const brandMatch = origName.match(/^\[(.*?)\]/);
        let brand = exactBrand || (brandMatch ? brandMatch[1] : "");
        let uBrand = String(brand).toUpperCase();
        
        let cls = 'brand-other';
        if (uBrand.includes('SUPPORT') || u.includes('SUPPORT') || u.includes('НАШ СЕРВІС')) cls = 'brand-support'; 
        else if (uBrand.includes('ЕКТА') || uBrand.includes('EKTA') || u.includes('EKTA') || u.includes('ЕКТА')) cls = 'brand-ekta'; 
        else if (uBrand.includes('EPZ') || u.includes('EPZ') || u.includes('ЕПЗ') || u.includes('ЛІЦЕНЗІЙНЕ') || u.includes('WINDOWS') || u.includes('OFFICE')) cls = 'brand-epz'; 
        else if (u.includes('НАЛАШТУВАННЯ')) cls = 'brand-settings'; 
        else if (u.includes('МОНТАЖ') || u.includes('ПІДКЛЮЧЕННЯ') || u.includes('ВСТАНОВЛЕННЯ')) cls = 'brand-install';
        
        return { origName, name: nameClean, searchStr: [nameClean, data.ru, data.en].join(' '), icon: '⚙️', searchType: 'service', brandText: brandMatch ? brandMatch[1] : brand, cls };
    });
};

window.calculateServicesArray = function(item, p) {
    if(!item) return [];
    const focusList = item.focusServices ? String(item.focusServices).split('|').map(s => normalizeServiceName(s)) : [];
    const servicesNames = item.service ? String(item.service).split('|').map(s => s.trim()).filter(s => s) : [];
    
    let dataForSort = servicesNames.map(name => {
        let exactBrand = db.serviceBrands ? window.findInDb(db.serviceBrands, name) : "";
        const brandMatch = name.match(/^\[(.*?)\]/); 
        const brand = exactBrand || (brandMatch ? brandMatch[1] : "");
        let title = name.replace(/^\[(.*?)\]\s*/, "").trim(); 
        let nameClean = normalizeServiceName(name); 
        let isFocus = false;
        
        if(title.includes('🔥')) { isFocus = true; title = title.replace('🔥', '').trim(); } 
        else if (focusList.includes(nameClean)) isFocus = true;
        
        const matchingTariffs = db.tariffs.filter(x => normalizeServiceName(x.service) === nameClean || (x.serviceRu && normalizeServiceName(x.serviceRu) === nameClean));
        let t = p > 0 ? matchingTariffs.find(x => p >= x.minPrice && p <= x.maxPrice) : null;
        if (!t && matchingTariffs.length > 0) { t = matchingTariffs.find(x => (p >= x.minPrice && p <= x.maxPrice) || (p === 0 && x.minPrice === 0)) || matchingTariffs[0]; }

        let uName = String(name).toUpperCase();
        let isStaticEpz = (uName.includes('WINDOWS') || uName.includes('OFFICE') || uName.includes('ESD')) && !uName.includes('НАЛАШТУВАННЯ');
        let isPackage = false;

        if (!isStaticEpz) {
            if (uName.includes('МОНТАЖ') || uName.includes('ПІДКЛЮЧЕННЯ') || uName.includes('ВСТАНОВЛЕННЯ')) isPackage = true;
            if (uName.includes('SWEET') || uName.includes('КІНОТЕАТР') || uName.includes('ANIVIRUS') || uName.includes('ESET') || uName.includes('ПОКЛЕЙКА')) isPackage = true;
        }
        
        let label = "Дізнатись"; 
        let serviceCode = t && t.code ? t.code : window.findInDb(db.serviceCodes, name); 
        
        if (isPackage) label = "Обрати пакет"; 
        else if (t && t.cost) {
            let rawCost = t.cost.toString().trim();
            if (rawCost.includes('%') && p > 0) { label = Math.round(p * parseFloat(rawCost.replace(',', '.'))/100).toLocaleString('uk-UA') + " ₴"; } 
            else { label = parseFloat(rawCost.replace(/\s+/g, '')) ? parseFloat(rawCost.replace(/\s+/g, '')).toLocaleString('uk-UA') + " ₴" : rawCost; }
        }
        
        let cls = 'brand-other';
        if (brand.toUpperCase().includes('SUPPORT') || uName.includes('SUPPORT')) cls = 'brand-support'; 
        else if (brand.toUpperCase().includes('EKTA') || brand.toUpperCase().includes('ЕКТА')) cls = 'brand-ekta'; 
        else if (brand.toUpperCase().includes('EPZ') || isStaticEpz) cls = 'brand-epz';
        
        return { name, brand, title, label, cls, isFocus, code: serviceCode, isPackage, descToggleHTML: '' };
    });

    return dataForSort.sort((a, b) => (b.isFocus - a.isFocus));
};

window.generateServiceCardHTML = function(s, isModalCtx = false, disableCompare = false) {
    if(!s) return '';
    let isSelected = disableCompare ? false : (isModalCtx ? modalCompareSelection.includes(s.name) : compareSelection.includes(s.name));
    let compareModeActive = disableCompare ? false : (isModalCtx ? isModalCompareMode : isCompareMode);
    
    let cardClass = "service-card" + (compareModeActive && !s.isPackage ? ' compare-mode' : '') + (isSelected ? ' selected' : '');
    let safeName = window.escapeForJS(s.name); 
    let safeCode = window.escapeForJS(s.code); 
    let safeLabel = window.escapeForJS(s.label);
    
    let clickHandler = disableCompare ? `onclick="window.handleServiceClick(event, '${safeName}', '${safeCode}', ${s.isPackage}, true, '${safeLabel}')"` :
                      (isModalCtx ? `onclick="window.handleModalServiceClick(event, '${safeName}', ${s.isPackage}, '${safeCode}', '${safeLabel}')"` :
                                    `onclick="window.handleServiceClick(event, '${safeName}', '${safeCode}', ${s.isPackage}, false, '${safeLabel}')"`);
        
    return `
    <div class="${cardClass}" ${clickHandler}>
        ${compareModeActive && !s.isPackage ? '<div class="checkbox"></div>' : ''}
        <div class="sc-header" style="align-items: center;">
            <div style="display:flex; flex-direction:column; align-items:flex-start; flex:1; padding-right:10px;">
                ${s.brand ? `<div class="sc-brand ${s.cls}">${s.brand}</div>` : ''}
                <div class="sc-title">${s.isFocus && !isSelected ? '🔥 ' : ''}<span style="flex:1;">${s.title}</span></div>
            </div>
            <div class="sc-price">${s.label}</div>
        </div>
        ${s.availabilityHTML || ''}
        ${s.descToggleHTML || ''}
    </div>`;
};

window.renderServices = function() {
    try {
        const p = parseFloat(document.getElementById('devicePrice').value) || 0; 
        window.currentDevicePrice = p;
        const elServiceList = document.getElementById('serviceList');
        
        if (currentCategoryData && currentCategoryData.service) {
            window.renderTechInfo(); 
            let dataForSort = window.calculateServicesArray(currentCategoryData, p);
            window.lastCalculatedServices = dataForSort;
            document.getElementById('toggleCompareBtn').style.display = dataForSort.filter(s => !s.isPackage).length >= 2 ? 'block' : 'none';
            window.safeUpdateHTML(elServiceList, dataForSort.map(s => window.generateServiceCardHTML(s, false)).join(''));
        } else if (currentServiceData) {
            document.getElementById('techInfo').style.display = 'none';
            let fakeCat = { service: currentServiceData.origName, focusServices: currentServiceData.name };
            let dataForSort = window.calculateServicesArray(fakeCat, p);
            dataForSort.forEach(s => s.descToggleHTML = window.generateDescToggleHTML(window.findInDb(db.descriptions, s.name), s.code));
            window.lastCalculatedServices = dataForSort;
            document.getElementById('toggleCompareBtn').style.display = 'none';
            window.safeUpdateHTML(elServiceList, dataForSort.map(s => window.generateServiceCardHTML(s, false, true)).join(''));
        }
    } catch(e) { console.error(e); }
};

window.renderTechInfo = function() {
    if (!currentCategoryData) return;
    const p = window.currentDevicePrice || 0;
    let html = buildTechInfoHTML(currentCategoryData, p);
    window.safeUpdateHTML('techInfo', html);
    document.getElementById('techInfo').style.display = html ? 'block' : 'none';
};

function buildTechInfoHTML(item, p) {
    if(!item) return "";
    let html = `<div class="tech-info-block">`; let hasInfo = false;
    if (item.complexity) {
        hasInfo = true; let s = "color: var(--text-muted); font-weight: 500;"; const t = String(item.complexity).toLowerCase();
        if (t.includes('критич')) s = "color: var(--danger); font-weight: 700;";
        else if (t.includes('висок')) s = "color: #f97316; font-weight: 600;";
        html += `<div class="tech-row"><div class="tech-icon">⚙️</div><div class="tech-text-wrap"><div class="tech-label">Складність</div><div class="tech-val" style="${s}">${item.complexity}</div></div></div>`;
    }
    const fields = [['🔧', 'Найдорожчі деталі', item.expensiveParts], ['✅', 'Гарантійні випадки', item.garant], ['🛡️', 'Гарантія', item.garantiya], ['❌', 'Негарантійні випадки', item.negarant]];
    fields.forEach(f => {
        if (f[2] && f[2].toString().trim() !== "") { 
            hasInfo = true;
            html += `<div class="${f[1].includes('Негарант') ? 'tech-row negarant' : 'tech-row'}"><div class="tech-icon">${f[0]}</div><div class="tech-text-wrap"><div class="tech-label">${f[1]}</div><div class="tech-val">${f[2]}</div></div></div>`;
        }
    });
    let photosArray = [item.photo1, item.photo2, item.photo3].filter(Boolean);
    if (photosArray.length > 0) {
        hasInfo = true;
        html += `
        <div class="tech-photo-wrapper" onclick="window.openGallery('${photosArray.join(',')}')">
            <div class="photo-icon">📸</div>
            <div class="photo-text"><span class="photo-title">Приклади пошкоджень</span><span class="photo-subtitle">Переглянути фото (${photosArray.length})</span></div>
            <div class="photo-arrow">❯</div>
        </div>`;
    }
    html += `</div>`; return hasInfo ? html : "";
}

window.generateDescToggleHTML = function(descE, codeF) {
    let descText = window.parseDescriptionLines(descE); 
    let codeHtml = codeF ? `
        <div class="desc-code" onclick="window.copyCode(event, this, '${window.escapeForJS(codeF)}')">
            <span style="color:var(--text-muted); font-weight:500;">Код:</span><span style="font-size:15px; font-weight:700; color:var(--primary);">${codeF} 📋</span>
        </div>` : '';
    if (!descText && !codeHtml) return '';
    return `
        <div style="margin-top: 4px;">
            <div class="desc-toggle-wrapper" onclick="const c = this.nextElementSibling; c.classList.toggle('show');">
                <span>Детальніше</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>
            <div class="desc-content">${codeHtml}${descText}</div>
        </div>`;
};

window.parseDescriptionLines = function(descE) {
    let safeDesc = descE ? String(descE).trim() : "";
    if (!safeDesc || safeDesc === "Опис відсутній...") return `<div class="desc-line" style="color: var(--text-muted); font-style: italic; justify-content: center;">Опис відсутній...</div>`;
    return safeDesc.replace(/\|/g, '\n').split(/\r?\n/).map(line => {
        const l = line.trim(); if (!l) return '';
        if (l.startsWith('+')) return `<div style="font-weight:700; font-size:14px; color:var(--text-main); margin: 12px 0 6px 0;">${l.substring(1).trim()}</div>`;
        if (l.startsWith('=')) return `<div style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--text-muted); margin: 12px 0 6px 0;">${l.substring(1).trim()}</div>`;
        return `<div class="desc-line">🔹 ${l}</div>`;
    }).join('');
};

// ==========================================
// ЛОГИКА СРАВНЕНИЯ ДВУХ СЕРВИСОВ
// ==========================================
window.toggleCompareMode = function() {
    isCompareMode = !isCompareMode; compareSelection = []; 
    const btn = document.getElementById('toggleCompareBtn');
    btn.innerText = isCompareMode ? 'Скасувати' : 'Порівняти';
    document.getElementById('compareBar').classList.toggle('show', isCompareMode);
    window.updateCompareUI(); window.renderServices(); 
};

window.toggleModalCompareMode = function() {
    isModalCompareMode = !isModalCompareMode; modalCompareSelection = []; 
    const btn = document.querySelector('.modal.show .compare-toggle-btn');
    if (btn) btn.innerText = isModalCompareMode ? 'Скасувати порівняння' : 'Порівняти';
    document.getElementById('compareBar').classList.toggle('show', isModalCompareMode);
    window.updateModalCompareUI();
    if (document.getElementById('montazhCity')) window.updateMontazhResults(); 
    else if (document.querySelector('#rezervItemModal.show')) window.updateRezervServicesFiltered(document.getElementById('discountReasonSelect')?.value || "");
    else window.updateSetupResults(); 
};

window.handleServiceClick = function(e, name, code, isPackage, forceNoCompare = false, priceLabel = "") {
    if (e.target.closest('.desc-toggle-wrapper') || e.target.closest('.desc-content')) return;
    if (isCompareMode && !forceNoCompare) {
        if (isPackage) return;
        let index = compareSelection.indexOf(name);
        if (index > -1) compareSelection.splice(index, 1);
        else if (compareSelection.length < 2) compareSelection.push(name);
        window.updateCompareUI(); window.renderServices(); 
    } else { window.openModal(name, code, priceLabel); }
};

window.handleModalServiceClick = function(e, name, isPackage, code, priceLabel = "") {
    if (e.target.closest('.desc-toggle-wrapper') || e.target.closest('.desc-content')) return; 
    if (isModalCompareMode) {
        if (isPackage) return;
        let index = modalCompareSelection.indexOf(name);
        if (index > -1) modalCompareSelection.splice(index, 1);
        else if (modalCompareSelection.length < 2) modalCompareSelection.push(name);
        window.updateModalCompareUI();
        if (document.getElementById('montazhCity')) window.updateMontazhResults(); 
        else if (document.querySelector('#rezervItemModal.show')) window.updateRezervServicesFiltered(document.getElementById('discountReasonSelect').value);
        else window.updateSetupResults(); 
    } else {
        if (isPackage) window.openModal(name, code, priceLabel);
        else e.currentTarget.querySelector('.desc-toggle-wrapper')?.click();
    }
};

window.updateCompareUI = function() {
    let count = compareSelection.length;
    document.getElementById('compareStatusText').innerText = count === 2 ? "Готово!" : `Обрано ${count}/2`;
    document.getElementById('compareExecuteBtn').disabled = count !== 2;
};

window.updateModalCompareUI = function() {
    let count = modalCompareSelection.length;
    document.getElementById('compareStatusText').innerText = count === 2 ? "Готово!" : `Обрано ${count}/2`;
    document.getElementById('compareExecuteBtn').disabled = count !== 2;
};

window.handleExecuteCompare = function() {
    let list = isModalCompareMode ? window.lastModalServices : window.lastCalculatedServices;
    let selection = isModalCompareMode ? modalCompareSelection : compareSelection;
    let sA = list.find(s => (s.name || s.serviceName) === selection[0]);
    let sB = list.find(s => (s.name || s.serviceName) === selection[1]);
    if (!sA || !sB) return;
    
    let html = `<div style="padding:16px; background:var(--card-bg); border-radius:12px;">
        <h3>${sA.title || sA.serviceName} vs ${sB.title || sB.serviceName}</h3>
        <p><b>${sA.label || sA.priceText}</b> проти <b>${sB.label || sB.priceText}</b></p>
    </div>`;
    window.safeUpdateHTML('compareModalBody', html);
    window.openModalBase('compareModal');
};

// ==========================================
// АКТИВНЫЕ РЕЗЕРВЫ И СВЯЗАННЫЕ ОКНА
// ==========================================
window.renderRezervyList = function() {
    const store = document.getElementById('storeFilter').value;
    const cont = document.getElementById('rezervyList');
    const searchInput = document.getElementById('topReservesSearchInput');
    const searchQuery = searchInput ? searchInput.value.toLowerCase().trim() : '';

    if (db.rezervyDate && document.getElementById('rezervyDateContainer')) {
        document.getElementById('rezervyDateContainer').innerHTML = `📅 Оновлення: ${db.rezervyDate}`;
    }

    if (!store) { window.safeUpdateHTML(cont, '<div style="padding:20px; text-align:center; color:var(--text-muted);">Оберіть магазин вище</div>'); return; }
    let matches = db.rezervyData.filter(r => r.store === store);

    if (searchQuery) {
        matches = matches.filter(r => r.name.toLowerCase().includes(searchQuery) || r.cat.toLowerCase().includes(searchQuery));
    }

    if (matches.length === 0) { window.safeUpdateHTML(cont, `<div style="padding:20px; text-align:center; color:var(--text-muted);">Нічого не знайдено</div>`); return; }
    matches.sort((a, b) => b.price - a.price);

    let html = matches.map(r => {
        let shortName = r.name.replace(/^(Телевізор|Ноутбук|Смартфон|Планшет|Пилосос)\s*/i, '');
        let isDiscount = shortName.toLowerCase().includes('уцінка');
        let safeCat = String(r.cat).replace(/'/g, "\\'");
        let safeName = String(shortName).replace(/'/g, "\\'");
        
        return `
        <div class="list-item" onclick="window.openRezervItemModal('${safeCat}', ${r.price}, '${safeName}', ${isDiscount})">
            <div class="list-item-content">
                <span class="list-item-title rezervy-name">${shortName}</span>
                <span class="list-item-subtitle rezervy-cat">${r.cat}</span>
            </div>
            <div class="list-item-value rezervy-price">
                ${Math.round(r.price).toLocaleString('uk-UA')} ₴
                ${isDiscount ? `<img src="assets/icons/Discount.svg" class="discount-tag-icon">` : ''}
            </div>
        </div>`;
    }).join('');
    window.safeUpdateHTML(cont, html);
};

window.openRezervItemModal = function(catName, price, itemName, isDiscount = false) {
    let searchVal = normalize(catName); 
    let foundItem = db.categories.find(c => normalize(c.ua).includes(searchVal) || searchVal.includes(normalize(c.ua)));
    window.currentRezervItem = foundItem || { category: catName, service: "" };
    window.currentRezervPrice = price;
    window.currentRezervIsDiscount = isDiscount;

    document.getElementById('rezervItemTitle').innerText = `${itemName} — ${Math.round(price).toLocaleString('uk-UA')} ₴`;
    window.openModalBase('rezervItemModal');

    let listEl = document.getElementById('rezervServiceList');
    if (isDiscount) {
        let options = db.categories.map(c => c.ua).filter(ua => ua && ua.toLowerCase().startsWith('уцінка')).map(k => `<option value="${window.escapeHTML(k)}">${window.escapeHTML(k)}</option>`).join('');
        window.safeUpdateHTML('rezervTechInfo', `
            <div class="input-group">
                <select id="discountReasonSelect" onchange="window.updateRezervServicesFiltered(this.value)">
                    <option value="">-- Оберіть причину уцінки --</option>${options}
                </select>
            </div>`);
        window.safeUpdateHTML(listEl, '<div style="padding:10px;color:var(--text-muted)">Будь ласка, оберіть причину уцінки.</div>');
    } else {
        window.safeUpdateHTML('rezervTechInfo', '');
        window.updateRezervServicesFiltered("");
    }
};

window.updateRezervServicesFiltered = function(discountReason) {
    let item = window.currentRezervItem;
    let p = window.currentRezervPrice;
    let listEl = document.getElementById('rezervServiceList');
    let baseServicesArray = window.calculateServicesArray(item, p);

    if (discountReason && db.categories) {
        let discountCat = db.categories.find(c => String(c.ua).trim().toLowerCase() === String(discountReason).trim().toLowerCase());
        if (discountCat && discountCat.service) {
            let allowed = discountCat.service.split('|').map(s => normalizeServiceName(s));
            baseServicesArray = baseServicesArray.filter(s => allowed.some(ds => normalizeServiceName(s.name).includes(ds)));
        }
    }
    baseServicesArray.forEach(s => s.descToggleHTML = window.generateDescToggleHTML(window.findInDb(db.descriptions, s.name), s.code));
    window.lastModalServices = baseServicesArray;
    window.safeUpdateHTML(listEl, baseServicesArray.map(s => window.generateServiceCardHTML(s, true, false)).join(''));
};

// ==========================================
// ПАКЕТЫ И СЕРВИСНЫЕ ВКЛАДКИ ДЛЯ МОДАЛОК
// ==========================================
window.renderMontazhModal = function() {
    const cities = db.montazhData.cities.sort();
    const categories = [...new Set(db.montazhData.services.map(s => s.cat).filter(Boolean))];
    window.safeUpdateHTML('modalBody', `
        <div class="input-group"><select id="montazhCity"><option value="">-- Оберіть місто --</option>${cities.map(c => `<option value="${c}">${c}</option>`).join('')}</select></div>
        <div class="input-group"><select id="montazhCat"><option value="">-- Оберіть категорію --</option>${categories.map(c => `<option value="${c}">${c}</option>`).join('')}</select></div>
        <div id="montazhResults" style="display:flex;flex-direction:column;gap:12px;"></div>`);
    document.getElementById('montazhCity').addEventListener('change', window.updateMontazhResults);
    document.getElementById('montazhCat').addEventListener('change', window.updateMontazhResults);
};

window.updateMontazhResults = function() {
    const city = document.getElementById('montazhCity').value;
    const cat = document.getElementById('montazhCat').value;
    const resContainer = document.getElementById('montazhResults');
    if (!city || !cat) return;

    let matches = db.montazhData.services.filter(s => s.cat === cat);
    let html = matches.map(s => {
        let avail = s.availability[city] || "Немає";
        let isUnavail = avail.toLowerCase().includes("немає");
        let obj = { name: s.name, title: s.name.replace(/^\[.*?\]\s*/, ''), label: s.price || "Пакет", code: s.code, isPackage: false };
        obj.descToggleHTML = window.generateDescToggleHTML(window.findInDb(db.descriptions, s.name), s.code);
        if (isUnavail) return `<div class="service-card" style="opacity:0.5"><h4>${obj.title}</h4><p>Монтаж відсутній у цьому місті</p></div>`;
        return window.generateServiceCardHTML(obj, true, true);
    }).join('');
    window.safeUpdateHTML(resContainer, html);
};

window.renderSetupModal = function(targetName) {
    let setupCats = [...new Set(db.tariffs.filter(t => t.cat && !t.cat.toLowerCase().includes('монтаж')).map(t => t.cat))];
    window.safeUpdateHTML('modalBody', `
        <div class="input-group"><select id="setupCat"><option value="">-- Оберіть категорію --</option>${setupCats.map(c => `<option value="${c}">${c}</option>`).join('')}</select></div>
        <div id="setupResults" style="display:flex;flex-direction:column;gap:12px;"></div>`);
    document.getElementById('setupCat').addEventListener('change', window.updateSetupResults);
};

window.updateSetupResults = function() {
    let cat = document.getElementById('setupCat').value;
    let container = document.getElementById('setupResults');
    if (!cat) return;
    let matches = db.tariffs.filter(t => t.cat === cat);
    let html = matches.map(m => {
        let obj = { name: m.service, title: m.service.replace(/^\[.*?\]\s*/, ''), label: m.cost || "Пакет", code: m.code, isPackage: false };
        obj.descToggleHTML = window.generateDescToggleHTML(window.findInDb(db.descriptions, m.name), m.code);
        return window.generateServiceCardHTML(obj, true, true);
    }).join('');
    window.safeUpdateHTML(container, html);
};

window.openModal = function(name, code = "", priceLabel = "") {
    let u = String(name).toUpperCase(); 
    if (u.includes('МОНТАЖ') || u.includes('ПІДКЛЮЧЕННЯ')) { document.getElementById('modalTitle').innerText = "Монтаж ВПТ"; window.openModalBase('descModal'); window.renderMontazhModal(); } 
    else if (u.includes('НАЛАШТУВАННЯ') || u.includes('ГОДИНА РОБОТИ')) { document.getElementById('modalTitle').innerText = "Налаштування"; window.openModalBase('descModal'); window.renderSetupModal(name); }
    else { window.openModalBase('descModal', name, code, priceLabel); }
};

// ==========================================
// ДИНАМИЧЕСКИЕ КНОПКИ ДЛЯ ВКЛАДКИ SKILLHUB
// ==========================================
window.renderSkillHubTab = function() {
    const container = document.getElementById('dynamicSkillHubButtons');
    if (!container || !db.skillHubButtons) return;

    let html = db.skillHubButtons.map(btn => {
        let actionStr = '';
        let linkStr = String(btn.link).trim();
        
        // Внедрение SPA бесшовных переходов для внутренних модулей
        if (linkStr === "Education.html" || linkStr === "Simulator.html") {
            actionStr = `onclick="window.openModule('${linkStr}')"`;
        } else if (linkStr !== "" && linkStr !== "#") {
            actionStr = `onclick="window.open('${linkStr}', '_blank')"`;
        } else {
            actionStr = `onclick="window.openSellerModal()"`;
        }

        return `
        <button class="list-item" ${actionStr}>
            <div style="width: 44px; height: 44px; flex-shrink: 0; margin-right: 12px;">
                ${window.renderIcon(btn.emoji)}
            </div>
            <div class="list-item-content">
                <span class="list-item-title">${btn.name}</span>
                <span class="list-item-subtitle">${btn.desc}</span>
            </div>
            <div class="list-item-arrow">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" style="width:18px; height:18px; stroke-width: 2.5;"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </div>
        </button>`;
    }).join('');
    window.safeUpdateHTML(container, html);
};

// ==========================================
// УПРАВЛЕНИЕ КОПИРОВАНИЕМ И ИНТЕРФЕЙСОМ ПОШУКА
// ==========================================
window.copyCode = function(e, el, code) {
    if (e) e.stopPropagation(); 
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(code).then(() => window.showCopied(el));
    } else {
        let t = document.createElement("textarea"); t.value = code;
        t.style.position = "fixed"; t.style.opacity = "0"; document.body.appendChild(t);
        t.focus(); t.select(); document.execCommand('copy'); window.showCopied(el); t.remove();
    }
};

window.showCopied = function(el) {
    const og = el.innerHTML; el.innerHTML = "Скопійовано ✓"; el.style.color = "var(--primary)";
    setTimeout(() => { el.innerHTML = og; el.style.color = ""; }, 1500);
};

// Глобальные обработчики событий после загрузки структуры DOM
document.addEventListener('DOMContentLoaded', () => {
    // Темная тема и ползунок шрифта
    let savedFontScale = localStorage.getItem('skillhub_font_scale') || "1";
    document.getElementById('fontSizeSlider').value = savedFontScale;
    window.updateFontScale(savedFontScale);

    document.getElementById('fontSizeSlider').addEventListener('input', function() {
        window.updateFontScale(this.value);
    });

    // Очистка полей ввода
    document.getElementById('clearAllBtn').onclick = () => {
        document.getElementById('catInput').value = "";
        document.getElementById('clearAllBtn').style.display = 'none';
        document.getElementById('customSuggestions').style.display = 'none';
        document.getElementById('priceWrapper').style.display = 'none';
        document.getElementById('result').style.display = 'none';
    };

    // Слушатель скролла для кнопки "вверх"
    window.addEventListener('scroll', () => {
        document.getElementById('scrollTopBtn').classList.toggle('show', window.scrollY > 200);
    });
    document.getElementById('scrollTopBtn').onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Подгрузка базы
    init();
});
