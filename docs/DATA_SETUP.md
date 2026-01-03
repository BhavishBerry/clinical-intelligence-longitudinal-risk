# Data Setup Guide

This guide explains how to download the training datasets for the Clinical Intelligence Platform.

## Quick Start

### 1. Install Dependencies
```bash
pip install -r requirements-data.txt
```

### 2. Configure Kaggle API Key

1. Create a [Kaggle account](https://www.kaggle.com) if you don't have one
2. Go to [Account Settings](https://www.kaggle.com/settings)
3. Click **"Create New Token"** → downloads `kaggle.json`
4. Move the file to:
   - **Windows**: `C:\Users\<your-username>\.kaggle\kaggle.json`
   - **Linux/Mac**: `~/.kaggle/kaggle.json`

### 3. Download Datasets
```bash
python scripts/download_datasets.py
```

## What Gets Downloaded

| Dataset | Purpose | Key Columns |
|---------|---------|-------------|
| ICU Patient Outcome | Mortality prediction | Glucose, BP, HR, Age, In-hospital_death |
| Heart Attack Prediction | Cardiovascular risk | Blood Pressure, Cholesterol, Heart Attack Risk |
| Health & Lifestyle | General vitals | Blood_Pressure, Heart_Rate, BMI |

## Data Location

After download, data is stored in:
```
data/
├── raw/
│   ├── icu_patient_outcome/
│   ├── heart_attack/
│   └── health_lifestyle/
└── processed/  (created during training)
```

> **Note**: The `data/` folder is gitignored - your downloaded data stays local only.

## Mapping to PDF Requirements

From the Getting Started Guide:

| PDF Requirement | Dataset Source | Column |
|-----------------|----------------|--------|
| Blood Sugar     | ICU Patient    | Glucose |
| Blood Pressure  | Heart Attack   | Blood Pressure |
| Age             | All datasets   | Age |
| Outcome Label   | ICU Patient    | In-hospital_death (0=survived, 1=died) |

---

## Phase 1: Synthetic Data (Recommended First)

Before downloading real datasets, generate synthetic data to test your pipeline:

```bash
python scripts/generate_synthetic_data.py --patients 100
```

### Options
| Flag | Default | Description |
|------|---------|-------------|
| `--patients` | 100 | Number of patients to generate |
| `--output` | data/synthetic | Output directory |
| `--deterioration-ratio` | 0.3 | Ratio of deteriorating patients |

### What Gets Generated
```
data/synthetic/
├── timelines/           # Individual patient JSON files
│   ├── patient_12345.json
│   └── ...
├── training_data.csv    # Flattened features for ML model
└── generation_summary.json
```

### Labeling Rules (from Architecture)
- **Label = 1** if: percent_change > 25% AND duration > 12 months
- **Label = 0** otherwise

---

## Phase 2: Kaggle Datasets

After pipeline testing with synthetic data, download real datasets.

## Troubleshooting

**"Kaggle authentication failed"**
- Ensure `kaggle.json` is in the correct location
- Check file permissions (should be readable)

**"Dataset not found"**
- Some datasets may require accepting terms on Kaggle website first
- Visit the dataset page on Kaggle and click "Download" once manually
