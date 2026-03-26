# 📄 PDF Document Summarizer

A clean, lightweight web app that turns text-based PDFs into easy-to-read summaries.

Upload a PDF and get:
- a concise **overview**
- extracted **important topics**
- ranked **important points**
- short **point summaries**
- high-signal **keywords**

Built with **Node.js + Express** on the backend and vanilla **HTML/CSS/JS** on the frontend.

## 📝 Description

PDF Document Summarizer is a beginner-friendly web application that helps you quickly understand long documents without reading every page. After uploading a PDF, the app extracts its text and returns a structured summary view with an overview, key topics, important points, and keywords.

It is designed for lightweight local use (students, quick reviews, internal docs) and focuses on speed and readability rather than AI-generated rewriting.

---

## ✨ Features

- Simple drag-and-select style PDF upload UI
- In-memory file handling (no file storage on disk)
- PDF text extraction with `pdf-parse`
- Heuristic summarization pipeline that includes:
  - text cleanup and normalization
  - sentence/statements extraction
  - frequency-based ranking
  - duplicate/overlap reduction for key points
  - topic phrase and keyword extraction
- Summary metadata:
  - page count
  - word count
  - sentence count
- File-size protection (10 MB max upload)

---

## 🧱 Tech Stack

- **Backend:** Node.js, Express, Multer, pdf-parse
- **Frontend:** Vanilla HTML, CSS, JavaScript

---

## 🚀 Getting Started

### 1) Install dependencies

```bash
npm install
```

### 2) Start the app

```bash
npm start
```

> For auto-restart during development:

```bash
npm run dev
```

### 3) Open in your browser

```text
http://localhost:3000
```

---

## 📡 API

### `POST /api/summarize`

Upload a PDF using multipart form-data with the field name:

- `pdf`

#### Success response (shape)

```json
{
  "fileName": "example.pdf",
  "pageCount": 12,
  "summary": {
    "stats": {
      "words": 1234,
      "sentences": 87
    },
    "overview": "...",
    "importantTopics": ["..."],
    "importantPoints": ["..."],
    "pointSummaries": ["..."],
    "keywords": ["..."]
  }
}
```

---

## ⚠️ Limitations

- Works best with **text-based PDFs**.
- Scanned/image-only PDFs may return weak or empty summaries unless OCR text is embedded.
- Summaries are heuristic (not LLM-generated), so output quality depends on document structure and clarity.

---

## 🔒 Privacy & File Handling

- Uploaded files are processed in memory via Multer's memory storage.
- Files are **not persisted** to disk by this app.

---

## 📁 Project Structure

```text
.
├── public/
│   ├── app.js
│   ├── index.html
│   └── style.css
├── server.js
├── package.json
└── README.md
```

---

## 📄 License

MIT
