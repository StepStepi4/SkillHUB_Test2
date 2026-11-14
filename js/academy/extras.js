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

    /* ---------- Масові дії ---------- */
    let bulk = false; const picked = new Set();
    const CHK = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 12 10 18 20 6"/></svg>';
    function updBulkBar() {
        let bar = document.getElementById('bulkBar');
        if (!bulk) { if (bar) bar.remove(); return; }
        if (!bar) { bar = document.createElement('div'); bar.id = 'bulkBar'; bar.className = 'bulk-bar'; const l = document.getElementById('statsModalUsersList'); l.parentNode.insertBefore(bar, l); }
        bar.innerHTML = `<div class="bulk-count">Обрано: <b>${picked.size}</b></div>
            <div class="bulk-btns"><button data-a="all">Усі</button><button data-a="oral">Залік</button><button data-a="course">Курси</button><button data-a="off" class="ghost">Скасувати</button></div>`;
        bar.querySelectorAll('button').forEach(b => b.onclick = () => bulkAct(b.getAttribute('data-a')));
    }
    const pickedUsers = () => eduDb.users.filter(u => picked.has(String(u.login).toLowerCase()));
    function markCards() {
        document.querySelectorAll('#statsModalUsersList .list-card').forEach(c => {
            let lg = c.getAttribute('data-login');
            if (!lg) { const m = /selectEmployeeFromModal\('([^']*)'\)/.exec(c.getAttribute('onclick') || ''); lg = m ? m[1].toLowerCase() : ''; c.setAttribute('data-login', lg); }
            const on = bulk && picked.has(lg);
            c.classList.toggle('bulk-sel', on);
            let b = c.querySelector(':scope > .bulk-chk');
            if (bulk && !b) { b = document.createElement('span'); b.className = 'bulk-chk'; c.insertBefore(b, c.firstChild); }
            if (!bulk && b) b.remove();
            if (b) { b.classList.toggle('on', on); b.innerHTML = on ? CHK : ''; }
        });
    }
    function setBulk(on) {
        bulk = on; picked.clear();
        document.getElementById('statsModal').classList.toggle('bulk-mode', on);
        updBulkBar(); markCards();
    }
    function bulkAct(a) {
        if (a === 'off') { setBulk(false); return; }
        if (a === 'all') {
            const cards = Array.from(document.querySelectorAll('#statsModalUsersList .list-card'));
            const every = cards.length && cards.every(c => picked.has(c.getAttribute('data-login')));
            cards.forEach(c => every ? picked.delete(c.getAttribute('data-login')) : picked.add(c.getAttribute('data-login')));
            updBulkBar(); markCards(); return;
        }
        const users = pickedUsers(); if (!users.length) { toast('Спочатку оберіть співробітників'); return; }
        if (a === 'oral') {
            const m = sheet('bulkSheet', `Усний залік (${users.length})`, ORAL.map(o => `<button class="ex-opt ${o.cls}" data-v="${esc(o.v)}">${esc(o.v)}</button>`).join(''));
            m.querySelectorAll('.ex-opt').forEach(b => b.onclick = () => { setOral(users, b.getAttribute('data-v')); m.remove(); toast('Збережено'); renderStatsModalEmployees(''); markCards(); });
        } else if (a === 'course') {
            const cat = (eduDb.courseCatalog || []);
            const m = sheet('bulkSheet', `Призначити курси (${users.length})`,
                (cat.length ? cat.map((c, i) => `<label class="ex-chkrow"><input type="checkbox" data-i="${i}"><span class="ex-box">${CHK}</span><span>${esc(c.name)}</span></label>`).join('') : '<div class="ex-sub">Немає курсів</div>') +
                `<label class="ex-lbl">Дедлайн, днів (обовʼязково)</label><input type="number" min="1" inputmode="numeric" id="bulkDl" class="ex-input" placeholder="Наприклад, 14">`,
                `<button class="ex-main" id="bulkOk">Призначити</button>`);
            m.querySelector('#bulkOk').onclick = () => {
                const idx = Array.from(m.querySelectorAll('input[data-i]:checked')).map(i => +i.getAttribute('data-i'));
                const dlEl = m.querySelector('#bulkDl'), dl = String(dlEl.value || '').trim();
                if (!idx.length) { toast('Оберіть хоча б один курс'); return; }
                if (!dl || !(+dl > 0)) { toast('Вкажіть дедлайн у днях'); dlEl.classList.add('err'); dlEl.focus(); return; }
                users.forEach(u => {
                    const assignments = {}; let added = [];
                    idx.forEach(i => { const c = cat[i], key = getCleanName(c.name); assignments[key] = true; if (!(u.assigned || []).some(x => getCleanName(x) === key)) added.push(c.name); });
                    enqueue({ action: 'assign_courses', targetLogin: u.login, assignments: assignments, deadlineDays: dl });
                    u.assigned = (u.assigned || []).concat(added); u.deadlineDays = dl;
                    const d = eduDb.users.find(x => x.login === u.login); if (d && d !== u) { d.assigned = u.assigned; d.deadlineDays = dl; }
                });
                m.remove(); toast(`Призначено: ${idx.length} курс. × ${users.length} спів.`); renderStatsModalEmployees(''); markCards();
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
                <div class="ex-dsec">Масові дії</div>
                <button class="ex-dbtn" data-a="bulk">Вибрати співробітників</button>
            </div></div>`;
        modal.appendChild(d);
        const fp = document.getElementById('filterPanel');
        if (fp) {
            d.querySelector('#exFilterSlot').appendChild(fp);
            fp.style.cssText = 'display:flex;flex-direction:column;gap:10px;border:0;padding:0;margin:0;background:transparent;box-shadow:none';
            const h = fp.firstElementChild; if (h && h.getAttribute('onclick')) h.style.display = 'none';
        }
        d.addEventListener('click', e => {
            if (e.target === d) { closeDrawer(); return; }
            const a = e.target.closest('[data-a]'); if (!a) return;
            const act = a.getAttribute('data-a');
            if (act === 'close') closeDrawer();
            else if (act === 'team') { closeDrawer(); openTeamSummary(); }
            else if (act === 'week') { closeDrawer(); openWeekly(); }
            else if (act === 'bulk') { closeDrawer(); setBulk(true); toast('Торкніться співробітників для вибору'); }
        });
        return d;
    }
    function openDrawer() { const d = ensureDrawer(); if (d) requestAnimationFrame(() => d.classList.add('open')); }
    function closeDrawer() { const d = document.getElementById('exDrawer'); if (d) d.classList.remove('open'); }
    window.toggleFilterMenu = toggleFilterMenu = function () {
        const d = ensureDrawer(); if (d) d.classList.contains('open') ? closeDrawer() : openDrawer();
    };
    function setupStatsModal() {
        const modal = document.getElementById('statsModal'); if (!modal || modal._exInit) return; modal._exInit = true;
        const list = document.getElementById('statsModalUsersList');
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
        if (canManage()) { ensureDrawer(); setupStatsModal(); closeDrawer(); if (bulk) setBulk(false); }
    };
    const _cs = closeStatsModal;
    window.closeStatsModal = closeStatsModal = function () { closeDrawer(); if (bulk) setBulk(false); _cs.apply(this, arguments); };
    window.openOralPicker = openOralPicker;
    setTimeout(injectLogRow, 0);
})();
