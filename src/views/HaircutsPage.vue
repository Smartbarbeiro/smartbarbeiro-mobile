<template>
  <ion-page>
    <ion-content class="sb-page-light sb-content-with-tabs">
      <div class="sb-stub-page">
        <h1>Cortes</h1>
        <p>Galeria de fotos dos seus cortes — mesma experiência do site, em breve no app.</p>
      </div>
      <ClientTabBar />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonContent, IonPage } from '@ionic/vue';
import ClientTabBar from '@/components/ClientTabBar.vue';
</script>
