<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router';

const route = useRoute();
</script>

<template>
  <div class="nav-tabs">
    <RouterLink to="/" class="tab" :class="{ active: route.path === '/' || route.path.startsWith('/recommendations') }">
      推荐参数
    </RouterLink>
    <RouterLink to="/todos" class="tab" :class="{ active: route.path.startsWith('/todos') }">
      待办
    </RouterLink>
  </div>
</template>

<style scoped>
.nav-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  background: rgba(15, 23, 42, 0.06);
  padding: 4px;
  border-radius: 12px;
}

.tab {
  border-radius: 10px;
  text-align: center;
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  padding: 8px 0;
  transition: all 160ms cubic-bezier(0.22, 1, 0.36, 1);
}

.tab.active {
  color: #fff;
  background: linear-gradient(135deg, #1677ff, #0f5fe0);
  box-shadow: 0 6px 16px rgba(22, 119, 255, 0.24);
}
</style>
