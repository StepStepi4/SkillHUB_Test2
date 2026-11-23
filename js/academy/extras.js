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
        b.innerHTML = `${v ? `<span class="ex-oral-dot ${oralClass(v)}"></span>` : ''}<span>Усний залік</span>`;
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
    window.ExtrasToday = {
        goals(u) {
            const out = [], d = goalDaysLeft(u);
            if (d && u && u.goals) GOAL_DEFS.forEach(g => { if (g.unit === '%') return; const o = u.goals[g.key]; if (!o || !o.goal || o.goal <= (o.fact || 0)) return; out.push({ label: g.short, val: Math.ceil((o.goal - (o.fact || 0)) / d), left: o.goal - (o.fact || 0) }); });
            return { items: out, days: d };
        },
        courses(u) {
            try { const ms = computeRemainingDeadlineMs(u); if (ms === null || ms <= 0) return null; const m = computeUserMetrics(u); if (m.remaining <= 0) return null; const days = Math.max(1, Math.ceil(ms / 864e5)); return { per: Math.ceil(m.remaining / days * 10) / 10, remaining: m.remaining, days: days }; } catch (e) { return null; }
        }
    };
    function renderToday(u) {
        return;
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
    /* ---------- Звіт по керівнику: тиждень / місяць ---------- */
    const REP_KEYS = ['uah', 'pcs', 'plan', 'smart', 'cards'];
    const gf = (u, k) => { const o = (u.goalsFact && u.goalsFact[k]) || (u.goals && u.goals[k]) || null; return o && o.fact !== null && o.fact !== undefined && o.fact !== '' ? Number(o.fact) : null; };
    const gg = (u, k) => { const o = u.goals && u.goals[k]; return o && o.goal !== null && o.goal !== undefined && o.goal !== '' ? Number(o.goal) : null; };
    const SNAP_KEY = 'skillhub_rep_snaps';
    const snapRow = u => { const r = { d: computeUserMetrics(u).completed }; REP_KEYS.forEach(k => { const v = gf(u, k); if (v !== null) r[k] = v; }); return r; };
    function loadSnaps() { try { return JSON.parse(localStorage.getItem(SNAP_KEY) || '[]') || []; } catch (e) { return []; } }
    function takeSnapshot() {   // не частіше ніж раз на 6 годин; зберігаємо 60 знімків - база для приросту за тиждень/місяць
        try {
            if (!canManage() || !eduDb || !eduDb.users) return;
            const snaps = loadSnaps(), last = snaps[snaps.length - 1];
            if (last && Date.now() - last.t < 6 * 36e5) return;
            const d = {}; eduDb.users.forEach(u => { if (u.login) d[u.login] = snapRow(u); });
            snaps.push({ t: Date.now(), d: d });
            localStorage.setItem(SNAP_KEY, JSON.stringify(snaps.slice(-60)));
        } catch (e) {}
    }
    function periodStart(kind) {
        const n = new Date();
        if (kind === 'month') return new Date(n.getFullYear(), n.getMonth(), 1).getTime();
        const dow = (n.getDay() + 6) % 7;   // понеділок
        return new Date(n.getFullYear(), n.getMonth(), n.getDate() - dow).getTime();
    }
    // база для приросту: останній знімок ДО початку періоду, інакше найраніший знімок усередині періоду
    function baseline(kind) {
        const snaps = loadSnaps(), st = periodStart(kind);
        const before = snaps.filter(x => x.t < st).pop();
        if (before) return before;
        const inside = snaps.find(x => x.t >= st);
        return inside && Date.now() - inside.t > 36e5 ? inside : null;
    }
    const fmtDay = t => { const d = new Date(t), f = x => String(x).padStart(2, '0'); return `${f(d.getDate())}.${f(d.getMonth() + 1)}`; };
    const n0 = v => fmtNum(Math.round(v));
    const pctOf = (f, g) => g ? Math.round(f / g * 100) : null;

    function buildReport(users, kind) {
        const base = baseline(kind), baseD = base ? base.d : null;
        const tot = { uah: 0, pcs: 0, smart: 0, cards: 0, gUah: 0, gPcs: 0, gSmart: 0, gCards: 0, planSum: 0, planN: 0, courses: 0, done: 0, scoreSum: 0, scoreN: 0, goalsDone: 0, withGoals: 0, dUah: 0, dPcs: 0, dSmart: 0, dCards: 0, dDone: 0 };
        const rows = users.map(u => {
            const m = computeUserMetrics(u);
            const r = { name: u.name, uah: gf(u, 'uah') || 0, pcs: gf(u, 'pcs') || 0, smart: gf(u, 'smart') || 0, cards: gf(u, 'cards') || 0, plan: gf(u, 'plan'), done: m.completed, total: m.totalAssigned };
            const b = baseD && baseD[u.login];
            r.dUah = b ? Math.max(0, r.uah - (b.uah || 0)) : null; r.dPcs = b ? Math.max(0, r.pcs - (b.pcs || 0)) : null;
            r.dSmart = b ? Math.max(0, r.smart - (b.smart || 0)) : null; r.dCards = b ? Math.max(0, r.cards - (b.cards || 0)) : null; r.dDone = b ? Math.max(0, r.done - (b.d || 0)) : null;
            tot.uah += r.uah; tot.pcs += r.pcs; tot.smart += r.smart; tot.cards += r.cards;
            tot.gUah += gg(u, 'uah') || 0; tot.gPcs += gg(u, 'pcs') || 0; tot.gSmart += gg(u, 'smart') || 0; tot.gCards += gg(u, 'cards') || 0;
            if (r.plan !== null) { tot.planSum += r.plan; tot.planN++; }
            tot.courses += m.totalAssigned; tot.done += m.completed;
            const sc = parseFloat(String(m.avgScoreFormatted || '').replace(',', '.')); if (!isNaN(sc) && sc > 0) { tot.scoreSum += sc; tot.scoreN++; }
            if (hasGoals(u)) { tot.withGoals++; const keys = GOAL_DEFS.filter(d => u.goals[d.key] && u.goals[d.key].goal); if (keys.length && keys.every(d => (u.goals[d.key].done || 0) >= 100)) tot.goalsDone++; }
            if (b) { tot.dUah += r.dUah; tot.dPcs += r.dPcs; tot.dSmart += r.dSmart; tot.dCards += r.dCards; tot.dDone += r.dDone; }
            return r;
        });
        rows.sort((a, b) => (kind === 'week' && base ? (b.dUah - a.dUah) : (b.uah - a.uah)) || a.name.localeCompare(b.name, 'uk'));
        return { tot, rows, base, kind };
    }
    function reportText(users, kind, mgrName) {
        const R = buildReport(users, kind), t = R.tot, delta = kind === 'week' && R.base;
        const title = kind === 'week' ? 'Тижневий звіт' : 'Місячний звіт';
        const d = new Date(), f = x => String(x).padStart(2, '0');
        let out = `📊 ${title} • ${f(d.getDate())}.${f(d.getMonth() + 1)}.${d.getFullYear()}\n👤 Керівник: ${mgrName}\n👥 Команда: ${users.length}\n`;
        if (kind === 'week') out += delta ? `📈 Приріст за тиждень (з ${fmtDay(R.base.t)})\n` : `ℹ️ Приріст за тиждень зʼявиться після другого збереження даних; нижче накопичені показники\n`;
        const line = (ico, nm, fact, goal, dl) => `${ico} ${nm}: ${n0(fact)}${goal ? ` / ${n0(goal)} (${pctOf(fact, goal)}%)` : ''}${delta && dl !== null ? `  ▲ +${n0(dl)}` : ''}`;
        out += `\n💰 Продажі\n${line('•', 'Грн', t.uah, t.gUah, t.dUah)}\n${line('•', 'Шт', t.pcs, t.gPcs, t.dPcs)}\n`;
        if (t.planN) out += `• Виконання плану (середнє): ${Math.round(t.planSum / t.planN)}%\n`;
        out += `\n💳 Картки\n${line('•', 'Картки', t.cards, t.gCards, t.dCards)}\n`;
        out += `\n📱 Smart\n${line('•', 'Smart', t.smart, t.gSmart, t.dSmart)}\n`;
        out += `\n📚 Курси\n• Пройдено: ${t.done}/${t.courses} (${pctOf(t.done, t.courses) || 0}%)${delta ? `  ▲ +${t.dDone}` : ''}\n`;
        if (t.scoreN) out += `• Середній бал: ${Math.round(t.scoreSum / t.scoreN)}%\n`;
        out += `🎯 Цілі виконано: ${t.goalsDone} із ${t.withGoals}\n`;
        const medals = ['🥇', '🥈', '🥉'], top = R.rows.filter(r => (delta ? r.dUah : r.uah) > 0).slice(0, 3);
        if (top.length) out += `\n🏆 Лідери продажів\n${top.map((r, i) => `${medals[i]} ${r.name} — ${n0(delta ? r.dUah : r.uah)} грн`).join('\n')}\n`;
        const low = R.rows.filter(r => r.total > 0 && r.done < r.total).sort((a, b) => (a.done / a.total) - (b.done / b.total)).slice(0, 5);
        if (low.length) out += `\n⚠️ Відстають по курсах\n${low.map(r => `• ${r.name} — ${r.done}/${r.total}`).join('\n')}\n`;
        return out.trim();
    }
    let repKind = 'week', repMgr = '';
    function openPeriodReport() {
        const m = sheet('weeklySheet', 'Звіт по керівнику', '', `<button class="ex-main" id="weeklyCopy">Скопіювати для відправки</button>`);
        const body = m.querySelector('.ex-sheet-body');
        const names = Array.from(new Set(scope().map(mgrOf))).filter(x => x !== '—').sort((a, b) => a.localeCompare(b, 'uk'));
        if (windowUserRole === 'manager') repMgr = '';
        const usersNow = () => scope().filter(u => !repMgr || mgrOf(u) === repMgr);
        const mgrLabel = () => repMgr || (windowUserRole === 'manager' ? 'моя команда' : 'усі керівники');
        const kpi = (ico, nm, fact, goal, dl, delta) => `<div class="rp-kpi"><div class="rp-k-top"><span>${ico} ${nm}</span>${delta && dl !== null ? `<i class="rp-up">▲ +${n0(dl)}</i>` : ''}</div><div class="rp-k-v">${n0(fact)}${goal ? `<small> / ${n0(goal)}</small>` : ''}</div>${goal ? `<div class="rp-bar"><b style="width:${Math.min(100, pctOf(fact, goal))}%"></b></div><div class="rp-k-p">${pctOf(fact, goal)}%</div>` : ''}</div>`;
        const draw = () => {
            const users = usersNow(), R = buildReport(users, repKind), t = R.tot, delta = repKind === 'week' && !!R.base;
            const chips = (names.length > 1 && windowUserRole !== 'manager') ? `<div class="ex-sub">Керівник</div><div class="ex-chips" id="rpMgr"><button class="ex-chip${repMgr ? '' : ' on'}" data-m="">Усі</button>${names.map(n => `<button class="ex-chip${repMgr === n ? ' on' : ''}" data-m="${esc(n)}">${esc(n)}</button>`).join('')}</div>` : '';
            const per = `<div class="rp-seg" id="rpKind"><button class="${repKind === 'week' ? 'on' : ''}" data-k="week">Тиждень</button><button class="${repKind === 'month' ? 'on' : ''}" data-k="month">Місяць</button></div>`;
            const note = repKind === 'week'
                ? (R.base ? `Приріст за тиждень — з ${fmtDay(R.base.t)}. Поточні значення — накопичені.` : 'Приріст за тиждень зʼявиться, коли в застосунку збережеться другий знімок даних (кожні ~6 год при відкритті Академії). Поки — накопичені показники.')
                : 'Накопичені показники поточного цільового періоду (місяця) проти цілей.';
            const top = R.rows.slice(0, 15).map((r, i) => `<div class="rp-emp"><span class="rp-n">${i + 1}</span><div class="rp-en"><b>${esc(r.name)}</b><small>Курси ${r.done}/${r.total}${r.plan !== null ? ` · План ${Math.round(r.plan)}%` : ''}</small></div><div class="rp-ev"><b>${n0(repKind === 'week' && R.base ? r.dUah : r.uah)} ₴</b><small>${n0(r.pcs)} шт · ${n0(r.cards)} карт · ${n0(r.smart)} smart</small></div></div>`).join('');
            body.innerHTML = chips + per + `<div class="ex-sub rp-note">${esc(note)}</div>
                <div class="rp-grid">${kpi('💰', 'Продажі, грн', t.uah, t.gUah, t.dUah, delta)}${kpi('📦', 'Продажі, шт', t.pcs, t.gPcs, t.dPcs, delta)}${kpi('💳', 'Картки', t.cards, t.gCards, t.dCards, delta)}${kpi('📱', 'Smart', t.smart, t.gSmart, t.dSmart, delta)}${kpi('📚', 'Курси пройдено', t.done, t.courses, t.dDone, delta)}
                <div class="rp-kpi"><div class="rp-k-top"><span>🎯 Цілі виконано</span></div><div class="rp-k-v">${t.goalsDone}<small> / ${t.withGoals}</small></div><div class="rp-k-p">${t.planN ? 'План (сер.): ' + Math.round(t.planSum / t.planN) + '%' : '&nbsp;'}${t.scoreN ? ' · бал ' + Math.round(t.scoreSum / t.scoreN) + '%' : ''}</div></div></div>
                <div class="ex-sub">Співробітники (${users.length})</div>${top || '<div class="ex-sub">Немає даних</div>'}${R.rows.length > 15 ? `<div class="ex-sub">…ще ${R.rows.length - 15}</div>` : ''}`;
            body.querySelectorAll('#rpKind button').forEach(b => b.onclick = () => { repKind = b.getAttribute('data-k'); draw(); });
            body.querySelectorAll('#rpMgr .ex-chip').forEach(c => c.onclick = () => { repMgr = c.getAttribute('data-m'); draw(); });
        };
        draw();
        m.querySelector('#weeklyCopy').onclick = () => copyText(reportText(usersNow(), repKind, mgrLabel()));
    }
    window.ExtrasReport = { text: reportText, build: buildReport, snapshot: takeSnapshot };

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
                <div class="ex-dsec ex-dsec-row"><span>Фільтри</span><button class="ex-link" type="button" onclick="resetFilters()">Скинути</button></div><div id="exFilterSlot"></div>
                <div class="ex-dsec">Звіти</div>
                <div class="ex-dgrid"><button class="ex-dbtn" data-a="team">Зведення</button><button class="ex-dbtn" data-a="week">Звіт: тиждень / місяць</button></div>
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
            else if (act === 'week') { closeDrawer(); openPeriodReport(); }
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
    renderGoals = function (u) { _rg(u); renderToday(u); addSort(); takeSnapshot(); };
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
