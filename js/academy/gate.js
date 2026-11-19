/* Стартовий екран входу: без авторизації застосунок недоступний (перший запуск, скидання, вихід, завершена сесія).
   Вхід — це екран loginView Академії, відкритий поверх усього; в самій Академії окремого запиту логіна більше немає. */
(function () {
    const root = document.documentElement;
    const on = () => root.classList.contains('gate-on');
    // Показуємо форму входу НЕГАЙНО (без очікування IndexedDB/мережі/події load), ініціалізація Академії - слідом у фоні
    function paintLogin() {
        const r = document.getElementById('academyApp'); if (!r) return;
        r.hidden = false; document.body.classList.add('academy-open');
        const v = document.getElementById('loginView');
        if (v && !v.classList.contains('active')) { document.querySelectorAll('#academyApp .view').forEach(e => e.classList.remove('active')); v.classList.add('active'); }
    }
    function show() {
        root.classList.add('gate-on');
        paintLogin();
        try { if (window.Academy && !window.Academy.isOpen) window.Academy.open({ fromPopstate: true }).catch(() => {}); } catch (e) {}
    }
    function hide() {
        if (!on()) return;
        root.classList.remove('gate-on');
        try { const th = localStorage.getItem('theme') || 'light'; root.style.backgroundColor = th === 'dark' ? '#000000' : '#f2f2f7'; } catch (e) {}
        // після входу лишаємось у кабінеті Академії (привітальне вікно поверх); HUD завантаження каталогу не перекриває кабінет
        root.classList.add('hud-paused');
        try { if (window.Academy && !window.Academy.isOpen) window.Academy.open({ fromPopstate: true }); } catch (e) {}
    }
    // у режимі входу закрити Академію неможливо
    const origClose = window.Academy && window.Academy.close;
    if (origClose) window.Academy.close = function (o) { if (on() && !(o && o.force)) return; root.classList.remove('hud-paused'); return origClose.call(this, o); };
    // будь-який перехід на екран входу (вихід, сесія завершена, інший пристрій) = стартовий екран
    const sv = window.switchView;
    if (typeof sv === 'function') window.switchView = function (id) { const r = sv.apply(this, arguments); if (id === 'loginView') show(); return r; };
    // увійшли -> застосунок розблоковано
    window.addEventListener('skillhub-user', () => { let cu = null; try { cu = currentUser; } catch (e) {} if (cu) hide(); });
    const start = () => { if (on()) show(); };
    start();
    // повторна страховка, якщо щось сховало екран входу
    setTimeout(() => { if (on()) { const r = document.getElementById('academyApp'); if (r && r.hidden) paintLogin(); } }, 1500);
})();
