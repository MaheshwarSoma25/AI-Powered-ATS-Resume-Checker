// --- Element References ---
const uploadBox = document.querySelector(".upload-box");
const fileInput = document.getElementById("resumeInput");
const uploadText = document.getElementById("uploadText");
const form = document.getElementById("uploadForm");
const jdInput = document.getElementById("jd");
const resultSection = document.getElementById("section-3");

// --- Click to Upload ---
uploadBox.addEventListener("click", () => fileInput.click());

// --- Show File Name ---
fileInput.addEventListener("change", () => {
  if (fileInput.files[0]) {
    uploadText.textContent = `📄 ${fileInput.files[0].name}`;
    uploadText.style.color = "#007BFF";
  }
});

// --- Drag & Drop ---
uploadBox.addEventListener("dragover", (e) => {
  e.preventDefault();
  uploadBox.classList.add("drag-over");
});

uploadBox.addEventListener("dragleave", () => {
  uploadBox.classList.remove("drag-over");
});

uploadBox.addEventListener("drop", (e) => {
  e.preventDefault();
  uploadBox.classList.remove("drag-over");

  const file = e.dataTransfer.files[0];
  if (file) {
    fileInput.files = e.dataTransfer.files;
    uploadText.textContent = `📄 ${file.name}`;
  }
});

// --- Handle Form Submit ---
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const file = fileInput.files[0];
  const jd = jdInput.value.trim();

  if (!file || !jd) return alert("Upload resume & JD.");

  // 1️⃣ Show section 3 BEFORE scroll
  resultSection.style.display = "flex";

  // 2️⃣ Scroll immediately
  setTimeout(() => {
    resultSection.scrollIntoView({ behavior: "smooth" });
  }, 50);

  // 3️⃣ Show loading (AFTER scroll, not before)
  setTimeout(() => {
    resultSection.innerHTML = `
      <div class="result-container">
        <p style="color:black;">⏳ Analyzing your resume...</p>
      </div>
    `;
  }, 120);

  // Prepare FormData
  const formData = new FormData();
  formData.append("file", file);
  formData.append("jd", jd);

  try {
    const res = await fetch("/upload", { method: "POST", body: formData });
    const data = await res.json();

    if (data.error) {
      resultSection.innerHTML = `
        <div class="result-container">
          <p style='color:red;'>❌ ${data.error}</p>
        </div>`;
      return;
    }

    // Build UI
    const missing = data.missing_keywords || [];
    const score = data.score || "N/A";

    resultSection.innerHTML = `
      <div class="result-container">
        <h1>ATS Analysis Result</h1>

        <div class="score-box">
          <h2>Your ATS Score</h2>
          <p id="score">${score}%</p>
        </div>

        <div class="keywords-box">
          <h3>Suggested Keywords</h3>
          <div class="keyword-list">
            ${
              missing.length
                ? missing.map(k => `<span>${k}</span>`).join("")
                : "<span>No missing keywords ✔</span>"
            }
          </div>
        </div>

        <button id="checkAgain" class="result">Check Again</button>
      </div>
    `;

    // 🔁 Scroll again after results load (ensures position lock)
    setTimeout(() => {
      resultSection.scrollIntoView({ behavior: "smooth" });
    }, 150);

    // Reset
    document.getElementById("checkAgain").onclick = () => {
      resultSection.style.display = "none";
      form.reset();
      uploadText.textContent = "Click or Drop file here to upload your Resume/CV";

      setTimeout(() => {
        document.getElementById("section-2").scrollIntoView({ behavior: "smooth" });
      }, 100);
    };

  } catch (err) {
    resultSection.innerHTML = `
      <div class="result-container">
        <p style='color:red;'>❌ ${err.message}</p>
      </div>`;
  }
});
