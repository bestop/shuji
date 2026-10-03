#!/bin/bash
set -a; source /home/z/my-project/.env.local; set +a
# 易书管理员审核 E2E · 第三版（eval 精确点击 + API 通过/驳回/恢复全流程）
cd /home/z/my-project
DL=/home/z/my-project/download
mkdir -p "$DL"
click_text() { agent-browser eval "(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === '$1'); if (b) { b.click(); return 'clicked'; } return 'not-found'; })()" | tail -1; }

step() { echo; echo "########## $1 ##########"; }

step "启动 dev server"
setsid nohup bun run dev > /dev/null 2>&1 < /dev/null &
for i in $(seq 1 40); do curl -s -o /dev/null --max-time 2 http://localhost:3000/ && break; sleep 2; done
curl -s -o /dev/null --max-time 60 "http://localhost:3000/api/books"
echo "server ready"

step "打开首页"
agent-browser set viewport 390 844
agent-browser open http://localhost:3000
agent-browser wait --load networkidle
sleep 2
echo "基线书卡数: $(agent-browser eval "document.querySelectorAll('main article').length" | tail -1)（云端基线 12）"

step "进入管理员审核面板"
agent-browser eval "(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes('管理员审核')); if (b) { b.click(); return 'clicked'; } return 'not-found'; })()" | tail -1
sleep 1.5
# 全新浏览器上下文无 cookie → 需要登录
if agent-browser eval "!!document.querySelector('input[aria-label=\"管理员口令\"]')" | tail -1 | grep -q true; then
  echo "需要登录 → 输入口令"
  agent-browser find first 'input[aria-label="管理员口令"]' fill "$SHUJI_ADMIN_PASSCODE"
  click_text "登录"
  sleep 1
fi
agent-browser wait --fn "document.body.innerText.includes('浏览器审核测试书')" --timeout 10000 && echo "✅ 待审书出现在面板" || echo "❌ 面板未出现待审书"
agent-browser screenshot "$DL/verify-24-admin-panel.png" >/dev/null

step "通过审核"
click_text "通过"
agent-browser wait --fn "document.body.innerText.includes('已通过上架')" --timeout 8000 && echo "✅ 审核通过 toast" || echo "❌ toast 未出现"
sleep 1
agent-browser screenshot "$DL/verify-25-admin-approved.png" >/dev/null

step "下架（驳回已上架书，附原因）"
click_text "已上架"
sleep 1
click_text "下架"
sleep 0.8
agent-browser find first 'input[placeholder^="驳回原因"]' fill "封面图片不清晰"
click_text "确认驳回"
agent-browser wait --fn "document.body.innerText.includes('已驳回')" --timeout 8000 && echo "✅ 驳回 toast" || echo "❌ 驳回 toast 未出现"
sleep 1
agent-browser screenshot "$DL/verify-27-admin-rejected.png" >/dev/null

step "恢复上架"
click_text "未通过"
sleep 1
click_text "恢复上架"
agent-browser wait --fn "document.body.innerText.includes('已通过上架')" --timeout 8000 && echo "✅ 恢复上架 toast" || echo "❌ 恢复 toast 未出现"

step "关闭抽屉回到市集"
agent-browser press Escape
sleep 1.5
STATE=$(agent-browser eval "document.querySelector('[data-vaul-drawer]')?.getAttribute('data-state') || 'none'" | tail -1)
echo "抽屉状态: $STATE"
if [ "$STATE" != "closed" ] && [ "$STATE" != "none" ]; then
  agent-browser mouse move 195 40; agent-browser mouse down; agent-browser mouse up
  sleep 1.5
fi
agent-browser find first '[aria-label="首页"]' click
sleep 2
echo "市集书卡数: $(agent-browser eval "document.querySelectorAll('main article').length" | tail -1)（应为 13）"
agent-browser screenshot "$DL/verify-26-market-13.png" >/dev/null

step "数据库清理测试书"
set -a && source .env.local && set +a
SHUJI_URL="$SHUJI_DATABASE_URL" bun -e '
import { Client } from "pg";
const c = new Client({ connectionString: process.env.SHUJI_URL });
await c.connect();
const del = await c.query(`DELETE FROM books WHERE title = '"'"'浏览器审核测试书'"'"' RETURNING id`);
console.log("已删除:", del.rowCount, "本");
await c.end();' 2>/dev/null
sleep 1

step "最终核验（回到 12 本）"
agent-browser open http://localhost:3000
agent-browser wait --load networkidle
sleep 2
echo "最终书卡数: $(agent-browser eval "document.querySelectorAll('main article').length" | tail -1)（应为 12）"

step "控制台错误检查"
agent-browser errors | tail -5
agent-browser close >/dev/null 2>&1
echo "=== E2E v3 完成 ==="
