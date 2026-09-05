set -euo pipefail

IMAGE="ghcr.io/constantine950/cartplex"
TAG="${1:-latest}"

docker build --target production -t "${IMAGE}:${TAG}" .
docker push "${IMAGE}:${TAG}"

echo "Pushed ${IMAGE}:${TAG}"