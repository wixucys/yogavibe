# Build the pinned upstream releases: public MinIO registry images are unavailable.
FROM golang:1.24.2-bookworm AS minio-build
WORKDIR /src
RUN curl -fsSL https://codeload.github.com/minio/minio/tar.gz/refs/tags/RELEASE.2025-04-22T22-12-26Z | tar xz --strip-components=1
RUN CGO_ENABLED=0 go build -trimpath -o /out/minio .

FROM golang:1.24.2-bookworm AS mc-build
WORKDIR /src
RUN curl -fsSL https://codeload.github.com/minio/mc/tar.gz/refs/tags/RELEASE.2025-04-16T18-13-26Z | tar xz --strip-components=1
RUN CGO_ENABLED=0 go build -trimpath -o /out/mc .

FROM debian:bookworm-20250407-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl && rm -rf /var/lib/apt/lists/*

FROM runtime AS server
COPY --from=minio-build /out/minio /usr/local/bin/minio
COPY --from=minio-build /src/LICENSE /usr/share/licenses/minio/LICENSE
ENTRYPOINT ["minio"]

FROM runtime AS client
COPY --from=mc-build /out/mc /usr/local/bin/mc
COPY --from=mc-build /src/LICENSE /usr/share/licenses/mc/LICENSE
ENTRYPOINT ["mc"]
