import {getNetworkAddr} from 'https://deno.land/x/local_ip/mod.ts';
import {format} from "https://deno.land/std@0.91.0/datetime/mod.ts";
import {readLines} from "https://deno.land/std/io/bufio.ts";
import {ensureFileSync,} from "https://deno.land/std@0.78.0/fs/mod.ts";
// Start listening on port 8080 of localhost.
const server = Deno.listen({port: 8080});
console.log(`HTTP webserver running.  Access it at:  http://localhost:8080/`);

// Connections to the server will be yielded up as an async iterable.
for await (const conn of server) {
    // In order to not be blocking, we need to handle each connection individually
    // without awaiting the function
    serveHttp(conn);
}

async function serveHttp(conn: Deno.Conn) {
    // This "upgrades" a network connection into an HTTP connection.
    const httpConn = Deno.serveHttp(conn);
    const netAddr = await getNetworkAddr();
    // Each request sent over the HTTP connection will be yielded as an async
    // iterator from the HTTP connection.
    for await (const requestEvent of httpConn) {
        const url = new URL(requestEvent.request.url);
        if(url.toString().includes('favicon')) {
            return
        }
        // The native HTTP server uses the web standard `Request` and `Response`
        // objects.

        const localFilePath = './local/log.txt'
        const emptyDirFilePath = './emptyDir/log.txt'

        const appendingFile = await openAppendingFile(localFilePath)
        const emptyDirFile = await openAppendingFile(emptyDirFilePath)

        const client = requestEvent.request.headers.get(
            "host",
        ) ?? "Unknown"

        const logEntry = `${format(new Date(), "yyyy-MM-dd HH:mm:ss")} - <b>Client</b> : ${client} | <b>Server</b> : ${netAddr} | <b>URL</b> : ${url}\n`

        await appendToFiles([appendingFile, emptyDirFile], logEntry)

        let savedLocal = await readLogFile(localFilePath)
        let savedEmptyDir = await readLogFile(emptyDirFilePath)

        const body = `
        <b>Current</b>: ${logEntry}<br><br>
        <h3>Log</h3><br>
         <b>EmptyDir</b><br>
        ${savedEmptyDir}
        <b>Saved</b><br>
        ${savedLocal}
        `;
        const bodyHTML = new TextEncoder().encode(body);
        // The requestEvent's `.respondWith()` method is how we send the response
        // back to the client.
        requestEvent.respondWith(
            new Response(bodyHTML, {
                status: 200,
            }),
        );
    }
}

async function openAppendingFile(path: string) {
    ensureFileSync(path);
    return await Deno.open(path, {create: true, append: true});
}

async function appendToFiles(files: any, data: string) {
    for (const file of files) {
        await file.write(new TextEncoder().encode(data))
    }
}

async function readLogFile(path: any) {
    const file = await Deno.open(path);

    let data = ''

    for await(const l of readLines(file)) {
        data = `${l}<br>${data}`;
    }

    return data;
}
