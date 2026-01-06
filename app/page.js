"use client";

import { useEffect, useMemo, useState } from "react";
import FeatureGrid from "./components/FeatureGrid";
import Hero from "./components/Hero";
import PreviewPanel from "./components/PreviewPanel";
import StatusPanel from "./components/StatusPanel";
import UploadSection from "./components/UploadSection";

const targets = [
  { id: "pdf", label: "PDF", hint: "Siap cetak & bagikan" },
  { id: "docx", label: "DOCX", hint: "Editable di Word" },
  { id: "txt", label: "TXT", hint: "Ringan & cepat" },
];

const formatBytes = (bytes = 0) => {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** i).toFixed(1)} ${units[i]}`;
};

export default function Home() {
  const [file, setFile] = useState(null);
  const [target, setTarget] = useState("pdf");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [downloadName, setDownloadName] = useState("");
  const [preview, setPreview] = useState("");

  useEffect(() => {
    return () => {
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    };
  }, [downloadUrl]);

  const handleFileChange = async (event) => {
    const picked = event.target.files?.[0];
    setFile(picked ?? null);
    setMessage("");
    setDownloadUrl("");
    setPreview("");

    if (!picked) return;

    if (picked.type === "text/plain") {
      const text = await picked.text();
      setPreview(text.slice(0, 1200));
    } else {
      setPreview("Pratinjau hanya tersedia untuk file TXT. DOCX/PDF akan diproses sebagai teks.");
    }
  };

  const handleConvert = async () => {
    if (!file) {
      setMessage("Unggah file terlebih dahulu.");
      return;
    }

    setIsLoading(true);
    setMessage("Memproses dokumen...");
    setDownloadUrl("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("target", target);

      const response = await fetch("/api/convert", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Konversi gagal");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setDownloadName(`${file.name.split(".").shift()}_converted.${target}`);
      setMessage("Berhasil! Dokumen siap diunduh.");
    } catch (error) {
      setMessage(error.message || "Terjadi kesalahan tak terduga.");
    } finally {
      setIsLoading(false);
    }
  };

  const fileMeta = useMemo(() => {
    if (!file) return "Belum ada file";
    return `${file.name} • ${formatBytes(file.size)}`;
  }, [file]);

  return (
    <div className="relative min-h-screen overflow-hidden px-6 py-16 sm:px-10">
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute left-10 top-10 h-48 w-48 rounded-full bg-cyan-400/30 glow" />
        <div className="absolute bottom-20 right-16 h-56 w-56 rounded-full bg-indigo-500/25 glow" />
        <div className="grid-accent absolute inset-0" />
      </div>

      <div className="relative mx-auto flex max-w-6xl flex-col gap-12">
        <header className="grid gap-6 md:grid-cols-[1.4fr_1fr] md:items-center">
          <Hero />
          <StatusPanel
            message={message}
            fileMeta={fileMeta}
            downloadUrl={downloadUrl}
            downloadName={downloadName}
          />
        </header>

        <main className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <UploadSection
            onFileChange={handleFileChange}
            targets={targets}
            target={target}
            onTargetChange={setTarget}
            onConvert={handleConvert}
            isLoading={isLoading}
          />

          <PreviewPanel
            fileName={file?.name}
            preview={preview}
            downloadName={downloadName}
            target={target}
          />
        </main>

        <FeatureGrid />
      </div>
    </div>
  );
}
