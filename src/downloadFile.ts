/**
 * Prompts the user to download a `File` object.
 * @param {File} file object to download.
 */
export function downloadFile(file: File): void {
    const url = URL.createObjectURL(file);

    const downloadButton = document.createElement("a");
    downloadButton.href = url;
    downloadButton.setAttribute("download", file.name);
    
    downloadButton.addEventListener("click", () => setTimeout(() => {
        downloadButton.remove();
    }));

    downloadButton.click();
}