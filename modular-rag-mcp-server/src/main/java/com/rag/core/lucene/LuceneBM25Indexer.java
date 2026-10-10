package com.rag.core.lucene;

import com.rag.core.types.Chunk;
import org.apache.lucene.analysis.Analyzer;
import org.apache.lucene.analysis.TokenStream;
import org.apache.lucene.analysis.standard.StandardAnalyzer;
import org.apache.lucene.document.Document;
import org.apache.lucene.document.Field;
import org.apache.lucene.document.TextField;
import org.apache.lucene.index.*;
import org.apache.lucene.queryparser.classic.QueryParser;
import org.apache.lucene.search.*;
import org.apache.lucene.search.similarities.BM25Similarity;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;

/**
 * BM25 indexer backed by Lucene. Handles indexing chunks and querying for sparse retrieval.
 */
public class LuceneBM25Indexer implements AutoCloseable {

    private static final Logger log = LoggerFactory.getLogger(LuceneBM25Indexer.class);
    private static final String FIELD_ID = "id";
    private static final String FIELD_CONTENT = "content";

    private final Path indexPath;
    private final Analyzer analyzer;
    private final IndexWriter writer;

    public LuceneBM25Indexer(String indexDir, Analyzer analyzer) {
        try {
            this.indexPath = Path.of(indexDir);
            this.analyzer = analyzer;
            Files.createDirectories(indexPath);
            IndexWriterConfig config = new IndexWriterConfig(analyzer);
            config.setSimilarity(new BM25Similarity());
            config.setOpenMode(IndexWriterConfig.OpenMode.CREATE_OR_APPEND);
            this.writer = new IndexWriter(FSDirectory.open(indexPath), config);
            log.info("Lucene BM25 index initialized at {}", indexPath);
        } catch (IOException e) {
            throw new RuntimeException("Failed to initialize Lucene index", e);
        }
    }

    public void indexChunk(Chunk chunk) {
        try {
            org.apache.lucene.document.Document doc = new org.apache.lucene.document.Document();
            doc.add(new TextField(FIELD_ID, chunk.id(), Field.Store.YES));
            doc.add(new TextField(FIELD_CONTENT, chunk.content(), Field.Store.YES));
            writer.updateDocument(new Term(FIELD_ID, chunk.id()), doc);
            log.debug("Indexed chunk: {}", chunk.id());
        } catch (IOException e) {
            throw new RuntimeException("Failed to index chunk: " + chunk.id(), e);
        }
    }

    public void indexChunks(List<Chunk> chunks) {
        try {
            writer.deleteAll();
            for (Chunk chunk : chunks) {
                org.apache.lucene.document.Document doc = new org.apache.lucene.document.Document();
                doc.add(new TextField(FIELD_ID, chunk.id(), Field.Store.YES));
                doc.add(new TextField(FIELD_CONTENT, chunk.content(), Field.Store.YES));
                writer.addDocument(doc);
            }
            writer.commit();
            log.info("Indexed {} chunks", chunks.size());
        } catch (IOException e) {
            throw new RuntimeException("Failed to index chunks", e);
        }
    }

    public void deleteChunk(String chunkId) {
        try {
            writer.deleteDocuments(new Term(FIELD_ID, chunkId));
            log.debug("Deleted chunk from BM25 index: {}", chunkId);
        } catch (IOException e) {
            throw new RuntimeException("Failed to delete chunk: " + chunkId, e);
        }
    }

    public List<BM25SearchResult> search(String queryText, int topK) {
        try (IndexReader reader = DirectoryReader.open(writer)) {
            IndexSearcher searcher = new IndexSearcher(reader);
            searcher.setSimilarity(new BM25Similarity());

            QueryParser parser = new QueryParser(FIELD_CONTENT, analyzer);
            Query query = parser.parse(QueryParser.escape(queryText));
            TopDocs topDocs = searcher.search(query, topK);

            List<BM25SearchResult> results = new ArrayList<>();
            for (ScoreDoc sd : topDocs.scoreDocs) {
                String docId = searcher.doc(sd.doc).getField(FIELD_ID).stringValue();
                results.add(new BM25SearchResult(docId, sd.score, sd.rank + 1));
            }
            return results;
        } catch (Exception e) {
            throw new RuntimeException("BM25 search failed", e);
        }
    }

    public void commit() {
        try {
            writer.commit();
        } catch (IOException e) {
            throw new RuntimeException("Failed to commit Lucene index", e);
        }
    }

    @Override
    public void close() throws IOException {
        writer.close();
        log.info("Lucene BM25 index closed");
    }

    public record BM25SearchResult(String chunkId, double score, int rank) {}
}
