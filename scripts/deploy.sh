#!/usr/bin/env bash
# Manual deploy: build the image, push it to Scaleway, and apply the infrastructure.
#
# Requires: docker, tofu, and these environment variables:
#   SCW_ACCESS_KEY, SCW_SECRET_KEY, SCW_DEFAULT_ORGANIZATION_ID
#   TF_VAR_project_id, TF_VAR_admin_email, TF_STATE_BUCKET
set -euo pipefail

: "${SCW_ACCESS_KEY:?}" "${SCW_SECRET_KEY:?}" "${TF_VAR_project_id:?}" "${TF_VAR_admin_email:?}" "${TF_STATE_BUCKET:?}"
export AWS_ACCESS_KEY_ID="$SCW_ACCESS_KEY" AWS_SECRET_ACCESS_KEY="$SCW_SECRET_KEY"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TAG="${IMAGE_TAG:-$(git -C "$ROOT" rev-parse --short HEAD)}"
tofu() { command tofu -chdir="$ROOT/infra" "$@"; }

tofu init -input=false -backend-config="bucket=$TF_STATE_BUCKET"
tofu apply -input=false -auto-approve -target=scaleway_registry_namespace.main
REGISTRY="$(tofu output -raw registry_endpoint)"

echo "$SCW_SECRET_KEY" | docker login "${REGISTRY%%/*}" -u nologin --password-stdin
docker build --platform linux/amd64 -t "$REGISTRY/library:$TAG" "$ROOT"
docker push "$REGISTRY/library:$TAG"

tofu apply -input=false -auto-approve -var="image_tag=$TAG"
echo
echo "App URL: $(tofu output -raw app_url)"
