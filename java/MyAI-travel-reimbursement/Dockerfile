FROM eclipse-temurin:21-jre
ENV TZ=Asia/Shanghai
WORKDIR /app
# 切换清华镜像源，避免 archive.ubuntu.com 连接失败
RUN set -e; \
    for f in /etc/apt/sources.list /etc/apt/sources.list.d/ubuntu.sources; do \
      if [ -f "$f" ]; then \
        sed -i -e 's|http://archive.ubuntu.com/ubuntu|https://mirrors.tuna.tsinghua.edu.cn/ubuntu|g' \
               -e 's|http://security.ubuntu.com/ubuntu|https://mirrors.tuna.tsinghua.edu.cn/ubuntu|g' "$f"; \
      fi; \
    done
RUN apt-get update && apt-get install -y libstdc++6 nodejs npm && rm -rf /var/lib/apt/lists/*
COPY target/MyAI-travel-reimbursement-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
