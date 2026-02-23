# Snowflake Editions: Standard, Enterprise, Business Critical, and Virtual Private Snowflake

## Why Editions Matter

Snowflake is not a single product — it is a tiered platform where the edition you select determines which features are available to your account. Every Snowflake account runs on one of four editions, listed in ascending order of capability and cost: **Standard**, **Enterprise**, **Business Critical**, and **Virtual Private Snowflake (VPS)**. Each edition is a strict superset of the one below it, meaning every feature available in Standard is also available in Enterprise, every Enterprise feature carries into Business Critical, and so on. No edition removes a capability from the tier below it — it only adds.

For the SnowPro Core exam, editions are tested in a specific and predictable way. Questions will present a scenario — a compliance requirement, a performance need, a security constraint — and ask which edition satisfies it, or they will describe a feature and ask which edition first introduces it. The exam is not asking you to recite marketing copy. It is asking you to understand which capabilities are edition-gated and why, so you can reason about appropriate configurations in real-world contexts.

---

## Standard Edition

Standard is the entry-level edition and the foundation on which every higher tier is built. It includes the full core Snowflake platform — all the fundamental SQL capabilities, data loading and unloading, semi-structured data support, Snowpipe, Tasks, Streams, Secure Data Sharing, and the complete three-layer architecture. If you are new to Snowflake or running development and testing workloads, Standard gives you access to everything that makes Snowflake distinctively Snowflake.

Standard includes **one day of Time Travel**, meaning you can query historical versions of your data or restore objects up to 24 hours into the past. This is sufficient for many use cases but becomes a limitation for organizations that need longer recovery windows — which is one of the triggers that pushes teams toward Enterprise.

On the security side, Standard provides always-on encryption at rest and in transit, role-based access control, network policies, and multi-factor authentication. What it does not provide is the enhanced security and compliance infrastructure available at higher tiers — no HIPAA-eligible configuration, no PCI-DSS compliance controls, and no dedicated resources. For workloads that do not carry regulatory requirements around data sensitivity, Standard's security posture is robust. For workloads that do, Standard is the wrong edition by definition.

Standard also does not include multi-cluster warehouses. You can run multiple independent warehouses simultaneously — that is available at every edition — but automatic concurrency scaling within a single named warehouse requires Enterprise. For teams with variable but manageable query concurrency, Standard's single-cluster warehouses are perfectly sufficient. For teams with large numbers of simultaneous users, the lack of multi-cluster is a meaningful constraint.

---

## Enterprise Edition

Enterprise is where most production Snowflake deployments live, and for good reason. It extends Standard with a set of features that are either performance-critical or compliance-required for the majority of serious enterprise workloads.

The most significant addition is **multi-cluster warehouses**, which unlocks automatic concurrency scaling within a single named warehouse. As discussed in the multi-cluster architecture guide, this is the architectural answer to high-concurrency workloads — Snowflake automatically provisions additional clusters when queries begin queueing and releases them when demand subsides. For organizations with large numbers of analysts, data scientists, or BI users running simultaneous queries, multi-cluster warehouses are often not optional — they are a prerequisite for acceptable performance.

Enterprise also extends **Time Travel from one day to up to 90 days**. For tables and schemas configured with extended retention periods, you can query historical snapshots or restore dropped objects up to three months into the past. This is a meaningful operational and compliance capability — long Time Travel windows allow recovery from accidental data modifications that are not caught immediately, and they provide a built-in audit capability for slowly evolving datasets. The 90-day maximum applies to permanent tables; transient and temporary tables are still capped at one day regardless of edition.

**Materialized views** are introduced at Enterprise. A materialized view stores the precomputed result of a query and automatically refreshes when the underlying data changes. This is distinct from a regular view, which re-executes its defining query on every access. For expensive aggregations or joins that are queried repeatedly, materialized views can dramatically reduce compute consumption and query latency. They are a performance optimization tool, and they live behind the Enterprise paywall.

**Column-level security** — specifically the ability to apply dynamic data masking policies to individual columns — is also an Enterprise feature. Masking policies allow you to define rules that transform sensitive column values based on the role of the querying user, so that a column containing Social Security numbers might return the full value to authorized roles and a redacted placeholder to everyone else. The underlying data is unchanged; the presentation of it is role-dependent. This is a data governance capability that many regulated industries require.

**Database replication** — the ability to replicate a Snowflake database to another account in a different region or cloud provider — requires Enterprise or above. For organizations that need geographic redundancy or multi-cloud distribution of their data, Enterprise is the minimum viable edition.

---

## Business Critical Edition

Business Critical is designed for organizations operating under strict regulatory and compliance frameworks — HIPAA, PCI-DSS, SOC 1 and SOC 2 Type II, ISO 27001, and similar standards that impose specific requirements on how data is stored, accessed, and protected. It carries a meaningful price premium over Enterprise and is justified primarily by its enhanced security infrastructure rather than any new analytical capabilities.

The flagship addition at Business Critical is **enhanced encryption** in the form of **customer-managed keys** via Tri-Secret Secure. In Standard and Enterprise, Snowflake manages your encryption keys using its own key management infrastructure. In Business Critical with Tri-Secret Secure, encryption uses a composite key made up of a Snowflake-managed key and a customer-managed key stored in your own cloud provider's key management service (AWS KMS, Azure Key Vault, or Google Cloud KMS). Decrypting any data requires both keys simultaneously. This means that if Snowflake were to be compromised, or if Snowflake were compelled by legal process to surrender data, the data would be unreadable without the customer's separately held key. This is the cryptographic architecture that satisfies the most stringent data sovereignty requirements.

Business Critical also includes **HIPAA-eligible configuration** and **PCI-DSS compliance** support. These are not automatic guarantees — they are contractual commitments from Snowflake, supported by technical controls, that allow organizations to store and process regulated health and payment data within Snowflake under the terms of a Business Associate Agreement (BAA) or PCI compliance program. Without Business Critical, Snowflake will not sign a BAA, and HIPAA-regulated data should not be stored in the platform.

**AWS PrivateLink**, **Azure Private Link**, and **Google Cloud Private Service Connect** — which allow network traffic between your cloud environment and Snowflake to traverse a private network path rather than the public internet — are supported at Business Critical. This eliminates a category of network-level exposure that some security architectures require closing. Private connectivity is often a hard requirement in financial services, healthcare, and government contexts.

**Failover and failback** using Failover Groups — which extend database replication into a fully orchestrated disaster recovery mechanism with defined recovery time objectives — is also a Business Critical capability. Where Enterprise supports replication, Business Critical adds the tooling to make that replication a functioning DR strategy with automated failover orchestration.

---

## Virtual Private Snowflake (VPS)

Virtual Private Snowflake is the top of the stack and is categorically different from the other three editions in one fundamental way: it is the only edition where your Snowflake environment runs on **dedicated, single-tenant infrastructure**. Every other edition — Standard through Business Critical — runs on Snowflake's shared multi-tenant cloud infrastructure, with logical isolation between customers enforced through encryption, access controls, and network policy. In VPS, the physical infrastructure itself is yours alone.

This distinction matters in a narrow but important set of scenarios. Certain regulated industries and government agencies have requirements that prohibit the use of shared infrastructure entirely, regardless of how robust the logical isolation is. Classified government workloads, certain defense contractor requirements, and some financial institutions with the most stringent interpretations of data residency and isolation requirements fall into this category. For these organizations, the multi-tenant nature of Standard through Business Critical is disqualifying, and VPS is the only option.

VPS includes every feature available in Business Critical. It adds dedicated Cloud Services layer infrastructure, dedicated Virtual Warehouses, a dedicated metadata store, and a dedicated storage layer that is not shared with any other Snowflake customer. The operational experience from inside VPS looks largely the same as Business Critical — the SQL interface, the objects, the features are all identical — but the infrastructure underneath is physically isolated.

VPS is sold under a custom enterprise contract, not a standard consumption model, and it is deployed in a relatively small number of supported regions. It is not a product that organizations discover and self-serve into — it requires direct engagement with Snowflake's enterprise sales team and carries the cost profile you would expect from dedicated enterprise infrastructure.

For the exam, VPS questions are rare and tend to be straightforward: VPS is the answer when the scenario requires single-tenant, dedicated infrastructure with complete physical isolation. If the scenario is about compliance, regulatory requirements, or data sensitivity that does not specifically require physical isolation, Business Critical is usually the right answer.

---

## Edition Feature Comparison — Exam-Critical Facts

Understanding which features are edition-gated is the most directly testable knowledge in this domain. The following are the boundaries that appear most frequently on the SnowPro Core exam.

**Time Travel** is 1 day at Standard and up to 90 days at Enterprise and above. This is one of the most commonly tested edition distinctions because Time Travel appears throughout the exam in contexts beyond just editions — knowing the Standard limitation is essential.

**Multi-cluster warehouses** require Enterprise or above. Standard supports multiple independent warehouses but not automatic concurrency scaling within a single warehouse. The exam reliably tests this boundary in concurrency-related scenarios.

**Materialized views** require Enterprise or above. If a question describes a precomputed view that refreshes automatically and asks what edition supports it, the answer is Enterprise.

**Dynamic data masking** at the column level requires Enterprise or above. Row access policies also require Enterprise. Column-level security as a general category is an Enterprise feature.

**Database replication** across accounts and regions requires Enterprise or above.

**HIPAA and PCI-DSS compliance** and the ability to sign a Business Associate Agreement require Business Critical. Any scenario involving healthcare data, payment card data, or explicit regulatory compliance requirements points to Business Critical as the minimum viable edition.

**Tri-Secret Secure / customer-managed encryption keys** require Business Critical. Any scenario involving data sovereignty, key management by the customer, or protection against compelled disclosure points to Business Critical.

**Private Link connectivity** (AWS PrivateLink, Azure Private Link, GCP Private Service Connect) requires Business Critical.

**Physical single-tenant isolation** requires Virtual Private Snowflake. Everything else can be satisfied at a lower edition tier.

---

## How to Think About Editions on the Exam

The exam rarely asks you to define an edition. It presents a scenario with requirements and asks you to identify the appropriate edition. The most reliable approach is to read the scenario for its key constraints and map them to the edition hierarchy.

If the scenario mentions **concurrency or large numbers of simultaneous users**, the answer almost certainly involves Enterprise for multi-cluster warehouses. If it mentions **Time Travel beyond one day**, Enterprise is the minimum. If it mentions **HIPAA, PCI, BAA, healthcare data, or payment data**, the answer is Business Critical. If it mentions **customer-managed keys, Tri-Secret Secure, or data sovereignty**, the answer is Business Critical. If it mentions **dedicated infrastructure, single-tenant, or physical isolation**, the answer is VPS.

The most common distractor is confusing Business Critical with VPS when the scenario describes strong security requirements. Strong encryption, compliance certifications, and Private Link all live at Business Critical. The only feature that uniquely requires VPS is physical, single-tenant infrastructure. On the exam, if the scenario can be satisfied by Business Critical, VPS is wrong — it is more than what is needed, and Snowflake questions tend to test for the minimum viable edition, not the most capable one.