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
    function buildWelcome(u) {
        const m = computeUserMetrics(u), courses = courseRows(u), goals = goalRows(u), dl = deadlineText(u);
        const first = extractFirstNameCapitalized(u);
        const hour = new Date().getHours();
        const hi = hour < 6 ? 'Доброї ночі' : hour < 12 ? 'Доброго ранку' : hour < 18 ? 'Доброго дня' : 'Доброго вечора';
        const total = m.totalAssigned, done = m.completed;
        const prog = total ? done / total * 100 : 0;

        const kpi = `<div class="wl-kpi">
            <div><b>${total}</b><small>Призначено</small></div>
            <div><b>${done}</b><small>Пройдено</small></div>
            <div><b>${m.remaining}</b><small>Залишилось</small></div>
            <div><b>${esc(m.avgScoreFormatted)}</b><small>Середній бал</small></div></div>`;

        const goalsHtml = goals.length
            ? `<div class="wl-sec">Мої цілі</div><div class="wl-rings">${goals.map(g => ring(g.pct, g.label,
                g.has ? `${fmtNum(g.fact)}${g.unit} з ${fmtNum(g.goal)}${g.unit}` : `ціль ${fmtNum(g.goal)}${g.unit}`, g.pct >= 100 ? 'ok' : (g.has && g.pct < 50 ? 'low' : ''))).join('')}</div>`
            : '<div class="wl-sec">Мої цілі</div><div class="wl-empty">Цілі ще не призначені. Вони з’являться тут, коли керівник їх задасть.</div>';

        const todo = courses.filter(c => c.state !== 'done').sort((a, b) => (a.state === 'prog' ? 0 : 1) - (b.state === 'prog' ? 0 : 1));
        const coursesHtml = courses.length
            ? `<div class="wl-sec">Курси${dl ? `<span class="wl-dl ${dl.bad ? 'bad' : ''}">${esc(dl.txt)}</span>` : ''}</div>
               <div class="wl-prog"><div style="width:${Math.round(prog)}%"></div></div>
               <div class="wl-courses">${courses.map(c => `<div class="wl-course ${c.state}"><span class="wl-dot"></span><span class="wl-cn">${esc(c.name)}</span><span class="wl-cs">${c.state === 'done' ? c.score + '%' : c.state === 'prog' ? 'спроб: ' + c.attempts : 'нові'}</span></div>`).join('')}</div>`
            : '<div class="wl-sec">Курси</div><div class="wl-empty">Курсів поки немає.</div>';

        const what = todo.length
            ? `<div class="wl-sec">Що вчити зараз</div><div class="wl-next">${todo.slice(0, 3).map((c, i) => `<div><span>${i + 1}</span>${esc(c.name)}</div>`).join('')}${todo.length > 3 ? `<small>і ще ${todo.length - 3}</small>` : ''}</div>`
            : (courses.length ? '<div class="wl-sec">Що вчити зараз</div><div class="wl-empty ok">Усі курси пройдено — так тримати!</div>' : '');

        const guide = `<div class="wl-sec">Як проходити</div><ol class="wl-how">
            <li>Відкрийте курс у вкладці «Навчання» та уважно прочитайте матеріал.</li>
            <li>Натисніть «Пройти тест»: на кожне питання <b>35 секунд</b>, прохідний бал — <b>80%</b>.</li>
            <li>Не згортайте додаток і не перемикайтесь під час тесту — спроба буде скасована.</li>
            <li>Не вдалося з першого разу — перечитайте теорію й повторіть тест.</li></ol>`;

        return `<div class="wl-hero"><div class="wl-hi">${hi},</div><div class="wl-name">${esc(first)}!</div><div class="wl-role">${esc(u.role || '')}</div></div>
            ${kpi}${goalsHtml}${coursesHtml}${what}${guide}`;
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
    let celebrating = false;
    function celebrate() {
        if (celebrating || isTestActive || $('welcomeOverlay') || !currentUser || windowViewingEmployee) return;
        if (!window.Academy || !window.Academy.isOpen) return;
        const u = me(); if (!u) return;
        const now = codes(u), raw = ls.get(seenKey(u));
        if (raw === null) { ls.set(seenKey(u), JSON.stringify(now)); return; }   // перший запуск на пристрої: нічого не показуємо
        let seen = []; try { seen = JSON.parse(raw) || []; } catch (e) {}
        const fresh = now.filter(c => !seen.includes(c));
        if (!fresh.length) return;
        showAch(fresh, u);
    }
    function showAch(list, u) {
        celebrating = true;
        const code = list[0];
        const a = (globalAchievements || []).find(x => String(x.code).trim() === code) || { code: code, name: 'Нова відзнака', description: '' };
        const o = document.createElement('div'); o.id = 'achCele'; o.className = 'ac-overlay';
        const conf = Array.from({ length: 28 }, (_, i) => `<i style="left:${Math.random() * 100}%;animation-delay:${(Math.random() * 1.2).toFixed(2)}s;background:hsl(${Math.round(Math.random() * 360)},85%,60%);--r:${Math.round(Math.random() * 360)}deg"></i>`).join('');
        o.innerHTML = `<div class="ac-conf">${conf}</div><div class="ac-box">
            <div class="ac-top">Вітаємо! Нова відзнака</div>
            <div class="ac-glow"></div><img class="ac-img" src="assets/achievements/${esc(a.code)}.webp" onerror="this.src='assets/icons/ui/medal.svg'" alt="">
            <div class="ac-name">${esc(a.name)}</div><div class="ac-desc">${esc(a.description || '')}</div>
            ${list.length > 1 ? `<div class="ac-more">і ще відзнак: ${list.length - 1}</div>` : ''}
            <button class="btn btn-primary ac-ok">${list.length > 1 ? 'Далі' : 'Дякую!'}</button></div>`;
        o.querySelector('.ac-ok').onclick = () => {
            let seen = []; try { seen = JSON.parse(ls.get(seenKey(u)) || '[]') || []; } catch (e) {}
            if (seen.indexOf(code) < 0) seen.push(code); ls.set(seenKey(u), JSON.stringify(seen));
            o.classList.remove('show'); setTimeout(() => { o.remove(); celebrating = false; setTimeout(celebrate, 200); }, 250);
        };
        document.body.appendChild(o); requestAnimationFrame(() => o.classList.add('show'));
        try { navigator.vibrate && navigator.vibrate([60, 40, 60]); } catch (e) {}
    }
    setInterval(celebrate, 4000);
    const _cna = checkNewAchievements;
    checkNewAchievements = function (u) { _cna.apply(this, arguments); setTimeout(celebrate, 300); };

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
})();
