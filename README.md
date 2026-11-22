# Medicine Supply Management System with AI Chatbot

A backend system for tracking medicine inventory and supplier workflows in real time, with an AI chatbot that answers stock, drug-alternative and supplier-availability questions from live data.

**Stack:** Node.js, Express, MongoDB (Mongoose), Socket.IO, Zod, Anthropic API (tool use)

## Features

- **RESTful API** for medicines, suppliers and purchase orders with validation, pagination, rate limiting and centralised error handling
- **Real-time inventory:** atomic stock updates (no negative stock under concurrent requests), append-only stock movement audit log, live low-stock alerts pushed over WebSockets
- **Supplier workflows:** per-medicine supplier offers (price, lead time, availability), purchase orders that add stock when received
- **Optimised MongoDB indexing** matched to real query paths (see below)
- **AI chatbot** that calls inventory tools (stock check, drug alternatives, supplier availability, low stock, expiry) so answers come from the database, not the model's memory. Falls back to a rule-based mode when no API key is set

## Architecture

```
Client / Dashboard ──► Express routes ──► Controllers ──► Services ──► MongoDB
                              │                              │
                              └── /api/chat ──► Chatbot ─────┘  (LLM calls tools -> same services)
                                                   
Services ──► event bus ──► Socket.IO ──► live dashboard
```

```
src/
  config/        database connection
  models/        Medicine, Supplier, StockMovement, PurchaseOrder
  controllers/   request handlers + Zod schemas
  routes/        route table
  services/      inventory logic, chatbot, chatbot tools
  middleware/    validation, error handling
scripts/seed.js  sample data
public/          minimal dashboard + chat UI
```

## MongoDB indexing

| Index | Query it serves |
|-------|-----------------|
| `sku` (unique) | SKU lookup and duplicate prevention |
| text on `name`, `genericName` (weighted) | `GET /medicines?q=` search |
| `genericName, form, strength, price` | Drug alternatives (equality match + cheapest-first sort) |
| `lowStock, quantityInStock` | Low-stock dashboard (flag kept in sync atomically with stock) |
| `expiryDate` | Expiring-soon report |
| `suppliers.supplier` | "What can this supplier provide?" |
| `medicine, createdAt` on movements | Per-medicine audit history |

Check them with `.explain("executionStats")` in `mongosh` to confirm `IXSCAN` rather than `COLLSCAN`.

## Getting started

Requirements: Node.js 18+, MongoDB running locally or an Atlas URI.

```bash
git clone <your-repo-url>
cd medicine-supply-management
npm install
cp .env.example .env        # set MONGO_URI (and ANTHROPIC_API_KEY for the AI chatbot)
npm run seed                # optional sample data
npm run dev
```

Open http://localhost:5000 for the dashboard and chat, or call the API directly.

## API overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/medicines?q=&category=&lowStock=&page=&limit=` | Search / list |
| POST | `/api/medicines` | Create medicine |
| GET/PATCH/DELETE | `/api/medicines/:id` | Read / update / delete |
| POST | `/api/medicines/:id/stock` | Adjust stock `{ "delta": -5, "reason": "dispensed" }` |
| GET | `/api/medicines/:id/movements` | Stock history |
| GET | `/api/medicines/:id/alternatives` | In-stock alternatives (same generic, form, strength) |
| GET | `/api/medicines/alerts/low-stock` | Items at or below reorder level |
| GET | `/api/medicines/alerts/expiring?days=60` | Expiring soon |
| GET/POST | `/api/suppliers` | List / create suppliers |
| GET | `/api/suppliers/:id/catalog` | Medicines a supplier provides |
| POST | `/api/orders` | Create purchase order |
| PATCH | `/api/orders/:id/receive` | Receive order (adds stock) |
| POST | `/api/chat` | `{ "message": "...", "history": [] }` |

### Example chatbot questions

- "Is Crocin 650 available?"
- "What are the alternatives to Augmentin 625?"
- "Which suppliers can provide Pantocid 40 and how fast?"
- "What is running low?" / "What expires in the next 30 days?"

## Design notes

- **Concurrency-safe stock:** `findOneAndUpdate` with a `quantityInStock >= n` filter and an aggregation-pipeline update, so two simultaneous dispenses can never oversell.
- **Grounded chatbot:** the model must use tools to read inventory; the system prompt forbids guessing and reminds users a pharmacist must confirm substitutions.
- **Cost control:** separate, stricter rate limit on `/api/chat`.

## Roadmap

- JWT auth and role-based access (admin / pharmacist / supplier)
- Automated tests (Jest + Supertest, mongodb-memory-server)
- Batch/lot tracking with FEFO dispensing
- Docker Compose, CI pipeline, Swagger docs

## License

MIT
