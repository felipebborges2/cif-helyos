'use client'

interface Props {
  isSuspended: boolean
  isWarned: boolean
}

export default function SuspensionBadge({ isSuspended, isWarned }: Props) {
  if (isSuspended) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-600 text-white">
        🚫 Suspenso
      </span>
    )
  }
  if (isWarned) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-500 text-black">
        ⚠️ Próximo da suspensão
      </span>
    )
  }
  return null
}
