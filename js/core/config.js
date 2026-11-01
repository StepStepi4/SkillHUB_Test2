/* ============================================================
 *  Загальна конфігурація застосунку SkillHUB
 *  Єдине місце, де вказано адресу API (Google Apps Script).
 * ============================================================ */
const API_URL = 'https://script.google.com/macros/s/AKfycbzlE1UMmbtcosDkBos5J1UoYhW90uOr-6ZfRV-VCWiPsu2-b8wwFDiJLAx5UQCzEfL7/exec';

// Єдине локальне сховище (IndexedDB) для обох розділів
const IDB_NAME = 'skillhub_store';
const IDB_STORE = 'kv';

// Кнопки з таблиці вказують іконку ім'ям файлу з цієї папки
const SKILLHUB_ICONS_DIR = 'assets/icons/skillhub/';
