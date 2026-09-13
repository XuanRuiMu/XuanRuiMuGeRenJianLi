package dev.yuxiangkun.matcher.controller;

import dev.yuxiangkun.matcher.dto.MatchRequest;
import dev.yuxiangkun.matcher.dto.MatchResponse;
import dev.yuxiangkun.matcher.service.JdMatchService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class MatchController {

    private final JdMatchService matchService;

    public MatchController(JdMatchService matchService) {
        this.matchService = matchService;
    }

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "ok", "service", "resume-matcher");
    }

    @PostMapping("/match")
    public MatchResponse match(@Valid @RequestBody MatchRequest request, HttpServletRequest http) {
        return matchService.match(request, clientKey(http));
    }

    @GetMapping("/match/history")
    public List<MatchResponse> history() {
        return matchService.history();
    }

    @ExceptionHandler(JdMatchService.RateLimitException.class)
    public ResponseEntity<Map<String, String>> onRateLimit(JdMatchService.RateLimitException e) {
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(Map.of("error", e.getMessage()));
    }

    @ExceptionHandler(jakarta.validation.ConstraintViolationException.class)
    public ResponseEntity<Map<String, String>> onValidation(jakarta.validation.ConstraintViolationException e) {
        return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
    }

    /** 取客户端标识用于限流：优先反向代理头，回退远端地址 */
    private static String clientKey(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].strip();
        }
        return request.getRemoteAddr();
    }
}
