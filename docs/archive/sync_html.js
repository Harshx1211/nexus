const fs = require('fs');
const mdPath = 'f:/Final Mentor Mentee/nexus/docs/NEXUS_SRS_v3_Premium.md';
const htmlPath = 'f:/Final Mentor Mentee/nexus/docs/NEXUS_SRS_Sharable_Report_v3_PREMIUM.html';

const mdContent = fs.readFileSync(mdPath, 'utf8');
let htmlContent = fs.readFileSync(htmlPath, 'utf8');

const startTag = '<script id="master-srs-source" type="text/markdown">';
const endTag = '</script>';

const startIndex = htmlContent.indexOf(startTag) + startTag.length;
const endIndex = htmlContent.indexOf(endTag, startIndex);

if (startIndex > startTag.length - 1 && endIndex > -1) {
    const updatedHtml = htmlContent.substring(0, startIndex) + '\n' + mdContent + '\n    ' + htmlContent.substring(endIndex);
    fs.writeFileSync(htmlPath, updatedHtml);
    console.log('HTML Sync successful');
} else {
    console.error('Tags not found');
}
