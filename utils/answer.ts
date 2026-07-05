const contractions: Record<string, string> = {
  "i'm": "i am",
  "you're": "you are",
  "he's": "he is",
  "she's": "she is",
  "it's": "it is",
  "we're": "we are",
  "they're": "they are",
  "i'll": "i will",
  "you'll": "you will",
  "we'll": "we will",
  "they'll": "they will",
  "i'd": "i would",
  "don't": "do not",
  "doesn't": "does not",
  "didn't": "did not",
  "can't": "cannot",
  "couldn't": "could not",
  "won't": "will not",
  "let's": "let us",
  "what's": "what is",
  "where's": "where is",
};

export function normalizeAnswer(value: string) {
  let normalized = value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .trim();

  Object.entries(contractions).forEach(([short, full]) => {
    normalized = normalized.replace(new RegExp(`\\b${short.replace("'", "\\'")}\\b`, "g"), full);
  });

  return normalized
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isAcceptedAnswer(input: string, answers: string[]) {
  const normalizedInput = normalizeAnswer(input);
  return answers.some((answer) => normalizeAnswer(answer) === normalizedInput);
}

export function getWordDiff(input: string, answer: string) {
  const submitted = normalizeAnswer(input).split(" ");
  const expected = normalizeAnswer(answer).split(" ");
  return expected.map((word, index) => ({ word, correct: submitted[index] === word }));
}

export function shuffle<T>(items: T[]) {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [next[index], next[target]] = [next[target], next[index]];
  }
  return next;
}
