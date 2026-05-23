-- Replace the password before running this file against ClickHouse Cloud.
-- The application should use this scoped SQL user instead of the ClickHouse Cloud API key.

CREATE USER IF NOT EXISTS labrador_demo_writer
IDENTIFIED WITH sha256_password BY 'replace-with-generated-password';

GRANT SELECT, INSERT
ON labrador_demo.labrador_demo_usage_events
TO labrador_demo_writer;
