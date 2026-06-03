import 'dart:math';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';

/// 60fps animated effects layer: shooting stars with glowing trails,
/// twinkling colored stars, drifting cosmic dust, pulsing energy wisps,
/// and subtle aurora bands.
class EffectsPainter extends CustomPainter {
  final double time;
  final Size screenSize;

  EffectsPainter({
    required this.time,
    required this.screenSize,
  });

  @override
  void paint(Canvas canvas, Size size) {
    _drawAuroraBands(canvas, size);
    _drawTwinklingStars(canvas, size);
    _drawCosmicDust(canvas, size);
    _drawEnergyWisps(canvas, size);
    _drawShootingStars(canvas, size);
  }

  void _drawAuroraBands(Canvas canvas, Size size) {
    // Subtle aurora-like color bands that slowly drift
    final auroras = [
      (0.2, const Color(0xFF6FA8E8), 0.3),  // blue band
      (0.6, const Color(0xFFB56CFF), 0.7),  // purple band
      (0.85, const Color(0xFF3FB89E), 0.15), // teal band
    ];

    for (final (yFrac, color, phase) in auroras) {
      final baseY = size.height * yFrac;
      final wave = sin(time * 0.15 + phase * 10) * 30;
      final alpha = 0.012 + 0.008 * sin(time * 0.2 + phase * 5);

      final path = Path();
      path.moveTo(-20, baseY + wave);
      for (var x = 0.0; x <= size.width + 20; x += 20) {
        final y = baseY + wave + sin(x * 0.008 + time * 0.3 + phase) * 25
            + sin(x * 0.015 + time * 0.1) * 15;
        path.lineTo(x, y);
      }
      path.lineTo(size.width + 20, baseY + wave + 60);
      path.lineTo(-20, baseY + wave + 60);
      path.close();

      canvas.drawPath(path, Paint()
        ..shader = ui.Gradient.linear(
          Offset(0, baseY + wave - 30),
          Offset(0, baseY + wave + 60),
          [
            color.withValues(alpha: 0.0),
            color.withValues(alpha: alpha),
            color.withValues(alpha: alpha * 0.5),
            color.withValues(alpha: 0.0),
          ],
          [0.0, 0.3, 0.6, 1.0],
        )
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 15));
    }
  }

  void _drawTwinklingStars(Canvas canvas, Size size) {
    final rng = Random(77);
    final starColors = [
      Colors.white,
      const Color(0xFFCCDDFF),
      const Color(0xFFFFEECC),
      const Color(0xFFDDCCFF),
      const Color(0xFFAAFFDD),
    ];

    for (var i = 0; i < 70; i++) {
      final x = rng.nextDouble() * size.width;
      final y = rng.nextDouble() * size.height;
      final phase = rng.nextDouble() * 2 * pi;
      final speed = 0.4 + rng.nextDouble() * 2.0;
      final color = starColors[rng.nextInt(starColors.length)];

      // Sinusoidal twinkle with varied curves
      final raw = sin(time * speed + phase);
      final alpha = 0.1 + 0.5 * ((raw + 1) / 2);
      final r = 0.6 + rng.nextDouble() * 1.2;

      // Glow halo
      if (alpha > 0.4) {
        canvas.drawCircle(Offset(x, y), r * 4, Paint()
          ..color = color.withValues(alpha: (alpha - 0.4) * 0.15));
      }

      canvas.drawCircle(Offset(x, y), r, Paint()
        ..color = color.withValues(alpha: alpha));
    }
  }

  void _drawCosmicDust(Canvas canvas, Size size) {
    final rng = Random(123);
    final dustColors = [
      const Color(0xFFCCBBFF),
      const Color(0xFFBBDDFF),
      const Color(0xFFFFDDCC),
      const Color(0xFFBBFFDD),
    ];

    for (var i = 0; i < 30; i++) {
      final baseX = rng.nextDouble() * size.width;
      final baseY = rng.nextDouble() * size.height;
      final driftSpeed = 0.2 + rng.nextDouble() * 0.4;
      final driftAngle = rng.nextDouble() * 2 * pi;
      final color = dustColors[rng.nextInt(dustColors.length)];

      // Slow orbital drift
      final x = (baseX + cos(driftAngle + time * driftSpeed * 0.3) * time * driftSpeed * 6) % size.width;
      final y = (baseY + sin(driftAngle + time * driftSpeed * 0.2) * time * driftSpeed * 4) % size.height;
      final alpha = 0.03 + 0.08 * ((sin(time * 0.25 + i * 0.7) + 1) / 2);
      final r = 2 + rng.nextDouble() * 3;

      canvas.drawCircle(Offset(x, y), r, Paint()
        ..color = color.withValues(alpha: alpha)
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 4));

      // Some dust has a subtle tail
      if (i % 3 == 0) {
        final tailLen = r * 3;
        final tailEnd = Offset(
          x - cos(driftAngle) * tailLen,
          y - sin(driftAngle) * tailLen,
        );
        canvas.drawLine(Offset(x, y), tailEnd, Paint()
          ..shader = ui.Gradient.linear(Offset(x, y), tailEnd, [
            color.withValues(alpha: alpha * 0.5),
            color.withValues(alpha: 0.0),
          ])
          ..strokeWidth = r * 0.8
          ..strokeCap = StrokeCap.round
          ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 2));
      }
    }
  }

  void _drawEnergyWisps(Canvas canvas, Size size) {
    // Slowly pulsing, drifting light wisps
    final rng = Random(201);
    for (var i = 0; i < 6; i++) {
      final baseX = rng.nextDouble() * size.width;
      final baseY = rng.nextDouble() * size.height;
      final orbitR = 20 + rng.nextDouble() * 40;
      final speed = 0.1 + rng.nextDouble() * 0.15;
      final phase = rng.nextDouble() * 2 * pi;

      final x = baseX + cos(time * speed + phase) * orbitR;
      final y = baseY + sin(time * speed * 0.7 + phase) * orbitR * 0.6;
      final pulse = 0.04 + 0.04 * sin(time * 0.5 + phase);

      final colors = [
        const Color(0xFFB56CFF),
        const Color(0xFF6FA8E8),
        const Color(0xFF3FB89E),
        const Color(0xFFFF7A6C),
        const Color(0xFFE6B04A),
        const Color(0xFFDDCCFF),
      ];
      final color = colors[i % colors.length];

      // Wisp glow
      canvas.drawCircle(Offset(x, y), 12, Paint()
        ..shader = ui.Gradient.radial(Offset(x, y), 12, [
          color.withValues(alpha: pulse),
          color.withValues(alpha: pulse * 0.3),
          color.withValues(alpha: 0.0),
        ], [0.0, 0.4, 1.0])
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 6));

      // Core
      canvas.drawCircle(Offset(x, y), 2, Paint()
        ..color = color.withValues(alpha: pulse * 2));
    }
  }

  void _drawShootingStars(Canvas canvas, Size size) {
    // 3 shooting stars with longer, more dramatic trails
    for (var i = 0; i < 3; i++) {
      final rng = Random(i * 31 + 7);
      final cycleDuration = 5.0 + rng.nextDouble() * 5.0;
      final offset = rng.nextDouble() * cycleDuration + i * 3;
      final cycleTime = (time + offset) % cycleDuration;
      final progress = cycleTime / cycleDuration;

      // Visible for first 25% of cycle
      if (progress > 0.25) continue;

      final t = progress / 0.25;

      final startX = rng.nextDouble() * size.width * 0.8 + size.width * 0.1;
      final startY = rng.nextDouble() * size.height * 0.3;
      final angle = 0.4 + rng.nextDouble() * 0.8;
      final length = 100 + rng.nextDouble() * 120;

      final headX = startX + cos(angle) * length * t;
      final headY = startY + sin(angle) * length * t;
      final trailLen = 50 + t * 30;
      final tailX = headX - cos(angle) * trailLen;
      final tailY = headY - sin(angle) * trailLen;

      final alpha = t < 0.3 ? t / 0.3 : t > 0.8 ? (1 - t) / 0.2 : 1.0;

      // Wide glow trail
      canvas.drawLine(Offset(tailX, tailY), Offset(headX, headY), Paint()
        ..shader = ui.Gradient.linear(
          Offset(tailX, tailY), Offset(headX, headY),
          [
            Colors.white.withValues(alpha: 0.0),
            Colors.white.withValues(alpha: 0.08 * alpha),
            Colors.white.withValues(alpha: 0.2 * alpha),
          ],
          [0.0, 0.3, 1.0],
        )
        ..strokeWidth = 4
        ..strokeCap = StrokeCap.round
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 3));

      // Core trail
      canvas.drawLine(Offset(tailX, tailY), Offset(headX, headY), Paint()
        ..shader = ui.Gradient.linear(
          Offset(tailX, tailY), Offset(headX, headY),
          [
            Colors.white.withValues(alpha: 0.0),
            Colors.white.withValues(alpha: 0.6 * alpha),
          ],
        )
        ..strokeWidth = 1.5
        ..strokeCap = StrokeCap.round);

      // Bright head
      canvas.drawCircle(Offset(headX, headY), 2.5, Paint()
        ..shader = ui.Gradient.radial(Offset(headX, headY), 6, [
          Colors.white.withValues(alpha: 0.7 * alpha),
          const Color(0xFFCCDDFF).withValues(alpha: 0.2 * alpha),
          const Color(0xFFCCDDFF).withValues(alpha: 0.0),
        ], [0.0, 0.4, 1.0]));

      // Sparkle particles along trail
      for (var s = 0; s < 5; s++) {
        final st = rng.nextDouble();
        final sx = tailX + (headX - tailX) * st + (rng.nextDouble() - 0.5) * 6;
        final sy = tailY + (headY - tailY) * st + (rng.nextDouble() - 0.5) * 6;
        canvas.drawCircle(Offset(sx, sy), 0.5, Paint()
          ..color = Colors.white.withValues(alpha: 0.3 * alpha * (1 - st)));
      }
    }
  }

  @override
  bool shouldRepaint(EffectsPainter oldDelegate) => true;
}
