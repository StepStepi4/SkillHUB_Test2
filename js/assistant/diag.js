/* Діагностика додатку (тільки Власник).
   БЕЗПЕКА: 1) перший крок - запит `diag` на сервері, який сам перевіряє токен і роль; без підтвердження сервера
   нічого не запускається і не показується. 2) У звіт не потрапляють логіни, ПІБ, паролі, токени, id скрипта -
   лише лічильники, час і стани. 3) Весь текст проходить через __redact перед показом і копіюванням. */
(function () {
    if (window.Diag) return;
    const EXPECT_REV = 19;
    const files = ['index.html', 'sw.js', 'manifest.json', 'css/assistant.css', 'css/academy.css', 'js/core/config.js', 'js/assistant/assistant.js', 'js/academy/academy.js'];
    const red = s => (window.__redact ? window.__redact(s) : String(s));
    const $ = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };
    const esc = s => String(s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
    const kb = n => (n / 1024 >= 1024 ? (n / 1048576).toFixed(2) + ' МБ' : Math.round(n / 1024) + ' КБ');
    const timeout = (p, ms, label) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('Тайм-аут ' + ms / 1000 + ' с: ' + label)), ms))]);

    const CSS = `
#diagOv{position:fixed;inset:0;z-index:100000;background:var(--bg-color,var(--bg,#f2f2f7));color:var(--text-main,#111);overflow-y:auto;-webkit-overflow-scrolling:touch;font-family:Inter,system-ui,sans-serif;padding:calc(env(safe-area-inset-top,0px) + 14px) 14px calc(env(safe-area-inset-bottom,0px) + 28px)}
#diagOv .dg-wrap{max-width:720px;margin:0 auto}
#diagOv .dg-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px}
#diagOv h1{font-size:22px;font-weight: 700;margin:0;line-height:1.15}
#diagOv .dg-sub{font-size:12px;font-weight:600;color:var(--text-muted,#6b7280);margin-top:4px}
#diagOv .dg-x{width:38px;height:38px;border-radius:50%;border:1px solid var(--border,#e5e5ea);background:var(--card-bg,#fff);font-size:18px;font-weight: 700;cursor:pointer;color:inherit;flex-shrink:0}
#diagOv .dg-sum{background:var(--card-bg,#fff);border:1px solid var(--border,#e5e5ea);border-radius:18px;padding:16px;margin-bottom:12px}
#diagOv .dg-state{display:flex;align-items:center;gap:10px;font-size:17px;font-weight: 700}
#diagOv .dg-dot{width:12px;height:12px;border-radius:50%;flex-shrink:0;background:#9ca3af}
#diagOv .dg-dot.ok{background:#16a34a}#diagOv .dg-dot.warn{background:#f59e0b}#diagOv .dg-dot.err{background:#dc2626}#diagOv .dg-dot.run{background:#3b82f6;animation:dgP 1s infinite}
@keyframes dgP{50%{opacity:.35}}
#diagOv .dg-cnt{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:12px}
#diagOv .dg-cnt div{background:var(--input-bg,#f3f4f6);border-radius:12px;padding:9px 6px;text-align:center}
#diagOv .dg-cnt b{display:block;font-size:20px;font-weight: 700}
#diagOv .dg-cnt span{font-size:10px;font-weight:700;text-transform:uppercase;color:var(--text-muted,#6b7280);letter-spacing:.03em}
#diagOv .dg-bar{height:4px;border-radius:4px;background:var(--border,#e5e5ea);margin-top:14px;overflow:hidden}
#diagOv .dg-bar i{display:block;height:100%;width:0;background:var(--text-main,#111);transition:width .25s}
#diagOv .dg-now{font-size:12px;font-weight:600;color:var(--text-muted,#6b7280);margin-top:8px;min-height:16px}
#diagOv .dg-btns{display:flex;gap:8px;margin-bottom:14px}
#diagOv .dg-btn{flex:1;padding:12px;border-radius:14px;border:1.5px solid var(--text-main,#111);background:var(--text-main,#111);color:var(--bg-color,#fff);font:800 14px Inter,sans-serif;cursor:pointer}
#diagOv .dg-btn.sec{background:transparent;color:var(--text-main,#111)}
#diagOv .dg-btn:disabled{opacity:.45}
#diagOv .dg-sec{background:var(--card-bg,#fff);border:1px solid var(--border,#e5e5ea);border-radius:18px;margin-bottom:12px;overflow:hidden}
#diagOv .dg-sec>h2{margin:0;padding:13px 16px;font-size:12px;font-weight: 700;text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted,#6b7280);border-bottom:1px solid var(--border,#e5e5ea);display:flex;justify-content:space-between}
#diagOv .dg-row{display:flex;gap:10px;align-items:flex-start;padding:11px 16px;border-bottom:1px solid var(--border,#e5e5ea)}
#diagOv .dg-row:last-child{border-bottom:0}
#diagOv .dg-row .dg-dot{margin-top:5px;width:10px;height:10px}
#diagOv .dg-n{flex:1;min-width:0}
#diagOv .dg-n b{font-size:13px;font-weight: 700;display:block}
#diagOv .dg-n small{display:block;font-size:12px;font-weight:600;color:var(--text-muted,#6b7280);margin-top:2px;word-break:break-word}
#diagOv .dg-v{text-align:right;font-size:12px;font-weight:700;max-width:52%;word-break:break-word;font-variant-numeric:tabular-nums}
#diagOv .dg-v em{display:block;font-style:normal;font-size:10px;color:var(--text-muted,#6b7280);font-weight:600;margin-top:2px}
#diagOv .dg-row.err,#diagOv .dg-row.warn{cursor:pointer}
#diagOv .dg-row.err{background:rgba(220,38,38,.07)}#diagOv .dg-row.warn{background:rgba(245,158,11,.07)}
#diagOv .dg-errs{border-color:rgba(220,38,38,.45)}
#diagOv .dg-errs>h2{color:#dc2626}
#diagOv .dg-hint{font-size:11px;font-weight:600;color:var(--text-muted,#6b7280);padding:8px 16px 12px}
#diagOv .dg-toast{position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 28px);transform:translateX(-50%);background:#111;color:#fff;padding:10px 18px;border-radius:999px;font:700 13px Inter,sans-serif;opacity:0;pointer-events:none;transition:opacity .2s;z-index:100001}
#diagOv .dg-toast.on{opacity:1}
#diagOv .dg-deny{background:var(--card-bg,#fff);border:1px solid rgba(220,38,38,.5);border-radius:18px;padding:22px;text-align:center;font-weight:700}`;

    let ov, state;

    function toast(msg) {
        const t = ov.querySelector('.dg-toast'); t.textContent = msg; t.classList.add('on');
        clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), 1600);
    }
    function copy(text) {
        text = red(text);
        const done = () => toast('Скопійовано в буфер обміну');
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done).catch(() => fallback());
        else fallback();
        function fallback() {
            const ta = document.createElement('textarea'); ta.value = text; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta);
            ta.select(); try { document.execCommand('copy'); done(); } catch (e) { toast('Не вдалося скопіювати'); } ta.remove();
        }
    }

    /* ---------- збір результатів ---------- */
    function Report() { this.sections = []; this.cur = null; }
    Report.prototype.sec = function (name) { this.cur = { name: name, rows: [] }; this.sections.push(this.cur); return this.cur; };
    Report.prototype.add = function (r) { r.value = red(r.value == null ? '' : r.value); r.detail = red(r.detail || ''); this.cur.rows.push(r); render(); return r; };
    Report.prototype.all = function () { return [].concat.apply([], this.sections.map(s => s.rows.map(r => Object.assign({ sec: s.name }, r)))); };

    async function step(rep, name, fn) {
        setNow(name);
        const t = performance.now();
        try {
            const v = await fn() || {};
            rep.add({ name: name, status: v.status || 'ok', value: v.value, detail: v.detail, ms: Math.round(performance.now() - t) });
        } catch (e) {
            rep.add({ name: name, status: 'err', value: 'Помилка виконання', detail: (e && e.message) || String(e), ms: Math.round(performance.now() - t) });
        }
        state.done++; setProgress();
    }
    function setNow(t) { const n = ov.querySelector('.dg-now'); if (n) n.textContent = t ? 'Перевірка: ' + t + '…' : ''; }
    function setProgress() { const b = ov.querySelector('.dg-bar i'); if (b) b.style.width = Math.min(100, Math.round(state.done / state.total * 100)) + '%'; }

    /* ---------- перевірки ---------- */
    function uaBrief() {
        const u = navigator.userAgent; let os = /iPhone|iPad|iPod/.test(u) ? 'iOS ' + ((u.match(/OS (\d+)[_\d]*/) || [])[1] || '') : /Android/.test(u) ? 'Android ' + ((u.match(/Android (\d+)/) || [])[1] || '') : /Windows/.test(u) ? 'Windows' : /Mac OS/.test(u) ? 'macOS' : 'ОС невідома';
        let br = /CriOS|Chrome\//.test(u) ? 'Chrome ' + ((u.match(/(?:CriOS|Chrome)\/(\d+)/) || [])[1] || '') : /Safari\//.test(u) ? 'Safari ' + ((u.match(/Version\/(\d+)/) || [])[1] || '') : 'браузер';
        return os + ', ' + br;
    }
    async function fetchTimed(url, opts) {
        const t = performance.now();
        const ctl = new AbortController(); const h = setTimeout(() => ctl.abort(), 20000);
        try {
            const r = await fetch(url, Object.assign({ cache: 'no-store', signal: ctl.signal }, opts || {}));
            const tt = performance.now(); const txt = await r.text(); const end = performance.now();
            return { ok: r.ok, status: r.status, text: txt, ttfb: Math.round(tt - t), total: Math.round(end - t), size: txt.length };
        } finally { clearTimeout(h); }
    }

    async function runAll(rep) {
        /* 0. Доступ: сервер сам підтверджує, що це Власник */
        setNow('Підтвердження доступу на сервері');
        let sv;
        try { sv = await timeout(window.Academy.diagPost('diag'), 40000, 'сервер'); }
        catch (e) { return deny('Сервер не відповів: ' + e.message); }
        if (!sv || !sv.success) {
            if (sv && (sv.code === 'forbidden' || sv.code === 'auth_required' || sv.code === 'no_auth')) return deny(sv.code === 'forbidden' ? 'Доступ заборонено: потрібна роль «Власник».' : 'Сесія недійсна. Увійдіть в Академію як Власник.');
            return deny('Сервер повернув помилку' + (sv && sv.error ? ': ' + sv.error : '') + '. Імовірно, скрипт ще не оновлено до версії ' + EXPECT_REV + '.');
        }
        state.total = 50; state.done = 1; setProgress();

        rep.sec('Середовище');
        await step(rep, 'Версія застосунку', async () => {
            const r = await fetchTimed('sw.js'); const m = r.text.match(/const VERSION = '([^']+)'/);
            return { value: m ? m[1] : 'не визначено', status: m ? 'ok' : 'warn' };
        });
        await step(rep, 'Режим запуску', async () => ({ value: ((matchMedia('(display-mode: standalone)').matches || navigator.standalone) ? 'Встановлений додаток (PWA)' : 'Браузер'), status: 'info' }));
        await step(rep, 'Пристрій', async () => ({ value: uaBrief() + '; ' + screen.width + '×' + screen.height + ' @' + (window.devicePixelRatio || 1) + 'x' + (navigator.deviceMemory ? '; ОЗП ≈' + navigator.deviceMemory + ' ГБ' : '') + (navigator.hardwareConcurrency ? '; ядер ' + navigator.hardwareConcurrency : ''), status: 'info' }));
        await step(rep, 'Мова / часовий пояс', async () => ({ value: navigator.language + ' / ' + Intl.DateTimeFormat().resolvedOptions().timeZone, status: 'info' }));
        await step(rep, 'Мережа', async () => {
            const c = navigator.connection || {};
            return { value: (navigator.onLine ? 'онлайн' : 'офлайн') + (c.effectiveType ? ', ' + c.effectiveType : '') + (c.rtt != null ? ', RTT ' + c.rtt + ' мс' : '') + (c.downlink ? ', ↓' + c.downlink + ' Мбіт/с' : '') + (c.saveData ? ', економія трафіку' : ''), status: navigator.onLine ? 'ok' : 'err' };
        });

        rep.sec('Пам’ять і сховище');
        await step(rep, 'Сховище браузера (квота)', async () => {
            if (!(navigator.storage && navigator.storage.estimate)) return { value: 'API недоступне', status: 'info' };
            const e = await navigator.storage.estimate(); const p = e.quota ? e.usage / e.quota * 100 : 0;
            return { value: kb(e.usage) + ' із ' + kb(e.quota) + ' (' + p.toFixed(1) + '%)', status: p > 80 ? 'err' : p > 50 ? 'warn' : 'ok' };
        });
        await step(rep, 'localStorage', async () => {
            let b = 0, n = 0; const big = [];
            for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); const l = (k.length + (localStorage.getItem(k) || '').length) * 2; b += l; n++; big.push([k, l]); }
            big.sort((a, c) => c[1] - a[1]);
            return { value: n + ' ключів, ' + kb(b) + ' (ліміт ≈5 МБ)', status: b > 4.2 * 1048576 ? 'err' : b > 3 * 1048576 ? 'warn' : 'ok', detail: 'Найбільші: ' + big.slice(0, 3).map(x => x[0].replace(/^(skillhub_verif_|skillhub_pw_).*/, '$1*') + ' ' + kb(x[1])).join(', ') };
        });
        await step(rep, 'Кеш застосунку (Cache Storage)', async () => {
            if (!window.caches) return { value: 'недоступно', status: 'warn' };
            const names = (await caches.keys()).filter(k => k.indexOf('-' + REPO_KEY + '-') !== -1); let entries = 0;
            for (const n of names) entries += (await (await caches.open(n)).keys()).length;
            return { value: names.length + ' сховищ, ' + entries + ' файлів', status: names.length > 2 ? 'warn' : 'ok', detail: names.length > 2 ? 'Є застарілі кеші - натисніть «Оновити додаток і базу даних»' : '' };
        });
        await step(rep, 'Пам’ять JS / DOM', async () => {
            const m = performance.memory; const nodes = document.getElementsByTagName('*').length;
            if (!m) return { value: 'DOM-елементів ' + nodes + ' (heap недоступний у цьому браузері)', status: nodes > 6000 ? 'warn' : 'ok' };
            const p = m.usedJSHeapSize / m.jsHeapSizeLimit * 100;
            return { value: 'heap ' + kb(m.usedJSHeapSize) + ' із ' + kb(m.jsHeapSizeLimit) + ' (' + p.toFixed(1) + '%), DOM ' + nodes, status: p > 70 ? 'err' : p > 45 ? 'warn' : 'ok' };
        });

        rep.sec('Безпека даних на пристрої');
        await step(rep, 'Токен сесії', async () => {
            const inLocal = !!localStorage.getItem('skillhub_auth'), inSess = !!sessionStorage.getItem('skillhub_auth');
            return { value: inLocal ? 'зберігається на пристрої (режим «запам’ятати»)' : inSess ? 'лише на час сесії' : 'відсутній', status: 'info', detail: 'Значення токена не показується і не копіюється.' };
        });
        await step(rep, 'Застарілі облікові дані у сховищі', async () => {
            const bad = ['skillhub_edu_creds_old', 'skillhub_v6_cache'].filter(k => localStorage.getItem(k) != null);
            return { value: bad.length ? 'знайдено: ' + bad.join(', ') : 'немає', status: bad.length ? 'err' : 'ok', detail: bad.length ? 'Містять відкриті паролі - очистіть через «Оновити додаток і базу даних»' : '' };
        });
        await step(rep, 'Секрети у сховищі й на сторінці', async () => {
            const re = /\b\d{8,10}:[A-Za-z0-9_-]{30,}\b/; let hit = 0;
            for (let i = 0; i < localStorage.length; i++) { if (re.test(localStorage.getItem(localStorage.key(i)) || '')) hit++; }
            if (re.test(document.documentElement.innerHTML)) hit++;
            return { value: hit ? 'виявлено ' + hit + ' збігів (формат Telegram-токена)' : 'не виявлено', status: hit ? 'err' : 'ok' };
        });
        await step(rep, 'Захист звіту діагностики', async () => ({ value: 'доступ лише через сервер (роль Власник), без ПІБ/логінів/паролів/токенів', status: 'ok' }));

        rep.sec('Service Worker і файли');
        await step(rep, 'Service Worker', async () => {
            if (!('serviceWorker' in navigator)) return { value: 'не підтримується', status: 'err' };
            const reg = await navigator.serviceWorker.getRegistration();
            if (!reg) return { value: 'не зареєстрований', status: 'err' };
            const st = reg.active ? reg.active.state : 'немає активного';
            return { value: st + (navigator.serviceWorker.controller ? ', керує сторінкою' : ', не керує сторінкою'), status: reg.active && navigator.serviceWorker.controller ? 'ok' : 'warn', detail: reg.waiting ? 'Є нова версія, що очікує активації' : '' };
        });
        await step(rep, 'Цілісність офлайн-кешу', async () => {
            const v = window.verifyAppCache ? await window.verifyAppCache(25000) : null;
            if (!v) return { value: 'SW не відповів', status: 'warn' };
            return { value: 'файлів ' + v.total + ', відсутніх ' + v.missing + ', виправлено ' + v.fixed + ', залишилось ' + v.left, status: v.left > 0 ? 'err' : v.missing ? 'warn' : 'ok' };
        });
        await step(rep, 'Локальна копія Chart.js (офлайн-діаграми)', async () => {
            const r = await fetchTimed('js/vendor/chart.umd.js?d=' + Date.now());
            const real = r.ok && r.size > 50000;
            return { value: real ? 'є, ' + kb(r.size) : 'файл відсутній', status: real ? 'ok' : 'warn', detail: real ? '' : 'Діаграма Академії працює лише з інтернетом (через CDN). Додайте js/vendor/chart.umd.js — див. js/vendor/README.md' };
        });
        for (const f of files) {
            await step(rep, 'Файл ' + f, async () => {
                const r = await fetchTimed(f + (f.indexOf('?') < 0 ? '?d=' + Date.now() : ''));
                return { value: 'HTTP ' + r.status + ', ' + kb(r.size) + ', ' + r.total + ' мс', status: !r.ok ? 'err' : r.total > 2500 ? 'warn' : 'ok' };
            });
        }

        rep.sec('Сервер: з’єднання та швидкість читання');
        let catObj = null;
        await step(rep, 'Відповідь сервера (extras)', async () => {
            const r = await fetchTimed(API_URL + '?action=extras'); const j = JSON.parse(r.text);
            return { value: 'HTTP ' + r.status + ', ' + r.total + ' мс; версія скрипта ' + (j.serverRev != null ? j.serverRev : '?'), status: !r.ok ? 'err' : (j.serverRev || 0) < EXPECT_REV ? 'warn' : r.total > 3000 ? 'warn' : 'ok', detail: (j.serverRev || 0) < EXPECT_REV ? 'Розгорніть нову версію скрипта (потрібна ' + EXPECT_REV + ')' : '' };
        });
        await step(rep, 'Читання каталогу', async () => {
            const r = await fetchTimed(API_URL + '?action=catalog'); const t = performance.now(); catObj = JSON.parse(r.text); const pm = Math.round(performance.now() - t);
            const speed = r.total ? Math.round(r.size / 1024 / (r.total / 1000)) : 0;
            const age = catObj.generatedAt ? Math.round((Date.now() - catObj.generatedAt) / 1000) : null;
            const top = Object.keys(catObj).map(k => [k, JSON.stringify(catObj[k]).length]).sort((x, y) => y[1] - x[1]).slice(0, 3).map(x => x[0] + ' ' + kb(x[1])).join(', ');
            const fresh = age !== null && age < 20;
            return { value: kb(r.size) + ' за ' + r.total + ' мс (≈' + speed + ' КБ/с), розбір ' + pm + ' мс; ' + (fresh ? 'зібрано заново' : age !== null ? 'з кешу сервера, вік ' + (age < 120 ? age + ' с' : Math.round(age / 60) + ' хв') : ''), status: !r.ok ? 'err' : r.total > 9000 ? 'warn' : 'ok',
                detail: (r.total > 9000 ? (fresh ? 'Кеш був порожній — каталог збирався з таблиці. Увімкніть «⚙️ Налаштування → ⚡ Прискорити застосунок» (прогрів кешу кожні 5 хв). ' : 'Повільна передача великого файлу від Google. ') : '') + 'Найважче: ' + top };
        });
        await step(rep, 'Вміст каталогу', async () => {
            const c = catObj || {}; const svc = (c.categories || []).filter(x => x && (x.ua || x.name)).length;
            const ok = (c.categories || []).length > 0;
            return { value: 'категорій ' + (c.categories || []).length + ', послуг ' + svc + ', тарифів ' + (c.tariffs || []).length + ', резервів ' + (c.rezervyData || []).length + ', новин ' + (c.news || []).length, status: ok ? 'ok' : 'err' };
        });
        await step(rep, 'Локальний кеш каталогу', async () => {
            const t = performance.now(); const raw = localStorage.getItem('skillhub_v7_catalog'); if (!raw) return { value: 'порожній', status: 'warn' };
            JSON.parse(raw); return { value: kb(raw.length) + ', читання+розбір ' + Math.round(performance.now() - t) + ' мс', status: 'ok' };
        });

        rep.sec('Академія та синхронізація');
        await step(rep, 'Сесія Академії', async () => {
            const r = await window.Academy.diagPost('check_session', {});
            return { value: r && r.valid ? 'дійсна' : 'недійсна', status: r && r.valid ? 'ok' : 'err' };
        });
        await step(rep, 'Завантаження даних Академії', async () => {
            const t = performance.now(); const r = await window.Academy.diagPost('edu', {}); const ms = Math.round(performance.now() - t);
            if (!r || !r.success) return { value: 'помилка ' + (r && r.code), status: 'err' };
            const u = (r.educationData && r.educationData.users) || []; const g = u.filter(x => x.goals).length;
            return { value: 'співробітників ' + u.length + ', із цілями ' + g + ', курсів ' + ((r.educationData && r.educationData.courses) || []).length + '; ' + ms + ' мс', status: ms > 15000 ? 'warn' : 'ok', detail: ms > 4000 ? 'Повільно через порожній кеш сервера; наступні запити швидші (кеш прогрівається таймером)' : '' };
        });
        await step(rep, 'Черга відправки (outbox)', async () => {
            const n = window.Academy.outboxInfo().count;
            return { value: n ? n + ' не відправлено' : 'порожня', status: n ? 'warn' : 'ok', detail: n ? 'Дані чекають на мережу й будуть відправлені автоматично' : '' };
        });

        rep.sec('Продуктивність');
        await step(rep, 'Завантаження сторінки', async () => {
            const n = performance.getEntriesByType('navigation')[0]; if (!n) return { value: 'недоступно', status: 'info' };
            return { value: 'TTFB ' + Math.round(n.responseStart) + ' мс, DOM ' + Math.round(n.domContentLoadedEventEnd) + ' мс, load ' + Math.round(n.loadEventEnd) + ' мс', status: n.loadEventEnd > 6000 ? 'warn' : 'ok' };
        });
        await step(rep, 'Плавність інтерфейсу (FPS)', async () => {
            const fps = await new Promise(res => { let c = 0; const t0 = performance.now(); (function f() { c++; if (performance.now() - t0 < 700) requestAnimationFrame(f); else res(Math.round(c / ((performance.now() - t0) / 1000))); })(); });
            return { value: fps + ' кадрів/с', status: fps < 25 ? 'err' : fps < 45 ? 'warn' : 'ok' };
        });
        await step(rep, 'Швидкість JSON (1 МБ)', async () => {
            const o = { a: Array.from({ length: 12000 }, (_, i) => ({ id: i, n: 'Послуга ' + i, p: i * 1.5 })) };
            const t = performance.now(); const s = JSON.stringify(o); JSON.parse(s); const ms = Math.round(performance.now() - t);
            return { value: kb(s.length) + ' за ' + ms + ' мс', status: ms > 400 ? 'warn' : 'ok' };
        });
        await step(rep, 'Швидкість запису localStorage', async () => {
            const k = '__diag_probe'; const blob = 'x'.repeat(100 * 1024); const t = performance.now();
            try { localStorage.setItem(k, blob); localStorage.getItem(k); } finally { localStorage.removeItem(k); }
            const ms = Math.round(performance.now() - t); return { value: '100 КБ запис+читання за ' + ms + ' мс', status: ms > 150 ? 'warn' : 'ok' };
        });

        /* Сценарії: імітація дій користувача (стан інтерфейсу після кожного кроку відновлюється, меню не скидається) */
        rep.sec('Сценарії: як користується співробітник');
        const sleep = ms => new Promise(r => setTimeout(r, ms));
        const A = () => (window.__appDb ? window.__appDb() : {}) || {};
        const closeAll = () => { ['descModal', 'rezervItemModal'].forEach(m => { try { window.closeModalBase(m); } catch (e) {} }); };
        const badText = t => /undefined|NaN|\[object/.test(t);
        let rezItems = [];

        await step(rep, 'Пошук: введення запиту та підказки', async () => {
            const db = A(), inp = document.getElementById('catInput'), box = document.getElementById('customSuggestions');
            if (!inp || !box) return { value: 'поле пошуку не знайдено', status: 'err' };
            const src = (db.categories || []).map(c => c.ua).filter(Boolean)[0] || ((db.tariffs || [])[0] || {}).service || '';
            if (!src) return { value: 'каталог порожній', status: 'err' };
            const q = String(src).replace(/[^\wА-Яа-яІіЇїЄєҐґ ]/g, '').trim().slice(0, 6);
            const was = inp.value, wasDis = inp.disabled; inp.disabled = false;
            inp.value = q; inp.dispatchEvent(new Event('input', { bubbles: true }));
            const t = performance.now(); let n = 0;
            for (let i = 0; i < 12 && !n; i++) { await sleep(100); n = box.children.length; }
            const ms = Math.round(performance.now() - t), txt = box.innerText || '';
            inp.value = was; inp.dispatchEvent(new Event('input', { bubbles: true })); inp.disabled = wasDis; box.style.display = 'none';
            return { value: 'запит «' + q + '» → підказок: ' + n + ' за ' + ms + ' мс', status: n ? (badText(txt) ? 'warn' : 'ok') : 'err', detail: n ? '' : 'Пошук нічого не знайшов за назвою з каталогу' };
        });
        await step(rep, 'Пошук: новини, курси, пропозиції (всі джерела)', async () => {
            const db = A(); if (!window.SearchAll) return { value: 'модуль пошуку не завантажено', status: 'err' };
            const word = (((db.news || [])[0] || {}).text || ((db.serviceTalks || [])[0] || {}).product || 'новин').replace(/<[^>]*>/g, ' ').trim().split(/\s+/)[0] || 'новин';
            const r = window.SearchAll.find(word.slice(0, 5), db);
            return { value: 'запит «' + word.slice(0, 5) + '» → знайдено ' + r.length + ' додаткових результатів', status: 'ok' };
        });
        await step(rep, 'Картки рекомендованих сервісів (2 категорії)', async () => {
            const db = A(), cats = (db.categories || []).filter(c => c.ua).slice(0, 2); if (!cats.length) return { value: 'немає категорій', status: 'err' };
            const out = [];
            for (const c of cats) {
                window.openRezervItemModal(c.ua, 1000, c.ua, false); await sleep(350);
                const body = document.getElementById('rezervItemBody'), cards = body ? body.querySelectorAll('.service-card').length : 0;
                out.push(c.ua + ': ' + cards + ' карток' + (body && badText(body.innerText) ? ' (є undefined/NaN!)' : ''));
                closeAll(); await sleep(150);
            }
            const bad = out.some(x => /: 0 карток|NaN/.test(x));
            return { value: out.join('; '), status: bad ? 'warn' : 'ok', detail: bad ? 'У категорії немає рекомендованих сервісів або ціна не рахується' : '' };
        });
        await step(rep, 'Опис сервісу з фото (2 сервіси)', async () => {
            const db = A(), names = Object.keys(db.descriptions || {}).slice(0, 2); if (!names.length) return { value: 'описів немає', status: 'err' };
            const out = []; let warn = false;
            for (const n of names) {
                window.openModalBase('descModal', n, (db.serviceCodes || {})[n] || '', '', ''); await sleep(500);
                const b = document.getElementById('modalBody'), img = b && b.querySelector('.svc-hero img');
                const hasImg = !!window.serviceImageFor(n), okImg = !img || (img.complete && img.naturalWidth > 0);
                const len = b ? b.innerText.length : 0;
                if (!len || (hasImg && !okImg)) warn = true;
                out.push(n.slice(0, 28) + ': ' + (len ? 'опис ' + len + ' симв.' : 'порожньо') + (hasImg ? (okImg ? ', фото ✓' : ', фото НЕ завантажилось') : ', без фото'));
                closeAll(); await sleep(150);
            }
            return { value: out.join('; '), status: warn ? 'warn' : 'ok' };
        });
        await step(rep, 'Резерви: вибір магазину та коротка статистика', async () => {
            const db = A(), sel = document.getElementById('storeFilter'); rezItems = [];
            if (!sel || !(db.rezervyData || []).length) return { value: 'резервів немає', status: 'warn' };
            const cnt = {}; db.rezervyData.forEach(r => { cnt[r.store] = (cnt[r.store] || 0) + 1; });
            const store = Object.keys(cnt).filter(x => x && x !== 'Не вказано').sort((a, b) => cnt[b] - cnt[a])[0]; if (!store) return { value: 'магазини не визначено', status: 'warn' };
            const prev = sel.value; sel.value = store; window.renderRezervyList(); await sleep(200);
            const rows = document.querySelectorAll('#rezervyList .list-item').length, st = (document.getElementById('rezervyStats') || {}).style && document.getElementById('rezervyStats').style.display !== 'none' ? document.getElementById('rezervyStats') : null;
            rezItems = db.rezervyData.filter(r => r.store === store).slice(0, 3);
            const txt = st ? st.innerText.replace(/\s+/g, ' ') : '';
            sel.value = prev; window.renderRezervyList();
            return { value: store + ': ' + rows + ' позицій; ' + (txt || 'статистика не показана'), status: rows && st && !badText(txt) ? 'ok' : 'err', detail: rows === cnt[store] ? '' : 'Показано ' + rows + ' із ' + cnt[store] };
        });
        await step(rep, 'Резерви: відкриття 3 позицій і перевірка сервісів', async () => {
            if (!rezItems.length) return { value: 'немає позицій для перевірки', status: 'warn' };
            const out = []; let bad = false;
            for (const r of rezItems) {
                window.openRezervItemModal(r.cat, r.price, r.name, /уцінка/i.test(r.name)); await sleep(350);
                const body = document.getElementById('rezervItemBody'), cards = body ? body.querySelectorAll('.service-card').length : -1;
                const hasNaN = body ? badText(body.innerText) : false;
                if (cards < 1 || hasNaN) bad = true;
                out.push(r.name.slice(0, 22) + ': ' + (cards < 0 ? 'вікно не відкрилось' : cards + ' сервісів') + (hasNaN ? ' ⚠' : ''));
                closeAll(); await sleep(150);
            }
            return { value: out.join('; '), status: bad ? 'warn' : 'ok', detail: bad ? 'Категорії немає в каталозі або ціна сервісів не рахується' : '' };
        });
        await step(rep, 'SkillHUB: перевірка 2 посилань', async () => {
            const bt = (A().skillHubButtons || []).filter(b => /^https?:/i.test(String(b.link || '').trim())).slice(0, 2);
            if (!bt.length) return { value: 'кнопок із посиланнями немає', status: 'info' };
            const out = []; let bad = false;
            for (const b of bt) {
                const t = performance.now();
                try { await timeout(fetch(String(b.link).trim(), { mode: 'no-cors', cache: 'no-store' }), 8000, b.name); out.push(b.name + ': доступне, ' + Math.round(performance.now() - t) + ' мс'); }
                catch (e) { bad = true; out.push(b.name + ': НЕ відповідає'); }
            }
            return { value: out.join('; '), status: bad ? 'warn' : 'ok' };
        });
        await step(rep, 'Заміна продавця: списки форми', async () => {
            const r = await fetchTimed(API_URL + '?action=seller_form'); let j = {}; try { j = JSON.parse(r.text); } catch (e) {}
            const st = (j.stores || []).length, rs = (j.reasons || []).length;
            return { value: 'магазинів ' + st + ', причин ' + rs + ', ' + r.total + ' мс', status: st && rs ? 'ok' : 'err', detail: st && rs ? '' : 'Лист «Заміна продавця»: магазини в T:T, причини в U:U; або скрипт не оновлено' };
        });
        await step(rep, 'Заміна продавця: пробна заявка в Telegram', async () => {
            const r = await timeout(window.Academy.diagPost('diag_tg', { kind: 'seller' }), 30000, 'заявка');
            if (!r || r.code === 'forbidden') return { value: 'недоступно', status: 'err' };
            return { value: r.success ? 'надіслано в ' + r.sent + ' із ' + r.chats + ' чатів' : 'не надіслано', status: r.success ? 'ok' : 'err', detail: r.error || 'Без запису в таблицю, повідомлення позначене 🧪' };
        });
        await step(rep, 'Telegram-бот: тестове повідомлення', async () => {
            const r = await timeout(window.Academy.diagPost('diag_tg', { kind: 'bot' }), 30000, 'бот');
            if (!r) return { value: 'без відповіді', status: 'err' };
            if (r.code === 'forbidden') return { value: 'недоступно', status: 'err' };
            const parts = ['токен ' + (r.tokenSet ? 'є' : 'немає'), 'ключ ' + (r.keySet ? 'є' : 'немає'), r.bot ? 'бот ' + r.bot : '', 'доставлено ' + (r.sent || 0) + '/' + (r.chats || 0)].filter(Boolean);
            return { value: parts.join(', '), status: r.success && r.keySet ? 'ok' : r.success ? 'warn' : 'err', detail: r.error || (r.keySet ? '' : 'Не збережено BOT_KEY — бот не зможе читати таблицю') };
        });
        await step(rep, 'Налаштування: тема', async () => {
            const tg = document.getElementById('themeToggle'), root = document.documentElement; if (!tg) return { value: 'перемикач не знайдено', status: 'err' };
            const was = root.getAttribute('data-theme') || 'light', wasLS = localStorage.getItem('theme');
            tg.click(); await sleep(60); const now = root.getAttribute('data-theme'); tg.click(); await sleep(60);
            const back = root.getAttribute('data-theme') === was; if (wasLS !== null) localStorage.setItem('theme', wasLS);
            return { value: was + ' → ' + now + ' → ' + (back ? 'повернуто' : 'НЕ повернуто'), status: now !== was && back ? 'ok' : 'err' };
        });
        await step(rep, 'Налаштування: розмір тексту', async () => {
            const sl = document.getElementById('fontSizeSlider'); if (!sl || !window.updateFontScale) return { value: 'слайдер не знайдено', status: 'err' };
            const was = localStorage.getItem('skillhub_font_scale') || '1';
            window.updateFontScale('1.2'); await sleep(50); const applied = !!document.getElementById('dynamicFontScale'); window.updateFontScale(was);
            return { value: 'масштаб ' + was + ': застосування ' + (applied ? 'працює' : 'не працює'), status: applied ? 'ok' : 'err' };
        });
        await step(rep, 'Налаштування: обране та кнопки меню', async () => {
            let favs = []; try { favs = JSON.parse(localStorage.getItem('skillhub_favs') || '[]'); } catch (e) { return { value: 'пошкоджений список обраного', status: 'err' }; }
            const names = (A().skillHubButtons || []).map(b => b.name), orphan = favs.filter(f => !names.includes(f) && !document.querySelector('[data-func="' + f + '"]'));
            const rows = ['newsRow', 'diagRow', 'forceUpdateBtn'].filter(id => !document.getElementById(id));
            return { value: 'в обраному ' + favs.length + ', кнопок меню ' + names.length, status: orphan.length || rows.length ? 'warn' : 'ok', detail: (orphan.length ? 'Немає в меню: ' + orphan.join(', ') + '. ' : '') + (rows.length ? 'Немає елементів: ' + rows.join(', ') : '') };
        });
        await step(rep, 'Налаштування: service worker і кеш', async () => {
            const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration();
            const keys = window.caches ? await caches.keys() : [];
            return { value: reg ? (reg.active ? 'активний' : 'не активний') + ', кешів ' + keys.length : 'не зареєстровано', status: reg && reg.active ? 'ok' : 'warn' };
        });
        await step(rep, 'Академія продавця: актуальність даних', async () => {
            const r = await window.Academy.diagPost('edu', {}); if (!r || !r.success) return { value: 'помилка ' + (r && r.code), status: 'err' };
            const users = (r.educationData && r.educationData.users) || [], sellers = users.filter(u => /продав/i.test(u.role || ''));
            let local = null; try { local = eduDb && eduDb.users ? eduDb.users : null; } catch (e) {}
            const sumFacts = arr => arr.reduce((a, u) => a + GOAL_DEFS.reduce((b, d) => b + (Number((((u.goalsFact || u.goals) || {})[d.key] || {}).fact) || 0), 0), 0);
            const same = local ? (local.length === users.length && Math.round(sumFacts(local)) === Math.round(sumFacts(users))) : null;
            return { value: 'продавців ' + sellers.length + ' із ' + users.length + '; дані застосунку ' + (same === null ? 'ще не завантажені' : same ? 'збігаються з таблицею' : 'відстають від таблиці'), status: same === false ? 'warn' : 'ok', detail: same === false ? 'Потрібне оновлення (кнопка в кабінеті)' : '' };
        });
        await step(rep, 'Академія продавця: цілі та виконання', async () => {
            const r = await window.Academy.diagPost('edu', {}); if (!r || !r.success) return { value: 'помилка ' + (r && r.code), status: 'err' };
            const sellers = ((r.educationData && r.educationData.users) || []).filter(u => /продав/i.test(u.role || ''));
            let withGoals = 0, withFacts = 0, odd = 0, full = 0, rows = 0;
            sellers.forEach(u => {
                if (u.goals) withGoals++;
                const g = u.goals || u.goalsFact || {}; let any = false;
                GOAL_DEFS.forEach(d => {
                    const o = g[d.key]; if (!o) return; rows++;
                    if (o.fact !== null && o.fact !== undefined && o.fact !== '') any = true;
                    const done = o.done;
                    if (o.goal > 0 && o.fact != null && o.fact !== '' && (done == null || isNaN(done) || Math.abs(done - Math.round(o.fact / o.goal * 100)) > 1)) odd++;
                    if (done >= 100) full++;
                });
                if (any) withFacts++;
            });
            return { value: 'із цілями ' + withGoals + ', з фактом ' + withFacts + ', показників виконано на 100% ' + full + ', розбіжностей у % ' + odd, status: odd ? 'warn' : sellers.length && !withFacts ? 'warn' : 'ok', detail: odd ? 'Відсоток виконання не збігається з фактом/ціллю — перевірте формули в таблиці' : (sellers.length && !withFacts ? 'У продавців немає фактичних показників' : '') };
        });

        /* Сервер: результати його власної діагностики */
        rep.sec('Сервер: Google Apps Script і таблиця (' + (sv.diag.totalMs) + ' мс)');
        sv.diag.checks.forEach(c => { rep.add({ name: c.name, status: c.status, value: c.value, detail: c.detail, ms: c.ms }); });
        state.done = state.total; setProgress();

        rep.sec('Журнал помилок цієї сесії');
        const errs = (window.__errLog || []).slice(-30).reverse();
        if (!errs.length) rep.add({ name: 'Помилок JS не зафіксовано', status: 'ok', value: '0' });
        errs.forEach(e => rep.add({ name: '[' + e.kind + '] ' + e.msg, status: 'err', value: new Date(e.t).toLocaleTimeString('uk-UA'), detail: e.src }));
    }

    /* ---------- відображення ---------- */
    function summary() {
        const rows = state.rep.all(); const c = { ok: 0, warn: 0, err: 0, info: 0 }; rows.forEach(r => c[r.status] = (c[r.status] || 0) + 1);
        return c;
    }
    function reportText() {
        const rows = state.rep.all(); const c = summary(); let out = 'ДІАГНОСТИКА SkillHUB — ' + new Date().toLocaleString('uk-UA') + '\nУспішно: ' + c.ok + ' | Попередження: ' + c.warn + ' | Помилки: ' + c.err + '\n';
        let cur = ''; rows.forEach(r => { if (r.sec !== cur) { cur = r.sec; out += '\n== ' + cur + ' ==\n'; } out += '[' + ({ ok: 'OK', warn: 'ПОПЕРЕДЖЕННЯ', err: 'ПОМИЛКА', info: 'ІНФО' }[r.status]) + '] ' + r.name + ': ' + r.value + (r.ms != null ? ' (' + r.ms + ' мс)' : '') + (r.detail ? ' — ' + r.detail : '') + '\n'; });
        return out;
    }
    function rowHtml(r, i) {
        return '<div class="dg-row ' + r.status + '" data-i="' + i + '"><span class="dg-dot ' + (r.status === 'info' ? '' : r.status) + '"></span><div class="dg-n"><b>' + esc(r.name) + '</b>' + (r.detail ? '<small>' + esc(r.detail) + '</small>' : '') + '</div><div class="dg-v">' + esc(r.value) + (r.ms != null ? '<em>' + r.ms + ' мс</em>' : '') + '</div></div>';
    }
    function render() {
        if (!ov || !state) return;
        const c = summary(), run = state.running;
        const st = run ? ['run', 'Виконується перевірка…'] : c.err ? ['err', 'Виявлено помилки'] : c.warn ? ['warn', 'Є попередження'] : ['ok', 'Усе працює справно'];
        const body = ov.querySelector('.dg-body'); const flat = state.rep.all();
        const problems = flat.map((r, i) => Object.assign({ i: i }, r)).filter(r => r.status === 'err' || r.status === 'warn').sort((a, b) => (a.status === 'err' ? 0 : 1) - (b.status === 'err' ? 0 : 1));
        let h = '<div class="dg-sum"><div class="dg-state"><span class="dg-dot ' + st[0] + '"></span>' + st[1] + '</div><div class="dg-cnt"><div><b>' + c.ok + '</b><span>Успішно</span></div><div><b>' + c.warn + '</b><span>Увага</span></div><div><b>' + c.err + '</b><span>Помилки</span></div><div><b>' + flat.length + '</b><span>Перевірок</span></div></div>' + (run ? '<div class="dg-bar"><i style="width:' + Math.min(100, Math.round(state.done / state.total * 100)) + '%"></i></div><div class="dg-now"></div>' : '') + '</div>';
        h += '<div class="dg-btns"><button class="dg-btn" data-act="copyall"' + (run ? ' disabled' : '') + '>Копіювати звіт</button><button class="dg-btn sec" data-act="rerun"' + (run ? ' disabled' : '') + '>Запустити знову</button></div>';
        if (problems.length) {
            h += '<div class="dg-sec dg-errs"><h2><span>Потребує уваги (' + problems.length + ')</span></h2>' + problems.map(p => rowHtml(p, p.i)).join('') + '<div class="dg-hint">Торкніться рядка, щоб скопіювати текст помилки.</div></div>';
        }
        let idx = 0;
        state.rep.sections.forEach(s => { h += '<div class="dg-sec"><h2><span>' + esc(s.name) + '</span><span>' + s.rows.length + '</span></h2>' + s.rows.map(r => rowHtml(r, idx++)).join('') + '</div>'; });
        body.innerHTML = h;
        const sub = ov.querySelector('.dg-sub'); sub.textContent = 'Власник · ' + new Date().toLocaleString('uk-UA') + (run ? '' : ' · ' + Math.round((performance.now() - state.t0) / 100) / 10 + ' с');
    }
    function deny(msg) {
        state.running = false;
        ov.querySelector('.dg-body').innerHTML = '<div class="dg-deny">' + esc(red(msg)) + '</div><div class="dg-btns" style="margin-top:12px"><button class="dg-btn sec" data-act="rerun">Спробувати ще раз</button></div>';
    }

    async function start() {
        state = { rep: new Report(), running: true, done: 0, total: 40, t0: performance.now() };
        render();
        try { await runAll(state.rep); } catch (e) { state.rep.sec('Критична помилка'); state.rep.add({ name: 'Діагностика перервана', status: 'err', value: 'Помилка', detail: e.message }); }
        if (state.running !== false || state.rep.sections.length) { state.running = false; if (state.rep.sections.length) render(); }
    }

    function open() {
        if (ov) ov.remove();
        if (!document.getElementById('diagCss')) { const st = document.createElement('style'); st.id = 'diagCss'; st.textContent = CSS; document.head.appendChild(st); }
        ov = $('div'); ov.id = 'diagOv';
        ov.innerHTML = '<div class="dg-wrap"><div class="dg-top"><div><h1>Діагностика додатку</h1><div class="dg-sub"></div></div><button class="dg-x" data-act="close" aria-label="Закрити">✕</button></div><div class="dg-body"></div></div><div class="dg-toast"></div>';
        document.body.appendChild(ov); document.body.style.overflow = 'hidden';
        ov.addEventListener('click', e => {
            const a = e.target.closest('[data-act]'); const row = e.target.closest('.dg-row');
            if (a) {
                const k = a.dataset.act;
                if (k === 'close') { ov.remove(); ov = null; document.body.style.overflow = ''; }
                else if (k === 'rerun') start();
                else if (k === 'copyall') copy(reportText());
            } else if (row && (row.classList.contains('err') || row.classList.contains('warn'))) {
                const r = state.rep.all()[+row.dataset.i]; if (r) copy('[' + r.sec + '] ' + r.name + ': ' + r.value + (r.detail ? ' — ' + r.detail : ''));
            }
        });
        start();
    }
    window.Diag = { open: open };
})();
