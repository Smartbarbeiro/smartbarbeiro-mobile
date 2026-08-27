<template>
  <ion-page>
    <ion-content class="onboarding-content" fullscreen>
      <div class="onboarding-shell">
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
              :class="{ 'slide--photo': slide.backgroundImage }"
              :style="getSlideBackgroundStyle(slide)"
              :aria-hidden="index !== activeIndex"
            >
              <div v-if="slide.backgroundImage" class="slide-overlay" />
              <div class="slide-content">
                <img
                  v-if="slide.logoImage"
                  :src="slide.logoImage"
                  class="slide-logo"
                  alt="Tesora"
                />
                <ion-icon v-else-if="slide.icon" :icon="slide.icon" class="slide-icon" />
                <h1>{{ slide.title }}</h1>
                <p v-if="slide.text">{{ slide.text }}</p>
              </div>
            </section>
          </div>
        </div>

        <div class="onboarding-footer">
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
        </div>
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
import { cutOutline, qrCodeOutline } from 'ionicons/icons';
import onboardingSlide1Bg from '@/assets/onboarding-slide-1-bg.jpg';
import onboardingSlide2Bg from '@/assets/onboarding-slide-2-bg.png';
import onboardingSlide3Bg from '@/assets/onboarding-slide-3-bg.jpg';
import logoImage from '@/assets/logo.png';
import { setOnboardingComplete } from '@/services/storage';

const router = useRouter();
const viewportRef = ref<HTMLElement | null>(null);
const activeIndex = ref(0);

const slides = [
  {
    title: 'Bem-vindo',
    logoImage,
    backgroundImage: onboardingSlide1Bg,
  },
  {
    icon: qrCodeOutline,
    title: 'Escaneie o QR da barbearia',
    text: 'Na barbearia, aponte a câmera para o QR Code no balcão para ver os planos disponíveis.',
    backgroundImage: onboardingSlide2Bg,
    backgroundPosition: 'left 30%',
  },
  {
    icon: cutOutline,
    title: 'Monte seu plano',
    text: 'Escolha o pacote, adicione extras e finalize o cadastro em poucos passos.',
    backgroundImage: onboardingSlide3Bg,
  },
];

type OnboardingSlide = (typeof slides)[number];

function getSlideBackgroundStyle(slide: OnboardingSlide) {
  if (!slide.backgroundImage) {
    return undefined;
  }

  return {
    backgroundImage: `url(${slide.backgroundImage})`,
    backgroundPosition: slide.backgroundPosition ?? 'center',
  };
}

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
  --background: transparent;
}

.onboarding-content::part(scroll) {
  overscroll-behavior: none;
}

.onboarding-shell {
  position: relative;
  height: 100%;
  min-height: 100%;
}

.slides-viewport {
  height: 100%;
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
  position: relative;
  color: #f9fafb;
}

.slide--photo {
  background-size: cover;
  background-repeat: no-repeat;
}

.slide-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    rgba(17, 24, 39, 0.35) 0%,
    rgba(17, 24, 39, 0.55) 55%,
    rgba(17, 24, 39, 0.72) 100%
  );
  pointer-events: none;
}

.slide-content {
  position: relative;
  z-index: 1;
  min-height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 2rem 2rem 11.5rem;
}

.slide-logo {
  width: min(72vw, 16rem);
  height: auto;
  margin-bottom: 1.5rem;
  object-fit: contain;
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

.onboarding-footer {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2;
  pointer-events: none;
}

.dots {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  pointer-events: auto;
}

.dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.45);
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
  pointer-events: auto;
  background: transparent;
}

.actions ion-button[fill='clear'] {
  --color: #f9fafb;
}
</style>
