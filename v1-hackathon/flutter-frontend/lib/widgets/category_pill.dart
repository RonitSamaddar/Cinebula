import 'dart:math';

import 'package:flutter/material.dart';

import '../data/mock_api.dart';
import '../models/category_model.dart';
import '../theme/app_colors.dart';

/// Top-center pill showing the nearest category name with a pulsing dot.
class CategoryPill extends StatelessWidget {
  final double cameraX;
  final double cameraY;
  final List<Category> categories;

  const CategoryPill({
    super.key,
    required this.cameraX,
    required this.cameraY,
    required this.categories,
  });

  @override
  Widget build(BuildContext context) {
    if (categories.isEmpty) return const SizedBox.shrink();

    // Find nearest category with world wrapping
    Category nearest = categories.first;
    double minDist = double.infinity;
    for (final cat in categories) {
      var dx = cameraX - cat.position.dx;
      var dy = cameraY - cat.position.dy;
      if (dx > kWorldW / 2) dx -= kWorldW;
      if (dx < -kWorldW / 2) dx += kWorldW;
      if (dy > kWorldH / 2) dy -= kWorldH;
      if (dy < -kWorldH / 2) dy += kWorldH;
      final dist = sqrt(dx * dx + dy * dy);
      if (dist < minDist) {
        minDist = dist;
        nearest = cat;
      }
    }

    return Positioned(
      top: MediaQuery.of(context).padding.top + 12,
      left: 0,
      right: 0,
      child: Center(
        child: AnimatedSwitcher(
          duration: const Duration(milliseconds: 400),
          child: Container(
            key: ValueKey(nearest.key),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: BoxDecoration(
              color: AppColors.glassBg,
              borderRadius: BorderRadius.circular(100),
              border: Border.all(color: AppColors.glassBorder),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                _PulsingDot(color: nearest.accentColor),
                const SizedBox(width: 8),
                Text(
                  nearest.label.toUpperCase(),
                  style: TextStyle(
                    fontFamily: 'JetBrains Mono',
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: AppColors.ink,
                    letterSpacing: 2.0,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _PulsingDot extends StatefulWidget {
  final Color color;
  const _PulsingDot({required this.color});

  @override
  State<_PulsingDot> createState() => _PulsingDotState();
}

class _PulsingDotState extends State<_PulsingDot>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, _) {
        final opacity = 0.4 + 0.6 * _controller.value;
        return Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: widget.color.withValues(alpha: opacity),
            boxShadow: [
              BoxShadow(
                color: widget.color.withValues(alpha: 0.3 * _controller.value),
                blurRadius: 6,
                spreadRadius: 1,
              ),
            ],
          ),
        );
      },
    );
  }
}
