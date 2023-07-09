"use strict";

const https = require('https');
const fs = require('fs');
const url = require('url');
const path = require('path');

const options = {
    key: fs.readFileSync('server.key'),
    cert: fs.readFileSync('server.crt')
};
    
const MIME_TYPES = {
    '.ico': 'image/x-icon',
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.css': 'text/css',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.wav': 'audio/wav',
    '.mp3': 'audio/mpeg',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword'
};

const PORT = 8181;

function serveStatic(req, res) {
    const parsedUrl = url.parse(req.url);

    const parsedPath = `.${parsedUrl.pathname}`;

    const isFolder = fs.statSync(parsedPath)?.isDirectory();
    
    const pathname = `${parsedPath}${isFolder ? '/index.html' : ''}`;
    
    const ext = !isFolder ? path.parse(pathname).ext : '.html';

    const mime = MIME_TYPES[ext] || 'text/plain';

    res.setHeader('Content-type', mime );

    console.log(`${req.method} ${req.url} ${mime}`);

    // read file from file system
    fs.readFile(pathname, (err, data) => {
        if (err) {
            res.statusCode = 500;
            res.setHeader('Content-type', 'text/plain' );
            res.end(`Error getting the file: ${err}.`);
        } else {
            // if the file is found, set Content-type and send data
            res.end(data);
        }
    });
}

const server = https.createServer(options, (req, res) => {
    try {
        serveStatic(req, res);
    } catch (e) {
        res.statusCode = 500;
        res.end(`Error getting the file: ${e}.`);
    }
});

server.listen(PORT, () => {
    console.log(`Server listening on: https://localhost:${PORT}`);
});