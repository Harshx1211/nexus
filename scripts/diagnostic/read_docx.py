import zipfile
import xml.etree.ElementTree as ET

def get_docx_text(path):
    try:
        with zipfile.ZipFile(path) as docx:
            tree = ET.XML(docx.read('word/document.xml'))
        text: list[str] = []
        for paragraph in tree.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p'):
            texts = [str(node.text)
                     for node in paragraph.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t')
                     if node.text]
            if texts:
                text.append(str(''.join(texts)))
        return '\n'.join(text)
    except Exception as e:
        return f"Error reading document: {e}"

with open("f:/Final Mentor Mentee/nexus/team_docx_content.txt", "w", encoding="utf-8") as f:
    f.write(get_docx_text("f:/Final Mentor Mentee/NEXUS FINAL WORD.docx"))

print("Extracted content to team_docx_content.txt")
