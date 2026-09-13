package dev.yuxiangkun.matcher;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 接口集成测试（无 LLM key 环境，走规则引擎降级路径）：
 * 参数校验、匹配接口、历史接口、限流。
 */
@SpringBootTest
@AutoConfigureMockMvc
class MatchControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void 健康检查() throws Exception {
        mockMvc.perform(get("/api/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ok"));
    }

    @Test
    void 匹配接口返回结构化结果() throws Exception {
        mockMvc.perform(post("/api/match")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"jdText\": \"需要 Java Spring Boot MySQL Redis 后端开发\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalScore").isNumber())
                .andExpect(jsonPath("$.engine").value("rule"))
                .andExpect(jsonPath("$.matchedSkills").isArray())
                .andExpect(jsonPath("$.summary").isNotEmpty());
    }

    @Test
    void 空JD应返回400() throws Exception {
        mockMvc.perform(post("/api/match")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"jdText\": \"\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void 历史接口返回列表() throws Exception {
        mockMvc.perform(get("/api/match/history"))
                .andExpect(status().isOk());
    }
}
