<img width="1484" height="772" alt="Screenshot 2026-06-02 160543" src="https://github.com/user-attachments/assets/4ba99568-1e89-461b-89a8-98ee15287c6d" />


# RentWise – Intelligent Rent Prediction System

> **Smart Rental Valuation Powered by Machine Learning**
>
> RentWise is a full-stack, data-driven rental valuation and analytics platform that predicts house rents in real time using Machine Learning. The system combines a robust ML inference pipeline with a modern glassmorphic dashboard, enabling users to estimate rental prices, explore market trends, and analyze locality-level rental insights.

---

##  Features

###  Real-Time Rent Prediction
Predict rental prices instantly using:

- City
- Locality
- Property Area (sq.ft.)
- Number of Bedrooms
- Bathrooms
- Balconies
- Furnishing Status
- Property Type

### Market Analytics Dashboard

- City-wise median rent comparison
- Popular locality analysis
- Furnishing premium insights
- Rent distribution visualizations
- Inter-city benchmarking charts

###  Smart User Experience

- Real-time predictions
- Locality autocomplete search
- Interactive charts
- Responsive UI
- Glassmorphic dark theme
- Smooth animations and transitions

---

#  Tech Stack

## Machine Learning & Data Science

- Python
- Pandas
- NumPy
- Scikit-Learn
- Pickle

## Backend

- Flask

## Frontend

- HTML5
- CSS3
- JavaScript (ES6+)

## Data Visualization

- Chart.js

## Icons

- Lucide Icons

---

#  Project Structure

```bash
RentWise/
│
├── app.py                       # Flask Backend
├── house_rent_pred.py           # Model Training Pipeline
├── data.csv                     # Rental Dataset
├── gradient_boosting.pkl        # Trained ML Pipeline
│
├── templates/
│   └── index.html
│
├── static/
│   ├── css/
│   │   └── style.css
│   │
│   ├── js/
│   │   └── script.js
│   │
│   └── assets/
│
├── screenshots/
│
└── README.md
```

# 🖥️ **How to Run This Project on Your Machine**

Follow these steps to set up and run RentWise locally.

## Step 1: Clone the Repository

Open Terminal / Command Prompt and run:

```bash
git clone https://github.com/manavshah-13/House_rent_prediction.git
```

---

## Step 2: Move into the Project Folder

```bash
cd House_rent_prediction
```

---

## Step 3: Create a Virtual Environment

### Windows

```bash
python -m venv venv
```

### Linux / macOS

```bash
python3 -m venv venv
```

---

## Step 4: Activate the Virtual Environment

### Windows

```bash
venv\Scripts\activate
```

### Linux / macOS

```bash
source venv/bin/activate
```

After activation, you should see `(venv)` at the beginning of your terminal line.

---

## Step 5: Install Required Dependencies

If `requirements.txt` is available:

```bash
pip install -r requirements.txt
```

---

## Step 6: Verify Project Files

Make sure these files exist in the project directory:

```text
app.py
house_rent_pred.py
gradient_boosting.pkl
data.csv
```

---

## Step 7: Start the Flask Application

```bash
python app.py
```

You should see output similar to:

```text
* Running on http://127.0.0.1:5000
```

---

## Step 8: Open the Application

Open your browser and visit:

```text
http://127.0.0.1:5000
```

or

```text
http://localhost:5000
```

---

## Step 9: Stop the Application

Press:

```text
CTRL + C
```

in the terminal to stop the Flask server.

---

# Prerequisites

Before running the project, ensure you have:

- Python 3.9 or higher
- Git
- pip (Python Package Manager)

Check installed versions:

```bash
python --version
git --version
pip --version
```


