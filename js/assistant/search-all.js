/* «Пошук»: додаткові джерела - новини, пропозиції/заперечення, курси Академії, співробітники.
   Показуються тільки ті, до яких у користувача є доступ (курси - призначені, співробітники - за роллю). */
(function () {
    const plain = s => String(s == null ? '' : s).replace(/<[^>]*>/g, ' ').replace(/[#*_`>|]/g, ' ').replace(/\s+/g, ' ').trim();
    const cut = (s, n) => s.length > n ? s.slice(0, n - 1) + '…' : s;
    const F = (list, q, fn) => { try { return window.SearchUtil.filter(list, q, fn); } catch (e) { return []; } };

    function openText(title, text) {
        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalBody').innerHTML = '<div class="theory-box">' + RichText.render(String(text || ''), { plain: line => `<div class="theory-line">${RichText.inline(line)}</div>` }) + '</div>';
        window.openModalBase('descModal');
    }
    function whenAcademyReady(fn) {
        window.Academy.open();
        let n = 0; const t = setInterval(() => {
            let ok = false; try { ok = !!(currentUser && eduDb && eduDb.users); } catch (e) {}
            if (ok || ++n > 40) { clearInterval(t); if (ok) setTimeout(fn, 150); }
        }, 100);
    }
    function find(q, db) {
        const out = [];
        // новини
        F(db.news || [], q, n => [plain(n.text)]).slice(0, 2).forEach(n => {
            out.push({ searchType: 'extra', icon: '📰', name: cut(plain(n.text), 70), desc: 'Новини · ' + plain(n.date), run: () => window.openNews(false) });
        });
        // пропозиції сервісів і заперечення
        const talks = [];
        (db.serviceTalks || []).forEach(t => {
            if (t.offer) talks.push({ k: 'Пропозиція', p: t.product, text: t.offer });
            if (t.objection) talks.push({ k: 'Заперечення', p: t.product, text: t.objection });
        });
        F(talks, q, t => [t.p, plain(t.text)]).slice(0, 3).forEach(t => {
            out.push({ searchType: 'extra', icon: '💬', name: t.p, desc: t.k, run: () => openText(t.p + ' — ' + t.k.toLowerCase(), t.text) });
        });
        // курси Академії (тільки призначені)
        let logged = false; try { logged = !!(currentUser && eduDb && eduDb.users); } catch (e) {}
        if (logged) {
            try {
                const courses = [];
                Object.keys(coursesMap).forEach(g => (coursesMap[g] || []).forEach((p, i) => courses.push({ g: g, i: i, p: p.product })));
                F(courses, q, c => [c.p, c.g]).slice(0, 3).forEach(c => {
                    out.push({ searchType: 'extra', icon: '🎓', name: c.p, desc: 'Навчання · ' + String(c.g).replace(/^[^\wА-Яа-яІіЇїЄє]+/, ''), run: () => whenAcademyReady(() => { openCourse(c.g); setTimeout(() => openProduct(c.i), 160); }) });
                });
            } catch (e) {}
            // співробітники (за правами ролі)
            try {
                const emps = getAccessibleEmployeesList().filter(u => u && u.name);
                F(emps, q, u => [u.name, u.login, u.store]).slice(0, 3).forEach(u => {
                    out.push({ searchType: 'extra', icon: '👤', name: u.name, desc: 'Співробітник' + (u.store && u.store !== '-' ? ' · ' + u.store : ''), run: () => whenAcademyReady(() => { try { switchToMyCabinet(); } catch (e) {} setTimeout(() => selectEmployeeFromModal(u.login), 120); }) });
                });
            } catch (e) {}
        }
        return out;
    }
    window.SearchAll = { find: find };
})();
