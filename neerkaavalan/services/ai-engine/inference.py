
import os
import torch
import numpy as np
import cv2

from PIL import Image
from torchvision import transforms

from model_architecture import DeepLabV3Plus


# ============================================================
# PACKAGE PATHS
# ============================================================

PACKAGE_DIR = os.path.dirname(os.path.abspath(__file__))

CHECKPOINT_PATH = os.path.join(
    PACKAGE_DIR,
    "neerkavalan_deeplabv3plus_resnet50_inference.pth"
)


# ============================================================
# INFERENCE SETTINGS
# ============================================================

INPUT_SIZE = (512, 512)

DEFAULT_THRESHOLD = 0.5

DEVICE = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)


# ============================================================
# PREPROCESSING
# ============================================================

inference_transform = transforms.Compose([
    transforms.Resize(INPUT_SIZE),

    transforms.ToTensor(),

    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    )
])


# ============================================================
# MODEL LOADING
# ============================================================

def load_model(checkpoint_path=CHECKPOINT_PATH):

    model = DeepLabV3Plus(
        num_classes=1
    ).to(DEVICE)

    weights = torch.load(
        checkpoint_path,
        map_location=DEVICE,
        weights_only=False

    )

    model.load_state_dict(
        weights,
        strict=True
    )

    model.eval()

    return model


# ============================================================
# LOAD MODEL ON DEMAND
# ============================================================

MODEL = None


def get_model():

    global MODEL

    if MODEL is None:

        MODEL = load_model()

    return MODEL


# ============================================================
# GARBAGE PREDICTION
# ============================================================

def predict_garbage(
    image_path,
    threshold=DEFAULT_THRESHOLD
):

    # --------------------------------------------------------
    # Load original image
    # --------------------------------------------------------

    original = Image.open(
        image_path
    ).convert("RGB")

    original_width, original_height = original.size


    # --------------------------------------------------------
    # Preprocess
    # --------------------------------------------------------

    input_tensor = inference_transform(
        original
    ).unsqueeze(0).to(DEVICE)


    # --------------------------------------------------------
    # Model inference
    # --------------------------------------------------------

    model = get_model()

    with torch.no_grad():

        output = model(
            input_tensor
        )

        probability = torch.sigmoid(
            output
        )[0, 0].cpu().numpy()


    # --------------------------------------------------------
    # Convert probability map to original image size
    # --------------------------------------------------------

    probability_original = cv2.resize(
        probability,
        (original_width, original_height),
        interpolation=cv2.INTER_LINEAR
    )


    # --------------------------------------------------------
    # Binary garbage mask
    # --------------------------------------------------------

    mask_original = (
        probability_original >= threshold
    ).astype(np.uint8)


    # --------------------------------------------------------
    # Waste coverage percentage
    # --------------------------------------------------------

    waste_percentage = (
        np.sum(mask_original > 0)
        /
        mask_original.size
        *
        100.0
    )


    # --------------------------------------------------------
    # Return results
    # --------------------------------------------------------

    return {

        "original": original,

        "probability": probability_original,

        "mask": mask_original,

        "waste_percentage": waste_percentage
    }
