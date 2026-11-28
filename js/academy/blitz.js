/* Academy: щоденний бліц-тест - по 2 питання з кожного сервісу (курсу).
   Питання змінюються щодня і різні в кожного співробітника (детермінований вибір за логіном і датою).
   Алгоритм той самий, що в тестів по сервісах: таймер на питання, антишахрайство, підсумок. Підключається після welcome.js. */
(function () {
    const $ = id => document.getElementById(id);
    const esc = s => escapeHTMLAttr(s);
    const TOTAL_Q = 10, MAX_TRIES = 2;
    const today = () => { const d = new Date(), f = x => String(x).padStart(2, '0'); return `${d.getFullYear()}-${f(d.getMonth() + 1)}-${f(d.getDate())}`; };
    const me = () => (eduDb && eduDb.users && currentUser) ? eduDb.users.find(u => lowLogin(u.login) === lowLogin(currentUser)) : null;
    const key = u => 'skillhub_blitz_' + lowLogin(u.login);
    const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
    const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };

    // seeded RNG (mulberry32) + хеш рядка
    function seedOf(str) { let h = 1779033703 ^ str.length; for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = h << 13 | h >>> 19; } return h >>> 0; }
    function rng(seed) { let a = seed; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
    function shuf(arr, r) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }

    function buildBlitz(u) {
        const r = rng(seedOf(lowLogin(u.login) + '|' + today()));
        const seen = new Set(), pool = [];
        (eduDb.courses || []).forEach(c => {
            const name = cleanCourseTitle(c.product), k = getCleanName(name);
            if (!k || seen.has(k) || !c.test || !String(c.test).trim()) return;
            seen.add(k);
            const qs = parseTestString(c.test).filter(q => q.answers.length > 1 && q.answers.some(a => a.correct));
            if (!qs.length) return;
            pool.push({ name: name, qs: qs });
        });
        pool.sort((a, b) => a.name.localeCompare(b.name, 'uk'));          // стабільний порядок до перемішування
        // 10 питань: спершу по одному з різних сервісів (у випадковому порядку), далі - донабір
        const order = shuf(pool.slice(), r), picked = [], rest = [];
        order.forEach(p => { const a = shuf(p.qs.slice(), r); a.forEach((q, i) => { q.service = p.name; (i === 0 ? picked : rest).push(q); }); });
        const out = picked.concat(shuf(rest, r)).slice(0, TOTAL_Q);
        out.forEach(q => { q.answers = shuf(q.answers.slice(), r); q.answers.forEach(a => a.selected = false); });
        return { questions: shuf(out, r), services: new Set(out.map(q => q.service)).size };
    }
    /* ---------- Історія та тижнева статистика ---------- */
    const WEEK_NEED = 5;                                    // відзнака 21: бліц складено (>=80%) не менше ніж у 5 з останніх 7 днів
    const histKey = u => 'skillhub_blitz_hist_' + lowLogin(u.login);
    const dayStr = d => { const f = x => String(x).padStart(2, '0'); return `${d.getFullYear()}-${f(d.getMonth() + 1)}-${f(d.getDate())}`; };
    function hist(u) { try { return JSON.parse(lsGet(histKey(u)) || '{}') || {}; } catch (e) { return {}; } }
    function saveHist(u, r) {
        const h = hist(u), cur = h[r.d];
        if (!cur || r.score >= cur.score) h[r.d] = { score: r.score, correct: r.correct, total: r.total, tries: r.tries };
        const keys = Object.keys(h).sort(); while (keys.length > 40) delete h[keys.shift()];
        lsSet(histKey(u), JSON.stringify(h));
    }
    function week(u) {
        // Тиждень починається з першого дня бліца (будь-який день тижня) - він ліворуч;
        // якщо від нього минуло понад 7 днів, вікно «пересувається» на найраніший бліц за останні 7 днів.
        const h = hist(u), now = new Date(), WD = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
        const last7 = []; for (let i = 6; i >= 0; i--) { const d = new Date(now); d.setDate(now.getDate() - i); last7.push(d); }
        const first = last7.find(d => h[dayStr(d)]) || now;
        const days = [], todayK = dayStr(now);
        for (let i = 0; i < 7; i++) {
            const d = new Date(first); d.setDate(first.getDate() + i); const k = dayStr(d);
            days.push({ k: k, wd: WD[d.getDay()], r: h[k] || null, today: k === todayK, future: k > todayK });
        }
        const done = days.filter(x => x.r), passed = days.filter(x => x.r && x.r.score >= 80), perfect = days.filter(x => x.r && x.r.score === 100);
        return { days: days, done: done.length, passed: passed.length, perfect: perfect.length, avg: done.length ? Math.round(done.reduce((a, x) => a + x.r.score, 0) / done.length) : 0 };
    }
    function achievementCodes() {
        const u = me(); if (!u) return [];
        const h = hist(u), out = [], w = week(u);
        if (Object.keys(h).some(k => h[k].score === 100)) out.push('22');
        if (w.passed >= WEEK_NEED) out.push('21');
        return out;
    }
    function renderWeek() {
        const host = $('courseListTitle') || $('courseList'), u = me();
        let el = $('blitzWeekCard');
        if (!host || !u || windowViewingEmployee) { if (el) el.remove(); return; }
        const w = week(u);
        if (!w.done) { if (el) el.remove(); return; }
        if (!el) { el = document.createElement('div'); el.id = 'blitzWeekCard'; el.className = 'bw-card'; host.parentNode.insertBefore(el, host); }
        el.innerHTML = `<div class="bw-head"><b>⚡ Бліц за тиждень</b><span>${w.passed}/7 складено</span></div>
            <div class="bw-bars">${w.days.map(x => `<div class="bw-day${x.today ? ' today' : ''}${x.future ? ' future' : ''}"><div class="bw-col"><i class="${x.r ? (x.r.score === 100 ? 'perf' : x.r.score >= 80 ? 'ok' : 'low') : ''}" style="height:${x.r ? Math.max(8, x.r.score) : 0}%"></i></div><em>${x.r ? x.r.score + '%' : '·'}</em><span>${x.wd}</span></div>`).join('')}</div>
            <div class="bw-sum"><div><b>${w.avg}%</b><span>середній</span></div><div><b>${w.perfect}</b><span>на 100%</span></div><div><b>${w.done}</b><span>днів</span></div></div>`;
    }

    function rec(u) { try { const d = JSON.parse(lsGet(key(u)) || 'null'); return d && d.d === today() ? d : null; } catch (e) { return null; } }
    function isDue(u) {
        if (!u || !eduDb || !eduDb.courses || windowViewingEmployee) return false;
        try { if (detectRoleGroup(u.role) === 'guest') return false; } catch (e) {}
        const d = rec(u); if (d && (d.done || (d.tries || 0) >= MAX_TRIES)) return false;
        try { if (sessionStorage.getItem('skillhub_blitz_skip_' + lowLogin(u.login)) === today()) return false; } catch (e) {}
        return buildBlitz(u).questions.length > 0;
    }

    /* ---------- Вступ ---------- */
    function closeIntro() { const o = $('blitzIntro'); if (o) { o.classList.remove('show'); setTimeout(() => o.remove(), 250); } }
    function afterBlitz() { window.__noWelcome = false; try { if (currentUser && !$('welcomeOverlay') && typeof openWelcome === 'function') openWelcome(); } catch (e) {} }
    function openIntro() {
        const u = me(); if (!u || $('blitzIntro')) return;
        const b = buildBlitz(u), n = b.questions.length, t = (rec(u) || {}).tries || 0; window.__bzPre = { u: lowLogin(u.login), d: today(), b: b };
        const o = document.createElement('div'); o.id = 'blitzIntro'; o.className = 'wl-overlay';
        o.innerHTML = `<div class="wl-box bz-box"><div class="wl-scroll">
            <div class="bz-hero">⚡</div><div class="bz-title">Щоденний бліц</div>
            <div class="bz-stats"><div><b>${n}</b><span>питань</span></div><div><b>${TIME_PER_QUESTION} с</b><span>на питання</span></div><div><b>${t + 1}/${MAX_TRIES}</b><span>спроба</span></div></div>
            <div class="bz-rules">Не згортайте застосунок під час тесту.</div>
            </div><div class="wl-foot"><button class="btn btn-primary" id="bzStart">Почати бліц</button><button class="btn btn-secondary bz-later" id="bzLater">Пізніше</button></div></div>`;
        document.body.appendChild(o); requestAnimationFrame(() => o.classList.add('show'));
        $('bzStart').onclick = () => { closeIntro(); startBlitz(); };
        $('bzLater').onclick = () => { try { sessionStorage.setItem('skillhub_blitz_skip_' + lowLogin(u.login), today()); } catch (e) {} closeIntro(); afterBlitz(); };
    }

    /* ---------- Тест ---------- */
    function startBlitz() {
        const u = me(); if (!u) return;
        // перевірка сесії - у фоні, щоб тест стартував миттєво
        try { checkSessionNow(4000); } catch (e) {}
        const pre = window.__bzPre; window.__bzPre = null;
        const b = (pre && pre.u === lowLogin(u.login) && pre.d === today()) ? pre.b : buildBlitz(u); if (!b.questions.length) { afterBlitz(); return; }
        { const d = rec(u) || { d: today(), tries: 0 }; d.tries = (d.tries || 0) + 1; d.done = false; lsSet(key(u), JSON.stringify(d)); }
        window.__blitzAt = Date.now();
        parsedQuestions = b.questions; window.__blitz = { total: b.questions.length, services: b.services };
        window.sessionTotalTime = 0; window.theoryEntryTime = 0; totalTimeSpent = 0;
        currentQuestionIndex = 0; isTestActive = true; isCheatingTriggered = false;
        switchView('testView'); showQuestion(0);
    }
    function isRight(q) { let any = false, ok = true; q.answers.forEach(a => { if (a.selected) any = true; if (!!a.selected !== a.correct) ok = false; }); return ok && any; }
    function finishBlitz(zero) {
        isTestActive = false; if (testTimerInterval) clearInterval(testTimerInterval);
        const qs = parsedQuestions, total = qs.length;
        const flags = qs.map(q => !zero && isRight(q));
        const correct = flags.filter(Boolean).length, score = total ? Math.round(correct / total * 100) : 0;
        const u = me(), tr = u ? ((rec(u) || {}).tries || 1) : 1, canRetry = !!zero && tr < MAX_TRIES;
        if (u) {
            const r = { d: today(), tries: tr, done: !canRetry, score: score, correct: correct, total: total, cheat: !!zero };
            lsSet(key(u), JSON.stringify(r));
            if (!canRetry) { saveHist(u, r); try { enqueue({ action: 'blitz_save', date: r.d, score: score, correct: correct, total: total, tries: tr }); } catch (e) {} }
        }
        window.__blitz = null;
        const list = zero ? '' : qs.map((q, i) => {
            const mine = q.answers.filter(a => a.selected).map(a => esc(a.text)), right = q.answers.filter(a => a.correct).map(a => esc(a.text));
            return `<div class="bz-item ${flags[i] ? 'ok' : 'bad'}"><div class="bz-q">${q.text}</div>
                ${flags[i] ? `<div class="bz-c">${right.join('; ')}</div>` : `<div class="bz-a">${mine.length ? mine.join('; ') : 'Без відповіді'}</div><div class="bz-c">${right.join('; ')}</div>`}</div>`;
        }).join('');
        requestAnimationFrame(() => {
            $('resultEmoji').innerText = zero ? '🚫' : (score >= 80 ? '🏆' : '⚡');
            $('resultTitle').innerText = zero ? (canRetry ? 'Тест перервано' : 'Бліц зараховано з 0%') : 'Бліц завершено';
            $('resultTitle').style.color = score >= 80 && !zero ? 'var(--success)' : 'var(--danger)';
            if (zero && canRetry) { $('resultSubtitle').innerHTML = 'У вас є ще одна спроба.'; } else $('resultSubtitle').innerHTML = `Правильних: <strong style="font-size:22px; color: var(--text-main); margin: 0 4px;">${correct}</strong> з ${total} · неправильних: <strong style="color: var(--danger);">${total - correct}</strong><br><span style="font-size:14px; margin-top: 6px; display:inline-block;">Результат: ${score}%</span>`;
            $('resultActionContainer').innerHTML = `<div class="bz-review">${list}</div>${canRetry ? '<button class="btn btn-glow" id="bzAgain">СПРОБУВАТИ ЩЕ РАЗ</button>' : ''}<button class="btn ${canRetry ? 'btn-secondary' : 'btn-glow'}" id="bzDone" style="margin-top:12px">ДО КАБІНЕТУ</button>`;
            if ($('bzAgain')) $('bzAgain').onclick = () => startBlitz();
            $('bzDone').onclick = () => { switchView('cabinetView'); renderWeek(); afterBlitz(); };
            switchView('resultView');
        });
    }
    const _submit = submitTest;
    submitTest = function (forceZero) { if (window.__blitz) return finishBlitz(!!forceZero); return _submit.apply(this, arguments); };

    /* ---------- Запуск: при першому вході за день - раніше за цілі ---------- */
    const _prev = switchToMyCabinet;
    switchToMyCabinet = function () {
        if (window.__blitz || $('blitzIntro')) return;   // фонове оновлення/повторний вхід не повинні виривати з тесту
        const u = me(); let due = false;
        try { due = !isTestActive && isDue(u); } catch (e) {}
        if (due) window.__noWelcome = true;
        _prev.apply(this, arguments);
        try { renderWeek(); } catch (e) {}
        if (due) setTimeout(() => { if (currentUser && !isTestActive) openIntro(); else afterBlitz(); }, 350);
    };
    window.Blitz = { achievementCodes: achievementCodes, week: () => week(me()), renderWeek: renderWeek, build: buildBlitz, due: () => isDue(me()), start: openIntro };
})();
