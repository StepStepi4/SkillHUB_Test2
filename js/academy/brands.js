/* Academy: бренд-картки зверху списку курсів (логотип -> статистика проходження курсів бренду).
   Горизонтальний scroll-snap: центральна картка збільшена, сусідні приглушені (як «Snap» у прикладі).
   Підключається після academy.js. Логотипи: assets/service/logo_<бренд>.webp, якщо файлу немає - показується назва. */
(function () {
    const BRANDS = [
        { key: 'ekta', title: 'Екта', logo: 'logo_ekta', re: /екта|ekta/i },
        { key: 'microsoft', title: 'Microsoft', logo: 'logo_microsoft', re: /microsoft|windows|office|майкрософт|віндоус|вiндовс/i },
        { key: 'support', title: 'Support', logo: 'logo_support', re: /support|суппорт|саппорт/i },
        { key: 'eset', title: 'ESET', logo: 'logo_eset', re: /антивір|антивир|eset/i }
    ];
    const esc = s => escapeHTMLAttr(s);
    let state = { sel: 0, brands: [], user: null, raf: 0 };

    function brandOf(group, products) {
        const hay = [group].concat((products || []).map(p => p.product)).join(' ');
        for (const b of BRANDS) if (b.re.test(String(group))) return b;
        for (const b of BRANDS) if (b.re.test(hay)) return b;
        return null;
    }
    function build(user) {
        const res = (user && user.results) || {}, map = {}, rest = [];
        Object.keys(coursesMap).forEach(g => {
            const prods = coursesMap[g] || [], b = brandOf(g, prods);
            let passed = 0, attempts = 0, scoreSum = 0, tried = 0;
            prods.forEach(p => {
                const r = res[p.product] || res[getCleanName(p.product)];
                if (!r) return;
                const pr = parseTestResultString(r);
                if (pr.score >= 80) passed++;
                if (pr.attempts > 0) { attempts += pr.attempts; scoreSum += pr.score; tried++; }
            });
            const gi = { name: g, total: prods.length, passed: passed, attempts: attempts, scoreSum: scoreSum, tried: tried };
            if (!b) { rest.push(gi); return; }
            (map[b.key] = map[b.key] || { brand: b, groups: [] }).groups.push(gi);
        });
        const brands = BRANDS.filter(b => map[b.key]).map(b => map[b.key]);
        brands.forEach(x => ['total', 'passed', 'attempts', 'scoreSum', 'tried'].forEach(k => { x[k] = x.groups.reduce((a, g) => a + g[k], 0); }));
        return { brands: brands, rest: rest };
    }
    function groupRow(g) {
        const parsed = formatWithCustomEmoji(g.name, '📘'), done = g.total > 0 && g.passed === g.total;
        return `<div class="list-card${done ? ' completed' : ''}" onclick="openCourse(this.getAttribute('data-name'))" data-name="${esc(g.name)}">
            <div class="list-card-title" style="flex:1;"><span style="font-size:16px;">${parsed.title}</span></div>
            <div style="display:flex;align-items:center;gap:10px;"><div style="font-size:15px;font-weight:700;color:var(--text-main);">${g.passed} <span style="font-size:13px;font-weight:600;color:var(--text-muted);">/ ${g.total}</span></div><div class="list-card-arrow">❯</div></div></div>`;
    }
    function statsHtml(x) {
        const pct = x.total ? Math.round(x.passed / x.total * 100) : 0, avg = x.tried ? Math.round(x.scoreSum / x.tried) : 0;
        return `<div class="bc-sum"><div><b>${x.passed}<small>/${x.total}</small></b><span>Пройдено</span></div><div><b>${x.tried ? avg + '%' : '—'}</b><span>Середній бал</span></div><div><b>${x.attempts}</b><span>Спроб</span></div></div>
            <div class="bc-bar"><i style="width:${pct}%"></i><em>Прогрес: ${pct}%</em></div>
            <div class="bc-groups">${x.groups.map(groupRow).join('')}</div>`;
    }
    function paintStats() {
        const x = state.brands[state.sel], el = document.getElementById('bcStats');
        if (!x || !el) return;
        el.classList.remove('in'); el.innerHTML = statsHtml(x); void el.offsetWidth; el.classList.add('in');
    }
    function setActive(i, fromScroll) {
        const track = document.getElementById('bcTrack'); if (!track) return;
        [].forEach.call(track.children, (c, k) => c.classList.toggle('active', k === i));
        if (i !== state.sel || !fromScroll) { state.sel = i; paintStats(); }
    }
    function nearest(track) {
        const mid = track.scrollLeft + track.clientWidth / 2; let best = 0, bd = 1e9;
        [].forEach.call(track.children, (c, k) => { const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid); if (d < bd) { bd = d; best = k; } });
        return best;
    }
    function centerOn(track, i, smooth) {
        const c = track.children[i]; if (!c) return;
        track.scrollTo({ left: c.offsetLeft + c.offsetWidth / 2 - track.clientWidth / 2, behavior: smooth ? 'smooth' : 'auto' });
    }
    function mount(user) {
        const host = document.getElementById('courseList'); if (!host) return;
        const b = build(user); state.user = user; state.brands = b.brands;
        if (!b.brands.length) return;                      // немає брендів - лишається звичайний список
        if (state.sel >= b.brands.length) state.sel = 0;
        const cards = b.brands.map((x, i) => `<button type="button" class="bc-card" data-i="${i}" aria-label="${esc(x.brand.title)}">
            <img src="assets/service/${x.brand.logo}.webp" alt="${esc(x.brand.title)}" draggable="false" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'bc-name',textContent:'${esc(x.brand.title)}'}))">
            <i class="bc-chip">${x.passed}/${x.total}</i></button>`).join('');
        host.innerHTML = `<div class="bc-wrap"><div class="bc-track" id="bcTrack">${cards}</div><div class="bc-dots" id="bcDots">${b.brands.map((_, i) => '<i data-i="' + i + '"></i>').join('')}</div><div class="bc-stats" id="bcStats"></div></div>`
            + (b.rest.length ? `<div class="bc-rest">${b.rest.map(groupRow).join('')}</div>` : '');
        const track = document.getElementById('bcTrack');
        track.addEventListener('scroll', () => {
            if (state.raf) return;
            state.raf = requestAnimationFrame(() => {
                state.raf = 0; const i = nearest(track);
                setActive(i, true);
                [].forEach.call(document.querySelectorAll('#bcDots i'), (d, k) => d.classList.toggle('on', k === i));
            });
        }, { passive: true });
        track.addEventListener('click', e => { const c = e.target.closest('.bc-card'); if (c) centerOn(track, +c.dataset.i, true); });
        requestAnimationFrame(() => { centerOn(track, state.sel, false); setActive(state.sel, false); [].forEach.call(document.querySelectorAll('#bcDots i'), (d, k) => d.classList.toggle('on', k === state.sel)); });
    }
    window.BrandCourses = { mount: mount, brands: BRANDS };
})();
