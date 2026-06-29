<template>
  <ion-page>
    <AppHeader title="Cortes" />

    <ion-content class="page-content ion-padding" :class="{ 'sb-content-with-tabs': showTabBar }">
      <p>Galeria de fotos dos seus cortes — mesma experiência do site, em breve no app.</p>
      <ClientTabBar v-if="showTabBar" />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonContent, IonPage } from '@ionic/vue';
import AppHeader from '@/components/AppHeader.vue';
import ClientTabBar from '@/components/ClientTabBar.vue';
import { useClientTabBar } from '@/composables/useClientTabBar';

const { showTabBar } = useClientTabBar();
</script>

<style scoped>
.page-content {
  --background: #f3f4f6;
}
</style>
