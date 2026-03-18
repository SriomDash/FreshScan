from fastapi import FastAPI, File, UploadFile, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from fastapi.responses import JSONResponse
import numpy as np
import tensorflow as tf
from PIL import Image
import io
import os
import slowapi
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import logging 


logging.basicConfig(
    filename='api.log',
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

app = FastAPI(
    title="Cloud Inventory AI API",
    description="API for scanning fruits and returning the Fruit Name and Quality.",
    root_path="/api"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],        
    allow_credentials=False,     
    allow_methods=["GET", "POST"],           
    allow_headers=["*"],           
)

# Use get_remote_address which is safer and handles proxies better than x.client.ip
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

# Register the exception handler so rate-limited users get a proper HTTP 429 response
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

class CastLayer(tf.keras.layers.Layer):
    def call(self, inputs):
        return tf.cast(inputs, tf.float32)

MODEL_PATH = "best_fruit_model.h5" 
model = None

# 3. Replace print() with logging
if os.path.exists(MODEL_PATH):
    try:
        custom_objects = {'Cast': CastLayer}
        model = tf.keras.models.load_model(MODEL_PATH, custom_objects=custom_objects, compile=False)
        logging.info("Model loaded successfully!") 
    except Exception as e:
        logging.error(f"Error loading model: {e}")
else:
    logging.warning(f"Warning: Model not found at {MODEL_PATH}")

# Your 20-class list
CLASS_NAMES = [
    'fresh_apple', 'fresh_banana', 'fresh_cucumber', 'fresh_grape', 
    'fresh_guava', 'fresh_mango', 'fresh_orange', 'fresh_pomegranate', 
    'fresh_strawberry', 'fresh_tomato', 'rotten_apple', 'rotten_banana', 
    'rotten_cucumber', 'rotten_grape', 'rotten_guava', 'rotten_mango', 
    'rotten_orange', 'rotten_pomegranate', 'rotten_strawberry', 'rotten_tomato'
]

@app.get("/")
@limiter.limit("40/minute")
async def root_call(request: Request):
    logging.info(f"Root endpoint accessed by {request.client.host}")
    return {"message": "Fruit Quality API is running. Go to /docs to test it."}

@app.get("/health")
@limiter.limit("40/minute")
async def health_call(request: Request):
    if model is None:
        logging.warning("Health check failed: Model not loaded.")
        return {"status": "unhealthy", "reason": "Model missing or failed to load."}
    return {"status": "healthy", "model_loaded": True}

@app.post("/predict")
@limiter.limit("40/minute")
async def predict_image(request: Request, file: UploadFile = File(...)):
    logging.info(f"Prediction request received from {request.client.host} for file {file.filename}")
    
    if model is None:
        logging.error("Prediction attempted, but model is not loaded.")
        raise HTTPException(status_code=503, detail="Model is not loaded.")
    
    if not file.content_type.startswith("image/"):
        logging.warning(f"Invalid file type uploaded: {file.content_type}")
        raise HTTPException(status_code=400, detail="Invalid file. Upload an image.")

    try:
        contents = await file.read()
        img = Image.open(io.BytesIO(contents)).convert('RGB')
        
        img = img.resize((224, 224))
        img_arr = np.array(img) / 255.0  
        img_arr = np.expand_dims(img_arr, axis=0) 
        
        preds = model.predict(img_arr, verbose=0)
        idx = int(np.argmax(preds[0])) 
        raw_label = CLASS_NAMES[idx]
        
        parts = raw_label.split('_', 1) 
        
        quality = parts[0].capitalize() 
        fruit_name = parts[1].title()   

        logging.info(f"Prediction successful: {quality} {fruit_name}")

        return JSONResponse(content={
            "fruit": fruit_name,
            "quality": quality
        })

    except Exception as e:
        logging.error(f"Server error during prediction: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")