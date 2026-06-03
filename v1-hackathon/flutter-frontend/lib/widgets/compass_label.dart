import 'dart:math';

import 'package:flutter/material.dart';

import '../data/mock_api.dart';
import '../models/category_model.dart';

/// Edge labels showing nearby categories with tap-to-fly navigation.
class CompassLabels extends StatelessWidget {
  final double cameraX;
  final double cameraY;
  final List<Category> categories;
  final void Function(double targetX, double targetY) onFlyTo;

  const CompassLabels({
    super.key,
    required this.cameraX,
    required this.cameraY,
    required this.categories,
    required this.onFlyTo,
  });

  @override
  Widget build(BuildContext context) {
    if (categories.isEmpty) return const SizedBox.shrink();

    final screenSize = MediaQuery.of(context).size;
    final topPad = MediaQuery.of(context).padding.top;

    // Compute wrapped direction + distance for each category
    final entries = <_CompassEntry>[];
    for (final cat in categories) {
      var dx = cat.position.dx - cameraX;
      var dy = cat.position.dy - cameraY;
      if (dx > kWorldW / 2) dx -= kWorldW;
      if (dx < -kWorldW / 2) dx += kWorldW;
      if (dy > kWorldH / 2) dy -= kWorldH;
      if (dy < -kWorldH / 2) dy += kWorldH;
      final dist = sqrt(dx * dx + dy * dy);
      // Skip the category we're already inside
      if (dist < 200) continue;
      final angle = atan2(dy, dx); // radians, 0 = right
      entries.add(_CompassEntry(cat: cat, angle: angle, dist: dist));
    }

    // Sort by distance — show closest first
    entries.sort((a, b) => a.dist.compareTo(b.dist));

    // Place labels on edges. Partition into 4 edge zones:
    // right: -45° to 45°, bottom: 45° to 135°, left: 135°-225°, top: 225°-315°
    final List<Widget> positioned = [];
    // Track used slots per edge to avoid overlap
    final usedTop = <double>[];
    final usedBottom = <double>[];
    final usedLeft = <double>[];
    final usedRight = <double>[];

    for (final e in entries) {
      final deg = (e.angle * 180 / pi + 360) % 360;
      // Map angle to screen edge position
      if (deg >= 315 || deg < 45) {
        // Right edge
        final t = _angleToEdgeFraction(e.angle, true);
        final y = screenSize.height * t;
        if (_tooClose(y, usedRight, 40)) continue;
        usedRight.add(y);
        positioned.add(Positioned(
          right: 8,
          top: y.clamp(topPad + 50, screenSize.height - 50),
          child: _LabelChip(entry: e, alignment: Alignment.centerRight, onTap: () => onFlyTo(e.cat.position.dx, e.cat.position.dy)),
        ));
      } else if (deg >= 45 && deg < 135) {
        // Bottom edge
        final t = _angleToEdgeFractionH(e.angle, false);
        final x = screenSize.width * t;
        if (_tooClose(x, usedBottom, 80)) continue;
        usedBottom.add(x);
        positioned.add(Positioned(
          bottom: 8,
          left: x.clamp(8, screenSize.width - 100),
          child: _LabelChip(entry: e, alignment: Alignment.bottomCenter, onTap: () => onFlyTo(e.cat.position.dx, e.cat.position.dy)),
        ));
      } else if (deg >= 135 && deg < 225) {
        // Left edge
        final t = _angleToEdgeFraction(e.angle, false);
        final y = screenSize.height * t;
        if (_tooClose(y, usedLeft, 40)) continue;
        usedLeft.add(y);
        positioned.add(Positioned(
          left: 8,
          top: y.clamp(topPad + 50, screenSize.height - 50),
          child: _LabelChip(entry: e, alignment: Alignment.centerLeft, onTap: () => onFlyTo(e.cat.position.dx, e.cat.position.dy)),
        ));
      } else {
        // Top edge (225 to 315)
        final t = _angleToEdgeFractionH(e.angle, true);
        final x = screenSize.width * t;
        if (_tooClose(x, usedTop, 80)) continue;
        usedTop.add(x);
        positioned.add(Positioned(
          top: topPad + 50,
          left: x.clamp(8, screenSize.width - 100),
          child: _LabelChip(entry: e, alignment: Alignment.topCenter, onTap: () => onFlyTo(e.cat.position.dx, e.cat.position.dy)),
        ));
      }
    }

    return Stack(children: positioned);
  }

  /// Vertical fraction (0=top, 1=bottom) for right/left edges
  double _angleToEdgeFraction(double angle, bool isRight) {
    // Map the sub-range of angle to 0..1 along the vertical edge
    final deg = (angle * 180 / pi + 360) % 360;
    if (isRight) {
      // -45 to 45 → 0 to 1
      final norm = ((deg + 45) % 360) / 90;
      return norm.clamp(0.15, 0.85);
    } else {
      // 135 to 225 → 0 to 1
      final norm = (deg - 135) / 90;
      return norm.clamp(0.15, 0.85);
    }
  }

  /// Horizontal fraction (0=left, 1=right) for top/bottom edges
  double _angleToEdgeFractionH(double angle, bool isTop) {
    final deg = (angle * 180 / pi + 360) % 360;
    if (isTop) {
      // 225 to 315 → 1 to 0 (right to left inverted since negative Y is up)
      final norm = 1.0 - (deg - 225) / 90;
      return norm.clamp(0.15, 0.85);
    } else {
      // 45 to 135 → 0 to 1
      final norm = (deg - 45) / 90;
      return norm.clamp(0.15, 0.85);
    }
  }

  bool _tooClose(double val, List<double> used, double minGap) {
    for (final u in used) {
      if ((val - u).abs() < minGap) return true;
    }
    return false;
  }
}

class _CompassEntry {
  final Category cat;
  final double angle;
  final double dist;
  const _CompassEntry({required this.cat, required this.angle, required this.dist});
}

class _LabelChip extends StatelessWidget {
  final _CompassEntry entry;
  final Alignment alignment;
  final VoidCallback onTap;

  const _LabelChip({
    required this.entry,
    required this.alignment,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    // Fade based on distance — closer = more opaque
    final opacity = (1.0 - (entry.dist / 800).clamp(0.0, 0.7)).clamp(0.3, 1.0);

    return GestureDetector(
      onTap: onTap,
      child: Opacity(
        opacity: opacity,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
          decoration: BoxDecoration(
            color: entry.cat.accentColor.withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: entry.cat.accentColor.withValues(alpha: 0.3),
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 5,
                height: 5,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: entry.cat.accentColor,
                ),
              ),
              const SizedBox(width: 6),
              Text(
                entry.cat.label.toUpperCase(),
                style: TextStyle(
                  fontFamily: 'JetBrains Mono',
                  fontSize: 9,
                  fontWeight: FontWeight.w500,
                  color: entry.cat.accentColor.withValues(alpha: 0.9),
                  letterSpacing: 1.5,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
