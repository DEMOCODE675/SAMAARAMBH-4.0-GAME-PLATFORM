// Skribbl word bank — tech/cyber-themed categories for TechArena.
// Words are chosen to be drawable on stage (concrete or iconic), grouped by
// difficulty so the host can match the room's energy.

export const SKRIBBL_CATEGORIES = [
  {
    id: 'programming',
    label: 'Programming & Tools',
    words: [
      'Bug', 'Loop', 'Array', 'Stack', 'Queue', 'Cache', 'Token', 'Server', 'Client', 'Pointer',
      'Binary', 'Compiler', 'Database', 'Framework', 'Algorithm', 'Function', 'Variable', 'Recursion',
      'Git', 'Docker', 'Linux', 'Python', 'React', 'Firewall', 'Keyboard', 'Monitor', 'Robot',
      'API', 'Bug Bounty', 'Code Review', 'Merge Conflict', 'Rubber Duck', 'Hello World'
    ]
  },
  {
    id: 'cybersecurity',
    label: 'Cybersecurity',
    words: [
      'Hacker', 'Phishing', 'Malware', 'Ransomware', 'Firewall', 'Encryption', 'Password', 'Two Factor',
      'Brute Force', 'Zero Day', 'Botnet', 'Keylogger', 'Spyware', 'VPN', 'Proxy', 'Patch',
      'Social Engineering', 'Data Breach', 'Phantom Tab', 'Insider Threat', 'Red Team', 'Blue Team',
      'Man in the Middle', 'Denial of Service', 'Digital Forensics', 'Incident Response'
    ]
  },
  {
    id: 'internet',
    label: 'Internet & Meme Culture',
    words: [
      'Wifi', 'Meme', 'Emoji', 'Hashtag', 'Selfie', 'Livestream', 'Podcast', 'Stream Buffer',
      'Troll', 'Influencer', 'Unboxing', 'Rickroll', 'GIF', 'Chat Bubble', 'Notification',
      'Video Call', 'Dark Mode', 'Screenshot', 'Password Reset', 'Autocorrect Fail', '404 Not Found',
      'Captcha', 'Cookie Banner', 'Spam Folder', 'Loading Spinner', 'Blue Screen of Death'
    ]
  },
  {
    id: 'college',
    label: 'College Life',
    words: [
      'Hostel', 'Canteen', 'Library', 'Semester', 'Backlog', 'Internship', 'Placement',
      'Group Project', 'Viva', 'Assignment', 'All Nighter', 'Attendance Shortage', 'Roll Call',
      'Lab Partner', 'Class Bunker', 'Fee Deadline', 'Fest Crowd', 'Degree', 'Convocation', 'Ragging Free Campus'
    ]
  },
  {
    id: 'gadgets',
    label: 'Gadgets & Gizmos',
    words: [
      'Smartphone', 'Drone', 'Smartwatch', 'Earbuds', 'Power Bank', 'Charger Cable', 'Joystick',
      'Graphics Card', 'Hard Drive', 'Pendrive', 'Router', 'Webcam', 'Microphone', 'Projector',
      '3D Printer', 'Barcode Scanner', 'VR Headset', 'Retro Console', 'Selfie Stick', 'Smart Speaker'
    ]
  },
  {
    id: 'retro',
    label: 'Retro Tech',
    words: [
      'Floppy Disk', 'Cassette Tape', 'Dial Up', 'Fax Machine', 'Typewriter', 'Pager', 'CRT Monitor',
      'Game Boy', 'Arcade Cabinet', 'Payphone', 'VHS Tape', 'Polaroid', 'Morse Code', 'Punch Card'
    ]
  }
];

// Flat word list for custom random picks.
export const ALL_SKRIBBL_WORDS = SKRIBBL_CATEGORIES.flatMap((c) => c.words);

export function pickRandomWord(excludeList = []) {
  const pool = ALL_SKRIBBL_WORDS.filter((w) => !excludeList.includes(w));
  const source = pool.length > 0 ? pool : ALL_SKRIBBL_WORDS;
  return source[Math.floor(Math.random() * source.length)];
}

export function pickRandomWords(count = 3, excludeList = []) {
  const chosen = [];
  const excluded = new Set(excludeList);
  let guard = 0;
  while (chosen.length < count && guard < 200) {
    guard += 1;
    const word = pickRandomWord(Array.from(excluded));
    if (!excluded.has(word)) {
      excluded.add(word);
      chosen.push(word);
    }
  }
  return chosen;
}
