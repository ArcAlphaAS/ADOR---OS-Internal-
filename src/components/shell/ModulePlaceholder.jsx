import { motion } from 'framer-motion'

// Same max-width as HomeScreen — every module shares one layout container
// width so the shell feels consistent as each placeholder gets built out.
export default function ModulePlaceholder({ name }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="mx-auto flex h-full w-full max-w-[1680px] flex-col items-center justify-center px-12"
    >
      <span className="text-[24px] font-semibold text-[#F5F5F5]">{name}</span>
      <span className="mt-2 text-[14px] font-light text-[#444444]">En construcción</span>
    </motion.div>
  )
}
