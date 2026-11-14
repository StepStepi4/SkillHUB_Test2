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
        document.querySelectorAll('#favModeSeg button').forEach(b => b.classList.toggle('on', b.getAttribute('data-m') === mode));
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
            timer = setTimeout(() => { drag = true; f.classList.add('drag'); try { f.setPointerCapture(e.pointerId); } catch (x) {} if (navigator.vibrate) navigator.vibrate(15); }, 350);
        });
        f.addEventListener('pointermove', e => {
            if (!drag) { if (Math.abs(e.clientX - sx) > 8 || Math.abs(e.clientY - sy) > 8) clearTimeout(timer); return; }
            moved = true; place(ox + e.clientX - sx, oy + e.clientY - sy); e.preventDefault();
        });
        const end = () => {
            clearTimeout(timer);
            if (drag) { drag = false; f.classList.remove('drag'); const r = f.getBoundingClientRect(); ls.set(POS, JSON.stringify([Math.round(r.left), Math.round(r.top)])); }
        };
        f.addEventListener('pointerup', end); f.addEventListener('pointercancel', end);
        f.addEventListener('click', e => { if (moved) { moved = false; return; } if (window.openFavoritesQuickMenu) window.openFavoritesQuickMenu(); });
        window.addEventListener('resize', () => { const r = f.getBoundingClientRect(); if (f.style.left) place(r.left, r.top); });
    }

    function badge() {
        const nb = document.getElementById('newsBtn'); if (!nb) return;
        const upd = () => {
            const unread = nb.classList.contains('has-new');
            try { if (unread && navigator.setAppBadge) navigator.setAppBadge(1).catch(() => {}); else if (!unread && navigator.clearAppBadge) navigator.clearAppBadge().catch(() => {}); } catch (e) {}
        };
        new MutationObserver(upd).observe(nb, { attributes: true, attributeFilter: ['class'] }); upd();
    }

    function init() {
        const seg = document.getElementById('favModeSeg');
        if (seg) seg.addEventListener('click', e => { const m = e.target.getAttribute && e.target.getAttribute('data-m'); if (m) { mode = m; ls.set(KEY, m); apply(); } });
        initFloat(); badge(); apply();
        const mo = new MutationObserver(apply);
        document.querySelectorAll('.app-tab').forEach(t => mo.observe(t, { attributes: true, attributeFilter: ['class'] }));
        document.addEventListener('visibilitychange', () => { if (!document.hidden) apply(); });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
