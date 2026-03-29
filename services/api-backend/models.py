"""
SQLAlchemy models mirroring the PostgreSQL schema in init.sql.
"""

from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime

from .db import Base


class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    job_uuid = Column(String(36), unique=True, nullable=False, index=True)
    job_name = Column(String(255), nullable=False)
    job_type = Column(String(50), nullable=False, index=True)
    status = Column(String(50), default="pending", index=True)
    parameters = Column(JSON, nullable=True)
    result = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    docking_results = relationship(
        "DockingResult", back_populates="job", cascade="all, delete-orphan"
    )
    pharmacophore_models = relationship(
        "PharmacophoreModel", back_populates="job", cascade="all, delete-orphan"
    )
    interactions = relationship(
        "Interaction", back_populates="job", cascade="all, delete-orphan"
    )
    md_results = relationship(
        "MDResult", back_populates="job", cascade="all, delete-orphan"
    )


class DockingResult(Base):
    __tablename__ = "docking_results"

    id = Column(Integer, primary_key=True, autoincrement=True)
    job_uuid = Column(
        String(36),
        ForeignKey("jobs.job_uuid", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    pose_id = Column(Integer, nullable=True)
    ligand_name = Column(String(255), nullable=True)
    vina_score = Column(Float, nullable=True, index=True)
    gnina_score = Column(Float, nullable=True)
    rf_score = Column(Float, nullable=True)
    consensus_score = Column(Float, nullable=True)
    pdb_data = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    job = relationship("Job", back_populates="docking_results")


class PharmacophoreModel(Base):
    __tablename__ = "pharmacophore_models"

    id = Column(Integer, primary_key=True, autoincrement=True)
    job_uuid = Column(
        String(36),
        ForeignKey("jobs.job_uuid", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )
    model_name = Column(String(255), nullable=True)
    features = Column(JSON, nullable=True)
    num_features = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    job = relationship("Job", back_populates="pharmacophore_models")


class Interaction(Base):
    __tablename__ = "interactions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    job_uuid = Column(
        String(36),
        ForeignKey("jobs.job_uuid", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    pose_id = Column(Integer, nullable=True)
    interaction_type = Column(String(50), nullable=True, index=True)
    atom_a = Column(String(100), nullable=True)
    atom_b = Column(String(100), nullable=True)
    distance = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    job = relationship("Job", back_populates="interactions")


class MDResult(Base):
    __tablename__ = "md_results"

    id = Column(Integer, primary_key=True, autoincrement=True)
    job_uuid = Column(
        String(36),
        ForeignKey("jobs.job_uuid", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )
    project_name = Column(String(255), nullable=True)
    n_steps = Column(Integer, nullable=True)
    sim_time_ns = Column(Float, nullable=True)
    temperature_K = Column(Float, nullable=True)
    solvent_model = Column(String(50), nullable=True)
    ionic_strength = Column(Float, nullable=True)
    n_frames = Column(Integer, nullable=True)
    avg_energy_kj_mol = Column(Float, nullable=True)
    trajectory_path = Column(Text, nullable=True)
    final_frame_path = Column(Text, nullable=True)
    energy_csv_path = Column(Text, nullable=True)
    analysis_summary = Column(JSON, nullable=True)
    package_path = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    job = relationship("Job", back_populates="md_results")
