# Network Test · 网络延迟与速度测试

一个用于测试网络**延迟**、**下载速度**与**长期稳定性**的纯前端工具，界面风格参考 [claude.ai](https://claude.ai)。

技术栈：**Vite + React + TypeScript + Tailwind CSS + shadcn/ui 风格组件 + Recharts**，使用 **pnpm** 管理依赖。

---

## ⚠️ 关于本项目的重要声明

> **本项目几乎完全由 AI（Claude）撰写，人工参与的部分极少。**
>
> 代码可能包含未被充分审查的逻辑、边界问题或安全隐患。**如需在生产环境或重要场景中使用，请务必自行通读、审计并充分测试，并自行承担相应后果。**

---

## 🧭 界面布局

左右双栏，**两栏各自独立滚动**；右栏是一个**活动流**，每发起一次测试就在顶部追加一条记录。

```
┌─────────────────────────────────────┬──────────────────────────┐
│ [搜索: 名称 / 标签]                    │  当前网络（IP 卡片，常驻）  │
│ [测延迟全部][测速全部][添加][清空自定义] │  测试设置（线程/时长/次数…）│
│ [自动测速开关]                         ├──────────────────────────┤
│ ☐ Cloudflare  CDN Speedtest  [延迟][速度][长期] │  活动流：                  │
│   ▁▃▅▂… 延迟 12ms  速度 95Mbps         │   ▸ Cloudflare 测速（实时） │
│ ☐ Claude      AI             [延迟][长期]      │   ▸ GitHub 长期监测       │
│ …（独立滚动）                          │   …（独立滚动）            │
└─────────────────────────────────────┴──────────────────────────┘
```

- **左栏（约 65%）**：站点选择器。卡片显示标签、彩色延迟柱状图与延迟/速度摘要，操作按钮固定在标题右侧（滚动时位置不变）。
- **右栏（约 35%）**：顶部常驻 IP 信息与测试设置；下方为活动流，测速与长期监测都会作为独立条目追加。

---

## ✨ 功能

### 当前网络信息
- 进入即通过 [ip.sb](https://ip.sb) 查询公网 IP / 归属地 / 运营商 / ASN，并用 [RIPEstat](https://stat.ripe.net) 补充**路由前缀（CIDR）**。
- 前缀跳转 [bgp.tools](https://bgp.tools)，ASN 跳转 [PeeringDB](https://www.peeringdb.com)。

### 延迟测试
- 内置常用站点与基础设施（Cloudflare / Akamai / Fastly / jsDelivr、Google / Bing / 百度、Gmail / Outlook、GitHub / GitLab、淘宝 / 京东 / eBay / Shopify、Steam、Telegram DC1–5、微信 / B 站 等），带**标签**。
- 标签分**功能**（CDN / AI / Search / Email / Media / Shop / Game …）与**厂商**（Microsoft / Google / Apple / Telegram）。**分组按功能**（如 Google / Bing / 百度 同在 Search 组）；厂商作为标签可点击快速筛选（如点 Microsoft 看 Bing / Outlook / GitHub / Microsoft 365）。
- 可点击标签快速筛选；也可手动「排序」按当前平均延迟排列（不自动重排）。
- 默认每个目标探测 **16 次**；柱状图以**颜色**反映质量（绿=好 / 黄=一般 / 红=差），鼠标悬停可看每一次的具体延迟；末尾保留 min/max/avg 与丢包率。
- **一键测延迟**（全部或所选）。
- **自动测速开关 + 懒加载**：开启后站点滚动进入视野时自动**排队**测一次延迟（`IntersectionObserver`）。
- **长期监测**：按设定间隔持续探测某站点，在右栏绘制延迟时间线并统计平均/抖动/丢包，用于评估稳定性。

### 速度测试
- **多线程**（1/2/4/8 并发连接），实时聚合吞吐；曲线与各项指标（平均/最大/流量/首字节延迟/用时）**持续刷新**。
- **渐进加速策略**：开启后连接分批启动（约每 `时长 / 线程数` 秒增加一条），可观察吞吐随并发增长——把鼠标悬停在设置项上有说明。
- **流量上限**：可设定下载到指定 MB 后停止。
- 平均速度从**首字节之后**开始计算，排除连接建立开销，结果更具代表性。

### 自定义与设置
- 自定义站点可**添加 / 编辑 / 删除 / 清空**，保存在浏览器 **localStorage**。
  - 名称留空时尝试抓取网页 `<title>`（经公共 CORS 代理，失败回退域名）。
  - 位于 Cloudflare 之后的站点会探测 `/cdn-cgi/trace`，以**边缘节点**作为延迟探测点，排除后端影响。
  - 可填写支持 CORS 的测速文件地址，使其可测速；可打标签。
- 工具栏支持**复选选择**：选中后可对所选执行 测延迟 / 测速 / 删除；未选中时按钮作用于全部。
- **测试设置卡片**（右栏常驻）：测速前即可设置线程数、渐进加速、测速时长、流量上限、延迟次数、监测间隔。
- 同一时刻只允许一个测试运行，避免相互干扰。

---

## 🚀 快速开始

```bash
pnpm install   # esbuild 构建脚本已在 package.json 的 pnpm.onlyBuiltDependencies 中放行
pnpm dev
pnpm build
pnpm preview
```

要求：Node ≥ 18（推荐 20+）、pnpm ≥ 8。

字体与图标均为**本地资源**（字体由 Vite 打包进 `/assets`，内置站点图标在 `/icons/`），不依赖外部 CDN，便于反向代理做缓存。

### 图标

- 内置图标由 `pnpm fetch-icons` 下载到 `public/icons/<id>.png`（来源优先 DuckDuckGo 的真实站点 favicon，回退 Google S2）。`pnpm fetch-icons --force` 重新抓取全部。
- **手动替换**：每个图标就是 `public/icons/<id>.png` 一个文件。某个图标不透明 / 模糊 / 错误时，直接把你自己的 PNG 放到对应路径即可——普通 `pnpm fetch-icons` 会跳过已存在的文件，不会覆盖你的手填图标。`<id>` 见 [src/config/targets.ts](src/config/targets.ts) 各站点的 `id`。
- 也可在 [scripts/fetch-icons.mjs](scripts/fetch-icons.mjs) 的 `OVERRIDES` 里为某个 `id` 指定更优的图标 URL。
- 已知偏小/可能偏糊、建议手动替换的：`bing`、`x`、`wechat` 等（站点自身 favicon 分辨率较低）。

---

## 🚀 部署

### Docker

```bash
docker build -t network-test .
docker run -p 8080:80 network-test
```

镜像基于 nginx，内置 SPA 回退与缓存头（`/assets` 一年 immutable、`/icons` 7 天）。配置见 [nginx.conf](nginx.conf)。

### Cloudflare Workers（静态资源）

由 GitHub Actions 自动部署（[.github/workflows/deploy.yml](.github/workflows/deploy.yml)），使用 `cloudflare/wrangler-action@v4`。在仓库 Secrets 中配置：

- `CLOUDFLARE_API_TOKEN`（含 Workers 部署权限）
- `CLOUDFLARE_ACCOUNT_ID`

推送到 `main` 即构建并部署 `./dist`（配置见 [wrangler.toml](wrangler.toml)，SPA 回退已开启）。也可本地 `pnpm build && npx wrangler deploy`。

---

## 🧱 项目结构

```
src/
├── components/
│   ├── ui/         # 基础组件（button、card、switch、checkbox、input…）
│   ├── ip/         # IP 信息卡片
│   ├── site/       # 站点列表、卡片、延迟柱状图、添加/编辑表单
│   ├── settings/   # 测试设置卡片
│   ├── speed/      # 速度曲线图
│   ├── layout/     # 浮动控制（面板切换 / 回到顶部）
│   └── activity/   # 右栏活动流（测速 / 长期监测 / 大次数延迟条目）
├── config/         # 内置站点、标签、默认设置
├── hooks/          # useIpInfo / useTestRunner / useSettings / useCustomTargets / useInView
├── lib/network/    # ip-info、latency、speed、site 核心逻辑
└── types/          # 共享类型
```

---

## 🔬 重要限制（请务必了解）

- **延迟**：浏览器无法发送 ICMP ping，这里用 `no-cors` 的 HTTP 请求近似往返时间，含 DNS/TCP/TLS 开销，仅供横向参考。
- **速度只能测量支持 CORS 的下载源**：读取跨域响应体需要对方返回宽松 CORS 头；`no-cors` 请求既读不到字节也读不到文件大小，**无法计算速度**。因此内置测速源仅含 **Cloudflare / CacheFly / jsDelivr**。**Steam / Akamai / Microsoft / 腾讯 QQ 等大文件通常不返回 CORS 头，无法在浏览器中测速**——这是浏览器安全模型的限制；若你有支持 CORS 的地址，可自行在「添加」中加入。
- **标题抓取 / Cloudflare 探测**：均依赖第三方或对方是否允许跨域，属尽力而为，可能失败并回退。
- **图标**：使用 Google S2 高清 favicon（128px），加载失败回退为首字母；该服务在部分网络环境下可能不可访问。
- 测速会消耗**真实流量**，移动网络下请留意资费。

---

## 📄 许可

仅供学习与个人自测使用。第三方 API、商标与站点归各自所有者所有。