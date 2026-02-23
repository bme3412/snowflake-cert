Micro-partitions & Data Clustering
Traditional data warehouses rely on static partitioning of large tables to achieve acceptable performance and enable better scaling. In these systems, a partition is a unit of management that is manipulated independently using specialized DDL and syntax; however, static partitioning has a number of well-known limitations, such as maintenance overhead and data skew, which can result in disproportionately-sized partitions.

In contrast to a data warehouse, the Snowflake Data Platform implements a powerful and unique form of partitioning, called micro-partitioning, that delivers all the advantages of static partitioning without the known limitations, as well as providing additional significant benefits.

Attention

Hybrid tables are based on an architecture that does not support some of the features that are available in standard Snowflake tables, such as clustering keys.

What are Micro-partitions?
All data in Snowflake tables is automatically divided into micro-partitions, which are contiguous units of storage. Each micro-partition contains between 50 MB and 500 MB of uncompressed data (note that the actual size in Snowflake is smaller because data is always stored compressed). Groups of rows in tables are mapped into individual micro-partitions, organized in a columnar fashion. This size and structure allows for extremely granular pruning of very large tables, which can be comprised of millions, or even hundreds of millions, of micro-partitions.

Snowflake stores metadata about all rows stored in a micro-partition, including:

The range of values for each of the columns in the micro-partition.

The number of distinct values.

Additional properties used for both optimization and efficient query processing.

Note

Micro-partitioning is automatically performed on all Snowflake tables. Tables are transparently partitioned using the ordering of the data as it is inserted/loaded.

Benefits of Micro-partitioning
The benefits of Snowflake’s approach to partitioning table data include:

In contrast to traditional static partitioning, Snowflake micro-partitions are derived automatically; they don’t need to be explicitly defined up-front or maintained by users.

As the name suggests, micro-partitions are small in size (50 to 500 MB, before compression), which enables extremely efficient DML and fine-grained pruning for faster queries.

Micro-partitions can overlap in their range of values, which, combined with their uniformly small size, helps prevent skew.

Columns are stored independently within micro-partitions, often referred to as columnar storage. This enables efficient scanning of individual columns; only the columns referenced by a query are scanned.

Columns are also compressed individually within micro-partitions. Snowflake automatically determines the most efficient compression algorithm for the columns in each micro-partition.

You can enable clustering on specific tables by specifying a clustering key for each of those tables. For information about specifying a clustering key, see:

CREATE TABLE

ALTER TABLE

For additional information about clustering, including strategies for choosing which tables to cluster, see:

Automatic Clustering

Impact of Micro-partitions
DML
All DML operations (e.g. DELETE, UPDATE, MERGE) take advantage of the underlying micro-partition metadata to facilitate and simplify table maintenance. For example, some operations, such as deleting all rows from a table, are metadata-only operations.

Dropping a Column in a Table
When a column in a table is dropped, the micro-partitions that contain the data for the dropped column are not re-written when the drop statement is executed. The data in the dropped column remains in storage. For more information, see the usage notes for ALTER TABLE.

Query Pruning
The micro-partition metadata maintained by Snowflake enables precise pruning of columns in micro-partitions at query run-time, including columns containing semi-structured data. In other words, a query that specifies a filter predicate on a range of values that accesses 10% of the values in the range should ideally only scan 10% of the micro-partitions.

For example, assume a large table contains one year of historical data with date and hour columns. Assuming uniform distribution of the data, a query targeting a particular hour would ideally scan 1/8760th of the micro-partitions in the table and then only scan the portion of the micro-partitions that contain the data for the hour column; Snowflake uses columnar scanning of partitions so that an entire partition is not scanned if a query only filters by one column.

In other words, the closer the ratio of scanned micro-partitions and columnar data is to the ratio of actual data selected, the more efficient is the pruning performed on the table.

For time-series data, this level of pruning enables potentially sub-second response times for queries within ranges (i.e. “slices”) as fine-grained as one hour or even less.

Not all predicate expressions can be used to prune. For example, Snowflake does not prune micro-partitions based on a predicate with a subquery, even if the subquery results in a constant.

What is Data Clustering?
Typically, data stored in tables is sorted/ordered along natural dimensions (e.g. date and/or geographic regions). This “clustering” is a key factor in queries because table data that is not sorted or is only partially sorted may impact query performance, particularly on very large tables.

In Snowflake, as data is inserted/loaded into a table, clustering metadata is collected and recorded for each micro-partition created during the process. Snowflake then leverages this clustering information to avoid unnecessary scanning of micro-partitions during querying, significantly accelerating the performance of queries that reference these columns.

The following diagram illustrates a Snowflake table, t1, with four columns sorted by date:

Logical and physical table structures with natural sorting
The table consists of 24 rows stored across 4 micro-partitions, with the rows divided equally between each micro-partition. Within each micro-partition, the data is sorted and stored by column, which enables Snowflake to perform the following actions for queries on the table:

First, prune micro-partitions that are not needed for the query.

Then, prune by column within the remaining micro-partitions.

Note that this diagram is intended only as a small-scale conceptual representation of the data clustering that Snowflake utilizes in micro-partitions. A typical Snowflake table may consist of thousands, even millions, of micro-partitions.

Clustering Information Maintained for Micro-partitions
Snowflake maintains clustering metadata for the micro-partitions in a table, including:

The total number of micro-partitions that comprise the table.

The number of micro-partitions containing values that overlap with each other (in a specified subset of table columns).

The depth of the overlapping micro-partitions.

Clustering Depth
The clustering depth for a populated table measures the average depth (1 or greater) of the overlapping micro-partitions for specified columns in a table. The smaller the average depth, the better clustered the table is with regards to the specified columns.

Clustering depth can be used for a variety of purposes, including:

Monitoring the clustering “health” of a large table, particularly over time as DML is performed on the table.

Determining whether a large table would benefit from explicitly defining a clustering key.

A table with no micro-partitions (i.e. an unpopulated/empty table) has a clustering depth of 0.

Note

The clustering depth for a table is not an absolute or precise measure of whether the table is well-clustered. Ultimately, query performance is the best indicator of how well-clustered a table is:

If queries on a table are performing as needed or expected, the table is likely well-clustered.

If query performance degrades over time, the table is likely no longer well-clustered and may benefit from clustering.

Clustering Depth Illustrated
The following diagram provides a conceptual example of a table consisting of five micro-partitions with values ranging from A to Z, and illustrates how overlap affects clustering depth:

Example of clustering depth
As this diagram illustrates:

At the beginning, the range of values in all the micro-partitions overlap.

As the number of overlapping micro-partitions decreases, the overlap depth decreases.

When there is no overlap in the range of values across all micro-partitions, the micro-partitions are considered to be in a constant state (i.e. they cannot be improved by clustering).

The diagram is not intended to represent an actual table. In an actual table, with data contained in a large numbers of micro-partitions, reaching a constant state across all micro-partitions is neither likely nor required to improve query performance.

Monitoring Clustering Information for Tables
To view/monitor the clustering metadata for a table, Snowflake provides the following system functions:

SYSTEM$CLUSTERING_DEPTH

SYSTEM$CLUSTERING_INFORMATION (including clustering depth)

For more details about how these functions use clustering metadata, see Clustering Depth Illustrated (in this topic).

Was this page helpful?

Yes
Clustering Keys & Clustered Tables
In general, Snowflake produces well-clustered data in tables; however, over time, particularly as DML occurs on very large tables (as defined by the amount of data in the table, not the number of rows), the data in some table rows might no longer cluster optimally on desired dimensions.

To improve the clustering of the underlying table micro-partitions, you can always manually sort rows on key table columns and re-insert them into the table; however, performing these tasks could be cumbersome and expensive.

Instead, Snowflake supports automating these tasks by designating one or more table columns/expressions as a clustering key for the table. A table with a clustering key defined is considered to be clustered.

You can cluster materialized views, as well as tables. The rules for clustering tables and materialized views are generally the same. For a few additional tips specific to materialized views, see Materialized Views and Clustering and Best Practices for Materialized Views.

Attention

Clustering keys are not intended for all tables due to the costs of initially clustering the data and maintaining the clustering. Clustering is optimal when either:

You require the fastest possible response times, regardless of cost.

Your improved query performance offsets the credits required to cluster and maintain the table.

For more information about choosing which tables to cluster, see: Considerations for Choosing Clustering for a Table.

What is a Clustering Key?
A clustering key is a subset of columns in a table (or expressions on a table) that are explicitly designated to co-locate the data in the table in the same micro-partitions. This is useful for very large tables where the ordering was not ideal (at the time the data was inserted/loaded) or extensive DML has caused the table’s natural clustering to degrade.

Some general indicators that can help determine whether to define a clustering key for a table include:

Queries on the table are running slower than expected or have noticeably degraded over time.

The clustering depth for the table is large.

A clustering key can be defined at table creation (using the CREATE TABLE command) or afterward (using the ALTER TABLE command). The clustering key for a table can also be altered or dropped at any time.

Attention

Clustering keys cannot be defined for hybrid tables. In hybrid tables, data is always ordered by primary key.

Benefits of Defining Clustering Keys (for Very Large Tables)
Using a clustering key to co-locate similar rows in the same micro-partitions enables several benefits for very large tables, including:

Improved scan efficiency in queries by skipping data that does not match filtering predicates.

Better column compression than in tables with no clustering. This is especially true when other columns are strongly correlated with the columns that comprise the clustering key.

After a key has been defined on a table, no additional administration is required, unless you chose to drop or modify the key. All future maintenance on the rows in the table (to ensure optimal clustering) is performed automatically by Snowflake.

Although clustering can substantially improve the performance and reduce the cost of some queries, the compute resources used to perform clustering consume credits. As such, you should cluster only when queries will benefit substantially from the clustering.

Typically, queries benefit from clustering when the queries filter or sort on the clustering key for the table. Sorting is commonly done for ORDER BY operations, for GROUP BY operations, and for some joins. For example, the following join would likely cause Snowflake to perform a sort operation:

SELECT ...
    FROM my_table INNER JOIN my_materialized_view
        ON my_materialized_view.col1 = my_table.col1
    ...
In this pseudo-example, Snowflake is likely to sort the values in either my_materialized_view.col1 or my_table.col1. For example, if the values in my_table.col1 are sorted, then as the materialized view is being scanned, Snowflake can quickly find the corresponding row in my_table.

The more frequently a table is queried, the more benefit clustering provides. However, the more frequently a table changes, the more expensive it will be to keep it clustered. Therefore, clustering is generally most cost-effective for tables that are queried frequently and do not change frequently.

Note

After you define a clustering key for a table, the rows are not necessarily updated immediately. Snowflake only performs automated maintenance if the table will benefit from the operation. For more details, see Reclustering (in this topic) and Automatic Clustering.

Considerations for Choosing Clustering for a Table
Whether you want faster response times or lower overall costs, clustering is best for a table that meets all of the following criteria:

The table contains a large number of micro-partitions. Typically, this means that the table contains multiple terabytes (TB) of data.

The queries can take advantage of clustering. Typically, this means that one or both of the following are true:

The queries are selective. In other words, the queries need to read only a small percentage of rows (and thus usually a small percentage of micro-partitions) in the table.

The queries sort the data. (For example, the query contains an ORDER BY clause on the table.)

A high percentage of the queries can benefit from the same clustering key(s). In other words, many/most queries select on, or sort on, the same few column(s).

If your goal is primarily to reduce overall costs, then each clustered table should have a high ratio of queries to DML operations (INSERT/UPDATE/DELETE). This typically means that the table is queried frequently and updated infrequently. If you want to cluster a table that experiences a lot of DML, then consider grouping DML statements in large, infrequent batches.

Also, before choosing to cluster a table, Snowflake strongly recommends that you test a representative set of queries on the table to establish some performance baselines.

Strategies for Selecting Clustering Keys
A single clustering key can contain one or more columns or expressions. For most tables, Snowflake recommends a maximum of 3 or 4 columns (or expressions) per key. Adding more than 3-4 columns tends to increase costs more than benefits.

Selecting the right columns/expressions for a clustering key can dramatically impact query performance. Analysis of your workload will usually yield good clustering key candidates.

Snowflake recommends prioritizing keys in the order below:

Cluster columns that are most actively used in selective filters. For many fact tables involved in date-based queries (for example “WHERE invoice_date > x AND invoice date <= y”), choosing the date column is a good idea. For event tables, event type might be a good choice, if there are a large number of different event types. (If your table has only a small number of different event types, then see the comments on cardinality below before choosing an event column as a clustering key.)

If there is room for additional cluster keys, then consider columns frequently used in join predicates, for example “FROM table1 JOIN table2 ON table2.column_A = table1.column_B”.

If you typically filter queries by two dimensions (e.g. application_id and user_status columns), then clustering on both columns can improve performance.

The number of distinct values (i.e. cardinality) in a column/expression is a critical aspect of selecting it as a clustering key. It is important to choose a clustering key that has:

A large enough number of distinct values to enable effective pruning on the table.

A small enough number of distinct values to allow Snowflake to effectively group rows in the same micro-partitions.

A column with very low cardinality might yield only minimal pruning, such as a column named IS_NEW_CUSTOMER that contains only Boolean values. At the other extreme, a column with very high cardinality is also typically not a good candidate to use as a clustering key directly. For example, a column that contains nanosecond timestamp values would not make a good clustering key.

Tip

In general, if a column (or expression) has higher cardinality, then maintaining clustering on that column is more expensive.

The cost of clustering on a unique key might be more than the benefit of clustering on that key, especially if point lookups are not the primary use case for that table.

If you want to use a column with very high cardinality as a clustering key, Snowflake recommends defining the key as an expression on the column, rather than on the column directly, to reduce the number of distinct values. The expression should preserve the original ordering of the column so that the minimum and maximum values in each partition still enable pruning.

For example, if a fact table has a TIMESTAMP column c_timestamp containing many discrete values (many more than the number of micro-partitions in the table), then a clustering key could be defined on the column by casting the values to dates instead of timestamps (e.g. to_date(c_timestamp)). This would reduce the cardinality to the total number of days, which typically produces much better pruning results.

As another example, you can truncate a number to fewer significant digits by using the TRUNC functions and a negative value for the scale (e.g. TRUNC(123456789, -5)).

Tip

If you are defining a multi-column clustering key for a table, the order in which the columns are specified in the CLUSTER BY clause is important. As a general rule, Snowflake recommends ordering the columns from lowest cardinality to highest cardinality. Putting a higher cardinality column before a lower cardinality column will generally reduce the effectiveness of clustering on the latter column.

Tip

When clustering on a text field, the cluster key metadata tracks only the first several bytes (typically 5 or 6 bytes). Note that for multi-byte character sets, this can be fewer than 5 characters.

In some cases, clustering on columns used in GROUP BY or ORDER BY clauses can be helpful. However, clustering on these columns is usually less helpful than clustering on columns that are heavily used in filter or JOIN operations. If you have some columns that are heavily used in filter/join operations and different columns that are used in ORDER BY or GROUP BY operations, then favor the columns used in the filter and join operations.

Reclustering
As DML operations (INSERT, UPDATE, DELETE, MERGE, COPY) are performed on a clustered table, the data in the table might become less clustered. Periodic/regular reclustering of the table is required to maintain optimal clustering.

During reclustering, Snowflake uses the clustering key for a clustered table to reorganize the column data, so that related records are relocated to the same micro-partition. This DML operation deletes the affected records and re-inserts them, grouped according to the clustering key.

Note

Reclustering in Snowflake is automatic; no maintenance is needed. For more details, see Automatic Clustering.

However, for certain accounts, manual reclustering has been deprecated, but is still allowed. For more details see Manual Reclustering.

Credit and Storage Impact of Reclustering
Similar to all DML operations in Snowflake, reclustering consumes credits. The number of credits consumed depends on the size of the table and the amount of data that needs to be reclustered.

Reclustering also results in storage costs. Each time data is reclustered, the rows are physically grouped based on the clustering key for the table, which results in Snowflake generating new micro-partitions for the table. Adding even a small number of rows to a table can cause all micro-partitions that contain those values to be recreated.

This process can create significant data turnover because the original micro-partitions are marked as deleted, but retained in the system to enable Time Travel and Fail-safe. The original micro-partitions are purged only after both the Time Travel retention period and the subsequent Fail-safe period have passed (i.e. minimum of 8 days and up to 97 days for extended Time Travel, if you are using Snowflake Enterprise Edition (or higher)). This typically results in increased storage costs. For more information, see Snowflake Time Travel & Fail-safe.

Important

Before defining a clustering key for a table, you should consider the associated credit and storage costs.

Reclustering Example
Building on the clustering diagram from the previous topic, this diagram illustrates how reclustering a table can help reduce scanning of micro-partitions to improve query performance:

Logical table structures after reclustering
To start, table t1 is naturally clustered by date across micro-partitions 1-4.

The query (in the diagram) requires scanning micro-partitions 1, 2, and 3.

date and type are defined as the clustering key. When the table is reclustered, new micro-partitions (5-8) are created.

After reclustering, the same query only scans micro-partition 5.

In addition, after reclustering:

Micro-partition 5 has reached a constant state (i.e. it cannot be improved by reclustering) and is therefore excluded when computing depth and overlap for future maintenance. In a well-clustered large table, most micro-partitions will fall into this category.

The original micro-partitions (1-4) are marked as deleted, but are not purged from the system; they are retained for Time Travel and Fail-safe.

Note

This example illustrates the impact of reclustering on an extremely small scale. Extrapolated to a very large table (i.e. consisting of millions of micro-partitions or more), reclustering can have a significant impact on scanning and, therefore, query performance.

Defining Clustered Tables
Calculating the Clustering Information for a Table
Use the system function, SYSTEM$CLUSTERING_INFORMATION, to calculate clustering details, including clustering depth, for a given table. This function can be run on any columns on any table, regardless of whether the table has an explicit clustering key:

If a table has an explicit clustering key, the function doesn’t require any input arguments other than the name of the table.

If a table doesn’t have an explicit clustering key (or a table has a clustering key, but you want to calculate the ratio on other columns in the table), the function takes the desired column(s) as an additional input argument.

Defining a Clustering Key for a Table
A clustering key can be defined when a table is created by appending a CLUSTER BY clause to CREATE TABLE:

CREATE TABLE <name> ... CLUSTER BY ( <expr1> [ , <expr2> ... ] )
Where each clustering key consists of one or more table columns/expressions, which can be of any data type, except GEOGRAPHY, VARIANT, OBJECT, or ARRAY. A clustering key can contain any of the following:

Base columns.

Expressions on base columns.

Expressions on paths in VARIANT columns.

For example:

-- cluster by base columns
CREATE OR REPLACE TABLE t1 (c1 DATE, c2 STRING, c3 NUMBER) CLUSTER BY (c1, c2);

SHOW TABLES LIKE 't1';

+-------------------------------+------+---------------+-------------+-------+---------+----------------+------+-------+----------+----------------+----------------------+
| created_on                    | name | database_name | schema_name | kind  | comment | cluster_by     | rows | bytes | owner    | retention_time | automatic_clustering |
|-------------------------------+------+---------------+-------------+-------+---------+----------------+------+-------+----------+----------------+----------------------|
| 2019-06-20 12:06:07.517 -0700 | T1   | TESTDB        | PUBLIC      | TABLE |         | LINEAR(C1, C2) |    0 |     0 | SYSADMIN | 1              | ON                   |
+-------------------------------+------+---------------+-------------+-------+---------+----------------+------+-------+----------+----------------+----------------------+

-- cluster by expressions
CREATE OR REPLACE TABLE t2 (c1 timestamp, c2 STRING, c3 NUMBER) CLUSTER BY (TO_DATE(C1), substring(c2, 0, 10));

SHOW TABLES LIKE 't2';

+-------------------------------+------+---------------+-------------+-------+---------+------------------------------------------------+------+-------+----------+----------------+----------------------+
| created_on                    | name | database_name | schema_name | kind  | comment | cluster_by                                     | rows | bytes | owner    | retention_time | automatic_clustering |
|-------------------------------+------+---------------+-------------+-------+---------+------------------------------------------------+------+-------+----------+----------------+----------------------|
| 2019-06-20 12:07:51.307 -0700 | T2   | TESTDB        | PUBLIC      | TABLE |         | LINEAR(CAST(C1 AS DATE), SUBSTRING(C2, 0, 10)) |    0 |     0 | SYSADMIN | 1              | ON                   |
+-------------------------------+------+---------------+-------------+-------+---------+------------------------------------------------+------+-------+----------+----------------+----------------------+

-- cluster by paths in variant columns
CREATE OR REPLACE TABLE T3 (t timestamp, v variant) cluster by (v:"Data":id::number);

SHOW TABLES LIKE 'T3';

+-------------------------------+------+---------------+-------------+-------+---------+-------------------------------------------+------+-------+----------+----------------+----------------------+
| created_on                    | name | database_name | schema_name | kind  | comment | cluster_by                                | rows | bytes | owner    | retention_time | automatic_clustering |
|-------------------------------+------+---------------+-------------+-------+---------+-------------------------------------------+------+-------+----------+----------------+----------------------|
| 2019-06-20 16:30:11.330 -0700 | T3   | TESTDB        | PUBLIC      | TABLE |         | LINEAR(TO_NUMBER(GET_PATH(V, 'Data.id'))) |    0 |     0 | SYSADMIN | 1              | ON                   |
+-------------------------------+------+---------------+-------------+-------+---------+-------------------------------------------+------+-------+----------+----------------+----------------------+
Important Usage Notes
For each VARCHAR column, the current implementation of clustering uses only the first 5 bytes.

If the first N characters are the same for every row, or do not provide sufficient cardinality, then consider clustering on a substring that starts after the characters that are identical, and that has optimal cardinality. (For more information about optimal cardinality, see Strategies for Selecting Clustering Keys.) For example:

create or replace table t3 (vc varchar) cluster by (SUBSTRING(vc, 5, 5));
If you define two or more columns/expressions as the clustering key for a table, the order has an impact on how the data is clustered in micro-partitions.

For more details, see Strategies for Selecting Clustering Keys (in this topic).

An existing clustering key is copied when a table is created using CREATE TABLE … CLONE. However, Automatic Clustering is suspended for the cloned table and must be resumed.

An existing clustering key is not supported when a table is created using CREATE TABLE … AS SELECT; however, you can define a clustering key after the table is created.

Defining a clustering key directly on top of VARIANT columns is not supported; however, you can specify a VARIANT column in a clustering key if you provide an expression consisting of the path and the target type.

Changing the Clustering Key for a Table
At any time, you can add a clustering key to an existing table or change the existing clustering key for a table using ALTER TABLE:

ALTER TABLE <name> CLUSTER BY ( <expr1> [ , <expr2> ... ] )
For example:

-- cluster by base columns
ALTER TABLE t1 CLUSTER BY (c1, c3);

SHOW TABLES LIKE 't1';

+-------------------------------+------+---------------+-------------+-------+---------+----------------+------+-------+----------+----------------+----------------------+
| created_on                    | name | database_name | schema_name | kind  | comment | cluster_by     | rows | bytes | owner    | retention_time | automatic_clustering |
|-------------------------------+------+---------------+-------------+-------+---------+----------------+------+-------+----------+----------------+----------------------|
| 2019-06-20 12:06:07.517 -0700 | T1   | TESTDB        | PUBLIC      | TABLE |         | LINEAR(C1, C3) |    0 |     0 | SYSADMIN | 1              | ON                   |
+-------------------------------+------+---------------+-------------+-------+---------+----------------+------+-------+----------+----------------+----------------------+

-- cluster by expressions
ALTER TABLE T2 CLUSTER BY (SUBSTRING(C2, 5, 15), TO_DATE(C1));

SHOW TABLES LIKE 't2';

+-------------------------------+------+---------------+-------------+-------+---------+------------------------------------------------+------+-------+----------+----------------+----------------------+
| created_on                    | name | database_name | schema_name | kind  | comment | cluster_by                                     | rows | bytes | owner    | retention_time | automatic_clustering |
|-------------------------------+------+---------------+-------------+-------+---------+------------------------------------------------+------+-------+----------+----------------+----------------------|
| 2019-06-20 12:07:51.307 -0700 | T2   | TESTDB        | PUBLIC      | TABLE |         | LINEAR(SUBSTRING(C2, 5, 15), CAST(C1 AS DATE)) |    0 |     0 | SYSADMIN | 1              | ON                   |
+-------------------------------+------+---------------+-------------+-------+---------+------------------------------------------------+------+-------+----------+----------------+----------------------+

-- cluster by paths in variant columns
ALTER TABLE T3 CLUSTER BY (v:"Data":name::string, v:"Data":id::number);

SHOW TABLES LIKE 'T3';

+-------------------------------+------+---------------+-------------+-------+---------+------------------------------------------------------------------------------+------+-------+----------+----------------+----------------------+
| created_on                    | name | database_name | schema_name | kind  | comment | cluster_by                                                                   | rows | bytes | owner    | retention_time | automatic_clustering |
|-------------------------------+------+---------------+-------------+-------+---------+------------------------------------------------------------------------------+------+-------+----------+----------------+----------------------|
| 2019-06-20 16:30:11.330 -0700 | T3   | TESTDB        | PUBLIC      | TABLE |         | LINEAR(TO_CHAR(GET_PATH(V, 'Data.name')), TO_NUMBER(GET_PATH(V, 'Data.id'))) |    0 |     0 | SYSADMIN | 1              | ON                   |
+-------------------------------+------+---------------+-------------+-------+---------+------------------------------------------------------------------------------+------+-------+----------+----------------+----------------------+
Important Usage Notes
When adding a clustering key to a table already populated with data, not all expressions are allowed to be specified in the key. You can check whether a specific function is supported using SHOW FUNCTIONS:

show functions like 'function_name';

The output includes a column, valid_for_clustering, at the end of the output. This column displays whether the function can be used in a clustering key for a populated table.

Changing the clustering key for a table does not affect existing records in the table until the table has been reclustered by Snowflake.

Dropping the Clustering Keys for a Table
At any time, you can drop the clustering key for a table using ALTER TABLE:

ALTER TABLE <name> DROP CLUSTERING KEY
For example:

ALTER TABLE t1 DROP CLUSTERING KEY;

SHOW TABLES LIKE 't1';

+-------------------------------+------+---------------+-------------+-------+---------+------------+------+-------+----------+----------------+----------------------+
| created_on                    | name | database_name | schema_name | kind  | comment | cluster_by | rows | bytes | owner    | retention_time | automatic_clustering |
|-------------------------------+------+---------------+-------------+-------+---------+------------+------+-------+----------+----------------+----------------------|
| 2019-06-20 12:06:07.517 -0700 | T1   | TESTDB        | PUBLIC      | TABLE |         |            |    0 |     0 | SYSADMIN | 1              | OFF                  |
+-------------------------------+------+---------------+-------------+-------+---------+------------+------+-------+----------+----------------+----------------------+
Automatic Clustering
Automatic Clustering is the Snowflake service that seamlessly and continually manages all reclustering, as needed, of clustered tables.

Note that, after a clustered table is defined, reclustering does not necessarily start immediately. Snowflake only reclusters a clustered table if it will benefit from the operation.

Note

If manual reclustering is still available in your account, Automatic Clustering might not be enabled yet for your account. For more details, see Manual Reclustering — Deprecated.

Benefits of Automatic Clustering
Ease-of-maintenance
Automatic Clustering eliminates the need for performing any of the following tasks:

Monitoring the state of clustered tables.

Instead, as DML is performed on these tables, Snowflake monitors and evaluates the tables to determine whether they would benefit from reclustering, and automatically reclusters them, as needed.

Designating warehouses in your account to use for reclustering.

Snowflake performs automatic reclustering in the background, and you do not need to specify a warehouse to use.

All you need to do is define a clustering key for each table (if appropriate) and Snowflake manages all future maintenance.

Full control
You can suspend and resume Automatic Clustering for a clustered table at any time using ALTER TABLE … SUSPEND / RESUME RECLUSTER. While Automatic Clustering is suspended for a table, the table is never automatically reclustered, regardless of its clustering state and, therefore, does not incur any related credit charges.

You can also drop the clustering key on a clustered table at any time, which prevents all future reclustering on the table.

Non-blocking DML
Automatic Clustering is transparent and does not block DML statements issued against tables while they are being reclustered.

Optimal efficiency
With Automatic Clustering, Snowflake internally manages the state of clustered tables, as well as the resources (servers, memory, etc.) used for all automated clustering operations. This allows Snowflake to dynamically allocate resources as needed, resulting in the most efficient and effective reclustering.

Also, Automatic Clustering does not perform any unnecessary reclustering. Reclustering is triggered only if/when the table would benefit from the operation.

Enabling Automatic Clustering for a table
In most cases, no tasks are required to enable Automatic Clustering for a table. You simply define a clustering key for the table.

However, the rule does not apply to tables created by cloning (CREATE TABLE … CLONE …) from a source table that has clustering keys. The new table starts with Automatic Clustering suspended – even if Automatic Clustering for the source table is not suspended. (This is true whether the CLONE command cloned the table, the schema containing the table, or the database containing the table.)

Tip

Before you define a clustering key for a table, consider the following conditions, which may cause reclustering activity (and corresponding credit charges):

The table is not optimally-clustered. For more details, see Micro-partitions & Data Clustering.

The clustering key on the table has changed.

As such, we recommend starting with one or two selected tables and assessing the impact of Automatic Clustering on these tables. Once you are comfortable/familiar with how Automatic Clustering performs reclustering, you can then define clustering keys for your other tables.

For information about choosing optimal clustering keys, see Strategies for Selecting Clustering Keys.

To add clustering to a table, you must also have USAGE or OWNERSHIP privileges on the schema and database that contain the table.

Viewing the Automatic Clustering status for a table
You can use SQL to view whether Automatic Clustering is enabled for a table:

SHOW TABLES command.

TABLES view (in the Snowflake Information Schema).

TABLES view (in the Account Usage shared database).

The AUTO_CLUSTERING_ON column in the output displays the Automatic Clustering status for each table, which can be used to determine whether to suspend or resume Automatic Clustering for a given table.

In addition, the CLUSTER_BY column (SHOW TABLES) or CLUSTERING_KEY column (TABLES view) displays the column(s) defined as the clustering key(s) for each table.

Suspending Automatic Clustering for a table
To suspend Automatic Clustering for a table, use the ALTER TABLE command with a SUSPEND RECLUSTER clause. For example:

ALTER TABLE t1 SUSPEND RECLUSTER;

SHOW TABLES LIKE 't1';

+---------------------------------+------+---------------+-------------+-------+---------+------------+------+-------+----------+----------------+----------------------+
|           created_on            | name | database_name | schema_name | kind  | comment | cluster_by | rows | bytes |  owner   | retention_time | automatic_clustering |
+---------------------------------+------+---------------+-------------+-------+---------+------------+------+-------+----------+----------------+----------------------+
| Thu, 12 Apr 2018 13:29:01 -0700 | T1   | TESTDB        | MY_SCHEMA   | TABLE |         | LINEAR(C1) | 0    | 0     | SYSADMIN | 1              | OFF                  |
+---------------------------------+------+---------------+-------------+-------+---------+------------+------+-------+----------+----------------+----------------------+
Note

Changing the clustering key of a table resumes automatic clustering, which can result in credit consumption by serverless resources. Including the word LINEAR in the ALTER TABLE … CLUSTER BY statement is considered a change to the clustering key even if the column doesn’t change.

Resuming Automatic Clustering for a table
To resume Automatic Clustering for a clustered table, use the ALTER TABLE command with a RESUME RECLUSTER clause. For example:

ALTER TABLE t1 RESUME RECLUSTER;

SHOW TABLES LIKE 't1';

+---------------------------------+------+---------------+-------------+-------+---------+------------+------+-------+----------+----------------+----------------------+
|           created_on            | name | database_name | schema_name | kind  | comment | cluster_by | rows | bytes |  owner   | retention_time | automatic_clustering |
+---------------------------------+------+---------------+-------------+-------+---------+------------+------+-------+----------+----------------+----------------------+
| Thu, 12 Apr 2018 13:29:01 -0700 | T1   | TESTDB        | MY_SCHEMA   | TABLE |         | LINEAR(C1) | 0    | 0     | SYSADMIN | 1              | ON                   |
+---------------------------------+------+---------------+-------------+-------+---------+------------+------+-------+----------+----------------+----------------------+
Tip

Before you resume Automatic Clustering on a clustered table, consider the following conditions, which may cause reclustering activity (and corresponding credit charges):

The table is not optimally-clustered (e.g. significant DML has been performed on the table since it was last reclustered).

The clustering key on the table has changed.

For more details, see Micro-partitions & Data Clustering and Clustering Keys & Clustered Tables.

Automatic Clustering costs
The cost of enabling Automatic Clustering can be broken down into compute costs and storage costs.

Compute costs
Snowflake uses serverless compute resources to cluster a table for the first time. It also uses compute resources to maintain that table in a well-clustered state as new data is added to the table. The more changes to a table, the higher the maintenance costs.

Storage Costs
Because Automatic Clustering reorganizes existing data rather than creating additional storage, in many cases there are no additional storage costs. However, reclustering can incur additional storage costs if it increases the size of Fail-safe storage. For more information, see Credit and Storage Impact of Reclustering.

Credit usage and warehouses for Automatic Clustering
Automatic Clustering consumes Snowflake credits, but does not require you to provide a virtual warehouse. Instead, Snowflake internally manages and achieves efficient resource utilization for reclustering the tables.

Your account is billed only for the actual credits consumed by automatic clustering operations on your clustered tables.

Important

After enabling or resuming Automatic Clustering on a clustered table, if it has been a while since the table was reclustered, you may experience reclustering activity (and corresponding credit charges) as Snowflake brings the table to an optimally-clustered state. Once the table is optimally-clustered, the reclustering activity will drop off.

Likewise, defining a clustering key on an existing table or changing the clustering key on a clustered table may trigger reclustering and credit charges.

To prevent any unexpected credit charges, we recommend starting with one or two selected tables and observing the credit charges associated with keeping the tables well-clustered as DML is performed. This will help you establish a baseline for the number of credits consumed by reclustering activity.

Estimating Automatic Clustering cost
You can call the SYSTEM$ESTIMATE_AUTOMATIC_CLUSTERING_COSTS function to help estimate the compute cost of enabling Automatic Clustering for a table and maintaining the table in a well-clustered state. You can also call the function to help predict the compute cost of changing the cluster key of a table.

Important

The cost estimates returned by the SYSTEM$ESTIMATE_AUTOMATIC_CLUSTERING_COSTS function are best efforts. The actual realized costs can vary by up to 100% (or, in rare cases, several times) from the estimated costs.

Viewing Automatic Clustering cost
Automatic clustering consumes credits as it uses serverless compute resources for the automated background maintenance of each clustered table, including initial clustering and reclustering as needed. To learn how many credits per compute-hour are consumed by automatic clustering, refer to the “Serverless Feature Credit Table” in the Snowflake Service Consumption Table.

Users with the proper privileges can view the cost of automatic clustering using Snowsight or SQL:

Snowsight
In the navigation menu, select Admin » Cost management.

SQL
Query either of the following:

AUTOMATIC_CLUSTERING_HISTORY table function (in the Snowflake Information Schema).

AUTOMATIC_CLUSTERING_HISTORY view (in Account Usage).

The following queries can be executed against the AUTOMATIC_CLUSTERING_HISTORY view:

Query: Automatic Clustering cost history (by day, by object)

This query provides a list of tables with Automatic Clustering and the volume of credits consumed via the service over the last 30 days, broken out by day. Any irregularities in the credit consumption or consistently high consumption are flags for additional investigation.

SELECT TO_DATE(start_time) AS date,
  database_name,
  schema_name,
  table_name,
  SUM(credits_used) AS credits_used
FROM snowflake.account_usage.automatic_clustering_history
WHERE start_time >= DATEADD(month,-1,CURRENT_TIMESTAMP())
GROUP BY 1,2,3,4
ORDER BY 5 DESC;
Query: Automatic Clustering History & m-day average

This query shows the average daily credits consumed by Automatic Clustering grouped by week over the last year. It can help identify anomalies in daily averages over the year so you can investigate spikes or unexpected changes in consumption.

WITH credits_by_day AS (
  SELECT TO_DATE(start_time) AS date,
    SUM(credits_used) AS credits_used
  FROM snowflake.account_usage.automatic_clustering_history
  WHERE start_time >= DATEADD(year,-1,CURRENT_TIMESTAMP())
  GROUP BY 1
  ORDER BY 2 DESC
)

SELECT DATE_TRUNC('week',date),
      AVG(credits_used) AS avg_daily_credits
FROM credits_by_day
GROUP BY 1
ORDER BY 1;
Note

Resource monitors provide control over virtual warehouse credit usage; however, you cannot use them to control credit usage for the Snowflake-provided warehouses, including the Snowflake logo in blue (no text) AUTOMATIC_CLUSTERING warehouse.

Was this page helpful?

