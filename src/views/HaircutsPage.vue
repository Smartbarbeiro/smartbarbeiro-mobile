<template>
  <ion-page>
    <AppHeader title="Cortes" />

    <ion-content class="page-content ion-padding" :class="{ 'sb-content-with-tabs': showTabBar }">
      <p>Galeria de fotos dos seus cortes — mesma experiência do site, em breve no app.</p>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { IonContent, IonPage, onIonViewWillEnter } from '@ionic/vue';
import AppHeader from '@/components/AppHeader.vue';
import { useClientTabBar } from '@/composables/useClientTabBar';
import { fetchMe } from '@/services/api';
import { getToken, setAuth } from '@/services/storage';

const { showTabBar, refreshTabBarVisibility } = useClientTabBar();

async function loadAccount() {
  try {
    const token = await getToken();
    if (token) {
      const response = await fetchMe();
      await setAuth(token, response.user);
    }
  } catch {
    // Keep cached session on network errors.
  }

  await refreshTabBarVisibility();
}

onMounted(() => {
  void loadAccount();
});

onIonViewWillEnter(() => {
  void loadAccount();
});
</script>

<style scoped>
.page-content {
  --background: #f3f4f6;
}
</style>
