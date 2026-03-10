export interface User {
  id: string;
  username: string;
  first_name: string;
  last_name?: string;
  is_admin?: boolean;
  token?: string; // Добавили поле для токена
}

export const getTelegramWebApp = () => {
  // @ts-ignore
  return window.Telegram?.WebApp;
};

export const getUser = (): User | null => {
  const savedUser = localStorage.getItem('unity_user');
  if (savedUser) {
    try {
      return JSON.parse(savedUser);
    } catch (e) {
      console.error('Failed to parse saved user:', e);
    }
  }

  const tg = getTelegramWebApp();
  if (tg?.initDataUnsafe?.user) {
    return {
      ...tg.initDataUnsafe.user,
      id: tg.initDataUnsafe.user.id.toString(),
      username: tg.initDataUnsafe.user.username || tg.initDataUnsafe.user.first_name
    };
  }
  
  return null;
};

// Новая функция для получения именно токена для API запросов
export const getToken = (): string | null => {
  const user = getUser();
  return user?.token || null;
};

export const getAuthData = (): string => {
  const tg = getTelegramWebApp();
  if (tg?.initData) return tg.initData;
  return 'WEB_DEMO';
};

export const logout = () => {
  localStorage.removeItem('unity_user');
  window.location.reload();
};

export const initApp = () => {
  const tg = getTelegramWebApp();
  if (tg) {
    tg.ready();
    tg.expand();
  }
};