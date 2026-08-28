package dev.yuxiangkun.matcher.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.util.List;
import java.util.Map;

/**
 * LLM 客户端：DeepSeek Chat API。
 * 无 API key 时 isEnabled() 返回 false，由上层切换到规则引擎。
 */
@Service
public class LlmClient {

    private final RestClient restClient;
    private final String apiKey;
    private final String model;

    public LlmClient(
            @Value("${app.llm.api-key}") String apiKey,
            @Value("${app.llm.base-url}") String baseUrl,
            @Value("${app.llm.model}") String model,
            @Value("${app.llm.timeout-seconds:30}") long timeoutSeconds) {
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.model = model;
        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(new org.springframework.http.client.SimpleClientHttpRequestFactory() {{
                    setConnectTimeout((int) Duration.ofSeconds(5).toMillis());
                    setReadTimeout((int) Duration.ofSeconds(timeoutSeconds).toMillis());
                }})
                .build();
    }

    public boolean isEnabled() {
        return !apiKey.isEmpty();
    }

    /** 调用失败（网络/超时/限流）时抛出 RuntimeException，由上层降级 */
    @SuppressWarnings("unchecked")
    public String chat(String systemPrompt, String userPrompt) {
        Map<String, Object> body = Map.of(
                "model", model,
                "temperature", 0.2,
                "messages", List.of(
                        Map.of("role", "system", "content", systemPrompt),
                        Map.of("role", "user", "content", userPrompt)));
        Map<String, Object> response = restClient.post()
                .uri("/chat/completions")
                .header("Authorization", "Bearer " + apiKey)
                .header("Content-Type", "application/json")
                .body(body)
                .retrieve()
                .body(Map.class);
        List<Map<String, Object>> choices = (List<Map<String, Object>>) response.get("choices");
        if (choices == null || choices.isEmpty()) {
            throw new IllegalStateException("LLM 返回空 choices");
        }
        Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
        return String.valueOf(message.get("content"));
    }
}
