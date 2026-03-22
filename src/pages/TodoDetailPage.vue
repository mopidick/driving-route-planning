<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppIcon from '../components/AppIcon.vue';
import EmbeddedMap from '../components/EmbeddedMap.vue';
import { planRoute } from '../services/amapApi';
import { useAppStore } from '../store/appStore';
import { formatDistance, formatDuration, formatMoney } from '../utils/format';

const route = useRoute();
const router = useRouter();
const { getTodoById, updateTodo } = useAppStore();

const loading = ref(false);
const errorMessage = ref('');
const todo = computed(() => getTodoById(route.params.id as string));

async function refreshRoute(): Promise<void> {
  if (!todo.value) {
    return;
  }
  errorMessage.value = '';
  loading.value = true;
  try {
    const latestRoute = await planRoute({
      origin: todo.value.searchSnapshot.origin,
      destination: todo.value.poi.location,
      mode: todo.value.searchSnapshot.mode,
      city: todo.value.searchSnapshot.origin.city
    });

    updateTodo(todo.value.id, (item) => ({
      ...item,
      routeSummary: {
        distanceMeters: latestRoute.distanceMeters,
        durationSeconds: latestRoute.durationSeconds,
        costCny: latestRoute.costCny,
        tollsCny: latestRoute.tollsCny,
        polyline: latestRoute.polyline
      },
      routeSteps: latestRoute.steps
    }));
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '刷新路线失败，请稍后重试。';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <section v-if="todo" class="detail-grid">
    <EmbeddedMap
      :center="{ lng: todo.searchSnapshot.origin.lng, lat: todo.searchSnapshot.origin.lat }"
      :markers="[
        {
          id: 'origin',
          lng: todo.searchSnapshot.origin.lng,
          lat: todo.searchSnapshot.origin.lat,
          label: '我',
          highlight: true
        },
        {
          id: todo.id,
          lng: todo.poi.location.lng,
          lat: todo.poi.location.lat,
          label: todo.title,
          highlight: true
        }
      ]"
      :polyline="todo.routeSummary.polyline || ''"
      :height="280"
    />

    <article class="card detail-card">
      <h2>{{ todo.title }}</h2>
      <p class="muted">{{ todo.poi.address }}</p>

      <div class="stats">
        <div>
          <small>预计时长</small>
          <strong>{{ formatDuration(todo.routeSummary.durationSeconds) }}</strong>
        </div>
        <div>
          <small>距离</small>
          <strong>{{ formatDistance(todo.routeSummary.distanceMeters) }}</strong>
        </div>
        <div>
          <small>{{ todo.searchSnapshot.mode === 'driving' ? '过路费' : '票价' }}</small>
          <strong>{{ formatMoney(todo.searchSnapshot.mode === 'driving' ? todo.routeSummary.tollsCny : todo.routeSummary.costCny) }}</strong>
        </div>
      </div>

      <section>
        <h3>景点 Tips</h3>
        <ul>
          <li v-for="tip in todo.tips" :key="tip">{{ tip }}</li>
        </ul>
      </section>

      <section>
        <h3>路径导航</h3>
        <ol>
          <li v-for="(step, idx) in todo.routeSteps" :key="idx">{{ step.instruction }}</li>
        </ol>
      </section>

      <div class="btn-row">
        <button class="btn btn-secondary" type="button" :disabled="loading" @click="refreshRoute">
          <AppIcon name="refresh" :size="14" />
          {{ loading ? '刷新中...' : '刷新路线' }}
        </button>
        <a class="btn btn-primary as-link" :href="todo.amapNavigationUrl" target="_blank" rel="noreferrer">
          <AppIcon name="locate" :size="14" />
          打开高德导航
        </a>
        <button class="btn btn-secondary" type="button" @click="router.push('/todos')">返回待办</button>
      </div>

      <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>
    </article>
  </section>

  <section v-else class="empty-state">
    <p>未找到该待办，可能已被删除。</p>
    <button class="btn btn-primary" type="button" @click="router.push('/todos')">返回待办列表</button>
  </section>
</template>

<style scoped>
.detail-grid {
  display: grid;
  gap: 12px;
}

.detail-card {
  padding: 18px;
  display: grid;
  gap: 12px;
}

h2,
h3,
p {
  margin: 0;
}

.stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.stats div {
  display: grid;
  gap: 3px;
  background: rgba(10, 132, 255, 0.06);
  border-radius: 12px;
  padding: 10px;
}

small {
  color: #475467;
}

ul,
ol {
  margin: 0;
  padding-left: 18px;
}

li {
  margin-bottom: 6px;
  line-height: 1.4;
}

.as-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

@media (max-width: 640px) {
  .stats {
    grid-template-columns: 1fr;
  }
}
</style>
