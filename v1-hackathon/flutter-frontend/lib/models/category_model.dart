import 'dart:ui';

class Category {
  final String key;
  final String label;
  final Color accentColor;
  final Offset position;
  final double radius; // subregion radius on the galaxy

  const Category({
    required this.key,
    required this.label,
    required this.accentColor,
    required this.position,
    this.radius = 300.0,
  });
}
