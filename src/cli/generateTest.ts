import { generateLeafletPdf } from "../pipeline/generate.js";

const result = await generateLeafletPdf({
  gid: process.argv[2],
  sheetTitle: process.argv[3]
});

console.log(JSON.stringify({
  pdfPath: result.pdfPath,
  htmlPath: result.htmlPath,
  leaflets: result.leaflets.map(item => ({
    title: item.title,
    products: item.groups.length,
    promoType: item.promoType
  }))
}, null, 2));
