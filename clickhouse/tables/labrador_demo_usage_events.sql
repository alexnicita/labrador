CREATE DATABASE IF NOT EXISTS labrador_demo;

CREATE TABLE IF NOT EXISTS labrador_demo.labrador_demo_usage_events
(
  occurred_at DateTime64(3, 'UTC'),
  event_id UUID,
  room_id LowCardinality(String),
  actor_id String,
  run_id Nullable(String),
  action LowCardinality(String),
  provider LowCardinality(String),
  status LowCardinality(String),
  latency_ms UInt32,
  input_chars UInt32,
  output_chars UInt32,
  result_count UInt16,
  vendor_request_id Nullable(String),
  error_code Nullable(String),
  metadata_json String
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(occurred_at)
ORDER BY (room_id, provider, action, occurred_at)
TTL occurred_at + INTERVAL 30 DAY DELETE;
