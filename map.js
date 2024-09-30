// Define the bounding box for Long Island, NYC, and Westchester (example coordinates)
const viewbox = [
  [-74.25909, 40.477399],  // Southwest corner (Staten Island)
  [-71.751709, 41.332]     // Northeast corner (Westchester/Long Island)
];

// Define the full map area (covering the world map bounds)
const fullMapArea = [
  [-90, -180],    // Southwest corner of the world
  [-90, 180],     // Southeast corner of the world
  [90, 180],      // Northeast corner of the world
  [90, -180]      // Northwest corner of the world
];

// Initialize the map
const map = L.map('map').setView([40.85, -73.135], 10);

// Add the OpenStreetMap tile layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 18,
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Define a polygon that covers the entire map with a "hole" for the viewbox
const grayedOutPolygon = L.polygon([
  fullMapArea,  // Outer boundary (world map)
  [
      [viewbox[0][1], viewbox[0][0]],  // Southwest corner of viewbox
      [viewbox[0][1], viewbox[1][0]],  // Southeast corner
      [viewbox[1][1], viewbox[1][0]],  // Northeast corner
      [viewbox[1][1], viewbox[0][0]]   // Northwest corner
  ]  // Inner boundary (the viewbox area, excluded from the gray overlay)
], {
  color: 'gray',  // Outline color
  fillColor: 'gray',  // Gray fill for the outer area
  fillOpacity: 0.75,  // Semi-transparency for grayed-out area
  stroke: false  // No outline for the polygon
}).addTo(map);

// Optionally, draw the viewbox border for clarity
const viewboxBorder = L.rectangle([
  [viewbox[0][1], viewbox[0][0]],  // Southwest corner
  [viewbox[1][1], viewbox[1][0]]   // Northeast corner
], {
  fillOpacity: 0,  // Fully opaque to mask the gray
}).addTo(map);


// Function to create a radius circle around a point
function createRadiusCircle(lat, lon, radiusFeet) {
    const radiusMeters = radiusFeet * 0.3048; // Convert feet to meters
    return L.circle([lat, lon], {
        color: 'blue',
        fillColor: '#03f',
        fillOpacity: 0.4,
        radius: radiusMeters
    });
}

// Function to update the map with radius circles
function updateMap(stations, radiusFeet) {
    map.eachLayer(layer => {
        if (layer instanceof L.Circle) {
            map.removeLayer(layer);
        }
    });

    stations.forEach(station => {
        const circle = createRadiusCircle(station.Latitude, station.Longitude, radiusFeet);
        circle.addTo(map).bindPopup(`<b>${station.Business}</b><br>${station["Street Address"]}, ${station.City}, ${station.State} ${station.ZIP}<br>Radius: ${radiusFeet} ft.`);
    });
}

// Fetch gas stations from the CSV file
function fetchGasStationsFromCSV(callback) {
    const csvUrl = 'data.csv'; // Data source: https://data.ny.gov/Energy-Environment/Fuel-NY-Emergency-Generators-and-Transfer-Switches/i67p-6ac2/about_data

    Papa.parse(csvUrl, {
        download: true,
        header: true,
        complete: function(results) {
            callback(results.data); // The parsed data from the CSV
        }
    });
}

// Initial fetch and render
fetchGasStationsFromCSV(stations => {
    updateMap(stations, 300); // Default radius
});

// Update radius on user selection
document.getElementById('radius').addEventListener('change', function() {
    const radiusFeet = parseInt(this.value, 10);
    fetchGasStationsFromCSV(stations => {
        updateMap(stations, radiusFeet);
    });
});

// Create a marker for the searched home address
let homeMarker;

// Function to show and hide the loading indicator
function showLoading(isLoading) {
    const loadingElement = document.getElementById('loading');
    loadingElement.style.display = isLoading ? 'block' : 'none';
}

// Function to format the address (remove state and ZIP code, and abbreviate street)
function formatAddress(display_name) {
  // Split the address into parts
  const addressParts = display_name.split(',');

  // Extract the street address (part 0), city (part 1), and optionally borough (part 2 if present)
  const streetAddress = `${addressParts[0].trim()} ${addressParts[1].trim()}`; // Street address like '1238 63rd Street'
  const cityOrBorough = addressParts[2].trim(); // City or Borough like 'Brooklyn'

  // Format street abbreviation (replace "Street" with "St" and others similarly)
  const streetAbbreviations = {
    'Street': 'St',
    'Avenue': 'Ave',
    'Boulevard': 'Blvd',
    'Road': 'Rd',
    'Drive': 'Dr',
    'Court': 'Ct',
    'Lane': 'Ln',
    'Terrace': 'Ter',
    'Place': 'Pl',
    'Highway': 'Hwy',
    'Parkway': 'Pkwy',
    'Circle': 'Cir',
    'Expressway': 'Expy',
    'Square': 'Sq',
    'Trail': 'Trl',
    'Way': 'Way',
    'Loop': 'Loop',
    'Alley': 'Aly',
    'Crescent': 'Cres',
    'Row': 'Row',
    'Walk': 'Walk',
    'Plaza': 'Plz',
    'Esplanade': 'Esp'
  };

  // Function to replace street types based on the mapping
  const formatStreetAddress = (streetAddress) => {
      return Object.keys(streetAbbreviations).reduce((formatted, fullType) => {
          const abbreviation = streetAbbreviations[fullType];
          const regex = new RegExp(`\\b${fullType}\\b`, 'i');  // Case-insensitive whole word matching
          return formatted.replace(regex, abbreviation);
      }, streetAddress);
  };

  // Construct the formatted address with city or borough
  const formattedAddress = `${formatStreetAddress(streetAddress)}, ${cityOrBorough}`;

  return formattedAddress;
}

// Function to geocode the address
function geocodeAddress(address, callback) {
    showLoading(true);

    // Define the bounding box for Long Island, NYC, and Westchester
    const viewbox = '-74.25909,40.477399,-71.751709,41.332';
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&viewbox=${viewbox}&bounded=1`;

    fetch(nominatimUrl)
        .then(response => response.json())
        .then(data => {
            showLoading(false);
            if (data.length > 0) {
                const { lat, lon, display_name } = data[0];
                const formattedAddress = formatAddress(display_name);
                callback(lat, lon, formattedAddress);
            } else {
                alert('Address not found.');
            }
        })
        .catch(error => console.error('Error geocoding address:', error));
}

// Function to add marker and zoom to address
function zoomToAddress(lat, lon, formattedAddress) {
    // Remove the existing home marker if it exists
    if (homeMarker) {
        map.removeLayer(homeMarker);
    }

    // Create a new marker and add it to the map
    homeMarker = L.marker([lat, lon]).addTo(map);
    homeMarker.bindPopup(formattedAddress).openPopup();

    // Zoom to the marker
    map.setView([lat, lon], 15); // Adjust the zoom level as needed
}

// Add an event listener to the search button
document.getElementById('search-button').addEventListener('click', () => {
    const address = document.getElementById('address-input').value;
    if (address) {
        geocodeAddress(address, (lat, lon, formattedAddress) => {
            zoomToAddress(lat, lon, formattedAddress);
        });
    } else {
        alert('Please enter an address.');
    }
});
