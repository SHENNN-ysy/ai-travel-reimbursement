import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import * as api from '@/api';
import type { ReportItemDTO, ReportItemVO } from '@/api';

interface ReportState {
  // 报表明细列表
  items: ReportItemVO[];
  itemsLoading: boolean;
  itemsTotal: number;

  // 汇总数据（从 ProjectDetailVO 获取）
  totalAmount: number;
  fileCount: number;
  confirmedCount: number;
  unconfirmedCount: number;

  // 操作状态
  createLoading: boolean;
  updateLoading: boolean;
  deleteLoading: boolean;
  exportLoading: boolean;
}

const initialState: ReportState = {
  items: [],
  itemsLoading: false,
  itemsTotal: 0,

  totalAmount: 0,
  fileCount: 0,
  confirmedCount: 0,
  unconfirmedCount: 0,

  createLoading: false,
  updateLoading: false,
  deleteLoading: false,
  exportLoading: false,
};

// ==================== Async Thunks ====================

/**
 * 4.1 获取报表明细列表（全部，不分页）
 */
export const fetchReportItems = createAsyncThunk(
  'report/fetchItems',
  async ({ projectId, receiptType }: { projectId: number; receiptType?: string }) => {
    return await api.getReportItems(projectId, receiptType);
  }
);

/**
 * 4.2 添加报表明细
 */
export const createReportItem = createAsyncThunk(
  'report/createItem',
  async ({ projectId, data }: { projectId: number; data: ReportItemDTO }) => {
    return await api.createReportItem(projectId, data);
  }
);

/**
 * 4.3 更新报表明细
 */
export const updateReportItem = createAsyncThunk(
  'report/updateItem',
  async ({
    projectId,
    itemId,
    data,
  }: {
    projectId: number;
    itemId: number;
    data: ReportItemDTO;
  }) => {
    return await api.updateReportItem(projectId, itemId, data);
  }
);

/**
 * 4.4 删除报表明细
 */
export const deleteReportItem = createAsyncThunk(
  'report/deleteItem',
  async ({ projectId, itemId }: { projectId: number; itemId: number }) => {
    await api.deleteReportItem(projectId, itemId);
    return itemId;
  }
);

/**
 * 4.6 导出 Excel
 */
export const exportReport = createAsyncThunk(
  'report/export',
  async ({ projectId, fileName }: { projectId: number; fileName: string }) => {
    await api.exportReportExcel(projectId, fileName);
  }
);

// ==================== Slice ====================

const reportSlice = createSlice({
  name: 'report',
  initialState,
  reducers: {
    setItems: (state, action: PayloadAction<ReportItemVO[]>) => {
      state.items = action.payload;
      state.itemsTotal = action.payload.length;
    },
    setSummary: (
      state,
      action: PayloadAction<{
        totalAmount: number;
        fileCount: number;
        confirmedCount: number;
        unconfirmedCount: number;
      }>
    ) => {
      state.totalAmount = action.payload.totalAmount;
      state.fileCount = action.payload.fileCount;
      state.confirmedCount = action.payload.confirmedCount;
      state.unconfirmedCount = action.payload.unconfirmedCount;
    },
    clearReport: (state) => {
      state.items = [];
      state.itemsTotal = 0;
      state.totalAmount = 0;
      state.fileCount = 0;
      state.confirmedCount = 0;
      state.unconfirmedCount = 0;
    },
    resetReportSlice: () => initialState,
  },
  extraReducers: (builder) => {
    // fetchReportItems
    builder.addCase(fetchReportItems.pending, (state) => {
      state.itemsLoading = true;
    });
    builder.addCase(fetchReportItems.fulfilled, (state, action) => {
      state.itemsLoading = false;
      state.items = action.payload;
      state.itemsTotal = action.payload.length;
    });
    builder.addCase(fetchReportItems.rejected, (state) => {
      state.itemsLoading = false;
    });

    // createReportItem
    builder.addCase(createReportItem.pending, (state) => {
      state.createLoading = true;
    });
    builder.addCase(createReportItem.fulfilled, (state, action) => {
      state.createLoading = false;
      state.items.push(action.payload);
      state.itemsTotal += 1;
    });
    builder.addCase(createReportItem.rejected, (state) => {
      state.createLoading = false;
    });

    // updateReportItem
    builder.addCase(updateReportItem.pending, (state) => {
      state.updateLoading = true;
    });
    builder.addCase(updateReportItem.fulfilled, (state, action) => {
      state.updateLoading = false;
      const index = state.items.findIndex(i => i.id === action.payload.id);
      if (index !== -1) {
        state.items[index] = action.payload;
      }
    });
    builder.addCase(updateReportItem.rejected, (state) => {
      state.updateLoading = false;
    });

    // deleteReportItem
    builder.addCase(deleteReportItem.pending, (state) => {
      state.deleteLoading = true;
    });
    builder.addCase(deleteReportItem.fulfilled, (state, action) => {
      state.deleteLoading = false;
      state.items = state.items.filter(i => i.id !== action.payload);
      state.itemsTotal -= 1;
    });
    builder.addCase(deleteReportItem.rejected, (state) => {
      state.deleteLoading = false;
    });

    // exportReport
    builder.addCase(exportReport.pending, (state) => {
      state.exportLoading = true;
    });
    builder.addCase(exportReport.fulfilled, (state) => {
      state.exportLoading = false;
    });
    builder.addCase(exportReport.rejected, (state) => {
      state.exportLoading = false;
    });
  },
});

export const { setItems, setSummary, clearReport, resetReportSlice } = reportSlice.actions;
export default reportSlice.reducer;
