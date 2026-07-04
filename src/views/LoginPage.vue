<template>
  <ion-page>
    <AppHeader title="Entrar" />

    <ion-content class="login-content">
      <div class="login-shell ion-padding">
        <div class="login-main">
          <div class="brand">
            <template v-if="preferredBarbershop">
              <ion-avatar class="shop-avatar">
                <img
                  v-if="preferredBarbershopPhotoUrl"
                  :src="preferredBarbershopPhotoUrl"
                  alt=""
                />
                <div v-else class="avatar-fallback">{{ barbershopInitials }}</div>
              </ion-avatar>
              <h1>{{ preferredBarbershopDisplayName }}</h1>
              <p>Acesse sua conta de cliente</p>
            </template>
            <template v-else>
              <img :src="logoImage" class="brand-logo" alt="Smart Barbeiro" />
              <h1>Smart Barbeiro</h1>
              <p>Acesse sua conta de cliente</p>
            </template>
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

            <div class="login-actions ion-margin-top">
              <ion-button expand="block" type="submit" :disabled="loading">
                {{ loading ? 'Entrando...' : 'Entrar' }}
              </ion-button>

              <ion-button
                v-if="googleEnabled"
                expand="block"
                type="button"
                fill="outline"
                color="medium"
                :disabled="googleLoading"
                @click="loginWithGoogleAccount"
              >
                <ion-icon slot="start" :icon="logoGoogle" aria-hidden="true" />
                {{ googleLoading ? 'Conectando...' : 'Continuar com Google' }}
              </ion-button>
            </div>
          </form>

          <template v-if="googleEnabled">
            <div class="divider">
              <span>ou</span>
            </div>
          </template>

          <ion-button expand="block" fill="outline" class="ion-margin-top" @click="goToQrScan">
            <ion-icon slot="start" :icon="qrCodeOutline" aria-hidden="true" />
            Escanear QR da barbearia
          </ion-button>
        </div>

        <footer class="login-footer">
          <button type="button" class="footer-logo-button" @click="showSupportOptions">
            <img :src="logoImage" class="footer-logo" alt="Smart Barbeiro" />
          </button>
        </footer>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  IonAvatar,
  IonButton,
  IonContent,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonPage,
  IonText,
  onIonViewWillEnter,
  actionSheetController,
  toastController,
} from '@ionic/vue';
import { Browser } from '@capacitor/browser';
import { logoGoogle, qrCodeOutline } from 'ionicons/icons';
import logoImage from '@/assets/logo.png';
import AppHeader from '@/components/AppHeader.vue';
import { SUPPORT_WEBSITE_URL, supportPhoneDialUrl } from '@/config/support';
import { ApiError, login, resolveApiAssetUrl } from '@/services/api';
import {
  initializeGoogleAuth,
  isGoogleAuthAvailable,
  loginWithGoogleBrowser,
} from '@/services/googleAuth';
import {
  getLastLoginEmail,
  getPreferredBarbershop,
  setAuth,
  type PreferredBarbershop,
} from '@/services/storage';
import { barbershopDisplayName } from '@/utils/barbershopDisplayName';

const router = useRouter();
const route = useRoute();
const email = ref('');
const password = ref('');
const loading = ref(false);
const googleLoading = ref(false);
const googleEnabled = ref(false);
const error = ref('');
const preferredBarbershop = ref<PreferredBarbershop | null>(null);

const preferredBarbershopPhotoUrl = computed(() =>
  resolveApiAssetUrl(preferredBarbershop.value?.profile_photo_url),
);

const preferredBarbershopDisplayName = computed(() =>
  barbershopDisplayName(preferredBarbershop.value?.username, preferredBarbershop.value?.name),
);

const barbershopInitials = computed(() => {
  const name = preferredBarbershopDisplayName.value;
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
});

async function loadPreferredBarbershop() {
  preferredBarbershop.value = await getPreferredBarbershop();
}

async function loadSavedLoginEmail() {
  const savedEmail = await getLastLoginEmail();
  if (savedEmail) {
    email.value = savedEmail;
  }

  password.value = '';
}

async function refreshGoogleAuth() {
  googleEnabled.value = await isGoogleAuthAvailable();
  if (googleEnabled.value) {
    await initializeGoogleAuth();
  }
}

onMounted(async () => {
  await Promise.all([loadPreferredBarbershop(), loadSavedLoginEmail(), refreshGoogleAuth()]);
});

onIonViewWillEnter(async () => {
  await Promise.all([loadPreferredBarbershop(), loadSavedLoginEmail(), refreshGoogleAuth()]);
});

async function navigateAfterLogin() {
  const redirectUsername = route.query.redirect as string | undefined;

  if (redirectUsername) {
    await router.replace({ name: 'PlanBuilder', params: { username: redirectUsername } });
    return;
  }

  if (preferredBarbershop.value?.username) {
    await router.replace({ name: 'PlanBuilder', params: { username: preferredBarbershop.value.username } });
    return;
  }

  await router.replace({ name: 'Home' });
}

async function submit() {
  loading.value = true;
  error.value = '';

  try {
    const response = await login(email.value.trim(), password.value);
    await setAuth(response.token, response.user);
    await navigateAfterLogin();
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Não foi possível entrar.';
  } finally {
    loading.value = false;
  }
}

async function goToQrScan() {
  await router.push({ name: 'QrScan' });
}

async function openSupportWebsite() {
  await Browser.open({ url: SUPPORT_WEBSITE_URL });
}

async function callSupport() {
  const dialUrl = supportPhoneDialUrl();

  if (!dialUrl) {
    const toast = await toastController.create({
      message: 'Telefone de suporte não configurado.',
      duration: 3000,
    });
    await toast.present();
    return;
  }

  window.location.href = dialUrl;
}

async function showSupportOptions() {
  const sheet = await actionSheetController.create({
    header: 'Precisa de ajuda?',
    buttons: [
      {
        text: 'Ir para o website',
        handler: () => {
          void openSupportWebsite();
        },
      },
      {
        text: 'Ligar para suporte',
        handler: () => {
          void callSupport();
        },
      },
      {
        text: 'Cancelar',
        role: 'cancel',
      },
    ],
  });

  await sheet.present();
}

async function loginWithGoogleAccount() {
  googleLoading.value = true;
  error.value = '';

  try {
    const authResponse = await loginWithGoogleBrowser();
    await setAuth(authResponse.token, authResponse.user);
    await navigateAfterLogin();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Não foi possível entrar com Google.';

    if (message.includes('Conta Google nova')) {
      const toast = await toastController.create({
        message,
        duration: 4000,
      });
      await toast.present();
      await router.push({ name: 'QrScan' });
      return;
    }

    error.value = err instanceof ApiError ? err.message : message;
  } finally {
    googleLoading.value = false;
  }
}
</script>

<style scoped>
.login-content {
  --background: #f3f4f6;
}

.login-shell {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.login-main {
  flex: 1;
}

.login-footer {
  display: flex;
  justify-content: center;
  padding: 1.5rem 0 0.5rem;
  margin-top: 1.5rem;
}

.footer-logo-button {
  border: 0;
  padding: 0;
  background: transparent;
  cursor: pointer;
}

.footer-logo-button:focus-visible {
  outline: 2px solid #024964;
  outline-offset: 4px;
  border-radius: 8px;
}

.footer-logo {
  width: min(42vw, 7.5rem);
  height: auto;
  object-fit: contain;
  opacity: 0.9;
}

.brand {
  text-align: center;
  margin: 2rem 0;
}

.brand-logo {
  width: min(60vw, 12rem);
  height: auto;
  object-fit: contain;
}

.shop-avatar {
  width: 5rem;
  height: 5rem;
  margin: 0 auto;
}

.avatar-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #111827;
  color: #fff;
  font-weight: 700;
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

.login-actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.login-actions ion-button {
  margin: 0;
  width: 100%;
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
