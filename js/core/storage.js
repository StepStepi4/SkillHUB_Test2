/* ============================================================
 *  Сховище: IndexedDB (спільне для «Асистента» та «Академії»)
 * ============================================================ */
let _idbPromise = null;

function openIDB() {
    if (_idbPromise) return _idbPromise;
    _idbPromise = new Promise((resolve, reject) => {
        try {
            if (!window.indexedDB) return reject(new Error('no idb'));
            const req = indexedDB.open(IDB_NAME, 1);
            req.onupgradeneeded = () => { req.result.createObjectStore(IDB_STORE); };
            req.onsuccess = () => { const db = req.result; migrateLegacyIDB(db).catch(() => {}).then(() => resolve(db)); };
            req.onerror = () => reject(req.error);
            req.onblocked = () => reject(new Error('idb blocked'));
        } catch (e) { reject(e); }
        setTimeout(() => reject(new Error('idb timeout')), 3000);   // після скидання/на деяких Android open може зависнути
    });
    _idbPromise.catch(() => { _idbPromise = null; });
    return _idbPromise;
}

// Одноразове перенесення даних зі старої спільної бази 'skillhub_store' (версія до ізоляції по репозиторію)
// у нову 'skillhub_store_<repo>' — щоб після міграції кеш і офлайн-дані не втрачались.
async function migrateLegacyIDB(db) {
    if (IDB_NAME === 'skillhub_store') return;
    try { if (localStorage.getItem('skillhub_idb_migrated_' + REPO_KEY)) return; } catch (e) {}
    const done = () => { try { localStorage.setItem('skillhub_idb_migrated_' + REPO_KEY, '1'); } catch (e) {} };
    const cnt = await new Promise(r => { try { const q = db.transaction(IDB_STORE, 'readonly').objectStore(IDB_STORE).count(); q.onsuccess = () => r(q.result); q.onerror = () => r(0); } catch (e) { r(0); } });
    if (cnt > 0) return done();
    if (indexedDB.databases) {
        const list = await indexedDB.databases().catch(() => null);
        if (list && !list.some(d => d.name === 'skillhub_store')) return done();
    }
    const old = await new Promise(res => {
        let created = false;
        const rq = indexedDB.open('skillhub_store');
        rq.onupgradeneeded = () => { created = true; rq.transaction.abort(); };
        rq.onsuccess = () => res(rq.result);
        rq.onerror = () => res(null);
        rq.onblocked = () => res(null);
        setTimeout(() => res(null), 2500);
    });
    if (!old) return;
    try {
        if (!old.objectStoreNames.contains(IDB_STORE)) return done();
        const rows = await new Promise(res => {
            const out = [];
            const rq = old.transaction(IDB_STORE, 'readonly').objectStore(IDB_STORE).openCursor();
            rq.onsuccess = () => { const c = rq.result; if (c) { out.push([c.key, c.value]); c.continue(); } else res(out); };
            rq.onerror = () => res(null);
        });
        if (rows && rows.length) {
            await new Promise(res => {
                const tx = db.transaction(IDB_STORE, 'readwrite');
                const st = tx.objectStore(IDB_STORE);
                rows.forEach(([k, v]) => st.put(v, k));
                tx.oncomplete = tx.onerror = tx.onabort = () => res();
            });
        }
        if (rows) done();
    } finally { try { old.close(); } catch (e) {} }
}

async function idbGet(key) {
    const idb = await openIDB();
    return new Promise((resolve, reject) => {
        setTimeout(() => reject(new Error('idb get timeout')), 3000);
        const rq = idb.transaction(IDB_STORE, 'readonly').objectStore(IDB_STORE).get(key);
        rq.onsuccess = () => resolve(rq.result);
        rq.onerror = () => reject(rq.error);
    });
}

async function idbSet(key, value) {
    const idb = await openIDB();
    return new Promise((resolve, reject) => {
        const tx = idb.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).put(value, key);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
    });
}

async function idbDelete(key) {
    const idb = await openIDB();
    return new Promise((resolve) => {
        const tx = idb.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).delete(key);
        tx.oncomplete = tx.onerror = tx.onabort = () => resolve();
    });
}
