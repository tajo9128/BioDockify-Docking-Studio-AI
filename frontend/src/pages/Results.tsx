import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/apiClient'

interface DockingResult {
  id: number
  job_uuid: string
  ligand_name: string
  vina_score: number
  gnina_score: number | null
  rf_score: number | null
  pdb_data: string
}

interface Job {
  id: string
  job_uuid: string
  job_name: string
  job_type: string
  status: string
  created_at: string
  completed_at: string | null
  docking_results?: DockingResult[]
}

export function Results() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [activeTab, setActiveTab] = useState<'all' | 'docking' | 'md' | 'qsar'>('all')

  useEffect(() => {
    apiClient.get('/jobs')
      .then(({ data }) => {
        const jobs = Array.isArray(data) ? data : (data.jobs ?? [])
        setJobs(jobs)
        if (jobs.length > 0) setSelectedJob(jobs[0])
      })
      .catch(console.error)
  }, [])

  const filteredJobs = jobs.filter(job => {
    if (activeTab === 'all') return true
    if (activeTab === 'docking') return job.job_type === 'docking'
    if (activeTab === 'md') return job.job_type === 'md'
    if (activeTab === 'qsar') return job.job_type === 'qsar'
    return true
  })

  return (
    <div className="h-full flex">
      <div className="w-72 bg-gray-50 border-r border-gray-200 overflow-y-auto">
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Results</h2>
          <div className="flex gap-2 mt-3">
            {(['all', 'docking', 'md', 'qsar'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                  activeTab === tab
                    ? 'bg-cyan-100 text-cyan-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {filteredJobs.map(job => (
            <button
              key={job.id}
              onClick={() => setSelectedJob(job)}
              className={`w-full p-4 text-left hover:bg-gray-100 transition-colors ${
                selectedJob?.id === job.id ? 'bg-cyan-50 border-l-4 border-cyan-500' : ''
              }`}
            >
              <p className="font-medium text-gray-900 truncate">{job.job_name}</p>
              <p className="text-xs text-gray-500 mt-1">{job.job_type}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`w-2 h-2 rounded-full ${
                  job.status === 'completed' ? 'bg-green-500' :
                  job.status === 'running' ? 'bg-yellow-500' :
                  job.status === 'failed' ? 'bg-red-500' : 'bg-gray-400'
                }`}></span>
                <span className="text-xs text-gray-500">{job.status}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {selectedJob ? (
          <div className="p-6">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">{selectedJob.job_name}</h1>
              <p className="text-gray-500 mt-1">
                {selectedJob.job_type} - Created {new Date(selectedJob.created_at).toLocaleString()}
              </p>
            </div>

            {selectedJob.job_type === 'docking' && selectedJob.docking_results && (
              <div className="bg-white rounded-lg shadow-sm">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="font-semibold text-gray-900">Docking Poses</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pose</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ligand</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vina Score</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">CNN Score</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">RF Score</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {selectedJob.docking_results.map((result, i) => (
                        <tr key={result.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">{i + 1}</td>
                          <td className="px-6 py-4 text-sm text-gray-500">{result.ligand_name}</td>
                          <td className="px-6 py-4 text-sm font-bold text-cyan-600">
                            {result.vina_score?.toFixed(2)} kcal/mol
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {result.gnina_score?.toFixed(2) || '-'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {result.rf_score?.toFixed(2) || '-'}
                          </td>
                          <td className="px-6 py-4">
                            <button className="text-cyan-600 hover:text-cyan-800 text-sm font-medium">
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {selectedJob.status !== 'completed' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
                <p className="text-yellow-800">
                  Job status: {selectedJob.status}
                  {selectedJob.status === 'failed' && ' - Check logs for details'}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <svg className="w-16 h-16 text-gray-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="mt-4 text-gray-500">Select a job to view results</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
