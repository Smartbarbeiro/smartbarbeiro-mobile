<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { cardOutline, cutOutline, homeOutline, settingsOutline } from 'ionicons/icons';
import { IonIcon } from '@ionic/vue';
import { getToken, getStoredUser } from '@/services/storage';
import type { ApiUser } from '@/types/api';

const route = useRoute();
const router = useRouter();
const user = ref<ApiUser | null>(null);
const isAuthenticated = ref(false);

onMounted(async () => {
  isAuthenticated.value = !!(await getToken());
  user.value = await getStoredUser<ApiUser>();
});

const username = computed(() => user.value?.primary_barbershop_username ?? null);

const items = computed(() => {
  if (!isAuthenticated.value || !username.value) {
    return [];
  }

  const name = username.value;

  return [
    {
      key: 'home',
      label: 'Home',
      icon: homeOutline,
      routeName: 'PlanBuilder',
      params: { username: name },
    },
    {
      key: 'plan',
      label: 'Plano',
      icon: cardOutline,
      routeName: 'Subscriptions',
    },
    {
      key: 'haircuts',
      label: 'Cortes',
      icon: cutOutline,
      routeName: 'Haircuts',
    },
    {
      key: 'profile',
      label: 'Config',
      icon: settingsOutline,
      routeName: 'ProfileSettings',
    },
  ];
});

function isActive(item: (typeof items.value)[number]): boolean {
  if (item.routeName === 'PlanBuilder') {
    return route.name === 'PlanBuilder' && route.params.username === username.value;
  }

  return route.name === item.routeName;
}

async function navigate(item: (typeof items.value)[number]) {
  if (item.params) {
    await router.push({ name: item.routeName, params: item.params });
    return;
  }

  await router.push({ name: item.routeName });
}
</script>

<template>
  <nav v-if="items.length" class="mobile-bottom-nav" aria-label="Navegação principal">
    <button
      v-for="item in items"
      :key="item.key"
      type="button"
      class="mobile-bottom-link"
      :class="{ active: isActive(item) }"
      @click="navigate(item)"
    >
      <IonIcon :icon="item.icon" class="mobile-bottom-icon" aria-hidden="true" />
      <span class="mobile-bottom-label">{{ item.label }}</span>
    </button>
  </nav>
</template>
