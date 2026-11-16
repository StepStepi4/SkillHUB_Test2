/* Емодзі → SVG. Якщо в базі (опис, поля, кнопки) стоїть емодзі, що є в таблиці — підставляється
   однотонна SVG-іконка (колір тексту, темна/світла тема працюють автоматично). Невідомі емодзі лишаються як є.
   Додати свою: EmojiIcons.add('🍕', '<path d="..."/>') — шляхи в сітці 24×24 (stroke, без заливки). */
(function () {
    const S = {
        check: '<circle cx="12" cy="12" r="9"/><path d="m8 12.4 2.7 2.7L16 9.6"/>',
        cross: '<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6m0-6-6 6"/>',
        warn: '<path d="M12 4 2.8 19.5h18.4z"/><path d="M12 10v4.5M12 17.2v.1"/>',
        info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.8v.1"/>',
        ask: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.6a2.5 2.5 0 1 1 3.4 2.3c-.7.3-1 .8-1 1.6M12 16.6v.1"/>',
        excl: '<path d="M12 4v10M12 18.5v.1"/>',
        wrench: '<path d="M14.7 6.3a4 4 0 0 0-5.1 5L3.5 17.4a1.8 1.8 0 0 0 2.6 2.6l6.1-6.1a4 4 0 0 0 5-5.1l-2.5 2.5-2.3-.6-.6-2.3z"/>',
        tools: '<path d="m14 7 3-3 3 3-3 3zM17 10 8 19a1.8 1.8 0 0 1-2.6-2.6L14 7.5"/><path d="M6 5l4 4M4.5 6.5 9 11"/>',
        shield: '<path d="M12 3 4.5 6v5.5c0 4.5 3 7.7 7.5 9.5 4.5-1.8 7.5-5 7.5-9.5V6z"/><path d="m9 12 2.2 2.2L15.2 10"/>',
        gear: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="6.6"/><path d="M12 2.6v2.8M12 18.6v2.8M2.6 12h2.8M18.6 12h2.8M5.4 5.4l2 2M16.6 16.6l2 2M18.6 5.4l-2 2M7.4 16.6l-2 2"/>',
        money: '<rect x="2.8" y="6.5" width="18.4" height="11" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6 12h.1M18 12h.1"/>',
        card: '<rect x="2.8" y="5.5" width="18.4" height="13" rx="2.2"/><path d="M2.8 10h18.4M6.5 14.5h3.5"/>',
        phone: '<rect x="7" y="2.8" width="10" height="18.4" rx="2.4"/><path d="M11 18.2h2"/>',
        laptop: '<rect x="5" y="5" width="14" height="10" rx="1.6"/><path d="M2.8 19h18.4"/>',
        desktop: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M9 20h6M12 16v4"/>',
        tv: '<rect x="3" y="7" width="18" height="12" rx="2"/><path d="m8 3 4 4 4-4"/>',
        film: '<rect x="3" y="9" width="18" height="11" rx="2"/><path d="m3 9 2.5-5 3 .6L6 9.5M10 4.8l3 .6L10.5 10M15 5.6l3 .6L15.5 10.5"/>',
        key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 8-8m-3 3 2.5 2.5M14 9l2 2"/>',
        recycle: '<path d="M20 11a8 8 0 0 0-14.3-4.6L4 8.5M4 4v4.5h4.5M4 13a8 8 0 0 0 14.3 4.6l1.7-2.1M20 20v-4.5h-4.5"/>',
        camera: '<path d="M4 8h3l1.6-2.5h6.8L17 8h3a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 20 19H4a1.5 1.5 0 0 1-1.5-1.5v-8A1.5 1.5 0 0 1 4 8z"/><circle cx="12" cy="13.2" r="3.4"/>',
        gift: '<rect x="3.5" y="8.5" width="17" height="4" rx="1"/><path d="M5 12.5V20h14v-7.5M12 8.5V20M12 8.5C10 8.5 7.5 8 7.5 6a2 2 0 0 1 4.5 .5M12 8.5c2 0 4.5-.5 4.5-2.5a2 2 0 0 0-4.5.5"/>',
        star: '<path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9l-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z"/>',
        sparkle: '<path d="M12 3v5M12 16v5M3 12h5M16 12h5M6.5 6.5l2.5 2.5M15 15l2.5 2.5M17.5 6.5 15 9M9 15l-2.5 2.5"/>',
        call: '<path d="M6.6 3.5h3l1.4 4-2 1.3a11 11 0 0 0 5.2 5.2l1.3-2 4 1.4v3a2.2 2.2 0 0 1-2.4 2.2A16.5 16.5 0 0 1 4.4 5.9 2.2 2.2 0 0 1 6.6 3.5z"/>',
        calendar: '<rect x="3.5" y="5" width="17" height="15" rx="2.2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
        clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>',
        box: '<path d="m12 3 8.5 4.5v9L12 21l-8.5-4.5v-9z"/><path d="m3.5 7.5 8.5 4.5 8.5-4.5M12 12v9"/>',
        truck: '<path d="M2.8 6.5h11v10h-11zM13.8 10h4l3 3.2v3.3h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
        lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
        battery: '<rect x="2.8" y="7.5" width="16" height="9" rx="2"/><path d="M21.5 11v2M6 12h5"/>',
        headphones: '<path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/>',
        gamepad: '<rect x="2.8" y="7.5" width="18.4" height="10" rx="4"/><path d="M7.5 10.5v4M5.5 12.5h4M15.5 11.5h.1M18 13.5h.1"/>',
        tag: '<path d="M3.5 12.5V4.5h8l9 9-8 8z"/><circle cx="8" cy="9" r="1.2"/>',
        pin: '<path d="M12 21s6.5-5.8 6.5-11A6.5 6.5 0 0 0 5.5 10c0 5.2 6.5 11 6.5 11z"/><circle cx="12" cy="10" r="2.4"/>',
        note: '<path d="M6 3.5h9l3.5 3.5v13.5H6z"/><path d="M14.5 3.5V7h4M9 11.5h6M9 15h6"/>',
        bell: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.8 2H4.2zM10 20.5a2.2 2.2 0 0 0 4 0"/>',
        bulb: '<path d="M9 17.5h6M10 20.5h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2v.6h5v-.6c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/>',
        refresh: '<path d="M20 11a8 8 0 0 0-14.3-4.6L4 8.5M4 4v4.5h4.5M4 13a8 8 0 0 0 14.3 4.6l1.7-2.1M20 20v-4.5h-4.5"/>',
        cart: '<path d="M2.8 4h3l2.4 11h10.3l2-8H7"/><circle cx="9.5" cy="19.2" r="1.5"/><circle cx="17.5" cy="19.2" r="1.5"/>',
        home: '<path d="m3.5 11 8.5-7.5 8.5 7.5M5.5 9.5V20.5h13V9.5M10 20.5v-5.5h4v5.5"/>',
        user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/>',
        users: '<circle cx="9" cy="8.5" r="3.5"/><path d="M2.8 20a6.2 6.2 0 0 1 12.4 0M16 5.2a3.5 3.5 0 0 1 0 6.6M18 14.4a6 6 0 0 1 3.2 5.6"/>',
        arrow: '<path d="M4 12h15m-5.5-5.5L19 12l-5.5 5.5"/>',
        dot: '<circle cx="12" cy="12" r="3.2"/>',
        diamond: '<path d="m12 4 8 8-8 8-8-8z"/>',
        target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>',
        chart: '<path d="M4 20.5h16M7 17v-5M12 17V7M17 17v-8"/>',
        signal: '<path d="M5 18.5v-3M10 18.5v-6.5M15 18.5V8M20 18.5V4.5"/>',
        printer: '<path d="M7 9V3.5h10V9M7 17H4.5v-8h15v8H17M7 14h10v6.5H7z"/>',
        keyboard: '<rect x="2.8" y="6.5" width="18.4" height="11" rx="2"/><path d="M6.5 10.5h.1M10 10.5h.1M14 10.5h.1M17.5 10.5h.1M8 14h8"/>',
        mouse: '<rect x="6.5" y="3" width="11" height="18" rx="5.5"/><path d="M12 7v3.5"/>',
        mega: '<path d="M4 10h3.5L15 6v12l-7.5-4H4a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1zM7.5 14l1 4.5h2.5l-1-3.5M18.5 9.5a4 4 0 0 1 0 5"/>',
        percent: '<path d="M18.5 5.5 5.5 18.5"/><circle cx="7.5" cy="7.5" r="2.3"/><circle cx="16.5" cy="16.5" r="2.3"/>',
        trophy: '<path d="M8 4h8v6a4 4 0 0 1-8 0zM8 6H4.5v1.5A3.5 3.5 0 0 0 8 11M16 6h3.5v1.5A3.5 3.5 0 0 1 16 11M12 14v4M8.5 20.5h7M9.5 18h5"/>',
        calc: '<rect x="5" y="3" width="14" height="18" rx="2.4"/><rect x="8" y="6" width="8" height="3.5" rx=".8"/><path d="M8.5 13h.1M12 13h.1M15.5 13h.1M8.5 16.5h.1M12 16.5h.1M15.5 16.5h.1"/>',
        medal1: '<circle cx="12" cy="12" r="9"/><path d="M10 9.8 12.3 8v8"/>',
        medal2: '<circle cx="12" cy="12" r="9"/><path d="M9.3 9.6a2.7 2.2 0 1 1 4.6 1.6L9.2 16h5.6"/>',
        medal3: '<circle cx="12" cy="12" r="9"/><path d="M9.4 8.8h5l-2.6 3.1a2.6 2.5 0 1 1-2.2 3.9"/>',
        wave: '<path d="M8 12V6.5a1.5 1.5 0 0 1 3 0V11M11 10V4.8a1.5 1.5 0 0 1 3 0V10M14 10V6.3a1.5 1.5 0 0 1 3 0V13c0 4.4-2.3 7.5-6 7.5-2.2 0-3.6-1-4.7-2.7L3.8 13.6a1.5 1.5 0 0 1 2.4-1.7L8 14"/>',
        book: '<path d="M5 4.5h11a3 3 0 0 1 3 3v12H8a3 3 0 0 1-3-3z"/><path d="M5 16.5a3 3 0 0 1 3-3h11"/>',
        bookopen: '<path d="M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5c-3.5-.5-6.5 0-8.5 1.5zM12 6.5v13"/>',
        books: '<rect x="4" y="4" width="4.5" height="16" rx="1"/><rect x="10" y="4" width="4.5" height="16" rx="1"/><path d="m16.5 6.5 4 1-3.4 12.6-4-1z"/>',
        heart: '<path d="M12 20s-7.5-4.6-7.5-10.3A4.2 4.2 0 0 1 12 7.4a4.2 4.2 0 0 1 7.5 2.3C19.5 15.4 12 20 12 20z"/>',
        plus: '<path d="M12 5v14M5 12h14"/>',
        search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/>',
        puzzle: '<path d="M10 4.5a2 2 0 1 1 4 0V7h4.5v4H21a2 2 0 1 1 0 4h-2.5v5H14v-2.5a2 2 0 1 0-4 0V20H5.5v-5H8a2 2 0 1 0 0-4H5.5V7H10z"/>',
        compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
        gdot: '<circle cx="12" cy="12" r="6" fill="#16a34a" stroke="none"/>',
        rdot: '<circle cx="12" cy="12" r="6" fill="#dc2626" stroke="none"/>',
        ydot: '<circle cx="12" cy="12" r="6" fill="#eab308" stroke="none"/>',
        bdot: '<circle cx="12" cy="12" r="6" fill="#2563eb" stroke="none"/>',
        chevr: '<path d="m9 6 6 6-6 6"/>',
        chevl: '<path d="m15 6-6 6 6 6"/>',
        sort: '<path d="M8 5v14m0 0-3-3m3 3 3-3M16 19V5m0 0-3 3m3-3 3 3"/>',
        speak: '<path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H11l-4.5 4v-4h0A2.5 2.5 0 0 1 4 13.5z"/>',
        food: '<path d="M7 3v8a2 2 0 0 0 4 0V3M9 3v18M17 3c-2 2-2.5 5-2.5 8h2.5v10"/>',
        up: '<path d="M12 19V5m-6 6 6-6 6 6"/>',
        down: '<path d="M12 5v14m-6-6 6 6 6-6"/>',
        mail: '<rect x="3" y="5.5" width="18" height="13" rx="2.2"/><path d="m3.5 7.5 8.5 6 8.5-6"/>',
        globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.6 3.6 5.7 3.6 9s-1 6.4-3.6 9c-2.6-2.6-3.6-5.7-3.6-9s1-6.4 3.6-9z"/>',
        link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3A4 4 0 0 0 13 5.3l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3A4 4 0 0 0 11 18.7l1-1"/>',
        eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
        trash: '<path d="M4.5 7h15M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v6M14 11v6"/>',
        edit: '<path d="m4 20 1-4.5L16.5 4a2 2 0 0 1 3 3L8 18.5z"/>',
        lightning: '<path d="M13 3 5 13.5h6L10 21l8-10.5h-6z"/>',
        sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7"/>',
        moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
        cloud: '<path d="M7 18a4.5 4.5 0 0 1-.6-9A6 6 0 0 1 18 9.5 4.3 4.3 0 0 1 17 18z"/>',
        cap: '<path d="m2.5 9.5 9.5-5 9.5 5-9.5 5z"/><path d="M6.5 12v4.5c0 1.4 2.5 2.8 5.5 2.8s5.5-1.4 5.5-2.8V12M21.5 9.5v6"/>',
        store: '<path d="M4 9.5 5.5 4h13L20 9.5M4 9.5a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0M5.5 12.5V20h13v-7.5M10 20v-4.5h4V20"/>',
        bag: '<path d="M5 8h14l-1 12.5H6zM9 8V6.5a3 3 0 0 1 6 0V8"/>',
        rocket: '<path d="M12 3c3.5 2 5.5 5.5 5 10l-3 3h-4l-3-3c-.5-4.500 1.500-8 5-10zM9 16l-2.500 4.500 4-1M15 16l2.500 4.500-4-1"/><circle cx="12" cy="10" r="1.800"/>',
        toolbox: '<rect x="3" y="8" width="18" height="12" rx="2.200"/><path d="M8.500 8V5.500h7V8M3 13h18M10.500 13v2.500h3V13"/>',
        plug: '<path d="M9 3v5M15 3v5M6.500 8h11v3a5.500 5.500 0 0 1-11 0zM12 16.500V21"/>',
        save: '<path d="M5 4h11l3.500 3.500V20H5z"/><path d="M8 4v5h7V4M8 20v-6h8v6"/>',
        image: '<rect x="3.500" y="4.500" width="17" height="15" rx="2.500"/><circle cx="9" cy="10" r="1.800"/><path d="m4 17 5-4.500 3.500 3 3-2.500 4.500 4"/>',
        music: '<path d="M9 18V6l10-2v12"/><circle cx="6.500" cy="18" r="2.500"/><circle cx="16.500" cy="16" r="2.500"/>',
        video: '<rect x="3" y="6.500" width="12.500" height="11" rx="2.200"/><path d="m15.500 10.500 5.500-3v9l-5.500-3"/>',
        mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.500 11.500a6.500 6.500 0 0 0 13 0M12 18v3"/>',
        speaker: '<path d="M4 9.500h3.500L12 5.500v13l-4.500-4H4zM15.500 9a4 4 0 0 1 0 6M18 6.500a7.500 7.500 0 0 1 0 11"/>',
        watch: '<rect x="7" y="6.500" width="10" height="11" rx="3"/><path d="M9 6.500 10 3h4l1 3.500M9 17.500 10 21h4l1-3.500M12 10v2.500l1.500 1"/>',
        broom: '<path d="m14 4 6 6M13 5l-4.500 6.500M8.500 11.500 4 21c4-.5 8-2 10.500-6.500zM7.500 16c1.500.5 3 .3 4.500-.5"/>',
        disc: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.500"/><path d="M12 3a9 9 0 0 1 9 9"/>',
        thermo: '<path d="M10 14.500V5a2 2 0 0 1 4 0v9.500a4 4 0 1 1-4 0zM12 9v7"/>',
        drop: '<path d="M12 3.500c3.500 4 6 7 6 10.500a6 6 0 0 1-12 0c0-3.500 2.500-6.500 6-10.500z"/>',
        fan: '<circle cx="12" cy="12" r="1.800"/><path d="M12 10.200C11 6 12 3.500 14.500 4s2.500 3.500-.7 6.200M13.800 13c4 1.500 6 .5 5.500-2s-3.500-2.500-6.200.7M10.200 13.800c-.5 4.200-2.500 5.700-4.500 4.200s-.5-4 3.500-4.700"/>',
        snow: '<path d="M12 3v18M4.200 7.500l15.600 9M4.200 16.500l15.600-9M9.500 4.500 12 6.500l2.500-2M9.500 19.500 12 17.500l2.500 2"/>',
        flash: '<path d="M13 3 5 13.500h6L10 21l8-10.500h-6z"/>',
        wifi: '<path d="M3 9a13 13 0 0 1 18 0M6 12.500a9 9 0 0 1 12 0M9 16a5 5 0 0 1 6 0M12 19.500h.1"/>',
        usb: '<path d="M12 3v14M9 6l3-3 3 3M5.500 12v2a2 2 0 0 0 2 2H12M18.500 10v3a2 2 0 0 1-2 2H12"/><circle cx="12" cy="19" r="2"/>',
        rubl: '<path d="M7 20V4h6a4 4 0 0 1 0 8H7M5 16h9"/>',
        flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
        crown: '<path d="m3.500 18 1.500-10 5 4.500 2-7 2 7 5-4.500 1.500 10zM4 20.500h16"/>',
        diamondgem: '<path d="M6 4h12l3.500 5L12 20.500 2.500 9zM2.500 9h19M9 4l3 5 3-5M12 20.500 9 9M12 20.500 15 9"/>',
        car: '<path d="M4 15.500V12l2-5h12l2 5v3.500zM4 15.500V18h3v-2.500M20 15.500V18h-3v-2.500M4 12h16"/><circle cx="7.500" cy="14" r=".6"/><circle cx="16.500" cy="14" r=".6"/>',
        clip: '<path d="m17 10-6.500 6.500a2.500 2.500 0 0 1-3.500-3.500L14 6a4 4 0 0 1 5.500 5.500L12 19a5.500 5.500 0 0 1-8-7.500"/>',
        unlock: '<rect x="5" y="11" width="14" height="9.500" rx="2.200"/><path d="M8 11V7.500a4 4 0 0 1 7.700-1.500"/>',
        trenddown: '<path d="m3.500 7 6 6 4-4 7 7M20.500 11.500V16.500h-5"/>',
        ballot: '<path d="M4 14h16v6H4zM8 14V9.500M16 14V9.500M9 4l3 4 3-4"/><path d="M11 9l1 1 2-2"/>',
        scale: '<path d="M12 4v16M7 20h10M5 7h14M5 7l-2.500 6a3 3 0 0 0 5 0zM19 7l-2.500 6a3 3 0 0 0 5 0z"/>',
        radio: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.500" fill="currentColor"/>',
        hand: '<path d="M8 12V5.500a1.500 1.500 0 0 1 3 0V11M11 10V4a1.500 1.500 0 0 1 3 0v6.500M14 10V5.500a1.500 1.500 0 0 1 3 0V13M17 9.500a1.500 1.500 0 0 1 3 0V15a6 6 0 0 1-6 6h-1.500a6 6 0 0 1-5-2.700L4.500 14c-.6-1 .4-2.200 1.500-1.700L8 14"/>',
        pencil: '<path d="m4 20 1-4.500L16.500 4a2.100 2.100 0 0 1 3 3L8 18.500zM14.500 6l3 3"/>',
        top: '<path d="M5 4h14M12 20V9M7 13.500l5-5 5 5"/>',
        free: '<rect x="3" y="6" width="18" height="12" rx="2.500"/><path d="M8 15v-6h3M8 12h2.500M13.500 15v-6h2a1.700 1.700 0 0 1 0 3.500h-2M15.800 12.500 17 15"/>',
        minus: '<path d="M5 12h14"/>',
        plus: '<path d="M12 5v14M5 12h14"/>',
        infinity: '<path d="M12 12c-2-3-4-4.500-6-4.500a4.500 4.500 0 0 0 0 9c2 0 4-1.500 6-4.500zm0 0c2 3 4 4.500 6 4.500a4.500 4.500 0 0 0 0-9c-2 0-4 1.500-6 4.500z"/>',
        idcard: '<rect x="3" y="5.500" width="18" height="13" rx="2.500"/><circle cx="9" cy="11" r="2"/><path d="M5.800 16c.5-1.800 1.800-2.600 3.200-2.600s2.700.8 3.200 2.600M14.500 10h4M14.500 13.500h3"/>',
        paw: '<path d="M8.500 20c-2 0-3-1.500-2-3.500 1-2 3-5 5.500-5s4.500 3 5.500 5-.5 3.500-2.500 3.500c-1.500 0-2-.8-3-.8s-1.500.8-3.500.8z"/><circle cx="6" cy="10" r="1.500"/><circle cx="10" cy="6.500" r="1.500"/><circle cx="14.500" cy="6.500" r="1.500"/><circle cx="18" cy="10" r="1.500"/>',
        leaf: '<path d="M5 19c0-9 5-14 14-14 0 9-5 14-14 14zM5 19l8-8"/>',
        plane: '<path d="M21 3 3 10.500l6.500 2.500L12 20l2.500-6.500zM9.500 13 21 3"/>',
        ball: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
        folder: '<path d="M3 7.500V18a1.500 1.500 0 0 0 1.500 1.500h15A1.500 1.500 0 0 0 21 18V9a1.500 1.500 0 0 0-1.500-1.500H12L10 5H4.500A1.500 1.500 0 0 0 3 6.500z"/>',
        play: '<path d="M8 5v14l11-7z"/>',
        square: '<rect x="5" y="5" width="14" height="14" rx="2.500" fill="currentColor"/>',
        ring: '<circle cx="12" cy="12" r="8"/>',
        tri: '<path d="M12 4 21 19H3z"/>',
        cup: '<path d="M5 8h12v6a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5zM17 9.500h1.500a2.500 2.500 0 0 1 0 5H17M8 3.500v2M12 3.500v2"/>',
        skull: '<path d="M12 3.500c4 0 7 2.700 7 6.500 0 2.200-1 3.800-2.500 4.800V18h-9v-3.200C6 13.800 5 12.200 5 10c0-3.800 3-6.500 7-6.500zM9.500 18v2.500M14.500 18v2.500"/><circle cx="9.500" cy="10.500" r="1.200"/><circle cx="14.500" cy="10.500" r="1.200"/>',
        building: '<path d="M5 20.500V4h9v16.500M14 9h5v11.500M3 20.500h18M8 8h3M8 12h3M8 16h3"/>',
        flame: '<path d="M12 3c.5 3.3 4.8 5.4 4.8 10a4.8 4.8 0 0 1-9.6 0c0-1.7.8-2.8 1.7-3.8.2 1.2.9 1.9 1.6 2C10.2 8.6 10.6 5.6 12 3z"/>'
    };
    const MAP = {
        '✅': 'check', '✔️': 'check', '✔': 'check', '✓': 'check', '☑️': 'check', '👍': 'check', '🆗': 'check',
        '❌': 'cross', '✖️': 'cross', '✕': 'cross', '❎': 'cross', '🚫': 'cross', '⛔': 'cross', '👎': 'cross',
        '⚠️': 'warn', '⚠': 'warn', '🚨': 'warn', 'ℹ️': 'info', 'ℹ': 'info', '❓': 'ask', '❔': 'ask', '❗': 'excl', '❕': 'excl', '‼️': 'excl',
        '🔧': 'wrench', '🛠️': 'tools', '🛠': 'tools', '🔨': 'tools', '⚒️': 'tools', '🛡️': 'shield', '🛡': 'shield',
        '⚙️': 'gear', '⚙': 'gear',
        '💰': 'money', '💵': 'money', '💴': 'money', '💶': 'money', '💷': 'money', '💸': 'money', '🪙': 'money', '💳': 'card', '🧾': 'note',
        '📱': 'phone', '📲': 'phone', '💻': 'laptop', '🖥️': 'desktop', '🖥': 'desktop', '📺': 'tv', '📟': 'phone',
        '🎬': 'film', '🎥': 'film', '📽️': 'film', '🍿': 'film', '🔑': 'key', '🗝️': 'key', '♻️': 'recycle', '♻': 'recycle',
        '📷': 'camera', '📸': 'camera', '🎁': 'gift', '⭐': 'star', '🌟': 'star', '✨': 'sparkle', '🆕': 'star',
        '📞': 'call', '☎️': 'call', '☎': 'call', '📅': 'calendar', '📆': 'calendar', '⏱️': 'clock', '⏱': 'clock', '⏰': 'clock', '🕐': 'clock', '⌛': 'clock', '⏳': 'clock',
        '📦': 'box', '🚚': 'truck', '🚛': 'truck', '🔒': 'lock', '🔐': 'lock', '🔋': 'battery', '🎧': 'headphones', '🎮': 'gamepad', '🏷️': 'tag', '🏷': 'tag',
        '📌': 'pin', '📍': 'pin', '📝': 'note', '📋': 'note', '📄': 'note', '🔔': 'bell', '💡': 'bulb', '🔄': 'refresh', '🔁': 'refresh',
        '🛒': 'cart', '🏠': 'home', '🏢': 'home', '👤': 'user', '👥': 'users', '👉': 'arrow', '➡️': 'arrow', '➡': 'arrow', '▶️': 'arrow', '👇': 'arrow',
        '🏆': 'trophy', '🏅': 'trophy', '🧮': 'calc', '🥇': 'medal1', '🥈': 'medal2', '🥉': 'medal3', '🗓️': 'calendar', '🗓': 'calendar',
        '👋': 'wave', '🤝': 'wave', '📘': 'book', '📕': 'book', '📗': 'book', '📙': 'book', '📚': 'books', '📖': 'bookopen', '🫶': 'heart', '❤️': 'heart', '💙': 'heart', '💛': 'heart', '♥️': 'heart',
        '➕': 'plus', '🔍': 'search', '🔎': 'search', '🧩': 'puzzle', '🧭': 'compass', '⭐️': 'star', '🟢': 'gdot', '🔴': 'rdot', '🟡': 'ydot', '🟠': 'ydot', '🔵': 'bdot', '⚪': 'dot', '⚫': 'dot',
        '❯': 'chevr', '❮': 'chevl', '✦': 'sparkle', '➔': 'arrow', '↕': 'sort', '🗣️': 'speak', '🗣': 'speak', '💬': 'speak', '🍽️': 'food', '⬆️': 'up', '⬇️': 'down', '🔼': 'up', '🔽': 'down',
        '✉️': 'mail', '📧': 'mail', '📩': 'mail', '🌐': 'globe', '🔗': 'link', '👁️': 'eye', '👀': 'eye', '🗑️': 'trash', '✏️': 'edit', '🖊️': 'edit', '⚡': 'lightning', '☀️': 'sun', '🌙': 'moon', '☁️': 'cloud',
        '🎓': 'cap', '🏪': 'store', '🏬': 'store', '🛍️': 'bag', '🛍': 'bag', '🚀': 'rocket', '🧰': 'toolbox', '🔌': 'plug', '💾': 'save', '💿': 'disc', '📀': 'disc', '🖼️': 'image', '🖼': 'image',
        '🎵': 'music', '🎶': 'music', '📹': 'video', '📼': 'video', '🎤': 'mic', '🎙️': 'mic', '🔊': 'speaker', '🔉': 'speaker', '📻': 'speaker', '⌚': 'watch', '🧹': 'broom', '🌡️': 'thermo', '🌡': 'thermo',
        '💧': 'drop', '🚿': 'drop', '🌀': 'fan', '❄️': 'snow', '🧊': 'snow', '🔆': 'sun', '📡': 'wifi', '🛜': 'wifi', '🔰': 'shield', '🏁': 'flag', '🚩': 'flag', '👑': 'crown', '💎': 'diamondgem',
        '🔥': 'flame', '🥂': 'gift', '🎉': 'gift', '🎊': 'gift', '🧠': 'bulb', '🤖': 'gear', '🕹️': 'gamepad', '🎲': 'puzzle', '👨‍💼': 'user', '👩‍💼': 'user', '🧑‍💼': 'user',
        '📲': 'phone', '🔭': 'search', '🧯': 'flame', '🛋️': 'home', '🪑': 'home', '🍳': 'food', '☕': 'food', '🥤': 'food', '🧴': 'drop', '🪫': 'battery', '🔦': 'bulb', '📐': 'tools', '📏': 'tools', '✂️': 'tools', '🖌️': 'edit', '🎨': 'edit',
        '🔘': 'radio', '💥': 'sparkle', '🚗': 'car', '🚙': 'car', '📎': 'clip', '🖇️': 'clip', '🔓': 'unlock', '📉': 'trenddown', '🗳️': 'ballot', '🗳': 'ballot', '⚖️': 'scale', '⚖': 'scale',
        '✍️': 'pencil', '✍': 'pencil', '🖍️': 'pencil', '🖍': 'pencil', '✏️': 'pencil', '👏': 'hand', '🙌': 'hand', '🙏': 'hand', '💪': 'hand', '👌': 'check', '✌️': 'hand', '✌': 'hand', '☝️': 'arrow', '☝': 'arrow',
        '👈': 'arrow', '👆': 'arrow', '⬅️': 'arrow', '⬅': 'arrow', '🔝': 'top', '🆓': 'free',
        '♾️': 'infinity', '🪪': 'idcard', '🧑‍💻': 'user', '👨‍💻': 'user', '👩‍💻': 'user', '☠️': 'skull', '💀': 'skull', '⭕': 'ring', '✈️': 'plane', '🛫': 'plane', '🛬': 'plane', '🏦': 'building', '🏭': 'building', '🏥': 'building', '🏨': 'building',
        '⚪': 'ring', '⚫': 'radio', '▫️': 'square', '⚰️': 'box', '⚱️': 'box', '⚧️': 'user', '⛹️': 'user',
        '➖': 'minus', '➕': 'plus', '🔹': 'dot', '🔸': 'dot', '▫️': 'dot', '•': 'dot', '🔷': 'diamond', '🔶': 'diamond', '🎯': 'target', '📊': 'chart', '📈': 'chart', '📶': 'signal',
        '🖨️': 'printer', '⌨️': 'keyboard', '🖱️': 'mouse', '📢': 'mega', '📣': 'mega', '💯': 'percent', '🔥': 'flame'
    };
    const norm = v => String(v || '').trim().replace(/️/g, '');
    const NORM = {}; Object.keys(MAP).forEach(k => { NORM[norm(k)] = MAP[k]; });
    function svg(emoji, cls) {
        const name = NORM[norm(emoji)]; if (!name) return null;
        return `<svg class="ei ${cls || ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${S[name]}</svg>`;
    }
    const RX = /([\u{1F1E6}-\u{1F1FF}]{2}|\p{Extended_Pictographic}\uFE0F?(?:\u200D\p{Extended_Pictographic}\uFE0F?)*)|[✕✖✓✔❯❮➔↕✦]/gu;
    const SKIP = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEXTAREA: 1, INPUT: 1, OPTION: 1, SELECT: 1, TITLE: 1, SVG: 1, CODE: 1 };
    // Резервна категорія за діапазоном Unicode — щоб жоден емодзі не став «крапкою»
    const RANGES = [
        [0x1F550, 0x1F567, 'clock'], [0x23E9, 0x23EF, 'play'], [0x23F8, 0x23FA, 'play'], [0x25C0, 0x25C0, 'play'],
        [0x2194, 0x21AA, 'arrow'], [0x2934, 0x2935, 'arrow'], [0x2B05, 0x2B07, 'arrow'], [0x1F500, 0x1F503, 'refresh'], [0x1F519, 0x1F51D, 'arrow'],
        [0x1F7E0, 0x1F7EB, 'square'], [0x2B1B, 0x2B1C, 'square'], [0x25FB, 0x25FE, 'square'], [0x25AA, 0x25AB, 'square'], [0x1F532, 0x1F533, 'square'], [0x1F534, 0x1F534, 'rdot'], [0x1F53A, 0x1F53B, 'tri'],
        [0x1F493, 0x1F49F, 'heart'], [0x1F90D, 0x1F90E, 'heart'], [0x1F5A4, 0x1F5A4, 'heart'], [0x2763, 0x2763, 'heart'], [0x1F48B, 0x1F48D, 'heart'], [0x1F490, 0x1F492, 'heart'],
        [0x2648, 0x2653, 'star'], [0x26CE, 0x26CE, 'star'], [0x1F52F, 0x1F52F, 'star'], [0x2721, 0x2721, 'star'], [0x2733, 0x2734, 'sparkle'], [0x2747, 0x2747, 'sparkle'],
        [0x1F300, 0x1F320, 'cloud'], [0x2602, 0x2604, 'cloud'], [0x2614, 0x2614, 'drop'], [0x26C4, 0x26C8, 'cloud'], [0x1F311, 0x1F318, 'moon'], [0x1F31A, 0x1F31C, 'moon'], [0x1F31D, 0x1F31E, 'sun'],
        [0x1F330, 0x1F335, 'leaf'], [0x1F337, 0x1F344, 'leaf'], [0x2618, 0x2618, 'leaf'], [0x1F940, 0x1F940, 'leaf'], [0x1F395, 0x1F395, 'leaf'],
        [0x1F345, 0x1F37C, 'food'], [0x1F37D, 0x1F37E, 'food'], [0x1F32D, 0x1F32F, 'food'], [0x1F950, 0x1F96F, 'food'], [0x1F9C0, 0x1F9CB, 'food'], [0x1F95B, 0x1F95B, 'cup'], [0x1F375, 0x1F37A, 'cup'],
        [0x1F400, 0x1F43E, 'paw'], [0x1F980, 0x1F9AE, 'paw'], [0x1F985, 0x1F98B, 'paw'], [0x1F9A0, 0x1F9A0, 'paw'],
        [0x1F440, 0x1F445, 'eye'], [0x1F446, 0x1F450, 'hand'], [0x1F90C, 0x1F90C, 'hand'], [0x1F90F, 0x1F90F, 'hand'], [0x1F932, 0x1F932, 'hand'], [0x1F595, 0x1F596, 'hand'], [0x270A, 0x270D, 'hand'], [0x1F9B5, 0x1F9B6, 'hand'], [0x1F9BE, 0x1F9BF, 'hand'],
        [0x1F466, 0x1F469, 'user'], [0x1F46A, 0x1F46B, 'users'], [0x1F46C, 0x1F46D, 'users'], [0x1F46E, 0x1F478, 'user'], [0x1F9D1, 0x1F9DF, 'user'], [0x1F930, 0x1F931, 'user'], [0x1F934, 0x1F93A, 'user'], [0x1F93C, 0x1F93E, 'user'], [0x1F9B8, 0x1F9B9, 'user'],
        [0x1F3C3, 0x1F3C4, 'user'], [0x1F3CA, 0x1F3CC, 'user'], [0x1F6B4, 0x1F6B6, 'user'], [0x1F6C0, 0x1F6C0, 'user'], [0x1F6CC, 0x1F6CC, 'user'], [0x1F483, 0x1F483, 'user'], [0x1F57A, 0x1F57A, 'user'], [0x1F935, 0x1F936, 'user'], [0x1F9CD, 0x1F9CF, 'user'],
        [0x1F479, 0x1F47F, 'skull'], [0x1F480, 0x1F480, 'skull'], [0x2620, 0x2620, 'skull'], [0x1F47D, 0x1F47E, 'gamepad'], [0x1F9DE, 0x1F9DF, 'user'],
        [0x1F452, 0x1F462, 'bag'], [0x1F45B, 0x1F45D, 'bag'], [0x1F392, 0x1F392, 'bag'], [0x1F9E3, 0x1F9E6, 'bag'], [0x1F97B, 0x1F97F, 'bag'], [0x1F453, 0x1F454, 'tag'],
        [0x1F682, 0x1F68F, 'truck'], [0x1F690, 0x1F6A3, 'car'], [0x1F6B2, 0x1F6B3, 'car'], [0x1F6B5, 0x1F6B5, 'car'], [0x1F6F4, 0x1F6FC, 'car'], [0x1F681, 0x1F681, 'plane'], [0x26F5, 0x26F5, 'plane'], [0x26F4, 0x26F4, 'plane'], [0x1F6A4, 0x1F6A4, 'plane'], [0x1F6A2, 0x1F6A2, 'plane'], [0x1F6F8, 0x1F6F8, 'rocket'],
        [0x1F6A5, 0x1F6A7, 'warn'], [0x1F6AA, 0x1F6AA, 'home'], [0x1F6AB, 0x1F6AF, 'cross'], [0x1F6B7, 0x1F6B8, 'warn'], [0x1F6B9, 0x1F6BE, 'user'], [0x1F6C1, 0x1F6C5, 'note'], [0x1F6D1, 0x1F6D1, 'cross'],
        [0x1F3E1, 0x1F3E5, 'home'], [0x1F3E7, 0x1F3E7, 'card'], [0x1F3E9, 0x1F3F0, 'home'], [0x1F54B, 0x1F54E, 'home'], [0x26EA, 0x26EA, 'home'], [0x26E9, 0x26E9, 'home'], [0x1F5FB, 0x1F5FF, 'home'], [0x26F0, 0x26F3, 'flag'], [0x26FA, 0x26FA, 'home'], [0x1F3EE, 0x1F3EE, 'bulb'],
        [0x1F3A0, 0x1F3A2, 'puzzle'], [0x1F3AA, 0x1F3AA, 'puzzle'], [0x1F3AD, 0x1F3AD, 'film'], [0x1F3A6, 0x1F3A6, 'film'], [0x1F3A3, 0x1F3A3, 'puzzle'], [0x1F3B0, 0x1F3B4, 'puzzle'], [0x1F0CF, 0x1F0CF, 'puzzle'], [0x1F004, 0x1F004, 'puzzle'],
        [0x1F3B7, 0x1F3BC, 'music'], [0x1F941, 0x1F941, 'music'], [0x1F3B3, 0x1F3B3, 'ball'], [0x1F3BD, 0x1F3BD, 'tag'], [0x1F3BE, 0x1F3C0, 'ball'], [0x1F3C8, 0x1F3C9, 'ball'], [0x1F3CF, 0x1F3D3, 'ball'], [0x1F3F8, 0x1F3F9, 'target'], [0x26BD, 0x26BE, 'ball'], [0x1F94A, 0x1F94F, 'ball'], [0x1F93F, 0x1F93F, 'ball'],
        [0x1F380, 0x1F393, 'gift'], [0x1F3A3, 0x1F3A3, 'gift'], [0x1F3C2, 0x1F3C2, 'user'], [0x26F7, 0x26F8, 'user'], [0x1F3FA, 0x1F3FA, 'cup'],
        [0x1F4C1, 0x1F4C2, 'folder'], [0x1F4C3, 0x1F4D3, 'note'], [0x1F4D4, 0x1F4DC, 'book'], [0x1F4DB, 0x1F4DB, 'tag'], [0x1F4E4, 0x1F4E8, 'mail'], [0x1F4E9, 0x1F4EF, 'mail'], [0x1F4F0, 0x1F4F0, 'note'], [0x1F4F3, 0x1F4F5, 'phone'], [0x1F4E0, 0x1F4E0, 'printer'], [0x1F4FF, 0x1F4FF, 'ring'],
        [0x1F4B1, 0x1F4B2, 'money'], [0x1F4B9, 0x1F4B9, 'chart'], [0x1F4BC, 0x1F4BC, 'bag'], [0x1F4BD, 0x1F4BD, 'save'], [0x1F4C7, 0x1F4C7, 'idcard'], [0x1F4A0, 0x1F4A0, 'diamond'], [0x1F4A2, 0x1F4A2, 'excl'], [0x1F4A3, 0x1F4A3, 'flash'], [0x1F4A4, 0x1F4A4, 'moon'], [0x1F4A5, 0x1F4A5, 'sparkle'], [0x1F4A6, 0x1F4A6, 'drop'], [0x1F4A8, 0x1F4A8, 'wave'], [0x1F4A9, 0x1F4A9, 'dot'], [0x1F4AB, 0x1F4AB, 'sparkle'], [0x1F4AD, 0x1F4AD, 'speak'], [0x1F4AE, 0x1F4AE, 'star'], [0x1F4AC, 0x1F4AC, 'speak'], [0x1F5E8, 0x1F5EF, 'speak'],
        [0x1F489, 0x1F48A, 'drop'], [0x1F484, 0x1F487, 'user'], [0x1F488, 0x1F488, 'tools'], [0x1F4BA, 0x1F4BA, 'home'],
        [0x1F507, 0x1F50A, 'speaker'], [0x1F515, 0x1F515, 'bell'], [0x1F516, 0x1F516, 'tag'], [0x1F50F, 0x1F50F, 'lock'], [0x1F51E, 0x1F51E, 'warn'], [0x1F51F, 0x1F524, 'note'], [0x1F520, 0x1F524, 'note'], [0x1F529, 0x1F52C, 'tools'], [0x1F52E, 0x1F52E, 'sparkle'], [0x1F531, 0x1F531, 'tools'],
        [0x1F9F0, 0x1F9FF, 'tools'], [0x1F9E7, 0x1F9E7, 'gift'], [0x1F9E0, 0x1F9E0, 'bulb'], [0x1F9E1, 0x1F9E2, 'bag'], [0x1F9E8, 0x1F9E8, 'flash'], [0x1F9E9, 0x1F9EA, 'puzzle'], [0x1F9EB, 0x1F9EC, 'tools'], [0x1F9ED, 0x1F9ED, 'compass'], [0x1F9EE, 0x1F9EE, 'calc'],
        [0x1FA70, 0x1FAFF, 'tools'], [0x1F90D, 0x1F90D, 'heart'], [0x1F9B0, 0x1F9B3, 'user'], [0x1F9B7, 0x1F9B7, 'tools'], [0x1F9B4, 0x1F9B4, 'skull'], [0x1F9C0, 0x1F9C0, 'food'],
        [0x2600, 0x2601, 'sun'], [0x2693, 0x2693, 'compass'], [0x2694, 0x2694, 'tools'], [0x2695, 0x2695, 'shield'], [0x2697, 0x2697, 'tools'], [0x2699, 0x2699, 'gear'], [0x269B, 0x269C, 'sparkle'], [0x26CF, 0x26CF, 'tools'], [0x26D1, 0x26D1, 'shield'], [0x26D3, 0x26D3, 'link'], [0x26FD, 0x26FD, 'drop'], [0x2668, 0x2668, 'flame'],
        [0x2622, 0x2623, 'warn'], [0x2638, 0x2638, 'gear'], [0x262A, 0x262F, 'ring'], [0x2626, 0x2626, 'ring'], [0x271D, 0x271D, 'plus'], [0x2639, 0x263A, 'heart'], [0x2640, 0x2642, 'user'], [0x265F, 0x2666, 'diamond'], [0x267F, 0x267F, 'user'], [0x2692, 0x2692, 'tools'],
        [0x2712, 0x2712, 'edit'], [0x2795, 0x2797, 'plus'], [0x27B0, 0x27BF, 'refresh'], [0x2705, 0x2705, 'check'], [0x274C, 0x274E, 'cross'], [0x2753, 0x2755, 'ask'], [0x2B50, 0x2B55, 'star'], [0x3030, 0x3030, 'wave'], [0x303D, 0x303D, 'wave'], [0x3297, 0x3299, 'tag'], [0x24C2, 0x24C2, 'ring'],
        [0x1F170, 0x1F251, 'tag'], [0x2122, 0x2122, 'tag'], [0x203C, 0x2049, 'excl'], [0x1F5A5, 0x1F5A5, 'desktop'], [0x1F5C2, 0x1F5C4, 'folder'], [0x1F5D1, 0x1F5D1, 'trash'], [0x1F5DD, 0x1F5DD, 'key'], [0x1F5E1, 0x1F5E1, 'tools'], [0x1F5F3, 0x1F5F3, 'ballot'], [0x1F5FA, 0x1F5FA, 'globe'],
        [0x1F30D, 0x1F310, 'globe'], [0x1F301, 0x1F30C, 'cloud'], [0x1F5BC, 0x1F5BC, 'image'], [0x1F3D4, 0x1F3DF, 'home'], [0x1F3F3, 0x1F3F5, 'flag'], [0x1F6E0, 0x1F6EC, 'tools'],
        [0x1F100, 0x1F1FF, 'tag'], [0x2300, 0x23FF, 'gear'], [0x2600, 0x27BF, 'dot'], [0x2B00, 0x2BFF, 'dot'], [0x1F300, 0x1FAFF, 'dot']
    ];
    function byRange(e) {
        const cp = String(e).codePointAt(0);
        for (let i = 0; i < RANGES.length; i++) { const r = RANGES[i]; if (cp >= r[0] && cp <= r[1]) return r[2]; }
        return 'dot';
    }
    let unknown = {};
    const KEEP = /^(?:[\u{1F1E6}-\u{1F1FF}]{2}|[\u{1F3F3}\u{1F3F4}]\uFE0F?(?:\u200D.+)?|[\u{1F600}-\u{1F64F}\u{1F910}-\u{1F92F}\u{1F970}-\u{1F97A}\u{1F9D0}\u{1F978}\u{1FAE0}-\u{1FAE8}\u{1F635}\u{1F971}\u{1F972}])/u;
    function shape(name, cls) { return `<svg class="ei ${cls || ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${S[name] || S.dot}</svg>`; }
    function iconFor(e) { return svg(e) || shape(byRange(e)); }
    function convertText(node) {
        const v = node.nodeValue; if (!v || !RX.test(v)) { RX.lastIndex = 0; return; } RX.lastIndex = 0;
        { const all = v.match(RX) || []; RX.lastIndex = 0; if (!all.some(x => !KEEP.test(x))) return; }
        const par = node.parentNode; if (!par || SKIP[par.nodeName] || (par.closest && par.closest('.no-ei,[contenteditable],pre'))) return;
        const frag = document.createDocumentFragment(); let last = 0, m;
        while ((m = RX.exec(v))) {
            if (m.index > last) frag.appendChild(document.createTextNode(v.slice(last, m.index)));
            if (KEEP.test(m[0])) { frag.appendChild(document.createTextNode(m[0])); last = m.index + m[0].length; continue; }
            const w = document.createElement('span'); w.className = 'ei-wrap'; w.innerHTML = iconFor(m[0]); frag.appendChild(w);
            last = m.index + m[0].length;
        }
        RX.lastIndex = 0;
        if (last < v.length) frag.appendChild(document.createTextNode(v.slice(last)));
        par.replaceChild(frag, node);
    }
    function walk(root) {
        if (!root) return;
        if (root.nodeType === 3) { convertText(root); return; }
        if (root.nodeType !== 1 || SKIP[root.nodeName] || (root.classList && root.classList.contains('no-ei'))) return;
        const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), list = [];
        let n; while ((n = tw.nextNode())) list.push(n);
        list.forEach(convertText);
    }
    let queue = new Set(), raf = 0;
    function flush() { raf = 0; const q = Array.from(queue); queue.clear(); q.forEach(walk); }
    function start() {
        if (!window.MutationObserver || !document.body) return;
        walk(document.body);
        new MutationObserver(muts => {
            muts.forEach(m => { if (m.type === 'characterData') queue.add(m.target); else m.addedNodes.forEach(n => queue.add(n)); });
            if (!raf) raf = requestAnimationFrame(flush);
        }).observe(document.body, { childList: true, subtree: true, characterData: true });
    }
    (function () { try { const st = document.createElement('style'); st.id = 'ei-base'; st.textContent = '.ei{width:1em;height:1em;display:block;flex-shrink:0}.ei-wrap{display:inline-flex;width:1.1em;height:1.1em;vertical-align:-0.18em;align-items:center;justify-content:center}.ei-wrap .ei{width:100%;height:100%}.ei-wrap,.ei-wrap *{pointer-events:none}'; (document.head || document.documentElement).insertBefore(st, (document.head || document.documentElement).firstChild); } catch (e) {} })();
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
    window.EmojiIcons = {
        unknown: () => Object.assign({}, unknown),
        svg: svg, any: e => KEEP.test(String(e).trim()) ? null : (svg(e) || shape(byRange(e))),
        has: e => !!NORM[norm(e)],
        add: (emoji, inner) => { const n = 'u_' + norm(emoji); S[n] = inner; NORM[norm(emoji)] = n; }
    };
})();
