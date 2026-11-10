# 复习笔记（@local/dsh-review-notes）

DeepSeek Harness 的本地复习笔记插件：按科目建笔记本，每个笔记本分页，每页可以粘贴截图并附一句话总结。

## 功能

- **按科目建笔记本**：侧边栏「复习笔记」→ 左上「＋」→ 输入科目名称（如「线性代数」），创建后自动带第 1 页。
- **笔记本内切换页**：中间「页」栏点击切换；页可新建、重命名、删除。
- **粘贴图片 + 一句话总结**：在页面任意位置按 `Ctrl+V`（或拖拽图片、点「粘贴图片」选择文件），弹窗里预览图片并写一句总结，保存后成为该页的一条笔记。总结支持换行（Enter 换行，Ctrl+Enter 保存）。
- **管理笔记**：每条笔记可编辑总结、上移 / 下移、删除；点击图片查看大图。
- **本地持久化**：笔记数据与图片写在 `D:\文档\电路理论\`（可在插件 config 里改），重启应用、切换浏览器或清缓存都不会丢。

## 使用

1. 点击左侧栏的「复习笔记」。
2. 创建笔记本：点笔记本栏右上角「＋」，输入科目名称后回车。
3. 新建页：点「页」栏右上角「＋」（笔记本创建时已自带第 1 页）。
4. 粘贴：把截图复制到系统剪贴板，在笔记界面按 `Ctrl+V`；在弹窗里写一句话总结，按 `Ctrl+Enter` 或点「保存笔记」。
5. 切页、改名、删除都在对应列表行的悬停按钮里。

## 数据位置

| 路径 | 内容 |
|---|---|
| `D:\文档\电路理论\review-notes.json` | 笔记本、页、笔记的结构与一句话总结 |
| `D:\文档\电路理论\review-notes-images/` | 粘贴的原图（PNG / JPEG / WebP / GIF，单张 ≤ 20 MB） |

状态文件是普通 JSON，可以直接备份；笔记引用的图片文件名必须存在于 `review-notes-images/`。页面里的图片按文件名引用，删除笔记后孤儿图片会在 10 分钟宽限期后自动清理。

## 安装与卸载

插件目录：`D:\dsh-plugins\review-notes`，以本地 link 形式装进 `desktop` profile：

```powershell
# 在 Harness 里让 agent 调 plugin_manager install_bundle：
#   target: link:D:\dsh-plugins\review-notes
```

等价的手工步骤：

1. 在 `%USERPROFILE%\.dsh\profiles\desktop\package.json` 的 `dependencies` 中加入
   `"@local/dsh-review-notes": "link:D:/dsh-plugins/review-notes"`；
2. 在该文件的 `dsh.profile.bundles` 末尾加入 `"@local/dsh-review-notes"`；
3. 在 profile 目录运行 `pnpm install`；
4. 重启 Harness（已启用 HMR 时由插件管理器热加载）。

卸载时从 `dsh.profile.bundles` 和 `dependencies` 中移除并运行 `pnpm install`。笔记数据位于配置的数据目录，卸载插件不会删除数据。

## 结构

| 文件 | 作用 |
|---|---|
| `index.js` | Host 半侧：在 dsh web server 上注册 `/review-notes/api/*` 与 `/review-notes/images/*` 路由 |
| `store.js` | Host 半侧存储：校验、原子写 `review-notes.json`、图片落盘与孤儿清理 |
| `client.js` | 浏览器半侧：`main` 面板 + `sidebar.panellist` 入口的完整 UI（React，无构建） |
| `cordis.patch.yml` | bundle 插入 `review-notes` 一行 |
| `tests/store.test.js` | `node --test` 覆盖校验、往返读写、图片类型与清理 |

## 配置

bundle 的 `cordis.patch.yml` 把数据目录作为行配置传入：

```yaml
- insert:
    - id: review-notes
      name: '@local/dsh-review-notes'
      config:
        dataDir: 'D:/文档/电路理论'
```

`dataDir` 必须是绝对路径；省略时使用默认值 `D:/文档/电路理论`。该目录可以已存在（例如课程资料目录），插件只会新增 `review-notes.json` 与 `review-notes-images/` 两个条目。

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
cd D:\dsh-plugins\review-notes
node --check client.js
node --test tests/store.test.js
```

Harness 已启用 HMR：修改 `client.js` 后当前页面会自动替换插件 UI；修改 `index.js` / `store.js` 后若 Host 未自动重载，可在插件管理里关闭再启用 `review-notes` 行。

## 已知限制

- 只在本机使用：状态与图片保存在配置的数据目录（默认 `D:\文档\电路理论`），没有多设备同步或导出功能。
- 单张图片上限 20 MB，整个状态文档上限 2 MB（约数千条笔记）；超大截图请先压缩。
- 没有全文搜索、标签或复习计划；页与笔记按手动顺序排列。
- 状态文件手工编辑后必须符合存储模型，否则保存会被拒绝并显示原因。
- **其他程序的置顶/透明悬浮窗可能截走点击**：这类窗口不属于 DSH 页面，点击不会产生页面事件（本次排查到的是网盘类程序的透明悬浮窗）；把悬浮窗移开、关闭或重启对应程序即可。插件无法拦截窗口外的输入。
