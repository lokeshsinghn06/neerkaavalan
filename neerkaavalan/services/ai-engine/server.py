"""
Neerkavalan AI Engine — Flask REST API

Exposes the complete AI pipeline:
  Image upload → DeepLabV3+ inference → Connected components →
  GPS mapping → TSP route planning → Visualization

Endpoints:
  POST /api/ai/analyze   — Full pipeline analysis
  GET  /api/ai/health    — Service health check
"""

import os
import io
import sys
import base64
import json
import traceback
import time

from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
import numpy as np


# ============================================================
# Ensure local package imports work
# ============================================================

PACKAGE_DIR = os.path.dirname(os.path.abspath(__file__))

if PACKAGE_DIR not in sys.path:
    sys.path.insert(0, PACKAGE_DIR)


# ============================================================
# Flask App
# ============================================================

app = Flask(__name__)
CORS(app)


# ============================================================
# Upload Configuration
# ============================================================

UPLOAD_DIR = os.path.join(PACKAGE_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ============================================================
# Model Loading
# ============================================================

_model_loaded = False


def ensure_model():
    """Pre-load the model so the first request isn't slow."""
    global _model_loaded

    if not _model_loaded:
        from inference import get_model

        get_model()
        _model_loaded = True


# ============================================================
# Health Check
# ============================================================

@app.route("/api/ai/health", methods=["GET"])
def health():
    return jsonify({
        "success": True,
        "service": "neerkavalan-ai-engine",
        "status": "online",
        "model_loaded": _model_loaded,
    })


# ============================================================
# AI Analysis Endpoint
# ============================================================

@app.route("/api/ai/analyze", methods=["POST"])
def analyze():
    """
    Full AI pipeline analysis.

    Expects multipart/form-data with:
      - image: the aerial/drone image file
      - drone_lat: float (default 13.082680)
      - drone_lon: float (default 80.270718)
      - altitude: float in metres (default 30.0)
      - heading: float in degrees (default 0.0)
      - hfov: float in degrees (default 78.0)
      - threshold: float 0-1 (default 0.5)
      - min_garbage_area: int in pixels (default 300)

    Returns JSON with:
      - waste_percentage
      - garbage_objects
      - garbage_gps
      - waypoints
      - optimized_route
      - route_indices
      - total_distance_m
      - route_image_base64
      - mask_image_base64
    """

    start_time = time.time()

    # ========================================================
    # 1. Validate Image
    # ========================================================

    if "image" not in request.files:
        return jsonify({
            "success": False,
            "error": (
                "No image file provided. "
                "Send as 'image' in multipart/form-data."
            )
        }), 400

    file = request.files["image"]

    if file.filename == "":
        return jsonify({
            "success": False,
            "error": "Empty filename."
        }), 400

    # Save temporarily
    safe_name = f"upload_{int(time.time())}_{file.filename}"
    image_path = os.path.join(UPLOAD_DIR, safe_name)

    file.save(image_path)

    # ========================================================
    # 2. Parse Parameters
    # ========================================================

    try:
        drone_lat = float(
            request.form.get("drone_lat", 13.082680)
        )

        drone_lon = float(
            request.form.get("drone_lon", 80.270718)
        )

        altitude = float(
            request.form.get("altitude", 30.0)
        )

        heading = float(
            request.form.get("heading", 0.0)
        )

        hfov = float(
            request.form.get("hfov", 78.0)
        )

        threshold = float(
            request.form.get("threshold", 0.5)
        )

        min_garbage_area = int(
            request.form.get("min_garbage_area", 300)
        )

    except (ValueError, TypeError) as e:

        return jsonify({
            "success": False,
            "error": f"Invalid parameter: {str(e)}"
        }), 400

    # ========================================================
    # 3. Run Full AI Pipeline
    # ========================================================

    try:

        from neerkavalan_pipeline import process_neerkavalan

        result = process_neerkavalan(
            image_path=image_path,
            drone_lat=drone_lat,
            drone_lon=drone_lon,
            altitude=altitude,
            heading=heading,
            hfov=hfov,
            threshold=threshold,
            min_garbage_area=min_garbage_area,
            visualize=True,
        )

        elapsed = time.time() - start_time

        # ====================================================
        # 4. Encode Route Visualization
        # ====================================================

        route_image_b64 = None

        if result.get("route_image") is not None:

            route_img = result["route_image"]

            if isinstance(route_img, np.ndarray):

                pil_img = Image.fromarray(
                    route_img.astype(np.uint8)
                )

            else:

                pil_img = route_img

            buf = io.BytesIO()

            pil_img.save(
                buf,
                format="PNG"
            )

            route_image_b64 = base64.b64encode(
                buf.getvalue()
            ).decode("utf-8")

        # ====================================================
        # 5. Encode Segmentation Mask
        # ====================================================

        mask_b64 = None

        if result.get("mask") is not None:

            mask = result["mask"]

            mask_rgb = np.stack(
                [
                    mask * 255,
                    np.zeros_like(mask),
                    np.zeros_like(mask)
                ],
                axis=-1
            ).astype(np.uint8)

            pil_mask = Image.fromarray(mask_rgb)

            buf = io.BytesIO()

            pil_mask.save(
                buf,
                format="PNG"
            )

            mask_b64 = base64.b64encode(
                buf.getvalue()
            ).decode("utf-8")

        # ====================================================
        # 6. Encode Probability Heatmap
        # ====================================================

        prob_b64 = None

        if result.get("probability") is not None:

            prob = result["probability"]

            prob_norm = (
                prob * 255
            ).astype(np.uint8)

            # Apply simple red intensity visualization
            prob_rgb = np.zeros(
                (*prob_norm.shape, 3),
                dtype=np.uint8
            )

            prob_rgb[:, :, 0] = prob_norm

            prob_rgb[:, :, 1] = (
                prob_norm * 0.2
            ).astype(np.uint8)

            pil_prob = Image.fromarray(
                prob_rgb
            )

            buf = io.BytesIO()

            pil_prob.save(
                buf,
                format="PNG"
            )

            prob_b64 = base64.b64encode(
                buf.getvalue()
            ).decode("utf-8")

        # ====================================================
        # 7. Encode Original Image
        # ====================================================

        original_b64 = None

        if result.get("original") is not None:

            orig = result["original"]

            buf = io.BytesIO()

            orig.save(
                buf,
                format="PNG"
            )

            original_b64 = base64.b64encode(
                buf.getvalue()
            ).decode("utf-8")

        # ====================================================
        # 8. Build Response
        # ====================================================

        response = {

            "success": True,

            "processing_time_s": round(
                elapsed,
                2
            ),

            "waste_percentage": round(
                result.get(
                    "waste_percentage",
                    0
                ),
                4
            ),

            "garbage_objects": [

                {
                    "label": obj["label"],

                    "area_pixels": obj["area"],

                    "centroid_x": obj["cx"],

                    "centroid_y": obj["cy"],

                    "bbox": {
                        "x": obj["x"],
                        "y": obj["y"],
                        "w": obj["w"],
                        "h": obj["h"],
                    },
                }

                for obj in result.get(
                    "garbage_objects",
                    []
                )
            ],

            "garbage_gps": result.get(
                "garbage_gps",
                []
            ),

            "waypoints": result.get(
                "waypoints",
                []
            ),

            "optimized_route": result.get(
                "optimized_route",
                []
            ),

            "route_indices": result.get(
                "route_indices",
                []
            ),

            "total_distance_m": round(
                result.get(
                    "total_distance_m",
                    0
                ),
                2
            ),

            "images": {

                "original": original_b64,

                "mask": mask_b64,

                "probability_heatmap": prob_b64,

                "route_visualization": route_image_b64,
            },

            "parameters": {

                "drone_lat": drone_lat,

                "drone_lon": drone_lon,

                "altitude": altitude,

                "heading": heading,

                "hfov": hfov,

                "threshold": threshold,

                "min_garbage_area": min_garbage_area,
            },
        }

        return jsonify(response)

    # ========================================================
    # Error Handling
    # ========================================================

    except Exception as e:

        traceback.print_exc()

        return jsonify({

            "success": False,

            "error": str(e),

            "traceback": traceback.format_exc(),

        }), 500

    # ========================================================
    # Cleanup
    # ========================================================

    finally:

        try:

            if os.path.exists(image_path):

                os.remove(image_path)

        except OSError:

            pass


# ============================================================
# Start Server
# ============================================================

if __name__ == "__main__":

    import matplotlib

    matplotlib.use("Agg")

    print("Loading AI model...")

    ensure_model()

    # Railway provides the PORT environment variable.
    # Fall back to 5050 for local development.

    port = int(
        os.environ.get(
            "PORT",
            5050
        )
    )

    print(
        f"Model loaded. "
        f"Starting AI Engine server on port {port}..."
    )

    app.run(
        host="0.0.0.0",
        port=port,
        debug=False,
    )
