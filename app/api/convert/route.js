import { NextResponse } from "next/server";
import mammoth from "mammoth";
import pdfParse from "pdf-parse";
import chromium from "@sparticuz/chromium";

const isDev = process.env.NODE_ENV === "development";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  ExternalHyperlink,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  ImageRun,
} from "docx";
import * as htmlparser2 from "htmlparser2";
import { DomUtils } from "htmlparser2";
import sharp from "sharp";

async function transformImagesInHtml(html) {
  const dom = htmlparser2.parseDocument(html);
  const images = DomUtils.findAll(
    (el) => el.type === "tag" && el.name === "img",
    dom.children
  );

  for (const img of images) {
    const src = img.attribs?.src || "";
    if (!src.startsWith("data:image")) continue;

    try {
      const base64Match = src.match(/base64,(.+)/);
      if (!base64Match) continue;
      const buf = Buffer.from(base64Match[1], "base64");
      const meta = await sharp(buf).metadata();
      const width = meta.width || 0;
      const height = meta.height || 0;
      const aspect = height > 0 ? width / height : 0;
      const isSeparator = aspect > 15 || height <= 5;

      if (isSeparator) {
        img.name = "hr";
        img.attribs = { class: "doc-separator" };
        img.children = [];
      } else {
        if (width && !img.attribs.width) img.attribs.width = String(width);
        if (height && !img.attribs.height) img.attribs.height = String(height);
      }
    } catch (e) {}
  }

  return DomUtils.getOuterHTML(dom);
}

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

const contentTypes = {
  pdf: "application/pdf",
  txt: "text/plain; charset=utf-8",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

const getExtension = (name = "") => name.split(".").pop()?.toLowerCase();

async function docxToHtml(buffer) {
  const result = await mammoth.convertToHtml(
    { buffer },
    {
      styleMap: [
        "p[style-name='Heading 1'] => h1:fresh",
        "p[style-name='Heading 2'] => h2:fresh",
        "p[style-name='Heading 3'] => h3:fresh",
        "p[style-name='Title'] => h1.title:fresh",
        "r[style-name='Strong'] => strong",
        "r[style-name='Emphasis'] => em",
      ],
      includeDefaultStyleMap: true,
      convertImage: mammoth.images.imgElement(async function (image) {
        const imageBuffer = await image.read("base64");
        const contentType = image.contentType || "image/png";
        try {
          const rawBuffer = Buffer.from(imageBuffer, "base64");
          const metadata = await sharp(rawBuffer).metadata();
          const { width = 0, height = 0 } = metadata;
          const aspectRatio = height > 0 ? width / height : 0;
          const isSeparatorLine = aspectRatio > 15 || height <= 5;
          return {
            src: `data:${contentType};base64,${imageBuffer}`,
            alt: isSeparatorLine ? "separator-line" : "Image",
            width,
            height,
          };
        } catch (err) {
          return {
            src: `data:${contentType};base64,${imageBuffer}`,
            alt: "Image",
          };
        }
      }),
    }
  );

  let html = await transformImagesInHtml(result.value);

  html = html.replace(
    /(<\/(?:h[1-3]|p)>)\s*<p><\/p>\s*(?=<(?:h[2-3]|p|ul))/g,
    '$1\n<hr class="doc-separator">\n'
  );
  html = html.replace(
    /<p>(\s*[_-]{3,}\s*)<\/p>/g,
    '<hr class="doc-separator">'
  );
  html = html.replace(/<p>(\s*={3,}\s*)<\/p>/g, '<hr class="doc-separator">');
  html = html.replace(
    /(<\/p>)\s*<p><\/p>\s*(?=<(?:h2|p><strong))/g,
    '$1\n<hr class="doc-separator">\n'
  );

  html = html
    .replace(/<\/p>\s*<p>/g, "</p>\n<p>")
    .replace(/<\/h([1-6])>\s*<p>/g, "</h$1>\n\n<p>")
    .replace(/<\/ul>\s*<p>/g, "</ul>\n<p>")
    .replace(/<\/ol>\s*<p>/g, "</ol>\n<p>");

  return html;
}

async function pdfToHtml(buffer) {
  try {
    const data = await pdfParse(buffer);
    const text = data.text || "";

    if (!text.trim()) {
      return "<p>(Dokumen kosong)</p>";
    }

    const lines = text.split(/\n\n+/);
    const html = lines
      .map((line) => {
        const trimmed = line.trim().replace(/\n/g, "<br>");
        if (!trimmed) return "";
        if (
          trimmed.length < 60 &&
          trimmed === trimmed.toUpperCase() &&
          /^[A-Z\s]+$/.test(trimmed)
        ) {
          return `<h2>${trimmed}</h2>`;
        }
        return `<p>${trimmed}</p>`;
      })
      .filter(Boolean)
      .join("\n");

    return html;
  } catch (error) {
    console.error("PDF parsing error:", error.message);
    return "<p>(Gagal membaca PDF)</p>";
  }
}

async function htmlToPdf(html) {
  const styledHtml = `
<!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8">
	<style>
		@page {
			size: A4;
			margin: 20mm 20mm 20mm 25mm;
		}
		* {
			margin: 0;
			padding: 0;
			box-sizing: border-box;
		}
		body {
			font-family: 'Calibri', 'Arial', sans-serif;
			font-size: 11pt;
			line-height: 1.08;
			color: #000;
		}
		h1 { 
			font-size: 16pt;
			font-weight: 700;
			margin: 0 0 2pt 0;
			line-height: 1.0;
			text-align: center;
		}
		h2 { 
			font-size: 11pt;
			font-weight: 700;
			margin: 10pt 0 4pt 0;
			line-height: 1.0;
			text-transform: uppercase;
		}
		h3 { 
			font-size: 11pt;
			font-weight: 700;
			margin: 8pt 0 2pt 0;
			line-height: 1.0;
		}
		p {
			margin: 0 0 6pt 0;
			line-height: 1.08;
		}
		p:empty {
			margin: 0;
			line-height: 0;
		}
		p + p {
			margin-top: 0;
		}
		a {
			color: #0563C1;
			text-decoration: underline;
		}
		strong, b {
			font-weight: 700;
		}
		em, i {
			font-style: italic;
		}
		ul, ol {
			margin: 0 0 6pt 0;
			padding-left: 20pt;
			line-height: 1.08;
		}
		ul {
			list-style-type: disc;
		}
		li {
			margin: 0 0 3pt 0;
			padding-left: 2pt;
			line-height: 1.08;
		}
		li p {
			display: inline;
			margin: 0;
		}
		img {
			max-width: 100%;
			height: auto;
			display: block;
			margin: 4pt 0;
		}
		table {
			border-collapse: collapse;
			width: 100%;
			margin: 6pt 0;
			font-size: 10pt;
			line-height: 1.08;
		}
		table, th, td {
			border: 0.5pt solid #000;
		}
		th, td {
			padding: 3pt 5pt;
			text-align: left;
			vertical-align: top;
			line-height: 1.08;
		}
		th {
			background-color: #f0f0f0;
			font-weight: 700;
		}
		li > p:first-child {
			margin-bottom: 0;
		}
		body > p:first-child,
		body > h1:first-child {
			text-align: center;
		}
		body > p:nth-child(2),
		body > p:nth-child(3) {
			text-align: center;
			font-size: 10pt;
			margin: 2pt 0;
		}
		hr, hr.doc-separator {
			border: none;
			border-top: 1pt solid #000;
			margin: 8pt 0;
			padding: 0;
			height: 0;
		}
	</style>
</head>
<body>
${html}
</body>
</html>
	`;

  let browser;
  
  if (isDev) {
    const puppeteer = await import("puppeteer");
    browser = await puppeteer.default.launch({ headless: true });
  } else {
    const puppeteerCore = await import("puppeteer-core");
    browser = await puppeteerCore.default.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
  }

  try {
    const page = await browser.newPage();
    await page.setContent(styledHtml, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "20mm",
        right: "20mm",
        bottom: "20mm",
        left: "25mm",
      },
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

async function htmlToDocx(html) {
  const children = [];

  const dom = htmlparser2.parseDocument(html);
  const elements = DomUtils.getChildren(dom);

  for (const element of elements) {
    processNode(element, children);
  }

  if (children.length === 0) {
    children.push(new Paragraph({ text: "(Dokumen kosong)" }));
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1134,
              right: 1134,
              bottom: 1134,
              left: 1134,
            },
          },
        },
        children: children,
      },
    ],
  });

  return await Packer.toBuffer(doc);
}

function processNode(node, children, listItem = false) {
  if (node.type === "text") {
    return;
  }

  if (node.type === "tag") {
    const tagName = node.name.toLowerCase();

    if (tagName === "h1" || tagName === "h2" || tagName === "h3") {
      const textRuns = extractTextRuns(node);
      if (textRuns.length > 0) {
        const headingLevel =
          tagName === "h1"
            ? HeadingLevel.HEADING_1
            : tagName === "h2"
            ? HeadingLevel.HEADING_2
            : HeadingLevel.HEADING_3;
        children.push(
          new Paragraph({
            heading: headingLevel,
            children: textRuns,
            spacing: { after: 120, before: 240 },
          })
        );
      }
    } else if (tagName === "hr") {
      children.push(
        new Paragraph({
          children: [new TextRun("")],
          border: {
            bottom: {
              color: "000000",
              space: 1,
              style: BorderStyle.SINGLE,
              size: 6,
            },
          },
          spacing: { after: 120, before: 120 },
        })
      );
    } else if (tagName === "img") {
      const src = node.attribs?.src || "";
      const alt = node.attribs?.alt || "";
      const height = node.attribs?.height;
      const width = node.attribs?.width;

      const isLine =
        alt === "separator-line" || (height && parseInt(height) <= 5);
      if (isLine) {
        children.push(
          new Paragraph({
            children: [new TextRun("")],
            border: {
              bottom: {
                color: "000000",
                space: 1,
                style: BorderStyle.SINGLE,
                size: 6,
              },
            },
            spacing: { after: 120, before: 120 },
          })
        );
      } else if (src.startsWith("data:image")) {
        const match = src.match(/base64,(.+)/);
        if (match) {
          try {
            const data = Buffer.from(match[1], "base64");
            const imgWidth = width ? parseInt(width) : 400;
            const imgHeight = height ? parseInt(height) : 300;
            children.push(
              new Paragraph({
                children: [
                  new ImageRun({
                    data,
                    transformation: { width: imgWidth, height: imgHeight },
                  }),
                ],
                spacing: { after: 120, before: 120 },
              })
            );
          } catch (err) {
            console.warn("Skip image due to error:", err.message);
          }
        }
      }
    } else if (tagName === "p") {
      const textRuns = extractTextRuns(node);
      if (textRuns.length > 0 || !hasText(node)) {
        children.push(
          new Paragraph({
            children: textRuns.length > 0 ? textRuns : [new TextRun("")],
            spacing: { after: 120 },
          })
        );
      }
    } else if (tagName === "ul" || tagName === "ol") {
      const items = DomUtils.getElementsByTagName("li", node);
      for (const item of items) {
        const textRuns = extractTextRuns(item);
        if (textRuns.length > 0) {
          children.push(
            new Paragraph({
              children: textRuns,
              bullet: { level: 0 },
              spacing: { after: 80 },
            })
          );
        }
      }
    } else if (tagName === "table") {
      const tableRows = [];
      const rows = DomUtils.getElementsByTagName("tr", node);

      for (const row of rows) {
        const cells = [
          ...DomUtils.getElementsByTagName("th", row),
          ...DomUtils.getElementsByTagName("td", row),
        ];
        const tableCells = cells.map((cell) => {
          const textRuns = extractTextRuns(cell);
          return new TableCell({
            children: [
              new Paragraph({
                children: textRuns.length > 0 ? textRuns : [new TextRun("")],
              }),
            ],
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
              left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
              right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            },
          });
        });

        if (tableCells.length > 0) {
          tableRows.push(new TableRow({ children: tableCells }));
        }
      }

      if (tableRows.length > 0) {
        children.push(
          new Table({
            rows: tableRows,
            width: { size: 100, type: WidthType.PERCENTAGE },
          })
        );
      }
    } else if (tagName === "br") {
      // Line break handled in text extraction
    } else {
      // Process children for other tags
      for (const child of DomUtils.getChildren(node)) {
        processNode(child, children);
      }
    }
  }
}

function extractTextRuns(node) {
  const runs = [];

  function traverse(n, bold = false, italic = false, link = null) {
    if (n.type === "text") {
      const text = n.data;
      if (text.trim()) {
        if (link) {
          runs.push(
            new ExternalHyperlink({
              children: [
                new TextRun({
                  text: text,
                  bold: bold,
                  italics: italic,
                  color: "0563C1",
                  underline: {},
                }),
              ],
              link: link,
            })
          );
        } else {
          runs.push(
            new TextRun({
              text: text,
              bold: bold,
              italics: italic,
            })
          );
        }
      }
    } else if (n.type === "tag") {
      const tagName = n.name.toLowerCase();
      const newBold = bold || tagName === "strong" || tagName === "b";
      const newItalic = italic || tagName === "em" || tagName === "i";
      const newLink = tagName === "a" ? n.attribs?.href : link;

      if (tagName === "br") {
        runs.push(new TextRun({ text: "", break: 1 }));
      } else {
        for (const child of DomUtils.getChildren(n)) {
          traverse(child, newBold, newItalic, newLink);
        }
      }
    }
  }

  for (const child of DomUtils.getChildren(node)) {
    traverse(child);
  }

  return runs;
}

function hasText(node) {
  if (node.type === "text") {
    return node.data.trim().length > 0;
  }
  if (node.type === "tag") {
    for (const child of DomUtils.getChildren(node)) {
      if (hasText(child)) return true;
    }
  }
  return false;
}

function toDownloadResponse(buffer, target) {
  const filename = `converted.${target}`;
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

    let html = "";

    if (sourceExt === "txt") {
      const text = buffer.toString("utf8");
      html = text
        .split(/\n\n+/)
        .map((para) => {
          const cleaned = para.trim().replace(/\n/g, "<br>");
          return cleaned ? `<p>${cleaned}</p>` : "";
        })
        .filter(Boolean)
        .join("\n");
      html = html || "<p>(Kosong)</p>";
    } else if (sourceExt === "docx") {
      html = await docxToHtml(buffer);
    } else if (sourceExt === "pdf") {
      html = await pdfToHtml(buffer);
    }

    if (target === "txt") {
      const text = html
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>/gi, "\n\n")
        .replace(/<\/h[1-6]>/gi, "\n\n")
        .replace(/<\/tr>/gi, "\n")
        .replace(/<\/td>/gi, "\t")
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .trim();
      return toDownloadResponse(Buffer.from(text, "utf8"), "txt");
    }

    if (target === "docx") {
      const docxBuffer = await htmlToDocx(html);
      return toDownloadResponse(docxBuffer, "docx");
    }

    if (target === "pdf") {
      const pdfBuffer = await htmlToPdf(html);
      return toDownloadResponse(pdfBuffer, "pdf");
    }

    return NextResponse.json(
      { error: "Format konversi tidak dikenali." },
      { status: 400 }
    );
  } catch (error) {
    console.error("Conversion error", error);
    return NextResponse.json(
      {
        error:
          "Gagal mengonversi dokumen. Pastikan file tidak terenkripsi atau rusak.",
      },
      { status: 500 }
    );
  }
}
