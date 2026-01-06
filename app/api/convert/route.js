import { NextResponse } from "next/server";
import { convertDocument } from "@/lib/libreoffice";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

const contentTypes = {
	pdf: "application/pdf",
	txt: "text/plain; charset=utf-8",
	docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

const getExtension = (name = "") => name.split(".").pop()?.toLowerCase();

function toDownloadResponse(buffer, target, sourceName) {
	const filename = `${sourceName}_converted.${target}`;
	return new Response(buffer, {
		headers: {
			"Content-Type": contentTypes[target] || "application/octet-stream",
			"Content-Disposition": `attachment; filename="${filename}"`,
		},
	});
}

export async function POST(request) {
	try {
		const formData = await request.formData();
		const file = formData.get("file");
		const target = formData.get("target");

		if (!file || !(file instanceof File)) {
			return NextResponse.json(
				{ error: "File belum dipilih." },
				{ status: 400 }
			);
		}

		if (!target || !contentTypes[target]) {
			return NextResponse.json(
				{ error: "Format tujuan tidak valid." },
				{ status: 400 }
			);
		}

		if (file.size > MAX_UPLOAD_BYTES) {
			return NextResponse.json(
				{ error: "Ukuran file terlalu besar (maks 8MB)." },
				{ status: 413 }
			);
		}

		const sourceExt = getExtension(file.name);
		if (!["txt", "docx", "pdf"].includes(sourceExt)) {
			return NextResponse.json(
				{ error: "Format sumber harus TXT, DOCX, atau PDF." },
				{ status: 400 }
			);
		}

		// Jika source dan target sama, return error
		if (sourceExt === target) {
			return NextResponse.json(
				{ error: `File sudah dalam format ${target.toUpperCase()}.` },
				{ status: 400 }
			);
		}

		const buffer = Buffer.from(await file.arrayBuffer());
		const sourceName = file.name.replace(/\.[^/.]+$/, "");

		// Convert menggunakan LibreOffice
		const convertedBuffer = await convertDocument(buffer, sourceExt, target);

		return toDownloadResponse(convertedBuffer, target, sourceName);
	} catch (error) {
		console.error("Conversion error:", error);
		return NextResponse.json(
			{
				error: error.message || "Gagal mengonversi dokumen. Pastikan LibreOffice terinstall.",
			},
			{ status: 500 }
		);
	}
}
