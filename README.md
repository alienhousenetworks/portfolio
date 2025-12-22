## Alien House Networks – Django Portfolio Website

This repository contains the source code for **Alien House Networks**, a Django‑based portfolio and company website. It includes a custom `core` app for pages like the home, services, and about pages, along with media assets and basic production‑ready configuration (PostgreSQL, environment variables, and static files).

---

## Directory Structure

At a high level, the project is structured as follows:

- **`alienhousenetworks/`** – Django project and app code  
  - **`alienhousenetworks/`** – Django project package  
    - `settings.py` – Django settings (PostgreSQL, static/media, installed apps, context processors)  
    - `urls.py` – Root URL configuration  
    - `wsgi.py` / `asgi.py` – WSGI/ASGI entrypoints  
  - **`core/`** – Main application for the public site  
    - `models.py` – Database models for services, team, content, etc.  
    - `views.py` – View functions for pages (home, about, service detail, etc.)  
    - `urls.py` – URL patterns for the `core` app  
    - `templates/core/` – HTML templates (`base.html`, `index.html`, `about_us.html`, `service_detail.html`, …)  
    - `management/commands/populate_db.py` – Custom management command to initially populate the database  
    - `migrations/` – Django migrations for the `core` app  
    - `context_processors.py` – Global context data for templates (e.g. site settings, footer info)  
  - `manage.py` – Django management script  
  - `db.sqlite3` – Local SQLite database (can be ignored if using PostgreSQL only)  
- **`media/`** – Uploaded media files  
  - `projects/` – Project images  
  - `team/` – Team member images  
- **`staticfiles/`** – Collected static files for production (output of `collectstatic`)  
- **`requirements.txt`** – Python dependencies  
- **`package.json` / `package-lock.json`** – Node dependencies (if you add frontend tooling)  
- **`anh/`** – Python virtual environment (local; you can recreate your own instead)  

---

## Technology Stack

- **Backend**: Django 5.x  
- **Database**: PostgreSQL (via `psycopg2-binary`), with optional local SQLite for quick dev  
- **Environment management**: `python-decouple`, `dj-database-url`  
- **Static & media**:
  - `STATIC_URL = '/static/'`, `STATIC_ROOT = staticfiles/`
  - `MEDIA_URL = '/media/'`, `MEDIA_ROOT = media/`

---

## Prerequisites

- Python 3.12+ (or a compatible 3.x version)  
- PostgreSQL server (local or remote)  
- Node.js (optional, if you plan to use or extend any Node tooling)  
- `pip` (Python package manager)  
- Git (to clone from GitHub)

---

## Full Installation & Configuration Guide (Development)

### 1. Clone the Repository from GitHub

From your terminal:

```bash
git clone https://github.com/alienhousenetworks/portfolio.git
cd portfolio  # or alienhousewebsite if you named the folder differently
```

Make sure you see files like `manage.py`, `requirements.txt`, and the `alienhousenetworks/` and `core/` folders (as on GitHub: [`alienhousenetworks/portfolio`](https://github.com/alienhousenetworks/portfolio)).

### 2. Create and Activate a Python Virtual Environment

You can ignore any existing local environment folder (like `anh/`) and create your own:

```bash
python3 -m venv venv
source venv/bin/activate  # macOS / Linux
# On Windows (PowerShell):
# venv\Scripts\Activate.ps1
```

When active, your prompt will usually show `(venv)` at the beginning.

### 3. Install Python Dependencies

Inside the project root (same folder as `requirements.txt`):

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

This installs Django, PostgreSQL driver, and all other required packages.

### 4. Create a PostgreSQL Database and User

On your machine or server, create a PostgreSQL database and user. Example (Linux/macOS, using default `postgres` superuser):

```bash
psql -U postgres
```

Then inside the `psql` shell:

```sql
CREATE DATABASE alienhouse;
CREATE USER alienuser WITH PASSWORD 'strongpassword';
GRANT ALL PRIVILEGES ON DATABASE alienhouse TO alienuser;
```

Adjust names and passwords as needed; make sure they match what you put in `.env` below.

### 5. Configure Environment Variables (`.env`)

This project uses `python-decouple`, and `settings.py` reads values from environment variables.  
Create a `.env` file in the same directory as `manage.py`:

```bash
cd /path/to/your/project   # project root
touch .env
```

Add configuration for **development**:

```bash
DEBUG=True
SECRET_KEY=change-me-to-a-long-random-string
ALLOWED_HOSTS=localhost,127.0.0.1

DB_NAME=alienhouse
DB_USER=alienuser
DB_PASSWORD=strongpassword
DB_HOST=localhost
DB_PORT=5432
```

- **`DEBUG`**: Keep `True` for local development; set to `False` in production.  
- **`ALLOWED_HOSTS`**: Comma‑separated list of allowed hostnames (no spaces). For local dev, `localhost,127.0.0.1` is enough.  

> If you only want to test quickly without PostgreSQL, you can temporarily switch `DATABASES` in `settings.py` back to the default SQLite config and skip the Postgres steps.

### 6. Verify Django Settings for Static & Media

In `alienhousenetworks/settings.py`, the following are already configured:

- `STATIC_URL = '/static/'`  
- `STATIC_ROOT = BASE_DIR / 'staticfiles'`  
- `MEDIA_URL = '/media/'`  
- `MEDIA_ROOT = BASE_DIR / 'media'`

For development with `DEBUG=True`, Django will serve static and media automatically. You don’t need extra configuration for local use.

### 7. Apply Database Migrations

From the project root, move into the Django project folder (where `manage.py` lives) and run:

```bash
cd alienhousenetworks
python manage.py migrate
```

This will create all necessary tables in your configured database.

### 8. (Optional) Load / Populate Initial Data

There is a custom management command `populate_db.py` which can be used to seed the database with initial content (if you’ve implemented it):

```bash
python manage.py populate_db
```

Check or adjust `core/management/commands/populate_db.py` to fit your data needs.

### 9. Create an Admin Superuser

To access the Django admin panel:

```bash
python manage.py createsuperuser
```

Follow the prompts to set a username, email, and password.

### 10. Run the Development Server

Start the local dev server:

```bash
python manage.py runserver
```

Now open:

- Site: `http://127.0.0.1:8000/`  
- Admin: `http://127.0.0.1:8000/admin/`

Log in to `/admin/` with the superuser credentials you just created.

---

## Static & Media Files

- **Development**: Django will serve static and media files automatically when `DEBUG=True` and `MEDIA_URL`/`MEDIA_ROOT` are configured.  
- **Production**:
  - Run:

    ```bash
    python manage.py collectstatic
    ```

  - Configure your web server (e.g. Nginx) to serve files from the `staticfiles/` directory and to serve media from `media/`.

---

## Useful Django Commands

From inside the `alienhousenetworks/` directory:

```bash
python manage.py runserver            # Start development server
python manage.py makemigrations       # Create new migrations based on model changes
python manage.py migrate              # Apply database migrations
python manage.py createsuperuser      # Create an admin user
python manage.py shell                # Open Django shell
python manage.py collectstatic        # Collect static files into STATIC_ROOT
python manage.py populate_db          # Custom command to populate initial data (if configured)
```

---

## Production Deployment (Overview)

- **Database**: Ensure PostgreSQL is configured with the same `DB_*` variables as your `.env`.  
- **Environment**:
  - Set `DEBUG=False`
  - Set `ALLOWED_HOSTS` to your domain(s)  
  - Keep `SECRET_KEY` secret and unique  
- **Static Files**: Run `collectstatic` and configure your web server to serve `staticfiles/`.  
- **Application server**: Use `gunicorn` or `uvicorn`/`daphne` (for ASGI) behind a reverse proxy like Nginx.  
- **Security**: Configure HTTPS, secure cookies, and recommended Django security settings (CSRF, HSTS, etc.).

---

## Frontend / Assets

Currently, templates and styling are primarily managed through Django templates under `core/templates/core/`. A `package.json` is present for future frontend tooling; you can install Node dependencies with:

```bash
npm install
```

If you add build tools (e.g. Webpack, Vite, or Tailwind), document the build commands here.

---

## Contributing / Customizing

- Update models in `core/models.py` for new content types (e.g. more services, team sections).  
- Add or modify templates in `core/templates/core/` to change layout and design.  
- Extend `core/context_processors.py` to inject additional global data into templates (e.g. social links, company info).  
- Always run migrations (`makemigrations` + `migrate`) after changing models.

---

## License

This project is proprietary software owned by Alien House Networks and is licensed under the proprietary terms in the root `LICENSE` file.

---

## Legal Notice

This repository contains proprietary software owned by Alien House Networks.  
Unauthorized use, copying, modification, or distribution is strictly prohibited.

