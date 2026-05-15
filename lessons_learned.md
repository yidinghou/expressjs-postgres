# Lessons Learned: Railway Deployment Journey

## Summary
Successfully deployed Express.js + PostgreSQL app to Railway with TypeScript compilation. The journey involved multiple iterations to get the build process right.

---

## What Worked ✅

### 1. **Dockerfile (Final Solution)**
- **Why it worked**: Gives complete control over build process
- **Approach**: 
  ```dockerfile
  FROM node:18-alpine
  COPY package*.json ./
  RUN npm install
  COPY src ./src
  COPY tsconfig.json ./
  RUN npm run build
  EXPOSE 3000
  CMD ["npm", "start"]
  ```
- **Result**: TypeScript compiled successfully, app started listening on port 3000
- **Lesson**: For Node.js + TypeScript projects, Dockerfile is most reliable

### 2. **Using `run_in_background` for Deployment Monitoring**
- **Why it worked better than Monitor+sleep**: Exits immediately when condition is met (no polling spam)
- **Approach**:
  ```bash
  until railway service status | jq -e '.status == "SUCCESS"'; do sleep 3; done
  ```
- **Result**: One notification when deployment complete, cleaner output
- **Lesson**: For "wait until condition" tasks, use `run_in_background` with `until` loop, not Monitor with continuous polling

### 3. **Railway MCP + CLI Setup**
- Successfully installed Railway CLI, authenticated, created project
- Skill integration working well for direct API calls
- **Environment**: `RAILWAY_CALLER` and `RAILWAY_AGENT_SESSION` env vars needed for telemetry

---

## What Didn't Work ❌

### 1. **Railway.json with buildCommand**
- **Attempt**: 
  ```json
  {
    "build": {
      "buildCommand": "npm run build"
    }
  }
  ```
- **Problem**: Railway didn't recognize/execute the buildCommand
- **Result**: dist/ folder never created, app crashed with MODULE_NOT_FOUND
- **Lesson**: railway.json `buildCommand` isn't reliable; Dockerfile is preferred

### 2. **Procfile-based Build**
- **Attempt**: `web: npm run build && npm start` in Procfile
- **Problem**: Procfile `web:` runs at container START, not BUILD phase
- **Result**: npm start ran before npm run build completed
- **Lesson**: Procfile can't control build phase; only affects runtime startup command

### 3. **.railway/build.sh Script**
- **Attempt**: Create `.railway/build.sh` with build commands
- **Problem**: Railway doesn't automatically discover/run scripts in .railway/
- **Result**: Script never executed, same MODULE_NOT_FOUND error
- **Lesson**: Railway needs explicit configuration (Dockerfile or recognized config files)

### 4. **Initial Deployment Structure**
- **Attempt**: Created `web` service without specifying source (repo/image/dockerfile)
- **Problem**: Service had no build target, couldn't deploy code
- **Result**: Had to manually configure via `railway up`
- **Lesson**: Specify build source clearly when adding services

---

## Issues Encountered & Solutions

### Issue: `Cannot find module '/app/dist/index.js'`
- **Root cause**: TypeScript not being compiled during build phase
- **Tried**: railway.json, Procfile, .railway/build.sh
- **Solved by**: Dockerfile with explicit `RUN npm run build` in build stage
- **Key insight**: Build configuration must be declarative and immediately visible to Railway's builder

### Issue: Database Connection `ECONNREFUSED ::1:5432` ✅ SOLVED
- **Root cause**: `new pg.Pool()` without arguments doesn't read `process.env.DATABASE_URL` reliably
  - When DATABASE_URL is undefined, pg defaults to localhost
  - Docker container receives DATABASE_URL from Railway, but `pg.Pool()` wasn't using it
- **Solution**: Explicitly pass `connectionString` to pg.Pool constructor:
  ```typescript
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  ```
- **Why it works**: Forces pg to use the DATABASE_URL environment variable if available
- **Important**: SSL config with `rejectUnauthorized: false` needed for Railway's internal connections
- **Deployment**: Full cycle working - code changes → commit → push → Railway auto-deploy

---

## Railway Deployment Best Practices

### 1. **Build Configuration Priority** (Best → Worst)
1. ✅ **Dockerfile** — Full control, explicit, works reliably
2. ⚠️ **railway.json with buildCommand** — Should work but appears unreliable
3. ❌ **.railway/build.sh** — Not auto-discovered by Railway
4. ❌ **Procfile** — Only for runtime startup, not build

### 2. **Monitoring Deployments**
- ❌ **Monitor + sleep loop** — Continuous polling, many notifications
- ✅ **Bash run_in_background + until** — Single notification when done
- ✅ **railway logs --follow** — Real-time streaming for debugging

### 3. **Environment Variables**
- Set via `railway variable set KEY=value --service <name>`
- Should be automatically injected by Railway (even in Docker containers)
- Verify with `railway variable list --service <name>`

### 4. **Service Setup**
```bash
# Create project
railway init --name <name>

# Add services
railway add --database postgres
railway add --service web

# Configure
railway variable set DATABASE_URL=... --service web
railway variable set NODE_ENV=production --service web
railway variable set PORT=3000 --service web

# Deploy
railway up --detach -m "deployment message"
```

---

## TypeScript + Node.js on Railway Checklist

- [ ] `tsconfig.json` exists and correctly configured
- [ ] `package.json` has `build` script: `"tsc"` and `start` script
- [ ] `.gitignore` includes `dist/`, `node_modules/`
- [ ] Dockerfile includes build stage: `RUN npm run build`
- [ ] Ensure dist/ is created during Docker build, before CMD
- [ ] DATABASE_URL and other env vars set on service
- [ ] Test locally with `npm run build && npm start`

---

## Timeline

1. ✅ Install Railway CLI & authenticate
2. ✅ Create project: `expressjs-postgres`
3. ✅ Add services: PostgreSQL, web
4. ❌ Initial deploy: MODULE_NOT_FOUND (no build)
5. ❌ Try railway.json buildCommand: Didn't work
6. ❌ Try Procfile with build step: Ran too late
7. ❌ Try .railway/build.sh script: Not discovered
8. ✅ Create Dockerfile: SUCCESS
9. 🔄 Fix database connection (in progress)

---

## Permission & Automation Setup

### Claude Code Permissions
Configured `.claude/settings.json` to auto-allow:
- ✅ All Skill operations (including railway:use-railway)
- ✅ All Bash commands (git, npm, railway CLI)
- ✅ File Write/Edit operations
- ❌ `.claude/` and `settings*` changes (still require approval for safety)

Benefits:
- Eliminates approval prompts for iterative deployment cycles
- Maintains safety boundary for configuration changes
- Enables full automation: code → commit → push → deploy → monitor

### Environment Variable Handling
- Railway injects env vars into service configuration
- Custom Dockerfile: explicitly set `connectionString` in pool config
- Don't rely on `new pg.Pool()` auto-detection of DATABASE_URL

---

## Key Takeaways

1. **Dockerfile is king** for Node.js + build tools like TypeScript
2. **Explicit connection config** beats implicit environment variable detection
3. **Permission granularity** enables safe automation (allow tools, restrict configs)
4. **run_in_background** is better than Monitor for deployment polling
5. **Full automation requires trusting Claude** with deployment operations—set explicit safety boundaries instead
6. Test build locally: `npm run build && npm start` before deploying
7. Document build config explicitly—don't rely on auto-discovery
