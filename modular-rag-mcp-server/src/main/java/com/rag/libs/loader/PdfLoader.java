package com.rag.libs.loader;

import com.rag.core.types.Document;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.util.Map;
import java.util.UUID;

@Component
public class PdfLoader implements DocumentLoader {

    private static final Logger log = LoggerFactory.getLogger(PdfLoader.class);

    @Override
    public Document load(InputStream inputStream, String fileName) {
        try (PDDocument document = Loader.loadPDF(inputStream.readAllBytes())) {
            PDFTextStripper stripper = new PDFTextStripper();
            String content = stripper.getText(document);
            int pageCount = document.getNumberOfPages();
            String docId = UUID.randomUUID().toString();
            log.info("Loaded PDF '{}' ({} pages, {} chars)", fileName, pageCount, content.length());
            return new Document(
                    docId,
                    content,
                    "pdf",
                    fileName,
                    Map.of("pageCount", pageCount)
            );
        } catch (Exception e) {
            throw new RuntimeException("Failed to load PDF: " + fileName, e);
        }
    }

    @Override
    public String[] supportedTypes() {
        return new String[]{"application/pdf", "pdf"};
    }

    @Override
    public boolean supports(String fileName) {
        return fileName != null && fileName.toLowerCase().endsWith(".pdf");
    }
}
