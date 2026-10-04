# GitHub Desktop 3.6.6 中文版（Fedora 44）

此分支基于 `desktop/desktop` 的 `release-3.6.6`，提供适用于 Fedora 44
x86_64 的中文 RPM。它是个人维护的 Linux 构建，GitHub 官方不支持 Linux。

## 安装

从本仓库的 Releases 下载 RPM 和 SHA256SUMS，在下载目录执行：

```bash
sha256sum -c SHA256SUMS
sudo dnf install ./github-desktop-3.6.6-1.fc44.zh.x86_64.rpm
```

软件包名仍为 `github-desktop`，安装会替换旧版 3.4.13；已有仓库和用户配置
继续保留。启动命令为 `github-desktop`，也可在应用菜单中打开。

登录使用源码构建的开发 OAuth 应用，RPM 注册了相应回调协议。
GitHub 账户登录、联网同步和 Copilot 需要各自的服务权限。此 Linux 构建的
升级通过本仓库 RPM Release 进行。

## 从源码构建

```bash
sudo dnf install git gcc-c++ make python3 rpm-build libsecret-devel xz tar gzip findutils curl
git clone --branch codex/fedora-zh-3.6.6 --recurse-submodules https://github.com/s-infinite-box/desktop.git
cd desktop
# 使用 .node-version 中指定的 Node.js 24.15.0
bash script/linux/build-fedora-zh.sh
```

输出位于 `artifacts/`。GitHub Actions 的 **Fedora Chinese RPM** 工作流可
手动构建；推送 `v*-fedora-zh.*` 标签会构建并发布 Release。

## 汉化集成

词条来自 [robotze/GithubDesktopZhTool 3.6.6](https://github.com/robotze/GithubDesktopZhTool/releases/tag/3.6.6)。
原始发行包 SHA256 为
`295b25840815aa5b56289534a11e3221553ccef233f4e655a417f6e7d1d429c2`。

构建使用本分支生成的 Linux 程序，按词条替换 JavaScript 字符串和模板文字。
`localize.cjs` 会重新解析输出并检查程序结构不变，同时保留替换前的英文脚本
供开发时排查。英文备份不进入 RPM。没有运行 Windows 汉化工具，也没有
用旧的预编译 Linux 脚本覆盖新版本程序。

- `localization/zh-CN-3.6.6.json`：构建使用的词典。
- `localization/zh-CN-overrides.json`：本分支补充的词条，已合入上面的词典。
- `script/linux/extract-translations.cjs`：从解压后的 3.6.6 汉化包重新提取词条。
- `script/linux/localize.cjs`：只替换文本，并验证语法和程序结构。
- `script/linux/package-rpm.py`：构造 RPM、桌面入口、图标和登录回调协议。

动态拼接的少量文字和新增功能仍可能显示英文。词典必须随上游版本审查，
打包脚本会拒绝其他应用版本，以防版本不对应。

Linux 图标和 CLI 启动脚本来自 `shiftkey/desktop`。应用与构建基础遵循
上游 MIT 许可证；汉化资源来源见上述链接。感谢这两个项目的维护者。
