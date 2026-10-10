import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  ReimbursementProject,
  HistoricalProject,
  UploadFile,
  FolderStructure,
  TravelInfo,
} from '@/types';
import { generateId } from '@/utils/format';

interface ReimbursementState {
  currentProject: ReimbursementProject | null;
  historicalProjects: HistoricalProject[];
  fullHistoricalProjects: ReimbursementProject[]; // 存储完整项目数据
  isLoading: boolean;
}

const defaultFolderStructure: FolderStructure = {
  folders: [
    { id: generateId(), name: '发票文件', type: 'invoice', children: [] },
    { id: generateId(), name: '付款截图', type: 'screenshot', children: [] },
    { id: generateId(), name: '附加材料', type: 'attachment', children: [] },
  ],
};

const defaultProject: ReimbursementProject = {
  id: generateId(),
  name: '2026年出差报销',
  travelInfo: {
    id: generateId(),
    destination: '',
    startDate: '',
    endDate: '',
    reason: '',
    person: '张三',
    department: '',
    remark: '',
  },
  folderStructure: defaultFolderStructure,
  files: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const initialState: ReimbursementState = {
  currentProject: null,
  historicalProjects: [],
  fullHistoricalProjects: [],
  isLoading: false,
};

const reimbursementSlice = createSlice({
  name: 'reimbursement',
  initialState,
  reducers: {
    // 创建新报销项目
    createProject: (state, action: PayloadAction<{ name: string; travelInfo?: TravelInfo }>) => {
      state.currentProject = {
        id: generateId(),
        name: action.payload.name,
        travelInfo: action.payload.travelInfo || {
          id: '',
          destination: '',
          person: '',
          startDate: '',
          endDate: '',
          department: '',
          reason: '',
          remark: '',
        },
        folderStructure: defaultFolderStructure,
        files: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    },

    // 选择历史项目（仅设置 currentProject）
    selectProject: (state, action: PayloadAction<ReimbursementProject>) => {
      state.currentProject = action.payload;
    },

    // 保存当前项目并切换到历史项目
    switchToProject: (state, action: PayloadAction<string>) => {
      // 保存当前项目到历史
      if (state.currentProject) {
        const existingFullIndex = state.fullHistoricalProjects.findIndex(
          p => p.id === state.currentProject!.id
        );
        if (existingFullIndex !== -1) {
          state.fullHistoricalProjects[existingFullIndex] = { ...state.currentProject };
        } else {
          state.fullHistoricalProjects.unshift({ ...state.currentProject });
        }

        const existing = state.historicalProjects.findIndex(
          p => p.id === state.currentProject!.id
        );
        if (existing !== -1) {
          state.historicalProjects[existing] = {
            id: state.currentProject.id,
            name: state.currentProject.name,
            createdAt: state.currentProject.createdAt,
            totalAmount: state.currentProject.files.reduce((sum, f) =>
              sum + (f.recognitionData?.amount || 0), 0
            ),
            fileCount: state.currentProject.files.length,
          };
        } else {
          state.historicalProjects.unshift({
            id: state.currentProject.id,
            name: state.currentProject.name,
            createdAt: state.currentProject.createdAt,
            totalAmount: state.currentProject.files.reduce((sum, f) =>
              sum + (f.recognitionData?.amount || 0), 0
            ),
            fileCount: state.currentProject.files.length,
          });
        }
      }

      // 切换到选中的历史项目
      const targetProject = state.fullHistoricalProjects.find(p => p.id === action.payload);
      if (targetProject) {
        state.currentProject = { ...targetProject };
      }
    },

    // 更新项目名称
    updateProjectName: (state, action: PayloadAction<string>) => {
      if (state.currentProject) {
        state.currentProject.name = action.payload;
        state.currentProject.updatedAt = new Date().toISOString();
      }
    },

    // 更新出差信息
    updateTravelInfo: (state, action: PayloadAction<Partial<TravelInfo>>) => {
      if (state.currentProject) {
        state.currentProject.travelInfo = {
          ...state.currentProject.travelInfo,
          ...action.payload,
        };
        state.currentProject.updatedAt = new Date().toISOString();
      }
    },

    // 更新项目名称和出差信息（用于首页编辑弹窗）
    updateProjectTravelInfo: (state, action: PayloadAction<{ name: string; travelInfo: Partial<TravelInfo> }>) => {
      if (state.currentProject) {
        state.currentProject.name = action.payload.name;
        state.currentProject.travelInfo = {
          ...state.currentProject.travelInfo,
          ...action.payload.travelInfo,
        };
        state.currentProject.updatedAt = new Date().toISOString();
      }
    },

    // 更新文件夹结构
    updateFolderStructure: (state, action: PayloadAction<FolderStructure>) => {
      if (state.currentProject) {
        state.currentProject.folderStructure = action.payload;
        state.currentProject.updatedAt = new Date().toISOString();
      }
    },

    // 添加文件到项目
    addFileToProject: (state, action: PayloadAction<UploadFile>) => {
      if (state.currentProject) {
        // 避免重复添加相同ID的文件
        const exists = state.currentProject.files.some(f => f.id === action.payload.id);
        if (!exists) {
          state.currentProject.files.push(action.payload);
          state.currentProject.updatedAt = new Date().toISOString();
        }
      }
    },

    // 批量添加文件到项目
    addFilesToProject: (state, action: PayloadAction<UploadFile[]>) => {
      if (state.currentProject) {
        const newFiles = action.payload.filter(
          f => !state.currentProject!.files.some(existing => existing.id === f.id)
        );
        if (newFiles.length > 0) {
          state.currentProject.files.push(...newFiles);
          state.currentProject.updatedAt = new Date().toISOString();
        }
      }
    },

    // 从项目移除文件
    removeFileFromProject: (state, action: PayloadAction<string>) => {
      if (state.currentProject) {
        state.currentProject.files = state.currentProject.files.filter(
          f => f.id !== action.payload
        );
        state.currentProject.updatedAt = new Date().toISOString();
      }
    },

    // 更新文件信息
    updateFileInProject: (state, action: PayloadAction<UploadFile>) => {
      if (state.currentProject) {
        const index = state.currentProject.files.findIndex(
          f => f.id === action.payload.id
        );
        if (index !== -1) {
          state.currentProject.files[index] = action.payload;
          state.currentProject.updatedAt = new Date().toISOString();
        }
      }
    },

    // 添加文件夹
    addFolder: (state, action: PayloadAction<{ parentId?: string; name: string }>) => {
      if (state.currentProject) {
        const newFolder = {
          id: generateId(),
          name: action.payload.name,
          type: 'folder' as const,
          children: [],
        };

        if (action.payload.parentId) {
          const addToParent = (folders: any[]): boolean => {
            for (const folder of folders) {
              if (folder.id === action.payload.parentId) {
                folder.children = folder.children || [];
                folder.children.push(newFolder);
                return true;
              }
              if (folder.children && addToParent(folder.children)) {
                return true;
              }
            }
            return false;
          };
          addToParent(state.currentProject.folderStructure.folders);
        } else {
          state.currentProject.folderStructure.folders.push(newFolder);
        }
        state.currentProject.updatedAt = new Date().toISOString();
      }
    },

    // 删除文件夹
    removeFolder: (state, action: PayloadAction<string>) => {
      if (state.currentProject) {
        const removeFromList = (folders: any[]): boolean => {
          const index = folders.findIndex(f => f.id === action.payload);
          if (index !== -1) {
            folders.splice(index, 1);
            return true;
          }
          for (const folder of folders) {
            if (folder.children && removeFromList(folder.children)) {
              return true;
            }
          }
          return false;
        };
        removeFromList(state.currentProject.folderStructure.folders);
        state.currentProject.updatedAt = new Date().toISOString();
      }
    },

    // 重命名文件夹
    renameFolder: (state, action: PayloadAction<{ id: string; name: string }>) => {
      if (state.currentProject) {
        const renameInList = (folders: any[]): boolean => {
          for (const folder of folders) {
            if (folder.id === action.payload.id) {
              folder.name = action.payload.name;
              return true;
            }
            if (folder.children && renameInList(folder.children)) {
              return true;
            }
          }
          return false;
        };
        renameInList(state.currentProject.folderStructure.folders);
        state.currentProject.updatedAt = new Date().toISOString();
      }
    },

    // 更新文件夹名称
    updateFolderName: (state, action: PayloadAction<{ folderId: string; name: string }>) => {
      if (state.currentProject) {
        const folder = state.currentProject.folderStructure.folders.find(
          f => f.id === action.payload.folderId
        );
        if (folder) {
          folder.name = action.payload.name;
          state.currentProject.updatedAt = new Date().toISOString();
        }
      }
    },

    // 清除当前项目
    clearCurrentProject: (state) => {
      state.currentProject = null;
    },

    resetReimbursementSlice: () => initialState,

    // 保存到历史
    saveToHistory: (state) => {
      if (state.currentProject) {
        // 保存完整项目数据
        const existingFullIndex = state.fullHistoricalProjects.findIndex(
          p => p.id === state.currentProject!.id
        );
        if (existingFullIndex !== -1) {
          state.fullHistoricalProjects[existingFullIndex] = { ...state.currentProject };
        } else {
          state.fullHistoricalProjects.unshift({ ...state.currentProject });
        }

        // 保存项目摘要
        const existing = state.historicalProjects.findIndex(
          p => p.id === state.currentProject!.id
        );
        const projectSummary: HistoricalProject = {
          id: state.currentProject.id,
          name: state.currentProject.name,
          createdAt: state.currentProject.createdAt,
          totalAmount: state.currentProject.files.reduce((sum, f) =>
            sum + (f.recognitionData?.amount || 0), 0
          ),
          fileCount: state.currentProject.files.length,
        };

        if (existing !== -1) {
          state.historicalProjects[existing] = projectSummary;
        } else {
          state.historicalProjects.unshift(projectSummary);
        }
      }
    },
  },
});

export const {
  createProject,
  selectProject,
  switchToProject,
  updateProjectName,
  updateTravelInfo,
  updateProjectTravelInfo,
  updateFolderStructure,
  addFileToProject,
  addFilesToProject,
  removeFileFromProject,
  updateFileInProject,
  addFolder,
  removeFolder,
  renameFolder,
  updateFolderName,
  clearCurrentProject,
  saveToHistory,
  resetReimbursementSlice,
} = reimbursementSlice.actions;

export default reimbursementSlice.reducer;
