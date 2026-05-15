# Railway Monitoring Agent

This agent provides Claude with direct access to your Railway deployment status, logs, and errors.

## Quick Commands

### Check Status
```bash
railway project
railway status
railway logs --tail 50
```

### Get Deployment Info
```bash
railway deployments
railway service list
```

### Check Database Connection
```bash
railway run bash -c "psql $DATABASE_URL -c 'SELECT NOW();'"
```

### View Environment Variables
```bash
railway variables
```

## Common Issues & Fixes

### Database Connection Failures
```bash
# Check if DATABASE_URL is set
railway variables | grep DATABASE_URL

# Test the connection
railway run node -e "const pg = require('pg'); const pool = new pg.Pool(); pool.query('SELECT NOW()', (err, res) => { console.log(err || res.rows); process.exit(0); })"
```

### Runtime Crashes
```bash
# Check recent logs for errors
railway logs --tail 100

# Check resource usage
railway service list
```

### Build Failures
```bash
# View build logs
railway logs --tail 200 | grep -i "build\|error"

# Check if dependencies are properly installed
railway run npm list
```

## Workflow Commands

### Deploy Current Changes
```bash
railway deploy
```

### Rollback to Previous Deployment
```bash
railway rollback
```

### Restart Service
```bash
railway service restart
```

### Check Health Status
```bash
railway status
```

## Environment Configuration

To update environment variables:
```bash
railway variables set KEY=value
```

Critical variables for this app:
- `DATABASE_URL` - PostgreSQL connection string
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (production/development)

## Logs & Monitoring

Real-time log streaming:
```bash
railway logs -f
```

Filter logs by service:
```bash
railway logs --service web --tail 100
```

Get logs in specific time range:
```bash
railway logs --since "2 hours ago"
```

## Links
- [Railway Dashboard](https://railway.app)
- [Railway Documentation](https://docs.railway.app)
- [Railway CLI Reference](https://docs.railway.app/reference/cli-api)
