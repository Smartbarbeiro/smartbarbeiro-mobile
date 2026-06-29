<template>
  <ion-page>
    <AppHeader title="Minha conta">
      <template #end>
        <ion-button @click="logout">Sair</ion-button>
      </template>
    </AppHeader>

    <ion-content class="page-content ion-padding" :class="{ 'sb-content-with-tabs': showTabBar }">
      <div v-if="user" class="welcome">
        <h1>Olá, {{ user.name }}</h1>
        <p v-if="username">Sua barbearia: @{{ username }}</p>
        <p v-else>Você ainda não está vinculado a uma barbearia.</p>
      </div>
      <ion-button expand="block" fill="outline" class="ion-margin-top" @click="scanAgain">
        Escanear outro QR
      </ion-button>
      <ClientTabBar v-if="showTabBar" />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
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

const username = computed(() => user.value?.primary_barbershop_username ?? null);

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
      return;
    }
  }

  if (username.value) {
    await router.replace({ name: 'PlanBuilder', params: { username: username.value } });
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

.welcome {
  margin-bottom: 1rem;
}

.welcome h1 {
  margin-bottom: 0.5rem;
  font-size: 1.25rem;
}

.welcome p {
  color: #6b7280;
}
</style>
