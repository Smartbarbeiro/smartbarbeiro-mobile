<template>
  <ion-page>
    <AppHeader title="Config">
      <template #end>
        <ion-button @click="logout">Sair</ion-button>
      </template>
    </AppHeader>

    <ion-content class="page-content ion-padding" :class="{ 'sb-content-with-tabs': showTabBar }">
      <p v-if="user">Olá, {{ user.name }}</p>
      <ion-button expand="block" fill="outline" class="ion-margin-top" @click="scanAgain">
        Escanear outro QR
      </ion-button>
      <ClientTabBar v-if="showTabBar" />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { IonButton, IonContent, IonPage } from '@ionic/vue';
import AppHeader from '@/components/AppHeader.vue';
import ClientTabBar from '@/components/ClientTabBar.vue';
import { useClientTabBar } from '@/composables/useClientTabBar';
import { ApiError, fetchMe } from '@/services/api';
import { clearAuth, getStoredUser, getToken, setAuth } from '@/services/storage';
import type { ApiUser } from '@/types/api';

const router = useRouter();
const { showTabBar } = useClientTabBar();
const user = ref<ApiUser | null>(null);

onMounted(async () => {
  user.value = await getStoredUser<ApiUser>();

  try {
    const response = await fetchMe();
    user.value = response.user;

    const token = await getToken();
    if (token) {
      await setAuth(token, response.user);
    }
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      await clearAuth();
      await router.replace({ name: 'Login' });
    }
  }
});

async function logout() {
  await clearAuth();
  await router.replace({ name: 'Login' });
}

async function scanAgain() {
  await router.push({ name: 'QrScan' });
}
</script>

<style scoped>
.page-content {
  --background: #f3f4f6;
}
</style>
