# Hotel Offer Orchestrator

> **Note**: This codebase is a technical assignment submission built to a fixed functional brief, not a personal project or commercial product.

The **Hotel Offer Orchestrator** is a Node.js and TypeScript microservice that aggregates overlapping hotel offers from multiple mock suppliers in parallel using Temporal workflows. It deduplicates identical hotels by name, selects the cheapest offer per hotel while retaining supplier details, and persists normalized offer data into Redis for efficient price-range filtering. The complete system runs fully containerized via Docker Compose with dedicated API, Worker, Redis, Temporal, and Postgres services.

---

## Prerequisites

- **Docker** (v20.10+)
- **Docker Compose** (v2.0+)
- *(Optional for local non-Docker development)*: **Node.js 20+** and **npm**

---

## Quick Start (Docker Compose)

Bring up the complete composed stack (PostgreSQL, Temporal Server, Temporal Web UI, Redis, API, and Worker) with a single command:

```bash
docker compose up --build
```

Once started:
- **API Service**: `http://localhost:3000`
- **Temporal Web UI**: `http://localhost:8080`
- **Redis Server**: `localhost:6379`

To stop and remove containers:
```bash
docker compose down
```

---

## Local Development (Non-Docker)

To run the application locally without Docker containers:

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start Local Temporal & Redis**:
   Ensure local Temporal (`localhost:7233`) and Redis (`localhost:6379`) instances are running.

3. **Start API Server**:
   ```bash
   npm run dev
   ```

4. **Start Temporal Worker** (in a separate terminal):
   ```bash
   npm run start:worker
   ```

5. **Run Unit Tests**:
   ```bash
   npm test
   ```

---

## Environment Variables

All configuration options are managed via environment variables and parsed with strict defaults in [`src/config/index.ts`](src/config/index.ts):

| Environment Variable | Default Value | Description |
|---|---|---|
| `PORT` | `3000` | Port for the Express API server |
| `TEMPORAL_ADDRESS` | `temporal:7233` | Host and port of the Temporal gRPC server |
| `TEMPORAL_NAMESPACE` | `default` | Temporal namespace |
| `TEMPORAL_TASK_QUEUE` | `hotel-offers` | Task queue for Temporal workflow and activities |
| `REDIS_URL` | `redis://redis:6379` | Connection URI for the Redis instance |
| `SUPPLIER_A_URL` | `http://api:3000/supplierA/hotels` | Endpoint for Mock Supplier A |
| `SUPPLIER_B_URL` | `http://api:3000/supplierB/hotels` | Endpoint for Mock Supplier B |
| `SUPPLIER_TIMEOUT_MS` | `3000` | HTTP fetch timeout for supplier requests (in ms) |
| `SUPPLIER_A_DOWN` | `false` | Initial mock down status for Supplier A |
| `SUPPLIER_B_DOWN` | `false` | Initial mock down status for Supplier B |
| `HOTELS_TTL_SECONDS` | `300` | TTL for cached hotel keys in Redis (in seconds) |
| `LOG_LEVEL` | `info` | Pino logger verbosity (`debug`, `info`, `warn`, `error`) |

---

## API Reference

### 1. `GET /api/hotels`

Aggregates hotel offers for a given city across suppliers using Temporal orchestration, deduplicates by hotel name (cheapest wins), and caches the merged result in Redis.

* **Query Parameters**:
  - `city` *(required)*: City name (e.g. `delhi`)
  - `minPrice` *(optional)*: Minimum price filter (requires `maxPrice`)
  - `maxPrice` *(optional)*: Maximum price filter (requires `minPrice`)

#### Example Request: Unfiltered
```bash
curl -X GET "http://localhost:3000/api/hotels?city=delhi"
```

#### Example Response:
```json
[
  {
    "name": "Holtin",
    "price": 5340,
    "supplier": "Supplier B",
    "commissionPct": 20
  },
  {
    "name": "Radison",
    "price": 5900,
    "supplier": "Supplier A",
    "commissionPct": 13
  },
  {
    "name": "Le Meridien",
    "price": 7100,
    "supplier": "Supplier A",
    "commissionPct": 12
  },
  {
    "name": "Taj Palace",
    "price": 8200,
    "supplier": "Supplier A",
    "commissionPct": 15
  },
  {
    "name": "The Oberoi",
    "price": 9100,
    "supplier": "Supplier B",
    "commissionPct": 18
  }
]
```

#### Example Request: Price-Filtered
```bash
curl -X GET "http://localhost:3000/api/hotels?city=delhi&minPrice=5000&maxPrice=8000"
```

#### Example Response:
```json
[
  {
    "name": "Holtin",
    "price": 5340,
    "supplier": "Supplier B",
    "commissionPct": 20
  },
  {
    "name": "Radison",
    "price": 5900,
    "supplier": "Supplier A",
    "commissionPct": 13
  },
  {
    "name": "Le Meridien",
    "price": 7100,
    "supplier": "Supplier A",
    "commissionPct": 12
  }
]
```

---

### 2. `GET /health`

Probes Supplier A, Supplier B, Redis (`PING`), and Temporal concurrently to report overall health status.

#### Example Response (Healthy):
```json
{
  "status": "ok",
  "suppliers": {
    "supplierA": { "status": "up", "latencyMs": 4 },
    "supplierB": { "status": "up", "latencyMs": 3 }
  },
  "dependencies": {
    "redis": "up",
    "temporal": "up"
  }
}
```

---

### 3. Simulating Supplier Outages

You can toggle supplier status dynamically at runtime using the mock status endpoint:

#### Mark Supplier A as Down:
```bash
curl -X POST http://localhost:3000/mock/suppliers/a/status \
  -H "Content-Type: application/json" \
  -d '{"status":"down"}'
```

#### Check Health (Degraded Status):
```bash
curl http://localhost:3000/health
```

```json
{
  "status": "degraded",
  "suppliers": {
    "supplierA": { "status": "down", "latencyMs": 2 },
    "supplierB": { "status": "up", "latencyMs": 3 }
  },
  "dependencies": {
    "redis": "up",
    "temporal": "up"
  }
}
```

#### Restore Supplier A:
```bash
curl -X POST http://localhost:3000/mock/suppliers/a/status \
  -H "Content-Type: application/json" \
  -d '{"status":"up"}'
```

---

## In-Redis Price Filtering Architecture

Price range filtering is executed **entirely inside Redis** using native data structures, with **zero JavaScript array filtering**:

1. **Write Path (`saveHotelsToRedis` activity)**:
   - Wraps operations in a Redis `MULTI` / `EXEC` transaction.
   - Clears existing keys `hotels:{city}` and `hotels:{city}:data`.
   - Adds entries to Sorted Set `hotels:{city}` with `score = price` and `member = normalized_name`.
   - Stores complete offer JSON in Hash `hotels:{city}:data` under `field = normalized_name`.
   - Sets TTL (`HOTELS_TTL_SECONDS`).

2. **Read Path (`findByPriceRange`)**:
   - Executes `ZRANGEBYSCORE hotels:{city} <minPrice> <maxPrice>` to retrieve matched hotel names directly in price-ascending order.
   - If no members are returned, immediately returns `[]`.
   - Hydrates full offer objects via `HMGET hotels:{city}:data <members...>`.

---

## Postman Collection

A complete Postman collection is provided in [`postman/hotel-offer-orchestrator.postman_collection.json`](postman/hotel-offer-orchestrator.postman_collection.json).

### Importing into Postman:
1. Open Postman.
2. Click **Import** in the upper left corner.
3. Select `postman/hotel-offer-orchestrator.postman_collection.json`.
4. Run the 10 collection requests in order. All requests include automated Postman test scripts asserting HTTP status codes and array response shapes.
