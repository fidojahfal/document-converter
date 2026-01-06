import { checkLibreOfficeAvailable } from "../lib/libreoffice.js";

async function checkLibreOffice() {
	console.log("🔍 Checking LibreOffice installation...\n");

	try {
		const isAvailable = await checkLibreOfficeAvailable();

		if (isAvailable) {
			console.log("✅ LibreOffice is installed and working!");
			console.log("📄 Document conversion ready.\n");
			process.exit(0);
		} else {
			console.error("❌ LibreOffice is NOT available!");
			console.error("\n📥 Please install LibreOffice:");
			console.error("   Download: https://www.libreoffice.org/download/download/");
			console.error("   Or use: winget install -e --id TheDocumentFoundation.LibreOffice\n");
			process.exit(1);
		}
	} catch (error) {
		console.error("❌ Error checking LibreOffice:", error.message);
		console.error("\n📥 Please install LibreOffice:");
		console.error("   Download: https://www.libreoffice.org/download/download/");
		console.error("   Or use: winget install -e --id TheDocumentFoundation.LibreOffice\n");
		process.exit(1);
	}
}

checkLibreOffice();
