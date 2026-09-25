package com.vortex;

import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.lang.NonNull;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class IngestController {

    private static final Logger logger = LoggerFactory.getLogger(IngestController.class);
    private final SimpMessagingTemplate messagingTemplate;
    private final FraudDetectionService fraudDetectionService;
    private final StreamProcessingService streamProcessingService;
    private final TransactionRepository transactionRepository;

    public IngestController(
            SimpMessagingTemplate messagingTemplate,
            FraudDetectionService fraudDetectionService,
            StreamProcessingService streamProcessingService,
            TransactionRepository transactionRepository) {
        this.messagingTemplate = messagingTemplate;
        this.fraudDetectionService = fraudDetectionService;
        this.streamProcessingService = streamProcessingService;
        this.transactionRepository = transactionRepository;
    }

    @PostMapping("/ingest")
    public ResponseEntity<Void> ingest(@RequestBody @NonNull Map<String, Object> rawEvent) {
        Map<String, Object> event = fraudDetectionService.assess(rawEvent);
        logger.info("Received finance event: {}", event);
        TransactionEntity savedTransaction = transactionRepository.save(TransactionEntity.fromEvent(event));
        messagingTemplate.convertAndSend("/topic/transactions", savedTransaction);
        streamProcessingService.accept(event);
        return ResponseEntity.accepted().build();
    }

    @GetMapping("/transactions")
    public List<TransactionEntity> getRecentTransactions() {
        return transactionRepository.findTop50ByOrderByIdDesc();
    }
}
