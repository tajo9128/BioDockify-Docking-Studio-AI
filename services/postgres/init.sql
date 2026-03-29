-- Docking Studio v2.0 - PostgreSQL Schema
-- Initialize database for job tracking and results

CREATE TABLE IF NOT EXISTS jobs (
    id SERIAL PRIMARY KEY,
    job_uuid VARCHAR(36) UNIQUE NOT NULL,
    job_name VARCHAR(255) NOT NULL,
    job_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    parameters JSONB,
    result JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_jobs_uuid ON jobs(job_uuid);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_type ON jobs(job_type);
CREATE INDEX IF NOT EXISTS idx_jobs_created ON jobs(created_at DESC);

CREATE TABLE IF NOT EXISTS docking_results (
    id SERIAL PRIMARY KEY,
    job_uuid VARCHAR(36) NOT NULL,
    pose_id INTEGER,
    ligand_name VARCHAR(255),
    vina_score FLOAT,
    gnina_score FLOAT,
    rf_score FLOAT,
    consensus_score FLOAT,
    pdb_data TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_uuid) REFERENCES jobs(job_uuid) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_docking_job ON docking_results(job_uuid);
CREATE INDEX IF NOT EXISTS idx_docking_score ON docking_results(vina_score);

CREATE TABLE IF NOT EXISTS pharmacophore_models (
    id SERIAL PRIMARY KEY,
    job_uuid VARCHAR(36) UNIQUE NOT NULL,
    model_name VARCHAR(255),
    features JSONB,
    num_features INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_uuid) REFERENCES jobs(job_uuid) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pharmacophore_job ON pharmacophore_models(job_uuid);

CREATE TABLE IF NOT EXISTS interactions (
    id SERIAL PRIMARY KEY,
    job_uuid VARCHAR(36) NOT NULL,
    pose_id INTEGER,
    interaction_type VARCHAR(50),
    atom_a VARCHAR(100),
    atom_b VARCHAR(100),
    distance FLOAT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_uuid) REFERENCES jobs(job_uuid) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_interactions_job ON interactions(job_uuid);
CREATE INDEX IF NOT EXISTS idx_interactions_type ON interactions(interaction_type);

CREATE TABLE IF NOT EXISTS md_results (
    id SERIAL PRIMARY KEY,
    job_uuid VARCHAR(36) UNIQUE NOT NULL,
    project_name VARCHAR(255),
    n_steps INTEGER,
    sim_time_ns FLOAT,
    temperature_K FLOAT,
    solvent_model VARCHAR(50),
    ionic_strength FLOAT,
    n_frames INTEGER,
    avg_energy_kj_mol FLOAT,
    trajectory_path TEXT,
    final_frame_path TEXT,
    energy_csv_path TEXT,
    analysis_summary JSONB,
    package_path TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_uuid) REFERENCES jobs(job_uuid) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_md_results_job ON md_results(job_uuid);

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO dockuser;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO dockuser;
