import 'dart:ui';

class AppColors {
  AppColors._();

  // Core palette
  static const base = Color(0xFF07070C);
  static const ink = Color(0xFFF4EBD9);
  static const inkSoft = Color(0xFFC8BFA8);
  static const inkDim = Color(0xFF6A6457);

  // Accent
  static const alienGreen = Color(0xFF7FFF7F);
  static const queuePurple = Color(0xFFD4A0FF);

  // Glass surface
  static const glassBg = Color(0xF00E0C18); // 0.94 opacity
  static const glassBorder = Color(0x1FFFFFFF); // 0.12 opacity

  // Category accents (initial genre-based seed)
  static const drama = Color(0xFFB56CFF);
  static const sciFi = Color(0xFF6FA8E8);
  static const comedy = Color(0xFF3FB89E);
  static const thriller = Color(0xFFFF7A6C);
  static const romance = Color(0xFFE6B04A);
  static const horror = Color(0xFFC44040);
  static const action = Color(0xFFFF9F43);
  static const documentary = Color(0xFF78E08F);
  static const animation = Color(0xFFE056A0);

  static const List<Color> categoryAccents = [
    drama,
    sciFi,
    comedy,
    thriller,
    romance,
    horror,
    action,
    documentary,
    animation,
  ];
}
