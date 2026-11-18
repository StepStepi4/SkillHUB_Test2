/* Academy: вітальне вікно з дашбордом, велике привітання про нову ачивку, стан офлайн-кешу.
   Підключається після extras.js (спільна глобальна область видимості з academy.js). */
(function () {
    const esc = s => escapeHTMLAttr(s);
    const $ = id => document.getElementById(id);
    const me = () => (eduDb && eduDb.users && currentUser) ? eduDb.users.find(u => lowLogin(u.login) === lowLogin(currentUser)) : null;
    const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };

    /* ---------------- Дані для дашборда ---------------- */
    function courseRows(u) {
        const res = u.results || {};
        return (u.assigned || []).map(name => {
            const raw = res[name] || res[getCleanName(name)];
            const p = parseTestResultString(raw);
            const state = p.score >= 80 ? 'done' : (p.attempts > 0 || p.score > 0) ? 'prog' : 'new';
            return { name: cleanCourseTitle(name), raw: name, score: p.score, attempts: p.attempts, state };
        });
    }
    function goalRows(u) {
        const g = (u && u.goals) || {};
        return GOAL_DEFS.filter(d => g[d.key] && g[d.key].goal !== null && g[d.key].goal !== undefined && g[d.key].goal !== '')
            .map(d => { const o = g[d.key]; const done = (o.done === null || o.done === undefined || o.done === '') ? null : Number(o.done);
                return { key: d.key, label: d.short, unit: d.unit, goal: o.goal, fact: o.fact, pct: done === null || isNaN(done) ? 0 : Math.max(0, done), has: done !== null && !isNaN(done) }; });
    }
    function deadlineText(u) {
        const ms = computeRemainingDeadlineMs(u);
        if (ms === null || ms === undefined) return null;
        if (ms <= 0) return { txt: 'Термін минув', bad: true };
        const d = Math.floor(ms / 864e5), h = Math.floor(ms % 864e5 / 36e5);
        return { txt: d > 0 ? `Залишилось ${d} дн ${h} год` : `Залишилось ${h} год`, bad: ms < 864e5 };
    }
    const ring = (pct, label, sub, cls) => {
        const p = Math.min(100, Math.round(pct));
        return `<div class="wl-ring ${cls || ''}"><div class="wl-ring-c" style="--p:${p}"><span>${Math.round(pct)}%</span></div><div class="wl-ring-t"><b>${esc(label)}</b><small>${sub}</small></div></div>`;
    };

    /* ---------------- Вітальне вікно ---------------- */
    function availableGroups(u) {
        try {
            if (detectRoleGroup(u.role) === 'guest') return [];
            const mine = new Set((u.assigned || []).map(n => getCleanName(n))), seen = new Set(), out = [];
            (eduDb.courses || []).forEach(c => {
                const title = cleanCourseTitle(c.product), k = getCleanName(title);
                if (k && !mine.has(k) && !seen.has(k)) { seen.add(k); out.push(title); }
            });
            return out;
        } catch (e) { return []; }
    }
    function buildWelcome(u) {
        const courses = courseRows(u), goals = goalRows(u), dl = deadlineText(u);
        const first = extractFirstNameCapitalized(u);
        const hour = new Date().getHours();
        const hi = hour < 6 ? 'Доброї ночі' : hour < 12 ? 'Доброго ранку' : hour < 18 ? 'Доброго дня' : 'Доброго вечора';
        const total = courses.length, done = courses.filter(c => c.state === 'done').length, prog = total ? done / total * 100 : 0;

        // Цілі на сьогодні — окремі блоки
        const T = window.ExtrasToday ? window.ExtrasToday.goals(u) : { items: [] }, TC = window.ExtrasToday ? window.ExtrasToday.courses(u) : null;
        const tiles = T.items.map(i => `<div class="wl-tile"><b>${fmtNum(i.val)}</b><span>${esc(i.label)}</span></div>`);
        if (TC) tiles.push(`<div class="wl-tile course"><b>${fmtNum(TC.per)}</b><span>Курси</span></div>`);
        const todayHtml = tiles.length ? `<div class="wl-sec">Ціль на сьогодні</div><div class="wl-tiles">${tiles.join('')}</div>` : '';

        const goalsHtml = goals.length
            ? `<div class="wl-sec">Мої цілі</div><div class="wl-rings">${goals.map(g => ring(g.pct, g.label,
                g.has ? `${fmtNum(g.fact)}${g.unit} з ${fmtNum(g.goal)}${g.unit}` : `ціль ${fmtNum(g.goal)}${g.unit}`, g.pct >= 100 ? 'ok' : (g.has && g.pct < 50 ? 'low' : ''))).join('')}</div>`
            : '<div class="wl-sec">Мої цілі</div><div class="wl-empty">Цілі ще не призначені.</div>';

        const sorted = courses.slice().sort((a, b) => (a.state === 'done') - (b.state === 'done') || (a.state === 'prog' ? 0 : 1) - (b.state === 'prog' ? 0 : 1));
        const coursesHtml = courses.length
            ? `<div class="wl-sec">Призначені курси${dl ? `<span class="wl-dl ${dl.bad ? 'bad' : ''}">${esc(dl.txt)}</span>` : ''}</div>
               <div class="wl-prog"><div style="width:${Math.round(prog)}%"></div></div>
               <div class="wl-courses">${sorted.map(c => `<div class="wl-course ${c.state}"><span class="wl-dot"></span><span class="wl-cn">${esc(c.name)}</span><span class="wl-cs">${c.state === 'done' ? c.score + '%' : c.state === 'prog' ? 'спроб: ' + c.attempts : 'нове'}</span></div>`).join('')}</div>`
            : '<div class="wl-sec">Призначені курси</div><div class="wl-empty">Курсів поки немає.</div>';
        const av = availableGroups(u);
        const availHtml = av.length ? `<div class="wl-sec">Доступні курси</div><div class="wl-courses">${av.map(g => `<div class="wl-course avail"><span class="wl-dot"></span><span class="wl-cn">${esc(g)}</span></div>`).join('')}</div>` : '';

        return `<div class="wl-hero"><div class="wl-hi">${hi},</div><div class="wl-name">${esc(first)}!</div></div>${todayHtml}${goalsHtml}${coursesHtml}${availHtml}`;
    }
    function openWelcome(force) {
        const u = me(); if (!u) return;
        closeWelcome(true);
        const o = document.createElement('div'); o.id = 'welcomeOverlay'; o.className = 'wl-overlay';
        o.innerHTML = `<div class="wl-box"><button class="wl-x" aria-label="Закрити">✕</button><div class="wl-scroll">${buildWelcome(u)}</div>
            <div class="wl-foot"><button class="btn btn-primary wl-go">До кабінету</button></div></div>`;
        o.addEventListener('click', e => { if (e.target === o || e.target.closest('.wl-x') || e.target.closest('.wl-go')) closeWelcome(); });
        document.body.appendChild(o); requestAnimationFrame(() => o.classList.add('show'));
        try { sessionStorage.setItem('skillhub_welcome_' + lowLogin(u.login), '1'); } catch (e) {}
    }
    function closeWelcome(quick) {
        const o = $('welcomeOverlay'); if (!o) return;
        if (quick) { o.remove(); return; }
        o.classList.remove('show'); setTimeout(() => o.remove(), 250);
        setTimeout(celebrate, 400);
    }
    window.openWelcome = openWelcome;

    // Один раз за сеанс після входу / автозапуску з кешу
    const _stmc = switchToMyCabinet;
    switchToMyCabinet = function () {
        _stmc.apply(this, arguments);
        const u = me(); if (!u) return;
        let seen = false; try { seen = !!sessionStorage.getItem('skillhub_welcome_' + lowLogin(u.login)); } catch (e) {}
        try { celebrate(); } catch (e) {}
        if (!seen && !isTestActive && !window.__noWelcome) setTimeout(() => { if (currentUser && !$('welcomeOverlay')) openWelcome(); }, 250);
        injectDashBtn(); syncChip();
    };

    // Кнопка «Мій дашборд» у режимі «Цілі»
    function injectDashBtn() {
        const top = document.querySelector('#goalsBlock .goal-top');
        if (!top || top.querySelector('.goal-dash')) return;
        const b = document.createElement('button'); b.type = 'button'; b.className = 'goal-dash'; b.textContent = 'Мій дашборд';
        b.onclick = () => openWelcome(true); top.insertBefore(b, top.firstChild);
    }
    const _rg2 = renderGoals;
    renderGoals = function (u) { _rg2(u); injectDashBtn(); };

    /* ---------------- Привітання про нову ачивку ---------------- */
    const seenKey = u => 'skillhub_ach_cele_' + lowLogin(u.login);
    const codes = u => String((u && u.achievements) || '').split(',').map(s => s.trim()).filter(Boolean);
    let celebrating = false, opening = false;
    function celebrate() {
        if (celebrating || isTestActive || !currentUser || windowViewingEmployee) return;
        if (!opening && !(window.Academy && window.Academy.isOpen)) return;
        const u = me(); if (!u) return;
        const now = codes(u), raw = ls.get(seenKey(u));
        if (raw === null) { ls.set(seenKey(u), JSON.stringify(now)); return; }   // перший запуск на пристрої: нічого не показуємо
        let seen = []; try { seen = JSON.parse(raw) || []; } catch (e) {}
        const fresh = now.filter(c => !seen.includes(c));
        if (fresh.length) showAch(fresh, u);
    }
    function achHTML(a, left) {
        return `<div class="ac-top">Вітаємо! Нова відзнака</div><div class="ac-glow"></div>
            <img class="ac-img" src="assets/achievements/${esc(a.code)}.webp" onerror="this.src='assets/icons/ui/medal.svg'" alt="">
            <div class="ac-name">${esc(a.name)}</div><div class="ac-desc">${esc(a.description || '')}</div>
            ${left > 0 ? `<div class="ac-more">Ще відзнак: ${left}</div>` : ''}
            <button class="btn btn-primary ac-ok">${left > 0 ? 'Дякую! Далі' : 'Дякую!'}</button>`;
    }
    function showAch(list, u) {
        celebrating = true;
        const o = document.createElement('div'); o.id = 'achCele'; o.className = 'ac-overlay show';   // без затримок: одразу видно
        const conf = Array.from({ length: 28 }, () => `<i style="left:${Math.random() * 100}%;animation-delay:${(Math.random() * 1).toFixed(2)}s;background:hsl(${Math.round(Math.random() * 360)},85%,60%);--r:${Math.round(Math.random() * 360)}deg"></i>`).join('');
        o.innerHTML = `<div class="ac-conf">${conf}</div><div class="ac-box"></div>`;
        const box = o.querySelector('.ac-box');
        let i = 0;
        const paint = () => {
            const code = list[i], a = (globalAchievements || []).find(x => String(x.code).trim() === code) || { code: code, name: 'Нова відзнака', description: '' };
            box.innerHTML = achHTML(a, list.length - i - 1);
            box.classList.remove('swap'); void box.offsetWidth; box.classList.add('swap');
            box.querySelector('.ac-ok').onclick = () => {
                let seen = []; try { seen = JSON.parse(ls.get(seenKey(u)) || '[]') || []; } catch (e) {}
                if (seen.indexOf(code) < 0) seen.push(code); ls.set(seenKey(u), JSON.stringify(seen));
                if (++i < list.length) { paint(); refreshBadge(); return; }          // наступна відзнака - відразу, без паузи
                o.remove(); celebrating = false; refreshBadge(); setTimeout(celebrate, 0);
            };
        };
        paint(); document.body.appendChild(o);
        try { navigator.vibrate && navigator.vibrate([60, 40, 60]); } catch (e) {}
    }
    setInterval(celebrate, 4000);
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) return;
        if (window.Academy && window.Academy.isOpen && navigator.onLine && currentUser) { Promise.resolve(fetchFreshDataSilent()).then(() => celebrate()); celebrate(); }
        else bgPoll();
    });
    const _open = window.Academy.open;
    window.Academy.open = async function () { opening = true; try { return await _open.apply(this, arguments); } finally { opening = false; celebrate(); } };
    const _cna = checkNewAchievements;
    checkNewAchievements = function (u) { _cna.apply(this, arguments); celebrate(); };

    /* ---------------- Стан синхронізації / офлайн-кеш ---------------- */
    const TS = 'skillhub_edu_ts';
    function fmtTs() {
        const t = parseInt(ls.get(TS), 10); if (!t) return '';
        const d = new Date(t), p = n => String(n).padStart(2, '0');
        const same = new Date().toDateString() === d.toDateString();
        return (same ? 'сьогодні ' : p(d.getDate()) + '.' + p(d.getMonth() + 1) + ' ') + p(d.getHours()) + ':' + p(d.getMinutes());
    }
    let state = 'idle';   // idle | sync | ok | off | fail
    function syncChip() {
        return;
        let c = $('eduSyncChip');
        const host = $('userWelcome') && $('userWelcome').parentNode;
        if (!c && host) { c = document.createElement('div'); c.id = 'eduSyncChip'; c.className = 'sync-chip'; host.appendChild(c); }
        if (!c) return;
        let st = state;
        if (!navigator.onLine) st = 'off';
        let pend = 0; try { pend = window.Academy.outboxInfo().count; } catch (e) {}
        const ts = fmtTs();
        const map = {
            off: ['off', 'Офлайн' + (ts ? ' · дані на ' + ts : '') + (pend ? ' · очікує відправки: ' + pend : '')],
            sync: ['sync', 'Оновлення…'], ok: ['ok', 'Дані оновлено'], fail: ['off', 'Сервер недоступний' + (ts ? ' · дані на ' + ts : '')],
            idle: pend ? ['sync', 'Відправляємо зміни…'] : ['idle', '']
        };
        const [cls, txt] = map[st] || map.idle;
        c.className = 'sync-chip ' + cls + (txt ? ' show' : ''); c.textContent = txt;
    }
    const _afe = applyEduData;
    applyEduData = function (d) { _afe.apply(this, arguments); ls.set(TS, String(Date.now())); };
    const _ffd = fetchFreshDataSilent;
    fetchFreshDataSilent = async function () {
        state = 'sync'; syncChip();
        let r; try { r = await _ffd.apply(this, arguments); } catch (e) { r = 'fail'; }
        state = r === 'ok' ? 'ok' : (r === 'offline' ? 'off' : r === 'fail' ? 'fail' : 'idle'); syncChip();
        if (state === 'ok') setTimeout(() => { if (state === 'ok') { state = 'idle'; syncChip(); } }, 2500);
        return r;
    };
    window.addEventListener('offline', syncChip); window.addEventListener('skillhub-outbox', syncChip);
    window.addEventListener('online', () => { syncChip(); if (currentUser && window.Academy && window.Academy.isOpen) setTimeout(() => fetchFreshDataSilent(), 800); });
    setInterval(syncChip, 30000);

    /* ---------------- Події: червона крапка з цифрою на «Академія» ---------------- */
    const K = (n, u) => 'skillhub_seen_' + n + '_' + lowLogin(u.login);
    const goalSig = u => JSON.stringify(GOAL_DEFS.map(d => { const o = ((u && u.goals) || {})[d.key] || {}; return o.goal == null ? '' : o.goal; }));
    function computeEvents(u) {
        if (!u) return 0;
        let n = 0;
        // ачивки
        const rawA = ls.get(seenKey(u));
        if (rawA !== null) { let seen = []; try { seen = JSON.parse(rawA) || []; } catch (e) {} n += codes(u).filter(c => !seen.includes(c)).length; }
        // курси
        const asg = (u.assigned || []).map(x => getCleanName(x)), rawC = ls.get(K('assigned', u));
        if (rawC === null) ls.set(K('assigned', u), JSON.stringify(asg));
        else { let seen = []; try { seen = JSON.parse(rawC) || []; } catch (e) {} n += asg.filter(c => !seen.includes(c)).length; }
        // цілі
        const sig = goalSig(u), rawG = ls.get(K('goals', u));
        if (rawG === null) ls.set(K('goals', u), sig); else if (rawG !== sig && sig !== goalSig({})) n += 1;
        return n;
    }
    function markSeen(u) {
        ls.set(K('assigned', u), JSON.stringify((u.assigned || []).map(x => getCleanName(x)))); ls.set(K('goals', u), goalSig(u));
    }
    function paintBadge(n) {
        window._eduEvents = n;
        document.querySelectorAll('.nav-academy').forEach(b => {
            let el = b.querySelector('.evt-badge');
            if (!n) { if (el) el.remove(); return; }
            if (!el) { el = document.createElement('span'); el.className = 'evt-badge'; b.appendChild(el); }
            el.textContent = n > 9 ? '9+' : String(n);
        });
        try { document.dispatchEvent(new Event('skillhub-badge')); } catch (e) {}
    }
    let cachedUser = null;
    async function refreshBadge() {
        let data = null, login = null;
        try { const a = readAuth(); login = a && a.login; } catch (e) {}
        if (!login) { paintBadge(0); return; }
        let u = (eduDb && eduDb.users) ? eduDb.users.find(x => lowLogin(x.login) === lowLogin(login)) : null;
        if (!u) { try { data = await eduLoadCache(); u = data && data.educationData.users.find(x => lowLogin(x.login) === lowLogin(login)); } catch (e) {} }
        if (u && !globalAchievements.length && data) globalAchievements = data.achievementData || [];
        cachedUser = u || null;
        // Якщо кабінет відкритий і користувач його бачить - це вже не «подія»
        if (u && window.Academy && window.Academy.isOpen && !windowViewingEmployee && !$('welcomeOverlay') && lowLogin(currentUser) === lowLogin(u.login)) markSeen(u);
        paintBadge(computeEvents(u));
    }
    window.refreshEduBadge = refreshBadge;
    // фонове опитування сервера, коли Академія закрита
    let bgBusy = false, lastBg = 0;
    async function bgPoll() {
        if (bgBusy || !navigator.onLine || document.hidden || (window.Academy && window.Academy.isOpen)) { refreshBadge(); return; }
        if (Date.now() - lastBg < 60000) { refreshBadge(); return; }
        const a = (function () { try { return readAuth(); } catch (e) { return null; } })();
        if (!a) { paintBadge(0); return; }
        bgBusy = true; lastBg = Date.now();
        try {
            const pend = outboxRead().some(x => x.actor === lowLogin(a.login));
            const d = await apiPost({ action: 'edu', login: a.login, token: a.token }, 15000);
            if (d && d.success && d.educationData && d.educationData.users && !pend && !(window.Academy && window.Academy.isOpen)) {
                eduDb = d.educationData; globalAchievements = d.achievementData || [];
                window.fullData = { educationData: d.educationData, achievementData: globalAchievements, me: d.me || null };
                eduSaveCache(JSON.stringify(window.fullData));
            }
        } catch (e) {} finally { bgBusy = false; }
        refreshBadge();
    }
    window.addEventListener('load', () => setTimeout(bgPoll, 1500));
    window.addEventListener('online', () => setTimeout(bgPoll, 1000));
    setInterval(bgPoll, 120000);
    setInterval(refreshBadge, 5000);
    const _fn = fetchFreshDataSilent;
    let _retry = 0;
    fetchFreshDataSilent = async function () {
        const r = await _fn.apply(this, arguments);
        refreshBadge();
        // свіжі дані прийшли, поки відкрите вітальне вікно - оновлюємо його вміст на місці
        const o = $('welcomeOverlay'), u = me();
        if (r === 'ok' && o && u) { const sc = o.querySelector('.wl-scroll'), top = sc.scrollTop; sc.innerHTML = buildWelcome(u); sc.scrollTop = top; }
        // тихий повтор при збої мережі/сервера (до 3 разів із наростаючою паузою)
        if (r === 'fail' && currentUser && window.Academy && window.Academy.isOpen && navigator.onLine && _retry < 3) { _retry++; setTimeout(() => fetchFreshDataSilent(), 3000 * _retry); }
        if (r === 'ok') _retry = 0;
        return r;
    };

    /* ---------------- Вхід через Telegram ---------------- */
    window.toggleTgLogin = function () {
        const p = $('tgPanel'); if (!p) return;
        const open = p.style.display === 'none'; p.style.display = open ? 'block' : 'none';
        if (open) setTimeout(() => { const i = $('tgCodeInput'); i && i.focus(); }, 50);
    };
    window.handleTgLogin = async function () {
        const btn = $('tgSubmitBtn'), inp = $('tgCodeInput'), err = $('errorMsg');
        const code = String(inp.value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (code.length !== 8) { showLoginError('Введіть 8-значний код з бота'); return; }
        if (!navigator.onLine) { showLoginError('Для входу за кодом потрібен інтернет.'); return; }
        btn.disabled = true; btn.innerText = 'ВХІД...'; err.style.display = 'none';
        try {
            const r = await apiPost({ action: 'tg_login', code: code }, 20000);
            if (r && r.success && r.me) {
                writeAuth({ login: r.me.login, token: r.token }, $('rememberMe').checked);
                applyEduData(r);
                const user = eduDb.users.find(u => lowLogin(u.login) === lowLogin(r.me.login));
                currentUser = r.me.login; windowUserRole = detectRoleGroup(user ? user.role : r.me.role); windowViewingEmployee = null; pendingLogin = null;
                inp.value = '';
                switchToMyCabinet(); flushOutbox();
                return;
            }
            const m = {
                bad_code: 'Невірний код. Перевірте й спробуйте ще раз.', code_expired: 'Термін дії коду минув. Отримайте новий у боті.',
                session_active: 'Ви вже увійшли на іншому пристрої. Вийдіть там або натисніть у боті «Скинути сесію».',
                blocked: 'Доступ заблоковано. Зверніться до власника додатка.', locked: 'Забагато спроб. Спробуйте через ' + ((r && r.minutes) || 10) + ' хв.',
                busy: 'Сервер зайнятий. Спробуйте за кілька секунд.'
            };
            showLoginError(m[r && r.code] || 'Не вдалося увійти. Спробуйте ще раз.');
        } catch (e) { showLoginError('Немає зв’язку з сервером. Спробуйте ще раз.'); }
        finally { btn.disabled = false; btn.innerText = 'УВІЙТИ ЗА КОДОМ'; }
    };
})();
