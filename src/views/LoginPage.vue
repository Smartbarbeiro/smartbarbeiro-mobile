<template>
  <ion-page>
    <ion-content class="login-content">
      <div class="register-hero">
        <div class="register-hero__inner">
          <div class="login-panel">
            <header class="login-panel__header">
              <h1 class="login-panel__title">Entrar</h1>
              <p class="login-panel__subtitle">Acesse sua conta para gerenciar sua barbearia.</p>
            </header>

            <button
              v-if="googleEnabled"
              type="button"
              class="oauth-google-btn mb-3"
              :disabled="googleLoading"
              @click="loginWithGoogleAccount"
            >
              <span class="oauth-google-btn__icon">G</span>
              {{ googleLoading ? 'Conectando...' : 'Continuar com Google' }}
            </button>

            <p v-if="googleEnabled" class="oauth-divider">ou entre com e-mail</p>

            <form class="login-panel__form" @submit.prevent="submit">
              <div class="sb-form-field">
                <label class="sb-form-label" for="email">E-mail</label>
                <input id="email" v-model="email" class="sb-form-control" type="email" autocomplete="email" required />
              </div>

              <div class="sb-form-field">
                <label class="sb-form-label" for="password">Senha</label>
                <div class="password-row">
                  <input
                    id="password"
                    v-model="password"
                    class="sb-form-control"
                    :type="showPassword ? 'text' : 'password'"
                    autocomplete="current-password"
                    required
                  />
                  <button type="button" class="password-toggle" @click="showPassword = !showPassword">
                    {{ showPassword ? 'Ocultar' : 'Mostrar' }}
                  </button>
                </div>
              </div>

              <p v-if="error" class="sb-alert sb-alert-danger">{{ error }}</p>

              <button type="submit" class="sb-btn-dark" :disabled="loading">
                {{ loading ? 'Entrando...' : 'Entrar' }}
              </button>
            </form>

            <p class="login-panel__footer">
              Não tem conta?
              <button type="button" class="link-button" @click="goToQrScan">Escanear QR da barbearia</button>
            </p>
          </div>

          <footer class="login-footer">
            <button type="button" class="footer-logo-button" @click="showSupportOptions">
              <img :src="logoImage" class="footer-logo" alt="Smart Barbeiro" />
            </button>
          </footer>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { IonContent, IonPage, actionSheetController, toastController } from '@ionic/vue';
import { Browser } from '@capacitor/browser';
import logoImage from '@/assets/logo.png';
import { SUPPORT_WEBSITE_URL, supportPhoneDialUrl } from '@/config/support';
import { ApiError, login, loginWithGoogle } from '@/services/api';
import { initializeGoogleAuth, isGoogleAuthAvailable, signInWithGoogle } from '@/services/googleAuth';
import { setAuth } from '@/services/storage';

const router = useRouter();
const route = useRoute();
const email = ref('');
const password = ref('');
const showPassword = ref(false);
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

    const redirectUsername = route.query.redirect as string | undefined;
    if (redirectUsername) {
      await router.replace({ name: 'PlanBuilder', params: { username: redirectUsername } });
      return;
    }

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

    const redirectUsername = route.query.redirect as string | undefined;
    if (redirectUsername) {
      await router.replace({ name: 'PlanBuilder', params: { username: redirectUsername } });
      return;
    }

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
  --background: #000;
}

.password-row {
  display: flex;
  gap: 0.5rem;
}

.password-row .sb-form-control {
  flex: 1;
}

.password-toggle {
  min-width: 4.5rem;
  border: 1px solid #000;
  background: #fff;
  font-weight: 600;
  cursor: pointer;
}

.login-panel__footer {
  margin-top: 1.25rem;
  text-align: center;
}

.link-button {
  background: none;
  border: 0;
  color: #000;
  font-weight: 600;
  text-decoration: underline;
  cursor: pointer;
  padding: 0;
}

.login-footer {
  display: flex;
  justify-content: center;
  margin-top: 1.5rem;
}

.footer-logo-button {
  border: 0;
  padding: 0;
  background: transparent;
  cursor: pointer;
}

.footer-logo {
  width: min(42vw, 7.5rem);
  height: auto;
  object-fit: contain;
  opacity: 0.9;
}

.mb-3 {
  margin-bottom: 0.75rem;
}
</style>
