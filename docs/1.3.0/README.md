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

## Request to different pods

```shell
curl http://192.168.49.2:32552/
```

## MariaDB

### Add secrets to cluster

```shell
kubectl apply -f docs/1.3.0/mariadb-secret.yaml
```
