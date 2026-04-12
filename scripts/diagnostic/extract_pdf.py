import sys
import subprocess

try:
    import PyPDF2  # type: ignore
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "PyPDF2", "--quiet"])
    import PyPDF2  # type: ignore

def extract_text(pdf_path: str):
    try:
        with open(pdf_path, 'rb') as file:
            reader = PyPDF2.PdfReader(file)
            text: str = ""
            for i, page in enumerate(reader.pages):
                extracted = page.extract_text()
                if extracted:
                    text = str(text) + f"--- Page {i+1} ---\n{str(extracted)}\n"
            
            with open("pdf_extracted_text.txt", "w", encoding="utf-8", errors="replace") as out:
                out.write(text)
            print(f"Successfully extracted {len(reader.pages)} pages to pdf_extracted_text.txt")
    except Exception as e:
        print(f"Error reading PDF: {e}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        extract_text(sys.argv[1])
    else:
        print("Please provide a PDF path.")
