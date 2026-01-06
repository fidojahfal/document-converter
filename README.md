# DocVerter - Document Converter

Aplikasi web untuk mengonversi dokumen antar format (DOCX, PDF, TXT) menggunakan LibreOffice untuk hasil konversi yang akurat dan berkualitas tinggi.

## Fitur Utama

- **Konversi Multi-Format**: DOCX ↔ PDF ↔ TXT (semua arah)
- **Powered by LibreOffice**: Menggunakan LibreOffice untuk konversi berkualitas profesional
- **Pertahankan Format**: Format, tabel, gambar, dan struktur dokumen dipertahankan
- **Modern UI**: Interface dengan Tailwind CSS dan glass morphism design
- **Instant Download**: Hasil langsung bisa diunduh

## Teknologi

- **Frontend**: Next.js 16, React 19, Tailwind CSS 4
- **Conversion Engine**: LibreOffice (via libreoffice-convert)
- **Runtime**: Node.js (local development only)

## Instalasi

### 1. Install LibreOffice

**Windows:**
```bash
winget install -e --id TheDocumentFoundation.LibreOffice
```

**macOS:**
```bash
brew install --cask libreoffice
```

**Linux:**
```bash
sudo apt-get install libreoffice
```

### 2. Install Dependencies & Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Cara Penggunaan

1. Upload file TXT, DOCX, atau PDF (maksimal 8MB)
2. Pilih format tujuan
3. Klik "Konversi sekarang"
4. Download hasil konversi

## Supported Conversions

| From | To | Status |
|------|-----|--------|
| DOCX | PDF | ✅ |
| DOCX | TXT | ✅ |
| PDF | DOCX | ✅ |
| PDF | TXT | ✅ |
| TXT | DOCX | ✅ |
| TXT | PDF | ✅ |

## Catatan Deployment

⚠️ **Aplikasi ini untuk LOCAL DEVELOPMENT ONLY**

LibreOffice memerlukan binary executable yang tidak tersedia di serverless platforms seperti Vercel. Untuk production deployment, gunakan:
- VPS/Dedicated server dengan LibreOffice terinstall
- Docker container dengan LibreOffice
- Alternatif: Cloud document conversion services (Google Docs API, CloudConvert, dll)

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
