<script setup lang="ts">
import type { Recommendation } from '../types';
import { formatDistance, formatDuration, formatMoney } from '../utils/format';
import AppIcon from './AppIcon.vue';
import EmbeddedMap from './EmbeddedMap.vue';

defineProps<{
  recommendation: Recommendation;
  originLng: number;
  originLat: number;
}>();

defineEmits<{
  close: [];
  accept: [Recommendation];
}>();
</script>

<template>
  <div class="drawer-mask" @click.self="$emit('close')">
    <aside class="drawer card">
      <header>
        <h3>{{ recommendation.poi.name }}</h3>
        <button type="button" class="close-btn" @click="$emit('close')">关闭</button>
      </header>

      <EmbeddedMap
        :center="{ lng: originLng, lat: originLat }"
        :height="220"
        :markers="[
          { id: 'origin', lng: originLng, lat: originLat, label: '我', highlight: true },
          {
            id: recommendation.id,
            lng: recommendation.poi.location.lng,
            lat: recommendation.poi.location.lat,
            label: recommendation.poi.name,
            highlight: true
          }
        ]"
        :polyline="recommendation.route.polyline || ''"
      />

      <div class="meta-grid">
        <div class="meta-item">
          <small>预计时长</small>
          <strong>{{ formatDuration(recommendation.route.durationSeconds) }}</strong>
        </div>
        <div class="meta-item">
          <small>距离</small>
          <strong>{{ formatDistance(recommendation.route.distanceMeters) }}</strong>
        </div>
        <div class="meta-item" v-if="recommendation.route.mode === 'driving'">
          <small>预计过路费</small>
          <strong>{{ formatMoney(recommendation.route.tollsCny) }}</strong>
        </div>
        <div class="meta-item" v-else>
          <small>预计票价</small>
          <strong>{{ formatMoney(recommendation.route.costCny) }}</strong>
        </div>
      </div>

      <section>
        <h4>出行 Tips</h4>
        <ul>
          <li v-for="tip in recommendation.tips" :key="tip">{{ tip }}</li>
        </ul>
      </section>

      <section>
        <h4>路线步骤（前 6 条）</h4>
        <ol>
          <li v-for="(step, idx) in recommendation.route.steps.slice(0, 6)" :key="idx">
            {{ step.instruction }}
          </li>
        </ol>
      </section>

      <button class="btn btn-primary" type="button" @click="$emit('accept', recommendation)">
        <AppIcon name="check" :size="14" />
        采纳并生成待办
      </button>
    </aside>
  </div>
</template>

<style scoped>
.drawer-mask {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.46);
  display: grid;
  place-items: end center;
  z-index: 60;
  animation: fade-mask 180ms linear;
}

.drawer {
  width: min(960px, 100%);
  border-radius: 28px 28px 0 0;
  padding: 18px 16px 24px;
  max-height: 86vh;
  overflow-y: auto;
  animation: pull-up 240ms cubic-bezier(0.22, 1, 0.36, 1);
  background: rgba(255, 255, 255, 0.95);
  border-color: rgba(255, 255, 255, 0.45);
  box-shadow: 0 24px 56px rgba(15, 23, 42, 0.26);
  backdrop-filter: blur(18px);
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

h3 {
  margin: 0;
}

.close-btn {
  border: 0;
  height: 36px;
  padding: 0 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.9);
  color: #475467;
}

.meta-grid {
  margin: 12px 0;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.meta-item {
  background: rgba(10, 132, 255, 0.07);
  border-radius: 12px;
  padding: 10px;
  display: grid;
  gap: 3px;
}

small {
  color: #475467;
}

h4 {
  margin: 12px 0 6px;
}

ul,
ol {
  margin: 0;
  padding-left: 18px;
  color: #344054;
}

li {
  margin-bottom: 6px;
  line-height: 1.4;
}

@keyframes pull-up {
  from {
    opacity: 0;
    transform: translateY(24px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fade-mask {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@media (max-width: 640px) {
  .meta-grid {
    grid-template-columns: 1fr;
  }
}
</style>
