# Dataset Completion Checker

A DHIS2 application for monitoring **monthly dataset reporting, data presence, and dataset completion status** across organisation units.

The **Dataset Completion Checker** is designed to support M&E, and reporting teams in identifying facilities or organisation units that have submitted data but have not completed their dataset, as well as those that have not submitted data.

The application uses the **organisation unit hierarchy and organisation unit level names configured on the DHIS2 server**, making it adaptable to different countries and health information system structures without requiring country-specific organisation unit configuration.

---

## Features

* 📊 **Dataset Reporting Analysis**

  * Analyze monthly reporting status across selected organisation units.
  * Identify organisation units with or without submitted data.

* ✅ **Completion Status Monitoring**

  * Check whether a dataset submission has been marked as complete.
  * Mark submissions as **Complete** or **Incomplete** directly from the application.

* 🏢 **Organisation Unit Hierarchy**

  * Uses the organisation unit hierarchy configured in DHIS2.
  * Dynamically displays organisation unit level names from the DHIS2 server.
  * Supports different national and organisational structures.

* 👥 **Organisation Unit Groups**

  * Select individual organisation units from the hierarchy.
  * Select organisation unit groups.
  * Analyze **all units in selected groups**.

* 🔎 **Advanced Filtering**

  * Filter results by:

    * Data Presence
    * Completion Status

* 📤 **Export and Reporting**

  * Export analysis results to:

    * Excel
    * CSV
    * Printable reports

* ⚡ **Optimized Data Loading**

  * Loads organisation unit details only for the units displayed on the current page.
  * Additional organisation unit information is loaded when required for exports.
  * Avoids downloading the complete organisation unit hierarchy when the application starts.

* 🔐 **DHIS2 Authentication**

  * Uses the DHIS2 authentication session.
  * No separate authentication service is required.

* 🌐 **Direct DHIS2 API Integration**

  * Communicates directly with the DHIS2 Web API.
  * No external backend or intermediary service is required.

---

## Use Cases

The Dataset Completion Checker can be used by:

* Ministry of Health HMIS teams
* Monitoring and Evaluation teams
* County and state health information teams
* District health management teams
* Programme monitoring teams
* Facility reporting focal persons
* DHIS2 administrators

Typical use cases include:

> **"Which facilities have submitted data for this month?"**

> **"Which facilities have data but have not completed their dataset?"**

> **"Which organisation units have not reported?"**

> **"Which submissions are incomplete?"**

> **"Can I mark the selected submission as complete?"**

---

## Requirements

### DHIS2 Compatibility

The application supports:

| Component        | Requirement                |
| ---------------- | -------------------------- |
| DHIS2            | 2.40 – 2.43.1              |
| Dataset type     | Monthly                    |
| Authentication   | DHIS2 authentication       |
| External backend | Not required               |
| Internet/Network | Access to the DHIS2 server |

### User Permissions

The user must have appropriate DHIS2 permissions to access the resources being analyzed, including:

* Organisation units
* Organisation unit groups
* Datasets
* Data values
* Dataset completion registrations

The exact permissions required may depend on the DHIS2 version and the user's assigned role.

---

## How It Works

The application follows a simple workflow:

```text
User Authentication
        │
        ▼
Select Year + Month + Dataset
        │
        ▼
Select Organisation Units
        │
        ▼
Analyze Datasets
        │
        ▼
Retrieve Reporting Information
        │
        ├───────────────┐
        ▼               ▼
Data Presence     Completion Status
        │               │
        └───────┬───────┘
                ▼
        Review Reporting Status
                │
        ┌───────┴────────┐
        ▼                ▼
 Mark Complete     Mark Incomplete
        │
        ▼
      Export
```

---

## Getting Started

### 1. Sign In

Open the application and sign in using the DHIS2 authentication interface provided through the DHIS2 header bar.

### 2. Select Reporting Period

Select:

* Year
* Month
* Monthly dataset

### 3. Select Organisation Units

You can select:

* An individual organisation unit from the organisation unit tree; or
* One or more organisation unit groups.

When using organisation unit groups, select:

**All units in selected groups**

to analyze all organisation units belonging to the selected groups.

### 4. Analyze Datasets

Click:

**Analyze Datasets**

The application retrieves the relevant reporting information from DHIS2 and displays the results in a table.

### 5. Filter Results

Use the available filters to narrow the results by:

**Data Presence**

and

**Completion Status**

This makes it easier to identify specific reporting gaps.

### 6. Update Completion Status

From the results table, authorized users can mark a dataset submission as:

* **Complete**
* **Incomplete**

The change is submitted directly to DHIS2.

### 7. Export Results

The current results can be exported as:

* **Excel**
* **CSV**
* **Print Report**

The exported organisation unit columns use the organisation unit level names configured on the DHIS2 server.

---

## Organisation Unit Structure

The application does not assume a fixed national organisation unit structure.

Instead, it retrieves organisation unit information from DHIS2 and uses the organisation unit levels configured on the server.

For example, a DHIS2 implementation may use:

```text
Country
  └── State
      └── County
          └── Payam
              └── Facility
```

Another implementation may use:

```text
Country
  └── Region
      └── District
          └── Health Facility
```

The application adapts to the configured structure rather than hard-coding these levels.

This makes the application suitable for deployment in different DHIS2 implementations.

---

## Performance Optimization

The application is designed to avoid unnecessarily loading large organisation unit hierarchies.

When the application is opened:

* It does **not** download the complete organisation unit hierarchy.
* Organisation unit details are loaded for the units required on the current page.
* Additional organisation unit information is retrieved when an export is requested.
* Pagination is used to manage large result sets.

This approach helps reduce:

* Initial loading time
* Memory usage
* Unnecessary API requests
* Network traffic

and improves usability when working with large DHIS2 instances.

---

## Architecture

The application follows a client-side architecture that communicates directly with the DHIS2 Web API.

```text
┌──────────────────────────────┐
│          DHIS2 User          │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│    Dataset Completion        │
│          Checker             │
│                              │
│        React Frontend        │
└──────────────┬───────────────┘
               │
               │ DHIS2 Web API
               ▼
┌──────────────────────────────┐
│        DHIS2 Server          │
│                              │
│  • Organisation Units        │
│  • Organisation Unit Groups  │
│  • Datasets                  │
│  • Data Values               │
│  • Completion Registrations  │
└──────────────────────────────┘
```

### External Services

No external application server or third-party data service is required.

The application communicates directly with the DHIS2 instance.

---

## Technology Stack

The application is built using technologies from the DHIS2 application ecosystem.

| Technology                 | Purpose                                |
| -------------------------- | -------------------------------------- |
| React 18                   | Frontend application                   |
| DHIS2 Web API              | Data access and updates                |
| DHIS2 UI                   | User interface components              |
| DHIS2 Application Platform | Application development and deployment |
| JavaScript                 | Application logic                      |
| Yarn                       | Dependency management                  |

---

## Development

### Prerequisites

Before developing the application, ensure that you have:

* Node.js
* Yarn
* Git
* Access to a DHIS2 development instance

### Clone the Repository

```bash
git clone <repository-url>
cd dataset-completion-checker
```

### Install Dependencies

```bash
yarn install
```

### Start the Development Server

```bash
yarn start
```

The application will be available at:

```text
http://localhost:3000/
```

The application will prompt you to provide the DHIS2 server address on the sign-in screen.

---

## Building the Application

To create a production build:

```bash
yarn build
```

The resulting build can then be deployed according to the DHIS2 application deployment process used by the target DHIS2 instance.

---

## Project Structure

A typical project structure is organized as follows:

```text
dataset-completion-checker/
│
├── src/
│   ├── components/
│   ├── pages/
│   ├── services/
│   ├── utils/
│   └── ...
│
├── public/
├── package.json
├── yarn.lock
├── README.md
└── .gitignore
```

The exact structure may vary depending on the current application implementation.

---

## Data Security

The application does not introduce a separate user database or external data storage service.

Authentication and authorization are handled through the DHIS2 instance.

Access to data and the ability to update dataset completion status are therefore dependent on the permissions assigned to the authenticated DHIS2 user.

Users should only be granted the minimum permissions required to perform their responsibilities.

---

## Compatibility

The application is intended for:

```text
DHIS2 2.40
DHIS2 2.41
DHIS2 2.42
DHIS2 2.43
DHIS2 2.43.1
```

> **Note:** Compatibility may depend on the DHIS2 Web API and application platform behavior of the specific DHIS2 version. Testing against the target DHIS2 instance is recommended before production deployment.

---

## Troubleshooting

### The application does not load

Check that:

1. The development server is running.
2. The DHIS2 server address is correct.
3. The browser can reach the DHIS2 instance.
4. The authenticated user has the required permissions.

### No organisation units are displayed

Check:

* Organisation unit access assigned to the user.
* Organisation unit hierarchy configuration.
* Organisation unit groups and memberships.
* Network connectivity between the browser and DHIS2.

### No reporting results are displayed

Verify that:

* The correct dataset has been selected.
* The selected dataset has a **Monthly** period type.
* The selected organisation units are within the user's data access scope.
* Data exists for the selected reporting period.

### Completion status cannot be updated

Verify that the authenticated user has permission to update dataset completion registrations.

---

## Contributing

Contributions, improvements, and bug reports are welcome.

Before submitting changes:

1. Create a new branch.

```bash
git checkout -b feature/my-feature
```

2. Make and test your changes.

3. Commit the changes.

```bash
git add .
git commit -m "Add my feature"
```

4. Push the branch.

```bash
git push origin feature/my-feature
```

5. Create a Pull Request for review.

Please provide a clear description of:

* What was changed
* Why the change was required
* How the change was tested
* Any DHIS2 version-specific considerations

---

## Versioning

Application versions should follow a consistent versioning approach so that deployments can be tracked across development, testing, and production environments.

Example:

```text
v1.0.0
v1.1.0
v1.1.1
```

---

## Authors

**Ministry of Health (MoH), South Sudan**
**HISP South Sudan**

---

## Maintainers

**MoH South Sudan — Health Information System Team**

**HISP South Sudan**

---

## License

License information will be added when the project's licensing terms are formally defined.

---

## Acknowledgements

This application was developed to support the strengthening of **routine health information reporting and dataset completion monitoring** within DHIS2-based health information systems.

Special acknowledgement to the **Ministry of Health, South Sudan**, and **HISP South Sudan** for supporting the development and use of DHIS2-based digital health information systems.

---

## Support

For application-related issues, configuration questions, or DHIS2 compatibility concerns, please contact the project maintainers or the relevant DHIS2 technical support team.

---

### Built for DHIS2

This application is designed to work within the DHIS2 ecosystem and uses the DHIS2 Web API for accessing and updating reporting information.
