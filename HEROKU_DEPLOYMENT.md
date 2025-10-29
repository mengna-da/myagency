# Heroku Deployment Guide

## Prerequisites

1. **Install Heroku CLI**: https://devcenter.heroku.com/articles/heroku-cli
2. **Create a Heroku account**: https://signup.heroku.com/

## Deployment Steps

### 1. Login to Heroku

```bash
heroku login
```

This will open a browser window for authentication.

### 2. Create a New Heroku App

```bash
heroku create your-app-name
```

Or let Heroku generate a random name:
```bash
heroku create
```

Note: Your app URL will be `https://your-app-name.herokuapp.com`

### 3. Set Environment Variables

```bash
heroku config:set NODE_ENV=production
```

### 4. Deploy Your Code

Make sure all your changes are committed:
```bash
git add .
git commit -m "Prepare for Heroku deployment"
```

Deploy to Heroku:
```bash
git push heroku main
```

Or if your branch is named `master`:
```bash
git push heroku master
```

Or if you're on a different branch (e.g., `render-deploy`):
```bash
git push heroku render-deploy:main
```

### 5. Open Your App

```bash
heroku open
```

Or visit: `https://your-app-name.herokuapp.com`

### 6. View Your Desktop Display

- Mobile page: `https://your-app-name.herokuapp.com/`
- Desktop display: `https://your-app-name.herokuapp.com/desktop.html`

## Monitoring & Debugging

### View Logs
```bash
heroku logs --tail
```

### Check App Status
```bash
heroku ps
```

### Restart App
```bash
heroku restart
```

## What Happens During Deployment

1. **Slug Preparation**:
   - Files matching `.slugignore` patterns are removed
   - **IMPORTANT**: `src/` and `public/` are kept because Vite needs them for building

2. **Build Phase**:
   - Heroku installs dependencies: `npm install`
   - Runs `heroku-postbuild` script: `npm run build`
   - Vite compiles `src/` files and copies `public/` assets into `dist/`
   - Creates optimized `dist/` folder

3. **Runtime Phase**:
   - Starts server: `node server.js`
   - Server listens on Heroku's assigned `PORT`
   - Serves static files from `dist/`
   - WebSocket connections work automatically

## Updating Your Deployment

Whenever you make changes:

```bash
git add .
git commit -m "Your commit message"
git push heroku main
```

Heroku will automatically rebuild and redeploy.

## Troubleshooting

### Build Fails
```bash
heroku logs --tail
```
Look for errors during the build phase.

### App Crashes
```bash
heroku ps
heroku logs --tail
```
Check if the server is starting correctly.

### WebSocket Issues
Socket.io should work automatically on Heroku. If you have issues:
- Check CORS settings in `server.js`
- Verify environment-aware socket connection in client code

### Need to Rebuild
```bash
heroku repo:purge_cache -a your-app-name
git commit --allow-empty -m "Rebuild"
git push heroku main
```

## Environment Variables

View all config vars:
```bash
heroku config
```

Set additional variables:
```bash
heroku config:set KEY=value
```

## Scaling (if needed)

```bash
# Scale to 1 dyno (free tier)
heroku ps:scale web=1

# Scale to 2 dynos (requires paid plan)
heroku ps:scale web=2
```

## Useful Commands

```bash
# Open Heroku dashboard
heroku open --admin

# Run commands in Heroku environment
heroku run bash

# Check buildpacks
heroku buildpacks

# View app info
heroku info
```

## Cost Considerations

- **Eco Dynos**: $5/month (sleeps after 30 min of inactivity)
- **Basic Dynos**: $7/month (never sleeps)
- **Standard Dynos**: Starting at $25/month (better performance)

For a thesis installation that needs to be always on, consider Basic or Standard.

## Custom Domain (Optional)

```bash
heroku domains:add www.yourdomain.com
```

Then configure your DNS provider to point to Heroku.

---

## Quick Reference

```bash
# Initial setup
heroku login
heroku create
heroku config:set NODE_ENV=production

# Deploy
git push heroku main

# Monitor
heroku logs --tail
heroku ps

# Manage
heroku restart
heroku open
```

## Support

- Heroku Dev Center: https://devcenter.heroku.com/
- Socket.io on Heroku: https://devcenter.heroku.com/articles/node-websockets

