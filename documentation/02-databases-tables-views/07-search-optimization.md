Search optimization service
Enterprise Edition Feature

This feature requires Enterprise Edition (or higher). To inquire about upgrading, please contact Snowflake Support.

The search optimization service can significantly improve the performance of certain types of lookup and analytical queries. An extensive set of filtering predicates are supported (see Identifying queries that can benefit from search optimization).

Note

To start with a tutorial that compares execution time with and without search optimization, see Getting Started with Search Optimization.

The search optimization service aims to significantly improve the performance of certain types of queries on tables, including:

Selective point lookup queries on tables. A point lookup query returns only one or a small number of distinct rows. Use case examples include:

Business users who need fast response times for critical dashboards with highly selective filters.

Data scientists who are exploring large data volumes and looking for specific subsets of data.

Data applications retrieving a small set of results based on an extensive set of filtering predicates.

For more information, see Speeding up point lookup queries with search optimization.

Character data (text) and IP address searches executed with the SEARCH and SEARCH_IP functions. For more information, see Speeding up text queries with search optimization.

Substring and regular expression searches (for example, LIKE, ILIKE, RLIKE, and so on). For more information, see Speeding up substring and regular expression queries with search optimization.

Queries on elements in VARIANT, OBJECT, and ARRAY (semi-structured) columns that use the following types of predicates:

Equality predicates.

IN predicates.

Predicates that use ARRAY_CONTAINS.

Predicates that use ARRAYS_OVERLAP.

Predicates that use full-text search with SEARCH.

Substring and regular expression predicates.

Predicates that check for NULL values.

For more information, see Speeding up queries of semi-structured data with search optimization.

Queries on elements in structured ARRAY, OBJECT, and MAP (structured) columns that use the following types of predicates:

Equality predicates.

IN predicates.

Substring predicates (on STRING fields).

For more information, see Speeding up queries of structured data with search optimization.

Queries that use selected geospatial functions with GEOGRAPHY values. For more information, see Speeding up geospatial queries with search optimization.

Once you identify the queries that can benefit from the search optimization service, you can enable search optimization for the columns and tables used in those queries.

The search optimization service is generally transparent to users. Queries work the same as they do without search optimization; some are just faster. However, search optimization does have effects on certain other table operations. For more information, see Working with search-optimized tables.

How the search optimization service works
To improve performance of search queries, the search optimization service creates and maintains a persistent data structure called a search access path. The search access path keeps track of which values of the table’s columns might be found in each of its micro-partitions, allowing some micro-partitions to be skipped when scanning the table.

A maintenance service is responsible for creating and maintaining the search access path:

When you enable search optimization, the maintenance service creates and populates the search access path with the data needed to perform the lookups.

Building the search access path can take significant time, depending on the size of the table. The maintenance service works in the background and does not block any operations on the table. Queries are not accelerated until the search access path has been fully built.

When data in the table is updated (for example, by loading new data sets or through DML operations), the maintenance service automatically updates the search access path to reflect the changes to the data.

If queries are run while the search access path is still being updated, queries might run more slowly, but will still return correct results.

The progress of each table’s maintenance service appears in the search_optimization_progress column in the output of SHOW TABLES. Before you measure the performance improvement of search optimization on a newly-optimized table, make sure this column shows that the table has been fully optimized.

Search access path maintenance is transparent. You don’t need to create a virtual warehouse for running the maintenance service. However, there is a cost for the storage and compute resources of maintenance. For more details on costs, see Search optimization cost estimation and management.

Other options for optimizing query performance
The search optimization service is one of several ways to optimize query performance. The following list shows other techniques:

Query acceleration

Creating one or more materialized views (clustered or unclustered)

Clustering a table

For more information, see Optimizing query performance.

Examples
Start by creating a table with data:

CREATE OR REPLACE TABLE test_table (id INT, c1 INT, c2 STRING, c3 DATE) AS
  SELECT * FROM VALUES
    (1, 3, '4',  '1985-05-11'),
    (2, 4, '3',  '1996-12-20'),
    (3, 2, '1',  '1974-02-03'),
    (4, 1, '2',  '2004-03-09'),
    (5, NULL, NULL, NULL);
Add the SEARCH OPTIMIZATION property to the table using ALTER TABLE:

ALTER TABLE test_table ADD SEARCH OPTIMIZATION;
The following queries can use the search optimization service:

SELECT * FROM test_table WHERE id = 2;
SELECT * FROM test_table WHERE c2 = '1';
SELECT * FROM test_table WHERE c3 = '1985-05-11';
SELECT * FROM test_table WHERE c1 IS NULL;
SELECT * FROM test_table WHERE c1 = 4 AND c3 = '1996-12-20';
The following query can use the search optimization service because the implicit cast is on the constant, not the column:

SELECT * FROM test_table WHERE c2 = 2;
The following can’t use the search optimization service because the cast is on the table’s column:

SELECT * FROM test_table WHERE CAST(c2 AS NUMBER) = 2;
An IN clause is supported by the search optimization service:

SELECT id, c1, c2, c3
  FROM test_table
  WHERE id IN (2, 3)
  ORDER BY id;
If predicates are individually supported by the search optimization service, then they can be joined by the conjunction AND and still be supported by the search optimization service:

SELECT id, c1, c2, c3
  FROM test_table
  WHERE c1 = 1
    AND c3 = TO_DATE('2004-03-09')
  ORDER BY id;
DELETE and UPDATE (and MERGE) can also use the search optimization service:

DELETE FROM test_table WHERE id = 3;
UPDATE test_table SET c1 = 99 WHERE id = 4;
Was this page helpful?

Yes
Identifying queries that can benefit from search optimization
Enterprise Edition Feature

This feature requires Enterprise Edition (or higher). To inquire about upgrading, please contact Snowflake Support.

Search optimization can improve the performance of many queries. This topic describes characteristics of the kinds of queries that search optimization helps the most with, and conversely, the kinds of queries that do not benefit.

General query characteristics
Search optimization works best to improve the performance of queries with the following characteristics:

The query involves a column or columns other than the primary cluster key.

The query typically runs for a few seconds or longer (before applying search optimization). In most cases, search optimization will not substantially improve the performance of a query that has a sub-second execution time.

At least one of the columns accessed by the query filter operation has on the order of 100,000 distinct values or more.

To determine the number of distinct values, you can use either of the following:

Use APPROX_COUNT_DISTINCT to get the approximate number of distinct values:

SELECT APPROX_COUNT_DISTINCT(column1) FROM table1;
Use COUNT(DISTINCT <col_name>) to get the actual number of distinct values:

SELECT COUNT(DISTINCT c1), COUNT(DISTINCT c2) FROM test_table;
Because you need only an approximation of the number of distinct values, consider using APPROX_COUNT_DISTINCT, which is generally faster and cheaper than COUNT(DISTINCT <col_name>).

Supported data types
The search optimization service currently supports the following data types:

Data types for fixed-point numbers (for example, INTEGER and NUMERIC)

String & binary data types (for example, VARCHAR and BINARY)

Date & time data types (for example, DATE, TIME, and TIMESTAMP)

Semi-structured data types (for example, VARIANT, OBJECT, and ARRAY)

Structured data types (for example, structured ARRAY, OBJECT, and MAP)

GEOGRAPHY data type

Queries that involve other values of other data types (for example, FLOAT, DECFLOAT, or GEOMETRY) don’t benefit.

Supported table types
The search optimization service currently supports the following types of tables:

Standard Snowflake tables

Interactive tables

Iceberg tables

Dynamic tables

Transient tables

The search optimization service currently doesn’t support the following types of tables:

External tables

Hybrid tables

Temporary tables

Supported predicate types
Search optimization can improve the performance of queries using these kinds of predicates:

Point lookup queries using equality and IN.

Join queries.

Queries using scalar subqueries.

Queries using scalar functions.

Character data (text) queries using the SEARCH and SEARCH_IP functions.

Substring queries using wildcards and regular expressions.

Searches in semi-structured data.

Searches in structured data.

Geospatial queries.

Queries using conjunctions (AND) and disjunctions (OR).

Support for collation
Search optimization can improve the performance of queries on columns defined with a COLLATE clause, depending on the search method:

When search optimization is enabled on a column using the EQUALITY search method, any collation specification is supported.

When search optimization is enabled on a column using the FULL_TEXT or SUBSTRING search method, the 'utf8' or 'bin' collation specifications are supported.

For more information about search methods, see ALTER TABLE … ADD SEARCH OPTIMIZATION.

Search optimization doesn’t support predicates that change the collation specification of a column using the COLLATE function.

For example, create a table with columns that have collation specifications and insert a row:

CREATE OR REPLACE TABLE search_optimization_collation_demo (
  en_ci_col VARCHAR COLLATE 'en-ci',
  utf_8_col VARCHAR COLLATE 'utf8');

INSERT INTO search_optimization_collation_demo VALUES (
  'test_collation_1',
  'test_collation_2');
Enable search optimization for equality predicates on both columns in the table:

ALTER TABLE search_optimization_collation_demo
  ADD SEARCH OPTIMIZATION ON EQUALITY(en_ci_col, utf_8_col);
The following query can benefit from search optimization:

SELECT *
  FROM search_optimization_collation_demo
  WHERE utf_8_col = 'test_collation_2';
The following query can’t benefit from search optimization because it changes the collation specification of the utf_8_col column using the COLLATE function:

SELECT *
  FROM search_optimization_collation_demo
  WHERE utf_8_col COLLATE 'de-ci' = 'test_collation_2';
The following query also can’t benefit from search optimization. Based on the collation rules of precedence, the query applies the 'de-ci' collation specification to the utf_8_col column using the COLLATE function.

SELECT *
  FROM search_optimization_collation_demo
  WHERE utf_8_col = 'test_collation_2' COLLATE 'de-ci';
Support for Apache Iceberg™ tables
Search optimization can improve the performance of queries on Apache Iceberg™ tables. For information about configuring search optimization for Iceberg tables, see ALTER ICEBERG TABLE.

The following limitations apply to search optimization support for Iceberg tables:

Search optimization can’t be added for columns with data types that Iceberg tables don’t support, which include semi-structured and geospatial data types. For more information, see Data types for Apache Iceberg™ tables.

If Apache Parquet™ files are too large (for example, hundreds of megabytes compressed), then queries might not fully benefit from the search optimization service in some scenarios.

Other limitations that apply to search optimization for Snowflake tables also apply to Iceberg tables. For more information, see Queries that do not benefit from search optimization.

Potential improvements for views
The search optimization service can indirectly improve the performance of views (including secure views). If a base table for a view has search optimization enabled, and the query uses a selective predicate for that table, the search optimization service can improve performance when filtering rows. See Supported predicate types.

Not all tables in the view need to have search optimization enabled. Search optimization is performed on each table independently.

Queries that do not benefit from search optimization
Currently, the search optimization service doesn’t support floating point data types, GEOMETRY, or other data types not already discussed. Snowflake might add support for more data types in the future.

Additionally, the search optimization service doesn’t support the following:

Some table types.

For more information, see Supported table types.

Materialized views.

Column concatenation.

Analytical expressions.

Casts on table columns (except for fixed-point numbers cast to strings).

Although search optimization supports predicates with implicit and explicit casts on constant values, it doesn’t support predicates that cast values in the actual table column (except for casts from INTEGER and NUMBER to VARCHAR).

For example, the following predicates are supported because they use implicit and explicit casts on constant values (not values in the table column):

-- Supported predicate
-- (where the string '2020-01-01' is implicitly cast to a date)
WHERE timestamp1 = '2020-01-01';

-- Supported predicate
-- (where the string '2020-01-01' is explicitly cast to a date)
WHERE timestamp1 = '2020-01-01'::date;
The following predicate is not supported because it uses a cast on values in the table column:

-- Unsupported predicate
-- (where values in a VARCHAR column are cast to DATE)
WHERE to_date(varchar_column) = '2020-01-01';
The search optimization service considers the original column values, not the values after the cast. As a result, the search optimization service is not used for queries with these predicates.

As noted, the exception to this rule is casting NUMBER or INTEGER values to VARCHAR values in the table column. The search optimization service does support this type of predicate:

-- Supported predicate
-- (where values in a numeric column are cast to a string)
WHERE cast(numeric_column as varchar) = '2'
Search optimization doesn’t improve performance of queries that use Time Travel because search optimization works only on active data.

Was this page helpful?

Yes
Enabling and disabling search optimization
Enterprise Edition Feature

This feature requires Enterprise Edition (or higher). To inquire about upgrading, please contact Snowflake Support.

To enable search optimization, use a role that has the necessary privileges, then enable it for an entire table or specific columns using the ALTER TABLE … ADD SEARCH OPTIMIZATION command.

Required access control privileges
To add, configure, or remove search optimization for a table, you must:

Have OWNERSHIP privilege on the table.

Have ADD SEARCH OPTIMIZATION privilege on the schema that contains the table. To grant this privilege:

GRANT ADD SEARCH OPTIMIZATION ON SCHEMA <schema_name> TO ROLE <role>
To use the search optimization service for a query, you just need the SELECT privilege on the table.

You don’t need any additional privileges. Because SEARCH OPTIMIZATION is a table property, it is automatically detected and used (if appropriate) when querying a table.

Configuring search optimization
Note

Adding search optimization to a large table (a table containing terabytes (TB) or more of data) might result in an immediate increase in credit consumption over a short period of time.

When you add search optimization to a table, the maintenance service immediately starts building the search access paths for the table in the background. If the table is large, the maintenance service might massively parallelize this work, which can result in increased costs over a short period of time.

Before you add search optimization to a large table, get an estimate of these costs so that you know what to expect.

When you enable search optimization, you have a choice of enabling it for a whole table or for specific columns in the table.

Enabling search optimization for a whole table enables it for point-lookup queries on all eligible columns.

To enable search optimization for a whole table, use the ALTER TABLE … ADD SEARCH OPTIMIZATION command without the ON clause.

Enabling search optimization for specific columns avoids spending credits on creating search access paths for columns that you don’t often use in queries, and also allows you to select additional types of queries to be optimized for each column, potentially further increasing performance.

To enable search optimization for specific columns, specifying the types of queries to be optimized, use the ON clause in the ALTER TABLE … ADD SEARCH OPTIMIZATION command. In the ON clause in ADD SEARCH OPTIMIZATION, you specify which columns should be enabled for search optimization. When enabling search optimization for a given column, you can also specify a search method (for example, EQUALITY for equality and IN searches, GEO for GEOGRAPHY searches, or SUBSTRING for substring searches). You can enable more than one search method on the same column.

You can enable search optimization for a whole Apache Iceberg™ table or for specific columns in the table by using the ALTER ICEBERG TABLE … ADD SEARCH OPTIMIZATION command.

In general, enabling search optimization only for specific columns is the best practice.

The following sections explain how to configure search optimization for a table:

Enabling search optimization for specific columns

Enabling search optimization for an entire table

After you have configured search optimization, you can inspect your configuration to make sure it is correct.

Verifying that a table is configured for search optimization

You can remove search optimization from specific columns or whole tables when you have discovered that search optimization does not provide enough benefit.

Removing search optimization from specific columns or the entire table

Enabling search optimization for specific columns
To configure search optimization for a specific column, use the ALTER TABLE … ADD SEARCH OPTIMIZATION command with the ON clause.

Note

When running this command, use a role that has the privileges to add search optimization to the table.

The ON clause specifies that you want to configure search optimization for specific columns. For details on the syntax, see the section on ALTER TABLE … ADD SEARCH OPTIMIZATION.

Note

If you just want to apply search optimization for equality and IN predicates to all applicable columns in the table, see Enabling search optimization for an entire table.

After running this command, you can verify that the columns have been configured for search optimization.

The next sections contain examples that demonstrate how to specify the configuration for search optimization:

Example: Full-text search optimization on specific columns

Example: Supporting equality and IN predicates for specific columns

Example: Supporting equality and IN predicates for all applicable columns

Example: Supporting different types of predicates

Example: Supporting different predicates on the same column

Example: Supporting equality and IN predicates for an element in a VARIANT

Example: Supporting geospatial functions

Example: Full-text search optimization on specific columns
You can perform text searches by using the SEARCH and SEARCH_IP functions. To improve query execution performance when these functions are used, enable FULL_TEXT search optimization. You can enable FULL_TEXT search optimization on a table by using different subsets of the columns in the table and different text analyzers. For information about the behavior of different analyzers, see How search terms are tokenized.

Enable FULL_TEXT search optimization on a set of columns in a table by using the following syntax.

ALTER TABLE <name> ADD SEARCH OPTIMIZATION
  ON FULL_TEXT( { * | <col1> [ , <col2>, ... ] } [ , ANALYZER => '<analyzer_name>' ]);
The columns you specify must be VARCHAR, VARIANT, ARRAY, or OBJECT columns. Columns with other data types aren’t supported. In addition, you can specify individual paths to columns of type VARIANT, ARRAY, or OBJECT.

You can specify the wildcard asterisk character (*) instead of a list of columns. In this case, the optimization is automatically enabled on all the columns of supported types.

If specified, the ANALYZER => 'analyzer_name' argument must be one of the choices that is documented for the SEARCH function. If you don’t specify an analyzer, the DEFAULT_ANALYZER is used.

Note

For query execution with the SEARCH function to be optimized, the analyzer specified for the search optimization in the ALTER TABLE command must be the same as the analyzer specified in the SEARCH function call. If the analyzers don’t match, the search access path won’t be selected.

This example enables FULL_TEXT search optimization on three VARCHAR columns that might be the targets of a SEARCH query.

ALTER TABLE lines ADD SEARCH OPTIMIZATION
  ON FULL_TEXT(play, character, line);
To describe the search optimization configuration for this table, run the following command:

DESCRIBE SEARCH OPTIMIZATION ON lines;
+---------------+----------------------------+-----------+------------------+--------+
| expression_id | method                     | target    | target_data_type | active |
|---------------+----------------------------+-----------+------------------+--------|
|             1 | FULL_TEXT DEFAULT_ANALYZER | PLAY      | VARCHAR(50)      | true   |
|             2 | FULL_TEXT DEFAULT_ANALYZER | CHARACTER | VARCHAR(30)      | true   |
|             3 | FULL_TEXT DEFAULT_ANALYZER | LINE      | VARCHAR(2000)    | true   |
+---------------+----------------------------+-----------+------------------+--------+
For more information, see Displaying the search optimization configuration for a table.

This example enables FULL_TEXT search optimization on a VARCHAR column that might be the target of a SEARCH_IP query.

ALTER TABLE ipt ADD SEARCH OPTIMIZATION ON FULL_TEXT(ip1, ANALYZER => 'ENTITY_ANALYZER');
To remove the search optimization configuration, run one of the following commands:

ALTER TABLE lines DROP SEARCH OPTIMIZATION
  ON FULL_TEXT(play, character, line);
ALTER TABLE lines DROP SEARCH OPTIMIZATION
  ON play, character, line;
ALTER TABLE lines DROP SEARCH OPTIMIZATION
  ON 1, 2, 3;
In the third ALTER TABLE … DROP SEARCH OPTIMIZATION command, 1, 2, 3 refers to the expression IDs returned by the DESCRIBE command.

You can also modify a FULL_TEXT search optimization configuration by dropping a subset of the columns (by name or expression ID). For more information, see Removing search optimization from specific columns or the entire table.

For more examples that enable and drop FULL_TEXT search optimization, see Examples of ADD (and DROP) FULL_TEXT search optimization.

Example: Supporting equality and IN predicates for specific columns
To optimize searches with equality predicates for the columns c1, c2, and c3 in the table t1, execute the following statement:

ALTER TABLE t1 ADD SEARCH OPTIMIZATION ON EQUALITY(c1, c2, c3);
You can also specify the same search method more than once in the ON clause:

-- This statement is equivalent to the previous statement.
ALTER TABLE t1 ADD SEARCH OPTIMIZATION ON EQUALITY(c1), EQUALITY(c2, c3);
Example: Supporting equality and IN predicates for all applicable columns
To optimize searches with equality predicates for all applicable columns in the table, execute the following statement:

ALTER TABLE t1 ADD SEARCH OPTIMIZATION ON EQUALITY(*);
Note the following:

As explained in the description of the syntax for the search method and target, for a given method, you cannot specify both an asterisk and specific columns.

Although omitting the ON clause also configures search optimization for equality and IN predicates on all applicable columns in the table, there are differences between specifying and omitting the ON clause. See Enabling search optimization for an entire table.

Example: Supporting different types of predicates
To optimize searches with equality predicates for the column c1 and c2 and substring searches for the column c3, execute the following statement:

ALTER TABLE t1 ADD SEARCH OPTIMIZATION ON EQUALITY(c1, c2), SUBSTRING(c3);
Example: Supporting different predicates on the same column
To optimize searches for both equality predicates and substring predicates on the same column, c1, execute the following statement:

ALTER TABLE t1 ADD SEARCH OPTIMIZATION ON EQUALITY(c1), SUBSTRING(c1);
Example: Supporting equality and IN predicates for an element in a VARIANT
To optimize searches with equality predicates on the VARIANT element uuid nested in the element user in the VARIANT column c4, execute the following statement:

ALTER TABLE t1 ADD SEARCH OPTIMIZATION ON EQUALITY(c4:user.uuid);
Example: Supporting geospatial functions
To optimize searches with predicates that use geospatial functions with GEOGRAPHY objects in the c1 column, execute the following statement:

ALTER TABLE t1 ADD SEARCH OPTIMIZATION ON GEO(c1);
Enabling search optimization for an entire table
To specify EQUALITY for all columns of the supported data types (except for semi-structured and GEOGRAPHY), use the ALTER TABLE … ADD SEARCH OPTIMIZATION command without the ON clause.

Note

When running this command, use a role that has the privileges to add search optimization to the table.

For example:

ALTER TABLE test_table ADD SEARCH OPTIMIZATION;
For more information on the syntax, see the section on search optimization in ALTER TABLE.

After running this command, you can verify that the columns have been configured for search optimization.

Effect on subsequently added columns
After you run ALTER TABLE … ADD SEARCH OPTIMIZATION command without the ON clause, any columns that are subsequently added to the table will also be configured for optimization on EQUALITY.

However, if you execute ALTER TABLE … { ADD | DROP } SEARCH OPTIMIZATION with the ON clause on the same table, any columns that are subsequently added to the table won’t be configured for EQUALITY automatically. You must execute ALTER TABLE … ADD SEARCH OPTIMIZATION ON … to configure these newly added columns for EQUALITY.

Verifying that a table is configured for search optimization
To verify that the table and its columns have been configured for search optimization:

Display the search optimization configuration for the table and its columns.

Run the SHOW TABLES command to verify that search optimization has been added and to determine how much of the table has been optimized.

For example:

SHOW TABLES LIKE '%test_table%';
In the output from this command:

Verify that SEARCH_OPTIMIZATION is ON, which indicates that search optimization has been added.

Check the value of SEARCH_OPTIMIZATION_PROGRESS. This specifies the percentage of the table that has been optimized so far.

When search optimization is first added to a table, the performance benefits don’t appear immediately. The search optimization service starts populating data in the background. The benefits appear increasingly as the maintenance catches up to the current state of the table.

Before you run a query to verify that search optimization is working, wait until this shows that the table has been fully optimized.

Run a query to verify that search optimization is working.

Note that the Snowflake optimizer automatically chooses when to use the search optimization service for a particular query. Users cannot control which queries search optimization is used for.

Choose a query that the search optimization service is designed to optimize. See Identifying queries that can benefit from search optimization.

In the web UI, view the query plan for this query, and verify that the query node “Search Optimization Access” is part of the query plan.

Displaying the search optimization configuration for a table
To display the search optimization configuration for a table, use the DESCRIBE SEARCH OPTIMIZATION command.

For example, suppose that you execute the following statement to configure search optimization for a column:

ALTER TABLE t1 ADD SEARCH OPTIMIZATION ON EQUALITY(c1);
Executing DESCRIBE SEARCH OPTIMIZATION produces the following output:

DESCRIBE SEARCH OPTIMIZATION ON t1;
+---------------+----------+--------+------------------+--------+
| expression_id |  method  | target | target_data_type | active |
+---------------+----------+--------+------------------+--------+
| 1             | EQUALITY | C1     | NUMBER(38,0)     | true   |
+---------------+----------+--------+------------------+--------+
Removing search optimization from specific columns or the entire table
You can remove the search optimization configuration for specific columns, or you can remove the SEARCH OPTIMIZATION property from the entire table.

Dropping search optimization for specific columns

Removing search optimization from the table

Dropping search optimization for specific columns
To drop the search optimization configuration for specific columns, use the following command: ALTER TABLE … DROP SEARCH OPTIMIZATION command with the ON clause.

For example, suppose that executing the DESCRIBE SEARCH OPTIMIZATION command prints the following expressions:

DESCRIBE SEARCH OPTIMIZATION ON t1;
+---------------+-----------+-----------+-------------------+--------+
| expression_id |  method   | target    | target_data_type  | active |
+---------------+-----------+-----------+-------------------+--------+
|             1 | EQUALITY  | C1        | NUMBER(38,0)      | true   |
|             2 | EQUALITY  | C2        | VARCHAR(16777216) | true   |
|             3 | EQUALITY  | C4        | NUMBER(38,0)      | true   |
|             4 | EQUALITY  | C5        | VARCHAR(16777216) | true   |
|             5 | EQUALITY  | V1        | VARIANT           | true   |
|             6 | SUBSTRING | C2        | VARCHAR(16777216) | true   |
|             7 | SUBSTRING | C5        | VARCHAR(16777216) | true   |
|             8 | GEO       | G1        | GEOGRAPHY         | true   |
|             9 | EQUALITY  | V1:"key1" | VARIANT           | true   |
|            10 | EQUALITY  | V1:"key2" | VARIANT           | true   |
+---------------+-----------+-----------+-------------------+--------+
To drop search optimization for substrings on the column c2, execute the following statement:

ALTER TABLE t1 DROP SEARCH OPTIMIZATION ON SUBSTRING(c2);
To drop search optimization for all methods on the column c5, execute the following statement:

ALTER TABLE t1 DROP SEARCH OPTIMIZATION ON c5;
Because the column c5 is configured to optimize equality and substring searches, the statement above drops the configuration for equality and substring searches for c5.

To drop search optimization for equality on the column c1 and to drop the configuration specified by the expression IDs 6 and 8, execute the following statement:

ALTER TABLE t1 DROP SEARCH OPTIMIZATION ON EQUALITY(c1), 6, 8;
For more information on the syntax, see the section on ALTER TABLE … DROP SEARCH OPTIMIZATION.

Removing search optimization from the table
To remove the SEARCH OPTIMIZATION property from a table:

Switch to a role that has the privileges to remove search optimization from the table.

Run the ALTER TABLE … DROP SEARCH OPTIMIZATION command without the ON clause:

ALTER TABLE [IF EXISTS] <table_name> DROP SEARCH OPTIMIZATION;
For example:

ALTER TABLE test_table DROP SEARCH OPTIMIZATION;
For more information, see the section on ALTER TABLE … DROP SEARCH OPTIMIZATION.Monitoring search optimization using Snowsight
Enterprise Edition Feature

This feature requires Enterprise Edition (or higher). To inquire about upgrading, please contact Snowflake Support.

After you enable the search optimization service, you can use Snowsight to monitor statistics about how queries use it. You can also use Snowsight to determine why a query isn’t using the search optimization service.

Monitoring search optimization usage for a query
When a query uses the search optimization service, the query profile includes the following:

Search Optimization Access node - A dedicated Search Optimization Access node is in the query plan. Select this node to access the table scan information, as well as information that is specific to search optimization.

Attributes pane - This pane for the node contains the following:

Full table name - Identifies the table that was scanned for the query that used search optimization.

Search optimization usage information - This section lists the expression IDs that search optimization referenced during query execution. Each expression ID corresponds to a search method and column target defined for the table. Execute the following query to show the expression IDs and their corresponding methods and targets:

DESCRIBE SEARCH OPTIMIZATION ON <table_name>;
For more information about this command, see DESCRIBE SEARCH OPTIMIZATION.

Statistics pane - This pane for the node contains the following metrics:

Bytes scanned - The total amount of data that was read during the execution of a table scan operation.

Partitions scanned - The number of micro-partitions that were actually scanned.

Partitions total - The total number of the micro-partitions for the table.

Partitions pruned by search optimization - The number of micro-partitions that search optimization effectively eliminated from the corresponding table scan.

The following image shows an example of the metrics on the Statistics pane:

Shows the Search Optimization Access node with the search optimization statistics included.
Determining the reason why search optimization wasn’t used
Even when search optimization is configured for a table, it might not always be used. If search optimization wasn’t used for a query, examine the Table Scan node’s Search Optimization Usage Info section on the Attributes pane. The section shows one of the following explanations:

When there is a predicate mismatch, the following message is shown:

Search optimization service was not used because no
match was found between used predicates and the
search access paths added for the table.
This message indicates that the predicate used in the query on this table isn’t compatible with the search methods defined for the table. You can review the optimization configuration for the table by executing the following command:

DESCRIBE SEARCH OPTIMIZATION ON <table_name>;
For information about the predicates and data types supported by search optimization, see Identifying queries that can benefit from search optimization.

When there is a cost-based decision not to use search optimization, the following message is shown:

The query optimizer estimated that the search optimization
service would not be beneficial for this table scan.
This message indicates that the predicates used in the query are compatible with the search methods defined for the table, but the query optimizer decided that query performance likely wouldn’t be improved by search optimization. Subsequent queries with different predicates or different data in the source table might use search optimization.

When the predicate limit is exceeded, the following message is shown:

Search optimization service was not used because the
predicate limit was exceeded.
This message indicates that the predicate contains too many distinct predicates. The exact count of search optimization predicates depends on the types of the predicates and might not match exactly the number of predicates in the query. Substring queries and full-text search queries that use the wildcard syntax are more likely to reach the predicate limit.

The following image shows an example of a predicate mismatch message:

Shows the Search Optimization Access node with a message about the reason for not using search optimization.
Was this page helpful?Speeding up point lookup queries with search optimization
Enterprise Edition Feature

This feature requires Enterprise Edition (or higher). To inquire about upgrading, please contact Snowflake Support.

Point lookup queries are queries that are expected to return a small number of rows. The search optimization service can improve the performance of point lookup queries that use:

Equality predicates (for example, column_name = constant).

Predicates that use IN (see example).

The following sections provide more information about search optimization support for point lookup queries:

Enabling search optimization for point lookup queries

Examples of supported point lookup queries

Enabling search optimization for point lookup queries
Point lookup queries aren’t improved unless you enable search optimization for the columns referenced by the predicate of the query. To improve the performance of point lookup queries on a table, use the ALTER TABLE … ADD SEARCH OPTIMIZATION command to:

Enable search optimization for specific columns.

Enable search optimization for all columns of the table.

In general, enabling search optimization only for specific columns is the best practice. Use the ON EQUALITY clause to specify the columns. This example enables search optimization for a specific column:

ALTER TABLE mytable ADD SEARCH OPTIMIZATION ON EQUALITY(mycol);
To specify EQUALITY for all columns of the supported data types (except for semi-structured and GEOGRAPHY):

ALTER TABLE mytable ADD SEARCH OPTIMIZATION;
For more information, see Enabling and disabling search optimization.

Examples of supported point lookup queries
The search optimization service can improve the performance of the following query that uses an equality predicate:

SELECT * FROM test_table WHERE id = 3;
The IN clause is supported by the search optimization service:

SELECT id, c1, c2, c3
  FROM test_table
  WHERE id IN (2, 3)
  ORDER BY id;
Speeding up join queries with search optimization
Enterprise Edition Feature

This feature requires Enterprise Edition (or higher). To inquire about upgrading, please contact Snowflake Support.

The search optimization service can improve the performance of join queries that have a small number of distinct values on the build side of the join.

For example, the search optimization service can improve the performance of these types of joins:

Suppose that products is a table containing a row for each product, and sales is a table containing a row for each sale of a product. The products table contains fewer rows and is smaller than the sales table. To find all sales of a specific product, you join the sales table (the larger table) with the products table (the smaller table). Because the products table is small, there are few distinct values on the build side of the join.

Note

In data warehousing, the large table is often referred to as the fact table. The small table is referred to as the dimension table. The rest of this topic uses these terms when referring to the large table and the small table in a join.

Suppose that customers is a table containing a row for each customer, and sales is a table containing a row for each sale. Both tables are large. To find all sales for a specific customer, you join the sales table (the probe side) with the customers table (the build side) and use a filter so that there are a small number of distinct values on the build side of the join.

The following sections provide more information about search optimization support for join queries:

Enabling search optimization for join queries

Supported join predicates

Examples of supported join queries

Limitations

Enabling search optimization for join queries
To improve the performance of join queries, make sure search optimization is enabled for columns in the join predicate of the query. In addition, make sure the build side of the join has a small number of distinct values, either because it’s a small dimension table or because of a selective filter. The search optimization runtime costs of a query are proportionate to the number of distinct values that must be looked up on the build side of the join. If this number is too large, Snowflake might decide against using the search access path and use the regular table access path instead.

To improve the performance of join queries, enable search optimization for the table on the probe side of the join. This table is usually a large table that isn’t filtered in join queries, such as a fact table.

Use the ALTER TABLE … ADD SEARCH OPTIMIZATION command to:

Enable search optimization for specific columns.

Enable search optimization for all columns of the table.

In general, enabling search optimization only for specific columns is the best practice. Use the ON EQUALITY clause to specify the columns. This example enables search optimization for a specific column:

ALTER TABLE mytable ADD SEARCH OPTIMIZATION ON EQUALITY(mycol);
To specify EQUALITY for all columns of the supported data types (except for semi-structured and GEOGRAPHY):

ALTER TABLE mytable ADD SEARCH OPTIMIZATION;
Supported join predicates
The search optimization service can improve the performance of queries with the following types of join predicates:

Equality predicates of the form probe_side_table.column = build_side_table.column.

Transformations on the build-side operand of the predicate (for example, string concatenation, addition, and so on).

Conjunctions (AND) of multiple equality predicates.

Examples of supported join queries
This section shows examples of join queries that can benefit from search optimization.

Example: Simple equality predicate
The following is an example of a supported query that uses a simple equality predicate as the join predicate. This query joins a table named sales with a table named customers. The probe-side table sales is large and has search optimization enabled. The build-side table customers is also large, but the input from this table is small, due to the selective filter on the customer_id column.

SELECT sales.date, customer.name
  FROM sales JOIN customers ON (sales.customer_id = customers.customer_id)
  WHERE customers.customer_id = 2094;
Example: Predicate transformed on the dimension-side operand
The following query joins a fact table named sales with a dimension table named products. The fact table is large and has search optimization enabled. The dimension table is small.

This query transforms the dimension-side operand of the predicate (for example, by multiplying values in the join condition) and can benefit from search optimization:

SELECT sales.date, product.name
  FROM sales JOIN products ON (sales.product_id = product.old_id * 100)
  WHERE product.category = 'Cutlery';
Example: Predicate spanning multiple columns
Queries in which a join predicate spans multiple columns can benefit from search optimization:

SELECT sales.date, product.name
  FROM sales JOIN products ON (sales.product_id = product.id and sales.location = product.place_of_production)
  WHERE product.category = 'Cutlery';
Example: Query using point-lookup filters and join predicates
In a query that uses both regular point-lookup filters and join predicates, the search optimization service can improve the performance of both. In the following query, the search optimization service can improve the sales.location point-lookup predicate as well as the product_id join predicate:

SELECT sales.date, product.name
  FROM sales JOIN products ON (sales.product_id = product.id)
  WHERE product.category = 'Cutlery'
  AND sales.location = 'Buenos Aires';
Limitations
The following limitations apply to the search optimization service and join queries:

Disjuncts (OR) in join predicates currently aren’t supported.

LIKE, ILIKE, and RLIKE join predicates currently aren’t supported.

Join predicates on VARIANT columns currently aren’t supported.

EQUAL_NULL equality predicates currently aren’t supported.

The current limitations of the search optimization service also apply to join queries.

Was this page helpful?

Yes
Speeding up queries with scalar subqueries using search optimization
Enterprise Edition Feature

This feature requires Enterprise Edition (or higher). To inquire about upgrading, please contact Snowflake Support.

A scalar subquery returns a single value (one column of one row). If no rows qualify to be returned, the subquery returns NULL. The search optimization service can improve the performance of queries with scalar subqueries. For more information about subqueries, see Working with Subqueries.

The following sections provide more information about search optimization support for queries with subqueries:

Enabling search optimization for queries with scalar subqueries

Supported data types

Examples of supported queries with scalar subqueries

Enabling search optimization for queries with scalar subqueries
Queries with subqueries aren’t improved unless you enable search optimization for the column that is equal to the result of the subquery. To improve the performance of queries with scalar subqueries on a table, use the ALTER TABLE … ADD SEARCH OPTIMIZATION command to do either of the following:

Enable search optimization for specific columns.

Enable search optimization for all columns of the table.

In general, enabling search optimization only for specific columns is the best practice. Use the ON EQUALITY clause to specify the columns. This example enables search optimization for a specific column:

ALTER TABLE mytable ADD SEARCH OPTIMIZATION ON EQUALITY(mycol);
To specify EQUALITY for all columns of the supported data types (except for semi-structured and GEOGRAPHY):

ALTER TABLE mytable ADD SEARCH OPTIMIZATION;
For more information, see Enabling and disabling search optimization.

Supported data types
The search optimization service can improve the performance of scalar subqueries on columns of the following data types:

Data types for fixed-point numbers, including the following:

All INTEGER data types, which have a scale of 0.

Fixed-point non-integers, which have a scale other than 0 (such as NUMBER(10,2)).

Casts of fixed-point numbers (for example, NUMBER(30, 2)::NUMBER(30, 5)).

String & binary data types (for example, VARCHAR and BINARY).

Date & time data types (for example, DATE, TIME, and TIMESTAMP).

Subqueries that involve other types of values (for example, VARIANT, FLOAT, GEOGRAPHY, or GEOMETRY) don’t benefit.

Examples of supported queries with scalar subqueries
The following queries are examples of queries with scalar subqueries that are supported by the search optimization service.

This query has a scalar subquery that queries the same table as the table in the outer query. To improve performance, make sure search optimization is enabled for the salary column in the employees table.

SELECT employee_id
  FROM employees
  WHERE salary = (
    SELECT MAX(salary)
      FROM employees
      WHERE department = 'Engineering');
This query has a scalar subquery that queries a table that is different from the table in the outer query. To improve performance, make sure search optimization is enabled for the product_id column in the products table.

SELECT *
  FROM products
  WHERE products.product_id = (
    SELECT product_id
      FROM sales
      GROUP BY product_id
      ORDER BY COUNT(product_id) DESC
      LIMIT 1);
Was this page helpful?

Yes
Speeding up queries with scalar functions using search optimization
Enterprise Edition Feature

This feature requires Enterprise Edition (or higher). To inquire about upgrading, please contact Snowflake Support.

A scalar function returns a single value for each invocation. The search optimization service can improve the performance of queries that use scalar functions in equality predicates. The scalar function can be a system-defined scalar function or a user-defined scalar SQL function.

The following sections provide more information about search optimization support for queries that use scalar functions:

Enabling search optimization for queries that use scalar functions

Supported data types

Examples of supported queries with scalar functions

Enabling search optimization for queries that use scalar functions
Queries aren’t improved unless you enable search optimization for the columns that are specified in equality predicates that use scalar function calls. To improve the performance of queries with scalar functions on a table, use the ALTER TABLE … ADD SEARCH OPTIMIZATION command to do the following:

Enable search optimization for specific columns.

Enable search optimization for all columns of the table.

In general, enabling search optimization only for specific columns is the best practice. Use the ON EQUALITY clause to specify the columns. This example enables search optimization for a specific column:

ALTER TABLE mytable ADD SEARCH OPTIMIZATION ON EQUALITY(mycol);
To specify EQUALITY for all columns of the supported data types (except for semi-structured and GEOGRAPHY):

ALTER TABLE mytable ADD SEARCH OPTIMIZATION;
For more information, see Enabling and disabling search optimization.

Supported data types
The search optimization service can improve the performance of queries that use columns of the following data types in equality predicates that use scalar function calls:

Data types for fixed-point numbers, including the following:

All INTEGER data types, which have a scale of 0.

Fixed-point non-integers, which have a scale other than 0 (such as NUMBER(10,2)).

Casts of fixed-point numbers (for example, NUMBER(30, 2)::NUMBER(30, 5)).

String & binary data types (for example, VARCHAR and BINARY).

Date & time data types (for example, DATE, TIME, and TIMESTAMP).

Queries that involve other types of values (for example, VARIANT, FLOAT, GEOGRAPHY, or GEOMETRY) don’t benefit.

Examples of supported queries with scalar functions
The following queries use scalar functions and are supported by the search optimization service.

Use a system-defined scalar function in the predicate of a query
This query uses the SHA2 system-defined scalar function in an equality predicate. To improve performance, make sure the EQUALITY search method is enabled for the mycol column in the test_so_scalar_function_system table.

SELECT *
  FROM test_so_scalar_function_system
  WHERE mycol = SHA2('Snowflake');
Use a user-defined scalar SQL function in the predicate of a query
Create a user-defined scalar function:

CREATE OR REPLACE FUNCTION test_scalar_udf(x INTEGER)
RETURNS INTEGER
AS
$$
  SELECT x + POW(2, 3)::INTEGER + 2
$$
;
This query uses the test_scalar_udf function in an equality predicate. To improve performance, make sure the EQUALITY search method is enabled for the mycol column in the test_so_scalar_function_udf table.

SELECT *
  FROM test_so_scalar_function_udf
  WHERE mycol = test_scalar_udf(15750);
Was this page helpful?

Speeding up text queries with search optimization
Enterprise Edition Feature

This feature requires Enterprise Edition (or higher). To inquire about upgrading, please contact Snowflake Support.

Search optimization can improve the performance of queries that use the SEARCH and SEARCH_IP functions. These queries search for character data (text) and IP addresses in specified columns from one or more tables, including elements in VARIANT, OBJECT, and ARRAY columns.

The following sections provide more information about search optimization support for text queries:

Enabling search optimization for text queries

Conditions for runtime use of FULL_TEXT search optimization

Examples of ADD (and DROP) FULL_TEXT search optimization

Enabling search optimization for text queries
To improve the performance of text queries on a table, use the ON FULL_TEXT clause in the ALTER TABLE … ADD SEARCH OPTIMIZATION command for specific columns. Enabling search optimization at the table level doesn’t enable it for queries that use the SEARCH or SEARCH_IP function.

For example:

ALTER TABLE lines ADD SEARCH OPTIMIZATION
  ON FULL_TEXT(play, character, line);
For more information, see Enabling and disabling search optimization.

Conditions for runtime use of FULL_TEXT search optimization
After you have enabled FULL_TEXT search optimization on a table that is queried with the SEARCH function, the search access path for the optimization can be used during query planning and execution. The following conditions must be met:

The search optimization must be ready for use (active column = TRUE in the DESCRIBE SEARCH OPTIMIZATION output).

The search optimization must be enabled on a superset of the columns specified in the SEARCH predicate. For example, if a table contains VARCHAR columns c1,c2,c3,c4,c5, the search optimization covers columns c1,c2,c3, and the function searches one, two, or three of those columns (but not c4 or c5), the query can benefit from FULL_TEXT search optimization.

The analyzer defined for the search optimization in the ALTER TABLE command must be the same as the analyzer specified in the SEARCH function call.

Tip

To find out if a specific search access path was used for a query, look for a Search Optimization Access node in the query profile.

Examples of ADD (and DROP) FULL_TEXT search optimization
The following examples show how to enable FULL_TEXT search optimization on columns in a table to improve query performance when the SEARCH function is used to query those columns.

Enable FULL_TEXT search optimization with a specific analyzer
The following example enables FULL_TEXT search optimization on one column and specifies an analyzer. The combination of optimization type and analyzer (method) is reflected in the DESCRIBE output.

ALTER TABLE lines ADD SEARCH OPTIMIZATION
  ON FULL_TEXT(line, ANALYZER => 'UNICODE_ANALYZER');
DESCRIBE SEARCH OPTIMIZATION ON lines;
+---------------+----------------------------+--------+------------------+--------+
| expression_id | method                     | target | target_data_type | active |
|---------------+----------------------------+--------+------------------+--------|
|             1 | FULL_TEXT UNICODE_ANALYZER | LINE   | VARCHAR(2000)    | true   |
+---------------+----------------------------+--------+------------------+--------+
If you enable FULL_TEXT search optimization on the same column with the default analyzer, the DESCRIBE output returns two rows and differentiates the two entries by expression ID and method.

ALTER TABLE lines ADD SEARCH OPTIMIZATION
  ON FULL_TEXT(line);
DESCRIBE SEARCH OPTIMIZATION ON lines;
+---------------+----------------------------+--------+------------------+--------+
| expression_id | method                     | target | target_data_type | active |
|---------------+----------------------------+--------+------------------+--------|
|             1 | FULL_TEXT UNICODE_ANALYZER | LINE   | VARCHAR(2000)    | true   |
|             2 | FULL_TEXT DEFAULT_ANALYZER | LINE   | VARCHAR(2000)    | false  |
+---------------+----------------------------+--------+------------------+--------+
Enable FULL_TEXT search optimization on a VARIANT column
The following command enables FULL_TEXT search optimization on a VARIANT column. (This car_sales table and its data are described under Querying Semi-structured Data.)

ALTER TABLE car_sales ADD SEARCH OPTIMIZATION
  ON FULL_TEXT(src);

DESCRIBE SEARCH OPTIMIZATION ON car_sales;
+---------------+----------------------------+--------+------------------+--------+
| expression_id | method                     | target | target_data_type | active |
|---------------+----------------------------+--------+------------------+--------|
|             1 | FULL_TEXT DEFAULT_ANALYZER | SRC    | VARIANT          | true   |
+---------------+----------------------------+--------+------------------+--------+
Enable FULL_TEXT search optimization on an OBJECT column
The following example enables FULL_TEXT search optimization on an OBJECT column.

First, create a table with an OBJECT column and insert data:

CREATE OR REPLACE TABLE so_object_example (object_column OBJECT);

INSERT INTO so_object_example (object_column)
  SELECT OBJECT_CONSTRUCT('a', 1::VARIANT, 'b', 2::VARIANT);
The following command enables FULL_TEXT search optimization on the OBJECT column.

ALTER TABLE so_object_example ADD SEARCH OPTIMIZATION
  ON FULL_TEXT(object_column);

DESCRIBE SEARCH OPTIMIZATION ON so_object_example;
+---------------+----------------------------+---------------+------------------+--------+
| expression_id | method                     | target        | target_data_type | active |
|---------------+----------------------------+---------------+------------------+--------|
|             1 | FULL_TEXT DEFAULT_ANALYZER | OBJECT_COLUMN | OBJECT           | true   |
+---------------+----------------------------+---------------+------------------+--------+
Enable FULL_TEXT search optimization on an ARRAY column
The following example enables FULL_TEXT search optimization on an ARRAY column.

First, create a table with an ARRAY column and insert data:

CREATE OR REPLACE TABLE so_array_example (array_column ARRAY);

INSERT INTO so_array_example (array_column)
  SELECT ARRAY_CONSTRUCT('a', 'b', 'c');
The following command enables FULL_TEXT search optimization on the ARRAY column.

ALTER TABLE so_array_example ADD SEARCH OPTIMIZATION
  ON FULL_TEXT(array_column);

DESCRIBE SEARCH OPTIMIZATION ON so_array_example;
+---------------+----------------------------+--------------+------------------+--------+
| expression_id | method                     | target       | target_data_type | active |
|---------------+----------------------------+--------------+------------------+--------|
|             1 | FULL_TEXT DEFAULT_ANALYZER | ARRAY_COLUMN | ARRAY            | true   |
+---------------+----------------------------+--------------+------------------+--------+
Drop FULL_TEXT optimization from one or more columns
You can enable FULL_TEXT optimization on multiple columns, then later drop the optimization from one or more of those columns. The remaining columns are still optimized.

ALTER TABLE lines ADD SEARCH OPTIMIZATION
  ON FULL_TEXT(play, act_scene_line, character, line, ANALYZER => 'UNICODE_ANALYZER');

DESCRIBE SEARCH OPTIMIZATION ON lines;
+---------------+----------------------------+----------------+------------------+--------+
| expression_id | method                     | target         | target_data_type | active |
|---------------+----------------------------+----------------+------------------+--------|
|             1 | FULL_TEXT UNICODE_ANALYZER | PLAY           | VARCHAR(50)      | true   |
|             2 | FULL_TEXT UNICODE_ANALYZER | ACT_SCENE_LINE | VARCHAR(10)      | true   |
|             3 | FULL_TEXT UNICODE_ANALYZER | CHARACTER      | VARCHAR(30)      | true   |
|             4 | FULL_TEXT UNICODE_ANALYZER | LINE           | VARCHAR(2000)    | true   |
+---------------+----------------------------+----------------+------------------+--------+
ALTER TABLE lines DROP SEARCH OPTIMIZATION ON 1, 2, 3;
DESCRIBE SEARCH OPTIMIZATION ON lines;
+---------------+----------------------------+--------+------------------+--------+
| expression_id | method                     | target | target_data_type | active |
|---------------+----------------------------+--------+------------------+--------|
|             4 | FULL_TEXT UNICODE_ANALYZER | LINE   | VARCHAR(2000)    | true   |
+---------------+----------------------------+--------+------------------+--------+
Use the wildcard (*) to enable search optimization on all qualifying columns
The following ALTER TABLE command enables FULL_TEXT search optimization on all four VARCHAR columns in the lines table:

ALTER TABLE lines ADD SEARCH OPTIMIZATION
  ON FULL_TEXT(*);
DESCRIBE SEARCH OPTIMIZATION ON lines;
+---------------+----------------------------+----------------+------------------+--------+
| expression_id | method                     | target         | target_data_type | active |
|---------------+----------------------------+----------------+------------------+--------|
|             1 | FULL_TEXT DEFAULT_ANALYZER | PLAY           | VARCHAR(50)      | true   |
|             2 | FULL_TEXT DEFAULT_ANALYZER | ACT_SCENE_LINE | VARCHAR(10)      | true   |
|             3 | FULL_TEXT DEFAULT_ANALYZER | CHARACTER      | VARCHAR(30)      | true   |
|             4 | FULL_TEXT DEFAULT_ANALYZER | LINE           | VARCHAR(2000)    | true   |
+---------------+----------------------------+----------------+------------------+--------+
Expected error when enabling FULL_TEXT optimization
The following ALTER TABLE command fails with an expected error because one of the specified columns is a NUMBER column:

ALTER TABLE lines ADD SEARCH OPTIMIZATION
  ON FULL_TEXT(play, speech_num, act_scene_line, character, line);
001128 (42601): SQL compilation error: error line 1 at position 76
Expression FULL_TEXT(IDX_SRC_TABLE.SPEECH_NUM) cannot be used in search optimization.
Speeding up substring and regular expression queries with search optimization
Enterprise Edition Feature

This feature requires Enterprise Edition (or higher). To inquire about upgrading, please contact Snowflake Support.

Search optimization can improve the performance of queries with predicates that search for substrings or use regular expressions in text or semi-structured data. For details on how substring searches work with semi-structured data, see Speeding up queries of semi-structured data with search optimization.

The following sections provide more information about search optimization support for substring and regular expression queries:

Enabling search optimization for substring and regular expression queries

Supported predicates

Enabling search optimization for substring and regular expression queries
To improve the performance of substring and regular expression queries on a table, use the ON SUBSTRING clause in the ALTER TABLE … ADD SEARCH OPTIMIZATION command for specific columns.

For example:

ALTER TABLE mytable ADD SEARCH OPTIMIZATION ON SUBSTRING(mycol);
For more information, see Enabling and disabling search optimization.

Supported predicates
The search optimization service can improve the performance of queries with predicates that use:

LIKE

LIKE ANY

LIKE ALL

ILIKE

ILIKE ANY

CONTAINS

ENDSWITH

STARTSWITH

SPLIT_PART

RLIKE

REGEXP

REGEXP_LIKE

The search optimization service can improve performance when searching for substrings that are five or more characters long. (More selective substrings can result in better performance.) The search optimization service doesn’t use search access paths for the following predicate because the substring is shorter than five characters:

LIKE '%TEST%'
For the following predicate, the search optimization service can optimize this query, using search access paths to search for the substrings for SEARCH and OPTIMIZED. However, search access paths are not used for IS because the substring is shorter than five characters.

LIKE '%SEARCH%IS%OPTIMIZED%'
For queries that use RLIKE, REGEXP, and REGEXP_LIKE against text:

The subject argument must be a TEXT column in a table that has search optimization enabled.

The pattern argument must be a string constant.

For regular expressions, the search optimization service works best when:

The pattern contains at least one substring literal that is five or more characters long.

The pattern specifies that the substring should appear at least once.

For example, the following pattern specifies that string should appear one or more times in the subject:

RLIKE '(string)+'
The search optimization service can improve the performance of queries with the following patterns because each predicate specifies that a substring of five or more characters must appear at least once. (Note that the first example uses a dollar-quoted string constant to avoid escaping the backslash characters.)

RLIKE $$.*email=[\w\.]+@snowflake\.com.*$$
RLIKE '.*country=(Germany|France|Spain).*'
RLIKE '.*phone=[0-9]{3}-?[0-9]{3}-?[0-9]{4}.*'
In contrast, search optimization does not use search access paths for queries with the following patterns:

Patterns without any substrings:

RLIKE '.*[0-9]{3}-?[0-9]{3}-?[0-9]{4}.*'
Patterns that only contain substrings shorter than five characters:

RLIKE '.*tel=[0-9]{3}-?[0-9]{3}-?[0-9]{4}.*'
Patterns that use the alternation operator where one option is a substring shorter than five characters:

RLIKE '.*(option1|option2|opt3).*'
Patterns in which the substring is optional:

RLIKE '.*[a-zA-z]+(string)?[0-9]+.*'
Even when the substring literals are shorter than five characters, the search optimization service can still improve query performance if expanding the regular expression produces a substring literal that is five characters or longer.

For example, consider the pattern:

.*st=(CA|AZ|NV).*(-->){2,4}.*
In this example:

Although the substring literals (e.g. st=, CA, etc) are shorter than five characters, the search optimization service recognizes that the substring st=CA, st=AZ, or st=NV (each of which is five characters long) must appear in the text.

Similarly, even though the substring literal --> is shorter than five characters, the search optimization service determines that the substring -->--> (which is longer than five characters) must appear in the text.

The search optimization service can use search access paths to match these substrings, which can improve the performance of the query.

Was this page helpful?

Yes
Speeding up queries of semi-structured data with search optimization
Enterprise Edition Feature

This feature requires Enterprise Edition (or higher). To inquire about upgrading, please contact Snowflake Support.

The search optimization service can improve the performance of point lookup and substring queries on semi-structured data in Snowflake tables (that is, data in VARIANT, OBJECT, and ARRAY columns). You can configure search optimization on columns of these types even when the structure is deeply nested and changes frequently. You can also enable search optimization for specific elements within a semi-structured column.

The following sections provide more information about search optimization support for queries of semi-structured data:

Enabling search optimization for queries of semi-structured data

Supported data types for constants and casts in predicates for semi-structured types

Support for semi-structured data type values cast to VARCHAR

Supported predicates for point lookups on VARIANT types

Substring search in VARIANT types

Current limitations in support for semi-structured types

Enabling search optimization for queries of semi-structured data
To improve the performance for queries of semi-structured data on a table, use the ON clause in the ALTER TABLE … ADD SEARCH OPTIMIZATION command for specific columns or elements in columns. Queries against VARIANT, OBJECT, and ARRAY columns aren’t optimized if you omit the ON clause. Enabling search optimization at the table level doesn’t enable it for columns with semi-structured data types.

For example:

ALTER TABLE mytable ADD SEARCH OPTIMIZATION ON EQUALITY(myvariantcol);
ALTER TABLE t1 ADD SEARCH OPTIMIZATION ON EQUALITY(c4:user.uuid);

ALTER TABLE mytable ADD SEARCH OPTIMIZATION ON SUBSTRING(myvariantcol);
ALTER TABLE t1 ADD SEARCH OPTIMIZATION ON SUBSTRING(c4:user.uuid);

ALTER TABLE mytable ADD SEARCH OPTIMIZATION ON EQUALITY(object_column);
ALTER TABLE mytable ADD SEARCH OPTIMIZATION ON SUBSTRING(object_column);

ALTER TABLE mytable ADD SEARCH OPTIMIZATION ON EQUALITY(array_column);
ALTER TABLE mytable ADD SEARCH OPTIMIZATION ON SUBSTRING(array_column);
For more information, see Enabling and disabling search optimization.

Supported data types for constants and casts in predicates for semi-structured types
The search optimization service can improve the performance of point lookups of semi-structured data where the following types are used for the constant and the implicit or explicit cast for the element:

FIXED (including casts that specify a valid precision and scale)

INTEGER (including synonymous types)

VARCHAR (including synonymous types)

DATE (including casts that specify a scale)

TIME (including casts that specify a scale)

TIMESTAMP, TIMESTAMP_LTZ, TIMESTAMP_NTZ, TIMESTAMP_TZ (including casts that specify a scale)

The search optimization service supports the casting of types using:

CAST and the :: operator

TRY_CAST

Support for semi-structured data type values cast to VARCHAR
The search optimization service can also improve the performance of point lookups in which columns with semi-structured data types are cast to VARCHAR and are compared to constants that are cast to VARCHAR.

For example, suppose that src is a VARIANT column containing BOOLEAN, DATE, and TIMESTAMP values that have been converted to VARIANT:

CREATE OR REPLACE TABLE test_table
(
  id INTEGER,
  src VARIANT
);

INSERT INTO test_table SELECT 1, TO_VARIANT('true'::BOOLEAN);
INSERT INTO test_table SELECT 2, TO_VARIANT('2020-01-09'::DATE);
INSERT INTO test_table SELECT 3, TO_VARIANT('2020-01-09 01:02:03.899'::TIMESTAMP);
For this table, the search optimization service can improve the following queries, which cast the VARIANT column to VARCHAR and compare the column to string constants:

SELECT * FROM test_table WHERE src::VARCHAR = 'true';
SELECT * FROM test_table WHERE src::VARCHAR = '2020-01-09';
SELECT * FROM test_table WHERE src::VARCHAR = '2020-01-09 01:02:03.899';
Supported predicates for point lookups on VARIANT types
The search optimization service can improve point lookup queries with the types of predicates listed below. In the examples below, src is the column with a semi-structured data type, and path_to_element is a path to an element in the column with a semi-structured data type.

Equality predicates of the following form:

WHERE path_to_element[::target_data_type] = constant

In this syntax, target_data_type (if specified) and the data type of constant must be one of the supported types.

For example, the search optimization service supports:

Matching a VARIANT element against a NUMBER constant without explicitly casting the element.

WHERE src:person.age = 42;
Explicitly casting a VARIANT element to NUMBER with a specified precision and scale.

WHERE src:location.temperature::NUMBER(8, 6) = 23.456789;
Matching a VARIANT element against a VARCHAR constant without explicitly casting the element.

WHERE src:sender_info.ip_address = '123.123.123.123';
Explicitly casting a VARIANT element to VARCHAR.

WHERE src:salesperson.name::VARCHAR = 'John Appleseed';
Explicitly casting a VARIANT element to DATE.

WHERE src:events.date::DATE = '2021-03-26';
Explicitly casting a VARIANT element to TIMESTAMP with a specified scale.

WHERE src:event_logs.exceptions.timestamp_info(3) = '2021-03-26 15:00:00.123 -0800';
Matching an ARRAY element against a value of a supported type, with or without explicitly casting to the type. For example:

WHERE my_array_column[2] = 5;

WHERE my_array_column[2]::NUMBER(4, 1) = 5;
Matching an OBJECT element against a value of a supported type, with or without explicitly casting to the type. For example:

WHERE object_column['mykey'] = 3;

WHERE object_column:mykey = 3;

WHERE object_column['mykey']::NUMBER(4, 1) = 3;

WHERE object_column:mykey::NUMBER(4, 1) = 3;
Predicates that use the ARRAY functions, such as:

WHERE ARRAY_CONTAINS(value_expr, array)

In this syntax, value_expr must not be NULL and must evaluate to VARIANT. The data type of the value must be one of the supported types.

For example:

WHERE ARRAY_CONTAINS('77.146.211.88'::VARIANT, src:logs.ip_addresses)
In this example, the value is a constant that is implicitly cast to a VARIANT:

WHERE ARRAY_CONTAINS(300, my_array_column)
WHERE ARRAYS_OVERLAP(ARRAY_CONSTRUCT(constant_1, constant_2, .., constant_N), array)

The data type of each constant (constant_1, constant_2, and so on) must be one of the supported types. The constructed ARRAY can include NULL constants.

In this example, the array is in a VARIANT value:

WHERE ARRAYS_OVERLAP(
  ARRAY_CONSTRUCT('122.63.45.75', '89.206.83.107'), src:senders.ip_addresses)
In this example, the array is an ARRAY column:

WHERE ARRAYS_OVERLAP(
  ARRAY_CONSTRUCT('a', 'b'), my_array_column)
The following predicates that check for NULL values:

WHERE IS_NULL_VALUE(path_to_element)

Note that IS_NULL_VALUE applies to JSON null values and not to SQL NULL values.

WHERE path_to_element IS NOT NULL

WHERE semistructured_column IS NULL

where semistructured_column refers to the column and not a path to an element in the semi-structured data.

For example, the search optimization service supports using the VARIANT column src but not the path to the element src:person.age in that VARIANT column.

Substring search in VARIANT types
The search optimization service can optimize wildcard or regular expression searches in semi-structured columns — that is, VARIANT, OBJECT, and ARRAY columns — or elements in such columns.

The search optimization service can optimize predicates that use the following functions:

LIKE

LIKE ANY

LIKE ALL

ILIKE

ILIKE ANY

CONTAINS

ENDSWITH

STARTSWITH

SPLIT_PART

RLIKE

REGEXP

REGEXP_LIKE

You can enable substring search optimization for a column or for multiple individual elements within a column. For example, the following statement enables substring search optimization for a nested element in a column:

ALTER TABLE test_table ADD SEARCH OPTIMIZATION ON SUBSTRING(col2:data.search);
After the search access path has been built, the following query can be optimized:

SELECT * FROM test_table WHERE col2:data.search LIKE '%optimization%';
However, the following queries aren’t optimized because the WHERE clause filters don’t apply to the element that was specified when search optimization was enabled (col2:data.search):

SELECT * FROM test_table WHERE col2:name LIKE '%simon%parker%';
SELECT * FROM test_table WHERE col2 LIKE '%hello%world%';
You can specify multiple elements to be optimized. In the following example, search optimization is enabled for two specific elements in the column col2:

ALTER TABLE test_table ADD SEARCH OPTIMIZATION ON SUBSTRING(col2:name);
ALTER TABLE test_table ADD SEARCH OPTIMIZATION ON SUBSTRING(col2:data.search);
If you enable search optimization for a given element, it is enabled for any nested elements. The second ALTER TABLE statement below is redundant because the first statement enables search optimization for the entire data element, including the nested search element.

ALTER TABLE test_table ADD SEARCH OPTIMIZATION ON SUBSTRING(col2:data);
ALTER TABLE test_table ADD SEARCH OPTIMIZATION ON SUBSTRING(col2:data.search);
Similarly, enabling search optimization for an entire column allows all substring searches on that column to be optimized, including elements nested to any depth within it.

For an example that enables FULL_TEXT search optimization on a VARIANT column in the car_sales table and its data, which is described in Querying Semi-structured Data, see Enable FULL_TEXT search optimization on a VARIANT column.

How constants are evaluated for VARIANT substring searches
When it evaluates the constant string in a query — for example, LIKE 'constant_string' — the search optimization service splits the string into tokens by using the following characters as delimiters:

Square brackets ([ and ]).

Curly braces ({ and }).

Colons (:).

Commas (,).

Double quotes (").

After it splits the string into tokens, the search optimization service considers only tokens that are at least five characters long. The following table explains how the search optimization service handles various predicate examples:

Example of a predicate

How the search optimization service handles the query

LIKE '%TEST%'

The search optimization service doesn’t use search access paths for the following predicate because the substring is shorter than five characters.

LIKE '%SEARCH%IS%OPTIMIZED%'

The search optimization service can optimize this query, by using search access paths to search for SEARCH and OPTIMIZED but not IS. IS is shorter than five characters.

LIKE '%HELLO_WORLD%'

The search optimization service can optimize this query, by using search access paths to search for HELLO_WORLD.

LIKE '%COL:ON:S:EVE:RYWH:ERE%'

The search optimization service splits this string into COL, ON, S, EVE, RYWH, ERE. Because all of these tokens are shorter than five characters, the search optimization service can’t optimize this query.

LIKE '%{\"KEY01\":{\"KEY02\":\"value\"}%'

The search optimization service splits this string into the tokens KEY01, KEY02, VALUE and uses the tokens when it optimizes the query.

LIKE '%quo\"tes_and_com,mas,\"are_n\"ot\"_all,owed%'

The search optimization service splits this string into the tokens quo, tes_and_com, mas, are_n, ot, _all, owed. The search optimization service can only use the tokens that are five characters or longer (tes_and_com, are_n) when it optimizes the query.

Current limitations in support for semi-structured types
Support for semi-structured types in the search optimization service is limited in the following ways:

Predicates of the form path_to_element IS NULL aren’t supported.

Predicates where the constants are results of scalar subqueries aren’t supported.

Predicates that specify paths to elements that contain sub-elements aren’t supported.

Predicates that use the XMLGET function aren’t supported.

The current limitations of the search optimization service also apply to semi-structured types.

Was this page helpful?

Yes
Speeding up queries of structured data with search optimization
Enterprise Edition Feature

This feature requires Enterprise Edition or higher. To inquire about upgrading, please contact Snowflake Support.

The search optimization service can improve the performance of point-lookup and substring queries on structured data in Snowflake tables; that is, data in structured ARRAY, OBJECT, and MAP columns. You can configure search optimization on columns of these types even when the structure is deeply nested and changes frequently. You can also enable search optimization for specific elements within a structured column.

The following sections provide more information about search optimization support for queries of structured data:

Enabling search optimization for queries of structured data

Supported predicates for point lookups on structured types

Substring search in structured types

Schema evolution support

Current limitations in support for structured types

Enabling search optimization for queries of structured data
To improve the performance for queries of structured data types on a table, use the ON clause in the ALTER TABLE … ADD SEARCH OPTIMIZATION command for specific columns or elements in columns. Queries against structured ARRAY, OBJECT, and MAP columns aren’t optimized if you omit the ON clause. Enabling search optimization at the table level doesn’t enable it for columns with structured data types.

For example:

ALTER TABLE mytable ADD SEARCH OPTIMIZATION ON SUBSTRING(array_column);
ALTER TABLE mytable ADD SEARCH OPTIMIZATION ON EQUALITY(array_column[1]);

ALTER TABLE mytable ADD SEARCH OPTIMIZATION ON EQUALITY(object_column);
ALTER TABLE mytable ADD SEARCH OPTIMIZATION ON SUBSTRING(object_column:key);

ALTER TABLE mytable ADD SEARCH OPTIMIZATION ON EQUALITY(map_column);
ALTER TABLE mytable ADD SEARCH OPTIMIZATION ON EQUALITY(map_column:user.uuid);
The following rules apply to the keywords you use in these ALTER TABLE … ADD SEARCH OPTIMIZATION commands:

You can use the EQUALITY keyword with any inner element or the column itself.

You can use the SUBSTRING keyword only with inner elements that have text string data types.

For more information, see Enabling and disabling search optimization.

Supported data types for constants and casts in predicates for structured types
The search optimization service can improve the performance of point lookups of structured data where the following types are used for the constant and the implicit or explicit cast for the element:

FIXED (including casts that specify a valid precision and scale)

INTEGER (including synonymous types)

VARCHAR (including synonymous types)

DATE (including casts that specify a scale)

TIME (including casts that specify a scale)

TIMESTAMP, TIMESTAMP_LTZ, TIMESTAMP_NTZ, TIMESTAMP_TZ (including casts that specify a scale)

The search optimization service supports the casting of types by using the following conversion functions:

CAST and the :: operator

TRY_CAST

Supported predicates for point lookups on structured types
The search optimization service can improve point-lookup queries with the types of predicates shown in the following list. In the examples, src is the column with a structured data type, and path_to_element is a path to an element in the column with a structured data type:

Equality predicates of the following form:

WHERE path_to_element[::target_data_type] = constant

In this syntax, target_data_type (if specified) and the data type of constant must be one of the supported types.

For example, the search optimization service supports the following predicates:

Matching an OBJECT or MAP element against a NUMBER constant without explicitly casting the element:

WHERE src:person.age = 42;
Explicitly casting an OBJECT or MAP element to NUMBER with a specified precision and scale:

WHERE src:location.temperature::NUMBER(8, 6) = 23.456789;
Matching an OBJECT or MAP element against a VARCHAR constant without explicitly casting the element:

WHERE src:sender_info.ip_address = '123.123.123.123';
Explicitly casting an OBJECT or MAP element to VARCHAR:

WHERE src:salesperson.name::VARCHAR = 'John Appleseed';
Explicitly casting an OBJECT or MAP element to DATE:

WHERE src:events.date::DATE = '2021-03-26';
Explicitly casting an OBJECT or MAP element to TIMESTAMP with a specified scale:

WHERE src:event_logs.exceptions.timestamp_info(3) = '2021-03-26 15:00:00.123 -0800';
Matching an ARRAY element against a value of a supported type, with or without an explicit cast:

WHERE my_array_column[2] = 5;

WHERE my_array_column[2]::NUMBER(4, 1) = 5;
Matching an OBJECT or MAP element against a value of a supported type, with or without an explicit cast:

WHERE object_column['mykey'] = 3;

WHERE object_column:mykey = 3;

WHERE object_column['mykey']::NUMBER(4, 1) = 3;

WHERE object_column:mykey::NUMBER(4, 1) = 3;
Predicates that use the ARRAY functions, such as the following predicates:

WHERE ARRAY_CONTAINS(value_expr, array)

In this syntax, value_expr must not be NULL and must evaluate to VARIANT. The data type of the value must be one of the supported types:

WHERE ARRAY_CONTAINS('77.146.211.88'::VARIANT, src:logs.ip_addresses)
In this example, the value is a constant that is implicitly cast to an OBJECT:

WHERE ARRAY_CONTAINS(300, my_array_column)
WHERE ARRAYS_OVERLAP(ARRAY_CONSTRUCT(constant_1, constant_2, .., constant_N), array)

The data type of each constant — constant_1, constant_2, and so on — must be one of the supported types. The constructed ARRAY can include NULL constants.

In this example, the array is in an OBJECT value:

WHERE ARRAYS_OVERLAP(
  ARRAY_CONSTRUCT('122.63.45.75', '89.206.83.107'), src:senders.ip_addresses)
In this example, the array is in an ARRAY column:

WHERE ARRAYS_OVERLAP(
  ARRAY_CONSTRUCT('a', 'b'), my_array_column)
The following predicates check for NULL values:

WHERE IS_NULL_VALUE(path_to_element)

Note

IS_NULL_VALUE applies to JSON null values and not to SQL NULL values.

WHERE path_to_element IS NOT NULL

WHERE structured_column IS NULL

where structured_column refers to the column and not a path to an element in the structured data.

For example, the search optimization service supports using the OBJECT column src but not the path to the element src:person.age in that OBJECT column.

Substring search in structured types
You can enable substring search only if the target structured element is a text string data type.

For example, consider the following table:

CREATE TABLE t(
  col OBJECT(
    a INTEGER,
    b STRING,
    c MAP(INTEGER, STRING),
    d ARRAY(STRING)
  )
);
For this table, search optimization for SUBSTRING search can be added on the following target structured elements:

col:b because its type is STRING.

col:c[value] — for example, col:c[0], col:c[100] — if the values are text string types.

For this table, search optimization for SUBSTRING search can’t be added on the following target structured elements:

col because its type is structured OBJECT.

col:a because its type is INTEGER.

col:c because its type is MAP.

col:d because its type is ARRAY.

The search optimization service can optimize predicates that use the following functions:

LIKE

LIKE ANY

LIKE ALL

ILIKE

ILIKE ANY

CONTAINS

ENDSWITH

STARTSWITH

SPLIT_PART

RLIKE

REGEXP

REGEXP_LIKE

You can enable substring search optimization for a column or for multiple individual elements within a column. For example, the following statement enables substring search optimization for a nested element in a column:

ALTER TABLE test_table ADD SEARCH OPTIMIZATION ON SUBSTRING(col2:data.search);
After the search access path has been built, the following query can be optimized:

SELECT * FROM test_table WHERE col2:data.search LIKE '%optimization%';
However, the following queries aren’t optimized because the WHERE clause filters don’t apply to the element that was specified when search optimization was enabled (col2:data.search):

SELECT * FROM test_table WHERE col2:name LIKE '%simon%parker%';
SELECT * FROM test_table WHERE col2 LIKE '%hello%world%';
You can specify multiple elements to be optimized. In the following example, search optimization is enabled for two specific elements in the column col2:

ALTER TABLE test_table ADD SEARCH OPTIMIZATION ON SUBSTRING(col2:name);
ALTER TABLE test_table ADD SEARCH OPTIMIZATION ON SUBSTRING(col2:data.search);
If you enable search optimization for a given element, it is enabled for any unnested elements of a text string type. Search optimization isn’t enabled for nested elements or elements of non-text string types.

How constants are evaluated for structured substring searches
When it evaluates the constant string in a query — for example, LIKE 'constant_string' — the search optimization service splits the string into tokens by using the following characters as delimiters:

Square brackets ([ and ]).

Curly braces ({ and }).

Colons (:).

Commas (,).

Double quotes (").

After it splits the string into tokens, the search optimization service considers only tokens that are at least five characters long. The following table explains how the search optimization service handles various predicate examples:

Example of a predicate

How the search optimization service handles the query

LIKE '%TEST%'

The search optimization service doesn’t use search access paths for the following predicate because the substring is shorter than five characters.

LIKE '%SEARCH%IS%OPTIMIZED%'

The search optimization service can optimize this query, by using search access paths to search for SEARCH and OPTIMIZED but not IS. IS is shorter than five characters.

LIKE '%HELLO_WORLD%'

The search optimization service can optimize this query, by using search access paths to search for HELLO_WORLD.

LIKE '%COL:ON:S:EVE:RYWH:ERE%'

The search optimization service splits this string into COL, ON, S, EVE, RYWH, ERE. Because all of these tokens are shorter than five characters, the search optimization service can’t optimize this query.

LIKE '%{\"KEY01\":{\"KEY02\":\"value\"}%'

The search optimization service splits this string into the tokens KEY01, KEY02, VALUE and uses the tokens when it optimizes the query.

LIKE '%quo\"tes_and_com,mas,\"are_n\"ot\"_all,owed%'

The search optimization service splits this string into the tokens quo, tes_and_com, mas, are_n, ot, _all, owed. The search optimization service can only use the tokens that are five characters or longer (tes_and_com, are_n) when it optimizes the query.

Schema evolution support
The schema of structured columns can evolve over time. For more information about schema evolution, see ALTER ICEBERG TABLE … ALTER COLUMN … SET DATA TYPE (structured types).

As part of a single schema-evolution operation, the following modifications can occur:

Type widening

Reordering elements

Adding elements

Removing elements

Renaming elements

The search optimization service isn’t invalidated as part of the schema-evolution operation. Instead, the search optimization service handles operations in the following ways:

Type widening (for example, INT to NUMBER)
Search optimization access paths aren’t affected.

Adding elements
The newly added elements are automatically reflected in the existing search optimization access paths.

Removing elements
When elements are removed from a structured column, the search optimization service automatically drops access paths that are prefixed by the removed element.

For example, create a table with a column of OBJECT type, and then insert data:

CREATE OR REPLACE TABLE test_struct (
  a OBJECT(
    b INTEGER,
    c OBJECT(
      d STRING,
      e VARIANT
      )
  )
);

INSERT INTO test_struct (a) SELECT
  {
    'b': 100,
    'c': {
        'd': 'value1',
        'e': 'value2'
  }
  }::OBJECT(
    b INTEGER,
    c OBJECT(
        d STRING,
        e VARIANT
    )
);
To view the data, query the table:

SELECT * FROM test_struct;
+--------------------+
| A                  |
|--------------------|
| {                  |
|   "b": 100,        |
|   "c": {           |
|     "d": "value1", |
|     "e": "value2"  |
|   }                |
| }                  |
+--------------------+
The following statement removes element c from the object:

ALTER TABLE test_struct ALTER COLUMN a
  SET DATA TYPE OBJECT(
    b INTEGER);
When this statement runs, the access paths at a, a:c, a:c:d and a:c:e are dropped.

Renaming elements
When an element is renamed, the search optimization service automatically drops access paths prefixed by the renamed element and adds them back with the newly named path. This operation incurs an additional maintenance cost to process the newly added path in the search optimization service.

For example, create a table with a column of OBJECT type, and then insert data:

CREATE OR REPLACE TABLE test_struct (
  a OBJECT(
    b INTEGER,
    c OBJECT(
      d STRING,
      e VARIANT
      )
  )
);

INSERT INTO test_struct (a) SELECT
  {
    'b': 100,
    'c': {
        'd': 'value1',
        'e': 'value2'
  }
  }::OBJECT(
    b INTEGER,
    c OBJECT(
        d STRING,
        e VARIANT
    )
);
To view the data, query the table:

SELECT * FROM test_struct;
+--------------------+
| A                  |
|--------------------|
| {                  |
|   "b": 100,        |
|   "c": {           |
|     "d": "value1", |
|     "e": "value2"  |
|   }                |
| }                  |
+--------------------+
The following statement renames element c to c_new in the object:

ALTER TABLE test_struct ALTER COLUMN a
  SET DATA TYPE OBJECT(
    b INTEGER,
    c_new OBJECT(
      d STRING,
      e VARIANT
    )
  ) RENAME FIELDS;
The access paths at a, a:c, a:c:d, a:c:e are dropped and re-added as a, a:c_new, a:c_new:d, a:c_new:e.

Reordering elements
Search optimization access paths aren’t affected.

Current limitations in support for structured types
Support for structured types in the search optimization service is limited in the following ways:

Predicates of the form path_to_element IS NULL aren’t supported.

Predicates where the constants are results of scalar subqueries aren’t supported.

Predicates that specify paths to elements that contain sub-elements aren’t supported.

Predicates that use the XMLGET function aren’t supported.

Predicates that use the MAP_CONTAINS_KEY function aren’t supported.

The current limitations of the search optimization service also apply to structured types.

Was this page helpful?

Yes
Speeding up geospatial queries with search optimization
Enterprise Edition Feature

This feature requires Enterprise Edition (or higher). To inquire about upgrading, please contact Snowflake Support.

The search optimization service can improve the performance of queries with predicates that use geospatial functions with GEOGRAPHY objects.

The following sections provide more information about search optimization support for geospatial queries:

Enabling search optimization for geospatial queries

Supported predicates with geospatial functions

Other performance considerations

Examples that use geospatial functions

Note

GEOMETRY objects aren’t yet supported.

Enabling search optimization for geospatial queries
To improve the performance of geospatial queries on a table, use the ON GEO clause in the ALTER TABLE … ADD SEARCH OPTIMIZATION command for specific columns. Enabling search optimization at the table level doesn’t enable it for columns with geospatial data types.

For example:

ALTER TABLE mytable ADD SEARCH OPTIMIZATION ON GEO(mygeocol);
For more information, see Enabling and disabling search optimization.

Supported predicates with geospatial functions
For queries with predicates that use the following functions:

ST_INTERSECTS

ST_CONTAINS

ST_WITHIN

ST_DWITHIN

ST_COVERS

ST_COVEREDBY

The search optimization service can improve performance if:

One input expression is a GEOGRAPHY column in a table, and

The other input expression is a GEOGRAPHY constant (created through a conversion or constructor function).

For ST_DWITHIN, the distance argument is a non-negative REAL constant.

Note that this feature has the same limitations that apply to the search optimization service.

Other performance considerations
Because the search optimization service is designed for predicates that are highly selective and because predicates filter by proximity between geospatial objects, clustering geospatial objects by proximity in the table can result in better performance. You can cluster your data either by specifying the sort order when loading the data or by using Automatic Clustering, depending on whether the base table changes frequently:

Loading Pre-Sorted Data
If the data in your base table does not change often, you can specify the sort order when loading the data. You can then enable search optimization on the GEOGRAPHY column. For example:

CREATE TABLE new_table AS SELECT * FROM source_table ORDER BY st_geohash(geom);
ALTER TABLE new_table ADD SEARCH OPTIMIZATION ON GEO(geom);
After every large change made to your base data, you can manually re-sort the data.

Automatic clustering
If there are frequent updates to your base table, you can use the ALTER TABLE … CLUSTER BY … command to enable Automatic Clustering so the table is automatically reclustered as it changes.

The following example adds a new column geom_geohash of the type VARCHAR and stores the geohash or H3 index of the GEOGRAPHY column geom in that new column. It then enables Automatic Clustering with the new column as the cluster key. This approach will automatically recluster the parts of the table that change.

CREATE TABLE new_table AS SELECT *, ST_GEOHASH(geom) AS geom_geohash FROM source_table;
ALTER TABLE new_table CLUSTER BY (geom_geohash);
ALTER TABLE new_table ADD SEARCH OPTIMIZATION ON GEO(geom);
Examples that use geospatial functions
The following statements create and configure the table used in the examples in this section. The last statement uses the ON clause in ALTER TABLE … ADD SEARCH OPTIMIZATION command to add search optimization for the g1 GEOGRAPHY column.

CREATE OR REPLACE TABLE geospatial_table (id NUMBER, g1 GEOGRAPHY);
INSERT INTO geospatial_table VALUES
  (1, 'POINT(-122.35 37.55)'),
  (2, 'LINESTRING(-124.20 42.00, -120.01 41.99)'),
  (3, 'POLYGON((0 0, 2 0, 2 2, 0 2, 0 0))');
ALTER TABLE geospatial_table ADD SEARCH OPTIMIZATION ON GEO(g1);
Examples of supported predicates
The following query is an example of a query supported by the search optimization service. The search optimization service can use search access paths to improve the performance of this query:

SELECT id FROM geospatial_table WHERE
  ST_INTERSECTS(
    g1,
    TO_GEOGRAPHY('POLYGON((0 0, 1 0, 1 1, 0 1, 0 0))'));
The following are examples of additional predicates that are supported by the search optimization service:

...
  ST_INTERSECTS(
    TO_GEOGRAPHY('POLYGON((0 0, 1 0, 1 1, 0 1, 0 0))'),
    g1)
...
  ST_CONTAINS(
    TO_GEOGRAPHY('POLYGON((-74.17 40.64, -74.1796875 40.58, -74.09 40.58, -74.09 40.64, -74.17 40.64))'),
    g1)
...
  ST_CONTAINS(
    g1,
    TO_GEOGRAPHY('MULTIPOINT((0 0), (1 1))'))
...
  ST_WITHIN(
   TO_GEOGRAPHY('{"type" : "MultiPoint","coordinates" : [[-122.30, 37.55], [-122.20, 47.61]]}'),
   g1)
...
  ST_WITHIN(
    g1,
    TO_GEOGRAPHY('POLYGON((0 0, 1 0, 1 1, 0 1, 0 0))'))
...
  ST_COVERS(
    TO_GEOGRAPHY('POLYGON((-1 -1, -1 4, 4 4, 4 -1, -1 -1))'),
    g1)
...
  ST_COVERS(
    g1,
    TO_GEOGRAPHY('POINT(0 0)'))
...
  ST_COVEREDBY(
    TO_GEOGRAPHY('POLYGON((1 1, 2 1, 2 2, 1 2, 1 1))'),
    g1)
...
  ST_COVEREDBY(
    g1,
    TO_GEOGRAPHY('POINT(-122.35 37.55)'))
...
  ST_DWITHIN(
    TO_GEOGRAPHY('POLYGON((0 0, 1 0, 1 1, 0 1, 0 0))'),
    g1,
    100000)
...
  ST_DWITHIN(
    g1,
    TO_GEOGRAPHY('POLYGON((0 0, 1 0, 1 1, 0 1, 0 0))'),
    100000)
Examples of constructing GEOGRAPHY constants
The following are examples of predicates that use different conversion and constructor functions for the GEOGRAPHY constant.

...
  ST_INTERSECTS(
    g1,
    ST_GEOGRAPHYFROMWKT('POLYGON((0 0, 1 0, 1 1, 0 1, 0 0))'))
...
  ST_INTERSECTS(
    ST_GEOGFROMTEXT('POLYGON((0 0, 1 0, 1 1, 0 1, 0 0))'),
    g1)
...
  ST_CONTAINS(
    ST_GEOGRAPHYFROMEWKT('POLYGON((-74.17 40.64, -74.1796875 40.58, -74.09 40.58, -74.09 40.64, -74.17 40.64))'),
    g1)
...
  ST_WITHIN(
    ST_GEOGRAPHYFROMWKB('01010000006666666666965EC06666666666C64240'),
    g1)
...
  ST_COVERS(
    g1,
    ST_MAKEPOINT(0.2, 0.8))
...
  ST_INTERSECTS(
    g1,
    ST_MAKELINE(
      TO_GEOGRAPHY('MULTIPOINT((0 0), (1 1))'),
      TO_GEOGRAPHY('POINT(0.8 0.2)')))
...
  ST_INTERSECTS(
    ST_POLYGON(
      TO_GEOGRAPHY('SRID=4326;LINESTRING(0.0 0.0, 1.0 0.0, 1.0 2.0, 0.0 2.0, 0.0 0.0)')),
    g1)
...
  ST_WITHIN(
    g1,
    TRY_TO_GEOGRAPHY('POLYGON((-1 -1, -1 4, 4 4, 4 -1, -1 -1))'))
...
  ST_COVERS(
    g1,
    ST_GEOGPOINTFROMGEOHASH('s00'))
Was this page helpful?

Yes
How conjunctions (AND) and disjunctions (OR) work with search optimization
Enterprise Edition Feature

This feature requires Enterprise Edition (or higher). To inquire about upgrading, please contact Snowflake Support.

Search optimization can accelerate queries using conjunctions (AND operator) and disjunctions (OR operator) of supported predicates.

Conjunctions of supported predicates (AND)
For queries that use conjunctions of predicates (i.e., AND), query performance can be improved by search optimization if any of the predicates would benefit.

For example, suppose that a query has:

where condition_x and condition_y

Search optimization can improve performance if either condition separately returns a few rows (i.e., condition_x returns a few rows or condition_y returns a few rows).

If condition_x returns a few rows but condition_y returns many rows, the query performance can still benefit from search optimization.

Examples
If predicates are individually supported by the search optimization service, then they can be joined by the conjunction AND and still be supported by the search optimization service:

SELECT id, c1, c2, c3
  FROM test_table
  WHERE c1 = 1
    AND c3 = TO_DATE('2004-03-09')
  ORDER BY id;
DELETE and UPDATE (and MERGE) can also use the search optimization service:

DELETE FROM test_table WHERE id = 3;
UPDATE test_table SET c1 = 99 WHERE id = 4;
Disjunctions of supported predicates (OR)
For queries that use disjunctions of predicates (i.e., OR), query performance can be improved by search optimization if all predicates would benefit.

For example, suppose that a query has:

where condition_x or condition_y

Search optimization can improve performance if each condition separately returns a few rows (i.e., condition_x returns a few rows and condition_y returns a few rows).

If condition_x returns a few rows but condition_y returns many rows, the query performance does not benefit from search optimization.

In the case of disjunctions, each predicate in isolation is not decisive in the query. All predicates must be evaluated to determine whether search optimization can improve performance.

Was this page helpful?

Yes
Determining the benefits of search optimization
Enterprise Edition Feature

This feature requires Enterprise Edition (or higher). To inquire about upgrading, please contact Snowflake Support.

After you configure search optimization for your tables, you can assess the benefits of search optimization by querying the SEARCH_OPTIMIZATION_BENEFITS view.

This view provides information about the number of partitions pruned due to search optimization. To determine the efficacy of pruning, you can compare the number of partitions pruned in the partitions_pruned_additional column against the total number of partitions pruned (the sum of the values in the partitions_pruned_default column and the partitions_pruned_additional column).

For more information, see SEARCH_OPTIMIZATION_BENEFITS view.

Was this page helpful?

Yes
Search optimization cost estimation and management
Enterprise Edition Feature

This feature requires Enterprise Edition (or higher). To inquire about upgrading, please contact Snowflake Support.

The search optimization service impacts costs for both storage and compute resources:

Storage resources: The search optimization service creates a search access path data structure that requires space for each table on which search optimization is enabled. The storage cost of the search access path depends upon multiple factors, including:

The number of distinct values in the table. In the extreme case where all columns have data types that use the search access path, and all data values in each column are unique, the required storage can be as much as the original table’s size.

Typically, however, the size is approximately 1/4 of the original table’s size.

Compute resources:

Adding search optimization to a table consumes resources during the initial build phase.

Maintaining the search optimization service also requires resources. Resource consumption is higher when there is high churn (i.e. when large volumes of data in the table change). These costs are roughly proportional to the amount of data ingested (added or changed). Deletes also have some cost.

Automatic clustering, while improving the latency of queries in tables with search optimization, can further increase the maintenance costs of search optimization. If a table has a high churn rate, enabling automatic clustering and configuring search optimization for the table can result in higher maintenance costs than if the table is just configured for search optimization.

Snowflake ensures efficient credit usage by billing your account only for the actual resources used. Billing is calculated in 1-second increments.

See the “Serverless Feature Credit Table” in the Snowflake Service Consumption Table for the costs per compute hour.

Once you enable the search optimization service, you can view the costs for your use of the service.

Tip

Snowflake recommends starting slowly with this feature (i.e. adding search optimization to only a few tables at first) and closely monitoring the costs and benefits.

Estimating the costs of search optimization
To estimate the cost of adding search optimization to a table and configuring specific columns for search optimization, use the SYSTEM$ESTIMATE_SEARCH_OPTIMIZATION_COSTS function.

In general, the costs are proportional to:

The number of columns on which the feature is enabled and the number of distinct values in those columns.

The amount of data that changes in these tables.

Important

Cost estimates returned by the SYSTEM$ESTIMATE_SEARCH_OPTIMIZATION_COSTS function are best efforts. The actual realized costs can vary by up to 50% (or, in rare cases, by several times) from the estimated costs.

Build and storage cost estimates are based on sampling a subset of the rows in the table

Maintenance cost estimates are based on recent create, delete, and update activity in the table

Viewing the costs of search optimization
You can view the actual billed costs for the search optimization service by using either the web interface or SQL. See Exploring compute cost.

Reducing the costs of search optimization
You can control the cost of the search optimization service by carefully choosing the tables and columns for which to enable search optimization.

In addition, to reduce the cost of the search optimization service:

Snowflake recommends batching DML operations on the table:

DELETE: If tables store data for the most recent time period (e.g. the most recent day or week or month), then when you trim your table by deleting old data, the search optimization service must take into account the updates. In some cases, you might be able to reduce costs by deleting less frequently (e.g. daily rather than hourly).

INSERT, UPDATE, and MERGE: Batching these types of DML statements on the table can reduce the cost of maintenance by the search optimization service.

If you recluster the entire table, consider dropping the SEARCH OPTIMIZATION property for that table before reclustering, and then add the SEARCH OPTIMIZATION property back to the table after reclustering.

Before enabling search optimization for substring searches (ON SUBSTRING(col)) or VARIANTs (ON EQUALITY(variant_col)), call SYSTEM$ESTIMATE_SEARCH_OPTIMIZATION_COSTS to estimate the costs. The initial build and maintenance for these search methods can be computationally intensive, so you should assess the trade-off between performance and cost.

Was this page helpful?

Yes
Working with search-optimized tables
Enterprise Edition Feature

This feature requires Enterprise Edition (or higher). To inquire about upgrading, please contact Snowflake Support.

Search optimization is generally transparent to users. Queries work the same; some are just faster. However, it is important to be aware of possible effects of other table operations on the search optimization service, or the reverse.

Modifying the table
A search access path becomes invalid if the default value of a column is changed.

To use search optimization again after a search access path has become invalid, you must drop the SEARCH OPTIMIZATION property and add the SEARCH OPTIMIZATION property back to the table.

A search access path remains valid if you add, drop, or rename a column:

If you enabled search optimization for an entire table without specifying specific columns, then when you add a column to a table, the new column is added to the search access path automatically. However, if you used the ON clause when enabling search optimization for a column, new columns are not added automatically.

When you drop a column from a table, the dropped column is removed from the search access path automatically.

Renaming a column doesn’t require any changes to the search access path.

If you drop a table, the SEARCH OPTIMIZATION property and search access paths are also dropped. Note that:

Undropping the table immediately reestablishes search optimization as a property of the table.

When you drop a table, the search access path has the same data retention period as the table.

If you drop the SEARCH OPTIMIZATION property from the table, the search access path is removed. When you add the SEARCH OPTIMIZATION property back to the table, the maintenance service needs to recreate the search access path. (There is no way to undrop the property.)

Cloning the table, schema, or database
If you clone a table, schema, or database, the SEARCH OPTIMIZATION property and search access paths of each table are also cloned. Cloning a table, schema, or database creates a zero-copy clone of each table and its corresponding search access paths. However, if the search access path for a table is out-of-date at the time the clone is created, both the original table and the cloned table incur the maintenance costs for the search optimization service to update the search access path.

The search access path might be out-of-date if a DML operation significantly modifies a table just before the clone operation. For example, if an INSERT statement results in a large increase in the size of the original table, the search access path requires maintenance to reflect this change.

A zero-copy clone isn’t created for search access paths of replicated cloned tables. For more information, see Working with tables in a secondary database (database replication support).

To avoid or minimize the costs of search optimization maintenance tasks on the cloned table, follow one or both of these steps:

If you need to leave search optimization enabled on the cloned table, verify that the search access path is up-to-date before executing the CREATE TABLE … CLONE statement. Otherwise, skip to the next step.

In most cases, you can execute a SHOW TABLES statement and check the value in the SEARCH_OPTIMIZATION_PROGRESS column. If the column’s value is 100, the search access path is up-to-date. However, maintenance might be incurred if the search access path is being compacted to remove information pertaining to deleted source table data.

Disable the search optimization service on the cloned table immediately after the clone is created. For example, to disable the search optimization service on table t1, execute the following statement:

ALTER TABLE t1 DROP SEARCH OPTIMIZATION;
For more information, see Search optimization actions (searchOptimizationAction) in the ALTER TABLE topic.

If you use CREATE TABLE … LIKE to create a new empty table with the same columns as the original table, the SEARCH OPTIMIZATION property is not copied to the new table.

Working with tables in a secondary database (database replication support)
If a table in the primary database has the SEARCH OPTIMIZATION property enabled, the property is replicated to the corresponding table in the secondary database.

Search access paths in the secondary database aren’t replicated but are instead rebuilt automatically. This also applies to replicated cloned tables. Replication doesn’t create zero-copy clone for cloned search access paths but fully rebuilds them in the secondary database automatically. Subsequent maintenance on the cloned search access paths isn’t replicated from the primary database but is performed in the secondary database. This process incurs the same kinds of costs described in Search optimization cost estimation and management.

Sharing tables
Data providers can use Secure Data Sharing to share tables that have search optimization enabled.

When querying shared tables, data consumers can benefit from any performance improvements made by the search optimization service.

Masking policies and row access policies
The search optimization service is fully compatible with tables that use masking policies and row access policies.

However, when search optimization is enabled, a user who is prevented from seeing a value due to a masking policy or row access policy might be able to deduce with greater certainty whether that value exists. With or without search optimization, differences in query latency can provide hints about the presence or absence of data restricted by a policy, which may constitute a security issue depending on the sensitivity of the data. This effect can be magnified by search optimization since it can make a query that does not return results even faster.

For example, suppose that a row access policy prevents a user from accessing rows with country = 'US', but the data does not include rows with country = 'US'. Now suppose that search optimization is enabled for the country column and that the user runs a query with WHERE country = 'US'. The query returns empty results as expected, but the query might run faster with search optimization than without. In this case, the user can more easily infer that the data does not contain any rows where country = 'US' based on the time taken to run the query.