const config = {
    type: 'app',
    name: 'Dataset-Completion-Checker',
    title: 'Dataset Completion Checker',
    description: 'See whether a monthly dataset has data and whether it has been marked complete, then mark it complete or incomplete. Useful for staff who follow up facility reporting. Choose a month, a monthly dataset and an organisation unit, or analyse every unit in selected organisation unit groups. Organisation unit columns use the level names configured on the server. Requires DHIS2 2.40 through 2.43.1 and datasets with a monthly period type. The app uses only the DHIS2 API and does not connect to any external service.',
    minDHIS2Version: '2.40',
    maxDHIS2Version: '2.43.1.0',
    entryPoints: {
        app: './src/App.jsx',
    },
}

module.exports = config
