package com.vortex;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.lang.NonNull;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class FraudDetectionService {

    private static final Logger logger = LoggerFactory.getLogger(FraudDetectionService.class);

    @NonNull
    public Map<String, Object> assess(@NonNull Map<String, Object> rawEvent) {
        Map<String, Object> assessedEvent = new LinkedHashMap<>(rawEvent);
        RestTemplate restTemplate = new RestTemplate();
        boolean isFraud = false;
        double confidence = 0.0;

        try {
            Map<?, ?> response = restTemplate.postForObject(
                    "http://ml-service:5000/predict",
                    rawEvent,
                    Map.class);
            isFraud = response != null && Boolean.TRUE.equals(response.get("is_fraud"));
            if (response != null && response.get("confidence") instanceof Number number) {
                confidence = number.doubleValue();
            }
        } catch (RestClientException exception) {
            logger.error("ML service unavailable; allowing event through as non-fraudulent", exception);
        }

        assessedEvent.put("fraudulent", isFraud);
        assessedEvent.put("confidence", confidence);
        assessedEvent.remove("fraudReason");
        if (isFraud) {
            assessedEvent.put("fraudReason", "ML Model Anomaly Detected");
        }

        return assessedEvent;
    }
}
