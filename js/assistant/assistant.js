    (function(){
        let initialTab = sessionStorage.getItem('skillhub_active_tab') || 'tab-search';
        document.getElementById(initialTab).classList.add('active');
        let navBtn = document.querySelector(`.nav-item[onclick*="${initialTab}"]`);
        if (navBtn) navBtn.classList.add('active');

        const titles = {
            'tab-search': 'Пошук',
            'tab-reserves': 'Активні резерви',
            'tab-skillhub': 'SkillHUB',
            'tab-settings': 'Налаштування'
        };
        document.getElementById('headerTitle').innerText = titles[initialTab] || 'Пошук';
    })();

    window.currentDevicePrice = 0;

    window.currentRezervItem = null;
    window.currentRezervPrice = 0;
    window.currentRezervIsDiscount = false;

    window.klochList = [];

    window.updateFontScale = function(scale) {
        localStorage.setItem('skillhub_font_scale', scale);
        if (window.updateAcademyFontScale) window.updateAcademyFontScale(scale);
        let style = document.getElementById('dynamicFontScale');
        if(!style) {
            style = document.createElement('style');
            style.id = 'dynamicFontScale';
            document.head.appendChild(style);
        }
        style.innerHTML = `
            :root {
                --nav-height: calc(76px * ${scale});
            }
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
        `;
    };

    let savedFontScale = localStorage.getItem('skillhub_font_scale') || "1";
    document.getElementById('fontSizeSlider').value = savedFontScale;
    window.updateFontScale(savedFontScale);

    function safeUpdateHTML(elementOrId, newHtml) {
        let el = typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;
        if (el && el.innerHTML !== newHtml) {
            el.innerHTML = newHtml;
        }
    }

    window.renderIcon = function(val) {
        if (!val) return '';
        let clean = String(val).trim();
        if (clean.toLowerCase().endsWith('.svg') || clean.toLowerCase().endsWith('.png')) {
            return `<img src="${SKILLHUB_ICONS_DIR}${clean}" alt="icon" style="width: 100%; height: 100%; object-fit: contain; display: block;">`;
        }
        return clean;
    };

    window.addEventListener('error', function(e) {
        const elLoader = document.getElementById('appLoader');
        if (elLoader && !elLoader.classList.contains('hidden')) {
            elLoader.querySelector('.loader-text').innerHTML = "Критична помилка HTML:<br>" + e.message + "<br><br><span style='font-size:10px; opacity:0.7'>Скиньте кеш браузера</span>";
        }
    });

    const CACHE_KEY = 'skillhub_v7_catalog';      // тільки загальні дані (без співробітників і паролів)
    const OLD_CACHE_KEY = 'skillhub_v6_cache';    // старий кеш містив паролі - читаємо один раз і видаляємо
    const SEEN_VERSION_KEY = 'skillhub_version_flat_v6';

    let db = { categories: [], descriptions: {}, tariffs: [], appVersion: "", changelog: "", montazhData: {cities:[], services:[]}, serviceCodes: {}, rezervyData: [], rezervyDate: "", serviceBrands: {}, trainingData: [], skillHubButtons: [], sellerRatings: [], klochCalcData: { rules: [], relevance: "" } };
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

    window.buildServiceSearchList = function() {
        let uniqueMap = new Map();

        if(db.tariffs) {
            db.tariffs.forEach(t => {
                if(t.service) {
                    let origName = t.service.trim();
                    if(!uniqueMap.has(origName)) {
                        uniqueMap.set(origName, { orig: origName, ru: t.serviceRu || "", en: t.serviceEn || "" });
                    }
                }
            });
        }
        if(db.descriptions) {
            Object.keys(db.descriptions).forEach(k => {
                let origName = k.trim();
                if(!uniqueMap.has(origName)) {
                    uniqueMap.set(origName, { orig: origName, ru: "", en: "" });
                }
            });
        }

        window.allServicesSearchList = Array.from(uniqueMap.entries()).map(([origName, data]) => {
            let nameClean = origName.replace(/^\[.*?\]\s*/, '').trim();
            let u = nameClean.toUpperCase();

            let icon = '⚙️';

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

            let displayBrand = brand;
            if(cls === 'brand-ekta') displayBrand = 'ЕКТА';
            if(cls === 'brand-support') displayBrand = 'SUPPORT';
            if(cls === 'brand-epz') displayBrand = 'ЕПЗ';

            return {
                origName: origName,
                name: nameClean,
                searchStr: [nameClean, data.ru, data.en].join(' '),
                icon: icon,
                searchType: 'service',
                brandText: displayBrand,
                cls: cls
            };
        });
    };

    function sanitizeDb(data) {
        if(!data) return { categories: [], descriptions: {}, tariffs: [], montazhData: {cities:[], services:[]}, serviceCodes: {}, rezervyData: [], rezervyDate: "", serviceBrands: {}, trainingData: [], skillHubButtons: [], sellerRatings: [], klochCalcData: { rules: [], relevance: "" } };
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
        data.news = Array.isArray(data.news) ? data.news : [];
        data.access = (data.access && typeof data.access === 'object') ? data.access : {};
        data.klochCalcData = data.klochCalcData || { rules: [], relevance: "" };
        return data;
    }

    const tabTitles = {
        'tab-search': 'Пошук',
        'tab-reserves': 'Активні резерви',
        'tab-skillhub': 'SkillHUB',
        'tab-settings': 'Налаштування'
    };

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

    let currentTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateToggleUI();

    document.getElementById('themeToggle').onclick = () => {
        currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', currentTheme);
        localStorage.setItem('theme', currentTheme);
        updateToggleUI();
    };

    function updateToggleUI() {
        const toggle = document.getElementById('themeToggle');
        if(currentTheme === 'dark') toggle.classList.add('active');
        else toggle.classList.remove('active');
    }

    const brandRegex = /^\[(.*?)\]/;

    window.switchTab = function(tabId) {
        if (window.Academy && window.Academy.isOpen) { try { window.Academy.close(); } catch (e) {} }
        if (!_hudBusy && isUsableDb(db)) forceHideLoader();
        document.querySelectorAll('.app-tab').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));

        document.getElementById(tabId).classList.add('active');

        let activeNavBtn = document.querySelector(`.nav-item[onclick*="${tabId}"]`);
        if (activeNavBtn) activeNavBtn.classList.add('active');

        document.getElementById('headerTitle').innerText = tabTitles[tabId];

        const topFavBtn = document.getElementById('topFavBtn');
        if (topFavBtn) {
            topFavBtn.style.display = (tabId === 'tab-search') ? 'flex' : 'none';
        }

        if (isCompareMode) toggleCompareMode();
        if (isModalCompareMode) toggleModalCompareMode();

        if (compareBar) compareBar.classList.remove('show');

        if (tabId === 'tab-reserves') window.renderRezervyList();

        window.scrollTo(0, 0);

        sessionStorage.setItem('skillhub_active_tab', tabId);
    }

    window.openModalBase = function(modalId, name = "", code = "", priceLabel = "", discount = "") {
        try {
            if (name && modalId === 'descModal') {
                let title = name.replace(/🇺🇦\s*/g, '').replace(/^UA\s+/i, '').replace(/^\[.*?\]\s*/, '');

                let priceLabelHtml = "";
                if (priceLabel && priceLabel !== "Дізнатись" && priceLabel !== "Обрати пакет") {
                    priceLabelHtml = `<div style="font-size: 16px; font-weight: 800; color: var(--primary); white-space: nowrap; background: var(--input-bg); padding: 4px 10px; border-radius: 8px;">${priceLabel}</div>`;
                }

                let discountBadgeHtml = "";
                if (discount && discount !== "0%" && discount !== "0" && discount !== "" && discount !== "-") {
                    let cleanDisc = window.escapeHTML(discount).replace('-', '');
                    discountBadgeHtml = `<div style="font-size: 10px; font-weight: 700; color: #d32f2f; background: #ffebee; padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(211, 47, 47, 0.2); white-space: nowrap;">До -${cleanDisc}</div>`;
                }

                document.getElementById('modalTitle').innerHTML = `
                <div style="display:flex; align-items:center; justify-content:space-between; width:100%; gap:10px;">
                    <span style="line-height:1.2; flex:1;">${title}</span>
                    <div style="display:flex; flex-direction:column; align-items:flex-end; gap:4px; flex-shrink:0;">
                        ${priceLabelHtml}${discountBadgeHtml}
                    </div>
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
                        if (currentSum >= p) {
                            allCombos.push({ combo: [...currentCombo], sum: currentSum });
                            return;
                        }
                        if (currentCombo.length >= 4) return;

                        for (let i = startIndex; i < validTariffs.length; i++) {
                            currentCombo.push(validTariffs[i]);
                            findCombos(i, currentCombo, currentSum + validTariffs[i].maxPrice);
                            currentCombo.pop();
                        }
                    }
                    findCombos(0, [], 0);

                    allCombos.sort((a, b) => {
                        let diffA = a.sum - p;
                        let diffB = b.sum - p;
                        if (diffA !== diffB) return diffA - diffB;
                        return a.combo.length - b.combo.length;
                    });

                    let uniqueCombos = [];
                    let seenSignatures = new Set();
                    for (let c of allCombos) {
                        let sig = c.combo.map(t => t.maxPrice).sort((x, y) => x - y).join('-');
                        if (!seenSignatures.has(sig)) {
                            seenSignatures.add(sig);
                            uniqueCombos.push(c);
                        }
                    }

                    let topCombos = uniqueCombos.slice(0, 2);

                    if (topCombos.length > 0) {
                        let comboVariantsHtml = topCombos.map((comboObj, vIdx) => {
                            let totalComboPrice = 0;

                            let comboItemsHtml = comboObj.combo.map(t => {
                                let minP = t.minPrice || 0;
                                let maxP = t.maxPrice || 0;
                                let tName = t.service;

                                let cleanName = tName.replace(/^\[.*?\]\s*/, '').trim();
                                let brandMatch = tName.match(/^\[(.*?)\]/);
                                let brand = brandMatch ? brandMatch[1] : "";
                                let displayName = brand ? `[${brand}]${cleanName}` : cleanName;

                                if (!displayName.includes(maxP.toString())) {
                                    displayName += ` (${minP.toLocaleString('uk-UA')} -${maxP.toLocaleString('uk-UA')})`;
                                }

                                let tPriceStr = "";
                                let tPriceNum = 0;
                                if (t.cost) {
                                    let cStr = String(t.cost).trim();
                                    if (cStr.includes('%')) {
                                        tPriceNum = Math.round(maxP * parseFloat(cStr.replace(',', '.'))/100);
                                    } else {
                                        tPriceNum = parseFloat(cStr.replace(/\s+/g, '').replace(',', '.'));
                                    }
                                    if (!isNaN(tPriceNum)) {
                                        totalComboPrice += tPriceNum;
                                        tPriceStr = tPriceNum.toLocaleString('uk-UA') + " ₴";
                                    } else {
                                        tPriceStr = cStr;
                                    }
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
                                </div>
                                `;
                            }).join('');

                            let sumHtml = comboObj.sum.toLocaleString('uk-UA');
                            let certCount = comboObj.combo.length;
                            let certWord = (certCount >= 2 && certCount <= 4) ? "сертифікати" : "сертифікатів";
                            let variantTitle = `Варіант ${vIdx + 1} (${certCount}${certWord})`;

                            return `
                            <div style="margin-bottom: 20px;">
                                <div style="font-size: 11px; font-weight: 800; color: var(--text-muted); text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px; text-align: center;">${variantTitle}</div>${comboItemsHtml}
                                <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 8px; background: var(--card-bg); padding: 12px; border-radius: 8px; border: 1px solid var(--primary-light);">
                                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: var(--text-muted);">
                                        <span>Сума діапазонів:</span>
                                        <span style="font-weight:700; color:var(--text-main);">${sumHtml} ₴</span>
                                    </div>
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
                                    <div style="text-align:center; font-size:13px; color:var(--text-muted); font-weight:600; margin-bottom:16px;">Об'єднання для ${p.toLocaleString('uk-UA')} ₴</div>${comboVariantsHtml}
                                </div>
                            </div>
                        `;
                    }
                }

                document.getElementById('modalBody').innerHTML = generateDescToggleHTML(raw, code).replace('display: none;', 'display: block;').replace('Детальніше', 'Опис сервісу') + comboHtml;
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
    }

    window.closeModalBase = function(modalId) {
        document.getElementById(modalId).classList.remove('show');

        if (!checkOpenModals()) {
            document.body.classList.remove('modal-open');
            document.body.style.top = '';
            window.scrollTo(0, savedScrollY);
        }

        if (modalId === 'descModal' || modalId === 'rezervItemModal' || modalId === 'sellerModal' || modalId === 'certManualModal' || modalId === 'ratingModal' || modalId === 'klochCalcModal' || modalId === 'favSelectModal' || modalId === 'favQuickMenuModal') {
            if (isModalCompareMode) {
                isModalCompareMode = false;
                modalCompareSelection = [];
                if (compareBar) compareBar.classList.remove('show');
                document.querySelectorAll('.compare-toggle-btn').forEach(btn => {
                    btn.innerText = 'Порівняти';
                    btn.classList.remove('active');
                });

                if (document.getElementById('montazhCity')) window.updateMontazhResults();
                else if (document.querySelector('#rezervItemModal.show')) window.updateRezervResults();
                else window.updateSetupResults();
            }
        }
    }

    window.openRatingModal = function() {
        window.renderRatingModalContent();
        window.openModalBase('ratingModal');
    }


    /* ====================== Доступи за ролями, особистий кабінет, новини ====================== */
    const ACCESS_GUEST_KEY = 'Без входу';
    function currentUserInfo() { try { return JSON.parse(localStorage.getItem('skillhub_user') || 'null'); } catch (e) { return null; } }
    const ACCESS_ENABLED = false;      // доступи за ролями поки вимкнені
    function deniedList() {
        if (!ACCESS_ENABLED) return [];
        const acc = (db && db.access) || {};
        const u = currentUserInfo();
        const key = u && u.role ? String(u.role).trim().toLowerCase() : ACCESS_GUEST_KEY.toLowerCase();
        for (const k in acc) { if (String(k).trim().toLowerCase() === key) return (acc[k] || []).map(x => String(x).trim()); }
        return [];      // немає рядка ролі в листі «Доступи» → усе дозволено
    }
    window.isDenied = function(name) { return deniedList().indexOf(String(name || '').trim()) !== -1; };

    window.applyAccess = function() {
        if (!ACCESS_ENABLED) { if (window.renderVoteRow) window.renderVoteRow(); return; }
        const denied = deniedList();
        document.querySelectorAll('[data-func]').forEach(el => {
            el.style.display = denied.indexOf(el.getAttribute('data-func')) !== -1 ? 'none' : '';
        });
        const nb = document.getElementById('newsBtn');
        if (nb) nb.style.display = denied.indexOf('Новини') !== -1 ? 'none' : '';
        // якщо поточна вкладка заборонена — переходимо на першу дозволену
        const tabFunc = { 'tab-search': 'Пошук', 'tab-reserves': 'Резерви', 'tab-skillhub': 'SkillHUB', 'tab-settings': 'Опції' };
        const act = document.querySelector('.app-tab.active');
        if (act && denied.indexOf(tabFunc[act.id]) !== -1) {
            const first = Object.keys(tabFunc).find(t => denied.indexOf(tabFunc[t]) === -1);
            if (first) window.switchTab(first);
        }
        // підпис рядка «Особистий кабінет»
        const u = currentUserInfo();
        const t = document.getElementById('cabinetTitle'), sub = document.getElementById('cabinetSub');
        if (t && sub) {
            if (u) { t.innerText = 'Особистий кабінет'; sub.innerText = 'Ви увійшли: ' + (u.name || u.login) + (u.role ? ' · ' + u.role : ''); }
            else { t.innerText = 'Вхід в особистий кабінет'; sub.innerText = 'Логін і пароль видає керівник'; }
        }
        if (window.renderSkillHubTab) window.renderSkillHubTab();
    };
    window.addEventListener('skillhub-user', () => { try { window.applyAccess(); } catch (e) {} });

    window.openAcademyTab = function() {
        if (window.Academy && !window.Academy.isOpen) window.Academy.open();
    };

    // Новини: A — дата, B — текст (розмітка як в Academy)
    function newsSeenTs() { try { return parseInt(localStorage.getItem('skillhub_news_seen') || '0', 10) || 0; } catch (e) { return 0; } }
    window.renderNewsBadge = function() {
        const btn = document.getElementById('newsBtn');
        if (!btn) return;
        const news = (db && db.news) || [];
        const latest = news.reduce((m, n) => Math.max(m, n.ts || 0), 0);
        btn.classList.toggle('has-new', latest > newsSeenTs());
    };
    function newsHtml(n, isNew) {
        return `<div class="news-date">${safeText(n.date)}${isNew ? '<span class="news-new">НОВЕ</span>' : ''}</div>`
            + RichText.render(String(n.text || ''), { plain: line => `<div class="news-line">${RichText.inline(line)}</div>` });
    }
    window.renderNewsTop = function() {};   // верхня картка новин прибрана
    // При запуску: якщо є непрочитана новина — один раз показуємо вікно. Не прочитав → кнопка в шапці пульсує червоним.
    let newsPopupDone = false;
    window.maybeShowNewsPopup = function() {
        if (newsPopupDone) return;
        const news = (db && db.news) || [];
        if (!news.length) return;
        if ((news[0].ts || 0) <= newsSeenTs()) { newsPopupDone = true; return; }
        try { if (sessionStorage.getItem('skillhub_news_popup') === '1') { newsPopupDone = true; return; } sessionStorage.setItem('skillhub_news_popup', '1'); } catch (e) {}
        newsPopupDone = true;
        const academyOpen = window.Academy && window.Academy.isOpen;
        if (academyOpen || document.querySelector('.modal.show')) return;
        setTimeout(() => window.openNews(true), 700);
    };
    window.ackNews = function() { markNewsRead(); window.closeModalBase('newsModal'); };
    function markNewsRead() {
        const latest = ((db && db.news) || []).reduce((m, n) => Math.max(m, n.ts || 0), 0);
        try { localStorage.setItem('skillhub_news_seen', String(latest)); } catch (e) {}
        window.renderNewsBadge();
    }
    window.renderVoteRow = function() {
        const row = document.getElementById('voteRow');
        if (row) row.style.display = (db && db.voteOpen) ? '' : 'none';
    };
    window.openNews = function(auto) {
        const news = (db && db.news) || [];
        const seen = newsSeenTs();
        const body = document.getElementById('newsBody');
        if (!news.length) body.innerHTML = '<div class="news-empty">Поки що новин немає' + ((db && db.serverRev != null && db.serverRev < NEED_REV) ? '<br><br><span style="color:var(--danger);font-size:13px;">' + OLD_SCRIPT_MSG + '</span>' : '') + '</div>';
        else body.innerHTML = news.map(n => {
            const isNew = (n.ts || 0) > seen;
            return `<div class="news-item${isNew ? ' is-new' : ''}"><div class="news-date">${safeText(n.date)}${isNew ? '<span class="news-new">НОВЕ</span>' : ''}</div>`
                + RichText.render(String(n.text || ''), { plain: line => `<div class="news-line">${RichText.inline(line)}</div>` }) + `</div>`;
        }).join('');
        window.openModalBase('newsModal');
        if (!auto) markNewsRead();     // відкрив сам — вважаємо прочитаним; автопоказ — лише після «Зрозуміло»
    };
    function safeText(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }


    /* ====================== Зворотній зв'язок і голосування ====================== */
    function deviceUid() {
        const u = currentUserInfo();
        if (u && u.login) return 'u:' + String(u.login).toLowerCase();
        try {
            let id = localStorage.getItem('skillhub_uid');
            if (!id) { id = 'd:' + (crypto.randomUUID ? crypto.randomUUID() : (Date.now() + '-' + Math.random().toString(36).slice(2))); localStorage.setItem('skillhub_uid', id); }
            return id;
        } catch (e) { return 'd:tmp'; }
    }
    function dayStr() { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
    function lsJson(k) { try { return JSON.parse(localStorage.getItem(k) || '{}') || {}; } catch (e) { return {}; } }
    function lsSetJson(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
    function postPublic(body) {
        return fetch(API_URL, { method: 'POST', cache: 'no-store', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) }).then(r => r.text()).then(t => JSON.parse(t));
    }
    const fbState = {};
    const NEED_REV = 6;
    function fetchJsonT(url, ms) {
        const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), ms || 9000);
        return fetch(url, { cache: 'no-store', signal: ctl.signal }).then(r => r.text()).then(txt => JSON.parse(txt)).finally(() => clearTimeout(t));
    }
    const OLD_SCRIPT_MSG = 'Сервер не віддав дані. Схоже, в Apps Script не розгорнуто останню версію скрипта: Розгорнути → Керування розгортаннями → Редагувати → Нова версія.';

    // «Живі» дані: новини, відкрите голосування, питання відгуку (не залежать від кешу каталогу)
    let extrasAt = 0;
    window.loadExtras = async function(force) {
        if (!force && Date.now() - extrasAt < 45000) return;
        if (navigator.onLine === false || !db) return;
        extrasAt = Date.now();
        try {
            const r = await fetchJsonT(API_URL + '?action=extras', 10000);
            if (!r || typeof r !== 'object' || r.serverRev == null) { db.serverRev = 0; window.renderServerRev(); return; }
            db.serverRev = r.serverRev;
            if (Array.isArray(r.news)) db.news = r.news;
            if (Array.isArray(r.feedback)) db.feedback = r.feedback;
            db.voteOpen = !!r.voteOpen;
            window.renderNewsBadge(); window.renderVoteRow(); window.renderServerRev();
            window.maybeShowNewsPopup();
        } catch (e) { extrasAt = 0; }
    };
    window.renderServerRev = function() {
        const el = document.getElementById('serverRevDisp');
        if (!el || !db) return;
        const rev = db.serverRev;
        if (rev == null) { el.innerText = ''; return; }
        el.innerText = rev >= NEED_REV ? '' : 'Скрипт застарілий — оновіть розгортання в Apps Script';
        el.style.color = 'var(--danger)';
    };
    document.addEventListener('visibilitychange', () => { if (!document.hidden) window.loadExtras(false); });

    function fbIsRate(q) { return !!q.rate || /оцін|оцен/i.test(q.q || ''); }
    let fbQs = [];
    window.openFeedback = async function() {
        const body = document.getElementById('feedbackBody');
        const sendBtn = document.getElementById('feedbackSend');
        for (const k in fbState) delete fbState[k];
        fbQs = ((db && db.feedback) || []).slice();
        let failed = false;
        if (!fbQs.length) {
            body.innerHTML = '<div class="news-empty">Завантаження…</div>';
            sendBtn.style.display = 'none';
            window.openModalBase('feedbackModal');
            if (navigator.onLine === false) { body.innerHTML = '<div class="news-empty">Потрібен інтернет</div>'; return; }
            try {
                const r = await fetchJsonT(API_URL + '?action=feedback', 9000);
                if (r && Array.isArray(r.questions)) { fbQs = r.questions; if (db) db.feedback = r.questions; if (db) db.serverRev = r.serverRev; }
                else failed = true;
            } catch (e) { failed = true; }
            if (failed) { body.innerHTML = '<div class="news-empty">' + OLD_SCRIPT_MSG + '</div>'; return; }
        } else {
            window.openModalBase('feedbackModal');
            // тихо оновлюємо питання у фоні
            fetchJsonT(API_URL + '?action=feedback', 9000).then(r => { if (r && Array.isArray(r.questions) && r.questions.length) { if (db) db.feedback = r.questions; } }).catch(() => {});
        }
        const qs = fbQs;
        const rated = lsJson('skillhub_fb_rated'), texts = lsJson('skillhub_fb_text');
        const today = dayStr();
        if (!qs.length) { body.innerHTML = '<div class="news-empty">Питань поки немає. Додайте шапки в рядок 1 листа «Зворотній зв\'язок і пропозиції».</div>'; return; }
        let active = 0;
        body.innerHTML = qs.map((q, i) => {
            const rate = fbIsRate(q);
            const title = `<div class="fb-q-title">${safeText(q.q)}</div>`;
            const done = rate ? !!rated[q.q] : texts[q.q] === today;
            if (done) return `<div class="fb-q">${title}<div class="fb-done">✓ ${rate ? 'Дякуємо, оцінку враховано' : 'Дякуємо! Нову відповідь можна буде надіслати завтра'}</div></div>`;
            active++;
            if (rate) {
                return `<div class="fb-q" data-i="${i}">${title}<div class="fb-slider-wrap"><div class="fb-slider-val empty" id="fbVal${i}">Рухайте повзунок</div><input type="range" class="fb-slider" min="1" max="10" step="1" value="5" oninput="window.fbSlide(${i}, this.value)" onchange="window.fbSlide(${i}, this.value)"><div class="fb-rate-hint"><span>1 — дуже погано</span><span>10 — відмінно</span></div></div></div>`;
            }
            return `<div class="fb-q" data-i="${i}">${title}<textarea class="fb-text" maxlength="1500" placeholder="Ваша розгорнута відповідь…" oninput="window.fbText(${i}, this.value)"></textarea></div>`;
        }).join('');
        sendBtn.style.display = active ? '' : 'none';
        sendBtn.disabled = false; sendBtn.innerText = 'Надіслати';
    };
    window.fbSlide = function(i, v) { fbState[i] = String(v); const el = document.getElementById('fbVal' + i); if (el) { el.classList.remove('empty'); el.innerText = v + ' / 10'; } };
    window.fbText = function(i, v) { fbState[i] = v; };

    window.sendFeedback = async function() {
        const qs = fbQs;
        const answers = Object.keys(fbState).map(i => ({ q: qs[i].q, value: String(fbState[i] || '').trim(), rate: fbIsRate(qs[i]) })).filter(a => a.value);
        if (!answers.length) { alert('Заповніть хоча б одну відповідь'); return; }
        if (navigator.onLine === false) { alert('Немає інтернету. Спробуйте, коли він з\'явиться.'); return; }
        const btn = document.getElementById('feedbackSend');
        btn.disabled = true; btn.innerText = 'Надсилаємо…';
        try {
            const r = await postPublic({ action: 'feedback_submit', uid: deviceUid(), answers: answers.map(a => ({ q: a.q, value: a.value })) });
            if (!r || !r.success) throw new Error((r && r.error) || 'error');
            const rated = lsJson('skillhub_fb_rated'), texts = lsJson('skillhub_fb_text'), today = dayStr();
            answers.forEach(a => { if (a.rate) rated[a.q] = 1; else texts[a.q] = today; });
            (r.skipped || []).forEach(q => { const f = qs.find(x => x.q === q); if (f) { if (fbIsRate(f)) rated[q] = 1; else texts[q] = today; } });
            lsSetJson('skillhub_fb_rated', rated); lsSetJson('skillhub_fb_text', texts);
            await window.openFeedback();
            const body = document.getElementById('feedbackBody');
            body.insertAdjacentHTML('afterbegin', '<div class="fb-q" style="border-color:var(--rozetka-green-dark,#10b981);"><div class="fb-q-title" style="margin:0;">✅ Дякуємо! Відповідь надіслано</div></div>');
        } catch (e) {
            btn.disabled = false; btn.innerText = 'Надіслати';
            alert('Не вдалося надіслати. Перевірте інтернет і спробуйте ще раз.');
        }
    };

    // Голосування: дані завжди свіжі з таблиці (не з кешу)
    let voteChoice = {};
    window.openVote = async function() {
        const body = document.getElementById('voteBody');
        voteChoice = {};
        body.innerHTML = '<div class="news-empty">Завантаження…</div>';
        window.openModalBase('voteModal');
        if (navigator.onLine === false) { body.innerHTML = '<div class="news-empty">Для голосування потрібен інтернет</div>'; return; }
        try {
            const r = await fetchJsonT(API_URL + '?action=vote&uid=' + encodeURIComponent(deviceUid()), 10000);
            if (!r || !Array.isArray(r.questions)) throw new Error('old');
            const open = (r && r.questions || []).filter(q => q.status !== 'closed');
            if (db) db.voteOpen = open.length > 0; window.renderVoteRow();
            renderVote(open);
        } catch (e) { body.innerHTML = '<div class="news-empty">' + OLD_SCRIPT_MSG + '</div>'; }
    };
    function renderVote(qs) {
        const body = document.getElementById('voteBody');
        const voted = lsJson('skillhub_voted');
        if (!qs.length) { body.innerHTML = '<div class="news-empty">Відкритих голосувань зараз немає</div>'; return; }
        body.innerHTML = qs.map((q, qi) => {
            const closed = q.status === 'closed';
            const tag = `<span class="vt-tag ${closed ? 'closed' : 'open'}">${closed ? 'Закрито' : 'Відкрито'}</span>`;
            const head = `<div class="fb-q-title">${safeText(q.q)}${tag}</div>`;
            if (closed) {
                const total = q.options.reduce((s, o) => s + (o.votes || 0), 0);
                const max = Math.max(0, ...q.options.map(o => o.votes || 0));
                return `<div class="vt-q">${head}${q.options.map(o => { const p = total ? Math.round((o.votes || 0) * 100 / total) : 0; return `<div class="vt-bar${max > 0 && o.votes === max ? ' win' : ''}"><i style="width:${p}%"></i><span>${safeText(o.text)}</span><span>${o.votes || 0} · ${p}%</span></div>`; }).join('')}<div class="fb-rate-hint"><span>Всього голосів: ${total}</span></div></div>`;
            }
            if (q.voted >= 0 || voted[q.id]) return `<div class="vt-q">${head}<div class="fb-done">✓ Ваш голос враховано. Результати з'являться після закриття голосування</div></div>`;
            return `<div class="vt-q" data-q="${qi}">${head}${q.options.map((o, oi) => `<button type="button" class="vt-opt" onclick="window.pickVote(${qi}, ${oi}, this)"><span class="vt-dot"></span>${safeText(o.text)}</button>`).join('')}<button class="btn btn-primary" style="margin-top:12px;" onclick="window.submitVote(${qi}, this)">Проголосувати</button></div>`;
        }).join('');
        body._qs = qs;
    }
    window.pickVote = function(qi, oi, el) { voteChoice[qi] = oi; el.parentNode.querySelectorAll('.vt-opt').forEach(b => b.classList.toggle('on', b === el)); };
    window.submitVote = async function(qi, btn) {
        const body = document.getElementById('voteBody'), q = body._qs[qi];
        if (voteChoice[qi] == null) { alert('Оберіть варіант'); return; }
        btn.disabled = true; btn.innerText = 'Надсилаємо…';
        try {
            const r = await postPublic({ action: 'vote_submit', uid: deviceUid(), qid: q.id, option: voteChoice[qi] });
            if (r && (r.success || r.error === 'already_voted')) {
                const v = lsJson('skillhub_voted'); v[q.id] = 1; lsSetJson('skillhub_voted', v);
                window.openVote();
            } else if (r && r.error === 'closed') { alert('Голосування вже закрито'); window.openVote(); }
            else throw new Error('x');
        } catch (e) { btn.disabled = false; btn.innerText = 'Проголосувати'; alert('Не вдалося проголосувати. Перевірте інтернет.'); }
    };

    function checkOpenModals() {
        const modals = ['descModal', 'compareModal', 'rezervItemModal', 'galleryModal', 'sellerModal', 'certManualModal', 'ratingModal', 'klochCalcModal', 'favSelectModal', 'favQuickMenuModal', 'updateProgressModal', 'newsModal', 'feedbackModal', 'voteModal'];
        for (let id of modals) {
            let el = document.getElementById(id);
            if (el && el.classList.contains('show')) return true;
        }
        return false;
    }

    let isScrolling = false;
    window.addEventListener('scroll', () => {
        if (!isScrolling) {
            window.requestAnimationFrame(() => {
                if (window.scrollY > 200) scrollTopBtn.classList.add('show');
                else scrollTopBtn.classList.remove('show');
                isScrolling = false;
            });
            isScrolling = true;
        }
    });

    scrollTopBtn.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });

    const normalize = (str) => window.SearchUtil ? window.SearchUtil.norm(str) : (str ? String(str).toLowerCase().trim().replace(/[‘’'"`]/g, "") : "");

    window.escapeHTML = function(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '\u0026amp;')
            .replace(/</g, '\u0026lt;')
            .replace(/>/g, '\u0026gt;')
            .replace(/"/g, '\u0026quot;')
            .replace(/'/g, '\u0026#39;');
    }

    window.escapeForJS = function(str) {
        if (!str) return '';
        return String(str).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\u0026quot;').replace(/\n/g, '\\n').replace(/\r/g, '');
    }

    function normalizeServiceName(s) {
        if (!s) return "";
        return String(s).replace(/^\[.*?\]\s*/, '').replace(/[«»"'”`\u00A0\s]/g, '').trim().toLowerCase();
    }

    window.findInDb = function(dict, key) {
        if (!key || !dict) return "";
        if (dict[key]) return dict[key];
        let clean = normalizeServiceName(key);
        for (let k in dict) { if (normalizeServiceName(k) === clean) return dict[k]; }
        return "";
    }

    window.findPriceForServiceText = function(name, p) {
        let cleanName = normalizeServiceName(name);
        let matchingTariffs = db.tariffs.filter(x => {
            let n1 = normalizeServiceName(x.service);
            let n2 = x.serviceRu ? normalizeServiceName(x.serviceRu) : "";
            return n1.includes(cleanName) || cleanName.includes(n1) || (n2 && (n2.includes(cleanName) || cleanName.includes(n2)));
        });
        if (matchingTariffs.length === 0) return null;

        let t = matchingTariffs.find(x => p >= x.minPrice && p <= x.maxPrice);
        if (!t) {
            t = matchingTariffs.find(x => p >= x.minPrice && p <= x.maxPrice || (p === 0 && x.minPrice === 0));
            if (!t) t = matchingTariffs[0];
        }

        if (t && t.cost) {
            let rawCost = t.cost.toString().trim();
            if (rawCost.includes('%')) {
                if (p > 0) {
                    let numCost = Math.round(p * parseFloat(rawCost.replace(',', '.'))/100);
                    return numCost.toLocaleString('uk-UA') + " ₴";
                }
                return rawCost;
            } else {
                let cleanCost = rawCost.replace(/\s+/g, '').replace(/[^\d.,]/g, '').replace(',', '.');
                if (cleanCost === '') return rawCost;
                let numCost = parseFloat(cleanCost);
                return isNaN(numCost) ? rawCost : numCost.toLocaleString('uk-UA') + " ₴";
            }
        }
        return null;
    };

    function debounce(func, wait) {
        let timeout;
        return function(...args) { clearTimeout(timeout); timeout = setTimeout(() => func.apply(this, args), wait); };
    }

    window.copyCode = function(e, el, code) {
        if (e) e.stopPropagation();
        const fallbackCopy = () => {
            let t = document.createElement("textarea"); t.value = code;
            t.style.position = "fixed"; t.style.opacity = "0"; document.body.appendChild(t);
            t.focus(); t.select();
            try { document.execCommand('copy'); window.showCopied(el); } catch (err) {}
            t.remove();
        };
        if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(code).then(() => window.showCopied(el)).catch(() => fallbackCopy());
        else fallbackCopy();
    }

    window.showCopied = function(el) {
        const og = el.innerHTML;
        el.innerHTML = "Скопійовано ✓"; el.style.color = "var(--primary)";
        setTimeout(() => { el.innerHTML = og; el.style.color = ""; }, 1500);
    }

    function setAppStatus(state, text) {
        const dot = document.getElementById('statusDot');
        const txt = document.getElementById('statusText');
        if(!dot || !txt) return;

        dot.className = 'dot';

        if (state === 'ok') {
            dot.classList.add('green', 'pulse');
        } else if (state === 'error') {
            dot.classList.add('red');
        } else if (state === 'loading') {
            dot.classList.add('yellow', 'pulse');
        } else {
            dot.classList.add('yellow');
        }
        txt.innerText = text;
    }

    function getSkillHubActionStr(btn, fromModal = false) {
        let linkStr = String(btn.link).trim();
        let nm = String(btn.name).toLowerCase();
        let prefix = fromModal ? "window.closeModalBase('favQuickMenuModal'); " : "";

        // Академія тепер частина цього застосунку: кнопка з таблиці з посиланням "Academy" (або старим Education.html) відкриває розділ
        if (/^academy$/i.test(linkStr) || /education\.html/i.test(linkStr)) return `onclick="${prefix}window.Academy.open()"`;
        if (linkStr === "Calculator_kloch") return `onclick="${prefix}window.openKlochCalc()"`;
        if (linkStr === "--") return `onclick="${prefix}window.openSellerModal()"`;
        if (linkStr === "%") return `onclick="${prefix}window.openRatingModal()"`;
        if (linkStr === "@@") return `onclick="${prefix}window.openModalBase('certManualModal')"`;
        if (linkStr !== "" && linkStr !== "#") return `onclick="${prefix}window.open('${linkStr}', '_blank')"`;

        if ((linkStr === "" || linkStr === "#") && (nm.includes("academy") || nm.includes("академ"))) return `onclick="${prefix}window.Academy.open()"`;
        if (nm.includes("замін") || nm.includes("замен") || nm.includes("продавц")) return `onclick="${prefix}window.openSellerModal()"`;
        if (nm.includes("об'єдн") || nm.includes("объед") || nm.includes("сертиф")) return `onclick="${prefix}window.openModalBase('certManualModal')"`;
        if (nm.includes("рейтинг")) return `onclick="${prefix}window.openRatingModal()"`;
        if (nm.includes("калькулятор") || nm.includes("клочківськ")) return `onclick="${prefix}window.openKlochCalc()"`;

        return "";
    }

    window.getFavorites = function() {
        try { return JSON.parse(localStorage.getItem('skillhub_favs') || '[]'); }
        catch(e) { return []; }
    };

    window.openFavoritesSelectionModal = function() {
        if (!db.skillHubButtons) return;
        let favs = window.getFavorites();
        let html = db.skillHubButtons.filter(btn => !window.isDenied(btn.name)).map((btn, idx) => {
            let isChecked = favs.includes(btn.name) ? 'checked' : '';
            return `
            <div class="list-item" style="cursor:pointer; border-bottom:1px solid var(--border); padding: 12px 16px;" onclick="this.querySelector('.fav-checkbox').classList.toggle('checked')">
                <div style="font-size: 28px; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; flex-shrink: 0; margin-right: 12px;">
                    ${window.renderIcon(btn.emoji)}
                </div>
                <div class="list-item-content" style="flex:1; text-align:left;">
                    <span class="list-item-title" style="font-size: 15px;">${btn.name}</span>
                    <span class="list-item-subtitle" style="font-size: 12px;">${btn.desc}</span>
                </div>
                <div class="fav-checkbox ${isChecked}" data-name="${window.escapeForJS(btn.name)}" style="margin-left: auto; flex-shrink:0;"></div>
            </div>`;
        }).join('');

        safeUpdateHTML('favSelectBody', html);
        window.openModalBase('favSelectModal');
    };

    window.saveFavorites = function() {
        let selected = [];
        document.querySelectorAll('#favSelectBody .fav-checkbox.checked').forEach(el => {
            selected.push(el.getAttribute('data-name'));
        });
        localStorage.setItem('skillhub_favs', JSON.stringify(selected));
        window.closeModalBase('favSelectModal');
    };

    window.openFavoritesQuickMenu = function() {
        if (!db.skillHubButtons) return;
        let favs = window.getFavorites();

        if (favs.length === 0) {
            safeUpdateHTML('favQuickMenuBody', `<div style="padding: 30px 20px; text-align: center; color: var(--text-muted); font-size: 14px; font-weight: 600;">Ви ще не додали жодної функції в обране.<br><br>Зробити це можна у вкладці "SkillHUB" 💡</div>`);
            window.openModalBase('favQuickMenuModal');
            return;
        }

        let html = db.skillHubButtons
            .filter(btn => favs.includes(btn.name) && !window.isDenied(btn.name))
            .map(btn => {
                let actionStr = getSkillHubActionStr(btn, true);
                return `
                <button class="list-item" ${actionStr} style="width:100%; border:none; border-bottom:1px solid var(--border); font-family:inherit; outline:none; display:flex; align-items:center; background: transparent;">
                    <div style="font-size: 28px; display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; flex-shrink: 0; margin-right: 12px;">
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

        safeUpdateHTML('favQuickMenuBody', html);
        window.openModalBase('favQuickMenuModal');
    };

    window.renderSkillHubTab = function() {
        const container = document.getElementById('dynamicSkillHubButtons');
        if (!container || !db.skillHubButtons) return;

        let html = db.skillHubButtons.filter(btn => !window.isDenied(btn.name)).map(btn => {
            let actionStr = getSkillHubActionStr(btn, false);

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

        safeUpdateHTML(container, html);
    };

    window.factoryReset = function() {
        if(confirm("Ви впевнені, що хочете повністю скинути всі налаштування, кеш додатку та збережені дані? Це поверне додаток до початкового стану.")) {
            let wasInstalled = null;
            try { wasInstalled = localStorage.getItem('skillhub_installed'); } catch (e) {}
            try { localStorage.clear(); } catch (e) {}
            try { sessionStorage.clear(); } catch (e) {}
            // скидання не повинно знову показувати інструкцію зі встановлення
            try { if (wasInstalled) localStorage.setItem('skillhub_installed', wasInstalled); sessionStorage.setItem('skillhub_skip_start', '1'); } catch (e) {}
            try { indexedDB.deleteDatabase(IDB_NAME); } catch (e) {}
            setTimeout(() => window.location.reload(), 150);
        }
    };

    window.openKlochCalc = function() {
        if (db.klochCalcData && db.klochCalcData.relevance) {
            document.getElementById('klochRelevance').innerText = db.klochCalcData.relevance;
        } else {
            document.getElementById('klochRelevance').innerText = "не вказано";
        }
        window.clearKlochForm();
        window.renderKlochList();
        window.openModalBase('klochCalcModal');
    }

    window.closeKlochCalc = function() {
        window.closeModalBase('klochCalcModal');
    }

    // ==========================================
    // ВЫПРАВЛЕННАЯ ЛОГИКА КАЛЬКУЛЯТОРА
    // ==========================================
    window.calculateKlochBonus = function() {
        let price = parseFloat(document.getElementById('klochPrice').value) || 0;
        let qty = parseInt(document.getElementById('klochQty').value) || 1;

        let result = 0;
        let displayPercent = 0; // Число для отображения, например 6.2
        let calcMultiplier = 0; // Реальный множитель, например 0.062

        if (price > 0 && db.klochCalcData && db.klochCalcData.rules && db.klochCalcData.rules.length > 0) {
            let rules = [...db.klochCalcData.rules];
            rules.sort((a, b) => a.min - b.min);

            let matchedRule = rules.find(r => price >= r.min && price <= r.max);
            let rawPercent = 0;

            if (matchedRule) {
                rawPercent = matchedRule.percent;
            } else if (rules.length > 0 && price > rules[rules.length - 1].max) {
                rawPercent = rules[rules.length - 1].percent;
            }

            // Коригування для правильного зчитування % з Google Таблиць (де 6.20% = 0.062)
            if (typeof rawPercent === 'string' && rawPercent.includes('%')) {
                displayPercent = parseFloat(rawPercent);
                calcMultiplier = displayPercent / 100;
            } else if (rawPercent > 0 && rawPercent < 1) {
                // Если данные приходят как 0.062
                calcMultiplier = rawPercent;
                displayPercent = rawPercent * 100;
            } else {
                // Если данные приходят как 6.2
                displayPercent = parseFloat(rawPercent) || 0;
                calcMultiplier = displayPercent / 100;
            }

            result = (price * calcMultiplier) * qty;
        }

        let resBox = document.getElementById('klochResultBox');
        resBox.style.transform = 'scale(1.02)';
        setTimeout(() => resBox.style.transform = 'scale(1)', 150);

        let formattedDisplayPercent = Number.isInteger(displayPercent) ? displayPercent : displayPercent.toFixed(2);

        document.getElementById('klochResultValue').innerText = result.toFixed(2) + ' ₴';
        document.getElementById('klochResultFormula').innerText = `Формула: (${price} * ${formattedDisplayPercent}%) * ${qty}`;

        return { price, qty, percent: formattedDisplayPercent, result };
    }

    window.addKlochToList = function() {
        let calcData = window.calculateKlochBonus();
        if (calcData.price <= 0) return;

        window.klochList.push({
            id: Date.now(),
            price: calcData.price,
            qty: calcData.qty,
            percent: calcData.percent,
            result: calcData.result
        });

        window.clearKlochForm();
        window.renderKlochList();
    }

    window.clearKlochForm = function() {
        let priceEl = document.getElementById('klochPrice');
        let qtyEl = document.getElementById('klochQty');
        priceEl.value = '';
        qtyEl.value = '1';

        document.getElementById('clearKlochPriceBtn').style.display = 'none';
        document.getElementById('clearKlochQtyBtn').style.display = 'block';

        window.calculateKlochBonus();
    }

    window.clearKlochList = function() {
        window.klochList = [];
        window.renderKlochList();
    }

    window.removeKlochItem = function(id) {
        window.klochList = window.klochList.filter(item => item.id !== id);
        window.renderKlochList();
    }

    window.renderKlochList = function() {
        let container = document.getElementById('klochListContainer');
        let totalSpan = document.getElementById('klochTotalSum');

        if (window.klochList.length === 0) {
            container.innerHTML = '<div style="text-align:center; font-size:12px; color:var(--text-muted); padding: 10px;">Список порожній</div>';
            totalSpan.innerText = '0.00 ₴';
            return;
        }

        let total = 0;
        let html = window.klochList.map((item, index) => {
            total += item.result;
            return `
            <div style="display: flex; justify-content: space-between; align-items: center; background: var(--input-bg); padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border); animation: fade 0.2s ease;">
                <div style="display: flex; flex-direction: column; gap: 2px;">
                    <span style="font-weight: 700; font-size: 13px; color: var(--text-main);">Позиція ${index + 1} <span style="font-weight: 500; color: var(--text-muted);">(${item.price} ₴ × ${item.qty} шт)</span></span>
                    <span style="font-size: 11px; color: var(--primary);">Коеф: ${item.percent}%</span>
                </div>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-weight: 800; font-size: 14px; color: var(--text-main);">${item.result.toFixed(2)} ₴</span>
                    <button style="background: transparent; border: none; color: var(--danger); cursor: pointer; padding: 4px;" onclick="window.removeKlochItem(${item.id})">✖</button>
                </div>
            </div>`;
        }).join('');

        container.innerHTML = html;
        totalSpan.innerText = total.toFixed(2) + ' ₴';
    }

    window.exportKlochList = function() {
        if (window.klochList.length === 0) {
            alert("Список порожній, немає що копіювати.");
            return;
        }

        let text = "🧮 Розрахунок бонусів:\n\n";
        let total = 0;
        window.klochList.forEach((item, index) => {
            text += `${index + 1}. Вартість: ${item.price} ₴ | Кіл-ть: ${item.qty} шт\n`;
            text += `   Бонус: ${item.result.toFixed(2)} ₴\n`;
            total += item.result;
        });
        text += `\n💰 Загальна сума: ${total.toFixed(2)} ₴`;

        let btn = document.getElementById('exportKlochBtn');
        let originalHtml = btn.innerHTML;

        const successAnim = () => {
            btn.innerHTML = '✅';
            setTimeout(() => { btn.innerHTML = originalHtml; }, 2000);
        };

        const fallbackCopy = () => {
            let t = document.createElement("textarea"); t.value = text;
            t.style.position = "fixed"; t.style.opacity = "0"; document.body.appendChild(t);
            t.focus(); t.select();
            try { document.execCommand('copy'); successAnim(); } catch (err) {}
            t.remove();
        };

        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(() => successAnim()).catch(() => fallbackCopy());
        } else fallbackCopy();
    }

    window.renderRatingModalContent = function() {
        const container = document.getElementById('ratingModalBody');
        if (!container) return;

        if (!db.sellerRatings || db.sellerRatings.length === 0) {
            safeUpdateHTML(container, '<div style="text-align:center; padding:20px; color:var(--text-muted); font-weight:600;">Дані оновлюються...</div>');
            return;
        }

        let groups = {};
        db.sellerRatings.forEach(r => {
            let nom = r.nomination || "Загальний рейтинг";
            let cleanNom = nom.replace(/\s*#\d+\s*$/, '').trim();
            if (!groups[cleanNom]) groups[cleanNom] = [];
            groups[cleanNom].push(r);
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
                        <div class="rating-header-row">
                            <span class="rating-name">${item.name}</span>
                            <span class="rating-score">${item.result}</span>
                        </div>
                        <div class="rating-desc">${item.nomination}</div>
                    </div>
                </div>`;
            });
            html += `</div>`;
        }
        safeUpdateHTML(container, html);
    };

    window.updateProgressUI = function(v1, v2, v3, v4) {
        const formatStep = (elId, val, text) => {
            const el = document.getElementById(elId);
            if(val >= 100) {
                el.innerHTML = `✅ ${text} <span style="color:var(--primary); font-weight:bold; margin-left:auto;">Ок</span>`;
            } else {
                el.innerHTML = `⏳ ${text} <span style="margin-left:auto; font-weight:600;">${Math.floor(val)}%</span>`;
            }
        };
        formatStep('step1', v1, 'Оновлення кешу додатка');
        formatStep('step2', v2, 'Оновлення резервів');
        formatStep('step3', v3, 'Оновлення Академії');
        formatStep('step4', v4, 'Перевірка цілісності даних');
    };

    // IndexedDB-обгортки (openIDB / idbGet / idbSet / idbDelete) - у js/core/storage.js

    function isUsableDb(obj) {
        return !!obj && typeof obj === 'object' && !obj.error &&
            ((Array.isArray(obj.categories) && obj.categories.length > 0) ||
             (Array.isArray(obj.tariffs) && obj.tariffs.length > 0) ||
             (Array.isArray(obj.skillHubButtons) && obj.skillHubButtons.length > 0));
    }

    // Зберігаємо у ВСІ доступні сховища; успіх, якщо хоча б в одне
    async function saveCache(dataStr) {
        let ok = false;
        try { await idbSet(CACHE_KEY, dataStr); ok = true; } catch (e) { console.warn('IDB save failed', e); }
        try { localStorage.setItem(CACHE_KEY, dataStr); ok = true; } catch (e) { /* квота - ігноруємо, є IDB */ }
        if (ok) {
            try { localStorage.setItem('skillhub_has_cache', '1'); } catch (e) {}
            purgeOldCatalogCache();
        }
        return ok;
    }

    // Старий кеш (v6) зберігав у собі всіх співробітників із паролями - після переходу прибираємо
    async function purgeOldCatalogCache() {
        try { localStorage.removeItem(OLD_CACHE_KEY); } catch (e) {}
        try {
            const idb = await openIDB();
            await new Promise(res => { const tx = idb.transaction(IDB_STORE, 'readwrite'); tx.objectStore(IDB_STORE).delete(OLD_CACHE_KEY); tx.oncomplete = tx.onerror = tx.onabort = () => res(); });
        } catch (e) {}
    }

    // Читаємо: спочатку IDB, потім localStorage. Повертаємо ТІЛЬКИ валідний кеш.
    async function loadCache() {
        let candidates = [];
        try { const v = await idbGet(CACHE_KEY); if (v) candidates.push(v); } catch (e) {}
        try { const v = localStorage.getItem(CACHE_KEY); if (v) candidates.push(v); } catch (e) {}
        for (const str of candidates) {
            try {
                const parsed = JSON.parse(str);
                if (isUsableDb(parsed)) return parsed;
            } catch (e) {}
        }
        // Перший запуск після оновлення: беремо загальні дані зі старого кешу (без співробітників), щоб не було порожнього екрану
        try {
            let old = null;
            try { const v = await idbGet(OLD_CACHE_KEY); if (v) old = v; } catch (e) {}
            if (!old) old = localStorage.getItem(OLD_CACHE_KEY);
            if (old) {
                const parsed = JSON.parse(old);
                delete parsed.educationData; delete parsed.achievementData;
                if (isUsableDb(parsed)) return parsed;
            }
        } catch (e) {}
        return null;
    }

    // Просимо браузер не чистити сховище автоматично
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}

    // ====================== ІНІЦІАЛІЗАЦІЯ ======================
    let _refreshing = false;

    function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
    function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

    // Лоадер завжди доходить до 100% і лише потім ховається; при зміні вкладки ховається одразу
    let _hudBusy = false, _hudHideT = null;
    function hideLoaderSmooth() {
        const l = document.getElementById('appLoader');
        if (!l || l.style.display === 'none') return;
        hudSet(100);
        clearTimeout(_hudHideT);
        _hudHideT = setTimeout(forceHideLoader, 420);
    }
    function forceHideLoader() {
        clearTimeout(_hudHideT);
        const l = document.getElementById('appLoader');
        if (!l) return;
        l.classList.add('hidden'); l.style.display = 'none'; l.style.opacity = '0'; l.style.pointerEvents = 'none';
    }
    window.addEventListener('pageshow', () => { if (!_hudBusy && isUsableDb(db)) forceHideLoader(); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden && !_hudBusy && isUsableDb(db)) forceHideLoader(); });

    // HUD-завантаження: title — напис зверху, text — підпис, pct — 0..100
    function hudSet(pct, text, title) {
        const bar = document.getElementById('progressBar'), pc = document.getElementById('hudPct');
        if (bar) bar.style.width = Math.max(0, Math.min(100, pct)) + '%';
        if (pc) pc.innerText = Math.floor(Math.max(0, Math.min(100, pct))) + '%';
        if (text != null) safeUpdateHTML('mainLoaderText', text);
        if (title != null) { const t = document.getElementById('hudTitle'); if (t) t.innerText = title; }
    }
    window.hudSet = hudSet;
    function showBlockingLoader() {
        document.documentElement.classList.remove('fast-boot');
        const l = document.getElementById('appLoader');
        l.classList.remove('hidden');
        l.style.display = 'flex';
        l.style.opacity = '1';
        l.style.pointerEvents = 'auto';
    }

    function renderAllFromDb() {
        window.buildServiceSearchList();
        enableUI();
        window.populateFilters();
        window.renderSkillHubTab();
        window.renderNewsBadge();
        window.renderNewsTop();
        window.renderVoteRow();
        window.renderServerRev();
        window.applyAccess();
        setTimeout(() => window.loadExtras(true), 400);
        window.maybeShowNewsPopup();
        if (currentCategoryData || currentServiceData) renderServices();
        if (document.getElementById('tab-reserves').classList.contains('active')) window.renderRezervyList();
    }

    // Завантаження свіжих даних. Кидає помилку при невдачі; старий кеш при цьому НЕ чіпається.
    async function fetchFresh() {
        if (navigator.onLine === false) throw new Error('Немає підключення до інтернету');

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);
        let response;
        try {
            response = await fetch(API_URL + '?action=catalog', { signal: controller.signal });
        } catch (e) {
            if (e && e.name === 'AbortError') throw new Error('Час очікування вичерпано');
            throw e;
        } finally { clearTimeout(timeoutId); }

        if (!response.ok) throw new Error('Сервер повернув помилку ' + response.status);
        const dataStr = await response.text();

        if (dataStr.trim().startsWith('<')) throw new Error("Помилка доступу до бази. Перевірте Google Apps Script.");
        const newDb = JSON.parse(dataStr);
        if (newDb.error) throw new Error(newDb.error);
        if (!isUsableDb(newDb)) throw new Error("Сервер повернув порожні дані");

        // Кеш перезаписується ТІЛЬКИ після успішного отримання валідних даних
        await saveCache(dataStr);
        lsSet('skillhub_last_daily_update', new Date().toDateString());

        const savedVersion = lsGet(SEEN_VERSION_KEY);
        db = sanitizeDb(newDb);
        renderAllFromDb();
        setAppStatus('ok', 'Готовий до роботи');

        if (db.appVersion && savedVersion !== db.appVersion) {
            if (savedVersion !== null) window.showChangelogModal(db.appVersion, db.changelog);
            lsSet(SEEN_VERSION_KEY, db.appVersion);
        }
    }

    async function init() {
        const cached = await loadCache();

        if (cached) {
            db = sanitizeDb(cached);
            renderAllFromDb();

            const todayStr = new Date().toDateString();
            const needsDailyUpdate = (lsGet('skillhub_last_daily_update') !== todayStr);
            let sessionActive = null;
            try { sessionActive = sessionStorage.getItem('skillhub_session_active'); } catch (e) {}

            if (navigator.onLine === false) {
                setAppStatus('ok', 'Офлайн (З кешу)');
            } else if (needsDailyUpdate || !sessionActive) {
                try { sessionStorage.setItem('skillhub_session_active', 'true'); } catch (e) {}
                refreshData(false, false);
            } else {
                setAppStatus('ok', 'Готовий до роботи');
            }
        } else {
            // Кешу немає (або він пошкоджений) - показуємо лоадер і вантажимо
            try { localStorage.removeItem('skillhub_has_cache'); } catch (e) {}
            try { sessionStorage.setItem('skillhub_session_active', 'true'); } catch (e) {}
            showBlockingLoader();
            await refreshData(true, false);
        }
    }

    window.init = init;

    // Фонове/початкове оновлення. first = перше завантаження без кешу (блокуючий лоадер)
    async function refreshData(first = false, isManual = false) {
        if (_refreshing) return;
        _refreshing = true;

        const blocking = first && !isUsableDb(db);
        const pBar = document.getElementById('progressBar');
        const pCont = document.getElementById('progressContainer');
        let pInt = null;

        try {
            if (blocking) {
                setAppStatus('loading', 'Підготовка');
                safeUpdateHTML('mainLoaderText', 'Підготовка');
                pCont.style.display = 'block';
                hudSet(10, 'Підготовка', 'LOADING');
                let progress = 10;
                pInt = setInterval(() => {
                    if (progress < 90) { progress += Math.random() * 15; hudSet(Math.min(90, progress)); }
                }, 300);
            } else {
                setAppStatus('loading', 'Оновлення');
            }

            await fetchFresh();
            if (blocking) hudSet(100, 'Готово');
        } catch (e) {
            console.error('Refresh Error:', e);
            if (isUsableDb(db)) {
                enableUI();
                setAppStatus('ok', 'Офлайн (З кешу)');
            } else {
                showBlockingLoader();
                pCont.style.display = 'none';
                setAppStatus('error', 'Помилка');
                safeUpdateHTML('mainLoaderText', "Помилка завантаження.<br><span style='color:var(--danger)'>" + window.escapeHTML(e.message) + "</span><br><button onclick='window.init()' class='btn btn-primary' style='margin-top:20px; padding: 10px; font-size:14px; width:fit-content; margin-left:auto; margin-right:auto;'>Спробувати ще раз</button>");
            }
        } finally {
            if (pInt) clearInterval(pInt);
            _refreshing = false;
        }
    }

    // Ручне оновлення: свіжі дані -> повне очищення кешу застосунку -> перевстановлення -> перевірка цілісності -> тестовий перезапуск
    function showHud() { _hudBusy = true; const l = document.getElementById('appLoader'); document.documentElement.classList.remove('fast-boot'); l.classList.remove('hidden'); l.style.display = 'flex'; l.style.opacity = '1'; l.style.pointerEvents = 'auto'; document.getElementById('progressContainer').style.display = 'block'; }
    function hideHud() { _hudBusy = false; const l = document.getElementById('appLoader'); l.style.opacity = '0'; setTimeout(() => { l.style.display = 'none'; l.classList.add('hidden'); }, 250); }
    const sleep = ms => new Promise(r => setTimeout(r, ms));

    document.getElementById('forceUpdateBtn').addEventListener('click', async function() {
        if (_refreshing) return;
        if (navigator.onLine === false) { alert('Немає інтернету. Оновлення потребує підключення — поточні дані й кеш збережено.'); return; }
        _refreshing = true;
        showHud(); hudSet(2, 'Завантаження свіжих даних…', 'UPDATING');
        let tick = null;
        try {
            // 1) спершу свіжі дані: якщо не вдасться — нічого не чіпаємо
            let p = 2; tick = setInterval(() => { if (p < 38) { p += 2; hudSet(p); } }, 120);
            await fetchFresh();
            clearInterval(tick); hudSet(40, 'Очищення кешу…');

            // 2) повне очищення кешу застосунку і перевстановлення Service Worker
            if ('caches' in window) { const keys = await caches.keys(); await Promise.all(keys.map(k => caches.delete(k))); }
            hudSet(55, 'Перевстановлення додатка…');
            if ('serviceWorker' in navigator) {
                const regs = await navigator.serviceWorker.getRegistrations();
                await Promise.all(regs.map(r => r.unregister()));
                const reg = await navigator.serviceWorker.register('sw.js');
                // чекаємо, поки новий SW встановить усі файли і активується (прямо за станом, без .ready)
                await new Promise(res => {
                    const sw = reg.installing || reg.waiting || reg.active;
                    if (!sw || sw.state === 'activated') return res();
                    sw.addEventListener('statechange', () => { if (sw.state === 'activated') res(); if (sw.state === 'redundant') res(); });
                    setTimeout(res, 30000);
                });
            }
            hudSet(75, 'Перевірка цілісності файлів…');
            const vr = await window.verifyAppCache(20000);
            if (vr && vr.left > 0) throw new Error('Не всі файли завантажились (' + vr.left + '). Повторіть оновлення.');

            // 3) тестовий перезапуск
            hudSet(92, 'Тестовий перезапуск…');
            try { sessionStorage.setItem('skillhub_post_update', '1'); sessionStorage.setItem('skillhub_skip_start', '1'); } catch (e) {}
            await sleep(250);
            hudSet(100, 'Готово');
            await sleep(200);
            location.reload();
        } catch (e) {
            if (tick) clearInterval(tick);
            hideHud();
            if (isUsableDb(db)) setAppStatus('ok', 'Не оновлено (з кешу)'); else setAppStatus('error', 'Помилка');
            alert('Помилка оновлення: ' + e.message + (isUsableDb(db) ? '\n\nЗбережені дані залишились доступними.' : ''));
            _refreshing = false;
        }
    });

    // Після тестового перезапуску: швидка самоперевірка і короткий підсумок
    (function postUpdateCheck() {
        let flag = null; try { flag = sessionStorage.getItem('skillhub_post_update'); sessionStorage.removeItem('skillhub_post_update'); } catch (e) {}
        if (!flag) return;
        showHud(); hudSet(100, 'Перевірка після перезапуску…', 'CHECK');
        const t0 = Date.now();
        const iv = setInterval(async () => {
            if (!isUsableDb(db) && Date.now() - t0 < 8000) return;
            clearInterval(iv);
            const vr = await window.verifyAppCache(8000);
            const ok = isUsableDb(db) && (!vr || vr.left === 0);
            hudSet(100, ok ? '✓ Додаток оновлено, усе працює' : '⚠ Оновлено, але дані потребують інтернету', ok ? 'DONE' : 'CHECK');
            setTimeout(hideHud, ok ? 900 : 2200);
        }, 250);
    })();

    // Повернувся інтернет / повернулись у додаток - тихо оновлюємо
    window.addEventListener('online', () => { if (isUsableDb(db)) refreshData(false, false); else init(); });
    window.addEventListener('offline', () => { if (isUsableDb(db)) setAppStatus('ok', 'Офлайн (З кешу)'); });
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState !== 'visible' || !isUsableDb(db) || navigator.onLine === false) return;
        if (lsGet('skillhub_last_daily_update') !== new Date().toDateString()) refreshData(false, false);
    });

    function enableUI() {
        elCatInput.disabled = false;
        if (db.appVersion && !String(db.appVersion).startsWith("Error")) {
            safeUpdateHTML('appVersionDisp', `Версія ${db.appVersion}`);
            document.getElementById('appVersionDisp').style.display = 'inline-block';
        }
        hideLoaderSmooth();

        if (document.getElementById('tab-search').classList.contains('active')) {
            document.getElementById('topFavBtn').style.display = 'flex';
        }
    }

window.saveStore = function() {
        const val = document.getElementById('storeFilter').value;
        try { localStorage.setItem('skillhub_default_store', val); } catch (e) {}
        window.renderRezervyList();
    };

    window.populateFilters = function() {
        const storeSel = document.getElementById('storeFilter');
        if (db.rezervyData) {
            const stores = [...new Set(db.rezervyData.map(r => r.store))].sort();
            let h = '<option value="">-- Оберіть магазин --</option>';
            stores.forEach(s => { if (s && s !== "Не вказано") h += `<option value="${s}">${s}</option>`; });
            const current = storeSel.value;
            safeUpdateHTML(storeSel, h);
            const saved = current || (function(){ try { return localStorage.getItem('skillhub_default_store'); } catch(e){ return null; } })();
            if (saved) storeSel.value = saved;
        }
    }

    window.renderRezervyList = function() {
        const store = document.getElementById('storeFilter').value;
        const cont = document.getElementById('rezervyList');
        const searchInput = document.getElementById('topReservesSearchInput');
        const searchQuery = searchInput ? searchInput.value.trim() : '';
        const dateContainer = document.getElementById('rezervyDateContainer');
        const dateText = document.getElementById('rezervyDateText');

        if (dateContainer && dateText) {
            if (db.rezervyDate) {
                dateText.innerText = db.rezervyDate;
                dateContainer.style.display = 'flex';
            } else {
                dateContainer.style.display = 'none';
            }
        }

        if (!store) { safeUpdateHTML(cont, '<div style="padding:20px; text-align:center; color:var(--text-muted); font-weight:600;">Оберіть магазин вище</div>'); return; }

        let matches = db.rezervyData.filter(r => r.store === store);

        if (searchQuery) {
            matches = window.SearchUtil.filter(matches, searchQuery, r => [r.name, r.cat]);
        }

        if (matches.length === 0) { safeUpdateHTML(cont, `<div style="padding:20px; text-align:center; color:var(--text-muted); font-weight:600;">Немає товарів</div>`); return; }

        matches.sort((a, b) => b.price - a.price);

        let html = matches.map(r => {
            let shortName = r.name.replace(/^(Телевізор|Ноутбук|Смартфон|Мобільний телефон|Планшет|Холодильник|Пральна машина|Мікрохвильова піч|Кавомашина|Пилосос)\s*/i, '');

            let snMatchList = shortName.match(/^\[Уцінка:\s*([^\]]+)\]/i);
            let isDiscount = shortName.toLowerCase().includes('уцінка') || snMatchList !== null;
            let discountIconHtml = isDiscount ? `<img src="assets/icons/ui/discount.svg" alt="%" class="discount-tag-icon">` : '';

            let safeCatOnClick = String(r.cat).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\u0026quot;');
            let safeNameOnClick = String(shortName).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\u0026quot;');

            let searchVal = normalize(r.cat);
            let catExists = false;
            if (searchVal && db.categories && db.categories.length > 0) {
                catExists = db.categories.some(c => {
                    let cUa = normalize(c.ua);
                    if (!cUa) return false;
                    return cUa.includes(searchVal) || searchVal.includes(cUa);
                });
            } else {
                catExists = true;
            }

            let catStyle = catExists ? "" : "color: var(--danger); background: var(--danger-bg); padding: 2px 6px; border-radius: 4px; display: inline-block; width: fit-content; transition: 0.2s ease;";
            let garantiyaHtml = r.garantiya ? `<span class="list-item-subtitle" style="font-size: 11px; color: var(--primary); margin-top: 4px; font-weight: 600;">🛡️ Гарантія: ${window.escapeHTML(r.garantiya)}</span>` : "";
            let discountClass = isDiscount ? "discount-card" : "";

            let sellerHtml = "";
            let isMarketplaceSeller = false;
            if (r.seller) {
                let s = String(r.seller).trim();
                let sLower = s.toLowerCase();
                let sBg = "var(--border)";
                let sColor = "var(--text-muted)";
                if (sLower.includes("rozetka") || sLower.includes("розетка")) {
                    s = "Rozetka";
                    sBg = "var(--clr-seller-rozetka-bg)";
                    sColor = "var(--clr-seller-rozetka-text)";
                } else if (sLower.includes("маркетплейс")) {
                    s = "Маркетплейс";
                    sBg = "var(--clr-seller-market-bg)";
                    sColor = "var(--clr-seller-market-text)";
                    isMarketplaceSeller = true;
                }
                sellerHtml = `<div style="background: ${sBg}; color: ${sColor}; font-size: 10px; font-weight: 800; text-transform: uppercase; padding: 4px 8px; border-radius: 6px; display: inline-block; width: max-content; margin-top: 6px;">${s}</div>`;
            }

            let articleHtml = "";
            if (r.article) {
                let art = String(r.article).trim();
                let artUpper = art.toUpperCase();

                if (isMarketplaceSeller || artUpper.startsWith("PRM") || artUpper.startsWith("RMP") || artUpper.startsWith("RPM")) {
                    if (art.length > 4) {
                        let p2 = art.slice(-4);
                        articleHtml = `<div style="font-size: 12px; color: var(--text-muted); margin-top: 6px; font-family: monospace;">.......<span style="font-weight: 900; font-size: 15px; color: var(--text-main);">${window.escapeHTML(p2)}</span></div>`;
                    } else {
                        articleHtml = `<div style="font-size: 14px; font-weight: 900; color: var(--text-main); margin-top: 6px; font-family: monospace;">${window.escapeHTML(art)}</div>`;
                    }
                } else {
                    articleHtml = `<div style="font-size: 12px; color: var(--text-muted); margin-top: 6px;">Код на сайті Rozetka <span style="font-family: monospace; font-weight: 600; color: var(--text-main);">${window.escapeHTML(art)}</span></div>`;
                }
            }

            let qtyHtml = "";
            if (r.qty) {
                qtyHtml = `<div style="background: var(--input-bg); color: var(--text-main); font-size: 11px; font-weight: 800; padding: 4px 8px; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px; border: 1px solid var(--border); margin-top: 6px;">📦 ${window.escapeHTML(r.qty)} шт</div>`;
            }

            return `
            <div class="list-item ${discountClass}" onclick="window.openRezervItemModal('${safeCatOnClick}',${r.price}, '${safeNameOnClick}',${isDiscount})">
                <div class="list-item-content">
                    <div style="display:flex; align-items:center; gap: 4px;">
                        <span class="list-item-title rezervy-name" style="flex:1;">${window.escapeHTML(shortName)}</span>
                    </div>
                    <span class="list-item-subtitle rezervy-cat" style="${catStyle}; margin-top:4px;">${window.escapeHTML(r.cat)}</span>${garantiyaHtml}
                    <div style="display: flex; flex-wrap: wrap; gap: 6px; align-items: center;">
                        ${qtyHtml}${sellerHtml}
                    </div>
                    ${articleHtml}
                </div>
                <div class="list-item-value rezervy-price" style="display:flex; align-items:center;">
                    ${Math.round(r.price).toLocaleString('uk-UA')} ₴${discountIconHtml}
                </div>
            </div>`;
        }).join('');
        safeUpdateHTML(cont, html);
    }

    const topPanel = document.getElementById('topSearchPanel');
    const openTopBtn = document.getElementById('openTopSearchBtn');
    const closeTopBtn = document.getElementById('closeTopSearchBtn');
    const topInput = document.getElementById('topReservesSearchInput');
    const clearTopBtn = document.getElementById('clearTopSearchBtn');

    openTopBtn.onclick = () => {
        topPanel.classList.add('show');
        setTimeout(() => topInput.focus(), 300);
    };

    closeTopBtn.onclick = () => {
        topPanel.classList.remove('show');
        topInput.value = '';
        clearTopBtn.style.display = 'none';
        window.renderRezervyList();
    };

    topInput.addEventListener('input', () => {
        clearTopBtn.style.display = topInput.value.length > 0 ? 'flex' : 'none';
        window.renderRezervyList();
    });

    clearTopBtn.onclick = () => {
        topInput.value = '';
        clearTopBtn.style.display = 'none';
        topInput.focus();
        window.renderRezervyList();
    };

    document.addEventListener('click', function(event) {
        if (topPanel.classList.contains('show')) {
            if (!topPanel.contains(event.target) && event.target !== openTopBtn && !openTopBtn.contains(event.target)) {
                topPanel.classList.remove('show');
                topInput.value = '';
                clearTopBtn.style.display = 'none';
                window.renderRezervyList();
            }
        }
    });

    window.openRezervItemModal = function(catName, price, itemName, isDiscount = false) {
        let sn = "";
        let cleanItemName = itemName;

        let snMatch = itemName.match(/^\[Уцінка:\s*([^\]]+)\]/i);
        if (snMatch) {
            sn = snMatch[1].trim();
            cleanItemName = itemName.replace(snMatch[0], '').trim();
        }

        let searchVal = normalize(catName); let foundItem = null;
        if (db.categories && db.categories.length > 0) foundItem = db.categories.find(c => normalize(c.ua).includes(searchVal) || searchVal.includes(normalize(c.ua)));

        if (foundItem || isDiscount) {
            let itemData = foundItem || { category: catName, service: "" };
            document.getElementById('rezervItemTitle').innerText = cleanItemName + ` — ${Math.round(price).toLocaleString('uk-UA')} ₴`;
            window.openModalBase('rezervItemModal');
            renderRezervItemServices(itemData, price, isDiscount, sn);
        } else {
            alert(`Категорію "${catName}" не знайдено.`);
        }
    }

    window.closeRezervItemModal = function() { window.closeModalBase('rezervItemModal'); }

    let currentPhotos = [];
    let currentPhotoIndex = 0;

    function getDirectImageUrl(url) {
        if (!url) return "";
        let driveMatch = String(url).match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (driveMatch && driveMatch[1]) return `https://drive.google.com/thumbnail?id=${driveMatch[1]}&sz=w1200`;
        return url;
    }

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

        currentPhotoIndex = 0;
        updateGalleryImage();
        window.openModalBase('galleryModal');
    };

    window.closeGallery = function() { window.closeModalBase('galleryModal'); };

    window.changePhoto = function(dir) {
        currentPhotoIndex += dir;
        if (currentPhotoIndex < 0) currentPhotoIndex = currentPhotos.length - 1;
        if (currentPhotoIndex >= currentPhotos.length) currentPhotoIndex = 0;
        updateGalleryImage();
    };

    function updateGalleryImage() {
        document.getElementById('galleryImage').src = getDirectImageUrl(currentPhotos[currentPhotoIndex].trim());
        document.getElementById('galleryCounter').innerText = `${currentPhotoIndex + 1} /${currentPhotos.length}`;
        document.querySelector('.gallery-nav.prev').style.display = currentPhotos.length > 1 ? 'block' : 'none';
        document.querySelector('.gallery-nav.next').style.display = currentPhotos.length > 1 ? 'block' : 'none';
    }

    window.selectDiscountReason = function(reason) {
        let descBox = document.getElementById('discountReasonDesc');

        if (!reason) {
            descBox.style.display = 'none';
            window.updateRezervServicesFiltered("");
            return;
        }

        let descRaw = window.findInDb(db.descriptions, reason);
        if (descRaw) {
            descBox.innerHTML = parseDescriptionLines(descRaw);
            descBox.style.display = 'block';
        } else {
            descBox.style.display = 'none';
        }

        window.updateRezervServicesFiltered(reason);
    };

    window.updateRezervServicesFiltered = function(discountReason) {
        let item = window.currentRezervItem;
        let p = window.currentRezervPrice;
        let listEl = document.getElementById('rezervServiceList');
        let btn = document.getElementById('rezervCompareBtn');

        if (!item || !item.service) {
            safeUpdateHTML(listEl, '<div style="color:var(--text-muted);">Немає сервісів</div>');
            if(btn) btn.style.display = 'none';
            return;
        }

        if (window.currentRezervIsDiscount && !discountReason) {
            let warnHtml = `
            <div style="display: flex; align-items: flex-start; gap: 12px; background: var(--clr-support-bg); border: 1px solid rgba(253, 224, 71, 0.4); border-radius: 12px; padding: 16px; margin-top: 8px;">
                <span style="font-size: 22px; line-height: 1;">💡</span>
                <span style="font-size: 13px; font-weight: 600; color: var(--clr-support-text); line-height: 1.4;">
                    Будь ласка, оберіть причину уцінки вище, щоб побачити доступні сервіси для цього пристрою.
                </span>
            </div>`;
            safeUpdateHTML(listEl, warnHtml);
            if(btn) btn.style.display = 'none';
            return;
        }

        let baseServicesArray = calculateServicesArray(item, p);

        if (discountReason && db.categories) {
            let discountCat = db.categories.find(c => String(c.ua).trim().toLowerCase() === String(discountReason).trim().toLowerCase());
            if (discountCat && discountCat.service) {
                let allowedDiscountServices = discountCat.service.split('|').map(s => normalizeServiceName(s));

                if (allowedDiscountServices.length > 0) {
                    baseServicesArray = baseServicesArray.filter(s => {
                        let sClean = normalizeServiceName(s.name);
                        return allowedDiscountServices.some(ds => sClean.includes(ds) || ds.includes(sClean));
                    });
                } else {
                    baseServicesArray = [];
                }
            } else {
                baseServicesArray = [];
            }
        }

        baseServicesArray.forEach(s => {
            s.descToggleHTML = generateDescToggleHTML(window.findInDb(db.descriptions, s.name), s.code);
        });

        if (btn) {
            if (baseServicesArray.filter(s => !s.isPackage).length >= 2) btn.style.display = 'block';
            else {
                btn.style.display = 'none';
                if (isModalCompareMode) window.toggleModalCompareMode();
            }
        }

        window.lastModalServices = baseServicesArray;
        safeUpdateHTML(listEl, baseServicesArray.map(s => generateServiceCardHTML(s, true, false)).join(''));
    };

    function renderRezervItemServices(item, p, isDiscount = false, sn = "") {
        try {
            window.currentRezervItem = item;
            window.currentDevicePrice = p;
            window.currentRezervPrice = p;
            window.currentRezervIsDiscount = isDiscount;

            let snHtml = "";
            if (sn) {
                snHtml = `
                <div style="display:flex; justify-content:space-between; align-items:center; background:var(--input-bg); padding:12px 16px; border-radius:12px; margin-bottom:16px; border:1px solid var(--border);">
                    <div style="font-size:12px; color:var(--text-muted); font-weight:600; text-transform:uppercase;">Серійний номер:</div>
                    <div style="font-size:15px; font-weight:800; color:var(--primary); cursor:pointer; display:flex; align-items:center; gap:6px;" onclick="window.copyCode(event, this, '${window.escapeForJS(sn)}')">${sn} 📋</div>
                </div>`;
            }

            let techStr = buildTechInfoHTML(item, p);

            let discountHtml = "";
            if (isDiscount) {
                let discountKeys = db.categories.map(c => c.ua).filter(ua => ua && ua.toLowerCase().startsWith('уцінка')).sort();
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
                    <div id="discountReasonDesc" style="display: none; background: var(--card-bg); border-radius: 12px; border: 1px solid var(--primary-light); padding: 14px 18px; margin-bottom: 12px; overflow: hidden;"></div>
                </div>`;
            }

            safeUpdateHTML('rezervTechInfo', snHtml + techStr + discountHtml);
            document.getElementById('rezervTechInfo').style.display = (snHtml || techStr || discountHtml) ? 'block' : 'none';

            let titleEl = document.getElementById('rezervRecommendTitle');
            if (titleEl) titleEl.innerText = isDiscount ? "Сервіси для уцінки" : "Рекомендовані сервіси";

            window.updateRezervServicesFiltered("");

        } catch(e) { console.error(e); }
    }

    window.updateRezervResults = function() {
        let listEl = document.getElementById('rezervServiceList');
        if (!listEl) return;
        safeUpdateHTML(listEl, window.lastModalServices.map(s => generateServiceCardHTML(s, true, false)).join(''));
    }

    elCatInput.addEventListener('input', debounce(() => {
        try {
            const val = normalize(elCatInput.value);
            elClearBtn.style.display = val.length > 0 ? 'block' : 'none';
            if (val.length === 0) {
                elSuggList.style.display = "none"; elPriceWrapper.style.display = "none"; elResultBox.style.display = "none";
                currentCategoryData = null; currentServiceData = null;
                if(isCompareMode) window.toggleCompareMode(); document.getElementById('toggleCompareBtn').style.display = 'none';
                return;
            }
            if (val.length < 2) { elSuggList.style.display = 'none'; return; }

            const rawVal = elCatInput.value;
            let catMatches = window.SearchUtil.filter(db.categories, rawVal, c => [c.ua, c.ru, c.en].filter(Boolean))
                .map(c => ({...c, searchType: 'category', icon: '📦'}));

            let servMatches = window.SearchUtil.filter(window.allServicesSearchList, rawVal, s => s.searchStr);

            let menuMatches = window.SearchUtil.filter((db.skillHubButtons || []).filter(b => b && b.name && !window.isDenied(b.name)), rawVal, b => [b.name, b.desc].filter(Boolean))
                .slice(0, 4).map(b => ({ searchType: 'menu', btn: b, name: b.name, desc: b.desc, icon: b.emoji || '🧭' }));

            let matches = [...catMatches, ...menuMatches, ...servMatches].slice(0, 15);

            requestAnimationFrame(() => {
                if (matches.length > 0) {
                    elSuggList.style.display = 'block';
                    let html = matches.map((m, idx) => {
                        let text = m.searchType === 'category' ? m.ua : m.name;
                        if (m.searchType === 'menu') text = `${m.name}${m.desc ? `<span style="display:block; font-size:11px; font-weight:500; color:var(--text-muted);">${m.desc}</span>` : ''}`;
                        let brandBadge = '';
                        if (m.searchType === 'service' && m.brandText) {
                            brandBadge = `<div class="sc-brand ${m.cls}" style="margin: 0; font-size: 9px; padding: 2px 6px; flex-shrink: 0;">${m.brandText}</div>`;
                        }
                        return `<div class="sugg-item" data-idx="${idx}">
                            <span style="flex-shrink:0; width: 24px; height: 24px; display:flex; align-items:center; justify-content:center;">${window.renderIcon(m.icon)}</span>${brandBadge}
                            <span style="flex:1; line-height:1.3; margin-left: 6px;">${text}</span>
                        </div>`;
                    }).join('');
                    safeUpdateHTML(elSuggList, html);

                    Array.from(elSuggList.children).forEach((el) => {
                        el.onmousedown = () => selectItem(matches[el.getAttribute('data-idx')]);
                    });
                } else elSuggList.style.display = 'none';
            });
        } catch(e) { console.error(e); }
    }, 100));

    elClearBtn.onclick = () => {
        elCatInput.value = ""; elPriceInput.value = "";
        elClearBtn.style.display = "none"; elSuggList.style.display = "none";
        elPriceWrapper.style.display = "none"; elResultBox.style.display = "none";
        currentCategoryData = null; currentServiceData = null;
        elCatInput.focus();
        if(isCompareMode) window.toggleCompareMode(); document.getElementById('toggleCompareBtn').style.display = 'none';
    };

    elOkBtn.onclick = () => elPriceInput.blur();

    function selectItem(item) {
        if (item.searchType === 'menu') {
            elCatInput.value = ""; elClearBtn.style.display = "none"; elSuggList.style.display = "none";
            elCatInput.blur();
            const act = getSkillHubActionStr(item.btn, false);
            if (act) { const tmp = document.createElement('button'); tmp.setAttribute('onclick', act.replace(/^onclick="|"$/g, '').replace(/&quot;/g, '"')); document.body.appendChild(tmp); tmp.click(); tmp.remove(); }
            else window.switchTab('tab-skillhub');
            return;
        }
        if(item.searchType === 'service') {
            currentCategoryData = null;
            currentServiceData = { name: item.name, origName: item.origName, icon: item.icon };

            elCatInput.value = item.name;
            safeUpdateHTML('uaTitle', `<div style="display:flex; align-items:center; gap:8px;">
                <div style="width:24px; height:24px; display:flex; justify-content:center; align-items:center;">${window.renderIcon(item.icon)}</div>
                <span>${item.name}</span>
            </div>`);
            safeUpdateHTML('itemCategory', item.brandText ? "Послуга від " + item.brandText : "Окрема послуга");
        } else {
            currentCategoryData = item;
            currentServiceData = null;
            elCatInput.value = item.ua;
            safeUpdateHTML('uaTitle', `<div style="display:flex; align-items:center; gap:8px;">
                <div style="width:24px; height:24px; display:flex; justify-content:center; align-items:center;">${window.renderIcon(item.icon)}</div>
                <span>${item.ua}</span>
            </div>`);
            safeUpdateHTML('itemCategory', item.category || "");
        }

        elSuggList.style.display = 'none';
        elPriceWrapper.style.display = 'flex';
        elResultBox.style.display = 'block';
        if(isCompareMode) window.toggleCompareMode();
        renderServices();
    }

    function buildTechInfoHTML(item, p) {
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
    }

    function renderTechInfo() {
        if (!currentCategoryData) return;
        const p = parseFloat(elPriceInput.value) || 0;
        let html = buildTechInfoHTML(currentCategoryData, p);
        safeUpdateHTML(elTechInfo, html);
        elTechInfo.style.display = html ? 'block' : 'none';
    }

    function parseDescriptionLines(descE) {
        let safeDesc = descE ? String(descE).trim() : "";
        if (!safeDesc || safeDesc === "Опис відсутній...") return `<div class="desc-line" style="color: var(--text-muted); font-style: italic; justify-content: center;">Опис відсутній...</div>`;
        // Розмітка тексту (заголовки, розділювачі, картки, колонки, жирний, колір...) - js/core/richtext.js, див. docs/FORMATTING.md
        // Старий формат зберігається: | = новий рядок, "+" підзаголовок, "=" мітка, емодзі на початку = іконка
        return RichText.render(safeDesc, { pipeSplit: true, plain: renderDescLine });
    }

    function renderDescLine(line) {
            const l = line.trim(); if (!l) return '';
            if (l.startsWith('+')) return `<div style="font-weight:700; font-size:14px; color:var(--text-main); margin: 12px 0 6px 0;">${RichText.inline(l.substring(1).trim())}</div>`;
            if (l.startsWith('=')) return `<div style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--text-muted); margin: 12px 0 6px 0;">${RichText.inline(l.substring(1).trim())}</div>`;

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
                    <div style="font-size: 13px; line-height: 1.4; color: var(--text-main); font-weight: 500; word-break: break-word;">${RichText.inline(t)}</div>
                </div>
                ${priceBadge}
            </div>`;
    }

    function generateDescToggleHTML(descE, codeF) {
        let descText = parseDescriptionLines(descE);
        let codeHtml = codeF ? `
            <div class="desc-code" onclick="window.copyCode(event, this, '${window.escapeForJS(codeF)}')">
                <span style="color:var(--text-muted); font-weight:500;">Код:</span>
                <span style="font-size:15px; font-weight:700; color:var(--primary);">${codeF} 📋</span>
            </div>` : '';

        if (!descText && !codeHtml) return '';

        return `
            <div style="margin-top: 4px;">
                <div class="desc-toggle-wrapper" onclick="
                    const c = this.nextElementSibling;
                    const a = this.querySelector('svg');
                    c.classList.toggle('show');
                    if(c.classList.contains('show')){
                        a.style.transform='rotate(180deg)';
                    } else {
                        a.style.transform='rotate(0deg)';
                    }
                    const badge = this.closest('.service-card').querySelector('.sc-discount-badge');
                    if(badge) badge.style.display = c.classList.contains('show') ? 'block' : 'none';
                ">
                    <span>Детальніше</span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </div>
                <div class="desc-content">
                    ${codeHtml}
                    ${descText}
                </div>
            </div>
        `;
    }

    function calculateServicesArray(item, p) {
        if(!item) return [];
        const focusList = item.focusServices ? String(item.focusServices).split('|').map(s => normalizeServiceName(s)) : [];
        const servicesNames = item.service ? String(item.service).split('|').map(s => s.trim()).filter(s => s) : [];

        const dataForSort = servicesNames.map(name => {
            let exactBrand = db.serviceBrands ? window.findInDb(db.serviceBrands, name) : "";
            const brandMatch = name.match(brandRegex); const brand = exactBrand || (brandMatch ? brandMatch[1] : "");
            let title = name.replace(/^\[(.*?)\]\s*/, "").trim(); let nameClean = normalizeServiceName(name); let isFocus = false;

            if(title.includes('🔥')) { isFocus = true; title = title.replace('🔥', '').trim(); } else if (focusList.includes(nameClean)) isFocus = true;

            const matchingTariffs = db.tariffs.filter(x => { return normalizeServiceName(x.service) === nameClean || (x.serviceRu && normalizeServiceName(x.serviceRu) === nameClean); });
            let t = null; let isPackage = false;

            if (p > 0) t = matchingTariffs.find(x => p >= x.minPrice && p <= x.maxPrice);
            if (!t && matchingTariffs.length > 0) { t = matchingTariffs.find(x => p >= x.minPrice && p <= x.maxPrice || (p === 0 && x.minPrice === 0)); if (!t) t = matchingTariffs[0]; }

            let uName = String(name).toUpperCase();
            let isStaticEpz = (uName.includes('WINDOWS') || uName.includes('OFFICE') || uName.includes('ESD') || uName.includes('[ESD]')) && !uName.includes('НАЛАШТУВАННЯ') && !uName.includes('ВСТАНОВЛЕННЯ') && !uName.includes('АНТИВІРУС');

            if (!isStaticEpz) {
                if (uName.includes('МОНТАЖ') || uName.includes('ПІДКЛЮЧЕННЯ') || (uName.includes('ВСТАНОВЛЕННЯ') && !uName.includes('WINDOWS') && !uName.includes('ЗАХИСН'))) isPackage = true;
                if (uName.includes('SWEET') || uName.includes('КІНОТЕАТР') || uName.includes('PARALLELS')) isPackage = true;
                if (uName.includes('АНТИВІРУС') || uName.includes('ESET')) isPackage = true;
                if (uName.includes('ПІКСЕЛ') || uName.includes('ПЕРЕВІРКА')) isPackage = true;
                if (uName.includes('ПОКЛЕЙКА')) isPackage = true;
                if (uName.includes('НАЛАШТУВАННЯ') && !uName.includes('WINDOWS') && !uName.includes('ОФІС') && !uName.includes('OFFICE')) isPackage = true;
                if (uName.includes('ГОДИНА РОБОТИ')) isPackage = true;
                if (!isPackage && db.tariffs.some(x => x.cat && normalizeServiceName(x.cat) === nameClean)) isPackage = true;
            }

            let numCost = 0; let label = "Дізнатись"; let serviceCode = t && t.code ? t.code : window.findInDb(db.serviceCodes, name);

            if (isPackage) { label = "Обрати пакет"; }
            else if (t && t.cost) {
                let rawCost = t.cost.toString().trim();
                if (rawCost.includes('%')) {
                    if (p > 0) { numCost = Math.round(p * parseFloat(rawCost.replace(',', '.'))/100); label = numCost.toLocaleString('uk-UA') + " ₴"; } else label = rawCost;
                } else {
                    let cleanCost = rawCost.replace(/\s+/g, '').replace(/[^\d.,]/g, '').replace(',', '.');
                    if (cleanCost === '') label = rawCost;
                    else { numCost = parseFloat(cleanCost); label = isNaN(numCost) ? rawCost : numCost.toLocaleString('uk-UA') + " ₴"; }
                }
            }

            let cls = 'brand-other'; let uBrand = String(brand).toUpperCase();
            if (uBrand.includes('SUPPORT') || uName.includes('SUPPORT') || uName.includes('НАШ СЕРВІС')) cls = 'brand-support';
            else if (uBrand.includes('ЕКТА') || uBrand.includes('EKTA') || uName.includes('EKTA') || uName.includes('ЕКТА')) cls = 'brand-ekta';
            else if (uBrand.includes('EPZ') || uName.includes('EPZ') || uName.includes('ЕПЗ') || isStaticEpz) cls = 'brand-epz';
            else if (isPackage || uName.includes('НАЛАШТУВАННЯ')) cls = 'brand-settings';
            else if (uName.includes('МОНТАЖ') || uName.includes('ПІДКЛЮЧЕННЯ') || uName.includes('ВСТАНОВЛЕННЯ')) cls = 'brand-install';

            let discountVal = t && t.discount ? t.discount : "";

            return { name, brand, title, numCost, label, cls, isFocus, code: serviceCode, isPackage, descToggleHTML: '', discount: discountVal };
        });

        dataForSort.sort((a, b) => { if (a.isFocus && !b.isFocus) return -1; if (!a.isFocus && b.isFocus) return 1; return b.numCost - a.numCost; });
        return dataForSort;
    }

    function generateServiceCardHTML(s, isModalCtx = false, disableCompare = false) {
        if(!s) return '';
        let isSelected = false; let compareModeActive = false;
        if (!disableCompare) {
            isSelected = isModalCtx ? modalCompareSelection.includes(s.name) : compareSelection.includes(s.name);
            compareModeActive = isModalCtx ? isModalCompareMode : isCompareMode;
        }

        let cardClass = "service-card";
        if (compareModeActive && !s.isPackage) cardClass += ' compare-mode';
        if (isSelected) cardClass += ' selected';

        let safeName = window.escapeForJS(s.name);
        let safeCode = window.escapeForJS(s.code);
        let safeLabel = window.escapeForJS(s.label);
        let safeDiscount = window.escapeForJS(s.discount || "");

        let clickHandler = '';
        if (disableCompare) clickHandler = `onclick="window.handleServiceClick(event, '${safeName}', '${safeCode}', ${s.isPackage}, true, '${safeLabel}', '${safeDiscount}')"`;
        else if (isModalCtx) clickHandler = `onclick="window.handleModalServiceClick(event, '${safeName}', ${s.isPackage}, '${safeCode}', '${safeLabel}', '${safeDiscount}')"`;
        else clickHandler = `onclick="window.handleServiceClick(event, '${safeName}', '${safeCode}', ${s.isPackage}, false, '${safeLabel}', '${safeDiscount}')"`;

        let descHtml = s.descToggleHTML || '';
        let availHtml = s.availabilityHTML ? `<div style="margin-top:8px;">${s.availabilityHTML}</div>` : '';
        let focusHtml = (s.isFocus && !isSelected) ? `<span class="animated-fire">🔥</span>` : '';

        let discountHtml = '';
        if (s.discount && s.discount !== "0%" && s.discount !== "0" && s.discount !== "" && s.discount !== "-") {
            let cleanDisc = window.escapeHTML(s.discount).replace('-', '');
            discountHtml = `<div class="sc-discount-badge">До -${cleanDisc}</div>`;
        }

        let brandHtml = s.brand ? `<div class="sc-brand ${s.cls}" style="margin-bottom:0;">${s.brand}</div>` : '';

        let tagsHtml = '';
        if (brandHtml) {
            tagsHtml = `<div style="display:flex; gap:6px; margin-bottom:8px; flex-wrap:wrap; align-items:center;">${brandHtml}</div>`;
        }

        let checkboxHtml = (compareModeActive && !s.isPackage) ? `<div class="checkbox"></div>` : '';

        return `
        <div class="${cardClass}" ${clickHandler}>
            ${checkboxHtml}
            <div class="sc-header" style="align-items: flex-start;">
                <div style="display:flex; flex-direction:column; align-items:flex-start; flex:1; padding-right:10px;">
                    ${tagsHtml}
                    <div class="sc-title">${focusHtml} <span style="flex:1;">${s.title}</span></div>
                </div>
                <div style="display:flex; flex-direction:column; align-items:flex-end; flex-shrink:0;">
                    <div class="sc-price">${s.label}</div>
                    ${discountHtml}
                </div>
            </div>
            ${availHtml}
            ${descHtml}
        </div>`;
    }

    function renderServices() {
        try {
            const p = parseFloat(elPriceInput.value) || 0;
            window.currentDevicePrice = p;

            if (currentCategoryData && currentCategoryData.service) {
                renderTechInfo();
                let dataForSort = calculateServicesArray(currentCategoryData, p);
                window.lastCalculatedServices = dataForSort;

                let compareableCount = dataForSort.filter(s => !s.isPackage).length;

                const btnCompare = document.getElementById('toggleCompareBtn');
                if (compareableCount >= 2) {
                    btnCompare.style.display = 'block';
                    if (isCompareMode) btnCompare.classList.add('active');
                } else {
                    btnCompare.style.display = 'none';
                    if (isCompareMode) window.toggleCompareMode();
                }

                requestAnimationFrame(() => { safeUpdateHTML(elServiceList, dataForSort.map(s => generateServiceCardHTML(s, false)).join('')); });

            } else if (currentServiceData) {
                elTechInfo.style.display = 'none'; safeUpdateHTML(elTechInfo, '');

                let fakeCat = { service: currentServiceData.origName, focusServices: currentServiceData.name };
                let dataForSort = calculateServicesArray(fakeCat, p);

                dataForSort.forEach(s => {
                    s.descToggleHTML = generateDescToggleHTML(window.findInDb(db.descriptions, s.name), s.code);
                });

                window.lastCalculatedServices = dataForSort;

                document.getElementById('toggleCompareBtn').style.display = 'none';
                if (isCompareMode) window.toggleCompareMode();

                requestAnimationFrame(() => {
                    safeUpdateHTML(elServiceList, dataForSort.map(s => generateServiceCardHTML(s, false, false)).join(''));

                    setTimeout(() => {
                        let toggleWrapper = elServiceList.querySelector('.desc-toggle-wrapper');
                        if (toggleWrapper && !toggleWrapper.nextElementSibling.classList.contains('show')) {
                            toggleWrapper.click();
                        }
                    }, 50);
                });

            } else {
                window.lastCalculatedServices = []; document.getElementById('toggleCompareBtn').style.display = 'none';
                if (isCompareMode) window.toggleCompareMode();
                elTechInfo.style.display = 'none'; safeUpdateHTML(elTechInfo, ''); safeUpdateHTML(elServiceList, ''); return;
            }
        } catch(e) { console.error(e); }
    }

    elPriceInput.addEventListener('input', debounce(renderServices, 50));

    window.toggleCompareMode = function() {
        isCompareMode = !isCompareMode; compareSelection = [];
        const btn = document.getElementById('toggleCompareBtn');
        if (isCompareMode) {
            btn.innerText = 'Скасувати'; btn.classList.add('active');
            compareBar.classList.add('show');
        } else {
            btn.innerText = 'Порівняти'; btn.classList.remove('active');
            compareBar.classList.remove('show');
        }
        updateCompareUI(); renderServices();
    }

    window.toggleModalCompareMode = function() {
        isModalCompareMode = !isModalCompareMode; modalCompareSelection = [];

        const btn = document.querySelector('.modal.show .compare-toggle-btn');
        if (btn) {
            if (isModalCompareMode) btn.innerText = 'Скасувати порівняння';
            else btn.innerText = 'Порівняти';
        }

        if (isModalCompareMode) {
            compareBar.classList.add('show');
            compareBar.style.zIndex = '100035';
        } else {
            compareBar.classList.remove('show');
        }

        updateModalCompareUI();

        if (document.getElementById('montazhCity')) window.updateMontazhResults();
        else if (document.querySelector('#rezervItemModal.show')) window.updateRezervResults();
        else window.updateSetupResults();
    }

    window.handleServiceClick = function(e, name, code, isPackage, forceNoCompare = false, priceLabel = "", discount = "") {
        let target = e.target;
        if (target.closest('.desc-toggle-wrapper') || target.closest('.desc-content')) return;

        if (isCompareMode && !forceNoCompare) {
            if (isPackage) { alert("Пакети послуг не порівнюються."); return; }

            let index = compareSelection.indexOf(name);
            if (index > -1) {
                compareSelection.splice(index, 1);
            } else if (compareSelection.length < 2) {
                compareSelection.push(name);
            }
            updateCompareUI(); renderServices();
        } else {
            window.openModal(name, code, priceLabel, discount);
        }
    }

    window.handleModalServiceClick = function(e, name, isPackage, code, priceLabel = "", discount = "") {
        let target = e.target;
        if (target.closest('.desc-toggle-wrapper') || target.closest('.desc-content')) return;

        if (isModalCompareMode) {
            if (isPackage) { alert("Пакети не порівнюються."); return; }

            let index = modalCompareSelection.indexOf(name);
            if (index > -1) {
                modalCompareSelection.splice(index, 1);
            } else if (modalCompareSelection.length < 2) {
                modalCompareSelection.push(name);
            }
            updateModalCompareUI();

            if (document.getElementById('montazhCity')) window.updateMontazhResults();
            else if (document.querySelector('#rezervItemModal.show')) window.updateRezervResults();
            else window.updateSetupResults();
        } else {
            if (isPackage) {
                window.openModal(name, code, priceLabel, discount);
            } else {
                let toggle = e.currentTarget.querySelector('.desc-toggle-wrapper');
                if(toggle) toggle.click();
            }
        }
    }

    function updateCompareUI() {
        let count = compareSelection.length;
        let text = count === 0 ? "Оберіть 2 сервіси" : (count === 1 ? "Ще 1 сервіс..." : "Готово!");
        document.getElementById('compareStatusText').innerText = text;

        let btn = document.getElementById('compareExecuteBtn');
        btn.innerText = `Порівняти (${count}/2)`;
        if (count === 2) { btn.style.opacity = '1'; btn.style.pointerEvents = 'auto'; }
        else { btn.style.opacity = '0.5'; btn.style.pointerEvents = 'none'; }
    }

    function updateModalCompareUI() {
        let count = modalCompareSelection.length;
        let text = count === 0 ? "Оберіть 2 сервіси" : (count === 1 ? "Ще 1 сервіс..." : "Готово!");
        document.getElementById('compareStatusText').innerText = text;

        let btn = document.getElementById('compareExecuteBtn');
        btn.innerText = `Порівняти (${count}/2)`;
        if (count === 2) { btn.style.opacity = '1'; btn.style.pointerEvents = 'auto'; }
        else { btn.style.opacity = '0.5'; btn.style.pointerEvents = 'none'; }
    }

    function extractFeaturesList(desc) {
        let features = []; if (!desc) return features;
        let lines = String(desc).replace(/\|/g, '\n').split(/\r?\n/);
        lines.forEach(line => {
            let l = line.trim();
            if (!l || l === "Опис відсутній..." || l.startsWith('+') || l.startsWith('=') || l.includes('---')) return;
            if (!l.startsWith('✕') && !l.startsWith('❌') && !l.toLowerCase().startsWith('не покриває ')) {
                let cleanText = l.replace(/^(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff]|✓|✕|❌|✅|\+|-|\*|•|🔹|⚙️|🛡️|🔑|♻️|🎬|🛠️)\s*/, '').trim();
                if (cleanText) { cleanText = cleanText.charAt(0).toUpperCase() + cleanText.slice(1); features.push(cleanText); }
            }
        }); return features;
    }

    function buildCompareTable(sA, sB, descA, descB) {
        let listA = extractFeaturesList(descA); let listB = extractFeaturesList(descB);

        if (listA.length === 0 && listB.length === 0) {
            let html = `<div style="overflow-x:auto; border-radius:12px; border:1px solid var(--border);"><table style="width:100%; border-collapse:collapse; font-size:13px; background:var(--card-bg);"><thead><tr>`;
            [sA, sB].forEach(s => {
                let brandLabel = s.brand || (s.cls === 'brand-ekta' ? 'ЕКТА' : (s.cls === 'brand-support' ? 'SUPPORT' : (s.cls === 'brand-epz' ? 'ЕПЗ' : 'СЕРВІС')));
                html += `<th style="padding:16px; border-bottom:1px solid var(--border); width:50%; vertical-align:top; color:var(--text-main);"><div class="sc-brand ${s.cls}" style="margin-bottom:8px; display:inline-block;">${brandLabel}</div><div style="font-size:12px; font-weight:600; margin-bottom:8px;">${s.title}</div><div style="color:var(--primary);">${s.label || s.priceText}</div></th>`;
            });
            html += `</tr></thead><tbody><tr><td style="padding:16px; border-right:1px solid var(--border);">${descA || 'Опис відсутній'}</td><td style="padding:16px;">${descB || 'Опис відсутній'}</td></tr></tbody></table></div>`; return html;
        }

        let common = []; let diffA = []; let diffB = [...listB];
        listA.forEach(featA => {
            let normA = featA.toLowerCase(); let idxB = diffB.findIndex(featB => featB.toLowerCase() === normA);
            if (idxB !== -1) { common.push({a: featA, b: diffB[idxB]}); diffB.splice(idxB, 1); } else diffA.push(featA);
        });

        let html = `<div style="font-size: 11px; color: var(--text-muted); font-weight: 800; margin-bottom: 12px; text-align: center; text-transform: uppercase;">Властивості (унікальні позначені ⭐️)</div>`;
        html += `<div class="compare-wrapper"><table class="compare-table"><thead><tr>`;
        [sA, sB].forEach(s => {
            let brandLabel = s.brand || (s.cls === 'brand-ekta' ? 'ЕКТА' : (s.cls === 'brand-support' ? 'SUPPORT' : (s.cls === 'brand-epz' ? 'ЕПЗ' : 'СЕРВІС')));
            html += `<th style="padding:16px; border-bottom:1px solid var(--border); width:50%; vertical-align:top; color:var(--text-main);"><div class="sc-brand ${s.cls}" style="margin-bottom:8px; display:inline-block;">${brandLabel}</div><div style="font-size:12px; font-weight:600; margin-bottom:8px;">${s.title}</div><div style="color:var(--primary); font-size:16px;">${s.label || s.priceText}</div></th>`;
        });
        html += `</tr></thead><tbody>`;

        if (common.length > 0) {
            html += `<tr><td colspan="2" style="background:var(--input-bg); font-weight:700; font-size:11px; color:var(--text-muted); text-transform:uppercase; padding:10px 16px;">Спільні властивості</td></tr>`;
            common.forEach(pair => { html += `<tr><td style="padding:12px 16px; border-right:1px solid var(--border); border-bottom:1px solid var(--border); color:var(--text-muted);">${pair.a}</td><td style="padding:12px 16px; border-bottom:1px solid var(--border); color:var(--text-muted);">${pair.b}</td></tr>`; });
        }

        if (diffA.length > 0 || diffB.length > 0) {
            html += `<tr><td colspan="2" style="background:var(--input-bg); font-weight:700; font-size:11px; color:var(--text-main); text-transform:uppercase; padding:10px 16px;">Відмінності</td></tr>`;
            let maxDiff = Math.max(diffA.length, diffB.length);
            for (let i = 0; i < maxDiff; i++) {
                let valA = diffA[i] ? `<span style="color:#fbbf24; margin-right:6px;">●</span>${diffA[i]}` : `<span style="color:var(--border)">-</span>`;
                let valB = diffB[i] ? `<span style="color:#fbbf24; margin-right:6px;">●</span>${diffB[i]}` : `<span style="color:var(--border)">-</span>`;
                html += `<tr><td style="padding:12px 16px; border-right:1px solid var(--border); border-bottom:1px solid var(--border); font-weight:600;">${valA}</td><td style="padding:12px 16px; border-bottom:1px solid var(--border); font-weight:600;">${valB}</td></tr>`;
            }
        }
        html += `</tbody></table></div>`; return html;
    }

    window.handleExecuteCompare = function() { if (isModalCompareMode) window.executeModalCompare(); else window.executeCompare(); }

    window.executeCompare = function() {
        if (compareSelection.length !== 2) return;
        let sA = window.lastCalculatedServices.find(s => s.name === compareSelection[0]); let sB = window.lastCalculatedServices.find(s => s.name === compareSelection[1]);
        if (!sA || !sB) return;
        let descA = window.findInDb(db.descriptions, sA.name) || ""; let descB = window.findInDb(db.descriptions, sB.name) || "";
        let html = buildCompareTable(sA, sB, descA, descB);
        safeUpdateHTML('compareModalBody', html);
        window.openModalBase('compareModal');
        document.getElementById('compareBar').classList.remove('show');
    };

    window.executeModalCompare = function() {
        if (modalCompareSelection.length !== 2) return;
        let sA = window.lastModalServices.find(s => s.name === modalCompareSelection[0] || s.serviceName === modalCompareSelection[0]);
        let sB = window.lastModalServices.find(s => s.name === modalCompareSelection[1] || s.serviceName === modalCompareSelection[1]);
        if (!sA || !sB) return;
        let mappedA = { name: sA.name || sA.serviceName, title: (sA.title || sA.serviceName).replace(/^\[.*?\]\s*/, ''), brand: sA.brand || sA.displayProv || "", label: sA.priceText || sA.label, cls: sA.cls || "brand-settings" };
        let mappedB = { name: sB.name || sB.serviceName, title: (sB.title || sB.serviceName).replace(/^\[.*?\]\s*/, ''), brand: sB.brand || sB.displayProv || "", label: sB.priceText || sB.label, cls: sB.cls || "brand-settings" };
        let descA = window.findInDb(db.descriptions, mappedA.name) || ""; let descB = window.findInDb(db.descriptions, mappedB.name) || "";
        let html = buildCompareTable(mappedA, mappedB, descA, descB);
        safeUpdateHTML('compareModalBody', html);
        window.openModalBase('compareModal');
        document.getElementById('compareBar').classList.remove('show');
    };

    window.closeCompareModal = function() {
        window.closeModalBase('compareModal');

        isCompareMode = false;
        compareSelection = [];
        isModalCompareMode = false;
        modalCompareSelection = [];

        const cBar = document.getElementById('compareBar');
        if (cBar) cBar.classList.remove('show');

        const mainBtn = document.getElementById('toggleCompareBtn');
        if (mainBtn) { mainBtn.innerText = 'Порівняти'; mainBtn.classList.remove('active'); }

        document.querySelectorAll('.compare-toggle-btn').forEach(btn => {
            btn.innerText = 'Порівняти';
            btn.classList.remove('active');
        });

        if (currentCategoryData || currentServiceData) renderServices();
        if (document.getElementById('montazhCity')) window.updateMontazhResults();
        else if (document.querySelector('#rezervItemModal.show')) window.updateRezervResults();
        else window.updateSetupResults();
    }

    window.renderMontazhModal = function() {
        try {
            if (!db.montazhData || !db.montazhData.cities || db.montazhData.cities.length === 0) {
                safeUpdateHTML('modalBody', `<div style="text-align:center; padding: 20px; color:var(--text-muted); font-weight: 800;">Помилка: Міста для монтажу не завантажено.</div>`); return;
            }

            window.currentDevicePrice = parseFloat(document.getElementById('devicePrice').value) || 0;

            const cities = db.montazhData.cities.sort((a, b) => String(a).localeCompare(String(b))); const services = db.montazhData.services;
            window.cityStatusMap = new Map();
            cities.forEach(city => {
                let hasAny = services.some(s => { let avail = s.availability[city]; return avail && avail !== "-" && avail !== "✖" && !String(avail).toLowerCase().includes("немає"); });
                window.cityStatusMap.set(city, hasAny);
            });
            const categories = [...new Set(services.map(s => s.cat).filter(Boolean))];

            safeUpdateHTML('modalBody', `
                <div class="input-group">
                    <select id="montazhCity" class="montazh-select">
                        <option value="">-- Оберіть місто --</option>
                        ${cities.map(c => { let emoji = window.cityStatusMap.get(c) ? "🟢" : "🔴"; return `<option value="${c}">${emoji}${c}</option>`; }).join('')}
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
            if (currentCategoryData && currentCategoryData.category) {
                let targetCat = String(currentCategoryData.category).toLowerCase();
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
    }

    window.updateMontazhResults = function() {
        try {
            const city = document.getElementById('montazhCity').value; const cat = document.getElementById('montazhCat').value;
            const subcatWrapper = document.getElementById('montazhSubCatWrapper'); const subcat = subcatWrapper.style.display !== 'none' ? document.getElementById('montazhSubCat').value : "";
            const resultsContainer = document.getElementById('montazhResults');

            if (!city || !cat) { safeUpdateHTML(resultsContainer, ""); return; }
            const matches = db.montazhData.services.filter(s => s.cat === cat && (!subcatWrapper.style.display || subcatWrapper.style.display === 'none' || !subcat || s.subcat === subcat));
            if (matches.length === 0) { safeUpdateHTML(resultsContainer, `<div style="padding:20px; text-align:center; color:var(--text-muted);">Послуг не знайдено</div>`); return; }

            let renderItems = [];
            matches.forEach(s => {
                 let availability = s.availability[city] || ""; let isUnavailable = (!availability || String(availability).toLowerCase().includes("немає") || availability === "-" || availability === "✖");
                 let displayProv = ""; let matchProv = String(s.name).match(/^\[(.*?)\]/); if (matchProv) displayProv = matchProv[1].trim();

                 let price = s.price;
                 let discountVal = "";

                 let nameClean = normalizeServiceName(s.name);
                 const t = db.tariffs.find(x => normalizeServiceName(x.service) === nameClean || (x.serviceRu && normalizeServiceName(x.serviceRu) === nameClean));
                 if (t) {
                     if (!price && t.cost) price = t.cost;
                     if (t.discount) discountVal = t.discount;
                 }

                 let cleanCost = String(price).replace(/\s+/g, '').replace(/[^\d.,]/g, '').replace(',', '.'); let priceVal = parseFloat(cleanCost) || 0;
                 let priceText = isNaN(priceVal) || cleanCost === '' ? price : priceVal.toLocaleString('uk-UA') + " ₴";
                 let descToggleHTML = generateDescToggleHTML(window.findInDb(db.descriptions, s.name), window.findInDb(db.serviceCodes, s.name));

                 renderItems.push({ isUnavailable, priceVal, displayProv, serviceName: s.name, priceText, descToggleHTML, availability, code: s.code, discount: discountVal });
            });

            renderItems.sort((a, b) => { if (a.isUnavailable !== b.isUnavailable) return a.isUnavailable ? 1 : -1; return b.priceVal - a.priceVal; });
            window.lastModalServices = renderItems.map(item => {
                let cls = 'brand-other'; let pUpper = String(item.displayProv).toUpperCase();
                if (pUpper === 'ЕКТА' || pUpper === 'EKTA') cls = "brand-ekta"; else if (pUpper === 'НАШ СЕРВІС' || pUpper === 'SUPPORT' || pUpper === 'МІЙ СЕРВІС') cls = "brand-support";
                return { name: item.serviceName, title: String(item.serviceName).replace(/^\[.*?\]\s*/, ''), brand: item.displayProv, cls, priceText: item.priceText, code: item.code, discount: item.discount };
            });

            let modalCompBtn = document.getElementById('montazhCompareBtn'); let availableCount = renderItems.filter(item => !item.isUnavailable).length;
            if (modalCompBtn) { if (availableCount >= 2) modalCompBtn.style.display = 'block'; else { modalCompBtn.style.display = 'none'; if (isModalCompareMode) window.toggleModalCompareMode(); } }

            let resultsHTML = ""; let seenUnavailable = new Set();
            renderItems.forEach(item => {
                let cls = 'brand-other'; let pUpper = String(item.displayProv).toUpperCase();
                if (pUpper === 'ЕКТА' || pUpper === 'EKTA') cls = "brand-ekta"; else if (pUpper === 'НАШ СЕРВІС' || pUpper === 'SUPPORT' || pUpper === 'МІЙ СЕРВІС') cls = "brand-support";
                let obj = { name: item.serviceName, title: String(item.serviceName).replace(/^\[.*?\]\s*/, ''), brand: item.displayProv, cls, label: item.priceText, descToggleHTML: item.descToggleHTML, isPackage: false, code: item.code, discount: item.discount };

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
                     resultsHTML += generateServiceCardHTML(obj, true, false);
                }
            });
            safeUpdateHTML(resultsContainer, resultsHTML);
        } catch(e) { console.error(e); }
    }

    window.renderDirectListModal = function(targetCategories) {
        try {
            window.currentDevicePrice = parseFloat(elPriceInput.value) || 0;
            if (!Array.isArray(targetCategories)) targetCategories = [targetCategories];
            let matches = db.tariffs.filter(t => {
                let c = t.cat ? normalizeServiceName(t.cat) : ""; let sName = t.service ? normalizeServiceName(t.service) : "";
                return targetCategories.some(tc => { let ntc = normalizeServiceName(tc); return c.includes(ntc) || sName.includes(ntc); });
            });
            if(matches.length === 0) { safeUpdateHTML('modalBody', `<div style="text-align:center; padding: 20px; color:var(--text-muted);">Послуг не знайдено</div>`); return; }

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

                let discountVal = m.discount ? m.discount : "";

                let cls = 'brand-settings'; let uName = String(m.service).toUpperCase();
                if (uName.includes('SUPPORT') || uName.includes('НАШ СЕРВІС')) cls = 'brand-support';
                else if (uName.includes('EKTA') || uName.includes('ЕКТА')) cls = 'brand-ekta';
                else if (uName.includes('EPZ') || uName.includes('ЕПЗ')) cls = 'brand-epz';
                return { name: m.service, title: String(m.service).replace(/^\[.*?\]\s*/, ''), numCost, priceText, cls: cls, code: m.code, isPackage: false, discount: discountVal };
            });

            processedMatches.sort((a, b) => b.numCost - a.numCost); window.lastModalServices = processedMatches;
            let headerHtml = `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;"><span style="font-weight:700; font-size:12px; text-transform:uppercase; color:var(--text-muted);">Сервіси</span><button id="setupCompareBtn" class="compare-toggle-btn" style="display:${processedMatches.length >= 2 ? 'block' : 'none'}; cursor:pointer;" onclick="window.toggleModalCompareMode()">Порівняти</button></div>`;
            let html = processedMatches.map(m => { m.label = m.priceText; m.descToggleHTML = generateDescToggleHTML(window.findInDb(db.descriptions, m.name), m.code); return generateServiceCardHTML(m, true, false); }).join('');
            safeUpdateHTML('modalBody', headerHtml + `<div id="setupResults" style="margin-bottom:0; display:flex; flex-direction:column; gap:12px;">${html}</div>`);
        } catch(e) { console.error(e); }
    }

    window.renderSetupModal = function(targetName, mode = "setup") {
        try {
            window.currentDevicePrice = parseFloat(elPriceInput.value) || 0;
            let setupCats = [...new Set(db.tariffs.filter(t => {
                if (!t.cat) return false; let c = String(t.cat).toLowerCase();
                if (mode === "antivirus") return c.includes('антивірус') || c.includes('eset');
                else return !c.includes('монтаж') && !c.includes('кухонна') && !c.includes('перевірка') && !c.includes('поклейка') && !c.includes('скло') && !c.includes('антивірус') && !c.includes('eset') && !c.includes('кінотеатр') && !c.includes('sweet') && !c.includes('сервіси support') && !c.includes('сервіси екта');
            }).map(t => t.cat))];

            let labelText = mode === "antivirus" ? "Оберіть тип антивірусу:" : "Оберіть тип сервісу:";
            safeUpdateHTML('modalBody', `<div class="input-group"><span class="montazh-label" style="font-weight:600; display:block; margin-bottom:8px; font-size:14px; color:var(--text-muted);">${labelText}</span><select id="setupCat" class="montazh-select"><option value="">-- Оберіть категорію --</option>${setupCats.map(c => `<option value="${c}">${c}</option>`).join('')}</select></div><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;"><span style="font-weight:700; font-size:12px; text-transform:uppercase; color:var(--text-muted);">Сервіси</span><button id="setupCompareBtn" class="compare-toggle-btn" style="display:none; cursor:pointer;" onclick="window.toggleModalCompareMode()">Порівняти</button></div><div id="setupResults" style="margin-bottom:0; display:flex; flex-direction:column; gap:12px;"></div>`);

            let catSelect = document.getElementById('setupCat'); let targetClean = normalizeServiceName(targetName);
            let targetTariff = db.tariffs.find(t => normalizeServiceName(t.service) === targetClean || (t.serviceRu && normalizeServiceName(t.serviceRu) === targetClean));
            let catToSelect = targetName; if (targetTariff && targetTariff.cat) catToSelect = targetTariff.cat;
            let cleanCatToSelect = normalizeServiceName(catToSelect);
            for (let i = 0; i < catSelect.options.length; i++) {
                let optClean = normalizeServiceName(catSelect.options[i].value);
                if (optClean === cleanCatToSelect || optClean.includes(cleanCatToSelect) || cleanCatToSelect.includes(optClean)) { catSelect.selectedIndex = i; setTimeout(() => catSelect.dispatchEvent(new Event('change')), 50); break; }
            }
            catSelect.addEventListener('change', window.updateSetupResults);
        } catch(e) { console.error(e); }
    }

    window.updateSetupResults = function() {
        try {
            let catElement = document.getElementById('setupCat');
            let container = document.getElementById('setupResults');
            if(!container) return;

            if (catElement) {
                let cat = catElement.value;
                if(!cat) { safeUpdateHTML(container, ""); return; }
                let matches = db.tariffs.filter(t => t.cat === cat);
                if(matches.length === 0) { safeUpdateHTML(container, `<div style="text-align:center; padding: 20px; color:var(--text-muted);">Послуг не знайдено</div>`); return; }

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

                    let discountVal = m.discount ? m.discount : "";

                    let cls = 'brand-settings'; let uName = String(m.service).toUpperCase();
                    if (uName.includes('SUPPORT') || uName.includes('НАШ СЕРВІС')) cls = 'brand-support';
                    else if (uName.includes('EKTA') || uName.includes('ЕКТА')) cls = 'brand-ekta';
                    else if (uName.includes('EPZ') || uName.includes('ЕПЗ')) cls = 'brand-epz';
                    return { name: m.service, title: String(m.service).replace(/^\[.*?\]\s*/, ''), numCost, priceText, cls: cls, code: m.code, isPackage: false, discount: discountVal };
                });

                processedMatches.sort((a, b) => b.numCost - a.numCost);
                window.lastModalServices = processedMatches;
            }

            let modalCompBtn = document.getElementById('setupCompareBtn');
            if (modalCompBtn) {
                if (window.lastModalServices.length >= 2) modalCompBtn.style.display = 'block';
                else { modalCompBtn.style.display = 'none'; if (isModalCompareMode) { window.toggleModalCompareMode(); } }
            }

            let html = window.lastModalServices.map(m => {
                m.label = m.priceText;
                m.descToggleHTML = generateDescToggleHTML(window.findInDb(db.descriptions, m.name), m.code);
                return generateServiceCardHTML(m, true, false);
            }).join('');
            safeUpdateHTML(container, html);
        } catch(e) { console.error(e); }
    }

    window.openModal = function(name, code = "", priceLabel = "", discount = "") {
        let nameClean = normalizeServiceName(name); let u = String(name).toUpperCase();
        let isSetupCategory = db.tariffs.some(t => t.cat && normalizeServiceName(t.cat) === nameClean);
        let isStaticEpz = (u.includes('WINDOWS') || u.includes('OFFICE') || u.includes('ESD') || u.includes('[ESD]')) && !u.includes('НАЛАШТУВАННЯ') && !u.includes('ВСТАНОВЛЕННЯ') && !u.includes('АНТИВІРУС');

        if (!isStaticEpz) {
            if (u.includes('МОНТАЖ') || u.includes('ПІДКЛЮЧЕННЯ') || (u.includes('ВСТАНОВЛЕННЯ') && !u.includes('ЗАХИСН'))) { document.getElementById('modalTitle').innerText = "Монтаж ВПТ"; window.openModalBase('descModal'); window.renderMontazhModal(); return; }
            else if (u.includes('ПЕРЕВІРКА') || u.includes('ПІКСЕЛ')) { document.getElementById('modalTitle').innerText = "Перевірка на биті пікселі"; window.openModalBase('descModal'); window.renderDirectListModal(["перевірка", "піксел"]); return; }
            else if (u.includes('ПОКЛЕЙКА') || u.includes('ЗАХИСН') || u.includes('СКЛО') || u.includes('ПЛІВК')) { document.getElementById('modalTitle').innerText = "Поклейка скла та плівок"; window.openModalBase('descModal'); window.renderDirectListModal(["поклейка", "скло", "плівк", "захисн"]); return; }
            else if (u.includes('АНТИВІРУС') || u.includes('ESET')) { document.getElementById('modalTitle').innerText = "Антивіруси"; window.openModalBase('descModal'); window.renderSetupModal(name, "antivirus"); return; }
            else if (u.includes('КІНОТЕАТР') || u.includes('SWEET') || u.includes('PARALLELS')) { document.getElementById('modalTitle').innerText = u.includes('PARALLELS') ? "Parallels Desktop" : "Онлайн кінотеатри"; window.openModalBase('descModal'); window.renderDirectListModal(u.includes('PARALLELS') ? ["parallels"] : ["sweet", "кінотеатр"]); return; }
            else if (isSetupCategory || u.includes('НАЛАШТУВАННЯ') || u.includes('ПЗ') || u.includes('ПОСЛУГИ') || u.includes('ГОДИНА РОБОТИ')) { document.getElementById('modalTitle').innerText = "Налаштування та сервіси"; window.openModalBase('descModal'); window.renderSetupModal(name, "setup"); return; }
        }

        window.openModalBase('descModal', name, code, priceLabel, discount);
    }

    window.showChangelogModal = function(version, changelogText) {
        document.getElementById('modalTitle').innerHTML = `Оновлення v${version}`;

        let blocks = String(changelogText).split(/(?:\r?\n)?\s*--\s*(?:\r?\n)?/);
        let html = '<div style="display:flex; flex-direction:column; gap:12px;">';

        blocks.forEach((block) => {
            if (!block.trim()) return;

            let lines = block.split(/\r?\n/);
            let blockHtml = '';

            lines.forEach((line, index) => {
                let l = line.trim();
                if (!l) return;

                let lineStyle = "";

                if (l.startsWith('(AA+)')) {
                    l = l.substring(5).trim().toUpperCase();
                    lineStyle += " font-weight:800;";
                } else if (l.startsWith('(Аа+)')) {
                    l = l.substring(5).trim();
                    l = l.charAt(0).toUpperCase() + l.slice(1);
                    lineStyle += " font-weight:800;";
                } else if (l.startsWith('(аа*)')) {
                    l = l.substring(5).trim();
                    lineStyle += " font-style:italic;";
                } else if (l.startsWith('(КР+)')) {
                    l = l.substring(5).trim().toUpperCase();
                    lineStyle += " font-weight:800; color:var(--danger);";
                } else if (l.startsWith('(Кр+)')) {
                    l = l.substring(5).trim();
                    lineStyle += " font-weight:800; color:var(--danger);";
                } else if (l.startsWith('(кр*)')) {
                    l = l.substring(5).trim();
                    lineStyle += " font-style:italic; color:var(--danger);";
                }

                l = l.replace(/([\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/g, '<span style="font-size: 1.5em; vertical-align: middle; line-height: 1;">$1</span>');

                let margin = blockHtml !== '' ? "margin-top: 6px;" : "";
                blockHtml += `<div style="${lineStyle} ${margin}">${RichText.inline(l)}</div>`;
            });

            if (blockHtml) {
                html += `<div style="background:var(--card-bg); padding:12px 16px; border-radius:16px; border:1px solid var(--border); box-shadow: 0 2px 8px rgba(0,0,0,0.04); font-size:14px; line-height:1.5; color:var(--text-main);">${blockHtml}</div>`;
            }
        });

        html += '</div>';

        safeUpdateHTML('modalBody', html);
        window.openModalBase('descModal');
    };

    const SELLER_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx9yWtQnj_8toHmk5X-Pce9FtaJiuKeb_ekcZbb0A5nBBymqs_buBsO_v5YUW6sRWS6IA/exec";

    window.openSellerModal = function() {
        window.openModalBase('sellerModal');
        if(document.getElementById('sellerStore').options.length <= 1) {
            const scriptTag = document.createElement('script');
            scriptTag.src = `${SELLER_SCRIPT_URL}?action=getFormData&callback=handleSellerResponse`;
            document.body.appendChild(scriptTag);
        }

        document.getElementById('sellerFormSubmit').style.display = 'block';
        document.getElementById('sellerStatusOverlay').style.display = 'none';
        document.getElementById('submitSellerBtn').disabled = false;
        document.getElementById('submitSellerBtn').innerText = 'ВІДПРАВИТИ';
        document.getElementById('sellerFormSubmit').reset();
    }

    window.handleSellerResponse = function(data) {
        const s = document.getElementById('sellerStore');
        const r = document.getElementById('sellerReason');
        s.innerHTML = '<option value="" disabled selected>Оберіть магазин</option>';
        r.innerHTML = '<option value="" disabled selected>Оберіть причину</option>';
        data.stores.forEach(item => s.add(new Option(item, item)));
        data.reasons.forEach(item => r.add(new Option(item, item)));
    }

    document.getElementById('sellerFormSubmit').onsubmit = function(e) {
        e.preventDefault();
        const btn = document.getElementById('submitSellerBtn');
        const overlay = document.getElementById('sellerStatusOverlay');
        const form = document.getElementById('sellerFormSubmit');

        btn.disabled = true;
        btn.innerText = 'НАДСИЛАЄМО...';

        fetch(SELLER_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: new FormData(this)
        })
        .then(() => {
            form.style.display = 'none';
            overlay.style.display = 'block';
        })
        .catch(() => {
            alert("Помилка відправки.");
            btn.disabled = false;
            btn.innerText = 'ВІДПРАВИТИ';
        });
    };

    init();

    // Перевірка цілісності офлайн-кешу: Service Worker звіряє файли з переліком і докачує відсутні
    window.verifyAppCache = function(timeoutMs) {
        return new Promise(resolve => {
            if (!('serviceWorker' in navigator)) return resolve(null);
            let done = false;
            const onMsg = e => {
                if (!e.data || e.data.type !== 'verify-result') return;
                done = true; navigator.serviceWorker.removeEventListener('message', onMsg); resolve(e.data);
            };
            navigator.serviceWorker.addEventListener('message', onMsg);
            navigator.serviceWorker.getRegistration().then(reg => {
                const w = navigator.serviceWorker.controller || (reg && reg.active);
                if (!w) { navigator.serviceWorker.removeEventListener('message', onMsg); done = true; return resolve(null); }
                try { w.postMessage({ type: 'verify' }); } catch (e) { resolve(null); }
            }).catch(() => resolve(null));
            setTimeout(() => { if (!done) { navigator.serviceWorker.removeEventListener('message', onMsg); resolve(null); } }, timeoutMs || 25000);
        });
    };
    window.addEventListener('load', () => { setTimeout(() => { if (navigator.onLine !== false) window.verifyAppCache(60000); }, 6000); });

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).catch(() => {}); });
        // Нова версія застосунку: після зміни Service Worker перезавантажуємо сторінку,
        // щойно користувач повертається в застосунок (щоб одразу діяли нові файли).
        const hadController = !!navigator.serviceWorker.controller;
        let updatePending = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController) { updatePending = true; try { sessionStorage.setItem('skillhub_skip_start', '1'); } catch (e) {} } });
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible' && updatePending) { updatePending = false; location.reload(); }
        });
        window.addEventListener('load', () => { setTimeout(() => { navigator.serviceWorker.getRegistration().then(r => r && r.update()).catch(() => {}); }, 1500); });
    }
