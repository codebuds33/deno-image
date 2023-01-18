# Kubernetes demo Deno image

## Volumes

The image will write data to `/srv/app/pvc/log.txt` so in order to keep them make sure to share a PVC to that path.

## Database

From *1.3.0* the image will try to connect to a database with the following credentials :

```json
{
  "hostname": "maria-db",
  "username": "root",
  "db": "logs",
  "password": "asecret"
}
```

From *1.4.0* those remain the default values, they can be changed by setting ENV variables
```shell
MARIADB_HOST
MARIADB_USERNAME
MARIADB_DATABASE
MARIADB_PASSWORD
```

make sure to have an accessible service running with the correct user rights.
