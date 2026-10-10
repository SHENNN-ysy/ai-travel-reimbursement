import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import * as api from '@/api';
import type { ProjectVO, ProjectDetailVO, CreateProjectDTO, UpdateProjectDTO } from '@/api';
import { projectsFetched } from '@/utils/constants';

interface ProjectState {
  // 项目列表
  projects: ProjectVO[];
  projectsLoading: boolean;
  projectsTotal: number;
  projectsCurrent: number;

  // 当前项目详情
  currentProject: ProjectDetailVO | null;
  currentProjectLoading: boolean;

  // 操作状态
  createLoading: boolean;
  updateLoading: boolean;
  deleteLoading: boolean;
}

const initialState: ProjectState = {
  projects: [],
  projectsLoading: false,
  projectsTotal: 0,
  projectsCurrent: 1,

  currentProject: null,
  currentProjectLoading: false,

  createLoading: false,
  updateLoading: false,
  deleteLoading: false,
};

// ==================== Async Thunks ====================

/**
 * 1.2 分页查询项目列表
 */
export const fetchProjects = createAsyncThunk(
  'project/fetchProjects',
  async (params: {
    current?: number;
    size?: number;
    name?: string;
    status?: number;
  }) => {
    const result = await api.getProjectPage(params);
    return result;
  }
);

/**
 * 1.3 获取项目详情
 */
export const fetchProjectDetail = createAsyncThunk(
  'project/fetchProjectDetail',
  async (id: number) => {
    return await api.getProjectDetail(id);
  }
);

/**
 * 1.1 创建项目
 */
export const createProject = createAsyncThunk(
  'project/createProject',
  async (data: CreateProjectDTO) => {
    return await api.createProject(data);
  }
);

/**
 * 1.4 更新项目
 */
export const updateProject = createAsyncThunk(
  'project/updateProject',
  async ({ id, data }: { id: number; data: UpdateProjectDTO }) => {
    return await api.updateProject(id, data);
  }
);

/**
 * 1.5 删除项目
 */
export const deleteProject = createAsyncThunk(
  'project/deleteProject',
  async (id: number) => {
    await api.deleteProject(id);
    return id;
  }
);

/**
 * 1.6 导出报销项目（打包下载）
 */
export const exportProjectPackage = createAsyncThunk(
  'project/exportPackage',
  async ({ projectId, fileName }: { projectId: number; fileName: string }) => {
    await api.exportProjectPackage(projectId, fileName);
  }
);

// ==================== Slice ====================

const projectSlice = createSlice({
  name: 'project',
  initialState,
  reducers: {
    clearCurrentProject: (state) => {
      state.currentProject = null;
    },
    clearProjects: (state) => {
      state.projects = [];
      state.projectsTotal = 0;
    },
    resetProjectSlice: (state) => {
      projectsFetched.value = false;
      return initialState;
    },
    updateProjectLocally: (state, action: PayloadAction<ProjectVO>) => {
      const index = state.projects.findIndex(p => p.id === action.payload.id);
      if (index !== -1) {
        state.projects[index] = action.payload;
      }
    },
  },
  extraReducers: (builder) => {
    // fetchProjects
    builder.addCase(fetchProjects.pending, (state) => {
      state.projectsLoading = true;
    });
    builder.addCase(fetchProjects.fulfilled, (state, action) => {
      state.projectsLoading = false;
      state.projects = action.payload.records;
      state.projectsTotal = action.payload.total;
      state.projectsCurrent = action.payload.current;
    });
    builder.addCase(fetchProjects.rejected, (state) => {
      state.projectsLoading = false;
    });

    // fetchProjectDetail
    builder.addCase(fetchProjectDetail.pending, (state) => {
      state.currentProjectLoading = true;
    });
    builder.addCase(fetchProjectDetail.fulfilled, (state, action) => {
      state.currentProjectLoading = false;
      state.currentProject = action.payload;
    });
    builder.addCase(fetchProjectDetail.rejected, (state) => {
      state.currentProjectLoading = false;
    });

    // createProject
    builder.addCase(createProject.pending, (state) => {
      state.createLoading = true;
    });
    builder.addCase(createProject.fulfilled, (state, action) => {
      state.createLoading = false;
      state.projects.unshift(action.payload);
      state.projectsTotal += 1;
    });
    builder.addCase(createProject.rejected, (state) => {
      state.createLoading = false;
    });

    // updateProject
    builder.addCase(updateProject.pending, (state) => {
      state.updateLoading = true;
    });
    builder.addCase(updateProject.fulfilled, (state, action) => {
      state.updateLoading = false;
      const index = state.projects.findIndex(p => p.id === action.payload.id);
      if (index !== -1) {
        state.projects[index] = action.payload;
      }
      if (state.currentProject?.id === action.payload.id) {
        state.currentProject = {
          ...state.currentProject,
          ...action.payload,
        };
      }
    });
    builder.addCase(updateProject.rejected, (state) => {
      state.updateLoading = false;
    });

    // deleteProject
    builder.addCase(deleteProject.pending, (state) => {
      state.deleteLoading = true;
    });
    builder.addCase(deleteProject.fulfilled, (state, action) => {
      state.deleteLoading = false;
      state.projects = state.projects.filter(p => p.id !== action.payload);
      state.projectsTotal -= 1;
      if (state.currentProject?.id === action.payload) {
        state.currentProject = null;
      }
    });
    builder.addCase(deleteProject.rejected, (state) => {
      state.deleteLoading = false;
    });
  },
});

export const { clearCurrentProject, clearProjects, updateProjectLocally, resetProjectSlice } = projectSlice.actions;
export default projectSlice.reducer;
