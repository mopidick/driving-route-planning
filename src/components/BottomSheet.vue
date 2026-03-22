<script setup lang="ts">
import { computed, ref } from 'vue';

type SheetLevel = 'collapsed' | 'half' | 'full';

const props = defineProps<{
  level: SheetLevel;
}>();

const emit = defineEmits<{
  'update:level': [SheetLevel];
}>();

const sheetClass = computed(() => `sheet-${props.level}`);
const dragOffset = ref(0);
const dragging = ref(false);
const pointerStartY = ref(0);
const pointerStartAt = ref(0);
const pointerId = ref<number | null>(null);
const handleEl = ref<HTMLElement | null>(null);
const startHeightPx = ref(0);
const liveHeightPx = ref<number | null>(null);

const levelOrder: SheetLevel[] = ['collapsed', 'half', 'full'];
const inlineHeight = computed(() => {
  if (liveHeightPx.value !== null) {
    return `${liveHeightPx.value}px`;
  }
  return `${getLevelHeight(props.level)}px`;
});

function onPointerDown(event: PointerEvent): void {
  if (event.pointerType === 'mouse' && event.button !== 0) {
    return;
  }
  dragging.value = true;
  pointerId.value = event.pointerId;
  pointerStartY.value = event.clientY;
  pointerStartAt.value = Date.now();
  dragOffset.value = 0;
  startHeightPx.value = getLevelHeight(props.level);
  liveHeightPx.value = startHeightPx.value;
  handleEl.value?.setPointerCapture(event.pointerId);
}

function onPointerMove(event: PointerEvent): void {
  if (!dragging.value || pointerId.value !== event.pointerId) {
    return;
  }
  const delta = event.clientY - pointerStartY.value;
  dragOffset.value = Math.max(-220, Math.min(220, delta));
  liveHeightPx.value = clampHeight(startHeightPx.value - delta);
}

function onPointerEnd(event: PointerEvent): void {
  if (!dragging.value || pointerId.value !== event.pointerId) {
    return;
  }
  const duration = Math.max(1, Date.now() - pointerStartAt.value);
  const velocity = dragOffset.value / duration;
  const threshold = 34;
  const velocityThreshold = 0.32;
  const currentIndex = levelOrder.indexOf(props.level);
  const currentHeight = liveHeightPx.value ?? getLevelHeight(props.level);

  if (dragOffset.value < -threshold || velocity < -velocityThreshold) {
    const next = Math.min(levelOrder.length - 1, currentIndex + 1);
    emit('update:level', levelOrder[next]);
  } else if (dragOffset.value > threshold || velocity > velocityThreshold) {
    const next = Math.max(0, currentIndex - 1);
    emit('update:level', levelOrder[next]);
  } else {
    emit('update:level', nearestLevel(currentHeight));
  }

  dragging.value = false;
  dragOffset.value = 0;
  pointerId.value = null;
  liveHeightPx.value = null;
}

function onTouchStart(event: TouchEvent): void {
  const touch = event.touches[0];
  if (!touch) {
    return;
  }
  dragging.value = true;
  pointerStartY.value = touch.clientY;
  pointerStartAt.value = Date.now();
  dragOffset.value = 0;
  startHeightPx.value = getLevelHeight(props.level);
  liveHeightPx.value = startHeightPx.value;
}

function onTouchMove(event: TouchEvent): void {
  if (!dragging.value) {
    return;
  }
  const touch = event.touches[0];
  if (!touch) {
    return;
  }
  const delta = touch.clientY - pointerStartY.value;
  dragOffset.value = Math.max(-220, Math.min(220, delta));
  liveHeightPx.value = clampHeight(startHeightPx.value - delta);
}

function onTouchEnd(): void {
  if (!dragging.value) {
    return;
  }
  const duration = Math.max(1, Date.now() - pointerStartAt.value);
  const velocity = dragOffset.value / duration;
  const threshold = 34;
  const velocityThreshold = 0.32;
  const currentIndex = levelOrder.indexOf(props.level);
  const currentHeight = liveHeightPx.value ?? getLevelHeight(props.level);

  if (dragOffset.value < -threshold || velocity < -velocityThreshold) {
    const next = Math.min(levelOrder.length - 1, currentIndex + 1);
    emit('update:level', levelOrder[next]);
  } else if (dragOffset.value > threshold || velocity > velocityThreshold) {
    const next = Math.max(0, currentIndex - 1);
    emit('update:level', levelOrder[next]);
  } else {
    emit('update:level', nearestLevel(currentHeight));
  }

  dragging.value = false;
  dragOffset.value = 0;
  liveHeightPx.value = null;
}

function getLevelHeight(level: SheetLevel): number {
  const vh = window.innerHeight;
  const collapsed = clamp(vh * 0.16, 120, 168);
  const half = clamp(vh * 0.52, 320, 500);
  const full = clamp(vh * 0.82, 520, vh - 12);
  if (level === 'collapsed') {
    return collapsed;
  }
  if (level === 'half') {
    return half;
  }
  return full;
}

function clampHeight(height: number): number {
  const min = getLevelHeight('collapsed');
  const max = getLevelHeight('full');
  return Math.min(max, Math.max(min, height));
}

function nearestLevel(height: number): SheetLevel {
  const entries: Array<{ level: SheetLevel; distance: number }> = [
    { level: 'collapsed', distance: Math.abs(height - getLevelHeight('collapsed')) },
    { level: 'half', distance: Math.abs(height - getLevelHeight('half')) },
    { level: 'full', distance: Math.abs(height - getLevelHeight('full')) }
  ];
  entries.sort((a, b) => a.distance - b.distance);
  return entries[0]?.level || 'half';
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
</script>

<template>
  <section
    class="sheet-shell card"
    :class="sheetClass"
    :style="{ height: inlineHeight }"
  >
    <div
      ref="handleEl"
      class="sheet-handle-wrap"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerEnd"
      @pointercancel="onPointerEnd"
      @touchstart.prevent="onTouchStart"
      @touchmove.prevent="onTouchMove"
      @touchend.prevent="onTouchEnd"
      @touchcancel.prevent="onTouchEnd"
    >
      <div class="sheet-handle"></div>
    </div>
    <div class="sheet-content">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.sheet-shell {
  border-radius: 26px 26px 20px 20px;
  border: 1px solid rgba(255, 255, 255, 0.45);
  background: rgba(255, 255, 255, 0.78);
  box-shadow: 0 18px 42px rgba(15, 23, 42, 0.22);
  backdrop-filter: blur(18px);
  overflow: hidden;
  transition:
    height 0.22s cubic-bezier(0.22, 1, 0.36, 1),
    transform 0.24s cubic-bezier(0.22, 1, 0.36, 1);
  touch-action: pan-y;
  user-select: none;
}

.sheet-collapsed {
  height: clamp(120px, calc(16vh + env(safe-area-inset-bottom)), 168px);
}

.sheet-half {
  height: clamp(320px, 52vh, 500px);
}

.sheet-full {
  height: clamp(520px, 82vh, calc(100dvh - 12px - env(safe-area-inset-top)));
}

.sheet-handle-wrap {
  position: sticky;
  top: 0;
  z-index: 2;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(255, 255, 255, 0.9));
  padding: 10px 12px 8px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.07);
  touch-action: none;
}

.sheet-handle {
  width: 48px;
  height: 5px;
  border-radius: 999px;
  background: #d0d5dd;
  margin: 0 auto 4px;
}

.sheet-content {
  overflow: auto;
  height: calc(100% - 34px);
  padding: 8px 12px 14px;
}
</style>
