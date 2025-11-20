// server/server.js
require('dotenv').config();
const express = require('express');
const multer = require('multer');
const fetch = require('node-fetch'); // node 18+ has global fetch; otherwise install node-fetch
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const NLP_SERVICE_URL = process.env.NLP_SERVICE_URL || 'http://localhost:5000/parse';

// serve frontend static files (adjust if your frontend in ../frontend)
app.use(express.static(path.join(__dirname, '..', 'frontend')));
app.use(express.json());

// configure multer to store files to /temp_uploads
const UPLOAD_DIR = path.join(__dirname, 'temp_uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    // keep original extension
    cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'));
  }
});
const upload = multer({ storage });

app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const jd = req.body.jd || '';
    const file = req.file;

    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    // forward to NLP microservice with multipart/form-data
    const formData = new FormData();
    formData.append('file', fs.createReadStream(file.path));
    formData.append('jd', jd);

    const nlpResp = await fetch(NLP_SERVICE_URL, { method: 'POST', body: formData });
    if (!nlpResp.ok) {
      const text = await nlpResp.text();
      throw new Error(`NLP service error: ${text}`);
    }
    const result = await nlpResp.json();

    // cleanup uploaded file
    fs.unlinkSync(file.path);

    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
