<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';

interface MapMarker {
  id: string;
  lng: number;
  lat: number;
  label: string;
  highlight?: boolean;
}

const props = withDefaults(
  defineProps<{
    center?: { lng: number; lat: number } | null;
    markers?: MapMarker[];
    polyline?: string;
    height?: number | string;
    zoom?: number;
    bare?: boolean;
    interactive?: boolean;
  }>(),
  {
    markers: () => [],
    polyline: '',
    height: 240,
    zoom: 12,
    bare: false,
    interactive: true
  }
);

const mapContainer = ref<HTMLElement | null>(null);
const errorMessage = ref('');
const diagnostics = ref('');
let map: AMapInstance | null = null;
let overlays: Array<{ setMap: (map: AMapInstance | null) => void }> = [];
let lastRenderSignature = '';
let hasFitted = false;

onMounted(async () => {
  try {
    await ensureAmapScript();
    initMap();
    renderMapData();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '地图加载失败。';
  }
});

watch(
  () => [props.center, props.markers, props.polyline],
  () => {
    renderMapData();
  },
  { deep: true }
);

watch(
  () => props.interactive,
  () => {
    updateMapInteractivity();
  }
);

onBeforeUnmount(() => {
  clearOverlays();
  map?.destroy();
  map = null;
});

function initMap(): void {
  if (!mapContainer.value || !window.AMap) {
    throw new Error('地图 SDK 未准备完成。');
  }
  map = new window.AMap.Map(mapContainer.value, {
    zoom: props.zoom,
    viewMode: '2D',
    resizeEnable: true,
    mapStyle: 'amap://styles/normal',
    showLabel: true
  });
  diagnostics.value = '地图 SDK 已加载，正在拉取底图瓦片...';
  updateMapInteractivity();
}

function renderMapData(): void {
  if (!map || !window.AMap) {
    return;
  }

  const nextSignature = JSON.stringify({
    center: props.center,
    markers: props.markers.map((item) => [item.id, item.lng, item.lat, item.highlight]),
    polyline: props.polyline
  });
  if (nextSignature === lastRenderSignature) {
    return;
  }
  lastRenderSignature = nextSignature;

  clearOverlays();

  if (props.center) {
    map.setCenter([props.center.lng, props.center.lat]);
  }

  const nextOverlays: Array<{ setMap: (map: AMapInstance | null) => void }> = [];
  for (const markerData of props.markers) {
    const marker = new window.AMap.Marker({
      position: [markerData.lng, markerData.lat],
      offset: new window.AMap.Pixel(-10, -20),
      title: markerData.label,
      label: {
        direction: 'top',
        content: `<div style="padding:3px 8px;border-radius:999px;background:${markerData.highlight ? '#0a84ff' : '#ffffff'};color:${markerData.highlight ? '#fff' : '#101828'};font-size:12px;border:1px solid rgba(15,23,42,0.1);">${markerData.label}</div>`
      }
    });
    marker.setMap(map);
    nextOverlays.push(marker);
  }

  const path = parsePolyline(props.polyline);
  if (path.length > 1) {
    const polyline = new window.AMap.Polyline({
      path,
      strokeColor: '#0A84FF',
      strokeWeight: 5,
      strokeOpacity: 0.85,
      strokeStyle: 'solid',
      lineJoin: 'round'
    });
    polyline.setMap(map);
    nextOverlays.push(polyline);
  }

  overlays = nextOverlays;
  if (nextOverlays.length > 0 && !hasFitted) {
    map.setFitView();
    hasFitted = true;
  } else if (props.center) {
    map.setZoom(props.zoom);
  }
}

function updateMapInteractivity(): void {
  if (!map?.setStatus) {
    return;
  }
  map.setStatus({
    dragEnable: props.interactive,
    zoomEnable: props.interactive,
    keyboardEnable: props.interactive,
    doubleClickZoom: props.interactive
  });
}

function parsePolyline(polylineText: string): Array<[number, number]> {
  if (!polylineText) {
    return [];
  }
  return polylineText
    .split(';')
    .map((pair) => {
      const [lngText, latText] = pair.split(',');
      const lng = Number(lngText);
      const lat = Number(latText);
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
        return null;
      }
      return [lng, lat] as [number, number];
    })
    .filter((item): item is [number, number] => Boolean(item));
}

function clearOverlays(): void {
  for (const item of overlays) {
    item.setMap(null);
  }
  overlays = [];
}

let scriptLoadingPromise: Promise<void> | null = null;

function ensureAmapScript(): Promise<void> {
  const key = import.meta.env.VITE_AMAP_WEB_KEY || import.meta.env.VITE_AMAP_KEY;
  const securityCode = import.meta.env.VITE_AMAP_SECURITY_CODE;
  if (!key) {
    return Promise.reject(
      new Error('缺少 Web 端地图 Key。请配置 VITE_AMAP_WEB_KEY（或回退使用 VITE_AMAP_KEY）。')
    );
  }
  if (securityCode) {
    window._AMapSecurityConfig = {
      securityJsCode: securityCode
    };
  }
  if (window.AMap) {
    return Promise.resolve();
  }
  if (scriptLoadingPromise) {
    return scriptLoadingPromise;
  }
  scriptLoadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${key}`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('地图 SDK 加载失败，请检查网络或 Key 配置。'));
    document.head.appendChild(script);
  });
  return scriptLoadingPromise;
}
</script>

<template>
  <div
    class="map-wrapper"
    :class="{ bare: props.bare }"
    :style="{ height: typeof props.height === 'number' ? `${props.height}px` : props.height }"
  >
    <div v-if="errorMessage" class="map-error">{{ errorMessage }}</div>
    <div v-else ref="mapContainer" class="map-canvas"></div>
    <p v-if="!errorMessage && diagnostics" class="map-tip">{{ diagnostics }}</p>
  </div>
</template>

<style scoped>
.map-wrapper {
  overflow: hidden;
  border-radius: 18px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  background: #f4f7fd;
  position: relative;
}

.map-wrapper.bare {
  border: 0;
  border-radius: 0;
  background: #eaf1ff;
}

.map-canvas {
  width: 100%;
  height: 100%;
}

.map-error {
  height: 100%;
  display: grid;
  place-items: center;
  text-align: center;
  padding: 12px;
  color: #b42318;
  background: rgba(254, 228, 226, 0.75);
}

.map-tip {
  position: absolute;
  left: 10px;
  bottom: 8px;
  margin: 0;
  font-size: 0.75rem;
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 8px;
  padding: 4px 8px;
  color: #475467;
}
</style>
