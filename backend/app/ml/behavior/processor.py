import cv2
import numpy as np
import torch

def preprocess_frames(frames, device='cpu', size=(112, 112)):
    """
    Preprocess a sequence of frames for the behavior detection model.
    Expected: list of BGR frames (numpy arrays)
    Output: Torch tensor (1, C, T, H, W)
    """
    processed = []
    for f in frames:
        # Resize to model input size
        f = cv2.resize(f, size)
        # Convert BGR to RGB
        f = cv2.cvtColor(f, cv2.COLOR_BGR2RGB)
        processed.append(f)
    
    # Convert list of frames to numpy array (T, H, W, C)
    # Then permute to (C, T, H, W)
    tensor = torch.tensor(np.array(processed)).permute(3, 0, 1, 2).float() / 255.0
    return tensor.unsqueeze(0).to(device)
