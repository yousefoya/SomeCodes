# BTIN7AL (بتنحل) — Caching Candidates & Strategy Document (Phase 2 Roadmap)

## Executive Summary
This document provides a detailed architectural assessment of caching candidates within the **بتنحل (btin7al)** marketplace backend. While Phase 1 focused on database-level index optimizations, connection pooling, transactional integrity, and query parallelization without introducing external caching infrastructure, this document establishes the blueprint for implementing an in-memory or distributed cache layer in Phase 2.

---

## 1. High-Value Cache Candidates Matrix

| Priority | Endpoint / Query | Data Mutability | Recommended TTL | Invalidation Triggers | Expected Latency Reduction |
| :---: | :--- | :---: | :---: | :--- | :---: |
| **P1** | `GET /api/v1/categories` | Very Low | **1 hour (3600s)** | Admin Category Create/Update/Delete | **12ms → < 1ms** |
| **P1** | `GET /api/v1/services` | Low | **15 minutes (900s)** | Admin Service Create/Update/Toggle | **12ms → < 1ms** |
| **P1** | `GET /api/v1/services/:id` | Low | **15 minutes (900s)** | Admin Service Update / Option Change | **8ms → < 1ms** |
| **P2** | `GET /api/v1/coupons` (Active List) | Medium | **5 minutes (300s)** | Admin Coupon Add/Edit/Delete | **10ms → < 1ms** |
| **P2** | `GET /api/v1/providers?serviceId=...` | Medium | **60 seconds (60s)** | Provider Open/Close, Capability Toggle | **13ms → < 2ms** |
| **P3** | `GET /api/v1/admin/stats` | High | **30 seconds (30s)** | Order Completed/Created, User Registration | **22ms → < 2ms** |
| **P3** | `GET /api/v1/loyalty/admin/settings` | Very Low | **1 hour (3600s)** | Admin Loyalty Settings Update | **10ms → < 1ms** |

---

## 2. Detailed Invalidation & Cache Key Specification

### 1. Categories Catalog Cache
- **Cache Key**: `cache:categories:all`
- **Cache Scope**: List of all active categories sorted by `sortOrder`.
- **Invalidation Strategy**:
  - Event: `ADMIN_CATEGORY_CREATED`, `ADMIN_CATEGORY_UPDATED`, `ADMIN_CATEGORY_DELETED`.
  - Action: `cache.del('cache:categories:all')`.

### 2. Services & Service Options Catalog Cache
- **Cache Keys**:
  - `cache:services:all`
  - `cache:services:cat:{categoryId}`
  - `cache:service:{serviceId}`
- **Cache Scope**: Active service listings including embedded `options` and `category` entities.
- **Invalidation Strategy**:
  - Event: `ADMIN_SERVICE_SAVED`, `ADMIN_SERVICE_TOGGLED`, `ADMIN_OPTION_MODIFIED`.
  - Action: Flush `cache:services:*` and `cache:service:{serviceId}` keys.

### 3. Active Promotional Coupons Cache
- **Cache Key**: `cache:coupons:active`
- **Cache Scope**: Publicly viewable active coupons (`is_active = true`, `starts_at <= now`, `expires_at >= now`).
- **Invalidation Strategy**:
  - Event: `ADMIN_COUPON_CREATED`, `ADMIN_COUPON_UPDATED`, `ADMIN_COUPON_DELETED`.
  - Action: `cache.del('cache:coupons:active')`.

### 4. Provider Discovery Cache (Short TTL)
- **Cache Keys**:
  - `cache:providers:srv:{serviceId}:cat:{categoryId}`
- **Cache Scope**: Available, open providers supporting a specific service.
- **TTL**: **60 seconds** (short TTL ensures fast reflection of provider availability status changes without requiring complex pub/sub invalidation).
- **Invalidation Strategy**:
  - Event: `PROVIDER_STATUS_TOGGLED` (e.g. provider closes store or goes offline).
  - Action: Specific key eviction or rely on short 60s TTL.

### 5. Admin Dashboard Metrics Cache
- **Cache Key**: `cache:admin:dashboard:stats`
- **TTL**: **30 seconds**.
- **Rationale**: Admin dashboard aggregations execute multiple COUNT and SUM queries across tables (`users`, `orders`, `providers`, `coupons`). A 30-second TTL avoids database spike load during frequent admin refreshes while keeping metrics near real-time.

---

## 3. Recommended Implementation Architecture for Phase 2

### Option A: Ultra-Light In-Memory Cache (Zero Dependency)
- Using an in-memory LRU cache library (such as `lru-cache` or a simple custom TypeScript map with timestamp expiration).
- **Advantages**: Zero new operational infrastructure; single process; instant deployment; <0.5ms lookup latency.
- **Memory Footprint**: ~500KB–2MB total RAM for entire catalog and options.

### Option B: Distributed Redis Cache (Multi-Instance Scaling)
- Use when horizontally scaling backend Node.js instances behind an Nginx/AWS load balancer.
- **Advantages**: Shared cache state across all backend instances; pub/sub capabilities for real-time order state broadcasts.

---

## 4. Cache-Bypass and Security Guardrails
1. **Never Cache User-Specific PII or Financial Data**:
   - `GET /api/v1/orders/my` must **NEVER** be shared-cached across users.
   - `GET /api/v1/loyalty/my-points` must **NEVER** be cached without user ID partition.
2. **Cache Headers**:
   - Return `X-Cache: HIT` or `X-Cache: MISS` headers to assist frontend profiling and debugging.
3. **Graceful Fallback**:
   - In the event of a cache miss or cache store failure, the system must seamlessly fall back to executing the optimized PostgreSQL indexed query.
