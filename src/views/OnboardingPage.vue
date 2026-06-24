<template>
  <ion-page>
    <ion-content class="onboarding-content" fullscreen>
      <div class="slide">
        <ion-icon :icon="currentSlide.icon" class="slide-icon" />
        <h1>{{ currentSlide.title }}</h1>
        <p>{{ currentSlide.text }}</p>
        <div class="dots">
          <span
            v-for="(_, index) in slides"
            :key="index"
            :class="{ active: index === activeIndex }"
          />
        </div>
      </div>

      <div class="actions ion-padding">
        <ion-button expand="block" @click="continueFlow">
          {{ isLastSlide ? 'Começar' : 'Próximo' }}
        </ion-button>
        <ion-button v-if="!isLastSlide" fill="clear" expand="block" @click="skip">
          Pular
        </ion-button>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonPage,
} from '@ionic/vue';
import { cutOutline, qrCodeOutline, sparklesOutline } from 'ionicons/icons';
import { setOnboardingComplete } from '@/services/storage';

const router = useRouter();
const activeIndex = ref(0);

const slides = [
  {
    icon: sparklesOutline,
    title: 'Bem-vindo ao Smart Barbeiro',
    text: 'Assine o plano da sua barbearia favorita e aproveite benefícios exclusivos todo mês.',
  },
  {
    icon: qrCodeOutline,
    title: 'Escaneie o QR da barbearia',
    text: 'Na barbearia, aponte a câmera para o QR Code no balcão para ver os planos disponíveis.',
  },
  {
    icon: cutOutline,
    title: 'Monte seu plano',
    text: 'Escolha o pacote, adicione extras e finalize o cadastro em poucos passos.',
  },
];

const currentSlide = computed(() => slides[activeIndex.value]);
const isLastSlide = computed(() => activeIndex.value >= slides.length - 1);

async function finishOnboarding() {
  await setOnboardingComplete();
  await router.replace({ name: 'QrScan' });
}

async function continueFlow() {
  if (isLastSlide.value) {
    await finishOnboarding();
    return;
  }

  activeIndex.value += 1;
}

async function skip() {
  await finishOnboarding();
}
</script>

<style scoped>
.onboarding-content {
  --background: linear-gradient(180deg, #111827 0%, #1f2937 100%);
}

.slide {
  min-height: calc(100% - 120px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 2rem;
  color: #f9fafb;
}

.slide-icon {
  font-size: 4rem;
  margin-bottom: 1.5rem;
  color: #fbbf24;
}

.slide h1 {
  font-size: 1.6rem;
  margin-bottom: 0.75rem;
}

.slide p {
  color: #d1d5db;
  line-height: 1.5;
  max-width: 20rem;
}

.dots {
  display: flex;
  gap: 0.5rem;
  margin-top: 2rem;
}

.dots span {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 999px;
  background: #4b5563;
}

.dots span.active {
  background: #fbbf24;
  width: 1.25rem;
}

.actions {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(17, 24, 39, 0.95);
}
</style>
