# Hunt: ShowStats

## About

This project is a simple JS-based parser for the `attributes.xml` file for the game Hunt: Showdown. It uses the [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API) to watch `attributes.xml` during games, and automatically stores the results of games in the browser using [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API).

## Usage Instructions

* Open the `index.html` file in any modern browser that supports the following APIs. Note that Chromium based browsers are the only ones that support all required APIs at time of writing.
  * [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API)
  * [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
* Click the "Watch File" button towards the top of the page to select your `attributes.xml` file.
  * This file is located at `./user/profiles/default/attributes.xml` relative to the installation folder of Hunt Showdown.
  * NOTE: If you have Hunt installed in a "System Folder" (e.g., `Program Files (x86)` on Windows), Google Chrome will refuse to open the file for security reasons.
* The table of information should be automatically created and displayed.
* At the end of each game, new data will automatically be parsed, saved, and displayed on this page.

## Troubleshooting

### My Hunt Folder is a System Folder?

If your browser refuses to open `attributes.xml` because it is in a system folder, you have three workarounds:

1. Move your Hunt Showdown installation to a non-system folder.
2. Manually copy & paste `attributes.xml` into a non-system folder at the end of each game.
3. Create a directory link to "trick" the browser into accepting a system folder
    1. Windows PowerShell: `New-Item -ItemType Junction -Path "{Link}" -Target "{Target}"` where `{Link}` is the non-system folder you want to access `attributes.xml` from (e.g., `Documents`), and `{Target}` is the path to the system folder actually holding `attributes.xml`.
    2. Linux: `ln -s {Target} {Link}` where `{Link}` is the non-system folder you want to access `attributes.xml` from (e.g., `Documents`), and `{Target}` is the path to the system folder actually holding `attributes.xml`.
