package com.vortex;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentLinkedQueue;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
public class StreamProcessingService {

    private static final long WINDOW_SECONDS = 60;

    private final ConcurrentLinkedQueue<TransactionRecord> transactions = new ConcurrentLinkedQueue<>();
    private final SimpMessagingTemplate messagingTemplate;

    public StreamProcessingService(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    public void accept(Map<String, Object> event) {
        double amount = readAmount(event.get("amount_chf"));
        boolean flagged = Boolean.TRUE.equals(event.get("is_flagged"));
        transactions.add(new TransactionRecord(Instant.now(), amount, flagged));
    }

    @Scheduled(fixedRate = 1000)
    public void publishMetrics() {
        Instant cutoff = Instant.now().minus(WINDOW_SECONDS, ChronoUnit.SECONDS);
        removeExpired(cutoff);

        double totalAmount = 0;
        long flaggedCount = 0;

        for (TransactionRecord transaction : transactions) {
            totalAmount += transaction.amount();
            if (transaction.flagged()) {
                flaggedCount++;
            }
        }

        Map<String, Object> metrics = new LinkedHashMap<>();
        metrics.put("timestamp", Instant.now().toString());
        metrics.put("window_seconds", WINDOW_SECONDS);
        metrics.put("transaction_count", transactions.size());
        metrics.put("total_amount_chf", totalAmount);
        metrics.put("flagged_count", flaggedCount);

        messagingTemplate.convertAndSend("/topic/metrics", metrics);
    }

    private void removeExpired(Instant cutoff) {
        TransactionRecord transaction;
        while ((transaction = transactions.peek()) != null && transaction.receivedAt().isBefore(cutoff)) {
            transactions.poll();
        }
    }

    private double readAmount(Object value) {
        return value instanceof Number number ? number.doubleValue() : 0;
    }

    private record TransactionRecord(Instant receivedAt, double amount, boolean flagged) {
    }
}
