# ToolNet Memory

Persistent memory + code intelligence cho AI coding agents.

## Tính năng

- Mỗi thư mục = 1 project độc lập
- Persistent memory
- Code Graph + Type Resolution
- Semantic Code Search
- Architecture & Dependency Analysis
- Dead Code / Impact Guard
- Snapshots
- MCP tools
- Multi-project 3D Graph

## Cài đặt

```bash
git clone https://github.com/LBT-AI/toolnet-memory
cd toolnet-memory
npm install
npm run build
npm link
```

Kiểm tra:

```bash
toolnet-memory help
toolnet-memory doctor
```

## Cấu hình

Tạo config dùng chung:

```bash
mkdir -p ~/.config/toolnet-memory
cp .env.example ~/.config/toolnet-memory/.env
chmod 600 ~/.config/toolnet-memory/.env
```

Điền Hugging Face Storage credentials vào:

```text
~/.config/toolnet-memory/.env
```

## Sử dụng

Đi vào project cần index:

```bash
cd ~/ToolNetSecrets
toolnet-memory index
```

ToolNet tự tạo:

```text
ToolNetSecrets/.toolnet/project.json
```

và lưu riêng trên remote:

```text
projects/ToolNetSecrets/
├── memory/
├── code/
└── snapshots/
```

Project khác cũng hoàn toàn độc lập:

```bash
cd ~/Mercedes
toolnet-memory index
```

## Full Index Pipeline

```text
Source Index
→ Type Resolution
→ Rich Graph
→ Semantic Index
→ Architecture
→ Analysis
→ 3D Visualization
```

## 3D Graph

Chạy dashboard:

```bash
cd ~/toolnet-memory
TOOLNET_GRAPH_HOST=0.0.0.0 TOOLNET_GRAPH_PORT=9749 npm run graph:ui
```

Mở:

```text
http://SERVER_IP:9749
```

Một dashboard có thể chuyển giữa nhiều project, nhưng dữ liệu của từng project vẫn tách biệt.

## Lệnh chính

```bash
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
```

## Development

```bash
npm run build
npm test
```

> 1 folder = 1 project = 1 isolated memory universe.

## Cài nhanh

```bash
curl -fsSL https://raw.githubusercontent.com/LBT-AI/toolnet-memory/main/scripts/install.sh | bash
```

Sau đó:

```bash
source ~/.profile
cd ~/your-project
toolnet-memory index
```
