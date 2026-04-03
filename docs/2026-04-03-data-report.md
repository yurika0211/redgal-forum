# 2026-04-03 数据库与测试账号报告

日期：2026-04-03

## 一、数据库操作

今天执行了以下数据库相关工作：

- 启动本地 PostgreSQL 服务
- 检查 `roles` 表当前实际内容
- 补齐当前代码依赖的角色代码
- 写入覆盖不同等级的测试账号
- 核对账号状态、角色绑定和认证申请记录

## 二、写入的账号类型

本次写入并核对的账号等级如下：

- `unverified_user`
- `member`
- `moderator`
- `admin`
- `super_admin`

说明：

- `guest` 角色已补齐到数据库，但未创建可登录账号
- 原因是 `guest` 在当前系统语义中代表未登录态，而不是数据库用户

## 三、数据库结果

已确认以下账号存在于数据库中：

- `demo_unverified`
- `demo_member`
- `demo_moderator`
- `demo_admin`
- `demo_super_admin`

状态核对结果：

- `demo_unverified`: `pending_verification`
- `demo_member`: `active`
- `demo_moderator`: `active`
- `demo_admin`: `active`
- `demo_super_admin`: `active`

## 四、密码兼容性

当前后端登录逻辑兼容以下密码存储格式：

- `scaffold:<明文密码>`

本次写入的测试账号均采用该格式，因此可以直接使用报告中的明文密码登录。

## 五、详细结果

详细账号、密码、邮箱、学号、角色映射请查看：

- [用户等级测试账号报告](./seeded-user-accounts-report.md)

## 六、备注

- 本次写入使用的是本地 `rubedo` 数据库实例
- 本次是幂等写入逻辑，重复执行会更新这批演示账号，而不是无限重复插入
