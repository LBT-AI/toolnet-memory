# Storage Backend Configuration

ToolNet Memory supports multiple storage backends for persistent project memory and code intelligence data. This document covers setup and configuration for each supported provider.

## Storage Providers

- **Cloudflare R2** (Recommended) - S3-compatible with zero egress fees
- **AWS S3** - Standard S3 or S3-compatible services
- **Hugging Face S3** (Legacy) - Git-backed storage via Hugging Face
- **Local** - Filesystem-based storage for development/testing

## Configuration Location

Global storage configuration is stored at:

```text
~/.config/toolnet-memory/.env
```

**Never commit this file to version control.** It contains sensitive credentials.

## Cloudflare R2 (Recommended)

Cloudflare R2 provides S3-compatible object storage with zero egress fees, making it ideal for AI coding workflows that frequently read project context.

### Setup Steps

1. **Create R2 Bucket**
   - Log in to Cloudflare Dashboard
   - Navigate to R2 Object Storage
   - Create a new bucket (e.g., `toolnet-memory`)

2. **Generate API Token**
   - Go to R2 → Manage R2 API Tokens
   - Create API Token with "Object Read & Write" permissions
   - Save the Access Key ID and Secret Access Key

3. **Configure ToolNet Memory**

Edit `~/.config/toolnet-memory/.env`:

```bash
STORAGE_PROVIDER=r2
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
R2_BUCKET_NAME=toolnet-memory
```

4. **Verify Connection**

```bash
toolnet-memory doctor
```

### R2 Advantages

- Zero egress fees (free data transfer out)
- S3-compatible API
- Global edge network
- Competitive pricing
- No minimum storage duration

## AWS S3

Standard AWS S3 or any S3-compatible service (MinIO, DigitalOcean Spaces, Backblaze B2, etc.).

### Setup Steps

1. **Create S3 Bucket**
   - Log in to AWS Console
   - Navigate to S3
   - Create bucket with appropriate region and settings

2. **Create IAM User**
   - Navigate to IAM → Users
   - Create user with programmatic access
   - Attach policy with S3 permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::toolnet-memory",
        "arn:aws:s3:::toolnet-memory/*"
      ]
    }
  ]
}
```

3. **Configure ToolNet Memory**

Edit `~/.config/toolnet-memory/.env`:

```bash
STORAGE_PROVIDER=s3
S3_REGION=us-east-1
S3_BUCKET=toolnet-memory
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
```

For S3-compatible services, add endpoint:

```bash
S3_ENDPOINT=https://s3.example.com
```

4. **Verify Connection**

```bash
toolnet-memory doctor
```

### S3-Compatible Services

**MinIO:**
```bash
STORAGE_PROVIDER=s3
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_BUCKET=toolnet-memory
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin
```

**DigitalOcean Spaces:**
```bash
STORAGE_PROVIDER=s3
S3_ENDPOINT=https://nyc3.digitaloceanspaces.com
S3_REGION=nyc3
S3_BUCKET=toolnet-memory
AWS_ACCESS_KEY_ID=your-spaces-key
AWS_SECRET_ACCESS_KEY=your-spaces-secret
```

**Backblaze B2:**
```bash
STORAGE_PROVIDER=s3
S3_ENDPOINT=https://s3.us-west-004.backblazeb2.com
S3_REGION=us-west-004
S3_BUCKET=toolnet-memory
AWS_ACCESS_KEY_ID=your-b2-key-id
AWS_SECRET_ACCESS_KEY=your-b2-application-key
```

## Hugging Face S3 (Legacy)

Git-backed storage using Hugging Face repositories. This provider is considered legacy and may be deprecated in future versions.

### Setup Steps

1. **Create Hugging Face Account**
   - Sign up at https://huggingface.co

2. **Create Repository**
   - Create a new dataset repository (e.g., `username/toolnet-memory`)
   - Make it private to protect project data

3. **Generate Access Token**
   - Go to Settings → Access Tokens
   - Create token with "Write" permissions
   - Save the token (starts with `hf_`)

4. **Configure ToolNet Memory**

Edit `~/.config/toolnet-memory/.env`:

```bash
STORAGE_PROVIDER=huggingface
HF_TOKEN=hf_your_token_here
HF_REPO=username/toolnet-memory
```

5. **Verify Connection**

```bash
toolnet-memory doctor
```

### Limitations

- Git-based storage has performance overhead
- Large binary files may cause issues
- Not recommended for production use
- Consider migrating to R2 or S3

## Local Storage

Filesystem-based storage for development, testing, or air-gapped environments.

### Setup Steps

1. **Choose Storage Directory**

```bash
mkdir -p ~/toolnet-memory-storage
```

2. **Configure ToolNet Memory**

Edit `~/.config/toolnet-memory/.env`:

```bash
STORAGE_PROVIDER=local
LOCAL_STORAGE_PATH=/home/user/toolnet-memory-storage
```

3. **Verify Connection**

```bash
toolnet-memory doctor
```

### Use Cases

- Development and testing
- Air-gapped environments
- Single-machine workflows
- CI/CD pipelines

### Limitations

- No cross-machine synchronization
- No automatic backups
- Manual backup responsibility
- Not suitable for team collaboration

## Object Storage Layout

All providers use the same logical storage structure:

```text
projects/<project-id>/
├── memory/
│   ├── decisions.json
│   ├── rules.json
│   ├── todos.json
│   └── summaries.json
├── code/
│   ├── index.json
│   ├── symbols.json
│   ├── graph.json
│   └── semantic.json
├── sessions/
│   ├── <session-id>.json
│   └── ...
├── work/
│   ├── continuity.json
│   └── handoff.json
└── snapshots/
    ├── <timestamp>.json
    └── ...
```

Each project gets an isolated namespace based on its stable identity.

## Privacy and Security

### Credential Storage

- Credentials are stored in `~/.config/toolnet-memory/.env`
- This file is **never** committed to project repositories
- Use environment-specific credentials (dev/staging/prod)
- Rotate credentials regularly

### Data Sensitivity

- Session transcripts may contain sensitive information
- Code intelligence data includes source structure
- Memory stores decisions and project context
- Use private buckets/repositories
- Enable encryption at rest when available

### Access Control

- Use least-privilege IAM policies
- Restrict bucket access to specific users/services
- Enable bucket versioning for recovery
- Monitor access logs for suspicious activity

### Encryption

**R2/S3:**
- Enable server-side encryption (SSE-S3 or SSE-KMS)
- Use bucket policies to enforce encryption
- Consider client-side encryption for sensitive data

**Hugging Face:**
- Use private repositories
- Enable 2FA on your account
- Limit token permissions

**Local:**
- Use encrypted filesystems (LUKS, FileVault, BitLocker)
- Restrict directory permissions (chmod 700)
- Regular backups to encrypted storage

## Migration Between Providers

To migrate from one provider to another:

1. **Export from old provider:**

```bash
# Set old provider in .env
toolnet-memory doctor

# Export project data
toolnet-memory snapshot:create --project /path/to/project
```

2. **Configure new provider:**

```bash
# Update .env with new provider settings
toolnet-memory doctor
```

3. **Import to new provider:**

```bash
# Initialize project with new provider
toolnet-memory project:manual-init --project /path/to/project

# Restore from snapshot
toolnet-memory snapshot:restore --snapshot <snapshot-id>
```

## Troubleshooting

### Connection Issues

```bash
# Check configuration
toolnet-memory doctor

# Test storage connection
toolnet-memory storage:test

# Verify credentials
toolnet-memory config get STORAGE_PROVIDER
```

### Permission Errors

- Verify IAM/token permissions
- Check bucket/repository access
- Ensure correct region/endpoint
- Review bucket policies

### Performance Issues

- Use R2 for zero egress fees
- Enable CDN/edge caching
- Consider local caching layer
- Monitor network latency

### Data Corruption

- Enable bucket versioning
- Regular snapshot backups
- Test restore procedures
- Monitor storage health

## Best Practices

1. **Use R2 for production** - Zero egress fees and S3 compatibility
2. **Enable versioning** - Protect against accidental deletion
3. **Regular backups** - Snapshot important project states
4. **Rotate credentials** - Update tokens/keys periodically
5. **Monitor costs** - Track storage and transfer usage
6. **Test recovery** - Verify snapshot restore procedures
7. **Secure credentials** - Never commit `.env` files
8. **Use private storage** - Protect sensitive project data

## Support

For storage-related issues:

1. Check `toolnet-memory doctor` output
2. Review [SECURITY.md](../SECURITY.md) for security concerns
3. Open an issue at https://github.com/LBT-AI/toolnet-memory/issues
4. Include sanitized configuration (no credentials)
