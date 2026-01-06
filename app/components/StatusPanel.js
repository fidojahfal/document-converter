export default function StatusPanel({ message, fileMeta, downloadUrl, downloadName }) {
  return (
    <div className="glass rounded-3xl p-6 md:p-7">
      <div className="flex flex-col gap-4 text-sm text-slate-200">
        <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Status</p>
            <p className="text-base font-medium text-white">{message || "Siap mulai"}</p>
          </div>
          <span className="text-xs text-slate-300">Max 8MB</span>
        </div>
        <div className="rounded-2xl bg-white/5 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">File</p>
          <p className="text-base font-medium text-white">{fileMeta}</p>
        </div>
        <div className="rounded-2xl bg-white/5 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Hasil</p>
          {downloadUrl ? (
            <a
              href={downloadUrl}
              download={downloadName}
              className="inline-flex items-center gap-2 text-cyan-200 underline underline-offset-4"
            >
              Unduh {downloadName}
              <span aria-hidden>↘</span>
            </a>
          ) : (
            <p className="text-base text-slate-300">Belum ada output</p>
          )}
        </div>
      </div>
    </div>
  );
}
