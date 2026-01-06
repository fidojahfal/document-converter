export default function UploadSection({
  onFileChange,
  targets,
  target,
  onTargetChange,
  onConvert,
  isLoading,
}) {
  return (
    <section className="glass rounded-3xl p-8 md:p-10">
      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
        <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-cyan-200">1</span>
        Pilih file TXT / DOCX / PDF
        <span className="rounded-full bg-indigo-400/10 px-3 py-1 text-indigo-200">2</span>
        Pilih format tujuan
        <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-emerald-200">3</span>
        Konversi & unduh
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-[2fr_1fr]">
        <label className="group relative flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-white/20 bg-white/5 p-6 text-center transition hover:border-cyan-200/70 hover:bg-white/10">
          <input
            type="file"
            accept=".txt,.docx,.pdf"
            className="absolute inset-0 cursor-pointer opacity-0"
            onChange={onFileChange}
          />
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-2xl text-cyan-200">
              ⇪
            </div>
            <div>
              <p className="text-lg font-semibold text-white">Tarik atau pilih file</p>
              <p className="text-sm text-slate-300">TXT, DOCX, atau PDF • Maks 8MB</p>
            </div>
          </div>
        </label>

        <div className="flex flex-col gap-3">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Format tujuan</p>
          <div className="grid grid-cols-3 gap-2">
            {targets.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onTargetChange(item.id)}
                className={`rounded-xl border px-3 py-3 text-left transition ${
                  target === item.id
                    ? "border-cyan-300/80 bg-cyan-300/10 text-white"
                    : "border-white/15 bg-white/5 text-slate-200 hover:border-cyan-200/50"
                }`}
              >
                <p className="text-base font-semibold">{item.label}</p>
                <p className="text-xs text-slate-300">{item.hint}</p>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onConvert}
            disabled={isLoading}
            className="mt-2 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-400 px-5 py-3 text-base font-semibold text-slate-900 shadow-lg shadow-cyan-500/25 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "Memproses..." : "Konversi sekarang"}
          </button>

          <p className="text-xs text-slate-300">
            Catatan: Konversi berbasis teks. Dokumen yang memiliki gambar atau elemen kompleks akan diekspor sebagai teks.
          </p>
        </div>
      </div>
    </section>
  );
}
