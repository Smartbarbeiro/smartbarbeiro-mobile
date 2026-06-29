import { onMounted, ref } from 'vue';
import { getToken, getStoredUser } from '@/services/storage';
import type { ApiUser } from '@/types/api';

export function useClientTabBar() {
  const showTabBar = ref(false);

  async function refreshTabBarVisibility() {
    const [token, user] = await Promise.all([
      getToken(),
      getStoredUser<ApiUser>(),
    ]);

    showTabBar.value = !!token && !!user?.primary_barbershop_username;
  }

  onMounted(() => {
    void refreshTabBarVisibility();
  });

  return { showTabBar, refreshTabBarVisibility };
}
