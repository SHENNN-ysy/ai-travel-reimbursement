# 出差报销AI助手

一款基于人工智能的企业级出差报销管理工具，通过智能化的资料上传、AI识别、文件归档和报表生成功能，大幅简化出差报销流程，提升财务处理效率。

## 功能特性

- 📤 **资料上传**: 支持发票、付款截图、附加材料等多种类型文件的上传
- 🤖 **AI识别**: 后端AI自动识别发票内容，提取关键信息
- 📁 **文件归档**: 根据出差地和日期自动分类生成文件夹
- 📊 **报表生成**: 自动生成Excel格式的报销汇总表
- 📈 **进度跟踪**: 实时展示处理状态和进度
- 👁️ **结果预览**: 支持预览AI识别结果和生成的报表

## 技术栈

- **框架**: React 18 + TypeScript
- **路由**: React Router 6
- **状态管理**: Redux Toolkit
- **UI组件库**: Ant Design 5
- **样式**: Tailwind CSS
- **构建工具**: Vite 5

## 快速开始

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

项目将在 http://localhost:3000 启动。

### 构建生产版本

```bash
npm run build
```

## 项目结构

```
src/
├── components/           # 组件目录
│   ├── common/          # 通用组件
│   ├── upload/          # 上传相关组件
│   ├── archive/         # 归档相关组件
│   ├── report/          # 报表相关组件
│   └── forms/           # 表单组件
├── pages/               # 页面组件
├── store/               # 状态管理
│   └── slices/          # Redux slices
├── types/               # TypeScript类型定义
├── utils/               # 工具函数
└── styles/              # 全局样式
```

## 页面路由

- `/` - 首页/仪表盘
- `/upload` - 资料上传页面
- `/archive` - 文件归档页面
- `/report` - 报销报表页面
- `/settings` - 设置页面

## License

MIT
