<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAppStore } from '../store/appStore';
import { formatDuration } from '../utils/format';

const router = useRouter();
const { state, removeTodo } = useAppStore();
</script>

<template>
  <section class="todo-list">
    <div v-if="state.todos.length === 0" class="empty-state">
      <p>还没有待办行程。</p>
      <p class="muted">在推荐页采纳景点后，会自动生成一条待办。</p>
      <button class="btn btn-primary" type="button" @click="router.push('/')">去生成推荐</button>
    </div>

    <article v-for="todo in state.todos" :key="todo.id" class="card todo-card">
      <div class="row">
        <div>
          <h3>{{ todo.title }}</h3>
          <p class="muted">{{ todo.poi.address }}</p>
        </div>
        <small class="mode">{{ todo.searchSnapshot.mode === 'driving' ? '自驾' : '公共交通' }}</small>
      </div>
      <div class="chips">
        <span>预计 {{ formatDuration(todo.routeSummary.durationSeconds) }}</span>
        <span>{{ new Date(todo.acceptedAt).toLocaleString() }}</span>
      </div>
      <div class="btn-row">
        <button class="btn btn-secondary" type="button" @click="router.push(`/todos/${todo.id}`)">查看详情</button>
        <button class="btn btn-danger" type="button" @click="removeTodo(todo.id)">删除</button>
      </div>
    </article>
  </section>
</template>

<style scoped>
.todo-list {
  display: grid;
  gap: 12px;
}

.todo-card {
  padding: 16px;
  display: grid;
  gap: 10px;
}

.row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

h3 {
  margin: 0;
}

p {
  margin: 5px 0 0;
}

.mode {
  background: #ecfeff;
  color: #0e7490;
  border-radius: 999px;
  padding: 4px 10px;
  height: fit-content;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chips span {
  font-size: 0.84rem;
  color: #475467;
  background: rgba(148, 163, 184, 0.12);
  padding: 4px 8px;
  border-radius: 999px;
}
</style>
