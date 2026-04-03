# Rubedo 用户等级测试账号报告

日期：2026-04-03

## 数据库位置

- 数据库：`rubedo`
- 主机：`127.0.0.1`
- 端口：`5433`

## 说明

- 已写入数据库的可登录测试账号覆盖以下等级：
  - `unverified_user`
  - `member`
  - `moderator`
  - `admin`
  - `super_admin`
- `guest` 已补入 `roles` 表，但没有创建数据库账号。
  - 原因：`guest` 在当前系统语义里是未登录态，不是可登录用户。
- 当前密码在库中的存储格式为：`scaffold:<明文密码>`。
  - 这与当前后端登录逻辑兼容，可直接用下表中的明文密码登录。

## 账号清单

| 等级 | 用户 ID | 用户名 | 密码 | 邮箱 | 学号 | 状态 | 角色 |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| 未认证用户 | 7 | `demo_unverified` | `RubedoUnverified#2026` | `demo.unverified@rubedo.local` | `RG2026U001` | `pending_verification` | `unverified_user` |
| 认证普通用户 | 8 | `demo_member` | `RubedoMember#2026` | `demo.member@rubedo.local` | `RG2026M001` | `active` | `member` |
| 版主 | 13 | `demo_moderator` | `RubedoModerator#2026` | `demo.moderator@rubedo.local` | `RG2026R001` | `active` | `member, moderator` |
| 管理员 | 9 | `demo_admin` | `RubedoAdmin#2026` | `demo.admin@rubedo.local` | `RG2026A001` | `active` | `member, admin` |
| 超级管理员 | 10 | `demo_super_admin` | `RubedoSuperAdmin#2026` | `demo.superadmin@rubedo.local` | `RG2026S001` | `active` | `member, super_admin` |

## 额外校验

- `demo_unverified` 已写入一条待审核认证记录：
  - `status = pending`
  - `method = student_id`
- 角色表已补齐以下代码：
  - `guest`
  - `unverified_user`
  - `member`
  - `moderator`
  - `admin`
  - `super_admin`
