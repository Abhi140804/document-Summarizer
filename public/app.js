const form = document.getElementById("upload-form");
const fileInput = document.getElementById("pdf");
const submitButton = document.getElementById("submit-button");
const status = document.getElementById("status");
const results = document.getElementById("results");
const documentName = document.getElementById("document-name");
const pageCount = document.getElementById("page-count");
const wordCount = document.getElementById("word-count");
const sentenceCount = document.getElementById("sentence-count");
const overviewText = document.getElementById("overview-text");
const importantTopics = document.getElementById("important-topics");
const importantPoints = document.getElementById("important-points");
const pointSummaries = document.getElementById("point-summaries");
const keywords = document.getElementById("keywords");

function setStatus(message, isError = false) {
  status.textContent = message;
  status.style.color = isError ? "#a73719" : "";
}

function renderSummary(payload) {
  const summary = payload.summary;

  documentName.textContent = payload.fileName;
  pageCount.textContent = payload.pageCount;
  wordCount.textContent = summary.stats.words;
  sentenceCount.textContent = summary.stats.sentences;
  overviewText.textContent = summary.overview;

  importantTopics.innerHTML = "";
  for (const topic of summary.importantTopics) {
    const tag = document.createElement("span");
    tag.textContent = topic;
    importantTopics.appendChild(tag);
  }

  importantPoints.innerHTML = "";
  for (const point of summary.importantPoints) {
    const item = document.createElement("li");
    item.textContent = point;
    importantPoints.appendChild(item);
  }

  pointSummaries.innerHTML = "";
  for (const point of summary.pointSummaries) {
    const item = document.createElement("li");
    item.textContent = point;
    pointSummaries.appendChild(item);
  }

  keywords.innerHTML = "";
  for (const word of summary.keywords) {
    const tag = document.createElement("span");
    tag.textContent = word;
    keywords.appendChild(tag);
  }

  results.classList.remove("hidden");
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const [file] = fileInput.files;
  if (!file) {
    setStatus("Select a PDF before submitting.", true);
    return;
  }

  const formData = new FormData();
  formData.append("pdf", file);

  submitButton.disabled = true;
  results.classList.add("hidden");
  setStatus("Reading the PDF and building a summary...");

  try {
    const response = await fetch("/api/summarize", {
      method: "POST",
      body: formData
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "Something went wrong.");
    }

    renderSummary(payload);
    setStatus("Summary ready.");
  } catch (error) {
    setStatus(error.message, true);
  } finally {
    submitButton.disabled = false;
  }
});
