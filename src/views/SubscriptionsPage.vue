<template>
  <ion-page>
    <AppHeader title="Plano" />

    <ion-content class="page-content ion-padding" :class="{ 'sb-content-with-tabs': showTabBar }">
      <p v-if="user?.primary_barbershop_username">
        Em breve você verá aqui o status da assinatura em @{{ user.primary_barbershop_username }}.
      </p>
      <p v-else>Vincule-se a uma barbearia para acompanhar seu plano.</p>
      <ion-button v-if="username" expand="block" class="ion-margin-top" @click="goToPlan">
        Ir para a barbearia
      </ion-button>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { IonButton, IonContent, IonPage, onIonViewWillEnter } from '@ionic/vue';
import AppHeader from '@/components/AppHeader.vue';
import { useClientTabBar } from '@/composables/useClientTabBar';
import { fetchMe } from '@/services/api';
import { getStoredUser, getToken, setAuth } from '@/services/storage';
import type { ApiUser } from '@/types/api';

const router = useRouter();
const { showTabBar, refreshTabBarVisibility } = useClientTabBar();
const user = ref<ApiUser | null>(null);

const username = computed(() => user.value?.primary_barbershop_username ?? null);

async function loadAccount() {
  user.value = await getStoredUser<ApiUser>();

  try {
    const response = await fetchMe();
    user.value = response.user;

    const token = await getToken();
    if (token) {
      await setAuth(token, response.user);
    }
  } catch {
    // Keep cached session on network errors; router guard handles missing auth.
  }

  await refreshTabBarVisibility();
}

onMounted(() => {
  void loadAccount();
});

onIonViewWillEnter(() => {
  void loadAccount();
});

async function goToPlan() {
  if (!username.value) {
    return;
  }

  await router.push({ name: 'PlanBuilder', params: { username: username.value } });
}
</script>

<style scoped>
.page-content {
  --background: #f3f4f6;
}
</style>
