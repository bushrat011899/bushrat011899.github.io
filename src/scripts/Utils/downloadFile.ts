/**
 * Prompts the user to download a `File` object.
 * @param {File} file object to download.
 */
export function downloadFile(file: File): void {
    const url = URL.createObjectURL(file);

    const button = document.createElement("a");
    button.href = url;
    button.setAttribute("download", file.name);
    
    button.addEventListener("click", () => setTimeout(() => {
        button.remove();
    }));

    button.click();
}