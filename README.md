# SeatScape

SeatScape helps air travellers choose the perfect window seat. Given the origin, destination and departure time, the app simulates the sun's path along the great-circle route and recommends which side of the plane (\*A\*=left / \*F\* = right) offers better views or less sun glare. It also highlights expected sunrise and sunset, nearby cities en route and visualises the journey on an interactive map.

## Getting Started

### Install dependencies

```bash
npm install
```

### Run the development server

```bash
npm run dev
```

Visit <http://localhost:3000> to use the app. Edit files in `app/` or `components/` and the page will automatically update.

### Lint and tests

Run lint checks and the test suite:

```bash
npm run lint
npx vitest run
```

## Build for production

```bash
npm run build
npm start
```

## Notes

SeatScape assumes great‑circle routing and clear weather. Window seats correspond to A (left) and F (right) in standard 3–3 seating configurations.

