<template>
  <ion-modal :is-open="isOpen" @didDismiss="emit('dismiss')">
    <ion-header>
      <ion-toolbar>
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

      <p class="hint">
        Pague com cartão, Google Pay ou Apple Pay no fluxo seguro da Stripe.
      </p>

      <ion-text v-if="error" color="danger">
        <p class="error">{{ error }}</p>
      </ion-text>

      <ion-button expand="block" color="dark" :disabled="processing" @click="startPayment">
        {{ processing ? 'Processando...' : `Pagar ${formattedAmount}` }}
      </ion-button>

      <ion-spinner v-if="processing" name="crescent" class="center-spinner" />
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
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
import { ApiError, confirmCheckout, formatCurrency, prepareCheckout } from '@/services/api';
import { presentSubscriptionPaymentSheet } from '@/services/stripeCheckout';
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

const formattedAmount = computed(() => formatCurrency(props.amount));

async function startPayment() {
  if (!props.paymentConfig?.publishable_key) {
    error.value = 'Pagamentos não estão configurados.';
    return;
  }

  processing.value = true;
  error.value = '';

  try {
    const prepare = await prepareCheckout(props.username, props.packageType, props.addonIds);
    await presentSubscriptionPaymentSheet(props.paymentConfig, prepare);

    const response = await confirmCheckout(props.username, prepare.subscription_id);
    emit('completed', response.message ?? 'Assinatura ativada com sucesso.');
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Não foi possível concluir o pagamento.';
  } finally {
    processing.value = false;
  }
}

watch(
  () => props.isOpen,
  (open) => {
    if (!open) {
      error.value = '';
      processing.value = false;
    }
  },
);
</script>

<style scoped>
.summary {
  margin-bottom: 1rem;
  line-height: 1.5;
}

.hint {
  color: #6b7280;
  margin-bottom: 1.25rem;
  line-height: 1.5;
}

.center-spinner {
  display: block;
  margin: 1.5rem auto;
}

.error {
  margin-bottom: 1rem;
}
</style>
