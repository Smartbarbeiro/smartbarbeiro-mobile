<template>
  <ion-page>
    <ion-content class="ion-padding ion-text-center">
      <div class="bootstrap">
        <ion-spinner name="crescent" />
        <p>Carregando...</p>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { IonContent, IonPage, IonSpinner } from '@ionic/vue';
import { getToken, isOnboardingComplete } from '@/services/storage';

const router = useRouter();

onMounted(async () => {
  const token = await getToken();
  const onboardingDone = await isOnboardingComplete();

  if (token) {
    await router.replace({ name: 'Home' });
    return;
  }

  if (!onboardingDone) {
    await router.replace({ name: 'Onboarding' });
    return;
  }

  await router.replace({ name: 'Login' });
});
</script>

<style scoped>
.bootstrap {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
}
</style>
