# trackware

**Developer Work Intelligence Platform**

Track effort, monitor productivity, and detect risks early. A developer-focused work intelligence platform built with modern web technologies.

## Features

- **Earned Value Metrics** - Track PV, EV, AC, SPI, CPI to understand cost and schedule performance at a glance
- **5-Axis Health Radar** - Monitor schedule, cost, quality, productivity, and risk health scores in real-time
- **Smart Alerts** - Automatic alerts when metrics cross thresholds (SPI drops, cost overruns, team overload)
- **Team Capacity Tracking** - Visualize workload distribution with heatmaps and capacity tables per team member
- **Trend Analysis** - Weekly EV trends and productivity charts to spot patterns and forecast outcomes
- **GitHub Repo Scanner** - Scan any public repo to extract commit activity, PR health, contributor stats, and more

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- npm or pnpm

### Installation

1. Clone the repository:
```bash
git clone https://github.com/supdatta/trackware-final.git
cd trackware-final
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.development.local
```

Configure your database connection in `.env.development.local`:
```
DATABASE_URL=postgresql://user:password@localhost:5432/trackware
SESSION_SECRET=your-secret-key
```

4. Push the database schema:
```bash
npm run db:push
```

5. Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5000`.

### Default Login

For quick access, use the admin credentials:
- **Email:** `admin`
- **Password:** `123456`

## Project Structure

```
trackware/
├── server/           # Express backend
│   ├── routes/       # API routes (auth, projects, github, gemini)
│   ├── db.ts         # Database connection
│   └── index.ts      # Server entry point
├── src/              # React frontend
│   ├── components/   # UI components
│   ├── pages/        # Page components
│   ├── hooks/        # Custom React hooks
│   └── lib/          # Utility functions
├── shared/           # Shared types and schema
└── public/           # Static assets
```

## Tech Stack

- **Frontend:** React 18, TypeScript, Tailwind CSS, shadcn/ui, Recharts
- **Backend:** Express.js, Drizzle ORM
- **Database:** PostgreSQL
- **Build Tool:** Vite

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new account
- `POST /api/auth/signin` - Sign in
- `POST /api/auth/signout` - Sign out
- `GET /api/auth/me` - Get current user

### Projects
- `GET /api/projects` - List all projects
- `POST /api/projects` - Create new project
- `DELETE /api/projects/:id` - Delete project

### GitHub
- `POST /api/github/scan` - Scan a GitHub repository

## Scripts

```bash
npm run dev          # Start development server (frontend + backend)
npm run build        # Build for production
npm run preview      # Preview production build
npm run test         # Run tests
npm run db:push      # Push schema changes to database
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is private and proprietary.

## Support

For issues and feature requests, please use the [GitHub Issues](https://github.com/supdatta/trackware-final/issues) page.
