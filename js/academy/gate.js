/* Стартовий екран входу: без авторизації застосунок недоступний (перший запуск, скидання, вихід, завершена сесія).
   Вхід — це екран loginView Академії, відкритий поверх усього; в самій Академії окремого запиту логіна більше немає. */
(function () {
    const root = document.documentElement;
    const on = () => root.classList.contains('gate-on');
    function show() {
        if (on() && window.Academy && window.Academy.isOpen) return;
        root.classList.add('gate-on');
        try { if (window.Academy && !window.Academy.isOpen) window.Academy.open({ fromPopstate: true }); } catch (e) {}
    }
    function hide() {
        if (!on()) return;
        root.classList.remove('gate-on');
        try { if (!window.__keepAcademy && window.Academy && window.Academy.isOpen) { window.Academy.close({ fromPopstate: true }); } } catch (e) {}
        try { if (location.hash === '#academy') history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
        try { if (!window.__keepAcademy && typeof window.switchTab === 'function') window.switchTab(sessionStorage.getItem('skillhub_active_tab') || 'tab-search'); } catch (e) {}
    }
    // у режимі входу закрити Академію неможливо
    const origClose = window.Academy && window.Academy.close;
    if (origClose) window.Academy.close = function (o) { if (on() && !(o && o.force)) return; return origClose.call(this, o); };
    // будь-який перехід на екран входу (вихід, сесія завершена, інший пристрій) = стартовий екран
    const sv = window.switchView;
    if (typeof sv === 'function') window.switchView = function (id) { const r = sv.apply(this, arguments); if (id === 'loginView') show(); return r; };
    // увійшли -> застосунок розблоковано
    window.addEventListener('skillhub-user', () => { let cu = null; try { cu = currentUser; } catch (e) {} if (cu) hide(); });
    const start = () => { if (on()) show(); };
    if (document.readyState === 'complete') start(); else window.addEventListener('load', start);
})();
