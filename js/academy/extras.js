/* Додаткові функції Академії: усний залік, «Сьогодні», зведення команди, масові дії, підсумок тижня, журнал дій.
   Підключається після academy.js (спільна глобальна область видимості). */
(function () {
    const ORAL = [
        { v: 'Успішно здав',     cls: 'ok'   },
        { v: 'Потрібно вивчити', cls: 'warn' },
        { v: 'Не здав',          cls: 'bad'  }
    ];
    const esc = s => escapeHTMLAttr(s);
    const canManage = () => windowUserRole === 'owner' || windowUserRole === 'manager';
    const scope = () => { try { return getAccessibleEmployeesList() || []; } catch (e) { return []; } };
    const toast = msg => {
        let t = document.getElementById('exToast');
        if (!t) { t = document.createElement('div'); t.id = 'exToast'; t.className = 'ex-toast'; document.body.appendChild(t); }
        t.textContent = msg; t.classList.add('show');
        clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2200);
    };
    function copyText(txt) {
        const done = () => toast('Скопійовано');
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, fallback);
        else fallback();
        function fallback() {
            const ta = document.createElement('textarea'); ta.value = txt; ta.style.cssText = 'position:fixed;opacity:0';
            document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (e) {} ta.remove();
        }
    }
    function sheet(id, title, bodyHtml, foot) {
        let m = document.getElementById(id); if (m) m.remove();
        m = document.createElement('div'); m.id = id; m.className = 'ex-sheet';
        m.innerHTML = `<div class="ex-sheet-box"><div class="ex-sheet-head"><b>${title}</b><button class="ex-x" aria-label="Закрити">✕</button></div>
            <div class="ex-sheet-body">${bodyHtml}</div>${foot ? `<div class="ex-sheet-foot">${foot}</div>` : ''}</div>`;
        m.addEventListener('click', e => { if (e.target === m || e.target.classList.contains('ex-x')) m.remove(); });
        document.body.appendChild(m);
        return m;
    }

    /* ---------- Усний залік ---------- */
    function oralClass(v) { const o = ORAL.find(x => x.v === v); return o ? o.cls : ''; }
    function setOral(users, value) {
        users.forEach(u => {
            enqueue({ action: 'set_oral', targetLogin: u.login, value: value });
            u.oralExam = value;
            const d = eduDb.users.find(x => x.login === u.login); if (d) d.oralExam = value;
        });
    }
    function renderOralBtn() {
        const bar = document.querySelector('#viewingEmployeeBanner .banner-actions');
        if (!bar) return;
        let b = document.getElementById('oralBtn');
        if (!b) {
            b = document.createElement('button'); b.id = 'oralBtn'; b.className = 'banner-action-btn';
            b.onclick = openOralPicker; bar.appendChild(b);
        }
        b.style.display = canManage() && windowViewingEmployee ? 'flex' : 'none';
        const v = windowViewingEmployee && windowViewingEmployee.oralExam;
        b.innerHTML = `<span>Усний залік</span>${v ? `<small class="ex-pill ${oralClass(v)}">${esc(v)}</small>` : ''}`;
    }
    function openOralPicker() {
        const emp = windowViewingEmployee; if (!emp) return;
        const cur = emp.oralExam || '';
        const m = sheet('oralSheet', 'Усний залік: ' + esc(emp.name),
            ORAL.map(o => `<button class="ex-opt ${o.cls}${cur === o.v ? ' sel' : ''}" data-v="${esc(o.v)}">${esc(o.v)}</button>`).join('') +
            `<button class="ex-opt clr" data-v="">Очистити</button>`);
        m.querySelectorAll('.ex-opt').forEach(btn => btn.onclick = () => {
            setOral([emp], btn.getAttribute('data-v')); m.remove(); renderOralBtn(); toast('Збережено');
        });
    }

    /* ---------- «Сьогодні» ---------- */
    function goalDaysLeft(u) {
        const dl = u.goals && u.goals.deadline && u.goals.deadline.goal;
        if (!dl || !u.goalsStart) return null;
        const st = new Date(u.goalsStart).getTime(); if (isNaN(st)) return null;
        return Math.max(1, Math.ceil((st + dl * 864e5 - Date.now()) / 864e5));
    }
    function todayLine(u) {
        const parts = [];
        const dGoal = goalDaysLeft(u);
        if (dGoal && u.goals) {
            GOAL_DEFS.forEach(d => {
                if (d.unit === '%' ) return;
                const o = u.goals[d.key]; if (!o || !o.goal || o.goal <= (o.fact || 0)) return;
                parts.push(`${d.short} ${fmtNum(Math.ceil((o.goal - (o.fact || 0)) / dGoal))}`);
            });
        }
        let txt = parts.length ? `Цілі: ${parts.join(' · ')}` : '';
        try {
            const ms = computeRemainingDeadlineMs(u);
            if (ms !== null && ms > 0) {
                const m = computeUserMetrics(u);
                if (m.remaining > 0) {
                    const days = Math.max(1, Math.ceil(ms / 864e5));
                    const per = Math.ceil(m.remaining / days * 10) / 10;
                    txt += (txt ? ' | ' : '') + `Курси: ${fmtNum(per)} на день (${m.remaining} за ${days} дн.)`;
                }
            }
        } catch (e) {}
        return txt;
    }
    function renderToday(u) {
        const box = document.getElementById('goalsBlock'); if (!box || !u || !hasGoals(u) && !u.deadlineDays) return;
        let el = document.getElementById('todayLine'); if (el) el.remove();
        const txt = todayLine(u); if (!txt) return;
        el = document.createElement('div'); el.id = 'todayLine'; el.className = 'today-line';
        el.innerHTML = `<b>Сьогодні</b><span>${esc(txt)}</span>`;
        box.insertBefore(el, box.firstChild);
    }

    /* ---------- Зведення команди ---------- */
    function teamStats(users) {
        const s = { n: users.length, withGoals: 0, goalsDone: 0, courses: 0, done: 0, overdue: [], lag: [], oral: { ok: 0, warn: 0, bad: 0 } };
        users.forEach(u => {
            const m = computeUserMetrics(u);
            s.courses += m.totalAssigned; s.done += m.completed;
            if (hasGoals(u)) {
                s.withGoals++;
                const keys = GOAL_DEFS.filter(d => u.goals[d.key] && u.goals[d.key].goal);
                if (keys.length && keys.every(d => u.goals[d.key].done >= 100)) s.goalsDone++;
                else {
                    const avg = keys.reduce((a, d) => a + (u.goals[d.key].done || 0), 0) / (keys.length || 1);
                    s.lag.push({ name: u.name, avg: Math.round(avg) });
                }
            }
            try { const ms = computeRemainingDeadlineMs(u); if (ms !== null && ms < 0 && m.remaining > 0) s.overdue.push(u.name); } catch (e) {}
            const c = oralClass(u.oralExam); if (c) s.oral[c]++;
        });
        s.lag.sort((a, b) => a.avg - b.avg);
        return s;
    }
    function openTeamSummary() {
        const s = teamStats(scope());
        const pct = s.courses ? Math.round(s.done / s.courses * 100) : 0;
        const row = (k, v) => `<div class="ex-row"><span>${k}</span><b>${v}</b></div>`;
        sheet('teamSheet', 'Зведення команди',
            row('Співробітників', s.n) + row('Призначено курсів', s.courses) + row('Пройдено', `${s.done} (${pct}%)`) +
            row('З цілями', s.withGoals) + row('Цілі виконано', s.goalsDone) +
            row('Усний залік', `✔ ${s.oral.ok} · ⏳ ${s.oral.warn} · ✖ ${s.oral.bad}`) +
            row('Прострочені дедлайни', s.overdue.length) +
            (s.overdue.length ? `<div class="ex-list">${s.overdue.map(esc).join('<br>')}</div>` : '') +
            (s.lag.length ? `<div class="ex-sub">Відстають по цілях</div><div class="ex-list">${s.lag.slice(0, 8).map(x => `${esc(x.name)} — ${x.avg}%`).join('<br>')}</div>` : ''));
    }

    /* ---------- Підсумок тижня (текст для Telegram) ---------- */
    function weeklyText() {
        const users = scope(), s = teamStats(users);
        const pct = s.courses ? Math.round(s.done / s.courses * 100) : 0;
        const d = new Date(), fmt = x => String(x).padStart(2, '0');
        const date = `${fmt(d.getDate())}.${fmt(d.getMonth() + 1)}.${d.getFullYear()}`;
        const top = users.map(u => ({ n: u.name, v: computeUserMetrics(u).completed })).filter(x => x.v > 0).sort((a, b) => b.v - a.v).slice(0, 3);
        const medals = ['🥇', '🥈', '🥉'];
        let t = `📊 Підсумок тижня • ${date}\n\n👥 Команда: ${s.n}\n📚 Курси: ${s.done}/${s.courses} (${pct}%)\n🎯 Цілі виконано: ${s.goalsDone} із ${s.withGoals}\n`;
        if (s.oral.ok + s.oral.warn + s.oral.bad) t += `🗣 Усний залік: ✅ ${s.oral.ok} · 📖 ${s.oral.warn} · ❌ ${s.oral.bad}\n`;
        if (top.length) t += `\n🏆 Лідери навчання:\n${top.map((x, i) => `${medals[i]} ${x.n} — ${x.v}`).join('\n')}\n`;
        if (s.lag.length) t += `\n⚠️ Потребують уваги:\n${s.lag.slice(0, 5).map(x => `• ${x.name} — ${x.avg}%`).join('\n')}\n`;
        if (s.overdue.length) t += `\n⏰ Прострочено дедлайн: ${s.overdue.length}\n`;
        return t.trim();
    }
    function openWeekly() {
        const t = weeklyText();
        const m = sheet('weeklySheet', 'Підсумок тижня', `<pre class="ex-pre" id="weeklyPre">${esc(t)}</pre>`,
            `<button class="ex-main" id="weeklyCopy">Скопіювати</button>`);
        m.querySelector('#weeklyCopy').onclick = () => copyText(t);
    }

    /* ---------- Масові дії ---------- */
    let bulk = false; const picked = new Set();
    function updBulkBar() {
        let bar = document.getElementById('bulkBar');
        if (!bulk) { if (bar) bar.remove(); return; }
        if (!bar) {
            bar = document.createElement('div'); bar.id = 'bulkBar'; bar.className = 'bulk-bar';
            document.getElementById('statsModal').appendChild(bar);
        }
        bar.innerHTML = `<span>Обрано: ${picked.size}</span><button data-a="all">Усі</button><button data-a="oral">Залік</button><button data-a="course">Курс</button>${windowUserRole === 'owner' ? '<button data-a="dl">Дедлайн</button>' : ''}`;
        bar.querySelectorAll('button').forEach(b => b.onclick = () => bulkAct(b.getAttribute('data-a')));
    }
    function pickedUsers() { return eduDb.users.filter(u => picked.has(String(u.login).toLowerCase())); }
    function markCards() {
        document.querySelectorAll('#statsModalUsersList .list-card').forEach(c => {
            const m = /selectEmployeeFromModal\('([^']*)'\)/.exec(c.getAttribute('onclick') || '') || /data-login="([^"]*)"/.exec(c.outerHTML);
            const lg = (c.getAttribute('data-login') || (m && m[1]) || '').toLowerCase();
            c.setAttribute('data-login', lg);
            c.classList.toggle('bulk-sel', bulk && picked.has(lg));
        });
    }
    function toggleBulk() {
        bulk = !bulk; picked.clear();
        const b = document.getElementById('bulkToggle'); if (b) b.classList.toggle('on', bulk);
        updBulkBar(); markCards();
    }
    function bulkAct(a) {
        if (a === 'all') {
            document.querySelectorAll('#statsModalUsersList .list-card').forEach(c => picked.add(c.getAttribute('data-login')));
            updBulkBar(); markCards(); return;
        }
        const users = pickedUsers(); if (!users.length) { toast('Спочатку оберіть співробітників'); return; }
        if (a === 'oral') {
            const m = sheet('bulkSheet', `Усний залік (${users.length})`, ORAL.map(o => `<button class="ex-opt ${o.cls}" data-v="${esc(o.v)}">${esc(o.v)}</button>`).join(''));
            m.querySelectorAll('.ex-opt').forEach(b => b.onclick = () => { setOral(users, b.getAttribute('data-v')); m.remove(); toast('Збережено'); renderStatsModalEmployees(''); markCards(); });
        } else if (a === 'course') {
            const cat = (eduDb.courseCatalog || []);
            const m = sheet('bulkSheet', `Призначити курс (${users.length})`, cat.map((c, i) => `<button class="ex-opt" data-i="${i}">${esc(c.name)}</button>`).join('') || 'Немає курсів');
            m.querySelectorAll('.ex-opt').forEach(b => b.onclick = () => {
                const c = cat[+b.getAttribute('data-i')], key = getCleanName(c.name);
                users.forEach(u => {
                    if ((u.assigned || []).some(x => getCleanName(x) === key)) return;
                    enqueue({ action: 'assign_courses', targetLogin: u.login, assignments: { [key]: true } });
                    u.assigned = (u.assigned || []).concat([c.name]);
                });
                m.remove(); toast('Призначено'); renderStatsModalEmployees(''); markCards();
            });
        } else if (a === 'dl') {
            const m = sheet('bulkSheet', `Дедлайн, днів (${users.length})`, `<input type="number" min="1" id="bulkDl" class="ex-input" placeholder="Кількість днів">`, `<button class="ex-main" id="bulkDlOk">Застосувати</button>`);
            m.querySelector('#bulkDlOk').onclick = () => {
                const v = String(m.querySelector('#bulkDl').value || '').trim(); if (!v || +v <= 0) return;
                users.forEach(u => { enqueue({ action: 'assign_courses', targetLogin: u.login, assignments: {}, deadlineDays: v }); u.deadlineDays = v; });
                m.remove(); toast('Збережено');
            };
        }
    }

    /* ---------- Журнал дій (Власник) ---------- */
    async function openLog() {
        const m = sheet('logSheet', 'Журнал дій', '<div class="ex-sub">Завантаження…</div>');
        const body = m.querySelector('.ex-sheet-body');
        try {
            const r = await window.Academy.diagPost('log_get', { limit: 200 });
            if (!r || !r.success) { body.innerHTML = `<div class="ex-sub">Недоступно${r && r.code ? ' (' + esc(r.code) + ')' : ''}</div>`; return; }
            if (!r.rows.length) { body.innerHTML = '<div class="ex-sub">Записів ще немає</div>'; return; }
            body.innerHTML = r.rows.map(x => `<div class="ex-log"><small>${esc(x.t)} · ${esc(x.who)}</small><div><b>${esc(x.what)}</b>${x.target ? ' — ' + esc(x.target) : ''}</div>${x.details ? `<small>${esc(x.details)}</small>` : ''}</div>`).join('');
        } catch (e) { body.innerHTML = '<div class="ex-sub">Помилка мережі</div>'; }
    }

    /* ---------- Панель інструментів у «Статистика» ---------- */
    function injectToolbar() {
        const list = document.getElementById('statsModalUsersList');
        if (!list || document.getElementById('exTools')) return;
        const bar = document.createElement('div'); bar.id = 'exTools'; bar.className = 'ex-tools';
        bar.innerHTML = `<button data-a="team">Зведення</button><button data-a="week">Підсумок тижня</button><button data-a="bulk" id="bulkToggle">Вибрати</button>`;
        list.parentNode.insertBefore(bar, list);
        bar.onclick = e => {
            const a = e.target.getAttribute && e.target.getAttribute('data-a');
            if (a === 'team') openTeamSummary(); else if (a === 'week') openWeekly(); else if (a === 'bulk') toggleBulk();
        };
        // у режимі вибору клік по картці не відкриває співробітника
        list.addEventListener('click', e => {
            if (!bulk) return;
            const c = e.target.closest('.list-card'); if (!c) return;
            e.stopPropagation(); e.preventDefault();
            const lg = c.getAttribute('data-login'); if (!lg) return;
            picked.has(lg) ? picked.delete(lg) : picked.add(lg);
            updBulkBar(); markCards();
        }, true);
        new MutationObserver(markCards).observe(list, { childList: true });
    }

    /* ---------- Рядок «Журнал дій» в Опціях ---------- */
    function injectLogRow() {
        const diag = document.getElementById('diagRow'); if (!diag) return;
        let r = document.getElementById('logRow');
        if (!r) {
            r = diag.cloneNode(true); r.id = 'logRow'; r.removeAttribute('onclick'); r.setAttribute('data-func', 'Журнал дій');
            r.querySelector('.list-item-title').textContent = 'Журнал дій';
            r.querySelector('.list-item-subtitle').textContent = 'Хто, що і кому змінював (цілі, курси, залік)';
            r.onclick = openLog; diag.parentNode.insertBefore(r, diag.nextSibling);
        }
        r.style.display = diag.style.display;
    }
    const _rdr = window.renderDiagRow;
    window.renderDiagRow = function () { if (_rdr) _rdr(); injectLogRow(); };

    /* ---------- Хуки ---------- */
    const _sel = window.selectEmployeeFromModal || selectEmployeeFromModal;
    window.selectEmployeeFromModal = selectEmployeeFromModal = function (l) { _sel(l); renderOralBtn(); renderToday(windowViewingEmployee); };
    const _rg = renderGoals;
    let sortMode = 0; // 0 за замовчуванням, 1 відстаючі першими, 2 виконані першими
    const SORT_TXT = ['↕ Звичайно', '↑ Відстаючі', '↓ Виконані'];
    function applySort() {
        const box = document.getElementById('goalsBlock'); if (!box) return;
        const rows = Array.from(box.querySelectorAll('.goal-row'));
        rows.forEach((r, i) => { if (r._i === undefined) r._i = i; });
        const val = r => { const b = r.querySelector('.goal-bubble'); return b ? parseFloat(b.textContent) || 0 : -1; };
        rows.sort((a, b) => sortMode === 0 ? a._i - b._i : sortMode === 1 ? val(a) - val(b) : val(b) - val(a));
        const last = box.querySelector('.goal-dl'); rows.forEach(r => box.insertBefore(r, last || null));
        const btn = box.querySelector('.goal-sort'); if (btn) btn.textContent = SORT_TXT[sortMode];
    }
    function addSort() {
        const top = document.querySelector('#goalsBlock .goal-top'); if (!top || top.querySelector('.goal-sort')) return;
        top.style.display = 'flex'; top.style.justifyContent = 'space-between'; top.style.alignItems = 'center';
        const b = document.createElement('button'); b.className = 'goal-sort'; b.type = 'button'; b.textContent = SORT_TXT[sortMode];
        b.onclick = () => { sortMode = (sortMode + 1) % 3; applySort(); };
        top.appendChild(b); applySort();
    }
    renderGoals = function (u) { _rg(u); renderToday(u); addSort(); };
    const _os = window.openStatsModal || openStatsModal;
    window.openStatsModal = openStatsModal = function () {
        _os.apply(this, arguments);
        if (canManage()) { injectToolbar(); const t = document.getElementById('exTools'); if (t) t.style.display = ''; }
    };
    window.openOralPicker = openOralPicker;
    setTimeout(injectLogRow, 0);
})();
