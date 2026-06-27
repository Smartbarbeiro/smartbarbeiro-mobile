<template>
  <ion-page>
    <ion-content class="onboarding-content" fullscreen>
      <div
        ref="viewportRef"
        class="slides-viewport"
        @scroll.passive="syncActiveIndex"
      >
        <div class="slides-track">
          <section
            v-for="(slide, index) in slides"
            :key="index"
            class="slide"
            :aria-hidden="index !== activeIndex"
          >
            <ion-icon :icon="slide.icon" class="slide-icon" />
            <h1>{{ slide.title }}</h1>
            <p>{{ slide.text }}</p>
          </section>
        </div>
      </div>

      <div class="dots">
        <button
          v-for="(_, index) in slides"
          :key="index"
          type="button"
          class="dot"
          :class="{ active: index === activeIndex }"
          :aria-label="`Ir para o passo ${index + 1}`"
          @click="scrollToSlide(index)"
        />
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
import { computed, onMounted, ref } from 'vue';
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
const viewportRef = ref<HTMLElement | null>(null);
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

const isLastSlide = computed(() => activeIndex.value >= slides.length - 1);

function syncActiveIndex() {
  const viewport = viewportRef.value;

  if (!viewport || viewport.clientWidth === 0) {
    return;
  }

  activeIndex.value = Math.round(viewport.scrollLeft / viewport.clientWidth);
}

function scrollToSlide(index: number) {
  const viewport = viewportRef.value;

  if (!viewport) {
    return;
  }

  activeIndex.value = index;
  viewport.scrollTo({
    left: index * viewport.clientWidth,
    behavior: 'smooth',
  });
}

async function finishOnboarding() {
  await setOnboardingComplete();
  await router.replace({ name: 'QrScan' });
}

async function continueFlow() {
  if (isLastSlide.value) {
    await finishOnboarding();
    return;
  }

  scrollToSlide(activeIndex.value + 1);
}

async function skip() {
  await finishOnboarding();
}

onMounted(() => {
  syncActiveIndex();
});
</script>

<style scoped>
.onboarding-content {
  --background: linear-gradient(180deg, #111827 0%, #1f2937 100%);
}

.slides-viewport {
  height: calc(100% - 140px);
  overflow-x: auto;
  overflow-y: hidden;
  scroll-snap-type: x mandatory;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.slides-viewport::-webkit-scrollbar {
  display: none;
}

.slides-track {
  display: flex;
  height: 100%;
}

.slide {
  flex: 0 0 100%;
  scroll-snap-align: start;
  scroll-snap-stop: always;
  min-height: 100%;
  box-sizing: border-box;
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
  position: absolute;
  left: 0;
  right: 0;
  bottom: 7.5rem;
  display: flex;
  justify-content: center;
  gap: 0.5rem;
}

.dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 999px;
  background: #4b5563;
  border: 0;
  padding: 0;
  cursor: pointer;
  transition: width 0.2s ease, background 0.2s ease;
}

.dot.active {
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
