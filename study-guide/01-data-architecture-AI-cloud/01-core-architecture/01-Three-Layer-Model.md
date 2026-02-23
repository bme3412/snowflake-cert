# The Three-Layer Architecture of Snowflake

## How Snowflake Fundamentally Reimagined the Data Warehouse

To understand Snowflake, you first have to let go of how traditional databases work. In a conventional on-premise data warehouse, storage and compute are tightly coupled — they live on the same physical machine. If you need more processing power, you add more hardware. If you need more storage, you do the same. Scaling one almost always means scaling the other, whether you need to or not. Snowflake was built from the ground up to break this assumption apart.

Snowflake's architecture is organized into three distinct, independently scalable layers: the **Database Storage layer**, the **Query Processing layer** (powered by Virtual Warehouses), and the **Cloud Services layer**. These three layers communicate with each other seamlessly, but they operate, scale, and bill independently. This separation is not merely a technical detail — it is the core architectural decision that makes Snowflake fundamentally different from everything that came before it.

---

## Layer 1: Database Storage

The foundation of the stack is the Storage layer. When you load data into Snowflake, it is persisted in a centralized cloud object store — Amazon S3, Azure Blob Storage, or Google Cloud Storage, depending on your deployment. Snowflake manages this storage entirely on your behalf. From your perspective, data simply exists in tables; the underlying object store is invisible to you.

What makes this layer interesting is not just *where* the data lives, but *how* it is organized. Snowflake automatically converts all ingested data into a highly optimized, compressed, columnar format using a proprietary internal structure. Data is broken into small chunks called **micro-partitions** — contiguous storage units each containing between 50 MB and 500 MB of uncompressed data. Snowflake continuously tracks rich metadata about every micro-partition, including the minimum and maximum values for each column within it. This metadata becomes the engine behind one of Snowflake's most powerful performance features: **partition pruning**, where the query engine skips entire micro-partitions that cannot possibly contain rows matching your filter conditions — without ever reading them.

Because the Storage layer is fully decoupled from compute, multiple Virtual Warehouses can read from the same underlying data simultaneously without contention or locking. One team can run heavy ETL jobs while another runs live dashboards against the exact same tables, completely independently. The data is the shared source of truth. Compute is just the lens through which different teams look at it.

---

## Layer 2: Query Processing — Virtual Warehouses

The middle layer is where all computation happens, and it is organized around a concept called the **Virtual Warehouse**. A Virtual Warehouse is a named cluster of compute nodes — servers provisioned in the cloud and managed entirely by Snowflake — that are dedicated to executing queries. When a query runs, the warehouse reads the relevant micro-partitions from the Storage layer, processes the data in memory, and returns results. When idle, the warehouse can be suspended, and a suspended warehouse costs zero compute credits. This auto-suspend / auto-resume behavior means you only pay for compute when work is actually happening.

Virtual Warehouses come in sizes from X-Small (a single node) to 6X-Large (512 nodes). The size you choose determines how much CPU, RAM, and local SSD cache is available to process queries. Crucially, scaling up — moving from a Medium to an X-Large, for example — requires no data migration or reconfiguration, because the data lives independently in the Storage layer. The warehouse simply gets access to more compute nodes the next time it starts.

Each Virtual Warehouse maintains its own **local disk cache** on its SSD layer. As the warehouse processes queries, it caches the micro-partitions it pulls from remote storage locally. Subsequent queries touching the same data can be served from this local cache, dramatically reducing latency and cloud storage egress costs. This cache persists as long as the warehouse is running and is cleared when the warehouse suspends — a behavioral nuance that appears on the exam regularly. For workloads with highly repetitive query patterns, keeping a warehouse alive (rather than letting it suspend) can yield meaningful performance gains, at the cost of continuous credit consumption.

An important extension of this layer is the **multi-cluster warehouse**. For workloads with high concurrency — many users querying simultaneously — Snowflake can automatically spin up additional clusters of the same warehouse size to absorb the load. This is different from scaling *up* (getting a bigger warehouse) and instead represents scaling *out* (adding parallel clusters). Multi-cluster warehouses are only available on Enterprise edition and above, and they are the exam's primary answer to "what do you do when users are experiencing query queuing?"

---

## Layer 3: Cloud Services

The top layer is the least visible but arguably the most sophisticated. The Cloud Services layer is a collection of always-on, globally coordinated services that tie the entire platform together. It is the intelligence of Snowflake — the part that makes decisions, enforces rules, and manages metadata so that everything else can run efficiently.

This layer handles **authentication and access control**, ensuring that every query arrives from a valid, authorized user with the appropriate role-based privileges. It manages the **query compilation and optimization** pipeline — when you submit a SQL statement, the Cloud Services layer parses it, generates an execution plan, applies cost-based optimizations, and routes it to the appropriate Virtual Warehouse. It maintains the **global metadata store**, which is how Snowflake knows which micro-partitions are relevant for any given query without scanning the entire table. And it orchestrates **transaction management**, ensuring ACID compliance across concurrent reads and writes.

The Cloud Services layer also maintains the **result cache**, which is distinct from the warehouse-level disk cache and worth understanding clearly. When a query completes, its result set is cached at the Cloud Services level for 24 hours. If the exact same query is submitted again — by any user, against data that has not changed — Snowflake can return the cached result set instantly, without spinning up a Virtual Warehouse at all. This means zero compute credits are consumed on that repeat query. The result cache is invalidated automatically if the underlying data has changed since the original query ran.

Because Cloud Services is a shared, multi-tenant layer managed entirely by Snowflake, you pay only for usage that exceeds 10% of your daily compute credits. For most workloads, Cloud Services usage falls well below this threshold, effectively making it free — another design choice that encourages heavy use of Snowflake's metadata and optimization infrastructure without penalizing customers for it.

---

## Why the Separation Matters

The three-layer model is not just an architectural curiosity — it has direct, practical implications for how you design and operate on Snowflake. Storage is cheap and persistent; compute is elastic and ephemeral. This means you should think of compute as a dial you turn up when you need it and down when you do not, rather than a fixed resource you provision and maintain.

It also means cost optimization and performance optimization often pull in opposite directions, and understanding which layer a given knob lives in tells you which trade-off you are making. Keeping a warehouse running improves cache hit rates (Layer 2) but increases compute spend. Clustering a large table improves pruning efficiency (Layer 1) but adds maintenance overhead. Caching query results at the Cloud Services level (Layer 3) is free and automatic, but only useful for deterministic, repeated queries.

On the SnowPro Core exam, questions about this model tend to probe your understanding of these trade-offs: when does the result cache apply vs. the disk cache? What happens to the disk cache when a warehouse suspends? Why can two warehouses run simultaneously against the same table without locking each other out? The answers all flow from the same fundamental insight — in Snowflake, storage, compute, and coordination are three separate concerns, each managed independently, each optimized for exactly one job.