// Generic empty-state block. Reused instead of each page hand-rolling its
// own "no records" markup — keeps icon size, spacing, and copy tone consistent.
export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="p-10 text-center">
      {Icon && <Icon className="w-8 h-8 mx-auto text-navy-300 dark:text-navy-700 mb-2" />}
      <p className="text-sm font-medium text-navy-700 dark:text-slate-300">{title}</p>
      {description && (
        <p className="text-sm text-navy-500 dark:text-slate-400 mt-0.5">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
