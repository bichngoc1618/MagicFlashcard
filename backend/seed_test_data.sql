-- Seed test data: study sessions and quiz sessions
INSERT INTO user_study_sessions (user_id, start_time, end_time, duration, date)
VALUES
  (1, '2026-05-19 08:00:00', '2026-05-19 08:20:00', 20, '2026-05-19'),
  (1, '2026-05-18 10:00:00', '2026-05-18 10:45:00', 45, '2026-05-18'),
  (2, '2026-05-19 09:00:00', '2026-05-19 09:05:00', 5, '2026-05-19');

INSERT INTO quiz_sessions (user_id, material_id, session_type, batch_index, total_questions, correct_answers, score, completed_at)
VALUES
  (1, 5, 'PRACTICE', 0, 10, 8, 80, NOW()),
  (1, 5, 'FINAL_BOSS', -1, 20, 15, 75, NOW());

-- Optionally update user's last_study_date and total_xp for visible profile changes
UPDATE users SET last_study_date = '2026-05-19', total_xp = total_xp + 100 WHERE id = 1;
