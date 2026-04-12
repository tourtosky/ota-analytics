# Peregrio Setup Guide

Follow these steps to get Peregrio running on your machine.

## Prerequisites

- **Node.js** 18.x or higher
- **PostgreSQL** 14.x or higher
- **Viator Partner API Key** — [Apply here](https://www.viator.com/partner-api)
- **Anthropic API Key** — [Get yours here](https://console.anthropic.com/)

## Step-by-Step Setup

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/peregrio.git
cd peregrio
npm install
```

### 2. Set Up PostgreSQL Database

Create a new PostgreSQL database:

```bash
createdb peregrio
```

Or using psql:

```sql
CREATE DATABASE peregrio;
```

### 3. Configure Environment Variables

Copy the example env file:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your API keys:

```env
# Viator API Configuration
VIATOR_API_KEY=your_actual_viator_api_key
VIATOR_BASE_URL=https://api.viator.com/partner

# Anthropic API Configuration
ANTHROPIC_API_KEY=sk-ant-your_actual_anthropic_key

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/peregrio
```

**Important:** Replace `username`, `password`, and `peregrio` with your actual PostgreSQL credentials.

### 4. Push Database Schema

Generate and push the database schema using Drizzle:

```bash
npm run db:push
```

This will create the `analyses` table in your database.

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 6. Test the Application

1. Go to [Viator](https://www.viator.com/) and find any tour listing
2. Copy the product URL (e.g., `https://www.viator.com/tours/Paris/Eiffel-Tower-Tour/d479-12345P6`)
3. Paste it into the Peregrio analyze form
4. Wait 20-30 seconds for the analysis to complete
5. View your comprehensive report!

## Production Build

To create a production build:

```bash
npm run build
npm start
```

## Database Management

### View Database in Drizzle Studio

Drizzle Studio provides a visual interface for your database:

```bash
npm run db:studio
```

This opens a browser at [https://local.drizzle.studio](https://local.drizzle.studio).

### Generate New Migrations

If you make changes to the schema:

```bash
npm run db:generate
npm run db:push
```

## Troubleshooting

### Database Connection Error

If you see `Failed to connect to database`:

1. Check that PostgreSQL is running: `pg_ctl status`
2. Verify your DATABASE_URL is correct in `.env.local`
3. Ensure the database exists: `psql -l`

### Viator API Error

If you see `401 Unauthorized` from Viator:

1. Verify your VIATOR_API_KEY is correct
2. Check that your API key is active in the Viator Partner dashboard
3. Try using the sandbox URL first: `https://api.sandbox.viator.com/partner`

### Anthropic API Error

If AI recommendations fail:

1. Check that your ANTHROPIC_API_KEY is valid
2. Ensure you have API credits remaining
3. Verify the model name is correct (`claude-sonnet-4-20250514`)

### Build Errors

If you encounter TypeScript errors during build:

```bash
rm -rf .next
npm run build
```

## Getting API Keys

### Viator Partner API Key

1. Go to [Viator Partner API](https://www.viator.com/partner-api)
2. Fill out the application form
3. Wait for approval (usually 1-2 business days)
4. Access your API key in the partner dashboard

**Note:** For development, you can use the Viator sandbox API while waiting for production approval.

### Anthropic API Key

1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Sign up or log in
3. Navigate to API Keys
4. Create a new API key
5. Add credits to your account

## Next Steps

- Customize the landing page with your branding
- Add authentication for multi-user support
- Set up analytics to track usage
- Deploy to your VPS or cloud provider

## Need Help?

- Check the [README](README.md) for more details
- Review the [Viator API docs](https://docs.viator.com/)
- See [Anthropic API docs](https://docs.anthropic.com/)

---

Happy analyzing! 🚀
