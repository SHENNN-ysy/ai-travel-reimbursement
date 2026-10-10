import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import * as api from '@/api';
import type {
  FileVO,
  FolderVO,
  FileUpdateDTO,
  BatchRecognizeTaskVO,
  FolderDTO,
} from '@/api';

interface FileState {
  // 文件列表
  files: FileVO[];
  filesLoading: boolean;
  filesTotal: number;

  // 文件夹树
  folders: FolderVO[];
  foldersLoading: boolean;

  // 操作状态
  uploadLoading: boolean;
  recognizeLoading: boolean;
  batchRecognizeTask: BatchRecognizeTaskVO | null;
  batchRecognizeLoading: boolean;

  // 错误
  error: string | null;
}

const initialState: FileState = {
  files: [],
  filesLoading: false,
  filesTotal: 0,

  folders: [],
  foldersLoading: false,

  uploadLoading: false,
  recognizeLoading: false,
  batchRecognizeTask: null,
  batchRecognizeLoading: false,

  error: null,
};

// ==================== Async Thunks ====================

/**
 * 获取项目文件列表（报表页数据源）
 * 4.1 GET /projects/{projectId}/files
 */
export const fetchFileList = createAsyncThunk(
  'file/fetchFileList',
  async (params: {
    projectId: number;
    current?: number;
    size?: number;
    type?: string;
    expenseType?: string;
  }) => {
    const result = await api.getFileList(params);
    return result;
  }
);

/**
 * 上传文件
 * 2.1 POST /projects/{projectId}/files/upload
 */
export const uploadFile = createAsyncThunk(
  'file/uploadFile',
  async ({
    projectId,
    file,
    type,
    folderId,
  }: {
    projectId: number;
    file: File;
    type: 'invoice' | 'screenshot' | 'attachment';
    folderId?: number;
  }) => {
    return await api.uploadFile(projectId, file, type, folderId);
  }
);

/**
 * 删除文件
 * 2.4 DELETE /projects/{projectId}/files/{fileId}
 */
export const deleteFile = createAsyncThunk(
  'file/deleteFile',
  async ({ projectId, fileId }: { projectId: number; fileId: number }) => {
    await api.deleteFile(projectId, fileId);
    return fileId;
  }
);

/**
 * 更新文件信息
 * 2.3 PATCH /projects/{projectId}/files/{fileId}
 */
export const updateFile = createAsyncThunk(
  'file/updateFile',
  async ({
    projectId,
    fileId,
    data,
  }: {
    projectId: number;
    fileId: number;
    data: FileUpdateDTO;
  }) => {
    return await api.updateFile(projectId, fileId, data);
  }
);

/**
 * 单文件识别
 * 2.5 POST /projects/{projectId}/files/{fileId}/recognize
 */
export const recognizeFile = createAsyncThunk(
  'file/recognizeFile',
  async ({ projectId, fileId }: { projectId: number; fileId: number }) => {
    return await api.recognizeFile(projectId, fileId);
  }
);

/**
 * 提交批量识别任务
 * 2.6 POST /projects/{projectId}/files/batch/recognize
 */
export const submitBatchRecognize = createAsyncThunk(
  'file/submitBatchRecognize',
  async ({ projectId, fileIds }: { projectId: number; fileIds: number[] }) => {
    return await api.submitBatchRecognize(projectId, fileIds);
  }
);

/**
 * 批量确认文件
 * 2.7 POST /projects/{projectId}/files/batch/confirm
 */
export const batchConfirmFiles = createAsyncThunk(
  'file/batchConfirmFiles',
  async ({ projectId, fileIds }: { projectId: number; fileIds: number[] }) => {
    return await api.batchConfirmFiles(projectId, fileIds);
  }
);

/**
 * 取消文件确认
 * 2.8 PATCH /projects/{projectId}/files/{fileId}/unconfirm
 */
export const unconfirmFile = createAsyncThunk(
  'file/unconfirmFile',
  async ({ projectId, fileId }: { projectId: number; fileId: number }) => {
    return await api.unconfirmFile(projectId, fileId);
  }
);

/**
 * 获取单个文件详情（用于点击卡片时刷新最新识别结果）
 * 2.2 GET /projects/{projectId}/files/{fileId}
 */
export const fetchFileDetail = createAsyncThunk(
  'file/fetchFileDetail',
  async ({ projectId, fileId }: { projectId: number; fileId: number }) => {
    return await api.getFile(projectId, fileId);
  }
);

/**
 * 获取文件夹树
 * 3.1 GET /projects/{projectId}/folders
 */
export const fetchFolders = createAsyncThunk(
  'file/fetchFolders',
  async (projectId: number) => {
    return await api.getFolderTree(projectId);
  }
);

/**
 * 创建文件夹
 * 3.2 POST /projects/{projectId}/folders
 */
export const createFolder = createAsyncThunk(
  'file/createFolder',
  async ({ projectId, data }: { projectId: number; data: FolderDTO }) => {
    return await api.createFolder(projectId, data);
  }
);

/**
 * 更新文件夹
 * 3.3 PUT /projects/{projectId}/folders/{id}
 */
export const updateFolder = createAsyncThunk(
  'file/updateFolder',
  async ({
    projectId,
    folderId,
    data,
  }: {
    projectId: number;
    folderId: number;
    data: FolderDTO;
  }) => {
    return await api.updateFolder(projectId, folderId, data);
  }
);

/**
 * 删除文件夹
 * 3.4 DELETE /projects/{projectId}/folders/{id}
 */
export const deleteFolder = createAsyncThunk(
  'file/deleteFolder',
  async ({ projectId, folderId }: { projectId: number; folderId: number }) => {
    await api.deleteFolder(projectId, folderId);
    return folderId;
  }
);

// ==================== Slice ====================

const fileSlice = createSlice({
  name: 'file',
  initialState,
  reducers: {
    // 更新本地文件状态（识别结果更新）
    updateFileInList: (state, action: PayloadAction<FileVO>) => {
      const index = state.files.findIndex(f => f.id === action.payload.id);
      if (index !== -1) {
        state.files[index] = action.payload;
      }
    },
    // 确认文件后更新列表
    confirmFilesInList: (state, action: PayloadAction<FileVO[]>) => {
      action.payload.forEach(updatedFile => {
        const index = state.files.findIndex(f => f.id === updatedFile.id);
        if (index !== -1) {
          state.files[index] = updatedFile;
        }
      });
    },
    // 清除文件列表
    clearFiles: (state) => {
      state.files = [];
      state.filesTotal = 0;
    },
    // 清除批量识别任务
    clearBatchRecognizeTask: (state) => {
      state.batchRecognizeTask = null;
    },
    // 更新批量识别任务进度（轮询时使用）
    setBatchRecognizeTask: (state, action: PayloadAction<BatchRecognizeTaskVO>) => {
      state.batchRecognizeTask = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    resetFileSlice: () => initialState,
  },
  extraReducers: (builder) => {
    // fetchFileList
    builder.addCase(fetchFileList.pending, (state) => {
      state.filesLoading = true;
    });
    builder.addCase(fetchFileList.fulfilled, (state, action) => {
      state.filesLoading = false;
      state.files = action.payload.records;
      state.filesTotal = action.payload.total;
    });
    builder.addCase(fetchFileList.rejected, (state, action) => {
      state.filesLoading = false;
      state.error = action.error.message || '获取文件列表失败';
    });

    // uploadFile
    builder.addCase(uploadFile.pending, (state) => {
      state.uploadLoading = true;
    });
    builder.addCase(uploadFile.fulfilled, (state, action) => {
      state.uploadLoading = false;
      state.files.unshift(action.payload);
      state.filesTotal += 1;
    });
    builder.addCase(uploadFile.rejected, (state, action) => {
      state.uploadLoading = false;
      state.error = action.error.message || '文件上传失败';
    });

    // deleteFile
    builder.addCase(deleteFile.fulfilled, (state, action) => {
      state.files = state.files.filter(f => f.id !== action.payload);
      state.filesTotal -= 1;
    });

    // updateFile
    builder.addCase(updateFile.fulfilled, (state, action) => {
      const index = state.files.findIndex(f => f.id === action.payload.id);
      if (index !== -1) {
        state.files[index] = action.payload;
      }
    });

    // recognizeFile
    builder.addCase(recognizeFile.pending, (state) => {
      state.recognizeLoading = true;
    });
    builder.addCase(recognizeFile.fulfilled, (state, action) => {
      state.recognizeLoading = false;
      // action.payload is RecognitionResultVO — update it in the file that owns this result
      const recognizedResult: import('@/api').RecognitionResultVO = action.payload;
      const fileIndex = state.files.findIndex(f => f.id === recognizedResult.fileId);
      if (fileIndex !== -1) {
        if (!state.files[fileIndex].recognitionResult) {
          state.files[fileIndex].recognitionResult = recognizedResult;
        } else {
          // Merge recognized fields over the existing (possibly empty) record
          state.files[fileIndex].recognitionResult = {
            ...state.files[fileIndex].recognitionResult!,
            ...recognizedResult,
          };
        }
      }
    });
    builder.addCase(recognizeFile.rejected, (state) => {
      state.recognizeLoading = false;
    });

    // submitBatchRecognize
    builder.addCase(submitBatchRecognize.pending, (state) => {
      state.batchRecognizeLoading = true;
    });
    builder.addCase(submitBatchRecognize.fulfilled, (state, action) => {
      state.batchRecognizeLoading = false;
      state.batchRecognizeTask = action.payload;
    });
    builder.addCase(submitBatchRecognize.rejected, (state) => {
      state.batchRecognizeLoading = false;
    });

    // batchConfirmFiles
    builder.addCase(batchConfirmFiles.fulfilled, (state, action) => {
      action.payload.forEach(updatedFile => {
        const index = state.files.findIndex(f => f.id === updatedFile.id);
        if (index !== -1) {
          state.files[index] = updatedFile;
        }
      });
    });

    // unconfirmFile
    builder.addCase(unconfirmFile.fulfilled, (state, action) => {
      const index = state.files.findIndex(f => f.id === action.payload.id);
      if (index !== -1) {
        state.files[index] = action.payload;
      }
    });

    // fetchFileDetail
    builder.addCase(fetchFileDetail.fulfilled, (state, action) => {
      const index = state.files.findIndex(f => f.id === action.payload.id);
      if (index !== -1) {
        state.files[index] = action.payload;
      }
    });

    // fetchFolders
    builder.addCase(fetchFolders.pending, (state) => {
      state.foldersLoading = true;
    });
    builder.addCase(fetchFolders.fulfilled, (state, action) => {
      state.foldersLoading = false;
      state.folders = action.payload;
    });
    builder.addCase(fetchFolders.rejected, (state) => {
      state.foldersLoading = false;
    });

    // createFolder
    builder.addCase(createFolder.fulfilled, (state, action) => {
      // 将新文件夹添加到对应父级的 children 中
      const parentId = action.payload.parentId;
      if (parentId && parentId !== 0) {
        const findAndAdd = (folders: FolderVO[]): boolean => {
          for (const folder of folders) {
            if (folder.id === parentId) {
              folder.children.push(action.payload);
              return true;
            }
            if (folder.children && findAndAdd(folder.children)) return true;
          }
          return false;
        };
        findAndAdd(state.folders);
      } else {
        state.folders.push(action.payload);
      }
    });

    // updateFolder
    builder.addCase(updateFolder.fulfilled, (state, action) => {
      const findAndUpdate = (folders: FolderVO[]): boolean => {
        for (let i = 0; i < folders.length; i++) {
          if (folders[i].id === action.payload.id) {
            folders[i] = action.payload;
            return true;
          }
          if (folders[i].children && findAndUpdate(folders[i].children!)) return true;
        }
        return false;
      };
      findAndUpdate(state.folders);
    });

    // deleteFolder
    builder.addCase(deleteFolder.fulfilled, (state, action) => {
      const findAndRemove = (folders: FolderVO[]): FolderVO[] => {
        return folders
          .filter(f => f.id !== action.payload)
          .map(f => ({
            ...f,
            children: f.children ? findAndRemove(f.children) : [],
          }));
      };
      state.folders = findAndRemove(state.folders);
    });
  },
});

export const {
  updateFileInList,
  confirmFilesInList,
  clearFiles,
  clearBatchRecognizeTask,
  setBatchRecognizeTask,
  clearError,
  resetFileSlice,
} = fileSlice.actions;

export default fileSlice.reducer;
