#!/bin/bash
set -e

echo ""
echo "⚡ MURIS AI LOGISTICS OS — Setup & Launch"
echo "=========================================="
echo ""

# Check Node
if ! command -v node &> /dev/null; then
  echo "❌ Node.js not found. Install it from https://nodejs.org (LTS version)"
  exit 1
fi

NODE_VER=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VER" -lt 18 ]; then
  echo "❌ Node.js 18+ required. You have $(node --version). Download from https://nodejs.org"
  exit 1
fi

echo "✅ Node.js $(node --version) found"
echo ""

# Get script directory (works even if run from a different folder)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Server setup
echo "📦 Installing server dependencies..."
cd "$SCRIPT_DIR/server"
npm install --legacy-peer-deps --silent

echo "🗄️  Setting up database..."
echo 'DATABASE_URL="file:./prisma/dev.db"' > .env

npx prisma migrate dev --name init --skip-generate 2>&1 | grep -E "(Your database|✔|error)" || true
npx prisma generate --silent 2>&1 | grep -E "(Generated|error)" || true

echo "🌱 Seeding sample data..."
npx tsx src/seed.ts 2>&1 | grep -v "^$" || true
npx tsx src/seed-borders.ts 2>&1 | grep -v "^$" || true

# Client setup
echo ""
echo "🎨 Installing client dependencies..."
cd "$SCRIPT_DIR/client"
npm install --legacy-peer-deps --silent

echo ""
echo "✅ Setup complete! Starting servers..."
echo ""
echo "   Backend  → http://localhost:3001"
echo "   Frontend → http://localhost:5173"
echo ""
echo "   Opening http://localhost:5173 in your browser in 5 seconds..."
echo "   Press Ctrl+C to stop."
echo ""

# Start backend in background
cd "$SCRIPT_DIR/server"
DATABASE_URL="file:./prisma/dev.db" npm run dev &
BACKEND_PID=$!

# Wait for backend to be ready
echo "⏳ Waiting for backend..."
for i in {1..20}; do
  if curl -s http://localhost:3001/api/dashboard > /dev/null 2>&1; then
    echo "✅ Backend ready"
    break
  fi
  sleep 1
done

# Start frontend in background
cd "$SCRIPT_DIR/client"
npm run dev &
FRONTEND_PID=$!

# Wait for frontend to be ready
echo "⏳ Waiting for frontend..."
for i in {1..20}; do
  if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo "✅ Frontend ready"
    break
  fi
  sleep 1
done

sleep 2

# Open browser on Mac
if command -v open &> /dev/null; then
  open http://localhost:5173
fi

echo ""
echo "🚀 MURIS AI Logistics OS is running!"
echo "   Open: http://localhost:5173"
echo "   Press Ctrl+C to stop all servers."
echo ""

# Keep running until Ctrl+C
trap "echo ''; echo 'Stopping...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM
wait
