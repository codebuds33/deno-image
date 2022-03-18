# 1.3.0

Connect To MariaDB

## Update deployment image

```shell
kubectl set image deployments deno-webserver deno-webserver=codebuds/deno-webserver:1.2.0
```

Or run the deployment yaml file to add the volume

```shell
 kubectl apply -f docs/1.3.0/deployment.yaml
```

## Expose Deployment

```shell
kubectl expose deployment deno-webserver --port=80 --target-port=8080 --type=NodePort
```

### For other namespace

```shell
kubectl expose deployment deno-webserver-other --port=80 --target-port=8080 --type=NodePort
```
