# BioDockify Studio v4.2.6
## Complete Product Manual + Developer Reference + Scientific Guide

**Version:** 4.2.6 | **Date:** April 2026 | **License:** MIT  
**For:** Students, PhD Scholars, Researchers, Developers

---

# TABLE OF CONTENTS

- [Section 1: Introduction](#section-1-introduction)
- [Section 2: Getting Started](#section-2-getting-started)
- [Section 3: Ligand Designer](#section-3-ligand-designer-module)
- [Section 4: Protein Preparation](#section-4-protein-preparation)
- [Section 5: Docking Engine](#section-5-docking-engine-core)
- [Section 6: Results & Visualization](#section-6-results--visualization)
- [Section 7: Intelligence Panel](#section-7-intelligence-panel)
- [Section 8: Advanced Features](#section-8-advanced-features)
- [Section 9: AI & Optimization](#section-9-ai--optimization)
- [Section 10: Developer Documentation](#section-10-developer-documentation)
- [Section 11: Deployment Guide](#section-11-deployment-guide)
- [Section 12: File Formats](#section-12-file-formats--standards)
- [Section 13: Validation & Limitations](#section-13-validation--limitations)
- [Section 14: Troubleshooting](#section-14-troubleshooting)
- [Section 15: Roadmap](#section-15-roadmap)

---

# SECTION 1: INTRODUCTION

## 1.1 What is BioDockify?

BioDockify Studio is a unified, open-source platform for molecular docking, ligand design, and computational drug discovery. It integrates 2D molecule drawing (Ketcher), molecular docking (AutoDock Vina + GNINA), molecular dynamics (OpenMM), and medicinal chemistry analysis into a single web-based interface.

### Key Capabilities

| Capability | Description |
|------------|-------------|
| **Ligand Design** | 2D/3D molecule drawing with 60+ templates |
| **Molecular Docking** | AutoDock Vina + GNINA CNN scoring |
| **MD Simulation** | OpenMM-based molecular dynamics |
| **Medicinal Chemistry** | Real-time property calculation |
| **AI Assistant** | Natural language job explanation |
| **Job History** | Persistent SQLite database |

### Target Users

- **Students:** Learning computational chemistry and drug discovery
- **PhD Scholars:** Research on protein-ligand interactions, virtual screening
- **Academic Researchers:** Cost-effective alternative to commercial tools
- **Biotech Startups:** Limited budget for software licenses
- **Educational Institutions:** Teaching molecular modeling

### Positioning Statement

> BioDockify provides a unified, accessible platform integrating molecular drawing, docking, and medicinal chemistry analysis. While commercial platforms such as Discovery Studio and Schrödinger Maestro offer highly optimized proprietary algorithms and extensive databases, BioDockify emphasizes flexibility, transparency, and accessibility through open-source tools and modular architecture.

## 1.2 Comparison with Standard Software

| Feature | BioDockify | Discovery Studio | Schrödinger Maestro |
|---------|-----------|------------------|---------------------|
| **Cost** | Free (MIT License) | Commercial ($15K-30K/year) | Commercial ($20K-40K/year) |
| **Docking Engines** | Vina + GNINA | CDOCKER, LibDock | Glide |
| **AI Integration** | Built-in LLM assistant | Limited | Advanced (separate purchase) |
| **Accessibility** | Web-based, Docker-native | Desktop | Desktop |
| **Source Code** | Fully Open | Proprietary | Proprietary |
| **Customization** | Unlimited | Limited | Limited |

**Key Differentiation:** BioDockify offers comparable core workflows with the advantages of transparency, extensibility, and zero licensing costs.

## 1.3 Comparison with AutoDock Tools

| Feature | BioDockify | AutoDock Vina | GNINA (Standalone) |
|---------|-----------|---------------|-------------------|
| **Interface** | Web GUI + API | Command-line | Command-line |
| **Visualization** | Integrated 3D viewer | External (PyMOL) | External |
| **Job Management** | SQLite database + history | Manual file management | Manual |
| **Batch Processing** | Built-in | Scripting required | Scripting required |
| **AI Assistant** | Yes | No | No |

---

# SECTION 2: GETTING STARTED

## 2.1 System Requirements

### Minimum Requirements (CPU Only)

| Component | Requirement |
|-----------|-------------|
| CPU | 4 cores, 2.5 GHz |
| RAM | 8 GB |
| Storage | 10 GB free space |
| OS | Windows 10/11, macOS 12+, Ubuntu 20.04+ |
| Docker | Docker Desktop 4.0+ |

### Recommended (GPU Acceleration)

| Component | Requirement |
|-----------|-------------|
| GPU | NVIDIA with CUDA 11.8+ |
| VRAM | 4 GB+ |
| CPU | 8+ cores |
| RAM | 16 GB+ |

## 2.2 Installation Methods

### Method 1: Docker (Recommended)

```bash
# Clone repository
git clone https://github.com/tajo9128/BioDockify-Studio-AI.git
cd BioDockify-Studio-AI

# Build and run
docker-compose -f docker-compose.yml up --build

# Access at http://localhost:3000
```

### Method 2: Local Development

```bash
# Backend setup
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend setup (new terminal)
cd frontend
npm install
npm run dev

# Access at http://localhost:5173
```

## 2.3 First Run Walkthrough

1. **Open BioDockify** at `http://localhost:3000`
2. **Navigate to Ligand Designer** from the sidebar
3. **Draw a simple molecule** (e.g., Aspirin template)
4. **Check Intelligence Panel** for calculated properties
5. **Go to Docking** and upload a protein (PDB format)
6. **Submit a test job** with default parameters
7. **View Results** and explore 3D poses

## 2.4 UI Overview

```
┌─────────────────────────────────────────────────────────────┐
│  BioDockify Studio                                    ⚙️  │
├────────────────┬──────────────────────────────────────────┤
│                │                                          │
│  📊 Dashboard  │    MAIN CONTENT AREA                     │
│  🤖 AI Chat    │                                          │
│  ⬡ Ligand      │    • Docking interface                   │
│  🎯 Docking    │    • 3D molecule viewer                  │
│  👁 Viewer     │    • Results tables                      │
│  ⭐ Pharma     │    • Analysis panels                     │
│  📈 QSAR       │                                          │
│  💊 ADMET      │                                          │
│  ⚡ MD Sim      │                                          │
│  📋 Results    │                                          │
│  📑 Jobs       │                                          │
│  ⚙️ Settings   │                                          │
│  ──────────────│                                          │
│  📘 Docs       │                                          │
│                │                                          │
└────────────────┴──────────────────────────────────────────┘
```

---

# SECTION 3: LIGAND DESIGNER MODULE

## 3.1 Overview

The Ligand Designer provides a professional 2D molecular drawing interface powered by Ketcher React. It supports chemical structure drawing, template libraries, and real-time property calculation.

## 3.2 Drawing Molecules

### Supported Drawing Operations

| Operation | Tool | Description |
|-----------|------|-------------|
| Add atom | Click canvas | Adds carbon by default |
| Change element | Toolbar | C, N, O, S, P, halogens |
| Add bond | Drag between atoms | Single, double, triple, aromatic |
| Rings | Template panel | Benzene, cyclohexane, heterocycles |
| Functional groups | Quick access | -OH, -NH2, -COOH, etc. |
| Erase | Delete tool | Remove atoms/bonds |

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + Z` | Undo |
| `Ctrl + Y` | Redo |
| `Ctrl + C` | Copy structure |
| `Ctrl + V` | Paste structure |
| `Del` | Delete selected |
| `Esc` | Clear selection |

## 3.3 Import Formats

### SMILES Import

SMILES (Simplified Molecular Input Line Entry System) strings can be pasted directly:

```
Examples:
Aspirin: CC(=O)Oc1ccccc1C(=O)O
Caffeine: Cn1cnc2c1c(=O)n(c(=O)n2C)C
Paracetamol: CC(=O)Nc1ccc(O)cc1
```

### MOL/SDF Import

MDL MOL files (V2000/V3000) and SD files are supported for:
- 2D/3D coordinates
- Atom properties
- Bond information

## 3.4 Template Library

### Built-in Templates (60+)

| Category | Examples | Count |
|----------|----------|-------|
| FDA Drugs | Aspirin, Ibuprofen, Caffeine | 12 |
| Heterocycles | Pyridine, Imidazole, Indole | 16 |
| Amino Acids | Alanine, Glycine, Cysteine | 8 |
| Kinase Scaffolds | Imatinib core, Quinazoline | 6 |
| Natural Products | Quercetin, Curcumin | 5 |
| Linkers | PEG, Piperazine, Triazole | 8 |

## 3.5 Export Options

| Format | Extension | Use Case |
|--------|-----------|----------|
| SMILES | .smi | Quick text representation |
| MOL | .mol | 2D/3D coordinates |
| SDF | .sdf | Multi-molecule files |
| PNG | .png | Publication images |
| InChI | .txt | Standard identifier |
| SMARTS | .smarts | Substructure queries |

## 3.6 Draw → Dock Workflow

```
1. DRAW in Ligand Designer
        ↓
2. VALIDATE (SMILES check)
        ↓
3. ANALYZE properties (Intelligence Panel)
        ↓
4. EXPORT as SDF or PDBQT
        ↓
5. SWITCH to Docking module
        ↓
6. UPLOAD receptor
        ↓
7. CONFIGURE grid box
        ↓
8. SUBMIT docking job
```

## 3.7 Comparison with Standard Tools

| Capability | BioDockify (Ligand Designer) | Standard Tools |
|------------|------------------------------|----------------|
| 2D Drawing | Ketcher-based (professional) | Native editors |
| SMILES/MOL Support | ✅ Full | ✅ Full |
| Reaction Editing | ✅ Yes | ✅ Yes |
| Advanced Templates | 60+ built-in | Extensive libraries |
| 3D Conversion | ✅ Yes | ✅ Yes |
| PubChem Search | ✅ Yes | ✅ Yes |

**Honest Note:** Advanced template libraries in commercial tools like Discovery Studio are broader (500+ templates). BioDockify focuses on commonly used medicinal chemistry templates.

---

# SECTION 4: PROTEIN PREPARATION

## 4.1 Supported Formats

### PDB (Protein Data Bank)

- **Standard:** PDB format v3.30
- **Source:** RCSB PDB, AlphaFold, Swiss-Model
- **Requirements:**
  - ATOM/HETATM records
  - Valid residue names
  - Chain identifiers

### PDBQT (AutoDock Format)

- **Required for:** AutoDock Vina docking
- **Contains:** Partial charges, atom types
- **Generation:** Automatic conversion in BioDockify

## 4.2 Structure Cleaning

### Automatic Processing Steps

| Step | Action | Purpose |
|------|--------|---------|
| 1. Remove waters | Delete HOH residues | Reduce noise |
| 2. Remove ligands | Extract HETATM groups | Prepare apo structure |
| 3. Add hydrogens | Protonation at pH 7.4 | Correct ionization |
| 4. Repair chains | Fix missing atoms | Complete structure |
| 5. Assign charges | Gasteiger/method | For docking |

## 4.3 Binding Site Detection

### Automatic Detection

BioDockify can automatically identify potential binding sites:

| Method | Algorithm | Use Case |
|--------|-----------|----------|
| **Geometric** | Cavities > 100 Å³ | Apo structures |
| **Ligand-based** | From bound ligand | Holo structures |
| **Site finder** | fpocket integration | Novel sites |

### Manual Grid Box Setup

Parameters for defining the search space:

| Parameter | Description | Typical Range |
|-----------|-------------|---------------|
| `center_x/y/z` | Box center coordinates | Based on binding site |
| `size_x/y/z` | Box dimensions (Å) | 20-60 Å per axis |
| Default spacing | 0.375 Å | Fixed by Vina |

## 4.4 Comparison with Commercial Tools

| Feature | BioDockify | Discovery Studio | Schrödinger |
|---------|-----------|------------------|-------------|
| Format support | PDB, PDBQT | PDB, MOL2, CIF | PDB, MAE |
| Water removal | ✅ Automatic | ✅ Advanced | ✅ Advanced |
| Protonation | ✅ pH 7.4 | ✅ H++ server | ✅ Epik |
| Site detection | ✅ Geometric | ✅ Comprehensive | ✅ SiteMap |
| Grid setup | ✅ Manual + Auto | ✅ Visual | ✅ Visual |

---

# SECTION 5: DOCKING ENGINE (CORE)

## 5.1 Docking Workflow

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   LIGAND     │ →  │ PREPARATION  │ →  │   DOCKING    │ →  │   SCORING    │
│ (SDF/SMILES) │    │ (PDBQT conv) │    │ (Vina/Gnina) │    │ (Binding ΔG) │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
       ↓                                                      ↓
  Draw/Import                                            Results Panel
```

## 5.2 Supported Engines

### AutoDock Vina 1.2.5

| Attribute | Specification |
|-----------|---------------|
| **Algorithm** | Iterated local search global optimizer |
| **Scoring** | Empirical force field (Vina score) |
| **Speed** | ~1-2 min per ligand |
| **Accuracy** | Good correlation with experimental data |
| **License** | Apache 2.0 |

**Best for:** Standard virtual screening, pose prediction

### GNINA 1.0 (CNN Scoring)

| Attribute | Specification |
|-----------|---------------|
| **Algorithm** | Monte Carlo + CNN rescoring |
| **Scoring** | Convolutional Neural Network (default2018) |
| **Speed** | ~2-5 min per ligand |
| **Accuracy** | Higher accuracy on diverse sets |
| **License** | Apache 2.0 |

**Best for:** Difficult cases, diverse chemotypes

## 5.3 Docking Parameters

### Exhaustiveness

| Value | Use Case | Time |
|-------|----------|------|
| 8 | Quick screening | Fast |
| 32 | Standard (default) | Moderate |
| 64 | Thorough search | Slow |
| 128 | Validation | Very slow |

### Number of Modes

Default: 9 poses returned

- Pose 1: Highest score (best binding)
- Poses 2-9: Alternatives ranked by energy

### Energy Range

Default: 4 kcal/mol

Maximum energy difference between best and worst returned pose.

## 5.4 Comparison with Docking Tools

| Feature | BioDockify | AutoDock Vina | GNINA | Commercial Tools |
|---------|-----------|---------------|-------|------------------|
| **Scoring** | Vina + CNN | Vina only | CNN only | Proprietary |
| **Speed** | Moderate–Fast | Fast | Moderate | Optimized |
| **Accuracy** | Good | Good | Higher (CNN) | High |
| **Flexibility** | Rigid receptor | Rigid | Rigid | Flexible available |
| **Batch mode** | ✅ Built-in | Scripting | Scripting | ✅ Yes |
| **GUI** | ✅ Web-based | External | External | ✅ Native |

**Important Note:** GNINA's CNN scoring provides ML advantage for challenging cases, but requires more computation time.

## 5.5 Job Management

### Job States

```
PENDING → RUNNING → COMPLETED/FAILED
   ↓         ↓            ↓
 Queue   Executing    Results stored
           in SQLite    in database
```

### Persistent Storage

| Data | Storage | Retention |
|------|---------|-----------|
| Job metadata | SQLite | Permanent |
| Docking logs | Filesystem | Permanent |
| Output files | Filesystem | Permanent |
| Results JSON | Database | Permanent |

**Key Feature:** Job history survives server restarts.

---

# SECTION 6: RESULTS & VISUALIZATION

## 6.1 Results Panel Overview

The Results panel displays docking outputs in multiple formats:

1. **Score Table:** Binding energies and statistics
2. **3D Viewer:** Interactive pose visualization
3. **Interaction Diagram:** 2D ligand-protein interactions
4. **Download Section:** Output file access

## 6.2 Binding Pose Analysis

### Pose Ranking

| Pose | Affinity (kcal/mol) | RMSD from 1 | Significance |
|------|---------------------|-------------|--------------|
| 1 | -9.2 | 0.0 | Best predicted binding |
| 2 | -8.7 | 1.2 Å | Alternative conformation |
| 3 | -8.5 | 2.8 Å | Different orientation |

### Energy Interpretation

| Affinity Range | Interpretation | Typical Hit Threshold |
|----------------|----------------|----------------------|
| < -10 | Very strong binding | Excellent |
| -8 to -10 | Strong binding | Good |
| -6 to -8 | Moderate binding | Marginal |
| > -6 | Weak binding | Poor |

## 6.3 3D Visualization

### Viewer Controls

| Control | Action |
|---------|--------|
| Left click + drag | Rotate |
| Right click + drag | Pan |
| Scroll | Zoom |
| Click atom | Select |
| Double click | Center view |

### Display Options

| Mode | Description |
|------|-------------|
| **Licorice** | Bonds as cylinders |
| **Ball & Stick** | Atoms + bonds |
| **Cartoon** | Protein secondary structure |
| **Surface** | Solvent accessible surface |
| **Binding pocket** | Cavity visualization |

## 6.4 Interaction Diagram

### Detected Interaction Types

| Type | Description | Energy Contribution |
|------|-------------|---------------------|
| **H-bond (donor)** | Ligand H → Protein acceptor | -0.5 to -2.0 |
| **H-bond (acceptor)** | Ligand acceptor → Protein H | -0.5 to -2.0 |
| **Hydrophobic** | Non-polar contacts | -0.1 to -1.0 |
| **π-stacking** | Aromatic ring overlap | -0.5 to -1.5 |
| **Salt bridge** | Ionic interactions | -1.0 to -3.0 |

## 6.5 Export Results

### Available Downloads

| File | Format | Content |
|------|--------|---------|
| Docked poses | PDBQT | All poses with coordinates |
| Log file | TXT | Vina/Gnina execution log |
| Scores | CSV | Tabular binding data |
| Report | PDF | Summary (future feature) |

---

# SECTION 7: INTELLIGENCE PANEL

## 7.1 Overview

The Intelligence Panel provides real-time medicinal chemistry analysis as you design molecules. This is a **unique integrated feature** that combines multiple cheminformatics tools.

## 7.2 Molecular Properties

### Calculated Properties

| Property | Symbol | Units | Good Range |
|----------|--------|-------|------------|
| Molecular Weight | MW | Da | < 500 |
| LogP (lipophilicity) | LogP | - | -0.4 to 5.0 |
| Hydrogen Bond Donors | HBD | Count | ≤ 5 |
| Hydrogen Bond Acceptors | HBA | Count | ≤ 10 |
| Polar Surface Area | TPSA | Å² | < 140 |
| Rotatable Bonds | RotB | Count | ≤ 10 |
| Molecular Formula | - | - | - |

## 7.3 Lipinski's Rule of Five

The classic drug-likeness filter:

| Rule | Criterion | BioDockify Check |
|------|-----------|------------------|
| 1 | MW < 500 Da | ✅ Color-coded |
| 2 | LogP < 5 | ✅ Yes |
| 3 | HBD ≤ 5 | ✅ Yes |
| 4 | HBA ≤ 10 | ✅ Yes |
| **Result** | ≤ 1 violation | Pass/fail indicator |

## 7.4 Additional Drug-Likeness Rules

### Veber Rules (Oral Bioavailability)

| Parameter | Threshold | BioDockify Display |
|-----------|-----------|-------------------|
| TPSA | ≤ 140 Å² | ✅ Yes |
| Rotatable bonds | ≤ 10 | ✅ Yes |

### Ghose Filter

| Parameter | Range |
|-----------|-------|
| MW | 160–480 Da |
| LogP | -0.4 to 5.6 |

### Pfizer 3/75 Rule (BBB Penetration)

| Parameter | Threshold |
|-----------|-----------|
| LogP | ≤ 3 |
| TPSA | ≥ 75 Å² |

## 7.5 PAINS & Toxicity Alerts

### Detection Categories

| Alert Type | Description | Severity |
|------------|-------------|----------|
| **PAINS** | Pan-assay interference compounds | High |
| **Reactive** | Michael acceptors, aldehydes | High |
| **Promiscuous** | Known frequent hitters | Medium |
| **Ames** | Mutagenicity alerts | High |

### Color Coding

- 🟢 **Green:** No alerts
- 🟡 **Yellow:** Medium severity
- 🔴 **Red:** High severity

## 7.6 Synthetic Accessibility (SA) Score

| Score | Interpretation | Synthesis Difficulty |
|-------|---------------|---------------------|
| 1.0–3.0 | Easy | Standard chemistry |
| 3.0–5.0 | Moderate | Some optimization needed |
| 5.0–7.0 | Difficult | Challenging synthesis |
| 7.0–10.0 | Very difficult | Expert required |

**Method:** Based on fragment complexity and structural features.

## 7.7 Murcko Scaffold

Extracts the core ring structure of a molecule, useful for:
- Scaffold hopping
- Patent analysis
- SAR studies

**Example:**
```
Full molecule: Imatinib (complex)
Murcko scaffold: Core pyrimidine-amine ring system
```

## 7.8 Functional Groups

### Detected Groups

| Group | Color | Typical Count |
|-------|-------|---------------|
| Alcohol | Green | 1–3 |
| Amine | Blue | 0–2 |
| Amide | Purple | 0–4 |
| Carboxylic acid | Red | 0–2 |
| Aromatic ring | Yellow | 1–5 |
| Heterocycle | Orange | 0–4 |

## 7.9 Comparison with Standard Software

| Feature | BioDockify | Discovery Studio | Schrödinger |
|---------|-----------|------------------|-------------|
| Lipinski Rules | ✅ Yes | ✅ Yes | ✅ Yes |
| PAINS Alerts | ✅ Yes | ✅ Yes | ✅ Yes |
| SA Score | ✅ Yes | ⚠️ Limited | ⚠️ QikProp |
| Functional Groups | ✅ Yes | ✅ Yes | ✅ Yes |
| Murcko Scaffold | ✅ Yes | ✅ Yes | ✅ Yes |
| Veber Rules | ✅ Yes | ✅ Yes | ✅ Yes |
| Real-time update | ✅ Yes | ⚠️ Manual | ⚠️ Manual |

**Positioning:** BioDockify integrates multiple medicinal chemistry tools into a single interactive panel with real-time updates—a workflow advantage.

---

# SECTION 8: ADVANCED FEATURES

## 8.1 NMR Prediction (Rule-Based)

### Method

BioDockify uses a **rule-based estimation system** for NMR chemical shifts:

- **1H NMR:** Proton environment classification
- **13C NMR:** Carbon hybridization and substitution patterns

### Shift Ranges

| Atom Type | Typical δ (ppm) | Notes |
|-----------|-----------------|-------|
| Aliphatic CH | 0.5–2.0 | sp³ carbons |
| Allylic CH | 1.5–2.5 | Next to double bond |
| Aromatic CH | 6.5–8.5 | sp² ring protons |
| Aldehyde CHO | 9.0–10.0 | Highly deshielded |
| Carboxylic OH | 10.0–13.0 | Exchangeable |

### ⚠️ Important Disclaimer

> NMR predictions in BioDockify are **rule-based estimates only** and should NOT be used for structural determination. For accurate predictions, use dedicated software like:
> - ChemDraw (PerkinElmer)
> - MNova (Mestrelab)
> - ACD/NMR Predictors

## 8.2 Retrosynthesis (Basic Rules)

### Approach

BioDockify provides **simplified retrosynthetic analysis** using:
- Common disconnection patterns
- Known synthetic routes
- Functional group transformations

### Limitations

| Aspect | BioDockify | Advanced Tools (e.g., SYNTHIA) |
|--------|-----------|------------------------------|
| Database size | Limited rules | Millions of reactions |
| AI prediction | Rule-based | Deep learning |
| Validation | None | Literature-based |
| Commercial routes | Not included | Full databases |

**Use Case:** Educational tool for learning disconnection strategies, not production route design.

## 8.3 Similarity Search (PubChem)

### Method

- Tanimoto fingerprint comparison
- PubChem PUG-REST API
- Threshold: 0.7 (70% similarity)

### Results

| Field | Description |
|-------|-------------|
| CID | PubChem Compound ID |
| Name | Common name |
| SMILES | Structure |
| Tanimoto | Similarity score (0–1) |

## 8.4 3D Conformer Generation

### Algorithm

- **ETKDG** (Experimental Torsion-angle Knowledge-based Distance Geometry)
- RDKit implementation
- Geometry optimization with MMFF94

### Output

| Property | Description |
|----------|-------------|
| Conformer energies | MMFF94 energy (kcal/mol) |
| Lowest energy | Conformer #1 (⭐ best) |
| RMSD matrix | Conformational diversity |
| PDB export | 3D coordinates |

## 8.5 Comparison with Advanced Tools

| Feature | BioDockify | Commercial Tools |
|--------|-----------|------------------|
| NMR Prediction | Rule-based estimates | High-accuracy engines |
| Retrosynthesis | Basic rules | AI/Database-driven |
| Similarity Search | PubChem API | Proprietary databases |
| 3D Conformers | ETKDG/MMFF | Advanced force fields |

**Transparency Note:** BioDockify's approach is lightweight and accessible, suitable for quick estimates and educational purposes. For publication-quality predictions, specialized tools are recommended.

---

# SECTION 9: AI & OPTIMIZATION

## 9.1 BioDockify AI Assistant

### Capabilities

The AI assistant provides natural language explanations for:
- Docking result interpretation
- Error troubleshooting
- Parameter recommendations
- Scientific concepts

### Supported Providers

| Provider | Model | Local/Cloud |
|----------|-------|-------------|
| Ollama | llama3.2, mistral | Local |
| OpenAI | GPT-4, GPT-3.5 | Cloud |
| DeepSeek | Various | Cloud |

## 9.2 Job-Specific Explanations

Users can ask questions about specific docking jobs:

**Example queries:**
- "Why is my binding energy -8.2 kcal/mol?"
- "What does GNINA CNN score mean?"
- "Compare pose 1 vs pose 3"
- "Explain the error in my failed job"

## 9.3 AI-Powered Ligand Optimization (Planned)

### Future Features

| Feature | Status | Description |
|---------|--------|-------------|
| DiffDock integration | Planned | Diffusion model docking |
| Generative optimization | Planned | Suggest modifications |
| Activity prediction | Planned | ML-based potency |
| ADMET optimization | Planned | Multi-property optimization |

## 9.4 Limitations of AI Predictions

| Aspect | Limitation | Recommendation |
|--------|-----------|----------------|
| **Accuracy** | No guarantee | Validate with experiments |
| **Context** | Limited protein knowledge | Use with structural data |
| **Novelty** | Training data bias | Critical evaluation |
| **Liability** | No regulatory acceptance | For research only |

---

# SECTION 10: DEVELOPER DOCUMENTATION

## 10.1 System Architecture

```
Frontend (React 18 + TypeScript)
    ↓ HTTP/WebSocket
Backend (FastAPI + Python 3.9+)
    ↓
Core Engines (RDKit, OpenMM, Vina)
    ↓
Storage (SQLite + Filesystem)
```

## 10.2 Frontend Architecture

### Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | React | 18.x |
| Language | TypeScript | 5.x |
| Build | Vite | 5.x |
| Styling | Tailwind CSS | 3.x |
| Icons | Lucide React | Latest |
| Editor | Ketcher React | 2.x |
| 3D | NGL/Three.js | Latest |

### Component Hierarchy

```
App
├── Layout
│   ├── Sidebar (navigation)
│   ├── Header (title, actions)
│   └── Main (route content)
├── Pages
│   ├── Dashboard
│   ├── LigandDesigner (Ketcher)
│   ├── Docking (job submission)
│   ├── Results (visualization)
│   └── ...
└── Contexts
    └── ThemeContext
```

## 10.3 Backend Architecture

### FastAPI Structure

```python
backend/
├── main.py                 # App entry, routes
├── db.py                   # Database operations
├── docking_engine.py       # Vina/Gnina wrapper
├── md_engine.py            # OpenMM integration
├── llm_router.py           # AI provider routing
├── chem_utils.py           # RDKit utilities
└── storage/                # Job files, database
```

### Key API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/docking/run` | POST | Submit docking job |
| `/api/docking/result/{id}` | GET | Get results |
| `/api/jobs/{id}/full` | GET | Complete job data |
| `/api/ai/job-explain` | POST | AI explanation |
| `/api/chem/properties` | POST | Calculate properties |

### Request/Response Examples

**Submit Docking:**
```bash
POST /api/docking/run
Content-Type: multipart/form-data

receptor: <file.pdbqt>
ligand: <file.pdbqt>
center_x: 12.5
center_y: 34.2
center_z: 15.8
size_x: 20.0
size_y: 20.0
size_z: 20.0
exhaustiveness: 32
```

**Response:**
```json
{
  "job_id": "uuid-here",
  "status": "submitted",
  "message": "Docking job submitted"
}
```

## 10.4 Database Schema

### Tables

**jobs:**
```sql
CREATE TABLE jobs (
    id INTEGER PRIMARY KEY,
    uuid TEXT UNIQUE,
    name TEXT,
    job_type TEXT,
    status TEXT,
    created_at TIMESTAMP,
    completed_at TIMESTAMP,
    receptor_name TEXT,
    ligand_name TEXT,
    log_text TEXT,
    files_json TEXT
);
```

**docking_results:**
```sql
CREATE TABLE docking_results (
    id INTEGER PRIMARY KEY,
    job_id INTEGER,
    pose_number INTEGER,
    affinity REAL,
    rmsd_lb REAL,
    rmsd_ub REAL,
    FOREIGN KEY (job_id) REFERENCES jobs(id)
);
```

## 10.5 Extending BioDockify

### Adding New Docking Engines

1. Create engine class in `docking_engine.py`
2. Add API endpoint in `main.py`
3. Update frontend in `Docking.tsx`

### Custom Scoring Functions

```python
class CustomScorer:
    def score(self, pose: Pose) -> float:
        # Implementation
        return score
```

## 10.6 Comparison with Commercial Tools

| Aspect | BioDockify | Commercial Tools |
|--------|-----------|------------------|
| Extensibility | High (open APIs) | Limited |
| Customization | Full source code | Restricted |
| Deployment | Local + Cloud + Docker | Licensed seats |
| Integration | Unlimited | Vendor-controlled |
| Cost | Free | $15K-40K/year |

**Developer Advantage:** Full source access and API control for custom workflows.

---

# SECTION 11: DEPLOYMENT GUIDE

## 11.1 Docker Deployment

### Standard Setup

```bash
# Clone repo
git clone https://github.com/tajo9128/BioDockify-Studio-AI.git
cd BioDockify-Studio-AI

# Build images
docker-compose build

# Start services
docker-compose up -d

# Access
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
```

### GPU Support

```yaml
# docker-compose.yml
services:
  backend:
    runtime: nvidia
    environment:
      - NVIDIA_VISIBLE_DEVICES=all
```

## 11.2 Cloud Deployment

### AWS/GCP/Azure

| Platform | Service | Notes |
|----------|---------|-------|
| AWS | ECS or EKS | Use GPU instances for MD |
| GCP | GKE | Preemptible for cost savings |
| Azure | AKS | GPU nodes for docking |

## 11.3 Scaling Considerations

| Scale | Configuration | Use Case |
|-------|--------------|----------|
| Single user | Local Docker | Personal research |
| Lab (5-10) | Single server | Small group |
| Department | Kubernetes | 50+ users |
| Enterprise | Cloud cluster | 1000+ jobs/day |

## 11.4 Security Considerations

| Aspect | Recommendation |
|--------|---------------|
| API access | Add authentication for production |
| File uploads | Limit size, scan for malware |
| Database | Regular backups |
| Network | HTTPS in production |

## 11.5 Deployment Comparison

| Feature | BioDockify | Standard Tools |
|--------|-----------|----------------|
| Local install | ✅ Yes | ✅ Yes |
| Cloud deploy | ✅ Native Docker | ⚠️ Limited |
| GPU optional | ✅ Yes | Often required |
| Multi-user | ✅ SQLite + API | Licensed seats |
| Auto-scaling | ✅ Kubernetes | Enterprise license |

---

# SECTION 12: FILE FORMATS & STANDARDS

## 12.1 Supported Formats

### Input Formats

| Format | Extension | Type | Support |
|--------|-----------|------|---------|
| PDB | .pdb | Protein | Full |
| PDBQT | .pdbqt | Docking | Full |
| MOL | .mol | Molecule | Full |
| SDF | .sdf | Multi-mol | Full |
| SMILES | .smi | String | Full |
| XYZ | .xyz | Coordinates | Read-only |

### Output Formats

| Format | Content |
|--------|---------|
| PDBQT | Docked poses |
| SDF | Multi-pose file |
| CSV | Score tables |
| TXT | Log files |
| PNG | 2D structures |
| PDF | Reports (planned) |

## 12.2 Conversion Pipeline

```
SMILES ──→ RDKit ──→ 2D (Ketcher)
   ↓           ↓
  MOL ─────→ 3D (Conformer gen)
   ↓           ↓
PDBQT ←─── AutoDockTools (prep)
   ↓
Vina/Gnina
   ↓
Results
```

## 12.3 Format Standards

### PDB Format
- Version 3.30
- ATOM/HETATM records
- Standard residue names
- Chain identifiers supported

### SMILES Specification
- Daylight SMILES standard
- Canonical SMILES generation
- Isomerism support (E/Z, R/S)

---

# SECTION 13: VALIDATION & LIMITATIONS

## 13.1 Docking Limitations

### Accuracy Limits

| Aspect | Reality | Best Practice |
|--------|---------|-------------|
| Pose prediction | ~70-80% success | Compare multiple poses |
| Scoring correlation | R² ~0.5-0.7 | Use for ranking, not absolute |
| Water effects | Ignored (most protocols) | Consider explicit waters |
| Protein flexibility | Rigid receptor | Use ensemble docking |

### Known Issues

1. **Hydrogen bonding networks** may not be optimal
2. **Protonation states** are estimated at pH 7.4
3. **Metal coordination** is not explicitly handled
4. **Induced fit** requires separate modeling

## 13.2 Scoring Function Limitations

| Function | Strengths | Weaknesses |
|----------|-----------|------------|
| Vina | Fast, robust | Limited for unusual chemotypes |
| GNINA CNN | Better for diverse sets | Slower, GPU required |
| Empirical | Physical basis | Parameter-dependent |

## 13.3 NMR Approximation Disclaimer

**CRITICAL:** NMR predictions in BioDockify are:
- Rule-based estimates
- NOT quantum mechanical calculations
- For educational purposes only
- NOT for structural determination

## 13.4 Retrosynthesis Simplification

BioDockify retrosynthesis:
- Uses limited reaction rules
- Does NOT have comprehensive databases
- Is NOT validated against literature
- For learning only

## 13.5 Comparison Summary

| Limitation | BioDockify | Commercial Tools |
|------------|-----------|------------------|
| Docking accuracy | Similar | Similar |
| Scoring functions | Fewer options | More validated |
| NMR prediction | Rule-based | Quantum/ML-based |
| Database size | PubChem only | Proprietary large DB |
| Support | Community | Commercial |

**Credibility Statement:** BioDockify provides accessible entry-level computational chemistry tools. For mission-critical applications, validate with experiments and consider specialized commercial tools.

---

# SECTION 14: TROUBLESHOOTING

## 14.1 Common Errors

### Invalid SMILES

**Symptom:** Molecule won't load in Ketcher  
**Fix:** Check SMILES syntax using online validator

### Docking Failure

**Symptoms:** Job fails immediately or hangs  
**Causes & Fixes:**

| Cause | Solution |
|-------|----------|
| Missing atoms | Check PDB/PDBQT files |
| Grid box too small | Increase size to 20+ Å |
| Zero affinity returned | Check ligand charges |
| Docker not running | Start Docker Desktop |

### Missing Hydrogens

**Fix:** Use PDBQT format (adds hydrogens automatically) or add manually in external tool.

## 14.2 Performance Issues

| Issue | Solution |
|-------|----------|
| Slow docking | Reduce exhaustiveness, use fewer CPU threads |
| Out of memory | Smaller grid box, fewer modes |
| UI unresponsive | Check browser console for errors |

## 14.3 Database Issues

| Issue | Fix |
|-------|-----|
| Jobs not showing | Check SQLite file permissions |
| Corrupted database | Delete `backend/storage/jobs.db` (data loss!) |
| Migration errors | Run `init_db()` manually |

## 14.4 Docker Issues

```bash
# Reset Docker environment
docker-compose down
docker system prune -a
docker-compose build --no-cache
docker-compose up
```

---

# SECTION 15: ROADMAP

## 15.1 Version 4.3 (Q2 2026)

- [ ] DiffDock integration (diffusion docking)
- [ ] Enhanced 3D viewer with WebGL 2.0
- [ ] Batch job templates
- [ ] Improved AI assistant context

## 15.2 Version 5.0 (Q3 2026)

- [ ] Multi-user collaboration
- [ ] Cloud storage integration
- [ ] Advanced virtual screening workflows
- [ ] ML-based activity prediction

## 15.3 Future Vision

| Feature | Timeline | Description |
|---------|----------|-------------|
| Generative AI | 2026-2027 | De novo ligand design |
| Multi-target docking | 2026 | Polypharmacology support |
| QM/MM integration | 2027 | Quantum refinement |
| Mobile app | 2027 | Tablet-optimized interface |

---

# APPENDICES

## A. Citation Information

```
BioDockify Studio v4.2.6
Open-source molecular docking and drug discovery platform
https://github.com/tajo9128/BioDockify-Studio-AI
License: MIT
```

## B. Third-Party Licenses

- Ketcher: Apache 2.0
- AutoDock Vina: Apache 2.0
- GNINA: Apache 2.0
- RDKit: BSD
- OpenMM: MIT
- React: MIT

## C. Support Resources

- **GitHub Issues:** https://github.com/tajo9128/BioDockify-Studio-AI/issues
- **Documentation:** This file
- **API Docs:** http://localhost:8000/docs (Swagger UI)

## D. Glossary

| Term | Definition |
|------|------------|
| **Docking** | Computational prediction of ligand binding |
| **RMSD** | Root-mean-square deviation (pose similarity) |
| **Affinity** | Binding free energy (kcal/mol) |
| **Pharmacophore** | Spatial arrangement of features for activity |
| **SAR** | Structure-activity relationship |
| **QSAR** | Quantitative SAR |
| **ADMET** | Absorption, distribution, metabolism, excretion, toxicity |

---

**Document Version:** 4.2.6  
**Last Updated:** April 2026  
**Total Pages:** ~50 equivalent

© 2026 BioDockify Project Contributors
