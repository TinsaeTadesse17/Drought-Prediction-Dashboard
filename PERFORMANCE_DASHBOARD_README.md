# Performance Monitoring Dashboard

This dashboard has been customized to match the performance monitoring examples you provided, focusing on the Afar and Somali regions with three woredas each.

## Features Implemented

### 🗺️ Interactive Map
- **Real GeoJSON Data**: Uses actual shape files for Afar and Somali regions
- **Choropleth Visualization**: Color-coded woredas based on performance indicators
- **Interactive Popups**: Click on woredas to see detailed performance data
- **Compass Rose**: North indicator in the top-right corner
- **Color Legend**: Performance scale from 0-100%

### 📊 Dashboard Layout
- **Header**: "Performance Monitoring Dashboard" with "Monthly Indicators Analysis"
- **Left Panel**: Analytics filters matching your examples
- **Chart Type Tabs**: Line, Bar, Combo, Table, Map (Map is fully implemented)
- **Color Mode Toggle**: Multi Color / Single Color options
- **Disaggregation Button**: Available for future implementation

### 🎛️ Filter Controls
- **Program**: MCAH-Maternal, Child, and Adoles...
- **Sub Program**: Maternal Health (MH), Child Health (CH), Adolescent Health (AH)
- **Indicators**: ANC 8+ Contact Coverage, Facility Delivery Rate, Postnatal Care Coverage
- **X-axis**: Monthly, Quarterly, Yearly
- **Legend**: Indicators, Regions, Zones
- **Year**: 2017-2023
- **Org Units**: Somali Region, Afar Region, All Regions
- **Ownership**: All, Public, Private

## Woredas Included

### Afar Region (3 woredas with sample data)
1. **Abaala** (Kilbati /Zone2) - Performance: 44.29%, Target: 52.57%
2. **Abaala town** (Kilbati /Zone2) - Performance: 67.34%, Target: 75.0%
3. **Adar** (Awsi /Zone 1) - Performance: 38.92%, Target: 45.0%

### Somali Region (3 woredas with sample data)
1. **Aba-Korow** (Shabelle) - Performance: 52.15%, Target: 60.0%
2. **Adadle** (Shabelle) - Performance: 71.23%, Target: 80.0%
3. **Afdem** (Siti) - Performance: 29.87%, Target: 40.0%

## Technical Implementation

### GeoJSON Integration
- **File Location**: `public/afar_woredas.geojson` and `public/somali_woredas.geojson`
- **Properties Used**: 
  - `ADM3_EN`: Woreda name
  - `ADM2_EN`: Zone name
  - `ADM1_EN`: Region name
  - `Woreda_ID`: Unique identifier for data mapping

### Map Features
- **Leaflet Integration**: Direct GeoJSON import using `L.geoJSON()`
- **Dynamic Styling**: Color coding based on performance values
- **Interactive Elements**: Click handlers and popup information
- **Responsive Design**: Adapts to different screen sizes

### Color Scheme
- **Red (0-20%)**: Very low performance
- **Orange (20-40%)**: Low performance  
- **Yellow (40-60%)**: Moderate performance
- **Light Green (60-80%)**: Good performance
- **Dark Green (80-100%)**: Excellent performance

## Usage

1. **Select Region**: Choose between Somali or Afar regions
2. **Adjust Filters**: Use the left panel to modify indicators, years, etc.
3. **View Map**: The map automatically updates based on selections
4. **Interact**: Click on woredas to see detailed performance data
5. **Switch Views**: Use the chart type tabs to switch between visualization modes

## Future Enhancements

- [ ] Implement other chart types (Line, Bar, Combo, Table)
- [ ] Add real-time data integration
- [ ] Implement disaggregation functionality
- [ ] Add export capabilities
- [ ] Include more performance indicators
- [ ] Add historical trend analysis

## Files Modified/Created

- `components/performance-map.tsx` - New map component using GeoJSON
- `components/performance-dashboard.tsx` - New dashboard layout
- `src/app/page.tsx` - Updated to use new dashboard
- `lib/regions.ts` - Updated with actual woreda names
- `public/afar_woredas.geojson` - Copied from root
- `public/somali_woredas.geojson` - Copied from root
