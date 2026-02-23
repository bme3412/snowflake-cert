# Deployment on AWS, Azure, GCP — Regions and Cross-Cloud Concepts

## Snowflake Is Not a Cloud Provider — It Runs On Top of Them

One of the first conceptual adjustments you need to make when learning Snowflake is understanding what kind of product it actually is. Snowflake does not own or operate its own data centers. It is not a cloud provider. It is a **cloud-native SaaS platform** that runs entirely on top of the three major public clouds — Amazon Web Services, Microsoft Azure, and Google Cloud Platform. When you create a Snowflake account, you are not choosing between Snowflake's infrastructure options. You are choosing which underlying cloud provider's infrastructure Snowflake will use to run your account.

This matters because Snowflake's storage layer is literally the cloud provider's object storage — S3 on AWS, Azure Blob Storage on Azure, Google Cloud Storage on GCP. Snowflake manages that storage on your behalf, but the physical infrastructure belongs to the cloud provider. Similarly, Snowflake's compute nodes run on the cloud provider's virtual machine infrastructure. Snowflake's value is in the software layer it builds on top of this infrastructure — the three-layer architecture, the query optimizer, the metadata management, the security model — not in owning the hardware underneath.

This architecture is what allows Snowflake to offer global reach without operating a global data center network. Anywhere AWS, Azure, or GCP operate, Snowflake can operate too.

---

## How Snowflake Accounts Are Deployed

Every Snowflake account is created in a specific **cloud provider and region**. This is a permanent, foundational choice made at account creation time — you cannot migrate a Snowflake account from one cloud provider to another, and you cannot move it from one region to another. The account, its storage, and its compute all live in the selected cloud and region for the lifetime of that account.

The region you select determines the physical location of your data. If you create an account in AWS US East (N. Virginia), your data is stored in AWS's N. Virginia data centers. If you create an account in Azure West Europe (Netherlands), your data is in Microsoft's Dutch facilities. This has direct implications for **data residency** and **data sovereignty** requirements — organizations operating under regulations that require data to remain within a specific geographic or political boundary must ensure their Snowflake account is in an appropriate region before loading any data.

Region selection also affects **latency** for users and systems connecting to Snowflake. Queries originate from a client — a BI tool, a Python script, a data pipeline — and travel to Snowflake's endpoint. The closer the client is to the Snowflake account's region, the lower the network latency. For most analytical workloads where query execution time dominates, network latency is a minor concern. But for high-frequency, low-latency operational workloads, region proximity matters.

---

## Available Regions Across the Three Clouds

Snowflake's regional footprint expands as the underlying cloud providers expand, so the specific list of supported regions changes over time. For the exam, you do not need to memorize individual region names — the exam does not test that level of geographic detail. What matters is understanding the structure: Snowflake supports multiple regions per cloud provider, spanning North America, South America, Europe, Asia Pacific, and other geographies. The practical implication is that most organizations can find a supported Snowflake region that satisfies their data residency requirements on at least one cloud provider.

The regions Snowflake supports are a subset of the full set of regions each cloud provider operates. Not every AWS region, Azure region, or GCP region has a Snowflake deployment — Snowflake selects regions based on demand and strategic priorities. The **Snowflake documentation** maintains the authoritative, current list of supported regions, and since this list evolves, the exam tests concepts rather than specific region names.

What the exam does test is the implication of region selection — particularly that **data does not automatically leave the region you select**, that **cross-region communication has latency and cost implications**, and that **replication is the mechanism for intentionally moving or copying data across regions**.

---

## The Account Identifier

Every Snowflake account has a unique identifier, and understanding the two formats of that identifier is a testable concept. The **account locator** is the original identifier format — a short alphanumeric string that is unique within a region, formatted as `<account_locator>.<region_id>.<cloud_provider>` when used in connection strings (for example, `xy12345.us-east-1.aws`). The locator alone is unique within its region but not globally.

The newer **organization-based account identifier** uses the format `<orgname>.<account_name>`, where the organization name is the name of your Snowflake organization and the account name is a human-readable name assigned at account creation. This format is globally unique, more readable, and is the preferred format for modern Snowflake deployments, particularly when working with replication, Snowflake Private Connectivity, and cross-account features. The exam may present both formats and ask you to distinguish them or identify when each is used.

---

## Cross-Cloud and Cross-Region Concepts

The fact that a Snowflake account is permanently bound to one cloud and region creates an immediate practical challenge for organizations that operate in multiple clouds or need their data available in multiple geographies. Snowflake addresses this through a set of replication and sharing features that allow data and objects to cross these boundaries in controlled, deliberate ways.

### Database Replication

Database replication allows you to create a synchronized copy of a Snowflake database in a different account — which can be in a different region, a different cloud, or both. The source account holds the primary database; target accounts hold secondary databases that are read-only replicas. The replication process is managed entirely by Snowflake and runs asynchronously — the secondary is eventually consistent with the primary, not instantly synchronized.

This is the foundational mechanism for getting data across cloud and region boundaries, and it underpins everything from disaster recovery to multi-cloud data distribution. A financial services firm might maintain a primary Snowflake account in AWS US East for their core operations and a replicated secondary in Azure West Europe for their European analytics team, satisfying both data residency requirements and geographic performance goals with a single replication relationship.

Database replication requires **Enterprise edition or above**. Standard edition accounts cannot participate in cross-account replication.

### Replication Groups and Failover Groups

As Snowflake's replication capabilities evolved, Snowflake introduced **Replication Groups** and **Failover Groups** as more sophisticated orchestration tools. A Replication Group allows you to bundle multiple databases, shares, and other account objects together and replicate them as a coordinated unit — ensuring consistency across related objects rather than replicating each database independently. A Failover Group extends this further by adding automated failover orchestration, making the secondary account promotable to primary status in the event of a regional outage. Failover Groups require **Business Critical edition or above** and represent Snowflake's enterprise disaster recovery story.

### Secure Data Sharing Across Regions and Clouds

Standard Secure Data Sharing — where a provider account shares database objects with a consumer account — works natively only between accounts in the **same region on the same cloud**. A provider in AWS US East (N. Virginia) can share directly with a consumer also in AWS US East, but not with a consumer in Azure or GCP, and not with a consumer in a different AWS region.

This constraint exists because Secure Data Sharing works by granting the consumer's Virtual Warehouses read access to the provider's storage, without copying any data. If the consumer's compute and the provider's storage are in different regions or clouds, this zero-copy mechanism breaks down — the data would have to traverse cloud or regional boundaries, which Snowflake does not do natively in a sharing context.

To share across regions or clouds, the provider must first replicate the relevant data to an account in the same region and cloud as the consumer, and then share from that replicated account. This pattern — **replicate then share** — is the architectural answer to cross-region and cross-cloud data distribution in Snowflake. It involves an intermediate account, adds replication lag, and introduces replication costs, but it is the supported path.

The **Snowflake Marketplace** presents a simplified face over this complexity for public data products. Marketplace listings are made available globally regardless of the consumer's region or cloud, because Snowflake manages the replication and distribution infrastructure behind the scenes. From the consumer's perspective, a Marketplace dataset simply appears available in their account.

### Cross-Cloud Latency and Egress Costs

Any time data physically moves from one cloud provider to another — or from one region to another — two things happen: latency increases and cloud egress costs appear. Egress costs are charges that cloud providers levy for data leaving their network, and they are a non-trivial operational expense at scale. When Snowflake replicates a database from AWS to Azure, the data physically traverses the public internet (or a cross-provider network path), and AWS charges egress fees for data leaving its infrastructure.

For the exam, the important concept is not the exact pricing of egress — that varies by provider and region and changes over time — but that **cross-cloud and cross-region data movement has a cost that same-region, same-cloud data movement does not**. This is one reason why Snowflake's default behavior keeps data within the account's home region. Replication, sharing, and query federation across regions are opt-in behaviors that carry associated costs.

---

## The Organizational Layer

Above the individual account sits the **Organization** — a Snowflake construct that allows a company to manage multiple Snowflake accounts under a single administrative umbrella. An organization might contain separate accounts for production, development, and staging environments, or accounts in different cloud regions serving different business units.

The **ORGADMIN** role, which sits at the top of the role hierarchy, provides visibility and administrative control across all accounts in an organization. From the ORGADMIN context, you can view usage and credit consumption across accounts, manage account creation, and oversee cross-account replication configurations. The organization layer is the governance structure that makes multi-account, multi-cloud Snowflake deployments manageable at enterprise scale.

For the exam, the key organization-level concepts are that accounts belong to organizations, ORGADMIN has cross-account visibility, and organization-based account identifiers are the modern way to uniquely address any account globally regardless of its cloud or region.

---

## The Exam Angle

Questions about cloud deployment and regions tend to be either definitional — testing whether you understand the structure and constraints of account placement — or scenario-based, testing whether you know how to architect around cross-region or cross-cloud requirements.

**Account placement is permanent.** You choose a cloud and region at account creation. You cannot migrate. If a scenario describes a need to have data in multiple regions or clouds, the answer always involves multiple accounts with replication, not moving a single account.

**Secure Data Sharing is same-region, same-cloud only.** The zero-copy sharing model only works when provider and consumer are in the same place. Cross-region or cross-cloud sharing requires replication first.

**Replication requires Enterprise edition.** If the scenario involves any kind of cross-account data movement — for DR, analytics distribution, or compliance — Enterprise is the minimum edition.

**Failover Groups and orchestrated DR require Business Critical.** Replication alone is Enterprise; failover with business continuity orchestration escalates to Business Critical.

**Data residency is determined by account region.** If a scenario mentions regulatory requirements that data must remain within a specific country or jurisdiction, the answer involves selecting the appropriate regional account — not a Snowflake-level configuration, but a deployment decision made at account creation.

**The replicate-then-share pattern** is the canonical answer for any scenario where a data provider needs to share with consumers in different regions or on different clouds. This comes up regularly in data sharing and collaboration scenarios on the exam, and the two-step nature of it — replicate first, then share from the replica — is the key detail to have locked down.