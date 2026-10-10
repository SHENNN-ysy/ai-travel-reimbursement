package com.aidemo.myaitravelreimbursement.agent.memory;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 跨会话持久化记忆管理器。
 *
 * 核心职责：
 * 1. 按 projectId 维护四类持久记忆文件（user/feedback/project/reference）
 * 2. 提供 MEMORY.md 索引文件的读写
 * 3. 按容量限制（200行/25KB）管理索引大小
 * 4. 记忆内容写入严格两步操作：先写内容文件，再更新索引
 */
@Slf4j
@Component
public class PersistentMemoryManager {

    public enum MemoryType {
        USER("user"),
        FEEDBACK("feedback"),
        PROJECT("project"),
        REFERENCE("reference");

        public final String prefix;

        MemoryType(String prefix) {
            this.prefix = prefix;
        }

        public static MemoryType fromString(String type) {
            for (MemoryType t : values()) {
                if (t.name().equalsIgnoreCase(type) || t.prefix.equalsIgnoreCase(type)) {
                    return t;
                }
            }
            throw new IllegalArgumentException("Unknown memory type: " + type);
        }
    }

    private final String memoryBasePath;
    private final int maxFileBytes;
    private final int maxLineCount;

    public PersistentMemoryManager(
            @Value("${memory.persistent.base-path:${storage.base-path:}}") String memoryBasePath,
            @Value("${memory.persistent.max-file-bytes:26214400}") int maxFileBytes,
            @Value("${memory.persistent.max-line-count:200}") int maxLineCount) {
        this.memoryBasePath = memoryBasePath;
        this.maxFileBytes = maxFileBytes;
        this.maxLineCount = maxLineCount;
    }

    // ========== 目录结构 ==========

    private Path getProjectMemoryDir(String projectId) {
        return Paths.get(memoryBasePath, "memory", "projects", sanitizeProjectId(projectId));
    }

    private Path getIndexFile(String projectId) {
        return getProjectMemoryDir(projectId).resolve("MEMORY.md");
    }

    private Path getMemoryFile(String projectId, String filename) {
        return getProjectMemoryDir(projectId).resolve(filename);
    }

    // ========== 索引读取（加载到 System Prompt） ==========

    /**
     * 加载 MEMORY.md 索引文件内容。
     */
    public String loadIndex(String projectId) {
        Path indexFile = getIndexFile(projectId);
        if (!Files.exists(indexFile)) {
            return "";
        }
        try {
            String content = Files.readString(indexFile, StandardCharsets.UTF_8);
            return truncateByLineAndBytes(content);
        } catch (IOException e) {
            log.error("Failed to read MEMORY.md for project {}", projectId, e);
            return "";
        }
    }

    /**
     * 解析 MEMORY.md 中的索引行，返回 (filename → hook) 映射。
     */
    public Map<String, String> parseIndex(String projectId) {
        String indexContent = loadIndex(projectId);
        if (indexContent.isEmpty()) {
            return Collections.emptyMap();
        }
        Map<String, String> result = new LinkedHashMap<>();
        Pattern linePattern = Pattern.compile("- \\[([^\\]]+)\\]\\(([^\\)]+)\\)(?: — (.+))?");
        for (String line : indexContent.split("\n")) {
            Matcher m = linePattern.matcher(line.trim());
            if (m.find()) {
                String title = m.group(1);
                String filename = m.group(2);
                String hook = m.group(3) != null ? m.group(3) : "";
                result.put(filename, hook);
            }
        }
        return result;
    }

    /**
     * 根据上下文查找相关记忆文件，返回其完整内容。
     *
     * @param projectId 项目ID
     * @param context   当前对话上下文（用于过滤相关性）
     * @return 相关记忆内容拼接字符串
     */
    public String findRelevantMemories(String projectId, String context) {
        Map<String, String> index = parseIndex(projectId);
        if (index.isEmpty()) return "";

        StringBuilder sb = new StringBuilder();
        for (Map.Entry<String, String> entry : index.entrySet()) {
            String filename = entry.getKey();
            String hook = entry.getValue();
            // 简单相关性判断：hook 中包含 context 关键词
            if (context != null && !context.isBlank()
                    && (hook.toLowerCase().contains(context.toLowerCase())
                        || filename.contains(context))) {
                String content = loadMemoryFile(projectId, filename);
                if (!content.isEmpty()) {
                    sb.append(content).append("\n\n");
                }
            }
        }
        return sb.toString();
    }

    /**
     * 加载项目的持久记忆上下文（方案 2.8 指定接口）。
     *
     * - MEMORY.md 索引文件常驻 system prompt
     * - 相关记忆内容按当前对话上下文筛选后加载
     * - PROJECT 类型记忆超过 30 天自动跳过（方案 2.9）
     *
     * @param projectId 项目ID
     * @param context   当前对话上下文（用于筛选相关记忆，可为 null 或空）
     * @return 拼接后的持久记忆上下文字符串
     */
    public String loadPersistentContext(String projectId, String context) {
        StringBuilder sb = new StringBuilder();

        // Step 1: 加载 MEMORY.md 索引（常驻）
        String indexContent = loadIndex(projectId);
        if (!indexContent.isEmpty()) {
            sb.append("【项目记忆索引】\n").append(indexContent);
        }

        // Step 2: 加载相关记忆内容（按 context 筛选，project 类型做 30 天衰减）
        String relevantContent = findRelevantMemoriesWithDecay(projectId, context);
        if (!relevantContent.isEmpty()) {
            sb.append("\n\n【相关记忆详情】\n").append(relevantContent);
        }

        return sb.toString();
    }

    /**
     * 根据上下文查找相关记忆，PROJECT 类型记忆超过 30 天自动跳过。
     */
    private String findRelevantMemoriesWithDecay(String projectId, String context) {
        Map<String, String> index = parseIndex(projectId);
        if (index.isEmpty()) return "";

        StringBuilder sb = new StringBuilder();
        LocalDate cutoff = LocalDate.now().minusDays(30);

        for (Map.Entry<String, String> entry : index.entrySet()) {
            String filename = entry.getKey();

            // PROJECT 类型超过 30 天则跳过
            if (filename.startsWith("project_")) {
                LocalDate createdDate = extractCreatedDate(projectId, filename);
                if (createdDate != null && createdDate.isBefore(cutoff)) {
                    log.debug("Skipping expired project memory: {} (created: {})", filename, createdDate);
                    continue;
                }
            }

            String hook = entry.getValue();
            boolean relevant = context == null || context.isBlank()
                    || hook.toLowerCase().contains(context.toLowerCase())
                    || filename.contains(context);

            if (!relevant) continue;

            String content = loadMemoryFile(projectId, filename);
            if (!content.isEmpty()) {
                sb.append(content).append("\n\n");
            }
        }
        return sb.toString();
    }

    /**
     * 从记忆文件的 frontmatter 中提取 created 日期。
     */
    private LocalDate extractCreatedDate(String projectId, String filename) {
        Path file = getMemoryFile(projectId, filename);
        if (!Files.exists(file)) return null;
        try {
            List<String> lines = Files.readAllLines(file, StandardCharsets.UTF_8);
            for (String line : lines) {
                if (line.startsWith("created:")) {
                    String dateStr = line.substring("created:".length()).trim();
                    return LocalDate.parse(dateStr, DateTimeFormatter.ISO_LOCAL_DATE);
                }
                if (line.startsWith("---")) {
                    break;
                }
            }
        } catch (Exception e) {
            log.warn("Failed to extract created date from {}: {}", filename, e.getMessage());
        }
        return null;
    }

    /**
     * 加载全部记忆内容（不过滤，用于完整持久上下文）。
     * @deprecated use {@link #loadPersistentContext(String, String)} instead
     */
    @Deprecated
    public String loadAllMemories(String projectId) {
        Map<String, String> index = parseIndex(projectId);
        if (index.isEmpty()) return "";

        StringBuilder sb = new StringBuilder();
        LocalDate cutoff = LocalDate.now().minusDays(30);

        for (String filename : index.keySet()) {
            if (filename.startsWith("project_")) {
                LocalDate createdDate = extractCreatedDate(projectId, filename);
                if (createdDate != null && createdDate.isBefore(cutoff)) {
                    continue;
                }
            }
            String content = loadMemoryFile(projectId, filename);
            if (!content.isEmpty()) {
                sb.append(content).append("\n\n");
            }
        }
        return sb.toString();
    }

    /**
     * 读取单个记忆文件内容。
     */
    public String loadMemoryFile(String projectId, String filename) {
        Path file = getMemoryFile(projectId, filename);
        if (!Files.exists(file)) {
            return "";
        }
        try {
            String content = Files.readString(file, StandardCharsets.UTF_8);
            return truncateByBytes(content);
        } catch (IOException e) {
            log.error("Failed to read memory file {} for project {}", filename, projectId, e);
            return "";
        }
    }

    // ========== 记忆写入（两步原子操作） ==========

    /**
     * 保存一条持久记忆（两步操作：先写内容文件，再更新索引）。
     *
     * @param projectId  项目ID
     * @param memoryType 记忆类型（USER/FEEDBACK/PROJECT/REFERENCE）
     * @param name       记忆名称（用于标题和文件名）
     * @param content    记忆正文（Content 部分）
     * @param why        动机说明（Why 部分）
     * @param howToApply 如何应用（How to apply 部分）
     * @return 保存的文件名
     */
    public String saveMemory(String projectId, MemoryType memoryType, String name,
                             String content, String why, String howToApply) {
        // Step 1：生成文件名
        String slug = generateSlug(name);
        String filename = memoryType.prefix + "_" + slug + ".md";
        Path dir = getProjectMemoryDir(projectId);
        Path file = dir.resolve(filename);

        // 确保目录存在
        try {
            Files.createDirectories(dir);
        } catch (IOException e) {
            throw new RuntimeException("Failed to create memory directory: " + dir, e);
        }

        // 构建内容
        String dateStr = LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE);
        String fullContent = buildMemoryFileContent(memoryType, name, dateStr, content, why, howToApply);

        // 写入内容文件（先写）
        try {
            Files.writeString(file, fullContent, StandardCharsets.UTF_8,
                    StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
        } catch (IOException e) {
            throw new RuntimeException("Failed to write memory file: " + file, e);
        }

        // Step 2：更新 MEMORY.md 索引（后写）
        String hook = content.length() > 80 ? content.substring(0, 80) + "…" : content;
        appendToIndex(projectId, filename, name, hook);

        log.info("Saved persistent memory: projectId={}, type={}, file={}", projectId, memoryType, filename);
        return filename;
    }

    /**
     * 更新 MEMORY.md 索引行（两步操作的第二步）。
     */
    private void appendToIndex(String projectId, String filename, String title, String hook) {
        Path indexFile = getIndexFile(projectId);
        String indexLine = String.format("- [%s](%s) — %s", title, filename, hook);

        try {
            String existing = Files.exists(indexFile)
                    ? Files.readString(indexFile, StandardCharsets.UTF_8)
                    : "# Memory\n\n";

            // 追加新行
            String updated = existing.endsWith("\n") ? existing + indexLine + "\n" : existing + "\n" + indexLine + "\n";

            // 容量检查并截断
            updated = truncateIndex(updated);

            Files.writeString(indexFile, updated, StandardCharsets.UTF_8,
                    StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
        } catch (IOException e) {
            throw new RuntimeException("Failed to update MEMORY.md: " + indexFile, e);
        }
    }

    /**
     * 截断索引文件到 maxLineCount 行和 maxFileBytes 字节。
     */
    private String truncateIndex(String content) {
        String truncated = content;

        // 按行数截断
        String[] lines = truncated.split("\n", -1);
        if (lines.length > maxLineCount) {
            truncated = String.join("\n", Arrays.copyOfRange(lines, 0, maxLineCount));
        }

        // 按字节数截断（在最近换行符处切割）
        byte[] bytes = truncated.getBytes(StandardCharsets.UTF_8);
        if (bytes.length > maxFileBytes) {
            truncated = new String(bytes, 0, findLastNewline(bytes, maxFileBytes), StandardCharsets.UTF_8);
            truncated += "\n\n⚠️ MEMORY.md 已达到容量上限，部分旧索引已被截断。";
        }

        return truncated;
    }

    // ========== 工具方法 ==========

    private String buildMemoryFileContent(MemoryType type, String name, String created,
                                         String content, String why, String howToApply) {
        return String.format("""
                ---
                name: %s
                type: %s
                created: %s
                ---

                ## %s

                **Content:**
                %s

                **Why:**
                %s

                **How to apply:**
                %s
                """, name, type.name(), created, name,
                content != null ? content : "",
                why != null ? why : "",
                howToApply != null ? howToApply : "");
    }

    private String generateSlug(String name) {
        // 去除特殊字符，转小写，空格替换为下划线
        return name.toLowerCase()
                .replaceAll("[^a-zA-Z0-9\\u4e00-\\u9fa5]", "_")
                .replaceAll("_+", "_")
                .replaceAll("^_|_$", "")
                .substring(0, Math.min(name.length(), 50));
    }

    private String truncateByLineAndBytes(String content) {
        content = truncateByBytes(content);
        String[] lines = content.split("\n", -1);
        if (lines.length > maxLineCount) {
            content = String.join("\n", Arrays.copyOfRange(lines, 0, maxLineCount));
            content += "\n\n⚠️ MEMORY.md 已达到行数上限，部分内容已截断。";
        }
        return content;
    }

    private String truncateByBytes(String content) {
        byte[] bytes = content.getBytes(StandardCharsets.UTF_8);
        if (bytes.length > maxFileBytes) {
            content = new String(bytes, 0, findLastNewline(bytes, maxFileBytes), StandardCharsets.UTF_8);
        }
        return content;
    }

    private int findLastNewline(byte[] bytes, int maxBytes) {
        int cut = maxBytes;
        for (int i = maxBytes - 1; i >= Math.max(0, maxBytes - 200); i--) {
            if (bytes[i] == '\n') {
                cut = i;
                break;
            }
        }
        return cut;
    }

    private String sanitizeProjectId(String projectId) {
        if (projectId == null) return "default";
        return projectId.replaceAll("[^a-zA-Z0-9_\\-]", "_");
    }

    public String getMemoryBasePath() {
        return memoryBasePath;
    }
}
