"""
Dataset Download Script for Clinical Intelligence Platform
============================================================
Downloads healthcare datasets from Kaggle for training the risk scoring model.

Required Data (from Getting Started Guide PDF):
- Blood sugar, blood pressure, clinical notes, dates
- Patient demographics (age)
- Outcome labels (deterioration: 1/0)

Usage:
    1. Set up Kaggle API key (see docs/DATA_SETUP.md)
    2. Run: python scripts/download_datasets.py
"""

import os
import sys
import zipfile
import shutil
from pathlib import Path

try:
    from kaggle.api.kaggle_api_extended import KaggleApi
    from tqdm import tqdm
except ImportError:
    print("Missing dependencies. Run: pip install -r requirements-data.txt")
    sys.exit(1)


# =============================================================================
# CONFIGURATION
# =============================================================================

# Project root directory
PROJECT_ROOT = Path(__file__).parent.parent

# Data directories
DATA_DIR = PROJECT_ROOT / "data"
RAW_DIR = DATA_DIR / "raw"
PROCESSED_DIR = DATA_DIR / "processed"

# Kaggle datasets to download
# These map to the PDF's data requirements:
# - Vitals: blood pressure, heart rate, SpO2, temperature
# - Labs: blood sugar/glucose, metabolic panels
# - Outcomes: mortality/deterioration labels
DATASETS = [
    {
        "name": "mitishaagarwal/patient",
        "description": "ICU Patient Outcome - Contains vitals, labs, and mortality outcomes",
        "folder": "icu_patient_outcome",
        "features": ["Age", "Glucose", "HR", "DiasABP", "MAP", "Temp", "In-hospital_death"],
    },
    {
        "name": "iamsouravbanerjee/heart-attack-prediction-dataset",
        "description": "Heart Attack Dataset - Blood pressure, cholesterol, outcomes",
        "folder": "heart_attack",
        "features": ["Age", "Blood Pressure", "Cholesterol", "Heart Attack Risk"],
    },
    {
        "name": "uom190346a/health-and-lifestyle-dataset",
        "description": "Health & Lifestyle - Vitals and health metrics",
        "folder": "health_lifestyle",
        "features": ["Blood_Pressure", "Heart_Rate", "BMI", "Sleep_Quality"],
    },
]


# =============================================================================
# FUNCTIONS
# =============================================================================

def setup_directories():
    """Create data directory structure."""
    print("\n📁 Setting up directories...")
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    print(f"   ✓ Created {RAW_DIR}")
    print(f"   ✓ Created {PROCESSED_DIR}")


def authenticate_kaggle():
    """Authenticate with Kaggle API."""
    print("\n🔐 Authenticating with Kaggle...")
    try:
        api = KaggleApi()
        api.authenticate()
        print("   ✓ Authentication successful")
        return api
    except Exception as e:
        print(f"\n❌ Kaggle authentication failed: {e}")
        print("\n📋 To fix this:")
        print("   1. Go to https://www.kaggle.com/settings")
        print("   2. Click 'Create New Token' to download kaggle.json")
        print("   3. Place it in: C:\\Users\\<username>\\.kaggle\\kaggle.json")
        sys.exit(1)


def download_dataset(api, dataset_info):
    """Download a single dataset from Kaggle."""
    name = dataset_info["name"]
    folder = dataset_info["folder"]
    description = dataset_info["description"]
    
    target_dir = RAW_DIR / folder
    target_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"\n📥 Downloading: {description}")
    print(f"   Dataset: {name}")
    
    try:
        # Download dataset
        api.dataset_download_files(
            name,
            path=str(target_dir),
            unzip=True,
            quiet=False
        )
        
        # Clean up any remaining zip files
        for zip_file in target_dir.glob("*.zip"):
            zip_file.unlink()
        
        # List downloaded files
        files = list(target_dir.glob("*"))
        print(f"   ✓ Downloaded {len(files)} file(s) to {folder}/")
        for f in files[:5]:  # Show first 5 files
            size_mb = f.stat().st_size / (1024 * 1024)
            print(f"      - {f.name} ({size_mb:.2f} MB)")
        
        return True
        
    except Exception as e:
        print(f"   ❌ Failed to download {name}: {e}")
        return False


def create_data_readme():
    """Create README in data directory (outside git tracking)."""
    readme_content = """# Downloaded Datasets

This directory contains datasets downloaded for the Clinical Intelligence Platform.

## Structure
```
data/
├── raw/                          # Original downloaded files
│   ├── icu_patient_outcome/      # ICU vitals, labs, mortality
│   ├── heart_attack/             # BP, cholesterol, heart risk
│   └── health_lifestyle/         # General health metrics
└── processed/                    # Cleaned data (generated later)
```

## Data Mapping to PDF Requirements

| PDF Requirement        | Dataset           | Columns                    |
|------------------------|-------------------|----------------------------|
| Blood Sugar            | ICU Patient       | Glucose                    |
| Blood Pressure         | Heart Attack      | Blood Pressure             |
| Age/Demographics       | All datasets      | Age                        |
| Outcome Labels         | ICU Patient       | In-hospital_death (0/1)    |

## Next Steps
1. Run `scripts/prepare_timelines.py` to convert to patient timelines
2. Run `scripts/compute_trends.py` to extract trend features
3. Train risk scoring model with processed features
"""
    readme_path = DATA_DIR / "README.md"
    readme_path.write_text(readme_content)
    print(f"\n📄 Created {readme_path}")


def print_summary():
    """Print download summary."""
    print("\n" + "=" * 60)
    print("✅ DOWNLOAD COMPLETE")
    print("=" * 60)
    print(f"\nData location: {DATA_DIR}")
    print("\nNext steps:")
    print("  1. Review downloaded CSVs in data/raw/")
    print("  2. Run timeline extraction (scripts/prepare_timelines.py)")
    print("  3. Compute trend features (scripts/compute_trends.py)")
    print("  4. Train risk scoring model")
    print("\nRefer to docs/Getting Started Guide PDF for the full pipeline.")


# =============================================================================
# MAIN
# =============================================================================

def main():
    print("=" * 60)
    print("🏥 Clinical Intelligence Platform - Dataset Downloader")
    print("=" * 60)
    
    # Setup
    setup_directories()
    api = authenticate_kaggle()
    
    # Download each dataset
    print("\n📦 Downloading datasets...")
    success_count = 0
    
    for dataset in tqdm(DATASETS, desc="Overall progress"):
        if download_dataset(api, dataset):
            success_count += 1
    
    # Create README
    create_data_readme()
    
    # Summary
    print_summary()
    print(f"\nDownloaded {success_count}/{len(DATASETS)} datasets successfully.")
    
    if success_count < len(DATASETS):
        print("\n⚠️  Some downloads failed. Check your Kaggle API key and internet connection.")
        sys.exit(1)


if __name__ == "__main__":
    main()
