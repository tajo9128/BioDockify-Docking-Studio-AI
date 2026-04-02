"""
Classroom Assignment System for BioDockify
6-character assignment codes, auto-grading, instructor dashboard.
"""

import json
import secrets
import string
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

ASSIGNMENTS_FILE = Path("./data/classroom/assignments.json")
SUBMISSIONS_FILE = Path("./data/classroom/submissions.json")


def _ensure_dirs():
    ASSIGNMENTS_FILE.parent.mkdir(parents=True, exist_ok=True)
    SUBMISSIONS_FILE.parent.mkdir(parents=True, exist_ok=True)
    if not ASSIGNMENTS_FILE.exists():
        ASSIGNMENTS_FILE.write_text("{}")
    if not SUBMISSIONS_FILE.exists():
        SUBMISSIONS_FILE.write_text("{}")


def _load_assignments() -> Dict[str, Any]:
    _ensure_dirs()
    return json.loads(ASSIGNMENTS_FILE.read_text())


def _save_assignments(data: Dict[str, Any]):
    ASSIGNMENTS_FILE.write_text(json.dumps(data, indent=2, default=str))


def _load_submissions() -> Dict[str, Any]:
    _ensure_dirs()
    return json.loads(SUBMISSIONS_FILE.read_text())


def _save_submissions(data: Dict[str, Any]):
    SUBMISSIONS_FILE.write_text(json.dumps(data, indent=2, default=str))


def generate_code() -> str:
    """Generate a 6-character alphanumeric assignment code."""
    chars = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(chars) for _ in range(6))


def create_assignment(
    instructor_id: str,
    title: str,
    description: str,
    task_type: str = "docking",
    config: Dict[str, Any] = None,
    max_attempts: int = 3,
    expires_in_hours: int = 168,
    rubric: Dict[str, Any] = None,
) -> Dict[str, Any]:
    """Create a new classroom assignment."""
    code = generate_code()
    assignments = _load_assignments()

    while code in assignments:
        code = generate_code()

    assignment = {
        "code": code,
        "instructor_id": instructor_id,
        "title": title,
        "description": description,
        "task_type": task_type,
        "config": config or {},
        "max_attempts": max_attempts,
        "created_at": datetime.now().isoformat(),
        "expires_at": (datetime.now() + timedelta(hours=expires_in_hours)).isoformat(),
        "rubric": rubric or _default_rubric(task_type),
        "submissions": [],
        "status": "active",
    }

    assignments[code] = assignment
    _save_assignments(assignments)
    return assignment


def join_assignment(student_id: str, code: str) -> Dict[str, Any]:
    """Join an assignment using the 6-character code."""
    assignments = _load_assignments()
    code = code.upper().strip()

    if code not in assignments:
        return {"error": "Invalid assignment code"}

    assignment = assignments[code]

    if datetime.fromisoformat(assignment["expires_at"]) < datetime.now():
        return {"error": "Assignment has expired"}

    if assignment["status"] != "active":
        return {"error": "Assignment is no longer active"}

    return {
        "success": True,
        "assignment": {
            "code": code,
            "title": assignment["title"],
            "description": assignment["description"],
            "task_type": assignment["task_type"],
            "config": assignment["config"],
            "max_attempts": assignment["max_attempts"],
            "expires_at": assignment["expires_at"],
        },
    }


def submit_assignment(
    code: str,
    student_id: str,
    result: Dict[str, Any],
) -> Dict[str, Any]:
    """Submit an assignment result for auto-grading."""
    assignments = _load_assignments()
    submissions = _load_submissions()
    code = code.upper().strip()

    if code not in assignments:
        return {"error": "Invalid assignment code"}

    assignment = assignments[code]
    key = f"{code}_{student_id}"

    if key not in submissions:
        submissions[key] = {"attempts": [], "best_score": 0}

    if len(submissions[key]["attempts"]) >= assignment["max_attempts"]:
        return {"error": f"Max attempts ({assignment['max_attempts']}) reached"}

    grade = auto_grade(result, assignment.get("rubric", {}))
    attempt = {
        "submitted_at": datetime.now().isoformat(),
        "result": result,
        "grade": grade,
    }
    submissions[key]["attempts"].append(attempt)
    submissions[key]["best_score"] = max(submissions[key]["best_score"], grade.get("total_score", 0))

    if code not in assignment.get("submissions", []):
        assignment.setdefault("submissions", []).append(student_id)

    _save_submissions(submissions)
    _save_assignments(assignments)

    return {
        "success": True,
        "attempt": len(submissions[key]["attempts"]),
        "max_attempts": assignment["max_attempts"],
        "grade": grade,
    }


def auto_grade(result: Dict[str, Any], rubric: Dict[str, Any]) -> Dict[str, Any]:
    """Auto-grade a submission based on rubric criteria."""
    scores = {}
    total = 0
    max_total = 0

    criteria = rubric.get("criteria", [
        {"name": "completion", "weight": 30, "description": "Task completed successfully"},
        {"name": "accuracy", "weight": 40, "description": "Results are scientifically accurate"},
        {"name": "analysis", "weight": 30, "description": "Proper analysis and interpretation"},
    ])

    for criterion in criteria:
        name = criterion["name"]
        weight = criterion.get("weight", 10)
        max_total += weight

        score = 0
        if name == "completion":
            if result.get("success") or result.get("status") == "completed":
                score = weight
            elif result.get("partial"):
                score = weight * 0.5
        elif name == "accuracy":
            energy = result.get("energy") or result.get("best_score")
            if energy is not None:
                try:
                    energy = float(energy)
                    if -20 <= energy <= 0:
                        score = weight
                    elif -30 <= energy <= 5:
                        score = weight * 0.7
                    else:
                        score = weight * 0.3
                except (ValueError, TypeError):
                    score = weight * 0.5
            else:
                score = weight * 0.5
        elif name == "analysis":
            if result.get("analysis") or result.get("interpretation"):
                score = weight
            elif result.get("results") and len(result.get("results", [])) > 0:
                score = weight * 0.7
            else:
                score = weight * 0.3

        scores[name] = {"score": round(score, 1), "max": weight}
        total += score

    return {
        "total_score": round(total, 1),
        "max_score": max_total,
        "percentage": round(total / max(max_total, 1) * 100, 1),
        "criteria": scores,
        "grade_letter": _score_to_letter(total / max(max_total, 1)),
    }


def _score_to_letter(pct: float) -> str:
    if pct >= 0.9: return "A"
    if pct >= 0.8: return "B"
    if pct >= 0.7: return "C"
    if pct >= 0.6: return "D"
    return "F"


def _default_rubric(task_type: str) -> Dict[str, Any]:
    rubrics = {
        "docking": {
            "criteria": [
                {"name": "completion", "weight": 25, "description": "Docking completed successfully"},
                {"name": "accuracy", "weight": 40, "description": "Binding energy is reasonable"},
                {"name": "analysis", "weight": 20, "description": "Interaction analysis performed"},
                {"name": "reporting", "weight": 15, "description": "Results properly documented"},
            ]
        },
        "qsar": {
            "criteria": [
                {"name": "completion", "weight": 25, "description": "Model trained successfully"},
                {"name": "accuracy", "weight": 40, "description": "R² > 0.6 on cross-validation"},
                {"name": "analysis", "weight": 20, "description": "Feature importance analyzed"},
                {"name": "reporting", "weight": 15, "description": "Results properly documented"},
            ]
        },
        "chemdraw": {
            "criteria": [
                {"name": "completion", "weight": 30, "description": "Molecule drawn successfully"},
                {"name": "accuracy", "weight": 40, "description": "Structure is chemically valid"},
                {"name": "analysis", "weight": 30, "description": "Properties calculated and interpreted"},
            ]
        },
    }
    return rubrics.get(task_type, rubrics["docking"])


def get_instructor_dashboard(instructor_id: str) -> Dict[str, Any]:
    """Get instructor dashboard with all assignments and student progress."""
    assignments = _load_assignments()
    submissions = _load_submissions()

    instructor_assignments = {
        code: a for code, a in assignments.items()
        if a.get("instructor_id") == instructor_id
    }

    dashboard = {
        "total_assignments": len(instructor_assignments),
        "total_submissions": 0,
        "assignments": [],
    }

    for code, assignment in instructor_assignments.items():
        student_count = len(assignment.get("submissions", []))
        dashboard["total_submissions"] += student_count

        grades = []
        for student_id in assignment.get("submissions", []):
            key = f"{code}_{student_id}"
            if key in submissions:
                grades.append(submissions[key]["best_score"])

        avg_grade = round(sum(grades) / max(len(grades), 1), 1) if grades else 0

        dashboard["assignments"].append({
            "code": code,
            "title": assignment["title"],
            "task_type": assignment["task_type"],
            "students": student_count,
            "avg_grade": avg_grade,
            "expires_at": assignment["expires_at"],
            "status": assignment["status"],
        })

    return dashboard
