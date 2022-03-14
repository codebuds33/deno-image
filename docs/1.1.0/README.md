# 1.1.0

Simple server that shows the server and client IP

## Update deployment image
```shell
kubectl set image deployments deno-webserver deno-webserver=codebuds/deno-webserver:1.1.0
```

## Expose Deployment
```shell
kubectl expose deployment deno-webserver --port=80 --target-port=8080 --type=NodePort
```

