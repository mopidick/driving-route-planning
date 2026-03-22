<script setup lang="ts">
import type { TransportMode } from '../types';

const model = defineModel<TransportMode>({ required: true });
</script>

<template>
  <div class="mode-switch">
    <button
      type="button"
      class="mode-item"
      :class="{ active: model === 'driving' }"
      @click="model = 'driving'"
    >
      自驾
    </button>
    <button
      type="button"
      class="mode-item"
      :class="{ active: model === 'transit' }"
      @click="model = 'transit'"
    >
      公共交通
    </button>
  </div>
</template>

<style scoped>
.mode-switch {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  background: rgba(15, 23, 42, 0.04);
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 12px;
  padding: 4px;
}

.mode-item {
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: #64748b;
  padding: 9px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.22s cubic-bezier(0.22, 1, 0.36, 1);
  font-size: 13px;
}

.mode-item.active {
  background: linear-gradient(120deg, #1677ff, #0f5fe0);
  color: #fff;
  box-shadow: 0 8px 18px rgba(22, 119, 255, 0.26);
}
</style>
