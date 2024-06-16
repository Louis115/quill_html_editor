import 'dart:convert';
import 'package:flutter/material.dart';
import 'dart:typed_data';

class ResizableImage extends StatefulWidget {
  final String base64Image;
  final double initialWidth;
  final double initialHeight;

  ResizableImage({
    required this.base64Image,
    this.initialWidth = 200.0,
    this.initialHeight = 200.0,
  });

  @override
  _ResizableImageState createState() => _ResizableImageState();
}

class _ResizableImageState extends State<ResizableImage> {
  late double _width;
  late double _height;
  bool _isDragging = false;

  @override
  void initState() {
    super.initState();
    _width = widget.initialWidth;
    _height = widget.initialHeight;
  }

  Uint8List _decodeBase64Image(String base64String) {
    return base64Decode(base64String);
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        setState(() {
          _isDragging = !_isDragging;
        });
      },
      child: Stack(
        children: [
          Image.memory(
            _decodeBase64Image(widget.base64Image),
            width: _width,
            height: _height,
            fit: BoxFit.cover,
          ),
          if (_isDragging) ..._buildResizeHandles(),
        ],
      ),
    );
  }

  List<Widget> _buildResizeHandles() {
    return [
      _buildHandle(Alignment.topLeft),
      _buildHandle(Alignment.topRight),
      _buildHandle(Alignment.bottomLeft),
      _buildHandle(Alignment.bottomRight),
    ];
  }

  Widget _buildHandle(Alignment alignment) {
    return Positioned(
      left:
          alignment == Alignment.topRight || alignment == Alignment.bottomRight
              ? null
              : 0,
      right:
          alignment == Alignment.topRight || alignment == Alignment.bottomRight
              ? 0
              : null,
      top: alignment == Alignment.bottomLeft ||
              alignment == Alignment.bottomRight
          ? null
          : 0,
      bottom: alignment == Alignment.bottomLeft ||
              alignment == Alignment.bottomRight
          ? 0
          : null,
      child: GestureDetector(
        onPanUpdate: (details) {
          setState(() {
            double dx = details.delta.dx;
            double dy = details.delta.dy;

            if (alignment == Alignment.topLeft ||
                alignment == Alignment.bottomRight) {
              _width += dx;
              _height += dy;
            } else if (alignment == Alignment.topRight ||
                alignment == Alignment.bottomLeft) {
              _width -= dx;
              _height += dy;
            }
          });
        },
        child: Container(
          width: 10,
          height: 10,
          color: Colors.blue,
        ),
      ),
    );
  }
}
