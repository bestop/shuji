#!/bin/bash
set -a; source /home/z/my-project/.env.local; set +a
# 书集管理员审核 E2E · 最终版（发布→徽标→登录→通过→下架→恢复→市集核验→清理）
cd /home/z/my-project
DL=/home/z/my-project/download
mkdir -p "$DL"
click_text() { agent-browser eval "(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === '$1'); if (b) { b.click(); return 'clicked'; } return 'not-found'; })()" | tail -1; }
has_text() { agent-browser eval "document.body.innerText.includes('$1')" | tail -1; }
books_count() { agent-browser eval "document.querySelectorAll('main article').length" | tail -1; }

step() { echo; echo "########## $1 ##########"; }

step "启动 dev server"
setsid nohup bun run dev > /dev/null 2>&1 < /dev/null &
for i in $(seq 1 40); do curl -s -o /dev/null --max-time 2 http://localhost:3000/ && break; sleep 2; done
curl -s -o /dev/null --max-time 60 "http://localhost:3000/api/books"
echo "server ready"

step "打开首页并发布新书"
agent-browser set viewport 390 844
agent-browser open http://localhost:3000
agent-browser wait --load networkidle
sleep 2
echo "基线书卡数: $(books_count)（云端基线 12）"
agent-browser find first '[aria-label="发布书籍"]' click
sleep 1.2
agent-browser find first '#p-title' fill "E2E审核流验证书"
agent-browser find first '#p-price' fill "21"
agent-browser find first '#p-wechat' fill "e2e_final"
agent-browser find text "确认发布" click
agent-browser wait --fn "document.body.innerText.includes('已提交审核')" --timeout 8000 && echo "✅ 已提交审核提示" || echo "❌ 审核提示未出现"
agent-browser screenshot "$DL/verify-22-publish-review-toast.png" >/dev/null
agent-browser press Escape
sleep 1
echo "发布后市集书卡数: $(books_count)（应仍为 12，新书不可见）"

step "我的发布 · 待审核徽标"
agent-browser find first '[aria-label="我的"]' click
agent-browser wait --fn "document.body.innerText.includes('待审核')" --timeout 6000 && echo "✅ 待审核徽标可见" || echo "❌ 徽标缺失"
agent-browser screenshot "$DL/verify-23-mine-pending-badge.png" >/dev/null

step "打开管理员面板并登录"
agent-browser eval "(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes('管理员审核')); if (b) { b.click(); return 'clicked'; } return 'not-found'; })()" | tail -1
sleep 1.5
if agent-browser eval "!!document.querySelector('input[aria-label=\"管理员口令\"]')" | tail -1 | grep -q true; then
  echo "输入口令登录"
  agent-browser find first 'input[aria-label="管理员口令"]' fill "$SHUJI_ADMIN_PASSCODE"
  click_text "登录"
  sleep 1
fi
agent-browser wait --fn "document.body.innerText.includes('E2E审核流验证书')" --timeout 10000 && echo "✅ 待审书进入面板" || echo "❌ 面板未出现待审书"
agent-browser screenshot "$DL/verify-24-admin-panel.png" >/dev/null

step "通过审核"
click_text "通过"
agent-browser wait --fn "document.body.innerText.includes('已通过上架')" --timeout 8000 && echo "✅ 审核通过 toast" || echo "❌ toast 未出现"
sleep 1
agent-browser screenshot "$DL/verify-25-admin-approved.png" >/dev/null

step "下架（附驳回原因）"
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

step "关闭抽屉 · 市集核验 13 本"
agent-browser press Escape
sleep 1.5
agent-browser find first '[aria-label="首页"]' click
sleep 2
echo "市集书卡数: $(books_count)（应为 13）"
agent-browser screenshot "$DL/verify-26-market-13.png" >/dev/null

step "数据库清理测试书"
set -a && source .env.local && set +a
SHUJI_URL="$SHUJI_DATABASE_URL" bun -e '
import { Client } from "pg";
const c = new Client({ connectionString: process.env.SHUJI_URL });
await c.connect();
const del = await c.query(`DELETE FROM books WHERE title = '"'"'E2E审核流验证书'"'"' RETURNING id`);
console.log("已删除:", del.rowCount, "本");
await c.end();' 2>/dev/null

step "最终核验"
agent-browser open http://localhost:3000
agent-browser wait --load networkidle
sleep 2
echo "最终书卡数: $(books_count)（应为 12）"

step "控制台错误检查"
agent-browser errors | tail -5
agent-browser console | rg -i "error" | rg -v "icons|favicon" | head -5 || echo "无关键错误"
agent-browser close >/dev/null 2>&1
echo "=== E2E 最终版完成 ==="
