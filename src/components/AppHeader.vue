<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons v-if="showBack" slot="start">
        <ion-back-button :default-href="backHref" />
      </ion-buttons>
      <ion-title>{{ title }}</ion-title>
      <ion-buttons v-if="$slots.end" slot="end">
        <slot name="end" />
      </ion-buttons>
    </ion-toolbar>
  </ion-header>
</template>

<script setup lang="ts">
import { IonBackButton, IonButtons, IonHeader, IonTitle, IonToolbar } from '@ionic/vue';

withDefaults(
  defineProps<{
    title: string;
    showBack?: boolean;
    backHref?: string;
  }>(),
  {
    showBack: false,
    backHref: '/login',
  },
);
</script>
