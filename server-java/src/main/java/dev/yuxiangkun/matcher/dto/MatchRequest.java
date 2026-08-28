package dev.yuxiangkun.matcher.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * 匹配请求：粘贴一段 JD 原文。
 */
public record MatchRequest(

        @NotBlank(message = "JD 内容不能为空")
        @Size(max = 8000, message = "JD 内容过长，请控制在 8000 字以内")
        String jdText
) {}
