<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="dark">
        <ion-title>Minha conta</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="logout">Sair</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div v-if="user" class="welcome">
        <h1>Olá, {{ user.name }}</h1>
        <p v-if="user.primary_barbershop_username">
          Barbearia: @{{ user.primary_barbershop_username }}
        </p>
        <p v-else>Você ainda não está vinculado a uma barbearia.</p>
      </div>

      <ion-button expand="block" fill="outline" @click="scanAgain">
        Escanear outro QR
      </ion-button>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/vue';
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
.welcome {
  margin-bottom: 2rem;
}

.welcome h1 {
  margin-bottom: 0.5rem;
}

.welcome p {
  color: #6b7280;
}
</style>
