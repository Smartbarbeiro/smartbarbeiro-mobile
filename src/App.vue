<template>
  <ion-app>
    <ion-router-outlet />
    <ClientTabBar />
  </ion-app>
</template>

<script setup lang="ts">
import { IonApp, IonRouterOutlet } from '@ionic/vue';
import { watch } from 'vue';
import { useRoute } from 'vue-router';
import ClientTabBar from '@/components/ClientTabBar.vue';
import { refreshClientSession } from '@/composables/useClientTabBar';

const route = useRoute();

watch(
  () => route.fullPath,
  () => {
    void refreshClientSession();
  },
  { immediate: true },
);
</script>
