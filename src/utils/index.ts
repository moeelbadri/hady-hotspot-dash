// Utility function to generate random credentials
function generateCredentials() {
    let numbers = Array.from({length: 4}, () => Math.floor(Math.random() * 10));
    let letter = String.fromCharCode(97 + Math.floor(Math.random() * 26));
    let pos = Math.floor(Math.random() * 5);
    numbers.splice(pos, 0, letter as any);
    let username = numbers.join('');
    return { username };
}

// Utility function to parse MikroTik time format (1h, 2d, 1h30m, etc.) to seconds
function parseMikroTikTime(timeStr: string): number {
  if (!timeStr || timeStr === '0') return 0;
  
  // If it's already a number (seconds), return it
  if (!isNaN(Number(timeStr))) return Number(timeStr);
  
  let totalSeconds = 0;
  
  // Parse compound formats like "1h30m", "2d5h", "1h30m45s", etc.
  // Match patterns like "1h", "30m", "45s", "2d", "3w"
  const timePattern = /(\d+)([hdmsw])/g;
  let match;
  
  while ((match = timePattern.exec(timeStr)) !== null) {
    const value = parseInt(match[1]);
    const unit = match[2];
    
    switch (unit) {
      case 'w': totalSeconds += value * 7 * 24 * 3600; break; // weeks to seconds
      case 'd': totalSeconds += value * 86400; break; // days to seconds
      case 'h': totalSeconds += value * 3600; break;  // hours to seconds
      case 'm': totalSeconds += value * 60; break;    // minutes to seconds
      case 's': totalSeconds += value; break;         // seconds
    }
  }
  
  return totalSeconds;
}

// Utility function to convert seconds to human-friendly format
function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  } else if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  } else {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  }
}

// Utility function to format MikroTik time or seconds to human-readable format
function formatMikroTikTime(timeStr: string): string {
  const seconds = parseMikroTikTime(timeStr);
  return formatDuration(seconds);
}

export { 
  generateCredentials, 
  parseMikroTikTime, 
  formatDuration, 
  formatMikroTikTime 
};