// Initialize the map and set its view to Long Island, NY
const map = L.map('map').setView([40.789142, -73.134960], 10);

// Add OpenStreetMap tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
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
