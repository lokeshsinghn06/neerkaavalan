
import torch
import torch.nn as nn
import torch.nn.functional as F

from torchvision.models import (
    resnet50,
    ResNet50_Weights
)


class ASPPConv(nn.Sequential):

    def __init__(
        self,
        in_channels,
        out_channels,
        dilation
    ):

        super().__init__(
            nn.Conv2d(
                in_channels,
                out_channels,
                kernel_size=3,
                padding=dilation,
                dilation=dilation,
                bias=False
            ),

            nn.BatchNorm2d(
                out_channels
            ),

            nn.ReLU(inplace=True)
        )


class ASPPPooling(nn.Module):

    def __init__(
        self,
        in_channels,
        out_channels
    ):

        super().__init__()

        self.pool = nn.AdaptiveAvgPool2d(1)

        self.conv = nn.Conv2d(
            in_channels,
            out_channels,
            kernel_size=1,
            bias=False
        )

        self.norm = nn.GroupNorm(
            num_groups=32,
            num_channels=out_channels
        )

        self.relu = nn.ReLU(
            inplace=True
        )

    def forward(self, x):

        size = x.shape[-2:]

        y = self.pool(x)

        y = self.conv(y)
        y = self.norm(y)
        y = self.relu(y)

        y = F.interpolate(
            y,
            size=size,
            mode="bilinear",
            align_corners=False
        )

        return y


class ASPP(nn.Module):

    def __init__(
        self,
        in_channels,
        out_channels=256
    ):

        super().__init__()

        self.blocks = nn.ModuleList([

            nn.Sequential(
                nn.Conv2d(
                    in_channels,
                    out_channels,
                    kernel_size=1,
                    bias=False
                ),

                nn.BatchNorm2d(
                    out_channels
                ),

                nn.ReLU(inplace=True)
            ),

            ASPPConv(
                in_channels,
                out_channels,
                6
            ),

            ASPPConv(
                in_channels,
                out_channels,
                12
            ),

            ASPPConv(
                in_channels,
                out_channels,
                18
            ),

            ASPPPooling(
                in_channels,
                out_channels
            )
        ])

        self.project = nn.Sequential(

            nn.Conv2d(
                out_channels * 5,
                out_channels,
                kernel_size=1,
                bias=False
            ),

            nn.BatchNorm2d(
                out_channels
            ),

            nn.ReLU(inplace=True),

            nn.Dropout(
                0.1
            )
        )

    def forward(self, x):

        features = [
            block(x)
            for block in self.blocks
        ]

        x = torch.cat(
            features,
            dim=1
        )

        return self.project(x)


class DeepLabV3PlusDecoder(nn.Module):

    def __init__(
        self,
        low_channels=256,
        num_classes=1
    ):

        super().__init__()

        self.low_projection = nn.Sequential(

            nn.Conv2d(
                low_channels,
                48,
                kernel_size=1,
                bias=False
            ),

            nn.BatchNorm2d(48),

            nn.ReLU(inplace=True)
        )

        self.fuse = nn.Sequential(

            nn.Conv2d(
                256 + 48,
                256,
                kernel_size=3,
                padding=1,
                bias=False
            ),

            nn.BatchNorm2d(256),

            nn.ReLU(inplace=True),

            nn.Conv2d(
                256,
                256,
                kernel_size=3,
                padding=1,
                bias=False
            ),

            nn.BatchNorm2d(256),

            nn.ReLU(inplace=True)
        )

        self.classifier = nn.Conv2d(
            256,
            num_classes,
            kernel_size=1
        )

    def forward(
        self,
        low_features,
        high_features
    ):

        low_features = self.low_projection(
            low_features
        )

        high_features = F.interpolate(
            high_features,
            size=low_features.shape[-2:],
            mode="bilinear",
            align_corners=False
        )

        x = torch.cat(
            [
                high_features,
                low_features
            ],
            dim=1
        )

        x = self.fuse(x)

        x = self.classifier(x)

        return x


class DeepLabV3Plus(nn.Module):

    def __init__(
        self,
        num_classes=1
    ):

        super().__init__()

        backbone = resnet50(
            weights=ResNet50_Weights.DEFAULT
        )

        self.layer0 = nn.Sequential(
            backbone.conv1,
            backbone.bn1,
            backbone.relu,
            backbone.maxpool
        )

        self.layer1 = backbone.layer1
        self.layer2 = backbone.layer2
        self.layer3 = backbone.layer3
        self.layer4 = backbone.layer4

        for block in self.layer4:

            block.conv2.stride = (1, 1)

            block.conv2.dilation = (
                2,
                2
            )

            block.conv2.padding = (
                2,
                2
            )

            if block.downsample is not None:

                block.downsample[0].stride = (
                    1,
                    1
                )

        self.aspp = ASPP(
            in_channels=2048,
            out_channels=256
        )

        self.decoder = DeepLabV3PlusDecoder(
            low_channels=256,
            num_classes=num_classes
        )

    def forward(self, x):

        input_size = x.shape[-2:]

        x = self.layer0(x)

        low = self.layer1(x)

        x = self.layer2(low)

        x = self.layer3(x)

        x = self.layer4(x)

        x = self.aspp(x)

        x = self.decoder(
            low,
            x
        )

        x = F.interpolate(
            x,
            size=input_size,
            mode="bilinear",
            align_corners=False
        )

        return x
