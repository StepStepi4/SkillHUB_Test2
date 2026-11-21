/* Логотип застосунку: серед assets/brand/icon-192(2).png, icon-192(3).png ... береться НАЙНОВІШИЙ (найбільший номер).
   Якщо нових файлів немає (видалено) - стандартний icon-192.png. Застосовується до іконки вкладки, apple-touch-icon і manifest.
   Примітка: іконку вже встановленого на робочий стіл ярлика ОС оновлює сама (Android - під час оновлення WebAPK,
   iOS - лише після перевстановлення ярлика). */
(function () {
    'use strict';
    const KEY = 'skillhub_brand', TTL = 30 * 60 * 1000, MAXN = 9;
    const base = 'assets/brand/';
    const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
    const name = (size, v) => v ? base + 'icon-' + size + v + '.png' : base + 'icon-' + size + '.png';
    let manifestUrl = null;

    function setLink(rel, href, sizes) {
        let l = document.querySelector('link[rel="' + rel + '"]' + (sizes ? '[sizes="' + sizes + '"]' : ''));
        if (!l) { l = document.createElement('link'); l.rel = rel; if (sizes) l.sizes = sizes; document.head.appendChild(l); }
        if (l.getAttribute('href') !== href) l.setAttribute('href', href);
    }
    async function applyManifest(v) {
        try {
            const r = await fetch('manifest.json', { cache: 'no-store' }); const m = await r.json();
            const abs = p => new URL(p, location.href).href;
            m.start_url = abs(m.start_url || './'); m.scope = abs(m.scope || './'); m.id = abs(m.id || './');
            if (v) m.icons = (m.icons || []).map(i => Object.assign({}, i, { src: abs(/512/.test(i.sizes) ? (v.has512 ? name(512, v.v) : name(512, '')) : name(192, v.v)) }));
            else m.icons = (m.icons || []).map(i => Object.assign({}, i, { src: abs(i.src) }));
            const url = URL.createObjectURL(new Blob([JSON.stringify(m)], { type: 'application/manifest+json' }));
            const link = document.querySelector('link[rel="manifest"]'); if (!link) return;
            link.setAttribute('href', url);
            if (manifestUrl) URL.revokeObjectURL(manifestUrl); manifestUrl = url;
        } catch (e) {}
    }
    function apply(v) {            // v = { v: '(3)', has512: bool } або null (стандартний)
        const f = name(192, v && v.v);
        setLink('icon', f); setLink('apple-touch-icon', f);
        window.SKILLHUB_LOGO = f;
        if (v) applyManifest(v);   // без нових файлів manifest.json лишається штатним
        try { document.dispatchEvent(new CustomEvent('skillhub-brand', { detail: f })); } catch (e) {}
    }
    const exists = async url => { try { const r = await fetch(url, { method: 'HEAD', cache: 'no-store' }); return r.ok; } catch (e) { return null; } };
    async function detect() {
        const cand = [];
        for (let n = MAXN; n >= 2; n--) { cand.push('(' + n + ')'); cand.push(' (' + n + ')'); }
        const res = await Promise.all(cand.map(v => exists(name(192, v))));
        if (res.every(x => x === null)) return undefined;               // немає мережі: нічого не міняємо
        const i = res.findIndex(x => x === true);
        if (i < 0) return null;
        const v = cand[i];
        return { v: v, has512: (await exists(name(512, v))) === true };
    }
    let busy = false;
    async function refresh(force) {
        if (busy || !navigator.onLine) return;
        const c = (() => { try { return JSON.parse(ls.get(KEY) || 'null'); } catch (e) { return null; } })();
        if (!force && c && Date.now() - c.t < TTL) return;
        busy = true;
        try {
            const r = await detect();
            if (r === undefined) return;
            const prev = c ? JSON.stringify(c.r) : 'x', now = JSON.stringify(r);
            ls.set(KEY, JSON.stringify({ t: Date.now(), r: r }));
            if (prev !== now) apply(r);
        } finally { busy = false; }
    }
    // миттєво застосовуємо збережений вибір, потім перевіряємо актуальність у фоні
    try { const c = JSON.parse(ls.get(KEY) || 'null'); if (c && c.r) apply(c.r); } catch (e) {}
    window.addEventListener('load', () => setTimeout(() => refresh(false), 1500));
    document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(false); });
    window.refreshBrand = () => refresh(true);
})();
