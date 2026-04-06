# WEBwAKA-PRODUCTION — DEEP RESEARCH + ENHANCEMENT TASKBOOK

**Repo:** webwaka-production
**Document Class:** Platform Taskbook — Implementation + QA Ready
**Date:** 2026-04-05
**Status:** EXECUTION READY

---

# WebWaka OS v4 — Ecosystem Scope & Boundary Document

**Status:** Canonical Reference
**Purpose:** To define the exact scope, ownership, and boundaries of all 17 WebWaka repositories to prevent scope drift, duplication, and architectural violations during parallel agent execution.

## 1. Core Platform & Infrastructure (The Foundation)

### 1.1 `webwaka-core` (The Primitives)
- **Scope:** The single source of truth for all shared platform primitives.
- **Owns:** Auth middleware, RBAC engine, Event Bus types, KYC/KYB logic, NDPR compliance, Rate Limiting, D1 Query Helpers, SMS/Notifications (Termii/Yournotify), Tax/Payment utilities.
- **Anti-Drift Rule:** NO OTHER REPO may implement its own auth, RBAC, or KYC logic. All repos MUST import from `@webwaka/core`.

### 1.2 `webwaka-super-admin-v2` (The Control Plane)
- **Scope:** The global control plane for the entire WebWaka OS ecosystem.
- **Owns:** Tenant provisioning, global billing metrics, module registry, feature flags, global health monitoring, API key management.
- **Anti-Drift Rule:** This repo manages *tenants*, not end-users. It does not handle vertical-specific business logic.

### 1.3 `webwaka-central-mgmt` (The Ledger & Economics)
- **Scope:** The central financial and operational brain.
- **Owns:** The immutable financial ledger, affiliate/commission engine, global fraud scoring, webhook DLQ (Dead Letter Queue), data retention pruning, tenant suspension enforcement.
- **Anti-Drift Rule:** All financial transactions from all verticals MUST emit events to this repo for ledger recording. Verticals do not maintain their own global ledgers.

### 1.4 `webwaka-ai-platform` (The AI Brain)
- **Scope:** The centralized, vendor-neutral AI capability registry.
- **Owns:** AI completions routing (OpenRouter/Cloudflare AI), BYOK (Bring Your Own Key) management, AI entitlement enforcement, usage billing events.
- **Anti-Drift Rule:** NO OTHER REPO may call OpenAI or Anthropic directly. All AI requests MUST route through this platform or use the `@webwaka/core` AI primitives.

### 1.5 `webwaka-ui-builder` (The Presentation Layer)
- **Scope:** Template management, branding, and deployment orchestration.
- **Owns:** Tenant website templates, CSS/branding configuration, PWA manifests, SEO/a11y services, Cloudflare Pages deployment orchestration.
- **Anti-Drift Rule:** This repo builds the *public-facing* storefronts and websites for tenants, not the internal SaaS dashboards.

### 1.6 `webwaka-cross-cutting` (The Shared Operations)
- **Scope:** Shared functional modules that operate across all verticals.
- **Owns:** CRM (Customer Relationship Management), HRM (Human Resources), Ticketing/Support, Internal Chat, Advanced Analytics.
- **Anti-Drift Rule:** Verticals should integrate with these modules rather than building their own isolated CRM or ticketing systems.

### 1.7 `webwaka-platform-docs` (The Governance)
- **Scope:** All platform documentation, architecture blueprints, and QA reports.
- **Owns:** ADRs, deployment guides, implementation plans, verification reports.
- **Anti-Drift Rule:** No code lives here.

## 2. The Vertical Suites (The Business Logic)

### 2.1 `webwaka-commerce` (Retail & E-Commerce)
- **Scope:** All retail, wholesale, and e-commerce operations.
- **Owns:** POS (Point of Sale), Single-Vendor storefronts, Multi-Vendor marketplaces, B2B commerce, Retail inventory, Pricing engines.
- **Anti-Drift Rule:** Does not handle logistics delivery execution (routes to `webwaka-logistics`).

### 2.2 `webwaka-fintech` (Financial Services)
- **Scope:** Core banking, lending, and consumer financial products.
- **Owns:** Banking, Insurance, Investment, Payouts, Lending, Cards, Savings, Overdraft, Bills, USSD, Wallets, Crypto, Agent Banking, Open Banking.
- **Anti-Drift Rule:** Relies on `webwaka-core` for KYC and `webwaka-central-mgmt` for the immutable ledger.

### 2.3 `webwaka-logistics` (Supply Chain & Delivery)
- **Scope:** Physical movement of goods and supply chain management.
- **Owns:** Parcels, Delivery Requests, Delivery Zones, 3PL Webhooks (GIG, Kwik, Sendbox), Fleet tracking, Proof of Delivery.
- **Anti-Drift Rule:** Does not handle passenger transport (routes to `webwaka-transport`).

### 2.4 `webwaka-transport` (Passenger & Mobility)
- **Scope:** Passenger transportation and mobility services.
- **Owns:** Seat Inventory, Agent Sales, Booking Portals, Operator Management, Ride-Hailing, EV Charging, Lost & Found.
- **Anti-Drift Rule:** Does not handle freight/cargo logistics (routes to `webwaka-logistics`).

### 2.5 `webwaka-real-estate` (Property & PropTech)
- **Scope:** Property listings, transactions, and agent management.
- **Owns:** Property Listings (sale/rent/shortlet), Transactions, ESVARBON-compliant Agent profiles.
- **Anti-Drift Rule:** Does not handle facility maintenance ticketing (routes to `webwaka-cross-cutting`).

### 2.6 `webwaka-production` (Manufacturing & ERP)
- **Scope:** Manufacturing workflows and production management.
- **Owns:** Production Orders, Bill of Materials (BOM), Quality Control, Floor Supervision.
- **Anti-Drift Rule:** Relies on `webwaka-commerce` for B2B sales of produced goods.

### 2.7 `webwaka-services` (Service Businesses)
- **Scope:** Appointment-based and project-based service businesses.
- **Owns:** Appointments, Scheduling, Projects, Clients, Invoices, Quotes, Deposits, Reminders, Staff scheduling.
- **Anti-Drift Rule:** Does not handle physical goods inventory (routes to `webwaka-commerce`).

### 2.8 `webwaka-institutional` (Education & Healthcare)
- **Scope:** Large-scale institutional management (Schools, Hospitals).
- **Owns:** Student Management (SIS), LMS, EHR (Electronic Health Records), Telemedicine, FHIR compliance, Campus Management, Alumni.
- **Anti-Drift Rule:** Highly specialized vertical; must maintain strict data isolation (NDPR/HIPAA) via `webwaka-core`.

### 2.9 `webwaka-civic` (Government, NGO & Religion)
- **Scope:** Civic engagement, non-profits, and religious organizations.
- **Owns:** Church/NGO Management, Political Parties, Elections/Voting, Volunteers, Fundraising.
- **Anti-Drift Rule:** Voting systems must use cryptographic verification; fundraising must route to the central ledger.

### 2.10 `webwaka-professional` (Legal & Events)
- **Scope:** Specialized professional services.
- **Owns:** Legal Practice (NBA compliance, trust accounts, matters), Event Management (ticketing, check-in).
- **Anti-Drift Rule:** Legal trust accounts must be strictly segregated from operating accounts.

## 3. The 7 Core Invariants (Enforced Everywhere)
1. **Build Once Use Infinitely:** Never duplicate primitives. Import from `@webwaka/core`.
2. **Mobile First:** UI/UX optimized for mobile before desktop.
3. **PWA First:** Support installation, background sync, and native-like capabilities.
4. **Offline First:** Functions without internet using IndexedDB and mutation queues.
5. **Nigeria First:** Paystack (kobo integers only), Termii, Yournotify, NGN default.
6. **Africa First:** i18n support for regional languages and currencies.
7. **Vendor Neutral AI:** OpenRouter abstraction — no direct provider SDKs.

---

## 4. REPOSITORY DEEP UNDERSTANDING & CURRENT STATE

Based on the provided scope for `webwaka-production` and without direct access to its live code, the current state is inferred as follows:

The `webwaka-production` repository is designed to manage **Manufacturing workflows and production management**. Its core responsibilities include **Production Orders, Bill of Materials (BOM), Quality Control, and Floor Supervision**. It is explicitly stated that this repository **relies on `webwaka-commerce` for B2B sales of produced goods**, indicating a clear inter-repository dependency.

**Inferred Current State (Placeholder - Requires Live Code Review):**

*   **Entry Point (`worker.ts` or equivalent):** Expected to contain logic for processing production orders, managing BOMs, and coordinating quality control checks. This would likely involve event listeners for new production requests (potentially from `webwaka-commerce`) and triggers for various stages of the manufacturing process.
*   **`src/` Directory Structure:** Anticipated to include modules for:
    *   `production_orders/`: Handling the creation, tracking, and completion of production orders.
    *   `bill_of_materials/`: Managing BOM definitions, versions, and material allocation.
    *   `quality_control/`: Implementing quality checks, defect logging, and approval workflows.
    *   `floor_supervision/`: Potentially integrating with IoT devices or manual input for tracking progress on the production floor.
    *   `integrations/`: Modules for interacting with `webwaka-commerce` (e.g., for receiving sales orders) and potentially other external systems.
*   **`package.json`:** Expected dependencies would include `@webwaka/core` for shared primitives (e.g., event bus types, rate limiting), and potentially libraries for data persistence, messaging, and business logic orchestration.
*   **Migration Files:** Would likely define database schemas for production orders, BOMs, quality control records, and related entities.

**Identified Stubs/Gaps (Hypothetical without Code Access):**

*   **Integration with `webwaka-commerce`:** The exact mechanism for receiving B2B sales orders and initiating production might be a stub or require further development.
*   **Real-time Floor Supervision:** Advanced features like real-time tracking or automated alerts might be placeholders.
*   **Complex Scheduling Algorithms:** Optimization for production scheduling could be an area for future enhancement.

**Architectural Patterns:** Given the 
inter-repository dependencies and the 
Anti-Drift Rules, it's likely that `webwaka-production` adheres to a microservices-like architecture, communicating with other WebWaka OS components via an Event Bus (from `@webwaka/core`) or well-defined APIs. The emphasis on 
immutability (from `webwaka-central-mgmt`) suggests an event-sourcing or similar pattern for critical financial or operational data related to production.


## 5. MASTER TASK REGISTRY (NON-DUPLICATED)

This section lists all tasks specifically assigned to the `webwaka-production` repository. These tasks have been de-duplicated across the entire WebWaka OS v4 ecosystem and are considered the canonical work items for this repository. Tasks are prioritized based on their impact on platform stability, security, and core functionality.

| Task ID | Description | Rationale |
|---|---|---|
| **PROD-001** | Implement Production Order Creation and Management | Core functionality for initiating and tracking manufacturing processes. Essential for `webwaka-production` to fulfill its primary scope. |
| **PROD-002** | Develop Bill of Materials (BOM) Definition and Versioning | Critical for accurate material planning, cost estimation, and ensuring correct product assembly. Prevents material waste and errors. |
| **PROD-003** | Integrate Quality Control (QC) Workflows | Ensures product quality and compliance with standards. Directly impacts customer satisfaction and reduces rework costs. |
| **PROD-004** | Implement Floor Supervision and Progress Tracking | Provides visibility into the manufacturing process, enabling efficient resource allocation and identifying bottlenecks. |
| **PROD-005** | Establish Event-Driven Integration with `webwaka-commerce` for B2B Sales Orders | Enables `webwaka-production` to automatically receive and process production requests originating from B2B sales in `webwaka-commerce`. Adheres to the anti-drift rule of relying on `webwaka-commerce` for sales. |
| **PROD-006** | Implement Data Retention and Archiving for Production Records | Ensures compliance with data governance policies and optimizes database performance by managing historical production data. |
| **PROD-007** | Develop API Endpoints for External System Integration (e.g., ERP, MES) | Allows for future expansion and integration with enterprise-level manufacturing systems, enhancing automation and data exchange. |
| **PROD-008** | Implement Role-Based Access Control (RBAC) for Production Modules | Secures access to sensitive production data and functionalities, ensuring only authorized personnel can perform specific actions. Leverages `@webwaka/core` RBAC engine. |

## 6. TASK BREAKDOWN & IMPLEMENTATION PROMPTS

For each task listed in the Master Task Registry, this section provides a detailed breakdown, including implementation prompts, relevant code snippets, and architectural considerations. The goal is to provide a clear path for a Replit agent to execute the task.

### **PROD-001: Implement Production Order Creation and Management**

**Description:** Develop the necessary modules and APIs to create, read, update, and delete production orders. This includes defining the production order schema, handling status transitions (e.g., `pending`, `in_progress`, `completed`, `cancelled`), and associating orders with products and quantities.

**Implementation Prompts:**
*   **Schema Definition:** Define a `ProductionOrder` schema in `src/schemas/production_order.ts` (or similar) including fields like `orderId`, `productId`, `quantity`, `status`, `startDate`, `endDate`, `assignedTo`, `notes`.
*   **API Endpoints:** Create RESTful API endpoints (e.g., `/api/production-orders`) for CRUD operations. Utilize `@webwaka/core` for authentication and authorization.
*   **Status Transitions:** Implement state machine logic for production order status changes, ensuring valid transitions and logging changes.
*   **Event Emission:** Emit `ProductionOrderCreated`, `ProductionOrderUpdated`, `ProductionOrderCompleted` events to the `@webwaka/core` Event Bus for other services to consume.

**Architectural Considerations:**
*   Leverage D1 Query Helpers from `@webwaka/core` for database interactions.
*   Ensure idempotency for API calls to prevent duplicate order creation.
*   Consider using a message queue for asynchronous processing of complex order updates.

### **PROD-002: Develop Bill of Materials (BOM) Definition and Versioning**

**Description:** Create a system for defining and managing Bills of Materials, including components, quantities, and version control. This allows for accurate tracking of raw materials required for each product.

**Implementation Prompts:**
*   **Schema Definition:** Define a `BOM` schema in `src/schemas/bom.ts` including `bomId`, `productId`, `version`, `components` (an array of `{ materialId, quantity }`), `effectiveDate`.
*   **API Endpoints:** Provide API endpoints for creating, retrieving, and updating BOMs. Implement versioning logic to track changes over time.
*   **Material Lookup:** Integrate with a hypothetical `webwaka-inventory` service (or a local material registry) to validate material IDs and retrieve material details.

**Architectural Considerations:**
*   BOMs should be immutable once a version is active. New versions should be created for changes.
*   Consider caching frequently accessed BOMs for performance.

### **PROD-003: Integrate Quality Control (QC) Workflows**

**Description:** Implement modules for defining quality control checks, recording inspection results, and managing non-conformances. This ensures products meet specified quality standards.

**Implementation Prompts:**
*   **Schema Definition:** Define `QualityCheck` schema (`checkId`, `productionOrderId`, `inspectorId`, `checkType`, `result` (pass/fail), `notes`, `defects` (array of `{ defectType, quantity }`)) and `Defect` schema.
*   **API Endpoints:** Create endpoints for recording QC results and managing defects.
*   **Workflow Integration:** Integrate QC checks into the production order lifecycle, potentially pausing production if critical checks fail.
*   **Reporting:** Develop basic reporting capabilities for QC metrics.

**Architectural Considerations:**
*   QC results should be auditable and linked directly to specific production orders.
*   Use `@webwaka/core` for user authentication of inspectors.

### **PROD-004: Implement Floor Supervision and Progress Tracking**

**Description:** Develop features to track the progress of production orders on the factory floor, including real-time updates, task assignments, and milestone tracking.

**Implementation Prompts:**
*   **Schema Definition:** Define `ProductionTask` schema (`taskId`, `productionOrderId`, `stationId`, `assignedTo`, `status`, `startTime`, `endTime`).
*   **API Endpoints:** Endpoints for updating task status, assigning tasks to personnel, and recording milestone completion.
*   **Dashboard View:** (Frontend task, but backend should support) Provide data for a dashboard showing current production status, bottlenecks, and completed tasks.
*   **Event Emission:** Emit `ProductionTaskStarted`, `ProductionTaskCompleted` events.

**Architectural Considerations:**
*   Consider using WebSockets for real-time updates to a floor supervision dashboard.
*   Ensure robust error handling for manual data entry from the floor.

### **PROD-005: Establish Event-Driven Integration with `webwaka-commerce` for B2B Sales Orders**

**Description:** Set up a mechanism for `webwaka-production` to listen for and process events from `webwaka-commerce` related to B2B sales orders that require manufacturing.

**Implementation Prompts:**
*   **Event Listener:** Implement an event listener (e.g., using `@webwaka/core` Event Bus) for `B2BSalesOrderPlaced` or similar events from `webwaka-commerce`.
*   **Order Mapping:** Develop logic to map incoming sales order data to `webwaka-production`'s `ProductionOrder` schema.
*   **Production Order Creation:** Automatically create new production orders based on the received sales order events.
*   **Error Handling:** Implement robust error handling and retry mechanisms for failed event processing.

**Architectural Considerations:**
*   Ensure event contracts between `webwaka-commerce` and `webwaka-production` are clearly defined and versioned.
*   Utilize the webhook DLQ from `webwaka-central-mgmt` for failed event processing.

### **PROD-006: Implement Data Retention and Archiving for Production Records**

**Description:** Develop a strategy and implementation for archiving old production data to optimize performance and comply with data retention policies.

**Implementation Prompts:**
*   **Retention Policy:** Define data retention policies for different types of production data (e.g., 5 years for orders, 10 years for QC results).
*   **Archiving Mechanism:** Implement a scheduled job (e.g., a cron job or serverless function) to identify and move old data to an archive database or cold storage.
*   **Data Access:** Ensure archived data can still be accessed for auditing or reporting purposes, albeit with potentially slower retrieval times.

**Architectural Considerations:**
*   Coordinate with `webwaka-central-mgmt` for data retention pruning policies.
*   Consider using a separate database or object storage (e.g., S3) for archived data.

### **PROD-007: Develop API Endpoints for External System Integration (e.g., ERP, MES)**

**Description:** Create secure and well-documented API endpoints that allow external Enterprise Resource Planning (ERP) or Manufacturing Execution Systems (MES) to interact with `webwaka-production`.

**Implementation Prompts:**
*   **API Design:** Design clear and consistent API endpoints for common integration scenarios (e.g., `GET /production-orders/{id}`, `POST /production-orders`, `PUT /production-orders/{id}/status`).
*   **Authentication/Authorization:** Implement API key management and RBAC using `@webwaka/core` to secure external access.
*   **Documentation:** Generate API documentation (e.g., OpenAPI/Swagger) for external integrators.
*   **Rate Limiting:** Apply rate limiting from `@webwaka/core` to prevent abuse.

**Architectural Considerations:**
*   Ensure API responses are consistent and informative.
*   Consider using webhooks for external systems to receive updates from `webwaka-production`.

### **PROD-008: Implement Role-Based Access Control (RBAC) for Production Modules**

**Description:** Integrate the `@webwaka/core` RBAC engine to control access to various functionalities within `webwaka-production`, ensuring users only have permissions relevant to their roles (e.g., Production Manager, Floor Supervisor, QC Inspector).

**Implementation Prompts:**
*   **Role Definition:** Define specific roles and their associated permissions within `webwaka-production` (e.g., `production_manager_role` can create/update orders, `qc_inspector_role` can record QC results).
*   **Middleware Integration:** Integrate `@webwaka/core` RBAC middleware into API routes to enforce permissions.
*   **Permission Checks:** Implement granular permission checks within business logic where necessary.

**Architectural Considerations:**
*   Leverage the centralized RBAC engine in `@webwaka/core` to maintain consistency across the ecosystem.
*   Ensure that UI components (frontend) also respect these RBAC rules by conditionally rendering features.

## 7. QA PLANS & PROMPTS

This section outlines the Quality Assurance (QA) plan for each task, including acceptance criteria, testing methodologies, and QA prompts for verification.

### **PROD-001: Implement Production Order Creation and Management**

**Acceptance Criteria:**
*   Production orders can be created, retrieved, updated, and deleted via API.
*   Production order status transitions correctly based on defined logic.
*   Appropriate events are emitted to the Event Bus upon order creation, update, and completion.
*   Authentication and authorization are enforced for all API operations.

**Testing Methodologies:**
*   **Unit Tests:** For schema validation, status transition logic, and event emission.
*   **Integration Tests:** For API endpoint functionality, database interactions, and `@webwaka/core` integrations.
*   **End-to-End Tests:** Simulate creation, update, and completion of a production order, verifying event consumption by other services (if applicable).

**QA Prompts:**
*   "Create a production order for Product X with quantity Y. Verify its status is `pending`."
*   "Update the status of Production Order Z to `in_progress`. Confirm no invalid status transitions are allowed."
*   "Verify that a `ProductionOrderCompleted` event is visible on the Event Bus after marking an order as complete."

### **PROD-002: Develop Bill of Materials (BOM) Definition and Versioning**

**Acceptance Criteria:**
*   BOMs can be created, retrieved, and updated with versioning.
*   Components and quantities are correctly associated with products in the BOM.
*   New BOM versions are created for changes, and old versions remain accessible.

**Testing Methodologies:**
*   **Unit Tests:** For BOM schema validation and versioning logic.
*   **Integration Tests:** For API endpoint functionality and database persistence of BOMs.

**QA Prompts:**
*   "Create a BOM for Product A with components B (2 units) and C (1 unit). Verify the BOM details."
*   "Update the BOM for Product A, changing component B to 3 units. Verify a new version is created and the old version is still retrievable."

### **PROD-003: Integrate Quality Control (QC) Workflows**

**Acceptance Criteria:**
*   QC checks can be recorded for production orders.
*   Inspection results (pass/fail) and defects are accurately stored.
*   QC data is linked to the relevant production order.

**Testing Methodologies:**
*   **Unit Tests:** For QC schema validation and defect logging.
*   **Integration Tests:** For API endpoint functionality and data storage.

**QA Prompts:**
*   "Record a 'Pass' QC check for Production Order P, with Inspector I. Verify the record."
*   "Record a 'Fail' QC check for Production Order Q, noting 'Scratches' as a defect. Verify the defect is associated."

### **PROD-004: Implement Floor Supervision and Progress Tracking**

**Acceptance Criteria:**
*   Production tasks can be created, assigned, and their status updated.
*   Milestone completion is accurately recorded.
*   Events are emitted for task start and completion.

**Testing Methodologies:**
*   **Unit Tests:** For task schema validation and status updates.
*   **Integration Tests:** For API endpoint functionality and event emission.

**QA Prompts:**
*   "Assign Task T of Production Order P to User U. Verify the assignment."
*   "Mark Task T as 'completed'. Verify a `ProductionTaskCompleted` event is emitted."

### **PROD-005: Establish Event-Driven Integration with `webwaka-commerce` for B2B Sales Orders**

**Acceptance Criteria:**
*   `webwaka-production` successfully consumes `B2BSalesOrderPlaced` events from `webwaka-commerce`.
*   A new production order is automatically created in `webwaka-production` upon receiving a valid sales order event.
*   Error handling and retry mechanisms are functional for failed event processing.

**Testing Methodologies:**
*   **Integration Tests:** Simulate `B2BSalesOrderPlaced` event emission from `webwaka-commerce` and verify production order creation in `webwaka-production`.
*   **Negative Testing:** Test with malformed events to ensure robust error handling.

**QA Prompts:**
*   "Trigger a `B2BSalesOrderPlaced` event from `webwaka-commerce`. Verify a corresponding production order is created in `webwaka-production`."
*   "Introduce an invalid `productId` in a `B2BSalesOrderPlaced` event. Verify the event is handled gracefully (e.g., logged to DLQ) and no invalid production order is created."

### **PROD-006: Implement Data Retention and Archiving for Production Records**

**Acceptance Criteria:**
*   Production records older than the defined retention policy are correctly identified and moved to archive storage.
*   Archived data remains accessible for auditing purposes.
*   The archiving process does not impact the performance of active production data.

**Testing Methodologies:**
*   **Unit Tests:** For data identification logic based on retention policies.
*   **Integration Tests:** Simulate archiving process and verify data movement and accessibility from archive.

**QA Prompts:**
*   "Create a production order with a `completionDate` from 3 years ago. After the archiving job runs, verify it has been moved to archive storage."
*   "Attempt to retrieve an archived production order. Verify it is accessible."

### **PROD-007: Develop API Endpoints for External System Integration (e.g., ERP, MES)**

**Acceptance Criteria:**
*   External API endpoints are functional and return expected data.
*   API key authentication and RBAC are enforced for external access.
*   API documentation is accurate and up-to-date.
*   Rate limiting is applied to external API calls.

**Testing Methodologies:**
*   **Integration Tests:** Test all external API endpoints with valid and invalid API keys/permissions.
*   **Performance Tests:** Evaluate API response times under load.

**QA Prompts:**
*   "Using a valid API key, retrieve details for Production Order X via the external API. Verify the response."
*   "Attempt to access an external API endpoint with an invalid API key. Verify access is denied."
*   "Exceed the rate limit for an external API. Verify the rate limit is enforced."

### **PROD-008: Implement Role-Based Access Control (RBAC) for Production Modules**

**Acceptance Criteria:**
*   Users with specific roles can only access functionalities permitted by their role.
*   Unauthorized access attempts are correctly denied.
*   RBAC is consistently applied across all protected modules and API endpoints.

**Testing Methodologies:**
*   **Unit Tests:** For individual permission checks within business logic.
*   **Integration Tests:** Test API endpoints with users assigned different roles, verifying access control.

**QA Prompts:**
*   "Log in as a `production_manager_role` user. Verify the ability to create a production order and the inability to perform a QC check."
*   "Log in as a `qc_inspector_role` user. Verify the ability to record a QC check and the inability to delete a production order."

## 8. EXECUTION READINESS NOTES

Before commencing execution of tasks within the `webwaka-production` repository, the Replit agent should carefully review the following:

*   **Dependency Awareness:** All tasks assume the availability and correct functioning of `@webwaka/core` for shared primitives (Auth, RBAC, Event Bus, D1 Query Helpers) and `webwaka-central-mgmt` for ledger and data retention policies. Ensure these dependencies are correctly configured and accessible.
*   **Event-Driven Architecture:** Tasks involving integration with `webwaka-commerce` (PROD-005) are event-driven. The agent must ensure proper event listening and handling mechanisms are in place, including robust error handling and utilization of the Dead Letter Queue (DLQ) in `webwaka-central-mgmt`.
*   **Schema Adherence:** Strict adherence to defined data schemas (e.g., `ProductionOrder`, `BOM`, `QualityCheck`) is paramount to maintain data integrity and interoperability across the WebWaka OS ecosystem.
*   **Security Best Practices:** All API endpoints, both internal and external, must implement authentication, authorization (via `@webwaka/core` RBAC), and rate limiting as specified. API keys for external integrations should be managed securely.
*   **Testing Protocol:** Comprehensive unit, integration, and end-to-end tests, as outlined in the QA Plans, must be developed and passed for each implemented task to ensure stability and correctness.
*   **Documentation:** Any new modules, APIs, or significant changes should be thoroughly documented, potentially contributing to `webwaka-platform-docs` where appropriate.
*   **Immutability:** For critical data like BOM versions and financial transactions (via `webwaka-central-mgmt`), ensure immutability principles are followed to maintain an auditable history.
*   **Placeholder Sections:** Sections 4, 5, 6, and 7 contain detailed analysis and tasks. The agent should treat the provided content as a starting point and conduct a thorough live code review to populate these sections with actual findings and concrete implementation details. The current content for these sections is based on inferred understanding and needs to be validated against the live codebase.

By following these guidelines, the Replit agent can ensure a smooth and successful execution of the `webwaka-production` taskbook, contributing to the overall stability and functionality of the WebWaka OS v4 ecosystem.
