# scoreboard-bot-server

中间层服务，为 SNS 机器人提供米哈游数据查询与图片渲染能力。

## 基础信息

- 默认端口: `3000`
- userId 传递方式: 查询参数 `?userId=xxx` 或请求头 `x-user-id: xxx`
- 响应格式: JSON（除渲染接口返回 PNG）

---

## 接口列表

### 1. 健康检查

仅调试用，生产不使用

```
GET /api/health
```

返回 Redis、上游 API、Chromium 连通性。

---

### 2. 发起扫码登录

使用建议：只在私聊对话允许使用相关命令；需传递能唯一标识用户的id作为userId，如QQ号等；限制该命令的访问频率

```
POST /api/login
Content-Type: application/json

{"userId": "user-001"}
```

返回一张 PNG 二维码图片。下游应展示给用户扫码。

> 此接口不需要传递 `x-user-id` 头，userId 从请求体读取。

---

### 3. 查询扫码状态

仅调试用，生产不使用

```
GET /api/login/status?userId=user-001
```

返回：

```json
{
  "userId": "user-001",
  "state": "QR_PENDING",
  "qrUrl": "https://...",
  "polling": true
}
```

状态流转：

| state        | 含义             |
| ------------ | ---------------- |
| `IDLE`       | 未发起登录       |
| `QR_PENDING` | 等待扫码         |
| `QR_SCANNED` | 已扫码，等待确认 |
| `LOGGED_IN`  | 登录成功         |
| `QR_EXPIRED` | 二维码过期       |

> 需要传递 `x-user-id: user-001` 或 `?userId=user-001`

---

### 4. 查询游戏角色列表

使用建议：只在私聊对话允许使用相关命令

```
GET /api/games?userId=user-001
```

返回：

```json
{
  "userId": "user-001",
  "roles": [
    {
      "game_biz": "hk4e_cn",
      "region": "cn_gf01",
      "game_uid": "100000001",
      "nickname": "旅行者",
      "level": 60,
      "is_chosen": false,
      "region_name": "天空岛",
      "is_official": true,
      "is_banned": false
    }
  ]
}
```

> 登录成功后自动选择最优角色。无需手动调用此接口，除非需要切换。

---

### 5. 手动选择游戏角色

使用建议：只在私聊对话允许使用相关命令

```
POST /api/games/select
Content-Type: application/json
x-user-id: user-001

{"game_uid": "100000001"}
```

返回选中结果。通常无需手动调用——登录后会自动选择。

---

### 6. 渲染个人名片

主要功能，可在任何对话使用；限制该命令的访问频率

```
POST /api/render
Content-Type: application/json
x-user-id: user-001

{}
```

返回一张 PNG 图片。包含：

- 玩家名片（头像、昵称、UID、段位、天梯分、巅峰分、排名）
- 对局记录列表（对手信息、分数变化、胜负）

> 需要先登录并选定角色。若未选定会自动查询。

---

### 7. 查询对局记录（JSON）

仅调试用，生产不使用

```
GET /api/game-records?userId=user-001
```

返回：

```json
{
  "userId": "user-001",
  "gameUid": "100000001",
  "records": [
    {
      "nickname": "对手名",
      "avatar_url": "https://...",
      "timestamp": "1780528021",
      "result": "Win",
      "ladder_score": { "score": 2700, "score_change": 5 },
      "peak_score": { "score": 0, "score_change": 0 },
      "trans_no": "100000001_100000002_1780528021_456789_cn_gf01"
    }
  ]
}
```

---

### 8. 查询个人主页（JSON）

仅调试用，生产不使用

```
GET /api/home-page?userId=user-001
```

---

### 9. 查询巅峰排名（JSON）

仅调试用，生产不使用

```
GET /api/peak-rank?userId=user-001
```

---

## 典型流程

```
1. POST /api/login          → 获取二维码图片
2. GET  /api/login/status   → 轮询直到 LOGGED_IN（自动选角色）
3. POST /api/render         → 获取名片图片
4. 可选: GET /api/game-records → 获取对局 JSON 自行处理
```

## 错误处理

| HTTP 状态码 | code                | 含义                 |
| ----------- | ------------------- | -------------------- |
| 401         | `SESSION_NOT_FOUND` | 未传 userId          |
| 401         | `NOT_LOGGED_IN`     | 未登录               |
| 401         | `SESSION_EXPIRED`   | 登录过期，需重新扫码 |
| 400         | `VALIDATION_ERROR`  | 参数错误             |
| 502         | `UPSTREAM_ERROR`    | 上游 API 异常        |
| 500         | `INTERNAL_ERROR`    | 服务内部错误         |

遇到 `SESSION_EXPIRED` 时重新调用 `POST /api/login`。
