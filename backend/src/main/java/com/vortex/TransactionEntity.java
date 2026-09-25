package com.vortex;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

import com.fasterxml.jackson.annotation.JsonProperty;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import com.fasterxml.jackson.annotation.JsonAnyGetter;
import org.springframework.lang.NonNull;

@Entity
@Table(name = "transactions")
public class TransactionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String timestamp;

    @Column(name = "source_account", nullable = false)
    private String sourceAccount;

    @Column(name = "destination_account", nullable = false)
    private String destinationAccount;

    @Column(name = "amount_chf", nullable = false)
    private double amountChf;

    @Column(name = "is_flagged", nullable = false)
    private boolean flagged;

    @Column(name = "alert_reason")
    private String alertReason;

    @Column(nullable = false)
    private boolean fraudulent;

    @Column(nullable = false)
    private double confidence;

    @Transient
    private String transactionId;

    @Transient
    private Map<String, Object> modelFeatures = new LinkedHashMap<>();

    protected TransactionEntity() {
    }

    private TransactionEntity(
            String timestamp,
            String sourceAccount,
            String destinationAccount,
            double amountChf,
            boolean flagged,
            String alertReason,
            boolean fraudulent,
            double confidence) {
        this.timestamp = timestamp;
        this.sourceAccount = sourceAccount;
        this.destinationAccount = destinationAccount;
        this.amountChf = amountChf;
        this.flagged = flagged;
        this.alertReason = alertReason;
        this.fraudulent = fraudulent;
        this.confidence = confidence;
    }

    @NonNull
    public static TransactionEntity fromEvent(Map<String, Object> event) {
        TransactionEntity transaction = new TransactionEntity(
            event.containsKey("timestamp") ? String.valueOf(event.get("timestamp")) : Instant.now().toString(),
            String.valueOf(event.getOrDefault("source_account", "REPLAY")),
            String.valueOf(event.getOrDefault("destination_account", "REPLAY")),
            readAmount(event.containsKey("amount_chf") ? event.get("amount_chf") : event.get("Amount")),
                Boolean.TRUE.equals(event.get("is_flagged")),
                event.get("alert_reason") == null ? null : String.valueOf(event.get("alert_reason")),
                Boolean.TRUE.equals(event.get("fraudulent")),
                readAmount(event.get("confidence")));
        transaction.transactionId = event.get("transaction_id") == null
                ? null
                : String.valueOf(event.get("transaction_id"));
        event.forEach((key, value) -> {
            if (key.matches("V([1-9]|1[0-9]|2[0-8])")) {
                transaction.modelFeatures.put(key, value);
            }
        });
        return transaction;
    }

    private static double readAmount(Object value) {
        return value instanceof Number number ? number.doubleValue() : 0;
    }

    public Long getId() {
        return id;
    }

    public String getTimestamp() {
        return timestamp;
    }

    @JsonProperty("source_account")
    public String getSourceAccount() {
        return sourceAccount;
    }

    @JsonProperty("destination_account")
    public String getDestinationAccount() {
        return destinationAccount;
    }

    @JsonProperty("amount_chf")
    public double getAmountChf() {
        return amountChf;
    }

    @JsonProperty("is_flagged")
    public boolean isFlagged() {
        return flagged;
    }

    @JsonProperty("alert_reason")
    public String getAlertReason() {
        return alertReason;
    }

    public boolean isFraudulent() {
        return fraudulent;
    }

    public double getConfidence() {
        return confidence;
    }

    @JsonProperty("transaction_id")
    public String getTransactionId() {
        return transactionId;
    }

    @JsonAnyGetter
    public Map<String, Object> getModelFeatures() {
        return modelFeatures;
    }
}
