FROM python:3.11-slim
WORKDIR /app
# 离线安装：excel-mcp-server 及全部依赖的 wheel 已预下载到项目 vendor/ 目录
# （更新依赖时重新执行：docker run --rm --entrypoint sh -v "$PWD/vendor:/out" myai-tool-excel-mcp -c "pip download excel-mcp-server -d /out -i https://pypi.tuna.tsinghua.edu.cn/simple"）
COPY vendor /tmp/vendor
RUN pip install --no-cache-dir --no-index --find-links=/tmp/vendor excel-mcp-server \
    && rm -rf /tmp/vendor
ENV EXCEL_FILES_PATH=/opt/travel-reimbursement/travel-files
ENV FASTMCP_PORT=8017
CMD ["sh", "-c", "excel-mcp-server streamable-http --host 0.0.0.0 --port 8017 --allow-unauthenticated"]
