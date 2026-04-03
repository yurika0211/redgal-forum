 如果你的 .env 放在项目根目录：

```
  cd /media/shiokou/DevRepo31/DevHub/Projects/2026-myapp/redgal_forum/backend
  set -a
  source ../.env
  set +a
  go run ./cmd/api/main.go
```

  如果你的 .env 放在 backend/ 目录：

```
  cd /media/shiokou/DevRepo31/DevHub/Projects/2026-myapp/redgal_forum/backend
  set -a
  source ./.env
  set +a
  go run ./cmd/api/main.go
```

  启动后可以立刻验证：

  curl -s http://127.0.0.1:8080/api/v1/health

  你要重点看返回里的：

  - postgres.configured
  - postgres.reachable

  都应该是 true，这样 demo_admin 这类数据库账号才能走真实登录。
