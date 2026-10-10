package com.rag.libs.splitter;

import com.rag.config.AppConfig;
import com.rag.core.types.Chunk;
import com.rag.core.types.Document;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Component
public class RecursiveTextSplitter implements TextSplitter {

    private static final Logger log = LoggerFactory.getLogger(RecursiveTextSplitter.class);

    private final int chunkSize;
    private final int chunkOverlap;

    public RecursiveTextSplitter(AppConfig appConfig) {
        this.chunkSize = appConfig.ingestion().chunkSize();
        this.chunkOverlap = appConfig.ingestion().chunkOverlap();
        log.info("RecursiveTextSplitter initialized: chunkSize={}, overlap={}", chunkSize, chunkOverlap);
    }

    public RecursiveTextSplitter(int chunkSize, int chunkOverlap) {
        this.chunkSize = chunkSize;
        this.chunkOverlap = chunkOverlap;
    }

    @Override
    public List<Chunk> split(Document document) {
        List<String> texts = splitText(document.content());
        List<Chunk> chunks = new ArrayList<>();
        int charOffset = 0;
        for (int i = 0; i < texts.size(); i++) {
            String text = texts.get(i);
            int startOffset = charOffset;
            int endOffset = startOffset + text.length();
            Chunk chunk = new Chunk(
                    UUID.randomUUID().toString(),
                    text,
                    i,
                    document.id(),
                    startOffset,
                    endOffset,
                    document.metadata()
            );
            chunks.add(chunk);
            charOffset = endOffset - chunkOverlap;
            if (charOffset < 0) charOffset = 0;
        }
        log.debug("Split document {} into {} chunks", document.id(), chunks.size());
        return chunks;
    }

    @Override
    public List<String> splitText(String text) {
        List<String> chunks = new ArrayList<>();
        int start = 0;
        while (start < text.length()) {
            int end = Math.min(start + chunkSize, text.length());
            if (end < text.length()) {
                int newlineIdx = text.lastIndexOf('\n', end);
                int periodIdx = text.lastIndexOf('.', end);
                int splitIdx = newlineIdx > start ? newlineIdx + 1 : (periodIdx > start ? periodIdx + 1 : end);
                if (splitIdx <= start) splitIdx = end;
                end = splitIdx;
            }
            chunks.add(text.substring(start, end).trim());
            start = end - chunkOverlap;
            if (start <= chunks.isEmpty() ? 0 : chunks.get(chunks.size() - 1).length() - chunkOverlap) {
                start = end;
            }
        }
        return chunks;
    }
}
