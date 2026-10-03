#!/bin/bash
set -a; source /home/z/my-project/.env.local; set +a
# 书集管理员审核 E2E · 下架/驳回/恢复 聚焦验证（无数据残留）
cd /home/z/my-project
DL=/home/z/my-project/download
click_incl() { agent-browser eval "(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes('$1')); if (b) { b.click(); return 'clicked:'+b.textContent.trim().slice(0,12); } return 'not-found'; })()" | tail -1; }
has_text() { agent-browser eval "document.body.innerText.includes('$1')" | tail -1; }

step() { echo; echo "########## $1 ##########"; }

step "启动 dev server"
setsid nohup bun run dev > /dev/null 2>&1 < /dev/null &
for i in $(seq 1 40); do curl -s -o /dev/null --max-time 2 http://localhost:3000/ && break; sleep 2; done
curl -s -o /dev/null --max-time 60 "http://localhost:3000/api/books"
echo "server ready"

step "打开 · 我的 · 管理员面板 · 登录"
agent-browser set viewport 390 844
agent-browser open http://localhost:3000
agent-browser wait --load networkidle
sleep 2
agent-browser find first '[aria-label="我的"]' click
sleep 1.5
agent-browser eval "(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes('管理员审核')); if (b) { b.click(); return 'clicked'; } return 'not-found'; })()" | tail -1
sleep 1.5
if agent-browser eval "!!document.querySelector('input[aria-label=\"管理员口令\"]')" | tail -1 | grep -q true; then
  agent-browser find first 'input[aria-label="管理员口令"]' fill "$SHUJI_ADMIN_PASSCODE"
  click_incl "登录"
  sleep 1
fi
agent-browser wait --fn "document.body.innerText.includes('已上架')" --timeout 10000 && echo "✅ 面板已加载" || echo "❌ 面板未加载"

step "切到已上架 tab · 下架第一本书（小王子）"
click_incl "已上架"
sleep 1
click_incl "下架"
sleep 0.8
agent-browser find first 'input[placeholder^="驳回原因"]' fill "封面图片不清晰"
click_incl "确认驳回"
agent-browser wait --fn "document.body.innerText.includes('已驳回')" --timeout 8000 && echo "✅ 驳回 toast" || echo "❌ 驳回 toast 未出现"
sleep 1
agent-browser screenshot "$DL/verify-27-admin-rejected.png" >/dev/null

step "未通过 tab · 驳回原因展示 · 恢复上架"
click_incl "未通过"
sleep 1
agent-browser eval "document.body.innerText.includes('驳回原因：封面图片不清晰')" | tail -1
click_incl "恢复上架"
agent-browser wait --fn "document.body.innerText.includes('已通过上架')" --timeout 8000 && echo "✅ 恢复上架 toast" || echo "❌ 恢复 toast 未出现"

step "数据库核验（应 12 本全 APPROVED、无残留 note）"
set -a && source .env.local && set +a
SHUJI_URL="$SHUJI_DATABASE_URL" bun -e '
import { Client } from "pg";
const c = new Client({ connectionString: process.env.SHUJI_URL });
await c.connect();
const r = await c.query(`SELECT status, count(*)::int n, count(*) FILTER (WHERE "reviewNote" IS NOT NULL)::int withnote FROM books GROUP BY status`);
console.log(r.rows.map(x => `${x.status}=${x.n}(note:${x.withnote})`).join(", "));
await c.end();' 2>/dev/null

step "收尾"
agent-browser press Escape
sleep 1
agent-browser errors | tail -3
agent-browser close >/dev/null 2>&1
echo "=== E2E 下架/恢复聚焦验证完成 ==="
