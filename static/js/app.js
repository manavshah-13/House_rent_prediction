// Global state
let frequentLocalities = [];
let trendChartInstance = null;
let medianChartInstance = null;
let debounceTimeout = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Lucide Icons
    lucide.createIcons();

    // 2. Set up menu navigation
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const tabId = item.getAttribute('data-tab');
            if (tabId) {
                switchTab(tabId);
            }
        });
    });

    // 3. Load Initial Data (Localities & Trends)
    fetchLocalities();
    fetchMarketTrends();

    // 4. Set up Predictor Input Listeners
    setupInputListeners();

    // 5. Initialize the Predictor Rent Trend Chart (12 months mock forecast based on prediction)
    initializeTrendChart();

    // 6. Run initial prediction on load
    runPrediction();
});

// Switch Dashboard Tabs
function switchTab(tabId) {
    // Toggle active classes on sidebar menu items
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        if (item.getAttribute('data-tab') === tabId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    // Toggle active classes on content sections
    const contents = document.querySelectorAll('.tab-content');
    contents.forEach(content => {
        if (content.id === `tab-${tabId}`) {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
    });

    // Trigger chart renders/resizes when tab becomes visible
    if (tabId === 'trends' && medianChartInstance) {
        medianChartInstance.resize();
    }
    if (tabId === 'predictor' && trendChartInstance) {
        trendChartInstance.resize();
    }
}

// Fetch list of frequent localities for autocomplete
async function fetchLocalities() {
    try {
        const response = await fetch('/api/localities');
        frequentLocalities = await response.json();
        setupAutocomplete();
    } catch (err) {
        console.error("Failed to load localities list:", err);
    }
}

// Fetch Market Trends dashboard stats from the server
async function fetchMarketTrends() {
    try {
        const response = await fetch('/api/market-trends');
        const trends = await response.json();
        
        // 1. Initialize Median Rent Horizontal Bar Chart
        const cityData = trends.city_medians;
        const cities = Object.keys(cityData);
        const medians = Object.values(cityData);
        initializeMedianChart(cities, medians);

        // 2. Populate Furnishing Premium Cards
        const premiums = trends.furnishing_premiums;
        document.getElementById('premium-val-unfurnished').textContent = `₹${premiums.Unfurnished.toLocaleString()}`;
        document.getElementById('premium-val-semi').textContent = `₹${premiums['Semi-Furnished'].toLocaleString()}`;
        document.getElementById('premium-val-furnished').textContent = `₹${premiums.Furnished.toLocaleString()}`;

        // 3. Populate Top Localities leaderboard
        const topLocsList = document.getElementById('top-localities-list');
        topLocsList.innerHTML = '';
        
        trends.top_localities.forEach((loc, idx) => {
            const li = document.createElement('li');
            li.className = 'locality-rank-item';
            li.innerHTML = `
                <div class="rank-badge">${idx + 1}</div>
                <div class="locality-meta">
                    <span class="locality-name">${loc.locality}</span>
                    <p class="locality-city">${loc.city}</p>
                </div>
                <div class="yield-info">
                    <span class="yield-rate">₹${loc.mean_rent.toLocaleString()}</span>
                    <p class="yield-change">₹${loc.mean_rate}/sqft</p>
                </div>
            `;
            
            // Add click-to-simulate behavior
            li.addEventListener('click', () => {
                document.getElementById('input-city').value = loc.city;
                document.getElementById('input-locality').value = loc.locality;
                switchTab('predictor');
                runPrediction();
            });
            
            topLocsList.appendChild(li);
        });

        // 4. Update simple stats
        document.getElementById('stat-vacancy').textContent = trends.national_stats.vacancy_rate;
        document.getElementById('stat-time-to-lease').textContent = trends.national_stats.avg_time_to_lease;

    } catch (err) {
        console.error("Failed to load market trends:", err);
    }
}

// Setup input slider and tab events
function setupInputListeners() {
    const inputs = [
        { id: 'input-area', valId: 'val-area', suffix: ' sq ft' },
        { id: 'input-beds', valId: 'val-beds', suffix: ' Bedrooms', format: (v) => v === '1' ? '1 Bedroom' : `${v} Bedrooms` },
        { id: 'input-bathrooms', valId: 'val-bathrooms', suffix: ' Bath', format: (v) => v === '1' ? '1 Bath' : `${v} Baths` },
        { id: 'input-balconies', valId: 'val-balconies', suffix: ' Balcony', format: (v) => v === '0' ? 'No Balconies' : (v === '1' ? '1 Balcony' : `${v} Balconies`) }
    ];

    // Initialize labels and add input events
    inputs.forEach(item => {
        const inputEl = document.getElementById(item.id);
        const valEl = document.getElementById(item.valId);
        
        inputEl.addEventListener('input', (e) => {
            const val = e.target.value;
            valEl.textContent = item.format ? item.format(val) : `${val}${item.suffix}`;
            debouncedPrediction();
        });
    });

    // City selector change
    document.getElementById('input-city').addEventListener('change', () => {
        runPrediction();
    });

    // Property Type selector change
    document.getElementById('input-property-type').addEventListener('change', () => {
        runPrediction();
    });

    // Furnishing Status tabs
    const furnishingBtns = document.querySelectorAll('.furnishing-btn');
    furnishingBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            furnishingBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            runPrediction();
        });
    });

    // Amenities toggle buttons
    const amenityBtns = document.querySelectorAll('.amenity-btn');
    amenityBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            btn.classList.toggle('active');
            // Adding a small UI simulation impact: amenities don't affect standard model training
            // but we can trigger a slight adjustment or run prediction
            runPrediction();
        });
    });

    // Lock Valuation button click trigger
    document.querySelector('.btn-lock').addEventListener('click', () => {
        const price = document.getElementById('predicted-rent-val').textContent;
        alert(`Valuation locked at ₹${price}/month! Added to your portfolio (mock).`);
    });
}

// Autocomplete logic for locality search
function setupAutocomplete() {
    const input = document.getElementById('input-locality');
    const list = document.getElementById('autocomplete-list');

    input.addEventListener('input', (e) => {
        const value = e.target.value.toLowerCase();
        list.innerHTML = '';
        if (!value) {
            list.style.display = 'none';
            return;
        }

        const matches = frequentLocalities.filter(l => l.toLowerCase().includes(value)).slice(0, 8);
        
        if (matches.length > 0) {
            matches.forEach(match => {
                const div = document.createElement('div');
                div.className = 'autocomplete-suggestion';
                div.textContent = match;
                div.addEventListener('click', () => {
                    input.value = match;
                    list.style.display = 'none';
                    runPrediction();
                });
                list.appendChild(div);
            });
            list.style.display = 'block';
        } else {
            // Suggest 'Other' if no matches found
            const div = document.createElement('div');
            div.className = 'autocomplete-suggestion text-secondary';
            div.textContent = "No matches (will be grouped in 'Other')";
            div.addEventListener('click', () => {
                list.style.display = 'none';
                runPrediction();
            });
            list.appendChild(div);
            list.style.display = 'block';
        }
    });

    // Close autocomplete suggestions list on click outside
    document.addEventListener('click', (e) => {
        if (e.target !== input) {
            list.style.display = 'none';
        }
    });
}

// Debounce wrapper for slider inputs
function debouncedPrediction() {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(runPrediction, 150);
}

// Run Predictor API request
async function runPrediction() {
    const area = document.getElementById('input-area').value;
    const beds = document.getElementById('input-beds').value;
    const bathrooms = document.getElementById('input-bathrooms').value;
    const balconies = document.getElementById('input-balconies').value;
    const city = document.getElementById('input-city').value;
    const propertyType = document.getElementById('input-property-type').value;
    
    const activeFurnishingBtn = document.querySelector('.furnishing-btn.active');
    const furnishing = activeFurnishingBtn ? activeFurnishingBtn.getAttribute('data-val') : 'Semi-Furnished';
    
    const locality = document.getElementById('input-locality').value.trim() || 'Other';

    const payload = {
        area: parseFloat(area),
        beds: parseInt(beds),
        bathrooms: parseInt(bathrooms),
        balconies: parseInt(balconies),
        city: city,
        property_type: propertyType,
        furnishing: furnishing,
        locality: locality
    };

    try {
        const response = await fetch('/api/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const resData = await response.json();
        if (resData.error) {
            console.error("Prediction Error:", resData.error);
            return;
        }

        // Count selected amenities to add a small custom multiplier in UI (adds responsiveness to amenities)
        const activeAmenities = document.querySelectorAll('.amenity-btn.active').length;
        let prediction = resData.predicted_rent;
        
        // Add a minor simulated adjustment (+1.5% per active amenity)
        prediction = prediction * (1 + (activeAmenities * 0.015));
        const finalRent = Math.round(prediction);

        // Update UI displays
        animateRentDisplay(finalRent);
        
        // Update circular gauge and trend chart based on prediction
        updateHealthGauge(finalRent, city);
        updateTrendForecast(finalRent);
        
    } catch (err) {
        console.error("Network Error during prediction:", err);
    }
}

// Smoothly animate rent value counting up/down
function animateRentDisplay(targetValue) {
    const el = document.getElementById('predicted-rent-val');
    const currentValue = parseInt(el.textContent.replace(/,/g, '')) || 0;
    const duration = 250; // ms
    const startTime = performance.now();

    function updateNumber(now) {
        const progress = Math.min((now - startTime) / duration, 1);
        const easeVal = progress * (2 - progress); // Ease out
        const currentProgressValue = Math.round(currentValue + (targetValue - currentValue) * easeVal);
        el.textContent = currentProgressValue.toLocaleString();
        
        if (progress < 1) {
            requestAnimationFrame(updateNumber);
        }
    }
    requestAnimationFrame(updateNumber);
}

// Update Market Health Circular Gauge depending on calculated rent
function updateHealthGauge(rent, city) {
    // Generate a pseudo-random index bounded by parameters
    let score = 75;
    if (city === 'Mumbai') score = 86;
    else if (city === 'Bangalore') score = 82;
    else if (city === 'Pune') score = 78;
    else if (city === 'New Delhi') score = 72;
    else score = 65;

    // Apply small variation based on price
    score = score + Math.min(5, Math.max(-5, Math.floor((rent % 500) / 100)));
    score = Math.min(99, Math.max(45, score));

    // Update SVG Stroke dashoffset
    const circle = document.querySelector('.gauge-fill');
    const text = document.getElementById('health-index-val');
    
    // Formula: dasharray is 251.2 (2 * pi * r = 2 * 3.14 * 40)
    const offset = 251.2 - (251.2 * score) / 100;
    circle.style.strokeDashoffset = offset;
    text.textContent = score;
}

// Initialize Trend Chart (12 Months)
function initializeTrendChart() {
    const ctx = document.getElementById('trendChart').getContext('2d');
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    // Starting mock trend template
    const placeholderData = Array(12).fill(0);

    trendChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: months,
            datasets: [{
                label: 'Projected Rent',
                data: placeholderData,
                backgroundColor: 'rgba(6, 182, 212, 0.25)',
                borderColor: '#06b6d4',
                borderWidth: 1.5,
                borderRadius: 4,
                hoverBackgroundColor: 'rgba(6, 182, 212, 0.5)',
                hoverBorderColor: '#06b6d4'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: '#94a3b8', font: { family: 'Inter', size: 10 } }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.04)' },
                    ticks: { color: '#94a3b8', font: { family: 'Inter', size: 10 } }
                }
            }
        }
    });
}

// Update Trend Forecast chart values relative to prediction
function updateTrendForecast(baseRent) {
    if (!trendChartInstance) return;

    // Simulate minor monthly fluctuation (seasonality)
    // Spring/Summer rent surges, winter decreases slightly
    const seasonalMultipliers = [0.96, 0.97, 0.98, 1.01, 1.03, 1.05, 1.06, 1.04, 1.02, 1.00, 0.98, 0.97];
    const updatedData = seasonalMultipliers.map(m => Math.round(baseRent * m));
    
    trendChartInstance.data.datasets[0].data = updatedData;
    trendChartInstance.update();
}

// Initialize Inter-City Median Rent Horizontal Chart
function initializeMedianChart(cities, medians) {
    const ctx = document.getElementById('medianRentChart').getContext('2d');

    // Create a beautiful blue-to-purple gradient
    const gradient = ctx.createLinearGradient(0, 0, 400, 0);
    gradient.addColorStop(0, '#06b6d4');
    gradient.addColorStop(1, '#d946ef');

    medianChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: cities,
            datasets: [{
                data: medians,
                backgroundColor: gradient,
                borderRadius: 6,
                barThickness: 16
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.04)' },
                    ticks: { color: '#94a3b8', font: { family: 'Inter', size: 10 } }
                },
                y: {
                    grid: { display: false },
                    ticks: { color: '#ffffff', font: { family: 'Outfit', size: 11, weight: 'bold' } }
                }
            }
        }
    });
}
