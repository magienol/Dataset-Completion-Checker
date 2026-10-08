# Dataset Completion Checker

See whether a monthly dataset has data for an organisation unit, whether that submission is marked complete, and mark it complete or incomplete.

It is meant for staff who follow up facility reporting. It uses the organisation unit hierarchy and level names configured on the DHIS2 server, so it is not tied to one country's structure.

## Requirements

- DHIS2 2.40 through 2.43.1
- Datasets with period type Monthly
- A user who can view the organisation units, datasets, data values and completion registrations they need to check
- No external service. The app talks only to the DHIS2 API

## How to use it

1. Sign in through the DHIS2 header bar.
2. Choose a year, a month and a monthly dataset.
3. Select one organisation unit in the tree, or choose organisation unit groups and then **All units in selected groups**.
4. Click **Analyze datasets**.
5. Use **Data presence** and **Completion status** to narrow the table.
6. Mark a row complete or incomplete, or export the current result as Excel, CSV or a printed report.

Organisation unit columns in the table and in the export use the level names from the server, such as the names configured under Organisation unit levels.

The app loads organisation unit details for the units on the current page, and loads the rest only when you export. It does not download the full organisation unit hierarchy when it opens.

## Development

```bash
yarn install
yarn start
```

`yarn start` serves the app at http://localhost:3000/ and asks for the DHIS2 server address on the sign-in screen.
