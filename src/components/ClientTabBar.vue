<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { cardOutline, cutOutline, homeOutline, settingsOutline } from 'ionicons/icons';
import { IonIcon } from '@ionic/vue';
import { refreshClientSession, showClientTabBar } from '@/composables/useClientTabBar';
import { getStoredUser } from '@/services/storage';
import type { ApiUser } from '@/types/api';

const route = useRoute();
const router = useRouter();
const user = ref<ApiUser | null>(null);

async function loadNavUser() {
  user.value = await getStoredUser<ApiUser>();
  await refreshClientSession();
}

onMounted(() => {
  void loadNavUser();
});

watch(showClientTabBar, (visible) => {
  if (visible) {
    void loadNavUser();
  }
});

const username = computed(() => user.value?.primary_barbershop_username ?? null);

const items = computed(() => {
  if (!showClientTabBar.value || !username.value) {
    return [];
  }

  const name = username.value;

  return [
    {
      key: 'home',
      label: 'HOME',
      icon: homeOutline,
      routeName: 'PlanBuilder',
      params: { username: name },
    },
    {
      key: 'plan',
      label: 'PLANO',
      icon: cardOutline,
      routeName: 'Subscriptions',
    },
    {
      key: 'haircuts',
      label: 'CORTES',
      icon: cutOutline,
      routeName: 'Haircuts',
    },
    {
      key: 'profile',
      label: 'CONFIG',
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
  if (isActive(item)) {
    return;
  }

  if (item.params) {
    await router.push({ name: item.routeName, params: item.params });
    return;
  }

  await router.push({ name: item.routeName });
}
</script>

<template>
  <nav v-if="items.length" class="mobile-bottom-nav" aria-label="Menu principal">
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
