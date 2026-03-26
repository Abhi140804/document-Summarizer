const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

const port = process.env.PORT || 3000;

const STOP_WORDS = new Set([
  "a", "about", "above", "after", "again", "against", "all", "also", "am", "an",
  "and", "any", "are", "as", "at", "be", "because", "been", "before", "being",
  "below", "between", "both", "but", "by", "can", "could", "did", "do", "does",
  "doing", "down", "during", "each", "few", "for", "from", "further", "had",
  "has", "have", "having", "he", "her", "here", "hers", "herself", "him",
  "himself", "his", "how", "i", "if", "in", "into", "is", "it", "its", "itself",
  "just", "me", "more", "most", "my", "myself", "no", "nor", "not", "now", "of",
  "off", "on", "once", "only", "or", "other", "our", "ours", "ourselves", "out",
  "over", "own", "same", "she", "should", "so", "some", "such", "than", "that",
  "the", "their", "theirs", "them", "themselves", "then", "there", "these", "they",
  "this", "those", "through", "to", "too", "under", "until", "up", "very", "was",
  "we", "were", "what", "when", "where", "which", "while", "who", "whom", "why",
  "with", "would", "you", "your", "yours", "yourself", "yourselves"
]);

app.use(express.static("public"));

function cleanText(text) {
  return text
    .replace(/[•●◆■▪▫►▶➔→➜]/g, "\n")
    .replace(/\s+-\s+/g, "\n")
    .replace(/\s{2,}/g, " ")
    .replace(/([a-z])-\s+([a-z])/gi, "$1$2")
    .replace(/([a-zA-Z])\n([a-zA-Z])/g, "$1$2")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/([,.;:!?])([^\s])/g, "$1 $2")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function splitSentences(text) {
  return text
    .match(/[^.!?]+[.!?]+|[^.!?]+$/g)
    ?.map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 40) || [];
}

function splitLongStatement(statement) {
  const compact = statement.replace(/\s+/g, " ").trim();
  if (!compact) {
    return [];
  }

  const commaParts = compact
    .split(/\s*,\s*/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (commaParts.length >= 3) {
    return commaParts.map((part) => part.replace(/[.;:]+$/, "").trim());
  }

  return [compact];
}

function extractStatements(text) {
  const normalized = text
    .replace(/\r/g, "\n")
    .replace(/[•●◆■▪▫►▶➔→➜]/g, "\n")
    .replace(/\s+-\s+/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .replace(/([a-z])\n(?=[A-Z])/g, "$1. \n")
    .replace(/([a-z])\s{2,}(?=[A-Z])/g, "$1. ");

  const chunks = normalized
    .split(/\n|[.!?;]+/g)
    .map((chunk) => chunk.replace(/\s+/g, " ").trim())
    .filter((chunk) => chunk.length > 12);

  const statements = [];

  for (const chunk of chunks) {
    const parts = splitLongStatement(chunk);

    for (const part of parts) {
      const cleanedPart = part
        .replace(/^[^a-zA-Z0-9]+/, "")
        .replace(/\s+/g, " ")
        .trim();

      if (cleanedPart.length >= 12) {
        statements.push(cleanedPart);
      }
    }
  }

  return statements;
}

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

function sentenceToWordSet(sentence) {
  return new Set(tokenize(sentence));
}

function rankSentences(sentences, frequencies) {
  return sentences
    .map((sentence, index) => {
      const words = tokenize(sentence);
      const score = words.reduce((total, word) => total + (frequencies.get(word) || 0), 0);
      return { sentence, index, score };
    })
    .sort((a, b) => b.score - a.score);
}

function extractTopics(sentences) {
  const phraseFrequencies = new Map();

  for (const sentence of sentences) {
    const words = sentence
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean);

    for (let index = 0; index < words.length - 1; index += 1) {
      const first = words[index];
      const second = words[index + 1];

      if (
        first.length < 3 ||
        second.length < 3 ||
        STOP_WORDS.has(first) ||
        STOP_WORDS.has(second)
      ) {
        continue;
      }

      const phrase = `${first} ${second}`;
      phraseFrequencies.set(phrase, (phraseFrequencies.get(phrase) || 0) + 1);
    }
  }

  const rankedPhrases = [...phraseFrequencies.entries()]
    .sort((a, b) => {
      if (b[1] !== a[1]) {
        return b[1] - a[1];
      }

      return b[0].length - a[0].length;
    })
    .map(([phrase]) => phrase);

  const topics = [];

  for (const phrase of rankedPhrases) {
    if (topics.every((topic) => !topic.includes(phrase) && !phrase.includes(topic))) {
      topics.push(phrase);
    }

    if (topics.length === 6) {
      break;
    }
  }

  return topics;
}

function condenseSentence(sentence) {
  const trimmed = sentence
    .replace(/\s+/g, " ")
    .replace(/^(however|therefore|moreover|additionally|furthermore|meanwhile)\s*,?\s*/i, "")
    .trim();

  const words = trimmed.split(/\s+/);
  if (words.length <= 14) {
    return trimmed;
  }

  return `${words.slice(0, 14).join(" ")}...`;
}

function selectDiversePoints(rankedSentences, limit) {
  const selected = [];

  for (const candidate of rankedSentences) {
    const candidateWords = sentenceToWordSet(candidate.sentence);
    const overlapsExisting = selected.some((item) => {
      const existingWords = sentenceToWordSet(item.sentence);
      const overlap = [...candidateWords].filter((word) => existingWords.has(word)).length;
      const smallestSet = Math.max(1, Math.min(candidateWords.size, existingWords.size));

      return overlap / smallestSet > 0.7;
    });

    if (!overlapsExisting) {
      selected.push(candidate);
    }

    if (selected.length === limit) {
      break;
    }
  }

  return selected.sort((a, b) => a.index - b.index);
}

function summarizeText(text) {
  const cleaned = cleanText(text);
  const statements = extractStatements(text);

  if (cleaned.length < 120) {
    return {
      overview: cleaned || "This PDF does not contain enough readable text to summarize.",
      importantTopics: [],
      importantPoints: statements.length ? statements.slice(0, 5) : cleaned ? [cleaned] : [],
      pointSummaries: statements.length
        ? statements.slice(0, 5).map(condenseSentence)
        : cleaned
          ? [condenseSentence(cleaned)]
          : [],
      keywords: [],
      stats: {
        characters: cleaned.length,
        words: cleaned ? cleaned.split(/\s+/).length : 0,
        sentences: 0
      }
    };
  }

  const sentences = splitSentences(cleaned);
  const words = tokenize(cleaned);
  const frequencies = new Map();

  for (const word of words) {
    frequencies.set(word, (frequencies.get(word) || 0) + 1);
  }

  const rankedStatements = rankSentences(statements.length ? statements : sentences, frequencies);
  const selectedPoints = selectDiversePoints(rankedStatements, Math.min(6, rankedStatements.length));
  const importantPoints = selectedPoints.map((item) => item.sentence);
  const pointSummaries = importantPoints.map(condenseSentence);
  const importantTopics = extractTopics(statements.length ? statements : sentences);

  const keywordList = [...frequencies.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word]) => word);

  return {
    overview: pointSummaries.slice(0, 3).join("\n"),
    importantTopics,
    importantPoints,
    pointSummaries,
    keywords: keywordList,
    stats: {
      characters: cleaned.length,
      words: cleaned.split(/\s+/).length,
      sentences: sentences.length
    }
  };
}

app.post("/api/summarize", upload.single("pdf"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Please upload a PDF file." });
  }

  if (req.file.mimetype !== "application/pdf") {
    return res.status(400).json({ error: "Only PDF files are supported." });
  }

  try {
    const parsed = await pdfParse(req.file.buffer);
    const summary = summarizeText(parsed.text);

    return res.json({
      fileName: req.file.originalname,
      pageCount: parsed.numpages,
      summary
    });
  } catch (error) {
    return res.status(500).json({
      error: "The PDF could not be processed. Try a text-based PDF instead.",
      details: error.message
    });
  }
});

app.listen(port, () => {
  console.log(`PDF summarizer running at http://localhost:${port}`);
});
