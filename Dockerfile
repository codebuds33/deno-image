FROM denoland/deno:alpine-1.29.4

COPY . /srv/app

WORKDIR /srv/app

EXPOSE 8080

RUN deno run --unstable deps.ts

RUN chown -R 82:82 /srv/app

USER 82:82

CMD deno run --unstable --allow-run --allow-write --allow-read --allow-net --allow-env webserver.ts
