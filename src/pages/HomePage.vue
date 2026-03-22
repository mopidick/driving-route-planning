<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import BottomSheet from '../components/BottomSheet.vue';
import AppIcon from '../components/AppIcon.vue';
import EmbeddedMap from '../components/EmbeddedMap.vue';
import FloatingNavTabs from '../components/FloatingNavTabs.vue';
import ModeSwitch from '../components/ModeSwitch.vue';
import { getCurrentLocation } from '../services/amapApi';
import { useAppStore } from '../store/appStore';
import { useUiState } from '../store/uiState';
import type { LocationPoint, TransportMode } from '../types';

const router = useRouter();
const { state, searchRecommendations } = useAppStore();

const mode = ref<TransportMode>('driving');
const hoursLimit = ref(3);
const locating = ref(false);
const formMessage = ref('');
const origin = ref<LocationPoint | null>(null);
const { uiState, setSheetLevel, setDetailOpen } = useUiState();

const sheetLevel = computed({
  get: () => uiState.sheetLevel,
  set: (level: 'collapsed' | 'half' | 'full') => setSheetLevel(level)
});

const mapMarkers = computed(() => {
  if (!origin.value) {
    return [];
  }
  return [
    {
      id: 'origin',
      lng: origin.value.lng,
      lat: origin.value.lat,
      label: '当前位置',
      highlight: true
    }
  ];
});
onMounted(async () => {
  setDetailOpen(false);
  setSheetLevel('collapsed');
  await locateMe();
});

async function locateMe(): Promise<void> {
  locating.value = true;
  formMessage.value = '';
  try {
    origin.value = await getCurrentLocation();
  } catch (error) {
    formMessage.value = error instanceof Error ? error.message : '定位失败，请重试并允许定位权限。';
    origin.value = null;
  } finally {
    locating.value = false;
  }
}

async function search(): Promise<void> {
  formMessage.value = '';
  if (!origin.value) {
    formMessage.value = '请先授权定位，获取当前位置后再生成推荐。';
    return;
  }
  await searchRecommendations({
    origin: origin.value,
    hoursLimit: hoursLimit.value,
    mode: mode.value
  });
  await router.push('/recommendations');
}
</script>

<template>
  <section class="mobile-map-page">
    <EmbeddedMap
      class="map-bg-layer"
      :center="origin"
      :markers="mapMarkers"
      :height="'100%'"
      :zoom="14"
      :bare="true"
    />

    <div class="floating-panel floating-top top-row">
      <button class="btn btn-secondary btn-icon circle" type="button" @click="locateMe">
        <AppIcon name="locate" :size="16" />
      </button>
    </div>

    <BottomSheet class="floating-panel floating-bottom" v-model:level="sheetLevel">
      <FloatingNavTabs />
      <h2>n 小时可达景点</h2>
      <p class="muted subtitle">设置时长与交通方式，系统按综合热度推荐可达景点。</p>

      <div class="field">
        <label>交通方式</label>
        <ModeSwitch v-model="mode" />
      </div>

      <div class="field">
        <label for="hoursLimit">可接受时长（小时）</label>
        <input id="hoursLimit" type="number" min="1" max="24" step="0.5" v-model.number="hoursLimit" />
      </div>

      <p class="muted address" v-if="origin?.address">{{ origin.address }}</p>

      <div class="btn-row">
        <button class="btn btn-primary" type="button" :disabled="state.isLoading || locating || !origin" @click="search">
          <AppIcon name="spark" :size="14" />
          {{ state.isLoading ? '计算可达性中...' : '生成推荐' }}
        </button>
      </div>

      <p v-if="formMessage" class="error-text">{{ formMessage }}</p>
      <p v-if="state.errorMessage && !formMessage" class="error-text">{{ state.errorMessage }}</p>
    </BottomSheet>
  </section>
</template>

<style scoped>
h2 {
  margin: 0;
  font-size: 1.1rem;
}

.subtitle {
  margin: 4px 0 12px;
  font-size: 0.82rem;
}

.address {
  font-size: 0.8rem;
  margin: 6px 0;
}

.top-row {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
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

.btn-row .btn-primary {
  min-width: 180px;
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
