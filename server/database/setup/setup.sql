CREATE TYPE status AS ENUM ('waiting', 'active', 'completed', 'failed');

CREATE TABLE sitespeed_io_test_runs (
    id uuid primary key default gen_random_uuid(),
    location VARCHAR(30) NOT NULL,
    test_type VARCHAR(15) NOT NULL,
    connectivity VARCHAR(12),
    added_date TIMESTAMP NOT NULL,
    run_date TIMESTAMP,
    browser_name VARCHAR(10) NOT NULL,
    url VARCHAR(3000) NOT NULL,
    result_url VARCHAR(2048),
    status status DEFAULT 'waiting',
    scripting_name VARCHAR(1000),
    scripting TEXT, 
    label VARCHAR(100),
    slug VARCHAR(200),
    browsertime_result JSONB,
    har JSON,
    configuration JSONB,
    cli_params TEXT
);

CREATE INDEX url_index ON sitespeed_io_test_runs (url);
CREATE INDEX run_date_index ON sitespeed_io_test_runs (run_date);
CREATE INDEX scripting_name_index ON sitespeed_io_test_runs (scripting_name);
CREATE INDEX label_index ON sitespeed_io_test_runs (label);