<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="dark">
        <ion-buttons slot="start">
          <ion-back-button default-href="/login" />
        </ion-buttons>
        <ion-title>Escanear QR</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <p class="hint">
        Aponte a câmera para o QR Code da barbearia. Você também pode colar o link ou digitar o usuário da barbearia.
      </p>

      <div ref="scannerHost" class="scanner-host" />

      <ion-item lines="full" class="ion-margin-top">
        <ion-label position="stacked">Link ou usuário da barbearia</ion-label>
        <ion-input v-model="manualValue" placeholder="https://.../barbearias/minha-barbearia" />
      </ion-item>

      <ion-text v-if="error" color="danger">
        <p class="error">{{ error }}</p>
      </ion-text>

      <ion-button expand="block" class="ion-margin-top" @click="continueWithManual">
        Continuar
      </ion-button>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonPage,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/vue';
import { Html5Qrcode } from 'html5-qrcode';
import { ApiError, fetchBarbershop, parseBarbershopUsernameFromQr } from '@/services/api';

const router = useRouter();
const scannerHost = ref<HTMLElement | null>(null);
const manualValue = ref('');
const error = ref('');
let scanner: Html5Qrcode | null = null;
let handled = false;

async function openBarbershop(username: string) {
  if (handled) {
    return;
  }

  handled = true;
  error.value = '';

  try {
    await fetchBarbershop(username);
    await stopScanner();
    await router.replace({ name: 'PlanBuilder', params: { username } });
  } catch (err) {
    handled = false;
    error.value = err instanceof ApiError ? err.message : 'Barbearia não encontrada.';
  }
}

async function continueWithManual() {
  const username = parseBarbershopUsernameFromQr(manualValue.value);
  if (!username) {
    error.value = 'Informe um link ou usuário válido da barbearia.';
    return;
  }

  await openBarbershop(username);
}

async function stopScanner() {
  if (!scanner) {
    return;
  }

  try {
    if (scanner.isScanning) {
      await scanner.stop();
    }
    scanner.clear();
  } catch {
    // ignore camera cleanup errors
  }

  scanner = null;
}

onMounted(async () => {
  if (!scannerHost.value) {
    return;
  }

  const elementId = 'qr-reader';
  scannerHost.value.id = elementId;
  scanner = new Html5Qrcode(elementId);

  try {
    await scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      async (decodedText) => {
        const username = parseBarbershopUsernameFromQr(decodedText);
        if (username) {
          await openBarbershop(username);
        }
      },
      () => {
        // ignore frame scan errors
      },
    );
  } catch {
    error.value = 'Não foi possível acessar a câmera. Use o campo abaixo para colar o link.';
  }
});

onBeforeUnmount(async () => {
  await stopScanner();
});
</script>

<style scoped>
.hint {
  color: #4b5563;
  line-height: 1.5;
}

.scanner-host {
  width: 100%;
  min-height: 280px;
  border-radius: 12px;
  overflow: hidden;
  background: #111827;
}

.error {
  margin-top: 1rem;
}
</style>
