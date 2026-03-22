import { computed, reactive } from 'vue';
import { fetchReachableRecommendations } from '../services/recommendEngine';
import type { Recommendation, SearchParams, TodoItemSnapshot } from '../types';
import { createTodoFromRecommendation } from '../utils/recommendation';

const TODO_STORAGE_KEY = 'reachable-spots-todos-v1';

interface AppState {
  activeSearch: SearchParams | null;
  recommendations: Recommendation[];
  todos: TodoItemSnapshot[];
  isLoading: boolean;
  errorMessage: string;
}

const state = reactive<AppState>({
  activeSearch: null,
  recommendations: [],
  todos: loadTodos(),
  isLoading: false,
  errorMessage: ''
});

export function useAppStore() {
  const hasRecommendations = computed(() => state.recommendations.length > 0);
  const todoCount = computed(() => state.todos.length);

  async function searchRecommendations(params: SearchParams): Promise<void> {
    state.isLoading = true;
    state.errorMessage = '';
    state.activeSearch = params;

    try {
      state.recommendations = await fetchReachableRecommendations(params);
      if (state.recommendations.length === 0) {
        state.errorMessage = '未找到满足时长的可达景点，建议增加出行时长或切换交通方式。';
      }
    } catch (error) {
      state.errorMessage = error instanceof Error ? error.message : '推荐获取失败，请稍后重试。';
      state.recommendations = [];
    } finally {
      state.isLoading = false;
    }
  }

  function clearRecommendations(): void {
    state.recommendations = [];
    state.errorMessage = '';
  }

  function acceptRecommendation(rec: Recommendation): TodoItemSnapshot | null {
    if (!state.activeSearch) {
      return null;
    }
    const todo = createTodoFromRecommendation(rec, state.activeSearch);
    state.todos = [todo, ...state.todos];
    persistTodos(state.todos);
    return todo;
  }

  function updateTodo(todoId: string, updater: (todo: TodoItemSnapshot) => TodoItemSnapshot): void {
    state.todos = state.todos.map((todo) => (todo.id === todoId ? updater(todo) : todo));
    persistTodos(state.todos);
  }

  function getTodoById(id: string): TodoItemSnapshot | undefined {
    return state.todos.find((todo) => todo.id === id);
  }

  function removeTodo(id: string): void {
    state.todos = state.todos.filter((todo) => todo.id !== id);
    persistTodos(state.todos);
  }

  return {
    state,
    hasRecommendations,
    todoCount,
    searchRecommendations,
    clearRecommendations,
    acceptRecommendation,
    updateTodo,
    getTodoById,
    removeTodo
  };
}

function loadTodos(): TodoItemSnapshot[] {
  const raw = localStorage.getItem(TODO_STORAGE_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as TodoItemSnapshot[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistTodos(todos: TodoItemSnapshot[]): void {
  localStorage.setItem(TODO_STORAGE_KEY, JSON.stringify(todos));
}
