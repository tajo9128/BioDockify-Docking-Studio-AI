# BioDockify AI — Memory

## Project Context
- **Name**: BioDockify Studio AI
- **Tagline**: AI Powered Autonomous Drug Discovery Platform
- **Type**: Free, open-source alternative to BIOVIA Discovery Studio and Schrödinger
- **Version**: v4.3.3
- **Repository**: https://github.com/tajo9128/BioDockify-Studio

## Architecture
- **Frontend**: React + TypeScript + Vite (16 pages, 15 API modules)
- **Backend**: FastAPI monolith (160+ routes) in `backend/main.py`
- **Microservices**: docking-service, md-service, brain-service, pharmacophore-service, qsar-service, sentinel-service, analysis-service, redis-worker, api-backend, gateway (nginx)
- **Database**: SQLite (docking results, jobs, interactions)
- **Deployment**: Docker Compose, single-container, desktop (PyInstaller)

## Key Technical Decisions
- Smart docking routing: ≤-5.0 kcal/mol → Vina only, > -5.0 → GNINA+RF
- Batch docking composite scoring: GNINA 50% + LE 25% + QED 15% + diversity 10%
- SQLite cache with composite primary key for batch docking
- Failed GNINA fallback to 999.0 score
- Diversity calculated before scoring
- 3Dmol.js for 3D visualization (loaded via CDN)
- Ketcher for ChemDraw
- OpenMM for molecular dynamics
- CrewAI for multi-agent orchestration
- NL-to-DAG compiler for natural language workflows

## CrewAI Agents (6 + Orchestrator)
1. Molecular Docking Specialist — tools: run_docking, batch_docking, calculate_properties
2. Computational Chemistry Expert — tools: calculate_properties, smiles_to_3d, convert_format, optimize_molecule
3. Pharmacophore Modeling Expert — tools: generate_pharmacophore, screen_library, fetch_protein
4. ADMET Prediction Specialist — tools: predict_admet, filter_admet, calculate_properties
5. Drug Discovery Analysis Expert — tools: analyze_interactions, rank_ligands, consensus_score, export_top_hits
6. QSAR Modeling Specialist — tools: calculate_properties, predict_admet
7. Drug Discovery Orchestrator — tools: send_notification, export_top_hits, rank_ligands

## i18n
- English, Spanish, Chinese, Arabic
- Config via `frontend/src/i18n/index.ts`

## Accessibility
- High contrast mode
- Reduced motion
- Font size controls
- Via `frontend/src/contexts/AccessibilityContext.tsx`

## Known Issues / TODOs
- Vina Python API PDBQT parsing can be strict — column alignment matters
- GNINA binary must be downloaded separately (not pip-installable)
- Plotly.js bundle is large (~15MB) — consider code splitting
- ketcher-react has peer dependency conflicts (draft-js 0.10 vs 0.11)

## Recent Changes (v4.3.x)
- v4.3.3: Production-grade batch docking — QED descriptors, normalized composite scoring, SQLite cache, failed GNINA fallback
- v4.3.2: Hybrid filter (score≤-7 OR top 20, cap 30), always run full pipeline
- v4.3.1: Smart routing — strong binders exit at Vina, weak proceed to GNINA+RF
- v4.3.0: Ligand Modifier, Batch Docking page, ChemDraw redesign
