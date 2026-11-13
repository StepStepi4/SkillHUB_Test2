/* Кільцевий журнал помилок сесії для «Діагностики додатку». Зберігається лише в пам'яті сторінки.
   Усі повідомлення проходять редагування: токени, паролі й довгі ідентифікатори приховуються. */
(function () {
    const buf = window.__errLog = [];
    function redact(s) {
        return String(s == null ? '' : s)
            .replace(/(token|passw(?:or)?d|пароль|secret|authorization)(["'\s:=]+)[^\s,"'}&]+/gi, '$1$2«приховано»')
            .replace(/\b\d{8,10}:[A-Za-z0-9_-]{30,}\b/g, '«приховано»')
            .replace(/[A-Za-z0-9_-]{28,}/g, '«id»');
    }
    function push(kind, msg, src) {
        buf.push({ t: Date.now(), kind: kind, msg: redact(msg).slice(0, 400), src: redact(src || '').slice(0, 120) });
        if (buf.length > 60) buf.shift();
    }
    window.__redact = redact;
    window.addEventListener('error', function (e) {
        push('JS', e.message || (e.target && e.target.src ? 'Не завантажено ресурс ' + e.target.src.split('/').pop() : 'error'),
            (e.filename || '').split('/').pop() + (e.lineno ? ':' + e.lineno : ''));
    }, true);
    window.addEventListener('unhandledrejection', function (e) {
        const r = e.reason; push('Promise', r && r.message ? r.message : r);
    });
    const ce = console.error;
    console.error = function () {
        try { push('console', [].map.call(arguments, function (a) { return a && a.message ? a.message : (typeof a === 'object' ? '[об’єкт]' : String(a)); }).join(' ')); } catch (_) {}
        return ce.apply(console, arguments);
    };
})();
