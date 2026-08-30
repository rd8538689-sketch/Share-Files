/**
 * Copy text to clipboard with high-compatibility fallback support.
 * Resolves issues like 'Failed to execute writeText on Clipboard: Document is not focused' 
 * which frequently occur in sandboxed iframes or inactive tabs.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // Try modern Clipboard API first
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.warn("Modern navigator.clipboard.writeText failed, executing robust fallback: ", err);
  }

  // Old school textarea fallback (handles unfocused document and sandboxed iframe scopes)
  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    
    // Position out of sight securely
    textArea.style.position = "fixed";
    textArea.style.top = "-9999px";
    textArea.style.left = "-9999px";
    textArea.style.width = "2em";
    textArea.style.height = "2em";
    textArea.style.padding = "0";
    textArea.style.border = "none";
    textArea.style.outline = "none";
    textArea.style.boxShadow = "none";
    textArea.style.background = "transparent";
    
    document.body.appendChild(textArea);
    
    // Select and focus
    textArea.focus();
    textArea.select();
    
    const successful = document.execCommand("copy");
    document.body.removeChild(textArea);
    
    if (successful) {
      return true;
    }
  } catch (err) {
    console.error("All copy strategies failed: ", err);
  }

  return false;
}
