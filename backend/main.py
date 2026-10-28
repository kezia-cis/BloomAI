"""
BloomAI — Backend Service
FastAPI server serving the Oxford Flowers 102 EfficientNetB0 Keras model.
"""

from contextlib import asynccontextmanager
import io
import os
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
from PIL import Image
from pydantic import BaseModel

# Oxford Flowers 102 exact class label mapping from tensorflow_datasets (oxford_flowers102)
# Preserves the exact index-to-label ordering used during model training in Colab.
FLOWER_CLASSES: List[str] = [
    "pink primrose",
    "hard-leaved pocket orchid",
    "canterbury bells",
    "sweet pea",
    "english marigold",
    "tiger lily",
    "moon orchid",
    "bird of paradise",
    "monkshood",
    "globe thistle",
    "snapdragon",
    "colt's foot",
    "king protea",
    "spear thistle",
    "yellow iris",
    "globe-flower",
    "purple coneflower",
    "peruvian lily",
    "balloon flower",
    "giant white arum lily",
    "fire lily",
    "pincushion flower",
    "fritillary",
    "red ginger",
    "grape hyacinth",
    "corn poppy",
    "prince of wales feathers",
    "stemless gentian",
    "artichoke",
    "sweet william",
    "carnation",
    "garden phlox",
    "love in the mist",
    "mexican aster",
    "alpine sea holly",
    "ruby-lipped cattleya",
    "cape flower",
    "great masterwort",
    "siam tulip",
    "lenten rose",
    "barbeton daisy",
    "daffodil",
    "sword lily",
    "poinsettia",
    "bolero deep blue",
    "wallflower",
    "marigold",
    "buttercup",
    "oxeye daisy",
    "common dandelion",
    "petunia",
    "wild pansy",
    "primula",
    "sunflower",
    "pelargonium",
    "bishop of llandaff",
    "gaura",
    "geranium",
    "orange dahlia",
    "pink-yellow dahlia?",
    "cautleya spicata",
    "japanese anemone",
    "black-eyed susan",
    "silverbush",
    "californian poppy",
    "osteospermum",
    "spring crocus",
    "bearded iris",
    "windflower",
    "tree poppy",
    "gazania",
    "azalea",
    "water lily",
    "rose",
    "thorn apple",
    "morning glory",
    "passion flower",
    "lotus",
    "toad lily",
    "anthurium",
    "frangipani",
    "clematis",
    "hibiscus",
    "columbine",
    "desert-rose",
    "tree mallow",
    "magnolia",
    "cyclamen",
    "watercress",
    "canna lily",
    "hippeastrum",
    "bee balm",
    "ball moss",
    "foxglove",
    "bougainvillea",
    "camellia",
    "mallow",
    "mexican petunia",
    "bromelia",
    "blanket flower",
    "trumpet creeper",
    "blackberry lily",
]

# Global reference to loaded model
model = None

# Model file candidate locations
MODEL_CANDIDATES = [
    Path(__file__).parent / "bloomai_model.keras",
    Path(__file__).parent.parent / "bloomai_model.keras",
    Path(__file__).parent.parent / "bloomai_model.keras.keras",
    Path("bloomai_model.keras"),
]

# Allowed image extensions and MIME types
ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


def find_model_path() -> Optional[Path]:
    """Locate the bloomai_model.keras file in likely paths."""
    for path in MODEL_CANDIDATES:
        if path.exists() and path.is_file():
            return path.resolve()
    return None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load model once at application startup."""
    global model
    model_path = find_model_path()
    if not model_path:
        print("[WARNING] Could not locate bloomai_model.keras at startup!")
    else:
        print(f"[INFO] Loading model from: {model_path} ...")
        try:
            import keras
            model = keras.models.load_model(str(model_path))
            print(f"[INFO] Model loaded successfully! Input shape: {model.input_shape}, Output shape: {model.output_shape}")
        except Exception as e:
            print(f"[ERROR] Failed to load model: {e}")
            # Try tensorflow.keras fallback
            try:
                import tensorflow as tf
                model = tf.keras.models.load_model(str(model_path))
                print(f"[INFO] Model loaded via tf.keras! Input shape: {model.input_shape}")
            except Exception as e2:
                print(f"[ERROR] Fallback load also failed: {e2}")

    yield
    print("[INFO] Shutting down BloomAI backend.")


app = FastAPI(
    title="BloomAI API",
    description="Backend API for flower species classification powered by EfficientNetB0.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Response Schemas
class PredictionItem(BaseModel):
    label: str
    confidence: float


class PredictionResponse(BaseModel):
    predicted_class: str
    confidence: float
    top_predictions: List[PredictionItem]


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    classes_count: int
    architecture: str
    dataset: str


@app.get("/", summary="Root endpoint")
def root():
    return {
        "project": "BloomAI",
        "description": "AI-Powered Flower Species Classification API",
        "health_check": "/health",
        "predict_endpoint": "/predict",
    }


@app.get("/health", response_model=HealthResponse, summary="Health check endpoint")
def health():
    return HealthResponse(
        status="ok" if model is not None else "degraded",
        model_loaded=model is not None,
        classes_count=len(FLOWER_CLASSES),
        architecture="EfficientNetB0 (Transfer Learning)",
        dataset="Oxford Flowers 102",
    )


@app.post("/predict", response_model=PredictionResponse, summary="Predict flower species from image")
async def predict(file: UploadFile = File(...)):
    """
    Accepts an uploaded flower image, preprocesses it according to the
    model's training specification (224x224 RGB), and returns top-5
    predicted flower species with confidence scores.
    """
    global model

    if model is None:
        # Attempt just-in-time load if model was missing during startup
        model_path = find_model_path()
        if model_path:
            try:
                import keras
                model = keras.models.load_model(str(model_path))
            except Exception:
                import tensorflow as tf
                model = tf.keras.models.load_model(str(model_path))

    if model is None:
        raise HTTPException(
            status_code=503,
            detail="Model is not loaded. Please verify bloomai_model.keras is present.",
        )

    # 1. Validate file extension and MIME type
    filename = file.filename or ""
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS and file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file format '{filename}'. Allowed formats: JPG, JPEG, PNG, WEBP.",
        )

    # 2. Read contents and validate size
    try:
        contents = await file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read file: {e}")

    if not contents:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds maximum allowed size of {MAX_FILE_SIZE // (1024 * 1024)}MB.",
        )

    # 3. Process image with Pillow (RGB conversion & resize to 224x224)
    try:
        image = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid or corrupted image file: {e}")

    # Resize to exactly 224x224 using Bilinear filtering (matches tf.image.resize in Colab)
    image = image.resize((224, 224), Image.Resampling.BILINEAR)

    # Convert to float32 numpy array with values in [0, 255]
    # Note: The model's built-in EfficientNet layers perform internal rescaling & normalization.
    img_array = np.array(image, dtype=np.float32)

    # Expand dimensions to (1, 224, 224, 3)
    img_batch = np.expand_dims(img_array, axis=0)

    # 4. Model Inference
    try:
        raw_predictions = model.predict(img_batch, verbose=0)
        # raw_predictions is shape (1, 102)
        probabilities = raw_predictions[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference execution failed: {e}")

    # 5. Extract top-5 predictions sorted by confidence descending
    top_5_indices = np.argsort(probabilities)[-5:][::-1]

    top_predictions = [
        PredictionItem(
            label=FLOWER_CLASSES[idx] if idx < len(FLOWER_CLASSES) else f"Species {idx}",
            confidence=round(float(probabilities[idx]), 4),
        )
        for idx in top_5_indices
    ]

    best_prediction = top_predictions[0]

    return PredictionResponse(
        predicted_class=best_prediction.label,
        confidence=best_prediction.confidence,
        top_predictions=top_predictions,
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
