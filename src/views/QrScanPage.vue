<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/login" />
        </ion-buttons>
        <ion-title>Escanear QR</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <p class="hint">
        Aponte a câmera para o QR Code da barbearia. Você também pode colar o link ou digitar o nome da barbearia.
      </p>

      <ion-button
        v-if="isNative"
        expand="block"
        class="ion-margin-bottom"
        :disabled="scanning"
        @click="startNativeScan"
      >
        {{ scanning ? 'Abrindo câmera...' : 'Escanear com a câmera' }}
      </ion-button>

      <div v-else ref="scannerHost" class="scanner-host" />

      <div class="url-field ion-margin-top">
        <label class="url-label">Link da barbearia</label>
        <div class="url-input-row">
          <span class="url-prefix">{{ profileBaseUrl }}</span>
          <ion-input
            v-model="searchText"
            class="url-suffix"
            placeholder="nome ou usuário da barbearia"
            autocomplete="off"
            autocorrect="off"
            :spellcheck="false"
            @ionInput="onSearchInput"
          />
        </div>
        <ul v-if="suggestions.length" class="suggestions">
          <li
            v-for="item in suggestions"
            :key="item.username"
            class="suggestion-item"
            @mousedown.prevent="selectSuggestion(item)"
            @click="selectSuggestion(item)"
          >
            <ion-avatar slot="start" class="suggestion-avatar">
              <img
                v-if="resolveApiAssetUrl(item.profile_photo_url)"
                :src="resolveApiAssetUrl(item.profile_photo_url)!"
                :alt="item.name"
              />
              <div v-else class="suggestion-avatar-fallback">{{ item.name.charAt(0) }}</div>
            </ion-avatar>
            <div class="suggestion-text">
              <strong>{{ item.name }}</strong>
              <span>{{ item.username }}</span>
            </div>
          </li>
        </ul>
        <p v-else-if="searching && searchQuery.length >= 3" class="suggestions-hint">Buscando barbearias...</p>
        <p v-else-if="searchError" class="suggestions-hint suggestions-error">{{ searchError }}</p>
        <p v-else-if="searchAttempted && searchQuery.length >= 3 && !searching" class="suggestions-hint">
          Nenhuma barbearia encontrada.
        </p>
      </div>

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
import { Capacitor } from '@capacitor/core';
import {
  CapacitorBarcodeScanner,
  CapacitorBarcodeScannerCameraDirection,
  CapacitorBarcodeScannerTypeHint,
} from '@capacitor/barcode-scanner';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import {
  IonAvatar,
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonPage,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/vue';
import { Html5Qrcode } from 'html5-qrcode';
import type { BarbershopSearchResult } from '@/types/api';
import {
  ApiError,
  fetchBarbershop,
  getApiBaseUrl,
  getBarbershopProfileBaseUrl,
  parseBarbershopUsernameFromQr,
  resolveApiAssetUrl,
  searchBarbershops,
} from '@/services/api';
import { ensureCameraPermission } from '@/services/cameraPermission';
import { setPreferredBarbershop } from '@/services/storage';

const router = useRouter();
const scannerHost = ref<HTMLElement | null>(null);
const searchText = ref('');
const selectedUsername = ref('');
const profileBaseUrl = ref(getBarbershopProfileBaseUrl());
const suggestions = ref<BarbershopSearchResult[]>([]);
const searching = ref(false);
const searchAttempted = ref(false);
const searchError = ref('');
const error = ref('');
const scanning = ref(false);
const isNative = Capacitor.isNativePlatform();
const searchQuery = computed(() => searchText.value.trim());
let scanner: Html5Qrcode | null = null;
let handled = false;
let searchTimer: ReturnType<typeof setTimeout> | null = null;

function normalizeSearchInput(raw: string): string {
  const trimmed = raw.trim();
  const fromUrl = parseBarbershopUsernameFromQr(trimmed);

  return fromUrl ?? trimmed;
}

function resolveUsernameForContinue(): string | null {
  if (selectedUsername.value) {
    return selectedUsername.value;
  }

  const normalized = normalizeSearchInput(searchText.value);
  const fromUrl = parseBarbershopUsernameFromQr(normalized);

  if (fromUrl) {
    return fromUrl;
  }

  if (/^[a-z0-9._-]+$/i.test(normalized)) {
    return normalized;
  }

  return null;
}

function scheduleSearch() {
  if (searchTimer) {
    clearTimeout(searchTimer);
  }

  searchTimer = setTimeout(async () => {
    const query = searchQuery.value;

    if (query.length < 3) {
      suggestions.value = [];
      searchAttempted.value = false;
      searchError.value = '';
      searching.value = false;
      return;
    }

    searching.value = true;
    searchAttempted.value = false;
    searchError.value = '';

    try {
      const response = await searchBarbershops(query);
      suggestions.value = response.results;
      searchAttempted.value = true;
    } catch (err) {
      suggestions.value = [];
      searchAttempted.value = true;
      searchError.value =
        err instanceof ApiError
          ? err.message
          : `Sem conexão com ${getApiBaseUrl()}. Confirme que o Laravel está rodando com php artisan serve --host=0.0.0.0 --port=8000 e que o celular está na mesma rede Wi‑Fi.`;
    } finally {
      searching.value = false;
    }
  }, 300);
}

function onSearchInput(event: CustomEvent) {
  const raw = (event.detail.value ?? '') as string;
  const normalized = normalizeSearchInput(raw);

  if (normalized !== searchText.value) {
    searchText.value = normalized;
  }

  selectedUsername.value = '';
  error.value = '';
}

watch(searchText, () => {
  scheduleSearch();
});

function selectSuggestion(item: BarbershopSearchResult) {
  searchText.value = item.username;
  selectedUsername.value = item.username;
  suggestions.value = [];
  searchAttempted.value = false;
  searchError.value = '';
  error.value = '';
}

async function openBarbershop(username: string) {
  if (handled) {
    return;
  }

  handled = true;
  error.value = '';

  try {
    const barbershop = await fetchBarbershop(username);
    await setPreferredBarbershop({
      username: barbershop.profile.username,
      name: barbershop.profile.name,
      profile_photo_url: barbershop.profile.profile_photo_url,
    });
    await stopWebScanner();
    await router.replace({ name: 'PlanBuilder', params: { username } });
  } catch (err) {
    handled = false;
    error.value =
      err instanceof ApiError
        ? err.message
        : `Sem conexão com ${getApiBaseUrl()}. Confirme que o Laravel está rodando e que o celular está na mesma rede Wi‑Fi.`;
  }
}

async function continueWithManual() {
  const username = resolveUsernameForContinue();
  if (!username) {
    error.value = 'Selecione uma barbearia na lista ou informe o usuário após o link.';
    return;
  }

  await openBarbershop(username);
}

async function handleScanResult(decodedText: string) {
  const username = parseBarbershopUsernameFromQr(decodedText);
  if (!username) {
    error.value = 'QR Code inválido. Use o QR da barbearia no app Smart Barbeiro.';
    return;
  }

  await openBarbershop(username);
}

async function startNativeScan() {
  if (scanning.value) {
    return;
  }

  scanning.value = true;
  error.value = '';

  try {
    const permission = await ensureCameraPermission();

    if (permission === 'denied') {
      error.value =
        'Permissão de câmera negada. Abra Configurações > Smart Barbeiro > Permissões e habilite a câmera, ou use o campo abaixo.';
      return;
    }

    const result = await CapacitorBarcodeScanner.scanBarcode({
      hint: CapacitorBarcodeScannerTypeHint.QR_CODE,
      scanInstructions: 'Aponte para o QR Code da barbearia',
      cameraDirection: CapacitorBarcodeScannerCameraDirection.BACK,
    });

    await handleScanResult(result.ScanResult);
  } catch (err) {
    const message = err instanceof Error ? err.message.toLowerCase() : '';

    if (!message.includes('cancel') && !message.includes('user')) {
      error.value = 'Não foi possível acessar a câmera. Use o campo abaixo para colar o link.';
    }
  } finally {
    scanning.value = false;
  }
}

async function stopWebScanner() {
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

async function startWebScanner() {
  if (!scannerHost.value) {
    return;
  }

  const permission = await ensureCameraPermission();
  if (permission === 'denied') {
    error.value = 'Permissão de câmera negada. Use o campo abaixo para colar o link.';
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
        await handleScanResult(decodedText);
      },
      () => {
        // ignore frame scan errors
      },
    );
  } catch {
    error.value = 'Não foi possível acessar a câmera. Use o campo abaixo para colar o link.';
  }
}

onBeforeUnmount(async () => {
  if (searchTimer) {
    clearTimeout(searchTimer);
  }

  await stopWebScanner();
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

.url-field {
  position: relative;
  z-index: 1;
}

.url-label {
  display: block;
  margin-bottom: 0.35rem;
  font-size: 0.875rem;
  color: #6b7280;
}

.url-input-row {
  display: flex;
  align-items: stretch;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  overflow: hidden;
  background: #fff;
}

.url-prefix {
  display: flex;
  align-items: center;
  padding: 0 0.65rem;
  font-size: 0.82rem;
  color: #6b7280;
  background: #f3f4f6;
  border-right: 1px solid #e5e7eb;
  white-space: nowrap;
  user-select: none;
  max-width: 55%;
  overflow: hidden;
  text-overflow: ellipsis;
}

.url-suffix {
  flex: 1;
  min-width: 0;
  --padding-start: 0.65rem;
  --padding-end: 0.65rem;
  --background: transparent;
}

.suggestions {
  margin: 0.35rem 0 0;
  padding: 0;
  list-style: none;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
  max-height: 240px;
  overflow-y: auto;
}

.suggestion-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.65rem 0.85rem;
  cursor: pointer;
}

.suggestion-item:hover,
.suggestion-item:active {
  background: #f3f4f6;
}

.suggestion-avatar {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
}

.suggestion-avatar-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #e5e7eb;
  color: #374151;
  font-weight: 600;
  text-transform: uppercase;
}

.suggestion-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.suggestion-text strong {
  font-size: 0.95rem;
  color: #111827;
}

.suggestion-text span {
  font-size: 0.82rem;
  color: #6b7280;
}

.suggestions-hint {
  margin: 0.35rem 0 0;
  font-size: 0.82rem;
  color: #6b7280;
}

.suggestions-error {
  color: #dc2626;
}

.error {
  margin-top: 1rem;
}
</style>
