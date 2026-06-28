<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    name: string;
    photoUrl?: string | null;
    size?: 'sm' | 'md' | 'lg' | 'xl';
  }>(),
  {
    photoUrl: null,
    size: 'lg',
  },
);

const sizeClasses: Record<string, string> = {
  sm: 'avatar-sm',
  md: 'avatar-md',
  lg: 'avatar-lg',
  xl: 'avatar-xl',
};

const initials = computed(() => {
  const parts = props.name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return '?';
  }

  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }

  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
});

const isDefaultBarbershopPhoto = computed(
  () => props.photoUrl?.includes('/images/icone-barbearia.png') ?? false,
);
</script>

<template>
  <div class="avatar-circle" :class="[sizeClasses[size], { 'avatar-has-photo': photoUrl }]">
    <img
      v-if="photoUrl"
      :src="photoUrl"
      :alt="`${name} profile photo`"
      :class="{ 'avatar-default-barbershop': isDefaultBarbershopPhoto }"
    />
    <span v-else>{{ initials }}</span>
  </div>
</template>
