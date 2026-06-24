<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="dark">
        <ion-title>Entrar</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding login-content">
      <div class="brand">
        <ion-icon :icon="cutOutline" />
        <h1>Smart Barbeiro</h1>
        <p>Acesse sua conta de cliente</p>
      </div>

      <form @submit.prevent="submit">
        <ion-item lines="full">
          <ion-label position="stacked">E-mail</ion-label>
          <ion-input v-model="email" type="email" autocomplete="email" required />
        </ion-item>

        <ion-item lines="full">
          <ion-label position="stacked">Senha</ion-label>
          <ion-input v-model="password" type="password" autocomplete="current-password" required />
        </ion-item>

        <ion-text v-if="error" color="danger">
          <p class="error">{{ error }}</p>
        </ion-text>

        <ion-button expand="block" type="submit" :disabled="loading" class="ion-margin-top">
          {{ loading ? 'Entrando...' : 'Entrar' }}
        </ion-button>
      </form>

      <ion-button expand="block" fill="outline" class="ion-margin-top" @click="goToQrScan">
        Escanear QR da barbearia
      </ion-button>

      <template v-if="googleEnabled">
        <div class="divider">
          <span>ou</span>
        </div>

        <ion-button
          expand="block"
          fill="outline"
          color="medium"
          :disabled="googleLoading"
          @click="loginWithGoogleAccount"
        >
          {{ googleLoading ? 'Conectando...' : 'Continuar com Google' }}
        </ion-button>
      </template>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonPage,
  IonText,
  IonTitle,
  IonToolbar,
  toastController,
} from '@ionic/vue';
import { cutOutline } from 'ionicons/icons';
import { ApiError, login, loginWithGoogle } from '@/services/api';
import { initializeGoogleAuth, isGoogleAuthAvailable, signInWithGoogle } from '@/services/googleAuth';
import { setAuth } from '@/services/storage';

const router = useRouter();
const email = ref('');
const password = ref('');
const loading = ref(false);
const googleLoading = ref(false);
const googleEnabled = ref(false);
const error = ref('');

onMounted(async () => {
  googleEnabled.value = await isGoogleAuthAvailable();
  await initializeGoogleAuth();
});

async function submit() {
  loading.value = true;
  error.value = '';

  try {
    const response = await login(email.value.trim(), password.value);
    await setAuth(response.token, response.user);
    await router.replace({ name: 'Home' });
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Não foi possível entrar.';
  } finally {
    loading.value = false;
  }
}

async function goToQrScan() {
  await router.push({ name: 'QrScan' });
}

async function loginWithGoogleAccount() {
  googleLoading.value = true;
  error.value = '';

  try {
    const tokens = await signInWithGoogle();
    const response = await loginWithGoogle(tokens);

    if ('status' in response && response.status === 'registration_required') {
      const toast = await toastController.create({
        message: 'Conta Google nova. Escaneie o QR da barbearia para se cadastrar.',
        duration: 4000,
      });
      await toast.present();
      await router.push({ name: 'QrScan' });
      return;
    }

    const authResponse = response as { token: string; user: import('@/types/api').ApiUser };
    await setAuth(authResponse.token, authResponse.user);
    await router.replace({ name: 'Home' });
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Não foi possível entrar com Google.';
  } finally {
    googleLoading.value = false;
  }
}
</script>

<style scoped>
.login-content {
  --background: #f3f4f6;
}

.brand {
  text-align: center;
  margin: 2rem 0;
}

.brand ion-icon {
  font-size: 3rem;
  color: #111827;
}

.brand h1 {
  margin: 0.5rem 0 0;
}

.brand p {
  color: #6b7280;
}

.error {
  margin-top: 1rem;
}

.divider {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin: 1.5rem 0 1rem;
  color: #9ca3af;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #d1d5db;
}
</style>
