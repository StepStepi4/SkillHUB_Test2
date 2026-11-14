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
    const scope = () => { try { return (getAccessibleEmployeesList() || []).filter(u => String(u.login).toLowerCase() !== String(currentUser).toLowerCase()); } catch (e) { return []; } };
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
        b.innerHTML = `<span class="ex-oral-dot ${oralClass(v)}"></span><span>Усний залік</span>`;
        let st = document.getElementById('oralStatus');
        if (!st) { st = document.createElement('span'); st.id = 'oralStatus'; const meta = document.getElementById('viewingEmployeeMeta'); if (meta) meta.after(st); }
        st.className = 'ex-pill ' + oralClass(v); st.textContent = v ? 'Усний залік: ' + v : ''; st.style.display = v ? '' : 'none';
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

    /* ---------- Звіти (з вибором керівників) ---------- */
    const mgrOf = u => (u.manager && u.manager !== '-') ? formatManagerName(u.manager) : '—';
    const repMgrs = new Set(); // порожньо = усі керівники
    function reportUsers() {
        const all = scope();
        return repMgrs.size ? all.filter(u => repMgrs.has(mgrOf(u))) : all;
    }
    function mgrChips(onChange) {
        const names = Array.from(new Set(scope().map(mgrOf))).sort((a, b) => a.localeCompare(b, 'uk'));
        if (names.length < 2) return '';
        return `<div class="ex-sub">Керівники</div><div class="ex-chips" id="mgrChips">
            <button class="ex-chip${repMgrs.size ? '' : ' on'}" data-m="">Усі</button>
            ${names.map(n => `<button class="ex-chip${repMgrs.has(n) ? ' on' : ''}" data-m="${esc(n)}">${esc(n)}</button>`).join('')}</div>`;
    }
    function bindChips(root, rerender) {
        root.querySelectorAll('#mgrChips .ex-chip').forEach(c => c.onclick = () => {
            const m = c.getAttribute('data-m');
            if (!m) repMgrs.clear(); else repMgrs.has(m) ? repMgrs.delete(m) : repMgrs.add(m);
            rerender();
        });
    }
    function teamStats(users) {
        const s = { n: users.length, withGoals: 0, goalsDone: 0, courses: 0, done: 0, overdue: [], lag: [], oral: { ok: 0, warn: 0, bad: 0 } };
        users.forEach(u => {
            const m = computeUserMetrics(u);
            s.courses += m.totalAssigned; s.done += m.completed;
            if (hasGoals(u)) {
                s.withGoals++;
                const keys = GOAL_DEFS.filter(d => u.goals[d.key] && u.goals[d.key].goal);
                if (keys.length && keys.every(d => (u.goals[d.key].done || 0) >= 100)) s.goalsDone++;
                else {
                    const avg = keys.reduce((a, d) => a + Math.min(100, u.goals[d.key].done || 0), 0) / (keys.length || 1);
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
        const m = sheet('teamSheet', 'Зведення команди', '');
        const body = m.querySelector('.ex-sheet-body');
        const draw = () => {
            const s = teamStats(reportUsers());
            const pct = s.courses ? Math.round(s.done / s.courses * 100) : 0;
            const row = (k, v) => `<div class="ex-row"><span>${k}</span><b>${v}</b></div>`;
            body.innerHTML = mgrChips() +
                row('Співробітників', s.n) + row('Призначено курсів', s.courses) + row('Пройдено', `${s.done} (${pct}%)`) +
                row('З цілями', s.withGoals) + row('Цілі виконано', s.goalsDone) +
                row('Усний залік', `✔ ${s.oral.ok} · ⏳ ${s.oral.warn} · ✖ ${s.oral.bad}`) +
                row('Прострочені дедлайни', s.overdue.length) +
                (s.overdue.length ? `<div class="ex-list">${s.overdue.map(esc).join('<br>')}</div>` : '') +
                (s.lag.length ? `<div class="ex-sub">Відстають по цілях</div><div class="ex-list">${s.lag.slice(0, 8).map(x => `${esc(x.name)} — ${x.avg}%`).join('<br>')}</div>` : '');
            bindChips(body, draw);
        };
        draw();
    }
    function weeklyText() {
        const users = reportUsers(), s = teamStats(users);
        const pct = s.courses ? Math.round(s.done / s.courses * 100) : 0;
        const d = new Date(), fmt = x => String(x).padStart(2, '0');
        const date = `${fmt(d.getDate())}.${fmt(d.getMonth() + 1)}.${d.getFullYear()}`;
        const top = users.map(u => ({ n: u.name, v: computeUserMetrics(u).completed })).filter(x => x.v > 0).sort((a, b) => b.v - a.v).slice(0, 3);
        const medals = ['🥇', '🥈', '🥉'];
        let t = `📊 Підсумок тижня • ${date}\n`;
        if (repMgrs.size) t += `👤 Керівники: ${Array.from(repMgrs).join(', ')}\n`;
        t += `\n👥 Команда: ${s.n}\n📚 Курси: ${s.done}/${s.courses} (${pct}%)\n🎯 Цілі виконано: ${s.goalsDone} із ${s.withGoals}\n`;
        if (s.oral.ok + s.oral.warn + s.oral.bad) t += `🗣 Усний залік: ✅ ${s.oral.ok} · 📖 ${s.oral.warn} · ❌ ${s.oral.bad}\n`;
        if (top.length) t += `\n🏆 Лідери навчання:\n${top.map((x, i) => `${medals[i]} ${x.n} — ${x.v}`).join('\n')}\n`;
        if (s.lag.length) t += `\n⚠️ Потребують уваги:\n${s.lag.slice(0, 5).map(x => `• ${x.name} — ${x.avg}%`).join('\n')}\n`;
        if (s.overdue.length) t += `\n⏰ Прострочено дедлайн: ${s.overdue.length}\n`;
        return t.trim();
    }
    function openWeekly() {
        const m = sheet('weeklySheet', 'Підсумок тижня', '', `<button class="ex-main" id="weeklyCopy">Скопіювати</button>`);
        const body = m.querySelector('.ex-sheet-body');
        const draw = () => { body.innerHTML = mgrChips() + `<pre class="ex-pre" id="weeklyPre">${esc(weeklyText())}</pre>`; bindChips(body, draw); };
        draw();
        m.querySelector('#weeklyCopy').onclick = () => copyText(weeklyText());
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

    /* ---------- Бокове меню (фільтри, звіти, масові дії) ---------- */
    function ensureDrawer() {
        const modal = document.getElementById('statsModal'); if (!modal) return null;
        let d = document.getElementById('exDrawer'); if (d) return d;
        d = document.createElement('div'); d.id = 'exDrawer'; d.className = 'ex-drawer';
        d.innerHTML = `<div class="ex-drawer-panel">
            <div class="ex-drawer-head"><b>Меню</b><button class="ex-x" data-a="close" aria-label="Закрити">✕</button></div>
            <div class="ex-drawer-body">
                <div class="ex-dsec">Фільтрація</div><div id="exFilterSlot"></div>
                <div class="ex-dsec">Звіти</div>
                <button class="ex-dbtn" data-a="team">Зведення команди</button>
                <button class="ex-dbtn" data-a="week">Підсумок тижня</button>
            </div></div>`;
        modal.appendChild(d);
        const fp = document.getElementById('filterPanel');
        if (fp) {
            d.querySelector('#exFilterSlot').appendChild(fp);
        }
        d.addEventListener('click', e => {
            if (e.target === d) { closeDrawer(); return; }
            const a = e.target.closest('[data-a]'); if (!a) return;
            const act = a.getAttribute('data-a');
            if (act === 'close') closeDrawer();
            else if (act === 'team') { closeDrawer(); openTeamSummary(); }
            else if (act === 'week') { closeDrawer(); openWeekly(); }
        });
        return d;
    }
    function openDrawer() { const d = ensureDrawer(); if (d) requestAnimationFrame(() => d.classList.add('open')); }
    function closeDrawer() { const d = document.getElementById('exDrawer'); if (d) d.classList.remove('open'); }
    window.toggleFilterMenu = toggleFilterMenu = function () {
        const d = ensureDrawer(); if (d) d.classList.contains('open') ? closeDrawer() : openDrawer();
    };
    /* ---------- Рядок «Журнал дій» в Опціях ---------- */
    function injectLogRow() {
        const diag = document.getElementById('diagRow'); if (!diag) return;
        let r = document.getElementById('logRow');
        if (!r) {
            r = diag.cloneNode(true); r.id = 'logRow'; r.removeAttribute('onclick'); r.setAttribute('data-func', 'Журнал дій');
            r.querySelector('.list-item-title').textContent = 'Журнал дій'; const ic = r.querySelector('.set-ico'); if (ic) ic.setAttribute('src', 'assets/icons/settings/journal.svg');
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
        if (canManage()) { ensureDrawer(); closeDrawer(); }
    };
    const _cs = closeStatsModal;
    window.closeStatsModal = closeStatsModal = function () { closeDrawer(); _cs.apply(this, arguments); };
    window.openOralPicker = openOralPicker;
    setTimeout(injectLogRow, 0);
})();
