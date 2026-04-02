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

3. Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5000`.

### Default Login

For quick access, use the admin credentials:
- **Username:** `admin`
- **Password:** `123456`

Or create your own account via the sign-up page.

## Project Structure

```
trackware/
├── src/              # React frontend
│   ├── components/   # UI components
│   │   ├── dashboard/  # Dashboard widgets
│   │   ├── landing/    # Landing page sections
│   │   └── ui/         # shadcn/ui components
│   ├── pages/        # Page components
│   ├── hooks/        # Custom React hooks
│   │   ├── useAuth.ts    # Authentication (localStorage)
│   │   └── useProjects.ts # Projects management (localStorage)
│   └── lib/          # Utility functions
├── server/           # Express backend (optional, for database mode)
└── public/           # Static assets
```

## Tech Stack

- **Frontend:** React 18, TypeScript, Tailwind CSS, shadcn/ui, Recharts
- **State:** localStorage for auth and projects (no database required)
- **Build Tool:** Vite

## Data Storage

This version uses **localStorage** for data persistence:
- User accounts are stored locally in your browser
- Projects are saved locally and persist across page refreshes
- The `admin/123456` account always works (hardcoded)

For a database-backed version, see the `server/` directory which includes Express routes for PostgreSQL.

## Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run test         # Run tests
```

## Dashboard Types

### GitHub Dashboard
- Scan any public GitHub repository
- View commit activity and contributor stats
- Track PR health and merge metrics
- Set budget and team size for cost analysis

### Manual Project Dashboard (SPM)
- Define project budget and schedule
- Track earned value metrics (PV, EV, AC)
- Monitor SPI/CPI performance indices
- Manage team members and roles

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Links

- [GitHub Repository](https://github.com/supdatta/trackware-final)
- [Issues](https://github.com/supdatta/trackware-final/issues)
- [Pull Requests](https://github.com/supdatta/trackware-final/pulls)

## License

This project is private and proprietary.
