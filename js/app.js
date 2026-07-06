// ==========================================
// ГЛОБАЛЬНІ ЗМІННІ ТА НАЛАШТУВАННЯ
// ==========================================
const API_URL = 'https://script.google.com/macros/s/AKfycbzqN7GVBm8Q2CtutMNdxvLipQzjQ5zap0bL4d4plqphvNH3TJChsZFR9mf8nCbOMC8Gqw/exec';
const CACHE_KEY = 'skillhub_v1_flat'; 
const SEEN_VERSION_KEY = 'skillhub_version_flat';

let db = { categories: [], descriptions: {}, tariffs: [], appVersion: "", changelog: "", montazhData: {cities:[], services:[]}, serviceCodes: {}, rezervyData: [], rezervyDate: "", serviceBrands: {}, trainingData: [], skillHubButtons: [], sellerRatings: [] };
let currentCategoryData = null;
let currentServiceData = null; 
let savedScrollY = 0; 

// ==========================================
// SPA ЛОГІКА (БЕЗШОВНІ ПЕРЕХОДИ)
// ==========================================
window.openModule = function(url) {
    const container = document.getElementById('spa-module-container');
    const frame = document.getElementById('spa-frame');
    frame.src = url;
    container.style.display = 'block';
    document.body.classList.add('modal-open');
    
    // Невелика затримка для плавного fade-in ефекту
    setTimeout(() => { container.style.opacity = '1'; }, 10);
};

window.closeModule = function() {
    const container = document.getElementById('spa-module-container');
    container.style.opacity = '0';
    
    // Чекаємо закінчення анімації перед приховуванням
    setTimeout(() => {
        container.style.display = 'none';
        document.getElementById('spa-frame').src = '';
        document.body.classList.remove('modal-open');
    }, 300);
};

// ==========================================
// ОСНОВНА ЛОГІКА ІНТЕРФЕЙСУ (Вкладки, Модалки)
// ==========================================
window.switchTab = function(tabId) {
    document.querySelectorAll('.app-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    
    document.getElementById(tabId).classList.add('active');
    
    let activeNavBtn = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
    if (activeNavBtn) activeNavBtn.classList.add('active');

    const tabTitles = {
        'tab-search': 'SkillHUB Assistant',
        'tab-reserves': 'Активні резерви',
        'tab-skillhub': 'SkillHUB',
        'tab-settings': 'Налаштування'
    };
    
    document.getElementById('headerTitle').innerText = tabTitles[tabId];
    document.getElementById('statusContainer').style.display = (tabId === 'tab-search') ? 'flex' : 'none';

    if (tabId === 'tab-reserves') window.renderRezervyList();
    window.scrollTo(0, 0);
};

// Обробник кліків по нижній навігації
document.querySelectorAll('.bottom-nav .nav-item').forEach(btn => {
    btn.addEventListener('click', function() {
        window.switchTab(this.getAttribute('data-tab'));
    });
});

window.openModalBase = function(modalId) {
    savedScrollY = window.scrollY;
    document.body.style.top = `-${savedScrollY}px`;
    document.body.classList.add('modal-open');
    document.getElementById(modalId).classList.add('show');
};

window.closeModalBase = function(modalId) {
    document.getElementById(modalId).classList.remove('show');
    document.body.classList.remove('modal-open');
    document.body.style.top = '';
    window.scrollTo(0, savedScrollY);
};

// ==========================================
// ІНІЦІАЛІЗАЦІЯ ДОДАТКУ (База даних)
// ==========================================
async function init() {
    let cached = null;
    try { cached = localStorage.getItem(CACHE_KEY); } catch (e) {}
    
    if (cached) { 
        try {
            db = JSON.parse(cached); 
            // Тут викликаємо всі функції рендеру, як у тебе було раніше
            // window.buildServiceSearchList();
            // window.renderSkillHubTab();
            document.getElementById('appLoader').classList.add('hidden');
        } catch(e) { await refreshData(true); }
    } else await refreshData(true); 
}

async function refreshData(first = false) {
    if(first) document.getElementById('appLoader').classList.remove('hidden');
    try {
        const response = await fetch(API_URL + '?nocache=' + Date.now());
        const dataStr = await response.text();
        localStorage.setItem(CACHE_KEY, dataStr);
        db = JSON.parse(dataStr);
        document.getElementById('appLoader').classList.add('hidden');
    } catch (e) { 
        console.error("Refresh Error:", e);
    }
}

// Запуск при завантаженні
document.addEventListener('DOMContentLoaded', init);

// Сюди потрібно перенести всі інші функції з твого старого `<script>`:
// renderRezervyList(), calculateServicesArray(), updateMontazhResults() і т.д.
