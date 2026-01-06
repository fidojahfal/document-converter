export default function PreviewPanel({ fileName, preview, downloadName, target }) {
  return (
    <aside className="glass rounded-3xl p-7 md:p-8">
      <div className="flex items-center justify-between">
        <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Pratinjau</p>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200">
          {fileName || "Belum ada"}
        </span>
      </div>
      <div className="mt-3 h-56 overflow-auto rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-slate-100">
        {preview || "Pratinjau muncul di sini (TXT saja)."}
      </div>

      <div className="mt-6 space-y-3 text-sm text-slate-300">
        <div className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3">
          <span>Output</span>
          <span className="text-white">{downloadName || `converted.${target}`}</span>
        </div>
        <div className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3">
          <span>Estimasi</span>
          <span className="text-white">&lt; 5 detik untuk &lt; 1MB</span>
        </div>
        <div className="rounded-xl bg-white/5 px-4 py-3 text-xs leading-relaxed text-slate-300">
          Hasil konversi bisa langsung diunduh. Jika PDF terasa kosong, pastikan file sumber tidak terenkripsi atau terdiri dari teks asli (bukan hasil scan gambar).
        </div>
      </div>
    </aside>
  );
}
