from flask import Flask, request, jsonify, render_template 
import fitz  # PyMuPDF
import docx
import os
from dotenv import load_dotenv
import google.generativeai as genai

# Load environment variables
load_dotenv()

# Configure Gemini
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

app = Flask(__name__)

# Extract text from PDF
def extract_text_from_pdf(file_path):
    text = ""
    with fitz.open(file_path) as pdf:
        for page in pdf:
            text += page.get_text()
    return text

# Extract text from DOCX
def extract_text_from_docx(file_path):
    doc = docx.Document(file_path)
    return "\n".join([p.text for p in doc.paragraphs])

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/upload", methods=["POST"])
def upload_file():
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]
    jd = request.form.get("jd", "")

    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    os.makedirs("uploads", exist_ok=True)
    file_path = os.path.join("uploads", file.filename)
    file.save(file_path)

    # Extract text
    if file.filename.endswith(".pdf"):
        resume_text = extract_text_from_pdf(file_path)
    elif file.filename.endswith(".docx"):
        resume_text = extract_text_from_docx(file_path)
    else:
        return jsonify({"error": "Unsupported file format"}), 400

    # Gemini prompt
    prompt = f"""
    You are an ATS keyword extraction specialist.

    Analyze the resume and job description and extract important keywords related to skills, tools, technologies, responsibilities, certifications, and role-specific requirements.

    Return results ONLY in the following JSON format:

    {{
    "score": <ATS score from 0-100>,
    "jd_keywords": [ "keyword1", "keyword2", ... ],
    "resume_keywords": [ "keyword1", "keyword2", ... ],
    "missing_keywords": [ "keyword1", "keyword2", ... ],
    "feedback": "<short improvement feedback>"
    }}

    Rules:
    - Extract meaningful keywords ONLY.
    - Keywords must be SHORT (1–3 words), e.g., "Python", "TensorFlow", "REST APIs".
    - Do NOT include sentences or long phrases.
    - "missing_keywords" MUST be: jd_keywords - resume_keywords.
    - Avoid duplicates.
    - Score should reflect how many JD keywords appear in the resume.

    Resume:
    {resume_text}

    Job Description:
    {jd}
    """


    try:
 
        model = genai.GenerativeModel("models/gemini-2.5-flash")

        response = model.generate_content(prompt)

        import json

        cleaned = response.text.strip().replace("```json", "").replace("```", "")

        result_json = json.loads(cleaned)

        return jsonify(result_json)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True)
