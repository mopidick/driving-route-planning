<script setup lang="ts">
import type { Recommendation } from '../types';
import AppIcon from './AppIcon.vue';
import { formatDistance, formatDuration } from '../utils/format';

defineProps<{
  recommendation: Recommendation;
  index: number;
  accepted?: boolean;
}>();

defineEmits<{
  details: [Recommendation];
  accept: [Recommendation];
}>();
</script>

<template>
  <article class="card recommendation-card" :style="{ animationDelay: `${index * 60}ms` }">
    <div class="top-row">
      <div>
        <h3>{{ recommendation.poi.name }}</h3>
        <p class="muted">{{ recommendation.poi.address }}</p>
      </div>
      <img v-if="recommendation.poi.photo" class="thumb" :src="recommendation.poi.photo" :alt="recommendation.poi.name" />
      <div class="score-col">
        <span class="heat">热度 {{ recommendation.heatScore }}</span>
        <span class="rating" v-if="recommendation.poi.rating">⭐ {{ recommendation.poi.rating.toFixed(1) }}</span>
      </div>
    </div>
    <p class="summary">{{ recommendation.summary }}</p>
    <div class="factors" v-if="recommendation.factors.length > 0">
      <span v-for="factor in recommendation.factors" :key="factor">{{ factor }}</span>
    </div>
    <div class="meta">
      <span>预计 {{ formatDuration(recommendation.route.durationSeconds) }}</span>
      <span>{{ formatDistance(recommendation.route.distanceMeters) }}</span>
      <span v-if="recommendation.poi.distanceMeters">直线 {{ formatDistance(recommendation.poi.distanceMeters) }}</span>
    </div>
    <p class="reason">{{ recommendation.reason }}</p>
    <div class="btn-row">
      <button class="btn btn-ghost" type="button" @click="$emit('details', recommendation)">
        <AppIcon name="detail" :size="14" />
        详情
      </button>
      <button class="btn btn-primary btn-lite" type="button" :disabled="accepted" @click="$emit('accept', recommendation)">
        <AppIcon :name="accepted ? 'check' : 'spark'" :size="14" />
        {{ accepted ? '已采纳' : '采纳' }}
      </button>
    </div>
  </article>
</template>

<style scoped>
.recommendation-card {
  padding: 14px;
  display: grid;
  gap: 10px;
  animation: float-in 0.45s cubic-bezier(0.23, 1, 0.32, 1) both;
  background: rgba(255, 255, 255, 0.96);
  border-color: rgba(15, 23, 42, 0.08);
}

.thumb {
  width: 52px;
  height: 52px;
  border-radius: 10px;
  object-fit: cover;
  border: 1px solid rgba(15, 23, 42, 0.08);
}

.top-row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.score-col {
  display: grid;
  gap: 4px;
}

h3 {
  margin: 0;
  font-size: 15px;
  line-height: 1.3;
}

p {
  margin: 0;
}

.summary {
  color: #1677ff;
  font-weight: 650;
  font-size: 13px;
}

.factors {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.factors span {
  border-radius: 8px;
  padding: 3px 6px;
  font-size: 11px;
  background: rgba(15, 23, 42, 0.05);
  color: #344054;
}

.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  color: #475467;
  font-size: 0.78rem;
}

.meta span {
  background: rgba(10, 132, 255, 0.08);
  border-radius: 999px;
  padding: 4px 8px;
}

.rating {
  color: #b45309;
  background: #fff7ed;
  border-radius: 999px;
  padding: 4px 8px;
  font-size: 0.76rem;
  height: fit-content;
}

.heat {
  color: #1d4ed8;
  background: #dbeafe;
  border-radius: 999px;
  padding: 4px 8px;
  font-size: 0.74rem;
  text-align: center;
  font-weight: 700;
}

.reason {
  color: #344054;
  font-size: 12px;
}

.btn-lite {
  min-width: 96px;
  height: 40px;
  padding: 0 14px;
  font-size: 0.8rem;
}

@keyframes float-in {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
</style>
