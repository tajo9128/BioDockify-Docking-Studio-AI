import { useState, useEffect } from 'react'

interface InteractionData {
  hydrogen_bonds: Array<{
    donor_resname?: string; donor_resseq?: number; donor_chain?: string; donor_atom?: string;
    acceptor_resname?: string; acceptor_resseq?: number; acceptor_chain?: string; acceptor_atom?: string;
    donor_idx?: number; acceptor_idx?: number;
    distance: number; type?: string;
  }>
  hydrophobic_contacts: Array<{
    residue: string; resseq: number; chain: string; atom: string;
    ligand_idx: number; distance: number;
  }>
  pi_stacking: Array<{
    residue: string; resseq: number; chain: string; distance: number; type: string;
  }>
  pi_cation: Array<{
    residue: string; resseq: number; chain: string; ligand_idx: number; distance: number; type: string;
  }>
  salt_bridges: Array<{
    residue: string; resseq: number; chain: string; ligand_idx: number; distance: number; type: string;
  }>
  binding_site_residues: Array<{ resname: string; resseq: number; chain: string }>
  summary?: {
    total_hbonds: number; total_hydrophobic: number; total_pi_stacking: number;
    total_pi_cation: number; total_salt_bridges: number; binding_site_size: number;
  }
  error?: string;
}

interface InteractionPanelProps {
  ligandPdb: string;
  receptorPdb: string;
  isDark: boolean;
}

export function InteractionPanel({ ligandPdb, receptorPdb, isDark }: InteractionPanelProps) {
  const [interactions, setInteractions] = useState<InteractionData | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'summary' | 'hbonds' | 'hydrophobic' | 'pi' | 'salt'>('summary')

  useEffect(() => {
    if (!ligandPdb || !receptorPdb) return
    setLoading(true)
    fetch('/api/interactions/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ligand_pdb: ligandPdb, receptor_pdb: receptorPdb })
    })
      .then(r => r.json())
      .then(data => { setInteractions(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [ligandPdb, receptorPdb])

  if (loading) {
    return (
      <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        <p className="text-sm text-gray-500 text-center py-4">Calculating interactions...</p>
      </div>
    )
  }

  if (!interactions || interactions.error) {
    return (
      <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        <p className="text-sm text-gray-500 text-center py-4">
          {interactions?.error || 'No interactions to display'}
        </p>
      </div>
    )
  }

  const s = interactions.summary

  const tabs = [
    { key: 'summary' as const, label: 'Summary', count: null, icon: '📊' },
    { key: 'hbonds' as const, label: 'H-Bonds', count: s?.total_hbonds, icon: '💧' },
    { key: 'hydrophobic' as const, label: 'Hydrophobic', count: s?.total_hydrophobic, icon: '🟡' },
    { key: 'pi' as const, label: 'π-Stacking', count: (s?.total_pi_stacking || 0) + (s?.total_pi_cation || 0), icon: '⬡' },
    { key: 'salt' as const, label: 'Salt Bridges', count: s?.total_salt_bridges, icon: '⚡' },
  ]

  return (
    <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
      <h3 className="font-semibold mb-3">🔬 Protein-Ligand Interactions</h3>

      <div className="flex gap-1 mb-3 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 text-xs rounded-lg whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? isDark ? 'bg-cyan-600 text-white' : 'bg-cyan-100 text-cyan-700'
                : isDark ? 'bg-gray-700 text-gray-400 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.icon} {tab.label}
            {tab.count !== null && tab.count !== undefined && tab.count > 0 && (
              <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${
                isDark ? 'bg-gray-600' : 'bg-gray-200'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'summary' && s && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'H-Bonds', value: s.total_hbonds, color: 'bg-blue-500' },
              { label: 'Hydrophobic', value: s.total_hydrophobic, color: 'bg-yellow-500' },
              { label: 'π-Stacking', value: s.total_pi_stacking, color: 'bg-purple-500' },
              { label: 'π-Cation', value: s.total_pi_cation, color: 'bg-pink-500' },
              { label: 'Salt Bridges', value: s.total_salt_bridges, color: 'bg-red-500' },
              { label: 'Binding Site', value: s.binding_site_size, color: 'bg-green-500' },
            ].map(item => (
              <div key={item.label} className={`p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${item.color}`} />
                  <span className="text-xs text-gray-500">{item.label}</span>
                </div>
                <p className="text-2xl font-bold mt-1">{item.value}</p>
              </div>
            ))}
          </div>
          {interactions.binding_site_residues.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium mb-1">Binding Site Residues:</p>
              <div className="flex flex-wrap gap-1">
                {interactions.binding_site_residues.map((r, i) => (
                  <span key={i} className={`px-2 py-0.5 rounded text-xs ${
                    isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {r.resname}{r.resseq}{r.chain}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'hbonds' && (
        <div className="space-y-1">
          {interactions.hydrogen_bonds.length === 0 ? (
            <p className="text-xs text-gray-500 py-2">No hydrogen bonds detected</p>
          ) : (
            interactions.hydrogen_bonds.map((hb, i) => (
              <div key={i} className={`p-2 rounded text-xs ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <div className="flex justify-between">
                  <span>
                    {hb.type === 'protein_donor'
                      ? `${hb.donor_resname}${hb.donor_resseq}(${hb.donor_chain}):${hb.donor_atom}`
                      : `Ligand:${hb.donor_idx}`}
                    {' → '}
                    {hb.type === 'protein_donor'
                      ? `Ligand:${hb.acceptor_idx}`
                      : `${hb.acceptor_resname}${hb.acceptor_resseq}(${hb.acceptor_chain}):${hb.acceptor_atom}`}
                  </span>
                  <span className="font-mono font-bold">{hb.distance} Å</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'hydrophobic' && (
        <div className="space-y-1">
          {interactions.hydrophobic_contacts.length === 0 ? (
            <p className="text-xs text-gray-500 py-2">No hydrophobic contacts</p>
          ) : (
            interactions.hydrophobic_contacts.slice(0, 20).map((hc, i) => (
              <div key={i} className={`p-2 rounded text-xs ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <div className="flex justify-between">
                  <span>{hc.residue}{hc.resseq}({hc.chain}):{hc.atom} ↔ Lig:{hc.ligand_idx}</span>
                  <span className="font-mono">{hc.distance} Å</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'pi' && (
        <div className="space-y-1">
          {interactions.pi_stacking.length === 0 && interactions.pi_cation.length === 0 ? (
            <p className="text-xs text-gray-500 py-2">No π interactions</p>
          ) : (
            <>
              {interactions.pi_stacking.map((pi, i) => (
                <div key={`pi-${i}`} className={`p-2 rounded text-xs ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div className="flex justify-between">
                    <span>π-π: {pi.residue}{pi.resseq}({pi.chain})</span>
                    <span className="font-mono">{pi.distance} Å</span>
                  </div>
                </div>
              ))}
              {interactions.pi_cation.map((pc, i) => (
                <div key={`pc-${i}`} className={`p-2 rounded text-xs ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div className="flex justify-between">
                    <span>π-Cation: {pc.residue}{pc.resseq}({pc.chain})</span>
                    <span className="font-mono">{pc.distance} Å</span>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {activeTab === 'salt' && (
        <div className="space-y-1">
          {interactions.salt_bridges.length === 0 ? (
            <p className="text-xs text-gray-500 py-2">No salt bridges</p>
          ) : (
            interactions.salt_bridges.map((sb, i) => (
              <div key={i} className={`p-2 rounded text-xs ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <div className="flex justify-between">
                  <span>Salt: {sb.residue}{sb.resseq}({sb.chain}) ↔ Lig:{sb.ligand_idx}</span>
                  <span className="font-mono">{sb.distance} Å</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
