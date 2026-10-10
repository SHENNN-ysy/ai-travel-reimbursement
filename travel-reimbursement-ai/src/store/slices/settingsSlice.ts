import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import * as api from '@/api';
import type { SettingsVO, SettingsUpdateDTO } from '@/api';

interface SettingsState {
  settings: SettingsVO | null;
  loading: boolean;
  saving: boolean;
}

const initialState: SettingsState = {
  settings: null,
  loading: false,
  saving: false,
};

/**
 * 6.1 获取全局设置
 */
export const fetchSettings = createAsyncThunk('settings/fetch', async () => {
  return await api.getSettings();
});

/**
 * 6.2 更新全局设置
 */
export const saveSettings = createAsyncThunk(
  'settings/save',
  async (data: SettingsUpdateDTO) => {
    return await api.updateSettings(data);
  }
);

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    resetSettingsSlice: () => initialState,
  },
  extraReducers: (builder) => {
    builder.addCase(fetchSettings.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(fetchSettings.fulfilled, (state, action) => {
      state.loading = false;
      state.settings = action.payload;
    });
    builder.addCase(fetchSettings.rejected, (state) => {
      state.loading = false;
    });
    builder.addCase(saveSettings.pending, (state) => {
      state.saving = true;
    });
    builder.addCase(saveSettings.fulfilled, (state, action) => {
      state.saving = false;
      state.settings = action.payload;
    });
    builder.addCase(saveSettings.rejected, (state) => {
      state.saving = false;
    });
  },
});

export const { resetSettingsSlice } = settingsSlice.actions;

export default settingsSlice.reducer;
