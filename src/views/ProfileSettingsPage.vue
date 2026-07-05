<template>
  <ion-page>
    <AppHeader title="Config" />

    <ion-content class="page-content ion-padding" :class="{ 'sb-content-with-tabs': showTabBar }">
      <div v-if="user" class="account-card">
        <h1>{{ user.name }}</h1>
        <p v-if="user.email" class="account-email">{{ user.email }}</p>
        <p v-if="user.primary_barbershop_username" class="account-meta">
          Barbearia: @{{ user.primary_barbershop_username }}
        </p>
      </div>

      <ion-button expand="block" fill="outline" class="ion-margin-top" @click="scanAgain">
        Escanear outro QR
      </ion-button>

      <ion-button expand="block" color="danger" fill="outline" class="ion-margin-top" @click="logout">
        Sair
      </ion-button>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { IonButton, IonContent, IonPage, onIonViewWillEnter } from '@ionic/vue';
import AppHeader from '@/components/AppHeader.vue';
import { useClientTabBar } from '@/composables/useClientTabBar';
import { ApiError, fetchMe } from '@/services/api';
import { clearAuth, getStoredUser, getToken, setAuth } from '@/services/storage';
import type { ApiUser } from '@/types/api';

const router = useRouter();
const { showTabBar, refreshTabBarVisibility } = useClientTabBar();
const user = ref<ApiUser | null>(null);

async function loadAccount() {
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

  await refreshTabBarVisibility();
}

onMounted(() => {
  void loadAccount();
});

onIonViewWillEnter(() => {
  void loadAccount();
});

async function logout() {
  await clearAuth();
  await refreshTabBarVisibility();
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

.account-card {
  margin-bottom: 1rem;
}

.account-card h1 {
  margin: 0 0 0.5rem;
  font-size: 1.25rem;
}

.account-email,
.account-meta {
  color: #6b7280;
  margin: 0;
}
</style>
