<template>
  <ion-page>
    <ion-content class="sb-page-light sb-content-with-tabs">
      <div class="sb-stub-page">
        <h1>Configurações</h1>
        <p v-if="user">Olá, {{ user.name }}</p>
        <button type="button" class="sb-btn-outline mt-4" @click="scanAgain">Escanear outro QR</button>
        <button type="button" class="sb-btn-dark mt-3" @click="logout">Sair</button>
      </div>
      <ClientTabBar />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { IonContent, IonPage } from '@ionic/vue';
import ClientTabBar from '@/components/ClientTabBar.vue';
import { fetchMe } from '@/services/api';
import { clearAuth, getStoredUser } from '@/services/storage';
import type { ApiUser } from '@/types/api';

const router = useRouter();
const user = ref<ApiUser | null>(null);

onMounted(async () => {
  user.value = await getStoredUser<ApiUser>();

  try {
    const response = await fetchMe();
    user.value = response.user;
  } catch {
    await clearAuth();
    await router.replace({ name: 'Login' });
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
.mt-3 {
  margin-top: 0.75rem;
}

.mt-4 {
  margin-top: 1rem;
}

.sb-btn-outline,
.sb-btn-dark {
  max-width: 20rem;
  margin-inline: auto;
  display: block;
}
</style>
