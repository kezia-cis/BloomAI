"""
BloomAI Model Verification Script
Tests loading bloomai_model.keras and running inference on a sample 224x224 image.
"""

import sys
from pathlib import Path
import numpy as np
from PIL import Image

# Import flower classes from main
from main import FLOWER_CLASSES, find_model_path

def test_model():
    print("=" * 60)
    print("BloomAI Model Verification")
    print("=" * 60)

    model_path = find_model_path()
    print(f"1. Model path: {model_path}")
    if not model_path:
        print("[FAIL] Model file bloomai_model.keras was not found!")
        sys.exit(1)

    print("2. Loading Keras model...")
    try:
        import keras
        model = keras.models.load_model(str(model_path))
        print("   Model loaded successfully via keras!")
    except Exception as e:
        print(f"   keras.models.load_model failed: {e}")
        try:
            import tensorflow as tf
            model = tf.keras.models.load_model(str(model_path))
            print("   Model loaded successfully via tf.keras!")
        except Exception as e2:
            print(f"[FAIL] tf.keras fallback also failed: {e2}")
            sys.exit(1)

    print(f"   Input shape:  {model.input_shape}")
    print(f"   Output shape: {model.output_shape}")
    print(f"   Classes count in mapping: {len(FLOWER_CLASSES)}")

    # 3. Create a dummy synthetic image
    print("\n3. Testing inference on a synthetic 224x224 image...")
    dummy_img = np.random.randint(0, 256, (1, 224, 224, 3), dtype=np.uint8).astype(np.float32)
    predictions = model.predict(dummy_img, verbose=0)[0]

    top_5 = np.argsort(predictions)[-5:][::-1]
    print("\n   Top-5 Sample Predictions:")
    for rank, idx in enumerate(top_5, 1):
        species = FLOWER_CLASSES[idx]
        conf = float(predictions[idx]) * 100
        print(f"   {rank}. {species.title()} — {conf:.2f}% (class index {idx})")

    print("\n[SUCCESS] Model loading and inference path verified!")

if __name__ == "__main__":
    test_model()
