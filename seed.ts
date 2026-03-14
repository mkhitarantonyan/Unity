import Database from 'better-sqlite3';

// === НАСТРОЙКИ ===
// ВПИШИ СЮДА СВОЙ ЛОГИН, под которым ты зарегистрировался в Unity!
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin'; 

const DB_PATH = process.env.DB_PATH || 'unity.db';
const GRID_WIDTH = 100; // Ширина сетки

const db = new Database(DB_PATH);

console.log('Поиск администратора...');
const admin = db.prepare('SELECT id FROM users WHERE username = ?').get(ADMIN_USERNAME) as { id: string } | undefined;

if (!admin) {
  console.error(`❌ Ошибка: Пользователь '${ADMIN_USERNAME}' не найден в базе.`);
  db.close();
  process.exit(1);
}

const adminId = admin.id;
console.log(`✅ Админ найден! ID: ${adminId}`);

// === ДАННЫЕ ДЛЯ ЗАПОЛНЕНИЯ ===
// Я подобрал качественные публичные ссылки на картинки для старта
const blocks = [
  {
    title: 'Bitcoin (Web3)',
    link: 'https://coinmarketcap.com/currencies/bitcoin/',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/4/46/Bitcoin.svg',
    startX: 42, startY: 42, width: 2, height: 2, // 2x2 по центру
  },
  {
    title: 'WWF Charity',
    link: 'https://www.worldwildlife.org/',
    image_url: 'https://upload.wikimedia.org/wikipedia/en/2/24/WWF_logo.svg',
    startX: 20, startY: 30, width: 2, height: 2, // Благотворительность
  },
  {
    title: 'React.js',
    link: 'https://react.dev/',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/a/a7/React-icon.svg',
    startX: 75, startY: 25, width: 2, height: 2, // Технологии (Open Source)
  },
  {
    title: 'Tribute to 2005',
    link: 'https://en.wikipedia.org/wiki/The_Million_Dollar_Homepage',
    image_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200&auto=format&fit=crop', // Абстрактный пиксель-арт / глитч
    startX: 50, startY: 70, width: 3, height: 3, // Самый большой блок 3x3
  },
  {
    title: 'Digital Art',
    link: 'https://foundation.app/',
    image_url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=200&auto=format&fit=crop', // Ретровейв / 3D
    startX: 15, startY: 65, width: 2, height: 2,
  }
];

const updateUnit = db.prepare(`UPDATE units SET owner_id = ?, current_price = ?, sale_price = ?, metadata = ? WHERE id = ?`);
const insertHistory = db.prepare(`INSERT INTO unit_history (unit_id, buyer_id, price) VALUES (?, ?, ?)`);

let updatedCount = 0;

const runSeed = db.transaction(() => {
  for (const block of blocks) {
    const { startX, startY, width, height, title, link, image_url } = block;
    const maxX = startX + width - 1;
    const maxY = startY + height - 1;

    // Рассчитываем метадату один раз для всей группы
    const metadata = JSON.stringify({
      title: title,
      link: link,
      image_url: image_url,
      is_for_sale: false,
      group: (width > 1 || height > 1) ? { minX: startX, minY: startY, maxX, maxY } : undefined
    });

    const currentPrice = 10.0; // Базовая цена
    const nextSalePrice = currentPrice * 1.2; // Цена для перепродажи (+20%)

    // Проходимся по каждой клетке внутри блока
    for (let y = startY; y <= maxY; y++) {
      for (let x = startX; x <= maxX; x++) {
        const unitId = y * GRID_WIDTH + x; // Формула сетки
        
        // Обновляем юнит
        updateUnit.run(adminId, currentPrice, nextSalePrice, metadata, unitId);
        
        insertHistory.run(unitId, adminId, currentPrice);
        
        updatedCount++;
      }
    }
  }
});

try {
  runSeed();
  console.log(`🎉 Успешно посажено ${blocks.length} блоков (всего занято ${updatedCount} юнитов).`);
  console.log('Перезапусти сервер (npm run dev), чтобы сбросить кеш, и проверь сетку!');
} catch (error) {
  console.error('❌ Ошибка при обновлении базы:', error);
} finally {
  db.close();
}