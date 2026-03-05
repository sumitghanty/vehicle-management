# Vehicle Condition Management (React + Node.js)

Web-based fleet management demo with local SQLite database for 3 vehicles and 2022-2023 dummy operational data.

## Features
- Landing dashboard with KPIs (distance, fuel, alerts, top routes)
- Vehicle master data and driver master data
- Vehicle-driver mapping
- Freight details for India routes centered around Kolkata
- Travel and vehicle condition data (tyre pressure, fuel, overspeeding, engine temperature, etc.)

## Run locally

### 1) Backend
```bash
cd server
npm install
npm run seed
npm start
```
Runs API on `http://localhost:4000`.

### 2) Frontend
```bash
cd client
npm install
npm run dev
```
Runs app on `http://localhost:5173`.
