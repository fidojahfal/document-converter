import { exec } from "child_process";
import { promisify } from "util";
import { existsSync, mkdirSync, writeFileSync, readFileSync, unlinkSync, statSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { randomBytes } from "crypto";
import { Document, Packer, Paragraph, TextRun } from "docx";

const execAsync = promisify(exec);

function getLibreOfficePath() {
    if (process.platform === "win32") {
        const programFiles = process.env.PROGRAMFILES || "C:\\Program Files";
        const programFilesX86 = process.env["PROGRAMFILES(X86)"] || "C:\\Program Files (x86)";
        
        const possiblePaths = [
            join(programFiles, "LibreOffice", "program", "soffice.exe"),
            join(programFilesX86, "LibreOffice", "program", "soffice.exe"),
            join(programFiles, "LibreOffice 5", "program", "soffice.exe"),
        ];
        
        for (const path of possiblePaths) {
            if (existsSync(path)) {
                return path;
            }
        }
    } else if (process.platform === "darwin") {
        return "/Applications/LibreOffice.app/Contents/MacOS/soffice";
    } else {
        return "soffice";
    }
    
    throw new Error("LibreOffice tidak ditemukan");
}

async function extractPdfText(pdfBuffer) {
    const pdf2json = await import("pdf2json");
    const PDFParser = pdf2json.default || pdf2json.PDFParser;
    return await new Promise((resolve, reject) => {
        const pdfParser = new PDFParser();
        pdfParser.on("pdfParser_dataError", (err) => reject(err));
        pdfParser.on("pdfParser_dataReady", (data) => {
            try {
                const pagesOutput = [];
                for (const page of data.Pages || []) {
                    const lineMap = new Map();
                    for (const textItem of page.Texts || []) {
                        const lineKey = Math.round(textItem.y || 0);
                        for (const r of textItem.R || []) {
                            const text = decodeURIComponent(r.T || "");
                            const parts = lineMap.get(lineKey) || [];
                            parts.push({ x: textItem.x || 0, text });
                            lineMap.set(lineKey, parts);
                        }
                    }
                    const pageLines = [...lineMap.entries()]
                        .sort((a, b) => a[0] - b[0])
                        .map(([_, parts]) => parts
                            .sort((a, b) => a.x - b.x)
                            .map((p) => p.text)
                            .join("")
                        );
                    pagesOutput.push(pageLines.join("\n").trim());
                }
                const joined = pagesOutput.filter(Boolean).join("\n\n").trim();
                resolve(joined);
            } catch (parseErr) {
                reject(parseErr);
            }
        });
        pdfParser.parseBuffer(pdfBuffer);
    });
}

const DEFAULT_PAGE = {
    width: 11906,
    height: 16838,
};

const DEFAULT_MARGINS = {
    top: 1440,
    right: 1440,
    bottom: 1440,
    left: 1440,
};

async function enforceDocxMargins(buffer) {
    try {
        const JSZip = (await import("jszip")).default;
        const zip = await JSZip.loadAsync(buffer);
        const docFile = zip.file("word/document.xml");
        if (!docFile) return buffer;
        let xml = await docFile.async("string");

        const marginAttrs = `w:top="${DEFAULT_MARGINS.top}" w:right="${DEFAULT_MARGINS.right}" w:bottom="${DEFAULT_MARGINS.bottom}" w:left="${DEFAULT_MARGINS.left}" w:header="720" w:footer="720" w:gutter="0"`;
        const pageSize = `w:w="${DEFAULT_PAGE.width}" w:h="${DEFAULT_PAGE.height}" w:orient="portrait"`;

        const sectPrRegex = /<w:sectPr[^>]*>[\s\S]*?<\/w:sectPr>/g;
        const pgMarRegex = /<w:pgMar[^>]*?\/>/;
        const pgSzRegex = /<w:pgSz[^>]*?\/>/;

        xml = xml.replace(sectPrRegex, (sectPr) => {
            if (pgMarRegex.test(sectPr)) {
                sectPr = sectPr.replace(pgMarRegex, `<w:pgMar ${marginAttrs}/>`);
            } else {
                sectPr = sectPr.replace(/<\/w:sectPr>/, `<w:pgMar ${marginAttrs}/></w:sectPr>`);
            }
            if (pgSzRegex.test(sectPr)) {
                sectPr = sectPr.replace(pgSzRegex, `<w:pgSz ${pageSize}/>`);
            } else {
                sectPr = sectPr.replace(/<\/w:sectPr>/, `<w:pgSz ${pageSize}/></w:sectPr>`);
            }
            return sectPr;
        });

        const maxTableWidth = DEFAULT_PAGE.width - DEFAULT_MARGINS.left - DEFAULT_MARGINS.right;
        const tblWRegex = /<w:tblW\s+w:w="(\d+)"\s+w:type="dxa"\/>/g;
        xml = xml.replace(tblWRegex, (match, width) => {
            const w = parseInt(width);
            if (w > maxTableWidth) {
                return `<w:tblW w:w="${maxTableWidth}" w:type="dxa"/>`;
            }
            return match;
        });

        xml = xml.replace(/<w:tblInd\s+w:w="[^"]+"\s+w:type="dxa"\/>/g, '<w:tblInd w:w="0" w:type="dxa"/>');

        zip.file("word/document.xml", xml);
        return await zip.generateAsync({ type: "nodebuffer" });
    } catch (err) {
        console.error("enforceDocxMargins failed", err);
        return buffer;
    }
}

async function pdfToFormat(pdfBuffer, targetExt) {
    const libreOfficePath = getLibreOfficePath();
    const tempDir = join(tmpdir(), `libreoffice-${randomBytes(8).toString("hex")}`);
    mkdirSync(tempDir, { recursive: true });
    const inputFile = join(tempDir, `input.pdf`);
    const outputFileName = `input.${targetExt}`;
    const outputFile = join(tempDir, outputFileName);
    
    try {
        writeFileSync(inputFile, pdfBuffer);

        const commands = [];
        if (targetExt === "txt") {
            commands.push(`"${libreOfficePath}" --headless --norestore --nofirststartwizard --convert-to "txt:Text" --outdir "${tempDir}" "${inputFile}"`);
        } else if (targetExt === "docx") {
            const odtFile = join(tempDir, "input.odt");
            commands.push(
                `"${libreOfficePath}" --headless --norestore --nofirststartwizard --infilter="writer_pdf_import" --convert-to docx:"MS Word 2007 XML":writer_pdf_import --outdir "${tempDir}" "${inputFile}"`
            );
            commands.push(
                `"${libreOfficePath}" --headless --norestore --nofirststartwizard --convert-to odt:writer_pdf_import --outdir "${tempDir}" "${inputFile}" && "${libreOfficePath}" --headless --norestore --nofirststartwizard --convert-to docx:"MS Word 2007 XML" --outdir "${tempDir}" "${odtFile}"`
            );
        } else {
            commands.push(`"${libreOfficePath}" --headless --norestore --nofirststartwizard --convert-to ${targetExt} --outdir "${tempDir}" "${inputFile}"`);
        }

        let produced = false;
        for (const cmd of commands) {
            console.log("LibreOffice PDF command:", cmd);
            const { stdout, stderr } = await execAsync(cmd, {
                timeout: 60000,
                maxBuffer: 20 * 1024 * 1024,
                shell: true,
            });

            if (stderr) console.error("LibreOffice stderr:", stderr);
            console.log("LibreOffice stdout:", stdout);

            if (existsSync(outputFile) && statSync(outputFile).size > 0) {
                produced = true;
                break;
            }
        }
        
        if (!produced || !existsSync(outputFile)) {
            const text = await extractPdfText(pdfBuffer);
            if (!text) {
                throw new Error(`Konversi PDF ke ${targetExt} gagal. LibreOffice tidak dapat mengekstrak konten dari PDF ini.`);
            }
            if (targetExt === "txt") {
                return Buffer.from(text, "utf8");
            }
            if (targetExt === "docx") {
                const paragraphs = text
                    .split(/\n\n+/)
                    .map((p) => p.trim())
                    .filter(Boolean)
                    .map((p) => new Paragraph({
                        spacing: { after: 200 },
                        indent: { left: 0, right: 0 },
                        children: [new TextRun(p)],
                    }));
                const doc = new Document({
                    sections: [
                        {
                            properties: { margin: DEFAULT_MARGINS, page: DEFAULT_PAGE },
                            children: paragraphs.length ? paragraphs : [new Paragraph(text)],
                        },
                    ],
                });
                return await Packer.toBuffer(doc);
            }
            throw new Error(`Konversi PDF ke ${targetExt} gagal. Format tujuan tidak didukung.`);
        }
        
        const outputBuffer = readFileSync(outputFile);
        return outputBuffer;
    } finally {
        try {
            if (existsSync(inputFile)) unlinkSync(inputFile);
            if (existsSync(outputFile)) unlinkSync(outputFile);
            const odtFile = join(tempDir, "input.odt");
            if (existsSync(odtFile)) unlinkSync(odtFile);
            const fs = await import("fs");
            fs.rmSync(tempDir, { recursive: true, force: true });
        } catch (e) {}
    }
}

export async function convertDocument(buffer, sourceExt, targetExt) {
    if (sourceExt === targetExt) return buffer;
    if (sourceExt === "pdf") return await pdfToFormat(buffer, targetExt);
    
    const libreOfficePath = getLibreOfficePath();
    const tempDir = join(tmpdir(), `libreoffice-${randomBytes(8).toString("hex")}`);
    mkdirSync(tempDir, { recursive: true });
    const inputFile = join(tempDir, `input.${sourceExt}`);
    const outputFile = join(tempDir, `input.${targetExt}`);
    
    try {
        writeFileSync(inputFile, buffer);
        const cmd = `"${libreOfficePath}" --headless --convert-to ${targetExt} --outdir "${tempDir}" "${inputFile}"`;
        console.log("LibreOffice command:", cmd);
        
        const { stdout, stderr } = await execAsync(cmd, {
            timeout: 30000,
            maxBuffer: 10 * 1024 * 1024,
        });
        
        if (stderr) console.error("LibreOffice stderr:", stderr);
        console.log("LibreOffice stdout:", stdout);
        
        if (!existsSync(outputFile)) {
            throw new Error(`File output tidak ditemukan: ${outputFile}`);
        }
        
        const outBuf = readFileSync(outputFile);
        if (targetExt === "docx" && sourceExt !== "pdf") {
            return await enforceDocxMargins(outBuf);
        }
        return outBuf;
    } catch (error) {
        throw new Error(`Gagal mengonversi ${sourceExt} ke ${targetExt}: ${error.message}`);
    } finally {
        try {
            if (existsSync(inputFile)) unlinkSync(inputFile);
            if (existsSync(outputFile)) unlinkSync(outputFile);
            const fs = await import("fs");
            fs.rmSync(tempDir, { recursive: true, force: true });
        } catch (e) {}
    }
}

export async function checkLibreOfficeAvailable() {
    try {
        return existsSync(getLibreOfficePath());
    } catch {
        return false;
    }
}