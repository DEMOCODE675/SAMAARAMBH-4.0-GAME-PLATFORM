export const WORD_BANK = [
  "algorithm", "firewall", "bluetooth", "database", "ethernet",
  "keyboard", "monitor", "satellite", "compiler", "function",
  "variable", "debugging", "encryption", "hardware", "software",
  "internet", "router", "server", "javascript", "python",
  "react", "firebase", "tailwind", "backend", "frontend",
  "pixel", "vector", "matrix", "binary", "hexadecimal",
  "developer", "programmer", "hacker", "cybersecurity", "network",
  "cloud", "hosting", "domain", "protocol", "bandwidth",
  "latency", "cache", "cookie", "browser", "search",
  "robot", "artificial", "intelligence", "machine", "learning"
];

export const getRandomWords = (count = 3) => {
  const shuffled = [...WORD_BANK].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};
