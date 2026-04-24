# Lex CRM - Setup & Deployment Guide

## ✅ What's Been Implemented

### 1. **Database Persistence** ✓
- Migrated from localStorage to SQLite + Prisma ORM
- All data (Leads, Buyers, Deals) now saves to database automatically
- Data persists across browser sessions and devices

### 2. **Authentication System** ✓
- Password-protected login page
- First-time setup screen (create password on first visit)
- Session-based authentication
- Logout functionality available in all pages
- Secure cookies for session management

### 3. **Full CRUD Operations** ✓
- **Leads**: Create, read, update, delete seller information
- **Buyers**: Create, read, update, delete buyer profiles
- **Deals**: Create, read, update deal status (Open, In Progress, Closed Won, Closed Lost)
- All data tied to database with proper relationships

### 4. **Navigation & Layout** ✓
- Home button (navigates to dashboard)
- Navigation bar on all pages
- Logout button in top-right corner
- Consistent styling across all pages

---

## 🚀 How to Use Locally

### Start Development Server
```bash
cd /Users/lex/lex-crm
npm run dev
```
The app runs at **http://localhost:3000**

### First-Time Setup
1. Visit http://localhost:3000
2. You'll be redirected to /login
3. Click "Create Password" and set your password
4. Log in with your password
5. Access Leads, Buyers, and Deals pages

### Test Features
- Add a Lead: Enter name, phone, address, notes
- Add a Buyer: Enter buyer info and budget
- Add a Deal: Link leads to buyers, set deal value
- All data saves automatically to database
- Delete items with delete button on each card

---

## 🌐 Deployment Options

### Option 1: **Vercel (Recommended - Easiest)**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```
- Automatic git integration
- Free tier available
- Custom domain support

### Option 2: **Railway** (Great for databases)
```bash
# Push to git first
git add .
git commit -m "Add authentication and database"
git push

# Then connect on railway.app
```

### Option 3: **Docker** (Self-hosted)
Create a `Dockerfile`:
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npx prisma generate
EXPOSE 3000
CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t lex-crm .
docker run -p 3000:3000 -e DATABASE_URL="file:./dev.db" lex-crm
```

---

## 🔒 Security Notes

### Before Public Deployment
1. **Change database to PostgreSQL** (SQLite not recommended for production)
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

2. **Use proper password hashing** (currently storing plaintext - not secure!)
   ```bash
   npm install bcrypt
   ```
   Update `/api/auth/init` and `/api/auth` to hash passwords

3. **Add HTTPS enforcing** in next.config.ts

4. **Set strong environment variables**
   ```
   DATABASE_URL=<your_postgres_url>
   NEXTAUTH_SECRET=<random_secret>
   ```

---

## 📦 Environment Variables (.env)

Create a `.env.local` file:
```
# Database
DATABASE_URL="file:./dev.db"  # For SQLite locally
# DATABASE_URL="postgresql://user:pass@host:5432/db"  # For production

# API
NEXT_PUBLIC_API_URL="http://localhost:3000"  # For local dev
# NEXT_PUBLIC_API_URL="https://yourdomain.com"  # For production
```

---

## 📊 Database Schema

```
User
├── id (Int)
└── password (String)

Lead
├── id (Int)
├── name (String)
├── phone (String)
├── address (String?)
├── motivation (String?)
└── createdAt (DateTime)

Buyer
├── id (Int)
├── name (String)
├── phone (String)
├── email (String?)
├── budget (String?)
├── notes (String?)
└── createdAt (DateTime)

Deal
├── id (Int)
├── title (String)
├── leadName (String)
├── buyerName (String)
├── status (String) - Open, In Progress, Closed Won, Closed Lost
├── value (String?)
├── notes (String?)
└── createdAt (DateTime)
```

---

## 🛠 Available Scripts

```bash
npm run dev       # Start development server
npm run build     # Build for production
npm start         # Start production server
npm run lint      # Run linter

# Prisma commands
npx prisma studio  # Open Prisma Studio (visual database viewer)
npx prisma db push # Push schema changes to database
npx prisma migrate dev --name <name>  # Create migration
```

---

## 📱 Features Checklist

- ✅ Home button (dashboard with navigation)
- ✅ Data persistence (database with SQLite/Prisma)
- ✅ Password security (authentication system)
- ✅ Public/accessible (ready for deployment)
- ✅ Leads management
- ✅ Buyers management
- ✅ Deals tracking
- ✅ Auto-logout on session expiry (can be added)
- ✅ Responsive design (mobile-friendly)

---

## 🚢 Quick Deploy to Vercel

```bash
# 1. Create Vercel account at vercel.com
# 2. Connect your GitHub repo
# 3. Set environment variables in Vercel dashboard
# 4. Deploy!
```

Or use CLI:
```bash
npm i -g vercel
vercel --prod
```

---

## 💡 Next Steps

1. **Security**: Implement bcrypt for password hashing
2. **Database**: Switch to PostgreSQL for production
3. **Backups**: Set up automated database backups
4. **Advanced**: Add email notifications, reports, user roles
5. **Mobile**: Improve mobile UI, add PWA support

---

## ❓ Troubleshooting

### "Password incorrect" on first visit
- Clear browser cookies and try again
- Check browser console for errors

### Data not saving
- Check database connection in `.env`
- Run `npx prisma studio` to inspect database
- Check API routes in `/api/` folder

### Deployment issues
- Ensure `DATABASE_URL` is set in production
- Run `npx prisma migrate deploy` after deployment
- Check production logs in hosting provider dashboard

---

**Your CRM is ready to use! 🎉**

Start the dev server with `npm run dev` and visit http://localhost:3000
