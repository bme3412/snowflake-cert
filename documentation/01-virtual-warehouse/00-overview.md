# Virtual Warehouse Overview

Warehouses are required for queries and all DML operations, including loading data into tables. A warehouse is defined by:

- **Type** — Standard or Snowpark-optimized  
- **Size** — amount of compute per cluster  
- **Other properties** — used to control and automate warehouse activity  

Warehouses can be **started and stopped** at any time. They can also be **resized at any time**, even while running, to adjust compute resources based on the type of operations being performed.

---

## Warehouse size

Size specifies the amount of compute resources available **per cluster** in a warehouse. Snowflake supports the following warehouse sizes.

### Size and credit usage (Gen1 standard warehouses)

| Size     | Credits/hour | Credits/second | Notes |
|----------|--------------|----------------|-------|
| **X-Small** | 1   | 0.0003 | Default size for warehouses created in Snowsight and using `CREATE WAREHOUSE`. |
| **Small**   | 2   | 0.0006 | |
| **Medium**  | 4   | 0.0011 | |
| **Large**   | 8   | 0.0022 | |
| **X-Large** | 16  | 0.0044 | Default size for warehouses created using Snowsight. |
| **2X-Large** | 32  | 0.0089 | |
| **3X-Large** | 64  | 0.0178 | |
| **4X-Large** | 128 | 0.0356 | |
| **5X-Large** | 256 | 0.0711 | Generally available in AWS and Azure; preview in US Government regions. |
| **6X-Large** | 512 | 0.1422 | Generally available in AWS and Azure; preview in US Government regions. |

> **Note:** The table above refers to **Gen1** standard warehouses. For Gen2 usage and credit consumption, see [Snowflake generation 2 standard warehouses](https://docs.snowflake.com/...) and the [Snowflake Service Consumption Table](https://docs.snowflake.com/...). Gen2 warehouses are not yet available for all cloud providers or regions and are not the default when creating a standard warehouse.

> **Tip:** For cost implications of changing the `RESOURCE_CONSTRAINT` property, see [considerations for changing RESOURCE_CONSTRAINT](https://docs.snowflake.com/...) while a warehouse is running or suspended.

Another way to scale capacity **without changing warehouse size** is [multi-cluster warehouses](https://docs.snowflake.com/...).

### Larger warehouse sizes (5X-Large and 6X-Large)

- **Generally available** in all AWS and Microsoft Azure regions.  
- **Preview** in US Government regions (requires FIPS support on ARM).

---

## Impact on credit usage and billing

Credit usage **doubles** as you move to the next larger warehouse size per full hour. Snowflake uses **per-second billing** with a **60-second minimum** each time a warehouse starts, so you are billed only for credits actually consumed.

### Example billing (Gen1 standard warehouses)

Totals below are rounded to the nearest 1000th of a credit.

| Running time   | Credits (X-Small) | Credits (X-Large) | Credits (5X-Large) |
|----------------|-------------------|-------------------|---------------------|
| 0–60 seconds   | 0.017             | 0.267             | 4.268               |
| 61 seconds     | 0.017             | 0.271             | 4.336               |
| 2 minutes      | 0.033             | 0.533             | 8.532               |
| 10 minutes     | 0.167             | 2.667             | 42.668              |
| 1 hour         | 1.000             | 16.000            | 256.000             |

> **Note:** For a **multi-cluster warehouse**, credits are calculated from warehouse size **and** the number of clusters that run in the period. Example: a 3X-Large multi-cluster warehouse running 1 cluster for one hour then 2 clusters for the next hour is billed **192 credits** (64 + 128). Multi-cluster warehouses are an **Enterprise Edition** feature.

---

## Impact on data loading

Increasing warehouse size **does not always** improve data loading performance. Performance is influenced more by the **number of files** being loaded (and file size) than by warehouse size.

> **Tip:** Unless you are bulk loading hundreds or thousands of files concurrently, a smaller warehouse (Small, Medium, Large) is usually sufficient. Larger warehouses (X-Large, 2X-Large, etc.) consume more credits and may not improve performance. See [Data loading considerations](https://docs.snowflake.com/...).

---

## Impact on query processing

Warehouse size affects how long queries take, especially for larger, more complex queries. In general, **query performance scales with warehouse size** because larger warehouses have more compute.

If queries are slow, you can **resize the warehouse** to add compute. New resources do not affect queries already running; once provisioned, they are available for queued or newly submitted queries.

> **Tip:** Larger is not necessarily faster for small, basic queries. See [Warehouse considerations](https://docs.snowflake.com/...).

---

## Auto-suspension and auto-resumption

You can set a warehouse to automatically suspend and resume based on activity:

| Property      | Default   | Behavior |
|---------------|-----------|----------|
| **Auto-suspend**  | Enabled | Warehouse suspends after it is inactive for the specified period. |
| **Auto-resume**   | Enabled | Warehouse resumes when any statement that requires a warehouse is submitted and the warehouse is the current warehouse for the session. |

These properties help automate monitoring and usage so the warehouse matches your workload: auto-suspend avoids leaving a warehouse running (and consuming credits) with no queries; auto-resume brings it back when needed.

> **Note:** Auto-suspend and auto-resume apply to the **entire warehouse**, not to individual clusters. For multi-cluster warehouses:
> - **Auto-suspend** occurs only when the **minimum** number of clusters is running and there is no activity for the specified period (minimum is typically 1).
> - **Auto-resume** applies only when the **entire** warehouse is suspended (no clusters running).

---

## Query processing and concurrency

How many queries a warehouse can process **concurrently** depends on the size and complexity of each query. As queries are submitted, the warehouse reserves compute for each. If there are not enough remaining resources, the query is **queued** until resources free up.

Relevant object-level parameters:

- `STATEMENT_QUEUED_TIMEOUT_IN_SECONDS`
- `STATEMENT_TIMEOUT_IN_SECONDS`

> **Note:** If queuing is excessive, you can create another warehouse and redirect queries, or resize the current warehouse for limited scaling. For **fully automated** scaling by concurrency, Snowflake recommends **multi-cluster warehouses**, which provide similar benefits without manual intervention. Multi-cluster warehouses are an **Enterprise Edition** feature.

---

## Warehouse usage in sessions

A new session in Snowflake **does not** have a warehouse by default. Queries cannot be submitted until a warehouse is associated with the session.

### Default warehouse for users

You can specify a **default warehouse** per user. That warehouse is used for all sessions initiated by the user. Set it when creating or modifying the user via the web interface or `CREATE USER` / `ALTER USER`.

### Default warehouse for client utilities

Snowflake CLI, SnowSQL, JDBC, ODBC, Python connector, etc. can also have a default warehouse:

- **Snowflake CLI and SnowSQL:** configuration file and/or command-line options.
- **Drivers and connectors:** default warehouse as a connection parameter when starting a session.

See [Applications and tools for connecting to Snowflake](https://docs.snowflake.com/...).

### Default warehouse for notebooks

> **Preview feature** — Available to all accounts.

A multi-cluster X-Small warehouse, **`SYSTEM$STREAMLIT_NOTEBOOK_WH`**, is automatically provisioned in each account for notebook workloads. It has:

- Maximum of 10 clusters  
- 60-second default timeout  
- Improved bin packing  

The `ACCOUNTADMIN` role has `OWNERSHIP` privileges.

**Recommendations for cost management:**

- Use `SYSTEM$STREAMLIT_NOTEBOOK_WH` **only** for notebook workloads.
- Direct SQL from Notebook apps to a **separate** customer-managed query warehouse to improve bin-packing and reduce cluster fragmentation.
- Use a **single shared** warehouse for all Notebook apps in the account when possible.
- Keep notebook Python workloads separate from SQL queries to minimize fragmentation and avoid co-locating with larger query warehouses.

**Access control:**

| Privilege       | Object                      | Notes |
|-----------------|-----------------------------|-------|
| `USAGE`         | `SYSTEM$STREAMLIT_NOTEBOOK_WH` | By default, `PUBLIC` has `USAGE`. `ACCOUNTADMIN` can grant/revoke. |
| `MONITOR`, `OPERATE`, `APPLYBUDGET` | `SYSTEM$STREAMLIT_NOTEBOOK_WH` | Available to `ACCOUNTADMIN` and grantable to other roles. |

### Precedence for warehouse defaults

When a user connects and starts a session, Snowflake resolves the default warehouse in this order (later overrides earlier):

1. **Default warehouse for the user**
2. **Default warehouse in the client configuration file** (SnowSQL, JDBC, etc., if supported)
3. **Default warehouse on the command line or in driver/connector parameters**

> **Note:** You can change the warehouse for a session at any time with `USE WAREHOUSE`.
