#!/bin/sh
# Backup automático do MongoDB (roda no serviço mongo-backup do docker-compose).
# Gera um arquivo compactado por execução em /backups e apaga os mais antigos
# que BACKUP_RETENTION_DAYS. Restaurar:
#   docker exec -i adapter3d-mongo mongorestore --archive --gzip --drop < backups/<arquivo>.archive.gz
set -u

RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
INTERVAL_SECONDS="${BACKUP_INTERVAL_SECONDS:-86400}"
MONGO_URI="${MONGO_URI:-mongodb://mongo:27017/digitalcard}"

mkdir -p /backups

while true; do
  FILE="/backups/digitalcard-$(date +%Y%m%d-%H%M%S).archive.gz"
  if mongodump --uri="$MONGO_URI" --archive="$FILE" --gzip --quiet; then
    echo "$(date -Iseconds) backup ok: $FILE ($(du -h "$FILE" | cut -f1))"
  else
    echo "$(date -Iseconds) ERRO: backup falhou" >&2
    rm -f "$FILE"
  fi
  find /backups -name 'digitalcard-*.archive.gz' -type f -mtime +"$RETENTION_DAYS" -delete
  sleep "$INTERVAL_SECONDS"
done
