import os
import pickle
import pandas as pd
import numpy as np
from flask import Flask, request, jsonify, render_template

app = Flask(__name__)

# Load model and dataset
MODEL_PATH = "gradient_boosting.pkl"
DATA_PATH = "data.csv"

model = None
data = None
frequent_localities = set()
city_medians = {}
furnishing_premiums = {}
top_localities = []

if os.path.exists(MODEL_PATH):
    try:
        with open(MODEL_PATH, "rb") as f:
            model = pickle.load(f)
        print("Model loaded successfully.")
    except Exception as e:
        print(f"Error loading model: {e}")
else:
    print(f"Warning: Model file '{MODEL_PATH}' not found. Prediction endpoint will fail.")

if os.path.exists(DATA_PATH):
    try:
        data = pd.read_csv(DATA_PATH)
        print("Dataset loaded successfully.")
        
        # Determine frequent localities (used in inference pipeline)
        locality_counts = data['locality'].value_counts()
        frequent_localities = set(locality_counts[locality_counts >= 10].index)
        
        # Calculate dynamic stats for the Market Trends page
        # 1. Median rent by city
        city_medians = data.groupby('city')['rent'].median().to_dict()
        
        # 2. Furnishing premiums (median rents)
        furnishing_medians = data.groupby('furnishing')['rent'].median().to_dict()
        furnishing_premiums = {
            'Unfurnished': int(furnishing_medians.get('Unfurnished', 15000)),
            'Semi-Furnished': int(furnishing_medians.get('Semi-Furnished', 25000)),
            'Furnished': int(furnishing_medians.get('Furnished', 45000))
        }
        
        # 3. Top Localities (by count/popularity)
        top_locs_df = data.groupby(['locality', 'city']).agg(
            count=('rent', 'count'),
            mean_rate=('area_rate', 'mean'),
            mean_rent=('rent', 'mean')
        ).reset_index()
        
        # Sort by count and take top 10
        top_locs_df = top_locs_df.sort_values(by='count', ascending=False).head(10)
        top_localities = []
        for _, row in top_locs_df.iterrows():
            top_localities.append({
                'locality': row['locality'],
                'city': row['city'],
                'mean_rate': round(row['mean_rate'], 1),
                'mean_rent': int(row['mean_rent'])
            })
            
    except Exception as e:
        print(f"Error loading/processing dataset: {e}")
else:
    print(f"Warning: Dataset file '{DATA_PATH}' not found. Dynamic stats will be unavailable.")

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/api/localities', methods=['GET'])
def get_localities():
    # Return sorted frequent localities for the search/autocomplete feature
    return jsonify(sorted(list(frequent_localities)))

@app.route('/api/market-trends', methods=['GET'])
def get_market_trends():
    # Return calculated stats for the dynamic graphs and components
    return jsonify({
        'city_medians': city_medians,
        'furnishing_premiums': furnishing_premiums,
        'top_localities': top_localities,
        'national_stats': {
            'vacancy_rate': '7.2%',
            'avg_time_to_lease': '18 days'
        }
    })

@app.route('/api/predict', methods=['POST'])
def predict():
    if model is None:
        return jsonify({'error': 'Prediction model is not loaded.'}), 500
        
    try:
        req_data = request.get_json()
        
        # Extract inputs
        area = float(req_data.get('area', 800))
        beds = int(req_data.get('beds', 2))
        bathrooms = int(req_data.get('bathrooms', 2))
        balconies = int(req_data.get('balconies', 0))
        city = req_data.get('city', 'Mumbai')
        furnishing = req_data.get('furnishing', 'Semi-Furnished')
        property_type = req_data.get('property_type', 'Flat')
        
        # Clean locality (group rare localities into 'Other')
        locality = req_data.get('locality', 'Other')
        if locality not in frequent_localities:
            locality = 'Other'
            
        # Reconstruct DataFrame matching training columns
        # Expected: property_type, locality, city, area, beds, bathrooms, balconies, furnishing
        input_df = pd.DataFrame([{
            'locality': locality,
            'city': city,
            'area': area,
            'beds': beds,
            'bathrooms': bathrooms,
            'balconies': balconies,
            'furnishing': furnishing,
            'property_type': property_type
        }])
        
        # Perform inference
        prediction = model.predict(input_df)[0]
        
        # Round prediction to nearest 100
        predicted_rent = round(float(prediction), -2)
        
        # Avoid predicting negative rent values
        predicted_rent = max(predicted_rent, 1000.0)
        
        return jsonify({
            'predicted_rent': predicted_rent,
            'locality_used': locality
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 400

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
