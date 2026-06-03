import 'dart:math';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

/// Rich, volumetric nebula clouds with multiple layers per category,
/// filamentary structures, glowing edges, and smooth inter-category bridges.
/// Parallax at 12% camera speed.
class NebulaPainter extends CustomPainter {
  final Offset parallaxOffset;
  final double cameraX;
  final double cameraY;

  NebulaPainter({
    required this.parallaxOffset,
    required this.cameraX,
    required this.cameraY,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final rng = Random(99);

    canvas.save();
    canvas.translate(parallaxOffset.dx * 0.12, parallaxOffset.dy * 0.12);

    final positions = <Offset>[
      Offset(size.width * 0.18, size.height * 0.12),  // Drama - purple
      Offset(size.width * 0.82, size.height * 0.18),  // Sci-Fi - blue
      Offset(size.width * 0.5, size.height * 0.48),   // Comedy - teal
      Offset(size.width * 0.12, size.height * 0.78),  // Thriller - coral
      Offset(size.width * 0.88, size.height * 0.72),  // Romance - gold
      Offset(size.width * 0.5, size.height * 0.92),   // Horror - red
    ];

    // Inter-category bridges FIRST (draw behind clouds)
    _drawBridges(canvas, size, positions);

    // Atmospheric background wash for each region
    _drawAtmosphericWash(canvas, size, positions, rng);

    // Main nebula clouds — 3 layers each for depth
    for (var i = 0; i < AppColors.categoryAccents.length && i < positions.length; i++) {
      _drawNebulaCloud(canvas, size, positions[i], AppColors.categoryAccents[i], rng, i);
    }

    // Filamentary wisps connecting nearby regions
    _drawFilaments(canvas, size, positions, rng);

    // Bright edge highlights on some clouds
    _drawEdgeGlow(canvas, size, positions);

    canvas.restore();
  }

  void _drawAtmosphericWash(Canvas canvas, Size size, List<Offset> positions, Random rng) {
    // Very large, very subtle color regions — gives the whole space depth
    for (var i = 0; i < AppColors.categoryAccents.length && i < positions.length; i++) {
      final color = AppColors.categoryAccents[i];
      final pos = positions[i];
      final radius = size.width * 0.6 + rng.nextDouble() * size.width * 0.2;

      canvas.drawCircle(pos, radius, Paint()
        ..shader = ui.Gradient.radial(pos, radius, [
          color.withValues(alpha: 0.04),
          color.withValues(alpha: 0.015),
          color.withValues(alpha: 0.0),
        ], [0.0, 0.4, 1.0])
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 50));
    }
  }

  void _drawNebulaCloud(Canvas canvas, Size size, Offset center, Color color, Random rng, int index) {
    // Layer 1: Large outer halo (very diffuse)
    final outerR = size.width * 0.38 + rng.nextDouble() * size.width * 0.08;
    canvas.drawCircle(center, outerR, Paint()
      ..shader = ui.Gradient.radial(center, outerR, [
        color.withValues(alpha: 0.1),
        color.withValues(alpha: 0.04),
        color.withValues(alpha: 0.01),
        color.withValues(alpha: 0.0),
      ], [0.0, 0.3, 0.6, 1.0])
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 35));

    // Layer 2: Mid cloud (more defined shape — offset for asymmetry)
    final midOff = Offset(
      (rng.nextDouble() - 0.5) * 40,
      (rng.nextDouble() - 0.5) * 40,
    );
    final midR = outerR * 0.55;
    canvas.drawCircle(center + midOff, midR, Paint()
      ..shader = ui.Gradient.radial(center + midOff, midR, [
        color.withValues(alpha: 0.14),
        color.withValues(alpha: 0.06),
        color.withValues(alpha: 0.0),
      ], [0.0, 0.5, 1.0])
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 22));

    // Layer 3: Dense core (brighter, smaller)
    final coreOff = Offset(
      (rng.nextDouble() - 0.5) * 20,
      (rng.nextDouble() - 0.5) * 20,
    );
    final coreR = outerR * 0.25;
    canvas.drawCircle(center + coreOff, coreR, Paint()
      ..shader = ui.Gradient.radial(center + coreOff, coreR, [
        color.withValues(alpha: 0.18),
        color.withValues(alpha: 0.06),
        color.withValues(alpha: 0.0),
      ], [0.0, 0.4, 1.0])
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 14));

    // Secondary wisp clouds (2-3 per region)
    for (var w = 0; w < 3; w++) {
      final wispOff = Offset(
        (rng.nextDouble() - 0.5) * 120,
        (rng.nextDouble() - 0.5) * 120,
      );
      final wispR = 30 + rng.nextDouble() * 50;
      // Vary the color slightly — shift hue by mixing with adjacent category
      final adjacentColor = AppColors.categoryAccents[(index + 1) % AppColors.categoryAccents.length];
      final wispColor = Color.lerp(color, adjacentColor, 0.15 + rng.nextDouble() * 0.2)!;

      canvas.drawCircle(center + wispOff, wispR, Paint()
        ..shader = ui.Gradient.radial(center + wispOff, wispR, [
          wispColor.withValues(alpha: 0.07),
          wispColor.withValues(alpha: 0.02),
          wispColor.withValues(alpha: 0.0),
        ], [0.0, 0.4, 1.0])
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 18));
    }
  }

  void _drawBridges(Canvas canvas, Size size, List<Offset> positions) {
    // More bridges, with bezier curves for organic shapes
    final bridgePairs = [
      [0, 2], // Drama ↔ Comedy
      [1, 4], // Sci-Fi ↔ Romance
      [3, 5], // Thriller ↔ Horror
      [0, 3], // Drama ↔ Thriller
      [1, 2], // Sci-Fi ↔ Comedy
      [4, 5], // Romance ↔ Horror
    ];

    for (final pair in bridgePairs) {
      if (pair[0] >= positions.length || pair[1] >= positions.length) continue;
      final p1 = positions[pair[0]];
      final p2 = positions[pair[1]];
      final c1 = AppColors.categoryAccents[pair[0]];
      final c2 = AppColors.categoryAccents[pair[1]];
      final mid = (p1 + p2) / 2;
      // Offset control point for organic curve
      final ctrl = mid + Offset(
        (pair[0] - pair[1]).toDouble() * 15,
        (pair[0] + pair[1]).toDouble() * 8,
      );

      final path = Path()
        ..moveTo(p1.dx, p1.dy)
        ..quadraticBezierTo(ctrl.dx, ctrl.dy, p2.dx, p2.dy);

      canvas.drawPath(path, Paint()
        ..shader = ui.Gradient.linear(p1, p2, [
          c1.withValues(alpha: 0.04),
          Color.lerp(c1, c2, 0.5)!.withValues(alpha: 0.025),
          c2.withValues(alpha: 0.04),
        ], [0.0, 0.5, 1.0])
        ..style = PaintingStyle.stroke
        ..strokeWidth = 50
        ..strokeCap = StrokeCap.round
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 30));
    }
  }

  void _drawFilaments(Canvas canvas, Size size, List<Offset> positions, Random rng) {
    // Thin, wispy filaments extending from nebula cores
    for (var i = 0; i < positions.length; i++) {
      final center = positions[i];
      final color = AppColors.categoryAccents[i];

      for (var f = 0; f < 4; f++) {
        final angle = rng.nextDouble() * 2 * pi;
        final length = 60 + rng.nextDouble() * 100;
        final end = center + Offset(cos(angle) * length, sin(angle) * length);
        final ctrl = center + Offset(
          cos(angle + 0.5) * length * 0.6,
          sin(angle + 0.5) * length * 0.6,
        );

        final path = Path()
          ..moveTo(center.dx, center.dy)
          ..quadraticBezierTo(ctrl.dx, ctrl.dy, end.dx, end.dy);

        canvas.drawPath(path, Paint()
          ..shader = ui.Gradient.linear(center, end, [
            color.withValues(alpha: 0.06),
            color.withValues(alpha: 0.02),
            color.withValues(alpha: 0.0),
          ], [0.0, 0.5, 1.0])
          ..style = PaintingStyle.stroke
          ..strokeWidth = 4 + rng.nextDouble() * 8
          ..strokeCap = StrokeCap.round
          ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 6));
      }
    }
  }

  void _drawEdgeGlow(Canvas canvas, Size size, List<Offset> positions) {
    // Bright rims on the cloud edges facing the "center" of the scene
    final sceneCenter = Offset(size.width * 0.5, size.height * 0.5);

    for (var i = 0; i < positions.length; i++) {
      final pos = positions[i];
      final color = AppColors.categoryAccents[i];
      // Direction from cloud to center
      final dir = (sceneCenter - pos);
      final dist = dir.distance;
      if (dist < 1) continue;
      final norm = dir / dist;
      final edgePos = pos + norm * 40; // 40px toward center

      canvas.drawCircle(edgePos, 25, Paint()
        ..shader = ui.Gradient.radial(edgePos, 25, [
          color.withValues(alpha: 0.08),
          color.withValues(alpha: 0.0),
        ])
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 12));
    }
  }

  @override
  bool shouldRepaint(NebulaPainter oldDelegate) {
    return oldDelegate.parallaxOffset != parallaxOffset;
  }
}
