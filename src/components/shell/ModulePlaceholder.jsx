import { motion } from 'framer-motion'

export default function ModulePlaceholder({ name }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="flex h-full w-full flex-col items-center justify-center"
    >
      <span className="text-[24px] font-semibold text-[#F5F5F5]">{name}</span>
      <span className="mt-2 text-[14px] font-light text-[#444444]">En construcción</span>
    </motion.div>
  )
}
