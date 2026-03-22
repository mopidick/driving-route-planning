<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import BottomSheet from '../components/BottomSheet.vue';
import AppIcon from '../components/AppIcon.vue';
import EmbeddedMap from '../components/EmbeddedMap.vue';
import FloatingNavTabs from '../components/FloatingNavTabs.vue';
import ModeSwitch from '../components/ModeSwitch.vue';
import RecommendationCard from '../components/RecommendationCard.vue';
import RecommendationDrawer from '../components/RecommendationDrawer.vue';
import { useAppStore } from '../store/appStore';
import { useUiState } from '../store/uiState';
import type { Recommendation, TransportMode } from '../types';

const router = useRouter();
const { state, acceptRecommendation, searchRecommendations } = useAppStore();
const active = ref<Recommendation | null>(null);
const { uiState, setSheetLevel, setDetailOpen } = useUiState();

const sheetLevel = computed({
  get: () => uiState.sheetLevel,
  set: (level: 'collapsed' | 'half' | 'full') => setSheetLevel(level)
});

const hasContext = computed(() => Boolean(state.activeSearch));
const mapCenter = computed(() => state.activeSearch?.origin || null);
const recalculating = ref(false);
const modeInput = ref<TransportMode>('driving');
const hoursInput = ref(3);
let adjustTimer: ReturnType<typeof setTimeout> | null = null;
const mapMarkers = computed(() => {
  const origin = state.activeSearch?.origin;
  if (!origin) {
    return [];
  }
  const source =
    sheetLevel.value === 'full' ? pickDistributedRecommendations(state.recommendations, 6) : state.recommendations;
  const spotMarkers = source.map((rec) => ({
    id: rec.id,
    lng: rec.poi.location.lng,
    lat: rec.poi.location.lat,
    label: rec.poi.name,
    highlight: active.value?.id === rec.id
  }));
  return [
    {
      id: 'origin',
      lng: origin.lng,
      lat: origin.lat,
      label: '我',
      highlight: true
    },
    ...spotMarkers
  ];
});
const activePolyline = computed(() => active.value?.route.polyline || '');
const acceptedIds = computed(() => new Set(state.todos.map((todo) => todo.poi.id)));
const mapInteractive = computed(() => sheetLevel.value !== 'full' && !active.value);

onMounted(() => {
  setSheetLevel('half');
  setDetailOpen(false);
  modeInput.value = state.activeSearch?.mode || 'driving';
  hoursInput.value = state.activeSearch?.hoursLimit || 3;
});

onBeforeUnmount(() => {
  if (adjustTimer) {
    clearTimeout(adjustTimer);
  }
});

watch(
  () => state.activeSearch,
  (next) => {
    if (!next) {
      return;
    }
    modeInput.value = next.mode;
    hoursInput.value = next.hoursLimit;
  },
  { deep: true }
);

watch([modeInput, hoursInput], () => {
  if (!state.activeSearch) {
    return;
  }
  if (adjustTimer) {
    clearTimeout(adjustTimer);
  }
  recalculating.value = true;
  adjustTimer = setTimeout(async () => {
    if (!state.activeSearch) {
      recalculating.value = false;
      return;
    }
    await searchRecommendations({
      ...state.activeSearch,
      mode: modeInput.value,
      hoursLimit: hoursInput.value
    });
    recalculating.value = false;
  }, 260);
});

function openDetails(rec: Recommendation): void {
  active.value = rec;
  setDetailOpen(true);
}

async function accept(rec: Recommendation): Promise<void> {
  const todo = acceptRecommendation(rec);
  active.value = null;
  setDetailOpen(false);
  if (todo) {
    await router.push(`/todos/${todo.id}`);
  }
}

function recenterMap(): void {
  active.value = null;
  setDetailOpen(false);
  setSheetLevel('collapsed');
}

function pickDistributedRecommendations(
  recommendations: Recommendation[],
  maxCount: number
): Recommendation[] {
  const selected: Recommendation[] = [];
  for (const rec of recommendations) {
    if (selected.length >= maxCount) {
      break;
    }
    const tooClose = selected.some((item) => {
      const dx = item.poi.location.lng - rec.poi.location.lng;
      const dy = item.poi.location.lat - rec.poi.location.lat;
      return dx * dx + dy * dy < 0.00016;
    });
    if (!tooClose) {
      selected.push(rec);
    }
  }
  if (selected.length < maxCount) {
    for (const rec of recommendations) {
      if (selected.length >= maxCount) {
        break;
      }
      if (!selected.includes(rec)) {
        selected.push(rec);
      }
    }
  }
  return selected;
}
</script>

<template>
  <section class="mobile-map-page">
    <div v-if="!hasContext" class="empty-state">
      <p>还没有推荐上下文，请先设置参数后生成推荐。</p>
      <button class="btn btn-primary" type="button" @click="router.push('/')">返回参数页</button>
    </div>

    <template v-else>
      <EmbeddedMap
        class="map-bg-layer"
        :center="mapCenter"
        :markers="mapMarkers"
        :polyline="activePolyline"
        :height="'100%'"
        :zoom="13"
        :bare="true"
        :interactive="mapInteractive"
      />

      <div class="floating-panel floating-top head-row">
        <button class="btn btn-secondary btn-icon circle" type="button" @click="recenterMap">
          <AppIcon name="locate" :size="16" />
        </button>
      </div>

      <BottomSheet class="floating-panel floating-bottom rec-sheet" v-model:level="sheetLevel">
        <FloatingNavTabs />
        <p class="floating-chip pill result-chip">
          {{ recalculating ? '重算中...' : `综合热度排序 · ${state.recommendations.length}个结果` }}
        </p>
        <div class="quick-controls" v-if="state.activeSearch">
          <ModeSwitch v-model="modeInput" />
          <div class="hours-control">
            <button class="btn btn-secondary mini btn-icon" type="button" @click="hoursInput = Math.max(1, hoursInput - 0.5)">
              <AppIcon name="minus" :size="14" />
            </button>
            <span>{{ hoursInput.toFixed(1).replace('.0', '') }}小时</span>
            <button class="btn btn-secondary mini btn-icon" type="button" @click="hoursInput = Math.min(24, hoursInput + 0.5)">
              <AppIcon name="plus" :size="14" />
            </button>
          </div>
        </div>

        <div v-if="state.recommendations.length === 0" class="empty-state">
          <p>当前条件下暂无可达景点。</p>
          <p class="muted">你可以增加可接受时长，或切换交通方式。</p>
        </div>

        <RecommendationCard
          v-for="(rec, idx) in state.recommendations"
          :key="rec.id"
          :recommendation="rec"
          :index="idx"
          :accepted="acceptedIds.has(rec.poi.id)"
          @details="openDetails"
          @accept="accept"
        />
      </BottomSheet>
    </template>

    <RecommendationDrawer
      v-if="active && state.activeSearch"
      :recommendation="active"
      :origin-lng="state.activeSearch.origin.lng"
      :origin-lat="state.activeSearch.origin.lat"
      @close="
        () => {
          active = null;
          setDetailOpen(false);
        }
      "
      @accept="accept"
    />
  </section>
</template>

<style scoped>
.head-row {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
}

.rec-sheet {
  display: grid;
  gap: 10px;
}

.pill {
  margin: 0;
  height: 34px;
  display: inline-flex;
  align-items: center;
  font-weight: 600;
  letter-spacing: 0.01em;
}

.result-chip {
  justify-content: center;
}

.quick-controls {
  display: grid;
  gap: 12px;
  padding-bottom: 2px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
  margin-bottom: 2px;
  padding-bottom: 10px;
}

.hours-control {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #344054;
}

.hours-control span {
  font-size: 13px;
  font-weight: 600;
}

.mini {
  height: 40px;
  width: 44px;
  padding: 0;
}

.circle {
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.56);
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.18);
}

.floating-bottom {
  animation: panel-in 260ms cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes panel-in {
  from {
    opacity: 0;
    transform: translateY(14px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
