FROM denoland/deno:alpine-1.18.2

COPY . /srv/app

WORKDIR /srv/app

EXPOSE 8080

CMD deno run --allow-run --allow-net webserver.ts
