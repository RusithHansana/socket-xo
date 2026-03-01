# SocketXO

SocketXO is a high-performance, browser-based real-time Tic-Tac-Toe web application. It is built specifically to demonstrate production-grade real-time system behavior, focusing heavily on connection resilience, server-authoritative state, and deterministic state synchronization over Socket.io.

## ✨ Key Features

* **The "Disconnect Handshake" (Differentiator):** A highly resilient recovery system where if a player disconnects, the server holds their seat for a 30-second grace period while immediately notifying the opponent. When the player returns, their session state (board, chat, and game timer) is instantly restored.
* **Server-Authoritative State Engine:** The backend is the ultimate source of truth, enforcing 100% synchronization consistency with zero desync incidents. Invalid moves are strictly rejected by the server.
* **Frictionless Matchmaking:** Users receive an instant guest identity (featuring a generated name and RoboHash avatar) and enter a global matchmaking queue that pairs them in under 2 seconds.
* **Room-Scoped Real-Time Chat:** Players can communicate via an in-game chat drawer that is sanitized against XSS.
* **AI Benchmark Mode:** A single-player Minimax AI mode serves as a deterministic harness for testing game logic correctness, as it is unbeatable by design.
* **Dev-Mode Chaos Controls:** A hidden `/test-lab` route provides a "mission control" dashboard to intentionally simulate lag and disconnects, making it easy to demonstrate the architecture's resilience.

## 🛠️ Tech Stack

* **Frontend:** React SPA built with Vite 7.x, React 19.x, and TypeScript 5.x.
* **Routing:** React Router v7.
* **Styling:** Custom lightweight design system using CSS Modules and CSS custom properties (no heavy UI frameworks). The visual aesthetic is a dark-theme "Nightfall Command" design.
* **Backend:** Node.js 20+ and Express.
* **Real-Time Transport:** Socket.io 4.x for bidirectional event-driven communication.
* **State Management:** Strictly in-memory data architecture (no persistent database for the MVP) with automated garbage collection for abandoned rooms.
* **Testing:** Vitest for unit/integration testing and Playwright for headless integration testing.

## 🏗️ Project Structure

The repository is structured as a monorepo with clear architectural boundaries:

* `/client`: The Vite React frontend. It never imports directly from the server.
* `/server`: The Node.js/Socket.io authoritative backend engine.
* `/shared`: Shared TypeScript types and strict Socket.io event contracts imported by both the client and server to prevent desync.

## 🚀 Getting Started

### Prerequisites

* Node.js (v20+ LTS)
* npm

### Installation

1. Clone the repository.
2. Install dependencies for the root, client, and server.

### Running Locally (Development)

The project is configured to run both the frontend and backend concurrently from the root directory.

```bash
npm run dev
```

* The Vite client will start on `http://localhost:5173` with Hot Module Replacement (HMR).
* The Socket.io server will start on port `3001` via `tsx` with auto-restart on changes.
* Vite is configured to automatically proxy Socket.io requests to the development server.

### Production Build

To build the application for production:

```bash
npm run build
```

This compiles the shared types, builds the optimized React SPA into `client/dist/`, and transpiles the server code into `server/dist/`.

To start the production server (which serves the built SPA as static files alongside the Socket.io server):

```bash
npm start
```
