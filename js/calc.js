// === ЛОГИКА И ВЫЧИСЛЕНИЯ (calc.js) ===

window.buildServiceSearchList = function() {
    let uniqueMap = new Map();
    
    if(window.db.tariffs) {
        window.db.tariffs.forEach(t => {
            if(t.service) {
                let origName = t.service.trim();
                if(!uniqueMap.has(origName)) {
                    uniqueMap.set(origName, { orig: origName, ru: t.serviceRu || "", en: t.serviceEn || "" });
                }
            }
        });
    }
    if(window.db.descriptions) {
        Object.keys(window.db.descriptions).forEach(k => {
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
        
        let exactBrand = window.db.serviceBrands ? window.findInDb(window.db.serviceBrands, origName) : "";
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

window.findPriceForServiceText = function(name, p) {
    let cleanName = window.normalizeServiceName(name);
    let matchingTariffs = window.db.tariffs.filter(x => {
        let n1 = window.normalizeServiceName(x.service);
        let n2 = x.serviceRu ? window.normalizeServiceName(x.serviceRu) : "";
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

window.calculateServicesArray = function(item, p) {
    if(!item) return [];
    const focusList = item.focusServices ? String(item.focusServices).split('|').map(s => window.normalizeServiceName(s)) : [];
    const servicesNames = item.service ? String(item.service).split('|').map(s => s.trim()).filter(s => s) : [];
    const brandRegex = /^\[(.*?)\]/;
    
    const dataForSort = servicesNames.map(name => {
        let exactBrand = window.db.serviceBrands ? window.findInDb(window.db.serviceBrands, name) : "";
        const brandMatch = name.match(brandRegex); const brand = exactBrand || (brandMatch ? brandMatch[1] : "");
        let title = name.replace(/^\[(.*?)\]\s*/, "").trim(); let nameClean = window.normalizeServiceName(name); let isFocus = false;
        
        if(title.includes('🔥')) { isFocus = true; title = title.replace('🔥', '').trim(); } else if (focusList.includes(nameClean)) isFocus = true;
        
        const matchingTariffs = window.db.tariffs.filter(x => { return window.normalizeServiceName(x.service) === nameClean || (x.serviceRu && window.normalizeServiceName(x.serviceRu) === nameClean); });
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
            if (!isPackage && window.db.tariffs.some(x => x.cat && window.normalizeServiceName(x.cat) === nameClean)) isPackage = true;
        }
        
        let numCost = 0; let label = "Дізнатись"; let serviceCode = t && t.code ? t.code : window.findInDb(window.db.serviceCodes, name); 
        
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
        
        return { name, brand, title, numCost, label, cls, isFocus, code: serviceCode, isPackage, descToggleHTML: '' };
    });

    dataForSort.sort((a, b) => { if (a.isFocus && !b.isFocus) return -1; if (!a.isFocus && b.isFocus) return 1; return b.numCost - a.numCost; });
    return dataForSort;
};

window.calculateKlochBonus = function() {
    let price = parseFloat(document.getElementById('klochPrice').value) || 0;
    let qty = parseInt(document.getElementById('klochQty').value) || 1;
    let result = 0;
    let appliedPercent = 0;

    if (price > 0 && window.db.klochCalcData && window.db.klochCalcData.rules && window.db.klochCalcData.rules.length > 0) {
        let rules = [...window.db.klochCalcData.rules];
        rules.sort((a, b) => a.min - b.min);
        
        let matchedRule = rules.find(r => price >= r.min && price <= r.max);
        
        if (matchedRule) {
            appliedPercent = matchedRule.percent;
        } else if (rules.length > 0 && price > rules[rules.length - 1].max) {
            appliedPercent = rules[rules.length - 1].percent;
        }
        
        result = (price * (appliedPercent / 100)) * qty;
    }

    let resBox = document.getElementById('klochResultBox');
    resBox.style.transform = 'scale(1.02)';
    setTimeout(() => resBox.style.transform = 'scale(1)', 150);

    document.getElementById('klochResultValue').innerText = result.toFixed(2) + ' ₴';
    document.getElementById('klochResultFormula').innerText = `Формула: (${price} * ${appliedPercent}%) * ${qty}`;
    
    return { price, qty, percent: appliedPercent, result };
};

window.extractFeaturesList = function(desc) {
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
};

window.buildCompareTable = function(sA, sB, descA, descB) {
    let listA = window.extractFeaturesList(descA); let listB = window.extractFeaturesList(descB);

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
};