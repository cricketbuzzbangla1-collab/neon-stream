const BAD_WORDS = [
  "fuck", "shit", "ass", "bitch", "dick", "damn", "bastard",
  "crap", "piss", "slut", "whore", "nigger", "faggot",
];

export function filterBadWords(text: string, enabled = true): string {
  if (!enabled) return text;
  let filtered = text;
  BAD_WORDS.forEach((w) => {
    filtered = filtered.replace(new RegExp(`\\b${w}\\b`, "gi"), "***");
  });
  return filtered;
}
