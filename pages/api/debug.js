export default function handler(req, res) {
  const relevantVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_DB_URL',
  ]

  const envStatus = {}
  for (const key of relevantVars) {
    envStatus[key] = process.env[key] ? 'SET' : 'MISSING'
  }

  res.json({
    node: process.version,
    env: envStatus,
    cwd: process.cwd(),
  })
}
