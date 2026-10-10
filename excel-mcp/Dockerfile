FROM python:3.11-slim
WORKDIR /app
# 直接 pip 安装（PyPI 包名为 excel-mcp-server，提供 excel-mcp-server 命令）
RUN pip install --no-cache-dir -i https://pypi.tuna.tsinghua.edu.cn/simple excel-mcp-server
ENV EXCEL_FILES_PATH=/opt/travel-reimbursement/travel-files
ENV FASTMCP_PORT=8017
CMD ["sh", "-c", "excel-mcp-server streamable-http --host 0.0.0.0 --port 8017 --allow-unauthenticated"]
