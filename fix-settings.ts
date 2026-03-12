import Database from 'better-sqlite3';

const db = new Database('unity.db');

const defaultSettings = [
  { key: 'ui_title', value: 'UNITY GRID' },
  { key: 'ui_subtitle', value: 'OWN A PIECE OF THE DIGITAL WORLD' },
  { key: 'ui_buy_button', value: 'BUY SELECTED' },
  { key: 'ui_loading', value: 'INITIALIZING GRID' },
  { key: 'cloudinary_cloud_name', value: '' },
  { key: 'cloudinary_api_key', value: '' },
  { key: 'cloudinary_api_secret', value: '' }
];

// Используем REPLACE, чтобы точно вставить или перезаписать настройки
const insertSetting = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');

const runFix = db.transaction(() => {
  for (const s of defaultSettings) {
    insertSetting.run(s.key, s.value);
  }
});

try {
  runFix();
  console.log('✅ Настройки успешно восстановлены в базе данных!');
} catch (error) {
  console.error('❌ Ошибка:', error);
}