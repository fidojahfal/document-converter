const features = [
  {
    title: "Konversi dua arah",
    body: "Ubah DOCX ↔ PDF ↔ TXT untuk alur kerja cepat tanpa aplikasi berat.",
  },
  {
    title: "Berbasis teks",
    body: "Ideal untuk kontrak, catatan meeting, atau draft artikel yang fokus ke isi.",
  },
  {
    title: "Langsung unduh",
    body: "Tidak ada email atau antrian. File siap dipakai begitu selesai diproses.",
  },
];

export default function FeatureGrid() {
  return (
    <section className="grid gap-4 md:grid-cols-3">
      {features.map((item) => (
        <div key={item.title} className="glass rounded-2xl p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Fitur</p>
          <h3 className="mt-2 text-lg font-semibold text-white">{item.title}</h3>
          <p className="mt-2 text-sm text-slate-300">{item.body}</p>
        </div>
      ))}
    </section>
  );
}
