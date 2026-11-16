/* Інструкція: розділи-акордеон. Приклади будуються з реальної бази, яку завантажив додаток
   (картки малюються тим самим кодом, що й у додатку), тому нічого вигаданого тут немає. */
(function () {
    const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const inl = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
    const D = () => (window.SkillDB && window.SkillDB.db()) || {};
    const norm = s => window.SkillDB ? window.SkillDB.norm(s) : String(s || '').toLowerCase();
    const find = (dict, key) => (window.findInDb ? window.findInDb(dict, key) : (dict || {})[key]);
    const clsOf = n => { const u = String(n || '').toUpperCase(); return /SUPPORT|НАШ СЕРВІС/.test(u) ? 'brand-support' : /EKTA|ЕКТА/.test(u) ? 'brand-ekta' : /EPZ|ЕПЗ|ЛІЦЕНЗІЙНЕ ПЗ/.test(u) ? 'brand-epz' : 'brand-settings'; };
    const costText = c => { const raw = String(c == null ? '' : c).trim(); if (!raw) return 'Дізнатись вартість'; if (raw.includes('%')) return raw; const n = parseFloat(raw.replace(/\s+/g, '').replace(',', '.').replace(/[^\d.]/g, '')); return isNaN(n) ? raw : n.toLocaleString('uk-UA') + ' ₴'; };
    const live = h => '<div class="gd-live" aria-hidden="true">' + h + '</div>';
    const P = x => '<p>' + inl(x) + '</p>';
    const note = x => '<p class="gd-note">' + inl(x) + '</p>';
    const ex = (title, inner) => '<div class="gd-ex"><div class="gd-ex-t">' + inl(title) + '</div>' + inner + '</div>';
    const steps = arr => '<ol class="gd-steps">' + arr.map(s => '<li>' + inl(s) + '</li>').join('') + '</ol>';

    function cardFor(t) {
        if (!window.SkillDB) return '';
        const d = find(D().descriptions, t.service);
        const code = t.code || find(D().serviceCodes, t.service) || '';
        return live(window.SkillDB.card({ name: t.service, title: String(t.service).replace(/^\[.*?\]\s*/, ''), cls: clsOf(t.service), label: costText(t.cost), code: code, discount: t.discount || '', isPackage: false, descToggleHTML: window.SkillDB.desc(d, code) }, false, true));
    }
    const tariffs = () => (D().tariffs || []).filter(t => t && t.service);
    const byCat = re => tariffs().filter(t => re.test(String(t.cat || '').toLowerCase()) || re.test(String(t.service || '').toLowerCase()));

    // ---- Приклади з бази ----
    function exSearch() {
        const cats = (D().categories || []).filter(c => c && c.ua && c.service);
        if (!cats.length) return '';
        const c = cats[0], list = String(c.service).split('|').map(x => x.trim()).filter(Boolean);
        return ex('Приклад із вашої бази', steps([
            'У рядку «Яку техніку чи послугу шукаємо?» введіть **' + (c.ua || '') + '** і виберіть її з підказок.',
            'За бажанням впишіть вартість техніки й натисніть **ОК** — відсоткові послуги перерахуються в гривні.',
            'Нижче з’явиться ' + list.length + ' посл. для цієї категорії' + (list[0] ? ', наприклад «' + String(list[0]).replace(/^\[.*?\]\s*/, '') + '»' : '') + '.'
        ]));
    }
    function exCard() {
        const t = tariffs().find(x => x.code && find(D().descriptions, x.service)) || tariffs().find(x => x.code) || tariffs()[0];
        if (!t) return '';
        return ex('Так виглядає картка послуги «' + String(t.service).replace(/^\[.*?\]\s*/, '') + '»', cardFor(t) +
            note('Торкніться картки, щоб розкрити опис. Іконка поруч із кодом копіює його у буфер обміну.'));
    }
    function exMontazh() {
        const m = D().montazhData || {}, svc = m.services || [], cities = m.cities || [];
        const ok = v => v && v !== '-' && v !== '✖' && !String(v).toLowerCase().includes('немає');
        let pick = null;
        for (const s of svc) { for (const c of cities) { if (s.cat && ok((s.availability || {})[c])) { pick = { s: s, c: c }; break; } } if (pick) break; }
        if (!pick) return note('Дані монтажу ще не завантажені. Відкрийте додаток із інтернетом, і тут з’являться ваші міста та послуги.');
        const s = pick.s, city = pick.c;
        const t = tariffs().find(x => norm(x.service) === norm(s.name));
        const price = costText(s.price || (t && t.cost) || '');
        const prov = (String(s.name).match(/^\[(.*?)\]/) || [])[1] || '';
        const avail = String((s.availability || {})[city]);
        const al = avail.toLowerCase(), shown = (al === 'так' || al === '+') ? 'В межах міста' : avail;
        const card = window.SkillDB ? live(window.SkillDB.card({ name: s.name, title: String(s.name).replace(/^\[.*?\]\s*/, ''), brand: prov, cls: clsOf(prov), label: price, isPackage: false, code: s.code || '', discount: (t && t.discount) || '', descToggleHTML: window.SkillDB.desc(find(D().descriptions, s.name), s.code || find(D().serviceCodes, s.name)), availabilityHTML: '<div style="font-size:11px;font-weight:600;color:var(--primary);margin-top:6px;">📍 ' + esc(shown) + '</div>' }, true, true)) : '';
        const bad = cities.find(c => !svc.some(x => ok((x.availability || {})[c])));
        return ex('Приклад із вашої бази', steps([
            'У картці послуги, назва якої містить «монтаж», «підключення» або «встановлення», відкриється вікно **Монтаж ВПТ**.',
            'Оберіть місто: **' + city + '**. У списку міст «✓» — монтаж є, «✕» — немає' + (bad ? ' (наприклад, «' + bad + '»)' : '') + '.',
            'Оберіть категорію: **' + s.cat + '**' + (s.subcat ? ', потім підкатегорію **' + s.subcat + '**' : '') + '.',
            'Нижче з’являться послуги з цінами. Недоступні в місті послуги відображаються сірим блоком «Монтаж у цьому місті відсутній».'
        ]) + card + note('Підпис «' + shown + '» під ціною показує зону виїзду: «В межах міста», передмістя або платний виїзд; колір підпису залежить від зони.'));
    }
    function exSetup() {
        const bad = /монтаж|кухонна|перевірка|поклейка|скло|антивірус|eset|кінотеатр|sweet|сервіси support|сервіси екта/;
        const cats = [...new Set(tariffs().filter(t => t.cat && !bad.test(String(t.cat).toLowerCase())).map(t => t.cat))];
        if (!cats.length) return '';
        const cat = cats[0], items = tariffs().filter(t => t.cat === cat);
        return ex('Приклад із вашої бази', steps([
            'Торкніться послуги з «налаштування» в назві (або будь-якої з категорії налаштувань) — відкриється вікно **Налаштування та сервіси**.',
            'У списку «Оберіть тип сервісу» виберіть категорію, наприклад **' + cat + '** (у базі в ній послуг: ' + items.length + ').',
            'Ціни відсортовано від більшої до меншої. Якщо вказано вартість техніки, відсоткові тарифи будуть у гривнях.'
        ]) + cardFor(items[0]) + (cats.length > 1 ? note('Інші категорії у вашій базі: ' + cats.slice(1, 6).join(', ') + (cats.length > 6 ? ' та ін.' : '.')) : ''));
    }
    function exDirect() {
        const defs = [['Перевірка на биті пікселі', /перевірка|піксел/], ['Поклейка скла та плівок', /поклейка|захисн|скло|плівк/], ['Антивіруси', /антивірус|eset/], ['Онлайн кінотеатри / Parallels', /кінотеатр|sweet|parallels/]];
        const rows = defs.map(d => { const n = byCat(d[1]).length; return n ? '<li><b>' + esc(d[0]) + '</b> — у базі ' + n + ' посл.</li>' : ''; }).join('');
        return rows ? ex('Що з цього є у вашій базі', '<ul class="gd-steps">' + rows + '</ul>') : '';
    }
    function exLinks() {
        const btns = D().skillHubButtons || [];
        const spec = { '--': 'відкриває форму зміни продавця', '%': 'відкриває рейтинг продавців', '@@': 'відкриває довідку по об’єднанню сертифікатів', 'Academy': 'відкриває Academy', 'Calculator_kloch': 'відкриває калькулятор' };
        const li = btns.filter(b => b && b.name).map(b => {
            const l = String(b.link || '').trim();
            let what = spec[l] || (/^academy$/i.test(l) || /education\.html/i.test(l) ? spec.Academy : (/^https?:/i.test(l) ? 'відкриває сайт <b>' + esc((l.match(/^https?:\/\/([^/]+)/) || [])[1]) + '</b> у новій вкладці' : 'виконує свою дію'));
            return '<li><b>' + esc(b.name) + '</b> ' + what + '</li>';
        }).join('');
        return li ? ex('Кнопки SkillHUB у вашій базі', '<ul class="gd-steps">' + li + '</ul>') : '';
    }
    function exReserves() {
        const r = (D().rezervyData || []);
        if (!r.length) return '';
        const stores = [...new Set(r.map(x => x.store).filter(Boolean))];
        return ex('Приклад із вашої бази', P('У списку магазинів зараз ' + stores.length + (stores[0] ? ' (наприклад, «' + stores[0] + '»)' : '') + '; позицій у резервах: ' + r.length + (D().rezervyDate ? '. Останнє оновлення: ' + D().rezervyDate : '') + '.'));
    }

    const CH = [
        { t: 'Початок роботи', f: () => [
            P('Унизу п’ять вкладок: **Пошук**, **Резерви**, **SkillHUB**, **Academy**, **Опції**.'),
            P('Дані завантажуються з бази та зберігаються на пристрої, тому додаток відкривається й без інтернету. Коли зв’язок з’явиться, база оновиться сама.'),
            P('Встановлення на телефон: у меню браузера оберіть «Додати на головний екран».')] },
        { t: 'Пошук техніки і ціна', f: () => [
            P('У вкладці **Пошук** почніть вводити назву техніки чи послуги — з’являться підказки; пошук розуміє українську, російську й англійську назви та помилки розкладки.'),
            P('Після вибору можна ввести вартість техніки й натиснути **ОК** — відсоткові послуги одразу покажуть суму в гривнях.'),
            exSearch()] },
        { t: 'Технічна інформація про техніку', f: () => {
            const c = (D().categories || []).find(x => x && (x.garant || x.negarant || x.expensiveParts));
            return [
                P('Під полем пошуку показується блок із даними категорії: готівка, запчастини, гарантія, пошкодження, фото. Червоний блок «Негарант» — випадки, коли гарантійний ремонт недоступний.'),
                c ? ex('Приклад із вашої бази: «' + (c.ua || '') + '»', '<ul class="gd-steps">' +
                    (c.garant ? '<li><b>Гарантійні випадки:</b> ' + esc(c.garant) + '</li>' : '') +
                    (c.negarant ? '<li><b>Негарантійні випадки:</b> ' + esc(c.negarant) + '</li>' : '') +
                    (c.expensiveParts ? '<li><b>Дорогі запчастини:</b> ' + esc(c.expensiveParts) + '</li>' : '') +
                    (c.garantiya ? '<li><b>Гарантія:</b> ' + esc(c.garantiya) + '</li>' : '') + '</ul>') : ''];
        } },
        { t: 'Послуги: категорії, фільтр, опис, код', f: () => [
            P('Послуги згруповано за брендами: **Support**, **Екта**, **Ліцензійне ПЗ**, **Налаштування**, **Встановлення**, **Інше**. Анімований вогник позначає пріоритетну послугу.'),
            P('Кнопка фільтра біля фото пристрою залишає лише потрібні категорії; повторне натискання скидає вибір.'),
            exCard()] },
        { t: 'Порівняння послуг', f: () => [
            P('Натисніть **Порівняти**, торкніться потрібних карток — унизу з’явиться панель зі статусом вибору та кнопкою **Порівняти**. Вона відкриє таблицю, де видно різницю.'),
            P('Порівняння працює й у вікнах монтажу та налаштувань (кнопка «Порівняти» над списком).')] },
        { t: 'Монтаж ВПТ', f: () => [
            P('Вікно відкривається з послуги, назва якої містить «монтаж», «підключення» чи «встановлення» (крім захисних плівок). Спершу місто, потім категорія і за потреби підкатегорія.'),
            exMontazh()] },
        { t: 'Налаштування техніки та сервіси', f: () => [
            P('Послуги з «налаштування», програмні та сервісні послуги відкривають вікно **Налаштування та сервіси**. Це довідник: оберіть тип сервісу — і побачите всі послуги цього типу з цінами та кодами.'),
            exSetup()] },
        { t: 'Піксели, поклейка, антивіруси, кінотеатри', f: () => [
            P('Для цих послуг є окремі вікна зі списком усіх варіантів одразу: **Перевірка на биті пікселі**, **Поклейка скла та плівок**, **Антивіруси**, **Онлайн кінотеатри / Parallels**. Картки працюють так само: опис, код, порівняння.'),
            exDirect()] },
        { t: 'Робота з посиланнями', f: () => [
            P('**Кнопки SkillHUB.** Якщо в базі для кнопки вказано адресу сайту, вона відкривається в новій вкладці. Особливі значення замість адреси запускають вбудовані функції: «Academy», «Calculator_kloch», «--» (зміна продавця), «%» (рейтинг), «@@» (довідка по сертифікатах).'),
            exLinks(),
            P('**В описах і новинах.** Посилання пишеться як [текст](адреса) — воно стає натискним. Запис [>Текст](адреса) дає кнопку. Повна таблиця оформлення — на сторінці «Format».'),
            note('Посилання відкриваються поза додатком (у браузері), тому для них потрібен інтернет.')] },
        { t: 'Резерви', f: () => [
            P('Оберіть магазин у списку — вибір запам’ятовується. Іконка лупи відкриває швидкий пошук; торкніться позиції, щоб побачити її деталі. Над списком показано дату останнього оновлення.'),
            exReserves()] },
        { t: 'SkillHUB та обране', f: () => [
            P('Кожна кнопка SkillHUB відкриває свою функцію. Кнопка **Додати в обране** дає вибрати функції для швидкого доступу; режим їх показу (угорі, плаваюча кнопка, вимкнено) змінюється в Опціях.')] },
        { t: 'Новини, голосування, зворотній зв’язок', f: () => [
            P('Нові новини мають позначку «НОВЕ»; значок зникає після прочитання. У «Голосувалці» оберіть варіант і підтвердьте. «Зворотній зв’язок» надсилає повідомлення розробнику.')] },
        { t: 'Academy', f: () => [
            P('Вхід — за логіном і паролем, виданими керівником. У кабінеті — курси, цілі, досягнення. Тест: **35 секунд на запитання**; якщо згорнути вікно чи піти з вкладки, спробу зараховано з результатом 0%.'),
            P('Кнопка оновлення підтягує свіжі дані й показує коротке повідомлення. Вийти можна в кабінеті.')] },
        { t: 'Опції', f: () => [
            P('Темна тема, розмір тексту, оновлення бази, режим обраного, значок оновлення на іконці додатка, скидання налаштувань.')] },
        { t: 'Без інтернету і вирішення проблем', f: () => [
            P('Без мережі додаток працює з останніх збережених даних. Є нова версія — закрийте й відкрийте додаток або натисніть «Оновити базу» в Опціях.'),
            P('Дані не завантажуються — перевірте інтернет і оновіть базу; якщо не допомагає, напишіть через «Зворотній зв’язок».')] }
    ];

    function html() {
        return CH.map(function (c, i) {
            let body = '';
            try { body = c.f().filter(Boolean).join(''); } catch (e) { body = ''; }
            return '<details class="gd-ch"><summary><span class="gd-n">' + (i + 1) + '</span><span class="gd-t">' + inl(c.t) + '</span></summary><div class="gd-b">' + body + '</div></details>';
        }).join('');
    }

    window.openGuide = function () {
        const b = document.getElementById('guideBody');
        if (b) b.innerHTML = html();   // щоразу заново — з актуальної бази
        window.openModalBase('guideModal');
    };
})();
