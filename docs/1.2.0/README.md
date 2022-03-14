# 1.2.0

Simple server that shows the server and client IP

## Update deployment image

```shell
kubectl set image deployments deno-webserver deno-webserver=codebuds/deno-webserver:1.1.0
```

Or run the deployment yaml file to add the replicas

```shell
 kubectl apply -f docs/1.1.0/deployment.yaml
```

## Expose Deployment

```shell
kubectl expose deployment deno-webserver --port=80 --target-port=8080 --type=NodePort
```

## Request to different pods

```shell
curl http://192.168.49.2:32552/
```

