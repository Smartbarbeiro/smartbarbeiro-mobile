import { ref } from 'vue';
import { getToken, getStoredUser } from '@/services/storage';
import type { ApiUser } from '@/types/api';

export const showClientTabBar = ref(false);
export const isClientAuthenticated = ref(false);

export async function refreshClientSession() {
  const token = await getToken();
  isClientAuthenticated.value = !!token;

  if (!token) {
    showClientTabBar.value = false;
    return;
  }

  const user = await getStoredUser<ApiUser>();
  showClientTabBar.value = !!user?.primary_barbershop_username;
}

export function useClientTabBar() {
  return {
    showTabBar: showClientTabBar,
    isAuthenticated: isClientAuthenticated,
    refreshTabBarVisibility: refreshClientSession,
  };
}
