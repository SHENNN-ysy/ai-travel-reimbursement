import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { UploadFile } from '@/types';
import { generateId } from '@/utils/format';

interface UploadState {
  invoices: UploadFile[];
  screenshots: UploadFile[];
  attachments: UploadFile[];
  isUploading: boolean;
  uploadProgress: Record<string, number>;
}

const initialState: UploadState = {
  invoices: [],
  screenshots: [],
  attachments: [],
  isUploading: false,
  uploadProgress: {},
};

const uploadSlice = createSlice({
  name: 'upload',
  initialState,
  reducers: {
    addFile: (state, action: PayloadAction<{ type: 'invoice' | 'screenshot' | 'attachment'; file: File }>) => {
      const { type, file } = action.payload;
      const newFile: UploadFile = {
        id: generateId(),
        name: file.name,
        size: file.size,
        type,
        status: 'pending',
        file,
        createdAt: new Date().toISOString(),
      };
      
      switch (type) {
        case 'invoice':
          state.invoices.push(newFile);
          break;
        case 'screenshot':
          state.screenshots.push(newFile);
          break;
        case 'attachment':
          state.attachments.push(newFile);
          break;
      }
    },
    removeFile: (state, action: PayloadAction<{ type: 'invoice' | 'screenshot' | 'attachment'; id: string }>) => {
      const { type, id } = action.payload;
      switch (type) {
        case 'invoice':
          state.invoices = state.invoices.filter(f => f.id !== id);
          break;
        case 'screenshot':
          state.screenshots = state.screenshots.filter(f => f.id !== id);
          break;
        case 'attachment':
          state.attachments = state.attachments.filter(f => f.id !== id);
          break;
      }
    },
    updateFileStatus: (state, action: PayloadAction<{
      type: 'invoice' | 'screenshot' | 'attachment';
      id: string;
      status: UploadFile['status'];
      url?: string;
    }>) => {
      const { type, id, status, url } = action.payload;
      const files = state[type === 'invoice' ? 'invoices' : type === 'screenshot' ? 'screenshots' : 'attachments'];
      const file = files.find(f => f.id === id);
      if (file) {
        file.status = status;
        if (url) file.url = url;
      }
    },
    setUploadProgress: (state, action: PayloadAction<{ id: string; progress: number }>) => {
      state.uploadProgress[action.payload.id] = action.payload.progress;
    },
    setUploading: (state, action: PayloadAction<boolean>) => {
      state.isUploading = action.payload;
    },
    clearFiles: (state, action: PayloadAction<'invoice' | 'screenshot' | 'attachment' | 'all'>) => {
      if (action.payload === 'all') {
        state.invoices = [];
        state.screenshots = [];
        state.attachments = [];
      } else {
        state[`${action.payload}s`] = [];
      }
    },
    resetUploadSlice: () => initialState,
  },
});

export const {
  addFile,
  removeFile,
  updateFileStatus,
  setUploadProgress,
  setUploading,
  clearFiles,
  resetUploadSlice,
} = uploadSlice.actions;

export default uploadSlice.reducer;
