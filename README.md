# 反弹激光 (Bounce Laser)

复古像素风弹幕射击游戏，子弹会反弹 - 小心别打到自己！

## 在线游玩

- **国内访问**: https://bounce-laser.pages.dev/ (Cloudflare Pages)
- **备用地址**: https://infiniteemo.github.io/bounce-laser/ (GitHub Pages，需梯子)

## 本地运行

游戏使用 ES Modules，**不能直接双击 HTML 文件打开**（`file://` 协议下 CORS 会阻止模块加载）。必须通过 HTTP 服务器运行：

```bash
cd G:/code/bullet_reflector
npx serve -l 3000
# 浏览器打开 http://localhost:3000
```

或者用 Python：

```bash
cd G:/code/bullet_reflector
python -m http.server 8089
# 浏览器打开 http://localhost:8089
```

AIGC Hub 中点击「反弹激光 - 启动」会自动启动本地服务器并打开浏览器。

## 部署

项目部署到两个平台，仓库地址：`github.com/InFiNiTeemo/bounce-laser`

### GitHub Pages（推送自动更新）

```bash
cd G:/code/bullet_reflector
git add index.html js/ README.md
git commit -m "描述你的改动"
git push origin master
```

推送后 GitHub Actions 会自动部署，通常 1-2 分钟生效。

### Cloudflare Pages（手动部署）

```bash
cd G:/code/bullet_reflector
NO_PROXY="*" npx wrangler pages deploy . --project-name bounce-laser --branch master
```

部署即时生效，国内可直接访问。

### 两个平台都要更新

改完代码后，先推 GitHub，再部署 Cloudflare：

```bash
cd G:/code/bullet_reflector
git add index.html js/ README.md
git commit -m "描述你的改动"
git push origin master
NO_PROXY="*" npx wrangler pages deploy . --project-name bounce-laser --branch master
```

## 注意事项

- **唯一入口是 `index.html`**：项目只有一个 HTML 文件，不要创建其他 HTML 副本
- **ES Modules 必须用 HTTP 服务器**：双击打开 `index.html` 会白屏无响应，这不是 bug，是浏览器安全策略限制
- **wrangler 代理问题**：如果 `npx wrangler` 命令卡住不动，在命令前加 `NO_PROXY="*"` 绕过本地代理
- **wrangler 登录**：首次使用需要 `npx wrangler login`，会打开浏览器授权 Cloudflare 账号
- **GitHub CLI**：首次推送需要 `gh auth login` 登录 GitHub 账号
- **不要提交 `.wrangler/` 和 `.claude/`**：这些是本地工具缓存，不应该进入版本库

## 项目结构

```
index.html               # 游戏主页面（HTML + CSS）
js/
  core/                   # 核心模块（常量、状态、渲染、游戏循环）
  entities/               # 实体（玩家、敌人、子弹）
  objects/                # 场景物件（苹果、炸药桶、棱镜、传送门）
  systems/                # 系统（伤害、粒子、护盾、升级、教程）
  ui/                     # 界面（输入、屏幕管理、开始动画、关卡解锁、图鉴）
  editor/                 # 关卡编辑器
  levelLoader.js          # 关卡加载器
```
