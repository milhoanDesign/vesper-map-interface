# Vesper Listings Map - Interface Extension

An Airtable Interface Extension that displays Requirements and Listings on an interactive Google Map with geocoding, radius visualization, and detailed listing information.

## Features

- **Requirements Display**: Blue circular markers with 15-mile radius circles
- **Listings Display**: Red markers with clickable info windows
- **Geocoding**: Automatic address-to-coordinates conversion using Google Maps API
- **Info Windows**: Display listing details including:
  - Address
  - Drive distance and time
  - Linked requirement name
  - URL link to visit listing
- **Auto-fit Bounds**: Map automatically adjusts to show all markers
- **Configuration UI**: User-friendly interface for setting up custom properties

## Configuration

This extension uses Airtable custom properties for configuration. Access the properties panel to configure:

### Required Properties

1. **Google Maps API Key** - Your Google Maps JavaScript API key
2. **Requirements Table** - Table containing requirement records
3. **Listings Table** - Table containing listing records
4. **Requirement Address Field** - Text field with requirement addresses
5. **Listing Address Field** - Text field with listing addresses

### Optional Properties

6. **Listing URL Field** - URL or text field with listing links
7. **Listing Distance Field** - Number field with drive distance in miles
8. **Listing Drive Time Field** - Number field with drive time in minutes
9. **Listing Requirements Link Field** - Linked record field connecting to Requirements

## Technical Implementation

### Compliance with Airtable Interface Extension Rules

This extension is fully compliant with Airtable's Interface Extension guidelines:

- ✅ All tables accessed via custom properties (no hardcoded table names)
- ✅ All fields accessed via custom properties (no hardcoded field names)
- ✅ FieldType enum used for all field type comparisons
- ✅ Proper imports from `@airtable/blocks/interface/ui` and `@airtable/blocks/interface/models`
- ✅ Configuration UI displayed when properties are missing
- ✅ No deprecated Blocks SDK UI components

### Key Technologies

- **React 19** - UI framework
- **Google Maps JavaScript API** - Map rendering and geocoding
- **Airtable Blocks SDK** - Interface Extension framework (interface-alpha)

### File Structure

```
vesper_listings_map/
├── frontend/
│   ├── index.js       # Main component with map logic
│   └── style.css      # Map container styles
├── .block/
│   └── remote.json    # Extension ID configuration
├── .cursor/
│   └── rules/
│       └── interface-extensions.mdc  # Development rules
├── package.json
└── README.md
```

## Development

### Running Locally

```bash
block run
```

The extension will be available at https://localhost:9000

### Architecture

The extension uses React hooks for state management:

- `useBase()` - Access to Airtable base
- `useRecords()` - Subscribe to table records
- `useCustomProperties()` - Configuration management
- `useEffect()` - Google Maps API loading and marker initialization
- `useRef()` - Map instance and marker/circle references

### Custom Properties Setup

Custom properties are defined in `getCustomProperties` callback:

```javascript
const getCustomProperties = useCallback((base) => {
    const foundRequirementsTable = base.getTableByNameIfExists('Requirements');
    const foundListingsTable = base.getTableByNameIfExists('Listings');
    const reqTable = foundRequirementsTable || base.tables[0];
    const listTable = foundListingsTable || base.tables[1] || base.tables[0];

    return [
        {
            key: 'requirementsTable',
            label: 'Requirements Table',
            type: 'table',
            defaultValue: foundRequirementsTable || base.tables[0]
        },
        // ... additional properties
    ];
}, []);
```

### Accessing Data

All data access uses custom properties:

```javascript
const requirementsTable = customPropertyValueByKey.requirementsTable;
const requirementRecords = useRecords(requirementsTable);
const addressField = customPropertyValueByKey.requirementAddressField;
const address = record.getCellValueAsString(addressField.id);
```

## Refactoring History

This extension was refactored to comply with Airtable Interface Extension rules:

### Changes Made

1. **Added Table Custom Properties** - Replaced hardcoded table access
2. **Added Field Custom Properties** - Replaced all hardcoded field names with 6 configurable properties
3. **Removed Fallback Pattern** - Eliminated `base.tables[0]` references from component code
4. **Improved Error States** - Added comprehensive configuration UI
5. **Code Cleanup** - Removed debug logs, kept warnings only

### Before (Non-Compliant)

```javascript
const requirementsTable = base.getTableByNameIfExists('Requirements');
const addressField = table.getFieldByNameIfExists('Address');
```

### After (Compliant)

```javascript
// In getCustomProperties setup
{
    key: 'requirementsTable',
    type: 'table',
    defaultValue: base.getTableByNameIfExists('Requirements')
}

// In component
const requirementsTable = customPropertyValueByKey.requirementsTable;
const addressField = customPropertyValueByKey.requirementAddressField;
```

## Extension Details

- **Extension ID**: `blk133Gzv3nR0QlWT`
- **SDK Version**: interface-alpha
- **React Version**: 19.1.0

## License

Proprietary - Vesper/Milhoan Design
