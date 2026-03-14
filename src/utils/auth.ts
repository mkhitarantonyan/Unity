export interface User {
  id: string;
  username: string;
  first_name: string;
  last_name?: string;
  is_admin?: boolean;
  token?: string;
}

export const getUser = (): User | null => {
  const savedUser = localStorage.getItem('unity_user');
  if (savedUser) {
    try {
      return JSON.parse(savedUser);
    } catch (e) {
      console.error('Failed to parse saved user:', e);
    }
  }
  return null;
};

export const getToken = (): string | null => {
  const user = getUser();
  return user?.token ?? null;
};

export const logout = () => {
  localStorage.removeItem('unity_user');
  window.location.reload();
};

export const initApp = () => {
  // Reserved for future app initialization (e.g. analytics)
};
