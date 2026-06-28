<template>
  <ion-page>
    <ion-content class="sb-page-light sb-content-with-tabs">
      <div class="sb-stub-page">
        <h1>Meu plano</h1>
        <p v-if="user?.primary_barbershop_username">
          Em breve você verá aqui o status da assinatura em @{{ user.primary_barbershop_username }}.
        </p>
        <p v-else>Vincule-se a uma barbearia para acompanhar seu plano.</p>
        <button v-if="username" type="button" class="sb-btn-dark mt-4" @click="goToPlan">
          Ir para a barbearia
        </button>
      </div>
      <ClientTabBar />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { IonContent, IonPage } from '@ionic/vue';
import ClientTabBar from '@/components/ClientTabBar.vue';
import { fetchMe } from '@/services/api';
import { getStoredUser } from '@/services/storage';
import type { ApiUser } from '@/types/api';

const router = useRouter();
const user = ref<ApiUser | null>(null);

const username = computed(() => user.value?.primary_barbershop_username ?? null);

onMounted(async () => {
  user.value = await getStoredUser<ApiUser>();

  try {
    const response = await fetchMe();
    user.value = response.user;
  } catch {
    // Router guard handles auth redirect.
  }
});

async function goToPlan() {
  if (!username.value) {
    return;
  }

  await router.push({ name: 'PlanBuilder', params: { username: username.value } });
}
</script>

<style scoped>
.mt-4 {
  margin-top: 1rem;
  max-width: 20rem;
  margin-inline: auto;
  display: block;
}
</style>
