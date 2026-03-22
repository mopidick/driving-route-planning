import { createRouter, createWebHistory } from 'vue-router';
import HomePage from './pages/HomePage.vue';
import RecommendationsPage from './pages/RecommendationsPage.vue';
import TodosPage from './pages/TodosPage.vue';
import TodoDetailPage from './pages/TodoDetailPage.vue';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: HomePage },
    { path: '/recommendations', component: RecommendationsPage },
    { path: '/todos', component: TodosPage },
    { path: '/todos/:id', component: TodoDetailPage }
  ]
});
