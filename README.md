# DocVerter - Document Converter

Aplikasi web untuk mengonversi dokumen antar format (DOCX, PDF, TXT) dengan mempertahankan format, tabel, dan struktur dokumen asli.

## Fitur Utama

- **Konversi Multi-Format**: DOCX ↔ PDF ↔ TXT
- **Pertahankan Format**: Tabel, heading, dan struktur dokumen dipertahankan
- **Modern UI**: Interface dengan Tailwind CSS dan glass morphism design
- **Instant Download**: Hasil langsung bisa diunduh tanpa antrian

## Teknologi

- **Frontend**: Next.js 16, React 19, Tailwind CSS 4
- **Conversion**: 
  - mammoth (DOCX → HTML)
  - html-pdf-node + puppeteer (HTML → PDF)
  - docx library (HTML → DOCX)
  - pdf-parse (PDF parsing)

## Instalasi

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Cara Penggunaan

1. Upload file TXT, DOCX, atau PDF (maksimal 8MB)
2. Pilih format tujuan
3. Klik "Konversi sekarang"
4. Download hasil konversi

## Catatan

- Konversi mempertahankan tabel dan formatting
- Gambar kompleks mungkin tidak tersimpan sempurna
- File terenkripsi tidak didukung

## Development

```bash
npm run dev      # Development server
npm run build    # Production build
npm run start    # Production server
npm run lint     # ESLint check
```

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
