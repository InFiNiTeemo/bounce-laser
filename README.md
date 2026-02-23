# 反弹激光 (Bounce Laser)

复古像素风弹幕射击游戏，子弹会反弹 - 小心别打到自己！

## 在线游玩

- **国内访问**: https://bounce-laser.pages.dev/ (Cloudflare Pages)
- **备用地址**: https://infiniteemo.github.io/bounce-laser/ (GitHub Pages，需梯子)

## 本地运行

游戏使用 ES Modules，不能直接双击 HTML 文件打开（`file://` 协议下 CORS 会阻止模块加载）。需要通过 HTTP 服务器运行：

```bash
cd G:/code/bullet_reflector
npx serve -l 3000
# 浏览器打开 http://localhost:3000/反弹激光.html
```

或者用 Python：

```bash
cd G:/code/bullet_reflector
python -m http.server 8089
# 浏览器打开 http://localhost:8089/反弹激光.html
```

AIGC Hub 中点击「反弹激光 - 启动」会自动启动本地服务器并打开浏览器。

## 部署更新

项目部署到两个平台，仓库地址：`github.com/InFiNiTeemo/bounce-laser`

**GitHub Pages** — 推送自动更新：

```bash
cd G:/code/bullet_reflector
cp 反弹激光.html index.html
git add index.html 反弹激光.html js/
git commit -m "描述你的改动"
git push origin master
```

**Cloudflare Pages** — 手动部署：

```bash
cd G:/code/bullet_reflector
npx wrangler pages deploy . --project-name bounce-laser --branch master
```

## 项目结构

```
反弹激光.html          # 游戏主页面（HTML + CSS）
index.html             # GitHub Pages 入口（反弹激光.html 的副本）
js/
  core/                # 核心模块（常量、状态、渲染、游戏循环）
  entities/            # 实体（玩家、敌人、子弹）
  objects/             # 场景物件（苹果、炸药桶、棱镜、传送门）
  systems/             # 系统（伤害、粒子、护盾、升级）
  ui/                  # 界面（输入、屏幕管理、开始动画、关卡解锁）
```
