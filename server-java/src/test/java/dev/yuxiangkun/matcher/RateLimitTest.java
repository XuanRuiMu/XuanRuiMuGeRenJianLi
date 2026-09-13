package dev.yuxiangkun.matcher;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 限流测试：独立 Spring 上下文，阈值调低为 3 次/分钟，
 * 第 4 次请求应返回 429。
 */
@SpringBootTest(properties = "app.rate-limit.requests-per-minute=3")
@AutoConfigureMockMvc
class RateLimitTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void 超过限流阈值应返回429() throws Exception {
        for (int i = 0; i < 3; i++) {
            mockMvc.perform(post("/api/match")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"jdText\": \"限流压测 JD " + i + " Python\"}"))
                    .andExpect(status().isOk());
        }
        mockMvc.perform(post("/api/match")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"jdText\": \"限流压测 JD 超限 Python\"}"))
                .andExpect(status().isTooManyRequests());
    }
}
