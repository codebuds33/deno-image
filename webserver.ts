import {getNetworkAddr} from 'https://deno.land/x/local_ip/mod.ts';
import {format} from "https://deno.land/std@0.91.0/datetime/mod.ts";
import {readLines} from "https://deno.land/std/io/bufio.ts";
import {ensureFileSync,} from "https://deno.land/std@0.78.0/fs/mod.ts";
import {Client} from "https://deno.land/x/mysql/mod.ts";
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

    const dbClient = await new Client().connect({
        hostname: "maria-db",
        username: "root",
        db: "logs",
        password: "asecret",
    });

    await dbClient.execute(`CREATE DATABASE IF NOT EXISTS logs`);
    await dbClient.execute(`
        CREATE TABLE IF NOT EXISTS entries
        (
            id         int(11)   NOT NULL AUTO_INCREMENT,
            data       text      NOT NULL,
            created_at timestamp not null default current_timestamp,
            PRIMARY KEY (id)
        ) ENGINE = InnoDB
          DEFAULT CHARSET = utf8;
    `);

    // This "upgrades" a network connection into an HTTP connection.
    const httpConn = Deno.serveHttp(conn);
    const netAddr = await getNetworkAddr();
    // Each request sent over the HTTP connection will be yielded as an async
    // iterator from the HTTP connection.
    for await (const requestEvent of httpConn) {

        const url = new URL(requestEvent.request.url);

        if (url.toString().includes('favicon')) {
            return
        }

        const localFilePath = './local/log.txt'
        const PVCFilePath = './pvc/log.txt'

        await checkFilesExist([localFilePath, PVCFilePath])

        if (url.toString().includes('clean-pvc')) {
            Deno.writeFile(PVCFilePath, new Uint8Array())
        }

        if (url.toString().includes('clean-local')) {
            Deno.writeFile(localFilePath, new Uint8Array())
        }

        let isProbe = false

        if (url.toString().includes('probe')) {
            isProbe = true
        }

        if (url.toString().includes('clean-database')) {
            await dbClient.execute(`delete
                                    from entries`);
        }

        const appendingFile = await openAppendingFile(localFilePath)
        const PVCFile = await openAppendingFile(PVCFilePath)

        const client = requestEvent.request.headers.get(
            "host",
        ) ?? "Unknown"

        let logEntry = `${format(new Date(), "yyyy-MM-dd HH:mm:ss")} - <b>Client</b> : ${client} | <b>Server</b> : ${netAddr} | <b>URL</b> : ${url}`

        if (isProbe) {
            logEntry = `${logEntry} | <b>PROBE</b>`
        }

        logEntry = `${logEntry}\n`

        await appendToFiles([appendingFile, PVCFile], logEntry)
        await dbClient.execute(`INSERT INTO entries(data)
                                values (?)`, [logEntry,]);

        let savedLocal = await readLogFile(localFilePath)
        let savedEmptyDir = await readLogFile(PVCFilePath)
        let dbEntries = await dbClient.query(`select *
                                              from entries`);
        let dbEntrieshtml = '';
        for (const entry of dbEntries) {
            dbEntrieshtml = `${dbEntrieshtml} <b>Id : </b> ${entry.id} <b>Data : </b> ${entry.data} <b>CreatedAt : </b> ${entry.created_at}<br>`
        }

        const body = `
        <b>Current</b>: ${logEntry}<br><br>
        <h3>Log</h3><br>
         <b>PVC</b> <a href="/clean-pvc"><button>Clean</button></a><br>
        ${savedEmptyDir}
        <b>Local</b> <a href="/clean-local"><button>Clean</button></a><br>
        ${savedLocal}
        <b>DataBase</b> <a href="/clean-database"><button>Clean</button></a><br>
        ${dbEntrieshtml}
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

async function checkFilesExist(paths: any) {
    for (const path of paths) {
        ensureFileSync(path);
    }
}

async function openAppendingFile(path: string) {
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
