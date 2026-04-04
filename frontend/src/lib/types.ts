// ============================================================
// API Types - Mirror of backend Pydantic models
// ============================================================

export interface HealthCheck {
  status: 'healthy' | 'unhealthy'
  timestamp: string
  ollama: {
    status: 'available' | 'unavailable'
    models: string[]
  }
}

export interface JobRequest {
  job_name: string
  receptor_path: string
  ligand_path: string
  engine: string
}

export interface Job {
  id: number
  job_uuid: string
  job_name: string
  receptor_file: string
  ligand_file: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  created_at: string
  completed_at?: string
  binding_energy?: number
  confidence_score?: number
  engine: string
}

export interface DockingResult {
  id: number
  job_uuid: string
  pose_id: number
  ligand_name: string
  vina_score?: number
  gnina_score?: number
  rf_score?: number
  consensus?: number
  pdb_data?: string
  mode?: number
  hydrophobic_term?: number
  rotatable_penalty?: number
  lipo_contact?: number
  composite_score?: number
  final_score?: number
  constraint_penalty?: number
}

export interface DockingJob {
  id: number
  job_uuid: string
  job_name: string
  receptor_file: string
  ligand_file: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  created_at: string
  completed_at?: string
  binding_energy?: number
  confidence_score?: number
  engine: string
  receptor_content?: string
  ligand_pdb?: string
  results?: DockingResult[]
  download_urls?: Record<string, string>
}

export interface Interaction {
  id: number
  job_uuid: string
  pose_id: number
  interaction_type: string
  atom_a: string
  atom_b: string
  distance: number
}

export interface PoseRequest {
  receptor: string
  ligand: string
}

export interface PoseAnalysis {
  hbond_count: number
  hydrophobic_count: number
  total_contacts: number
  avg_hbond_distance: number
  binding_score: number
  hbonds: Array<{ donor: string; acceptor: string; distance: number }>
  hydrophobic: Array<{ atom1: string; atom2: string; distance: number }>
  pi_stacking: Array<{ ring1: string; ring2: string; distance: number }>
  salt_bridges: Array<{ atom1: string; atom2: string; distance: number }>
  total_hbonds: number
  total_hydrophobic: number
}

export interface BindingSiteResidue {
  residue_name: string
  residue_number: number
  chain: string
  atom_name: string
}

export interface RMSDRequest {
  pdb1: string
  pdb2: string
}

export interface RMSDResponse {
  rmsd: number
}

export interface ChatRequest {
  message: string
}

export interface ChatResponse {
  response: string
  provider: string
  available: boolean
  tools_used?: string[]
  error?: string
}

export interface ChatStatus {
  provider: string
  ollama_available: boolean
  models: string[]
  error?: string
}

export interface SecurityStatus {
  last_scan_at: string | null
  overall_severity: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'NOT_SCANNED'
  is_secure: boolean
  total_issues: number
  scan_results: Record<string, any>
}

export interface SecurityReport {
  scan_type: string
  severity: string
  issues_count: number
  created_at: string
}

export interface SecurityIssue {
  scan_type: string
  severity: string
  issues: string[]
  raw_output: string
  created_at: string
}

export interface GPUInfo {
  index: number
  name: string
  utilization: number
  memory_used: number
  memory_total: number
  temperature: number
}

export interface GPUStatus {
  available: boolean
  gpus: GPUInfo[]
  message?: string
}

export interface DockingProgress {
  progress: number
  total: number
  status: 'running' | 'completed' | 'cancelled' | 'failed' | 'unknown'
  message: string
}

export interface OllamaStatus {
  url: string
  available: boolean
  models: Array<{ name: string }>
  error?: string
}

// ============================================================
// Frontend-only types
// ============================================================

export interface DockingConfig {
  center_x: number
  center_y: number
  center_z: number
  size_x: number
  size_y: number
  size_z: number
  exhaustiveness: number
  num_modes: number
  engine: 'vina' | 'gnina' | 'rfscore'
  batch_size: number
}

export interface UploadedFile {
  filename: string
  path: string
  size: number
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
}
