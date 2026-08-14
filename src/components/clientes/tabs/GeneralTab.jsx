import { useState } from 'react'
import { updateClient } from '../../../lib/firestore'

const labelClass = 'mb-1.5 block font-medium text-[#444444]'
const labelStyle = { fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }
const inputClass =
  'w-full rounded-xl border border-white/[0.08] bg-[#1A1A1A] px-3.5 py-[10px] text-[13px] text-[#F5F5F5] placeholder:text-[#444444] outline-none transition-colors duration-150 focus:border-white/[0.2]'

function Field({ client, field, label, placeholder, textarea, type = 'text' }) {
  const [value, setValue] = useState(client[field] || '')
  const Tag = textarea ? 'textarea' : 'input'

  return (
    <div>
      <label className={labelClass} style={labelStyle}>
        {label}
      </label>
      <Tag
        type={textarea ? undefined : type}
        rows={textarea ? 3 : undefined}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => {
          if (value !== (client[field] || '')) updateClient(client.id, { [field]: value })
        }}
        placeholder={placeholder}
        className={`${inputClass} ${textarea ? 'resize-none' : ''}`}
      />
    </div>
  )
}

export default function GeneralTab({ client }) {
  return (
    <div className="flex flex-col gap-5">
      <Field client={client} field="industria" label="Industria" placeholder="Ej. Retail, Fintech..." />
      <Field client={client} field="revenueEstimado" label="Revenue estimado (soles)" type="number" placeholder="0" />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass} style={labelStyle}>
            Website
          </label>
          {client.website ? (
            <a
              href={client.website.startsWith('http') ? client.website : `https://${client.website}`}
              target="_blank"
              rel="noreferrer"
              className="block truncate text-[13px] text-[#1E5FAD] hover:underline"
            >
              {client.website}
            </a>
          ) : (
            <Field client={client} field="website" label="" placeholder="empresa.com" />
          )}
        </div>
        <div>
          <label className={labelClass} style={labelStyle}>
            LinkedIn
          </label>
          {client.linkedin ? (
            <a
              href={client.linkedin.startsWith('http') ? client.linkedin : `https://${client.linkedin}`}
              target="_blank"
              rel="noreferrer"
              className="block truncate text-[13px] text-[#1E5FAD] hover:underline"
            >
              Ver perfil
            </a>
          ) : (
            <Field client={client} field="linkedin" label="" placeholder="linkedin.com/company/..." />
          )}
        </div>
      </div>

      <Field
        client={client}
        field="fracturaIdentificada"
        label="Fractura identificada"
        placeholder="¿Cuál es el problema central detectado?"
        textarea
      />
      <Field client={client} field="iaa" label="IAA" placeholder="—" />

      <div className="h-px bg-white/[0.06]" />

      <span className={labelClass} style={labelStyle}>
        Contacto Principal
      </span>
      <div className="-mt-3 grid grid-cols-2 gap-3">
        <Field client={client} field="contactName" label="Nombre" placeholder="Nombre completo" />
        <Field client={client} field="contactRole" label="Cargo" placeholder="CEO, Founder..." />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass} style={labelStyle}>
            Email
          </label>
          {client.contactEmail ? (
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(client.contactEmail)}
              className="block truncate text-left text-[13px] text-[#F5F5F5] hover:text-[#1E5FAD]"
              title="Click para copiar"
            >
              {client.contactEmail}
            </button>
          ) : (
            <Field client={client} field="contactEmail" label="" placeholder="correo@empresa.com" />
          )}
        </div>
        <div>
          <label className={labelClass} style={labelStyle}>
            WhatsApp
          </label>
          {client.contactWhatsapp ? (
            <a
              href={`https://wa.me/${client.contactWhatsapp.replace(/\D/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="block truncate text-[13px] text-[#1E5FAD] hover:underline"
            >
              {client.contactWhatsapp}
            </a>
          ) : (
            <Field client={client} field="contactWhatsapp" label="" placeholder="+51 999 999 999" />
          )}
        </div>
      </div>

      <div className="h-px bg-white/[0.06]" />

      <Field client={client} field="notes" label="Notas internas" placeholder="Notas privadas del equipo..." textarea />
    </div>
  )
}
