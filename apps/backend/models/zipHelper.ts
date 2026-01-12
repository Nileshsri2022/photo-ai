import JSZip from "jszip";
import type { ImageFileInput } from "common/inferred";
// Common image file extensions
const IMAGE_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".bmp",
  ".webp",
  ".svg",
  ".tiff",
  ".tif",
];

// Check if a file is an image based on extension
const isImageFile = (filename: string): boolean => {
  const lowerFilename = filename.toLowerCase();
  return IMAGE_EXTENSIONS.some((ext) => lowerFilename.endsWith(ext));
};

// Get MIME type based on file extension
const getMimeType = (filename: string): string => {
  const lowerFilename = filename.toLowerCase();
  if (lowerFilename.endsWith(".jpg") || lowerFilename.endsWith(".jpeg"))
    return "image/jpeg";
  if (lowerFilename.endsWith(".png")) return "image/png";
  if (lowerFilename.endsWith(".gif")) return "image/gif";
  if (lowerFilename.endsWith(".bmp")) return "image/bmp";
  if (lowerFilename.endsWith(".webp")) return "image/webp";
  if (lowerFilename.endsWith(".svg")) return "image/svg+xml";
  if (lowerFilename.endsWith(".tiff") || lowerFilename.endsWith(".tif"))
    return "image/tiff";
  return "application/octet-stream";
};

// Detect if response is HTML instead of binary ZIP data
const isHtmlResponse = (data: ArrayBuffer): boolean => {
  try {
    // Convert first few bytes to string and check for HTML tags
    const firstBytes = new Uint8Array(data.slice(0, 30));
    const textDecoder = new TextDecoder();
    const startString = textDecoder.decode(firstBytes).toLowerCase().trim();
    return (
      startString.includes("<!doctype") ||
      startString.includes("<html") ||
      startString.includes("<?xml") ||
      startString.includes("<head")
    );
  } catch (e) {
    return false;
  }
};

// Modify Storj URL to get direct download if needed
const processStorjUrl = (url: string): string => {
  // If it's a Storj sharing link, add download parameter
  if (url.includes("link.storjshare.io")) {
    const urlObj = new URL(url);
    if (!urlObj.searchParams.has("download")) {
      urlObj.searchParams.set("download", "1");
      return urlObj.toString();
    }
  }
  return url;
};

export const extractImagesFromZipUrl = async (
  url: string,
): Promise<ImageFileInput[]> => {
  try {
    // Process URL for Storj
    const processedUrl = processStorjUrl(url);
    console.log(`Fetching ZIP from URL: ${processedUrl}`);

    // Enhanced fetch with improved CORS handling for cloud storage
    const response = await fetch(processedUrl, {
      method: "GET",
      mode: "cors",
      credentials: "omit",
      headers: {
        // Headers optimized for cloud storage providers
        Accept:
          "application/zip, application/octet-stream, application/x-zip-compressed",
      },
    });

    if (!response.ok) {
      const errorStatus = `${response.status} ${response.statusText}`;

      // Try to get more detailed error information
      let errorDetails = "";
      try {
        errorDetails = await response.text();
        // Trim if too long
        if (errorDetails.length > 100) {
          errorDetails = errorDetails.substring(0, 100) + "...";
        }
      } catch (e) {
        errorDetails = "Could not extract error details";
      }

      throw new Error(
        `Failed to fetch ZIP file: ${errorStatus} - ${errorDetails}`,
      );
    }

    console.log("Zip file fetched successfully, loading content...");

    // Check the content type to ensure we're getting binary data
    const contentType = response.headers.get("Content-Type");
    console.log(`Received content type: ${contentType}`);

    // Get the ZIP file as an ArrayBuffer
    const zipData = await response.arrayBuffer();

    if (!zipData || zipData.byteLength === 0) {
      throw new Error("Received empty file data");
    }

    // Check if response is HTML instead of ZIP data
    if (isHtmlResponse(zipData)) {
      throw new Error(
        "Received HTML instead of a ZIP file. Make sure you're using a direct download link with the proper parameters (add '?download=1' for Storj)",
      );
    }

    console.log(
      `Received ${zipData.byteLength} bytes of data, parsing as ZIP...`,
    );

    // Load the ZIP file with JSZip with additional options for robustness
    const zip = await JSZip.loadAsync(zipData, {
      checkCRC32: false, // Less strict CRC checking
      createFolders: true, // Create folder structure
    }).catch((err) => {
      console.error("JSZip loading error:", err);
      throw new Error(`Invalid ZIP format: ${err.message || "Unknown error"}`);
    });

    console.log("ZIP loaded successfully, extracting images...");

    // Extract images from the ZIP file
    const imageFiles: ImageFileInput[] = [];
    const fileKeys = Object.keys(zip.files);

    if (fileKeys.length === 0) {
      throw new Error("ZIP file is empty or invalid");
    }

    console.log(`Found ${fileKeys.length} files in archive`);

    // Iterate through all files in the ZIP
    const filePromises = fileKeys.map(async (filename) => {
      const zipEntry = zip.files[filename];

      // Skip directories and non-image files
      if (zipEntry.dir || !isImageFile(filename)) {
        return;
      }

      try {
        // Get file data as base64 string
        const fileData = await zipEntry.async("base64");
        const mimeType = getMimeType(filename);

        console.log(`Extracted image: ${filename} (${mimeType})`);

        // Add image to the array
        imageFiles.push({
          name: filename.split("/").pop() || filename,
          data: `data:${mimeType};base64,${fileData}`,
          type: mimeType,
          size: fileData.length * 0.75, // Approximate size in bytes from base64
        });
      } catch (error) {
        console.error(`Error extracting file ${filename}:`, error);
      }
    });

    // Wait for all file extractions to complete
    await Promise.all(filePromises);

    console.log(`Extracted ${imageFiles.length} images successfully`);

    // Sort images by filename
    return imageFiles.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error("Error extracting images from ZIP:", error);

    // Provide more helpful error messages for common issues
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (
      errorMessage.includes("network") ||
      errorMessage.includes("Failed to fetch")
    ) {
      throw new Error(
        "Network error: Could not access the ZIP file. Check that the URL is correct and accessible.",
      );
    } else if (errorMessage.includes("CORS")) {
      throw new Error(
        "CORS error: The server doesn't allow accessing the ZIP file. Try a different URL or a URL from a service that allows CORS access.",
      );
    } else if (
      errorMessage.includes("end of central directory") ||
      errorMessage.includes("Invalid ZIP")
    ) {
      throw new Error(
        "Invalid ZIP file: The URL may not point to a valid ZIP file or the file might be corrupted.",
      );
    } else if (errorMessage.includes("Received HTML")) {
      throw new Error(
        "Invalid URL format: The link is pointing to a webpage instead of a ZIP file. For Storj, add '?download=1' to your URL.",
      );
    } else {
      throw error;
    }
  }
};
