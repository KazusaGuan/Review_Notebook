# 复习笔记 — DeepSeek Harness 本地插件

DeepSeek Harness 的复习笔记插件：按科目建笔记本，每个笔记本分页，每页可以粘贴截图并附一句话总结。

- 仓库：<https://github.com/KazusaGuan/Review_Notebook>
- 本地包名：`@local/dsh-review-notes`（以 `link:` 方式装入 DSH profile，不发布到 npm）

## 功能

- **按科目建笔记本**：侧边栏「复习笔记」→ 左上「＋」→ 输入科目名称（如「线性代数」），创建后自动带第 1 页。
- **笔记本内切换页**：中间「页」栏点击切换；页可新建、重命名、删除。重命名时点击别处会自动保存并退出。
- **粘贴图片 + 总结**：在页面任意位置按 `Ctrl+V`（或拖拽图片、点「粘贴图片」选择文件），弹窗里预览图片并写总结，保存后成为该页的一条笔记。总结支持换行（Enter 换行，Ctrl+Enter 保存）。
- **管理笔记**：每条笔记可编辑总结、上移 / 下移、删除；点击图片查看大图；双击总结或点铅笔也能编辑。
- **本地持久化**：笔记数据与图片保存在数据目录（默认在 DSH 目录下，可配置），重启应用、切换浏览器或清缓存都不会丢。

## 使用

1. 点击左侧栏的「复习笔记」。
2. 创建笔记本：点笔记本栏右上角「＋」，输入科目名称后回车。
3. 新建页：点「页」栏右上角「＋」（笔记本创建时已自带第 1 页）。
4. 粘贴：把截图复制到系统剪贴板，在笔记界面按 `Ctrl+V`；在弹窗里写一句话总结，按 `Ctrl+Enter` 或点「保存笔记」。
5. 切页、改名、删除都在对应列表行的悬停按钮里。

## 数据位置与配置

默认数据目录：

| 平台 | 默认目录 |
|---|---|
| Windows | `%USERPROFILE%\.dsh\review-notes` |
| macOS / Linux | `~/.dsh/review-notes` |
| 设置了 `DSH_HOME` | `$DSH_HOME/review-notes` |

目录内只有两个条目：

| 路径 | 内容 |
|---|---|
| `review-notes.json` | 笔记本、页、笔记的结构与一句话总结 |
| `review-notes-images/` | 粘贴的原图（PNG / JPEG / WebP / GIF，单张 ≤ 20 MB） |

状态文件是普通 JSON，可以直接备份。笔记引用的图片文件名必须存在于 `review-notes-images/`；删除笔记后孤儿图片会在 10 分钟宽限期后自动清理。

需要把数据放在别处时，在 profile 的补丁里按行 id 覆盖配置（**必须是绝对路径**）：

```yaml
- id: review-notes
  name: '@local/dsh-review-notes'
  config:
    dataDir: 'D:/my/review-notes'
```

插件会在首次写入时创建该目录；已有数据迁移时，把旧的 `review-notes.json` 和 `review-notes-images/` 复制到新目录，再重启或重载插件。`GET /review-notes/api/status` 会返回当前实际生效的 `dataDir`，可用来确认配置。

## 部署

### 前置条件

- 已安装并打开 DSH Desktop（或使用 `dsh web` 的表面），知道当前使用的 profile 名称（桌面版通常是 `desktop`，Web 通常是 `web`）。
- Git 可用；手动部署还需要 `pnpm`（或使用 AI 部署让 DSH 的 plugin_manager 处理依赖）。
- 建议把仓库克隆到用户目录，例如 `~/dsh-plugins/Review_Notebook`（Windows：`%USERPROFILE%\dsh-plugins\Review_Notebook`），不要放进 DSH 安装目录。
- 插件是普通本地 bundle，没有构建步骤；克隆后即可安装。
- 本地插件会在 DSH Host 进程中执行，并可读写你配置的数据目录；只安装你信任的源码，安装前可先检查 `index.js` / `store.js` / `client.js`。

### AI 一键部署（推荐）

把下面整段提示词发给任意带 `plugin_manager` 工具的 DSH agent（当前 DSH 会话也可以）：

```text
请把 https://github.com/KazusaGuan/Review_Notebook 部署到当前 DSH profile：
1. 将仓库 clone 到 ~/dsh-plugins/Review_Notebook（Windows 用 %USERPROFILE%\dsh-plugins\Review_Notebook）。
2. 调用 plugin_manager 的 install_bundle，target 为 link:<该目录的绝对路径>，enabled 为 true。
3. 等待返回 application: applied；访问 http://127.0.0.1:<当前 DSH 端口>/review-notes/api/status 确认 dataDir，
   并确认左侧栏出现「复习笔记」入口。
4. 如果该插件已安装，不要重复覆盖，先报告现有路径和版本；不要修改插件源码或已有笔记。
```

也可以只发一句：

```text
请按 README 的「AI 一键部署」，把 https://github.com/KazusaGuan/Review_Notebook
装进当前 DSH profile，并用 /review-notes/api/status 验证。
```

如果 agent 没有 `plugin_manager` 工具，或安装过程需要交互式权限，请按下面的手动部署操作。AI 部署同样会写入当前 profile，重启后仍然生效。

### 手动部署

1. 克隆仓库：

   Windows（PowerShell）：

   ```powershell
   git clone https://github.com/KazusaGuan/Review_Notebook.git "$env:USERPROFILE\dsh-plugins\Review_Notebook"
   ```

   macOS / Linux：

   ```bash
   git clone https://github.com/KazusaGuan/Review_Notebook.git ~/dsh-plugins/Review_Notebook
   ```

2. 找到当前 profile 目录：

   - DSH Desktop：`%USERPROFILE%\.dsh\profiles\desktop`（macOS/Linux：`~/.dsh/profiles/desktop`）
   - `dsh web`：`~/.dsh/profiles/web`

   实际以启动 DSH 时使用的 profile 为准。

3. 编辑该目录下的 `package.json`，做两处修改（下面是**片段**，请合并到你现有的文件，不要整体覆盖）：

   ```json
   {
     "dependencies": {
       "@local/dsh-review-notes": "link:D:/Users/<you>/dsh-plugins/Review_Notebook"
     },
     "dsh": {
       "profile": {
         "bundles": [
           "@local/dsh-review-notes"
         ]
       }
     }
   }
   ```

   - 依赖名必须是 `@local/dsh-review-notes`，`link:` 后面是克隆目录的**绝对路径**；
     Windows 的 json 路径用正斜杠（如 `link:D:/Users/you/dsh-plugins/Review_Notebook`），macOS/Linux 如 `link:/home/you/dsh-plugins/Review_Notebook`。
   - 把 `@local/dsh-review-notes` 加到已有的 `dsh.profile.bundles` **末尾**，不要清空原有 bundle。
   - 原有 `dependencies` 和 `bundles` 内容保留。

4. 在 profile 目录安装依赖：

   ```powershell
   cd $env:USERPROFILE\.dsh\profiles\desktop
   pnpm install
   ```

   macOS/Linux 对应 `cd ~/.dsh/profiles/desktop && pnpm install`。

5. 重启 DSH Desktop，或刷新 Web GUI。若配置启用了 HMR，也可以在插件管理器里让该行热应用。

6. 验证：

   - 左侧栏出现「复习笔记」。
   - 打开 `http://127.0.0.1:<当前 DSH 端口>/review-notes/api/status`，应返回类似：

     ```json
     {"ok":true,"dataDir":"C:\\Users\\<you>\\.dsh\\review-notes","stateFile":"C:\\Users\\<you>\\.dsh\\review-notes\\review-notes.json"}
     ```

   - 进入记一笔笔记，确认数据目录下生成 `review-notes.json` 和 `review-notes-images/`。

### 更新

```powershell
cd $env:USERPROFILE\dsh-plugins\Review_Notebook
git pull
```

如果依赖或版本有变化，再到 profile 目录运行一次 `pnpm install`，然后重启或热重载插件；仅有前端代码变更时，启用 HMR 的 DSH 会自动替换 UI。

### 卸载

- 用 AI/plugin_manager：禁用并移除 `@local/dsh-review-notes`。
- 手动：从 profile 的 `dsh.profile.bundles` 和 `dependencies` 中移除 `@local/dsh-review-notes`，在 profile 目录运行 `pnpm install`，重启 DSH。

卸载插件**不会删除**笔记数据；数据仍保留在数据目录中。

## 结构

| 文件 | 作用 |
|---|---|
| `index.js` | Host 半侧：在 dsh web server 上注册 `/review-notes/api/*` 与 `/review-notes/images/*` 路由 |
| `store.js` | Host 半侧存储：校验、原子写 `review-notes.json`、图片落盘与孤儿清理 |
| `client.js` | 浏览器半侧：`main` 面板 + `sidebar.panellist` 入口的完整 UI（React，无构建） |
| `cordis.patch.yml` | bundle 插入 `review-notes` 一行；可选 `dataDir` 配置 |
| `tests/store.test.js` | `node --test` 覆盖校验、往返读写、图片类型与清理 |

## 接口

| 方法 | 路径 | 说明 |
|---|---|---|
| `GET` | `/review-notes/api/status` | 返回当前数据目录与状态文件路径（排障用） |
| `GET` | `/review-notes/api/state` | 读取整个文档 |
| `PUT` | `/review-notes/api/state` | 校验后原子替换整个文档（≤ 2 MB） |
| `POST` | `/review-notes/api/image` | 原始图片字节，`content-type: image/png` 等；返回 `{ image }` 文件名 |
| `GET` / `HEAD` | `/review-notes/images/<file>` | 读取图片 |

## 开发

```powershell
cd Review_Notebook
node --check client.js
node --test tests/store.test.js
```

Harness 已启用 HMR：修改 `client.js` 后当前页面会自动替换插件 UI；修改 `index.js` / `store.js` 后若 Host 未自动重载，可在插件管理里关闭再启用 `review-notes` 行。

## 已知限制

- 只在本机使用：状态与图片保存在配置的数据目录（默认在 `~/.dsh/review-notes`），没有多设备同步或导出功能。
- 单张图片上限 20 MB，整个状态文档上限 2 MB（约数千条笔记）；超大截图请先压缩。
- 没有全文搜索、标签或复习计划；页与笔记按手动顺序排列。
- 状态文件手工编辑后必须符合存储模型，否则保存会被拒绝并显示原因。
- **其他程序的置顶/透明悬浮窗可能截走点击**：这类窗口不属于 DSH 页面，点击不会产生页面事件（例如网盘类程序的透明悬浮窗）；把悬浮窗移开、关闭或重启对应程序即可。插件无法拦截窗口外的输入。
- 插件在 DSH 的 `main` 面板与 `sidebar.panellist` 入口中运行，依赖 DSH 0.2.x 的 Web Client 插槽；DSH 大版本升级后如入口消失，先检查插件是否仍处于启用状态。
