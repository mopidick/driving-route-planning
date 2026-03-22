import { reactive } from 'vue';

export type SheetLevel = 'collapsed' | 'half' | 'full';

interface UiState {
  sheetLevel: SheetLevel;
  detailOpen: boolean;
}

const uiState = reactive<UiState>({
  sheetLevel: 'half',
  detailOpen: false
});

export function useUiState() {
  function setSheetLevel(level: SheetLevel): void {
    uiState.sheetLevel = level;
  }

  function setDetailOpen(open: boolean): void {
    uiState.detailOpen = open;
  }

  function resetUiState(): void {
    uiState.sheetLevel = 'half';
    uiState.detailOpen = false;
  }

  return {
    uiState,
    setSheetLevel,
    setDetailOpen,
    resetUiState
  };
}
