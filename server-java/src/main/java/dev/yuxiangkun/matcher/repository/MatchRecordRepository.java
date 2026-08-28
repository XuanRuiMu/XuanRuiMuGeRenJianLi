package dev.yuxiangkun.matcher.repository;

import dev.yuxiangkun.matcher.entity.MatchRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MatchRecordRepository extends JpaRepository<MatchRecord, Long> {

    List<MatchRecord> findTop20ByOrderByCreatedAtDesc();
}
