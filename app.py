import streamlit as st
import pandas as pd
import numpy as np
import tensorflow as tf
from PIL import Image
import os
import glob
import zipfile
import time

# --- PAGE CONFIG ---
st.set_page_config(page_title="Cloud Inventory System", layout="wide")

# --- 1. SETUP & UNZIP LOGIC ---
# We check if the folder exists. If not, we unzip the uploaded file.
IMAGES_DIR = "sample_fruits_50"
ZIP_FILE = "sample_fruits_50.zip"

if not os.path.exists(IMAGES_DIR):
    if os.path.exists(ZIP_FILE):
        with st.spinner("Unpacking image database..."):
            with zipfile.ZipFile(ZIP_FILE, 'r') as zip_ref:
                zip_ref.extractall(".") # Extract to current directory
            st.success("Database loaded!")
    else:
        st.warning(f"⚠️ Please upload '{ZIP_FILE}' to the Files tab!")

# --- 2. LOAD MODEL ---
@st.cache_resource
def load_model():
    model_path = "fruit_classifier.h5"
    if not os.path.exists(model_path):
        return None
    return tf.keras.models.load_model(model_path)

model = load_model()

# --- 3. HELPER FUNCTIONS ---
CLASS_NAMES = [
    'fresh_apple', 'fresh_banana', 'fresh_grape', 'fresh_orange', 'fresh_pomegranate',
    'rotten_apple', 'rotten_banana', 'rotten_grape', 'rotten_orange', 'rotten_pomegranate'
]

def get_initial_db():
    fruits = ['Apple', 'Banana', 'Grape', 'Orange', 'Pomegranate']
    data = {fruit: {'Fresh Qty': 0, 'Rotten Qty': 0} for fruit in fruits}
    return data

# --- 4. MAIN APP UI ---
st.title("🏭 Cloud AI Inventory Scan")
st.markdown("This system will scan the **50 test images** uploaded to the cloud.")

if model is None:
    st.error("Model file not found. Please upload 'fruit_classifier_final.h5'.")
    st.stop()

if st.button("🔍 Start Cloud Scan"):
    
    # Get list of images
    if os.path.exists(IMAGES_DIR):
        all_images = glob.glob(os.path.join(IMAGES_DIR, "**", "*.*"), recursive=True)
        # Filter for valid images only
        files_to_scan = [f for f in all_images if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
        # Pick 15 random ones
        import random
        if len(files_to_scan) > 15:
            files_to_scan = random.sample(files_to_scan, 15)
    else:
        st.error("Image folder not found! Did the zip file unzip?")
        st.stop()

    # Layout
    col1, col2 = st.columns([1.5, 1])
    with col1:
        st.subheader("📦 Live Inventory")
        table_placeholder = st.empty()
    with col2:
        st.subheader("📷 Feed")
        image_placeholder = st.empty()

    # Init Data
    db_data = get_initial_db()
    current_df = pd.DataFrame.from_dict(db_data, orient='index')
    table_placeholder.table(current_df)
    progress_bar = st.progress(0)

    # LOOP
    for i, filepath in enumerate(files_to_scan):
        # 1. Display Image
        image_placeholder.image(filepath, caption=f"Item #{i+1}", width=400)
        
        # 2. Predict
        try:
            # Preprocess
            img = Image.open(filepath)
            img = img.resize((224, 224))
            img_arr = np.array(img)
            if img_arr.shape[-1] == 4: img_arr = img_arr[..., :3]
            img_arr = np.expand_dims(img_arr, axis=0) / 255.0
            
            # Inference
            preds = model.predict(img_arr, verbose=0)
            idx = np.argmax(preds[0])
            label = CLASS_NAMES[idx]
            
            # Parse
            parts = label.split('_')
            quality = parts[0]
            fruit = parts[1].title()

            # Update DB
            if quality == 'fresh':
                db_data[fruit]['Fresh Qty'] += 1
            else:
                db_data[fruit]['Rotten Qty'] += 1
            
            # Update Table
            current_df = pd.DataFrame.from_dict(db_data, orient='index')
            table_placeholder.table(current_df)
            
            time.sleep(0.2) # Visual delay

        except Exception as e:
            st.error(f"Error: {e}")

        progress_bar.progress((i + 1) / len(files_to_scan))

    st.success("Scan Complete!")
    
    # Graph
    st.divider()
    st.subheader("📊 Final Cloud Report")
    st.bar_chart(current_df, color=["#4CAF50", "#FF5252"])