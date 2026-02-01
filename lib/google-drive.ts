/**
 * Extract Google Drive file ID from various URL formats
 * Supports:
 * - https://drive.google.com/file/d/FILE_ID/view
 * - https://drive.google.com/file/d/FILE_ID/edit
 * - https://drive.google.com/file/d/FILE_ID/preview
 * - https://drive.google.com/open?id=FILE_ID
 * - https://docs.google.com/file/d/FILE_ID/edit
 */

export const extractGoogleDriveFileId = (url: string): string | null => {
  if (!url || typeof url !== "string") {
    return null;
  }

  // Pattern 1: /file/d/FILE_ID/ or /open?id=FILE_ID
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /\/open\?id=([a-zA-Z0-9_-]+)/,
    /id=([a-zA-Z0-9_-]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
};

/**
 * Validate if a URL is a valid Google Drive URL
 */
export const isValidGoogleDriveUrl = (url: string): boolean => {
  if (!url || typeof url !== "string") {
    return false;
  }

  const googleDriveDomains = [
    "drive.google.com",
    "docs.google.com",
  ];

  try {
    const urlObj = new URL(url);
    return googleDriveDomains.some(domain => urlObj.hostname.includes(domain));
  } catch {
    return false;
  }
};

/**
 * Generate Google Drive embed URL from file ID
 */
export const getGoogleDriveEmbedUrl = (fileId: string): string => {
  return `https://drive.google.com/file/d/${fileId}/preview`;
};

