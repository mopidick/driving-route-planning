<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    name: 'locate' | 'spark' | 'settings' | 'plus' | 'minus' | 'check' | 'detail' | 'refresh';
    size?: number;
  }>(),
  {
    size: 16
  }
);

const path = computed(() => {
  switch (props.name) {
    case 'locate':
      return 'M12 2l2.5 6.5L21 11l-6.5 2.5L12 20l-2.5-6.5L3 11l6.5-2.5z';
    case 'spark':
      return 'M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z M19 3l.8 2.2L22 6l-2.2.8L19 9l-.8-2.2L16 6l2.2-.8z M5 15l.8 2.2L8 18l-2.2.8L5 21l-.8-2.2L2 18l2.2-.8z';
    case 'settings':
      return 'M12 8.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7zm9 3.5l-2 .8a7.8 7.8 0 01-.4 1l1.2 1.8-1.6 1.6-1.8-1.2a7.8 7.8 0 01-1 .4l-.8 2h-2.2l-.8-2a7.8 7.8 0 01-1-.4l-1.8 1.2-1.6-1.6 1.2-1.8a7.8 7.8 0 01-.4-1l-2-.8v-2.2l2-.8a7.8 7.8 0 01.4-1L4.8 6.4l1.6-1.6 1.8 1.2a7.8 7.8 0 011-.4l.8-2h2.2l.8 2a7.8 7.8 0 011 .4l1.8-1.2 1.6 1.6-1.2 1.8c.16.32.3.66.4 1l2 .8z';
    case 'plus':
      return 'M12 5v14M5 12h14';
    case 'minus':
      return 'M5 12h14';
    case 'check':
      return 'M5 13l4 4L19 7';
    case 'detail':
      return 'M4 6h16M4 12h12M4 18h8';
    case 'refresh':
      return 'M20 6v5h-5M4 18v-5h5M6.5 9A7 7 0 0118 7l2 2M17.5 15A7 7 0 016 17l-2-2';
    default:
      return '';
  }
});
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path :d="path" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
</template>
