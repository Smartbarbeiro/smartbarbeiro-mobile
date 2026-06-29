<template>
  <ion-page>
    <ion-content class="bootstrap-content" fullscreen>
      <div class="bootstrap">
        <img :src="logoImage" class="bootstrap-logo" alt="Smart Barbeiro" />
        <ion-spinner class="bootstrap-spinner" name="circular" />
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { IonContent, IonPage, IonSpinner } from '@ionic/vue';
import logoImage from '@/assets/logo.png';
import { getToken, getPreferredBarbershop, isOnboardingComplete } from '@/services/storage';

const router = useRouter();

onMounted(async () => {
  const token = await getToken();
  const onboardingDone = await isOnboardingComplete();
  const preferredBarbershop = await getPreferredBarbershop();

  if (token) {
    await router.replace({ name: 'Home' });
    return;
  }

  if (!onboardingDone) {
    await router.replace({ name: 'Onboarding' });
    return;
  }

  if (preferredBarbershop) {
    await router.replace({ name: 'Login' });
    return;
  }

  await router.replace({ name: 'QrScan' });
});
</script>

<style scoped>
.bootstrap-content {
  --background: #000;
}

.bootstrap {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.75rem;
  padding: 2rem;
  box-sizing: border-box;
}

.bootstrap-logo {
  width: min(72vw, 16rem);
  height: auto;
  object-fit: contain;
}

.bootstrap-spinner {
  width: 2rem;
  height: 2rem;
  --color: #9ca3af;
}
</style>
