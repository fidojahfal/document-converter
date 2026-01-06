export default function Hero() {
  return (
    <div className="glass rounded-3xl p-8 md:p-10">
      <div className="mb-4 flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-slate-300">
        <span className="inline-flex h-8 items-center rounded-full bg-white/10 px-4 text-[11px] font-semibold text-cyan-200">
          DocVerter
        </span>
        <span>Document Converter lintas format</span>
      </div>
      <h1 className="text-4xl font-semibold leading-tight text-white sm:text-5xl">
        Ubah DOCX, PDF, atau TXT jadi format lain dalam hitungan detik.
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-slate-200">
        Unggah dokumen, pilih format tujuan, dan langsung unduh. Konversi berbasis teks untuk dokumen ringan dan siap dibagikan.
      </p>
      <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-300">
        <span className="rounded-full bg-white/10 px-4 py-2">DOCX → PDF</span>
        <span className="rounded-full bg-white/10 px-4 py-2">TXT → DOCX</span>
        <span className="rounded-full bg-white/10 px-4 py-2">PDF → TXT</span>
      </div>
    </div>
  );
}
