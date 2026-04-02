import { useState, useEffect } from 'react'
import { useTheme } from '@/contexts/ThemeContext'

interface DockingResult {
  id: number
  job_uuid: string
  pose_id: number
  ligand_name: string
  vina_score: number | null
  gnina_score: number | null
  rf_score: number | null
  consensus: number | null
  pdb_data: string | null
  hydrophobic_term?: number
  rotatable_penalty?: number
  lipo_contact?: number
  final_score?: number
  composite_score?: number
  constraint_penalty?: number
}

interface Job {
  id: number
  job_uuid: string
  job_name: string
  receptor_file: string | null
  ligand_file: string | null
  status: string
  created_at: string
  completed_at: string | null
  binding_energy: number | null
  confidence_score: number | null
  engine: string | null
}

export function Results() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [jobs, setJobs] = useState<Job[]>([])
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [selectedResults, setSelectedResults] = useState<DockingResult[]>([])
  const [selectedPose, setSelectedPose] = useState<DockingResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'all' | 'completed' | 'running' | 'failed'>('all')

  const bgClass = isDark ? 'bg-gray-900' : 'bg-gray-50'
  const cardBg = isDark ? 'bg-gray-800' : 'bg-white'
  const borderClass = isDark ? 'border-gray-700' : 'border-gray-200'
  const textClass = isDark ? 'text-white' : 'text-gray-900'
  const subtextClass = isDark ? 'text-gray-400' : 'text-gray-500'
  const hoverClass = isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'

  useEffect(() => {
    fetchJobs()
  }, [])

  const fetchJobs = async () => {
    setLoading(true)
    try {
      const res = await fetch('/jobs')
      const data = await res.json()
      const jobList = data.jobs || []
      setJobs(jobList)
      if (jobList.length > 0 && !selectedJob) {
        selectJob(jobList[0])
      }
    } catch (err) {
      console.error('Failed to fetch jobs:', err)
    } finally {
      setLoading(false)
    }
  }

  const selectJob = async (job: Job) => {
    setSelectedJob(job)
    try {
      const res = await fetch(`/jobs/${job.job_uuid}/results`)
      const data = await res.json()
      setSelectedResults(data.results || [])
    } catch (err) {
      console.error('Failed to fetch results:', err)
      setSelectedResults([])
    }
  }

  const deleteJob = async (jobUuid: string) => {
    if (!confirm('Delete this job and all its results?')) return
    try {
      await fetch(`/jobs/${jobUuid}`, { method: 'DELETE' })
      setJobs(prev => prev.filter(j => j.job_uuid !== jobUuid))
      if (selectedJob?.job_uuid === jobUuid) {
        setSelectedJob(null)
        setSelectedResults([])
      }
    } catch (err) {
      console.error('Failed to delete job:', err)
    }
  }

  const filteredJobs = jobs.filter(job => {
    if (activeTab === 'all') return true
    if (activeTab === 'completed') return job.status === 'completed'
    if (activeTab === 'running') return job.status === 'running' || job.status === 'pending'
    if (activeTab === 'failed') return job.status === 'failed' || job.status === 'cancelled'
    return true
  })

  const getStatusBadge = (status: string) => {
    const baseClass = 'px-2 py-0.5 rounded-full text-xs font-medium'
    switch (status) {
      case 'completed':
        return `${baseClass} ${isDark ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-700'}`
      case 'running':
      case 'pending':
        return `${baseClass} ${isDark ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-700'}`
      case 'failed':
      case 'cancelled':
        return `${baseClass} ${isDark ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-700'}`
      default:
        return `${baseClass} ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`
    }
  }

  const getStatusDot = (status: string) => {
    const baseClass = 'w-2 h-2 rounded-full'
    switch (status) {
      case 'completed':
        return `${baseClass} bg-green-500`
      case 'running':
      case 'pending':
        return `${baseClass} bg-blue-500 animate-pulse`
      case 'failed':
      case 'cancelled':
        return `${baseClass} bg-red-500`
      default:
        return `${baseClass} bg-gray-400`
    }
  }

  return (
    <div className={`h-full flex ${bgClass}`}>
      {/* Sidebar - Job List */}
      <div className={`w-80 ${cardBg} ${borderClass} border-r overflow-hidden flex flex-col`}>
        <div className={`p-4 ${borderClass} border-b`}>
          <div className="flex items-center justify-between mb-3">
            <h2 className={`font-semibold ${textClass}`}>Job History</h2>
            <button
              onClick={fetchJobs}
              className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
              title="Refresh"
            >
              <svg className={`w-4 h-4 ${subtextClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
          
          <div className="flex gap-1 flex-wrap">
            {(['all', 'completed', 'running', 'failed'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                  activeTab === tab
                    ? isDark ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
                    : isDark ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin text-2xl">⟳</div>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className={`text-center py-12 ${subtextClass}`}>
              <div className="text-4xl mb-3">📋</div>
              <p className="text-sm">No jobs found</p>
              <p className="text-xs mt-1">Run a docking simulation to see history</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredJobs.map(job => (
                <button
                  key={job.job_uuid}
                  onClick={() => selectJob(job)}
                  className={`w-full p-4 text-left transition-colors ${
                    selectedJob?.job_uuid === job.job_uuid
                      ? isDark ? 'bg-blue-900/30 border-l-4 border-blue-500' : 'bg-blue-50 border-l-4 border-blue-500'
                      : `${hoverClass}`
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium text-sm truncate ${textClass}`}>
                        {job.job_name}
                      </p>
                      <p className={`text-xs ${subtextClass} mt-1`}>
                        {new Date(job.created_at).toLocaleDateString()} {new Date(job.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <span className={getStatusDot(job.status)} />
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteJob(job.job_uuid); }}
                        className={`p-1 rounded opacity-0 group-hover:opacity-100 ${isDark ? 'hover:bg-red-900' : 'hover:bg-red-100'}`}
                        title="Delete"
                      >
                        <svg className={`w-4 h-4 ${isDark ? 'text-red-400' : 'text-red-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    {getStatusBadge(job.status)}
                    {job.binding_energy && (
                      <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {job.binding_energy.toFixed(2)} kcal/mol
                      </span>
                    )}
                  </div>
                  {job.engine && (
                    <p className={`text-xs ${subtextClass} mt-1`}>
                      Engine: {job.engine.toUpperCase()}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
        
        <div className={`p-3 ${borderClass} border-t ${subtextClass} text-xs text-center`}>
          {jobs.length} total jobs | {jobs.filter(j => j.status === 'completed').length} completed
        </div>
      </div>

      {/* Main Content - Job Details */}
      <div className="flex-1 overflow-y-auto">
        {selectedJob ? (
          <div className="p-6">
            {/* Job Header */}
            <div className={`${cardBg} rounded-xl ${borderClass} border mb-6`}>
              <div className={`p-6 ${borderClass} border-b`}>
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className={`text-2xl font-bold ${textClass}`}>{selectedJob.job_name}</h1>
                    <p className={`mt-1 ${subtextClass}`}>
                      Job ID: <code className={`${isDark ? 'bg-gray-700' : 'bg-gray-100'} px-1 rounded`}>{selectedJob.job_uuid}</code>
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(selectedJob.status)}
                    <button
                      onClick={() => deleteJob(selectedJob.job_uuid)}
                      className={`p-2 rounded-lg ${isDark ? 'hover:bg-red-900/50' : 'hover:bg-red-100'}`}
                      title="Delete Job"
                    >
                      <svg className={`w-5 h-5 ${isDark ? 'text-red-400' : 'text-red-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Job Info Grid */}
              <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className={`text-xs ${subtextClass} uppercase tracking-wide`}>Created</p>
                  <p className={`font-medium ${textClass} mt-1`}>
                    {new Date(selectedJob.created_at).toLocaleDateString()}
                  </p>
                  <p className={`text-sm ${subtextClass}`}>
                    {new Date(selectedJob.created_at).toLocaleTimeString()}
                  </p>
                </div>
                {selectedJob.completed_at && (
                  <div>
                    <p className={`text-xs ${subtextClass} uppercase tracking-wide`}>Completed</p>
                    <p className={`font-medium ${textClass} mt-1`}>
                      {new Date(selectedJob.completed_at).toLocaleDateString()}
                    </p>
                    <p className={`text-sm ${subtextClass}`}>
                      {new Date(selectedJob.completed_at).toLocaleTimeString()}
                    </p>
                  </div>
                )}
                <div>
                  <p className={`text-xs ${subtextClass} uppercase tracking-wide`}>Engine</p>
                  <p className={`font-medium ${textClass} mt-1`}>
                    {selectedJob.engine?.toUpperCase() || 'VINA'}
                  </p>
                </div>
                <div>
                  <p className={`text-xs ${subtextClass} uppercase tracking-wide`}>Best Score</p>
                  <p className={`font-bold text-lg mt-1 ${selectedJob.binding_energy ? 'text-green-600' : subtextClass}`}>
                    {selectedJob.binding_energy ? `${selectedJob.binding_energy.toFixed(2)} kcal/mol` : '-'}
                  </p>
                </div>
              </div>
            </div>

            {/* Docking Results Table */}
            {selectedResults.length > 0 && (
              <>
              <div className={`${cardBg} rounded-xl ${borderClass} border mb-6`}>
                <div className={`p-4 ${borderClass} border-b`}>
                  <h2 className={`font-semibold ${textClass}`}>Docking Poses</h2>
                  <p className={`text-sm ${subtextClass} mt-1`}>
                    {selectedResults.length} pose(s) generated, sorted by Vina score (best binding energy)
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className={isDark ? 'bg-gray-700/50' : 'bg-gray-50'}>
                      <tr>
                        <th className={`px-6 py-3 text-left text-xs font-medium ${subtextClass} uppercase tracking-wider`}>Rank</th>
                        <th className={`px-6 py-3 text-left text-xs font-medium ${subtextClass} uppercase tracking-wider`}>Pose</th>
                        <th className={`px-6 py-3 text-left text-xs font-medium ${subtextClass} uppercase tracking-wider`}>Vina Score</th>
                        <th className={`px-6 py-3 text-left text-xs font-medium ${subtextClass} uppercase tracking-wider`}>CNN Score</th>
                        <th className={`px-6 py-3 text-left text-xs font-medium ${subtextClass} uppercase tracking-wider`}>RF Score</th>
                        <th className={`px-6 py-3 text-left text-xs font-medium ${subtextClass} uppercase tracking-wider`}>Consensus</th>
                        <th className={`px-6 py-3 text-left text-xs font-medium ${subtextClass} uppercase tracking-wider`}>Composite</th>
                        <th className={`px-6 py-3 text-left text-xs font-medium ${subtextClass} uppercase tracking-wider`}>Actions</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${borderClass}`}>
                      {selectedResults.map((result, i) => (
                        <tr key={result.id} className={`${hoverClass} transition-colors cursor-pointer ${selectedPose?.id === result.id ? (isDark ? 'bg-blue-900/30' : 'bg-blue-50') : ''} ${i === 0 ? (isDark ? 'bg-green-900/20' : 'bg-green-50') : ''}`} onClick={() => setSelectedPose(result)}>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                              i === 0 
                                ? 'bg-green-500 text-white' 
                                : isDark ? 'bg-gray-600 text-white' : 'bg-gray-200 text-gray-700'
                            }`}>
                              {i + 1}
                            </span>
                          </td>
                          <td className={`px-6 py-4 text-sm ${textClass}`}>{result.ligand_name || `Pose ${result.pose_id}`}</td>
                          <td className="px-6 py-4">
                            <span className={`font-bold ${
                              (result.vina_score || 0) < -8 
                                ? 'text-green-600' 
                                : (result.vina_score || 0) < -6 
                                  ? 'text-yellow-600' 
                                  : isDark ? 'text-gray-300' : 'text-gray-700'
                            }`}>
                              {result.vina_score?.toFixed(2) || '-'}
                            </span>
                            <span className={`text-xs ${subtextClass} ml-1`}>kcal/mol</span>
                          </td>
                          <td className={`px-6 py-4 text-sm ${result.gnina_score ? 'text-purple-600' : subtextClass}`}>
                            {result.gnina_score?.toFixed(2) || '-'}
                          </td>
                          <td className={`px-6 py-4 text-sm ${result.rf_score ? 'text-blue-600' : subtextClass}`}>
                            {result.rf_score?.toFixed(2) || '-'}
                          </td>
                          <td className={`px-6 py-4 text-sm ${result.consensus ? 'text-cyan-600' : subtextClass}`}>
                            {result.consensus?.toFixed(2) || '-'}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`font-bold text-sm ${
                              (result.composite_score ?? result.final_score ?? 0) < -8
                                ? 'text-green-600'
                                : (result.composite_score ?? result.final_score ?? 0) < -6
                                  ? 'text-yellow-600'
                                  : isDark ? 'text-gray-300' : 'text-gray-700'
                            }`}>
                              {(result.composite_score ?? result.final_score ?? result.vina_score)?.toFixed(2) || '-'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <button className={`text-sm font-medium ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'}`} onClick={(e) => { e.stopPropagation(); setSelectedPose(result); }}>
                              Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Scoring Breakdown Panel */}
              {selectedPose && (
                <div className={`${cardBg} rounded-xl ${borderClass} border mb-6`}>
                  <div className={`p-4 ${borderClass} border-b flex items-center justify-between`}>
                    <h2 className={`font-semibold ${textClass}`}>🔬 Scoring Breakdown — {selectedPose.ligand_name || `Pose ${selectedPose.pose_id}`}</h2>
                    <button onClick={() => setSelectedPose(null)} className={`text-sm ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}>✕ Close</button>
                  </div>
                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className={`font-semibold mb-3 ${textClass}`}>Scoring Terms</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className={`text-sm ${subtextClass}`}>Vina Score</span>
                          <span className={`font-mono font-bold ${
                            (selectedPose.vina_score || 0) < -8 ? 'text-green-600' : (selectedPose.vina_score || 0) < -6 ? 'text-yellow-600' : isDark ? 'text-gray-300' : 'text-gray-700'
                          }`}>{selectedPose.vina_score?.toFixed(2) || '-'} kcal/mol</span>
                        </div>
                        {selectedPose.gnina_score != null && (
                          <div className="flex justify-between items-center">
                            <span className={`text-sm ${subtextClass}`}>GNINA CNN Score</span>
                            <span className="font-mono text-purple-600 font-bold">{selectedPose.gnina_score.toFixed(2)}</span>
                          </div>
                        )}
                        {selectedPose.rf_score != null && (
                          <div className="flex justify-between items-center">
                            <span className={`text-sm ${subtextClass}`}>RF Score</span>
                            <span className="font-mono text-blue-600 font-bold">{selectedPose.rf_score.toFixed(2)}</span>
                          </div>
                        )}
                        {selectedPose.hydrophobic_term != null && (
                          <div className="flex justify-between items-center">
                            <span className={`text-sm ${subtextClass}`}>Hydrophobic Term</span>
                            <span className="font-mono font-bold">{selectedPose.hydrophobic_term.toFixed(3)}</span>
                          </div>
                        )}
                        {selectedPose.rotatable_penalty != null && (
                          <div className="flex justify-between items-center">
                            <span className={`text-sm ${subtextClass}`}>Rotatable Penalty</span>
                            <span className="font-mono font-bold">{selectedPose.rotatable_penalty.toFixed(3)}</span>
                          </div>
                        )}
                        {selectedPose.lipo_contact != null && (
                          <div className="flex justify-between items-center">
                            <span className={`text-sm ${subtextClass}`}>Lipophilic Contact</span>
                            <span className="font-mono font-bold">{selectedPose.lipo_contact.toFixed(3)}</span>
                          </div>
                        )}
                        {selectedPose.constraint_penalty != null && (
                          <div className="flex justify-between items-center">
                            <span className={`text-sm ${subtextClass}`}>Constraint Penalty</span>
                            <span className="font-mono font-bold text-orange-600">{selectedPose.constraint_penalty.toFixed(3)}</span>
                          </div>
                        )}
                        <div className={`border-t pt-2 mt-2 flex justify-between items-center ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                          <span className={`font-semibold ${textClass}`}>Composite Score</span>
                          <span className={`font-mono font-bold text-lg ${
                            (selectedPose.composite_score ?? selectedPose.final_score ?? 0) < -8 ? 'text-green-600' : (selectedPose.composite_score ?? selectedPose.final_score ?? 0) < -6 ? 'text-yellow-600' : isDark ? 'text-gray-300' : 'text-gray-700'
                          }`}>{(selectedPose.composite_score ?? selectedPose.final_score ?? selectedPose.vina_score)?.toFixed(2) || '-'} kcal/mol</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className={`font-semibold mb-3 ${textClass}`}>Pose Quality Assessment</h3>
                      <div className={`rounded-lg p-4 ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <span className={`w-3 h-3 rounded-full ${(selectedPose.vina_score || 0) < -8 ? 'bg-green-500' : (selectedPose.vina_score || 0) < -6 ? 'bg-yellow-500' : 'bg-red-500'}`} />
                            <span className={`text-sm ${textClass}`}>
                              {(selectedPose.vina_score || 0) < -8 ? 'Strong binding affinity' : (selectedPose.vina_score || 0) < -6 ? 'Moderate binding affinity' : 'Weak binding affinity'}
                            </span>
                          </div>
                          {selectedPose.gnina_score != null && (
                            <div className="flex items-center gap-2">
                              <span className={`w-3 h-3 rounded-full ${selectedPose.gnina_score > 0.5 ? 'bg-green-500' : selectedPose.gnina_score > 0 ? 'bg-yellow-500' : 'bg-red-500'}`} />
                              <span className={`text-sm ${textClass}`}>
                                CNN score: {selectedPose.gnina_score > 0.5 ? 'High pose quality' : selectedPose.gnina_score > 0 ? 'Moderate pose quality' : 'Low pose quality'}
                              </span>
                            </div>
                          )}
                          {selectedPose.consensus != null && (
                            <div className="flex items-center gap-2">
                              <span className={`w-3 h-3 rounded-full ${selectedPose.consensus < -7 ? 'bg-green-500' : selectedPose.consensus < -5 ? 'bg-yellow-500' : 'bg-red-500'}`} />
                              <span className={`text-sm ${textClass}`}>
                                Consensus: {selectedPose.consensus < -7 ? 'Strong agreement between scoring functions' : 'Moderate agreement'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      {selectedPose.pdb_data && (
                        <div className="mt-4">
                          <button className={`text-sm font-medium ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'}`}>
                            📥 Download PDB
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              </>
            )}

            {/* No Results */}
            {selectedResults.length === 0 && selectedJob.status === 'completed' && (
              <div className={`${cardBg} rounded-xl ${borderClass} border p-12 text-center`}>
                <div className="text-4xl mb-3">📊</div>
                <p className={`${subtextClass}`}>No results available for this job</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <svg className={`w-20 h-20 mx-auto ${isDark ? 'text-gray-600' : 'text-gray-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className={`mt-4 ${subtextClass}`}>Select a job from the history to view results</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
