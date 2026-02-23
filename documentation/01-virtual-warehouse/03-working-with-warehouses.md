Working with warehouses
All warehouse tasks can be performed from the Snowflake web interface or using the DDL commands for warehouses.

Creating a warehouse
You can create a warehouse using the Snowsight or SQL:

Snowsight
In the navigation menu, select Compute » Warehouses » Warehouse

SQL
Execute a CREATE WAREHOUSE command.

Python
Use the WarehouseCollection.create API (Creating a warehouse).

When you create a warehouse, you can specify whether the warehouse is created initially in the “Started” (i.e. running) or “Suspended” state. If you choose “Started”, the warehouse starts consuming credits once all the compute resources are provisioned for the warehouse.

Note

If you choose to create a warehouse in the “Started” state, the warehouse may take some time to become fully available as Snowflake provisions all the compute resources for the warehouse.

Starting or resuming a warehouse
A warehouse can be started at any time, including on initial creation. Once a warehouse is created, resuming a warehouse is the same as starting a warehouse.

You can resume a suspended (that is, inactive) warehouse by using the following interfaces:

Snowsight
In the navigation menu, select Compute » Warehouses » <suspended_warehouse_name> » More options » Resume

SQL
Execute an ALTER WAREHOUSE command with the RESUME keyword.

Python
Use the WarehouseResource.resume API (Performing warehouse operations).

Starting a warehouse typically takes only a few seconds; however, in some rare instances, it can take longer as Snowflake provisions the compute resources for the warehouse.

Warehouses consume credits while running:

A warehouse begins to consume credits once all the compute resources are provisioned for the warehouse.

In a rare instance when some of the compute resources fail to provision, the warehouse only consumes credits for the provisioned compute resources.

Once the remaining compute resources are successfully provisioned, the warehouse starts consuming credits for all requested compute resources.

While starting or resuming a warehouse often takes only a few seconds, in some instances, it can take longer as Snowflake provisions the compute resources for the warehouse.

Snowflake does not begin executing SQL statements submitted to a warehouse until all of the compute resources for the warehouse are successfully provisioned, unless any of the resources fail to provision:

If any of the compute resources for the warehouse fail to provision during start-up, Snowflake attempts to repair the failed resources.

During the repair process, the warehouse starts processing SQL statements once 50% or more of the requested compute resources are successfully provisioned.

Credits are billed on a per-second basis while the warehouse is running, with a 1-minute minimum each time the warehouse is resumed; however, credit consumption is reported in 60-minute (i.e. hourly) increments.

Note

A warehouse must be running and the current warehouse for the session (i.e. in use) to process SQL statements submitted in the session. For more information, refer to Using a Warehouse in this topic.

Suspending a warehouse
A running warehouse can be suspended at any time, even while executing SQL statements. Suspending a warehouse stops the warehouse from consuming credits once all the compute resources shut down.

You can suspend a warehouse by using the following interfaces:

Snowsight
In the navigation menu, select Compute » Warehouses » <started_warehouse_name> » More options » Suspend

SQL
Execute an ALTER WAREHOUSE command with the SUSPEND keyword.

Python
Use the WarehouseResource.suspend API (Performing warehouse operations).

When you suspend a warehouse, Snowflake immediately shuts down all idle compute resources for the warehouse, but allows any compute resources that are executing statements to continue until the statements complete, at which time the resources are shut down and the status of the warehouse changes to “Suspended”. Compute resources waiting to shut down are considered to be in “quiesce” mode.

Resizing a warehouse
A warehouse can be resized up or down at any time, including while it is running and processing statements.

You can resize a warehouse by using the following interfaces:

Snowsight
In the navigation menu, select Compute » Warehouses » <warehouse_name> » More options » Edit

SQL
Execute an ALTER WAREHOUSE command with SET WAREHOUSE_SIZE = ....

Python
Use the WarehouseResource.create_or_alter API (Creating or altering a warehouse).

Resizing a warehouse to a larger size is useful when the operations being performed by the warehouse will benefit from more compute resources, including:

Improving the performance of large, complex queries against large data sets.

Improving performance while loading and unloading significant amounts of data.

Effects of resizing a running warehouse
Resizing a running warehouse adds or removes compute resources in each cluster in the warehouse. All the usage and credit rules associated with starting or suspending a warehouse apply to resizing a started warehouse, such as:

Compute resources added to a warehouse start using credits when they are provisioned; however, the additional compute resources don’t start executing statements until they are all provisioned, unless some of the resources fail to provision.

Compute resources are removed from a warehouse only when they are no longer being used to execute any current statements.

Resizing a warehouse doesn’t have any impact on statements that are currently being executed by the warehouse. When resizing to a larger size, the new compute resources, once fully provisioned, are used only to execute statements that are already in the warehouse queue, as well as all future statements submitted to the warehouse.

Tip

To verify the additional compute resources for your warehouse have been fully provisioned, add the WAIT_FOR_COMPLETION parameter to the ALTER WAREHOUSE command. You can also use SHOW WAREHOUSES to check its state.

Effects of resizing a suspended warehouse
Resizing a suspended warehouse does not provision any new compute resources for the warehouse. It simply instructs Snowflake to provision the additional compute resources when the warehouse is next resumed, at which time all the usage and credit rules associated with starting a warehouse apply.

Using a warehouse
To execute a query or DML statement in Snowflake, a warehouse must be running and it must be specified as the current warehouse for the session in which the query/statement is submitted.

A Snowflake session can only have one current warehouse at a time. The current warehouse for the session can be specified or changed at any time through the USE WAREHOUSE SQL command or the WarehouseResource.use_warehouse Python API.

Once a running warehouse has been set as the current warehouse for the session, queries and DML statements submitted within the session are processed by the warehouse. In the Query History and Workspaces pages in Snowsight, you can view the warehouse used to process each query/statement.

Note

Some Snowsight features require a warehouse to run SQL queries for retrieving data, such as Task Run History or Data Preview for a table. An X-Small warehouse is recommended and generally sufficient for most of these queries. For information, see Warehouse considerations.

Delegating warehouse management
By default, the ACCOUNTADMIN role is granted the ability to alter, suspend, describe, and perform other operations on all warehouses in the account.

If you need to delegate these abilities to a custom role in your account, you can grant the MANAGE WAREHOUSES privilege to that role. Granting the MANAGE WAREHOUSES privilege is equivalent to granting the MODIFY, MONITOR, and OPERATE privileges on all warehouses in the account.

The following examples demonstrate how you can delegate the ability to manage warehouses to a custom role named manage_wh_role. The example uses the manage_wh_role to make changes to the warehouse test_wh, which is owned by a different role (create_wh_role).

Create a new role that will create and own a new warehouse, and grant the CREATE WAREHOUSE privilege to that role:

SQL
Python
Using the GRANT <privileges> … TO ROLE command:

CREATE ROLE create_wh_role;
GRANT CREATE WAREHOUSE ON ACCOUNT TO ROLE create_wh_role;
GRANT ROLE create_wh_role TO ROLE SYSADMIN;
Create a second role that will manage all warehouses in the account, and grant the MANAGE WAREHOUSES privilege to that role:

SQL
Python
CREATE ROLE manage_wh_role;
GRANT MANAGE WAREHOUSES ON ACCOUNT TO ROLE manage_wh_role;
GRANT ROLE manage_wh_role TO ROLE SYSADMIN;
Using the create_wh_role role, create a new warehouse:

SQL
Python
USE ROLE create_wh_role;
CREATE OR REPLACE WAREHOUSE test_wh
    WITH WAREHOUSE_SIZE= XSMALL;
Change the current role to manage_wh_role:

SQL
Python
USE ROLE manage_wh_role;
Although the manage_wh_role does not own the test_wh, that role does have the MANAGE WAREHOUSES privilege, which means that you can:

Suspend and resume the warehouse:

SQL
Python
ALTER WAREHOUSE test_wh SUSPEND;
ALTER WAREHOUSE test_wh RESUME;
Change the size of the warehouse:

SQL
Python
ALTER WAREHOUSE test_wh SET WAREHOUSE_SIZE = SMALL;
Describe the warehouse:

SQL
Python
DESC WAREHOUSE test_wh;
Review Warehouse Details in Snowsight
You must use the ACCOUNTADMIN role, or a role granted the relevant warehouse privileges.

To review warehouses and manage warehouse details in Snowsight, complete the following steps:

Sign in to Snowsight.

In the navigation menu, select Compute » Warehouses.

You can then review the table of warehouses, search for warehouses, or filter the list of warehouses by status or size.

By default, you can see the following information about each warehouse:

Name

Status, such as Started, Resuming, or Suspended.

Size

Clusters, indicated by a bar in the column. You can hover over the value to see how many clusters are active.

Running, for details on how many SQL statements are being executed by the warehouse.

Queued, for details on how many SQL statements are queued for the warehouse.

Owner, or the owning role for the warehouse.

Resumed, to see how long ago the warehouse was resumed. Hover over the value to see the exact date and timestamp in your local time zone.

You can also add columns to see additional details for each warehouse in the table:

QAS (Scale Factor), to see the scale factor of the warehouse used by Query Acceleration Service (QAS). See Using the Query Acceleration Service (QAS).

Scaling Policy, to see the scaling policy defined for the warehouse. See Setting the scaling policy for a multi-cluster warehouse.

Auto Resume, to see whether auto-resume is set up for the warehouse.

Auto Suspend, to see the time period before auto-suspend occurs for the warehouse.

Created, to see when the warehouse was created. Hover over the value to see the exact date and timestamp in your local time zone.

When you select a warehouse in the Warehouses table, you can see more details:

The Warehouse Activity section provides a graph of warehouse load over a period of time, which can help you understand why a query might be running slowly. See Monitoring warehouse load for more details.

The Details section provides additional information about your warehouse, including:

The status of the warehouse.

The size of the warehouse.

Maximum and minimum number of clusters the warehouse can use.

The scaling policy.

The number of tasks that are running and queued.

The period of no activity before the warehouse is automatically suspended.

If the warehouse is suspended, whether to automatically resume the warehouse when needed.

The last time the warehouse resumed operation.

You can use the Privileges section to view, grant, and revoke privileges on the warehouse.