import 'dart:math';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';

/// Rich deep-space starfield with multi-colored stars, dramatic celestial objects,
/// and layered depth. Pre-rendered with parallax.
class StarfieldPainter extends CustomPainter {
  final double breathePhase;
  final Offset parallaxOffset;

  StarfieldPainter({
    required this.breathePhase,
    required this.parallaxOffset,
  });

  // Star color palette — real astronomical star colors
  static const _starColors = [
    Color(0xFFFFFFFF), // White
    Color(0xFFCCDDFF), // Blue-white (hot)
    Color(0xFFAABBFF), // Blue (very hot)
    Color(0xFFFFEECC), // Yellow-white (sun-like)
    Color(0xFFFFDDAA), // Yellow (cooler)
    Color(0xFFFFCCBB), // Orange (cool)
    Color(0xFFFFAAAA), // Red (coolest)
    Color(0xFFDDCCFF), // Lavender (peculiar)
  ];

  @override
  void paint(Canvas canvas, Size size) {
    final rng = Random(42);
    final breatheOpacity = 0.82 + 0.18 * sin(breathePhase * 2 * pi);
    final w = size.width * 1.6;
    final h = size.height * 1.6;
    final ox = -size.width * 0.3;
    final oy = -size.height * 0.3;

    canvas.save();
    canvas.translate(parallaxOffset.dx * 0.15, parallaxOffset.dy * 0.15);

    // === DEEP BACKGROUND: Color wash zones (very subtle tinted regions) ===
    _drawDeepColorWash(canvas, size, rng, breatheOpacity);

    // === LAYER 1: 1200 tiny stars — depth layer ===
    _drawStarField(canvas, w, h, ox, oy, rng, 1200, 0.3, 0.6, 1.0, breatheOpacity);

    // === LAYER 2: 500 medium stars ===
    _drawStarField(canvas, w, h, ox, oy, rng, 500, 0.5, 0.7, 1.8, breatheOpacity);

    // === LAYER 3: 150 visible stars with colored glow halos ===
    _drawGlowStars(canvas, w, h, ox, oy, rng, 150, breatheOpacity);

    // === LAYER 5: 8 hero stars — large, colorful, dramatic ===
    _drawHeroStars(canvas, size, rng, breatheOpacity);

    // === CELESTIAL OBJECTS ===
    _drawSpiralGalaxy(canvas, size, rng, breatheOpacity);
    _drawEdgeOnGalaxy(canvas, size, breatheOpacity);
    _drawDistantGalaxies(canvas, w, h, ox, oy, rng, 18, breatheOpacity);
    _drawRingedPlanet(canvas, size, breatheOpacity);
    _drawGasGiant(canvas, size, breatheOpacity);
    _drawNebulaPillar(canvas, size, breatheOpacity);
    _drawSupernovaRemnant(canvas, size, breatheOpacity);
    _drawBinaryStar(canvas, size, breatheOpacity);
    _drawComet(canvas, size, breathePhase, breatheOpacity);
    _drawStarClusters(canvas, size, rng, breatheOpacity);
    _drawDustLanes(canvas, size, rng, breatheOpacity);

    canvas.restore();
  }

  void _drawDeepColorWash(Canvas canvas, Size size, Random rng, double opacity) {
    // Subtle colored regions to give the space depth and variety
    final washes = [
      (Offset(size.width * 0.2, size.height * 0.1), const Color(0xFF1A0A2E), 250.0),
      (Offset(size.width * 0.8, size.height * 0.3), const Color(0xFF0A1A2E), 200.0),
      (Offset(size.width * 0.1, size.height * 0.7), const Color(0xFF1A0A1A), 220.0),
      (Offset(size.width * 0.9, size.height * 0.8), const Color(0xFF0E1A1A), 180.0),
      (Offset(size.width * 0.5, size.height * 0.5), const Color(0xFF0E0A1E), 300.0),
    ];
    for (final (pos, color, radius) in washes) {
      final paint = Paint()
        ..shader = ui.Gradient.radial(pos, radius, [
          color.withValues(alpha: 0.5 * opacity),
          color.withValues(alpha: 0.0),
        ])
        ..blendMode = BlendMode.screen;
      canvas.drawCircle(pos, radius, paint);
    }
  }

  void _drawStarField(Canvas canvas, double w, double h, double ox, double oy,
      Random rng, int count, double minAlpha, double maxAlpha, double strokeW, double opacity) {
    final points = <Offset>[];
    final paint = Paint()
      ..strokeWidth = strokeW
      ..strokeCap = StrokeCap.round
      ..color = Colors.white.withValues(alpha: ((minAlpha + maxAlpha) / 2) * opacity);
    for (var i = 0; i < count; i++) {
      points.add(Offset(ox + rng.nextDouble() * w, oy + rng.nextDouble() * h));
    }
    canvas.drawPoints(ui.PointMode.points, points, paint);

    // Draw 20% of them slightly brighter for variation
    final brightPoints = <Offset>[];
    for (var i = 0; i < count ~/ 5; i++) {
      brightPoints.add(Offset(ox + rng.nextDouble() * w, oy + rng.nextDouble() * h));
    }
    paint.color = Colors.white.withValues(alpha: maxAlpha * opacity);
    paint.strokeWidth = strokeW * 1.3;
    canvas.drawPoints(ui.PointMode.points, brightPoints, paint);
  }

  void _drawGlowStars(Canvas canvas, double w, double h, double ox, double oy,
      Random rng, int count, double opacity) {
    for (var i = 0; i < count; i++) {
      final x = ox + rng.nextDouble() * w;
      final y = oy + rng.nextDouble() * h;
      final r = 1.0 + rng.nextDouble() * 2.0;
      final color = _starColors[rng.nextInt(_starColors.length)];

      // Outer halo
      final haloPaint = Paint()
        ..shader = ui.Gradient.radial(Offset(x, y), r * 6, [
          color.withValues(alpha: 0.15 * opacity),
          color.withValues(alpha: 0.04 * opacity),
          color.withValues(alpha: 0.0),
        ], [0.0, 0.5, 1.0]);
      canvas.drawCircle(Offset(x, y), r * 6, haloPaint);

      // Inner glow
      final glowPaint = Paint()
        ..shader = ui.Gradient.radial(Offset(x, y), r * 3, [
          color.withValues(alpha: 0.35 * opacity),
          color.withValues(alpha: 0.0),
        ]);
      canvas.drawCircle(Offset(x, y), r * 3, glowPaint);

      // Core
      canvas.drawCircle(Offset(x, y), r, Paint()..color = color.withValues(alpha: 0.9 * opacity));
    }
  }

  void _drawHeroStars(Canvas canvas, Size size, Random rng, double opacity) {
    // A few dramatic, large, colorful stars placed intentionally
    final heroes = [
      (Offset(size.width * 0.12, size.height * 0.08), 4.0, const Color(0xFFAABBFF), 'blue'),
      (Offset(size.width * 0.88, size.height * 0.15), 3.5, const Color(0xFFFFDDAA), 'gold'),
      (Offset(size.width * 0.5, size.height * 0.42), 3.0, const Color(0xFFDDCCFF), 'lavender'),
      (Offset(size.width * 0.15, size.height * 0.55), 2.8, const Color(0xFFFFBBAA), 'orange'),
      (Offset(size.width * 0.92, size.height * 0.62), 3.2, const Color(0xFFAAFFDD), 'teal'),
      (Offset(size.width * 0.35, size.height * 0.88), 3.8, const Color(0xFFFFAACC), 'pink'),
      (Offset(size.width * 0.7, size.height * 0.78), 2.5, const Color(0xFFCCDDFF), 'ice'),
      (Offset(size.width * 0.55, size.height * 0.02), 3.0, const Color(0xFFFFFFDD), 'white'),
    ];

    for (final (pos, r, color, _) in heroes) {
      // Outer atmosphere
      final atmPaint = Paint()
        ..shader = ui.Gradient.radial(pos, r * 20, [
          color.withValues(alpha: 0.06 * opacity),
          color.withValues(alpha: 0.02 * opacity),
          color.withValues(alpha: 0.0),
        ], [0.0, 0.5, 1.0])
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 4);
      canvas.drawCircle(pos, r * 20, atmPaint);

      // Glow
      final glowPaint = Paint()
        ..shader = ui.Gradient.radial(pos, r * 8, [
          color.withValues(alpha: 0.25 * opacity),
          color.withValues(alpha: 0.08 * opacity),
          color.withValues(alpha: 0.0),
        ], [0.0, 0.4, 1.0]);
      canvas.drawCircle(pos, r * 8, glowPaint);

      // Core
      canvas.drawCircle(pos, r, Paint()
        ..shader = ui.Gradient.radial(pos, r, [
          Colors.white.withValues(alpha: 1.0 * opacity),
          color.withValues(alpha: 0.8 * opacity),
        ]));
    }
  }

  void _drawSpiralGalaxy(Canvas canvas, Size size, Random rng, double opacity) {
    final cx = size.width * 0.78;
    final cy = size.height * 0.22;

    canvas.save();
    canvas.translate(cx, cy);
    canvas.rotate(-0.3); // Tilt

    // Galaxy halo
    final haloPaint = Paint()
      ..shader = ui.Gradient.radial(Offset.zero, 70, [
        const Color(0xFFE8D0FF).withValues(alpha: 0.06 * opacity),
        const Color(0xFF8866CC).withValues(alpha: 0.02 * opacity),
        const Color(0xFF8866CC).withValues(alpha: 0.0),
      ], [0.0, 0.5, 1.0])
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 8);
    canvas.drawOval(Rect.fromCenter(center: Offset.zero, width: 140, height: 55), haloPaint);

    // Bright core
    final corePaint = Paint()
      ..shader = ui.Gradient.radial(Offset.zero, 12, [
        const Color(0xFFFFEEDD).withValues(alpha: 0.2 * opacity),
        const Color(0xFFDDBBFF).withValues(alpha: 0.08 * opacity),
        const Color(0xFFDDBBFF).withValues(alpha: 0.0),
      ], [0.0, 0.4, 1.0]);
    canvas.drawCircle(Offset.zero, 12, corePaint);

    // Spiral arms with stars — 2 main arms
    for (var arm = 0; arm < 2; arm++) {
      for (var j = 0; j < 60; j++) {
        final t = j / 60.0;
        final angle = t * 4 * pi + arm * pi;
        final r = 5 + t * 55;
        final spread = 3 + t * 6;
        final px = cos(angle) * r + (rng.nextDouble() - 0.5) * spread;
        final py = sin(angle) * r * 0.4 + (rng.nextDouble() - 0.5) * spread * 0.4;
        final starR = 0.3 + (1 - t) * 1.0;
        final a = (0.2 * (1 - t * 0.7)) * opacity;
        final c = t < 0.3
            ? Color.lerp(const Color(0xFFAABBFF), const Color(0xFFFFEEDD), t / 0.3)!
            : const Color(0xFFFFDDCC);
        canvas.drawCircle(Offset(px, py), starR, Paint()..color = c.withValues(alpha: a));
      }
    }

    canvas.restore();
  }

  void _drawEdgeOnGalaxy(Canvas canvas, Size size, double opacity) {
    final cx = size.width * 0.22;
    final cy = size.height * 0.35;

    canvas.save();
    canvas.translate(cx, cy);
    canvas.rotate(0.6);

    // Thin disk
    final diskPaint = Paint()
      ..shader = ui.Gradient.linear(
        const Offset(-50, 0), const Offset(50, 0),
        [
          const Color(0xFFDDCCFF).withValues(alpha: 0.0),
          const Color(0xFFDDCCFF).withValues(alpha: 0.1 * opacity),
          const Color(0xFFFFEEDD).withValues(alpha: 0.15 * opacity),
          const Color(0xFFDDCCFF).withValues(alpha: 0.1 * opacity),
          const Color(0xFFDDCCFF).withValues(alpha: 0.0),
        ],
        [0.0, 0.2, 0.5, 0.8, 1.0],
      )
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 2);
    canvas.drawOval(
        Rect.fromCenter(center: Offset.zero, width: 100, height: 6), diskPaint);

    // Bright nucleus
    canvas.drawCircle(Offset.zero, 4, Paint()
      ..shader = ui.Gradient.radial(Offset.zero, 4, [
        const Color(0xFFFFEEDD).withValues(alpha: 0.2 * opacity),
        const Color(0xFFFFEEDD).withValues(alpha: 0.0),
      ]));

    // Dust lane (dark band across center)
    canvas.drawLine(const Offset(-45, 0), const Offset(45, 0), Paint()
      ..color = const Color(0xFF07070C).withValues(alpha: 0.08 * opacity)
      ..strokeWidth = 1.5
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 1));

    canvas.restore();
  }

  void _drawDistantGalaxies(Canvas canvas, double w, double h, double ox,
      double oy, Random rng, int count, double opacity) {
    for (var i = 0; i < count; i++) {
      final x = ox + rng.nextDouble() * w;
      final y = oy + rng.nextDouble() * h;
      final gw = 4.0 + rng.nextDouble() * 14;
      final gh = gw * (0.2 + rng.nextDouble() * 0.5);
      final angle = rng.nextDouble() * pi;
      final color = _starColors[rng.nextInt(_starColors.length)];

      canvas.save();
      canvas.translate(x, y);
      canvas.rotate(angle);

      // Glow
      canvas.drawOval(
          Rect.fromCenter(center: Offset.zero, width: gw * 2.5, height: gh * 2.5),
          Paint()..shader = ui.Gradient.radial(Offset.zero, gw, [
            color.withValues(alpha: 0.08 * opacity),
            color.withValues(alpha: 0.0),
          ])..maskFilter = const MaskFilter.blur(BlurStyle.normal, 3));

      // Core
      canvas.drawOval(
          Rect.fromCenter(center: Offset.zero, width: gw, height: gh),
          Paint()..shader = ui.Gradient.radial(Offset.zero, gw * 0.5, [
            color.withValues(alpha: 0.18 * opacity),
            color.withValues(alpha: 0.04 * opacity),
            color.withValues(alpha: 0.0),
          ], [0.0, 0.5, 1.0]));
      canvas.restore();
    }
  }

  void _drawRingedPlanet(Canvas canvas, Size size, double opacity) {
    final cx = size.width * 0.14;
    final cy = size.height * 0.68;

    // Atmosphere glow
    canvas.drawCircle(Offset(cx, cy), 22, Paint()
      ..shader = ui.Gradient.radial(Offset(cx, cy), 22, [
        const Color(0xFF4466AA).withValues(alpha: 0.08 * opacity),
        const Color(0xFF4466AA).withValues(alpha: 0.0),
      ])..maskFilter = const MaskFilter.blur(BlurStyle.normal, 6));

    // Planet body with gradient shading
    canvas.drawCircle(Offset(cx, cy), 13, Paint()
      ..shader = ui.Gradient.radial(Offset(cx - 5, cy - 5), 18, [
        const Color(0xFF7799BB).withValues(alpha: 0.45 * opacity),
        const Color(0xFF445577).withValues(alpha: 0.35 * opacity),
        const Color(0xFF223344).withValues(alpha: 0.2 * opacity),
      ], [0.0, 0.5, 1.0]));

    // Surface bands
    for (var i = -3; i <= 3; i++) {
      canvas.drawLine(
        Offset(cx - 11, cy + i * 3.5),
        Offset(cx + 11, cy + i * 3.5),
        Paint()
          ..color = const Color(0xFF88AACC).withValues(alpha: 0.06 * opacity)
          ..strokeWidth = 1.2,
      );
    }

    // Ring system — multiple rings
    canvas.save();
    canvas.translate(cx, cy);
    for (var ring = 0; ring < 3; ring++) {
      final rw = 38.0 + ring * 6;
      final rh = 10.0 + ring * 1.5;
      final alpha = (0.2 - ring * 0.05) * opacity;
      canvas.drawOval(
          Rect.fromCenter(center: Offset.zero, width: rw, height: rh),
          Paint()
            ..color = const Color(0xFFAABBDD).withValues(alpha: alpha)
            ..style = PaintingStyle.stroke
            ..strokeWidth = 1.8 - ring * 0.4);
    }
    // Ring shadow on planet
    canvas.drawArc(
        Rect.fromCenter(center: Offset.zero, width: 26, height: 26),
        -0.3, 0.6, false,
        Paint()
          ..color = const Color(0xFF07070C).withValues(alpha: 0.15 * opacity)
          ..strokeWidth = 2.0
          ..style = PaintingStyle.stroke);
    canvas.restore();
  }

  void _drawGasGiant(Canvas canvas, Size size, double opacity) {
    final cx = size.width * 0.62;
    final cy = size.height * 0.85;

    // Atmosphere
    canvas.drawCircle(Offset(cx, cy), 28, Paint()
      ..shader = ui.Gradient.radial(Offset(cx, cy), 28, [
        const Color(0xFFCC8844).withValues(alpha: 0.06 * opacity),
        const Color(0xFFCC8844).withValues(alpha: 0.0),
      ])..maskFilter = const MaskFilter.blur(BlurStyle.normal, 5));

    // Body — Jupiter-like bands
    canvas.drawCircle(Offset(cx, cy), 18, Paint()
      ..shader = ui.Gradient.radial(Offset(cx - 6, cy - 6), 24, [
        const Color(0xFFDDAA66).withValues(alpha: 0.3 * opacity),
        const Color(0xFFBB8844).withValues(alpha: 0.25 * opacity),
        const Color(0xFF886633).withValues(alpha: 0.15 * opacity),
      ], [0.0, 0.5, 1.0]));

    // Atmospheric bands
    final bandColors = [0xFFEEBB77, 0xFFCC9955, 0xFFDDAA66, 0xFFBB8844, 0xFFEECC88];
    for (var i = -4; i <= 4; i++) {
      canvas.drawLine(
        Offset(cx - 16, cy + i * 3.8),
        Offset(cx + 16, cy + i * 3.8),
        Paint()
          ..color = Color(bandColors[(i + 4) % bandColors.length]).withValues(alpha: 0.08 * opacity)
          ..strokeWidth = 2.0
          ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 1),
      );
    }

    // Great Red Spot
    canvas.drawOval(
        Rect.fromCenter(center: Offset(cx + 5, cy + 3), width: 7, height: 4),
        Paint()
          ..color = const Color(0xFFCC6644).withValues(alpha: 0.15 * opacity)
          ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 1));
  }

  void _drawNebulaPillar(Canvas canvas, Size size, double opacity) {
    final cx = size.width * 0.92;
    final cy = size.height * 0.45;

    // Multi-layered pillars of creation style
    for (var layer = 0; layer < 3; layer++) {
      final xOff = (layer - 1) * 8.0;
      final colors = [
        [const Color(0xFF6644AA), const Color(0xFF8855CC), const Color(0xFFAA77DD)],
        [const Color(0xFF445588), const Color(0xFF6677AA), const Color(0xFF8899CC)],
        [const Color(0xFF664488), const Color(0xFF8866AA), const Color(0xFFAA88CC)],
      ];
      final c = colors[layer];
      final h = 100.0 + layer * 20;
      final w = 14.0 - layer * 2;

      final paint = Paint()
        ..shader = ui.Gradient.linear(
          Offset(cx + xOff, cy - h / 2),
          Offset(cx + xOff, cy + h / 2),
          [
            c[0].withValues(alpha: 0.0),
            c[1].withValues(alpha: 0.06 * opacity),
            c[2].withValues(alpha: 0.1 * opacity),
            c[1].withValues(alpha: 0.06 * opacity),
            c[0].withValues(alpha: 0.0),
          ],
          [0.0, 0.2, 0.5, 0.8, 1.0],
        )
        ..maskFilter = MaskFilter.blur(BlurStyle.normal, 4 + layer * 2.0);

      final path = Path()
        ..moveTo(cx + xOff - w / 2, cy - h / 2)
        ..quadraticBezierTo(cx + xOff - w * 0.8, cy - h * 0.1, cx + xOff - w / 2 - 2, cy + h / 2)
        ..lineTo(cx + xOff + w / 2 + 2, cy + h / 2)
        ..quadraticBezierTo(cx + xOff + w * 0.8, cy + h * 0.1, cx + xOff + w / 2, cy - h / 2)
        ..close();
      canvas.drawPath(path, paint);
    }

    // Bright star at pillar tip
    final tipY = cy - 60;
    canvas.drawCircle(Offset(cx, tipY), 2, Paint()
      ..shader = ui.Gradient.radial(Offset(cx, tipY), 8, [
        const Color(0xFFAABBFF).withValues(alpha: 0.2 * opacity),
        const Color(0xFFAABBFF).withValues(alpha: 0.0),
      ]));
  }

  void _drawSupernovaRemnant(Canvas canvas, Size size, double opacity) {
    final cx = size.width * 0.38;
    final cy = size.height * 0.14;

    // Expanding shells with color variation
    final shellColors = [
      const Color(0xFFFF6644),
      const Color(0xFFFF8866),
      const Color(0xFFFFAA88),
      const Color(0xFFDDAAFF),
    ];
    for (var ring = 0; ring < 4; ring++) {
      final r = 8.0 + ring * 9.0;
      final alpha = (0.08 - ring * 0.015) * opacity;
      canvas.drawCircle(Offset(cx, cy), r, Paint()
        ..color = shellColors[ring].withValues(alpha: alpha)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2.0 - ring * 0.3
        ..maskFilter = MaskFilter.blur(BlurStyle.normal, 1 + ring * 0.5));
    }

    // Filaments
    final rng = Random(555);
    for (var i = 0; i < 12; i++) {
      final angle = rng.nextDouble() * 2 * pi;
      final len = 15 + rng.nextDouble() * 25;
      final end = Offset(cx + cos(angle) * len, cy + sin(angle) * len);
      canvas.drawLine(Offset(cx, cy), end, Paint()
        ..color = const Color(0xFFFF8866).withValues(alpha: 0.04 * opacity)
        ..strokeWidth = 0.8
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 1));
    }

    // Neutron star core
    canvas.drawCircle(Offset(cx, cy), 2, Paint()
      ..shader = ui.Gradient.radial(Offset(cx, cy), 6, [
        Colors.white.withValues(alpha: 0.5 * opacity),
        const Color(0xFFAABBFF).withValues(alpha: 0.15 * opacity),
        const Color(0xFFAABBFF).withValues(alpha: 0.0),
      ], [0.0, 0.3, 1.0]));
  }

  void _drawBinaryStar(Canvas canvas, Size size, double opacity) {
    final cx = size.width * 0.72;
    final cy = size.height * 0.55;

    // Two close stars with shared glow
    final s1 = Offset(cx - 4, cy - 2);
    final s2 = Offset(cx + 4, cy + 2);

    // Shared envelope
    final midpoint = (s1 + s2) / 2;
    canvas.drawCircle(midpoint, 14, Paint()
      ..shader = ui.Gradient.radial(midpoint, 14, [
        const Color(0xFFDDCCFF).withValues(alpha: 0.08 * opacity),
        const Color(0xFFDDCCFF).withValues(alpha: 0.0),
      ])..maskFilter = const MaskFilter.blur(BlurStyle.normal, 4));

    // Star 1 (blue-white)
    canvas.drawCircle(s1, 2, Paint()
      ..shader = ui.Gradient.radial(s1, 5, [
        const Color(0xFFCCDDFF).withValues(alpha: 0.4 * opacity),
        const Color(0xFFCCDDFF).withValues(alpha: 0.0),
      ]));
    canvas.drawCircle(s1, 1, Paint()..color = Colors.white.withValues(alpha: 0.8 * opacity));

    // Star 2 (orange)
    canvas.drawCircle(s2, 1.5, Paint()
      ..shader = ui.Gradient.radial(s2, 4, [
        const Color(0xFFFFCCAA).withValues(alpha: 0.35 * opacity),
        const Color(0xFFFFCCAA).withValues(alpha: 0.0),
      ]));
    canvas.drawCircle(s2, 0.8, Paint()..color = const Color(0xFFFFEEDD).withValues(alpha: 0.7 * opacity));

    // Mass transfer stream
    final streamPaint = Paint()
      ..color = const Color(0xFFCCBBFF).withValues(alpha: 0.04 * opacity)
      ..strokeWidth = 2
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 2);
    final streamPath = Path()
      ..moveTo(s1.dx, s1.dy)
      ..quadraticBezierTo(midpoint.dx, midpoint.dy - 6, s2.dx, s2.dy);
    canvas.drawPath(streamPath, streamPaint..style = PaintingStyle.stroke);
  }

  void _drawComet(Canvas canvas, Size size, double phase, double opacity) {
    final cx = size.width * 0.42;
    final cy = size.height * 0.38;
    // Slight motion based on breathe phase
    final dx = sin(phase * 2 * pi) * 5;

    // Ion tail (blue, straight)
    final ionTailEnd = Offset(cx + dx + 65, cy - 25);
    canvas.drawLine(Offset(cx + dx, cy), ionTailEnd, Paint()
      ..shader = ui.Gradient.linear(Offset(cx + dx, cy), ionTailEnd, [
        const Color(0xFF8899FF).withValues(alpha: 0.12 * opacity),
        const Color(0xFF8899FF).withValues(alpha: 0.0),
      ])
      ..strokeWidth = 1.5
      ..strokeCap = StrokeCap.round);

    // Dust tail (yellow-white, curved)
    final dustPath = Path()
      ..moveTo(cx + dx, cy)
      ..quadraticBezierTo(cx + dx + 30, cy + 5, cx + dx + 55, cy - 10);
    canvas.drawPath(dustPath, Paint()
      ..shader = ui.Gradient.linear(Offset(cx + dx, cy), Offset(cx + dx + 55, cy - 10), [
        const Color(0xFFFFEECC).withValues(alpha: 0.1 * opacity),
        const Color(0xFFFFEECC).withValues(alpha: 0.0),
      ])
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 2));

    // Coma (fuzzy head)
    canvas.drawCircle(Offset(cx + dx, cy), 5, Paint()
      ..shader = ui.Gradient.radial(Offset(cx + dx, cy), 5, [
        const Color(0xFFEEFFFF).withValues(alpha: 0.2 * opacity),
        const Color(0xFFCCDDFF).withValues(alpha: 0.05 * opacity),
        const Color(0xFFCCDDFF).withValues(alpha: 0.0),
      ], [0.0, 0.4, 1.0])
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 2));

    // Nucleus
    canvas.drawCircle(Offset(cx + dx, cy), 1.5, Paint()
      ..color = const Color(0xFFFFFFEE).withValues(alpha: 0.6 * opacity));
  }

  void _drawStarClusters(Canvas canvas, Size size, Random rng, double opacity) {
    // Two clusters at different positions
    final clusters = [
      (Offset(size.width * 0.28, size.height * 0.52), 30.0, 60),
      (Offset(size.width * 0.82, size.height * 0.42), 22.0, 45),
    ];

    for (final (center, radius, count) in clusters) {
      // Faint background glow
      canvas.drawCircle(center, radius * 1.5, Paint()
        ..shader = ui.Gradient.radial(center, radius * 1.5, [
          const Color(0xFFDDCCFF).withValues(alpha: 0.04 * opacity),
          const Color(0xFFDDCCFF).withValues(alpha: 0.0),
        ])..maskFilter = const MaskFilter.blur(BlurStyle.normal, 6));

      for (var i = 0; i < count; i++) {
        // Gaussian-ish distribution (more stars near center)
        final angle = rng.nextDouble() * 2 * pi;
        final dist = rng.nextDouble() * rng.nextDouble() * radius;
        final x = center.dx + cos(angle) * dist;
        final y = center.dy + sin(angle) * dist;
        final r = 0.4 + rng.nextDouble() * 1.2;
        final color = _starColors[rng.nextInt(_starColors.length)];
        final a = (0.3 + rng.nextDouble() * 0.5) * opacity * (1 - dist / radius * 0.5);
        canvas.drawCircle(Offset(x, y), r, Paint()..color = color.withValues(alpha: a));
      }
    }
  }

  void _drawDustLanes(Canvas canvas, Size size, Random rng, double opacity) {
    for (var i = 0; i < 4; i++) {
      final y1 = rng.nextDouble() * size.height;
      final y2 = y1 + (rng.nextDouble() - 0.5) * 80;
      final ctrlY = (y1 + y2) / 2 + (rng.nextDouble() - 0.5) * 40;

      final path = Path()
        ..moveTo(-20, y1)
        ..quadraticBezierTo(size.width / 2, ctrlY, size.width + 20, y2);

      canvas.drawPath(path, Paint()
        ..color = const Color(0xFF07070C).withValues(alpha: 0.04 * opacity)
        ..strokeWidth = 12 + rng.nextDouble() * 20
        ..style = PaintingStyle.stroke
        ..strokeCap = StrokeCap.round
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 8));
    }
  }

  @override
  bool shouldRepaint(StarfieldPainter oldDelegate) {
    return oldDelegate.breathePhase != breathePhase ||
        oldDelegate.parallaxOffset != parallaxOffset;
  }
}
