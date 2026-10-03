#!/bin/bash
set -a; source /home/z/my-project/.env.local; set +a
# 书集管理员审核 E2E · 修正版续跑（沿用上轮已发布的待审书）
cd /home/z/my-project
DL=/home/z/my-project/download
mkdir -p "$DL"

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
echo "基线书卡数: $(agent-browser eval "document.querySelectorAll('main article').length" | tail -1)"

step "进入管理员审核（处理可能存在的登录态）"
agent-browser find first '[aria-label="我的"]' click
sleep 1.5
agent-browser find text "管理员审核" click
sleep 1.5
# 若出现口令输入框则登录；否则直接是面板
if agent-browser is visible 'input[aria-label="管理员口令"]' 2>/dev/null | grep -qi "true"; then
  echo "需要登录 → 输入口令"
  agent-browser find first 'input[aria-label="管理员口令"]' fill "$SHUJI_ADMIN_PASSCODE"
  agent-browser find text "登录" click
  sleep 1
fi
agent-browser wait --fn "document.body.innerText.includes('浏览器审核测试书')" --timeout 10000 && echo "✅ 待审书出现在面板" || { echo "❌ 面板未出现待审书"; agent-browser snapshot -i -c | head -40; }

step "通过审核（精确 ref 点击）"
SNAP=$(agent-browser snapshot -i -c)
echo "$SNAP" | grep -i "通过" | head -5
REF=$(echo "$SNAP" | sed -n 's/.*button "通过".*\(@e[0-9]*\).*/\1/p' | head -1)
echo "通过按钮 ref: $REF"
if [ -n "$REF" ]; then
  agent-browser click "$REF"
  agent-browser wait --fn "document.body.innerText.includes('已通过上架')" --timeout 8000 && echo "✅ 审核通过 toast 出现" || echo "❌ toast 未出现"
  sleep 1
  agent-browser screenshot "$DL/verify-25-admin-approved.png" >/dev/null
else
  echo "❌ 未定位到通过按钮"
fi

step "关闭抽屉（点击顶部遮罩）"
agent-browser mouse click 195 40
sleep 1.5

step "市集出现新书（13 本）"
agent-browser find first '[aria-label="首页"]' click
sleep 2
echo "市集书卡数: $(agent-browser eval "document.querySelectorAll('main article').length" | tail -1)（应为 13）"
agent-browser screenshot "$DL/verify-26-market-13.png" >/dev/null

step "清理：删除测试书"
agent-browser find first '[aria-label="我的"]' click
agent-browser wait --fn "document.body.innerText.includes('我的发布')" --timeout 6000
sleep 1
SNAP2=$(agent-browser snapshot -i -c)
REF2=$(echo "$SNAP2" | sed -n 's/.*button "删除".*\(@e[0-9]*\).*/\1/p' | head -1)
echo "删除按钮 ref: $REF2"
if [ -n "$REF2" ]; then
  agent-browser click "$REF2"
  sleep 1.5
else
  echo "❌ 未找到删除按钮"; echo "$SNAP2" | grep -i "删除" | head -3
fi
agent-browser find first '[aria-label="首页"]' click
sleep 2
echo "清理后市集书卡数: $(agent-browser eval "document.querySelectorAll('main article').length" | tail -1)（应为 12）"

step "控制台错误检查"
agent-browser errors | tail -5
agent-browser close >/dev/null 2>&1
echo "=== E2E 续跑完成 ==="
