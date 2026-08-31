# Docker Buildx configuration — Best practice for secrets in Docker builds
# Reference: https://docs.docker.com/build/building/secrets/

variable "DOCKER_REGISTRY" {
  default = "library"
}

group "default" {
  targets = ["frontend"]
}

target "frontend" {
  dockerfile = "./frontend/Dockerfile"
  tags = ["maisonnettev2-frontend:latest"]

  # BuildKit secrets (best practice - secrets don't appear in layers!)
  secret = [
    "type=env,id=PRIVATE_GOOGLE_CLIENT_ID",
    "type=env,id=PRIVATE_GOOGLE_CLIENT_SECRET",
    "type=env,id=PRIVATE_GOOGLE_REDIRECT_URI",
    "type=env,id=PRIVATE_GITE_CALENDAR_ID",
    "type=env,id=PUBLIC_AUTH_URL",
    "type=env,id=PUBLIC_AUTH_REALM",
    "type=env,id=PUBLIC_AUTH_CLIENT_ID",
  ]

  args = {
    BUILDKIT_INLINE_CACHE = "1"
  }
}
