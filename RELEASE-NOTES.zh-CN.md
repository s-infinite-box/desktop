基于 GitHub Desktop 最新稳定版 3.6.6，适用于 Fedora 44 x86_64。

- 集成 robotze/GithubDesktopZhTool 3.6.6 简体中文词条，并补充欢迎页文字。
- 从上游源码构建 Linux 应用，使用 Electron 42.0.1 和随应用分发的 Git。
- 提供 RPM、桌面菜单图标和 GitHub 登录回调协议。
- 汉化后通过 JavaScript 语法及程序结构检查。

安装：`sudo dnf install ./github-desktop-3.6.6-1.fc44.zh.x86_64.rpm`

这是个人维护的 Linux 构建。已有 3.4.13 软件包会被替换，用户配置与仓库
保留。少量动态文字可能仍为英文；联网登录、远程同步和 Copilot 不属于
本地离线验证的范围。详细构建和汉化说明见 README.zh-CN.md。
