# Centralized Audit Log Utility

This document provides an end-to-end understanding of the Centralized Audit Log Utility project, tailored for an SDE-2 depth. It covers systemic validation, structural designs, and edge-case mitigation required for high-scale distributed logging. Furthermore, it prepares you for rigorous interview cross-questions focusing on resilience, asynchronous decoupling, and trade-offs.

## Table of Contents
* [STAR & Project Context](#star--project-context)
* [End-to-End System Architecture](#end-to-end-system-architecture)
* [HLD (High-Level Design)](#hld-high-level-design)
* [Deep Dive (Resilience & Scale)](#deep-dive-resilience--scale)
* [Testing & Validation](#testing--validation)
* [Question Bank & Strategies](#question-bank--strategies)

## STAR & Project Context
*   **What is Centralized Audit Log Utility:** A robust, event-driven mechanism to automatically capture and persist state changes, actor context, and execution metadata for a Cloud Cost Management system.
*   **Situation:** the cost management dashboard allows certain crud operations from the dashboard itself like actions on advisories. While all this is logged in the database the user wanted to have a dashboard of audit logs where in the ui user could see when was action performed, who performed it, the diff in values. 
*   **Task:** Engineer a centralized, consistent audit mechanism that completely decouples logging operations from core business transactions while ensuring zero data loss and zero impact on API latency.
*   **Action:** Designed a custom @AuditLog annotation powered by Spring AOP to intercept requests, dynamically extract execution context and state diffs via reflection, and asynchronously call utility to  create entries in auditLog table. 
*   **Result:** Reduced logging disparities by 30%, enhanced compliance traceability across 50+ transactions per minute, entirely removed logging latency from the critical path, and isolated financial transactions from logging failures.
*   **Why we did it (Motivation & Trade-offs):** We chose Aspect-Oriented Programming (AOP) paired with Kafka to achieve strict separation of concerns. The trade-off was introducing eventual consistency for audit logs and adding infrastructure complexity (Kafka/Mongo), but it was necessary to protect the synchronous operational database and enforce standard formatting without code duplication.
*   **What else we could have done (Alternatives):** We heavily considered Change Data Capture (CDC, like Debezium) directly on the relational database. We discarded this approach because while CDC reliably captures row-level changes, it strips away application-level context—such as the authenticated User ID, client IP, and API intent—which were strict requirements for our compliance audits.

## End-to-End System Architecture
*   **Trigger (Interception Phase):**
    *   **Event/Trigger:** An incoming API request hits a REST controller or service method annotated with `@AuditLog`.
    *   **Action/Mechanism:** The Spring AOP `Around` advice intercepts the thread, extracting the `userId`, `roles`, and `clientIp` from the `SecurityContext`/JWT, and serializes the Pre-state method parameters using reflection.
    *   **Benefit/Result:** Developers achieve compliance with a single annotation, abstracting away all boilerplate context-gathering logic.
*   **Execution Phase:**
    *   **Event/Trigger:** The interceptor yields execution to the target method.
    *   **Action/Mechanism:** The core business logic executes against the primary relational database (e.g., updating cost center budgets).
    *   **Benefit/Result:** The financial transaction runs cleanly, entirely unaware of the auditing wrapper.
*   **Evaluation Phase:**
    *   **Event/Trigger:** The target business method completes (or throws an exception).
    *   **Action/Mechanism:** The interceptor regains control, capturing the Post-state return object (or error stack trace) and calculates the execution latency.
    *   **Benefit/Result:** Guarantees exact delta changes and execution metadata are recorded securely, even in failure scenarios.
*   **Integration (Async Publishing Phase):**
    *   **Event/Trigger:** An `AuditEvent` payload is fully constructed in memory.
    *   **Action/Mechanism:** The payload is published to the `cloud-cost-audit-events` Kafka topic using non-blocking callbacks (`CompletableFuture`), safely wrapped in a fallback try-catch block.
    *   **Benefit/Result:** Fault isolation; if Kafka is down, the core financial transaction still succeeds (fail-open logging).
*   **Persistence Phase:**
    *   **Event/Trigger:** Messages arrive in the Kafka topic.
    *   **Action/Mechanism:** A dedicated consumer pod reads the events in batches and persists them to an append-only MongoDB collection.
    *   **Benefit/Result:** Scalable write throughput optimized for unstructured document data, keeping heavy IOPS off the primary relational database.

## HLD (High-Level Design)
```mermaid
graph TD
    Client[Client/Browser] -->|HTTP Request| AOP
    
    subgraph Spring Boot Application
        direction TB
        AOP[@AuditLog AOP Interceptor]
        Controller[Cost Controller / Service]
        Producer[Kafka Producer]
        
        AOP -->|1. Intercept & Pre-state| Controller
        Controller -.->|2. Return Post-state| AOP
        AOP -->|3. Fire & Forget Async| Producer
    end
    
    Controller <-->|ACID Transaction| CoreDB[(Oracle/Primary DB)]
    
    Producer -->|4. Publish Event| Kafka[Apache Kafka Topic]
    
    subgraph Audit Service
        direction TB
        Consumer[Kafka Audit Consumer]
    end
    
    Kafka -->|5. Consume Batch| Consumer
    Consumer -->|6. Append| MongoDB[(MongoDB Audit Store)]
```

## Deep Dive (Resilience & Scale)

### Asynchronous Decoupling & Fault Isolation
Writing logs directly to a database inside a synchronous API call couples business success to logging success. By using Kafka with non-blocking producers (`CompletableFuture`), the API thread hands off the message and immediately returns to the user. Furthermore, the publish method is wrapped in a strict try-catch block (Fail-open design). If the Kafka broker is unreachable, the system logs the failure locally to disk but allows the critical financial transaction to commit.

### Idempotency in Distributed Events
In a distributed event-driven architecture, Kafka guarantees "at-least-once" delivery by default, meaning network retries could cause duplicate audit logs. To handle this, the AOP interceptor generates a unique `audit_event_id` (UUID) at the exact moment of interception. MongoDB uses this UUID as a unique index, ensuring that even if the consumer processes the same Kafka message twice, the database enforces append-only idempotency without throwing fatal errors.

### Reflection-Based Delta Capture & Privacy Security
Capturing Pre-state and Post-state dynamically requires Java Reflection. Because reflection can be slow and risky if it touches lazy-loaded database proxies, the interception layer selectively serializes only detached DTOs. To prevent PII (Personally Identifiable Information) from leaking into Kafka, a custom `@MaskField` annotation was implemented. During serialization, the utility scans for this annotation and applies a `[REDACTED]` mask before the payload ever leaves the Spring container.

## Testing & Validation 
1.  **Unit & Integration Testing:** We utilized WireMock to mock external auth dependencies and MockMvc to trigger the controllers, verifying that the Spring AOP proxy correctly intercepted the calls and constructed the correct `AuditEvent` payload with mocked Kafka producers.
2.  **Resilience Testing:** We used Testcontainers (Toxiproxy) to simulate Kafka broker outages and high-latency network drops. This validated our circuit-breaking and try-catch fallbacks, proving that a Kafka timeout of 30 seconds did not block the core API thread and the fallback triggered successfully.
3.  **Concurrency Testing:** We used JMeter to bombard the endpoints with high-throughput parallel requests. This ensured thread-safety, specifically validating that thread-local variables (like the Spring `SecurityContext`) didn't leak across concurrent requests and that reflection didn't introduce race conditions.

## Question Bank & Strategies

### 1. "What happens if an internal method calls another method annotated with @AuditLog within the same Spring Bean?"
*   **Strategy:** Demonstrate deep knowledge of how proxy-based frameworks (like Spring AOP) operate under the hood.
*   **Sample Answer:** In Spring, AOP is implemented using JDK Dynamic Proxies or CGLIB. When a method is called from outside the bean, it passes through the proxy, triggering the interceptor. However, if an internal method calls another annotated method using `this.method()`, it bypasses the proxy entirely, meaning my `@AuditLog` annotation will not trigger. To solve this, I would either refactor the annotated method into a separate service, inject the bean into itself (self-injection), or switch from proxy-based AOP to AspectJ compile-time weaving.

### 2. "How do you handle sensitive data (e.g., PII or credentials) from leaking into audit logs via reflection?"
*   **Strategy:** Explain your proactive approach to data masking and field-level security before data leaves the application boundary.
*   **Sample Answer:** Because the AOP interceptor uses reflection to blindly serialize method parameters into JSON, there was a high risk of leaking sensitive data like passwords or financial PII. To mitigate this, I engineered a `@MaskField` annotation. I customized the Jackson object mapper used during the reflection phase to check for this annotation on entity fields. If present, the serializer replaces the actual value with a `[REDACTED]` string before constructing the Kafka payload, ensuring sensitive data never hits the message broker.

### 3. "What delivery guarantee did you use for the Kafka audit topic, and how did you prevent log loss?"
*   **Strategy:** Detail your Kafka producer configuration parameters and explain consumer-side idempotency.
*   **Sample Answer:** To prioritize data durability, I configured the Kafka producer with `acks=all` and set `min.insync.replicas=2` on the topic. This ensures that an audit event is not considered committed until it is written to the leader and at least one follower. Because network retries can cause duplicate messages, I designed the consumer to be idempotent. I generate a unique UUID for each audit event inside the AOP interceptor; the consumer uses this UUID as a unique index in MongoDB. If a duplicate message arrives, MongoDB simply ignores the redundant insert, achieving effectively-once processing.

### 4. "How would you handle a situation where the audit consumer falls behind and Kafka consumer lag spikes?"
*   **Strategy:** Show your understanding of horizontal scaling, Kafka partitions, and batch database operations.
*   **Sample Answer:** If the cost module experienced a traffic spike, the audit topic might build up lag. My first step in the design was ensuring the `cloud-cost-audit-events` topic had a sufficient number of partitions. To drain the lag, I would horizontally scale up the consumer pods to match the partition count. Furthermore, I optimized the consumer to poll in batches using `max.poll.records`, allowing it to execute bulk inserts into MongoDB. This significantly reduces network round trips to the database and allows the consumer to chew through backlog rapidly during high-load periods.

### 5. "Why use MongoDB for the audit logs instead of keeping it in the primary relational database?"
*   **Strategy:** Highlight the architectural differences between operational (ACID) databases and analytical/append-only document stores.
*   **Sample Answer:** The primary relational database was heavily optimized for ACID financial transactions. Audit logs, however, are essentially unstructured JSON documents representing dynamic Pre and Post-states, and they are append-only by nature. Writing massive volumes of audit logs to the relational DB would waste expensive IOPS, create table locking contention, and require rigid schemas for dynamic JSON. By offloading to MongoDB, we maintained fast, schema-less document inserts, preserved the primary database's performance for critical user flows, and made it much easier to query complex JSON diffs.
