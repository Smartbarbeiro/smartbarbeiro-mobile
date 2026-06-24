<template>
  <ion-modal :is-open="isOpen" @didDismiss="emit('dismiss')">
    <ion-header>
      <ion-toolbar color="dark">
        <ion-title>Pagamento</ion-title>
        <ion-buttons slot="end">
          <ion-button :disabled="processing" @click="emit('dismiss')">Fechar</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <p class="summary">
        <strong>{{ planLabel }}</strong><br />
        Total mensal: {{ formattedAmount }}
      </p>

      <ion-text v-if="error" color="danger">
        <p class="error">{{ error }}</p>
      </ion-text>

      <ion-button
        v-if="walletAvailable && walletPlatform === 'android'"
        expand="block"
        color="dark"
        class="wallet-button"
        :disabled="processing"
        @click="payWithWallet"
      >
        <span class="wallet-label">Pagar com Google Pay</span>
      </ion-button>

      <ion-button
        v-if="walletAvailable && walletPlatform === 'ios'"
        expand="block"
        color="dark"
        class="wallet-button apple-pay"
        :disabled="processing"
        @click="payWithWallet"
      >
        <span class="wallet-label">Pagar com Apple Pay</span>
      </ion-button>

      <p v-if="showCardFallback" class="divider">ou pague com cartão</p>

      <div v-if="showCardFallback" :id="brickContainerId" class="brick-container" />

      <ion-spinner v-if="processing" name="crescent" class="center-spinner" />
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonModal,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/vue';
import { ApiError, formatCurrency, startCheckout } from '@/services/api';
import { mountCardPaymentBrick } from '@/services/mercadoPagoBrick';
import { isWalletPayAvailable, requestWalletPayment, type WalletPlatform } from '@/services/walletPay';
import type { PaymentConfig } from '@/types/api';

const props = defineProps<{
  isOpen: boolean;
  username: string;
  packageType: string;
  addonIds: number[];
  amount: number;
  planLabel: string;
  paymentConfig: PaymentConfig | null;
}>();

const emit = defineEmits<{
  dismiss: [];
  completed: [message: string];
}>();

const processing = ref(false);
const error = ref('');
const walletAvailable = ref(false);
const walletPlatform = ref<WalletPlatform>('web');
const brickContainerId = `mp-card-brick-${Math.random().toString(36).slice(2)}`;
let unmountBrick: (() => void) | null = null;

const formattedAmount = computed(() => formatCurrency(props.amount));

const showCardFallback = computed(() => Boolean(props.paymentConfig?.public_key));

async function refreshWalletAvailability() {
  const availability = await isWalletPayAvailable(props.paymentConfig);
  walletAvailable.value = availability.available;
  walletPlatform.value = availability.platform;
}

async function completeCheckout(payment: Parameters<typeof startCheckout>[3]) {
  processing.value = true;
  error.value = '';

  try {
    const response = await startCheckout(
      props.username,
      props.packageType,
      props.addonIds,
      payment,
    );

    emit('completed', response.message ?? 'Assinatura ativada com sucesso.');
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Não foi possível concluir o pagamento.';
  } finally {
    processing.value = false;
  }
}

async function payWithWallet() {
  if (!props.paymentConfig) {
    error.value = 'Pagamentos não estão configurados.';
    return;
  }

  processing.value = true;
  error.value = '';

  try {
    const walletPayment = await requestWalletPayment(props.paymentConfig, props.amount, props.planLabel);
    await completeCheckout({
      type: 'wallet',
      wallet_type: walletPayment.wallet_type,
      wallet_token: walletPayment.wallet_token,
    });
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Não foi possível concluir o pagamento.';
    processing.value = false;
  }
}

async function payWithCardToken(token: string) {
  await completeCheckout({
    type: 'card_token',
    card_token_id: token,
  });
}

async function mountBrick() {
  if (!props.isOpen || !props.paymentConfig?.public_key || unmountBrick) {
    return;
  }

  await refreshWalletAvailability();

  try {
    unmountBrick = await mountCardPaymentBrick(
      brickContainerId,
      props.paymentConfig.public_key,
      props.amount,
      async (token) => {
        await payWithCardToken(token);
      },
    );
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Não foi possível carregar o formulário de cartão.';
  }
}

function destroyBrick() {
  unmountBrick?.();
  unmountBrick = null;
}

watch(
  () => props.isOpen,
  async (open) => {
    if (!open) {
      destroyBrick();
      error.value = '';
      processing.value = false;
      return;
    }

    await mountBrick();
  },
);

onBeforeUnmount(() => {
  destroyBrick();
});
</script>

<style scoped>
.summary {
  margin-bottom: 1.25rem;
  line-height: 1.5;
}

.wallet-button {
  margin-bottom: 0.75rem;
}

.wallet-label {
  font-weight: 600;
}

.apple-pay {
  --background: #000;
  --color: #fff;
}

.divider {
  text-align: center;
  color: #6b7280;
  margin: 1rem 0;
  font-size: 0.9rem;
}

.brick-container {
  min-height: 280px;
}

.center-spinner {
  display: block;
  margin: 1.5rem auto;
}

.error {
  margin-bottom: 1rem;
}
</style>
