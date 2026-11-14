/* UX: режими кнопки «Обране» (вгорі / плаваюча / вимкнено) та бейдж на іконці додатку */
(function () {
    const KEY = 'skillhub_favmode', POS = 'skillhub_favpos';
    const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
    let mode = ls.get(KEY); if (['top', 'float', 'off'].indexOf(mode) < 0) mode = 'top';
    const FLOAT_TABS = ['tab-search', 'tab-reserves', 'tab-settings'];
    const fl = () => document.getElementById('favFloat');

    function activeTab() { const t = document.querySelector('.app-tab.active'); return t ? t.id : ''; }
    function apply() {
        document.body.setAttribute('data-favmode', mode);
        const f = fl(); if (f) f.style.display = (mode === 'float' && FLOAT_TABS.indexOf(activeTab()) >= 0) ? 'flex' : 'none';
        const sel = document.getElementById('favModeSel'); if (sel && sel.value !== mode) sel.value = mode;
    }
    function place(x, y) {
        const f = fl(); if (!f) return;
        const w = f.offsetWidth || 52, h = f.offsetHeight || 52;
        x = Math.max(6, Math.min(window.innerWidth - w - 6, x)); y = Math.max(6, Math.min(window.innerHeight - h - 6, y));
        f.style.left = x + 'px'; f.style.top = y + 'px'; f.style.right = 'auto'; f.style.bottom = 'auto';
        return [x, y];
    }
    function initFloat() {
        const f = fl(); if (!f) return;
        try { const p = JSON.parse(ls.get(POS) || 'null'); if (p) place(p[0], p[1]); } catch (e) {}
        let timer = null, drag = false, sx = 0, sy = 0, ox = 0, oy = 0, moved = false;
        f.addEventListener('pointerdown', e => {
            sx = e.clientX; sy = e.clientY; const r = f.getBoundingClientRect(); ox = r.left; oy = r.top; moved = false;
            timer = setTimeout(() => { drag = true; document.body.classList.add('no-select'); try { getSelection().removeAllRanges(); } catch (x) {} f.classList.add('drag'); try { f.setPointerCapture(e.pointerId); } catch (x) {} if (navigator.vibrate) navigator.vibrate(15); }, 350);
        });
        f.addEventListener('pointermove', e => {
            if (!drag) { if (Math.abs(e.clientX - sx) > 8 || Math.abs(e.clientY - sy) > 8) clearTimeout(timer); return; }
            moved = true; place(ox + e.clientX - sx, oy + e.clientY - sy); e.preventDefault();
        });
        const end = () => {
            clearTimeout(timer);
            document.body.classList.remove('no-select');
            if (drag) { drag = false; f.classList.remove('drag'); const r = f.getBoundingClientRect(); ls.set(POS, JSON.stringify([Math.round(r.left), Math.round(r.top)])); }
        };
        f.addEventListener('pointerup', end); f.addEventListener('pointercancel', end);
        f.addEventListener('click', e => {
            if (moved) { moved = false; return; }
            const m = document.getElementById('favQuickMenuModal');
            if (m && m.classList.contains('show') && window.closeModalBase) { window.closeModalBase('favQuickMenuModal'); return; }
            if (window.openFavoritesQuickMenu) window.openFavoritesQuickMenu();
        });
        f.addEventListener('contextmenu', e => e.preventDefault());
        window.addEventListener('resize', () => { const r = f.getBoundingClientRect(); if (f.style.left) place(r.left, r.top); });
    }

    /* Відмітка на іконці додатку: непрочитана новина або готове оновлення.
       Працює в встановленому PWA (Android/Chrome, iOS 16.4+ після дозволу сповіщень). */
    const badgeOk = () => ('setAppBadge' in navigator);
    function setBadge() {
        if (!badgeOk()) return;
        const nb = document.getElementById('newsBtn');
        const n = (nb && nb.classList.contains('has-new') ? 1 : 0) + (window._updPending ? 1 : 0);
        try { (n ? navigator.setAppBadge(n) : navigator.clearAppBadge()).catch(() => {}); } catch (e) {}
    }
    function badge() {
        const nb = document.getElementById('newsBtn'); if (!nb) return;
        new MutationObserver(setBadge).observe(nb, { attributes: true, attributeFilter: ['class'] });
        document.addEventListener('skillhub-badge', setBadge);
        document.addEventListener('visibilitychange', setBadge);
        setBadge();
        // рядок у налаштуваннях: потрібен лише там, де відмітка підтримується, але ще не дозволена (iOS)
        const row = document.getElementById('badgeRow'), btn = document.getElementById('badgeBtn');
        if (row && badgeOk() && 'Notification' in window && Notification.permission === 'default') {
            row.style.display = '';
            btn.onclick = () => Notification.requestPermission().then(r => { if (r !== 'default') row.style.display = 'none'; setBadge(); });
        }
    }

    function init() {
        const sel = document.getElementById('favModeSel');
        if (sel) sel.addEventListener('change', () => { mode = sel.value; ls.set(KEY, mode); apply(); });
        initFloat(); badge(); apply();
        const fm = document.getElementById('favQuickMenuModal');
        if (fm) new MutationObserver(() => document.body.classList.toggle('fav-open', fm.classList.contains('show'))).observe(fm, { attributes: true, attributeFilter: ['class'] });
        const mo = new MutationObserver(apply);
        document.querySelectorAll('.app-tab').forEach(t => mo.observe(t, { attributes: true, attributeFilter: ['class'] }));
        document.addEventListener('visibilitychange', () => { if (!document.hidden) apply(); });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
