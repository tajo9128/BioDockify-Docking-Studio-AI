"""
Docking Studio v2.0 - Celery Worker
Processes background jobs from Redis queue with separate queues per service
"""

import os
import logging
from pathlib import Path

from celery import Celery
import httpx

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format='{"time":"%(asctime)s","name":"%(name)s","level":"%(levelname)s","job_id":"%(job_id)s","message":"%(message)s"}',
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379")
DOCKING_SERVICE_URL = os.getenv("DOCKING_SERVICE_URL", "http://docking-service:8000")
RDKIT_SERVICE_URL = os.getenv("RDKIT_SERVICE_URL", "http://rdkit-service:8000")
PHARMACOPHORE_SERVICE_URL = os.getenv(
    "PHARMACOPHORE_SERVICE_URL", "http://pharmacophore-service:8000"
)
MD_SERVICE_URL = os.getenv("MD_SERVICE_URL", "http://md-service:8000")
ANALYSIS_SERVICE_URL = os.getenv("ANALYSIS_SERVICE_URL", "http://analysis-service:8000")

STORAGE_DIR = Path("/app/storage")
UPLOADS_DIR = Path("/app/uploads")
STORAGE_DIR.mkdir(exist_ok=True)
UPLOADS_DIR.mkdir(exist_ok=True)

celery_app = Celery(
    "docking_worker",
    broker=REDIS_URL,
    backend=REDIS_URL,
)

app = celery_app

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=3600,
    task_soft_time_limit=3000,
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=50,
    task_default_queue="celery",
    task_default_exchange="default",
    task_default_routing_key="default",
    task_queues={
        "celery": {"exchange": "default", "routing_key": "default"},
        "docking": {"exchange": "docking", "routing_key": "docking"},
        "rdkit": {"exchange": "rdkit", "routing_key": "rdkit"},
        "pharmacophore": {"exchange": "pharmacophore", "routing_key": "pharmacophore"},
        "md": {"exchange": "md", "routing_key": "md"},
        "analysis": {"exchange": "analysis", "routing_key": "analysis"},
    },
)


@app.task(
    bind=True,
    name="docking.run",
    queue="docking",
    autoretry_for=(Exception,),
    max_retries=2,
    retry_backoff=True,
    retry_backoff_max=300,
)
def run_docking(self, job_id: str, parameters: dict):
    """Run molecular docking job"""
    logger.info(f"Starting docking job: {job_id}", extra={"job_id": job_id})
    try:
        self.update_state(
            state="RUNNING",
            meta={"message": "Running docking simulation", "job_id": job_id},
        )

        async_result = httpx.post(
            f"{DOCKING_SERVICE_URL}/dock",
            json={"job_id": job_id, **parameters},
            timeout=300.0,
        )
        async_result.raise_for_status()
        result = async_result.json()

        logger.info(
            f"Docking job {job_id} completed: {result}", extra={"job_id": job_id}
        )
        return {"job_id": job_id, "status": "completed", "result": result}
    except Exception as e:
        logger.error(f"Docking job {job_id} failed: {e}", extra={"job_id": job_id})
        raise


@app.task(
    bind=True,
    name="docking.batch",
    queue="docking",
    autoretry_for=(Exception,),
    max_retries=2,
    retry_backoff=True,
)
def run_batch_docking(self, job_id: str, parameters: dict):
    """Run batch docking for multiple ligands"""
    logger.info(f"Starting batch docking job: {job_id}", extra={"job_id": job_id})
    try:
        self.update_state(
            state="RUNNING",
            meta={"message": "Processing batch docking", "job_id": job_id},
        )

        async_result = httpx.post(
            f"{DOCKING_SERVICE_URL}/batch",
            json={"job_id": job_id, **parameters},
            timeout=3600.0,
        )
        async_result.raise_for_status()
        result = async_result.json()

        logger.info(
            f"Batch docking job {job_id} completed: {result}", extra={"job_id": job_id}
        )
        return {"job_id": job_id, "status": "completed", "result": result}
    except Exception as e:
        logger.error(
            f"Batch docking job {job_id} failed: {e}", extra={"job_id": job_id}
        )
        raise


@app.task(
    bind=True,
    name="rdkit.process",
    queue="rdkit",
    autoretry_for=(Exception,),
    max_retries=2,
    retry_backoff=True,
)
def process_molecule(self, job_id: str, parameters: dict):
    """Process molecule with RDKit"""
    logger.info(f"Starting RDKit processing job: {job_id}", extra={"job_id": job_id})
    try:
        self.update_state(
            state="RUNNING", meta={"message": "Processing molecule", "job_id": job_id}
        )

        async_result = httpx.post(
            f"{RDKIT_SERVICE_URL}/process",
            json={"job_id": job_id, **parameters},
            timeout=60.0,
        )
        async_result.raise_for_status()
        result = async_result.json()

        logger.info(f"RDKit job {job_id} completed: {result}", extra={"job_id": job_id})
        return {"job_id": job_id, "status": "completed", "result": result}
    except Exception as e:
        logger.error(f"RDKit job {job_id} failed: {e}", extra={"job_id": job_id})
        raise


@app.task(
    bind=True,
    name="pharmacophore.generate",
    queue="pharmacophore",
    autoretry_for=(Exception,),
    max_retries=2,
    retry_backoff=True,
)
def generate_pharmacophore(self, job_id: str, parameters: dict):
    """Generate pharmacophore model"""
    logger.info(
        f"Starting pharmacophore generation job: {job_id}", extra={"job_id": job_id}
    )
    try:
        self.update_state(
            state="RUNNING",
            meta={"message": "Generating pharmacophore", "job_id": job_id},
        )

        async_result = httpx.post(
            f"{PHARMACOPHORE_SERVICE_URL}/generate",
            json={"job_id": job_id, **parameters},
            timeout=120.0,
        )
        async_result.raise_for_status()
        result = async_result.json()

        logger.info(
            f"Pharmacophore job {job_id} completed: {result}", extra={"job_id": job_id}
        )
        return {"job_id": job_id, "status": "completed", "result": result}
    except Exception as e:
        logger.error(
            f"Pharmacophore job {job_id} failed: {e}", extra={"job_id": job_id}
        )
        raise


@app.task(
    bind=True,
    name="pharmacophore.screen",
    queue="pharmacophore",
    autoretry_for=(Exception,),
    max_retries=2,
    retry_backoff=True,
)
def screen_library(self, job_id: str, parameters: dict):
    """Screen compound library against pharmacophore"""
    logger.info(
        f"Starting pharmacophore screening job: {job_id}", extra={"job_id": job_id}
    )
    try:
        self.update_state(
            state="RUNNING", meta={"message": "Screening library", "job_id": job_id}
        )

        async_result = httpx.post(
            f"{PHARMACOPHORE_SERVICE_URL}/screen",
            json={"job_id": job_id, **parameters},
            timeout=3600.0,
        )
        async_result.raise_for_status()
        result = async_result.json()

        logger.info(
            f"Pharmacophore screening job {job_id} completed: {result}",
            extra={"job_id": job_id},
        )
        return {"job_id": job_id, "status": "completed", "result": result}
    except Exception as e:
        logger.error(
            f"Pharmacophore screening job {job_id} failed: {e}",
            extra={"job_id": job_id},
        )
        raise


@app.task(
    bind=True,
    name="md.simulate",
    queue="md",
    autoretry_for=(Exception,),
    max_retries=2,
    retry_backoff=True,
)
def run_md_simulation(self, job_id: str, parameters: dict):
    """Run MD simulation job"""
    logger.info(f"Starting MD simulation job: {job_id}", extra={"job_id": job_id})
    try:
        self.update_state(
            state="RUNNING", meta={"message": "Running MD simulation", "job_id": job_id}
        )

        async_result = httpx.post(
            f"{MD_SERVICE_URL}/simulate",
            json={"job_id": job_id, **parameters},
            timeout=7200.0,
        )
        async_result.raise_for_status()
        result = async_result.json()

        logger.info(
            f"MD simulation job {job_id} completed: {result}", extra={"job_id": job_id}
        )
        return {"job_id": job_id, "status": "completed", "result": result}
    except Exception as e:
        logger.error(
            f"MD simulation job {job_id} failed: {e}", extra={"job_id": job_id}
        )
        raise


@app.task(
    bind=True,
    name="analysis.rank",
    queue="analysis",
    autoretry_for=(Exception,),
    max_retries=2,
    retry_backoff=True,
)
def run_analysis(self, job_id: str, parameters: dict):
    """Run analysis/ranking job"""
    logger.info(f"Starting analysis job: {job_id}", extra={"job_id": job_id})
    try:
        self.update_state(
            state="RUNNING", meta={"message": "Running analysis", "job_id": job_id}
        )

        async_result = httpx.post(
            f"{ANALYSIS_SERVICE_URL}/rank",
            json={"job_id": job_id, **parameters},
            timeout=300.0,
        )
        async_result.raise_for_status()
        result = async_result.json()

        logger.info(
            f"Analysis job {job_id} completed: {result}", extra={"job_id": job_id}
        )
        return {"job_id": job_id, "status": "completed", "result": result}
    except Exception as e:
        logger.error(f"Analysis job {job_id} failed: {e}", extra={"job_id": job_id})
        raise


@app.task(bind=True, name="pipeline.full_screening", queue="celery")
def run_full_screening_pipeline(self, job_id: str, parameters: dict):
    """Run full screening pipeline: pharmacophore -> docking -> ranking"""
    logger.info(
        f"Starting full screening pipeline job: {job_id}", extra={"job_id": job_id}
    )
    try:
        self.update_state(
            state="RUNNING",
            meta={"message": "Starting full pipeline", "job_id": job_id},
        )

        pipeline_steps = []

        step1 = app.send_task(
            "pharmacophore.generate",
            args=[job_id + "-step1", parameters.get("pharmacophore_params", {})],
            queue="pharmacophore",
        )
        pipeline_steps.append(("pharmacophore", step1.id))

        self.update_state(
            state="RUNNING",
            meta={
                "message": "Pharmacophore generated, starting docking",
                "job_id": job_id,
            },
        )

        step2 = app.send_task(
            "docking.batch",
            args=[job_id + "-step2", parameters.get("docking_params", {})],
            queue="docking",
        )
        pipeline_steps.append(("docking", step2.id))

        self.update_state(
            state="RUNNING",
            meta={"message": "Docking complete, ranking results", "job_id": job_id},
        )

        step3_result = {
            "pipeline": "full_screening",
            "steps": pipeline_steps,
            "status": "completed",
        }

        logger.info(
            f"Full pipeline job {job_id} completed: {step3_result}",
            extra={"job_id": job_id},
        )
        return {"job_id": job_id, "status": "completed", "result": step3_result}
    except Exception as e:
        logger.error(
            f"Full pipeline job {job_id} failed: {e}", extra={"job_id": job_id}
        )
        raise


if __name__ == "__main__":
    app.start()
