import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { apiClient } from '@/lib/apiClient'

interface Stats {
  totalJobs: number
  completedJobs: number
  runningJobs: number
  failedJobs: number
}

interface RecentJob {
  id: string
  name: string
  type: string
  status: string
  created_at: string
}

export function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    totalJobs: 0,
    completedJobs: 0,
    runningJobs: 0,
    failedJobs: 0
  })
  const [recentJobs, setRecentJobs] = useState<RecentJob[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient.get('/jobs')
      .then(({ data }) => {
        const jobs = Array.isArray(data) ? data : (data.jobs ?? [])
        setRecentJobs(jobs.slice(0, 5))
        setStats({
          totalJobs: jobs.length,
          completedJobs: jobs.filter((j: any) => j.status?.toLowerCase() === 'completed').length,
          runningJobs: jobs.filter((j: any) => j.status?.toLowerCase() === 'running').length,
          failedJobs: jobs.filter((j: any) => j.status?.toLowerCase() === 'failed').length
        })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const statCards = [
    { label: 'Total Jobs', value: stats.totalJobs, color: 'border-blue-500', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
    { label: 'Completed', value: stats.completedJobs, color: 'border-green-500', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
    { label: 'Running', value: stats.runningJobs, color: 'border-cyan-500', icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' },
    { label: 'Failed', value: stats.failedJobs, color: 'border-red-500', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' }
  ]

  const quickActions = [
    { path: '/docking', title: 'New Docking', desc: 'Start a molecular docking simulation', icon: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z' },
    { path: '/viewer', title: 'View Molecules', desc: 'Open 3D molecular viewer', icon: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' },
    { path: '/md', title: 'MD Simulation', desc: 'Run molecular dynamics', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { path: '/ai', title: 'AI Assistant', desc: 'Chat with BioDockify AI', icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z' }
  ]

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome to BioDockify</p>
      </div>

      <div className="grid grid-cols-4 gap-6 mb-8">
        {statCards.map((card, i) => (
          <div key={i} className={`bg-white rounded-lg shadow-sm border-l-4 ${card.color} p-4`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{loading ? '-' : card.value}</p>
              </div>
              <div className="p-3 bg-gray-100 rounded-lg">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={card.icon} />
                </svg>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6 mb-8">
        {quickActions.map((action, i) => (
          <Link
            key={i}
            to={action.path}
            className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow group"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-cyan-50 rounded-lg group-hover:bg-cyan-100 transition-colors">
                <svg className="w-6 h-6 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={action.icon} />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 group-hover:text-cyan-600 transition-colors">{action.title}</h3>
                <p className="text-sm text-gray-500 mt-1">{action.desc}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Recent Jobs</h2>
        </div>
        <div className="p-6">
          {recentJobs.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No jobs yet. Start a docking simulation to see results here.</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500">
                  <th className="pb-3 font-medium">Name</th>
                  <th className="pb-3 font-medium">Type</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {recentJobs.map((job, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="py-3">{job.name}</td>
                    <td className="py-3 text-gray-500">{job.type}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        job.status === 'completed' ? 'bg-green-100 text-green-700' :
                        job.status === 'running' ? 'bg-cyan-100 text-cyan-700' :
                        job.status === 'failed' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="py-3 text-gray-500">{new Date(job.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
