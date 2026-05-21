-- Migration: add last_node_completed_date to users
ALTER TABLE users
  ADD COLUMN last_node_completed_date DATE NULL COMMENT 'Date of last completed node (used for streak calculations)';
