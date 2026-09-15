# Kasange Secondary School — Results Frontend

Frontend demo for the Kasange Secondary School Results Management System.

## Included
- Teacher Login
- Teacher profile + photo upload
- Form One to Form Six class selection
- Class image placeholders
- Subject, term, year and stream information
- Student results entry
- Add/delete students
- Automatic grades
- Review before submit
- Submit to Admin workflow
- Results history stored in database only
- Admin login
- Admin profile + photo upload
- Admin dashboard and approval
- Light/Dark mode
- Responsive desktop/mobile layout

## Run locally
Requires Python 3.10+:

```bash
python server.py
```

Open `http://127.0.0.1:8000`. The local SQLite database is created as `kasange.db`.
Demo accounts are `teacher / teacher123` and `admin / admin123`; change these before deployment.

## Supabase + Netlify deployment
Important: `git push` changes the code only. It does not automatically update a database. You must deploy the app and run the database setup separately.

### 1) GitHub / code deployment
- Push the project to GitHub.
- In Netlify, connect the repository and set the publish directory to `kasange`.
- Use a build command if needed, or serve the static site directly from the folder.

### 2) Database setup for Supabase
- Open your Supabase project.
- Go to SQL Editor.
- Run [`supabase/schema.sql`](supabase/schema.sql).
- Create Supabase Auth users for each teacher/admin account.
- Add a row in `public.profiles` with the same `id` as the auth user and `role` set to `teacher` or `admin`.

### 3) Netlify environment variables
Add these in Netlify Site settings → Environment variables:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

Do not expose the service-role key in browser code.

### 4) Local environment variables
Copy `.env.example` to `.env` and update the values before running the local app:

```bash
cp .env.example .env
```

This controls the local SQLite database file and the default admin/teacher login credentials.

### 5) Production credentials
To keep the real system secure:
- change the default admin password before deployment
- use strong passwords for teacher accounts
- do not commit `.env` files to GitHub
