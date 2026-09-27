import { motion } from 'framer-motion';

export default function EventDetailSkeleton() {
  return (
    <div className="container-app py-10">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="skeleton h-64 md:h-80 rounded-2xl" />
          <div className="flex gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton h-16 w-24 rounded-xl" />
            ))}
          </div>
          <div className="space-y-3">
            <div className="skeleton h-8 w-3/4 rounded-lg" />
            <div className="skeleton h-4 w-1/2 rounded-lg" />
            <div className="skeleton h-4 w-1/3 rounded-lg" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.1 }}
                className="glass-sm p-4 space-y-2"
              >
                <div className="skeleton h-8 w-8 rounded-lg" />
                <div className="skeleton h-4 w-2/3 rounded-lg" />
                <div className="skeleton h-3 w-1/2 rounded-lg" />
              </motion.div>
            ))}
          </div>
          <div className="glass-sm p-6 space-y-3">
            <div className="skeleton h-6 w-1/3 rounded-lg" />
            <div className="skeleton h-4 w-full rounded-lg" />
            <div className="skeleton h-4 w-full rounded-lg" />
            <div className="skeleton h-4 w-2/3 rounded-lg" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="glass-sm p-4 space-y-2">
                <div className="skeleton h-10 w-10 rounded-xl mx-auto" />
                <div className="skeleton h-3 w-2/3 rounded-lg mx-auto" />
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="glass p-5 sticky top-20 space-y-4">
            <div className="skeleton h-6 w-2/3 rounded-lg" />
            <div className="skeleton h-4 w-1/3 rounded-lg" />
            <div className="skeleton h-10 w-full rounded-xl" />
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="skeleton h-16 rounded-xl" />
              ))}
            </div>
            <div className="skeleton h-12 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
