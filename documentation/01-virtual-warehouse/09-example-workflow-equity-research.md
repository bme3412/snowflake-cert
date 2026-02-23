# Example workflow: Technology equity research with Snowflake in Cursor

This topic walks through a realistic Snowflake workflow for **technology stock and equity research**, using the concepts covered in this module. The scenario: you (or a small team) run ad hoc SQL, load and refresh market/fundamental data, and optionally serve a low-latency screener or dashboard—all while developing and executing queries from **Cursor** against your Snowflake account.

---

## Scenario and goals

- **Data**: Market data, fundamentals, and your own notes or scores in Snowflake tables.
- **Workloads**: Ad hoc research queries from Cursor; scheduled or on-demand batch loads; optional real-time dashboard for a watchlist or screener.
- **Goals**: Control cost (credits), keep ad hoc work responsive, and—where it matters—deliver low-latency reads for interactive tools.

The following sections map each part of this workflow to the virtual warehouse concepts in this module.

---

## Using Snowflake from Cursor

You run SQL against Snowflake from Cursor by using a Snowflake connector or extension (e.g. Snowflake extension for VS Code/Cursor, or a driver used by a script or notebook). In every session, **you must set the warehouse** that will run your queries. If you don’t, and no default warehouse is set for your user/role, your statements will queue until a warehouse is assigned.

- **In a worksheet or script**: Run `USE WAREHOUSE <warehouse_name>;` at the start of the session (or rely on a default warehouse for your role).
- **In code**: When you connect (e.g. via Python or Node driver), specify the warehouse in the connection parameters or set it with `USE WAREHOUSE` after connecting.

All of the warehouse choices below (size, type, auto-suspend, multi-cluster, etc.) apply to the warehouse you use from Cursor just as they do in Snowsight or any other client.

---

## Warehouse strategy for the workflow

### 1. Ad hoc research warehouse (Cursor, exploration, one-off queries)

**Concept: Overview, Working with warehouses, Considerations**

- Create a **standard** warehouse (e.g. `RESEARCH_WH`) for ad hoc work: exploration, backtests, and one-off SQL you run from Cursor.
- **Size**: Start with **Small** or **Medium**. Per-second billing means you can use a larger size when needed and suspend when done; for many ad hoc queries, smaller sizes are enough and you avoid paying for idle time.
- **Auto-suspend**: Set a short timeout (e.g. 60–300 seconds). When you leave Cursor or stop running queries, the warehouse suspends and stops consuming credits. When you run the next query, it auto-resumes (with the usual 60-second minimum charge).
- **Create and use** (from Snowsight or SQL):

```sql
CREATE OR REPLACE WAREHOUSE RESEARCH_WH
  WAREHOUSE_SIZE = 'SMALL'
  AUTO_SUSPEND = 120
  AUTO_RESUME = TRUE
  COMMENT = 'Ad hoc equity research from Cursor';
```

In Cursor, point your session to this warehouse so your interactive queries run here. This keeps ad hoc cost predictable and avoids leaving a warehouse running overnight.

---

### 2. Batch / load warehouse (refreshing market data, fundamentals)

**Concept: Overview (data loading), Multi-cluster (optional), Considerations**

- Use a **separate** warehouse for batch jobs: loading new market data, refreshing fundamentals, or running heavier transformations. That way ad hoc research in Cursor doesn’t compete with loads, and you can size each warehouse for its workload.
- **Size**: For loading many files, consider **Medium** or **Large**; the module notes that loading performance often depends more on file count and size than on warehouse size, so avoid oversizing.
- **Auto-suspend**: Set a timeout so the warehouse suspends after the batch finishes (e.g. 60–300 seconds).
- If **multiple batch jobs or users** run at once, use a **multi-cluster** warehouse (Enterprise Edition) so extra clusters scale out when needed and scale back when idle. Set `MIN_CLUSTER_COUNT` and `MAX_CLUSTER_COUNT` and a scaling policy (e.g. standard scale-out for concurrent queries).

Example (single-cluster batch warehouse):

```sql
CREATE OR REPLACE WAREHOUSE BATCH_LOAD_WH
  WAREHOUSE_SIZE = 'MEDIUM'
  AUTO_SUSPEND = 120
  AUTO_RESUME = TRUE
  COMMENT = 'Batch loads for market/fundamental data';
```

---

### 3. Query Acceleration for heavy analytical queries

**Concept: Query Acceleration (QAS)**

- When you run **large scans with filters or aggregations** from Cursor (e.g. “all tech names with revenue growth &gt; X and margin &gt; Y”), those queries can be eligible for **Query Acceleration**. QAS offloads part of the work to shared compute and can reduce wall-clock time.
- **Enable QAS** on the warehouse you use for ad hoc research: `ALTER WAREHOUSE RESEARCH_WH SET ENABLE_QUERY_ACCELERATION = TRUE;` (and optionally set `QUERY_ACCELERATION_MAX_SCALE_FACTOR` to cap cost). Use the same warehouse from Cursor for these analytical queries so they benefit from QAS when eligible.

---

### 4. Monitoring and tuning

**Concept: Monitoring warehouse load, Considerations**

- Use the **Warehouse Activity** (load) chart in Snowsight for `RESEARCH_WH` (and `BATCH_LOAD_WH` if used heavily) to see running vs queued load over time. If you often see queuing from Cursor sessions, consider:
  - **Scale out**: multi-cluster for that warehouse (if available), or
  - **Scale up**: resize to a larger size so each query gets more compute.
- Use **Account Usage** (e.g. `QUERY_HISTORY`) to inspect query patterns, runtimes, and credit use. That helps you decide whether to resize, enable QAS, or separate workloads (e.g. move the heaviest reports to a dedicated warehouse).

---

### 5. Optional: Interactive tables and warehouse for a screener/dashboard

**Concept: Interactive tables and interactive warehouses**

- If you build a **low-latency screener or watchlist** (e.g. “top tech names by criteria” or “my watchlist with live metrics”) and want sub-second or very fast reads, consider **interactive tables** and an **interactive warehouse**. Interactive tables are optimized for selective, low-latency queries; they require a dedicated interactive warehouse and are available in select AWS regions.
- **Workflow**: Create the interactive table with a **standard** warehouse (e.g. `BATCH_LOAD_WH`), create an **interactive warehouse**, add the table to it, and point your dashboard or app to the interactive warehouse. Keep using standard warehouses (e.g. `RESEARCH_WH`) from Cursor for ad hoc SQL; use the interactive warehouse only for the high-concurrency, low-latency reads.

---

### 6. Optional: Snowpark-optimized warehouse for ML scoring

**Concept: Snowpark-optimized warehouses**

- If you run **ML models** (e.g. scoring or ranking) inside Snowflake via **Snowpark Python stored procedures**, use a **Snowpark-optimized** warehouse for that workload. It gives you more memory and configurable CPU architecture per node, which suits training or inference on a single node. Keep ad hoc SQL and batch loads on standard warehouses; reserve the Snowpark-optimized warehouse for the stored procedure calls.

---

### 7. Gen2 and default warehouse

**Concept: Next-generation (Gen2) standard warehouses**

- If your account and region support **Gen2** standard warehouses, you can create `RESEARCH_WH` (or `BATCH_LOAD_WH`) as a Gen2 warehouse for the same workflow. Gen2 offers different sizing and billing; see the Gen2 topic and the Snowflake Service Consumption Table. Otherwise, the workflow above is unchanged: same auto-suspend, multi-cluster, and QAS behavior.

---

## Putting it together in Cursor

1. **Connect** to Snowflake from Cursor (extension or driver) and set the session warehouse to `RESEARCH_WH` (or your chosen ad hoc warehouse).
2. **Run ad hoc SQL** (screens, backtests, one-off analytics); the warehouse auto-resumes and auto-suspends per your settings. Use **Query Acceleration** on that warehouse for heavy analytical queries.
3. **Run or schedule batch loads** on a separate warehouse (e.g. `BATCH_LOAD_WH`) so research queries and loads don’t compete. Use **multi-cluster** if you have concurrent batch jobs or multiple users.
4. **Monitor** with the load chart and `QUERY_HISTORY`; **resize or scale out** if you see sustained queuing or slow runtimes from Cursor.
5. **Optionally** add an interactive table + interactive warehouse for a fast screener/dashboard, and a Snowpark-optimized warehouse for ML, keeping each workload on the right warehouse type.

This example ties together **warehouse types and size**, **auto-suspend and billing**, **multi-cluster**, **Query Acceleration**, **monitoring and tuning**, and optional **interactive** and **Snowpark-optimized** warehouses—all in the context of technology equity research using Snowflake from Cursor.
