"""
QSAR Modeling Backend
Provides molecular descriptors (via RDKit), ML model training, and predictions.
"""
import os
import uuid
import json
import pickle
import logging
import threading
from datetime import datetime
from typing import List, Optional, Dict, Any

import numpy as np

logger = logging.getLogger("qsar")

MODELS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "storage", "qsar_models")
os.makedirs(MODELS_DIR, exist_ok=True)

_training_jobs: Dict[str, Dict] = {}
_jobs_lock = threading.Lock()

# ---------------------------------------------------------------------------
# Descriptor groups and calculation
# ---------------------------------------------------------------------------

DESCRIPTOR_GROUPS = {
    "physicochemical": [
        "MolWt", "ExactMolWt", "HeavyAtomMolWt",
        "MolLogP", "MolMR", "TPSA",
        "NumHDonors", "NumHAcceptors", "NumRotatableBonds",
        "NumAromaticRings", "NumAliphaticRings", "NumSaturatedRings",
        "RingCount", "NumHeteroatoms",
        "FractionCSP3", "HeavyAtomCount",
    ],
    "topological": [
        "BalabanJ", "BertzCT", "Chi0", "Chi1", "Chi2v", "Chi3v", "Chi4v",
        "Kappa1", "Kappa2", "Kappa3",
        "LabuteASA",
    ],
    "electronic": [
        "MaxAbsEStateIndex", "MinAbsEStateIndex",
        "MaxEStateIndex", "MinEStateIndex",
    ],
    "fragment": [
        "fr_Al_COO", "fr_Al_OH", "fr_Ar_N", "fr_Ar_NH", "fr_Ar_OH",
        "fr_C_O", "fr_C_O_noCOO", "fr_NH0", "fr_NH1", "fr_NH2",
        "fr_N_O", "fr_Ndealkylation1", "fr_amide", "fr_aniline",
        "fr_carbonyl", "fr_halogen", "fr_ketone", "fr_methoxy",
        "fr_nitro", "fr_phenol", "fr_sulfide", "fr_sulfonamd",
    ],
}

ALL_DESCRIPTOR_NAMES = [d for grp in DESCRIPTOR_GROUPS.values() for d in grp]


def _safe_descriptor(func, mol, default=0.0):
    try:
        v = func(mol)
        if v is None or (isinstance(v, float) and (np.isnan(v) or np.isinf(v))):
            return default
        return float(v)
    except Exception:
        return default


def calculate_descriptors(smiles_list: List[str], groups: Optional[List[str]] = None) -> Dict:
    try:
        from rdkit import Chem
        from rdkit.Chem import Descriptors, rdMolDescriptors, Crippen, Lipinski
    except ImportError:
        return {"error": "RDKit not available", "descriptors": [], "valid_smiles": [], "failed_smiles": []}

    selected = []
    if not groups or "all" in groups:
        selected = ALL_DESCRIPTOR_NAMES
    else:
        for g in groups:
            selected.extend(DESCRIPTOR_GROUPS.get(g, []))
        if not selected:
            selected = ALL_DESCRIPTOR_NAMES

    desc_map = {name: func for name, func in Descriptors.descList}

    results = []
    valid_smiles = []
    failed_smiles = []

    for smi in smiles_list:
        try:
            mol = Chem.MolFromSmiles(smi)
            if mol is None:
                failed_smiles.append(smi)
                continue
            row = {}
            for dname in selected:
                if dname in desc_map:
                    row[dname] = _safe_descriptor(desc_map[dname], mol)
                else:
                    row[dname] = 0.0
            results.append(row)
            valid_smiles.append(smi)
        except Exception:
            failed_smiles.append(smi)

    return {
        "success": True,
        "descriptors": results,
        "valid_smiles": valid_smiles,
        "failed_smiles": failed_smiles,
        "n_valid": len(valid_smiles),
        "n_failed": len(failed_smiles),
        "feature_names": selected,
    }


def get_descriptor_groups() -> Dict:
    return {
        "groups": ["all"] + list(DESCRIPTOR_GROUPS.keys()),
        "descriptors": {k: v for k, v in DESCRIPTOR_GROUPS.items()},
    }


# ---------------------------------------------------------------------------
# Dataset processing
# ---------------------------------------------------------------------------

def process_dataset_csv(
    content: bytes,
    smiles_col: str = "smiles",
    activity_col: str = "activity",
    groups: Optional[str] = None,
) -> Dict:
    try:
        import io
        import csv

        text = content.decode("utf-8", errors="replace")
        reader = csv.DictReader(io.StringIO(text))
        rows = list(reader)

        if not rows:
            return {"error": "Empty CSV file"}
        if smiles_col not in rows[0]:
            return {"error": f"Column '{smiles_col}' not found. Available: {list(rows[0].keys())}"}
        if activity_col not in rows[0]:
            return {"error": f"Column '{activity_col}' not found. Available: {list(rows[0].keys())}"}

        smiles_list = []
        y_raw = []
        for row in rows:
            smi = row.get(smiles_col, "").strip()
            act = row.get(activity_col, "").strip()
            if smi and act:
                try:
                    y_raw.append(float(act))
                    smiles_list.append(smi)
                except ValueError:
                    continue

        if not smiles_list:
            return {"error": "No valid SMILES/activity pairs found"}

        group_list = groups.split(",") if groups else ["all"]
        desc_result = calculate_descriptors(smiles_list, group_list)

        if "error" in desc_result:
            return desc_result

        valid_idx = [smiles_list.index(s) for s in desc_result["valid_smiles"]]
        y_valid = [y_raw[i] for i in valid_idx]
        feature_names = desc_result["feature_names"]

        X = []
        for row_desc in desc_result["descriptors"]:
            X.append([row_desc.get(f, 0.0) for f in feature_names])

        X_arr = np.array(X, dtype=np.float32)
        # Replace any remaining NaN/inf
        X_arr = np.nan_to_num(X_arr, nan=0.0, posinf=0.0, neginf=0.0)
        y_arr = np.array(y_valid, dtype=np.float32)

        return {
            "X": X_arr.tolist(),
            "y": y_arr.tolist(),
            "feature_names": feature_names,
            "n_compounds": len(y_valid),
            "n_features": len(feature_names),
            "activity_mean": float(np.mean(y_arr)),
            "activity_std": float(np.std(y_arr)),
            "activity_min": float(np.min(y_arr)),
            "activity_max": float(np.max(y_arr)),
            "nan_count": int(np.isnan(X_arr).sum()),
            "failed_smiles": desc_result["failed_smiles"],
            "failed_count": len(desc_result["failed_smiles"]),
        }
    except Exception as e:
        logger.error(f"Dataset processing error: {e}")
        return {"error": str(e)}


# ---------------------------------------------------------------------------
# Model training
# ---------------------------------------------------------------------------

def _get_model(model_type: str, params: Optional[Dict] = None):
    from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
    from sklearn.svm import SVR
    from sklearn.cross_decomposition import PLSRegression
    from sklearn.linear_model import Ridge, Lasso

    p = params or {}
    if model_type == "RandomForest":
        return RandomForestRegressor(n_estimators=p.get("n_estimators", 100), random_state=42, n_jobs=-1)
    elif model_type == "GradientBoosting":
        return GradientBoostingRegressor(n_estimators=p.get("n_estimators", 100), random_state=42)
    elif model_type == "SVR":
        return SVR(kernel=p.get("kernel", "rbf"), C=p.get("C", 1.0))
    elif model_type == "PLS":
        return PLSRegression(n_components=min(p.get("n_components", 5), 10))
    elif model_type == "Ridge":
        return Ridge(alpha=p.get("alpha", 1.0))
    elif model_type == "Lasso":
        return Lasso(alpha=p.get("alpha", 0.1))
    else:
        return RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1)


def _train_worker(job_id: str, X, y, feature_names, model_type, model_name,
                  activity_column, descriptor_groups, cv_folds, model_params):
    try:
        from sklearn.model_selection import cross_val_score
        from sklearn.preprocessing import StandardScaler
        from sklearn.pipeline import Pipeline

        with _jobs_lock:
            _training_jobs[job_id]["status"] = "running"

        X_arr = np.array(X, dtype=np.float64)
        y_arr = np.array(y, dtype=np.float64)

        model = _get_model(model_type, model_params)

        # Use pipeline with scaler for SVR/Ridge/Lasso
        if model_type in ("SVR", "Ridge", "Lasso"):
            pipeline = Pipeline([("scaler", StandardScaler()), ("model", model)])
        else:
            pipeline = model

        # Cross-validation
        cv_scores = cross_val_score(pipeline, X_arr, y_arr, cv=cv_folds,
                                     scoring="r2", n_jobs=-1)
        cv_rmse_scores = np.sqrt(-cross_val_score(pipeline, X_arr, y_arr, cv=cv_folds,
                                                    scoring="neg_mean_squared_error", n_jobs=-1))
        cv_mae_scores = -cross_val_score(pipeline, X_arr, y_arr, cv=cv_folds,
                                          scoring="neg_mean_absolute_error", n_jobs=-1)

        # Final fit on all data
        if hasattr(pipeline, "fit"):
            pipeline.fit(X_arr, y_arr)

        # Train R² 
        y_pred_train = pipeline.predict(X_arr)
        if hasattr(y_pred_train, "ravel"):
            y_pred_train = y_pred_train.ravel()
        ss_res = np.sum((y_arr - y_pred_train) ** 2)
        ss_tot = np.sum((y_arr - np.mean(y_arr)) ** 2)
        train_r2 = 1 - ss_res / ss_tot if ss_tot > 0 else 0.0

        # Scatter plot data (for Plotly)
        scatter_plot = {
            "data": [{
                "x": y_arr.tolist(),
                "y": y_pred_train.tolist(),
                "mode": "markers",
                "type": "scatter",
                "name": "Predicted vs Actual",
                "marker": {"color": "#00bcd4", "size": 6, "opacity": 0.7},
            }, {
                "x": [float(np.min(y_arr)), float(np.max(y_arr))],
                "y": [float(np.min(y_arr)), float(np.max(y_arr))],
                "mode": "lines",
                "type": "scatter",
                "name": "Ideal",
                "line": {"color": "#ff6b6b", "dash": "dash"},
            }],
            "layout": {
                "title": "Predicted vs Actual",
                "xaxis": {"title": "Actual"},
                "yaxis": {"title": "Predicted"},
                "showlegend": True,
            },
        }

        model_id = str(uuid.uuid4())[:8]
        result = {
            "model_id": model_id,
            "model_name": model_name,
            "model_type": model_type,
            "metrics": {
                "cv_r2": float(np.mean(cv_scores)),
                "cv_rmse": float(np.mean(cv_rmse_scores)),
                "cv_mae": float(np.mean(cv_mae_scores)),
                "train_r2": float(train_r2),
                "cv_std": float(np.std(cv_scores)),
            },
            "cv_scores": cv_scores.tolist(),
            "cv_folds": cv_folds,
            "n_compounds": len(y_arr),
            "n_features": len(feature_names),
            "scatter_plot": scatter_plot,
            "created_at": datetime.now().isoformat(),
        }

        # Save model artifact
        model_path = os.path.join(MODELS_DIR, f"{model_id}.pkl")
        meta_path = os.path.join(MODELS_DIR, f"{model_id}.json")

        with open(model_path, "wb") as f:
            pickle.dump(pipeline, f)

        # Save ad (applicability domain) training data for leverage
        X_mean = np.mean(X_arr, axis=0)
        X_centered = X_arr - X_mean
        try:
            XtX_inv = np.linalg.pinv(X_centered.T @ X_centered)
        except Exception:
            XtX_inv = None

        meta = {
            "model_id": model_id,
            "name": model_name,
            "model_type": model_type,
            "feature_names": feature_names,
            "n_features": len(feature_names),
            "metrics": result["metrics"],
            "activity_column": activity_column,
            "descriptor_groups": descriptor_groups,
            "created_at": result["created_at"],
            "ad_h_star": float(3 * len(feature_names) / len(y_arr)),  # warning threshold
            "ad_x_mean": X_mean.tolist(),
            "ad_xtx_inv": XtX_inv.tolist() if XtX_inv is not None else None,
        }
        with open(meta_path, "w") as f:
            json.dump(meta, f)

        with _jobs_lock:
            _training_jobs[job_id]["status"] = "completed"
            _training_jobs[job_id]["result"] = result
            _training_jobs[job_id]["updated_at"] = datetime.now().isoformat()

        logger.info(f"Training completed: model={model_id}, cv_r2={result['metrics']['cv_r2']:.4f}")

    except Exception as e:
        logger.error(f"Training failed: {e}")
        with _jobs_lock:
            _training_jobs[job_id]["status"] = "failed"
            _training_jobs[job_id]["error"] = str(e)
            _training_jobs[job_id]["updated_at"] = datetime.now().isoformat()


def start_training_job(X, y, feature_names, model_type, model_name,
                       activity_column, descriptor_groups, cv_folds, model_params) -> str:
    job_id = str(uuid.uuid4())[:12]
    with _jobs_lock:
        _training_jobs[job_id] = {
            "status": "pending",
            "updated_at": datetime.now().isoformat(),
        }
    t = threading.Thread(
        target=_train_worker,
        args=(job_id, X, y, feature_names, model_type, model_name,
              activity_column, descriptor_groups, cv_folds, model_params),
        daemon=True,
    )
    t.start()
    return job_id


def get_training_status(job_id: str) -> Dict:
    with _jobs_lock:
        return dict(_training_jobs.get(job_id, {"status": "not_found"}))


# ---------------------------------------------------------------------------
# Prediction
# ---------------------------------------------------------------------------

def _leverage(x_vec, x_mean, xtx_inv):
    try:
        diff = np.array(x_vec, dtype=np.float64) - np.array(x_mean, dtype=np.float64)
        h = float(diff @ np.array(xtx_inv, dtype=np.float64) @ diff)
        return h
    except Exception:
        return None


def predict_single(model_id: str, smiles: str) -> Dict:
    model_path = os.path.join(MODELS_DIR, f"{model_id}.pkl")
    meta_path = os.path.join(MODELS_DIR, f"{model_id}.json")

    if not os.path.exists(model_path):
        return {"error": f"Model {model_id} not found"}

    try:
        with open(model_path, "rb") as f:
            model = pickle.load(f)
        with open(meta_path, "r") as f:
            meta = json.load(f)

        desc = calculate_descriptors([smiles], meta.get("descriptor_groups", ["all"]))
        if not desc.get("valid_smiles"):
            return {"error": "Invalid SMILES or descriptor calculation failed", "success": False}

        feature_names = meta["feature_names"]
        row = desc["descriptors"][0]
        x_vec = np.array([[row.get(f, 0.0) for f in feature_names]], dtype=np.float64)

        y_pred = model.predict(x_vec)
        if hasattr(y_pred, "ravel"):
            y_pred = y_pred.ravel()
        predicted = float(y_pred[0])

        h = None
        ad_status = "unknown"
        h_star = meta.get("ad_h_star")
        x_mean = meta.get("ad_x_mean")
        xtx_inv = meta.get("ad_xtx_inv")

        if h_star and x_mean and xtx_inv:
            h = _leverage(x_vec[0], x_mean, xtx_inv)
            if h is not None:
                if h <= h_star * 0.5:
                    ad_status = "in_domain"
                elif h <= h_star:
                    ad_status = "warning"
                else:
                    ad_status = "out_of_domain"

        return {
            "success": True,
            "smiles": smiles,
            "predicted_activity": predicted,
            "ad_status": ad_status,
            "ad_leverage": h,
            "ad_warning_threshold": h_star,
            "ad_danger_threshold": h_star * 2 if h_star else None,
        }
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        return {"error": str(e), "success": False}


def predict_batch(model_id: str, smiles_list: List[str]) -> Dict:
    model_path = os.path.join(MODELS_DIR, f"{model_id}.pkl")
    meta_path = os.path.join(MODELS_DIR, f"{model_id}.json")

    if not os.path.exists(model_path):
        return {"error": f"Model {model_id} not found"}

    try:
        with open(model_path, "rb") as f:
            model = pickle.load(f)
        with open(meta_path, "r") as f:
            meta = json.load(f)

        feature_names = meta["feature_names"]
        h_star = meta.get("ad_h_star")
        x_mean = meta.get("ad_x_mean")
        xtx_inv = meta.get("ad_xtx_inv")

        predictions = []
        n_in_domain = n_warning = n_out_of_domain = n_failed = 0

        for smi in smiles_list:
            desc = calculate_descriptors([smi], meta.get("descriptor_groups", ["all"]))
            if not desc.get("valid_smiles"):
                predictions.append({"smiles": smi, "predicted_activity": None,
                                     "ad_status": "unknown", "error": "Invalid SMILES"})
                n_failed += 1
                continue

            row = desc["descriptors"][0]
            x_vec = np.array([[row.get(f, 0.0) for f in feature_names]], dtype=np.float64)

            try:
                y_pred = model.predict(x_vec)
                if hasattr(y_pred, "ravel"):
                    y_pred = y_pred.ravel()
                predicted = float(y_pred[0])

                ad_status = "unknown"
                h = None
                if h_star and x_mean and xtx_inv:
                    h = _leverage(x_vec[0], x_mean, xtx_inv)
                    if h is not None:
                        if h <= h_star * 0.5:
                            ad_status = "in_domain"
                            n_in_domain += 1
                        elif h <= h_star:
                            ad_status = "warning"
                            n_warning += 1
                        else:
                            ad_status = "out_of_domain"
                            n_out_of_domain += 1

                predictions.append({"smiles": smi, "predicted_activity": predicted,
                                     "ad_status": ad_status, "ad_leverage": h})
            except Exception as e:
                predictions.append({"smiles": smi, "predicted_activity": None,
                                     "ad_status": "unknown", "error": str(e)})
                n_failed += 1

        return {
            "success": True,
            "predictions": predictions,
            "n_total": len(smiles_list),
            "n_failed": n_failed,
            "n_in_domain": n_in_domain,
            "n_warning": n_warning,
            "n_out_of_domain": n_out_of_domain,
        }
    except Exception as e:
        logger.error(f"Batch prediction error: {e}")
        return {"error": str(e), "success": False}


# ---------------------------------------------------------------------------
# Model management
# ---------------------------------------------------------------------------

def list_models() -> List[Dict]:
    models = []
    for fname in os.listdir(MODELS_DIR):
        if fname.endswith(".json"):
            try:
                with open(os.path.join(MODELS_DIR, fname), "r") as f:
                    meta = json.load(f)
                # Return safe subset (exclude large arrays)
                models.append({
                    "model_id": meta["model_id"],
                    "name": meta["name"],
                    "model_type": meta["model_type"],
                    "feature_names": meta["feature_names"][:10],
                    "n_features": meta["n_features"],
                    "metrics": meta["metrics"],
                    "activity_column": meta.get("activity_column", "activity"),
                    "descriptor_groups": meta.get("descriptor_groups", []),
                    "created_at": meta["created_at"],
                })
            except Exception:
                continue
    return sorted(models, key=lambda m: m["created_at"], reverse=True)


def get_model(model_id: str) -> Optional[Dict]:
    meta_path = os.path.join(MODELS_DIR, f"{model_id}.json")
    if not os.path.exists(meta_path):
        return None
    with open(meta_path, "r") as f:
        meta = json.load(f)
    return {
        "model_id": meta["model_id"],
        "name": meta["name"],
        "model_type": meta["model_type"],
        "feature_names": meta["feature_names"],
        "n_features": meta["n_features"],
        "metrics": meta["metrics"],
        "activity_column": meta.get("activity_column", "activity"),
        "descriptor_groups": meta.get("descriptor_groups", []),
        "created_at": meta["created_at"],
    }


def delete_model(model_id: str) -> bool:
    model_path = os.path.join(MODELS_DIR, f"{model_id}.pkl")
    meta_path = os.path.join(MODELS_DIR, f"{model_id}.json")
    deleted = False
    for p in [model_path, meta_path]:
        if os.path.exists(p):
            os.remove(p)
            deleted = True
    return deleted
