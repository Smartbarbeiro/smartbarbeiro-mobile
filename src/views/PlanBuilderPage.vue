<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="dark">
        <ion-buttons slot="start">
          <ion-back-button default-href="/qr-scan" />
        </ion-buttons>
        <ion-title>Montar plano</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <ion-spinner v-if="loading" name="crescent" class="center-spinner" />

      <template v-else-if="profile">
        <div class="shop-header">
          <ion-avatar>
            <img v-if="profile.profile.profile_photo_url" :src="profile.profile.profile_photo_url" alt="" />
            <div v-else class="avatar-fallback">{{ initials }}</div>
          </ion-avatar>
          <div>
            <h2>{{ profile.profile.name }}</h2>
            <p>@{{ profile.profile.username }}</p>
          </div>
        </div>

        <h3 class="section-title">Escolha o pacote</h3>
        <ion-list>
          <ion-radio-group v-model="selectedPackageType">
            <ion-item v-for="pkg in profile.service_plans.packages" :key="pkg.type">
              <ion-radio slot="start" :value="pkg.type" />
              <ion-label>
                <h2>{{ pkg.label }}</h2>
                <p>{{ pkg.formatted_price }}/mês</p>
              </ion-label>
            </ion-item>
          </ion-radio-group>
        </ion-list>

        <template v-if="profile.service_plans.addons.length">
          <h3 class="section-title">Adicionais</h3>
          <ion-list>
            <ion-item v-for="addon in profile.service_plans.addons" :key="addon.id">
              <ion-checkbox slot="start" :checked="selectedAddonIds.includes(addon.id)" @ionChange="toggleAddon(addon.id, $event)" />
              <ion-label>
                <h2>{{ addon.label }}</h2>
                <p>+ {{ addon.formatted_price }}/mês</p>
              </ion-label>
            </ion-item>
          </ion-list>
        </template>

        <ion-card>
          <ion-card-content>
            <strong>Total mensal:</strong> {{ formattedTotal }}
          </ion-card-content>
        </ion-card>

        <h3 class="section-title">Seus dados</h3>

        <ion-button
          v-if="googleEnabled && !useGoogleSignup"
          expand="block"
          fill="outline"
          color="medium"
          :disabled="googleLoading"
          class="ion-margin-bottom"
          @click="startGoogleSignup"
        >
          {{ googleLoading ? 'Conectando...' : 'Cadastrar com Google' }}
        </ion-button>

        <ion-item lines="full">
          <ion-label position="stacked">Nome</ion-label>
          <ion-input v-model="form.name" autocomplete="name" :readonly="useGoogleSignup" />
        </ion-item>
        <ion-item lines="full">
          <ion-label position="stacked">CPF</ion-label>
          <ion-input v-model="form.cpf" inputmode="numeric" />
        </ion-item>
        <ion-item lines="full">
          <ion-label position="stacked">E-mail</ion-label>
          <ion-input v-model="form.email" type="email" autocomplete="email" :readonly="useGoogleSignup" />
        </ion-item>
        <template v-if="!useGoogleSignup">
          <ion-item lines="full">
            <ion-label position="stacked">Senha</ion-label>
            <ion-input v-model="form.password" type="password" autocomplete="new-password" />
          </ion-item>
          <ion-item lines="full">
            <ion-label position="stacked">Confirmar senha</ion-label>
            <ion-input v-model="form.password_confirmation" type="password" autocomplete="new-password" />
          </ion-item>
        </template>

        <ion-text v-if="error" color="danger">
          <p class="error">{{ error }}</p>
        </ion-text>

        <ion-button expand="block" class="ion-margin-top" :disabled="submitting" @click="submit">
          {{ submitting ? 'Processando...' : useGoogleSignup ? 'Assinar com Google' : 'Cadastrar e assinar' }}
        </ion-button>
      </template>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { Browser } from '@capacitor/browser';
import {
  IonAvatar,
  IonBackButton,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCheckbox,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonRadio,
  IonRadioGroup,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
  toastController,
} from '@ionic/vue';
import {
  ApiError,
  fetchBarbershop,
  formatCurrency,
  loginWithGoogle,
  register,
  registerWithGoogle,
  startCheckout,
} from '@/services/api';
import { initializeGoogleAuth, isGoogleAuthAvailable, signInWithGoogle } from '@/services/googleAuth';
import type { GoogleTokens } from '@/services/googleAuth';
import { setAuth } from '@/services/storage';
import type { BarbershopProfileResponse } from '@/types/api';

const props = defineProps<{ username: string }>();
const router = useRouter();

const loading = ref(true);
const submitting = ref(false);
const googleLoading = ref(false);
const googleEnabled = ref(false);
const useGoogleSignup = ref(false);
const googleTokens = ref<GoogleTokens | null>(null);
const error = ref('');
const profile = ref<BarbershopProfileResponse | null>(null);
const selectedPackageType = ref<string | null>(null);
const selectedAddonIds = ref<number[]>([]);

const form = reactive({
  name: '',
  cpf: '',
  email: '',
  password: '',
  password_confirmation: '',
});

const initials = computed(() => {
  const name = profile.value?.profile.name ?? '';
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
});

const monthlyTotal = computed(() => {
  if (!profile.value || !selectedPackageType.value) {
    return 0;
  }

  const selectedPackage = profile.value.service_plans.packages.find(
    (pkg) => pkg.type === selectedPackageType.value,
  );
  const addonsTotal = profile.value.service_plans.addons
    .filter((addon) => selectedAddonIds.value.includes(addon.id))
    .reduce((sum, addon) => sum + addon.monthly_price, 0);

  return (selectedPackage?.monthly_price ?? 0) + addonsTotal;
});

const formattedTotal = computed(() => formatCurrency(monthlyTotal.value));

function toggleAddon(addonId: number, event: CustomEvent) {
  const checked = event.detail.checked as boolean;
  if (checked) {
    selectedAddonIds.value = [...new Set([...selectedAddonIds.value, addonId])];
    return;
  }

  selectedAddonIds.value = selectedAddonIds.value.filter((id) => id !== addonId);
}

async function startGoogleSignup() {
  googleLoading.value = true;
  error.value = '';

  try {
    const tokens = await signInWithGoogle();
    const response = await loginWithGoogle(tokens);

    if ('status' in response && response.status === 'registration_required') {
      googleTokens.value = tokens;
      useGoogleSignup.value = true;
      form.name = response.google_user.name;
      form.email = response.google_user.email;
      return;
    }

    const authResponse = response as { token: string; user: import('@/types/api').ApiUser };
    await setAuth(authResponse.token, authResponse.user);
    const toast = await toastController.create({
      message: 'Você já possui conta. Redirecionando...',
      duration: 2500,
    });
    await toast.present();
    await router.replace({ name: 'Home' });
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Não foi possível conectar com Google.';
  } finally {
    googleLoading.value = false;
  }
}

async function completeCheckout() {
  if (!selectedPackageType.value) {
    error.value = 'Selecione um pacote para continuar.';
    return;
  }

  const checkout = await startCheckout(
    props.username,
    selectedPackageType.value,
    selectedAddonIds.value,
  );

  if (checkout.checkout_url) {
    await Browser.open({ url: checkout.checkout_url });
  } else {
    const toast = await toastController.create({
      message: checkout.message ?? 'Cadastro realizado. Pagamento pendente de configuração.',
      duration: 3500,
    });
    await toast.present();
  }

  await router.replace({ name: 'Home' });
}

async function submit() {
  if (!selectedPackageType.value) {
    error.value = 'Selecione um pacote para continuar.';
    return;
  }

  submitting.value = true;
  error.value = '';

  try {
    if (useGoogleSignup.value) {
      if (!googleTokens.value) {
        error.value = 'Conecte com Google antes de continuar.';
        return;
      }

      const auth = await registerWithGoogle({
        ...googleTokens.value,
        name: form.name,
        cpf: form.cpf,
        barbershop_username: props.username,
      });
      await setAuth(auth.token, auth.user);
      await completeCheckout();
      return;
    }

    const auth = await register({
      ...form,
      barbershop_username: props.username,
    });
    await setAuth(auth.token, auth.user);
    await completeCheckout();
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Não foi possível concluir o cadastro.';
  } finally {
    submitting.value = false;
  }
}

onMounted(async () => {
  googleEnabled.value = await isGoogleAuthAvailable();
  await initializeGoogleAuth();

  try {
    profile.value = await fetchBarbershop(props.username);
    selectedPackageType.value = profile.value.service_plans.packages[0]?.type ?? null;
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Não foi possível carregar os planos.';
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.center-spinner {
  display: block;
  margin: 4rem auto;
}

.shop-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.shop-header h2 {
  margin: 0;
}

.shop-header p {
  margin: 0;
  color: #6b7280;
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

.section-title {
  margin: 1.5rem 0 0.5rem;
  font-size: 1rem;
}

.error {
  margin-top: 1rem;
}
</style>
