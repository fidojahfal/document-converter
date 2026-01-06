import { NextResponse } from "next/server";
import mammoth from "mammoth";
import pdfParse from "pdf-parse";
import { Document, Packer, Paragraph } from "docx";
import { PDFDocument, StandardFonts } from "pdf-lib";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

const contentTypes = {
	pdf: "application/pdf",
	txt: "text/plain; charset=utf-8",
	docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

const getExtension = (name = "") => name.split(".").pop()?.toLowerCase();

const wrapLines = (text, maxChars = 88) => {
	return text
		.split(/\r?\n/)
		.flatMap((line) => {
			if (line.length <= maxChars) return line || " ";
			const chunks = [];
			for (let i = 0; i < line.length; i += maxChars) {
				chunks.push(line.slice(i, i + maxChars));
			}
			return chunks;
		})
		.filter(Boolean);
};

async function extractText(buffer, ext) {
	if (ext === "txt") {
		return buffer.toString("utf8");
	}

	if (ext === "docx") {
		const { value } = await mammoth.extractRawText({ buffer });
		return value?.trim() || "";
	}

	if (ext === "pdf") {
		const { text } = await pdfParse(buffer);
		return text?.trim() || "";
	}

	throw new Error("Format sumber tidak didukung");
}

async function textToDocxBuffer(text) {
	const paragraphs = wrapLines(text || "(kosong)").map(
		(line) => new Paragraph({ text: line || " " })
	);

	const doc = new Document({
		sections: [
			{
				properties: {},
				children: paragraphs,
			},
		],
	});

	const buffer = await Packer.toBuffer(doc);
	return buffer;
}

async function textToPdfBuffer(text) {
	const pdfDoc = await PDFDocument.create();
	let page = pdfDoc.addPage();
	const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
	const fontSize = 12;
	const lineHeight = fontSize * 1.4;
	const margin = 56;
	let { width, height } = page.getSize();
	let y = height - margin;

	const lines = wrapLines(text || "(kosong)");

	lines.forEach((line) => {
		if (y < margin) {
			page = pdfDoc.addPage();
			({ width, height } = page.getSize());
			y = height - margin;
		}

		page.drawText(line, {
			x: margin,
			y,
			size: fontSize,
			font,
		});

		y -= lineHeight;
	});

	const pdfBytes = await pdfDoc.save();
	return Buffer.from(pdfBytes);
}

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
				{ error: "Ukuran file terlalu besar untuk demo ini (maks 8MB)." },
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

		const buffer = Buffer.from(await file.arrayBuffer());
		const text = await extractText(buffer, sourceExt);
		const sourceName = file.name.split(".").shift();

		if (target === "txt") {
			return toDownloadResponse(Buffer.from(text, "utf8"), "txt", sourceName);
		}

		if (target === "docx") {
			const docxBuffer = await textToDocxBuffer(text);
			return toDownloadResponse(docxBuffer, "docx", sourceName);
		}

		if (target === "pdf") {
			const pdfBuffer = await textToPdfBuffer(text);
			return toDownloadResponse(pdfBuffer, "pdf", sourceName);
		}

		return NextResponse.json(
			{ error: "Format konversi tidak dikenali." },
			{ status: 400 }
		);
	} catch (error) {
		console.error("Conversion error", error);
		return NextResponse.json(
			{
				error: "Gagal mengonversi dokumen. Pastikan file teks dan tidak terenkripsi.",
			},
			{ status: 500 }
		);
	}
}
