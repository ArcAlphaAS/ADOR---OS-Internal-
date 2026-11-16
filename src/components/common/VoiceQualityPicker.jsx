import { useState } from 'react'
import { VOICE_QUALITIES, readVoiceQuality, saveVoiceQuality } from '../../lib/voiceQuality'

// Control segmentado para elegir cómo se graban las notas de voz.
export default function VoiceQualityPicker({ compact = false }) {
  const [q, setQ] = useState(readVoiceQuality)
  const pick = (id) => {
    setQ(id)
    saveVoiceQuality(id)
  }
  const current = VOICE_QUALITIES.find((x) => x.id === q)
  return (
    <div>
      <div className={`flex gap-1 rounded-xl bg-white/[0.07] p-1 ${compact ? '' : ''}`}>
        {VOICE_QUALITIES.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => pick(o.id)}
            className={`flex-1 rounded-lg px-2 py-1.5 text-[12.5px] font-medium transition-colors duration-150 ${q === o.id ? 'bg-[#F5F5F5] text-[#111]' : 'text-[#B5B5B5] hover:text-white'}`}
          >
            {o.label}
          </button>
        ))}
      </div>
      <p className="mt-2 px-1 text-[12px] leading-snug text-[#8A8A8A]">{current?.hint}</p>
    </div>
  )
}
