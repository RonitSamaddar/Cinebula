import 'dart:math';
import 'package:flutter/material.dart';

/// Subtle film grain noise overlay. 3% opacity, full-screen, non-interactive.
class FilmGrainPainter extends CustomPainter {
  final int seed;

  FilmGrainPainter({required this.seed});

  @override
  void paint(Canvas canvas, Size size) {
    final rng = Random(seed);
    final paint = Paint()..strokeWidth = 1.0;

    // Draw sparse noise dots — enough for texture, not so many it's slow
    final count = (size.width * size.height / 80).toInt().clamp(0, 4000);
    for (var i = 0; i < count; i++) {
      final x = rng.nextDouble() * size.width;
      final y = rng.nextDouble() * size.height;
      final brightness = rng.nextDouble();
      paint.color = Colors.white.withValues(alpha: brightness * 0.03);
      canvas.drawCircle(Offset(x, y), 0.5, paint);
    }
  }

  @override
  bool shouldRepaint(FilmGrainPainter oldDelegate) {
    return oldDelegate.seed != seed;
  }
}
