<template>
  <ion-page>
    <ion-content class="sb-page-light" :class="{ 'sb-content-with-tabs': showTabBar }">
      <ion-spinner v-if="loading" name="crescent" class="center-spinner" />

      <div v-else-if="profile" class="barbershop-profile-page">
        <div class="barbershop-profile-header" aria-hidden="true" />

        <div class="barbershop-profile-main">
          <ProfileAvatar
            :name="profile.profile.name"
            :photo-url="profilePhotoUrl"
            size="lg"
          />
          <h1 class="barbershop-profile-name">{{ profile.profile.name }}</h1>
          <p class="barbershop-profile-meta">@{{ profile.profile.username }}</p>
        </div>

        <section class="plan-builder">
          <form class="plan-form" @submit.prevent="handlePlanSubmit">
            <template v-if="!checkoutStep">
              <fieldset>
                <legend class="visually-hidden">Escolha seu plano mensal</legend>
                <div class="plan-packages-row">
                  <div v-for="pkg in profile.service_plans.packages" :key="pkg.type">
                    <input
                      :id="`package-${pkg.type}`"
                      v-model="selectedPackageType"
                      class="radioBtn"
                      name="servico"
                      type="radio"
                      :value="pkg.type"
                    />
                    <label :for="`package-${pkg.type}`" class="plan-card">
                      <div class="plan-card-body">
                        <ServicePlanIcon :variant="pkg.type === 'cut' ? 'cut' : 'cut_beard'" />
                        <p v-if="pkg.type === 'cut'">
                          <strong>CORTE<br />CABELO</strong>
                        </p>
                        <p v-else>
                          <strong>CORTE CABELO<br /><span class="underline">+ BARBA</span></strong>
                        </p>
                        <p class="plan-card-price">{{ pkg.formatted_price }}/mês</p>
                      </div>
                      <div class="plan-card-footer">ILIMITADOS</div>
                    </label>
                  </div>
                </div>
              </fieldset>

              <button
                v-if="availableAddons.length > 0 && !showAddons"
                type="button"
                class="og-btn og-btn--secondary btn-optionals"
                @click="showAddons = true"
              >
                <span class="og-btn__label">+ ADICIONAR OPCIONAIS</span>
              </button>

              <div v-if="showAddons && availableAddons.length > 0" class="plan-addons-panel">
                <p class="fw-semibold mb-3"><strong>Opcionais disponíveis</strong></p>
                <label
                  v-for="addon in availableAddons"
                  :key="addon.id"
                  class="plan-addon-item"
                  :for="`addon-${addon.id}`"
                >
                  <input
                    :id="`addon-${addon.id}`"
                    type="checkbox"
                    :checked="selectedAddonIds.includes(addon.id)"
                    @change="toggleAddon(addon.id, ($event.target as HTMLInputElement).checked)"
                  />
                  <span>
                    {{ addon.label }}
                    <span class="text-muted">({{ addon.formatted_price }}/mês)</span>
                  </span>
                </label>
              </div>

              <button type="submit" class="og-btn og-btn--primary btn-plan-submit">
                <span class="og-btn__label">{{ planBuilderSubmitLabel }}</span>
              </button>

              <p v-if="!isAuthenticated" class="plan-guest-login">
                Já tem uma conta,
                <button type="button" @click="goToLogin">entre aqui</button>
              </p>
            </template>

            <div v-if="checkoutStep === 'summary' && selectedPackage" class="plan-checkout">
              <button type="button" class="og-btn og-btn--neutral back-button" @click="editPlan">
                <span class="og-btn__label">← Voltar</span>
              </button>

              <div class="perfil-barbearia mt-4">
                <ProfileAvatar
                  :name="profile.profile.name"
                  :photo-url="profilePhotoUrl"
                  size="md"
                />
                <div class="perfil-info">
                  <h3 class="barbershop-profile-name mb-1">{{ profile.profile.name }}</h3>
                  <p class="barbershop-profile-meta mb-0">@{{ profile.profile.username }}</p>
                </div>
              </div>

              <div class="carrinho-items mt-4">
                <h3 class="h6 fw-bold mb-3"><strong>Resumo do plano</strong></h3>
                <ul>
                  <li>{{ selectedPackage.label }} — ilimitados</li>
                  <li v-for="addon in selectedAddons" :key="addon.id" class="text-muted">
                    {{ addon.label }} — {{ addon.formatted_price }}/mês
                  </li>
                  <li v-if="selectedAddons.length === 0" class="text-muted">Nenhum opcional selecionado</li>
                </ul>
              </div>

              <div class="carrinho-total">
                <p class="h5 fw-bold mb-0">Total: {{ formattedTotal }}/mês</p>
              </div>

              <button type="button" class="og-btn og-btn--primary" @click="goToPayment">
                <span class="og-btn__label">CONTINUAR PARA PAGAMENTO</span>
              </button>
            </div>

            <div v-if="checkoutStep === 'payment' && selectedPackage" class="plan-checkout plan-payment">
              <button type="button" class="og-btn og-btn--neutral back-button" @click="backToSummary">
                <span class="og-btn__label">← Voltar</span>
              </button>

              <div class="carrinho-total mb-4">
                <p class="h6 fw-bold mb-1">Total do plano</p>
                <p class="h5 fw-bold mb-0">{{ formattedTotal }}/mês</p>
              </div>

              <p class="h6 fw-bold mb-3"><strong>Método de Pagamento</strong></p>

              <button
                type="button"
                class="card-pagamento"
                :class="{ 'card-pagamento--selected': paymentMethod === 'card' }"
                @click="paymentMethod = 'card'"
              >
                <h3 class="h6 fw-bold mb-3">Cartão, Google Pay e Apple Pay</h3>
                <img :src="cardImageUrl" alt="Cartão" class="service-pix" />
              </button>

              <div v-if="!isAuthenticated" class="mt-4">
                <p class="h6 fw-bold mb-3"><strong>Crie sua conta para assinar</strong></p>

                <button
                  v-if="googleEnabled && !useGoogleSignup"
                  type="button"
                  class="oauth-google-btn mb-3"
                  :disabled="googleLoading"
                  @click="startGoogleSignup"
                >
                  <span class="oauth-google-btn__icon">G</span>
                  {{ googleLoading ? 'Conectando...' : 'Cadastrar com Google' }}
                </button>

                <div class="sb-form-field">
                  <label class="sb-form-label" for="name">Nome</label>
                  <input id="name" v-model="form.name" class="sb-form-control" autocomplete="name" :readonly="useGoogleSignup" />
                </div>
                <div class="sb-form-field">
                  <label class="sb-form-label" for="cpf">CPF</label>
                  <input id="cpf" v-model="form.cpf" class="sb-form-control" inputmode="numeric" />
                </div>
                <div class="sb-form-field">
                  <label class="sb-form-label" for="email">E-mail</label>
                  <input id="email" v-model="form.email" class="sb-form-control" type="email" autocomplete="email" :readonly="useGoogleSignup" />
                </div>
                <template v-if="!useGoogleSignup">
                  <div class="sb-form-field">
                    <label class="sb-form-label" for="password">Senha</label>
                    <input id="password" v-model="form.password" class="sb-form-control" type="password" autocomplete="new-password" />
                  </div>
                  <div class="sb-form-field">
                    <label class="sb-form-label" for="password_confirmation">Confirmar senha</label>
                    <input
                      id="password_confirmation"
                      v-model="form.password_confirmation"
                      class="sb-form-control"
                      type="password"
                      autocomplete="new-password"
                    />
                  </div>
                </template>
              </div>

              <p v-if="error" class="sb-alert sb-alert-danger mt-3">{{ error }}</p>

              <button
                v-if="paymentMethod"
                type="button"
                class="og-btn og-btn--primary mt-4"
                :disabled="submitting || !profile.stripe_configured"
                @click="confirmPayment"
              >
                <span class="og-btn__label">
                  {{ submitting ? 'PROCESSANDO...' : 'CONFIRMAR PAGAMENTO' }}
                </span>
              </button>

              <p v-if="!profile.stripe_configured" class="text-muted mt-3">
                Pagamentos indisponíveis no momento.
              </p>
            </div>
          </form>
        </section>
      </div>

      <p v-else-if="error" class="sb-alert sb-alert-danger">{{ error }}</p>

      <ClientTabBar v-if="showTabBar" />

      <WalletCheckoutSheet
        :is-open="paymentSheetOpen"
        :username="username"
        :package-type="selectedPackageType ?? 'cut'"
        :addon-ids="selectedAddonIds"
        :amount="monthlyTotal"
        :plan-label="selectedPlanLabel"
        :payment-config="profile?.payment_config ?? null"
        @dismiss="paymentSheetOpen = false"
        @completed="onPaymentCompleted"
      />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { IonContent, IonPage, IonSpinner, toastController } from '@ionic/vue';
import cardImageUrl from '@/assets/images/cartao.svg';
import ClientTabBar from '@/components/ClientTabBar.vue';
import ProfileAvatar from '@/components/ProfileAvatar.vue';
import ServicePlanIcon from '@/components/ServicePlanIcon.vue';
import WalletCheckoutSheet from '@/components/WalletCheckoutSheet.vue';
import {
  ApiError,
  fetchBarbershop,
  formatCurrency,
  loginWithGoogle,
  register,
  registerWithGoogle,
  resolveApiAssetUrl,
} from '@/services/api';
import { initializeGoogleAuth, isGoogleAuthAvailable, signInWithGoogle } from '@/services/googleAuth';
import type { GoogleTokens } from '@/services/googleAuth';
import { getToken, setAuth } from '@/services/storage';
import type { BarbershopProfileResponse } from '@/types/api';

const props = defineProps<{ username: string }>();
const router = useRouter();

const loading = ref(true);
const submitting = ref(false);
const googleLoading = ref(false);
const googleEnabled = ref(false);
const useGoogleSignup = ref(false);
const googleTokens = ref<GoogleTokens | null>(null);
const isAuthenticated = ref(false);
const showTabBar = ref(false);
const error = ref('');
const profile = ref<BarbershopProfileResponse | null>(null);
const selectedPackageType = ref<string | null>(null);
const selectedAddonIds = ref<number[]>([]);
const showAddons = ref(false);
const checkoutStep = ref<'summary' | 'payment' | null>(null);
const paymentMethod = ref<'card' | null>(null);
const paymentSheetOpen = ref(false);

const form = reactive({
  name: '',
  cpf: '',
  email: '',
  password: '',
  password_confirmation: '',
});

const profilePhotoUrl = computed(() => resolveApiAssetUrl(profile.value?.profile.profile_photo_url));

const availableAddons = computed(() => profile.value?.service_plans.addons ?? []);

const selectedPackage = computed(() =>
  profile.value?.service_plans.packages.find((pkg) => pkg.type === selectedPackageType.value),
);

const selectedAddons = computed(() =>
  availableAddons.value.filter((addon) => selectedAddonIds.value.includes(addon.id)),
);

const monthlyTotal = computed(() => {
  if (!profile.value || !selectedPackageType.value) {
    return 0;
  }

  const base = selectedPackage.value?.monthly_price ?? 0;
  const addons = selectedAddons.value.reduce((sum, addon) => sum + addon.monthly_price, 0);

  return base + addons;
});

const formattedTotal = computed(() => formatCurrency(monthlyTotal.value));

const selectedPlanLabel = computed(() => selectedPackage.value?.label ?? 'Plano mensal');

const planBuilderSubmitLabel = computed(() => (isAuthenticated.value ? 'ALTERE SEU PLANO' : 'MONTE SEU PLANO'));

function toggleAddon(addonId: number, checked: boolean) {
  if (checked) {
    selectedAddonIds.value = [...new Set([...selectedAddonIds.value, addonId])];
    return;
  }

  selectedAddonIds.value = selectedAddonIds.value.filter((id) => id !== addonId);
}

function handlePlanSubmit() {
  if (!selectedPackageType.value) {
    error.value = 'Selecione um pacote para continuar.';
    return;
  }

  error.value = '';
  checkoutStep.value = 'summary';
}

function editPlan() {
  checkoutStep.value = null;
  paymentMethod.value = null;
  error.value = '';
}

function goToPayment() {
  checkoutStep.value = 'payment';
}

function backToSummary() {
  paymentMethod.value = null;
  checkoutStep.value = 'summary';
  error.value = '';
}

async function goToLogin() {
  await router.push({ name: 'Login', query: { redirect: props.username } });
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
    isAuthenticated.value = true;
    showTabBar.value = true;
    const toast = await toastController.create({
      message: 'Conta encontrada. Continue o pagamento.',
      duration: 2500,
    });
    await toast.present();
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Não foi possível conectar com Google.';
  } finally {
    googleLoading.value = false;
  }
}

async function ensureRegistered(): Promise<boolean> {
  if (isAuthenticated.value) {
    return true;
  }

  if (useGoogleSignup.value) {
    if (!googleTokens.value) {
      error.value = 'Conecte com Google antes de continuar.';
      return false;
    }

    const auth = await registerWithGoogle({
      ...googleTokens.value,
      name: form.name,
      cpf: form.cpf,
      barbershop_username: props.username,
    });
    await setAuth(auth.token, auth.user);
    isAuthenticated.value = true;
    showTabBar.value = true;
    return true;
  }

  const auth = await register({
    ...form,
    barbershop_username: props.username,
  });
  await setAuth(auth.token, auth.user);
  isAuthenticated.value = true;
  showTabBar.value = true;
  return true;
}

async function confirmPayment() {
  if (!paymentMethod.value) {
    error.value = 'Selecione um método de pagamento.';
    return;
  }

  submitting.value = true;
  error.value = '';

  try {
    const registered = await ensureRegistered();
    if (!registered) {
      return;
    }

    if (!profile.value?.stripe_configured) {
      error.value = 'Pagamentos indisponíveis no momento.';
      return;
    }

    paymentSheetOpen.value = true;
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Não foi possível concluir o cadastro.';
  } finally {
    submitting.value = false;
  }
}

async function onPaymentCompleted(message: string) {
  paymentSheetOpen.value = false;

  const toast = await toastController.create({
    message,
    duration: 3500,
    color: 'success',
  });
  await toast.present();
  await router.replace({ name: 'Home' });
}

onMounted(async () => {
  isAuthenticated.value = !!(await getToken());
  showTabBar.value = isAuthenticated.value;
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

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.underline {
  text-decoration: underline;
}

.text-muted {
  color: #6b7280;
}

.back-button {
  margin-top: 0.5rem;
}

.fw-semibold {
  font-weight: 600;
}

.h5,
.h6 {
  margin: 0;
}

.mt-3 {
  margin-top: 0.75rem;
}

.mt-4 {
  margin-top: 1rem;
}

.mb-1 {
  margin-bottom: 0.25rem;
}

.mb-3 {
  margin-bottom: 0.75rem;
}

.mb-4 {
  margin-bottom: 1rem;
}
</style>
