import {Client, format, getNetworkAddr, readLines, ensureFileSync} from './deps.ts'
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

    const MARIADB_HOST = Deno.env.get("MARIADB_HOST") ?? 'maria-db';
    const MARIADB_DATABASE = Deno.env.get("MARIADB_DATABASE") ?? 'logs';
    const MARIADB_PASSWORD = Deno.env.get("MARIADB_PASSWORD") ?? 'asecret';
    const MARIADB_USERNAME = Deno.env.get("MARIADB_USERNAME") ?? 'root';

    console.log(`MariaDB => User : ${MARIADB_USERNAME} | Database : ${MARIADB_DATABASE} | Host : ${MARIADB_HOST}`)

    const dbClient = await new Client().connect({
        hostname: MARIADB_HOST,
        username: MARIADB_USERNAME,
        db: MARIADB_DATABASE,
        password: MARIADB_PASSWORD,
    })

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

        if (url.toString().includes('clean-pvc') || url.toString().includes('clean-all')) {
            Deno.writeFile(PVCFilePath, new Uint8Array())
        }

        if (url.toString().includes('clean-local') || url.toString().includes('clean-all')) {
            Deno.writeFile(localFilePath, new Uint8Array())
        }

        if (url.toString().includes('clean-database') || url.toString().includes('clean-all')) {
            await dbClient.execute(`delete
                                    from entries`);
        }

        let isProbe = false
        let probeType = ''

        if (url.toString().includes('probe')) {
            isProbe = true
            probeType = url.searchParams.get('probeType') as string
        }



        const appendingFile = await openAppendingFile(localFilePath)
        const PVCFile = await openAppendingFile(PVCFilePath)

        const client = requestEvent.request.headers.get(
            "host",
        ) ?? "Unknown"

        let logEntry = `${format(new Date(), "yyyy-MM-dd HH:mm:ss")} - <b>Client</b> : ${client} | <b>Server</b> : ${netAddr} | <b>URL</b> : ${url}`

        if (isProbe) {
            logEntry = `${logEntry} | <b>PROBE</b>`
            if (probeType !== '') {
                logEntry = `${logEntry} : ${probeType}`
            }
        }

        logEntry = `${logEntry}\n`

        await appendToFiles([appendingFile, PVCFile], logEntry)


        let savedLocal = await readLogFile(localFilePath)
        let savedEmptyDir = await readLogFile(PVCFilePath)
        let dbEntrieshtml = '';
        await dbClient.execute(`INSERT INTO entries(data)
                                values (?)`, [logEntry,]);
        let dbEntries = await dbClient.query(`select *
                                              from entries`);

        for (const entry of dbEntries) {
            dbEntrieshtml = `${dbEntrieshtml} <b>Id : </b> ${entry.id} <b>Data : </b> ${entry.data} <b>CreatedAt : </b> ${entry.created_at}<br>`

        }
        const body = `
        <b>Current</b>: ${logEntry}<br><br>
        <b>Logs</b> <a href="/clean-all"><button>Clean All</button></a><br>
        <div style="margin-left: 4rem">
        <b>PVC</b> <a href="/clean-pvc"><button>Clean</button></a><br>
        ${savedEmptyDir}
        <b>Local</b> <a href="/clean-local"><button>Clean</button></a><br>
        ${savedLocal}
        <b>DataBase</b> <a href="/clean-database"><button>Clean</button></a><br>
        ${dbEntrieshtml}
        </div>
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
