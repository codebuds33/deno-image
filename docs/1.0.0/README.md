# 1.0.0

Simple server that shows the server and client IP

## Launch deployment
```shell
kubectl create --update deployment deno-webserver --image=codebuds/deno-webserver:1.0.0
```

## Expose Deployment

```shell
kubectl expose deployment deno-webserver --port=80 --target-port=8080 --type=NodePort
```

Check which port has been assigned 

```shell
kubectl get service deno-webserver
```

Check the minikube IP

```shell
minikube ip
```
