import torch
import torch.nn as nn
from torchvision.models import resnet18, ResNet18_Weights

class FastActionModel(nn.Module):
    def __init__(self, num_classes, hidden_size=128, lstm_layers=1, pretrained=False):
        super(FastActionModel, self).__init__()
        
        # Use ResNet18 for feature extraction
        weights = ResNet18_Weights.DEFAULT if pretrained else None
        base = resnet18(weights=weights)
        
        # Remove the fully connected layer
        self.feature_extractor = nn.Sequential(*list(base.children())[:-1])
        self.cnn_out = base.fc.in_features 
        
        # LSTM for temporal sequence analysis
        self.lstm = nn.LSTM(
            input_size=self.cnn_out, 
            hidden_size=hidden_size, 
            num_layers=lstm_layers, 
            batch_first=True
        )
        
        # Final classification layer
        self.fc = nn.Linear(hidden_size, num_classes)
        
    def forward(self, x):
        # x shape: (batch, channels, sequence_length, height, width)
        batch_size, C, T, H, W = x.size()
        
        # Merge batch and time dimensions for CNN processing
        c_in = x.transpose(1, 2).contiguous().view(batch_size * T, C, H, W)
        
        # Extract features
        features = self.feature_extractor(c_in) 
        features = features.view(batch_size, T, -1) 
        
        # LSTM processing
        lstm_out, _ = self.lstm(features) 
        
        # Use the hidden state of the last time step
        last_out = lstm_out[:, -1, :] 
        
        # Prediction
        out = self.fc(last_out)
        return out
    
    def load_weights(self, path, device='cpu'):
        """Load model weights to the specified device."""
        self.load_state_dict(torch.load(path, map_location=device))
