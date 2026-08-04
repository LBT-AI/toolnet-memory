# ToolNet Memory
Persistent memory + code intelligence cho AI coding agents.
## Core
Mỗi thư mục source là một project độc lập:
```text
Project/
├── .toolnet/project.json
└── source...
        ↓
Bucket/projects/<project>/
├── memory/
├── code/
└── snapshots/

Memory, graph, vectors và history của các project không trộn lẫn nhau.

Full Index

toolnet-memory index

Pipeline:

Source Index
→ Type Resolution
→ Rich Graph
→ Semantic Index
→ Architecture
→ Analysis
→ 3D Visualization

3D Graph

Dashboard hỗ trợ nhiều project:

http://HOST:9749

Có search, subsystem filter, relation filter và project selector.

Commands

toolnet-memory doctor
toolnet-memory index
toolnet-memory index:graph
toolnet-memory incremental
toolnet-memory semantic "query"
toolnet-memory impact [file]
toolnet-memory mcp
toolnet-memory snapshot:list
toolnet-memory snapshot:create "reason"
toolnet-memory snapshot:restore <id>
toolnet-memory recover

Storage

Hỗ trợ Hugging Face S3-compatible storage và local fallback.

Global config:

~/.config/toolnet-memory/.env

Không commit:

.env
.toolnet/
node_modules/

Development

npm install
npm run build
npm test

Principle: 1 folder = 1 project = 1 isolated memory universe.
