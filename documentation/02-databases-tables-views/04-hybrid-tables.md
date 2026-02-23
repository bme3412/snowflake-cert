Create hybrid tables
Feature — Generally Available

Available to accounts in AWS and Microsoft Azure commercial regions only. For more information, see Clouds and regions.

This topic provides an overview on creating hybrid tables in Snowflake.

Note

To create a hybrid table, you must have a running warehouse that is specified as the current warehouse for your session. Errors may occur if no running warehouse is specified when you create a hybrid table. For more information, see Working with Warehouses.

CREATE HYBRID TABLE options
You can create a hybrid table by using one of the following methods.

CREATE HYBRID TABLE. The following example creates a hybrid table with a required PRIMARY KEY constraint, inserts some rows, deletes a row, and queries the table:

CREATE OR REPLACE HYBRID TABLE application_log (
  id NUMBER PRIMARY KEY AUTOINCREMENT,
  col1 VARCHAR(20),
  col2 VARCHAR(20) NOT NULL
  );

INSERT INTO application_log (col1, col2) VALUES ('A1', 'B1');
INSERT INTO application_log (col1, col2) VALUES ('A2', 'B2');
INSERT INTO application_log (col1, col2) VALUES ('A3', 'B3');
INSERT INTO application_log (col1, col2) VALUES ('A4', 'B4');

SELECT * FROM application_log;

UPDATE application_log SET col2 = 'B3-updated' WHERE id = 3;

DELETE FROM application_log WHERE id = 4;

SELECT * FROM application_log;
CREATE HYBRID TABLE … AS SELECT (CTAS) or CREATE HYBRID TABLE … LIKE. For example:

CREATE OR REPLACE HYBRID TABLE dept_employees (
  employee_id INT PRIMARY KEY,
  department_id VARCHAR(200)
  )
AS SELECT employee_id, department_id FROM company_employees;
Loading data
Note

Because the primary storage for hybrid tables is a row store, hybrid tables typically have a larger storage footprint than standard tables. The main reason for the difference is that columnar data for standard tables often achieves higher rates of compression. For details about storage costs, see Evaluate cost for hybrid tables.

Optimized bulk loads
You can bulk load data into hybrid tables by copying either from a data stage or from other tables (using CTAS, COPY INTO <table>, or INSERT INTO … SELECT).

The optimization of bulk loads depends on whether the table is freshly created, without ever having any records loaded, or is created using a CTAS query.

When a hybrid table is empty, all three load methods (CTAS, COPY, and INSERT INTO … SELECT) use optimized bulk loading to speed up the load process. After the table is loaded, normal INSERT performance applies. You can still run incremental batch loads with COPY and INSERT INTO … SELECT operations, but they will typically be less efficient. Bulk load speeds of approximately 1 million records per minute are common but can widely vary based on the structure of the table (for example, larger records are slower to load). Optimized bulk loading will be extended to support incremental batch loads in a future release.

You can check the Statistics information in Snowsight query profiles to see whether the bulk-load fast path was used. Number of rows inserted is referred to as the Number of rows bulk loaded when the fast path is used. For example, this CTAS operation bulk loaded 200000 rows into a new table:

CTAS query profile that uses the optimized bulk loading
A subsequent incremental batch load into the same table would not use optimized bulk loading.

For more information about query profiles, see Analyze query profiles for hybrid tables and Monitor query activity with Query History.

Attention

CTAS commands do not support FOREIGN KEY constraints. If your hybrid table requires FOREIGN KEY constraints, use COPY or INSERT INTO … SELECT to load the table.

Note

Other methods of loading data into Snowflake tables (for example, Snowpipe) are not currently supported.

Index-building errors during loads
Index sizes are limited in width. When building indexes on columns in a hybrid table, especially indexes on a large number of columns, any command that loads the table (including CTAS, COPY, or INSERT INTO … SELECT) might return the following error. In this case, the table contains an index named IDX_HT100_COLS:

The value is too long for index "IDX_HT100_COLS".
This error occurs because row-based storage imposes a limit on the size of the data (and metadata) that can be stored per record. To reduce the record size, try creating the table without specifying larger columns, such as wide VARCHAR columns, as indexed columns. You can also try creating indexes on fewer columns.

You can also try using INCLUDE columns on secondary indexes when you create a hybrid table or an index on a hybrid table. For more information, see INCLUDE columns.

Was this page helpful?

Yes
Index hybrid tables
Feature — Generally Available

Available to accounts in AWS and Microsoft Azure commercial regions only. For more information, see Clouds and regions.

This topic explains how to index hybrid tables.

Types of indexes
Hybrid tables support two types of indexes:

Indexes that are created automatically when you declare constraints for hybrid table columns.

Indexes for PRIMARY KEY constraints

Indexes for FOREIGN KEY constraints

Indexes for UNIQUE constraints

User-defined indexes, known as secondary indexes, that you can define on other columns as needed. A single index can cover one or more columns. You can use CREATE HYBRID TABLE or CREATE INDEX to define secondary indexes.

When you create secondary indexes, you can “include” columns that are not part of the index key but are associated and stored with the index itself. See INCLUDE columns.

Attention

To add a secondary index, you must use a role that is granted the SELECT privilege on the hybrid table. If you have access to a view of the data in the hybrid table, but not the table itself, you can’t add a secondary index.

Add secondary indexes
All hybrid tables require a unique primary key. The data in a hybrid table is ordered by this primary key. You can create additional secondary indexes on non-primary key attributes to accelerate lookups on those attributes. Indexes might be able to reduce the number of records that are scanned when a query predicate uses one of the following conditions:

=, >, >=, <, <= (comparison operators)

[ NOT ] IN conditions

[ NOT ] BETWEEN conditions

If you have common, repeated queries with predicates on a specific attribute or a composite group of attributes, consider adding an index to that attribute or group of attributes to improve performance. Be aware of the following considerations when you use indexes:

Increase in storage consumption when storing additional copies of the subset of data in the index.

Additional overhead on DMLs because indexes are maintained synchronously.

You can add secondary indexes to a hybrid table when you create it, or you can add them later by using the CREATE INDEX command. For example, the following CREATE HYBRID TABLE statement creates two indexes automatically (on the PRIMARY KEY and UNIQUE columns, col1 and col2) and one user-defined secondary index (on col3):

CREATE OR REPLACE HYBRID TABLE target_hybrid_table (
    col1 VARCHAR(32) PRIMARY KEY,
    col2 NUMBER(38,0) UNIQUE,
    col3 NUMBER(38,0),
    INDEX index_col3 (col3)
    )
  AS SELECT col1, col2, col3 FROM source_table;
Alternatively, you can create a secondary index for an existing hybrid table by using the CREATE INDEX command. Use this command to add an index to a hybrid table that is actively being used for a workload and is serving queries, or has foreign keys. The CREATE INDEX command builds indexes concurrently without locking the table during the operation.

Tip

Check the index build status with the SHOW INDEXES command. Only one index build at a time is supported.

However, if your hybrid table application is in development or test mode, and some downtime for the table is not an issue, it is more efficient to recreate the hybrid table and create the indexes by running an optimized bulk load. This method is more efficient than online index building with the CREATE INDEX command.

Optimized bulk loading is supported for CTAS, COPY, and INSERT INTO … SELECT, but you can’t use CTAS if your table has a FOREIGN KEY constraint. The second table created in this example, fk_hybrid_table, would have to be bulk-loaded with COPY or INSERT INTO … SELECT:

CREATE OR REPLACE HYBRID TABLE ref_hybrid_table (
    col1 VARCHAR(32) PRIMARY KEY,
    col2 NUMBER(38,0) UNIQUE
);

CREATE OR REPLACE HYBRID TABLE fk_hybrid_table (
    col1 VARCHAR(32) PRIMARY KEY,
    col2 NUMBER(38,0),
    col3 NUMBER(38,0),
    FOREIGN KEY (col2) REFERENCES ref_hybrid_table(col2),
    INDEX index_col3 (col3)
);
INCLUDE columns
Although they are not part of the secondary index key, INCLUDE columns are stored with the index records. Because of this association between the actual indexed columns and the data in the included columns, certain queries can avoid table scans and benefit from less costly scans that use the index. However, using included columns in indexes might cause an increase in storage consumption because additional columns are stored with the indexed columns.

For example, consider the following table and index. The index in this case could be declared in either the CREATE TABLE statement or the CREATE INDEX statement.

CREATE OR REPLACE HYBRID TABLE sensor_data_device1 (
  device_id VARCHAR(10),
  timestamp TIMESTAMP PRIMARY KEY,
  temperature DECIMAL(6,4),
  vibration DECIMAL(6,4),
  motor_rpm INT
  );

CREATE INDEX sec_sensor_idx
  ON sensor_data_device1(temperature)
    INCLUDE (vibration, motor_rpm);
Because this secondary index covers one column directly (temperature) and two columns indirectly (vibration, motor_rpm), the index can be used to optimize certain queries that constrain temperature and select data from the included columns.

To test this behavior, first generate some rows for the table:

INSERT INTO sensor_data_device1 (device_id, timestamp, temperature, vibration, motor_rpm)
  SELECT 'DEVICE1', timestamp,
    UNIFORM(25.1111, 40.2222, RANDOM()), -- Temperature range in °C
    UNIFORM(0.2985, 0.3412, RANDOM()), -- Vibration range in mm/s
    UNIFORM(1400, 1495, RANDOM()) -- Motor RPM range
  FROM (
    SELECT DATEADD(SECOND, SEQ4(), '2024-03-01') AS timestamp
      FROM TABLE(GENERATOR(ROWCOUNT => 2678400)) -- seconds in 31 days
  );
Now run the following query:

SELECT temperature, vibration, motor_rpm
  FROM sensor_data_device1
  WHERE temperature = 25.6;
This query makes use of the secondary index named sec_sensor_idx. You can verify this behavior by running the EXPLAIN command on the query or by reviewing the query profile in Snowsight. You will see an index scan on the secondary index and no “probe scan” on the hybrid table itself.

The following queries, using other supported WHERE clause conditions, would also benefit from the same secondary index:

SELECT temperature, vibration, motor_rpm
  FROM sensor_data_device1
  WHERE temperature IN (25.6, 31.2, 35.8);

SELECT temperature, vibration, motor_rpm
  FROM sensor_data_device1
  WHERE temperature BETWEEN 25.0 AND 26.0;
Now modify the first query by adding the device_id column to the select list. This column isn’t covered by the sec_sensor_idx index.

SELECT device_id, temperature, vibration, motor_rpm
  FROM sensor_data_device1
  WHERE temperature = 25.6;
This query can’t depend on the secondary index entirely; a probe scan of the hybrid table is needed to return the correct device_id values.

Was this page helpful?

Yes
Best practices for hybrid tables
Feature — Generally Available

Available to accounts in AWS and Microsoft Azure commercial regions only. For more information, see Clouds and regions.

This topic describes best practices and important considerations when using hybrid tables. To achieve optimal performance with hybrid tables, follow these best practices in your deployment. This guide outlines specific configuration, design, and operational practices that maximize performance for production workloads.

General best practices:

Query performance in Snowsight versus driver-based access

Client drivers for hybrid tables

Client configuration and access methods

Index design and usage

Best practices for optimizing performance:

Bulk loading data

Warehouse optimization

Troubleshooting performance issues

Stored procedures and hybrid tables

Serverless tasks and hybrid tables

Foreign keys for join queries

Best practices for operating and monitoring hybrid tables:

Caching and warm-up

Performance monitoring

Monitoring quotas and throttling

Query performance in Snowsight versus driver-based access
Attention

Performance statistics reported in Snowsight are not indicative of query performance for driver-based workloads.

Snowsight provides rich access to query plans, data statistics, query history, and other detailed information that is useful for interactive query prototyping, debugging, investigation, monitoring, and other activities. Providing that rich interactive experience adds overhead to the Snowflake query engine. As such, latency for short-running queries executed through Snowsight is not indicative of performance that can be achieved with programmatic drivers. Queries executed via code-based or driver-based solutions execute with lower latency and variability than queries executed via Snowsight.

Note

Run a simple performance test to validate performance for your scenario.

Client drivers for hybrid tables
In order to access hybrid tables, you will need to use one of the following driver versions:

Driver

Minimum Version

Go

1.6.25

JDBC

3.13.31

.Net

2.1.2

Node.js

1.9.0

ODBC

3.0.2

PHP

2.0.0

Python Connector

3.1.0

Snowflake CLI

3.10.0

SnowSQL

1.2.28

Note

You may not be able to access hybrid tables using an earlier driver version.

For optimal performance with hybrid tables, be sure to use the latest version of your selected driver.

You can also access hybrid tables by using the Snowflake SQL API; however, this API is not recommended for use cases that require optimal latency.

Client configuration and access methods
Connection management directly affects performance and scalability. When connecting to databases that contain hybrid tables, consider the following best practices for achieving good performance.

Use connection pooling with long-lived connections to eliminate the overhead of repeatedly establishing new connections. Most client frameworks that connect to Snowflake provide a connection-pooling mechanism to efficiently manage access.

Network proximity significantly affects end-to-end latency; therefore, colocate your client software in the same cloud region as the Snowflake account.

Use prepared statements with bound parameters so the query planner will reuse previously created query plans.

Use the supported programmatic client drivers, not Snowsight, to achieve optimal latency. See Client drivers for hybrid tables.

Index design and usage
Creating and using indexes is a key component to achieving optimal performance for hybrid tables. Consider the following recommendations:

Create secondary indexes for frequently used predicates.

Design composite indexes to match complete query patterns.

Avoid using multiple indexes with columns in the same ordinal position.

Understand the cardinality of your data before creating indexes. Indexes built with a single, low-cardinality column have limited benefit. See Estimating the Number of Distinct Values.

Indexes add write overhead and storage requirements. Be careful to balance read versus write performance for applications that require low-latency write operations.

Properly designed indexes significantly improve query performance by providing efficient data access paths. If possible, choose primary keys for optimal selectivity while minimizing complexity. In some cases, adding columns with calculated or surrogate key values provides better performance than complex composite indexes. Secondary indexes dramatically improve performance for frequently accessed columns.

For well-defined queries, using the INCLUDE keyword to add columns to an index when you create the table might further decrease latency. See INCLUDE columns.

Attention

Be mindful of the indexes you create on a hybrid table; non-selective index scans result in sub-optimal performance, throttling, and higher cost.

Queries that qualify for index use
Hybrid table indexes may be accessed when queries use one of the following conditions:

<column_reference> {=, >, >=, <, <=} <constant_value>

<column_reference> IN <constant_in_list>

<column_reference> BETWEEN <constant_value> AND <constant_value>

Expressions can be chained together using Logical operators.

For example:

CREATE OR REPLACE HYBRID TABLE icecream_orders (
  id NUMBER PRIMARY KEY AUTOINCREMENT START 1 INCREMENT 1 ORDER,
  store_id NUMBER NOT NULL,
  flavor VARCHAR(20) NOT NULL,
  order_ts TIMESTAMP_NTZ,
  num_scoops NUMERIC,
  INDEX idx_icecream_order_store (store_id, order_ts),
  INDEX idx_icecream_timestamp (order_ts)
  );

-- Generate sample data for testing

INSERT INTO icecream_orders (store_id, flavor, order_ts, num_scoops)
  SELECT
    UNIFORM(1, 10, RANDOM()),
    ARRAY_CONSTRUCT('CHOCOLATE', 'VANILLA', 'STRAWBERRY', 'LEMON')[UNIFORM(0, 3, RANDOM())],
    DATEADD(SECOND, UNIFORM(0, 86400, RANDOM()), DATEADD(DAY, UNIFORM(-90, 0, RANDOM()), CURRENT_DATE())),
    UNIFORM(1, 3, RANDOM())
  FROM TABLE(GENERATOR(ROWCOUNT => 10000))
  ;

-- Use idx_icecream_order_store (first column)

  SELECT *
    FROM icecream_orders
    WHERE store_id = 5;

-- Use idx_icecream_order_store (both columns)

  SELECT *
    FROM icecream_orders
    WHERE store_id IN (1,2,3) AND order_ts > DATEADD(DAY, -7, CURRENT_DATE());

-- Use idx_icecream_timestamp

  SELECT *
    FROM icecream_orders
    WHERE order_ts BETWEEN DATEADD(DAY, -2, CURRENT_DATE()) AND DATEADD(DAY, -2, CURRENT_DATE());
Foreign keys for join queries
In general, queries that require joins benefit from the definition of FOREIGN KEY constraints. Although foreign keys aren’t required for running hybrid table queries, they do assist the optimizer in building the most effective query plan. Foreign keys provide two important functions:

They establish referential integrity between tables.

They provide the query planner with metadata for optimization.

A FOREIGN KEY constraint informs the query optimizer that a particular record in a child table points to exactly one record in a parent table. This behavior is one way in which query predicates are “pushed down” during a join, thereby optimizing storage I/O. The query is executed as a “one-to-many” join. Joining hybrid tables without foreign keys means that they are executed as “many-to-many” joins, such that additional query predicates might be necessary to optimize the query.

For more information, see the following topics:

REFERENTIAL_CONSTRAINTS view

CREATE | ALTER TABLE … CONSTRAINT

Constraints

Bulk loading data
You can use several optimizations and best practices for loading data into hybrid tables:

Use CREATE TABLE … AS SELECT (also referred to as CTAS) for creating and immediately loading empty tables.

Verify use of optimized bulk loading in query profiles.

Prefer initial data loading as a single bulk transaction.

Hybrid tables provide an optimized bulk loading path that delivers up to 10x faster loading performance than standard loading methods. This optimized bulk loading path is automatically applied when you load data into an empty table using CTAS (CREATE TABLE AS SELECT), COPY INTO, or INSERT INTO SELECT commands. (An empty table is a table that has never contained any data.)

You can verify that the optimization is being used by checking the statistics section of the query profile, where rows will be reported as Number of rows bulk loaded rather than Number of rows inserted.

Note

CTAS operations do not support FOREIGN KEY constraints. If your table requires foreign keys, you must use COPY or INSERT INTO SELECT instead.

For tables that already contain data, the optimized bulk loading path is not currently available. In these cases, loading operations may achieve approximately 1 million records per minute, though this varies based on record size, table structure, and number of indexes.

Warehouse optimization
A warehouse of size X-Small is sufficient for many operational workloads. In order to achieve higher concurrency and throughput on short-running operational queries, increase the compute node count by using a multi-cluster warehouse rather than increasing compute resources with a larger warehouse.

If your workload has variable throughput patterns, you can enable autoscaling to reduce consumption when demand is lower. Set the scaling policy to Standard rather than Economy for the best performance and efficiency on workloads that require high throughput or low latency. For more information, see Setting the scaling policy for a multi-cluster warehouse.

In some cases, isolating workloads in separate warehouses might be beneficial to enable independent scaling. If you have a mixed hybrid workload with operational and analytical components, it is beneficial to separate the operational and analytical components into different warehouses. If you cannot separate them and must execute them together on the same warehouse, choose the warehouse size based on the analytical query latency requirements and choose the multi-cluster node count based on what is required to support your workload’s throughput.

Caching and warm-up
The first hybrid table query issued to a newly started warehouse triggers activities such as query planning, index selection, I/O to load data, caching decisions, and, of course query execution. The query engine continues to optimize memory and storage for the query. This time is called the “warm-up” period. Query latency drops until the engine converges on a steady-state latency.

Use dedicated warehouses for hybrid table workloads to avoid cache interference.

Understand that reaching steady-state latency takes from several seconds to 2-3 minutes as the cache warms up.

Configure auto-suspend and auto-scaling to balance efficiency and cache warmth.

Hybrid tables utilize multiple caching approaches to optimize performance. The plan cache reduces compilation overhead by storing frequently used query plans. The column store data cache maintains frequently accessed data in memory, and the metadata cache provides rapid access to table and index information. Hybrid tables do not use a result cache.

These caches require some time to optimize for your workload patterns. Using dedicated warehouses for hybrid table workloads prevents cache interference from other workloads. Initial queries after a cold start experience higher latency until caches are populated. If your workload has variable throughput patterns, you can enable autoscaling and auto-suspend to reduce consumption or suspend your warehouse when demand is lower. When your warehouse restarts or auto-scales to add a new cluster, caches will need to rehydrate. Set the scaling policy to Standard rather than Economy for the best performance. see Multi-cluster warehouses.

Stored procedures and hybrid tables
Stored procedures are supported for hybrid tables; however, executing transactions with AUTOCOMMIT enabled or multi-statement transactions offers better performance and efficiency than calling a stored procedure.

Serverless tasks and hybrid tables
While serverless tasks are supported, be aware that you may not experience optimal performance or efficiency for workloads that use hybrid tables.

Performance monitoring
The recommended view to use for hybrid table performance monitoring is the AGGREGATE_QUERY_HISTORY view. This view contains query execution details aggregated over a short period of time.

For example, to retrieve the average default interval performance over the last 24 hours for a warehouse serving hybrid table requests:

SELECT *
  FROM SNOWFLAKE.ACCOUNT_USAGE.AGGREGATE_QUERY_HISTORY
  WHERE warehouse_name = 'HYBRID_TABLES_WAREHOUSE'
  AND query_type = 'SELECT'
  AND interval_start_time >= DATEADD(hour, -24, CURRENT_TIMESTAMP());
See the AGGREGATE_QUERY_HISTORY view for more examples.

Monitoring quotas and throttling
Hybrid tables implement quota controls at the database level for both hybrid storage and hybrid table requests throughput. These quotas ensure consistent performance across all users. The default quotas are sufficient for most initial implementations, but may need adjustment as workloads grow.

Monitor the hybrid table requests quota by using the AGGREGATE_QUERY_HISTORY view.

Monitor the hybrid storage quota by using the STORAGE_USAGE view.

High throttling percentages in query profiles indicate you’re approaching throughput limits. When you consistently utilize more than 70% of either quota, proactively request an increase through Snowflake Support.

The performance of hybrid tables is subject to throttling even in a case where virtual warehouse compute usage is not high. To monitor your usage and determine whether a hybrid table is being throttled, see the example in the AGGREGATE_QUERY_HISTORY view. You can also retrieve the number of throttled hybrid table requests from the HYBRID_TABLE_REQUESTS_THROTTLED_COUNT column.

For more information, see Quotas and throttling.

Troubleshooting performance issues
If you’re not achieving expected performance after implementing these best practices, Snowflake Support can help analyze and optimize your implementation. When creating a support case, include the following information to enable rapid resolution:

Query IDs (UUIDs) for representative queries showing suboptimal performance

Workload characteristics:

Typical query patterns

Expected versus actual latency

Concurrency requirements

Data storage volumes

Query response row size

Column cardinality estimates

Any recent changes to table schemas, indexes, or workload patterns

Throttling metrics from query profiles

Performance differences between cold and warm warehouses

Include both fast and slow examples of similar queries if possible to help identify optimization opportunities. This comparison helps support teams quickly identify potential configuration or design improvements.Performance testing
Feature — Generally Available

Available to accounts in AWS and Microsoft Azure commercial regions only. For more information, see Clouds and regions.

This topic provides information for testing hybrid tables in Snowflake. When evaluating hybrid tables for the first time in your environment, you will likely want to do some basic performance testing. This section refers to the getting started with hybrid tables tutorial. If you have not completed that tutorial, now is a good time to do so.

Attention

Performance statistics reported in Snowsight are not indicative of query performance for driver-based workloads.

Understand your use case
Testing for the outcome you are looking for is very important. Understanding how hybrid tables will augment your architecture is important when designing your tests.

Design your test scenario:

Do you require a high volume of UPDATE, INSERT, or DELETE statements?

Does your application need fast access to indexed data?

Do you have batch jobs you would like to run more often without impacting SELECT performance?

What do you want to measure during the test?

Select a test framework
Performance testing frameworks are ubiquitous in software development. Most customers have testing frameworks that are already in place and can be used to test hybrid tables. Regardless of the test framework you select, it needs to be able to:

Authenticate with Snowflake using shared key authentication

Support multi-threaded query execution

Issue queries as prepared statements, binding variables as needed

Create a mix of INSERT, UPDATE, DELETE, and SELECT queries

Ideally, your framework will track query execution time for each request in each thread to calculate:

Total query throughput

Min, max, average, and standard deviation of response time

Total bytes received per query

Execute the test
The hybrid tables query optimizer takes some time to “warm up” and establish a steady-state latency. This warm-up period can vary based on the amount of data, the number of indexes, and the complexity of the query. For most test cases, a warm-up period of 1-2 minutes is sufficient. Longer warm-up periods may be required.

Tip

The warm-up period ends when the throughput and latency curves converge to a steady state.

This is a typical performance test result for random queries on a single hybrid table. Note that the performance improves over time and achieves a steady state after a few seconds:

Hybrid tables performance test curves
Note

The time to achieve steady-state response times varies depending on many factors and can take several minutes.

Was this page helpful?

Analyze query profiles for hybrid tables
Feature — Generally Available

Available to accounts in AWS and Microsoft Azure commercial regions only. For more information, see Clouds and regions.

Unistore workloads pose some interesting questions about query execution that you can investigate by using the Snowsight Query Profile feature or information gleaned from EXPLAIN output. In addition to monitoring overall performance and throughput, you may want to know if a table scan is being executed against the row store or object storage, or whether a specific secondary index is being used.

This section identifies Query Profile operators and attributes that pertain to hybrid table operations and presents some examples to help you understand how to read query plans that access hybrid tables. See also Monitor query activity with Query History.

Hybrid table scans and index scans
Table and index scan operators appear in query profiles to show access to hybrid tables. These operators typically appear at the bottom of the tree, representing the first step in reading the data that is needed to execute a specific query. Queries against standard tables always use table scans; they do not use index scans.

When a primary key index is used to scan a hybrid table, a TableScan operator appears in the query profile, not an IndexScan operator. When any other index is used to scan a hybrid table, such as a secondary index, you will see an IndexScan operator.

Under Attributes for the IndexScan operator, you can see the fully qualified name of the index and Access predicates. These are the predicates that are applied to the index during the scan. You can also see predicates for filters that are applied during table scans.

When a predicate is “pushed” to an index, the predicate contains a placeholder, inside parentheses, for the constant that was used in the query. For example: SENSOR_DATA_DEVICE2.DEVICE_ID = (:SFAP_PRE_NR_1)

Scan mode
Hybrid table data is maintained in two formats to serve both operational and analytical workloads. A common question asked by administrators is whether a given query will access the row store or the column store (object storage). A query may read from one or both types of storage, depending on the tables in question, the specific requirements of the query, availability of indexes, and other factors.

The query profile for hybrid table queries includes a Scan Mode attribute for each table scan operator in the tree:

ROW-BASED: The query reads from the table data in the row store, or uses indexes to compute query results.

COLUMN-BASED: The query reads from an object storage copy of the same data that was loaded into the row store. Index scans can also access object storage, for Time Travel queries.

Scan mode is specific to hybrid tables. If a table scan is run on a standard table, no Scan Mode attribute is displayed.

Data read from the columnar warehouse cache
Where possible, table scans for hybrid tables read data from a columnar warehouse cache. This cache is an extension to the standard warehouse cache; see Optimizing the warehouse cache. The cache contains data that has been read from the hybrid table storage provider and is accessible by read-only queries against hybrid tables.

To see cache usage in a given query profile, select the table scan operator and check the Percentage scanned from cache under Statistics.

Queries that select from hybrid tables do not benefit from the query results cache.

Throttling for hybrid table requests
In the Profile Overview, you can see a Hybrid Table Requests Throttling percentage. To see this overview, do not select an operator in the tree; the overview applies to the whole query plan.

For example, the following query recorded that 87.5% of its execution time was spent being throttled by the hybrid table storage provider. A high throttling percentage is an indicator that too many hybrid table read and write requests are being sent to the storage provider, relative to the quota for the database. For more information, see Quotas and throttling.

Query profile overview shows a high throttling percentage for hybrid table requests.
Examples
The following Snowsight examples of query profiles show attributes specific to hybrid table operations. To understand these examples, you do not need to create and load the tables that are queried and modified. However, here is the CREATE TABLE statement for one of the tables for reference. Note the definition of the PRIMARY KEY constraint (on the timestamp column) and a secondary index (on the device_id column):

CREATE OR REPLACE HYBRID TABLE sensor_data_device1 (
  timestamp TIMESTAMP_NTZ PRIMARY KEY,
  device_id VARCHAR(10),
  temperature DECIMAL(6,4),
  vibration DECIMAL(6,4),
  motor_rpm INT,
  INDEX device_idx(device_id)
 );
Another similar hybrid table, sensor_data_device2, is also used in the examples.

Query plan that accesses the primary key column
When your query filters the primary key of the table (timestamp), which is automatically indexed, the query profile uses a TableScan operator. Also note that ROW_BASED scan mode is used for this query.

SELECT * FROM sensor_data_device1 WHERE timestamp='2024-03-01 13:45:56.000';
TableScan operator for query that filters on the primary key column, timestamp
Query plan that accesses a secondary index
The query that generated this profile looks like this:

SELECT COUNT(*) FROM sensor_data_device1 WHERE device_id='DEVICE2';
Only part of the profile is shown here, focusing on the IndexScan operator and its attributes. The scan mode is ROW_BASED, and you can see the complete predicate by hovering over Access Predicates. The fully qualified index name is also displayed.

IndexScan operator with attributes, including access predicate and ROW_BASED scan mode
See also INCLUDE columns.

Query plan for DML on a hybrid table
DML operations on hybrid tables typically modify single rows. For example:

UPDATE sensor_data_device2 SET device_id='DEVICE3' WHERE timestamp = '2024-04-02 00:00:05.000';
The query profile for the TableScan operator shows that this UPDATE accesses the row store for the hybrid table (scan mode is ROW_BASED):

Table scan operator that uses a ROW_BASED scan for a single-row UPDATE
Recurring query that benefits from cached data
In this case, assume that the following query is run twice in quick succession on a hybrid table.

SELECT device_id, AVG(temperature)
  FROM sensor_data_device2
  WHERE temperature>33
  GROUP BY device_id;
The first query reads all of the data from object storage. The second run of the query reads 100% of the data from the columnar cache. Also note that the scan mode for this query is COLUMN_BASED.

Table scan operator that read 100% of the data from the cache
Query plan for a join (hybrid table to standard table)
When you join a hybrid table to a standard table, you will see a Scan Mode attribute for the scan on the hybrid table, but not on the standard table. For example, the TableScan operator on the left side of this join plan used ROW_BASED scan mode. The order_header table is a hybrid table with order_id as its primary key (the joining column in this example). The other table, truck_history, is a standard table.

TableScan operator for a hybrid table in a join, including access predicate and ROW_BASED scan mode
Was this page helpfuMonitor hybrid table workloads
Feature — Generally Available

Available to accounts in AWS and Microsoft Azure commercial regions only. For more information, see Clouds and regions.

Unistore workloads that leverage hybrid tables will be different from many analytical workloads that you are running in Snowflake. For example, your workloads might contain fewer unique queries that take less time to run and execute at a higher frequency. You have several options to monitor your workloads.

Monitor transactions

Monitor workloads

Monitor overall workload health

Identify and investigate repeated queries

Monitor transactions
Hybrid tables support Snowflake transaction monitoring features, including SHOW TRANSACTIONS, DESCRIBE TRANSACTION, SHOW LOCKS, and LOCK WAIT HISTORY.

The behavior of these commands and views for hybrid tables is consistent with the behavior for standard Snowflake tables, except for the following changes:

A new ROW lock type is introduced in the SHOW LOCKS command to represent row locks against hybrid tables. The locks are summarized to show one transaction holding (one or multiple) row locks and another transaction waiting for these locks.

LOCK WAIT HISTORY does not show schema-related information.

LOCK_WAIT_HISTORY does not summarize BLOCKER_QUERIES. If a query is blocked by multiple blockers, then they will appear as multiple records in the view rather than as multiple entries in the BLOCKER_QUERIES JSON array for the single waiter record.

For the result of SHOW LOCKS, and the LOCK_WAIT_HISTORY view:

As the row locks are summarized, the lock-holding transaction is assumed to acquire the lock when it starts.

Due to the potential high volume of Unistore transactions, only locks that have blocked other transaction(s) for an extended period (approximately 5 seconds) are shown.

The lock-waiting transaction might still appear to be waiting for the locks even if it has acquired them (for no more than 1 minute). The accuracy of lock reporting will improve in future releases.

If a statement that blocked a waiting query has completed and was a short-running query against hybrid tables, the following information for the blocker query is not shown in the BLOCKER_QUERY field of the waiting query record:

Query UUID of the blocker query

Session ID of the blocker query

User name of the blocker query

Database ID of the blocker query

Database name of the blocker query

Monitor workloads
To monitor your operational workloads effectively, use the AGGREGATE_QUERY_HISTORY view. This view enables you to monitor the health of your workload, diagnose issues, and identify avenues for optimization. The AGGREGATE_QUERY_HISTORY view aggregates query execution statistics for a repeated parameterized query over a time interval so that it is easier and more efficient to identify patterns in your workloads and queries over time. Note that all Snowflake workloads and queries will be combined in the output of this view.

The AGGREGATE_QUERY_HISTORY view helps you answer the following questions about your workloads:

How many operations per second are being executed in my virtual warehouse?

Which queries are consuming the most total time or resources in my workload?

Has the performance of a specific query changed substantially over time?

To help improve performance and efficiency in your workload, individual executions of low latency operations (under one second) will not be stored in QUERY_HISTORY view nor will they generate a unique query profile. Instead, aggregate statistics for repeated executions of that query will be returned in the AGGREGATE_QUERY_HISTORY view. You will also be able to view a sampled query profile for the query over a selected time interval. For more information about this behavior, see Usage notes.

Tip

You can use the Grouped Query History view in Snowsight to visualize performance and statistics for typical hybrid table workloads. This view does not capture all hybrid table activity, but it provides a good alternative to monitoring performance for a large volume of individual queries that are somewhat repetitive and run extremely fast.

Monitor overall workload health
Use the AGGREGATE_QUERY_HISTORY view to monitor your overall workload throughput and concurrency, and to investigate unexpected spikes or drops in your workloads. For example:

SELECT
    interval_start_time
    , SUM(calls) as execution_count
    , SUM(calls) / 60 as queries_per_second
    , COUNT(DISTINCT session_id) as unique_sessions
    , COUNT(user_name) as unique_users
FROM snowflake.account_usage.aggregate_query_history
WHERE warehouse_name = '<MY_WAREHOUSE>'
  AND interval_start_time > $START_DATE
  AND interval_start_time < $END_DATE
GROUP BY ALL;
You can also use aggregate query history to monitor for potential problems with errors, queueing, lock blocking, or throttling. For example:

WITH time_issues AS
(
    SELECT
        interval_start_time
        , SUM(transaction_blocked_time:"SUM") as transaction_blocked_time
        , SUM(queued_provisioning_time:"SUM") as queued_provisioning_time
        , SUM(queued_repair_time:"SUM") as queued_repair_time
        , SUM(queued_overload_time:"SUM") as queued_overload_time
        , SUM(hybrid_table_requests_throttled_count) as hybrid_table_requests_throttled_count
    FROM snowflake.account_usage.aggregate_query_history
    WHERE WAREHOUSE_NAME = '<MY_WAREHOUSE>'
      AND interval_start_time > $START_DATE
      AND interval_start_time < $END_DATE
    GROUP BY ALL
),
errors AS
(
    SELECT
        interval_start_time
        , SUM(value:"count") as error_count
    FROM
    (
        SELECT
            a.interval_start_time
            ,e.*
        FROM
            snowflake.account_usage.aggregate_query_history a,
            TABLE(flatten(input => errors)) e
        WHERE interval_start_time > $START_DATE
          AND interval_start_time < $END_DATE
  )
  GROUP BY ALL
)
    SELECT
        ts.interval_start_time
        , error_count
        , transaction_blocked_time
        , queued_provisioning_time
        , queued_repair_time
        , queued_overload_time
        , hybrid_table_requests_throttled_count
    FROM time_issues ts
    FULL JOIN errors e ON e.interval_start_time = ts.interval_start_time
;
Ordinarily, such metrics should remain low. If you see an unexpected spike, it is recommended that you investigate the cause.

Identify and investigate repeated queries
You may opt to optimize or investigate the performance of common and often executed queries to improve the efficiency of your workload. Use the AGGREGATE_QUERY_HISTORY view to identify top queries for a workload by execution count. For example:

SELECT
    query_parameterized_hash
    , any_value(query_text)
    , SUM(calls) as execution_count
FROM snowflake.account_usage.aggregate_query_history
WHERE TRUE
          AND warehouse_name = '<MY_WAREHOUSE>'
          AND interval_start_time > '2024-02-01'
          AND interval_start_time < '2024-02-08'
GROUP BY
          query_parameterized_hash
ORDER BY execution_count DESC
;
You can choose to view metrics for the slowest queries. For example:

SELECT
    query_parameterized_hash
    , any_value(query_text)
    , SUM(total_elapsed_time:"sum"::NUMBER) / SUM (calls) as avg_latency
FROM snowflake.account_usage.aggregate_query_history
WHERE TRUE
          AND warehouse_name = '<MY_WAREHOUSE>'
          AND interval_start_time > '2024-02-01'
          AND interval_start_time < '2024-02-08'
GROUP BY
          query_parameterized_hash
ORDER BY avg_latency DESC
;
You can analyze the performance of a particular query over time to gain insight into trends in latency. For example:

SELECT
    interval_start_time
    , total_elapsed_time:"avg"::number avg_elapsed_time
    , total_elapsed_time:"min"::number min_elapsed_time
    , total_elapsed_time:"p90"::number p90_elapsed_time
    , total_elapsed_time:"p99"::number p99_elapsed_time
    , total_elapsed_time:"max"::number max_elapsed_time
FROM snowflake.account_usage.aggregate_query_history
WHERE TRUE
          AND query_parameterized_hash = '<123456>'
          AND interval_start_time > '2024-02-01'
          AND interval_start_time < '2024-02-08'
ORDER BY interval_start_time DESC
;
This query calculates total query time. You can also modify the query to return more granular metrics on the different phases of a query (compilation, execution, queuing, and lock waiting). Aggregate statistics will be returned for each phase.Clone databases that contain hybrid tables
Feature — Generally Available

Available to accounts in AWS and Microsoft Azure commercial regions only. For more information, see Clouds and regions.

You can clone databases that contain hybrid tables for two main purposes:

To run point-in-time restore operations. Cloning works in combination with Time Travel, which by default creates implicit continuous backups. After setting a data retention period, you can clone a database at any point in its Time Travel history to restore the database to a healthy state (in the event that a corruption was introduced). You do not need to create a clone except when a restore is necessary.

To hydrate other environments from a source environment, such as cloning a database from production to development or test.

Before you attempt to create any cloned databases that contain hybrid tables, be sure to read and understand the specific requirements and limitations in the following sections.

Cloning hybrid tables at the database level
Hybrid table clones must be created at the database level. For example:

CREATE DATABASE clone_db1 CLONE db1;
You cannot clone hybrid tables at the schema level or the table level. If you try to create a new hybrid table by cloning a hybrid table or a standard table, the command fails with an error. For example:

CREATE HYBRID TABLE clone_ht1 CLONE ht1;
391411 (0A000): This feature is not supported for hybrid tables: 'CLONE'.
If you try to create a schema by cloning another schema, and the source schema has one or more hybrid tables, the command fails. However, you can clone the schema by using the IGNORE HYBRID TABLES parameter to explicitly skip the hybrid tables in the schema. This parameter also works for creating database clones. For example:

CREATE OR REPLACE SCHEMA clone_ht_schema CLONE ht_schema IGNORE HYBRID TABLES;
+----------------------------------------------+
| status                                       |
|----------------------------------------------|
| Schema CLONE_HT_SCHEMA successfully created. |
+----------------------------------------------+
Usage notes for cloning hybrid tables
You cannot create clones that include hybrid tables by using the AT BEFORE, OFFSET, or STATEMENT (query UUID) parameters. You must specify either no parameters at all or AT TIMESTAMP with an explicitly cast TIMESTAMP value.

Consistent with the behavior for standard tables, the history of a source table that is cloned is not retained by the clone itself. Cloned tables lose all the prior history of their source tables, which means that you cannot use Time Travel to see any past state after they have been cloned. Time Travel can be used to see the new history of tables that accrues after the cloning operation.

Cloning hybrid tables is a size-of-data operation, while cloning standard tables is a metadata-only operation. This difference has an impact on compute cost, storage cost, and performance.

The database clone operation itself incurs compute cost when the database contains hybrid tables.

When hybrid tables are cloned, the data is physically copied into the row store; therefore, the cloning operation can take a long time for large tables, and the cost scales linearly with the size of the data.

Cloning performance is similar to that of optimized direct bulk loading with CREATE TABLE AS SELECT. See Loading data.

The examples that follow highlight the main requirements for creating clones of databases that contain hybrid tables. For complete syntax information and usage notes, see AT | BEFORE and CREATE <object> … CLONE.

Example: CREATE DATABASE … CLONE
You can clone a database that contains hybrid tables by using a CREATE DATABASE … CLONE command. The command specifies the name of the existing source database and the name of a new destination database. The cloned database is created as of the AT TIMESTAMP value you specify, or as of now if you don’t specify a timestamp. The new database is a copy of the schemas and tables that existed in the source at that point in time (regardless of standard or hybrid table type).

The following example demonstrates the expected behavior when you clone a database that contains one or more hybrid tables. The first command shows the two tables that exist in the testdata schema of the testdb database. The ht1 table is a hybrid table, and the st1 table is a standard table.

SHOW TERSE TABLES;
+-------------------------------+------+-------+---------------+-------------+
| created_on                    | name | kind  | database_name | schema_name |
|-------------------------------+------+-------+---------------+-------------|
| 2024-11-14 15:59:32.683 -0800 | HT1  | TABLE | TESTDB        | TESTDATA    |
| 2024-11-14 16:00:01.360 -0800 | ST1  | TABLE | TESTDB        | TESTDATA    |
+-------------------------------+------+-------+---------------+-------------+
The following command clones this database, as of 16:01 on November 14, shortly after the tables were created:

CREATE OR REPLACE DATABASE clone_testdb
  CLONE testdb AT(TIMESTAMP => '2024-11-14 16:01:00'::TIMESTAMP_LTZ);
+---------------------------------------------+
| status                                      |
|---------------------------------------------|
| Database CLONE_TESTDB successfully created. |
+---------------------------------------------+
To see the cloned tables, use the testdata schema in the clone_testdb database:

USE DATABASE clone_testdb;
USE SCHEMA testdata;
Use a SHOW TABLES command to check that the tables were successfully cloned:

SHOW TERSE TABLES;
+-------------------------------+------+-------+---------------+-------------+
| created_on                    | name | kind  | database_name | schema_name |
|-------------------------------+------+-------+---------------+-------------|
| 2024-11-14 16:05:14.102 -0800 | HT1  | TABLE | CLONE_TESTDB  | TESTDATA    |
| 2024-11-14 16:05:14.102 -0800 | ST1  | TABLE | CLONE_TESTDB  | TESTDATA    |
+-------------------------------+------+-------+---------------+-------------+
Example: Create a clone that restores a dropped hybrid table
Using the same testdb database as the previous example, assume that a user creates and loads another hybrid table named ht2. However, a few minutes later, another user drops the ht2 table by mistake.

SHOW TERSE TABLES;
+-------------------------------+------+-------+---------------+-------------+
| created_on                    | name | kind  | database_name | schema_name |
|-------------------------------+------+-------+---------------+-------------|
| 2024-11-14 15:59:32.683 -0800 | HT1  | TABLE | TESTDB        | TESTDATA    |
| 2024-11-14 17:37:24.304 -0800 | HT2  | TABLE | TESTDB        | TESTDATA    |
| 2024-11-14 16:00:01.360 -0800 | ST1  | TABLE | TESTDB        | TESTDATA    |
+-------------------------------+------+-------+---------------+-------------+
DROP TABLE HT2;
+---------------------------+
| status                    |
|---------------------------|
| HT2 successfully dropped. |
+---------------------------+
SHOW TERSE TABLES;
+-------------------------------+------+-------+---------------+-------------+
| created_on                    | name | kind  | database_name | schema_name |
|-------------------------------+------+-------+---------------+-------------|
| 2024-11-14 15:59:32.683 -0800 | HT1  | TABLE | TESTDB        | TESTDATA    |
| 2024-11-14 16:00:01.360 -0800 | ST1  | TABLE | TESTDB        | TESTDATA    |
+-------------------------------+------+-------+---------------+-------------+
You can restore the database to its “healthy” state, when it contained three tables, by creating a clone of testdb (named restore_testdb in this case) with an appropriate timestamp. The timestamp specified here is very close to the point in time when the table was created (and before it was dropped). In practice, you would have to choose the timestamp carefully, based on when data was loaded into the table or other updates were applied. The main goal in this example is to capture the state of the table just before it was dropped.

CREATE OR REPLACE DATABASE restore_testdb
  CLONE testdb AT(TIMESTAMP => '2024-11-14 17:38'::TIMESTAMP_LTZ);
+-----------------------------------------------+
| status                                        |
|-----------------------------------------------|
| Database RESTORE_TESTDB successfully created. |
+-----------------------------------------------+
Now you can check the contents of the new clone and verify that table ht2 is there:

USE DATABASE restore_testdb;
USE SCHEMA testdata;
SHOW TERSE TABLES;
+-------------------------------+------+-------+----------------+-------------+
| created_on                    | name | kind  | database_name  | schema_name |
|-------------------------------+------+-------+----------------+-------------|
| 2024-11-14 17:47:58.984 -0800 | HT1  | TABLE | RESTORE_TESTDB | TESTDATA    |
| 2024-11-14 17:47:58.984 -0800 | HT2  | TABLE | RESTORE_TESTDB | TESTDATA    |
| 2024-11-14 17:47:58.984 -0800 | ST1  | TABLE | RESTORE_TESTDB | TESTDATA    |
+-------------------------------+------+-------+----------------+-------------+
Example: Restore a database to a point in time before an incorrect DML operation
A database named ht_sensors has a schema ht_schema that contains a table named sensor_data_device2. Assume that a series of DELETE operations were run on this table on November 25th. In Snowsight, in the navigation menu, select Monitoring » Query History to see information about these DELETE operations. (In this example, the SQL Text filter is set to DELETE to isolate them.)

Query History filtered by SQL Text to show a series of four DELETE operations.
If the second DELETE operation in the list was run by mistake (rows with motor_rpm values greater than 1504 were deleted), you can clone the database to restore it to its state directly before that operation was committed. (For the sake of simplicity in this example, let’s assume that no other changes, such as updates or inserts, were applied to that table or any other table in the database during this time frame.)

Before cloning the database, you can check Time Travel results with a simple query. In this way, you can verify that the clone captures the expected data before running the more costly restore operation.

For example, compare the results of the following two Time Travel queries, which are one minute apart:

SELECT COUNT(*) FROM sensor_data_service2
  AT(TIMESTAMP => 'Mon, 25 Nov 2024 14:09:00'::TIMESTAMP_LTZ) WHERE MOTOR_RPM>1504;
+----------+
| COUNT(*) |
|----------|
|     1855 |
+----------+
SELECT COUNT(*) FROM sensor_data_service2
  AT(TIMESTAMP => 'Mon, 25 Nov 2024 14:10:00'::TIMESTAMP_LTZ) WHERE MOTOR_RPM>1504;
+----------+
| COUNT(*) |
|----------|
|        0 |
+----------+
The results confirm the expected difference. Now you can clone the database, using the same timestamp as the first query:

USE DATABASE ht_sensors;
USE SCHEMA ht_schema;

CREATE OR REPLACE DATABASE restore_ht_sensors
  CLONE ht_sensors AT(TIMESTAMP => 'Mon, 25 Nov 2024 14:09:00'::TIMESTAMP_LTZ);
+---------------------------------------------------+
| status                                            |
|---------------------------------------------------|
| Database RESTORE_HT_SENSORS successfully created. |
+---------------------------------------------------+
Now check the state of the cloned database. Keep in mind that the cloned version of table sensor_data_device2 does not have any Time Travel data.

USE DATABASE restore_ht_sensors;
USE SCHEMA ht_schema;
SELECT COUNT(*) FROM SENSOR_DATA_DEVICE2 WHERE motor_rpm>1504;
+----------+
| COUNT(*) |
|----------|
|     1855 |
+----------+
The following Time Travel query against the new table fails as expected:

SELECT COUNT(*) FROM SENSOR_DATA_DEVICE2 AT(TIMESTAMP => 'Mon, 25 Nov 2024 14:09:00'::TIMESTAMP_LTZ) WHERE MOTOR_RPM>1504;
000707 (02000): Time travel data is not available for table SENSOR_DATA_DEVICE2. The requested time is either
beyond the allowed time travel period or before the object creation time.
Finally, note that the most recent DELETE operation in the query history might need to be reapplied because the cloned table retained the rows where the timestamp column was greater than 2024-04-03 07:30:00.000.Hybrid Tables Dedicated Storage Mode for TSS
Feature — Generally Available

Available to accounts in AWS and Microsoft Azure commercial regions only. For more information, see Clouds and regions.

This section explains how to start using Tri-Secret Secure (TSS) in accounts that contain hybrid tables.

Note

For information about billing and costs for this feature, consult your Snowflake account team.

Introduction
In a standard storage configuration for hybrid tables, underlying multi-tenant storage is used for all hybrid table data. This means that different databases and data that belongs to different customers use a shared storage layer. This shared storage configuration does not work if you have enabled or plan to enable TSS because TSS protects your data with encryption keys owned by individual customers. Enabling TSS encryption for hybrid tables requires a storage configuration known as Hybrid Tables Dedicated Storage Mode. You can also use periodic rekeying for additional encryption support, but periodic rekeying does not require this Dedicated Storage Mode.

When an account has both Dedicated Storage Mode and TSS enabled, all of the data that is stored in a hybrid table is protected with your TSS composite master key, which combines a Snowflake-maintained key with a customer-managed key. This protection covers hybrid table data in the underlying operational row store, the copy of the data in object storage, data retained for Time Travel, and metadata. You can use hybrid tables with the same serverless experience as you would with a standard storage configuration, and no additional management or provisioning is required.

Using Dedicated Storage Mode
You must enable Dedicated Storage Mode if you intend to create hybrid tables in your account and TSS is already enabled or will be enabled. Enabling Dedicated Storage Mode is a one-time action on the account. Before you take this action, you will not be able to create hybrid tables with TSS protection.

Note the following important considerations:

To ensure that your data is fully TSS-protected, you can’t enter a state where a TSS-enabled account contains hybrid tables that are stored in a standard multi-tenant storage configuration. Only one storage mode can be active at any given time.

Data that exists in hybrid tables before TSS is enabled can never be encrypted with TSS-compliant keys. TSS protection is guaranteed only for data written to hybrid tables after Dedicated Storage Mode and TSS are both enabled.

You can’t enable TSS if your account already contains hybrid tables. You have to drop individual hybrid tables or any databases that contain hybrid tables, then request enablement of Dedicated Storage Mode and TSS.

Note

To ensure that all hybrid table data is fully removed from your account, Snowflake recommends the following steps:

Set the data retention period to 0 for either individual hybrid tables or any databases that contain hybrid tables.

Drop either individual hybrid tables or any databases that contain hybrid tables.

For information about billing and costs for this feature, consult your Snowflake account team.

Enabling Dedicated Storage Mode and TSS
To enable Dedicated Storage Mode on an account, follow these steps:

Contact your account team and request enablement of Hybrid Tables Dedicated Storage Mode with TSS support on your account. Assuming that no hybrid tables exist in your account, the team will enable Dedicated Storage Mode (and enable TSS if it’s not already enabled).

Create and use hybrid tables in your account, following the standard documentation.

Repeat this process for any additional TSS-enabled Snowflake accounts in which you want to use hybrid tables.

Disabling Dedicated Storage Mode
To ensure that your data is fully TSS-protected, disabling Dedicated Storage Mode in a TSS-enabled account requires the following steps:

Set the data retention period to 0 for either individual hybrid tables or any databases that contain hybrid tables.

Drop either individual hybrid tables or any databases that contain hybrid tables. If you need to retain the data, you can copy it to standard tables in your account before dropping tables or databases.

Contact your account team and request that Dedicated Storage Mode be disabled on your account. The team will disable Dedicated Storage Mode, but if your account still contains hybrid tables, you will be asked to remove them first.Evaluate cost for hybrid tables
Feature — Generally Available

Available to accounts in AWS and Microsoft Azure commercial regions only. For more information, see Clouds and regions.

When using hybrid tables, your account is charged based on three modes of consumption.

Hybrid table storage: Cost for storage of hybrid tables depends on the amount of data that you are storing in hybrid tables. Storage cost is based on a flat monthly rate per gigabyte (GB). See Table 3(b) in the Snowflake Service Consumption Table, which covers unit pricing for hybrid table storage. Note that hybrid table storage is more expensive than traditional Snowflake storage.

Virtual warehouse compute: Queries against hybrid tables are executed through virtual warehouses. The consumption rate of a warehouse is the same for querying hybrid tables as it is for standard tables. See Virtual warehouse credit usage.

Hybrid table requests: Hybrid tables consume additional credits because they use serverless resources on the underlying row storage clusters. Consumption is measured based on the amount of data that is read from or written to these clusters. Credits are also consumed for compute resources used to perform background operations, such as compaction.

See Table 5 in the Snowflake Service Consumption Table, which covers serverless resource unit pricing for hybrid table requests. Because hybrid tables store data in pages, even small read or write operations incur a minimum 4 KB of hybrid table request usage. Snowflake may consolidate concurrent and batch write operations to optimize consumption for hybrid table requests.

Monitoring storage consumption for hybrid tables
You can view storage usage for hybrid tables and monitor consumption of hybrid table storage credits by querying the following views and functions:

STORAGE_USAGE view (STORAGE_BYTES and HYBRID_TABLE_STORAGE_BYTES columns).

DATABASE_STORAGE_USAGE_HISTORY (AVERAGE_HYBRID_TABLE_STORAGE_BYTES and AVERAGE_DATABASE_BYTES columns):

Account Usage DATABASE_STORAGE_USAGE_HISTORY view

Organization Usage DATABASE_STORAGE_USAGE_HISTORY view

Information Schema DATABASE_STORAGE_USAGE_HISTORY function

HYBRID_TABLES view (data per specific hybrid table in the BYTES column).

AGGREGATE_QUERY_HISTORY view: Monitor virtual warehouse compute resources used during specific queries that are executed against hybrid tables. See Monitor workloads.

HYBRID_TABLE_USAGE_HISTORY view: Monitor historical consumption of hybrid table request credits (serverless compute).

Hybrid table storage for Time Travel data
Consumption for hybrid table storage takes into account the data that is retained by Time Travel. Data retained by Time Travel is included in the following storage metrics:

STORAGE_BYTES column in the STORAGE_USAGE view

AVERAGE_DATABASE_BYTES column in DATABASE_STORAGE_USAGE_HISTORY:

Account Usage DATABASE_STORAGE_USAGE_HISTORY view

Organization Usage DATABASE_STORAGE_USAGE_HISTORY view

Information Schema DATABASE_STORAGE_USAGE_HISTORY function

Data retained by Time Travel is stored in object storage, not the row store, and is charged at the standard table rate, not the higher hybrid table rate.

Was this page helpful?

Yes
Limitations and unsupported features for hybrid tables
Feature — Generally Available

Available to accounts in AWS and Microsoft Azure commercial regions only. For more information, see Clouds and regions.

The following guidance on limitations and unsupported features applies to hybrid tables, and is subject to change.

Be sure to read both sections.

Note

Reach out to your account team if you have questions.

Limitations
Clouds and regions

Collations

Consistency

Constraints

COPY

Data size

Data types not supported in indexes

DML commands

Higher-order functions

Native applications

Optimized bulk loading

Persisted query results

Quotas and throttling

Secondary indexes

Throughput

Time Travel and cloning

Transactions

Transient schemas and databases

Tri-Secret Secure

Clouds and regions
Hybrid tables are generally available in all commercial Amazon Web Services (AWS) and Microsoft Azure regions.

Note the following restrictions:

Hybrid tables are not available in Google Cloud.

Hybrid tables are not available in U.S. SnowGov Regions.

Hybrid tables are not supported in trial accounts.

If you are a Virtual Private Snowflake (VPS) customer, contact Snowflake Support to inquire about enabling hybrid tables for your account.

Collations
Hybrid tables support collations only on character columns that are not indexed. PRIMARY KEY columns and other indexed columns don’t accept the COLLATE clause. If the DEFAULT_DDL_COLLATION parameter is set for hybrid tables in an account, database, or schema, the parameter is ignored for indexed columns.

For more information, see Collations on hybrid table columns and Collation control.

Consistency
By default, hybrid tables use a session-based consistency model where read operations in the session return the latest data from write operations in the same session. There might be some staleness (less than 100ms) for changes made outside of the session. To avoid staleness, set READ_LATEST_WRITES = true at the statement or session level. Note that this might incur some latency overhead of a few milliseconds.

Constraints
PRIMARY KEY, UNIQUE, and FOREIGN KEY constraints are enforced for hybrid tables, but some limitations apply. For information, see Constraints for hybrid tables.

COPY
When you load a hybrid table with the COPY INTO command, ABORT_STATEMENT is the only option that is supported for ON_ERROR. Setting ON_ERROR=SKIP_FILE returns an error. For more information, see Loading data.

Data size
You are limited to storing 2 TB of data in hybrid tables per Snowflake database. See Quotas and throttling for more information.

Data types not supported in indexes
Columns with geospatial data types (GEOGRAPHY and GEOMETRY), semi-structured data types (ARRAY, OBJECT, VARIANT), and vector data types (VECTOR) are not supported as either PRIMARY KEY columns (which are automatically indexed) or explicitly indexed columns. (Hybrid table columns support these data types as long as the columns are not indexed.)

The TIMESTAMP_TZ data type (or a TIMESTAMP data type that resolves to TIMESTAMP_TZ) is not supported for columns that are indexed using UNIQUE, PRIMARY KEY, and FOREIGN KEY constraints. However, TIMESTAMP_TZ is supported for secondary indexes.

See also Secondary indexes.

DML commands
When using DML commands to change a small number of rows, optimize performance by using INSERT, UPDATE, or DELETE statements instead of MERGE.

Higher-order functions
The FILTER, REDUCE, and TRANSFORM higher-order functions are not supported in queries against hybrid tables.

Native applications
You can include hybrid tables in a Snowflake Native App. However, hybrid tables cannot be shared from the provider to the consumer. Native Apps can create hybrid tables in the consumer account, and they can read from and write to those hybrid tables. You can also expose hybrid tables to application roles so that they can be queried directly by consumer users.

You cannot create a hybrid table in a provider account, nor can you include that hybrid table in a view that is shared through the Native App.

Optimized bulk loading
When a hybrid table is empty, CTAS, COPY, and INSERT INTO … SELECT all use optimized bulk loading. When hybrid tables are not empty, optimized bulk loading is not used. For more information, see Loading data.

Persisted query results
Queries against hybrid tables do not use the results cache, as defined with the USE_CACHED_RESULT parameter. See Using Persisted Query Results.

Quotas and throttling
Your usage of hybrid tables is restricted by quotas in order to ensure equitable availability of shared resources, ensure consistent quality of service, and reduce spikes in usage.

Quota

Default

Notes

Hybrid storage

2 TB per Snowflake database

This quota controls how much data you can store in hybrid tables. This limit applies only to active hybrid table data in the row store; it does not apply to object storage. If you exceed the storage quota, write operations that add data to any hybrid tables are temporarily blocked until you bring your hybrid storage consumption back under quota by removing tables or data.

You can reclaim space in a matter of seconds by dropping or truncating unneeded hybrid tables. However, when you delete data from tables, it takes some number of hours to recover space (because background compaction is required).

Hybrid table requests

Approximately 8,000 operations per second, per Snowflake database

This quota controls the rate at which you can read from and write to hybrid tables. You should be able to achieve up to 8,000 operations per second against hybrid tables for a balanced workload consisting of 80% point reads and 20% point writes. To monitor throttling, see the example in AGGREGATE_QUERY_HISTORY view.

Databases that contain hybrid tables

200 total per Snowflake account, and no more than 100 databases added within a one-hour window

This quota controls how many databases within your Snowflake account may contain hybrid tables. If you exceed this quota, you will be unable to create a hybrid table in a new database without dropping all hybrid tables from an existing database. If necessary, you can request help from Snowflake Support to increase the quota.

Throttling can be caused by a combination of factors that result in too many read and write requests being sent to the hybrid table storage provider:

Too many read requests can occur because of poorly optimized queries or because of a large, aggressive workload with very high query concurrency.

Too many write requests can occur because the bulk-load path wasn’t chosen when a table was loaded or because the workload consists of too many concurrent write operations.

If you receive an error or throttling occurs because of a quota limit, contact your system administrator or DBA to look into the overall Unistore workload; possibly it can be modified to avoid exceeding the quota. DBAs can contact Snowflake Support to evaluate query performance and quota usage. For some workloads, you might need to initiate a quota increase by requesting help from the support team.

Secondary indexes
The following secondary index features are not supported:

Adding a column to an existing index.

Altering an index on an existing hybrid table.

Changes can be applied by dropping and re-creating the index.

To use a secondary index on a hybrid table, you must use a role that is granted the SELECT privilege on the table. If you only have access to objects other than the hybrid table itself, you will not be able to use secondary indexes.

TIMESTAMP_NTZ is a supported column type for secondary indexes; however, TIMESTAMP_TZ is not supported. DATETIME is an alias for TIMESTAMP_NTZ and is therefore supported. TIMESTAMP is supported when configured as an alias for TIMESTAMP_NTZ.

For more information about secondary indexes, see Add secondary indexes.

Throughput
You can execute up to approximately 8,000 operations per second against hybrid tables in each database in your account for a balanced 80%/20% read/write workload. If you exceed this limit, Snowflake might reduce your throughput. See Quotas and throttling for more information.

Time Travel and cloning
Time Travel queries that select from hybrid tables are supported with the following limitations:

Only the TIMESTAMP parameter is supported in the AT clause.

The value of the TIMESTAMP parameter must be the same for all tables that belong to the same database.

If the tables belong to different databases, you can use different TIMESTAMP values.

The OFFSET, STATEMENT, and STREAM parameters are not supported.

The BEFORE clause is not supported.

The UNDROP TABLE command, which depends on Time Travel, is not supported.

For information about cloning support for hybrid tables, see Clone databases that contain hybrid tables.

Transactions
For hybrid tables, the transaction scope is the database in which the hybrid table resides. All the hybrid tables referenced in a transaction must reside in the same database; standard Snowflake tables referenced in the same transaction may reside in different databases.

Transient schemas and databases
You cannot create hybrid tables that are temporary or transient. In turn, you cannot create hybrid tables within transient schemas or databases.

Tri-Secret Secure
You can use hybrid tables in a TSS-enabled account by enabling Dedicated Storage Mode. For information, see Hybrid Tables Dedicated Storage Mode for TSS.

Unsupported features
At this time, hybrid tables do not support:

Clustering keys

Data in hybrid tables is ordered by the primary key.

Data sharing

Dynamic tables

Fail-safe

Materialized views

Query Acceleration Service

Replication

Search Optimization Service

Snowpipe

Snowpipe Streaming API

Streams

UNDROP

UNDROP SCHEMA and UNDROP DATABASE commands succeed for entities that contain hybrid tables, but those hybrid tables and their associated constraints and indexes cannot be restored.

The DELETED column in TABLES view displays the time of deletion as the UNDROP time of the parent entity.

The ACCESS_HISTORY view contains an entry for DROP/UNDROP of the parent entity, but no entries for hybrid tables.