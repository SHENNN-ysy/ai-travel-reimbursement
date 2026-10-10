package com.rag.ingestion;

import com.rag.core.types.Document;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Deduplicates documents by SHA-256 hash of their content.
 */
@Component
public class IntegrityChecker {

    private static final Logger log = LoggerFactory.getLogger(IntegrityChecker.class);
    private final Map<String, String> seenHashes = new ConcurrentHashMap<>();

    public String computeHash(Document document) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(document.content().getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 not available", e);
        }
    }

    public boolean isNew(Document document) {
        String hash = computeHash(document);
        if (seenHashes.containsKey(hash)) {
            log.info("Duplicate document detected: {} (hash={})", document.fileName(), hash.substring(0, 8));
            return false;
        }
        seenHashes.put(hash, document.fileName());
        return true;
    }

    public boolean isNewByHash(String hash) {
        return !seenHashes.containsKey(hash);
    }

    public void recordHash(String hash, String fileName) {
        seenHashes.put(hash, fileName);
    }

    public int seenCount() {
        return seenHashes.size();
    }

    public void clear() {
        seenHashes.clear();
    }
}
