# ToolNet Memory Docker

ToolNet Memory provides an official container build for the Node.js 22 runtime.

## Images

Primary release registry:

````text
ghcr.io/lbt-ai/toolnet-memory

The release workflow publishes versioned and latest GHCR images when a
version tag is pushed.

Optional Docker Hub target:

lbtai/toolnet-memory

Docker Hub publishing is disabled unless the repository explicitly configures:

DOCKERHUB_ENABLED=true
DOCKERHUB_USERNAME
DOCKERHUB_TOKEN

This keeps Docker Hub credentials optional and prevents missing external
credentials from breaking normal releases.

Runtime security

The final image:

* runs as the non-root node user,
* uses tini as PID 1,
* contains only production npm dependencies,
* includes Git because ToolNet project identity uses Git repository metadata,
* includes Bash because the published ToolNet CLI entrypoint is a Bash script,
* does not copy .env, .toolnet, .npmrc, private keys, or Git history into
    the image,
* exposes no TCP port by default.

Default command

The image starts the ToolNet foreground daemon:

toolnet-memory service

The daemon communicates over:

/home/node/.toolnet/run/service.sock

Health check

Docker health uses the real ToolNet IPC protocol.

The health process connects to the Unix socket and sends:

{"type":"ping"}

The container is healthy only when the daemon returns a successful ping
response.

No synthetic HTTP health service is created.

Build locally

docker build -t toolnet-memory:local .

Check the CLI:

docker run --rm toolnet-memory:local --version

Run the daemon:

docker run --rm toolnet-memory:local

Run a ToolNet command against a project

Mount the project at /workspace:

docker run --rm \
  -v "$PWD:/workspace" \
  -v toolnet-memory-home:/home/node/.toolnet \
  toolnet-memory:local \
  doctor

Initialize:

docker run --rm \
  -v "$PWD:/workspace" \
  -v toolnet-memory-home:/home/node/.toolnet \
  toolnet-memory:local \
  init

Docker Compose

Set the project directory when it is not the current directory:

export TOOLNET_PROJECT_PATH=/path/to/project
docker compose up -d --build

The compose service uses:

* read-only image filesystem,
* dropped Linux capabilities,
* no-new-privileges,
* writable /tmp tmpfs,
* persistent ToolNet home volume,
* project bind mount.

Project persistence

There are two distinct persistence scopes.

Global/runtime ToolNet state:

/home/node/.toolnet

is stored in the toolnet-memory-home named volume.

Project-scoped ToolNet state:

/workspace/.toolnet

belongs to the mounted project and therefore persists with the project bind
mount.

Shared-volume container coordination

Multiple ToolNet/agent containers on the same Docker host can share the same
project mount.

Project-scoped hook dedupe state lives under:

.toolnet/runtime/dedupe/hooks

When containers share the same project filesystem they observe the same atomic
dedupe claims and ownership-token state.

This is same-filesystem coordination.

It is not a distributed lock for S3, R2, or another object store.

Cross-host convergence continues to use the immutable append-only multi-host
operation architecture.

Permissions

The container runs as the standard Node image user:

uid=1000
gid=1000

The mounted project must be writable by that user when ToolNet needs to create
or update .toolnet.

If the host project is root-only, adjust its permissions rather than running
the ToolNet image permanently as root.

Graph UI

The default Docker daemon service exposes no Graph TCP port.

Graph UI remains a separate explicit command.

For a Graph container, preserve the existing Graph security model:

* bind exposure explicitly,
* use TOOLNET_GRAPH_TOKEN for untrusted networks,
* prefer host-side localhost publication or a protected reverse proxy.

Multi-architecture releases

The Docker release workflow builds:

linux/amd64
linux/arm64

with provenance and SBOM generation enabled.
## Optional remote encryption in Docker

Remote encryption remains disabled unless explicitly enabled.

Generate the key outside the image:

```bash
openssl rand -base64 32 > toolnet-encryption.key
chmod 600 toolnet-encryption.key
````

Then mount it read-only:

```bash
docker run --rm \
  -e TOOLNET_REMOTE_ENCRYPTION=on \
  -e TOOLNET_REMOTE_ENCRYPTION_KEY_FILE=/run/secrets/toolnet_remote_encryption_key \
  -v "$PWD/toolnet-encryption.key:/run/secrets/toolnet_remote_encryption_key:ro" \
  -v "$PWD:/workspace" \
  -v toolnet-memory-home:/home/node/.toolnet \
  toolnet-memory:local \
  doctor
```

The key is not copied into the Docker image. Do not commit the key file to Git.
