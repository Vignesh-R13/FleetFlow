// Shows the ACTUAL Socket.IO connection state passed in via `connected` —
// never a hardcoded/fake "live" dot. Callers get `connected` from useSocket().
export default function LiveIndicator({ connected }) {
  if (connected) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-status-active">
        <span className="relative flex w-2 h-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-active opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-status-active" />
        </span>
        LIVE
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-navy-400 dark:text-slate-500">
      <span className="inline-flex rounded-full h-2 w-2 border border-current" />
      RECONNECTING
    </span>
  );
}
